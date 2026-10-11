// ============================================================
//  Textures dessinées en canvas (aucun fichier externe)
// ============================================================
(function () {
  const T = { cache: {} };
  G.Tex = T;
  const rng = G.U.RNG(1337);
  const R = (a, b) => a + (b - a) * rng();

  function mk(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    return c;
  }
  T.canvas = mk;

  T.toTexture = function (canvas, opts) {
    opts = opts || {};
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = G.renderer ? Math.min(8, G.renderer.capabilities.getMaxAnisotropy()) : 4;
    if (opts.nearest) { t.magFilter = THREE.NearestFilter; }
    t.needsUpdate = true;
    return t;
  };

  function noiseFill(ctx, w, h, base, amp, size) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * amp;
      d[i] = G.U.clamp(d[i] + n, 0, 255); d[i + 1] = G.U.clamp(d[i + 1] + n, 0, 255); d[i + 2] = G.U.clamp(d[i + 2] + n, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  }
  T.noiseFill = noiseFill;

  function blotches(ctx, w, h, n, rmin, rmax, colors, alpha) {
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = alpha * R(0.4, 1);
      ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
      const x = R(0, w), y = R(0, h), r = R(rmin, rmax);
      for (let dx = -w; dx <= w; dx += w) for (let dy = -h; dy <= h; dy += h) {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  const defs = {};

  // ---------- Terrain : texture de détail (gris moyen ≈ 1.0 après modulation) ----------
  defs.terrainDetail = () => {
    const c = mk(512, 512), x = c.getContext('2d');
    x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 512);
    blotches(x, 512, 512, 400, 4, 18, ['#707070', '#909090', '#787878', '#888888'], 0.35);
    // brins d'herbe
    for (let i = 0; i < 9000; i++) {
      const px = R(0, 512), py = R(0, 512), l = R(3, 9);
      const v = Math.floor(R(95, 170));
      x.strokeStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.lineWidth = R(0.8, 1.6);
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + R(-2, 2), py - l); x.stroke();
    }
    noiseFill(x, 512, 512, 0, 18);
    return T.toTexture(c, { linear: true });
  };
  defs.terrainMacro = () => {
    const c = mk(256, 256), x = c.getContext('2d');
    x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
    blotches(x, 256, 256, 120, 10, 40, ['#6a6a6a', '#959595', '#777777', '#8c8c8c'], 0.3);
    return T.toTexture(c, { linear: true });
  };

  // ---------- Matériaux de construction du joueur ----------
  defs.buildWood = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#b9824a'; x.fillRect(0, 0, S, S);
    // planches verticales
    const n = 6, pw = S / n;
    for (let i = 0; i < n; i++) {
      const base = [185 + R(-15, 15), 128 + R(-12, 12), 72 + R(-10, 10)];
      x.fillStyle = G.U.rgbStr(base[0], base[1], base[2]);
      x.fillRect(i * pw + 1, 0, pw - 2, S);
      // veinage
      x.strokeStyle = 'rgba(90,50,20,0.35)'; x.lineWidth = 1;
      for (let k = 0; k < 7; k++) {
        const ox = i * pw + R(4, pw - 4);
        x.beginPath(); x.moveTo(ox, 0);
        for (let y = 0; y <= S; y += 16) x.lineTo(ox + Math.sin(y * 0.05 + k) * 2, y);
        x.stroke();
      }
      // noeuds
      if (rng() < 0.6) { x.fillStyle = 'rgba(80,40,15,0.6)'; x.beginPath(); x.ellipse(i * pw + pw / 2, R(20, S - 20), 4, 7, 0, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = 'rgba(60,30,10,0.8)'; x.fillRect(i * pw, 0, 2, S);
    }
    // cadre + traverse en Z (look Fortnite)
    x.fillStyle = '#7a4a22';
    x.fillRect(0, 0, S, 18); x.fillRect(0, S - 18, S, 18); x.fillRect(0, 0, 18, S); x.fillRect(S - 18, 0, 18, S);
    x.save(); x.translate(S / 2, S / 2); x.rotate(-Math.atan2(S - 36, S - 36)); x.fillRect(-S * 0.7, -9, S * 1.4, 18); x.restore();
    x.fillStyle = 'rgba(255,220,160,0.25)'; x.fillRect(0, 0, S, 4); x.fillRect(0, 0, 4, S);
    // clous
    x.fillStyle = '#3a3a3a';
    [[9, 9], [S - 9, 9], [9, S - 9], [S - 9, S - 9], [S / 2, 9], [S / 2, S - 9], [9, S / 2], [S - 9, S / 2]].forEach((p) => { x.beginPath(); x.arc(p[0], p[1], 3, 0, 7); x.fill(); });
    noiseFill(x, S, S, 0, 14);
    return T.toTexture(c);
  };
  defs.buildStone = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#6d6a66'; x.fillRect(0, 0, S, S);
    const rows = 5, rh = S / rows;
    for (let r = 0; r < rows; r++) {
      let px = r % 2 ? -R(20, 40) : 0;
      while (px < S) {
        const w = R(45, 80);
        const v = R(135, 175);
        x.fillStyle = G.U.rgbStr(v, v - 4, v - 10);
        x.beginPath();
        const inset = 3;
        x.roundRect ? x.roundRect(px + inset, r * rh + inset, w - inset * 2, rh - inset * 2, 6) : x.rect(px + inset, r * rh + inset, w - inset * 2, rh - inset * 2);
        x.fill();
        x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(px + inset, r * rh + inset, w - inset * 2, 4);
        x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(px + inset, r * rh + rh - inset - 4, w - inset * 2, 4);
        px += w;
      }
    }
    x.strokeStyle = '#4a4744'; x.lineWidth = 10; x.strokeRect(5, 5, S - 10, S - 10);
    noiseFill(x, S, S, 0, 22);
    return T.toTexture(c);
  };
  defs.buildMetal = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, S, 0);
    for (let i = 0; i <= 16; i++) g.addColorStop(i / 16, i % 2 ? '#8d949b' : '#b8bec4');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // cadre épais
    x.fillStyle = '#5d646b';
    x.fillRect(0, 0, S, 20); x.fillRect(0, S - 20, S, 20); x.fillRect(0, 0, 20, S); x.fillRect(S - 20, 0, 20, S);
    x.fillRect(0, S / 2 - 8, S, 16);
    x.fillStyle = '#9aa1a8'; x.fillRect(0, 0, S, 4); x.fillRect(0, S / 2 - 8, S, 3);
    // rivets
    x.fillStyle = '#d6dadf';
    for (let i = 0; i < 8; i++) { const p = 14 + i * (S - 28) / 7; [[p, 10], [p, S - 10], [p, S / 2], [10, p], [S - 10, p]].forEach((q) => { x.beginPath(); x.arc(q[0], q[1], 3, 0, 7); x.fill(); }); }
    // rouille
    blotches(x, S, S, 20, 3, 12, ['rgba(140,80,40,0.5)', 'rgba(110,60,30,0.4)'], 0.4);
    noiseFill(x, S, S, 0, 12);
    return T.toTexture(c);
  };

  // ---------- Bâtiments (texture en coordonnées monde, teintée par instance) ----------
  defs.siding = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, S, S);
    const n = 8, h = S / n;
    for (let i = 0; i < n; i++) {
      const gr = x.createLinearGradient(0, i * h, 0, i * h + h);
      gr.addColorStop(0, '#f4f4f4'); gr.addColorStop(0.85, '#d8d8d8'); gr.addColorStop(1, '#a8a8a8');
      x.fillStyle = gr; x.fillRect(0, i * h, S, h);
    }
    noiseFill(x, S, S, 0, 8);
    return T.toTexture(c);
  };
  defs.plaster = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#e6e2dc'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, 60, 5, 30, ['#dcd7cf', '#efece6', '#d2cdc5'], 0.35);
    noiseFill(x, S, S, 0, 12);
    return T.toTexture(c);
  };
  defs.brick = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#b8b0a8'; x.fillRect(0, 0, S, S);
    const rows = 8, rh = S / rows, bw = S / 4;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let b = -1; b < 5; b++) {
        const v = R(-18, 18);
        x.fillStyle = G.U.rgbStr(178 + v, 82 + v * 0.6, 60 + v * 0.4);
        x.fillRect(b * bw + off + 2, r * rh + 2, bw - 4, rh - 4);
        x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(b * bw + off + 2, r * rh + 2, bw - 4, 3);
      }
    }
    noiseFill(x, S, S, 0, 18);
    return T.toTexture(c);
  };
  defs.stoneWall = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#7a776f'; x.fillRect(0, 0, S, S);
    const rows = 4, rh = S / rows;
    for (let r = 0; r < rows; r++) {
      let px = r % 2 ? -R(30, 50) : -R(0, 20);
      while (px < S) {
        const w = R(55, 95), v = R(165, 205);
        x.fillStyle = G.U.rgbStr(v, v - 2, v - 8);
        x.beginPath();
        if (x.roundRect) x.roundRect(px + 3, r * rh + 3, w - 6, rh - 6, 10); else x.rect(px + 3, r * rh + 3, w - 6, rh - 6);
        x.fill();
        x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(px + 3, r * rh + rh - 10, w - 6, 7);
        px += w;
      }
    }
    blotches(x, S, S, 30, 4, 14, ['rgba(80,110,60,0.5)'], 0.3);
    noiseFill(x, S, S, 0, 24);
    return T.toTexture(c);
  };
  defs.concrete = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#b4b2ad'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, 80, 4, 24, ['#a9a7a2', '#bdbbb6', '#a0a09c'], 0.4);
    x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 2; x.strokeRect(0, 0, S, S);
    x.fillStyle = 'rgba(0,0,0,0.2)'; [[64, 64], [192, 64], [64, 192], [192, 192]].forEach((p) => { x.beginPath(); x.arc(p[0], p[1], 3, 0, 7); x.fill(); });
    noiseFill(x, S, S, 0, 14);
    return T.toTexture(c);
  };
  defs.metalSheet = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, S, 0);
    for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, i % 2 ? '#9ea4a8' : '#c9ced2');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    blotches(x, S, S, 25, 4, 18, ['rgba(150,90,50,0.55)', 'rgba(120,70,40,0.5)'], 0.35);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, S - 3, S, 3);
    noiseFill(x, S, S, 0, 10);
    return T.toTexture(c);
  };
  defs.roofTiles = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, S, S);
    const rows = 8, rh = S / rows, tw = S / 8;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? tw / 2 : 0;
      for (let b = -1; b < 9; b++) {
        const v = R(-20, 20);
        const gr = x.createLinearGradient(0, r * rh, 0, r * rh + rh);
        gr.addColorStop(0, G.U.rgbStr(225 + v, 225 + v, 225 + v)); gr.addColorStop(1, G.U.rgbStr(165 + v, 165 + v, 165 + v));
        x.fillStyle = gr;
        x.beginPath();
        const px = b * tw + off;
        x.moveTo(px + 1, r * rh); x.lineTo(px + tw - 1, r * rh); x.lineTo(px + tw - 1, r * rh + rh * 0.7);
        x.quadraticCurveTo(px + tw / 2, r * rh + rh + 3, px + 1, r * rh + rh * 0.7); x.fill();
      }
    }
    noiseFill(x, S, S, 0, 10);
    return T.toTexture(c);
  };
  defs.woodFloor = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#a57346'; x.fillRect(0, 0, S, S);
    const n = 8, h = S / n;
    for (let i = 0; i < n; i++) {
      let px = i % 2 ? -R(20, 80) : 0;
      while (px < S) {
        const w = R(80, 160), v = R(-18, 18);
        x.fillStyle = G.U.rgbStr(170 + v, 118 + v * 0.8, 72 + v * 0.6);
        x.fillRect(px + 1, i * h + 1, w - 2, h - 2);
        x.strokeStyle = 'rgba(80,45,20,0.25)';
        for (let k = 0; k < 3; k++) { x.beginPath(); const yy = i * h + R(4, h - 4); x.moveTo(px, yy); x.lineTo(px + w, yy + R(-2, 2)); x.stroke(); }
        px += w;
      }
    }
    noiseFill(x, S, S, 0, 10);
    return T.toTexture(c);
  };
  defs.planks = () => { // bois brut (granges, cabanes) - planches verticales
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, S, S);
    const n = 8, w = S / n;
    for (let i = 0; i < n; i++) {
      const v = R(-25, 20);
      x.fillStyle = G.U.rgbStr(215 + v, 215 + v, 215 + v); x.fillRect(i * w + 1, 0, w - 2, S);
      x.strokeStyle = 'rgba(0,0,0,0.12)';
      for (let k = 0; k < 4; k++) { const ox = i * w + R(3, w - 3); x.beginPath(); x.moveTo(ox, 0); x.lineTo(ox + R(-3, 3), S); x.stroke(); }
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(i * w, 0, 2, S);
    }
    noiseFill(x, S, S, 0, 16);
    return T.toTexture(c);
  };
  defs.tiles = () => {
    const S = 128, c = mk(S, S), x = c.getContext('2d');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      x.fillStyle = (i + j) % 2 ? '#f2f2f2' : '#c8c8c8';
      x.fillRect(i * 32, j * 32, 32, 32);
    }
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, S); x.moveTo(0, i * 32); x.lineTo(S, i * 32); x.stroke(); }
    noiseFill(x, S, S, 0, 6);
    return T.toTexture(c);
  };
  defs.fabric = () => {
    const S = 128, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 2) { x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(i, 0, 1, S); x.fillRect(0, i, S, 1); }
    noiseFill(x, S, S, 0, 14);
    return T.toTexture(c);
  };
  defs.asphalt = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#4a4b4e'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, 150, 1, 4, ['#5a5b5e', '#3e3f42', '#666769'], 0.6);
    noiseFill(x, S, S, 0, 20);
    return T.toTexture(c);
  };
  defs.bark = () => {
    const S = 128, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#6b4a2e'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      x.strokeStyle = rng() < 0.5 ? 'rgba(40,25,12,0.6)' : 'rgba(140,105,70,0.35)'; x.lineWidth = R(1, 3);
      const px = R(0, S); x.beginPath(); x.moveTo(px, 0);
      for (let y = 0; y <= S; y += 8) x.lineTo(px + Math.sin(y * 0.1 + i) * 3, y);
      x.stroke();
    }
    noiseFill(x, S, S, 0, 16);
    return T.toTexture(c);
  };
  defs.leaves = () => {
    const S = 128, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#b8b8b8'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, 160, 3, 9, ['#8f8f8f', '#d2d2d2', '#a6a6a6', '#e0e0e0'], 0.6);
    noiseFill(x, S, S, 0, 16);
    return T.toTexture(c);
  };
  defs.rock = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#b0b0b0'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, 120, 4, 26, ['#9a9a9a', '#c4c4c4', '#8a8a8a', '#bababa'], 0.45);
    for (let i = 0; i < 30; i++) { x.strokeStyle = 'rgba(60,60,60,0.35)'; x.lineWidth = R(1, 2); x.beginPath(); let px = R(0, S), py = R(0, S); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += R(-20, 20); py += R(-20, 20); x.lineTo(px, py); } x.stroke(); }
    noiseFill(x, S, S, 0, 22);
    return T.toTexture(c);
  };
  defs.hay = () => {
    const S = 128, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#d9b45a'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 700; i++) { x.strokeStyle = rng() < 0.5 ? 'rgba(160,120,40,0.6)' : 'rgba(250,220,130,0.6)'; x.lineWidth = 1; const px = R(0, S), py = R(0, S); x.beginPath(); x.moveTo(px, py); x.lineTo(px + R(-10, 10), py + R(-3, 3)); x.stroke(); }
    return T.toTexture(c);
  };
  defs.container = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#b0b0b0' : '#dadada'; x.fillRect(i * 16, 0, 16, S); }
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, S, 6); x.fillRect(0, S - 6, S, 6);
    blotches(x, S, S, 12, 3, 10, ['rgba(120,70,40,0.5)'], 0.35);
    return T.toTexture(c);
  };
  defs.snow = () => {
    const S = 128, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#f2f6fa'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, 50, 3, 12, ['#e2eaf2', '#ffffff'], 0.4);
    return T.toTexture(c);
  };
  defs.wallpaper = () => {
    const S = 128, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#e8e0d0'; x.fillRect(0, 0, S, S);
    x.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < S; i += 16) x.fillRect(i, 0, 6, S);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = 'rgba(160,110,90,0.18)'; x.beginPath(); x.arc(i * 16 + 11, j * 16 + 8, 2.5, 0, 7); x.fill(); }
    return T.toTexture(c);
  };

  // ---------- divers ----------
  defs.door = () => {
    const c = mk(128, 256), x = c.getContext('2d');
    x.fillStyle = '#8a5a32'; x.fillRect(0, 0, 128, 256);
    x.strokeStyle = '#5e3b1e'; x.lineWidth = 6;
    x.strokeRect(14, 14, 100, 100); x.strokeRect(14, 134, 100, 108);
    x.fillStyle = '#a57346'; x.fillRect(20, 20, 88, 88); x.fillRect(20, 140, 88, 96);
    x.fillStyle = '#e0c060'; x.beginPath(); x.arc(106, 132, 6, 0, 7); x.fill();
    noiseFill(x, 128, 256, 0, 10);
    return T.toTexture(c, { clamp: true });
  };
  defs.clock = () => {
    const c = mk(256, 256), x = c.getContext('2d');
    x.fillStyle = '#3a3226'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#f4ecd8'; x.beginPath(); x.arc(128, 128, 110, 0, 7); x.fill();
    x.strokeStyle = '#b08d3a'; x.lineWidth = 10; x.stroke();
    x.fillStyle = '#222'; x.font = 'bold 26px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const rom = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; x.fillText(rom[i], 128 + Math.cos(a) * 84, 128 + Math.sin(a) * 84); }
    x.strokeStyle = '#111'; x.lineWidth = 8; x.beginPath(); x.moveTo(128, 128); x.lineTo(128, 60); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.moveTo(128, 128); x.lineTo(180, 150); x.stroke();
    return T.toTexture(c, { clamp: true });
  };
  defs.glow = () => { // sprite radial
    const c = mk(128, 128), x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return T.toTexture(c, { clamp: true });
  };
  defs.spark = () => {
    const c = mk(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,255,0.9)'); g.addColorStop(0.4, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return T.toTexture(c, { clamp: true });
  };
  defs.smoke = () => {
    const c = mk(128, 128), x = c.getContext('2d');
    for (let i = 0; i < 18; i++) {
      const px = 64 + R(-26, 26), py = 64 + R(-26, 26), r = R(18, 34);
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    }
    return T.toTexture(c, { clamp: true });
  };
  defs.muzzle = () => {
    const c = mk(128, 128), x = c.getContext('2d');
    x.translate(64, 64);
    for (let i = 0; i < 7; i++) {
      x.rotate(Math.PI * 2 / 7 + R(-0.2, 0.2));
      const g = x.createLinearGradient(0, 0, 60, 0);
      g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.5, 'rgba(255,190,60,0.8)'); g.addColorStop(1, 'rgba(255,120,0,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, -7); x.lineTo(R(40, 62), 0); x.lineTo(0, 7); x.fill();
    }
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 26); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(1, 'rgba(255,200,80,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 26, 0, 7); x.fill();
    return T.toTexture(c, { clamp: true });
  };
  defs.ring = () => {
    const c = mk(128, 128), x = c.getContext('2d');
    x.strokeStyle = 'rgba(255,255,255,1)'; x.lineWidth = 10; x.beginPath(); x.arc(64, 64, 50, 0, 7); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.4)'; x.lineWidth = 20; x.beginPath(); x.arc(64, 64, 50, 0, 7); x.stroke();
    return T.toTexture(c, { clamp: true });
  };
  defs.weakspot = () => {
    const c = mk(128, 128), x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 10, 64, 64, 62);
    g.addColorStop(0, 'rgba(120,230,255,0.9)'); g.addColorStop(0.35, 'rgba(40,160,255,0.85)'); g.addColorStop(0.7, 'rgba(20,110,255,0.5)'); g.addColorStop(1, 'rgba(0,80,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 34, 0, 7); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(64, 64, 10, 0, 7); x.fill();
    return T.toTexture(c, { clamp: true });
  };
  defs.beam = () => { // faisceau vertical de rareté
    const c = mk(32, 256), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.4, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 256);
    const h = x.createLinearGradient(0, 0, 32, 0);
    h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = h; x.fillRect(0, 0, 32, 256);
    return T.toTexture(c, { clamp: true });
  };
  defs.storm = () => {
    const S = 256, c = mk(S, S), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, 200, 6, 30, ['rgba(255,255,255,0.5)', 'rgba(200,200,200,0.4)'], 0.3);
    return T.toTexture(c, { linear: true });
  };
  defs.flag = () => {
    const c = mk(128, 64), x = c.getContext('2d');
    x.fillStyle = '#1e5aa8'; x.fillRect(0, 0, 128, 64);
    x.fillStyle = '#f4d03f'; x.beginPath(); x.moveTo(64, 10); x.lineTo(74, 32); x.lineTo(64, 54); x.lineTo(54, 32); x.fill();
    return T.toTexture(c, { clamp: true });
  };

  // Enseigne avec texte
  T.sign = function (text, bg, fg, w, h) {
    const key = 'sign_' + text + bg + fg;
    if (T.cache[key]) return T.cache[key];
    w = w || 512; h = h || 128;
    const c = mk(w, h), x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = h * 0.62;
    x.font = '900 ' + fs + 'px Impact, "Arial Black", sans-serif';
    while (x.measureText(text).width > w * 0.9 && fs > 10) { fs -= 2; x.font = '900 ' + fs + 'px Impact, "Arial Black", sans-serif'; }
    x.fillText(text, w / 2, h / 2 + 2);
    const t = T.toTexture(c, { clamp: true });
    T.cache[key] = t;
    return t;
  };

  T.get = function (name) {
    if (!T.cache[name]) {
      if (!defs[name]) { console.warn('texture inconnue', name); return null; }
      T.cache[name] = defs[name]();
    }
    return T.cache[name];
  };
})();
