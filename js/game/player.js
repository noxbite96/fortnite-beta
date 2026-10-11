// ============================================================
//  Joueur : entrées, caméra 3e personne, construction, interaction
// ============================================================
(function () {
  const U = G.U, I = G.Items, In = G.Input, B = G.Build, CB = G.Combat;

  class Player extends G.Actor {
    constructor(o) {
      super(Object.assign({ isPlayer: true }, o));
      this.camYaw = 0; this.camPitch = -0.1;
      this.camDist = 2.8; this.camPos = new THREE.Vector3();
      this.recoilP = 0; this.recoilY = 0;
      this.interactT = 0; this.interactTarget = null;
      this.crouchToggle = false;
      this.lastSlot = 0;
      this.shake = 0;
      this.hitDirs = [];
      this.freeLook = false;
    }
    reset() {
      super.reset();
      this.recoilP = 0; this.recoilY = 0; this.interactT = 0; this.crouchToggle = false; this.thankedBus = false;
      if (G.Build) { B.cancelEdit && B.cancelEdit(); B.showGhost && B.showGhost(null); }
    }

    // ------------------------------------------------------------
    //  Entrées
    // ------------------------------------------------------------
    handleInput(dt) {
      const c = this.control, S = G.Store.data.settings;
      const m = In.mouse;
      // Le clavier ne dépend PLUS de la capture de la souris : sans
      // pointer lock on joue quand même, à la souris libre.
      const active = In.playing();
      // regard
      if (active) {
        let sens = S.sens * 0.0021;
        if (this.control.aim && this.curWeapon()) sens *= I.WEAPONS[this.curWeapon().id].scope ? S.scopeSens : S.adsSens;
        if (G.HUD.emoteWheelOpen) { G.HUD.emoteWheelMove(m.dx, m.dy); }
        else {
          this.camYaw -= m.dx * sens;
          this.camPitch -= m.dy * sens * (S.invertY ? -1 : 1);
          // caméra au clavier (I/J/K/L ou pavé 8/4/5/6)
          const lx = In.lookX(), ly = In.lookY();
          if (lx || ly) {
            const k = S.sens * 2.4 * dt;
            this.camYaw -= lx * k;
            this.camPitch -= ly * k * (S.invertY ? -1 : 1);
          }
        }
      }
      // Outils admin (F4) : l'aimbot recale la caméra sur l'ennemi le plus
      // proche. Nul pour un joueur normal : G.Server.canDev() est vérifié.
      if (G.Server && G.Server.canDev() && G.Server.dev().aimbot && active) {
        const tgt = G.Server.nearestEnemy();
        if (tgt) {
          const dx = tgt.pos.x - this.pos.x;
          const dy = (tgt.pos.y + 1.2) - (this.pos.y + 1.5);
          const dz = tgt.pos.z - this.pos.z;
          const wantYaw = Math.atan2(-dx, -dz);
          const wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
          // lissage : évite le verrouillage instantané, la visée reste
          // crédible et la précision s'améliore sans tremblement
          const k = Math.min(1, dt * 14);
          this.camYaw += G.U.angleDiff(this.camYaw, wantYaw) * k;
          this.camPitch += (wantPitch - this.camPitch) * k;
        }
      }
      this.camPitch = U.clamp(this.camPitch, -1.45, 1.35);
      const alive = !this.dead;
      c.mx = 0; c.mz = 0; c.fire = false; c.firePressed = false; c.aim = false; c.sprint = false; this.jetHold = false;
      if (!alive || !active) { c.crouch = false; return; }
      c.mz = In.forward(); c.mx = In.strafe();
      c.sprint = In.down('sprint');
      if (In.hit('crouchToggle') && this.balloons > 0 && !this.grounded) this.popBalloon();
      else if (In.hit('crouchToggle')) this.crouchToggle = !this.crouchToggle;
      c.crouch = this.crouchToggle || In.down('crouch');
      if (c.sprint && this.crouchToggle && !(this.slideT > 0) && !In.hit('crouchToggle')) this.crouchToggle = false;
      if (In.hit('jump')) c.jump = true;
      { const ji = this.cur(); this.jetHold = !!(ji && ji.id === 'jetpack' && In.down('jump') && this.state === 'ground' && !this.swimming); if (this.jetHold && this.grounded) c.jump = true; }
      // Vol admin : Espace monte, Ctrl descend, irrespective du sol
      if (G.Server && G.Server.canDev() && G.Server.dev().fly) {
        this.flyUp = (In.down('jump') ? 1 : 0) - ((In.down('crouch') || In.down('crouchToggle')) ? 1 : 0);
        c.jump = false;
      } else {
        this.flyUp = 0;
      }

      const st = this.state;
      // tag (graffiti)
      if (In.hit('spray') && st === 'ground' && !this.downed && (this.sprayCd || 0) <= G.Game.time) { if (G.Sprays.place(this)) this.sprayCd = G.Game.time + 1.5; }
      // marqueur (clic molette ou V)
      if (In.hit('ping') && st !== 'bus') this.placePing();
      if (st === 'bus') {
        if (In.hit('jump') && G.Bus && G.Bus.doorsOpen) G.Match.playerJump();
        if (In.hit('emote') && !this.thankedBus) { this.thankedBus = true; G.Match.thankDriver(this); }
        return;
      }
      if (st === 'skydive' || st === 'glide') return;
      // planeur redéployable : Espace pendant une chute depuis une grande hauteur
      if (st === 'ground' && In.hit('jump') && !this.grounded && this.vel.y < -6 && !(this.balloons > 0) && !this.jetHold && !this.chicken && !this.swimming && !this.downed && !this.grapple) {
        if (this.pos.y - this.groundBelow() > 9) { this.buildMode = false; this.openGlider(); this.refreshHeld(); c.jump = false; return; }
      }
      if (this.downed) { c.jump = false; c.sprint = false; this.interactTarget = null; return; }
      if (st === 'hide') {
        this.interactTarget = { kind: 'exit', name: this.hideSpot ? this.hideSpot.name : 'Cachette', action: 'Sortir (' + In.niceAll('interact') + ' / ' + In.niceAll('jump') + ')' };
        if (In.hit('interact') || In.hit('jump')) G.Extras2.exitHide(this);
        c.jump = false;
        return;
      }
      if (st === 'zip') {
        this.interactTarget = { kind: 'exit', name: 'Tyrolienne', action: In.niceAll('jump') + ' : sauter · ' + In.niceAll('interact') + ' : lâcher · regardez pour changer de sens' };
        if (In.hit('jump')) { c.jump = false; G.Extras2.exitZip(this, true); this.zipCd = 0.6; }
        else if (In.hit('interact')) { G.Extras2.exitZip(this, false); this.zipCd = 0.6; }
        return;
      }
      if (st === 'vehicle') {
        const vh = this.vehicle;
        if (vh && vh.isPlane) {
          c.fire = In.down('fire');
          this.interactTarget = { kind: 'exit', name: 'Avion — ' + Math.round(vh.speed * 3.6) + ' km/h · altitude ' + Math.max(0, Math.round(vh.pos.y - Math.max(G.Terrain.height(vh.pos.x, vh.pos.z), 0))) + ' m · turbo ' + Math.round(vh.boost * 100) + ' %', action: In.niceAll('moveForward') + ' : accélérer · souris : diriger · clic : tirer · ' + In.niceAll('sprint') + ' : turbo · ' + In.niceAll('interact') + ' : s\'éjecter' };
        } else if (vh && vh.isBoar) {
          this.interactTarget = { kind: 'exit', name: 'Sanglier — ' + Math.round(vh.speed * 3.6) + ' km/h', action: In.niceAll('moveForward') + ' : galoper · ' + In.niceAll('sprint') + ' : charger · ' + In.niceAll('jump') + ' : sauter · ' + In.niceAll('interact') + ' : descendre' };
        } else if (vh && vh.isMech) {
          c.fire = In.down('fire');
          this.interactTarget = { kind: 'exit', name: 'Mécha — blindage ' + Math.max(0, Math.round(vh.hp)) + ' / 1000 · missiles ' + (vh.missileCd > 0 ? 'dans ' + Math.ceil(vh.missileCd) + ' s' : 'prêts'), action: 'Clic : canon · ' + In.niceAll('aim') + ' : missiles · ' + In.niceAll('jump') + ' : bond · ' + In.niceAll('interact') + ' : sortir' };
        } else if (vh && vh.isTurret) {
          c.fire = In.down('fire');
          this.interactTarget = { kind: 'exit', name: 'Tourelle montée — chaleur ' + Math.round(Math.min(1, vh.heat) * 100) + ' %' + (vh.over ? ' · SURCHAUFFE !' : ''), action: 'Clic : tirer · souris : viser · ' + In.niceAll('interact') + ' : quitter' };
        } else if (vh && vh.isHeli) {
          this.interactTarget = { kind: 'exit', name: 'Hélicoptère — ' + Math.round(vh.speed * 3.6) + ' km/h · altitude ' + Math.max(0, Math.round(vh.pos.y - Math.max(G.Terrain.height(vh.pos.x, vh.pos.z), 0))) + ' m' + (vh.spin < 0.75 ? ' · démarrage ' + Math.round(vh.spin / 0.75 * 100) + ' %' : ''), action: In.niceAll('jump') + ' : monter · ' + In.niceAll('crouch') + ' : descendre · ' + In.niceAll('moveForward') + ' : avancer · souris : tourner · ' + In.niceAll('interact') + ' : sortir' };
        } else this.interactTarget = { kind: 'exit', name: (vh && vh.label || 'Kart tout-terrain') + (vh && vh.isCar ? ' — ' + Math.round(Math.abs(vh.speed) * 3.6) + ' km/h' : ''), action: 'Sortir · ' + In.niceAll('sprint') + ' : turbo · ' + In.niceAll('jump') + ' : saut · ' + In.niceAll('radio') + ' : radio' + (vh && vh.isCar ? ' · ' + In.niceAll('horn') + ' : klaxon' : '') };
        if (vh && vh.isCar && In.hit('horn')) G.Audio.play('car_horn', { pos: [vh.pos.x, vh.pos.y + 1, vh.pos.z] });
        if (vh && !vh.isPlane && !vh.isHeli && !vh.isTurret && !vh.isMech && !vh.isBoar && In.hit('radio')) G.Extras.nextStation();
        if (In.hit('interact')) G.Extras.exitKart(this);
        return;
      }

      // ---- mode édition ----
      if (B.edit) {
        const r = this.aimRay();
        if (In.down('fire')) B.editPaint(r.o, r.d, In.hit('fire'));
        if (In.released('fire')) B.editRelease();
        if (In.hit('aim')) B.editReset();
        if (In.hit('edit') || In.hit('buildMode')) B.confirmEdit();
        if (B.edit && (B.edit.e.dead || this.pos.distanceTo(U.v1.set(B.edit.e.t.x, B.edit.e.t.y, B.edit.e.t.z)) > 9)) B.cancelEdit();
        c.mx *= 1; c.mz *= 1;
        return;
      }
      // ---- sélection ----
      for (let i = 0; i < 5; i++) if (In.hit('slot' + (i + 1))) { this.equip(i); this.lastSlot = i; }
      if (In.hit('pickaxe')) { this.equip(-1); }
      if (m.wheel && !this.buildMode && !G.HUD.emoteWheelOpen) {
        let s = this.sel;
        const dirw = m.wheel > 0 ? 1 : -1;
        for (let k = 0; k < 6; k++) { s += dirw; if (s > 4) s = -1; if (s < -1) s = 4; if (s === -1 || this.slots[s]) break; }
        this.equip(s);
      }
      // ---- construction ----
      const buildActs = { buildWall: 'wall', buildFloor: 'floor', buildRamp: 'ramp', buildRoof: 'roof' };
      for (const k in buildActs) if (In.hit(k)) { this.enterBuild(buildActs[k]); }
      if (In.hit('buildMode')) { if (this.buildMode) this.exitBuild(); else this.enterBuild(this.buildType); }
      if (this.buildMode && m.wheel) { const i = B.TYPES.indexOf(this.buildType); this.buildType = B.TYPES[(i + (m.wheel > 0 ? 1 : 3)) % 4]; G.Audio.play('ui_hover'); }
      // édition
      if (In.hit('edit')) this.tryEdit();
      // ---- emotes ----
      if (In.hit('emote')) G.HUD.openEmoteWheel();
      if (G.HUD.emoteWheelOpen && (!In.down('emote') || In.hit('fire'))) { const id = G.HUD.closeEmoteWheel(); if (id) { this.exitBuild(); this.playEmote(id); } }
      // ---- actions ----
      if (In.hit('reload')) { if (this.buildMode) {} else this.startReload(); }
      if (In.hit('drop') && this.sel >= 0 && this.slots[this.sel]) { this.dropSlot(this.sel); G.Audio.play('drop'); }
      c.aim = In.down('aim') && !this.buildMode && !this.swimming && this.sel >= 0 && !!this.curWeapon();
      const cwm = this.curWeapon() && I.WEAPONS[this.curWeapon().id];
      if (cwm && cwm.melee) {
        c.aim = false;
        if (In.hit('aim') && !this.buildMode && st === 'ground' && G.Game.time >= (this.dashCd || 0)) this.saberDash();
      }
      c.fire = In.down('fire'); c.firePressed = In.hit('fire');
      if (this.buildMode && In.hit('nextMat')) { const i = B.MATS.indexOf(this.buildMat); this.buildMat = B.MATS[(i + 1) % 3]; G.Audio.play('ui_click'); }
      // interaction (E)
      this.handleInteract(dt);
    }

    // Ruée au sabre : bond en avant qui frappe tous ceux qu'on traverse
    saberDash() {
      const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
      this.vel.x = fx * 27; this.vel.z = fz * 27; this.vel.y = 4.5; this.grounded = false;
      this.dashT = 0.4; this.dashHit = new Set(); this.dashCd = G.Game.time + 3;
      this.char.anim.swing = 1; this.char.anim.swingT = 0.05;
      G.Audio.play('saber'); G.Audio.play('launchpad', { vol: 0.5 });
      for (let i = 0; i < 20; i++) G.FX.glow.spawn(this.pos.x, this.pos.y + 1, this.pos.z, -fx * U.rand(2, 6), U.rand(0, 2), -fz * U.rand(2, 6), 0.5, 0.8, 1, 0.25, 0.4, 0, 0, 0);
    }
    updateDash(dt) {
      if (!(this.dashT > 0)) return;
      this.dashT -= dt;
      const it = this.curWeapon(); if (!it) { this.dashT = 0; return; }
      for (const a of G.Combat.actors) {
        if (a === this || a.dead || this.dashHit.has(a) || !a.hittable() || G.Duo.sameTeam(this, a)) continue;
        if (Math.hypot(a.pos.x - this.pos.x, a.pos.z - this.pos.z) < 1.8 && Math.abs(a.pos.y - this.pos.y) < 2) {
          this.dashHit.add(a);
          G.Combat.damageActor(a, I.damage(it) * 1.1, { by: this, weapon: 'saber_dash', point: [a.pos.x, a.pos.y + 1, a.pos.z] });
          G.FX.hitSpark(a.pos.x, a.pos.y + 1, a.pos.z, a.shield > 0, false);
        }
      }
      if (Math.random() < 0.7) G.FX.glow.spawn(this.pos.x, this.pos.y + 1, this.pos.z, 0, 0, 0, 0.5, 0.8, 1, 0.3, 0.3, 0, 0, 0);
    }
    enterBuild(type) {
      if (this.swimming || this.state !== 'ground' && this.state !== 'lobby') return;
      if (G.Match && G.Match.zeroBuild && this.state !== 'lobby') { if (!this.zbWarned || G.Game.time - this.zbWarned > 3) { this.zbWarned = G.Game.time; G.HUD.notify('ZÉRO CONSTRUCTION : la construction est désactivée', 1.8); G.Audio.play('build_fail'); } return; }
      this.buildType = type;
      if (!this.buildMode) {
        this.buildMode = true; this.cancelUse(); this.reloadT = 0; this.stopEmote();
        this.refreshHeld();
        G.Audio.play('equip');
      }
    }
    exitBuild() {
      if (!this.buildMode) return;
      this.buildMode = false;
      B.showGhost(null);
      this.refreshHeld();
    }
    placePing() {
      const r = this.aimRay();
      const h = G.Phys.raycast(r.o.x, r.o.y, r.o.z, r.d.x, r.d.y, r.d.z, 500, { mask: 3 });
      if (!h) return;
      const H = G.HUD;
      if (H.ping && Math.hypot(H.ping.x - h.x, H.ping.z - h.z) < 3) { H.ping = null; G.Audio.play('ui_back'); return; }
      H.ping = { x: h.x, y: h.y, z: h.z, t: G.Game.time };
      G.Audio.play('ping');
    }
    tryEdit() {
      const r = this.aimRay();
      const h = G.Phys.raycast(r.o.x, r.o.y, r.o.z, r.d.x, r.d.y, r.d.z, this.camDistNow + 6, { mask: 3 });
      if (h && h.ent && h.ent.type === 'build' && !h.ent.dead && h.ent.owner === this) {
        this.exitBuild();
        B.startEdit(h.ent, this.pos);
      } else G.Audio.play('build_fail');
    }

    handleInteract(dt) {
      const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
      const t = G.Loot.findInteract(this, fx, fz);
      this.interactTarget = t;
      const E = In.down('interact');
      if (!t) { this.interactT = 0; return; }
      if (t.kind === 'item') {
        if (In.hit('interact')) this.pickup(t.obj);
      } else if (t.kind === 'door') {
        if (In.hit('interact')) G.Arch.toggleDoor(t.obj, this.pos);
      } else if (t.kind === 'revive') {
        if (E) { t.obj.reviveBy = this; t.obj.reviveUntil = G.Game.time + 0.15; this.interactT = t.obj.reviveT; } else this.interactT = 0;
      } else if (t.kind === 'chest' || t.kind === 'ammo') {
        if (E) {
          this.interactT += dt;
          if (this.interactT >= (t.kind === 'chest' ? 0.4 : 0.3)) {
            this.interactT = 0;
            if (t.kind === 'chest') G.Loot.openChest(t.obj, this); else G.Loot.openAmmo(t.obj, this);
          }
        } else this.interactT = 0;
      } else if (t.kind === 'reboot') {
        if (E && t.ok) { this.interactT += dt; if (G.Extras2.holdReboot(this, t.obj, dt)) this.interactT = 0; }
        else { this.interactT = 0; if (t.obj.rebootBy === this) G.Extras2.vanReset(t.obj); }
      } else if (G.Extras && In.hit('interact')) G.Extras.interact(this, t);
    }
    pickup(it) {
      const d = it.data;
      if (d.kind !== 'item') return;
      const had = this.slots.every((s) => s);
      const isCons = !!I.CONSUMABLES[d.item.id];
      // les consommables s'empilent avant d'échanger
      const ok = this.takeItem(d.item, !isCons || !this.canStack(d.item));
      if (ok || (isCons && d.item.count <= 0)) {
        G.Loot.remove(it);
        G.Audio.play('pickup');
        G.HUD.pickupNote(I.name(d.item), I.RARITY[d.item.rarity].color);
        if (had && !isCons) G.HUD.notify(I.name(d.item) + ' échangé', 1.2);
        if (this.sel < 0 && I.WEAPONS[d.item.id]) { const i = this.slots.indexOf(d.item); if (i >= 0) this.equip(i); }
      } else G.HUD.notify('Inventaire plein', 1.2);
    }
    canStack(item) { const c = I.CONSUMABLES[item.id]; return this.slots.some((s) => s && s.id === item.id && s.count < c.stack) || this.slots.some((s) => !s); }

    // Rayon de visée (depuis la caméra, commence au niveau du joueur)
    aimRay() {
      const cam = G.camera;
      const d = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      const o = cam.position.clone();
      // avancer jusqu'au plan du joueur (évite de toucher ce qui est derrière lui)
      const head = U.v1.set(this.pos.x, this.pos.y + 1.5, this.pos.z);
      const t0 = Math.max(0, U.v2.copy(head).sub(o).dot(d) - 0.4);
      o.addScaledVector(d, t0);
      return { o, d, t0 };
    }

    // ------------------------------------------------------------
    //  Actions par frame (tir, construction...)
    // ------------------------------------------------------------
    act(dt) {
      if (this.dead || B.edit || this.downed) { B.showGhost(null); if (this.downed && this.buildMode) this.exitBuild(); return; }
      if (this.chicken) { B.showGhost(null); if (this.control.firePressed) G.Wild.drop(this); return; }
      const st = this.state;
      if (st !== 'ground' && st !== 'lobby') { B.showGhost(null); return; }
      const c = this.control;
      if (this.swimming) { B.showGhost(null); return; }
      if (this.buildMode) {
        const t = B.target(this, this.buildType, this.camYaw, this.camPitch);
        const enough = this.infiniteMats || this.mats[this.buildMat] >= B.COST;
        const ok = B.canPlace(t) && enough;
        B.showGhost(t, ok);
        if (c.fire && this.buildCd <= 0) {
          if (ok) {
            const e = B.place(this, t, this.buildMat);
            if (e) { this.buildCd = 0.12; this.stats.buildsPlaced = (this.stats.buildsPlaced || 0) + 1; }
          } else if (c.firePressed) { G.Audio.play('build_fail'); if (!enough) G.HUD.notify('Pas assez de ' + I.MAT[this.buildMat].name.toLowerCase(), 1.2); }
        }
        return;
      }
      B.showGhost(null);
      if (this.danceT > 0) return;
      const r = this.aimRay();
      const eye = this.eyePos();
      if (this.sel < 0) {
        if (c.fire && this.swing()) {
          // l'impact est calculé un peu plus tard (au moment où la pioche frappe)
          const range = 2.9;
          // point visé depuis la caméra -> direction depuis les yeux
          const h = G.Phys.raycast(r.o.x, r.o.y, r.o.z, r.d.x, r.d.y, r.d.z, range + 2, { mask: 6 });
          let tx = r.o.x + r.d.x * (range + 1), ty = r.o.y + r.d.y * (range + 1), tz = r.o.z + r.d.z * (range + 1);
          if (h) { tx = h.x; ty = h.y; tz = h.z; }
          const dx = tx - eye.x, dy = ty - eye.y, dz = tz - eye.z, l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          this.pendingSwing = [eye.x, eye.y, eye.z, dx / l, dy / l, dz / l, range];
        }
        return;
      }
      const it = this.cur();
      if (!it) return;
      const cons = I.CONSUMABLES[it.id];
      if (cons) {
        if (cons.kind === 'throw') { if (c.firePressed) this.throwItem(r.d.x, r.d.y + 0.15, r.d.z); }
        else if (cons.kind === 'trap') { if (c.firePressed && G.Extras) G.Extras.placeTrap(this, it); }
        else if (cons.kind === 'special') { if (c.firePressed && G.Extras) G.Extras.useSpecial(this, it, r.o, r.d); }
        else if (c.firePressed) this.startUse();
        return;
      }
      if (this.tryFire(dt, eye, r.o, r.d)) {
        const w = I.WEAPONS[it.id];
        const k = c.aim ? 0.6 : 1;
        this.recoilP += w.recoil * k * (0.8 + Math.random() * 0.4);
        this.recoilY += (Math.random() - 0.5) * w.recoil * 0.6 * k;
        this.shake = Math.max(this.shake, w.cat === 'shotgun' || w.cat === 'sniper' ? 0.25 : w.cat === 'explosive' ? 0.3 : 0.06);
        G.HUD.crosshairKick();
      }
    }

    // ------------------------------------------------------------
    //  Caméra
    // ------------------------------------------------------------
    updateCamera(dt) {
      const cam = G.camera, S = G.Store.data.settings;
      // recul qui revient
      this.recoilP = U.damp(this.recoilP, 0, 7, dt);
      this.recoilY = U.damp(this.recoilY, 0, 7, dt);
      const yaw = this.camYaw + this.recoilY, pitch = this.camPitch + this.recoilP;
      let dist = 2.9, right = 0.62, up = 0.35, fov = S.fov;
      const w = this.curWeapon() ? I.WEAPONS[this.curWeapon().id] : null;
      const aiming = this.control.aim && w;
      if (this.state === 'skydive' || this.state === 'glide') { dist = 6.5; right = 0; up = 1.2; fov = S.fov + 6; }
      else if (this.state === 'hide') { dist = 4.6; right = 0; up = 0.9; }
      else if (this.state === 'zip') { dist = 4.2; right = 1.25; up = -0.1; fov = S.fov + 5; }
      else if (this.state === 'vehicle' && this.vehicle && this.vehicle.isBoar) { dist = 4.8; right = 0.3; up = 1.2; fov = S.fov + Math.min(10, this.vehicle.speed * 0.5); }
      else if (this.state === 'vehicle' && this.vehicle && this.vehicle.isMech) { dist = 10.5; right = 1.9; up = 4.4; fov = S.fov + 4; }
      else if (this.state === 'vehicle' && this.vehicle && this.vehicle.isTurret) { dist = 2.7; right = 0.95; up = 0.95; fov = S.fov - 6; }
      else if (this.state === 'vehicle' && this.vehicle && this.vehicle.isHeli) { dist = 12; right = 0; up = 3.4; fov = S.fov + 4 + Math.min(10, this.vehicle.speed * 0.2); }
      else if (this.state === 'vehicle' && this.vehicle && this.vehicle.isPlane) { dist = 13; right = 0; up = 3.2; fov = S.fov + 6 + Math.min(14, this.vehicle.speed * 0.2); }
      else if (this.state === 'vehicle') { dist = 7; right = 0; up = 1.6; fov = S.fov + Math.min(12, Math.abs(this.vehicle ? this.vehicle.speed : 0) * 0.4); }
      else if (this.buildMode) { dist = 3.3; right = 0.7; up = 0.5; }
      else if (aiming) { dist = w.scope ? 1.2 : 1.55; right = 0.58; up = 0.25; fov = S.fov / w.zoom; }
      else if (this.char.anim.sprint > 0.5) { dist = 3.2; fov = S.fov + 4; }
      if (this.slideT > 0 && !aiming) { fov = S.fov + 8; up = 0.2; }
      if (this.char.anim.emote || this.dead) { dist = 3.6; right = 0; up = 0.4; }
      if (this.swimming) { up = 0.8; }
      this.camDist = U.damp(this.camDist, dist, 10, dt);
      this.camRight = U.damp(this.camRight || right, right, 10, dt);
      this.camUp = U.damp(this.camUp || up, up, 10, dt);
      cam.fov = U.damp(cam.fov, fov, aiming ? 18 : 10, dt);
      cam.updateProjectionMatrix();
      // pivot
      const h = this.crouching ? 1.25 : 1.62;
      const pv = U.v1.set(this.pos.x, this.pos.y + h, this.pos.z);
      if (this.state === 'skydive' || this.state === 'glide') pv.y = this.pos.y + 1.0;
      if (this.state === 'hide' && this.hideSpot) pv.y = this.hideSpot.y + this.hideSpot.h + 0.7;
      const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
      // vecteurs réutilisables : la caméra tourne à chaque frame, y
      // allouer un Vector3 par frame pèse sur le ramasse-miettes
      const fwd = U.v2.set(-sy * cp, sp, -cy * cp);
      const rgt = U.v4.set(cy, 0, -sy);
      const upv = U.v5.crossVectors(rgt, fwd).normalize();
      const offs = U.v6.set(0, 0, 0).addScaledVector(fwd, -this.camDist).addScaledVector(rgt, this.camRight).addScaledVector(upv, this.camUp);
      const from = U.v7.copy(pv).addScaledVector(rgt, this.camRight * 0.5);
      // collision caméra
      const want = U.v8.copy(pv).add(offs);
      const d = U.v3.copy(want).sub(from); const L = d.length(); d.divideScalar(L);
      const hit = G.Phys.raycast(from.x, from.y, from.z, d.x, d.y, d.z, L + 0.3, { mask: 1, water: false });
      const camP = U.v8;
      if (hit) camP.copy(from).addScaledVector(d, Math.max(0.3, hit.t - 0.3));
      else camP.copy(want);
      if (camP.y < G.Terrain.height(camP.x, camP.z) + 0.3) camP.y = G.Terrain.height(camP.x, camP.z) + 0.3;
      // tremblement
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const sk = this.shake * this.shake * 0.5 + (G.Game.shakeAmt || 0);
      if (sk > 0.001) { camP.x += (Math.random() - 0.5) * sk; camP.y += (Math.random() - 0.5) * sk; camP.z += (Math.random() - 0.5) * sk; }
      cam.position.copy(camP);
      cam.rotation.set(pitch, yaw, 0, 'YXZ');
      this.camDistNow = camP.distanceTo(pv);
      // lunette de sniper
      G.HUD.setScope(aiming && w.scope && cam.fov < S.fov / 2);
      // masque le personnage si la caméra est dedans
      this.char.root.visible = !this.dead && this.state !== 'bus' && this.state !== 'hide' && this.camDistNow > 0.55 && !(aiming && w.scope && cam.fov < S.fov / 2);
    }

    update(dt) {
      // le personnage regarde toujours dans la direction de la caméra (sauf emote)
      if (!this.char.anim.emote || this.danceT > 0) { this.yaw = this.camYaw; }
      this.pitch = this.camPitch;
      super.update(dt);
      this.updateDash(dt);
      this.act(dt);
      // ramassage automatique des munitions, matériaux et lingots d'or
      this.autoPickT = (this.autoPickT || 0) - dt;
      if (this.autoPickT <= 0 && !this.dead && !this.downed && (this.state === 'ground' || this.state === 'lobby' || this.state === 'vehicle')) { this.autoPickT = 0.1; G.Loot.autoPickup(this); }
    }

    onDamaged(dmg, o) {
      this.char.anim.hit = 1;
      if (G.HUD) G.HUD.damageTaken(dmg, o);
      if (!o.storm) G.Audio.play('hurt', { vol: 0.5 });
      this.shake = Math.max(this.shake, 0.18);
      if (this.useT > 0 && !o.storm && o.by) { /* Fortnite n'interrompt pas les soins */ }
    }
    onKill(v) { G.Audio.play('elim'); if (G.HUD) G.HUD.eliminationBanner(v); }
    onChest() { if (G.Match) G.Match.challengeEvent('chest'); if (G.HUD) G.HUD.xpToast(60, 'Coffre ouvert'); }
    onEmote(id) {
      const it = G.Cosmetics.items[id];
      if (it && it.music) G.Audio.playMusic('emote_' + it.music, { vol: 0.8 });
      if (G.Match) G.Match.challengeEvent('emote', id);
    }
    onEmoteStop() { if (G.Audio.music && G.Audio.music.name.startsWith('emote_')) G.Audio.stopMusic(0.3); }
  }
  G.Player = Player;
})();
