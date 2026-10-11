// ============================================================
//  CABINES DE DÉGUISEMENT : des cabines téléphoniques dans 5 lieux.
//  Entrez, appuyez sur E : vous changez de tenue (parmi celles que vous
//  avez débloquées) dans un nuage de fumée, en pleine partie.
// ============================================================
(function () {
  const U = G.U;
  const BO = { list: [] };
  G.Booths = BO;

  let tpl = null;
  function model() {
    if (!tpl) {
      const V = G.Veg, P = [];
      const red = 0xc81e1e, dark = 0x2a2a2e, gold = 0xffc830;
      const bx = (sx, sy, sz, col, x, y, z) => P.push(V.colored(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), col, 0));
      bx(1.3, 0.12, 1.3, dark, 0, 0.06, 0);                                   // socle
      for (const [x, z] of [[-0.58, -0.58], [0.58, -0.58], [-0.58, 0.58], [0.58, 0.58]]) bx(0.14, 2.5, 0.14, red, x, 1.35, z);
      bx(1.32, 0.3, 1.32, red, 0, 2.72, 0);                                   // toit
      bx(1.1, 0.12, 1.1, red, 0, 2.93, 0);
      bx(1.0, 0.22, 0.04, 0xfff4d0, 0, 2.72, 0.67); bx(1.0, 0.22, 0.04, 0xfff4d0, 0, 2.72, -0.67); // enseigne
      bx(0.04, 0.22, 1.0, 0xfff4d0, 0.67, 2.72, 0); bx(0.04, 0.22, 1.0, 0xfff4d0, -0.67, 2.72, 0);
      for (const y of [0.9, 1.6, 2.3]) { bx(1.2, 0.05, 0.05, red, 0, y, -0.6); bx(0.05, 0.05, 1.2, red, 0.6, y, 0); bx(0.05, 0.05, 1.2, red, -0.6, y, 0); }
      bx(0.3, 0.4, 0.15, dark, 0.3, 1.5, -0.5);                               // téléphone
      bx(0.08, 0.08, 0.1, gold, 0.3, 1.6, -0.4);
      tpl = {
        geo: V.merge(P), mat: new THREE.MeshLambertMaterial({ vertexColors: true }),
        glass: new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.25, depthWrite: false }),
        pane: new THREE.PlaneGeometry(1.1, 2.3),
      };
    }
    const g = new THREE.Group();
    const m = new THREE.Mesh(tpl.geo, tpl.mat); m.castShadow = true; g.add(m);
    for (const [x, z, ry] of [[0, -0.62, 0], [0.62, 0, Math.PI / 2], [-0.62, 0, Math.PI / 2]]) { const p = new THREE.Mesh(tpl.pane, tpl.glass); p.position.set(x, 1.35, z); p.rotation.y = ry; g.add(p); }
    return g;
  }

  BO.init = function () {
    if (BO.list.length || !G.Folk) return;
    const W = G.World, P = G.Phys;
    for (const id of ['tours', 'galerie', 'docks', 'base', 'ferme']) {
      const p = G.MapData.poiById(id); if (!p) continue;
      const s = G.Folk.findSpot(p.x, p.z, 8, Math.min(40, p.r * 0.8));
      const y = P.supportAt(s[0], s[1], G.Terrain.height(s[0], s[1]) + 2, 0.7, 0.6);
      const g = model(); g.position.set(s[0], y, s[1]); g.rotation.y = Math.random() * 6.28;
      G.scene.add(g);
      // montants et toit solides (on entre par l'avant)
      const e = W.ent('prop', 'metal', 99999, { yield: 0, noPickaxe: true });
      e.invulnerable = true;
      const c = Math.cos(g.rotation.y), sn = Math.sin(g.rotation.y);
      for (const [lx, lz] of [[-0.58, -0.58], [0.58, -0.58], [-0.58, 0.58], [0.58, 0.58]]) {
        const wx = s[0] + lx * c + lz * sn, wz = s[1] - lx * sn + lz * c;
        W.addCol(e, P.box(wx - 0.1, y, wz - 0.1, wx + 0.1, y + 2.6, wz + 0.1, e));
      }
      BO.list.push({ g, x: s[0], y, z: s[1], cd: 0 });
    }
  };

  BO.interactables = function (out) {
    const pl = G.player; if (!pl || pl.dead || pl.downed || G.Game.state !== 'playing') return;
    for (const b of BO.list) {
      if (Math.abs(b.x - pl.pos.x) > 3 || Math.abs(b.z - pl.pos.z) > 3) continue;
      out.push({ kind: 'booth', obj: b, x: b.x, y: b.y + 1.4, z: b.z, name: 'Cabine de déguisement', action: 'Changer de tenue', range: 1.6 });
    }
  };

  BO.use = function (a, b) {
    if (!a.isPlayer || a.state !== 'ground' || a.balloons > 0 || a.downed) return;
    const now = G.Game.time;
    if (b.cd > now) return;
    b.cd = now + 1.2;
    const C = G.Cosmetics.items;
    const skins = Object.keys(C).filter((id) => id.indexOf('skin_') === 0 && !C[id].styleOf && G.Store.isUnlocked(id));
    if (skins.length < 2) { G.HUD.notify('Débloquez d\'autres tenues pour vous déguiser !', 2); return; }
    const i = skins.indexOf(a.cos.skin);
    const id = skins[(i + 1) % skins.length];
    // reconstruction du personnage (couronne et médaillons suivent)
    const crown = !!a.crown;
    if (crown) G.Crown.take(a);
    const meds = a.medalModels || [];
    for (const m of meds) if (m.parent) m.parent.remove(m);
    G.Char.dispose(a.char);
    a.char = G.Char.build(id, { back: a.cos.back });
    G.scene.add(a.char.root);
    a.cos.skin = id;
    a.heldKey = null; a.refreshHeld();
    if (crown) G.Crown.give(a, true);
    for (const m of meds) a.char.J.chest.add(m);
    a.char.root.visible = true;
    // fumée + son
    for (let k = 0; k < 26; k++) G.FX.smoke.spawn(b.x + U.rand(-0.5, 0.5), b.y + U.rand(0.2, 2.2), b.z + U.rand(-0.5, 0.5), U.rand(-1, 1), U.rand(0.5, 2), U.rand(-1, 1), 0.95, 0.9, 1, U.rand(0.8, 1.6), U.rand(0.8, 1.4), -0.2, 2, 2);
    G.Audio.play('glider_open');
    G.Audio.play('unlock');
    G.HUD.notify('NOUVELLE TENUE : ' + (C[id].name || '').toUpperCase(), 2, 'upgrade');
    if (G.Match) G.Match.challengeEvent('booth');
  };
})();
