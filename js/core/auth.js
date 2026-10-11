// ============================================================
//  Comptes : annuaire, inscription, connexion, rôles, sanctions
//
//  Tout est local au navigateur (localStorage). Les mots de passe
//  ne sont jamais écrits en clair : on stocke un sel + un dérivé.
//  Dérivation = PBKDF2-SHA256 quand WebCrypto est disponible,
//  sinon SHA-256 salé itéré — même format de sortie, même API.
//
//  Les erreurs sont des valeurs : chaque fonction renvoie
//  { ok: true, ... } ou { ok: false, error, field }. Rien ne lève.
// ============================================================
(function () {
  const DB_KEY = 'fortnite10h_accounts_v1';
  const SESSION_KEY = 'fortnite10h_session_v1';

  const A = { guestName: 'Invité', guest: false };
  G.Auth = A;

  const ITER_PBKDF2 = 150000;   // itérations quand WebCrypto répond
  const ITER_SHA256 = 20000;    // repli pur JS (20 000 PASS sur 36 octets)
  const SALT_BYTES = 16;
  const MAX_USERS = 200;
  const MAX_FAILS = 8;         // échecs consécutifs avant blocage
  const LOCK_MS = 30000;       // durée d'un blocage
  const THROTTLE_MS = 60000;
  const THROTTLE_MAX = 12;
  const AUDIT_MAX = 250;

  const RANK = { player: 0, moderator: 1, admin: 2 };
  const RANK_LABEL = { player: 'Joueur', moderator: 'Modérateur', admin: 'Administrateur' };
  A.RANK_LABEL = RANK_LABEL;

  const RE_USER = /^[A-Za-z0-9_]{3,16}$/;
  const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const SAVE_PREFIX = 'fortnite10h_save_';

  // ------------------------------------------------------------
  //  Constantes de dérivation
  // ------------------------------------------------------------
  const K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const enc = new TextEncoder();
  const subtle = (self.crypto && self.crypto.subtle) ? self.crypto.subtle : null;

  function b2hex(b) {
    let s = '';
    for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
    return s;
  }
  function hex2b(h) {
    const a = new Uint8Array(h.length >> 1);
    for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
    return a;
  }
  function randomHex(nbytes) {
    const a = new Uint8Array(nbytes);
    const c = self.crypto || window.msCrypto;
    if (c && c.getRandomValues) c.getRandomValues(a);
    else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return b2hex(a);
  }

  // SHA-256 pur JS — sert de repli quand WebCrypto est absent
  // (page ouverte en file:// sur un navigateur verrouillé, etc.).
  function sha256(bytes) {
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const len = bytes.length;
    const total = (len + 9 + 63) & ~63;
    const m = new Uint8Array(total);
    m.set(bytes);
    m[len] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 8, Math.floor(len / 536870912));
    dv.setUint32(total - 4, (len << 3) >>> 0);
    const w = new Uint32Array(64);
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const x = w[i - 15], y = w[i - 2];
        const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K256[i] + w[i]) >>> 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    let out = '';
    for (let i = 0; i < 8; i++) out += H[i].toString(16).padStart(8, '0');
    return out;
  }

  function deriveWebCrypto(pw, saltHex, iter) {
    return subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
      .then((k) => subtle.deriveBits({ name: 'PBKDF2', salt: hex2b(saltHex), iterations: iter, hash: 'SHA-256' }, k, 256))
      .then((bits) => b2hex(new Uint8Array(bits)));
  }

  function deriveSha256(pw, saltHex, iter) {
    const salt = hex2b(saltHex);
    const pwb = enc.encode(pw);
    // le tampon doit accueillir le sel ET le mot de passe : une taille
    // calculée sur le seul sel déborde dès que le mot de passe dépasse
    // quelques octets (et plantait le jeu au démarrage en HTTP, où le
    // repli WebCrypto est indisponible).
    const head = new Uint8Array(salt.length + pwb.length);
    head.set(salt, 0);
    head.set(pwb, salt.length);
    let h = sha256(head);
    const cur = new Uint8Array(32);
    const blk = new Uint8Array(36);
    for (let i = 0; i < iter; i++) {
      for (let k = 0; k < 32; k++) cur[k] = parseInt(h.substr(k * 2, 2), 16);
      blk.set(cur, 0);
      blk[32] = (i >>> 24) & 255; blk[33] = (i >>> 16) & 255; blk[34] = (i >>> 8) & 255; blk[35] = i & 255;
      h = sha256(blk);
    }
    return h;
  }

  // Point d'entrée unique : choisit l'algo et renvoie le dérivé (hex).
  A.derive = function (pw, saltHex, iter, algo) {
    if (algo === 'pbkdf2' && subtle) {
      return deriveWebCrypto(pw, saltHex, iter).catch(() => deriveSha256(pw, saltHex, ITER_SHA256));
    }
    return Promise.resolve(deriveSha256(pw, saltHex, iter));
  };
  A.algoAvailable = () => !!subtle;

  // ------------------------------------------------------------
  //  Base des comptes
  // ------------------------------------------------------------
  function blankDb() {
    return {
      v: 1,
      created: Date.now(),
      meta: {
        registrations: true,
        requireLogin: true,
        announcement: null,   // { text, by, at }
        broadcast: null,      // file d'attente : consommée par G.Server
        rules: {              // réglages serveur forcés, null = libre
          mode: null,         // 'solo' | 'duo' | 'squad' | 'rumble' | 'playground'
          bots: null,         // 29 | 49 | 74 | 99
          difficulty: null,   // 0..3
          ranked: null,       // true | false
          zeroBuild: null,    // true | false
          stormScale: 1,      // multiplicateur de dégâts de tempête
          creativeAllowed: true,
        },
      },
      codes: {},              // codes-cadeaux : CODE -> { item, uses, max, by, at }
      audit: [],
      users: {},
    };
  }
  let db = blankDb();
  let sessionUserId = null;
  let attempts = [];          // horodatages des tentatives (anti-morceau)

  function readDb() {
    let d = null;
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) d = JSON.parse(raw);
    } catch (e) { d = null; }
    const base = blankDb();
    if (!d || typeof d !== 'object' || !d.users) d = base;
    for (const k in base.meta) if (d.meta[k] === undefined) d.meta[k] = base.meta[k];
    for (const k in base.meta.rules) if (d.meta.rules[k] === undefined) d.meta.rules[k] = base.meta.rules[k];
    if (!d.codes || typeof d.codes !== 'object') d.codes = {};
    if (!Array.isArray(d.audit)) d.audit = [];
    db = d;
    return db;
  }
  function writeDb() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); return true; } catch (e) { return false; }
  }

  function newId() { return 'u_' + Date.now().toString(36) + randomHex(4); }

  function audit(code, target, extra) {
    const me = A.session();
    db.audit.unshift({
      t: Date.now(),
      by: me ? me.username : (extra && extra.by) || 'système',
      code: code,
      target: target || '',
      info: extra && extra.info ? extra.info : '',
    });
    if (db.audit.length > AUDIT_MAX) db.audit.length = AUDIT_MAX;
    writeDb();
  }
  A.auditLog = () => db.audit.slice();

  // ------------------------------------------------------------
  //  Amorçage : compte administrateur fondateur
  // ------------------------------------------------------------
  A.seedAdmin = function (username, password) {
    username = (username || 'admin').trim();
    password = password || 'admin1607';
    const lower = username.toLowerCase();
    if (db.users[lower]) return { ok: false, error: 'Ce compte existe déjà.' };
    const salt = randomHex(SALT_BYTES);
    const algo = subtle ? 'pbkdf2' : 'sha256';
    const iter = algo === 'pbkdf2' ? ITER_PBKDF2 : ITER_SHA256;
    const u = {
      id: newId(), username, lower, email: '',
      algo, salt, iter, hash: '',
      role: 'admin', root: true,
      banned: false, banReason: '', bannedAt: 0, bannedBy: '',
      created: Date.now(), lastLogin: 0, logins: 0,
      fails: 0, lockedUntil: 0,
    };
    db.users[lower] = u;
    writeDb();
    return A.derive(password, salt, iter, algo).then((h) => {
      u.hash = h; writeDb();
      audit('seed', username, { by: 'système', info: 'compte administrateur fondateur' });
      return { ok: true, user: publicUser(u) };
    });
  };

  // ------------------------------------------------------------
  //  Vue publique d'un compte (jamais le dérivé)
  // ------------------------------------------------------------
  function publicUser(u) {
    return {
      id: u.id, username: u.username, email: u.email || '', role: u.role, root: !!u.root,
      banned: !!u.banned, bannedUntil: u.bannedUntil || 0,
      banReason: u.banReason || '', created: u.created,
      lastLogin: u.lastLogin || 0, logins: u.logins || 0,
      lockedUntil: u.lockedUntil || 0, fails: u.fails || 0,
    };
  }
  A.publicUser = publicUser;

  A.list = function () {
    return Object.keys(db.users).map((k) => publicUser(db.users[k]))
      .sort((a, b) => a.username.localeCompare(b.username, 'fr'));
  };
  A.count = () => Object.keys(db.users).length;
  A.get = function (username) {
    const u = db.users[String(username || '').toLowerCase()];
    return u ? publicUser(u) : null;
  };
  A.raw = function (username) { return db.users[String(username || '').toLowerCase()] || null; };
  A.byId = function (id) {
    for (const k in db.users) if (db.users[k].id === id) return publicUser(db.users[k]);
    return null;
  };
  A.meta = () => db.meta;
  A.hasAccounts = () => A.count() > 0;

  // ------------------------------------------------------------
  //  Permissions
  // ------------------------------------------------------------
  const PERMS = {
    'users.view': 1,
    'users.ban': 1,
    'users.unban': 1,
    'users.resetpw': 2,
    'users.grant': 2,
    'users.role': 2,
    'users.delete': 2,
    'users.wipe': 2,
    'site.settings': 2,
    'site.announce': 1,
    'audit.view': 1,
  };
  A.can = function (perm) {
    const u = A.session();
    if (!u) return false;
    const need = PERMS[perm];
    if (need === undefined) return false;
    return RANK[u.role] >= need;
  };
  A.isAdmin = function () { const u = A.session(); return !!u && RANK[u.role] >= 2; };
  A.isStaff = function () { const u = A.session(); return !!u && RANK[u.role] >= 1; };

  // ------------------------------------------------------------
  //  Validation
  // ------------------------------------------------------------
  function validateSignup(f) {
    const name = String(f.username || '').trim();
    const mail = String(f.email || '').trim();
    const pw = String(f.password || '');
    if (!RE_USER.test(name)) return { error: 'Pseudo : 3 à 16 caractères, lettres, chiffres et « _ » uniquement.', field: 'username' };
    if (!RE_EMAIL.test(mail)) return { error: 'Adresse e-mail invalide.', field: 'email' };
    if (pw.length < 8) return { error: 'Mot de passe : 8 caractères minimum.', field: 'password' };
    if (pw.length > 128) return { error: 'Mot de passe : 128 caractères maximum.', field: 'password' };
    if (f.password !== f.confirm) return { error: 'Les deux mots de passe ne correspondent pas.', field: 'confirm' };
    if (db.users[name.toLowerCase()]) return { error: 'Ce pseudo est déjà pris.', field: 'username' };
    for (const k in db.users) if (db.users[k].email && db.users[k].email === mail) return { error: 'Cette adresse e-mail est déjà utilisée.', field: 'email' };
    return { ok: true };
  }
  A.validate = validateSignup;

  // Force approximative 0..4, pour la jauge d'inscription.
  A.passwordScore = function (pw) {
    pw = String(pw || '');
    if (!pw) return 0;
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^A-Za-z0-9]/.test(pw)) pool += 33;
    let bits = pw.length * Math.log2(Math.max(pool, 2));
    if (/(.)\1{2,}/.test(pw)) bits -= 12;
    if (/^(motdepasse|password|123456|azerty|qwerty|admin)/i.test(pw)) bits -= 20;
    if (bits < 34) return 1;
    if (bits < 55) return 2;
    if (bits < 76) return 3;
    return 4;
  };

  // Anti-morceau : trop de tentatives dans la fenêtre, on bloque tout.
  function throttled() {
    const now = Date.now();
    attempts = attempts.filter((t) => now - t < THROTTLE_MS);
    if (attempts.length >= THROTTLE_MAX) return Math.ceil((THROTTLE_MS - (now - attempts[0])) / 1000);
    return 0;
  }

  // ------------------------------------------------------------
  //  Inscription
  // ------------------------------------------------------------
  A.signup = function (f) {
    const v = validateSignup(f);
    if (!v.ok) return Promise.resolve({ ok: false, error: v.error, field: v.field });
    if (!db.meta.registrations) return Promise.resolve({ ok: false, error: 'Les inscriptions sont fermées.', field: null });
    if (A.count() >= MAX_USERS) return Promise.resolve({ ok: false, error: 'La base est pleine (' + MAX_USERS + ' comptes).', field: null });

    const name = String(f.username).trim();
    const salt = randomHex(SALT_BYTES);
    const algo = subtle ? 'pbkdf2' : 'sha256';
    const iter = algo === 'pbkdf2' ? ITER_PBKDF2 : ITER_SHA256;

    return A.derive(f.password, salt, iter, algo).then((h) => {
      if (db.users[name.toLowerCase()]) return { ok: false, error: 'Ce pseudo vient d\'être pris.', field: 'username' };
      const u = {
        id: newId(), username: name, lower: name.toLowerCase(), email: String(f.email || '').trim(),
        algo, salt, iter, hash: h,
        role: 'player', root: false,
        banned: false, banReason: '', bannedAt: 0, bannedBy: '',
        created: Date.now(), lastLogin: Date.now(), logins: 1,
        fails: 0, lockedUntil: 0,
      };
      db.users[u.lower] = u;
      writeDb();
      audit('signup', u.username, { info: 'nouveau compte' });
      // première sauvegarde de partie, liée au compte
      if (G.Store && G.Store.makeDefault) {
        const save = G.Store.makeDefault();
        save.name = u.username;
        try { localStorage.setItem(SAVE_PREFIX + u.id, JSON.stringify(save)); } catch (e) { /* quota */ }
      }
      setSession(u, true);
      bindStore();
      const bonus = A.applyPendingCodes(u.id);
      if (bonus.length) { G.Store.load(); G.Store.save(); }
      return { ok: true, user: publicUser(u), bonus: bonus };
    });
  };

  // ------------------------------------------------------------
  //  Connexion
  // ------------------------------------------------------------
  A.login = function (username, password, remember) {
    const wait = throttled();
    if (wait > 0) return Promise.resolve({ ok: false, error: 'Trop de tentatives. Réessayez dans ' + wait + ' s.' });
    const now = Date.now();
    const u = db.users[String(username || '').trim().toLowerCase()];
    if (!u) {
      attempts.push(now);
      return Promise.resolve({ ok: false, error: 'Compte introuvable ou mot de passe incorrect.' });
    }
    if (u.lockedUntil > now) {
      return Promise.resolve({ ok: false, error: 'Compte bloqué ' + Math.ceil((u.lockedUntil - now) / 1000) + ' s après plusieurs échecs.' });
    }
    if (A.banState(u)) {
      audit('login.deny', u.username, { info: 'compte banni' });
      const left = A.banRemaining(u);
      return Promise.resolve({ ok: false, error: 'Compte banni : ' + (u.banReason || 'aucun motif donné') + (left ? ' — encore ' + left : '') });
    }
    return A.derive(password, u.salt, u.iter, u.algo).then((h) => {
      attempts.push(Date.now());
      if (h !== u.hash) {
        u.fails = (u.fails || 0) + 1;
        if (u.fails >= MAX_FAILS) { u.lockedUntil = Date.now() + LOCK_MS; u.fails = 0; }
        writeDb();
        return { ok: false, error: 'Compte introuvable ou mot de passe incorrect.' };
      }
      u.fails = 0; u.lockedUntil = 0;
      u.lastLogin = Date.now();
      u.logins = (u.logins || 0) + 1;
      writeDb();
      setSession(u, !!remember);
      bindStore();
      audit('login', u.username, { info: 'connexion' });
      return { ok: true, user: publicUser(u) };
    });
  };

  function setSession(u, remember) {
    sessionUserId = u.id;
    A.guest = false;
    if (remember) {
      try { localStorage.setItem(SESSION_KEY, JSON.stringify({ id: u.id, at: Date.now() })); } catch (e) { /* quota */ }
    } else {
      try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    }
  }
  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && s.id ? s.id : null;
    } catch (e) { return null; }
  }

  A.session = function () {
    if (!sessionUserId) return null;
    for (const k in db.users) if (db.users[k].id === sessionUserId) return publicUser(db.users[k]);
    sessionUserId = null;
    return null;
  };
  A.logout = function () {
    const u = A.session();
    if (u) audit('logout', u.username, {});
    sessionUserId = null;
    A.guest = false;
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    if (G.Store) {
      G.Store.save();
      G.Store.load();
      G.Store.data.name = A.guestName;
      G.Store.save();
    }
  };
  A.enterAsGuest = function () {
    A.guest = true;
    sessionUserId = null;
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    if (G.Store) {
      G.Store.save();
      G.Store.load();
      G.Store.data.name = A.guestName;
      G.Store.save();
    }
  };

  // Recharge la sauvegarde de partie correspondant au compte courant.
  function bindStore() {
    if (!G.Store) return;
    G.Store.save();
    G.Store.load();
    const u = A.session();
    G.Store.data.name = u ? u.username : A.guestName;
    G.Store.save();
    if (G.player) G.player.name = G.Store.data.name;
    if (G.HUD && G.HUD.els && G.HUD.els.pname) G.HUD.els.pname.textContent = G.Store.data.name;
  }

  // ------------------------------------------------------------
  //  Actions d'administration
  // ------------------------------------------------------------
  function need(perm) {
    if (A.can(perm)) return null;
    return { ok: false, error: 'Permission refusée (' + perm + ').' };
  }
  function guardRoot(target) {
    if (target.root) return { ok: false, error: 'Le compte fondateur ne peut pas être modifié.' };
    return null;
  }

  A.setRole = function (id, role) {
    const denied = need('users.role'); if (denied) return denied;
    if (!RANK_LABEL[role]) return { ok: false, error: 'Rôle inconnu.' };
    let target = null;
    for (const k in db.users) if (db.users[k].id === id) target = db.users[k];
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    const guard = guardRoot(target); if (guard) return guard;
    const me = A.session();
    if (me.id === id && role !== 'admin') return { ok: false, error: 'Impossible de retirer votre propre rôle.' };
    if (target.role === 'admin' && role !== 'admin' && !A.countAdmins(target.id)) return { ok: false, error: 'Il doit rester au moins un administrateur.' };
    target.role = role;
    writeDb();
    audit('role', target.username, { info: 'rôle → ' + role });
    return { ok: true, user: publicUser(target) };
  };
  A.countAdmins = function (exceptId) {
    let n = 0;
    for (const k in db.users) if (db.users[k].role === 'admin' && db.users[k].id !== exceptId) n++;
    return n;
  };

  A.setBan = function (id, banned, reason, minutes) {
    const denied = need(banned ? 'users.ban' : 'users.unban'); if (denied) return denied;
    let target = null;
    for (const k in db.users) if (db.users[k].id === id) target = db.users[k];
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    const guard = guardRoot(target); if (guard) return guard;
    const me = A.session();
    if (me.id === id && banned) return { ok: false, error: 'Vous ne pouvez pas bannir votre propre compte.' };
    target.banned = !!banned;
    target.banReason = banned ? String(reason || 'Motif non précisé').slice(0, 140) : '';
    if (banned) {
      const mins = Math.max(0, Math.round(Number(minutes) || 0));
      target.bannedUntil = mins > 0 ? Date.now() + mins * 60000 : 0;
      target.bannedAt = Date.now();
      target.bannedBy = me.username;
    } else {
      target.bannedUntil = 0; target.bannedAt = 0; target.bannedBy = '';
    }
    target.lockedUntil = 0; target.fails = 0;
    if (banned && sessionUserId === id) A.logout();
    writeDb();
    audit(banned ? 'ban' : 'unban', target.username, { info: (target.banReason || '') + (banned && target.bannedUntil ? ' (' + dur(target.bannedUntil - Date.now()) + ')' : '') });
    return { ok: true, user: publicUser(target) };
  };

  // Bannissement encore actif ? Met à jour l'échéance dépassée au passage.
  A.banState = function (u) {
    if (!u || !u.banned) return false;
    if (u.bannedUntil && u.bannedUntil <= Date.now()) {
      const raw = A.raw(u.username);
      if (raw) { raw.banned = false; raw.bannedUntil = 0; raw.banReason = ''; writeDb(); }
      return false;
    }
    return true;
  };
  function dur(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return s + ' s';
    if (s < 3600) return Math.floor(s / 60) + ' min';
    if (s < 86400) return Math.floor(s / 3600) + ' h';
    return Math.floor(s / 86400) + ' j';
  }
  A.banRemaining = function (u) {
    if (!u || !u.banned || !u.bannedUntil) return '';
    const left = u.bannedUntil - Date.now();
    return left > 0 ? dur(left) : '';
  };

  A.rename = function (id, newName) {
    const denied = need('users.role'); if (denied) return denied;
    newName = String(newName || '').trim();
    if (!RE_USER.test(newName)) return { ok: false, error: 'Pseudo : 3 à 16 caractères, lettres, chiffres et « _ » uniquement.' };
    let target = null;
    for (const k in db.users) if (db.users[k].id === id) target = db.users[k];
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    const guard = guardRoot(target); if (guard) return guard;
    const lower = newName.toLowerCase();
    if (lower !== target.lower && db.users[lower]) return { ok: false, error: 'Ce pseudo est déjà pris.' };
    const oldName = target.username;
    delete db.users[target.lower];
    target.username = newName;
    target.lower = lower;
    db.users[lower] = target;
    // la sauvegarde de partie suit le compte, pas le pseudo
    const save = A.readSave(id);
    if (save) { save.name = newName; A.writeSave(id, save); }
    writeDb();
    audit('rename', newName, { info: 'ancien pseudo : ' + oldName });
    return { ok: true, user: publicUser(target) };
  };

  A.resetPassword = function (id, newPass) {
    const denied = need('users.resetpw'); if (denied) return denied;
    let target = null;
    for (const k in db.users) if (db.users[k].id === id) target = db.users[k];
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    newPass = String(newPass || '');
    if (newPass.length < 8) return { ok: false, error: 'Mot de passe : 8 caractères minimum.' };
    target.salt = randomHex(SALT_BYTES);
    target.algo = subtle ? 'pbkdf2' : 'sha256';
    target.iter = target.algo === 'pbkdf2' ? ITER_PBKDF2 : ITER_SHA256;
    target.fails = 0; target.lockedUntil = 0;
    return A.derive(newPass, target.salt, target.iter, target.algo).then((h) => {
      target.hash = h;
      writeDb();
      audit('resetpw', target.username, {});
      return { ok: true };
    });
  };

  // Sauvegarde de partie d'un compte, hors session courante.
  A.readSave = function (id) {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };
  A.writeSave = function (id, save) {
    try { localStorage.setItem(SAVE_PREFIX + id, JSON.stringify(save)); return true; }
    catch (e) { return false; }
  };

  // patch : { vbucks:+n, level:n, xp:n, unlock:'id', rank:{pts,best} }
  A.grant = function (id, patch) {
    const denied = need('users.grant'); if (denied) return denied;
    let target = null;
    for (const k in db.users) if (db.users[k].id === id) target = db.users[k];
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    const save = A.readSave(id) || (G.Store && G.Store.makeDefault ? G.Store.makeDefault() : null);
    if (!save) return { ok: false, error: 'Sauvegarde de partie indisponible.' };
    const done = [];
    if (patch.vbucks) { save.vbucks = Math.max(0, (save.vbucks || 0) + patch.vbucks); done.push((patch.vbucks > 0 ? '+' : '') + patch.vbucks + ' V-Bucks'); }
    if (patch.level != null) { save.level = Math.max(1, Math.round(patch.level)); save.xp = 0; done.push('niveau ' + save.level); }
    if (patch.xp) { save.totalXp = (save.totalXp || 0) + patch.xp; save.xp = (save.xp || 0) + patch.xp; done.push('+' + patch.xp + ' XP'); }
    if (patch.unlock) {
      const list = Array.isArray(patch.unlock) ? patch.unlock : [patch.unlock];
      for (const item of list) {
        if (save.unlocked.indexOf(item) < 0) { save.unlocked.push(item); done.push('objet ' + item); }
      }
    }
    if (patch.rank && save.rank) {
      if (patch.rank.pts != null) save.rank.pts = Math.max(0, patch.rank.pts);
      if (patch.rank.best != null) save.rank.best = Math.max(save.rank.best || 0, patch.rank.best);
      done.push('rang classé');
    }
    if (!A.writeSave(id, save)) return { ok: false, error: 'Écriture impossible (quota).' };
    audit('grant', target.username, { info: done.join(', ') || 'aucun changement' });
    return { ok: true, save: save, done: done };
  };
  A.unlockableIds = function () {
    const out = [];
    if (G.Cosmetics && G.Cosmetics.items) {
      for (const id in G.Cosmetics.items) {
        const it = G.Cosmetics.items[id];
        if (it && !it.styleOf) out.push(id);
      }
    }
    return out.sort();
  };

  A.wipeProgress = function (id) {
    const denied = need('users.wipe'); if (denied) return denied;
    let target = null;
    for (const k in db.users) if (db.users[k].id === id) target = db.users[k];
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    if (!G.Store || !G.Store.makeDefault) return { ok: false, error: 'Sauvegarde de partie indisponible.' };
    const save = G.Store.makeDefault();
    save.name = target.username;
    A.writeSave(id, save);
    audit('wipe', target.username, { info: 'progression effacée' });
    return { ok: true };
  };

  A.eraseAccount = function (id) {
    const denied = need('users.delete'); if (denied) return denied;
    let target = null;
    for (const k in db.users) if (db.users[k].id === id) target = db.users[k];
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    const guard = guardRoot(target); if (guard) return guard;
    const me = A.session();
    if (me.id === id) return { ok: false, error: 'Vous ne pouvez pas supprimer votre propre compte.' };
    delete db.users[target.lower];
    try { localStorage.removeItem(SAVE_PREFIX + id); } catch (e) { /* ignore */ }
    if (sessionUserId === id) A.logout();
    writeDb();
    audit('delete', target.username, { info: 'compte supprimé' });
    return { ok: true };
  };

  // ------------------------------------------------------------
  //  Réglages du site
  // ------------------------------------------------------------
  A.setMeta = function (key, value) {
    const denied = need('site.settings'); if (denied) return denied;
    if (!(key in db.meta)) return { ok: false, error: 'Réglage inconnu : ' + key };
    db.meta[key] = value;
    writeDb();
    audit('meta', key, { info: String(value) });
    return { ok: true };
  };

  A.announce = function (text) {
    const denied = need('site.announce'); if (denied) return denied;
    text = String(text || '').trim().slice(0, 400);
    if (!text) db.meta.announcement = null;
    else db.meta.announcement = { text: text, by: A.session().username, at: Date.now() };
    writeDb();
    audit('announce', '', { info: text ? 'annonce publiée' : 'annonce retirée' });
    return { ok: true };
  };
  A.announcement = () => db.meta.announcement || null;

  // ------------------------------------------------------------
  //  Diffusion en jeu : file d'attente consommée par G.Server
  // ------------------------------------------------------------
  A.broadcast = function (text) {
    const denied = need('site.announce'); if (denied) return denied;
    text = String(text || '').trim().slice(0, 200);
    if (!text) return { ok: false, error: 'Message vide.' };
    db.meta.broadcast = { text: text, by: A.session().username, at: Date.now() };
    writeDb();
    audit('broadcast', '', { info: text });
    return { ok: true };
  };
  A.pendingBroadcast = () => db.meta.broadcast || null;
  A.consumeBroadcast = function () {
    const b = db.meta.broadcast;
    if (!b) return null;
    db.meta.broadcast = null;
    writeDb();
    return b;
  };

  // ------------------------------------------------------------
  //  Règles serveur forcées
  //  Appliquées sur les réglages du joueur juste avant le match :
  //  sans ça, le joueur réécrit la règle depuis son propre menu.
  // ------------------------------------------------------------
  const MODES = ['solo', 'duo', 'squad', 'rumble', 'playground'];
  const BOTS = [29, 49, 74, 99];
  A.RULE_OPTIONS = { mode: MODES, bots: BOTS, difficulty: [0, 1, 2, 3], ranked: [true, false], zeroBuild: [true, false] };

  A.rules = () => db.meta.rules;
  A.setRule = function (key, value) {
    const denied = need('site.settings'); if (denied) return denied;
    if (!(key in db.meta.rules)) return { ok: false, error: 'Règle inconnue : ' + key };
    const opts = A.RULE_OPTIONS[key];
    if (value !== null && opts && opts.indexOf(value) < 0) return { ok: false, error: 'Valeur refusée pour ' + key + '.' };
    if (key === 'stormScale') {
      const n = Number(value);
      if (!isFinite(n) || n < 0 || n > 5) return { ok: false, error: 'Multiplicateur de tempête : 0 à 5.' };
      value = Math.round(n * 100) / 100;
    }
    db.meta.rules[key] = value;
    writeDb();
    audit('rule', key, { info: String(value) });
    return { ok: true };
  };
  A.clearRules = function () {
    const denied = need('site.settings'); if (denied) return denied;
    db.meta.rules = blankDb().meta.rules;
    writeDb();
    audit('rule', '', { info: 'toutes les règles libérées' });
    return { ok: true };
  };

  // Écrase les réglages en place, renvoie la liste des règles appliquées.
  A.applyRules = function (settings) {
    if (!settings) return [];
    const r = db.meta.rules, done = [];
    if (r.mode != null && MODES.indexOf(r.mode) >= 0 && settings.mode !== r.mode) { settings.mode = r.mode; done.push('mode → ' + r.mode); }
    if (r.bots != null && BOTS.indexOf(r.bots) >= 0 && settings.bots !== r.bots) { settings.bots = r.bots; done.push('joueurs → ' + (r.bots + 1)); }
    if (r.difficulty != null && settings.difficulty !== r.difficulty) { settings.difficulty = r.difficulty; done.push('difficulty → ' + r.difficulty); }
    if (r.ranked != null && settings.ranked !== r.ranked) { settings.ranked = r.ranked; done.push('classé → ' + (r.ranked ? 'oui' : 'non')); }
    if (r.zeroBuild != null && settings.zeroBuild !== r.zeroBuild) { settings.zeroBuild = r.zeroBuild; done.push('zéro construction → ' + (r.zeroBuild ? 'oui' : 'non')); }
    return done;
  };

  // ------------------------------------------------------------
  //  Codes-cadeaux
  // ------------------------------------------------------------
  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sans I, O, 0, 1
  function randomCode(n) {
    let s = '';
    const a = new Uint8Array(n);
    const c = self.crypto || window.msCrypto;
    if (c && c.getRandomValues) c.getRandomValues(a); else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    for (let i = 0; i < n; i++) s += CODE_ALPHABET[a[i] % CODE_ALPHABET.length];
    return s;
  }
  A.makeCode = function (item, maxUses) {
    const denied = need('site.settings'); if (denied) return denied;
    const id = String(item || '').trim();
    if (!id) return { ok: false, error: 'Aucun objet sélectionné.' };
    if (G.Cosmetics && G.Cosmetics.items && !G.Cosmetics.items[id]) return { ok: false, error: 'Objet inconnu : ' + id };
    maxUses = Math.max(1, Math.min(9999, parseInt(maxUses, 10) || 1));
    let code = '', tries = 0;
    do { code = randomCode(3) + '-' + randomCode(3) + '-' + randomCode(3); tries++; } while (db.codes[code] && tries < 20);
    if (db.codes[code]) return { ok: false, error: 'Génération impossible, réessaie.' };
    db.codes[code] = { item: id, uses: 0, max: maxUses, by: A.session().username, at: Date.now() };
    writeDb();
    audit('code', code, { info: id + ' x ' + maxUses });
    return { ok: true, code: code };
  };
  A.listCodes = function () {
    return Object.keys(db.codes).map((c) => ({ code: c, item: db.codes[c].item, uses: db.codes[c].uses, max: db.codes[c].max, by: db.codes[c].by, at: db.codes[c].at }));
  };
  A.deleteCode = function (code) {
    const denied = need('site.settings'); if (denied) return denied;
    code = String(code || '').toUpperCase();
    if (!db.codes[code]) return { ok: false, error: 'Code inconnu.' };
    delete db.codes[code];
    writeDb();
    audit('code', code, { info: 'supprime' });
    return { ok: true };
  };

  // Marchande avant session : le code est mémorisé puis appliqué à la
  // sauvegarde dès qu'un compte existe (inscription ou connexion).
  A.redeemCode = function (code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return { ok: false, error: 'Code vide.' };
    const c = db.codes[code];
    if (!c) return { ok: false, error: 'Code inconnu.' };
    if (c.uses >= c.max) return { ok: false, error: 'Code deja epuise.' };
    c.uses++;
    writeDb();
    const u = A.session();
    if (u) {
      // Écriture directe sur sa propre sauvegarde : passer par grant()
      // ferait hériter le joueur du contrôle d'administration.
      const save = A.readSave(u.id);
      if (save) {
        if (save.unlocked.indexOf(c.item) < 0) save.unlocked.push(c.item);
        A.writeSave(u.id, save);
        G.Store.load(); G.Store.save();
      } else {
        A.guestCodes = A.guestCodes || [];
        if (A.guestCodes.indexOf(c.item) < 0) A.guestCodes.push(c.item);
      }
      audit('redeem', code, { info: c.item + ' -> ' + u.username });
      return { ok: true, item: c.item };
    }
    if (!A.guestCodes) A.guestCodes = [];
    if (A.guestCodes.indexOf(c.item) < 0) A.guestCodes.push(c.item);
    audit('redeem', code, { info: c.item + ' (invite)' });
    return { ok: true, item: c.item };
  };
  // Report des codes déjà utilisés sur la sauvegarde qui vient d'être créée.
  A.applyPendingCodes = function (id) {
    if (!A.guestCodes || !A.guestCodes.length) return [];
    const items = A.guestCodes.slice();
    A.guestCodes = [];
    const save = A.readSave(id) || (G.Store && G.Store.makeDefault ? G.Store.makeDefault() : null);
    if (!save) return [];
    for (const it of items) if (save.unlocked.indexOf(it) < 0) save.unlocked.push(it);
    A.writeSave(id, save);
    return items;
  };

  // ------------------------------------------------------------
  //  Tableau de bord
  // ------------------------------------------------------------
  A.stats = function () {
    const day = 86400000, now = Date.now();
    let active24 = 0, bans = 0, matches = 0, wins = 0, kills = 0, vb = 0, playTime = 0, lvl = 0, played = 0;
    for (const k in db.users) {
      const u = db.users[k];
      if (u.lastLogin && now - u.lastLogin < day) active24++;
      if (A.banState(u)) bans++;
      const s = A.readSave(u.id);
      if (s) {
        played++;
        const st = s.stats || {};
        matches += st.matches || 0;
        wins += st.wins || 0;
        kills += st.kills || 0;
        playTime += st.playTime || 0;
        vb += s.vbucks || 0;
        lvl += s.level || 0;
      }
    }
    return {
      accounts: A.count(),
      active24,
      banned: bans,
      staff: A.list().filter((u) => RANK[u.role] >= 1).length,
      played,
      matches,
      wins,
      kills,
      playTime,
      vbucks: vb,
      avgLevel: played ? Math.round(lvl / played) : 0,
      winRate: matches ? Math.round(wins / matches * 100) : 0,
      sessions: sessionUserId ? 1 : 0,
    };
  };

  A.exportJSON = function () {
    const denied = need('users.view'); if (denied) return null;
    return JSON.stringify(db, null, 2);
  };
  A.importJSON = function (text) {
    const denied = need('site.settings'); if (denied) return denied;
    let d = null;
    try { d = JSON.parse(text); } catch (e) { return { ok: false, error: 'JSON illisible.' }; }
    if (!d || !d.users) return { ok: false, error: 'Structure inconnue (clé « users » absente).' };
    db = d;
    const base = blankDb();
    for (const k in base.meta) if (db.meta[k] === undefined) db.meta[k] = base.meta[k];
    if (!Array.isArray(db.audit)) db.audit = [];
    if (!writeDb()) return { ok: false, error: 'Écriture impossible.' };
    audit('import', '', { info: A.count() + ' comptes' });
    return { ok: true };
  };

  A.nuke = function () {
    const denied = need('site.settings'); if (denied) return denied;
    audit('nuke', '', { info: 'base réinitialisée' });
    db = blankDb();
    writeDb();
    sessionUserId = null;
    A.guest = false;
    return { ok: true };
  };

  // ------------------------------------------------------------
  //  Démarrage
  // ------------------------------------------------------------
  A.init = function () {
    readDb();
    // aucun compte : on crée le compte administrateur fondateur
    if (!A.hasAccounts()) return A.seedAdmin('admin', 'admin1607');
    const sid = readSession();
    if (sid) {
      for (const k in db.users) {
        const u = db.users[k];
        if (u.id === sid && !u.banned) { sessionUserId = sid; A.guest = false; break; }
      }
    }
    return Promise.resolve({ ok: true });
  };

  // Le salon exige soit une session, soit le mode invité autorisé.
  A.requireAuth = function () {
    if (A.session()) return false;
    return !!db.meta.requireLogin;
  };
})();