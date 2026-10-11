// ============================================================
//  Tempête : phases, cercles, dégâts, effets visuels
// ============================================================
(function () {
  const U = G.U;
  const S = { active: false, phase: 0, state: 'wait', timer: 0, cur: { x: 0, z: 0, r: 700 }, next: null, from: null };
  G.Storm = S;

  // [attente, rétrécissement, rayon cible, dégâts/s]
  // [attente (s), rétrécissement (s), rayon visé, dégâts / s]
  S.PHASES = [
    [100, 80, 300, 1],
    [75, 62, 180, 1],
    [62, 52, 110, 2],
    [52, 44, 65, 4],
    [42, 36, 35, 6],
    [32, 30, 16, 8],
    [26, 26, 5, 10],
    [20, 24, 0, 12],
  ];

  S.init = function (scene) {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 128, 1, true);
    S.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      uniforms: { time: { value: 0 }, r: { value: 700 } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float time; uniform float r; varying vec2 vUv; varying vec3 vW;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*n2(p); p*=2.1; a*=0.5; } return s; }
        void main(){
          float ang = vUv.x * 6.2831 * max(1.0, r/40.0);
          vec2 p = vec2(ang * 1.2, vW.y * 0.035);
          float n = fbm(p + vec2(time*0.25, -time*0.6));
          float n2v = fbm(p*2.3 - vec2(time*0.4, time*0.3));
          vec3 c1 = vec3(0.45, 0.18, 0.85), c2 = vec3(0.75, 0.45, 1.0), c3 = vec3(0.2, 0.05, 0.45);
          vec3 col = mix(c3, c1, n);
          col = mix(col, c2, smoothstep(0.55, 0.8, n2v));
          float a = 0.42 + 0.25*n;
          // lignes lumineuses
          float band = smoothstep(0.02, 0.0, abs(fract(vW.y*0.02 - time*0.15) - 0.5) - 0.47);
          col += vec3(0.5,0.3,0.9) * band * 0.5;
          // fondu en haut + atténuation avec la distance
          a *= smoothstep(520.0, 200.0, vW.y);
          float dc = distance(cameraPosition.xz, vW.xz);
          a *= mix(1.0, 0.3, smoothstep(120.0, 650.0, dc));
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    });
    S.wall = new THREE.Mesh(geo, S.mat);
    S.wall.renderOrder = 8;
    S.wall.frustumCulled = false;
    S.wall.visible = false;
    scene.add(S.wall);
  };

  S.DEFAULT_PHASES = S.PHASES;
  S.RUMBLE_PHASES = [[20, 45, 200, 1]];
  // tempête selon la difficulté : plus lente et moins douloureuse en facile
  S.phasesFor = function (diff) {
    const t = [1.3, 1, 0.92, 0.85][U.clamp(diff, 0, 3)], dmg = [0.6, 1, 1, 1.15][U.clamp(diff, 0, 3)];
    return S.DEFAULT_PHASES.map((p) => [Math.round(p[0] * t), Math.round(p[1] * t), p[2], Math.max(1, Math.round(p[3] * dmg))]);
  };
  S.reset = function () {
    S.active = false; S.phase = 0; S.state = 'wait';
    S.cur = { x: 0, z: 0, r: 760 }; S.next = null; S.from = null;
    S.timer = S.PHASES[0][0];
    S.wall.visible = false;
    S.lightT = 5;
  };
  S.start = function () {
    S.reset();
    S.active = true;
    S.pickNext();
    S.wall.visible = true;
  };
  S.pickNext = function () {
    const ph = S.PHASES[S.phase];
    if (!ph) { S.next = null; return; }
    const r = ph[2];
    const c = S.cur;
    let best = null;
    for (let i = 0; i < 60; i++) {
      const maxOff = Math.max(0, (S.phase === 0 ? 400 : c.r) - r);
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * maxOff * (S.phase === 0 ? 0.55 : 0.9);
      const x = (S.phase === 0 ? 0 : c.x) + Math.cos(a) * d, z = (S.phase === 0 ? 0 : c.z) + Math.sin(a) * d;
      const h = G.Terrain.height(x, z);
      if (h > 1.5 || i > 50) { best = { x, z, r }; if (h > 1.5) break; }
    }
    S.next = best;
  };

  S.update = function (dt) {
    S.mat.uniforms.time.value += dt;
    if (!S.active) return;
    S.timer -= dt;
    const ph = S.PHASES[S.phase];
    if (S.state === 'wait') {
      if (S.timer <= 10 && S.timer + dt > 10 && G.HUD) G.HUD.notify('La tempête va se déplacer !', 2.5, 'storm');
      if (S.timer <= 0) {
        if (!ph) { S.state = 'end'; return; }
        S.state = 'shrink';
        S.timer = ph[1];
        S.from = { x: S.cur.x, z: S.cur.z, r: S.cur.r };
        G.Audio.play('storm_warning');
        if (G.HUD) G.HUD.notify('LA TEMPÊTE SE RAPPROCHE', 3, 'storm');
      }
    } else if (S.state === 'shrink') {
      const k = 1 - Math.max(0, S.timer) / ph[1];
      S.cur.x = U.lerp(S.from.x, S.next.x, k); S.cur.z = U.lerp(S.from.z, S.next.z, k); S.cur.r = U.lerp(S.from.r, S.next.r, k);
      if (S.timer <= 0) {
        S.cur = { x: S.next.x, z: S.next.z, r: S.next.r };
        S.phase++;
        const np = S.PHASES[S.phase];
        if (np) { S.state = 'wait'; S.timer = np[0]; S.pickNext(); if (G.HUD) G.HUD.notify('La tempête s\'est stabilisée', 2.5, 'storm'); }
        else { S.state = 'end'; S.next = null; }
      }
    }
    S.wall.position.set(S.cur.x, 150, S.cur.z);
    const rr = Math.max(0.5, S.cur.r);
    S.wall.scale.set(rr, 600, rr);
    S.mat.uniforms.r.value = rr;
  };
  S.shrinking = false;
  Object.defineProperty(S, 'shrinking', { get: () => S.state === 'shrink' });

  S.isOutside = function (x, z) {
    if (!S.active) return false;
    return Math.hypot(x - S.cur.x, z - S.cur.z) > S.cur.r;
  };
  S.damage = function () {
    const ph = S.PHASES[Math.min(S.phase, S.PHASES.length - 1)];
    const scale = G.Server ? G.Server.stormScale() : 1;
    return ph[3] * scale;
  };
  S.distToSafe = function (x, z) {
    const n = S.next || S.cur;
    return Math.max(0, Math.hypot(x - n.x, z - n.z) - n.r);
  };
  S.label = function () {
    if (!S.active) return '';
    if (S.state === 'wait') return 'La tempête se réduit dans';
    if (S.state === 'shrink') return 'La tempête se réduit';
    return 'Tempête finale';
  };

  // effets pour le joueur (appelé chaque frame)
  S.playerFx = function (dt, player, camPos) {
    if (!S.active) { G.Sky.stormTint = U.damp(G.Sky.stormTint, 0, 3, dt); G.Audio.setLoop('storm', 0); return; }
    const d = Math.hypot(camPos.x - S.cur.x, camPos.z - S.cur.z) - S.cur.r; // >0 dehors
    const inside = d > 0;
    G.Sky.stormTint = U.damp(G.Sky.stormTint, inside ? 1 : 0, 2.5, dt);
    const near = inside ? 1 : U.clamp(1 - (-d) / 120, 0, 1);
    G.Audio.setLoop('storm', inside ? 0.28 : near * 0.12, 0);
    if (inside) {
      S.lightT -= dt;
      if (S.lightT <= 0) { S.lightT = U.rand(3, 9); G.Audio.play('thunder', { pos: [camPos.x + U.rand(-80, 80), camPos.y + 60, camPos.z + U.rand(-80, 80)], vol: 0.45 * G.Audio.ambVol() }); if (G.HUD) G.HUD.flash('#c8a0ff', 0.25); }
    }
  };
})();
