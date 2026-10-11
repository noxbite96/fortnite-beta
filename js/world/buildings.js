// ============================================================
//  Générateurs de bâtiments complets (maisons, tours, granges...)
// ============================================================
(function () {
  const U = G.U, A = G.Arch, F = G.Arch.FURN, K = G.Kits;
  const B = {};
  G.Bld = B;
  const FH = 3.6;   // hauteur d'étage (= hauteur d'un mur construit)
  B.FH = FH;

  // Hauteur au sol : max aux coins pour éviter que le bâtiment flotte
  B.groundY = function (x, z, w, d, rot) {
    const s = rot % 2 ? [d, w] : [w, d];
    let h = -99, lo = 99;
    for (const dx of [-0.5, 0, 0.5]) for (const dz of [-0.5, 0, 0.5]) {
      const y = G.Terrain.height(x + dx * s[0], z + dz * s[1]);
      h = Math.max(h, y); lo = Math.min(lo, y);
    }
    return { top: h, low: lo };
  };

  // Fondation (dalle) qui descend jusqu'au sol
  B.foundation = function (f, w, d, kit, color, depth) {
    depth = depth || 2.5;
    const e = A.ent('piece', 'stone', 400, { structural: true, grounded: true, yield: 15 });
    A.box(f, e, kit || 'concrete', 0, (0.35 - depth) / 2, 0, w + 0.3, 0.35 + depth, d + 0.3, color || 0xb8b2a8);
    e.invulnerable = false;
    return e;
  };

  // Murs extérieurs d'un étage rectangulaire
  // types : fonction (side, index, count) -> type de segment
  B.walls = function (f, w, d, y, h, kit, color, typeFn, o) {
    o = o || {};
    const th = o.th || 0.25;
    const ents = [];
    const sides = [
      { along: 'x', len: w, lz: d / 2 - th / 2, lx: 0, name: 'front', out: 1 },
      { along: 'x', len: w, lz: -d / 2 + th / 2, lx: 0, name: 'back', out: -1 },
      { along: 'z', len: d - th * 2, lx: -w / 2 + th / 2, lz: 0, name: 'left', out: -1 },
      { along: 'z', len: d - th * 2, lx: w / 2 - th / 2, lz: 0, name: 'right', out: 1 },
    ];
    for (const s of sides) {
      const n = Math.max(1, Math.round(s.len / (o.segLen || 4)));
      const sl = s.len / n;
      for (let i = 0; i < n; i++) {
        const t = typeFn(s.name, i, n);
        if (t === 'none') continue;
        const off = -s.len / 2 + (i + 0.5) * sl;
        const opts = { mat: o.mat, hp: o.hp, trim: o.trim, shutters: o.shutters, inner: o.inner, innerColor: o.innerColor, innerSide: -s.out, outSide: s.out, doorColor: o.doorColor, sill: o.sill, winTop: o.winTop, addDoor: o.addDoor };
        let e;
        if (s.along === 'x') e = A.wallSeg(f, kit, color, s.lx + off, y, s.lz, sl, h, th, t, opts);
        else { opts.alongZ = true; e = A.wallSeg(f, kit, color, s.lx, y, s.lz + off, sl, h, th, t, opts); }
        ents.push(e);
      }
    }
    return ents;
  };

  // ------------------------------------------------------------
  //  MAISON DE BANLIEUE
  // ------------------------------------------------------------
  const HOUSE_STYLES = [
    { kit: 'siding', color: 0xf2efe6, roof: 0x8a3a2a, trim: 0xffffff, shutters: 0x2a4a7a },
    { kit: 'siding', color: 0x9ec4dc, roof: 0x4a4a52, trim: 0xffffff, shutters: 0xffffff },
    { kit: 'siding', color: 0xf0d890, roof: 0x7a3a2a, trim: 0xffffff, shutters: 0x3a6a3a },
    { kit: 'brick', color: 0xffffff, roof: 0x3a3a42, trim: 0xf4f1ea, shutters: null },
    { kit: 'siding', color: 0xc8e0b0, roof: 0x5a3a2a, trim: 0xffffff, shutters: 0x8a3a2a },
    { kit: 'plaster', color: 0xf4e4d4, roof: 0xa84a30, trim: 0xffffff, shutters: 0x4a7aa8 },
    { kit: 'siding', color: 0xe8b0a8, roof: 0x4a4a52, trim: 0xffffff, shutters: 0xffffff },
    { kit: 'brick', color: 0xd8c0b0, roof: 0x6a3a2a, trim: 0xffffff, shutters: 0x2a2a2a },
  ];
  B.HOUSE_STYLES = HOUSE_STYLES;

  B.house = function (x, z, rot, o) {
    o = o || {};
    const rng = o.rng || Math.random;
    const w = o.w || 12, d = o.d || 10, floors = o.floors || 2;
    const st = o.style || HOUSE_STYLES[Math.floor(rng() * HOUSE_STYLES.length)];
    const gy = B.groundY(x, z, w + 4, d + 4, rot);
    const f = A.frame(x, gy.top, z, rot);
    B.foundation(f, w, d, 'concrete', 0xb8b2a8, gy.top - gy.low + 1);
    const th = 0.25, base = 0.35;
    const wallKit = st.kit;
    const gableKit = wallKit === 'brick' ? 'wedgeBrick' : wallKit === 'plaster' ? 'wedgePlaster' : 'wedgeSiding';
    const inner = 'wallpaper', innerColors = [0xf0e8d8, 0xe0ecf4, 0xf4e0e0, 0xe8f0e0, 0xf4f0d0];
    const innerColor = innerColors[Math.floor(rng() * innerColors.length)];
    // escalier (le long du mur du fond)
    const run = 5.0, sw = 1.4;
    const sx0 = -w / 2 + th + 0.15, sz = -d / 2 + th + sw / 2 + 0.05;
    for (let fl = 0; fl < floors; fl++) {
      const y = base + fl * FH;
      B.walls(f, w, d, y, FH, wallKit, st.color, (side, i, n) => {
        if (fl === 0 && side === 'front' && i === Math.floor(n / 2)) return 'door';
        if (fl === 0 && side === 'back' && i === n - 1 && n > 1) return 'door';
        if (side === 'back' && i === 0 && fl < floors) return rng() < 0.5 ? 'solid' : 'window';
        return rng() < 0.65 ? 'window' : 'solid';
      }, { trim: st.trim, shutters: st.shutters, inner, innerColor });
      // sol de l'étage (ou plancher)
      const hole = fl > 0 ? [sx0 + run - 3.3, sz - sw / 2 - 0.05, sx0 + run + 0.15, sz + sw / 2 + 0.1] : null;
      A.floorTiles(f, fl === 0 ? 'woodFloor' : 'woodFloor', fl === 0 ? 0xffffff : 0xe8d8c0, -w / 2 + th, -d / 2 + th, w / 2 - th, d / 2 - th, y, fl === 0 ? 0.12 : 0.3, hole, { grounded: fl === 0, under: fl > 0 ? 'plaster' : null, underColor: 0xf8f8f8 });
      // escalier vers l'étage suivant
      if (fl < floors - 1) A.stairs(f, sx0, y, sz, run, FH, sw, 'furn', 0xa87848, 0);
      // cloison intérieure (évite la porte d'entrée)
      const nFront = Math.max(1, Math.round(w / 4));
      const xd = -w / 2 + (Math.floor(nFront / 2) + 0.5) * (w / nFront);
      let splitX = Math.max(sx0 + run + 1.2, xd + 2.0);
      if (w >= 10 && splitX < w / 2 - 2.5) {
        A.wallSeg(f, 'wallpaper', innerColor, splitX, y, (d / 2 - th + (-d / 2 + th + sw + 0.3)) / 2, d - th * 2 - sw - 0.3, FH, 0.15, 'door', { alongZ: true, addDoor: rng() < 0.5, trim: 0xffffff });
      }
      // meubles
      const rx0 = -w / 2 + th + 0.1, rx1 = w / 2 - th - 0.1, rz0 = sz + sw / 2 + 0.3, rz1 = d / 2 - th - 0.1;
      if (fl === 0) {
        // salon côté gauche, cuisine côté droit
        F.sofa(f, rx0 + 1.3, y, rz1 - 0.55, 2);
        F.rug(f, rx0 + 1.6, y, (rz0 + rz1) / 2, 0);
        F.tv(f, rx0 + 1.3, y, rz0 + 0.5, 0);
        F.lamp(f, rx0 + 0.3, y, rz1 - 0.3);
        if (w >= 10) {
          F.counter(f, rx1 - 0.35, y, (rz0 + rz1) / 2 - 0.4, 3, 2.4);
          F.fridge(f, rx1 - 0.45, y, rz1 - 0.5, 3);
          F.table(f, (splitX + rx1) / 2 - 0.3, y, (rz0 + rz1) / 2, 1, true);
        } else F.shelf(f, rx1 - 0.25, y, (rz0 + rz1) / 2, 3);
        A.loot(f, (rx0 + rx1) / 2 + U.rand(-1, 1), y + 0.05, (rz0 + rz1) / 2 + U.rand(-0.5, 0.5));
      } else {
        F.bed(f, rx0 + 1.0, y, (rz0 + rz1) / 2 + 0.3, 1);
        F.wardrobe(f, rx0 + 0.35, y, rz1 - 0.8, 1);
        if (w >= 10) {
          if (rng() < 0.5) { F.toilet(f, rx1 - 0.35, y, rz0 + 0.4, 3); F.bathtub(f, rx1 - 0.5, y, rz1 - 1.0, 0); }
          else { F.bed(f, rx1 - 1.0, y, (rz0 + rz1) / 2, 3); F.desk(f, (splitX + rx1) / 2, y, rz1 - 0.45, 2); }
        }
        A.loot(f, (rx0 + rx1) / 2 + U.rand(-1, 1), y + 0.05, (rz0 + rz1) / 2);
        if (rng() < 0.35) A.chest(f, rx1 - 0.6, y, rz0 + 0.5, 0);
      }
    }
    // plafond / sol du grenier
    const topY = base + floors * FH;
    A.floorTiles(f, 'woodFloor', 0xc8a878, -w / 2, -d / 2, w / 2, d / 2, topY, 0.3, null, { under: 'plaster', underColor: 0xf8f8f8 });
    // toit
    const rh = o.roofH || Math.min(3.4, d * 0.32);
    A.gableRoof(f, -w / 2, -d / 2, w / 2, d / 2, topY + 0.3, rh, 'roof', st.roof, gableKit, st.color, { overhang: 0.7 });
    // grenier : coffre
    if (rng() < 0.75) A.chest(f, U.rand(-w / 4, w / 4), topY + 0.3, 0, rng() < 0.5 ? 0 : Math.PI);
    else A.loot(f, 0, topY + 0.35, 0);
    // cheminée
    if (rng() < 0.6) {
      const e = A.ent('piece', 'stone', 250, { structural: true, yield: 10 });
      A.box(f, e, 'brick', w / 2 - 1.5, topY + rh * 0.6, -d / 4, 0.9, rh * 1.3 + 1, 0.9, 0xd8c8c0);
    }
    // porche
    if (o.porch !== false && rng() < 0.7) {
      const e = A.ent('piece', 'wood', 150, { structural: true, grounded: true, yield: 10 });
      A.box(f, e, 'planks', 0, 0.18, d / 2 + 1.1, 4.4, 0.36, 2.2, 0xd8c8b0);
      const r = A.ent('piece', 'wood', 150, { structural: true, yield: 8 });
      A.box(f, r, 'plain', -2.0, 1.7, d / 2 + 2.0, 0.2, 2.8, 0.2, st.trim);
      A.box(f, r, 'plain', 2.0, 1.7, d / 2 + 2.0, 0.2, 2.8, 0.2, st.trim);
      A.box(f, r, 'roof', 0, 3.2, d / 2 + 1.15, 4.8, 0.2, 2.4, st.roof);
    }
    // jardin : clôture, boîte aux lettres, haies
    if (o.garden !== false) {
      const gw = w + 8, gd = d + 8;
      if (rng() < 0.6) {
        const fc = rng() < 0.5 ? 0xf4f0e8 : 0x8a6a4a;
        F.fence(f, -gw / 4 - 1, 0, gd / 2, 0, gw / 2 - 2, fc);
        F.fence(f, gw / 4 + 1, 0, gd / 2, 0, gw / 2 - 2, fc);
        F.fence(f, -gw / 2, 0, 0, 1, gd, fc);
        F.fence(f, gw / 2, 0, 0, 1, gd, fc);
        F.fence(f, 0, 0, -gd / 2, 0, gw, fc);
      } else {
        F.hedge(f, -gw / 2, 0, 0, 1, gd * 0.8);
        F.hedge(f, gw / 2, 0, 0, 1, gd * 0.8);
      }
      F.mailbox(f, 2.6, 0, gd / 2 + 0.6, 0);
    }
    return f;
  };

  // ------------------------------------------------------------
  //  IMMEUBLE (ville) - plusieurs étages, toit accessible
  // ------------------------------------------------------------
  B.tower = function (x, z, rot, o) {
    o = o || {};
    const rng = o.rng || Math.random;
    const w = o.w || 12, d = o.d || 12, floors = o.floors || 4;
    const kit = o.kit || U.pick(['brick', 'concrete', 'plaster']);
    const color = o.color || (kit === 'brick' ? U.pick([0xffffff, 0xd8b0a0, 0xc8a890]) : U.pick([0xe8e0d0, 0xc8d8e8, 0xf0e0c0, 0xd0d0d0, 0xe8c8b8]));
    const gy = B.groundY(x, z, w + 2, d + 2, rot);
    const f = A.frame(x, gy.top, z, rot);
    B.foundation(f, w, d, 'concrete', 0xa8a8a8, gy.top - gy.low + 1);
    const th = 0.3, base = 0.35;
    const run = 5.0, sw = 1.35;
    const zA = -d / 2 + th + sw / 2 + 0.05, zB = zA + sw + 0.05;
    const xs = -w / 2 + th + 0.3, xe = xs + run;
    const shop = o.shop;
    for (let fl = 0; fl < floors; fl++) {
      const y = base + fl * FH;
      B.walls(f, w, d, y, FH, kit, color, (side, i, n) => {
        if (fl === 0 && side === 'front') return i === Math.floor(n / 2) ? (shop ? 'double' : 'door') : (shop ? 'wide' : 'window');
        if (fl === 0 && side === 'back' && i === 0) return 'solid';
        return rng() < 0.8 ? (o.wide ? 'wide' : 'window') : 'solid';
      }, { th, trim: o.trim || 0x6a6a6a, inner: 'plaster', innerColor: 0xf4f0e8, hp: kit === 'brick' ? 300 : 280, winTop: 2.6, sill: fl === 0 && shop ? 0.5 : 1.0 });
      // escaliers en va-et-vient
      const up = fl % 2 === 0;
      const stZ = up ? zA : zB, stX = up ? xs : xe;
      const hole = fl > 0 ? (fl % 2 === 1 ? [xe - 3.3, zA - sw / 2 - 0.05, xe + 0.3, zA + sw / 2] : [xs - 0.3, zB - sw / 2, xs + 3.3, zB + sw / 2 + 0.05]) : null;
      A.floorTiles(f, fl === 0 ? 'tiles' : 'woodFloor', fl === 0 ? 0xe8e8e8 : 0xd8c8b0, -w / 2 + th, -d / 2 + th, w / 2 - th, d / 2 - th, y, fl === 0 ? 0.12 : 0.3, hole, { grounded: fl === 0, under: fl > 0 ? 'plaster' : null, underColor: 0xf0f0f0 });
      A.stairs(f, stX, y, stZ, run, FH, sw, 'concrete', 0xc0c0c0, up ? 0 : 2);
      // rambarde de la cage d'escalier
      // meubles par étage
      const rz0 = zB + sw / 2 + 0.4, rz1 = d / 2 - th - 0.1, rx0 = -w / 2 + th + 0.1, rx1 = w / 2 - th - 0.1;
      if (fl === 0 && shop) {
        F.counter(f, rx1 - 1.5, y, rz0 + 0.6, 0, 2.4);
        F.shelfStore(f, -1.5, y, (rz0 + rz1) / 2 - 0.5, 0, Math.min(5, w - 5));
        if (rng() < 0.5) F.vending(f, rx0 + 0.5, y, rz1 - 0.6, 1);
        A.sign(f, 0, FH - 0.3, d / 2 + 0.2, Math.min(w - 2, 7), 1.1, shop, o.signBg || U.pick(['#d83030', '#2a6ad8', '#2aa050', '#e0a020', '#7a3ad8']), '#ffffff');
        // auvent
        const aw = A.ent('piece', 'wood', 80, { yield: 4 });
        A.deco(f, aw, 'fabric', 0, FH - 1.0, d / 2 + 0.9, w - 1, 0.08, 1.8, o.awning || U.pick([0xd83030, 0x2a6ad8, 0x2aa050, 0xe0a020]), -0.35, 0, 0);
      } else if (fl === 0) {
        F.sofa(f, rx0 + 1.4, y, rz1 - 0.6, 2);
        F.table(f, rx1 - 1.5, y, (rz0 + rz1) / 2, 0, true);
        F.shelf(f, rx1 - 0.3, y, rz0 + 0.5, 3);
      } else {
        const k = Math.floor(rng() * 4);
        if (k === 0) { F.bed(f, rx0 + 1.0, y, (rz0 + rz1) / 2, 1); F.wardrobe(f, rx1 - 0.35, y, (rz0 + rz1) / 2, 3); }
        else if (k === 1) { F.desk(f, rx0 + 1.2, y, rz1 - 0.5, 2); F.desk(f, rx1 - 1.2, y, rz1 - 0.5, 2); F.shelf(f, rx1 - 0.3, y, rz0 + 0.6, 3); }
        else if (k === 2) { F.sofa(f, 0, y, rz1 - 0.6, 2); F.tv(f, 0, y, rz0 + 0.6, 0); F.rug(f, 0, y, (rz0 + rz1) / 2, 0); }
        else { F.table(f, 0, y, (rz0 + rz1) / 2, 0, true); F.fridge(f, rx1 - 0.5, y, rz1 - 0.5, 3); F.counter(f, rx1 - 0.35, y, rz0 + 1.6, 3, 1.8); }
        if (rng() < 0.45) A.chest(f, U.rand(rx0 + 1, rx1 - 1), y, rz0 + 0.2, 0);
      }
      A.loot(f, U.rand(rx0 + 1, rx1 - 1), y + 0.05, U.rand(rz0 + 0.5, rz1 - 0.5));
    }
    // toit accessible : trou au-dessus du dernier escalier
    const topY = base + floors * FH;
    const lastUp = (floors - 1) % 2 === 0;
    const roofHole = lastUp ? [xe - 3.3, zA - sw / 2 - 0.05, xe + 0.3, zA + sw / 2] : [xs - 0.3, zB - sw / 2, xs + 3.3, zB + sw / 2 + 0.05];
    A.flatRoof(f, -w / 2, -d / 2, w / 2, d / 2, topY - 0.3, 'concrete', 0x9a9a9a, kit, color, { hole: roofHole, under: 'plaster', underColor: 0xf0f0f0 });
    // éléments de toit
    const re = A.ent('furniture', 'metal', 200, { yield: 15 });
    A.box(f, re, 'metalSheet', w / 4, topY + 0.8, d / 4, 1.8, 1.0, 1.4, 0xb8b8b8);
    if (rng() < 0.6) { // réservoir d'eau
      const wt = A.ent('furniture', 'wood', 200, { yield: 15 });
      A.box(f, wt, 'cylWood', -w / 4, topY + 2.4, d / 4, 2.2, 2.2, 2.2, 0xa87a50);
      A.deco(f, wt, 'conePaint', -w / 4, topY + 3.9, d / 4, 2.4, 0.8, 2.4, 0x5a5a5a);
      [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach((p) => A.box(f, wt, 'dark', -w / 4 + p[0], topY + 0.65, d / 4 + p[1], 0.12, 1.3, 0.12, null, false));
    }
    if (rng() < 0.6) A.chest(f, 0, topY, d / 4, 0); else A.loot(f, 0, topY + 0.05, d / 4);
    return f;
  };

  // ------------------------------------------------------------
  //  COMMERCE (un niveau, vitrine)
  // ------------------------------------------------------------
  B.shop = function (x, z, rot, o) {
    o = o || {};
    const w = o.w || 12, d = o.d || 10, h = o.h || 4.2;
    const gy = B.groundY(x, z, w + 2, d + 2, rot);
    const f = A.frame(x, gy.top, z, rot);
    B.foundation(f, w, d, 'concrete', 0xa8a8a8, gy.top - gy.low + 1);
    const kit = o.kit || 'plaster', color = o.color || U.pick([0xf0e8d8, 0xd8e8f0, 0xf0d8c8, 0xe0f0d8]);
    B.walls(f, w, d, 0.35, h, kit, color, (side, i, n) => {
      if (side === 'front') return i === Math.floor(n / 2) ? 'double' : 'wide';
      if (side === 'back' && i === 0) return 'door';
      return 'solid';
    }, { th: 0.3, trim: 0x505050, inner: 'plaster', innerColor: 0xf8f8f8, sill: 0.4, winTop: 3.0 });
    A.floorTiles(f, 'tiles', 0xf0f0f0, -w / 2, -d / 2, w / 2, d / 2, 0.35, 0.12, null, { grounded: true });
    A.flatRoof(f, -w / 2, -d / 2, w / 2, d / 2, 0.35 + h - 0.3, 'concrete', 0x9a9a9a, kit, color, { under: 'plaster', underColor: 0xffffff });
    const nshelves = Math.max(1, Math.floor((d - 4) / 2.2));
    for (let i = 0; i < nshelves; i++) F.shelfStore(f, -0.5, 0.35, -d / 2 + 1.8 + i * 2.2, 0, w - 5);
    F.counter(f, w / 2 - 1.8, 0.35, d / 2 - 2.0, 0, 2.2);
    if (o.sign) A.sign(f, 0, h - 0.1, d / 2 + 0.2, Math.min(w - 2, 8), 1.2, o.sign, o.signBg || '#d83030', '#ffffff');
    const aw = A.ent('piece', 'wood', 80, { yield: 4 });
    A.deco(f, aw, 'fabric', 0, h - 1.2, d / 2 + 0.9, w - 0.5, 0.08, 1.8, o.awning || U.pick([0xd83030, 0x2a6ad8, 0x2aa050, 0xe0a020]), -0.35, 0, 0);
    A.loot(f, U.rand(-w / 3, w / 3), 0.4, d / 2 - 1.2);
    A.loot(f, U.rand(-w / 3, w / 3), 0.4, -d / 2 + 1);
    if (Math.random() < 0.5) A.chest(f, -w / 2 + 1, 0.35, -d / 2 + 1, 0);
    if (Math.random() < 0.5) A.ammo(f, w / 2 - 1, 0.35, -d / 2 + 1, 0);
    return f;
  };

  // ------------------------------------------------------------
  //  GRANGE
  // ------------------------------------------------------------
  B.barn = function (x, z, rot, o) {
    o = o || {};
    const w = o.w || 20, d = o.d || 14, h = 5.2;
    const gy = B.groundY(x, z, w + 2, d + 2, rot);
    const f = A.frame(x, gy.top, z, rot);
    B.foundation(f, w, d, 'concrete', 0xa89a88, gy.top - gy.low + 1);
    const col = o.color || 0xb8392a;
    B.walls(f, w, d, 0.35, h, 'planks', col, (side, i, n) => {
      if ((side === 'left' || side === 'right') && i === Math.floor(n / 2)) return 'open';
      if (side === 'front' || side === 'back') return i % 2 ? 'window' : 'solid';
      return 'solid';
    }, { th: 0.3, trim: 0xffffff, hp: 220, segLen: 4.5, sill: 1.6, winTop: 3.0 });
    A.floorTiles(f, 'planks', 0xb09070, -w / 2, -d / 2, w / 2, d / 2, 0.35, 0.12, null, { grounded: true });
    // mezzanine (moitié gauche) + escalier qui y arrive par le bord
    const loftY = 0.35 + h;
    A.floorTiles(f, 'planks', 0xc8a878, -w / 2 + 0.3, -d / 2 + 0.3, -1, d / 2 - 0.3, loftY, 0.3, null, {});
    A.stairs(f, 4.4, 0.35, d / 2 - 1.2, 5.4, h, 1.4, 'planks', 0xa08060, 2);
    A.gableRoof(f, -w / 2, -d / 2, w / 2, d / 2, 0.35 + h, 5.0, 'roof', 0x6a4a3a, 'wedgePlanks', col, { overhang: 0.5 });
    // piliers sous la mezzanine
    for (const pz of [-d / 4, d / 4]) { const pe = A.ent('piece', 'wood', 200, { structural: true, grounded: true, yield: 6 }); A.box(f, pe, 'furn', -1.2, (0.35 + loftY) / 2, pz, 0.3, loftY - 0.35, 0.3, 0x7a5030); }
    for (let i = 0; i < 6; i++) F.hayBale(f, U.rand(1, w / 2 - 1.5), 0.35, U.rand(-d / 2 + 1.5, d / 2 - 3), Math.floor(Math.random() * 4));
    for (let i = 0; i < 5; i++) F.hayBale(f, U.rand(-w / 2 + 1.5, -3), loftY, U.rand(-d / 2 + 1.5, d / 2 - 1.5), Math.floor(Math.random() * 4));
    A.chest(f, -w / 2 + 2, loftY, 0, Math.PI / 2);
    A.loot(f, 3, 0.4, 0);
    A.loot(f, -5, loftY + 0.05, -3);
    A.ammo(f, w / 2 - 1.2, 0.35, -d / 2 + 1.5, -Math.PI / 2);
    return f;
  };

  // ------------------------------------------------------------
  //  HALLE D'USINE
  // ------------------------------------------------------------
  B.factory = function (x, z, rot, o) {
    o = o || {};
    const w = o.w || 30, d = o.d || 20, h = o.h || 8;
    const gy = B.groundY(x, z, w + 2, d + 2, rot);
    const f = A.frame(x, gy.top, z, rot);
    B.foundation(f, w, d, 'concrete', 0x9a9a9a, gy.top - gy.low + 1);
    const col = o.color || U.pick([0xc8ccd0, 0xb8c8d8, 0xd8c8b0]);
    B.walls(f, w, d, 0.35, h, 'metalSheet', col, (side, i, n) => {
      if (side === 'front' && (i === 1 || i === n - 2)) return 'garage';
      if (side === 'back' && i === Math.floor(n / 2)) return 'door';
      if ((side === 'left' || side === 'right') && i === 0) return 'door';
      return 'window';
    }, { th: 0.3, trim: 0x505a60, hp: 350, segLen: 5, sill: 4.2, winTop: 6.8 });
    A.floorTiles(f, 'concrete', 0xb0b0b0, -w / 2, -d / 2, w / 2, d / 2, 0.35, 0.12, null, { grounded: true });
    // passerelle le long du mur du fond
    const cwY = 0.35 + 4.4;
    A.floorTiles(f, 'metalSheet', 0x707880, -w / 2 + 0.3, -d / 2 + 0.3, w / 2 - 0.3, -d / 2 + 2.6, cwY, 0.2, null, { mat: 'metal', hp: 250 });
    const re = A.ent('piece', 'metal', 150, { structural: true, yield: 6 });
    A.box(f, re, 'dark', 0, cwY + 0.5, -d / 2 + 2.55, w - 1, 0.06, 0.06, null, false);
    for (let i = 0; i < 8; i++) A.box(f, re, 'dark', -w / 2 + 1 + i * (w - 2) / 7, cwY + 0.25, -d / 2 + 2.55, 0.06, 0.5, 0.06, null, false);
    for (let i = 0; i < 5; i++) { const px = -w / 2 + 2 + i * (w - 4) / 4; const pe = A.ent('piece', 'metal', 200, { structural: true, grounded: true, yield: 6 }); A.box(f, pe, 'paint', px, (0.35 + cwY) / 2, -d / 2 + 2.4, 0.25, cwY - 0.35, 0.25, 0xe0a030); }
    A.stairs(f, w / 2 - 1.2, 0.35, -d / 2 + 2.8 + 5.6, 5.6, 4.4, 1.4, 'metalSheet', 0x707880, 3);
    A.flatRoof(f, -w / 2, -d / 2, w / 2, d / 2, 0.35 + h - 0.3, 'metalSheet', 0x8a9098, null, null, { under: 'metalSheet', underColor: 0x9aa0a8 });
    // machines, caisses
    F.machine(f, -w / 4, 0.35, 2, 0);
    F.machine(f, w / 4, 0.35, 2, 0);
    F.machine(f, 0, 0.35, 4, 1);
    for (let i = 0; i < 6; i++) F.crate(f, U.rand(-w / 2 + 2, w / 2 - 2), 0.35, U.rand(d / 2 - 5, d / 2 - 1.5), 0, U.rand(0.9, 1.4));
    for (let i = 0; i < 4; i++) F.barrel(f, -w / 2 + 1.2 + i * 0.8, 0.35, d / 2 - 1.2);
    F.pallet(f, w / 2 - 2, 0.35, 0, 0);
    A.chest(f, 0, cwY, -d / 2 + 1.3, 0);
    A.chest(f, -w / 3, 0.35, -2, 0);
    A.loot(f, w / 3, 0.4, 0);
    A.loot(f, -w / 3, cwY + 0.05, -d / 2 + 1.3);
    A.ammo(f, w / 2 - 1, 0.35, d / 2 - 1.5, -Math.PI / 2);
    return f;
  };

  // Cheminée d'usine
  B.chimney = function (x, z, h) {
    const gy = G.Terrain.height(x, z);
    const f = A.frame(x, gy, z, 0);
    const e = A.ent('piece', 'stone', 600, { structural: true, grounded: true, yield: 25 });
    A.box(f, e, 'cylConcrete', 0, h / 2, 0, 3.2, h, 3.2, 0xb8a898);
    A.deco(f, e, 'cylPaint', 0, h - 1.5, 0, 3.3, 1.0, 3.3, 0xd03020);
    A.deco(f, e, 'cylPaint', 0, h - 3.5, 0, 3.3, 1.0, 3.3, 0xf0f0f0);
    return e;
  };

  // ------------------------------------------------------------
  //  CHALET / CABANE
  // ------------------------------------------------------------
  B.cabin = function (x, z, rot, o) {
    o = o || {};
    const w = o.w || 8, d = o.d || 7;
    const gy = B.groundY(x, z, w + 2, d + 2, rot);
    const f = A.frame(x, gy.top, z, rot);
    B.foundation(f, w, d, 'stoneWall', 0xc0b8b0, gy.top - gy.low + 1.5);
    const col = o.color || 0xc88a50;
    B.walls(f, w, d, 0.35, FH, 'planks', col, (side, i, n) => {
      if (side === 'front' && i === Math.floor(n / 2)) return 'door';
      return i % 2 ? 'window' : 'solid';
    }, { th: 0.3, trim: 0x6a4020, hp: 200, inner: 'planks', innerColor: 0xe8c8a0 });
    A.floorTiles(f, 'woodFloor', 0xffffff, -w / 2, -d / 2, w / 2, d / 2, 0.35, 0.12, null, { grounded: true });
    A.floorTiles(f, 'woodFloor', 0xc8a878, -w / 2, -d / 2, w / 2, d / 2, 0.35 + FH, 0.3, null, { under: 'planks', underColor: 0xd8b890 });
    A.gableRoof(f, -w / 2, -d / 2, w / 2, d / 2, 0.35 + FH + 0.3, 3.0, o.snow ? 'snow' : 'roof', o.snow ? 0xffffff : 0x5a3a2a, 'wedgePlanks', col, { overhang: 0.8 });
    F.bed(f, -w / 2 + 1.2, 0.35, 0, 1);
    F.table(f, w / 4, 0.35, -d / 4, 0, false);
    F.chair(f, w / 4, 0.35, -d / 4 + 0.8, 2);
    // cheminée en pierre
    const e = A.ent('piece', 'stone', 250, { structural: true, grounded: true, yield: 12 });
    A.box(f, e, 'stoneWall', w / 2 - 0.9, 3.5, -d / 2 + 0.9, 1.2, 7.5, 1.2, 0xd0c8c0);
    A.loot(f, 0, 0.4, 0);
    if (Math.random() < 0.6) A.chest(f, w / 2 - 1, 0.35, d / 2 - 1, Math.PI);
    return f;
  };

  // ------------------------------------------------------------
  //  CHÂTEAU
  // ------------------------------------------------------------
  B.castle = function (cx, cz) {
    const gy = G.Terrain.height(cx, cz);
    const f = A.frame(cx, gy, cz, 0);
    const S = 52, WH = 8, WT = 2.2;
    const stone = 0xd8d0c4;
    // remparts : segments de 6.5 m, chemin de ronde praticable
    const seg = (lx, lz, len, alongZ, gate) => {
      const n = Math.round(len / 6.5), sl = len / n;
      for (let i = 0; i < n; i++) {
        const off = -len / 2 + (i + 0.5) * sl;
        const px = alongZ ? lx : lx + off, pz = alongZ ? lz + off : lz;
        const e = A.ent('piece', 'stone', 600, { structural: true, grounded: true, yield: 20 });
        if (gate && i === Math.floor(n / 2)) {
          // porte fortifiée (arche)
          const gw = 4.5;
          const side = (sl - gw) / 2;
          if (alongZ) {
            A.box(f, e, 'stoneWall', px, WH / 2, pz - sl / 2 + side / 2, WT, WH, side, stone);
            A.box(f, e, 'stoneWall', px, WH / 2, pz + sl / 2 - side / 2, WT, WH, side, stone);
            A.box(f, e, 'stoneWall', px, WH - 1.5, pz, WT, 3, gw, stone);
          } else {
            A.box(f, e, 'stoneWall', px - sl / 2 + side / 2, WH / 2, pz, side, WH, WT, stone);
            A.box(f, e, 'stoneWall', px + sl / 2 - side / 2, WH / 2, pz, side, WH, WT, stone);
            A.box(f, e, 'stoneWall', px, WH - 1.5, pz, gw, 3, WT, stone);
          }
        } else {
          if (alongZ) A.box(f, e, 'stoneWall', px, WH / 2, pz, WT, WH, sl, stone);
          else A.box(f, e, 'stoneWall', px, WH / 2, pz, sl, WH, WT, stone);
        }
        // créneaux
        const m = Math.round(sl / 1.6);
        for (let k = 0; k < m; k++) {
          if (k % 2) continue;
          const o2 = -sl / 2 + (k + 0.5) * sl / m;
          const outer = alongZ ? (lx > 0 ? WT / 2 - 0.3 : -WT / 2 + 0.3) : (lz > 0 ? WT / 2 - 0.3 : -WT / 2 + 0.3);
          if (alongZ) A.box(f, e, 'stoneWall', px + outer, WH + 0.6, pz + o2, 0.6, 1.2, sl / m, stone);
          else A.box(f, e, 'stoneWall', px + o2, WH + 0.6, pz + outer, sl / m, 1.2, 0.6, stone);
        }
      }
    };
    seg(0, S / 2, S, false, true);
    seg(0, -S / 2, S, false, false);
    seg(-S / 2, 0, S, true, false);
    seg(S / 2, 0, S, true, false);
    // tours d'angle
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.castleTower(A.frame(cx + sx * S / 2, gy, cz + sz * S / 2, 0), stone);
    // escaliers vers le chemin de ronde (rampes de pierre)
    const st1 = A.ent('piece', 'stone', 500, { structural: true, grounded: true, yield: 20 });
    A.deco(f, st1, 'rampConcrete', -S / 2 + WT / 2 + 6, WH / 2, S / 2 - WT - 1.1, 12, WH, 2.2, 0xc8c0b4, 0, Math.PI, 0);
    A.rampCol(f, st1, -S / 2 + WT / 2 + 6, 0, S / 2 - WT - 1.1, 12, WH, 2.2, 2);
    const st2 = A.ent('piece', 'stone', 500, { structural: true, grounded: true, yield: 20 });
    A.deco(f, st2, 'rampConcrete', S / 2 - WT / 2 - 6, WH / 2, -S / 2 + WT + 1.1, 12, WH, 2.2, 0xc8c0b4, 0, 0, 0);
    A.rampCol(f, st2, S / 2 - WT / 2 - 6, 0, -S / 2 + WT + 1.1, 12, WH, 2.2, 0);
    // donjon
    const kf = A.frame(cx, gy, cz - 8, 0);
    const kw = 18, kd = 14, kfl = 3;
    B.foundation(kf, kw, kd, 'stoneWall', stone, 2);
    const run = 5.0, sw = 1.4;
    const zA = -kd / 2 + 0.4 + sw / 2, zB = zA + sw + 0.05;
    const xs = -kw / 2 + 0.7, xe = xs + run;
    for (let fl = 0; fl < kfl; fl++) {
      const y = 0.35 + fl * 4.2;
      B.walls(kf, kw, kd, y, 4.2, 'stoneWall', stone, (side, i, n) => {
        if (fl === 0 && side === 'front' && i === Math.floor(n / 2)) return 'double';
        return i % 2 ? 'window' : 'solid';
      }, { th: 0.6, trim: 0x8a7a6a, hp: 500, segLen: 4.5, sill: 1.4, winTop: 3.2, inner: fl === 0 ? 'stoneWall' : 'plaster', innerColor: fl === 0 ? 0xe8e0d0 : 0xf0e8d8 });
      const up = fl % 2 === 0;
      const hole = fl > 0 ? (fl % 2 === 1 ? [xe - 3.6, zA - sw / 2 - 0.05, xe + 0.3, zA + sw / 2] : [xs - 0.3, zB - sw / 2, xs + 3.6, zB + sw / 2 + 0.05]) : null;
      A.floorTiles(kf, fl === 0 ? 'stoneWall' : 'woodFloor', fl === 0 ? 0xb8b0a4 : 0xc8a878, -kw / 2 + 0.6, -kd / 2 + 0.6, kw / 2 - 0.6, kd / 2 - 0.6, y, fl === 0 ? 0.12 : 0.3, hole, { grounded: fl === 0, mat: fl === 0 ? 'stone' : 'wood' });
      if (fl < kfl) A.stairs(kf, up ? xs : xe, y, up ? zA : zB, run, 4.2, sw, 'stoneWall', 0xc8c0b4, up ? 0 : 2);
      if (fl === 0) {
        F.throne(kf, 0, y, -kd / 2 + 3.6, 0);
        F.rug(kf, 0, y, 1, 0, 2.2, 7, 0xa02020);
        F.table(kf, -4, y, 2, 1, true); F.table(kf, 4, y, 2, 1, true);
        F.banner(kf, -3, y + 2.4, -kd / 2 + 0.7, 0, 0xa02020); F.banner(kf, 3, y + 2.4, -kd / 2 + 0.7, 0, 0x2040a0);
        F.torch(kf, -6, y + 2.2, -kd / 2 + 0.6, 0); F.torch(kf, 6, y + 2.2, -kd / 2 + 0.6, 0);
        A.chest(kf, 0, y, -kd / 2 + 1.6, 0);
      } else if (fl === 1) {
        F.bed(kf, -4, y, 2, 1, 0xa02020); F.bed(kf, 4, y, 2, 3, 0x2040a0); F.wardrobe(kf, 0, y, kd / 2 - 1, 2);
        A.loot(kf, 0, y + 0.05, 0);
      } else {
        F.shelf(kf, -kw / 2 + 1, y, 2, 1); F.shelf(kf, kw / 2 - 1, y, 2, 3); F.desk(kf, 0, y, 3, 0);
        A.chest(kf, 4, y, -2, 0);
      }
    }
    const roofY = 0.35 + kfl * 4.2;
    const lastUp = (kfl - 1) % 2 === 0;
    A.flatRoof(kf, -kw / 2, -kd / 2, kw / 2, kd / 2, roofY - 0.3, 'stoneWall', 0xb8b0a4, 'stoneWall', stone, { hole: lastUp ? [xe - 3.6, zA - sw / 2 - 0.05, xe + 0.3, zA + sw / 2] : [xs - 0.3, zB - sw / 2, xs + 3.6, zB + sw / 2 + 0.05] });
    // mât + drapeau
    const fl2 = A.ent('furniture', 'wood', 60, { yield: 4 });
    A.box(kf, fl2, 'dark', kw / 4, roofY + 4, 0, 0.15, 8, 0.15, null);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6, 8, 1), new THREE.MeshLambertMaterial({ map: G.Tex.get('flag'), side: THREE.DoubleSide }));
    flag.position.set(cx + kw / 4 + 1.55, gy + roofY + 7.1, cz - 8);
    G.scene.add(flag);
    fl2.meshes.push(flag);
    G.Arch.flags = G.Arch.flags || []; G.Arch.flags.push(flag);
    A.chest(kf, -kw / 4, roofY, 0, 0);
    // cour : écuries, puits, étals
    F.well(f, 8, 0.0, 8);
    for (let i = 0; i < 3; i++) F.market(f, -14 + i * 4, 0, 16, 2);
    for (let i = 0; i < 5; i++) F.barrel(f, 18 + (i % 2) * 0.8, 0, 12 + i * 0.9);
    for (let i = 0; i < 4; i++) F.crate(f, -18, 0, 4 + i * 1.3, 0, 1.1);
    A.loot(f, 10, 0.1, 14); A.loot(f, -10, 0.1, 6);
    A.ammo(f, 18, 0, 16, 0);
    return f;
  };
  B.castleTower = function (f, stone) {
    const s = 7.5, h = 13, fl = 3;
    const e0 = [];
    const flh = (h - 0.35) / fl;
    const holeOdd = [-s / 2 + 0.6, 0.35, s / 2 - 0.6, s / 2 - 0.6], holeEven = [-s / 2 + 0.6, -s / 2 + 0.6, s / 2 - 0.6, -0.35];
    for (let k = 0; k < fl; k++) {
      const y = 0.35 + k * flh;
      e0.push(...B.walls(f, s, s, y, flh, 'stoneWall', stone, (side, i, n) => (k === 0 ? 'door' : 'window'), { th: 0.7, trim: 0x8a7a6a, hp: 500, segLen: 8, sill: 1.4, winTop: 2.6, addDoor: false }));
      A.floorTiles(f, 'woodFloor', 0xb89868, -s / 2 + 0.7, -s / 2 + 0.7, s / 2 - 0.7, s / 2 - 0.7, y, k === 0 ? 0.12 : 0.3, k > 0 ? (k % 2 ? holeOdd : holeEven) : null, { grounded: k === 0 });
      // escalier en travers
      A.stairs(f, -s / 2 + 1.0 + (k % 2 ? 4.8 : 0), y, k % 2 ? -1.6 : 1.9, 4.8, flh, 1.2, 'stoneWall', 0xc8c0b4, k % 2 ? 2 : 0);
    }
    A.flatRoof(f, -s / 2 - 0.4, -s / 2 - 0.4, s / 2 + 0.4, s / 2 + 0.4, h - 0.3, 'stoneWall', 0xb8b0a4, 'stoneWall', stone, { hole: fl % 2 ? holeOdd : holeEven });
    // toit conique décoratif sur piliers
    const r = A.ent('piece', 'wood', 200, { structural: true, yield: 8 });
    A.deco(f, r, 'coneRoof', 0, h + 4.6, 0, s + 1.6, 5, s + 1.6, 0x3a4a8a);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((p) => A.box(f, r, 'stoneWall', p[0] * (s / 2), h + 1.2, p[1] * (s / 2), 0.7, 2.0, 0.7, stone));
    A.loot(f, 0, h + 0.1, 1);
    if (Math.random() < 0.5) A.chest(f, 1.5, 0.35 + flh, 1.5, 0);
  };

  // ------------------------------------------------------------
  //  PETITES CONSTRUCTIONS
  // ------------------------------------------------------------
  B.silo = function (x, z, h, color) {
    const gy = G.Terrain.height(x, z);
    const f = A.frame(x, gy, z, 0);
    const e = A.ent('piece', 'metal', 500, { structural: true, grounded: true, yield: 30 });
    A.box(f, e, 'cylMetal', 0, h / 2, 0, 5, h, 5, color || 0xd8dce0);
    A.deco(f, e, 'hemiPaint', 0, h, 0, 5.1, 3.2, 5.1, 0xc0c4c8);
    return e;
  };
  B.waterTower = function (x, z) {
    const gy = G.Terrain.height(x, z);
    const f = A.frame(x, gy, z, 0);
    const e = A.ent('piece', 'metal', 400, { structural: true, grounded: true, yield: 25 });
    [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach((p) => A.box(f, e, 'paint', p[0], 7, p[1], 0.35, 14, 0.35, 0x8a9aa8));
    A.box(f, e, 'metalSheet', 0, 14.2, 0, 5.6, 0.4, 5.6, 0x8a9aa8);
    A.box(f, e, 'cylPaint', 0, 17, 0, 6, 5.2, 6, 0x6aa0d0);
    A.deco(f, e, 'conePaint', 0, 20.4, 0, 6.4, 1.8, 6.4, 0x4a7aa8);
    A.loot(f, 0, 14.45, 0);
    return e;
  };
  B.windmill = function (x, z) {
    const gy = G.Terrain.height(x, z);
    const f = A.frame(x, gy, z, 0);
    const e = A.ent('piece', 'wood', 400, { structural: true, grounded: true, yield: 25 });
    A.box(f, e, 'cylWood', 0, 6, 0, 5, 12, 5, 0xe8dcc8);
    A.deco(f, e, 'coneRoof', 0, 13.5, 0, 6, 3, 6, 0x7a3a2a);
    // pales tournantes (mesh dédié)
    const g = new THREE.Group();
    const bm = new THREE.MeshLambertMaterial({ color: 0xf4efe6 });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.5, 0.1), bm);
      b.position.y = 3.9; const p = new THREE.Group(); p.add(b); p.rotation.z = i * Math.PI / 2; g.add(p);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 8), new THREE.MeshLambertMaterial({ color: 0x5a3a2a }));
    hub.rotation.x = Math.PI / 2; g.add(hub);
    g.position.set(x, gy + 11, z + 2.8);
    G.scene.add(g);
    e.meshes.push(g);
    G.Arch.spinners = G.Arch.spinners || []; G.Arch.spinners.push({ obj: g, axis: 'z', speed: 0.6 });
    return e;
  };
  B.lighthouse = function (x, z) {
    const gy = G.Terrain.height(x, z);
    const f = A.frame(x, gy, z, 0);
    const e = A.ent('piece', 'stone', 600, { structural: true, grounded: true, yield: 30 });
    for (let i = 0; i < 6; i++) A.box(f, e, 'cylPaint', 0, 2.5 + i * 5, 0, 6 - i * 0.35, 5, 6 - i * 0.35, i % 2 ? 0xd83030 : 0xf8f8f8);
    A.box(f, e, 'dark', 0, 30.3, 0, 5, 0.6, 5, null);
    A.deco(f, e, 'glow', 0, 32, 0, 2.6, 3, 2.6, 0xfff4c0);
    A.deco(f, e, 'conePaint', 0, 34.4, 0, 3.6, 2, 3.6, 0xd83030);
    A.loot(f, 1.5, 30.6, 0);
    // escalier extérieur en colimaçon simplifié : rampes autour
    return e;
  };
  // Station-service : boutique + auvent + pompes
  B.gasStation = function (x, z, rot) {
    const f = B.shop(x, z, rot, { w: 10, d: 8, sign: 'STATION', signBg: '#e8a020' });
    const c = A.sub(f, 0, 0, 13, 0);
    const e = A.ent('piece', 'metal', 300, { structural: true, grounded: true, yield: 15 });
    [[-5, -3], [5, -3], [-5, 3], [5, 3]].forEach((p) => A.box(c, e, 'paint', p[0], 2.5, p[1], 0.4, 5, 0.4, 0xf0f0f0));
    A.box(c, e, 'paint', 0, 5.2, 0, 12, 0.5, 8, 0xe8e8e8);
    A.deco(c, e, 'paint', 0, 5.2, 4.02, 12, 0.5, 0.05, 0xd83030);
    A.deco(c, e, 'glow', 0, 4.9, 0, 10, 0.05, 6, 0xffffff);
    for (const px of [-2.5, 2.5]) {
      const pe = A.ent('furniture', 'metal', 120, { yield: 10 });
      A.box(c, pe, 'paint', px, 0.8, 0, 0.8, 1.6, 0.5, 0xd83030);
      A.box(c, pe, 'dark', px, 1.1, 0.26, 0.5, 0.3, 0.02, null, false);
    }
    A.loot(c, 0, 0.1, 0);
    return f;
  };
  B.clockTower = function (x, z) {
    const gy = G.Terrain.height(x, z);
    const f = A.frame(x, gy, z, 0);
    const s = 6, h = 24;
    const e = A.ent('piece', 'stone', 800, { structural: true, grounded: true, yield: 30 });
    A.box(f, e, 'brick', 0, h / 2, 0, s, h, s, 0xe0c8b8);
    A.box(f, e, 'concrete', 0, h + 0.3, 0, s + 0.6, 0.6, s + 0.6, 0xd8d0c8);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const p = [Math.sin(a) * (s / 2 + 0.02), Math.cos(a) * (s / 2 + 0.02)];
      const ref = K.add('clock', x + p[0], gy + h - 3.5, z + p[1], 3.6, 3.6, 0.05, 0xffffff, 0, a, 0);
      e.refs.push(ref);
    }
    A.deco(f, e, 'pyrRoof', 0, h + 3.1, 0, s + 0.4, 5, s + 0.4, 0x3a5a4a);
    return e;
  };
  B.radioTower = function (x, z) {
    const gy = G.Terrain.height(x, z);
    const f = A.frame(x, gy, z, 0);
    const e = A.ent('piece', 'metal', 500, { structural: true, grounded: true, yield: 25 });
    for (let i = 0; i < 8; i++) {
      const s = 4 - i * 0.4, y = i * 5;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((p) => A.box(f, e, 'paint', p[0] * s / 2, y + 2.5, p[1] * s / 2, 0.2, 5, 0.2, i % 2 ? 0xd83030 : 0xf0f0f0, i === 0));
      A.deco(f, e, 'paint', 0, y + 5, 0, s, 0.15, 0.15, 0xd83030); A.deco(f, e, 'paint', 0, y + 5, 0, 0.15, 0.15, s, 0xd83030);
    }
    A.deco(f, e, 'glow', 0, 41, 0, 0.5, 0.5, 0.5, 0xff3030);
    const b = A.ent('piece', 'metal', 250, { structural: true, grounded: true, yield: 12 });
    A.box(f, b, 'metalSheet', 5, 1.5, 0, 4, 3, 3, 0xc8c8c8);
    A.chest(f, 5, 0, 2.1, 0);
    return e;
  };
})();
