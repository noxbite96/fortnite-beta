// ============================================================
//  MENU DU TERRAIN DE JEU (touche O) : faire apparaître véhicules,
//  objets spéciaux, événements en direct et changer l'ambiance.
//  Pratique pour tester tout le contenu (ou filmer !).
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const SB = { open: false };
  G.Sandbox = SB;

  function front(d) {
    const pl = G.player;
    const fx = -Math.sin(pl.camYaw), fz = -Math.cos(pl.camYaw);
    const x = pl.pos.x + fx * d, z = pl.pos.z + fz * d;
    return { x, z, yaw: pl.camYaw + Math.PI };
  }
  function give(id, rarity, count) {
    const pl = G.player;
    const it = I.make(id, rarity, count);
    // on remplit les emplacements à tour de rôle (l'ancien objet est posé au sol)
    if (!pl.slots.some((x) => !x) && !(I.CONSUMABLES[id] && pl.slots.some((x) => x && x.id === id))) { SB.slot = ((SB.slot == null ? -1 : SB.slot) + 1) % 5; pl.sel = SB.slot; }
    if (!pl.takeItem(it, false) && !pl.takeItem(it, true)) G.Loot.spawn({ kind: 'item', item: it }, pl.pos.x, pl.pos.y + 0.3, pl.pos.z);
    else { const k = pl.slots.indexOf(it); if (k >= 0) { pl.sel = -1; pl.equip(k); } }
    const w = I.WEAPONS[id];
    if (w) pl.ammo[w.ammo] = Math.max(pl.ammo[w.ammo] || 0, 300);
    G.HUD.pickupNote(I.name(it), I.RARITY[it.rarity].color);
    G.Audio.play('pickup');
  }
  // les véhicules créés ici sont retirés en quittant le terrain de jeu
  const spawned = [];
  const mark = (v, list) => { v.sandboxList = list; spawned.push(v); return v; };
  SB.cleanup = function () {
    for (const v of spawned) {
      if (v.driver) G.Extras.exitKart(v.driver);
      if (v.m) { G.scene.remove(v.m); G.Extras.disposeTree(v.m); }
      for (const L of [G.Extras.karts, v.sandboxList]) { if (!L) continue; const i = L.indexOf(v); if (i >= 0) L.splice(i, 1); }
    }
    spawned.length = 0;
  };
  const ACTIONS = {
    // véhicules
    kart: () => { const f = front(7); const k = mark(new G.Extras.Kart(f.x, f.z, f.yaw)); G.Extras.karts.push(k); },
    car: () => { const f = front(7); G.Extras.karts.push(mark(G.Extras.makeCar(f.x, f.z, f.yaw, false))); },
    sportcar: () => { const f = front(7); G.Extras.karts.push(mark(G.Extras.makeCar(f.x, f.z, f.yaw, true))); },
    heli: () => { const f = front(10); const h = mark(new G.Planes.Heli(f.x, f.z, f.yaw), G.Planes.helis); G.Planes.helis.push(h); G.Extras.karts.push(h); },
    plane: () => { const f = front(14); const p = mark(new G.Planes.Plane(f.x, f.z, f.yaw), G.Planes.list); G.Planes.list.push(p); G.Extras.karts.push(p); },
    mech: () => { const f = front(9); const m = mark(new G.Mechs.Mech(f.x, f.z, f.yaw), G.Mechs.list); G.Mechs.list.push(m); G.Extras.karts.push(m); },
    boar: () => { const f = front(5); const b = mark(new G.Boars.Boar(f.x, f.z), G.Boars.list); b.yaw = f.yaw; G.Boars.list.push(b); G.Extras.karts.push(b); },
    // objets
    jetpack: () => give('jetpack'), balloons: () => give('balloons', null, 6), bow: () => give('bow', 4), boombow: () => give('boombow', 4),
    saber: () => give('saber', 4), flint: () => give('flintknock', 3), flame: () => give('flamethrower', 4), mythic_ar: () => give('mythic_ar', 5), mythic_minigun: () => give('mythic_minigun', 5), mythic_rocket: () => give('mythic_rocket', 5), mythic_icebow: () => give('mythic_icebow', 5),
    treasure: () => give('treasuremap'), scanner: () => give('scanner', null, 2), cozy: () => give('cozyfire', null, 2), stink: () => give('stink', null, 5),
    smoke: () => give('smokegren', null, 5), grappler: () => give('grappler'), rift: () => give('rift', null, 2), fort: () => give('portafort', null, 2),
    // événements
    ufo: () => { if (!G.UFO.ufo) { const pl = G.player; const p = G.MapData.pois.slice().sort((a, b) => Math.hypot(a.x - pl.pos.x, a.z - pl.pos.z) - Math.hypot(b.x - pl.pos.x, b.z - pl.pos.z))[0]; G.UFO.launch(p); } },
    meteor: () => { if (!G.Events.meteor) { const f = front(70); G.Events.launch([f.x, f.z]); } },
    drop: () => { const f = front(12); G.Extras.spawnDrop(f.x, f.z); },
    cube: () => { if (!G.Cube.c) { const f = front(40); G.Cube.launch([f.x, f.z]); } },
    tornado: () => { if (!G.Tornado.t) { const f = front(60); G.Tornado.launch([f.x, f.z]); G.Tornado.t.head = Math.PI / 2 - G.player.camYaw; } },
    fireworks: () => G.Crown.fireworks(G.player.pos, 8),
    dummies: () => G.NPC.spawnDummies(),
    aug: () => G.Aug.grant(),
    medal: () => { const f = front(4); for (const t of ['roi', 'omega', 'general', 'reine']) G.Loot.spawn({ kind: 'medal', type: t }, f.x, G.player.pos.y + 1.2, f.z, G.U.rand(-2, 2), 5, G.U.rand(-2, 2)); },
    // ambiance
    day: () => { G.Sky.time = 12; }, sunset: () => { G.Sky.time = 18.6; }, night: () => { G.Sky.time = 23; },
    rain: () => { G.Weather.forceRain(G.Weather.target > 0 ? 0 : 1); },
    rainbow: () => { G.Weather.rain = 0; G.Weather.target = 0; G.Weather.rainbowT = 60; if (G.Sky.night > 0.3) G.Sky.time = 16.5; },
    aurora: () => { G.Weather.auroraOn = true; G.Sky.time = 23.5; G.Weather.forceRain(0); },
  };
  const SECTIONS = [
    ['VÉHICULES', [['car', 'Voiture'], ['sportcar', 'Cabriolet de sport'], ['kart', 'Kart'], ['heli', 'Hélicoptère'], ['plane', 'Avion de chasse'], ['mech', 'Mécha de combat'], ['boar', 'Sanglier']]],
    ['OBJETS', [['jetpack', 'Jetpack'], ['balloons', 'Ballons'], ['bow', 'Arc'], ['boombow', 'Arc explosif'], ['saber', 'Sabre lumineux'], ['flint', 'Pistolet à silex'], ['flame', 'Lance-flammes'], ['mythic_ar', 'Fusil du Roi'], ['mythic_minigun', 'Minigun d\'Oméga'], ['mythic_rocket', 'Roquettes du Général'], ['mythic_icebow', 'Arc de la Reine'], ['treasure', 'Carte au trésor'], ['scanner', 'Scanner'], ['cozy', 'Feu de camp'], ['stink', 'Bombes puantes'], ['smoke', 'Fumigènes'], ['grappler', 'Grappin'], ['rift', 'Faille'], ['fort', 'Fort portatif']]],
    ['ÉVÉNEMENTS', [['ufo', 'OVNI'], ['meteor', 'Météorite'], ['tornado', 'Tornade'], ['cube', 'Le Cube'], ['drop', 'Largage'], ['fireworks', 'Feu d\'artifice'], ['dummies', 'Cibles (K)'], ['aug', 'Augmentation'], ['medal', 'Médaillons des boss']]],
    ['AMBIANCE', [['day', 'Jour'], ['sunset', 'Coucher de soleil'], ['night', 'Nuit'], ['rain', 'Pluie / orage'], ['rainbow', 'Arc-en-ciel'], ['aurora', 'Aurore boréale']]],
  ];

  function root() {
    let el = document.getElementById('pg-menu');
    if (!el) {
      el = document.createElement('div'); el.id = 'pg-menu'; el.className = 'hidden';
      let s = '<div class="pg-box"><h2 class="fn">TERRAIN DE JEU</h2><div class="pg-sub">Cliquez pour faire apparaître · O / Échap : fermer</div>';
      for (const [title, list] of SECTIONS) {
        s += `<div class="pg-sec fn">${title}</div><div class="pg-grid">`;
        for (const [id, label] of list) s += `<button class="pg-btn" data-a="${id}">${label}</button>`;
        s += '</div>';
      }
      s += '</div>';
      el.innerHTML = s;
      document.getElementById('hud').appendChild(el);
      el.addEventListener('mousedown', (e) => e.stopPropagation());
      el.querySelectorAll('.pg-btn').forEach((b) => b.onclick = () => {
        const fn = ACTIONS[b.dataset.a];
        try { if (fn) fn(); } catch (err) { console.error(err); }
        G.Audio.play('ui_click');
        b.classList.remove('done'); void b.offsetWidth; b.classList.add('done');
      });
    }
    return el;
  }
  SB.toggle = function () {
    SB.open = !SB.open;
    root().classList.toggle('hidden', !SB.open);
    if (SB.open) { G.Game.ignoreUnlock = true; G.Input.exitLock(); setTimeout(() => { G.Game.ignoreUnlock = false; }, 300); G.Audio.play('ui_click'); }
    else { G.Input.requestLock(); G.Audio.play('ui_back'); }
  };
  document.addEventListener('keydown', (e) => {
    if (!G.Match || !G.Match.playground || G.Game.state !== 'playing') return;
    if (G.Input.hit('sandboxMenu') && !e.repeat) { if (!SB.open && G.HUD && G.HUD.modalOpen()) return; e.preventDefault(); SB.toggle(); }
    else if (e.code === 'Escape' && SB.open) { e.preventDefault(); e.stopPropagation(); SB.toggle(); }
  }, true);
  SB.close = function () { if (SB.open) { SB.open = false; root().classList.add('hidden'); } };
})();
