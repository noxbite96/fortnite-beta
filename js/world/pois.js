// ============================================================
//  Lieux nommés : placement des bâtiments, props et décor
// ============================================================
(function () {
  const U = G.U, A = G.Arch, F = G.Arch.FURN, B = G.Bld, T = G.Terrain, V = G.Veg, M = G.MapData;
  const POI = {};
  G.POI = POI;

  const rotToward = (x, z, tx, tz) => {
    const dx = tx - x, dz = tz - z;
    if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 1 : 3;
    return dz > 0 ? 0 : 2;
  };
  const block = (x, z, r) => V.blocked.push([x, z, r]);
  const paintFoot = (x, z, w, d, rot, col) => T.paintRect(x, z, (rot % 2 ? d : w) + 2, (rot % 2 ? w : d) + 2, 0, col || '#8c847a');

  function house(x, z, rot, o) { paintFoot(x, z, (o && o.w || 12) + 6, (o && o.d || 10) + 6, rot, '#7fae55'); paintFoot(x, z, (o && o.w || 12), (o && o.d || 10), rot); block(x, z, 11); return B.house(x, z, rot, o); }
  function tower(x, z, rot, o) { paintFoot(x, z, o.w || 12, o.d || 12, rot, '#9a9690'); block(x, z, 10); return B.tower(x, z, rot, o); }
  function shop(x, z, rot, o) { paintFoot(x, z, o.w || 12, o.d || 10, rot, '#9a9690'); block(x, z, 10); return B.shop(x, z, rot, o); }

  POI.lights = [];

  // ------------------------------------------------------------
  POI.generate = function () {
    const rng = U.RNG(777);
    // routes (peintes sur la carte des couleurs)
    for (const r of M.roads) T.paintRoad(r.pts, r.w, r.w >= 7 ? '#5a5c60' : '#9c8866', r.w >= 7 ? '#8e8a7e' : '#8a7654');
    POI.tours(rng); POI.parc(rng); POI.usine(rng); POI.ferme(rng); POI.chateau(rng);
    POI.sources(rng); POI.plage(rng); POI.lac(rng); POI.galerie(rng); POI.chalet(rng);
    POI.docks(rng);
    POI.base(rng);
    POI.landmarks(rng);
    POI.bridges();
    POI.roadside(rng);
    POI.spawnIsland(rng);
  };

  // ---------------- TOURS PENCHÉES (ville) ----------------
  POI.tours = function (rng) {
    const p = M.poiById('tours'), cx = p.x, cz = p.z;
    // dalle urbaine + boulevard intérieur (îlots de ville)
    T.paintRect(cx, cz, 150, 150, 0, '#a39f97');
    for (const sgn of [-1, 1]) {
      T.paintRect(cx + sgn * 42, cz, 11, 96, 0, '#8e8a84'); T.paintRect(cx, cz + sgn * 42, 96, 11, 0, '#8e8a84');
    }
    for (const sgn of [-1, 1]) {
      T.paintRect(cx + sgn * 42, cz, 8, 92, 0, '#56585c'); T.paintRect(cx, cz + sgn * 42, 92, 8, 0, '#56585c');
      for (let i = -40; i <= 40; i += 6) { T.paintRect(cx + sgn * 42, cz + i, 0.3, 2.5, 0, '#f0f0e0'); T.paintRect(cx + i, cz + sgn * 42, 2.5, 0.3, 0, '#f0f0e0'); }
    }
    // pelouses et petits jardins entre les immeubles
    for (const [dx, dz] of [[-26, -42 + 8], [26, 42 - 8], [-60, 0 + 12], [60, -12], [0 + 14, -60], [-14, 60]]) T.paintRect(cx + dx, cz + dz, 9, 5, 0, '#7fae55');
    // rues en croix + boulevard périphérique
    T.paintRect(cx, cz, 170, 12, 0, '#8e8a84'); T.paintRect(cx, cz, 12, 170, 0, '#8e8a84');
    T.paintRect(cx, cz, 170, 9, 0, '#56585c'); T.paintRect(cx, cz, 9, 170, 0, '#56585c');
    T.paintRect(cx, cz, 34, 34, 0, '#b8b2a6');
    for (let i = -80; i <= 80; i += 6) { T.paintRect(cx + i, cz, 3, 0.3, 0, '#f0f0e0'); T.paintRect(cx, cz + i, 0.3, 3, 0, '#f0f0e0'); }
    // bâtiments
    const L = [
      [-26, -26, 0, 'tower', { floors: 6, w: 12, d: 12 }], [26, -26, 0, 'tower', { floors: 4, shop: 'PIZZA', w: 14, d: 12 }],
      [-26, 26, 2, 'tower', { floors: 5, w: 12, d: 12 }], [26, 26, 2, 'tower', { floors: 3, shop: 'CAFÉ', w: 12, d: 12 }],
      [-56, -26, 0, 'shop', { sign: 'MARCHÉ', w: 14, d: 11 }], [56, -26, 0, 'tower', { floors: 3, w: 12, d: 12, kit: 'brick' }],
      [-56, 26, 2, 'tower', { floors: 4, w: 12, d: 12 }], [56, 26, 2, 'shop', { sign: 'GARAGE', w: 14, d: 11, signBg: '#3a3a3a' }],
      [-26, -58, 2, 'tower', { floors: 3, w: 12, d: 12, kit: 'brick' }], [26, -58, 2, 'house', { floors: 2 }],
      [-26, 58, 0, 'shop', { sign: 'BOULANGERIE', w: 13, d: 10, signBg: '#b86a2a' }], [26, 58, 0, 'tower', { floors: 5, w: 12, d: 12, shop: 'MUSIQUE' }],
      [-58, -58, 2, 'house', { floors: 2 }], [58, -58, 2, 'tower', { floors: 4, w: 12, d: 12 }],
      [-58, 58, 0, 'tower', { floors: 3, w: 12, d: 12, kit: 'concrete' }], [58, 58, 0, 'house', { floors: 2 }],
    ];
    for (const b of L) {
      const x = cx + b[0], z = cz + b[1];
      b[4].rng = rng;
      if (b[3] === 'tower') tower(x, z, b[2], b[4]);
      else if (b[3] === 'shop') shop(x, z, b[2], b[4]);
      else house(x, z, b[2], b[4]);
    }
    // place centrale : tour de l'horloge + fontaine
    B.clockTower(cx - 10, cz - 10); block(cx - 10, cz - 10, 5);
    fountain(cx + 8, cz + 8);
    // mobilier urbain
    const f0 = A.frame(cx, T.height(cx, cz), cz, 0);
    for (let i = -72; i <= 72; i += 18) {
      if (Math.abs(i) < 14) continue;
      F.streetLamp(A.frame(cx + i, T.height(cx + i, cz + 5.6), cz + 5.6, 0), 0, 0, 0, 2);
      F.streetLamp(A.frame(cx + 5.6, T.height(cx + 5.6, cz + i), cz + i, 0), 0, 0, 0, 3);
    }
    for (const sgn of [-1, 1]) for (let i = -36; i <= 36; i += 18) {
      if (Math.abs(i) < 10) continue;
      F.streetLamp(A.frame(cx + sgn * 42 + 5.2 * sgn, T.height(cx + sgn * 47, cz + i), cz + i, 0), 0, 0, 0, sgn > 0 ? 3 : 1);
      F.streetLamp(A.frame(cx + i, T.height(cx + i, cz + sgn * 47), cz + sgn * 42 + 5.2 * sgn, 0), 0, 0, 0, sgn > 0 ? 2 : 0);
    }
    for (let i = 0; i < 6; i++) {
      const sgn = rng() < 0.5 ? -1 : 1, along = rng() < 0.5, off = U.lerp(-34, 34, rng());
      if (Math.abs(off) < 9) continue;
      const x = along ? cx + off : cx + sgn * 42 + 2.2, z = along ? cz + sgn * 42 + 2.2 : cz + off;
      F.car(A.frame(x, T.height(x, z), z, 0), 0, 0, 0, along ? 1 : 0);
    }
    for (let i = 0; i < 10; i++) {
      const along = rng() < 0.5;
      const off = (rng() < 0.5 ? -1 : 1) * U.lerp(16, 76, rng());
      const side = rng() < 0.5 ? -3.2 : 3.2;
      const x = along ? cx + off : cx + side, z = along ? cz + side : cz + off;
      F.car(A.frame(x, T.height(x, z), z, 0), 0, 0, 0, along ? 1 : 0);
    }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const x = cx + Math.cos(a) * 14, z = cz + Math.sin(a) * 14;
      if (i % 2) F.bench(A.frame(x, T.height(x, z), z, 0), 0, 0, 0, rotToward(x, z, cx, cz));
      else F.planter(A.frame(x, T.height(x, z), z, 0), 0, 0, 0);
    }
    for (let i = 0; i < 6; i++) { const x = cx + U.lerp(-70, 70, rng()), z = cz + (rng() < 0.5 ? 7 : -7); F.hydrant(A.frame(x, T.height(x, z), z, 0), 0, 0, 0); F.trash(A.frame(x + 2, T.height(x + 2, z), z, 0), 0, 0, 0); }
    // arbres d'alignement
    for (let i = -70; i <= 70; i += 14) { if (Math.abs(i) < 18) continue; V.add('oak', cx + i, cz + 13, 0.6, rng); V.add('oak', cx + 13, cz + i, 0.6, rng); }
    A.loot(f0, 0, 0.1, 0);
  };

  function fountain(x, z) {
    const f = A.frame(x, T.height(x, z), z, 0);
    const e = A.ent('furniture', 'stone', 400, { yield: 25 });
    A.box(f, e, 'cylConcrete', 0, 0.4, 0, 7, 0.8, 7, 0xd8d0c4);
    A.box(f, e, 'water', 0, 0.75, 0, 6.2, 0.05, 6.2, null, false);
    A.box(f, e, 'cylConcrete', 0, 1.4, 0, 1.2, 2.0, 1.2, 0xd8d0c4, false);
    A.deco(f, e, 'cylConcrete', 0, 2.5, 0, 3, 0.3, 3, 0xd8d0c4);
    A.deco(f, e, 'water', 0, 3.1, 0, 0.5, 1.2, 0.5, null);
    block(x, z, 5);
    T.paintCircle(x, z, 6, '#c8c0b0');
  }
  POI.fountain = fountain;

  // ---------------- PARC PAISIBLE (banlieue) ----------------
  POI.parc = function (rng) {
    const p = M.poiById('parc'), cx = p.x, cz = p.z;
    T.paintCircle(cx, cz, 38, '#8e8a84'); T.paintCircle(cx, cz, 34, '#5a5c60'); T.paintCircle(cx, cz, 29, '#6fc04c');
    // terrain de foot
    T.paintRect(cx, cz, 30, 18, 0, '#62b442');
    const f = A.frame(cx, T.height(cx, cz), cz, 0);
    F.goal(f, -14.5, 0, 0, 1); F.goal(f, 14.5, 0, 0, 3);
    for (let i = 0; i < 8; i++) T.paintRect(cx - 14 + i * 4, cz, 2, 18, 0, i % 2 ? '#62b442' : '#6ec84c');
    T.paintRect(cx, cz, 0.3, 18, 0, '#ffffff');
    // aire de jeux + kiosque
    F.slide(A.frame(cx - 8, T.height(cx - 8, cz + 14), cz + 14, 0), 0, 0, 0, 0);
    F.swing(A.frame(cx + 7, T.height(cx + 7, cz + 15), cz + 15, 0), 0, 0, 0, 0);
    gazebo(cx, cz - 20);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; F.bench(A.frame(cx + Math.cos(a) * 26, T.height(cx + Math.cos(a) * 26, cz + Math.sin(a) * 26), cz + Math.sin(a) * 26, 0), 0, 0, 0, rotToward(cx + Math.cos(a) * 26, cz + Math.sin(a) * 26, cx, cz)); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; V.add(i % 2 ? 'oak' : 'birch', cx + Math.cos(a) * 24, cz + Math.sin(a) * 24, 0.75, rng); }
    // maisons en couronne
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + 0.2;
      const R = 54 + (i % 2) * 4;
      const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
      house(x, z, rotToward(x, z, cx, cz), { rng, floors: rng() < 0.75 ? 2 : 1, w: rng() < 0.5 ? 12 : 14, d: 10 });
      if (rng() < 0.6) F.car(A.frame(x + Math.cos(a) * -12 + 3, T.height(x, z), z + Math.sin(a) * -12, 0), 0, 0, 0, rotToward(x, z, cx, cz) % 2 ? 0 : 1);
    }
    A.loot(f, 0, 0.1, 5); A.loot(f, -10, 0.1, -10);
  };
  function gazebo(x, z) {
    const f = A.frame(x, T.height(x, z), z, 0);
    const e = A.ent('piece', 'wood', 250, { structural: true, grounded: true, yield: 15 });
    A.box(f, e, 'planks', 0, 0.25, 0, 7, 0.5, 7, 0xf0e8dc);
    [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach((p) => A.box(f, e, 'plain', p[0], 1.9, p[1], 0.25, 2.8, 0.25, 0xffffff));
    A.deco(f, e, 'pyrRoof', 0, 4.3, 0, 8.5, 2.2, 8.5, 0x5a7a9a);
    A.colBox(f, e, 0, 3.4, 0, 7.5, 0.3, 7.5);
    A.chest(f, 0, 0.5, 0, 0);
    block(x, z, 5);
  }

  // ---------------- USINE ROUILLÉE ----------------
  POI.usine = function (rng) {
    const p = M.poiById('usine'), cx = p.x, cz = p.z;
    T.paintRect(cx, cz, 150, 130, 0, '#8e8c86');
    T.paintRect(cx, cz, 140, 120, 0, '#a8a49c');
    for (let i = 0; i < 40; i++) T.paintCircle(cx + U.rand(-65, 65), cz + U.rand(-55, 55), U.rand(1, 4), '#8a8478', 0.5);
    B.factory(cx - 22, cz - 22, 0, { w: 32, d: 22, h: 9 }); block(cx - 22, cz - 22, 20);
    B.factory(cx + 30, cz + 20, 1, { w: 26, d: 18, h: 8, color: 0xd8c0a0 }); block(cx + 30, cz + 20, 17);
    B.factory(cx - 30, cz + 32, 0, { w: 20, d: 14, h: 7, color: 0xb8c8b8 }); block(cx - 30, cz + 32, 13);
    B.chimney(cx - 2, cz - 44, 28); B.chimney(cx + 8, cz - 44, 24); B.chimney(cx + 50, cz - 10, 30);
    block(cx - 2, cz - 44, 3); block(cx + 8, cz - 44, 3); block(cx + 50, cz - 10, 3);
    // parc à conteneurs
    const yard = A.frame(cx + 30, T.height(cx + 30, cz - 35), cz - 35, 0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      if (rng() < 0.2) continue;
      const lx = -12 + i * 8, lz = -6 + j * 4.2;
      F.container(yard, lx, 0, lz, 0, null, rng() < 0.25);
      if (rng() < 0.45) F.container(yard, lx, 2.65, lz, 0, null, false);
    }
    block(cx + 30, cz - 35, 18);
    F.truck(A.frame(cx + 8, T.height(cx + 8, cz - 6), cz - 6, 0), 0, 0, 0, 1);
    F.truck(A.frame(cx - 50, T.height(cx - 50, cz - 2), cz - 2, 0), 0, 0, 0, 0);
    block(cx + 8, cz - 6, 5); block(cx - 50, cz - 2, 5); block(cx + 2, cz + 8, 9);
    // cuves de carburant
    for (let i = 0; i < 3; i++) {
      const tx = cx - 55 + i * 11, tz = cz - 40;
      const f = A.frame(tx, T.height(tx, tz), tz, 0);
      const e = A.ent('piece', 'metal', 600, { structural: true, grounded: true, yield: 40 });
      A.box(f, e, 'cylMetal', 0, 5, 0, 9, 10, 9, [0xe8e8e8, 0xd8dce0, 0xf0e8d8][i]);
      A.deco(f, e, 'hemiPaint', 0, 10, 0, 9.1, 2.4, 9.1, 0xc8c8c8);
      A.deco(f, e, 'paint', 0, 5, 4.6, 0.6, 10, 0.12, 0x5a5a60);
      A.deco(f, e, 'paint', 0, 6, 4.56, 9.2, 0.8, 0.05, 0xd83030, 0, 0, 0);
      block(tx, tz, 6);
    }
    // bureaux
    tower(cx + 52, cz + 44, 3, { rng, floors: 2, w: 12, d: 10, kit: 'concrete', color: 0xd8d0c0, shop: 'BUREAUX', signBg: '#505a60' });
    // tapis roulant entre deux halls
    {
      const f = A.frame(cx + 2, T.height(cx + 2, cz + 8), cz + 8, 0);
      const e = A.ent('furniture', 'metal', 250, { yield: 20 });
      A.box(f, e, 'paint', 0, 1.1, 0, 16, 0.3, 1.6, 0x3a3a40);
      for (let i = 0; i < 9; i++) A.box(f, e, 'dark', -7.5 + i * 1.9, 0.5, 0, 0.15, 1.0, 1.4, null, false);
      for (let i = 0; i < 6; i++) FURN_crate(f, -6 + i * 2.4, 1.25, 0, rng);
    }
    // bobines de câble, piles de tuyaux, chariots élévateurs
    for (let i = 0; i < 5; i++) {
      const x = cx + U.lerp(-60, 60, rng()), z = cz + U.lerp(-50, 50, rng());
      if (V.inBlocked(x, z)) continue;
      const f = A.frame(x, T.height(x, z), z, Math.floor(rng() * 4));
      const e = A.ent('prop', 'wood', 120, { yield: 12 });
      A.deco(f, e, 'cylWood', 0, 1.1, 0, 2.2, 1.4, 2.2, 0xb08050, 0, 0, Math.PI / 2);
      A.deco(f, e, 'cylPaint', 0, 1.1, 0, 1.0, 1.5, 1.0, 0x3a3a3a, 0, 0, Math.PI / 2);
      A.colBox(f, e, 0, 1.1, 0, 1.4, 2.2, 2.2);
    }
    for (let i = 0; i < 3; i++) {
      const x = cx + U.lerp(-55, 55, rng()), z = cz + U.lerp(-45, 45, rng());
      if (V.inBlocked(x, z)) continue;
      const f = A.frame(x, T.height(x, z), z, Math.floor(rng() * 4));
      const e = A.ent('prop', 'metal', 200, { yield: 18 });
      for (let k = 0; k < 6; k++) A.deco(f, e, 'cylPaint', -0.9 + (k % 3) * 0.9, 0.45 + Math.floor(k / 3) * 0.78, 0, 0.8, 6, 0.8, 0x8a8a90, Math.PI / 2, 0, 0);
      A.colBox(f, e, 0, 0.8, 0, 2.8, 1.6, 6);
      block(x, z, 3.5);
    }
    for (let i = 0; i < 2; i++) POI.forklift(cx - 10 + i * 30, cz + 20 - i * 12, rng);
    // grue
    POI.crane(cx + 45, cz - 50);
    block(cx + 52, cz + 44, 9); block(cx + 45, cz - 50, 4);
    for (let i = 0; i < 12; i++) { const x = cx + U.rand(-60, 60), z = cz + U.rand(-50, 50); if (!V.inBlocked(x, z)) F.barrel(A.frame(x, T.height(x, z), z, 0), 0, 0, 0); }
    for (let i = 0; i < 10; i++) { const x = cx + U.rand(-60, 60), z = cz + U.rand(-50, 50); if (!V.inBlocked(x, z)) F.pallet(A.frame(x, T.height(x, z), z, 0), 0, 0, 0, Math.floor(rng() * 4)); }
    for (let i = 0; i < 8; i++) { const x = cx + U.rand(-60, 60), z = cz + U.rand(-50, 50); if (!V.inBlocked(x, z)) F.crate(A.frame(x, T.height(x, z), z, 0), 0, 0, 0, 0, 1.2); }
    // marquages au sol
    for (let i = 0; i < 12; i++) T.paintRect(cx - 40 + i * 7, cz + 55, 0.3, 6, 0, '#e8d040');
    T.paintRect(cx, cz + 10, 120, 0.5, 0, '#e8d040');
    // clôture grillagée
    const fr = A.frame(cx, T.height(cx, cz), cz, 0);
    for (let i = -3; i <= 3; i++) { if (i === 0) continue; F.fence(A.frame(cx + i * 20, T.height(cx + i * 20, cz - 64), cz - 64, 0), 0, 0, 0, 0, 19, 0x8a9098); F.fence(A.frame(cx + i * 20, T.height(cx + i * 20, cz + 64), cz + 64, 0), 0, 0, 0, 0, 19, 0x8a9098); }
    A.loot(fr, 0, 0.1, 0); A.loot(fr, 40, 0.1, 40); A.ammo(fr, -10, 0, 0, 0);
  };

  function FURN_crate(f, x, y, z, rng) { F.crate(f, x, y, z, 0, 0.8 + rng() * 0.4); }
  POI.forklift = function (x, z, rng) {
    const f = A.frame(x, T.height(x, z), z, Math.floor(rng() * 4));
    const e = A.ent('car', 'metal', 300, { yield: 30 });
    A.box(f, e, 'paint', 0, 0.8, 0, 1.3, 1.0, 2.2, 0xf0b020);
    A.box(f, e, 'dark', 0, 1.6, -0.5, 1.2, 0.6, 1.0, null, false);
    [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.35], [0.55, 0.35]].forEach((p) => A.box(f, e, 'dark', p[0], 2.2, p[1], 0.08, 1.8, 0.08, null, false));
    A.box(f, e, 'dark', 0, 3.1, -0.1, 1.2, 0.08, 1.0, null, false);
    A.box(f, e, 'dark', 0, 1.8, 1.25, 1.0, 2.8, 0.12, null, false);
    A.box(f, e, 'paint', -0.3, 0.3, 1.8, 0.12, 0.08, 1.2, 0x8a8a8a, false); A.box(f, e, 'paint', 0.3, 0.3, 1.8, 0.12, 0.08, 1.2, 0x8a8a8a, false);
    [[-0.7, 0.7], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]].forEach((p) => A.deco(f, e, 'cylPaint', p[0], 0.3, p[1], 0.6, 0.25, 0.6, 0x1a1a1a, 0, 0, Math.PI / 2));
    block(x, z, 2.5);
  };
  POI.crane = function (x, z) {
    const gy = T.height(x, z);
    const f = A.frame(x, gy, z, 0);
    const e = A.ent('piece', 'metal', 600, { structural: true, grounded: true, yield: 40 });
    for (let i = 0; i < 6; i++) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((p) => A.box(f, e, 'paint', p[0] * 1.1, 2 + i * 4, p[1] * 1.1, 0.25, 4, 0.25, 0xf0b020, i === 0));
      A.deco(f, e, 'paint', 0, 4 + i * 4, 1.1, 2.2, 0.15, 0.15, 0xf0b020, 0, 0, 0.9);
      A.deco(f, e, 'paint', 1.1, 4 + i * 4, 0, 0.15, 0.15, 2.2, 0xf0b020, 0.9, 0, 0);
    }
    A.box(f, e, 'paint', 8, 25, 0, 24, 1.0, 1.2, 0xf0b020, false);
    A.box(f, e, 'paint', -6, 24.5, 0, 4, 2, 2, 0x5a5a60, false);
    A.box(f, e, 'metalSheet', 0, 26, 0, 2.6, 2.2, 2.6, 0xe8e8e8, false);
    A.box(f, e, 'dark', 16, 20, 0, 0.06, 9, 0.06, null, false);
    A.box(f, e, 'container', 16, 15, 0, 3, 1.4, 1.6, 0xc04030, false);
    block(x, z, 3);
  };

  // ---------------- FERME FATALE ----------------
  POI.ferme = function (rng) {
    const p = M.poiById('ferme'), cx = p.x, cz = p.z;
    T.paintRect(cx, cz, 60, 50, 0, '#9a8a66');
    // champs
    const fields = [[-45, -40, 40, 34], [45, -40, 40, 34], [-45, 42, 40, 34], [45, 45, 40, 30]];
    fields.forEach((fd, k) => {
      const fx = cx + fd[0], fz = cz + fd[1];
      T.paintRect(fx, fz, fd[2], fd[3], 0, '#7a5a3a');
      for (let i = 0; i < fd[2] / 2; i++) T.paintRect(fx - fd[2] / 2 + i * 2 + 1, fz, 0.9, fd[3], 0, k % 2 ? '#8fb040' : '#6a4a2e');
      block(fx, fz, Math.min(fd[2], fd[3]) / 2 + 2);
      if (k % 2 === 0) POI.corn(fx, fz, fd[2] - 4, fd[3] - 4, rng);
      else POI.pumpkins(fx, fz, fd[2] - 4, fd[3] - 4, rng);
      // clôtures
      F.fence(A.frame(fx, T.height(fx, fz - fd[3] / 2 - 1), fz - fd[3] / 2 - 1, 0), 0, 0, 0, 0, fd[2], 0x8a6a4a);
      F.fence(A.frame(fx, T.height(fx, fz + fd[3] / 2 + 1), fz + fd[3] / 2 + 1, 0), 0, 0, 0, 0, fd[2] * 0.4, 0x8a6a4a);
    });
    B.barn(cx - 12, cz - 4, 0, {}); block(cx - 12, cz - 4, 14);
    house(cx + 18, cz + 10, 3, { rng, floors: 2, style: { kit: 'siding', color: 0xf4f0e0, roof: 0x3a3a42, trim: 0xffffff, shutters: 0x2a5a2a } });
    B.silo(cx - 28, cz - 16, 14, 0xd8dce0); B.silo(cx - 28, cz - 9, 12, 0xc8ccd0);
    block(cx - 28, cz - 16, 4); block(cx - 28, cz - 9, 4);
    B.windmill(cx + 22, cz - 20); block(cx + 22, cz - 20, 4);
    POI.coop(cx + 5, cz + 20);
    for (let i = 0; i < 7; i++) { const x = cx + U.rand(-25, 25), z = cz + U.rand(-22, 22); if (!V.inBlocked(x, z)) F.roundBale(A.frame(x, T.height(x, z), z, 0), 0, 0, 0, Math.floor(rng() * 4)); }
    POI.tractor(cx + 2, cz - 16);
    F.well(A.frame(cx + 6, T.height(cx + 6, cz + 4), cz + 4, 0), 0, 0, 0);
    const f = A.frame(cx, T.height(cx, cz), cz, 0);
    A.loot(f, 0, 0.1, 8); A.loot(f, -30, 0.1, 10);
  };
  POI.coop = function (x, z) {
    const f = A.frame(x, T.height(x, z), z, 0);
    const e = A.ent('piece', 'wood', 200, { structural: true, grounded: true, yield: 14 });
    A.box(f, e, 'planks', 0, 1.2, -1.4, 5, 2.4, 0.2, 0xe8d8b0); A.box(f, e, 'planks', -2.4, 1.2, 0, 0.2, 2.4, 3, 0xe8d8b0); A.box(f, e, 'planks', 2.4, 1.2, 0, 0.2, 2.4, 3, 0xe8d8b0);
    A.box(f, e, 'planks', -1.6, 1.2, 1.4, 1.8, 2.4, 0.2, 0xe8d8b0); A.box(f, e, 'planks', 1.6, 1.2, 1.4, 1.8, 2.4, 0.2, 0xe8d8b0);
    A.deco(f, e, 'wedgePlanks', 0, 2.9, 0, 3.4, 1.0, 5.4, 0xa04030, 0, Math.PI / 2, 0);
    A.colBox(f, e, 0, 2.6, 0, 5, 0.3, 3);
    A.chest(f, 0, 0, 0, 0);
    block(x, z, 4);
  };
  POI.tractor = function (x, z) {
    const f = A.frame(x, T.height(x, z), z, 0);
    const e = A.ent('car', 'metal', 350, { yield: 40 });
    A.box(f, e, 'paint', 0, 1.2, 0.6, 1.4, 1.0, 2.6, 0x30a040);
    A.box(f, e, 'paint', 0, 1.9, -0.6, 1.3, 1.6, 1.3, 0x30a040);
    A.box(f, e, 'glass', 0, 2.2, -0.6, 1.35, 0.8, 1.35, null, false);
    A.box(f, e, 'dark', 0, 2.75, -0.6, 1.5, 0.1, 1.5, null, false);
    A.deco(f, e, 'cylPaint', -0.9, 0.9, -0.9, 1.8, 0.4, 1.8, 0x222222, 0, 0, Math.PI / 2);
    A.deco(f, e, 'cylPaint', 0.9, 0.9, -0.9, 1.8, 0.4, 1.8, 0x222222, 0, 0, Math.PI / 2);
    A.deco(f, e, 'cylPaint', -0.8, 0.5, 1.5, 1.0, 0.3, 1.0, 0x222222, 0, 0, Math.PI / 2);
    A.deco(f, e, 'cylPaint', 0.8, 0.5, 1.5, 1.0, 0.3, 1.0, 0x222222, 0, 0, Math.PI / 2);
    A.box(f, e, 'dark', 0, 2.6, 1.4, 0.12, 1.2, 0.12, null, false);
    block(x, z, 3);
  };
  // maïs : plants hauts (instanciés, sans collision)
  POI.corn = function (cx, cz, w, d, rng) {
    if (!G.Kits.KIT_DEFS.veg_corn) {
      const parts = [];
      const st = new THREE.CylinderGeometry(0.04, 0.06, 2.2, 4); st.translate(0, 1.1, 0); parts.push(V.colored(st, 0x6a9a30));
      for (let i = 0; i < 4; i++) { const l = new THREE.BoxGeometry(0.9, 0.03, 0.15); l.translate(0.45, 0, 0); l.rotateZ(-0.5); l.rotateY(i * 1.6); l.translate(0, 0.6 + i * 0.35, 0); parts.push(V.colored(l, 0x7aaa38, 0.1)); }
      const cob = new THREE.CylinderGeometry(0.07, 0.07, 0.35, 5); cob.translate(0.1, 1.4, 0); parts.push(V.colored(cob, 0xf0d040));
      G.Kits.register('veg_corn', V.merge(parts), V.windMaterial(0.05), { mat: 'wood', noShadow: true });
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let x = -w / 2; x < w / 2; x += 2) for (let z = -d / 2; z < d / 2; z += 1.1) {
      if (rng() < 0.12) continue;
      const wx = cx + x + (rng() - 0.5) * 0.3, wz = cz + z + (rng() - 0.5) * 0.3;
      e.set(0, rng() * 6.28, 0); q.setFromEuler(e); p.set(wx, T.height(wx, wz), wz); const sc = 0.85 + rng() * 0.35; s.set(sc, sc, sc);
      m.compose(p, q, s);
      G.Kits.addMatrix('veg_corn', m, 0xffffff);
    }
  };
  POI.pumpkins = function (cx, cz, w, d, rng) {
    for (let i = 0; i < 26; i++) {
      const x = cx + (rng() - 0.5) * w, z = cz + (rng() - 0.5) * d;
      const f = A.frame(x, T.height(x, z), z, 0);
      const e = A.ent('prop', 'wood', 60, { yield: 6 });
      const s = 0.8 + rng() * 0.8;
      A.deco(f, e, 'spherePaint', 0, 0.35 * s, 0, 1.0 * s, 0.75 * s, 1.0 * s, 0xf08a20);
      A.deco(f, e, 'cylPaint', 0, 0.75 * s, 0, 0.1, 0.25, 0.1, 0x4a6a20);
      A.colBox(f, e, 0, 0.35 * s, 0, 0.9 * s, 0.7 * s, 0.9 * s);
    }
  };

  // ---------------- CHÂTEAU ROYAL ----------------
  POI.chateau = function (rng) {
    const p = M.poiById('chateau'), cx = p.x, cz = p.z;
    T.paintRect(cx, cz, 58, 58, 0, '#a89a80');
    T.paintRect(cx, cz + 40, 8, 30, 0, '#9a8a6a');
    B.castle(cx, cz);
    block(cx, cz, 40);
    for (let i = 0; i < 6; i++) { const x = cx + U.rand(-8, 8), z = cz + 36 + i * 4; F.torch(A.frame(x < cx ? cx - 4.5 : cx + 4.5, T.height(cx, z) + 1.5, z, 0), 0, 0, 0, x < cx ? 1 : 3); }
  };

  // ---------------- SOURCES SALÉES (village) ----------------
  POI.sources = function (rng) {
    const p = M.poiById('sources'), cx = p.x, cz = p.z;
    T.paintRect(cx, cz, 110, 8, 0, '#5a5c60'); T.paintRect(cx, cz, 8, 110, 0, '#5a5c60');
    const L = [[-18, -18, 0], [18, -20, 0], [-20, 20, 2], [20, 18, 2], [-44, -16, 1], [44, 16, 3]];
    L.forEach((h, i) => house(cx + h[0], cz + h[1], h[2], { rng, floors: i % 3 === 0 ? 1 : 2, w: i % 2 ? 12 : 10, d: 10 }));
    paintFoot(cx + 42, cz - 26, 26, 22, 0, '#8e8a84');
    B.gasStation(cx + 42, cz - 30, 0); block(cx + 42, cz - 26, 14);
    B.waterTower(cx - 40, cz + 28); block(cx - 40, cz + 28, 5);
    for (let i = 0; i < 4; i++) F.car(A.frame(cx + (i - 1.5) * 12, T.height(cx, cz + 5), cz + 5.5, 0), 0, 0, 0, 1);
    for (let i = 0; i < 5; i++) F.streetLamp(A.frame(cx - 50 + i * 25, T.height(cx - 50 + i * 25, cz - 5), cz - 5, 0), 0, 0, 0, 0);
    const f = A.frame(cx, T.height(cx, cz), cz, 0);
    A.loot(f, 0, 0.1, 0); A.ammo(f, 6, 0, 6, 0);
  };

  // ---------------- PLAGE PARADIS ----------------
  POI.plage = function (rng) {
    const p = M.poiById('plage'), cx = p.x, cz = p.z;
    // grande plage de sable
    T.paintSoftCircle(cx - 10, cz, 95, '226,205,150', 1);
    T.paintSoftCircle(cx - 10, cz, 70, '232,212,158', 1);
    // cabanes de plage colorées
    const cols = [0xf07a7a, 0x7ac0f0, 0xf0d060, 0x8ae08a, 0xd08af0, 0xf0a060];
    for (let i = 0; i < 6; i++) {
      const x = cx + 12, z = cz - 30 + i * 11;
      B.cabin(x, z, 3, { w: 6, d: 5, color: cols[i] });
      block(x, z, 5);
    }
    // bar de plage
    shop(cx + 30, cz + 2, 3, { sign: 'BAR DE LA PLAGE', w: 12, d: 9, kit: 'planks', color: 0xe8c890, signBg: '#20a0c0' });
    // tour de sauveteur
    POI.lifeguard(cx - 8, cz - 10);
    POI.lifeguard(cx - 10, cz + 28);
    // ponton
    POI.pier(cx - 20, cz + 8, 3, 40);
    // parasols et serviettes
    for (let i = 0; i < 12; i++) {
      const x = cx + U.rand(-12, 5), z = cz + U.rand(-35, 35);
      if (T.height(x, z) < 0.6) continue;
      F.umbrella(A.frame(x, T.height(x, z), z, 0), 0, 0, 0);
      F.towel(A.frame(x + 1.4, T.height(x + 1.4, z), z, 0), 0, 0, 0, Math.floor(rng() * 2));
    }
    for (let i = 0; i < 14; i++) { const x = cx + U.rand(-5, 40), z = cz + U.rand(-45, 45); if (!V.inBlocked(x, z) && T.height(x, z) > 1) V.add('palm', x, z, 0.8 + rng() * 0.4, rng); }
    // épave de bateau pirate
    POI.ship(cx - 8, cz - 48, 0.4);
    const f = A.frame(cx, T.height(cx, cz), cz, 0);
    A.loot(f, 0, 0.1, 0); A.loot(f, 5, 0.1, 20);
  };
  POI.lifeguard = function (x, z) {
    const f = A.frame(x, T.height(x, z), z, 0);
    const e = A.ent('piece', 'wood', 200, { structural: true, grounded: true, yield: 12 });
    [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach((p) => A.box(f, e, 'plain', p[0], 1.8, p[1], 0.2, 3.6, 0.2, 0xffffff));
    A.box(f, e, 'planks', 0, 3.7, 0, 3, 0.2, 3, 0xe8d8b8);
    A.box(f, e, 'plain', 0, 4.3, -1.4, 3, 1.0, 0.1, 0xd83030);
    A.box(f, e, 'plain', -1.4, 4.3, 0, 0.1, 1.0, 3, 0xd83030);
    A.deco(f, e, 'pyrRoof', 0, 6.0, 0, 3.8, 1.2, 3.8, 0xd83030);
    [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach((p) => A.box(f, e, 'plain', p[0], 4.6, p[1], 0.12, 1.8, 0.12, 0xffffff, false));
    const st = A.ent('piece', 'wood', 120, { structural: true, grounded: true, yield: 6 });
    A.deco(f, st, 'rampWood', 0, 1.8, 3.4, 3.6, 3.6, 1.0, 0xe8d8b8, 0, Math.PI / 2, 0);
    A.rampCol(f, st, 0, 0, 3.3, 1.0, 3.6, 3.6, 3);
    A.loot(f, 0, 3.85, 0);
    block(x, z, 3);
  };
  POI.pier = function (x, z, rot, len) {
    const f = A.frame(x, 1.4, z, rot);
    for (let i = 0; i < len / 4; i++) {
      const e = A.ent('piece', 'wood', 150, { structural: true, grounded: true, yield: 8 });
      A.box(f, e, 'planks', 0, 0, i * 4 + 2, 3.2, 0.25, 4, 0xc8a878);
      A.box(f, e, 'furn', -1.5, -1.6, i * 4 + 2, 0.25, 3.2, 0.25, 0x6a4a30, false);
      A.box(f, e, 'furn', 1.5, -1.6, i * 4 + 2, 0.25, 3.2, 0.25, 0x6a4a30, false);
    }
    const p = A.tp(f, 0, len - 2);
    A.chest(A.frame(p[0], 1.52, p[1], rot), 0, 0, 0, 0);
    // petit bateau
    const bp = A.tp(f, 4, len - 8);
    const bf = A.frame(bp[0], 0.2, bp[1], rot);
    const be = A.ent('car', 'wood', 200, { yield: 20 });
    A.box(bf, be, 'planks', 0, 0.3, 0, 2.2, 0.8, 5, 0xf0f0f0);
    A.box(bf, be, 'plain', 0, 0.75, 0, 2.3, 0.12, 5.1, 0x2060c0, false);
    A.box(bf, be, 'glass', 0, 1.2, -0.5, 1.8, 0.8, 0.1, null, false);
  };
  POI.ship = function (x, z, tilt) {
    const f = A.frame(x, T.height(x, z) - 0.5, z, 1);
    const e = A.ent('piece', 'wood', 600, { structural: true, grounded: true, yield: 40 });
    A.box(f, e, 'planks', 0, 1.0, 0, 6, 2.0, 18, 0x6a4a30);
    A.box(f, e, 'planks', -2.9, 2.6, 0, 0.3, 1.4, 18, 0x5a3a24);
    A.box(f, e, 'planks', 2.9, 2.6, 0, 0.3, 1.4, 18, 0x5a3a24);
    A.box(f, e, 'planks', 0, 2.1, 0, 5.6, 0.2, 17.5, 0x8a6a48);
    A.deco(f, e, 'wedgePlanks', 0, 1.0, 10.5, 6, 2.0, 3, 0x6a4a30, 0, 0, 0);
    A.box(f, e, 'planks', 0, 3.6, -7, 5.6, 3, 4, 0x5a3a24);
    const m = A.ent('piece', 'wood', 200, { structural: true, yield: 10 });
    A.box(f, m, 'furn', 0, 7, 1, 0.4, 10, 0.4, 0x5a3a24);
    A.deco(f, m, 'fabric', 0.3, 8, 1, 0.05, 5, 5, 0xf0e8d0, 0, 0, 0.08);
    A.chest(f, 0, 2.2, 3, 0);
    A.chest(f, 0, 5.1, -7, 0);
    block(x, z, 10);
  };

  // ---------------- LAC BUTIN ----------------
  POI.lac = function (rng) {
    const L = M.lake;
    // maison sur l'île
    house(L.island.x, L.island.z, 0, { rng, floors: 2, w: 12, d: 10, garden: false, porch: true, style: { kit: 'siding', color: 0xe0e8f0, roof: 0x2a4a6a, trim: 0xffffff, shutters: 0x2a4a6a } });
    for (let i = 0; i < 5; i++) { const a = i * 1.3; V.add('pine', L.island.x + Math.cos(a) * 13, L.island.z + Math.sin(a) * 13, 0.7, rng); }
    // cabanes au bord du lac
    const shore = [[L.x + 85, L.z - 25, 3], [L.x - 70, L.z - 50, 1], [L.x + 20, L.z + 88, 2], [L.x - 45, L.z + 78, 2]];
    shore.forEach((s) => { if (T.height(s[0], s[1]) > 1) { B.cabin(s[0], s[1], s[2], { color: U.pick([0xc88a50, 0xa87040, 0xd8a060]) }); block(s[0], s[1], 6); } });
    // hangar à bateaux + ponton
    POI.pier(L.x + 60, L.z - 10, 3, 20);
  };

  // ---------------- GALERIE MARCHANDE ----------------
  POI.galerie = function (rng) {
    const p = M.poiById('galerie'), cx = p.x, cz = p.z;
    T.paintRect(cx, cz + 10, 110, 50, 0, '#5a5c60');
    for (let i = 0; i < 18; i++) T.paintRect(cx - 50 + i * 6, cz + 4, 0.25, 8, 0, '#f0f0f0');
    for (let i = 0; i < 18; i++) T.paintRect(cx - 50 + i * 6, cz + 22, 0.25, 8, 0, '#f0f0f0');
    const signs = [['SUPER MARCHÉ', '#d83030'], ['JOUETS', '#e0a020'], ['SPORT', '#2a6ad8'], ['FLEURISTE', '#2aa050'], ['PHARMACIE', '#20a080']];
    shop(cx - 36, cz - 30, 0, { sign: signs[0][0], signBg: signs[0][1], w: 24, d: 16 });
    for (let i = 1; i < 5; i++) shop(cx - 14 + i * 13, cz - 28, 0, { sign: signs[i][0], signBg: signs[i][1], w: 12, d: 11 });
    for (let i = 0; i < 12; i++) {
      if (rng() < 0.35) continue;
      const x = cx - 48 + i * 8.5, z = cz + (i % 2 ? 4 : 22);
      F.car(A.frame(x, T.height(x, z), z, 0), 0, 0, 0, rng() < 0.5 ? 0 : 2);
    }
    for (let i = 0; i < 5; i++) F.streetLamp(A.frame(cx - 50 + i * 25, T.height(cx - 50 + i * 25, cz + 13), cz + 13, 0), 0, 0, 0, 0);
    // trottoir devant les boutiques + seconde rangée de boutiques en face
    T.paintRect(cx - 4, cz - 17, 104, 5, 0, '#b8b2a6');
    T.paintRect(cx - 4, cz + 38, 104, 5, 0, '#b8b2a6');
    const signs2 = [['CINÉMA', '#6a2ad8'], ['BURGER', '#d86a20'], ['BANQUE', '#1a6a4a'], ['LIBRAIRIE', '#8a4a2a']];
    for (let i = 0; i < 4; i++) shop(cx - 40 + i * 20, cz + 48, 2, { sign: signs2[i][0], signBg: signs2[i][1], w: 14, d: 11 });
    // maisons derrière les boutiques et château d'eau
    house(cx - 44, cz - 56, 2, { floors: 2 }); house(cx - 20, cz - 57, 2, { floors: 1 }); house(cx + 22, cz - 56, 2, { floors: 2 });
    if (B.waterTower) { B.waterTower(cx + 54, cz - 30); block(cx + 54, cz - 30, 6); }
    F.vending(A.frame(cx + 40, T.height(cx + 40, cz - 18), cz - 18, 0), 0, 0, 0, 0);
    F.vending(A.frame(cx + 42, T.height(cx + 42, cz - 18), cz - 18, 0), 0, 0, 0, 0);
    for (let i = 0; i < 4; i++) F.market(A.frame(cx - 40 + i * 6, T.height(cx - 40 + i * 6, cz - 12), cz - 12, 0), 0, 0, 0, 0);
    const f = A.frame(cx, T.height(cx, cz), cz, 0);
    A.loot(f, 0, 0.1, 12); A.loot(f, 30, 0.1, 30); A.ammo(f, -20, 0, 14, 0);
  };


  // ---------------- DOCKS DÉLABRÉS (port sur la côte nord) ----------------
  POI.docks = function (rng) {
    const p = M.poiById('docks'), cx = p.x, cz = p.z;
    const Y = 2.0;
    // quai : terrain aplani au bord de l'eau (on ne touche pas au fond marin)
    T.flattenRect(cx, cz + 6, 64, 22, 0, Y, 14);
    T.paintRect(cx, cz + 6, 132, 48, 0, '#8e8a82');
    T.paintRect(cx, cz + 6, 124, 42, 0, '#a09c94');
    for (let i = 0; i < 30; i++) T.paintCircle(cx + U.rand(-60, 60), cz + 6 + U.rand(-20, 20), U.rand(1, 3), '#8a8478', 0.5);
    for (let i = -56; i <= 56; i += 7) T.paintRect(cx + i, cz - 12, 4, 0.35, 0, '#e8c830');
    T.paintRect(cx, cz - 16, 128, 1.2, 0, '#e8c830');
    // entrepôts
    B.factory(cx - 36, cz + 16, 0, { w: 26, d: 16, h: 8, color: 0x8aa0b8 }); block(cx - 36, cz + 16, 16);
    B.factory(cx + 34, cz + 18, 0, { w: 24, d: 14, h: 7, color: 0xc89a6a }); block(cx + 34, cz + 18, 15);
    shop(cx - 2, cz + 20, 0, { sign: 'CAPITAINERIE', signBg: '#1e4a7a', w: 12, d: 9 });
    // piles de conteneurs
    const yard = A.frame(cx, Y, cz - 2, 0);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
      if (rng() < 0.18) continue;
      const lx = -22 + i * 9.5, lz = -3 + j * 4.2;
      F.container(yard, lx, 0, lz, 1, null, rng() < 0.2);
      if (rng() < 0.55) F.container(yard, lx, 2.65, lz, 1, null, false);
      if (rng() < 0.2) F.container(yard, lx, 5.3, lz, 1, null, false);
    }
    block(cx, cz - 2, 26);
    // grues et chariots élévateurs
    POI.crane(cx + 16, cz - 14); block(cx + 16, cz - 14, 4);
    POI.crane(cx - 44, cz - 12); block(cx - 44, cz - 12, 4);
    POI.forklift(cx + 4, cz - 10, rng); POI.forklift(cx - 30, cz + 2, rng);
    // pontons
    POI.pier(cx - 16, cz - 21, 2, 44); POI.pier(cx + 30, cz - 21, 2, 36);
    // caisses, tonneaux, lampadaires
    for (let i = 0; i < 14; i++) {
      const x = cx + U.rand(-58, 58), z = cz + 6 + U.rand(-16, 16);
      if (Math.abs(x - cx) < 30 && Math.abs(z - cz + 2) < 10) continue;
      const f = A.frame(x, T.height(x, z), z, 0);
      if (rng() < 0.6) F.crate(f, 0, 0, 0, Math.floor(rng() * 4), 0.8 + rng() * 0.5); else F.barrel(f, 0, 0, 0, U.pick([0x2a6ad8, 0xd83030, 0x3a8a3a]));
    }
    for (let i = -56; i <= 56; i += 16) F.streetLamp(A.frame(cx + i, T.height(cx + i, cz - 17), cz - 17, 0), 0, 0, 0, 2);
    F.fence(A.frame(cx, T.height(cx, cz + 29), cz + 29, 0), 0, 0, 0, 0, 60, 0x7a7a80);
    F.vending(A.frame(cx - 10, T.height(cx - 10, cz + 13), cz + 13, 0), 0, 0, 0, 2);
    F.truck(A.frame(cx + 54, T.height(cx + 54, cz + 4), cz + 4, 0), 0, 0, 0, 0); block(cx + 54, cz + 4, 5);
    const f0 = A.frame(cx, T.height(cx, cz), cz, 0);
    A.loot(f0, -10, 0.1, -10); A.loot(f0, 12, 0.1, 4); A.loot(f0, -48, 0.1, 2); A.ammo(f0, 40, 0, -6, 0);
    A.chest(A.frame(cx - 2, T.height(cx - 2, cz - 8), cz - 8, 0), 0, 0, 0, 0);
  };

  // ---------------- BASE MILITAIRE ----------------
  POI.base = function (rng) {
    const p = M.poiById('base'); if (!p) return;
    const cx = p.x, cz = p.z;
    const gy = T.height(cx, cz);
    // sol : terre battue + dalle de béton + héliport
    T.paintRect(cx, cz, 98, 78, 0, '#8a8570');
    T.paintRect(cx, cz, 86, 66, 0, '#7e7c70');
    for (let i = 0; i < 40; i++) T.paintCircle(cx + U.rand(-44, 44), cz + U.rand(-34, 34), U.rand(1, 3), '#6f6c5e', 0.5);
    T.paintRect(cx, cz + 30, 12, 16, 0, '#5a5a56');                 // entrée
    const hx = cx + 20, hz = cz - 18;
    T.paintCircle(hx, hz, 8, '#55565a'); T.paintCircle(hx, hz, 7.2, '#e8c830'); T.paintCircle(hx, hz, 6.6, '#55565a');
    T.paintRect(hx - 2, hz, 0.9, 6, 0, '#f0f0f0'); T.paintRect(hx + 2, hz, 0.9, 6, 0, '#f0f0f0'); T.paintRect(hx, hz, 4, 0.9, 0, '#f0f0f0');
    // clôture avec portail au sud
    const fc = 0x6a6a60;
    F.fence(A.frame(cx, T.height(cx, cz - 37), cz - 37, 0), 0, 0, 0, 0, 94, fc);
    F.fence(A.frame(cx - 47, T.height(cx - 47, cz), cz, 1), 0, 0, 0, 0, 74, fc);
    F.fence(A.frame(cx + 47, T.height(cx + 47, cz), cz, 1), 0, 0, 0, 0, 74, fc);
    F.fence(A.frame(cx - 27, T.height(cx - 27, cz + 37), cz + 37, 0), 0, 0, 0, 0, 40, fc);
    F.fence(A.frame(cx + 27, T.height(cx + 27, cz + 37), cz + 37, 0), 0, 0, 0, 0, 40, fc);
    // poste de garde + barrière
    {
      const f = A.frame(cx + 10, T.height(cx + 10, cz + 33), cz + 33, 0);
      const e = A.ent('piece', 'stone', 400, { structural: true, grounded: true, yield: 20 });
      A.box(f, e, 'concrete', 0, 1.4, 0, 3.2, 2.8, 3, 0xc8c8b8);
      A.box(f, e, 'glass', 0, 1.8, -1.52, 2.4, 1, 0.06, null, false);
      A.box(f, e, 'paint', 0, 2.95, 0, 3.6, 0.3, 3.4, 0x4a5a3a);
      const b = A.ent('prop', 'metal', 80, { yield: 5 });
      A.box(A.frame(cx, T.height(cx, cz + 36), cz + 36, 0), b, 'paint', -2, 1.1, 0, 9, 0.18, 0.18, 0xd83030, false);
      block(cx + 10, cz + 33, 3);
    }
    // hangars
    B.factory(cx - 24, cz - 17, 0, { w: 26, d: 17, h: 9, color: 0x6a7a52 }); block(cx - 24, cz - 17, 17);
    B.factory(cx - 26, cz + 17, 0, { w: 22, d: 14, h: 8, color: 0x7a8660 }); block(cx - 26, cz + 17, 15);
    // caserne
    shop(cx + 25, cz + 19, 0, { sign: 'CASERNE', signBg: '#3a4a2a', w: 14, d: 9 });
    // miradors (rampe pour monter)
    const watchtower = (x, z, rot) => {
      const y0 = T.height(x, z);
      const f = A.frame(x, y0, z, rot);
      const e = A.ent('piece', 'wood', 500, { structural: true, grounded: true, yield: 25 });
      for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) A.box(f, e, 'planks', lx, 2.6, lz, 0.35, 5.2, 0.35, 0x6a4a30);
      A.box(f, e, 'woodFloor', 0, 5.3, 0, 4, 0.25, 4, 0x8a6a40);
      for (const s of [-1, 1]) { A.box(f, e, 'planks', s * 1.95, 5.95, 0, 0.12, 1.1, 4, 0x6a4a30); }
      A.box(f, e, 'planks', 0, 5.95, -1.95, 4, 1.1, 0.12, 0x6a4a30);
      A.box(f, e, 'paint', 0, 7.9, 0, 4.6, 0.25, 4.6, 0x4a5a3a);
      for (const [lx, lz] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) A.box(f, e, 'planks', lx, 6.8, lz, 0.18, 2.2, 0.18, 0x6a4a30, false);
      // escalier : rampe de 5,3 m de haut sur 8 m, côté +z
      A.deco(f, e, 'planks', 0, 2.65, 5.95, 1.6, 0.2, 9.6, 0x8a6a40, Math.atan2(5.3, 8));
      A.rampCol(f, e, 0, 0, 6, 1.6, 5.3, 8, 3);
      A.deco(f, e, 'glow', 0, 7.6, 0, 0.5, 0.3, 0.5, 0xfff2b0);
      A.loot(f, 0, 5.5, 0);
      block(x, z, 4);
    };
    watchtower(cx - 40, cz + 30, 0);
    watchtower(cx + 40, cz - 30, 2);
    // antenne radio et radar tournant
    B.radioTower(cx + 40, cz + 30); block(cx + 40, cz + 30, 4);
    {
      const rx = cx + 36, rz = cz - 4, ry = T.height(rx, rz);
      const f = A.frame(rx, ry, rz, 0);
      const e = A.ent('piece', 'metal', 400, { structural: true, grounded: true, yield: 20 });
      A.box(f, e, 'concrete', 0, 0.5, 0, 3, 1, 3, 0xb8b8b0);
      A.box(f, e, 'paint', 0, 3, 0, 0.5, 4, 0.5, 0x5a5a60);
      const g = new THREE.Group(); g.position.set(rx, ry + 5.2, rz);
      const dm = new THREE.MeshLambertMaterial({ color: 0xe0e4e8, side: THREE.DoubleSide });
      const dish = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), dm); dish.rotation.x = Math.PI / 2 + 0.5; dish.position.z = 0.4; g.add(dish);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), new THREE.MeshLambertMaterial({ color: 0x5a5a60 })); arm.rotation.x = Math.PI / 2 - 0.5; arm.position.set(0, 0.5, 1.2); g.add(arm);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 })); tip.position.set(0, 1.0, 2.1); g.add(tip);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      G.scene.add(g);
      A.spinners = A.spinners || []; A.spinners.push({ obj: g, axis: 'y', speed: 0.9 });
      block(rx, rz, 3);
    }
    // char d'assaut (décor destructible, beaucoup de métal)
    {
      const tx = cx + 4, tz = cz + 4;
      const f = A.frame(tx, T.height(tx, tz), tz, 1);
      const e = A.ent('car', 'metal', 900, { yield: 90 });
      const olive = 0x5a6a42, dk = 0x2e3228;
      A.box(f, e, 'paint', 0, 1.0, 0, 3.4, 1.1, 6.4, olive);
      A.box(f, e, 'paint', 0, 1.85, -0.4, 2.6, 0.7, 3.2, olive, false);
      A.deco(f, e, 'cylPaint', 0, 1.95, 2.4, 0.28, 3.6, 0.28, dk, Math.PI / 2, 0, 0);
      for (const s of [-1, 1]) { A.box(f, e, 'dark', s * 1.75, 0.55, 0, 0.6, 1.1, 6.6, dk, false); for (let i = 0; i < 5; i++) A.deco(f, e, 'cylPaint', s * 1.75, 0.5, -2.6 + i * 1.3, 0.9, 0.62, 0.9, 0x3a3a38, 0, 0, Math.PI / 2); }
      A.box(f, e, 'dark', 0.6, 2.35, -0.9, 0.5, 0.35, 0.5, dk, false);
      block(tx, tz, 5);
    }
    // camions militaires, caisses, tonneaux, sacs de sable, lampadaires
    F.truck(A.frame(cx - 4, T.height(cx - 4, cz - 26), cz - 26, 1), 0, 0, 0, 0, 0x5a6a42); block(cx - 4, cz - 26, 5);
    F.truck(A.frame(cx + 6, T.height(cx + 6, cz + 22), cz + 22, 0), 0, 0, 0, 0, 0x5a6a42); block(cx + 6, cz + 22, 5);
    for (let i = 0; i < 16; i++) {
      const x = cx + U.rand(-42, 42), z = cz + U.rand(-32, 32);
      if (Math.abs(x - (cx - 25)) < 16 && Math.abs(z - cz) < 26) continue;
      if (Math.hypot(x - hx, z - hz) < 9 || Math.hypot(x - cx - 4, z - cz - 4) < 6) continue;
      const f = A.frame(x, T.height(x, z), z, 0);
      if (rng() < 0.65) F.crate(f, 0, 0, 0, Math.floor(rng() * 4), 0.9 + rng() * 0.4); else F.barrel(f, 0, 0, 0, U.pick([0x4a5a3a, 0x3a3a3a]));
    }
    for (const [x, z] of [[cx - 10, cz - 34], [cx + 20, cz + 34], [cx - 44, cz - 6], [cx + 44, cz + 6]]) F.streetLamp(A.frame(x, T.height(x, z), z, 0), 0, 0, 0, 0);
    const f0 = A.frame(cx, gy, cz, 0);
    A.loot(f0, 8, 0.1, -8); A.loot(f0, -8, 0.1, 30); A.loot(f0, 30, 0.1, 0); A.loot(f0, -40, 0.1, -30);
    A.ammo(f0, 16, 0, 8, 0); A.ammo(f0, -12, 0, -30, 0); A.ammo(f0, 34, 0, 26, 0);
    A.chest(A.frame(cx - 24, T.height(cx - 24, cz - 17), cz - 17, 0), 6, 0.1, 2, 0);
    A.chest(A.frame(cx - 26, T.height(cx - 26, cz + 17), cz + 17, 0), -4, 0.1, 0, 0);
    A.chest(A.frame(cx + 25, T.height(cx + 25, cz + 19), cz + 19, 0), 0, 0.1, 0, 0);
    A.chest(f0, 20, 0.1, -8, 0);
  };

  // ---------------- CHALET DU PIC ----------------
  POI.chalet = function (rng) {
    const p = M.poiById('chalet'), cx = p.x, cz = p.z;
    T.paintRect(cx, cz, 50, 40, 0, '#e8eef4');
    house(cx, cz, 2, { rng, floors: 2, w: 14, d: 12, garden: false, style: { kit: 'planks', color: 0xb87840, roof: 0xf4f8fc, trim: 0x6a4020, shutters: 0xa83030 } });
    B.cabin(cx - 20, cz + 10, 1, { snow: true }); block(cx - 20, cz + 10, 6);
    B.cabin(cx + 20, cz + 12, 3, { snow: true }); block(cx + 20, cz + 12, 6);
    B.cabin(cx + 2, cz + 24, 2, { snow: true, w: 7, d: 6 }); block(cx + 2, cz + 24, 6);
    // remontées mécaniques
    const M2 = M.mountain;
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const x = U.lerp(cx, M2.x - 10, t), z = U.lerp(cz, M2.z + 10, t);
      const f = A.frame(x, T.height(x, z), z, 0);
      const e = A.ent('piece', 'metal', 300, { structural: true, grounded: true, yield: 15 });
      A.box(f, e, 'paint', 0, 5, 0, 0.5, 10, 0.5, 0x5a5a60);
      A.deco(f, e, 'paint', 0, 10, 0, 4, 0.3, 0.3, 0x5a5a60, 0, -Math.PI / 4, 0);
      A.deco(f, e, 'paint', 1.4, 8.8, -1.4, 0.8, 0.9, 0.7, 0xd83030, 0, -Math.PI / 4, 0);
      block(x, z, 2);
    }
    const f = A.frame(cx, T.height(cx, cz), cz, 0);
    A.loot(f, 8, 0.1, 10);
    POI.campfire(cx + 10, cz + 4);
  };
  POI.campfire = function (x, z) {
    const f = A.frame(x, T.height(x, z), z, 0);
    const e = A.ent('prop', 'wood', 60, { yield: 6 });
    for (let i = 0; i < 6; i++) A.deco(f, e, 'cylWood', Math.cos(i) * 0.3, 0.2, Math.sin(i) * 0.3, 0.18, 0.9, 0.18, 0x6a4a30, 1.2, i, 0);
    for (let i = 0; i < 8; i++) A.deco(f, e, 'rockKit', Math.cos(i * 0.8) * 0.8, 0.1, Math.sin(i * 0.8) * 0.8, 0.35, 0.25, 0.35, 0x8a8a8a);
    A.deco(f, e, 'glow', 0, 0.5, 0, 0.5, 0.7, 0.5, 0xff8030);
    POI.lights.push([x, T.height(x, z) + 1, z, 0xff8030, 'fire']);
    for (let i = 0; i < 3; i++) { const a = i * 2.1; const lf = A.frame(x + Math.cos(a) * 2.2, T.height(x, z), z + Math.sin(a) * 2.2, 0); const le = A.ent('prop', 'wood', 60, { yield: 8 }); A.deco(lf, le, 'cylWood', 0, 0.3, 0, 0.5, 1.8, 0.5, 0x7a5a38, 0, a + Math.PI / 2, Math.PI / 2); A.colBox(lf, le, 0, 0.25, 0, 1.2, 0.5, 1.2); }
  };

  // ---------------- REPÈRES ----------------
  POI.landmarks = function (rng) {
    const lm = (id) => M.poiById(id);
    let p = lm('phare'); B.lighthouse(p.x, p.z); block(p.x, p.z, 5); B.cabin(p.x - 10, p.z + 6, 1, {}); block(p.x - 10, p.z + 6, 6);
    p = lm('station'); T.paintRect(p.x, p.z + 6, 30, 26, 0, '#8e8a84'); B.gasStation(p.x, p.z, 0); block(p.x, p.z + 6, 14);
    p = lm('camp');
    for (let i = 0; i < 4; i++) POI.tent(p.x + Math.cos(i * 1.6) * 9, p.z + Math.sin(i * 1.6) * 9, i);
    POI.campfire(p.x, p.z);
    B.cabin(p.x + 14, p.z - 8, 3, {}); block(p.x + 14, p.z - 8, 6);
    p = lm('epave'); POI.plane(p.x, p.z);
    p = lm('radio'); B.radioTower(p.x, p.z); block(p.x, p.z, 7);
    p = lm('moulin'); B.windmill(p.x, p.z); block(p.x, p.z, 4); house(p.x + 14, p.z + 6, 3, { rng, floors: 1, w: 10, d: 8 });
    POI.temple();
  };

  // ---------------- TEMPLE PERDU (ruine dans la forêt, gardée par des raptors) ----------------
  POI.temple = function () {
    if (M.poiById('temple')) return;
    // emplacement déterministe : clairière en forêt, loin des lieux nommés et des repères
    let best = null;
    for (let gx = -520; gx <= 520 && !best; gx += 20) for (let gz = -520; gz <= 520; gz += 20) {
      const x = gx + ((gz * 7) % 11), z = gz + ((gx * 5) % 13);
      const h = T.height(x, z);
      if (h < 4 || h > 40 || T.slope(x, z) > 0.18 || T.forest(x, z) < 0.35 || Math.hypot(x, z) > 600) continue;
      if (M.allPlaces().some((q) => Math.hypot(q.x - x, q.z - z) < q.r + 70)) continue;
      if (M.roads && M.roads.some((r) => r.pts.some((pt) => Math.hypot(pt[0] - x, pt[1] - z) < 30))) continue;
      best = [x, z]; break;
    }
    if (!best) return;
    const [x, z] = best;
    M.landmarks.push({ id: 'temple', name: 'Temple Perdu', x, z, r: 20 });
    block(x, z, 22);
    const gy = Math.min(T.height(x - 8, z - 8), T.height(x + 8, z - 8), T.height(x - 8, z + 8), T.height(x + 8, z + 8), T.height(x, z)) - 0.4;
    const f = A.frame(x, gy, z, 0);
    const moss = 0x8a8f74, stone = 0x9a9888, dark = 0x6a6e5a;
    // pyramide à 3 gradins
    const tiers = [[17, 2.4], [12, 2.3], [7.5, 2.3]];
    let y = 0;
    tiers.forEach(([w, h], i) => {
      const e = A.ent('piece', 'stone', 3000, { structural: true, grounded: i === 0, yield: 0 });
      A.box(f, e, 'stoneWall', 0, y + h / 2, 0, w, h, w, i % 2 ? stone : moss);
      // corniche plus sombre
      A.deco(f, e, 'stoneWall', 0, y + h - 0.12, 0, w + 0.3, 0.24, w + 0.3, dark);
      y += h;
    });
    const top = y;
    // escalier central (face +Z)
    A.stairs(f, 0, 0, 13.5, 10.3, top, 3.2, 'stoneWall', 0xb0ac98, 3);
    // sanctuaire au sommet : 4 piliers + dalle
    const se = A.ent('piece', 'stone', 1500, { structural: true, yield: 0 });
    for (const [px, pz] of [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]]) A.box(f, se, 'stoneWall', px, top + 1.6, pz, 0.9, 3.2, 0.9, stone);
    A.box(f, se, 'stoneWall', 0, top + 3.4, 0, 7.4, 0.5, 7.4, moss);
    A.deco(f, se, 'pyrRoof', 0, top + 4.4, 0, 5, 1.6, 5, dark);
    A.deco(f, se, 'glow', 0, top + 1.2, 0, 1.2, 1.2, 1.2, 0x40ff90);
    A.chest(f, 0, top, -1.2, 0);
    A.loot(f, 1.8, top + 0.1, 1.5); A.loot(f, -1.8, top + 0.1, 1.5);
    // torches de part et d'autre de l'escalier
    for (const s of [-1, 1]) {
      const te = A.ent('prop', 'stone', 200, { yield: 0 });
      A.box(f, te, 'stoneWall', s * 2.4, 0.9, 14.2, 0.5, 1.8, 0.5, dark);
      A.deco(f, te, 'glow', s * 2.4, 2.1, 14.2, 0.7, 0.9, 0.7, 0xff9030);
      POI.lights.push([x + s * 2.4, gy + 2.1, z + 14.2, 0xff9030, 'fire']);
    }
    // colonnes brisées et blocs tombés autour
    const cols = [[-11, -9, 3.5], [11, -10, 2.2], [-12, 6, 1.4], [12, 7, 4.2], [-6, -13, 2.8], [7, -13, 1.1]];
    for (const [cx, cz, ch] of cols) {
      const ce = A.ent('prop', 'stone', 400, { yield: 20 });
      A.box(f, ce, 'cylConcrete', cx, ch / 2 + 0.4, cz, 1.1, ch, 1.1, stone);
      A.deco(f, ce, 'stoneWall', cx, ch + 0.5, cz, 1.4, 0.2, 1.4, dark);
    }
    for (const [bx, bz, r] of [[-9, 11, 0.6], [9.5, 11.5, 1.1], [-13, -2, 0.3]]) {
      const be = A.ent('prop', 'stone', 300, { yield: 15 });
      A.deco(f, be, 'cylConcrete', bx, 0.7, bz, 1.0, 3, 1.0, stone, Math.PI / 2, r, 0);
      A.colBox(f, be, bx, 0.7, bz, 2.4, 1.2, 2.4);
    }
    // lianes qui pendent des gradins
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63, rr = 8.4;
      A.deco(f, null, 'plain', Math.cos(a) * rr, 1.6, Math.sin(a) * rr, 0.12, 1.4 + (i % 3) * 0.4, 0.12, 0x2a6a2a);
    }
    A.chest(f, -6, 0.1, 10.5, Math.PI);
    A.ammo(f, 6, 0.1, 10.5, Math.PI);
    A.loot(f, 0, 0.1, 17); A.loot(f, -10, 0.1, 0); A.loot(f, 10, 0.1, 0);
  };
  POI.tent = function (x, z, i) {
    const f = A.frame(x, T.height(x, z), z, 0);
    const e = A.ent('prop', 'wood', 80, { yield: 5 });
    A.deco(f, e, 'wedgePlanks', 0, 1.1, 0, 3, 2.2, 3.6, [0xe07030, 0x3070c0, 0x30a050, 0xd0b030][i % 4], 0, i * 0.8, 0);
    A.colBox(f, e, 0, 0.6, 0, 2.4, 1.2, 2.8, 2);
    A.loot(f, 0, 0.1, 0);
    block(x, z, 2.5);
  };
  POI.plane = function (x, z) {
    const f = A.frame(x, T.height(x, z), z, 1);
    const e = A.ent('piece', 'metal', 800, { structural: true, grounded: true, yield: 50 });
    A.deco(f, e, 'cylPaint', 0, 2.2, 0, 4.4, 20, 4.4, 0xe8e8e8, Math.PI / 2 - 0.05, 0, 0.1);
    A.colBox(f, e, 0, 2.2, 0, 4, 4.2, 19);
    A.deco(f, e, 'conePaint', 0, 2.4, 11.5, 4.4, 3, 4.4, 0xe8e8e8, Math.PI / 2, 0, 0);
    A.deco(f, e, 'paint', 7, 1.2, 1, 12, 0.4, 3.5, 0xd8d8d8, 0, 0.1, 0.12);
    A.deco(f, e, 'paint', -6, 0.6, 3, 8, 0.4, 3.2, 0xd8d8d8, 0, -0.4, -0.2);
    A.deco(f, e, 'paint', 0, 5.2, -8.5, 0.4, 4, 3, 0xd83030, 0.3, 0, 0);
    A.deco(f, e, 'paint', 0, 2.2, 0, 4.5, 0.4, 20.2, 0x2a6ad8, Math.PI / 2 - 0.05, 0, 0.1);
    A.chest(f, 0, 0.3, 2, 0); A.chest(f, 0, 0.3, -5, Math.PI);
    T.paintCircle(x, z, 16, '#6a5a44', 0.6);
    block(x, z, 12);
  };

  // ---------------- PONTS ----------------
  POI.bridges = function () {
    for (const r of M.roads) {
      // échantillonner la route
      const pts = r.pts;
      for (let i = 0; i < pts.length - 1; i++) {
        const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
        const len = Math.hypot(bx - ax, bz - az);
        let inWater = false, start = 0;
        for (let t = 0; t <= len; t += 1) {
          const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len;
          const wet = T.height(x, z) < 1.2;
          if (wet && !inWater) { inWater = true; start = t; }
          if ((!wet || t + 1 > len) && inWater) {
            inWater = false;
            const s0 = Math.max(0, start - 5), s1 = Math.min(len, t + 5);
            makeBridge(ax + (bx - ax) * s0 / len, az + (bz - az) * s0 / len, ax + (bx - ax) * s1 / len, az + (bz - az) * s1 / len, r.w);
          }
        }
      }
    }
  };
  function makeBridge(x0, z0, x1, z1, w) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 4) return;
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    const y = Math.max(2.4, T.height(x0, z0), T.height(x1, z1)) + 0.25;
    const n = Math.ceil(len / 4);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = U.lerp(x0, x1, t), z = U.lerp(z0, z1, t);
      const e = G.World.ent('piece', 'wood', 300, { structural: true, grounded: true, yield: 12 });
      const seg = len / n + 0.05;
      // visuel orienté
      G.World.addRef(e, G.Kits.add('planks', x, y - 0.2, z, w + 1, 0.4, seg, 0xb89060, 0, yaw, 0));
      G.World.addRef(e, G.Kits.add('furn', x + Math.cos(yaw) * (w / 2 + 0.4), y + 0.5, z - Math.sin(yaw) * (w / 2 + 0.4), 0.15, 0.12, seg, 0x6a4a30, 0, yaw, 0));
      G.World.addRef(e, G.Kits.add('furn', x - Math.cos(yaw) * (w / 2 + 0.4), y + 0.5, z + Math.sin(yaw) * (w / 2 + 0.4), 0.15, 0.12, seg, 0x6a4a30, 0, yaw, 0));
      G.World.addRef(e, G.Kits.add('furn', x, y - 2.5, z, 0.5, 4.5, 0.5, 0x5a3a24, 0, yaw, 0));
      // collision : boîte englobante approximative (plate)
      const hx = Math.abs(Math.sin(yaw)) * seg / 2 + Math.abs(Math.cos(yaw)) * (w + 1) / 2;
      const hz = Math.abs(Math.cos(yaw)) * seg / 2 + Math.abs(Math.sin(yaw)) * (w + 1) / 2;
      G.World.addCol(e, G.Phys.box(x - hx * 0.85, y - 0.4, z - hz * 0.85, x + hx * 0.85, y, z + hz * 0.85, e, 3));
    }
  }

  // ---------------- BORD DES ROUTES ----------------
  POI.roadside = function (rng) {
    for (const r of M.roads) {
      for (let i = 0; i < r.pts.length - 1; i++) {
        if (rng() < 0.5) continue;
        const t = 0.3 + rng() * 0.4;
        const x = U.lerp(r.pts[i][0], r.pts[i + 1][0], t) + (rng() - 0.5) * 2, z = U.lerp(r.pts[i][1], r.pts[i + 1][1], t);
        if (V.inPOI(x, z, 1) || T.height(x, z) < 1.5) continue;
        const ang = Math.atan2(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]);
        const ox = Math.cos(ang) * (r.w / 2 + 1.5), oz = -Math.sin(ang) * (r.w / 2 + 1.5);
        F.car(A.frame(x + ox, T.height(x + ox, z + oz), z + oz, 0), 0, 0, 0, Math.abs(Math.sin(ang)) > 0.7 ? 1 : 0);
      }
    }
    // maisons isolées
    const lone = [[-120, -60], [160, -130], [-60, 200], [230, 90], [-380, -140], [-250, 400], [380, -30], [140, 420], [-420, 260], [60, -380]];
    lone.forEach((l, i) => {
      const [x, z] = l;
      if (T.height(x, z) < 2 || T.slope(x, z) > 0.4 || V.inBlocked(x, z)) return;
      if (i % 3 === 0) { B.cabin(x, z, i % 4, {}); block(x, z, 7); paintFoot(x, z, 8, 7, 0); }
      else house(x, z, i % 4, { rng, floors: 1 + (i % 2), w: 10, d: 9 });
    });
  };

  // ---------------- ÎLE D'ATTENTE ----------------
  POI.spawnIsland = function (rng) {
    const s = M.spawnIsland;
    T.paintCircle(s.x, s.z, 40, '#6fc04c');
    T.paintCircle(s.x, s.z, 14, '#b8b2a6');
    house(s.x + 22, s.z - 8, 3, { rng, floors: 2, w: 12, d: 10, garden: false });
    B.cabin(s.x - 22, s.z + 10, 1, {}); block(s.x - 22, s.z + 10, 6);
    for (let i = 0; i < 8; i++) { const a = i * 0.8; V.add(i % 2 ? 'palm' : 'oak', s.x + Math.cos(a) * 34, s.z + Math.sin(a) * 34, 0.8, rng); }
    for (let i = 0; i < 4; i++) V.add('rock' + (i % 3), s.x + U.rand(-30, 30), s.z + U.rand(-30, 30), 1.5, rng);
    fountain(s.x, s.z);
    POI.spawnPoints = [];
    for (let i = 0; i < 100; i++) {
      const a = rng() * Math.PI * 2, r = 16 + rng() * 18;
      POI.spawnPoints.push([s.x + Math.cos(a) * r, s.z + Math.sin(a) * r]);
    }
  };
})();
