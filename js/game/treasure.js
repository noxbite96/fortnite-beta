// ============================================================
//  CARTES AU TRÉSOR : utilisez-la pour révéler un trésor enfoui
//  (colonne de lumière dorée + X sur la carte), puis déterrez-le
//  pour obtenir une arme légendaire, des lingots et du bouclier.
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const TR = { active: null };
  G.Treasure = TR;

  function spotMeshes(x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    // colonne de lumière
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 140, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc830, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.position.y = 70; g.add(beam);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 140, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    core.position.y = 70; g.add(core);
    // butte de terre + X rouge
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x7a5530 }));
    mound.scale.y = 0.35; g.add(mound);
    const xm = new THREE.MeshBasicMaterial({ color: 0xd82020 });
    for (const r of [Math.PI / 4, -Math.PI / 4]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.28), xm); b.rotation.y = r; b.position.y = 0.4; g.add(b); }
    G.scene.add(g);
    return g;
  }

  TR.use = function (a, it, consume) {
    if (!a.isPlayer) return false;
    if (TR.active) { G.HUD.notify('Un trésor est déjà marqué sur votre carte !', 1.5); G.Audio.play('build_fail'); return false; }
    let q = null;
    for (let i = 0; i < 20 && !q; i++) {
      const p = G.Terrain.randomLandPoint(Math.random, a.pos.x, a.pos.z, 260, 2);
      const d = Math.hypot(p[0] - a.pos.x, p[1] - a.pos.z);
      if (d < 70) continue;
      if (G.Storm && G.Storm.active && G.Storm.isOutside(p[0], p[1])) continue;
      q = G.Folk ? G.Folk.findSpot(p[0], p[1], 0, 12) : p;
    }
    if (!q) { G.HUD.notify('La carte est illisible… réessayez plus tard', 1.5); return false; }
    const y = G.Terrain.height(q[0], q[1]);
    TR.active = { x: q[0], y, z: q[1], g: spotMeshes(q[0], y, q[1]) };
    consume();
    G.HUD.ping = { x: q[0], z: q[1] };
    G.HUD.notify('🗺 LE TRÉSOR EST MARQUÉ SUR VOTRE CARTE !', 2.5, 'upgrade');
    G.Audio.play('card');
    a.fireCd = 0.5;
    return true;
  };
  TR.interactables = function (out) {
    const t = TR.active, pl = G.player;
    if (!t || !pl || pl.dead) return;
    if (Math.abs(t.x - pl.pos.x) > 4 || Math.abs(t.z - pl.pos.z) > 4) return;
    out.push({ kind: 'treasure', obj: t, x: t.x, y: t.y + 0.6, z: t.z, name: 'Trésor enfoui', action: 'Déterrer le trésor', range: 2.8 });
  };
  TR.dig = function (a) {
    const t = TR.active; if (!t) return;
    TR.active = null;
    G.scene.remove(t.g); if (G.Extras.disposeTree) G.Extras.disposeTree(t.g);
    for (let i = 0; i < 60; i++) G.FX.glow.spawn(t.x, t.y + 0.4, t.z, U.rand(-3, 3), U.rand(3, 8), U.rand(-3, 3), 0.55, 0.38, 0.2, 0.3, 1.2, 12, 1);
    for (let i = 0; i < 40; i++) G.FX.glow.spawn(t.x, t.y + 0.6, t.z, U.rand(-2, 2), U.rand(2, 7), U.rand(-2, 2), 1, 0.85, 0.3, 0.2, 1.4, 6, 1);
    G.Audio.play('chest_open', { pos: [t.x, t.y, t.z] }); G.Audio.play('levelup');
    const w = I.randomWeapon(3); const wl = I.make(w.id, 4);
    const am = I.WEAPONS[wl.id].ammo;
    G.Loot.spill([{ kind: 'item', item: wl }, { kind: 'ammo', type: am, amount: I.AMMO[am].pick * 3 }, { kind: 'gold', type: 'gold', amount: 150 }, { kind: 'item', item: I.make('shieldpot') }, { kind: 'item', item: I.make(U.pick(['chug', 'slurp', 'medkit'])) }], t.x, t.y + 0.6, t.z, 1.1);
    G.HUD.notify('TRÉSOR DÉTERRÉ !', 2, 'upgrade');
    if (a && a.isPlayer && G.Match) G.Match.challengeEvent('treasure');
    G.HUD.xpToast(700, 'Trésor');
    G.HUD.ping = null;
  };
  TR.reset = function () { if (TR.active) { G.scene.remove(TR.active.g); if (G.Extras.disposeTree) G.Extras.disposeTree(TR.active.g); TR.active = null; } };
  TR.update = function (dt) {
    const t = TR.active; if (!t) return;
    const b = t.g.children[0]; b.material.opacity = 0.4 + Math.sin(G.Game.time * 3) * 0.1;
    if (Math.random() < 0.2) G.FX.sparkle(t.x + U.rand(-0.8, 0.8), t.y + U.rand(0.3, 2.5), t.z + U.rand(-0.8, 0.8), 1, 0.85, 0.3, 0.6);
  };
  TR.mapIcons = function (ctx, toMap, big) {
    const t = TR.active; if (!t) return;
    const m = toMap(t.x, t.z), s = big ? 1.5 : 1.1;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(m[0] - 6 * s, m[1] - 6 * s); ctx.lineTo(m[0] + 6 * s, m[1] + 6 * s); ctx.moveTo(m[0] + 6 * s, m[1] - 6 * s); ctx.lineTo(m[0] - 6 * s, m[1] + 6 * s); ctx.stroke();
    ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 3 * s; ctx.stroke();
  };
})();
