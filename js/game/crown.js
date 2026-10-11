// ============================================================
//  COURONNES DE LA VICTOIRE : gagnez une partie pour commencer la
//  suivante avec une couronne ; éliminez un porteur pour la récupérer ;
//  gagnez en la portant = VICTOIRE COURONNÉE
// ============================================================
(function () {
  const U = G.U;
  const CR = { holders: [] };
  G.Crown = CR;

  let tpl = null;
  function model() {
    if (!tpl) {
      // 2 maillages fusionnés : l'or (émissif) et les pierres précieuses
      tpl = new THREE.Group();
      const V = G.Veg, goldP = [], gemP = [];
      goldP.push(V.colored(new THREE.CylinderGeometry(0.17, 0.15, 0.09, 14, 1, true), 0xffc830, 0));
      goldP.push(V.colored(new THREE.TorusGeometry(0.16, 0.012, 5, 16).rotateX(Math.PI / 2).translate(0, -0.04, 0), 0xffc830, 0));
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        goldP.push(V.colored(new THREE.ConeGeometry(0.035, 0.11, 4).translate(Math.cos(a) * 0.16, 0.095, Math.sin(a) * 0.16), 0xffc830, 0));
        gemP.push(V.colored(new THREE.SphereGeometry(0.02, 6, 5).translate(Math.cos(a) * 0.16, 0.16, Math.sin(a) * 0.16), i % 2 ? 0x3a8aff : 0xff2a4a, 0));
        gemP.push(V.colored(new THREE.SphereGeometry(0.022, 6, 5).translate(Math.cos(a + 0.63) * 0.168, 0, Math.sin(a + 0.63) * 0.168), i % 2 ? 0xff2a4a : 0x3a8aff, 0));
      }
      tpl.add(new THREE.Mesh(V.merge(goldP), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x9a6400, emissiveIntensity: 0.7, side: THREE.DoubleSide })));
      tpl.add(new THREE.Mesh(V.merge(gemP), new THREE.MeshBasicMaterial({ vertexColors: true })));
    }
    const m = tpl.clone();
    m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return m;
  }

  CR.give = function (a, silent) {
    if (!a || a.crown || !a.char || !a.char.J) return;
    a.crown = model();
    a.crown.position.set(0, 0.52, 0);
    a.char.J.head.add(a.crown);
    CR.holders.push(a);
    if (a.isPlayer) {
      const pn = document.getElementById('player-name'); if (pn) pn.classList.add('crowned');
      if (!silent) { G.HUD.notify('VOUS AVEZ RÉCUPÉRÉ UNE COURONNE DE LA VICTOIRE !', 2.5, 'upgrade'); G.Audio.play('levelup'); }
    }
  };
  CR.take = function (a) {
    if (!a || !a.crown) return;
    if (a.crown.parent) a.crown.parent.remove(a.crown);
    a.crown = null;
    const i = CR.holders.indexOf(a); if (i >= 0) CR.holders.splice(i, 1);
    if (a.isPlayer) { const pn = document.getElementById('player-name'); if (pn) pn.classList.remove('crowned'); }
  };
  CR.clear = function () {
    for (const a of CR.holders.slice()) CR.take(a);
    CR.holders.length = 0;
    const pn = document.getElementById('player-name'); if (pn) pn.classList.remove('crowned');
  };

  // Début de partie : couronne du joueur (s'il a gagné la précédente) + 1 ou 2 bots couronnés
  CR.setup = function () {
    CR.clear();
    CR.fw.until = 0; CR.fw.rockets.length = 0; CR.fw.c = null;
    const M = G.Match;
    if (M.playground || M.rumble) return;
    const pl = G.player;
    if (G.Store.data.crownNext) { CR.give(pl, true); setTimeout(() => { if (pl.crown && G.Game.state !== 'menu') G.HUD.notify('👑 VOUS PORTEZ LA COURONNE DE LA VICTOIRE !', 4, 'upgrade'); }, 1500); }
    const n = M.bots.length > 60 ? 2 : 1;
    const pool = M.bots.filter((b) => !G.Duo.sameTeam(b, pl));
    for (let i = 0; i < n && pool.length; i++) CR.give(pool.splice(Math.floor(Math.random() * pool.length), 1)[0], true);
  };

  // Élimination d'un porteur : la couronne passe au vainqueur du duel
  CR.onDeath = function (victim, killer) {
    if (!victim || !victim.crown) return;
    CR.take(victim);
    if (killer && killer !== victim && !killer.dead && killer.char && !killer.isCreature) {
      if (killer.crown) return;
      CR.give(killer);
      if (killer.isPlayer) { G.HUD.xpToast(500, 'Couronne récupérée'); }
      G.HUD.killFeed([null, killer.name, 'a récupéré la couronne de la victoire 👑'], killer.isPlayer, false);
    }
  };

  // ------------------------------------------------------------
  //  FEU D'ARTIFICE de la Victoire Royale
  // ------------------------------------------------------------
  const COLORS = [[1, 0.3, 0.3], [0.3, 0.7, 1], [1, 0.85, 0.2], [0.5, 1, 0.4], [1, 0.4, 1], [1, 1, 1], [0.4, 1, 1]];
  CR.fw = { rockets: [], until: 0, next: 0, c: null };
  CR.fireworks = function (pos, dur) {
    CR.fw.c = { x: pos.x, y: pos.y, z: pos.z };
    CR.fw.until = G.Game.time + (dur || 9);
    CR.fw.next = 0;
  };
  function updateFireworks(dt) {
    const F = CR.fw, now = G.Game.time;
    if (F.c && now < F.until) {
      F.next -= dt;
      if (F.next <= 0) {
        F.next = U.rand(0.25, 0.5);
        const a = Math.random() * Math.PI * 2, r = U.rand(7, 18);
        F.rockets.push({ x: F.c.x + Math.cos(a) * r, y: F.c.y + 1, z: F.c.z + Math.sin(a) * r, vx: U.rand(-2, 2), vy: U.rand(18, 23), vz: U.rand(-2, 2), fuse: U.rand(0.9, 1.2), col: U.pick(COLORS), big: Math.random() < 0.3 });
        G.Audio.play('firework_up', { pos: [F.c.x, F.c.y, F.c.z] });
      }
    }
    for (let i = F.rockets.length - 1; i >= 0; i--) {
      const k = F.rockets[i];
      k.fuse -= dt; k.vy -= 9 * dt;
      k.x += k.vx * dt; k.y += k.vy * dt; k.z += k.vz * dt;
      G.FX.glow.spawn(k.x, k.y, k.z, U.rand(-0.5, 0.5), -1, U.rand(-0.5, 0.5), 1, 0.8, 0.5, 0.25, 0.4, 3, 1);
      if (k.fuse > 0) continue;
      F.rockets.splice(i, 1);
      const n = k.big ? 140 : 90, sp = k.big ? 15 : 11, c = k.col;
      for (let j = 0; j < n; j++) {
        const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), v = sp * U.rand(0.85, 1);
        G.FX.glow.spawn(k.x, k.y, k.z, Math.cos(t) * s * v, u * v, Math.sin(t) * s * v, c[0], c[1], c[2], k.big ? 0.7 : 0.5, U.rand(1.3, 2.1), 3.5, 1.2);
      }
      G.Audio.play('firework_boom', { pos: [k.x, k.y, k.z] });
    }
  }

  // Couronne qui brille et tourne doucement
  CR.update = function (dt) {
    updateFireworks(dt);
    const t = G.Game.time;
    for (const a of CR.holders) {
      if (!a.crown) continue;
      a.crown.rotation.y += dt * 0.8;
      a.crown.position.y = 0.52 + Math.sin(t * 2.2) * 0.02;
      if (a.char.root.visible && (a.isPlayer || a.distToCam < 40) && Math.random() < 0.12) {
        const p = a.crown.getWorldPosition(U.v1);
        G.FX.sparkle(p.x + U.rand(-0.15, 0.15), p.y + 0.05, p.z + U.rand(-0.15, 0.15), 1, 0.85, 0.3, 0.5);
      }
    }
  };
})();
