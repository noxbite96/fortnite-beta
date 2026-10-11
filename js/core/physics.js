// ============================================================
//  Physique : grille spatiale, collisions personnages, lancer de rayons
// ============================================================
(function () {
  const U = G.U;
  const P = {};
  G.Phys = P;

  const CS = 8;               // taille de cellule
  const grid = new Map();
  let stamp = 1;
  P.MOVE = 1; P.BULLET = 2; P.ALL = 3;
  P.count = 0;

  const key = (ix, iz) => (ix + 1024) * 4096 + (iz + 1024);

  // kind : 0 = boîte, 1 = rampe, 2 = toit pyramidal
  P.box = function (minX, minY, minZ, maxX, maxY, maxZ, ent, mask) {
    return { minX, minY, minZ, maxX, maxY, maxZ, kind: 0, dir: 0, ent: ent || null, mask: mask == null ? 3 : mask, st: 0, cells: null, th: 0.3 };
  };
  P.ramp = function (minX, minY, minZ, maxX, maxY, maxZ, dir, ent, mask) {
    const c = P.box(minX, minY, minZ, maxX, maxY, maxZ, ent, mask); c.kind = 1; c.dir = dir; return c;
  };
  P.roof = function (minX, minY, minZ, maxX, maxY, maxZ, ent, mask) {
    const c = P.box(minX, minY, minZ, maxX, maxY, maxZ, ent, mask); c.kind = 2; return c;
  };

  P.add = function (c) {
    if (c.cells) return c;
    c.cells = [];
    const x0 = Math.floor(c.minX / CS), x1 = Math.floor(c.maxX / CS), z0 = Math.floor(c.minZ / CS), z1 = Math.floor(c.maxZ / CS);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = key(ix, iz);
      let arr = grid.get(k);
      if (!arr) { arr = []; grid.set(k, arr); }
      arr.push(c);
      c.cells.push(arr);
    }
    P.count++;
    return c;
  };
  P.remove = function (c) {
    if (!c.cells) return;
    for (const arr of c.cells) {
      const i = arr.indexOf(c);
      if (i >= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); }
    }
    c.cells = null;
    P.count--;
  };

  P.query = function (minX, minY, minZ, maxX, maxY, maxZ, mask, out) {
    out = out || [];
    out.length = 0;
    stamp++;
    const x0 = Math.floor(minX / CS), x1 = Math.floor(maxX / CS), z0 = Math.floor(minZ / CS), z1 = Math.floor(maxZ / CS);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const arr = grid.get(key(ix, iz));
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i];
        if (c.st === stamp) continue;
        c.st = stamp;
        if (!(c.mask & mask)) continue;
        if (c.maxX < minX || c.minX > maxX || c.maxY < minY || c.minY > maxY || c.maxZ < minZ || c.minZ > maxZ) continue;
        out.push(c);
      }
    }
    return out;
  };

  // hauteur de la surface d'une rampe / d'un toit en (x,z)
  P.surfY = function (c, x, z) {
    const h = c.maxY - c.minY;
    if (c.kind === 1) {
      let t;
      if (c.dir === 0) t = (x - c.minX) / (c.maxX - c.minX);
      else if (c.dir === 1) t = (z - c.minZ) / (c.maxZ - c.minZ);
      else if (c.dir === 2) t = (c.maxX - x) / (c.maxX - c.minX);
      else t = (c.maxZ - z) / (c.maxZ - c.minZ);
      return c.minY + U.clamp(t, 0, 1) * h;
    }
    if (c.kind === 2) {
      const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
      const hw = (c.maxX - c.minX) / 2, hd = (c.maxZ - c.minZ) / 2;
      const t = 1 - Math.max(Math.abs(x - cx) / hw, Math.abs(z - cz) / hd);
      return c.minY + U.clamp(t, 0, 1) * h;
    }
    return c.maxY;
  };

  // ------------------------------------------------------------
  //  Hauteur du sol sous un point (terrain + constructions)
  // ------------------------------------------------------------
  const tmp = [];
  P.groundAt = function (x, z, y, r, stepH) {
    r = r || 0.3; stepH = stepH == null ? 0.55 : stepH;
    let best = G.Terrain.height(x, z);
    let bestCol = null;
    const list = P.query(x - r, y - 60, z - r, x + r, y + stepH + 0.01, z + r, P.MOVE, tmp);
    for (const c of list) {
      let top;
      if (c.kind === 0) top = c.maxY;
      else {
        if (x < c.minX || x > c.maxX || z < c.minZ || z > c.maxZ) continue;
        top = P.surfY(c, x, z);
      }
      if (top <= y + stepH && top > best) { best = top; bestCol = c; }
    }
    P.lastGroundCol = bestCol;
    return best;
  };

  // ------------------------------------------------------------
  //  Déplacement d'un personnage (boîte englobante verticale)
  //  c : { pos, vel, radius, height, grounded, stepH }
  // ------------------------------------------------------------
  const near = [];
  P.moveCharacter = function (c, dt) {
    const p = c.pos, v = c.vel;
    // Noclip admin : la boîte traverse les obstacles. Le drapeau est
    // posé par le joueur ET validé par G.Server.canDev(), donc un
    // simple client ne peut pas s'attribuer la traversée.
    if (c.noclip) { p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt; c.grounded = false; c.blocked = false; c.groundCol = null; c.hitCeiling = false; return; }
    const r = c.radius, h = c.height;
    const stepH = c.stepH == null ? 0.6 : c.stepH;
    const wasGrounded = c.grounded;
    c.grounded = false; c.blocked = false; c.groundCol = null; c.hitCeiling = false;
    const dx = v.x * dt, dy = v.y * dt, dz = v.z * dt;
    const steps = Math.min(12, Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.3), Math.ceil(Math.abs(dy) / 0.6)));
    const sx = dx / steps, sy = dy / steps, sz = dz / steps;
    // collecte des obstacles proches une seule fois
    const ext = Math.abs(dx) + Math.abs(dz) + r + 1;
    const list = P.query(p.x - ext, p.y + Math.min(0, dy) - 2, p.z - ext, p.x + ext, p.y + h + Math.max(0, dy) + 1, p.z + ext, P.MOVE, near);
    // obstacles dans lesquels on est déjà coincé : ignorés pour pouvoir en sortir
    moveId++;
    for (const col of list) if (overlaps(col, p.x, p.y, p.z, r, h, stepH)) col._in = moveId;
    for (let s = 0; s < steps; s++) {
      // --- X ---
      if (sx !== 0) {
        const ox = p.x;
        p.x += sx;
        if (blockedAt(list, p.x, p.y, p.z, r, h, stepH)) { p.x = ox; c.blocked = true; v.x *= 0.0; }
      }
      // --- Z ---
      if (sz !== 0) {
        const oz = p.z;
        p.z += sz;
        if (blockedAt(list, p.x, p.y, p.z, r, h, stepH)) { p.z = oz; c.blocked = true; v.z *= 0.0; }
      }
      // --- Y ---
      const oy = p.y;
      p.y += sy;
      // plafond
      if (sy > 0) {
        for (const col of list) {
          if (col.kind !== 0) {
            if (p.x < col.minX || p.x > col.maxX || p.z < col.minZ || p.z > col.maxZ) continue;
            const su = P.surfY(col, p.x, p.z);
            const under = su - col.th;
            if (oy + h <= under + 0.05 && p.y + h > under) { p.y = under - h; v.y = Math.min(v.y, 0); c.hitCeiling = true; }
            continue;
          }
          if (p.x + r <= col.minX || p.x - r >= col.maxX || p.z + r <= col.minZ || p.z - r >= col.maxZ) continue;
          if (oy + h <= col.minY + 0.05 && p.y + h > col.minY) { p.y = col.minY - h; v.y = Math.min(v.y, 0); c.hitCeiling = true; }
        }
      }
      // sol
      const gnd = supportAt(list, p.x, p.z, Math.max(oy, p.y), r, stepH);
      if (p.y <= gnd + 0.001) {
        p.y = gnd; if (v.y < 0) { c.impactVel = v.y; v.y = 0; }
        c.grounded = true; c.groundCol = P.lastSupport;
      }
    }
    // collage au sol en descente
    if (!c.grounded && wasGrounded && v.y <= 0.01 && !c.noSnap) {
      const gnd = supportAt(list, p.x, p.z, p.y, r, stepH);
      if (p.y - gnd < 0.45) { p.y = gnd; c.grounded = true; c.groundCol = P.lastSupport; if (v.y < 0) v.y = 0; }
    }
    return c.grounded;
  };

  let moveId = 0;
  function overlaps(c, x, y, z, r, h, stepH) {
    if (c.kind === 0) {
      if (x + r <= c.minX || x - r >= c.maxX || z + r <= c.minZ || z - r >= c.maxZ) return false;
      if (y + h <= c.minY || y >= c.maxY) return false;
      return c.maxY - y > stepH;
    }
    if (x < c.minX || x > c.maxX || z < c.minZ || z > c.maxZ) return false;
    const su = P.surfY(c, x, z);
    return su - y > stepH && y + h > su - c.th - 0.02 && y < su;
  }

  function blockedAt(list, x, y, z, r, h, stepH) {
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c._in === moveId) continue;
      if (c.kind === 0) {
        if (x + r <= c.minX || x - r >= c.maxX || z + r <= c.minZ || z - r >= c.maxZ) continue;
        if (y + h <= c.minY || y >= c.maxY) continue;
        if (c.maxY - y <= stepH) continue; // marche franchissable
        return true;
      } else {
        if (x < c.minX || x > c.maxX || z < c.minZ || z > c.maxZ) continue;
        const su = P.surfY(c, x, z);
        if (su - y <= stepH) continue; // on peut monter dessus
        if (y + h <= su - c.th - 0.02) continue; // on passe dessous
        if (y >= su) continue;
        return true;
      }
    }
    return false;
  }

  function supportAt(list, x, z, y, r, stepH) {
    let best = G.Terrain.height(x, z);
    P.lastSupport = null;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      let top;
      if (c.kind === 0) {
        if (x + r <= c.minX || x - r >= c.maxX || z + r <= c.minZ || z - r >= c.maxZ) continue;
        top = c.maxY;
      } else {
        if (x < c.minX || x > c.maxX || z < c.minZ || z > c.maxZ) continue;
        top = P.surfY(c, x, z);
      }
      if (top <= y + stepH && top > best) { best = top; P.lastSupport = c; }
    }
    return best;
  }
  P.supportAt = function (x, z, y, r, stepH) {
    const list = P.query(x - r - 0.1, y - 50, z - r - 0.1, x + r + 0.1, y + (stepH || 0.6) + 0.1, z + r + 0.1, P.MOVE, near);
    return supportAt(list, x, z, y, r || 0.3, stepH == null ? 0.6 : stepH);
  };
  // vrai si un personnage pourrait tenir à cette position
  P.freeAt = function (x, y, z, r, h) {
    const list = P.query(x - r - 0.1, y - 1, z - r - 0.1, x + r + 0.1, y + h + 0.1, z + r + 0.1, P.MOVE, near);
    moveId++;
    return !blockedAt(list, x, y, z, r, h, 0.05);
  };

  // ------------------------------------------------------------
  //  Lancer de rayon
  // ------------------------------------------------------------
  const hit = { t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0, col: null, ent: null, terrain: false, water: false };
  P.hit = hit;

  function rayBox(c, ox, oy, oz, dx, dy, dz, maxT) {
    let tmin = 0, tmax = maxT, nAxis = -1, nSign = 0;
    // X
    if (Math.abs(dx) < 1e-9) { if (ox < c.minX || ox > c.maxX) return -1; }
    else {
      const inv = 1 / dx;
      let t1 = (c.minX - ox) * inv, t2 = (c.maxX - ox) * inv, s = -1;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
      if (t1 > tmin) { tmin = t1; nAxis = 0; nSign = s; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    if (Math.abs(dy) < 1e-9) { if (oy < c.minY || oy > c.maxY) return -1; }
    else {
      const inv = 1 / dy;
      let t1 = (c.minY - oy) * inv, t2 = (c.maxY - oy) * inv, s = -1;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
      if (t1 > tmin) { tmin = t1; nAxis = 1; nSign = s; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    if (Math.abs(dz) < 1e-9) { if (oz < c.minZ || oz > c.maxZ) return -1; }
    else {
      const inv = 1 / dz;
      let t1 = (c.minZ - oz) * inv, t2 = (c.maxZ - oz) * inv, s = -1;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
      if (t1 > tmin) { tmin = t1; nAxis = 2; nSign = s; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    if (nAxis < 0) return -1; // origine à l'intérieur : ignoré
    rayBox.nAxis = nAxis; rayBox.nSign = nSign; rayBox.tmax = tmax;
    return tmin;
  }

  function raySurface(c, ox, oy, oz, dx, dy, dz, maxT) {
    // rampes / toits : on avance dans la boîte jusqu'à croiser la surface
    const t0 = rayBoxEnter(c, ox, oy, oz, dx, dy, dz, maxT);
    if (t0 < 0) return -1;
    const t1 = rayBox.tmax;
    const n = 10;
    let prevT = t0, prevAbove = null;
    for (let i = 0; i <= n; i++) {
      const t = t0 + (t1 - t0) * (i / n);
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      const su = P.surfY(c, x, z);
      const above = y > su;
      if (prevAbove === null) { prevAbove = above; if (!above && y > su - c.th - 0.05) return t; prevT = t; continue; }
      if (above !== prevAbove) {
        // affinage
        let a = prevT, b = t;
        for (let k = 0; k < 6; k++) {
          const m = (a + b) / 2;
          const yy = oy + dy * m, ss = P.surfY(c, ox + dx * m, oz + dz * m);
          if ((yy > ss) === prevAbove) a = m; else b = m;
        }
        return (a + b) / 2;
      }
      prevT = t;
    }
    return -1;
  }
  function rayBoxEnter(c, ox, oy, oz, dx, dy, dz, maxT) {
    let tmin = 0, tmax = maxT;
    const ax = [[dx, ox, c.minX, c.maxX], [dy, oy, c.minY, c.maxY], [dz, oz, c.minZ, c.maxZ]];
    for (let i = 0; i < 3; i++) {
      const d = ax[i][0], o = ax[i][1];
      if (Math.abs(d) < 1e-9) { if (o < ax[i][2] || o > ax[i][3]) return -1; continue; }
      let t1 = (ax[i][2] - o) / d, t2 = (ax[i][3] - o) / d;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    rayBox.tmax = tmax;
    return tmin;
  }

  // opts : { mask, ignore (entité), terrain (bool, défaut vrai), water (bool) }
  P.raycast = function (ox, oy, oz, dx, dy, dz, maxT, opts) {
    const mask = opts && opts.mask || P.BULLET;
    const ignore = opts && opts.ignore;
    const ignore2 = opts && opts.ignore2;
    let best = maxT, bestCol = null, bnx = 0, bny = 0, bnz = 0;
    stamp++;
    // DDA sur la grille XZ
    let ix = Math.floor(ox / CS), iz = Math.floor(oz / CS);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tDX = Math.abs(dx) > 1e-9 ? Math.abs(CS / dx) : 1e9, tDZ = Math.abs(dz) > 1e-9 ? Math.abs(CS / dz) : 1e9;
    let tMX = Math.abs(dx) > 1e-9 ? ((dx > 0 ? (ix + 1) * CS - ox : ox - ix * CS) / Math.abs(dx)) : 1e9;
    let tMZ = Math.abs(dz) > 1e-9 ? ((dz > 0 ? (iz + 1) * CS - oz : oz - iz * CS) / Math.abs(dz)) : 1e9;
    let tCell = 0;
    for (let iter = 0; iter < 400; iter++) {
      const arr = grid.get(key(ix, iz));
      if (arr) {
        for (let i = 0; i < arr.length; i++) {
          const c = arr[i];
          if (c.st === stamp) continue;
          c.st = stamp;
          if (!(c.mask & mask)) continue;
          if (ignore && (c.ent === ignore || c.ent === ignore2)) continue;
          if (c.ent && c.ent.dead) continue;
          let t;
          if (c.kind === 0) {
            t = rayBox(c, ox, oy, oz, dx, dy, dz, best);
            if (t >= 0 && t < best) {
              best = t; bestCol = c;
              bnx = rayBox.nAxis === 0 ? rayBox.nSign : 0; bny = rayBox.nAxis === 1 ? rayBox.nSign : 0; bnz = rayBox.nAxis === 2 ? rayBox.nSign : 0;
            }
          } else {
            t = raySurface(c, ox, oy, oz, dx, dy, dz, best);
            if (t >= 0 && t < best) { best = t; bestCol = c; bnx = 0; bny = 1; bnz = 0; }
          }
        }
      }
      // cellule suivante
      if (tMX < tMZ) { tCell = tMX; tMX += tDX; ix += stepX; } else { tCell = tMZ; tMZ += tDZ; iz += stepZ; }
      if (tCell > best || tCell > maxT) break;
    }
    hit.terrain = false; hit.water = false;
    // terrain
    if (!opts || opts.terrain !== false) {
      const tt = rayTerrain(ox, oy, oz, dx, dy, dz, best);
      if (tt >= 0 && tt < best) {
        best = tt; bestCol = null; hit.terrain = true;
        const n = G.Terrain.normal(ox + dx * tt, oz + dz * tt, U.v3);
        bnx = n.x; bny = n.y; bnz = n.z;
      }
    }
    // eau
    if (opts && opts.water && dy < 0 && oy > 0) {
      const tw = -oy / dy;
      if (tw < best) { best = tw; bestCol = null; hit.terrain = false; hit.water = true; bnx = 0; bny = 1; bnz = 0; }
    }
    if (best >= maxT && !bestCol) return null;
    hit.t = best; hit.x = ox + dx * best; hit.y = oy + dy * best; hit.z = oz + dz * best;
    hit.nx = bnx; hit.ny = bny; hit.nz = bnz; hit.col = bestCol; hit.ent = bestCol ? bestCol.ent : null;
    return hit;
  };

  function rayTerrain(ox, oy, oz, dx, dy, dz, maxT) {
    const T = G.Terrain;
    let step = 1.2;
    let t = 0;
    let prevT = 0;
    let prevD = oy - T.height(ox, oz);
    if (prevD < 0) return -1;
    while (t < maxT) {
      t = Math.min(maxT, t + step);
      const y = oy + dy * t;
      const x = ox + dx * t, z = oz + dz * t;
      const d = y - T.height(x, z);
      if (d < 0) {
        let a = prevT, b = t;
        for (let k = 0; k < 8; k++) {
          const m = (a + b) / 2;
          const dd = oy + dy * m - T.height(ox + dx * m, oz + dz * m);
          if (dd > 0) a = m; else b = m;
        }
        return (a + b) / 2;
      }
      // pas adaptatif : plus on est haut, plus on peut avancer vite
      step = U.clamp(d * 0.5, 0.8, 12);
      if (y > 170 && dy >= 0) return -1;
      prevT = t;
      if (t >= maxT) break;
    }
    return -1;
  }

  // Ligne de vue dégagée ?
  P.los = function (ax, ay, az, bx, by, bz, ignore, ignore2) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 0.01) return true;
    const h = P.raycast(ax, ay, az, dx / d, dy / d, dz / d, d, { ignore, ignore2 });
    return !h;
  };
})();
