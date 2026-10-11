// ============================================================
//  Avion de chasse (façon X-4 Stormwing) : décollage, vol à la souris,
//  turbo, mitrailleuses, atterrissage ou crash
// ============================================================
(function () {
  const U = G.U, T = G.Terrain, P = G.Phys, I = G.Items;
  const PL = { list: [] };
  G.Planes = PL;

  function planeModel(color) {
    const g = new THREE.Group();
    const parts = [], glow = [];
    const addB = (sx, sy, sz, col, x, y, z, rx, ry, rz) => { const geo = new THREE.BoxGeometry(sx, sy, sz); geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)).setPosition(x, y, z)); parts.push(G.Veg.colored(geo, col, 0)); };
    const addC = (rt, rb, h, seg, col, x, y, z, rx, ry, rz) => { const geo = new THREE.CylinderGeometry(rt, rb, h, seg); geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)).setPosition(x, y, z)); parts.push(G.Veg.colored(geo, col, 0)); };
    const white = 0xf0f0f0, dark = 0x2a2a30, gl = 0x6ab8e8;
    addB(1.1, 1.0, 5.2, color, 0, 1.55, 0);                 // fuselage
    addC(0.2, 0.55, 1.1, 10, color, 0, 1.55, 3.1, Math.PI / 2, 0, 0); // nez
    addB(1.12, 0.35, 5.2, white, 0, 1.2, 0);                // ventre
    addB(0.9, 0.55, 1.6, gl, 0, 2.2, 0.8, -0.15, 0, 0);     // cockpit
    addB(8.6, 0.14, 1.5, color, 0, 1.45, 0.4);              // ailes
    addB(8.62, 0.15, 0.3, white, 0, 1.46, 1.05);            // bord d'attaque
    addB(3.2, 0.1, 0.9, color, 0, 1.75, -2.4);              // stabilisateurs
    addB(0.12, 1.2, 1.0, color, 0, 2.35, -2.4, 0.2, 0, 0);   // dérive
    addB(0.14, 0.14, 0.9, dark, 3.2, 1.35, 0.9); addB(0.14, 0.14, 0.9, dark, -3.2, 1.35, 0.9); // canons
    for (const x of [-1.2, 1.2]) { addB(0.1, 0.9, 0.1, dark, x, 0.75, 0.9); addC(0.28, 0.28, 0.18, 10, 0x151515, x, 0.32, 0.9, 0, 0, Math.PI / 2); }
    addB(0.1, 0.6, 0.1, dark, 0, 0.9, -2.3); addC(0.16, 0.16, 0.12, 8, 0x151515, 0, 0.55, -2.3, 0, 0, Math.PI / 2);
    addB(0.3, 0.3, 0.12, 0xffd83a, 0, 1.55, 3.68);
    glow.push(G.Veg.colored(new THREE.BoxGeometry(0.2, 0.08, 0.2).translate(4.3, 1.45, 0.4), 0xff3030, 0), G.Veg.colored(new THREE.BoxGeometry(0.2, 0.08, 0.2).translate(-4.3, 1.45, 0.4), 0x30ff60, 0));
    const body = new THREE.Mesh(G.Veg.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })); body.castShadow = true; g.add(body);
    g.add(new THREE.Mesh(G.Veg.merge(glow), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
    // hélice
    const prop = new THREE.Group(); prop.position.set(0, 1.55, 3.72); g.add(prop);
    const bm = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.04), bm); b.rotation.z = k * Math.PI * 2 / 3; b.position.y = 0; prop.add(b); }
    g.userData = { prop };
    return g;
  }

  class Plane {
    constructor(x, z, yaw, color) {
      this.home = [x, z, yaw];
      this.label = 'Avion de chasse'; this.isPlane = true;
      this.seat = [0, 1.05, 0.7];
      this.m = planeModel(color || U.pick([0xc83030, 0x2a6ad8, 0xe0a020, 0x4a8a3a]));
      G.scene.add(this.m);
      this.reset();
    }
    reset() {
      const [x, z, yaw] = this.home;
      this.pos = new THREE.Vector3(x, T.height(x, z), z);
      this.yaw = yaw; this.pitch = 0; this.roll = 0; this.speed = 0; this.vy = 0; this.hp = 450; this.dead = false; this.driver = null;
      this.boost = 1; this.boostOn = false; this.fireT = 0; this.air = false; this.groundY = this.pos.y;
      this.m.visible = true; this.sync();
    }
    sync() { this.m.position.copy(this.pos); this.m.rotation.set(-this.pitch, this.yaw, this.roll, 'YXZ'); }
    forward(out) { const cp = Math.cos(this.pitch); return out.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp); }
    update(dt) {
      if (this.dead) return;
      const d = this.driver;
      let thr = 0, boost = false, fire = false, tYaw = this.yaw, tPitch = this.air ? -0.45 : 0; // sans pilote : il pique du nez
      if (d) {
        thr = d.control.mz; boost = d.control.sprint; fire = d.control.fire;
        if (d.isPlayer) { tYaw = d.camYaw + Math.PI; tPitch = U.clamp(d.camPitch + 0.12, -0.7, 0.75); }
      }
      // turbo
      this.boostOn = boost && this.boost > 0.05 && this.air;
      this.boost = U.clamp(this.boost + (this.boostOn ? -0.35 : 0.12) * dt, 0, 1);
      const maxS = this.boostOn ? 62 : 42;
      if (thr > 0) this.speed = Math.min(maxS, this.speed + (this.boostOn ? 20 : 11) * dt);
      else if (thr < 0) this.speed = Math.max(0, this.speed - 16 * dt);
      else this.speed = U.damp(this.speed, this.air ? Math.max(26, this.speed * 0.98) : 0, this.air ? 0.2 : 0.8, dt);
      if (this.speed > maxS) this.speed = U.damp(this.speed, maxS, 1.5, dt);
      const gh = Math.max(T.height(this.pos.x, this.pos.z), 0);
      // pilotage : on suit la direction de la caméra
      const dy = U.angleDiff(this.yaw, tYaw);
      const turnRate = this.air ? 1.1 : 0.9 * U.clamp(this.speed / 8, 0, 1);
      this.yaw += U.clamp(dy, -turnRate * dt, turnRate * dt);
      if (this.air) this.pitch = U.damp(this.pitch, tPitch, 1.6, dt);
      else this.pitch = U.damp(this.pitch, this.speed > 20 && tPitch > 0.1 ? 0.25 : 0, 3, dt);
      this.roll = U.damp(this.roll, -U.clamp(dy, -1, 1) * (this.air ? 0.9 : 0.1), 3, dt);
      // déplacement
      const f = this.forward(U.v1);
      let vx = f.x * this.speed, vz = f.z * this.speed, vyv = f.y * this.speed;
      if (this.speed < 18 && this.air) vyv -= (18 - this.speed) * 0.7;           // décrochage
      const next = U.v2.set(this.pos.x + vx * dt, this.pos.y + vyv * dt, this.pos.z + vz * dt);
      // obstacles devant
      if (this.speed > 3) {
        const h = P.raycast(this.pos.x, this.pos.y + 1.5, this.pos.z, f.x, f.y, f.z, this.speed * dt + 3.5, { mask: 1 });
        if (h && !h.terrain) { if (this.speed > 16) return this.crash(); this.speed = 0; return this.sync(); }
      }
      this.pos.copy(next);
      if (this.pos.y > gh + 260) this.pos.y = gh + 260;
      const ng = Math.max(T.height(this.pos.x, this.pos.z), 0), support = Math.max(ng, P.supportAt(this.pos.x, this.pos.z, this.pos.y + 1, 1.2, 0.6));
      if (this.air) {
        if (this.pos.y <= support + 0.05) {
          // atterrissage ou crash
          if (this.speed < 30 && this.pitch > -0.3 && T.slope(this.pos.x, this.pos.z) < 0.35 && ng > -0.2) { this.air = false; this.pos.y = support; G.Audio.play('land', { pos: [this.pos.x, this.pos.y, this.pos.z], v: 1.2 }); }
          else return this.crash();
        }
      } else {
        this.pos.y = support;
        if (this.speed >= 21 && this.pitch > 0.15) { this.air = true; this.pos.y += 0.3; }
        if (ng < -0.3) { this.speed *= Math.pow(0.2, dt); } // dans l'eau
      }
      this.groundY = support;
      // mitrailleuses
      this.fireT -= dt;
      if (fire && this.fireT <= 0 && d) {
        this.fireT = 0.085;
        const fw = this.forward(U.v3);
        const side = (this.gunSide = -(this.gunSide || 1));
        const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
        const mz = new THREE.Vector3(this.pos.x + rx * 3.2 * side + fw.x * 1.5, this.pos.y + 1.35 + fw.y * 1.5, this.pos.z + rz * 3.2 * side + fw.z * 1.5);
        const aimO = new THREE.Vector3(this.pos.x + fw.x * 4, this.pos.y + 1.55 + fw.y * 4, this.pos.z + fw.z * 4);
        G.Combat.fireWeapon(d, PL.gun || (PL.gun = I.make('planegun', 2)), aimO, aimO, fw.clone(), 0.012, mz);
        G.Audio.play('smg', { pos: d.isPlayer ? null : [this.pos.x, this.pos.y, this.pos.z], vol: 0.7 });
        G.FX.muzzle(mz.x, mz.y, mz.z, false, d.isPlayer);
      }
      // hélice, traînées, son
      this.m.userData.prop.rotation.z += dt * (10 + this.speed * 1.5);
      if (this.boostOn && Math.random() < 0.8) G.FX.glow.spawn(this.pos.x - f.x * 3, this.pos.y + 1.5, this.pos.z - f.z * 3, -f.x * 5, 0, -f.z * 5, 1, 0.6, 0.2, 0.5, 0.4, 0, 1);
      if (this.air && this.speed > 30 && Math.random() < 0.5) for (const s of [-1, 1]) { const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw); G.FX.glow.spawn(this.pos.x + rx * 4.3 * s, this.pos.y + 1.45, this.pos.z + rz * 4.3 * s, 0, 0, 0, 1, 1, 1, 0.08, 0.6, 0, 0); }
      if (d && d.isPlayer) G.Audio.setLoop('engine', 0.45, 0, 0.5 + this.speed / 60);
      this.sync();
    }
    crash() {
      if (this.dead) return;
      this.dead = true; this.m.visible = false;
      const d = this.driver;
      G.Combat.explode(this.pos.x, this.pos.y + 1, this.pos.z, 7, 70, 400, d, 'plane');
      G.FX.explosion(this.pos.x, this.pos.y + 1, this.pos.z, 6);
      if (d) {
        G.Extras.exitKart(d);
        if (d.state === 'ground') G.Combat.damageActor(d, 35, { fall: true, by: null });
        if (d.isPlayer) G.HUD.notify('CRASH !', 2);
      }
    }
    hurt(n) { this.hp -= n; if (this.hp <= 0) this.crash(); }
  }
  PL.Plane = Plane;

  // ------------------------------------------------------------
  //  Hélicoptère : vol stationnaire, Z/S avancer, Q/D se décaler,
  //  souris pour tourner, Espace monter, Ctrl/C descendre
  // ------------------------------------------------------------
  function heliModel(color) {
    const g = new THREE.Group();
    const parts = [], glow = [];
    const addB = (sx, sy, sz, col, x, y, z, rx, ry, rz) => { const geo = new THREE.BoxGeometry(sx, sy, sz); geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)).setPosition(x, y, z)); parts.push(G.Veg.colored(geo, col, 0)); };
    const addC = (rt, rb, h, seg, col, x, y, z, rx, ry, rz) => { const geo = new THREE.CylinderGeometry(rt, rb, h, seg); geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)).setPosition(x, y, z)); parts.push(G.Veg.colored(geo, col, 0)); };
    const dark = 0x2a2a30, gl = 0x7ac8f0, white = 0xf0f0f0;
    addB(1.9, 1.6, 3.0, color, 0, 1.45, 0);                    // cabine
    addB(1.7, 1.2, 1.1, gl, 0, 1.55, 1.75, 0.25, 0, 0);          // verrière
    addB(1.92, 0.3, 3.02, white, 0, 0.8, 0);                    // bande
    addB(0.5, 0.5, 4.2, color, 0, 1.75, -3.4);                   // poutre de queue
    addB(0.12, 1.2, 0.8, color, 0, 2.3, -5.3, -0.3, 0, 0);       // dérive
    addB(1.6, 0.1, 0.5, color, 0, 1.8, -4.9);                    // stabilisateur
    addC(0.18, 0.18, 0.6, 8, dark, 0, 2.5, 0);                    // mât du rotor
    for (const x of [-0.85, 0.85]) {                              // patins
      addB(0.12, 0.12, 3.6, dark, x, 0.12, 0.1);
      addB(0.08, 0.7, 0.08, dark, x, 0.45, 0.9, 0, 0, x * 0.25); addB(0.08, 0.7, 0.08, dark, x, 0.45, -0.8, 0, 0, x * 0.25);
    }
    addB(0.3, 0.3, 0.15, 0xffd83a, 0, 1.0, 1.55);
    glow.push(G.Veg.colored(new THREE.BoxGeometry(0.16, 0.16, 0.16).translate(0, 2.95, -5.6), 0xff3030, 0));
    const body = new THREE.Mesh(G.Veg.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })); body.castShadow = true; g.add(body);
    g.add(new THREE.Mesh(G.Veg.merge(glow), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
    const bm = new THREE.MeshLambertMaterial({ color: 0x1e1e22 });
    const rotor = new THREE.Group(); rotor.position.set(0, 2.85, 0); g.add(rotor);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 4.6), bm); b.position.z = 2.3; const arm = new THREE.Group(); arm.rotation.y = k * Math.PI / 2; arm.add(b); rotor.add(arm); }
    // disque flou quand le rotor tourne vite
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4.6, 24), new THREE.MeshBasicMaterial({ color: 0x202024, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 2.86; g.add(disc);
    const tail = new THREE.Group(); tail.position.set(0.18, 2.3, -5.35); g.add(tail);
    for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.12), bm); b.rotation.x = k * Math.PI / 2; tail.add(b); }
    g.userData = { rotor, tail, disc };
    return g;
  }

  class Heli {
    constructor(x, z, yaw, color) {
      this.home = [x, z, yaw];
      this.label = 'Hélicoptère'; this.isHeli = true;
      this.seat = [0.45, 0.55, 0.6];
      this.m = heliModel(color || U.pick([0x2a6ad8, 0xe06a20, 0x3a8a4a, 0xd83060]));
      G.scene.add(this.m);
      this.vel = new THREE.Vector3();
      this.reset();
    }
    reset() {
      const [x, z, yaw] = this.home;
      this.pos = new THREE.Vector3(x, Math.max(T.height(x, z), P.supportAt(x, z, T.height(x, z) + 3, 1.2, 0.6)), z);
      this.yaw = yaw; this.pitch = 0; this.roll = 0; this.speed = 0; this.vel.set(0, 0, 0);
      this.spin = 0; this.hp = 500; this.dead = false; this.driver = null; this.air = false; this.groundY = this.pos.y;
      this.m.visible = true; this.sync();
    }
    sync() { this.m.position.copy(this.pos); this.m.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ'); }
    update(dt) {
      if (this.dead) return;
      const d = this.driver, In = G.Input;
      let fwd = 0, side = 0, up = 0, tYaw = this.yaw;
      if (d) {
        fwd = d.control.mz; side = d.control.mx;
        if (d.isPlayer) {
          tYaw = d.camYaw + Math.PI;
          const ok = In.playing();
          if (ok) up = (In.down('jump') ? 1 : 0) - (In.down('crouch') || In.down('crouchToggle') ? 1 : 0);
        }
      }
      this.spin = U.clamp(this.spin + (d ? 0.55 : -0.3) * dt, 0, 1);
      const lift = this.spin > 0.75;
      // rotation
      const dy = U.angleDiff(this.yaw, tYaw);
      this.yaw += U.clamp(dy, -1.8 * dt, 1.8 * dt);
      // vitesse horizontale visée (repère de l'hélicoptère)
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
      const v = this.vel;
      if (lift && this.air) {
        const sp = d && d.control.sprint ? 34 : 24;
        const tx = fx * fwd * sp + rx * side * 13, tz = fz * fwd * sp + rz * side * 13;
        v.x = U.damp(v.x, tx, 1.3, dt); v.z = U.damp(v.z, tz, 1.3, dt);
      } else if (!this.air) { v.x = U.damp(v.x, 0, 4, dt); v.z = U.damp(v.z, 0, 4, dt); }
      const hAbove = this.pos.y - Math.max(this.groundY || 0, 0);
      if (lift) v.y = U.damp(v.y, up > 0 ? 10 : up < 0 ? (hAbove < 9 ? -3.5 : -9) : (d ? 0 : -3), 2.2, dt);
      else v.y -= 12 * dt;
      // décollage
      if (!this.air && lift && up > 0) { this.air = true; this.pos.y += 0.2; }
      const hs = Math.hypot(v.x, v.z);
      this.speed = hs;
      // obstacles
      if (hs > 1) {
        const h = P.raycast(this.pos.x, this.pos.y + 1.4, this.pos.z, v.x / hs, 0, v.z / hs, hs * dt + 3.2, { mask: 1 });
        if (h && !h.terrain) {
          if (hs > 15) { this.hurt(hs * 5); G.Audio.play('hit_metal', { pos: [this.pos.x, this.pos.y, this.pos.z] }); G.Game.shakeAmt = Math.max(G.Game.shakeAmt || 0, 0.4); }
          v.x = -v.x * 0.3; v.z = -v.z * 0.3;
        }
      }
      this.pos.x += v.x * dt; this.pos.y += v.y * dt; this.pos.z += v.z * dt;
      const ng = Math.max(T.height(this.pos.x, this.pos.z), 0);
      const support = Math.max(ng, P.supportAt(this.pos.x, this.pos.z, this.pos.y + 1.5, 1.3, 0.6));
      if (this.pos.y > ng + 180) { this.pos.y = ng + 180; v.y = Math.min(0, v.y); }
      if (this.pos.y <= support) {
        if (v.y < -13) { this.pos.y = support; return this.crash(); }
        if (v.y < -6) this.hurt(-v.y * 6);
        this.pos.y = support; v.y = Math.max(0, v.y);
        if (this.air && up <= 0) { this.air = false; G.Audio.play('land', { pos: [this.pos.x, this.pos.y, this.pos.z], v: 1.2 }); }
      } else if (this.pos.y > support + 0.3) this.air = true;
      this.groundY = support;
      // inclinaison visuelle
      const lf = v.x * fx + v.z * fz, ls = v.x * rx + v.z * rz;
      this.pitch = U.damp(this.pitch, U.clamp(lf * 0.012, -0.35, 0.35), 3, dt);
      this.roll = U.damp(this.roll, U.clamp(-ls * 0.025 - dy * 0.3, -0.4, 0.4), 3, dt);
      // rotors, poussière, son
      const ud = this.m.userData;
      ud.rotor.rotation.y += dt * this.spin * 28;
      ud.tail.rotation.x += dt * this.spin * 40;
      ud.disc.material.opacity = Math.max(0, this.spin - 0.5) * 0.35;
      if (this.spin > 0.6 && this.pos.y - ng < 12 && Math.random() < 0.6) {
        const a = Math.random() * 6.28, r = U.rand(2, 5);
        G.FX.smoke.spawn(this.pos.x + Math.cos(a) * r, ng + 0.3, this.pos.z + Math.sin(a) * r, Math.cos(a) * 4, 0.5, Math.sin(a) * 4, 0.85, 0.8, 0.7, 0.35, 1.2, 0.2, 1, 2.2);
      }
      if (d && d.isPlayer) G.Audio.setLoop('engine', 0.35 + this.spin * 0.2, 0, 0.3 + this.spin * 0.35 + hs / 120);
      this.sync();
    }
    crash() {
      if (this.dead) return;
      this.dead = true; this.m.visible = false;
      const d = this.driver;
      G.Combat.explode(this.pos.x, this.pos.y + 1, this.pos.z, 7, 70, 400, d, 'plane');
      G.FX.explosion(this.pos.x, this.pos.y + 1, this.pos.z, 6);
      if (d) {
        G.Extras.exitKart(d);
        if (d.state === 'ground') G.Combat.damageActor(d, 35, { fall: true, by: null });
        if (d.isPlayer) G.HUD.notify('CRASH !', 2);
      }
    }
    hurt(n) { this.hp -= n; if (this.hp <= 0) this.crash(); }
  }
  PL.Heli = Heli;
  PL.helis = [];

  PL.init = function () {
    const rng = U.RNG(4711);
    const spots = [[-60, 420], [80, 300], [330, 40], [-150, -150]];
    for (const [cx, cz] of spots) {
      for (let k = 0; k < 60; k++) {
        const a = rng() * Math.PI * 2, r = 20 + rng() * 50;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (T.height(x, z) < 1.5) continue;
        // piste : 30 m dégagés et plats dans la direction choisie
        const yaw = rng() * Math.PI * 2;
        let ok = true;
        for (let s = -6; s <= 36 && ok; s += 3) { const px = x + Math.sin(yaw) * s, pz = z + Math.cos(yaw) * s; if (T.slope(px, pz) > 0.2 || T.height(px, pz) < 1 || P.query(px - 5, T.height(px, pz), pz - 5, px + 5, T.height(px, pz) + 4, pz + 5, 1, []).length) ok = false; }
        if (!ok) continue;
        const p = new Plane(x, z, yaw);
        PL.list.push(p);
        G.Extras.karts.push(p); // entrée / sortie comme les véhicules
        break;
      }
    }
    // hélicoptères : zone plate et dégagée de 12 m
    for (const [cx, cz] of [[-120, 302], [180, 150], [-270, -200], [60, -120]]) {
      for (let k = 0; k < 80; k++) {
        const a = rng() * Math.PI * 2, r = k === 0 ? 0 : 12 + rng() * 45;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, h = T.height(x, z);
        if (h < 1.5 || T.slope(x, z) > 0.15) continue;
        if (P.query(x - 6, h - 1, z - 6, x + 6, h + 6, z + 6, 1, []).length) continue;
        const hl = new Heli(x, z, rng() * Math.PI * 2);
        PL.helis.push(hl); G.Extras.karts.push(hl);
        break;
      }
    }
  };
  // Avions et hélicoptères sur les cartes
  PL.mapIcons = function (ctx, toMap, big) {
    const s = big ? 1.3 : 0.9;
    const draw = (v, heli) => {
      if (v.dead || v.driver === G.player) return;
      const m = toMap(v.pos.x, v.pos.z);
      ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(heli ? 0 : -v.yaw + Math.PI);
      ctx.fillStyle = '#bfe8ff'; ctx.strokeStyle = '#0a2a4a'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (heli) { ctx.arc(0, 0, 4 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-7 * s, 0); ctx.lineTo(7 * s, 0); ctx.moveTo(0, -7 * s); ctx.lineTo(0, 7 * s); ctx.stroke(); }
      else { ctx.moveTo(0, -7 * s); ctx.lineTo(2 * s, -1 * s); ctx.lineTo(7 * s, 2 * s); ctx.lineTo(2 * s, 2 * s); ctx.lineTo(1.5 * s, 6 * s); ctx.lineTo(-1.5 * s, 6 * s); ctx.lineTo(-2 * s, 2 * s); ctx.lineTo(-7 * s, 2 * s); ctx.lineTo(-2 * s, -1 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    };
    for (const p of PL.list) draw(p, false);
    for (const h of PL.helis) draw(h, true);
  };
  PL.update = function (dt) {
    for (const p of PL.list) if (!p.driver && !p.dead && (p.air || p.speed > 0.1)) p.update(dt);
    for (const h of PL.helis) if (!h.driver && !h.dead && (h.air || h.spin > 0)) h.update(dt);
  };
})();
