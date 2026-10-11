// ============================================================
//  Acteur : personnage commun au joueur et aux bots
// ============================================================
(function () {
  const U = G.U, I = G.Items, P = G.Phys, CH = G.Char, CB = G.Combat;
  const GRAV = 24, JUMP = 8.3;
  const RUN = 6.0, SPRINT = 8.3, CROUCH = 3.2, ADS = 4.0, SWIM = 4.3;

  let _bGeo = null, _sGeo = null;
  const BALLOON_GEO = () => _bGeo || (_bGeo = new THREE.SphereGeometry(0.34, 12, 10));
  const STRING_GEO = () => _sGeo || (_sGeo = new THREE.CylinderGeometry(0.008, 0.008, 2.0, 3));
  class Actor {
    constructor(o) {
      this.isPlayer = !!o.isPlayer;
      this.isBot = !this.isPlayer;
      this.name = o.name || 'Joueur';
      this.cos = Object.assign({ skin: 'skin_recrue', back: 'back_none', pickaxe: 'pick_default', glider: 'glider_default', trail: 'trail_none', wrap: 'wrap_none', emotes: [] }, o.cos || {});
      this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
      this.yaw = 0; this.pitch = 0;
      this.radius = 0.36; this.height = 1.8; this.stepH = 0.6;
      this.control = { mx: 0, mz: 0, sprint: false, crouch: false, jump: false, fire: false, firePressed: false, aim: false };
      this.hitbox = { cx: 0, cy: 0, cz: 0, hx: 0, hy: 0, hz: 0, hr: 0.22, minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
      this.char = CH.build(this.cos.skin, { back: this.cos.back });
      this.char.root.visible = false;
      G.scene.add(this.char.root);
      this.heldModel = null; this.heldKey = null;
      this.glider = null;
      this.reset();
      CB.actors.push(this);
    }

    reset() {
      this.dead = false; this.state = 'lobby';
      this.slideT = 0; this.mantle = null; this.zip = null; this.hideSpot = null; this.zipCd = 0; this.lowGravT = 0; this.noFallT = 0; this.slowT = 0; this.dmgLog = []; this.dmgFromPlayer = 0; this.chicken = null;
      this.health = 100; this.shield = 0;
      this.slots = [null, null, null, null, null];
      this.sel = -1;
      this.ammo = { light: 0, medium: 0, heavy: 0, shells: 0, rockets: 0, arrows: 0 };
      this.drawT = 0;
      this.mats = { wood: 0, stone: 0, metal: 0 };
      this.gold = 0; this.sprayCd = 0; this.setBalloons(0); this.dashCd = 0; this.dashT = 0; this.overshield = 0; this.osT = 0;
      this.fireCd = 0; this.reloadT = 0; this.reloadTotal = 0; this.bloom = 0; this.burstLeft = 0; this.burstT = 0; this.spin = 0; this.lastShot = -9;
      this.useT = 0; this.useTotal = 0; this.useSlot = -1; this.slurp = 0; this.slurpT = 0;
      this.swingCd = 0; this.swingHitT = -1; this.weak = null;
      this.buildMode = false; this.buildType = 'wall'; this.buildMat = 'wood'; this.buildCd = 0;
      this.grounded = false; this.crouching = false; this.swimming = false; this.inWater = false;
      this.stormT = 0; this.danceT = 0; this.invulnerable = false; this.infiniteMats = false; this.infiniteAmmo = false;
      this.stats = { kills: 0, damage: 0, chests: 0, mats: 0, builds: 0, placement: 0, surviveT: 0 };
      this.lastAttacker = null; this.lastAttackTime = -99;
      this.gliderUsed = false; this.fallStartY = 0; this.airT = 0;
      this.impactVel = 0; this.stepPhase = 0;
      this.emoteId = null;
      if (this.char) { this.char.root.visible = true; this.char.anim.emote = null; this.char.anim.mode = 'ground'; }
      this.setGlider(false);
      this.refreshHeld();
    }

    hittable() { return !this.dead && this.state !== 'bus' && this.state !== 'spectate' && this.state !== 'hide'; }
    cur() { return this.sel >= 0 ? this.slots[this.sel] : null; }
    curWeapon() { const c = this.cur(); return c && I.WEAPONS[c.id] ? c : null; }

    // ---------------- inventaire ----------------
    equip(i) {
      if (i === this.sel && !this.buildMode) return;
      this.cancelUse();
      this.reloadT = 0; this.burstLeft = 0; this.spin = 0; this.drawT = 0; if (this.char) this.char.anim.draw = 0;
      this.sel = i;
      this.buildMode = false;
      this.fireCd = Math.max(this.fireCd, 0.25);
      const it = this.cur();
      if (it && I.WEAPONS[it.id] && it.ammo <= 0) this.autoReloadPending = true;
      this.refreshHeld();
      if (this.isPlayer || this.nearPlayer) G.Audio.play('equip', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1, this.pos.z], vol: 0.6 });
    }
    refreshHeld() {
      if (!this.char) return;
      const it = this.cur();
      let key = 'none', model = null, hold = 'none';
      if (this.downed || this.state === 'zip' || this.state === 'hide' || this.state === 'vehicle' || this.holster || this.emoteId) { /* mains vides (emote : on range l'arme) */ }
      else if (this.buildMode) { key = 'build'; hold = 'build'; }
      else if (this.sel < 0) { key = 'pick:' + this.cos.pickaxe; hold = 'melee'; }
      else if (it) {
        // le revêtement entre dans la clé : sans cela, changer de
        // revêtement en cours de partie ne rechargeait pas le modèle
        key = it.id + ':' + it.rarity + ':' + (this.cos.wrap || '');
        const w = I.WEAPONS[it.id];
        hold = w ? w.hold : 'item';
      }
      this.char.anim.hold = hold;
      if (key === this.heldKey) return;
      this.heldKey = key;
      if (this.heldModel) { this.heldModel.parent && this.heldModel.parent.remove(this.heldModel); this.heldModel = null; }
      if (key === 'build' || key === 'none') return;
      if (key.startsWith('pick:')) model = CH.pickaxeModel(this.cos.pickaxe);
      else if (I.WEAPONS[it.id]) model = G.WModels.weapon(it.id, it.rarity, this.cos.wrap);
      else { model = G.WModels.consumable(it.id); model.scale.setScalar(1.2); }
      if (key.startsWith('pick:')) { model.rotation.x = -Math.PI / 2; model.position.set(0, 0.05, 0); }
      else if (!I.WEAPONS[it.id]) { model.rotation.x = -Math.PI / 2; model.position.set(0, 0.02, 0.02); }
      this.char.J.weapon.add(model);
      model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.heldModel = model;
    }
    // Ajoute un objet ; renvoie true si tout a été pris
    takeItem(item, dropSwap) {
      const c = I.CONSUMABLES[item.id];
      if (c) {
        for (let i = 0; i < 5 && item.count > 0; i++) {
          const s = this.slots[i];
          if (s && s.id === item.id && s.count < c.stack) { const n = Math.min(item.count, c.stack - s.count); s.count += n; item.count -= n; }
        }
        if (item.count <= 0) { this.refreshHeld(); return true; }
      }
      for (let i = 0; i < 5; i++) if (!this.slots[i]) {
        this.slots[i] = item;
        if (this.sel < 0 && I.WEAPONS[item.id] && this.isBot) this.equip(i);
        this.refreshHeld();
        return true;
      }
      if (dropSwap) {
        const idx = this.sel >= 0 ? this.sel : 0;
        this.dropSlot(idx);
        this.slots[idx] = item;
        this.sel = idx;
        this.refreshHeld();
        return true;
      }
      return false;
    }
    dropSlot(i) {
      const it = this.slots[i];
      if (!it) return;
      this.slots[i] = null;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      G.Loot.spawnItem(it, this.pos.x + fx * 0.8, this.pos.y + 1, this.pos.z + fz * 0.8, fx * 2, 2, fz * 2);
      if (this.sel === i) { this.cancelUse(); this.reloadT = 0; }
      this.refreshHeld();
    }
    addMaterial(type, n) {
      const before = this.mats[type];
      this.mats[type] = Math.min(999, this.mats[type] + n);
      const got = this.mats[type] - before;
      this.stats.mats += got;
      if (this.isPlayer && got > 0 && G.HUD) G.HUD.matGain(type, got);
    }
    hasHeals() { return this.slots.some((s) => s && I.CONSUMABLES[s.id] && ['heal', 'shield', 'slurp', 'chug'].includes(I.CONSUMABLES[s.id].kind)); }

    // ---------------- armes ----------------
    canAct() { return !this.dead && this.danceT <= 0 && (this.state === 'ground' || this.state === 'lobby') && !this.swimming; }
    startReload() {
      const it = this.curWeapon();
      if (!it || this.reloadT > 0) return false;
      const w = I.WEAPONS[it.id];
      if (it.ammo >= w.mag) return false;
      if (!this.infiniteAmmo && (this.ammo[w.ammo] || 0) <= 0) return false;
      this.reloadTotal = (w.shellReload ? I.reloadTime(it) / w.mag : I.reloadTime(it)) * (this.aug && this.aug.agile ? 0.7 : 1);
      this.reloadT = this.reloadTotal;
      this.cancelUse();
      if (this.isPlayer || this.nearPlayer) G.Audio.play('reload', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1, this.pos.z] });
      return true;
    }
    updateReload(dt) {
      if (this.reloadT <= 0) return;
      const it = this.curWeapon();
      if (!it) { this.reloadT = 0; return; }
      const w = I.WEAPONS[it.id];
      this.reloadT -= dt;
      this.char.anim.reload = 1 - Math.max(0, this.reloadT) / this.reloadTotal;
      if (this.reloadT <= 0) {
        this.char.anim.reload = 0;
        if (w.shellReload) {
          if (this.infiniteAmmo || this.ammo[w.ammo] > 0) { it.ammo++; if (!this.infiniteAmmo) this.ammo[w.ammo]--; }
          if (this.isPlayer || this.nearPlayer) G.Audio.play('shell', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1, this.pos.z] });
          if (it.ammo < w.mag && (this.infiniteAmmo || this.ammo[w.ammo] > 0)) { this.reloadT = this.reloadTotal; }
        } else {
          const need = w.mag - it.ammo;
          const got = this.infiniteAmmo ? need : Math.min(need, this.ammo[w.ammo]);
          it.ammo += got; if (!this.infiniteAmmo) this.ammo[w.ammo] -= got;
          if (this.isPlayer || this.nearPlayer) G.Audio.play('reload_end', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1, this.pos.z] });
        }
      }
    }
    // Dispersion actuelle
    spreadNow(w) {
      const moving = Math.hypot(this.vel.x, this.vel.z) > 1.5;
      let s = w.spread + this.bloom;
      if (moving) s *= w.spreadMove;
      if (this.control.aim) s *= w.adsMul;
      if (this.crouching) s *= 0.75;
      if (!this.grounded && this.state !== 'lobby') s *= 2.2;
      else if (!this.grounded) s *= 2.2;
      // précision du premier tir
      // les bots faciles n'ont pas le bonus du premier tir et dispersent davantage
      const dl = this.isBot ? U.clamp(Math.round(this.diffLevel || 0), 0, 3) : 3;
      if (!moving && this.control.aim && G.Game && G.Game.time - this.lastShot > 0.6 && w.cat !== 'shotgun') s *= this.isBot ? [1, 0.45, 0.2, 0.1][dl] : 0.1;
      if (this.isBot) s *= [1.9, 1.25, 1, 1][dl];
      return s;
    }
    // tente de tirer : eye = origine réelle, aimO/aimD = rayon de visée
    tryFire(dt, eye, aimO, aimD) {
      const it = this.curWeapon();
      if (!it) return false;
      const w = I.WEAPONS[it.id];
      if (w.spinUp) {
        if (this.control.fire) this.spin = Math.min(w.spinUp, this.spin + dt); else this.spin = Math.max(0, this.spin - dt * 2);
        if (this.isPlayer) G.Audio.setLoop('minigun_spin', this.spin > 0 ? 0.25 : 0, 0, this.spin / w.spinUp);
        if (this.spin < w.spinUp) return false;
      }
      if (w.charge) {
        // arc : on bande la corde tant que le tir est maintenu, la flèche part au relâchement
        const busy = this.fireCd > 0 || this.reloadT > 0 || it.ammo <= 0;
        const holding = this.isPlayer ? this.control.fire : (this.drawT > 0 || this.control.fire || this.control.firePressed) && this.drawT < w.charge * U.rand(0.8, 1);
        if (busy) {
          if (it.ammo <= 0 && this.reloadT <= 0 && this.control.firePressed) { if (!this.startReload() && this.isPlayer) G.Audio.play('empty'); }
          if (this.drawT > 0) { this.drawT = 0; this.char.anim.draw = 0; G.WModels.bowPose(this.heldModel, 0); }
          return false;
        }
        if (holding) {
          if (this.drawT <= 0 && (this.isPlayer || this.nearPlayer)) G.Audio.play('bow_draw', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1.4, this.pos.z] });
          this.drawT = Math.min(w.charge, this.drawT + dt);
          this.char.anim.draw = this.drawT / w.charge;
          G.WModels.bowPose(this.heldModel, this.char.anim.draw);
          return false;
        }
        if (this.drawT < 0.1) { this.drawT = 0; this.char.anim.draw = 0; G.WModels.bowPose(this.heldModel, 0); return false; }
        this.chargeK = Math.min(1, this.drawT / w.charge);
        this.drawT = 0; this.char.anim.draw = 0; G.WModels.bowPose(this.heldModel, 0);
      } else {
      if (this.fireCd > 0) return false;
      const wantFire = w.auto ? this.control.fire : this.control.firePressed || (this.burstLeft > 0);
      if (!wantFire) return false;
      if (it.ammo <= 0 && !w.noAmmo) {
        if (this.reloadT <= 0 && !this.startReload() && this.control.firePressed && (this.isPlayer)) G.Audio.play('empty');
        return false;
      }
      if (this.reloadT > 0) {
        if (w.shellReload && it.ammo > 0) { this.reloadT = 0; this.char.anim.reload = 0; }
        else return false;
      }
      }
      // tir !
      this.cancelUse();
      if (!w.noAmmo) it.ammo--;
      if (w.melee) { this.char.anim.swing = 1; this.char.anim.swingT = 0.05; }
      const spread = this.spreadNow(w);
      const muzzle = this.muzzlePos();
      const r = CB.fireWeapon(this, it, eye, aimO, aimD, spread, muzzle);
      // pistolet à silex : le recul propulse le tireur
      if (w.knock && this.state === 'ground') {
        this.vel.x -= aimD.x * w.knock; this.vel.z -= aimD.z * w.knock;
        this.vel.y = Math.max(this.vel.y + 2, -aimD.y * w.knock * 0.95 + 3.5);
        this.grounded = false; this.flingT = 1.1; this.noFallT = Math.max(this.noFallT || 0, 1.2);
        if (this.isPlayer) G.Game.shakeAmt = Math.max(G.Game.shakeAmt || 0, 0.25);
        if (this.isPlayer || this.nearPlayer) G.FX.dust(this.pos.x, this.pos.y + 0.1, this.pos.z, 6, 0.8);
      }
      // bruit du tir (les bots curieux viennent voir)
      if (w.sound !== 'silenced' && !w.quiet) { const sh = CB.shots || (CB.shots = []); sh.push({ x: this.pos.x, z: this.pos.z, t: G.Game ? G.Game.time : 0, by: this }); if (sh.length > 40) sh.shift(); }
      this.bloom = Math.min(w.bloomMax, this.bloom + w.bloom);
      this.lastShot = G.Game ? G.Game.time : 0;
      if (w.burst) {
        if (this.burstLeft <= 0) this.burstLeft = w.burst - 1; else this.burstLeft--;
        this.fireCd = this.burstLeft > 0 ? w.burstDelay : 1 / w.rate;
      } else this.fireCd = 1 / w.rate;
      this.char.anim.fire = 1;
      this.stopEmote();
      // son + flash
      const loud = this.isPlayer || this.nearPlayer || true;
      if (loud && w.flame) { this.flameSnd = (this.flameSnd || 0) + 1; if (this.flameSnd % 3 === 1) G.Audio.play('flame', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1.4, this.pos.z] }); }
      else if (loud) G.Audio.play(w.sound, { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1.4, this.pos.z], noRack: it.ammo <= 0, vol: this.isPlayer ? 0.9 : 1 });
      if (muzzle && !w.melee && !w.flame && (this.isPlayer || this.nearPlayer)) G.FX.muzzle(muzzle.x, muzzle.y, muzzle.z, w.cat === 'shotgun' || w.cat === 'sniper' || w.cat === 'explosive', this.isPlayer);
      // douille éjectée sur le côté
      if (muzzle && w.cat !== 'explosive' && w.cat !== 'bow' && !w.melee && !w.flame && (this.isPlayer || this.distToCam < 30)) {
        const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
        G.FX.addDebris(muzzle.x - fx * 0.45, muzzle.y + 0.05, muzzle.z - fz * 0.45, rx * U.rand(1.5, 2.8) + fx * U.rand(-0.5, 0.5), U.rand(2, 3.5), rz * U.rand(1.5, 2.8) + fz * U.rand(-0.5, 0.5), w.cat === 'shotgun' ? 0.07 : 0.045, w.cat === 'shotgun' ? 0xc83030 : 0xd8a840, U.rand(0.8, 1.2));
      }
      if (this.heldModel && this.heldModel.userData.minigun) this.heldModel.rotation.z += 0.6;
      if (this.onFired) this.onFired(w, r);
      if (it.ammo <= 0 && !w.burst && !w.noAmmo) this.autoReloadPending = true;
      return true;
    }
    muzzlePos() {
      if (!this.heldModel || !this.char.root.visible) return null;
      const m = this.heldModel.userData.muzzle || 0.5;
      return this.heldModel.localToWorld(U.v3.set(0, 0.08, m)).clone();
    }

    // ---------------- pioche ----------------
    swing() {
      if (this.swingCd > 0) return false;
      this.swingCd = 0.55;
      this.swingHitT = 0.2;
      this.char.anim.swing = 1; this.char.anim.swingT = 0;
      if (this.isPlayer || this.nearPlayer) G.Audio.play('swing', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1, this.pos.z] });
      this.stopEmote();
      return true;
    }
    // Résolution de l'impact : origine + direction
    pickaxeHit(ox, oy, oz, dx, dy, dz, range) {
      const ah = CB.rayActors(ox, oy, oz, dx, dy, dz, range, this);
      let h = P.raycast(ox, oy, oz, dx, dy, dz, range, { mask: 6, ignore: null });
      if (!h) {
        // zone de frappe généreuse : rayons légèrement décalés
        const sx = -dz, sz = dx, sl = Math.hypot(sx, sz) || 1;
        const offs = [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3], [0.5, 0], [-0.5, 0]];
        for (const o of offs) {
          const px = ox + sx / sl * o[0], py = oy + o[1], pz = oz + sz / sl * o[0];
          const h2 = P.raycast(px, py, pz, dx, dy, dz, range, { mask: 6 });
          if (h2 && !h2.terrain) { h = h2; break; }
        }
      }
      if (ah && (!h || ah.t < h.t)) {
        CB.damageActor(ah.actor, 20, { by: this, weapon: 'pickaxe', point: [ox + dx * ah.t, oy + dy * ah.t, oz + dz * ah.t] });
        G.Audio.play('hit_wood', { pos: [ox + dx * ah.t, oy + dy * ah.t, oz + dz * ah.t], vol: 0.6 });
        return true;
      }
      if (!h) return false;
      const x = h.x, y = h.y, z = h.z;
      if (h.ent && !h.ent.dead && !h.ent.noPickaxe) {
        const e = h.ent;
        let crit = false;
        if (this.weak && this.weak.ent === e) {
          const d = Math.hypot(x - this.weak.x, y - this.weak.y, z - this.weak.z);
          if (d < 0.55) crit = true;
        }
        const dmg = crit ? 100 : 50;
        const mat = e.mat === 'glass' ? 'glass' : e.mat;
        W_damage(e, e.mat === 'glass' ? 99 : dmg, this, [x, y, z]);
        const sfx = mat === 'metal' ? 'hit_metal' : mat === 'stone' ? 'hit_stone' : 'hit_wood';
        G.Audio.play(sfx, { pos: [x, y, z] });
        if (crit) G.Audio.play('weakspot', { pos: this.isPlayer ? null : [x, y, z] });
        if (this.isPlayer || this.nearPlayer) G.FX.harvest(x, y, z, h.nx, h.ny, h.nz, mat, crit);
        if (this.isPlayer) G.FX.damageNumber(x, y, z, dmg, crit ? 'weak' : 'build');
        // nouveau point faible
        if (!e.dead && e.yield > 0) this.placeWeak(e, x, y, z, h.nx, h.ny, h.nz, ox, oy, oz);
        else this.clearWeak();
      } else {
        G.Audio.play(h.terrain ? 'hit_stone' : 'hit_wood', { pos: [x, y, z], vol: 0.4 });
        if (this.isPlayer) G.FX.impact(x, y, z, h.nx, h.ny, h.nz, 'dirt');
      }
      return true;
    }
    placeWeak(e, x, y, z, nx, ny, nz, ox, oy, oz) {
      // point aléatoire dans le plan de la surface, reprojeté sur l'objet
      const t1 = U.v1.set(nx, ny, nz);
      const a = Math.abs(ny) < 0.9 ? U.v2.set(0, 1, 0) : U.v2.set(1, 0, 0);
      const s = new THREE.Vector3().crossVectors(t1, a).normalize();
      const u = new THREE.Vector3().crossVectors(t1, s).normalize();
      for (let k = 0; k < 6; k++) {
        const r1 = U.rand(-0.8, 0.8), r2 = U.rand(-0.6, 0.8);
        const tx = x + s.x * r1 + u.x * r2, ty = y + s.y * r1 + u.y * r2, tz = z + s.z * r1 + u.z * r2;
        const dx = tx - ox, dy = ty - oy, dz = tz - oz, l = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const h = P.raycast(ox, oy, oz, dx / l, dy / l, dz / l, l + 1.5, { mask: 6 });
        if (h && h.ent === e) {
          this.weak = { ent: e, x: h.x, y: h.y, z: h.z };
          if (this.isPlayer) G.FX.showWeak(h.x, h.y, h.z, h.nx, h.ny, h.nz);
          return;
        }
      }
      this.weak = { ent: e, x, y, z };
      if (this.isPlayer) G.FX.showWeak(x, y, z, nx, ny, nz);
    }
    clearWeak() { this.weak = null; if (this.isPlayer) G.FX.hideWeak(); }

    // ---------------- soins ----------------
    canUse(it) {
      const c = I.CONSUMABLES[it.id];
      if (!c) return false;
      if (c.kind === 'heal') return this.health < c.cap;
      if (c.kind === 'shield') return this.shield < c.cap;
      if (c.kind === 'slurp' || c.kind === 'chug') return this.health < 100 || this.shield < 100;
      if (c.kind === 'fish') return this.health < 100 || (c.shield && this.shield < 100);
      if (c.kind === 'hop') return true;
      if (c.kind === 'balloon') return (this.balloons || 0) < 3 && this.state === 'ground';
      if (c.kind === 'key') return false;
      return true;
    }
    startUse() {
      const it = this.cur();
      if (!it || !I.CONSUMABLES[it.id] || this.useT > 0) return false;
      const c = I.CONSUMABLES[it.id];
      if (c.kind === 'throw' || c.kind === 'trap' || c.kind === 'jetpack') return false;
      if (!this.canUse(it)) { if (this.isPlayer && G.HUD) G.HUD.notify(c.kind === 'balloon' ? 'Déjà 3 ballons !' : c.kind === 'shield' ? 'Bouclier déjà au maximum' : 'Santé déjà au maximum', 1.5); return false; }
      this.useT = c.time * (this.aug && this.aug.pharma && c.kind !== 'balloon' ? 0.6 : 1); this.useTotal = this.useT; this.useSlot = this.sel;
      this.char.anim.heal = 1;
      const n = Math.max(1, Math.round(c.time / 0.45));
      if (this.isPlayer || this.nearPlayer) G.Audio.play(c.sound, { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1, this.pos.z], n: Math.min(n, 10) });
      return true;
    }
    cancelUse() { if (this.useT > 0) { this.useT = 0; this.char.anim.heal = 0; } }
    updateUse(dt) {
      if (this.useT > 0) {
        if (this.sel !== this.useSlot) { this.cancelUse(); return; }
        this.useT -= dt;
        const it = this.slots[this.useSlot];
        if (!it) { this.cancelUse(); return; }
        const c = I.CONSUMABLES[it.id];
        if ((this.isPlayer || this.nearPlayer) && Math.random() < dt * 8) G.FX.healParticles(this.pos.x, this.pos.y, this.pos.z, c.kind === 'shield');
        if (this.useT <= 0) {
          this.useT = 0; this.char.anim.heal = 0;
          if (c.kind === 'heal') this.health = Math.min(c.cap, this.health + c.hp);
          else if (c.kind === 'shield') this.shield = Math.min(c.cap, Math.max(this.shield, Math.min(c.cap, this.shield + c.shield)));
          else if (c.kind === 'slurp') this.slurp += c.total;
          else if (c.kind === 'chug') { this.health = 100; this.shield = 100; }
          else if (c.kind === 'hop') { this.lowGravT = 30; if (this.isPlayer) G.HUD.notify('GRAVITÉ RÉDUITE ! (30 s)', 2); }
          else if (c.kind === 'balloon') { this.setBalloons((this.balloons || 0) + 1); this.balloonT = 25; if (this.balloons >= 2) { this.grounded = false; this.vel.y = Math.max(this.vel.y, 2); } }
          else if (c.kind === 'fish') { this.health = Math.min(100, this.health + c.hp); if (c.shield) this.shield = Math.min(100, this.shield + c.shield); }
          if (this.isPlayer || this.nearPlayer) G.Audio.play(c.kind === 'shield' ? 'shield_done' : 'heal_done', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1, this.pos.z] });
          it.count--;
          if (it.count <= 0) { this.slots[this.useSlot] = null; this.sel = this.firstWeaponSlot(); this.refreshHeld(); }
        }
      }
      if (this.slurp > 0) {
        this.slurpT += dt;
        while (this.slurpT >= 0.5 && this.slurp > 0) {
          this.slurpT -= 0.5; this.slurp--;
          if (this.health < 100) this.health++; else if (this.shield < 100) this.shield++; else this.slurp = 0;
        }
      }
    }
    firstWeaponSlot() { for (let i = 0; i < 5; i++) if (this.slots[i] && I.WEAPONS[this.slots[i].id]) return i; return -1; }

    // Lancer (grenades, bombes boogie) et pièges
    throwItem(dx, dy, dz) {
      const it = this.cur();
      if (!it) return false;
      const c = I.CONSUMABLES[it.id];
      if (!c || c.kind !== 'throw' || this.fireCd > 0) return false;
      const e = this.eyePos();
      CB.throwGrenade(this, c, e.x + dx * 0.5, e.y + dy * 0.5, e.z + dz * 0.5, dx, dy, dz, 20);
      G.Audio.play('throw', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y + 1, this.pos.z] });
      this.char.anim.swing = 1; this.char.anim.swingT = 0.12;
      this.fireCd = 0.8;
      it.count--;
      if (it.count <= 0) { this.slots[this.sel] = null; this.sel = this.firstWeaponSlot(); this.refreshHeld(); }
      return true;
    }

    eyePos() { return U.v2.set(this.pos.x, this.pos.y + (this.crouching ? 1.15 : 1.6), this.pos.z).clone(); }

    // ---------------- dégâts / mort ----------------
    die(killer, o) {
      if (this.vehicle) G.Extras.exitKart(this);
      if (this.hideSpot) G.Extras2.exitHide(this);
      if (this.zip) G.Extras2.exitZip(this, false);
      const wasBus = this.state === 'bus';
      this.dead = true;
      this.state = 'dead';
      this.cancelUse(); this.clearWeak();
      this.buildMode = false;
      this.stopEmote();
      const p = this.pos;
      // éjection du loot
      const drops = [];
      for (let i = 0; i < 5; i++) if (this.slots[i]) { drops.push({ kind: 'item', item: this.slots[i] }); this.slots[i] = null; }
      for (const t in this.ammo) if (this.ammo[t] > 0) { drops.push({ kind: 'ammo', type: t, amount: this.ammo[t] }); this.ammo[t] = 0; }
      for (const t in this.mats) if (this.mats[t] > 0) { drops.push({ kind: 'mat', type: t, amount: this.mats[t] }); this.mats[t] = 0; }
      if (this.gold > 0) { drops.push({ kind: 'gold', type: 'gold', amount: this.gold }); this.gold = 0; }
      if (G.Medal && this.medals && this.medals.length) G.Medal.onDeath(this);
      if (!wasBus && !o.noDrop) G.Loot.spill(drops, p.x, Math.max(p.y, G.Terrain.height(p.x, p.z)), p.z, 1);
      if (this.char.root.visible) {
        G.FX.eliminate(p.x, p.y, p.z, CH.mainColor(this.char));
        G.Audio.play('eliminated_fx', { pos: [p.x, p.y + 1, p.z] });
      }
      this.char.root.visible = false;
      this.setGlider(false);
      if (this.onDeath) this.onDeath(killer, o);
    }
    forceDance(t) {
      this.danceT = t;
      this.char.anim.emote = 'emote_danse'; this.char.anim.emoteT = 0;
      this.cancelUse(); this.reloadT = 0;
    }
    playEmote(id) {
      if (!id || this.state !== 'ground' && this.state !== 'lobby') return;
      this.char.anim.emote = id; this.char.anim.emoteT = 0;
      this.emoteId = id;
      this.cancelUse();
      this.refreshHeld();
      if (this.onEmote) this.onEmote(id);
    }
    stopEmote() {
      if (this.danceT > 0) return;
      if (this.char.anim.emote) { this.char.anim.emote = null; this.emoteId = null; this.refreshHeld(); if (this.onEmoteStop) this.onEmoteStop(); }
    }

    // ---------------- planeur ----------------
    setGlider(on) {
      if (on && !this.glider) {
        this.glider = CH.gliderModel(this.cos.glider);
        this.glider.position.set(0, 1.9, 0);
        this.char.root.add(this.glider);
        this.gliderOpenT = 0;
      } else if (!on && this.glider) {
        this.char.root.remove(this.glider);
        this.glider = null;
      }
    }

    // ------------------------------------------------------------
    //  Mise à jour
    // ------------------------------------------------------------
    update(dt) {
      if (this.dead) return;
      // filet de sécurité : jamais de position / orientation invalide
      if (!isFinite(this.pos.x + this.pos.y + this.pos.z) || !isFinite(this.vel.x + this.vel.y + this.vel.z) || !isFinite(this.yaw)) {
        if (this.lastGood) this.pos.copy(this.lastGood); else this.pos.set(0, 60, 0);
        this.vel.set(0, 0, 0); if (!isFinite(this.yaw)) this.yaw = 0; if (!isFinite(this.pitch)) this.pitch = 0;
        this.mantle = null; this.slideT = 0;
      } else (this.lastGood || (this.lastGood = new THREE.Vector3())).copy(this.pos);
      const c = this.control;
      this.fireCd = Math.max(0, this.fireCd - dt);
      if (this.noFallT > 0 && this.grounded && this.state === 'ground') this.noFallT = Math.max(0, this.noFallT - dt * 0.2);
      // carburant du jetpack : se recharge au sol, flammes quand on vole
      { const jp = this.slots.find((s) => s && s.id === 'jetpack'); if (jp) { if (jp.fuel == null) jp.fuel = 100; if (this.grounded && !(this.jetT > 0)) jp.fuel = Math.min(100, jp.fuel + 18 * dt); } }
      if (this.jetT > 0) {
        this.jetT -= dt;
        if (this.isPlayer || this.distToCam < 60) { const bx = this.pos.x + Math.sin(this.yaw) * 0.3, bz = this.pos.z + Math.cos(this.yaw) * 0.3; for (let k = 0; k < 2; k++) G.FX.glow.spawn(bx + U.rand(-0.12, 0.12), this.pos.y + 0.9, bz + U.rand(-0.12, 0.12), U.rand(-0.3, 0.3), U.rand(-5, -3), U.rand(-0.3, 0.3), 1, U.rand(0.4, 0.7), 0.1, 0.3, 0.3, 0, 1); if (Math.random() < 0.3) G.FX.smoke.spawn(bx, this.pos.y + 0.6, bz, 0, -1, 0, 0.6, 0.6, 0.6, 0.6, 0.8, -0.2, 1, 1.5); }
        if (this.isPlayer) G.Audio.setLoop('engine', 0.3, 0, 1.2);
        else if (this.isPlayer === false) {}
        if (this.jetT <= 0 && this.isPlayer) G.Audio.setLoop('engine', 0);
      }
      if (this.balloons > 0) {
        this.balloonT -= dt;
        if (this.balloonG) { const t = G.Game ? G.Game.time : 0; this.balloonG.children.forEach((b, i) => { b.rotation.z = (i - 1) * 0.28 + Math.sin(t * 1.7 + i) * 0.08; }); }
        if (this.balloonT <= 0 || this.state !== 'ground' || this.swimming) { this.popBalloon(); this.balloonT = 3; if (this.state !== 'ground') { this.setBalloons(0); } }
      }
      if (this.lowGravT > 0) {
        this.lowGravT -= dt;
        if ((this.isPlayer || this.nearPlayer) && Math.random() < dt * 12) G.FX.glow.spawn(this.pos.x + U.rand(-0.3, 0.3), this.pos.y + U.rand(0.2, 1.6), this.pos.z + U.rand(-0.3, 0.3), 0, U.rand(0.2, 0.8), 0, 0.6, 0.3, 1, 0.1, 0.6, 0, 0.5);
        if (this.lowGravT <= 0 && this.isPlayer) G.HUD.notify('Fin de la gravité réduite', 1.5);
      }
      this.swingCd = Math.max(0, this.swingCd - dt);
      this.buildCd = Math.max(0, this.buildCd - dt);
      const w = this.curWeapon() ? I.WEAPONS[this.curWeapon().id] : null;
      this.bloom = Math.max(0, this.bloom - dt * (w ? w.bloomMax * 2.2 : 1));
      if (this.danceT > 0) { this.danceT -= dt; if (this.danceT <= 0) { this.char.anim.emote = null; this.emoteId = null; this.refreshHeld(); } }
      switch (this.state) {
        case 'bus': this.updateBus(dt); return;
        case 'skydive': this.updateSkydive(dt); break;
        case 'glide': this.updateGlide(dt); break;
        case 'vehicle': G.Extras.updateRider(this, dt); break;
        case 'hide': G.Extras2.updateHidden(this, dt); break;
        case 'zip': G.Extras2.updateZip(this, dt); break;
        default: this.updateGround(dt);
      }
      // coup de pioche : impact retardé
      if (this.swingHitT > 0) {
        this.swingHitT -= dt;
        if (this.swingHitT <= 0 && this.pendingSwing) { const s = this.pendingSwing; this.pickaxeHit(s[0], s[1], s[2], s[3], s[4], s[5], s[6]); this.pendingSwing = null; }
      }
      this.updateReload(dt);
      this.updateUse(dt);
      if (this.autoReloadPending && this.fireCd <= 0 && this.reloadT <= 0) { this.autoReloadPending = false; this.startReload(); }
      this.updateStorm(dt);
      this.stats.surviveT += dt;
    }

    updateBus(dt) {
      this.char.root.visible = false;
    }

    updateGround(dt) {
      const c = this.control;
      const p = this.pos, v = this.vel;
      // escalade d'un rebord en cours
      if (this.mantle) {
        const m = this.mantle;
        m.t += dt;
        const k = Math.min(1, m.t / m.dur);
        const ky = Math.min(1, k / 0.6), kf = Math.max(0, (k - 0.35) / 0.65);
        p.y = U.lerp(m.y0, m.y1, 1 - (1 - ky) * (1 - ky));
        p.x = U.lerp(m.x0, m.x1, kf); p.z = U.lerp(m.z0, m.z1, kf);
        v.set(0, 0, 0);
        const an = this.char.anim;
        an.mode = 'mantle'; an.mantleK = k; an.speed = 0; an.grounded = false;
        c.jump = false;
        if (k >= 1) { this.mantle = null; this.grounded = true; this.airT = 0; an.mode = 'ground'; }
        return;
      }
      // eau
      const th = G.Terrain.height(p.x, p.z);
      const depth = -th;
      const wasSwim = this.swimming;
      this.swimming = depth > 1.3 && p.y < -1.0;
      if (this.swimming && !wasSwim) { G.FX.waterSplash(p.x, p.z, v.y < -8); if (this.isPlayer || this.nearPlayer) G.Audio.play('splash', { pos: [p.x, 0, p.z] }); this.cancelUse(); this.buildMode = false; }
      // glissade (sprint + accroupi)
      const crouchIn = !!c.crouch;
      const hsNow = Math.hypot(v.x, v.z);
      if (crouchIn && !this.prevCrouchIn && this.grounded && hsNow > 5.5 && !this.swimming && !this.downed && this.useT <= 0 && !(this.slideT > 0)) {
        this.slideT = 1.0; this.slideDist = 0;
        const k = Math.max(hsNow, 10) / hsNow; v.x *= k; v.z *= k;
        this.stopEmote();
        if (this.isPlayer || this.nearPlayer) G.Audio.play('slide', { pos: this.isPlayer ? null : [p.x, p.y, p.z] });
      }
      this.prevCrouchIn = crouchIn;
      const sliding = this.slideT > 0;
      // crouch
      this.crouching = (c.crouch || this.downed || sliding) && !this.swimming;
      const targetH = this.crouching ? 1.25 : 1.8;
      if (targetH > this.height && !P.freeAt(p.x, p.y + 0.05, p.z, this.radius - 0.05, targetH - 0.05)) { /* reste accroupi sous un plafond */ this.crouching = true; }
      else this.height = targetH;
      // vitesse
      let speed = RUN;
      const moving = Math.abs(c.mx) + Math.abs(c.mz) > 0.01;
      const sprinting = c.sprint && c.mz > 0.3 && !c.aim && !this.crouching && this.useT <= 0 && this.reloadT <= 0;
      if (sprinting) speed = SPRINT * (this.aug && this.aug.sprint ? 1.12 : 1);
      if (this.crouching) speed = CROUCH;
      if (c.aim) speed = ADS;
      if (this.swimming) speed = SWIM;
      if (c.mz < -0.3 && !sprinting) speed *= 0.9;
      if (this.danceT > 0) speed *= 0.3;
      if (this.downed) speed = 1.7;
      if (this.slowT > 0) { speed *= 0.5; this.slowT -= dt; }
      // Outils admin (F4). Nuls pour un joueur normal : le drapeau
      // n'est posé que par un administrateur, et remis à zéro ici si
      // les droits ont disparu en cours de partie.
      const dev = G.Server && G.Server.canDev() ? G.Server.dev() : null;
      if (dev && dev.speed) speed *= 1.9;
      if (dev && dev.fly) {
        speed *= 2.4;
        this.flyT = Math.max(this.flyT || 0, 0.15);
      } else if (this.flyT > 0) this.flyT -= dt;
      if (dev && dev.noclip) this.noclipT = Math.max(this.noclipT || 0, 0.15);
      else if (this.noclipT > 0) this.noclipT -= dt;
      // lu par P.moveCharacter pour laisser passer les obstacles
      this.noclip = !!(dev && dev.noclip);
      this.char.anim.sprint = U.damp(this.char.anim.sprint, sprinting ? 1 : 0, 8, dt);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      let wx = fx * c.mz + rx * c.mx, wz = fz * c.mz + rz * c.mx;
      const wl = Math.hypot(wx, wz);
      if (wl > 1) { wx /= wl; wz /= wl; }
      const accel = this.grounded || this.swimming ? 12 : this.flingT > 0 ? 0.3 : 2.2;
      if (this.flingT > 0) this.flingT = this.grounded ? 0 : this.flingT - dt;
      const grappling = this.grapple && G.Extras.updateGrapple(this, dt);
      if (sliding && !grappling) {
        // pente : on accélère en descente
        const e = 1.2;
        const gx = -(G.Terrain.height(p.x + e, p.z) - G.Terrain.height(p.x - e, p.z)) / (2 * e);
        const gz = -(G.Terrain.height(p.x, p.z + e) - G.Terrain.height(p.x, p.z - e)) / (2 * e);
        const onTerrain = !this.groundCol;
        if (this.grounded && onTerrain) { v.x += gx * 16 * dt; v.z += gz * 16 * dt; }
        const fr = Math.exp(-(this.grounded ? 1.15 : 0.2) * dt); v.x *= fr; v.z *= fr;
        v.x += wx * 3 * dt; v.z += wz * 3 * dt;
        let hs = Math.hypot(v.x, v.z);
        if (hs > 17) { v.x *= 17 / hs; v.z *= 17 / hs; hs = 17; }
        const downhill = onTerrain && (v.x * gx + v.z * gz) > 0.06 * hs;
        this.slideT -= dt * (downhill ? 0.2 : 1);
        this.slideDist += hs * dt;
        if (!crouchIn || hs < 3.2 || (!this.grounded && this.airT > 0.5) || c.aim && hs < 6) this.slideT = 0;
        if ((this.isPlayer || this.nearPlayer) && this.grounded && Math.random() < dt * 25) G.FX.smoke.spawn(p.x + U.rand(-0.3, 0.3), p.y + 0.1, p.z + U.rand(-0.3, 0.3), -v.x * 0.1, 0.4, -v.z * 0.1, 0.8, 0.75, 0.65, 0.6, 0.6, 0, 1.5, 1.5);
        if (this.slideT <= 0) { this.slideT = 0; if (this.isPlayer && G.Match) G.Match.challengeEvent('slide', Math.round(this.slideDist)); }
      } else if (!grappling) {
        v.x = U.damp(v.x, wx * speed, accel, dt);
        v.z = U.damp(v.z, wz * speed, accel, dt);
      }
      if (this.swimming) {
        v.y = U.damp(v.y, 0, 6, dt);
        p.y = U.damp(p.y, -1.25, 5, dt);
        if (c.jump && this.isPlayer) { /* petit élan */ }
        this.grounded = false;
        P.moveCharacter(this, dt);
        if (p.y > -1.0 && this.grounded) this.swimming = false;
        this.char.anim.mode = 'swim';
      } else {
        const jumped = c.jump && this.grounded && this.danceT <= 0 && !this.downed;
        if (jumped) {
          v.y = JUMP * (this.lowGravT > 0 ? 1.35 : 1) * (this.aug && this.aug.aerien ? 1.12 : 1); this.grounded = false; this.stopEmote();
          if (this.slideT > 0) { this.slideT = 0; if (this.isPlayer && G.Match) G.Match.challengeEvent('slide', Math.round(this.slideDist)); }
          if (this.isPlayer || this.nearPlayer) G.Audio.play('jump', { pos: this.isPlayer ? null : [p.x, p.y, p.z] });
        }
        // poule portée : on bat des ailes en l'air et on plane
        if (this.chicken) { this.flapCd = Math.max(0, (this.flapCd || 0) - dt); if (c.jump && !this.grounded && this.flapCd <= 0) { v.y = Math.max(v.y, 6.5); this.flapCd = 0.45; } }
        const nb = this.balloons || 0;
        // jetpack : poussée verticale
        const jit = this.jetHold ? this.cur() : null;
        if (jit && jit.id === 'jetpack') {
          if (jit.fuel == null) jit.fuel = 100;
          if (jit.fuel > 0) {
            v.y = Math.min(v.y + 38 * dt, 9); this.grounded = false; jit.fuel = Math.max(0, jit.fuel - 24 * dt);
            this.noFallT = Math.max(this.noFallT || 0, 0.6); this.jetT = 0.12;
          }
        }
        if (nb >= 3) v.y = U.damp(v.y, 3.2, 1.5, dt);
        else if (nb === 2) v.y = U.damp(v.y, this.grounded ? 0 : -0.4, 1.5, dt);
        else if (!grappling && this.flyT <= 0) v.y -= GRAV * (this.lowGravT > 0 ? 0.45 : 1) * (nb === 1 ? 0.3 : 1) * (this.chicken && v.y < 0 ? 0.16 : 1) * dt;
        // vol admin : la gravité est suspendue, Espace / Ctrl pilotent Y
        if (this.flyT > 0 && this.flyUp) v.y = this.flyUp * 12;
        if (nb === 1 && v.y < -5) v.y = -5;
        if (nb >= 2 && jumped) { v.y = 5; }
        if (this.chicken && v.y < -3.5) v.y = -3.5;
        if (v.y < -55) v.y = -55;
        if (grappling) this.impactVel = 0;
        const wasG = this.grounded;
        const yBefore = p.y;
        this.impactVel = 0;
        P.moveCharacter(this, dt);
        // escalade : on pousse vers un rebord en sautant
        if (this.blocked && (c.mz > 0.5 || jumped) && (jumped || !this.grounded) && !this.downed && !this.crouching && this.state === 'ground') this.tryMantle();
        if (this.grounded && !wasG) this.onLand();
        if (!this.grounded) this.airT += dt; else this.airT = 0;
        this.char.anim.mode = this.downed ? 'down' : this.slideT > 0 && this.grounded ? 'slide' : 'ground';
        // bloqué par une porte : ouverture auto pour les bots
        if (this.blocked && this.isBot) this.tryOpenDoor();
      }
      if (c.jump) c.jump = false;
      // animation
      const hs = Math.hypot(v.x, v.z);
      const a = this.char.anim;
      a.speed = hs; a.grounded = this.grounded; a.vy = v.y;
      a.crouch = U.damp(a.crouch, this.crouching ? 1 : 0, 12, dt);
      a.aim = U.damp(a.aim, c.aim ? 1 : 0, 14, dt);
      a.pitch = this.pitch;
      if (hs > 0.3) a.moveAng = U.angleDiff(Math.atan2(-fx, -fz), Math.atan2(-v.x, -v.z)) * -1;
      if (moving || !this.grounded) this.stopEmote();
      if (a.emote && CH.emoteDone(this.char)) this.stopEmote();
      // pas
      if (this.grounded && hs > 1 && !this.swimming) {
        const prev = this.stepPhase;
        this.stepPhase = a.phase;
        if (Math.floor(prev / Math.PI) !== Math.floor(this.stepPhase / Math.PI)) this.footstep(hs);
      } else if (this.swimming && hs > 1 && Math.random() < dt * 3) this.footstep(hs);
    }
    tryMantle() {
      const p = this.pos;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const px = p.x + fx * (this.radius + 0.45), pz = p.z + fz * (this.radius + 0.45);
      const top = P.supportAt(px, pz, p.y + 2.3, 0.2, 0);
      const hh = top - p.y;
      if (hh < 0.7 || hh > 2.3) return false;
      if (!P.freeAt(px, top + 0.03, pz, this.radius - 0.05, 1.75)) return false;
      if (!P.freeAt(p.x, p.y + 0.3, p.z, this.radius - 0.12, hh + 1.5)) return false;
      this.mantle = { t: 0, dur: 0.26 + hh * 0.1, x0: p.x, y0: p.y, z0: p.z, x1: px, y1: top + 0.02, z1: pz };
      this.slideT = 0;
      if (this.isPlayer || this.nearPlayer) G.Audio.play('mantle', { pos: this.isPlayer ? null : [p.x, p.y, p.z] });
      return true;
    }
    onLand() {
      const iv = -this.impactVel;
      if (this.lowGravT > 0 || this.chicken || this.balloons > 0) { if (iv > 6 && (this.isPlayer || this.nearPlayer)) G.Audio.play('land', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y, this.pos.z], v: 0.7 }); return; }
      if (this.noFallT > 0) { this.noFallT = 0; if (iv > 8 && (this.isPlayer || this.nearPlayer)) G.Audio.play('land', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y, this.pos.z], v: 1 }); return; }
      if (iv > 17 && this.state !== 'lobby' && !(this.aug && this.aug.aerien)) {
        const dmg = Math.round((iv - 17) * 6.5);
        CB.damageActor(this, dmg, { fall: true, by: null });
        if (this.isPlayer || this.nearPlayer) G.Audio.play('fall_damage', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y, this.pos.z] });
      } else if (iv > 6 && (this.isPlayer || this.nearPlayer)) G.Audio.play('land', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y, this.pos.z], v: Math.min(1.2, iv / 12) });
      if (iv > 8) { this.char.anim.land = Math.min(1, iv / 20); if (this.isPlayer || this.nearPlayer) G.FX.dust(this.pos.x, this.pos.y, this.pos.z, 8, 0.8); }
    }
    footstep(hs) {
      if (!(this.isPlayer || this.nearPlayer)) return;
      const L = G.Audio.listener;
      if (!this.isPlayer && Math.hypot(this.pos.x - L.x, this.pos.z - L.z) > 40) return;
      let surf;
      if (this.swimming) surf = 'water';
      else if (this.groundCol && this.groundCol.ent) surf = this.groundCol.ent.mat === 'stone' ? 'stone' : this.groundCol.ent.mat === 'metal' ? 'metal' : 'wood';
      else surf = G.Terrain.surface(this.pos.x, this.pos.z);
      G.Audio.play('step', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y, this.pos.z], surface: surf, vol: (this.isPlayer ? 0.55 : 1) * U.clamp(hs / 7, 0.4, 1) * (this.crouching ? 0.4 : 1) });
    }
    tryOpenDoor() {
      for (const d of G.Arch.doors) {
        if (d.dead || d.door.target > 0.5) continue;
        if (Math.hypot(d.pos.x - this.pos.x, d.pos.z - this.pos.z) < 1.8) { G.Arch.toggleDoor(d, this.pos); return true; }
      }
      return false;
    }

    // ---------------- chute libre ----------------
    startSkydive(x, y, z, vx, vz) {
      this.state = 'skydive';
      this.pos.set(x, y, z); this.vel.set(vx || 0, -5, vz || 0); this.grounded = false;
      this.char.root.visible = true;
      this.char.anim.mode = 'skydive';
      this.gliderUsed = false;
      this.buildMode = false;
      this.refreshHeld();
    }
    groundBelow() { return Math.max(0, P.groundAt(this.pos.x, this.pos.z, this.pos.y, 0.3, 0)); }
    updateSkydive(dt) {
      const c = this.control, p = this.pos, v = this.vel;
      const dive = U.clamp((-this.pitch - 0.35) / 0.9, 0, 1) * (c.mz > 0 ? 1 : 0.5);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const hspd = 15 * (1 - dive * 0.35);
      const wx = (fx * c.mz + rx * c.mx) * hspd, wz = (fz * c.mz + rz * c.mx) * hspd;
      v.x = U.damp(v.x, wx, 1.5, dt); v.z = U.damp(v.z, wz, 1.5, dt);
      if (v.y > 0) v.y -= 13 * dt; // propulsé (tremplin) : montée balistique
      else v.y = U.damp(v.y, -(24 + dive * 22), 1.2, dt);
      this.grounded = false;
      P.moveCharacter(this, dt);
      const a = this.char.anim;
      a.mode = 'skydive'; a.dive = U.damp(a.dive, dive, 4, dt);
      const hAbove = p.y - this.groundBelow();
      if ((c.jump && hAbove < 220 && v.y < 8) || (hAbove < 75 && v.y < 0) || this.grounded) this.openGlider();
      c.jump = false;
      this.trail(dt);
    }
    openGlider() {
      if (this.grounded) { this.state = this.inLobby ? 'lobby' : 'ground'; this.char.anim.mode = 'ground'; this.refreshHeld(); return; }
      this.state = 'glide';
      this.setGlider(true);
      this.char.anim.mode = 'glide';
      if (this.isPlayer || this.nearPlayer) G.Audio.play('glider_open', { pos: this.isPlayer ? null : [this.pos.x, this.pos.y, this.pos.z] });
    }
    updateGlide(dt) {
      const c = this.control, p = this.pos, v = this.vel;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const fwd = 10 + Math.max(0, c.mz) * 7 - Math.max(0, -c.mz) * 5;
      const wx = fx * fwd + rx * c.mx * 6, wz = fz * fwd + rz * c.mx * 6;
      v.x = U.damp(v.x, wx, 1.6, dt); v.z = U.damp(v.z, wz, 1.6, dt);
      v.y = U.damp(v.y, c.mz < -0.3 ? -5.5 : -7.2, 2.5, dt);
      this.grounded = false;
      P.moveCharacter(this, dt);
      const a = this.char.anim;
      a.mode = 'glide'; a.bank = U.damp(a.bank || 0, -c.mx * 0.25, 4, dt);
      if (this.glider) { this.gliderOpenT += dt; const k = Math.min(1, this.gliderOpenT * 4); this.glider.scale.set(k, k, k); this.glider.rotation.z = a.bank * 0.8; }
      if (this.grounded || p.y < -1.0) {
        this.state = this.inLobby ? 'lobby' : 'ground'; this.setGlider(false); this.char.anim.mode = 'ground';
        this.refreshHeld();
        if (this.isPlayer || this.nearPlayer) { G.Audio.play('land', { pos: this.isPlayer ? null : [p.x, p.y, p.z] }); G.FX.dust(p.x, p.y, p.z, 10, 1); }
        if (this.onLanded) this.onLanded();
      }
      this.trail(dt);
    }
    trail(dt) {
      const tr = G.Cosmetics.items[this.cos.trail];
      if (!tr || !tr.colors || !(this.isPlayer || this.nearPlayer)) return;
      const J = this.char.J;
      if (Math.random() < 0.8) {
        for (const h of [J.handL, J.handR, J.ftL, J.ftR]) {
          const wp = h.getWorldPosition(U.v1);
          const col = tr.colors[Math.floor(Math.random() * tr.colors.length)];
          G.FX.trail(wp.x, wp.y, wp.z, col[0], col[1], col[2], 0.22, 0.7);
        }
      }
    }

    // ---------------- tempête ----------------
    // Ballons attachés au personnage
    setBalloons(n) {
      n = Math.max(0, Math.min(3, n));
      this.balloons = n;
      if (!this.char) return;
      if (!this.balloonG) {
        if (n === 0) return;
        this.balloonG = new THREE.Group(); this.balloonG.position.set(0.15, 1.4, -0.1);
        this.char.root.add(this.balloonG);
      }
      const g = this.balloonG;
      if (g.parent !== this.char.root) this.char.root.add(g);
      while (g.children.length > n) g.remove(g.children[g.children.length - 1]);
      const cols = [0xff4a5a, 0x4ab0ff, 0xffd23a];
      while (g.children.length < n) {
        const i = g.children.length, b = new THREE.Group();
        const s = new THREE.Mesh(BALLOON_GEO(), new THREE.MeshLambertMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.15 }));
        s.scale.set(1, 1.2, 1); s.position.y = 2.0 + i * 0.25; b.add(s);
        const str = new THREE.Mesh(STRING_GEO(), new THREE.MeshBasicMaterial({ color: 0xf0f0f0 })); str.position.y = 1.0 + i * 0.12; str.scale.y = 1 + i * 0.25; b.add(str);
        b.rotation.z = (i - 1) * 0.28; b.rotation.x = (i % 2 ? 0.12 : -0.1);
        g.add(b);
      }
      g.visible = n > 0;
    }
    popBalloon() {
      if (!(this.balloons > 0)) return;
      const p = this.pos;
      G.FX.glow.spawn(p.x, p.y + 3.3, p.z, 0, 0, 0, 1, 0.5, 0.5, 0.5, 0.2, 0, 0, 0);
      G.Audio.play('pop', { pos: this.isPlayer ? null : [p.x, p.y + 3, p.z] });
      this.setBalloons(this.balloons - 1);
    }
    updateOvershield(dt) {
      if (!G.Match || !G.Match.zeroBuild || this.dead) return;
      this.osT = (this.osT || 0) + dt;
      if (this.osT > 5 && (this.overshield || 0) < 50) this.overshield = Math.min(50, (this.overshield || 0) + 10 * dt);
    }
    updateStorm(dt) {
      if (!G.Storm || !G.Storm.active || this.state === 'bus' || this.state === 'lobby' || this.folk && !this.hiredBy) { this.inStorm = false; return; }
      this.inStorm = G.Storm.isOutside(this.pos.x, this.pos.z);
      this.updateOvershield(dt);
      if (this.inStorm) {
        this.stormT += dt;
        if (this.stormT >= 1) { this.stormT -= 1; CB.damageActor(this, G.Storm.damage(), { storm: true }); }
      } else this.stormT = 0;
    }

    // ------------------------------------------------------------
    //  Modèle / hitbox (appelé après update)
    // ------------------------------------------------------------
    syncModel(dt, animate) {
      const r = this.char.root;
      r.position.copy(this.pos);
      if (this.state === 'swim' || this.swimming) r.position.y = this.pos.y + 0.05;
      r.rotation.y = this.yaw + Math.PI;
      if (animate) CH.animate(this.char, dt);
      this.updateHitbox(animate);
    }
    updateHitbox(precise) {
      const hb = this.hitbox, p = this.pos;
      const air = this.state === 'skydive' || this.state === 'glide';
      const bs = this.bodyScale || 1;
      const top = (air ? 1.8 : this.crouching ? 1.05 : 1.42) * bs;
      hb.minX = p.x - 0.36 * bs; hb.maxX = p.x + 0.36 * bs; hb.minZ = p.z - 0.36 * bs; hb.maxZ = p.z + 0.36 * bs;
      hb.minY = p.y; hb.maxY = p.y + top;
      hb.cx = p.x; hb.cy = p.y + top * 0.55; hb.cz = p.z;
      if (precise && this.char.root.visible && !air) {
        const hp = this.char.J.head.getWorldPosition(U.v1);
        hb.hx = hp.x; hb.hy = hp.y + 0.13; hb.hz = hp.z;
      } else { hb.hx = p.x; hb.hy = p.y + (this.crouching ? 1.25 : 1.66) * bs; hb.hz = p.z; }
    }
  }
  G.Actor = Actor;

  function W_damage(e, dmg, by, point) { G.World.damage(e, dmg, { pickaxe: true, by, point }); }
})();
