// ============================================================
//  Terrain : île procédurale (relief, plage, montagne, lac, rivière)
// ============================================================
(function () {
  const U = G.U, M = G.MapData;
  const T = {};
  G.Terrain = T;

  const W = M.W;
  const N = 512;                 // cellules par côté
  const CELL = (W * 2) / N;      // 3.125 m
  T.N = N; T.CELL = CELL; T.W = W;

  let noise, noise2;
  let H;        // Float32Array (N+1)^2
  let poiH = {};

  function coastR(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return M.ISLAND_R + 48 * noise.noise2D(c * 1.2 + 3, s * 1.2 + 7) + 22 * noise.noise2D(c * 3.1 + 11, s * 3.1 - 4) + 8 * noise.noise2D(c * 7 + 1, s * 7 + 2);
  }

  // Relief sans aplanissement des lieux
  function baseHeight(x, z) {
    const r = Math.sqrt(x * x + z * z);
    const a = Math.atan2(z, x);
    const d = coastR(a) - r; // >0 à l'intérieur
    let h;
    if (d < -70) h = -16;
    else if (d < 0) h = U.lerp(-16, -1.4, U.smoothstep(-70, 0, d));
    else h = -1.4 + 4.0 * U.smoothstep(0, 42, d);
    const inland = U.smoothstep(25, 115, d);
    if (inland > 0) {
      const hills = 7 + 8 * noise.fbm(x / 260, z / 260, 4) + 3.5 * noise.fbm(x / 70 + 20, z / 70 - 20, 3);
      h += inland * Math.max(0.5, hills);
      // montagne
      const mm = M.mountain;
      const dm = U.dist2(x, z, mm.x, mm.z);
      if (dm < mm.r) {
        const m = 1 - dm / mm.r;
        const rid = noise.ridged(x / 90, z / 90, 4);
        h += Math.pow(m, 1.45) * mm.h * (0.78 + 0.35 * rid);
      }
      // colline du château
      const ch = M.castleHill;
      const dc = U.dist2(x, z, ch.x, ch.z);
      if (dc < ch.r) h += U.smoothstep(0, 1, 1 - dc / ch.r) * ch.h;
    }
    // île d'attente
    const si = M.spawnIsland;
    const ds = U.dist2(x, z, si.x, si.z);
    if (ds < si.r + 60) {
      const sh = U.lerp(-16, 3.2, U.smoothstep(si.r + 50, si.r - 8, ds)) + (ds < si.r ? 1.2 * noise.noise2D(x / 25, z / 25) : 0);
      h = Math.max(h, sh);
    }
    return h;
  }
  T.baseHeight = baseHeight;

  function fullHeight(x, z) {
    let h = baseHeight(x, z);
    // aplanir les lieux nommés
    for (const p of M.allPlaces()) {
      if (p.noFlatten) continue;
      const d = U.dist2(x, z, p.x, p.z);
      const R = p.r + (p.r > 30 ? 40 : 18);
      if (d < R) {
        const w = U.smoothstep(R, p.r * 0.85, d);
        h = U.lerp(h, poiH[p.id], w);
      }
    }
    // lac
    const L = M.lake;
    const dl = U.dist2(x, z, L.x, L.z);
    const lr = L.r + 10 * noise.noise2D(x / 40, z / 40);
    if (dl < lr + 40) {
      const t = U.smoothstep(lr + 30, lr - 8, dl);
      h = U.lerp(h, -5.5 + 2 * U.smoothstep(lr * 0.2, lr, dl), t);
      // île au centre
      const di = U.dist2(x, z, L.island.x, L.island.z);
      if (di < L.island.r + 12) h = U.lerp(h, 2.6, U.smoothstep(L.island.r + 8, L.island.r - 4, di));
    }
    // rivière
    const hw = M.riverHalfWidth;
    let dr = Math.min(U.distPolyline(x, z, M.river), U.distPolyline(x, z, M.riverOut));
    dr += 2.5 * noise.noise2D(x / 30, z / 30);
    if (dr < hw + 26) {
      const t = U.smoothstep(hw + 22, hw - 1, dr);
      h = U.lerp(h, -3.2, t);
      // berges
      const b = U.smoothstep(hw + 26, hw + 8, dr) * (1 - t);
      h = U.lerp(h, Math.min(h, 1.8), b * 0.6);
    }
    return h;
  }

  T.generate = function () {
    noise = new U.Simplex(M.SEED);
    noise2 = new U.Simplex(M.SEED + 99);
    T.noise = noise; T.noise2 = noise2;
    for (const p of M.allPlaces()) {
      let h = baseHeight(p.x, p.z);
      if (p.id === 'plage') h = 2.4;
      poiH[p.id] = Math.max(2.8, h);
      p.y = poiH[p.id];
    }
    H = new Float32Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) {
      const z = -W + j * CELL;
      for (let i = 0; i <= N; i++) {
        const x = -W + i * CELL;
        H[j * (N + 1) + i] = fullHeight(x, z);
      }
    }
    T.H = H;
    T.poiH = poiH;
  };

  // Modifie la hauteur (utilisé par les lieux, ex: routes) — avant la création du maillage
  T.flattenRect = function (cx, cz, hw, hd, rot, y, blend) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const R = Math.sqrt(hw * hw + hd * hd) + blend;
    const i0 = Math.max(0, Math.floor((cx - R + W) / CELL)), i1 = Math.min(N, Math.ceil((cx + R + W) / CELL));
    const j0 = Math.max(0, Math.floor((cz - R + W) / CELL)), j1 = Math.min(N, Math.ceil((cz + R + W) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -W + i * CELL - cx, z = -W + j * CELL - cz;
      const lx = Math.abs(x * c + z * s), lz = Math.abs(-x * s + z * c);
      const dx = Math.max(0, lx - hw), dz = Math.max(0, lz - hd);
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < blend) {
        const w = 1 - U.smoothstep(0, blend, d);
        const k = j * (N + 1) + i;
        H[k] = U.lerp(H[k], y, w);
      }
    }
  };

  // Hauteur exacte (interpolation triangulaire identique au maillage)
  T.height = function (x, z) {
    let fx = (x + W) / CELL, fz = (z + W) / CELL;
    if (fx < 0 || fz < 0 || fx >= N || fz >= N) return -16;
    const i = Math.floor(fx), j = Math.floor(fz);
    fx -= i; fz -= j;
    const k = j * (N + 1) + i;
    const h00 = H[k], h10 = H[k + 1], h01 = H[k + N + 1], h11 = H[k + N + 2];
    if (fx > fz) return h00 + (h10 - h00) * fx + (h11 - h10) * fz;
    return h00 + (h11 - h01) * fx + (h01 - h00) * fz;
  };
  T.normal = function (x, z, out) {
    const e = 1.0;
    const hl = T.height(x - e, z), hr = T.height(x + e, z), hd = T.height(x, z - e), hu = T.height(x, z + e);
    out = out || new THREE.Vector3();
    out.set(hl - hr, 2 * e, hd - hu).normalize();
    return out;
  };
  T.slope = function (x, z) {
    const e = 1.5;
    const dx = T.height(x + e, z) - T.height(x - e, z), dz = T.height(x, z + e) - T.height(x, z - e);
    return Math.sqrt(dx * dx + dz * dz) / (2 * e);
  };
  T.isWater = (x, z) => T.height(x, z) < -0.3;
  T.surface = function (x, z) {
    const h = T.height(x, z);
    if (h < -0.2) return 'water';
    if (h < 2.2 && T.coastDist(x, z) < 60) return 'sand';
    if (h > T.snowLine(x, z)) return 'snow';
    if (T.slope(x, z) > 1.0) return 'stone';
    return 'grass';
  };
  T.coastDist = function (x, z) {
    const r = Math.sqrt(x * x + z * z);
    return coastR(Math.atan2(z, x)) - r;
  };
  T.snowLine = (x, z) => 70 + 10 * noise.noise2D(x / 50, z / 50);

  // Densité de forêt (0..1), utilisée pour les arbres et la couleur du sol
  T.forest = function (x, z) {
    const n = noise2.fbm(x / 200 + 30, z / 200 - 10, 3);
    let f = U.smoothstep(0.02, 0.35, n);
    const d = T.coastDist(x, z);
    f *= U.smoothstep(40, 90, d);
    for (const p of M.allPlaces()) {
      const dd = U.dist2(x, z, p.x, p.z);
      if (dd < p.r + 30) f *= U.smoothstep(p.r * 0.9, p.r + 30, dd);
    }
    return f;
  };

  // ------------------------------------------------------------
  //  Carte des couleurs (utilisée par le sol ET la mini-carte)
  // ------------------------------------------------------------
  const COL = {
    sand: [226, 205, 150], wetSand: [196, 176, 124], grass: [104, 170, 62], grass2: [86, 152, 52], lush: [72, 140, 48],
    forest: [58, 112, 40], dry: [150, 168, 78], rock: [128, 124, 118], rock2: [104, 100, 96], snow: [240, 245, 250],
    dirt: [140, 112, 76], seabed: [170, 160, 120], deep: [60, 110, 140],
  };
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  T.buildColorMap = function () {
    const S = 1024;
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    const d = img.data;
    const step = (W * 2) / S;
    for (let py = 0; py < S; py++) {
      const z = -W + (py + 0.5) * step;
      for (let px = 0; px < S; px++) {
        const x = -W + (px + 0.5) * step;
        const h = T.height(x, z);
        const cd = T.coastDist(x, z);
        let col;
        if (h < -0.4) {
          col = mix(COL.seabed, COL.deep, U.smoothstep(-1, -12, h));
        } else {
          const n1 = noise.noise2D(x / 60, z / 60), n2 = noise2.noise2D(x / 18, z / 18);
          col = mix(COL.grass, COL.grass2, U.smoothstep(-0.4, 0.6, n1));
          col = mix(col, COL.lush, U.smoothstep(0.3, 0.8, n2) * 0.5);
          col = mix(col, COL.dry, U.smoothstep(0.35, 0.8, noise2.noise2D(x / 140 + 5, z / 140)) * 0.6);
          const f = T.forest(x, z);
          col = mix(col, COL.forest, f * 0.75);
          // plage
          const sandT = U.smoothstep(2.8, 1.6, h) * U.smoothstep(90, 50, cd);
          const bank = U.smoothstep(1.4, 0.3, h);
          col = mix(col, COL.sand, Math.max(sandT, bank * 0.85));
          if (h < 0.4) col = mix(col, COL.wetSand, U.smoothstep(0.4, -0.3, h));
          // roche en pente
          const sl = T.slope(x, z);
          const rockT = U.smoothstep(0.75, 1.15, sl + n2 * 0.15);
          col = mix(col, U.smoothstep(-0.3, 0.3, n2) > 0.5 ? COL.rock : COL.rock2, rockT);
          // neige
          const sn = U.smoothstep(T.snowLine(x, z) - 4, T.snowLine(x, z) + 4, h);
          col = mix(col, COL.snow, sn * (1 - rockT * 0.6));
        }
        const k = (py * S + px) * 4;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // version haute résolution pour dessiner routes / places
    const S2 = 2048;
    const big = document.createElement('canvas'); big.width = S2; big.height = S2;
    const bx = big.getContext('2d');
    bx.imageSmoothingEnabled = true;
    bx.drawImage(c, 0, 0, S2, S2);
    T.colorCanvas = big;
    T.colorCtx = bx;
    T.mapScale = S2 / (W * 2); // pixels par mètre
    return big;
  };
  T.w2c = (x, z) => [(x + W) * T.mapScale, (z + W) * T.mapScale];

  // dessin de routes sur la carte des couleurs
  T.paintRoad = function (pts, w, color, edge) {
    const x = T.colorCtx, s = T.mapScale;
    x.lineCap = 'round'; x.lineJoin = 'round';
    if (edge) {
      x.strokeStyle = edge; x.lineWidth = (w + 2.2) * s;
      x.beginPath(); pts.forEach((p, i) => { const q = T.w2c(p[0], p[1]); if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); }); x.stroke();
    }
    x.strokeStyle = color; x.lineWidth = w * s;
    x.beginPath(); pts.forEach((p, i) => { const q = T.w2c(p[0], p[1]); if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); }); x.stroke();
  };
  T.paintRect = function (cx, cz, w, d, rot, color, alpha) {
    const x = T.colorCtx, s = T.mapScale;
    const q = T.w2c(cx, cz);
    x.save(); x.translate(q[0], q[1]); x.rotate(rot || 0);
    x.globalAlpha = alpha == null ? 1 : alpha;
    x.fillStyle = color; x.fillRect(-w / 2 * s, -d / 2 * s, w * s, d * s);
    x.restore();
  };
  T.paintCircle = function (cx, cz, r, color, alpha) {
    const x = T.colorCtx, s = T.mapScale;
    const q = T.w2c(cx, cz);
    x.globalAlpha = alpha == null ? 1 : alpha;
    x.fillStyle = color; x.beginPath(); x.arc(q[0], q[1], r * s, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 1;
  };
  T.paintSoftCircle = function (cx, cz, r, rgb, alpha) {
    const x = T.colorCtx, s = T.mapScale;
    const q = T.w2c(cx, cz);
    const g = x.createRadialGradient(q[0], q[1], 0, q[0], q[1], r * s);
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')'); g.addColorStop(0.7, 'rgba(' + rgb + ',' + alpha * 0.7 + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.beginPath(); x.arc(q[0], q[1], r * s, 0, Math.PI * 2); x.fill();
  };

  // ------------------------------------------------------------
  //  Maillage (chunks) + matériau avec texture de détail
  // ------------------------------------------------------------
  T.buildMesh = function (scene) {
    const tex = new THREE.CanvasTexture(T.colorCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, G.renderer.capabilities.getMaxAnisotropy());
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    T.colorTex = tex;
    const detail = G.Tex.get('terrainDetail');
    const macro = G.Tex.get('terrainMacro');
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.detailMap = { value: detail };
      sh.uniforms.macroMap = { value: macro };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTWorld = (modelMatrix * vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTWorld;\nuniform sampler2D detailMap;\nuniform sampler2D macroMap;')
        .replace('#include <map_fragment>', `
          vec4 sampledDiffuseColor = texture2D( map, vMapUv );
          float dt = texture2D(detailMap, vTWorld.xz * 0.22).r;
          float dt2 = texture2D(detailMap, vTWorld.xz * 0.047 + 0.3).r;
          float mc = texture2D(macroMap, vTWorld.xz * 0.006).r;
          float det = (dt * 0.55 + dt2 * 0.45) * 2.0;
          det = mix(1.0, det, 0.55) * mix(1.0, mc * 2.0, 0.35);
          diffuseColor *= vec4(sampledDiffuseColor.rgb * det, 1.0);
        `);
    };
    T.material = mat;
    const CH = 8, cellsPer = N / CH; // 8x8 chunks de 64 cellules
    T.chunks = [];
    for (let cj = 0; cj < CH; cj++) for (let ci = 0; ci < CH; ci++) {
      // ignorer les chunks entièrement sous l'eau profonde
      let maxH = -99;
      for (let j = cj * cellsPer; j <= (cj + 1) * cellsPer; j += 2) for (let i = ci * cellsPer; i <= (ci + 1) * cellsPer; i += 2) maxH = Math.max(maxH, H[j * (N + 1) + i]);
      if (maxH < -6) continue;
      const g = chunkGeometry(ci * cellsPer, cj * cellsPer, cellsPer);
      const mesh = new THREE.Mesh(g, mat);
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      scene.add(mesh);
      T.chunks.push(mesh);
    }
  };

  function chunkGeometry(i0, j0, n) {
    const vcount = (n + 1) * (n + 1);
    const pos = new Float32Array(vcount * 3), nor = new Float32Array(vcount * 3), uv = new Float32Array(vcount * 2);
    let p = 0, q = 0;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const gi = i0 + i, gj = j0 + j;
      const x = -W + gi * CELL, z = -W + gj * CELL;
      const h = H[gj * (N + 1) + gi];
      pos[p] = x; pos[p + 1] = h; pos[p + 2] = z;
      const hl = H[gj * (N + 1) + Math.max(0, gi - 1)], hr = H[gj * (N + 1) + Math.min(N, gi + 1)];
      const hd = H[Math.max(0, gj - 1) * (N + 1) + gi], hu = H[Math.min(N, gj + 1) * (N + 1) + gi];
      let nx = hl - hr, ny = 2 * CELL, nz = hd - hu;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nor[p] = nx / l; nor[p + 1] = ny / l; nor[p + 2] = nz / l;
      uv[q] = (x + W) / (2 * W); uv[q + 1] = 1 - (z + W) / (2 * W);
      p += 3; q += 2;
    }
    const idx = new Uint32Array(n * n * 6);
    let k = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      // triangles (00,11,10) et (00,01,11)
      idx[k++] = a; idx[k++] = d; idx[k++] = b;
      idx[k++] = a; idx[k++] = c; idx[k++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }

  // Rafraîchit la texture après avoir peint dessus
  T.refreshColor = function () { if (T.colorTex) T.colorTex.needsUpdate = true; };

  // Trouve un point de terre ferme aléatoire (hors de l'eau)
  T.randomLandPoint = function (rng, cx, cz, radius, minH) {
    rng = rng || Math.random; minH = minH == null ? 1 : minH;
    for (let i = 0; i < 60; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * radius;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (T.height(x, z) > minH && T.coastDist(x, z) > 10) return [x, z];
    }
    return [cx, cz];
  };
})();
