// ============================================================
//  Bots : IA (loot, rotation, combat, construction, soins)
// ============================================================
(function () {
  const U = G.U, I = G.Items, P = G.Phys, CB = G.Combat, B = G.Build, L = G.Loot;

  const NAMES = ['Baguette_Furieuse', 'xX_Kévin_Xx', 'LaPoutreDu93', 'Frite_Sauvage', 'Croissant_Rageur', 'Tonton_Sniper', 'MamieBuildeuse', 'Le_Camembert', 'BigoudiTTV', 'Raclette2000',
    'PainAuChocoPro', 'Gégé_Le_Boss', 'NoScope_Nono', 'Chouquette', 'Sardine_Tactique', 'Mimolette', 'Pépito_77', 'BoudinBlanc', 'Cassoulet_Gaming', 'LaTartiflette',
    'Zizou_Fan', 'Grenouille_Ninja', 'Escargot_Rapide', 'Le_Roi_Du_Pompe', 'Flan_Coco', 'Tartine_Beurre', 'Jean-Build', 'Maxime_Clutch', 'Lucie_Headshot', 'Titouan_Zone',
    'Chocapic_OG', 'Loïc_Pioche', 'Emma_Sniper', 'Hugo_Rampe', 'Léa_Loot', 'Nathan_Edit', 'Chloé_Rush', 'Enzo_Mur', 'Manon_Tempête', 'Théo_Bus',
    'Camille_Coffre', 'Louis_1v1', 'Inès_Victoire', 'Jules_Glider', 'Zoé_Floss', 'Arthur_Frag', 'Sarah_Soin', 'Tom_Bouclier', 'Clara_Crit', 'Noah_Métal',
    'Pastis_Sniper', 'Ratatouille', 'Madeleine_Pro', 'Crêpe_Suzette', 'Bouillabaisse', 'Quiche_Lorraine', 'Macaron_Rose', 'Nutella_Gang', 'Kebab_Royal', 'Café_Crème',
    'Momo_TTV', 'Sylvain_Tank', 'Patrick_Pompe', 'Josiane', 'Gérard_Glisse', 'Dédé_Danse', 'Bernard_Bus', 'Mireille_Mitraille', 'Roger_Rocket', 'Yvette_Victoire',
    'Didier_Défense', 'Nadine_Ninja', 'Fifi_Floss', 'Loulou_Loot', 'Riri_Rampe', 'Jojo_Joker', 'Coco_Chest', 'Titi_Tir', 'Kiki_Kill', 'Lili_Lunette',
    'Poulet_Braisé', 'Moustache_Pro', 'Béret_Basque', 'Pétanque_King', 'Tour_Eiffel', 'Mont_Blanc', 'Loire_Valley', 'Bretagne_Power', 'Marseille_OM', 'Lyon_Bouchon',
    'Nantes_Nuggets', 'Lille_Frites', 'Nice_Socca', 'Bordeaux_Vin', 'Toulouse_Rugby', 'Paris_Métro', 'Brest_Crêpe', 'Dijon_Moutarde', 'Rennes_Galette', 'Metz_Mirabelle'];
  G.BOT_NAMES = NAMES;

  const DIFF = [
    { aim: 0.12, react: 1.0, turn: 2.8, vision: 60, build: 0.04, head: 0.02, strafe: 0.25, jump: 0.04, heal: 0.35 },
    { aim: 0.075, react: 0.55, turn: 4.6, vision: 90, build: 0.28, head: 0.1, strafe: 0.6, jump: 0.14, heal: 0.6 },
    { aim: 0.04, react: 0.3, turn: 7.5, vision: 130, build: 0.6, head: 0.28, strafe: 0.85, jump: 0.28, heal: 0.8 },
    { aim: 0.026, react: 0.19, turn: 11, vision: 160, build: 0.9, head: 0.42, strafe: 1.0, jump: 0.4, heal: 0.95 },
  ];

  const VALUE = { ar: 58, burst: 56, pump: 62, tactical: 56, smg: 46, sniper: 42, semisniper: 44, hunting: 36, pistol: 24, revolver: 32, rocket: 50, minigun: 48, grenadelauncher: 38 };
  const CONS_VALUE = { shieldpot: 34, smallshield: 30, medkit: 28, bandage: 16, slurp: 36, chug: 40, grenade: 12, boogie: 10 };

  class Bot extends G.Actor {
    constructor(o) {
      super(o);
      this.setDiff(o.diff);
      this.infiniteAmmo = true;
      this.ai = {};
    }
    setDiff(diff) {
      this.diffLevel = diff;
      const d = DIFF[U.clamp(Math.round(diff), 0, 3)];
      const v = (x, k) => x * (1 + (Math.random() - 0.5) * k);
      this.sk = { aim: v(d.aim, 0.5), react: v(d.react, 0.4), turn: v(d.turn, 0.3), vision: v(d.vision, 0.2), build: U.clamp(v(d.build, 0.6), 0, 1), head: d.head, strafe: d.strafe, jump: d.jump, heal: d.heal };
    }
    reset() {
      super.reset();
      this.ai = { mode: 'lobby', t: 0, tick: Math.random() * 0.3, target: null, seeT: 0, lastSeen: null, lastSeenT: -99, nav: null, navT: 0, stuckT: 0, lastPos: new THREE.Vector3(), lastPosT: 0,
        strafeDir: 1, strafeT: 0, lootT: 0, lootTarget: null, reactT: 0, aimYaw: 0, aimPitch: 0, errX: 0, errY: 0, errT: 0, buildT: 0, healT: 0, jumpAt: 0, dropTarget: null,
        detourT: 0, detourYaw: 0, harvestT: 0, emoteT: U.rand(5, 25), fireHold: 0, wanderT: 0 };
    }

    // ------------------------------------------------------------
    update(dt) {
      if (this.dead) return;
      const ai = this.ai;
      const pl = G.player;
      const dp = pl ? Math.hypot(this.pos.x - G.camera.position.x, this.pos.z - G.camera.position.z) : 0;
      this.distToCam = dp;
      this.nearPlayer = dp < 160;
      this.farSim = dp > 260 && this.state === 'ground' && !this.npc;
      ai.tick -= dt;
      const tickRate = this.nearPlayer ? 0.12 : dp < 260 ? 0.3 : 0.6;
      if (ai.tick <= 0) { ai.tick = tickRate * (0.8 + Math.random() * 0.4); this.think(tickRate); }
      this.steer(dt);
      if (this.farSim) this.updateFar(dt);
      else super.update(dt);
      this.combatFrame(dt);
    }

    // Déplacement simplifié loin du joueur (suivi du terrain)
    updateFar(dt) {
      const c = this.control, p = this.pos;
      if (!isFinite(this.yaw)) this.yaw = 0;
      if (!isFinite(p.x + p.z)) { if (this.lastGood) p.copy(this.lastGood); else p.set(0, 60, 0); }
      this.fireCd = Math.max(0, this.fireCd - dt); this.swingCd = Math.max(0, this.swingCd - dt);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const sp = c.sprint ? 7.5 : 6;
      p.x += (fx * c.mz + rx * c.mx) * sp * dt; p.z += (fz * c.mz + rz * c.mx) * sp * dt;
      const g = G.Terrain.height(p.x, p.z);
      p.y = Math.max(g, -1.25);
      this.swimming = g < -1.3;
      this.grounded = true; this.vel.set(0, 0, 0);
      this.updateUse(dt); this.updateReload(dt); this.updateStorm(dt);
      this.stats.surviveT += dt;
      this.char.anim.speed = Math.hypot(c.mx, c.mz) * sp;
    }

    // ------------------------------------------------------------
    //  Décisions
    // ------------------------------------------------------------
    think(dt) {
      const ai = this.ai;
      ai.t += dt;
      const st = this.state;
      if (st === 'bus') return;
      if (st === 'skydive' || st === 'glide') { if (this.isTeammate) G.Duo.mateThink(this); this.thinkDrop(); return; }
      if (st === 'lobby') { this.thinkLobby(dt); return; }
      if (this.danceT > 0) return;
      // à terre : on rampe vers un coéquipier
      if (this.downed) {
        const m = G.Duo.teamOf(this).find((x) => x !== this && !x.dead && !x.downed);
        ai.mode = 'downed';
        ai.nav = m && Math.hypot(m.pos.x - this.pos.x, m.pos.z - this.pos.z) > 2 ? [m.pos.x, m.pos.z] : null;
        return;
      }
      // au volant d'un kart
      if (st === 'vehicle') { this.perceive(dt); this.thinkDrive(); return; }
      // --- perception ---
      this.perceive(dt);
      // PNJ (boss et gardes)
      if (this.npc && G.NPC.think(this)) { this.checkStuck(dt); return; }
      // coéquipier du joueur : suivre / réanimer
      if (this.isTeammate && G.Duo.mateThink(this)) { this.checkStuck(dt); return; }
      // réanimer un coéquipier bot à terre
      if (G.Duo.active && !this.isTeammate) {
        const dm = G.Duo.teamOf(this).find((x) => x !== this && !x.dead && x.downed);
        if (dm && !(ai.target && G.Game.time - ai.lastSeenT < 1.5)) {
          const dd = Math.hypot(dm.pos.x - this.pos.x, dm.pos.z - this.pos.z);
          ai.mode = 'revive'; ai.nav = dd > 1.6 ? [dm.pos.x, dm.pos.z] : null;
          if (dd < 2.3) { dm.reviveBy = this; dm.reviveUntil = G.Game.time + 0.8; }
          this.checkStuck(dt);
          return;
        }
      }
      const S = G.Storm;
      const hpTot = this.health + this.shield;
      const enemy = ai.target && !ai.target.dead ? ai.target : null;
      const seeRecent = enemy && G.Game.time - ai.lastSeenT < 1.2;
      // --- priorités ---
      const armed = this.weaponsCount() > 0;
      const attackedRecently = G.Game.time - this.lastAttackTime < 3;
      if (enemy && !armed && !(attackedRecently && Math.hypot(enemy.pos.x - this.pos.x, enemy.pos.z - this.pos.z) < 6)) ai.mode = this.stormPressure() > 1 ? 'rotate' : 'loot';
      else if (enemy && (seeRecent || G.Game.time - ai.lastSeenT < 5)) ai.mode = 'fight';
      else if (this.needHeal() && G.Game.time - this.lastAttackTime > 2) ai.mode = 'heal';
      else if (S && S.active && this.stormPressure() > 0) ai.mode = 'rotate';
      else if (this.investigateShots()) ai.mode = 'investigate';
      else if (this.wantsLoot()) ai.mode = 'loot';
      else ai.mode = 'rotate';
      // tempête mortelle : on fuit vers la zone même en plein combat
      if (S && S.active && this.stormPressure() === 2 && S.damage() >= 2 && ai.mode !== 'rotate') {
        const close = enemy && Math.hypot(enemy.pos.x - this.pos.x, enemy.pos.z - this.pos.z) < 12;
        if (!close || this.health < S.damage() * 8) { ai.mode = 'rotate'; ai.nav = null; ai.navT = 0; }
      }
      if (ai.mode !== 'heal' && this.useT > 0 && enemy && seeRecent) this.cancelUse();
      switch (ai.mode) {
        case 'fight': this.thinkFight(enemy, seeRecent); break;
        case 'heal': this.thinkHeal(); break;
        case 'loot': this.thinkLoot(); break;
        case 'investigate': break;
        default: this.thinkRotate();
      }
      this.checkStuck(dt);
      // sauts aléatoires en courant
      if (this.grounded && ai.mode !== 'heal' && Math.random() < this.sk.jump * dt * (ai.mode === 'fight' ? 2 : 0.4)) this.control.jump = true;
    }

    perceive(dt) {
      const ai = this.ai;
      const eye = this.eyePos();
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      let best = null, bestScore = -1e9;
      const vis = this.sk.vision * (G.Sky.night > 0.5 ? 0.7 : 1) * (this.inStorm ? 0.6 : 1);
      for (const a of CB.actors) {
        if (a === this || a.dead || !a.hittable() || G.Duo.sameTeam(this, a)) continue;
        const dx = a.pos.x - this.pos.x, dz = a.pos.z - this.pos.z, dy = a.pos.y - this.pos.y;
        const d = Math.sqrt(dx * dx + dz * dz + dy * dy);
        if (d > vis) continue;
        const attacked = this.lastAttacker === a && G.Game.time - this.lastAttackTime < 4;
        const dot = (dx * fx + dz * fz) / (d || 1);
        if (!attacked && dot < -0.2 && d > 12) continue;
        // les bots repèrent moins facilement les autres bots que le joueur
        if (!attacked && a.isBot && !this.npc && !a.npc && (d > vis * (G.Match.rumble ? 0.8 : 0.3) || !G.Match.rumble && G.Game.time < this.calmUntil)) continue;
        if (a.npc && !attacked && !this.npc && d > 30) continue; // on ne va pas chercher le boss de loin
        if (!attacked && (a.folk && !a.hiredBy || this.folk && !this.hiredBy)) continue; // personnages neutres
        if (a.dummy || this.dummy) continue;
        let score = -d + (attacked ? 80 : 0) + (a === ai.target ? 25 : 0) + (a.isPlayer ? 5 : 0);
        if (score > bestScore) { bestScore = score; best = a; }
      }
      if (best) {
        // ligne de vue
        const hb = best.hitbox;
        const visible = (P.los(eye.x, eye.y, eye.z, hb.cx, hb.cy + 0.3, hb.cz, null) || P.los(eye.x, eye.y, eye.z, hb.hx, hb.hy, hb.hz, null)) && !(CB.clouds.length && CB.smokeBlocks(eye.x, eye.y, eye.z, hb.cx, hb.cy, hb.cz));
        if (visible) {
          if (ai.target !== best) { ai.target = best; ai.reactT = this.sk.react * (0.7 + Math.random() * 0.6); ai.seeT = 0; if (this.isTeammate) G.Duo.onMateSpot(this, best); }
          ai.lastSeen = best.pos.clone(); ai.lastSeenT = G.Game.time;
        } else if (best === this.lastAttacker && G.Game.time - this.lastAttackTime < 3) {
          ai.target = best; ai.lastSeen = best.pos.clone();
        }
      }
      if (ai.target && (ai.target.dead || G.Game.time - ai.lastSeenT > 8)) ai.target = null;
    }

    needHeal() {
      return (this.health < 70 || this.shield < 50 && this.hasItemKind('shield')) && this.hasHeals() && this.health + this.shield < 150;
    }
    hasItemKind(kind) { return this.slots.some((s) => s && I.CONSUMABLES[s.id] && I.CONSUMABLES[s.id].kind === kind); }
    weaponsCount() { return this.slots.filter((s) => s && I.WEAPONS[s.id]).length; }
    wantsLoot() {
      const w = this.weaponsCount();
      if (w === 0) return true;
      if (this.ai.lootT > (w >= 2 ? 50 : 90)) return false;
      return w < 3 || !this.hasHeals();
    }
    stormPressure() {
      const S = G.Storm;
      if (!S || !S.active) return 0;
      const p = this.pos;
      if (S.isOutside(p.x, p.z)) return 2;
      const n = S.next;
      if (!n) return 0;
      const d = Math.hypot(p.x - n.x, p.z - n.z) - n.r * 0.85;
      if (d <= 0) return 0;
      // temps nécessaire pour rejoindre la zone (~6 m/s) comparé au temps restant
      const need = d / 6;
      const left = S.shrinking ? S.timer * 0.5 : S.timer + S.PHASES[S.phase][1] * 0.6;
      if (need > left - 10 || (this.weaponsCount() > 0 && S.phase >= 2 && need > left - 25)) return 1;
      return 0;
    }

    // ---------- échauffement ----------
    thinkLobby(dt) {
      const ai = this.ai;
      ai.wanderT -= dt;
      if (!ai.nav || ai.wanderT <= 0) {
        const s = G.MapData.spawnIsland;
        const a = Math.random() * Math.PI * 2, r = Math.random() * 30;
        ai.nav = [s.x + Math.cos(a) * r, s.z + Math.sin(a) * r];
        ai.wanderT = U.rand(3, 8);
      }
      ai.emoteT -= dt;
      if (ai.emoteT <= 0) { ai.emoteT = U.rand(10, 30); this.playEmote(U.pick(['emote_danse', 'emote_floss', 'emote_salut', 'emote_robot', 'emote_hype', 'emote_orange'])); ai.nav = null; ai.wanderT = U.rand(3, 6); }
      if (Math.random() < 0.02) this.control.jump = true;
      if (Math.random() < 0.01 && this.mats.wood >= 10) { const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); B.place(this, B.wallTowards(this.pos.x, this.pos.y, this.pos.z, fx, fz), 'wood'); }
    }

    // ---------- chute ----------
    thinkDrop() {
      const ai = this.ai;
      if (!ai.dropTarget) ai.dropTarget = [this.pos.x, this.pos.z];
    }

    // ---------- combat ----------
    thinkFight(enemy, visible) {
      const ai = this.ai;
      if (!enemy) return;
      const d = Math.hypot(enemy.pos.x - this.pos.x, enemy.pos.z - this.pos.z);
      // choix d'arme
      this.chooseWeapon(d);
      if (this.sel < 0 && this.weaponsCount() === 0) {
        // pas d'arme : fuir ou pioche au contact
        if (d > 3) { ai.nav = [this.pos.x - (enemy.pos.x - this.pos.x), this.pos.z - (enemy.pos.z - this.pos.z)]; ai.fightMove = 'flee'; }
        else ai.fightMove = 'melee';
        return;
      }
      const w = this.curWeapon() ? I.WEAPONS[this.curWeapon().id] : null;
      const pref = !w ? 3 : w.melee ? 2.2 : w.cat === 'shotgun' ? 5 : w.cat === 'smg' ? 12 : w.cat === 'sniper' ? 70 : w.cat === 'explosive' ? 25 : 22;
      ai.prefDist = pref;
      if (!visible) {
        ai.nav = ai.lastSeen ? [ai.lastSeen.x, ai.lastSeen.z] : null;
        ai.fightMove = 'chase';
      } else ai.fightMove = 'strafe';
      // construction défensive
      ai.buildT -= 0.15;
      const recentlyHit = G.Game.time - this.lastAttackTime < 0.8;
      if (recentlyHit && ai.buildT <= 0 && this.state === 'ground' && !this.swimming) {
        ai.buildT = U.rand(1.2, 3);
        if (Math.random() < this.sk.build && this.totalMats() >= 10) this.defensiveBuild(enemy);
      }
      // bulle de bouclier / chug splash à ses pieds quand on se fait toucher
      if (recentlyHit && this.health + this.shield < 130 && (ai.bubbleT || 0) < G.Game.time && this.state === 'ground') {
        const bi = this.slots.findIndex((s) => s && (s.id === 'bubble' || s.id === 'chugsplash' && this.health < 80));
        if (bi >= 0) {
          ai.bubbleT = G.Game.time + U.rand(6, 12);
          const prev = this.sel; this.sel = bi; this.refreshHeld(); this.fireCd = 0;
          this.throwItem(-Math.sin(this.yaw) * 0.15, -0.8, -Math.cos(this.yaw) * 0.15);
          if (this.slots[prev]) this.sel = prev; else this.sel = this.firstWeaponSlot();
          this.refreshHeld();
        }
      }
      // prise de hauteur : rampes + murs vers un ennemi en hauteur (« ramp rush »)
      const above = enemy.pos.y - this.pos.y;
      const now = G.Game.time;
      if (this.sk.build > 0.4 && this.state === 'ground' && !this.swimming && !this.npc && above > 2.2 && d < 42 && d > 3 && this.totalMats() >= 40 && now > (ai.rushCd || 0) && visible) {
        ai.rushUntil = now + U.rand(2.2, 4.2); ai.rushCd = now + U.rand(10, 18);
      }
      if ((ai.rushUntil || 0) > now && this.state === 'ground' && above > 0.5) {
        ai.fightMove = 'rush';
        if (now > (ai.rushPlaceT || 0) && this.grounded) {
          ai.rushPlaceT = now + 0.28;
          const yaw = Math.atan2(-(enemy.pos.x - this.pos.x), -(enemy.pos.z - this.pos.z));
          const mat = this.bestMat();
          const tr = B.target(this, 'ramp', yaw, 0);
          if (tr && this.mats[mat] >= 10 && B.canPlace(tr)) B.place(this, tr, mat);
          // mur sous le haut de la rampe (couverture face à l'ennemi)
          if (tr && this.mats[mat] >= 10 && Math.random() < 0.6) {
            const dm = tr.dir, tw = dm === 0 ? B.wallAt(tr.i + 1, tr.j, tr.k, 0, tr.yOff) : dm === 2 ? B.wallAt(tr.i, tr.j, tr.k, 0, tr.yOff) : dm === 1 ? B.wallAt(tr.i, tr.j + 1, tr.k, 1, tr.yOff) : B.wallAt(tr.i, tr.j, tr.k, 1, tr.yOff);
            if (tw && B.canPlace(tw)) B.place(this, tw, mat);
          }
        }
      } else if (ai.fightMove === 'rush') ai.fightMove = 'strafe';
      // grenade sur un ennemi à couvert
      if (!visible && ai.lastSeen && G.Game.time - ai.lastSeenT < 4 && (ai.nadeT || 0) < G.Game.time) {
        const gi = this.slots.findIndex((s) => s && (s.id === 'grenade' || s.id === 'boogie' || s.id === 'stink'));
        const dd = Math.hypot(ai.lastSeen.x - this.pos.x, ai.lastSeen.z - this.pos.z);
        if (gi >= 0 && dd > 6 && dd < 28 && Math.random() < 0.5) {
          ai.nadeT = G.Game.time + U.rand(5, 10);
          const prev = this.sel;
          this.sel = gi; this.refreshHeld();
          const dx = ai.lastSeen.x - this.pos.x, dz = ai.lastSeen.z - this.pos.z;
          const l = Math.hypot(dx, dz) || 1;
          const up = 0.25 + dd / 60;
          this.throwItem(dx / l * (1 - up * 0.3), up, dz / l * (1 - up * 0.3));
          if (this.slots[prev]) this.sel = prev; else this.sel = this.firstWeaponSlot();
          this.refreshHeld();
        } else ai.nadeT = G.Game.time + 3;
      }
      // rechargement à l'abri
      const it = this.curWeapon();
      if (it && it.ammo <= I.WEAPONS[it.id].mag * 0.25 && (!visible || d > 30)) this.startReload();
      // soins en plein combat si à couvert
      if (!visible && this.needHeal() && G.Game.time - this.lastAttackTime > 1.5 && Math.random() < 0.3) { this.ai.mode = 'heal'; this.thinkHeal(); }
    }
    totalMats() { return this.mats.wood + this.mats.stone + this.mats.metal; }
    bestMat() { return this.mats.metal >= 10 && this.sk.build > 0.5 ? 'metal' : this.mats.stone >= 10 ? 'stone' : this.mats.wood >= 10 ? 'wood' : this.mats.stone >= 10 ? 'stone' : 'metal'; }
    defensiveBuild(enemy) {
      if (G.Match && G.Match.zeroBuild) return;
      const dx = enemy.pos.x - this.pos.x, dz = enemy.pos.z - this.pos.z;
      const mat = this.bestMat();
      if (this.mats[mat] < 10) return;
      const r = Math.random();
      if (r < 0.55 || this.sk.build < 0.5) {
        B.place(this, B.wallTowards(this.pos.x, this.pos.y, this.pos.z, dx, dz), mat);
      } else if (r < 0.8) {
        // mur + rampe vers l'ennemi
        B.place(this, B.wallTowards(this.pos.x, this.pos.y, this.pos.z, dx, dz), mat);
        const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 0 : 2) : (dz > 0 ? 1 : 3);
        const g = B.gridAt(this.pos.x, this.pos.y - 0.2, this.pos.z);
        if (this.mats[mat] >= 10) B.place(this, B.cellTarget('ramp', g.i, g.j, g.k, dir, g.yOff), mat);
      } else this.boxUp(mat);
    }
    boxUp(mat) {
      const g = B.gridAt(this.pos.x, this.pos.y, this.pos.z);
      const ci = g.i, cj = g.j, k = g.k, yo = g.yOff;
      const walls = [B.wallAt(ci, cj, k, 0, yo), B.wallAt(ci + 1, cj, k, 0, yo), B.wallAt(ci, cj, k, 1, yo), B.wallAt(ci, cj + 1, k, 1, yo)];
      for (const w of walls) { if (this.mats[mat] < 10) mat = this.bestMat(); if (this.mats[mat] >= 10) B.place(this, w, mat); }
      if (this.mats[mat] >= 10) B.place(this, B.cellTarget('roof', ci, cj, k, 0, yo), mat);
    }
    chooseWeapon(d) {
      let best = -1, bs = -1e9;
      for (let i = 0; i < 5; i++) {
        const s = this.slots[i];
        if (!s || !I.WEAPONS[s.id]) continue;
        const w = I.WEAPONS[s.id];
        let score = s.rarity * 3;
        if (w.melee) score += d < 4 ? 62 : d < 10 ? 18 : -30;
        else if (d < 9) score += w.cat === 'shotgun' ? 50 : w.cat === 'smg' ? 40 : w.cat === 'ar' ? 30 : w.cat === 'pistol' ? 22 : w.cat === 'explosive' ? -20 : 5;
        else if (d < 45) score += w.cat === 'ar' ? 50 : w.cat === 'smg' ? 38 : w.cat === 'bow' ? 36 : w.cat === 'pistol' ? 30 : w.cat === 'explosive' ? 26 : w.cat === 'sniper' ? 18 : 8;
        else score += w.cat === 'sniper' ? 55 : w.cat === 'bow' ? 48 : w.cat === 'ar' ? 45 : w.cat === 'pistol' ? 25 : w.cat === 'explosive' ? 20 : 10;
        if (s.ammo <= 0) score -= 15;
        if (score > bs) { bs = score; best = i; }
      }
      if (best >= 0 && best !== this.sel && (this.fireCd <= 0 || Math.random() < 0.3)) this.equip(best);
    }

    // ---------- soins ----------
    thinkHeal() {
      const ai = this.ai;
      ai.nav = null;
      if (this.useT > 0) return;
      // meilleur soin disponible
      let best = -1, bs = -1;
      for (let i = 0; i < 5; i++) {
        const s = this.slots[i];
        if (!s) continue;
        const c = I.CONSUMABLES[s.id];
        if (!c || !this.canUse(s)) continue;
        let score = 0;
        if (c.kind === 'shield') score = this.shield < c.cap ? 40 + (c.shield || 0) : 0;
        else if (c.kind === 'heal') score = this.health < 60 ? 45 + c.hp * 0.2 : this.health < c.cap ? 20 : 0;
        else if (c.kind === 'slurp' || c.kind === 'chug') score = 50;
        if (score > bs) { bs = score; best = i; }
      }
      if (best < 0) { ai.mode = 'rotate'; return; }
      if (Math.random() < this.sk.build * 0.5 && this.totalMats() >= 40 && this.state === 'ground' && !this.swimming && ai.buildT <= 0) { ai.buildT = 6; this.boxUp(this.bestMat()); }
      if (this.sel !== best) this.equip(best);
      this.startUse();
    }

    // ---------- loot ----------
    thinkLoot() {
      const ai = this.ai;
      // juste après l'atterrissage : on regarde autour avant de fouiller
      if (ai.lootDelay && G.Game.time < ai.lootDelay) { ai.nav = null; return; }
      ai.lootT += 0.15;
      const p = this.pos;
      // établi d'amélioration à proximité
      if (G.Extras2 && G.Game.time > (ai.benchCd || 0)) {
        const slot = G.Extras2.botUpgradeSlot(this);
        const bench = slot >= 0 ? G.Extras2.nearestBench(p.x, p.z, 45) : null;
        if (!bench) ai.benchCd = G.Game.time + 5;
        else {
          const fx = bench.x + Math.sin(bench.yaw) * 1.3, fz = bench.z + Math.cos(bench.yaw) * 1.3;
          if (Math.hypot(fx - p.x, fz - p.z) > 1.6) { ai.nav = [fx, fz]; return; }
          this.sel = slot; this.refreshHeld();
          if (!G.Extras2.upgrade(this, bench)) ai.benchCd = G.Game.time + 20;
          return;
        }
      }
      // cible actuelle toujours valide ?
      let t = ai.lootTarget;
      if (t && (t.kind === 'item' && !t.obj.alive || t.kind !== 'item' && t.obj.opened)) t = ai.lootTarget = null;
      if (t) { ai.lootTargetT = (ai.lootTargetT || 0) + 0.15; if (ai.lootTargetT > 25) { (ai.blacklist = ai.blacklist || new Set()).add(t.obj); t = ai.lootTarget = null; } }
      const far = this.farSim;
      // hauteur accessible : loin du joueur on simule l'escalade des escaliers
      const reach = (dy) => far ? Math.abs(dy) < 20 : dy < 2.5 + (this.sk.build > 0.4 && this.totalMats() >= 20 ? 6 : 0) && dy > -6;
      const bl = ai.blacklist;
      if (!t) {
        ai.lootTargetT = 0;
        let best = null, bd = 80;
        for (const c of L.chests) {
          if (!c.active || c.opened || (bl && bl.has(c)) || !reach(c.y - p.y) || c.vault && !(G.NPC.vault && G.NPC.vault.open)) continue;
          const d = Math.hypot(c.x - p.x, c.z - p.z) + Math.abs(c.y - p.y) * 1.5;
          if (d < bd && G.Duo.lootOk(this, c.x, c.z)) { bd = d; best = { kind: 'chest', obj: c }; }
        }
        const it = L.nearestFor(p.x, p.z, Math.min(bd, 50), (it) => !(bl && bl.has(it)) && reach(it.y - p.y) && (it.data.kind !== 'item' ? it.data.kind === 'mat' && this.totalMats() < 300 : this.wantItem(it.data.item)));
        if (it && Math.hypot(it.x - p.x, it.z - p.z) < bd) best = { kind: 'item', obj: it };
        if (!best) for (const a of L.ammoBoxes) { if (!a.active || a.opened || (bl && bl.has(a)) || !reach(a.y - p.y)) continue; const d = Math.hypot(a.x - p.x, a.z - p.z); if (d < 30 && d < bd) { bd = d; best = { kind: 'ammo', obj: a }; } }
        // largages et lamas : très convoités
        for (const dr of G.Extras.drops) { if (!dr.landed || dr.opened) continue; const d = Math.hypot(dr.x - p.x, dr.z - p.z) * 0.4; if (d < 60 && d < bd) { bd = d; best = { kind: 'drop', obj: dr }; } }
        for (const ll of G.Extras.llamas) { if (ll.opened) continue; const d = Math.hypot(ll.x - p.x, ll.z - p.z) * 0.6; if (d < 40 && d < bd) { bd = d; best = { kind: 'llama', obj: ll }; } }
        ai.lootTarget = t = best;
        if (!best) { ai.lootT += 20; ai.mode = 'rotate'; this.thinkRotate(); return; }
      }
      const o = t.obj;
      const tx = t.kind === 'item' ? o.x : o.x, tz = o.z, ty = o.y;
      const d = Math.hypot(tx - p.x, tz - p.z);
      ai.nav = [tx, tz];
      if (d < 1.9 && (Math.abs(ty - p.y) < 2.2 || far && Math.abs(ty - p.y) < 20)) {
        if (t.kind === 'chest') L.openChest(o, this);
        else if (t.kind === 'ammo') L.openAmmo(o, this);
        else if (t.kind === 'drop') G.Extras.openDrop(o, this);
        else if (t.kind === 'llama') G.Extras.openLlama(o, this);
        else if (o.data.kind === 'item') this.botPickup(o);
        else L.autoPickup(this);
        ai.lootTarget = null;
      }
      // cible au-dessus : construire une rampe
      if (d < 6 && ty - p.y > 2.5 && this.grounded && this.totalMats() >= 10 && ai.buildT <= 0) {
        ai.buildT = 1.5;
        const dx = tx - p.x, dz = tz - p.z;
        const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 0 : 2) : (dz > 0 ? 1 : 3);
        const g = B.gridAt(p.x, p.y - 0.2, p.z);
        B.place(this, B.cellTarget('ramp', g.i, g.j, g.k, dir, g.yOff), this.bestMat());
      }
      ai.buildT -= 0.15;
    }
    claimed(c) { return false; }
    itemValue(it) {
      if (I.WEAPONS[it.id]) return (VALUE[it.id] || 30) + it.rarity * 9;
      return CONS_VALUE[it.id] || 0;
    }
    wantItem(it) {
      if (I.WEAPONS[it.id]) {
        const cat = I.WEAPONS[it.id].cat;
        const same = this.slots.findIndex((s) => s && I.WEAPONS[s.id] && I.WEAPONS[s.id].cat === cat);
        if (same >= 0) return this.itemValue(it) > this.itemValue(this.slots[same]) + 4;
        return this.weaponsCount() < 3 || this.slots.some((s) => !s);
      }
      const v = CONS_VALUE[it.id];
      if (!v) return false;
      return this.slots.some((s) => !s || (s.id === it.id && s.count < I.CONSUMABLES[it.id].stack));
    }
    botPickup(gi) {
      const it = gi.data.item;
      if (I.WEAPONS[it.id]) {
        const cat = I.WEAPONS[it.id].cat;
        const same = this.slots.findIndex((s) => s && I.WEAPONS[s.id] && I.WEAPONS[s.id].cat === cat);
        if (same >= 0) { this.dropSlotQuiet(same); this.slots[same] = it; }
        else if (!this.takeItem(it, false)) {
          // remplace le moins utile
          let worst = 0, wv = 1e9;
          for (let i = 0; i < 5; i++) { const v = this.itemValue(this.slots[i]); if (v < wv) { wv = v; worst = i; } }
          if (wv >= this.itemValue(it)) return;
          this.dropSlotQuiet(worst); this.slots[worst] = it;
        }
        G.Loot.remove(gi);
        if (this.sel < 0) this.equip(this.slots.indexOf(it));
        this.refreshHeld();
      } else {
        if (this.takeItem(it, false)) G.Loot.remove(gi);
      }
    }
    dropSlotQuiet(i) {
      const it = this.slots[i]; if (!it) return;
      this.slots[i] = null;
      G.Loot.spawnItem(it, this.pos.x, this.pos.y + 0.5, this.pos.z, U.rand(-1, 1), 2, U.rand(-1, 1));
    }

    // ---------- rotation ----------
    // Entend des tirs et va voir (seulement s'il est armé et en forme)
    investigateShots() {
      const ai = this.ai, now = G.Game.time, p = this.pos;
      if (this.isTeammate || this.npc || this.weaponsCount() === 0 || this.health + this.shield < 90) { ai.inv = null; return false; }
      if (ai.inv && now < ai.inv.until && Math.hypot(ai.inv.x - p.x, ai.inv.z - p.z) > 18) { ai.nav = [ai.inv.x, ai.inv.z]; this.control.sprint = true; return true; }
      ai.inv = null;
      if (now < (ai.invCd || 0)) return false;
      ai.invCd = now + 2;
      const shots = CB.shots || [];
      const aggro = [0.15, 0.3, 0.45, 0.6][U.clamp(Math.round(this.diffLevel || 1), 0, 3)];
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (now - s.t > 3) break;
        if (s.by === this || G.Duo.sameTeam(this, s.by)) continue;
        const d = Math.hypot(s.x - p.x, s.z - p.z);
        if (d < 20 || d > 110) continue;
        if (Math.random() < aggro) { ai.inv = { x: s.x + U.rand(-8, 8), z: s.z + U.rand(-8, 8), until: now + U.rand(10, 18) }; ai.nav = [ai.inv.x, ai.inv.z]; return true; }
        ai.invCd = now + 6;
        break;
      }
      return false;
    }
    // cible lointaine de rotation (zone suivante)
    rotateTarget() {
      const S = G.Storm, p = this.pos;
      if (S && S.active) { const n = S.next || S.cur; return G.Terrain.randomLandPoint(Math.random, n.x, n.z, Math.max(5, n.r * 0.5), 1.0); }
      return G.Terrain.randomLandPoint(Math.random, p.x + U.rand(-250, 250), p.z + U.rand(-250, 250), 60, 1.5);
    }
    // conduite d'un kart
    thinkDrive() {
      const ai = this.ai, k = this.vehicle, now = G.Game.time;
      if (!k || k.dead) { if (k) G.Extras.exitKart(this); return; }
      ai.mode = 'drive';
      if (!ai.driveTo) ai.driveTo = this.rotateTarget();
      const d = Math.hypot(ai.driveTo[0] - this.pos.x, ai.driveTo[1] - this.pos.z);
      const enemy = ai.target && !ai.target.dead && now - ai.lastSeenT < 1.5 ? ai.target : null;
      const ed = enemy ? Math.hypot(enemy.pos.x - this.pos.x, enemy.pos.z - this.pos.z) : 1e9;
      // on fonce sur un ennemi proche au sol (écrasement), sinon on descend pour se battre
      if (enemy && ed < 40 && ed > 8 && enemy.state === 'ground' && Math.random() < 0.5) { ai.nav = [enemy.pos.x, enemy.pos.z]; return; }
      if (d < 25 || (enemy && ed < 18) || (ai.driveStuck || 0) > 3.2 || now > (ai.driveUntil || 0) || G.Terrain.height(this.pos.x, this.pos.z) < -0.5) {
        G.Extras.exitKart(this);
        ai.driveTo = null; ai.nav = null; ai.driveCd = now + U.rand(25, 45); ai.driveStuck = 0;
        return;
      }
      ai.nav = ai.driveTo;
    }
    thinkRotate() {
      const ai = this.ai;
      const S = G.Storm;
      const p = this.pos;
      // longs trajets : on emprunte un kart s'il y en a un tout près
      const now = G.Game.time;
      if (ai.wantKart) {
        const k = ai.wantKart;
        if (k.dead || k.driver || Math.hypot(k.pos.x - p.x, k.pos.z - p.z) > 45) ai.wantKart = null;
        else {
          ai.nav = [k.pos.x, k.pos.z];
          if (Math.hypot(k.pos.x - p.x, k.pos.z - p.z) < 3.2 && this.state === 'ground') {
            G.Extras.enterKart(this, k); ai.wantKart = null;
            ai.driveTo = this.rotateTarget(); ai.driveUntil = now + U.rand(35, 60); ai.driveStuck = 0;
          }
          return;
        }
      } else if (!this.isTeammate && !this.npc && (ai.driveCd || 0) < now && ai.nav && Math.hypot(ai.nav[0] - p.x, ai.nav[1] - p.z) > 110 && G.Extras && G.Extras.karts) {
        ai.driveCd = now + 8;
        for (const k of G.Extras.karts) if (!k.isBoat && !k.isPlane && !k.isHeli && !k.isTurret && !k.isMech && !k.isBoar && !k.dead && !k.driver && Math.hypot(k.pos.x - p.x, k.pos.z - p.z) < 55) { ai.wantKart = k; ai.nav = [k.pos.x, k.pos.z]; return; }
      }
      ai.navT -= 0.15;
      if (!S || !S.active) {
        if (!ai.nav || ai.navT <= 0) { const q = G.Terrain.randomLandPoint(Math.random, p.x, p.z, 80, 1.5); ai.nav = q; ai.navT = U.rand(8, 16); }
        return;
      }
      const n = S.next || S.cur;
      const inNext = Math.hypot(p.x - n.x, p.z - n.z) < n.r * 0.8;
      if (!ai.nav || ai.navT <= 0 || (!inNext && ai.navOutside)) {
        const q = G.Terrain.randomLandPoint(Math.random, n.x, n.z, Math.max(5, n.r * 0.6), 1.0);
        ai.nav = q; ai.navT = inNext ? U.rand(6, 14) : U.rand(15, 25); ai.navOutside = false;
        if (inNext && !this.wantsLoot()) ai.lootT = Math.max(0, ai.lootT - 30);
      }
      this.control.sprint = this.stormPressure() > 0;
    }

    // ---------- blocage ----------
    checkStuck(dt) {
      const ai = this.ai;
      ai.lastPosT += dt;
      if (ai.lastPosT >= 1.0) {
        const moved = Math.hypot(this.pos.x - ai.lastPos.x, this.pos.z - ai.lastPos.z);
        const wantMove = Math.abs(this.control.mx) + Math.abs(this.control.mz) > 0.2 && ai.mode !== 'heal';
        if (wantMove && moved < 0.8 && !this.swimming) ai.stuckT += ai.lastPosT; else ai.stuckT = Math.max(0, ai.stuckT - 1);
        ai.lastPos.copy(this.pos); ai.lastPosT = 0;
      }
      if (ai.stuckT > 0.9) {
        this.control.jump = true;
        // obstacle destructible devant ? -> pioche
        const eye = this.eyePos();
        const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
        const h = P.raycast(eye.x, eye.y - 0.6, eye.z, fx, 0, fz, 2.2, { mask: 3 });
        if (h && h.ent && !h.ent.dead && !h.ent.noPickaxe && h.ent.minX != null && ai.stuckT > 1.5) { ai.harvestT = 2.5; this.harvestEnt = h.ent; }
        else if (ai.stuckT > 2.5) { ai.detourT = U.rand(1.5, 3); ai.detourYaw = this.yaw + (Math.random() < 0.5 ? 1 : -1) * U.rand(1.0, 2.0); ai.stuckT = 0; }
        if (ai.stuckT > 6) { // téléportation de secours (loin du joueur)
          if (this.distToCam > 60) { const q = G.Terrain.randomLandPoint(Math.random, this.pos.x, this.pos.z, 15, 1.5); this.pos.set(q[0], G.Phys.supportAt(q[0], q[1], 200, 0.3, 0) + 0.1, q[1]); }
          ai.stuckT = 0;
        }
      }
    }

    // ------------------------------------------------------------
    //  Pilotage à chaque frame
    // ------------------------------------------------------------
    steer(dt) {
      const ai = this.ai, c = this.control, p = this.pos;
      c.mx = 0; c.mz = 0; c.fire = false; c.firePressed = false; c.aim = false;
      const st = this.state;
      if (st === 'bus' || this.dead) return;
      if (st === 'skydive' || st === 'glide') {
        const t = ai.dropTarget || [p.x, p.z];
        const dx = t[0] - p.x, dz = t[1] - p.z;
        const dh = Math.hypot(dx, dz);
        this.yaw = U.dampAngle(this.yaw, Math.atan2(-dx, -dz), 3, dt);
        const hAbove = p.y - G.Terrain.height(p.x, p.z);
        c.mz = dh > 4 ? 1 : 0;
        this.pitch = st === 'skydive' ? (dh < hAbove * 0.9 ? [-0.6, -0.95, -1.3, -1.3][U.clamp(Math.round(this.diffLevel || 0), 0, 3)] : -0.2) : 0;
        return;
      }
      if (st === 'vehicle') {
        const k = this.vehicle;
        c.sprint = false;
        if (k && ai.nav) {
          const hk = Math.atan2(ai.nav[0] - k.pos.x, ai.nav[1] - k.pos.z);
          const rel = U.angleDiff(k.yaw, hk);
          c.mz = 1;
          c.mx = -U.clamp(rel * 2, -1, 1);
          const ds = ai.driveStuck || 0;
          if (ds > 0.9 && ds < 2.4) { c.mz = -1; c.mx = -c.mx; } // marche arrière pour se dégager
          c.sprint = Math.abs(rel) < 0.25 && Math.abs(k.speed) > 12;
          if (Math.abs(k.speed) < 1.5) ai.driveStuck = (ai.driveStuck || 0) + dt; else ai.driveStuck = Math.max(0, (ai.driveStuck || 0) - dt);
          if (!k.jumpCd || k.jumpCd < G.Game.time) { const h = P.raycast(k.pos.x, k.pos.y + 0.6, k.pos.z, Math.sin(k.yaw), 0, Math.cos(k.yaw), 5, { mask: 1 }); if (h && !h.terrain) { c.jump = true; k.jumpCd = G.Game.time + 1.5; } }
        }
        return;
      }
      if (this.danceT > 0) return;
      if (ai.emoteUntil && G.Game.time < ai.emoteUntil && G.Game.time - this.lastAttackTime > 1) return;
      if (ai.emoteUntil && G.Game.time >= ai.emoteUntil) { ai.emoteUntil = 0; this.stopEmote(); }
      // cible de navigation
      let tx = null, tz = null;
      if (ai.nav) { tx = ai.nav[0]; tz = ai.nav[1]; }
      const enemy = ai.mode === 'fight' ? ai.target : null;
      let moveYaw = null, faceYaw = null;
      if (ai.harvestT > 0) {
        ai.harvestT -= dt;
        const e = this.harvestEnt;
        if (!e || e.dead || e.minX == null) ai.harvestT = 0;
        else {
          if (this.sel !== -1) this.equip(-1);
          const cx = (e.minX + e.maxX) / 2, cz = (e.minZ + e.maxZ) / 2;
          this.yaw = U.dampAngle(this.yaw, Math.atan2(-(cx - p.x), -(cz - p.z)), 8, dt);
          this.pitch = 0;
          if (this.swing()) { const eye = this.eyePos(); const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); this.pendingSwing = [eye.x, eye.y - 0.4, eye.z, fx, -0.1, fz, 2.6]; }
          c.mz = 0.3;
          return;
        }
      }
      if (enemy) {
        const hb = enemy.hitbox;
        const dx = hb.cx - p.x, dz = hb.cz - p.z;
        const d = Math.hypot(dx, dz);
        faceYaw = Math.atan2(-dx, -dz);
        if (ai.fightMove === 'strafe') {
          ai.strafeT -= dt;
          if (ai.strafeT <= 0) { ai.strafeT = U.rand(0.6, 1.8); ai.strafeDir = Math.random() < 0.5 ? -1 : 1; }
          const pref = ai.prefDist || 20;
          const fwd = d > pref * 1.3 ? 1 : d < pref * 0.6 ? -0.8 : 0;
          const side = ai.strafeDir * this.sk.strafe * (d < 40 ? 1 : 0.5);
          // en coordonnées locales de la visée
          c.mz = fwd; c.mx = side;
          if (this.crouching === false && d > 30 && Math.random() < 0.002) this.control.crouch = !this.control.crouch;
        } else if (ai.fightMove === 'melee') { c.mz = 1; }
        else if (ai.fightMove === 'rush') { c.mz = 1; c.mx = 0; c.sprint = true; }
        else if (ai.fightMove === 'flee' && tx != null) { moveYaw = Math.atan2(-(tx - p.x), -(tz - p.z)); }
        else if (tx != null) { moveYaw = Math.atan2(-(tx - p.x), -(tz - p.z)); }
      } else if (tx != null) {
        const dx = tx - p.x, dz = tz - p.z;
        if (Math.hypot(dx, dz) > 1.2) moveYaw = Math.atan2(-dx, -dz);
        else ai.nav = null;
      }
      if (ai.detourT > 0) { ai.detourT -= dt; moveYaw = ai.detourYaw; }
      if (this.useT > 0) { moveYaw = null; c.mx = 0; c.mz = 0; }
      if (faceYaw != null) {
        // visée : rotation limitée
        this.yaw = turnToward(this.yaw, ai.aimYaw != null ? ai.aimYaw : faceYaw, this.sk.turn, dt);
        if (moveYaw != null) {
          // se déplacer vers moveYaw tout en regardant l'ennemi
          const rel = U.angleDiff(this.yaw, moveYaw);
          c.mz = Math.cos(rel); c.mx = -Math.sin(rel);
        }
      } else if (moveYaw != null) {
        this.yaw = U.dampAngle(this.yaw, moveYaw, 6, dt);
        this.pitch = U.damp(this.pitch, 0, 4, dt);
        const rel = U.angleDiff(this.yaw, moveYaw);
        c.mz = Math.max(0, Math.cos(rel)); c.mx = 0;
        c.sprint = c.sprint || (ai.mode === 'rotate' && Math.random() < 0.02) || ai.mode === 'loot' && false;
      } else if (ai.lookAt) {
        this.yaw = U.dampAngle(this.yaw, Math.atan2(-(ai.lookAt[0] - p.x), -(ai.lookAt[1] - p.z)), 5, dt);
        this.pitch = U.damp(this.pitch, 0, 4, dt);
      }
      if (ai.mode !== 'fight') this.control.crouch = false;
    }

    // Visée et tir à chaque frame
    combatFrame(dt) {
      const ai = this.ai;
      if (this.dead || this.downed || this.state !== 'ground' || ai.mode !== 'fight' || !ai.target || ai.target.dead || this.useT > 0 || this.danceT > 0) return;
      const t = ai.target;
      if (G.Game.time - ai.lastSeenT > 0.5) return;
      if (ai.reactT > 0) { ai.reactT -= dt; return; }
      const it = this.curWeapon();
      if (!it) { if (this.sel < 0 && Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z) < 2.6) { this.control.fire = true; this.swing(); const e = this.eyePos(); const dx = t.hitbox.cx - e.x, dy = t.hitbox.cy - e.y, dz = t.hitbox.cz - e.z, l = Math.hypot(dx, dy, dz); this.pendingSwing = [e.x, e.y, e.z, dx / l, dy / l, dz / l, 3]; } return; }
      const w = I.WEAPONS[it.id];
      const eye = this.eyePos();
      const hb = t.hitbox;
      const head = Math.random() < this.sk.head * 0.02 + (this.aimHead ? 1 : 0);
      if (Math.random() < 0.05) this.aimHead = Math.random() < this.sk.head;
      let tx = this.aimHead ? hb.hx : hb.cx, ty = this.aimHead ? hb.hy : hb.cy + 0.1, tz = this.aimHead ? hb.hz : hb.cz;
      const dist = Math.hypot(tx - eye.x, ty - eye.y, tz - eye.z);
      // anticipation pour les projectiles
      if (w.projectile) { const tt = dist / w.projectile.speed; tx += t.vel.x * tt; tz += t.vel.z * tt; ty += (t.vel.y * tt) + 0.5 * w.projectile.grav * tt * tt; }
      // erreur de visée (bruit basse fréquence)
      ai.errT -= dt;
      if (ai.errT <= 0) {
        ai.errT = U.rand(0.25, 0.6);
        const moving = Math.hypot(t.vel.x, t.vel.z) > 2 ? 1.5 : 1;
        const e = this.sk.aim * moving * (this.grounded ? 1 : 1.6) * (G.Sky.night > 0.5 ? 1.2 : 1) * (t.isBot ? 1.8 : 1) * (this.farSim ? 1.4 : 1);
        ai.errX = U.rand(-1, 1) * e; ai.errY = U.rand(-1, 1) * e * 0.7;
      }
      const dx = tx - eye.x, dy = ty - eye.y, dz = tz - eye.z;
      const wantYaw = Math.atan2(-dx, -dz) + ai.errX;
      const wantPitch = Math.atan2(dy, Math.hypot(dx, dz)) + ai.errY;
      ai.aimYaw = wantYaw;
      this.pitch = turnToward(this.pitch, wantPitch, this.sk.turn * 0.8, dt);
      const off = Math.abs(U.angleDiff(this.yaw, wantYaw)) + Math.abs(this.pitch - wantPitch);
      if (dist > w.range * 1.1) return;
      if (off > 0.12 + (w.cat === 'shotgun' ? 0.1 : 0)) return;
      // tir
      this.control.aim = w.cat !== 'shotgun' && dist > 15;
      const cp = Math.cos(this.pitch);
      const dir = U.v3.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp).clone();
      // tir par rafales avec pauses (plus humain)
      const dl = U.clamp(Math.round(this.diffLevel || 0), 0, 3);
      ai.burstT = (ai.burstT || 0) - dt;
      if (ai.burstT <= -U.rand(0.25, 0.6) * [2.2, 1.3, 1, 1][dl]) ai.burstT = U.rand(0.35, 0.9) * [0.55, 0.85, 1, 1][dl];
      if (w.auto && ai.burstT > 0) this.control.fire = true;
      else { ai.fireHold -= dt; if (ai.fireHold <= 0 && this.fireCd <= 0) { this.control.firePressed = true; ai.fireHold = 1 / w.rate * U.rand(1.0, 1.6) * [1.7, 1.2, 1, 1][dl] + [0.35, 0.15, 0.08, 0.04][dl]; } }
      if (w.burst && this.burstLeft > 0) this.control.firePressed = false;
      if (this.farSim) {
        // simulation : tirs "invisibles" moins chers
        if (this.fireCd <= 0 && (this.control.fire || this.control.firePressed)) this.tryFire(dt, eye, eye, dir);
      } else this.tryFire(dt, eye, eye, dir);
      this.char.anim.aim = this.control.aim ? 1 : 0;
    }

    onDamaged(dmg, o) {
      this.char.anim.hit = 1;
      if (o.by && o.by !== this) {
        const ai = this.ai;
        if (!ai.target || ai.target.dead || Math.random() < 0.7) { ai.target = o.by; ai.lastSeen = o.by.pos.clone(); if (ai.reactT <= 0) ai.reactT = this.sk.react * 0.5; }
        this.cancelUse();
      }
    }
    onKill(v) {
      // après une élimination : on se soigne / on loote un moment
      this.calmUntil = G.Game.time + U.rand(8, 20);
      if (this.ai.target === v) this.ai.target = null;
      // parfois une petite emote de victoire (comme les vrais joueurs !)
      if (Math.random() < 0.12 && this.state === 'ground' && !this.swimming && this.nearPlayer) G.Sprays.place(this);
      if (Math.random() < 0.35 && this.state === 'ground' && !this.swimming) {
        this.ai.emoteUntil = G.Game.time + U.rand(1.8, 3.2);
        this.playEmote(U.pick(['emote_floss', 'emote_L', 'emote_danse', 'emote_hype', 'emote_orange', 'emote_rire', 'emote_flexion']));
      }
    }
    onLanded() {
      // petites réserves de matériaux au début
      this.mats.wood += Math.round(40 + this.sk.build * 120);
      this.mats.stone += Math.round(this.sk.build * 60);
      this.ai.mode = 'loot'; this.ai.lootT = 0;
      const dl = U.clamp(Math.round(this.diffLevel || 0), 0, 3);
      this.ai.lootDelay = G.Game.time + U.rand(...[[4, 7.5], [2.2, 4.5], [1, 2.5], [0.3, 1.2]][dl]);
    }
  }
  function turnToward(a, b, speed, dt) {
    const d = U.angleDiff(a, b);
    const m = speed * dt;
    if (Math.abs(d) <= m) return b;
    return a + Math.sign(d) * m;
  }
  G.Bot = Bot;

  // Reflet de lunette : un sniper qui vous vise de loin trahit sa position par un éclat lumineux
  const GL = { pool: [] };
  G.Glints = GL;
  GL.update = function () {
    const pl = G.player, M = G.Match;
    let n = 0;
    if (pl && !pl.dead && M && M.bots && G.Game.state === 'playing') {
      const t = G.Game.time;
      for (const b of M.bots) {
        if (n >= 4) break;
        if (b.dead || !b.ai || b.ai.target !== pl || b.state !== 'ground' || !b.control.aim) continue;
        const it = b.curWeapon(); if (!it || I.WEAPONS[it.id].cat !== 'sniper') continue;
        const dx = pl.pos.x - b.pos.x, dz = pl.pos.z - b.pos.z, d = Math.hypot(dx, dz);
        if (d < 30 || d > 320) continue;
        // visible seulement si rien (relief, bâtiment) ne se trouve entre les deux
        if (!(b._glT > t)) {
          b._glT = t + 0.3;
          const ex = pl.pos.x, ey = pl.pos.y + 1.7, ez = pl.pos.z, hx = b.pos.x - ex, hy = b.pos.y + 1.55 - ey, hz = b.pos.z - ez, hl = Math.hypot(hx, hy, hz);
          const h = P.raycast(ex, ey, ez, hx / hl, hy / hl, hz / hl, hl - 1, { mask: 1 });
          b._glVis = !h;
        }
        if (!b._glVis) continue;
        let s = GL.pool[n];
        if (!s) {
          s = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.Tex.get('glow'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
          s.material.color.setRGB(2.4, 2.3, 1.9);
          s.renderOrder = 5; G.scene.add(s); GL.pool[n] = s;
        }
        const k = 0.35 / d;
        s.position.set(b.pos.x + dx * k, b.pos.y + 1.55, b.pos.z + dz * k);
        const fl = 0.75 + Math.sin(t * 13 + n * 1.7) * 0.25;
        s.scale.setScalar(Math.max(0.8, d * 0.04) * fl);
        s.visible = true;
        n++;
      }
    }
    for (let i = n; i < GL.pool.length; i++) GL.pool[i].visible = false;
  };
})();
