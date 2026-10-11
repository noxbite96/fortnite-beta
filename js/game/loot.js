// ============================================================
//  Loot : coffres, caisses de munitions, objets au sol
// ============================================================
(function () {
  const U = G.U, I = G.Items, WM = G.WModels;
  const L = { items: [], chests: [], ammoBoxes: [], near: [] };
  G.Loot = L;

  const CULL = 70;
  let beamGeo = null;
  const beamMats = {};
  function beamMat(r) {
    if (beamMats[r]) return beamMats[r];
    beamMats[r] = new THREE.MeshBasicMaterial({ map: G.Tex.get('beam'), color: I.RARITY[r].hex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    return beamMats[r];
  }
  const glowMats = {};
  function glowMat(hex) {
    if (glowMats[hex]) return glowMats[hex];
    glowMats[hex] = new THREE.MeshBasicMaterial({ map: G.Tex.get('glow'), color: hex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    return glowMats[hex];
  }

  // ------------------------------------------------------------
  //  Objets au sol
  // ------------------------------------------------------------
  // data : { kind:'item', item } | { kind:'ammo', type, amount } | { kind:'mat', type, amount }
  L.spawn = function (data, x, y, z, vx, vy, vz) {
    const g = new THREE.Group();
    let model, rarity = 0;
    if (data.kind === 'item') { model = WM.forItem(data.item); rarity = data.item.rarity; }
    else if (data.kind === 'ammo') model = WM.ammoBox(data.type);
    else if (data.kind === 'medal') model = G.Medal.model(data.type);
    else model = WM.material(data.type);
    if (data.kind === 'item' && I.WEAPONS[data.item.id]) { model.rotation.set(0, Math.random() * 6.28, Math.PI / 2 * 0); model.rotation.z = 0; model.rotation.x = -0.1; }
    const holder = new THREE.Group();
    holder.add(model);
    g.add(holder);
    // halo au sol + faisceau
    if (!beamGeo) { beamGeo = new THREE.PlaneGeometry(0.5, 3.2); beamGeo.translate(0, 1.6, 0); }
    const hex = data.kind === 'item' ? I.RARITY[rarity].hex : data.kind === 'ammo' ? I.AMMO[data.type].hex : data.kind === 'gold' || data.kind === 'medal' ? 0xffc830 : 0xffffff;
    const glow = new THREE.Mesh(G.U.geo('PlaneGeometry', 1.2, 1.2), glowMat(hex));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03;
    g.add(glow);
    let beams = null;
    if (data.kind === 'item' && rarity >= 1) {
      beams = new THREE.Group();
      const b1 = new THREE.Mesh(beamGeo, beamMat(rarity)), b2 = new THREE.Mesh(beamGeo, beamMat(rarity));
      b2.rotation.y = Math.PI / 2;
      beams.add(b1, b2); beams.scale.y = 0.5 + rarity * 0.35;
      g.add(beams);
    }
    g.position.set(x, y, z);
    G.scene.add(g);
    const it = { data, group: g, holder, glow, beams, x, y, z, vx: vx || 0, vy: vy || 0, vz: vz || 0, settled: !(vx || vy || vz), t: Math.random() * 6, alive: true, rarity, pickDelay: vx || vy || vz ? 0.6 : 0 };
    L.items.push(it);
    return it;
  };
  L.spawnItem = (item, x, y, z, vx, vy, vz) => L.spawn({ kind: 'item', item }, x, y, z, vx, vy, vz);
  L.spawnAmmo = (type, amount, x, y, z, vx, vy, vz) => L.spawn({ kind: 'ammo', type, amount }, x, y, z, vx, vy, vz);
  L.spawnMat = (type, amount, x, y, z, vx, vy, vz) => L.spawn({ kind: 'mat', type, amount }, x, y, z, vx, vy, vz);
  L.remove = function (it) {
    it.alive = false;
    G.scene.remove(it.group);
    const i = L.items.indexOf(it); if (i >= 0) L.items.splice(i, 1);
  };
  // Éjection en arc (coffres, éliminations)
  L.spill = function (list, x, y, z, spread) {
    spread = spread || 1;
    list.forEach((d, i) => {
      const a = (i / list.length) * Math.PI * 2 + Math.random() * 0.5;
      const s = U.rand(1.6, 3.2) * spread;
      L.spawn(d, x, y + 0.5, z, Math.cos(a) * s, U.rand(4, 6), Math.sin(a) * s);
    });
  };
  // Loot d'un coffre
  L.chestLoot = function (bonus) {
    const w = I.randomWeapon(bonus || 1);
    const out = [{ kind: 'item', item: w }];
    const wd = I.WEAPONS[w.id];
    out.push({ kind: 'ammo', type: wd.ammo, amount: I.AMMO[wd.ammo].pick * 2 });
    out.push({ kind: 'item', item: I.randomConsumable() });
    if (Math.random() < 0.4) out.push({ kind: 'item', item: I.randomConsumable() });
    out.push({ kind: 'mat', type: U.pick(['wood', 'stone', 'metal']), amount: 30 });
    out.push({ kind: 'gold', type: 'gold', amount: U.randInt(4, 9) * 5 * (bonus > 1 ? 2 : 1) });
    if (Math.random() < 0.035) out.push({ kind: 'item', item: I.make('treasuremap') });
    return out;
  };

  // ------------------------------------------------------------
  //  Coffres
  // ------------------------------------------------------------
  let chestParts = null;
  function chestModel() {
    if (!chestParts) {
      const gold = new THREE.MeshLambertMaterial({ color: 0xf0b030, emissive: 0x8a5a00, emissiveIntensity: 0.55 });
      const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a2a, emissive: 0x2a1a08, emissiveIntensity: 0.3 });
      const dark = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
      chestParts = { gold, wood, dark };
    }
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.6), chestParts.wood); base.position.y = 0.25; g.add(base);
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 0.64), chestParts.gold); b1.position.y = 0.46; g.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 0.64), chestParts.gold); b2.position.y = 0.06; g.add(b2);
    for (const sx of [-0.45, 0.45]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.64), chestParts.gold); c.position.set(sx, 0.25, 0); g.add(c); }
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.5, -0.3); g.add(lidPivot);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 12, 1, false, 0, Math.PI), chestParts.wood);
    lid.rotation.set(0, 0, Math.PI / 2); lid.position.set(0, 0, 0.3); lidPivot.add(lid);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.1, 0.1), chestParts.gold); lb.position.set(0, 0.28, 0.3); lidPivot.add(lb);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.06), chestParts.gold); lock.position.set(0, 0.42, 0.32); g.add(lock);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), glowMat(0xffc040));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; g.add(glow);
    g.traverse((o) => { if (o.isMesh && o !== glow) o.castShadow = true; });
    return { g, lidPivot, glow };
  }

  L.createChests = function () {
    for (const s of G.Arch.chestSpots) {
      const m = chestModel();
      m.g.position.set(s[0], s[1], s[2]);
      m.g.rotation.y = s[3] || 0;
      G.scene.add(m.g);
      L.chests.push({ x: s[0], y: s[1], z: s[2], g: m.g, lid: m.lidPivot, glow: m.glow, opened: true, active: false, openT: 0, sparkT: 0 });
    }
    for (const s of G.Arch.ammoSpots) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.5), new THREE.MeshLambertMaterial({ color: 0x4a5a3a })); b.position.y = 0.225; g.add(b);
      const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.45, -0.25); g.add(lidPivot);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.52), new THREE.MeshLambertMaterial({ color: 0x5a6a4a })); lid.position.set(0, 0.04, 0.25); lidPivot.add(lid);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.02), new THREE.MeshLambertMaterial({ color: 0xe0c040 })); st.position.set(0, 0.3, 0.26); g.add(st);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.position.set(s[0], s[1], s[2]); g.rotation.y = s[3] || 0;
      G.scene.add(g);
      L.ammoBoxes.push({ x: s[0], y: s[1], z: s[2], g, lid: lidPivot, opened: true, active: false, openT: 0 });
    }
  };

  // Coffre ajouté après la génération (chambre forte) : toujours présent, meilleur butin
  L.addChest = function (x, y, z, rot, bonus) {
    const m = chestModel();
    m.g.position.set(x, y, z); m.g.rotation.y = rot || 0;
    G.scene.add(m.g);
    const c = { x, y, z, g: m.g, lid: m.lidPivot, glow: m.glow, opened: false, active: true, openT: 0, sparkT: 0, vault: true, bonus: bonus || 3 };
    L.chests.push(c);
    return c;
  };

  // Nouvelle partie : coffres et loot au sol aléatoires
  L.reset = function () {
    for (let i = L.items.length - 1; i >= 0; i--) L.remove(L.items[i]);
    for (const c of L.chests) {
      c.active = c.vault ? true : Math.random() < 0.72; c.opened = !c.active; c.openT = 0;
      c.g.visible = c.active; c.lid.rotation.x = 0; c.glow.visible = true;
      if (!c.vault) L.setRare(c, Math.random() < 0.09);
    }
    for (const a of L.ammoBoxes) { a.active = Math.random() < 0.7; a.opened = !a.active; a.g.visible = a.active; a.lid.rotation.x = 0; a.openT = 0; }
    for (const s of G.Arch.lootSpots) {
      if (Math.random() > 0.78) continue;
      const r = Math.random();
      let d;
      if (r < 0.45) {
        const w = I.randomWeapon(0);
        L.spawnItem(w, s[0], s[1], s[2]);
        const wd = I.WEAPONS[w.id];
        L.spawnAmmo(wd.ammo, I.AMMO[wd.ammo].pick, s[0] + 0.7, s[1], s[2] + 0.3);
        continue;
      } else if (r < 0.75) d = { kind: 'item', item: I.randomConsumable() };
      else { const t = U.pick(Object.keys(I.AMMO)); d = { kind: 'ammo', type: t, amount: I.AMMO[t].pick }; }
      L.spawn(d, s[0], s[1], s[2]);
    }
  };

  // COFFRES RARES (bleus) : meilleur butin
  let rareWood = null;
  L.setRare = function (c, on) {
    if (!!c.rare === !!on) return;
    c.rare = !!on;
    c.bonus = on ? 2 : undefined;
    if (!rareWood) rareWood = new THREE.MeshLambertMaterial({ color: 0x2a62d8, emissive: 0x0a2270, emissiveIntensity: 0.45 });
    c.g.traverse((o) => { if (o.isMesh && (o.material === chestParts.wood || o.material === rareWood)) o.material = on ? rareWood : chestParts.wood; });
    c.glow.material = glowMat(on ? 0x4aa8ff : 0xffc040);
  };
  L.openChest = function (c, by) {
    if (c.opened) return;
    c.opened = true; c.openT = 0.001;
    G.Audio.play('chest_open', { pos: [c.x, c.y + 0.5, c.z] });
    for (let i = 0; i < 40; i++) G.FX.glow.spawn(c.x, c.y + 0.6, c.z, U.rand(-2, 2), U.rand(2, 6), U.rand(-2, 2), c.rare ? 0.3 : 1, c.rare ? 0.6 : 0.8, c.rare ? 1 : 0.3, U.rand(0.1, 0.25), U.rand(0.6, 1.2), 5, 1);
    const yaw = c.g.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const loot = L.chestLoot(c.bonus || 1);
    if (c.vault) loot.push({ kind: 'item', item: I.make(U.pick(['shieldpot', 'slurp', 'chug', 'medkit'])) }, { kind: 'mat', type: 'metal', amount: 60 });
    loot.forEach((d, i) => {
      const a = yaw + (i - (loot.length - 1) / 2) * 0.55;
      L.spawn(d, c.x + fx * 0.5, c.y + 0.6, c.z + fz * 0.5, Math.sin(a) * U.rand(2, 3), U.rand(4, 5.5), Math.cos(a) * U.rand(2, 3));
    });
    if (by) { by.stats.chests = (by.stats.chests || 0) + 1; if (by.onChest) by.onChest(); }
  };
  L.openAmmo = function (a, by) {
    if (a.opened) return;
    a.opened = true; a.openT = 0.001;
    G.Audio.play('ammo_open', { pos: [a.x, a.y + 0.5, a.z] });
    const types = U.shuffle(Object.keys(I.AMMO)).slice(0, 2);
    L.spill(types.map((t) => ({ kind: 'ammo', type: t, amount: I.AMMO[t].pick * 2 })), a.x, a.y + 0.3, a.z, 0.6);
    if (Math.random() < 0.3) L.spill([{ kind: 'item', item: I.make('grenade') }], a.x, a.y + 0.3, a.z, 0.5);
  };

  // ------------------------------------------------------------
  //  Mise à jour
  // ------------------------------------------------------------
  L.update = function (dt, cam) {
    const cx = cam.x, cz = cam.z;
    for (let i = L.items.length - 1; i >= 0; i--) {
      const it = L.items[i];
      if (it.pickDelay > 0) it.pickDelay -= dt;
      if (!it.settled) {
        it.vy -= 18 * dt;
        it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
        const gy = G.Phys.supportAt(it.x, it.z, it.y + 0.3, 0.1, 0.4);
        if (it.y <= gy) {
          it.y = gy;
          if (it.vy < -3) { it.vy = -it.vy * 0.3; it.vx *= 0.5; it.vz *= 0.5; }
          else { it.settled = true; it.vy = 0; }
        }
        if (it.y < -1.5) { // dans l'eau : flotte
          it.y = Math.max(it.y, -0.1); it.settled = true;
        }
        it.group.position.set(it.x, it.y, it.z);
      }
      const d2 = (it.x - cx) * (it.x - cx) + (it.z - cz) * (it.z - cz);
      const vis = d2 < CULL * CULL;
      it.group.visible = vis;
      if (vis) {
        it.t += dt;
        it.holder.position.y = 0.25 + Math.sin(it.t * 2) * 0.06;
        it.holder.rotation.y += dt * 0.8;
        if (it.beams) it.beams.visible = d2 > 4;
      }
      // les objets tombés loin sous la carte disparaissent
      if (it.y < -30) L.remove(it);
    }
    for (const c of L.chests) {
      if (!c.active) continue;
      const d2 = (c.x - cx) * (c.x - cx) + (c.z - cz) * (c.z - cz);
      c.g.visible = d2 < 140 * 140;
      if (c.openT > 0) {
        c.openT += dt;
        c.lid.rotation.x = -Math.min(1, c.openT * 4) * 1.9;
        c.glow.visible = false;
        if (c.openT > 25) { c.g.visible = false; c.active = false; }
      } else if (!c.opened && d2 < 40 * 40) {
        c.sparkT -= dt;
        if (c.sparkT <= 0) { c.sparkT = 0.06; G.FX.sparkle(c.x, c.y + 0.5, c.z, c.rare ? 0.35 : 1, c.rare ? 0.65 : 0.85, c.rare ? 1 : 0.35, 0.7); }
        c.glow.material.opacity = 0.45 + Math.sin(G.clock.time * 4) * 0.15;
      }
    }
    for (const a of L.ammoBoxes) {
      if (!a.active) continue;
      const d2 = (a.x - cx) * (a.x - cx) + (a.z - cz) * (a.z - cz);
      a.g.visible = d2 < 120 * 120;
      if (a.openT > 0) { a.openT += dt; a.lid.rotation.x = -Math.min(1, a.openT * 4) * 1.6; if (a.openT > 25) { a.g.visible = false; a.active = false; } }
    }
    // son des coffres les plus proches de l'auditeur
    const lis = G.Audio.listener;
    let best = null, bd = 1e9;
    for (const c of L.chests) {
      if (!c.active || c.opened) continue;
      const d = Math.hypot(c.x - lis.x, c.y - lis.y, c.z - lis.z);
      if (d < bd) { bd = d; best = c; }
    }
    if (best && bd < 26) {
      const sp = G.Audio.spatialOf([best.x, best.y + 0.5, best.z], 3, 26);
      G.Audio.setLoop('chest', sp ? sp.g * 0.9 : 0, sp ? sp.pan : 0);
    } else G.Audio.setLoop('chest', 0);
  };

  // Objet le plus pertinent à ramasser pour un personnage (regard + distance)
  L.findInteract = function (actor, fx, fz) {
    const p = actor.pos;
    let best = null, bs = -1e9;
    const consider = (obj, x, y, z, kind, maxD, meta) => {
      const dx = x - p.x, dy = y - (p.y + 0.8), dz = z - p.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > maxD || Math.abs(dy) > 2.2) return;
      const dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
      const score = dot * 2 - d * 0.6 + (kind === 'chest' ? 0.5 : 0);
      if (score > bs) { bs = score; best = { kind, obj, x, y, z, name: meta && meta.name, action: meta && meta.action, end: meta && meta.end, ok: meta && meta.ok }; }
    };
    for (const it of L.items) if (it.alive && it.pickDelay <= 0 && it.data.kind === 'item') consider(it, it.x, it.y, it.z, 'item', 2.4);
    for (const c of L.chests) if (c.active && !c.opened) consider(c, c.x, c.y + 0.3, c.z, 'chest', 2.6);
    for (const a of L.ammoBoxes) if (a.active && !a.opened) consider(a, a.x, a.y + 0.3, a.z, 'ammo', 2.4);
    for (const d of G.Arch.doors) if (!d.dead) consider(d, d.pos.x, d.pos.y, d.pos.z, 'door', 2.2);
    if (G.Extras && G.Extras.interactables) for (const o of G.Extras.interactables()) consider(o.obj, o.x, o.y, o.z, o.kind, o.range || 2.6, o);
    return best;
  };

  // Ramassage automatique (munitions / matériaux)
  L.autoPickup = function (actor) {
    const p = actor.pos;
    for (let i = L.items.length - 1; i >= 0; i--) {
      const it = L.items[i];
      if (!it.alive || it.pickDelay > 0 || it.data.kind === 'item') continue;
      const dx = it.x - p.x, dy = it.y - p.y, dz = it.z - p.z;
      if (dx * dx + dz * dz > 2.2 || Math.abs(dy) > 1.8) continue;
      const d = it.data;
      if (d.kind === 'gold') { const amt = d.amount * (actor.aug && actor.aug.or ? 2 : 1); actor.gold = Math.min(9999, (actor.gold || 0) + amt); if (actor.isPlayer) { G.Audio.play('coin'); G.HUD && G.HUD.pickupNote('+' + amt + ' lingots d\'or', '#ffd23a'); if (G.Match) G.Match.challengeEvent('gold', amt); } }
      else if (d.kind === 'medal') { if (!G.Medal || actor.isCreature || actor.folk || !G.Medal.give(actor, d.type)) continue; }
      else if (d.kind === 'ammo') { actor.ammo[d.type] = Math.min(999, (actor.ammo[d.type] || 0) + d.amount); if (actor.isPlayer) { G.Audio.play('pickup_ammo'); G.HUD && G.HUD.pickupNote('+' + d.amount + ' ' + I.AMMO[d.type].short, I.AMMO[d.type].color); } }
      else { const room = 999 - (actor.mats[d.type] || 0); if (room <= 0) continue; actor.mats[d.type] += Math.min(room, d.amount); if (actor.isPlayer) { G.Audio.play('pickup_mats'); G.HUD && G.HUD.pickupNote('+' + d.amount + ' ' + I.MAT[d.type].name, I.MAT[d.type].color); } }
      L.remove(it);
    }
  };

  // Liste des objets proches (pour les bots)
  L.nearestFor = function (x, z, maxD, filter) {
    let best = null, bd = maxD * maxD;
    for (const it of L.items) {
      if (!it.alive || it.pickDelay > 0) continue;
      if (filter && !filter(it)) continue;
      const d = (it.x - x) * (it.x - x) + (it.z - z) * (it.z - z);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  };
})();
