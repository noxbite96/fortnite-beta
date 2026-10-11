// ============================================================
//  Sauvegarde locale : paramètres, profil, casier, stats, défis
// ============================================================
(function () {
  const KEY = 'fortnite10h_abonne_v1';
  const S = {};
  G.Store = S;

  // La sauvegarde est rattachée au compte connecté. Sans session, la
  // progression reste dans le compartiment invité d'origine.
  S.key = function () {
    const u = G.Auth && G.Auth.session && G.Auth.session();
    return u ? 'fortnite10h_save_' + u.id : KEY;
  };

  const DEFAULT = () => ({
    version: 1,       // incrémenter pour déclencher une migration
    name: 'Joueur',
    settings: {
      sens: 1.0, adsSens: 0.7, scopeSens: 0.5, invertY: false, fov: 80,
      volMaster: 0.8, volMusic: 0.5, volSfx: 0.85, volAmbience: 0.6,
      quality: 2,           // 0 bas, 1 moyen, 2 élevé, 3 épique
      viewDist: 2,          // 0..3
      difficulty: 1,        // 0 facile, 1 normal, 2 difficile, 3 pro
      bots: 49,
      mode: 'solo',         // 'solo' | 'duo' | 'squad' | 'rumble' | 'playground'
      ranked: false,        // partie classée (solo / duo / section)
      zeroBuild: false,     // mode Zéro construction (surbouclier, pas de construction)
      showFps: false, autoPickup: true, damageNumbers: true, builderPro: false, showTips: true, dynRes: true, bloom: true, soundViz: false,
      layout: 'auto',     // 'auto' | 'azerty' | 'qwerty' — disposition du clavier (affichage)
      binds: {},          // raccourcis personnalisés : id d'action -> [codes]
    },
    level: 1, xp: 0, totalXp: 0, stars: 0, vbucks: 1500,
    unlocked: ['skin_recrue', 'skin_recrue2', 'skin_recrue3', 'skin_recrue4', 'back_none', 'pick_default', 'glider_default', 'trail_none', 'emote_danse', 'emote_salut', 'wrap_none', 'spray_gg', 'spray_smiley'],
    equipped: { spray: 'spray_gg', skin: 'skin_recrue', back: 'back_none', pickaxe: 'pick_default', glider: 'glider_default', trail: 'trail_none', wrap: 'wrap_none', emotes: ['emote_danse', 'emote_salut', null, null, null, null] },
    stats: { matches: 0, wins: 0, kills: 0, top10: 0, top25: 0, damage: 0, deaths: 0, bestKills: 0, playTime: 0, chests: 0, mats: 0, builds: 0 },
    challenges: null, // généré au premier lancement
    rank: { pts: 0, best: 0, matches: 0 },
    seenNew: [],
  });

  S.makeDefault = DEFAULT;

  S.data = null;
  // Un disque plein ou un mode privé font échouer setItem en silence :
  // on le signale une seule fois plutôt que de perdre la progression
  // sans que le joueur s'en aperçoive.
  let warnedFull = false;
  function warnSave(e) {
    if (warnedFull) return;
    warnedFull = true;
    console.warn('[sauvegarde] échec :', e && e.name);
    if (G.HUD && G.HUD.notify) {
      G.HUD.notify('Sauvegarde impossible (stockage du navigateur plein ou indisponible). Ta progression risque de ne pas être conservée.', 8);
    }
  }

  S.load = function () {
    let d = null;
    try { const raw = localStorage.getItem(S.key()); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    const def = DEFAULT();
    if (!d || typeof d !== 'object') d = def;
    // une sauvegarde tronquée ou ancienne peut manquer une section
    // entière : on la reconstruit avant d'aller plus loin, sinon
    // d.settings[k] lève une erreur et le jeu ne démarre pas.
    if (!d.settings || typeof d.settings !== 'object') d.settings = def.settings;
    if (!d.stats || typeof d.stats !== 'object') d.stats = def.stats;
    if (!d.equipped || typeof d.equipped !== 'object') d.equipped = def.equipped;
    if (!d.unlocked || !Array.isArray(d.unlocked)) d.unlocked = def.unlocked.slice();
    if (!d.rank || typeof d.rank !== 'object') d.rank = def.rank;
    // fusion avec les valeurs par défaut (nouvelles clés)
    for (const k in def) if (d[k] === undefined) d[k] = def[k];
    for (const k in def.settings) if (d.settings[k] === undefined) d.settings[k] = def.settings[k];
    if (!d.settings.binds || typeof d.settings.binds !== 'object') d.settings.binds = {};
    // une première version rangeait les raccourcis à la racine : on migre
    if (d.binds && typeof d.binds === 'object' && !Object.keys(d.settings.binds).length) d.settings.binds = d.binds;
    delete d.binds;
    for (const k in def.stats) if (d.stats[k] === undefined) d.stats[k] = def.stats[k];
    for (const k in def.equipped) if (d.equipped[k] === undefined) d.equipped[k] = def.equipped[k];
    if (!Array.isArray(d.equipped.emotes)) d.equipped.emotes = def.equipped.emotes.slice();
    for (const u of def.unlocked) if (d.unlocked.indexOf(u) < 0) d.unlocked.push(u);
    S.data = d;
    return d;
  };
  S.save = function () {
    try {
      localStorage.setItem(S.key(), JSON.stringify(S.data));
      warnedFull = false;
      return true;
    } catch (e) {
      warnSave(e);
      return false;
    }
  };
  S.reset = function () { S.data = DEFAULT(); S.save(); };
  S.settings = () => S.data.settings;

  S.XP_PER_LEVEL = 1000;
  // Ajoute de l'XP, renvoie la liste des niveaux gagnés
  S.addXp = function (n) {
    const d = S.data;
    const gained = [];
    d.xp += n; d.totalXp += n;
    while (d.xp >= S.XP_PER_LEVEL) {
      d.xp -= S.XP_PER_LEVEL;
      d.level++;
      d.vbucks = (d.vbucks || 0) + 100; // 100 V-Bucks par niveau
      gained.push(d.level);
    }
    return gained;
  };
  S.isUnlocked = (id) => { const it = G.Cosmetics && G.Cosmetics.items[id]; if (it && it.styleOf) id = it.styleOf; return S.data.unlocked.indexOf(id) >= 0; };
  S.unlock = (id) => { if (!S.isUnlocked(id)) { S.data.unlocked.push(id); return true; } return false; };
})();
