// ============================================================
//  ÉVÉNEMENT MÉTÉO : TORNADE. Pendant certains orages, une tornade
//  se forme et traverse l'île : elle aspire les joueurs, les fait
//  tourner jusqu'au ciel puis les éjecte (sans dégâts de chute),
//  arrache les constructions et fait voler des débris.
// ============================================================
(function () {
  const U = G.U;
  const TN = { t: null, scheduled: null };
  G.Tornado = TN;
  const H = 105, LIFE = 110;

  // Texture « tourbillon » : traînées claires en diagonale (générée une fois)
  let TEX = null;
  function texture() {
    if (TEX) return TEX;
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(165,165,172,0.42)'; x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 170; i++) {
      const px = Math.random() * 128, py = Math.random() * 256, len = 20 + Math.random() * 70;
      const a = 0.15 + Math.random() * 0.4, l = Math.random() < 0.35 ? 70 + Math.random() * 40 : 170 + Math.random() * 80;
      x.strokeStyle = `rgba(${l},${l},${l + 8},${a})`;
      x.lineWidth = 2 + Math.random() * 7;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + len * 0.9, py - len * 0.35); x.stroke();
      // raccord horizontal (texture qui boucle)
      x.beginPath(); x.moveTo(px - 128, py); x.lineTo(px - 128 + len * 0.9, py - len * 0.35); x.stroke();
    }
    TEX = new THREE.CanvasTexture(c);
    TEX.wrapS = TEX.wrapT = THREE.RepeatWrapping;
    return TEX;
  }

  function build() {
    const g = new THREE.Group();
    // entonnoir : 3 couches (profil courbe) qui tournent à des vitesses différentes
    const pts = [];
    for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push(new THREE.Vector2(2.6 + 30 * Math.pow(k, 2.2) + Math.sin(k * 9) * 0.6, k * H)); }
    const lathe = new THREE.LatheGeometry(pts, 30);
    const layers = [];
    [[1, 0x8a8a92, 0.62, 3, 1.2], [0.78, 0x6a6a72, 0.55, 4, 1.7], [1.18, 0xb0b0b8, 0.32, 2, 0.8]].forEach(([s, col, op, rep, spd]) => {
      const t = texture().clone(); t.needsUpdate = true; t.repeat.set(rep, 2);
      const m = new THREE.Mesh(lathe, new THREE.MeshBasicMaterial({ map: t, color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
      m.scale.set(s, 1, s);
      m.renderOrder = 3;
      g.add(m); layers.push({ m, t, spd });
    });
    // nuage-mur au sommet
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(48, 20, 10), new THREE.MeshBasicMaterial({ color: 0x4a4a55, transparent: true, opacity: 0.72, depthWrite: false }));
    cloud.scale.set(1, 0.16, 1); cloud.position.y = H + 2; g.add(cloud);
    // débris qui tournent (planches, pierres)
    const N = 44;
    const deb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.12, 0.35), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }), N);
    deb.frustumCulled = false;
    const orb = [];
    for (let i = 0; i < N; i++) orb.push({ a: Math.random() * 6.28, h: Math.random(), sp: U.rand(1.6, 3.2), spin: U.rand(2, 7), s: U.rand(0.6, 1.8) });
    g.add(deb);
    g.userData = { layers, cloud, deb, orb, lathe };
    return g;
  }
  const qList = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

  function remove(T) {
    G.scene.remove(T.g);
    for (const L of T.g.userData.layers) L.t.dispose();
    if (G.Extras.disposeTree) G.Extras.disposeTree(T.g);
    TN.t = null;
  }
  TN.reset = function (forMatch) {
    if (TN.t) remove(TN.t);
    TN.scheduled = forMatch && Math.random() < 0.4 ? U.rand(230, 560) : null;
    TN.warned = false;
    if (G.Audio) G.Audio.setLoop('tornado', 0);
  };

  TN.launch = function (at) {
    if (TN.t) return;
    const S = G.Storm;
    let x, z;
    if (at) { x = at[0]; z = at[1]; }
    else {
      // quelque part dans la zone, loin du bord de l'île
      const c = S && S.active && S.cur ? S.cur : { x: 0, z: 0, r: 500 };
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * Math.min(c.r || 400, 380);
        x = c.x + Math.cos(a) * d; z = c.z + Math.sin(a) * d;
        if (G.Terrain.height(x, z) > 1 && Math.hypot(x, z) < 600) break;
      }
    }
    const g = build();
    g.position.set(x, Math.max(G.Terrain.height(x, z), 0) - 1, z);
    g.scale.set(0.01, 0.01, 0.01);
    G.scene.add(g);
    TN.t = { g, x, z, t: 0, head: Math.random() * 6.28, dustT: 0, bT: 0, caught: new Set() };
    G.Weather.forceRain(1);
    const poi = G.MapData.nearestPoiName ? G.MapData.nearestPoiName(x, z) : null;
    G.HUD.notify('🌪 UNE TORNADE SE FORME' + (poi ? ' PRÈS DE ' + poi.toUpperCase() : '') + ' !', 4, 'storm');
    G.Audio.play('storm_warning');
  };

  TN.update = function (dt) {
    if (TN.scheduled != null && G.Game.state === 'playing') {
      // l'orage arrive un peu avant la tornade
      if (!TN.warned && G.Game.time >= TN.scheduled - 25) { TN.warned = true; G.Weather.forceRain(1); }
      if (G.Game.time >= TN.scheduled) { TN.scheduled = null; TN.launch(); }
    }
    const T = TN.t; if (!T) return;
    T.t += dt;
    const g = T.g, ud = g.userData;
    // croissance / dissipation
    const k = T.t < 7 ? T.t / 7 : T.t > LIFE - 8 ? Math.max(0, (LIFE - T.t) / 8) : 1;
    const sc = Math.max(0.01, k);
    g.scale.set(sc, sc, sc);
    // trajectoire : avance en serpentant, reste sur l'île
    T.head += Math.sin(T.t * 0.23) * 0.35 * dt + U.rand(-0.1, 0.1) * dt;
    const dc = Math.hypot(T.x, T.z);
    if (dc > 560) { const toC = Math.atan2(-T.z, -T.x); let da = toC - T.head; da = Math.atan2(Math.sin(da), Math.cos(da)); T.head += da * Math.min(1, dt * 0.8); }
    const spd = 5.5;
    T.x += Math.cos(T.head) * spd * dt; T.z += Math.sin(T.head) * spd * dt;
    const baseY = Math.max(G.Terrain.height(T.x, T.z), 0);
    g.position.set(T.x, U.damp(g.position.y, baseY - 1, 2, dt), T.z);
    // animation de l'entonnoir
    for (const L of ud.layers) { L.m.rotation.y += dt * L.spd; L.t.offset.x += dt * 0.35 * L.spd; L.t.offset.y -= dt * 0.25; }
    ud.cloud.rotation.y += dt * 0.25;
    // débris
    const N = ud.orb.length;
    for (let i = 0; i < N; i++) {
      const o = ud.orb[i];
      o.a += dt * o.sp;
      o.h += dt * 0.05; if (o.h > 1) o.h -= 1;
      const y = o.h * H * 0.8 + 1;
      const r = (2.6 + 30 * Math.pow(y / H, 2.2)) * 1.05 + 1.5;
      _p.set(Math.cos(o.a) * r, y, Math.sin(o.a) * r);
      _e.set(o.a * o.spin * 0.3, o.a * 1.7, o.a * o.spin * 0.2); _q.setFromEuler(_e);
      _s.setScalar(o.s);
      _m.compose(_p, _q, _s); ud.deb.setMatrixAt(i, _m);
    }
    ud.deb.instanceMatrix.needsUpdate = true;
    // poussière au sol
    T.dustT -= dt;
    const pl = G.player, cam = G.camera.position;
    const camD = Math.hypot(cam.x - T.x, cam.z - T.z);
    if (T.dustT <= 0 && camD < 350) {
      T.dustT = 0.06;
      const a = Math.random() * 6.28, r = U.rand(2, 9) * sc;
      const water = G.Terrain.height(T.x, T.z) < 0.2;
      G.FX.smoke.spawn(T.x + Math.cos(a) * r, baseY + 0.3, T.z + Math.sin(a) * r, -Math.sin(a) * 7, U.rand(2, 6), Math.cos(a) * 7, water ? 0.8 : 0.62, water ? 0.85 : 0.55, water ? 0.9 : 0.45, U.rand(2, 4) * sc, U.rand(1.2, 2.2), -0.2, 4, 5);
    }
    // son : grondement selon la distance
    const pd = pl ? Math.hypot(pl.pos.x - T.x, pl.pos.z - T.z) : 999;
    const vol = Math.max(0, 1 - pd / 260) * 0.5 * sc;
    G.Audio.setLoop('tornado', vol, null, null);
    // la caméra tremble à l'approche
    if (pd < 90) G.Game.shakeAmt = Math.max(G.Game.shakeAmt || 0, (1 - pd / 90) * 0.18 * sc);
    // les constructions sur le passage sont arrachées
    T.bT -= dt;
    if (T.bT <= 0 && k > 0.5) {
      T.bT = 0.35;
      const list = G.Phys.query(T.x - 7, baseY - 2, T.z - 7, T.x + 7, baseY + 30, T.z + 7, 3, qList);
      const seen = new Set();
      for (const c of list) { const e = c.ent; if (!e || e.dead || seen.has(e) || e.type !== 'build') continue; seen.add(e); G.World.damage(e, 150, { explosive: true }); }
    }
    // personnages aspirés
    const now = G.Game.time;
    for (const a of G.Combat.actors) {
      if (a.dead || a.state !== 'ground' || a.vehicle || a.zip || a.mantle) continue;
      if (a.tnFree && now < a.tnFree) continue;
      const dx = a.pos.x - T.x, dz = a.pos.z - T.z;
      const d = Math.hypot(dx, dz);
      const R = 11 * sc;
      if (d > R || a.pos.y > baseY + 72) continue;
      const hy = a.pos.y - baseY;
      if (hy > 52) {
        // éjection
        const ox = d > 0.1 ? dx / d : 1, oz = d > 0.1 ? dz / d : 0;
        a.vel.set(ox * 22 + U.rand(-3, 3), 13, oz * 22 + U.rand(-3, 3));
        a.flingT = 3.5; a.noFallT = Math.max(a.noFallT || 0, 1); a.tnFree = now + 3;
        if (a.isPlayer) { G.HUD.notify('ÉJECTÉ ! (Espace pour ouvrir le planeur)', 2.5); }
        continue;
      }
      a.grounded = false;
      a.vel.y = Math.max(a.vel.y, d < R * 0.6 ? 13 : 7);
      a.noFallT = Math.max(a.noFallT || 0, 2);
      a.flingT = 0.5;
      if (hy > 1.5 && d > 0.3) {
        // rotation autour de l'axe + légère attraction vers le centre
        const tx = -dz / d, tz = dx / d;
        const pull = Math.min(d, 3 * dt);
        a.pos.x += tx * 10 * dt - dx / d * pull; a.pos.z += tz * 10 * dt - dz / d * pull;
        a.vel.x *= 0.9; a.vel.z *= 0.9;
      } else { a.vel.x += -dx / Math.max(d, 0.5) * 6 * dt; a.vel.z += -dz / Math.max(d, 0.5) * 6 * dt; }
      if (!T.caught.has(a)) {
        T.caught.add(a);
        if (a.isPlayer) { G.HUD.notify('🌪 VOUS ÊTES EMPORTÉ PAR LA TORNADE !', 2.5); if (G.Match) G.Match.challengeEvent('tornado'); G.Audio.play('launchpad'); }
      }
    }
    if (T.t >= LIFE) {
      remove(T);
      G.Audio.setLoop('tornado', 0);
      G.Weather.forceRain(0);
    }
  };

  TN.mapIcons = function (ctx, toMap, big) {
    const T = TN.t; if (!T) return;
    const m = toMap(T.x, T.z), s = big ? 1.4 : 1;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4 * s;
    const spiral = () => { ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 4 + G.Game.time * 3, r = (1 + i / 24 * 7) * s; const px = m[0] + Math.cos(a) * r, py = m[1] + Math.sin(a) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); };
    spiral(); ctx.strokeStyle = '#d8dce8'; ctx.lineWidth = 2 * s; spiral();
  };
})();
