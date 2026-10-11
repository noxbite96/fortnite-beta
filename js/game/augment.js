// ============================================================
//  AUGMENTATIONS : des bonus à choisir pendant la partie (comme les
//  « augmentations de réalité » de Fortnite). La 1re arrive peu après
//  l'atterrissage, les suivantes à certaines phases de la tempête.
//  Touche U : ouvrir le choix · 1 / 2 : choisir · R : relancer (1 fois)
// ============================================================
(function () {
  const U = G.U, I = G.Items;
  const AG = { open: false, pending: 0, offer: null, rerolls: 0, owned: [], landed: false, firstT: 0, lastPhase: 0, rumbleT: 0, grenT: 0, MAX: 4 };
  G.Aug = AG;

  const LIST = [
    { id: 'agile', ico: '⚡', name: 'Mains agiles', desc: 'Rechargement 30 % plus rapide.' },
    { id: 'recolte', ico: '⛏', name: 'Récolteur', desc: '+50 % de matériaux récoltés à la pioche.', build: true },
    { id: 'aerien', ico: '🪂', name: 'Aérien', desc: 'Plus aucun dégât de chute et sauts plus hauts.' },
    { id: 'siphon', ico: '💠', name: 'Siphon', desc: '+40 PV (puis bouclier) à chaque élimination.' },
    { id: 'sprint', ico: '👟', name: 'Pied léger', desc: 'Sprint 12 % plus rapide.' },
    { id: 'regen', ico: '❤', name: 'Régénération', desc: 'Récupère 2 PV/s après 6 s sans subir de dégâts.' },
    { id: 'tete', ico: '🎯', name: 'Tireur d\'élite', desc: '+25 % de dégâts sur les tirs à la tête.' },
    { id: 'grenadier', ico: '💣', name: 'Grenadier', desc: '3 grenades tout de suite, puis 1 grenade toutes les 45 s.' },
    { id: 'pharma', ico: '💊', name: 'Pharmacien', desc: 'Soins et boucliers utilisés 40 % plus vite.' },
    { id: 'or', ico: '💰', name: 'Chercheur d\'or', desc: '150 lingots tout de suite, lingots ramassés doublés.' },
    { id: 'coffres', ico: '📦', name: 'Radar à coffres', desc: 'Les coffres à moins de 80 m apparaissent sur la carte.' },
    { id: 'recycle', ico: '♻', name: 'Recycleur', desc: 'Chaque élimination : +30 munitions et +50 de chaque matériau.' },
  ];
  AG.LIST = LIST;
  const byId = {}; LIST.forEach((a) => { byId[a.id] = a; });

  const $ = (id) => document.getElementById(id);
  function ui() {
    if ($('aug-dlg')) return;
    const tr = $('topright');
    if (tr) {
      const hint = document.createElement('div'); hint.id = 'aug-hint'; hint.className = 'hidden fn'; hint.innerHTML = '<b>U</b> AUGMENTATION DISPONIBLE';
      const own = document.createElement('div'); own.id = 'aug-owned';
      tr.appendChild(hint); tr.appendChild(own);
    }
    const d = document.createElement('div'); d.id = 'aug-dlg'; d.className = 'hidden';
    $('hud').appendChild(d);
    d.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  // ------------------------------------------------------------
  //  Début de partie
  // ------------------------------------------------------------
  AG.setup = function () {
    ui();
    AG.close();
    AG.owned = []; AG.pending = 0; AG.offer = null; AG.rerolls = 0;
    AG.landed = false; AG.firstT = 0; AG.lastPhase = 0; AG.rumbleT = 0; AG.grenT = 0;
    if (G.player) { G.player.aug = {}; G.player.calmT = 0; }
    renderOwned(); renderHint();
  };

  function pool() {
    const M = G.Match;
    return LIST.filter((a) => !AG.owned.includes(a.id) && !(a.build && M && M.zeroBuild) && !(AG.offer && AG.offer.includes(a.id)));
  }
  function makeOffer() {
    const p = pool();
    const a = p.splice(Math.floor(Math.random() * p.length), 1)[0];
    const b = p.splice(Math.floor(Math.random() * p.length), 1)[0];
    AG.offer = [a, b].filter(Boolean).map((x) => x.id);
    AG.rerolls = 1;
  }
  AG.grant = function () {
    if (AG.owned.length + AG.pending >= AG.MAX + (G.Match && G.Match.playground ? 8 : 0)) return;
    if (AG.owned.length + AG.pending >= LIST.length) return;
    AG.pending++;
    if (!AG.offer) makeOffer();
    G.HUD.notify('NOUVELLE AUGMENTATION ! (touche U)', 2.5, 'upgrade');
    G.Audio.play('levelup');
    renderHint();
  };

  AG.choose = function (i) {
    if (!AG.offer || !AG.offer[i]) return;
    const id = AG.offer[i], a = byId[id], pl = G.player;
    AG.owned.push(id); pl.aug = pl.aug || {}; pl.aug[id] = true;
    AG.pending = Math.max(0, AG.pending - 1);
    AG.offer = null;
    if (AG.pending > 0) makeOffer();
    // effets immédiats
    if (id === 'grenadier') { giveGrenades(3); AG.grenT = 45; }
    if (id === 'or') { pl.gold = Math.min(9999, (pl.gold || 0) + 150); G.Audio.play('coin'); }
    G.Audio.play('buy');
    G.HUD.notify('AUGMENTATION : ' + a.name.toUpperCase(), 2, 'upgrade');
    if (G.Match) G.Match.challengeEvent('aug', 1);
    AG.close();
    renderOwned(); renderHint();
  };
  AG.reroll = function () {
    if (!AG.offer || AG.rerolls <= 0 || pool().length < 1) return;
    const keep = AG.rerolls - 1;
    const old = AG.offer.slice();
    // nouvelle paire différente de l'ancienne
    const p = LIST.filter((a) => !AG.owned.includes(a.id) && !old.includes(a.id) && !(a.build && G.Match && G.Match.zeroBuild));
    const a = p.splice(Math.floor(Math.random() * p.length), 1)[0];
    const b = p.length ? p.splice(Math.floor(Math.random() * p.length), 1)[0] : byId[old[1]];
    AG.offer = [a, b].filter(Boolean).map((x) => x.id);
    AG.rerolls = keep;
    G.Audio.play('ui_click');
    render();
  };

  function giveGrenades(n) {
    const pl = G.player;
    const it = I.make('grenade', null, n);
    if (!pl.takeItem(it, false)) G.Loot.spawn({ kind: 'item', item: it }, pl.pos.x, pl.pos.y + 0.3, pl.pos.z);
    G.HUD.pickupNote(n + ' grenade' + (n > 1 ? 's' : '') + ' (Grenadier)', '#7dff6a');
  }

  // ------------------------------------------------------------
  //  Fenêtre de choix
  // ------------------------------------------------------------
  function render() {
    const d = $('aug-dlg'); if (!d || !AG.offer) return;
    let s = '<div class="ag-t fn">CHOISISSEZ UNE AUGMENTATION</div><div class="ag-cards">';
    AG.offer.forEach((id, i) => {
      const a = byId[id];
      s += `<div class="ag-card" data-i="${i}"><div class="ag-k fn">${i + 1}</div><div class="ag-ico">${a.ico}</div><div class="ag-n fn">${a.name}</div><div class="ag-d">${a.desc}</div></div>`;
    });
    s += '</div><div class="ag-f">' + (AG.rerolls > 0 ? '<b>R</b> relancer (1) · ' : '') + '<b>U</b> / <b>Échap</b> plus tard' + (AG.pending > 1 ? ' · encore ' + (AG.pending - 1) + ' après celle-ci' : '') + '</div>';
    d.innerHTML = s;
    d.querySelectorAll('.ag-card').forEach((c) => c.onclick = () => AG.choose(+c.dataset.i));
  }
  AG.openDlg = function () {
    if (!AG.offer || AG.pending <= 0) return;
    const pl = G.player;
    if (!pl || pl.dead || pl.downed) return;
    AG.open = true;
    render();
    $('aug-dlg').classList.remove('hidden');
    G.Audio.play('ui_click');
  };
  AG.close = function () {
    AG.open = false;
    const d = $('aug-dlg'); if (d) d.classList.add('hidden');
  };
  function renderHint() {
    const h = $('aug-hint'); if (!h) return;
    h.classList.toggle('hidden', !(AG.pending > 0));
    h.innerHTML = '<b>U</b> AUGMENTATION' + (AG.pending > 1 ? 'S' : '') + ' DISPONIBLE' + (AG.pending > 1 ? 'S (' + AG.pending + ')' : '');
  }
  function renderOwned() {
    const o = $('aug-owned'); if (!o) return;
    o.innerHTML = AG.owned.map((id) => `<span class="ag-chip" title="${byId[id].name}"><i>${byId[id].ico}</i>${byId[id].name}</span>`).join('');
  }

  document.addEventListener('keydown', (e) => {
    if (!G.Game || G.Game.state !== 'playing' || !G.Match || G.Match.endShown) return;
    const k = e.code;
    if (AG.open) {
      if (k === 'Escape' || k === 'KeyU') { e.preventDefault(); e.stopPropagation(); AG.close(); G.Audio.play('ui_back'); return; }
      const m = /^(Digit|Numpad)([12])$/.exec(k);
      if (m) { e.preventDefault(); e.stopPropagation(); AG.choose(+m[2] - 1); return; }
      if (k === 'KeyR') { e.preventDefault(); e.stopPropagation(); AG.reroll(); }
      return;
    }
    if (G.Input.hit('augment') && !e.repeat && AG.pending > 0 && !(G.HUD && G.HUD.modalOpen())) { e.preventDefault(); AG.openDlg(); }
  }, true);

  // ------------------------------------------------------------
  //  Déroulement : quand gagne-t-on une augmentation ?
  // ------------------------------------------------------------
  AG.update = function (dt) {
    const pl = G.player, M = G.Match;
    if (!pl || !M || G.Game.state !== 'playing') return;
    if (AG.open && (pl.dead || pl.downed || M.endShown)) AG.close();
    if (pl.dead) return;
    pl.calmT = (pl.calmT || 0) + dt;
    if (!M.playground) {
      if (!AG.landed && pl.state === 'ground') { AG.landed = true; AG.firstT = 35; }
      if (AG.landed && AG.firstT > 0) { AG.firstT -= dt; if (AG.firstT <= 0) AG.grant(); }
      if (M.rumble) {
        AG.rumbleT += dt;
        if (AG.rumbleT >= 100) { AG.rumbleT = 0; AG.grant(); }
      } else if (G.Storm && G.Storm.phase !== AG.lastPhase) {
        AG.lastPhase = G.Storm.phase;
        if (AG.lastPhase === 2 || AG.lastPhase === 4 || AG.lastPhase === 6) AG.grant();
      }
    }
    const a = pl.aug; if (!a) return;
    // Régénération
    if (a.regen && pl.calmT > 6 && pl.health < 100 && !pl.downed) pl.health = Math.min(100, pl.health + 2 * dt);
    // Grenadier
    if (a.grenadier) {
      AG.grenT -= dt;
      if (AG.grenT <= 0) {
        AG.grenT = 45;
        const have = pl.slots.reduce((n, s) => n + (s && s.id === 'grenade' ? s.count || 1 : 0), 0);
        if (have < 6) giveGrenades(1);
      }
    }
  };

  // Éliminations : Siphon et Recycleur
  AG.onElimination = function (victim, killer) {
    if (!killer || !killer.isPlayer || !killer.aug || victim === killer || victim.isCreature || victim.isDummy) return;
    const a = killer.aug;
    if (a.siphon) {
      let n = 40;
      const h = Math.min(n, 100 - killer.health); killer.health += h; n -= h;
      killer.shield = Math.min(100, killer.shield + n);
      G.HUD.pickupNote('+40 Siphon', '#6ac8ff');
    }
    if (a.recycle) {
      const it = killer.curWeapon && killer.curWeapon();
      if (it && I.WEAPONS[it.id] && !I.WEAPONS[it.id].noAmmo) { const t = I.WEAPONS[it.id].ammo; killer.ammo[t] = Math.min(999, (killer.ammo[t] || 0) + 30); }
      if (!(G.Match && G.Match.zeroBuild)) for (const t of ['wood', 'stone', 'metal']) killer.addMaterial(t, 50);
    }
  };

  // Radar à coffres : coffres proches sur la mini-carte et la grande carte
  AG.mapIcons = function (ctx, toMap, big) {
    const pl = G.player;
    if (!pl || !pl.aug || !pl.aug.coffres || pl.dead) return;
    const s = big ? 1.3 : 1;
    for (const c of G.Loot.chests) {
      if (!c.active || c.opened) continue;
      if (Math.abs(c.x - pl.pos.x) > 80 || Math.abs(c.z - pl.pos.z) > 80 || Math.hypot(c.x - pl.pos.x, c.z - pl.pos.z) > 80) continue;
      const m = toMap(c.x, c.z);
      ctx.fillStyle = '#000'; ctx.fillRect(m[0] - 5 * s, m[1] - 4 * s, 10 * s, 8 * s);
      ctx.fillStyle = '#ffc830'; ctx.fillRect(m[0] - 4 * s, m[1] - 3 * s, 8 * s, 6 * s);
      ctx.fillStyle = '#7a4a10'; ctx.fillRect(m[0] - 4 * s, m[1] - 0.5 * s, 8 * s, 1.2 * s);
    }
  };
})();
