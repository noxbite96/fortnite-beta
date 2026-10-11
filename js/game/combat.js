// ============================================================
//  Combat : tirs, projectiles, explosions, dégâts, éliminations
// ============================================================
(function () {
  const U = G.U, I = G.Items, P = G.Phys, W = G.World;
  const CB = { projectiles: [], actors: [] };
  G.Combat = CB;

  // ------------------------------------------------------------
  //  Rayon contre les personnages
  // ------------------------------------------------------------
  CB.rayActors = function (ox, oy, oz, dx, dy, dz, maxT, ignore) {
    let best = maxT, bestA = null, head = false;
    for (const a of CB.actors) {
      if (a === ignore || a.dead || !a.hittable()) continue;
      const hb = a.hitbox;
      // rejet rapide
      const cx = hb.cx - ox, cy = hb.cy - oy, cz = hb.cz - oz;
      const tc = cx * dx + cy * dy + cz * dz;
      if (tc < -1.5 || tc > best + 1.5) continue;
      const px = cx - dx * tc, py = cy - dy * tc, pz = cz - dz * tc;
      if (px * px + py * py + pz * pz > 4.5) continue;
      // tête (sphère)
      const hx = hb.hx - ox, hy = hb.hy - oy, hz = hb.hz - oz;
      const th = hx * dx + hy * dy + hz * dz;
      const qx = hx - dx * th, qy = hy - dy * th, qz = hz - dz * th;
      const d2 = qx * qx + qy * qy + qz * qz, r2 = hb.hr * hb.hr;
      if (d2 < r2) {
        const t = th - Math.sqrt(r2 - d2);
        if (t > 0 && t < best) { best = t; bestA = a; head = true; }
      }
      // corps (boîte)
      const t2 = rayAABB(ox, oy, oz, dx, dy, dz, hb.minX, hb.minY, hb.minZ, hb.maxX, hb.maxY, hb.maxZ, best);
      if (t2 >= 0 && t2 < best) { best = t2; bestA = a; head = false; }
    }
    // faune (loups, poules)
    const wh = G.Wild && G.Wild.list.length ? G.Wild.ray(ox, oy, oz, dx, dy, dz, best) : null;
    if (wh) return wh;
    if (!bestA) return null;
    return { t: best, actor: bestA, head };
  };
  function rayAABB(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1, maxT) {
    let tmin = 0, tmax = maxT;
    const o = [ox, oy, oz], d = [dx, dy, dz], lo = [x0, y0, z0], hi = [x1, y1, z1];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) return -1; continue; }
      let t1 = (lo[i] - o[i]) / d[i], t2 = (hi[i] - o[i]) / d[i];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    return tmin;
  }

  // Tir instantané : renvoie l'impact le plus proche (monde ou personnage)
  const res = { t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0, actor: null, head: false, ent: null, terrain: false, water: false, mat: 'stone' };
  CB.trace = function (shooter, ox, oy, oz, dx, dy, dz, range) {
    const h = P.raycast(ox, oy, oz, dx, dy, dz, range, { mask: P.BULLET, water: true, ignore: shooter && shooter.vehicleEnt });
    let t = h ? h.t : range;
    const ah = CB.rayActors(ox, oy, oz, dx, dy, dz, t, shooter);
    res.actor = null; res.head = false; res.ent = null; res.terrain = false; res.water = false;
    if (ah) {
      res.t = ah.t; res.actor = ah.actor; res.head = ah.head; res.nx = -dx; res.ny = -dy; res.nz = -dz;
    } else if (h) {
      res.t = h.t; res.nx = h.nx; res.ny = h.ny; res.nz = h.nz; res.ent = h.ent; res.terrain = h.terrain; res.water = h.water;
      res.mat = h.ent ? h.ent.mat : h.terrain ? (G.Terrain.surface(h.x, h.z) === 'sand' ? 'sand' : 'dirt') : 'water';
    } else { res.t = range; }
    // bulles de bouclier : arrêtent les balles dans les deux sens
    const tb = CB.rayBubbles(ox, oy, oz, dx, dy, dz, res.t);
    if (tb >= 0) {
      res.t = tb; res.actor = null; res.head = false; res.ent = BUBBLE; res.terrain = false; res.water = false; res.mat = 'glass';
      res.nx = -dx; res.ny = -dy; res.nz = -dz;
    } else if (!ah && !h) return null;
    res.x = ox + dx * res.t; res.y = oy + dy * res.t; res.z = oz + dz * res.t;
    return res;
  };
  // entité factice de la bulle (indestructible)
  const BUBBLE = { mat: 'glass', invulnerable: true, dead: false, noPickaxe: true, refs: [], meshes: [], type: 'bubble' };
  CB.bubbles = [];
  CB.rayBubbles = function (ox, oy, oz, dx, dy, dz, maxT) {
    let best = -1;
    for (const b of CB.bubbles) {
      const lx = ox - b.x, ly = oy - b.y, lz = oz - b.z;
      const bq = lx * dx + ly * dy + lz * dz, c = lx * lx + ly * ly + lz * lz - b.r * b.r;
      const disc = bq * bq - c;
      if (disc < 0) continue;
      const sq = Math.sqrt(disc);
      const inside = c < 0;
      const t = inside ? -bq + sq : -bq - sq;
      if (t < 0.02 || t > maxT) continue;
      if (oy + dy * t < b.y - 0.3) continue; // demi-sphère
      if (best < 0 || t < best) best = t;
    }
    return best;
  };
  let bubbleTex = null;
  function hexTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(120,220,255,0.25)'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(200,245,255,0.95)'; x.lineWidth = 3;
    const r = 16, h = r * Math.sqrt(3);
    for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) {
      const cx = col * r * 3 + (row % 2 ? r * 1.5 : 0), cy = row * h / 2;
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); return t;
  }
  CB.spawnBubble = function (x, y, z, r, dur) {
    if (!bubbleTex) bubbleTex = hexTexture();
    const gy = Math.max(G.Phys.supportAt(x, z, y + 1, 0.2, 0), y - 1.5);
    const mat = new THREE.MeshBasicMaterial({ map: bubbleTex, color: 0x9ae8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    mesh.position.set(x, gy, z); mesh.scale.setScalar(0.01);
    G.scene.add(mesh);
    CB.bubbles.push({ x, y: gy, z, r, t: dur, dur, mesh, mat });
    G.Audio.play('shield_done', { pos: [x, gy + 1, z] }); G.Audio.play('launchpad', { pos: [x, gy + 1, z], vol: 0.4 });
    for (let i = 0; i < 40; i++) G.FX.glow.spawn(x, gy + 0.3, z, U.rand(-5, 5), U.rand(0, 4), U.rand(-5, 5), 0.5, 0.9, 1, 0.2, 0.8, 2, 1);
  };
  CB.updateBubbles = function (dt) {
    for (let i = CB.bubbles.length - 1; i >= 0; i--) {
      const b = CB.bubbles[i];
      b.t -= dt;
      const age = b.dur - b.t;
      const s = Math.min(1, age * 4) * (b.t < 0.5 ? Math.max(0.01, b.t * 2) : 1);
      b.mesh.scale.setScalar(Math.max(0.01, 1 - Math.pow(1 - s, 3)));
      b.mat.opacity = 0.45 + Math.sin(age * 3) * 0.08;
      if (b.t <= 0) { G.scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mat.dispose(); CB.bubbles.splice(i, 1); }
    }
  };
  // ------------------------------------------------------------
  //  Nuages : bombe puante (dégâts) et fumigène (bloque la vue des bots)
  // ------------------------------------------------------------
  CB.clouds = [];
  CB.spawnCloud = function (kind, x, y, z, r, dur, by) {
    const gy = Math.max(G.Terrain.height(x, z), y - 1);
    CB.clouds.push({ kind, x, y: gy, z, r, t: dur, dur, by, tick: 0 });
    G.Audio.play(kind === 'stink' ? 'stink' : 'smoke', { pos: [x, gy, z] });
    for (let i = 0; i < 30; i++) G.FX.smoke.spawn(x, gy + 0.5, z, U.rand(-4, 4), U.rand(0.5, 2), U.rand(-4, 4), kind === 'stink' ? 0.45 : 0.85, kind === 'stink' ? 0.75 : 0.87, kind === 'stink' ? 0.2 : 0.9, U.rand(2, 3.5), U.rand(2, 3), -0.1, 1, 1.4);
  };
  CB.updateClouds = function (dt) {
    for (let i = CB.clouds.length - 1; i >= 0; i--) {
      const c = CB.clouds[i];
      c.t -= dt;
      if (c.t <= 0) { CB.clouds.splice(i, 1); continue; }
      const k = Math.min(1, c.t / 2);
      const near = Math.hypot(c.x - G.camera.position.x, c.z - G.camera.position.z) < 160;
      if (near && Math.random() < (c.kind === 'smoke' ? 0.9 : 0.6)) for (let j = 0; j < 2; j++) {
        const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * c.r;
        G.FX.smoke.spawn(c.x + Math.cos(a) * rr, c.y + U.rand(0.2, 2.5), c.z + Math.sin(a) * rr, U.rand(-0.4, 0.4), U.rand(0.1, 0.5), U.rand(-0.4, 0.4), c.kind === 'stink' ? 0.4 : 0.82, c.kind === 'stink' ? 0.72 : 0.84, c.kind === 'stink' ? 0.18 : 0.88, U.rand(2.5, 4) * k, U.rand(1.5, 2.5), -0.05, 0.6, 1.3);
      }
      if (c.kind === 'stink') {
        c.tick -= dt;
        if (c.tick <= 0) {
          c.tick = 0.5;
          for (const a of CB.actors) {
            if (a.dead || !a.hittable() || a.state === 'vehicle') continue;
            if (Math.hypot(a.pos.x - c.x, a.pos.z - c.z) < c.r && Math.abs(a.pos.y - c.y) < 3.5) CB.damageActor(a, 5, { by: c.by, weapon: 'stink', point: [a.pos.x, a.pos.y + 1.4, a.pos.z] });
          }
        }
      }
    }
  };
  // Le segment a -> b traverse-t-il un nuage de fumée ?
  CB.smokeBlocks = function (ax, ay, az, bx, by, bz) {
    for (const c of CB.clouds) {
      if (c.kind !== 'smoke') continue;
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      let t = ((c.x - ax) * dx + (c.z - az) * dz) / L2; t = Math.max(0, Math.min(1, t));
      const px = ax + dx * t, pz = az + dz * t, py = ay + (by - ay) * t;
      if (Math.hypot(px - c.x, pz - c.z) < c.r * 0.9 && py < c.y + 4) return true;
    }
    return false;
  };
  CB.clearBubbles = function () { for (const b of CB.bubbles) { G.scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mat.dispose(); } CB.bubbles.length = 0; };
  // Grenade à impulsion : projette tout le monde
  CB.impulse = function (x, y, z, radius, by) {
    G.FX.explosion(x, y, z, 1.2);
    for (let i = 0; i < 60; i++) G.FX.glow.spawn(x, y + 0.5, z, U.rand(-8, 8), U.rand(0, 8), U.rand(-8, 8), 0.3, 0.6, 1, 0.3, 0.6, 0, 1.5);
    G.Audio.play('launchpad', { pos: [x, y, z] });
    for (const a of CB.actors) {
      if (a.dead || !a.hittable() || a.state !== 'ground' && a.state !== 'lobby') continue;
      const dx = a.pos.x - x, dy = a.pos.y + 1 - y, dz = a.pos.z - z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) continue;
      const k = U.clamp(1.25 - d / radius, 0.45, 1);
      const hl = Math.hypot(dx, dz) || 1;
      a.vel.x += dx / hl * 16 * k; a.vel.z += dz / hl * 16 * k; a.vel.y = Math.max(a.vel.y, 0) + 17 * k;
      a.grounded = false; a.noFallT = 4; a.slideT = 0; a.mantle = null;
      if (a.isBot) a.ai.stuckT = 0;
    }
  };
  // Chug Splash : soigne dans la zone
  CB.splash = function (x, y, z, radius, heal, by) {
    for (let i = 0; i < 50; i++) G.FX.glow.spawn(x, y + 0.3, z, U.rand(-4, 4), U.rand(1, 5), U.rand(-4, 4), 0.2, 0.7, 1, 0.22, 0.8, 9, 0.5);
    G.FX.waterSplash(x, z, true);
    G.Audio.play('splash', { pos: [x, y, z] }); G.Audio.play('heal_done', { pos: [x, y, z] });
    for (const a of CB.actors) {
      if (a.dead || !a.hittable()) continue;
      const d = Math.hypot(a.pos.x - x, a.pos.y + 1 - y, a.pos.z - z);
      if (d > radius) continue;
      if (a.health < 100) a.health = Math.min(100, a.health + heal);
      else a.shield = Math.min(100, a.shield + heal);
      if (a.isPlayer || a.nearPlayer) for (let i = 0; i < 8; i++) G.FX.healParticles(a.pos.x, a.pos.y, a.pos.z, a.health >= 100);
    }
  };

  // Multiplicateur de distance
  function falloff(w, d) {
    const f = w.fall;
    if (d <= f[0]) return 1;
    if (d >= f[1]) return f[2];
    return U.lerp(1, f[2], (d - f[0]) / (f[1] - f[0]));
  }

  const dir = new THREE.Vector3(), tmpV = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), upv = new THREE.Vector3();
  // Direction avec dispersion aléatoire dans un cône
  function spreadDir(out, base, spread) {
    if (spread <= 0) return out.copy(base);
    side.crossVectors(base, up); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    upv.crossVectors(side, base).normalize();
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
    out.copy(base).addScaledVector(side, Math.cos(a) * r).addScaledVector(upv, Math.sin(a) * r).normalize();
    return out;
  }
  CB.spreadDir = spreadDir;

  // ------------------------------------------------------------
  //  Tir d'une arme
  //  eye : origine réelle (tête du tireur), aimOrigin/aimDir : rayon de visée
  // ------------------------------------------------------------
  CB.fireWeapon = function (shooter, item, eye, aimOrigin, aimDir, spread, muzzlePos) {
    const w = I.WEAPONS[item.id];
    const base = I.damage(item);
    const isPlayer = shooter.isPlayer;
    const pellets = w.pellets || 1;
    const pelletDmg = base / pellets;
    let hitAny = false, headAny = false, total = 0;
    const perTarget = new Map();
    const audible = shooter.isPlayer || shooter.nearPlayer;
    if (w.melee) return CB.meleeArc(shooter, item, w, base, eye, aimDir, audible);
    if (w.flame) return CB.flameCone(shooter, item, w, base, eye, aimDir, muzzlePos, audible);
    if (w.projectile) {
      spreadDir(dir, aimDir, spread);
      // point visé via le rayon caméra
      const aim = CB.trace(shooter, aimOrigin.x, aimOrigin.y, aimOrigin.z, dir.x, dir.y, dir.z, w.range);
      const tx = aim ? aim.x : aimOrigin.x + dir.x * w.range, ty = aim ? aim.y : aimOrigin.y + dir.y * w.range, tz = aim ? aim.z : aimOrigin.z + dir.z * w.range;
      const sp = muzzlePos || eye;
      // les bots compensent la chute des flèches
      if (w.projectile.arrow && !shooter.isPlayer) { const tg = shooter.ai && shooter.ai.target; const dd = Math.min(Math.hypot(tx - sp.x, tz - sp.z), tg ? Math.hypot(tg.pos.x - sp.x, tg.pos.z - sp.z) + 1 : 60), sv = w.projectile.speed * (0.4 + 0.6 * (shooter.chargeK || 1)), tt = dd / sv; tmpV.set(tx - sp.x, ty - sp.y + 0.5 * w.projectile.grav * tt * tt, tz - sp.z).normalize(); }
      else tmpV.set(tx - sp.x, ty - sp.y, tz - sp.z).normalize();
      CB.spawnProjectile(shooter, item, sp.x, sp.y, sp.z, tmpV.x, tmpV.y, tmpV.z);
      return { hit: false };
    }
    for (let p = 0; p < pellets; p++) {
      spreadDir(dir, aimDir, spread);
      // 1) point visé depuis la caméra
      const aim = CB.trace(shooter, aimOrigin.x, aimOrigin.y, aimOrigin.z, dir.x, dir.y, dir.z, w.range);
      let tx, ty, tz;
      if (aim) { tx = aim.x; ty = aim.y; tz = aim.z; } else { tx = aimOrigin.x + dir.x * w.range; ty = aimOrigin.y + dir.y * w.range; tz = aimOrigin.z + dir.z * w.range; }
      // 2) tir réel depuis les yeux du tireur vers ce point
      tmpV.set(tx - eye.x, ty - eye.y, tz - eye.z);
      const dist = tmpV.length();
      tmpV.divideScalar(dist || 1);
      const hit = CB.trace(shooter, eye.x, eye.y, eye.z, tmpV.x, tmpV.y, tmpV.z, Math.min(w.range, dist + 0.6));
      const mz = muzzlePos || eye;
      if (hit) {
        const d = hit.t;
        const dmg = pelletDmg * falloff(w, d);
        if (hit.actor) {
          const hd = hit.head;
          const k = perTarget.get(hit.actor) || { dmg: 0, head: false, x: hit.x, y: hit.y, z: hit.z };
          k.dmg += dmg * (hd ? w.head * (shooter.aug && shooter.aug.tete ? 1.25 : 1) : 1); k.head = k.head || hd;
          perTarget.set(hit.actor, k);
          hitAny = true; headAny = headAny || hd;
          if (audible || hit.actor.isPlayer) G.FX.hitSpark(hit.x, hit.y, hit.z, hit.actor.shield > 0, hd);
        } else if (hit.ent && !hit.ent.dead) {
          const bd = dmg * (w.buildDmg || 1);
          if (hit.ent.mat === 'glass') W.damage(hit.ent, 999, { by: shooter });
          else {
            W.damage(hit.ent, bd, { by: shooter, point: [hit.x, hit.y, hit.z] });
            if (isPlayer && (hit.ent.type === 'build' || hit.ent.type === 'piece')) { total += 0; if (pellets === 1 || p === 0) G.FX.damageNumber(hit.x, hit.y, hit.z, bd * (pellets > 1 ? pellets * 0.6 : 1), 'build'); }
          }
          if (audible) { G.FX.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, hit.ent.mat); if (hit.ent.type !== 'bubble' && hit.ent.mat !== 'glass' && !hit.ent.moving) G.FX.hole(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz); if (p < 2) G.Audio.play('impact', { pos: [hit.x, hit.y, hit.z], mat: hit.ent.mat, vol: 0.6 }); }
        } else if (audible) {
          if (hit.water) G.FX.waterSplash(hit.x, hit.z, false);
          else { G.FX.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, hit.mat); G.FX.hole(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz); }
        }
        if (audible && (p < 3)) G.FX.tracer(mz.x, mz.y, mz.z, hit.x, hit.y, hit.z, shooter.isPlayer ? 0xfff2a0 : 0xffd080, pellets > 1 ? 0.03 : 0.045);
      } else if (audible && p < 3) {
        G.FX.tracer(mz.x, mz.y, mz.z, eye.x + tmpV.x * w.range, eye.y + tmpV.y * w.range, eye.z + tmpV.z * w.range, 0xfff2a0, 0.04);
      }
      // balles qui frôlent le joueur
      if (!isPlayer && G.player && !G.player.dead) {
        const pl = G.player;
        const cx = pl.hitbox.cx - eye.x, cy = pl.hitbox.cy - eye.y, cz = pl.hitbox.cz - eye.z;
        const tc = cx * tmpV.x + cy * tmpV.y + cz * tmpV.z;
        if (tc > 2) { const px = cx - tmpV.x * tc, py = cy - tmpV.y * tc, pz = cz - tmpV.z * tc; const dd = px * px + py * py + pz * pz; if (dd < 4 && dd > 0.3 && p === 0) G.Audio.play('whiz', { pos: [pl.pos.x + px * 0.3, pl.pos.y + 1.5, pl.pos.z + pz * 0.3] }); }
      }
    }
    for (const [target, k] of perTarget) {
      CB.damageActor(target, k.dmg, { by: shooter, head: k.head, weapon: item.id, point: [k.x, k.y, k.z] });
      if (w.knock && !target.dead && target.vel && !target.vehicle) { target.vel.x += aimDir.x * w.knock * 0.8; target.vel.z += aimDir.z * w.knock * 0.8; target.vel.y += 6; target.grounded = false; target.flingT = 0.9; }
    }
    return { hit: hitAny, head: headAny };
  };

  // ------------------------------------------------------------
  //  Dégâts aux personnages
  // ------------------------------------------------------------
  const by_isPlayer = (o) => !!(o && o.by && o.by.isPlayer);
  CB.damageActor = function (t, dmg, o) {
    if (!t || t.dead || t.invulnerable) return 0;
    o = o || {};
    // pas de tir allié
    if (o.by && o.by !== t && G.Duo && G.Duo.sameTeam(o.by, t)) return 0;
    // les combats entre bots durent plus longtemps (rythme de partie proche de Fortnite)
    if (o.by && o.by.isBot && t.isBot && !o.storm) dmg *= G.Match && G.Match.rumble ? 0.85 : 0.38;
    // difficulté : les bots (et les boss) font moins mal au joueur en facile
    if (o.by && o.by.isBot && t.isPlayer && !o.storm && G.Match) dmg *= [0.5, 0.8, 1, 1.1][U.clamp(Math.round(G.Match.botDiff == null ? 1 : G.Match.botDiff), 0, 3)];
    if (t.vehicle && t.vehicle.isMech && !o.storm && !o.fall) { t.vehicle.hurt(dmg * 0.8); dmg *= 0.2; if (by_isPlayer(o)) G.FX.damageNumber(t.pos.x, t.pos.y + 1.5, t.pos.z, dmg * 4, 'build'); }
    dmg = Math.round(dmg);
    if (dmg <= 0) return 0;
    if (t.overshield > 0 || t.osT != null) t.osT = 0;
    t.calmT = 0;
    let toShield = 0, toHealth = 0, toOver = 0;
    if (t.overshield > 0 && !o.storm && !o.fall) { toOver = Math.min(t.overshield, dmg); t.overshield -= toOver; dmg -= toOver; }
    if (o.storm || o.fall) { toHealth = Math.min(t.health, dmg); }
    else {
      toShield = Math.min(t.shield, dmg);
      toHealth = Math.min(t.health, dmg - toShield);
    }
    const hadShield = t.shield > 0;
    t.shield -= toShield; t.health -= toHealth;
    // votre bouclier vole en éclats
    if (t.isPlayer && hadShield && t.shield <= 0 && !o.storm && !o.fall && G.HUD && G.HUD.shieldBreak) { G.HUD.shieldBreak(); G.Audio.play('shield_break'); }
    // flèches de glace : la cible est ralentie
    const fw = o.weapon && I.WEAPONS[o.weapon];
    if (fw && fw.freeze && t.health > 0) {
      t.slowT = fw.freeze;
      if (G.FX && (t.isPlayer || t.nearPlayer || by_isPlayer(o))) for (let i = 0; i < 16; i++) G.FX.glow.spawn(t.pos.x, t.pos.y + 1, t.pos.z, U.rand(-2, 2), U.rand(0, 3), U.rand(-2, 2), 0.6, 0.9, 1, 0.22, 0.8, 4, 1);
      if (t.isPlayer && G.HUD) G.HUD.notify('❄ RALENTI PAR LA GLACE !', 1.2);
    }
    const done = toShield + toHealth + toOver;
    if (toOver > 0) t.osT = 0;
    const by = o.by;
    // récapitulatif des dégâts (écran de mort du joueur)
    if (t.isPlayer && done > 0) (t.dmgLog || (t.dmgLog = [])).push({ name: by && by !== t ? by.name : o.storm ? 'La tempête' : o.fall ? 'Chute' : o.weapon === 'meteor' ? 'Météorite' : o.weapon === 'wolf' ? 'Loup' : o.weapon === 'raptor' ? 'Raptor' : o.weapon === 'shark' ? 'Requin' : o.weapon === 'cube' ? 'Le Cube' : o.weapon === 'barrel' ? 'Baril explosif' : o.weapon === 'stink' ? 'Bombe puante' : o.weapon === 'burn' ? 'Flammes' : 'Inconnu', dmg: done, weapon: o.weapon, t: G.Game ? G.Game.time : 0 });
    if (by && by.isPlayer && t !== by) t.dmgFromPlayer = (t.dmgFromPlayer || 0) + done;
    if (by && by !== t) {
      by.stats.damage += done;
      t.lastAttacker = by; t.lastAttackTime = G.Game ? G.Game.time : 0;
    }
    if (t.onDamaged) t.onDamaged(done, o);
    // retour visuel pour le joueur
    if (by && by.isPlayer && by !== t) {
      const p = o.point || [t.pos.x, t.pos.y + 1.4, t.pos.z];
      G.FX.damageNumber(p[0], p[1], p[2], dmg + toOver, o.head ? 'head' : toShield > 0 || toOver > 0 ? 'shield' : 'hp');
      if (G.HUD) G.HUD.hitmarker(o.head, t.health <= 0);
      if (o.head) G.Audio.play('headshot'); else if (toShield > 0) G.Audio.play('shield_hit'); else G.Audio.play('hitmarker');
      if (hadShield && t.shield <= 0 && !o.storm) G.Audio.play('shield_break', { pos: [t.pos.x, t.pos.y + 1, t.pos.z] });
    }
    // cible d'entraînement : se relève aussitôt
    if (t.dummy) {
      if (t.health <= 0) { G.FX.eliminate(t.pos.x, t.pos.y, t.pos.z, 0xffd84a); G.Audio.play('eliminated_fx', { pos: [t.pos.x, t.pos.y + 1, t.pos.z] }); t.health = t.maxHealth; t.shield = t.maxShield; }
      return done;
    }
    if (t.health <= 0) {
      if (G.Duo && G.Duo.tryKnock(t, by, o)) return done;
      CB.eliminate(t, by, o);
    }
    return done;
  };

  CB.eliminate = function (victim, killer, o) {
    if (victim.dead) return;
    o = o || {};
    victim.downed = false;
    victim.die(killer, o);
    if (killer && killer !== victim && !victim.npc && !victim.isCreature) { killer.stats.kills++; if (killer.onKill) killer.onKill(victim); }
    else if (killer && victim.npc && killer.isBot && killer.ai.target === victim) killer.ai.target = null;
    if (G.Match) G.Match.onElimination(victim, killer && killer !== victim ? killer : null, o);
  };

  // ------------------------------------------------------------
  //  Projectiles : sniper, roquettes, grenades
  // ------------------------------------------------------------
  const rocketGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
  rocketGeo.rotateX(Math.PI / 2);
  const rocketMat = new THREE.MeshLambertMaterial({ color: 0x5a6a4a });
  const grenadeGeo = new THREE.SphereGeometry(0.1, 8, 6);
  const grenadeMat = new THREE.MeshLambertMaterial({ color: 0x3a4a2a });
  const boogieMat = new THREE.MeshLambertMaterial({ color: 0xff5ad0, emissive: 0x802060 });

  // flèche (avant = +Z)
  let arrowTpl = null, boomTpl = null;
  function arrowMesh(boom) {
    if (!arrowTpl) {
      const mk = (tipMat) => {
        const g = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 5), new THREE.MeshLambertMaterial({ color: 0xd8c090 })); shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.4; g.add(shaft);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 6), tipMat); tip.rotation.x = Math.PI / 2; tip.position.z = 0.03; g.add(tip);
        const fm = new THREE.MeshLambertMaterial({ color: 0xe04040, side: THREE.DoubleSide });
        const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.14), fm); f1.rotation.x = Math.PI / 2; f1.position.z = -0.74; g.add(f1);
        const f2 = f1.clone(); f2.rotation.set(Math.PI / 2, Math.PI / 2, 0); g.add(f2);
        return g;
      };
      arrowTpl = mk(new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }));
      boomTpl = mk(new THREE.MeshLambertMaterial({ color: 0xff5a2a, emissive: 0xff3000, emissiveIntensity: 0.9 }));
    }
    return (boom ? boomTpl : arrowTpl).clone();
  }
  CB.stuck = [];
  function stickArrow(p, hit) {
    if (!p.mesh) return;
    const m = p.mesh; p.mesh = null;
    m.position.set(hit.x, hit.y, hit.z);
    CB.stuck.push({ m, t: 10 });
    if (CB.stuck.length > 40) { const o = CB.stuck.shift(); G.scene.remove(o.m); }
  }
  // Lance-flammes : cône de 10 m, brûlure qui continue quelques secondes
  CB.flameCone = function (shooter, item, w, dmg, eye, aimDir, mz, audible) {
    const o = mz || eye;
    let hitAny = false;
    for (const a of CB.actors) {
      if (a === shooter || a.dead || !a.hittable() || (G.Duo && G.Duo.sameTeam(shooter, a))) continue;
      const hb = a.hitbox;
      const dx = hb.cx - eye.x, dy = hb.cy - eye.y, dz = hb.cz - eye.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > w.range || d < 0.01) continue;
      if ((dx * aimDir.x + dy * aimDir.y + dz * aimDir.z) / d < 0.86) continue;
      if (!P.los(eye.x, eye.y, eye.z, hb.cx, hb.cy, hb.cz, null)) continue;
      CB.damageActor(a, dmg, { by: shooter, weapon: item.id, point: [hb.cx, hb.cy + 0.3, hb.cz] });
      a.burnT = 3; a.burnBy = shooter;
      hitAny = true;
    }
    // constructions et décor en bois : ils prennent feu
    const h = P.raycast(o.x, o.y, o.z, aimDir.x, aimDir.y, aimDir.z, w.range, { mask: 2 });
    if (h && h.ent && !h.ent.dead) {
      W.damage(h.ent, dmg * w.buildDmg * (h.ent.mat === 'wood' ? 2 : 0.6), { by: shooter, point: [h.x, h.y, h.z] });
      if (h.ent.mat === 'wood' && !h.ent.dead) { h.ent.burnT = Math.max(h.ent.burnT || 0, 4); h.ent.burnBy = shooter; if (CB.burning.indexOf(h.ent) < 0) CB.burning.push(h.ent); }
    }
    // jet de flammes
    if (audible || shooter.isPlayer) {
      const len = h ? h.t : w.range;
      for (let i = 0; i < 7; i++) {
        const k = Math.pow(Math.random(), 0.8), t = 0.4 + k * len, j = 0.15 + k * 1.1;
        const x = o.x + aimDir.x * t + U.rand(-j, j), y = o.y + aimDir.y * t + U.rand(-j, j) * 0.7, z = o.z + aimDir.z * t + U.rand(-j, j);
        const hot = k < 0.25;
        G.FX.glow.spawn(x, y, z, aimDir.x * 5 + U.rand(-0.8, 0.8), aimDir.y * 5 + U.rand(0.5, 2), aimDir.z * 5 + U.rand(-0.8, 0.8), 1, hot ? 0.75 : U.rand(0.25, 0.5), hot ? 0.25 : 0.03, 0.25 + k * 0.9, U.rand(0.18, 0.32), -2, 0.8, 1.6);
      }
      if (Math.random() < 0.4) G.FX.smoke.spawn(o.x + aimDir.x * len * 0.8, o.y + aimDir.y * len * 0.8 + 0.5, o.z + aimDir.z * len * 0.8, 0, 1.2, 0, 0.3, 0.28, 0.26, 1.2, 1.2, -0.3, 1, 1.6);
    }
    return { hit: hitAny };
  };
  // Brûlure des personnages et du bois
  CB.burning = [];
  CB.updateBurn = function (dt) {
    for (const a of CB.actors) {
      if (!(a.burnT > 0) || a.dead) continue;
      a.burnT -= dt; a.burnTick = (a.burnTick || 0) - dt;
      if (a.swimming) { a.burnT = 0; continue; }
      if (a.burnTick <= 0) { a.burnTick = 0.5; CB.damageActor(a, 3, { by: a.burnBy, weapon: 'burn', point: [a.pos.x, a.pos.y + 1.2, a.pos.z] }); }
      if ((a.isPlayer || a.distToCam < 50) && Math.random() < 0.6) G.FX.glow.spawn(a.pos.x + U.rand(-0.3, 0.3), a.pos.y + U.rand(0.2, 1.6), a.pos.z + U.rand(-0.3, 0.3), 0, U.rand(1, 2.5), 0, 1, U.rand(0.35, 0.6), 0.05, 0.3, 0.5, -1, 1);
    }
    for (let i = CB.burning.length - 1; i >= 0; i--) {
      const e = CB.burning[i];
      if (e.dead || !(e.burnT > 0)) { CB.burning.splice(i, 1); continue; }
      e.burnT -= dt; e.burnTick = (e.burnTick || 0) - dt;
      if (e.burnTick <= 0) { e.burnTick = 0.5; W.damage(e, 12, { by: e.burnBy }); }
      if (Math.random() < 0.7) { const x = U.rand(e.minX, e.maxX), y = U.rand(e.minY, e.maxY), z = U.rand(e.minZ, e.maxZ); if (Math.hypot(x - G.camera.position.x, z - G.camera.position.z) < 90) { G.FX.glow.spawn(x, y, z, 0, U.rand(1, 3), 0, 1, U.rand(0.35, 0.7), 0.05, U.rand(0.3, 0.6), 0.6, -1.5, 1); if (Math.random() < 0.2) G.FX.smoke.spawn(x, y + 0.5, z, 0, 1, 0, 0.3, 0.3, 0.3, 1, 1.5, -0.2, 1, 1.5); } }
    }
  };
  // Coup de sabre : touche tous les adversaires dans un arc de ~140° devant soi
  CB.meleeArc = function (shooter, item, w, dmg, eye, aimDir, audible) {
    let hitAny = false, headAny = false;
    const fx = aimDir.x, fz = aimDir.z, fl = Math.hypot(fx, fz) || 1;
    for (const a of CB.actors) {
      if (a === shooter || a.dead || !a.hittable() || (G.Duo && G.Duo.sameTeam(shooter, a))) continue;
      const hb = a.hitbox;
      const dx = hb.cx - eye.x, dz = hb.cz - eye.z, dy = hb.cy - eye.y;
      const d = Math.hypot(dx, dz);
      if (d > w.range || Math.abs(dy) > 2.2) continue;
      if (d > 0.6 && (dx * fx + dz * fz) / (d * fl) < 0.34) continue;
      if (!P.los(eye.x, eye.y, eye.z, hb.cx, hb.cy, hb.cz, null)) continue;
      const head = aimDir.y > 0.15 && d < 2.5;
      CB.damageActor(a, dmg * (head ? w.head : 1), { by: shooter, head, weapon: item.id, point: [hb.cx, hb.cy + 0.4, hb.cz] });
      if (audible || a.isPlayer) G.FX.hitSpark(hb.cx, hb.cy + 0.3, hb.cz, a.shield > 0, head);
      hitAny = true; headAny = headAny || head;
    }
    // constructions / décor droit devant
    const h = P.raycast(eye.x, eye.y - 0.3, eye.z, fx / fl, 0, fz / fl, w.range, { mask: 2 });
    if (h && h.ent && !h.ent.dead) { W.damage(h.ent, dmg * w.buildDmg, { by: shooter, point: [h.x, h.y, h.z] }); if (audible) G.FX.impact(h.x, h.y, h.z, h.nx, h.ny, h.nz, h.ent.mat); if (shooter.isPlayer && (h.ent.type === 'build' || h.ent.type === 'piece')) G.FX.damageNumber(h.x, h.y, h.z, dmg * w.buildDmg, 'build'); }
    // arc lumineux
    if (audible) {
      const col = I.RARITY[item.rarity].hex, r = ((col >> 16) & 255) / 255, g = ((col >> 8) & 255) / 255, b = (col & 255) / 255;
      const base = Math.atan2(fx, fz);
      for (let i = 0; i < 16; i++) { const a = base + (i / 15 - 0.5) * 2.2, rr = 1.6 + Math.random() * 0.5; G.FX.glow.spawn(eye.x + Math.sin(a) * rr, eye.y - 0.4 + (i / 15 - 0.5) * 0.6, eye.z + Math.cos(a) * rr, 0, 0, 0, r, g, b, 0.18, 0.25, 0, 0, 0); }
    }
    return { hit: hitAny, head: headAny };
  };
  CB.spawnProjectile = function (owner, item, x, y, z, dx, dy, dz) {
    const w = I.WEAPONS[item.id];
    const pr = w.projectile;
    const ck = pr.arrow ? U.clamp(owner.chargeK || 1, 0.1, 1) : 1;
    const spd = pr.speed * (pr.arrow ? 0.35 + 0.65 * ck : 1);
    const p = { owner, item, w, x, y, z, vx: dx * spd, vy: dy * spd, vz: dz * spd, grav: pr.grav, life: pr.fuse || 6, mesh: null, kind: pr.arrow ? 'arrow' : pr.rocket ? 'rocket' : pr.bounce ? 'grenade' : 'bullet', traveled: 0, dmgMul: pr.arrow ? 0.3 + 0.7 * ck : 1 };
    if (p.kind === 'arrow') { p.mesh = arrowMesh(!!pr.explode); p.mesh.position.set(x, y, z); G.scene.add(p.mesh); }
    if (p.kind === 'rocket') { p.mesh = new THREE.Mesh(rocketGeo, rocketMat); G.scene.add(p.mesh); }
    if (p.kind === 'grenade') { p.mesh = new THREE.Mesh(grenadeGeo, grenadeMat); G.scene.add(p.mesh); }
    CB.projectiles.push(p);
    return p;
  };
  const impulseMat = new THREE.MeshLambertMaterial({ color: 0x2a7aff, emissive: 0x1a40c0 }), splashMat = new THREE.MeshLambertMaterial({ color: 0x30a8ff, emissive: 0x106080 }), bubbleMat = new THREE.MeshLambertMaterial({ color: 0x80e8ff, emissive: 0x2080c0 });
  CB.throwGrenade = function (owner, def, x, y, z, dx, dy, dz, speed) {
    const kind = def.boogie ? 'boogie' : def.impulse ? 'impulse' : def.splash ? 'splash' : def.bubble ? 'bubble' : def.stink ? 'stink' : def.smoke ? 'smoke' : 'hand';
    const mt = { boogie: boogieMat, impulse: impulseMat, splash: splashMat, bubble: bubbleMat }[kind] || grenadeMat;
    const p = { owner, def, x, y, z, vx: dx * speed, vy: dy * speed + 3, vz: dz * speed, grav: 16, life: def.fuse, kind, mesh: new THREE.Mesh(grenadeGeo, mt), traveled: 0 };
    G.scene.add(p.mesh);
    CB.projectiles.push(p);
    return p;
  };

  CB.updateProjectiles = function (dt) {
    for (let i = CB.projectiles.length - 1; i >= 0; i--) {
      const p = CB.projectiles[i];
      p.life -= dt;
      p.vy -= p.grav * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      const dx = nx - p.x, dy = ny - p.y, dz = nz - p.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      let hit = null;
      if (len > 0) hit = CB.trace(p.owner, p.x, p.y, p.z, dx / len, dy / len, dz / len, len);
      if (p.kind === 'bullet') {
        if (G.FX && (p.owner.isPlayer || p.owner.nearPlayer)) G.FX.tracer(p.x, p.y, p.z, hit ? hit.x : nx, hit ? hit.y : ny, hit ? hit.z : nz, 0xfff8c0, 0.05);
        if (hit) {
          if (hit.actor) {
            const dmg = I.damage(p.item) * (hit.head ? p.w.head : 1);
            G.FX.hitSpark(hit.x, hit.y, hit.z, hit.actor.shield > 0, hit.head);
            CB.damageActor(hit.actor, dmg, { by: p.owner, head: hit.head, weapon: p.item.id, point: [hit.x, hit.y, hit.z] });
          } else if (hit.ent) {
            W.damage(hit.ent, hit.ent.mat === 'glass' ? 999 : I.damage(p.item), { by: p.owner });
            G.FX.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, hit.ent.mat);
            if (p.owner.isPlayer) G.FX.damageNumber(hit.x, hit.y, hit.z, I.damage(p.item), 'build');
          } else if (hit.water) G.FX.waterSplash(hit.x, hit.z, false);
          else G.FX.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, hit.mat);
          CB.removeProjectile(i); continue;
        }
      } else if (p.kind === 'arrow') {
        if (hit || p.life <= 0) {
          const pr = p.w.projectile, base = I.damage(p.item) * p.dmgMul;
          if (pr.explode) {
            const ex = hit ? hit.x - dx / len * 0.2 : nx, ey = hit ? hit.y - dy / len * 0.2 : ny, ez = hit ? hit.z - dz / len * 0.2 : nz;
            CB.explode(ex, ey, ez, pr.radius, base, pr.buildDmg * p.dmgMul, p.owner, p.item.id);
          } else if (hit) {
            if (hit.actor) {
              G.FX.hitSpark(hit.x, hit.y, hit.z, hit.actor.shield > 0, hit.head);
              CB.damageActor(hit.actor, base * (hit.head ? p.w.head : 1), { by: p.owner, head: hit.head, weapon: p.item.id, point: [hit.x, hit.y, hit.z] });
            } else if (hit.ent) {
              W.damage(hit.ent, hit.ent.mat === 'glass' ? 999 : base * (p.w.buildDmg || 1), { by: p.owner, point: [hit.x, hit.y, hit.z] });
              G.FX.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, hit.ent.mat);
              if (p.owner.isPlayer) G.FX.damageNumber(hit.x, hit.y, hit.z, base * (p.w.buildDmg || 1), 'build');
              if (!hit.ent.dead && hit.ent.mat !== 'glass') stickArrow(p, hit);
            } else if (hit.water) G.FX.waterSplash(hit.x, hit.z, false);
            else { G.FX.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, hit.mat); stickArrow(p, hit); }
            if (p.owner.isPlayer || p.owner.nearPlayer) G.Audio.play('arrow_hit', { pos: [hit.x, hit.y, hit.z] });
          }
          CB.removeProjectile(i); continue;
        }
        if (p.w.projectile.explode && Math.random() < 0.6) G.FX.glow.spawn(p.x, p.y, p.z, 0, 0, 0, 1, 0.4, 0.1, 0.35, 0.15, 0, 0, 0);
      } else if (p.kind === 'rocket') {
        if (Math.random() < 0.9) { G.FX.smoke.spawn(p.x, p.y, p.z, U.rand(-0.3, 0.3), U.rand(0, 0.5), U.rand(-0.3, 0.3), 0.8, 0.8, 0.8, 0.8, 1.2, -0.3, 1, 2.5); G.FX.glow.spawn(p.x, p.y, p.z, 0, 0, 0, 1, 0.6, 0.2, 0.5, 0.1, 0, 0, 0); }
        if (hit || p.life <= 0) {
          const ex = hit ? hit.x - dx / len * 0.2 : nx, ey = hit ? hit.y - dy / len * 0.2 : ny, ez = hit ? hit.z - dz / len * 0.2 : nz;
          CB.explode(ex, ey, ez, p.w.projectile.radius, I.damage(p.item), p.w.projectile.buildDmg, p.owner, p.item.id);
          CB.removeProjectile(i); continue;
        }
      } else {
        // grenades rebondissantes
        if (hit && !hit.actor) {
          const nrm = U.v1.set(hit.nx, hit.ny, hit.nz);
          const vd = p.vx * nrm.x + p.vy * nrm.y + p.vz * nrm.z;
          p.vx = (p.vx - 2 * vd * nrm.x) * 0.45; p.vy = (p.vy - 2 * vd * nrm.y) * 0.45; p.vz = (p.vz - 2 * vd * nrm.z) * 0.45;
          p.x = hit.x + nrm.x * 0.12; p.y = hit.y + nrm.y * 0.12; p.z = hit.z + nrm.z * 0.12;
          if (Math.abs(vd) > 2) G.Audio.play('bounce', { pos: [p.x, p.y, p.z] });
          if (p.kind === 'grenade' && p.traveled < 1.5 && hit.actor) p.life = 0;
        } else if (hit && hit.actor && p.kind === 'grenade') { p.life = 0; }
        else { p.x = nx; p.y = ny; p.z = nz; }
        p.traveled += len;
        if (p.mesh) p.mesh.position.set(p.x, p.y, p.z);
        if (Math.random() < 0.5) G.FX.glow.spawn(p.x, p.y, p.z, 0, 0.3, 0, p.kind === 'boogie' ? 1 : 1, p.kind === 'boogie' ? 0.3 : 0.4, p.kind === 'boogie' ? 0.9 : 0.1, 0.12, 0.3, 0, 0, 0);
        if (p.life <= 0) {
          if (p.kind === 'boogie') CB.boogie(p.x, p.y, p.z, p.def.radius, p.owner);
          else if (p.kind === 'impulse') CB.impulse(p.x, p.y, p.z, p.def.radius, p.owner);
          else if (p.kind === 'splash') CB.splash(p.x, p.y, p.z, p.def.radius, p.def.heal, p.owner);
          else if (p.kind === 'bubble') CB.spawnBubble(p.x, p.y, p.z, p.def.radius, p.def.duration);
          else if (p.kind === 'stink' || p.kind === 'smoke') CB.spawnCloud(p.kind, p.x, p.y, p.z, p.def.radius, p.def.duration, p.owner);
          else if (p.kind === 'hand') CB.explode(p.x, p.y, p.z, p.def.radius, p.def.dmg, p.def.buildDmg, p.owner, 'grenade');
          else CB.explode(p.x, p.y, p.z, p.w.projectile.radius, I.damage(p.item), p.w.projectile.buildDmg, p.owner, p.item.id);
          CB.removeProjectile(i);
        }
        continue;
      }
      p.x = nx; p.y = ny; p.z = nz;
      if (p.mesh) { p.mesh.position.set(p.x, p.y, p.z); p.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz); }
      if (p.life <= 0 || p.y < -30) CB.removeProjectile(i);
    }
    for (let i = CB.stuck.length - 1; i >= 0; i--) { const s = CB.stuck[i]; s.t -= dt; if (s.t <= 0) { G.scene.remove(s.m); CB.stuck.splice(i, 1); } }
  };
  CB.removeProjectile = function (i) {
    const p = CB.projectiles[i];
    if (p.mesh) { G.scene.remove(p.mesh); }
    CB.projectiles.splice(i, 1);
  };
  CB.clear = function () { CB.clouds.length = 0; CB.burning.length = 0; for (const a of CB.actors) a.burnT = 0; for (let i = CB.projectiles.length - 1; i >= 0; i--) CB.removeProjectile(i); for (const s of CB.stuck) G.scene.remove(s.m); CB.stuck.length = 0; CB.clearBubbles(); CB.shots = []; };

  // ------------------------------------------------------------
  //  Explosions
  // ------------------------------------------------------------
  const qList = [];
  CB.explode = function (x, y, z, radius, dmg, buildDmg, by, weapon) {
    G.FX.explosion(x, y, z, radius);
    G.Audio.play('explosion', { pos: [x, y, z] });
    // personnages
    for (const a of CB.actors) {
      if (a.dead || !a.hittable() || a === by) continue;
      const dx = a.hitbox.cx - x, dy = a.hitbox.cy - y, dz = a.hitbox.cz - z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius + 0.5) continue;
      // ligne de vue (les murs protègent)
      if (!P.los(x, y + 0.2, z, a.hitbox.cx, a.hitbox.cy, a.hitbox.cz, null)) continue;
      const k = U.clamp(1 - d / (radius + 0.5), 0.25, 1);
      CB.damageActor(a, dmg * k, { by, weapon, explosion: true, point: [a.hitbox.cx, a.hitbox.cy + 0.5, a.hitbox.cz] });
      // recul
      if (!a.dead) { a.vel.x += dx / (d + 0.1) * 6 * k; a.vel.y += 5 * k; a.vel.z += dz / (d + 0.1) * 6 * k; a.grounded = false; }
    }
    // structures
    const list = P.query(x - radius, y - radius, z - radius, x + radius, y + radius, z + radius, 3, qList);
    const seen = new Set();
    for (const c of list) {
      const e = c.ent;
      if (!e || e.dead || seen.has(e)) continue;
      seen.add(e);
      const cx = U.clamp(x, e.minX, e.maxX), cy = U.clamp(y, e.minY, e.maxY), cz = U.clamp(z, e.minZ, e.maxZ);
      const d = Math.sqrt((cx - x) * (cx - x) + (cy - y) * (cy - y) + (cz - z) * (cz - z));
      if (d > radius) continue;
      const k = 1 - d / radius * 0.5;
      W.damage(e, buildDmg * k, { by, explosive: true });
    }
  };

  CB.boogie = function (x, y, z, radius, by) {
    G.FX.explosion(x, y, z, 2);
    for (let i = 0; i < 60; i++) G.FX.glow.spawn(x, y + 1, z, U.rand(-6, 6), U.rand(0, 8), U.rand(-6, 6), Math.random(), Math.random(), 1, 0.3, 1.5, 4, 1);
    G.Audio.play('explosion', { pos: [x, y, z], vol: 0.4 });
    for (const a of CB.actors) {
      if (a.dead || !a.hittable() || a === by) continue;
      const d = Math.hypot(a.pos.x - x, a.pos.y - y, a.pos.z - z);
      if (d < radius) a.forceDance(5);
    }
  };
})();
