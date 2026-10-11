// ============================================================
//  Bus de combat : modèle, trajet, saut
// ============================================================
(function () {
  const U = G.U;
  const BUS = { active: false, pos: new THREE.Vector3(), dir: new THREE.Vector3(1, 0, 0), t: 0, speed: 36, height: 240, doorsOpen: false, len: 1500 };
  G.Bus = BUS;

  function mat(c, e) { const m = new THREE.MeshLambertMaterial({ color: c }); if (e) { m.emissive = new THREE.Color(e); m.emissiveIntensity = 1; } return m; }

  BUS.build = function (scene) {
    const g = new THREE.Group();
    const blue = mat(0x2a7ad8), dark = mat(0x1a1a22), win = mat(0x9ad8ff, 0x204060), white = mat(0xf0f0f0), yellow = mat(0xf0c030), red = mat(0xd83030);
    const add = (geo, m, x, y, z, rx, ry, rz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; g.add(o); return o; };
    // carrosserie (long selon X)
    add(new THREE.BoxGeometry(11, 3.2, 3.4), blue, 0, 1.6, 0);
    add(new THREE.BoxGeometry(11.1, 0.5, 3.5), white, 0, 3.0, 0);
    add(new THREE.BoxGeometry(11.1, 0.35, 3.5), yellow, 0, 0.9, 0);
    for (let i = 0; i < 7; i++) { add(new THREE.BoxGeometry(1.1, 1.1, 0.05), win, -4.4 + i * 1.45, 2.1, 1.73); add(new THREE.BoxGeometry(1.1, 1.1, 0.05), win, -4.4 + i * 1.45, 2.1, -1.73); }
    add(new THREE.BoxGeometry(0.05, 1.3, 2.8), win, 5.53, 2.1, 0);
    add(new THREE.BoxGeometry(0.1, 0.6, 2.6), dark, 5.55, 0.8, 0);
    add(new THREE.BoxGeometry(0.1, 0.25, 0.5), mat(0xffffc0, 0xffffa0), 5.56, 1.1, 1.2); add(new THREE.BoxGeometry(0.1, 0.25, 0.5), mat(0xffffc0, 0xffffa0), 5.56, 1.1, -1.2);
    // roues
    for (const x of [-3.5, 3.5]) for (const z of [-1.6, 1.6]) add(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 14), dark, x, 0.3, z, Math.PI / 2);
    // porte arrière
    add(new THREE.BoxGeometry(0.05, 2.2, 1.6), mat(0x1a4a90), -5.53, 1.6, 0);
    // réacteurs
    for (const z of [-1.9, 1.9]) {
      add(new THREE.CylinderGeometry(0.45, 0.35, 1.8, 10), white, -4.2, 2.2, z * 1.15, 0, 0, Math.PI / 2);
      const f = add(new THREE.ConeGeometry(0.35, 1.2, 10), mat(0xffa030, 0xff6010), -5.5, 2.2, z * 1.15, 0, 0, Math.PI / 2);
      f.userData.flame = true;
    }
    // ballon
    const bal = new THREE.Group(); bal.position.y = 11; g.add(bal);
    const stripes = [0x2a7ad8, 0xf4f4f4, 0x2a7ad8, 0xf4f4f4, 0x2a7ad8, 0xf4f4f4, 0x2a7ad8, 0xf4f4f4];
    stripes.forEach((c, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 12, i * Math.PI / 4, Math.PI / 4), mat(c)); s.scale.y = 1.15; s.castShadow = true; bal.add(s); });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.8, 24, 1, true), yellow); bal.add(band);
    // cordes
    for (const x of [-4, 4]) for (const z of [-1.5, 1.5]) {
      const from = new THREE.Vector3(x, 3.2, z), to = new THREE.Vector3(x * 0.55, 7.2, z * 1.8);
      const l = from.distanceTo(to);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, l, 4), dark);
      r.position.copy(from).add(to).multiplyScalar(0.5);
      r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      g.add(r);
    }
    // drapeau/logo
    add(new THREE.BoxGeometry(2.5, 0.8, 0.05), red, 0, 1.7, 1.76);
    g.visible = false;
    g.scale.setScalar(1.3);
    scene.add(g);
    BUS.model = g;
    BUS.balloon = bal;
  };

  BUS.start = function () {
    // trajet aléatoire passant près du centre
    const a = Math.random() * Math.PI * 2;
    const off = U.rand(-160, 160);
    const nx = -Math.sin(a), nz = Math.cos(a);
    const cx = nx * off, cz = nz * off;
    BUS.dir.set(Math.cos(a), 0, Math.sin(a));
    BUS.start0 = new THREE.Vector3(cx - BUS.dir.x * 760, BUS.height, cz - BUS.dir.z * 760);
    BUS.end0 = new THREE.Vector3(cx + BUS.dir.x * 760, BUS.height, cz + BUS.dir.z * 760);
    BUS.len = 1520;
    BUS.t = 0;
    BUS.active = true;
    BUS.doorsOpen = false;
    BUS.model.visible = true;
    BUS.pos.copy(BUS.start0);
    BUS.model.rotation.y = -a;
    G.Audio.play('bus_horn');
  };
  BUS.stop = function () {
    BUS.active = false;
    BUS.model.visible = false;
    G.Audio.setLoop('bus', 0);
  };
  // Position le long du trajet (0..1)
  BUS.pointAt = function (k) { return BUS.start0.clone().lerp(BUS.end0, k); };
  BUS.progress = () => BUS.t * BUS.speed / BUS.len;
  // moment où le bus passe au plus près de (x,z)
  BUS.closestK = function (x, z) {
    const d = BUS.end0.clone().sub(BUS.start0);
    const k = ((x - BUS.start0.x) * d.x + (z - BUS.start0.z) * d.z) / (d.x * d.x + d.z * d.z);
    return U.clamp(k, 0.04, 0.96);
  };

  BUS.update = function (dt) {
    if (!BUS.active) return;
    BUS.t += dt;
    const k = BUS.progress();
    BUS.pos.copy(BUS.start0).lerp(BUS.end0, Math.min(1, k));
    BUS.pos.y = BUS.height + Math.sin(BUS.t * 0.8) * 1.2;
    BUS.model.position.copy(BUS.pos);
    BUS.model.rotation.z = Math.sin(BUS.t * 1.1) * 0.03;
    BUS.balloon.rotation.y += dt * 0.3;
    BUS.model.children.forEach((c) => { if (c.userData.flame) c.scale.set(1, 0.8 + Math.random() * 0.5, 1); });
    if (!BUS.doorsOpen && BUS.t > 2.5) { BUS.doorsOpen = true; if (G.HUD) G.HUD.notify('LES PORTES DU BUS SONT OUVERTES', 2.5); G.Audio.play('bus_horn'); }
    // son du moteur
    const sp = G.Audio.spatialOf([BUS.pos.x, BUS.pos.y, BUS.pos.z], 30, 900);
    G.Audio.setLoop('bus', sp ? sp.g * 0.5 : 0, sp ? sp.pan : 0);
    if (k >= 1) { if (G.Match) G.Match.busEnd(); }
  };
})();
