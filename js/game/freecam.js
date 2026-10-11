// ============================================================
//  MODE CAMÉRA LIBRE (touche P) : interface masquée, vol libre
//  ZQSD + souris, Espace / Ctrl pour monter / descendre,
//  Maj pour aller vite, molette pour le zoom. Idéal pour filmer.
// ============================================================
(function () {
  const U = G.U;
  const FC = { on: false, pos: new THREE.Vector3(), yaw: 0, pitch: 0, fov: 70, vel: new THREE.Vector3(), slow: false };
  G.FreeCam = FC;

  FC.toggle = function () {
    const st = G.Game.state;
    if (!FC.on && !(st === 'warmup' || st === 'bus' || st === 'playing' || st === 'ended')) return;
    FC.on = !FC.on;
    const hud = document.getElementById('hud');
    if (FC.on) {
      const cam = G.camera;
      FC.pos.copy(cam.position);
      const d = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      FC.yaw = Math.atan2(-d.x, -d.z); FC.pitch = Math.asin(U.clamp(d.y, -1, 1));
      FC.fov = cam.fov; FC.vel.set(0, 0, 0);
      if (hud) hud.style.visibility = 'hidden';
      FC.hint(true);
    } else {
      if (hud) hud.style.visibility = '';
      FC.hint(false);
    }
    G.Audio.play('ui_click');
  };
  FC.hint = function (on) {
    let el = document.getElementById('freecam-hint');
    if (!el) { el = document.createElement('div'); el.id = 'freecam-hint'; el.className = 'fn'; document.body.appendChild(el); }
    el.innerHTML = 'CAMÉRA LIBRE — ZQSD + souris · Espace / Ctrl : monter / descendre · Maj : rapide · Alt : lent · molette : zoom · P : quitter';
    el.classList.remove('show'); void el.offsetWidth;
    if (on) el.classList.add('show');
  };

  document.addEventListener('keydown', (e) => {
    if (!G.Input.hit('freecam') || e.repeat) return;
    if (G.HUD && (G.HUD.paused || G.HUD.invOpen || G.HUD.fullMapOpen)) return;
    if (G.Folk && G.Folk.open) return;
    FC.toggle();
  });

  // appelé par la boucle de jeu à la place de la caméra normale
  FC.update = function (cam, dt) {
    const In = G.Input, m = In.mouse;
    if (In.locked || In.playing()) { FC.yaw -= m.dx * 0.0022; FC.pitch = U.clamp(FC.pitch - m.dy * 0.0022, -1.5, 1.5); }
    const lx = In.lookX(), ly = In.lookY();
    if (lx || ly) { FC.yaw -= lx * 2.2 * dt; FC.pitch = U.clamp(FC.pitch - ly * 2.2 * dt, -1.5, 1.5); }
    if (m.wheel) FC.fov = U.clamp(FC.fov + m.wheel * 4, 20, 100);
    const sp = (In.down('sprint') ? 60 : In.down('crouch') ? 4 : 18);
    const f = In.forward(), s = In.strafe(), u = (In.down('jump') ? 1 : 0) - (In.down('crouch') || In.down('crouchToggle') ? 1 : 0);
    const cp = Math.cos(FC.pitch);
    const fx = -Math.sin(FC.yaw) * cp, fy = Math.sin(FC.pitch), fz = -Math.cos(FC.yaw) * cp;
    const rx = Math.cos(FC.yaw), rz = -Math.sin(FC.yaw);
    const tx = (fx * f + rx * s) * sp, ty = (fy * f + u) * sp, tz = (fz * f + rz * s) * sp;
    FC.vel.x = U.damp(FC.vel.x, tx, 5, dt); FC.vel.y = U.damp(FC.vel.y, ty, 5, dt); FC.vel.z = U.damp(FC.vel.z, tz, 5, dt);
    FC.pos.addScaledVector(FC.vel, dt);
    const g = Math.max(G.Terrain.height(FC.pos.x, FC.pos.z), -1) + 0.4;
    if (FC.pos.y < g) FC.pos.y = g;
    cam.position.copy(FC.pos);
    cam.rotation.set(FC.pitch, FC.yaw, 0, 'YXZ');
    if (Math.abs(cam.fov - FC.fov) > 0.01) { cam.fov = FC.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
  };
})();
