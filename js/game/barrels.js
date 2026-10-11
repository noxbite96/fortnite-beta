// ============================================================
//  BARILS : explosifs (rouges) et barils de Slurp (soin + bouclier)
//  Tirez dessus ou frappez-les : réactions en chaîne garanties !
// ============================================================
(function () {
  const U = G.U;
  const BR = { list: [], pending: [] };
  G.Barrels = BR;

  // un seul maillage (couleurs par sommet) par type de baril : 1 appel de rendu par baril
  const tplGeo = {};
  let mat = null;
  function barrelGeo(kind) {
    if (tplGeo[kind]) return tplGeo[kind];
    const V = G.Veg, parts = [];
    const main = kind === 'slurp' ? 0x8a4aff : 0xc82a20, band = kind === 'slurp' ? 0x30e0c8 : 0xffd23a, dark = 0x2a2a2a;
    parts.push(V.colored(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 14).translate(0, 0.55, 0), main, 0));
    for (const y of [0.18, 0.55, 0.92]) parts.push(V.colored(new THREE.CylinderGeometry(0.44, 0.44, 0.07, 14).translate(0, y, 0), y === 0.55 ? band : dark, 0));
    parts.push(V.colored(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 8).translate(0.18, 1.12, 0.05), dark, 0));
    tplGeo[kind] = V.merge(parts);
    return tplGeo[kind];
  }
  function model(kind) {
    if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const m = new THREE.Mesh(barrelGeo(kind), mat);
    m.castShadow = true;
    return m;
  }

  function add(kind, x, z) {
    const W = G.World, P = G.Phys;
    const y = P.supportAt(x, z, G.Terrain.height(x, z) + 3, 0.4, 0.6);
    const m = model(kind); m.position.set(x, y, z); m.rotation.y = Math.random() * 6.28;
    G.scene.add(m);
    const b = { kind, x, y, z, m };
    const e = W.ent('prop', 'metal', kind === 'slurp' ? 40 : 55, { yield: 0, noPickaxe: false });
    e.meshes.push(m);
    W.addCol(e, P.box(x - 0.42, y, z - 0.42, x + 0.42, y + 1.1, z + 0.42, e));
    e.onDestroy = (opts) => { BR.pending.push({ b, t: kind === 'slurp' ? 0 : 0.12 + Math.random() * 0.1, by: opts && opts.by }); };
    b.e = e;
    BR.list.push(b);
  }

  BR.init = function () {
    BR.hookAlarms();
    if (BR.list.length || !G.Folk) return;
    const groups = [['base', 'boom', 6], ['usine', 'boom', 7], ['station', 'boom', 5], ['docks', 'boom', 5], ['tours', 'boom', 3], ['sources', 'slurp', 4], ['lac', 'slurp', 4], ['plage', 'slurp', 3]];
    for (const [poi, kind, n] of groups) {
      const p = G.MapData.poiById(poi); if (!p) continue;
      // petits groupes de 2-3 barils côte à côte
      for (let i = 0; i < n;) {
        const s = G.Folk.findSpot(p.x, p.z, 5, Math.min(40, p.r * 0.7));
        const k = Math.min(n - i, 1 + Math.floor(Math.random() * 3));
        for (let j = 0; j < k; j++) { const a = Math.random() * 6.28; add(kind, s[0] + (j ? Math.cos(a) * 1.0 : 0), s[1] + (j ? Math.sin(a) * 1.0 : 0)); }
        i += k;
      }
    }
  };

  // ------------------------------------------------------------
  //  ALARMES DE VOITURE : frapper une voiture à la pioche peut la
  //  déclencher (klaxon + phares qui clignotent) et attirer les bots
  // ------------------------------------------------------------
  BR.alarms = [];
  BR.hookAlarms = function () {
    const W = G.World;
    if (W._alarmHook) return;
    W._alarmHook = true;
    const orig = W.damage;
    W.damage = function (e, dmg, opts) {
      const r = orig.apply(this, arguments);
      if (e && e.type === 'car' && e.mat === 'metal' && !e.dead && opts && opts.pickaxe) BR.tryAlarm(e, opts.by);
      return r;
    };
  };
  BR.tryAlarm = function (e, by) {
    const now = G.Game.time;
    if (e.alarmUntil > now || (e.alarmCd || 0) > now || Math.random() > 0.35) return;
    e.alarmUntil = now + 7; e.alarmCd = now + 25; e.alarmBeep = 0;
    BR.alarms.push(e);
    const c = G.World.center(e);
    const sh = G.Combat.shots || (G.Combat.shots = []);
    sh.push({ x: c.x, z: c.z, t: now, by: by || null }); if (sh.length > 40) sh.shift();
    if (by && by.isPlayer) G.HUD.notify('🚨 ALARME DE VOITURE !', 1.5);
  };
  function alarmTick(dt) {
    const now = G.Game.time;
    for (let i = BR.alarms.length - 1; i >= 0; i--) {
      const e = BR.alarms[i];
      if (e.dead || now > e.alarmUntil) { BR.alarms.splice(i, 1); continue; }
      e.alarmBeep -= dt;
      if (e.alarmBeep > 0) continue;
      e.alarmBeep = 0.5;
      const c = G.World.center(e);
      G.Audio.play('car_alarm', { pos: [c.x, c.y, c.z] });
      const yaw = e.carYaw || 0, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const y = e.minY + 0.8;
      for (const s of [-1, 1]) for (const f of [-1, 1]) {
        const x = c.x + fx * 2.15 * f + rx * 0.65 * s, z = c.z + fz * 2.15 * f + rz * 0.65 * s;
        G.FX.glow.spawn(x, y, z, 0, 0, 0, f > 0 ? 1 : 1, f > 0 ? 0.9 : 0.55, f > 0 ? 0.6 : 0.1, 0.9, 0.3, 0, 0, 0);
      }
    }
  }
  BR.update = function (dt) {
    alarmTick(dt);
    for (let i = BR.pending.length - 1; i >= 0; i--) {
      const q = BR.pending[i];
      q.t -= dt;
      if (q.t > 0) continue;
      BR.pending.splice(i, 1);
      const b = q.b;
      if (b.kind === 'slurp') {
        G.Combat.splash(b.x, b.y + 0.6, b.z, 5, 25, q.by);
        for (let k = 0; k < 40; k++) G.FX.glow.spawn(b.x, b.y + 0.8, b.z, U.rand(-3, 3), U.rand(2, 6), U.rand(-3, 3), 0.6, 0.3, 1, 0.25, 1, 9, 0.5);
      } else {
        G.Combat.explode(b.x, b.y + 0.6, b.z, 5, 75, 260, q.by || null, 'barrel');
        G.Game.shakeAmt = Math.max(G.Game.shakeAmt || 0, 0.3);
      }
    }
  };
  BR.reset = function () {
    BR.pending.length = 0; BR.alarms.length = 0;
    for (const e of G.World.ents) if (e.type === 'car') { e.alarmUntil = 0; e.alarmCd = 0; }
  };
})();
