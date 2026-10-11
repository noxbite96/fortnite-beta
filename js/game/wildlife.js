// ============================================================
//  Faune : poules (à porter pour planer), meutes de loups et RAPTORS
// ============================================================
(function () {
  const U = G.U, T = G.Terrain, I = G.Items;
  const WL = { list: [] };
  G.Wild = WL;

  // ---------- modèles ----------
  function mat(c, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true }, o || {})); }
  let M = null;
  function mats() {
    if (M) return M;
    M = { rgreen: mat(0x8a7a4a), rdark: mat(0x4a3e26), rbelly: mat(0xd8c8a0), rstripe: mat(0xc8321a), white: mat(0xf4f0e8), red: mat(0xd83030), yellow: mat(0xf0b020), grey: mat(0x7a7a80), dark: mat(0x4a4a50), light: mat(0xb8b8bc), eye: new THREE.MeshBasicMaterial({ color: 0xffd040 }), black: mat(0x151515) };
    return M;
  }
  function box(g, sx, sy, sz, m, x, y, z) { const o = new THREE.Mesh(U.geo('BoxGeometry', sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; }
  function chickenModel() {
    const m = mats(), g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    box(body, 0.34, 0.3, 0.44, m.white, 0, 0.36, 0);
    box(body, 0.2, 0.22, 0.2, m.white, 0, 0.58, 0.2);
    box(body, 0.06, 0.08, 0.1, m.red, 0, 0.72, 0.2); box(body, 0.08, 0.05, 0.08, m.yellow, 0, 0.56, 0.33);
    box(body, 0.04, 0.06, 0.03, m.red, 0, 0.5, 0.32);
    box(body, 0.04, 0.04, 0.02, m.black, 0.08, 0.62, 0.3); box(body, 0.04, 0.04, 0.02, m.black, -0.08, 0.62, 0.3);
    const wl = box(body, 0.04, 0.2, 0.3, m.white, 0.19, 0.38, -0.02), wr = box(body, 0.04, 0.2, 0.3, m.white, -0.19, 0.38, -0.02);
    box(body, 0.24, 0.16, 0.08, m.white, 0, 0.46, -0.24);
    const ll = box(g, 0.04, 0.22, 0.04, m.yellow, 0.08, 0.11, 0), lr = box(g, 0.04, 0.22, 0.04, m.yellow, -0.08, 0.11, 0);
    g.userData = { body, wl, wr, ll, lr };
    return g;
  }
  function wolfModel() {
    const m = mats(), g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    box(body, 0.46, 0.46, 1.1, m.grey, 0, 0.72, 0);
    box(body, 0.48, 0.3, 0.5, m.light, 0, 0.62, 0.2);
    const head = new THREE.Group(); head.position.set(0, 0.95, 0.62); body.add(head);
    box(head, 0.36, 0.34, 0.36, m.grey, 0, 0, 0); box(head, 0.2, 0.18, 0.3, m.light, 0, -0.06, 0.26); box(head, 0.08, 0.06, 0.06, m.black, 0, -0.02, 0.42);
    box(head, 0.08, 0.16, 0.06, m.dark, 0.12, 0.22, -0.04); box(head, 0.08, 0.16, 0.06, m.dark, -0.12, 0.22, -0.04);
    const e1 = new THREE.Mesh(U.geo('BoxGeometry', 0.05, 0.04, 0.02), m.eye); e1.position.set(0.09, 0.06, 0.18); head.add(e1);
    const e2 = e1.clone(); e2.position.x = -0.09; head.add(e2);
    const tail = box(body, 0.12, 0.12, 0.5, m.dark, 0, 0.82, -0.72); tail.rotation.x = 0.5;
    const legs = [];
    for (const [x, z] of [[0.15, 0.38], [-0.15, 0.38], [0.15, -0.38], [-0.15, -0.38]]) { const p = new THREE.Group(); p.position.set(x, 0.55, z); g.add(p); box(p, 0.12, 0.55, 0.12, m.dark, 0, -0.27, 0); legs.push(p); }
    g.userData = { body, head, tail, legs };
    return g;
  }

  function raptorModel() {
    const m = mats(), g = new THREE.Group();
    const body = new THREE.Group(); body.position.y = 1.05; g.add(body);
    box(body, 0.5, 0.55, 1.1, m.rgreen, 0, 0, 0); box(body, 0.44, 0.2, 0.9, m.rbelly, 0, -0.26, 0.05);
    for (let i = 0; i < 3; i++) box(body, 0.52, 0.08, 0.1, m.rstripe, 0, 0.24, -0.3 + i * 0.28);
    // cou + tête
    const neck = box(body, 0.3, 0.55, 0.3, m.rgreen, 0, 0.35, 0.55); neck.rotation.x = 0.5;
    const head = new THREE.Group(); head.position.set(0, 0.68, 0.78); body.add(head);
    box(head, 0.34, 0.3, 0.56, m.rgreen, 0, 0, 0.12); box(head, 0.36, 0.06, 0.2, m.rstripe, 0, 0.16, 0.0);
    const jaw = new THREE.Group(); jaw.position.set(0, -0.12, 0.0); head.add(jaw);
    box(jaw, 0.28, 0.1, 0.5, m.rbelly, 0, -0.04, 0.2);
    for (let i = 0; i < 4; i++) { box(head, 0.03, 0.06, 0.03, m.white, 0.1, -0.16, 0.12 + i * 0.1); box(head, 0.03, 0.06, 0.03, m.white, -0.1, -0.16, 0.12 + i * 0.1); }
    const e1 = new THREE.Mesh(U.geo('BoxGeometry', 0.05, 0.05, 0.03), m.eye); e1.position.set(0.17, 0.06, 0.2); head.add(e1);
    const e2 = e1.clone(); e2.position.x = -0.17; head.add(e2);
    // queue
    const tail = new THREE.Group(); tail.position.set(0, 0.05, -0.55); body.add(tail);
    box(tail, 0.34, 0.34, 0.8, m.rgreen, 0, 0, -0.4); box(tail, 0.2, 0.2, 0.7, m.rdark, 0, 0.02, -1.1);
    // petits bras
    for (const s of [-1, 1]) { const a = box(body, 0.08, 0.28, 0.08, m.rdark, s * 0.2, -0.15, 0.5); a.rotation.x = -0.6; }
    // pattes
    const legs = [];
    for (const s of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(s * 0.2, 0.95, 0); g.add(p);
      box(p, 0.18, 0.5, 0.26, m.rgreen, 0, -0.2, 0.05); box(p, 0.12, 0.5, 0.12, m.rdark, 0, -0.62, -0.08); box(p, 0.16, 0.08, 0.3, m.rdark, 0, -0.9, 0.04);
      legs.push(p);
    }
    g.userData = { body, head, tail, legs, jaw, bodyY: 1.05 };
    return g;
  }
  const PRED = { wolf: { name: 'Loup', hp: 70, aggro: 24, spd: 8.2, bite: 8, r: 0.6, hh: 0.8, walk: 2.2 }, raptor: { name: 'Raptor', hp: 110, aggro: 30, spd: 10.5, bite: 14, r: 0.75, hh: 1.05, walk: 2.8 } };

  // ---------- créatures ----------
  function mk(type, x, z) {
    const m = type === 'wolf' ? wolfModel() : type === 'raptor' ? raptorModel() : chickenModel();
    G.scene.add(m);
    const pd = PRED[type];
    const c = { type, isCreature: true, pred: pd || null, name: pd ? pd.name : 'Poule', m, pos: new THREE.Vector3(x, T.height(x, z), z), home: [x, z], vel: new THREE.Vector3(), yaw: Math.random() * 6.28,
      health: pd ? pd.hp : 20, shield: 0, dead: false, invulnerable: false, team: -1, stats: { kills: 0, damage: 0 }, ph: Math.random() * 6, t: 0, state: 'idle', wanderT: 0, biteT: 0,
      hitbox: { cx: 0, cy: 0, cz: 0, hx: 0, hy: 0, hz: 0, minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 } };
    c.hittable = () => !c.dead && !c.carried;
    c.onDamaged = (dmg, o) => { c.hurtT = 0.3; if (c.pred && o.by) { c.target = o.by; c.state = 'chase'; } else if (c.type === 'chicken') c.state = 'flee'; G.Audio.play(c.type === 'raptor' ? 'raptor' : c.type === 'wolf' ? 'hurt' : 'bounce', { pos: [c.pos.x, c.pos.y + 0.5, c.pos.z] }); };
    c.die = (killer) => {
      c.dead = true; c.m.visible = false;
      G.FX.eliminate(c.pos.x, c.pos.y + 0.4, c.pos.z, type === 'wolf' ? 0x8a8a90 : type === 'raptor' ? 0x8a7a4a : 0xf4f0e8);
      G.Audio.play('eliminated_fx', { pos: [c.pos.x, c.pos.y + 0.5, c.pos.z] });
      G.Loot.spill([{ kind: 'item', item: I.make('meat', null, type === 'raptor' ? 3 : type === 'wolf' ? 2 : 1) }].concat(type === 'raptor' ? [{ kind: 'gold', type: 'gold', amount: 40 }] : []), c.pos.x, c.pos.y + 0.5, c.pos.z, 0.5);
      if (killer && killer.isPlayer && type === 'wolf') { G.HUD.xpToast(75, 'Loup'); if (G.Match) G.Match.challengeEvent('wolf'); }
      if (killer && killer.isPlayer && type === 'raptor') { G.HUD.xpToast(150, 'Raptor'); if (G.Match) G.Match.challengeEvent('raptor'); }
    };
    WL.list.push(c);
    return c;
  }
  WL.spawn = function () {
    for (const c of WL.list) G.scene.remove(c.m);
    WL.list = [];
    // poules à la ferme
    const f = G.MapData.poiById('ferme');
    for (let i = 0; i < 9; i++) { const q = T.randomLandPoint(Math.random, f.x + U.rand(-30, 30), f.z + U.rand(-30, 30), 10, 1); mk('chicken', q[0], q[1]); }
    // meutes de loups en forêt, loin des lieux nommés
    let packs = 0;
    for (let k = 0; k < 200 && packs < 4; k++) {
      const x = U.rand(-400, 400), z = U.rand(-400, 400);
      if (T.height(x, z) < 3 || T.forest(x, z) < 0.45 || G.Veg.inPOI(x, z, 1.4)) continue;
      packs++;
      const n = U.randInt(2, 3);
      for (let i = 0; i < n; i++) mk('wolf', x + U.rand(-4, 4), z + U.rand(-4, 4));
    }
    // 2 groupes de RAPTORS : l'un garde le Temple Perdu, l'autre rôde dans un coin sauvage
    let rp = 0;
    const tp = G.MapData.poiById('temple');
    if (tp) { rp++; for (let i = 0; i < 3; i++) { const a = i * 2.1; mk('raptor', tp.x + Math.cos(a) * 16, tp.z + Math.sin(a) * 16); } }
    for (let k = 0; k < 300 && rp < 2; k++) {
      const x = U.rand(-480, 480), z = U.rand(-480, 480);
      if (T.height(x, z) < 3 || T.forest(x, z) < 0.3 || G.Veg.inPOI(x, z, 1.6) || WL.list.some((c) => c.type === 'raptor' && Math.hypot(c.pos.x - x, c.pos.z - z) < 200)) continue;
      rp++;
      for (let i = 0; i < 3; i++) mk('raptor', x + U.rand(-5, 5), z + U.rand(-5, 5));
    }
  };

  // Rayon contre les créatures (utilisé par les tirs)
  WL.ray = function (ox, oy, oz, dx, dy, dz, maxT) {
    let best = maxT, hit = null;
    for (const c of WL.list) {
      if (c.dead || c.carried) continue;
      const r = c.pred ? c.pred.r : 0.32;
      const cx = c.hitbox.cx - ox, cy = c.hitbox.cy - oy, cz = c.hitbox.cz - oz;
      const tc = cx * dx + cy * dy + cz * dz;
      if (tc < 0 || tc > best) continue;
      const px = cx - dx * tc, py = cy - dy * tc, pz = cz - dz * tc;
      if (px * px + py * py + pz * pz < r * r) { best = tc; hit = c; }
    }
    return hit ? { t: best, actor: hit, head: false } : null;
  };

  // ---------- mise à jour ----------
  const S = Math.sin;
  WL.update = function (dt) {
    const pl = G.player, cam = G.camera.position;
    for (const c of WL.list) {
      if (c.dead) continue;
      if (c.carried) continue;
      const far = Math.hypot(c.pos.x - cam.x, c.pos.z - cam.z) > 160;
      c.m.visible = !far;
      if (far) continue;
      c.t += dt; c.hurtT = Math.max(0, (c.hurtT || 0) - dt);
      const dp = pl && !pl.dead && pl.hittable() ? Math.hypot(pl.pos.x - c.pos.x, pl.pos.z - c.pos.z) : 1e9;
      let speed = 0, tx = null, tz = null;
      if (c.type === 'chicken') {
        if (dp < 4.5 || c.state === 'flee' && dp < 10) { c.state = 'flee'; tx = c.pos.x + (c.pos.x - pl.pos.x); tz = c.pos.z + (c.pos.z - pl.pos.z); speed = 4.5; }
        else c.state = 'idle';
        if (Math.random() < dt * 0.15 && dp < 40) G.Audio.play('bounce', { pos: [c.pos.x, c.pos.y + 0.5, c.pos.z], vol: 0.3 });
      } else {
        // loup / raptor : chasse le joueur proche, mord au contact
        const P = c.pred;
        const tgt = c.target && !c.target.dead ? c.target : null;
        if (!tgt && dp < P.aggro && pl.state === 'ground') { c.target = pl; c.state = 'chase'; if (!c.howled) { c.howled = true; G.Audio.play(c.type === 'raptor' ? 'raptor' : 'storm_warning', { pos: [c.pos.x, c.pos.y + 1, c.pos.z], vol: c.type === 'raptor' ? 0.8 : 0.4 }); if (c.type === 'raptor') G.HUD.notify('🦖 DES RAPTORS !', 1.8); } }
        const t = c.target && !c.target.dead ? c.target : null;
        if (t && Math.hypot(t.pos.x - c.pos.x, t.pos.z - c.pos.z) > 45) { c.target = null; c.state = 'idle'; }
        if (t) {
          const d = Math.hypot(t.pos.x - c.pos.x, t.pos.z - c.pos.z);
          tx = t.pos.x; tz = t.pos.z; speed = d > 1.6 ? P.spd : 0;
          c.biteT -= dt;
          if (d < (c.type === 'raptor' ? 2.3 : 1.9) && Math.abs(t.pos.y - c.pos.y) < 1.6 && c.biteT <= 0 && t.hittable && t.hittable()) {
            c.biteT = U.rand(1.4, 1.8);
            G.Combat.damageActor(t, P.bite, { by: null, weapon: c.type, point: [t.pos.x, t.pos.y + 1, t.pos.z] });
            if (c.m.userData.jaw) c.m.userData.jaw.rotation.x = 0.6;
            G.Audio.play('swing', { pos: [c.pos.x, c.pos.y + 0.8, c.pos.z] });
            c.m.userData.head.rotation.x = -0.4;
          }
        }
      }
      if (tx == null) {
        // errance autour du point d'origine
        c.wanderT -= dt;
        if (c.wanderT <= 0) { c.wanderT = U.rand(2, 6); c.wander = Math.random() < 0.5 ? null : [c.home[0] + U.rand(-10, 10), c.home[1] + U.rand(-10, 10)]; }
        if (c.wander) { tx = c.wander[0]; tz = c.wander[1]; speed = c.pred ? c.pred.walk : 1.2; if (Math.hypot(tx - c.pos.x, tz - c.pos.z) < 1) c.wander = null; }
      }
      if (tx != null && speed > 0) {
        const want = Math.atan2(tx - c.pos.x, tz - c.pos.z);
        c.yaw = U.dampAngle(c.yaw, want, 6, dt);
        const nx = c.pos.x + Math.sin(c.yaw) * speed * dt, nz = c.pos.z + Math.cos(c.yaw) * speed * dt;
        if (T.height(nx, nz) > 0.4 && G.Phys.freeAt(nx, T.height(nx, nz) + 0.1, nz, 0.3, 0.8)) { c.pos.x = nx; c.pos.z = nz; }
        else c.wanderT = 0;
      }
      c.pos.y = U.damp(c.pos.y, Math.max(T.height(c.pos.x, c.pos.z), 0), 12, dt);
      // animation
      const u = c.m.userData, moving = tx != null && speed > 0;
      c.ph += dt * (moving ? speed * 2.2 : 1);
      c.m.position.copy(c.pos); c.m.rotation.y = c.yaw;
      if (c.type === 'chicken') {
        u.body.position.y = moving ? Math.abs(S(c.ph)) * 0.05 : 0;
        u.body.rotation.x = moving ? 0.2 : S(c.t * 3) * 0.1 + (Math.random() < 0.01 ? 0.5 : 0);
        u.ll.rotation.x = moving ? S(c.ph) * 0.8 : 0; u.lr.rotation.x = moving ? -S(c.ph) * 0.8 : 0;
        const flap = c.state === 'flee' ? S(c.t * 30) * 0.8 : 0;
        u.wl.rotation.z = flap; u.wr.rotation.z = -flap;
      } else {
        u.legs.forEach((l, i) => { l.rotation.x = moving ? S(c.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.7 : 0; });
        u.tail.rotation.y = S(c.t * 4) * 0.3;
        if (u.jaw) u.jaw.rotation.x = U.damp(u.jaw.rotation.x, c.state === 'chase' ? 0.15 + S(c.t * 7) * 0.1 : 0, 6, dt);
        if (c.type === 'raptor') u.body.rotation.x = moving && speed > 5 ? 0.18 : 0;
        u.head.rotation.x = U.damp(u.head.rotation.x, c.state === 'chase' ? 0.15 : S(c.t) * 0.1, 8, dt);
        u.body.position.y = (u.bodyY || 0) + (moving ? Math.abs(S(c.ph)) * 0.06 : 0);
      }
      if (c.hurtT > 0) c.m.position.y += 0.05;
      const h = c.hitbox, hh = c.pred ? c.pred.hh : 0.35;
      h.cx = c.pos.x; h.cy = c.pos.y + hh; h.cz = c.pos.z; h.hx = c.pos.x; h.hy = c.pos.y + hh; h.hz = c.pos.z;
    }
    // poule portée par le joueur
    if (pl && pl.chicken) {
      const ch = pl.chicken;
      pl.chickenT -= dt;
      const hp = pl.char.J.head.getWorldPosition(U.v1);
      ch.m.position.set(hp.x, hp.y + 0.35, hp.z); ch.m.rotation.y = pl.yaw + Math.PI;
      const f = S(G.Game.time * (pl.grounded ? 6 : 30)) * (pl.grounded ? 0.2 : 0.9);
      ch.m.userData.wl.rotation.z = f; ch.m.userData.wr.rotation.z = -f;
      if (pl.chickenT <= 0 || pl.dead || pl.state !== 'ground') WL.drop(pl);
    }
  };

  // ---------- porter une poule ----------
  WL.interactables = function (out) {
    const pl = G.player; if (!pl || pl.chicken || pl.state !== 'ground') return;
    for (const c of WL.list) if (c.type === 'chicken' && !c.dead && !c.carried && Math.abs(c.pos.x - pl.pos.x) < 3 && Math.abs(c.pos.z - pl.pos.z) < 3) out.push({ kind: 'chicken', obj: c, x: c.pos.x, y: c.pos.y + 0.4, z: c.pos.z, name: 'Poule', action: 'Porter (planez en sautant !)', range: 2.2 });
  };
  WL.pick = function (a, c) {
    if (a.chicken || c.carried) return;
    c.carried = true; a.chicken = c; a.chickenT = 14;
    a.sel = -1; a.refreshHeld(); a.buildMode = false;
    G.Audio.play('bounce', { pos: [c.pos.x, c.pos.y, c.pos.z] });
    if (a.isPlayer) { G.HUD.notify('Sautez pour battre des ailes et planer !', 2.5); if (G.Match) G.Match.challengeEvent('chicken'); }
  };
  WL.drop = function (a) {
    const c = a.chicken; if (!c) return;
    a.chicken = null; c.carried = false; c.state = 'flee';
    c.pos.set(a.pos.x + U.rand(-1, 1), T.height(a.pos.x, a.pos.z), a.pos.z + U.rand(-1, 1));
  };
  WL.reset = function () { if (G.player && G.player.chicken) WL.drop(G.player); WL.spawn(); };
})();
