// ============================================================
//  Interface en jeu (HUD)
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const H = { paused: false, fullMapOpen: false, emoteWheelOpen: false, els: {}, MAPVIEW: { cx: 0, cz: 50, h: 715 } };
  G.HUD = H;

  const html = `
  <div id="hud" class="hidden">
    <div id="storm-overlay"></div>
    <div id="dmg-vignette"></div>
    <div id="flash"></div>
    <div id="scope" class="hidden"><div class="scope-ring"></div><div class="scope-h"></div><div class="scope-v"></div></div>
    <div id="dmg-dirs"></div>
    <div id="compass"><div id="compass-strip"></div><div id="compass-deg">0</div><div class="compass-tick"></div></div>
    <div id="topright">
      <div id="minimap-wrap"><canvas id="minimap" width="220" height="220"></canvas><div id="mm-poi"></div></div>
      <div id="info-row">
        <div class="info"><span class="ico">⏱</span><span id="storm-time">0:00</span></div>
        <div class="info"><span class="ico">👤</span><span id="alive">0</span></div>
        <div class="info"><span class="ico">🎯</span><span id="kills">0</span></div>
      </div>
      <div id="storm-bar"><div class="sb-ph fn"></div><div class="sb-track"><div class="sb-fill"></div><div class="sb-me"></div></div></div>
      <div id="storm-label"></div>
      <div id="clock"></div>
    </div>
    <div id="killfeed"></div>
    <div id="notify"></div>
    <div id="pickup-notes"></div>
    <div id="warmup" class="fn"></div>
    <div id="crosshair"><div class="ch t"></div><div class="ch b"></div><div class="ch l"></div><div class="ch r"></div><div class="ch dot"></div><div class="ch circ"></div></div>
    <div id="hitmarker"><div></div><div></div><div></div><div></div></div>
    <div id="interact" class="hidden"><div class="key fn">E</div><div class="itxt"><div class="iname"></div><div class="iact"></div></div><div class="iprog"><div></div></div></div>
    <div id="use-ring" class="hidden"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fg" id="use-arc"/></svg><div id="use-txt"></div><div id="use-time"></div></div>
    <div id="elim-banner"></div>
    <div id="team-panel" class="hidden"></div>
    <div id="rumble-score" class="hidden"><div class="rs-t blue"><span class="rs-n fn">0</span><span class="rs-l">VOTRE ÉQUIPE</span></div><div class="rs-goal fn"></div><div class="rs-t red"><span class="rs-n fn">0</span><span class="rs-l">ÉQUIPE ROUGE</span></div></div>
    <div id="boss-bar" class="hidden"><div class="bb-name fn"></div><div class="bb-bars"><div class="bb-sh"><div></div></div><div class="bb-hp"><div></div></div></div></div>
    <div id="sound-viz"></div>
    <div id="poi-banner"><div class="pb-name fn"></div><div class="pb-sub"></div></div>
    <div id="enemy-pings"></div>
    <div id="ping-marker" class="hidden"><div class="pm-pin">▼</div><div class="pm-dist"></div></div>
    <div id="downed-ov" class="hidden"><div class="dt fn">VOUS ÊTES À TERRE</div><div class="ds">Rampez à couvert — votre coéquipier peut vous réanimer</div><div class="db"><div id="downed-fill"></div></div><div class="dr" id="downed-rev"></div></div>
    <div id="bottomleft">
      <div id="player-name"></div>
      <div class="bar-row hidden" id="os-row"><div class="bar-ico os">◈</div><div class="bar os"><div id="os-fill"></div></div><div class="bar-num fn" id="os-num">0</div></div>
      <div class="bar-row"><div class="bar-ico sh">🛡</div><div class="bar sh"><div id="sh-fill"></div><div id="sh-ghost"></div></div><div class="bar-num fn" id="sh-num">0</div></div>
      <div class="bar-row"><div class="bar-ico hp">✚</div><div class="bar hp"><div id="hp-fill"></div><div id="hp-ghost"></div></div><div class="bar-num fn" id="hp-num">100</div></div>
    </div>
    <div id="bottomright">
      <div id="ammo-info" class="fn"><span id="ammo-mag">0</span><span class="sep">|</span><span id="ammo-res">0</span></div>
      <div id="weapon-name" class="fn"></div>
      <div id="mats">
        <div class="mat" data-m="wood"><div class="mico wood"></div><span id="m-wood">0</span><div class="mgain" id="mg-wood"></div></div>
        <div class="mat" data-m="stone"><div class="mico stone"></div><span id="m-stone">0</span><div class="mgain" id="mg-stone"></div></div>
        <div class="mat" data-m="metal"><div class="mico metal"></div><span id="m-metal">0</span><div class="mgain" id="mg-metal"></div></div>
        <div class="mat gold" id="mat-gold"><div class="mico gold"></div><span id="m-gold">0</span></div>
      </div>
      <div id="ammo-list"></div>
      <div id="inventory"></div>
    </div>
    <div id="build-bar" class="hidden"></div>
    <div id="edit-hint" class="hidden fn">MODE ÉDITION — Clic : sélectionner · Clic droit : réinitialiser · G : valider</div>
    <div id="spectate" class="hidden"></div>
    <div id="death" class="hidden"></div>
    <div id="emote-wheel" class="hidden"></div>
    <div id="fps" class="hidden"></div>
    <div id="bus-hint" class="hidden fn"><span class="key">ESPACE</span> SAUTER DU BUS <span class="bh2"><span class="key">B</span> REMERCIER LE CHAUFFEUR</span></div>
    <div id="controls-hint"></div>
    <div id="click-play" class="hidden fn">CLIQUEZ POUR JOUER</div>
    <div id="storm-alert" class="hidden fn"></div>
    <div id="xp-toasts"></div>
    <div id="inv-screen" class="hidden"></div>
  </div>
  <div id="fade"></div>
  <div id="pause" class="hidden">
    <div class="pause-box">
      <div class="pause-title fn">PAUSE</div>
      <button class="btn big fn" id="btn-resume">Reprendre</button>
      <button class="btn fn" id="btn-p-settings">Paramètres</button>
      <button class="btn fn" id="btn-controls">Commandes</button>
      <button class="btn fn red" id="btn-quit">Quitter la partie</button>
      <div id="controls-box" class="hidden"></div>
    </div>
  </div>
  <div id="fullmap" class="hidden"><canvas id="fullmap-c"></canvas><div class="fm-legend fn">CARTE — Clic gauche : placer un marqueur · Clic droit : retirer · M : fermer</div>
    <div id="fm-key"><div class="fk-t fn">LÉGENDE</div>
      <div class="fk"><i class="k-me"></i>Vous</div>
      <div class="fk duo-only"><i class="k-mate"></i>Coéquipier</div>
      <div class="fk"><i class="k-ping"></i>Marqueur</div>
      <div class="fk"><i class="k-zone"></i>Prochaine zone</div>
      <div class="fk"><i class="k-boss"></i>Boss (le Roi, Oméga, le Général, la Reine)</div>
      <div class="fk"><i class="k-medal"></i>Porteur de médaillon</div>
      <div class="fk"><i class="k-tornado"></i>Tornade</div>
      <div class="fk"><i class="k-cube"></i>Le Cube</div>
      <div class="fk"><i class="k-hot"></i>Point chaud</div>
      <div class="fk"><i class="k-drone"></i>Drone de butin</div>
      <div class="fk"><i class="k-bench"></i>Établi d'amélioration</div>
      <div class="fk duo-only"><i class="k-van"></i>Camionnette de renfort</div>
      <div class="fk"><i class="k-fish"></i>Banc de poissons</div>
      <div class="fk"><i class="k-zip"></i>Tyrolienne</div>
      <div class="fk"><i class="k-npc"></i>Personnage (marchand, quête)</div>
      <div class="fk"><i class="k-air"></i>Avion / hélicoptère</div>
      <div class="fk"><i class="k-mech"></i>Mécha de combat</div>
      <div class="fk"><i class="k-bounty"></i>Panneau des contrats / zone de la cible</div>
      <div class="fk"><i class="k-treasure">✖</i>Trésor (carte au trésor)</div>
    </div></div>`;

  H.init = function () {
    const root = document.getElementById('ui-root');
    root.insertAdjacentHTML('beforeend', html);
    const $ = (id) => document.getElementById(id);
    H.$ = $;
    H.els = { hud: $('hud'), hpFill: $('hp-fill'), shFill: $('sh-fill'), hpGhost: $('hp-ghost'), shGhost: $('sh-ghost'), hpNum: $('hp-num'), shNum: $('sh-num'), inv: $('inventory'), alive: $('alive'), kills: $('kills'), stormTime: $('storm-time'), stormLabel: $('storm-label'), notify: $('notify'), kf: $('killfeed'), cross: $('crosshair'), hit: $('hitmarker'), interact: $('interact'), useRing: $('use-ring'), useArc: $('use-arc'), useTxt: $('use-txt'), useTime: $('use-time'), ammoMag: $('ammo-mag'), ammoRes: $('ammo-res'), ammoInfo: $('ammo-info'), wname: $('weapon-name'), build: $('build-bar'), compass: $('compass-strip'), compassDeg: $('compass-deg'), mm: $('minimap'), warm: $('warmup'), fps: $('fps'), scope: $('scope'), stormOv: $('storm-overlay'), vig: $('dmg-vignette'), flashEl: $('flash'), fade: $('fade'), notes: $('pickup-notes'), elim: $('elim-banner'), spect: $('spectate'), death: $('death'), wheel: $('emote-wheel'), pause: $('pause'), fullmap: $('fullmap'), fmc: $('fullmap-c'), dirs: $('dmg-dirs'), clock: $('clock'), busHint: $('bus-hint'), editHint: $('edit-hint'), ammoList: $('ammo-list'), pname: $('player-name'), ctrlHint: $('controls-hint') };
    H.mmCtx = H.els.mm.getContext('2d');
    // inventaire
    let inv = '<div class="slot pick" data-i="-1"><div class="sico pickico"></div><div class="skey fn">F</div></div>';
    for (let i = 0; i < 5; i++) inv += `<div class="slot" data-i="${i}"><img class="sicon"><div class="scount fn"></div><div class="skey fn">${i + 1}</div></div>`;
    H.els.inv.innerHTML = inv;
    H.slotEls = Array.from(H.els.inv.querySelectorAll('.slot'));
    // barre de construction
    let bb = '';
    const keys = ['F1', 'F2', 'F3', 'F4'];
    G.Build.TYPES.forEach((t, i) => { bb += `<div class="bslot" data-t="${t}"><div class="bico b-${t}"></div><div class="bname fn">${G.Build.NAMES[t]}</div><div class="bkey fn">${keys[i]}</div></div>`; });
    bb += '<div class="bmat fn" id="bmat"></div>';
    H.els.build.innerHTML = bb;
    H.bslots = Array.from(H.els.build.querySelectorAll('.bslot'));
    // boussole
    let cs = '';
    const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };
    for (let k = -1; k <= 1; k++) for (let d = 0; d < 360; d += 15) {
      const deg = d + k * 360;
      const lab = labels[d];
      cs += `<div class="cmark ${lab ? 'big' : ''}" style="left:${deg * 4}px">${lab || (d % 45 === 0 ? '' : '|')}</div>`;
    }
    cs += '<div id="compass-zone" class="cicon">◯</div><div id="compass-ping" class="cicon ping">▼</div>';
    H.els.compass.innerHTML = cs;
    H.compassZone = $('compass-zone'); H.compassPing = $('compass-ping');
    // pause
    $('btn-resume').onclick = () => { H.showPause(false); G.Input.requestLock(); G.Audio.play('ui_click'); };
    $('btn-quit').onclick = () => {
      G.Audio.play('ui_back'); H.showPause(false);
      if (G.Match.endShown || G.Match.playground) { G.Match.leave(); return; }
      if (G.player && !G.player.dead && G.Game.state !== 'ended') { G.Match.placement = G.Match.alive; G.player.stats.placement = G.Match.alive; }
      G.Match.showEnd(false);
    };
    $('btn-p-settings').onclick = () => { G.Audio.play('ui_click'); G.Menu.openSettings(true); };
    $('btn-controls').onclick = () => { $('controls-box').classList.toggle('hidden'); G.Audio.play('ui_click'); };
    $('controls-box').innerHTML = H.controlsHTML();
    // carte
    H.els.fmc.addEventListener('mousedown', (e) => {
      const r = H.els.fmc.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const V = H.MAPVIEW;
      if (e.button === 0) { H.ping = { x: V.cx - V.h + x * 2 * V.h, z: V.cz - V.h + y * 2 * V.h }; G.Audio.play('ui_click'); }
      else H.ping = null;
      H.drawFullMap();
    });
    document.addEventListener('keydown', (e) => {
      if (!(G.Game.state === 'warmup' || G.Game.state === 'bus' || G.Game.state === 'playing' || G.Game.state === 'ended')) return;
      if (G.Input.hit('map') && !H.paused && !H.invOpen && !H.fullMapOpen) H.toggleMap();
      // Échap : ferme ce qui est ouvert, sinon ouvre la pause.
      // Tout passe par togglePause pour éviter les doubles appels.
      if (G.Input.hit('pause')) {
        e.preventDefault();
        if (G.Game.togglePause) G.Game.togglePause();
      }
      if (G.Input.hit('inventory') && !H.paused && !H.fullMapOpen && G.player && !G.player.dead && G.Game.state !== 'ended') {
        e.preventDefault();
        H.toggleInventory();
      }
    }, true);
    H.feed = [];
    H.notes = [];
  };

  H.controlsHTML = function () {
    const K = (code) => G.Input.nice(code);
    const rows = [['Tab', 'Inventaire (réorganiser, jeter)'], [K('KeyW') + ' ' + K('KeyA') + ' ' + K('KeyS') + ' ' + K('KeyD'), 'Se déplacer'], [K('KeyI') + ' ' + K('KeyJ') + ' ' + K('KeyK') + ' ' + K('KeyL'), 'Tourner la caméra (si la souris est libre)'], ['Espace', 'Sauter / sauter du bus / planeur'], ['Maj', 'Sprinter'], [K('KeyC') + ' / Ctrl', 'S\'accroupir (en sprintant : glisser)'], ['Espace contre un rebord', 'Escalader'], ['Espace en chute (haut)', 'Redéployer le planeur'], ['Clic gauche', 'Tirer / frapper / construire / utiliser'], ['Clic droit', 'Viser (lunette) / changer de matériau'], ['1 - 5 / molette', 'Emplacements d\'inventaire'], [K('KeyF'), 'Pioche'], [K('KeyA'), 'Mode construction'], ['F1 F2 F3 F4', 'Mur / Sol / Rampe / Toit'], [K('KeyG'), 'Modifier une construction'], [K('KeyE'), 'Ramasser / ouvrir / porte / parler aux personnages'], [K('KeyR') + ' (en véhicule)', 'Changer de station de radio'], [K('KeyH') + ' (en voiture)', 'Klaxonner'], ['Espace / Ctrl (hélicoptère)', 'Monter / descendre'], ['Maintenir clic (arc)', 'Bander l\'arc, relâcher pour tirer'], [K('KeyR'), 'Recharger'], [K('KeyX'), 'Jeter l\'objet'], [K('KeyB'), 'Roue des emotes'], [K('KeyM'), 'Carte'], ['Clic molette / ' + K('KeyV'), 'Placer un marqueur'], [K('KeyT'), 'Poser un tag (graffiti)'], [K('KeyU'), 'Choisir une augmentation (1 / 2, R : relancer)'], [K('KeyP'), 'Caméra libre (masque l\'interface, pour filmer)'], [K('KeyY') + ' (terrain de jeu)', 'Cibles d\'entraînement'], [K('KeyO') + ' (terrain de jeu)', 'Menu : véhicules, objets, événements, ambiance'], ['Échap', 'Pause']];
    return '<table class="ctrl">' + rows.map((r) => `<tr><td class="k">${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
  };

  H.show = function (on) { H.els.hud.classList.toggle('hidden', !on); if (!on) { H.showPause(false); if (H.fullMapOpen) H.toggleMap(); if (H.invOpen) H.toggleInventory(); } };
  H.modalOpen = () => H.paused || H.fullMapOpen || H.invOpen || !!(G.Folk && G.Folk.open) || !!(G.FreeCam && G.FreeCam.on) || !!(G.Sandbox && G.Sandbox.open) || !!(G.Aug && G.Aug.open);

  // ------------------------------------------------------------
  //  Écran d'inventaire (Tab) : réorganiser, jeter objets / munitions / matériaux
  // ------------------------------------------------------------
  H.toggleInventory = function () {
    H.invOpen = !H.invOpen;
    const el = H.$('inv-screen');
    el.classList.toggle('hidden', !H.invOpen);
    if (H.invOpen) { G.Game.ignoreUnlock = true; G.Input.exitLock(); H.invSel = -1; H.renderInventory(); G.Audio.play('ui_click'); setTimeout(() => { G.Game.ignoreUnlock = false; }, 300); }
    else { G.Input.requestLock(); G.Audio.play('ui_back'); }
  };
  H.renderInventory = function () {
    const pl = G.player, el = H.$('inv-screen');
    let s = '<h2 class="fn">INVENTAIRE</h2><div class="inv-row">';
    for (let i = 0; i < 5; i++) {
      const it = pl.slots[i];
      const bg = it ? I.RARITY[it.rarity].bg : '';
      s += `<div class="inv-slot ${H.invSel === i ? 'sel' : ''}" data-i="${i}" style="background:${bg}"><div class="ik fn">${i + 1}</div>${it ? `<img src="${G.WModels.itemIcon(it)}"><div class="in fn">${I.name(it)}${I.WEAPONS[it.id] ? ' · ' + it.ammo : ' ×' + it.count}</div>` : ''}</div>`;
    }
    s += '</div>';
    const it = H.invSel >= 0 ? pl.slots[H.invSel] : null;
    let info = 'Cliquez sur un emplacement puis sur un autre pour les échanger.';
    if (it) {
      const w = I.WEAPONS[it.id];
      info = `<b style="color:${I.RARITY[it.rarity].color};font-size:18px">${I.name(it)}</b> — ${I.RARITY[it.rarity].name}<br>`;
      if (w) info += `Dégâts ${I.damage(it)} · Cadence ${w.rate}/s · Chargeur ${w.mag} · Rechargement ${I.reloadTime(it).toFixed(1)} s · ${I.AMMO[w.ammo].name}<br><i>${w.desc}</i>`;
      else info += I.def(it.id).desc || '';
      info += '<br><button class="btn" id="inv-drop">Jeter</button>';
    }
    s += `<div class="inv-info">${info}</div><div class="inv-res">`;
    for (const t in I.AMMO) s += `<div class="ir"><span class="amc" style="background:${I.AMMO[t].color}"></span>${I.AMMO[t].short} : ${pl.ammo[t]} ${pl.ammo[t] > 0 ? `<button class="btn" data-da="${t}">Jeter</button>` : ''}</div>`;
    s += '</div><div class="inv-res">';
    for (const m in I.MAT) s += `<div class="ir"><span class="mico ${m}"></span>${I.MAT[m].name} : ${pl.mats[m]} ${pl.mats[m] >= 30 ? `<button class="btn" data-dm="${m}">Jeter 30</button>` : ''}</div>`;
    s += '</div><div class="fm-legend fn">TAB / ÉCHAP : FERMER</div>';
    el.innerHTML = s;
    el.querySelectorAll('.inv-slot').forEach((d) => d.onclick = () => {
      const i = +d.dataset.i;
      if (H.invSel >= 0 && H.invSel !== i) { const a = pl.slots[H.invSel]; pl.slots[H.invSel] = pl.slots[i]; pl.slots[i] = a; if (pl.sel === H.invSel) pl.sel = i; else if (pl.sel === i) pl.sel = H.invSel; H.invSel = -1; pl.refreshHeld(); G.Audio.play('equip'); }
      else H.invSel = H.invSel === i ? -1 : i;
      G.Audio.play('ui_hover');
      H.renderInventory();
    });
    const dropBtn = H.$('inv-drop');
    if (dropBtn) dropBtn.onclick = () => { pl.dropSlot(H.invSel); H.invSel = -1; G.Audio.play('drop'); H.renderInventory(); };
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw);
    el.querySelectorAll('[data-da]').forEach((b) => b.onclick = () => { const t = b.dataset.da, n = Math.min(pl.ammo[t], I.AMMO[t].pick * 2); pl.ammo[t] -= n; G.Loot.spawnAmmo(t, n, pl.pos.x + fx, pl.pos.y + 1, pl.pos.z + fz, fx * 2, 2, fz * 2).pickDelay = 1.5; G.Audio.play('drop'); H.renderInventory(); });
    el.querySelectorAll('[data-dm]').forEach((b) => b.onclick = () => { const m = b.dataset.dm; pl.mats[m] -= 30; G.Loot.spawnMat(m, 30, pl.pos.x + fx, pl.pos.y + 1, pl.pos.z + fz, fx * 2, 2, fz * 2).pickDelay = 1.5; G.Audio.play('drop'); H.renderInventory(); });
  };
  H.showPause = function (on) {
    H.paused = on;
    H.els.pause.classList.toggle('hidden', !on);
    if (!on) H.$('controls-box').classList.add('hidden');
  };
  H.toggleMapKey = function () { document.querySelectorAll('#fm-key .duo-only').forEach((e) => { e.style.display = G.Duo.active ? '' : 'none'; }); };
  H.toggleMap = function () {
    H.toggleMapKey();
    H.fullMapOpen = !H.fullMapOpen;
    H.els.fullmap.classList.toggle('hidden', !H.fullMapOpen);
    if (H.fullMapOpen) { G.Game.ignoreUnlock = true; G.Input.exitLock(); H.drawFullMap(); G.Audio.play('ui_click'); setTimeout(() => { G.Game.ignoreUnlock = false; }, 300); }
    else { G.Input.requestLock(); G.Audio.play('ui_back'); }
  };

  H.resetMatch = function () {
    H.els.kf.innerHTML = ''; H.feed = [];
    H.els.notes.innerHTML = '';
    H.els.death.classList.add('hidden'); H.els.spect.classList.add('hidden');
    H.els.elim.innerHTML = '';
    H.ping = null; H.curPoi = null; for (const p of H.enemyPings) p.t = 0;
    H.els.pname.textContent = G.player.name;
    // icône de la pioche équipée
    const pk = G.Cosmetics.items[G.player.cos.pickaxe];
    const pi = H.els.inv.querySelector('.pickico');
    if (pk && pi && G.Menu && G.Menu.iconFor) { pi.style.background = `center/contain no-repeat url(${G.Menu.iconFor(pk)})`; pi.classList.add('img'); }
    H.lastHp = 100; H.lastSh = 0;
    H.els.fade.style.opacity = 0;
    H.els.ctrlHint.innerHTML = '<b>' + G.Input.niceAll('moveForward') + '</b> avancer · <b>' + G.Input.niceAll('moveLeft') + '</b> gauche · <b>' + G.Input.niceAll('moveRight') + '</b> droite · <b>' + G.Input.niceAll('moveBack') + '</b> reculer<br><b>Clic</b> tirer · <b>' + G.Input.niceAll('buildMode') + '</b> construire · <b>' + G.Input.niceAll('interact') + '</b> ramasser · <b>' + G.Input.niceAll('map') + '</b> carte · <b>Échap</b> pause';
    H.els.ctrlHint.style.opacity = 1;
    setTimeout(() => { H.els.ctrlHint.style.opacity = 0; }, 12000);
  };

  // ---------- messages ----------
  H.notify = function (txt, dur, type) {
    const n = H.els.notify;
    if (!txt) { n.style.opacity = 0; return; }
    n.textContent = txt;
    n.className = 'fn show ' + (type || '');
    n.style.opacity = 1;
    clearTimeout(H.notifyTO);
    H.notifyTO = setTimeout(() => { n.style.opacity = 0; }, (dur || 2) * 1000);
  };
  H.pickupNote = function (txt, color) {
    const d = document.createElement('div');
    d.className = 'pnote fn';
    d.innerHTML = `<span style="color:${color}">${txt}</span>`;
    H.els.notes.appendChild(d);
    setTimeout(() => d.classList.add('out'), 1800);
    setTimeout(() => d.remove(), 2400);
    while (H.els.notes.children.length > 5) H.els.notes.firstChild.remove();
  };
  H.matGain = function (type, n) {
    const el = H.$('mg-' + type);
    if (!el) return;
    H['mg_' + type] = (H['mg_' + type] || 0) + n;
    el.textContent = '+' + H['mg_' + type];
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(H['mgt_' + type]);
    H['mgt_' + type] = setTimeout(() => { H['mg_' + type] = 0; el.classList.remove('pop'); }, 1300);
  };
  H.xpToast = function (n, reason) {
    const box = H.$('xp-toasts');
    const d = document.createElement('div');
    d.className = 'xpt fn';
    d.innerHTML = `<span class="xs">★</span> +${n} XP <small>${reason}</small>`;
    box.appendChild(d);
    G.Audio.play('xp');
    setTimeout(() => d.classList.add('out'), 1800);
    setTimeout(() => d.remove(), 2400);
    while (box.children.length > 4) box.firstChild.remove();
  };
  // Progression d'un défi (petit bandeau à droite, comme les quêtes de Fortnite)
  H.questProgress = function (def, p) {
    let el = H.$('quest-toast');
    if (!el) { el = document.createElement('div'); el.id = 'quest-toast'; H.$('hud').appendChild(el); }
    const k = Math.min(1, p / def.goal);
    el.innerHTML = `<div class="qt-t">DÉFI</div><div class="qt-n">${esc(def.name)}</div><div class="qt-b"><div style="width:${(k * 100).toFixed(0)}%"></div></div><div class="qt-p">${Math.floor(p)} / ${def.goal}</div>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  };
  H.challengeDone = function (def) {
    const d = document.createElement('div');
    d.className = 'chal-done fn';
    d.innerHTML = `<div class="ct">DÉFI TERMINÉ !</div><div class="cn">${def.name}</div><div class="cx">+${def.xp} XP</div>`;
    document.getElementById('hud').appendChild(d);
    setTimeout(() => d.remove(), 4200);
  };

  // Message du chat d'équipe (coéquipiers IA)
  H.teamChat = function (name, msg) {
    const d = document.createElement('div');
    d.className = 'kf team';
    d.innerHTML = `<b>${esc(name)}</b> : ${esc(msg)}`;
    H.els.kf.appendChild(d);
    setTimeout(() => d.classList.add('out'), 6000);
    setTimeout(() => d.remove(), 6600);
    while (H.els.kf.children.length > 7) H.els.kf.firstChild.remove();
  };
  // Marqueurs rouges posés par les coéquipiers sur les ennemis
  H.enemyPings = [];
  H.enemyPing = function (x, y, z, actor, dur) {
    let el = H.enemyPings.find((p) => p.t <= 0);
    if (!el) { if (H.enemyPings.length >= 8) el = H.enemyPings[0]; else { const e = document.createElement('div'); e.className = 'enemy-ping'; e.innerHTML = '<div class="ep-pin">◆</div><div class="ep-d"></div>'; H.$('enemy-pings').appendChild(e); el = { el: e, t: 0 }; H.enemyPings.push(el); } }
    el.x = x; el.y = y; el.z = z; el.t = dur || 5; el.a = actor || null;
  };
  function updateEnemyPings(pl, dt) {
    for (const p of H.enemyPings) {
      p.t -= dt;
      if (p.a) { if (p.a.dead) p.t = 0; else { p.x = p.a.pos.x; p.y = p.a.pos.y + 1.4; p.z = p.a.pos.z; } }
      let show = false;
      if (p.t > 0 && !H.fullMapOpen) {
        _mv.set(p.x, p.y + 0.6, p.z).project(G.camera);
        if (_mv.z < 1) {
          const x = U.clamp((_mv.x * 0.5 + 0.5) * window.innerWidth, 20, window.innerWidth - 20), y = U.clamp((-_mv.y * 0.5 + 0.5) * window.innerHeight, 20, window.innerHeight - 20);
          p.el.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
          p.el.querySelector('.ep-d').textContent = Math.round(Math.hypot(p.x - pl.pos.x, p.z - pl.pos.z)) + ' m';
          p.el.style.opacity = Math.min(1, p.t);
          show = true;
        }
      }
      p.el.style.display = show ? 'block' : 'none';
    }
  }
  H.killFeed = function (t, byPlayer, victimPlayer, weapon) {
    const d = document.createElement('div');
    d.className = 'kf' + (byPlayer ? ' me' : '') + (victimPlayer ? ' dead' : '');
    const icon = weapon && I.WEAPONS[weapon] ? `<img class="kf-ico" src="${G.WModels.itemIcon({ id: weapon, rarity: I.validRarities(weapon)[0] })}">` : '';
    d.innerHTML = t[0] ? `<b>${esc(t[0])}</b> ${icon} ${t[3] || 'a éliminé'} <b>${esc(t[1])}</b> ${esc(t[2])}` : `<b>${esc(t[1])}</b> ${esc(t[2])}`;
    H.els.kf.appendChild(d);
    setTimeout(() => d.classList.add('out'), 6000);
    setTimeout(() => d.remove(), 6600);
    while (H.els.kf.children.length > 6) H.els.kf.firstChild.remove();
  };
  function esc(s) { return String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }

  H.eliminationBanner = function (v) {
    const e = H.els.elim;
    e.innerHTML = `<div class="eb fn"><span class="ebt">ÉLIMINÉ</span> <span class="ebn">${esc(v.name)}</span></div><div class="ebc fn">${G.player.stats.kills} ÉLIMINATION${G.player.stats.kills > 1 ? 'S' : ''}</div>`;
    e.classList.remove('show'); void e.offsetWidth; e.classList.add('show');
  };
  H.victoryBanner = function () {
    const e = H.els.elim;
    e.innerHTML = `<div class="victory fn"><div class="v1">#1</div><div class="v2">VICTOIRE ROYALE</div></div>`;
    e.classList.remove('show'); void e.offsetWidth; e.classList.add('show', 'long');
  };
  H.showDeath = function (killer, o) {
    const d = H.els.death;
    const D = G.Duo, am = D.active ? D.mates.find((m) => !m.dead && !m.downed) : null, mateAlive = !!am;
    const place = mateAlive || G.Match.playground || G.Match.rumble ? null : D.active ? (G.Match.placement || D.teamsAlive() + 1) : G.Match.alive + 1;
    let how = killer ? `Éliminé par <b>${esc(killer.name)}</b>` : o.storm ? 'Éliminé par la tempête' : o.fall ? 'Chute mortelle' : 'Éliminé';
    d.innerHTML = `<div class="dplace fn">${place ? '#' + place : 'ÉLIMINÉ'}</div>` + (mateAlive ? `<div class="dsub">${esc(am.name)} est encore en vie — vous regardez votre équipe${D.mates.length > 1 ? ' (clic : coéquipier suivant)' : ''}</div>` : '') + (G.Match.playground ? '<div class="dsub">Réapparition dans 3 secondes…</div>' : '') + (G.Match.rumble ? '<div class="dsub">Réapparition dans 5 secondes…</div>' : '') + `<div class="dhow">${how}</div>` + (killer ? `<div class="dsub">${killer.name} — ${Math.round(killer.health)} PV · ${Math.round(killer.shield)} bouclier</div>` : '');
    // récapitulatif des dégâts subis (60 dernières secondes)
    const pl = G.player, now = G.Game.time, agg = {};
    for (const e of (pl.dmgLog || [])) if (now - e.t < 60) { const a = agg[e.name] || (agg[e.name] = { dmg: 0, hits: 0, weapon: e.weapon }); a.dmg += e.dmg; a.hits++; if (e.weapon) a.weapon = e.weapon; }
    const rows = Object.keys(agg).sort((a, b) => agg[b].dmg - agg[a].dmg).slice(0, 4);
    if (rows.length) d.innerHTML += `<div class="drecap"><div class="drt">DÉGÂTS SUBIS</div>` + rows.map((n) => { const a = agg[n], w = a.weapon && I.def(a.weapon); return `<div class="drl"><span>${esc(n)}${w ? ' <small>(' + esc(I.name({ id: a.weapon })) + ')</small>' : ''}</span><b>${Math.round(a.dmg)}</b></div>`; }).join('') + (killer ? `<div class="drl me"><span>Vos dégâts sur ${esc(killer.name)}</span><b>${Math.round(killer.dmgFromPlayer || 0)}</b></div>` : '') + '</div>';
    d.classList.remove('hidden');
    if (killer) { H.els.spect.textContent = 'VOUS REGARDEZ : ' + killer.name; H.els.spect.classList.remove('hidden'); }
  };
  H.flash = function (color, dur) {
    const f = H.els.flashEl;
    f.style.transition = 'none'; f.style.background = color; f.style.opacity = 0.35;
    void f.offsetWidth;
    f.style.transition = 'opacity ' + (dur || 0.3) + 's'; f.style.opacity = 0;
  };
  H.fade = function (dur) {
    const f = H.els.fade;
    f.style.transition = 'none'; f.style.opacity = 1; void f.offsetWidth;
    f.style.transition = 'opacity ' + (dur || 0.6) + 's'; f.style.opacity = 0;
  };

  // ---------- retours de combat ----------
  H.hitmarker = function (head, kill) {
    const h = H.els.hit;
    h.className = (head ? 'head' : '') + (kill ? ' kill' : '');
    h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
  };
  H.crosshairKick = function () { H.kick = 1; };
  H.setScope = function (on) {
    if (H.scopeOn === on) return;
    H.scopeOn = on;
    H.els.scope.classList.toggle('hidden', !on);
  };
  // Éclats bleus sur les bords de l'écran quand le bouclier du joueur se brise
  H.shieldBreak = function () {
    let el = document.getElementById('sh-break');
    if (!el) {
      el = document.createElement('div'); el.id = 'sh-break';
      let lines = '';
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2 + Math.random() * 0.3;
        let x = 50 + Math.cos(a) * 62, y = 50 + Math.sin(a) * 62, pts = x.toFixed(1) + ',' + y.toFixed(1);
        for (let k = 0; k < 4; k++) { x -= Math.cos(a) * (5 + Math.random() * 4) + (Math.random() - 0.5) * 5; y -= Math.sin(a) * (5 + Math.random() * 4) + (Math.random() - 0.5) * 5; pts += ' ' + x.toFixed(1) + ',' + y.toFixed(1); }
        lines += `<polyline points="${pts}" />`;
      }
      el.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>`;
      H.els.hud.appendChild(el);
    }
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  };
  H.damageTaken = function (dmg, o) {
    H.els.vig.style.transition = 'none'; H.els.vig.style.opacity = Math.min(0.9, 0.3 + dmg / 60); void H.els.vig.offsetWidth;
    H.els.vig.style.transition = 'opacity 0.8s'; H.els.vig.style.opacity = 0;
    if (o && o.by && o.by !== G.player && !o.storm) {
      const d = document.createElement('div');
      d.className = 'ddir';
      H.els.dirs.appendChild(d);
      H.hitDirs = H.hitDirs || [];
      H.hitDirs.push({ el: d, x: o.by.pos.x, z: o.by.pos.z, t: 1.5 });
    }
  };

  // ---------- roue des emotes ----------
  H.openEmoteWheel = function () {
    if (!G.player || G.player.state !== 'ground' && G.player.state !== 'lobby') return;
    H.emoteWheelOpen = true;
    H.wheelSel = -1; H.wheelX = 0; H.wheelY = 0;
    const em = G.Store.data.equipped.emotes;
    let s = '<div class="wh-center fn">EMOTES</div>';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 - Math.PI / 2;
      const it = em[i] ? G.Cosmetics.items[em[i]] : null;
      s += `<div class="wh-item fn" data-i="${i}" style="left:${50 + Math.cos(a) * 36}%;top:${50 + Math.sin(a) * 36}%">${it ? it.name : '<span class="empty">Vide</span>'}</div>`;
    }
    H.els.wheel.innerHTML = s;
    H.els.wheel.classList.remove('hidden');
  };
  H.emoteWheelMove = function (dx, dy) {
    H.wheelX += dx; H.wheelY += dy;
    const l = Math.hypot(H.wheelX, H.wheelY);
    if (l > 120) { H.wheelX *= 120 / l; H.wheelY *= 120 / l; }
    if (l > 25) {
      const a = Math.atan2(H.wheelY, H.wheelX) + Math.PI / 2;
      H.wheelSel = ((Math.round(a / (Math.PI * 2 / 6)) % 6) + 6) % 6;
    }
    H.els.wheel.querySelectorAll('.wh-item').forEach((e, i) => e.classList.toggle('sel', i === H.wheelSel));
  };
  H.closeEmoteWheel = function () {
    H.emoteWheelOpen = false;
    H.els.wheel.classList.add('hidden');
    const em = G.Store.data.equipped.emotes;
    return H.wheelSel >= 0 ? em[H.wheelSel] : null;
  };

  // ------------------------------------------------------------
  //  Mise à jour
  // ------------------------------------------------------------
  let mmT = 0, slowT = 0;
  H.update = function (dt) {
    const pl = G.player, E = H.els;
    if (!pl) return;
    const S = G.Store.data.settings;
    // vie / bouclier
    const hp = Math.max(0, pl.health), sh = Math.max(0, pl.shield);
    E.hpFill.style.width = hp + '%'; E.shFill.style.width = sh + '%';
    H.ghostHp = Math.max(hp, U.damp(H.ghostHp == null ? hp : H.ghostHp, hp, 3, dt));
    H.ghostSh = Math.max(sh, U.damp(H.ghostSh == null ? sh : H.ghostSh, sh, 3, dt));
    E.hpGhost.style.width = H.ghostHp + '%'; E.shGhost.style.width = H.ghostSh + '%';
    E.hpNum.textContent = Math.ceil(hp); E.shNum.textContent = Math.ceil(sh);
    if (G.Match.zeroBuild) { const os = Math.max(0, pl.overshield || 0); H.$('os-fill').style.width = (os / 50 * 100) + '%'; H.$('os-num').textContent = Math.ceil(os); }
    // compteurs
    E.alive.textContent = G.Match.alive;
    E.kills.textContent = pl.stats.kills;
    E.clock.textContent = G.Sky.hourString();
    // tempête
    const St = G.Storm;
    if (G.Game.state === 'warmup') { E.stormTime.textContent = U.fmtTime(G.Match.warmupT); E.stormLabel.textContent = 'Échauffement'; }
    else if (G.Match.rumble && St.state === 'end') { E.stormTime.textContent = '—'; E.stormLabel.innerHTML = 'ÉQUIPE CONTRE ÉQUIPE<br><span class="dist">Première équipe à ' + G.Match.RUMBLE_TARGET + ' éliminations</span>'; }
    else if (G.Match.playground) { E.stormTime.textContent = '∞'; E.stormLabel.innerHTML = 'TERRAIN DE JEU<br><span class="dist">Pas de tempête · matériaux infinis</span>'; }
    else if (St.active) {
      E.stormTime.textContent = St.state === 'end' ? '—' : U.fmtTime(St.timer);
      const dist = St.distToSafe(pl.pos.x, pl.pos.z);
      E.stormLabel.innerHTML = (St.state === 'shrink' ? '<span class="shr">LA TEMPÊTE SE RÉDUIT</span>' : St.state === 'wait' ? 'Tempête : réduction dans ' + U.fmtTime(St.timer) : 'Zone finale') + (dist > 0 && !pl.dead ? `<br><span class="dist">Zone sûre à ${Math.round(dist)} m</span>` : '');
    }
    // barre de progression de la tempête (phase, avancement, position du joueur)
    const sbar = H.$('storm-bar');
    if (St.active && !G.Match.playground && St.PHASES[St.phase]) {
      sbar.style.display = 'flex';
      const ph = St.PHASES[St.phase], tot = St.state === 'shrink' ? ph[1] : ph[0];
      const k = U.clamp(1 - St.timer / Math.max(1, tot), 0, 1);
      sbar.querySelector('.sb-ph').textContent = 'PHASE ' + (St.phase + 1) + '/' + St.PHASES.length;
      sbar.querySelector('.sb-fill').style.width = (k * 100).toFixed(1) + '%';
      sbar.querySelector('.sb-fill').classList.toggle('shr', St.state === 'shrink');
      const n = St.next || St.cur, dsafe = St.distToSafe(pl.pos.x, pl.pos.z);
      const me = sbar.querySelector('.sb-me');
      me.style.left = (dsafe > 0 ? U.clamp(100 - dsafe / Math.max(50, n.r * 2) * 100, 0, 96) : 100).toFixed(1) + '%';
      me.classList.toggle('safe', dsafe <= 0);
    } else sbar.style.display = 'none';
    // échauffement
    if (G.Game.state === 'warmup') { E.warm.style.display = 'block'; E.warm.innerHTML = `LE BUS DE COMBAT PART DANS <span>${Math.ceil(G.Match.warmupT)}</span>`; }
    else E.warm.style.display = 'none';
    E.busHint.classList.toggle('hidden', !(pl.state === 'bus' && G.Bus.doorsOpen));
    // effets de tempête
    E.stormOv.style.opacity = G.Sky.stormTint.toFixed(2);
    // inventaire
    updateInventory(pl);
    // matériaux / munitions
    E.build.classList.toggle('hidden', !pl.buildMode);
    E.editHint.classList.toggle('hidden', !G.Build.edit);
    if (pl.buildMode) {
      H.bslots.forEach((b) => b.classList.toggle('sel', b.dataset.t === pl.buildType));
      const m = I.MAT[pl.buildMat];
      H.$('bmat').innerHTML = `<div class="mico ${pl.buildMat}"></div>${m.name} <span>${pl.infiniteMats ? '∞' : pl.mats[pl.buildMat]}</span> <small>(clic droit : changer)</small>`;
    }
    document.querySelectorAll('#mats .mat').forEach((el) => el.classList.toggle('sel', pl.buildMode && el.dataset.m === pl.buildMat));
    H.$('m-wood').textContent = pl.infiniteMats ? '∞' : pl.mats.wood; H.$('m-stone').textContent = pl.infiniteMats ? '∞' : pl.mats.stone; H.$('m-metal').textContent = pl.infiniteMats ? '∞' : pl.mats.metal;
    if (H._gold !== pl.gold) { H._gold = pl.gold; H.$('m-gold').textContent = pl.gold || 0; H.$('mat-gold').classList.remove('bump'); void H.$('mat-gold').offsetWidth; H.$('mat-gold').classList.add('bump'); }
    const w = pl.curWeapon();
    if (w && !pl.buildMode) {
      const wd = I.WEAPONS[w.id];
      E.ammoInfo.style.display = 'block';
      E.ammoMag.textContent = wd.noAmmo ? '∞' : w.ammo;
      E.ammoRes.textContent = wd.noAmmo ? (wd.melee ? (G.Game.time < (pl.dashCd || 0) ? 'ruée ' + Math.ceil(pl.dashCd - G.Game.time) + ' s' : 'ruée prête') : '') : pl.infiniteAmmo ? '∞' : pl.ammo[wd.ammo];
      E.ammoInfo.classList.toggle('low', !wd.noAmmo && w.ammo <= wd.mag * 0.2);
      E.wname.textContent = wd.name; E.wname.style.color = I.RARITY[w.rarity].color;
      E.ammoInfo.classList.toggle('reload', pl.reloadT > 0);
    } else {
      E.ammoInfo.style.display = 'none';
      const c = pl.cur();
      E.wname.textContent = pl.buildMode ? 'CONSTRUCTION' : c ? I.name(c) : 'PIOCHE';
      E.wname.style.color = c ? I.RARITY[c.rarity].color : '#fff';
    }
    slowT -= dt;
    if (slowT <= 0) {
      slowT = 0.25;
      let al = '';
      for (const t in I.AMMO) al += `<div class="am" style="--c:${I.AMMO[t].color}"><span class="amc"></span>${pl.infiniteAmmo ? '∞' : pl.ammo[t]}</div>`;
      E.ammoList.innerHTML = al;
      E.fps.classList.toggle('hidden', !S.showFps);
      if (S.showFps) E.fps.textContent = G.clock.fps + ' IPS';
    }
    // viseur
    updateCrosshair(pl, dt);
    updateFlare(pl, dt);
    // jauge du jetpack
    { let jf = H.$('jet-fuel'); const ji = pl.cur && pl.cur(); const on = !!(ji && ji.id === 'jetpack' && !pl.dead);
      if (on && !jf) { jf = document.createElement('div'); jf.id = 'jet-fuel'; jf.innerHTML = '<div class="jf-t fn">CARBURANT</div><div class="jf-b"><div></div></div>'; H.$('hud').appendChild(jf); }
      if (jf) { jf.classList.toggle('hidden', !on); if (on) { const f = ji.fuel == null ? 100 : ji.fuel; jf.querySelector('.jf-b div').style.width = f.toFixed(0) + '%'; jf.classList.toggle('low', f < 25); } } }
    // interaction
    updateInteract(pl);
    // anneau d'utilisation
    if (pl.useT > 0) {
      E.useRing.classList.remove('hidden');
      const k = 1 - pl.useT / pl.useTotal;
      E.useArc.style.strokeDashoffset = (276.5 * (1 - k)).toFixed(1);
      const it = pl.slots[pl.useSlot];
      E.useTxt.textContent = it ? I.name(it) : '';
      E.useTime.textContent = pl.useT.toFixed(1) + ' s';
    } else if (pl.reloadT > 0 && pl.curWeapon() && !I.WEAPONS[pl.curWeapon().id].shellReload) {
      E.useRing.classList.remove('hidden');
      E.useArc.style.strokeDashoffset = (276.5 * (pl.reloadT / pl.reloadTotal)).toFixed(1);
      E.useTxt.textContent = 'Rechargement'; E.useTime.textContent = pl.reloadT.toFixed(1) + ' s';
    } else E.useRing.classList.add('hidden');
    // boussole
    updateCompass(pl);
    // indicateurs de dégâts
    if (H.hitDirs) for (let i = H.hitDirs.length - 1; i >= 0; i--) {
      const d = H.hitDirs[i];
      d.t -= dt;
      if (d.t <= 0) { d.el.remove(); H.hitDirs.splice(i, 1); continue; }
      const cam = G.camera;
      const ang = Math.atan2(d.x - cam.position.x, d.z - cam.position.z);
      const rel = ang - (cam.rotation.y + Math.PI);
      d.el.style.transform = `translate(-50%,-50%) rotate(${-rel}rad) translateY(-150px)`;
      d.el.style.opacity = Math.min(1, d.t);
    }
    // Rappel discret : la capture de souris est inactive, mais on joue quand
    // même au clavier. On ne l'affiche que si le joueur joue vraiment et que
    // la souris est inactive : pendant la pause, l'écran de pause suffit.
    const needClick = !G.Input.locked && !G.Input.lockFailed
      && !H.paused && !H.fullMapOpen && !H.invOpen
      && !(G.Folk && G.Folk.open) && !(G.Sandbox && G.Sandbox.open)
      && !(G.Aug && G.Aug.open) && !G.Match.endShown
      && !document.getElementById('m-settings');
    H.$('click-play').classList.toggle('hidden', !needClick);
    // mini-carte (15 ips)
    mmT -= dt;
    if (mmT <= 0) { mmT = 1 / 15; drawMinimap(pl); }
    if (H.fullMapOpen && Math.random() < 0.1) H.drawFullMap();
    // spectateur
    if (pl.dead && G.Match.spectate && !G.Match.spectate.dead) {
      const s = G.Match.spectate;
      E.spect.classList.remove('hidden');
      E.spect.innerHTML = `VOUS REGARDEZ : <b>${esc(s.name)}</b> <span class="spk">${s.stats.kills} élim. · ${Math.ceil(s.health)} PV</span><div class="spk2">Clic : joueur suivant</div>`;
    }
    // alerte tempête
    const inStorm = !pl.dead && pl.inStorm;
    H.$('storm-alert').classList.toggle('hidden', !inStorm);
    if (inStorm) H.$('storm-alert').textContent = 'VOUS ÊTES DANS LA TEMPÊTE ! −' + G.Storm.damage() + ' PV/s';
    updateSoundViz(pl, dt);
    updateEnemyPings(pl, dt);
    // nom du lieu quand on y entre
    H.poiT = (H.poiT || 0) - dt;
    if (H.poiT <= 0 && !pl.dead && pl.state !== 'bus' && pl.state !== 'lobby' && G.Game.state === 'playing') {
      H.poiT = 0.5;
      let cur = null;
      for (const q of G.MapData.pois) if (Math.hypot(q.x - pl.pos.x, q.z - pl.pos.z) < q.r * 0.85) cur = q;
      if (!cur) for (const q of G.MapData.landmarks) if (Math.hypot(q.x - pl.pos.x, q.z - pl.pos.z) < q.r + 12) cur = q;
      if (cur !== H.curPoi) {
        H.curPoi = cur;
        if (cur) {
          const b = H.$('poi-banner');
          b.querySelector('.pb-name').textContent = cur.name.toUpperCase();
          b.querySelector('.pb-sub').textContent = G.MapData.pois.indexOf(cur) >= 0 ? 'LIEU NOMMÉ' : 'REPÈRE';
          b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
        }
      }
    }
    // marqueur placé dans le monde
    const pmk = H.$('ping-marker');
    let pshow = false;
    if (H.ping && !pl.dead && pl.state !== 'bus' && !H.fullMapOpen) {
      const py = H.ping.y != null ? H.ping.y : G.Terrain.height(H.ping.x, H.ping.z);
      _mv.set(H.ping.x, py + 1.2, H.ping.z).project(G.camera);
      if (_mv.z < 1) {
        const x = U.clamp((_mv.x * 0.5 + 0.5) * window.innerWidth, 20, window.innerWidth - 20), y = U.clamp((-_mv.y * 0.5 + 0.5) * window.innerHeight, 20, window.innerHeight - 20);
        pmk.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
        pmk.querySelector('.pm-dist').textContent = Math.round(Math.hypot(H.ping.x - pl.pos.x, H.ping.z - pl.pos.z)) + ' m';
        pshow = true;
      }
    }
    pmk.classList.toggle('hidden', !pshow);
    // équipe (duo)
    updateTeam(pl, dt);
    // tableau des scores (équipe contre équipe)
    const rs = H.$('rumble-score');
    rs.classList.toggle('hidden', !G.Match.rumble || G.Game.state === 'warmup');
    if (G.Match.rumble) {
      const my = pl.team || 0, sc = G.Match.teamScore;
      rs.querySelector('.blue .rs-n').textContent = sc[my]; rs.querySelector('.red .rs-n').textContent = sc[1 - my];
      rs.querySelector('.rs-goal').textContent = 'OBJECTIF ' + G.Match.RUMBLE_TARGET;
    }
    // barre de vie du boss
    const bb = G.NPC.bossBar();
    H.$('boss-bar').classList.toggle('hidden', !bb);
    if (bb) { H.$('boss-bar').querySelector('.bb-name').textContent = '♛ ' + bb.name.toUpperCase(); H.$('boss-bar').querySelector('.bb-hp div').style.width = (bb.hp * 100).toFixed(1) + '%'; H.$('boss-bar').querySelector('.bb-sh div').style.width = (bb.sh * 100).toFixed(1) + '%'; }
    // battements de cœur à faible santé
    if (!pl.dead && pl.health < 30 && pl.state !== 'bus') {
      H.heartT = (H.heartT || 0) - dt;
      if (H.heartT <= 0) { H.heartT = 0.85; G.Audio.play('heartbeat'); }
    }
  };

  // ------------------------------------------------------------
  //  Visualisation des effets sonores (accessibilité Fortnite)
  // ------------------------------------------------------------
  const SV_ICON = {
    gun: '<svg viewBox="0 0 24 24"><path d="M2 9h15l2-2h3v4h-3l-1 1h-4l-1 5H9l1-5H2z"/></svg>',
    step: '<svg viewBox="0 0 24 24"><ellipse cx="8" cy="8" rx="3" ry="5"/><ellipse cx="16" cy="15" rx="3" ry="5"/></svg>',
    boom: '<svg viewBox="0 0 24 24"><path d="M12 1l2 6 6-3-3 6 6 2-6 2 3 6-6-3-2 6-2-6-6 3 3-6-6-2 6-2-3-6 6 3z"/></svg>',
    build: '<svg viewBox="0 0 24 24"><path d="M3 20l9-9 3 3-9 9H3zM13 4l7 7-3 3-7-7z"/></svg>',
    glider: '<svg viewBox="0 0 24 24"><path d="M2 12Q12 2 22 12L12 9z"/><path d="M12 9v12" stroke-width="2"/></svg>',
    chest: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 9q9-7 18 0z"/><rect x="10" y="11" width="4" height="4" fill="#000"/></svg>',
  };
  const svPool = [];
  const svList = [];
  H.soundViz = function (type, pos) {
    if (!G.Store.data.settings.soundViz || !G.player || G.Game.state === 'menu') return;
    const pl = G.player;
    const d = Math.hypot(pos[0] - pl.pos.x, pos[2] - pl.pos.z);
    if (d < 2.5 || d > (type === 'gun' || type === 'boom' ? 180 : 40)) return;
    // fusionne avec une icône proche du même type
    for (const s of svList) if (s.type === type && Math.hypot(s.x - pos[0], s.z - pos[2]) < 6) { s.t = 1.6; s.x = pos[0]; s.z = pos[2]; return; }
    if (svList.length > 14) return;
    let el = svPool.pop();
    if (!el) { el = document.createElement('div'); el.className = 'sv'; H.$('sound-viz').appendChild(el); }
    el.innerHTML = SV_ICON[type]; el.dataset.type = type; el.style.display = 'block';
    svList.push({ el, type, x: pos[0], z: pos[2], t: 1.6 });
  };
  function updateSoundViz(pl, dt) {
    const on = G.Store.data.settings.soundViz && !pl.dead;
    // coffres proches (bourdonnement)
    if (on && (H.chestVizT = (H.chestVizT || 0) - dt) <= 0) {
      H.chestVizT = 0.8;
      for (const c of G.Loot.chests) if (c.active && !c.opened && Math.hypot(c.x - pl.pos.x, c.z - pl.pos.z) < 22) H.soundViz('chest', [c.x, c.y, c.z]);
    }
    const cam = G.camera;
    for (let i = svList.length - 1; i >= 0; i--) {
      const s = svList[i];
      s.t -= dt;
      if (s.t <= 0 || !on) { s.el.style.display = 'none'; svPool.push(s.el); svList.splice(i, 1); continue; }
      const ang = Math.atan2(s.x - cam.position.x, s.z - cam.position.z);
      const rel = ang - (cam.rotation.y + Math.PI);
      const d = Math.hypot(s.x - pl.pos.x, s.z - pl.pos.z);
      const rad = 120;
      s.el.style.transform = `translate(-50%,-50%) translate(${(-Math.sin(rel) * rad).toFixed(1)}px,${(-Math.cos(rel) * rad).toFixed(1)}px)`;
      s.el.style.opacity = Math.min(1, s.t * 1.5) * U.clamp(1.3 - d / 150, 0.45, 1);
    }
  }

  // ------------------------------------------------------------
  //  Duo : panneau du coéquipier, marqueur 3D, écran « à terre »
  // ------------------------------------------------------------
  const _mv = new THREE.Vector3();
  let teamKey = '';
  const mateMk = [];
  function updateTeam(pl, dt) {
    const D = G.Duo, $ = H.$;
    const mates = (D.active ? D.mates : []).concat(G.Folk ? G.Folk.hired : []);
    $('team-panel').classList.toggle('hidden', !mates.length);
    if (mates.length) {
      let key = '';
      for (const m of mates) key += m.name + (m.dead ? 'D' : m.downed ? 'd' : 'o') + Math.ceil(m.health) + ':' + Math.ceil(m.shield) + ':' + m.stats.kills + '|';
      if (key !== teamKey) {
        teamKey = key;
        $('team-panel').innerHTML = mates.map((m, i) => {
          const st = m.dead ? 'dead' : m.downed ? 'down' : 'ok';
          const hp = Math.max(0, m.health), sh = Math.max(0, m.shield);
          return `<div class="tm ${st}"><div class="tm-ico">${st === 'dead' ? '✖' : st === 'down' ? '✚' : i + 2}</div><div class="tm-body"><div class="tm-name">${esc(m.name)}<span>${st === 'dead' ? 'ÉLIMINÉ' : st === 'down' ? 'À TERRE' : m.stats.kills + ' élim.'}</span></div>` +
            `<div class="tm-bar sh"><div style="width:${sh}%"></div></div><div class="tm-bar hp ${st === 'down' ? 'bleed' : ''}"><div style="width:${hp}%"></div></div></div></div>`;
        }).join('');
      }
    }
    // marqueurs au-dessus des coéquipiers
    while (mateMk.length < mates.length) {
      const el = document.createElement('div'); el.className = 'mate-marker hidden';
      el.innerHTML = '<div class="mk-name"></div><div class="mk-dist"></div><div class="mk-arrow">▼</div>';
      $('hud').appendChild(el); mateMk.push(el);
    }
    mateMk.forEach((mk, i) => {
      const m = mates[i];
      let show = false;
      if (m && !m.dead && !pl.dead && pl.state !== 'bus' && m.state !== 'bus' && !H.fullMapOpen) {
        _mv.set(m.pos.x, m.pos.y + (m.downed ? 1.5 : 2.4), m.pos.z).project(G.camera);
        if (_mv.z < 1) {
          const d = Math.hypot(m.pos.x - pl.pos.x, m.pos.z - pl.pos.z);
          const x = U.clamp((_mv.x * 0.5 + 0.5) * window.innerWidth, 30, window.innerWidth - 30), y = U.clamp((-_mv.y * 0.5 + 0.5) * window.innerHeight, 30, window.innerHeight - 30);
          mk.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
          mk.querySelector('.mk-name').textContent = m.downed ? 'À TERRE — ' + m.name : m.name;
          mk.querySelector('.mk-dist').textContent = d > 6 ? Math.round(d) + ' m' : '';
          mk.classList.toggle('down', !!m.downed);
          show = true;
        }
      }
      mk.classList.toggle('hidden', !show);
    });
    // écran « à terre » du joueur
    const ov = $('downed-ov');
    ov.classList.toggle('hidden', !(pl.downed && !pl.dead));
    if (pl.downed && !pl.dead) {
      $('downed-fill').style.width = Math.max(0, pl.health) + '%';
      const r = pl.reviveT > 0.05 && pl.reviveBy;
      $('downed-rev').textContent = r ? pl.reviveBy.name + ' vous réanime… ' + Math.round(pl.reviveT / D.REVIVE_TIME * 100) + ' %' : '';
    }
  }

  function updateInventory(pl) {
    const els = H.slotEls;
    els[0].classList.toggle('sel', pl.sel === -1 && !pl.buildMode);
    for (let i = 0; i < 5; i++) {
      const el = els[i + 1], it = pl.slots[i];
      const key = it ? it.id + ':' + it.rarity : '';
      if (el.dataset.key !== key) {
        el.dataset.key = key;
        const img = el.querySelector('.sicon');
        if (it) { img.src = G.WModels.itemIcon(it); img.style.display = 'block'; el.style.background = I.RARITY[it.rarity].bg; el.classList.add('full'); }
        else { img.style.display = 'none'; el.style.background = ''; el.classList.remove('full'); }
      }
      const cnt = el.querySelector('.scount');
      if (it) {
        if (I.WEAPONS[it.id]) cnt.textContent = it.ammo; else if (I.CONSUMABLES[it.id].charges) cnt.textContent = it.ammo; else cnt.textContent = '×' + it.count;
      } else cnt.textContent = '';
      el.classList.toggle('sel', pl.sel === i && !pl.buildMode);
    }
  }

  // Reflets du soleil à l'écran quand on regarde vers lui
  const _sun = new THREE.Vector3();
  let flareEls = null;
  function updateFlare(pl, dt) {
    if (!flareEls) {
      flareEls = [];
      const specs = [[0, 150, 'rgba(255,245,210,0.35)'], [0.35, 40, 'rgba(255,200,120,0.25)'], [0.6, 70, 'rgba(160,220,255,0.16)'], [0.85, 26, 'rgba(255,160,220,0.22)'], [1.25, 110, 'rgba(180,255,200,0.1)']];
      for (const s of specs) { const d = document.createElement('div'); d.className = 'flare'; d.style.width = d.style.height = s[1] + 'px'; d.style.background = 'radial-gradient(circle, ' + s[2] + ' 0%, rgba(0,0,0,0) 70%)'; d.dataset.k = s[0]; H.$('hud').appendChild(d); flareEls.push(d); }
    }
    const S = G.Sky, cam = G.camera;
    let show = S.sunDir.y > 0.02 && (G.Weather ? G.Weather.rain < 0.3 : true) && !H.scopeOn && !H.fullMapOpen && !pl.dead;
    let sx = 0, sy = 0;
    if (show) {
      _sun.copy(cam.position).addScaledVector(S.sunDir, 1000).project(cam);
      if (_sun.z > 1 || Math.abs(_sun.x) > 1.1 || Math.abs(_sun.y) > 1.1) show = false;
      sx = _sun.x; sy = _sun.y;
    }
    // atténué si quelque chose cache le soleil (test léger)
    H.flareA = U.damp(H.flareA || 0, show ? (1 - Math.min(1, Math.hypot(sx, sy) * 0.7)) : 0, 6, dt);
    if (show && (H.flareT = (H.flareT || 0) - dt) <= 0) { H.flareT = 0.25; const p = cam.position; H.flareOcc = G.Phys.raycast(p.x, p.y, p.z, S.sunDir.x, S.sunDir.y, S.sunDir.z, 300, { mask: 1 }) ? 1 : 0; }
    const a = H.flareA * (1 - (H.flareOcc || 0));
    const W = window.innerWidth, Hh = window.innerHeight;
    for (const d of flareEls) {
      if (a < 0.02) { d.style.opacity = 0; continue; }
      const k = +d.dataset.k;
      const x = (sx * (1 - 2 * k) * 0.5 + 0.5) * W, y = (-sy * (1 - 2 * k) * 0.5 + 0.5) * Hh;
      d.style.transform = `translate(${(x - parseFloat(d.style.width) / 2).toFixed(0)}px,${(y - parseFloat(d.style.height) / 2).toFixed(0)}px)`;
      d.style.opacity = a.toFixed(2);
    }
  }
  function updateCrosshair(pl, dt) {
    const c = H.els.cross;
    H.kick = Math.max(0, (H.kick || 0) - dt * 6);
    let mode = 'dot', gap = 6;
    if (pl.dead || pl.state === 'bus' || H.scopeOn) mode = 'none';
    else if (pl.state === 'skydive' || pl.state === 'glide' || pl.state === 'hide' || pl.state === 'zip') mode = 'none';
    else if (pl.buildMode) mode = 'build';
    else if (pl.sel < 0) mode = 'dot';
    else {
      const w = pl.curWeapon();
      if (w) {
        const wd = I.WEAPONS[w.id];
        const sp = pl.spreadNow(wd);
        gap = 4 + sp * 900 * (80 / G.camera.fov) * 0.35 + H.kick * 8;
        mode = wd.cat === 'shotgun' ? 'circle' : 'cross';
        if (wd.charge) { mode = 'circle'; gap = 26 - 22 * (pl.drawT / wd.charge); }
      } else mode = 'dot';
    }
    c.className = 'm-' + mode;
    c.style.setProperty('--gap', Math.min(80, gap).toFixed(1) + 'px');
  }

  function updateInteract(pl) {
    const E = H.els;
    const t = pl.interactTarget;
    if (!t || pl.dead || pl.buildMode || G.Build.edit || G.Folk && G.Folk.open) { E.interact.classList.add('hidden'); return; }
    E.interact.classList.remove('hidden');
    E.interact.classList.toggle('low', t.kind === 'exit');
    const nm = E.interact.querySelector('.iname'), ac = E.interact.querySelector('.iact'), pr = E.interact.querySelector('.iprog div');
    pr.parentElement.style.display = 'none';
    if (t.kind === 'item') {
      const it = t.obj.data.item;
      const r = I.RARITY[it.rarity];
      nm.innerHTML = `<span style="color:${r.color}">${I.name(it)}</span> <small>${r.name}${I.CONSUMABLES[it.id] ? ' ×' + it.count : ''}</small>`;
      const w = I.WEAPONS[it.id];
      ac.textContent = (pl.slots.every((s) => s) && !I.CONSUMABLES[it.id] ? 'Échanger' : 'Ramasser') + (w ? ` — ${I.damage(it)} dégâts · ${w.mag} balles` : '');
    } else if (t.kind === 'chest' || t.kind === 'ammo') {
      nm.textContent = t.kind === 'chest' ? 'Coffre' : 'Caisse de munitions';
      ac.textContent = 'Maintenir pour ouvrir';
      pr.parentElement.style.display = 'block';
      pr.style.width = Math.min(100, pl.interactT / (t.kind === 'chest' ? 0.4 : 0.3) * 100) + '%';
    } else if (t.kind === 'door') { nm.textContent = 'Porte'; ac.textContent = t.obj.door.target > 0.5 ? 'Fermer' : 'Ouvrir'; }
    else if (t.kind === 'reboot') {
      nm.textContent = t.name; ac.textContent = t.action;
      if (t.ok) { pr.parentElement.style.display = 'block'; pr.style.width = Math.min(100, (t.obj.rebootT || 0) / G.Extras2.REBOOT_TIME * 100) + '%'; }
    }
    else if (t.kind === 'revive') {
      nm.textContent = t.name || 'Coéquipier à terre'; ac.textContent = t.action || 'Maintenir pour réanimer';
      pr.parentElement.style.display = 'block';
      pr.style.width = Math.min(100, (t.obj.reviveT || 0) / G.Duo.REVIVE_TIME * 100) + '%';
    }
    else { nm.textContent = t.name || 'Objet'; ac.textContent = t.action || 'Utiliser'; }
  }

  function updateCompass(pl) {
    const cam = G.camera;
    let heading = (-(cam.rotation.y) * 180 / Math.PI) % 360; // 0 = nord (-z)
    if (heading < 0) heading += 360;
    if (pl.state === 'bus') { heading = ((-pl.camYaw) * 180 / Math.PI + 180) % 360; if (heading < 0) heading += 360; }
    H.els.compass.style.transform = `translateX(${-(heading * 4) + 240}px)`;
    H.els.compassDeg.textContent = Math.round(heading) % 360;
    const setIcon = (el, x, z) => {
      if (x == null) { el.style.display = 'none'; return; }
      let a = Math.atan2(x - cam.position.x, -(z - cam.position.z)) * 180 / Math.PI;
      if (a < 0) a += 360;
      let rel = a - heading; while (rel > 180) rel -= 360; while (rel < -180) rel += 360;
      el.style.display = Math.abs(rel) < 62 ? 'block' : 'none';
      el.style.left = ((heading + rel) * 4) + 'px';
    };
    const n = G.Storm.active ? (G.Storm.next || G.Storm.cur) : null;
    setIcon(H.compassZone, n && G.Storm.distToSafe(pl.pos.x, pl.pos.z) > 0 ? n.x : null, n ? n.z : 0);
    setIcon(H.compassPing, H.ping ? H.ping.x : null, H.ping ? H.ping.z : 0);
  }

  // ------------------------------------------------------------
  //  Mini-carte
  // ------------------------------------------------------------
  function drawMinimap(pl) {
    const ctx = H.mmCtx, T = G.Terrain;
    const S = 220, R = 150; // mètres visibles (rayon)
    const p = pl.state === 'bus' ? G.Bus.pos : pl.pos;
    const sc = T.mapScale; // px carte par mètre
    const src = T.colorCanvas;
    ctx.save();
    ctx.fillStyle = '#2a6ab8'; ctx.fillRect(0, 0, S, S);
    const sx = (p.x + T.W - R) * sc, sy = (p.z + T.W - R) * sc;
    ctx.drawImage(src, sx, sy, R * 2 * sc, R * 2 * sc, 0, 0, S, S);
    const k = S / (R * 2);
    const toMM = (x, z) => [(x - p.x) * k + S / 2, (z - p.z) * k + S / 2];
    // tempête
    const St = G.Storm;
    if (St.active) {
      const c = toMM(St.cur.x, St.cur.z);
      ctx.fillStyle = 'rgba(120,40,200,0.45)';
      ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.arc(c[0], c[1], St.cur.r * k, 0, Math.PI * 2, true); ctx.fill();
      ctx.strokeStyle = 'rgba(200,120,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c[0], c[1], St.cur.r * k, 0, Math.PI * 2); ctx.stroke();
      if (St.next) { const n = toMM(St.next.x, St.next.z); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(n[0], n[1], St.next.r * k, 0, Math.PI * 2); ctx.stroke();
        if (St.distToSafe(p.x, p.z) > 0) { ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(S / 2, S / 2); const dx = St.next.x - p.x, dz = St.next.z - p.z, dl = Math.hypot(dx, dz); const ex = St.next.x - dx / dl * St.next.r, ez = St.next.z - dz / dl * St.next.r; const e = toMM(ex, ez); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.setLineDash([]); } }
    }
    // trajet du bus
    if (G.Bus.active) { const a = toMM(G.Bus.start0.x, G.Bus.start0.z), b = toMM(G.Bus.end0.x, G.Bus.end0.z); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    if (G.Extras2) G.Extras2.mapIcons(ctx, toMM, false);
    G.NPC.mapIcons(ctx, toMM, false);
    if (G.Planes && G.Planes.mapIcons) G.Planes.mapIcons(ctx, toMM, false);
    if (G.Bounty) G.Bounty.mapIcons(ctx, toMM, false);
    if (G.Treasure) G.Treasure.mapIcons(ctx, toMM, false);
    if (G.Aug) G.Aug.mapIcons(ctx, toMM, false);
    if (G.Medal) G.Medal.mapIcons(ctx, toMM, false);
    if (G.Mechs) G.Mechs.mapIcons(ctx, toMM, false);
    G.Events.mapIcons(ctx, toMM, false);
    if (G.UFO) G.UFO.mapIcons(ctx, toMM, false);
    if (G.Tornado) G.Tornado.mapIcons(ctx, toMM, false);
    if (G.Cube) G.Cube.mapIcons(ctx, toMM, false);
    if (G.Hotspot) G.Hotspot.mapIcons(ctx, toMM, false);
    // noms de lieux
    ctx.font = 'bold 11px Impact, Arial Narrow, sans-serif'; ctx.textAlign = 'center';
    for (const q of G.MapData.pois) {
      const m = toMM(q.x, q.z);
      if (m[0] < -40 || m[0] > S + 40 || m[1] < -10 || m[1] > S + 10) continue;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(q.name.toUpperCase(), m[0], m[1]);
      ctx.fillStyle = '#fff'; ctx.fillText(q.name.toUpperCase(), m[0], m[1]);
    }
    // coéquipier
    if (G.Match.rumble) for (const b of G.Match.bots) {
      if (b.dead || b.team !== pl.team || b.state === 'bus') continue;
      const m = toMM(b.pos.x, b.pos.z);
      if (m[0] < 0 || m[1] < 0 || m[0] > S || m[1] > S) continue;
      ctx.fillStyle = '#3ac8ff'; ctx.beginPath(); ctx.arc(m[0], m[1], 3.2, 0, 7); ctx.fill();
    }
    if (G.Duo.active) for (const mate of G.Duo.mates) {
      if (mate.dead) continue;
      const mp = mate.state === 'bus' ? G.Bus.pos : mate.pos;
      const m = toMM(mp.x, mp.z), cl = (v) => U.clamp(v, 6, S - 6);
      ctx.fillStyle = mate.downed ? '#ff5050' : '#3ac8ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cl(m[0]), cl(m[1]), 5.5, 0, 7); ctx.fill(); ctx.stroke();
    }
    for (const p of H.enemyPings) if (p.t > 0) { const m = toMM(p.x, p.z); ctx.fillStyle = '#ff3a3a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(m[0], m[1] - 6); ctx.lineTo(m[0] + 5, m[1]); ctx.lineTo(m[0], m[1] + 6); ctx.lineTo(m[0] - 5, m[1]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // marqueur
    if (H.ping) { const m = toMM(H.ping.x, H.ping.z); ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(m[0] - 6, m[1] - 12); ctx.lineTo(m[0] + 6, m[1] - 12); ctx.fill(); }
    // joueur
    const yaw = pl.state === 'bus' ? Math.atan2(-G.Bus.dir.x, -G.Bus.dir.z) : pl.camYaw;
    ctx.translate(S / 2, S / 2); ctx.rotate(-yaw);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------
  //  Grande carte
  // ------------------------------------------------------------
  H.drawFullMap = function () {
    const c = H.els.fmc;
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.86 | 0;
    if (c.width !== size) { c.width = size; c.height = size; }
    const ctx = c.getContext('2d'), T = G.Terrain, W = T.W;
    const V = H.MAPVIEW; // zone affichée (centrée sur l'île)
    const k = size / (2 * V.h);
    const toC = (x, z) => [(x - V.cx + V.h) * k, (z - V.cz + V.h) * k];
    ctx.fillStyle = '#2a6ab8'; ctx.fillRect(0, 0, size, size);
    const sc = T.mapScale;
    ctx.drawImage(T.colorCanvas, (V.cx - V.h + W) * sc, (V.cz - V.h + W) * sc, 2 * V.h * sc, 2 * V.h * sc, 0, 0, size, size);
    // grille
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    ctx.font = 'bold 14px Impact, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i <= 10; i++) {
      const v = i * size / 10;
      ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, size); ctx.moveTo(0, v); ctx.lineTo(size, v); ctx.stroke();
      if (i < 10) { ctx.textAlign = 'center'; ctx.fillText('ABCDEFGHIJ'[i], v + size / 20, 16); ctx.textAlign = 'left'; ctx.fillText(String(i + 1), 4, v + size / 20 + 5); }
    }
    // tempête
    const St = G.Storm;
    if (St.active) {
      const cc = toC(St.cur.x, St.cur.z);
      ctx.fillStyle = 'rgba(120,40,200,0.45)';
      ctx.beginPath(); ctx.rect(0, 0, size, size); ctx.arc(cc[0], cc[1], St.cur.r * k, 0, Math.PI * 2, true); ctx.fill();
      ctx.strokeStyle = '#d8a0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cc[0], cc[1], St.cur.r * k, 0, Math.PI * 2); ctx.stroke();
      if (St.next) { const n = toC(St.next.x, St.next.z); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(n[0], n[1], St.next.r * k, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (G.Bus.active || G.Game.state === 'bus') {
      const a = toC(G.Bus.start0.x, G.Bus.start0.z), b = toC(G.Bus.end0.x, G.Bus.end0.z);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
      const bp = toC(G.Bus.pos.x, G.Bus.pos.z); ctx.fillStyle = '#3a8ad8'; ctx.beginPath(); ctx.arc(bp[0], bp[1], 9, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    if (G.Extras2) G.Extras2.mapIcons(ctx, toC, true);
    G.NPC.mapIcons(ctx, toC, true);
    if (G.Planes && G.Planes.mapIcons) G.Planes.mapIcons(ctx, toC, true);
    if (G.Bounty) G.Bounty.mapIcons(ctx, toC, true);
    if (G.Treasure) G.Treasure.mapIcons(ctx, toC, true);
    if (G.Aug) G.Aug.mapIcons(ctx, toC, true);
    if (G.Medal) G.Medal.mapIcons(ctx, toC, true);
    if (G.Mechs) G.Mechs.mapIcons(ctx, toC, true);
    G.Events.mapIcons(ctx, toC, true);
    if (G.UFO) G.UFO.mapIcons(ctx, toC, true);
    if (G.Tornado) G.Tornado.mapIcons(ctx, toC, true);
    if (G.Cube) G.Cube.mapIcons(ctx, toC, true);
    if (G.Hotspot) G.Hotspot.mapIcons(ctx, toC, true);
    if (G.Sharks) G.Sharks.mapIcons(ctx, toC, true);
    // lieux nommés
    ctx.textAlign = 'center';
    for (const q of G.MapData.pois) {
      const m = toC(q.x, q.z);
      ctx.font = `${Math.round(size / 45)}px Impact, Arial Narrow, sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(q.name.toUpperCase(), m[0], m[1]);
      ctx.fillStyle = '#fff'; ctx.fillText(q.name.toUpperCase(), m[0], m[1]);
    }
    for (const q of G.MapData.landmarks) {
      const m = toC(q.x, q.z);
      ctx.font = `${Math.round(size / 75)}px Arial, sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(q.name, m[0], m[1]);
      ctx.fillStyle = '#e8f0ff'; ctx.fillText(q.name, m[0], m[1]);
    }
    // marqueur
    if (H.ping) { const m = toC(H.ping.x, H.ping.z); ctx.fillStyle = '#ffd83a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(m[0] - 9, m[1] - 18); ctx.lineTo(m[0] + 9, m[1] - 18); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // coéquipier
    if (G.Duo.active) for (const mate of G.Duo.mates) {
      if (mate.dead) continue;
      const mp = mate.state === 'bus' ? G.Bus.pos : mate.pos;
      const m = toC(mp.x, mp.z);
      ctx.fillStyle = mate.downed ? '#ff5050' : '#3ac8ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m[0], m[1], 8, 0, 7); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 13px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeText(mate.name, m[0], m[1] - 13); ctx.fillStyle = '#bfefff'; ctx.fillText(mate.name, m[0], m[1] - 13);
    }
    // joueur
    const pl = G.player;
    if (pl && !pl.dead) {
      const p = pl.state === 'bus' ? G.Bus.pos : pl.pos;
      const m = toC(p.x, p.z);
      ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(-pl.camYaw);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 9); ctx.lineTo(0, 4); ctx.lineTo(-8, 9); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.restore();
    }
  };
})();
