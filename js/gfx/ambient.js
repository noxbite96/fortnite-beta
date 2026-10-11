// ============================================================
//  Vie ambiante : oiseaux, papillons, lucioles, îlots au large
// ============================================================
(function () {
  const U = G.U;
  const AM = { birds: [], flocks: [] };
  G.Ambient = AM;

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();

  AM.init = function (scene) {
    // --- oiseaux : ailes en V, instanciés ---
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      0, 0, 0.25, -0.9, 0.15, -0.1, 0, 0, -0.25,
      0, 0, 0.25, 0, 0, -0.25, 0.9, 0.15, -0.1,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ color: 0xf4f4f4, side: THREE.DoubleSide });
    const N = 42;
    AM.birdMesh = new THREE.InstancedMesh(g, mat, N);
    AM.birdMesh.frustumCulled = false;
    scene.add(AM.birdMesh);
    const rng = U.RNG(55);
    for (let f = 0; f < 7; f++) {
      const fl = { cx: rng.range(-450, 450), cz: rng.range(-450, 450), r: rng.range(40, 110), h: rng.range(35, 90), sp: rng.range(0.1, 0.22) * (rng() < 0.5 ? 1 : -1), ph: rng() * 6 };
      AM.flocks.push(fl);
      for (let i = 0; i < 6; i++) AM.birds.push({ fl, off: [rng.range(-6, 6), rng.range(-2, 2), rng.range(-6, 6)], flap: rng() * 6, sc: rng.range(0.7, 1.1) });
    }
    // --- îlots au large ---
    const rockM = new THREE.MeshLambertMaterial({ color: 0x8a8278, flatShading: true });
    const sandM = new THREE.MeshLambertMaterial({ color: 0xe2cd96, flatShading: true });
    const grassM = new THREE.MeshLambertMaterial({ color: 0x5aa83c, flatShading: true });
    const palmTrunk = new THREE.MeshLambertMaterial({ color: 0x8a6a42 }), palmLeaf = new THREE.MeshLambertMaterial({ color: 0x3f9a3a, side: THREE.DoubleSide });
    const isl = [[760, -300, 30], [-780, -420, 45], [650, 620, 26], [-700, 520, 35], [180, -820, 40], [-260, 860, 22], [880, 180, 28]];
    for (const [x, z, r] of isl) {
      const grp = new THREE.Group();
      const sand = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.3, 4, 10), sandM); sand.position.y = -1.2; grp.add(sand);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.95, 3, 9), grassM); top.position.y = 1.2; grp.add(top);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.35, 0), rockM); rock.position.set(r * 0.2, 3, -r * 0.2); rock.scale.y = 1.4; grp.add(rock);
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1, tx = Math.cos(a) * r * 0.45, tz = Math.sin(a) * r * 0.45;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 9, 6), palmTrunk); t.position.set(tx, 7, tz); t.rotation.z = 0.15; grp.add(t);
        for (let l = 0; l < 6; l++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), palmLeaf); lf.position.set(tx + 0.7, 11.5, tz); lf.rotation.set(-0.5, l * 1.05, 0); lf.translateX(2.2); grp.add(lf); }
      }
      grp.position.set(x, 0, z);
      scene.add(grp);
    }
  };

  // --- étoiles filantes la nuit ---
  const stars = [];
  let starT = 3;
  function shootingStar(cam) {
    let s = stars.find((x) => !x.on);
    if (!s) {
      if (stars.length >= 3) return;
      const geo = new THREE.CylinderGeometry(2.0, 0.05, 1, 5, 1, true).translate(0, -0.5, 0);
      const col = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 0; i < geo.attributes.position.count; i++) { const y = geo.attributes.position.getY(i); const k = 1 + y; col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k * 1.1; }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
      m.frustumCulled = false; m.renderOrder = -1;
      G.scene.add(m);
      s = { m, on: false, p: new THREE.Vector3(), d: new THREE.Vector3(), t: 0 };
      stars.push(s);
    }
    const a = Math.random() * Math.PI * 2, el = U.rand(0.35, 0.8);
    s.p.set(cam.x + Math.cos(a) * Math.cos(el) * 650, cam.y + Math.sin(el) * 650, cam.z + Math.sin(a) * Math.cos(el) * 650);
    const b = a + U.rand(-1.2, 1.2) + Math.PI / 2;
    s.d.set(Math.cos(b), -U.rand(0.15, 0.5), Math.sin(b)).normalize();
    s.t = 0; s.dur = U.rand(0.6, 1.1); s.on = true; s.m.visible = true;
  }
  AM.stars = stars; AM.shootingStar = shootingStar;
  const _up = new THREE.Vector3(0, 1, 0);
  function updateStars(dt, cam) {
    if (!cam) return;
    starT -= dt;
    if (starT <= 0) { starT = U.rand(4, 11); if (G.Sky.night > 0.7 && !(G.Weather && G.Weather.rain > 0.2)) shootingStar(cam); }
    for (const s of stars) {
      if (!s.on) continue;
      s.t += dt;
      const k = s.t / s.dur;
      if (k >= 1) { s.on = false; s.m.visible = false; continue; }
      s.p.addScaledVector(s.d, dt * 420);
      s.m.position.copy(s.p);
      s.m.quaternion.setFromUnitVectors(_up, s.d);
      const len = 150 * Math.sin(k * Math.PI);
      s.m.scale.set(1, Math.max(0.01, len), 1);
    }
  }

  AM.update = function (dt, camPos) {
    const t = G.clock.time;
    updateStars(dt, camPos || (G.camera && G.camera.position));
    // oiseaux
    let k = 0;
    const night = G.Sky.night > 0.6;
    for (const b of AM.birds) {
      const f = b.fl;
      const a = f.ph + t * f.sp;
      const x = f.cx + Math.cos(a) * f.r + b.off[0], z = f.cz + Math.sin(a) * f.r + b.off[2];
      const y = f.h + b.off[1] + Math.sin(t * 0.7 + b.flap) * 2;
      b.flap += dt * 9;
      const flap = 0.4 + Math.abs(Math.sin(b.flap)) * 0.8;
      e.set(0, -a + (f.sp > 0 ? 0 : Math.PI), Math.sin(t + b.flap) * 0.1);
      q.setFromEuler(e);
      p.set(x, night ? -50 : y, z); s.set(b.sc, flap * b.sc, b.sc);
      m4.compose(p, q, s);
      AM.birdMesh.setMatrixAt(k++, m4);
    }
    AM.birdMesh.instanceMatrix.needsUpdate = true;
    // papillons le jour, lucioles la nuit (autour de la caméra)
    const g = G.Terrain;
    if (!camPos) return;
    AM.bugT = (AM.bugT || 0) - dt;
    if (AM.bugT <= 0) {
      AM.bugT = 0.12;
      const x = camPos.x + U.rand(-18, 18), z = camPos.z + U.rand(-18, 18);
      const h = g.height(x, z);
      if (h > 1 && Math.abs(camPos.y - h) < 30) {
        if (G.Sky.night > 0.5) {
          if (g.forest(x, z) > 0.1 || Math.random() < 0.3) G.FX.glow.spawn(x, h + U.rand(0.5, 2.5), z, U.rand(-0.4, 0.4), U.rand(-0.1, 0.2), U.rand(-0.4, 0.4), 0.9, 1, 0.3, 0.16, U.rand(2, 4), 0, 0.2, 0);
        } else if (Math.random() < 0.35 && G.Veg.sampleColor) {
          const c = G.Veg.sampleColor(x, z);
          if (c && c[1] > c[0] + 20) {
            const col = U.pick([[1, 0.9, 0.3], [1, 0.5, 0.8], [0.6, 0.8, 1], [1, 1, 1]]);
            G.FX.smoke.spawn(x, h + U.rand(0.4, 1.2), z, U.rand(-0.8, 0.8), U.rand(-0.1, 0.3), U.rand(-0.8, 0.8), col[0], col[1], col[2], 0.12, U.rand(2, 3.5), 0, 0.3, 0);
          }
        }
      }
    }
  };
})();
