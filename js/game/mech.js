// ============================================================
//  MÉCHA DE COMBAT : robot géant piloté (façon B.R.U.T.E.)
//  ZQSD + souris, Espace : bond (atterrissage qui écrase tout),
//  clic : canon à dispersion, clic droit : salve de 10 missiles
// ============================================================
(function () {
  const U = G.U, I = G.Items, T = G.Terrain, P = G.Phys;
  const MC = { list: [] };
  G.Mechs = MC;

  function mechModel(color) {
    const V = G.Veg;
    const merged = (parts) => { const m = new THREE.Mesh(V.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; return m; };
    const box = (parts, sx, sy, sz, col, x, y, z, rx) => { const g = new THREE.BoxGeometry(sx, sy, sz); if (rx) g.rotateX(rx); g.translate(x, y, z); parts.push(V.colored(g, col, 0.03)); };
    const cyl = (parts, r, h, col, x, y, z, rx, rz) => { const g = new THREE.CylinderGeometry(r, r, h, 10); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); parts.push(V.colored(g, col, 0.03)); };
    const dark = 0x2e3238, metal = 0x6a7078, glass = 0x60c8ff, yel = 0xffc830;
    const g = new THREE.Group();
    // bassin + torse (pivote avec la visée)
    const body = new THREE.Group(); body.position.y = 3.3; g.add(body);
    const bp = [];
    box(bp, 2.4, 1.6, 2.2, color, 0, 0.9, 0);             // torse
    box(bp, 2.5, 0.35, 2.3, dark, 0, 0.05, 0);            // bassin
    box(bp, 1.6, 0.8, 0.12, glass, 0, 1.2, 1.12);         // cockpit vitré
    box(bp, 0.3, 0.3, 0.3, yel, 0.9, 1.75, 1.0); box(bp, 0.3, 0.3, 0.3, yel, -0.9, 1.75, 1.0); // phares
    // lance-missiles (épaule gauche) : 2 x 5 tubes
    box(bp, 0.9, 0.9, 1.3, metal, -1.55, 1.3, 0);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) cyl(bp, 0.1, 0.2, dark, -1.75 + j * 0.4, 1.0 + i * 0.15, 0.68, Math.PI / 2);
    // canon (bras droit)
    box(bp, 0.7, 0.7, 1.0, metal, 1.55, 0.9, 0.1);
    cyl(bp, 0.18, 1.8, dark, 1.55, 0.9, 1.3, Math.PI / 2); cyl(bp, 0.24, 0.3, metal, 1.55, 0.9, 2.2, Math.PI / 2);
    body.add(merged(bp));
    // jambes articulées (cuisse + tibia)
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.95, 3.3, 0); g.add(hip);
      const tp = []; box(tp, 0.55, 1.7, 0.6, color, 0, -0.85, 0); cyl(tp, 0.35, 0.7, dark, 0, 0, 0, 0, Math.PI / 2);
      hip.add(merged(tp));
      const knee = new THREE.Group(); knee.position.set(0, -1.7, 0); hip.add(knee);
      const sp = []; box(sp, 0.5, 1.5, 0.55, metal, 0, -0.75, 0); box(sp, 0.9, 0.2, 1.3, dark, 0, -1.55, 0.15); cyl(sp, 0.3, 0.6, dark, 0, 0, 0, 0, Math.PI / 2);
      knee.add(merged(sp));
      legs.push({ hip, knee, s });
    }
    g.userData = { body, legs };
    return g;
  }

  class Mech {
    constructor(x, z, yaw, color) {
      this.home = [x, z, yaw];
      this.label = 'Mécha de combat'; this.isMech = true;
      this.seat = [0, 3.6, 0.2];
      this.m = mechModel(color || U.pick([0x3a6ad8, 0xc83a2a, 0x3a8a4a]));
      G.scene.add(this.m);
      this.vel = new THREE.Vector3();
      this.reset();
    }
    reset() {
      const [x, z, yaw] = this.home;
      this.pos = new THREE.Vector3(x, T.height(x, z), z);
      this.yaw = yaw; this.speed = 0; this.vel.set(0, 0, 0); this.walk = 0; this.air = false;
      this.hp = 1000; this.dead = false; this.driver = null; this.fireT = 0; this.missileCd = 0; this.salvo = 0; this.salvoT = 0;
      this.m.visible = true; this.groundY = this.pos.y; this.sync();
    }
    sync() { this.m.position.copy(this.pos); this.m.rotation.y = this.yaw; }
    update(dt) {
      if (this.dead) return;
      const d = this.driver, In = G.Input;
      let fwd = 0, side = 0, jump = false, fire = false, missiles = false, tYaw = this.yaw;
      if (d) {
        fwd = d.control.mz; side = d.control.mx; fire = d.control.fire;
        if (d.isPlayer) {
          tYaw = d.camYaw + Math.PI;
          const ok = In.playing();
          jump = ok && In.hit('jump');
          missiles = ok && In.hit('aim');
        }
      }
      const dy = U.angleDiff(this.yaw, tYaw);
      this.yaw += U.clamp(dy, -2.2 * dt, 2.2 * dt);
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
      const v = this.vel;
      const tx = (fx * fwd + rx * side * 0.7) * 10, tz = (fz * fwd + rz * side * 0.7) * 10;
      const ctrl = this.air ? 0.8 : 4;
      v.x = U.damp(v.x, tx, ctrl, dt); v.z = U.damp(v.z, tz, ctrl, dt);
      if (jump && !this.air) { v.y = 17; this.air = true; G.Audio.play('launchpad', { pos: [this.pos.x, this.pos.y, this.pos.z] }); }
      v.y -= 26 * dt;
      const hs = Math.hypot(v.x, v.z);
      this.speed = hs;
      // on défonce les constructions et le décor léger en marchant
      if (hs > 1) {
        const h = P.raycast(this.pos.x, this.pos.y + 1.5, this.pos.z, v.x / hs, 0, v.z / hs, hs * dt + 2.2, { mask: 1 });
        if (h && !h.terrain) {
          if (h.ent && !h.ent.dead && !h.ent.invulnerable && (h.ent.type === 'build' || h.ent.type === 'furniture' || h.ent.type === 'prop' || h.ent.type === 'bush' || h.ent.type === 'tree' || h.ent.type === 'glass')) G.World.damage(h.ent, 400, { by: d, explosive: true });
          else { v.x *= -0.2; v.z *= -0.2; }
        }
      }
      this.pos.x += v.x * dt; this.pos.y += v.y * dt; this.pos.z += v.z * dt;
      const ng = Math.max(T.height(this.pos.x, this.pos.z), -1.5);
      const support = Math.max(ng, P.supportAt(this.pos.x, this.pos.z, this.pos.y + 1.2, 1.1, 1.0));
      if (this.pos.y <= support) {
        if (this.air && v.y < -8) this.stomp();
        this.pos.y = support; v.y = 0; this.air = false;
      }
      this.groundY = support;
      // marche : balancement des jambes
      this.walk += hs * dt * 0.9;
      const ud = this.m.userData;
      for (const L of ud.legs) {
        const ph = this.walk + (L.s > 0 ? Math.PI : 0);
        const amp = Math.min(1, hs / 8) * 0.55;
        L.hip.rotation.x = this.air ? -0.4 : Math.sin(ph) * amp;
        L.knee.rotation.x = this.air ? 0.8 : Math.max(0, -Math.cos(ph)) * amp * 1.4;
      }
      ud.body.position.y = 3.3 + (this.air ? 0 : Math.abs(Math.sin(this.walk)) * 0.12 * Math.min(1, hs / 5));
      if (!this.air && hs > 2 && Math.floor(this.walk / Math.PI) !== this.lastStep) { this.lastStep = Math.floor(this.walk / Math.PI); G.Audio.play('land', { pos: [this.pos.x, this.pos.y, this.pos.z], v: 1.3 }); if (d && d.isPlayer) G.Game.shakeAmt = Math.max(G.Game.shakeAmt || 0, 0.12); }
      // canon à dispersion
      this.fireT -= dt; this.missileCd -= dt;
      if (fire && this.fireT <= 0 && d) {
        this.fireT = 0.8;
        const gun = MC.gun || (MC.gun = I.make('mechgun', 2));
        const mz = new THREE.Vector3(this.pos.x + fx * 2.4 + Math.cos(this.yaw) * 1.55, this.pos.y + 4.2, this.pos.z + fz * 2.4 - Math.sin(this.yaw) * 1.55);
        if (d.isPlayer) { const r = d.aimRay(); G.Combat.fireWeapon(d, gun, mz, r.o, r.d, 0.09, mz); }
        G.Audio.play('pump', { pos: d.isPlayer ? null : [mz.x, mz.y, mz.z] });
        G.FX.muzzle(mz.x, mz.y, mz.z, true, d.isPlayer);
        if (d.isPlayer) { d.recoilP = (d.recoilP || 0) + 0.02; d.shake = Math.max(d.shake || 0, 0.25); }
      }
      // salve de missiles
      if (missiles && this.missileCd <= 0) { this.missileCd = 8; this.salvo = 10; this.salvoT = 0; if (d.isPlayer) G.HUD.notify('SALVE DE MISSILES !', 1); }
      if (this.salvo > 0 && d) {
        this.salvoT -= dt;
        if (this.salvoT <= 0) {
          this.salvoT = 0.09; this.salvo--;
          const rk = MC.rocket || (MC.rocket = I.make('rocket', 3));
          const sx = this.pos.x + Math.cos(this.yaw) * -1.6 + fx * 0.7, sy = this.pos.y + 4.6, sz = this.pos.z - Math.sin(this.yaw) * -1.6 + fz * 0.7;
          let dir;
          if (d.isPlayer) { const r = d.aimRay(); const h = G.Combat.trace(d, r.o.x, r.o.y, r.o.z, r.d.x, r.d.y, r.d.z, 300); const tp = h ? new THREE.Vector3(h.x, h.y, h.z) : r.o.clone().addScaledVector(r.d, 200); dir = tp.sub(new THREE.Vector3(sx, sy, sz)).normalize(); }
          else dir = new THREE.Vector3(fx, 0, fz);
          dir.x += U.rand(-0.05, 0.05); dir.y += U.rand(-0.03, 0.05); dir.z += U.rand(-0.05, 0.05); dir.normalize();
          G.Combat.spawnProjectile(d, rk, sx, sy, sz, dir.x, dir.y, dir.z);
          G.Audio.play('rocket', { pos: d.isPlayer ? null : [sx, sy, sz], vol: 0.6 });
        }
      }
      if (d && d.isPlayer) G.Audio.setLoop('engine', 0.25, 0, 0.35 + hs / 25);
      this.sync();
    }
    // atterrissage lourd : onde de choc
    stomp() {
      const d = this.driver, p = this.pos;
      G.FX.explosion(p.x, p.y + 0.5, p.z, 3);
      for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; G.FX.smoke.spawn(p.x + Math.cos(a) * 2, p.y + 0.3, p.z + Math.sin(a) * 2, Math.cos(a) * 8, 1, Math.sin(a) * 8, 0.75, 0.7, 0.65, 1.2, 1, 0.2, 1, 2); }
      G.Audio.play('explosion', { pos: [p.x, p.y, p.z], vol: 0.7 });
      G.Combat.explode(p.x, p.y + 0.8, p.z, 6, 40, 350, d, 'mech');
      if (d && d.isPlayer) G.Game.shakeAmt = Math.max(G.Game.shakeAmt || 0, 0.6);
    }
    crash() {
      if (this.dead) return;
      this.dead = true; this.m.visible = false;
      const d = this.driver;
      G.Combat.explode(this.pos.x, this.pos.y + 2, this.pos.z, 7, 60, 400, d, 'mech');
      G.FX.explosion(this.pos.x, this.pos.y + 2, this.pos.z, 6);
      if (d) { G.Extras.exitKart(d); if (d.isPlayer) G.HUD.notify('MÉCHA DÉTRUIT !', 2); }
    }
    hurt(n) { this.hp -= n; if (this.hp <= 0) this.crash(); }
  }

  MC.Mech = Mech;
  MC.init = function () {
    if (MC.list.length) return;
    const rng = U.RNG(8080);
    for (const [cx, cz] of [[-120, 180], [200, -60]]) {
      for (let k = 0; k < 80; k++) {
        const a = rng() * Math.PI * 2, r = 10 + rng() * 60;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, h = T.height(x, z);
        if (h < 1.5 || T.slope(x, z) > 0.2) continue;
        if (P.query(x - 4, h - 1, z - 4, x + 4, h + 6, z + 4, 1, []).length) continue;
        const m = new Mech(x, z, rng() * Math.PI * 2);
        MC.list.push(m); G.Extras.karts.push(m);
        break;
      }
    }
  };
  MC.update = function (dt) { for (const m of MC.list) if (!m.driver && !m.dead && (m.air || m.speed > 0.1)) m.update(dt); };
  MC.mapIcons = function (ctx, toMap, big) {
    const s = big ? 1.3 : 0.9;
    for (const m of MC.list) {
      if (m.dead || m.driver === G.player) continue;
      const p = toMap(m.pos.x, m.pos.z);
      ctx.fillStyle = '#ffc830'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.fillRect(p[0] - 4 * s, p[1] - 5 * s, 8 * s, 6 * s); ctx.strokeRect(p[0] - 4 * s, p[1] - 5 * s, 8 * s, 6 * s);
      ctx.beginPath(); ctx.moveTo(p[0] - 3 * s, p[1] + 1 * s); ctx.lineTo(p[0] - 4 * s, p[1] + 6 * s); ctx.moveTo(p[0] + 3 * s, p[1] + 1 * s); ctx.lineTo(p[0] + 4 * s, p[1] + 6 * s); ctx.stroke();
    }
  };
})();
