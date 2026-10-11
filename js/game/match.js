// ============================================================
//  Partie : échauffement, bus, bataille, fin + boucle de jeu
// ============================================================
(function () {
  const U = G.U, I = G.Items, CB = G.Combat;
  const Game = { state: 'boot', time: 0, shakeAmt: 0 };
  const M = { bots: [], feed: [], alive: 0, total: 0, ranking: [], challengeLog: {} };
  G.Game = Game; G.Match = M;

  // ------------------------------------------------------------
  //  Initialisation (après génération du monde)
  // ------------------------------------------------------------
  Game.initWorld = function () {
    G.Loot.createChests();
    G.Storm.init(G.scene);
    G.Bus.build(G.scene);
    if (G.Extras && G.Extras.init) G.Extras.init(G.scene);
    // lampadaires : quelques lumières réelles la nuit
    Game.nightLights = [];
    const spots = G.Arch.lights.concat(G.POI.lights);
    for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffd8a0, 0, 22, 2); G.scene.add(l); Game.nightLights.push(l); }
    Game.lightSpots = spots;
    // joueur
    const eq = G.Store.data.equipped;
    G.player = new G.Player({ name: G.Store.data.name, cos: { skin: eq.skin, back: eq.back, pickaxe: eq.pickaxe, glider: eq.glider, trail: eq.trail, wrap: eq.wrap, emotes: eq.emotes } });
    G.player.char.root.visible = false;
  };

  Game.start = function () {
    Game.state = 'menu';
    if (G.Menu) G.Menu.showTitle();
  };

  Game.inMatch = function () { return Game.state === 'warmup' || Game.state === 'bus' || Game.state === 'playing'; };

Game.onPointerLockChange = function (locked) {
    if (locked) { G.HUD.showPause(false); return; }
    // Perdre la capture alors qu'elle fonctionnait = le joueur a pressé
    // Échap (ou a cliqué hors de la fenêtre) : on ouvre la pause.
    // En revanche, si le navigateur a REFUSÉ la capture (lockFailed), on
    // reste en jeu : sinon la partie serait figée dès le début.
    if (!Game.inMatch()) return;
    if (G.HUD.fullMapOpen || Game.ignoreUnlock) return;
    if (G.Input.lockFailed) {
      if (G.HUD.notify) G.HUD.notify('Souris libre — clique dans la fenêtre pour capturer la souris', 4);
      return;
    }
    G.HUD.showPause(true);
  };

  // Échap ouvre / ferme la pause même sans capture de souris active.
  Game.togglePause = function () {
    if (!Game.inMatch()) return;
    if (G.HUD.paused) { G.HUD.showPause(false); G.Input.requestLock(); return; }
    // Échap referme d'abord ce qui est ouvert, avant d'ouvrir la pause
    if (G.HUD.fullMapOpen) { G.HUD.toggleMap(); return; }
    if (G.HUD.invOpen) { G.HUD.toggleInventory(); return; }
    if (G.Folk && G.Folk.open) return;
    if (G.Sandbox && G.Sandbox.open) return;
    if (G.Aug && G.Aug.open) return;
    if (G.FreeCam && G.FreeCam.on) { G.FreeCam.toggle(); return; }
    G.HUD.showPause(true);
  };

  // ------------------------------------------------------------
  //  Démarrage d'une partie
  // ------------------------------------------------------------
  M.start = function () {
    const S = G.Store.data.settings;
    // règles serveur appliquées AVANT toute lecture du mode : sans ça,
    // le joueur réécrit la règle depuis son propre menu.
    if (G.Server) G.Server.applyMatchRules();
    if (G.Sandbox) { G.Sandbox.close(); G.Sandbox.cleanup(); }
    if (G.FreeCam && G.FreeCam.on) G.FreeCam.toggle();
    Game.state = 'warmup';
    Game.time = 0;
    if (G.Menu) G.Menu.hideAll();
    G.Audio.stopMusic(1);
    // remise à zéro du monde
    G.World.reset();
    G.Build.clear();
    CB.clear();
    G.FX.clear();
    G.Loot.reset();
    G.Storm.reset();
    if (G.Extras && G.Extras.reset) G.Extras.reset();
    G.Sky.time = U.rand(7.2, 12.5); G.Sky.speed = 1 / 62; // heure de départ variable (lever du soleil → midi)
    G.Weather.reset(true);
    G.Events.reset(S.mode !== 'playground');
    if (G.UFO) G.UFO.reset(S.mode !== 'playground');
    if (G.Tornado) G.Tornado.reset(S.mode !== 'playground');
    if (G.Cube) G.Cube.reset(S.mode !== 'playground');
    if (G.Hotspot) G.Hotspot.reset();
    if (G.Sharks) G.Sharks.init();
    if (G.Gnomes) G.Gnomes.reset();
    G.Veg.hideGrass();
    M.feed = []; M.ranking = []; M.placement = 0; M.endShown = false; M.stats = null; M.victoryDone = false;
    M.challengeLog = {};
    M.victoryCam = null;
    G.NPC.clear();
    if (G.Bounty) G.Bounty.reset();
    if (G.Barrels) G.Barrels.reset();
    if (G.Treasure) G.Treasure.reset();
    G.Sprays.clear();
    G.Wild.reset();
    // joueur
    const pl = G.player;
    const eq = G.Store.data.equipped;
    pl.cos = { skin: eq.skin, back: eq.back, pickaxe: eq.pickaxe, glider: eq.glider, trail: eq.trail, wrap: eq.wrap, emotes: eq.emotes };
    G.Char.dispose(pl.char);
    pl.char = G.Char.build(pl.cos.skin, { back: pl.cos.back });
    G.scene.add(pl.char.root);
    pl.heldKey = null;
    pl.reset();
    // bots
    M.playground = S.mode === 'playground';
    M.rumble = S.mode === 'rumble';
    M.ranked = !!S.ranked && !M.playground && !M.rumble;
    M.zeroBuild = !!S.zeroBuild && !M.playground;
    const baseDiff = M.ranked ? G.Ranked.botDiff() : S.difficulty;
    M.botDiff = baseDiff;
    M.teamScore = [0, 0]; M.RUMBLE_TARGET = 40;
    G.Storm.PHASES = M.rumble ? G.Storm.RUMBLE_PHASES : G.Storm.phasesFor(Math.round(baseDiff));
    const n = M.playground ? 0 : M.rumble ? 31 : S.bots;
    const skins = G.Cosmetics.skinsForBots();
    const backs = G.Cosmetics.byCat('back'), picks = G.Cosmetics.byCat('pickaxe'), gliders = G.Cosmetics.byCat('glider'), trails = G.Cosmetics.byCat('trail'), wraps = G.Cosmetics.byCat('wrap');
    const names = U.shuffle(G.BOT_NAMES.slice());
    for (const b of M.bots) { G.Char.dispose(b.char); const i = CB.actors.indexOf(b); if (i >= 0) CB.actors.splice(i, 1); }
    M.bots = [];
    for (let i = 0; i < n; i++) {
      // un peu de variété, mais jamais de bot plus fort que la difficulté choisie en facile
      const r = Math.random();
      const diff = U.clamp(baseDiff + (r < 0.15 ? -1 : r < 0.25 && baseDiff > 0 ? 1 : 0), 0, 3);
      const b = new G.Bot({ name: names[i % names.length] + (i >= names.length ? i : ''), diff, cos: { skin: U.pick(skins).id, back: Math.random() < 0.6 ? U.pick(backs).id : 'back_none', pickaxe: U.pick(picks).id, glider: U.pick(gliders).id, trail: Math.random() < 0.4 ? U.pick(trails).id : 'trail_none', wrap: Math.random() < 0.3 ? U.pick(wraps).id : 'wrap_none' } });
      M.bots.push(b);
    }
    M.total = n + 1;
    M.alive = M.total;
    // île d'attente
    const sp = G.POI.spawnPoints;
    const all = [pl].concat(M.bots);
    G.Duo.setup(pl, M.bots, M.rumble ? 16 : S.mode === 'squad' ? 4 : S.mode === 'duo' ? 2 : 1);
    if (G.Crown) G.Crown.setup();
    if (G.Aug) G.Aug.setup();
    if (G.Medal) G.Medal.clear();
    // Zéro construction : surbouclier de 50 pour tous, les bots ne construisent plus
    for (const a of [pl].concat(M.bots)) { a.overshield = M.zeroBuild ? 50 : 0; if (M.zeroBuild && a.sk) a.sk.build = 0; }
    const osRow = document.getElementById('os-row'); if (osRow) osRow.classList.toggle('hidden', !M.zeroBuild);
    all.forEach((a, i) => {
      a.reset();
      a.overshield = M.zeroBuild ? 50 : 0;
      const q = G.Duo.isMate(a) ? [sp[0][0] + 2 * a.mateIdx, sp[0][1] + 1] : sp[i % sp.length];
      a.pos.set(q[0] + U.rand(-1, 1), G.Phys.supportAt(q[0], q[1], 60, 0.3, 0) + 0.05, q[1] + U.rand(-1, 1));
      a.state = 'lobby'; a.inLobby = true; a.invulnerable = true; a.infiniteMats = true; a.infiniteAmmo = true;
      a.mats = { wood: 999, stone: 999, metal: 999 };
      a.yaw = Math.random() * 6.28;
      a.char.root.visible = true;
      if (a.isBot) { a.slots[0] = I.make(U.pick(['ar', 'pump', 'smg', 'pistol']), U.randInt(0, 4)); a.equip(0); }
    });
    pl.camYaw = pl.yaw; pl.camPitch = -0.1;
    // armes au sol pour s'échauffer
    const s = G.MapData.spawnIsland;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, r = 10 + (i % 3) * 5;
      const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
      G.Loot.spawnItem(I.make(U.pick(['ar', 'pump', 'smg', 'sniper', 'pistol', 'rocket', 'tactical', 'burst', 'minigun']), U.randInt(1, 4)), x, G.Phys.supportAt(x, z, 50, 0.2, 0), z);
    }
    M.warmupT = M.playground ? 6 : 30;
    M.respawnT = 0;
    G.HUD.show(true);
    G.HUD.resetMatch();
    G.Input.requestLock();
    G.Audio.resume();
  };

  // Tous dans le bus
  M.toBus = function () {
    Game.state = 'bus';
    G.HUD.fade(0.6);
    // nettoie l'île d'attente
    G.Build.clear();
    for (let i = G.Loot.items.length - 1; i >= 0; i--) G.Loot.remove(G.Loot.items[i]);
    G.Loot.reset();
    if (G.Hotspot) G.Hotspot.setup();
    CB.clear();
    G.Bus.start();
    const all = [G.player].concat(M.bots);
    for (const a of all) if (a.vehicle) G.Extras.exitKart(a);
    if (G.Extras && G.Extras.reset) G.Extras.reset();
    for (const a of all) {
      a.reset();
      a.overshield = M.zeroBuild ? 50 : 0;
      a.state = 'bus'; a.inLobby = false; a.invulnerable = true; a.thanked = false; a.thankedBus = false;
      a.char.root.visible = false;
      a.pos.copy(G.Bus.pos);
      if (a.isBot) {
        // choix de la zone d'atterrissage
        let tx, tz;
        const r = Math.random();
        if (r < 0.7) { const p = U.pick(G.MapData.pois.concat(G.MapData.pois.slice(0, 4))); const q = G.Terrain.randomLandPoint(Math.random, p.x, p.z, p.r * 0.7, 1); tx = q[0]; tz = q[1]; }
        else { const q = G.Terrain.randomLandPoint(Math.random, U.rand(-350, 350), U.rand(-350, 350), 120, 2); tx = q[0]; tz = q[1]; }
        a.ai.dropTarget = [tx, tz];
        // saute quand le bus est au plus près (avec un peu de hasard), si la cible est atteignable
        let k = G.Bus.closestK(tx, tz);
        const bp = G.Bus.pointAt(k);
        const reach = 520;
        if (Math.hypot(bp.x - tx, bp.z - tz) > reach) { const q = G.Terrain.randomLandPoint(Math.random, bp.x, bp.z, 200, 2); a.ai.dropTarget = q; k = G.Bus.closestK(q[0], q[1]); }
        a.ai.jumpK = U.clamp(k + U.rand(-0.06, 0.03), 0.05, 0.95);
        if (G.Duo.isMate(a)) a.ai.jumpK = 99; // saute avec le joueur
      }
      a.downed = false;
    }
    M.alive = all.length;
    G.player.camYaw = Math.atan2(-G.Bus.dir.x, -G.Bus.dir.z) + 0.6; G.player.camPitch = -0.25;
    if (!M.playground) G.Storm.start();
    G.NPC.setup();
    G.HUD.notify('Appuyez sur ESPACE pour sauter du bus', 4);
  };

  // « Merci, chauffeur ! »
  M.thankDriver = function (a) {
    G.HUD.killFeed([null, a.name, 'a remercié le chauffeur du bus'], a.isPlayer, false);
    if (a.isPlayer) { G.Audio.play('bus_horn'); G.HUD.notify('MERCI, CHAUFFEUR !', 1.5); }
  };
  M.jump = function (a) {
    if (a.state !== 'bus') return;
    const b = G.Bus;
    a.invulnerable = false; a.infiniteMats = false; a.infiniteAmmo = a.isBot;
    if (M.playground && a.isPlayer) { M.playgroundLoadout(a); setTimeout(() => { if (M.playground && G.Game.state === 'playing') G.HUD.notify('TERRAIN DE JEU : touche O pour le menu (véhicules, objets, événements…), K pour des cibles', 5); }, 2500); }
    a.startSkydive(b.pos.x - b.dir.x * 7 + U.rand(-1, 1), b.pos.y - 3, b.pos.z - b.dir.z * 7 + U.rand(-1, 1), b.dir.x * 12, b.dir.z * 12);
    if (a.isPlayer || Math.hypot(a.pos.x - G.camera.position.x, a.pos.z - G.camera.position.z) < 60) G.Audio.play('bus_jump', { pos: a.isPlayer ? null : [a.pos.x, a.pos.y, a.pos.z] });
  };
  M.playerJump = function () {
    if (G.player.state !== 'bus') return;
    M.jump(G.player);
    for (const m of G.Duo.mates) if (m.state === 'bus') m.ai.jumpK = 0;
    G.player.camYaw = Math.atan2(-G.Bus.dir.x, -G.Bus.dir.z); G.player.camPitch = -0.6;
    if (Game.state === 'bus') Game.state = 'playing';
    G.HUD.notify('', 0);
  };
  M.busEnd = function () {
    for (const a of [G.player].concat(M.bots)) if (a.state === 'bus') M.jump(a);
    if (Game.state === 'bus') Game.state = 'playing';
    G.Bus.stop();
  };

  // ------------------------------------------------------------
  //  Éliminations
  // ------------------------------------------------------------
  M.onElimination = function (victim, killer, o) {
    if (Game.state === 'warmup') return;
    if (G.Crown) G.Crown.onDeath(victim, killer);
    if (G.Bounty) G.Bounty.onElimination(victim, killer);
    if (G.Aug) G.Aug.onElimination(victim, killer);
    if (victim.npc) { G.NPC.onDeath(victim, killer, o); return; }
    if (victim.isCreature) return;
    if (M.rumble) { M.rumbleKill(victim, killer, o); return; }
    if (M.playground) {
      if (victim.isPlayer) { M.respawnT = 3; G.HUD.showDeath(killer, o); M.spectate = null; }
      return;
    }
    M.alive--;
    // classement (par équipe en duo : une équipe est classée quand son dernier membre tombe)
    let place = M.alive + 1;
    if (G.Duo.active) {
      const mates = [G.player].concat(M.bots).filter((a) => a !== victim && a.team === victim.team);
      if (mates.some((a) => !a.dead)) place = null;
      else {
        place = G.Duo.teamsAlive() + 1;
        for (const r of M.ranking) if (r.team === victim.team) r.place = place;
        for (const a of mates) a.stats.placement = place;
      }
    }
    victim.stats.placement = place || 0;
    if (G.Extras2 && G.Duo.active) G.Extras2.dropCard(victim);
    M.ranking.unshift({ name: victim.name, place, kills: victim.stats.kills, isPlayer: victim.isPlayer, skin: victim.cos.skin, team: victim.team });
    const wname = o.storm || o.fall ? null : (o.weapon && I.withArticle(o.weapon)) || (o.explosion ? 'une explosion' : null);
    let txt;
    if (o.storm) txt = [null, victim.name, 'a été éliminé(e) par la tempête'];
    else if (o.fall) txt = [null, victim.name, 'a fait une chute mortelle'];
    else if (o.bleed && !killer) txt = [null, victim.name, 'a succombé à ses blessures'];
    else if (o.weapon === 'meteor' && !killer) txt = [null, victim.name, 'a été écrasé(e) par la météorite !'];
    else if (o.weapon === 'wolf' && !killer) txt = [null, victim.name, 'a été dévoré(e) par un loup !'];
    else if (o.weapon === 'raptor' && !killer) txt = [null, victim.name, 'a été dévoré(e) par un raptor !'];
    else if (o.weapon === 'shark' && !killer) txt = [null, victim.name, 'a été dévoré(e) par un requin !'];
    else if (o.weapon === 'cube' && !killer) txt = [null, victim.name, 'a été écrasé(e) par le cube !'];
    else if (killer) txt = [killer.name, victim.name, wname ? (o.head ? 'd\'un tir à la tête avec ' : 'avec ') + wname : ''];
    else txt = [null, victim.name, 'a été éliminé(e)'];
    G.HUD.killFeed(txt, killer && killer.isPlayer, victim.isPlayer, o.weapon);
    if (killer && killer.isPlayer) G.HUD.xpToast(300, 'Élimination');
    (M.log = M.log || []).push((txt[0] || '') + ' > ' + txt[1] + ' ' + txt[2] + ' @' + Math.round(Game.time));
    const D = G.Duo;
    const pTeamAlive = () => [G.player].concat(M.bots).some((a) => !a.dead && a.team === G.player.team);
    if (victim.isPlayer) {
      M.placement = D.active ? (pTeamAlive() ? 0 : D.teamsAlive() + 1) : M.alive + 1;
      M.playerDied(killer, o);
    } else if (D.active && D.isMate(victim) && G.player.dead && !pTeamAlive()) {
      // toute l'équipe du joueur est éliminée
      M.placement = D.teamsAlive() + 1;
      setTimeout(() => { if (!M.endShown) M.showEnd(false); }, 3500);
    }
    if (killer && killer.isPlayer) M.challengeEvent('kill', { weapon: o.weapon, head: o.head, dist: Math.hypot(killer.pos.x - victim.pos.x, killer.pos.z - victim.pos.z) });
    // victoire ? (une seule équipe encore en vie)
    const aliveAll = [G.player].concat(M.bots).filter((a) => !a.dead);
    const teams = new Set(aliveAll.map((a) => a.team));
    if (aliveAll.length && teams.size <= 1 && !M.victoryDone) {
      M.victoryDone = true;
      const winner = aliveAll[0];
      // les vainqueurs ne peuvent plus être éliminés (tempête, chute…)
      for (const w of aliveAll) { w.invulnerable = true; w.stats.placement = 1; M.ranking.unshift({ name: w.name, place: 1, kills: w.stats.kills, isPlayer: w.isPlayer, skin: w.cos.skin, team: w.team }); }
      for (const r of M.ranking) if (r.team === winner.team) r.place = 1;
      if (winner.team === G.player.team) M.victory();
      else {
        M.winnerBot = winner;
        G.HUD.notify((D.active ? 'L\'ÉQUIPE DE ' : '') + winner.name.toUpperCase() + ' REMPORTE LA VICTOIRE ROYALE !', 8);
        setTimeout(() => { for (const w of aliveAll) if (!w.dead && !w.downed) w.playEmote(U.pick(['emote_danse', 'emote_floss', 'emote_orange'])); }, 1200);
      }
    }
  };
  M.playerDied = function (killer, o) {
    G.HUD.showDeath(killer, o);
    const D = G.Duo;
    const am = D.active ? D.aliveMate() : null;
    if (am) {
      // on regarde son équipe jusqu'à la fin
      M.spectate = am;
      G.HUD.notify('VOTRE COÉQUIPIER CONTINUE LE COMBAT !', 3);
      return;
    }
    M.spectate = killer && !killer.dead ? killer : null;
    setTimeout(() => { if (!M.endShown && G.player.dead) M.showEnd(false); }, 4200);
  };
  M.victory = function () {
    Game.state = 'ended';
    M.placement = 1;
    if (G.player.dead && G.Duo.aliveMate()) M.spectate = G.Duo.aliveMate();
    G.Audio.playMusic('victory');
    G.HUD.victoryBanner();
    // cinématique : caméra qui tourne autour du vainqueur + confettis
    const star = G.player.dead ? M.spectate : G.player;
    M.victoryCam = star ? { t: 0, who: star, a0: G.player.camYaw } : null;
    if (G.Crown && star) G.Crown.fireworks(star.pos, 9);
    // emote de victoire
    setTimeout(() => { if (!G.player.dead) G.player.playEmote(G.Store.data.equipped.emotes.find((e) => e) || 'emote_danse'); }, 1500);
    setTimeout(() => M.showEnd(true), 6500);
  };

  // ------------------------------------------------------------
  //  Fin de partie : XP, stats, défis
  // ------------------------------------------------------------
  M.computeResults = function (win) {
    const pl = G.player, st = pl.stats;
    const place = win ? 1 : M.placement || M.alive + 1;
    const xp = [];
    xp.push(['Participation', 250]);
    if (st.kills) xp.push(['Éliminations (' + st.kills + ')', st.kills * 300]);
    const surv = Math.floor(st.surviveT / 30) * 20;
    if (surv) xp.push(['Temps de survie', surv]);
    if (st.chests) xp.push(['Coffres ouverts (' + st.chests + ')', st.chests * 60]);
    if (st.damage) xp.push(['Dégâts infligés', Math.round(st.damage * 1.2)]);
    if (st.mats) xp.push(['Matériaux récoltés', Math.round(st.mats * 0.5)]);
    if (M.rumble) { if (win) xp.push(['Victoire de l’équipe', 1200]); }
    else {
      if (place <= 25) xp.push(['Top 25', 300]);
      if (place <= 10) xp.push(['Top 10', 500]);
      if (place <= 5) xp.push(['Top 5', 600]);
      if (win) xp.push(['#1 VICTOIRE ROYALE', 2500]);
      if (win && pl.crown) xp.push(['👑 Victoire couronnée', 1500]);
    }
    // défis terminés pendant la partie
    const ch = M.finishChallenges(place, win);
    for (const c of ch) xp.push(['Défi : ' + c.name, c.xp]);
    const total = xp.reduce((s, e) => s + e[1], 0);
    return { place, win, xp, total, kills: st.kills, damage: Math.round(st.damage), mats: st.mats, chests: st.chests, builds: st.builds || 0, time: st.surviveT, challenges: ch };
  };
  M.showEnd = function (win) {
    if (M.endShown) return;
    if (G.FreeCam && G.FreeCam.on) G.FreeCam.toggle();
    if (G.Aug) G.Aug.close();
    M.endShown = true;
    const res = M.computeResults(win);
    M.lastResults = res;
    // enregistrement du profil
    const d = G.Store.data;
    const beforeLevel = d.level;
    d.stats.matches++; d.stats.kills += res.kills; d.stats.damage += res.damage; d.stats.mats += res.mats; d.stats.chests += res.chests; d.stats.playTime += res.time;
    if (win) d.stats.wins++;
    if (res.place <= 10) d.stats.top10++;
    if (res.place <= 25) d.stats.top25++;
    d.stats.bestKills = Math.max(d.stats.bestKills, res.kills);
    if (!win) d.stats.deaths++;
    const vb0 = d.vbucks || 0;
    const levels = G.Store.addXp(res.total);
    if (win) d.vbucks += 300; else if (res.place <= 10) d.vbucks += 50;
    // couronne de la victoire : on la garde pour la partie suivante si on gagne
    res.crowned = !!(win && G.player.crown && !M.rumble && !M.playground);
    if (res.crowned) { d.vbucks += 200; d.stats.crownWins = (d.stats.crownWins || 0) + 1; }
    if (!M.playground && !M.rumble) d.crownNext = !!win;
    res.vbucks = d.vbucks - vb0;
    if (M.ranked) res.ranked = G.Ranked.apply(res, G.Duo.active ? Math.ceil(M.total / G.Duo.size) : M.total);
    const unlocked = G.Cosmetics.syncUnlocks();
    if (win && G.Store.unlock('glider_victoire')) unlocked.unshift('glider_victoire');
    G.Store.save();
    res.levelBefore = beforeLevel; res.levelAfter = d.level; res.unlocked = unlocked;
    G.Input.exitLock();
    Game.ignoreUnlock = true;
    setTimeout(() => { Game.ignoreUnlock = false; }, 500);
    if (G.Menu) G.Menu.showResults(res);
    if (!win) G.Audio.playMusic('defeat');
  };
  // Terrain de jeu : équipement complet, matériaux et munitions infinis
  M.playgroundLoadout = function (a) {
    a.infiniteMats = true; a.infiniteAmmo = true;
    a.mats = { wood: 999, stone: 999, metal: 999 };
    a.gold = 5000;
    const kit = [['ar', 4], ['pump', 4], ['smg', 3], ['sniper', 4], ['rocket', 4]];
    kit.forEach((k, i) => { a.slots[i] = I.make(k[0], k[1]); });
    for (const t in a.ammo) a.ammo[t] = 999;
    a.sel = -1; a.equip(0);
    a.health = 100; a.shield = 100;
  };
  // ---------------- Équipe contre équipe ----------------
  M.rumbleKill = function (victim, killer, o) {
    const wname = o.storm || o.fall ? null : (o.weapon && I.withArticle(o.weapon)) || (o.explosion ? 'une explosion' : null);
    const txt = o.storm ? [null, victim.name, 'a été éliminé(e) par la tempête'] : o.fall ? [null, victim.name, 'a fait une chute mortelle'] : killer ? [killer.name, victim.name, wname ? (o.head ? 'd\'un tir à la tête avec ' : 'avec ') + wname : ''] : [null, victim.name, 'a été éliminé(e)'];
    G.HUD.killFeed(txt, killer && killer.isPlayer, victim.isPlayer, o.weapon);
    if (killer && killer.isPlayer) { G.HUD.xpToast(100, 'Élimination'); M.challengeEvent('kill', { weapon: o.weapon, head: o.head, dist: Math.hypot(killer.pos.x - victim.pos.x, killer.pos.z - victim.pos.z) }); }
    if (killer && killer.team !== victim.team && (killer.team === 0 || killer.team === 1)) M.teamScore[killer.team]++;
    // siphon : +50 PV / bouclier pour l'auteur de l'élimination
    if (killer && !killer.dead && killer !== victim) {
      let s = 50;
      const h = Math.min(s, 100 - killer.health); killer.health += h; s -= h;
      killer.shield = Math.min(100, killer.shield + s);
      if (killer.isPlayer) { G.HUD.pickupNote('+50 siphon', '#7dff6a'); G.FX.healParticles(killer.pos.x, killer.pos.y, killer.pos.z, s > 0); }
    }
    victim.respawnAt = Game.time + (victim.isPlayer ? 5 : U.rand(5, 8));
    if (victim.isPlayer) { G.HUD.showDeath(killer, o); M.spectate = killer && !killer.dead ? killer : null; }
    if (!M.victoryDone) for (let t = 0; t < 2; t++) if (M.teamScore[t] >= M.RUMBLE_TARGET) {
      M.victoryDone = true;
      for (const a of [G.player].concat(M.bots)) a.invulnerable = true;
      if (t === G.player.team) M.victory();
      else { Game.state = 'ended'; M.placement = 2; G.HUD.notify('L\'ÉQUIPE ROUGE REMPORTE LA PARTIE (' + M.teamScore[t] + ' – ' + M.teamScore[1 - t] + ')', 6); setTimeout(() => { if (!M.endShown) M.showEnd(false); }, 4000); }
    }
  };
  M.respawnActor = function (a) {
    const mates = [G.player].concat(M.bots).filter((x) => x !== a && !x.dead && x.team === a.team && x.state === 'ground');
    let cx, cz;
    if (mates.length) { const m = U.pick(mates); cx = m.pos.x; cz = m.pos.z; } else { const c = G.Storm.next || G.Storm.cur; cx = c.x; cz = c.z; }
    const q = G.Terrain.randomLandPoint(Math.random, cx, cz, 50, 2);
    a.dead = false; a.downed = false; a.health = 100; a.shield = 0; a.invulnerable = false; a.inLobby = false;
    for (let i = 0; i < 5; i++) a.slots[i] = null;
    a.slots[0] = I.make('ar', 0); a.slots[1] = I.make('pump', 0); a.slots[2] = I.make('smallshield', null, 2);
    for (const t in a.ammo) a.ammo[t] = 0; a.ammo.medium = 90; a.ammo.shells = 16;
    a.mats = { wood: 150, stone: 60, metal: 0 };
    a.sel = -1; a.equip(0);
    a.startSkydive(q[0], G.Terrain.height(q[0], q[1]) + 90, q[1], 0, 0);
    a.char.root.visible = true;
    a.respawnAt = 0;
    if (a.isBot) { a.ai.target = null; a.ai.nav = null; a.ai.mode = 'loot'; a.ai.dropTarget = q; }
    else { G.HUD.els.death.classList.add('hidden'); G.HUD.els.spect.classList.add('hidden'); M.spectate = null; G.HUD.notify('RÉAPPARITION !', 1.5); }
  };
  M.respawnPlayer = function () {
    const pl = G.player;
    const p = U.pick(G.MapData.pois);
    const q = G.Terrain.randomLandPoint(Math.random, p.x, p.z, p.r * 0.6, 2);
    pl.dead = false; pl.downed = false;
    pl.startSkydive(q[0], G.Terrain.height(q[0], q[1]) + 160, q[1], 0, 0);
    pl.invulnerable = false; pl.inLobby = false;
    M.playgroundLoadout(pl);
    pl.char.root.visible = true;
    G.HUD.els.death.classList.add('hidden'); G.HUD.els.spect.classList.add('hidden');
    G.HUD.notify('RÉAPPARITION — ' + p.name.toUpperCase(), 2.5);
  };
  M.leave = function () {
    Game.state = 'menu';
    G.Weather.reset(false); G.Weather.update(0.016, G.camera.position, 0);
    G.Events.reset(false);
    G.HUD.show(false);
    G.Audio.stopAllLoops();
    G.Storm.reset();
    G.Bus.stop();
    G.Veg.hideGrass();
    for (const b of M.bots) b.char.root.visible = false;
    G.player.char.root.visible = false;
    if (G.Menu) G.Menu.showLobby();
  };

  // ------------------------------------------------------------
  //  Défis (hebdomadaires)
  // ------------------------------------------------------------
  M.CHALLENGE_POOL = [
    { id: 'kills3', name: 'Éliminer 3 adversaires', goal: 3, xp: 1500, ev: 'kill' },
    { id: 'kills10', name: 'Éliminer 10 adversaires (cumulé)', goal: 10, xp: 3000, ev: 'kill' },
    { id: 'chests5', name: 'Ouvrir 5 coffres', goal: 5, xp: 1200, ev: 'chest' },
    { id: 'chests15', name: 'Ouvrir 15 coffres (cumulé)', goal: 15, xp: 2500, ev: 'chest' },
    { id: 'mats500', name: 'Récolter 500 matériaux', goal: 500, xp: 1200, ev: 'mats' },
    { id: 'dmg1000', name: 'Infliger 1000 dégâts (cumulé)', goal: 1000, xp: 2000, ev: 'damage' },
    { id: 'top10', name: 'Terminer dans le top 10', goal: 1, xp: 1500, ev: 'top10' },
    { id: 'win1', name: 'Obtenir une Victoire Royale', goal: 1, xp: 5000, ev: 'win' },
    { id: 'head3', name: 'Éliminer 2 adversaires d\'un tir à la tête', goal: 2, xp: 1500, ev: 'head' },
    { id: 'shotgun', name: 'Éliminer un adversaire au fusil à pompe', goal: 1, xp: 800, ev: 'kshotgun' },
    { id: 'sniper50', name: 'Éliminer un adversaire à plus de 50 m', goal: 1, xp: 1200, ev: 'klong' },
    { id: 'dance3', name: 'Danser dans 3 lieux nommés différents', goal: 3, xp: 1000, ev: 'dance' },
    { id: 'builds50', name: 'Placer 50 constructions', goal: 50, xp: 1000, ev: 'build' },
    { id: 'matches3', name: 'Jouer 3 parties', goal: 3, xp: 900, ev: 'match' },
    { id: 'upgrade2', name: 'Améliorer 2 armes à un établi', goal: 2, xp: 1200, ev: 'upgrade' },
    { id: 'hide1', name: 'Se cacher dans une benne, une meule de foin ou des toilettes', goal: 1, xp: 800, ev: 'hide' },
    { id: 'zip3', name: 'Utiliser 3 tyroliennes', goal: 3, xp: 1000, ev: 'zip' },
    { id: 'reboot1', name: 'Renvoyer un coéquipier au combat (duo)', goal: 1, xp: 1500, ev: 'reboot' },
    { id: 'slide', name: 'Glisser sur 100 m', goal: 100, xp: 900, ev: 'slide' },
    { id: 'boss', name: 'Vaincre un boss (le Roi, Oméga, le Général ou la Reine)', goal: 1, xp: 2500, ev: 'boss' },
    { id: 'fish3', name: 'Pêcher 3 fois', goal: 3, xp: 1000, ev: 'fish' },
    { id: 'vault', name: 'Ouvrir la chambre forte du Roi', goal: 1, xp: 2000, ev: 'vault' },
    { id: 'wolf3', name: 'Éliminer 3 loups', goal: 3, xp: 1000, ev: 'wolf' },
    { id: 'chicken', name: 'Planer en portant une poule', goal: 1, xp: 800, ev: 'chicken' },
    { id: 'buy2', name: 'Acheter 2 objets à des personnages', goal: 2, xp: 1000, ev: 'buy' },
    { id: 'hire', name: 'Engager un garde du corps', goal: 1, xp: 1200, ev: 'hire' },
    { id: 'gold500', name: 'Ramasser 500 lingots d\'or', goal: 500, xp: 1500, ev: 'gold' },
    { id: 'bounty', name: 'Réussir un contrat de chasse', goal: 1, xp: 1500, ev: 'bounty' },
    { id: 'mech', name: 'Piloter un mécha de combat', goal: 1, xp: 1000, ev: 'mech' },
    { id: 'boar', name: 'Chevaucher un sanglier', goal: 1, xp: 800, ev: 'boar' },
    { id: 'heli', name: 'Piloter un hélicoptère', goal: 1, xp: 900, ev: 'heli' },
    { id: 'turret', name: 'Utiliser une tourelle montée', goal: 1, xp: 700, ev: 'turret' },
    { id: 'treasure', name: 'Déterrer un trésor', goal: 1, xp: 1200, ev: 'treasure' },
    { id: 'ufo', name: 'Se faire aspirer par l\'OVNI', goal: 1, xp: 1500, ev: 'ufo' },
    { id: 'aug', name: 'Choisir des augmentations', goal: 3, xp: 1200, ev: 'aug' },
    { id: 'medal', name: 'Récupérer le médaillon d\'un boss', goal: 1, xp: 2000, ev: 'medal' },
    { id: 'tornado', name: 'Se faire emporter par une tornade', goal: 1, xp: 1500, ev: 'tornado' },
    { id: 'drone', name: 'Abattre des drones de butin', goal: 2, xp: 1500, ev: 'drone' },
    { id: 'shark', name: 'Vaincre un requin', goal: 1, xp: 1200, ev: 'shark' },
    { id: 'gnome', name: 'Trouver des nains de jardin cachés', goal: 3, xp: 1500, ev: 'gnome' },
    { id: 'cube', name: 'Rebondir sur le Lac Butin après la chute du cube', goal: 5, xp: 1500, ev: 'cube' },
    { id: 'booth', name: 'Changer de tenue dans une cabine de déguisement', goal: 1, xp: 800, ev: 'booth' },
    { id: 'raptor', name: 'Éliminer des raptors', goal: 2, xp: 1500, ev: 'raptor' },
  ];
  M.ensureChallenges = function () {
    const d = G.Store.data;
    if (!d.challenges || !d.challenges.list || d.challenges.list.every((c) => c.done)) {
      const pool = U.shuffle(M.CHALLENGE_POOL.slice()).slice(0, 7);
      d.challenges = { week: (d.challenges ? d.challenges.week + 1 : 1), list: pool.map((c) => ({ id: c.id, progress: 0, done: false })) };
      G.Store.save();
    }
    return d.challenges;
  };
  M.challengeDef = (id) => M.CHALLENGE_POOL.find((c) => c.id === id);
  M.challengeEvent = function (ev, data) {
    const d = G.Store.data;
    if (!d.challenges) return;
    const add = (evName, n) => {
      if (G.Folk) G.Folk.questEvent(evName, n);
      for (const c of d.challenges.list) {
        const def = M.challengeDef(c.id);
        if (!def || c.done || def.ev !== evName) continue;
        c.progress = Math.min(def.goal, c.progress + n);
        if (c.progress >= def.goal) { c.done = true; c.justDone = true; G.HUD && G.HUD.challengeDone(def); G.Audio.play('unlock'); }
        else if (G.HUD && G.HUD.questProgress) G.HUD.questProgress(def, c.progress);
      }
    };
    if (ev === 'kill') { add('kill', 1); if (data && data.head) add('head', 1); if (data && data.weapon && I.WEAPONS[data.weapon] && I.WEAPONS[data.weapon].cat === 'shotgun') add('kshotgun', 1); if (data && data.dist > 50) add('klong', 1); }
    else if (ev === 'chest') add('chest', 1);
    else if (ev === 'upgrade' || ev === 'hide' || ev === 'zip' || ev === 'reboot' || ev === 'boss' || ev === 'fish' || ev === 'vault' || ev === 'wolf' || ev === 'chicken') add(ev, 1);
    else if (ev === 'slide') add('slide', data || 1);
    else if (ev === 'buy' || ev === 'hire' || ev === 'bounty' || ev === 'mech' || ev === 'boar' || ev === 'heli' || ev === 'turret' || ev === 'treasure' || ev === 'ufo' || ev === 'aug' || ev === 'medal' || ev === 'tornado' || ev === 'drone' || ev === 'shark' || ev === 'gnome' || ev === 'cube' || ev === 'booth' || ev === 'raptor') add(ev, 1);
    else if (ev === 'gold') add('gold', data || 1);
    else if (ev === 'emote') {
      const poi = G.MapData.nearestPoiName(G.player.pos.x, G.player.pos.z);
      if (poi && !M.challengeLog['dance_' + poi] && Game.state === 'playing') { M.challengeLog['dance_' + poi] = true; add('dance', 1); }
    }
  };
  M.finishChallenges = function (place, win) {
    const d = G.Store.data, pl = G.player;
    if (!d.challenges) return [];
    const inc = (evName, n) => { for (const c of d.challenges.list) { const def = M.challengeDef(c.id); if (def && !c.done && def.ev === evName) { c.progress = Math.min(def.goal, c.progress + n); if (c.progress >= def.goal) { c.done = true; c.justDone = true; } } } };
    inc('mats', pl.stats.mats); inc('damage', Math.round(pl.stats.damage)); inc('build', pl.stats.builds || 0); inc('match', 1);
    if (place <= 10) inc('top10', 1);
    if (win) inc('win', 1);
    const out = [];
    for (const c of d.challenges.list) if (c.justDone) { c.justDone = false; const def = M.challengeDef(c.id); out.push({ name: def.name, xp: def.xp }); }
    return out;
  };

  // ------------------------------------------------------------
  //  Boucle de jeu
  // ------------------------------------------------------------
  Game.shakeAt = function (x, y, z, r) {
    const p = G.camera.position;
    const d = Math.hypot(p.x - x, p.y - y, p.z - z);
    Game.shakeAmt = Math.max(Game.shakeAmt, U.clamp(1 - d / (r * 8), 0, 1) * 0.7);
  };

  const tmpV = new THREE.Vector3();
  Game.frame = function (dt) {
    if (G.debugFreeze) return;
    if (Game.state === 'menu' || Game.state === 'boot') { if (G.Menu) G.Menu.frame(dt); return; }
    Game.time += dt;
    const pl = G.player;
    const paused = G.HUD.paused;
    if (paused) dt = 0;
    Game.shakeAmt = Math.max(0, Game.shakeAmt - dt * 1.5);
    // --- entrées joueur ---
    pl.handleInput(dt);
    // --- échauffement ---
    if (Game.state === 'warmup') {
      M.warmupT -= dt;
      if (M.warmupT <= 5 && M.warmupT + dt > 5) G.HUD.notify('Le bus de combat arrive !', 2);
      if (Math.ceil(M.warmupT) !== Math.ceil(M.warmupT + dt) && M.warmupT < 5.5 && M.warmupT > 0) G.Audio.play('countdown');
      if (M.warmupT <= 0) M.toBus();
    }
    // --- terrain de jeu : réapparition ---
    if (M.playground && pl.dead && dt > 0) { M.respawnT -= dt; if (M.respawnT <= 0) M.respawnPlayer(); }
    // --- équipe contre équipe : réapparitions ---
    if (M.rumble && dt > 0 && Game.state === 'playing') for (const a of [pl].concat(M.bots)) if (a.dead && a.respawnAt && Game.time >= a.respawnAt) M.respawnActor(a);
    // --- bus ---
    G.Bus.update(dt);
    if (G.Bus.active) {
      const k = G.Bus.progress();
      for (const b of M.bots) if (b.state === 'bus') {
        b.pos.copy(G.Bus.pos);
        if (!b.thanked && k < 0.3 && Math.random() < dt * 0.007) { b.thanked = true; M.thankDriver(b); }
        if (G.Bus.doorsOpen && k >= b.ai.jumpK) M.jump(b);
      }
      if (pl.state === 'bus') pl.pos.copy(G.Bus.pos);
    }
    // --- acteurs ---
    if (dt > 0) {
      pl.update(dt);
      for (const b of M.bots) b.update(dt);
      G.NPC.update(dt);
      // séparation joueur / bots proches
      for (const b of M.bots) {
        if (b.dead || b.state !== 'ground' || pl.dead || pl.state !== 'ground' && pl.state !== 'lobby') continue;
        const dx = b.pos.x - pl.pos.x, dz = b.pos.z - pl.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.7 && d > 0.001 && Math.abs(b.pos.y - pl.pos.y) < 1.5) { const k = (0.7 - d) / d * 0.5; b.pos.x += dx * k; b.pos.z += dz * k; pl.pos.x -= dx * k; pl.pos.z -= dz * k; }
      }
      CB.updateProjectiles(dt);
      CB.updateBubbles(dt);
      CB.updateClouds(dt);
      CB.updateBurn(dt);
      G.World.update(dt);
      G.Build.update(dt);
      G.Arch.updateDoors(dt);
      G.Storm.update(dt);
      G.Duo.update(dt);
      G.Events.update(dt);
      if (G.UFO) G.UFO.update(dt);
      if (G.Tornado) G.Tornado.update(dt);
      if (G.Cube) G.Cube.update(dt);
      if (G.Hotspot) G.Hotspot.update(dt);
      if (G.Sharks) G.Sharks.update(dt);
      if (G.Gnomes) G.Gnomes.update(dt);
      if (G.Glints) G.Glints.update();
      G.Wild.update(dt);
      if (G.Crown) G.Crown.update(dt);
      if (G.Barrels) G.Barrels.update(dt);
      if (G.Bounty && Game.state === 'playing') G.Bounty.update(dt);
      if (G.Treasure) G.Treasure.update(dt);
      if (G.Aug) G.Aug.update(dt);
      if (G.Medal) G.Medal.update(dt);
      if (G.Turrets) G.Turrets.update(dt);
      if (G.Mechs) G.Mechs.update(dt);
      if (G.Boars) G.Boars.update(dt);
      // musique de fin de partie (derniers cercles / 10 derniers joueurs)
      if (!M.playground && !M.rumble && !M.endShown && G.Game.state === 'playing') {
        const late = M.alive <= 10 || (G.Storm.phase >= 6 && G.Storm.active);
        const cur = G.Audio.music && !G.Audio.music.stopped ? G.Audio.music.name : null;
        if (late && !cur) G.Audio.playMusic('endgame', { vol: 0.5 });
        else if (!late && cur === 'endgame') G.Audio.stopMusic(1.5);
      }
      if (G.Planes) G.Planes.update(dt);
      if (G.Extras && G.Extras.update) G.Extras.update(dt);
      if (Game.state === 'playing') pl.stats.surviveT += 0;
    }
    // --- spectateur : clic pour changer de joueur, suit le tueur si la cible meurt ---
    if (pl.dead) {
      const aliveBots = M.bots.filter((b) => !b.dead);
      if (M.spectate && M.spectate.dead) M.spectate = (M.spectate.lastAttacker && !M.spectate.lastAttacker.dead && M.spectate.lastAttacker !== pl) ? M.spectate.lastAttacker : aliveBots[0] || null;
      const mates = G.Duo.active ? G.Duo.mates.filter((m) => !m.dead) : [];
      if (mates.length) {
        if (!M.spectate || M.spectate.dead || mates.indexOf(M.spectate) < 0) M.spectate = mates[0];
        if (G.Input.mouse.leftPressed && mates.length > 1 && !M.endShown) { const i = mates.indexOf(M.spectate); M.spectate = mates[(i + 1) % mates.length]; G.Audio.play('ui_click'); }
      } else if (G.Input.mouse.leftPressed && aliveBots.length && !M.endShown) { const i = aliveBots.indexOf(M.spectate); M.spectate = aliveBots[(i + 1) % aliveBots.length]; G.Audio.play('ui_click'); }
    }
    // --- caméra ---
    if (G.FreeCam && G.FreeCam.on) G.FreeCam.update(G.camera, dt);
    else if (M.victoryCam && Game.state === 'ended' && !M.endShown && M.victoryCam.who && !M.victoryCam.who.dead) victoryCam(dt);
    else if (pl.dead && M.spectate && !M.spectate.dead) spectateCam(dt, M.spectate);
    else if (pl.state === 'bus') busCam(dt);
    else pl.updateCamera(dt);
    const cam = G.camera;
    // --- modèles (LOD) ---
    pl.syncModel(dt, true);
    const frustum = Game.frustum || (Game.frustum = new THREE.Frustum());
    const pm = Game.pm || (Game.pm = new THREE.Matrix4());
    pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pm);
    Game.frameN = (Game.frameN || 0) + 1;
    // les 10 bots les plus proches projettent des ombres
    const rbots = G.NPC.list.length ? M.bots.concat(G.NPC.list) : M.bots;
    if (Game.frameN % 10 === 0) {
      const near = rbots.filter((b) => !b.dead && b.state !== 'bus' && (b.distToCam || 999) < 45).sort((a, b) => a.distToCam - b.distToCam);
      M.shadowSet = new Set(near.slice(0, 10));
    }
    for (const b of rbots) {
      if (b.dead || b.state === 'bus') { b.char.root.visible = false; b.updateHitbox(false); continue; }
      const d = b.distToCam || 0;
      const vis = d < 330;
      b.char.root.visible = vis;
      if (!vis) { b.syncModel(dt, false); continue; }
      tmpV.set(b.pos.x, b.pos.y + 1, b.pos.z);
      const inView = frustum.containsPoint(tmpV) || d < 6;
      const animate = inView && (d < 90 || (Game.frameN + b.ai.tick * 100 | 0) % 3 === 0);
      b.syncModel(animate ? (d < 90 ? dt : dt * 3) : dt, animate);
      // détails et ombres seulement de près
      G.Char.setDetail(b.char, d < 45);
      const sh = !!(M.shadowSet && M.shadowSet.has(b));
      if (b.shadowOn !== sh) { b.shadowOn = sh; b.char.root.traverse((o) => { if (o.isMesh) o.castShadow = sh; }); }
    }
    // --- monde ---
    G.Loot.update(dt, cam.position);
    G.FX.update(dt);
    G.Veg.update(dt);
    G.Veg.updateGrass(cam.position.x, cam.position.z);
    const focus = pl.state === 'bus' ? G.Bus.pos : pl.dead && M.spectate ? M.spectate.pos : pl.pos;
    G.Sky.update(dt, cam.position, focus);
    G.Weather.update(dt, cam.position, Game.time);
    G.Storm.playerFx(dt, pl, cam.position);
    updateNightLights(cam.position);
    if (G.Ambient) G.Ambient.update(dt, cam.position);
    if (G.Arch.spinners) for (const s of G.Arch.spinners) s.obj.rotation[s.axis] += s.speed * dt;
    if (G.Arch.flags) for (const f of G.Arch.flags) { const p = f.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 1.5; p.setZ(i, Math.sin(Game.time * 4 + x * 2) * 0.15 * x / 3); } p.needsUpdate = true; }
    // --- audio ---
    G.Audio.setListener(cam.position.x, cam.position.y, cam.position.z, pl.state === 'bus' ? pl.camYaw : cam.rotation.y);
    const windOn = pl.state === 'skydive' ? 0.55 : pl.state === 'glide' ? 0.25 : 0;
    G.Audio.setLoop('wind', windOn, 0, pl.state === 'skydive' ? 0.8 : 0.3);
    ambient(dt, cam.position);
    // --- interface ---
    G.HUD.update(dt);
    // outils admin (F4) : ESP et nettoyage des drapeaux
    if (G.DevMenu) G.DevMenu.update();
    if (G.Server) G.Server.applyDev(dt);
    if (G.Folk && (G.Folk.open || G.Folk.camK > 0)) G.Folk.camera(cam, dt);
    if (G.camOverride) G.camOverride(cam);
    G.Post.render(G.scene, cam);
  };

  function busCam(dt) {
    const pl = G.player, cam = G.camera;
    const m = G.Input.mouse;
    if (G.Input.playing()) {
      pl.camYaw -= m.dx * 0.0025; pl.camPitch -= m.dy * 0.0025;
      const lx = G.Input.lookX(), ly = G.Input.lookY();
      if (lx || ly) { pl.camYaw -= lx * 2.4 * dt; pl.camPitch -= ly * 2.4 * dt; }
    }
    pl.camPitch = U.clamp(pl.camPitch, -1.2, 0.5);
    const b = G.Bus.pos;
    const d = 26;
    const cp = Math.cos(pl.camPitch);
    cam.position.set(b.x + Math.sin(pl.camYaw) * cp * d, b.y + 4 - Math.sin(pl.camPitch) * d, b.z + Math.cos(pl.camYaw) * cp * d);
    cam.lookAt(b.x, b.y + 4, b.z);
    cam.fov = U.damp(cam.fov, 75, 4, dt); cam.updateProjectionMatrix();
    G.HUD.setScope(false);
  }
  function victoryCam(dt) {
    const v = M.victoryCam, cam = G.camera, t = v.who;
    v.t += dt;
    const k = Math.min(1, v.t / 1.2);
    const a = v.a0 + Math.PI + v.t * 0.35;
    const d = U.lerp(3.2, 4.6, k), h = U.lerp(1.8, 1.1, k);
    const tx = t.pos.x, ty = t.pos.y + 1.1, tz = t.pos.z;
    let cx = tx + Math.sin(a) * d, cz = tz + Math.cos(a) * d, cy = ty + h;
    const gy = G.Terrain.height(cx, cz) + 0.5; if (cy < gy) cy = gy;
    cam.position.set(cx, cy, cz); cam.lookAt(tx, ty, tz);
    cam.fov = U.damp(cam.fov, 60, 3, dt); cam.updateProjectionMatrix();
    t.char.root.visible = true;
    G.HUD.setScope(false);
    // confettis
    if (v.t < 5 && Math.random() < 0.9) {
      for (let i = 0; i < 3; i++) {
        const c = U.pick([[1, 0.85, 0.2], [0.3, 0.7, 1], [1, 0.3, 0.5], [0.4, 1, 0.4], [0.8, 0.4, 1]]);
        G.FX.glow.spawn(tx + U.rand(-4, 4), ty + U.rand(3, 6), tz + U.rand(-4, 4), U.rand(-0.5, 0.5), U.rand(-1, 0.5), U.rand(-0.5, 0.5), c[0], c[1], c[2], 0.12, 2.2, 1.5, 0.2);
      }
    }
  }
  function spectateCam(dt, t) {
    const pl = G.player, cam = G.camera;
    const m = G.Input.mouse;
    if (G.Input.playing()) {
      pl.camYaw -= m.dx * 0.0025; pl.camPitch -= m.dy * 0.0025;
      const lx = G.Input.lookX(), ly = G.Input.lookY();
      if (lx || ly) { pl.camYaw -= lx * 2.4 * dt; pl.camPitch -= ly * 2.4 * dt; }
    }
    pl.camPitch = U.clamp(pl.camPitch, -1.2, 0.8);
    const d = 5;
    const cp = Math.cos(pl.camPitch);
    const tx = t.pos.x, ty = t.pos.y + 1.6, tz = t.pos.z;
    cam.position.set(tx + Math.sin(pl.camYaw) * cp * d, ty - Math.sin(pl.camPitch) * d + 0.5, tz + Math.cos(pl.camYaw) * cp * d);
    cam.lookAt(tx, ty, tz);
    G.HUD.setScope(false);
  }

  // lampes la nuit : les plus proches du joueur s'allument
  function updateNightLights(cp) {
    const night = G.Sky.night;
    const spots = Game.lightSpots;
    if (!spots || night < 0.2) { for (const l of Game.nightLights) l.intensity = 0; return; }
    const sorted = spots.map((s) => [s, (s[0] - cp.x) ** 2 + (s[2] - cp.z) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, Game.nightLights.length);
    sorted.forEach((e, i) => { const l = Game.nightLights[i]; l.position.set(e[0][0], e[0][1], e[0][2]); l.color.setHex(e[0][3] || 0xffd8a0); l.intensity = night * 40; });
  }

  // sons d'ambiance (oiseaux le jour, grillons la nuit, vagues)
  let ambT = 2;
  function ambient(dt, p) {
    ambT -= dt;
    const cd = G.Terrain.coastDist(p.x, p.z);
    G.Audio.setLoop('ocean', U.clamp(1 - cd / 80, 0, 1) * 0.35, 0);
    if (ambT > 0) return;
    ambT = U.rand(1.5, 5);
    const q = [p.x + U.rand(-30, 30), p.y + U.rand(2, 10), p.z + U.rand(-30, 30)];
    if (G.Sky.night > 0.6) G.Audio.play('cricket', { pos: q });
    else if (G.Terrain.forest(p.x, p.z) > 0.2 || Math.random() < 0.4) G.Audio.play('bird', { pos: q });
  }
})();
