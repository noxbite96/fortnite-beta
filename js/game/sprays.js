// ============================================================
//  Tags (graffitis) : textures dessinées par le code + pose en jeu
// ============================================================
(function () {
  const U = G.U;
  const SP = { list: [], tex: {}, max: 14 };
  G.Sprays = SP;

  function drip(x, px, py, col, n) {
    x.fillStyle = col;
    for (let i = 0; i < n; i++) { const dx = px + (Math.random() - 0.5) * 120, len = 10 + Math.random() * 30; x.fillRect(dx, py, 3, len); x.beginPath(); x.arc(dx + 1.5, py + len, 3, 0, 7); x.fill(); }
  }
  function outlinedText(x, txt, cx, cy, size, fill, stroke) {
    x.font = `900 ${size}px Impact, "Arial Black", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = size * 0.18; x.strokeStyle = stroke; x.lineJoin = 'round'; x.strokeText(txt, cx, cy);
    x.fillStyle = fill; x.fillText(txt, cx, cy);
  }
  const DRAW = {
    gg(x) { outlinedText(x, 'GG', 128, 120, 130, '#ffd83a', '#1a1a1a'); drip(x, 128, 170, '#ffd83a', 5); },
    smiley(x) { x.fillStyle = '#ffd83a'; x.strokeStyle = '#1a1a1a'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 90, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#1a1a1a'; x.beginPath(); x.ellipse(95, 105, 12, 20, 0, 0, 7); x.ellipse(161, 105, 12, 20, 0, 0, 7); x.fill(); x.beginPath(); x.lineWidth = 10; x.arc(128, 135, 50, 0.2, Math.PI - 0.2); x.stroke(); drip(x, 128, 210, '#ffd83a', 3); },
    lama(x) { x.fillStyle = '#b06aff'; x.strokeStyle = '#1a1a1a'; x.lineWidth = 8; x.beginPath(); x.roundRect(70, 110, 120, 70, 20); x.fill(); x.stroke(); x.beginPath(); x.roundRect(150, 40, 40, 90, 14); x.fill(); x.stroke(); x.beginPath(); x.roundRect(150, 30, 60, 40, 14); x.fill(); x.stroke(); for (const lx of [80, 110, 150, 175]) { x.fillRect(lx, 175, 14, 40); x.strokeRect(lx, 175, 14, 40); } x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(195, 45, 5, 0, 7); x.fill(); x.fillStyle = '#ff5aa0'; x.fillRect(75, 125, 110, 12); x.fillStyle = '#40d0ff'; x.fillRect(75, 145, 110, 12); },
    dixh(x) { outlinedText(x, 'BÊTA', 128, 110, 90, '#40d0ff', '#0a1a3a'); x.font = '900 28px Impact'; x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.fillText('BUILD', 128, 190); drip(x, 128, 165, '#40d0ff', 4); },
    coeur(x) { x.fillStyle = '#ff3a6a'; x.strokeStyle = '#1a1a1a'; x.lineWidth = 10; x.beginPath(); x.moveTo(128, 210); x.bezierCurveTo(20, 140, 40, 40, 128, 85); x.bezierCurveTo(216, 40, 236, 140, 128, 210); x.fill(); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.ellipse(88, 95, 16, 10, -0.6, 0, 7); x.fill(); },
    couronne(x) { x.fillStyle = '#ffcf3a'; x.strokeStyle = '#1a1a1a'; x.lineWidth = 9; x.beginPath(); x.moveTo(40, 180); x.lineTo(40, 80); x.lineTo(85, 130); x.lineTo(128, 60); x.lineTo(171, 130); x.lineTo(216, 80); x.lineTo(216, 180); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#e02a4a'; for (const cx of [85, 128, 171]) { x.beginPath(); x.arc(cx, 160, 11, 0, 7); x.fill(); } outlinedText(x, '#1', 128, 225, 40, '#ffffff', '#1a1a1a'); },
    flamme(x) { const g = x.createLinearGradient(0, 40, 0, 220); g.addColorStop(0, '#ffe040'); g.addColorStop(1, '#ff3a10'); x.fillStyle = g; x.strokeStyle = '#1a1a1a'; x.lineWidth = 8; x.beginPath(); x.moveTo(128, 30); x.bezierCurveTo(200, 110, 210, 160, 180, 200); x.bezierCurveTo(160, 230, 96, 230, 76, 200); x.bezierCurveTo(46, 160, 70, 120, 100, 90); x.bezierCurveTo(100, 130, 120, 140, 128, 120); x.bezierCurveTo(140, 90, 120, 60, 128, 30); x.fill(); x.stroke(); },
    bus(x) { x.fillStyle = '#3a8ad8'; x.strokeStyle = '#1a1a1a'; x.lineWidth = 8; x.beginPath(); x.arc(128, 70, 50, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#ffffff'; x.fillRect(118, 20, 20, 100); x.fillStyle = '#3a8ad8'; x.beginPath(); x.roundRect(50, 130, 156, 70, 12); x.fill(); x.stroke(); x.fillStyle = '#bfe6ff'; for (let i = 0; i < 4; i++) x.fillRect(62 + i * 36, 142, 26, 22); x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(85, 205, 14, 0, 7); x.arc(170, 205, 14, 0, 7); x.fill(); x.strokeStyle = '#1a1a1a'; x.lineWidth = 3; x.beginPath(); x.moveTo(100, 110); x.lineTo(90, 130); x.moveTo(156, 110); x.lineTo(166, 130); x.stroke(); },
  };
  SP.canvas = function (id) {
    const it = G.Cosmetics.items[id];
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    if (it && DRAW[it.draw]) DRAW[it.draw](x);
    return c;
  };
  SP.texture = function (id) {
    if (!SP.tex[id]) { const t = new THREE.CanvasTexture(SP.canvas(id)); t.colorSpace = THREE.SRGBColorSpace; SP.tex[id] = t; }
    return SP.tex[id];
  };

  const _n = new THREE.Vector3();
  SP.place = function (a) {
    const id = a.isPlayer ? G.Store.data.equipped.spray : U.pick(G.Cosmetics.byCat('spray')).id;
    if (!id || !G.Cosmetics.items[id]) return false;
    let o, d;
    if (a.isPlayer) { const r = a.aimRay(); o = r.o; d = r.d; }
    else { const e = a.eyePos(); o = e; d = new THREE.Vector3(-Math.sin(a.yaw), -0.15, -Math.cos(a.yaw)).normalize(); }
    const h = G.Phys.raycast(o.x, o.y, o.z, d.x, d.y, d.z, (a.isPlayer ? a.camDistNow || 3 : 0) + 5, { mask: 3 });
    if (!h) { if (a.isPlayer) { G.HUD.notify('Rapprochez-vous d\'un mur ou du sol', 1.2); } return false; }
    _n.set(h.nx, h.ny, h.nz);
    const mat = new THREE.MeshBasicMaterial({ map: SP.texture(id), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, toneMapped: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(U.geo('PlaneGeometry', 1.7, 1.7), mat);
    m.position.set(h.x + _n.x * 0.03, h.y + _n.y * 0.03, h.z + _n.z * 0.03);
    m.lookAt(h.x + _n.x, h.y + _n.y, h.z + _n.z);
    if (Math.abs(_n.y) > 0.7) m.rotateZ(-a.yaw + Math.PI);
    m.renderOrder = 2;
    G.scene.add(m);
    SP.list.push(m);
    while (SP.list.length > SP.max) { const old = SP.list.shift(); G.scene.remove(old); old.material.dispose(); }
    G.Audio.play('spray', { pos: a.isPlayer ? null : [h.x, h.y, h.z] });
    for (let i = 0; i < 12; i++) G.FX.smoke.spawn(h.x + _n.x * 0.3, h.y + _n.y * 0.3, h.z + _n.z * 0.3, _n.x + U.rand(-0.5, 0.5), _n.y + U.rand(-0.3, 0.5), _n.z + U.rand(-0.5, 0.5), 0.8, 0.8, 0.85, 0.5, 0.6, 0, 2, 1.5);
    return true;
  };
  SP.clear = function () { for (const m of SP.list) { G.scene.remove(m); m.material.dispose(); } SP.list.length = 0; };
})();
