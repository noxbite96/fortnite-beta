// ============================================================
//  TOURELLES MONTÉES : mitrailleuses fixes à 360° (Château Royal,
//  Usine Rouillée, Docks). E pour s'en servir, souris pour viser,
//  clic pour tirer ; attention à la surchauffe !
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const TU = { list: [] };
  G.Turrets = TU;

  function baseModel() {
    const V = G.Veg, parts = [];
    const dark = 0x3a3e44, olive = 0x4a5a3a, metal = 0x7a8088;
    const add = (geo, col, x, y, z, rx, rz) => { if (rx) geo.rotateX(rx); if (rz) geo.rotateZ(rz); geo.translate(x, y, z); parts.push(V.colored(geo, col, 0.04)); };
    // sacs de sable en arc de cercle
    for (let i = 0; i < 7; i++) { const a = -1.3 + i * 0.43; add(new THREE.BoxGeometry(0.75, 0.32, 0.42).rotateY(-a), 0xb8a070, Math.sin(a) * 1.35, 0.16, Math.cos(a) * 1.35); add(new THREE.BoxGeometry(0.72, 0.3, 0.4).rotateY(-a), 0xa89060, Math.sin(a + 0.2) * 1.33, 0.46, Math.cos(a + 0.2) * 1.33); }
    // trépied
    for (let i = 0; i < 3; i++) { const a = i * 2.1; add(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6), dark, Math.sin(a) * 0.32, 0.5, Math.cos(a) * 0.32, Math.cos(a) * 0.35, -Math.sin(a) * 0.35); }
    add(new THREE.CylinderGeometry(0.12, 0.14, 0.3, 8), metal, 0, 1.05, 0);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(V.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })));
    void olive;
    return g;
  }
  function headModel() {
    const V = G.Veg, parts = [];
    const dark = 0x2a2e34, olive = 0x56663e, metal = 0x8a9098;
    const add = (geo, col, x, y, z, rx) => { if (rx) geo.rotateX(rx); geo.translate(x, y, z); parts.push(V.colored(geo, col, 0.03)); };
    add(new THREE.BoxGeometry(0.36, 0.3, 0.7), olive, 0, 0, 0.05);            // boîtier
    add(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), dark, 0, 0.03, 0.85, Math.PI / 2); // canon
    add(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8), dark, 0, 0.03, 0.55, Math.PI / 2);  // manchon
    add(new THREE.CylinderGeometry(0.08, 0.06, 0.12, 8), metal, 0, 0.03, 1.38, Math.PI / 2); // bouche
    add(new THREE.BoxGeometry(0.9, 0.7, 0.05), 0x5a6a48, 0, 0.12, 0.42);        // bouclier
    add(new THREE.BoxGeometry(0.28, 0.12, 0.06), 0x222222, 0, 0.3, 0.44);       // fente de visée
    add(new THREE.BoxGeometry(0.08, 0.22, 0.2), dark, 0.18, -0.18, -0.35);      // poignées
    add(new THREE.BoxGeometry(0.08, 0.22, 0.2), dark, -0.18, -0.18, -0.35);
    add(new THREE.BoxGeometry(0.2, 0.2, 0.24), 0x8a7a3a, 0.28, -0.02, 0.05);    // caisse de munitions
    const m = new THREE.Mesh(V.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.castShadow = true;
    return m;
  }

  class Turret {
    constructor(x, z, yaw) {
      const y = G.Phys.supportAt(x, z, G.Terrain.height(x, z) + 3, 0.5, 0.6);
      this.pos = new THREE.Vector3(x, y, z);
      this.home = [x, z, yaw];
      this.label = 'Tourelle montée'; this.isTurret = true;
      this.seat = [0, 0, -1.05];
      this.g = new THREE.Group(); this.g.position.copy(this.pos);
      this.g.add(baseModel());
      this.pivot = new THREE.Group(); this.pivot.position.y = 1.3; this.g.add(this.pivot);
      this.head = headModel(); this.pivot.add(this.head);
      G.scene.add(this.g);
      // collision : bouclier + base (le tireur reste exposé sur les côtés)
      const W = G.World, P = G.Phys;
      const e = W.ent('prop', 'metal', 9999, { yield: 0, noPickaxe: true }); e.invulnerable = true;
      W.addCol(e, P.box(x - 0.35, y, z - 0.35, x + 0.35, y + 1.2, z + 0.35, e));
      this.reset();
      this.yaw = yaw; this.sync();
    }
    reset() { this.driver = null; this.dead = false; this.heat = 0; this.over = false; this.fireT = 0; this.speed = 0; this.pitch = 0; this.yaw = this.home[2]; this.sync(); }
    sync() { this.pivot.rotation.set(0, this.yaw, 0); this.head.rotation.x = -this.pitch; }
    update(dt) {
      const d = this.driver;
      this.heat = Math.max(0, this.heat - dt * (this.over ? 0.45 : 0.3));
      if (this.over && this.heat < 0.25) this.over = false;
      if (!d) return;
      if (d.isPlayer) { this.yaw = d.camYaw + Math.PI; this.pitch = U.clamp(d.camPitch + 0.05, -0.55, 0.65); }
      this.sync();
      this.fireT -= dt;
      if (d.control.fire && !this.over && this.fireT <= 0) {
        this.fireT = 0.095;
        this.heat += 0.045;
        if (this.heat >= 1) { this.over = true; G.Audio.play('build_fail'); if (d.isPlayer) G.HUD.notify('SURCHAUFFE !', 1); }
        const cp = Math.cos(this.pitch);
        const fw = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
        const mz = new THREE.Vector3(this.pos.x + fw.x * 1.45, this.pos.y + 1.33 + fw.y * 1.45, this.pos.z + fw.z * 1.45);
        const gun = TU.gun || (TU.gun = I.make('turretgun', 2));
        if (d.isPlayer) { const r = d.aimRay(); G.Combat.fireWeapon(d, gun, mz, r.o, r.d, 0.012, mz); }
        else G.Combat.fireWeapon(d, gun, mz, mz, fw, 0.02, mz);
        G.Audio.play('ar', { pos: d.isPlayer ? null : [mz.x, mz.y, mz.z], vol: 0.9 });
        G.FX.muzzle(mz.x, mz.y, mz.z, false, d.isPlayer);
        if (d.isPlayer) { d.recoilP = (d.recoilP || 0) + 0.004; d.shake = Math.max(d.shake || 0, 0.05); G.HUD.crosshairKick(); }
        G.FX.addDebris(this.pos.x + Math.cos(this.yaw) * 0.3, this.pos.y + 1.3, this.pos.z - Math.sin(this.yaw) * 0.3, Math.cos(this.yaw) * 2, 2.5, -Math.sin(this.yaw) * 2, 0.045, 0xd8a840, 1);
      }
      // vapeur quand ça chauffe
      if (this.heat > 0.6 && Math.random() < this.heat * 0.3) G.FX.smoke.spawn(this.pos.x + Math.sin(this.yaw) * 1.2, this.pos.y + 1.4, this.pos.z + Math.cos(this.yaw) * 1.2, 0, 1, 0, 0.9, 0.9, 0.9, 0.3, 0.8, 0.3, 0.6, 1.5);
    }
  }

  TU.init = function () {
    if (TU.list.length || !G.Folk) return;
    const spots = [['chateau', 2], ['usine', 2], ['docks', 1], ['tours', 1], ['base', 2]];
    for (const [id, n] of spots) {
      const p = G.MapData.poiById(id); if (!p) continue;
      for (let i = 0; i < n; i++) {
        const q = G.Folk.findSpot(p.x, p.z, 10, Math.min(40, p.r * 0.7));
        // la tourelle regarde vers l'extérieur du lieu
        const yaw = Math.atan2(q[0] - p.x, q[1] - p.z);
        const t = new Turret(q[0], q[1], yaw);
        TU.list.push(t);
        G.Extras.karts.push(t);
      }
    }
  };
  TU.update = function (dt) { for (const t of TU.list) if (!t.driver) t.update(dt); };
})();
