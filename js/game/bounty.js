// ============================================================
//  CONTRATS DE CHASSE : panneaux dans 5 lieux nommés. On accepte
//  un contrat sur un adversaire, sa zone approximative s'affiche
//  sur la carte, il faut l'éliminer avant la fin du temps imparti.
// ============================================================
(function () {
  const U = G.U;
  const BT = { boards: [], contract: null };
  G.Bounty = BT;
  const TIME = 180, REWARD = 300;

  function signTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#7a1414'; g.fillRect(0, 0, 256, 64);
    g.strokeStyle = '#ffd23a'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 58);
    g.fillStyle = '#ffe9a0'; g.font = 'bold 34px Impact, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('CONTRATS', 128, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  let signTex = null;
  function boardModel() {
    const V = G.Veg, parts = [];
    const wood = 0x8a5a30, dark = 0x4a2e18, paper = 0xf2ead2;
    const box = (sx, sy, sz, col, x, y, z, rz) => { const g = new THREE.BoxGeometry(sx, sy, sz); if (rz) g.rotateZ(rz); g.translate(x, y, z); parts.push(V.colored(g, col, 0.06)); };
    box(0.14, 2.6, 0.14, dark, -1.0, 1.3, 0); box(0.14, 2.6, 0.14, dark, 1.0, 1.3, 0);
    box(2.3, 1.5, 0.08, wood, 0, 1.55, 0);
    box(2.5, 0.1, 0.3, dark, 0, 2.35, 0.05);
    // avis de recherche épinglés
    [[-0.65, 1.8, 0.05], [0.05, 1.75, -0.04], [0.7, 1.82, 0.06], [-0.4, 1.2, -0.05], [0.45, 1.18, 0.04]].forEach((q) => { box(0.5, 0.62, 0.02, paper, q[0], q[1], 0.06, q[2]); box(0.3, 0.28, 0.025, 0x9a8a6a, q[0], q[1] + 0.08, 0.065, q[2]); box(0.06, 0.06, 0.03, 0xc82a2a, q[0], q[1] + 0.27, 0.075); });
    const g = new THREE.Group();
    const m = new THREE.Mesh(V.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; g.add(m);
    if (!signTex) signTex = signTexture();
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
    sg.position.set(0, 2.62, 0.02); g.add(sg);
    const sg2 = sg.clone(); sg2.rotation.y = Math.PI; sg2.position.z = -0.02; g.add(sg2);
    return g;
  }

  BT.init = function () {
    if (BT.boards.length || !G.Folk) return;
    for (const id of ['tours', 'ferme', 'galerie', 'lac', 'chalet']) {
      const p = G.MapData.poiById(id); if (!p) continue;
      const q = G.Folk.findSpot(p.x, p.z, 8, Math.min(30, p.r * 0.5));
      const y = G.Terrain.height(q[0], q[1]);
      const yaw = Math.random() * Math.PI * 2;
      const m = boardModel(); m.position.set(q[0], y, q[1]); m.rotation.y = yaw; G.scene.add(m);
      const W = G.World, P = G.Phys;
      const e = W.ent('prop', 'wood', 9999, { yield: 0, noPickaxe: true }); e.invulnerable = true;
      W.addCol(e, P.box(q[0] - 1.1, y, q[1] - 1.1, q[0] + 1.1, y + 2.5, q[1] + 1.1, e));
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      BT.boards.push({ x: q[0], y, z: q[1], ix: q[0] + fx * 1.3, iz: q[1] + fz * 1.3, poi: p.name, m });
    }
  };

  BT.reset = function () { BT.contract = null; BT.render(true); };

  BT.interactables = function (out) {
    const pl = G.player; if (!pl || pl.dead || G.Game.state !== 'playing') return;
    for (const b of BT.boards) {
      if (Math.abs(b.x - pl.pos.x) > 4 || Math.abs(b.z - pl.pos.z) > 4) continue;
      const c = BT.contract;
      out.push({ kind: 'bounty', obj: b, x: b.ix, y: b.y + 1.2, z: b.iz, name: 'Panneau des contrats', action: c ? 'Contrat en cours : ' + c.target.name : 'Accepter un contrat (+' + REWARD + ' lingots)', range: 2.8 });
    }
  };
  BT.accept = function (a, board) {
    if (!a.isPlayer) return;
    if (BT.contract) { G.HUD.notify('Vous avez déjà un contrat en cours', 1.5); G.Audio.play('build_fail'); return; }
    const cands = G.Match.bots.filter((b) => !b.dead && b.state !== 'bus' && !G.Duo.sameTeam(b, a) && !b.npc).map((b) => ({ b, d: Math.hypot(b.pos.x - board.x, b.pos.z - board.z) })).filter((o) => o.d > 60 && o.d < 380).sort((x, y) => x.d - y.d);
    if (!cands.length) { G.HUD.notify('Aucune cible disponible pour le moment', 1.5); G.Audio.play('build_fail'); return; }
    const pick = cands[Math.min(cands.length - 1, Math.floor(Math.random() * Math.min(4, cands.length)))].b;
    BT.contract = { target: pick, t: TIME, zone: null, zoneT: 0 };
    BT.updateZone(true);
    G.Audio.play('card');
    G.HUD.notify('CONTRAT ACCEPTÉ : ÉLIMINEZ ' + pick.name.toUpperCase(), 2.5);
    BT.render(true);
  };
  BT.updateZone = function (force) {
    const c = BT.contract; if (!c) return;
    c.zoneT -= force ? 999 : 0;
    if (c.zoneT > 0) return;
    c.zoneT = 8;
    const a = Math.random() * Math.PI * 2, r = Math.random() * 22;
    c.zone = { x: c.target.pos.x + Math.cos(a) * r, z: c.target.pos.z + Math.sin(a) * r, r: 38 };
  };
  BT.update = function (dt) {
    const c = BT.contract; if (!c) return;
    const pl = G.player;
    if (pl.dead) { BT.contract = null; BT.render(true); return; }
    c.t -= dt; c.zoneT -= dt;
    BT.updateZone(false);
    if (c.t <= 0) { BT.contract = null; G.HUD.notify('CONTRAT EXPIRÉ', 2); G.Audio.play('build_fail'); }
    BT.render();
  };
  BT.onElimination = function (victim, killer) {
    const c = BT.contract; if (!c || victim !== c.target) return;
    BT.contract = null;
    const pl = G.player;
    if (killer === pl || (killer && G.Duo.sameTeam(killer, pl))) {
      pl.gold = Math.min(9999, (pl.gold || 0) + REWARD);
      G.HUD.notify('CONTRAT RÉUSSI ! +' + REWARD + ' LINGOTS', 3, 'upgrade');
      G.HUD.xpToast(1500, 'Contrat de chasse');
      G.Audio.play('buy');
      if (G.Match) { G.Match.challengeEvent('bounty'); G.Match.challengeEvent('gold', REWARD); }
    } else G.HUD.notify('Contrat annulé : ' + victim.name + ' a été éliminé par quelqu\'un d\'autre', 2.5);
    BT.render(true);
  };

  // Panneau de suivi (même style que les quêtes)
  let key = '';
  BT.render = function (force) {
    let el = document.getElementById('bounty-panel');
    if (!el) { const h = document.getElementById('hud'); if (!h) return; el = document.createElement('div'); el.id = 'bounty-panel'; h.appendChild(el); }
    const c = BT.contract;
    const pl = G.player;
    const d = c ? Math.round(Math.hypot(c.zone.x - pl.pos.x, c.zone.z - pl.pos.z)) : 0;
    const k = c ? c.target.name + Math.ceil(c.t) + '|' + Math.round(d / 5) : '';
    if (k === key && !force) return;
    key = k;
    el.classList.toggle('hidden', !c);
    if (!c) return;
    el.innerHTML = `<div class="bp-t">CONTRAT DE CHASSE</div><div class="bp-n">Éliminer <b>${c.target.name}</b></div><div class="bp-p"><span>⏱ ${Math.floor(c.t / 60)}:${U.fmt2(Math.floor(c.t % 60))}</span><span>zone à ~${d} m</span><span><i class="gold-ico"></i>${REWARD}</span></div>`;
  };

  // Carte : panneaux + zone de la cible
  BT.mapIcons = function (ctx, toMap, big) {
    const s = big ? 1.3 : 1;
    for (const b of BT.boards) {
      const m = toMap(b.x, b.z);
      ctx.fillStyle = '#9a1a1a'; ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 1.5;
      ctx.fillRect(m[0] - 5 * s, m[1] - 4 * s, 10 * s, 8 * s); ctx.strokeRect(m[0] - 5 * s, m[1] - 4 * s, 10 * s, 8 * s);
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(m[0] - 2.5 * s, m[1] - 2 * s, 5 * s, 4 * s);
    }
    const c = BT.contract;
    if (c && c.zone) {
      const a = toMap(c.zone.x, c.zone.z), b = toMap(c.zone.x + c.zone.r, c.zone.z);
      const r = Math.abs(b[0] - a[0]);
      const pulse = 0.5 + Math.sin(G.Game.time * 4) * 0.2;
      ctx.fillStyle = 'rgba(255,40,40,' + (0.18 * pulse + 0.08).toFixed(2) + ')'; ctx.strokeStyle = 'rgba(255,60,60,0.95)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(a[0], a[1], Math.max(r, 6), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  };
})();
