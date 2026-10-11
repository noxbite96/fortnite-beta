// ============================================================
//  SANGLIERS : ils errent dans les forêts ; E pour les chevaucher.
//  ZQSD + souris, Espace : saut, Maj : charge qui renverse les ennemis
// ============================================================
(function () {
  const U = G.U, T = G.Terrain, P = G.Phys;
  const BO = { list: [] };
  G.Boars = BO;

  let geos = null;
  function boarModel() {
    const V = G.Veg;
    if (!geos) {
      const bp = [];
      const box = (sx, sy, sz, col, x, y, z, rx) => { const g = new THREE.BoxGeometry(sx, sy, sz); if (rx) g.rotateX(rx); g.translate(x, y, z); bp.push(V.colored(g, col, 0.08)); };
      const brown = 0x6a4a32, dark = 0x3a2a1e, pink = 0xd89a8a, tusk = 0xf0ead8;
      box(0.9, 0.75, 1.5, brown, 0, 0.85, 0);           // corps
      box(0.95, 0.35, 0.9, dark, 0, 1.3, -0.1);         // crinière
      box(0.62, 0.55, 0.6, brown, 0, 0.9, 0.95);        // tête
      box(0.4, 0.3, 0.3, pink, 0, 0.8, 1.35);           // groin
      box(0.06, 0.25, 0.06, tusk, 0.18, 0.95, 1.35, -0.5); box(0.06, 0.25, 0.06, tusk, -0.18, 0.95, 1.35, -0.5); // défenses
      box(0.12, 0.2, 0.08, dark, 0.22, 1.25, 0.8); box(0.12, 0.2, 0.08, dark, -0.22, 1.25, 0.8);           // oreilles
      box(0.1, 0.1, 0.05, 0x101010, 0.2, 1.02, 1.26); box(0.1, 0.1, 0.05, 0x101010, -0.2, 1.02, 1.26);     // yeux
      box(0.08, 0.3, 0.08, dark, 0, 0.95, -0.85, 0.6);  // queue
      box(0.95, 0.12, 0.7, 0x8a2a2a, 0, 1.28, 0.05);    // selle
      const legG = new THREE.BoxGeometry(0.2, 0.6, 0.22); legG.translate(0, -0.3, 0);
      geos = { body: V.merge(bp), leg: V.colored(legG, dark, 0), mat: new THREE.MeshLambertMaterial({ vertexColors: true }) };
    }
    const g = new THREE.Group();
    const b = new THREE.Mesh(geos.body, geos.mat); b.castShadow = true; g.add(b);
    const legs = [];
    for (const [x, z] of [[0.3, 0.5], [-0.3, 0.5], [0.3, -0.5], [-0.3, -0.5]]) { const l = new THREE.Mesh(geos.leg, geos.mat); l.position.set(x, 0.6, z); l.castShadow = true; g.add(l); legs.push(l); }
    g.userData = { legs, body: b };
    return g;
  }

  class Boar {
    constructor(x, z) {
      this.home = [x, z];
      this.label = 'Sanglier'; this.isBoar = true;
      this.seat = [0, 0.72, -0.05];
      this.m = boarModel(); G.scene.add(this.m);
      this.vel = new THREE.Vector3();
      this.reset();
    }
    reset() {
      const [x, z] = this.home;
      this.pos = new THREE.Vector3(x, T.height(x, z), z);
      this.yaw = Math.random() * 6.28; this.speed = 0; this.vel.set(0, 0, 0); this.air = false; this.gait = 0;
      this.hp = 250; this.dead = false; this.driver = null; this.wanderT = 0; this.wander = null; this.chargeHit = new Set();
      this.m.visible = true; this.groundY = this.pos.y; this.sync();
    }
    sync() { this.m.position.copy(this.pos); this.m.rotation.y = this.yaw; }
    update(dt) {
      if (this.dead) return;
      const d = this.driver, In = G.Input;
      let fwd = 0, side = 0, jump = false, charge = false, tYaw = this.yaw;
      if (d) {
        fwd = d.control.mz; side = d.control.mx; charge = d.control.sprint && fwd > 0;
        if (d.isPlayer) { tYaw = d.camYaw + Math.PI; jump = In.playing() && In.hit('jump'); }
      } else {
        // errance tranquille
        this.wanderT -= dt;
        if (this.wanderT <= 0) { this.wanderT = U.rand(3, 8); this.wander = Math.random() < 0.6 ? [this.home[0] + U.rand(-18, 18), this.home[1] + U.rand(-18, 18)] : null; }
        if (this.wander) { const dx = this.wander[0] - this.pos.x, dz = this.wander[1] - this.pos.z; if (Math.hypot(dx, dz) > 1.5) { tYaw = Math.atan2(dx, dz); fwd = 0.35; } else this.wander = null; }
      }
      const dy = U.angleDiff(this.yaw, tYaw);
      this.yaw += U.clamp(dy, -3 * dt, 3 * dt);
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
      const sp = charge ? 21 : 13;
      const v = this.vel;
      const tx = (fx * fwd + rx * side * 0.5) * sp, tz = (fz * fwd + rz * side * 0.5) * sp;
      const k = this.air ? 0.6 : 5;
      v.x = U.damp(v.x, tx, k, dt); v.z = U.damp(v.z, tz, k, dt);
      if (jump && !this.air) { v.y = 10; this.air = true; G.Audio.play('jump', { pos: [this.pos.x, this.pos.y, this.pos.z] }); }
      v.y -= 25 * dt;
      const hs = Math.hypot(v.x, v.z); this.speed = hs;
      if (hs > 1) {
        const h = P.raycast(this.pos.x, this.pos.y + 0.8, this.pos.z, v.x / hs, 0, v.z / hs, hs * dt + 1.2, { mask: 1 });
        if (h && !h.terrain) {
          if (charge && hs > 15 && h.ent && !h.ent.dead && !h.ent.invulnerable && (h.ent.type === 'build' || h.ent.type === 'furniture' || h.ent.type === 'bush' || h.ent.type === 'prop')) G.World.damage(h.ent, 150, { by: d });
          v.x *= -0.2; v.z *= -0.2;
        }
      }
      this.pos.x += v.x * dt; this.pos.y += v.y * dt; this.pos.z += v.z * dt;
      const ng = T.height(this.pos.x, this.pos.z);
      const support = Math.max(ng, P.supportAt(this.pos.x, this.pos.z, this.pos.y + 0.8, 0.5, 0.9));
      if (ng < -1.2) { v.x *= Math.pow(0.2, dt); v.z *= Math.pow(0.2, dt); } // dans l'eau
      if (this.pos.y <= Math.max(support, -1.2)) { this.pos.y = Math.max(support, -1.2); v.y = 0; this.air = false; }
      this.groundY = support;
      // galop
      this.gait += hs * dt * 1.6;
      const ud = this.m.userData, amp = Math.min(1, hs / 10) * 0.7;
      ud.legs.forEach((l, i) => { l.rotation.x = this.air ? (i < 2 ? -0.6 : 0.6) : Math.sin(this.gait + (i === 0 || i === 3 ? 0 : Math.PI)) * amp; });
      ud.body.position.y = this.air ? 0 : Math.abs(Math.sin(this.gait)) * 0.08 * amp;
      // charge : renverse les adversaires
      if (d && charge && hs > 12) {
        for (const a of G.Combat.actors) {
          if (a === d || a.dead || a.vehicle || !a.hittable() || this.chargeHit.has(a) || G.Duo.sameTeam(d, a)) continue;
          if (Math.hypot(a.pos.x - this.pos.x, a.pos.z - this.pos.z) < 1.6 && Math.abs(a.pos.y - this.pos.y) < 1.5) {
            this.chargeHit.add(a); setTimeout(() => this.chargeHit.delete(a), 1500);
            G.Combat.damageActor(a, 40, { by: d, weapon: 'boar', point: [a.pos.x, a.pos.y + 1, a.pos.z] });
            a.vel.x += fx * 14; a.vel.y += 7; a.vel.z += fz * 14; a.grounded = false;
            G.Audio.play('hit_metal', { pos: [a.pos.x, a.pos.y, a.pos.z] });
          }
        }
        if (Math.random() < 0.5) G.FX.smoke.spawn(this.pos.x - fx, this.pos.y + 0.2, this.pos.z - fz, U.rand(-1, 1), 0.5, U.rand(-1, 1), 0.6, 0.5, 0.4, 0.6, 0.8, 0.2, 1, 1.5);
      }
      if (d && d.isPlayer && !this.air && hs > 3 && Math.floor(this.gait / Math.PI) !== this.lastStep) { this.lastStep = Math.floor(this.gait / Math.PI); G.Audio.play('step', { mat: 'grass', vol: 0.6 }); }
      if (d && d.isPlayer && Math.random() < dt * 0.3) G.Audio.play('boar', {});
      this.sync();
    }
    hurt(n) {
      this.hp -= n;
      if (this.hp <= 0 && !this.dead) {
        this.dead = true; this.m.visible = false;
        const d = this.driver; if (d) G.Extras.exitKart(d);
        G.Loot.spill([{ kind: 'item', item: G.Items.make('meat', null, 3) }], this.pos.x, this.pos.y + 0.8, this.pos.z, 0.6);
        G.FX.eliminate(this.pos.x, this.pos.y, this.pos.z, 0x6a4a32);
      }
    }
  }

  BO.Boar = Boar;
  BO.init = function () {
    if (BO.list.length) return;
    const rng = U.RNG(4242);
    for (let i = 0; i < 40 && BO.list.length < 8; i++) {
      const x = rng.range(-420, 420), z = rng.range(-420, 420);
      const h = T.height(x, z);
      if (h < 2 || T.slope(x, z) > 0.3 || (G.Veg.inPOI && G.Veg.inPOI(x, z, 1.1))) continue;
      if (T.forest && T.forest(x, z) < 0.3) continue;
      const b = new Boar(x, z);
      BO.list.push(b); G.Extras.karts.push(b);
    }
  };
  BO.update = function (dt) {
    const cam = G.camera.position;
    for (const b of BO.list) if (!b.driver && !b.dead) { const far = Math.hypot(b.pos.x - cam.x, b.pos.z - cam.z) > 150; b.m.visible = !far; if (!far) b.update(dt); }
  };
})();
