// ============================================================
//  Écran de connexion / inscription, habillé comme le jeu :
//  logo biseauté, boutons V-Bucks jaunes, typo Impact.
//  Passe le relais à G.Menu quand la session est établie.
// ============================================================
(function () {
  const UI = { root: null, mode: 'login', busy: false, onUnlock: null };
  G.AuthUI = UI;

  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------
  //  Montage du DOM
  // ------------------------------------------------------------
  UI.init = function () {
    if (UI.root) return;
    const el = document.createElement('div');
    el.id = 'auth-root';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="au-bg"></div>
      <div class="au-wrap">
        <div class="au-brand">
          <div class="logo-big"><span class="logo-f">FORTNITE</span><span class="logo-sub">Build Bêta</span></div>
          <div class="au-tag">Connectez-vous pour sauvegarder votre casier, vos statistiques<br>et votre rang classé. Sans compte, la progression reste sur cet appareil.</div>
          <div class="au-ann" id="au-ann"></div>
        </div>
        <div class="au-card">
          <div class="au-tabs">
            <button class="au-tab sel" data-m="login"><span>Connexion</span></button>
            <button class="au-tab" data-m="signup"><span>Inscription</span></button>
          </div>
          <div id="au-body"></div>
          <div class="au-msg" id="au-msg"></div>
          <div class="au-foot">
            <button class="au-ghost" id="au-guest">Jouer en invité</button>
            <span class="au-hint" id="au-hint"></span>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    UI.root = el;

    el.querySelectorAll('.au-tab').forEach((t) => {
      t.addEventListener('click', () => {
        if (UI.busy) return;
        G.Audio.play('ui_click');
        UI.mode = t.dataset.m;
        el.querySelectorAll('.au-tab').forEach((x) => x.classList.toggle('sel', x === t));
        UI.render();
      });
      t.addEventListener('mouseenter', () => G.Audio.play('ui_hover'));
    });
    $('au-guest').addEventListener('click', () => {
      if (UI.busy) return;
      G.Audio.resume();
      G.Audio.play('ui_back');
      G.Auth.enterAsGuest();
      UI.hide();
      G.Menu.showLobby();
      G.HUD.notify('MODE INVITÉ — la progression n\'est pas rattachée à un compte', 4);
    });

    document.addEventListener('keydown', UI.gate, true);
  };

  // Tant que l'écran est ouvert, les raccourcis du jeu ne doivent rien déclencher.
  UI.gate = function (e) {
    if (!UI.root || UI.root.classList.contains('hidden')) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); }
    else if (e.key === 'Tab') {
      const f = UI.root.querySelectorAll('input, button');
      if (!f.length) return;
      const i = Array.prototype.indexOf.call(f, document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    } else if (document.activeElement && document.activeElement.tagName !== 'INPUT') {
      e.stopPropagation();
    }
  };

  // ------------------------------------------------------------
  //  Affichage
  // ------------------------------------------------------------
  UI.render = function () {
    const body = $('au-body');
    if (UI.mode === 'signup') {
      body.innerHTML = `
        <div class="au-field"><label for="au-su">Pseudo</label><input class="au-in" id="au-su" maxlength="16" autocomplete="username" spellcheck="false" placeholder="3 à 16 caractères"></div>
        <div class="au-field"><label for="au-em">Adresse e-mail</label><input class="au-in" id="au-em" type="email" maxlength="80" autocomplete="email" spellcheck="false" placeholder="pseudo@exemple.com"></div>
        <div class="au-field"><label for="au-p1">Mot de passe</label>
          <div class="au-pw"><input class="au-in" id="au-p1" type="password" maxlength="128" autocomplete="new-password" placeholder="8 caractères minimum"><button class="au-eye" data-eye="au-p1">VOIR</button></div>
          <div class="au-meter" id="au-meter"><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="au-field"><label for="au-p2">Confirmation</label>
          <div class="au-pw"><input class="au-in" id="au-p2" type="password" maxlength="128" autocomplete="new-password" placeholder="Retapez le mot de passe"><button class="au-eye" data-eye="au-p2">VOIR</button></div>
        </div>
        <label class="au-check"><input type="checkbox" id="au-ok"> J'accepte les règles du serveur</label>
        <div class="au-field"><label for="au-code">Code-cadeau (facultatif)</label><input class="au-in" id="au-code" maxlength="20" spellcheck="false" placeholder="XXX-XXX-XXX" style="text-transform:uppercase"></div>
        <button class="au-cta" id="au-go"><span>CRÉER LE COMPTE</span></button>
        <div class="au-code-out" id="au-code-out"></div>`;
      $('au-ok').addEventListener('change', () => { if ($('au-ok').checked) G.Audio.play('ui_hover'); });
      $('au-p1').addEventListener('input', () => {
        const s = G.Auth.passwordScore($('au-p1').value);
        const m = $('au-meter');
        m.className = 'au-meter' + (s ? ' s' + s : '');
      });
      $('au-p1').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('au-p2').focus(); });
      $('au-go').addEventListener('click', UI.submit);
      bindEyes();
      setTimeout(() => $('au-su').focus(), 30);
    } else {
      body.innerHTML = `
        <div class="au-field"><label for="au-id">Compte</label><input class="au-in" id="au-id" maxlength="16" autocomplete="username" spellcheck="false" placeholder="Votre pseudo"></div>
        <div class="au-field"><label for="au-pw">Mot de passe</label>
          <div class="au-pw"><input class="au-in" id="au-pw" type="password" maxlength="128" autocomplete="current-password" placeholder="••••••••"><button class="au-eye" data-eye="au-pw">VOIR</button></div>
        </div>
        <label class="au-check"><input type="checkbox" id="au-rem"> Rester connecté sur cet appareil</label>
        <div class="au-field"><label for="au-code">Code-cadeau (facultatif)</label><input class="au-in" id="au-code" maxlength="20" spellcheck="false" placeholder="XXX-XXX-XXX" style="text-transform:uppercase"></div>
        <button class="au-cta" id="au-go"><span>JOUER</span></button>
        <div class="au-code-out" id="au-code-out"></div>`;
      $('au-go').addEventListener('click', UI.submit);
      $('au-code').addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); UI.submit(); }
      });
      bindEyes();
      setTimeout(() => $('au-id').focus(), 30);
    }
    UI.msg('');
  };

  function bindEyes() {
    UI.root.querySelectorAll('.au-eye').forEach((b) => {
      b.addEventListener('click', () => {
        const inp = $(b.dataset.eye);
        const on = inp.type === 'password';
        inp.type = on ? 'text' : 'password';
        b.textContent = on ? 'CACHER' : 'VOIR';
        inp.focus();
      });
    });
  }

  UI.msg = function (text, kind) {
    const m = $('au-msg');
    if (!m) return;
    if (!text) { m.className = 'au-msg'; m.textContent = ''; return; }
    m.className = 'au-msg on ' + (kind || '');
    m.textContent = text;
    if (kind !== 'ok') { m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); }
  };

  function flashField(field) {
    UI.root.querySelectorAll('.au-in.err').forEach((e) => e.classList.remove('err'));
    if (field) { const el = $(field); if (el) { el.classList.add('err'); el.focus(); } }
  }

  // ------------------------------------------------------------
  //  Envoi
  // ------------------------------------------------------------
  UI.submit = function () {
    if (UI.busy) return;
    const signup = UI.mode === 'signup';
    const f = signup ? {
      username: $('au-su').value.trim(),
      email: $('au-em').value.trim(),
      password: $('au-p1').value,
      confirm: $('au-p2').value,
    } : {
      username: $('au-id').value.trim(),
      password: $('au-pw').value,
      remember: $('au-rem').checked,
    };
    if (!f.username || !f.password) {
      UI.msg('Renseignez le compte et le mot de passe.');
      flashField(f.username ? null : (signup ? 'au-su' : 'au-id'));
      return;
    }
    if (signup && !$('au-ok').checked) {
      UI.msg('Il faut accepter les règles pour créer un compte.');
      return;
    }
    UI.busy = true;
    const btn = $('au-go');
    btn.disabled = true;
    const label = btn.querySelector('span');
    const keep = label.textContent;
    label.textContent = 'VÉRIFICATION…';
    UI.msg('');
    G.Audio.play('ui_click');

    // Le code est validé avant la session : en invitation il est mis de
    // côté puis appliqué à la sauvegarde dès que le compte existe.
    const codeEl = $('au-code');
    const code = codeEl ? codeEl.value.trim() : '';
    let gift = null;
    if (code) {
      gift = G.Auth.redeemCode(code);
      if (!gift.ok) {
        UI.busy = false; btn.disabled = false; label.textContent = keep;
        UI.msg(gift.error);
        G.Audio.play('ui_back');
        return;
      }
    }

    const p = signup ? G.Auth.signup(f) : G.Auth.login(f.username, f.password, f.remember);
    p.then((r) => {
      UI.busy = false;
      btn.disabled = false;
      label.textContent = keep;
      if (!r.ok) {
        UI.msg(r.error);
        flashField(r.field && (signup ? { username: 'au-su', email: 'au-em', password: 'au-p1', confirm: 'au-p2' }[r.field] : null));
        G.Audio.play('ui_back');
        return;
      }
      G.Audio.play('ui_play');
      const items = (r.bonus || []).concat(gift && !signup ? [gift.item] : []);
      const unique = items.filter((v, i) => items.indexOf(v) === i);
      if (unique.length) {
        const out = $('au-code-out');
        if (out) {
          out.className = 'au-code-out on';
          out.textContent = 'Code accepté — ajouté : ' + unique.join(', ');
        }
      }
      UI.msg('Bienvenue, ' + r.user.username + ' !', 'ok');
      setTimeout(() => {
        UI.hide();
        G.Menu.refreshTop();
        G.Menu.showLobby();
        G.HUD.notify('CONNECTÉ EN TANT QUE ' + r.user.username.toUpperCase() +
          (RANK_LABEL_UI(r.user.role) ? ' · ' + RANK_LABEL_UI(r.user.role).toUpperCase() : ''), 3.5);
      }, 480);
    }).catch((e) => {
      UI.busy = false;
      btn.disabled = false;
      label.textContent = keep;
      UI.msg('Erreur inattendue : ' + (e && e.message ? e.message : e));
    });
  };

  function RANK_LABEL_UI(role) {
    return (G.Auth.RANK_LABEL || {})[role] || '';
  }

  // ------------------------------------------------------------
  //  Ouverture / fermeture
  // ------------------------------------------------------------
  UI.show = function () {
    UI.init();
    UI.mode = 'login';
    UI.root.querySelectorAll('.au-tab').forEach((x) => x.classList.toggle('sel', x.dataset.m === 'login'));
    const closed = !G.Auth.meta().registrations;
    $('au-guest').disabled = false;
    $('au-guest').style.display = closed ? 'none' : '';
    $('au-hint').textContent = closed ? 'Inscriptions fermées par un administrateur.' : '';
    const ann = G.Auth.announcement();
    const box = $('au-ann');
    if (ann) {
      box.className = 'au-ann on';
      box.innerHTML = '<b>ANNONCE DE L\'ADMIN</b>' + escapeHTML(ann.text) +
        '<div style="opacity:.6;margin-top:6px;font-size:11px">postée par ' + escapeHTML(ann.by) + '</div>';
    } else box.className = 'au-ann';
    UI.render();
    UI.root.classList.remove('hidden');
  };

  UI.hide = function () {
    if (UI.root) UI.root.classList.add('hidden');
    if (UI.busy && $('au-go')) $('au-go').disabled = false;
    UI.busy = false;
  };

  // Un salon ne s'ouvre qu	with une session valide ou le mode invité.
  UI.canEnter = function () {
    if (G.Auth.session()) return true;
    if (G.Auth.guest && !G.Auth.requireAuth()) return true;
    return false;
  };

  function escapeHTML(s) {
    return String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  }

  // Écoute la touche Entrée sur le formulaire courant.
  UI.initKeys = function () {
    document.addEventListener('keydown', (e) => {
      if (!UI.root || UI.root.classList.contains('hidden')) return;
      if (e.key === 'Enter' && document.activeElement && document.activeElement.tagName === 'INPUT' && $('au-go')) {
        e.preventDefault();
        UI.submit();
      }
    });
  };
})();