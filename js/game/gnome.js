// ============================================================
//  NAINS DE JARDIN CACHÉS : 12 nains sont cachés sur l'île à chaque
//  partie (près des lieux nommés, derrière les buissons, dans les
//  coins…). On les entend ricaner quand on s'approche. Marchez
//  dessus pour les trouver : XP, défis et collection sauvegardée.
// ============================================================
(function () {
  const U = G.U;
  const GN = { list: [], gigT: 0 };
  G.Gnomes = GN;
  const N = 12;

  let tpl = null;
  function model() {
    if (!tpl) {
      const V = G.Veg, P = [];
      P.push(V.colored(new THREE.CylinderGeometry(0.1, 0.13, 0.08, 10).translate(0, 0.04, 0), 0x5a3a1a, 0));        // socle / chaussures
      P.push(V.colored(new THREE.CylinderGeometry(0.11, 0.15, 0.3, 10).translate(0, 0.22, 0), 0x2a5ad8, 0));        // corps
      P.push(V.colored(new THREE.CylinderGeometry(0.155, 0.155, 0.04, 10).translate(0, 0.25, 0), 0x3a2a1a, 0));     // ceinture
      P.push(V.colored(new THREE.SphereGeometry(0.1, 10, 8).translate(0, 0.44, 0), 0xf0c8a0, 0));                   // tête
      P.push(V.colored(new THREE.SphereGeometry(0.03, 6, 5).translate(0, 0.43, 0.1), 0xff8a8a, 0));                 // nez
      P.push(V.colored(new THREE.ConeGeometry(0.1, 0.22, 8).rotateX(Math.PI).translate(0, 0.33, 0.05), 0xf4f4f4, 0)); // barbe
      P.push(V.colored(new THREE.ConeGeometry(0.115, 0.3, 10).translate(0, 0.62, 0), 0xe02a2a, 0));                 // bonnet
      for (const s of [-1, 1]) P.push(V.colored(new THREE.SphereGeometry(0.018, 5, 4).translate(s * 0.04, 0.47, 0.085), 0x101010, 0));
      for (const s of [-1, 1]) P.push(V.colored(new THREE.CylinderGeometry(0.035, 0.03, 0.18, 6).rotateZ(s * 0.5).translate(s * 0.15, 0.24, 0.02), 0x2a5ad8, 0));
      tpl = { geo: V.merge(P), mat: new THREE.MeshLambertMaterial({ vertexColors: true }) };
    }
    const m = new THREE.Mesh(tpl.geo, tpl.mat);
    m.castShadow = true;
    m.scale.setScalar(1.35);
    return m;
  }

  // on préfère les coins : collé à un mur, une caisse, un buisson…
  const q = [];
  function cover(x, z) {
    const y = G.Terrain.height(x, z);
    return G.Phys.query(x - 1.3, y, z - 1.3, x + 1.3, y + 1.5, z + 1.3, G.Phys.MOVE, q).length;
  }
  function spot() {
    const pois = G.MapData.pois;
    let best = null, bestC = -1;
    for (let i = 0; i < 40; i++) {
      const p = pois[Math.floor(Math.random() * pois.length)];
      const s = G.Folk ? G.Folk.findSpot(p.x, p.z, p.r * 0.4, p.r * 1.3) : [p.x + U.rand(-30, 30), p.z + U.rand(-30, 30)];
      if (!s || GN.list.some((g) => g.active && Math.hypot(g.x - s[0], g.z - s[1]) < 40)) continue;
      const c = cover(s[0], s[1]);
      if (c > bestC) { best = s; bestC = c; }
      if (bestC >= 2 && i > 8) break;
    }
    return best;
  }

  GN.reset = function () {
    if (!GN.list.length) for (let i = 0; i < N; i++) { const m = model(); m.visible = false; G.scene.add(m); GN.list.push({ m, x: 0, y: 0, z: 0, found: false, active: false, jumpT: 0 }); }
    const on = G.Store.data.settings.mode !== 'rumble';
    for (const g of GN.list) { g.active = false; g.m.visible = false; }
    if (!on) return;
    for (const g of GN.list) {
      const s = spot(); if (!s) continue;
      g.active = true;
      g.x = s[0]; g.z = s[1];
      g.y = G.Phys.supportAt(g.x, g.z, G.Terrain.height(g.x, g.z) + 2, 0.2, 0.6);
      g.m.position.set(g.x, g.y, g.z);
      g.m.rotation.set(0, Math.random() * 6.28, 0);
      g.m.visible = true; g.active = true; g.found = false; g.jumpT = 0;
    }
  };

  function find(g, a) {
    g.found = true; g.jumpT = 1.6;
    G.Audio.play('unlock');
    G.Audio.play('gnome', { pos: [g.x, g.y + 0.5, g.z] });
    for (let i = 0; i < 40; i++) G.FX.glow.spawn(g.x, g.y + 0.6, g.z, U.rand(-3, 3), U.rand(2, 6), U.rand(-3, 3), 1, 0.35, 0.35, U.rand(0.12, 0.25), U.rand(0.6, 1.2), 5, 1);
    const d = G.Store.data;
    d.gnomes = (d.gnomes || 0) + 1;
    const n = GN.list.filter((x) => x.active && x.found).length;
    G.HUD.notify('NAIN DE JARDIN TROUVÉ ! (' + n + ' / ' + GN.list.filter((x) => x.active).length + ')', 2.2, 'upgrade');
    G.HUD.xpToast(250, 'Nain de jardin');
    if (G.Match) G.Match.challengeEvent('gnome');
    // petit cadeau : quelques lingots
    a.gold = Math.min(9999, (a.gold || 0) + 25);
    G.Store.save();
  }

  GN.update = function (dt) {
    const pl = G.player;
    if (!pl || !GN.list.length) return;
    let nearest = 1e9;
    for (const g of GN.list) {
      if (!g.active) continue;
      if (g.jumpT > 0) {
        // saut de joie en tournant, puis disparition
        g.jumpT -= dt;
        const k = 1 - g.jumpT / 1.6;
        g.m.position.y = g.y + Math.sin(Math.min(1, k * 1.6) * Math.PI) * 1.2;
        g.m.rotation.y += dt * 14;
        if (g.jumpT <= 0) { g.m.visible = false; g.active = false; }
        continue;
      }
      if (g.found) continue;
      const d = Math.hypot(pl.pos.x - g.x, pl.pos.z - g.z);
      if (d < nearest) nearest = d;
      if (d < 1.6 && Math.abs(pl.pos.y - g.y) < 2 && !pl.dead && pl.state === 'ground') find(g, pl);
    }
    // ricanement quand on est tout près
    GN.gigT -= dt;
    if (GN.gigT <= 0 && nearest < 18 && G.Game.state === 'playing') {
      GN.gigT = U.rand(3, 5);
      const g = GN.list.find((x) => x.active && !x.found && Math.hypot(pl.pos.x - x.x, pl.pos.z - x.z) === nearest);
      if (g) G.Audio.play('gnome', { pos: [g.x, g.y + 0.5, g.z] });
    }
  };
})();
