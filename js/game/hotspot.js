// ============================================================
//  POINTS CHAUDS : à chaque partie, 2 lieux nommés sont « chauds » :
//  tous leurs coffres sont présents et des DRONES DE BUTIN les survolent.
//  Abattez un drone pour faire tomber sa caisse de butin rare.
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const HS = { spots: [], drones: [], announced: false };
  G.Hotspot = HS;

  // ---------- modèle du drone (parties fixes fusionnées + 4 rotors) ----------
  let tpl = null;
  function droneModel() {
    if (!tpl) {
      const V = G.Veg, body = [], crate = [];
      body.push(V.colored(new THREE.BoxGeometry(1.3, 0.34, 1.3), 0xf0f0f4, 0));
      body.push(V.colored(new THREE.BoxGeometry(0.9, 0.2, 0.9).translate(0, 0.25, 0), 0xff8a1a, 0));
      body.push(V.colored(new THREE.CylinderGeometry(0.22, 0.28, 0.2, 10).translate(0, -0.27, 0), 0x2a2a32, 0));
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        body.push(V.colored(new THREE.BoxGeometry(0.9, 0.08, 0.14).rotateY(Math.atan2(sz, sx) * -1).translate(sx * 0.7, 0.05, sz * 0.7), 0x3a3a44, 0));
        body.push(V.colored(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8).translate(sx * 1.05, 0.14, sz * 1.05), 0x2a2a32, 0));
      }
      // câbles + caisse dorée suspendue
      body.push(V.colored(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4).translate(0.25, -0.75, 0), 0x202020, 0));
      body.push(V.colored(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4).translate(-0.25, -0.75, 0), 0x202020, 0));
      crate.push(V.colored(new THREE.BoxGeometry(0.85, 0.6, 0.6).translate(0, -1.5, 0), 0x3a6ad8, 0));
      crate.push(V.colored(new THREE.BoxGeometry(0.9, 0.1, 0.65).translate(0, -1.2, 0), 0xffc830, 0));
      crate.push(V.colored(new THREE.BoxGeometry(0.9, 0.1, 0.65).translate(0, -1.78, 0), 0xffc830, 0));
      tpl = {
        body: V.merge(body), crate: V.merge(crate),
        bodyMat: new THREE.MeshLambertMaterial({ vertexColors: true }),
        crateMat: new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x1a3a90, emissiveIntensity: 0.5 }),
        rotor: new THREE.BoxGeometry(0.9, 0.02, 0.1), rotorMat: new THREE.MeshLambertMaterial({ color: 0x18181c }),
        light: new THREE.SphereGeometry(0.09, 8, 6), lightMat: new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }),
      };
    }
    const g = new THREE.Group();
    const b = new THREE.Mesh(tpl.body, tpl.bodyMat); b.castShadow = true; g.add(b);
    const c = new THREE.Mesh(tpl.crate, tpl.crateMat); c.castShadow = true; g.add(c);
    const rotors = [];
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const r = new THREE.Group(); r.position.set(sx * 1.05, 0.26, sz * 1.05);
      const b1 = new THREE.Mesh(tpl.rotor, tpl.rotorMat); r.add(b1);
      const b2 = new THREE.Mesh(tpl.rotor, tpl.rotorMat); b2.rotation.y = Math.PI / 2; r.add(b2);
      g.add(r); rotors.push(r);
    }
    const light = new THREE.Mesh(tpl.light, tpl.lightMat); light.position.set(0, -0.36, 0.3); g.add(light);
    g.userData = { rotors, light };
    return g;
  }

  // ---------- création (une fois) : 4 drones réutilisés à chaque partie ----------
  function makeDrone() {
    const W = G.World, P = G.Phys;
    const m = droneModel(); m.visible = false; G.scene.add(m);
    const d = { m, x: 0, y: -100, z: 0, a: 0, r: 20, cx: 0, cz: 0, alt: 16, active: false, hum: 0 };
    const e = W.ent('prop', 'metal', 220, { yield: 0, noPickaxe: true });
    e.drone = d; e.moving = true;
    d.e = e;
    d.col = P.box(-1, -200, -1, 1, -199, 1, e);
    W.addCol(e, d.col);
    P.remove(d.col);
    e.dead = true;
    e.onHit = (dmg, opts) => {
      if (opts && opts.by && opts.by.isPlayer && !opts.pickaxe) G.FX.damageNumber(d.x, d.y, d.z, dmg, 'build');
      if (Math.random() < 0.5) G.FX.hitSpark(d.x + U.rand(-0.5, 0.5), d.y, d.z + U.rand(-0.5, 0.5), false, false);
    };
    e.onDestroy = (opts) => shotDown(d, opts && opts.by);
    HS.drones.push(d);
    return d;
  }
  function placeCol(d) {
    const c = d.col, e = d.e, P = G.Phys;
    P.remove(c);
    c.minX = d.x - 0.95; c.maxX = d.x + 0.95; c.minZ = d.z - 0.95; c.maxZ = d.z + 0.95; c.minY = d.y - 1.9; c.maxY = d.y + 0.4;
    e.minX = c.minX; e.maxX = c.maxX; e.minY = c.minY; e.maxY = c.maxY; e.minZ = c.minZ; e.maxZ = c.maxZ;
    P.add(c);
  }

  // ---------- début de partie ----------
  HS.reset = function () {
    HS.spots = []; HS.announced = false;
    for (const d of HS.drones) { d.active = false; d.m.visible = false; if (!d.e.dead) { d.e.dead = true; G.Phys.remove(d.col); } }
  };
  // Au départ du bus (après la remise à zéro des coffres)
  HS.setup = function () {
    HS.reset();
    const M = G.Match;
    if (!M || M.playground) return;
    const skip = ['base', 'chateau', 'usine']; // les lieux de boss sont déjà assez chauds
    const pool = G.MapData.pois.filter((p) => !skip.includes(p.id));
    for (let i = 0; i < 2 && pool.length; i++) HS.spots.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    while (HS.drones.length < 4) makeDrone();
    let k = 0;
    for (const p of HS.spots) {
      // tous les coffres du lieu sont présents
      for (const c of G.Loot.chests) {
        if (c.vault || c.active || Math.hypot(c.x - p.x, c.z - p.z) > p.r) continue;
        c.active = true; c.opened = false; c.g.visible = true; c.glow.visible = true; c.lid.rotation.x = 0; c.openT = 0;
        if (Math.random() < 0.3) G.Loot.setRare(c, true);
      }
      for (let j = 0; j < 2; j++) {
        const d = HS.drones[k++];
        d.cx = p.x; d.cz = p.z; d.r = U.rand(14, Math.max(18, p.r * 0.55)); d.a = Math.random() * 6.28; d.dir = Math.random() < 0.5 ? -1 : 1;
        d.alt = U.rand(14, 19); d.active = true; d.m.visible = true; d.spot = p;
        d.e.dead = false; d.e.hp = d.e.maxHp; d.roof = null;
        move(d, 0);
      }
    }
  };
  function move(d, dt) {
    d.a += dt * 0.12 * d.dir * (22 / Math.max(10, d.r));
    d.x = d.cx + Math.cos(d.a) * d.r; d.z = d.cz + Math.sin(d.a) * d.r;
    // altitude : au-dessus du relief ET des toits (on regarde un peu devant)
    d.roofT = (d.roofT || 0) - dt;
    if (d.roofT <= 0 || d.roof == null) {
      d.roofT = 0.3;
      G.Phys.remove(d.col);
      const ax = d.cx + Math.cos(d.a + 0.25 * d.dir) * d.r, az = d.cz + Math.sin(d.a + 0.25 * d.dir) * d.r;
      let top = -1e9;
      for (const [qx, qz] of [[d.x, d.z], [ax, az]]) { const ty = Math.max(G.Terrain.height(qx, qz), 0); top = Math.max(top, ty, G.Phys.supportAt(qx, qz, ty + 60, 1.4, 0.6)); }
      d.roof = top;
    }
    const want = Math.max(d.roof + 7, Math.max(G.Terrain.height(d.x, d.z), 0) + d.alt) + Math.sin(G.Game.time * 0.9 + d.a * 3) * 0.8;
    d.y = dt > 0 ? U.damp(d.y, want, want > d.y ? 2.5 : 0.8, dt) : want;
    d.m.position.set(d.x, d.y, d.z);
    d.m.rotation.y = -d.a * d.dir;
    d.m.rotation.z = Math.sin(G.Game.time * 1.3 + d.a) * 0.06;
    placeCol(d);
  }

  function shotDown(d, by) {
    d.active = false;
    d.m.visible = false;
    G.FX.explosion(d.x, d.y, d.z, 2.2);
    G.Audio.play('explosion', { pos: [d.x, d.y, d.z] });
    // la caisse tombe : butin rare
    const drops = [];
    const w = I.randomWeapon(3);
    drops.push({ kind: 'item', item: I.make(w.id, Math.random() < 0.4 ? 4 : 3) });
    drops.push({ kind: 'item', item: I.make(Math.random() < 0.5 ? 'shieldpot' : 'medkit') });
    drops.push({ kind: 'gold', type: 'gold', amount: 100 });
    const wd = I.WEAPONS[w.id];
    if (wd && wd.ammo) drops.push({ kind: 'ammo', type: wd.ammo, amount: I.AMMO[wd.ammo] ? Math.max(6, Math.round((I.AMMO[wd.ammo].box || 30))) : 30 });
    G.Loot.spill(drops, d.x, d.y - 1.5, d.z, 2);
    for (let i = 0; i < 30; i++) G.FX.glow.spawn(d.x, d.y - 1.5, d.z, U.rand(-5, 5), U.rand(-2, 4), U.rand(-5, 5), 0.4, 0.6, 1, 0.3, 1, 6, 1);
    if (by && by.isPlayer) {
      G.HUD.notify('DRONE DE BUTIN ABATTU !', 2.2, 'upgrade');
      G.HUD.xpToast(150, 'Drone de butin');
      if (G.Match) G.Match.challengeEvent('drone');
    }
  }

  HS.update = function (dt) {
    const M = G.Match;
    if (!HS.announced && HS.spots.length && G.Game.state === 'bus') {
      HS.announced = true;
      setTimeout(() => { if (G.Game.state === 'bus' || G.Game.state === 'playing') G.HUD.notify('🔥 POINTS CHAUDS : ' + HS.spots.map((p) => p.name.toUpperCase()).join(' ET '), 4, 'upgrade'); }, 2500);
    }
    if (!HS.drones.length) return;
    const cam = G.camera.position;
    for (const d of HS.drones) {
      if (!d.active) continue;
      move(d, dt);
      const near = Math.abs(cam.x - d.x) < 160 && Math.abs(cam.z - d.z) < 160;
      if (near) {
        for (const r of d.m.userData.rotors) r.rotation.y += dt * 40;
        d.m.userData.light.visible = (G.Game.time % 1) < 0.5;
        d.hum -= dt;
        if (d.hum <= 0) { d.hum = 0.9; G.Audio.play('ufo', { pos: [d.x, d.y, d.z], vol: 0.35 }); }
      }
    }
    void M;
  };

  HS.mapIcons = function (ctx, toMap, big) {
    const s = big ? 1.4 : 1;
    for (const p of HS.spots) {
      const m = toMap(p.x, p.z);
      ctx.beginPath(); ctx.arc(m[0], m[1] - (big ? 18 : 0), 7 * s, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,110,20,0.9)'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffe070';
      ctx.beginPath(); const cx = m[0], cy = m[1] - (big ? 18 : 0);
      ctx.moveTo(cx, cy - 5 * s); ctx.quadraticCurveTo(cx + 5 * s, cy, cx + 2.5 * s, cy + 4 * s); ctx.lineTo(cx - 2.5 * s, cy + 4 * s); ctx.quadraticCurveTo(cx - 5 * s, cy, cx, cy - 5 * s); ctx.fill();
    }
    for (const d of HS.drones) {
      if (!d.active) continue;
      const m = toMap(d.x, d.z);
      ctx.fillStyle = '#000'; ctx.fillRect(m[0] - 3.5 * s, m[1] - 3.5 * s, 7 * s, 7 * s);
      ctx.fillStyle = '#4a8aff'; ctx.fillRect(m[0] - 2.5 * s, m[1] - 2.5 * s, 5 * s, 5 * s);
    }
  };
})();
