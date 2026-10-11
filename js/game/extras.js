// ============================================================
//  Bonus : véhicules (karts), pièges, tremplins, largages,
//  lamas à butin, pommes / champignons, feux de camp, distributeurs
// ============================================================
(function () {
  const U = G.U, I = G.Items, P = G.Phys, CB = G.Combat, L = G.Loot;
  const X = { traps: [], karts: [], drops: [], llamas: [], forage: [], fires: [], vendings: [] };
  G.Extras = X;

  function mat(c, e, ei) { const m = new THREE.MeshLambertMaterial({ color: c }); if (e) { m.emissive = new THREE.Color(e); m.emissiveIntensity = ei || 1; } return m; }
  // libère la mémoire GPU d'un modèle unique (géométries + matériaux non partagés)
  function disposeTree(o) { if (!o) return; o.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose()); }); }
  X.disposeTree = disposeTree;
  function mesh(g, m, x, y, z, parent) { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; if (parent) parent.add(o); return o; }

  // ------------------------------------------------------------
  //  PIÈGES & TREMPLINS
  // ------------------------------------------------------------
  function launchpadModel() {
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(2.2, 0.18, 2.2), mat(0x3a3a42), 0, 0.09, 0, g);
    const pad = mesh(new THREE.BoxGeometry(1.9, 0.08, 1.9), mat(0xf0b030, 0x8a5a00, 0.5), 0, 0.22, 0, g);
    const arrowM = mat(0xffffff, 0xffffff, 0.6);
    for (let i = 0; i < 2; i++) { const a = mesh(new THREE.ConeGeometry(0.45, 0.5, 3), arrowM, 0, 0.3, -0.3 + i * 0.6, g); a.rotation.x = -Math.PI / 2; a.scale.y = 0.3; }
    g.userData.pad = pad;
    return g;
  }
  function spikeModel() {
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.8, 0.1, 1.8), mat(0x4a4a50), 0, 0.05, 0, g);
    const spikes = new THREE.Group(); g.add(spikes);
    const sm = mat(0xd8d8e0);
    for (let i = 0; i < 16; i++) mesh(new THREE.ConeGeometry(0.07, 0.5, 4), sm, -0.6 + (i % 4) * 0.4, 0.25, -0.6 + Math.floor(i / 4) * 0.4, spikes);
    spikes.position.y = -0.4;
    g.userData.spikes = spikes;
    return g;
  }
  X.placeTrap = function (actor, it) {
    const c = I.CONSUMABLES[it.id];
    const fx = -Math.sin(actor.yaw), fz = -Math.cos(actor.yaw);
    const x = actor.pos.x + fx * 2.2, z = actor.pos.z + fz * 2.2;
    const y = P.supportAt(x, z, actor.pos.y + 1, 0.8, 1.2);
    if (Math.abs(y - actor.pos.y) > 2) { if (actor.isPlayer) G.HUD.notify('Impossible de placer ici', 1.2); return false; }
    if (c.trap === 'cozyfire') {
      const g = new THREE.Group(); g.position.set(x, y, z);
      if (!X.cozyGeo) X.cozyGeo = { log: new THREE.CylinderGeometry(0.08, 0.08, 0.9, 5), rock: new THREE.DodecahedronGeometry(0.16, 0), logM: mat(0x6a4a30), rockM: mat(0x8a8a8a) };
      for (let k = 0; k < 5; k++) { const lg = mesh(X.cozyGeo.log, X.cozyGeo.logM, Math.cos(k * 1.25) * 0.25, 0.15, Math.sin(k * 1.25) * 0.25, g); lg.rotation.z = 1.2; lg.rotation.y = k * 1.25; }
      for (let k = 0; k < 8; k++) mesh(X.cozyGeo.rock, X.cozyGeo.rockM, Math.cos(k * 0.8) * 0.6, 0.08, Math.sin(k * 0.8) * 0.6, g);
      G.scene.add(g);
      X.fires.push({ x, y, z, lit: true, t: 25, m: g, portable: true });
      G.Audio.play('build', { pos: [x, y, z], mat: 'wood' });
      if (actor.isPlayer) G.HUD.notify('FEU DE CAMP : +2 PV/s pendant 25 s', 1.6);
      it.count--;
      if (it.count <= 0) { actor.slots[actor.sel] = null; actor.sel = actor.firstWeaponSlot(); actor.refreshHeld(); }
      return true;
    }
    const m = c.trap === 'launchpad' ? launchpadModel() : spikeModel();
    m.position.set(x, y + 0.01, z); m.rotation.y = actor.yaw;
    G.scene.add(m);
    X.traps.push({ kind: c.trap, x, y, z, m, owner: actor, cd: 0, used: false, t: 0 });
    G.Audio.play('build', { pos: [x, y, z], mat: 'metal' });
    it.count--;
    if (it.count <= 0) { actor.slots[actor.sel] = null; actor.sel = actor.firstWeaponSlot(); actor.refreshHeld(); }
    return true;
  };
  function updateTraps(dt) {
    for (let i = X.traps.length - 1; i >= 0; i--) {
      const t = X.traps[i];
      t.cd = Math.max(0, t.cd - dt); t.t += dt;
      if (t.kind === 'launchpad') {
        t.m.userData.pad.position.y = 0.22 + Math.max(0, t.cd - 0.8) * 0.5;
        if (t.cd > 0) continue;
        for (const a of CB.actors) {
          if (a.dead || a.state !== 'ground' && a.state !== 'lobby') continue;
          if (Math.abs(a.pos.x - t.x) < 1.2 && Math.abs(a.pos.z - t.z) < 1.2 && Math.abs(a.pos.y - t.y) < 0.8) {
            a.vel.y = 34; a.vel.x *= 1.5; a.vel.z *= 1.5; a.grounded = false;
            a.state = 'skydive'; a.char.anim.mode = 'skydive'; a.buildMode = false; a.refreshHeld();
            t.cd = 1.2;
            G.Audio.play('launchpad', { pos: [t.x, t.y, t.z] });
            G.FX.dust(t.x, t.y, t.z, 16, 1.2);
          }
        }
      } else {
        const sp = t.m.userData.spikes;
        if (t.used) { sp.position.y = Math.min(0.15, sp.position.y + dt * 8); if (t.t > 2.5) { G.scene.remove(t.m); X.traps.splice(i, 1); } continue; }
        for (const a of CB.actors) {
          if (a.dead || a === t.owner || !a.hittable()) continue;
          if (Math.abs(a.pos.x - t.x) < 1.3 && Math.abs(a.pos.z - t.z) < 1.3 && Math.abs(a.pos.y - t.y) < 1.5) {
            t.used = true; t.t = 0;
            G.Audio.play('trap', { pos: [t.x, t.y, t.z] });
            for (const b of CB.actors) if (!b.dead && b !== t.owner && Math.abs(b.pos.x - t.x) < 1.6 && Math.abs(b.pos.z - t.z) < 1.6 && Math.abs(b.pos.y - t.y) < 1.8) CB.damageActor(b, 90, { by: t.owner, weapon: 'spiketrap', point: [b.pos.x, b.pos.y + 0.5, b.pos.z] });
            break;
          }
        }
      }
    }
  }

  // ------------------------------------------------------------
  //  KARTS (véhicule tout-terrain)
  // ------------------------------------------------------------
  function kartModel(color) {
    const g = new THREE.Group();
    const body = mat(color), dark = mat(0x1a1a1e), metal = mat(0xa0a8b0), seat = mat(0x3a2a1a);
    mesh(new THREE.BoxGeometry(1.8, 0.35, 3.0), body, 0, 0.55, 0, g);
    mesh(new THREE.BoxGeometry(1.7, 0.3, 0.9), body, 0, 0.8, 1.1, g).rotation.x = 0.3;
    mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), seat, -0.4, 0.95, -0.2, g);
    mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), seat, 0.4, 0.95, -0.2, g);
    mesh(new THREE.BoxGeometry(1.4, 0.4, 0.6), seat, 0, 0.95, -1.0, g);
    // arceau
    for (const s of [-0.85, 0.85]) { mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), metal, s, 1.5, -0.4, g); mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), metal, s, 1.5, 0.3, g).rotation.x = -0.5; }
    mesh(new THREE.BoxGeometry(1.8, 0.08, 1.3), body, 0, 2.3, -0.2, g);
    // volant
    const wheelS = mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 12), dark, -0.4, 1.25, 0.4, g); wheelS.rotation.x = -0.9;
    // roues
    const wheels = [];
    for (const [x, z] of [[-0.95, 1.05], [0.95, 1.05], [-0.95, -1.05], [0.95, -1.05]]) { const w = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12), dark, x, 0.42, z, g); w.rotation.z = Math.PI / 2; wheels.push(w); const hub = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.37, 8), metal, 0, 0, 0, w); }
    // phares
    mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), mat(0xffffe0, 0xffffa0, 1.2), -0.6, 0.65, 1.52, g);
    mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), mat(0xffffe0, 0xffffa0, 1.2), 0.6, 0.65, 1.52, g);
    g.userData.wheels = wheels;
    return g;
  }
  // Caddie (Galerie Marchande) : un kart sans moteur, lent mais rigolo
  function cartModel() {
    const g = new THREE.Group();
    const V = G.Veg, parts = [];
    const wire = 0xb8c0c8, red = 0xd83030, dark = 0x1a1a1e;
    const bx = (sx, sy, sz, col, x, y, z) => parts.push(V.colored(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), col, 0));
    bx(1.1, 0.05, 1.6, wire, 0, 0.45, 0);                        // fond
    for (let i = 0; i <= 6; i++) { bx(0.03, 0.75, 0.03, wire, -0.55, 0.85, -0.8 + i * 0.267); bx(0.03, 0.75, 0.03, wire, 0.55, 0.85, -0.8 + i * 0.267); }
    for (let i = 0; i <= 4; i++) { bx(0.03, 0.75, 0.03, wire, -0.55 + i * 0.275, 0.85, 0.8); bx(0.03, 0.75, 0.03, wire, -0.55 + i * 0.275, 0.85, -0.8); }
    for (const y of [0.6, 0.9, 1.2]) { bx(1.12, 0.03, 0.03, wire, 0, y, 0.8); bx(1.12, 0.03, 0.03, wire, 0, y, -0.8); bx(0.03, 0.03, 1.62, wire, -0.55, y, 0); bx(0.03, 0.03, 1.62, wire, 0.55, y, 0); }
    bx(1.0, 0.08, 0.08, red, 0, 1.3, -1.05); bx(0.04, 0.3, 0.04, wire, -0.45, 1.15, -0.95); bx(0.04, 0.3, 0.04, wire, 0.45, 1.15, -0.95); // poignée
    bx(0.9, 0.03, 0.4, wire, 0, 0.2, 0.1);                        // panier du bas
    const body = new THREE.Mesh(V.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })); body.castShadow = true; g.add(body);
    const wheels = [];
    const wm = new THREE.MeshLambertMaterial({ color: dark });
    for (const [x, z] of [[-0.45, 0.65], [0.45, 0.65], [-0.45, -0.65], [0.45, -0.65]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), wm); w.rotation.z = Math.PI / 2; w.position.set(x, 0.12, z); g.add(w); wheels.push(w); }
    g.userData.wheels = wheels;
    return g;
  }
  // VOITURES : berlines et voitures de sport qu'on peut conduire (plus rapides que les karts sur la route)
  const CAR_GLASS = new THREE.MeshLambertMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.38, emissive: 0x1a3a5a, emissiveIntensity: 0.3, depthWrite: false });
  function carModel(color, sport) {
    const g = new THREE.Group();
    const V = G.Veg, parts = [], chrome = 0xc8ccd0, dark = 0x1a1a1e;
    const bx = (sx, sy, sz, col, x, y, z, rx) => { const geo = new THREE.BoxGeometry(sx, sy, sz); if (rx) geo.rotateX(rx); parts.push(V.colored(geo.translate(x, y, z), col, 0)); };
    const L = sport ? 4.0 : 4.3, W = 1.9;
    bx(W, sport ? 0.45 : 0.6, L, color, 0, sport ? 0.55 : 0.62, 0);                          // caisse
    bx(W - 0.02, 0.12, L * 0.28, color, 0, sport ? 0.8 : 0.96, L * 0.33, sport ? 0.08 : 0.05);   // capot
    bx(W + 0.04, 0.18, 0.2, chrome, 0, 0.45, L / 2 + 0.05); bx(W + 0.04, 0.18, 0.2, chrome, 0, 0.45, -L / 2 - 0.05); // pare-chocs
    // montants du toit
    const cy = 1.27, ch = 0.7, cl = 2.1, cz = -0.2;
    if (!sport) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.08, ch, 0.08, color, sx * (W / 2 - 0.12), cy, cz + sz * (cl / 2 - 0.05));
      bx(W - 0.2, 0.08, cl, color, 0, cy + ch / 2, cz);                                        // toit
    } else {
      // cabriolet : pare-brise incliné + arceau
      bx(W - 0.3, 0.06, 0.06, color, 0, 1.2, 0.2);
      bx(0.1, 0.4, 0.1, 0x2a2a2e, 0.45, 1.0, -0.95); bx(0.1, 0.4, 0.1, 0x2a2a2e, -0.45, 1.0, -0.95);
    }
    if (sport) { bx(W, 0.06, 0.4, dark, 0, 1.02, -L / 2 + 0.2); bx(0.08, 0.3, 0.08, dark, -0.6, 0.85, -L / 2 + 0.25); bx(0.08, 0.3, 0.08, dark, 0.6, 0.85, -L / 2 + 0.25); bx(W - 0.3, 0.04, 0.6, 0xffffff, 0, 0.79, 0.9); }
    // phares / feux
    for (const sx of [-1, 1]) { bx(0.34, 0.14, 0.06, 0xfffff0, sx * 0.62, 0.66, L / 2 + 0.01); bx(0.3, 0.12, 0.06, 0xd01818, sx * 0.65, 0.68, -L / 2 - 0.01); }
    bx(0.9, 0.16, 0.05, 0x2a2a2e, 0, 0.62, L / 2 + 0.02);                                      // calandre
    // sièges + volant (visibles à travers les vitres)
    bx(0.55, 0.25, 0.55, 0x2a2a30, 0.45, 0.72, -0.4); bx(0.55, 0.25, 0.55, 0x2a2a30, -0.45, 0.72, -0.4);
    bx(0.55, 0.6, 0.12, 0x2a2a30, 0.45, 1.0, -0.72); bx(0.55, 0.6, 0.12, 0x2a2a30, -0.45, 1.0, -0.72);
    bx(0.08, 0.3, 0.08, dark, 0.45, 0.98, 0.35, -0.6);
    const body = new THREE.Mesh(V.merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })); body.castShadow = true; g.add(body);
    // vitres
    if (!sport) { const glass = new THREE.Mesh(new THREE.BoxGeometry(W - 0.22, ch - 0.04, cl - 0.12), CAR_GLASS); glass.position.set(0, cy, cz); g.add(glass); }
    else { const ws = new THREE.Mesh(new THREE.BoxGeometry(W - 0.34, 0.42, 0.04), CAR_GLASS); ws.position.set(0, 1.0, 0.28); ws.rotation.x = -0.55; g.add(ws); }
    // phares lumineux la nuit
    const hl = new THREE.MeshBasicMaterial({ color: 0xffffd0, toneMapped: false });
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.02), hl); l.position.set(sx * 0.62, 0.66, L / 2 + 0.05); g.add(l); }
    const wheels = [];
    const wm = new THREE.MeshLambertMaterial({ color: dark }), hm = new THREE.MeshLambertMaterial({ color: chrome });
    for (const [x, z] of [[-0.88, L * 0.32], [0.88, L * 0.32], [-0.88, -L * 0.32], [0.88, -L * 0.32]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14), wm); w.rotation.z = Math.PI / 2; w.position.set(x, 0.4, z); w.castShadow = true; g.add(w); wheels.push(w);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 8), hm); w.add(hub);
    }
    g.userData.wheels = wheels;
    return g;
  }
  X.makeCar = function (x, z, yaw, sport, color) {
    const k = new Kart(x, z, yaw);
    G.scene.remove(k.m); X.disposeTree(k.m); k.m = carModel(color || (sport ? U.pick([0xd82a2a, 0xf0c020, 0xff7a1a, 0x2a2a2e]) : U.pick([0xd82a2a, 0x2a6ad8, 0xf0f0f0, 0x2a2a2e, 0x3ab05a, 0xf0c020, 0xff7a1a])), sport); G.scene.add(k.m);
    k.label = sport ? 'Voiture de sport' : 'Voiture'; k.isCar = true; k.sport = sport; k.seat = [0.45, -0.54, -0.4];
    k.reset();
    return k;
  };
  X.spawnCars = function () {
    if (X.carsPlaced || !G.Folk) return;
    X.carsPlaced = true;
    const spots = [['tours', 2, false], ['galerie', 2, false], ['tours', 1, true], ['docks', 1, false], ['sources', 1, true], ['ferme', 1, false]];
    const cols = [0xd82a2a, 0x2a6ad8, 0xf0f0f0, 0x2a2a2e, 0x3ab05a, 0xf0c020, 0xff7a1a];
    for (const [id, n, sport] of spots) {
      const p = G.MapData.poiById(id); if (!p) continue;
      for (let i = 0; i < n; i++) {
        const q = G.Folk.findSpot(p.x, p.z, 10, Math.min(45, p.r));
        const k = new Kart(q[0], q[1], Math.random() * 6.28);
        G.scene.remove(k.m); X.disposeTree(k.m); k.m = carModel(sport ? U.pick([0xd82a2a, 0xf0c020, 0xff7a1a, 0x2a2a2e]) : U.pick(cols), sport); G.scene.add(k.m);
        k.label = sport ? 'Voiture de sport' : 'Voiture'; k.isCar = true; k.sport = sport; k.seat = [0.45, -0.54, -0.4];
        k.reset();
        X.karts.push(k);
      }
    }
  };
  // MOTONEIGES (Chalet du Pic)
  function sledModel(color) {
    const g = new THREE.Group();
    const V = G.Veg, P = [];
    const bx = (sx, sy, sz, col, x, y, z, rx) => { const geo = new THREE.BoxGeometry(sx, sy, sz); if (rx) geo.rotateX(rx); P.push(V.colored(geo.translate(x, y, z), col, 0)); };
    const dark = 0x1a1a1e, metal = 0xb0b8c0;
    bx(1.0, 0.45, 2.4, color, 0, 0.55, 0);                    // coque
    bx(0.95, 0.3, 0.8, color, 0, 0.7, 1.05, 0.35);            // capot incliné
    bx(0.6, 0.25, 1.1, dark, 0, 0.9, -0.35);                  // selle
    bx(0.9, 0.35, 1.2, 0x2a2a30, 0, 0.3, -0.7);               // chenille
    for (const s of [-1, 1]) { bx(0.12, 0.06, 1.6, metal, s * 0.55, 0.06, 0.55); bx(0.12, 0.2, 0.08, metal, s * 0.55, 0.12, 1.35, 0.6); bx(0.06, 0.4, 0.06, metal, s * 0.55, 0.28, 0.6); } // skis
    bx(0.9, 0.06, 0.08, dark, 0, 1.08, 0.55);                 // guidon
    bx(0.3, 0.12, 0.05, 0xffffe0, 0, 0.72, 1.46);             // phare
    const body = new THREE.Mesh(V.merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })); body.castShadow = true; g.add(body);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.04), new THREE.MeshLambertMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.45 })); ws.position.set(0, 1.05, 0.75); ws.rotation.x = -0.5; g.add(ws);
    g.userData.wheels = [];
    return g;
  }
  X.spawnSleds = function () {
    if (X.sledsPlaced || !G.Folk) return;
    X.sledsPlaced = true;
    const p = G.MapData.poiById('chalet'); if (!p) return;
    for (let i = 0; i < 3; i++) {
      const q = G.Folk.findSpot(p.x, p.z, 8, 35);
      const k = new Kart(q[0], q[1], Math.random() * 6.28);
      G.scene.remove(k.m); X.disposeTree(k.m); k.m = sledModel([0xe0301e, 0x2a6ad8, 0xf0c020][i]); G.scene.add(k.m);
      k.label = 'Motoneige'; k.isSled = true; k.seat = [0, 0.05, -0.35];
      k.reset();
      X.karts.push(k);
    }
  };
  X.spawnCarts = function () {
    if (X.cartsPlaced || !G.Folk) return;
    X.cartsPlaced = true;
    const p = G.MapData.poiById('galerie'); if (!p) return;
    for (let i = 0; i < 3; i++) {
      const q = G.Folk.findSpot(p.x, p.z, 8, 30);
      const k = new Kart(q[0], q[1], Math.random() * 6.28);
      G.scene.remove(k.m); k.m = cartModel(); G.scene.add(k.m);
      k.label = 'Caddie'; k.isCart = true; k.seat = [0, 0.0, 0.0];
      k.reset();
      X.karts.push(k);
    }
  };
  class Kart {
    constructor(x, z, yaw, color) {
      this.home = [x, z, yaw];
      this.m = kartModel(color || U.pick([0x3a7ad8, 0xd84a3a, 0x3ac05a, 0xe0a020]));
      G.scene.add(this.m);
      this.reset();
    }
    reset() {
      this.pos = new THREE.Vector3(this.home[0], G.Terrain.height(this.home[0], this.home[1]) + 0.2, this.home[1]);
      this.yaw = this.home[2]; this.speed = 0; this.vy = 0; this.hp = this.isCar ? 700 : 400; this.dead = false; this.driver = null; this.pitch = 0; this.roll = 0; this.boost = 0;
      this.m.visible = true;
      this.sync();
    }
    sync() { this.m.position.copy(this.pos); this.m.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ'); }
    update(dt) {
      if (this.dead) return;
      const d = this.driver;
      let thr = 0, steer = 0, boost = false, hop = false;
      if (d) { thr = d.control.mz; steer = -d.control.mx; boost = d.control.sprint; hop = d.control.jump; d.control.jump = false; }
      const grounded = this.pos.y <= this.groundY + 0.05;
      const maxS = this.isCart ? (boost ? 15 : 11) : this.isSled ? (boost ? 30 : 22) : this.isCar ? (this.sport ? (boost ? 38 : 29) : (boost ? 32 : 24)) : boost ? 26 : 19;
      if (grounded) {
        if (thr > 0) this.speed = Math.min(maxS, this.speed + (boost ? 16 : 10) * (this.sport ? 1.35 : 1) * dt);
        else if (thr < 0) this.speed = Math.max(-8, this.speed - 14 * dt);
        else this.speed *= Math.pow(0.35, dt);
        if (hop) this.vy = 7;
        const turn = steer * U.clamp(Math.abs(this.speed) / 6, 0, 1) * 1.9 * Math.sign(this.speed || 1);
        this.yaw += turn * dt;
      }
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      // collisions frontales
      const sp = this.speed;
      if (Math.abs(sp) > 0.5) {
        const dir = Math.sign(sp);
        const h = P.raycast(this.pos.x, this.pos.y + 0.8, this.pos.z, fx * dir, 0, fz * dir, (this.isCar ? 2.4 : 1.8) + Math.abs(sp) * dt, { mask: 1 });
        if (h && !h.terrain) {
          if (h.ent && !h.ent.dead && (h.ent.type === 'build' || h.ent.type === 'furniture' || h.ent.type === 'prop' || h.ent.type === 'bush') && Math.abs(sp) > 8) { G.World.damage(h.ent, 200, { by: d }); this.speed *= 0.6; }
          else { if (Math.abs(sp) > 12) { this.hurt(Math.abs(sp) * 2); G.Audio.play('hit_metal', { pos: [this.pos.x, this.pos.y, this.pos.z] }); } this.speed = -sp * 0.25; }
        }
      }
      this.pos.x += fx * this.speed * dt; this.pos.z += fz * this.speed * dt;
      // hauteur : terrain sous les 4 roues
      const T = G.Terrain;
      const hf = T.height(this.pos.x + fx * 1.1, this.pos.z + fz * 1.1), hb = T.height(this.pos.x - fx * 1.1, this.pos.z - fz * 1.1);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const hr = T.height(this.pos.x + rx * 0.9, this.pos.z + rz * 0.9), hl = T.height(this.pos.x - rx * 0.9, this.pos.z - rz * 0.9);
      let gy = Math.max((hf + hb) / 2, (hr + hl) / 2);
      gy = Math.max(gy, P.supportAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 0.8, 0.8));
      if (gy < -0.6) { gy = -0.6; this.speed *= Math.pow(0.3, dt); } // dans l'eau
      this.groundY = gy;
      this.vy -= 22 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= gy) { if (this.vy < -14) this.hurt(-this.vy * 3); this.pos.y = gy; this.vy = Math.max(0, this.vy); }
      this.pitch = U.damp(this.pitch, grounded ? -Math.atan2(hf - hb, 2.2) : this.pitch, 8, dt);
      this.roll = U.damp(this.roll, grounded ? Math.atan2(hr - hl, 1.8) * -1 : this.roll, 8, dt);
      for (const w of this.m.userData.wheels) w.rotation.x += this.speed * dt / 0.42;
      this.sync();
      // écrase les personnages
      if (Math.abs(this.speed) > 7) for (const a of CB.actors) {
        if (a === d || a.dead || !a.hittable() || a.vehicle) continue;
        if (Math.hypot(a.pos.x - this.pos.x, a.pos.z - this.pos.z) < (this.isCar ? 2.4 : 1.9) && Math.abs(a.pos.y - this.pos.y) < 1.5 && !a._runT) {
          CB.damageActor(a, Math.abs(this.speed) * 3, { by: d, weapon: 'kart', point: [a.pos.x, a.pos.y + 1, a.pos.z] });
          a.vel.x += fx * this.speed * 0.7; a.vel.y += 6; a.vel.z += fz * this.speed * 0.7; a._runT = 0.6;
        }
      }
      for (const a of CB.actors) if (a._runT) { a._runT -= dt; if (a._runT <= 0) a._runT = 0; }
      // poussière
      if (grounded && Math.abs(this.speed) > 8 && Math.random() < 0.4 && Math.hypot(this.pos.x - G.camera.position.x, this.pos.z - G.camera.position.z) < 60) G.FX.dust(this.pos.x - fx * 1.4, this.pos.y, this.pos.z - fz * 1.4, 2, 0.8);
      // son
      if (d && d.isPlayer) G.Audio.setLoop('engine', 0.35, 0, Math.abs(this.speed) / 26);
      else if (d && d.isBot && Math.abs(this.speed) > 8 && Math.random() < 0.004 && Math.hypot(this.pos.x - G.camera.position.x, this.pos.z - G.camera.position.z) < 45) G.Audio.play('car_horn', { pos: [this.pos.x, this.pos.y + 1, this.pos.z] });
    }
    hurt(n) {
      this.hp -= n;
      if (this.hp <= 0 && !this.dead) {
        this.dead = true; this.m.visible = false;
        CB.explode(this.pos.x, this.pos.y + 0.8, this.pos.z, 5, 60, 200, this.driver);
        if (this.driver) X.exitKart(this.driver);
      }
    }
    seatPos() { return this.pos.clone().add(new THREE.Vector3(-Math.cos(this.yaw) * 0.4 * -1, 0.5, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0)); }
  }
  // Radio des karts et bateaux (touche R pour changer de station)
  X.STATIONS = [['disco', 'Radio Disco Fièvre'], ['hype', 'Hype FM'], ['chill', 'Chill Vibes 90.2'], ['floss', 'Floss Radio'], ['march', 'Fanfare Royale'], [null, 'Radio éteinte']];
  X.station = 0;
  X.radio = function (on) {
    const cur = G.Audio.music && !G.Audio.music.stopped ? G.Audio.music.name : null;
    const st = X.STATIONS[X.station];
    if (on && st[0]) { if (cur !== 'emote_' + st[0]) G.Audio.playMusic('emote_' + st[0], { vol: 0.4 }); }
    else if (cur && cur.startsWith('emote_')) G.Audio.stopMusic(0.6);
  };
  X.nextStation = function () {
    X.station = (X.station + 1) % X.STATIONS.length;
    X.radio(true);
    G.HUD.notify('📻 ' + X.STATIONS[X.station][1], 1.6);
    G.Audio.play('ui_click');
  };
  X.enterKart = function (a, k) {
    if (k.driver || k.dead) return;
    k.driver = a; a.vehicle = k; a.prevState = a.state; a.state = 'vehicle';
    a.buildMode = false; a.cancelUse(); a.reloadT = 0; a.stopEmote();
    a.char.anim.mode = k.isTurret ? 'ground' : 'sit'; a.refreshHeld();
    if (a.isPlayer && G.Match) { const ev = k.isMech ? 'mech' : k.isBoar ? 'boar' : k.isHeli ? 'heli' : k.isTurret ? 'turret' : null; if (ev) G.Match.challengeEvent(ev); }
    if (k.isBoar) G.Audio.play('boar', {}); else if (!k.isTurret) G.Audio.play('car_horn', { pos: [k.pos.x, k.pos.y, k.pos.z] }); else G.Audio.play('reload', {});
    if (a.isPlayer && !k.isPlane && !k.isHeli && !k.isTurret && !k.isMech && !k.isBoar) { X.radio(true); if (X.STATIONS[X.station][0]) G.HUD.notify('📻 ' + X.STATIONS[X.station][1] + ' (R : changer)', 2); }
  };
  X.exitKart = function (a) {
    const k = a.vehicle;
    if (!k) return;
    k.driver = null; a.vehicle = null;
    a.state = a.inLobby ? 'lobby' : 'ground'; a.char.anim.mode = 'ground'; a.heldKey = null;
    if (a.isPlayer) X.radio(false);
    const rx = Math.cos(k.yaw), rz = -Math.sin(k.yaw);
    a.pos.set(k.pos.x + rx * (k.isMech ? 2.8 : 1.8), k.pos.y + 0.5, k.pos.z + rz * (k.isMech ? 2.8 : 1.8));
    a.vel.set(rx * 2, 3, rz * 2);
    G.Audio.setLoop('engine', 0);
    // éjection d'un avion en vol : chute libre puis planeur
    if ((k.isPlane || k.isHeli) && k.pos.y - Math.max(G.Terrain.height(k.pos.x, k.pos.z), 0) > 6) { a.startSkydive(k.pos.x, k.pos.y - 1.5, k.pos.z, Math.sin(k.yaw) * k.speed * 0.3, Math.cos(k.yaw) * k.speed * 0.3); a.inLobby = false; }
    a.refreshHeld();
  };
  // appelé par Actor.update quand state === 'vehicle'
  X.updateRider = function (a, dt) {
    const k = a.vehicle;
    if (!k || k.dead) { X.exitKart(a); return; }
    k.update(dt);
    const lx = k.seat ? k.seat[0] : 0.4, lz = k.seat ? k.seat[2] : -0.2; // siège conducteur (local)
    const c = Math.cos(k.yaw), s = Math.sin(k.yaw);
    a.pos.set(k.pos.x + c * lx + s * lz, k.pos.y + (k.seat ? k.seat[1] + 0.45 : 0.45), k.pos.z - s * lx + c * lz);
    a.vel.set(Math.sin(k.yaw) * k.speed, 0, Math.cos(k.yaw) * k.speed);
    a.yaw = k.yaw + Math.PI;
    a.char.anim.mode = k.isTurret ? 'ground' : 'sit';
    if (k.isTurret) { a.pos.y = G.Phys.supportAt(a.pos.x, a.pos.z, k.pos.y + 1, 0.3, 0.6); a.char.anim.hold = 'rifle'; }
    a.grounded = true;
  };

  // ------------------------------------------------------------
  //  LARGAGES DE RAVITAILLEMENT
  // ------------------------------------------------------------
  function dropModel() {
    const g = new THREE.Group();
    const crate = new THREE.Group(); g.add(crate);
    mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), mat(0x2a6ad8, 0x0a2a6a, 0.4), 0, 0.6, 0, crate);
    const trim = mat(0xf0c030, 0x6a4a00, 0.5);
    for (const y of [0.1, 1.1]) mesh(new THREE.BoxGeometry(1.46, 0.12, 1.46), trim, 0, y, 0, crate);
    for (const [x, z] of [[-0.68, -0.68], [0.68, -0.68], [-0.68, 0.68], [0.68, 0.68]]) mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), trim, x, 0.6, z, crate);
    const bal = new THREE.Group(); bal.position.y = 5.5; g.add(bal);
    mesh(new THREE.SphereGeometry(2.2, 14, 10), mat(0x3a8ae8), 0, 0, 0, bal).scale.y = 1.2;
    mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.5, 16, 1, true), trim, 0, 0, 0, bal);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const r = mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.4, 4), mat(0x2a2a2a), x * 1.4, 3.3, z * 1.4, g); r.rotation.z = x * 0.15; r.rotation.x = -z * 0.15; }
    // faisceau
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 200, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x5ab4ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 100; g.add(beam);
    g.userData.balloon = bal; g.userData.beam = beam;
    g.traverse((o) => { if (o.isMesh && o !== beam) o.castShadow = true; });
    return g;
  }
  X.spawnDrop = function (px, pz) {
    const S = G.Storm;
    const c = S.next || S.cur;
    const q = px != null ? [px, pz] : G.Terrain.randomLandPoint(Math.random, c.x, c.z, Math.max(20, c.r * 0.7), 1.5);
    const y = P.supportAt(q[0], q[1], 300, 0.8, 0);
    const m = dropModel();
    m.position.set(q[0], y + 160, q[1]);
    G.scene.add(m);
    X.drops.push({ x: q[0], y: y + 160, gy: y, z: q[1], m, landed: false, opened: false, t: 0 });
    G.HUD.notify('UN LARGAGE DE RAVITAILLEMENT ARRIVE !', 3.5);
    G.Audio.play('airdrop', { pos: [q[0], y + 100, q[1]] });
  };
  function updateDrops(dt) {
    for (let i = X.drops.length - 1; i >= 0; i--) {
      const d = X.drops[i];
      d.t += dt;
      if (!d.landed) {
        d.y -= 7 * dt;
        if (d.y <= d.gy) { d.y = d.gy; d.landed = true; G.FX.dust(d.x, d.y, d.z, 20, 1.6); G.Audio.play('land', { pos: [d.x, d.y, d.z], v: 1.5 }); d.m.userData.balloon.visible = false; }
        d.m.position.y = d.y;
        d.m.userData.beam.position.y = 100;
      }
      d.m.userData.balloon.position.y = 5.5 + Math.sin(d.t * 1.5) * 0.2;
      if (d.opened) { d.openT = (d.openT || 0) + dt; if (d.openT > 20) { G.scene.remove(d.m); X.drops.splice(i, 1); } d.m.userData.beam.visible = false; }
      else if (d.landed && Math.random() < 0.3) G.FX.sparkle(d.x, d.y + 1, d.z, 0.4, 0.7, 1, 1);
    }
  }
  X.openDrop = function (d, by) {
    if (d.opened || !d.landed) return;
    d.opened = true;
    G.Audio.play('chest_open', { pos: [d.x, d.y + 1, d.z] });
    const w1 = I.randomWeapon(3); w1.rarity = Math.max(3, w1.rarity); const w2 = I.make(U.pick(['rocket', 'minigun', 'sniper', 'pump']), 4);
    const loot = [{ kind: 'item', item: I.make(w1.id, 4) }, { kind: 'item', item: w2 }, { kind: 'item', item: I.make(U.pick(['chug', 'slurp', 'shieldpot'])) }, { kind: 'item', item: I.make('medkit') },
      { kind: 'ammo', type: I.WEAPONS[w1.id].ammo, amount: 60 }, { kind: 'ammo', type: I.WEAPONS[w2.id].ammo, amount: 30 }, { kind: 'mat', type: 'metal', amount: 100 }, { kind: 'mat', type: 'stone', amount: 100 }];
    loot.push({ kind: 'gold', type: 'gold', amount: 100 });
    L.spill(loot, d.x, d.y + 1, d.z, 1);
    d.m.children[0].visible = false;
    for (let i = 0; i < 40; i++) G.FX.glow.spawn(d.x, d.y + 1, d.z, U.rand(-3, 3), U.rand(2, 7), U.rand(-3, 3), 0.4, 0.7, 1, 0.3, 1, 5, 1);
  };

  // ------------------------------------------------------------
  //  LAMAS À BUTIN
  // ------------------------------------------------------------
  function llamaModel() {
    const g = new THREE.Group();
    const purple = mat(0x8a5ae0, 0x3a1a6a, 0.3), pink = mat(0xff6ab0), yellow = mat(0xf0d040), blue = mat(0x40b0ff);
    mesh(new THREE.BoxGeometry(0.9, 0.8, 1.6), purple, 0, 1.1, 0, g);
    mesh(new THREE.BoxGeometry(0.4, 1.1, 0.4), purple, 0, 1.9, 0.65, g);
    mesh(new THREE.BoxGeometry(0.45, 0.4, 0.6), purple, 0, 2.5, 0.8, g);
    mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), pink, -0.14, 2.85, 0.7, g); mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), pink, 0.14, 2.85, 0.7, g);
    for (const [x, z] of [[-0.3, -0.6], [0.3, -0.6], [-0.3, 0.6], [0.3, 0.6]]) mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), purple, x, 0.4, z, g);
    mesh(new THREE.BoxGeometry(0.95, 0.12, 1.2), yellow, 0, 1.52, 0, g);
    mesh(new THREE.BoxGeometry(0.97, 0.3, 0.2), pink, 0, 1.1, 0.3, g); mesh(new THREE.BoxGeometry(0.97, 0.3, 0.2), blue, 0, 1.1, -0.3, g);
    mesh(new THREE.BoxGeometry(0.06, 0.08, 0.02), mat(0x111111), -0.14, 2.55, 1.11, g); mesh(new THREE.BoxGeometry(0.06, 0.08, 0.02), mat(0x111111), 0.14, 2.55, 1.11, g);
    return g;
  }
  X.spawnLlamas = function () {
    for (const l of X.llamas) { G.scene.remove(l.m); disposeTree(l.m); }
    X.llamas = [];
    for (let i = 0; i < 3; i++) {
      const q = G.Terrain.randomLandPoint(Math.random, U.rand(-350, 350), U.rand(-350, 350), 120, 3);
      if (G.Veg.inPOI(q[0], q[1], 1.2)) continue;
      const m = llamaModel();
      const y = G.Terrain.height(q[0], q[1]);
      m.position.set(q[0], y, q[1]); m.rotation.y = Math.random() * 6;
      G.scene.add(m);
      X.llamas.push({ x: q[0], y, z: q[1], m, opened: false });
    }
  };
  X.openLlama = function (l, by) {
    if (l.opened) return;
    l.opened = true;
    G.Audio.play('chest_open', { pos: [l.x, l.y + 1, l.z] });
    G.FX.explosion(l.x, l.y + 1.2, l.z, 1.2);
    for (let i = 0; i < 60; i++) G.FX.glow.spawn(l.x, l.y + 1.5, l.z, U.rand(-5, 5), U.rand(2, 9), U.rand(-5, 5), Math.random(), Math.random() * 0.5 + 0.5, 1, 0.3, 1.2, 6, 1);
    l.m.visible = false;
    L.spill([{ kind: 'mat', type: 'wood', amount: 200 }, { kind: 'mat', type: 'stone', amount: 200 }, { kind: 'mat', type: 'metal', amount: 200 }, { kind: 'item', item: I.randomConsumable() }, { kind: 'item', item: I.randomConsumable() }, { kind: 'item', item: I.make('shieldpot') },
      { kind: 'ammo', type: 'medium', amount: 60 }, { kind: 'ammo', type: 'light', amount: 60 }, { kind: 'ammo', type: 'shells', amount: 20 }, { kind: 'ammo', type: 'heavy', amount: 12 }, { kind: 'item', item: I.make('grenade', null, 4) }, { kind: 'gold', type: 'gold', amount: 150 }, { kind: 'item', item: I.make('treasuremap') }], l.x, l.y + 1, l.z, 1.3);
  };

  // ------------------------------------------------------------
  //  POMMES & CHAMPIGNONS
  // ------------------------------------------------------------
  let appleGeo, appleMat, mushGeo, mushMat, stemMat;
  X.spawnForage = function () {
    for (const f of X.forage) G.scene.remove(f.m);
    X.forage = [];
    if (!appleGeo) { appleGeo = new THREE.SphereGeometry(0.14, 8, 6); appleMat = mat(0xd82a2a, 0x400000, 0.3); mushGeo = new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); mushMat = mat(0x3a8aff, 0x103070, 0.5); stemMat = mat(0xf0e8d8); }
    const trees = G.Veg.trees.filter((t) => t.vegType === 'oak' || t.vegType === 'birch');
    for (let i = 0; i < 70 && trees.length; i++) {
      const t = U.pick(trees);
      const a = Math.random() * 6.28, r = U.rand(1.2, 2.6);
      const x = t.pos.x + Math.cos(a) * r, z = t.pos.z + Math.sin(a) * r;
      const y = G.Terrain.height(x, z);
      const m = new THREE.Mesh(appleGeo, appleMat); m.position.set(x, y + 0.12, z); G.scene.add(m);
      X.forage.push({ kind: 'apple', x, y, z, m, taken: false });
    }
    const pines = G.Veg.trees.filter((t) => t.vegType === 'pine');
    for (let i = 0; i < 45 && pines.length; i++) {
      const t = U.pick(pines);
      const a = Math.random() * 6.28, r = U.rand(1.0, 2.2);
      const x = t.pos.x + Math.cos(a) * r, z = t.pos.z + Math.sin(a) * r;
      const y = G.Terrain.height(x, z);
      const m = new THREE.Group(); m.position.set(x, y, z);
      const cap = new THREE.Mesh(mushGeo, mushMat); cap.position.y = 0.2; m.add(cap);
      const st = new THREE.Mesh(X.stemGeo || (X.stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.22, 6)), stemMat); st.position.y = 0.1; m.add(st);
      G.scene.add(m);
      X.forage.push({ kind: 'mushroom', x, y, z, m, taken: false });
    }
  };
  X.eatForage = function (a, f) {
    if (f.taken) return;
    if (f.kind === 'apple') { if (a.health >= 100) { if (a.isPlayer) G.HUD.notify('Santé déjà au maximum', 1); return; } a.health = Math.min(100, a.health + 5); G.Audio.play('heal_done', { pos: [f.x, f.y, f.z] }); }
    else { if (a.shield >= 100) { if (a.isPlayer) G.HUD.notify('Bouclier déjà au maximum', 1); return; } a.shield = Math.min(100, a.shield + 5); G.Audio.play('shield_done', { pos: [f.x, f.y, f.z] }); }
    f.taken = true; f.m.visible = false;
    G.FX.healParticles(f.x, f.y, f.z, f.kind === 'mushroom');
  };

  // ------------------------------------------------------------
  //  FEUX DE CAMP (soignent quand on les allume)
  // ------------------------------------------------------------
  X.spawnFires = function () {
    for (const f of X.fires) if (f.m) { G.scene.remove(f.m); if (!f.portable) disposeTree(f.m); }
    X.fires = [];
    for (const l of G.POI.lights) if (l[4] === 'fire') X.fires.push({ x: l[0], y: l[1] - 1, z: l[2], lit: false, t: 0 });
    // quelques feux supplémentaires dans la nature
    for (let i = 0; i < 6; i++) {
      const q = G.Terrain.randomLandPoint(Math.random, U.rand(-380, 380), U.rand(-380, 380), 100, 3);
      if (G.Veg.inPOI(q[0], q[1], 1.1)) continue;
      const y = G.Terrain.height(q[0], q[1]);
      const g = new THREE.Group(); g.position.set(q[0], y, q[1]);
      for (let k = 0; k < 5; k++) { const lg = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 5), mat(0x6a4a30), Math.cos(k * 1.25) * 0.25, 0.15, Math.sin(k * 1.25) * 0.25, g); lg.rotation.z = 1.2; lg.rotation.y = k * 1.25; }
      for (let k = 0; k < 8; k++) mesh(new THREE.DodecahedronGeometry(0.16, 0), mat(0x8a8a8a), Math.cos(k * 0.8) * 0.6, 0.08, Math.sin(k * 0.8) * 0.6, g);
      G.scene.add(g);
      X.fires.push({ x: q[0], y, z: q[1], lit: false, t: 0, m: g });
    }
  };
  function updateFires(dt) {
    for (const f of X.fires) {
      if (!f.lit) continue;
      f.t -= dt;
      if (f.t <= 0) { f.lit = false; if (f.portable && f.m) { G.scene.remove(f.m); f.m = null; } continue; }
      if (Math.random() < 0.8 && Math.hypot(f.x - G.camera.position.x, f.z - G.camera.position.z) < 80) {
        G.FX.glow.spawn(f.x + U.rand(-0.3, 0.3), f.y + 0.3, f.z + U.rand(-0.3, 0.3), U.rand(-0.2, 0.2), U.rand(1, 2.5), U.rand(-0.2, 0.2), 1, U.rand(0.4, 0.7), 0.1, U.rand(0.25, 0.5), 0.6, -1, 1);
        if (Math.random() < 0.2) G.FX.smoke.spawn(f.x, f.y + 1, f.z, 0, 1.2, 0, 0.4, 0.4, 0.4, 1.2, 2, -0.2, 0.5, 2);
      }
      f.healT = (f.healT || 0) + dt;
      if (f.healT >= 1) {
        f.healT = 0;
        for (const a of CB.actors) if (!a.dead && Math.hypot(a.pos.x - f.x, a.pos.z - f.z) < 4 && a.health < 100) { a.health = Math.min(100, a.health + 2); if (a.isPlayer) G.FX.healParticles(a.pos.x, a.pos.y, a.pos.z, false); }
      }
    }
  }

  // ------------------------------------------------------------
  //  DISTRIBUTEURS AUTOMATIQUES (achat avec des matériaux)
  // ------------------------------------------------------------
  X.initVendings = function () {
    X.vendings = [];
    for (const e of G.World.ents) {
      if (e.type !== 'furniture' || !e.refs.length) continue;
      // repère les distributeurs : entité métal de ~1x2x0.8 avec une vitrine lumineuse
      if (e.mat === 'metal' && Math.abs((e.maxY - e.minY) - 2.0) < 0.05 && e.refs.length === 2 && e.refs[1].kit === 'glow') X.vendings.push({ e, x: (e.minX + e.maxX) / 2, y: e.minY, z: (e.minZ + e.maxZ) / 2 });
    }
  };
  X.resetVendings = function () {
    for (const v of X.vendings) {
      const r = U.weighted([[2, 50], [3, 35], [4, 15]]);
      v.item = I.randomWeapon(2); v.item = I.make(v.item.id, r);
      v.price = [0, 0, 150, 300, 500][v.item.rarity];
      v.mat = U.pick(['wood', 'stone', 'metal']);
      v.used = false;
    }
  };

  // ------------------------------------------------------------
  //  OBJETS SPÉCIAUX : grappin, faille, fort portatif
  // ------------------------------------------------------------
  let cable = null;
  X.useSpecial = function (a, it, o, d) {
    const c = I.CONSUMABLES[it.id];
    if (!c || a.fireCd > 0) return false;
    if (c.special === 'fish') return G.Extras2.useRod(a, it, o, d);
    const consume = () => { it.count--; if (it.count <= 0) { a.slots[a.sel] = null; a.sel = a.firstWeaponSlot(); a.refreshHeld(); } };
    if (c.special === 'treasure') return G.Treasure ? G.Treasure.use(a, it, consume) : false;
    if (c.special === 'scan') {
      const p = a.pos; let n = 0;
      for (let i = 0; i < 48; i++) { const an = i / 48 * Math.PI * 2; G.FX.glow.spawn(p.x, p.y + 1, p.z, Math.cos(an) * 30, 0, Math.sin(an) * 30, 0.2, 0.9, 1, 0.5, 1.2, 0, 0.3, 0); }
      G.Audio.play('ping'); G.Audio.play('card');
      if (a.isPlayer) {
        for (const o of CB.actors) {
          if (o === a || o.dead || o.state === 'bus' || G.Duo.sameTeam(a, o) || (o.folk && !o.hostile) || o.dummy || o.isCreature) continue;
          if (Math.hypot(o.pos.x - p.x, o.pos.z - p.z) > 90) continue;
          G.HUD.enemyPing(o.pos.x, o.pos.y + 1.4, o.pos.z, o, 7); n++;
        }
        G.HUD.notify(n ? 'SCAN : ' + n + ' ADVERSAIRE' + (n > 1 ? 'S' : '') + ' RÉVÉLÉ' + (n > 1 ? 'S' : '') : 'SCAN : aucun adversaire à proximité', 2);
      }
      a.fireCd = 0.6;
      consume();
      return true;
    }
    if (c.special === 'grapple') {
      const h = P.raycast(o.x, o.y, o.z, d.x, d.y, d.z, 90, { mask: 3 });
      if (!h) { if (a.isPlayer) G.Audio.play('build_fail'); return false; }
      a.grapple = { x: h.x, y: h.y, z: h.z, t: 0 };
      a.fireCd = 0.4;
      G.Audio.play('throw', { pos: a.isPlayer ? null : [a.pos.x, a.pos.y, a.pos.z] });
      G.Audio.play('impact', { pos: [h.x, h.y, h.z], mat: 'metal' });
      it.ammo = (it.ammo || 10) - 1;
      if (it.ammo <= 0) { a.slots[a.sel] = null; a.sel = a.firstWeaponSlot(); a.refreshHeld(); }
      return true;
    }
    if (c.special === 'rift') {
      const p = a.pos;
      for (let i = 0; i < 80; i++) G.FX.glow.spawn(p.x, p.y + 1, p.z, U.rand(-4, 4), U.rand(0, 10), U.rand(-4, 4), 0.6, 0.3, 1, 0.4, 1.2, -2, 1);
      G.FX.explosion(p.x, p.y + 1.5, p.z, 1.5);
      G.Audio.play('launchpad', { pos: [p.x, p.y, p.z] });
      a.buildMode = false; a.cancelUse();
      a.state = 'skydive'; a.char.anim.mode = 'skydive';
      a.pos.y = Math.max(p.y, G.Terrain.height(p.x, p.z)) + 170;
      a.vel.set(0, -5, 0);
      a.gliderUsed = false; a.setGlider(false);
      consume(); a.refreshHeld();
      return true;
    }
    if (c.special === 'fort') {
      const g = B_gridAt(a);
      const B = G.Build;
      const had = a.infiniteMats; a.infiniteMats = true;
      for (let k = 0; k < 3; k++) {
        for (const w of [B.wallAt(g.i, g.j, g.k + k, 0, g.yOff), B.wallAt(g.i + 1, g.j, g.k + k, 0, g.yOff), B.wallAt(g.i, g.j, g.k + k, 1, g.yOff), B.wallAt(g.i, g.j + 1, g.k + k, 1, g.yOff)]) B.place(a, w, 'metal', true);
        B.place(a, B.cellTarget('ramp', g.i, g.j, g.k + k, k % 2 ? 2 : 0, g.yOff), 'metal', true);
      }
      const top = B.place(a, B.cellTarget('floor', g.i, g.j, g.k + 3, 0, g.yOff), 'metal', true);
      if (top) { top.editMask = 12; top.mesh.geometry = B.floorGeo(12); B.makeColliders(top); }
      for (const w of [B.wallAt(g.i, g.j, g.k + 3, 0, g.yOff), B.wallAt(g.i + 1, g.j, g.k + 3, 0, g.yOff), B.wallAt(g.i, g.j, g.k + 3, 1, g.yOff), B.wallAt(g.i, g.j + 1, g.k + 3, 1, g.yOff)]) { const e = B.place(a, w, 'metal', true); if (e) { e.editMask = 504; e.mesh.geometry = B.wallGeo(504); B.makeColliders(e); } }
      a.infiniteMats = had;
      G.Audio.play('build', { pos: [a.pos.x, a.pos.y + 2, a.pos.z], mat: 'metal' });
      G.Audio.play('explosion', { pos: [a.pos.x, a.pos.y, a.pos.z], vol: 0.3 });
      G.FX.dust(a.pos.x, a.pos.y, a.pos.z, 20, 1.5);
      a.fireCd = 0.8;
      consume();
      return true;
    }
    return false;
  };
  function B_gridAt(a) { return G.Build.gridAt(a.pos.x, a.pos.y, a.pos.z); }
  // mise à jour du grappin (appelée par Actor)
  X.updateGrapple = function (a, dt) {
    const g = a.grapple;
    g.t += dt;
    const dx = g.x - a.pos.x, dy = g.y - (a.pos.y + 1), dz = g.z - a.pos.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 2.2 || g.t > 2.6 || a.state !== 'ground' && a.state !== 'lobby') {
      a.grapple = null; a.vel.y += 5;
      if (cable) cable.visible = false;
      return false;
    }
    const sp = 34;
    a.vel.set(dx / d * sp, dy / d * sp + 2, dz / d * sp);
    a.grounded = false;
    if (a.isPlayer) {
      if (!cable) { cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x202020 })); cable.frustumCulled = false; G.scene.add(cable); }
      const hp = a.char.J.handR.getWorldPosition(U.v1);
      const pa = cable.geometry.attributes.position;
      pa.setXYZ(0, hp.x, hp.y, hp.z); pa.setXYZ(1, g.x, g.y, g.z); pa.needsUpdate = true;
      cable.visible = true;
    }
    return true;
  };

  // ------------------------------------------------------------
  //  Interactions (touche E)
  // ------------------------------------------------------------
  const inter = [];
  X.interactables = function () {
    inter.length = 0;
    const p = G.player ? G.player.pos : null;
    if (!p) return inter;
    const near = (x, z, r) => Math.abs(x - p.x) < r && Math.abs(z - p.z) < r;
    for (const k of X.karts) if (!k.dead && !k.driver && near(k.pos.x, k.pos.z, 4)) inter.push({ kind: 'kart', obj: k, x: k.pos.x, y: k.pos.y + 0.5, z: k.pos.z, name: k.label || 'Kart tout-terrain', action: k.isTurret ? 'Utiliser' : k.isBoar ? 'Chevaucher' : k.isPlane || k.isHeli || k.isMech ? 'Piloter' : 'Conduire', range: k.isTurret ? 2.6 : k.isBoar ? 2.4 : k.isMech ? 4.2 : k.isPlane || k.isHeli ? 4.8 : k.isBoat ? 3.6 : 3.2 });
    for (const d of X.drops) if (d.landed && !d.opened && near(d.x, d.z, 4)) inter.push({ kind: 'drop', obj: d, x: d.x, y: d.y + 0.6, z: d.z, name: 'Largage de ravitaillement', action: 'Ouvrir', range: 2.8 });
    for (const l of X.llamas) if (!l.opened && near(l.x, l.z, 4)) inter.push({ kind: 'llama', obj: l, x: l.x, y: l.y + 1, z: l.z, name: 'Lama à butin', action: 'Fouiller', range: 2.8 });
    for (const f of X.forage) if (!f.taken && near(f.x, f.z, 3)) inter.push({ kind: 'forage', obj: f, x: f.x, y: f.y, z: f.z, name: f.kind === 'apple' ? 'Pomme' : 'Champignon bouclier', action: f.kind === 'apple' ? 'Manger (+5 PV)' : 'Manger (+5 bouclier)', range: 2 });
    for (const f of X.fires) if (!f.lit && near(f.x, f.z, 4)) inter.push({ kind: 'fire', obj: f, x: f.x, y: f.y + 0.3, z: f.z, name: 'Feu de camp', action: 'Allumer (soigne 2 PV/s)', range: 2.8 });
    if (G.Duo) G.Duo.interactables(inter);
    if (G.Extras2) G.Extras2.interactables(inter);
    if (G.NPC && G.NPC.vaultInteract) G.NPC.vaultInteract(inter);
    if (G.Wild) G.Wild.interactables(inter);
    if (G.Folk) G.Folk.interactables(inter);
    if (G.Bounty) G.Bounty.interactables(inter);
    if (G.Treasure) G.Treasure.interactables(inter);
    if (G.Booths) G.Booths.interactables(inter);
    for (const v of X.vendings) if (!v.used && !v.e.dead && v.item && near(v.x, v.z, 4)) inter.push({ kind: 'vending', obj: v, x: v.x, y: v.y + 1, z: v.z, name: 'Distributeur : ' + I.name(v.item) + ' (' + I.RARITY[v.item.rarity].name + ')', action: 'Acheter — ' + v.price + ' ' + I.MAT[v.mat].name.toLowerCase(), range: 2.6 });
    return inter;
  };
  X.interact = function (a, t) {
    if (t.kind === 'vault') { G.NPC.useKeycard(a); return; }
    if (t.kind === 'chicken') { G.Wild.pick(a, t.obj); return; }
    if (t.kind === 'folk') { if (a.isPlayer) G.Folk.talk(t.obj); return; }
    if (t.kind === 'bounty') { G.Bounty.accept(a, t.obj); return; }
    if (t.kind === 'treasure') { G.Treasure.dig(a); return; }
    if (t.kind === 'booth') { G.Booths.use(a, t.obj); return; }
    if (G.Extras2 && G.Extras2.interact(a, t)) return;
    if (t.kind === 'kart') X.enterKart(a, t.obj);
    else if (t.kind === 'drop') X.openDrop(t.obj, a);
    else if (t.kind === 'llama') X.openLlama(t.obj, a);
    else if (t.kind === 'forage') X.eatForage(a, t.obj);
    else if (t.kind === 'fire') { t.obj.lit = true; t.obj.t = 25; G.Audio.play('build', { pos: [t.obj.x, t.obj.y, t.obj.z], mat: 'wood' }); }
    else if (t.kind === 'vending') {
      const v = t.obj;
      if (a.mats[v.mat] < v.price) { G.HUD.notify('Pas assez de ' + I.MAT[v.mat].name.toLowerCase() + ' (' + v.price + ')', 1.5); G.Audio.play('build_fail'); return; }
      a.mats[v.mat] -= v.price; v.used = true;
      G.Audio.play('pickup');
      L.spill([{ kind: 'item', item: v.item }, { kind: 'ammo', type: I.WEAPONS[v.item.id].ammo, amount: 30 }], v.x, v.y + 1, v.z, 0.5);
    }
  };

  // ------------------------------------------------------------
  X.init = function () {
    // karts le long des routes
    const R = G.MapData.roads;
    const rng = U.RNG(99);
    for (let i = 0; i < 10; i++) {
      const r = R[i % R.length];
      const k = rng.int(0, r.pts.length - 2), t = rng.range(0.25, 0.75);
      const x = U.lerp(r.pts[k][0], r.pts[k + 1][0], t), z = U.lerp(r.pts[k][1], r.pts[k + 1][1], t);
      if (G.Terrain.height(x, z) < 1) continue;
      const ang = Math.atan2(r.pts[k + 1][0] - r.pts[k][0], r.pts[k + 1][1] - r.pts[k][1]);
      X.karts.push(new Kart(x + Math.cos(ang) * 4, z - Math.sin(ang) * 4, ang));
    }
    // quelques karts sur l'île d'attente
    const s = G.MapData.spawnIsland;
    X.karts.push(new Kart(s.x - 10, s.z - 20, 0.5, 0xe0a020));
    X.karts.push(new Kart(s.x + 12, s.z + 18, 2.5, 0x3ac05a));
    X.initVendings();
    if (G.Extras2) G.Extras2.init();
    if (G.Planes) G.Planes.init();
    if (G.Barrels) G.Barrels.init();
    if (G.Bounty) G.Bounty.init();
    if (G.Booths) G.Booths.init();
    if (G.Turrets) G.Turrets.init();
    if (G.Mechs) G.Mechs.init();
    if (G.Boars) G.Boars.init();
    X.spawnCarts();
    X.spawnCars();
    X.spawnSleds();
    X.Kart = Kart;
  };
  X.reset = function () {
    for (const t of X.traps) G.scene.remove(t.m);
    X.traps = [];
    for (const d of X.drops) G.scene.remove(d.m);
    X.drops = [];
    for (const k of X.karts) { if (k.driver) X.exitKart(k.driver); k.reset(); }
    X.spawnLlamas();
    X.spawnForage();
    X.spawnFires();
    X.resetVendings();
    X.dropPhases = {};
    if (G.Extras2) G.Extras2.reset();
  };
  X.update = function (dt) {
    updateTraps(dt);
    for (const k of X.karts) if (!k.driver && !k.isBoat && !k.isPlane && !k.isHeli && !k.isTurret && !k.isMech && !k.isBoar) { if (!k.dead && (Math.abs(k.speed) > 0.05 || k.pos.y > k.groundY + 0.05)) k.update(dt); }
    updateDrops(dt);
    updateFires(dt);
    if (G.Extras2) G.Extras2.update(dt);
    // largages à certaines phases de la tempête
    const S = G.Storm;
    if (S.active && G.Game.state === 'playing') {
      const key = S.phase + ':' + S.state;
      if ((S.phase === 1 || S.phase === 3 || S.phase === 5) && S.state === 'wait' && !X.dropPhases[key] && S.timer < S.PHASES[S.phase][0] - 8) { X.dropPhases[key] = true; X.spawnDrop(); }
    }
    for (const l of X.llamas) if (!l.opened && Math.hypot(l.x - G.camera.position.x, l.z - G.camera.position.z) < 60) { l.m.rotation.y += dt * 0.1; }
  };
})();
