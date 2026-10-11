// ============================================================
//  Outils administrateur en partie (touche F4)
//
//  Tout est conditionné par G.Server.canDev(), qui exige une
//  session de rang administrateur. Un joueur normal ne peut ni
//  ouvrir le menu, ni activer quoi que ce soit : les fonctions
//  renvoient une erreur et les drapeaux restent faux.
//
//  L'ESP est un simple rendu d'aide : des silhouettes qui
//  traversent les murs, plus la distance. Rien n'est lu côté
//  réseau — ce jeu est entièrement local, donc ces outils
//  n'ont aucun effet sur les autres joueurs.
// ============================================================
(function () {
  const D = { root: null, open: false, espT: 0 };
  G.DevMenu = D;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }));

  // ------------------------------------------------------------
  //  ESP : silhouettes visibles à travers les murs
  // ------------------------------------------------------------
  // On dessine un volume simple (boîte + tête) plutôt que la
  // silhouette réelle : moins coûteux, et lisible de loin.
  const ESP_GEOS = null;
  function espMaterial(color, opacity) {
    const key = 'esp_' + color + '_' + opacity;
    if (G.WModels.mats[key]) return G.WModels.mats[key];
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });
    G.WModels.mats[key] = m;
    return m;
  }
  function espMarker() {
    if (D.group) return D.group;
    const grp = new THREE.Group();
    grp.renderOrder = 999;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.9, 0.75), espMaterial(0xff3030, 0.22));
    box.position.y = 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), espMaterial(0xff6060, 0.3));
    head.position.y = 2.15;
    grp.add(box); grp.add(head);
    grp.visible = false;
    D.group = grp;
    D.box = box; D.head = head;
    G.scene.add(grp);
    return grp;
  }
  function espCleanup() {
    if (D.group) { G.scene.remove(D.group); D.group = null; D.box = D.head = null; }
  }

  D.updateESP = function () {
    const can = G.Server && G.Server.canDev();
    const on = can && G.Server.dev().esp;
    if (!on) { if (D.group) D.group.visible = false; return; }
    const grp = espMarker();
    grp.visible = true;
    // une seule silhouette, placée sur la cible la plus proche
    const tgt = G.Server.nearestEnemy();
    if (!tgt) { grp.visible = false; return; }
    grp.position.set(tgt.pos.x, tgt.pos.y, tgt.pos.z);
    const cam = G.camera;
    if (cam) grp.lookAt(cam.position.x, cam.position.y, cam.position.z);
  };

  D.disposeESP = function () { if (D.group) D.group.visible = false; };

  // ------------------------------------------------------------
  //  Menu F4
  // ------------------------------------------------------------
  const OPTIONS = [
    ['fly', 'Vol libre', 'Espace monte, Ctrl descend — la gravité est suspendue'],
    ['noclip', 'Traverser les murs', 'plus aucune collision avec les bâtiments'],
    ['speed', 'Vitesse x2', 'court deux fois plus vite'],
    ['aimbot', 'Aide à la visée', 'la caméra se recale sur l\'adversaire le plus proche'],
    ['esp', 'ESP', 'silhouette de la cible à travers les murs'],
    ['invincible', 'Invincibilité', 'aucun dégât, tempête comprise'],
  ];

  function html() {
    const d = G.Server.dev();
    const st = G.Game.state;
    const inMatch = st === 'playing' || st === 'bus' || st === 'warmup';
    const rows = OPTIONS.map((o) => `<div class="dv-row">
      <div class="dv-l"><b>${esc(o[1])}</b><span>${esc(o[2])}</span></div>
      <button class="dv-sw ${d[o[0]] ? 'on' : ''}" data-dv="${o[0]}">${d[o[0]] ? 'ACTIF' : 'inactif'}</button>
    </div>`).join('');
    return `<div class="dv-box">
      <h2 class="fn">OUTILS ADMIN <span class="dv-role">${esc((G.Auth.RANK_LABEL[(G.Auth.session() || {}).role] || ''))}</span></h2>
      <div class="dv-state">${inMatch ? 'Partie en cours — les outils prennent effet immédiatement.' : 'Aucune partie en cours. Lance une partie pour que les outils mordent.'}</div>
      ${rows}
      <div class="dv-foot">
        <button class="btn" id="dv-off">Tout désactiver</button>
        <button class="btn big" id="dv-close">Fermer (F4)</button>
      </div>
    </div>`;
  }

  D.toggle = function () {
    if (!G.Server || !G.Server.canDev()) {
      if (G.HUD && G.HUD.notify) G.HUD.notify('Réservé aux administrateurs', 2.5);
      return;
    }
    D.open ? D.close() : D.show();
  };

  D.show = function () {
    if (D.open) return;
    D.close();
    const el = document.createElement('div');
    el.id = 'dev-root';
    el.className = 'dv-overlay';
    el.innerHTML = html();
    document.body.appendChild(el);
    D.root = el; D.open = true;
    G.Game.ignoreUnlock = true;
    G.Input.exitLock();
    // on gèle la partie comme pour les paramètres
    if (!G.HUD.paused && (G.Game.state === 'playing' || G.Game.state === 'bus' || G.Game.state === 'warmup')) {
      D.wasPaused = false;
      G.HUD.showPause(true);
    } else {
      D.wasPaused = G.HUD.paused;
    }
    el.querySelectorAll('[data-dv]').forEach((b) => {
      b.addEventListener('click', () => {
        const r = G.Server.toggleDev(b.dataset.dv);
        if (!r.ok) { if (G.HUD.notify) G.HUD.notify(r.error, 3); return; }
        G.HUD.notify((r.dev[b.dataset.dv] ? 'Activé : ' : 'Désactivé : ') + b.dataset.dv, 1.6);
        el.innerHTML = html();
        D.bind(el);
      });
    });
    D.bind(el);
  };

  D.bind = function (el) {
    const off = el.querySelector('#dv-off');
    if (off) off.addEventListener('click', () => { G.Server.allDevOff(); G.HUD.notify('Outils admin désactivés', 2); el.innerHTML = html(); D.bind(el); });
    const cl = el.querySelector('#dv-close');
    if (cl) cl.addEventListener('click', () => D.close());
    el.querySelectorAll('.dv-sw').forEach((b) => b.addEventListener('mouseenter', () => G.Audio.play('ui_hover')));
  };

  D.close = function () {
    if (D.root) { D.root.remove(); D.root = null; }
    D.open = false;
    if (G.Game) G.Game.ignoreUnlock = false;
    if (G.HUD) {
      if (D.wasPaused === false) G.HUD.showPause(false);
      else if (!G.HUD.paused && D.open === false && G.Server && G.Server.canDev() && false) G.HUD.showPause(true);
    }
    D.wasPaused = undefined;
    G.Input.requestLock();
  };

  // touche F4 + fermeture par Échap
  document.addEventListener('keydown', (e) => {
    if (e.code === 'F4') { e.preventDefault(); D.toggle(); return; }
    if (e.code === 'Escape' && D.open) { e.preventDefault(); e.stopPropagation(); D.close(); }
  }, true);

  // appelée à chaque frame par le jeu
  D.update = function () {
    if (!G.Server || !G.Server.canDev()) {
      // les droits ont disparu (déconnexion, session fermée) : on coupe
      // tout réellement, sinon les outils se rallumeraient seuls au
      // prochain login.
      if (D.group) D.group.visible = false;
      if (D.open) D.close();
      G.Server.devRevoke();
      return;
    }
    D.updateESP();
  };

  // -------
})();