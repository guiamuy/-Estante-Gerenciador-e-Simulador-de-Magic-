// Cartas mínimas, no formato normalizado do D1. Suficiente para o núcleo.
const c = (name, type_line, extra = {}) => ({ name, type_line, cmc: 0, keywords: [], ...extra });
export const CARDS = {
  'Island': c('Island', 'Basic Land — Island'),
  'Mountain': c('Mountain', 'Basic Land — Mountain'),
  'Counterspell': c('Counterspell', 'Instant', { cmc: 2 }),
  'Lightning Bolt': c('Lightning Bolt', 'Instant', { cmc: 1 }),
  'Preordain': c('Preordain', 'Sorcery', { cmc: 1 }),
  'Delver of Secrets': c('Delver of Secrets', 'Creature — Human Wizard', { cmc: 1, power: '1', toughness: '1' }),
  'Spellstutter Sprite': c('Spellstutter Sprite', 'Creature — Faerie Wizard', { cmc: 2, power: '1', toughness: '1', keywords: ['Flash', 'Flying'] }),
  'Sol Ring': c('Sol Ring', 'Artifact', { cmc: 1 }),
  'Relic of Progenitus': c('Relic of Progenitus', 'Artifact', { cmc: 1, oracle_text: '{T}: Target player exiles a card from their graveyard.' }),
  'Malcolm, Alluring Scoundrel': c('Malcolm, Alluring Scoundrel', 'Legendary Creature — Siren Pirate', { cmc: 2, power: '2', toughness: '1', keywords: ['Flash', 'Flying'] })
};
export const PAUPER_DECK = [
  { name: 'Island', qty: 12, zone: 'main' }, { name: 'Mountain', qty: 6, zone: 'main' },
  { name: 'Counterspell', qty: 4, zone: 'main' }, { name: 'Lightning Bolt', qty: 4, zone: 'main' },
  { name: 'Preordain', qty: 4, zone: 'main' }, { name: 'Delver of Secrets', qty: 4, zone: 'main' },
  { name: 'Spellstutter Sprite', qty: 4, zone: 'main' }, { name: 'Sol Ring', qty: 2, zone: 'side' }
];
export const COMMANDER_DECK = [
  { name: 'Malcolm, Alluring Scoundrel', qty: 1, zone: 'commander' },
  { name: 'Island', qty: 60, zone: 'main' }, { name: 'Counterspell', qty: 20, zone: 'main' },
  { name: 'Preordain', qty: 18, zone: 'main' }, { name: 'Sol Ring', qty: 1, zone: 'main' }
];
export const setup = (format = 'pauper', seed = 42, mode = 'assisted') => ({
  format, seed, mode, cards: CARDS,
  players: [
    { name: 'Guilherme', deck: format === 'commander' ? COMMANDER_DECK : PAUPER_DECK },
    { name: 'Bot', deck: format === 'commander' ? COMMANDER_DECK : PAUPER_DECK }
  ]
});

// M6/M7/M14: cartas com custo, produção de mana e palavras-chave de combate.
const k = (name, type_line, mana_cost, pt, keywords = [], oracle_text = '') => ({ name, type_line, mana_cost, keywords, oracle_text, cmc: 0,
  ...(pt ? { power: String(pt[0]), toughness: String(pt[1]) } : {}) });
export const COMBAT_CARDS = {
  'Island': k('Island', 'Basic Land — Island', ''),
  'Mountain': k('Mountain', 'Basic Land — Mountain', ''),
  'Izzet Guildgate': k('Izzet Guildgate', 'Land — Gate', '', null, [], 'Izzet Guildgate enters the battlefield tapped.\n{T}: Add {U} or {R}.'),
  'Mind Stone': k('Mind Stone', 'Artifact', '{2}', null, [], '{T}: Add {C}.\n{1}, {T}, Sacrifice Mind Stone: Draw a card.'),
  'Sol Ring': k('Sol Ring', 'Artifact', '{1}', null, [], '{T}: Add {C}{C}.'),
  'Sky Pike': k('Sky Pike', 'Creature — Fish', '{1}{U}', [2, 1], ['Flying']),
  'Wall Guard': k('Wall Guard', 'Creature — Wall', '{1}{U}', [0, 4], ['Defender', 'Reach']),
  'Raging Hound': k('Raging Hound', 'Creature — Dog', '{2}{R}', [3, 1], ['Haste', 'Trample']),
  'Duelist': k('Duelist', 'Creature — Human', '{R/U}{R/U}', [2, 2], ['First strike']),
  'Twin Blade': k('Twin Blade', 'Creature — Human', '{1}{R}', [1, 1], ['Double strike']),
  'Venom Eel': k('Venom Eel', 'Creature — Fish', '{U}', [1, 1], ['Deathtouch']),
  'Leech Knight': k('Leech Knight', 'Creature — Knight', '{1}{U}', [2, 2], ['Lifelink', 'Vigilance']),
  'Brute': k('Brute', 'Creature — Ogre', '{3}{R}', [3, 3], ['Menace', 'Indestructible']),
  'Shock': k('Shock', 'Instant', '{R}', null),
  'Pal of Tests': k('Pal of Tests', 'Legendary Creature — Cat', '{1}{U}', [2, 2], [], 'Companion — Each permanent card in your starting deck has mana value 2 or less.'),
  'Test Commander': k('Test Commander', 'Legendary Creature — Human', '{U}{R}', [2, 2])
};
export const COMBAT_DECK = [
  { name: 'Island', qty: 9, zone: 'main' }, { name: 'Mountain', qty: 9, zone: 'main' }, { name: 'Izzet Guildgate', qty: 2, zone: 'main' },
  { name: 'Mind Stone', qty: 2, zone: 'main' }, { name: 'Sky Pike', qty: 4, zone: 'main' }, { name: 'Wall Guard', qty: 3, zone: 'main' },
  { name: 'Raging Hound', qty: 4, zone: 'main' }, { name: 'Duelist', qty: 4, zone: 'main' }, { name: 'Twin Blade', qty: 4, zone: 'main' },
  { name: 'Venom Eel', qty: 4, zone: 'main' }, { name: 'Leech Knight', qty: 4, zone: 'main' }, { name: 'Brute', qty: 3, zone: 'main' },
  { name: 'Shock', qty: 4, zone: 'main' }, { name: 'Pal of Tests', qty: 1, zone: 'companion' }
];
export const combatSetup = (seed = 1, { mode = 'assisted', manaCheck = true, format = 'pauper' } = {}) => ({
  format, seed, mode, manaCheck, cards: COMBAT_CARDS,
  players: [{ name: 'A', deck: COMBAT_DECK }, { name: 'B', deck: COMBAT_DECK }]
});

/** S62 · linha de tipo real das cartas com script, conferida carta a carta.
    Usada pelos cenários S8 e pela auditoria das listas Pauper. */
export const PERM_TYPES = { "Smuggler's Copter": 'Artifact — Vehicle', // CR2d.3
  'Elvish Visionary': 'Creature — Elf Shaman', 'Prodigal Sorcerer': 'Creature — Human Wizard', 'Cunning Sparkmage': 'Creature — Human Shaman',
  'Rod of Ruin': 'Artifact', 'Icy Manipulator': 'Artifact', 'Aether Spellbomb': 'Artifact', 'Mind Stone': 'Artifact',
  'Ichor Wellspring': 'Artifact', "Tormod's Crypt": 'Artifact',
  'Rancor': 'Enchantment — Aura', 'Ethereal Armor': 'Enchantment — Aura', 'Ancestral Mask': 'Enchantment — Aura',
  "Sentinel's Eyes": 'Enchantment — Aura', 'Spirit Link': 'Enchantment — Aura', 'Lifelink': 'Enchantment — Aura',
  'Angelic Gift': 'Enchantment — Aura', 'Flickering Ward': 'Enchantment — Aura', 'Skullclamp': 'Artifact — Equipment',
  'Utopia Sprawl': 'Enchantment — Aura', 'Abundant Growth': 'Enchantment — Aura', 'Armadillo Cloak': 'Enchantment — Aura',
  'Benevolent Blessing': 'Enchantment — Aura', 'Silhana Ledgewalker': 'Creature — Elf Rogue', 'Vault of Whispers': 'Artifact Land', 'Gladecover Scout': 'Creature — Elf Scout', 'Slippery Bogle': 'Creature — Beast', 'Aura Gnarlid': 'Creature — Beast',
  'Thraben Inspector': 'Creature — Human Soldier', 'Novice Inspector': 'Creature — Human Detective', 'Squadron Hawk': 'Creature — Bird',
  'Kor Skyfisher': 'Creature — Kor Soldier', 'Zulaport Cutthroat': 'Creature — Human Rogue', 'Cruel Celebrant': 'Creature — Vampire',
  'Corpse Knight': 'Creature — Zombie Knight', 'Elvish Vanguard': 'Creature — Elf Warrior', 'Bojuka Bog': 'Land',
  'Priest of Titania': 'Creature — Elf Druid', 'Overgrown Battlement': 'Creature — Wall', 'Axebane Guardian': 'Creature — Human Druid',
  'Timberwatch Elf': 'Creature — Elf Warrior', 'Valakut Invoker': 'Creature — Human Shaman', 'Bloodrite Invoker': 'Creature — Vampire Shaman',
  'Ninja of the Deep Hours': 'Creature — Human Ninja', 'Moon-Circuit Hacker': 'Creature — Human Ninja',
  'Tinder Wall': 'Creature — Plant Wall', 'Krark-Clan Shaman': 'Creature — Goblin Shaman',
  'Saheeli, Sublime Artificer': 'Legendary Planeswalker — Saheeli',
  'Voldaren Epicure': 'Creature — Vampire', 'Sheltering Landscape': 'Land', 'Bojuka Bog': 'Land',
  'Setessan Training': 'Enchantment — Aura', 'Kitchen Imp': 'Creature — Imp', 'Writhing Chrysalis': 'Creature — Eldrazi Drone',
  'Springleaf Drum': 'Artifact', 'Jaspera Sentinel': 'Creature — Elf Rogue', 'Birchlore Rangers': 'Creature — Elf Druid',
  'Lys Alana Huntmaster': 'Creature — Elf Warrior', 'Lunarch Veteran': 'Creature — Human Cleric', 'Sagu Wildling': 'Creature — Dragon',
  'Sorin of House Markov': 'Legendary Creature — Human Noble', 'Kytheon, Hero of Akros': 'Legendary Creature — Human Soldier',
  'Bounty Agent': 'Creature — Human Soldier', 'Elas il-Kor, Sadistic Pilgrim': 'Legendary Creature — Phyrexian Kor Cleric', // M-246
  'Kediss, Emberclaw Familiar': 'Legendary Creature — Elemental Lizard', 'Leonin Relic-Warder': 'Creature — Cat Cleric',
  'Speaker of the Heavens': 'Creature — Human Cleric', 'Jirina, Dauntless General': 'Legendary Creature — Human Soldier', 'Knight of the White Orchid': 'Creature — Human Knight', // M-247
  'Children of Korlis': 'Creature — Human Rebel Cleric', // M-248
  "Norn's Wellspring": 'Artifact', 'Cephalid Coliseum': 'Land', // M-249
  'Saprazzan Skerry': 'Land', // M-250
  'Combat Research': 'Enchantment — Aura', 'Rune of Mortality': 'Enchantment — Aura', 'Rune of Sustenance': 'Enchantment — Aura', // M-251
  'Idolized': 'Enchantment — Aura', 'Shineshadow Snarl': 'Land', // M-252
  "Skrelv's Hive": 'Enchantment', // M-253
  'Izzet Signet': 'Artifact', 'Orzhov Signet': 'Artifact', 'Arcane Signet': 'Artifact', 'Talisman of Creativity': 'Artifact',
  'Talisman of Hierarchy': 'Artifact', 'Fellwar Stone': 'Artifact', 'Lotus Petal': 'Artifact', 'Chromatic Sphere': 'Artifact',
  'Chromatic Star': 'Artifact', 'Soul-Guide Lantern': 'Artifact', 'Nihil Spellbomb': 'Artifact', 'Lembas': 'Artifact',
  'Faerie Seer': 'Creature — Faerie Wizard', 'Faerie Miscreant': 'Creature — Faerie Rogue', 'Spellstutter Sprite': 'Creature — Faerie Wizard',
  'Brinebarrow Intruder': 'Creature — Human Rogue', 'Harrier Strix': 'Creature — Bird',
  'Quirion Ranger': 'Creature — Elf Ranger', 'Shield-Wall Sentinel': 'Creature — Wall', 'Drift of Phantasms': 'Creature — Spirit',
  'Orochi Leafcaller': 'Creature — Snake Shaman', 'Saruli Caretaker': 'Creature — Dryad', 'Scattershot Archer': 'Creature — Elf Archer',
  'Standard Bearer': 'Creature — Human Flagbearer', 'Martyr of Sands': 'Creature — Human Cleric',
  'Nyxborn Hydra': 'Creature Enchantment — Hydra', 'Evolution Witness': 'Creature — Elf Shaman Mutant',
  'Sneaky Snacker': 'Creature — Faerie Rogue', 'Masked Vandal': 'Creature — Shapeshifter',
  "Nylea's Disciple": 'Creature — Centaur Archer', 'Gixian Infiltrator': 'Creature — Phyrexian Human',
  'Makeshift Munitions': 'Enchantment', 'Refurbished Familiar': 'Artifact Creature — Rat',
  'Cryoshatter': 'Enchantment — Aura', 'Mask of Law and Grace': 'Enchantment — Aura',
  'Journey to Nowhere': 'Enchantment', 'Troublemaker Ouphe': 'Creature — Ouphe',
  'Faerie Macabre': 'Creature — Faerie Rogue', 'Relic of Progenitus': 'Artifact',
  'Freed from the Real': 'Enchantment — Aura', 'Galvanic Alchemist': 'Creature — Human Wizard',
  "Raffine's Informant": 'Creature — Human Wizard', 'Leonardo, Big Brother': 'Legendary Creature — Mutant Ninja Turtle',
  'Vitu-Ghazi Inspector': 'Creature — Elf Detective', 'Mirrorshell Crab': 'Artifact Creature — Crab',
  'Salt Road Packbeast': 'Creature — Beast', 'Tuktuk Rubblefort': 'Creature — Wall',
  'Sewer-veillance Cam': 'Artifact', 'Secret Door': 'Artifact Creature — Wall',
  'Jagged Barrens': 'Land — Desert', 'Razortrap Gorge': 'Land', 'Rakdos Carnarium': 'Land',
  'Boros Garrison': 'Land', 'Wind-Scarred Crag': 'Land', 'Drossforge Bridge': 'Artifact Land',
  'Slagwoods Bridge': 'Artifact Land', 'Perilous Landscape': 'Land', 'Twisted Landscape': 'Land',
  'Mother of Runes': 'Creature — Human Cleric', 'Benevolent Bodyguard': 'Creature — Human Cleric',
  "Alseid of Life's Bounty": 'Enchantment Creature — Nymph', 'Selfless Savior': 'Creature — Dog',
  'Selfless Spirit': 'Creature — Spirit Cleric', 'Kami of False Hope': 'Creature — Spirit' };
