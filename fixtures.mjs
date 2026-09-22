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
