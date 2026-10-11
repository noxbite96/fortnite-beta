// ============================================================
//  MÉDAILLONS DES BOSS : chaque boss vaincu lâche son médaillon.
//  Le porteur régénère son bouclier quand il ne subit pas de dégâts…
//  mais il est révélé sur la carte et les bots viennent le chercher !
// ============================================================
(function () {
  const U = G.U;
  const MD = { holders: [], huntT: 0 };
  G.Medal = MD;
  MD.DEFS = {
    roi: { name: 'Médaillon du Roi', color: 0xff3a4a, css: '#ff5a6a' },
    omega: { name: 'Médaillon d\'Oméga', color: 0x3aa8ff, css: '#6ac8ff' },
    general: { name: 'Médaillon du Général', color: 0x7ad04a, css: '#8ae05a' },
    reine: { name: 'Médaillon de la Reine', color: 0x9ad8ff, css: '#bfe8ff' },
  };

  // Modèle : disque doré avec une gemme de la couleur du boss (géométries partagées)
  let GEO = null, GOLD = null;
  const GEM = {};
  function geos() {
    if (GEO) return;
    GEO = {
      disc: new THREE.CylinderGeometry(0.26, 0.26, 0.05, 20).rotateX(Math.PI / 2),
      rim: new THREE.TorusGeometry(0.26, 0.03, 6, 22),
      gem: new THREE.OctahedronGeometry(0.11, 0).scale(1, 1, 0.5),
      star: new THREE.TorusGeometry(0.17, 0.012, 4, 12),
    };
    GOLD = new THREE.MeshLambertMaterial({ color: 0xffc830, emissive: 0x8a5a00, emissiveIntensity: 0.7 });
  }
  MD.model = function (type) {
    geos();
    const d = MD.DEFS[type] || MD.DEFS.roi;
    if (!GEM[type]) GEM[type] = new THREE.MeshBasicMaterial({ color: d.color });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(GEO.disc, GOLD));
    g.add(new THREE.Mesh(GEO.rim, GOLD));
    const s = new THREE.Mesh(GEO.star, GEM[type]); s.position.z = 0.03; g.add(s);
    const s2 = new THREE.Mesh(GEO.star, GEM[type]); s2.position.z = -0.03; g.add(s2);
    const gm = new THREE.Mesh(GEO.gem, GEM[type]); gm.position.z = 0.04; g.add(gm);
    const gm2 = new THREE.Mesh(GEO.gem, GEM[type]); gm2.position.z = -0.04; g.add(gm2);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  };

  // Le boss tombe : son médaillon jaillit
  MD.drop = function (boss) {
    const N = G.NPC;
    const type = boss === N.omega ? 'omega' : boss === N.general ? 'general' : boss === N.reine ? 'reine' : 'roi';
    const p = boss.pos;
    G.Loot.spawn({ kind: 'medal', type }, p.x, p.y + 1.2, p.z, U.rand(-1.5, 1.5), 6, U.rand(-1.5, 1.5));
  };

  MD.give = function (a, type) {
    if (!a || a.dead || !a.char || !a.char.J) return false;
    a.medals = a.medals || [];
    if (a.medals.includes(type)) return false;
    a.medals.push(type);
    const m = MD.model(type);
    m.scale.setScalar(0.34);
    const k = a.medals.length - 1;
    const MP = [[0, 0.38], [-0.1, 0.28], [0.1, 0.28], [0, 0.19]][Math.min(k, 3)]; m.position.set(MP[0], MP[1], 0.17);
    a.char.J.chest.add(m);
    a.medalModels = a.medalModels || [];
    a.medalModels.push(m);
    if (!MD.holders.includes(a)) MD.holders.push(a);
    a.calmT = 0;
    const d = MD.DEFS[type];
    if (a.isPlayer) {
      G.HUD.notify(d.name.toUpperCase() + ' RÉCUPÉRÉ !', 3, 'upgrade');
      G.HUD.pickupNote('Bouclier qui se régénère · vous êtes visible sur la carte', d.css);
      G.Audio.play('levelup');
      if (G.Match) G.Match.challengeEvent('medal', 1);
      render();
    } else if (G.Match && G.Game.state === 'playing') {
      G.HUD.killFeed([a.name, d.name, '', 'a récupéré le'], false, false);
    }
    return true;
  };

  // Mort du porteur : ses médaillons tombent au sol
  MD.onDeath = function (a) {
    if (!a.medals || !a.medals.length) return;
    const p = a.pos;
    for (const t of a.medals) G.Loot.spawn({ kind: 'medal', type: t }, p.x, Math.max(p.y, G.Terrain.height(p.x, p.z)) + 1, p.z, U.rand(-2, 2), 5, U.rand(-2, 2));
    strip(a);
  };
  function strip(a) {
    if (a.medalModels) for (const m of a.medalModels) if (m.parent) m.parent.remove(m);
    a.medalModels = []; a.medals = [];
    const i = MD.holders.indexOf(a); if (i >= 0) MD.holders.splice(i, 1);
    if (a.isPlayer) render();
  }
  MD.clear = function () {
    for (const a of MD.holders.slice()) strip(a);
    MD.holders.length = 0;
    if (G.player) strip(G.player);
    MD.huntT = 0;
  };

  function render() {
    let el = document.getElementById('medal-row');
    if (!el) {
      const bl = document.getElementById('bottomleft'); if (!bl) return;
      el = document.createElement('div'); el.id = 'medal-row';
      bl.insertBefore(el, bl.firstChild);
    }
    const ms = (G.player && G.player.medals) || [];
    el.innerHTML = ms.map((t) => `<span class="md-chip" style="--mc:${MD.DEFS[t].css}"><i></i>${MD.DEFS[t].name}</span>`).join('');
    el.classList.toggle('hidden', !ms.length);
  }

  MD.update = function (dt) {
    if (!MD.holders.length) return;
    for (let i = MD.holders.length - 1; i >= 0; i--) {
      const a = MD.holders[i];
      if (a.dead || !a.medals || !a.medals.length) { if (a.dead) strip(a); continue; }
      if (!a.isPlayer) a.calmT = (a.calmT || 0) + dt;
      // régénération du bouclier : 3 PB/s par médaillon après 3 s sans dégâts
      if (a.calmT > 3 && a.shield < 100 && !a.downed) a.shield = Math.min(100, a.shield + 3 * a.medals.length * dt);
      // petite lueur du médaillon
      if (a.medalModels) for (const m of a.medalModels) m.rotation.z += dt * 0.8;
    }
    // Les bots proches « voient » le porteur sur la carte et viennent le chasser
    MD.huntT -= dt;
    if (MD.huntT <= 0 && G.Match && !G.Match.playground) {
      MD.huntT = 8;
      const now = G.Game.time;
      for (const h of MD.holders) {
        if (h.dead) continue;
        for (const b of G.Match.bots) {
          if (b.dead || b.npc || b.isTeammate || b === h || !b.ai || (G.Duo && G.Duo.sameTeam(b, h))) continue;
          const d = Math.hypot(b.pos.x - h.pos.x, b.pos.z - h.pos.z);
          if (d < 25 || d > 160 || Math.random() > 0.3) continue;
          if (b.weaponsCount && b.weaponsCount() === 0) continue;
          b.ai.inv = { x: h.pos.x + U.rand(-10, 10), z: h.pos.z + U.rand(-10, 10), until: now + U.rand(10, 16) };
        }
      }
    }
  };

  // Porteurs révélés sur la mini-carte et la grande carte
  MD.mapIcons = function (ctx, toMap, big) {
    const s = big ? 1.4 : 1;
    for (const a of MD.holders) {
      if (a.dead || !a.medals || !a.medals.length) continue;
      const m = toMap(a.pos.x, a.pos.z);
      const col = MD.DEFS[a.medals[0]].css;
      ctx.beginPath(); ctx.arc(m[0], m[1], 7 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#000'; ctx.fill();
      ctx.beginPath(); ctx.arc(m[0], m[1], 5.5 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#ffc830'; ctx.fill();
      ctx.beginPath(); ctx.arc(m[0], m[1], 2.6 * s, 0, Math.PI * 2);
      ctx.fillStyle = a.isPlayer ? '#ffffff' : col; ctx.fill();
    }
    // médaillons au sol
    for (const it of G.Loot.items) {
      if (!it.alive || it.data.kind !== 'medal') continue;
      const m = toMap(it.x, it.z);
      ctx.beginPath(); ctx.arc(m[0], m[1], 5 * s, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffc830'; ctx.lineWidth = 2 * s; ctx.stroke();
    }
  };
})();
