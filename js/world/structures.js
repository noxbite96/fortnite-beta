// ============================================================
//  Structures du monde : kits instanciés + entités destructibles
// ============================================================
(function () {
  const U = G.U;

  // ------------------------------------------------------------
  //  KITS : un matériau + une géométrie, instanciés par région
  // ------------------------------------------------------------
  const K = { defs: {}, pending: {}, meshes: [], REG: 240 };
  G.Kits = K;

  const GEOS = {};
  function geo(name) {
    if (GEOS[name]) return GEOS[name];
    let g;
    if (name === 'box') g = new THREE.BoxGeometry(1, 1, 1);
    else if (name === 'cyl') g = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
    else if (name === 'cyl8') g = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    else if (name === 'cone') g = new THREE.ConeGeometry(0.5, 1, 10);
    else if (name === 'cone4') { g = new THREE.ConeGeometry(0.7071, 1, 4); g.rotateY(Math.PI / 4); }
    else if (name === 'sphere') g = new THREE.SphereGeometry(0.5, 14, 10);
    else if (name === 'hemi') g = new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    else if (name === 'wedge') {
      // prisme triangulaire : base [-0.5,0.5] en X à y=-0.5, sommet en (0,0.5), épaisseur Z
      const s = new THREE.Shape();
      s.moveTo(-0.5, -0.5); s.lineTo(0.5, -0.5); s.lineTo(0, 0.5); s.lineTo(-0.5, -0.5);
      g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
      g.translate(0, 0, -0.5);
    } else if (name === 'ramp') {
      // coin (rampe) : montée vers +X
      const s = new THREE.Shape();
      s.moveTo(-0.5, -0.5); s.lineTo(0.5, -0.5); s.lineTo(0.5, 0.5); s.lineTo(-0.5, -0.5);
      g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
      g.translate(0, 0, -0.5);
    }
    GEOS[name] = g;
    return g;
  }
  K.geo = geo;

  // matériau à projection "boîte" en coordonnées monde
  function worldUVMaterial(opts) {
    const mat = new THREE.MeshLambertMaterial({ color: opts.color || 0xffffff, map: opts.tex || null, transparent: !!opts.transparent, opacity: opts.opacity == null ? 1 : opts.opacity, side: opts.side || THREE.FrontSide });
    if (opts.emissive) { mat.emissive = new THREE.Color(opts.emissive); mat.emissiveIntensity = opts.emissiveIntensity || 1; }
    if (opts.tex && !opts.localUV) {
      const sc = opts.scale || 0.25;
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.texScale = { value: sc };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            mat4 wuvM = modelMatrix;
            #ifdef USE_INSTANCING
              wuvM = modelMatrix * instanceMatrix;
            #endif
            vWP = (wuvM * vec4(transformed, 1.0)).xyz;
            vWN = normalize(mat3(wuvM) * objectNormal);`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform float texScale;')
          .replace('#include <map_fragment>', `
            vec3 an = abs(vWN);
            vec2 wuv = an.y > max(an.x, an.z) ? vWP.xz : (an.x > an.z ? vWP.zy : vWP.xy);
            vec4 sampledDiffuseColor = texture2D(map, wuv * texScale);
            diffuseColor *= sampledDiffuseColor;`);
      };
      mat.customProgramCacheKey = () => 'wuv' + sc;
    }
    return mat;
  }
  K.worldUVMaterial = worldUVMaterial;

  // mat : matériau de récolte par défaut
  const KIT_DEFS = {
    siding: { tex: 'siding', scale: 0.5, mat: 'wood' },
    plaster: { tex: 'plaster', scale: 0.3, mat: 'stone' },
    brick: { tex: 'brick', scale: 0.45, mat: 'stone' },
    stoneWall: { tex: 'stoneWall', scale: 0.28, mat: 'stone' },
    concrete: { tex: 'concrete', scale: 0.25, mat: 'stone' },
    metalSheet: { tex: 'metalSheet', scale: 0.3, mat: 'metal' },
    container: { tex: 'container', scale: 0.35, mat: 'metal' },
    roof: { tex: 'roofTiles', scale: 0.5, mat: 'wood' },
    woodFloor: { tex: 'woodFloor', scale: 0.4, mat: 'wood' },
    planks: { tex: 'planks', scale: 0.4, mat: 'wood' },
    tiles: { tex: 'tiles', scale: 0.8, mat: 'stone' },
    wallpaper: { tex: 'wallpaper', scale: 0.5, mat: 'wood' },
    fabric: { tex: 'fabric', scale: 1.2, mat: 'wood' },
    furn: { tex: 'woodFloor', scale: 0.8, mat: 'wood' },
    plain: { mat: 'wood' },
    paint: { mat: 'metal' },
    dark: { color: 0x2a2a2e, mat: 'metal' },
    glass: { color: 0x9fd6f0, transparent: true, opacity: 0.35, mat: 'glass', noShadow: true },
    hay: { tex: 'hay', scale: 0.6, mat: 'wood' },
    leaves: { tex: 'leaves', scale: 0.5, mat: 'wood' },
    snow: { tex: 'snow', scale: 0.3, mat: 'stone' },
    asphalt: { tex: 'asphalt', scale: 0.2, mat: 'stone' },
    rockKit: { tex: 'rock', scale: 0.2, mat: 'stone' },
    door: { tex: 'door', localUV: true, mat: 'wood' },
    clock: { tex: 'clock', localUV: true, mat: 'stone' },
    glow: { color: 0xfff2b0, emissive: 0xffe08a, emissiveIntensity: 1.2, mat: 'metal', noShadow: true },
    water: { color: 0x4fc3d8, transparent: true, opacity: 0.8, mat: 'glass', noShadow: true },
    cylPaint: { geo: 'cyl', mat: 'metal' },
    cylMetal: { geo: 'cyl', tex: 'metalSheet', scale: 0.3, mat: 'metal' },
    cylWood: { geo: 'cyl', tex: 'planks', scale: 0.5, mat: 'wood' },
    cylStone: { geo: 'cyl', tex: 'stoneWall', scale: 0.3, mat: 'stone' },
    cylConcrete: { geo: 'cyl', tex: 'concrete', scale: 0.3, mat: 'stone' },
    cylHay: { geo: 'cyl', tex: 'hay', scale: 0.6, mat: 'wood' },
    cyl8Paint: { geo: 'cyl8', mat: 'metal' },
    conePaint: { geo: 'cone', mat: 'wood' },
    coneRoof: { geo: 'cone', tex: 'roofTiles', scale: 0.5, mat: 'wood' },
    pyrRoof: { geo: 'cone4', tex: 'roofTiles', scale: 0.5, mat: 'wood' },
    spherePaint: { geo: 'sphere', mat: 'metal' },
    hemiPaint: { geo: 'hemi', mat: 'metal' },
    wedgeSiding: { geo: 'wedge', tex: 'siding', scale: 0.5, mat: 'wood' },
    wedgePlaster: { geo: 'wedge', tex: 'plaster', scale: 0.3, mat: 'stone' },
    wedgeBrick: { geo: 'wedge', tex: 'brick', scale: 0.45, mat: 'stone' },
    wedgePlanks: { geo: 'wedge', tex: 'planks', scale: 0.4, mat: 'wood' },
    wedgeStone: { geo: 'wedge', tex: 'stoneWall', scale: 0.28, mat: 'stone' },
    wedgeMetal: { geo: 'wedge', tex: 'metalSheet', scale: 0.3, mat: 'metal' },
    rampConcrete: { geo: 'ramp', tex: 'concrete', scale: 0.25, mat: 'stone' },
    rampWood: { geo: 'ramp', tex: 'woodFloor', scale: 0.4, mat: 'wood' },
  };
  K.KIT_DEFS = KIT_DEFS;
  K.matOf = (kit) => (KIT_DEFS[kit] && KIT_DEFS[kit].mat) || 'wood';
  // Kit personnalisé (géométrie + matériau fournis)
  K.register = function (name, geometry, material, o) {
    o = o || {};
    KIT_DEFS[name] = { geoObj: geometry, _mat: material, mat: o.mat || 'wood', noShadow: !!o.noShadow, transparent: !!o.transparent };
  };

  K.getMaterial = function (kit) {
    const d = KIT_DEFS[kit];
    if (!d) throw new Error('kit inconnu ' + kit);
    if (!d._mat) d._mat = worldUVMaterial({ tex: d.tex ? G.Tex.get(d.tex) : null, scale: d.scale, color: d.color, transparent: d.transparent, opacity: d.opacity, localUV: d.localUV, emissive: d.emissive, emissiveIntensity: d.emissiveIntensity });
    return d._mat;
  };

  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpE = new THREE.Euler(0, 0, 0, 'YXZ'), tmpC = new THREE.Color();

  // Ajoute une instance ; renvoie une référence
  K.add = function (kit, x, y, z, sx, sy, sz, color, rx, ry, rz) {
    if (!KIT_DEFS[kit]) { console.warn('kit ?', kit); kit = 'plain'; }
    tmpE.set(rx || 0, ry || 0, rz || 0);
    tmpQ.setFromEuler(tmpE);
    tmpP.set(x, y, z); tmpS.set(sx, sy, sz);
    tmpM.compose(tmpP, tmpQ, tmpS);
    const reg = Math.floor((x + 800) / K.REG) * 100 + Math.floor((z + 800) / K.REG);
    const key = kit + '|' + reg;
    let arr = K.pending[key];
    if (!arr) { arr = K.pending[key] = { kit, list: [] }; }
    const ref = { kit, key, idx: arr.list.length, m: tmpM.elements.slice(), color: color == null ? 0xffffff : color, mesh: null, hidden: false };
    arr.list.push(ref);
    return ref;
  };
  K.addMatrix = function (kit, matrix, color) {
    const e = matrix.elements;
    const x = e[12], z = e[14];
    const reg = Math.floor((x + 800) / K.REG) * 100 + Math.floor((z + 800) / K.REG);
    const key = kit + '|' + reg;
    let arr = K.pending[key];
    if (!arr) { arr = K.pending[key] = { kit, list: [] }; }
    const ref = { kit, key, idx: arr.list.length, m: e.slice(), color: color == null ? 0xffffff : color, mesh: null, hidden: false };
    arr.list.push(ref);
    return ref;
  };

  // Crée les InstancedMesh à partir des instances collectées
  K.finalize = function (scene) {
    for (const key in K.pending) {
      const p = K.pending[key];
      const d = KIT_DEFS[p.kit];
      const mesh = new THREE.InstancedMesh(d.geoObj || geo(d.geo || 'box'), K.getMaterial(p.kit), p.list.length);
      const col = new THREE.Color();
      for (let i = 0; i < p.list.length; i++) {
        const r = p.list[i];
        tmpM.fromArray(r.m);
        mesh.setMatrixAt(i, tmpM);
        col.setHex(r.color);
        mesh.setColorAt(i, col);
        r.mesh = mesh;
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = !d.noShadow;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      if (d.transparent) mesh.renderOrder = 2;
      scene.add(mesh);
      K.meshes.push(mesh);
    }
    K.pending = {};
  };

  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  K.hide = function (ref) {
    if (!ref.mesh || ref.hidden) return;
    ref.hidden = true;
    ref.mesh.setMatrixAt(ref.idx, ZERO);
    ref.mesh.instanceMatrix.needsUpdate = true;
  };
  K.show = function (ref) {
    if (!ref.mesh) return;
    ref.hidden = false;
    tmpM.fromArray(ref.m);
    ref.mesh.setMatrixAt(ref.idx, tmpM);
    ref.mesh.instanceMatrix.needsUpdate = true;
  };
  K.setMatrix = function (ref, m) {
    if (!ref.mesh || ref.hidden) return;
    ref.mesh.setMatrixAt(ref.idx, m);
    ref.mesh.instanceMatrix.needsUpdate = true;
  };
  K.setColor = function (ref, hex) {
    if (!ref.mesh) return;
    tmpC.setHex(hex);
    ref.mesh.setColorAt(ref.idx, tmpC);
    ref.mesh.instanceColor.needsUpdate = true;
  };
  // Tremblement (impact de pioche)
  K.shakeOffset = function (ref, ox, oy, oz) {
    if (!ref.mesh || ref.hidden) return;
    tmpM.fromArray(ref.m);
    tmpM.elements[12] += ox; tmpM.elements[13] += oy; tmpM.elements[14] += oz;
    ref.mesh.setMatrixAt(ref.idx, tmpM);
    ref.mesh.instanceMatrix.needsUpdate = true;
  };

  // ------------------------------------------------------------
  //  ENTITÉS DESTRUCTIBLES
  // ------------------------------------------------------------
  const W = { ents: [], shaking: [], nextId: 1, collapseQueue: [] };
  G.World = W;

  W.HARVEST = { wood: 'wood', stone: 'stone', metal: 'metal', glass: null };

  // type : 'piece','tree','rock','prop','furniture','glass','door','build','car'
  W.ent = function (type, mat, hp, opts) {
    opts = opts || {};
    const e = {
      id: W.nextId++, type, mat, hp, maxHp: hp, refs: [], cols: [], meshes: [], dead: false,
      yield: opts.yield == null ? 0 : opts.yield, structural: !!opts.structural, grounded: !!opts.grounded,
      minX: 1e9, minY: 1e9, minZ: 1e9, maxX: -1e9, maxY: -1e9, maxZ: -1e9,
      noPickaxe: !!opts.noPickaxe, owner: null, isEnt: true, deps: null,
    };
    if (opts.onDestroy) e.onDestroy = opts.onDestroy;
    W.ents.push(e);
    return e;
  };
  W.addRef = function (e, ref) { e.refs.push(ref); return ref; };
  W.addCol = function (e, c) {
    c.ent = e; e.cols.push(c); G.Phys.add(c);
    if (c.minX < e.minX) e.minX = c.minX; if (c.minY < e.minY) e.minY = c.minY; if (c.minZ < e.minZ) e.minZ = c.minZ;
    if (c.maxX > e.maxX) e.maxX = c.maxX; if (c.maxY > e.maxY) e.maxY = c.maxY; if (c.maxZ > e.maxZ) e.maxZ = c.maxZ;
    return c;
  };
  W.bounds = function (e, minX, minY, minZ, maxX, maxY, maxZ) {
    e.minX = Math.min(e.minX, minX); e.minY = Math.min(e.minY, minY); e.minZ = Math.min(e.minZ, minZ);
    e.maxX = Math.max(e.maxX, maxX); e.maxY = Math.max(e.maxY, maxY); e.maxZ = Math.max(e.maxZ, maxZ);
  };
  W.center = function (e, out) {
    out = out || new THREE.Vector3();
    return out.set((e.minX + e.maxX) / 2, (e.minY + e.maxY) / 2, (e.minZ + e.maxZ) / 2);
  };

  // Dégâts à une entité
  // opts : { pickaxe, weak, point:[x,y,z], by (personnage), silent, explosive }
  W.damage = function (e, dmg, opts) {
    if (!e || e.dead || e.invulnerable) return 0;
    opts = opts || {};
    e.hp -= dmg;
    const by = opts.by;
    // récolte à la pioche
    let gained = 0;
    if (opts.pickaxe && e.yield > 0 && by && W.HARVEST[e.mat]) {
      gained = Math.max(1, Math.round(e.yield * Math.min(dmg, e.hp + dmg) / e.maxHp * (by.aug && by.aug.recolte ? 1.5 : 1)));
      if (by.addMaterial) by.addMaterial(W.HARVEST[e.mat], gained);
    }
    // tremblement
    if (e.refs.length || e.meshes.length || e.shakeFn) {
      e.shakeT = 0.22;
      if (W.shaking.indexOf(e) < 0) W.shaking.push(e);
    }
    if (e.onHit) e.onHit(dmg, opts);
    if (e.hp <= 0) W.destroy(e, opts);
    return gained;
  };

  W.destroy = function (e, opts) {
    if (e.dead) return;
    opts = opts || {};
    e.dead = true;
    e.hp = 0;
    for (const r of e.refs) K.hide(r);
    for (const m of e.meshes) m.visible = false;
    for (const c of e.cols) G.Phys.remove(c);
    const c = W.center(e);
    if (!opts.silent && G.FX) {
      if (e.mat === 'glass') { G.FX.glass(c); G.Audio.play('glass', { pos: [c.x, c.y, c.z] }); }
      else {
        G.FX.debris(e, c);
        if (e.type !== 'glass') G.Audio.play('destroy', { pos: [c.x, c.y, c.z], mat: e.mat });
      }
    }
    if (e.onDestroy) e.onDestroy(opts);
    // dépendants (meubles posés, fenêtres dans un mur, etc.)
    if (e.deps) for (const d of e.deps) if (!d.dead) W.destroy(d, { silent: d.mat === 'glass' ? false : true, by: opts.by, chain: true });
    if (e.structural) W.checkCollapse(e);
  };

  // ------------------------------------------------------------
  //  Intégrité structurelle : ce qui n'est plus relié au sol s'effondre
  // ------------------------------------------------------------
  const qTmp = [];
  function neighbors(e) {
    const m = 0.12;
    const list = G.Phys.query(e.minX - m, e.minY - m, e.minZ - m, e.maxX + m, e.maxY + m, e.maxZ + m, 3, qTmp);
    const out = [];
    for (const c of list) {
      const n = c.ent;
      if (!n || n === e || n.dead || !n.structural) continue;
      if (out.indexOf(n) < 0) out.push(n);
    }
    return out;
  }
  W.neighbors = neighbors;

  W.checkCollapse = function (destroyed) {
    const starts = neighbors(destroyed);
    const checked = new Set();
    for (const s of starts) {
      if (checked.has(s) || s.dead) continue;
      // BFS
      const comp = [s];
      const seen = new Set([s]);
      let grounded = false;
      for (let i = 0; i < comp.length && !grounded; i++) {
        const cur = comp[i];
        if (cur.grounded) { grounded = true; break; }
        if (comp.length > 350) { grounded = true; break; }
        for (const n of neighbors(cur)) if (!seen.has(n)) { seen.add(n); comp.push(n); }
      }
      for (const c of comp) checked.add(c);
      if (!grounded) {
        // effondrement en cascade (du bas vers le haut)
        comp.sort((a, b) => a.minY - b.minY);
        comp.forEach((c, i) => W.collapseQueue.push({ e: c, t: 0.05 + i * 0.045 }));
      }
    }
  };

  W.update = function (dt) {
    // tremblements
    for (let i = W.shaking.length - 1; i >= 0; i--) {
      const e = W.shaking[i];
      e.shakeT -= dt;
      if (e.dead || e.shakeT <= 0) {
        if (!e.dead) { for (const r of e.refs) K.show(r); if (e.shakeFn) e.shakeFn(0); }
        W.shaking.splice(i, 1);
        continue;
      }
      const a = e.shakeT * (e.type === 'tree' ? 0.35 : 0.12);
      const ox = Math.sin(e.shakeT * 90) * a, oz = Math.cos(e.shakeT * 77) * a;
      for (const r of e.refs) K.shakeOffset(r, ox, 0, oz);
      if (e.shakeFn) e.shakeFn(a);
    }
    // effondrements
    for (let i = W.collapseQueue.length - 1; i >= 0; i--) {
      const q = W.collapseQueue[i];
      q.t -= dt;
      if (q.t <= 0) {
        W.collapseQueue.splice(i, 1);
        if (!q.e.dead) W.destroy(q.e, { collapse: true });
      }
    }
  };

  // Réinitialise tout le décor pour une nouvelle partie
  W.reset = function () {
    W.collapseQueue.length = 0;
    for (const e of W.ents) {
      if (e.type === 'build') continue;
      if (e.dead || e.hp < e.maxHp) {
        e.hp = e.maxHp;
        if (e.dead) {
          e.dead = false;
          for (const r of e.refs) K.show(r);
          for (const m of e.meshes) m.visible = true;
          for (const c of e.cols) G.Phys.add(c);
        }
        if (e.onRestore) e.onRestore();
      }
      if (e.reset) e.reset();
    }
  };

  // Entité touchée en un point (pour la pioche / armes) : utilitaire
  W.entAtRay = function (ox, oy, oz, dx, dy, dz, maxT, ignore) {
    const h = G.Phys.raycast(ox, oy, oz, dx, dy, dz, maxT, { mask: 2, ignore });
    return h;
  };
})();
