// ============================================================
//  Espace de noms global + utilitaires mathématiques / bruit
// ============================================================
window.G = window.G || {};

(function () {
  const U = {};
  G.U = U;

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (v - a) / (b - a);
  U.smoothstep = (a, b, v) => {
    const t = U.clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  U.damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
  U.dist2 = (ax, az, bx, bz) => Math.sqrt((ax - bx) * (ax - bx) + (az - bz) * (az - bz));
  U.angleDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  U.dampAngle = (a, b, lambda, dt) => a + U.angleDiff(a, b) * (1 - Math.exp(-lambda * dt));
  U.fmt2 = (n) => (n < 10 ? '0' : '') + n;
  U.fmtTime = (s) => {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ':' + U.fmt2(s % 60);
  };

  // --- RNG déterministe (mulberry32) ---
  U.RNG = function (seed) {
    let a = seed >>> 0;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (a, b) => a + (b - a) * f();
    f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    return f;
  };
  U.rand = (a, b) => a + (b - a) * Math.random();
  U.randInt = (a, b) => Math.floor(a + (b - a + 1) * Math.random());
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.shuffle = (arr, rng) => {
    rng = rng || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  U.weighted = (entries, rng) => {
    // entries: [[value, weight], ...]
    rng = rng || Math.random;
    let tot = 0;
    for (const e of entries) tot += e[1];
    let r = rng() * tot;
    for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
    return entries[entries.length - 1][0];
  };

  // --- Bruit simplex 2D (Stefan Gustavson), graine ---
  U.Simplex = function (seed) {
    const rng = U.RNG(seed || 1);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    const perm = new Uint8Array(512), permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }
    const grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    this.noise2D = function (xin, yin) {
      let n0 = 0, n1 = 0, n2 = 0;
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t);
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) { const gi = permMod12[ii + perm[jj]] * 3; t0 *= t0; n0 = t0 * t0 * (grad3[gi] * x0 + grad3[gi + 1] * y0); }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) { const gi = permMod12[ii + i1 + perm[jj + j1]] * 3; t1 *= t1; n1 = t1 * t1 * (grad3[gi] * x1 + grad3[gi + 1] * y1); }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) { const gi = permMod12[ii + 1 + perm[jj + 1]] * 3; t2 *= t2; n2 = t2 * t2 * (grad3[gi] * x2 + grad3[gi + 1] * y2); }
      return 70 * (n0 + n1 + n2);
    };
    this.fbm = function (x, y, oct, lac, gain) {
      oct = oct || 4; lac = lac || 2; gain = gain || 0.5;
      let a = 1, f = 1, s = 0, n = 0;
      for (let o = 0; o < oct; o++) { s += a * this.noise2D(x * f, y * f); n += a; a *= gain; f *= lac; }
      return s / n;
    };
    this.ridged = function (x, y, oct) {
      oct = oct || 4;
      let a = 1, f = 1, s = 0, n = 0;
      for (let o = 0; o < oct; o++) { s += a * (1 - Math.abs(this.noise2D(x * f, y * f))); n += a; a *= 0.5; f *= 2; }
      return s / n;
    };
  };

  // Distance point-segment 2D
  U.distSeg = (px, pz, ax, az, bx, bz) => {
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz;
    let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + dx * t, cz = az + dz * t;
    return Math.sqrt((px - cx) * (px - cx) + (pz - cz) * (pz - cz));
  };
  U.distPolyline = (px, pz, pts) => {
    let best = 1e9;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = U.distSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (d < best) best = d;
    }
    return best;
  };

  // Couleurs
  U.hexToRgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
  U.rgbStr = (r, g, b) => 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  U.shade = (hex, f) => {
    // f>0 éclaircit, f<0 assombrit
    let r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
  };
  U.hexStr = (hex) => '#' + ('000000' + hex.toString(16)).slice(-6);

  // Vecteurs temporaires réutilisables
  // Vecteurs réutilisables : à utiliser dans les boucles de jeu plutôt
  // que d'allouer un nouveau Vector3 à chaque frame (le ramasse-miettes
  // finit par costing cher sur PC modestes).
  U.v1 = new THREE.Vector3(); U.v2 = new THREE.Vector3(); U.v3 = new THREE.Vector3();
  U.v4 = new THREE.Vector3(); U.v5 = new THREE.Vector3(); U.v6 = new THREE.Vector3();
  U.v7 = new THREE.Vector3(); U.v8 = new THREE.Vector3();
  U.q1 = new THREE.Quaternion(); U.m1 = new THREE.Matrix4(); U.e1 = new THREE.Euler();

  // Chronomètre de profilage léger
  U.now = () => performance.now();

  // Cache de géométries partagées (évite les fuites mémoire GPU entre les parties)
  const GC = {};
  U.geo = function (type) {
    const args = Array.prototype.slice.call(arguments, 1);
    const key = type + ':' + args.map((a) => (typeof a === 'number' ? Math.round(a * 1000) / 1000 : a)).join(',');
    let g = GC[key];
    if (!g) {
      g = new THREE[type](...args);
      g.userData.shared = true;
      GC[key] = g;
    }
    return g;
  };
})();
