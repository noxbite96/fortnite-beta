// ============================================================
//  REQUINS : 6 requins patrouillent en mer autour de l'île. On voit
//  leur aileron fendre l'eau ; ils foncent sur les nageurs et mordent.
//  On peut leur tirer dessus (aileron) : ils lâchent des poissons.
// ============================================================
(function () {
  const U = G.U;
  const SH = { list: [] };
  G.Sharks = SH;

  let tpl = null;
  function model() {
    if (!tpl) {
      const V = G.Veg, P = [];
      const top = 0x5a6a7a, belly = 0xe8ecf0;
      P.push(V.colored(new THREE.SphereGeometry(1, 14, 10).scale(0.62, 0.55, 2.3), top, 0));
      P.push(V.colored(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(0.6, 0.5, 2.2).translate(0, -0.05, 0.05), belly, 0));
      // museau
      P.push(V.colored(new THREE.SphereGeometry(0.45, 10, 8).scale(0.9, 0.7, 1.4).translate(0, -0.02, 2.05), top, 0));
      // aileron dorsal
      P.push(V.colored(new THREE.ConeGeometry(0.6, 1.6, 4).scale(0.16, 1, 1).rotateX(-0.35).translate(0, 1.05, -0.2), 0x44525f, 0));
      // nageoires pectorales
      for (const s of [-1, 1]) P.push(V.colored(new THREE.ConeGeometry(0.28, 1.1, 4).scale(1, 1, 0.2).rotateZ(s * 1.9).rotateY(s * 0.4).translate(s * 0.8, -0.3, 0.6), 0x4a5a6a, 0));
      // yeux + bouche
      for (const s of [-1, 1]) P.push(V.colored(new THREE.SphereGeometry(0.07, 6, 5).translate(s * 0.36, 0.1, 1.95), 0x0a0a0a, 0));
      P.push(V.colored(new THREE.BoxGeometry(0.5, 0.05, 0.3).translate(0, -0.3, 1.9), 0x3a1010, 0));
      for (let i = -2; i <= 2; i++) P.push(V.colored(new THREE.ConeGeometry(0.03, 0.08, 3).rotateX(Math.PI).translate(i * 0.09, -0.24, 2.02), 0xffffff, 0));
      const tail = [];
      tail.push(V.colored(new THREE.ConeGeometry(0.35, 1.4, 6).rotateX(-Math.PI / 2).translate(0, 0, -0.7), top, 0));
      tail.push(V.colored(new THREE.ConeGeometry(0.4, 1.3, 4).scale(0.15, 1, 1).rotateX(0.6).translate(0, 0.55, -1.45), 0x4a5a6a, 0));
      tail.push(V.colored(new THREE.ConeGeometry(0.3, 0.9, 4).scale(0.15, 1, 1).rotateX(Math.PI - 0.7).translate(0, -0.4, -1.35), 0x4a5a6a, 0));
      tpl = { body: V.merge(P), tail: V.merge(tail), mat: new THREE.MeshLambertMaterial({ vertexColors: true }) };
    }
    const g = new THREE.Group();
    const inner = new THREE.Group(); g.add(inner);
    const b = new THREE.Mesh(tpl.body, tpl.mat); b.castShadow = true; inner.add(b);
    const tail = new THREE.Group(); tail.position.z = -1.9; inner.add(tail);
    tail.add(new THREE.Mesh(tpl.tail, tpl.mat));
    g.userData = { inner, tail };
    return g;
  }

  // Points d'eau profonde autour de l'île
  function deepSpot() {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * 6.28, r = U.rand(560, 760);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (G.Terrain.height(x, z) < -4.5) return [x, z];
    }
    return [700, 0];
  }
  const deep = (x, z) => G.Terrain.height(x, z) < -3.2;

  function make() {
    const W = G.World, P = G.Phys;
    const m = model(); G.scene.add(m);
    const s = { m, x: 0, y: -1.2, z: 0, yaw: 0, spd: 4, state: 'roam', tgt: null, prey: null, biteCd: 0, lookT: 0, t: Math.random() * 10, deadT: 0, splashT: 0 };
    const e = W.ent('prop', 'water', 200, { yield: 0, noPickaxe: true });
    e.moving = true; e.shark = s; s.e = e;
    s.col = P.box(-1, -200, -1, 1, -199, 1, e, P.BULLET);
    W.addCol(e, s.col);
    e.onHit = (dmg, opts) => {
      if (opts && opts.by && opts.by.isPlayer && !opts.pickaxe) G.FX.damageNumber(s.x, s.y + 1, s.z, dmg, 'build');
      // blessé : il fonce sur le tireur s'il est dans l'eau, sinon il fuit
      if (opts && opts.by && opts.by.swimming) { s.state = 'chase'; s.prey = opts.by; }
      else s.fleeT = 4;
    };
    e.onDestroy = (opts) => kill(s, opts && opts.by);
    SH.list.push(s);
    return s;
  }
  function placeCol(s) {
    const c = s.col, e = s.e, P = G.Phys;
    P.remove(c);
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
    const cx = s.x + fx * 0.3, cz = s.z + fz * 0.3;
    c.minX = cx - 1.2; c.maxX = cx + 1.2; c.minZ = cz - 1.2; c.maxZ = cz + 1.2; c.minY = s.y - 0.6; c.maxY = s.y + 1.6;
    e.minX = c.minX; e.maxX = c.maxX; e.minY = c.minY; e.maxY = c.maxY; e.minZ = c.minZ; e.maxZ = c.maxZ;
    P.add(c);
  }

  SH.init = function () {
    if (!SH.list.length) for (let i = 0; i < 6; i++) make();
    SH.reset();
  };
  SH.reset = function () {
    for (const s of SH.list) {
      const p = deepSpot();
      s.x = p[0]; s.z = p[1]; s.y = -1.2; s.yaw = Math.random() * 6.28; s.state = 'roam'; s.tgt = deepSpot(); s.prey = null; s.fleeT = 0;
      s.e.dead = false; s.e.hp = s.e.maxHp; s.m.visible = true; s.deadT = 0;
      s.m.userData.inner.rotation.set(0, 0, 0);
      placeCol(s);
    }
  };

  function kill(s, by) {
    s.state = 'dead'; s.deadT = 0;
    G.FX.waterSplash(s.x, s.z, true);
    G.Loot.spill([{ kind: 'item', item: G.Items.make('flopper', null, 2) }], s.x, 0.4, s.z, 1.5);
    if (by && by.isPlayer) { G.HUD.xpToast(100, 'Requin'); G.HUD.notify('REQUIN VAINCU !', 1.8); if (G.Match) G.Match.challengeEvent('shark'); }
  }

  SH.update = function (dt) {
    if (!SH.list.length) return;
    const cam = G.camera.position;
    const now = G.Game.time;
    for (const s of SH.list) {
      const ud = s.m.userData;
      s.t += dt;
      if (s.state === 'dead') {
        // se retourne et coule
        s.deadT += dt;
        ud.inner.rotation.z = Math.min(Math.PI, s.deadT * 2);
        s.y -= dt * 0.8;
        s.m.position.set(s.x, s.y, s.z);
        if (s.deadT > 4) { s.m.visible = false; if (s.deadT > 60 && G.Game.state === 'playing') { const p = deepSpot(); s.x = p[0]; s.z = p[1]; s.y = -1.2; s.state = 'roam'; s.e.dead = false; s.e.hp = s.e.maxHp; s.m.visible = true; ud.inner.rotation.set(0, 0, 0); } }
        continue;
      }
      // recherche de proies (nageurs)
      s.lookT -= dt;
      if (s.lookT <= 0) {
        s.lookT = 0.5;
        if (s.state !== 'chase' || !s.prey || s.prey.dead || !s.prey.swimming) {
          s.state = 'roam'; s.prey = null;
          let best = 32, bp = null;
          for (const a of G.Combat.actors) {
            if (a.dead || !a.swimming || a.vehicle || a.npc) continue;
            const d = Math.hypot(a.pos.x - s.x, a.pos.z - s.z);
            if (d < best) { best = d; bp = a; }
          }
          if (bp && !(s.fleeT > 0)) { s.state = 'chase'; s.prey = bp; if (bp.isPlayer && !s.warned) { s.warned = true; G.HUD.notify('🦈 UN REQUIN ARRIVE !', 2); } }
        }
      }
      if (s.fleeT > 0) s.fleeT -= dt;
      // thème « dents de la mer » quand un requin fonce sur le joueur
      if (s.state === 'chase' && s.prey && s.prey.isPlayer) {
        const dd = Math.hypot(s.prey.pos.x - s.x, s.prey.pos.z - s.z);
        s.jawsT = (s.jawsT || 0) - dt;
        if (s.jawsT <= 0 && dd < 40) { s.jawsT = 0.55 + Math.min(1, dd / 40) * 0.6; G.Audio.play('jaws'); }
      }
      let tx, tz, spd;
      if (s.state === 'chase' && s.prey) { tx = s.prey.pos.x; tz = s.prey.pos.z; spd = 8.5; }
      else {
        if (!s.tgt || Math.hypot(s.tgt[0] - s.x, s.tgt[1] - s.z) < 8) s.tgt = deepSpot();
        tx = s.tgt[0]; tz = s.tgt[1]; spd = s.fleeT > 0 ? 10 : 4;
        if (s.fleeT > 0) { tx = s.x + (s.x - cam.x); tz = s.z + (s.z - cam.z); }
      }
      // cap
      const want = Math.atan2(tx - s.x, tz - s.z);
      let da = want - s.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
      s.yaw += U.clamp(da, -2.2 * dt, 2.2 * dt);
      s.spd = U.damp(s.spd, spd, 1.5, dt);
      let nx = s.x + Math.sin(s.yaw) * s.spd * dt, nz = s.z + Math.cos(s.yaw) * s.spd * dt;
      // ne s'échoue jamais : reste en eau profonde (sauf pour mordre un nageur tout proche)
      if (!deep(nx, nz) && !(s.state === 'chase' && G.Terrain.height(nx, nz) < -1.4)) { s.yaw += Math.PI * 0.6 * dt * 3; nx = s.x; nz = s.z; if (s.state === 'roam') s.tgt = deepSpot(); }
      s.x = nx; s.z = nz;
      // morsure
      s.biteCd -= dt;
      let lunge = 0;
      if (s.state === 'chase' && s.prey) {
        const d = Math.hypot(s.prey.pos.x - s.x, s.prey.pos.z - s.z);
        if (d < 2.6 && s.biteCd <= 0) {
          s.biteCd = 1.4; s.biteT = 0.45;
          G.Combat.damageActor(s.prey, 22, { by: null, weapon: 'shark', point: [s.prey.pos.x, s.prey.pos.y + 0.5, s.prey.pos.z] });
          G.FX.waterSplash(s.prey.pos.x, s.prey.pos.z, true);
          G.Audio.play('splash', { pos: [s.x, 0, s.z] });
          G.Audio.play('boar', { pos: [s.x, 0, s.z], vol: 0.6 });
        }
      }
      if (s.biteT > 0) { s.biteT -= dt; lunge = Math.sin(Math.max(0, s.biteT) / 0.45 * Math.PI); }
      s.y = -1.05 + Math.sin(s.t * 1.3) * 0.08 + lunge * 1.0;
      if (Math.abs(cam.x - s.x) < 260 && Math.abs(cam.z - s.z) < 260) {
        s.m.position.set(s.x, s.y, s.z);
        s.m.rotation.y = s.yaw;
        ud.inner.rotation.x = -lunge * 0.5;
        ud.inner.rotation.z = Math.sin(s.t * 2) * 0.05;
        ud.tail.rotation.y = Math.sin(s.t * (s.spd > 6 ? 9 : 4)) * 0.45;
        // sillage de l'aileron
        s.splashT -= dt;
        if (s.splashT <= 0 && s.spd > 2) { s.splashT = s.spd > 6 ? 0.08 : 0.2; G.FX.smoke.spawn(s.x + Math.sin(s.yaw) * 0.2, 0.08, s.z + Math.cos(s.yaw) * 0.2, U.rand(-0.5, 0.5), 0.3, U.rand(-0.5, 0.5), 0.95, 0.98, 1, 0.5, 0.7, 0, 1.5, 1.5); }
      }
      placeCol(s);
    }
    void now;
  };

  SH.mapIcons = function (ctx, toMap, big) {
    if (!big) return;
    const pl = G.player; if (!pl) return;
    // seulement les requins proches du joueur (on voit leur aileron)
    for (const s of SH.list) {
      if (s.state === 'dead' || Math.hypot(s.x - pl.pos.x, s.z - pl.pos.z) > 120) continue;
      const m = toMap(s.x, s.z);
      ctx.fillStyle = '#5a6a7a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(m[0] - 6, m[1] + 4); ctx.lineTo(m[0] + 1, m[1] - 7); ctx.lineTo(m[0] + 6, m[1] + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  };
})();
