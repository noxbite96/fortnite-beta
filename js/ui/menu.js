// ============================================================
//  Menus : titre, salon 3D, passe de combat, défis, casier,
//  carrière, paramètres, écrans de fin
// ============================================================
(function () {
  const U = G.U, C = G.Cosmetics, CH = G.Char;
  const MN = { screen: null, tab: 'salon', passPage: 0, lockerCat: 'skin', lockerEmoteSlot: 0, preview: null };
  G.Menu = MN;
  const esc = (s) => String(s || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

  // ------------------------------------------------------------
  //  Scène 3D du salon
  // ------------------------------------------------------------
  function buildLobbyScene() {
    const s = new THREE.Scene();
    // fond dégradé
    const bg = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: { time: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float time; varying vec3 vP;
        void main(){ vec3 d = normalize(vP); float h = d.y;
          vec3 top = vec3(0.08,0.25,0.75), mid = vec3(0.2,0.55,1.0), bot = vec3(0.35,0.2,0.75);
          vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.7)) : mix(mid, bot, pow(-h, 0.6));
          float a = atan(d.x, d.z);
          float rays = pow(max(0.0, sin(a * 9.0 + time * 0.15)), 8.0) * smoothstep(-0.1, 0.5, h) * 0.18;
          c += vec3(0.6,0.8,1.0) * rays;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }` }));
    s.add(bg);
    MN.bg = bg;
    // plateforme
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.3, 40), new THREE.MeshLambertMaterial({ color: 0x2a4aa8 }));
    plat.position.y = -0.15; s.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.04, 8, 60), new THREE.MeshBasicMaterial({ color: 0x9ad8ff }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; s.add(ring);
    const glowM = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), new THREE.MeshBasicMaterial({ map: G.Tex.get('glow'), color: 0x6ab8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    glowM.rotation.x = -Math.PI / 2; glowM.position.y = 0.02; s.add(glowM);
    // îlots flottants décoratifs
    const rockM = new THREE.MeshLambertMaterial({ color: 0x7a8aa0, flatShading: true }), grassM = new THREE.MeshLambertMaterial({ color: 0x5ac040, flatShading: true });
    MN.islands = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const r = U.rand(0.8, 2.2);
      const rock = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.6, 6), rockM); rock.rotation.x = Math.PI; rock.position.y = -r * 0.8; g.add(rock);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 6), grassM); g.add(top);
      if (Math.random() < 0.7) { const t = new THREE.Mesh(new THREE.ConeGeometry(r * 0.4, r * 1.4, 6), new THREE.MeshLambertMaterial({ color: 0x2f7a35, flatShading: true })); t.position.set(r * 0.3, r * 0.7, 0); g.add(t); }
      const a = i / 7 * Math.PI * 1.4 - Math.PI * 0.7 + Math.PI;
      g.position.set(Math.sin(a) * U.rand(9, 16), U.rand(-1, 5), Math.cos(a) * U.rand(9, 16));
      g.userData.base = g.position.y; g.userData.ph = Math.random() * 6;
      s.add(g); MN.islands.push(g);
    }
    // bus de combat au loin
    if (G.Bus.model) {
      const bus = G.Bus.model.clone(true);
      bus.visible = true; bus.scale.setScalar(0.35);
      bus.position.set(-9, 6.5, -22); bus.rotation.y = 0.5;
      s.add(bus); MN.bus = bus;
    }
    s.add(new THREE.HemisphereLight(0xcfe4ff, 0x40306a, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 5, 4); s.add(key);
    const rim = new THREE.DirectionalLight(0x9ad0ff, 2.0); rim.position.set(-4, 3, -4); s.add(rim);
    MN.lobbyScene = s;
    MN.lobbyCam = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 200);
    MN.lobbyCam.position.set(0, 1.25, 6.2);
    MN.lobbyCam.lookAt(0, 1.0, 0);
    MN.rotY = 0.35; MN.rotV = 0;
    MN.particles = [];
  }

  // Personnage d'aperçu
  MN.setPreview = function () {
    const eq = G.Store.data.equipped;
    const skin = MN.previewSkin || eq.skin;
    if (MN.preview) { G.Char.dispose(MN.preview); }
    const c = CH.build(skin, { back: MN.previewBack || eq.back });
    MN.lobbyScene.add(c.root);
    c.anim.hold = 'none';
    MN.preview = c;
    MN.previewHeld = null;
    MN.previewGlider = null;
    MN.updatePreviewExtras();
  };
  // Coéquipiers IA affichés à côté du joueur dans le salon (duo / section)
  MN.lobbyMates = [];
  MN.refreshLobbyMates = function () {
    const s = G.Store.data.settings;
    const n = MN.tab === 'salon' && MN.screen === 'salon' ? (s.mode === 'squad' ? 3 : s.mode === 'duo' ? 1 : 0) : 0;
    if (MN.lobbyMates.length === n) return;
    for (const m of MN.lobbyMates) { G.Char.dispose(m.c); if (m.tag) MN.lobbyScene.remove(m.tag); }
    MN.lobbyMates = [];
    if (!MN.mateSkins) {
      const pool = C.skinsForBots().filter((i) => !i.styleOf || Math.random() < 0.5);
      MN.mateSkins = [0, 1, 2].map(() => U.pick(pool).id);
      MN.mateNames = U.shuffle((G.BOT_NAMES || ['Alpha', 'Bravo', 'Charlie']).slice()).slice(0, 3);
    }
    const spots = [[1.55, -0.7], [-1.55, -0.7], [2.9, -1.5]];
    for (let i = 0; i < n; i++) {
      const c = CH.build(MN.mateSkins[i], { back: U.pick(C.byCat('back')).id });
      c.anim.hold = 'none';
      MN.lobbyScene.add(c.root);
      // étiquette de nom
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
      const x = cv.getContext('2d'); x.fillStyle = 'rgba(0,20,60,0.7)'; x.fillRect(0, 6, 256, 36); x.fillStyle = '#7fe0ff'; x.font = 'bold 24px Arial'; x.textAlign = 'center'; x.fillText(MN.mateNames[i], 128, 33);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
      tag.scale.set(1.2, 0.225, 1);
      MN.lobbyScene.add(tag);
      MN.lobbyMates.push({ c, tag, x: spots[i][0], z: spots[i][1], ph: Math.random() * 6 });
    }
  };
  MN.updatePreviewExtras = function () {
    const c = MN.preview;
    if (!c) return;
    if (MN.previewHeld) { MN.previewHeld.parent.remove(MN.previewHeld); MN.previewHeld = null; }
    if (MN.previewGlider) { c.root.remove(MN.previewGlider); MN.previewGlider = null; }
    c.anim.mode = 'ground'; c.anim.hold = 'none';
    const eq = G.Store.data.equipped;
    if (MN.previewMode === 'pickaxe') {
      const m = CH.pickaxeModel(MN.previewPick || eq.pickaxe); m.rotation.x = -Math.PI / 2; m.position.y = 0.05;
      c.J.weapon.add(m); MN.previewHeld = m; c.anim.hold = 'melee';
    } else if (MN.previewMode === 'wrap') {
      const m = G.WModels.weapon('ar', 4, MN.previewWrap || eq.wrap); c.J.weapon.add(m); MN.previewHeld = m; c.anim.hold = 'rifle';
    } else if (MN.previewMode === 'glider') {
      const g = CH.gliderModel(MN.previewGlider2 || eq.glider); g.position.y = 1.9; c.root.add(g); MN.previewGlider = g; c.anim.mode = 'glide';
    }
  };
  MN.previewEmote = function (id) { if (MN.preview) { MN.preview.anim.emote = id; MN.preview.anim.emoteT = 0; const it = C.items[id]; if (it && it.music) G.Audio.playMusic('emote_' + it.music, { vol: 0.9 }); else if (MN.screen !== 'title') MN.menuMusic(); } };
  MN.menuMusic = function () { G.Audio.playMusic('menu'); };

  MN.frame = function (dt) {
    if (!MN.lobbyScene) return;
    // écran titre : survol de l'île en arrière-plan
    if (MN.screen === 'title') {
      const cam = G.camera, t = G.clock.time * 0.035;
      cam.position.set(Math.sin(t) * 560, 190 + Math.sin(t * 2.3) * 20, Math.cos(t) * 560);
      cam.lookAt(0, 20, 0);
      cam.fov = 60; cam.updateProjectionMatrix();
      // le bus de combat fait le tour de l'île
      const bm = G.Bus.model;
      if (bm) {
        const bt = t * 1.6 + 0.9;
        bm.visible = true;
        bm.position.set(Math.sin(bt) * 330, 150 + Math.sin(bt * 3) * 4, Math.cos(bt) * 330);
        bm.rotation.set(0, bt, Math.sin(G.clock.time) * 0.03);
        G.Bus.balloon.rotation.y += dt * 0.3;
      }
      G.Sky.update(dt, cam.position, U.v1.set(0, 0, 0));
      G.Veg.update(dt);
      if (G.Ambient) G.Ambient.update(dt, null);
      G.Post.render(G.scene, cam);
      return;
    }
    MN.bg.material.uniforms.time.value += dt;
    for (const g of MN.islands) { g.userData.ph += dt * 0.6; g.position.y = g.userData.base + Math.sin(g.userData.ph) * 0.3; g.rotation.y += dt * 0.05; }
    if (MN.bus) {
      const t = G.clock.time * 0.12;
      MN.bus.position.set(Math.sin(t) * 16 - 2, 2.2 + Math.sin(t * 3) * 0.4, -34 + Math.cos(t) * 5);
      MN.bus.rotation.y = Math.atan2(Math.sin(t) * 5, Math.cos(t) * 14);
      if (MN.bus.children[MN.bus.children.length - 1]) MN.bus.traverse((o) => { if (o.userData.flame) o.scale.y = 0.8 + Math.random() * 0.5; });
    }
    if (MN.preview) {
      const c = MN.preview;
      if (!MN.dragging) MN.rotV = U.damp(MN.rotV, 0, 3, dt);
      MN.rotY += MN.rotV * dt;
      c.root.rotation.y = MN.rotY + (MN.screen === 'title' ? G.clock.time * 0.25 : 0);
      c.root.position.set(MN.previewX || 0, 0, 0);
      c.anim.speed = 0; c.anim.grounded = true;
      if (c.anim.emote && CH.emoteDone(c)) { c.anim.emote = null; }
      CH.animate(c, dt);
      if (c.anim.mode === 'glide') { c.root.position.y = 0.4 + Math.sin(G.clock.time * 1.5) * 0.08; }
    }
    for (const m of MN.lobbyMates) {
      m.ph += dt;
      m.c.root.position.set((MN.previewX || 0) + m.x, 0, m.z);
      m.c.root.rotation.y = Math.sin(m.ph * 0.4) * 0.25 + (m.x > 0 ? -0.25 : 0.25);
      m.c.anim.speed = 0; m.c.anim.grounded = true;
      if (!m.c.anim.emote && Math.random() < dt * 0.05) { m.c.anim.emote = U.pick(['emote_danse', 'emote_salut', 'emote_floss', 'emote_applaudir']); m.c.anim.emoteT = 0; }
      if (m.c.anim.emote && (CH.emoteDone(m.c) || m.c.anim.emoteT > 4)) m.c.anim.emote = null;
      CH.animate(m.c, dt);
      m.tag.position.set(m.c.root.position.x, 2.35, m.z);
    }
    // caméra : position selon l'écran
    const cam = MN.lobbyCam;
    const tx = MN.camX || 0;
    cam.position.x = U.damp(cam.position.x, tx, 4, dt);
    cam.lookAt(cam.position.x, 1.0, 0);
    // particules
    G.renderer.setClearColor(0x2060d0);
    G.Post.render(MN.lobbyScene, cam);
  };

  // ------------------------------------------------------------
  //  DOM
  // ------------------------------------------------------------
  MN.init = function () {
    buildLobbyScene();
    const root = document.createElement('div');
    root.id = 'menu-root';
    root.innerHTML = `
      <div id="m-title" class="menu-screen hidden">
        <div class="logo-big"><span class="logo-f">FORTNITE</span><span class="logo-sub">Build Bêta</span></div>
        <div class="press fn">Cliquez pour commencer</div>
        <div class="version">Version navigateur · Three.js · 100 % généré par le code</div>
      </div>
      <div id="m-top" class="hidden">
        <div class="mlogo fn">FORTNITE — Build Bêta</div>
        <div class="tabs">
          <div class="tab fn" data-tab="salon">Salon</div>
          <div class="tab fn" data-tab="boutique">Boutique</div>
          <div class="tab fn" data-tab="pass">Passe de combat</div>
          <div class="tab fn" data-tab="defis">Défis <span class="badge" id="chal-badge"></span></div>
          <div class="tab fn" data-tab="casier">Casier</div>
          <div class="tab fn" data-tab="carriere">Carrière</div>
          <div class="tab fn" data-tab="admin" id="tab-admin" style="display:none">Admin</div>
        </div>
        <div class="spacer"></div>
        <div class="acct-box" id="acct-box"></div>
        <div class="vb-box" title="V-Bucks"><span class="vb">V</span><span class="fn" id="top-vb">0</span></div>
        <div class="lvl-box"><div class="lvl-star fn" id="top-lvl">1</div><div class="lvl-info"><div class="ln fn">NIVEAU <span id="top-lvl2">1</span></div><div class="xpbar"><div id="top-xp"></div></div><div class="ln" style="font-family:Arial;font-size:11px;opacity:.8" id="top-xpt"></div></div></div>
        <div class="icon-btn" id="btn-settings" title="Paramètres">⚙</div>
      </div>
      <div id="m-lobby" class="menu-screen hidden">
        <div class="news"><h3 class="fn">FORTNITE — Build Bêta</h3>
          <p>• Une nouvelle île avec 12 lieux nommés : Tours Penchées, Parc Paisible, Usine Rouillée, Ferme Fatale, Château Royal, Sources Salées, Plage Paradis, Lac Butin, Galerie Marchande, Chalet du Pic, Docks Délabrés et la nouvelle BASE MILITAIRE — sans oublier le mystérieux TEMPLE PERDU.</p>
          <p>• Passe de combat de ${C.PASS_TIERS} paliers : tenues, emotes, pioches, planeurs, sacs à dos, traînées et revêtements.</p>
          <p>• Modes Solo, Duo, Section, Équipe contre équipe, Terrain de jeu… et le nouveau MODE CLASSÉ (Bronze → Irréel) !</p>
          <p>• AUGMENTATIONS : choisissez des bonus pendant la partie (touche U) — 12 augmentations comme Siphon, Mains agiles, Aérien ou Radar à coffres.</p>
          <p>• NAINS DE JARDIN : 12 nains cachés sur l'île à chaque partie — écoutez-les ricaner !</p>
          <p>• REQUINS et RAPTORS : des requins patrouillent en mer, des meutes de raptors rôdent dans les coins sauvages de l'île.</p>
          <p>• POINTS CHAUDS : 2 lieux par partie, tous les coffres présents et des DRONES DE BUTIN à abattre.</p>
          <p>• CABINES DE DÉGUISEMENT : changez de tenue en pleine partie dans les cabines téléphoniques rouges.</p>
          <p>• LE CUBE : un cube violet géant roule à travers l'île, laisse des runes… et rend le Lac Butin REBONDISSANT.</p>
          <p>• TORNADES : pendant certains orages, une tornade traverse l'île, aspire les joueurs et les propulse dans le ciel.</p>
          <p>• MÉDAILLONS : chaque boss vaincu lâche son médaillon (bouclier qui se régénère, mais porteur révélé sur la carte).</p>
          <p>• 4 BOSS : le Roi (Château Royal), Oméga, le Colosse d'acier (Usine Rouillée), le Général Tonnerre (Base Militaire) et la Reine des Glaces (Chalet du Pic), avec leurs armes MYTHIQUES.</p>
          <p>• 10 PERSONNAGES : boutiques, quêtes et gardes du corps contre des LINGOTS D'OR. Contrats de chasse et cartes au trésor !</p>
          <p>• Nouvelles armes : arc, arc explosif, sabre lumineux, pistolet à silex. Véhicules : VOITURES et cabriolets de sport, MOTONEIGES, karts (avec radio), bateaux, avions, HÉLICOPTÈRES et MÉCHAS DE COMBAT !</p>
          <p>• Événements en direct : météorite et OVNI. Couronnes de la victoire, ballons, tourelles, barils explosifs, mode ZÉRO CONSTRUCTION, caméra libre (P).</p>
          <p>• Établis, tyroliennes, cachettes, pêche, glissade, escalade, boutique quotidienne, météo dynamique.</p></div>
        <div class="player-tag"><input id="name-input" maxlength="16" spellcheck="false"><div class="ps" id="lobby-skin-name"></div></div>
        <div class="hint-drag">Glissez pour faire tourner le personnage</div>
        <div class="play-wrap">
          <div class="mode-card">
            <div class="mt fn" id="mode-title">SOLO · BATTLE ROYALE</div>
            <div class="ms" id="mode-sub"></div>
            <div class="opt-row"><span class="lbl">Mode</span><span class="chip" data-mode="solo">Solo</span><span class="chip" data-mode="duo">Duo</span><span class="chip" data-mode="squad">Section (4)</span><span class="chip" data-mode="rumble">Équipe contre équipe</span><span class="chip" data-mode="playground">Terrain de jeu</span></div>
            <div class="opt-row"><span class="lbl">Construction</span><span class="chip" data-zb="0">Avec construction</span><span class="chip" data-zb="1">Zéro construction</span></div>
            <div class="opt-row" id="rk-row"><span class="lbl">Partie</span><span class="chip" data-rk="0">Normale</span><span class="chip" data-rk="1">Classée</span><span id="rk-mini"></span></div>
            <div class="opt-row"><span class="lbl">Difficulté</span><span class="chip" data-d="0">Facile</span><span class="chip" data-d="1">Normal</span><span class="chip" data-d="2">Difficile</span><span class="chip" data-d="3">Pro</span></div>
            <div class="opt-row"><span class="lbl">Joueurs</span><span class="chip" data-b="29">30</span><span class="chip" data-b="49">50</span><span class="chip" data-b="74">75</span><span class="chip" data-b="99">100</span></div>
          </div>
          <button id="btn-play">JOUER</button>
        </div>
      </div>
      <div id="m-shop" class="menu-screen hidden"><div class="panel" id="shop-panel"></div></div>
      <div id="m-pass" class="menu-screen hidden"><div class="panel" id="pass-panel"></div></div>
      <div id="m-defis" class="menu-screen hidden"><div class="panel" id="defis-panel"></div></div>
      <div id="m-casier" class="menu-screen hidden"><div id="m-locker"><div class="lk-slots" id="lk-slots"></div><div class="panel" id="lk-panel"></div></div></div>
      <div id="m-carriere" class="menu-screen hidden"><div class="panel" id="car-panel"></div></div>
      <div id="m-admin" class="menu-screen hidden" style="pointer-events:none"></div>
      <div id="m-match" class="menu-screen hidden"><div class="mm-box"><div class="mm1 fn">RECHERCHE DE PARTIE…</div><div class="spinner"></div><div class="mm2" id="mm-txt"></div><div class="mm-tip" id="mm-tip"></div></div></div>
      <div id="m-results" class="menu-screen hidden"></div>`;
    document.body.appendChild(root);
    MN.root = root;
    const $ = (id) => document.getElementById(id);
    $('m-title').addEventListener('click', () => { G.Audio.resume(); G.Audio.play('ui_play'); MN.showLobby(); });
    root.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => { G.Audio.play('ui_click'); MN.showTab(t.dataset.tab); });
      t.addEventListener('mouseenter', () => G.Audio.play('ui_hover'));
    });
    $('btn-play').addEventListener('click', () => MN.startMatchmaking());
    $('btn-play').addEventListener('mouseenter', () => G.Audio.play('ui_hover'));
    $('btn-settings').addEventListener('click', () => { G.Audio.play('ui_click'); MN.openSettings(false); });
    root.querySelectorAll('[data-zb]').forEach((c) => c.addEventListener('click', () => { G.Store.data.settings.zeroBuild = c.dataset.zb === '1'; G.Store.save(); MN.refreshLobby(); G.Audio.play('ui_click'); }));
    root.querySelectorAll('[data-rk]').forEach((c) => c.addEventListener('click', () => { G.Store.data.settings.ranked = c.dataset.rk === '1'; G.Store.save(); MN.refreshLobby(); G.Audio.play('ui_click'); }));
    root.querySelectorAll('[data-d]').forEach((c) => c.addEventListener('click', () => { G.Store.data.settings.difficulty = +c.dataset.d; G.Store.save(); MN.refreshLobby(); G.Audio.play('ui_click'); }));
    root.querySelectorAll('[data-mode]').forEach((c) => c.addEventListener('click', () => { G.Store.data.settings.mode = c.dataset.mode; G.Store.save(); MN.refreshLobby(); G.Audio.play('ui_click'); }));
    root.querySelectorAll('[data-b]').forEach((c) => c.addEventListener('click', () => { G.Store.data.settings.bots = +c.dataset.b; G.Store.save(); MN.refreshLobby(); G.Audio.play('ui_click'); }));
    const ni = $('name-input');
    ni.addEventListener('change', () => { G.Store.data.name = ni.value.trim().slice(0, 16) || 'Joueur'; G.Store.save(); if (G.player) G.player.name = G.Store.data.name; });
    ni.addEventListener('keydown', (e) => e.stopPropagation());
    // rotation du personnage à la souris
    const cv = document.getElementById('game-canvas');
    let lastX = 0;
    window.addEventListener('mousedown', (e) => { if (G.Game.state === 'menu' && e.target === cv) { MN.dragging = true; lastX = e.clientX; } });
    window.addEventListener('mouseup', () => { MN.dragging = false; });
    window.addEventListener('mousemove', (e) => { if (MN.dragging) { const dx = e.clientX - lastX; lastX = e.clientX; MN.rotY += dx * 0.01; MN.rotV = dx * 0.3; } });
    document.addEventListener('keydown', (e) => { if (MN.screen === 'title' && G.Game.state === 'menu') { G.Audio.resume(); MN.showLobby(); } });
  };

  MN.hideAll = function () {
    if (G.AdminUI && G.AdminUI.open) G.AdminUI.close();
    if (MN.lobbyMates && MN.lobbyMates.length) { const t = MN.tab; MN.tab = null; MN.refreshLobbyMates(); MN.tab = t; }
    MN.root.querySelectorAll('.menu-screen').forEach((e) => e.classList.add('hidden'));
    document.getElementById('m-top').classList.add('hidden');
    MN.screen = null;
    MN.clearConfetti();
  };
  MN.showTitle = function () {
    if (!MN.lobbyScene) MN.init();
    MN.hideAll();
    MN.screen = 'title';
    document.getElementById('m-title').classList.remove('hidden');
    MN.previewSkin = null; MN.previewMode = null; MN.camX = 0; MN.previewX = 0;
    MN.setPreview();
    G.Game.state = 'menu';
    G.Sky.time = 11.2; G.Sky.speed = 0.01;
    if (G.Weather) { G.Weather.rain = 0; G.Weather.target = 0; G.Weather.events = []; }
  };
  MN.showLobby = function () {
    if (!MN.lobbyScene) MN.init();
    G.Game.state = 'menu';
    G.Input.exitLock();
    MN.hideAll();
    if (G.Bus.model && !G.Bus.active) G.Bus.model.visible = false;
    const got = C.syncUnlocks();
    G.Match.ensureChallenges();
    document.getElementById('m-top').classList.remove('hidden');
    MN.showTab('salon');
    MN.menuMusic();
    G.Audio.stopAllLoops();
  };
  MN.showTab = function (tab) {
    MN.tab = tab;
    MN.root.querySelectorAll('.menu-screen').forEach((e) => e.classList.add('hidden'));
    MN.root.querySelectorAll('.tab').forEach((t) => t.classList.toggle('sel', t.dataset.tab === tab));
    MN.screen = tab;
    MN.previewSkin = null; MN.previewBack = null; MN.previewMode = null; MN.previewPick = null; MN.previewWrap = null; MN.previewGlider2 = null;
    MN.camX = 0; MN.previewX = 0;
    if (tab === 'salon') { document.getElementById('m-lobby').classList.remove('hidden'); MN.refreshLobby(); }
    else if (tab === 'boutique') { document.getElementById('m-shop').classList.remove('hidden'); MN.previewX = -2.3; MN.camX = -0.9; MN.renderShop(); }
    else if (tab === 'pass') { document.getElementById('m-pass').classList.remove('hidden'); MN.previewX = -2.1; MN.camX = -0.8; MN.renderPass(); }
    else if (tab === 'defis') { document.getElementById('m-defis').classList.remove('hidden'); MN.previewX = -2.1; MN.camX = -0.8; MN.renderChallenges(); }
    else if (tab === 'casier') { document.getElementById('m-casier').classList.remove('hidden'); MN.previewX = -0.4; MN.camX = 0.2; MN.renderLocker(); }
    else if (tab === 'carriere') { document.getElementById('m-carriere').classList.remove('hidden'); MN.previewX = -2.1; MN.camX = -0.8; MN.renderCareer(); }
    else if (tab === 'admin') {
      document.getElementById('m-admin').classList.remove('hidden');
      MN.previewX = -2.1; MN.camX = -0.8;
      MN.hideAll();                       // le panneau d'admin occupe tout l'écran
      document.getElementById('m-top').classList.remove('hidden');
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('sel', t.dataset.tab === 'admin'));
      MN.screen = 'admin';
      G.AdminUI.openPanel();
      return;
    }
    MN.setPreview();
    MN.refreshTop();
    MN.refreshLobbyMates();
  };
  MN.refreshTop = function () {
    const d = G.Store.data;
    document.getElementById('top-lvl').textContent = d.level;
    document.getElementById('top-lvl2').textContent = d.level;
    document.getElementById('top-xp').style.width = (d.xp / G.Store.XP_PER_LEVEL * 100) + '%';
    document.getElementById('top-xpt').textContent = d.xp + ' / ' + G.Store.XP_PER_LEVEL + ' XP';
    document.getElementById('top-vb').textContent = fmtVb(d.vbucks || 0);
    const ch = G.Match.ensureChallenges();
    const left = ch.list.filter((c) => !c.done).length;
    const b = document.getElementById('chal-badge'); b.textContent = left; b.style.display = left ? 'inline-block' : 'none';
    MN.refreshAccount();
  };

  // ------------------------------------------------------------
  //  Badge de compte (barre du haut) + accès admin
  // ------------------------------------------------------------
  MN.refreshAccount = function () {
    const box = document.getElementById('acct-box');
    const tab = document.getElementById('tab-admin');
    if (!box) return;
    const u = G.Auth.session();
    const guest = !u && G.Auth.guest;
    const staff = !!u && (u.role === 'admin' || u.role === 'moderator');
    if (tab) tab.style.display = staff ? '' : 'none';
    if (MN.tab === 'admin' && !staff) MN.showTab('salon');
    if (!u) {
      box.innerHTML = `<button class="acct-btn" id="acct-btn" title="${guest ? 'Progression locale' : 'Connexion requise'}">
        <span class="av">${guest ? 'I' : '?'}</span>
        <span class="who"><span>${guest ? 'Invité' : 'Non connecté'}</span><span class="rl2">${guest ? 'cliquer pour se connecter' : 'connexion requise'}</span></span></button>`;
    } else {
      box.innerHTML = `<button class="acct-btn ${u.role}" id="acct-btn" title="Compte ${esc(u.username)}">
        <span class="av">${esc(u.username.charAt(0).toUpperCase())}</span>
        <span class="who"><span>${esc(u.username)}</span><span class="rl2">${esc(G.Auth.RANK_LABEL[u.role] || u.role)}</span></span></button>`;
    }
    const btn = document.getElementById('acct-btn');
    if (btn) {
      btn.addEventListener('click', () => { G.Audio.play('ui_click'); MN.openAccountMenu(); });
      btn.addEventListener('mouseenter', () => G.Audio.play('ui_hover'));
    }
  };

  MN.openAccountMenu = function () {
    let el = document.getElementById('m-account');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'm-account';
    document.body.appendChild(el);
    const u = G.Auth.session();
    const rows = u ? [
      ['Profil : ' + u.username + ' · ' + (G.Auth.RANK_LABEL[u.role] || u.role), null],
      ['Changer de compte', 'switch'],
      ['Déconnexion', 'logout'],
    ] : [
      ['Mode invité — progression non sauvegardée', null],
      ['Se connecter / créer un compte', 'switch'],
    ];
    if (u && u.role !== 'admin') rows.push(['Ouvrir le panneau d\'administration', 'admin']);
    el.innerHTML = `<div class="set-box" style="width:min(420px,92vw)">
      <h2 class="fn">${u ? 'MON COMPTE' : 'SESSION'}</h2>
      <div class="sub">${u ? (u.email || 'aucune adresse e-mail') : 'Aucun compte connecté sur cet appareil.'}</div>
      ${rows.map((r, i) => r[1] ? `<button class="btn big" style="width:100%;margin-top:8px" data-i="${i}">${esc(r[0])}</button>` : `<div class="set-row" style="border:0"><div class="sl" style="font-family:Arial;font-size:13px;text-transform:none;opacity:.85">${esc(r[0])}</div></div>`).join('')}
      <div class="set-foot"><span></span><button class="btn" id="acc-close">Fermer</button></div>
    </div>`;
    // pas de stopPropagation : G.Input ignore déjà les touches de l'interface
    el.querySelectorAll('[data-i]').forEach((b) => {
      b.addEventListener('click', () => {
        const act = rows[+b.dataset.i][1];
        el.remove();
        G.Audio.play('ui_back');
        if (act === 'logout') {
          G.Auth.logout();
          MN.refreshAccount();
          G.HUD.notify('DÉCONNEXION — la progression reste attachée au compte', 3.5);
        } else if (act === 'switch') {
          G.AuthUI.show();
        } else if (act === 'admin') {
          G.AdminUI.openPanel();
        }
      });
    });
    el.querySelector('#acc-close').addEventListener('click', () => { el.remove(); G.Audio.play('ui_back'); });
  };
  MN.refreshLobby = function () {
    const s = G.Store.data.settings;
    MN.root.querySelectorAll('[data-d]').forEach((c) => c.classList.toggle('sel', +c.dataset.d === s.difficulty));
    MN.root.querySelectorAll('[data-b]').forEach((c) => c.classList.toggle('sel', +c.dataset.b === s.bots));
    const duo = s.mode === 'duo', sq = s.mode === 'squad', pg = s.mode === 'playground', rb = s.mode === 'rumble';
    const mode = duo ? 'duo' : sq ? 'squad' : pg ? 'playground' : rb ? 'rumble' : 'solo';
    const tsize = sq ? 4 : duo ? 2 : 1;
    MN.root.querySelectorAll('[data-mode]').forEach((c) => c.classList.toggle('sel', c.dataset.mode === mode));
    const rk = !!s.ranked && !pg && !rb;
    MN.root.querySelectorAll('[data-zb]').forEach((c) => { c.classList.toggle('sel', (c.dataset.zb === '1') === !!s.zeroBuild); c.style.opacity = pg ? 0.35 : ''; c.style.pointerEvents = pg ? 'none' : ''; });
    document.getElementById('mode-title').textContent = pg ? 'TERRAIN DE JEU' : rb ? 'ÉQUIPE CONTRE ÉQUIPE' : (duo ? 'DUO' : sq ? 'SECTION' : 'SOLO') + (rk ? ' · CLASSÉ' : ' · BATTLE ROYALE') + (s.zeroBuild && !pg ? ' · ZÉRO CONSTRUCTION' : '');
    MN.root.querySelectorAll('[data-rk]').forEach((c) => { c.classList.toggle('sel', (c.dataset.rk === '1') === !!s.ranked); c.style.opacity = pg || rb ? 0.35 : ''; c.style.pointerEvents = pg || rb ? 'none' : ''; });
    const ri = G.Ranked.info(G.Ranked.data().pts);
    document.getElementById('rk-mini').innerHTML = pg || rb ? '' : `${G.Ranked.badge(ri, 22)}<span class="rk-mini-t" style="color:${ri.color}">${ri.name}</span>`;
    MN.root.querySelectorAll('[data-d]').forEach((c) => { c.style.opacity = pg || rk ? 0.35 : ''; c.style.pointerEvents = pg || rk ? 'none' : ''; });
    MN.root.querySelectorAll('[data-b]').forEach((c) => { c.style.opacity = pg || rb ? 0.35 : ''; c.style.pointerEvents = pg || rb ? 'none' : ''; });
    if (rb) document.getElementById('mode-sub').textContent = '2 équipes de 16 · réapparition · siphon (+50 par élimination) · première équipe à 40 éliminations';
    else if (pg) document.getElementById('mode-sub').textContent = 'Seul sur l\'île · pas de tempête · ressources infinies · touche O : véhicules, objets, événements';
    else if (rk) document.getElementById('mode-sub').textContent = (s.bots + 1) + ' joueurs · Rang ' + ri.name + ' (' + G.Ranked.data().pts + ' pts) · bots adaptés à votre rang';
    else document.getElementById('mode-sub').textContent = (s.bots + 1) + ' joueurs' + (tsize > 1 ? ' · ' + Math.ceil((s.bots + 1) / tsize) + ' équipes de ' + tsize : '') + ' · Bots ' + ['faciles', 'normaux', 'difficiles', 'pros'][s.difficulty] + ' · Île de 1,6 km';
    document.getElementById('name-input').value = G.Store.data.name;
    MN.refreshLobbyMates();
    const sk = C.items[G.Store.data.equipped.skin];
    document.getElementById('lobby-skin-name').textContent = sk ? sk.name + ' · Niveau ' + G.Store.data.level : '';
  };

  // ------------------------------------------------------------
  //  Icônes des cosmétiques
  // ------------------------------------------------------------
  MN.icons = {};
  MN.iconFor = function (it) {
    if (MN.icons[it.id]) return MN.icons[it.id];
    const WM = G.WModels;
    let url;
    if (it.cat === 'skin' || it.cat === 'emote') {
      const c = CH.build(it.cat === 'skin' ? it.id : G.Store.data.equipped.skin, {});
      if (it.cat === 'emote') { c.anim.emote = it.id; c.anim.emoteT = 0.45; }
      CH.animate(c, 0.016);
      c.root.updateMatrixWorld(true);
      const box = it.cat === 'skin' ? new THREE.Box3(new THREE.Vector3(-0.45, 0.75, -0.3), new THREE.Vector3(0.45, 2.15, 0.3)) : null;
      url = WM.renderIcon(c.root, null, { ry: 0.35, rx: 0.05, zoom: it.cat === 'skin' ? 0.9 : 0.8, box });
    } else if (it.cat === 'back') {
      const m = CH.backModel(it.id);
      url = m ? WM.renderIcon(m, null, { ry: Math.PI + 0.5, rx: 0.2 }) : emptyIcon('∅');
    } else if (it.cat === 'pickaxe') {
      const m = CH.pickaxeModel(it.id); m.rotation.set(-1.2, 0.4, 0.4);
      url = WM.renderIcon(m, null, { ry: 0.8, rx: 0.3 });
    } else if (it.cat === 'glider') {
      const m = CH.gliderModel(it.id);
      url = WM.renderIcon(m, null, { ry: 0.5, rx: 0.5 });
    } else if (it.cat === 'wrap') {
      if (!it.style) url = emptyIcon('∅');
      else { const m = WM.weapon('ar', 4, it.id); url = WM.renderIcon(m, null, { ry: Math.PI / 2, rx: 0.15 }); }
    } else if (it.cat === 'spray') {
      url = G.Sprays.canvas(it.id).toDataURL();
    } else if (it.cat === 'trail') {
      const c = G.Tex.canvas(128, 128), x = c.getContext('2d');
      if (!it.colors) { MN.icons[it.id] = emptyIcon('∅'); return MN.icons[it.id]; }
      for (let i = 0; i < 70; i++) {
        const col = it.colors[i % it.colors.length];
        const t = i / 70;
        x.fillStyle = `rgba(${col[0] * 255 | 0},${col[1] * 255 | 0},${col[2] * 255 | 0},${1 - t * 0.8})`;
        x.beginPath(); x.arc(20 + t * 90 + Math.sin(i) * 6, 108 - t * 90 + Math.cos(i * 1.3) * 6, 6 * (1 - t) + 2, 0, 7); x.fill();
      }
      url = c.toDataURL();
    }
    MN.icons[it.id] = url;
    return url;
  };
  function emptyIcon(ch) {
    const c = G.Tex.canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = '60px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 64);
    return c.toDataURL();
  }
  function cardHTML(it, o) {
    o = o || {};
    const r = C.RARITY[it.rarity] || C.RARITY.commun;
    const owned = G.Store.isUnlocked(it.id);
    const cls = ['card'];
    if (!owned && !o.noLock) cls.push('locked');
    if (owned) cls.push('owned');
    if (o.equipped) cls.push('equipped');
    if (o.sel) cls.push('sel');
    return `<div class="${cls.join(' ')}" data-id="${it.id}" style="background:${r.bg}">
      ${o.tier ? `<div class="ctier">${o.tier}</div>` : ''}<div class="ccat">${C.CATS[it.cat]}</div>
      <img src="${MN.iconFor(it)}"><div class="cname">${esc(it.name)}</div>${owned && o.check ? '<div class="check">✔</div>' : ''}</div>`;
  }

  // ------------------------------------------------------------
  //  Passe de combat
  // ------------------------------------------------------------
  MN.renderPass = function () {
    const d = G.Store.data;
    const per = 10, pages = Math.ceil(C.PASS_TIERS / per);
    if (MN.passPage == null) MN.passPage = 0;
    const p = document.getElementById('pass-panel');
    let h = `<h2 class="fn">FORTNITE — Build Bêta</h2>
      <div class="pass-head"><div class="big-lvl fn">${d.level}</div><div class="xpwrap"><div class="fn">NIVEAU ${d.level} — PALIER ${Math.min(d.level, C.PASS_TIERS)} / ${C.PASS_TIERS}</div><div class="xpbar"><div style="width:${d.xp / G.Store.XP_PER_LEVEL * 100}%"></div></div><div class="sub">${d.xp} / ${G.Store.XP_PER_LEVEL} XP avant le prochain niveau · XP total : ${d.totalXp}</div></div></div>
      <div class="pass-grid">`;
    for (let t = MN.passPage * per + 1; t <= Math.min(C.PASS_TIERS, (MN.passPage + 1) * per); t++) {
      const it = C.items[C.PASS[t]];
      if (!it) continue;
      h += cardHTML(it, { tier: t, check: true, sel: MN.passSel === it.id });
    }
    h += `</div><div class="pager"><button class="btn" id="pg-prev">◀</button><span class="pg fn">PAGE ${MN.passPage + 1} / ${pages}</span><button class="btn" id="pg-next">▶</button></div>
      <div class="sub" id="pass-info" style="margin-top:10px"></div>`;
    p.innerHTML = h;
    document.getElementById('pg-prev').onclick = () => { MN.passPage = (MN.passPage + pages - 1) % pages; G.Audio.play('ui_click'); MN.renderPass(); };
    document.getElementById('pg-next').onclick = () => { MN.passPage = (MN.passPage + 1) % pages; G.Audio.play('ui_click'); MN.renderPass(); };
    p.querySelectorAll('.card').forEach((c) => {
      c.addEventListener('mouseenter', () => G.Audio.play('ui_hover'));
      c.addEventListener('click', () => { MN.passSel = c.dataset.id; G.Audio.play('ui_click'); MN.previewItem(C.items[c.dataset.id]); MN.renderPass(); });
    });
    if (MN.passSel) {
      const it = C.items[MN.passSel], t = C.tierOf(MN.passSel);
      document.getElementById('pass-info').innerHTML = `<b style="font-size:18px">${esc(it.name)}</b> — ${C.CATS[it.cat]} ${C.RARITY[it.rarity].name.toLowerCase()} · Palier ${t} ${G.Store.isUnlocked(it.id) ? '· <span style="color:#7dff6a">Débloqué</span>' : '· <span style="color:#ffd83a">Atteignez le niveau ' + t + '</span>'}<br>${esc(it.desc || '')}`;
    }
  };
  // ------------------------------------------------------------
  //  Boutique d'objets (rotation quotidienne, V-Bucks)
  // ------------------------------------------------------------
  function fmtVb(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  MN.shopItems = function () {
    const day = Math.floor(Date.now() / 86400000);
    const rng = U.RNG(day * 7919 + 17);
    const pool = C.shopPool().slice();
    const shuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const big = shuf(pool.filter((i) => i.cat === 'skin' && (i.rarity === 'légendaire' || i.rarity === 'épique')));
    const featured = big.slice(0, 2);
    const rest = shuf(pool.filter((i) => featured.indexOf(i) < 0));
    // variété : au plus 2 objets de la même catégorie dans les objets du jour
    const daily = [], per = {};
    for (const it of rest) { if (daily.length >= 6) break; per[it.cat] = (per[it.cat] || 0) + 1; if (per[it.cat] <= 2) daily.push(it); }
    return { featured, daily };
  };
  function shopCard(it, big) {
    const r = C.RARITY[it.rarity] || C.RARITY.commun;
    const owned = G.Store.isUnlocked(it.id);
    return `<div class="card shop-card ${big ? 'big' : ''} ${owned ? 'owned' : ''} ${MN.shopSel === it.id ? 'sel' : ''}" data-id="${it.id}" style="background:${r.bg}">
      <div class="ccat">${C.CATS[it.cat]}</div><img src="${MN.iconFor(it)}">
      <div class="cname">${esc(it.name)}</div>
      <div class="price">${owned ? '<span class="own">POSSÉDÉ</span>' : `<span class="vb">V</span>${fmtVb(C.price(it))}`}</div></div>`;
  }
  MN.renderShop = function () {
    const d = G.Store.data;
    const { featured, daily } = MN.shopItems();
    const p = document.getElementById('shop-panel');
    const left = 86400000 - (Date.now() % 86400000);
    const hh = Math.floor(left / 3600000), mm = Math.floor(left / 60000) % 60, ss = Math.floor(left / 1000) % 60;
    let h = `<h2 class="fn">BOUTIQUE D'OBJETS</h2><div class="shop-timer sub">Nouveaux objets dans <b id="shop-timer">${hh}:${U.fmt2(mm)}:${U.fmt2(ss)}</b> · Vous avez <span class="vb">V</span><b>${fmtVb(d.vbucks || 0)}</b> V-Bucks (+100 par niveau, +300 par Victoire Royale)</div>
      <div class="shop-sec fn">À LA UNE</div><div class="shop-feat">${featured.map((it) => shopCard(it, true)).join('')}</div>
      <div class="shop-sec fn">OBJETS DU JOUR</div><div class="shop-daily">${daily.map((it) => shopCard(it, false)).join('')}</div>
      <div class="shop-info" id="shop-info"></div>`;
    p.innerHTML = h;
    p.querySelectorAll('.card').forEach((c) => {
      c.addEventListener('mouseenter', () => G.Audio.play('ui_hover'));
      c.addEventListener('click', () => { MN.shopSel = c.dataset.id; G.Audio.play('ui_click'); MN.previewItem(C.items[c.dataset.id]); MN.renderShop(); });
    });
    if (MN.shopSel && C.items[MN.shopSel]) {
      const it = C.items[MN.shopSel], owned = G.Store.isUnlocked(it.id), price = C.price(it), rich = (d.vbucks || 0) >= price;
      const info = document.getElementById('shop-info');
      info.innerHTML = `<div><b style="font-size:18px">${esc(it.name)}</b> — ${C.CATS[it.cat]} ${C.RARITY[it.rarity].name.toLowerCase()}<br><span class="sub">${esc(it.desc || 'Objet exclusif de la boutique.')}</span></div>
        <button class="btn big ${owned || !rich ? 'dis' : ''}" id="shop-buy">${owned ? 'DÉJÀ POSSÉDÉ' : rich ? 'ACHETER — <span class="vb">V</span>' + fmtVb(price) : 'V-BUCKS INSUFFISANTS'}</button>`;
      document.getElementById('shop-buy').onclick = () => {
        if (owned) return;
        if (!rich) { G.Audio.play('build_fail'); return; }
        d.vbucks -= price; G.Store.unlock(it.id); G.Store.save();
        G.Audio.play('unlock'); G.Audio.play('levelup');
        MN.confetti && MN.confetti(60);
        MN.refreshTop(); MN.renderShop();
      };
    }
    clearInterval(MN.shopTimer);
    MN.shopTimer = setInterval(() => {
      const el = document.getElementById('shop-timer');
      if (!el || MN.tab !== 'boutique') { clearInterval(MN.shopTimer); return; }
      const l = 86400000 - (Date.now() % 86400000);
      el.textContent = Math.floor(l / 3600000) + ':' + U.fmt2(Math.floor(l / 60000) % 60) + ':' + U.fmt2(Math.floor(l / 1000) % 60);
    }, 1000);
  };
  MN.previewItem = function (it) {
    if (!it) return;
    MN.previewMode = null;
    if (it.cat === 'skin') { MN.previewSkin = it.id; MN.setPreview(); }
    else if (it.cat === 'back') { MN.previewBack = it.id; MN.setPreview(); MN.rotY = Math.PI; }
    else if (it.cat === 'pickaxe') { MN.previewMode = 'pickaxe'; MN.previewPick = it.id; MN.setPreview(); }
    else if (it.cat === 'glider') { MN.previewMode = 'glider'; MN.previewGlider2 = it.id; MN.setPreview(); }
    else if (it.cat === 'wrap') { MN.previewMode = 'wrap'; MN.previewWrap = it.id; MN.setPreview(); }
    else if (it.cat === 'emote') { MN.setPreview(); MN.previewEmote(it.id); }
    else if (it.cat === 'trail') { MN.setPreview(); MN.trailPreview = it; }
  };

  // ------------------------------------------------------------
  //  Défis
  // ------------------------------------------------------------
  MN.renderChallenges = function () {
    const ch = G.Match.ensureChallenges();
    let h = `<h2 class="fn">DÉFIS DE LA SEMAINE ${ch.week}</h2><div class="sub">Terminez les défis en partie pour gagner beaucoup d'XP et monter dans le passe de combat.</div>`;
    for (const c of ch.list) {
      const def = G.Match.challengeDef(c.id);
      if (!def) continue;
      h += `<div class="chal ${c.done ? 'done' : ''}"><div class="cname fn">${c.done ? '✔ ' : ''}${esc(def.name)}</div><div class="cprog"><div class="xpbar"><div style="width:${c.progress / def.goal * 100}%"></div></div><div class="pt">${c.progress} / ${def.goal}</div></div><div class="cxp fn">+${def.xp} XP</div></div>`;
    }
    h += '<div class="sub" style="margin-top:14px">Quand tous les défis sont terminés, une nouvelle semaine de défis se débloque.</div>';
    document.getElementById('defis-panel').innerHTML = h;
  };

  // ------------------------------------------------------------
  //  Casier
  // ------------------------------------------------------------
  const LOCKER_SLOTS = [['skin', 'Tenue'], ['back', 'Sac à dos'], ['pickaxe', 'Pioche'], ['glider', 'Planeur'], ['trail', 'Traînée'], ['wrap', 'Revêtement'], ['spray', 'Tag'], ['emote0', 'Emote 1'], ['emote1', 'Emote 2'], ['emote2', 'Emote 3'], ['emote3', 'Emote 4'], ['emote4', 'Emote 5'], ['emote5', 'Emote 6']];
  MN.renderLocker = function () {
    const eq = G.Store.data.equipped;
    let s = '';
    for (const [k, name] of LOCKER_SLOTS) {
      let id;
      if (k.startsWith('emote')) id = eq.emotes[+k.slice(5)];
      else id = eq[k];
      const it = id ? C.items[id] : null;
      const r = it ? C.RARITY[it.rarity] : null;
      s += `<div class="lk-slot ${MN.lockerSlot === k ? 'sel' : ''}" data-k="${k}" style="${r ? 'background:' + r.bg : ''}">${it ? `<img src="${MN.iconFor(it)}">` : ''}<div class="lt fn">${name}</div></div>`;
    }
    document.getElementById('lk-slots').innerHTML = s;
    document.querySelectorAll('.lk-slot').forEach((e) => {
      e.addEventListener('mouseenter', () => G.Audio.play('ui_hover'));
      e.addEventListener('click', () => { MN.lockerSlot = e.dataset.k; G.Audio.play('ui_click'); MN.renderLocker(); });
    });
    const k = MN.lockerSlot || 'skin';
    MN.lockerSlot = k;
    const cat = k.startsWith('emote') ? 'emote' : k;
    const items = C.byCat(cat);
    const curId = k.startsWith('emote') ? eq.emotes[+k.slice(5)] : eq[k];
    let h = `<h2 class="fn">${LOCKER_SLOTS.find((x) => x[0] === k)[1].toUpperCase()}</h2><div class="sub">${items.filter((i) => G.Store.isUnlocked(i.id)).length} / ${items.length} débloqués — cliquez pour équiper, les objets verrouillés se gagnent dans le passe de combat.</div><div class="lk-grid">`;
    if (cat === 'emote') h += `<div class="card owned" data-id="__none" style="background:linear-gradient(160deg,#555,#222)"><img src="${emptyIcon('∅')}"><div class="cname">Aucune</div></div>`;
    const curBase = C.baseOf(curId);
    for (const it of items) h += cardHTML(it, { equipped: it.id === curBase, check: false });
    h += '</div><div class="lk-styles" id="lk-styles"></div><div class="lk-info" id="lk-info"></div>';
    document.getElementById('lk-panel').innerHTML = h;
    document.querySelectorAll('#lk-panel .card').forEach((c) => {
      c.addEventListener('mouseenter', () => G.Audio.play('ui_hover'));
      c.addEventListener('click', () => {
        const id = c.dataset.id;
        if (id === '__none') { eq.emotes[+k.slice(5)] = null; G.Store.save(); MN.renderLocker(); return; }
        const it = C.items[id];
        MN.previewItem(it);
        if (!G.Store.isUnlocked(id)) { G.Audio.play('build_fail'); const tr = C.tierOf(id); document.getElementById('lk-info').innerHTML = `<b>${esc(it.name)}</b> — verrouillé · ${tr ? 'Palier ' + tr + ' du passe de combat' : esc(it.desc || 'Objet spécial')}`; return; }
        if (k.startsWith('emote')) eq.emotes[+k.slice(5)] = id; else eq[k] = id;
        G.Store.save();
        G.Audio.play('ui_click');
        MN.renderLocker();
        document.getElementById('lk-info').innerHTML = `<b>${esc(it.name)}</b> équipé(e) — ${C.RARITY[it.rarity].name}. ${esc(it.desc || '')}`;
        if (it.cat === 'emote') MN.previewEmote(it.id);
      });
    });
    // styles de la tenue équipée
    const base = C.items[curBase];
    if (cat === 'skin' && base && base.styles && G.Store.isUnlocked(base.id)) {
      const opts = [base.id].concat(base.styles);
      document.getElementById('lk-styles').innerHTML = '<span class="fn">STYLES :</span>' + opts.map((sid) => `<span class="chip ${sid === curId ? 'sel' : ''}" data-style="${sid}">${esc(C.items[sid].styleName || 'Original')}</span>`).join('');
      document.querySelectorAll('#lk-styles .chip').forEach((c) => c.addEventListener('click', () => {
        eq.skin = c.dataset.style; G.Store.save(); G.Audio.play('ui_click');
        MN.previewItem(C.items[eq.skin]); MN.renderLocker();
        document.getElementById('lk-info').innerHTML = `Style <b>${esc(C.items[eq.skin].styleName || 'Original')}</b> équipé.`;
      }));
    }
    MN.refreshLobby();
  };

  // ------------------------------------------------------------
  //  Carrière
  // ------------------------------------------------------------
  MN.renderCareer = function () {
    const s = G.Store.data.stats, d = G.Store.data;
    const kd = (s.kills / Math.max(1, s.deaths)).toFixed(2);
    const wr = s.matches ? Math.round(s.wins / s.matches * 100) : 0;
    const h = Math.floor(s.playTime / 3600), m = Math.floor(s.playTime % 3600 / 60);
    const box = (v, l) => `<div class="stat"><div class="sv fn">${v}</div><div class="sl">${l}</div></div>`;
    document.getElementById('car-panel').innerHTML = `<h2 class="fn">CARRIÈRE</h2><div class="sub">Statistiques de ${esc(d.name)} — niveau ${d.level}</div><div class="stats-grid">
      ${box(s.wins, 'Victoires Royales')}${box(s.matches, 'Parties jouées')}${box(wr + ' %', 'Taux de victoire')}
      ${box(s.kills, 'Éliminations')}${box(kd, 'Ratio élim./mort')}${box(s.bestKills, 'Record d\'éliminations')}
      ${box(s.top10, 'Top 10')}${box(s.top25, 'Top 25')}${box(Math.round(s.damage), 'Dégâts infligés')}
      ${box(s.chests, 'Coffres ouverts')}${box(s.mats, 'Matériaux récoltés')}${box(h + ' h ' + m + ' min', 'Temps de jeu')}
      ${box(d.gnomes || 0, 'Nains de jardin trouvés')}
      </div>${(() => { const R = G.Ranked, rd = R.data(), ri = R.info(rd.pts), rb = R.info(rd.best || 0); return `<div class="rk-car">${R.badge(ri, 48)}<div><div class="fn" style="font-size:22px;color:${ri.color}">CLASSÉ : ${ri.name.toUpperCase()}</div><div class="sub">${rd.pts} points · meilleur rang : ${rb.name} · ${rd.matches || 0} parties classées</div></div></div>`; })()}<div style="margin-top:16px"><button class="btn red" id="btn-reset">Réinitialiser la progression</button></div>`;
    document.getElementById('btn-reset').onclick = () => { if (confirm('Effacer toute la progression (niveau, casier, statistiques) ?')) { G.Store.reset(); MN.showLobby(); } };
  };

  // ------------------------------------------------------------
  //  Commandes : réaffectation clavier ET souris
  // ------------------------------------------------------------
  MN.controlsTab = function () {
    const I = G.Input;
    let body = '<div class="bind-help">Clique une touche ou un bouton de souris, puis appuie ce que tu veux. ' +
      '<b>Échap</b> annule · le clic molette compte comme une touche · un double assignement est signalé en rouge.</div>';
    for (const grp of I.GROUPS) {
      body += '<div class="bind-grp">' + grp.title + '</div>';
      body += '<div class="bind-list">';
      for (const a of grp.actions) {
        const codes = I.codes(a.id);
        const conf = I.conflictOf(a.id);
        body += '<div class="bind-row' + (I.isCustom(a.id) ? ' custom' : '') + (conf.length ? ' conflict' : '') + '">' +
          '<div class="bl" title="' + (conf.length ? 'en double avec : ' + conf.map((x) => x.label).join(', ') : '') + '">' + a.label + (conf.length ? ' <span class="warn">!</span>' : '') + '</div>' +
          '<div class="bslots">';
        const slots = Math.max(codes.length, 1);
        for (let s = 0; s < slots; s++) {
          const code = codes[s];
          body += '<button class="keyb' + (code ? '' : ' empty') + '" data-id="' + a.id + '" data-slot="' + s + '">' +
            (code ? I.nice(code) : '+') + '</button>';
        }
        body += '<button class="keyb add" data-id="' + a.id + '" data-slot="add">+</button>' +
          (I.isCustom(a.id) ? '<button class="keyb rst" data-id="' + a.id + '" data-slot="reset" title="Revenir au réglage par défaut">↺</button>' : '') +
          '</div></div>';
      }
      body += '</div>';
    }
    body += '<div class="bind-foot-btns">' +
      '<button class="btn" data-bx="defaults">Tout remettre à zéro</button>' +
      '<button class="btn" data-bx="export">Copier la configuration</button>' +
      '</div>';
    return body;
  };

  MN.bindControls = function (el) {
    const I = G.Input;
    const box = el.querySelector('.set-box');
    const stop = () => { if (box) box.classList.remove('capturing'); };
    el.querySelectorAll('.keyb[data-id]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.id, slot = b.dataset.slot;
        if (slot === 'reset') { I.resetAction(id); G.Audio.play('ui_back'); stop(); return MN.openSettings(MN.settingsInGame); }
        // le bouton « + » ouvre directement la capture sur le prochain emplacement libre
        const at = slot === 'add' ? I.codes(id).length : +slot;
        if (I.capturing()) { I.cancelCapture(); stop(); return; }
        G.Audio.play('ui_click');
        if (box) box.classList.add('capturing');
        b.classList.add('listening');
        b.textContent = '…';
        I.capture(function (code) {
          stop();
          if (code) {
            const others = (I.conflicts()[code] || []).filter((x) => x.id !== id);
            if (others.length) G.HUD.notify(I.nice(code) + ' est déjà sur « ' + others.map((x) => x.label).join(', ') + ' »', 4);
            I.setBind(id, code, at);
            G.Audio.play('ui_play');
          } else {
            I.clearBind(id, at);
            G.Audio.play('ui_back');
          }
          MN.openSettings(MN.settingsInGame);
        }, false);
      });
    });
    el.querySelectorAll('[data-bx]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.dataset.bx === 'defaults') {
          if (!confirm('Remettre tous les raccourcis aux réglages par défaut ?')) return;
          I.defaults();
          G.HUD.notify('Raccourcis par défaut restaurés', 2.5);
        } else {
          const txt = I.exportBinds();
          if (navigator.clipboard) navigator.clipboard.writeText(txt).then(
            () => G.HUD.notify('Configuration copiée dans le presse-papiers', 2.5),
            () => G.HUD.notify('Copie refusée par le navigateur', 3));
          else G.HUD.notify('Presse-papiers indisponible', 3);
          return;
        }
        MN.openSettings(MN.settingsInGame);
      });
    });
  };

  // ------------------------------------------------------------
  //  Paramètres
  // ------------------------------------------------------------
  MN.openSettings = function (inGame) {
    MN.settingsInGame = inGame;
    let el = document.getElementById('m-settings');
    if (el) el.remove();
    // referme proprement l'écouteur Échap d'un éventuel panneau précédent
    if (MN._escCloser) { window.removeEventListener('keydown', MN._escCloser, true); MN._escCloser = null; }
    el = document.createElement('div');
    el.id = 'm-settings';
    document.body.appendChild(el);
    // Ouvert pendant une partie : on gèle vraiment la partie. Sans cela
    // les bots continuaient à attaquer pendant le réglage.
    if (inGame) {
      MN.wasPausedBefore = G.HUD.paused;
      if (!G.HUD.paused) {
        G.HUD.showPause(true);
        G.Game.ignoreUnlock = true;
        G.Input.exitLock();
        G.Input.cancelCapture();
        setTimeout(function () { G.Game.ignoreUnlock = false; }, 400);
      }
    }
    const S = G.Store.data.settings;
    const tabs = ['Jeu', 'Graphismes', 'Audio', 'Commandes'];
    MN.setTab = MN.setTab || 'Jeu';
    const slider = (key, label, min, max, step, fmt) => `<div class="set-row"><div class="sl">${label}</div><div class="sc"><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${S[key]}"><div class="val" data-v="${key}">${fmt ? fmt(S[key]) : S[key]}</div></div></div>`;
    const choice = (key, label, opts) => `<div class="set-row"><div class="sl">${label}</div><div class="sc">${opts.map((o, i) => `<span class="chip ${S[key] === o[0] ? 'sel' : ''}" data-ck="${key}" data-cv="${o[0]}">${o[1]}</span>`).join('')}</div></div>`;
    const toggle = (key, label) => choice(key, label, [[true, 'Oui'], [false, 'Non']]);
    const pct = (v) => Math.round(v * 100) + ' %';
    let body = '';
    if (MN.setTab === 'Jeu') body = choice('layout', 'Disposition du clavier', [['auto', 'Auto'], ['azerty', 'AZERTY (fr)'], ['qwerty', 'QWERTY (en)']]) + '<div class="sub" style="margin-top:-4px;margin-bottom:10px">Le jeu bouge avec Z Q S D sur les deux dispositions : seule l\'affichage des touches change.</div>' + slider('sens', 'Sensibilité souris', 0.2, 3, 0.05, (v) => (+v).toFixed(2)) + slider('adsSens', 'Sensibilité en visée', 0.2, 1.5, 0.05, (v) => (+v).toFixed(2)) + slider('scopeSens', 'Sensibilité lunette', 0.1, 1.5, 0.05, (v) => (+v).toFixed(2)) + toggle('invertY', 'Inverser l\'axe vertical') + slider('fov', 'Champ de vision', 65, 100, 1) + toggle('damageNumbers', 'Chiffres de dégâts') + toggle('showFps', 'Afficher les IPS') + (inGame ? '' : choice('difficulty', 'Difficulté des bots', [[0, 'Facile'], [1, 'Normal'], [2, 'Difficile'], [3, 'Pro']]) + choice('bots', 'Nombre de joueurs', [[29, '30'], [49, '50'], [74, '75'], [99, '100']]));
    else if (MN.setTab === 'Graphismes') body = choice('quality', 'Qualité graphique', [[0, 'Basse'], [1, 'Moyenne'], [2, 'Élevée'], [3, 'Épique']]) + choice('viewDist', 'Distance d\'affichage', [[0, 'Proche'], [1, 'Moyenne'], [2, 'Loin'], [3, 'Épique']]) + toggle('dynRes', 'Résolution dynamique (vise 60 IPS)') + toggle('bloom', 'Halo lumineux (bloom)') + '<div class="sub" style="margin-top:8px">Basse : pas d\'herbe, ombres simples, résolution réduite (pour les PC modestes). Épique : ombres 4K, herbe dense, pleine résolution.</div>';
    else if (MN.setTab === 'Audio') body = slider('volMaster', 'Volume général', 0, 1, 0.01, pct) + slider('volMusic', 'Musique', 0, 1, 0.01, pct) + slider('volSfx', 'Effets sonores', 0, 1, 0.01, pct) + slider('volAmbience', 'Ambiance (pluie, tempête, vent)', 0, 1, 0.01, pct) + toggle('soundViz', 'Visualiser les effets sonores (tirs, pas, coffres…)');
    else body = MN.controlsTab(inGame);
    el.innerHTML = `<div class="set-box" style="width:min(860px,96vw)"><h2 class="fn">PARAMÈTRES</h2><div class="set-tabs">${tabs.map((t) => `<button class="btn ${t === MN.setTab ? 'sel' : ''}" data-st="${t}">${t}</button>`).join('')}</div>${body}<div class="set-foot"><span id="bind-note"></span><button class="btn big" id="set-close">Fermer</button></div></div>`;
    el.querySelectorAll('[data-st]').forEach((b) => b.onclick = () => { MN.setTab = b.dataset.st; G.Audio.play('ui_click'); MN.openSettings(inGame); });
    el.querySelectorAll('input[type=range]').forEach((r) => r.oninput = () => {
      const k = r.dataset.k; S[k] = +r.value;
      const v = el.querySelector(`[data-v="${k}"]`);
      if (v) v.textContent = k.startsWith('vol') ? pct(S[k]) : k === 'fov' ? S[k] : (+S[k]).toFixed(2);
      if (k.startsWith('vol')) G.Audio.setVolumes(S.volMaster, S.volMusic, S.volSfx);
    });
    el.querySelectorAll('[data-ck]').forEach((c) => c.onclick = () => {
      const k = c.dataset.ck; let v = c.dataset.cv;
      // booléens, nombres, ou texte tels que 'auto' : une valeur non
      // numérique ne doit surtout pas devenir NaN.
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (v !== '' && !isNaN(+v)) v = +v;
      const before = S[k];
      S[k] = v;
      G.Audio.play('ui_click');
      if (k === 'quality') G.Store.data.settings.autoTuned = true;
      if ((k === 'quality' || k === 'viewDist' || k === 'bloom') && before !== v) G.applyGraphics();
      MN.openSettings(inGame);
    });
    el.querySelector('#set-close').onclick = () => {
      G.Store.save();
      if (G.Input.cancelCapture) G.Input.cancelCapture();
      if (MN._escCloser) { window.removeEventListener('keydown', MN._escCloser, true); MN._escCloser = null; }
      el.remove();
      G.Audio.play('ui_back');
      if (inGame) {
        // retour au jeu : on réaffiche la pause si c'est l'écart depuis
        // lequel on avait ouvert les paramètres
        if (MN.wasPausedBefore === false) G.HUD.showPause(false);
        else if (!G.HUD.paused) G.HUD.showPause(true);
      } else {
        MN.refreshLobby();
      }
    };
    // Fermeture par Échap : le focus est souvent sur un bouton, il faut
    // donc écouter au niveau de la fenêtre, en phase capture.
    const onEsc = (e) => {
      if (e.code !== 'Escape') return;
      if (G.Input.capturing && G.Input.capturing()) return;   // pendant une capture de touche
      e.preventDefault(); e.stopPropagation();
      window.removeEventListener('keydown', onEsc, true);
      MN._escCloser = null;
      const b = document.querySelector('#m-settings #set-close');
      if (b) b.click();
    };
    MN._escCloser = onEsc;
    window.addEventListener('keydown', onEsc, true);
    // NE PAS arrêter la propagation des touches ici : c'est ce qui rendait
    // l'onglet Commandes inutilisable (la capture n'était jamais déclenchée).
    // G.Input filtre déjà ce qui vient de l'interface.
    if (MN.setTab === 'Commandes') MN.bindControls(el);
  };

  // ------------------------------------------------------------
  //  Recherche de partie
  // ------------------------------------------------------------
  MN.startMatchmaking = function () {
    G.Audio.play('ui_play');
    G.Audio.stopMusic(0.5);
    MN.hideAll();
    const el = document.getElementById('m-match');
    el.classList.remove('hidden');
    MN.screen = 'match';
    const txt = document.getElementById('mm-txt');
    const n = G.Store.data.settings.bots + 1;
    let k = 0;
    const steps = ['Connexion aux serveurs…', 'Recherche de joueurs : ', 'Chargement de l\'île…'];
    const iv = setInterval(() => {
      k++;
      if (k < 6) txt.textContent = steps[1] + Math.min(n, Math.round(n * k / 5)) + ' / ' + n;
      else txt.textContent = steps[2];
      if (k === 1) G.Audio.play('ui_hover');
    }, 300);
    txt.textContent = steps[0];
    if (G.TIPS) document.getElementById('mm-tip').textContent = U.pick(G.TIPS);
    const mode = G.Store.data.settings.mode;
    if (mode === 'playground') { steps[1] = 'Préparation du terrain de jeu… '; }
    setTimeout(() => { clearInterval(iv); el.classList.add('hidden'); G.Match.start(); }, 2200);
  };

  // ------------------------------------------------------------
  //  Écran de fin
  // ------------------------------------------------------------
  MN.showResults = function (res) {
    const el = document.getElementById('m-results');
    el.classList.remove('hidden');
    el.classList.toggle('win', res.win);
    MN.screen = 'results';
    G.HUD.show(false);
    const pl = G.player;
    const fmt = (s) => Math.floor(s / 60) + ':' + U.fmt2(Math.floor(s % 60));
    const stat = (v, l) => `<div class="stat"><div class="sv fn">${v}</div><div class="sl">${l}</div></div>`;
    // classement : joueurs encore en vie puis éliminés
    const seen = new Set();
    let rank = [];
    G.Match.ranking.slice().sort((a, b) => (a.place || 999) - (b.place || 999)).forEach((r) => { if (!seen.has(r.name)) { seen.add(r.name); rank.push(r); } });
    const alive = [G.player].concat(G.Match.bots).filter((a) => !a.dead && !seen.has(a.name)).sort((a, b) => b.stats.kills - a.stats.kills);
    rank = alive.map((a) => ({ name: a.name, place: null, alive: true, kills: a.stats.kills, isPlayer: a.isPlayer })).concat(rank);
    // équipe contre équipe : classement aux éliminations, couleur d'équipe
    if (G.Match.rumble) rank = [G.player].concat(G.Match.bots).map((a) => ({ name: a.name, place: null, kills: a.stats.kills, isPlayer: a.isPlayer, teamTag: a.team === G.player.team ? 'bleue' : 'rouge' })).sort((a, b) => b.kills - a.kills);
    let rankHtml = '';
    const line = (r) => `<div class="rank-line ${r.isPlayer ? 'me' : ''}"><span class="rk">${r.place ? '#' + r.place : r.alive ? '♦' : r.teamTag ? '•' : '—'}</span><span class="rn">${esc(r.name)}${r.alive ? ' <small>(en vie)</small>' : ''}${r.teamTag ? ` <small style="color:${r.teamTag === 'bleue' ? '#7fc8ff' : '#ff8a8a'}">(équipe ${r.teamTag})</small>` : ''}${duoMate(r)}</span><span>${r.kills} élim.</span></div>`;
    const shown = rank.slice(0, 12);
    shown.forEach((r) => { rankHtml += line(r); });
    const me = rank.find((r) => r.isPlayer);
    if (me && shown.indexOf(me) < 0) rankHtml += '<div class="rank-line">…</div>' + line(me);
    function duoMate(r) { return G.Duo.active && G.Duo.mates.some((m) => m.name === r.name) ? ' <small style="color:#7fe0ff">(coéquipier)</small>' : ''; }
    const msgs = ['Tu feras mieux la prochaine fois !', 'Pas mal du tout !', 'Presque… si près du but !', 'Belle partie !'];
    const sub = G.Match.rumble ? (res.win ? 'Ton équipe gagne ' : 'Défaite ') + G.Match.teamScore[G.player.team || 0] + ' – ' + G.Match.teamScore[1 - (G.player.team || 0)] + ' !' : res.win ? (G.Duo.active ? 'Ton équipe a battu ' + (Math.ceil(G.Match.total / G.Duo.size) - 1) + ' équipes adverses !' : 'Tu as survécu à ' + (G.Match.total - 1) + ' adversaires !') : res.place <= 5 ? msgs[2] : res.place <= 15 ? msgs[3] : res.place <= 30 ? msgs[1] : msgs[0];
    el.innerHTML = `<div class="res-wrap">
      <div class="res-title">${G.Match.rumble ? `<div class="rp fn">${res.win ? 'VICTOIRE' : 'DÉFAITE'}</div><div class="rt fn">ÉQUIPE CONTRE ÉQUIPE</div>` : res.win ? `<div class="rp fn">${res.crowned ? '👑 #1' : '#1'}</div><div class="rt fn">${res.crowned ? 'VICTOIRE COURONNÉE' : 'VICTOIRE ROYALE'}</div>` : `<div class="rp fn">#${res.place}</div><div class="rt fn">${res.place <= 10 ? 'TOP ' + (res.place <= 5 ? 5 : 10) : 'ÉLIMINÉ'}</div>`}<div class="rs">${sub}</div></div>
      <div>
        <div class="res-box"><h3 class="fn">STATISTIQUES DE LA PARTIE</h3><div class="res-stats">
          ${stat(res.kills, 'Éliminations')}${stat(res.damage, 'Dégâts infligés')}${stat(res.mats, 'Matériaux récoltés')}
          ${stat(res.chests, 'Coffres ouverts')}${stat(res.builds, 'Constructions')}${stat(fmt(res.time), 'Temps de survie')}
        </div>${G.Aug && G.Aug.owned.length ? `<div class="res-augs">${G.Aug.owned.map((id) => { const a = G.Aug.LIST.find((x) => x.id === id); return a ? `<span class="ag-chip"><i>${a.ico}</i>${a.name}</span>` : ''; }).join('')}</div>` : ''}</div>
        <div class="res-box" style="margin-top:12px"><h3 class="fn">EXPÉRIENCE</h3><div id="xp-lines"></div><div class="xp-total fn"><span>TOTAL</span><span style="color:#ffd83a">+${res.total} XP</span></div>
          <div class="xpbar" style="height:14px;margin-top:8px"><div id="res-xpbar" style="width:0%"></div></div><div class="sub" id="res-lvl">Niveau ${res.levelBefore}</div><div id="res-lvlup"></div>${res.vbucks > 0 ? `<div class="vb-gain"><span class="vb">V</span>+${res.vbucks} V-Bucks</div>` : ''}<div class="unlocks" id="res-unlocks"></div></div>
      </div>
      <div class="res-box"><h3 class="fn">CLASSEMENT</h3>${rankHtml}${res.ranked ? rankedHTML(res.ranked) : ''}</div>
      <div class="res-btns"><button class="btn big" id="res-continue">Continuer</button><button class="btn" id="res-again">Rejouer</button>${!res.win && G.Match.alive > 1 ? '<button class="btn" id="res-watch">Regarder la fin</button>' : ''}</div>
    </div>`;
    function rankedHTML(r) {
      const R = G.Ranked;
      return `<div class="rk-res"><h3 class="fn">PROGRESSION CLASSÉE</h3><div class="rk-row">${R.badge(r.to, 54)}<div class="rk-info"><div class="rk-name fn" style="color:${r.to.color}">${r.to.name}</div>
        <div class="rk-bar"><div id="rk-fill" style="width:${(r.from.floor === r.to.floor ? r.from.prog : r.promoted ? 0 : 1) * 100}%;background:${r.to.color}"></div></div>
        <div class="rk-pts"><span>${r.after} pts</span><span class="${r.delta >= 0 ? 'up' : 'down'}">${r.delta >= 0 ? '+' : ''}${r.delta}</span></div></div></div>
        ${r.lines.map((l) => `<div class="xp-line" style="animation-delay:0.6s"><span>${esc(l[0])}</span><b class="${l[1] >= 0 ? '' : 'neg'}">${l[1] >= 0 ? '+' : ''}${l[1]}</b></div>`).join('')}
        ${r.promoted ? `<div class="lvl-up fn" style="color:${r.to.color}">PROMOTION : ${r.to.name.toUpperCase()} !</div>` : r.demoted ? '<div class="sub">Rétrogradation…</div>' : ''}</div>`;
    }
    if (res.ranked) setTimeout(() => { const f = document.getElementById('rk-fill'); if (f) { f.style.transition = 'width 1.2s ease-out'; f.style.width = (res.ranked.to.prog * 100) + '%'; } if (res.ranked.promoted) G.Audio.play('levelup'); }, 900);
    // lignes d'XP animées
    const box = document.getElementById('xp-lines');
    res.xp.forEach((x, i) => { const d = document.createElement('div'); d.className = 'xp-line'; d.style.animationDelay = (0.3 + i * 0.18) + 's'; d.innerHTML = `<span>${esc(x[0])}</span><b>+${x[1]}</b>`; box.appendChild(d); });
    // barre de niveau
    const lv0 = res.levelBefore, lv1 = res.levelAfter;
    const bar = document.getElementById('res-xpbar');
    const endPct = G.Store.data.xp / G.Store.XP_PER_LEVEL * 100;
    let cur = lv0;
    const delay = 400 + res.xp.length * 180;
    setTimeout(function step() {
      if (cur < lv1) {
        bar.style.transition = 'width 0.5s'; bar.style.width = '100%';
        setTimeout(() => { cur++; bar.style.transition = 'none'; bar.style.width = '0%'; document.getElementById('res-lvl').textContent = 'Niveau ' + cur; document.getElementById('res-lvlup').innerHTML = `<div class="lvl-up fn">NIVEAU ${cur} !</div>`; G.Audio.play('levelup'); setTimeout(step, 250); }, 550);
      } else { bar.style.transition = 'width 0.6s'; bar.style.width = endPct + '%'; showUnlocks(); }
    }, delay);
    function showUnlocks() {
      if (!res.unlocked || !res.unlocked.length) return;
      G.Audio.play('unlock');
      document.getElementById('res-unlocks').innerHTML = '<div class="fn" style="width:100%;color:#7dff6a">NOUVEAUX OBJETS DÉBLOQUÉS !</div>' + res.unlocked.map((id) => cardHTML(C.items[id], { noLock: true })).join('');
    }
    document.getElementById('res-continue').onclick = () => { G.Audio.play('ui_click'); el.classList.add('hidden'); MN.clearConfetti(); G.Match.leave(); };
    document.getElementById('res-again').onclick = () => { G.Audio.play('ui_play'); el.classList.add('hidden'); MN.clearConfetti(); G.Match.leave(); MN.startMatchmaking(); };
    const w = document.getElementById('res-watch');
    if (w) w.onclick = () => { G.Audio.play('ui_click'); el.classList.add('hidden'); MN.screen = null; G.HUD.show(true); G.Audio.stopMusic(0.5); G.Input.requestLock(); };
    if (res.win) MN.confetti();
  };
  MN.confetti = function () {
    MN.clearConfetti();
    for (let i = 0; i < 120; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = U.pick(['#ffd83a', '#ff5a8a', '#5ad8ff', '#7dff6a', '#b85cff', '#ffffff']);
      c.style.animationDuration = U.rand(2.5, 6) + 's';
      c.style.animationDelay = U.rand(0, 3) + 's';
      document.body.appendChild(c);
      (MN.confs = MN.confs || []).push(c);
    }
  };
  MN.clearConfetti = function () { if (MN.confs) { MN.confs.forEach((c) => c.remove()); MN.confs = []; } };

  MN.onResize = function () { if (MN.lobbyCam) { MN.lobbyCam.aspect = window.innerWidth / window.innerHeight; MN.lobbyCam.updateProjectionMatrix(); } };
})();
