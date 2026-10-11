// ============================================================
//  Panneau d'administration : tableau de bord, gestion des
//  comptes, réglages du serveur, journal d'audit.
//
//  Les droits sont vérifiés côté G.Auth (rangs joueur /
//  modérateur / administrateur) ; l'interface n'est qu'un
//  reflet de ce que le module autorise réellement.
// ============================================================
(function () {
  const AD = { root: null, tab: 'board', sort: 'username', dir: 1, query: '', open: false, detail: null };
  G.AdminUI = AD;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

  function ago(ts) {
    if (!ts) return 'jamais';
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'à l\'instant';
    if (s < 3600) return 'il y a ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.floor(s / 3600) + ' h';
    if (s < 86400 * 30) return 'il y a ' + Math.floor(s / 86400) + ' j';
    return new Date(ts).toLocaleDateString('fr-FR');
  }
  function stamp(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function dur(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    if (sec < 60) return sec + ' s';
    if (sec < 3600) return Math.floor(sec / 60) + ' min';
    return Math.floor(sec / 3600) + ' h ' + Math.floor((sec % 3600) / 60) + ' min';
  }

  // ------------------------------------------------------------
  //  Montage
  // ------------------------------------------------------------
  AD.init = function () {
    if (AD.root) return;
    const el = document.createElement('div');
    el.id = 'admin-root';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="adm-bg"></div>
      <div class="adm-wrap">
        <div class="adm-head">
          <h1>PANNEAU D'ADMINISTRATION</h1>
          <span class="adm-badge" id="adm-me">—</span>
          <div class="spacer"></div>
          <button class="btn" id="adm-export">Exporter la base</button>
          <button class="btn red" id="adm-close">Fermer</button>
        </div>
        <div class="adm-box">
          <div class="adm-tabs">
            <button data-t="board" class="sel">Tableau de bord</button>
            <button data-t="users">Comptes</button>
            <button data-t="rules">Règles</button>
            <button data-t="codes">Codes</button>
            <button data-t="creative">Créatif</button>
            <button data-t="site">Réglages</button>
            <button data-t="log">Journal</button>
          </div>
          <div class="adm-body" id="adm-body"></div>
        </div>
      </div>`;
    document.body.appendChild(el);
    AD.root = el;

    el.querySelectorAll('.adm-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        G.Audio.play('ui_click');
        AD.tab = b.dataset.t;
        el.querySelectorAll('.adm-tabs button').forEach((x) => x.classList.toggle('sel', x === b));
        AD.render();
      });
    });
    $('adm-close').addEventListener('click', () => { G.Audio.play('ui_back'); AD.close(); });
    $('adm-export').addEventListener('click', () => {
      const json = G.Auth.exportJSON();
      if (!json) return AD.toast('Permission refusée.', true);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'comptes-fortnite.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      AD.toast('Base exportée.');
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); AD.close(); }
    });
  };

  AD.openPanel = function () {
    AD.init();
    if (!G.Auth.can('users.view')) { G.HUD.notify('Accès réservé à l\'équipe.', 3); return; }
    AD.open = true;
    $('admin-root').classList.remove('hidden');
    const me = G.Auth.session();
    const b = $('adm-me');
    b.textContent = me.username + ' · ' + (G.Auth.RANK_LABEL[me.role] || me.role);
    b.className = 'adm-badge ' + me.role;
    AD.render();
  };
  AD.close = function () {
    AD.open = false;
    if (AD.root) AD.root.classList.add('hidden');
    if (G.Menu) G.Menu.refreshTop();
  };

  AD.toast = function (text, isErr) {
    G.HUD.notify(text, isErr ? 4 : 2.6);
  };

  // ------------------------------------------------------------
  //  Rendu
  // ------------------------------------------------------------
  AD.render = function () {
    const body = $('adm-body');
    if (!body) return;
    AD.detail = null;
    if (AD.tab === 'board') body.innerHTML = AD.boardHTML();
    else if (AD.tab === 'users') { body.innerHTML = AD.usersHTML(); AD.bindUsers(); }
    else if (AD.tab === 'rules') { body.innerHTML = AD.rulesHTML(); AD.bindRules(); }
    else if (AD.tab === 'codes') { body.innerHTML = AD.codesHTML(); AD.bindCodes(); }
    else if (AD.tab === 'creative') { body.innerHTML = AD.creativeHTML(); AD.bindCreative(); }
    else if (AD.tab === 'site') { body.innerHTML = AD.siteHTML(); AD.bindSite(); }
    else body.innerHTML = AD.logHTML();
  };

  // ---------- tableau de bord ----------
  AD.boardHTML = function () {
    const s = G.Auth.stats();
    const card = (v, l, cls) => `<div class="adm-card ${cls || ''}"><div class="v">${v}</div><div class="l">${l}</div></div>`;
    return `
      <div class="adm-h3">Vue d'ensemble</div>
      <div class="adm-cards">
        ${card(s.accounts, 'comptes enregistrés')}
        ${card(s.active24, 'connectés dans les 24 h', 'alt')}
        ${card(s.staff, 'membres de l\'équipe', 'alt')}
        ${card(s.banned, 'comptes bannis', 'warn')}
        ${card(s.played, 'comptes ayant joué')}
        ${card(s.avgLevel, 'niveau moyen')}
        ${card(s.matches, 'parties jouées (cumul)')}
        ${card(s.winRate + ' %', 'taux de victoire')}
        ${card(s.kills, 'éliminations (cumul)')}
        ${card(dur(s.playTime), 'temps de jeu cumulé')}
        ${card(s.vbucks.toLocaleString('fr-FR'), 'V-Bucks en circulation', 'alt')}
      </div>
      <div class="adm-h3" style="margin-top:22px">Session actuelle</div>
      <div class="adm-note">${G.Auth.session()
        ? 'Connecté en tant que <b>' + esc(G.Auth.session().username) + '</b> — rang <b>' + esc(G.Auth.RANK_LABEL[G.Auth.session().role]) + '</b>. Les actions ci-dessous sont journalisées.'
        : 'Aucune session ouverte.'}</div>
      ${AD.lastLogHTML(8)}`;
  };
  AD.lastLogHTML = function (n) {
    const log = G.Auth.auditLog().slice(0, n);
    if (!log.length) return '<div class="adm-note">Journal vide.</div>';
    return `<div class="adm-log">${log.map(AD.logRow).join('')}</div>`;
  };
  AD.logRow = function (e) {
    const cls = /ban|delete|resetpw|nuke/.test(e.code) ? 'bad' : /signup|unban|grant/.test(e.code) ? 'good' : '';
    return `<div><span class="t">${stamp(e.t)}</span><span class="tag">${esc(e.code)}</span><span class="by">${esc(e.by)}</span>${e.target ? '<b>' + esc(e.target) + '</b> ' : ''}<span class="${cls}">${esc(e.info)}</span></div>`;
  };

  // ---------- comptes ----------
  AD.usersHTML = function () {
    const me = G.Auth.session();
    let list = G.Auth.list();
    if (AD.query) {
      const q = AD.query.toLowerCase();
      list = list.filter((u) => u.username.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
    }
    const key = AD.sort;
    list.sort((a, b) => {
      let x = a[key], y = b[key];
      if (typeof x === 'string') return AD.dir * x.localeCompare(y, 'fr');
      return AD.dir * ((x || 0) - (y || 0));
    });
    const saveOf = (u) => G.Auth.readSave(u.id);
    const row = (u) => {
      const sv = saveOf(u);
      const isMe = me && me.id === u.id;
      const canRole = G.Auth.can('users.role') && !u.root && !isMe;
      const canDel = G.Auth.can('users.delete') && !u.root && !isMe;
      const canBan = G.Auth.can('users.ban') && !u.root && !isMe;
      return `<tr class="${isMe ? 'me' : ''}">
        <td><span class="u">${esc(u.username)}</span>${isMe ? ' <span class="pill ok">vous</span>' : ''}${u.root ? ' <span class="pill admin">fondateur</span>' : ''}<div class="mail">${esc(u.email || '—')}</div></td>
        <td><span class="pill ${u.role}">${esc(G.Auth.RANK_LABEL[u.role])}</span></td>
        <td>${stamp(u.created)}</td>
        <td>${u.logins}<div class="mail">${ago(u.lastLogin)}</div></td>
        <td>${sv ? sv.level : '—'}</td>
        <td>${sv ? (sv.vbucks || 0).toLocaleString('fr-FR') : '—'}</td>
        <td><span class="pill ${u.banned ? 'ban' : (u.lockedUntil > Date.now() ? 'off' : 'ok')}">${u.banned ? 'banni' : (u.lockedUntil > Date.now() ? 'bloqué' : 'actif')}</span>${u.banned && G.Auth.banRemaining(u) ? `<div class="mail">encore ${esc(G.Auth.banRemaining(u))}</div>` : (u.banned ? `<div class="mail">${esc(u.banReason)}</div>` : '')}</td>
        <td class="act-cell"><div class="adm-act">
          <button class="mini" data-a="view" data-id="${u.id}" data-name="${esc(u.username)}">Fiche</button>
          ${canBan ? `<button class="mini ${u.banned ? '' : 'danger'}" data-a="ban" data-id="${u.id}" data-name="${esc(u.username)}">${u.banned ? 'Débannir' : 'Bannir'}</button>` : ''}
          ${G.Auth.can('users.grant') ? `<button class="mini gold" data-a="vb" data-id="${u.id}" data-name="${esc(u.username)}">+VB</button>` : ''}
          ${G.Auth.can('users.grant') ? `<button class="mini gold" data-a="lvl" data-id="${u.id}" data-name="${esc(u.username)}">Niv.</button>` : ''}
          ${G.Auth.can('users.grant') ? `<button class="mini gold" data-a="skin" data-id="${u.id}" data-name="${esc(u.username)}">Objet</button>` : ''}
          ${canRole ? `<button class="mini" data-a="role" data-id="${u.id}" data-name="${esc(u.username)}" data-role="${u.role}">Rôle</button>` : ''}
          ${canRole ? `<button class="mini" data-a="rename" data-id="${u.id}" data-name="${esc(u.username)}">Renom.</button>` : ''}
          ${G.Auth.can('users.resetpw') ? `<button class="mini" data-a="pw" data-id="${u.id}" data-name="${esc(u.username)}">MDP</button>` : ''}
          ${G.Auth.can('users.wipe') ? `<button class="mini danger" data-a="wipe" data-id="${u.id}" data-name="${esc(u.username)}">Effacer</button>` : ''}
          ${canDel ? `<button class="mini danger" data-a="del" data-id="${u.id}" data-name="${esc(u.username)}">Suppr.</button>` : ''}
        </div></td>
      </tr>`;
    };
    return `
      <div class="adm-tools">
        <input class="au-in" id="adm-q" placeholder="Rechercher un pseudo ou un e-mail" value="${esc(AD.query)}">
        <span class="adm-note" style="margin:0">${list.length} compte(s) affiché(s)</span>
      </div>
      <table class="adm-table">
        <thead><tr>
          <th data-s="username">Compte</th>
          <th data-s="role">Rang</th>
          <th data-s="created">Inscription</th>
          <th data-s="logins">Connexions</th>
          <th>Niveau</th>
          <th>V-Bucks</th>
          <th>Statut</th>
          <th class="act-col">Actions</th>
        </tr></thead>
        <tbody>${list.length ? list.map(row).join('') : '<tr><td colspan="8"><div class="adm-note" style="padding:20px">Aucun compte ne correspond.</div></td></tr>'}</tbody>
      </table>`;
  };

  AD.bindUsers = function () {
    const q = $('adm-q');
    if (q) {
      q.addEventListener('input', () => {
        AD.query = q.value;
        const pos = q.selectionStart;
        AD.render();
        const n = $('adm-q');
        if (n) { n.focus(); n.setSelectionRange(pos, pos); }
      });
    }
    $('adm-body').querySelectorAll('th[data-s]').forEach((th) => {
      th.addEventListener('click', () => {
        if (AD.sort === th.dataset.s) AD.dir = -AD.dir; else { AD.sort = th.dataset.s; AD.dir = 1; }
        AD.render();
      });
    });
    $('adm-body').querySelectorAll('[data-a]').forEach((b) => {
      b.addEventListener('click', () => AD.action(b.dataset.a, b.dataset.id, b.dataset.name, b.dataset.role));
    });
  };

  // ---------- fiche joueur ----------
  AD.showDetail = function (id) {
    const u = G.Auth.byId(id);
    if (!u) return AD.toast('Compte introuvable.', true);
    // la fiche remplace le contenu sans quitter l'onglet Comptes
    AD.root.querySelectorAll('.adm-tabs button').forEach((x) => x.classList.toggle('sel', x.dataset.t === 'users'));
    const s = G.Auth.readSave(id);
    const st = s ? (s.stats || {}) : {};
    const R = s && s.rank ? s.rank : { pts: 0, best: 0, matches: 0 };
    const ri = G.Ranked ? G.Ranked.info(R.pts) : null;
    const box = (v, l, cls) => `<div class="adm-card ${cls || ''}"><div class="v">${v}</div><div class="l">${l}</div></div>`;
    const unlocked = s ? s.unlocked : [];
    const recent = Array.isArray(s && s.challenges && s.challenges.list) ? s.challenges.list.filter((c) => !c.done).slice(0, 4) : [];
    $('adm-body').innerHTML = `
      <div class="adm-h3">${esc(u.username)} <button class="mini" id="det-back">← Retour</button></div>
      <div class="adm-note">
        ${esc(u.email || 'aucune adresse e-mail')} · inscrit le ${stamp(u.created)} · ${u.logins} connexion(s), dernière ${ago(u.lastLogin)}
        · rang <b>${esc(G.Auth.RANK_LABEL[u.role])}</b>${u.root ? ' · <b>fondateur</b>' : ''}
        ${u.banned ? ' · <b style="color:#ff9a9a">banni</b> (' + esc(u.banReason) + (G.Auth.banRemaining(u) ? ', encore ' + G.Auth.banRemaining(u) : ', définitif') + ')' : ''}
      </div>
      ${!s ? '<div class="adm-note">Aucune sauvegarde de partie : ce compte n\'a jamais joué.</div>' : `
      <div class="adm-cards">
        ${box(s.level, 'niveau')}
        ${box((s.vbucks || 0).toLocaleString('fr-FR'), 'V-Bucks', 'alt')}
        ${box(st.matches || 0, 'parties jouées')}
        ${box(st.wins || 0, 'victoires', 'alt')}
        ${box(st.kills || 0, 'éliminations')}
        ${box(st.chests || 0, 'coffres ouverts', 'alt')}
        ${box(dur(st.playTime || 0), 'temps de jeu')}
        ${box(st.bestKills || 0, 'record d\'éliminations', 'alt')}
        ${box(st.builds || 0, 'constructions posées')}
        ${box((s.totalXp || 0).toLocaleString('fr-FR'), 'XP total', 'alt')}
      </div>
      <div class="adm-h3" style="margin-top:20px">Classé</div>
      ${ri ? `<div class="adm-note">Rang actuel <b style="color:${ri.color}">${esc(ri.name)}</b> — ${R.pts} points · meilleur rang ${G.Ranked.info(R.best || 0).name} · ${R.matches || 0} partie(s) classée(s).</div>` : '<div class="adm-note">Module de classement indisponible.</div>'}
      <div class="adm-h3" style="margin-top:20px">Casier — ${unlocked.length} objet(s) débloqué(s)</div>
      <div class="adm-note" style="font-family:Consolas,monospace;line-height:1.9">${unlocked.length ? unlocked.map((x) => '<span style="color:#ffe89a">' + esc(x) + '</span>').join(' · ') : 'rien'}</div>
      ${recent.length ? `<div class="adm-h3" style="margin-top:20px">Défis en cours</div>${recent.map((c) => `<div class="adm-note">${esc(c.name || c.id)} — ${(c.prog || 0)}/${(c.goal || 1)}</div>`).join('')}` : ''}
      `}
      <div class="adm-foot"><button class="btn" id="det-back2">Fermer la fiche</button></div>`;
    const back = () => { AD.tab = 'users'; AD.render(); };
    $('det-back').addEventListener('click', back);
    $('det-back2').addEventListener('click', back);
  };

  // ---------- règles serveur ----------
  AD.rulesHTML = function () {
    const r = G.Auth.rules();
    const st = G.Server.status();
    const can = G.Auth.can('site.settings');
    const chip = (key, label, opts, fmt) => {
      const cur = r[key];
      const free = `<button class="mini ${cur === null ? 'gold' : 'off'}" data-r="${key}" data-v="__null" ${can ? '' : 'disabled'}>libre</button>`;
      return `<div class="adm-row"><div class="rl">${label}</div><div class="rc">
        ${free}
        ${opts.map((o) => `<button class="mini ${cur === o ? 'gold' : ''}" data-r="${key}" data-v="${o}" ${can ? '' : 'disabled'}>${fmt ? fmt(o) : o}</button>`).join('')}
      </div></div>`;
    };
    return `
      <div class="adm-h3">Réglages forcés</div>
      <div class="adm-note">Appliqués à <b>chaque partie</b>, juste après le chargement des réglages du joueur. « libre » laisse le joueur choisir.
      ${st.active.length ? 'Règles en vigueur : <b>' + st.active.join(', ') + '</b>.' : 'Aucune règle active.'}</div>
      ${chip('mode', 'Mode de jeu', G.Auth.RULE_OPTIONS.mode, (o) => ({ solo: 'Solo', duo: 'Duo', squad: 'Section', rumble: 'Équipes', playground: 'Terrain de jeu' }[o]))}
      ${chip('bots', 'Nombre de joueurs', G.Auth.RULE_OPTIONS.bots, (o) => String(o + 1))}
      ${chip('difficulty', 'Difficulté des bots', G.Auth.RULE_OPTIONS.difficulty, (o) => ['Facile', 'Normal', 'Difficile', 'Pro'][o])}
      ${chip('ranked', 'Partie classée', G.Auth.RULE_OPTIONS.ranked, (o) => (o ? 'Obligatoire' : 'Interdite'))}
      ${chip('zeroBuild', 'Construction', G.Auth.RULE_OPTIONS.zeroBuild, (o) => (o ? 'Zéro construction' : 'Avec construction'))}
      <div class="adm-row">
        <div class="rl">Dégâts de tempête</div>
        <div class="rc">
          <input class="au-in" id="rule-storm" type="number" min="0" max="5" step="0.1" value="${r.stormScale}" style="width:100px">
          <span class="adm-note" style="margin:0">multiplicateur — 0 pour une tempête inoffensive, 2 pour une tempête punitive</span>
          <button class="mini gold" id="rule-storm-go" ${can ? '' : 'disabled'}>Appliquer</button>
        </div>
      </div>
      <div class="adm-foot"><button class="btn red" id="rule-clear" ${can ? '' : 'disabled'}>Tout libérer</button></div>`;
  };
  AD.bindRules = function () {
    $('adm-body').querySelectorAll('[data-r]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.r;
        const v = b.dataset.v === '__null' ? null : (G.Auth.RULE_OPTIONS[key].indexOf('true') >= 0 ? b.dataset.v === 'true' : (isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v));
        const r = G.Auth.setRule(key, v);
        AD.toast(r.ok ? key + ' = ' + (v === null ? 'libre' : v) : r.error, !r.ok);
        if (r.ok) AD.render();
      });
    });
    const go = $('rule-storm-go');
    if (go) go.addEventListener('click', () => {
      const r = G.Auth.setRule('stormScale', parseFloat($('rule-storm').value));
      AD.toast(r.ok ? 'Tempête × ' + G.Auth.rules().stormScale : r.error, !r.ok);
      if (r.ok) AD.render();
    });
    const clr = $('rule-clear');
    if (clr) clr.addEventListener('click', () => {
      if (!confirm('Libérer toutes les règles du serveur ?')) return;
      const r = G.Auth.clearRules();
      AD.toast(r.ok ? 'Règles libérées.' : r.error, !r.ok);
      if (r.ok) AD.render();
    });
  };

  // ---------- codes-cadeaux ----------
  AD.codesHTML = function () {
    const list = G.Auth.listCodes();
    const can = G.Auth.can('site.settings');
    const ids = G.Auth.unlockableIds();
    const sample = ids.slice(0, 80).map((id) => `<option value="${esc(id)}">${esc(id)}</option>`).join('');
    return `
      <div class="adm-h3">Codes-cadeaux</div>
      <div class="adm-note">Un code donne un objet du casier. Le joueur le saisit sur l'écran de connexion,
      avant ou après s'être connecté : dans les deux cas l'objet arrive dans sa sauvegarde.</div>
      <div class="adm-tools">
        <input class="au-in" id="code-item" placeholder="identifiant de l'objet" list="code-list" style="width:240px">
        <datalist id="code-list">${sample}</datalist>
        <input class="au-in" id="code-max" type="number" min="1" max="9999" value="1" style="width:90px" title="utilisations maximum">
        <button class="btn big" id="code-make" ${can ? '' : 'disabled'}>Générer</button>
      </div>
      <div id="code-out"></div>
      ${list.length ? `<table class="adm-table" style="margin-top:14px">
        <thead><tr><th>Code</th><th>Objet</th><th>Utilisations</th><th>Créé par</th><th>Date</th><th></th></tr></thead>
        <tbody>${list.map((c) => `<tr>
          <td><b style="font-family:Consolas,monospace;font-size:14px;letter-spacing:1px">${esc(c.code)}</b></td>
          <td>${esc(c.item)}</td>
          <td>${c.uses} / ${c.max}${c.uses >= c.max ? ' <span class="pill off">épuisé</span>' : ''}</td>
          <td>${esc(c.by)}</td><td>${stamp(c.at)}</td>
          <td class="act-cell"><div class="adm-act">
            <button class="mini" data-a="copy" data-code="${esc(c.code)}">Copier</button>
            <button class="mini danger" data-a="codedel" data-code="${esc(c.code)}" ${can ? '' : 'disabled'}>Supprimer</button>
          </div></td></tr>`).join('')}</tbody>
      </table>` : '<div class="adm-note">Aucun code pour le moment.</div>'}`;
  };
  AD.bindCodes = function () {
    const mk = $('code-make');
    if (mk) mk.addEventListener('click', () => {
      const r = G.Auth.makeCode($('code-item').value.trim(), $('code-max').value);
      if (!r.ok) return AD.toast(r.error, true);
      AD.toast('Code ' + r.code + ' généré.');
      AD.render();
      const out = $('code-out');
      if (out) out.innerHTML = '<div class="adm-note" style="color:#8dffab">Dernier code : <b style="font-family:Consolas,monospace">' + esc(r.code) + '</b></div>';
    });
    $('adm-body').querySelectorAll('[data-a="copy"]').forEach((b) => {
      b.addEventListener('click', () => {
        const c = b.dataset.code;
        if (navigator.clipboard) navigator.clipboard.writeText(c).then(() => AD.toast('Copié : ' + c), () => AD.toast('Copie refusée par le navigateur.', true));
        else AD.toast('Presse-papiers indisponible.', true);
      });
    });
    $('adm-body').querySelectorAll('[data-a="codedel"]').forEach((b) => {
      b.addEventListener('click', () => {
        if (!confirm('Supprimer le code ' + b.dataset.code + ' ?')) return;
        const r = G.Auth.deleteCode(b.dataset.code);
        AD.toast(r.ok ? 'Code supprimé.' : r.error, !r.ok);
        if (r.ok) AD.render();
      });
    });
  };

  // ---------- mode créatif ----------
  AD.creativeHTML = function () {
    const c = G.Server.creative();
    const allowed = G.Server.canCreative();
    const sw = (key, label, desc) => `<div class="adm-row">
      <div class="rl">${label}</div>
      <div class="rc">
        <button class="mini ${c[key] ? 'gold' : 'off'}" data-c="${key}" ${allowed ? '' : 'disabled'}>${c[key] ? 'ACTIF' : 'inactif'}</button>
        <span class="adm-note" style="margin:0">${desc}</span>
      </div></div>`;
    return `
      <div class="adm-h3">Mode créatif</div>
      ${allowed ? '' : '<div class="adm-note" style="color:#ff9a9a">Indisponible : il faut un rang modérateur ou administrateur, et l\'option <b>creativeAllowed</b> doit être active dans les réglages du serveur.</div>'}
      <div class="adm-note">Outil de test, propre à ta session — rien n'est écrit dans la base, et rien ne touche le classement.
      Les options se réactivent toutes les deux d'un coup et restent tenues jusqu'à la fin de la partie.</div>
      ${sw('mats', 'Matériaux infinis', 'bois, pierre et métal à 999, la pioche n\'en sort pas moins')}
      ${sw('ammo', 'Munitions infinies', 'plus de recharge à vérifier')}
      ${sw('god', 'Invincibilité', 'aucun dégât, la tempête comprise')}
      ${sw('noFall', 'Pas de dégâts de chute', 'tu tombes, tu ne meurs pas')}
      <div class="adm-foot">
        <button class="btn" id="cr-all-on" ${allowed ? '' : 'disabled'}>Tout activer</button>
        <button class="btn red" id="cr-all-off" ${allowed ? '' : 'disabled'}>Tout désactiver</button>
      </div>
      ${G.Game && G.Game.state === 'playing' ? '<div class="adm-note" style="margin-top:10px">Partie en cours — les options prennent effet à la frame suivante.</div>' : '<div class="adm-note" style="margin-top:10px">Aucune partie en cours. Lance une partie pour que les options mordent.</div>'}`;
  };
  AD.bindCreative = function () {
    $('adm-body').querySelectorAll('[data-c]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.c;
        const r = G.Server.setCreative(key, !G.Server.creative()[key]);
        if (!r.ok) return AD.toast(r.error, true);
        AD.toast((r.creative[key] ? 'Activé : ' : 'Désactivé : ') + key);
        AD.render();
      });
    });
    const on = $('cr-all-on');
    if (on) on.addEventListener('click', () => { const r = G.Server.allCreative(true); AD.toast(r.ok ? 'Mode créatif complet.' : r.error, !r.ok); if (r.ok) AD.render(); });
    const off = $('cr-all-off');
    if (off) off.addEventListener('click', () => { const r = G.Server.allCreative(false); AD.toast(r.ok ? 'Mode créatif désactivé.' : r.error, !r.ok); if (r.ok) AD.render(); });
  };

  // ---------- réglages ----------
  AD.siteHTML = function () {
    const m = G.Auth.meta();
    const can = G.Auth.can('site.settings');
    const ids = G.Auth.unlockableIds();
    const sample = ids.slice(0, 60).map((id) => `<option value="${esc(id)}">${esc(id)}</option>`).join('');
    return `
      <div class="adm-h3">Accès</div>
      <div class="adm-row">
        <div class="rl">Comptes created</div>
        <div class="rc">
          <button class="mini ${m.registrations ? '' : 'danger'}" data-s="registrations" data-v="1" ${can ? '' : 'disabled'}>${m.registrations ? 'Inscriptions ouvertes' : 'Inscriptions fermées'}</button>
          <span class="adm-note" style="margin:0">Bloquer l'inscription interdit toute création de compte sur cet appareil.</span>
        </div>
      </div>
      <div class="adm-row">
        <div class="rl">Connexion obligatoire</div>
        <div class="rc">
          <button class="mini ${m.requireLogin ? '' : 'danger'}" data-s="requireLogin" data-v="1" ${can ? '' : 'disabled'}>${m.requireLogin ? 'Comptes requis' : 'Invités autorisés'}</button>
          <span class="adm-note" style="margin:0"> Désactivé, le bouton « Jouer en invité » redevient disponible.</span>
        </div>
      </div>

      <div class="adm-h3" style="margin-top:22px">Annonce globale</div>
      <div class="adm-note">Affichée sur l'écran de connexion, en gros, pour tout le monde.</div>
      <textarea class="au-in" id="adm-ann" style="width:100%;min-height:80px" placeholder="Message pour les joueurs…">${esc(m.announcement ? m.announcement.text : '')}</textarea>
      <div class="adm-foot">
        <button class="btn red" id="adm-ann-clear">Retirer</button>
        <button class="btn big" id="adm-ann-pub" ${G.Auth.can('site.announce') ? '' : 'disabled'}>Publier</button>
      </div>

      <div class="adm-h3" style="margin-top:22px">Diffusion en jeu</div>
      <div class="adm-note">Pushé dans le HUD de la partie en cours. La notification dure 6 secondes et n'apparaît qu'une fois.</div>
      <input class="au-in" id="adm-bc" style="width:100%" maxlength="200" placeholder="Message à afficher en partie…">
      <div class="adm-foot"><button class="btn big" id="adm-bc-go" ${G.Auth.can('site.announce') ? '' : 'disabled'}>Diffuser maintenant</button></div>

      <div class="adm-h3" style="margin-top:22px">Mode créatif</div>
      <div class="adm-row">
        <div class="rl">Créatif autorisé</div>
        <div class="rc">
          <button class="mini ${m.rules.creativeAllowed ? 'gold' : 'off'}" data-ruleflag="creativeAllowed" ${can ? '' : 'disabled'}>${m.rules.creativeAllowed ? 'autorisé' : 'interdit'}</button>
          <span class="adm-note" style="margin:0">Coupe l'accès au mode créatif même aux administrateurs.</span>
        </div>
      </div>

      <div class="adm-h3" style="margin-top:22px">Objets déblocables</div>
      <div class="adm-row">
        <div class="rl">Test de déblocage</div>
        <div class="rc">
          <input class="au-in" id="adm-skin" placeholder="id d'objet" list="adm-skin-list" style="width:220px">
          <datalist id="adm-skin-list">${sample}</datalist>
          <button class="mini gold" id="adm-skin-me" ${G.Auth.can('users.grant') ? '' : 'disabled'}>S'octroyer l'objet</button>
          <span class="adm-note" style="margin:0">${ids.length} objet(s) connus du casier.</span>
        </div>
      </div>

      <div class="adm-h3" style="margin-top:22px">Zone sensible</div>
      <div class="adm-row">
        <div class="rl">Réinitialiser la base</div>
        <div class="rc">
          <button class="mini danger" id="adm-nuke" ${can ? '' : 'disabled'}>Effacer tous les comptes</button>
          <span class="adm-note" style="margin:0">Efface comptes, sauvegardes de partie et journal, puis recrée un compte fondateur <b>admin / admin1607</b>.</span>
        </div>
      </div>`;
  };

  AD.bindSite = function () {
    $('adm-body').querySelectorAll('[data-s]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.s;
        const next = !(G.Auth.meta()[key]);
        const r = G.Auth.setMeta(key, next);
        AD.toast(r.ok ? key + ' → ' + (next ? 'activé' : 'désactivé') : r.error, !r.ok);
        if (r.ok) AD.render();
      });
    });
    const pub = $('adm-ann-pub');
    if (pub) pub.addEventListener('click', () => {
      const r = G.Auth.announce($('adm-ann').value);
      AD.toast(r.ok ? 'Annonce publiée.' : r.error, !r.ok);
      if (r.ok) AD.render();
    });
    const bc = $('adm-bc-go');
    if (bc) bc.addEventListener('click', () => {
      const r = G.Auth.broadcast($('adm-bc').value);
      AD.toast(r.ok ? 'Message diffusé.' : r.error, !r.ok);
      if (r.ok) $('adm-bc').value = '';
    });
    $('adm-body').querySelectorAll('[data-ruleflag]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.ruleflag;
        const next = !G.Auth.rules()[key];
        const r = G.Auth.setRule(key, next);
        AD.toast(r.ok ? key + (next ? ' autorisé' : ' interdit') : r.error, !r.ok);
        if (r.ok) AD.render();
      });
    });
    const clr = $('adm-ann-clear');
    if (clr) clr.addEventListener('click', () => {
      const r = G.Auth.announce('');
      AD.toast(r.ok ? 'Annonce retirée.' : r.error, !r.ok);
      AD.render();
    });
    const sk = $('adm-skin-me');
    if (sk) sk.addEventListener('click', () => {
      const me = G.Auth.session();
      const id = $('adm-skin').value.trim();
      if (!me || !id) return AD.toast('Choisissez un objet.', true);
      const r = G.Auth.grant(me.id, { unlock: id });
      AD.toast(r.ok ? 'Ajouté : ' + (r.done.join(', ') || id) : r.error, !r.ok);
    });
    const nk = $('adm-nuke');
    if (nk) nk.addEventListener('click', () => {
      if (!confirm('Effacer TOUS les comptes et toutes les sauvegardes ? Action définitive.')) return;
      const r = G.Auth.nuke();
      if (!r.ok) return AD.toast(r.error, true);
      AD.close();
      G.HUD.notify('Base réinitialisée. Rechargez la page.', 6);
      setTimeout(() => location.reload(), 900);
    });
  };

  // ---------- journal ----------
  AD.logHTML = function () {
    const log = G.Auth.auditLog();
    if (!log.length) return '<div class="adm-note">Aucun événement enregistré.</div>';
    return `<div class="adm-note">${log.length} événements conservés (250 maximum).</div><div class="adm-log">${log.map(AD.logRow).join('')}</div>`;
  };

  // ------------------------------------------------------------
  //  Actions
  // ------------------------------------------------------------
  AD.action = function (act, id, name, role) {
    const A = G.Auth;
    if (act === 'ban') {
      const u = A.byId(id);
      if (u.banned) {
        const r = A.setBan(id, false);
        return AD.after(r, 'Compte rétabli.');
      }
      const reason = prompt('Motif du bannissement de ' + name + ' :', 'Triche');
      if (reason === null) return;
      const mins = prompt('Durée en minutes (0 = définitif) :', '1440');
      if (mins === null) return;
      const n = parseInt(mins, 10);
      if (isNaN(n) || n < 0) return AD.toast('Durée invalide.', true);
      const r = A.setBan(id, true, reason, n);
      AD.after(r, n > 0 ? name + ' est banni ' + n + ' min.' : 'Bannissement définitif pour ' + name + '.');
    } else if (act === 'view') {
      AD.showDetail(id);
      return;
    } else if (act === 'rename') {
      const next = prompt('Nouveau pseudo pour ' + name + ' :', name);
      if (next === null) return;
      const r = A.rename(id, next);
      AD.after(r, r.ok ? 'Compte renommé en ' + next + '.' : r.error);
    } else if (act === 'role') {
      const order = ['player', 'moderator', 'admin'];
      const nextRole = order[(order.indexOf(role) + 1) % 3];
      if (!confirm('Passer ' + name + ' au rang « ' + A.RANK_LABEL[nextRole] + ' » ?')) return;
      AD.after(A.setRole(id, nextRole), name + ' → ' + A.RANK_LABEL[nextRole]);
    } else if (act === 'vb') {
      const raw = prompt('V-Bucks à accorder à ' + name + ' (nombre, négatif pour retirer) :', '1000');
      if (raw === null) return;
      const n = parseInt(raw, 10);
      if (isNaN(n) || n === 0) return AD.toast('Nombre invalide.', true);
      const r = A.grant(id, { vbucks: n });
      AD.after(r, r.ok ? r.done.join(', ') : r.error);
    } else if (act === 'lvl') {
      const raw = prompt('Niveau cible pour ' + name + ' :', '50');
      if (raw === null) return;
      const n = parseInt(raw, 10);
      if (isNaN(n)) return AD.toast('Nombre invalide.', true);
      const r = A.grant(id, { level: n });
      AD.after(r, r.ok ? r.done.join(', ') : r.error);
    } else if (act === 'skin') {
      const list = A.unlockableIds();
      const raw = prompt('Identifiant de l\'objet à débloquer pour ' + name + '.\nExemples :\n' + list.slice(0, 12).join('\n'), list[0] || '');
      if (raw === null) return;
      const id2 = raw.trim();
      if (!A.unlockableIds().includes(id2)) return AD.toast('Objet inconnu : ' + id2, true);
      const r = A.grant(id, { unlock: id2 });
      AD.after(r, r.ok ? r.done.join(', ') : r.error);
    } else if (act === 'pw') {
      const raw = prompt('Nouveau mot de passe pour ' + name + ' (8 caractères min) :');
      if (raw === null) return;
      A.resetPassword(id, raw).then((r) => AD.after(r, r.ok ? 'Mot de passe changé.' : r.error));
    } else if (act === 'wipe') {
      if (!confirm('Effacer la progression de ' + name + ' (niveau, casier, statistiques) ?')) return;
      AD.after(A.wipeProgress(id), 'Progression de ' + name + ' effacée.');
    } else if (act === 'del') {
      if (!confirm('Supprimer DÉFINITIVEMENT le compte ' + name + ' ?')) return;
      AD.after(A.eraseAccount(id), 'Compte ' + name + ' supprimé.');
    }
  };

  AD.after = function (r, okMsg) {
    if (!r) return;
    if (r.ok) {
      AD.toast(okMsg);
      AD.render();
      if (G.Menu) G.Menu.refreshTop();
    } else {
      AD.toast(r.error, true);
    }
  };

  // Les raccourcis de jeu ne doivent pas fuiter derrière le panneau.
  AD.gate = function (e) {
    if (!AD.open) return;
    if (e.key === 'Escape') { e.stopPropagation(); }
  };
  document.addEventListener('keydown', AD.gate, true);
})();