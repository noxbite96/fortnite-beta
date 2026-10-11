// ============================================================
//  PNJ : les boss et leurs gardes
//  - le Roi (Château Royal) : « Fusil d'assaut du Roi » + carte-clé de la chambre forte
//  - Oméga, le Colosse d'acier (Usine Rouillée) : « Minigun d'Oméga »
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const N = { list: [], boss: null, bosses: [] };
  G.NPC = N;
  const TEAM = 9999;

  function make(name, skin, diff, post, o) {
    const b = new G.Bot({ name, diff, cos: { skin, back: o.back || 'back_none', pickaxe: 'pick_default', glider: 'glider_default', trail: 'trail_none', wrap: o.wrap || 'wrap_none' } });
    b.npc = true; b.team = TEAM;
    b.post = post; b.leash = o.leash || 40; b.patrolR = o.patrol || 6;
    b.maxHealth = o.hp || 100; b.maxShield = o.sh || 100;
    b.baseHp = b.maxHealth; b.baseSh = b.maxShield;
    b.isBoss = !!o.boss;
    b.guardName = o.guardName || 'un garde';
    if (o.scale) { b.bodyScale = o.scale; b.char.root.scale.set(-o.scale, o.scale, o.scale); }
    return b;
  }
  function place(b) {
    b.reset();
    // difficulté choisie : boss = un cran au-dessus des bots (sans dépasser pro), gardes = comme les bots ; vie réduite en facile
    if (!b.dummy && b.baseHp) {
      const base = U.clamp(Math.round(G.Match && G.Match.botDiff != null ? G.Match.botDiff : G.Store.data.settings.difficulty), 0, 3);
      b.setDiff(b.isBoss ? Math.min(3, base + 1) : base);
      const k = b.isBoss ? [0.55, 0.8, 1, 1.15][base] : [0.7, 0.85, 1, 1][base];
      b.maxHealth = Math.round(b.baseHp * k); b.maxShield = Math.round(b.baseSh * k);
    }
    b.team = TEAM; b.downed = false; b.isTeammate = false;
    const [x, z] = b.post;
    b.pos.set(x, G.Phys.supportAt(x, z, G.Terrain.height(x, z) + 3, 0.3, 0.6) + 0.05, z);
    b.state = 'ground'; b.inLobby = false; b.invulnerable = false; b.infiniteAmmo = true; b.infiniteMats = false;
    b.mats = { wood: 200, stone: 200, metal: 100 };
    b.health = b.maxHealth; b.shield = b.maxShield;
    b.char.root.visible = true;
    b.yaw = Math.PI;
    b.ai.mode = 'guard';
    b.announced = false;
  }

  // Création (une fois) puis remise en place à chaque partie
  N.setup = function () {
    N.buildVault(); N.resetVault();
    const p = G.MapData.poiById('chateau');
    const cx = p.x, cz = p.z;
    if (!N.list.length) {
      N.boss = make('Le Roi', 'skin_roi', 3, [cx, cz - 9.2], { boss: true, hp: 400, sh: 200, leash: 45, patrol: 3, back: 'back_epee', wrap: 'wrap_or' });
      N.list.push(N.boss);
      const posts = [[cx - 3, cz + 0.5], [cx + 3, cz + 0.5], [cx, cz + 22], [cx - 18, cz + 12]];
      posts.forEach((q, i) => N.list.push(make('Garde royal ' + (i + 1), 'skin_chevalier', 1, q, { hp: 100, sh: 100, leash: 38, patrol: i < 2 ? 2 : 8, back: 'back_bouclier' })));
      N.boss.mythic = 'mythic_ar'; N.boss.spot = 'Château Royal'; N.boss.color = '#ffcf3a';
      N.bosses.push(N.boss);
    }
    // Général Tonnerre et ses soldats à la Base Militaire
    if (!N.general && G.Folk && G.MapData.poiById('base')) {
      const bp0 = G.MapData.poiById('base');
      const gp = [bp0.x - 8, bp0.z - 2];
      N.general = make('Général Tonnerre', 'skin_commando', 3, gp, { boss: true, hp: 450, sh: 200, leash: 48, patrol: 5, back: 'back_none', wrap: 'wrap_or', scale: 1.1 });
      N.general.mythic = 'mythic_rocket'; N.general.spot = 'Base Militaire'; N.general.color = '#8ac05a';
      N.list.push(N.general); N.bosses.push(N.general);
      const posts = [[bp0.x - 30, bp0.z + 30], [bp0.x + 30, bp0.z - 26], [bp0.x + 14, bp0.z + 28]];
      posts.forEach((q, i) => { const g = make('Soldat ' + (i + 1), 'skin_commando', 1, q, { hp: 100, sh: 100, leash: 42, patrol: 8, guardName: 'un soldat' }); g.bossRef = N.general; N.list.push(g); });
    }
    // La Reine des Glaces et sa garde au Chalet du Pic
    if (!N.reine && G.Folk && G.MapData.poiById('chalet')) {
      const cp = G.MapData.poiById('chalet');
      const rp = [cp.x + 6, cp.z - 4];
      N.reine = make('La Reine des Glaces', 'skin_glace', 3, rp, { boss: true, hp: 400, sh: 250, leash: 44, patrol: 6, back: 'back_none', wrap: 'wrap_none', scale: 1.08 });
      N.reine.mythic = 'mythic_icebow'; N.reine.spot = 'Chalet du Pic'; N.reine.color = '#9ad8ff';
      N.list.push(N.reine); N.bosses.push(N.reine);
      const posts = [[cp.x - 24, cp.z + 18], [cp.x + 22, cp.z + 20], [cp.x - 18, cp.z - 22]];
      posts.forEach((q, i) => { const g = make('Garde de glace ' + (i + 1), 'skin_neige', 1, q, { hp: 100, sh: 100, leash: 40, patrol: 8, guardName: 'un garde de glace' }); g.bossRef = N.reine; N.list.push(g); });
    }
    // Oméga, le Colosse d'acier, et ses sbires à l'Usine Rouillée
    if (!N.omega && G.Folk) {
      const u = G.MapData.poiById('usine');
      const bp = G.Folk.findSpot(u.x, u.z, 8, 22);
      N.omega = make('Oméga, le Colosse', 'skin_robot', 3, bp, { boss: true, hp: 500, sh: 250, leash: 50, patrol: 4, back: 'back_none', wrap: 'wrap_or', scale: 1.22 });
      N.omega.mythic = 'mythic_minigun'; N.omega.spot = 'Usine Rouillée'; N.omega.color = '#ff7a2a';
      N.list.push(N.omega); N.bosses.push(N.omega);
      for (let i = 0; i < 3; i++) {
        const q = G.Folk.findSpot(bp[0], bp[1], 4, 12);
        const g = make('Sbire d\'Oméga ' + (i + 1), 'skin_commando', 1, q, { hp: 100, sh: 75, leash: 45, patrol: 7, guardName: 'un sbire' });
        g.bossRef = N.omega;
        N.list.push(g);
      }
    }
    for (const b of N.list) {
      if (b.folk || b.dummy) continue;
      place(b);
      if (b === N.reine) {
        b.slots[0] = I.make('mythic_icebow', 5); b.slots[1] = I.make('tactical', 4); b.slots[2] = I.make('medkit', null, 2); b.slots[3] = I.make('shieldpot', null, 2); b.slots[4] = I.make('chug', null, 1);
        b.ammo.arrows = 60;
      } else if (b === N.general) {
        b.slots[0] = I.make('mythic_rocket', 5); b.slots[1] = I.make('ar', 4); b.slots[2] = I.make('medkit', null, 2); b.slots[3] = I.make('shieldpot', null, 2); b.slots[4] = I.make('grenade', null, 4);
      } else if (b === N.omega) {
        b.slots[0] = I.make('mythic_minigun', 5); b.slots[1] = I.make('rocket', 4); b.slots[2] = I.make('medkit', null, 2); b.slots[3] = I.make('shieldpot', null, 2); b.slots[4] = I.make('chug', null, 1);
      } else if (b.isBoss) {
        b.slots[0] = I.make('mythic_ar', 5); b.slots[1] = I.make('pump', 4); b.slots[2] = I.make('medkit', null, 2); b.slots[3] = I.make('shieldpot', null, 2); b.slots[4] = I.make('keycard');
      } else {
        b.slots[0] = I.make(U.pick(['ar', 'burst', 'smg']), U.randInt(2, 3)); b.slots[1] = I.make(U.pick(['pump', 'tactical']), U.randInt(2, 3)); b.slots[2] = I.make('bandage', null, 5); b.slots[3] = I.make('smallshield', null, 3);
      }
      b.sel = -1; b.equip(0);
      b.gold = b.isBoss ? 500 : 120;
    }
    if (G.Folk) G.Folk.setup();
  };
  // ------------------------------------------------------------
  //  Cibles d'entraînement (Terrain de jeu, touche K) : elles ne meurent jamais
  // ------------------------------------------------------------
  N.dummies = [];
  N.spawnDummies = function () {
    const pl = G.player;
    if (!pl || pl.dead || pl.state !== 'ground') return;
    if (!N.dummies.length) {
      for (let i = 0; i < 3; i++) {
        const b = make('Cible d\'entraînement', 'skin_nounours', 0, [0, 0], { hp: 100, sh: 100 });
        b.dummy = true; b.team = 9990 + i;
        N.dummies.push(b); N.list.push(b);
      }
    }
    const fx = -Math.sin(pl.camYaw), fz = -Math.cos(pl.camYaw);
    [8, 20, 45].forEach((d, i) => {
      const b = N.dummies[i];
      const x = pl.pos.x + fx * d, z = pl.pos.z + fz * d;
      b.post = [x, z]; place(b);
      b.team = 9990 + i;
      b.slots = [null, null, null, null, null]; b.sel = -1; b.equip(-1);
      b.yaw = pl.camYaw; b.holster = true; b.refreshHeld();
      for (let k = 0; k < 20; k++) G.FX.glow.spawn(x, b.pos.y + 1, z, U.rand(-2, 2), U.rand(1, 4), U.rand(-2, 2), 1, 0.85, 0.3, 0.2, 0.6, 3, 1);
    });
    G.Audio.play('build');
    G.HUD.notify('CIBLES D\'ENTRAÎNEMENT À 8, 20 ET 45 M', 1.8);
  };
  document.addEventListener('keydown', (e) => {
    if (!G.Input.hit('sandboxTargets') || e.repeat) return;
    if (!G.Match || !G.Match.playground || G.Game.state !== 'playing' || (G.HUD && G.HUD.modalOpen())) return;
    N.spawnDummies();
  });

  N.clear = function () {
    for (const b of N.list) { b.dead = true; b.char.root.visible = false; b.state = 'dead'; }
    if (G.Folk) { G.Folk.close(true); G.Folk.quest = null; G.Folk.hired.length = 0; G.Folk.renderQuest(true); }
  };

  // Réflexion d'un PNJ (appelée par Bot.think après la perception)
  N.think = function (b) {
    if (b.folk) return G.Folk.think(b);
    if (b.dummy) { b.ai.mode = 'guard'; b.ai.nav = null; b.ai.target = null; b.ai.lookAt = null; return true; }
    const ai = b.ai;
    const enemy = ai.target && !ai.target.dead ? ai.target : null;
    const seeRecent = enemy && G.Game.time - ai.lastSeenT < 1.2;
    const inLeash = enemy && Math.hypot(enemy.pos.x - b.post[0], enemy.pos.z - b.post[1]) < b.leash;
    if (enemy && inLeash && (seeRecent || G.Game.time - ai.lastSeenT < 4)) {
      ai.mode = 'fight';
      if (b.isBoss && !b.announced && enemy.isPlayer) { b.announced = true; G.HUD.notify(b === N.omega ? 'OMÉGA VOUS A REPÉRÉ !' : b === N.general ? 'LE GÉNÉRAL TONNERRE VOUS A REPÉRÉ !' : b === N.reine ? 'LA REINE DES GLACES VOUS A REPÉRÉ !' : 'LE ROI VOUS A REPÉRÉ !', 2.5); }
      b.thinkFight(enemy, seeRecent);
      return true;
    }
    if (enemy && !inLeash) ai.target = null;
    if (b.needHeal() && G.Game.time - b.lastAttackTime > 2) { ai.mode = 'heal'; b.thinkHeal(); return true; }
    // garde / patrouille autour du poste
    ai.mode = 'guard';
    if (!ai.patrol || G.Game.time > ai.patrolT) {
      ai.patrol = [b.post[0] + U.rand(-b.patrolR, b.patrolR), b.post[1] + U.rand(-b.patrolR, b.patrolR)];
      ai.patrolT = G.Game.time + U.rand(5, 11);
    }
    const dp = Math.hypot(ai.patrol[0] - b.pos.x, ai.patrol[1] - b.pos.z);
    ai.nav = dp > 1.2 ? ai.patrol : null;
    b.control.sprint = Math.hypot(b.post[0] - b.pos.x, b.post[1] - b.pos.z) > 20;
    return true;
  };

  N.onDeath = function (v, killer) {
    if (v.folk) { G.Folk.onDeath(v, killer); return; }
    const txt = [killer ? killer.name : null, v.name, killer ? 'a vaincu ' + (v.isBoss ? 'le boss' : v.guardName) : 'est tombé'];
    if (killer) G.HUD.killFeed([killer.name, v.name, '', v.isBoss ? 'a vaincu' : 'a éliminé'], killer.isPlayer, false);
    else G.HUD.killFeed([null, v.name, 'est tombé'], false, false);
    void txt;
    if (v.isBoss) {
      const bn = v === N.omega ? 'OMÉGA' : v === N.general ? 'LE GÉNÉRAL TONNERRE' : v === N.reine ? 'LA REINE DES GLACES' : 'LE ROI';
      G.HUD.notify(killer && killer.isPlayer ? 'VOUS AVEZ VAINCU ' + bn + ' ! RÉCUPÉREZ SON ARME MYTHIQUE' : bn + ' A ÉTÉ VAINCU' + (killer ? ' PAR ' + killer.name.toUpperCase() : ''), 4);
      G.Audio.play('levelup');
      if (killer && killer.isPlayer) { G.HUD.xpToast(1000, 'Boss vaincu'); if (G.Match) G.Match.challengeEvent('boss'); }
      const p = v.pos;
      for (let i = 0; i < 90; i++) G.FX.glow.spawn(p.x, p.y + 1, p.z, U.rand(-6, 6), U.rand(3, 12), U.rand(-6, 6), 1, 0.8, 0.2, 0.3, 1.5, 9, 1);
      if (G.Medal) G.Medal.drop(v);
    } else if (killer && killer.isPlayer) G.HUD.xpToast(200, v.guardName === 'un sbire' ? 'Sbire éliminé' : v.guardName === 'un soldat' ? 'Soldat éliminé' : v.guardName === 'un garde de glace' ? 'Garde de glace éliminé' : 'Garde éliminé');
  };


  // ------------------------------------------------------------
  //  Chambre forte du Château Royal (ouverte avec la carte-clé du Roi)
  // ------------------------------------------------------------
  N.buildVault = function () {
    if (N.vault) return;
    const p = G.MapData.poiById('chateau');
    const x = p.x + 15, z = p.z + 13;
    const y = G.Phys.supportAt(x, z, G.Terrain.height(x, z) + 2, 0.5, 0.6);
    const g = new THREE.Group(); g.position.set(x, y, z);
    const parts = [], glow = [];
    const addBox = (sx, sy, sz, col, px, py, pz, isGlow) => { const geo = new THREE.BoxGeometry(sx, sy, sz); geo.translate(px, py, pz); (isGlow ? glow : parts).push(G.Veg.colored(geo, col, isGlow ? 0 : 0.06)); };
    const W = 7, H = 3.8, T = 0.5, stone = 0x8a8a92, dark = 0x55555e;
    addBox(W, H, T, stone, 0, H / 2, W / 2 - T / 2);                 // mur sud
    addBox(T, H, W, stone, -W / 2 + T / 2, H / 2, 0);                // ouest
    addBox(T, H, W, stone, W / 2 - T / 2, H / 2, 0);                 // est
    addBox(2.25, H, T, stone, -W / 2 + 1.125, H / 2, -W / 2 + T / 2); // nord gauche
    addBox(2.25, H, T, stone, W / 2 - 1.125, H / 2, -W / 2 + T / 2);  // nord droite
    addBox(2.5, 0.9, T, stone, 0, H - 0.45, -W / 2 + T / 2);          // linteau
    addBox(W + 0.4, 0.4, W + 0.4, dark, 0, H + 0.2, 0);                // toit
    addBox(W + 0.2, 0.25, W + 0.2, dark, 0, 0.12, 0);                  // socle
    for (let i = -1; i <= 1; i += 2) addBox(0.6, H + 0.6, 0.6, dark, i * (W / 2), (H + 0.6) / 2, -W / 2);
    addBox(0.9, 0.35, 0.02, 0xffd84a, 0, H - 0.45, -W / 2 - 0.01, true); // plaque dorée
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const body = new THREE.Mesh(G.Veg.merge(parts), mat); body.castShadow = true; body.receiveShadow = true; g.add(body);
    g.add(new THREE.Mesh(G.Veg.merge(glow), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
    // porte circulaire (pivot sur la gauche)
    const pivot = new THREE.Group(); pivot.position.set(-1.25, 1.45, -W / 2 + 0.05); g.add(pivot);
    const dm = new THREE.MeshLambertMaterial({ color: 0x9aa4b0 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.3, 28), dm); disc.rotation.x = Math.PI / 2; disc.position.x = 1.25; disc.castShadow = true; pivot.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 8, 28), new THREE.MeshLambertMaterial({ color: 0x5a6068 })); ring.position.set(1.25, 0, -0.17); pivot.add(ring);
    const wheel = new THREE.Group(); wheel.position.set(1.25, 0, -0.22); pivot.add(wheel);
    for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: 0xd0a030 })); sp.rotation.z = k * Math.PI / 3; wheel.add(sp); }
    // lecteur de carte
    const reader = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.12), new THREE.MeshLambertMaterial({ color: 0x2a2a30 })); reader.position.set(1.7, 1.3, -W / 2 - 0.08); g.add(reader);
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false })); light.position.set(1.7, 1.45, -W / 2 - 0.15); g.add(light);
    G.scene.add(g);
    // collisions (les murs sont indestructibles)
    const PROP = { mat: 'stone', invulnerable: true, dead: false, noPickaxe: true, refs: [], meshes: [], type: 'prop' };
    const P = G.Phys, add = (x0, y0, z0, x1, y1, z1) => { const c = P.box(x + x0, y + y0, z + z0, x + x1, y + y1, z + z1, PROP, 3); P.add(c); return c; };
    add(-W / 2, 0, W / 2 - T, W / 2, H, W / 2); add(-W / 2, 0, -W / 2, -W / 2 + T, H, W / 2); add(W / 2 - T, 0, -W / 2, W / 2, H, W / 2);
    add(-W / 2, 0, -W / 2, -1.25, H, -W / 2 + T); add(1.25, 0, -W / 2, W / 2, H, -W / 2 + T); add(-1.25, H - 0.9, -W / 2, 1.25, H, -W / 2 + T);
    add(-W / 2 - 0.2, H, -W / 2 - 0.2, W / 2 + 0.2, H + 0.4, W / 2 + 0.2);
    const doorCol = add(-1.25, 0, -W / 2 - 0.1, 1.25, H - 0.9, -W / 2 + T);
    // coffres dorés à l'intérieur
    const chests = [];
    for (const [cx, cz, r] of [[-2.2, 1.2, Math.PI / 2], [2.2, 1.2, -Math.PI / 2], [0, 2.3, Math.PI]]) chests.push(G.Loot.addChest(x + cx, y + 0.25, z + cz, r, 3));
    N.vault = { x, y, z, g, pivot, wheel, light, doorCol, open: false, openT: 0, chests, ix: x, iz: z - W / 2 - 1.2 };
  };
  N.resetVault = function () {
    const v = N.vault; if (!v) return;
    v.open = false; v.openT = 0; v.pivot.rotation.y = 0; v.light.material.color.setHex(0xff3030);
    if (!v.doorCol._added) { G.Phys.add(v.doorCol); v.doorCol._added = true; }
  };
  N.openVault = function (a) {
    const v = N.vault; if (!v || v.open) return;
    v.open = true; v.openT = 0;
    v.light.material.color.setHex(0x30ff60);
    G.Phys.remove(v.doorCol); v.doorCol._added = false;
    G.Audio.play('reboot', { pos: [v.x, v.y + 1.5, v.z] }); G.Audio.play('door', { pos: [v.x, v.y + 1.5, v.z] });
    if (a && a.isPlayer) { G.HUD.notify('CHAMBRE FORTE OUVERTE !', 3); G.HUD.xpToast(500, 'Chambre forte'); if (G.Match) G.Match.challengeEvent('vault'); }
    G.HUD.killFeed([null, a ? a.name : 'Quelqu\'un', 'a ouvert la chambre forte du Roi !'], a && a.isPlayer, false);
  };
  N.updateVault = function (dt) {
    const v = N.vault; if (!v) return;
    if (v.open && v.openT < 2.5) {
      v.openT += dt;
      const k = Math.min(1, v.openT / 2.5);
      v.wheel.rotation.z = k * Math.PI * 2;
      v.pivot.rotation.y = -Math.max(0, (k - 0.35) / 0.65) * 1.75;
    }
  };
  N.vaultInteract = function (out) {
    const v = N.vault, pl = G.player;
    if (!v || v.open || !pl || pl.dead) return;
    if (Math.abs(pl.pos.x - v.ix) > 4 || Math.abs(pl.pos.z - v.iz) > 4) return;
    const has = pl.slots.some((s) => s && s.id === 'keycard');
    out.push({ kind: 'vault', obj: v, x: v.ix, y: v.y + 1.2, z: v.iz, name: 'Chambre forte du Roi', action: has ? 'Utiliser la carte-clé' : 'Nécessite la carte-clé du Roi', range: 3 });
  };
  N.useKeycard = function (a) {
    const i = a.slots.findIndex((s) => s && s.id === 'keycard');
    if (i < 0) { if (a.isPlayer) { G.HUD.notify('Il faut la carte-clé du Roi (vainquez-le !)', 2); G.Audio.play('build_fail'); } return; }
    a.slots[i] = null; if (a.sel === i) { a.sel = a.firstWeaponSlot(); } a.refreshHeld();
    N.openVault(a);
  };

  N.update = function (dt) {
    N.updateVault(dt);
    if (G.Folk) G.Folk.update(dt);
    for (const b of N.list) if (!b.dead) b.update(dt);
  };

  // Barre de vie du boss (quand on est proche)
  N.bossBar = function () {
    const pl = G.player;
    if (!pl || pl.dead || G.Game.state !== 'playing') return null;
    let b = null, bd = 1e9;
    for (const x of N.bosses) {
      if (x.dead) continue;
      const d = Math.hypot(x.pos.x - pl.pos.x, x.pos.z - pl.pos.z);
      if ((d <= 70 || x.lastAttacker === pl && G.Game.time - x.lastAttackTime < 6) && d < bd) { bd = d; b = x; }
    }
    if (!b) return null;
    return { name: b.name, hp: b.health / b.maxHealth, sh: b.shield / b.maxShield };
  };
  N.mapIcons = function (ctx, toMap, big) {
    if (G.Folk) G.Folk.mapIcons(ctx, toMap, big);
    const b = N.boss;
    const v = N.vault;
    if (v && !v.open) { const m = toMap(v.x, v.z), s = big ? 1.4 : 1; ctx.fillStyle = '#c8c8d0'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.fillRect(m[0] - 4 * s, m[1] - 2 * s, 8 * s, 6 * s); ctx.strokeRect(m[0] - 4 * s, m[1] - 2 * s, 8 * s, 6 * s); ctx.beginPath(); ctx.arc(m[0], m[1] - 2 * s, 3 * s, Math.PI, 0); ctx.stroke(); }
    void b;
    for (const bb of N.bosses) {
      if (bb.dead) continue;
      const m = toMap(bb.post[0], bb.post[1]), s = big ? 1.5 : 1;
      ctx.fillStyle = bb.color || '#ffcf3a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m[0] - 7 * s, m[1] + 4 * s); ctx.lineTo(m[0] - 7 * s, m[1] - 4 * s); ctx.lineTo(m[0] - 3.5 * s, m[1]); ctx.lineTo(m[0], m[1] - 6 * s); ctx.lineTo(m[0] + 3.5 * s, m[1]); ctx.lineTo(m[0] + 7 * s, m[1] - 4 * s); ctx.lineTo(m[0] + 7 * s, m[1] + 4 * s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  };
})();
