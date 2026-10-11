// ============================================================
//  Météo : averses de pluie, orages (éclairs + tonnerre)
// ============================================================
(function () {
  const U = G.U;
  const W = { rain: 0, target: 0, events: [], covered: 0, mesh: null, flash: 0, thunderT: 0 };
  G.Weather = W;
  const N = 5000, BOX = 70, HGT = 36;

  W.init = function (scene) {
    const pos = new Float32Array(N * 2 * 3), end = new Float32Array(N * 2), spd = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = Math.random() * BOX, y = Math.random() * HGT, z = Math.random() * BOX, s = 0.8 + Math.random() * 0.5;
      for (let k = 0; k < 2; k++) { const o = (i * 2 + k); pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z; end[o] = k; spd[o] = s; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aSpd', new THREE.BufferAttribute(spd, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, cam: { value: new THREE.Vector3() }, amount: { value: 0 }, color: { value: new THREE.Color(0xc8d4e4) }, wind: { value: new THREE.Vector2(1.5, 0.6) } },
      vertexShader: `
        attribute float aEnd; attribute float aSpd;
        uniform float time; uniform vec3 cam; uniform vec2 wind;
        varying float vA;
        void main() {
          vec3 p = position;
          float fall = time * 26.0 * aSpd;
          float y = mod(p.y - fall, ${HGT.toFixed(1)}) - ${(HGT * 0.45).toFixed(1)};
          vec3 w = vec3(cam.x + mod(p.x - cam.x + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)}, cam.y + y, cam.z + mod(p.z - cam.z + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)});
          w.xz += wind * (y * 0.04) ;
          if (aEnd > 0.5) { w.y -= 0.9 * aSpd; w.xz -= wind * 0.05; }
          vA = 1.0 - smoothstep(20.0, ${(BOX / 2).toFixed(1)}, length(w.xz - cam.xz));
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: `
        uniform float amount; uniform vec3 color; varying float vA;
        void main() { gl_FragColor = vec4(color, amount * 0.42 * vA); }`,
      transparent: true, depthWrite: false,
    });
    W.mesh = new THREE.LineSegments(g, mat);
    W.mesh.frustumCulled = false;
    W.mesh.visible = false;
    W.mesh.renderOrder = 5;
    scene.add(W.mesh);
    // neige (flocons qui tombent en tournoyant) sur la montagne
    const SN = 2200, sp = new Float32Array(SN * 3), sph = new Float32Array(SN);
    for (let i = 0; i < SN; i++) { sp[i * 3] = Math.random() * BOX; sp[i * 3 + 1] = Math.random() * HGT; sp[i * 3 + 2] = Math.random() * BOX; sph[i] = Math.random() * 6.28; }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aPh', new THREE.BufferAttribute(sph, 1));
    const smat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, cam: { value: new THREE.Vector3() }, amount: { value: 0 }, size: { value: 6 } },
      vertexShader: `
        attribute float aPh; uniform float time; uniform vec3 cam; uniform float size; varying float vA;
        void main() {
          vec3 p = position;
          float y = mod(p.y - time * 1.6, ${HGT.toFixed(1)}) - ${(HGT * 0.45).toFixed(1)};
          vec3 w = vec3(cam.x + mod(p.x - cam.x + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)}, cam.y + y, cam.z + mod(p.z - cam.z + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)});
          w.x += sin(time * 0.9 + aPh) * 0.8; w.z += cos(time * 0.7 + aPh * 1.3) * 0.8;
          vA = 1.0 - smoothstep(18.0, ${(BOX / 2).toFixed(1)}, length(w.xz - cam.xz));
          vec4 mv = viewMatrix * vec4(w, 1.0);
          gl_PointSize = size * 40.0 / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float amount; varying float vA;
        void main() { vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.2, length(d)); gl_FragColor = vec4(1.0, 1.0, 1.0, a * amount * vA * 0.9); }`,
      transparent: true, depthWrite: false,
    });
    W.snow = new THREE.Points(sg, smat);
    W.snow.frustumCulled = false; W.snow.visible = false; W.snow.renderOrder = 5;
    scene.add(W.snow);
    W.snowAmt = 0;
  };

  // Programme la météo d'une partie : parfois une averse, parfois un orage
  W.reset = function (forMatch) {
    W.rain = 0; W.target = 0; W.events = [];
    W.thunderT = 0; W.flash = 0;
    W.peak = 0; W.rainbowT = 0; W.rainbowDone = false;
    W.auroraOn = Math.random() < 0.55;
    if (W.rainbow) W.rainbow.visible = false;
    if (!forMatch) return;
    const r = Math.random();
    if (r < 0.4) {
      const start = U.rand(40, 260), dur = U.rand(80, 170);
      W.events.push({ at: start, to: dur > 140 ? 1 : 0.75 }, { at: start + dur, to: 0 });
    }
  };
  W.forceRain = function (v) { W.events = []; W.target = v; };

  // ------------------------------------------------------------
  //  Éclairs : zigzag de lumière du ciel jusqu'au sol (orages et tempête)
  // ------------------------------------------------------------
  W.bolts = [];
  let boltGeo = null;
  W.bolt = function (x, y, z, color) {
    if (!boltGeo) { boltGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true); boltGeo.translate(0, 0.5, 0); }
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: color || 0xdde8ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const top = y + U.rand(160, 230);
    let px = x + U.rand(-30, 30), py = top, pz = z + U.rand(-30, 30);
    const segs = 14;
    const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
    const addSeg = (ax, ay, az, bx, by, bz, w) => {
      d.set(bx - ax, by - ay, bz - az); const len = d.length(); d.normalize();
      const m = new THREE.Mesh(boltGeo, mat); m.position.set(ax, ay, az); m.quaternion.setFromUnitVectors(up, d); m.scale.set(w, len, w); g.add(m);
    };
    for (let i = 1; i <= segs; i++) {
      const k = i / segs;
      const nx = U.lerp(px, x, 1 / (segs - i + 1)) + (i < segs ? U.rand(-9, 9) : 0), ny = U.lerp(top, y, k), nz = U.lerp(pz, z, 1 / (segs - i + 1)) + (i < segs ? U.rand(-9, 9) : 0);
      addSeg(px, py, pz, nx, ny, nz, 0.55 * (1.2 - k * 0.5));
      // ramification
      if (i > 2 && i < segs - 2 && Math.random() < 0.3) { const bx = nx + U.rand(-25, 25), by = ny - U.rand(15, 35), bz = nz + U.rand(-25, 25); addSeg(nx, ny, nz, bx, by, bz, 0.25); }
      px = nx; py = ny; pz = nz;
    }
    g.frustumCulled = false;
    G.scene.add(g);
    W.bolts.push({ g, mat, t: 0.35 });
    for (let i = 0; i < 14; i++) G.FX.glow.spawn(x, y + 0.5, z, U.rand(-4, 4), U.rand(1, 6), U.rand(-4, 4), 0.8, 0.85, 1, 0.5, 0.5, 6, 1);
  };
  W.updateBolts = function (dt) {
    for (let i = W.bolts.length - 1; i >= 0; i--) {
      const b = W.bolts[i];
      b.t -= dt;
      b.mat.opacity = b.t > 0.25 ? 1 : Math.max(0, b.t / 0.25) * (0.6 + Math.random() * 0.4);
      if (b.t <= 0) { G.scene.remove(b.g); b.mat.dispose(); W.bolts.splice(i, 1); }
    }
    // éclairs violets dans la tempête, près du joueur
    const S = G.Storm, pl = G.player;
    if (S && S.active && pl && G.Game.state === 'playing') {
      W.stormBoltT = (W.stormBoltT || 3) - dt;
      if (W.stormBoltT <= 0) {
        W.stormBoltT = U.rand(2.5, 6);
        const c = S.cur;
        for (let k = 0; k < 8; k++) {
          const a = Math.random() * 6.28, r = U.rand(40, 170);
          const x = pl.pos.x + Math.cos(a) * r, z = pl.pos.z + Math.sin(a) * r;
          if (Math.hypot(x - c.x, z - c.z) < c.r + 15) continue; // seulement dans la tempête
          W.bolt(x, Math.max(G.Terrain.height(x, z), 0), z, 0xd8a0ff);
          G.Audio.play('thunder', { pos: [x, pl.pos.y, z], vol: 0.5 * G.Audio.ambVol(), delay: 0.3 });
          break;
        }
      }
    }
  };

  // Aurore boréale : rideaux lumineux ondulants au nord, certaines nuits
  W.updateAurora = function (dt, camPos) {
    const night = G.Sky.night || 0;
    const vis = W.auroraOn !== false && night > 0.35 && W.rain < 0.2;
    if (!W.aurora) {
      if (!vis) return;
      W.aurora = new THREE.Group();
      W.auroraMat = new THREE.ShaderMaterial({
        uniforms: { t: { value: 0 }, op: { value: 0 } },
        vertexShader: 'varying vec2 vU; uniform float t; void main(){ vU = uv; vec3 p = position; p.z += sin(p.x * 0.004 + t * 0.35) * 60.0 + sin(p.x * 0.011 - t * 0.6) * 25.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
        fragmentShader: 'varying vec2 vU; uniform float t; uniform float op; void main(){ float band = smoothstep(0.0, 0.25, vU.y) * smoothstep(1.0, 0.45, vU.y); float rays = 0.55 + 0.45 * sin(vU.x * 90.0 + t * 1.3 + sin(vU.x * 23.0 - t) * 2.0); vec3 c = mix(vec3(0.15, 1.0, 0.55), vec3(0.65, 0.3, 1.0), smoothstep(0.35, 1.0, vU.y)); gl_FragColor = vec4(c * band * rays, band * rays * op); }',
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      });
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1600, 260, 80, 1), W.auroraMat);
        m.position.set((i - 1) * 300, 330 + i * 40, -900 - i * 160); m.rotation.y = (i - 1) * 0.25;
        m.frustumCulled = false; m.renderOrder = -2;
        W.aurora.add(m);
      }
      G.scene.add(W.aurora);
    }
    W.auroraA = U.damp(W.auroraA || 0, vis ? Math.min(1, (night - 0.35) * 2.5) : 0, 0.5, dt);
    W.aurora.visible = W.auroraA > 0.01;
    if (!W.aurora.visible) return;
    W.aurora.position.set(camPos.x, 0, camPos.z);
    W.auroraMat.uniforms.t.value += dt;
    W.auroraMat.uniforms.op.value = 0.55 * W.auroraA;
  };

  // Arc-en-ciel : grand anneau dégradé à l'opposé du soleil
  W.updateRainbow = function (dt, camPos) {
    if (!(W.rainbowT > 0)) { if (W.rainbow) W.rainbow.visible = false; return; }
    W.rainbowT -= dt;
    if (!W.rainbow) {
      const geo = new THREE.RingGeometry(430, 480, 96, 1, 0, Math.PI);
      const mat = new THREE.ShaderMaterial({
        uniforms: { op: { value: 0 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float op; varying vec2 vP; vec3 hsv(float h){ vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return k; }' +
          'void main(){ float t = (length(vP) - 430.0) / 50.0; vec3 c = hsv((1.0 - t) * 0.78); float a = smoothstep(0.0, 0.18, t) * smoothstep(1.0, 0.8, t) * smoothstep(-30.0, 60.0, vP.y) * op; gl_FragColor = vec4(c, a); }',
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      W.rainbow = new THREE.Mesh(geo, mat);
      W.rainbow.frustumCulled = false; W.rainbow.renderOrder = -1;
      G.scene.add(W.rainbow);
    }
    const sd = G.Sky.sunDir;
    let dx = -sd.x, dz = -sd.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const rb = W.rainbow;
    rb.visible = true;
    rb.position.set(camPos.x + dx * 700, camPos.y - 110, camPos.z + dz * 700);
    rb.lookAt(camPos.x, camPos.y - 110, camPos.z);
    const fade = Math.min(1, (110 - W.rainbowT) / 8) * Math.min(1, W.rainbowT / 15) * (1 - G.Sky.night) * (1 - W.rain);
    rb.material.uniforms.op.value = 0.42 * fade;
  };

  const _up = new THREE.Vector3();
  W.update = function (dt, camPos, time) {
    if (!W.mesh) return;
    for (let i = W.events.length - 1; i >= 0; i--) if (time >= W.events[i].at) { W.target = W.events[i].to; W.events.splice(i, 1); }
    W.rain = U.damp(W.rain, W.target, 0.35, dt);
    if (W.rain < 0.005 && W.target === 0) W.rain = 0;
    // arc-en-ciel à la fin d'une averse (de jour)
    W.peak = Math.max(W.peak || 0, W.rain);
    if (!W.rainbowDone && W.target === 0 && W.peak > 0.5 && W.rain < 0.3 && G.Sky.night < 0.3) { W.rainbowDone = true; W.rainbowT = 110; }
    W.updateRainbow(dt, camPos);
    W.updateAurora(dt, camPos);
    // à l'abri (toit au-dessus de la caméra) : on masque la pluie
    W.coverT = (W.coverT || 0) - dt;
    if (W.coverT <= 0 && (W.rain > 0 || W.snowTarget)) {
      W.coverT = 0.25;
      const h = G.Phys.raycast(camPos.x, camPos.y + 0.2, camPos.z, 0, 1, 0, 30, { mask: 1 });
      W.coveredTarget = h ? 1 : 0;
    }
    W.covered = U.damp(W.covered, W.coveredTarget || 0, 6, dt);
    const vis = W.rain * (1 - W.covered * 0.92);
    W.mesh.visible = vis > 0.01;
    const u = W.mesh.material.uniforms;
    u.time.value += dt; u.cam.value.copy(camPos); u.amount.value = vis;
    u.color.value.setRGB(0.55 + 0.25 * G.Sky.dayF, 0.6 + 0.25 * G.Sky.dayF, 0.7 + 0.2 * G.Sky.dayF);
    G.Audio.setLoop('rain', W.rain * (0.16 - W.covered * 0.08), 0, W.covered);
    // neige en altitude (zone enneigée de la montagne)
    if (W.snow) {
      W.snowT = (W.snowT || 0) - dt;
      if (W.snowT <= 0) { W.snowT = 0.5; const T = G.Terrain; W.snowTarget = T.height(camPos.x, camPos.z) > T.snowLine(camPos.x, camPos.z) - 12 ? 1 : 0; }
      W.snowAmt = U.damp(W.snowAmt, (W.snowTarget || 0) * (1 - W.covered), 1.2, dt);
      W.snow.visible = W.snowAmt > 0.02;
      const su = W.snow.material.uniforms; su.time.value += dt; su.cam.value.copy(camPos); su.amount.value = W.snowAmt;
      if (W.snowAmt > 0.02) W.mesh.visible = false; // pas de pluie en même temps que la neige
    }
    // orage : éclairs et tonnerre
    W.flash = Math.max(0, W.flash - dt * 4);
    W.updateBolts(dt);
    if (W.rain > 0.7) {
      W.thunderT -= dt;
      if (W.thunderT <= 0) {
        W.thunderT = U.rand(12, 35);
        W.flash = 1;
        { const a = Math.random() * 6.28, r = U.rand(60, 220); const bx = camPos.x + Math.cos(a) * r, bz = camPos.z + Math.sin(a) * r; W.bolt(bx, Math.max(G.Terrain.height(bx, bz), 0), bz, 0xdde8ff); }
        if (G.HUD && G.Game.state !== 'menu') G.HUD.flash('rgba(230,240,255,0.35)', 0.25);
        G.Audio.play('thunder', { delay: U.rand(0.4, 2.2), vol: 0.6 * G.Audio.ambVol() });
      }
    }
    // gouttes qui éclaboussent autour du joueur
    if (vis > 0.3 && G.player && !G.player.dead && Math.random() < dt * 30 * vis) {
      const a = Math.random() * 6.28, r = Math.random() * 10;
      const x = camPos.x + Math.cos(a) * r, z = camPos.z + Math.sin(a) * r;
      const y = Math.max(G.Terrain.height(x, z), 0);
      G.FX.glow.spawn(x, y + 0.05, z, U.rand(-0.5, 0.5), U.rand(0.5, 1.2), U.rand(-0.5, 0.5), 0.8, 0.85, 0.95, 0.05, 0.25, 9, 0);
    }
  };
})();
