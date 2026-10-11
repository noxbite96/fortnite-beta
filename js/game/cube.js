// ============================================================
//  ÉVÉNEMENT EN DIRECT n°3 : LE CUBE. Un cube violet géant apparaît
//  dans le ciel, atterrit puis roule à travers l'île en laissant des
//  runes lumineuses, jusqu'au Lac Butin où il plonge… et le lac se
//  met à REBONDIR (comme dans la saison 6 de Fortnite).
// ============================================================
(function () {
  const U = G.U;
  const CU = { c: null, scheduled: null, runes: [], bouncy: false, overlay: null };
  G.Cube = CU;
  const S = 8, STEP = 1.5;

  let TEX = null, RUNE = null;
  function tex() {
    if (TEX) return;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#1a0630'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#d070ff'; x.lineWidth = 3; x.shadowColor = '#e0a0ff'; x.shadowBlur = 8;
    x.strokeRect(6, 6, 116, 116);
    for (let i = 0; i < 16; i++) {
      const px = 16 + Math.floor(Math.random() * 6) * 17, py = 16 + Math.floor(Math.random() * 6) * 17;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 3; k++) { const d = Math.floor(Math.random() * 4); x.lineTo(px + [14, 0, -14, 0][d], py + [0, 14, 0, -14][d]); }
      x.stroke();
    }
    TEX = new THREE.CanvasTexture(c);
    // rune au sol
    const r = document.createElement('canvas'); r.width = r.height = 128;
    const y = r.getContext('2d');
    y.strokeStyle = 'rgba(220,120,255,0.95)'; y.lineWidth = 5; y.shadowColor = '#c040ff'; y.shadowBlur = 12;
    y.strokeRect(10, 10, 108, 108);
    y.beginPath(); y.moveTo(30, 30); y.lineTo(98, 30); y.lineTo(98, 64); y.lineTo(30, 64); y.lineTo(30, 98); y.lineTo(98, 98); y.stroke();
    y.beginPath(); y.moveTo(64, 10); y.lineTo(64, 30); y.moveTo(64, 98); y.lineTo(64, 118); y.stroke();
    RUNE = new THREE.CanvasTexture(r);
  }
  let runeGeo = null, runeMat = null;

  function build() {
    tex();
    const g = new THREE.Group();          // position = centre du bas du cube, orienté vers la cible
    const pivot = new THREE.Group(); pivot.position.z = S / 2; g.add(pivot);
    const inner = new THREE.Group(); inner.position.set(0, S / 2, -S / 2); pivot.add(inner);
    const m = new THREE.Mesh(new THREE.BoxGeometry(S, S, S), new THREE.MeshLambertMaterial({ map: TEX, emissive: 0xb040ff, emissiveMap: TEX, emissiveIntensity: 1.2 }));
    m.castShadow = true; inner.add(m);
    const shell = new THREE.Mesh(new THREE.BoxGeometry(S * 1.12, S * 1.12, S * 1.12), new THREE.MeshBasicMaterial({ color: 0xa040ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    inner.add(shell);
    g.userData = { pivot, inner, shell };
    return g;
  }

  CU.reset = function (forMatch) {
    if (CU.c) { G.scene.remove(CU.c.g); G.Extras.disposeTree(CU.c.g); CU.c = null; }
    for (const r of CU.runes) G.scene.remove(r);
    CU.runes.length = 0;
    CU.bouncy = false;
    if (CU.overlay) CU.overlay.visible = false;
    const other = (G.UFO && G.UFO.scheduled) || (G.Tornado && G.Tornado.scheduled);
    CU.scheduled = forMatch && Math.random() < (other ? 0.2 : 0.35) ? U.rand(260, 520) : null;
  };

  CU.launch = function (from) {
    if (CU.c) return;
    const L = G.MapData.lake;
    let sx, sz, a;
    if (from) { sx = from[0]; sz = from[1]; a = Math.atan2(sz - L.z, sx - L.x); }
    else {
      for (let i = 0; i < 30; i++) {
        a = Math.random() * 6.28;
        sx = L.x + Math.cos(a) * U.rand(220, 300); sz = L.z + Math.sin(a) * U.rand(220, 300);
        if (G.Terrain.height(sx, sz) > 1 && Math.hypot(sx, sz) < 620) break;
      }
    }
    // point de chute dans le lac, entre la rive et l'île
    const tx = L.x + Math.cos(a) * 42, tz = L.z + Math.sin(a) * 42;
    const g = build();
    const gy = Math.max(G.Terrain.height(sx, sz), 0);
    g.position.set(sx, gy + 140, sz);
    g.rotation.y = Math.atan2(tx - sx, tz - sz);
    G.scene.add(g);
    CU.c = { g, x: sx, z: sz, tx, tz, gy, phase: 'fall', t: 0, humT: 0, k: 0, h0: gy, h1: gy };
    G.HUD.notify('⬛ UN CUBE MYSTÉRIEUX EST APPARU DANS LE CIEL !', 4, 'storm');
    G.Audio.play('storm_warning');
    if (G.Weather.bolt) for (let i = 0; i < 3; i++) setTimeout(() => { if (CU.c) G.Weather.bolt(sx + U.rand(-20, 20), gy, sz + U.rand(-20, 20), 0xc070ff); }, i * 400);
  };

  function impact(c) {
    const x = c.x, z = c.z, y = c.h1;
    G.Audio.play('explosion', { pos: [x, y, z] });
    const pd = G.player ? Math.hypot(G.player.pos.x - x, G.player.pos.z - z) : 999;
    if (pd < 80) G.Game.shakeAmt = Math.max(G.Game.shakeAmt || 0, (1 - pd / 80) * 0.5);
    if (Math.hypot(G.camera.position.x - x, G.camera.position.z - z) < 200) for (let i = 0; i < 18; i++) G.FX.dust(x + U.rand(-S / 2, S / 2), y, z + U.rand(-S / 2, S / 2), 2, 2.2);
    // rune au sol
    if (!runeGeo) { runeGeo = new THREE.PlaneGeometry(S * 0.95, S * 0.95).rotateX(-Math.PI / 2); runeMat = new THREE.MeshBasicMaterial({ map: RUNE, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }); }
    if (G.Terrain.height(x, z) > 0.2) {
      const r = new THREE.Mesh(runeGeo, runeMat);
      r.position.set(x, y + 0.08, z); r.rotation.y = c.g.rotation.y;
      G.scene.add(r); CU.runes.push(r);
      if (CU.runes.length > 45) G.scene.remove(CU.runes.shift());
    }
    // écrase ce qui est dessous
    for (const a of G.Combat.actors) {
      if (a.dead) continue;
      const dx = a.pos.x - x, dz = a.pos.z - z;
      if (Math.abs(dx) < S * 0.7 && Math.abs(dz) < S * 0.7 && a.pos.y < y + S) {
        G.Combat.damageActor(a, 35, { by: null, weapon: 'cube', point: [a.pos.x, a.pos.y + 1, a.pos.z] });
        const d = Math.max(0.5, Math.hypot(dx, dz));
        a.vel.x += dx / d * 12; a.vel.z += dz / d * 12; a.vel.y += 8; a.grounded = false;
      }
    }
    const list = G.Phys.query(x - S / 2, y - 1, z - S / 2, x + S / 2, y + S, z + S / 2, 3, []);
    const seen = new Set();
    for (const cc of list) { const e = cc.ent; if (!e || e.dead || seen.has(e) || (e.type !== 'build' && e.type !== 'prop' && e.type !== 'tree' && e.type !== 'bush' && e.type !== 'furniture')) continue; seen.add(e); G.World.damage(e, 999, { explosive: true }); }
  }

  function makeOverlay() {
    if (CU.overlay) return CU.overlay;
    const L = G.MapData.lake;
    const o = new THREE.Mesh(new THREE.RingGeometry(L.island.r - 2, L.r + 14, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9a3aff, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    o.position.set(L.x, 0.3, L.z);
    o.renderOrder = 2;
    G.scene.add(o);
    CU.overlay = o;
    return o;
  }

  CU.update = function (dt) {
    if (CU.scheduled != null && G.Game.state === 'playing' && G.Game.time >= CU.scheduled) { CU.scheduled = null; CU.launch(); }
    // lac rebondissant
    if (CU.bouncy) {
      const L = G.MapData.lake, o = CU.overlay;
      if (o) o.material.opacity = 0.36 + Math.sin(G.Game.time * 2) * 0.08;
      for (const a of G.Combat.actors) {
        if (a.dead || a.vehicle || a.state !== 'ground') continue;
        const d = Math.hypot(a.pos.x - L.x, a.pos.z - L.z);
        if (d > L.r + 16 || d < L.island.r - 2 || a.pos.y > 0.45 || G.Terrain.height(a.pos.x, a.pos.z) > -0.2) continue;
        a.pos.y = 0.5; a.vel.y = 17 + Math.random() * 3; a.swimming = false; a.inWater = false; a.grounded = false; a.noFallT = Math.max(a.noFallT || 0, 3);
        if (a.isPlayer || a.distToCam < 50) { G.Audio.play('bounce', { pos: a.isPlayer ? null : [a.pos.x, 0, a.pos.z] }); for (let i = 0; i < 14; i++) G.FX.glow.spawn(a.pos.x, 0.3, a.pos.z, U.rand(-3, 3), U.rand(1, 4), U.rand(-3, 3), 0.75, 0.35, 1, 0.25, 0.7, 4, 1); }
        if (a.isPlayer && G.Match) G.Match.challengeEvent('cube');
      }
    }
    const c = CU.c; if (!c) return;
    c.t += dt;
    const g = c.g, ud = g.userData;
    ud.shell.material.opacity = 0.14 + Math.sin(c.t * 4) * 0.06;
    c.humT -= dt;
    if (c.humT <= 0) { c.humT = 1.2; G.Audio.play('ufo', { pos: [g.position.x, g.position.y + S / 2, g.position.z] }); }
    if (c.phase === 'fall') {
      // descend lentement du ciel en tournoyant, puis s'écrase
      const k = Math.min(1, c.t / 7);
      g.position.y = c.gy + 140 * (1 - k * k);
      ud.inner.rotation.y = (1 - k) * 6;
      ud.inner.rotation.x = (1 - k) * 2;
      if (k >= 1) { ud.inner.rotation.set(0, 0, 0); c.phase = 'roll'; c.t = 0; c.h1 = c.gy; impact(c); }
    } else if (c.phase === 'roll') {
      const k = Math.min(1, c.t / STEP);
      // bascule de 90° autour de l'arête avant
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      ud.pivot.rotation.x = e * Math.PI / 2;
      g.position.y = U.lerp(c.h0, c.h1, e);
      if (k >= 1) {
        c.t = 0;
        const fx = Math.sin(g.rotation.y), fz = Math.cos(g.rotation.y);
        c.x += fx * S; c.z += fz * S;
        g.position.set(c.x, c.h1, c.z);
        ud.pivot.rotation.x = 0;
        impact(c);
        // prochaine case
        const nx = c.x + fx * S, nz = c.z + fz * S;
        c.h0 = c.h1;
        const ahead = G.Terrain.height(nx, nz);
        if (ahead < -0.4 || Math.hypot(c.tx - c.x, c.tz - c.z) < S) { c.phase = 'sink'; c.t = 0; G.HUD.notify('LE CUBE A PLONGÉ DANS LE LAC BUTIN !', 3.5, 'storm'); G.Audio.play('splash', { pos: [c.x, 0, c.z] }); }
        else c.h1 = Math.max(ahead, 0);
        // se réoriente doucement vers le lac
        const want = Math.atan2(c.tx - c.x, c.tz - c.z);
        let da = want - g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) > 0.6) g.rotation.y += Math.sign(da) * Math.PI / 2 * (Math.abs(da) > 1.2 ? 1 : 0.5);
      }
    } else if (c.phase === 'sink') {
      const k = Math.min(1, c.t / 9);
      g.position.y = U.lerp(c.h1, -S * 1.2, k);
      ud.inner.rotation.y += dt * 0.6;
      if (Math.random() < 0.5) G.FX.waterSplash(c.x + U.rand(-S / 2, S / 2), c.z + U.rand(-S / 2, S / 2), Math.random() < 0.2);
      if (k >= 1) {
        G.scene.remove(g); G.Extras.disposeTree(g); CU.c = null;
        CU.bouncy = true; makeOverlay().visible = true;
        G.HUD.notify('LE LAC BUTIN EST DEVENU REBONDISSANT !', 4, 'upgrade');
        G.Audio.play('levelup');
      }
    }
  };

  CU.mapIcons = function (ctx, toMap, big) {
    const s = big ? 1.4 : 1;
    const c = CU.c;
    if (c) {
      const m = toMap(c.x, c.z);
      ctx.fillStyle = '#000'; ctx.fillRect(m[0] - 6 * s, m[1] - 6 * s, 12 * s, 12 * s);
      ctx.fillStyle = '#a040ff'; ctx.fillRect(m[0] - 4.5 * s, m[1] - 4.5 * s, 9 * s, 9 * s);
      ctx.strokeStyle = '#e0a0ff'; ctx.lineWidth = 1; ctx.strokeRect(m[0] - 2.5 * s, m[1] - 2.5 * s, 5 * s, 5 * s);
    }
    if (CU.bouncy && big) {
      const L = G.MapData.lake, m = toMap(L.x, L.z), m2 = toMap(L.x + L.r, L.z);
      ctx.strokeStyle = 'rgba(190,90,255,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(m[0], m[1], Math.abs(m2[0] - m[0]), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  };
})();
