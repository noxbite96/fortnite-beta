// ============================================================
//  Effets visuels : particules, débris, traçantes, explosions,
//  chiffres de dégâts, point faible, éliminations
// ============================================================
(function () {
  const U = G.U;
  const FX = {};
  G.FX = FX;

  // ------------------------------------------------------------
  //  Système de particules (Points avec shader)
  // ------------------------------------------------------------
  function ParticleSystem(max, additive, tex) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.grow = new Float32Array(max); this.size0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3); this.aPos.setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3); this.aCol.setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1); this.aSize.setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(this.alpha, 1); this.aAlpha.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('color', this.aCol); g.setAttribute('size', this.aSize); g.setAttribute('alpha', this.aAlpha);
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: window.innerHeight / 2 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA;
        uniform float scale;
        void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb, t.a * vA); if (gl_FragColor.a < 0.01) discard; }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 5 : 4;
  }
  ParticleSystem.prototype.spawn = function (x, y, z, vx, vy, vz, r, g, b, size, life, grav, drag, grow) {
    let i;
    if (this.n < this.max) i = this.n++;
    else i = Math.floor(Math.random() * this.max);
    const k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z;
    this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = b;
    this.size[i] = size; this.size0[i] = size; this.alpha[i] = 1;
    this.life[i] = life; this.maxLife[i] = life;
    this.grav[i] = grav || 0; this.drag[i] = drag || 0; this.grow[i] = grow || 0;
  };
  ParticleSystem.prototype.update = function (dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // retire en échangeant avec le dernier
        n--;
        if (i !== n) {
          const a = i * 3, b = n * 3;
          for (let c = 0; c < 3; c++) { this.pos[a + c] = this.pos[b + c]; this.vel[a + c] = this.vel[b + c]; this.col[a + c] = this.col[b + c]; }
          this.size[i] = this.size[n]; this.size0[i] = this.size0[n]; this.alpha[i] = this.alpha[n]; this.life[i] = this.life[n]; this.maxLife[i] = this.maxLife[n];
          this.grav[i] = this.grav[n]; this.drag[i] = this.drag[n]; this.grow[i] = this.grow[n];
          i--;
        }
        continue;
      }
      const k = i * 3;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[k] *= d; this.vel[k + 1] = this.vel[k + 1] * d - this.grav[i] * dt; this.vel[k + 2] *= d;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.min(1, t * 2.5) * (t > 0.9 ? (1 - t) * 10 : 1);
      this.size[i] = this.size0[i] * (1 + this.grow[i] * (1 - t));
    }
    this.n = n;
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aAlpha.needsUpdate = true;
    this.mat.uniforms.scale.value = window.innerHeight / 2 / Math.tan(G.camera.fov * Math.PI / 360);
  };

  // ------------------------------------------------------------
  //  Débris en cubes (InstancedMesh avec physique simple)
  // ------------------------------------------------------------
  const DEB_MAX = 700;
  const deb = { n: 0, list: [] };
  const dm = new THREE.Matrix4(), dq = new THREE.Quaternion(), dp = new THREE.Vector3(), ds = new THREE.Vector3(), de = new THREE.Euler(), dc = new THREE.Color();

  FX.init = function (scene) {
    FX.scene = scene;
    FX.glow = new ParticleSystem(2500, true, G.Tex.get('spark'));
    FX.smoke = new ParticleSystem(1500, false, G.Tex.get('smoke'));
    scene.add(FX.glow.points); scene.add(FX.smoke.points);
    const g = new THREE.BoxGeometry(1, 1, 1);
    FX.debMesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff }), DEB_MAX);
    FX.debMesh.count = 0; FX.debMesh.frustumCulled = false; FX.debMesh.castShadow = false;
    for (let i = 0; i < DEB_MAX; i++) FX.debMesh.setColorAt(i, dc.setHex(0xffffff));
    scene.add(FX.debMesh);
    // cubes lumineux (éliminations)
    FX.pixMesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), 600);
    FX.pixMesh.count = 0; FX.pixMesh.frustumCulled = false;
    for (let i = 0; i < 600; i++) FX.pixMesh.setColorAt(i, dc.setHex(0xffffff));
    scene.add(FX.pixMesh);
    FX.pix = [];
    // traçantes
    FX.tracerMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), 96);
    FX.tracerMesh.count = 0; FX.tracerMesh.frustumCulled = false;
    for (let i = 0; i < 96; i++) FX.tracerMesh.setColorAt(i, dc.setHex(0xffffff));
    scene.add(FX.tracerMesh);
    FX.tracers = [];
    // sprites (flash de bouche, boules de feu, anneaux)
    FX.sprites = [];
    FX.spritePool = [];
    // lumière de flash réutilisable
    FX.flashLight = new THREE.PointLight(0xffc060, 0, 14, 2);
    scene.add(FX.flashLight);
    FX.expLight = new THREE.PointLight(0xff8030, 0, 40, 2);
    scene.add(FX.expLight);
    // point faible
    FX.weak = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.Tex.get('weakspot'), transparent: true, depthWrite: false, depthTest: true }));
    FX.weak.scale.set(0.75, 0.75, 1); FX.weak.visible = false; FX.weak.renderOrder = 6;
    scene.add(FX.weak);
    // calque des chiffres de dégâts
    FX.dmgLayer = document.createElement('div');
    FX.dmgLayer.id = 'dmg-layer';
    document.body.appendChild(FX.dmgLayer);
    FX.dmgPool = []; FX.dmgActive = [];
    // impacts de balles (décalcomanies)
    const hc = document.createElement('canvas'); hc.width = hc.height = 32;
    const hx = hc.getContext('2d'); const gr = hx.createRadialGradient(16, 16, 1, 16, 16, 15);
    gr.addColorStop(0, 'rgba(10,8,6,0.95)'); gr.addColorStop(0.45, 'rgba(25,20,15,0.8)'); gr.addColorStop(0.7, 'rgba(60,50,40,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    hx.fillStyle = gr; hx.fillRect(0, 0, 32, 32);
    const ht = new THREE.CanvasTexture(hc);
    FX.holeMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: ht, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), HOLE_MAX);
    FX.holeMesh.frustumCulled = false; FX.holeMesh.renderOrder = 1;
    for (let i = 0; i < HOLE_MAX; i++) FX.holeMesh.setMatrixAt(i, ZERO_M);
    FX.holeMesh.instanceMatrix.needsUpdate = true;
    scene.add(FX.holeMesh);
    FX.holeT = new Float32Array(HOLE_MAX); FX.holeI = 0;
  };
  const HOLE_MAX = 90, ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
  const _hq = new THREE.Quaternion(), _hn = new THREE.Vector3(), _hz = new THREE.Vector3(0, 0, 1), _hp = new THREE.Vector3(), _hs = new THREE.Vector3(1, 1, 1), _hm = new THREE.Matrix4();
  FX.hole = function (x, y, z, nx, ny, nz) {
    if (!FX.holeMesh) return;
    const i = FX.holeI; FX.holeI = (FX.holeI + 1) % HOLE_MAX;
    _hn.set(nx, ny, nz).normalize();
    _hq.setFromUnitVectors(_hz, _hn);
    const s = U.rand(0.7, 1.2); _hs.set(s, s, s);
    _hp.set(x + _hn.x * 0.015, y + _hn.y * 0.015, z + _hn.z * 0.015);
    _hm.compose(_hp, _hq, _hs);
    FX.holeMesh.setMatrixAt(i, _hm); FX.holeMesh.instanceMatrix.needsUpdate = true;
    FX.holeT[i] = 9;
  };

  // ---------- helpers ----------
  const MAT_COL = { wood: [0.62, 0.42, 0.22], stone: [0.62, 0.6, 0.58], metal: [0.72, 0.76, 0.8], glass: [0.7, 0.88, 1.0], dirt: [0.5, 0.4, 0.28], grass: [0.35, 0.6, 0.25], water: [0.8, 0.95, 1.0], sand: [0.9, 0.82, 0.6], snow: [0.95, 0.97, 1] };
  FX.MAT_COL = MAT_COL;

  function addDebris(x, y, z, vx, vy, vz, size, color, life) {
    let d;
    if (deb.list.length < DEB_MAX) { d = {}; deb.list.push(d); }
    else d = deb.list[Math.floor(Math.random() * DEB_MAX)];
    d.x = x; d.y = y; d.z = z; d.vx = vx; d.vy = vy; d.vz = vz; d.s = size; d.life = life || U.rand(1.2, 2.2); d.max = d.life;
    d.rx = Math.random() * 6; d.ry = Math.random() * 6; d.wx = U.rand(-8, 8); d.wy = U.rand(-8, 8);
    d.col = color;
    d.dirty = true;
  }
  FX.addDebris = addDebris;

  // Débris d'une entité détruite
  FX.debris = function (e, c) {
    const col = MAT_COL[e.mat] || MAT_COL.wood;
    const sx = e.maxX - e.minX, sy = e.maxY - e.minY, sz = e.maxZ - e.minZ;
    const vol = Math.min(sx * sy * sz, 60);
    const n = Math.min(26, 6 + Math.floor(vol * 1.2));
    let hex = (Math.floor(col[0] * 255) << 16) | (Math.floor(col[1] * 255) << 8) | Math.floor(col[2] * 255);
    // couleur de l'instance si disponible
    if (e.refs[0] && e.refs[0].color && e.refs[0].color !== 0xffffff) hex = e.refs[0].color;
    for (let i = 0; i < n; i++) {
      const x = e.minX + Math.random() * sx, y = e.minY + Math.random() * sy, z = e.minZ + Math.random() * sz;
      const k = 0.7 + Math.random() * 0.5;
      addDebris(x, y, z, U.rand(-4, 4), U.rand(2, 7), U.rand(-4, 4), U.rand(0.15, 0.5), U.shade(hex, (Math.random() - 0.5) * 0.3), U.rand(1.0, 2.0));
    }
    for (let i = 0; i < Math.min(14, n); i++) {
      const x = e.minX + Math.random() * sx, y = e.minY + Math.random() * sy, z = e.minZ + Math.random() * sz;
      FX.smoke.spawn(x, y, z, U.rand(-1, 1), U.rand(0.3, 1.5), U.rand(-1, 1), col[0] * 1.1 + 0.2, col[1] * 1.1 + 0.2, col[2] * 1.1 + 0.2, U.rand(2, 4), U.rand(0.8, 1.6), -0.3, 1.5, 1.5);
    }
  };
  FX.glass = function (c) {
    for (let i = 0; i < 18; i++) addDebris(c.x + U.rand(-0.6, 0.6), c.y + U.rand(-0.6, 0.6), c.z + U.rand(-0.6, 0.6), U.rand(-3, 3), U.rand(0, 3), U.rand(-3, 3), U.rand(0.05, 0.2), 0xbfe8ff, U.rand(0.8, 1.4));
  };
  // Particules de récolte
  FX.harvest = function (x, y, z, nx, ny, nz, mat, crit) {
    const col = MAT_COL[mat] || MAT_COL.wood;
    const hex = (Math.floor(col[0] * 255) << 16) | (Math.floor(col[1] * 255) << 8) | Math.floor(col[2] * 255);
    for (let i = 0; i < (crit ? 10 : 6); i++) addDebris(x + nx * 0.1, y + ny * 0.1, z + nz * 0.1, nx * U.rand(1, 4) + U.rand(-2, 2), U.rand(1, 4), nz * U.rand(1, 4) + U.rand(-2, 2), U.rand(0.06, 0.16), U.shade(hex, (Math.random() - 0.5) * 0.3), U.rand(0.5, 1.0));
    for (let i = 0; i < 3; i++) FX.smoke.spawn(x, y, z, nx + U.rand(-0.5, 0.5), U.rand(0.2, 1), nz + U.rand(-0.5, 0.5), col[0] + 0.3, col[1] + 0.3, col[2] + 0.3, 0.8, 0.6, 0, 2, 1.5);
    if (crit) for (let i = 0; i < 12; i++) FX.glow.spawn(x, y, z, U.rand(-4, 4), U.rand(-1, 4), U.rand(-4, 4), 0.3, 0.7, 1.0, 0.25, 0.4, 4, 2);
    if (mat === 'metal') for (let i = 0; i < 8; i++) FX.glow.spawn(x, y, z, nx * 3 + U.rand(-3, 3), U.rand(0, 4), nz * 3 + U.rand(-3, 3), 1, 0.8, 0.4, 0.12, 0.3, 9, 1);
  };
  // Impact de balle
  FX.impact = function (x, y, z, nx, ny, nz, mat) {
    const col = MAT_COL[mat] || MAT_COL.stone;
    for (let i = 0; i < 6; i++) FX.glow.spawn(x, y, z, nx * U.rand(1, 5) + U.rand(-2, 2), ny * U.rand(1, 5) + U.rand(-1, 3), nz * U.rand(1, 5) + U.rand(-2, 2), 1, 0.85, 0.5, 0.1, U.rand(0.15, 0.3), 9, 1);
    for (let i = 0; i < 2; i++) FX.smoke.spawn(x + nx * 0.1, y + ny * 0.1, z + nz * 0.1, nx * 0.8, 0.5, nz * 0.8, col[0] + 0.2, col[1] + 0.2, col[2] + 0.2, 0.7, 0.7, -0.2, 2, 2);
    if (mat !== 'metal') for (let i = 0; i < 3; i++) addDebris(x, y, z, nx * 2 + U.rand(-1.5, 1.5), U.rand(1, 3), nz * 2 + U.rand(-1.5, 1.5), 0.05, (Math.floor(col[0] * 200) << 16) | (Math.floor(col[1] * 200) << 8) | Math.floor(col[2] * 200), 0.6);
  };
  FX.waterSplash = function (x, z, big) {
    const n = big ? 30 : 10;
    for (let i = 0; i < n; i++) FX.smoke.spawn(x + U.rand(-0.3, 0.3), 0.1, z + U.rand(-0.3, 0.3), U.rand(-2, 2), U.rand(2, big ? 7 : 4), U.rand(-2, 2), 0.9, 0.97, 1, big ? 1.2 : 0.6, U.rand(0.6, 1.1), 12, 0.5, 1);
  };
  FX.hitSpark = function (x, y, z, shield, head) {
    const c = head ? [1, 0.85, 0.2] : shield ? [0.3, 0.7, 1] : [1, 1, 1];
    for (let i = 0; i < 10; i++) FX.glow.spawn(x, y, z, U.rand(-3, 3), U.rand(-1, 3), U.rand(-3, 3), c[0], c[1], c[2], 0.18, 0.25, 4, 2);
  };
  FX.dust = function (x, y, z, n, size) {
    for (let i = 0; i < (n || 12); i++) {
      const a = Math.random() * Math.PI * 2;
      FX.smoke.spawn(x + Math.cos(a) * 0.4, y + 0.1, z + Math.sin(a) * 0.4, Math.cos(a) * U.rand(1, 3), U.rand(0.2, 0.8), Math.sin(a) * U.rand(1, 3), 0.85, 0.8, 0.7, size || 1.2, U.rand(0.6, 1.2), 0, 2, 2);
    }
  };
  FX.healParticles = function (x, y, z, shield) {
    const c = shield ? [0.3, 0.7, 1] : [0.4, 1, 0.4];
    for (let i = 0; i < 2; i++) FX.glow.spawn(x + U.rand(-0.5, 0.5), y + U.rand(0.2, 1.6), z + U.rand(-0.5, 0.5), 0, U.rand(0.5, 1.5), 0, c[0], c[1], c[2], 0.2, 0.9, 0, 0, 0.5);
  };
  FX.sparkle = function (x, y, z, r, g, b, spread) {
    spread = spread || 0.8;
    FX.glow.spawn(x + U.rand(-spread, spread), y + U.rand(-0.2, spread), z + U.rand(-spread, spread), 0, U.rand(0.2, 0.8), 0, r, g, b, U.rand(0.08, 0.18), U.rand(0.6, 1.2), -0.2, 0.5, 0);
  };
  FX.trail = function (x, y, z, r, g, b, size, life) {
    FX.glow.spawn(x, y, z, U.rand(-0.2, 0.2), U.rand(-0.2, 0.2), U.rand(-0.2, 0.2), r, g, b, size || 0.25, life || 0.8, 0, 0.5, -0.6);
  };

  // ---------- sprites ----------
  function getSprite(texName, additive) {
    let s = FX.spritePool.find((p) => !p.visible && p.userData.tex === texName && p.userData.add === !!additive);
    if (!s) {
      s = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.Tex.get(texName), transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
      s.userData.tex = texName; s.userData.add = !!additive;
      FX.spritePool.push(s); FX.scene.add(s);
    }
    s.visible = true;
    s.material.opacity = 1;
    s.material.rotation = Math.random() * Math.PI * 2;
    return s;
  }
  FX.muzzle = function (x, y, z, big, light) {
    const s = getSprite('muzzle', true);
    s.position.set(x, y, z);
    const sc = big ? 1.4 : 0.8;
    s.scale.set(sc, sc, 1);
    s.material.color.setRGB(1, 1, 1);
    FX.sprites.push({ s, life: 0.05, max: 0.05, grow: 0.5, base: sc });
    if (light) { FX.flashLight.position.set(x, y, z); FX.flashLight.intensity = big ? 30 : 15; FX.flashT = 0.06; }
    FX.smoke.spawn(x, y, z, U.rand(-0.3, 0.3), 0.6, U.rand(-0.3, 0.3), 0.9, 0.9, 0.9, 0.5, 0.5, -0.2, 1, 2);
  };
  FX.explosion = function (x, y, z, radius) {
    radius = radius || 4;
    // boules de feu
    for (let i = 0; i < 6; i++) {
      const s = getSprite('glow', true);
      s.position.set(x + U.rand(-1, 1) * radius * 0.3, y + U.rand(0, 1) * radius * 0.3, z + U.rand(-1, 1) * radius * 0.3);
      s.material.color.setRGB(1, U.rand(0.45, 0.7), 0.15);
      FX.sprites.push({ s, life: U.rand(0.35, 0.6), max: 0.6, grow: 2.2, base: radius * U.rand(0.6, 1.0) });
    }
    const flash = getSprite('glow', true);
    flash.position.set(x, y, z); flash.material.color.setRGB(1, 0.95, 0.8);
    FX.sprites.push({ s: flash, life: 0.12, max: 0.12, grow: 1, base: radius * 2.5 });
    // onde de choc
    const ring = getSprite('ring', true);
    ring.position.set(x, y, z); ring.material.color.setRGB(1, 0.8, 0.5);
    FX.sprites.push({ s: ring, life: 0.35, max: 0.35, grow: 4, base: radius * 0.8 });
    // fumée
    for (let i = 0; i < 26; i++) FX.smoke.spawn(x + U.rand(-1, 1) * radius * 0.5, y + U.rand(0, 1) * radius * 0.4, z + U.rand(-1, 1) * radius * 0.5, U.rand(-3, 3), U.rand(1, 5), U.rand(-3, 3), 0.28, 0.26, 0.25, U.rand(3, 6), U.rand(1.5, 3), -0.5, 1.2, 1.8);
    // étincelles
    for (let i = 0; i < 50; i++) FX.glow.spawn(x, y, z, U.rand(-14, 14), U.rand(-2, 16), U.rand(-14, 14), 1, U.rand(0.5, 0.8), 0.2, U.rand(0.15, 0.35), U.rand(0.4, 1.2), 12, 1.2);
    // débris
    for (let i = 0; i < 16; i++) addDebris(x, y + 0.3, z, U.rand(-9, 9), U.rand(4, 12), U.rand(-9, 9), U.rand(0.1, 0.35), U.pick([0x3a3a3a, 0x5a4a3a, 0x7a6a5a]), U.rand(1.2, 2.2));
    FX.expLight.position.set(x, y + 1, z); FX.expLight.intensity = 400; FX.expT = 0.35;
    if (G.Game && G.Game.shakeAt) G.Game.shakeAt(x, y, z, radius);
  };

  // ---------- traçantes ----------
  FX.tracer = function (x0, y0, z0, x1, y1, z1, color, width) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.5) return;
    // on ne dessine qu'un segment qui avance (plus joli)
    FX.tracers.push({ x0, y0, z0, dx: dx / len, dy: dy / len, dz: dz / len, len, t: 0, speed: 450, seg: Math.min(len, 9), color: color || 0xfff2a0, w: width || 0.05 });
    if (FX.tracers.length > 96) FX.tracers.shift();
  };

  // ---------- point faible ----------
  FX.showWeak = function (x, y, z, nx, ny, nz) {
    FX.weak.position.set(x + nx * 0.12, y + ny * 0.12, z + nz * 0.12);
    FX.weak.visible = true;
    FX.weakT = 0;
  };
  FX.hideWeak = function () { FX.weak.visible = false; };

  // ---------- élimination spectaculaire ----------
  FX.eliminate = function (x, y, z, color) {
    const c = new THREE.Color(color || 0x60c8ff);
    for (let i = 0; i < 90; i++) {
      FX.pix.push({ x: x + U.rand(-0.4, 0.4), y: y + U.rand(0, 1.8), z: z + U.rand(-0.4, 0.4), vx: U.rand(-0.8, 0.8), vy: U.rand(1, 4), vz: U.rand(-0.8, 0.8), s: U.rand(0.06, 0.16), life: U.rand(0.8, 1.8), max: 1.8, c: c.clone().offsetHSL(U.rand(-0.05, 0.05), 0, U.rand(-0.1, 0.2)) });
    }
    if (FX.pix.length > 600) FX.pix.splice(0, FX.pix.length - 600);
    // faisceau vertical
    const s = getSprite('glow', true);
    s.position.set(x, y + 1, z); s.material.color.copy(c);
    FX.sprites.push({ s, life: 0.8, max: 0.8, grow: 1, base: 4 });
    for (let i = 0; i < 40; i++) FX.glow.spawn(x, y + U.rand(0, 1.8), z, U.rand(-2, 2), U.rand(2, 10), U.rand(-2, 2), c.r, c.g, c.b, U.rand(0.1, 0.3), U.rand(0.8, 1.6), -2, 1, 0);
  };

  // ---------- chiffres de dégâts ----------
  // type : 'hp' | 'shield' | 'head' | 'build' | 'weak'
  FX.damageNumber = function (x, y, z, n, type) {
    if (G.Store && !G.Store.data.settings.damageNumbers) return;
    let el = FX.dmgPool.pop();
    if (!el) { el = document.createElement('div'); FX.dmgLayer.appendChild(el); }
    el.className = 'dmg-num ' + (type || 'hp');
    el.textContent = Math.round(n);
    el.style.display = 'block';
    FX.dmgActive.push({ el, x: x + U.rand(-0.3, 0.3), y, z: z + U.rand(-0.3, 0.3), t: 0, vx: U.rand(-40, 40), big: type === 'head' });
  };
  const pv = new THREE.Vector3();
  function updateDamageNumbers(dt) {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = FX.dmgActive.length - 1; i >= 0; i--) {
      const d = FX.dmgActive[i];
      d.t += dt;
      if (d.t > 1.0) { d.el.style.display = 'none'; FX.dmgPool.push(d.el); FX.dmgActive.splice(i, 1); continue; }
      pv.set(d.x, d.y + d.t * 0.8, d.z).project(G.camera);
      if (pv.z > 1) { d.el.style.display = 'none'; continue; }
      d.el.style.display = 'block';
      const sx = (pv.x * 0.5 + 0.5) * w + d.vx * d.t, sy = (-pv.y * 0.5 + 0.5) * h - d.t * 40;
      const pop = d.t < 0.1 ? 0.6 + d.t * 8 : d.t < 0.2 ? 1.4 - (d.t - 0.1) * 4 : 1;
      d.el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) translate(-50%,-50%) scale(' + (pop * (d.big ? 1.25 : 1)).toFixed(2) + ')';
      d.el.style.opacity = d.t > 0.7 ? (1 - (d.t - 0.7) / 0.3).toFixed(2) : '1';
    }
  }
  FX.clearNumbers = function () { for (const d of FX.dmgActive) { d.el.style.display = 'none'; FX.dmgPool.push(d.el); } FX.dmgActive.length = 0; };

  // ------------------------------------------------------------
  FX.update = function (dt) {
    FX.glow.update(dt); FX.smoke.update(dt);
    if (FX.holeT) { let ch = false; for (let i = 0; i < HOLE_MAX; i++) if (FX.holeT[i] > 0) { FX.holeT[i] -= dt; if (FX.holeT[i] <= 0) { FX.holeMesh.setMatrixAt(i, ZERO_M); ch = true; } } if (ch) FX.holeMesh.instanceMatrix.needsUpdate = true; }
    // débris
    const list = deb.list;
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      if (d.life <= 0) continue;
      d.life -= dt;
      d.vy -= 18 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      const gy = G.Terrain.height(d.x, d.z);
      if (d.y < gy + d.s * 0.5) { d.y = gy + d.s * 0.5; d.vy *= -0.35; d.vx *= 0.6; d.vz *= 0.6; d.wx *= 0.5; d.wy *= 0.5; }
      d.rx += d.wx * dt; d.ry += d.wy * dt;
      const k = Math.min(1, d.life / 0.4);
      de.set(d.rx, d.ry, 0); dq.setFromEuler(de); dp.set(d.x, d.y, d.z); ds.setScalar(d.s * k);
      dm.compose(dp, dq, ds);
      FX.debMesh.setMatrixAt(n, dm);
      FX.debMesh.setColorAt(n, dc.setHex(d.col));
      n++;
    }
    FX.debMesh.count = n;
    FX.debMesh.instanceMatrix.needsUpdate = true;
    if (FX.debMesh.instanceColor) FX.debMesh.instanceColor.needsUpdate = true;
    // pixels d'élimination
    let m = 0;
    for (let i = FX.pix.length - 1; i >= 0; i--) {
      const p = FX.pix[i];
      p.life -= dt;
      if (p.life <= 0) { FX.pix.splice(i, 1); continue; }
      p.vy += 2 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const k = Math.min(1, p.life / 0.5);
      dp.set(p.x, p.y, p.z); ds.setScalar(p.s * k); dq.identity();
      dm.compose(dp, dq, ds);
      FX.pixMesh.setMatrixAt(m, dm); FX.pixMesh.setColorAt(m, p.c);
      m++;
    }
    FX.pixMesh.count = m;
    FX.pixMesh.instanceMatrix.needsUpdate = true;
    if (FX.pixMesh.instanceColor) FX.pixMesh.instanceColor.needsUpdate = true;
    // traçantes
    let t = 0;
    for (let i = FX.tracers.length - 1; i >= 0; i--) {
      const tr = FX.tracers[i];
      tr.t += dt * tr.speed;
      if (tr.t - tr.seg > tr.len) { FX.tracers.splice(i, 1); continue; }
      const a = Math.max(0, tr.t - tr.seg), b = Math.min(tr.len, tr.t);
      const mid = (a + b) / 2, l = b - a;
      if (l <= 0.01) continue;
      dp.set(tr.x0 + tr.dx * mid, tr.y0 + tr.dy * mid, tr.z0 + tr.dz * mid);
      dq.setFromUnitVectors(U.v1.set(0, 0, 1), U.v2.set(tr.dx, tr.dy, tr.dz));
      ds.set(tr.w, tr.w, l);
      dm.compose(dp, dq, ds);
      FX.tracerMesh.setMatrixAt(t, dm); FX.tracerMesh.setColorAt(t, dc.setHex(tr.color));
      t++;
    }
    FX.tracerMesh.count = t;
    FX.tracerMesh.instanceMatrix.needsUpdate = true;
    if (FX.tracerMesh.instanceColor) FX.tracerMesh.instanceColor.needsUpdate = true;
    // sprites
    for (let i = FX.sprites.length - 1; i >= 0; i--) {
      const sp = FX.sprites[i];
      sp.life -= dt;
      if (sp.life <= 0) { sp.s.visible = false; FX.sprites.splice(i, 1); continue; }
      const k = 1 - sp.life / sp.max;
      const sc = sp.base * (1 + sp.grow * k);
      sp.s.scale.set(sc, sc, 1);
      sp.s.material.opacity = Math.min(1, (1 - k) * 1.6);
    }
    // lumières
    if (FX.flashT > 0) { FX.flashT -= dt; if (FX.flashT <= 0) FX.flashLight.intensity = 0; }
    if (FX.expT > 0) { FX.expT -= dt; FX.expLight.intensity = Math.max(0, FX.expT / 0.35) * 400; }
    // point faible (pulsation)
    if (FX.weak.visible) { FX.weakT += dt; const s = 0.7 + Math.sin(FX.weakT * 8) * 0.06; FX.weak.scale.set(s, s, 1); }
    updateDamageNumbers(dt);
  };

  FX.clear = function () {
    if (FX.holeMesh) { for (let i = 0; i < HOLE_MAX; i++) { FX.holeMesh.setMatrixAt(i, ZERO_M); FX.holeT[i] = 0; } FX.holeMesh.instanceMatrix.needsUpdate = true; }
    FX.glow.n = 0; FX.smoke.n = 0; deb.list.length = 0; FX.pix.length = 0; FX.tracers.length = 0;
    for (const s of FX.sprites) s.s.visible = false;
    FX.sprites.length = 0;
    FX.clearNumbers();
    FX.hideWeak();
  };
})();
