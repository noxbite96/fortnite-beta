// ============================================================
//  Construction : murs, sols, rampes, toits + mode édition
// ============================================================
(function () {
  const U = G.U, W = G.World, P = G.Phys, I = G.Items;
  const B = { T: 4, H: 3.6, map: new Map(), pieces: [], COST: 10 };
  G.Build = B;
  const T = B.T, H = B.H, TH = 0.22;
  B.TYPES = ['wall', 'floor', 'ramp', 'roof'];
  B.NAMES = { wall: 'Mur', floor: 'Sol', ramp: 'Rampe', roof: 'Toit' };
  B.MATS = ['wood', 'stone', 'metal'];
  B.BUILD_TIME = { wood: 2.2, stone: 5.5, metal: 9 };

  // ---------- matériaux ----------
  let mats = null, ghostMat = null, ghostBad = null, editMat = null, editSel = null;
  function initMats() {
    if (mats) return;
    const mk = (tex) => new THREE.MeshLambertMaterial({ map: G.Tex.get(tex), side: THREE.DoubleSide });
    mats = { wood: mk('buildWood'), stone: mk('buildStone'), metal: mk('buildMetal') };
    ghostMat = new THREE.MeshBasicMaterial({ color: 0x5ab4ff, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
    ghostBad = new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    editMat = new THREE.MeshBasicMaterial({ color: 0x9ad4ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    editSel = new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  }
  B.initMats = initMats;

  // ------------------------------------------------------------
  //  Géométries (mur 3x3, sol 2x2, rampe, toit) avec UV découpées
  // ------------------------------------------------------------
  const geoCache = {};
  function tileBox(x0, x1, y0, y1, z0, z1, u0, u1, v0, v1) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    // remap UV des faces avant/arrière (+z/-z) et haut/bas (+y/-y)
    const uv = g.attributes.uv;
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    }
    return g;
  }
  function mergeGeos(list) {
    let n = 0, ni = 0;
    for (const g of list) { n += g.attributes.position.count; ni += g.index.count; }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = new Uint32Array(ni);
    let o = 0, oi = 0;
    for (const g of list) {
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2);
      const gi = g.index.array;
      for (let k = 0; k < gi.length; k++) idx[oi + k] = gi[k] + o;
      o += g.attributes.position.count; oi += gi.length;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  // mur local : largeur X [-T/2,T/2], hauteur Y [0,H], épaisseur Z
  B.wallGeo = function (mask) {
    const key = 'w' + mask;
    if (geoCache[key]) return geoCache[key];
    const parts = [];
    const tw = T / 3, th = H / 3;
    for (let r = 0; r < 3; r++) {
      // fusion des tuiles consécutives de la rangée
      let c = 0;
      while (c < 3) {
        if (mask & (1 << (r * 3 + c))) { c++; continue; }
        let c2 = c;
        while (c2 + 1 < 3 && !(mask & (1 << (r * 3 + c2 + 1)))) c2++;
        parts.push(tileBox(-T / 2 + c * tw, -T / 2 + (c2 + 1) * tw, r * th, (r + 1) * th, -TH / 2, TH / 2, c / 3, (c2 + 1) / 3, r / 3, (r + 1) / 3));
        c = c2 + 1;
      }
    }
    return (geoCache[key] = parts.length ? mergeGeos(parts) : new THREE.BufferGeometry());
  };
  B.floorGeo = function (mask) {
    const key = 'f' + mask;
    if (geoCache[key]) return geoCache[key];
    const parts = [];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      if (mask & (1 << (i * 2 + j))) continue;
      const g = tileBox(-T / 2 + i * T / 2, -T / 2 + (i + 1) * T / 2, -TH, 0, -T / 2 + j * T / 2, -T / 2 + (j + 1) * T / 2, i / 2, (i + 1) / 2, j / 2, (j + 1) / 2);
      parts.push(g);
    }
    return (geoCache[key] = parts.length ? mergeGeos(parts) : new THREE.BufferGeometry());
  };
  B.rampGeo = function () {
    if (geoCache.r) return geoCache.r;
    const len = Math.sqrt(T * T + H * H);
    const g = tileBox(-T / 2, T / 2, -TH, 0, -len / 2, len / 2, 0, 1, 0, 1);
    g.rotateX(Math.atan2(H, T)); // monte vers -Z local
    g.translate(0, H / 2, 0);
    // marches visuelles
    return (geoCache.r = g);
  };
  B.roofGeo = function () {
    if (geoCache.c) return geoCache.c;
    const g = new THREE.ConeGeometry(T * 0.7071, 1.4, 4, 1, false);
    g.rotateY(Math.PI / 4);
    g.translate(0, 0.7, 0);
    return (geoCache.c = g);
  };

  // ------------------------------------------------------------
  //  Calcul de la cible de construction
  // ------------------------------------------------------------
  // renvoie {type, i, j, k, dir, key, x, y, z, rotY}
  // Décalage vertical de la grille : hérité des constructions voisines,
  // sinon aligné sur les pieds du joueur (les premières pièces touchent le sol)
  B.yOffFor = function (x, y, z) {
    let best = null, bd = 12 * 12;
    for (const e of B.pieces) {
      if (e.dead) continue;
      const dx = e.t.x - x, dz = e.t.z - z, dy = e.t.y - y;
      const d = dx * dx + dz * dz;
      if (d < bd && Math.abs(dy) < 14) { bd = d; best = e; }
    }
    if (best) return best.t.yOff;
    const g = Math.min(y, G.Terrain.height(x, z) + 0.02);
    return Math.round((((g - 0.05) % H) + H) % H * 10) / 10;
  };
  function keyOf(prefix, i, j, k, yOff) { return prefix + i + ',' + j + ',' + k + '@' + yOff.toFixed(1); }
  B.target = function (actor, type, yaw, pitch) {
    const p = actor.pos;
    const yOff = B.yOffFor(p.x, p.y, p.z);
    const py = p.y - yOff;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const ci = Math.floor(p.x / T), cj = Math.floor(p.z / T);
    const onRamp = actor.groundCol && actor.groundCol.kind === 1;
    const lvl = (off) => Math.floor((py + off) / H);
    const tgt = { type, dir: 0, yOff };
    const dom = Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 0 : 2) : (fz > 0 ? 1 : 3); // 0:+x 1:+z 2:-x 3:-z
    if (type === 'wall') {
      let k = lvl(0.6) + (pitch > 0.55 ? 1 : 0);
      tgt.k = k;
      // arête de la case courante dans la direction du regard
      if (dom === 0) { tgt.i = ci + 1; tgt.j = cj; tgt.dir = 0; }
      else if (dom === 2) { tgt.i = ci; tgt.j = cj; tgt.dir = 0; }
      else if (dom === 1) { tgt.i = ci; tgt.j = cj + 1; tgt.dir = 1; }
      else { tgt.i = ci; tgt.j = cj; tgt.dir = 1; }
      tgt.key = keyOf(tgt.dir === 0 ? 'wx:' : 'wz:', tgt.i, tgt.j, k, yOff);
      if (tgt.dir === 0) { tgt.x = tgt.i * T; tgt.z = (tgt.j + 0.5) * T; tgt.rotY = Math.PI / 2; }
      else { tgt.x = (tgt.i + 0.5) * T; tgt.z = tgt.j * T; tgt.rotY = 0; }
      tgt.y = k * H + yOff;
    } else {
      const reach = type === 'roof' ? 0 : (pitch < -0.85 ? 0.2 : 2.3);
      const px = p.x + fx * reach, pz = p.z + fz * reach;
      tgt.i = Math.floor(px / T); tgt.j = Math.floor(pz / T);
      let k;
      if (type === 'floor') k = Math.round((py - 0.3) / H) + (pitch > 0.5 ? 1 : 0);
      else if (type === 'ramp') k = onRamp ? Math.round((py - 0.2) / H) : Math.floor((py + 0.4) / H);
      else k = lvl(0.6) + 1;
      // enchaînement de rampes : la suivante part du sommet de celle où l'on se trouve
      const gc = actor.groundCol;
      const cur = gc && gc.ent && gc.ent.type === 'build' && gc.ent.bType === 'ramp' && !gc.ent.dead ? gc.ent : null;
      if (type === 'ramp' && cur && (cur.t.i !== tgt.i || cur.t.j !== tgt.j)) { k = cur.t.k + 1; }
      else if (type === 'ramp' && cur && cur.t.i === tgt.i && cur.t.j === tgt.j) { k = cur.t.k; }
      tgt.k = k;
      tgt.x = (tgt.i + 0.5) * T; tgt.z = (tgt.j + 0.5) * T; tgt.y = k * H + yOff;
      if (type === 'ramp') { tgt.dir = dom; tgt.rotY = [-Math.PI / 2, Math.PI, Math.PI / 2, 0][dom]; }
      else tgt.rotY = 0;
      tgt.key = keyOf(type === 'floor' ? 'f:' : type === 'ramp' ? 'r:' : 'c:', tgt.i, tgt.j, k, yOff);
    }
    return tgt;
  };

  // Boîte englobante d'une cible
  function bounds(t) {
    if (t.type === 'wall') {
      if (t.dir === 0) return [t.x - TH / 2, t.y, t.z - T / 2, t.x + TH / 2, t.y + H, t.z + T / 2];
      return [t.x - T / 2, t.y, t.z - TH / 2, t.x + T / 2, t.y + H, t.z + TH / 2];
    }
    if (t.type === 'floor') return [t.x - T / 2, t.y - TH, t.z - T / 2, t.x + T / 2, t.y, t.z + T / 2];
    if (t.type === 'ramp') return [t.x - T / 2, t.y, t.z - T / 2, t.x + T / 2, t.y + H, t.z + T / 2];
    return [t.x - T / 2, t.y + H - 0.05, t.z - T / 2, t.x + T / 2, t.y + H + 1.4, t.z + T / 2];
  }
  B.bounds = bounds;

  function isGrounded(b) {
    // touche le terrain ?
    const pts = [[b[0] + 0.2, b[2] + 0.2], [b[3] - 0.2, b[2] + 0.2], [b[0] + 0.2, b[5] - 0.2], [b[3] - 0.2, b[5] - 0.2], [(b[0] + b[3]) / 2, (b[2] + b[5]) / 2]];
    for (const q of pts) if (G.Terrain.height(q[0], q[1]) >= b[1] - 0.25) return true;
    return false;
  }
  const qTmp = [];
  function hasSupport(b) {
    const m = 0.15;
    const list = P.query(b[0] - m, b[1] - m, b[2] - m, b[3] + m, b[4] + m, b[5] + m, 3, qTmp);
    for (const c of list) if (c.ent && !c.ent.dead && c.ent.structural) return true;
    return false;
  }

  B.canPlace = function (t) {
    const ex = B.map.get(t.key);
    if (ex && !ex.dead) return false;
    const b = bounds(t);
    if (b[4] < G.Terrain.height(t.x, t.z) - 0.5 && t.type !== 'wall') return false; // entièrement sous terre
    return isGrounded(b) || hasSupport(b);
  };

  // ------------------------------------------------------------
  //  Placement
  // ------------------------------------------------------------
  B.place = function (actor, t, mat, silent) {
    initMats();
    if (!B.canPlace(t)) return null;
    if (actor && !actor.infiniteMats) {
      if ((actor.mats[mat] || 0) < B.COST) return null;
      actor.mats[mat] -= B.COST;
    }
    const maxHp = I.MAT[mat].hp;
    const e = W.ent('build', mat, Math.round(maxHp * 0.35), { structural: true, yield: 0 });
    e.maxHp = maxHp;
    e.buildT = 0; e.buildTime = B.BUILD_TIME[mat];
    e.owner = actor; e.key = t.key; e.bType = t.type; e.t = t; e.editMask = 0;
    e.grounded = isGrounded(bounds(t));
    const mesh = new THREE.Mesh(t.type === 'wall' ? B.wallGeo(0) : t.type === 'floor' ? B.floorGeo(0) : t.type === 'ramp' ? B.rampGeo() : B.roofGeo(), mats[mat].clone());
    mesh.material.emissive = new THREE.Color(0x3a8aff); mesh.material.emissiveIntensity = 0.7;
    mesh.position.set(t.x, t.y, t.z);
    mesh.rotation.y = t.rotY;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.scale.setScalar(0.85);
    G.scene.add(mesh);
    e.meshes.push(mesh);
    e.mesh = mesh;
    B.makeColliders(e);
    B.map.set(t.key, e);
    B.pieces.push(e);
    e.onDestroy = () => { B.map.delete(e.key); G.scene.remove(mesh); if (mesh.material !== mats[e.mat]) mesh.material.dispose(); };
    e.onHit = () => {};
    if (!silent) {
      G.Audio.play('build', { pos: [t.x, t.y + 1.5, t.z], mat });
      if (actor && actor.anim) actor.anim.build = 1;
    }
    if (actor) actor.stats.builds = (actor.stats.builds || 0) + 1;
    // pousse les personnages coincés dans un sol/toit
    return e;
  };

  B.makeColliders = function (e) {
    for (const c of e.cols) P.remove(c);
    e.cols.length = 0;
    e.minX = e.minY = e.minZ = 1e9; e.maxX = e.maxY = e.maxZ = -1e9;
    const t = e.t;
    if (t.type === 'wall') {
      const tw = T / 3, th = H / 3;
      for (let r = 0; r < 3; r++) {
        let c = 0;
        while (c < 3) {
          if (e.editMask & (1 << (r * 3 + c))) { c++; continue; }
          let c2 = c;
          while (c2 + 1 < 3 && !(e.editMask & (1 << (r * 3 + c2 + 1)))) c2++;
          const a0 = -T / 2 + c * tw, a1 = -T / 2 + (c2 + 1) * tw;
          if (t.dir === 0) W.addCol(e, P.box(t.x - TH / 2, t.y + r * th, t.z + a0, t.x + TH / 2, t.y + (r + 1) * th, t.z + a1, e, 3));
          else W.addCol(e, P.box(t.x + a0, t.y + r * th, t.z - TH / 2, t.x + a1, t.y + (r + 1) * th, t.z + TH / 2, e, 3));
          c = c2 + 1;
        }
      }
      if (!e.cols.length) W.bounds(e, ...bounds(t));
    } else if (t.type === 'floor') {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        if (e.editMask & (1 << (i * 2 + j))) continue;
        W.addCol(e, P.box(t.x - T / 2 + i * T / 2, t.y - TH, t.z - T / 2 + j * T / 2, t.x - T / 2 + (i + 1) * T / 2, t.y, t.z - T / 2 + (j + 1) * T / 2, e, 3));
      }
    } else if (t.type === 'ramp') {
      // dir : 0:+x 1:+z 2:-x 3:-z (monte dans cette direction)
      W.addCol(e, P.ramp(t.x - T / 2, t.y, t.z - T / 2, t.x + T / 2, t.y + H, t.z + T / 2, t.dir, e, 3));
    } else {
      W.addCol(e, P.roof(t.x - T / 2, t.y + H - 0.05, t.z - T / 2, t.x + T / 2, t.y + H + 1.4, t.z + T / 2, e, 3));
    }
  };

  // Construction progressive (PV qui montent) + effets
  B.update = function (dt) {
    for (let i = B.pieces.length - 1; i >= 0; i--) {
      const e = B.pieces[i];
      if (e.dead) { B.pieces.splice(i, 1); continue; }
      if (e.buildT < e.buildTime) {
        e.buildT += dt;
        const k = Math.min(1, e.buildT / e.buildTime);
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.65 * dt / e.buildTime);
        const m = e.mesh;
        const pop = Math.min(1, e.buildT / 0.18);
        m.scale.setScalar(0.85 + 0.15 * pop);
        m.material.emissiveIntensity = 0.7 * (1 - k);
        if (k >= 1) { m.material.dispose(); m.material = mats[e.mat]; }
      }
    }
  };

  B.clear = function () {
    for (const e of B.pieces) if (!e.dead) W.destroy(e, { silent: true });
    B.pieces.length = 0;
    B.map.clear();
    // retire les entités de construction de la liste globale
    W.ents = W.ents.filter((e) => e.type !== 'build');
  };

  // ------------------------------------------------------------
  //  Fantôme de prévisualisation
  // ------------------------------------------------------------
  B.ghost = null;
  B.showGhost = function (t, ok) {
    initMats();
    if (!B.ghost) {
      B.ghost = new THREE.Mesh(B.wallGeo(0), ghostMat);
      B.ghost.renderOrder = 3;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.8 }));
      B.ghostEdges = edges;
      G.scene.add(B.ghost);
    }
    if (!t) { B.ghost.visible = false; return; }
    const g = B.ghost;
    g.geometry = t.type === 'wall' ? B.wallGeo(0) : t.type === 'floor' ? B.floorGeo(0) : t.type === 'ramp' ? B.rampGeo() : B.roofGeo();
    g.material = ok ? ghostMat : ghostBad;
    g.position.set(t.x, t.y, t.z);
    g.rotation.y = t.rotY;
    g.visible = true;
  };

  // ------------------------------------------------------------
  //  Mode édition
  // ------------------------------------------------------------
  B.edit = null; // { e, sel (masque), overlay, tiles }
  B.startEdit = function (e, viewer) {
    initMats();
    if (!e || e.dead || e.type !== 'build' || e.bType === 'roof') return false;
    const t = e.t;
    const group = new THREE.Group();
    const tiles = [];
    if (t.type === 'wall') {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const q = new THREE.Mesh(new THREE.PlaneGeometry(T / 3 - 0.08, H / 3 - 0.08), editMat);
        q.position.set(-T / 2 + (c + 0.5) * T / 3, (r + 0.5) * H / 3, 0);
        group.add(q); tiles.push({ mesh: q, bit: r * 3 + c });
      }
    } else if (t.type === 'floor') {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const q = new THREE.Mesh(new THREE.PlaneGeometry(T / 2 - 0.1, T / 2 - 0.1), editMat);
        q.rotation.x = -Math.PI / 2;
        q.position.set(-T / 2 + (i + 0.5) * T / 2, 0.05, -T / 2 + (j + 0.5) * T / 2);
        group.add(q); tiles.push({ mesh: q, bit: i * 2 + j });
      }
    } else if (t.type === 'ramp') {
      // édition de rampe : clic = rotation
      const q = new THREE.Mesh(new THREE.PlaneGeometry(T - 0.2, T - 0.2), editMat);
      q.rotation.x = -Math.PI / 2; q.position.y = 0.1; group.add(q); tiles.push({ mesh: q, bit: 0 });
    }
    group.position.set(t.x, t.y, t.z);
    group.rotation.y = t.rotY;
    if (t.type === 'wall') {
      // superposition du côté du joueur
      let s = 1;
      if (viewer) { const nx = Math.sin(t.rotY), nz = Math.cos(t.rotY); s = ((viewer.x - t.x) * nx + (viewer.z - t.z) * nz) >= 0 ? 1 : -1; }
      group.translateZ(0.14 * s);
    }
    G.scene.add(group);
    B.edit = { e, sel: e.editMask, orig: e.editMask, group, tiles, rampDir: t.dir, painted: new Set() };
    refreshEditTiles();
    G.Audio.play('edit');
    return true;
  };
  function refreshEditTiles() {
    const ed = B.edit;
    for (const tl of ed.tiles) tl.mesh.material = (ed.sel & (1 << tl.bit)) ? editSel : editMat;
  }
  // Rayon de visée -> bascule la tuile visée
  const ray = new THREE.Raycaster();
  B.editPaint = function (origin, direction, pressed) {
    const ed = B.edit;
    if (!ed) return;
    ray.set(origin, direction); ray.far = 12;
    const hits = ray.intersectObjects(ed.tiles.map((t) => t.mesh), false);
    if (!hits.length) return;
    const tl = ed.tiles.find((t) => t.mesh === hits[0].object);
    if (!tl) return;
    if (ed.e.t.type === 'ramp') {
      if (pressed) { ed.rampDir = (ed.rampDir + 1) % 4; G.Audio.play('edit'); ed.rampChanged = true; ed.group.rotation.y = [-Math.PI / 2, Math.PI, Math.PI / 2, 0][ed.rampDir]; }
      return;
    }
    if (ed.painted.has(tl.bit)) return;
    ed.painted.add(tl.bit);
    if (pressed || ed.painted.size > 1) {
      if (ed.paintMode == null) ed.paintMode = !(ed.sel & (1 << tl.bit));
      if (ed.paintMode) ed.sel |= (1 << tl.bit); else ed.sel &= ~(1 << tl.bit);
      G.Audio.play('edit');
      refreshEditTiles();
    }
  };
  B.editRelease = function () { if (B.edit) { B.edit.painted.clear(); B.edit.paintMode = null; } };
  B.editReset = function () { if (!B.edit) return; B.edit.sel = 0; refreshEditTiles(); G.Audio.play('edit'); };
  B.confirmEdit = function () {
    const ed = B.edit;
    if (!ed) return;
    const e = ed.e;
    G.scene.remove(ed.group);
    B.edit = null;
    if (e.dead) return;
    const t = e.t;
    if (t.type === 'ramp') {
      if (ed.rampChanged) { t.dir = ed.rampDir; t.rotY = [-Math.PI / 2, Math.PI, Math.PI / 2, 0][t.dir]; e.mesh.rotation.y = t.rotY; B.makeColliders(e); G.Audio.play('edit_confirm', { pos: [t.x, t.y + 1, t.z] }); }
      return;
    }
    const full = t.type === 'wall' ? 511 : 15;
    if (ed.sel === full) return; // tout sélectionné : invalide
    if (ed.sel === e.editMask) return;
    e.editMask = ed.sel;
    e.mesh.geometry = t.type === 'wall' ? B.wallGeo(e.editMask) : B.floorGeo(e.editMask);
    B.makeColliders(e);
    G.Audio.play('edit_confirm', { pos: [t.x, t.y + 1, t.z] });
    // pièces qui ne tiennent plus
  };
  B.cancelEdit = function () { if (B.edit) { G.scene.remove(B.edit.group); B.edit = null; } };
  // Nom de l'édition (pour l'interface)
  B.editName = function (mask, type) {
    if (type !== 'wall') return 'Édition';
    const M = { 16: 'Fenêtre', 18: 'Porte', 146: 'Porte', 448: 'Demi-mur', 504: 'Muret', 56: 'Fenêtre large', 7: 'Mur haut', 73: 'Porte latérale', 292: 'Porte latérale', 186: 'Arche', 23: 'Arche' };
    return M[mask] || 'Édition';
  };
  // Fenêtre (mask bit4) = centre ; porte = colonne du milieu, deux rangées basses : bits 1 et 4
  B.PRESETS = { window: 16, door: 18, half: 448, arch: 23 };

  // ------------------------------------------------------------
  //  Aides pour les bots : cibles directes
  // ------------------------------------------------------------
  // Repère de grille local (niveau + décalage) pour un personnage
  B.gridAt = function (x, y, z) {
    const yOff = B.yOffFor(x, y, z);
    return { i: Math.floor(x / T), j: Math.floor(z / T), k: Math.floor((y - yOff + 0.6) / H), yOff };
  };
  B.wallTowards = function (x, y, z, dxw, dzw) {
    const g = B.gridAt(x, y, z);
    const ci = g.i, cj = g.j, k = g.k;
    const t = { type: 'wall', k, yOff: g.yOff };
    if (Math.abs(dxw) > Math.abs(dzw)) { t.dir = 0; t.i = dxw > 0 ? ci + 1 : ci; t.j = cj; t.x = t.i * T; t.z = (cj + 0.5) * T; t.rotY = Math.PI / 2; t.key = keyOf('wx:', t.i, t.j, k, g.yOff); }
    else { t.dir = 1; t.i = ci; t.j = dzw > 0 ? cj + 1 : cj; t.x = (ci + 0.5) * T; t.z = t.j * T; t.rotY = 0; t.key = keyOf('wz:', t.i, t.j, k, g.yOff); }
    t.y = k * H + g.yOff;
    return t;
  };
  B.cellTarget = function (type, i, j, k, dir, yOff) {
    yOff = yOff || 0;
    const t = { type, i, j, k, dir: dir || 0, x: (i + 0.5) * T, z: (j + 0.5) * T, y: k * H + yOff, yOff };
    t.rotY = type === 'ramp' ? [-Math.PI / 2, Math.PI, Math.PI / 2, 0][t.dir] : 0;
    t.key = keyOf(type === 'floor' ? 'f:' : type === 'ramp' ? 'r:' : 'c:', i, j, k, yOff);
    return t;
  };
  B.wallAt = function (i, j, k, dir, yOff) {
    yOff = yOff || 0;
    const t = { type: 'wall', i, j, k, dir, yOff };
    if (dir === 0) { t.x = i * T; t.z = (j + 0.5) * T; t.rotY = Math.PI / 2; t.key = keyOf('wx:', i, j, k, yOff); }
    else { t.x = (i + 0.5) * T; t.z = j * T; t.rotY = 0; t.key = keyOf('wz:', i, j, k, yOff); }
    t.y = k * H + yOff;
    return t;
  };
})();
