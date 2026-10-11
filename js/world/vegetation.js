// ============================================================
//  Végétation : arbres, rochers, buissons, herbe, fleurs
// ============================================================
(function () {
  const U = G.U, K = G.Kits, W = G.World, P = G.Phys;
  const V = { trees: [], rocks: [], bushes: [], windTime: { value: 0 } };
  G.Veg = V;

  // --- fusion de géométries avec couleurs de sommets ---
  function colored(geo, hex, jitter) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    const n = geo.attributes.position.count;
    const c = new Float32Array(n * 3);
    const col = new THREE.Color(hex);
    for (let i = 0; i < n; i++) {
      const j = jitter ? 1 + (Math.random() - 0.5) * jitter : 1;
      c[i * 3] = col.r * j; c[i * 3 + 1] = col.g * j; c[i * 3 + 2] = col.b * j;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (geo.attributes.uv) geo.deleteAttribute('uv');
    return geo;
  }
  function merge(list) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) {
      pos.set(g.attributes.position.array, o * 3);
      if (!g.attributes.normal) g.computeVertexNormals();
      nor.set(g.attributes.normal.array, o * 3);
      col.set(g.attributes.color.array, o * 3);
      o += g.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  }
  V.merge = merge; V.colored = colored;
  function jitterVerts(geo, amt, seed) {
    const r = U.RNG(seed || 5);
    const p = geo.attributes.position;
    const map = {};
    for (let i = 0; i < p.count; i++) {
      const k = Math.round(p.getX(i) * 100) + '_' + Math.round(p.getY(i) * 100) + '_' + Math.round(p.getZ(i) * 100);
      if (!map[k]) map[k] = [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt];
      p.setXYZ(i, p.getX(i) + map[k][0], p.getY(i) + map[k][1], p.getZ(i) + map[k][2]);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // --- matériau avec vent ---
  function windMaterial(strength, opts) {
    opts = opts || {};
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: opts.flat !== false, side: opts.side || THREE.FrontSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.windTime = V.windTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float windTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #else
            vec3 ip = vec3(0.0);
          #endif
          float hh = max(position.y, 0.0);
          float sw = sin(windTime * 1.6 + ip.x * 0.08 + ip.z * 0.11) * 0.6 + sin(windTime * 3.7 + ip.x * 0.3) * 0.25;
          transformed.x += sw * hh * hh * ${strength.toFixed(4)};
          transformed.z += cos(windTime * 1.3 + ip.z * 0.09) * hh * hh * ${(strength * 0.6).toFixed(4)};`);
    };
    m.customProgramCacheKey = () => 'wind' + strength + (opts.flat === false ? 's' : 'f');
    return m;
  }
  V.windMaterial = windMaterial;

  // ------------------------------------------------------------
  //  Modèles d'arbres (géométries unitaires fusionnées)
  // ------------------------------------------------------------
  const TREE_TYPES = {};
  function buildTreeTypes() {
    // SAPIN
    {
      const parts = [];
      const tr = new THREE.CylinderGeometry(0.22, 0.38, 3, 7); tr.translate(0, 1.5, 0); parts.push(colored(tr, 0x6b4a2e, 0.1));
      const tiers = [[2.2, 3.4, 2.4], [1.75, 3.0, 4.2], [1.3, 2.6, 5.8], [0.8, 2.0, 7.2]];
      tiers.forEach((t, i) => { const c = new THREE.ConeGeometry(t[0], t[1], 8); jitterVerts(c, 0.25, i + 1); c.translate(0, t[2], 0); parts.push(colored(c, [0x2f6b35, 0x357a3a, 0x3b8540, 0x42904a][i], 0.12)); });
      TREE_TYPES.pine = { geo: merge(parts), h: 8.2, trunkR: 0.35, canopy: [2.2, 2.0, 8.2], hp: 250, yield: 40 };
    }
    // SAPIN ENNEIGÉ
    {
      const parts = [];
      const tr = new THREE.CylinderGeometry(0.22, 0.38, 3, 7); tr.translate(0, 1.5, 0); parts.push(colored(tr, 0x5b3e26, 0.1));
      const tiers = [[2.2, 3.4, 2.4], [1.75, 3.0, 4.2], [1.3, 2.6, 5.8], [0.8, 2.0, 7.2]];
      tiers.forEach((t, i) => {
        const c = new THREE.ConeGeometry(t[0], t[1], 8); jitterVerts(c, 0.2, i + 7); c.translate(0, t[2], 0);
        c.toNonIndexed && 0;
        const g = colored(c, 0x2c5e36, 0.1);
        // bouts enneigés : sommets hauts en blanc
        const p = g.attributes.position, col = g.attributes.color;
        for (let k = 0; k < p.count; k++) if (p.getY(k) > t[2] + t[1] * 0.1) col.setXYZ(k, 0.95, 0.97, 1.0);
        parts.push(g);
      });
      TREE_TYPES.snowpine = { geo: merge(parts), h: 8.2, trunkR: 0.35, canopy: [2.2, 2.0, 8.2], hp: 250, yield: 40 };
    }
    // CHÊNE (feuillu rond)
    const leafy = (name, leafCol, trunkCol, seed) => {
      const parts = [];
      const tr = new THREE.CylinderGeometry(0.28, 0.45, 4, 7); tr.translate(0, 2, 0); parts.push(colored(tr, trunkCol || 0x6b4a2e, 0.1));
      const br = new THREE.CylinderGeometry(0.08, 0.16, 2, 5); br.rotateZ(0.8); br.translate(0.7, 3.4, 0); parts.push(colored(br, trunkCol || 0x6b4a2e));
      const blobs = [[0, 5.4, 0, 2.4], [1.5, 4.8, 0.4, 1.7], [-1.4, 4.9, -0.3, 1.8], [0.3, 4.7, 1.5, 1.6], [-0.2, 4.9, -1.5, 1.6], [0.2, 6.4, 0.1, 1.6]];
      blobs.forEach((b, i) => { const s = new THREE.IcosahedronGeometry(b[3], 1); jitterVerts(s, 0.35, seed + i); s.translate(b[0], b[1], b[2]); parts.push(colored(s, U.shade(leafCol, (i % 3 - 1) * 0.08), 0.1)); });
      TREE_TYPES[name] = { geo: merge(parts), h: 7.5, trunkR: 0.42, canopy: [3.0, 3.2, 8.0], hp: 300, yield: 50 };
    };
    leafy('oak', 0x4f9a36, 0x6b4a2e, 11);
    leafy('autumn', 0xe07a28, 0x5a3e28, 21);
    leafy('autumn2', 0xd84a28, 0x5a3e28, 31);
    // BOULEAU
    {
      const parts = [];
      const tr = new THREE.CylinderGeometry(0.16, 0.24, 6, 6); tr.translate(0, 3, 0);
      const g = colored(tr, 0xe8e4dc, 0.05);
      const p = g.attributes.position, col = g.attributes.color;
      for (let k = 0; k < p.count; k++) if (Math.sin(p.getY(k) * 7) > 0.7) col.setXYZ(k, 0.2, 0.2, 0.2);
      parts.push(g);
      [[0, 6.5, 0, 1.5, 2.4], [0.6, 5.5, 0.3, 1.2, 1.8], [-0.5, 5.8, -0.4, 1.2, 1.8]].forEach((b, i) => {
        const s = new THREE.IcosahedronGeometry(1, 1); s.scale(b[3], b[4], b[3]); jitterVerts(s, 0.25, 40 + i); s.translate(b[0], b[1], b[2]); parts.push(colored(s, 0x8cc84a, 0.12));
      });
      TREE_TYPES.birch = { geo: merge(parts), h: 8.5, trunkR: 0.25, canopy: [1.8, 4.2, 8.8], hp: 180, yield: 30 };
    }
    // PALMIER
    {
      const parts = [];
      for (let i = 0; i < 7; i++) {
        const c = new THREE.CylinderGeometry(0.2 - i * 0.012, 0.26 - i * 0.012, 1.25, 6);
        c.translate(Math.pow(i / 7, 2) * 1.4, i * 1.15 + 0.6, 0);
        parts.push(colored(c, i % 2 ? 0x8a6a42 : 0x7a5a38, 0.05));
      }
      const top = [1.4, 8.3, 0];
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const leaf = new THREE.BoxGeometry(3.6, 0.05, 0.7);
        leaf.translate(1.8, 0, 0);
        const pp = leaf.attributes.position;
        for (let k = 0; k < pp.count; k++) { const x = pp.getX(k); pp.setY(k, pp.getY(k) - x * x * 0.09); pp.setZ(k, pp.getZ(k) * (1 - x / 4.5)); }
        leaf.rotateY(a); leaf.translate(top[0], top[1], top[2]);
        parts.push(colored(leaf, i % 2 ? 0x3f9a3a : 0x4aaa42, 0.1));
      }
      const nuts = new THREE.IcosahedronGeometry(0.35, 0); nuts.translate(top[0], top[1] - 0.4, top[2]); parts.push(colored(nuts, 0x5a4020));
      TREE_TYPES.palm = { geo: merge(parts), h: 8.5, trunkR: 0.3, canopy: [3.2, 7.4, 9.0], hp: 180, yield: 30, offX: 0.4 };
    }
    // BUISSON
    {
      const parts = [];
      [[0, 0.6, 0, 1.0], [0.7, 0.5, 0.2, 0.75], [-0.6, 0.5, -0.2, 0.8], [0.1, 0.5, 0.7, 0.7]].forEach((b, i) => {
        const s = new THREE.IcosahedronGeometry(b[3], 1); jitterVerts(s, 0.2, 60 + i); s.translate(b[0], b[1], b[2]); parts.push(colored(s, U.shade(0x3f8a32, (i % 2) * 0.1), 0.12));
      });
      TREE_TYPES.bush = { geo: merge(parts), h: 1.4, bush: true, hp: 80, yield: 8 };
      const p2 = [];
      [[0, 0.6, 0, 1.0], [0.7, 0.5, 0.2, 0.75], [-0.6, 0.5, -0.2, 0.8]].forEach((b, i) => {
        const s = new THREE.IcosahedronGeometry(b[3], 1); jitterVerts(s, 0.2, 70 + i); s.translate(b[0], b[1], b[2]); p2.push(colored(s, 0x3a7a30, 0.1));
      });
      for (let i = 0; i < 6; i++) { const f = new THREE.IcosahedronGeometry(0.14, 0); const a = i * 1.1; f.translate(Math.cos(a) * 0.8, 0.9 + (i % 2) * 0.3, Math.sin(a) * 0.8); p2.push(colored(f, [0xe84a6a, 0xf0e040, 0xffffff][i % 3])); }
      TREE_TYPES.flowerbush = { geo: merge(p2), h: 1.4, bush: true, hp: 80, yield: 8 };
    }
    // ROCHERS (3 variantes)
    for (let v = 0; v < 3; v++) {
      const s = new THREE.IcosahedronGeometry(1, v === 2 ? 1 : 0);
      s.scale(1, 0.7, 1);
      jitterVerts(s, 0.45, 80 + v);
      s.translate(0, 0.25, 0);
      const g = colored(s, 0x8e8a84, 0.15);
      const p = g.attributes.position, col = g.attributes.color, n = g.attributes.normal;
      for (let k = 0; k < p.count; k++) if (n.getY(k) > 0.75) col.setXYZ(k, 0.42, 0.55, 0.3); // mousse
      TREE_TYPES['rock' + v] = { geo: g, h: 1.4, rock: true, hp: 400, yield: 45 };
    }
    for (const k in TREE_TYPES) {
      const t = TREE_TYPES[k];
      const mat = t.rock ? new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }) : windMaterial(t.bush ? 0.02 : k === 'palm' ? 0.0022 : 0.0014);
      K.register('veg_' + k, t.geo, mat, { mat: t.rock ? 'stone' : 'wood' });
    }
  }
  V.TREE_TYPES = TREE_TYPES;

  const tm = new THREE.Matrix4(), tq = new THREE.Quaternion(), tp = new THREE.Vector3(), ts = new THREE.Vector3(), te = new THREE.Euler();

  // Ajoute un arbre / buisson / rocher destructible
  V.add = function (type, x, z, scale, rng, y) {
    const t = TREE_TYPES[type];
    if (!t) return null;
    rng = rng || Math.random;
    scale = scale || 1;
    const gy = y == null ? G.Terrain.height(x, z) - (t.rock ? 0.3 * scale : 0.15) : y;
    const yaw = rng() * Math.PI * 2;
    te.set(t.rock ? (rng() - 0.5) * 0.4 : 0, yaw, t.rock ? (rng() - 0.5) * 0.4 : 0);
    tq.setFromEuler(te);
    const sy = t.rock ? scale * (0.7 + rng() * 0.6) : scale;
    tp.set(x, gy, z); ts.set(scale, sy, scale);
    tm.compose(tp, tq, ts);
    const tint = t.rock ? U.shade(0xffffff, -rng() * 0.25) : (0xffffff);
    const ref = K.addMatrix('veg_' + type, tm, tint);
    const kind = t.rock ? 'rock' : t.bush ? 'bush' : 'tree';
    const e = W.ent(kind, t.rock ? 'stone' : 'wood', Math.round(t.hp * (0.6 + scale * 0.4)), { yield: Math.round(t.yield * scale) });
    W.addRef(e, ref);
    if (t.rock) {
      const r = scale * 0.95, h = sy * 1.05;
      W.addCol(e, P.box(x - r, gy - 0.5, z - r, x + r, gy + h, z + r, e, 3));
    } else if (t.bush) {
      const r = scale * 1.1;
      W.addCol(e, P.box(x - r, gy, z - r, x + r, gy + 1.4 * scale, z + r, e, 4)); // pioche seulement
    } else {
      const r = t.trunkR * scale;
      const ox = t.offX ? 0 : 0;
      W.addCol(e, P.box(x - r, gy - 0.5, z - r, x + r, gy + t.canopy[1] * scale, z + r, e, 3));
      const cr = t.canopy[0] * scale * 0.75;
      if (type === 'palm') {
        const px = x + Math.cos(-yaw) * 1.4 * scale, pz = z + Math.sin(-yaw) * 1.4 * scale;
        W.addCol(e, P.box(px - cr, gy + t.canopy[1] * scale, pz - cr, px + cr, gy + t.canopy[2] * scale, pz + cr, e, 2));
      } else W.addCol(e, P.box(x - cr, gy + t.canopy[1] * scale, z - cr, x + cr, gy + t.canopy[2] * scale, z + cr, e, 2));
    }
    e.pos = new THREE.Vector3(x, gy, z);
    e.vegType = type;
    (t.rock ? V.rocks : t.bush ? V.bushes : V.trees).push(e);
    return e;
  };

  // Zones à éviter (routes, lieux)
  function nearRoad(x, z, margin) {
    for (const r of G.MapData.roads) if (U.distPolyline(x, z, r.pts) < r.w / 2 + margin) return true;
    return false;
  }
  V.nearRoad = nearRoad;
  V.blocked = []; // cercles [x,z,r] interdits (bâtiments)
  function inBlocked(x, z) {
    for (const b of V.blocked) if ((x - b[0]) * (x - b[0]) + (z - b[1]) * (z - b[1]) < b[2] * b[2]) return true;
    return false;
  }
  V.inBlocked = inBlocked;

  let typesBuilt = false;
  V.buildTypes = function () { if (!typesBuilt) { typesBuilt = true; buildTreeTypes(); } };
  V.generate = function () {
    V.buildTypes();
    const T = G.Terrain, M = G.MapData;
    const rng = U.RNG(4242);
    const step = 8.5;
    const W0 = 560;
    for (let gx = -W0; gx < W0; gx += step) for (let gz = -W0; gz < W0; gz += step) {
      const x = gx + rng() * step, z = gz + rng() * step;
      const h = T.height(x, z);
      if (h < 1.2) continue;
      const cd = T.coastDist(x, z);
      if (cd < 5) continue;
      const f = T.forest(x, z);
      const sl = T.slope(x, z);
      if (sl > 1.1) { if (rng() < 0.02) V.add('rock' + Math.floor(rng() * 3), x, z, 1 + rng() * 2.5, rng); continue; }
      let p = f * 0.75 + 0.018;
      // plage : palmiers clairsemés
      const beach = h < 3.2 && cd < 70;
      if (beach) p = 0.06;
      if (rng() > p) {
        // rochers et buissons isolés
        const r2 = rng();
        if (r2 < 0.012 + (h > 50 ? 0.03 : 0)) { if (!nearRoad(x, z, 3) && !inBlocked(x, z) && !inPOI(x, z, 0.8)) V.add('rock' + Math.floor(rng() * 3), x, z, 0.8 + rng() * 2.2, rng); }
        else if (r2 < 0.05 + f * 0.1) { if (!nearRoad(x, z, 2) && !inBlocked(x, z) && !inPOI(x, z, 0.6) && h < T.snowLine(x, z) - 5) V.add(rng() < 0.2 ? 'flowerbush' : 'bush', x, z, 0.8 + rng() * 0.6, rng); }
        continue;
      }
      if (nearRoad(x, z, 4) || inBlocked(x, z) || inPOI(x, z, 1.0)) continue;
      let type;
      if (beach) type = 'palm';
      else if (h > T.snowLine(x, z) - 12) type = 'snowpine';
      else {
        const n = T.noise2.noise2D(x / 150 + 7, z / 150 - 3);
        const autumn = U.dist2(x, z, -150, -150) < 110 || U.dist2(x, z, 200, 380) < 70;
        if (autumn) type = rng() < 0.5 ? 'autumn' : 'autumn2';
        else if (n > 0.25) type = 'pine';
        else if (n < -0.35) type = rng() < 0.6 ? 'birch' : 'oak';
        else type = rng() < 0.55 ? 'oak' : 'pine';
        if (h > 45) type = 'pine';
      }
      V.add(type, x, z, 0.8 + rng() * 0.55, rng);
    }
    // rochers sur la montagne
    for (let i = 0; i < 90; i++) {
      const a = rng() * Math.PI * 2, r = rng() * 190;
      const x = M.mountain.x + Math.cos(a) * r, z = M.mountain.z + Math.sin(a) * r;
      if (T.height(x, z) < 2 || inPOI(x, z, 1)) continue;
      V.add('rock' + Math.floor(rng() * 3), x, z, 1.5 + rng() * 3, rng);
    }
    // rochers de bord de mer
    for (let i = 0; i < 70; i++) {
      const a = rng() * Math.PI * 2;
      const rr = M.ISLAND_R + 20;
      let x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      // chercher la côte
      for (let k = 0; k < 30; k++) { const cd = T.coastDist(x, z); if (Math.abs(cd - 8) < 4) break; x += Math.cos(a) * (cd - 8) * 0.5; z += Math.sin(a) * (cd - 8) * 0.5; }
      if (inPOI(x, z, 1)) continue;
      V.add('rock' + Math.floor(rng() * 3), x, z, 1.2 + rng() * 2.5, rng);
    }
  };
  function inPOI(x, z, k) {
    for (const p of G.MapData.allPlaces()) if (U.dist2(x, z, p.x, p.z) < p.r * k + 6) return true;
    return false;
  }
  V.inPOI = inPOI;

  // ------------------------------------------------------------
  //  HERBE & FLEURS : patchs instanciés autour du joueur
  // ------------------------------------------------------------
  const PATCH = 16;
  let grassGeo, flowerGeo, grassMat, flowerMat;
  const patches = new Map();
  let pool = [];
  V.grassRadius = 60;
  V.grassDensity = 1.0;

  function buildGrassGeo() {
    const parts = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI + Math.random() * 0.3;
      const h = 0.26 + Math.random() * 0.22, w = 0.055;
      const ox = (Math.random() - 0.5) * 0.35, oz = (Math.random() - 0.5) * 0.35;
      const lean = (Math.random() - 0.5) * 0.25;
      const g = new THREE.BufferGeometry();
      const c = Math.cos(a), s = Math.sin(a);
      const v = [ox - c * w, 0, oz - s * w, ox + c * w, 0, oz + s * w, ox + lean * c, h, oz + lean * s];
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([0.8, 0.85, 0.7, 0.8, 0.85, 0.7, 1.45, 1.5, 1.2]), 3));
      parts.push(g);
    }
    grassGeo = merge(parts);
    const fp = [];
    for (let i = 0; i < 2; i++) {
      const stem = new THREE.BufferGeometry();
      stem.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.02, 0, 0, 0.02, 0, 0, 0, 0.4, 0]), 3));
      stem.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
      stem.setAttribute('color', new THREE.BufferAttribute(new Float32Array([0.3, 0.6, 0.2, 0.3, 0.6, 0.2, 0.4, 0.7, 0.3]), 3));
      stem.rotateY(i * Math.PI / 2);
      fp.push(stem);
    }
    const head = new THREE.OctahedronGeometry(0.09, 0); head.scale(1, 0.6, 1); head.translate(0, 0.42, 0);
    fp.push(colored(head, 0xffffff));
    flowerGeo = merge(fp);
    grassMat = windMaterial(0.35, { flat: false, side: THREE.DoubleSide });
    flowerMat = windMaterial(0.3, { flat: true, side: THREE.DoubleSide });
  }

  let colorData = null, colorSize = 0;
  V.captureColor = function () {
    const c = G.Terrain.colorCanvas;
    colorSize = c.width;
    colorData = c.getContext('2d').getImageData(0, 0, colorSize, colorSize).data;
  };
  function sampleColor(x, z) {
    const s = G.Terrain.mapScale;
    const px = Math.floor((x + G.Terrain.W) * s), py = Math.floor((z + G.Terrain.W) * s);
    if (px < 0 || py < 0 || px >= colorSize || py >= colorSize) return null;
    const k = (py * colorSize + px) * 4;
    return [colorData[k], colorData[k + 1], colorData[k + 2]];
  }
  V.sampleColor = sampleColor;

  const gm = new THREE.Matrix4(), gq = new THREE.Quaternion(), gp = new THREE.Vector3(), gs = new THREE.Vector3(), gc = new THREE.Color(), ge = new THREE.Euler();
  const MAXG = 520, MAXF = 40;
  function makePatch() {
    const g = new THREE.InstancedMesh(grassGeo, grassMat, MAXG);
    const f = new THREE.InstancedMesh(flowerGeo, flowerMat, MAXF);
    g.frustumCulled = true; f.frustumCulled = true;
    g.receiveShadow = true;
    G.scene.add(g); G.scene.add(f);
    return { g, f, key: null };
  }
  function fillPatch(pt, ix, iz) {
    const rng = U.RNG((ix * 73856093) ^ (iz * 19349663));
    const T = G.Terrain;
    let n = 0, nf = 0;
    const count = Math.floor(MAXG * V.grassDensity);
    for (let i = 0; i < count; i++) {
      const x = ix * PATCH + rng() * PATCH, z = iz * PATCH + rng() * PATCH;
      const c = sampleColor(x, z);
      if (!c) continue;
      const green = c[1] - Math.max(c[0], c[2]);
      if (green < 18 || c[1] > 225) { rng(); rng(); continue; }
      const y = T.height(x, z);
      if (y < 0.8) { rng(); continue; }
      ge.set(0, rng() * 6.28, 0); gq.setFromEuler(ge);
      const sc = 0.75 + rng() * 0.5;
      gp.set(x, y - 0.03, z); gs.set(sc, sc * (0.75 + green / 220), sc);
      gm.compose(gp, gq, gs);
      pt.g.setMatrixAt(n, gm);
      gc.setRGB(c[0] / 255, c[1] / 255, c[2] / 255);
      gc.convertSRGBToLinear();
      pt.g.setColorAt(n, gc);
      n++;
      if (nf < MAXF && rng() < 0.05 * V.grassDensity) {
        gp.y = y - 0.02; gs.setScalar(0.8 + rng() * 0.5);
        gm.compose(gp, gq, gs);
        pt.f.setMatrixAt(nf, gm);
        gc.setHex(U.pick([0xff5a7a, 0xffe040, 0xffffff, 0xb070ff, 0xff9a30, 0x60a0ff]));
        pt.f.setColorAt(nf, gc);
        nf++;
      }
    }
    pt.g.count = n; pt.f.count = nf;
    pt.g.instanceMatrix.needsUpdate = true; pt.f.instanceMatrix.needsUpdate = true;
    if (pt.g.instanceColor) pt.g.instanceColor.needsUpdate = true;
    if (pt.f.instanceColor) pt.f.instanceColor.needsUpdate = true;
    pt.g.computeBoundingSphere(); pt.f.computeBoundingSphere();
    pt.g.visible = n > 0; pt.f.visible = nf > 0;
  }

  V.initGrass = function () {
    buildGrassGeo();
  };
  V.setGrassQuality = function (q) {
    V.grassRadius = [0, 40, 56, 72][q] || 0;
    V.grassDensity = [0, 0.55, 0.8, 1.0][q] || 0;
    // tout régénérer
    for (const [k, pt] of patches) { pt.g.visible = pt.f.visible = false; pool.push(pt); }
    patches.clear();
  };
  let lastCX = 1e9, lastCZ = 1e9;
  V.updateGrass = function (px, pz, force) {
    if (!grassGeo) return;
    if (V.grassRadius <= 0) { for (const [k, pt] of patches) { pt.g.visible = pt.f.visible = false; pool.push(pt); } patches.clear(); return; }
    const cx = Math.floor(px / PATCH), cz = Math.floor(pz / PATCH);
    if (cx === lastCX && cz === lastCZ && !force) return;
    lastCX = cx; lastCZ = cz;
    const R = Math.ceil(V.grassRadius / PATCH);
    const want = new Set();
    for (let ix = cx - R; ix <= cx + R; ix++) for (let iz = cz - R; iz <= cz + R; iz++) {
      const dx = (ix + 0.5) * PATCH - px, dz = (iz + 0.5) * PATCH - pz;
      if (dx * dx + dz * dz > V.grassRadius * V.grassRadius) continue;
      want.add(ix + ',' + iz);
    }
    for (const [k, pt] of patches) if (!want.has(k)) { pt.g.visible = pt.f.visible = false; pool.push(pt); patches.delete(k); }
    let budget = 40;
    for (const k of want) {
      if (patches.has(k)) continue;
      if (budget-- <= 0) { lastCX = 1e9; break; }
      const pt = pool.pop() || makePatch();
      const [ix, iz] = k.split(',').map(Number);
      fillPatch(pt, ix, iz);
      patches.set(k, pt);
    }
  };
  V.hideGrass = function () { for (const [k, pt] of patches) { pt.g.visible = pt.f.visible = false; pool.push(pt); } patches.clear(); lastCX = 1e9; };

  V.update = function (dt) { V.windTime.value += dt; };
})();
