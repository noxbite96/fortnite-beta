// ============================================================
//  Événement en direct : chute de météorite en pleine partie
//  Le cratère laisse des Pierres de saut (gravité réduite)
// ============================================================
(function () {
  const U = G.U, T = G.Terrain, I = G.Items;
  const E = { meteor: null, craters: [], scheduled: null };
  G.Events = E;

  let rockGeo, rockMat, crystalGeo, crystalMat;
  function mats() {
    if (rockGeo) return;
    rockGeo = new THREE.DodecahedronGeometry(1, 1);
    const p = rockGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 0.8 + Math.sin(i * 12.9898) * 0.5 * 0.4 + 0.2; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    rockGeo.computeVertexNormals();
    rockMat = new THREE.MeshLambertMaterial({ color: 0x3a2a30, emissive: 0xff5a10, emissiveIntensity: 0.55, flatShading: true });
    crystalGeo = new THREE.OctahedronGeometry(0.5, 0);
    crystalMat = new THREE.MeshLambertMaterial({ color: 0x8a4aff, emissive: 0x6a20ff, emissiveIntensity: 0.9, flatShading: true });
  }

  // Programme l'événement pour la partie (pas en Terrain de jeu)
  E.reset = function (forMatch) {
    if (E.meteor) { G.scene.remove(E.meteor.m); E.meteor = null; }
    for (const c of E.craters) {
      G.scene.remove(c.g);
      c.g.traverse((o) => { if (o.isMesh) { if (o.geometry !== rockGeo) o.geometry.dispose(); if (o.material !== rockMat && o.material !== E.craterMat) o.material.dispose(); } });
      if (c.col) G.Phys.remove(c.col);
    }
    E.craters = [];
    E.scheduled = forMatch && Math.random() < 0.75 ? U.rand(140, 300) : null;
    E.warned = false;
  };

  function pickTarget() {
    const S = G.Storm;
    const c = S && S.active ? (S.next || S.cur) : { x: 0, z: 0, r: 300 };
    for (let i = 0; i < 40; i++) {
      const q = T.randomLandPoint(Math.random, c.x, c.z, Math.max(40, c.r * 0.8), 3);
      if (T.slope(q[0], q[1]) < 0.35 && !G.Veg.inPOI(q[0], q[1], 1.0)) return q;
    }
    return T.randomLandPoint(Math.random, c.x, c.z, 80, 3);
  }

  E.launch = function (target) {
    mats();
    const q = target || pickTarget();
    const ty = T.height(q[0], q[1]);
    const a = Math.random() * Math.PI * 2;
    const sx = q[0] + Math.cos(a) * 900, sz = q[1] + Math.sin(a) * 900, sy = ty + 520;
    const m = new THREE.Mesh(rockGeo, rockMat); m.scale.setScalar(6); m.position.set(sx, sy, sz);
    G.scene.add(m);
    E.meteor = { m, sx, sy, sz, tx: q[0], ty, tz: q[1], t: 0, dur: 9 };
    G.HUD.notify('☄ UNE MÉTÉORITE FONCE SUR L\'ÎLE !', 4, 'storm');
    G.Audio.play('thunder'); G.Audio.play('storm_warning');
    G.HUD.ping = G.HUD.ping || null;
    E.impactPoint = q;
  };

  function impact(me) {
    const x = me.tx, y = me.ty, z = me.tz;
    G.scene.remove(me.m);
    E.meteor = null;
    // explosion géante
    for (let i = 0; i < 4; i++) G.FX.explosion(x + U.rand(-4, 4), y + U.rand(0, 3), z + U.rand(-4, 4), 7);
    for (let i = 0; i < 160; i++) G.FX.glow.spawn(x, y + 1, z, U.rand(-25, 25), U.rand(5, 30), U.rand(-25, 25), 1, U.rand(0.3, 0.7), 0.1, U.rand(0.4, 0.9), U.rand(1, 2.5), 14, 0.5);
    for (let i = 0; i < 40; i++) G.FX.smoke.spawn(x + U.rand(-8, 8), y + U.rand(0, 4), z + U.rand(-8, 8), U.rand(-3, 3), U.rand(2, 6), U.rand(-3, 3), 0.35, 0.3, 0.3, U.rand(5, 9), U.rand(3, 6), -0.3, 0.6, 1.2);
    G.Audio.play('explosion', { pos: [x, y, z], vol: 1 }); G.Audio.play('explosion', { pos: [x, y, z], vol: 1, delay: 0.15 }); G.Audio.play('thunder');
    G.Combat.explode(x, y + 1, z, 16, 85, 1500, null, 'meteor');
    if (G.Game.shakeAt) G.Game.shakeAt(x, y, z, 30);
    G.HUD.flash('rgba(255,200,120,0.55)', 0.8);
    // cratère : anneau sombre + rochers + la météorite à moitié enterrée
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CircleGeometry(13, 36), new THREE.MeshLambertMaterial({ color: 0x2a221e, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, y + 0.15, z); g.add(ring);
    const glow = new THREE.Mesh(new THREE.RingGeometry(3.5, 5.5, 32), new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(x, y + 0.2, z); g.add(glow);
    const rock = new THREE.Mesh(rockGeo, E.craterMat || (E.craterMat = new THREE.MeshLambertMaterial({ color: 0x3a3036, emissive: 0xff4a10, emissiveIntensity: 0.22, flatShading: true }))); rock.scale.setScalar(3.6); rock.position.set(x, y + 0.6, z); rock.castShadow = true; g.add(rock);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + U.rand(-0.2, 0.2), r = U.rand(9, 13); const b = new THREE.Mesh(rockGeo, new THREE.MeshLambertMaterial({ color: 0x5a524a, flatShading: true })); b.scale.setScalar(U.rand(0.6, 1.5)); b.position.set(x + Math.cos(a) * r, T.height(x + Math.cos(a) * r, z + Math.sin(a) * r) + 0.2, z + Math.sin(a) * r); b.rotation.set(Math.random() * 3, Math.random() * 3, 0); b.castShadow = true; g.add(b); }
    G.scene.add(g);
    // collision de la météorite
    const col = G.Phys.box(x - 3, y - 1, z - 3, x + 3, y + 3.6, z + 3, { mat: 'stone', invulnerable: true, dead: false, noPickaxe: true, refs: [], meshes: [], type: 'prop' }, 3);
    G.Phys.add(col);
    // pierres de saut (au sol, à ramasser)
    const drops = [];
    for (let i = 0; i < 7; i++) drops.push({ kind: 'item', item: I.make('hoprock', null, 2) });
    G.Loot.spill(drops, x, y + 4, z, 3.5);
    E.craters.push({ g, glow, x, y, z, t: 0, col });
    const pl = G.player;
    if (pl && !pl.dead) {
      const d = Math.hypot(pl.pos.x - x, pl.pos.z - z);
      G.HUD.notify(d < 250 ? 'IMPACT ! Des Pierres de saut sont apparues dans le cratère' : 'Une météorite s\'est écrasée sur l\'île !', 4);
    }
  }

  E.update = function (dt) {
    if (E.scheduled != null && G.Game.state === 'playing' && G.Game.time >= E.scheduled) { E.scheduled = null; E.launch(); }
    const me = E.meteor;
    if (me) {
      me.t += dt;
      const k = Math.min(1, me.t / me.dur);
      const kk = k * k * (0.3 + 0.7 * k);
      const x = U.lerp(me.sx, me.tx, kk), y = U.lerp(me.sy, me.ty + 2, kk), z = U.lerp(me.sz, me.tz, kk);
      me.m.position.set(x, y, z); me.m.rotation.x += dt * 2; me.m.rotation.y += dt * 1.3;
      // traînée de feu
      for (let i = 0; i < 6; i++) G.FX.glow.spawn(x + U.rand(-3, 3), y + U.rand(-3, 3), z + U.rand(-3, 3), U.rand(-2, 2), U.rand(-2, 2), U.rand(-2, 2), 1, U.rand(0.35, 0.7), 0.1, U.rand(2, 4), U.rand(0.4, 0.9), 0, 1);
      if (Math.random() < 0.7) G.FX.smoke.spawn(x, y, z, 0, 1, 0, 0.3, 0.28, 0.28, U.rand(6, 10), U.rand(2, 4), -0.2, 0.3, 1.5);
      if (me.t > me.dur * 0.55 && !me.rumble) { me.rumble = true; G.Audio.play('thunder'); }
      if (k >= 1) impact(me);
    }
    for (const c of E.craters) { c.t += dt; c.glow.material.opacity = 0.35 + Math.sin(c.t * 2) * 0.2; if (Math.random() < dt * 3 && Math.hypot(c.x - G.camera.position.x, c.z - G.camera.position.z) < 120) G.FX.smoke.spawn(c.x + U.rand(-3, 3), c.y + 1, c.z + U.rand(-3, 3), 0, 1.2, 0, 0.3, 0.3, 0.3, 2.5, 3, -0.2, 0.5, 1.4); }
  };

  E.mapIcons = function (ctx, toMap, big) {
    const s = big ? 1.4 : 1;
    const draw = (x, z, col) => { const m = toMap(x, z); ctx.fillStyle = col; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(m[0], m[1], 5 * s, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(9 * s)}px Arial`; ctx.textAlign = 'center'; ctx.fillText('☄', m[0], m[1] + 3 * s); };
    if (E.meteor) draw(E.meteor.tx, E.meteor.tz, '#ff6a20');
    for (const c of E.craters) draw(c.x, c.z, '#8a4aff');
  };
})();
