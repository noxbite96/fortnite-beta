// ============================================================
//  Audio : tous les sons sont synthétisés avec Web Audio
// ============================================================
(function () {
  const A = {
    ctx: null, master: null, musicBus: null, sfxBus: null, ready: false,
    listener: { x: 0, y: 0, z: 0, yaw: 0 },
    volumes: { master: 0.8, music: 0.5, sfx: 0.8 },
    loops: {},
    music: null,
    lastPlay: {},
  };
  G.Audio = A;

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    const c = A.ctx;
    A.master = c.createGain();
    A.comp = c.createDynamicsCompressor();
    A.comp.threshold.value = -14; A.comp.knee.value = 12; A.comp.ratio.value = 5;
    A.comp.attack.value = 0.003; A.comp.release.value = 0.2;
    A.master.connect(A.comp); A.comp.connect(c.destination);
    A.musicBus = c.createGain(); A.musicBus.connect(A.master);
    A.sfxBus = c.createGain(); A.sfxBus.connect(A.master);
    // Réverbe simple (convolution générée)
    A.reverb = c.createConvolver();
    A.reverb.buffer = makeImpulse(2.2, 2.5);
    A.reverbSend = c.createGain(); A.reverbSend.gain.value = 0.25;
    A.reverbSend.connect(A.reverb); A.reverb.connect(A.sfxBus);
    // Buffers de bruit
    const len = c.sampleRate * 2;
    A.noise = c.createBuffer(1, len, c.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.brown = c.createBuffer(1, len, c.sampleRate);
    const b = A.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; b[i] = last * 3.5; }
    A.applyVolumes();
    A.ready = true;
  };

  function makeImpulse(dur, decay) {
    const c = A.ctx, rate = c.sampleRate, len = Math.floor(rate * dur);
    const buf = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  A.resume = function () {
    if (!A.ctx) A.init();
    if (A.ctx && A.ctx.state !== 'running') A.ctx.resume();
  };

  A.setVolumes = function (m, mu, s) {
    A.volumes.master = m; A.volumes.music = mu; A.volumes.sfx = s;
    A.applyVolumes();
  };
  A.applyVolumes = function () {
    if (!A.ctx) return;
    A.master.gain.value = A.volumes.master;
    A.musicBus.gain.value = A.volumes.music * 0.55;
    A.sfxBus.gain.value = A.volumes.sfx;
  };

  A.setListener = function (x, y, z, yaw) {
    A.listener.x = x; A.listener.y = y; A.listener.z = z; A.listener.yaw = yaw;
  };

  // Calcule gain / pan / filtre pour une position 3D
  function spatial(pos, ref, maxD) {
    if (!pos) return { g: 1, pan: 0, lp: 20000, d: 0 };
    const L = A.listener;
    const dx = pos[0] - L.x, dy = pos[1] - L.y, dz = pos[2] - L.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > maxD) return null;
    let g = ref / (ref + Math.max(0, d - ref) * 1.0);
    g *= 1 - Math.pow(d / maxD, 2);
    // repère de l'auditeur : yaw = rotation autour de Y, avant = -Z
    const sin = Math.sin(L.yaw), cos = Math.cos(L.yaw);
    const rx = dx * cos - dz * sin; // droite
    const pan = d > 0.5 ? Math.max(-0.85, Math.min(0.85, rx / Math.max(d, 1))) : 0;
    const lp = Math.max(900, 20000 - d * 70);
    return { g, pan, lp, d };
  }

  // Chaîne de sortie : [filtre] -> panoramique -> gain -> bus
  function out(opts, ref, maxD) {
    const c = A.ctx;
    const sp = spatial(opts.pos, ref || 12, maxD || 200);
    if (!sp) return null;
    const g = c.createGain();
    g.gain.value = (opts.vol == null ? 1 : opts.vol) * sp.g;
    let node = g;
    if (sp.pan !== 0 && c.createStereoPanner) {
      const p = c.createStereoPanner(); p.pan.value = sp.pan; g.connect(p); node = p;
    }
    if (sp.lp < 19000) {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = sp.lp; node.connect(f); node = f;
    }
    node.connect(A.sfxBus);
    if (opts.reverb) { const s = c.createGain(); s.gain.value = opts.reverb; node.connect(s); s.connect(A.reverbSend); }
    return { input: g, sp };
  }

  // ---------- primitives ----------
  function noiseSrc(t, dur, brown) {
    const c = A.ctx, s = c.createBufferSource();
    s.buffer = brown ? A.brown : A.noise;
    s.loop = true;
    s.loopStart = Math.random() * 1.5;
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return s;
  }
  function env(t, a, hold, rel, peak) {
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (hold > 0) g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    return g;
  }
  function filt(type, f, q) {
    const n = A.ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; return n;
  }
  function osc(type, f, t, dur) {
    const o = A.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }

  // bruit filtré avec enveloppe
  function burst(dest, t, o) {
    const n = noiseSrc(t, o.a + o.h + o.r, o.brown);
    const f = filt(o.type || 'bandpass', o.f || 1000, o.q == null ? 1 : o.q);
    if (o.fEnd) f.frequency.exponentialRampToValueAtTime(o.fEnd, t + o.a + o.h + o.r);
    const e = env(t, o.a, o.h, o.r, o.v);
    chain(n, f, e, dest);
  }
  // oscillateur avec glissando et enveloppe
  function tone(dest, t, o) {
    const dur = o.a + o.h + o.r;
    const s = osc(o.type || 'sine', o.f, t, dur);
    if (o.fEnd) s.frequency.exponentialRampToValueAtTime(o.fEnd, t + (o.glide || dur));
    if (o.detune) s.detune.value = o.detune;
    const e = env(t, o.a, o.h, o.r, o.v);
    if (o.lp) { const f = filt('lowpass', o.lp, o.q || 0.7); chain(s, f, e, dest); }
    else chain(s, e, dest);
  }

  // ---------- catalogue des sons ----------
  const S = {};
  // Armes
  S.ar = (d, t, o) => {
    burst(d, t, { f: 2200, q: 0.7, a: 0.001, h: 0.02, r: 0.13, v: 1.0, fEnd: 700 });
    burst(d, t, { type: 'lowpass', f: 900, a: 0.001, h: 0.01, r: 0.2, v: 0.8, brown: true });
    tone(d, t, { f: 140, fEnd: 45, a: 0.001, h: 0.01, r: 0.12, v: 0.9 });
    burst(d, t, { type: 'highpass', f: 5000, a: 0.0005, h: 0, r: 0.03, v: 0.5 });
  };
  S.burst = (d, t, o) => S.ar(d, t, o);
  S.smg = (d, t, o) => {
    burst(d, t, { f: 2800, q: 0.9, a: 0.001, h: 0.01, r: 0.07, v: 0.8, fEnd: 1200 });
    tone(d, t, { f: 180, fEnd: 70, a: 0.001, h: 0, r: 0.06, v: 0.6 });
    burst(d, t, { type: 'highpass', f: 6000, a: 0.0005, h: 0, r: 0.02, v: 0.4 });
  };
  S.silenced = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 900, q: 1.2, a: 0.001, h: 0.005, r: 0.06, v: 0.5, fEnd: 400 });
    burst(d, t, { type: 'highpass', f: 5000, a: 0.0005, h: 0, r: 0.02, v: 0.25 });
    tone(d, t + 0.02, { f: 2200, fEnd: 1500, a: 0.001, h: 0, r: 0.03, v: 0.06, type: 'square' });
  };
  S.pistol = (d, t, o) => {
    burst(d, t, { f: 1700, q: 0.8, a: 0.001, h: 0.01, r: 0.12, v: 0.9, fEnd: 600 });
    tone(d, t, { f: 220, fEnd: 60, a: 0.001, h: 0, r: 0.09, v: 0.7 });
    burst(d, t, { type: 'highpass', f: 4000, a: 0.0005, h: 0, r: 0.025, v: 0.5 });
  };
  S.revolver = (d, t, o) => {
    burst(d, t, { f: 1200, q: 0.6, a: 0.001, h: 0.03, r: 0.3, v: 1.1, fEnd: 400 });
    tone(d, t, { f: 110, fEnd: 40, a: 0.001, h: 0.02, r: 0.2, v: 1 });
  };
  S.pump = (d, t, o) => {
    burst(d, t, { type: 'lowpass', f: 2600, a: 0.001, h: 0.04, r: 0.35, v: 1.2, fEnd: 300 });
    burst(d, t, { f: 900, q: 0.6, a: 0.001, h: 0.02, r: 0.25, v: 0.8, brown: true });
    tone(d, t, { f: 95, fEnd: 35, a: 0.001, h: 0.03, r: 0.3, v: 1.1 });
    if (!o.noRack) {
      burst(d, t + 0.42, { type: 'bandpass', f: 1800, q: 3, a: 0.002, h: 0.01, r: 0.05, v: 0.45 });
      burst(d, t + 0.58, { type: 'bandpass', f: 1400, q: 3, a: 0.002, h: 0.01, r: 0.06, v: 0.5 });
    }
  };
  S.tactical = (d, t, o) => {
    burst(d, t, { type: 'lowpass', f: 3000, a: 0.001, h: 0.03, r: 0.22, v: 1.0, fEnd: 400 });
    tone(d, t, { f: 110, fEnd: 45, a: 0.001, h: 0.02, r: 0.2, v: 0.9 });
  };
  S.sniper = (d, t, o) => {
    burst(d, t, { type: 'highpass', f: 1500, a: 0.0005, h: 0.01, r: 0.08, v: 1.2 });
    burst(d, t, { type: 'lowpass', f: 3000, a: 0.001, h: 0.05, r: 0.9, v: 1.3, fEnd: 200 });
    tone(d, t, { f: 80, fEnd: 30, a: 0.001, h: 0.05, r: 0.5, v: 1.2 });
    burst(d, t + 0.25, { type: 'lowpass', f: 800, a: 0.05, h: 0.1, r: 1.2, v: 0.35, brown: true });
    if (!o.noRack) {
      burst(d, t + 0.7, { type: 'bandpass', f: 2200, q: 4, a: 0.002, h: 0.01, r: 0.04, v: 0.35 });
      burst(d, t + 0.9, { type: 'bandpass', f: 1600, q: 4, a: 0.002, h: 0.01, r: 0.05, v: 0.35 });
    }
  };
  S.minigun = (d, t, o) => {
    burst(d, t, { f: 2000, q: 0.8, a: 0.001, h: 0.005, r: 0.05, v: 0.7, fEnd: 900 });
    tone(d, t, { f: 150, fEnd: 60, a: 0.001, h: 0, r: 0.04, v: 0.5 });
  };
  S.rocket = (d, t, o) => {
    burst(d, t, { type: 'bandpass', f: 400, q: 0.8, a: 0.01, h: 0.1, r: 0.8, v: 1.0, fEnd: 2500 });
    tone(d, t, { f: 90, fEnd: 40, a: 0.001, h: 0.05, r: 0.3, v: 1 });
  };
  S.grenade_launcher = (d, t) => {
    tone(d, t, { f: 180, fEnd: 60, a: 0.001, h: 0.02, r: 0.2, v: 1 });
    burst(d, t, { type: 'lowpass', f: 1200, a: 0.001, h: 0.02, r: 0.2, v: 0.7 });
  };
  S.explosion = (d, t, o) => {
    burst(d, t, { type: 'lowpass', f: 3000, a: 0.002, h: 0.08, r: 1.8, v: 1.6, fEnd: 120, brown: true });
    burst(d, t, { type: 'lowpass', f: 6000, a: 0.001, h: 0.02, r: 0.4, v: 1.0, fEnd: 500 });
    tone(d, t, { f: 70, fEnd: 22, a: 0.002, h: 0.1, r: 1.2, v: 1.6 });
    for (let i = 0; i < 6; i++) burst(d, t + 0.1 + Math.random() * 0.6, { type: 'highpass', f: 3000, a: 0.001, h: 0, r: 0.03, v: 0.25 });
  };
  S.empty = (d, t) => burst(d, t, { type: 'bandpass', f: 3000, q: 5, a: 0.001, h: 0, r: 0.04, v: 0.5 });
  S.reload = (d, t, o) => {
    burst(d, t, { type: 'bandpass', f: 1200, q: 4, a: 0.002, h: 0.01, r: 0.05, v: 0.4 });
    burst(d, t + 0.25, { type: 'bandpass', f: 2400, q: 5, a: 0.002, h: 0.01, r: 0.04, v: 0.45 });
  };
  S.reload_end = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 1800, q: 5, a: 0.002, h: 0.005, r: 0.04, v: 0.5 });
    burst(d, t + 0.08, { type: 'bandpass', f: 1300, q: 5, a: 0.002, h: 0.005, r: 0.05, v: 0.5 });
  };
  S.shell = (d, t) => burst(d, t, { type: 'bandpass', f: 1500, q: 3, a: 0.002, h: 0.01, r: 0.06, v: 0.45 });
  S.equip = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 1000, q: 2, a: 0.005, h: 0.02, r: 0.08, v: 0.35 });
    burst(d, t + 0.07, { type: 'bandpass', f: 2600, q: 5, a: 0.002, h: 0.005, r: 0.04, v: 0.35 });
  };
  S.whiz = (d, t) => burst(d, t, { type: 'bandpass', f: 3500, q: 2, a: 0.02, h: 0.02, r: 0.08, v: 0.35, fEnd: 1500 });
  S.impact = (d, t, o) => {
    const f = o.mat === 'metal' ? 3500 : o.mat === 'stone' ? 2200 : o.mat === 'wood' ? 900 : 1400;
    burst(d, t, { type: 'bandpass', f, q: 2, a: 0.001, h: 0, r: 0.07, v: 0.5 });
    if (o.mat === 'metal') tone(d, t, { f: 1900 + Math.random() * 600, a: 0.001, h: 0, r: 0.15, v: 0.15 });
  };

  // Joueur / mouvement
  S.step = (d, t, o) => {
    const m = o.surface || 'grass';
    if (m === 'wood') { burst(d, t, { type: 'bandpass', f: 500, q: 1.5, a: 0.002, h: 0.01, r: 0.08, v: 0.5 }); tone(d, t, { f: 160, fEnd: 90, a: 0.001, h: 0, r: 0.06, v: 0.25 }); }
    else if (m === 'metal') { burst(d, t, { type: 'bandpass', f: 2500, q: 3, a: 0.001, h: 0, r: 0.08, v: 0.35 }); tone(d, t, { f: 700 + Math.random() * 200, a: 0.001, h: 0, r: 0.1, v: 0.06 }); }
    else if (m === 'stone') burst(d, t, { type: 'bandpass', f: 1800, q: 1.2, a: 0.001, h: 0, r: 0.05, v: 0.45 });
    else if (m === 'water') burst(d, t, { type: 'bandpass', f: 900, q: 0.8, a: 0.01, h: 0.03, r: 0.15, v: 0.5, fEnd: 400 });
    else if (m === 'sand') burst(d, t, { type: 'highpass', f: 2500, a: 0.01, h: 0.02, r: 0.08, v: 0.3 });
    else if (m === 'snow') burst(d, t, { type: 'bandpass', f: 1200, q: 0.6, a: 0.01, h: 0.03, r: 0.1, v: 0.35 });
    else burst(d, t, { type: 'bandpass', f: 1100 + Math.random() * 300, q: 0.9, a: 0.004, h: 0.01, r: 0.07, v: 0.35 });
  };
  S.jump = (d, t) => burst(d, t, { type: 'bandpass', f: 700, q: 0.7, a: 0.005, h: 0.02, r: 0.1, v: 0.3 });
  S.land = (d, t, o) => {
    burst(d, t, { type: 'lowpass', f: 600, a: 0.002, h: 0.02, r: 0.15, v: 0.6 * (o.v || 1) });
    tone(d, t, { f: 90, fEnd: 50, a: 0.001, h: 0, r: 0.1, v: 0.4 * (o.v || 1) });
  };
  S.splash = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 1200, q: 0.5, a: 0.01, h: 0.1, r: 0.6, v: 0.8, fEnd: 300 });
    burst(d, t + 0.05, { type: 'highpass', f: 3000, a: 0.02, h: 0.05, r: 0.4, v: 0.3 });
  };
  S.glider_open = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 600, q: 0.8, a: 0.01, h: 0.05, r: 0.25, v: 0.8, fEnd: 1500 });
    burst(d, t + 0.1, { type: 'lowpass', f: 400, a: 0.005, h: 0.02, r: 0.2, v: 0.6 });
  };
  S.hurt = (d, t) => {
    tone(d, t, { f: 120, fEnd: 60, a: 0.002, h: 0.02, r: 0.15, v: 0.7 });
    burst(d, t, { type: 'lowpass', f: 700, a: 0.002, h: 0.02, r: 0.12, v: 0.5 });
  };
  S.fall_damage = (d, t) => { S.hurt(d, t); S.land(d, t, { v: 1.2 }); };
  S.heartbeat = (d, t) => {
    tone(d, t, { f: 62, fEnd: 40, a: 0.005, h: 0.02, r: 0.12, v: 0.55 });
    tone(d, t + 0.2, { f: 58, fEnd: 38, a: 0.005, h: 0.02, r: 0.14, v: 0.4 });
  };

  // Récolte / construction
  S.swing = (d, t) => burst(d, t, { type: 'bandpass', f: 800, q: 1.2, a: 0.03, h: 0.02, r: 0.1, v: 0.35, fEnd: 2200 });
  S.hit_wood = (d, t, o) => {
    tone(d, t, { f: 240, fEnd: 110, a: 0.001, h: 0.01, r: 0.12, v: 0.8, type: 'triangle' });
    burst(d, t, { type: 'bandpass', f: 700, q: 1.5, a: 0.001, h: 0.01, r: 0.1, v: 0.7 });
  };
  S.hit_stone = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 2600, q: 1.5, a: 0.001, h: 0, r: 0.09, v: 0.8 });
    tone(d, t, { f: 820, fEnd: 600, a: 0.001, h: 0, r: 0.08, v: 0.3, type: 'triangle' });
    burst(d, t, { type: 'lowpass', f: 500, a: 0.001, h: 0, r: 0.08, v: 0.5 });
  };
  S.hit_metal = (d, t) => {
    const base = 480 + Math.random() * 80;
    [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(d, t, { f: base * m, a: 0.001, h: 0, r: 0.5 / (i + 1), v: 0.28 / (i + 1) }));
    burst(d, t, { type: 'highpass', f: 3000, a: 0.001, h: 0, r: 0.05, v: 0.4 });
  };
  S.weakspot = (d, t) => {
    tone(d, t, { f: 1760, a: 0.001, h: 0.02, r: 0.25, v: 0.35 });
    tone(d, t + 0.03, { f: 2637, a: 0.001, h: 0.02, r: 0.3, v: 0.3 });
  };
  S.build = (d, t, o) => {
    const m = o.mat || 'wood';
    if (m === 'wood') { tone(d, t, { f: 200, fEnd: 120, a: 0.002, h: 0.01, r: 0.12, v: 0.6, type: 'triangle' }); burst(d, t, { type: 'bandpass', f: 900, q: 1.2, a: 0.002, h: 0.02, r: 0.12, v: 0.5 }); }
    else if (m === 'stone') { burst(d, t, { type: 'lowpass', f: 1400, a: 0.002, h: 0.03, r: 0.18, v: 0.8 }); tone(d, t, { f: 110, fEnd: 70, a: 0.002, h: 0.02, r: 0.12, v: 0.6 }); }
    else { S.hit_metal(d, t); burst(d, t, { type: 'lowpass', f: 900, a: 0.002, h: 0.02, r: 0.12, v: 0.5 }); }
    burst(d, t, { type: 'highpass', f: 5000, a: 0.005, h: 0.02, r: 0.2, v: 0.12 });
  };
  S.build_fail = (d, t) => tone(d, t, { f: 180, a: 0.005, h: 0.05, r: 0.08, v: 0.3, type: 'square', lp: 800 });
  S.edit = (d, t) => { tone(d, t, { f: 900, a: 0.002, h: 0.01, r: 0.06, v: 0.2, type: 'triangle' }); };
  S.edit_confirm = (d, t) => { S.build(d, t, { mat: 'wood' }); tone(d, t, { f: 1200, a: 0.002, h: 0.02, r: 0.1, v: 0.2 }); };
  S.destroy = (d, t, o) => {
    const m = o.mat || 'wood';
    burst(d, t, { type: 'lowpass', f: m === 'metal' ? 3000 : m === 'stone' ? 1800 : 1200, a: 0.002, h: 0.08, r: 0.6, v: 1.0, fEnd: 200 });
    for (let i = 0; i < 5; i++) burst(d, t + Math.random() * 0.3, { type: 'bandpass', f: m === 'wood' ? 600 + Math.random() * 500 : 1500 + Math.random() * 1500, q: 2, a: 0.001, h: 0, r: 0.06, v: 0.4 });
    if (m === 'metal') S.hit_metal(d, t);
  };
  S.glass = (d, t) => {
    for (let i = 0; i < 9; i++) tone(d, t + Math.random() * 0.25, { f: 2500 + Math.random() * 4000, a: 0.001, h: 0, r: 0.15 + Math.random() * 0.2, v: 0.12 });
    burst(d, t, { type: 'highpass', f: 4000, a: 0.001, h: 0.03, r: 0.3, v: 0.6 });
  };

  // Loot
  S.chest_open = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 500, q: 1, a: 0.02, h: 0.05, r: 0.3, v: 0.6, fEnd: 1400 });
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone(d, t + 0.05 + i * 0.045, { f: 880 * Math.pow(2, n / 12), a: 0.002, h: 0.02, r: 0.35, v: 0.18, type: 'triangle' }));
    burst(d, t + 0.1, { type: 'highpass', f: 6000, a: 0.05, h: 0.2, r: 0.6, v: 0.25 });
  };
  S.ammo_open = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 900, q: 2, a: 0.005, h: 0.02, r: 0.1, v: 0.6 });
    burst(d, t + 0.12, { type: 'bandpass', f: 1600, q: 3, a: 0.003, h: 0.01, r: 0.08, v: 0.5 });
  };
  S.pickup = (d, t) => {
    tone(d, t, { f: 660, a: 0.002, h: 0.02, r: 0.08, v: 0.25, type: 'triangle' });
    tone(d, t + 0.06, { f: 990, a: 0.002, h: 0.02, r: 0.12, v: 0.25, type: 'triangle' });
    burst(d, t, { type: 'bandpass', f: 1200, q: 2, a: 0.005, h: 0.02, r: 0.08, v: 0.3 });
  };
  S.pickup_ammo = (d, t) => { burst(d, t, { type: 'bandpass', f: 2200, q: 4, a: 0.002, h: 0.01, r: 0.05, v: 0.4 }); burst(d, t + 0.05, { type: 'bandpass', f: 2800, q: 4, a: 0.002, h: 0.01, r: 0.05, v: 0.3 }); };
  S.pickup_mats = (d, t) => { tone(d, t, { f: 520, a: 0.002, h: 0.01, r: 0.08, v: 0.2, type: 'triangle' }); tone(d, t + 0.05, { f: 780, a: 0.002, h: 0.01, r: 0.1, v: 0.2, type: 'triangle' }); };
  S.drop = (d, t) => burst(d, t, { type: 'bandpass', f: 700, q: 1, a: 0.005, h: 0.02, r: 0.1, v: 0.4 });

  // Soins
  S.bandage = (d, t) => { for (let i = 0; i < 6; i++) burst(d, t + i * 0.45, { type: 'bandpass', f: 2500, q: 0.8, a: 0.05, h: 0.1, r: 0.15, v: 0.25 }); };
  S.medkit = (d, t) => { for (let i = 0; i < 10; i++) burst(d, t + i * 0.8, { type: 'bandpass', f: 1800 + (i % 2) * 800, q: 0.8, a: 0.05, h: 0.15, r: 0.2, v: 0.22 }); };
  S.drink = (d, t, o) => {
    const n = o.n || 4;
    for (let i = 0; i < n; i++) tone(d, t + i * 0.42, { f: 300, fEnd: 180, a: 0.02, h: 0.05, r: 0.12, v: 0.35, type: 'sine' });
  };
  S.heal_done = (d, t) => { tone(d, t, { f: 880, a: 0.005, h: 0.05, r: 0.3, v: 0.25 }); tone(d, t + 0.08, { f: 1320, a: 0.005, h: 0.05, r: 0.4, v: 0.22 }); };
  S.shield_done = (d, t) => { [0, 7, 12].forEach((n, i) => tone(d, t + i * 0.06, { f: 660 * Math.pow(2, n / 12), a: 0.005, h: 0.05, r: 0.4, v: 0.2, type: 'triangle' })); };

  // Retour de dégâts
  S.hitmarker = (d, t) => burst(d, t, { type: 'bandpass', f: 3200, q: 6, a: 0.001, h: 0, r: 0.05, v: 0.6 });
  S.headshot = (d, t) => { tone(d, t, { f: 2093, a: 0.001, h: 0.02, r: 0.3, v: 0.3 }); tone(d, t, { f: 3136, a: 0.001, h: 0.01, r: 0.2, v: 0.2 }); burst(d, t, { type: 'bandpass', f: 4000, q: 5, a: 0.001, h: 0, r: 0.05, v: 0.5 }); };
  S.shield_hit = (d, t) => { tone(d, t, { f: 1500 + Math.random() * 300, fEnd: 900, a: 0.001, h: 0, r: 0.12, v: 0.25, type: 'triangle' }); burst(d, t, { type: 'highpass', f: 5000, a: 0.001, h: 0, r: 0.06, v: 0.3 }); };
  S.shield_break = (d, t) => { S.glass(d, t); tone(d, t, { f: 1200, fEnd: 300, a: 0.002, h: 0.05, r: 0.4, v: 0.3, type: 'sawtooth', lp: 3000 }); };
  S.elim = (d, t) => {
    tone(d, t, { f: 523, a: 0.003, h: 0.05, r: 0.2, v: 0.3, type: 'square', lp: 2500 });
    tone(d, t + 0.09, { f: 784, a: 0.003, h: 0.05, r: 0.3, v: 0.3, type: 'square', lp: 2500 });
    tone(d, t + 0.18, { f: 1047, a: 0.003, h: 0.1, r: 0.5, v: 0.3, type: 'square', lp: 3000 });
  };
  S.eliminated_fx = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 800, q: 0.7, a: 0.02, h: 0.2, r: 0.8, v: 0.6, fEnd: 4000 });
    for (let i = 0; i < 10; i++) tone(d, t + i * 0.05, { f: 400 + i * 150, a: 0.002, h: 0, r: 0.1, v: 0.1, type: 'square', lp: 3000 });
  };

  // Interface
  S.ui_hover = (d, t) => tone(d, t, { f: 1400, a: 0.002, h: 0, r: 0.04, v: 0.12, type: 'triangle' });
  S.ui_click = (d, t) => { tone(d, t, { f: 900, a: 0.002, h: 0.01, r: 0.06, v: 0.25, type: 'triangle' }); tone(d, t + 0.04, { f: 1350, a: 0.002, h: 0.01, r: 0.08, v: 0.2, type: 'triangle' }); };
  S.ui_back = (d, t) => { tone(d, t, { f: 900, a: 0.002, h: 0.01, r: 0.06, v: 0.22, type: 'triangle' }); tone(d, t + 0.05, { f: 600, a: 0.002, h: 0.01, r: 0.08, v: 0.2, type: 'triangle' }); };
  S.ui_play = (d, t) => { [0, 4, 7, 12].forEach((n, i) => tone(d, t + i * 0.07, { f: 523 * Math.pow(2, n / 12), a: 0.003, h: 0.05, r: 0.3, v: 0.2, type: 'sawtooth', lp: 3000 })); };
  S.levelup = (d, t) => {
    [0, 4, 7, 12, 16].forEach((n, i) => tone(d, t + i * 0.08, { f: 523 * Math.pow(2, n / 12), a: 0.003, h: 0.08, r: 0.5, v: 0.22, type: 'square', lp: 3500 }));
    burst(d, t + 0.35, { type: 'highpass', f: 6000, a: 0.02, h: 0.2, r: 0.8, v: 0.25 });
  };
  S.gnome = (d, t) => { [0, 0.12, 0.24, 0.33].forEach((o, i) => tone(d, t + o, { f: 1250 - i * 110, fEnd: 980 - i * 90, a: 0.004, h: 0.03, r: 0.07, v: 0.15, type: 'triangle' })); };
  S.unlock = (d, t) => { [0, 7, 12, 19].forEach((n, i) => tone(d, t + i * 0.1, { f: 440 * Math.pow(2, n / 12), a: 0.003, h: 0.1, r: 0.6, v: 0.2, type: 'triangle' })); };
  S.countdown = (d, t) => tone(d, t, { f: 880, a: 0.002, h: 0.08, r: 0.1, v: 0.3, type: 'square', lp: 2500 });
  S.go = (d, t) => tone(d, t, { f: 1320, a: 0.002, h: 0.25, r: 0.2, v: 0.3, type: 'square', lp: 3000 });
  S.storm_warning = (d, t) => {
    for (let i = 0; i < 3; i++) { tone(d, t + i * 0.5, { f: 330, fEnd: 440, a: 0.02, h: 0.2, r: 0.2, v: 0.25, type: 'sawtooth', lp: 1500 }); }
    burst(d, t, { type: 'lowpass', f: 300, a: 0.3, h: 1, r: 1.5, v: 0.6, brown: true });
  };
  S.thunder = (d, t) => {
    burst(d, t, { type: 'lowpass', f: 2500, a: 0.005, h: 0.05, r: 0.3, v: 0.8, fEnd: 400 });
    burst(d, t + 0.1, { type: 'lowpass', f: 400, a: 0.1, h: 0.5, r: 2.5, v: 1.0, brown: true });
  };
  S.bus_horn = (d, t) => {
    tone(d, t, { f: 349, a: 0.02, h: 0.35, r: 0.1, v: 0.25, type: 'sawtooth', lp: 1800 });
    tone(d, t, { f: 440, a: 0.02, h: 0.35, r: 0.1, v: 0.25, type: 'sawtooth', lp: 1800 });
    tone(d, t + 0.55, { f: 349, a: 0.02, h: 0.6, r: 0.15, v: 0.25, type: 'sawtooth', lp: 1800 });
    tone(d, t + 0.55, { f: 440, a: 0.02, h: 0.6, r: 0.15, v: 0.25, type: 'sawtooth', lp: 1800 });
  };
  S.bus_jump = (d, t) => { burst(d, t, { type: 'bandpass', f: 500, q: 0.7, a: 0.05, h: 0.2, r: 0.5, v: 0.6, fEnd: 2000 }); };
  S.door = (d, t) => { tone(d, t, { f: 300, fEnd: 200, a: 0.02, h: 0.15, r: 0.1, v: 0.12, type: 'sawtooth', lp: 900 }); burst(d, t + 0.25, { type: 'lowpass', f: 600, a: 0.002, h: 0.02, r: 0.1, v: 0.5 }); };
  S.throw = (d, t) => burst(d, t, { type: 'bandpass', f: 900, q: 1, a: 0.02, h: 0.02, r: 0.12, v: 0.4, fEnd: 2000 });
  S.bounce = (d, t) => { burst(d, t, { type: 'bandpass', f: 1600, q: 3, a: 0.001, h: 0, r: 0.05, v: 0.4 }); };
  S.pin = (d, t) => burst(d, t, { type: 'bandpass', f: 4000, q: 6, a: 0.001, h: 0, r: 0.05, v: 0.4 });
  S.launchpad = (d, t) => { tone(d, t, { f: 150, fEnd: 900, a: 0.01, h: 0.1, r: 0.3, v: 0.5, type: 'square', lp: 2000 }); burst(d, t, { type: 'bandpass', f: 400, fEnd: 3000, q: 1, a: 0.01, h: 0.1, r: 0.4, v: 0.6 }); };
  // Établi d'amélioration : coups d'enclume puis arpège brillant
  S.upgrade = (d, t) => {
    for (let i = 0; i < 3; i++) { S.hit_metal(d, t + i * 0.16); }
    [0, 4, 7, 12, 16, 19].forEach((n, i) => tone(d, t + 0.5 + i * 0.06, { f: 660 * Math.pow(2, n / 12), a: 0.003, h: 0.06, r: 0.45, v: 0.18, type: 'triangle' }));
    burst(d, t + 0.5, { type: 'highpass', f: 5000, a: 0.02, h: 0.15, r: 0.6, v: 0.2 });
  };
  // Cachette : froissement + couvercle métallique
  S.hide = (d, t) => { burst(d, t, { type: 'bandpass', f: 1200, q: 0.8, a: 0.01, h: 0.12, r: 0.2, v: 0.5 }); burst(d, t + 0.22, { type: 'lowpass', f: 500, a: 0.002, h: 0.03, r: 0.2, v: 0.7 }); tone(d, t + 0.22, { f: 180, fEnd: 120, a: 0.002, h: 0.05, r: 0.25, v: 0.2, type: 'triangle' }); };
  // Tyrolienne : accroche métallique
  S.zip_on = (d, t) => { S.hit_metal(d, t); tone(d, t + 0.02, { f: 1400, fEnd: 900, a: 0.002, h: 0.05, r: 0.3, v: 0.12, type: 'triangle' }); };
  // Camionnette de renfort
  S.reboot_start = (d, t) => { tone(d, t, { f: 220, fEnd: 880, a: 0.05, h: 0.3, r: 0.3, v: 0.2, type: 'sawtooth', lp: 1800 }); };
  S.reboot = (d, t) => {
    tone(d, t, { f: 110, fEnd: 1760, a: 0.02, h: 0.4, r: 0.4, v: 0.3, type: 'sawtooth', lp: 3000, glide: 0.5 });
    burst(d, t + 0.45, { type: 'bandpass', f: 300, fEnd: 4000, q: 0.8, a: 0.01, h: 0.2, r: 0.8, v: 0.8 });
    [0, 7, 12, 19].forEach((n, i) => tone(d, t + 0.5 + i * 0.09, { f: 523 * Math.pow(2, n / 12), a: 0.003, h: 0.1, r: 0.6, v: 0.18, type: 'square', lp: 3000 }));
  };
  S.flame = (d, t) => { burst(d, t, { type: 'bandpass', f: 600, q: 0.6, a: 0.02, h: 0.18, r: 0.12, v: 0.4 }); burst(d, t, { type: 'lowpass', f: 300, a: 0.02, h: 0.15, r: 0.1, v: 0.35, brown: true }); };
  S.raptor = (d, t) => { tone(d, t, { f: 900, fEnd: 380, a: 0.01, h: 0.12, r: 0.25, v: 0.25, type: 'sawtooth', lp: 2600 }); tone(d, t + 0.02, { f: 1350, fEnd: 520, a: 0.01, h: 0.1, r: 0.2, v: 0.12, type: 'square', lp: 2200 }); burst(d, t, { type: 'bandpass', f: 1800, q: 1.5, a: 0.01, h: 0.15, r: 0.2, v: 0.25 }); };
  S.jaws = (d, t) => { tone(d, t, { f: 82.4, a: 0.01, h: 0.12, r: 0.12, v: 0.55, type: 'sawtooth', lp: 380 }); tone(d, t + 0.28, { f: 87.3, a: 0.01, h: 0.12, r: 0.14, v: 0.55, type: 'sawtooth', lp: 380 }); };
  S.boar = (d, t) => { for (let i = 0; i < 3; i++) tone(d, t + i * 0.11, { f: 110 + Math.random() * 30, fEnd: 80, a: 0.01, h: 0.04, r: 0.05, v: 0.3, type: 'sawtooth', lp: 700 }); burst(d, t, { type: 'bandpass', f: 400, q: 2, a: 0.01, h: 0.2, r: 0.1, v: 0.2 }); };
  S.stink = (d, t) => { burst(d, t, { type: 'lowpass', f: 700, a: 0.01, h: 0.3, r: 0.8, v: 0.5, brown: true }); tone(d, t, { f: 90, fEnd: 60, a: 0.05, h: 0.3, r: 0.4, v: 0.15, type: 'sawtooth', lp: 400 }); };
  S.smoke = (d, t) => { burst(d, t, { type: 'highpass', f: 1500, a: 0.02, h: 0.6, r: 1.2, v: 0.35 }); burst(d, t, { type: 'lowpass', f: 500, a: 0.01, h: 0.2, r: 0.4, v: 0.3, brown: true }); };
  S.ufo = (d, t) => {
    tone(d, t, { f: 150, fEnd: 190, a: 0.2, h: 0.6, r: 0.4, v: 0.16, type: 'sawtooth', lp: 500, glide: 1.1 });
    tone(d, t, { f: 820, fEnd: 1180, a: 0.1, h: 0.4, r: 0.3, v: 0.05, type: 'sine', glide: 0.5 });
    tone(d, t + 0.5, { f: 1180, fEnd: 820, a: 0.05, h: 0.3, r: 0.3, v: 0.05, type: 'sine', glide: 0.5 });
  };
  S.balloon = (d, t) => { tone(d, t, { f: 300, fEnd: 700, a: 0.05, h: 0.2, r: 0.05, v: 0.12, type: 'sine', glide: 0.25 }); burst(d, t, { type: 'bandpass', f: 1500, q: 1, a: 0.05, h: 0.2, r: 0.05, v: 0.12 }); };
  S.pop = (d, t) => { burst(d, t, { type: 'highpass', f: 1200, a: 0.001, h: 0.01, r: 0.06, v: 0.7 }); tone(d, t, { f: 400, fEnd: 120, a: 0.001, h: 0.01, r: 0.08, v: 0.3, type: 'triangle' }); };
  S.firework_up = (d, t) => { tone(d, t, { f: 600, fEnd: 2400, a: 0.05, h: 0.6, r: 0.1, v: 0.08, type: 'sine', glide: 0.7 }); burst(d, t, { type: 'highpass', f: 4000, a: 0.05, h: 0.5, r: 0.1, v: 0.06 }); };
  S.firework_boom = (d, t) => {
    burst(d, t, { type: 'lowpass', f: 400, a: 0.002, h: 0.05, r: 0.6, v: 0.9, brown: true });
    tone(d, t, { f: 90, fEnd: 40, a: 0.002, h: 0.02, r: 0.4, v: 0.5 });
    for (let i = 0; i < 10; i++) burst(d, t + 0.25 + Math.random() * 0.9, { type: 'highpass', f: 5000, a: 0.001, h: 0.005, r: 0.03, v: 0.18 });
  };
  S.car_alarm = (d, t) => {
    tone(d, t, { f: 880, fEnd: 1320, a: 0.01, h: 0.2, r: 0.03, v: 0.22, type: 'square', lp: 3000, glide: 0.22 });
    tone(d, t + 0.25, { f: 1320, fEnd: 880, a: 0.01, h: 0.2, r: 0.03, v: 0.22, type: 'square', lp: 3000, glide: 0.22 });
  };
  S.saber = (d, t) => {
    tone(d, t, { f: 110, fEnd: 70, a: 0.01, h: 0.12, r: 0.2, v: 0.35, type: 'sawtooth', lp: 900 });
    tone(d, t, { f: 220, fEnd: 330, a: 0.01, h: 0.1, r: 0.18, v: 0.18, type: 'square', lp: 1600 });
    burst(d, t, { type: 'bandpass', f: 1800, fEnd: 700, q: 1.5, a: 0.01, h: 0.12, r: 0.12, v: 0.35 });
  };
  S.bow = (d, t) => {
    tone(d, t, { f: 180, fEnd: 90, a: 0.002, h: 0.02, r: 0.18, v: 0.45, type: 'triangle' });
    burst(d, t, { type: 'bandpass', f: 900, q: 2, a: 0.001, h: 0.01, r: 0.08, v: 0.35 });
    burst(d, t + 0.02, { type: 'highpass', f: 3000, a: 0.01, h: 0.05, r: 0.15, v: 0.2 });
  };
  S.bow_draw = (d, t) => { burst(d, t, { type: 'bandpass', f: 500, fEnd: 1400, q: 6, a: 0.05, h: 0.4, r: 0.15, v: 0.18 }); tone(d, t, { f: 90, fEnd: 140, a: 0.05, h: 0.4, r: 0.1, v: 0.06, type: 'sawtooth', lp: 600 }); };
  S.arrow_hit = (d, t) => { burst(d, t, { type: 'bandpass', f: 1500, q: 2, a: 0.001, h: 0.01, r: 0.06, v: 0.5 }); tone(d, t, { f: 220, fEnd: 160, a: 0.001, h: 0.02, r: 0.2, v: 0.25, type: 'triangle' }); };
  S.coin = (d, t) => { tone(d, t, { f: 1318, a: 0.002, h: 0.03, r: 0.12, v: 0.2, type: 'square', lp: 5000 }); tone(d, t + 0.07, { f: 1976, a: 0.002, h: 0.05, r: 0.3, v: 0.18, type: 'square', lp: 6000 }); };
  S.buy = (d, t) => {
    burst(d, t, { type: 'bandpass', f: 3000, q: 3, a: 0.002, h: 0.02, r: 0.08, v: 0.4 });
    [0, 4, 7, 12].forEach((n, i) => tone(d, t + 0.05 + i * 0.07, { f: 988 * Math.pow(2, n / 12), a: 0.003, h: 0.04, r: 0.3, v: 0.16, type: 'triangle' }));
    tone(d, t + 0.35, { f: 2637, a: 0.002, h: 0.1, r: 0.8, v: 0.12, type: 'sine' });
  };
  S.talk = (d, t) => { for (let i = 0; i < 5; i++) tone(d, t + i * 0.07, { f: 300 + Math.random() * 260, a: 0.005, h: 0.03, r: 0.03, v: 0.12, type: 'square', lp: 1800 }); };
  S.card = (d, t) => { [0, 5, 9].forEach((n, i) => tone(d, t + i * 0.07, { f: 880 * Math.pow(2, n / 12), a: 0.003, h: 0.05, r: 0.35, v: 0.2, type: 'sine' })); };
  S.spray = (d, t) => { for (let i = 0; i < 3; i++) burst(d, t + i * 0.13, { type: 'highpass', f: 3500, a: 0.01, h: 0.08, r: 0.05, v: 0.35 }); tone(d, t, { f: 2200, a: 0.002, h: 0.01, r: 0.05, v: 0.08, type: 'square' }); };
  S.ping = (d, t) => { tone(d, t, { f: 1175, a: 0.004, h: 0.05, r: 0.2, v: 0.2, type: 'sine' }); tone(d, t + 0.09, { f: 1568, a: 0.004, h: 0.06, r: 0.35, v: 0.2, type: 'sine' }); };
  S.slide = (d, t) => burst(d, t, { type: 'bandpass', f: 700, fEnd: 300, q: 0.7, a: 0.02, h: 0.35, r: 0.3, v: 0.35 });
  S.mantle = (d, t) => { burst(d, t, { type: 'lowpass', f: 900, a: 0.01, h: 0.05, r: 0.15, v: 0.4 }); };
  S.trap = (d, t) => { burst(d, t, { type: 'bandpass', f: 2500, q: 2, a: 0.001, h: 0.01, r: 0.1, v: 0.8 }); S.hit_metal(d, t); };
  S.car_horn = (d, t) => { tone(d, t, { f: 415, a: 0.01, h: 0.3, r: 0.05, v: 0.25, type: 'square', lp: 1600 }); tone(d, t, { f: 520, a: 0.01, h: 0.3, r: 0.05, v: 0.25, type: 'square', lp: 1600 }); };
  S.bird = (d, t) => {
    const f = 2500 + Math.random() * 2000, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) tone(d, t + i * 0.12, { f, fEnd: f * (Math.random() < 0.5 ? 1.4 : 0.7), glide: 0.08, a: 0.005, h: 0.02, r: 0.06, v: 0.06 });
  };
  S.cricket = (d, t) => { for (let i = 0; i < 4; i++) tone(d, t + i * 0.06, { f: 4200, a: 0.002, h: 0.02, r: 0.02, v: 0.03, type: 'square', lp: 6000 }); };
  S.wave = (d, t) => burst(d, t, { type: 'lowpass', f: 900, a: 0.8, h: 0.5, r: 1.8, v: 0.25, brown: true });
  S.airdrop = (d, t) => { S.thunder(d, t); tone(d, t, { f: 220, fEnd: 440, a: 0.1, h: 0.5, r: 0.5, v: 0.2, type: 'sawtooth', lp: 1200 }); };
  S.xp = (d, t) => tone(d, t, { f: 1568, a: 0.002, h: 0.02, r: 0.12, v: 0.12, type: 'triangle' });

  // Paramètres de spatialisation par son : [distance de référence, distance max]
  const RANGES = {
    ar: [15, 380], smg: [12, 320], pistol: [12, 300], silenced: [5, 60], revolver: [15, 350], pump: [15, 350], tactical: [15, 330], sniper: [25, 700], minigun: [15, 350],
    rocket: [15, 350], grenade_launcher: [15, 300], explosion: [30, 650], step: [3, 35], impact: [4, 60], hit_wood: [6, 80], hit_stone: [6, 80], hit_metal: [6, 90],
    build: [6, 90], upgrade: [6, 60], hide: [4, 40], zip_on: [4, 50], reboot: [10, 150], reboot_start: [6, 60], slide: [3, 30], mantle: [3, 30], destroy: [8, 140], glass: [6, 80], chest_open: [6, 60], swing: [4, 30], land: [4, 50], splash: [6, 80], door: [4, 40], bounce: [4, 40],
    thunder: [100, 2000], airdrop: [80, 1500], trap: [6, 60], launchpad: [8, 80], reload: [4, 30], reload_end: [4, 30], shell: [4, 30], jump: [3, 25], glider_open: [5, 60],
    empty: [3, 20], wave: [10, 60], bird: [8, 60], cricket: [6, 30], whiz: [2, 10], car_horn: [10, 150], throw: [4, 30], pin: [3, 20], ammo_open: [5, 40],
  };

  // catégories pour la visualisation des effets sonores
  const VIZ = { ar: 'gun', burst: 'gun', smg: 'gun', pistol: 'gun', revolver: 'gun', pump: 'gun', tactical: 'gun', sniper: 'gun', minigun: 'gun', rocket: 'gun', grenade_launcher: 'gun',
    step: 'step', explosion: 'boom', build: 'build', glider_open: 'glider', chest_open: 'chest', land: 'step', splash: 'step' };
  A.play = function (name, opts) {
    opts = opts || {};
    if (opts.pos && VIZ[name] && G.HUD && G.HUD.soundViz) G.HUD.soundViz(VIZ[name], opts.pos);
    if (!A.ready || !A.ctx || A.ctx.state !== 'running') return;
    const fn = S[name];
    if (!fn) return;
    // anti-spam : limite le nombre de sons identiques par frame
    const now = A.ctx.currentTime;
    const key = name + (opts.pos ? '' : '_2d');
    const lp = A.lastPlay[key];
    if (lp && lp.t === now && lp.n > 3) return;
    if (lp && lp.t === now) lp.n++; else A.lastPlay[key] = { t: now, n: 1 };
    const r = RANGES[name] || [8, 120];
    const o = out(opts, r[0], r[1]);
    if (!o) return;
    const t = now + (opts.delay || 0);
    if (opts.pitch) { /* pas de pitch global : les générateurs sont déjà variés */ }
    try { fn(o.input, t, opts); } catch (e) { console.warn('son', name, e); }
  };

  // ---------- sons en boucle contrôlables ----------
  A.loop = function (name) {
    if (!A.ready) return null;
    if (A.loops[name]) return A.loops[name];
    const c = A.ctx;
    const g = c.createGain(); g.gain.value = 0;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) { g.connect(pan); pan.connect(A.sfxBus); } else g.connect(A.sfxBus);
    const L = { gain: g, pan, nodes: [], target: 0, name };
    const n = c.createBufferSource(); n.buffer = A.noise; n.loop = true; n.start();
    if (name === 'wind') {
      const f = filt('bandpass', 600, 0.6); n.connect(f); f.connect(g); L.filter = f;
    } else if (name === 'storm') {
      const nb = c.createBufferSource(); nb.buffer = A.brown; nb.loop = true; nb.start();
      const f = filt('lowpass', 380, 0.8); nb.connect(f); f.connect(g);
      const f2 = filt('bandpass', 1800, 0.5); const g2 = c.createGain(); g2.gain.value = 0.12; n.connect(f2); f2.connect(g2); g2.connect(g);
      const lfo = c.createOscillator(); lfo.frequency.value = 0.15; const lg = c.createGain(); lg.gain.value = 150; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      L.nodes.push(nb, lfo);
      L.filter = f;
    } else if (name === 'chest') {
      n.disconnect && 0;
      const base = 523.25;
      [1, 1.26, 1.5, 2].forEach((m, i) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = base * m * (i === 3 ? 1.002 : 1);
        const og = c.createGain(); og.gain.value = 0.05;
        const trem = c.createOscillator(); trem.frequency.value = 5 + i * 1.3; const tg = c.createGain(); tg.gain.value = 0.03;
        trem.connect(tg); tg.connect(og.gain); trem.start();
        o.connect(og); og.connect(g); o.start(); L.nodes.push(o, trem);
      });
      const f = filt('highpass', 7000, 0.5); const ng = c.createGain(); ng.gain.value = 0.05; n.connect(f); f.connect(ng); ng.connect(g);
    } else if (name === 'bus') {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 52; const f = filt('lowpass', 260, 1.5);
      o.connect(f); f.connect(g); o.start(); L.nodes.push(o);
      const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 26; const g2 = c.createGain(); g2.gain.value = 0.3; o2.connect(g2); g2.connect(f); o2.start(); L.nodes.push(o2);
      const nf = filt('bandpass', 900, 0.5); const ng = c.createGain(); ng.gain.value = 0.3; n.connect(nf); nf.connect(ng); ng.connect(g);
    } else if (name === 'engine') {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 40; const f = filt('lowpass', 500, 2);
      o.connect(f); f.connect(g); o.start(); L.nodes.push(o); L.osc = o; L.filter = f;
      const nf = filt('bandpass', 600, 0.8); const ng = c.createGain(); ng.gain.value = 0.15; n.connect(nf); nf.connect(ng); ng.connect(g);
    } else if (name === 'ocean') {
      const nb = c.createBufferSource(); nb.buffer = A.brown; nb.loop = true; nb.start();
      const f = filt('lowpass', 600, 0.5); nb.connect(f); f.connect(g);
      const lfo = c.createOscillator(); lfo.frequency.value = 0.12; const lg = c.createGain(); lg.gain.value = 0.5;
      const amp = c.createGain(); amp.gain.value = 0.5; f.disconnect(); f.connect(amp); amp.connect(g); lfo.connect(lg); lg.connect(amp.gain); lfo.start();
      L.nodes.push(nb, lfo);
    } else if (name === 'minigun_spin') {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 90; const f = filt('bandpass', 700, 2);
      o.connect(f); f.connect(g); o.start(); L.nodes.push(o); L.osc = o;
    } else if (name === 'rain') {
      const f = filt('highpass', 700, 0.5); const f2 = filt('lowpass', 5200, 0.4); n.connect(f); f.connect(f2); f2.connect(g); L.filter = f2;
      const nb = c.createBufferSource(); nb.buffer = A.brown; nb.loop = true; nb.start(); const lf = filt('lowpass', 300, 0.6); const lg = c.createGain(); lg.gain.value = 0.6; nb.connect(lf); lf.connect(lg); lg.connect(g); L.nodes.push(nb);
    } else if (name === 'zipline') {
      const f = filt('bandpass', 2400, 1.2); n.connect(f); f.connect(g);
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 820; const og = c.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(g); o.start(); L.nodes.push(o); L.osc = o;
    } else if (name === 'tornado') {
      // grondement grave + sifflement du vent qui ondule
      const nb = c.createBufferSource(); nb.buffer = A.brown; nb.loop = true; nb.start();
      const f = filt('lowpass', 260, 0.9); nb.connect(f); f.connect(g);
      const f2 = filt('bandpass', 700, 0.9); const g2 = c.createGain(); g2.gain.value = 0.35; n.connect(f2); f2.connect(g2); g2.connect(g);
      const lfo = c.createOscillator(); lfo.frequency.value = 0.35; const lg = c.createGain(); lg.gain.value = 320; lfo.connect(lg); lg.connect(f2.frequency); lfo.start();
      L.nodes.push(nb, lfo);
    } else if (name === 'fire') {
      const f = filt('lowpass', 900, 0.5); n.connect(f); f.connect(g);
    }
    L.nodes.push(n);
    A.loops[name] = L;
    return L;
  };
  const AMBIENT = { storm: 1, rain: 1, wind: 1, tornado: 1, ocean: 1 };
  A.ambVol = () => (G.Store && G.Store.data && G.Store.data.settings.volAmbience != null ? G.Store.data.settings.volAmbience : 0.6);
  A.setLoop = function (name, vol, pan, param) {
    if (!A.ready || A.ctx.state !== 'running') return;
    const L = A.loop(name);
    if (!L) return;
    const t = A.ctx.currentTime;
    if (AMBIENT[name]) vol *= A.ambVol();
    L.gain.gain.setTargetAtTime(Math.max(0, vol), t, 0.08);
    if (L.pan && pan != null) L.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.05);
    if (param != null) {
      if (name === 'wind' && L.filter) L.filter.frequency.setTargetAtTime(300 + param * 1500, t, 0.1);
      if (name === 'rain' && L.filter) L.filter.frequency.setTargetAtTime(5200 - param * 3800, t, 0.2);
      if (name === 'zipline' && L.osc) L.osc.frequency.setTargetAtTime(600 + param * 500, t, 0.1);
      if ((name === 'engine' || name === 'minigun_spin') && L.osc) L.osc.frequency.setTargetAtTime(name === 'engine' ? 35 + param * 90 : 60 + param * 140, t, 0.05);
      if (name === 'engine' && L.filter) L.filter.frequency.setTargetAtTime(300 + param * 1200, t, 0.05);
    }
  };
  A.stopAllLoops = function () {
    for (const k in A.loops) A.setLoop(k, 0);
  };
  // Pan/gain spatial d'une position pour les boucles
  A.spatialOf = function (pos, ref, maxD) {
    return spatial(pos, ref, maxD);
  };

  // ============================================================
  //  Musique : séquenceur simple (pas = double-croche)
  // ============================================================
  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function instNote(inst, t, midi, dur, vel, dest) {
    const c = A.ctx;
    const f = NOTE(midi);
    if (inst === 'bass') {
      const o = osc('sawtooth', f, t, dur + 0.1);
      const fl = filt('lowpass', 300 + vel * 900, 3);
      fl.frequency.setValueAtTime(1800 * vel, t); fl.frequency.exponentialRampToValueAtTime(220, t + dur);
      const e = env(t, 0.005, dur * 0.6, dur * 0.5, 0.35 * vel);
      chain(o, fl, e, dest);
    } else if (inst === 'lead') {
      const o1 = osc('square', f, t, dur + 0.2), o2 = osc('sawtooth', f, t, dur + 0.2); o2.detune.value = 8;
      const fl = filt('lowpass', 2600, 1);
      const e = env(t, 0.01, dur * 0.7, 0.2, 0.09 * vel);
      o1.connect(fl); o2.connect(fl); chain(fl, e, dest);
    } else if (inst === 'pluck') {
      const o = osc('triangle', f, t, dur + 0.3);
      const e = env(t, 0.002, 0.02, 0.25 + dur * 0.3, 0.16 * vel);
      chain(o, e, dest);
      const o2 = osc('sine', f * 2, t, 0.3); const e2 = env(t, 0.002, 0, 0.15, 0.05 * vel); chain(o2, e2, dest);
    } else if (inst === 'pad') {
      [-6, 6].forEach((dt) => {
        const o = osc('sawtooth', f, t, dur + 0.6); o.detune.value = dt;
        const fl = filt('lowpass', 1200, 0.5);
        const e = env(t, 0.25, dur, 0.5, 0.035 * vel);
        chain(o, fl, e, dest);
      });
    } else if (inst === 'brass') {
      const o = osc('sawtooth', f, t, dur + 0.3), o2 = osc('sawtooth', f * 1.003, t, dur + 0.3);
      const fl = filt('lowpass', 600, 1.2);
      fl.frequency.setValueAtTime(600, t); fl.frequency.linearRampToValueAtTime(3200 * vel, t + 0.06); fl.frequency.linearRampToValueAtTime(1600, t + dur);
      const e = env(t, 0.03, dur * 0.8, 0.25, 0.1 * vel);
      o.connect(fl); o2.connect(fl); chain(fl, e, dest);
    } else if (inst === 'bell') {
      [1, 2.01, 3.99].forEach((m, i) => { const o = osc('sine', f * m, t, 1.2); const e = env(t, 0.002, 0, 0.9 / (i + 1), 0.08 * vel / (i + 1)); chain(o, e, dest); });
    } else if (inst === 'kick') {
      const o = osc('sine', 150, t, 0.4); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      const e = env(t, 0.001, 0.02, 0.25, 0.9 * vel); chain(o, e, dest);
    } else if (inst === 'snare') {
      burst(dest, t, { type: 'highpass', f: 1500, a: 0.001, h: 0.01, r: 0.15, v: 0.35 * vel });
      tone(dest, t, { f: 220, fEnd: 150, a: 0.001, h: 0, r: 0.08, v: 0.3 * vel, type: 'triangle' });
    } else if (inst === 'clap') {
      for (let i = 0; i < 3; i++) burst(dest, t + i * 0.012, { type: 'bandpass', f: 1400, q: 1, a: 0.001, h: 0.005, r: 0.08, v: 0.3 * vel });
    } else if (inst === 'hat') {
      burst(dest, t, { type: 'highpass', f: 7500, a: 0.001, h: 0, r: 0.04 + (dur > 0.2 ? 0.15 : 0), v: 0.15 * vel });
    } else if (inst === 'crash') {
      burst(dest, t, { type: 'highpass', f: 5000, a: 0.001, h: 0.05, r: 1.5, v: 0.3 * vel });
    }
  }

  // Construit un morceau à partir d'accords
  function song(def) {
    return def;
  }

  // Thème du menu : énergique, progression Am-F-C-G
  function buildMenuTheme() {
    const tracks = [];
    const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
    const bars = chords.length;
    const notes = { bass: [], pad: [], pluck: [], kick: [], snare: [], hat: [], lead: [] };
    for (let b = 0; b < bars; b++) {
      const ch = chords[b];
      const s0 = b * 16;
      notes.pad.push([s0, ch[0] + 12, 16, 0.8], [s0, ch[1] + 12, 16, 0.8], [s0, ch[2] + 12, 16, 0.8]);
      const root = ch[0] - 12;
      [0, 3, 6, 8, 10, 12, 14].forEach((s, i) => notes.bass.push([s0 + s, root + (i === 4 ? 12 : 0), 2, i === 0 ? 1 : 0.8]));
      for (let s = 0; s < 16; s += 2) notes.pluck.push([s0 + s, ch[(s / 2) % 3] + 24, 1, 0.7 + ((s / 2) % 4 === 0 ? 0.3 : 0)]);
      [0, 4, 8, 12].forEach((s) => notes.kick.push([s0 + s, 36, 1, 1]));
      [4, 12].forEach((s) => notes.snare.push([s0 + s, 40, 1, 1]));
      for (let s = 2; s < 16; s += 4) notes.hat.push([s0 + s, 42, 1, 0.9]);
      for (let s = 0; s < 16; s += 1) if (s % 2 === 1) notes.hat.push([s0 + s, 42, 1, 0.4]);
    }
    const mel = [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 79, 4],
      [16, 77, 3], [19, 76, 1], [20, 74, 2], [22, 72, 2], [24, 74, 6], [30, 72, 2],
      [32, 72, 3], [35, 74, 1], [36, 76, 2], [38, 79, 2], [40, 81, 4], [44, 79, 4],
      [48, 77, 2], [50, 76, 2], [52, 74, 4], [56, 76, 8]];
    for (let rep = 0; rep < 2; rep++) mel.forEach((m) => notes.lead.push([m[0] + rep * 64, m[1], m[2], 0.9]));
    for (const k in notes) tracks.push({ inst: k, notes: notes[k] });
    return { bpm: 118, steps: bars * 16, tracks, loop: true };
  }

  function buildVictoryTheme() {
    const notes = { brass: [], pad: [], kick: [], snare: [], crash: [], bell: [], bass: [] };
    const mel = [[0, 67, 2], [2, 67, 1], [3, 67, 1], [4, 72, 6], [10, 72, 2], [12, 76, 4],
      [16, 74, 2], [18, 72, 2], [20, 74, 2], [22, 76, 2], [24, 79, 8],
      [32, 81, 4], [36, 79, 4], [40, 76, 4], [44, 77, 4], [48, 79, 12]];
    mel.forEach((m) => { notes.brass.push([m[0], m[1], m[2], 1]); notes.brass.push([m[0], m[1] - 12, m[2], 0.7]); });
    const ch = [[48, 55, 64], [53, 57, 65], [55, 59, 67], [48, 55, 64]];
    ch.forEach((c, i) => { c.forEach((n) => notes.pad.push([i * 16, n + 12, 16, 1])); notes.bass.push([i * 16, c[0] - 12, 8, 1], [i * 16 + 8, c[0] - 12, 8, 0.8]); });
    for (let s = 0; s < 64; s += 4) notes.kick.push([s, 36, 1, 1]);
    for (let s = 4; s < 64; s += 8) notes.snare.push([s, 40, 1, 1]);
    notes.crash.push([0, 49, 1, 1], [32, 49, 1, 1], [48, 49, 1, 1]);
    [79, 84, 88, 91].forEach((n, i) => notes.bell.push([48 + i * 2, n, 4, 1]));
    const tracks = [];
    for (const k in notes) tracks.push({ inst: k, notes: notes[k] });
    return { bpm: 104, steps: 64, tracks, loop: false };
  }

  function buildDefeatTheme() {
    const notes = { pad: [], bell: [], bass: [] };
    [[57, 60, 64], [53, 57, 60], [52, 55, 59], [45, 52, 57]].forEach((c, i) => { c.forEach((n) => notes.pad.push([i * 8, n, 8, 0.8])); notes.bass.push([i * 8, c[0] - 12, 8, 0.6]); });
    [[0, 76], [4, 74], [8, 72], [12, 71], [16, 69], [20, 67], [24, 69]].forEach((m) => notes.bell.push([m[0], m[1], 4, 0.8]));
    const tracks = [];
    for (const k in notes) tracks.push({ inst: k, notes: notes[k] });
    return { bpm: 80, steps: 32, tracks, loop: false };
  }

  // Fin de partie : boucle tendue (ré mineur), basse pulsée et cordes en staccato
  function buildEndgameTheme() {
    const notes = { bass: [], pluck: [], pad: [], kick: [], snare: [], hat: [], lead: [], crash: [] };
    const prog = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]]; // Dm - Bb - C - A
    const bars = 8;
    for (let b = 0; b < bars; b++) {
      const ch = prog[b % 4], o = b * 16;
      for (let s = 0; s < 16; s += 2) notes.bass.push([o + s, ch[0] - 12, 1.5, s % 4 === 0 ? 1 : 0.75]);
      for (let s = 0; s < 16; s++) if (s % 4 !== 3) notes.pluck.push([o + s, ch[s % 3] + 12 + (s % 8 === 6 ? 12 : 0), 0.6, s % 4 === 0 ? 0.8 : 0.5]);
      ch.forEach((n) => notes.pad.push([o, n + 12, 16, 0.45]));
      [0, 6, 10].forEach((s) => notes.kick.push([o + s, 36, 1, 1]));
      [4, 12].forEach((s) => notes.snare.push([o + s, 40, 1, b >= 4 ? 1 : 0.7]));
      for (let s = 0; s < 16; s += 2) notes.hat.push([o + s, 42, 1, 0.5]);
      if (b === 7) [8, 10, 12, 13, 14, 15].forEach((s) => notes.snare.push([o + s, 40, 1, 0.6 + s * 0.02]));
    }
    notes.crash.push([0, 49, 1, 0.7], [64, 49, 1, 0.8]);
    [[64, 74, 4], [68, 72, 2], [70, 69, 2], [72, 70, 6], [78, 69, 2], [80, 72, 4], [84, 74, 2], [86, 76, 2], [88, 77, 6], [94, 76, 2],
      [96, 74, 4], [100, 72, 2], [102, 70, 2], [104, 69, 8], [112, 73, 4], [116, 76, 4], [120, 81, 8]].forEach((m) => notes.lead.push([m[0], m[1], m[2], 0.7]));
    const tracks = [];
    for (const k in notes) tracks.push({ inst: k, notes: notes[k] });
    return { bpm: 138, steps: bars * 16, tracks, loop: true };
  }

  // Petites boucles pour les emotes
  A.emoteSongs = {};
  function buildEmoteSong(style) {
    const notes = { kick: [], snare: [], hat: [], bass: [], pluck: [], lead: [], clap: [] };
    let bpm = 120, bars = 2;
    const pat = (arr, inst, midi, len, vel) => arr.forEach((s) => notes[inst].push([s, midi, len || 1, vel || 1]));
    if (style === 'disco') {
      bpm = 124;
      for (let b = 0; b < bars; b++) { const o = b * 16; pat([0, 4, 8, 12].map((s) => s + o), 'kick', 36); pat([2, 6, 10, 14].map((s) => s + o), 'hat', 42, 3); pat([4, 12].map((s) => s + o), 'clap', 39);
        [0, 2, 3, 6, 8, 10, 11, 14].forEach((s, i) => notes.bass.push([o + s, (b ? 41 : 45) + (i % 2 ? 12 : 0), 1, 0.9])); }
      [[0, 69], [3, 72], [6, 76], [8, 74], [11, 72], [14, 69], [16, 65], [19, 69], [22, 72], [24, 74], [28, 72]].forEach((m) => notes.pluck.push([m[0], m[1], 2, 1]));
    } else if (style === 'floss') {
      bpm = 132;
      for (let b = 0; b < bars; b++) { const o = b * 16; pat([0, 6, 8, 14].map((s) => s + o), 'kick', 36); pat([4, 12].map((s) => s + o), 'snare', 40); for (let s = 0; s < 16; s += 2) notes.hat.push([o + s, 42, 1, 0.8]);
        [0, 3, 6, 8, 11, 14].forEach((s) => notes.bass.push([o + s, 38, 1, 1])); }
      [[0, 74], [2, 74], [4, 77], [6, 74], [8, 72], [10, 69], [16, 74], [18, 74], [20, 77], [22, 79], [24, 77], [26, 74]].forEach((m) => notes.lead.push([m[0], m[1], 2, 1]));
    } else if (style === 'chill') {
      bpm = 90;
      for (let b = 0; b < bars; b++) { const o = b * 16; pat([0, 10].map((s) => s + o), 'kick', 36); pat([4, 12].map((s) => s + o), 'snare', 40, 1, 0.6); for (let s = 0; s < 16; s += 2) notes.hat.push([o + s, 42, 1, 0.5]); }
      [[0, 60], [0, 64], [0, 67], [16, 57], [16, 60], [16, 64]].forEach((m) => notes.pluck.push([m[0], m[1] + 12, 8, 0.8]));
      [[0, 48], [8, 48], [16, 45], [24, 45]].forEach((m) => notes.bass.push([m[0], m[1], 6, 0.8]));
    } else if (style === 'march') {
      bpm = 110;
      for (let b = 0; b < bars; b++) { const o = b * 16; pat([0, 8].map((s) => s + o), 'kick', 36); pat([4, 6, 12, 13, 14].map((s) => s + o), 'snare', 40, 1, 0.8); }
      [[0, 67], [4, 67], [6, 69], [8, 71], [12, 67], [16, 72], [20, 71], [24, 69], [28, 67]].forEach((m) => notes.lead.push([m[0], m[1], 3, 1]));
    } else { // 'hype'
      bpm = 140;
      for (let b = 0; b < bars; b++) { const o = b * 16; pat([0, 4, 8, 12].map((s) => s + o), 'kick', 36); pat([4, 12].map((s) => s + o), 'clap', 39); for (let s = 0; s < 16; s++) notes.hat.push([o + s, 42, 1, s % 2 ? 0.4 : 0.8]);
        for (let s = 0; s < 16; s += 2) notes.bass.push([o + s, s % 4 ? 43 : 31, 1, 1]); }
      [[0, 79], [2, 79], [4, 82], [6, 79], [8, 77], [10, 74], [12, 77], [14, 79], [16, 79], [18, 79], [20, 84], [22, 82], [24, 79], [28, 77]].forEach((m) => notes.lead.push([m[0], m[1], 1.5, 1]));
    }
    const tracks = [];
    for (const k in notes) if (notes[k].length) tracks.push({ inst: k, notes: notes[k] });
    return { bpm, steps: bars * 16, tracks, loop: true };
  }

  const SONGS = {};
  function getSong(name) {
    if (SONGS[name]) return SONGS[name];
    if (name === 'menu') SONGS[name] = buildMenuTheme();
    else if (name === 'victory') SONGS[name] = buildVictoryTheme();
    else if (name === 'defeat') SONGS[name] = buildDefeatTheme();
    else if (name === 'endgame') SONGS[name] = buildEndgameTheme();
    else if (name.startsWith('emote_')) SONGS[name] = buildEmoteSong(name.slice(6));
    return SONGS[name];
  }

  A.playMusic = function (name, opts) {
    if (!A.ready) return;
    opts = opts || {};
    if (A.music && A.music.name === name && !A.music.stopped) return;
    A.stopMusic(0.4);
    const def = getSong(name);
    if (!def) return;
    const c = A.ctx;
    const bus = c.createGain(); bus.gain.value = 0;
    bus.gain.setTargetAtTime(opts.vol || 1, c.currentTime, 0.3);
    bus.connect(opts.pos ? A.sfxBus : A.musicBus);
    const m = { name, def, bus, step: 0, nextTime: c.currentTime + 0.1, stopped: false, pos: opts.pos || null };
    const stepDur = 60 / def.bpm / 4;
    // index des notes par pas
    const byStep = {};
    def.tracks.forEach((tr) => tr.notes.forEach((n) => { (byStep[n[0]] = byStep[n[0]] || []).push([tr.inst, n[1], n[2], n[3]]); }));
    m.timer = setInterval(() => {
      if (m.stopped) return;
      while (m.nextTime < c.currentTime + 0.25) {
        const list = byStep[m.step];
        if (list) for (const n of list) instNote(n[0], m.nextTime, n[1], n[2] * stepDur, n[3], bus);
        m.step++;
        m.nextTime += stepDur;
        if (m.step >= def.steps) {
          if (def.loop) m.step = 0;
          else { m.stopped = true; setTimeout(() => A.stopMusicObj(m, 1.5), 2500); break; }
        }
      }
    }, 50);
    A.music = m;
    return m;
  };
  A.stopMusicObj = function (m, fade) {
    if (!m) return;
    m.stopped = true;
    clearInterval(m.timer);
    const c = A.ctx;
    m.bus.gain.setTargetAtTime(0, c.currentTime, fade || 0.3);
    setTimeout(() => { try { m.bus.disconnect(); } catch (e) {} }, 3000);
  };
  A.stopMusic = function (fade) {
    if (A.music) { A.stopMusicObj(A.music, fade); A.music = null; }
  };
  // musique d'emote positionnelle (volume ajusté par l'appelant)
  A.setMusicVolume = function (v) { if (A.music) A.music.bus.gain.setTargetAtTime(v, A.ctx.currentTime, 0.1); };
})();
