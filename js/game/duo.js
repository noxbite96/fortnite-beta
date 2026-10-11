// ============================================================
//  Modes DUO / SECTION : équipes de 2 ou 4, coéquipiers IA,
//  mise à terre et réanimation
// ============================================================
(function () {
  const U = G.U, CB = G.Combat;
  const D = { active: false, mate: null, mates: [], size: 1, REVIVE_TIME: 5, BLEED: 1 / 0.6 };
  G.Duo = D;

  // Répartit les équipes (solo : une équipe par joueur)
  // size : 1 (solo), 2 (duo) ou 4 (section) — accepte aussi un booléen (duo)
  D.setup = function (player, bots, size) {
    if (size === true) size = 2; else if (!size) size = 1;
    D.size = size;
    D.active = size > 1;
    D.rumble = size > 4; // équipe contre équipe : pas de mise à terre, pas de suiveurs
    D.mate = null; D.mates = [];
    const all = [player].concat(bots);
    all.forEach((a, i) => { a.team = Math.floor(i / size); a.downed = false; a.isTeammate = false; a.reviveBy = null; a.reviveT = 0; a.mateIdx = 0; });
    if (D.active && !D.rumble) {
      D.mates = bots.slice(0, size - 1);
      D.mates.forEach((m, i) => { m.isTeammate = true; m.leader = player; m.mateIdx = i + 1; });
      D.mate = D.mates[0] || null;
    }
  };
  D.isMate = (a) => D.mates.indexOf(a) >= 0;
  D.aliveMate = () => D.mates.find((m) => !m.dead && !m.downed) || D.mates.find((m) => !m.dead) || null;
  D.sameTeam = (a, b) => a && b && a !== b && a.team != null && a.team === b.team;
  D.teamOf = (a) => [G.player].concat(G.Match.bots).filter((x) => x.team === a.team);
  D.teamsAlive = function () {
    const s = new Set();
    for (const a of [G.player].concat(G.Match.bots)) if (!a.dead) s.add(a.team);
    return s.size;
  };

  // Appelé quand un personnage tombe à 0 PV : vrai s'il est mis à terre au lieu d'être éliminé
  D.tryKnock = function (t, by, o) {
    if (!D.active || D.rumble || t.downed || t.state === 'bus' || t.npc) return false;
    const mates = D.teamOf(t).filter((m) => m !== t && !m.dead && !m.downed);
    if (!mates.length) return false;
    t.downed = true;
    t.health = 100; t.shield = 0;
    t.downBy = by; t.downWeapon = o.weapon;
    t.bleedT = 0;
    t.buildMode = false; t.cancelUse(); t.reloadT = 0; t.stopEmote && t.stopEmote();
    if (t.vehicle) G.Extras.exitKart(t);
    t.char.anim.mode = 'down';
    t.refreshHeld();
    const w = o.weapon && G.Items.withArticle(o.weapon);
    G.HUD.killFeed(by && by !== t ? [by.name, t.name, w ? 'avec ' + w : '', 'a mis à terre'] : [null, t.name, 'est à terre'], by && by.isPlayer, t.isPlayer, o.weapon);
    if (by && by.isPlayer) { G.Audio.play('hitmarker'); G.HUD.notify('ADVERSAIRE À TERRE !', 1.5); }
    if (t.isPlayer) { G.HUD.notify('VOUS ÊTES À TERRE !', 2.5); G.Audio.play('hurt'); }
    if (D.isMate(t)) { G.HUD.notify(t.name.toUpperCase() + ' EST À TERRE !', 2.5); D.say(t, U.pick(['Je suis à terre, aidez-moi !', 'À terre ! Réanimez-moi !', 'Je rampe vers vous…'])); }
    return true;
  };

  D.revive = function (t, by) {
    if (!t.downed || t.dead) return;
    t.downed = false; t.health = 30; t.shield = 0; t.reviveT = 0; t.reviveBy = null;
    t.char.anim.mode = 'ground';
    t.refreshHeld();
    G.Audio.play('heal_done', { pos: [t.pos.x, t.pos.y + 1, t.pos.z] });
    for (let i = 0; i < 20; i++) G.FX.healParticles(t.pos.x, t.pos.y, t.pos.z, false);
    G.HUD.killFeed([null, t.name, 'a été réanimé(e)' + (by ? ' par ' + by.name : '')], by && by.isPlayer, false);
    if (by && by.isPlayer) { G.HUD.xpToast(150, 'Réanimation'); D.say(t, U.pick(['Merci !', 'Merci, je te dois une fière chandelle !', 'On repart !'])); }
    else if (t.isPlayer && by) D.say(by, U.pick(['Debout !', 'Je t\'ai relevé, soigne-toi !', 'Allez, on y retourne !']));
  };

  // Élimine toute une équipe dont tous les membres sont à terre
  function checkWipe() {
    const teams = {};
    for (const a of [G.player].concat(G.Match.bots)) {
      if (a.dead) continue;
      (teams[a.team] = teams[a.team] || []).push(a);
    }
    for (const k in teams) {
      const m = teams[k];
      // le joueur en dernier pour que l'écran de fin connaisse le classement de l'équipe
      if (m.every((a) => a.downed)) for (const a of m.sort((x, y) => (x.isPlayer ? 1 : 0) - (y.isPlayer ? 1 : 0))) if (!a.dead) CB.eliminate(a, a.downBy, { weapon: a.downWeapon, bleed: true });
    }
  }

  D.update = function (dt) {
    if (!D.active || D.rumble) return;
    let any = false;
    for (const a of [G.player].concat(G.Match.bots)) {
      if (a.dead || !a.downed) continue;
      any = true;
      // réanimation en cours par un coéquipier proche (le saignement est alors suspendu)
      const r = a.reviveBy;
      if (r && G.Game.time < (a.reviveUntil || 0) && !r.dead && !r.downed && Math.hypot(r.pos.x - a.pos.x, r.pos.z - a.pos.z) < 2.6) {
        a.reviveT += dt;
        r.char.anim.crouch = 1;
        if (a.reviveT >= D.REVIVE_TIME) D.revive(a, r);
        continue;
      }
      a.reviveT = Math.max(0, a.reviveT - dt * 2);
      // saignement
      a.bleedT += dt;
      while (a.bleedT >= 0.6) { a.bleedT -= 0.6; a.health -= 1; }
      if (a.health <= 0) { a.downed = false; CB.eliminate(a, a.downBy, { weapon: a.downWeapon, bleed: true }); continue; }
    }
    if (any) checkWipe();
  };

  // Interaction du joueur (réanimer son coéquipier)
  D.interactables = function (out) {
    if (!D.active || G.player.downed) return;
    for (const m of D.mates) if (!m.dead && m.downed) out.push({ kind: 'revive', obj: m, x: m.pos.x, y: m.pos.y + 0.5, z: m.pos.z, name: m.name + ' est à terre', action: 'Maintenir pour réanimer (' + D.REVIVE_TIME + ' s)', range: 2.4 });
  };

  // ------------------------------------------------------------
  //  IA du coéquipier : suit le joueur, le réanime, l'aide au combat
  // ------------------------------------------------------------
  D.mateThink = function (b) {
    const pl = G.player, ai = b.ai;
    if (!pl || b.dead) return false;
    // en l'air : vise la zone du joueur
    if (b.state === 'skydive' || b.state === 'glide') {
      if (pl.state === 'skydive' || pl.state === 'glide' || pl.state === 'ground') {
        const a = (b.mateIdx || 1) * 2.1;
        ai.dropTarget = [pl.pos.x + Math.cos(a) * 9, pl.pos.z + Math.sin(a) * 9];
      }
      return false;
    }
    if (b.state !== 'ground') return false;
    if (pl.dead) return G.Extras2 ? G.Extras2.mateThink(b) : false;
    const d = Math.hypot(pl.pos.x - b.pos.x, pl.pos.z - b.pos.z);
    // réanimer le joueur
    if (pl.downed) {
      const enemyNear = ai.target && !ai.target.dead && Math.hypot(ai.target.pos.x - b.pos.x, ai.target.pos.z - b.pos.z) < 12 && G.Game.time - ai.lastSeenT < 1;
      if (!enemyNear) {
        ai.mode = 'revive';
        ai.nav = d > 1.6 ? [pl.pos.x, pl.pos.z] : null;
        if (d < 2.3) { pl.reviveBy = b; pl.reviveUntil = G.Game.time + 0.8; }
        return true;
      }
    }
    // réanimer un autre coéquipier (section)
    const dm = D.mates.find((m) => m !== b && !m.dead && m.downed);
    if (dm) {
      const enemyNear = ai.target && !ai.target.dead && Math.hypot(ai.target.pos.x - b.pos.x, ai.target.pos.z - b.pos.z) < 12 && G.Game.time - ai.lastSeenT < 1;
      const dd = Math.hypot(dm.pos.x - b.pos.x, dm.pos.z - b.pos.z);
      if (!enemyNear && !(dm.reviveBy && dm.reviveBy !== b && G.Game.time < (dm.reviveUntil || 0))) {
        ai.mode = 'revive'; ai.nav = dd > 1.6 ? [dm.pos.x, dm.pos.z] : null;
        if (dd < 2.3) { dm.reviveBy = b; dm.reviveUntil = G.Game.time + 0.8; }
        return true;
      }
    }
    // aider le joueur attaqué
    if (pl.lastAttacker && !pl.lastAttacker.dead && G.Game.time - pl.lastAttackTime < 3 && !D.sameTeam(pl, pl.lastAttacker)) {
      if (!ai.target || ai.target.dead) { ai.target = pl.lastAttacker; ai.lastSeen = pl.lastAttacker.pos.clone(); ai.lastSeenT = G.Game.time - 0.5; }
    }
    // rester proche du joueur
    const fighting = ai.target && !ai.target.dead && G.Game.time - ai.lastSeenT < 3;
    if (!fighting && d > 22) {
      ai.mode = 'follow';
      const a = (b.mateIdx || 1) * 2.1;
      ai.nav = [pl.pos.x + Math.cos(a) * 5, pl.pos.z + Math.sin(a) * 5];
      b.control.sprint = d > 35;
      if (d > 140 && b.distToCam > 60) { // téléportation de rattrapage hors de vue
        const q = G.Terrain.randomLandPoint(Math.random, pl.pos.x, pl.pos.z, 15, 1);
        b.pos.set(q[0], G.Phys.supportAt(q[0], q[1], pl.pos.y + 20, 0.3, 0) + 0.1, q[1]);
      }
      return true;
    }
    return false;
  };

  // ------------------------------------------------------------
  //  Annonces des coéquipiers (chat d'équipe + marqueur rouge)
  // ------------------------------------------------------------
  const DIRS = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  function dirName(fx, fz, tx, tz) {
    let a = Math.atan2(tx - fx, -(tz - fz)) * 180 / Math.PI; if (a < 0) a += 360;
    return DIRS[Math.round(a / 45) % 8];
  }
  D.say = function (b, msg) {
    if (!D.active || !D.isMate(b) || G.Game.state !== 'playing') return;
    G.HUD.teamChat(b.name, msg);
  };
  D.onMateSpot = function (b, enemy) {
    if (!D.active || !D.isMate(b) || !enemy || enemy.dead || enemy.npc && Math.random() < 0.5) return;
    const now = G.Game.time;
    if (now < (b.calloutT || 0) || now < (D.calloutT || 0)) return;
    b.calloutT = now + 12; D.calloutT = now + 4;
    const pl = G.player;
    const d = Math.round(Math.hypot(enemy.pos.x - pl.pos.x, enemy.pos.z - pl.pos.z));
    D.say(b, (enemy.npc ? (enemy.isBoss ? (enemy === G.NPC.omega ? 'Oméga est là ! ' : enemy === G.NPC.general ? 'Le Général est là ! ' : enemy === G.NPC.reine ? 'La Reine des Glaces est là ! ' : 'Le Roi est là ! ') : enemy.folk ? enemy.name + ' nous attaque ! ' : enemy.bossRef ? (enemy.bossRef === G.NPC.general ? 'Soldat ! ' : enemy.bossRef === G.NPC.reine ? 'Garde de glace ! ' : 'Sbire d\'Oméga ! ') : 'Garde royal ! ') : 'Ennemi repéré ! ') + '(' + dirName(pl.pos.x, pl.pos.z, enemy.pos.x, enemy.pos.z) + ', ' + d + ' m)');
    G.HUD.enemyPing(enemy.pos.x, enemy.pos.y + 1.2, enemy.pos.z);
    G.Audio.play('ping');
  };

  // Rayon de loot limité autour du joueur
  D.lootOk = function (b, x, z) {
    if (!b.isTeammate || !G.player || G.player.dead) return true;
    return Math.hypot(x - G.player.pos.x, z - G.player.pos.z) < 30;
  };
})();
