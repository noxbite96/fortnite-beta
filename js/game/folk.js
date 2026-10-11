// ============================================================
//  PERSONNAGES (PNJ neutres) et LINGOTS D'OR
//  Marchands, soigneuse, informateurs, gardes du corps à engager.
//  Ils sont neutres : ils ne ripostent que si on les attaque.
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const F = { list: [], hired: [], open: null, sel: 0, cd: 0 };
  G.Folk = F;
  const NEUTRAL = 9998;
  const MAX_HIRED = 2;

  // prix d'une arme selon sa rareté
  const PRICE = [60, 120, 200, 300, 450, 600];

  const DEFS = [
    { id: 'lulu', name: 'Docteur Lulu', skin: 'skin_docteur', poi: 'parc', role: 'Soigneuse', weapon: ['pistol', 2], color: '#7fe0ff',
      hello: ['Encore un bobo ? Montre-moi ça.', 'Je soigne tout le monde… contre quelques lingots, bien sûr.', 'Respire, tout va bien se passer !'],
      wares: [['medkit', null, 2, 150], ['bandage', null, 5, 70]], heal: 100 },
    { id: 'gaston', name: 'Chef Gaston', skin: 'skin_cuistot', poi: 'galerie', role: 'Cuisinier', weapon: ['smg', 2], color: '#ffb0d0',
      hello: ['Goûtez-moi ce jus de Slurp, fraîchement pressé !', 'Rien de tel qu\'un pot de Chug avant la bagarre.', 'Ma cuisine est fermée, mais ma boutique est ouverte !'],
      wares: [['slurp', null, 1, 150], ['chug', null, 1, 250]] },
    { id: 'jojo', name: 'Jojo le Cow-boy', skin: 'skin_cowboy', poi: 'ferme', role: 'Chasseur de primes', weapon: ['revolver', 3], color: '#ffcf7a',
      hello: ['Howdy, étranger ! Besoin d\'un bon flingue ?', 'Cette ferme est trop calme… ça ne va pas durer.', 'Pour quelques lingots de plus, je surveille tes arrières.'],
      wares: [['revolver', 3, 1], ['pump', 4, 1]], hire: 300 },
    { id: 'frimas', name: 'Sergent Frimas', skin: 'skin_neige', poi: 'chalet', role: 'Tireur d\'élite', weapon: ['sniper', 3], color: '#d8f0ff',
      hello: ['Il fait frais ici, hein ? Parfait pour viser loin.', 'D\'ici, je vois toute l\'île.', 'Ne fais pas de bruit, tu vas effrayer ma cible.'],
      wares: [['sniper', 3, 1], ['scopedar', 3, 1]], hire: 300 },
    { id: 'nova', name: 'Agente Nova', skin: 'skin_agente', poi: 'tours', role: 'Espionne', weapon: ['silenced', 3], color: '#ff9ad0',
      hello: ['Chut… On nous écoute peut-être.', 'Je sais des choses. Beaucoup de choses.', 'Tu ne m\'as jamais vue, compris ?'],
      wares: [['silenced', 4, 1], ['burst', 3, 1]], hire: 350, rumor: true },
    { id: 'rocco', name: 'Rocco le Punk', skin: 'skin_punk', poi: 'station', role: 'Artificier', weapon: ['ar', 2], color: '#c8a0ff',
      hello: ['Tu veux faire du bruit ? T\'es au bon endroit !', 'Boum ! Haha. Désolé, c\'est l\'habitude.', 'Je me suis enfui de l\'usine… Oméga y a installé ses sbires.'],
      wares: [['rocket', 3, 1], ['grenade', null, 3, 120]], hire: 250 },
    { id: 'maya', name: 'Maya la Surfeuse', skin: 'skin_surf', poi: 'plage', role: 'Pêcheuse', weapon: ['smg', 1], color: '#8affc8',
      hello: ['Les vagues sont top aujourd\'hui !', 'J\'ai pêché des trucs bizarres ce matin…', 'Tu veux un poisson ? Il est encore tout frétillant !'],
      wares: [['flopper', null, 3, 90], ['shieldpot', null, 1, 200]], rumor: true },
    { id: 'marcel', name: 'Capitaine Marcel', skin: 'skin_pirate', poi: 'docks', role: 'Capitaine du port', weapon: ['pump', 2], color: '#ffd83a',
      hello: ['Bienvenue sur mes docks, moussaillon !', 'Un bateau ? Prends-en un, ils sont au bout des pontons.', 'La mer, ça forge le caractère. Et les lingots, ça forge l\'amitié.'],
      wares: [['hunting', 3, 1], ['treasuremap', null, 1, 200]], hire: 250, rumor: true },
    { id: 'colonel', name: 'Colonel Moustache', skin: 'skin_neige', poi: 'base', role: 'Intendant militaire', weapon: ['burst', 3], color: '#b8d08a',
      hello: ['Garde-à-vous, soldat ! Enfin… client.', 'Le Général ne me paie plus, alors je vends du matériel.', 'Un jetpack ? Il a presque jamais explosé.'],
      wares: [['jetpack', null, 1, 350], ['scanner', null, 2, 180]], hire: 350, rumor: true },
    { id: 'gertrude', name: 'Tante Gertrude', skin: 'skin_cuistot', poi: 'sources', role: 'Aubergiste', weapon: ['pistol', 1], color: '#ffc0a0',
      hello: ['Oh mon petit, tu as l\'air affamé !', 'Les sources soignent tout… sauf les balles.', 'Viens t\'asseoir, j\'ai de la soupe. Et des bandages.'],
      wares: [['meat', null, 4, 60], ['cozyfire', null, 1, 150]], heal: 100 },
  ];
  F.DEFS = DEFS;
  // Quêtes des personnages (récompense en lingots d'or)
  const QUESTS = {
    lulu: { txt: 'Ouvre 3 coffres', ev: 'chest', goal: 3, gold: 250 },
    gaston: { txt: 'Pêche 2 fois', ev: 'fish', goal: 2, gold: 250 },
    jojo: { txt: 'Élimine 2 adversaires', ev: 'kill', goal: 2, gold: 400 },
    frimas: { txt: 'Inflige 250 dégâts aux adversaires', stat: 'damage', goal: 250, gold: 350 },
    nova: { txt: 'Cache-toi dans une benne, une meule de foin ou des toilettes', ev: 'hide', goal: 1, gold: 200 },
    rocco: { txt: 'Récolte 200 matériaux', stat: 'mats', goal: 200, gold: 250 },
    maya: { txt: 'Utilise 2 tyroliennes', ev: 'zip', goal: 2, gold: 250 },
    marcel: { txt: 'Élimine un adversaire au fusil à pompe', ev: 'kshotgun', goal: 1, gold: 350 },
    colonel: { txt: 'Élimine un adversaire à plus de 50 m', ev: 'klong', goal: 1, gold: 400 },
    gertrude: { txt: 'Ouvre 2 coffres', ev: 'chest', goal: 2, gold: 200 },
  };
  F.quest = null;

  function waresOf(def) {
    return def.wares.map((w) => {
      const it = I.make(w[0], w[1], w[2]);
      const price = I.WEAPONS[w[0]] ? PRICE[it.rarity] : w[3];
      return { item: it, price, sold: false };
    });
  }

  // ------------------------------------------------------------
  //  Emplacement libre (hors bâtiments) près d'un lieu
  // ------------------------------------------------------------
  F.findSpot = function (cx, cz, rMin, rMax) { return findSpot(cx, cz, rMin, rMax); };
  function findSpot(cx, cz, rMin, rMax) {
    const T = G.Terrain, P = G.Phys;
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, r = U.rand(rMin, rMax + i * 0.3);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const h = T.height(x, z);
      if (h < 0.6 || T.slope(x, z) > 0.3) continue;
      const s = P.supportAt(x, z, h + 14, 0.7, 0);
      if (Math.abs(s - h) > 0.35 && s > h) continue;          // quelque chose au-dessus / toit
      if (!P.freeAt(x, Math.max(s, h) + 0.05, z, 0.8, 2)) continue;
      return [x, z];
    }
    return [cx + rMin, cz];
  }

  // Bulle au-dessus de la tête
  let bubbleTex = null;
  function bubbleSprite(color) {
    if (!bubbleTex) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.strokeStyle = '#1a1a2a'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(14, 8); g.lineTo(50, 8); g.quadraticCurveTo(58, 8, 58, 16); g.lineTo(58, 36); g.quadraticCurveTo(58, 44, 50, 44);
      g.lineTo(30, 44); g.lineTo(20, 56); g.lineTo(22, 44); g.lineTo(14, 44); g.quadraticCurveTo(6, 44, 6, 36); g.lineTo(6, 16); g.quadraticCurveTo(6, 8, 14, 8); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = '#1a1a2a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(20 + i * 12, 26, 4, 0, Math.PI * 2); g.fill(); }
      bubbleTex = new THREE.CanvasTexture(c); bubbleTex.colorSpace = THREE.SRGBColorSpace;
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, color: new THREE.Color(color), depthWrite: false, transparent: true }));
    s.scale.set(0.7, 0.7, 0.7); s.position.set(0, 2.55, 0);
    return s;
  }

  // ------------------------------------------------------------
  //  Création / remise en place
  // ------------------------------------------------------------
  F.create = function () {
    if (F.list.length) return;
    DEFS.forEach((def, i) => {
      const b = new G.Bot({ name: def.name, diff: 1, cos: { skin: def.skin, back: 'back_none', pickaxe: 'pick_default', glider: 'glider_default', trail: 'trail_none', wrap: 'wrap_none' } });
      b.npc = true; b.folk = def; b.folkIdx = i;
      b.bubble = bubbleSprite(def.color);
      b.char.root.add(b.bubble);
      F.list.push(b);
      G.NPC.list.push(b);
    });
  };
  F.setup = function () {
    F.create();
    F.hired.length = 0; F.cd = 0;
    F.quest = null; F.renderQuest(true);
    F.close(true);
    for (const b of F.list) {
      const def = b.folk;
      const p = G.MapData.poiById(def.poi);
      if (!b.spot || b.spotPoi !== def.poi) { b.spot = findSpot(p.x, p.z, 6, Math.min(26, p.r * 0.35)); b.spotPoi = def.poi; }
      b.post = b.spot;
      b.reset();
      b.team = NEUTRAL + b.folkIdx; b.downed = false; b.isTeammate = false;
      b.hiredBy = null; b.hostile = false; b.greeted = false; b.talkT = 0;
      const [x, z] = b.post;
      b.pos.set(x, G.Phys.supportAt(x, z, G.Terrain.height(x, z) + 3, 0.3, 0.6) + 0.05, z);
      b.state = 'ground'; b.inLobby = false; b.invulnerable = false; b.infiniteAmmo = true;
      b.mats = { wood: 100, stone: 100, metal: 50 };
      b.maxHealth = 100; b.maxShield = 100; b.health = 100; b.shield = 100;
      b.gold = U.randInt(80, 160);
      b.char.root.visible = true;
      b.yaw = Math.random() * 6.28;
      b.ai.mode = 'guard';
      b.slots[0] = I.make(def.weapon[0], def.weapon[1]); b.slots[1] = I.make('medkit', null, 1);
      b.sel = -1; b.equip(-1);
      b.wares = waresOf(def);
      b.line = U.pick(def.hello);
      b.questDone = false; b.calledOut = 0;
      b.bubble.visible = true;
    }
  };

  F.release = function (b, msg) {
    const i = F.hired.indexOf(b); if (i >= 0) F.hired.splice(i, 1);
    b.hiredBy = null; b.team = NEUTRAL + b.folkIdx; b.ai.target = null; b.ai.nav = null;
    b.post = [b.pos.x, b.pos.z];
    if (msg && !b.dead) G.HUD.teamChat(b.name, msg);
  };

  // ------------------------------------------------------------
  //  IA
  // ------------------------------------------------------------
  F.think = function (b) {
    const ai = b.ai, pl = G.player, now = G.Game.time;
    ai.lookAt = null;
    if (b.bubble) b.bubble.visible = !b.hiredBy && !b.hostile && F.open !== b;
    const hol = !b.hiredBy && !b.hostile;
    if (hol !== !!b.holster) { b.holster = hol; b.refreshHeld(); }
    // --- garde du corps engagé ---
    if (b.hiredBy) {
      if (!pl || pl.dead || b.hiredBy !== pl) { F.release(b); return true; }
      if (pl.lastAttacker && !pl.lastAttacker.dead && now - pl.lastAttackTime < 3 && pl.lastAttacker !== b && !G.Duo.sameTeam(pl, pl.lastAttacker) && !(ai.target && !ai.target.dead)) {
        ai.target = pl.lastAttacker; ai.lastSeen = pl.lastAttacker.pos.clone(); ai.lastSeenT = now - 0.5;
      }
      const d = Math.hypot(pl.pos.x - b.pos.x, pl.pos.z - b.pos.z);
      const e = ai.target && !ai.target.dead ? ai.target : null;
      const eD = e ? Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z) : 999;
      if (e && d < 45 && eD < 60 && now - ai.lastSeenT < 2.5) {
        ai.mode = 'fight'; b.thinkFight(e, now - ai.lastSeenT < 1.2);
        if (!b.calledOut || now - b.calledOut > 20) { b.calledOut = now; G.HUD.teamChat(b.name, U.pick(['Je m\'en occupe !', 'Ennemi en vue, je couvre !', 'Reste derrière moi !', 'À l\'attaque !'])); }
        return true;
      }
      if (e && !(d < 45 && eD < 60)) ai.target = null;
      if (b.needHeal() && now - b.lastAttackTime > 2) { ai.mode = 'heal'; b.thinkHeal(); return true; }
      ai.mode = 'follow';
      if (pl.state === 'ground' && d > 140 && b.distToCam > 50) {
        const q = G.Terrain.randomLandPoint(Math.random, pl.pos.x, pl.pos.z, 12, 1);
        b.pos.set(q[0], G.Phys.supportAt(q[0], q[1], pl.pos.y + 20, 0.3, 0) + 0.1, q[1]); b.vel.set(0, 0, 0);
      }
      if (d > 4.5) {
        const a = pl.camYaw + Math.PI + (b.folkIdx % 2 ? 0.7 : -0.7);
        ai.nav = [pl.pos.x - Math.sin(a) * 3.5, pl.pos.z - Math.cos(a) * 3.5];
        b.control.sprint = d > 10;
      } else { ai.nav = null; ai.lookAt = [pl.pos.x - Math.sin(pl.camYaw) * 30, pl.pos.z - Math.cos(pl.camYaw) * 30]; }
      if (b.sel >= 0 && d < 8 && !e && Math.random() < 0.05) b.equip(-1);
      return true;
    }
    // --- attaqué : il riposte ---
    const e = ai.target && !ai.target.dead ? ai.target : null;
    if (e && b.lastAttacker === e && now - b.lastAttackTime < 12) {
      if (!b.hostile) {
        b.hostile = true;
        if (e.isPlayer) { G.HUD.notify(b.name.toUpperCase() + ' EST DEVENU HOSTILE !', 2); if (F.open === b) F.close(); }
      }
      ai.mode = 'fight'; b.thinkFight(e, now - ai.lastSeenT < 1.2);
      return true;
    }
    if (b.hostile && now - b.lastAttackTime > 12) { b.hostile = false; ai.target = null; b.equip(-1); }
    ai.target = null;
    if (b.needHeal() && now - b.lastAttackTime > 3) { ai.mode = 'heal'; b.thinkHeal(); return true; }
    // --- attend à son poste, regarde le joueur, lui fait coucou ---
    ai.mode = 'guard';
    const dp = Math.hypot(b.post[0] - b.pos.x, b.post[1] - b.pos.z);
    if (dp > 2.5) { ai.nav = b.post; b.control.sprint = dp > 15; }
    else {
      ai.nav = null;
      if (!ai.idleT || now > ai.idleT) { ai.idleT = now + U.rand(4, 9); ai.idleYaw = Math.random() * 6.28; }
      ai.lookAt = [b.pos.x - Math.sin(ai.idleYaw) * 10, b.pos.z - Math.cos(ai.idleYaw) * 10];
    }
    if (pl && !pl.dead && pl.state === 'ground') {
      const d = Math.hypot(pl.pos.x - b.pos.x, pl.pos.z - b.pos.z);
      if (d < 9) {
        ai.lookAt = [pl.pos.x, pl.pos.z];
        if (!b.greeted && d < 7 && F.open !== b) { b.greeted = true; b.playEmote('emote_salut'); ai.emoteUntil = now + 2.2; }
      } else if (d > 30) b.greeted = false;
    }
    return true;
  };

  F.onDeath = function (v, killer) {
    if (F.open === v) F.close();
    const wasHired = !!v.hiredBy;
    const i = F.hired.indexOf(v); if (i >= 0) F.hired.splice(i, 1);
    v.hiredBy = null;
    if (killer) G.HUD.killFeed([killer.name, v.name, '', 'a éliminé'], killer.isPlayer, false);
    else G.HUD.killFeed([null, v.name, 'est tombé'], false, false);
    if (wasHired) G.HUD.notify('VOTRE GARDE DU CORPS ' + v.name.toUpperCase() + ' EST TOMBÉ', 2.5);
    else if (killer && killer.isPlayer) G.HUD.xpToast(150, 'Personnage éliminé');
  };

  // ------------------------------------------------------------
  //  Interaction
  // ------------------------------------------------------------
  F.interactables = function (out) {
    const pl = G.player;
    if (!pl || pl.dead || G.Game.time < F.cd) return;
    for (const b of F.list) {
      if (b.dead || b.hostile || b.state !== 'ground') continue;
      if (Math.abs(b.pos.x - pl.pos.x) > 4 || Math.abs(b.pos.z - pl.pos.z) > 4) continue;
      out.push({ kind: 'folk', obj: b, x: b.pos.x, y: b.pos.y + 1, z: b.pos.z, name: b.name + (b.hiredBy ? ' (garde du corps)' : ' — ' + b.folk.role), action: 'Parler', range: 3 });
    }
  };

  function root() {
    let el = document.getElementById('npc-dlg');
    if (!el) {
      el = document.createElement('div'); el.id = 'npc-dlg'; el.className = 'hidden';
      document.getElementById('hud').appendChild(el);
      el.addEventListener('mousedown', (e) => e.stopPropagation());
    }
    return el;
  }
  function options(b) {
    const pl = G.player, o = [];
    if (b.hiredBy) {
      o.push({ label: 'Tu fais du bon travail, continue !', act: 'close' });
      o.push({ label: 'Congédier ' + b.name, act: 'fire' });
      o.push({ label: 'Au revoir', act: 'close' });
      return o;
    }
    for (const w of b.wares) o.push({ label: w.sold ? I.name(w.item) + ' — vendu' : I.name(w.item) + (I.WEAPONS[w.item.id] ? ' (' + I.RARITY[w.item.rarity].name + ')' : w.item.count > 1 ? ' ×' + w.item.count : ''), price: w.sold ? null : w.price, icon: G.WModels.itemIcon(w.item), rarity: w.item.rarity, act: 'buy', w, off: w.sold });
    if (b.folk.heal) o.push({ label: 'Me soigner complètement (+' + b.folk.heal + ' PV)', price: 100, act: 'heal', off: pl.health >= 100 });
    if (b.folk.hire) o.push({ label: 'Engager comme garde du corps', price: b.folk.hire, act: 'hire', off: F.hired.length >= MAX_HIRED });
    if (b.folk.rumor) o.push({ label: 'Tu as entendu des rumeurs ?', act: 'rumor' });
    const qd = QUESTS[b.folk.id];
    if (qd && !b.questDone) {
      if (F.quest && F.quest.npc === b) o.push({ label: 'Quête en cours : ' + qd.txt + ' (' + Math.floor(F.questProg()) + '/' + qd.goal + ')', act: 'none', off: true });
      else o.push({ label: 'Quête : ' + qd.txt + ' (+' + qd.gold + ' lingots)', act: 'quest', quest: true });
    }
    o.push({ label: 'Au revoir', act: 'close' });
    return o;
  }
  F.render = function () {
    const b = F.open; if (!b) return;
    const pl = G.player, el = root();
    const opts = options(b);
    F.opts = opts;
    F.sel = U.clamp(F.sel, 0, opts.length - 1);
    let s = `<div class="nd-box"><div class="nd-head" style="border-color:${b.folk.color}"><div class="nd-name fn">${b.name}</div><div class="nd-role">${b.hiredBy ? 'Garde du corps' : b.folk.role}</div></div>`;
    s += `<div class="nd-text">« ${b.line} »</div><div class="nd-opts">`;
    opts.forEach((o, i) => {
      const poor = o.price != null && (pl.gold || 0) < o.price;
      s += `<div class="nd-opt ${i === F.sel ? 'sel' : ''} ${o.off ? 'off' : ''} ${poor ? 'poor' : ''}" data-i="${i}"><span class="nd-key fn">${i + 1}</span>` +
        (o.icon ? `<img src="${o.icon}" style="background:${I.RARITY[o.rarity].bg}">` : '') +
        `<span class="nd-lab">${o.label}</span>` + (o.price != null ? `<span class="nd-price fn"><i class="gold-ico"></i>${o.price}</span>` : '') + '</div>';
    });
    s += `</div><div class="nd-foot"><span><i class="gold-ico"></i> Vos lingots : <b>${pl.gold || 0}</b></span><span>1-${opts.length} / clic : choisir · E / Échap : partir</span></div></div>`;
    el.innerHTML = s;
    el.querySelectorAll('.nd-opt').forEach((d) => {
      d.onmouseenter = () => { if (F.sel !== +d.dataset.i) { F.sel = +d.dataset.i; el.querySelectorAll('.nd-opt').forEach((x) => x.classList.toggle('sel', x === d)); G.Audio.play('ui_hover'); } };
      d.onclick = () => F.choose(+d.dataset.i);
    });
  };
  F.talk = function (b) {
    const pl = G.player;
    if (!b || b.dead || b.hostile) return;
    F.open = b; F.lastTalk = b; F.sel = 0; F.shot = null;
    b.talkT = G.Game.time;
    b.stopEmote(); b.ai.emoteUntil = 0; b.ai.nav = null;
    // on se tourne l'un vers l'autre
    const dx = b.pos.x - pl.pos.x, dz = b.pos.z - pl.pos.z;
    pl.camYaw = Math.atan2(-dx, -dz); pl.camPitch = -0.08;
    b.yaw = Math.atan2(dx, dz);
    if (!b.hiredBy && Math.random() < 0.6) b.line = U.pick(b.folk.hello);
    G.Game.ignoreUnlock = true; G.Input.exitLock(); setTimeout(() => { G.Game.ignoreUnlock = false; }, 300);
    root().classList.remove('hidden');
    document.getElementById('hud').classList.add('talking');
    if (b.bubble) b.bubble.visible = false;
    F.render();
    G.Audio.play('talk');
  };
  F.close = function (silent) {
    if (!F.open) return;
    F.open = null;
    root().classList.add('hidden');
    document.getElementById('hud').classList.remove('talking');
    F.cd = G.Game.time + 0.5;
    if (!silent) { G.Input.requestLock(); G.Audio.play('ui_back'); }
  };
  function say(b, txt) { b.line = txt; F.render(); }
  F.choose = function (i) {
    const b = F.open, pl = G.player;
    if (!b || !F.opts || !F.opts[i]) return;
    const o = F.opts[i];
    F.sel = i;
    if (o.act === 'close') { F.close(); return; }
    if (o.off) { G.Audio.play('build_fail'); return; }
    if (o.price != null && (pl.gold || 0) < o.price) { say(b, 'Reviens quand tu auras ' + o.price + ' lingots d\'or. Il t\'en manque ' + (o.price - (pl.gold || 0)) + '.'); G.Audio.play('build_fail'); return; }
    if (o.act === 'buy') {
      const w = o.w, it = w.item;
      pl.gold -= o.price; w.sold = true;
      const copy = Object.assign({}, it);
      const isW = !!I.WEAPONS[it.id];
      if (!pl.takeItem(copy, false)) {
        G.Loot.spawn({ kind: 'item', item: copy }, pl.pos.x, pl.pos.y + 0.3, pl.pos.z);
        G.HUD.notify('Inventaire plein : ' + I.name(copy) + ' posé à vos pieds', 2);
      } else if (isW && pl.sel < 0) { const k = pl.slots.indexOf(copy); if (k >= 0) pl.equip(k); }
      if (isW) { const am = I.WEAPONS[it.id].ammo; pl.ammo[am] = Math.min(999, (pl.ammo[am] || 0) + I.AMMO[am].pick * 3); }
      G.HUD.pickupNote(I.name(copy), I.RARITY[copy.rarity].color);
      G.Audio.play('buy');
      if (G.Match) G.Match.challengeEvent('buy');
      say(b, U.pick(['Excellent choix !', 'Fais-en bon usage.', 'Tu ne le regretteras pas !', 'Merci pour les lingots !']));
    } else if (o.act === 'heal') {
      pl.gold -= o.price; pl.health = Math.min(100, pl.health + b.folk.heal);
      G.FX.healParticles(pl.pos.x, pl.pos.y, pl.pos.z, false);
      G.Audio.play('heal_done');
      say(b, 'Et voilà, comme neuf ! Évite les balles, cette fois.');
    } else if (o.act === 'hire') {
      pl.gold -= o.price;
      b.hiredBy = pl; b.team = pl.team; b.hostile = false; b.ai.target = null;
      b.health = b.maxHealth; b.shield = b.maxShield;
      F.hired.push(b);
      G.Audio.play('buy');
      if (G.Match) G.Match.challengeEvent('hire');
      G.HUD.notify(b.name.toUpperCase() + ' EST VOTRE GARDE DU CORPS', 2.5);
      F.close();
      G.HUD.teamChat(b.name, U.pick(['Je te suis, patron !', 'On y va. Personne ne te touchera.', 'Marché conclu ! Je couvre tes arrières.']));
      return;
    } else if (o.act === 'fire') {
      F.close();
      F.release(b, 'Bon, je rentre chez moi. Bonne chance !');
      b.post = b.spot;
      return;
    } else if (o.act === 'quest') {
      const qd = QUESTS[b.folk.id];
      if (F.quest && F.quest.npc !== b) G.HUD.notify('Quête de ' + F.quest.npc.name + ' abandonnée', 1.5);
      F.quest = { npc: b, def: qd, prog: 0, base: qd.stat ? (pl.stats[qd.stat] || 0) : 0 };
      G.Audio.play('card');
      say(b, U.pick(['Marché conclu ! Reviens vite, je paie bien.', 'Parfait. Je compte sur toi !', 'Fais ça pour moi et les lingots sont à toi.']));
      F.renderQuest(true);
    } else if (o.act === 'rumor') {
      const r = F.rumor(b);
      say(b, r.t);
      if (r.x != null) { G.HUD.ping = { x: r.x, z: r.z }; G.Audio.play('ping'); }
    }
    F.render();
  };

  // Rumeur : un lieu intéressant marqué sur la carte
  F.rumor = function (b) {
    const pl = G.player, opts = [];
    const boss = G.NPC.boss;
    if (boss && !boss.dead) opts.push({ x: boss.post[0], z: boss.post[1], t: 'Le Roi se cache au Château Royal. Il garde une arme mythique… et la carte-clé de sa chambre forte. Je te l\'ai marqué sur la carte.' });
    const qn = G.NPC.reine;
    if (qn && !qn.dead) opts.push({ x: qn.post[0], z: qn.post[1], t: 'La Reine des Glaces règne sur le Chalet du Pic. Ses flèches de glace vous ralentissent… ne restez pas à découvert !' });
    const gen = G.NPC.general;
    if (gen && !gen.dead) opts.push({ x: gen.post[0], z: gen.post[1], t: 'Le Général Tonnerre a pris la Base Militaire. Son lance-roquettes mythique tire deux roquettes d\'affilée… prudence !' });
    const om = G.NPC.omega;
    if (om && !om.dead) opts.push({ x: om.post[0], z: om.post[1], t: 'Un colosse d\'acier, Oméga, a pris l\'Usine Rouillée. Son minigun mythique démarre en un éclair… Méfie-toi de ses sbires !' });
    const cs = G.Loot.chests.filter((c) => c.active && !c.opened && !c.vault && Math.hypot(c.x - pl.pos.x, c.z - pl.pos.z) > 35 && Math.hypot(c.x - pl.pos.x, c.z - pl.pos.z) < 220);
    if (cs.length) { const c = U.pick(cs); opts.push({ x: c.x, z: c.z, t: 'Il paraît qu\'un coffre n\'a pas encore été ouvert, pas loin d\'ici. Je te l\'ai marqué !' }); }
    const others = F.list.filter((o) => o !== b && !o.dead && !o.hiredBy && o.folk.hire);
    if (others.length) { const o = U.pick(others); opts.push({ x: o.pos.x, z: o.pos.z, t: o.name + ' cherche du travail. Avec assez de lingots, il te protégera. Je te montre où le trouver.' }); }
    if (G.Extras2 && G.Extras2.benches && G.Extras2.benches.length) { const bn = G.Extras2.benches.slice().sort((a, c) => Math.hypot(a.x - pl.pos.x, a.z - pl.pos.z) - Math.hypot(c.x - pl.pos.x, c.z - pl.pos.z))[0]; opts.push({ x: bn.x, z: bn.z, t: 'Un établi d\'amélioration, c\'est ce qu\'il te faut. Le plus proche est marqué sur ta carte.' }); }
    if (!opts.length) return { t: 'Rien de neuf… L\'île est bien calme aujourd\'hui.' };
    return U.pick(opts);
  };

  // Progression de la quête active
  F.questProg = function () {
    const q = F.quest; if (!q) return 0;
    if (q.def.stat) return Math.max(0, (G.player.stats[q.def.stat] || 0) - q.base);
    return q.prog;
  };
  F.questEvent = function (ev, n) {
    const q = F.quest; if (!q || q.def.stat || q.def.ev !== ev) return;
    q.prog += n || 1;
  };
  F.checkQuest = function () {
    const q = F.quest; if (!q) return;
    const pl = G.player;
    if (!pl || pl.dead) return;
    if (F.questProg() >= q.def.goal) {
      F.quest = null; q.npc.questDone = true;
      pl.gold = Math.min(9999, (pl.gold || 0) + q.def.gold);
      G.HUD.notify('QUÊTE DE ' + q.npc.name.toUpperCase() + ' TERMINÉE ! +' + q.def.gold + ' LINGOTS', 3, 'upgrade');
      G.HUD.xpToast(800, 'Quête terminée');
      G.Audio.play('buy');
      if (G.Match) G.Match.challengeEvent('gold', q.def.gold);
    }
    F.renderQuest();
  };
  let questKey = '';
  F.renderQuest = function (force) {
    let el = document.getElementById('npc-quest');
    if (!el) { const h = document.getElementById('hud'); if (!h) return; el = document.createElement('div'); el.id = 'npc-quest'; h.appendChild(el); }
    const q = F.quest;
    const key = q ? q.npc.name + Math.floor(F.questProg()) : '';
    if (key === questKey && !force) return;
    questKey = key;
    el.classList.toggle('hidden', !q);
    if (!q) return;
    const p = Math.min(q.def.goal, Math.floor(F.questProg()));
    el.innerHTML = `<div class="nq-t">QUÊTE DE ${q.npc.name.toUpperCase()}</div><div class="nq-n">${q.def.txt}</div><div class="nq-b"><div style="width:${(p / q.def.goal * 100).toFixed(0)}%"></div></div><div class="nq-p"><span><i class="gold-ico"></i>${q.def.gold}</span><span>${p} / ${q.def.goal}</span></div>`;
  };

  document.addEventListener('keydown', (e) => {
    if (!F.open) return;
    const k = e.code;
    if (k === 'Escape' || k === 'KeyE') { e.preventDefault(); e.stopPropagation(); F.close(); return; }
    const m = /^(Digit|Numpad)([1-9])$/.exec(k);
    if (m) { e.preventDefault(); F.choose(+m[2] - 1); return; }
    if (k === 'ArrowDown' || k === 'KeyS') { F.sel = Math.min((F.opts || []).length - 1, F.sel + 1); F.render(); G.Audio.play('ui_hover'); }
    if (k === 'ArrowUp' || k === 'KeyZ' || k === 'KeyW') { F.sel = Math.max(0, F.sel - 1); F.render(); G.Audio.play('ui_hover'); }
    if (k === 'Enter' || k === 'Space') { e.preventDefault(); F.choose(F.sel); }
  }, true);

  // Fermeture automatique (le personnage s'éloigne, meurt, ou le joueur est touché)
  F.update = function () {
    if (F.quest) F.checkQuest();
    const b = F.open, pl = G.player;
    if (!b) return;
    if (b.dead || b.hostile || !pl || pl.dead || pl.downed || G.Game.time - pl.lastAttackTime < 0.2 || Math.hypot(b.pos.x - pl.pos.x, b.pos.z - pl.pos.z) > 6) F.close(true);
    else { b.ai.lookAt = [pl.pos.x, pl.pos.z]; b.ai.nav = null; }
  };

  // Caméra de dialogue : par-dessus l'épaule du joueur, face au personnage
  const _cp = new THREE.Vector3(), _ct = new THREE.Vector3(), _o = new THREE.PerspectiveCamera(), _q = new THREE.Quaternion();
  F.camK = 0;
  F.camera = function (cam, dt) {
    const b = F.open || F.lastTalk, pl = G.player;
    F.camK = U.clamp(F.camK + (F.open ? dt * 3 : -dt * 4), 0, 1);
    if (!b || !pl || F.camK <= 0) return;
    let dx = pl.pos.x - b.pos.x, dz = pl.pos.z - b.pos.z;
    const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const rx = dz, rz = -dx;
    // choix du plan (une fois par conversation) : épaule droite, gauche, puis vues de côté, sans mur entre les deux
    if (F.camFor !== b || !F.shot) {
      F.camFor = b;
      const cands = [[1.5, 1.0], [1.5, -1.0], [0.6, 1.6], [0.6, -1.6], [0.2, 0.9], [0.2, -0.9]];
      const hy = b.pos.y + 1.5;
      F.shot = cands[0];
      for (const c of cands) {
        const x = pl.pos.x + dx * c[0] + rx * c[1], z = pl.pos.z + dz * c[0] + rz * c[1];
        if (G.Phys.los(b.pos.x, hy, b.pos.z, x, pl.pos.y + 1.7, z, b.hitboxEnt, pl.hitboxEnt) && G.Phys.freeAt(x, pl.pos.y + 1.2, z, 0.25, 0.7)) { F.shot = c; break; }
      }
    }
    const sh = F.shot;
    _cp.set(pl.pos.x + dx * sh[0] + rx * sh[1], pl.pos.y + 1.7, pl.pos.z + dz * sh[0] + rz * sh[1]);
    _ct.set(b.pos.x - rx * 0.25 * Math.sign(sh[1]), b.pos.y + 0.95, b.pos.z - rz * 0.25 * Math.sign(sh[1]));
    _o.position.copy(_cp); _o.lookAt(_ct);
    const k = F.camK * F.camK * (3 - 2 * F.camK);
    cam.position.lerp(_cp, k);
    _q.copy(cam.quaternion).slerp(_o.quaternion, k);
    cam.quaternion.copy(_q);
    cam.updateMatrixWorld();
  };

  // Icônes sur la carte : bulle de dialogue
  F.mapIcons = function (ctx, toMap, big) {
    const s = big ? 1.4 : 1;
    for (const b of F.list) {
      if (b.dead || b.hiredBy || b.hostile) continue;
      const m = toMap(b.pos.x, b.pos.z);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m[0] - 6 * s, m[1] - 5 * s); ctx.lineTo(m[0] + 6 * s, m[1] - 5 * s); ctx.lineTo(m[0] + 6 * s, m[1] + 3 * s);
      ctx.lineTo(m[0] - 1 * s, m[1] + 3 * s); ctx.lineTo(m[0] - 4 * s, m[1] + 7 * s); ctx.lineTo(m[0] - 3.5 * s, m[1] + 3 * s); ctx.lineTo(m[0] - 6 * s, m[1] + 3 * s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = b.folk.color;
      ctx.fillRect(m[0] - 3.5 * s, m[1] - 2.5 * s, 7 * s, 3 * s);
      if (big) { ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3; ctx.strokeText(b.name, m[0], m[1] + 18); ctx.fillText(b.name, m[0], m[1] + 18); }
    }
  };
})();
