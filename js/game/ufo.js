// ============================================================
//  ÉVÉNEMENT EN DIRECT n°2 : un OVNI survole un lieu nommé,
//  aspire les joueurs dans son rayon tracteur puis largue du butin
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const UF = { ufo: null, scheduled: null };
  G.UFO = UF;

  function ufoModel() {
    const g = new THREE.Group();
    const V = G.Veg, parts = [];
    const add = (geo, col) => parts.push(V.colored(geo, col, 0));
    add(new THREE.CylinderGeometry(7.5, 5.2, 1.0, 32), 0xa8b0c0);
    add(new THREE.CylinderGeometry(5.2, 3.2, 0.9, 32).translate(0, -0.95, 0), 0x7a8292);
    add(new THREE.CylinderGeometry(7.7, 7.7, 0.25, 32).translate(0, 0.1, 0), 0x5a6272);
    add(new THREE.CylinderGeometry(2.0, 2.2, 0.4, 20).translate(0, -1.5, 0), 0x3a4252);
    g.add(new THREE.Mesh(V.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x7affc8, emissive: 0x20a070, emissiveIntensity: 0.6, transparent: true, opacity: 0.75 }));
    dome.position.y = 0.4; g.add(dome);
    // petit pilote dans la coupole
    const alien = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), new THREE.MeshLambertMaterial({ color: 0x5ad86a })); alien.position.y = 1.4; alien.scale.set(1, 1.25, 1); g.add(alien);
    for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0x101010 })); eye.position.set(s * 0.38, 1.6, 0.72); eye.scale.set(1, 1.4, 0.6); g.add(eye); }
    // feux du pourtour
    const lights = new THREE.Group(); g.add(lights);
    const lm = [0xff4a4a, 0xffd23a, 0x4ab0ff, 0x7dff6a].map((c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    const lg = new THREE.SphereGeometry(0.28, 8, 6);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const l = new THREE.Mesh(lg, lm[i % 4]); l.position.set(Math.cos(a) * 7.3, 0.1, Math.sin(a) * 7.3); lights.add(l); }
    // rayon tracteur
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 9, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x7affb0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.geometry.translate(0, -0.5, 0);
    beam.position.y = -1.6; g.add(beam);
    g.userData = { lights, beam };
    return g;
  }

  UF.reset = function (forMatch) {
    if (UF.ufo) { G.scene.remove(UF.ufo.g); if (G.Extras.disposeTree) G.Extras.disposeTree(UF.ufo.g); UF.ufo = null; }
    const meteor = G.Events && G.Events.scheduled != null;
    UF.scheduled = forMatch && Math.random() < (meteor ? 0.45 : 0.8) ? U.rand(320, 460) : null;
  };

  UF.launch = function (forcedPoi) {
    const S = G.Storm;
    // lieu nommé le plus proche du centre de la zone
    const c = S && S.active ? (S.next || S.cur) : { x: 0, z: 0 };
    const pois = G.MapData.pois.slice().sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z));
    const p = forcedPoi || pois[Math.floor(Math.random() * Math.min(3, pois.length))];
    const ty = Math.max(G.Terrain.height(p.x, p.z), 0) + 34;
    const a = Math.random() * Math.PI * 2;
    const g = ufoModel();
    const sx = p.x + Math.cos(a) * 700, sz = p.z + Math.sin(a) * 700, sy = ty + 140;
    g.position.set(sx, sy, sz);
    G.scene.add(g);
    UF.ufo = { g, p, sx, sy, sz, tx: p.x, ty, tz: p.z, phase: 'arrive', t: 0, humT: 0 };
    G.HUD.notify('👽 UN OVNI APPROCHE DE ' + p.name.toUpperCase() + ' !', 4, 'storm');
    G.Audio.play('storm_warning');
  };

  function dropLoot(u) {
    const x = u.g.position.x, y = u.g.position.y - 2, z = u.g.position.z;
    const drops = [];
    for (let i = 0; i < 3; i++) { const w = I.randomWeapon(3); drops.push({ kind: 'item', item: I.make(w.id, 4) }); }
    drops.push({ kind: 'item', item: I.make('shieldpot') }, { kind: 'item', item: I.make('chug') }, { kind: 'item', item: I.make('hoprock', null, 2) }, { kind: 'gold', type: 'gold', amount: 200 });
    G.Loot.spill(drops, x, y, z, 3.5);
    for (let i = 0; i < 80; i++) G.FX.glow.spawn(x, y, z, U.rand(-8, 8), U.rand(-6, 2), U.rand(-8, 8), 0.5, 1, 0.7, 0.35, 1.2, 4, 1);
    G.Audio.play('levelup');
    const pl = G.player;
    if (pl && !pl.dead && Math.hypot(pl.pos.x - x, pl.pos.z - z) < 250) G.HUD.notify('L\'OVNI A LARGUÉ DU BUTIN LÉGENDAIRE !', 3, 'upgrade');
  }

  UF.update = function (dt) {
    if (UF.scheduled != null && G.Game.state === 'playing' && G.Game.time >= UF.scheduled) { UF.scheduled = null; UF.launch(); }
    const u = UF.ufo; if (!u) return;
    u.t += dt;
    const g = u.g, ud = g.userData;
    ud.lights.rotation.y += dt * 2.5;
    g.rotation.y += dt * 0.4;
    // bourdonnement
    u.humT -= dt;
    if (u.humT <= 0) { u.humT = 1.1; G.Audio.play('ufo', { pos: [g.position.x, g.position.y, g.position.z] }); }
    if (u.phase === 'arrive') {
      const k = Math.min(1, u.t / 9), kk = 1 - Math.pow(1 - k, 3);
      g.position.set(U.lerp(u.sx, u.tx, kk), U.lerp(u.sy, u.ty, kk), U.lerp(u.sz, u.tz, kk));
      if (k >= 1) { u.phase = 'beam'; u.t = 0; G.Audio.play('launchpad'); }
    } else if (u.phase === 'beam') {
      g.position.y = u.ty + Math.sin(u.t * 1.3) * 0.6;
      const len = g.position.y - 1.6 - Math.max(G.Terrain.height(u.tx, u.tz), 0);
      ud.beam.scale.y = len;
      ud.beam.material.opacity = Math.min(0.35, u.t * 0.2) * (0.8 + Math.sin(u.t * 6) * 0.2);
      // aspiration : personnages dans le cône lumineux
      for (const a of G.Combat.actors) {
        if (a.dead || a.state !== 'ground' || a.vehicle) continue;
        const d = Math.hypot(a.pos.x - g.position.x, a.pos.z - g.position.z);
        const h = g.position.y - a.pos.y;
        if (d > 8 || h < 5) continue;
        a.grounded = false;
        a.vel.y = Math.max(a.vel.y, h > 9 ? 5 : 0.9);
        a.vel.x *= 0.9; a.vel.z *= 0.9;
        a.noFallT = Math.max(a.noFallT || 0, 2);
        if (a.isPlayer && !u.abducted) { u.abducted = true; if (G.Match) G.Match.challengeEvent('ufo'); G.HUD.notify('👽 VOUS ÊTES ASPIRÉ PAR L\'OVNI !', 2); }
        if ((a.isPlayer || a.distToCam < 40) && Math.random() < 0.3) G.FX.glow.spawn(a.pos.x + U.rand(-0.6, 0.6), a.pos.y + U.rand(0, 1.8), a.pos.z + U.rand(-0.6, 0.6), 0, 2, 0, 0.5, 1, 0.7, 0.2, 0.6, 0, 0, 0);
      }
      if (Math.random() < 0.5) { const a = Math.random() * 6.28, r = Math.random() * 7; G.FX.glow.spawn(g.position.x + Math.cos(a) * r, Math.max(G.Terrain.height(u.tx, u.tz), 0) + 0.5, g.position.z + Math.sin(a) * r, 0, U.rand(3, 8), 0, 0.5, 1, 0.7, 0.3, 1.5, -1, 0, 0); }
      if (u.t > 24) { u.phase = 'leave'; u.t = 0; ud.beam.material.opacity = 0; dropLoot(u); }
    } else if (u.phase === 'leave') {
      const k = Math.min(1, u.t / 6);
      g.position.y = u.ty + k * k * 400;
      g.position.x += dt * 30 * k;
      if (k >= 1) { G.scene.remove(g); if (G.Extras.disposeTree) G.Extras.disposeTree(g); UF.ufo = null; }
    }
  };

  UF.mapIcons = function (ctx, toMap, big) {
    const u = UF.ufo; if (!u || u.phase === 'leave') return;
    const m = toMap(u.tx, u.tz), s = big ? 1.4 : 1;
    ctx.fillStyle = '#5ad86a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(m[0], m[1], 8 * s, 3.5 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#bfffe0'; ctx.beginPath(); ctx.arc(m[0], m[1] - 2 * s, 3 * s, Math.PI, 0); ctx.fill(); ctx.stroke();
  };
})();
