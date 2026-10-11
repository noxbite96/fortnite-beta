// ============================================================
//  Objets : armes, soins, munitions, raretés
// ============================================================
(function () {
  const I = {};
  G.Items = I;

  I.RARITY = [
    { name: 'Commun', color: '#b1b8be', hex: 0xb1b8be, bg: 'linear-gradient(160deg,#c8ced3,#6c7680)', mult: 1.0 },
    { name: 'Peu commun', color: '#5ec43a', hex: 0x5ec43a, bg: 'linear-gradient(160deg,#78d651,#2c7a18)', mult: 1.05 },
    { name: 'Rare', color: '#3aa3ff', hex: 0x3aa3ff, bg: 'linear-gradient(160deg,#5ab8ff,#1a4ea8)', mult: 1.1 },
    { name: 'Épique', color: '#bb5cff', hex: 0xbb5cff, bg: 'linear-gradient(160deg,#cb7dff,#5a1ea8)', mult: 1.16 },
    { name: 'Légendaire', color: '#f5a623', hex: 0xf5a623, bg: 'linear-gradient(160deg,#ffc555,#b85a10)', mult: 1.22 },
    { name: 'Mythique', color: '#ffd84a', hex: 0xffd84a, bg: 'linear-gradient(160deg,#fff3a0,#e0a000 55%,#a06000)', mult: 1.3 },
  ];

  I.AMMO = {
    light: { name: 'Munitions légères', short: 'Légères', color: '#8ec8ff', hex: 0x8ec8ff, pick: 18 },
    medium: { name: 'Munitions moyennes', short: 'Moyennes', color: '#9dff8a', hex: 0x9dff8a, pick: 20 },
    heavy: { name: 'Munitions lourdes', short: 'Lourdes', color: '#ff8a8a', hex: 0xff8a8a, pick: 6 },
    shells: { name: 'Cartouches', short: 'Cartouches', color: '#ffd28a', hex: 0xffd28a, pick: 8 },
    rockets: { name: 'Roquettes', short: 'Roquettes', color: '#c8a0ff', hex: 0xc8a0ff, pick: 3 },
    arrows: { name: 'Flèches', short: 'Flèches', color: '#f0d8a8', hex: 0xf0d8a8, pick: 6 },
  };
  I.MAT = {
    wood: { name: 'Bois', color: '#c89060', hp: 150, time: 3.0, hex: 0xb8824a },
    stone: { name: 'Pierre', color: '#b0b0b0', hp: 300, time: 8.0, hex: 0x9a9690 },
    metal: { name: 'Métal', color: '#9ab8d0', hp: 500, time: 12.0, hex: 0xa8b0b8 },
  };

  // dmg : par rareté (commun -> légendaire), null = rareté inexistante
  I.WEAPONS = {
    ar: {
      name: 'Fusil d\'assaut', short: 'Fusil d\'assaut', cat: 'ar', hold: 'rifle', ammo: 'medium', model: 'ar',
      dmg: [30, 31, 33, 35, 36], head: 1.5, rate: 5.5, mag: 30, reload: [2.3, 2.2, 2.1, 2.0, 1.9], auto: true,
      spread: 0.012, spreadMove: 2.0, bloom: 0.006, bloomMax: 0.05, adsMul: 0.35, recoil: 0.011, range: 280, fall: [50, 180, 0.72],
      sound: 'ar', zoom: 1.35, buildDmg: 1.0, desc: 'Polyvalent, efficace à moyenne distance.',
    },
    burst: {
      name: 'Fusil à rafale', short: 'Fusil rafale', cat: 'ar', hold: 'rifle', ammo: 'medium', model: 'burst',
      dmg: [27, 29, 30, 32, 33], head: 1.5, rate: 3.2, mag: 30, reload: [2.7, 2.6, 2.5, 2.4, 2.3], burst: 3, burstDelay: 0.07,
      spread: 0.008, spreadMove: 2.0, bloom: 0.004, bloomMax: 0.04, adsMul: 0.3, recoil: 0.009, range: 280, fall: [50, 180, 0.72],
      sound: 'burst', zoom: 1.45, buildDmg: 1.0, desc: 'Tire par rafales de trois balles.',
    },
    pump: {
      name: 'Fusil à pompe', short: 'Pompe', cat: 'shotgun', hold: 'shotgun', ammo: 'shells', model: 'pump',
      dmg: [92, 97, 103, 108, 114], pellets: 10, head: 2.0, rate: 0.7, mag: 5, reload: [4.8, 4.6, 4.4, 4.2, 4.0], shellReload: true,
      spread: 0.075, spreadMove: 1.2, bloom: 0, bloomMax: 0, adsMul: 0.75, recoil: 0.05, range: 40, fall: [7, 26, 0.2],
      sound: 'pump', zoom: 1.1, buildDmg: 0.6, desc: 'Dévastateur à courte portée.',
    },
    tactical: {
      name: 'Fusil à pompe tactique', short: 'Pompe tactique', cat: 'shotgun', hold: 'shotgun', ammo: 'shells', model: 'tactical',
      dmg: [67, 70, 74, 78, 81], pellets: 9, head: 2.0, rate: 1.5, mag: 8, reload: [6.3, 6.0, 5.7, 5.4, 5.1], shellReload: true,
      spread: 0.065, spreadMove: 1.2, bloom: 0, bloomMax: 0, adsMul: 0.75, recoil: 0.035, range: 40, fall: [7, 26, 0.25],
      sound: 'tactical', zoom: 1.1, buildDmg: 0.6, desc: 'Cadence élevée, dégâts plus faibles.',
    },
    smg: {
      name: 'Mitraillette', short: 'Mitraillette', cat: 'smg', hold: 'smg', ammo: 'light', model: 'smg',
      dmg: [17, 18, 19, 20, 21], head: 1.75, rate: 12, mag: 30, reload: [2.2, 2.1, 2.0, 1.9, 1.8], auto: true,
      spread: 0.025, spreadMove: 1.4, bloom: 0.004, bloomMax: 0.07, adsMul: 0.55, recoil: 0.008, range: 120, fall: [20, 70, 0.6],
      sound: 'smg', zoom: 1.2, buildDmg: 1.0, desc: 'Cadence de tir très élevée.',
    },
    sniper: {
      name: 'Fusil de précision', short: 'Sniper', cat: 'sniper', hold: 'sniper', ammo: 'heavy', model: 'sniper',
      dmg: [null, null, 105, 110, 116], head: 2.5, rate: 0.33, mag: 1, reload: [3.0, 3.0, 2.9, 2.8, 2.7],
      spread: 0.09, spreadMove: 1.5, bloom: 0, bloomMax: 0, adsMul: 0.0, recoil: 0.07, range: 900, fall: [900, 1000, 1],
      sound: 'sniper', zoom: 4.5, scope: true, projectile: { speed: 320, grav: 7 }, buildDmg: 1.0, desc: 'Lunette x4. Un tir à la tête = élimination.',
    },
    semisniper: {
      name: 'Fusil à lunette semi-auto', short: 'Semi-auto', cat: 'sniper', hold: 'sniper', ammo: 'heavy', model: 'semisniper',
      dmg: [null, 63, 66, 69, 72], head: 2.0, rate: 1.3, mag: 10, reload: [2.6, 2.5, 2.4, 2.3, 2.2],
      spread: 0.08, spreadMove: 1.5, bloom: 0.01, bloomMax: 0.03, adsMul: 0.02, recoil: 0.04, range: 700, fall: [700, 800, 1],
      sound: 'sniper', zoom: 3.2, scope: true, projectile: { speed: 300, grav: 7 }, buildDmg: 1.0, desc: 'Lunette x3, tir semi-automatique.',
    },
    hunting: {
      name: 'Fusil de chasse', short: 'Chasse', cat: 'sniper', hold: 'sniper', ammo: 'heavy', model: 'hunting',
      dmg: [86, 90, 95, null, null], head: 2.0, rate: 0.8, mag: 1, reload: [1.9, 1.85, 1.8, 1.8, 1.8],
      spread: 0.06, spreadMove: 1.5, bloom: 0, bloomMax: 0, adsMul: 0.03, recoil: 0.06, range: 600, fall: [600, 700, 1],
      sound: 'revolver', zoom: 2.0, projectile: { speed: 280, grav: 8 }, buildDmg: 1.0, desc: 'Sans lunette, mais redoutable.',
    },
    pistol: {
      name: 'Pistolet', short: 'Pistolet', cat: 'pistol', hold: 'pistol', ammo: 'light', model: 'pistol',
      dmg: [24, 25, 26, 28, 29], head: 2.0, rate: 6.75, mag: 16, reload: [1.5, 1.45, 1.4, 1.35, 1.3],
      spread: 0.016, spreadMove: 1.6, bloom: 0.012, bloomMax: 0.05, adsMul: 0.45, recoil: 0.015, range: 150, fall: [30, 100, 0.65],
      sound: 'pistol', zoom: 1.25, buildDmg: 1.0, desc: 'Fiable et précis.',
    },
    revolver: {
      name: 'Revolver', short: 'Revolver', cat: 'pistol', hold: 'pistol', ammo: 'medium', model: 'revolver',
      dmg: [54, 57, 60, null, null], head: 2.0, rate: 0.9, mag: 6, reload: [2.4, 2.3, 2.2, 2.1, 2.0],
      spread: 0.006, spreadMove: 1.6, bloom: 0.02, bloomMax: 0.05, adsMul: 0.4, recoil: 0.04, range: 200, fall: [40, 140, 0.7],
      sound: 'revolver', zoom: 1.3, buildDmg: 1.0, desc: 'Gros calibre, cadence lente.',
    },
    flintknock: {
      name: 'Pistolet à silex', short: 'Silex', cat: 'pistol', hold: 'pistol', ammo: 'shells', model: 'flint',
      dmg: [null, 64, 68, 72, null], head: 1.5, rate: 1.1, mag: 1, reload: [null, 1.3, 1.2, 1.1, null], pellets: 1,
      spread: 0.012, spreadMove: 1.3, bloom: 0, bloomMax: 0, adsMul: 0.6, recoil: 0.35, range: 70, fall: [12, 45, 0.45],
      sound: 'pump', zoom: 1.15, buildDmg: 1.2, knock: 14, desc: 'Un seul coup qui vous PROPULSE en arrière et repousse la cible : tirez vers le sol pour vous envoler !',
    },
    rocket: {
      name: 'Lance-roquettes', short: 'Lance-roquettes', cat: 'explosive', hold: 'rocket', ammo: 'rockets', model: 'rocket',
      dmg: [null, null, 110, 116, 121], head: 1.0, rate: 0.75, mag: 1, reload: [3.5, 3.4, 3.2, 3.0, 2.8],
      spread: 0.01, spreadMove: 1.5, bloom: 0, bloomMax: 0, adsMul: 0.3, recoil: 0.06, range: 400, fall: [400, 500, 1],
      sound: 'rocket', zoom: 1.4, projectile: { speed: 55, grav: 0, rocket: true, radius: 4.5, buildDmg: 420 }, buildDmg: 1, desc: 'Détruit tout sur son passage.',
    },
    minigun: {
      name: 'Minigun', short: 'Minigun', cat: 'smg', hold: 'rocket', ammo: 'light', model: 'minigun',
      dmg: [null, null, null, 18, 19], head: 1.5, rate: 13, mag: 200, reload: [5, 5, 5, 4.7, 4.5], auto: true, spinUp: 0.6,
      spread: 0.03, spreadMove: 1.3, bloom: 0.002, bloomMax: 0.05, adsMul: 0.7, recoil: 0.004, range: 150, fall: [25, 90, 0.6],
      sound: 'minigun', zoom: 1.15, buildDmg: 1.5, desc: 'Un déluge de balles. Détruit les constructions.',
    },
    grenadelauncher: {
      name: 'Lance-grenades', short: 'Lance-grenades', cat: 'explosive', hold: 'rocket', ammo: 'rockets', model: 'gl',
      dmg: [null, null, 100, 105, 110], head: 1.0, rate: 1.0, mag: 6, reload: [3.2, 3.1, 3.0, 2.9, 2.8],
      spread: 0.02, spreadMove: 1.3, bloom: 0, bloomMax: 0, adsMul: 0.5, recoil: 0.04, range: 200, fall: [200, 300, 1],
      sound: 'grenade_launcher', zoom: 1.2, projectile: { speed: 32, grav: 14, bounce: true, fuse: 2.2, radius: 4, buildDmg: 300 }, buildDmg: 1, desc: 'Grenades rebondissantes.',
    },
    scopedar: {
      name: 'Fusil d\'assaut à lunette', short: 'FA lunette', cat: 'ar', hold: 'rifle', ammo: 'medium', model: 'ar', scopeModel: true,
      dmg: [null, null, 23, 24, 26], head: 1.5, rate: 3.5, mag: 20, reload: [2.3, 2.3, 2.3, 2.2, 2.1], auto: true,
      spread: 0.01, spreadMove: 2.0, bloom: 0.005, bloomMax: 0.04, adsMul: 0.12, recoil: 0.009, range: 320, fall: [80, 250, 0.8],
      sound: 'ar', zoom: 2.6, scope: true, buildDmg: 1.0, desc: 'Lunette x2,5 : précis à longue distance.',
    },
    silenced: {
      name: 'Pistolet silencieux', short: 'Silencieux', cat: 'pistol', hold: 'pistol', ammo: 'light', model: 'pistol', suppressed: true,
      dmg: [null, null, 26, 28, 29], head: 2.0, rate: 5.0, mag: 16, reload: [1.3, 1.3, 1.3, 1.25, 1.2],
      spread: 0.013, spreadMove: 1.5, bloom: 0.01, bloomMax: 0.045, adsMul: 0.4, recoil: 0.012, range: 160, fall: [30, 110, 0.65],
      sound: 'silenced', zoom: 1.3, buildDmg: 1.0, desc: 'Presque inaudible : parfait pour les embuscades.',
    },
    // lance-flammes : cône de feu à courte portée, brûlure, enflamme le bois
    flamethrower: {
      name: 'Lance-flammes', short: 'Lance-flammes', cat: 'shotgun', hold: 'rocket', ammo: 'heavy', model: 'flamethrower', flame: true,
      dmg: [null, null, 7, 8, 9], head: 1, rate: 12, mag: 60, reload: [3, 3, 3, 2.8, 2.6], auto: true,
      spread: 0, spreadMove: 1, bloom: 0, bloomMax: 0, adsMul: 1, recoil: 0.001, range: 10, fall: [10, 12, 1],
      sound: 'flame', zoom: 1.1, buildDmg: 2.5, desc: 'Un jet de flammes à courte portée : brûle les adversaires et met le feu aux constructions en bois.',
    },
    // sabre lumineux : attaques au corps à corps en arc de cercle, clic droit = ruée
    saber: {
      name: 'Sabre lumineux', short: 'Sabre', cat: 'melee', hold: 'melee', ammo: 'light', noAmmo: true, melee: true, model: 'saber',
      dmg: [null, null, 42, 47, 52], head: 1.2, rate: 2.3, mag: 1, reload: [0, 0, 0, 0, 0], auto: true,
      spread: 0, spreadMove: 1, bloom: 0, bloomMax: 0, adsMul: 1, recoil: 0, range: 3.8, fall: [4, 5, 1],
      sound: 'saber', zoom: 1, buildDmg: 1.6, desc: 'Une lame d\'énergie : frappe tout ce qui se trouve devant vous. Clic droit : ruée en avant (toutes les 3 s).',
    },
    // arcs : maintenir le tir pour bander la corde, relâcher pour tirer
    bow: {
      name: 'Arc', short: 'Arc', cat: 'bow', hold: 'bow', ammo: 'arrows', model: 'bow',
      dmg: [null, 62, 68, 74, 82], head: 1.9, rate: 1.6, mag: 1, reload: [0.45, 0.45, 0.42, 0.4, 0.38], charge: 0.85,
      spread: 0.004, spreadMove: 1.6, bloom: 0, bloomMax: 0, adsMul: 0.4, recoil: 0.01, range: 400, fall: [300, 400, 1],
      projectile: { speed: 120, grav: 13, arrow: true }, quiet: true,
      sound: 'bow', zoom: 1.45, buildDmg: 0.8, desc: 'Maintenez le tir pour bander l\'arc, relâchez pour tirer : plus la corde est tendue, plus la flèche va vite et loin.',
    },
    // arme mythique de la Reine des Glaces (Chalet du Pic)
    mythic_icebow: {
      name: 'Arc de glace de la Reine', short: 'Arc de glace', cat: 'bow', hold: 'bow', ammo: 'arrows', model: 'bow', mythic: true,
      dmg: [null, null, null, null, null, 98], head: 1.9, rate: 1.8, mag: 1, reload: [null, null, null, null, null, 0.32], charge: 0.6,
      spread: 0.003, spreadMove: 1.4, bloom: 0, bloomMax: 0, adsMul: 0.4, recoil: 0.01, range: 450, fall: [350, 450, 1],
      projectile: { speed: 150, grav: 10, arrow: true }, quiet: true, freeze: 2.5,
      sound: 'bow', zoom: 1.5, buildDmg: 1.0, desc: 'L\'arc mythique de la Reine : bandé en un éclair, ses flèches de glace RALENTISSENT la cible pendant 2,5 s.',
    },
    boombow: {
      name: 'Arc explosif', short: 'Arc explosif', cat: 'bow', hold: 'bow', ammo: 'arrows', model: 'bow', boom: true,
      dmg: [null, null, 70, 76, 84], head: 1, rate: 1.1, mag: 1, reload: [0.7, 0.7, 0.7, 0.65, 0.6], charge: 1.0,
      spread: 0.006, spreadMove: 1.6, bloom: 0, bloomMax: 0, adsMul: 0.5, recoil: 0.014, range: 400, fall: [300, 400, 1],
      projectile: { speed: 95, grav: 13, arrow: true, explode: true, radius: 3.6, buildDmg: 320 },
      sound: 'bow', zoom: 1.3, buildDmg: 1, desc: 'Des flèches qui explosent à l\'impact. Idéal contre les constructions.',
    },
    // canon du mécha (hors butin)
    mechgun: {
      name: 'Canon de mécha', short: 'Mécha', cat: 'shotgun', hold: 'shotgun', ammo: 'shells', model: 'pump', hidden: true, pellets: 10,
      dmg: [70, 70, 70, 70, 70], head: 1.2, rate: 1.2, mag: 999, reload: [1, 1, 1, 1, 1],
      spread: 0.09, spreadMove: 1, bloom: 0, bloomMax: 0, adsMul: 1, recoil: 0, range: 45, fall: [10, 45, 0.45],
      sound: 'pump', zoom: 1, buildDmg: 3, desc: '',
    },
    // tourelle montée (hors butin)
    turretgun: {
      name: 'Tourelle montée', short: 'Tourelle', cat: 'ar', hold: 'rifle', ammo: 'medium', model: 'ar', hidden: true,
      dmg: [22, 22, 22, 22, 22], head: 1.5, rate: 10, mag: 999, reload: [1, 1, 1, 1, 1], auto: true,
      spread: 0.01, spreadMove: 1, bloom: 0, bloomMax: 0, adsMul: 1, recoil: 0, range: 260, fall: [110, 260, 0.7],
      sound: 'ar', zoom: 1, buildDmg: 1.3, desc: '',
    },
    // mitrailleuses de l'avion (hors butin)
    planegun: {
      name: 'Mitrailleuses d\'avion', short: 'Avion', cat: 'smg', hold: 'rifle', ammo: 'medium', model: 'smg', hidden: true,
      dmg: [18, 18, 18, 18, 18], head: 1.2, rate: 12, mag: 999, reload: [1, 1, 1, 1, 1], auto: true,
      spread: 0.01, spreadMove: 1, bloom: 0, bloomMax: 0, adsMul: 1, recoil: 0, range: 320, fall: [120, 300, 0.7],
      sound: 'smg', zoom: 1, buildDmg: 1.6, desc: '',
    },
    // arme mythique du boss (Château Royal)
    mythic_ar: {
      name: 'Fusil d\'assaut du Roi', short: 'Fusil du Roi', cat: 'ar', hold: 'rifle', ammo: 'medium', model: 'ar', mythic: true,
      dmg: [null, null, null, null, null, 42], head: 1.6, rate: 6.2, mag: 35, reload: [2, 2, 2, 2, 2, 1.7], auto: true,
      spread: 0.009, spreadMove: 1.7, bloom: 0.004, bloomMax: 0.035, adsMul: 0.3, recoil: 0.009, range: 300, fall: [60, 200, 0.75],
      sound: 'ar', zoom: 1.5, buildDmg: 1.2, desc: 'L\'arme mythique du Roi : précise, rapide et dévastatrice.',
    },
    // arme mythique du Général Tonnerre (Base Militaire)
    mythic_rocket: {
      name: 'Lance-roquettes du Général', short: 'Roquettes du Général', cat: 'explosive', hold: 'rocket', ammo: 'rockets', model: 'rocket', mythic: true,
      dmg: [null, null, null, null, null, 125], head: 1.0, rate: 1.6, mag: 2, reload: [2.2, 2.2, 2.2, 2.2, 2.2, 2.0],
      spread: 0.008, spreadMove: 1.4, bloom: 0, bloomMax: 0, adsMul: 0.3, recoil: 0.05, range: 400, fall: [400, 500, 1],
      sound: 'rocket', zoom: 1.5, projectile: { speed: 70, grav: 0, rocket: true, radius: 5, buildDmg: 520 }, buildDmg: 1, desc: 'L\'arme mythique du Général : deux roquettes rapides par chargeur, rechargement éclair.',
    },
    // arme mythique d'Oméga (Usine Rouillée)
    mythic_minigun: {
      name: 'Minigun d\'Oméga', short: 'Minigun d\'Oméga', cat: 'smg', hold: 'rocket', ammo: 'light', model: 'minigun', mythic: true,
      dmg: [null, null, null, null, null, 23], head: 1.5, rate: 15, mag: 300, reload: [4, 4, 4, 4, 4, 3.2], auto: true, spinUp: 0.3,
      spread: 0.022, spreadMove: 1.2, bloom: 0.0015, bloomMax: 0.04, adsMul: 0.6, recoil: 0.003, range: 170, fall: [30, 110, 0.6],
      sound: 'minigun', zoom: 1.2, buildDmg: 2.2, desc: 'L\'arme mythique d\'Oméga : démarre presque instantanément et pulvérise les constructions.',
    },
  };

  I.CONSUMABLES = {
    bandage: { name: 'Bandages', kind: 'heal', hp: 15, cap: 75, time: 3.5, stack: 15, rarity: 0, pickCount: 5, sound: 'bandage', desc: 'Rend 15 PV (jusqu\'à 75).' },
    medkit: { name: 'Kit de soin', kind: 'heal', hp: 100, cap: 100, time: 10, stack: 3, rarity: 1, pickCount: 1, sound: 'medkit', desc: 'Rend tous les PV.' },
    smallshield: { name: 'Petite potion de bouclier', kind: 'shield', shield: 25, cap: 50, time: 2, stack: 6, rarity: 1, pickCount: 3, sound: 'drink', desc: '+25 bouclier (jusqu\'à 50).' },
    shieldpot: { name: 'Potion de bouclier', kind: 'shield', shield: 50, cap: 100, time: 5, stack: 3, rarity: 2, pickCount: 1, sound: 'drink', desc: '+50 bouclier.' },
    slurp: { name: 'Jus de Slurp', kind: 'slurp', total: 75, time: 2, stack: 2, rarity: 3, pickCount: 1, sound: 'drink', desc: '+75 PV/bouclier au fil du temps.' },
    chug: { name: 'Pot de Chug', kind: 'chug', time: 15, stack: 1, rarity: 4, pickCount: 1, sound: 'drink', desc: 'Remplit vie et bouclier.' },
    grenade: { name: 'Grenade', kind: 'throw', dmg: 100, radius: 5, fuse: 2.5, stack: 6, rarity: 1, pickCount: 3, buildDmg: 375, desc: 'Explose après 2,5 s.' },
    impulse: { name: 'Grenade à impulsion', kind: 'throw', impulse: true, radius: 6, fuse: 1.0, stack: 3, rarity: 2, pickCount: 2, desc: 'Projette dans les airs tous ceux qui sont proches (vous compris), sans dégâts de chute.' },
    chugsplash: { name: 'Chug Splash', kind: 'throw', splash: true, radius: 4.5, fuse: 0.9, heal: 20, stack: 6, rarity: 3, pickCount: 2, desc: 'Éclabousse la zone : +20 PV (ou bouclier si PV pleins).' },
    bubble: { name: 'Bulle de bouclier', kind: 'throw', bubble: true, radius: 5, fuse: 0.9, duration: 12, stack: 2, rarity: 3, pickCount: 1, desc: 'Déploie un dôme qui arrête les tirs pendant 12 s.' },
    stink: { name: 'Bombe puante', kind: 'throw', stink: true, radius: 5.5, fuse: 1.2, duration: 9, stack: 5, rarity: 2, pickCount: 2, desc: 'Libère un nuage toxique : 5 dégâts toutes les 0,5 s à ceux qui restent dedans.' },
    smokegren: { name: 'Grenade fumigène', kind: 'throw', smoke: true, radius: 7, fuse: 1.2, duration: 14, stack: 5, rarity: 1, pickCount: 2, desc: 'Crée un épais nuage de fumée : les ennemis ne voient plus à travers.' },
    boogie: { name: 'Bombe boogie', kind: 'throw', boogie: true, radius: 6, fuse: 1.2, stack: 2, rarity: 3, pickCount: 1, desc: 'Force les ennemis à danser !' },
    launchpad: { name: 'Tremplin', kind: 'trap', trap: 'launchpad', stack: 1, rarity: 3, pickCount: 1, desc: 'À poser au sol : propulse dans les airs.' },
    grappler: { name: 'Grappin', kind: 'special', special: 'grapple', stack: 1, rarity: 3, pickCount: 1, charges: 10, desc: 'Visez une surface pour vous y projeter (10 charges).' },
    rift: { name: 'Faille portative', kind: 'special', special: 'rift', stack: 2, rarity: 4, pickCount: 1, desc: 'Ouvre une faille qui vous téléporte dans le ciel.' },
    scanner: { name: 'Scanner de reconnaissance', kind: 'special', special: 'scan', stack: 2, rarity: 3, pickCount: 1, desc: 'Envoie une onde qui révèle les adversaires dans un rayon de 90 m pendant 7 s (carte + marqueurs à travers les murs).' },
    jetpack: { name: 'Jetpack', kind: 'jetpack', stack: 1, rarity: 4, pickCount: 1, desc: 'Sélectionnez-le puis maintenez Espace pour voler ! Le carburant se recharge au sol. Pas de dégâts de chute tant qu\'il reste du carburant.' },
    balloons: { name: 'Ballons', kind: 'balloon', time: 0.3, stack: 12, rarity: 2, pickCount: 6, sound: 'balloon', desc: 'Accrochez jusqu\'à 3 ballons : 1 = chute lente, 2 = vous flottez, 3 = vous montez ! Pas de dégâts de chute. C (accroupi) en l\'air pour en éclater un.' },
    treasuremap: { name: 'Carte au trésor', kind: 'special', special: 'treasure', stack: 1, rarity: 4, pickCount: 1, desc: 'Révèle l\'emplacement d\'un trésor enfoui : arme légendaire, lingots d\'or et bouclier !' },
    portafort: { name: 'Fort portatif', kind: 'special', special: 'fort', stack: 2, rarity: 4, pickCount: 1, desc: 'Construit instantanément une tour en métal.' },
    meat: { name: 'Viande', kind: 'fish', hp: 15, time: 1.0, stack: 6, rarity: 0, pickCount: 1, sound: 'bandage', desc: 'Rend 15 PV.' },
    keycard: { name: 'Carte-clé du Roi', kind: 'key', stack: 1, rarity: 5, pickCount: 1, desc: 'Ouvre la chambre forte du Château Royal.' },
    hoprock: { name: 'Pierre de saut', kind: 'hop', time: 0.8, stack: 6, rarity: 3, pickCount: 2, sound: 'drink', desc: 'Gravité réduite pendant 30 s : vous sautez beaucoup plus haut, sans dégâts de chute.' },
    fishingrod: { name: 'Canne à pêche', kind: 'special', special: 'fish', stack: 1, rarity: 0, pickCount: 1, charges: 12, desc: 'Visez un banc de poissons (remous) et cliquez pour lancer, puis cliquez quand ça mord.' },
    flopper: { name: 'Poisson Flopper', kind: 'fish', hp: 40, time: 1.2, stack: 4, rarity: 1, pickCount: 1, sound: 'bandage', desc: 'Rend 40 PV.' },
    slurpfish: { name: 'Poisson Slurp', kind: 'fish', hp: 40, shield: 40, time: 1.2, stack: 4, rarity: 3, pickCount: 1, sound: 'drink', desc: 'Rend 40 PV et 40 bouclier.' },
    cozyfire: { name: 'Feu de camp portable', kind: 'trap', trap: 'cozyfire', stack: 2, rarity: 3, pickCount: 1, desc: 'À poser au sol : soigne de 2 PV par seconde tous ceux qui sont autour pendant 25 s.' },
    spiketrap: { name: 'Piège à pointes', kind: 'trap', trap: 'spike', stack: 3, rarity: 2, pickCount: 1, desc: 'À poser sur un sol/mur construit.' },
  };

  // nom avec article pour le fil d'éliminations
  const ART = { mythic_icebow: 'l\'arc de glace de la Reine', flintknock: 'le pistolet à silex', mythic_rocket: 'le lance-roquettes du Général', flamethrower: 'le lance-flammes', burn: 'les flammes', boar: 'un sanglier', stink: 'une bombe puante', mechgun: 'le canon d\'un mécha', mech: 'un mécha', turretgun: 'une tourelle montée', saber: 'un sabre lumineux', saber_dash: 'une ruée au sabre', barrel: 'un baril explosif', bow: 'un arc', boombow: 'un arc explosif', mythic_minigun: 'le minigun d\'Oméga', planegun: 'les mitrailleuses d\'un avion', plane: 'un avion', scopedar: 'le fusil d\'assaut à lunette', silenced: 'le pistolet silencieux', mythic_ar: 'le fusil d\'assaut du Roi', ar: 'le fusil d\'assaut', burst: 'le fusil à rafale', pump: 'le fusil à pompe', tactical: 'le fusil à pompe tactique', smg: 'la mitraillette', sniper: 'le fusil de précision', pistol: 'le pistolet', revolver: 'le revolver', semisniper: 'le fusil à lunette semi-auto', hunting: 'le fusil de chasse', rocket: 'le lance-roquettes', minigun: 'le minigun', grenadelauncher: 'le lance-grenades', grenade: 'une grenade', pickaxe: 'la pioche', kart: 'un kart', spiketrap: 'un piège à pointes' };
  I.withArticle = (id) => ART[id] || null;
  I.isWeapon = (id) => !!I.WEAPONS[id];
  I.def = (id) => I.WEAPONS[id] || I.CONSUMABLES[id];
  I.name = (it) => { const d = I.def(it.id); return d ? d.name : it.id; };
  I.damage = (it) => {
    const w = I.WEAPONS[it.id];
    if (!w) return 0;
    let d = w.dmg[it.rarity];
    if (d == null) { for (let r = it.rarity; r >= 0; r--) if (w.dmg[r] != null) { d = w.dmg[r]; break; } if (d == null) d = w.dmg.find((x) => x != null); }
    return d;
  };
  I.reloadTime = (it) => { const w = I.WEAPONS[it.id]; return w.reload[it.rarity] || w.reload[2]; };
  I.validRarities = (id) => { const w = I.WEAPONS[id]; if (!w) return [I.CONSUMABLES[id].rarity]; return w.dmg.map((d, i) => (d != null ? i : -1)).filter((i) => i >= 0); };

  I.make = function (id, rarity, count) {
    const w = I.WEAPONS[id];
    if (w) {
      const rs = I.validRarities(id);
      if (rarity == null || rs.indexOf(rarity) < 0) rarity = rs.reduce((a, b) => (Math.abs(b - (rarity || 0)) < Math.abs(a - (rarity || 0)) ? b : a), rs[0]);
      return { id, rarity, ammo: w.mag, count: 1 };
    }
    const c = I.CONSUMABLES[id];
    return { id, rarity: c.rarity, count: count || c.pickCount, ammo: c.charges || 0 };
  };

  // ------------------------------------------------------------
  //  Tables de loot
  // ------------------------------------------------------------
  const U = G.U;
  I.randomRarity = function (bonus, rng) {
    rng = rng || Math.random;
    const w = [[0, 34 - bonus * 12], [1, 30 - bonus * 6], [2, 22 + bonus * 6], [3, 10 + bonus * 7], [4, 4 + bonus * 5]];
    return U.weighted(w.map((e) => [e[0], Math.max(1, e[1])]), rng);
  };
  I.randomWeapon = function (bonus, rng) {
    rng = rng || Math.random;
    const id = U.weighted([['ar', 22], ['pump', 16], ['smg', 14], ['pistol', 12], ['tactical', 9], ['burst', 7], ['sniper', 5], ['semisniper', 3], ['hunting', 4], ['rocket', 4], ['revolver', 5], ['minigun', 2], ['grenadelauncher', 3], ['scopedar', 4], ['silenced', 5], ['bow', 4], ['boombow', 2], ['saber', 2], ['flamethrower', 2], ['flintknock', 3]], rng);
    return I.make(id, I.randomRarity(bonus, rng));
  };
  I.randomConsumable = function (rng) {
    rng = rng || Math.random;
    const id = U.weighted([['bandage', 20], ['smallshield', 20], ['medkit', 9], ['shieldpot', 10], ['slurp', 5], ['chug', 1.5], ['grenade', 10], ['boogie', 3], ['impulse', 4], ['chugsplash', 4], ['bubble', 2.5], ['stink', 3], ['smokegren', 3], ['cozyfire', 2], ['launchpad', 2.5], ['spiketrap', 3], ['grappler', 2.5], ['rift', 1.5], ['portafort', 2], ['balloons', 3], ['jetpack', 1.2], ['scanner', 2.5]], rng);
    return I.make(id);
  };
  I.ammoFor = (id) => { const w = I.WEAPONS[id]; return w ? w.ammo : null; };

  // Description de l'arme (dégâts, cadence...) pour l'infobulle
  I.stats = function (it) {
    const w = I.WEAPONS[it.id];
    if (!w) return null;
    return { dps: Math.round(I.damage(it) * (w.pellets ? 1 : 1) * w.rate), dmg: I.damage(it), rate: w.rate, mag: w.mag, reload: I.reloadTime(it) };
  };
})();
