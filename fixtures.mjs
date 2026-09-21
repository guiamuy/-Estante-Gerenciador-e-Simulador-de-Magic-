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
