// ============================================================
//  MODE CLASSÉ : rangs Bronze → Irréel, points gagnés selon le
//  classement et les éliminations, bots adaptés au rang
// ============================================================
(function () {
  const U = G.U;
  const R = {};
  G.Ranked = R;

  // 5 rangs à 3 divisions (100 points chacune), puis Élite, Champion, Irréel
  R.TIERS = [
    { name: 'Bronze', color: '#d08a4a', dark: '#6a3a18' },
    { name: 'Argent', color: '#c8d4e0', dark: '#5a6a7a' },
    { name: 'Or', color: '#ffc83a', dark: '#8a5a00' },
    { name: 'Platine', color: '#5ae0d0', dark: '#1a6a64' },
    { name: 'Diamant', color: '#6aa8ff', dark: '#1a3a8a' },
    { name: 'Élite', color: '#dfe6f0', dark: '#3a4458', min: 1500, span: 200 },
    { name: 'Champion', color: '#ff8a3a', dark: '#7a2a0a', min: 1700, span: 300 },
    { name: 'Irréel', color: '#d27aff', dark: '#4a1a7a', min: 2000, span: 0 },
  ];
  const ROMAN = ['I', 'II', 'III'];

  R.data = function () {
    const d = G.Store.data;
    if (!d.rank) d.rank = { pts: 0, best: 0, matches: 0 };
    return d.rank;
  };
  // Rang correspondant à un nombre de points
  R.info = function (pts) {
    pts = Math.max(0, Math.round(pts));
    if (pts < 1500) {
      const t = Math.floor(pts / 300), div = Math.floor((pts % 300) / 100);
      const tier = R.TIERS[t];
      return { tier: t, name: tier.name + ' ' + ROMAN[div], short: ROMAN[div], color: tier.color, dark: tier.dark, prog: (pts % 100) / 100, floor: t * 300 + div * 100, next: t * 300 + div * 100 + 100 };
    }
    for (let t = 7; t >= 5; t--) {
      const tier = R.TIERS[t];
      if (pts >= tier.min) return { tier: t, name: tier.name, short: '', color: tier.color, dark: tier.dark, prog: tier.span ? (pts - tier.min) / tier.span : 1, floor: tier.min, next: tier.span ? tier.min + tier.span : null };
    }
    return null;
  };
  // Difficulté de base des bots selon le rang
  R.botDiff = function () { return [0, 1, 1, 2, 2, 3, 3, 3][R.info(R.data().pts).tier]; };

  // Calcul des points d'une partie
  R.compute = function (place, total, kills, win) {
    const info = R.info(R.data().pts);
    const pct = place / Math.max(2, total);
    let base = win ? 100 : pct <= 0.05 ? 60 : pct <= 0.1 ? 45 : pct <= 0.25 ? 28 : pct <= 0.5 ? 12 : -12;
    const kp = Math.min(8, kills) * 10;
    const gainMul = [1.3, 1.15, 1, 0.9, 0.8, 0.7, 0.6, 0.5][info.tier];
    const lossMul = [0, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2][info.tier];
    const lines = [];
    let delta;
    if (base >= 0) { delta = Math.round((base + kp) * gainMul); lines.push(['Classement #' + place, Math.round(base * gainMul)]); }
    else { delta = Math.round(base * lossMul + kp * gainMul); lines.push(['Classement #' + place, Math.round(base * lossMul)]); }
    if (kills) lines.push(['Éliminations × ' + Math.min(8, kills), Math.round(kp * gainMul)]);
    return { delta, lines };
  };
  // Applique le résultat et renvoie les infos pour l'écran de fin
  R.apply = function (res, total) {
    const d = R.data();
    const before = d.pts;
    const c = R.compute(res.place, total, res.kills, res.win);
    d.pts = Math.max(0, before + c.delta);
    d.best = Math.max(d.best || 0, d.pts);
    d.matches = (d.matches || 0) + 1;
    const i0 = R.info(before), i1 = R.info(d.pts);
    return { before, after: d.pts, delta: d.pts - before, lines: c.lines, from: i0, to: i1, promoted: i1.floor > i0.floor, demoted: i1.floor < i0.floor };
  };

  // Insigne (HTML) : hexagone coloré avec la division
  R.badge = function (info, size) {
    size = size || 46;
    return `<div class="rk-badge" style="width:${size}px;height:${size * 1.1}px;--rc:${info.color};--rd:${info.dark}"><span class="fn" style="font-size:${Math.round(size * 0.36)}px">${info.short || (info.tier === 7 ? '★' : '◆')}</span></div>`;
  };
})();
