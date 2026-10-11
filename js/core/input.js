// ============================================================
//  Entrées clavier / souris  (ZQSD = codes physiques KeyW/A/S/D)
//
//  Les raccourcis ne sont plus écrits en dur dans le jeu : chaque
//  action a un identifiant, et G.Input interroge la table de
//  correspondance. Les boutons de souris sont traités comme des
//  codes ('Mouse0'..'Mouse4') pour qu'une action puisse être
//  assignée indifféremment au clavier ou à la souris.
// ============================================================
(function () {
  const I = {
    keys: {},          // par e.code
    labels: {},        // par e.key (minuscule)
    pressed: {},       // fronts montants cette frame (code et 'k:'+label)
    mouse: { dx: 0, dy: 0, left: false, right: false, middle: false, leftPressed: false, rightPressed: false, leftReleased: false, rightReleased: false, wheel: 0, x: 0, y: 0 },
    locked: false,
    enabled: true,
    listeners: [],
    releasedCodes: {},   // fronts de relâchement, vidé chaque frame
    lockFailed: false,   // le navigateur a refusé la capture du pointeur
    overCanvas: false,   // le curseur est sur la fenêtre de jeu (mode souris libre)
    edgeX: 0, edgeY: 0,  // rotation cumulée par les bords d'écran (mode souris libre)
  };
  G.Input = I;

  const MOVE_CODES = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1 };

  // ------------------------------------------------------------
  //  Actions
  // ------------------------------------------------------------
  // def = raccourcis par défaut. Plusieurs codes = action attainable
  // par les deux mains, ou par les deux dispositions du clavier.
  const DEFS = [
    ['— Déplacement —'],
    ['moveForward', 'Avancer', ['KeyW', 'ArrowUp']],
    ['moveBack', 'Reculer', ['KeyS', 'ArrowDown']],
    ['moveLeft', 'Aller à gauche', ['KeyA', 'ArrowLeft']],
    ['moveRight', 'Aller à droite', ['KeyD', 'ArrowRight']],
    ['jump', 'Sauter', ['Space']],
    ['sprint', 'Sprinter', ['ShiftLeft', 'ShiftRight']],
    ['crouch', 'S\'accroupir (maintenu)', ['ControlLeft']],
    ['crouchToggle', 'Accroupi / ballon', ['KeyC']],
    ['— Armes —'],
    ['fire', 'Tirer / frapper / construire', ['Mouse0']],
    ['aim', 'Viser', ['Mouse1']],
    ['reload', 'Recharger', ['KeyR']],
    ['drop', 'Jeter l\'objet', ['KeyX']],
    ['pickaxe', 'Pioche', ['KeyF']],
    ['slot1', 'Emplacement 1', ['Digit1', 'Numpad1']],
    ['slot2', 'Emplacement 2', ['Digit2', 'Numpad2']],
    ['slot3', 'Emplacement 3', ['Digit3', 'Numpad3']],
    ['slot4', 'Emplacement 4', ['Digit4', 'Numpad4']],
    ['slot5', 'Emplacement 5', ['Digit5', 'Numpad5']],
    ['nextMat', 'Changer de matériau', ['Mouse1']],
    ['— Construction —'],
    ['buildMode', 'Mode construction', ['KeyA']],
    ['buildWall', 'Mur', ['F1']],
    ['buildFloor', 'Sol', ['F2']],
    ['buildRamp', 'Rampe', ['F3']],
    ['buildRoof', 'Toit', ['F4']],
    ['edit', 'Modifier une construction', ['KeyG']],
    ['— Interaction —'],
    ['interact', 'Ramasser / ouvrir / parler', ['KeyE']],
    ['ping', 'Placer un marqueur', ['KeyV', 'Mouse2']],
    ['emote', 'Roue des emotes', ['KeyB']],
    ['spray', 'Poser un tag', ['KeyT']],
    ['horn', 'Klaxonner (voiture)', ['KeyH']],
    ['radio', 'Station de radio', ['KeyR']],
    ['augment', 'Choisir une augmentation', ['KeyU']],
    ['sandboxMenu', 'Menu du terrain de jeu', ['KeyO']],
    ['sandboxTargets', 'Cibles d\'entraînement', ['KeyY']],
    ['— Caméra (clavier) —'],
    ['camLeft', 'Tourner la caméra à gauche', ['KeyJ', 'Numpad4']],
    ['camRight', 'Tourner la caméra à droite', ['KeyL', 'Numpad6']],
    ['camUp', 'Lever la caméra', ['KeyI', 'Numpad8']],
    ['camDown', 'Baisser la caméra', ['KeyK', 'Numpad2']],
    ['— Caméra et interface —'],
    ['map', 'Carte', ['KeyM']],
    ['inventory', 'Inventaire', ['Tab']],
    ['freecam', 'Caméra libre', ['KeyP']],
    ['pause', 'Pause', ['Escape']],
  ];

  const ACTIONS = [];
  const GROUPS = [];
  for (const row of DEFS) {
    if (row.length === 1) { GROUPS.push({ title: row[0], actions: [] }); continue; }
    const a = { id: row[0], label: row[1], def: row[2].slice() };
    ACTIONS.push(a);
    GROUPS[GROUPS.length - 1].actions.push(a);
  }
  const BY_ID = {};
  for (const a of ACTIONS) BY_ID[a.id] = a;
  I.ACTIONS = ACTIONS;
  I.GROUPS = GROUPS;

  // Table effective : lue dans les réglages du compte, sinon les défauts.
  function table() {
    const s = G.Store && G.Store.data && G.Store.data.settings;
    if (!s) return null;
    if (!s.binds) s.binds = {};
    return s.binds;
  }
  I.codes = function (id) {
    const t = table();
    const own = t && t[id];
    const list = Array.isArray(own) && own.length ? own : BY_ID[id].def;
    return list;
  };
  I.save = function () {
    const t = table();
    if (t && G.Store) G.Store.save();
  };
  I.defaults = function () {
    const t = table();
    if (!t) return;
    for (const a of ACTIONS) delete t[a.id];
    I.save();
  };
  I.resetAction = function (id) {
    const t = table(); if (!t) return;
    delete t[id];
    I.save();
  };
  // Remplace le raccourci principal. slot = 0 pour le premier.
  I.setBind = function (id, code, slot) {
    const t = table(); if (!t) return false;
    const a = BY_ID[id]; if (!a) return false;
    const cur = Array.isArray(t[id]) ? t[id].slice() : a.def.slice();
    while (cur.length <= (slot || 0)) cur.push(null);
    cur[slot || 0] = code;
    // pas deux fois le même code dans la même action
    for (let i = 0; i < cur.length; i++) if (i !== (slot || 0) && cur[i] === code) cur[i] = null;
    t[id] = cur.filter((c) => !!c);
    I.save();
    return true;
  };
  I.clearBind = function (id, slot) {
    const t = table(); if (!t) return;
    const a = BY_ID[id]; if (!a) return;
    const cur = Array.isArray(t[id]) ? t[id].slice() : a.def.slice();
    if (cur.length <= slot) return;
    cur[slot] = null;
    t[id] = cur.filter((c) => !!c);
    if (!t[id].length) delete t[id];
    I.save();
  };
  I.isCustom = function (id) {
    const t = table(); if (!t) return false;
    const own = t[id];
    if (!own) return false;
    const d = BY_ID[id].def;
    return own.length !== d.length || own.some((c, i) => c !== d[i]);
  };
  I.customCount = function () { return ACTIONS.filter((a) => I.isCustom(a.id)).length; };

  // code -> [actions] : sert à surligner les doublons dans l'interface
  I.conflicts = function () {
    const map = {};
    for (const a of ACTIONS) {
      for (const c of I.codes(a.id)) {
        (map[c] = map[c] || []).push(a);
      }
    }
    return map;
  };
  I.conflictOf = function (id) {
    const map = I.conflicts(), out = [];
    for (const c of I.codes(id)) if (map[c] && map[c].length > 1) for (const a of map[c]) if (a.id !== id) out.push(a);
    return out;
  };

  I.exportBinds = function () {
    const o = {};
    for (const a of ACTIONS) o[a.id] = I.codes(a.id).slice();
    return JSON.stringify(o);
  };
  I.importBinds = function (text) {
    const t = table(); if (!t) return false;
    let o = null;
    try { o = JSON.parse(text); } catch (e) { return false; }
    for (const k in o) {
      if (!BY_ID[k] || !Array.isArray(o[k])) continue;
      const list = o[k].filter((c) => typeof c === 'string' && c.length < 24);
      if (list.length) t[k] = list; else delete t[k];
    }
    I.save();
    return true;
  };

  // ------------------------------------------------------------
  // ------------------------------------------------------------
  //  Disposition du clavier
  //
  //  Le jeu joue sur e.code : la position physique de la touche. C'est
  //  ce qui fait que ZQSD fonctionne en AZERTY comme en QWERTY. En
  //  revanche l'AFFICHAGE doit montrer la lettre réellement imprimée
  //  sur la touche, sinon l'écran annonce « W » là où le clavier dit « Z ».
  // ------------------------------------------------------------
  // Code physique (position QWERTY) -> lettre imprimée en AZERTY
  const AZERTY = {
    KeyQ: 'A', KeyW: 'Z', KeyA: 'Q', KeyZ: 'W',
  };
  // Sur la rangée du haut d'un AZERTY, les chiffres demandent Maj :
  // sans Maj on obtient & é " ' ( - è _ ç à.
  const AZERTY_TOP = {
    Digit1: '&', Digit2: 'é', Digit3: '"', Digit4: "'", Digit5: '(',
    Digit6: '-', Digit7: 'è', Digit8: '_', Digit9: 'ç', Digit0: 'à',
  };

  function detectLayout() {
    const s = G.Store && G.Store.data && G.Store.data.settings;
    const pref = s && s.layout ? s.layout : 'auto';
    if (pref === 'azerty' || pref === 'qwerty') return pref;
    // auto : le navigateur annonce la langue du clavier dans la plupart des cas
    let lang = '';
    try { lang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase(); } catch (e) { lang = ''; }
    if (/^fr|azerty/.test(lang)) return 'azerty';
    return 'azerty';   // valeur par défaut : public francophone
  }
  I.isAzerty = function () { return detectLayout() === 'azerty'; };
  I.setLayout = function (v) {
    const s = G.Store && G.Store.data && G.Store.data.settings;
    if (!s) return;
    s.layout = v;
    G.Store.save();
  };

  // ------------------------------------------------------------
  //  Étiquettes lisibles
  // ------------------------------------------------------------
  const NICE = {
    Space: 'Espace', ShiftLeft: 'Maj gauche', ShiftRight: 'Maj droit',
    ControlLeft: 'Ctrl gauche', ControlRight: 'Ctrl droit',
    AltLeft: 'Alt gauche', AltRight: 'Alt droit', Escape: 'Échap', Tab: 'Tab',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Enter: 'Entrée', Backspace: 'Retour arrière', CapsLock: 'Verr Maj',
    Mouse0: 'Clic gauche', Mouse1: 'Clic droit', Mouse2: 'Clic molette',
    Mouse3: 'Molette avant', Mouse4: 'Molette arrière',
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'",
    BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=',
  };
  I.nice = function (code) {
    if (!code) return '—';
    if (NICE[code]) return NICE[code];
    // AZERTY : montrer la lettre réellement gravée sur la touche
    if (I.isAzerty()) {
      if (AZERTY[code]) return AZERTY[code];
      if (AZERTY_TOP[code]) return AZERTY_TOP[code] + ' (Maj)';
    }
    let m = /^Key([A-Z])$/.exec(code);
    if (m) return m[1];
    m = /^Digit(\d)$/.exec(code);
    if (m) return m[1];
    m = /^Numpad(\d)$/.exec(code);
    if (m) return 'Pavé ' + m[1];
    m = /^Numpad(Add|Subtract|Multiply|Divide|Decimal)$/.exec(code);
    if (m) return { Add: 'Pavé +', Subtract: 'Pavé -', Multiply: 'Pavé *', Divide: 'Pavé /', Decimal: 'Pavé .' }[m[1]];
    return code.replace(/^([A-Za-z]+)([0-9]*)$/, function (_, a, b) { return a.toUpperCase() + b; });
  };
  I.niceAll = function (id) { return I.codes(id).map(I.nice).join(' ou '); };

  // ------------------------------------------------------------
  //  Requêtes d'action
  // ------------------------------------------------------------
  I.down = function (id) {
    const c = I.codes(id);
    for (let i = 0; i < c.length; i++) if (I.keys[c[i]]) return true;
    return false;
  };
  I.hit = function (id) {
    const c = I.codes(id);
    for (let i = 0; i < c.length; i++) if (I.pressed[c[i]]) return true;
    return false;
  };
  // Relâchement : clavier ET souris. Le drapeau vit une frame, comme
  // les fronts montants, sinon un relâchement serait vu plusieurs fois.
  I.released = function (id) {
    const c = I.codes(id);
    for (let i = 0; i < c.length; i++) if (I.releasedCodes[c[i]]) return true;
    return false;
  };

  // ------------------------------------------------------------
  //  Capture : la prochaine touche ou le prochain clic est renvoyé
  // ------------------------------------------------------------
  let capCb = null, capEscape = false;
  I.capturing = () => !!capCb;
  I.capture = function (cb, allowEscape) { capCb = cb; capEscape = !!allowEscape; I.openedAt = performance.now(); };
  I.cancelCapture = function () {
    if (!capCb) return;
    const cb = capCb; capCb = null;
    cb(null);
  };
  function takeCapture(code, e) {
    if (!capCb) return false;
    const cb = capCb;
    if (code === 'Escape' && !capEscape) { capCb = null; cb(null); return true; }
    capCb = null;
    if (e) { e.preventDefault(); e.stopPropagation(); }
    cb(code);
    return true;
  }

  I.isDown = (code) => !!I.keys[code];
  I.wasPressed = (code) => !!I.pressed[code];
  // Action liée à une lettre affichée (AZERTY) : on ignore si la touche est aussi une touche de déplacement
  I.labelPressed = (letter) => !!I.pressed['k:' + letter];
  I.labelDown = (letter) => !!I.labels[letter];

  I.forward = () => (I.down('moveForward') ? 1 : 0) - (I.down('moveBack') ? 1 : 0);
  I.strafe = () => (I.down('moveRight') ? 1 : 0) - (I.down('moveLeft') ? 1 : 0);

  // ------------------------------------------------------------
  //  Jouable = le clavier agit, même sans capture de la souris.
  //  Avant, tout le gameplay était conditionné à In.locked : si le
  //  navigateur refusait le pointer lock, le joueur ne pouvait plus
  //  bouger du tout. Le clavier ne dépend plus de la souris.
  // ------------------------------------------------------------
  I.playing = function () {
    if (!I.enabled) return false;
    const g = G.Game;
    if (!g) return false;
    if (g.state !== 'warmup' && g.state !== 'bus' && g.state !== 'playing' && g.state !== 'ended') return false;
    if (g.state === 'ended' && G.Match && G.Match.endShown) return false;
    return !(G.HUD && G.HUD.modalOpen());
  };

  // Rotation de la caméra au clavier : -1..1 sur chaque axe.
  I.lookX = () => (I.down('camRight') ? 1 : 0) - (I.down('camLeft') ? 1 : 0);
  I.lookY = () => (I.down('camUp') ? 1 : 0) - (I.down('camDown') ? 1 : 0);
  // La caméra pivote-t-elle avec la souris ? (capturée, ou mode souris libre)
  I.mouseLook = function () {
    if (I.locked) return true;
    // souris libre : on pivote quand le curseur touche un bord de l'écran
    return !I.locked && !I.lockFailed && I.overCanvas && (I.edgeX !== 0 || I.edgeY !== 0);
  };
  // Décalage de rotation produit par la souris libre (pixels)
  I.freeLook = () => ({ x: I.edgeX, y: I.edgeY });

  I.onKey = (fn) => I.listeners.push(fn);

  // Une touche pressée alors que le focus est sur l'interface (menus,
  // champs, panneaux) ne doit pas piloter le personnage. La capture des
  // raccourcis a la priorité : c'est elle qui permet de choisir une touche.
  const CANVAS = () => document.getElementById('game-canvas');
  function inUI(e) {
    const t = e.target;
    if (!t || t === window || t === document.body || t === document.documentElement) return false;
    const c = CANVAS();
    return !(t === c || (c && c.contains && c.contains(t)));
  }
  function editable(e) {
    const t = e.target;
    if (!t || !t.tagName) return false;
    const tag = t.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  }

  // Phase de capture : l'événement est vu AVANT que les menus ne puissent
  // l'arrêter. Sans cela, la boîte des paramètres faisait stopPropagation et
  // aucune touche ne pouvait être enregistrée.
  window.addEventListener('keydown', (e) => {
    if (takeCapture(e.code, e)) return;
    if (inUI(e) || editable(e)) return;
    const k = (e.key || '').toLowerCase();
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('F') && e.code.length <= 3 || e.code === 'AltLeft') {
      if (!(e.code === 'F5' || e.code === 'F12' || e.code === 'F11')) e.preventDefault();
    }
    if (e.ctrlKey && (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyD')) e.preventDefault();
    if (!I.keys[e.code]) {
      I.pressed[e.code] = true;
      if (!MOVE_CODES[e.code]) I.pressed['k:' + k] = true;
    }
    I.keys[e.code] = true;
    if (!MOVE_CODES[e.code]) I.labels[k] = true;
    for (const fn of I.listeners) fn(e, true);
  }, true);
  // Une touche laissée « collée » parce que le jeu a perdu le focus
  // (Alt+Tab, ouverture d'un menu) bloquerait le personnage : au retour
  // du focus on repart d'un état propre.
  window.addEventListener('keyup', (e) => {
    const k = (e.key || '').toLowerCase();
    if (I.keys[e.code]) I.releasedCodes[e.code] = true;
    I.keys[e.code] = false;
    I.labels[k] = false;
    for (const fn of I.listeners) fn(e, false);
  }, true);
  window.addEventListener('blur', () => { I.keys = {}; I.labels = {}; I.mouse.left = I.mouse.right = I.mouse.middle = false; });
  window.addEventListener('focus', () => {
    // Une touche pressée avant la perte de focus a généré un « keydown »
    // sans « keyup » : on la nettoie pour éviter un déplacement fantôme.
    setTimeout(() => { I.keys = {}; I.labels = {}; }, 30);
  });

  // -- Souris libre : quand le pointer lock est refusé ou perdu, on
  //    laisse tourner la caméra en poussant le curseur vers un bord.
  const EDGE = 26;          // largeur de la zone sensible, en pixels
  const EDGE_SPEED = 0.55;  // pixels de rotation par image et par pixel de dépassement
  function freeLook(e) {
    const w = window.innerWidth, h = window.innerHeight;
    let ox = 0, oy = 0;
    if (e.clientX <= EDGE) ox = -(EDGE - e.clientX);
    else if (e.clientX >= w - EDGE) ox = (e.clientX - (w - EDGE));
    if (e.clientY <= EDGE) oy = -(EDGE - e.clientY);
    else if (e.clientY >= h - EDGE) oy = (e.clientY - (h - EDGE));
    I.edgeX = ox; I.edgeY = oy;
  }
  window.addEventListener('mouseover', (e) => { if (!e.relatedTarget) I.overCanvas = true; });
  window.addEventListener('mouseout', (e) => { if (!e.relatedTarget) I.overCanvas = false; });
  document.addEventListener('mouseleave', () => { I.overCanvas = false; I.edgeX = 0; I.edgeY = 0; });

  window.addEventListener('mousemove', (e) => {
    I.mouse.x = e.clientX; I.mouse.y = e.clientY;
    if (I.locked) {
      // limite les sauts parasites de certains navigateurs
      const mx = U_clamp(e.movementX, -250, 250), my = U_clamp(e.movementY, -250, 250);
      I.mouse.dx += mx; I.mouse.dy += my;
    } else if (I.playing() && !I.lockFailed) {
      // souris libre : la rotation vient du dépassement de bord
      freeLook(e);
      const vx = I.edgeX * EDGE_SPEED, vy = I.edgeY * EDGE_SPEED;
      if (vx) I.mouse.dx += vx;
      if (vy) I.mouse.dy += vy;
    } else {
      I.overCanvas = true;
    }
  });
  function U_clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  window.addEventListener('mousedown', (e) => {
    if (takeCapture('Mouse' + e.button, e)) return;
    if (inUI(e) && !I.locked) return;
    // le clic qui vient d'ouvrir la capture ne doit pas être pris
    // pour une assignation de bouton de souris
    if (I.openedAt && performance.now() - I.openedAt < 350) return;
    // les boutons entrent dans la table des codes : une action peut
    // donc être assignée au clic comme à une touche
    I.keys['Mouse' + e.button] = true;
    I.pressed['Mouse' + e.button] = true;
    if (e.button === 0) { I.mouse.left = true; I.mouse.leftPressed = true; }
    if (e.button === 2) { I.mouse.right = true; I.mouse.rightPressed = true; }
    if (e.button === 1) { I.mouse.middle = true; I.mouse.middlePressed = true; e.preventDefault(); }
  });
  window.addEventListener('mouseup', (e) => {
    if (I.keys['Mouse' + e.button]) I.releasedCodes['Mouse' + e.button] = true;
    I.keys['Mouse' + e.button] = false;
    if (e.button === 0) { I.mouse.left = false; I.mouse.leftReleased = true; }
    if (e.button === 2) { I.mouse.right = false; I.mouse.rightReleased = true; }
    if (e.button === 1) { I.mouse.middle = false; I.mouse.middleReleased = true; }
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('wheel', (e) => { I.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });

  document.addEventListener('pointerlockchange', () => {
    I.locked = document.pointerLockElement != null;
    if (I.locked) I.lockFailed = false;
    if (G.Game && G.Game.onPointerLockChange) G.Game.onPointerLockChange(I.locked);
  });
  // certains navigateurs (contexte sécurisé, iframes) refusent la capture :
  // on le note pour basculer en souris libre au lieu de rester bloqué.
  document.addEventListener('pointerlockerror', () => {
    I.locked = false; I.lockFailed = true;
    if (G.HUD && G.HUD.notify) {
      G.HUD.notify(window.isSecureContext
        ? 'Capture de la souris refusée — souris libre : I J K L pour la caméra'
        : 'Site en HTTP : le navigateur bloque la capture de la souris. Publie en HTTPS, ou utilise I J K L pour la caméra.', 7);
    }
  });
  // Le pointer lock exige un contexte sécurisé (HTTPS) : sans cela,
  // aucune invitation n'est faite, ce qui laisserait croire à un bug.
  I.needsHttps = function () {
    if (window.isSecureContext) return false;
    const h = location.protocol;
    return h === 'http:' || h === 'file:';
  };

  let lockPending = false;
  I.requestLock = () => {
    const c = document.getElementById('game-canvas');
    if (!c || I.locked || lockPending) return;
    lockPending = true;
    const done = () => { lockPending = false; };
    try {
      const p = c.requestPointerLock({ unadjustedMovement: false });
      if (p && p.then) p.then(() => { done(); }, () => { I.lockFailed = true; done(); try { c.requestPointerLock(); } catch (e) {} });
      else done();
    } catch (e) {
      I.lockFailed = true; done();
      try { c.requestPointerLock(); } catch (e2) {}
    }
    // si rien ne se passe, on abandonne la capture et on passe en souris libre
    setTimeout(() => { if (!I.locked && !lockPending) I.lockFailed = true; done(); }, 400);
  };
  I.exitLock = () => { if (document.pointerLockElement) document.exitPointerLock(); };

  // Appelé à la fin de chaque frame
  I.endFrame = () => {
    I.pressed = {};
    I.mouse.dx = 0; I.mouse.dy = 0; I.mouse.wheel = 0;
    I.mouse.leftPressed = I.mouse.rightPressed = I.mouse.middlePressed = false;
    I.mouse.leftReleased = I.mouse.rightReleased = I.mouse.middleReleased = false;
    I.releasedCodes = {};
  };
})();
