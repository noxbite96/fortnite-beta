// ============================================================
//  Point d'entrée : création du rendu, génération du monde, boucle
// ============================================================
(function () {
  const U = G.U;
  const TIPS = [
    'Astuce : la pioche frappe deux fois plus fort sur le point faible bleu.',
    'Astuce : le métal est le plus solide, mais il se construit plus lentement.',
    'Astuce : appuyez sur G pour modifier vos constructions (fenêtre, porte...).',
    'Astuce : la tempête fait de plus en plus mal à chaque phase.',
    'Astuce : les coffres dorés font un bruit caractéristique. Écoutez bien !',
    'Astuce : touchez la tête pour des dégâts critiques (chiffres jaunes).',
    'Astuce : touche M pour ouvrir la carte et placer un marqueur.',
    'Astuce : B pour ouvrir la roue des emotes.',
    'Astuce : accroupissez-vous en sprintant pour glisser, encore plus vite en descente.',
    'Astuce : sautez contre un rebord pour l’escalader.',
    'Astuce : les établis d’amélioration font passer une arme à la rareté supérieure.',
    'Astuce : le Roi du Château Royal garde une arme MYTHIQUE. Attention à ses gardes !',
    'Astuce : en duo, maintenez E pour réanimer votre coéquipier à terre.',
    'Astuce : rapportez la carte de renfort d’un coéquipier à une camionnette pour le ramener.',
    'Astuce : cachez-vous dans une benne ou une meule de foin, les ennemis ne vous verront pas.',
    'Astuce : cherchez les remous sur l’eau pour pêcher des Poissons Flopper.',
    'Astuce : clic molette (ou V) pour placer un marqueur à l’endroit visé.',
    'Astuce : dans le bus, appuyez sur B pour remercier le chauffeur !',
    'Astuce : la Bulle de bouclier arrête les balles pendant 12 secondes.',
    'Astuce : parlez aux personnages (E) : ils vendent des armes contre des lingots d’or et proposent des quêtes.',
    'Astuce : engagez un personnage comme garde du corps, il vous suivra et se battra pour vous.',
    'Astuce : les panneaux « CONTRATS » vous donnent une cible à éliminer contre 300 lingots.',
    'Astuce : utilisez une carte au trésor pour révéler un trésor enfoui plein de butin légendaire.',
    'Astuce : tirez sur les barils rouges quand des ennemis sont à côté… BOUM !',
    'Astuce : cassez un baril de Slurp violet pour vous soigner.',
    'Astuce : maintenez le clic avec un arc pour bander la corde, relâchez pour tirer.',
    'Astuce : avec le sabre lumineux, clic droit pour une ruée en avant.',
    'Astuce : dans un hélicoptère, Espace pour monter et Ctrl pour descendre.',
    'Astuce : gagnez une partie pour commencer la suivante avec la Couronne de la victoire !',
    'Astuce : touche P pour la caméra libre, idéale pour filmer de beaux plans.',
    'Astuce : peu après l\'atterrissage puis pendant la partie, appuyez sur U pour choisir une AUGMENTATION (Siphon, Mains agiles, Aérien…).',
    'Astuce : l\'augmentation « Radar à coffres » affiche les coffres proches sur la mini-carte.',
    'Astuce : 12 NAINS DE JARDIN sont cachés près des lieux nommés. Quand vous les entendez ricaner, vous brûlez !',
    'Astuce : attention aux REQUINS en pleine mer ! Restez dans un bateau… ou tirez sur leur aileron.',
    'Astuce : les POINTS CHAUDS (flamme orange sur la carte) ont tous leurs coffres et des DRONES DE BUTIN à abattre.',
    'Astuce : la REINE DES GLACES (Chalet du Pic) tire des flèches qui ralentissent. Battez-la pour son arc mythique et son médaillon !',
    'Astuce : le TEMPLE PERDU cache un coffre au sommet de sa pyramide… mais une meute de raptors le garde !',
    'Astuce : un éclat de lumière au loin ? C\'est la lunette d\'un sniper qui vous vise. Mettez-vous à couvert !',
    'Astuce : entrez dans une CABINE DE DÉGUISEMENT (cabine téléphonique rouge) et appuyez sur E pour changer de tenue en pleine partie.',
    'Astuce : si LE CUBE apparaît, suivez-le : après sa plongée, le Lac Butin fait rebondir tout le monde !',
    'Astuce : pendant certains orages, une TORNADE traverse l\'île : entrez dedans pour vous envoler, puis ouvrez le planeur !',
    'Astuce : chaque boss lâche son MÉDAILLON : il régénère votre bouclier, mais tout le monde vous voit sur la carte !',
    'Astuce : en kart, touche R pour changer de station de radio.',
    'Astuce : Oméga, le Colosse d’acier, garde un minigun mythique à l’Usine Rouillée.',
    'Astuce : dans un mécha, clic droit pour une salve de 10 missiles, Espace pour bondir et tout écraser.',
    'Astuce : si un OVNI passe au-dessus de vous, son rayon tracteur vous soulève !',
    'Astuce : avec 3 ballons, vous montez dans les airs. Touche C pour en éclater un.',
    'Astuce : les tourelles montées surchauffent : tirez par rafales.',
    'Astuce : en mode Zéro construction, votre surbouclier violet se recharge après 5 s sans dégâts.',
  ];
  G.TIPS = TIPS;

  G.loadStep = function (txt, pct) {
    const t = document.getElementById('load-text'), f = document.getElementById('load-fill');
    if (t) t.textContent = txt;
    if (f) f.style.width = pct + '%';
  };

  function initRenderer() {
    const q = G.Store.data.settings.quality;
    const canvas = document.getElementById('game-canvas');
    const r = new THREE.WebGLRenderer({ canvas, antialias: q >= 2, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(G.pixelRatioFor(q));
    r.setSize(window.innerWidth, window.innerHeight, false);
    r.shadowMap.enabled = !(new URLSearchParams(location.search).get('shadows') === '0');
    r.shadowMap.type = q >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    G.renderer = r;
    if (G.Post) G.Post.init(r);
    G.scene = new THREE.Scene();
    G.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 5000);
    window.addEventListener('resize', G.onResize);
  }
  G.pixelRatioFor = (q) => [0.7, 0.9, Math.min(window.devicePixelRatio, 1.25), Math.min(window.devicePixelRatio, 2)][q] || 1;
  G.onResize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    G.renderer.setSize(w, h, false);
    G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
    if (G.Menu && G.Menu.onResize) G.Menu.onResize();
  };
  G.applyGraphics = function () {
    const s = G.Store.data.settings;
    G.resScale = 1;
    G.renderer.setPixelRatio(G.pixelRatioFor(s.quality));
    G.renderer.setSize(window.innerWidth, window.innerHeight, false);
    G.Sky.setShadowQuality(s.quality);
    G.renderer.shadowMap.type = s.quality >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    G.Sky.setViewDistance([450, 650, 900, 1250][s.viewDist]);
    G.camera.far = [700, 900, 1300, 1700][s.viewDist] + 200;
    G.camera.updateProjectionMatrix();
    G.Veg.setGrassQuality(s.quality === 0 ? 0 : s.quality);
    if (G.Post) { G.Post.enabled = !!s.bloom && s.quality >= 1; G.Post.invalidate(); }
    G.scene.traverse((o) => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach((mm) => mm.needsUpdate = true); } });
  };

  // Génération du monde, étape par étape (laisse respirer l'interface)
  function generateWorld(done) {
    const steps = [
      ['Création du relief de l\'île…', 5, () => G.Terrain.generate()],
      ['Peinture du paysage…', 18, () => G.Terrain.buildColorMap()],
      ['Plantation des arbres…', 30, () => G.Veg.buildTypes()],
      ['Construction des lieux nommés…', 40, () => G.POI.generate()],
      ['Pousse de la forêt…', 55, () => G.Veg.generate()],
      ['Assemblage des bâtiments…', 68, () => G.Kits.finalize(G.scene)],
      ['Modelage du terrain…', 76, () => { G.Terrain.refreshColor(); G.Terrain.buildMesh(G.scene); G.Veg.captureColor(); }],
      ['Allumage du soleil…', 84, () => { G.Sky.init(G.scene, G.Store.data.settings.quality); G.Veg.initGrass(); }],
      ['Préparation des effets…', 90, () => { if (G.FX) G.FX.init(G.scene); if (G.Ambient) G.Ambient.init(G.scene); if (G.Weather) G.Weather.init(G.scene); }],
      ['Préparation des joueurs…', 95, () => { if (G.Game && G.Game.initWorld) G.Game.initWorld(); }],
    ];
    let i = 0;
    const tip = document.getElementById('load-tip');
    if (tip) tip.textContent = U.pick(TIPS);
    function next() {
      if (i >= steps.length) { G.loadStep('Prêt !', 100); setTimeout(done, 150); return; }
      const s = steps[i++];
      G.loadStep(s[0], s[1]);
      setTimeout(() => {
        const t0 = performance.now();
        try { s[2](); } catch (e) { console.error(e); G.loadStep('Erreur : ' + e.message, s[1]); throw e; }
        console.log(s[0], Math.round(performance.now() - t0) + ' ms');
        next();
      }, 30);
    }
    next();
  }

  G.clock = { last: 0, dt: 0, time: 0, fps: 60, frames: 0, acc: 0 };

  function loop(now) {
    requestAnimationFrame(loop);
    const c = G.clock;
    let dt = (now - c.last) / 1000;
    c.last = now;
    if (!(dt > 0)) dt = 0.016;
    dt = Math.min(dt, 0.05);
    c.dt = dt; c.time += dt;
    c.frames++; c.acc += dt;
    if (c.acc >= 0.5) { c.fps = Math.round(c.frames / c.acc); c.frames = 0; c.acc = 0; dynamicResolution(c.fps); }
    if (G.Game && G.Game.frame) G.Game.frame(dt);
    else debugFrame(dt);
    if (G.Server) G.Server.tick(dt);
    G.Input.endFrame();
  }

  // Résolution dynamique : vise 60 IPS en baissant légèrement la résolution si besoin
  let lowT = 0, highT = 0;
  G.resScale = 1;
  function dynamicResolution(fps) {
    const S = G.Store.data.settings;
    if (!S.dynRes || !G.Game || (G.Game.state !== 'playing' && G.Game.state !== 'warmup' && G.Game.state !== 'bus')) return;
    if (fps < 50) { lowT += 0.5; highT = 0; } else if (fps > 58) { highT += 0.5; lowT = 0; } else { lowT = highT = 0; }
    let changed = false;
    if (lowT >= 2 && G.resScale > 0.6) { G.resScale = Math.max(0.6, G.resScale - 0.1); lowT = 0; changed = true; }
    if (highT >= 6 && G.resScale < 1) { G.resScale = Math.min(1, G.resScale + 0.1); highT = 0; changed = true; }
    if (changed) { G.renderer.setPixelRatio(G.pixelRatioFor(S.quality) * G.resScale); G.renderer.setSize(window.innerWidth, window.innerHeight, false); }
    // réglage automatique (PC modestes) : si le jeu reste lent même en résolution réduite, on baisse la qualité d'un cran
    if (G.Game.state === 'playing' && !S.autoTuned) {
      autoT += 0.5; autoSum += fps; autoN++;
      if (autoT >= 20) {
        const avg = autoSum / autoN;
        if (avg < 38 && G.resScale <= 0.65 && S.quality > 0) {
          S.quality--; G.applyGraphics();
          if (G.HUD) G.HUD.notify('Qualité graphique ajustée automatiquement : ' + ['Basse', 'Moyenne', 'Élevée', 'Épique'][S.quality], 3);
          if (S.quality === 0) S.autoTuned = true;
        } else S.autoTuned = true;
        G.Store.save();
        autoT = 0; autoSum = 0; autoN = 0;
      }
    }
  }
  let autoT = 0, autoSum = 0, autoN = 0;
  G.dynamicResolution = dynamicResolution;

  // Caméra libre de débogage (si le jeu n'est pas chargé)
  const dbg = { yaw: 0, pitch: -0.3, pos: new THREE.Vector3(0, 60, 120) };
  function debugFrame(dt) {
    const I = G.Input;
    dbg.yaw -= I.mouse.dx * 0.003; dbg.pitch -= I.mouse.dy * 0.003;
    dbg.pitch = U.clamp(dbg.pitch, -1.5, 1.5);
    const sp = (I.isDown('ShiftLeft') ? 120 : 30) * dt;
    const fw = new THREE.Vector3(-Math.sin(dbg.yaw) * Math.cos(dbg.pitch), Math.sin(dbg.pitch), -Math.cos(dbg.yaw) * Math.cos(dbg.pitch));
    const rt = new THREE.Vector3(Math.cos(dbg.yaw), 0, -Math.sin(dbg.yaw));
    dbg.pos.addScaledVector(fw, I.forward() * sp).addScaledVector(rt, I.strafe() * sp);
    if (I.isDown('Space')) dbg.pos.y += sp; if (I.isDown('ControlLeft')) dbg.pos.y -= sp;
    G.camera.position.copy(dbg.pos);
    G.camera.rotation.set(dbg.pitch, dbg.yaw, 0, 'YXZ');
    if (G.Sky.sky) G.Sky.update(dt, G.camera.position, G.camera.position);
    G.World.update(dt);
    G.Veg.update(dt);
    G.Veg.updateGrass(dbg.pos.x, dbg.pos.z);
    G.renderer.render(G.scene, G.camera);
  }
  G.debugCam = dbg;

  window.addEventListener('load', () => {
    // Les comptes d'abord : la sauvegarde de partie se rattache à la session,
    // donc elle doit savoir qui est connecté avant d'être lue.
    G.Auth.init().then(() => {
    G.Store.load();
    // options de diagnostic dans l'adresse (?bloom=0&q=0)
    const qs = new URLSearchParams(location.search);
    if (qs.get('bloom') === '0') G.Store.data.settings.bloom = false;
    if (qs.get('q') != null) G.Store.data.settings.quality = +qs.get('q');
    initRenderer();
    G.canvasClick = () => { G.Audio.resume(); };
    document.addEventListener('mousedown', G.canvasClick);
    document.getElementById('game-canvas').addEventListener('click', () => {
      const st = G.Game && G.Game.state;
      if (st === 'warmup' || st === 'bus' || st === 'playing' || (st === 'ended' && !G.Match.endShown)) { if (!G.HUD.paused && !G.HUD.fullMapOpen) G.Input.requestLock(); }
    });
    const S = G.Store.data.settings;
    G.Audio.volumes = { master: S.volMaster, music: S.volMusic, sfx: S.volSfx };
    generateWorld(() => {
      G.applyGraphics();
      G.HUD.init();
      G.Menu.init();
      document.getElementById('loading').classList.add('hidden');
      if (G.Game && G.Game.start) G.Game.start();
      requestAnimationFrame((t) => { G.clock.last = t; loop(t); });
      // porte d'entrée : session ouverte, on saute l'écran de connexion.
      if (G.Auth.requireAuth() && !G.Auth.session()) G.AuthUI.show();
    });
    });
  });
})();
