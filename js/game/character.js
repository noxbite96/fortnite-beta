// ============================================================
//  Personnage : modèle low-poly détaillé + animation procédurale
// ============================================================
(function () {
  const U = G.U;
  const CH = { matCache: {}, geoCache: {} };
  G.Char = CH;

  // ---------- géométries utilitaires ----------
  // Boîte arrondie avec UV d'atlas (régions par face : +x,-x,+y,-y,+z,-z)
  function roundedBox(w, h, d, seg, round, regions) {
    const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
    const p = g.attributes.position;
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i) / hw, p.getY(i) / hh, p.getZ(i) / hd);
      const n = v.clone().normalize();
      // mélange boîte -> ellipsoïde
      const k = round;
      const x = U.lerp(v.x, n.x * 1.12, k), y = U.lerp(v.y, n.y * 1.12, k), z = U.lerp(v.z, n.z * 1.12, k);
      p.setXYZ(i, U.clamp(x, -1, 1) * hw, U.clamp(y, -1, 1) * hh, U.clamp(z, -1, 1) * hd);
    }
    g.computeVertexNormals();
    if (regions) {
      const uv = g.attributes.uv;
      const per = (seg + 1) * (seg + 1);
      for (let f = 0; f < 6; f++) {
        const r = regions[f];
        if (!r) continue;
        for (let i = f * per; i < (f + 1) * per; i++) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1]));
      }
    }
    return g;
  }
  CH.roundedBox = roundedBox;
  function geo(key, fn) { return CH.geoCache[key] || (CH.geoCache[key] = fn()); }

  // Régions d'atlas : face avant = moitié gauche, reste = moitié droite
  const FRONT_ATLAS = [[0.5, 0, 1, 1], [0.5, 0, 1, 1], [0.5, 0, 1, 1], [0.5, 0, 1, 1], [0, 0, 0.5, 1], [0.5, 0, 1, 1]];

  // ---------- textures de peau / visage / torse ----------
  function hex(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }
  function faceTexture(sk) {
    const c = G.Tex.canvas(256, 128), x = c.getContext('2d');
    const f = sk.face || {};
    const skin = hex(sk.full === 'robot' ? 0x6a7a8a : sk.skin);
    x.fillStyle = skin; x.fillRect(0, 0, 256, 128);
    // côté droit : peau + joues
    const fx = 0, W = 128;
    if (f.mask) { x.fillStyle = hex(f.mask); x.fillRect(fx, 62, W, 66); }
    if (f.paint === 'stripes') { x.fillStyle = 'rgba(30,40,20,0.7)'; x.fillRect(fx + 14, 58, 30, 6); x.fillRect(fx + 84, 58, 30, 6); }
    if (f.paint === 'blue') { x.fillStyle = 'rgba(40,80,200,0.6)'; x.fillRect(fx + 10, 40, 108, 14); }
    if (f.paint === 'star') { x.fillStyle = '#ff3aa0'; star(x, fx + 96, 44, 10); }
    if (f.zombie) { x.fillStyle = 'rgba(80,110,60,0.6)'; x.beginPath(); x.arc(fx + 30, 80, 12, 0, 7); x.fill(); x.fillStyle = '#6a2a2a'; x.fillRect(fx + 70, 20, 4, 22); }
    // yeux
    const ey = 50;
    if (f.glowEyes) {
      x.fillStyle = hex(f.glowEyes); x.shadowColor = hex(f.glowEyes); x.shadowBlur = 14;
      x.beginPath(); x.ellipse(fx + 40, ey, 12, 6, -0.2, 0, 7); x.fill();
      x.beginPath(); x.ellipse(fx + 88, ey, 12, 6, 0.2, 0, 7); x.fill();
      x.shadowBlur = 0;
    } else {
      for (const ex of [40, 88]) {
        if (f.patch && ex === 88) { x.fillStyle = '#111'; x.beginPath(); x.ellipse(fx + ex, ey, 14, 12, 0, 0, 7); x.fill(); x.fillRect(fx, ey - 20, W, 3); continue; }
        x.fillStyle = '#fff'; x.beginPath(); x.ellipse(fx + ex, ey, 12, 10, 0, 0, 7); x.fill();
        x.fillStyle = f.zombie ? '#c8d040' : '#3a6a9a'; x.beginPath(); x.arc(fx + ex + 2, ey + 1, 6.5, 0, 7); x.fill();
        x.fillStyle = '#111'; x.beginPath(); x.arc(fx + ex + 2, ey + 1, 3.5, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(fx + ex + 4, ey - 2, 1.8, 0, 7); x.fill();
      }
      // sourcils
      const bc = sk.hair ? hex(sk.hair.color) : '#3a2a1a';
      x.strokeStyle = bc; x.lineCap = 'round';
      x.lineWidth = f.brows === 'thick' ? 6 : f.brows === 'thin' ? 2.5 : 4;
      if (f.brows !== 'none') {
        const ang = f.brows === 'angry' ? 5 : 0;
        x.beginPath(); x.moveTo(fx + 28, ey - 16 - ang); x.lineTo(fx + 52, ey - 17 + ang); x.stroke();
        x.beginPath(); x.moveTo(fx + 76, ey - 17 + ang); x.lineTo(fx + 100, ey - 16 - ang); x.stroke();
      }
      if (f.glasses) {
        x.strokeStyle = hex(f.glasses); x.lineWidth = 4;
        x.strokeRect(fx + 24, ey - 12, 32, 24); x.strokeRect(fx + 72, ey - 12, 32, 24);
        x.beginPath(); x.moveTo(fx + 56, ey); x.lineTo(fx + 72, ey); x.stroke();
        if (sk.id === 'skin_surf' || sk.id === 'skin_agente') { x.fillStyle = 'rgba(10,10,20,0.85)'; x.fillRect(fx + 24, ey - 12, 32, 24); x.fillRect(fx + 72, ey - 12, 32, 24); }
      }
    }
    // barbe
    if (f.beard) { x.fillStyle = hex(f.beard); x.beginPath(); x.moveTo(fx + 10, 70); x.quadraticCurveTo(fx + 64, 150, fx + 118, 70); x.lineTo(fx + 118, 128); x.lineTo(fx + 10, 128); x.fill(); }
    // bouche
    if (f.mouth !== 'none' && !f.mask) {
      x.strokeStyle = '#5a2020'; x.fillStyle = '#6a1a1a'; x.lineWidth = 4;
      if (f.mouth === 'grin') { x.beginPath(); x.moveTo(fx + 42, 90); x.quadraticCurveTo(fx + 64, 112, fx + 86, 90); x.closePath(); x.fill(); x.fillStyle = '#fff'; x.fillRect(fx + 48, 90, 32, 5); }
      else if (f.mouth === 'serious') { x.beginPath(); x.moveTo(fx + 48, 96); x.lineTo(fx + 80, 96); x.stroke(); }
      else if (f.mouth === 'smirk') { x.beginPath(); x.moveTo(fx + 46, 96); x.quadraticCurveTo(fx + 70, 100, fx + 84, 88); x.stroke(); }
      else { x.beginPath(); x.moveTo(fx + 46, 92); x.quadraticCurveTo(fx + 64, 104, fx + 82, 92); x.stroke(); }
    }
    // joues rosées
    if (!f.mask && !f.glowEyes) { x.fillStyle = 'rgba(255,120,120,0.18)'; x.beginPath(); x.arc(fx + 24, 76, 10, 0, 7); x.arc(fx + 104, 76, 10, 0, 7); x.fill(); }
    // moitié droite : peau (+ oreilles simulées)
    x.fillStyle = skin; x.fillRect(128, 0, 128, 128);
    if (sk.full === 'robot') { x.strokeStyle = hex(sk.glow || 0x30e0ff); x.lineWidth = 3; x.strokeRect(140, 20, 100, 80); }
    return G.Tex.toTexture(c, { clamp: true });
  }
  function star(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); }

  function torsoTexture(sk) {
    const t = sk.top || {};
    const c = G.Tex.canvas(256, 128), x = c.getContext('2d');
    const col = hex(t.color || 0x888888), col2 = hex(t.color2 || 0x555555);
    x.fillStyle = col; x.fillRect(0, 0, 256, 128);
    const pat = t.pattern;
    const both = (fn) => { fn(0); fn(128); };
    if (pat === 'camo') for (let i = 0; i < 40; i++) { x.fillStyle = [col2, '#3a3a2a', '#8a8a5a'][i % 3]; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 128, 10 + Math.random() * 12, 6 + Math.random() * 8, Math.random() * 3, 0, 7); x.fill(); }
    if (pat === 'stripe') both((o) => { x.fillStyle = col2; x.fillRect(o, 40, 128, 12); x.fillRect(o, 64, 128, 12); });
    if (pat === 'bands') both((o) => { x.fillStyle = col2; x.fillRect(o, 70, 128, 10); x.fillStyle = '#d8d8d8'; x.fillRect(o, 80, 128, 4); });
    if (pat === 'fur') { x.fillStyle = col2; for (let i = 0; i < 300; i++) x.fillRect(Math.random() * 256, Math.random() * 30, 2, 6); }
    if (pat === 'belly') { x.fillStyle = col2; x.beginPath(); x.ellipse(64, 72, 40, 48, 0, 0, 7); x.fill(); x.fillStyle = '#e04080'; x.beginPath(); x.moveTo(64, 50); x.bezierCurveTo(44, 30, 30, 60, 64, 80); x.bezierCurveTo(98, 60, 84, 30, 64, 50); x.fill(); }
    if (pat === 'circuit') { x.strokeStyle = col2; x.lineWidth = 3; x.shadowColor = col2; x.shadowBlur = 8; for (let i = 0; i < 12; i++) { x.beginPath(); let px = Math.random() * 256, py = Math.random() * 128; x.moveTo(px, py); for (let k = 0; k < 3; k++) { if (k % 2) px += (Math.random() - 0.5) * 60; else py += (Math.random() - 0.5) * 60; x.lineTo(px, py); } x.stroke(); } x.shadowBlur = 0; }
    if (pat === 'gold') both((o) => { x.fillStyle = col2; x.fillRect(o + 58, 0, 12, 128); x.beginPath(); x.arc(o + 64, 50, 18, 0, 7); x.fill(); x.fillStyle = hex(t.color); x.beginPath(); x.arc(o + 64, 50, 10, 0, 7); x.fill(); });
    if (pat === 'feathers') for (let i = 0; i < 60; i++) { x.fillStyle = i % 2 ? col2 : '#0a0a14'; x.beginPath(); const px = Math.random() * 256, py = Math.random() * 60; x.ellipse(px, py, 6, 14, 0.4, 0, 7); x.fill(); }
    if (pat === 'torn') { x.fillStyle = hex(sk.skin); for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(Math.random() * 256, 128); x.lineTo(Math.random() * 256, 90 + Math.random() * 30); x.lineTo(Math.random() * 256, 128); x.fill(); } x.fillStyle = 'rgba(90,20,20,0.5)'; x.fillRect(30, 60, 20, 8); }
    // détails face avant
    if (t.style === 'jacket' || pat === 'zip') { x.fillStyle = col2; x.fillRect(61, 0, 6, 128); x.fillStyle = '#d0d0d0'; for (let i = 0; i < 12; i++) x.fillRect(62, 4 + i * 10, 4, 4); x.fillStyle = col2; x.fillRect(10, 70, 30, 20); x.fillRect(88, 70, 30, 20); }
    if (pat === 'buttons') { x.fillStyle = col2; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(50, 20 + i * 20, 4, 0, 7); x.arc(78, 20 + i * 20, 4, 0, 7); x.fill(); } }
    if (pat === 'pocket') { x.fillStyle = col2; x.fillRect(20, 30, 26, 22); x.fillRect(82, 30, 26, 22); x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(20, 30, 26, 4); x.fillRect(82, 30, 26, 4); }
    if (pat === 'logo') { x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 50, 18, 0, 7); x.fill(); x.fillStyle = col; star(x, 64, 50, 13); }
    if (pat === 'patch') { x.fillStyle = col2; x.fillRect(80, 20, 30, 20); x.fillStyle = '#fff'; star(x, 95, 30, 7); x.fillStyle = '#d83030'; x.fillRect(16, 20, 26, 6); }
    if (t.style === 'hoodie') { x.fillStyle = col2; x.fillRect(30, 80, 68, 30); x.strokeStyle = '#eee'; x.lineWidth = 2; x.beginPath(); x.moveTo(56, 0); x.lineTo(54, 30); x.moveTo(72, 0); x.lineTo(74, 30); x.stroke(); }
    if (t.style === 'vest') { x.fillStyle = col2; x.fillRect(0, 0, 44, 128); x.fillRect(84, 0, 44, 128); x.fillRect(128, 0, 128, 128); }
    if (t.style === 'armor') { x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(8, 8, 112, 40); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(8, 52, 112, 4); x.fillRect(8, 84, 112, 4); x.fillStyle = col2; x.beginPath(); x.moveTo(64, 14); x.lineTo(80, 34); x.lineTo(64, 54); x.lineTo(48, 34); x.fill(); }
    if (t.style === 'tank') { x.fillStyle = hex(sk.skin); x.fillRect(0, 0, 30, 30); x.fillRect(98, 0, 30, 30); x.beginPath(); x.arc(64, 0, 22, 0, Math.PI); x.fill(); }
    if (t.style === 'tshirt') { x.fillStyle = 'rgba(0,0,0,0.15)'; x.beginPath(); x.arc(64, 0, 16, 0, Math.PI); x.fill(); }
    // col / ourlet
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, 122, 256, 6);
    G.Tex.noiseFill(x, 256, 128, 0, 10);
    return G.Tex.toTexture(c, { clamp: true });
  }

  function mat(color, opts) {
    opts = opts || {};
    const m = new THREE.MeshLambertMaterial({ color, map: opts.map || null });
    if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.ei || 1; }
    if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity; }
    return m;
  }

  function skinMats(sk) {
    if (CH.matCache[sk.id]) return CH.matCache[sk.id];
    const t = sk.top || {}, p = sk.pants || {};
    const M = {
      skin: mat(sk.skin),
      face: mat(0xffffff, { map: faceTexture(sk) }),
      torso: mat(0xffffff, { map: torsoTexture(sk) }),
      sleeve: mat(t.style === 'tank' ? sk.skin : t.color || 0x888888),
      sleeve2: mat(t.style === 'tank' || t.style === 'tshirt' || t.style === 'vest' ? sk.skin : t.color || 0x888888),
      pants: mat(p.color || 0x3a4a6a),
      pants2: mat(p.style === 'shorts' ? sk.skin : (p.color || 0x3a4a6a)),
      shoes: mat(sk.shoes || 0x222222),
      gloves: mat(sk.gloves || sk.skin),
      hair: mat(sk.hair ? sk.hair.color : 0x222222),
      hat: mat(sk.hat ? sk.hat.color : 0x444444),
      acc: mat(t.color2 || 0x444444),
      dark: mat(0x2a2a2a),
      gold: mat(0xf0c030, { emissive: 0x6a4a00, ei: 0.4 }),
      glow: mat(0xffffff, { emissive: sk.glow || sk.face && sk.face.glowEyes || 0x30e0ff, ei: 1.5 }),
      cape: mat(sk.cape || 0x8a1a1a),
      scarf: mat(sk.scarf || 0xc02020),
      visor: mat(0x1a2a4a, { transparent: true, opacity: 0.8 }),
    };
    M.cape.side = THREE.DoubleSide;
    CH.matCache[sk.id] = M;
    return M;
  }

  // ------------------------------------------------------------
  //  Construction du modèle
  // ------------------------------------------------------------
  CH.build = function (skinId, opts) {
    opts = opts || {};
    const sk = G.Cosmetics.items[skinId] || G.Cosmetics.items.skin_recrue;
    const M = skinMats(sk);
    const f = sk.body === 'f';
    const root = new THREE.Group();
    root.scale.x = -1; // miroir : la main "R" devient la main droite du personnage
    const J = {};  // articulations
    const meshes = [];
    const add = (parent, g, m, x, y, z, name) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; parent.add(o); meshes.push(o); if (name) J[name] = o; return o; };
    const grp = (parent, x, y, z, name) => { const g = new THREE.Bone(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); if (name) J[name] = g; return g; };

    const sw = f ? 0.9 : 1.0; // largeur d'épaules
    J.body = grp(root, 0, 0, 0);
    J.hips = grp(J.body, 0, 0.98, 0, 'hips');
    add(J.hips, geo('pelvis' + f, () => roundedBox(0.36 * (f ? 1.02 : 1), 0.22, 0.24, 2, 0.35)), M.pants, 0, 0, 0);
    J.spine = grp(J.hips, 0, 0.1, 0, 'spine');
    J.chest = grp(J.spine, 0, 0, 0, 'chest');
    const torsoW = 0.46 * sw, torsoH = 0.5;
    if (sk.full === 'banana') {
      const b = add(J.chest, geo('banana', () => { const g = new THREE.CapsuleGeometry(0.3, 1.1, 6, 12); return g; }), mat(0xf4d840), 0, 0.42, 0.02);
      b.rotation.x = -0.08;
      add(J.chest, geo('banTip', () => new THREE.CylinderGeometry(0.05, 0.1, 0.25, 6)), mat(0x5a3a1a), 0, 1.24, -0.04);
      // visage dessiné sur la banane
      add(J.chest, geo('banFace', () => roundedBox(0.36, 0.3, 0.06, 2, 0.3, FRONT_ATLAS)), M.face, 0, 0.92, 0.275);
      add(J.chest, geo('banSpot1', () => new THREE.SphereGeometry(0.04, 6, 4)), mat(0x7a5a1a), 0.18, 0.3, 0.27);
      add(J.chest, geo('banSpot2', () => new THREE.SphereGeometry(0.03, 6, 4)), mat(0x7a5a1a), -0.15, 0.1, 0.28);
    } else {
      add(J.chest, geo('torso' + f, () => {
        const g = roundedBox(torsoW, torsoH, 0.27, 3, 0.3, FRONT_ATLAS);
        // effiler vers la taille
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = U.lerp(0.78, 1.0, (y + torsoH / 2) / torsoH); p.setX(i, p.getX(i) * k); }
        g.computeVertexNormals();
        return g;
      }), M.torso, 0, 0.26, 0);
    }
    // cou + tête
    J.neck = grp(J.chest, 0, 0.52, 0, 'neck');
    if (sk.full !== 'banana') add(J.neck, geo('neck', () => new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8)), M.skin, 0, 0.03, 0);
    J.head = grp(J.neck, 0, 0.1, 0.01, 'head');
    buildHead(sk, M, J, add, grp, f);
    J.head.scale.setScalar(1.1); // tête légèrement stylisée
    // bras
    for (const side of [-1, 1]) {
      const s = side < 0 ? 'L' : 'R';
      const sh = grp(J.chest, side * (torsoW / 2 + 0.035), 0.44, 0, 'sh' + s);
      add(sh, geo('shoulderBall' + f, () => new THREE.SphereGeometry(f ? 0.075 : 0.088, 10, 8)), M.sleeve, 0, -0.02, 0);
      add(sh, geo('uArmC' + f, () => new THREE.CapsuleGeometry(f ? 0.05 : 0.06, 0.2, 4, 10)), M.sleeve, 0, -0.15, 0);
      const el = grp(sh, 0, -0.3, 0, 'el' + s);
      add(el, geo('elbow' + f, () => new THREE.SphereGeometry(f ? 0.048 : 0.056, 8, 6)), M.sleeve2, 0, 0, 0);
      add(el, geo('fArmC' + f, () => new THREE.CapsuleGeometry(f ? 0.045 : 0.052, 0.18, 4, 10)), M.sleeve2, 0, -0.13, 0);
      const hd = grp(el, 0, -0.28, 0, 'hand' + s);
      add(hd, geo('hand', () => roundedBox(0.095, 0.115, 0.105, 2, 0.5)), M.gloves, 0, -0.03, 0.01);
      add(hd, geo('thumb', () => new THREE.CapsuleGeometry(0.022, 0.04, 3, 6)), M.gloves, side * -0.045, -0.02, 0.04).rotation.z = side * 0.5;
      if (sk.extra && sk.extra.includes('shoulders')) add(sh, geo('pad', () => { const g = new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); return g; }), sk.id === 'skin_roi' ? M.gold : M.acc, side * 0.02, 0.01, 0);
    }
    // jambes
    for (const side of [-1, 1]) {
      const s = side < 0 ? 'L' : 'R';
      const th = grp(J.hips, side * 0.1, -0.04, 0, 'th' + s);
      add(th, geo('thighC', () => new THREE.CapsuleGeometry(0.083, 0.3, 4, 10)), M.pants, 0, -0.21, 0);
      const kn = grp(th, 0, -0.43, 0, 'kn' + s);
      add(kn, geo('knee', () => new THREE.SphereGeometry(0.072, 8, 6)), M.pants2, 0, 0, 0);
      add(kn, geo('shinC', () => new THREE.CapsuleGeometry(0.068, 0.3, 4, 10)), M.pants2, 0, -0.2, 0);
      const ft = grp(kn, 0, -0.44, 0, 'ft' + s);
      add(ft, geo('foot', () => roundedBox(0.13, 0.1, 0.25, 2, 0.35)), M.shoes, 0, -0.02, 0.05);
    }
    // accessoires
    const ex = sk.extra || [];
    if (ex.includes('belt')) add(J.hips, geo('belt', () => new THREE.BoxGeometry(0.38, 0.06, 0.26)), M.dark, 0, 0.08, 0);
    if (ex.includes('vest')) add(J.chest, geo('vest', () => roundedBox(torsoW + 0.04, 0.34, 0.3, 2, 0.2)), M.acc, 0, 0.3, 0);
    if (ex.includes('scarf')) add(J.chest, geo('scarf', () => new THREE.TorusGeometry(0.12, 0.05, 6, 10)), M.scarf, 0, 0.5, 0).rotation.x = Math.PI / 2;
    if (ex.includes('cape')) {
      J.cape = grp(J.chest, 0, 0.48, -0.15);
      add(J.cape, geo('capeG', () => { const g = new THREE.PlaneGeometry(0.55, 1.05, 1, 4); g.translate(0, -0.52, 0); return g; }), M.cape, 0, 0, 0);
    }
    // point d'accroche du sac à dos
    J.back = grp(J.chest, 0, 0.3, -0.15, 'back');
    // point d'accroche de l'arme (main droite)
    J.weapon = grp(J.handR, 0, -0.06, 0.02, 'weapon');
    J.weapon.rotation.x = Math.PI / 2;
    J.offhand = grp(J.handL, 0, -0.06, 0.02, 'offhand');
    J.offhand.rotation.x = Math.PI / 2;
    const c = { root, J, sk, meshes, anim: CH.newAnim(), backModel: null, weaponModel: null, glider: null, details: [], lodDetail: true };
    // fusion en un seul maillage animé par squelette (1 appel de rendu au lieu de ~35)
    bakeSkinned(c, M, sk);
    if (opts.back) CH.setBack(c, opts.back);
    return c;
  };

  // ------------------------------------------------------------
  //  Fusion : toutes les pièces "simples" -> un SkinnedMesh + atlas
  // ------------------------------------------------------------
  function atlasFor(sk, M) {
    if (M._atlas) return M._atlas;
    const cv = G.Tex.canvas(512, 256), x = cv.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 256);
    x.drawImage(M.face.map.image, 0, 0, 256, 128);
    x.drawImage(M.torso.map.image, 256, 0, 256, 128);
    const tex = G.Tex.toTexture(cv, { clamp: true });
    M._atlas = { tex, mat: new THREE.MeshLambertMaterial({ map: tex, vertexColors: true }) };
    return M._atlas;
  }
  const _mi = new THREE.Matrix4(), _mm = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _v = new THREE.Vector3(), _c = new THREE.Color();
  function bakeSkinned(c, M, sk) {
    const root = c.root;
    root.updateMatrixWorld(true);
    const bones = [];
    root.traverse((o) => { if (o.isBone) bones.push(o); });
    _mi.copy(root.matrixWorld).invert();
    const atlas = atlasFor(sk, M);
    const parts = [], keep = [];
    for (const m of c.meshes) {
      const mt = m.material;
      const ok = mt.isMeshLambertMaterial && !mt.transparent && mt.side !== THREE.DoubleSide && mt.emissive.getHex() === 0 && (!mt.map || mt.map === M.face.map || mt.map === M.torso.map) && m.parent && m.parent.isBone;
      (ok ? parts : keep).push(m);
    }
    // géométrie fusionnée partagée par tous les personnages de la même tenue
    if (M._baked) {
      for (const m of parts) m.parent.remove(m);
      finishSkinned(c, root, bones, M._baked, atlas, keep);
      return;
    }
    let nv = 0, ni = 0;
    for (const m of parts) { nv += m.geometry.attributes.position.count; ni += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
    const si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), idx = new Uint32Array(ni);
    let o = 0, oi = 0;
    for (const m of parts) {
      const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv;
      _mm.multiplyMatrices(_mi, m.matrixWorld);
      _nm.getNormalMatrix(_mm);
      const mt = m.material;
      const reg = mt.map === M.face.map ? [0, 0.5, 0.5, 1] : mt.map === M.torso.map ? [0.5, 0.5, 1, 1] : null;
      if (reg) _c.setRGB(1, 1, 1); else _c.copy(mt.color);
      const bi = bones.indexOf(m.parent);
      for (let i = 0; i < P.count; i++) {
        _v.fromBufferAttribute(P, i).applyMatrix4(_mm);
        pos[(o + i) * 3] = _v.x; pos[(o + i) * 3 + 1] = _v.y; pos[(o + i) * 3 + 2] = _v.z;
        _v.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize();
        nor[(o + i) * 3] = _v.x; nor[(o + i) * 3 + 1] = _v.y; nor[(o + i) * 3 + 2] = _v.z;
        if (reg && UV) { uv[(o + i) * 2] = reg[0] + UV.getX(i) * (reg[2] - reg[0]); uv[(o + i) * 2 + 1] = reg[1] + UV.getY(i) * (reg[3] - reg[1]); }
        else { uv[(o + i) * 2] = 0.5; uv[(o + i) * 2 + 1] = 0.2; }
        col[(o + i) * 3] = _c.r; col[(o + i) * 3 + 1] = _c.g; col[(o + i) * 3 + 2] = _c.b;
        si[(o + i) * 4] = bi; sw[(o + i) * 4] = 1;
      }
      if (g.index) { const I = g.index.array; for (let k = 0; k < I.length; k++) idx[oi + k] = I[k] + o; oi += I.length; }
      else { for (let k = 0; k < P.count; k++) idx[oi + k] = o + k; oi += P.count; }
      o += P.count;
      m.parent.remove(m);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.userData.shared = true;
    M._baked = geo;
    finishSkinned(c, root, bones, geo, atlas, keep);
  }
  function finishSkinned(c, root, bones, geo, atlas, keep) {
    const skm = new THREE.SkinnedMesh(geo, atlas.mat);
    skm.castShadow = true;
    skm.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 1.7);
    root.add(skm);
    skm.updateMatrixWorld(true);
    skm.bind(new THREE.Skeleton(bones));
    c.skinned = skm;
    c.meshes = keep.concat([skm]);
    c.details = [];
  }
  // Libère les ressources GPU d'un personnage retiré
  CH.dispose = function (c) {
    if (!c) return;
    if (c.root.parent) c.root.parent.remove(c.root);
    if (c.skinned && c.skinned.skeleton) c.skinned.skeleton.dispose();
  };
  CH.setDetail = function (c, on) {
    if (c.lodDetail === on) return;
    c.lodDetail = on;
    for (const m of c.details) m.visible = on;
  };

  function buildHead(sk, M, J, add, grp, f) {
    const h = J.head;
    const hs = 1.0;
    if (sk.full === 'banana') return; // le visage est sur la banane
    if (sk.full === 'pumpkin') {
      const pm = new THREE.MeshLambertMaterial({ color: 0xf08a20, map: pumpkinTex() });
      add(h, geo('pumpkin', () => roundedBox(0.4, 0.34, 0.4, 3, 0.7, FRONT_ATLAS)), pm, 0, 0.14, 0);
      add(h, geo('stem', () => new THREE.CylinderGeometry(0.03, 0.05, 0.12, 6)), mat(0x4a6a20), 0, 0.36, 0);
      return;
    }
    if (sk.full === 'bear') {
      add(h, geo('bearHead', () => roundedBox(0.36, 0.34, 0.34, 3, 0.75, FRONT_ATLAS)), M.face, 0, 0.14, 0);
      for (const s of [-1, 1]) add(h, geo('ear', () => new THREE.SphereGeometry(0.08, 8, 6)), M.skin, s * 0.14, 0.32, 0);
      add(h, geo('snout', () => roundedBox(0.14, 0.09, 0.08, 2, 0.6)), mat(0xfad0e0), 0, 0.08, 0.17);
      add(h, geo('nose', () => new THREE.SphereGeometry(0.03, 6, 4)), M.dark, 0, 0.12, 0.215);
      return;
    }
    if (sk.full === 'robot') {
      add(h, geo('robotHead', () => roundedBox(0.3, 0.32, 0.3, 2, 0.15, FRONT_ATLAS)), M.face, 0, 0.14, 0);
      add(h, geo('visorBar', () => new THREE.BoxGeometry(0.26, 0.05, 0.02)), M.glow, 0, 0.17, 0.155);
      add(h, geo('antenna', () => new THREE.CylinderGeometry(0.01, 0.01, 0.16, 4)), M.dark, 0.1, 0.36, 0);
      add(h, geo('antBall', () => new THREE.SphereGeometry(0.025, 6, 4)), M.glow, 0.1, 0.44, 0);
      return;
    }
    add(h, geo('head' + f, () => roundedBox(0.27, 0.31, 0.28, 3, 0.55, FRONT_ATLAS)), M.face, 0, 0.14, 0);
    // oreilles
    for (const s of [-1, 1]) add(h, geo('earS', () => roundedBox(0.03, 0.07, 0.05, 1, 0.5)), M.skin, s * 0.14, 0.13, 0);
    // nez
    add(h, geo('noseS', () => roundedBox(0.045, 0.06, 0.04, 1, 0.5)), M.skin, 0, 0.11, 0.145);
    // cheveux
    const hr = sk.hair || { style: 'none' };
    const hatType = sk.hat ? sk.hat.type : null;
    const fullHat = ['helmet', 'astronaut', 'knight', 'hood', 'viking'].includes(hatType);
    if (hr.style !== 'none' && hr.style !== 'bald' && !(fullHat && hatType !== 'helmet' && hatType !== 'viking')) {
      const cap = add(h, geo('hairCap', () => { const g = roundedBox(0.29, 0.17, 0.3, 3, 0.6); return g; }), M.hair, 0, 0.26, -0.01);
      if (hr.style === 'buzz') cap.scale.set(0.98, 0.7, 0.98);
      if (hr.style === 'long' || hr.style === 'bob') add(h, geo('hairBack' + hr.style, () => roundedBox(0.28, hr.style === 'long' ? 0.42 : 0.24, 0.08, 2, 0.4)), M.hair, 0, hr.style === 'long' ? 0.04 : 0.12, -0.14);
      if (hr.style === 'bob') for (const s of [-1, 1]) add(h, geo('bobSide', () => roundedBox(0.05, 0.2, 0.2, 2, 0.4)), M.hair, s * 0.145, 0.12, -0.02);
      if (hr.style === 'pony') { const pt = add(h, geo('pony', () => roundedBox(0.08, 0.3, 0.08, 2, 0.5)), M.hair, 0, 0.12, -0.2); pt.rotation.x = 0.4; }
      if (hr.style === 'bun') add(h, geo('bun', () => new THREE.SphereGeometry(0.08, 8, 6)), M.hair, 0, 0.36, -0.1);
      if (hr.style === 'mohawk') { cap.scale.set(0.9, 0.5, 0.95); add(h, geo('mohawk', () => roundedBox(0.05, 0.16, 0.28, 2, 0.3)), M.hair, 0, 0.38, 0); }
      if (hr.style === 'spiky') for (let i = 0; i < 5; i++) { const s = add(h, geo('spike', () => new THREE.ConeGeometry(0.05, 0.14, 5)), M.hair, -0.1 + i * 0.05, 0.36, -0.02 + (i % 2) * 0.04); s.rotation.z = (i - 2) * 0.25; s.rotation.x = -0.3; }
    }
    // chapeaux
    if (hatType) {
      const hm = M.hat;
      if (hatType === 'cap') { add(h, geo('capTop', () => new THREE.SphereGeometry(0.155, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), hm, 0, 0.24, 0); add(h, geo('visor', () => new THREE.BoxGeometry(0.22, 0.02, 0.14)), hm, 0, 0.25, 0.17); }
      else if (hatType === 'beanie') add(h, geo('beanie', () => roundedBox(0.3, 0.18, 0.31, 2, 0.6)), hm, 0, 0.3, -0.01);
      else if (hatType === 'helmet') { add(h, geo('helmet', () => new THREE.SphereGeometry(0.175, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), hm, 0, 0.21, -0.01); add(h, geo('helmRim', () => new THREE.CylinderGeometry(0.19, 0.19, 0.025, 12)), hm, 0, 0.21, 0); }
      else if (hatType === 'cowboy') { add(h, geo('cbBrim', () => new THREE.CylinderGeometry(0.3, 0.3, 0.02, 14)), hm, 0, 0.27, 0); add(h, geo('cbTop', () => new THREE.CylinderGeometry(0.12, 0.15, 0.16, 10)), hm, 0, 0.35, 0); }
      else if (hatType === 'crown') { add(h, geo('crown', () => new THREE.CylinderGeometry(0.15, 0.14, 0.08, 10, 1, true)), M.gold, 0, 0.34, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(h, geo('crownSpike', () => new THREE.ConeGeometry(0.025, 0.08, 4)), M.gold, Math.cos(a) * 0.14, 0.41, Math.sin(a) * 0.14); } }
      else if (hatType === 'viking') { add(h, geo('vHelm', () => new THREE.SphereGeometry(0.165, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), hm, 0, 0.23, 0); for (const s of [-1, 1]) { const horn = add(h, geo('horn', () => new THREE.ConeGeometry(0.04, 0.2, 6)), mat(0xf0e8d0), s * 0.18, 0.34, 0); horn.rotation.z = -s * 0.8; } }
      else if (hatType === 'bandana') add(h, geo('bandana', () => roundedBox(0.3, 0.12, 0.31, 2, 0.6)), hm, 0, 0.28, -0.01);
      else if (hatType === 'headband') add(h, geo('headband', () => new THREE.CylinderGeometry(0.155, 0.155, 0.04, 12)), hm, 0, 0.23, 0);
      else if (hatType === 'chef') { add(h, geo('chefBase', () => new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10)), hm, 0, 0.29, 0); add(h, geo('chefTop', () => new THREE.SphereGeometry(0.17, 10, 8)), hm, 0, 0.42, 0); }
      else if (hatType === 'hood') { const hd = add(h, geo('hood', () => roundedBox(0.34, 0.36, 0.34, 3, 0.55)), hm, 0, 0.16, -0.035); hd.scale.z = 1.0; add(h, geo('hoodPeak', () => new THREE.ConeGeometry(0.06, 0.16, 6)), hm, 0, 0.36, -0.08).rotation.x = -0.6; }
      else if (hatType === 'astronaut') { add(h, geo('astro', () => new THREE.SphereGeometry(0.24, 14, 10)), hm, 0, 0.14, 0); add(h, geo('astroVisor', () => new THREE.SphereGeometry(0.2, 14, 10, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.45)), M.visor, 0, 0.14, 0.06); }
      else if (hatType === 'knight') { add(h, geo('knight', () => roundedBox(0.32, 0.36, 0.33, 2, 0.3)), hm, 0, 0.15, 0); add(h, geo('slit', () => new THREE.BoxGeometry(0.22, 0.03, 0.02)), M.glow, 0, 0.17, 0.167); add(h, geo('plume', () => roundedBox(0.04, 0.16, 0.25, 1, 0.5)), M.cape, 0, 0.38, -0.05); }
    }
  }
  let _pumpTex = null;
  function pumpkinTex() {
    if (_pumpTex) return _pumpTex;
    const c = G.Tex.canvas(256, 128), x = c.getContext('2d');
    x.fillStyle = '#f08a20'; x.fillRect(0, 0, 256, 128);
    x.strokeStyle = 'rgba(160,70,0,0.6)'; x.lineWidth = 5; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * 32 + 16, 0); x.quadraticCurveTo(i * 32 + 4, 64, i * 32 + 16, 128); x.stroke(); }
    x.fillStyle = '#ffd040'; x.shadowColor = '#ffa000'; x.shadowBlur = 10;
    x.beginPath(); x.moveTo(26, 50); x.lineTo(50, 30); x.lineTo(56, 58); x.fill();
    x.beginPath(); x.moveTo(102, 50); x.lineTo(78, 30); x.lineTo(72, 58); x.fill();
    x.beginPath(); x.moveTo(20, 76); for (let i = 0; i <= 8; i++) x.lineTo(20 + i * 11, i % 2 ? 84 : 72); x.lineTo(108, 100); x.lineTo(20, 100); x.fill();
    _pumpTex = G.Tex.toTexture(c, { clamp: true });
    return _pumpTex;
  }

  // ------------------------------------------------------------
  //  Sac à dos / planeur / pioche
  // ------------------------------------------------------------
  const buildBack = function (id) {
    const it = G.Cosmetics.items[id];
    if (!it || it.model === 'none') return null;
    const g = new THREE.Group();
    const m1 = mat(it.color || 0x888888), m2 = mat(it.color2 || 0x444444);
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(roundedBox(w, h, d, 2, 0.3), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    switch (it.model) {
      case 'backpack': box(0.36, 0.44, 0.2, m1, 0, -0.02, -0.08); box(0.3, 0.14, 0.08, m2, 0, -0.12, -0.2); box(0.38, 0.1, 0.1, m2, 0, 0.24, -0.08); break;
      case 'quiver': { const q = box(0.14, 0.55, 0.14, m1, 0.05, 0.05, -0.06); q.rotation.z = 0.35; for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4), mat(0xd0c0a0)); a.position.set(0.16 + i * 0.02, 0.4, -0.06); a.rotation.z = 0.35; g.add(a); } break; }
      case 'shield': { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 18), m1); s.rotation.x = Math.PI / 2; s.position.z = -0.06; g.add(s); const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), m2); b.position.z = -0.1; g.add(b); const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 20), m2); r.position.z = -0.1; g.add(r); break; }
      case 'guitar': { const b = box(0.36, 0.4, 0.08, m1, 0, -0.1, -0.06); b.rotation.z = 0.5; const n = box(0.06, 0.55, 0.04, mat(0x3a2a1a), 0.2, 0.3, -0.06); n.rotation.z = 0.5; break; }
      case 'tank': { for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10), m1); t.position.set(s * 0.1, 0, -0.1); g.add(t); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m2); cap.position.set(s * 0.1, 0.26, -0.1); g.add(cap); } break; }
      case 'sword': { const b = box(0.07, 0.95, 0.02, m1, 0, 0.1, -0.06); b.rotation.z = 0.6; const gd = box(0.26, 0.05, 0.06, m2, -0.22, -0.26, -0.06); gd.rotation.z = 0.6; const hd = box(0.05, 0.2, 0.05, mat(0x3a2a1a), -0.3, -0.38, -0.06); hd.rotation.z = 0.6; break; }
      case 'wings': { const wm = mat(0xffffff, { emissive: 0xffffff, ei: 0.2 }); wm.side = THREE.DoubleSide; for (const s of [-1, 1]) { const wg = new THREE.Group(); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(roundedBox(0.12, 0.5 - i * 0.07, 0.03, 1, 0.5), wm); f.position.set(s * (0.12 + i * 0.1), 0.1 - i * 0.04, 0); f.rotation.z = s * (0.3 + i * 0.12); wg.add(f); } wg.position.z = -0.1; g.add(wg); } break; }
      case 'teddy': { box(0.26, 0.3, 0.18, m1, 0, -0.05, -0.1); box(0.2, 0.18, 0.16, m1, 0, 0.18, -0.1); for (const s of [-1, 1]) box(0.07, 0.07, 0.05, m1, s * 0.09, 0.28, -0.1); break; }
      case 'pet': {
        // sac à dos d'où dépasse un petit chien qui regarde partout
        box(0.34, 0.36, 0.22, m2, 0, -0.08, -0.1); box(0.36, 0.08, 0.24, mat(0x3a2a1a), 0, 0.1, -0.1);
        const head = new THREE.Group(); head.name = 'petHead'; head.position.set(0, 0.2, -0.12); g.add(head);
        const hb = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(roundedBox(w, h, d, 2, 0.35), m); o.position.set(x, y, z); o.castShadow = true; head.add(o); return o; };
        hb(0.2, 0.18, 0.18, m1, 0, 0.1, 0); hb(0.11, 0.08, 0.1, m1, 0, 0.07, -0.12);
        hb(0.05, 0.04, 0.04, mat(0x101010), 0, 0.1, -0.18);
        for (const s of [-1, 1]) { const ear = hb(0.05, 0.12, 0.08, mat(it.color2 || 0x5a3a1a), s * 0.11, 0.13, 0.01); ear.rotation.z = s * 0.35; hb(0.03, 0.03, 0.02, mat(0x101010), s * 0.05, 0.14, -0.09); }
        const tongue = hb(0.04, 0.015, 0.05, mat(0xff6a8a), 0, 0.03, -0.15); tongue.name = 'petTongue';
        break;
      }
      case 'jetpack': { for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 12), m1); t.position.set(s * 0.12, 0, -0.12); g.add(t); const n = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 10), m2); n.position.set(s * 0.12, -0.3, -0.12); n.rotation.x = Math.PI; g.add(n); } box(0.2, 0.3, 0.1, m2, 0, 0, -0.06); break; }
    }
    return g;
  };
  const tplCH = {};
  function cloneOf(key, build) {
    if (!(key in tplCH)) tplCH[key] = build();
    return tplCH[key] ? tplCH[key].clone(true) : null;
  }
  CH.backModel = (id) => cloneOf('b:' + id, () => buildBack(id));
  CH.gliderModel = (id) => cloneOf('g:' + id, () => buildGlider(id));
  CH.pickaxeModel = (id) => cloneOf('p:' + id, () => buildPickaxe(id));
  CH.setBack = function (c, id) {
    if (c.backModel) { c.J.back.remove(c.backModel); c.backModel = null; }
    const m = CH.backModel(id);
    if (m) { c.J.back.add(m); c.backModel = m; }
  };

  const buildGlider = function (id) {
    const it = G.Cosmetics.items[id] || G.Cosmetics.items.glider_default;
    const g = new THREE.Group();
    const m1 = mat(it.color), m2 = mat(it.color2 || 0xffffff);
    m1.side = THREE.DoubleSide; m2.side = THREE.DoubleSide;
    const barM = mat(0x3a3a3a);
    // barre tenue par les mains
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), barM); bar.rotation.z = Math.PI / 2; bar.position.y = 0.0; g.add(bar);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.3, 4), barM); r.position.set(s * 0.6, 0.6, 0); r.rotation.z = -s * 0.35; g.add(r); }
    if (it.model === 'umbrella') {
      const u = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 12, 1, true), m1); u.position.y = 1.5; g.add(u);
      for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(1.41, 0.61, 12, 1, true, i * Math.PI / 3, Math.PI / 6), m2); s.position.y = 1.5; g.add(s); }
    } else if (it.model === 'paper') {
      const geo2 = new THREE.BufferGeometry();
      geo2.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 1.2, 1.2, -1.6, 1.4, -0.6, 0, 1.1, -0.6, 0, 1.2, 1.2, 1.6, 1.4, -0.6, 0, 1.1, -0.6, 0, 1.2, 1.2, 0, 1.1, -0.6, 0, 0.9, -0.3]), 3));
      geo2.computeVertexNormals(); g.add(new THREE.Mesh(geo2, m1));
    } else if (it.model === 'carpet') {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 2.2), m1); c.position.y = 1.4; g.add(c);
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.03, 2.3), m2); b.position.y = 1.39; g.add(b);
    } else if (it.model === 'dragon') {
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BufferGeometry(), m1);
        const v = new Float32Array([0, 1.4, 0.4, s * 2.0, 1.8, -0.2, s * 1.6, 1.1, -0.8, 0, 1.4, 0.4, s * 1.6, 1.1, -0.8, 0, 1.2, -0.6]);
        w.geometry.setAttribute('position', new THREE.BufferAttribute(v, 3)); w.geometry.computeVertexNormals(); g.add(w);
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 5), m2); bone.position.set(s * 1.0, 1.6, 0.1); bone.rotation.z = s * -1.35; g.add(bone);
      }
    } else {
      // aile delta classique
      const colors = it.rainbow ? [0xff3a3a, 0xff9a2a, 0xffe03a, 0x4ad04a, 0x3a8aff, 0x9a4aff] : null;
      for (const s of [-1, 1]) {
        const v = new Float32Array([0, 1.45, 0.9, s * 1.9, 1.25, -0.6, 0, 1.25, -0.5]);
        const w = new THREE.Mesh(new THREE.BufferGeometry(), s < 0 ? m1 : (colors ? mat(colors[4]) : m1));
        w.material.side = THREE.DoubleSide;
        w.geometry.setAttribute('position', new THREE.BufferAttribute(v, 3)); w.geometry.computeVertexNormals(); g.add(w);
        const st = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.03, 0.12), m2); st.position.set(s * 0.95, 1.36, 0.15); st.rotation.y = s * 0.66; g.add(st);
      }
      if (colors) g.children.forEach((ch, i) => { if (ch.material && ch.geometry.type === 'BufferGeometry') ch.material = mat(colors[i % colors.length]), ch.material.side = THREE.DoubleSide; });
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  };

  const buildPickaxe = function (id) {
    const it = G.Cosmetics.items[id] || G.Cosmetics.items.pick_default;
    const g = new THREE.Group();
    const m1 = mat(it.color, it.glow ? { emissive: it.color, ei: 1.3 } : null), m2 = mat(it.color2 || 0x6a4a2a);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.85, 6), m2);
    handle.rotation.x = Math.PI / 2; handle.position.z = 0.3; g.add(handle);
    const head = new THREE.Group(); head.position.z = 0.7; g.add(head);
    const add = (geo2, m, x, y, z, rx, ry, rz) => { const o = new THREE.Mesh(geo2, m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); head.add(o); return o; };
    switch (it.model) {
      case 'axe': add(new THREE.BoxGeometry(0.03, 0.28, 0.2), m1, 0, 0.1, 0); break;
      case 'lollipop': { handle.material = mat(0xffffff); const cnd = add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), m1, 0, 0, 0.1, 0, 0, Math.PI / 2); const sw = add(new THREE.TorusGeometry(0.12, 0.025, 6, 16), mat(0xffffff), 0.035, 0, 0.1, 0, Math.PI / 2, 0); break; }
      case 'wrench': add(new THREE.BoxGeometry(0.05, 0.08, 0.3), m1, 0, 0, 0); add(new THREE.TorusGeometry(0.08, 0.035, 6, 10, Math.PI * 1.4), m1, 0, 0, 0.18, 0, Math.PI / 2, 0); break;
      case 'shovel': add(new THREE.BoxGeometry(0.02, 0.24, 0.3), m1, 0, 0, 0.1); break;
      case 'scythe': { const b = add(new THREE.BoxGeometry(0.02, 0.5, 0.08), m1, 0, 0.25, -0.05, 0.4, 0, 0); break; }
      case 'laser': { handle.material = mat(0x2a2a2a); add(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), m1, 0, 0, 0.2, Math.PI / 2, 0, 0); break; }
      case 'hammer': add(new THREE.BoxGeometry(0.16, 0.16, 0.34), m1, 0, 0, 0, 0, 0, 0); break;
      default: { const b = add(new THREE.BoxGeometry(0.05, 0.06, 0.55), m1, 0, 0, 0, 0, Math.PI / 2, 0); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); const t1 = add(new THREE.ConeGeometry(0.04, 0.14, 5), m1, 0, 0.3, 0, 0, 0, 0); const t2 = add(new THREE.ConeGeometry(0.04, 0.14, 5), m1, 0, -0.3, 0, Math.PI, 0, 0); const bar = add(new THREE.BoxGeometry(0.05, 0.55, 0.06), m1, 0, 0, 0); b.visible = false; }
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  };

  // ------------------------------------------------------------
  //  Animation procédurale
  // ------------------------------------------------------------
  CH.newAnim = () => ({
    t: 0, phase: 0, speed: 0, moveAng: 0, grounded: true, crouch: 0, air: 0, vy: 0,
    mode: 'ground', // ground | skydive | glide | swim | bus | dead | sit
    hold: 'none', aim: 0, pitch: 0, fire: 0, reload: 0, swing: 0, swingT: 0, build: 0, emote: null, emoteT: 0, heal: 0,
    lowerYaw: 0, sprint: 0, land: 0, dive: 0, hit: 0,
  });

  const S = Math.sin, Co = Math.cos;
  function setR(o, x, y, z) { o.rotation.set(x, y, z); }

  // Lissage des transitions : la nouvelle pose est mélangée avec la précédente
  const BLEND_JOINTS = ['body', 'hips', 'spine', 'chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'handL', 'handR', 'thL', 'thR', 'knL', 'knR', 'ftL', 'ftR'];
  CH.animate = function (c, dt) {
    // animal de compagnie du sac à dos : tourne la tête, halète
    if (c.backModel) {
      if (c.petHead === undefined || c.petOf !== c.backModel) { c.petOf = c.backModel; c.petHead = c.backModel.getObjectByName('petHead') || null; c.petTongue = c.petHead ? c.petHead.getObjectByName('petTongue') : null; }
      if (c.petHead) {
        c.petT = (c.petT || Math.random() * 10) + dt;
        const t = c.petT;
        c.petHead.rotation.y = Math.sin(t * 0.7) * 1.1 + Math.sin(t * 2.3) * 0.15;
        c.petHead.rotation.x = Math.sin(t * 1.1) * 0.12;
        c.petHead.position.y = 0.2 + Math.abs(Math.sin(t * 3)) * 0.015;
        if (c.petTongue) c.petTongue.position.y = 0.03 - Math.abs(Math.sin(t * 9)) * 0.012;
      }
    }
    if (!c.prevQ) { c.prevQ = BLEND_JOINTS.map(() => new THREE.Quaternion()); c.prevP = new THREE.Vector3(); c.blendInit = false; }
    for (let i = 0; i < BLEND_JOINTS.length; i++) c.prevQ[i].copy(c.J[BLEND_JOINTS[i]].quaternion);
    c.prevP.copy(c.J.hips.position);
    animatePose(c, dt);
    if (c.blendInit && dt > 0) {
      const k = 1 - Math.exp(-(c.anim.emote ? 14 : 22) * dt);
      for (let i = 0; i < BLEND_JOINTS.length; i++) { const j = c.J[BLEND_JOINTS[i]]; j.quaternion.copy(c.prevQ[i].slerp(j.quaternion, k)); }
      c.J.hips.position.lerpVectors(c.prevP, c.J.hips.position, k);
      aimCorrect(c);
    }
    c.blendInit = true;
  };
  function animatePose(c, dt) {
    const a = c.anim, J = c.J;
    a.t += dt;
    a.fire = Math.max(0, a.fire - dt * 8);
    a.hit = Math.max(0, a.hit - dt * 5);
    a.land = Math.max(0, a.land - dt * 4);
    if (a.swing > 0) { a.swingT += dt; if (a.swingT > 0.45) { a.swing = 0; a.swingT = 0; } }
    if (a.build > 0) a.build = Math.max(0, a.build - dt * 5);
    // réinitialisation
    J.body.position.set(0, 0, 0); J.body.rotation.set(0, 0, 0);
    J.hips.position.set(0, 0.98, 0); J.hips.rotation.set(0, 0, 0);
    J.spine.rotation.set(0, 0, 0); J.chest.rotation.set(0, 0, 0); J.neck.rotation.set(0, 0, 0); J.head.rotation.set(0, 0, 0);
    for (const s of ['L', 'R']) { J['sh' + s].rotation.set(0, 0, 0); J['el' + s].rotation.set(0, 0, 0); J['hand' + s].rotation.set(0, 0, 0); J['th' + s].rotation.set(0, 0, 0); J['kn' + s].rotation.set(0, 0, 0); J['ft' + s].rotation.set(0, 0, 0); }
    if (J.cape) J.cape.rotation.set(0.15, 0, 0);

    if (a.emote) { CH.emotePose(c, a.emote, a.emoteT); a.emoteT += dt; return; }
    if (a.mode === 'dead') return;
    if (a.mode === 'skydive') return skydivePose(c, dt);
    if (a.mode === 'glide') return glidePose(c, dt);
    if (a.mode === 'swim') return swimPose(c, dt);
    if (a.mode === 'bus' || a.mode === 'sit') return sitPose(c, dt);
    if (a.mode === 'down') return downPose(c, dt);
    if (a.mode === 'mantle') return mantlePose(c, dt);
    if (a.mode === 'slide') { slidePose(c, dt); upperBody(c, dt); aimCorrect(c); return; }

    // ---------- locomotion ----------
    const sp = a.speed;
    const moving = sp > 0.3;
    const run = U.clamp(sp / 6.5, 0, 1.4);
    a.phase += dt * (moving ? (3.2 + sp * 1.05) : 0);
    const ph = a.phase;
    // orientation du bas du corps selon la direction de déplacement
    let ang = moving ? a.moveAng : 0; // 0 = avant, ±PI/2 = côté, PI = arrière
    let back = Math.abs(ang) > Math.PI * 0.6;
    let targetLower = back ? U.angleDiff(0, ang + Math.PI) : ang;
    targetLower = U.clamp(targetLower, -1.0, 1.0);
    a.lowerYaw = U.dampAngle(a.lowerYaw, targetLower, 10, dt);
    J.hips.rotation.y = a.lowerYaw;
    J.spine.rotation.y = -a.lowerYaw * 0.85;
    const dir = back ? -1 : 1;
    const cr = a.crouch;
    if (a.grounded) {
      const amp = moving ? 0.55 * Math.min(1.2, run) + 0.15 : 0;
      const sL = S(ph * dir), sR = S(ph * dir + Math.PI);
      J.thL.rotation.x = -sL * amp - cr * 1.1;
      J.thR.rotation.x = -sR * amp - cr * 1.1;
      J.knL.rotation.x = Math.max(0, S(ph * dir - 1.2)) * amp * 1.5 + cr * 1.7;
      J.knR.rotation.x = Math.max(0, S(ph * dir + Math.PI - 1.2)) * amp * 1.5 + cr * 1.7;
      J.ftL.rotation.x = -cr * 0.6; J.ftR.rotation.x = -cr * 0.6;
      const bob = moving ? Math.abs(S(ph)) * 0.05 * run : S(a.t * 2) * 0.008;
      J.hips.position.y = 0.98 - cr * 0.36 + bob - a.land * 0.12;
      J.hips.position.z = -cr * 0.12;
      J.spine.rotation.x = 0.08 * run + cr * 0.35 + a.land * 0.2 + a.sprint * 0.18;
      J.hips.rotation.z = moving ? S(ph) * 0.04 : 0;
      // bras libres qui balancent
      if (a.hold === 'none') {
        const br = moving ? 0 : S(a.t * 1.6) * 0.03;
        J.shL.rotation.x = sL * amp * 0.9 + br; J.shR.rotation.x = sR * amp * 0.9 + br;
        J.elL.rotation.x = -0.25 - run * 0.5; J.elR.rotation.x = -0.25 - run * 0.5;
        J.shL.rotation.z = -0.13 - br; J.shR.rotation.z = 0.13 + br;
        if (!moving) { J.hips.rotation.y = S(a.t * 0.5) * 0.03; J.neck.rotation.y = S(a.t * 0.37) * 0.12; J.thL.rotation.z = -0.04; J.thR.rotation.z = 0.04; }
      }
    } else {
      // en l'air
      const up = U.clamp(a.vy / 8, -1, 1);
      J.thL.rotation.x = -0.6 - up * 0.2; J.thR.rotation.x = 0.1 - up * 0.3;
      J.knL.rotation.x = 0.9; J.knR.rotation.x = 0.5;
      J.spine.rotation.x = 0.1;
      if (a.hold === 'none') { J.shL.rotation.set(-0.3, 0, -0.5 - up * 0.3); J.shR.rotation.set(-0.3, 0, 0.5 + up * 0.3); J.elL.rotation.x = -0.6; J.elR.rotation.x = -0.6; }
    }
    // respiration
    J.chest.rotation.x = S(a.t * 1.8) * 0.015;
    // ---------- haut du corps : arme ----------
    upperBody(c, dt);
    if (J.cape) J.cape.rotation.x = 0.15 + run * 0.6 + (a.grounded ? S(ph * 2) * 0.05 : 0.5);
    aimCorrect(c);
  };

  // Oriente l'arme exactement dans la direction visée (quelle que soit la pose)
  const GUN_HOLDS = { rifle: 1, shotgun: 1, smg: 1, sniper: 1, pistol: 1, rocket: 1, bow: 1 };
  const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
  function aimCorrect(c) {
    const a = c.anim, J = c.J;
    if (!GUN_HOLDS[a.hold] || a.reload > 0.05) { J.weapon.rotation.set(Math.PI / 2, 0, 0); return; }
    c.root.updateMatrixWorld(true);
    _m1.copy(c.root.matrixWorld).invert().multiply(J.handR.matrixWorld);
    _m1.decompose(_p, _q1, _s);
    const p = U.clamp(a.pitch, -1.2, 1.2);
    _z.set(0, Math.sin(p), Math.cos(p));
    _y.set(0, Math.cos(p), -Math.sin(p));
    _x.crossVectors(_y, _z);
    _m2.makeBasis(_x, _y, _z);
    _q2.setFromRotationMatrix(_m2);
    J.weapon.quaternion.copy(_q1.invert().multiply(_q2));
  }

  function upperBody(c, dt) {
    const a = c.anim, J = c.J;
    const p = U.clamp(a.pitch, -1.2, 1.2);
    // la colonne suit la visée
    J.chest.rotation.x += -p * 0.45;
    J.neck.rotation.x = -p * 0.35;
    const recoil = a.fire;
    const aim = a.aim;
    const h = a.hold;
    // Repère : R en +X, L en -X (le modèle est ensuite mis en miroir).
    // rotation Z négative sur R / positive sur L = bras ramené vers le centre.
    if (h === 'rifle' || h === 'shotgun' || h === 'smg' || h === 'sniper') {
      // fusil tenu à deux mains, épaule gauche en avant
      const raise = U.lerp(0, 0.45, aim);
      J.shR.rotation.set(-0.55 - raise - p * 0.55 + recoil * 0.25, 0, -0.32);
      J.elR.rotation.set(-1.0 + raise * 0.9 - recoil * 0.15, 0, 0);
      J.handR.rotation.set(0.05, 0, 0);
      J.shL.rotation.set(-1.2 - raise * 0.6 - p * 0.55 + recoil * 0.2, 0, 0.8 - aim * 0.1);
      J.elL.rotation.set(-0.45 + raise * 0.3, 0, 0);
      J.spine.rotation.y += 0.38 - aim * 0.08;
      J.neck.rotation.y = -0.32 + aim * 0.08;
      if (a.reload > 0) { const r = S(a.reload * Math.PI); J.shL.rotation.x += r * 0.9; J.elL.rotation.x -= r * 0.8; J.shR.rotation.x += r * 0.4; }
    } else if (h === 'pistol') {
      J.shR.rotation.set(-1.45 - p * 0.6 + recoil * 0.35, 0, -0.2);
      J.elR.rotation.x = -0.1 - recoil * 0.2;
      J.shL.rotation.set(-1.35 - p * 0.6 + recoil * 0.3, 0, 0.5);
      J.elL.rotation.x = -0.4;
      J.spine.rotation.y += 0.15;
      if (a.reload > 0) { const r = S(a.reload * Math.PI); J.shR.rotation.x += r * 0.6; J.elR.rotation.x -= r * 0.9; }
    } else if (h === 'bow') {
      // bras de l'arc tendu, l'autre main tire la corde jusqu'à la joue
      const dr = a.draw || 0;
      J.shR.rotation.set(-1.52 - p * 0.62 + recoil * 0.15, 0, -0.12);
      J.elR.rotation.x = -0.05;
      J.shL.rotation.set(-1.4 - p * 0.6 + dr * 0.15, 0, 0.62 + dr * 0.28);
      J.elL.rotation.x = -0.45 - dr * 1.45;
      J.spine.rotation.y += 0.42;
      J.neck.rotation.y = -0.36;
      if (a.reload > 0) { const r = S(a.reload * Math.PI); J.shL.rotation.x += r * 0.8; J.elL.rotation.x -= r * 0.5; }
    } else if (h === 'rocket') {
      J.shR.rotation.set(-0.75 - p * 0.55 + recoil * 0.3, 0, -0.3);
      J.elR.rotation.x = -0.85;
      J.shL.rotation.set(-1.3 - p * 0.8, 0, 0.75);
      J.elL.rotation.x = -0.4;
      J.spine.rotation.y += 0.3;
    } else if (h === 'melee') {
      if (a.swing > 0) {
        const t = a.swingT / 0.45;
        let x;
        if (t < 0.35) x = U.lerp(-0.6, -2.7, t / 0.35);           // lever
        else if (t < 0.6) x = U.lerp(-2.7, -0.3, (t - 0.35) / 0.25); // frapper
        else x = U.lerp(-0.3, -0.6, (t - 0.6) / 0.4);
        J.shR.rotation.set(x - p * 0.4, 0, -0.2);
        J.elR.rotation.x = -0.5;
        J.shL.rotation.set(x * 0.7 - p * 0.3, 0, 0.5);
        J.elL.rotation.x = -0.6;
        J.spine.rotation.y += 0.3 * S(t * Math.PI);
        J.spine.rotation.x += 0.2 * S(t * Math.PI);
      } else {
        J.shR.rotation.set(-0.5 - p * 0.3, 0, -0.2);
        J.elR.rotation.x = -0.9;
        J.shL.rotation.set(0.1, 0, -0.15);
        J.elL.rotation.x = -0.3;
      }
    } else if (h === 'item') {
      J.shR.rotation.set(-0.9, 0, -0.3); J.elR.rotation.x = -1.3;
      J.shL.rotation.set(0.1, 0, -0.15);
      if (a.heal > 0) { const k = S(a.t * 6) * 0.3; J.shR.rotation.x = -1.8 + k; J.elR.rotation.x = -1.9; J.neck.rotation.x = -0.2; }
    } else if (h === 'build') {
      const b = a.build;
      J.shR.rotation.set(-1.0 - b * 0.8 - p * 0.4, 0, -0.2); J.elR.rotation.x = -0.6 + b * 0.5;
      J.shL.rotation.set(-0.3, 0, 0.2); J.elL.rotation.x = -0.4;
    }
    if (a.hit > 0) { J.chest.rotation.x -= a.hit * 0.2; J.neck.rotation.x -= a.hit * 0.2; }
  }

  function skydivePose(c, dt) {
    const a = c.anim, J = c.J, t = a.t;
    const dive = a.dive; // 0 = à plat, 1 = en piqué
    J.body.rotation.x = U.lerp(1.25, 1.55, dive);
    J.body.position.y = 1.0;
    J.hips.position.y = 0.0;
    const fl = S(t * 12) * 0.05;
    J.shL.rotation.set(-0.3 + fl - dive * 2.3, 0, -1.2 + dive * 0.9);
    J.shR.rotation.set(-0.3 - fl - dive * 2.3, 0, 1.2 - dive * 0.9);
    J.elL.rotation.x = -0.5 * (1 - dive); J.elR.rotation.x = -0.5 * (1 - dive);
    J.thL.rotation.set(0.2 - dive * 0.2, 0, -0.35 * (1 - dive)); J.thR.rotation.set(0.2 - dive * 0.2, 0, 0.35 * (1 - dive));
    J.knL.rotation.x = 0.7 * (1 - dive) + fl; J.knR.rotation.x = 0.7 * (1 - dive) - fl;
    J.neck.rotation.x = -0.9 + dive * 0.3;
    if (J.cape) J.cape.rotation.x = 1.2 + S(t * 20) * 0.2;
  }
  function glidePose(c, dt) {
    const a = c.anim, J = c.J, t = a.t;
    J.shL.rotation.set(-3.0, 0, -0.35); J.shR.rotation.set(-3.0, 0, 0.35);
    J.elL.rotation.x = -0.2; J.elR.rotation.x = -0.2;
    const sw = S(t * 2.5) * 0.15;
    J.thL.rotation.x = 0.1 + sw; J.thR.rotation.x = 0.1 - sw;
    J.knL.rotation.x = 0.4; J.knR.rotation.x = 0.4;
    J.body.rotation.z = a.bank || 0;
    J.body.rotation.x = 0.12;
    if (J.cape) J.cape.rotation.x = 0.8 + S(t * 15) * 0.1;
  }
  function swimPose(c, dt) {
    const a = c.anim, J = c.J, t = a.t;
    const moving = a.speed > 0.5;
    J.body.rotation.x = moving ? 1.2 : 0.3;
    J.body.position.y = moving ? 0.9 : -0.2;
    const s = t * (moving ? 5 : 2);
    J.shL.rotation.set(moving ? -S(s) * 2.8 - 1.4 : -0.8 + S(s) * 0.4, 0, -0.4);
    J.shR.rotation.set(moving ? -S(s + Math.PI) * 2.8 - 1.4 : -0.8 - S(s) * 0.4, 0, 0.4);
    J.thL.rotation.x = S(s * 2) * 0.4; J.thR.rotation.x = -S(s * 2) * 0.4;
    J.neck.rotation.x = moving ? -0.9 : 0;
  }
  // escalade d'un rebord : on se hisse sur les bras
  function mantlePose(c, dt) {
    const J = c.J, k = c.anim.mantleK || 0;
    J.spine.rotation.x = 0.45 - k * 0.3;
    J.neck.rotation.x = -0.3;
    const arm = k < 0.5 ? -2.7 + k * 2.4 : -1.5 + (k - 0.5) * 2.6;
    J.shL.rotation.set(arm, 0, -0.25); J.shR.rotation.set(arm, 0, 0.25);
    J.elL.rotation.x = -0.4 + k * 0.3; J.elR.rotation.x = -0.4 + k * 0.3;
    J.thL.rotation.x = -1.3 + k * 0.9; J.knL.rotation.x = 1.7 - k * 1.2;
    J.thR.rotation.x = -0.3 - k * 0.5; J.knR.rotation.x = 0.9;
  }
  // glissade : penché en arrière, une jambe tendue
  function slidePose(c, dt) {
    const a = c.anim, J = c.J;
    a.lowerYaw = U.damp(a.lowerYaw, 0, 10, dt);
    J.hips.position.y = 0.46; J.hips.position.z = 0.1;
    J.hips.rotation.x = -0.25;
    J.spine.rotation.x = -0.05;
    J.thL.rotation.x = -1.35; J.knL.rotation.x = 0.15; J.ftL.rotation.x = 0.4;
    J.thR.rotation.x = -0.35; J.thR.rotation.z = 0.15; J.knR.rotation.x = 1.95;
    if (a.hold === 'none') { J.shL.rotation.set(0.6, 0, -0.7); J.elL.rotation.x = -0.1; J.shR.rotation.set(-0.3, 0, 0.5); J.elR.rotation.x = -0.6; }
    J.body.rotation.z = Math.sin(a.t * 30) * 0.01;
  }
  // à terre : à genoux, une main au sol, on rampe
  function downPose(c, dt) {
    const a = c.anim, J = c.J;
    const moving = a.speed > 0.3;
    a.phase += dt * (moving ? 5 : 0);
    const s = S(a.phase);
    const m = moving ? s : 0;
    J.hips.position.y = 0.5 + Math.abs(m) * 0.03; J.hips.position.z = 0.05;
    J.spine.rotation.x = 0.55;
    J.chest.rotation.x = 0.15;
    J.neck.rotation.x = -0.55;
    J.thL.rotation.x = -0.35 + m * 0.3; J.thR.rotation.x = -0.35 - m * 0.3;
    J.knL.rotation.x = 1.6 - m * 0.2; J.knR.rotation.x = 1.6 + m * 0.2;
    J.ftL.rotation.x = 0.5; J.ftR.rotation.x = 0.5;
    J.shL.rotation.set(-0.9 - m * 0.35, 0, -0.1); J.elL.rotation.x = -0.15;
    J.shR.rotation.set(-0.45 + m * 0.35, 0, 0.25); J.elR.rotation.x = -1.3;
    J.body.rotation.z = S(a.t * 2) * 0.03;
    J.head.rotation.z = S(a.t * 1.3) * 0.08;
  }
  function sitPose(c, dt) {
    const J = c.J;
    J.hips.position.y = 0.55;
    J.thL.rotation.x = -1.5; J.thR.rotation.x = -1.5;
    J.knL.rotation.x = 1.5; J.knR.rotation.x = 1.5;
    J.shL.rotation.set(-0.3, 0, -0.1); J.shR.rotation.set(-0.3, 0, 0.1);
    J.elL.rotation.x = -0.8; J.elR.rotation.x = -0.8;
  }

  // ------------------------------------------------------------
  //  EMOTES
  // ------------------------------------------------------------
  CH.emotePose = function (c, id, t) {
    const J = c.J;
    const it = G.Cosmetics.items[id];
    const an = it ? it.anim : 'default';
    const b = 0.98;
    const beat = t * Math.PI * 2 * 1.0; // ~1 temps / s
    switch (an) {
      case 'default': { // danse par défaut
        const k = t * 4.1;
        J.hips.position.y = b - Math.abs(S(k)) * 0.08;
        J.hips.rotation.y = S(k * 0.5) * 0.2;
        J.shL.rotation.set(-0.3 + S(k) * 0.6, 0, -0.8 - S(k) * 0.5); J.elL.rotation.x = -1.2;
        J.shR.rotation.set(-0.3 - S(k) * 0.6, 0, 0.8 - S(k) * 0.5); J.elR.rotation.x = -1.2;
        J.thL.rotation.x = -Math.max(0, S(k)) * 0.7; J.knL.rotation.x = Math.max(0, S(k)) * 1.2;
        J.thR.rotation.x = -Math.max(0, -S(k)) * 0.7; J.knR.rotation.x = Math.max(0, -S(k)) * 1.2;
        J.neck.rotation.z = S(k) * 0.15;
        break;
      }
      case 'shuffle': { // pas chassés
        const k = t * 8, s = S(k);
        J.hips.position.y = b - Math.abs(s) * 0.07;
        J.thL.rotation.x = -Math.max(0, s) * 1.1 + Math.max(0, -s) * 0.3; J.knL.rotation.x = Math.max(0, s) * 1.5;
        J.thR.rotation.x = -Math.max(0, -s) * 1.1 + Math.max(0, s) * 0.3; J.knR.rotation.x = Math.max(0, -s) * 1.5;
        J.spine.rotation.x = 0.12;
        J.shL.rotation.set(-1.0 + s * 0.45, 0, -0.15); J.elL.rotation.x = -1.6;
        J.shR.rotation.set(-1.0 - s * 0.45, 0, 0.15); J.elR.rotation.x = -1.6;
        J.neck.rotation.x = S(k * 2) * 0.08;
        break;
      }
      case 'moonwalk': { // le célèbre glissé arrière
        const k = t * 4.2, s = S(k);
        J.hips.position.y = b - 0.04 - Math.abs(s) * 0.03;
        J.hips.position.z = -((t * 0.35) % 0.5) + 0.25;   // on recule en glissant
        const up = (v) => Math.max(0, v);
        J.thL.rotation.x = -up(s) * 0.35 + up(-s) * 0.25; J.knL.rotation.x = up(s) * 0.85;
        J.thR.rotation.x = -up(-s) * 0.35 + up(s) * 0.25; J.knR.rotation.x = up(-s) * 0.85;
        J.spine.rotation.x = 0.14; J.spine.rotation.y = S(k * 0.5) * 0.08;
        J.shL.rotation.set(-0.25 + s * 0.25, 0, -0.35); J.elL.rotation.x = -0.6;
        J.shR.rotation.set(-0.25 - s * 0.25, 0, 0.35); J.elR.rotation.x = -0.6;
        J.neck.rotation.x = 0.05 + Math.abs(S(k)) * 0.06;
        break;
      }
      case 'airguitar': { // guitare imaginaire
        const k = t * 14;
        J.hips.position.y = b - 0.16;
        J.thL.rotation.x = -0.5; J.knL.rotation.x = 0.8; J.thR.rotation.x = -0.1; J.knR.rotation.x = 0.45;
        J.thL.rotation.z = -0.22; J.thR.rotation.z = 0.22;
        J.spine.rotation.x = 0.25 + S(t * 5) * 0.08;
        J.shL.rotation.set(-1.25, 0, -0.65); J.elL.rotation.x = -0.35;
        J.shR.rotation.set(-0.45, 0, 0.45); J.elR.rotation.x = -1.3 + S(k) * 0.35;
        J.neck.rotation.x = 0.25 + S(t * 10) * 0.3;
        break;
      }
      case 'pony': { // danse du poney
        const k = t * 6.5, s = S(k), hop = Math.abs(s);
        J.hips.position.y = b - 0.1 + hop * 0.06;
        J.thL.rotation.x = -0.35 - Math.max(0, s) * 0.5; J.knL.rotation.x = 0.6 + Math.max(0, s) * 0.6;
        J.thR.rotation.x = -0.35 - Math.max(0, -s) * 0.5; J.knR.rotation.x = 0.6 + Math.max(0, -s) * 0.6;
        J.shL.rotation.set(-1.1 + hop * 0.2, 0, 0.55); J.elL.rotation.x = -0.9;
        J.shR.rotation.set(-1.1 + hop * 0.2, 0, -0.55); J.elR.rotation.x = -0.9;
        J.hips.rotation.y = S(k * 0.5) * 0.15; J.neck.rotation.x = -hop * 0.1;
        break;
      }
      case 'dab': {
        const k = Math.min(1, t * 5);
        J.shR.rotation.set(-1.9 * k, 0, 1.2 * k); J.elR.rotation.x = -0.1;
        J.shL.rotation.set(-2.0 * k, 0, -0.2 * k); J.elL.rotation.x = -2.2 * k;
        J.neck.rotation.x = 0.5 * k; J.neck.rotation.y = -0.4 * k;
        J.spine.rotation.x = 0.2 * k; J.spine.rotation.z = -0.15 * k;
        break;
      }
      case 'wave': {
        J.shR.rotation.set(-0.2, 0, 2.6); J.elR.rotation.set(0, 0, 0.3 + S(t * 10) * 0.5);
        J.neck.rotation.z = -0.1; J.head.rotation.y = 0.2;
        break;
      }
      case 'floss': {
        const k = t * 7;
        const s = S(k), s2 = S(k * 0.5);
        J.hips.rotation.y = -s * 0.35; J.hips.position.x = s * 0.05;
        J.shL.rotation.set(s2 > 0 ? -0.35 : 0.45, 0, s * 0.45 - 0.2); J.shR.rotation.set(s2 > 0 ? -0.35 : 0.45, 0, s * 0.45 + 0.2);
        J.elL.rotation.x = 0; J.elR.rotation.x = 0;
        J.body.position.x = -s * 0.04;
        break;
      }
      case 'clap': {
        const k = S(t * 12);
        J.shL.rotation.set(-1.2, 0.5, -0.1 + k * 0.25); J.shR.rotation.set(-1.2, -0.5, 0.1 - k * 0.25);
        J.elL.rotation.x = -0.9; J.elR.rotation.x = -0.9;
        J.neck.rotation.x = 0.1;
        break;
      }
      case 'robot': {
        const step = Math.floor(t * 4) % 8;
        const P = [[-1.5, 0, 0, -1.5], [-1.5, -1.5, 0, 0], [0, -1.5, -1.5, 0], [0, 0, -1.5, -1.5], [-1.5, 0, 0, 0], [0, -1.5, 0, 0], [-1.5, -1.5, -1.5, -1.5], [0, 0, 0, 0]][step];
        J.shL.rotation.set(P[0] * 0.8, 0, -0.2); J.elL.rotation.x = P[1] * 0.8;
        J.shR.rotation.set(P[2] * 0.8, 0, 0.2); J.elR.rotation.x = P[3] * 0.8;
        J.head.rotation.y = (step % 3 - 1) * 0.5;
        J.hips.rotation.y = (step % 2 ? 0.3 : -0.3);
        break;
      }
      case 'spin': {
        J.body.rotation.y = t * 9;
        J.shL.rotation.set(0, 0, -1.4); J.shR.rotation.set(0, 0, 1.4);
        J.thL.rotation.x = -0.4; J.knL.rotation.x = 0.8;
        break;
      }
      case 'lsign': {
        const k = t * 8;
        J.shR.rotation.set(-2.6, 0, 0.3); J.elR.rotation.set(-1.4, 0, 0);
        J.handR.rotation.set(0, 0, 1.4);
        J.shL.rotation.set(-0.2, 0, -0.3);
        J.thL.rotation.x = -Math.max(0, S(k)) * 1.0; J.knL.rotation.x = Math.max(0, S(k)) * 1.3;
        J.thR.rotation.x = -Math.max(0, -S(k)) * 1.0; J.knR.rotation.x = Math.max(0, -S(k)) * 1.3;
        J.hips.position.y = b + Math.abs(S(k)) * 0.06;
        break;
      }
      case 'hype': {
        const k = t * 6;
        J.hips.position.y = b + Math.abs(S(k)) * 0.25;
        J.shL.rotation.set(-2.8 + S(k) * 0.3, 0, -0.3); J.shR.rotation.set(-2.8 - S(k) * 0.3, 0, 0.3);
        J.thL.rotation.x = -Math.abs(S(k)) * 0.5; J.knL.rotation.x = Math.abs(S(k)) * 0.9;
        J.thR.rotation.x = -Math.abs(S(k)) * 0.5; J.knR.rotation.x = Math.abs(S(k)) * 0.9;
        break;
      }
      case 'chair': {
        J.hips.position.y = 0.55; J.hips.position.z = -0.25;
        J.thL.rotation.x = -1.5; J.thR.rotation.x = -1.3; J.knL.rotation.x = 1.5; J.knR.rotation.x = 1.3;
        J.thR.rotation.z = 0.1;
        J.shL.rotation.set(-0.5, 0, -0.2); J.elL.rotation.x = -1.5; J.shR.rotation.set(-2.0, 0, 0.3); J.elR.rotation.x = -2.0;
        J.neck.rotation.x = 0.1 + S(t * 2) * 0.05; J.head.rotation.y = S(t) * 0.2;
        break;
      }
      case 'wavedance': {
        const k = t * 5;
        J.shL.rotation.set(-1.5, 0, -0.2 + S(k) * 0.4); J.elL.rotation.x = S(k + 1) * 0.6 - 0.3;
        J.shR.rotation.set(-1.5, 0, 0.2 + S(k + 0.8) * 0.4); J.elR.rotation.x = S(k + 1.8) * 0.6 - 0.3;
        J.hips.rotation.z = S(k) * 0.1; J.hips.position.x = S(k) * 0.08;
        J.chest.rotation.z = -S(k + 0.5) * 0.15;
        break;
      }
      case 'disco': {
        const k = t * 4;
        const up = Math.floor(t * 2) % 2;
        J.shR.rotation.set(up ? -0.5 : 0.3, 0, up ? 2.6 : 0.5); J.elR.rotation.x = 0;
        J.shL.rotation.set(0.2, 0, -0.3); J.elL.rotation.x = -1.0;
        J.hips.rotation.y = up ? 0.4 : -0.4;
        J.hips.position.y = b - Math.abs(S(k * 2)) * 0.06;
        J.thL.rotation.x = up ? -0.3 : 0; J.knL.rotation.x = up ? 0.5 : 0;
        break;
      }
      case 'pushups': {
        const k = S(t * 5);
        J.body.rotation.x = 1.35; J.body.position.y = 0.3 + k * 0.1; J.body.position.z = 0.3;
        J.shL.rotation.set(-1.4 - k * 0.3, 0, -0.3); J.shR.rotation.set(-1.4 - k * 0.3, 0, 0.3);
        J.elL.rotation.x = -0.4 - (1 - k) * 0.5; J.elR.rotation.x = -0.4 - (1 - k) * 0.5;
        J.neck.rotation.x = -1.0;
        break;
      }
      case 'flex': {
        const k = Math.min(1, t * 3);
        J.shL.rotation.set(0, 0, -1.4 * k); J.elL.rotation.set(0, 0, 0); J.elL.rotation.x = -1.9 * k;
        J.shR.rotation.set(0, 0, 1.4 * k); J.elR.rotation.x = -1.9 * k;
        J.shL.rotation.y = -1.4 * k; J.shR.rotation.y = 1.4 * k;
        J.chest.rotation.x = -0.1; J.neck.rotation.x = -0.2 + S(t * 6) * 0.05;
        J.hips.position.y = b - 0.08;
        J.thL.rotation.z = -0.2; J.thR.rotation.z = 0.2;
        break;
      }
      case 'laugh': {
        const k = S(t * 14);
        J.chest.rotation.x = 0.3 + k * 0.08; J.neck.rotation.x = -0.4;
        J.shL.rotation.set(-0.6, 0, -0.3); J.elL.rotation.x = -1.5;
        J.shR.rotation.set(-0.9, 0, 0.5); J.elR.rotation.x = -1.2;
        J.body.position.y = k * 0.02;
        break;
      }
      case 'orange': {
        const k = t * 6;
        const s = S(k);
        J.shL.rotation.set(s * 1.2 - 0.5, 0, -0.4); J.shR.rotation.set(-s * 1.2 - 0.5, 0, 0.4);
        J.elL.rotation.x = -0.4; J.elR.rotation.x = -0.4;
        J.thL.rotation.set(-0.3, 0, -0.3 - Math.abs(s) * 0.2); J.thR.rotation.set(-0.3, 0, 0.3 + Math.abs(s) * 0.2);
        J.knL.rotation.x = 0.8; J.knR.rotation.x = 0.8;
        J.hips.position.y = b - 0.2 + Math.abs(s) * 0.05;
        J.hips.rotation.y = s * 0.3;
        break;
      }
      case 'backflip': {
        const k = Math.min(1, t / 1.2);
        const h = S(k * Math.PI) * 1.2;
        J.body.position.y = h;
        J.body.rotation.x = -k * Math.PI * 2;
        J.thL.rotation.x = J.thR.rotation.x = -S(k * Math.PI) * 1.5;
        J.knL.rotation.x = J.knR.rotation.x = S(k * Math.PI) * 2.0;
        J.shL.rotation.set(-2.5 * S(k * Math.PI), 0, -0.4); J.shR.rotation.set(-2.5 * S(k * Math.PI), 0, 0.4);
        break;
      }
    }
  };

  // Retourne vrai si l'emote (non en boucle) est finie
  CH.emoteDone = function (c) {
    const a = c.anim;
    if (!a.emote) return true;
    const it = G.Cosmetics.items[a.emote];
    return it && !it.loop && a.emoteT > (it.dur || 2);
  };

  // Couleur représentative (effets d'élimination)
  CH.mainColor = function (c) { return (c.sk.top && c.sk.top.color) || 0x60c8ff; };
})();
