// ============================================================
//  Contenu supplémentaire : établis d'amélioration, cachettes,
//  tyroliennes et camionnettes de renfort (mode duo)
// ============================================================
(function () {
  const U = G.U, I = G.Items, P = G.Phys, T = G.Terrain;
  const X2 = { benches: [], hides: [], zips: [], vans: [], cards: [] };
  G.Extras2 = X2;

  // ------------------------------------------------------------
  //  Construction de modèles fusionnés (1 appel de rendu par objet)
  // ------------------------------------------------------------
  let solidMat, glowMat;
  function PB() { this.parts = []; this.glow = []; }
  PB.prototype.add = function (g, color, x, y, z, rx, ry, rz, glow, jitter) {
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')).setPosition(x || 0, y || 0, z || 0));
    (glow ? this.glow : this.parts).push(G.Veg.colored(g, color, jitter || 0));
    return this;
  };
  PB.prototype.box = function (sx, sy, sz, color, x, y, z, rx, ry, rz, glow, jitter) { return this.add(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z, rx, ry, rz, glow, jitter); };
  PB.prototype.cyl = function (rt, rb, h, seg, color, x, y, z, rx, ry, rz, glow) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz, glow); };
  PB.prototype.build = function () {
    if (!solidMat) { solidMat = new THREE.MeshLambertMaterial({ vertexColors: true }); glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); }
    const grp = new THREE.Group();
    if (this.parts.length) { const m = new THREE.Mesh(G.Veg.merge(this.parts), solidMat); m.castShadow = true; m.receiveShadow = true; grp.add(m); }
    if (this.glow.length) grp.add(new THREE.Mesh(G.Veg.merge(this.glow), glowMat));
    return grp;
  };
  function signMesh(text, bg, fg, w, h) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: G.Tex.sign(text, bg, fg), toneMapped: false }));
    return m;
  }
  // entité factice : les balles s'y arrêtent, rien n'est détruit
  const PROP = { mat: 'metal', invulnerable: true, dead: false, noPickaxe: true, refs: [], meshes: [], type: 'prop' };
  // Boîte de collision orientée par quart de tour
  function addCol(x, y, z, sx, sy, sz, rot, mask) {
    const w = rot % 2 ? sz : sx, d = rot % 2 ? sx : sz;
    const c = P.box(x - w / 2, y, z - d / 2, x + w / 2, y + sy, z + d / 2, PROP, mask == null ? 3 : mask);
    P.add(c);
    return c;
  }
  const _q = [];
  function clearAt(x, z, r, hmin) {
    const y = T.height(x, z);
    if (y < (hmin || 1.2) || T.slope(x, z) > 0.32) return false;
    return P.query(x - r, y - 0.5, z - r, x + r, y + 4, z + r, 1, _q).length === 0;
  }
  function findSpot(cx, cz, rMin, rMax, r, rng, tries) {
    for (let i = 0; i < (tries || 120); i++) {
      const a = rng() * Math.PI * 2, d = rMin + rng() * (rMax - rMin);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (clearAt(x, z, r)) return [x, z];
    }
    return null;
  }
  // repère local (avant = +z local) -> monde
  function local(o, lx, lz) { const c = Math.cos(o.yaw), s = Math.sin(o.yaw); return [o.x + c * lx + s * lz, o.z - s * lx + c * lz]; }

  // ------------------------------------------------------------
  //  1. ÉTABLIS D'AMÉLIORATION
  // ------------------------------------------------------------
  const UPGRADE_COST = [['wood', 100], ['stone', 200], ['metal', 300], ['metal', 400]];
  function benchModel() {
    const b = new PB();
    const wood = 0xa06c3c, dark = 0x5a3a20, metal = 0x70767e;
    b.box(2.2, 0.12, 1.0, wood, 0, 0.95, 0, 0, 0, 0, false, 0.08);
    for (const [x, z] of [[-1.0, -0.42], [1.0, -0.42], [-1.0, 0.42], [1.0, 0.42]]) b.box(0.1, 0.9, 0.1, dark, x, 0.45, z);
    b.box(2.0, 0.06, 0.8, dark, 0, 0.3, 0);
    b.box(0.5, 0.35, 0.4, 0x3a3a3e, -0.6, 0.5, 0.05); // caisse sous l'établi
    b.box(2.3, 1.4, 0.08, 0xb89a6a, 0, 1.7, -0.46); // panneau
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) b.box(0.04, 0.04, 0.02, 0x6a5a40, -0.9 + i * 0.36, 1.3 + j * 0.3, -0.41);
    b.box(0.06, 0.55, 0.03, metal, -0.75, 1.75, -0.41); b.box(0.22, 0.09, 0.04, metal, -0.75, 2.02, -0.41);
    b.box(0.05, 0.5, 0.03, 0x8a5a2a, -0.4, 1.65, -0.41); b.box(0.24, 0.11, 0.07, metal, -0.4, 1.9, -0.41);
    b.box(0.04, 0.3, 0.03, 0xd03030, -0.1, 1.55, -0.41); b.box(0.02, 0.18, 0.02, metal, -0.1, 1.33, -0.41);
    b.box(0.35, 0.03, 0.03, metal, 0.35, 1.95, -0.41); b.box(0.03, 0.3, 0.03, metal, 0.35, 1.8, -0.41);
    // étau
    b.box(0.35, 0.22, 0.3, 0x2a5aa0, 0.75, 1.12, 0.12); b.box(0.08, 0.08, 0.55, metal, 0.75, 1.14, 0.38); b.box(0.3, 0.05, 0.05, metal, 0.75, 1.14, 0.62);
    // boîte à outils
    b.box(0.6, 0.3, 0.3, 0xc82a2a, -0.5, 1.16, 0.18); b.box(0.32, 0.05, 0.05, 0x222222, -0.5, 1.35, 0.18); b.box(0.62, 0.04, 0.32, 0x9a1a1a, -0.5, 1.02, 0.18);
    // enclume
    b.box(0.22, 0.3, 0.22, 0x2a2a2e, 1.55, 0.15, 0.35); b.box(0.6, 0.16, 0.26, 0x3a3a42, 1.55, 0.38, 0.35); b.box(0.2, 0.1, 0.12, 0x3a3a42, 1.92, 0.4, 0.35);
    // engrenage lumineux
    b.cyl(0.26, 0.26, 0.04, 10, 0xffc830, 0, 2.18, -0.4, Math.PI / 2, 0, 0, true);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; b.box(0.1, 0.1, 0.04, 0xffc830, Math.cos(a) * 0.3, 2.18 + Math.sin(a) * 0.3, -0.4, 0, 0, a, true); }
    b.cyl(0.1, 0.1, 0.05, 8, 0x5a3a10, 0, 2.18, -0.39, Math.PI / 2, 0, 0, true);
    const g = b.build();
    const sg = signMesh('AMÉLIORATION', '#16305e', '#ffd83a', 1.9, 0.34); sg.position.set(0, 2.62, -0.44); g.add(sg);
    return g;
  }
  function placeBenches() {
    const rng = U.RNG(777);
    const ids = ['tours', 'usine', 'ferme', 'galerie', 'sources', 'chateau', 'parc', 'chalet', 'plage', 'docks', 'base'];
    for (const id of ids) {
      const p = G.MapData.poiById(id);
      const q = findSpot(p.x, p.z, p.r * 0.15, p.r * 0.75, 1.6, rng);
      if (!q) continue;
      const rot = Math.floor(rng() * 4), y = T.height(q[0], q[1]);
      const m = benchModel(); m.position.set(q[0], y - 0.02, q[1]); m.rotation.y = rot * Math.PI / 2;
      G.scene.add(m);
      const b = { x: q[0], y, z: q[1], yaw: rot * Math.PI / 2, m, poi: p.name };
      addCol(q[0], y, q[1], 2.3, 1.05, 1.1, rot);
      X2.benches.push(b);
    }
  }
  // Un bot peut-il améliorer une de ses armes ? (renvoie l'emplacement)
  X2.botUpgradeSlot = function (a) {
    let best = -1, bv = -1;
    for (let i = 0; i < 5; i++) {
      const it = a.slots[i];
      if (!it || !I.WEAPONS[it.id] || nextRarity(it) < 0) continue;
      const [m, cost] = UPGRADE_COST[it.rarity];
      if (a.mats[m] < cost) continue;
      const v = I.damage(it);
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  };
  X2.nearestBench = function (x, z, r) { let b = null, bd = r; for (const k of X2.benches) { const d = Math.hypot(k.x - x, k.z - z); if (d < bd) { bd = d; b = k; } } return b; };
  function nextRarity(it) {
    const rs = I.validRarities(it.id);
    for (const r of rs) if (r > it.rarity) return r;
    return -1;
  }
  X2.upgrade = function (a, b) {
    const it = a.curWeapon();
    if (!it) { if (a.isPlayer) { G.HUD.notify('Tenez une arme pour l\'améliorer', 1.5); G.Audio.play('build_fail'); } return false; }
    const nr = nextRarity(it);
    if (nr < 0) { if (a.isPlayer) { G.HUD.notify('Rareté maximale atteinte', 1.5); G.Audio.play('build_fail'); } return false; }
    const [m, cost] = UPGRADE_COST[it.rarity];
    if (!a.infiniteMats && a.mats[m] < cost) { if (a.isPlayer) { G.HUD.notify('Il faut ' + cost + ' ' + I.MAT[m].name.toLowerCase(), 1.5); G.Audio.play('build_fail'); } return false; }
    if (!a.infiniteMats) a.mats[m] -= cost;
    it.rarity = nr;
    a.heldKey = null; a.refreshHeld();
    G.Audio.play('upgrade', { pos: a.isPlayer ? null : [b.x, b.y + 1, b.z] });
    const col = new THREE.Color(I.RARITY[nr].hex);
    for (let i = 0; i < 50; i++) G.FX.glow.spawn(b.x + U.rand(-0.8, 0.8), b.y + 1.1, b.z + U.rand(-0.4, 0.4), U.rand(-3, 3), U.rand(2, 6), U.rand(-3, 3), col.r, col.g, col.b, 0.14, U.rand(0.5, 1.1), 9, 0.6);
    if (a.isPlayer) { G.HUD.notify(I.name(it).toUpperCase() + ' → ' + I.RARITY[nr].name.toUpperCase(), 2, 'upgrade'); G.HUD.pickupNote(I.name(it) + ' amélioré(e)', I.RARITY[nr].color); if (G.Match) G.Match.challengeEvent('upgrade'); }
    return true;
  };
  function benchText(pl) {
    const it = pl.curWeapon();
    if (!it) return 'Tenez une arme pour l\'améliorer';
    const nr = nextRarity(it);
    if (nr < 0) return I.name(it) + ' : rareté maximale';
    const [m, cost] = UPGRADE_COST[it.rarity];
    return 'Améliorer en ' + I.RARITY[nr].name + ' — ' + cost + ' ' + I.MAT[m].name.toLowerCase() + (pl.mats[m] < cost ? ' (pas assez)' : '');
  }

  // ------------------------------------------------------------
  //  2. CACHETTES (bennes, meules de foin, toilettes)
  // ------------------------------------------------------------
  const HIDE_TYPES = {
    dumpster: { name: 'Benne à ordures', w: 2.0, h: 1.35, d: 1.2 },
    hay: { name: 'Meule de foin', w: 2.0, h: 1.9, d: 1.7 },
    toilet: { name: 'Toilettes portatives', w: 1.2, h: 2.45, d: 1.2 },
  };
  function hideModel(type) {
    const b = new PB();
    if (type === 'dumpster') {
      const c = U.pick([0x2f6a3a, 0x2a4a8a, 0x5a5a5a]);
      b.box(2.0, 1.1, 1.2, c, 0, 0.7, 0, 0, 0, 0, false, 0.04);
      b.box(2.04, 0.18, 1.24, U.shade(c, -0.2), 0, 0.28, 0);
      b.box(0.98, 0.08, 1.28, U.shade(c, -0.12), -0.5, 1.3, 0.02, -0.06, 0, 0); b.box(0.98, 0.08, 1.28, U.shade(c, -0.12), 0.5, 1.3, 0.02, -0.06, 0, 0);
      b.box(2.1, 0.08, 0.08, 0x3a3a3a, 0, 1.0, 0.64); b.box(0.08, 0.5, 0.1, 0x3a3a3a, -1.05, 0.8, 0); b.box(0.08, 0.5, 0.1, 0x3a3a3a, 1.05, 0.8, 0);
      for (const [x, z] of [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]]) b.cyl(0.1, 0.1, 0.08, 8, 0x1a1a1a, x, 0.1, z, 0, 0, Math.PI / 2);
      b.box(0.9, 0.3, 0.02, 0xf0f0f0, 0, 0.75, 0.61);
    } else if (type === 'hay') {
      const y1 = 0xd8b850, y2 = 0xc8a440;
      b.box(2.0, 0.9, 1.7, y1, 0, 0.45, 0, 0, 0, 0, false, 0.18);
      b.box(1.9, 0.8, 1.6, y2, 0, 1.3, 0, 0, 0.05, 0, false, 0.18);
      b.box(1.5, 0.35, 1.3, y1, 0, 1.85, 0, 0, -0.08, 0, false, 0.2);
      for (let i = 0; i < 6; i++) b.box(0.03, 0.4, 0.03, 0xe8d070, U.rand(-0.8, 0.8), 2.05, U.rand(-0.5, 0.5), U.rand(-0.6, 0.6), 0, U.rand(-0.6, 0.6));
      b.box(2.02, 0.05, 0.04, 0x8a6a3a, 0, 0.5, 0.86); b.box(2.02, 0.05, 0.04, 0x8a6a3a, 0, 1.3, 0.81);
    } else {
      const c = U.pick([0x2a7ad8, 0x3aa84a, 0xe07a20]);
      b.box(1.2, 2.25, 1.2, c, 0, 1.15, 0);
      b.box(1.3, 0.14, 1.3, 0xf0f0f0, 0, 2.33, 0);
      b.box(0.95, 1.9, 0.04, U.shade(c, 0.12), 0, 1.1, 0.62);
      b.box(0.06, 0.18, 0.06, 0x333333, 0.34, 1.15, 0.66);
      b.box(0.3, 0.1, 0.02, 0xd02020, 0, 1.9, 0.65);
      b.cyl(0.07, 0.07, 0.5, 6, 0x333333, -0.4, 2.55, -0.4);
      b.box(0.5, 0.06, 0.02, 0x1a1a1a, 0, 2.05, 0.65);
    }
    return b.build();
  }
  function placeHides() {
    const rng = U.RNG(4242);
    const plan = [['tours', 'dumpster', 4], ['galerie', 'dumpster', 3], ['usine', 'dumpster', 3], ['ferme', 'hay', 5], ['chateau', 'hay', 1], ['parc', 'toilet', 2], ['plage', 'toilet', 2], ['sources', 'toilet', 1], ['chalet', 'toilet', 1], ['lac', 'toilet', 1], ['docks', 'dumpster', 3]];
    for (const [id, type, n] of plan) {
      const p = G.MapData.poiById(id);
      for (let i = 0; i < n; i++) {
        const q = findSpot(p.x, p.z, p.r * 0.2, p.r * 0.9, 1.4, rng);
        if (!q) continue;
        const rot = Math.floor(rng() * 4), y = T.height(q[0], q[1]);
        const H = HIDE_TYPES[type];
        const m = hideModel(type); m.position.set(q[0], y - 0.03, q[1]); m.rotation.y = rot * Math.PI / 2;
        G.scene.add(m);
        const s = { type, name: H.name, x: q[0], y, z: q[1], yaw: rot * Math.PI / 2, rot, m, h: H.h, w: H.w, d: H.d, occupant: null, wob: 0 };
        s.col = addCol(q[0], y, q[1], H.w, H.h, H.d, rot);
        X2.hides.push(s);
      }
    }
  }
  X2.enterHide = function (a, s) {
    if (s.occupant || a.state !== 'ground') return;
    s.occupant = a; a.hideSpot = s; a.prevState = a.state; a.state = 'hide';
    a.buildMode = false; a.cancelUse(); a.reloadT = 0; a.stopEmote(); a.grapple = null;
    a.char.root.visible = false;
    s.wob = 0.6;
    G.Audio.play('hide', { pos: [s.x, s.y + 1, s.z] });
    G.FX.dust(s.x, s.y + s.h, s.z, 8, 0.8);
    if (s.type === 'hay') for (let i = 0; i < 20; i++) G.FX.glow.spawn(s.x + U.rand(-0.8, 0.8), s.y + s.h, s.z + U.rand(-0.6, 0.6), U.rand(-2, 2), U.rand(1, 3), U.rand(-2, 2), 0.9, 0.78, 0.35, 0.08, 0.8, 8, 1);
    if (a.isPlayer) { G.HUD.notify('VOUS ÊTES CACHÉ(E)', 1.5); if (G.Match) G.Match.challengeEvent('hide'); }
  };
  X2.exitHide = function (a) {
    const s = a.hideSpot;
    if (!s) return;
    s.occupant = null; a.hideSpot = null;
    a.state = a.inLobby ? 'lobby' : 'ground';
    // sortie par l'avant, petit saut
    const f = local(s, 0, s.d / 2 + 0.7);
    a.pos.set(f[0], Math.max(T.height(f[0], f[1]), s.y) + 0.3, f[1]);
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
    a.vel.set(fx * 3, 6, fz * 3);
    a.grounded = false;
    a.char.root.visible = true; a.char.anim.mode = 'ground';
    a.refreshHeld();
    s.wob = 0.6;
    G.Audio.play('hide', { pos: [s.x, s.y + 1, s.z] });
  };
  X2.updateHidden = function (a, dt) {
    const s = a.hideSpot;
    if (!s) { a.state = 'ground'; return; }
    a.pos.set(s.x, s.y + 0.2, s.z);
    a.vel.set(0, 0, 0);
    a.grounded = true; a.crouching = true;
    a.char.root.visible = false;
    // on bouge dans la cachette : elle tremble
    const c = a.control;
    if (Math.abs(c.mx) + Math.abs(c.mz) > 0.1) s.wob = Math.max(s.wob, 0.25);
  };

  // ------------------------------------------------------------
  //  3. TYROLIENNES
  // ------------------------------------------------------------
  let cableMat, trolley;
  const ZIP_H = 6.3; // hauteur d'accroche du câble
  function poleModel() {
    const b = new PB();
    b.box(1.4, 0.3, 1.4, 0x9a9690, 0, 0.15, 0);
    b.cyl(0.14, 0.18, ZIP_H + 0.5, 8, 0x3a3e44, 0, (ZIP_H + 0.5) / 2, 0);
    b.box(0.14, 0.14, 0.9, 0x3a3e44, 0, ZIP_H + 0.35, 0.3);
    b.cyl(0.18, 0.18, 0.12, 10, 0xe8b020, 0, ZIP_H, 0.35, 0, 0, Math.PI / 2);
    for (let k = 0; k < 6; k++) b.box(0.44, 0.05, 0.05, 0x5a5e64, 0.18, 0.8 + k * 0.85, 0, 0, Math.PI / 2, 0);
    b.box(0.06, 5.2, 0.06, 0x5a5e64, 0.18, 3.1, -0.2); b.box(0.06, 5.2, 0.06, 0x5a5e64, 0.18, 3.1, 0.2);
    b.box(0.5, 0.5, 0.06, 0xf0c020, 0, 2.2, -0.2, 0, 0, Math.PI / 4, true);
    return b.build();
  }
  // Teste un câble entre deux points (dégagement du relief et des obstacles)
  function testLine(pa, pb) {
    const ya = T.height(pa[0], pa[1]) + ZIP_H, yb = T.height(pb[0], pb[1]) + ZIP_H;
    const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    const sag = Math.min(6, len * 0.025);
    const n = Math.ceil(len / 2);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = U.lerp(pa[0], pb[0], t), z = U.lerp(pa[1], pb[1], t), y = U.lerp(ya, yb, t) - sag * 4 * t * (1 - t);
      pts.push(new THREE.Vector3(x, y, z));
      if (t > 0.03 && t < 0.97) {
        if (T.height(x, z) > y - 2.9 || y < 1) return null;
        if (P.query(x - 0.6, y - 2.8, z - 0.6, x + 0.6, y + 0.4, z + 0.6, 1, _q).length) return null;
      }
    }
    return { pa, pb, pts, len, drop: Math.abs(ya - yb) };
  }
  function placeZips() {
    const rng = U.RNG(9090);
    if (!cableMat) cableMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const places = G.MapData.allPlaces();
    const poiDist = (x, z) => { let b = 1e9; for (const p of places) b = Math.min(b, Math.max(0, Math.hypot(p.x - x, p.z - z) - p.r)); return b; };
    // recherche : des hauteurs vers les vallées
    const cands = [];
    for (let i = 0; i < 260; i++) {
      const x = (rng() * 2 - 1) * 430, z = (rng() * 2 - 1) * 430;
      if (!clearAt(x, z, 1.3, 6)) continue;
      for (let d = 0; d < 9; d++) {
        const ang = rng() * Math.PI * 2, len = 80 + rng() * 170;
        const bx = x + Math.cos(ang) * len, bz = z + Math.sin(ang) * len;
        if (!clearAt(bx, bz, 1.3, 2)) continue;
        const l = testLine([x, z], [bx, bz]);
        if (!l) continue;
        l.score = Math.min(l.len, 200) * 0.5 + Math.min(l.drop, 40) - (poiDist(x, z) + poiDist(bx, bz)) * 0.25;
        cands.push(l);
      }
    }
    cands.sort((a, b) => b.score - a.score);
    const chosen = [];
    const far = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 140;
    for (const c of cands) {
      if (chosen.length >= 7) break;
      if (chosen.every((o) => far(o.pa, c.pa) && far(o.pa, c.pb) && far(o.pb, c.pa) && far(o.pb, c.pb))) chosen.push(c);
    }
    const nameAt = (x, z) => { let best = null, bd = 1e9; for (const p of places) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } } return bd < best.r + 90 ? best.name : 'la vallée'; };
    for (const z of chosen) {
      // longueurs cumulées
      const cum = [0];
      for (let i = 1; i < z.pts.length; i++) cum.push(cum[i - 1] + z.pts[i].distanceTo(z.pts[i - 1]));
      const line = { pts: z.pts, cum, len: cum[cum.length - 1], ends: [z.pa, z.pb], names: [nameAt(z.pa[0], z.pa[1]), nameAt(z.pb[0], z.pb[1])] };
      const curve = new THREE.CatmullRomCurve3(z.pts);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(200, z.pts.length * 2), 0.04, 5, false), cableMat);
      G.scene.add(tube);
      line.tube = tube;
      line.poles = [];
      for (let k = 0; k < 2; k++) {
        const e = line.ends[k], y = T.height(e[0], e[1]);
        const m = poleModel(); m.position.set(e[0], y, e[1]);
        const o = line.ends[1 - k];
        m.rotation.y = Math.atan2(o[0] - e[0], o[1] - e[1]);
        G.scene.add(m);
        addCol(e[0], y, e[1], 0.4, ZIP_H + 0.5, 0.4, 0);
        line.poles.push({ x: e[0], y, z: e[1], m });
      }
      line.minX = Math.min(z.pa[0], z.pb[0]) - 3; line.maxX = Math.max(z.pa[0], z.pb[0]) + 3;
      line.minZ = Math.min(z.pa[1], z.pb[1]) - 3; line.maxZ = Math.max(z.pa[1], z.pb[1]) + 3;
      X2.zips.push(line);
    }
  }
  function zipPoint(line, s, out) {
    s = U.clamp(s, 0, line.len);
    const c = line.cum;
    let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c[mid] <= s) lo = mid; else hi = mid; }
    const k = (s - c[lo]) / Math.max(1e-6, c[hi] - c[lo]);
    out.lerpVectors(line.pts[lo], line.pts[hi], k);
    return out;
  }
  function zipTangent(line, s, out) {
    const a = zipPoint(line, s - 1, new THREE.Vector3()), b = zipPoint(line, s + 1, out);
    return out.copy(b).sub(a).normalize();
  }
  // point du câble le plus proche (en s)
  function zipClosest(line, x, y, z) {
    let best = 1e9, bs = 0;
    for (let i = 0; i < line.pts.length; i++) {
      const p = line.pts[i];
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) + (p.z - z) * (p.z - z);
      if (d < best) { best = d; bs = line.cum[i]; }
    }
    return { s: bs, d: Math.sqrt(best) };
  }
  X2.startZip = function (a, line, s) {
    a.zip = { line, s: U.clamp(s, 0.6, line.len - 0.6), dir: 0, speed: 4 };
    a.prevState = a.state; a.state = 'zip';
    a.buildMode = false; a.cancelUse(); a.reloadT = 0; a.stopEmote(); a.grapple = null;
    a.refreshHeld();
    // direction : là où l'on regarde
    const tg = zipTangent(line, a.zip.s, new THREE.Vector3());
    const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
    a.zip.dir = tg.x * fx + tg.z * fz >= 0 ? 1 : -1;
    if (a.zip.s < 2) a.zip.dir = 1; else if (a.zip.s > line.len - 2) a.zip.dir = -1;
    G.Audio.play('zip_on', { pos: a.isPlayer ? null : [a.pos.x, a.pos.y, a.pos.z] });
    if (a.isPlayer && G.Match) G.Match.challengeEvent('zip');
  };
  X2.exitZip = function (a, jump) {
    const z = a.zip;
    if (!z) return;
    const tg = zipTangent(z.line, z.s, new THREE.Vector3());
    a.zip = null;
    a.state = a.inLobby ? 'lobby' : 'ground';
    a.char.anim.mode = 'ground';
    a.vel.set(tg.x * z.dir * z.speed * (jump ? 0.75 : 0.35), jump ? 9 : 4, tg.z * z.dir * z.speed * (jump ? 0.75 : 0.35));
    a.grounded = false; a.airT = 0;
    a.zipCd = 1.0;
    a.refreshHeld();
    if (a.isPlayer) { G.Audio.setLoop('zipline', 0); if (trolley) trolley.visible = false; }
  };
  const _tp = new THREE.Vector3(), _tg = new THREE.Vector3();
  X2.updateZip = function (a, dt) {
    const z = a.zip;
    if (!z) { a.state = 'ground'; return; }
    const line = z.line;
    zipTangent(line, z.s, _tg);
    // la direction suit la caméra
    const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
    const dot = _tg.x * fx + _tg.z * fz;
    if (Math.abs(dot) > 0.25) { const nd = dot > 0 ? 1 : -1; if (nd !== z.dir) { z.dir = nd; z.speed *= 0.4; } }
    const down = -_tg.y * z.dir; // >0 en descente
    const target = 18 + down * 14;
    z.speed = U.damp(z.speed, U.clamp(target, 10, 26), 2.2, dt);
    z.s += z.dir * z.speed * dt;
    zipPoint(line, z.s, _tp);
    a.pos.set(_tp.x, _tp.y - 2.2, _tp.z);
    a.vel.set(_tg.x * z.dir * z.speed, _tg.y * z.dir * z.speed, _tg.z * z.dir * z.speed);
    a.grounded = false;
    const an = a.char.anim;
    an.mode = 'glide'; an.bank = U.damp(an.bank || 0, 0, 4, dt);
    if (a.isPlayer) {
      G.Audio.setLoop('zipline', 0.28, 0, z.speed / 26);
      if (!trolley) {
        const b = new PB();
        b.box(0.3, 0.35, 0.2, 0xe8b020, 0, 0, 0); b.cyl(0.1, 0.1, 0.06, 10, 0x333333, 0, 0.12, 0, Math.PI / 2, 0, 0); b.box(0.05, 0.4, 0.05, 0x333333, 0, -0.35, 0);
        trolley = b.build(); G.scene.add(trolley);
      }
      trolley.visible = true; trolley.position.set(_tp.x, _tp.y - 0.1, _tp.z); trolley.rotation.y = Math.atan2(_tg.x, _tg.z);
      if (Math.random() < dt * 20) G.FX.glow.spawn(_tp.x, _tp.y, _tp.z, U.rand(-1, 1), U.rand(-1, 1), U.rand(-1, 1), 1, 0.8, 0.3, 0.05, 0.25, 6, 0);
    }
    if (z.s <= 0.4 || z.s >= line.len - 0.4) X2.exitZip(a, false);
  };
  // accroche automatique en sautant sous le câble
  function autoGrab(a) {
    if (a.state !== 'ground' || a.grounded || a.downed || a.zipCd > 0) return;
    const hx = a.pos.x, hy = a.pos.y + 2.1, hz = a.pos.z;
    for (const line of X2.zips) {
      if (hx < line.minX || hx > line.maxX || hz < line.minZ || hz > line.maxZ) continue;
      const c = zipClosest(line, hx, hy, hz);
      if (c.d < 1.1) { X2.startZip(a, line, c.s); return; }
    }
  }

  // ------------------------------------------------------------
  //  4. CAMIONNETTES DE RENFORT + CARTES (mode duo)
  // ------------------------------------------------------------
  const REBOOT_TIME = 4, VAN_CD = 120, CARD_TIME = 90;
  function vanModel() {
    const b = new PB();
    const white = 0xeceef2, blue = 0x2a6ad8, dark = 0x22262c;
    b.box(4.2, 2.1, 2.2, white, -0.4, 1.55, 0);
    b.box(1.4, 1.3, 2.2, white, 2.4, 1.15, 0);
    b.box(0.06, 0.8, 1.9, 0x2a3a4a, 2.1, 1.95, 0, 0, 0, 0.45);
    b.box(0.04, 0.55, 1.9, 0x2a3a4a, 3.12, 1.35, 0);
    b.box(4.25, 0.25, 2.24, blue, -0.4, 1.3, 0); b.box(1.45, 0.25, 2.24, blue, 2.4, 1.0, 0);
    b.box(5.8, 0.2, 2.1, dark, 0.3, 0.55, 0);
    for (const [x, z] of [[-1.6, -1.05], [-1.6, 1.05], [2.2, -1.05], [2.2, 1.05]]) { b.cyl(0.45, 0.45, 0.3, 12, 0x1a1a1a, x, 0.45, z, Math.PI / 2, 0, 0); b.cyl(0.22, 0.22, 0.32, 8, 0x9a9a9a, x, 0.45, z, Math.PI / 2, 0, 0); }
    // toit : antenne parabolique et gyrophares
    b.box(1.6, 0.12, 1.2, 0x9a9ea4, -1.0, 2.66, 0);
    b.cyl(0.08, 0.08, 1.0, 6, 0x5a5e64, -1.0, 3.2, 0);
    b.cyl(0.7, 0.15, 0.3, 14, 0xdadde2, -1.0, 3.75, 0, 0.5, 0, 0);
    b.box(0.9, 0.12, 0.25, 0xff3030, 1.2, 2.66, -0.5, 0, 0, 0, true); b.box(0.9, 0.12, 0.25, 0x3080ff, 1.2, 2.66, 0.5, 0, 0, 0, true);
    b.box(0.05, 0.12, 0.3, 0xfff0b0, 3.12, 0.95, -0.8, 0, 0, 0, true); b.box(0.05, 0.12, 0.3, 0xfff0b0, 3.12, 0.95, 0.8, 0, 0, 0, true);
    // console à l'arrière
    b.box(0.3, 1.2, 1.2, 0x3a3e46, -2.65, 1.2, 0);
    const g = b.build();
    const sg = signMesh('RENFORT', '#0c2a5a', '#6ad8ff', 1.1, 0.3); sg.position.set(-2.81, 1.55, 0); sg.rotation.y = -Math.PI / 2; g.add(sg);
    // anneau au sol (change de couleur selon l'état)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x30a0ff, transparent: true, opacity: 0.55, toneMapped: false, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 40), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.set(-4.4, 0.06, 0); g.add(ring);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: 0x1a4a8a, transparent: true, opacity: 0.25, depthWrite: false })); pad.rotation.x = -Math.PI / 2; pad.position.set(-4.4, 0.05, 0); g.add(pad);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x40c0ff, toneMapped: false });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), screenMat); scr.position.set(-2.81, 1.05, 0); scr.rotation.y = -Math.PI / 2; g.add(scr);
    g.userData = { ringMat, screenMat, ring };
    return g;
  }
  function placeVans() {
    const rng = U.RNG(515);
    const ids = ['station', 'camp', 'epave', 'radio', 'moulin', 'phare', 'lac', 'parc'];
    for (const id of ids) {
      const p = G.MapData.poiById(id);
      let q = null;
      for (let k = 0; k < 3 && !q; k++) q = findSpot(p.x, p.z, p.r * 0.5 + k * 8, p.r + 25 + k * 10, 4.2, rng);
      if (!q) continue;
      const rot = Math.floor(rng() * 4), y = T.height(q[0], q[1]);
      const m = vanModel(); m.position.set(q[0], y - 0.05, q[1]); m.rotation.y = rot * Math.PI / 2;
      G.scene.add(m);
      const v = { x: q[0], y, z: q[1], yaw: rot * Math.PI / 2, rot, m, cd: 0, rebootT: 0, name: p.name };
      addCol(q[0] + Math.cos(v.yaw) * 0.3, y, q[1] - Math.sin(v.yaw) * 0.3, 6.0, 2.7, 2.3, rot);
      // console (point d'interaction) à l'arrière
      v.ix = q[0] - Math.cos(v.yaw) * 3.1; v.iz = q[1] + Math.sin(v.yaw) * 3.1;
      X2.vans.push(v);
    }
  }
  function cardModel(name) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 176;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 176); gr.addColorStop(0, '#5ad8ff'); gr.addColorStop(1, '#1a5ab8');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 176);
    x.strokeStyle = '#fff'; x.lineWidth = 6; x.strokeRect(5, 5, 118, 166);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 62, 26, 0, 7); x.fill(); x.fillRect(30, 92, 68, 34);
    x.fillStyle = '#0a2a5a'; x.font = 'bold 15px Arial'; x.textAlign = 'center'; x.fillText(name.slice(0, 12), 64, 152);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
    g.add(m);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 30, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x40c0ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 15; g.add(beam);
    g.userData.card = m;
    return g;
  }
  X2.dropCard = function (a) {
    if (!G.Duo.active || G.Duo.rumble || !G.player) return;
    if (!(a === G.player || G.Duo.isMate(a))) return;
    // seulement si un coéquipier est encore en vie
    if (!G.Duo.teamOf(a).some((m) => m !== a && !m.dead && !m.downed)) return;
    const y = Math.max(a.pos.y, T.height(a.pos.x, a.pos.z), 0) + 1.0;
    const m = cardModel(a.name); m.position.set(a.pos.x, y, a.pos.z); G.scene.add(m);
    X2.cards.push({ owner: a, x: a.pos.x, y, z: a.pos.z, t: CARD_TIME, m, carrier: null });
  };
  function removeCard(c) { G.scene.remove(c.m); c.m.traverse((o) => { if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } if (o.geometry) o.geometry.dispose(); }); const i = X2.cards.indexOf(c); if (i >= 0) X2.cards.splice(i, 1); }
  X2.pickCard = function (a, c) {
    if (c.carrier) return;
    c.carrier = a; c.m.visible = false;
    G.Audio.play('card', { pos: a.isPlayer ? null : [c.x, c.y, c.z] });
    if (a.isPlayer) G.HUD.notify('CARTE DE RENFORT DE ' + c.owner.name.toUpperCase() + ' — apportez-la à une camionnette de renfort', 4);
  };
  X2.cardOf = (a) => X2.cards.find((c) => c.carrier === a);
  X2.nearestVan = function (x, z) {
    let best = null, bd = 1e18;
    for (const v of X2.vans) { if (v.cd > 0) continue; const d = (v.x - x) * (v.x - x) + (v.z - z) * (v.z - z); if (d < bd) { bd = d; best = v; } }
    return best;
  };
  X2.reboot = function (v, c, by) {
    const a = c.owner, M = G.Match;
    removeCard(c);
    v.cd = VAN_CD; vanReset(v);
    if (!a.dead || G.Game.state === 'ended') return;
    a.dead = false; a.downed = false; a.health = 100; a.shield = 0;
    for (let i = 0; i < 5; i++) a.slots[i] = null;
    for (const t in a.ammo) a.ammo[t] = 0;
    a.mats = { wood: 100, stone: 0, metal: 0 };
    a.slots[0] = I.make('pistol', 0);
    a.ammo[I.WEAPONS.pistol.ammo] = 36;
    a.sel = -1; a.equip(0);
    a.invulnerable = false; a.inLobby = false; a.lastAttacker = null;
    a.stopEmote && a.stopEmote();
    // éjecté depuis la zone lumineuse à l'arrière de la camionnette
    const px = v.x - Math.cos(v.yaw) * 4.4, pz = v.z + Math.sin(v.yaw) * 4.4;
    a.startSkydive(px, T.height(px, pz) + 0.6, pz, 0, 0);
    a.grounded = false;
    a.vel.set(U.rand(-2, 2), 30, U.rand(-2, 2));
    a.char.root.visible = true;
    M.alive++;
    M.ranking = M.ranking.filter((r) => r.name !== a.name);
    a.stats.placement = 0;
    if (M.placement && a.isPlayer) M.placement = 0;
    // effets
    G.Audio.play('reboot', { pos: [px, v.y + 1, pz] });
    for (let i = 0; i < 80; i++) G.FX.glow.spawn(px + U.rand(-1, 1), v.y + U.rand(0, 3), pz + U.rand(-1, 1), U.rand(-2, 2), U.rand(6, 18), U.rand(-2, 2), 0.3, 0.8, 1, 0.3, 1.4, -4, 1);
    G.FX.explosion(px, v.y + 1, pz, 0.8);
    G.HUD.killFeed([null, a.name, 'a été renvoyé(e) au combat' + (by ? ' par ' + by.name : '')], by && by.isPlayer, false);
    if (a.isPlayer) {
      G.HUD.els.death.classList.add('hidden'); G.HUD.els.spect.classList.add('hidden');
      M.spectate = null;
      G.HUD.notify('VOUS ÊTES DE RETOUR ! (renvoyé(e) par ' + (by ? by.name : 'votre équipe') + ')', 3.5);
      G.player.camPitch = -0.5;
    } else {
      a.ai.target = null; a.ai.nav = null; a.ai.mode = 'loot';
      a.ai.dropTarget = [v.x + U.rand(-20, 20), v.z + U.rand(-20, 20)];
      if (by && by.isPlayer) { G.HUD.xpToast(250, 'Renfort'); if (M) M.challengeEvent('reboot'); }
    }
  };
  function vanReset(v) { v.rebootT = 0; v.lastTick = 0; }
  X2.vanReset = vanReset;
  function vanTick(v, a) {
    // appelé tant que quelqu'un maintient l'interaction (joueur : chaque image, IA : à chaque réflexion)
    const c = X2.cardOf(a);
    if (!c || v.cd > 0) { vanReset(v); return false; }
    const now = G.Game.time;
    if (!v.lastTick || now - v.lastTick > 0.6) { v.rebootT = 0; G.Audio.play('reboot_start', { pos: [v.x, v.y + 1, v.z] }); }
    else v.rebootT += Math.min(0.5, now - v.lastTick);
    v.lastTick = now;
    v.rebootBy = a;
    if (v.rebootT >= REBOOT_TIME) { X2.reboot(v, c, a); return true; }
    return false;
  }

  // IA du coéquipier : ramasse la carte du joueur et le renvoie au combat
  X2.mateThink = function (b) {
    const ai = b.ai, pl = G.player;
    if (!pl || !pl.dead || !G.Duo.active) return false;
    const fighting = ai.target && !ai.target.dead && G.Game.time - ai.lastSeenT < 2;
    if (fighting) return false;
    const mine = X2.cardOf(b);
    if (!mine) {
      const c = X2.cards.find((k) => k.owner === pl && !k.carrier);
      if (!c) return false;
      const d = Math.hypot(c.x - b.pos.x, c.z - b.pos.z);
      if (ai.mode !== 'card') G.Duo.say(b, 'Je vais chercher ta carte de renfort !');
      ai.mode = 'card'; ai.nav = [c.x, c.z]; b.control.sprint = d > 8;
      if (d < 2.2) X2.pickCard(b, c);
      return true;
    }
    const v = X2.nearestVan(b.pos.x, b.pos.z);
    if (!v) return false;
    const d = Math.hypot(v.ix - b.pos.x, v.iz - b.pos.z);
    ai.mode = 'reboot';
    if (ai.mode !== 'reboot') G.Duo.say(b, 'J\'ai ta carte ! Direction la camionnette de renfort (' + v.name + ').');
    if (d > 1.8) { ai.nav = [v.ix, v.iz]; b.control.sprint = d > 10; if (v.rebootBy === b) vanReset(v); }
    else { ai.nav = null; b.yaw = Math.atan2(-(v.x - b.pos.x), -(v.z - b.pos.z)); vanTick(v, b); }
    return true;
  };

  // ------------------------------------------------------------
  //  Interactions, carte, mise à jour
  // ------------------------------------------------------------
  X2.interactables = function (out) {
    const pl = G.player;
    if (!pl) return;
    const p = pl.pos;
    const near = (x, z, r) => Math.abs(x - p.x) < r && Math.abs(z - p.z) < r;
    for (const r of X2.rodBarrels) if (near(r.x, r.z, 3.5)) out.push({ kind: 'rods', obj: r, x: r.x, y: r.y + 1, z: r.z, name: 'Tonneau de cannes à pêche', action: 'Prendre une canne à pêche', range: 2.4 });
    for (const b of X2.benches) if (near(b.x, b.z, 4)) { const f = local(b, 0, 0.6); out.push({ kind: 'bench', obj: b, x: f[0], y: b.y + 1, z: f[1], name: 'Établi d\'amélioration', action: benchText(pl), range: 2.6 }); }
    for (const s of X2.hides) if (!s.occupant && near(s.x, s.z, 4)) out.push({ kind: 'hide', obj: s, x: s.x, y: s.y + 1, z: s.z, name: s.name, action: 'Se cacher', range: 2.4 });
    for (const line of X2.zips) for (let k = 0; k < 2; k++) { const po = line.poles[k]; if (near(po.x, po.z, 4)) out.push({ kind: 'zip', obj: line, end: k, x: po.x, y: po.y + 1, z: po.z, name: 'Tyrolienne vers ' + line.names[1 - k], action: 'S\'accrocher', range: 2.8 }); }
    if (G.Duo.active) {
      for (const c of X2.cards) if (!c.carrier && near(c.x, c.z, 4)) out.push({ kind: 'card', obj: c, x: c.x, y: c.y, z: c.z, name: 'Carte de renfort de ' + c.owner.name, action: 'Ramasser', range: 2.4 });
      const mine = X2.cardOf(pl);
      for (const v of X2.vans) if (near(v.ix, v.iz, 5)) {
        const act = v.cd > 0 ? 'Recharge… ' + Math.ceil(v.cd) + ' s' : mine ? 'Maintenir pour renvoyer ' + mine.owner.name + ' au combat' : 'Il faut une carte de renfort';
        out.push({ kind: 'reboot', obj: v, x: v.ix, y: v.y + 1, z: v.iz, name: 'Camionnette de renfort', action: act, range: 2.8, ok: !!mine && v.cd <= 0 });
      }
    }
  };
  X2.interact = function (a, t) {
    if (t.kind === 'bench') X2.upgrade(a, t.obj);
    else if (t.kind === 'hide') X2.enterHide(a, t.obj);
    else if (t.kind === 'zip') { const line = t.obj; a.pos.set(line.poles[t.end].x, a.pos.y, line.poles[t.end].z); X2.startZip(a, line, t.end === 0 ? 0.8 : line.len - 0.8); }
    else if (t.kind === 'card') X2.pickCard(a, t.obj);
    else if (t.kind === 'rods') {
      if (a.slots.some((s) => s && s.id === 'fishingrod')) { if (a.isPlayer) G.HUD.notify('Vous avez déjà une canne à pêche', 1.5); return true; }
      G.Loot.spill([{ kind: 'item', item: I.make('fishingrod') }], t.obj.x, t.obj.y + 1.2, t.obj.z, 0.6);
      G.Audio.play('pickup');
    }
    else return false;
    return true;
  };
  // interaction maintenue (camionnette) pour le joueur
  X2.holdReboot = function (a, v) { return vanTick(v, a); };

  const s2 = (big) => (big ? 1.4 : 1);
  X2.mapIcons = function (ctx, toMap, big) {
    const s = big ? 1.4 : 1;
    ctx.lineWidth = 1.5 * s;
    for (const line of X2.zips) {
      const a = toMap(line.ends[0][0], line.ends[0][1]), b = toMap(line.ends[1][0], line.ends[1][1]);
      ctx.strokeStyle = 'rgba(30,30,30,0.8)'; ctx.setLineDash([3 * s, 3 * s]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const s of X2.spots) if (s.left > 0) {
      const m = toMap(s.x, s.z);
      ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(m[0], m[1], 3.5 * s2(big), 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(m[0], m[1], 6 * s2(big), 0, 7); ctx.stroke();
    }
    for (const b of X2.benches) {
      const m = toMap(b.x, b.z);
      ctx.fillStyle = '#ffc830'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (let k = 0; k < 16; k++) { const r = (k % 2 ? 4 : 6) * s, an = k * Math.PI / 8; ctx.lineTo(m[0] + Math.cos(an) * r, m[1] + Math.sin(an) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a3a10'; ctx.beginPath(); ctx.arc(m[0], m[1], 1.8 * s, 0, 7); ctx.fill();
    }
    if (G.Duo.active) {
      for (const v of X2.vans) {
        const m = toMap(v.x, v.z);
        ctx.fillStyle = v.cd > 0 ? '#c04040' : '#30a0ff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.fillRect(m[0] - 6 * s, m[1] - 3.5 * s, 12 * s, 7 * s); ctx.strokeRect(m[0] - 6 * s, m[1] - 3.5 * s, 12 * s, 7 * s);
        ctx.fillStyle = '#fff'; ctx.fillRect(m[0] + 2 * s, m[1] - 2 * s, 3 * s, 2.5 * s);
      }
      for (const c of X2.cards) if (!c.carrier) {
        const m = toMap(c.x, c.z);
        ctx.fillStyle = '#5ad8ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
        ctx.fillRect(m[0] - 3.5 * s, m[1] - 5 * s, 7 * s, 10 * s); ctx.strokeRect(m[0] - 3.5 * s, m[1] - 5 * s, 7 * s, 10 * s);
      }
    }
  };


  // ------------------------------------------------------------
  //  5. PÊCHE : bancs de poissons, tonneaux de cannes à pêche
  // ------------------------------------------------------------
  X2.spots = []; X2.rodBarrels = [];
  let ringGeo, ringMat, bobber, fishLine;
  function spotRing() {
    if (!ringGeo) { ringGeo = new THREE.RingGeometry(0.8, 1.0, 28); ringGeo.rotateX(-Math.PI / 2); ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }); }
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(ringGeo, ringMat.clone()); r.position.y = 0.05; g.add(r); }
    return g;
  }
  function barrelModel() {
    const b = new PB();
    b.cyl(0.42, 0.38, 1.0, 12, 0x7a5a3a, 0, 0.5, 0);
    b.cyl(0.44, 0.44, 0.07, 12, 0x3a3a3a, 0, 0.2, 0); b.cyl(0.44, 0.44, 0.07, 12, 0x3a3a3a, 0, 0.8, 0);
    for (let i = 0; i < 4; i++) { const a = i * 1.6; b.cyl(0.02, 0.025, 2.0, 5, 0x5a3a20, Math.cos(a) * 0.18, 1.5, Math.sin(a) * 0.18, Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15); b.cyl(0.05, 0.05, 0.06, 8, 0xd8d8d8, Math.cos(a) * 0.2, 1.0, Math.sin(a) * 0.2, 0, 0, Math.PI / 2); }
    b.box(0.5, 0.35, 0.03, 0x2a6ad8, 0, 0.55, 0.42);
    b.box(0.3, 0.12, 0.02, 0xf0c030, 0, 0.55, 0.44, 0, 0, 0, true);
    return b.build();
  }
  function placeSpots() {
    const rng = U.RNG(3131);
    const md = G.MapData;
    const cands = [];
    for (let i = 0; i < 40; i++) { const a = rng() * Math.PI * 2, r = md.lake.r * (0.35 + rng() * 0.5); cands.push([md.lake.x + Math.cos(a) * r, md.lake.z + Math.sin(a) * r]); }
    for (const p of md.river.concat(md.riverOut)) cands.push([p[0] + (rng() - 0.5) * 4, p[1] + (rng() - 0.5) * 4]);
    const plage = md.poiById('plage');
    for (let i = 0; i < 20; i++) cands.push([plage.x - 30 - rng() * 30, plage.z + (rng() - 0.5) * 120]);
    for (const c of cands) {
      if (X2.spots.length >= 12) break;
      if (T.height(c[0], c[1]) > -1.2) continue;
      if (X2.spots.some((s) => Math.hypot(s.x - c[0], s.z - c[1]) < 40)) continue;
      // un point de rive à portée de lancer
      let shore = null;
      for (let k = 0; k < 24 && !shore; k++) { const a = k / 24 * Math.PI * 2; for (let r = 6; r < 24; r += 2) { const x = c[0] + Math.cos(a) * r, z = c[1] + Math.sin(a) * r; if (T.height(x, z) > 0.6 && T.slope(x, z) < 0.4 && clearAt(x, z, 1, 0.6)) { shore = [x, z]; break; } } }
      if (!shore) continue;
      const m = spotRing(); m.position.set(c[0], 0, c[1]); G.scene.add(m);
      X2.spots.push({ x: c[0], z: c[1], m, left: 3, t: rng() * 3, jumpT: 2 + rng() * 4 });
      const bm = barrelModel(); const y = T.height(shore[0], shore[1]);
      bm.position.set(shore[0], y - 0.05, shore[1]); bm.rotation.y = Math.atan2(c[0] - shore[0], c[1] - shore[1]); G.scene.add(bm);
      addCol(shore[0], y, shore[1], 0.85, 1.0, 0.85, 0);
      X2.rodBarrels.push({ x: shore[0], y, z: shore[1], m: bm });
    }
  }
  function nearSpot(x, z, r) { for (const s of X2.spots) if (s.left > 0 && Math.hypot(s.x - x, s.z - z) < r) return s; return null; }
  function stopFishing(a) {
    a.fishing = null;
    if (a.isPlayer) { if (bobber) bobber.visible = false; if (fishLine) fishLine.visible = false; }
  }
  X2.stopFishing = stopFishing;
  X2.useRod = function (a, it, o, d) {
    if (a.fireCd > 0) return false;
    a.fireCd = 0.4;
    const f = a.fishing;
    if (f) {
      if (f.bite) { reel(a, it, f); } else { stopFishing(a); G.Audio.play('throw', { pos: a.isPlayer ? null : [a.pos.x, a.pos.y, a.pos.z] }); }
      return true;
    }
    const h = P.raycast(o.x, o.y, o.z, d.x, d.y, d.z, 80, { mask: 3, water: true });
    if (!h || !h.water || T.height(h.x, h.z) > -0.5 || Math.hypot(h.x - a.pos.x, h.z - a.pos.z) > 32) { if (a.isPlayer) { G.HUD.notify('Visez l\'eau pour lancer la ligne', 1.5); G.Audio.play('build_fail'); } return false; }
    const spot = nearSpot(h.x, h.z, 4.5);
    a.fishing = { x: h.x, z: h.z, t: 0, biteAt: spot ? U.rand(1.6, 3.5) : U.rand(7, 13), spot, bite: false, biteT: 0, px: a.pos.x, pz: a.pos.z, slot: a.sel };
    G.Audio.play('throw', { pos: a.isPlayer ? null : [a.pos.x, a.pos.y, a.pos.z] });
    G.FX.waterSplash(h.x, h.z, false);
    if (a.isPlayer) G.HUD.notify(spot ? 'Attendez que ça morde…' : 'Pas de banc de poissons ici… (cherchez les remous)', 2);
    return true;
  };
  function reel(a, it, f) {
    const spot = f.spot;
    let drop;
    if (spot) {
      spot.left--;
      drop = U.weighted([['flopper', 42], ['slurpfish', 22], ['weapon', 16], ['ammo', 10], ['shieldpot', 10]]);
    } else drop = U.weighted([['flopper', 30], ['ammo', 35], ['mats', 35]]);
    const list = [];
    if (drop === 'flopper' || drop === 'slurpfish' || drop === 'shieldpot') list.push({ kind: 'item', item: I.make(drop) });
    else if (drop === 'weapon') list.push({ kind: 'item', item: I.randomWeapon(1) });
    else if (drop === 'ammo') list.push({ kind: 'ammo', type: U.pick(['light', 'medium', 'shells', 'heavy']), amount: 20 });
    else list.push({ kind: 'mat', type: 'wood', amount: 30 });
    G.Loot.spill(list, a.pos.x, a.pos.y + 0.5, a.pos.z, 0.8);
    G.Audio.play('splash', { pos: [f.x, 0, f.z] }); G.Audio.play('pickup');
    G.FX.waterSplash(f.x, f.z, true);
    if (a.isPlayer) { G.HUD.notify(drop === 'flopper' ? 'UN FLOPPER !' : drop === 'slurpfish' ? 'UN POISSON SLURP !' : drop === 'weapon' ? 'UNE ARME REPÊCHÉE !' : 'Prise !', 1.8); if (G.Match) G.Match.challengeEvent('fish'); }
    it.ammo = (it.ammo || 12) - 1;
    stopFishing(a);
    if (it.ammo <= 0) { const i = a.slots.indexOf(it); if (i >= 0) a.slots[i] = null; a.sel = a.firstWeaponSlot(); a.refreshHeld(); if (a.isPlayer) G.HUD.notify('La canne à pêche est cassée !', 1.5); }
    if (spot && spot.left <= 0) { spot.m.visible = false; }
  }
  function updateFishing(a, dt) {
    const f = a.fishing;
    if (!f) return;
    if (a.dead || a.state !== 'ground' || a.sel !== f.slot || Math.hypot(a.pos.x - f.px, a.pos.z - f.pz) > 4) { stopFishing(a); return; }
    f.t += dt;
    if (!f.bite && f.t >= f.biteAt) {
      f.bite = true; f.biteT = 1.5;
      G.Audio.play('splash', { pos: [f.x, 0, f.z] }); G.Audio.play('ping');
      if (a.isPlayer) G.HUD.notify('ÇA MORD ! CLIQUEZ !', 1.2);
    }
    if (f.bite) { f.biteT -= dt; if (f.biteT <= 0) { f.bite = false; f.biteAt = f.t + U.rand(2.5, 5); if (a.isPlayer) G.HUD.notify('Le poisson s\'est échappé…', 1.2); } }
    if (!a.isPlayer) return;
    if (!bobber) {
      bobber = new THREE.Group();
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe02020 })); bobber.add(s1);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.071, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff })); bobber.add(s2);
      G.scene.add(bobber);
      fishLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xf0f0f0 }));
      fishLine.frustumCulled = false; G.scene.add(fishLine);
    }
    const by = f.bite ? -0.12 + Math.sin(f.t * 30) * 0.05 : Math.sin(f.t * 3) * 0.03;
    bobber.visible = true; bobber.position.set(f.x, by + 0.02, f.z);
    const hp = a.char.J.handR.getWorldPosition(U.v1);
    const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
    const pa = fishLine.geometry.attributes.position;
    pa.setXYZ(0, hp.x + fx * 1.3, hp.y + 1.0, hp.z + fz * 1.3); pa.setXYZ(1, f.x, by + 0.05, f.z); pa.needsUpdate = true;
    fishLine.visible = true;
    if (f.bite && Math.random() < dt * 20) G.FX.waterSplash(f.x + U.rand(-0.2, 0.2), f.z + U.rand(-0.2, 0.2), false);
  }
  function updateSpots(dt) {
    const cam = G.camera.position;
    for (const s of X2.spots) {
      if (s.left <= 0) continue;
      const near = Math.hypot(s.x - cam.x, s.z - cam.z) < 120;
      s.m.visible = near;
      if (!near) continue;
      s.t += dt;
      s.m.children.forEach((r, i) => { const k = ((s.t * 0.5 + i / 3) % 1); r.scale.setScalar(0.6 + k * 2.2); r.material.opacity = 0.55 * (1 - k); });
      s.jumpT -= dt;
      if (s.jumpT <= 0) { s.jumpT = U.rand(2, 6); G.FX.waterSplash(s.x + U.rand(-1, 1), s.z + U.rand(-1, 1), false); for (let i = 0; i < 6; i++) G.FX.glow.spawn(s.x, 0.2, s.z, U.rand(-1, 1), U.rand(2, 4), U.rand(-1, 1), 0.3, 0.6, 1, 0.12, 0.6, 9, 0); }
    }
  }


  // ------------------------------------------------------------
  //  6. BATEAUX À MOTEUR (lac, rivière, mer) — roulent lentement sur terre
  // ------------------------------------------------------------
  function boatModel(color) {
    const b = new PB();
    const white = 0xf0f0f0, dark = 0x2a2a30;
    b.box(2.0, 0.7, 4.2, white, 0, 0.35, -0.2);
    b.add(new THREE.CylinderGeometry(0.01, 1.0, 1.6, 4, 1), white, 0, 0.35, 2.55, Math.PI / 2, Math.PI / 4, 0);
    b.box(2.04, 0.22, 4.25, color, 0, 0.55, -0.2);
    b.box(1.8, 0.1, 3.8, 0xc8a878, 0, 0.72, -0.3);
    b.box(1.6, 0.5, 0.1, 0x9ad8ff, 0, 1.0, 0.9, -0.5, 0, 0);
    b.box(0.6, 0.45, 0.6, dark, -0.4, 0.95, 0.2); b.box(0.6, 0.45, 0.6, dark, 0.4, 0.95, 0.2);
    b.box(1.6, 0.45, 0.6, dark, 0, 0.95, -1.4);
    b.box(0.5, 0.9, 0.5, 0x3a3a40, 0, 0.8, -2.45); b.box(0.35, 0.35, 0.6, color, 0, 1.25, -2.5);
    b.cyl(0.14, 0.14, 0.05, 8, 0x1a1a1a, -0.4, 1.25, 0.55, -0.9, 0, 0);
    b.box(0.15, 0.06, 0.3, 0xffffd0, -0.7, 0.6, 2.0, 0, 0, 0, true); b.box(0.15, 0.06, 0.3, 0xffffd0, 0.7, 0.6, 2.0, 0, 0, 0, true);
    return b.build();
  }
  class Boat {
    constructor(x, z, yaw, color) {
      this.home = [x, z, yaw];
      this.label = 'Bateau à moteur'; this.isBoat = true;
      this.seat = [0.4, 0.2, 0.2];
      this.m = boatModel(color || U.pick([0xd83a3a, 0x2a6ad8, 0xe0a020, 0x2ab070]));
      G.scene.add(this.m);
      this.reset();
    }
    reset() {
      this.pos = new THREE.Vector3(this.home[0], 0, this.home[1]);
      this.yaw = this.home[2]; this.speed = 0; this.vy = 0; this.hp = 500; this.dead = false; this.driver = null; this.pitch = 0; this.roll = 0;
      this.groundY = 0; this.bob = Math.random() * 6;
      this.m.visible = true; this.sync();
    }
    sync() { this.m.position.copy(this.pos); this.m.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ'); }
    update(dt) {
      if (this.dead) return;
      const d = this.driver;
      let thr = 0, steer = 0, boost = false, hop = false;
      if (d) { thr = d.control.mz; steer = -d.control.mx; boost = d.control.sprint; hop = d.control.jump; d.control.jump = false; }
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const T = G.Terrain;
      const th = T.height(this.pos.x, this.pos.z), thFront = T.height(this.pos.x + fx * 2.2, this.pos.z + fz * 2.2);
      const onWater = th < -0.5;
      const maxS = onWater ? (boost ? 30 : 22) : 5;
      if (thr > 0) this.speed = Math.min(maxS, this.speed + (boost ? 14 : 9) * dt);
      else if (thr < 0) this.speed = Math.max(onWater ? -7 : -3, this.speed - 12 * dt);
      else this.speed *= Math.pow(onWater ? 0.45 : 0.05, dt);
      if (!onWater && Math.abs(this.speed) > maxS) this.speed *= Math.pow(0.02, dt);
      const turn = steer * U.clamp(Math.abs(this.speed) / 5, 0.25, 1) * 1.5 * Math.sign(this.speed || 1);
      this.yaw += turn * dt;
      // obstacles
      const sp = this.speed;
      if (Math.abs(sp) > 0.5) {
        const dir = Math.sign(sp);
        const h = P.raycast(this.pos.x, this.pos.y + 0.7, this.pos.z, fx * dir, 0, fz * dir, 2.6 + Math.abs(sp) * dt, { mask: 1 });
        if (h && !h.terrain) {
          if (h.ent && !h.ent.dead && (h.ent.type === 'build' || h.ent.type === 'furniture') && Math.abs(sp) > 8) { G.World.damage(h.ent, 200, { by: d }); this.speed *= 0.6; }
          else { if (Math.abs(sp) > 12) { this.hurt(Math.abs(sp) * 2); G.Audio.play('hit_metal', { pos: [this.pos.x, this.pos.y, this.pos.z] }); } this.speed = -sp * 0.25; }
        }
      }
      this.pos.x += fx * this.speed * dt; this.pos.z += fz * this.speed * dt;
      // flottaison / sol
      this.bob += dt;
      const water = 0.05 + Math.sin(this.bob * 1.7) * 0.06;
      const gy = onWater ? water : Math.max(th, P.supportAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 1.0, 0.8));
      this.groundY = gy;
      if (hop && this.pos.y <= gy + 0.05) this.vy = onWater ? 6 : 3;
      this.vy -= 22 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= gy) { this.pos.y = gy; this.vy = Math.max(0, this.vy); }
      const tilt = onWater ? -U.clamp(this.speed / 30, -0.2, 0.2) * 0.6 : -Math.atan2(thFront - th, 2.2);
      this.pitch = U.damp(this.pitch, tilt + Math.sin(this.bob * 2.3) * 0.02, 5, dt);
      this.roll = U.damp(this.roll, -steer * U.clamp(this.speed / 25, 0, 1) * 0.25 + Math.sin(this.bob * 1.9) * 0.03, 4, dt);
      this.sync();
      // sillage et éclaboussures
      const near = Math.hypot(this.pos.x - G.camera.position.x, this.pos.z - G.camera.position.z) < 90;
      if (onWater && near && Math.abs(this.speed) > 3) {
        for (let i = 0; i < 2; i++) G.FX.glow.spawn(this.pos.x - fx * 2.8 + U.rand(-0.6, 0.6), 0.15, this.pos.z - fz * 2.8 + U.rand(-0.6, 0.6), -fx * 2 + U.rand(-1, 1), U.rand(0.5, 2.5), -fz * 2 + U.rand(-1, 1), 0.9, 0.95, 1, 0.22, 0.7, 6, 0.8);
        if (Math.random() < 0.3) G.FX.waterSplash(this.pos.x + fx * 2 + U.rand(-1, 1), this.pos.z + fz * 2 + U.rand(-1, 1), false);
      } else if (!onWater && near && Math.abs(this.speed) > 2 && Math.random() < 0.3) G.FX.dust(this.pos.x - fx * 2, this.pos.y, this.pos.z - fz * 2, 2, 0.8);
      // écrase les nageurs / piétons
      if (Math.abs(this.speed) > 7) for (const a of G.Combat.actors) {
        if (a === d || a.dead || !a.hittable() || a.vehicle) continue;
        if (Math.hypot(a.pos.x - this.pos.x, a.pos.z - this.pos.z) < 2.2 && Math.abs(a.pos.y - this.pos.y) < 2 && !a._runT) {
          G.Combat.damageActor(a, Math.abs(this.speed) * 2.5, { by: d, weapon: 'kart', point: [a.pos.x, a.pos.y + 1, a.pos.z] });
          a.vel.x += fx * this.speed * 0.6; a.vel.y += 6; a.vel.z += fz * this.speed * 0.6; a._runT = 0.6;
        }
      }
      if (d && d.isPlayer) G.Audio.setLoop('engine', 0.4, 0, Math.abs(this.speed) / 30);
    }
    hurt(n) {
      this.hp -= n;
      if (this.hp <= 0 && !this.dead) {
        this.dead = true; this.m.visible = false;
        G.Combat.explode(this.pos.x, this.pos.y + 0.8, this.pos.z, 5, 60, 200, this.driver);
        if (this.driver) G.Extras.exitKart(this.driver);
      }
    }
  }
  X2.boats = [];
  function placeBoats() {
    const rng = U.RNG(2468);
    const md = G.MapData;
    const cands = [];
    const dk = md.poiById('docks'); cands.push([dk.x - 12, dk.z - 76, Math.PI], [dk.x + 34, dk.z - 72, Math.PI]);
    for (let i = 0; i < 30; i++) { const a = rng() * Math.PI * 2, r = md.lake.r * (0.45 + rng() * 0.35); cands.push([md.lake.x + Math.cos(a) * r, md.lake.z + Math.sin(a) * r, a + Math.PI / 2]); }
    for (let i = 1; i < md.river.length; i += 3) { const p = md.river[i], q = md.river[i - 1]; cands.push([p[0], p[1], Math.atan2(p[0] - q[0], p[1] - q[1])]); }
    for (let i = 1; i < md.riverOut.length; i += 2) { const p = md.riverOut[i], q = md.riverOut[i - 1]; cands.push([p[0], p[1], Math.atan2(p[0] - q[0], p[1] - q[1])]); }
    const pl = md.poiById('plage'); for (let i = 0; i < 10; i++) cands.push([pl.x - 45 - rng() * 20, pl.z + (rng() - 0.5) * 100, rng() * 6.28]);
    for (const c of cands) {
      if (X2.boats.length >= 8) break;
      if (T.height(c[0], c[1]) > -1.3) continue;
      if (X2.boats.some((b) => Math.hypot(b.home[0] - c[0], b.home[1] - c[1]) < 60)) continue;
      const b = new Boat(c[0], c[1], c[2]);
      X2.boats.push(b);
      G.Extras.karts.push(b);
    }
  }

  X2.init = function () {
    placeBenches();
    placeHides();
    placeZips();
    placeVans();
    placeSpots();
    placeBoats();
  };
  X2.reset = function () {
    for (const s of X2.hides) { if (s.occupant) X2.exitHide(s.occupant); s.occupant = null; }
    for (const v of X2.vans) { v.cd = 0; vanReset(v); }
    while (X2.cards.length) removeCard(X2.cards[0]);
    if (trolley) trolley.visible = false;
    G.Audio.setLoop('zipline', 0);
    for (const s of X2.spots) { s.left = 3; s.m.visible = true; }
    if (G.player) stopFishing(G.player);
  };
  X2.update = function (dt) {
    const cam = G.camera.position;
    for (const s of X2.hides) {
      if (s.wob > 0) {
        s.wob = Math.max(0, s.wob - dt);
        const k = s.wob * 0.12;
        s.m.rotation.z = Math.sin(G.Game.time * 40) * k; s.m.rotation.x = Math.cos(G.Game.time * 33) * k * 0.6;
        s.m.scale.y = 1 + Math.sin(G.Game.time * 30) * k * 0.3;
      } else if (s.m.rotation.z) { s.m.rotation.z = 0; s.m.rotation.x = 0; s.m.scale.y = 1; }
    }
    // camionnettes
    for (const v of X2.vans) {
      if (v.cd > 0) v.cd = Math.max(0, v.cd - dt);
      const ud = v.m.userData;
      const busy = v.rebootT > 0 && G.Game.time - (v.lastTick || 0) < 0.3;
      const col = v.cd > 0 ? 0xff4040 : busy ? 0xffffff : 0x30a0ff;
      ud.ringMat.color.setHex(col); ud.screenMat.color.setHex(v.cd > 0 ? 0xc03030 : 0x40c0ff);
      ud.ringMat.opacity = 0.4 + Math.sin(G.Game.time * 3) * 0.15;
      if (v.rebootT > 0) {
        if (Math.hypot(v.x - cam.x, v.z - cam.z) < 80 && Math.random() < 0.6) G.FX.glow.spawn(v.x + U.rand(-2.5, 2.5), v.y + 0.2, v.z + U.rand(-2.5, 2.5), 0, U.rand(2, 5), 0, 0.3, 0.8, 1, 0.12, 0.8, 0, 0.5);
      }
      // réinitialise si personne ne maintient l'interaction
      if (v.lastTick && v.rebootBy && (v.rebootBy.dead || Math.hypot(v.rebootBy.pos.x - v.ix, v.rebootBy.pos.z - v.iz) > 3 || G.Game.time - v.lastTick > 0.8)) vanReset(v);
    }
    // cartes : rotation, expiration
    for (let i = X2.cards.length - 1; i >= 0; i--) {
      const c = X2.cards[i];
      if (!c.owner.dead || (c.carrier && c.carrier.dead)) { removeCard(c); continue; }
      if (!c.carrier) {
        c.t -= dt;
        if (c.t <= 0) { removeCard(c); if (c.owner.isPlayer || G.Duo.isMate(c.owner)) G.HUD.notify('La carte de renfort de ' + c.owner.name + ' a expiré', 2.5); continue; }
        c.m.userData.card.rotation.y += dt * 2;
        c.m.position.y = c.y + Math.sin(G.Game.time * 2.5) * 0.12;
      }
    }
    updateSpots(dt);
    // bateaux à l'arrêt : ils flottent
    for (const b of X2.boats) if (!b.driver && !b.dead && Math.hypot(b.pos.x - G.camera.position.x, b.pos.z - G.camera.position.z) < 150) b.update(dt);
    // joueur : accroche en l'air aux tyroliennes, pêche
    const pl = G.player;
    if (pl) updateFishing(pl, dt);
    if (pl && !pl.dead) {
      pl.zipCd = Math.max(0, (pl.zipCd || 0) - dt);
      if (pl.state === 'ground') autoGrab(pl);
    }
  };
  X2.REBOOT_TIME = REBOOT_TIME;
})();
