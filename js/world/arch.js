// ============================================================
//  Architecture : générateurs de bâtiments, meubles, props
//  Repère local (frame) : origine + rotation par pas de 90°
// ============================================================
(function () {
  const U = G.U, K = G.Kits, W = G.World, P = G.Phys;
  const A = { lootSpots: [], chestSpots: [], ammoSpots: [], doors: [], lights: [] };
  G.Arch = A;

  A.frame = (x, y, z, rot) => ({ x, y, z, rot: ((rot || 0) % 4 + 4) % 4 });
  // local -> monde
  A.tp = function (f, lx, lz) {
    switch (f.rot) {
      case 0: return [f.x + lx, f.z + lz];
      case 1: return [f.x + lz, f.z - lx];
      case 2: return [f.x - lx, f.z - lz];
      default: return [f.x - lz, f.z + lx];
    }
  };
  A.tsize = (f, sx, sz) => (f.rot % 2 ? [sz, sx] : [sx, sz]);
  A.tyaw = (f) => f.rot * Math.PI / 2;

  // Boîte axis-alignée : ajoute visuel + collision, rattachée à une entité
  // col : true (défaut) / false / masque
  A.box = function (f, e, kit, lx, ly, lz, sx, sy, sz, color, col) {
    const p = A.tp(f, lx, lz), s = A.tsize(f, sx, sz);
    const y = f.y + ly;
    const ref = K.add(kit, p[0], y, p[1], s[0], sy, s[1], color);
    if (e) W.addRef(e, ref);
    if (col !== false && e) {
      const mask = col === true || col == null ? 3 : col;
      W.addCol(e, P.box(p[0] - s[0] / 2, y - sy / 2, p[1] - s[1] / 2, p[0] + s[0] / 2, y + sy / 2, p[1] + s[1] / 2, e, mask));
    } else if (e) W.bounds(e, p[0] - s[0] / 2, y - sy / 2, p[1] - s[1] / 2, p[0] + s[0] / 2, y + sy / 2, p[1] + s[1] / 2);
    return ref;
  };
  // Visuel orienté quelconque (sans collision)
  A.deco = function (f, e, kit, lx, ly, lz, sx, sy, sz, color, rx, ry, rz) {
    const p = A.tp(f, lx, lz);
    const ref = K.add(kit, p[0], f.y + ly, p[1], sx, sy, sz, color, rx || 0, (ry || 0) + A.tyaw(f), rz || 0);
    if (e) { W.addRef(e, ref); W.bounds(e, p[0] - 0.3, f.y + ly - sy / 2, p[1] - 0.3, p[0] + 0.3, f.y + ly + sy / 2, p[1] + 0.3); }
    return ref;
  };
  // Collision seule
  A.colBox = function (f, e, lx, ly, lz, sx, sy, sz, mask) {
    const p = A.tp(f, lx, lz), s = A.tsize(f, sx, sz);
    const y = f.y + ly;
    return W.addCol(e, P.box(p[0] - s[0] / 2, y - sy / 2, p[1] - s[1] / 2, p[0] + s[0] / 2, y + sy / 2, p[1] + s[1] / 2, e, mask == null ? 3 : mask));
  };
  // Rampe : montée vers ldir (0:+x,1:+z,2:-x,3:-z en local)
  A.rampCol = function (f, e, lx, ly0, lz, sx, h, sz, ldir) {
    const p = A.tp(f, lx, lz), s = A.tsize(f, sx, sz);
    // conversion direction locale -> monde
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const d = dirs[ldir];
    let wx, wz;
    switch (f.rot) { case 0: wx = d[0]; wz = d[1]; break; case 1: wx = d[1]; wz = -d[0]; break; case 2: wx = -d[0]; wz = -d[1]; break; default: wx = -d[1]; wz = d[0]; }
    const wd = wx === 1 ? 0 : wz === 1 ? 1 : wx === -1 ? 2 : 3;
    const y = f.y + ly0;
    return W.addCol(e, P.ramp(p[0] - s[0] / 2, y, p[1] - s[1] / 2, p[0] + s[0] / 2, y + h, p[1] + s[1] / 2, wd, e));
  };

  A.ent = (type, mat, hp, opts) => W.ent(type, mat, hp, opts);

  // Points de loot (en coordonnées monde)
  A.loot = function (f, lx, ly, lz) { const p = A.tp(f, lx, lz); A.lootSpots.push([p[0], f.y + ly, p[1]]); };
  A.chest = function (f, lx, ly, lz, rotL) { const p = A.tp(f, lx, lz); A.chestSpots.push([p[0], f.y + ly, p[1], A.tyaw(f) + (rotL || 0)]); };
  A.ammo = function (f, lx, ly, lz, rotL) { const p = A.tp(f, lx, lz); A.ammoSpots.push([p[0], f.y + ly, p[1], A.tyaw(f) + (rotL || 0)]); };

  // ------------------------------------------------------------
  //  Murs avec ouvertures
  // ------------------------------------------------------------
  // Mur le long de X local, centré en (lx, lz), longueur len, épaisseur th, hauteur h depuis ly
  // type : 'solid' | 'window' | 'door' | 'wide' | 'open'
  A.wallSeg = function (f, kit, color, lx, ly, lz, len, h, th, type, o) {
    o = o || {};
    const mat = o.mat || K.matOf(kit);
    const hp = o.hp || (mat === 'stone' ? 300 : mat === 'metal' ? 400 : 200);
    const e = A.ent('piece', mat, hp, { structural: true, grounded: ly <= 0.6, yield: o.yield || 18 });
    const inner = o.inner, innerColor = o.innerColor;
    // helper qui gère orientation (le mur peut être le long de Z si o.alongZ)
    const bx = (cx, cy, sx, sy) => {
      if (o.alongZ) A.box(f, e, kit, lx, ly + cy, lz + cx, th, sy, sx, color);
      else A.box(f, e, kit, lx + cx, ly + cy, lz, sx, sy, th, color);
      if (inner) { // revêtement intérieur (papier peint) légèrement décalé
        const off = (th / 2 + 0.011) * (o.innerSide || 1);
        if (o.alongZ) A.deco(f, e, inner, lx + off, ly + cy, lz + cx, 0.02, sy, sx, innerColor);
        else A.deco(f, e, inner, lx + cx, ly + cy, lz + off, sx, sy, 0.02, innerColor);
      }
    };
    const dc = (cx, cy, sx, sy, sz, kit2, col2, ofs) => {
      if (o.alongZ) A.deco(f, e, kit2, lx + (ofs || 0), ly + cy, lz + cx, sz, sy, sx, col2);
      else A.deco(f, e, kit2, lx + cx, ly + cy, lz + (ofs || 0), sx, sy, sz, col2);
    };
    if (type === 'solid') bx(0, h / 2, len, h);
    else if (type === 'window' || type === 'wide') {
      const ww = type === 'wide' ? Math.min(len - 0.6, 3.0) : Math.min(1.4, len - 0.8), sill = o.sill || 1.0, top = Math.min(h - 0.35, o.winTop || 2.35);
      const side = (len - ww) / 2;
      bx(0, sill / 2, len, sill);                                   // allège
      bx(0, (top + h) / 2, len, h - top);                           // linteau
      bx(-len / 2 + side / 2, (sill + top) / 2, side, top - sill);  // montants
      bx(len / 2 - side / 2, (sill + top) / 2, side, top - sill);
      // vitre
      const g = A.ent('glass', 'glass', 1, { yield: 0 });
      g.noPickaxe = false;
      const gp = o.alongZ ? A.tp(f, lx, lz) : A.tp(f, lx, lz);
      if (o.alongZ) A.box(f, g, 'glass', lx, ly + (sill + top) / 2, lz, 0.05, top - sill, ww, null);
      else A.box(f, g, 'glass', lx, ly + (sill + top) / 2, lz, ww, top - sill, 0.05, null);
      e.deps = e.deps || []; e.deps.push(g);
      // encadrement + croisillon
      const tc = o.trim == null ? 0xf4f1ea : o.trim;
      dc(0, sill - 0.05, ww + 0.2, 0.1, th + 0.12, 'plain', tc);
      dc(0, top + 0.04, ww + 0.2, 0.08, th + 0.06, 'plain', tc);
      dc(0, (sill + top) / 2, 0.06, top - sill, th * 0.4, 'plain', tc);
      if (type === 'window') dc(0, (sill + top) / 2, ww, 0.05, th * 0.4, 'plain', tc);
      if (o.shutters) {
        const sc = o.shutters;
        const sOff = (th / 2 + 0.05) * (o.outSide || -1);
        dc(-ww / 2 - 0.3, (sill + top) / 2, 0.5, top - sill, 0.05, 'plain', sc, sOff);
        dc(ww / 2 + 0.3, (sill + top) / 2, 0.5, top - sill, 0.05, 'plain', sc, sOff);
      }
    } else if (type === 'door' || type === 'double' || type === 'garage') {
      const dw = type === 'double' ? 2.4 : type === 'garage' ? Math.min(len - 0.6, 3.4) : 1.3;
      const dh = type === 'garage' ? 2.8 : 2.35;
      const side = (len - dw) / 2;
      bx(-len / 2 + side / 2, h / 2, side, h);
      bx(len / 2 - side / 2, h / 2, side, h);
      bx(0, (dh + h) / 2, dw, h - dh);
      const tc = o.trim == null ? 0xf4f1ea : o.trim;
      dc(0, dh + 0.05, dw + 0.2, 0.1, th + 0.08, 'plain', tc);
      if (type === 'door' && o.addDoor !== false) A.door(f, lx, ly, lz, dw, dh, o.alongZ, o.doorColor);
      if (type === 'garage') {
        // porte de garage (métal, destructible)
        const gd = A.ent('piece', 'metal', 250, { structural: false, yield: 12 });
        if (o.alongZ) A.box(f, gd, 'metalSheet', lx, ly + dh / 2, lz, 0.12, dh, dw, 0xdcdcdc);
        else A.box(f, gd, 'metalSheet', lx, ly + dh / 2, lz, dw, dh, 0.12, 0xdcdcdc);
        e.deps = e.deps || []; e.deps.push(gd);
      }
    } else if (type === 'open') {
      // grande arche
      const side = 0.5;
      bx(-len / 2 + side / 2, h / 2, side, h);
      bx(len / 2 - side / 2, h / 2, side, h);
      bx(0, h - 0.4, len, 0.8);
    }
    return e;
  };

  // Porte battante (interaction E)
  A.door = function (f, lx, ly, lz, dw, dh, alongZ, color) {
    const e = A.ent('door', 'wood', 120, { yield: 8 });
    // charnière à gauche
    const hx = alongZ ? lx : lx - dw / 2, hz = alongZ ? lz - dw / 2 : lz;
    const hp = A.tp(f, hx, hz);
    const baseYaw = A.tyaw(f) + (alongZ ? -Math.PI / 2 : 0);
    const cx = alongZ ? lx : lx, cz = lz;
    const c = A.tp(f, cx, cz);
    const y = f.y + ly + dh / 2;
    const ref = K.add('door', c[0], y, c[1], alongZ ? 0.08 : dw - 0.04, dh - 0.02, alongZ ? dw - 0.04 : 0.08, color || 0xffffff, 0, 0, 0);
    // recalcul avec rotation autour de la charnière
    e.door = { hinge: hp, baseYaw, w: dw - 0.04, h: dh - 0.02, y, open: 0, target: 0, ref, alongZ, rotF: f.rot };
    const s = A.tsize(f, alongZ ? 0.1 : dw, alongZ ? dw : 0.1);
    e.doorCol = P.box(c[0] - s[0] / 2, f.y + ly, c[1] - s[1] / 2, c[0] + s[0] / 2, f.y + ly + dh, c[1] + s[1] / 2, e, 3);
    W.addRef(e, ref);
    W.addCol(e, e.doorCol);
    e.pos = new THREE.Vector3(c[0], f.y + ly + 1, c[1]);
    A.updateDoorMatrix(e);
    e.reset = () => { e.door.open = 0; e.door.target = 0; A.updateDoorMatrix(e); if (!e.dead && e.doorCol && !e.doorCol.cells) G.Phys.add(e.doorCol); };
    A.doors.push(e);
    return e;
  };
  const dm = new THREE.Matrix4(), dq = new THREE.Quaternion(), dp = new THREE.Vector3(), ds = new THREE.Vector3(), de = new THREE.Euler();
  A.updateDoorMatrix = function (e) {
    const d = e.door;
    const yaw = d.baseYaw + d.open * Math.PI * 0.5 * (d.dirSign || 1);
    // centre = charnière + demi-largeur dans la direction de la porte
    const cx = d.hinge[0] + Math.cos(yaw) * d.w / 2, cz = d.hinge[1] - Math.sin(yaw) * d.w / 2;
    de.set(0, yaw, 0); dq.setFromEuler(de);
    dp.set(cx, d.y, cz); ds.set(d.w, d.h, 0.08);
    dm.compose(dp, dq, ds);
    d.ref.m = dm.elements.slice();
    if (!d.ref.hidden && d.ref.mesh) K.show(d.ref);
  };
  A.toggleDoor = function (e, fromPos) {
    if (e.dead) return;
    const d = e.door;
    if (d.target > 0.5) d.target = 0;
    else {
      // s'ouvre à l'opposé de celui qui pousse
      if (fromPos) {
        const nx = -Math.sin(d.baseYaw), nz = -Math.cos(d.baseYaw);
        const side = (fromPos.x - e.pos.x) * nx + (fromPos.z - e.pos.z) * nz;
        d.dirSign = side > 0 ? -1 : 1;
      }
      d.target = 1;
    }
    G.Audio.play('door', { pos: [e.pos.x, e.pos.y, e.pos.z] });
  };
  A.updateDoors = function (dt) {
    for (const e of A.doors) {
      if (e.dead) continue;
      const d = e.door;
      if (Math.abs(d.open - d.target) > 0.001) {
        d.open = U.damp(d.open, d.target, 10, dt);
        if (Math.abs(d.open - d.target) < 0.01) d.open = d.target;
        A.updateDoorMatrix(e);
        const shouldCol = d.open < 0.15;
        if (shouldCol && !e.doorCol.cells) G.Phys.add(e.doorCol);
        if (!shouldCol && e.doorCol.cells) G.Phys.remove(e.doorCol);
      }
    }
  };

  // Découpe un rectangle [x0,z0,x1,z1] moins un trou -> liste de rectangles
  A.rectMinus = function (r, h) {
    if (!h || h[2] <= r[0] || h[0] >= r[2] || h[3] <= r[1] || h[1] >= r[3]) return [r];
    const out = [];
    const hx0 = Math.max(r[0], h[0]), hx1 = Math.min(r[2], h[2]), hz0 = Math.max(r[1], h[1]), hz1 = Math.min(r[3], h[3]);
    if (hz0 > r[1]) out.push([r[0], r[1], r[2], hz0]);
    if (hz1 < r[3]) out.push([r[0], hz1, r[2], r[3]]);
    if (hx0 > r[0]) out.push([r[0], hz0, hx0, hz1]);
    if (hx1 < r[2]) out.push([hx1, hz0, r[2], hz1]);
    return out.filter((q) => q[2] - q[0] > 0.05 && q[3] - q[1] > 0.05);
  };
  // Sol / plafond en dalles destructibles
  A.floorTiles = function (f, kit, color, x0, z0, x1, z1, y, th, hole, o) {
    o = o || {};
    const rects = A.rectMinus([x0, z0, x1, z1], hole);
    const ents = [];
    for (const r of rects) {
      const nx = Math.max(1, Math.round((r[2] - r[0]) / 4.2)), nz = Math.max(1, Math.round((r[3] - r[1]) / 4.2));
      const tw = (r[2] - r[0]) / nx, td = (r[3] - r[1]) / nz;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const e = A.ent('piece', o.mat || K.matOf(kit), o.hp || 200, { structural: true, grounded: !!o.grounded, yield: 12 });
        const cx = r[0] + (i + 0.5) * tw, cz = r[1] + (j + 0.5) * td;
        A.box(f, e, kit, cx, y - th / 2, cz, tw, th, td, color);
        if (o.under) A.deco(f, e, o.under, cx, y - th - 0.011, cz, tw, 0.02, td, o.underColor);
        ents.push(e);
      }
    }
    return ents;
  };

  // Escalier droit : de (lx0,lz) vers +X local sur 'run' m, montée h
  A.stairs = function (f, lx0, ly, lz, run, h, w, kit, color, dirL) {
    dirL = dirL || 0; // 0 = monte vers +X local, 2 = vers -X, 1 = +Z, 3 = -Z
    const e = A.ent('piece', 'wood', 200, { structural: true, grounded: ly <= 0.6, yield: 10 });
    const n = Math.max(6, Math.round(h / 0.3));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const sy = h * (i + 1) / n;
      let cx, cz, sx, sz;
      if (dirL === 0) { cx = lx0 + run * t; cz = lz; sx = run / n + 0.02; sz = w; }
      else if (dirL === 2) { cx = lx0 - run * t; cz = lz; sx = run / n + 0.02; sz = w; }
      else if (dirL === 1) { cx = lx0; cz = lz + run * t; sx = w; sz = run / n + 0.02; }
      else { cx = lx0; cz = lz - run * t; sx = w; sz = run / n + 0.02; }
      A.box(f, e, kit || 'furn', cx, ly + sy / 2, cz, sx, sy, sz, color || 0xb08050, false);
    }
    // collision rampe
    let cx, cz, sx, sz;
    if (dirL === 0) { cx = lx0 + run / 2; cz = lz; sx = run; sz = w; }
    else if (dirL === 2) { cx = lx0 - run / 2; cz = lz; sx = run; sz = w; }
    else if (dirL === 1) { cx = lx0; cz = lz + run / 2; sx = w; sz = run; }
    else { cx = lx0; cz = lz - run / 2; sx = w; sz = run; }
    A.rampCol(f, e, cx, ly, cz, sx, h, sz, dirL);
    return e;
  };

  // Toit à deux pans (faîtage le long de X local), couvre [x0..x1]x[z0..z1] depuis y
  A.gableRoof = function (f, x0, z0, x1, z1, y, rh, kit, color, gableKit, gableColor, o) {
    o = o || {};
    const ov = o.overhang == null ? 0.6 : o.overhang;
    const W2 = x1 - x0, D = z1 - z0;
    const half = D / 2;
    const ang = Math.atan2(rh, half);
    const slant = Math.sqrt(rh * rh + half * half) + ov;
    const th = 0.25;
    const segs = Math.max(1, Math.round(W2 / 4.5));
    const segW = (W2 + ov * 2) / segs;
    const cz = (z0 + z1) / 2;
    const ents = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < segs; i++) {
        const e = A.ent('piece', K.matOf(kit), 180, { structural: true, yield: 10 });
        const cx = x0 - ov + (i + 0.5) * segW;
        // pan : du bord (avec débord) jusqu'au faîtage
        const zb = cz + side * (half + ov * Math.cos(ang)), yb = y - ov * Math.sin(ang);
        const mz = (zb + cz) / 2, my = (yb + y + rh) / 2;
        // décalage d'une demi-épaisseur selon la normale du pan
        const nY = Math.cos(ang), nZ = side * Math.sin(ang);
        A.deco(f, e, kit, cx, my + nY * th / 2, mz + nZ * th / 2, segW, th, slant, color, side * ang, 0, 0);
        // collision : rampe montant vers le faîtage
        A.rampCol(f, e, cx, y, cz + side * half / 2, segW, rh, half, side > 0 ? 3 : 1);
        ents.push(e);
      }
    }
    // pignons
    if (gableKit) {
      for (let s = -1; s <= 1; s += 2) {
        const e = A.ent('piece', K.matOf(gableKit), 200, { structural: true, yield: 10 });
        const gx = s < 0 ? x0 + 0.12 : x1 - 0.12;
        A.deco(f, e, gableKit, gx, y + rh / 2, cz, D, rh, 0.24, gableColor, 0, Math.PI / 2, 0);
        A.colBox(f, e, gx, y + rh * 0.3, cz, 0.24, rh * 0.6, D * 0.6, 3);
        ents.push(e);
      }
    }
    // faîtière
    A.deco(f, ents[0], 'plain', (x0 + x1) / 2, y + rh + 0.12, cz, W2 + ov * 2, 0.18, 0.3, o.ridgeColor || 0x6a4a3a);
    return ents;
  };

  // Toit plat avec acrotère
  A.flatRoof = function (f, x0, z0, x1, z1, y, kit, color, parapetKit, parapetColor, o) {
    o = o || {};
    const ents = A.floorTiles(f, kit, color, x0, z0, x1, z1, y + 0.3, 0.3, o.hole, { under: o.under, underColor: o.underColor });
    if (parapetKit) {
      const ph = 0.9, t = 0.25;
      const e = A.ent('piece', K.matOf(parapetKit), 200, { structural: true, yield: 8 });
      A.box(f, e, parapetKit, (x0 + x1) / 2, y + 0.3 + ph / 2, z0 + t / 2, x1 - x0, ph, t, parapetColor);
      A.box(f, e, parapetKit, (x0 + x1) / 2, y + 0.3 + ph / 2, z1 - t / 2, x1 - x0, ph, t, parapetColor);
      const e2 = A.ent('piece', K.matOf(parapetKit), 200, { structural: true, yield: 8 });
      A.box(f, e2, parapetKit, x0 + t / 2, y + 0.3 + ph / 2, (z0 + z1) / 2, t, ph, z1 - z0 - t * 2, parapetColor);
      A.box(f, e2, parapetKit, x1 - t / 2, y + 0.3 + ph / 2, (z0 + z1) / 2, t, ph, z1 - z0 - t * 2, parapetColor);
      ents.push(e, e2);
    }
    return ents;
  };

  // ------------------------------------------------------------
  //  MEUBLES (chaque meuble = une entité)
  // ------------------------------------------------------------
  const FURN = {};
  A.FURN = FURN;
  function fe(mat, hp, y) { return A.ent('furniture', mat || 'wood', hp || 100, { yield: y || 8 }); }

  FURN.bed = (f, x, y, z, r, color) => {
    const g = A.frame(...A.tp(f, x, z).slice(0, 1), 0, 0, 0); // placeholder non utilisé
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 120, 12);
    A.box(ff, e, 'furn', 0, 0.2, 0, 1.7, 0.4, 2.2, 0x8a5a3a);
    A.box(ff, e, 'fabric', 0, 0.48, 0.05, 1.6, 0.18, 2.0, 0xf5f5f0, false);
    A.box(ff, e, 'fabric', 0, 0.6, 0.35, 1.62, 0.08, 1.4, color || U.pick([0x3a6ea5, 0xa53a4a, 0x5aa55a, 0xe0b040, 0x8a5ab0]), false);
    A.box(ff, e, 'fabric', 0, 0.62, -0.75, 1.2, 0.14, 0.4, 0xffffff, false);
    A.box(ff, e, 'furn', 0, 0.6, -1.08, 1.7, 1.2, 0.1, 0x6a4028, false);
    return e;
  };
  FURN.table = (f, x, y, z, r, chairs) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 100, 8);
    A.box(ff, e, 'furn', 0, 0.76, 0, 1.8, 0.08, 1.0, 0xa0683a, false);
    [[-0.8, -0.42], [0.8, -0.42], [-0.8, 0.42], [0.8, 0.42]].forEach((p) => A.box(ff, e, 'furn', p[0], 0.37, p[1], 0.08, 0.74, 0.08, 0x7a4a2a, false));
    A.colBox(ff, e, 0, 0.4, 0, 1.8, 0.8, 1.0);
    if (chairs) [[-0.5, -0.8, 0], [0.5, -0.8, 0], [-0.5, 0.8, 2], [0.5, 0.8, 2]].forEach((c) => FURN.chair(ff, c[0], 0, c[1], c[2]));
    return e;
  };
  FURN.chair = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 50, 4);
    A.box(ff, e, 'furn', 0, 0.45, 0, 0.45, 0.06, 0.45, 0x9a6038, false);
    [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach((p) => A.box(ff, e, 'furn', p[0], 0.22, p[1], 0.05, 0.44, 0.05, 0x7a4a2a, false));
    A.box(ff, e, 'furn', 0, 0.75, -0.2, 0.45, 0.55, 0.05, 0x9a6038, false);
    A.colBox(ff, e, 0, 0.45, 0, 0.45, 0.9, 0.45);
    return e;
  };
  FURN.sofa = (f, x, y, z, r, color) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 120, 10);
    const c = color || U.pick([0x6a8aa8, 0xa86a5a, 0x7a9a6a, 0x9a7ab0, 0xc8a870]);
    A.box(ff, e, 'fabric', 0, 0.25, 0, 2.2, 0.5, 0.9, c);
    A.box(ff, e, 'fabric', 0, 0.7, -0.35, 2.2, 0.6, 0.2, U.shade(c, -0.15), false);
    A.box(ff, e, 'fabric', -1.0, 0.6, 0, 0.2, 0.3, 0.9, U.shade(c, -0.1), false);
    A.box(ff, e, 'fabric', 1.0, 0.6, 0, 0.2, 0.3, 0.9, U.shade(c, -0.1), false);
    A.box(ff, e, 'fabric', -0.45, 0.55, 0.05, 0.85, 0.12, 0.7, U.shade(c, 0.1), false);
    A.box(ff, e, 'fabric', 0.45, 0.55, 0.05, 0.85, 0.12, 0.7, U.shade(c, 0.1), false);
    return e;
  };
  FURN.tv = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 80, 8);
    A.box(ff, e, 'furn', 0, 0.3, 0, 1.6, 0.6, 0.45, 0x5a3a2a);
    A.box(ff, e, 'dark', 0, 0.95, 0, 1.3, 0.72, 0.08, null, false);
    A.box(ff, e, 'paint', 0, 0.95, 0.045, 1.2, 0.62, 0.01, 0x1a2a4a, false);
    return e;
  };
  FURN.fridge = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 150, 14);
    A.box(ff, e, 'paint', 0, 0.95, 0, 0.8, 1.9, 0.75, 0xf0f0f0);
    A.box(ff, e, 'paint', 0, 1.25, 0.38, 0.78, 0.02, 0.02, 0xbbbbbb, false);
    A.box(ff, e, 'dark', 0.3, 1.0, 0.39, 0.04, 0.4, 0.04, null, false);
    return e;
  };
  FURN.counter = (f, x, y, z, r, len) => {
    len = len || 2.4;
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 120, 10);
    A.box(ff, e, 'furn', 0, 0.45, 0, len, 0.9, 0.65, 0xe8e0d0);
    A.box(ff, e, 'paint', 0, 0.92, 0, len + 0.04, 0.05, 0.7, 0x5a5a60, false);
    for (let i = 0; i < Math.floor(len / 0.6); i++) A.box(ff, e, 'dark', -len / 2 + 0.3 + i * 0.6, 0.75, 0.33, 0.2, 0.03, 0.02, null, false);
    A.box(ff, e, 'furn', 0, 1.9, -0.15, len, 0.7, 0.35, 0xe8e0d0, false);
    return e;
  };
  FURN.stove = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 120, 12);
    A.box(ff, e, 'paint', 0, 0.45, 0, 0.75, 0.9, 0.65, 0xdadada);
    A.box(ff, e, 'dark', 0, 0.91, 0, 0.72, 0.02, 0.6, null, false);
    A.box(ff, e, 'dark', 0, 0.45, 0.33, 0.6, 0.4, 0.02, null, false);
    return e;
  };
  FURN.shelf = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 100, 10);
    A.box(ff, e, 'furn', 0, 1.0, 0, 1.4, 2.0, 0.4, 0x7a5030);
    const bc = [0xc03a3a, 0x3a6ac0, 0x3ac06a, 0xe0c040, 0x8a3ac0, 0xe07a30, 0xf0f0f0];
    for (let s = 0; s < 4; s++) for (let b = 0; b < 6; b++) if (Math.random() < 0.8) A.box(ff, e, 'plain', -0.55 + b * 0.22, 0.35 + s * 0.46, 0.05, 0.14, 0.3 + Math.random() * 0.08, 0.28, U.pick(bc), false);
    return e;
  };
  FURN.wardrobe = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 120, 12);
    A.box(ff, e, 'furn', 0, 1.05, 0, 1.3, 2.1, 0.6, 0xa06a40);
    A.box(ff, e, 'dark', -0.08, 1.1, 0.31, 0.03, 0.2, 0.03, null, false);
    A.box(ff, e, 'dark', 0.08, 1.1, 0.31, 0.03, 0.2, 0.03, null, false);
    A.box(ff, e, 'furn', 0, 1.05, 0.305, 0.02, 2.0, 0.01, 0x6a4020, false);
    return e;
  };
  FURN.toilet = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('stone', 80, 6);
    A.box(ff, e, 'paint', 0, 0.22, 0.05, 0.42, 0.44, 0.6, 0xffffff);
    A.box(ff, e, 'paint', 0, 0.62, -0.25, 0.46, 0.5, 0.2, 0xffffff, false);
    return e;
  };
  FURN.bathtub = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('stone', 120, 8);
    A.box(ff, e, 'paint', 0, 0.3, 0, 0.8, 0.6, 1.7, 0xfafafa);
    A.box(ff, e, 'water', 0, 0.55, 0, 0.62, 0.04, 1.5, null, false);
    return e;
  };
  FURN.lamp = (f, x, y, z) => {
    const ff = subFrame(f, x, y, z, 0);
    const e = fe('metal', 40, 3);
    A.box(ff, e, 'dark', 0, 0.02, 0, 0.35, 0.04, 0.35, null, false);
    A.box(ff, e, 'dark', 0, 0.75, 0, 0.04, 1.5, 0.04, null, false);
    A.deco(ff, e, 'glow', 0, 1.55, 0, 0.45, 0.35, 0.45, 0xfff0c0);
    A.colBox(ff, e, 0, 0.8, 0, 0.3, 1.6, 0.3, 2);
    return e;
  };
  FURN.rug = (f, x, y, z, r, w, d, color) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 30, 2);
    A.box(ff, e, 'fabric', 0, 0.012, 0, w || 2.4, 0.02, d || 1.7, color || U.pick([0xa83a3a, 0x3a5aa8, 0xc8a050, 0x5a8a5a]), false);
    e.noPickaxe = true;
    return e;
  };
  FURN.desk = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 100, 8);
    A.box(ff, e, 'furn', 0, 0.74, 0, 1.4, 0.06, 0.7, 0x8a6a4a, false);
    A.box(ff, e, 'furn', -0.6, 0.37, 0, 0.1, 0.74, 0.7, 0x7a5a3a, false);
    A.box(ff, e, 'furn', 0.45, 0.37, 0, 0.45, 0.74, 0.7, 0x7a5a3a, false);
    A.box(ff, e, 'dark', 0, 1.02, -0.15, 0.6, 0.4, 0.05, null, false);
    A.box(ff, e, 'paint', 0, 1.02, -0.12, 0.54, 0.34, 0.01, 0x3a7ac0, false);
    A.colBox(ff, e, 0, 0.4, 0, 1.4, 0.8, 0.7);
    FURN.chair(ff, 0, 0, 0.6, 2);
    return e;
  };
  FURN.washer = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 100, 10);
    A.box(ff, e, 'paint', 0, 0.45, 0, 0.65, 0.9, 0.65, 0xf5f5f5);
    A.box(ff, e, 'dark', 0, 0.45, 0.33, 0.4, 0.4, 0.02, null, false);
    return e;
  };
  FURN.crate = (f, x, y, z, r, s) => {
    s = s || 1;
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 90, 8);
    A.box(ff, e, 'planks', 0, s / 2, 0, s, s, s, 0xc8a070);
    A.box(ff, e, 'furn', 0, s / 2, 0, s + 0.04, s * 0.12, s + 0.04, 0x8a6a40, false);
    return e;
  };
  FURN.barrel = (f, x, y, z, color) => {
    const ff = subFrame(f, x, y, z, 0);
    const e = fe('metal', 80, 8);
    A.box(ff, e, 'cylPaint', 0, 0.5, 0, 0.7, 1.0, 0.7, color || U.pick([0x3a6ac0, 0xc03a3a, 0x3aa05a, 0xd0a030]), false);
    A.colBox(ff, e, 0, 0.5, 0, 0.6, 1.0, 0.6);
    return e;
  };
  FURN.pallet = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 60, 6);
    A.box(ff, e, 'planks', 0, 0.07, 0, 1.2, 0.14, 1.0, 0xc8a878);
    return e;
  };
  FURN.bench = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 80, 8);
    A.box(ff, e, 'planks', 0, 0.45, 0, 1.8, 0.08, 0.5, 0xa87a4a, false);
    A.box(ff, e, 'planks', 0, 0.8, -0.22, 1.8, 0.35, 0.06, 0xa87a4a, false);
    A.box(ff, e, 'dark', -0.8, 0.22, 0, 0.08, 0.45, 0.45, null, false);
    A.box(ff, e, 'dark', 0.8, 0.22, 0, 0.08, 0.45, 0.45, null, false);
    A.colBox(ff, e, 0, 0.45, 0, 1.8, 0.9, 0.5);
    return e;
  };
  FURN.shelfStore = (f, x, y, z, r, len) => {
    len = len || 4;
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 150, 12);
    A.box(ff, e, 'paint', 0, 0.9, 0, len, 1.8, 0.2, 0xd8d8d8);
    for (let s = 0; s < 4; s++) {
      A.box(ff, e, 'paint', 0, 0.2 + s * 0.48, 0, len, 0.04, 0.9, 0xc8c8c8, false);
      for (let i = 0; i < len / 0.35 - 1; i++) if (Math.random() < 0.85) {
        const c = U.pick([0xe04040, 0x40a0e0, 0xf0c030, 0x40c070, 0xf07a30, 0xa050d0, 0xffffff]);
        A.box(ff, e, 'plain', -len / 2 + 0.3 + i * 0.35, 0.36 + s * 0.48, 0.25 * (i % 2 ? 1 : -1), 0.25, 0.28, 0.3, c, false);
      }
    }
    A.colBox(ff, e, 0, 0.9, 0, len, 1.8, 1.0);
    return e;
  };
  FURN.car = (f, x, y, z, r, color) => {
    const ff = subFrame(f, x, y, z, r);
    const e = A.ent('car', 'metal', 350, { yield: 45 });
    const c = color || U.pick([0xd03030, 0x3060d0, 0xf0f0f0, 0x303030, 0x30a050, 0xf0c030, 0xe07030, 0x8a8a90]);
    A.box(ff, e, 'paint', 0, 0.75, 0, 1.9, 0.7, 4.3, c);
    A.box(ff, e, 'paint', 0, 1.35, -0.2, 1.7, 0.55, 2.3, U.shade(c, -0.05), false);
    A.box(ff, e, 'glass', 0, 1.35, -0.2, 1.72, 0.45, 2.1, null, false);
    A.box(ff, e, 'dark', 0, 0.5, 2.16, 1.8, 0.25, 0.05, null, false);
    A.box(ff, e, 'glow', -0.65, 0.8, 2.16, 0.35, 0.15, 0.03, 0xffffff, false);
    A.box(ff, e, 'glow', 0.65, 0.8, 2.16, 0.35, 0.15, 0.03, 0xffffff, false);
    A.box(ff, e, 'paint', -0.65, 0.8, -2.16, 0.35, 0.15, 0.03, 0xc01010, false);
    A.box(ff, e, 'paint', 0.65, 0.8, -2.16, 0.35, 0.15, 0.03, 0xc01010, false);
    [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]].forEach((p) => A.deco(ff, e, 'cylPaint', p[0], 0.38, p[1], 0.76, 0.3, 0.76, 0x1a1a1a, 0, 0, Math.PI / 2));
    A.colBox(ff, e, 0, 1.0, 0, 1.9, 2.0, 4.3);
    e.carYaw = A.tyaw(ff);
    return e;
  };
  FURN.truck = (f, x, y, z, r, color) => {
    const ff = subFrame(f, x, y, z, r);
    const e = A.ent('car', 'metal', 500, { yield: 60 });
    const c = color || U.pick([0xd05030, 0x3070c0, 0xe8e8e8]);
    A.box(ff, e, 'paint', 0, 1.4, 2.6, 2.3, 2.0, 2.0, c);
    A.box(ff, e, 'glass', 0, 1.9, 3.61, 2.0, 0.8, 0.04, null, false);
    A.box(ff, e, 'container', 0, 1.9, -1.0, 2.4, 2.8, 5.4, 0xe8e8e8);
    A.box(ff, e, 'dark', 0, 0.45, 0.6, 2.2, 0.3, 8.0, null, false);
    [[-1.1, 2.8], [1.1, 2.8], [-1.1, -2.2], [1.1, -2.2], [-1.1, -3.2], [1.1, -3.2]].forEach((p) => A.deco(ff, e, 'cylPaint', p[0], 0.5, p[1], 1.0, 0.4, 1.0, 0x1a1a1a, 0, 0, Math.PI / 2));
    return e;
  };
  FURN.container = (f, x, y, z, r, color, open) => {
    const ff = subFrame(f, x, y, z, r);
    const e = A.ent('piece', 'metal', 500, { yield: 30, structural: true, grounded: y < 0.5 });
    const c = color || U.pick([0xc04030, 0x3060b0, 0x30a060, 0xe0a030, 0x8a8a8a]);
    const L = 6, Wd = 2.5, Hh = 2.6;
    A.box(ff, e, 'container', 0, Hh - 0.05, 0, L, 0.1, Wd, c);
    A.box(ff, e, 'container', 0, 0.05, 0, L, 0.1, Wd, c);
    A.box(ff, e, 'container', 0, Hh / 2, -Wd / 2 + 0.05, L, Hh, 0.1, c);
    A.box(ff, e, 'container', 0, Hh / 2, Wd / 2 - 0.05, L, Hh, 0.1, c);
    A.box(ff, e, 'container', -L / 2 + 0.05, Hh / 2, 0, 0.1, Hh, Wd, U.shade(c, -0.1));
    if (!open) A.box(ff, e, 'container', L / 2 - 0.05, Hh / 2, 0, 0.1, Hh, Wd, U.shade(c, -0.1));
    else { A.deco(ff, e, 'container', L / 2 + 0.6, Hh / 2, Wd / 2 + 0.1, 0.1, Hh, 1.2, U.shade(c, -0.1), 0, 0.9, 0); A.chest(ff, 0, 0.1, 0, Math.PI / 2); }
    return e;
  };
  FURN.hayBale = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 60, 6);
    A.box(ff, e, 'hay', 0, 0.45, 0, 1.2, 0.9, 0.8);
    return e;
  };
  FURN.roundBale = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 80, 8);
    A.deco(ff, e, 'cylHay', 0, 0.8, 0, 1.6, 1.4, 1.6, 0xffffff, 0, 0, Math.PI / 2);
    A.colBox(ff, e, 0, 0.8, 0, 1.4, 1.6, 1.4);
    return e;
  };
  FURN.streetLamp = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 100, 8);
    A.box(ff, e, 'dark', 0, 2.5, 0, 0.14, 5, 0.14, null);
    A.box(ff, e, 'dark', 0, 4.95, 0.5, 0.1, 0.1, 1.0, null, false);
    A.deco(ff, e, 'glow', 0, 4.85, 0.95, 0.4, 0.15, 0.25, 0xfff0c0);
    const p = A.tp(ff, 0, 0.95);
    A.lights.push([p[0], ff.y + 4.6, p[1]]);
    return e;
  };
  FURN.hydrant = (f, x, y, z) => {
    const ff = subFrame(f, x, y, z, 0);
    const e = fe('metal', 60, 5);
    A.box(ff, e, 'cylPaint', 0, 0.35, 0, 0.3, 0.7, 0.3, 0xd02020);
    A.deco(ff, e, 'hemiPaint', 0, 0.7, 0, 0.3, 0.2, 0.3, 0xd02020);
    return e;
  };
  FURN.trash = (f, x, y, z) => {
    const ff = subFrame(f, x, y, z, 0);
    const e = fe('metal', 60, 5);
    A.box(ff, e, 'cylPaint', 0, 0.45, 0, 0.6, 0.9, 0.6, 0x3a6a3a);
    return e;
  };
  FURN.mailbox = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 40, 3);
    A.box(ff, e, 'furn', 0, 0.55, 0, 0.1, 1.1, 0.1, 0x7a5a3a, false);
    A.box(ff, e, 'paint', 0, 1.15, 0, 0.3, 0.3, 0.5, U.pick([0x2a5ab0, 0xd03030, 0x2a2a2a]));
    return e;
  };
  FURN.fence = (f, x, y, z, r, len, color) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 60, 4);
    const c = color || 0xf4f0e8;
    const n = Math.max(2, Math.round(len / 0.5));
    for (let i = 0; i < n; i++) A.box(ff, e, 'plain', -len / 2 + (i + 0.5) * len / n, 0.5, 0, 0.12, 1.0, 0.06, c, false);
    A.box(ff, e, 'plain', 0, 0.75, -0.05, len, 0.1, 0.04, c, false);
    A.box(ff, e, 'plain', 0, 0.3, -0.05, len, 0.1, 0.04, c, false);
    A.colBox(ff, e, 0, 0.5, 0, len, 1.0, 0.15);
    return e;
  };
  FURN.hedge = (f, x, y, z, r, len) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 80, 6);
    A.box(ff, e, 'leaves', 0, 0.6, 0, len, 1.2, 0.9, 0x3a8a30);
    return e;
  };
  FURN.planter = (f, x, y, z) => {
    const ff = subFrame(f, x, y, z, 0);
    const e = fe('stone', 60, 4);
    A.box(ff, e, 'concrete', 0, 0.25, 0, 1.0, 0.5, 1.0, 0xc0b8a8);
    A.deco(ff, e, 'spherePaint', 0, 0.8, 0, 1.0, 0.8, 1.0, 0x4a9a3a);
    return e;
  };
  FURN.vending = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 150, 14);
    const c = U.pick([0xd02828, 0x2858d0, 0x28a050]);
    A.box(ff, e, 'paint', 0, 1.0, 0, 1.0, 2.0, 0.8, c);
    A.box(ff, e, 'glow', -0.12, 1.2, 0.41, 0.6, 1.1, 0.02, 0xd8f0ff, false);
    return e;
  };
  FURN.machine = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = A.ent('furniture', 'metal', 250, { yield: 25 });
    A.box(ff, e, 'paint', 0, 1.0, 0, 3.0, 2.0, 2.0, 0x6a7a8a);
    A.box(ff, e, 'paint', -0.8, 2.3, 0, 1.0, 0.6, 1.0, 0xe0a030, false);
    A.deco(ff, e, 'cylPaint', 1.0, 2.2, 0, 0.6, 0.8, 0.6, 0x4a4a50);
    A.box(ff, e, 'dark', 0, 1.2, 1.01, 1.4, 0.6, 0.02, null, false);
    A.box(ff, e, 'glow', 0.9, 1.5, 1.02, 0.15, 0.15, 0.02, 0x40ff40, false);
    return e;
  };
  FURN.piano = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 120, 12);
    A.box(ff, e, 'dark', 0, 0.7, 0, 1.5, 1.4, 0.6, null);
    A.box(ff, e, 'paint', 0, 0.78, 0.33, 1.3, 0.04, 0.2, 0xffffff, false);
    return e;
  };
  FURN.throne = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 150, 10);
    A.box(ff, e, 'paint', 0, 0.3, 0, 1.2, 0.6, 1.0, 0xc8a030);
    A.box(ff, e, 'fabric', 0, 0.65, 0.05, 0.9, 0.1, 0.8, 0xb02020, false);
    A.box(ff, e, 'paint', 0, 1.5, -0.45, 1.2, 2.0, 0.15, 0xc8a030, false);
    A.box(ff, e, 'fabric', 0, 1.3, -0.36, 0.9, 1.4, 0.05, 0xb02020, false);
    return e;
  };
  FURN.banner = (f, x, y, z, r, color) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 30, 2);
    A.box(ff, e, 'fabric', 0, 0, 0, 1.2, 3.0, 0.04, color || 0xb02020, false);
    A.box(ff, e, 'paint', 0, 0.2, 0.03, 0.5, 0.5, 0.02, 0xf0c030, false);
    A.box(ff, e, 'dark', 0, 1.55, 0, 1.4, 0.08, 0.08, null, false);
    return e;
  };
  FURN.torch = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 20, 1);
    A.box(ff, e, 'dark', 0, 0, 0.1, 0.08, 0.5, 0.08, null, false);
    A.deco(ff, e, 'glow', 0, 0.32, 0.1, 0.16, 0.22, 0.16, 0xffa040);
    const p = A.tp(ff, 0, 0.3);
    A.lights.push([p[0], ff.y + 0.4, p[1], 0xff9040]);
    return e;
  };
  FURN.market = (f, x, y, z, r, color) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 100, 10);
    const c = color || U.pick([0xd03030, 0x3070d0, 0x30a050, 0xe0a030]);
    A.box(ff, e, 'planks', 0, 0.5, 0, 2.4, 1.0, 1.2, 0xb08050);
    [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]].forEach((p) => A.box(ff, e, 'furn', p[0], 1.3, p[1], 0.08, 2.6, 0.08, 0x7a5030, false));
    A.deco(ff, e, 'fabric', 0, 2.65, 0, 2.6, 0.08, 1.5, c, 0.15, 0, 0);
    for (let i = 0; i < 5; i++) A.deco(ff, e, 'spherePaint', -0.9 + i * 0.45, 1.1, 0.1, 0.35, 0.3, 0.35, U.pick([0xe04020, 0xf0a020, 0x60c030, 0xf0e040]));
    return e;
  };
  FURN.umbrella = (f, x, y, z, color) => {
    const ff = subFrame(f, x, y, z, 0);
    const e = fe('wood', 40, 3);
    A.box(ff, e, 'plain', 0, 1.2, 0, 0.06, 2.4, 0.06, 0xffffff, false);
    A.deco(ff, e, 'conePaint', 0, 2.4, 0, 2.6, 0.6, 2.6, color || U.pick([0xe04040, 0x40a0e0, 0xf0c030, 0xf070b0]));
    A.colBox(ff, e, 0, 1.2, 0, 0.2, 2.4, 0.2);
    return e;
  };
  FURN.towel = (f, x, y, z, r, color) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('wood', 10, 1);
    e.noPickaxe = true;
    A.box(ff, e, 'fabric', 0, 0.01, 0, 0.9, 0.02, 1.9, color || U.pick([0xe04040, 0x40a0e0, 0xf0c030, 0xf070b0, 0x60d0a0]), false);
    return e;
  };
  FURN.goal = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 100, 6);
    A.box(ff, e, 'plain', -3.6, 1.2, 0, 0.12, 2.4, 0.12, 0xffffff);
    A.box(ff, e, 'plain', 3.6, 1.2, 0, 0.12, 2.4, 0.12, 0xffffff);
    A.box(ff, e, 'plain', 0, 2.4, 0, 7.3, 0.12, 0.12, 0xffffff, false);
    A.deco(ff, e, 'glass', 0, 1.2, -0.9, 7.2, 2.4, 0.02, 0xffffff);
    return e;
  };
  FURN.slide = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 120, 8);
    A.box(ff, e, 'paint', 0, 1.0, 0, 1.4, 0.1, 1.4, 0xe03030);
    [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach((p) => A.box(ff, e, 'paint', p[0], 0.5, p[1], 0.08, 1.0, 0.08, 0x3070d0, false));
    A.deco(ff, e, 'paint', 0, 0.55, 1.6, 0.8, 0.05, 2.2, 0xf0c020, -0.45, 0, 0);
    return e;
  };
  FURN.swing = (f, x, y, z, r) => {
    const ff = subFrame(f, x, y, z, r);
    const e = fe('metal', 100, 6);
    A.box(ff, e, 'paint', -1.5, 1.1, 0, 0.1, 2.2, 0.1, 0x3070d0);
    A.box(ff, e, 'paint', 1.5, 1.1, 0, 0.1, 2.2, 0.1, 0x3070d0);
    A.box(ff, e, 'paint', 0, 2.2, 0, 3.1, 0.1, 0.1, 0x3070d0, false);
    [-0.6, 0.6].forEach((sx) => { A.box(ff, e, 'dark', sx, 1.4, 0, 0.02, 1.6, 0.02, null, false); A.box(ff, e, 'paint', sx, 0.6, 0, 0.5, 0.05, 0.25, 0xe03030, false); });
    return e;
  };
  FURN.well = (f, x, y, z) => {
    const ff = subFrame(f, x, y, z, 0);
    const e = A.ent('furniture', 'stone', 200, { yield: 15 });
    A.box(ff, e, 'cylStone', 0, 0.45, 0, 1.8, 0.9, 1.8, 0xd0c8b8);
    A.box(ff, e, 'water', 0, 0.75, 0, 1.4, 0.05, 1.4, null, false);
    A.box(ff, e, 'furn', -0.8, 1.4, 0, 0.1, 1.9, 0.1, 0x7a5030, false);
    A.box(ff, e, 'furn', 0.8, 1.4, 0, 0.1, 1.9, 0.1, 0x7a5030, false);
    A.deco(ff, e, 'wedgePlanks', 0, 2.5, 0, 2.2, 0.6, 1.2, 0xa05030, 0, Math.PI / 2, 0);
    return e;
  };

  function subFrame(f, x, y, z, r) {
    const p = A.tp(f, x, z);
    return { x: p[0], y: f.y + y, z: p[1], rot: ((f.rot + (r || 0)) % 4 + 4) % 4 };
  }
  A.sub = subFrame;

  // Enseigne texturée (mesh individuel, non instancié)
  A.sign = function (f, lx, ly, lz, w, h, text, bg, fg, rotL, e) {
    const p = A.tp(f, lx, lz);
    const tex = G.Tex.sign(text, bg, fg);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set(p[0], f.y + ly, p[1]);
    m.rotation.y = A.tyaw(f) + (rotL || 0);
    G.scene.add(m);
    if (e) e.meshes.push(m);
    return m;
  };
})();
