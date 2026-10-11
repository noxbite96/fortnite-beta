// ============================================================
//  Modèles 3D : armes, soins, munitions, matériaux + icônes
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const WM = { mats: {}, icons: {} };
  G.WModels = WM;

  function m(color, o) {
    const key = color + '_' + JSON.stringify(o || {});
    if (WM.mats[key]) return WM.mats[key];
    const mt = new THREE.MeshLambertMaterial({ color });
    if (o && o.emissive != null) { mt.emissive = new THREE.Color(o.emissive); mt.emissiveIntensity = o.ei || 1; }
    if (o && o.map) mt.map = o.map;
    if (o && o.transparent) { mt.transparent = true; mt.opacity = o.opacity; }
    WM.mats[key] = mt;
    return mt;
  }

  // Revêtements (motifs)
  const wrapTex = {};
  function wrapMaterial(style) {
    if (!style) return null;
    if (WM.mats['wrap_' + style]) return WM.mats['wrap_' + style];
    const c = G.Tex.canvas(128, 128), x = c.getContext('2d');
    let emissive = null;
    if (style === 'camo') { x.fillStyle = '#6a7a4a'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 30; i++) { x.fillStyle = U.pick(['#3a4a2a', '#8a8a5a', '#4a3a2a']); x.beginPath(); x.ellipse(Math.random() * 128, Math.random() * 128, 10 + Math.random() * 14, 6 + Math.random() * 8, Math.random() * 3, 0, 7); x.fill(); } }
    else if (style === 'zebra') { x.fillStyle = '#f4f4f4'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#111'; for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(i * 14, 0); x.bezierCurveTo(i * 14 + 20, 40, i * 14 - 10, 80, i * 14 + 8, 128); x.lineTo(i * 14 + 14, 128); x.bezierCurveTo(i * 14, 80, i * 14 + 26, 40, i * 14 + 6, 0); x.fill(); } }
    else if (style === 'lava') { x.fillStyle = '#1a0a08'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#ff6a10'; x.lineWidth = 3; x.shadowColor = '#ff4000'; x.shadowBlur = 8; for (let i = 0; i < 14; i++) { x.beginPath(); let px = Math.random() * 128, py = Math.random() * 128; x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (Math.random() - 0.5) * 40; py += (Math.random() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); } emissive = 0x401000; }
    else if (style === 'neon') { x.fillStyle = '#10101a'; x.fillRect(0, 0, 128, 128); const cs = ['#ff2ad8', '#2affea', '#faff2a']; x.lineWidth = 4; for (let i = 0; i < 8; i++) { x.strokeStyle = cs[i % 3]; x.beginPath(); x.moveTo(0, i * 16 + 8); x.lineTo(128, i * 16 + 8); x.stroke(); } emissive = 0x301040; }
    else if (style === 'rainbow') { const g = x.createLinearGradient(0, 0, 128, 128); ['#ff3a3a', '#ff9a2a', '#ffe03a', '#4ad04a', '#3a8aff', '#9a4aff'].forEach((c2, i) => g.addColorStop(i / 5, c2)); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
    else if (style === 'gold') { const g = x.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, '#e0a820'); g.addColorStop(1, '#fff0a0'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); emissive = 0x3a2a00; }
    else if (style === 'ice') { const g = x.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, '#e8f8ff'); g.addColorStop(1, '#7ac8f0'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 2; for (let i = 0; i < 12; i++) { x.beginPath(); let px = Math.random() * 128, py = Math.random() * 128; x.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (Math.random() - 0.5) * 50; py += (Math.random() - 0.5) * 50; x.lineTo(px, py); } x.stroke(); } emissive = 0x102840; }
    else if (style === 'galaxy') { const g = x.createRadialGradient(64, 64, 10, 64, 64, 90); g.addColorStop(0, '#6a2ad8'); g.addColorStop(0.5, '#2a1a6a'); g.addColorStop(1, '#0a0a24'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 70; i++) { x.fillStyle = U.pick(['#ffffff', '#c8b0ff', '#8ad8ff']); const r = Math.random() * 1.6 + 0.4; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, r, 0, 7); x.fill(); } emissive = 0x201040; }
    else if (style === 'diamond') { x.fillStyle = '#a0e8ff'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 40; i++) { x.fillStyle = U.pick(['#ffffff', '#6ad0ff', '#c8f4ff']); x.beginPath(); const px = Math.random() * 128, py = Math.random() * 128; x.moveTo(px, py - 8); x.lineTo(px + 6, py); x.lineTo(px, py + 8); x.lineTo(px - 6, py); x.fill(); } emissive = 0x104050; }
    const t = G.Tex.toTexture(c);
    const mt = new THREE.MeshLambertMaterial({ map: t });
    if (emissive) { mt.emissive = new THREE.Color(emissive); mt.emissiveIntensity = 1; }
    WM.mats['wrap_' + style] = mt;
    return mt;
  }

  // ------------------------------------------------------------
  //  Armes (avant = +Z, origine = poignée)
  // ------------------------------------------------------------
  // géométries partagées entre toutes les variantes (rareté / revêtement) d'une arme
  const GEO_CACHE = {};
  const sharedGeo = (k, make) => GEO_CACHE[k] || (GEO_CACHE[k] = make());
  const buildWeapon = function (id, rarity, wrapId) {
    const w = I.WEAPONS[id];
    const g = new THREE.Group();
    const rc = I.RARITY[rarity || 0].hex;
    const wrap = rarity === 5 ? wrapMaterial('gold') : wrapId ? wrapMaterial(G.Cosmetics.items[wrapId] && G.Cosmetics.items[wrapId].style) : null;
    const body = wrap || m(0x3a3d42), dark = m(0x1e2024), accent = m(rc, { emissive: rc, ei: rarity >= 3 ? 0.25 : 0.08 }), wood = wrap || m(0x8a5a32), metal = m(0x8a9098), light = m(0xc8ccd0);
    const box = (sx, sy, sz, mt, x, y, z, rx) => { const o = new THREE.Mesh(sharedGeo('b' + sx + ',' + sy + ',' + sz, () => new THREE.BoxGeometry(sx, sy, sz)), mt); o.position.set(x, y, z); if (rx) o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
    const cyl = (r, l, mt, x, y, z, seg) => { const o = new THREE.Mesh(sharedGeo('c' + r + ',' + l + ',' + (seg || 8), () => new THREE.CylinderGeometry(r, r, l, seg || 8)), mt); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    let muzzle = 0.6;
    switch (w ? w.model : id) {
      case 'ar':
        box(0.07, 0.11, 0.42, body, 0, 0.06, 0.12); box(0.075, 0.05, 0.3, accent, 0, 0.13, 0.12);
        cyl(0.018, 0.35, dark, 0, 0.08, 0.5); box(0.065, 0.07, 0.2, dark, 0, 0.04, 0.4);
        box(0.05, 0.16, 0.07, dark, 0, -0.06, 0.13, 0.25); box(0.045, 0.12, 0.05, body, 0, -0.04, 0.0, -0.3);
        box(0.06, 0.09, 0.22, body, 0, 0.05, -0.18); box(0.065, 0.13, 0.05, body, 0, 0.03, -0.28);
        box(0.035, 0.04, 0.14, dark, 0, 0.17, 0.12); cyl(0.025, 0.12, dark, 0, 0.18, 0.12, 8);
        muzzle = 0.68; break;
      case 'burst':
        box(0.075, 0.13, 0.55, body, 0, 0.06, 0.08); box(0.08, 0.05, 0.4, accent, 0, 0.15, 0.1);
        cyl(0.018, 0.2, dark, 0, 0.08, 0.45); box(0.05, 0.14, 0.07, dark, 0, -0.04, -0.12, 0.2);
        box(0.045, 0.12, 0.05, body, 0, -0.04, 0.05, -0.3); box(0.02, 0.06, 0.3, dark, 0, 0.18, 0.12);
        muzzle = 0.56; break;
      case 'pump':
        cyl(0.022, 0.62, dark, 0, 0.08, 0.38); cyl(0.02, 0.5, metal, 0, 0.04, 0.34);
        box(0.06, 0.1, 0.24, body, 0, 0.06, 0.02); box(0.07, 0.07, 0.16, wood, 0, 0.04, 0.34);
        box(0.055, 0.1, 0.3, wood, 0, 0.03, -0.24, 0.1); box(0.045, 0.1, 0.05, wood, 0, -0.04, -0.02, -0.3);
        box(0.062, 0.03, 0.2, accent, 0, 0.12, 0.02);
        muzzle = 0.7; break;
      case 'tactical':
        cyl(0.025, 0.5, dark, 0, 0.08, 0.32); box(0.07, 0.12, 0.3, body, 0, 0.06, 0.02);
        box(0.075, 0.05, 0.22, accent, 0, 0.14, 0.04); box(0.05, 0.08, 0.26, body, 0, 0.04, -0.22);
        box(0.045, 0.11, 0.05, dark, 0, -0.04, -0.02, -0.3); box(0.04, 0.12, 0.04, dark, 0, -0.02, 0.2);
        muzzle = 0.58; break;
      case 'smg':
        box(0.065, 0.1, 0.3, body, 0, 0.06, 0.08); box(0.07, 0.04, 0.2, accent, 0, 0.12, 0.08);
        cyl(0.017, 0.16, dark, 0, 0.07, 0.3); box(0.04, 0.2, 0.05, dark, 0, -0.08, 0.14);
        box(0.045, 0.11, 0.05, body, 0, -0.04, -0.02, -0.3); box(0.02, 0.05, 0.22, dark, 0, 0.06, -0.14);
        box(0.05, 0.08, 0.02, dark, 0, 0.06, -0.25);
        muzzle = 0.4; break;
      case 'sniper':
        cyl(0.02, 0.7, dark, 0, 0.08, 0.55); box(0.07, 0.11, 0.36, body, 0, 0.06, 0.1);
        box(0.075, 0.05, 0.3, accent, 0, 0.12, 0.1); cyl(0.04, 0.3, dark, 0, 0.19, 0.12, 12);
        cyl(0.048, 0.04, dark, 0, 0.19, 0.28, 12); cyl(0.045, 0.04, dark, 0, 0.19, -0.03, 12);
        box(0.06, 0.12, 0.34, wood, 0, 0.03, -0.28); box(0.045, 0.1, 0.05, wood, 0, -0.04, -0.02, -0.3);
        box(0.08, 0.02, 0.02, metal, 0.05, 0.08, 0.02); box(0.04, 0.12, 0.04, dark, 0, -0.05, 0.12);
        muzzle = 0.92; break;
      case 'semisniper':
        cyl(0.019, 0.55, dark, 0, 0.08, 0.48); box(0.07, 0.12, 0.4, body, 0, 0.06, 0.08);
        box(0.075, 0.05, 0.32, accent, 0, 0.13, 0.08); cyl(0.036, 0.26, dark, 0, 0.19, 0.1, 12);
        box(0.05, 0.16, 0.08, dark, 0, -0.07, 0.12); box(0.06, 0.1, 0.28, body, 0, 0.04, -0.26);
        box(0.045, 0.1, 0.05, dark, 0, -0.04, -0.03, -0.3); box(0.04, 0.03, 0.12, dark, 0, 0.14, 0.42);
        muzzle = 0.8; break;
      case 'hunting':
        cyl(0.018, 0.62, dark, 0, 0.08, 0.45); box(0.06, 0.1, 0.3, metal, 0, 0.06, 0.05);
        box(0.065, 0.09, 0.7, wood, 0, 0.02, 0.05); box(0.06, 0.12, 0.3, wood, 0, 0.0, -0.3, 0.12);
        box(0.02, 0.04, 0.02, accent, 0, 0.13, 0.72); box(0.05, 0.03, 0.04, dark, 0.04, 0.09, -0.02);
        muzzle = 0.78; break;
      case 'pistol':
        box(0.045, 0.06, 0.2, body, 0, 0.07, 0.07); box(0.047, 0.02, 0.18, accent, 0, 0.1, 0.07);
        box(0.042, 0.14, 0.06, dark, 0, -0.01, 0.0, -0.2); box(0.03, 0.02, 0.06, dark, 0, 0.02, 0.06);
        muzzle = 0.19; break;
      case 'flint':
        box(0.05, 0.06, 0.2, wood, 0, 0.06, 0.03); cyl(0.024, 0.36, metal, 0, 0.085, 0.28); cyl(0.034, 0.04, accent, 0, 0.085, 0.46);
        box(0.045, 0.15, 0.07, wood, 0, -0.03, -0.09, -0.55); box(0.02, 0.05, 0.03, dark, 0, 0.125, -0.02, 0.5); box(0.05, 0.03, 0.12, accent, 0, 0.035, 0.12);
        muzzle = 0.48; break;
      case 'revolver':
        box(0.045, 0.06, 0.12, body, 0, 0.07, 0.04); cyl(0.04, 0.08, metal, 0, 0.07, 0.1, 8); cyl(0.016, 0.22, dark, 0, 0.09, 0.24);
        box(0.042, 0.14, 0.06, wood, 0, -0.01, -0.02, -0.25); box(0.05, 0.02, 0.1, accent, 0, 0.11, 0.1);
        muzzle = 0.36; break;
      case 'rocket':
        cyl(0.075, 0.95, body, 0, 0.12, 0.15, 12); cyl(0.09, 0.12, accent, 0, 0.12, 0.62, 12); cyl(0.085, 0.1, accent, 0, 0.12, -0.32, 12);
        box(0.045, 0.14, 0.06, dark, 0, -0.02, 0.0, -0.2); box(0.045, 0.12, 0.05, dark, 0, -0.02, 0.25);
        box(0.03, 0.08, 0.1, dark, -0.09, 0.2, 0.25);
        muzzle = 0.68; break;
      case 'gl':
        cyl(0.05, 0.4, body, 0, 0.1, 0.3, 10); cyl(0.07, 0.14, dark, 0, 0.08, 0.08, 8);
        box(0.05, 0.1, 0.25, body, 0, 0.05, -0.18); box(0.045, 0.14, 0.06, dark, 0, -0.02, 0.0, -0.2); box(0.055, 0.04, 0.2, accent, 0, 0.16, 0.25);
        muzzle = 0.52; break;
      case 'minigun': {
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cyl(0.014, 0.7, dark, Math.cos(a) * 0.045, 0.1 + Math.sin(a) * 0.045, 0.45); }
        cyl(0.08, 0.1, accent, 0, 0.1, 0.72, 10); cyl(0.09, 0.3, body, 0, 0.1, 0.05, 10);
        box(0.12, 0.14, 0.2, body, 0, 0.02, -0.15); box(0.045, 0.14, 0.06, dark, 0, -0.1, -0.05, -0.2); box(0.03, 0.18, 0.03, dark, 0, 0.22, 0.05);
        g.userData.minigun = true;
        muzzle = 0.82; break;
      }
      case 'flamethrower': {
        cyl(0.07, 0.42, m(0xd83030), 0, 0.02, -0.12, 12); cyl(0.075, 0.04, dark, 0, 0.02, 0.1, 12); cyl(0.075, 0.04, dark, 0, 0.02, -0.34, 12);
        box(0.06, 0.08, 0.5, body, 0, 0.12, 0.25); cyl(0.028, 0.45, dark, 0, 0.12, 0.62, 8); cyl(0.045, 0.08, metal, 0, 0.12, 0.86, 8);
        box(0.04, 0.12, 0.05, dark, 0, -0.02, 0.2, -0.3); box(0.05, 0.03, 0.2, accent, 0, 0.17, 0.25);
        const pl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshBasicMaterial({ color: 0x40a0ff, toneMapped: false })); pl.position.set(0, 0.12, 0.92); g.add(pl);
        muzzle = 0.92; break;
      }
      case 'saber': {
        // poignée + lame d'énergie (le long de -Z : pointe vers le haut dans la main)
        cyl(0.03, 0.26, m(0x3a3d42), 0, 0, 0.02, 10); cyl(0.036, 0.05, m(0xb0b8c0), 0, 0, -0.12, 10); cyl(0.034, 0.04, m(0x1e2024), 0, 0, 0.14, 10);
        box(0.02, 0.05, 0.08, accent, 0.03, 0, 0.0);
        const bc = I.RARITY[rarity || 2].hex;
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 1.05, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
        core.rotation.x = Math.PI / 2; core.position.z = -0.66; g.add(core);
        const glowB = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.1, 10), new THREE.MeshBasicMaterial({ color: bc, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        glowB.rotation.x = Math.PI / 2; glowB.position.z = -0.66; g.add(glowB);
        g.userData.saber = true;
        muzzle = 0.2; break;
      }
      case 'bow': {
        // branches courbes (avant = +Z), corde et flèche encochée animées par WM.bowPose
        const limbMat = wrap || m(w.boom ? 0x4a3a3a : 0x7a4a24);
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.56, -0.03), new THREE.Vector3(0, -0.36, 0.09), new THREE.Vector3(0, -0.12, 0.13), new THREE.Vector3(0, 0.12, 0.13), new THREE.Vector3(0, 0.36, 0.09), new THREE.Vector3(0, 0.56, -0.03)]);
        const limb = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.022, 6, false), limbMat); limb.castShadow = true; g.add(limb);
        box(0.05, 0.16, 0.06, dark, 0, 0, 0.12);
        box(0.056, 0.05, 0.065, accent, 0, 0.11, 0.12); box(0.056, 0.05, 0.065, accent, 0, -0.11, 0.12);
        box(0.04, 0.06, 0.04, accent, 0, 0.55, -0.03); box(0.04, 0.06, 0.04, accent, 0, -0.55, -0.03);
        const sm = m(0xf0f0e0);
        for (const nm of ['str1', 'str2']) { const sgeo = new THREE.CylinderGeometry(0.005, 0.005, 1, 4); sgeo.translate(0, 0.5, 0); const s = new THREE.Mesh(sgeo, sm); s.name = nm; g.add(s); }
        const ar = new THREE.Group(); ar.name = 'nock';
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.72, 5), m(0xd8c090)); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.36; ar.add(shaft);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 6), w.boom ? m(0xff4a2a, { emissive: 0xff2a00, ei: 0.9 }) : m(0x9aa0a8)); tip.rotation.x = Math.PI / 2; tip.position.z = 0.75; ar.add(tip);
        const fl = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.05, 0.1), m(0xe04040)); fl.position.z = 0.06; ar.add(fl);
        ar.visible = false; g.add(ar);
        g.userData.bow = true;
        muzzle = 0.3; break;
      }
      default: box(0.1, 0.1, 0.3, body, 0, 0, 0.1);
    }
    // lunette (fusil d'assaut à lunette)
    if (w && w.scopeModel) { cyl(0.035, 0.26, dark, 0, 0.21, 0.12, 10); cyl(0.045, 0.04, dark, 0, 0.21, 0.26, 10); cyl(0.045, 0.04, dark, 0, 0.21, -0.02, 10); box(0.02, 0.05, 0.04, dark, 0, 0.17, 0.05); box(0.02, 0.05, 0.04, dark, 0, 0.17, 0.2); }
    // silencieux
    if (w && w.suppressed) { cyl(0.03, 0.18, dark, 0, 0.07, muzzle + 0.08, 10); muzzle += 0.17; }
    g.userData.muzzle = muzzle;
    if (g.userData.bow) WM.bowPose(g, 0);
    return g;
  };
  // Tension de la corde (k de 0 à 1) : la corde recule et une flèche apparaît
  const _bt = new THREE.Vector3(), _bn = new THREE.Vector3(), _bup = new THREE.Vector3(0, 1, 0);
  WM.bowPose = function (g, k) {
    if (!g || !g.userData.bow) return;
    const pull = 0.03 + 0.36 * k;
    _bn.set(0, 0, -pull);
    ['str1', 'str2'].forEach((nm, i) => {
      const s = g.getObjectByName(nm); if (!s) return;
      _bt.set(0, i ? -0.56 : 0.56, -0.03);
      s.position.copy(_bt);
      const d = _bn.clone().sub(_bt); const len = d.length();
      s.quaternion.setFromUnitVectors(_bup, d.normalize());
      s.scale.set(1, len, 1);
    });
    const ar = g.getObjectByName('nock');
    if (ar) { ar.visible = k > 0.02; ar.position.set(0, 0, -pull); }
  };

  // ------------------------------------------------------------
  //  Consommables / munitions / matériaux
  // ------------------------------------------------------------
  let crossTex = null;
  function medTex() {
    if (crossTex) return crossTex;
    const c = G.Tex.canvas(64, 64), x = c.getContext('2d');
    x.fillStyle = '#f4f4f4'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#e02020'; x.fillRect(24, 10, 16, 44); x.fillRect(10, 24, 44, 16);
    crossTex = G.Tex.toTexture(c, { clamp: true });
    return crossTex;
  }
  const buildConsumable = function (id) {
    const g = new THREE.Group();
    const add = (geo, mt, x, y, z) => { const o = new THREE.Mesh(geo, mt); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; g.add(o); return o; };
    switch (id) {
      case 'bandage': add(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 12), m(0xf4f0e8), 0, 0.07, 0).rotation.z = Math.PI / 2; add(new THREE.BoxGeometry(0.12, 0.02, 0.18), m(0xf4f0e8), 0.02, 0.01, 0.1); break;
      case 'medkit': add(new THREE.BoxGeometry(0.34, 0.2, 0.24), m(0xffffff, { map: medTex() }), 0, 0.1, 0); add(new THREE.BoxGeometry(0.12, 0.04, 0.03), m(0x3a3a3a), 0, 0.22, 0); break;
      case 'smallshield': add(new THREE.SphereGeometry(0.08, 10, 8), m(0x3aa8ff, { emissive: 0x1a6aff, ei: 0.6 }), 0, 0.08, 0); add(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8), m(0xd0e8ff), 0, 0.18, 0); add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), m(0x5a3a2a), 0, 0.23, 0); break;
      case 'shieldpot': add(new THREE.CylinderGeometry(0.1, 0.12, 0.24, 10), m(0x3aa8ff, { emissive: 0x1a6aff, ei: 0.6 }), 0, 0.12, 0); add(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), m(0xd0e8ff), 0, 0.28, 0); add(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8), m(0x3a3a3a), 0, 0.33, 0); break;
      case 'slurp': add(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 12), m(0x9a5aff, { emissive: 0x5a20c0, ei: 0.5 }), 0, 0.14, 0); add(new THREE.TorusGeometry(0.1, 0.015, 6, 14), m(0x30e0c0), 0, 0.08, 0).rotation.x = Math.PI / 2; add(new THREE.TorusGeometry(0.1, 0.015, 6, 14), m(0x30e0c0), 0, 0.2, 0).rotation.x = Math.PI / 2; break;
      case 'chug': add(new THREE.SphereGeometry(0.16, 12, 10), m(0x2a7aff, { emissive: 0x1040a0, ei: 0.5 }), 0, 0.16, 0); add(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), m(0xf0c030), 0, 0.34, 0); add(new THREE.TorusGeometry(0.08, 0.02, 6, 10), m(0xf0c030), 0.16, 0.2, 0).rotation.y = Math.PI / 2; break;
      case 'cozyfire': { for (let i = 0; i < 4; i++) { const lg = add(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), m(0x7a5030), Math.cos(i * 1.57) * 0.06, 0.05, Math.sin(i * 1.57) * 0.06); lg.rotation.z = 1.25; lg.rotation.y = i * 1.57; } add(new THREE.ConeGeometry(0.07, 0.16, 6), m(0xff8a20, { emissive: 0xff5a00, ei: 1 }), 0, 0.12, 0); break; }
      case 'stink': add(new THREE.SphereGeometry(0.075, 10, 8), m(0x6aa82a, { emissive: 0x2a5a0a, ei: 0.4 }), 0, 0.075, 0); add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6), m(0x3a3a3a), 0, 0.16, 0); for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.02, 6, 5), m(0xc8ff6a, { emissive: 0x6aa82a, ei: 0.6 }), Math.cos(i * 2.1) * 0.07, 0.1, Math.sin(i * 2.1) * 0.07); break;
      case 'smokegren': add(new THREE.CylinderGeometry(0.055, 0.055, 0.17, 10), m(0x8a9098), 0, 0.085, 0); add(new THREE.CylinderGeometry(0.057, 0.057, 0.04, 10), m(0xe0e0e0), 0, 0.12, 0); add(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 6), m(0x3a3a3a), 0, 0.19, 0); break;
      case 'grenade': add(new THREE.SphereGeometry(0.07, 10, 8), m(0x4a5a3a), 0, 0.07, 0); add(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 6), m(0x8a8a8a), 0, 0.15, 0); add(new THREE.TorusGeometry(0.025, 0.006, 4, 8), m(0xc0c0c0), 0.03, 0.16, 0); break;
      case 'boogie': add(new THREE.SphereGeometry(0.08, 12, 10), m(0xff5ad0, { emissive: 0xa02080, ei: 0.5 }), 0, 0.08, 0); for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.03, 0.03, 0.03), m(0xffffff, { emissive: 0xffffff, ei: 0.5 }), Math.cos(i) * 0.08, 0.08 + Math.sin(i * 2) * 0.05, Math.sin(i) * 0.08); break;
      case 'launchpad': add(new THREE.BoxGeometry(0.4, 0.08, 0.4), m(0x3a3a3a), 0, 0.04, 0); add(new THREE.BoxGeometry(0.34, 0.03, 0.34), m(0xe0a020, { emissive: 0x6a4000, ei: 0.3 }), 0, 0.1, 0); break;
      case 'spiketrap': add(new THREE.BoxGeometry(0.4, 0.05, 0.4), m(0x5a5a60), 0, 0.03, 0); for (let i = 0; i < 9; i++) add(new THREE.ConeGeometry(0.025, 0.12, 4), m(0xd0d0d0), -0.12 + (i % 3) * 0.12, 0.11, -0.12 + Math.floor(i / 3) * 0.12); break;
      case 'grappler': { add(new THREE.BoxGeometry(0.08, 0.12, 0.3), m(0x3a3a3a), 0, 0.08, 0.05); add(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), m(0xd83030), 0, 0.1, -0.1).rotation.x = Math.PI / 2; const h = add(new THREE.ConeGeometry(0.05, 0.14, 6), m(0xc0c0c0), 0, 0.1, 0.25); h.rotation.x = Math.PI / 2; add(new THREE.BoxGeometry(0.04, 0.1, 0.05), m(0x2a2a2a), 0, -0.02, 0); break; }
      case 'rift': { add(new THREE.SphereGeometry(0.12, 12, 10), m(0x8a4aff, { emissive: 0x6a20ff, ei: 1.2 }), 0, 0.12, 0); add(new THREE.TorusGeometry(0.16, 0.02, 6, 16), m(0xd0b0ff, { emissive: 0x8a50ff, ei: 1 }), 0, 0.12, 0); break; }
      case 'portafort': { add(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 10), m(0xa0a8b0), 0, 0.1, 0); add(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 10), m(0xd83030), 0, 0.12, 0); add(new THREE.BoxGeometry(0.03, 0.06, 0.03), m(0x3a3a3a), 0, 0.23, 0); break; }
      case 'meat': { const mm = add(new THREE.SphereGeometry(0.1, 8, 6), m(0xa04a2a), 0, 0.1, 0.03); mm.scale.set(1, 0.8, 1.3); add(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), m(0xf0e8d8), 0, 0.1, -0.12).rotation.x = Math.PI / 2; add(new THREE.SphereGeometry(0.035, 6, 5), m(0xf0e8d8), 0, 0.1, -0.2); break; }
      case 'scanner': { add(new THREE.BoxGeometry(0.16, 0.24, 0.08), m(0x2a2e38), 0, 0.12, 0); add(new THREE.BoxGeometry(0.12, 0.1, 0.01), m(0x30e0ff, { emissive: 0x30e0ff, ei: 1 }), 0, 0.16, 0.045); add(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), m(0x8a9098), 0.05, 0.3, 0); add(new THREE.SphereGeometry(0.02, 6, 5), m(0xff3030, { emissive: 0xff2020, ei: 1 }), 0.05, 0.38, 0); break; }
      case 'jetpack': { for (const s of [-0.07, 0.07]) { add(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10), m(0xd8dce0), s, 0.2, 0); add(new THREE.ConeGeometry(0.06, 0.08, 10), m(0xd83030), s, 0.39, 0); add(new THREE.CylinderGeometry(0.035, 0.05, 0.06, 8), m(0x2a2a2a), s, 0.03, 0); } add(new THREE.BoxGeometry(0.1, 0.18, 0.06), m(0x3a3a44), 0, 0.2, -0.05); break; }
      case 'balloons': { [[0xff4a5a, -0.07, 0.34], [0x4ab0ff, 0.07, 0.38], [0xffd23a, 0, 0.44]].forEach((q) => { add(new THREE.SphereGeometry(0.075, 10, 8), m(q[0], { emissive: q[0], ei: 0.15 }), q[1], q[2], 0).scale.y = 1.2; add(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 3), m(0xffffff), q[1] * 0.5, q[2] - 0.2, 0); }); break; }
      case 'treasuremap': { add(new THREE.BoxGeometry(0.32, 0.015, 0.24), m(0xe8d2a0), 0, 0.03, 0); for (const r of [0.8, -0.8]) { const x = add(new THREE.BoxGeometry(0.12, 0.018, 0.025), m(0xd02020), 0.04, 0.04, 0.02); x.rotation.y = r; } add(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 8), m(0xc8a870), -0.16, 0.04, 0).rotation.x = Math.PI / 2; add(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 8), m(0xc8a870), 0.16, 0.04, 0).rotation.x = Math.PI / 2; for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.03, 0.017, 0.01), m(0x6a4a2a), -0.1 + i * 0.03, 0.04, -0.06 + i * 0.02); break; }
      case 'keycard': { add(new THREE.BoxGeometry(0.3, 0.02, 0.2), m(0xffd84a, { emissive: 0x806000, ei: 0.8 }), 0, 0.05, 0); add(new THREE.BoxGeometry(0.08, 0.025, 0.06), m(0x2a2a2a), -0.08, 0.06, 0.05); add(new THREE.BoxGeometry(0.22, 0.026, 0.02), m(0x6a3aa0), 0.02, 0.06, -0.06); break; }
      case 'hoprock': { const cr = add(new THREE.OctahedronGeometry(0.12, 0), m(0x8a4aff, { emissive: 0x6a20ff, ei: 1.0 }), 0, 0.14, 0); cr.scale.set(0.8, 1.3, 0.8); add(new THREE.OctahedronGeometry(0.06, 0), m(0xb88aff, { emissive: 0x7a40ff, ei: 1.0 }), 0.09, 0.07, 0.03); break; }
      case 'impulse': { add(new THREE.SphereGeometry(0.075, 12, 10), m(0x2a7aff, { emissive: 0x1a4aff, ei: 0.8 }), 0, 0.08, 0); add(new THREE.TorusGeometry(0.08, 0.012, 6, 16), m(0xd0e8ff), 0, 0.08, 0).rotation.x = Math.PI / 2; add(new THREE.TorusGeometry(0.08, 0.012, 6, 16), m(0xd0e8ff), 0, 0.08, 0); break; }
      case 'chugsplash': { add(new THREE.SphereGeometry(0.08, 10, 8), m(0x30a8ff, { emissive: 0x1060c0, ei: 0.6 }), 0, 0.08, 0); add(new THREE.CylinderGeometry(0.025, 0.03, 0.07, 8), m(0xf0c030), 0, 0.18, 0); add(new THREE.SphereGeometry(0.03, 8, 6), m(0x30e060, { emissive: 0x106020, ei: 0.5 }), 0.05, 0.12, 0.05); break; }
      case 'bubble': { add(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 14), m(0x5a6470), 0, 0.04, 0); add(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m(0x80e8ff, { emissive: 0x2080c0, ei: 0.9 }), 0, 0.08, 0); break; }
      case 'fishingrod': { const r = add(new THREE.CylinderGeometry(0.012, 0.022, 1.6, 6), m(0x3a2a1a), 0, 0.1, 0.7); r.rotation.x = Math.PI / 2 - 0.35; add(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), m(0x8a5a2a), 0, 0, 0).rotation.x = Math.PI / 2; add(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), m(0xc8c8c8), 0.05, -0.02, 0.08).rotation.z = Math.PI / 2; add(new THREE.SphereGeometry(0.03, 6, 5), m(0xe02020), 0, 0.37, 1.43); break; }
      case 'flopper': case 'slurpfish': {
        const col = id === 'flopper' ? 0x3a8ad8 : 0x30d0c0;
        const b = add(new THREE.SphereGeometry(0.12, 10, 8), m(col, { emissive: id === 'slurpfish' ? 0x106060 : 0x000000, ei: 0.5 }), 0, 0.1, 0); b.scale.set(0.7, 0.8, 1.5);
        const tl = add(new THREE.ConeGeometry(0.09, 0.14, 4), m(col), 0, 0.1, -0.22); tl.rotation.x = -Math.PI / 2; tl.scale.set(0.3, 1, 1);
        add(new THREE.SphereGeometry(0.022, 6, 5), m(0xffffff), 0.06, 0.14, 0.12); add(new THREE.SphereGeometry(0.022, 6, 5), m(0xffffff), -0.06, 0.14, 0.12);
        add(new THREE.SphereGeometry(0.012, 6, 5), m(0x111111), 0.075, 0.145, 0.13); add(new THREE.SphereGeometry(0.012, 6, 5), m(0x111111), -0.075, 0.145, 0.13);
        if (id === 'slurpfish') add(new THREE.TorusGeometry(0.1, 0.012, 5, 12), m(0x9a5aff, { emissive: 0x5a20c0, ei: 0.6 }), 0, 0.1, 0).rotation.y = Math.PI / 2;
        break; }
      default: add(new THREE.BoxGeometry(0.2, 0.2, 0.2), m(0xff00ff), 0, 0.1, 0);
    }
    return g;
  };
  const buildAmmoBox = function (type) {
    const g = new THREE.Group();
    const a = I.AMMO[type];
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), m(0x4a5a3a)); b.position.y = 0.08; b.castShadow = true; g.add(b);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.23), m(a ? a.hex : 0xffffff, { emissive: a ? a.hex : 0xffffff, ei: 0.3 })); l.position.y = 0.12; g.add(l);
    return g;
  };
  const buildMaterial = function (type) {
    const g = new THREE.Group();
    if (type === 'wood') for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.12), m(0xb8824a)); p.position.set(0, 0.03 + i * 0.065, (i - 1) * 0.05); p.rotation.y = (i - 1) * 0.3; p.castShadow = true; g.add(p); }
    else if (type === 'stone') for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.14), m(0x9a9690)); p.position.set((i % 2 - 0.5) * 0.23, 0.05 + Math.floor(i / 2) * 0.1, 0); p.castShadow = true; g.add(p); }
    else if (type === 'gold') {
      const bar = new THREE.CylinderGeometry(0.1, 0.14, 0.07, 4, 1); bar.rotateY(Math.PI / 4); bar.scale(1.9, 1, 0.9);
      const gm = m(0xffc22a, { emissive: 0xa06a00, ei: 0.45 });
      [[-0.13, 0.035, 0], [0.13, 0.035, 0], [0, 0.105, 0]].forEach((q, i) => { const p = new THREE.Mesh(bar, gm); p.position.set(q[0], q[1], q[2]); p.rotation.y = i * 0.1; p.castShadow = true; g.add(p); });
      g.scale.setScalar(1.4);
    }
    else for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.3), m(0xb0b8c0)); p.position.set(0, 0.02 + i * 0.035, 0); p.rotation.y = i * 0.2; p.castShadow = true; g.add(p); }
    return g;
  };
  // Modèles mis en cache : on renvoie un clone qui partage géométries et matériaux
  const tpl = {};
  function cachedClone(key, build) {
    if (!tpl[key]) tpl[key] = build();
    const c = tpl[key].clone(true);
    return c;
  }
  WM.weapon = (id, rarity, wrapId) => cachedClone('w:' + id + ':' + rarity + ':' + (wrapId || ''), () => buildWeapon(id, rarity, wrapId));
  WM.consumable = (id) => cachedClone('c:' + id, () => buildConsumable(id));
  WM.ammoBox = (type) => cachedClone('a:' + type, () => buildAmmoBox(type));
  WM.material = (type) => cachedClone('m:' + type, () => buildMaterial(type));
  WM.forItem = function (it, wrap) {
    if (I.WEAPONS[it.id]) return WM.weapon(it.id, it.rarity, wrap);
    return WM.consumable(it.id);
  };

  // ------------------------------------------------------------
  //  Icônes (rendu hors écran -> dataURL)
  // ------------------------------------------------------------
  let iconR = null, iconScene = null, iconCam = null;
  function iconSetup() {
    if (iconR) return;
    iconR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    iconR.setSize(128, 128);
    iconR.outputColorSpace = THREE.SRGBColorSpace;
    iconScene = new THREE.Scene();
    iconScene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 2.2));
    const d = new THREE.DirectionalLight(0xffffff, 2.5); d.position.set(2, 3, 4); iconScene.add(d);
    iconCam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  }
  WM.renderIcon = function (obj, key, opts) {
    if (key && WM.icons[key]) return WM.icons[key];
    iconSetup();
    opts = opts || {};
    const holder = new THREE.Group();
    holder.add(obj);
    iconScene.add(holder);
    // cadrage automatique
    const box = opts.box || new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    holder.rotation.set(opts.rx != null ? opts.rx : 0.25, opts.ry != null ? opts.ry : -1.2, opts.rz || 0);
    const r = Math.max(size.x, size.y, size.z) * 0.62;
    iconCam.position.set(0, 0, r / Math.tan(15 * Math.PI / 180) * (opts.zoom || 1));
    iconCam.lookAt(0, 0, 0);
    iconR.setClearColor(0x000000, 0);
    iconR.render(iconScene, iconCam);
    const url = iconR.domElement.toDataURL();
    iconScene.remove(holder);
    if (key) WM.icons[key] = url;
    return url;
  };
  WM.itemIcon = function (it) {
    const key = 'it_' + it.id + '_' + (I.WEAPONS[it.id] ? it.rarity : '');
    if (WM.icons[key]) return WM.icons[key];
    const obj = WM.forItem(it);
    return WM.renderIcon(obj, key, I.WEAPONS[it.id] ? { ry: -Math.PI / 2, rx: 0.1 } : { ry: -0.5, rx: 0.4 });
  };
})();
