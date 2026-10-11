// ============================================================
//  Pont entre les réglages d'administration et la partie en cours.
//
//  G.Auth ne connaît rien du jeu : il stocke des règles. C'est ici
//  qu'elles sont appliquées, une fois par partie et en continu
//  pendant la partie.
//
//  Le mode créatif s'appuie sur les drapeaux que le jeu possède déjà
//  (infiniteMats, infiniteAmmo, invulnerable, noFallT) : aucun
//  branchement n'est nécessaire dans actor.js ni dans combat.js.
// ============================================================
(function () {
  const S = {};
  G.Server = S;

  // Bascule par session : ce n'est pas un réglage du serveur, c'est
  // un outil de test que l'admin s'accorde à lui-même.
  const CREATIVE = { on: false, mats: false, ammo: false, god: false, noFall: false };
  S.creative = () => CREATIVE;

  S.canCreative = function () {
    const A = G.Auth;
    if (!A || !A.session()) return false;
    if (!A.rules().creativeAllowed) return false;
    return A.can('users.view');
  };

  S.setCreative = function (key, value) {
    if (!S.canCreative()) return { ok: false, error: 'Permission refusée (mode créatif).' };
    if (key !== 'on' && !(key in CREATIVE)) return { ok: false, error: 'Option inconnue : ' + key };
    CREATIVE[key] = key === 'on' ? !!value : !!value;
    if (key === 'on' && !value) { CREATIVE.mats = CREATIVE.ammo = CREATIVE.god = CREATIVE.noFall = false; }
    if (value && key !== 'on') CREATIVE.on = true;
    G.Audio.play('ui_click');
    return { ok: true, creative: CREATIVE };
  };
  S.allCreative = function (value) {
    if (!S.canCreative()) return { ok: false, error: 'Permission refusée (mode créatif).' };
    const v = !!value;
    CREATIVE.on = v; CREATIVE.mats = v; CREATIVE.ammo = v; CREATIVE.god = v; CREATIVE.noFall = v;
    return { ok: true, creative: CREATIVE };
  };

  // ------------------------------------------------------------
  //  Outils admin en partie (touche F4)
  //
  //  Réservés aux administrateurs (rang 2). Comme le mode créatif,
  //  ce sont des outils de test propres à la session : rien n'est
  //  écrit dans la base et rien ne touche le classement.
  // ------------------------------------------------------------
  // Etat interne : jamais exposé tel quel, seul dev() le lit.
  const DEV = {
    fly: false,       // vol libre
    noclip: false,    // traverse les murs
    speed: false,     // vitesse accélérée
    aimbot: false,    // vise automatiquement l'ennemi le plus proche
    esp: false,       // silhouettes et distances des adversaires
    invincible: false,
  };
  // Vue publique : chaque option est un accesseur en lecture seule branché
  // sur l'état réel. Une écriture directe depuis la console
  // (G.Server.dev().fly = true) est donc réellement refusée, et non
  // simplement ignorée. Seul toggleDev, qui contrôle le rang, modifie
  // l'état.
  const devView = {};
  for (const k in DEV) {
    Object.defineProperty(devView, k, { get: () => DEV[k], enumerable: true });
  }
  Object.freeze(devView);
  S.dev = () => devView;

  // Administrateurs seulement : le rang modérateur ne suffit pas.
  S.canDev = function () {
    const A = G.Auth;
    if (!A || !A.session()) return false;
    if (!A.isAdmin()) return false;
    return true;
  };

  // Écriture interne : la vue lit directement dans DEV via ses accesseurs.
  function setDev(key, value) { DEV[key] = !!value; }

  S.toggleDev = function (key) {
    if (!S.canDev()) return { ok: false, error: 'Réservé aux administrateurs.' };
    if (!(key in DEV)) return { ok: false, error: 'Option inconnue : ' + key };
    setDev(key, !DEV[key]);
    // Dépendance : traverser les murs suppose d'être en mouvement
    // libre ; on ne la laisse pas activée seule, sans effet visible.
    if (!DEV.fly && !DEV.speed && DEV.noclip) setDev('noclip', false);
    G.Audio.play('ui_click');
    return { ok: true, dev: devView };
  };
  S.allDevOff = function () {
    if (!S.canDev()) return { ok: false, error: 'Réservé aux administrateurs.' };
    for (const k in DEV) setDev(k, false);
    return { ok: true, dev: devView };
  };
  // Coupure d'urgence : appelée quand les droits disparaissent.
  S.devRevoke = function () {
    for (const k in DEV) setDev(k, false);
  };
  let devStarted = false;

  // Cible la plus proche visible, pour l'aimbot et l'ESP.
  S.nearestEnemy = function () {
    const pl = G.player;
    if (!pl || !G.Combat) return null;
    let best = null, bd = 1e9;
    const fx = -Math.sin(pl.camYaw), fz = -Math.cos(pl.camYaw);
    for (const a of G.Combat.actors) {
      if (a === pl || a.dead || !a.hittable || !a.hittable()) continue;
      if (G.Duo && G.Duo.sameTeam(pl, a)) continue;
      const dx = a.pos.x - pl.pos.x, dy = a.pos.y - pl.pos.y, dz = a.pos.z - pl.pos.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > 120) continue;
      // on privilégie ce qui est devant la caméra
      const dot = d > 0.01 ? (dx * fx + dz * fz) / Math.hypot(dx, dz) : 1;
      const score = d * (dot < 0.2 ? 3 : 1);
      if (score < bd) { bd = score; best = a; }
    }
    return best;
  };

  // Application continue des outils sur le joueur.
  S.applyDev = function (dt) {
    if (!S.canDev() || !G.player) return;
    const pl = G.player;
    const playing = G.Game.state === 'playing' || G.Game.state === 'bus' || G.Game.state === 'warmup';
    if (!playing) return;

    if (DEV.invincible) { pl.invulnerable = true; if (pl.health < 100) pl.health = 100; }

    if (DEV.speed) { pl.runMul = Math.max(pl.runMul || 1, 1.9); }
    if (DEV.fly) {
      // annule la gravité et laisse les entrées piloter les trois axes
      pl.vel.y = 0;
      if (pl.grounded) pl.grounded = false;
      pl.flying = true;
    } else if (pl.flying) {
      pl.flying = false;
    }
    if (DEV.noclip) pl.noclipT = Math.max(pl.noclipT || 0, 0.2);
  };

  // ------------------------------------------------------------
  //  Règles au lancement d'une partie
  // ------------------------------------------------------------
  // Appelé par M.start juste après la lecture des réglages du joueur,
  // sinon un joueur réécrit la règle depuis son menu.
  S.applyMatchRules = function () {
    const done = G.Auth.applyRules(G.Store.data.settings);
    if (done.length && G.Menu) G.Menu.refreshLobby();
    return done;
  };

  // Multiplicateur de dégâts de tempête lu par le module Storm.
  S.stormScale = function () {
    const n = G.Auth.rules().stormScale;
    return isFinite(n) && n > 0 ? n : 1;
  };

  // ------------------------------------------------------------
  //  Boucle : diffusion + maintien du mode créatif
  // ------------------------------------------------------------
  let bcT = 0;
  S.tick = function (dt) {
    // Sécurité : appelé à chaque frame, même en pause ou dans le menu.
    // Si le rang administrateur disparaît (déconnexion, session fermée),
    // les outils sont coupés dans la frame même, sans laisser subsister
    // le moindre drapeau actif.
    const allowed = S.canDev();
    if (!allowed) {
      S.devRevoke();
      if (G.DevMenu) {
        if (G.DevMenu.group) G.DevMenu.group.visible = false;
        if (G.DevMenu.open) G.DevMenu.close();
      }
    }
    devStarted = allowed;
    // diffusion : une seule fois, à la reception
    bcT += dt;
    if (bcT > 0.6) {
      bcT = 0;
      const b = G.Auth.consumeBroadcast();
      if (b) G.HUD.notify('⚑ ' + b.text + '  —  ' + b.by, 6);
    }
    const pl = G.player;
    if (!pl || !CREATIVE.on) return;
    const playing = G.Game.state === 'playing' || G.Game.state === 'bus' || G.Game.state === 'warmup';
    if (!playing) return;
    // Réaffectés chaque frame : une réapparition ou le début de partie
    // remet ces drapeaux à zéro, on ne veut pas les perdre en route.
    if (CREATIVE.mats) { pl.infiniteMats = true; pl.mats.wood = pl.mats.stone = pl.mats.metal = 999; }
    if (CREATIVE.ammo) pl.infiniteAmmo = true;
    if (CREATIVE.god) { pl.invulnerable = true; if (pl.health < 100) pl.health = 100; }
    if (CREATIVE.noFall) pl.noFallT = Math.max(pl.noFallT, 0.5);
  };

  // Etat affiche dans le HUD et dans le panneau admin.
  S.status = function () {
    const r = G.Auth.rules();
    const on = [];
    if (r.mode != null) on.push('mode');
    if (r.bots != null) on.push('joueurs');
    if (r.difficulty != null) on.push('difficulte');
    if (r.ranked != null) on.push('classement');
    if (r.zeroBuild != null) on.push('zero construction');
    if (r.stormScale !== 1) on.push('tempete x' + r.stormScale);
    return { rules: r, active: on, creative: CREATIVE };
  };
})();