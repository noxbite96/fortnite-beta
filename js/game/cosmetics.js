// ============================================================
//  Cosmétiques : tenues, sacs à dos, pioches, planeurs, traînées,
//  emotes, revêtements + passe de combat (50 paliers)
// ============================================================
(function () {
  const C = { items: {}, list: [] };
  G.Cosmetics = C;

  C.RARITY = {
    commun: { name: 'Commun', color: '#9aa4ad', bg: 'linear-gradient(160deg,#b8c0c8,#6a737c)' },
    'peu commun': { name: 'Peu commun', color: '#62c33a', bg: 'linear-gradient(160deg,#79d64b,#2f7a1a)' },
    rare: { name: 'Rare', color: '#3aa3ff', bg: 'linear-gradient(160deg,#4fb3ff,#1a4fa8)' },
    'épique': { name: 'Épique', color: '#b85cff', bg: 'linear-gradient(160deg,#c77dff,#5a1ea8)' },
    'légendaire': { name: 'Légendaire', color: '#f0a53a', bg: 'linear-gradient(160deg,#ffc15a,#b85a10)' },
  };
  C.CATS = {
    skin: 'Tenue', back: 'Sac à dos', pickaxe: 'Pioche', glider: 'Planeur', trail: 'Traînée', emote: 'Emote', wrap: 'Revêtement', spray: 'Tag',
  };

  function add(cat, id, name, rarity, data, desc) {
    const it = Object.assign({ id, cat, name, rarity, desc: desc || '' }, data || {});
    C.items[id] = it; C.list.push(it);
    return it;
  }

  // ---------------- TENUES ----------------
  // Paramètres lus par character.js
  add('skin', 'skin_recrue', 'Recrue', 'commun', { body: 'm', skin: 0xe8b894, hair: { style: 'short', color: 0x5a3a22 }, top: { style: 'tshirt', color: 0x6a8a6a, color2: 0x4a6a4a, pattern: 'pocket' }, pants: { color: 0x3a4a6a }, shoes: 0x3a2a1e, face: { mouth: 'smile', brows: 'normal' } }, 'Tenue par défaut.');
  add('skin', 'skin_recrue2', 'Recrue (Ramirez)', 'commun', { body: 'f', skin: 0xc68a60, hair: { style: 'bun', color: 0x2a1a12 }, top: { style: 'tshirt', color: 0xd87a3a, color2: 0xb85a2a, pattern: 'stripe' }, pants: { color: 0x4a5a3a }, shoes: 0x2a2a2a, face: { mouth: 'smile', brows: 'thin' } }, 'Tenue par défaut.');
  add('skin', 'skin_recrue3', 'Recrue (Headhunter)', 'commun', { body: 'f', skin: 0xf0c8a8, hair: { style: 'pony', color: 0xc89a4a }, top: { style: 'tank', color: 0x7a5ab0, color2: 0x5a3a90 }, pants: { color: 0x2a2a3a }, shoes: 0x5a5a5a, face: { mouth: 'serious', brows: 'thin' } });
  add('skin', 'skin_recrue4', 'Recrue (Spitfire)', 'commun', { body: 'm', skin: 0x8a5a3a, hair: { style: 'buzz', color: 0x1a1a1a }, top: { style: 'tshirt', color: 0xc83a3a, color2: 0xa82a2a, pattern: 'logo' }, pants: { color: 0x5a4a3a }, shoes: 0x2a2a2a, face: { mouth: 'grin', brows: 'thick' } });
  add('skin', 'skin_commando', 'Commando Alpha', 'rare', { body: 'm', skin: 0xe0b090, hair: { style: 'short', color: 0x3a2a1a }, hat: { type: 'helmet', color: 0x5a6a3a }, top: { style: 'jacket', color: 0x6a7a4a, color2: 0x4a5a2a, pattern: 'camo' }, pants: { color: 0x5a6a3a, pattern: 'camo' }, shoes: 0x2a2218, gloves: 0x2a2a2a, extra: ['vest', 'belt'], face: { mouth: 'serious', brows: 'thick', paint: 'stripes' } }, 'Toujours prêt au combat.');
  add('skin', 'skin_cowboy', 'Cow-boy Solitaire', 'rare', { body: 'm', skin: 0xd8a080, hair: { style: 'short', color: 0x6a4a2a }, hat: { type: 'cowboy', color: 0x7a5030 }, top: { style: 'vest', color: 0xe8dcc0, color2: 0x7a5030 }, pants: { color: 0x3a4a6a }, shoes: 0x5a3a1a, extra: ['belt', 'scarf'], scarf: 0xc02020, face: { mouth: 'smirk', brows: 'thick', beard: 0x6a4a2a } }, 'Le shérif de l\'île.');
  add('skin', 'skin_pompier', 'Pompier', 'peu commun', { body: 'm', skin: 0xf0c8a0, hair: { style: 'short', color: 0x2a1a0a }, hat: { type: 'helmet', color: 0xd8a020, visor: false }, top: { style: 'jacket', color: 0x3a3a3a, color2: 0xe8d020, pattern: 'bands' }, pants: { color: 0x3a3a3a, pattern: 'bands', color2: 0xe8d020 }, shoes: 0x1a1a1a, gloves: 0x5a4a2a, face: { mouth: 'smile', brows: 'normal', beard: 0x2a1a0a } });
  add('skin', 'skin_surf', 'Surfeuse', 'peu commun', { body: 'f', skin: 0xe8b890, hair: { style: 'long', color: 0xf0d080 }, top: { style: 'tank', color: 0x30c0d0, color2: 0xf07ab0 }, pants: { style: 'shorts', color: 0xf07a3a }, shoes: 0xf0f0f0, face: { mouth: 'smile', brows: 'thin', glasses: 0x2a2a2a } });
  add('skin', 'skin_pirate', 'Capitaine Pirate', 'rare', { body: 'm', skin: 0xd8a888, hair: { style: 'long', color: 0x1a1a1a }, hat: { type: 'bandana', color: 0xc02020 }, top: { style: 'jacket', color: 0x8a1a1a, color2: 0xe0c060, pattern: 'buttons' }, pants: { color: 0x2a2a2a }, shoes: 0x3a2a1a, extra: ['belt'], face: { mouth: 'grin', brows: 'thick', beard: 0x1a1a1a, patch: true } }, 'Arrr !');
  add('skin', 'skin_punk', 'Punk Électrique', 'rare', { body: 'f', skin: 0xf0d0c0, hair: { style: 'mohawk', color: 0xff3aa0 }, top: { style: 'jacket', color: 0x1a1a1a, color2: 0x8a8a8a, pattern: 'zip' }, pants: { color: 0x3a1a4a }, shoes: 0x1a1a1a, gloves: 0x1a1a1a, face: { mouth: 'smirk', brows: 'thin', paint: 'star' } });
  add('skin', 'skin_astronaute', 'Astronaute', 'épique', { body: 'm', skin: 0xe0b090, hair: { style: 'short', color: 0x3a2a1a }, hat: { type: 'astronaut', color: 0xf4f4f4 }, top: { style: 'suit', color: 0xf0f0f0, color2: 0x3a6ad8, pattern: 'patch' }, pants: { color: 0xe8e8e8 }, shoes: 0xd0d0d0, gloves: 0xf0f0f0, extra: ['belt'], face: { mouth: 'smile', brows: 'normal' } }, 'Un petit pas pour l\'homme…');
  add('skin', 'skin_ninja', 'Ninja Nocturne', 'épique', { body: 'm', skin: 0xe8c0a0, hair: { style: 'spiky', color: 0x1a1a1a }, hat: { type: 'headband', color: 0xc01a1a }, top: { style: 'suit', color: 0x1a1a24, color2: 0x3a3a4a }, pants: { color: 0x1a1a24 }, shoes: 0x0a0a0a, gloves: 0x0a0a0a, extra: ['belt', 'scarf'], scarf: 0xc01a1a, face: { mouth: 'none', brows: 'angry', mask: 0x1a1a24 } }, 'Silencieux et mortel.');
  add('skin', 'skin_banane', 'Agent Banane', 'épique', { full: 'banana', body: 'm', skin: 0xf4d840, top: { style: 'suit', color: 0xf4d840, color2: 0xe0b820 }, pants: { color: 0xf4d840 }, shoes: 0x5a3a1a, gloves: 0xf4d840, face: { mouth: 'grin', brows: 'normal' } }, 'Une banane très sérieuse.');
  add('skin', 'skin_viking', 'Jarl Viking', 'épique', { body: 'm', skin: 0xf0c8a8, hair: { style: 'long', color: 0xc86a2a }, hat: { type: 'viking', color: 0x9a9aa0 }, top: { style: 'vest', color: 0x6a4a2a, color2: 0x8a7a6a, pattern: 'fur' }, pants: { color: 0x4a3a2a }, shoes: 0x3a2a1a, gloves: 0x5a3a1a, extra: ['belt', 'shoulders'], face: { mouth: 'serious', brows: 'thick', beard: 0xc86a2a, paint: 'blue' } }, 'Pour Odin !');
  add('skin', 'skin_citrouille', 'Tête de Citrouille', 'épique', { full: 'pumpkin', body: 'm', skin: 0xe8c0a0, top: { style: 'suit', color: 0x2a2a2a, color2: 0xe07020, pattern: 'buttons' }, pants: { color: 0x3a2a1a }, shoes: 0x1a1a1a, gloves: 0x1a1a1a, extra: ['scarf'], scarf: 0x6a2a8a, face: { mouth: 'none' } }, 'Halloween toute l\'année.');
  add('skin', 'skin_nounours', 'Nounours Chef d\'Équipe', 'légendaire', { full: 'bear', body: 'm', skin: 0xf09ac0, top: { style: 'suit', color: 0xf09ac0, color2: 0xfad0e0, pattern: 'belly' }, pants: { color: 0xf09ac0 }, shoes: 0xf09ac0, gloves: 0xf09ac0, face: { mouth: 'smile' } }, 'Câlins obligatoires.');
  add('skin', 'skin_corbeau', 'Corbeau', 'légendaire', { body: 'm', skin: 0x3a3a4a, hair: { style: 'none', color: 0x1a1a1a }, hat: { type: 'hood', color: 0x1a1a24 }, top: { style: 'suit', color: 0x1a1a24, color2: 0x4a2a6a, pattern: 'feathers' }, pants: { color: 0x14141c }, shoes: 0x0a0a0a, gloves: 0x0a0a0a, extra: ['cape', 'shoulders'], cape: 0x1a1a24, face: { mouth: 'none', brows: 'none', glowEyes: 0xb05aff } }, 'Venu des ténèbres.');
  add('skin', 'skin_chevalier', 'Chevalier Noir', 'légendaire', { body: 'm', skin: 0xe0b090, hat: { type: 'knight', color: 0x2a2a30 }, top: { style: 'armor', color: 0x2a2a30, color2: 0xb02020 }, pants: { color: 0x2a2a30, pattern: 'armor' }, shoes: 0x1a1a1a, gloves: 0x2a2a30, extra: ['cape', 'shoulders', 'belt'], cape: 0xa01818, face: { mouth: 'none', glowEyes: 0xff3030 } }, 'Le chevalier légendaire.');
  add('skin', 'skin_robot', 'Robot Oméga', 'légendaire', { full: 'robot', body: 'm', skin: 0x8a9aa8, top: { style: 'armor', color: 0x5a6a7a, color2: 0x30e0ff, pattern: 'circuit' }, pants: { color: 0x4a5a6a, pattern: 'armor' }, shoes: 0x2a3a4a, gloves: 0x3a4a5a, extra: ['shoulders'], glow: 0x30e0ff, face: { mouth: 'none', glowEyes: 0x30e0ff } }, 'Mise à jour terminée.');
  add('skin', 'skin_roi', 'Roi Doré', 'légendaire', { body: 'm', skin: 0xf0c8a0, hair: { style: 'short', color: 0xf0e0a0 }, hat: { type: 'crown', color: 0xf0c030 }, top: { style: 'armor', color: 0xe0b030, color2: 0xfff0a0, pattern: 'gold' }, pants: { color: 0xc89a20, pattern: 'armor' }, shoes: 0xa07a10, gloves: 0xe0b030, extra: ['cape', 'shoulders', 'belt'], cape: 0x8a1a2a, glow: 0xffd040, face: { mouth: 'smirk', brows: 'normal', beard: 0xf0e0a0 } }, 'Récompense ultime du passe de combat.');
  // tenues supplémentaires (bots)
  add('skin', 'skin_docteur', 'Docteur', 'peu commun', { body: 'f', skin: 0xf0d0b0, hair: { style: 'bob', color: 0x3a2a1a }, top: { style: 'jacket', color: 0xf8f8f8, color2: 0x3ab0a0, pattern: 'zip' }, pants: { color: 0x3ab0a0 }, shoes: 0xf0f0f0, face: { mouth: 'smile', brows: 'thin', glasses: 0x3a3a3a } }, '', true);
  add('skin', 'skin_cuistot', 'Chef Cuistot', 'peu commun', { body: 'm', skin: 0xe8b890, hair: { style: 'short', color: 0x1a1a1a }, hat: { type: 'chef', color: 0xffffff }, top: { style: 'jacket', color: 0xf8f8f8, color2: 0x1a1a1a, pattern: 'buttons' }, pants: { color: 0x2a2a2a, pattern: 'check' }, shoes: 0x1a1a1a, face: { mouth: 'grin', brows: 'thick', beard: 0x1a1a1a } }, '', true);
  add('skin', 'skin_sportive', 'Sportive', 'peu commun', { body: 'f', skin: 0x7a4a2a, hair: { style: 'pony', color: 0x1a1a1a }, hat: { type: 'cap', color: 0x2a6ad8 }, top: { style: 'tank', color: 0xf8f8f8, color2: 0x2a6ad8, pattern: 'stripe' }, pants: { style: 'shorts', color: 0x2a2a3a }, shoes: 0xf04a4a, face: { mouth: 'smile', brows: 'thin' } }, '', true);
  add('skin', 'skin_hipster', 'Hipster', 'rare', { body: 'm', skin: 0xf0c8a8, hair: { style: 'bun', color: 0x7a4a2a }, hat: { type: 'beanie', color: 0xc85a3a }, top: { style: 'hoodie', color: 0x5a7a5a, color2: 0x3a5a3a }, pants: { color: 0x7a6a4a }, shoes: 0x5a3a1a, face: { mouth: 'smirk', brows: 'thick', beard: 0x7a4a2a, glasses: 0x1a1a1a } }, '', true);
  add('skin', 'skin_zombie', 'Zombie', 'rare', { body: 'm', skin: 0x8ab070, hair: { style: 'spiky', color: 0x3a3a2a }, top: { style: 'tshirt', color: 0x6a6a7a, color2: 0x4a4a5a, pattern: 'torn' }, pants: { color: 0x4a3a2a }, shoes: 0x2a2a2a, face: { mouth: 'grin', brows: 'angry', zombie: true } }, '', true);
  add('skin', 'skin_agente', 'Agente Secrète', 'épique', { body: 'f', skin: 0xf0d0b8, hair: { style: 'long', color: 0xa02020 }, top: { style: 'suit', color: 0x1a1a1a, color2: 0x3a3a3a, pattern: 'zip' }, pants: { color: 0x1a1a1a }, shoes: 0x0a0a0a, gloves: 0x1a1a1a, extra: ['belt'], face: { mouth: 'smirk', brows: 'thin', glasses: 0x0a0a0a } }, '', true);
  add('skin', 'skin_explo', 'Exploratrice', 'rare', { body: 'f', skin: 0xd8a070, hair: { style: 'pony', color: 0x5a3a1a }, hat: { type: 'cowboy', color: 0xc8a870 }, top: { style: 'vest', color: 0xe8dcc0, color2: 0x8a7a4a }, pants: { style: 'shorts', color: 0x8a7a4a }, shoes: 0x5a3a1a, extra: ['belt'], face: { mouth: 'smile', brows: 'thin' } }, '', true);

  // ---------------- SACS À DOS ----------------
  add('back', 'back_none', 'Aucun', 'commun', { model: 'none' });
  add('back', 'back_sac', 'Sac de Randonnée', 'peu commun', { model: 'backpack', color: 0x3a6ad8, color2: 0xe0a020 });
  add('back', 'back_carquois', 'Carquois', 'rare', { model: 'quiver', color: 0x7a4a2a });
  add('back', 'back_bouclier', 'Bouclier Rond', 'rare', { model: 'shield', color: 0xb02020, color2: 0xf0c030 });
  add('back', 'back_guitare', 'Guitare Rock', 'rare', { model: 'guitar', color: 0xd03030 });
  add('back', 'back_oxygene', 'Réservoir d\'Oxygène', 'épique', { model: 'tank', color: 0xe8e8e8, color2: 0x3a6ad8 });
  add('back', 'back_epee', 'Épée Légendaire', 'épique', { model: 'sword', color: 0xc0c8d0, color2: 0xf0c030 });
  add('back', 'back_ailes', 'Ailes d\'Ange', 'légendaire', { model: 'wings', color: 0xffffff });
  add('back', 'back_nounours', 'Mini Nounours', 'épique', { model: 'teddy', color: 0xf09ac0 });
  add('back', 'back_jetpack', 'Jet-pack Rétro', 'légendaire', { model: 'jetpack', color: 0xd83030, color2: 0xc0c0c0 });

  // ---------------- PIOCHES ----------------
  add('pickaxe', 'pick_default', 'Pioche de Base', 'commun', { model: 'pick', color: 0x8a8a90, color2: 0x7a5030 });
  add('pickaxe', 'pick_hache', 'Hache de Guerre', 'peu commun', { model: 'axe', color: 0xb0b8c0, color2: 0x5a3a20 });
  add('pickaxe', 'pick_sucette', 'Sucette Géante', 'rare', { model: 'lollipop', color: 0xff5aa0, color2: 0xffffff });
  add('pickaxe', 'pick_cle', 'Clé à Molette', 'rare', { model: 'wrench', color: 0xa0a8b0, color2: 0xd83030 });
  add('pickaxe', 'pick_pelle', 'Pelle de Chantier', 'peu commun', { model: 'shovel', color: 0x6a7a8a, color2: 0xe0a020 });
  add('pickaxe', 'pick_faux', 'Faux Sinistre', 'épique', { model: 'scythe', color: 0x3a3a4a, color2: 0x8a5ac0 });
  add('pickaxe', 'pick_laser', 'Épée Laser', 'légendaire', { model: 'laser', color: 0x30e0ff, color2: 0x2a2a2a, glow: true });
  add('pickaxe', 'pick_marteau', 'Marteau Doré', 'légendaire', { model: 'hammer', color: 0xf0c030, color2: 0x7a4a20 });

  // ---------------- PLANEURS ----------------
  add('glider', 'glider_default', 'Planeur de Base', 'commun', { model: 'wing', color: 0x3a8ad8, color2: 0xe8e8e8 });
  add('glider', 'glider_parapluie', 'Parapluie', 'peu commun', { model: 'umbrella', color: 0xd83030, color2: 0xffffff });
  add('glider', 'glider_papier', 'Avion en Papier', 'rare', { model: 'paper', color: 0xf8f8f8, color2: 0xd0d0d0 });
  add('glider', 'glider_tapis', 'Tapis Volant', 'épique', { model: 'carpet', color: 0x9a1a4a, color2: 0xf0c030 });
  add('glider', 'glider_dragon', 'Aile de Dragon', 'épique', { model: 'dragon', color: 0xc02a1a, color2: 0x3a1a1a });
  add('glider', 'glider_arcenciel', 'Arc-en-ciel', 'légendaire', { model: 'wing', color: 0xff3a3a, rainbow: true });
  add('glider', 'glider_victoire', 'Parapluie de la Victoire', 'légendaire', { model: 'umbrella', color: 0xf0c030, color2: 0xffffff }, 'Obtenu en remportant une Victoire Royale !');

  // ---------------- TRAÎNÉES ----------------
  add('trail', 'trail_none', 'Aucune', 'commun', { colors: null });
  add('trail', 'trail_etincelles', 'Étincelles', 'peu commun', { colors: [[1, 0.9, 0.5]] });
  add('trail', 'trail_coeurs', 'Cœurs', 'rare', { colors: [[1, 0.3, 0.5], [1, 0.6, 0.8]] });
  add('trail', 'trail_etoiles', 'Poussière d\'Étoiles', 'rare', { colors: [[0.6, 0.8, 1], [1, 1, 1]] });
  add('trail', 'trail_flammes', 'Flammes', 'épique', { colors: [[1, 0.5, 0.1], [1, 0.2, 0.05]] });
  add('trail', 'trail_arcenciel', 'Arc-en-ciel', 'légendaire', { colors: [[1, 0.2, 0.2], [1, 0.6, 0.1], [1, 1, 0.2], [0.3, 1, 0.3], [0.3, 0.6, 1], [0.7, 0.3, 1]] });

  // ---------------- EMOTES ----------------
  add('emote', 'emote_danse', 'Danse par Défaut', 'commun', { anim: 'default', music: 'disco', loop: true });
  add('emote', 'emote_salut', 'Salut', 'commun', { anim: 'wave', loop: false, dur: 2.2 });
  add('emote', 'emote_floss', 'Le Floss', 'rare', { anim: 'floss', music: 'floss', loop: true });
  add('emote', 'emote_applaudir', 'Applaudissements', 'peu commun', { anim: 'clap', loop: false, dur: 2.5 });
  add('emote', 'emote_robot', 'Le Robot', 'rare', { anim: 'robot', music: 'hype', loop: true });
  add('emote', 'emote_tourbillon', 'Tourbillon', 'rare', { anim: 'spin', music: 'hype', loop: true });
  add('emote', 'emote_L', 'Prends ça !', 'épique', { anim: 'lsign', music: 'floss', loop: true });
  add('emote', 'emote_hype', 'Hype', 'rare', { anim: 'hype', music: 'hype', loop: true });
  add('emote', 'emote_chaise', 'Chaise Invisible', 'épique', { anim: 'chair', music: 'chill', loop: true });
  add('emote', 'emote_vague', 'La Vague', 'rare', { anim: 'wavedance', music: 'disco', loop: true });
  add('emote', 'emote_disco', 'Fièvre Disco', 'épique', { anim: 'disco', music: 'disco', loop: true });
  add('emote', 'emote_pompes', 'Pompes', 'peu commun', { anim: 'pushups', music: 'march', loop: true });
  add('emote', 'emote_flexion', 'Muscles !', 'rare', { anim: 'flex', loop: false, dur: 3 });
  add('emote', 'emote_rire', 'Mort de Rire', 'peu commun', { anim: 'laugh', loop: false, dur: 3 });
  add('emote', 'emote_orange', 'Justice Orange', 'légendaire', { anim: 'orange', music: 'hype', loop: true });
  add('emote', 'emote_salto', 'Salto Arrière', 'épique', { anim: 'backflip', loop: false, dur: 1.4 });

  // ---------------- REVÊTEMENTS ----------------
  add('wrap', 'wrap_none', 'Aucun', 'commun', { style: null });
  add('wrap', 'wrap_camo', 'Camouflage', 'peu commun', { style: 'camo' });
  add('wrap', 'wrap_zebre', 'Zèbre', 'rare', { style: 'zebra' });
  add('wrap', 'wrap_lave', 'Lave', 'épique', { style: 'lava' });
  add('wrap', 'wrap_neon', 'Néon', 'épique', { style: 'neon' });
  add('wrap', 'wrap_arcenciel', 'Arc-en-ciel', 'légendaire', { style: 'rainbow' });
  add('wrap', 'wrap_or', 'Or Massif', 'légendaire', { style: 'gold' });
  add('wrap', 'wrap_diamant', 'Diamant', 'légendaire', { style: 'diamond' });

  // ---------------- TAGS (graffitis) ----------------
  add('spray', 'spray_gg', 'GG', 'commun', { draw: 'gg' }, 'Bien joué !');
  add('spray', 'spray_smiley', 'Sourire', 'commun', { draw: 'smiley' });

  // ---------------- EXCLUSIVITÉS DE LA BOUTIQUE ----------------
  const shop = (it) => { it.shop = true; return it; };
  shop(add('skin', 'skin_glace', 'Reine des Glaces', 'légendaire', { body: 'f', skin: 0xdff2ff, hair: { style: 'long', color: 0xf4fbff }, hat: { type: 'crown', color: 0x9ad8ff }, top: { style: 'suit', color: 0x6ab8f0, color2: 0xe8f8ff, pattern: 'feathers' }, pants: { color: 0x4a90d0 }, shoes: 0xe8f8ff, gloves: 0xbfe6ff, extra: ['cape'], cape: 0x9ad8ff, glow: 0x9ae0ff, face: { mouth: 'smirk', brows: 'thin', glowEyes: 0x8ae0ff } }, 'Elle gèle le cœur de ses adversaires.'));
  shop(add('skin', 'skin_lave', 'Démon de Lave', 'légendaire', { body: 'm', skin: 0x3a1a14, hair: { style: 'spiky', color: 0xff5a10 }, top: { style: 'armor', color: 0x2a1410, color2: 0xff6a10, pattern: 'circuit' }, pants: { color: 0x241010, pattern: 'armor' }, shoes: 0x140808, gloves: 0x2a1410, extra: ['shoulders'], glow: 0xff5a10, face: { mouth: 'grin', brows: 'angry', glowEyes: 0xff7a20 } }, 'Né au cœur du volcan.'));
  shop(add('skin', 'skin_pilote', 'Pilote de Course', 'rare', { body: 'm', skin: 0xe8c0a0, hat: { type: 'helmet', color: 0xd82a2a, visor: true }, top: { style: 'suit', color: 0xf4f4f4, color2: 0xd82a2a, pattern: 'bands' }, pants: { color: 0xf4f4f4, pattern: 'bands', color2: 0xd82a2a }, shoes: 0x1a1a1a, gloves: 0x1a1a1a, face: { mouth: 'smile', brows: 'normal' } }, 'Toujours en pole position.'));
  shop(add('skin', 'skin_sirene', 'Sirène', 'épique', { body: 'f', skin: 0xf0d0c0, hair: { style: 'long', color: 0x20c0b0 }, top: { style: 'tank', color: 0x2ac0a0, color2: 0xf0a0c0, pattern: 'stripe' }, pants: { color: 0x20a090, pattern: 'check' }, shoes: 0x20a090, face: { mouth: 'smile', brows: 'thin', paint: 'star' } }, 'Venue tout droit de Lac Butin.'));
  shop(add('skin', 'skin_dj', 'DJ Néon', 'épique', { body: 'm', skin: 0x8a5a3a, hair: { style: 'buzz', color: 0x1a1a1a }, hat: { type: 'cap', color: 0x1a1a24 }, top: { style: 'hoodie', color: 0x14141c, color2: 0xff2ad8 }, pants: { color: 0x1a1a24 }, shoes: 0x2affea, gloves: 0x14141c, glow: 0xff2ad8, face: { mouth: 'grin', brows: 'thick', glasses: 0x2affea } }, 'Le son le plus fort de l\'île.'));
  shop(add('skin', 'skin_neige', 'Sergent Neige', 'rare', { body: 'm', skin: 0xf0c8a8, hair: { style: 'short', color: 0x3a2a1a }, hat: { type: 'helmet', color: 0xf0f4f8 }, top: { style: 'jacket', color: 0xf0f4f8, color2: 0xb8c4d0, pattern: 'camo' }, pants: { color: 0xe8eef4, pattern: 'camo' }, shoes: 0x3a3a3a, gloves: 0xf0f4f8, extra: ['vest', 'belt'], face: { mouth: 'serious', brows: 'thick', beard: 0x3a2a1a } }, 'Invisible dans la neige du Chalet du Pic.'));
  // tenues liées aux nouveautés (OVNI, méchas, contrats, sangliers)
  shop(add('skin', 'skin_alien', 'Visiteur Vert', 'légendaire', { body: 'm', skin: 0x5ad86a, hair: { style: 'bald', color: 0x5ad86a }, top: { style: 'suit', color: 0xc8d0dc, color2: 0x7affb0, pattern: 'circuit' }, pants: { color: 0xa8b0bc }, shoes: 0x3a4252, gloves: 0x5ad86a, extra: ['shoulders', 'belt'], glow: 0x7affb0, face: { mouth: 'none', brows: 'none', glowEyes: 0x1a2a1a } }, 'Il est descendu de l\'OVNI… et il a pris goût à la Victoire Royale.'));
  shop(add('skin', 'skin_mecha', 'Pilote de Mécha', 'épique', { body: 'f', skin: 0xe0b090, hair: { style: 'pony', color: 0x2a1a10 }, hat: { type: 'helmet', color: 0xffc830 }, top: { style: 'suit', color: 0xe06a20, color2: 0x2a2e38, pattern: 'stripe' }, pants: { color: 0x2a2e38 }, shoes: 0x1a1a1a, gloves: 0x2a2e38, extra: ['belt', 'vest'], face: { mouth: 'smirk', brows: 'thin' } }, 'Dix missiles, zéro hésitation.'));
  shop(add('skin', 'skin_chasseur', 'Chasseur de Primes', 'rare', { body: 'm', skin: 0xc89070, hair: { style: 'short', color: 0x2a1a10 }, hat: { type: 'cowboy', color: 0x3a2a1e }, top: { style: 'jacket', color: 0x5a3a24, color2: 0x8a1a1a }, pants: { color: 0x3a3a44 }, shoes: 0x2a1a10, gloves: 0x3a2a1e, extra: ['scarf', 'belt'], face: { mouth: 'serious', brows: 'thick', beard: 0x2a1a10 } }, 'Chaque contrat est une promesse.'));
  shop(add('skin', 'skin_dresseuse', 'Dresseuse de Sangliers', 'rare', { body: 'f', skin: 0xf0c8a8, hair: { style: 'long', color: 0xc85a1a }, hat: { type: 'headband', color: 0x3a8a4a }, top: { style: 'vest', color: 0x3a6a3a, color2: 0x8a5a30 }, pants: { color: 0x5a4030 }, shoes: 0x3a2a1a, extra: ['belt'], face: { mouth: 'grin', brows: 'thin' } }, 'Elle galope plus vite que votre kart.'));
  shop(add('pickaxe', 'pick_sucette_bleue', 'Sucette Glacée', 'rare', { model: 'lollipop', color: 0x5ab0ff, color2: 0xffffff }));
  shop(add('pickaxe', 'pick_laser_rouge', 'Sabre Écarlate', 'légendaire', { model: 'laser', color: 0xff3030, color2: 0x2a2a2a, glow: true }));
  shop(add('pickaxe', 'pick_faux_glace', 'Faux de Givre', 'épique', { model: 'scythe', color: 0x9ad8ff, color2: 0x2a4a8a }));
  shop(add('glider', 'glider_dragon_glace', 'Dragon de Glace', 'légendaire', { model: 'dragon', color: 0x8ad8ff, color2: 0x2a4a8a }));
  shop(add('glider', 'glider_neon', 'Parapluie Néon', 'rare', { model: 'umbrella', color: 0xff2ad8, color2: 0x2affea }));
  shop(add('glider', 'glider_jungle', 'Tapis de la Jungle', 'épique', { model: 'carpet', color: 0x2ab070, color2: 0xf0e040 }));
  shop(add('back', 'back_guitare_neon', 'Guitare Néon', 'rare', { model: 'guitar', color: 0x2affea }));
  shop(add('back', 'back_sac_rose', 'Sac Bonbon', 'peu commun', { model: 'backpack', color: 0xff6ab0, color2: 0xffffff }));
  shop(add('back', 'back_chien', 'Toutou de Poche', 'épique', { model: 'pet', color: 0xd8a868, color2: 0x7a4a22 }));
  shop(add('back', 'back_dalmatien', 'Petit Dalmatien', 'légendaire', { model: 'pet', color: 0xf4f4f4, color2: 0x1a1a1a }));
  shop(add('back', 'back_jetpack_or', 'Jet-pack Doré', 'légendaire', { model: 'jetpack', color: 0xf0c030, color2: 0xfff0a0 }));
  shop(add('wrap', 'wrap_glace', 'Glace Éternelle', 'épique', { style: 'ice' }));
  shop(add('wrap', 'wrap_galaxie', 'Galaxie', 'légendaire', { style: 'galaxy' }));
  shop(add('emote', 'emote_shuffle', 'Pas Chassés', 'rare', { anim: 'shuffle', music: 'hype', loop: true }));
  shop(add('emote', 'emote_guitare', 'Guitare Imaginaire', 'épique', { anim: 'airguitar', music: 'hype', loop: true }));
  shop(add('emote', 'emote_poney', 'Danse du Poney', 'épique', { anim: 'pony', music: 'disco', loop: true }));
  shop(add('emote', 'emote_dab', 'Le Dab', 'peu commun', { anim: 'dab', loop: false, dur: 2.2 }));
  shop(add('emote', 'emote_moonwalk', 'Moonwalk', 'épique', { anim: 'moonwalk', music: 'disco', loop: true }));
  shop(add('spray', 'spray_lama', 'Lama', 'peu commun', { draw: 'lama' }));
  shop(add('spray', 'spray_10h', 'FORTNITE — Build Bêta', 'rare', { draw: 'dixh' }));
  shop(add('spray', 'spray_coeur', 'Cœur', 'peu commun', { draw: 'coeur' }));
  shop(add('spray', 'spray_couronne', 'Couronne', 'épique', { draw: 'couronne' }));
  shop(add('spray', 'spray_flamme', 'En feu !', 'rare', { draw: 'flamme' }));
  shop(add('spray', 'spray_bus', 'Bus de combat', 'légendaire', { draw: 'bus' }));
  shop(add('trail', 'trail_glace', 'Flocons', 'rare', { colors: [[0.6, 0.9, 1], [1, 1, 1]] }));
  shop(add('trail', 'trail_neon', 'Traînée Néon', 'épique', { colors: [[1, 0.2, 0.85], [0.2, 1, 0.9]] }));
  // prix en V-Bucks
  const PRICES = {
    skin: { commun: 500, 'peu commun': 800, rare: 1200, 'épique': 1500, 'légendaire': 2000 },
    pickaxe: { commun: 500, 'peu commun': 500, rare: 800, 'épique': 1200, 'légendaire': 1500 },
    glider: { commun: 500, 'peu commun': 500, rare: 800, 'épique': 1200, 'légendaire': 1500 },
    back: { commun: 200, 'peu commun': 300, rare: 400, 'épique': 600, 'légendaire': 800 },
    wrap: { commun: 300, 'peu commun': 300, rare: 400, 'épique': 500, 'légendaire': 800 },
    trail: { commun: 200, 'peu commun': 200, rare: 300, 'épique': 400, 'légendaire': 500 },
    emote: { commun: 200, 'peu commun': 200, rare: 500, 'épique': 800, 'légendaire': 800 },
    spray: { commun: 100, 'peu commun': 200, rare: 300, 'épique': 400, 'légendaire': 500 },
  };
  C.price = (it) => (PRICES[it.cat] && PRICES[it.cat][it.rarity]) || 800;
  C.shopPool = () => C.list.filter((i) => i.shop);

  // ---------------- STYLES (variantes de tenues) ----------------
  // Une variante = copie de la tenue de base avec quelques couleurs remplacées
  function merge(base, over) {
    const out = JSON.parse(JSON.stringify(base));
    for (const k in over) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && out[k] && typeof out[k] === 'object') Object.assign(out[k], over[k]);
      else out[k] = over[k];
    }
    return out;
  }
  C.addStyle = function (baseId, key, name, over) {
    const b = C.items[baseId];
    const data = merge(b, over);
    data.id = baseId + '__' + key; data.name = b.name + ' — ' + name; data.styleOf = baseId; data.styleName = name;
    delete data.shop; delete data.styles;
    C.items[data.id] = data; C.list.push(data);
    (b.styles || (b.styles = [])).push(data.id);
    return data;
  };
  C.addStyle('skin_commando', 'arctique', 'Arctique', { hat: { color: 0xe8eef4 }, top: { color: 0xe0e6ec, color2: 0xa8b4c0 }, pants: { color: 0xd8e0e8 } });
  C.addStyle('skin_commando', 'desert', 'Désert', { hat: { color: 0xc8a870 }, top: { color: 0xd0b080, color2: 0x9a7a4a }, pants: { color: 0xb89a6a } });
  C.addStyle('skin_punk', 'bleu', 'Néon bleu', { hair: { color: 0x2affea }, face: { paint: 'star' }, pants: { color: 0x1a3a5a } });
  C.addStyle('skin_astronaute', 'or', 'Doré', { hat: { color: 0xf0c030 }, top: { color: 0xf0c848, color2: 0xa06010 }, pants: { color: 0xe0b030 }, gloves: 0xf0c848, shoes: 0xa07010 });
  C.addStyle('skin_astronaute', 'mars', 'Rouge Mars', { hat: { color: 0xd84a2a }, top: { color: 0xd85a3a, color2: 0x2a2a2a }, pants: { color: 0xc84a2a }, gloves: 0x2a2a2a });
  C.addStyle('skin_ninja', 'blanc', 'Neige', { top: { color: 0xeeeef4, color2: 0xc02020 }, pants: { color: 0xe8e8f0 }, face: { mask: 0xeeeef4 }, hat: { color: 0x2a2a2a } });
  C.addStyle('skin_ninja', 'or', 'Dragon d\'or', { top: { color: 0x1a1a24, color2: 0xf0c030 }, hat: { color: 0xf0c030 }, scarf: 0xf0c030 });
  C.addStyle('skin_viking', 'glace', 'Glace', { hat: { color: 0xbfe6ff }, top: { color: 0x3a5a8a, color2: 0xe8f4ff }, hair: { color: 0xf0f8ff }, face: { beard: 0xf0f8ff } });
  C.addStyle('skin_nounours', 'bleu', 'Bleu ciel', { skin: 0x6ab0f0, top: { color: 0x6ab0f0, color2: 0xd0e8ff }, pants: { color: 0x6ab0f0 }, shoes: 0x6ab0f0, gloves: 0x6ab0f0 });
  C.addStyle('skin_nounours', 'noir', 'Nuit', { skin: 0x2a2a30, top: { color: 0x2a2a30, color2: 0xd83030 }, pants: { color: 0x2a2a30 }, shoes: 0x2a2a30, gloves: 0x2a2a30 });
  C.addStyle('skin_corbeau', 'neige', 'Neige', { skin: 0xd8dce8, hat: { color: 0xf0f2f8 }, top: { color: 0xf0f2f8, color2: 0x8aa0c0 }, pants: { color: 0xe0e4ee }, cape: 0xf0f2f8, face: { glowEyes: 0x40c0ff } });
  C.addStyle('skin_chevalier', 'blanc', 'Paladin', { hat: { color: 0xe8e8f0 }, top: { color: 0xe8e8f0, color2: 0xf0c030 }, pants: { color: 0xd8d8e0 }, gloves: 0xe8e8f0, cape: 0x2a4aa0, face: { glowEyes: 0x40a0ff } });
  C.addStyle('skin_robot', 'rouge', 'Surchauffe', { top: { color: 0x7a3a3a, color2: 0xff4020 }, pants: { color: 0x6a3030 }, glow: 0xff4020, face: { glowEyes: 0xff4020 } });
  C.addStyle('skin_roi', 'nuit', 'Roi de la Nuit', { top: { color: 0x2a2a34, color2: 0xc8ccd8 }, pants: { color: 0x2a2a34 }, gloves: 0x2a2a34, hat: { color: 0xc8ccd8 }, cape: 0x4a1a6a, glow: 0xa060ff, hair: { color: 0xd8d8e0 }, face: { beard: 0xd8d8e0 } });
  C.addStyle('skin_banane', 'bleue', 'Banane bleue', { skin: 0x5ab0ff, top: { color: 0x5ab0ff, color2: 0x3a80d0 }, pants: { color: 0x5ab0ff }, gloves: 0x5ab0ff });
  C.addStyle('skin_glace', 'aurore', 'Aurore', { top: { color: 0x9a6ae0, color2: 0xe8f8ff }, cape: 0x6ae0c0, glow: 0x6ae0c0, hat: { color: 0x6ae0c0 }, face: { glowEyes: 0x6ae0c0 } });
  C.addStyle('skin_lave', 'glace', 'Cryo', { skin: 0x1a2a3a, hair: { color: 0x40c0ff }, top: { color: 0x14202a, color2: 0x40c0ff }, glow: 0x40c0ff, face: { glowEyes: 0x60d0ff } });
  C.baseOf = (id) => { const it = C.items[id]; return it && it.styleOf ? it.styleOf : id; };

  // ---------------- PASSE DE COMBAT ----------------
  C.PASS = [
    null,
    'skin_commando', 'emote_floss', 'back_sac', 'wrap_camo', 'pick_hache', 'trail_etincelles', 'glider_parapluie', 'emote_applaudir', 'back_carquois', 'skin_cowboy',
    'emote_robot', 'wrap_zebre', 'pick_sucette', 'back_bouclier', 'skin_pompier', 'emote_tourbillon', 'trail_coeurs', 'glider_papier', 'emote_L', 'skin_pirate',
    'back_guitare', 'pick_cle', 'emote_rire', 'skin_surf', 'skin_astronaute', 'back_oxygene', 'glider_tapis', 'emote_chaise', 'trail_etoiles', 'skin_ninja',
    'pick_pelle', 'emote_vague', 'back_epee', 'wrap_lave', 'skin_banane', 'emote_disco', 'glider_dragon', 'skin_punk', 'emote_pompes', 'skin_viking',
    'pick_faux', 'trail_flammes', 'wrap_neon', 'skin_citrouille', 'emote_flexion', 'skin_nounours', 'back_nounours', 'glider_arcenciel', 'pick_laser', 'skin_corbeau',
    'emote_salto', 'back_ailes', 'wrap_arcenciel', 'skin_robot', 'pick_marteau', 'emote_hype', 'back_jetpack', 'trail_arcenciel', 'skin_chevalier', 'emote_orange',
    'wrap_diamant', 'wrap_or', 'skin_roi',
  ];
  C.PASS_TIERS = C.PASS.length - 1;
  C.tierOf = function (id) { const i = C.PASS.indexOf(id); return i > 0 ? i : 0; };
  // Débloque tout ce que le niveau permet ; renvoie les nouveaux objets
  C.syncUnlocks = function () {
    const d = G.Store.data;
    const got = [];
    for (let t = 1; t <= C.PASS_TIERS; t++) {
      if (d.level >= t && C.PASS[t] && G.Store.unlock(C.PASS[t])) got.push(C.PASS[t]);
    }
    return got;
  };
  C.byCat = (cat) => C.list.filter((i) => i.cat === cat && !i.styleOf && (!i.botOnly || G.Store.isUnlocked(i.id)));
  C.skinsForBots = () => C.list.filter((i) => i.cat === 'skin');
  // marquer les tenues réservées aux bots
  ['skin_docteur', 'skin_cuistot', 'skin_sportive', 'skin_hipster', 'skin_zombie', 'skin_agente', 'skin_explo'].forEach((id) => { C.items[id].botOnly = true; C.items[id].shop = true; });
})();
