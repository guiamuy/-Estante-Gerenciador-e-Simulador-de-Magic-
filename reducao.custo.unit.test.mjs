// M-333 · 601.2f · "This spell costs {N} less to cast for each …": a redução conta na hora de conjurar e só tira do custo genérico.
// Cryptic Serpent, Blasphemous Act, Search Party Captain e Stratadon (texto oficial em .listas/oficiais-revisadas.json, Oracle do Forge,
// 12/10/2026). Cada teste falha no motor anterior (o custo cheio era cobrado).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => (m.match(/\{(\d+)\}/) ? +m.match(/\{(\d+)\}/)[1] : 0) + (m.match(/\{[WUBRG]\}/g) || []).length;
const carta = n => { const c = OF.find(x => x.name === n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: /Trample/.test(c.oracle_text) ? ['Trample'] : [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const cards = { 'Cryptic Serpent': carta('Cryptic Serpent'), 'Blasphemous Act': carta('Blasphemous Act'), 'Search Party Captain': carta('Search Party Captain'), Stratadon: carta('Stratadon'),
  Raio: { name: 'Raio', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' } };
const scripts = {
  'Cryptic Serpent': { name: 'Cryptic Serpent', reduzPor: { generic: 1, per: 'instants-sorceries-in-your-graveyard' }, example: ex },
  'Blasphemous Act': { name: 'Blasphemous Act', reduzPor: { generic: 1, per: 'creatures-on-battlefield' }, effects: [{ do: 'damage', amount: 13, target: 'each-creature' }], example: { target: 'none', expect: { gone: true } } },
  'Search Party Captain': { name: 'Search Party Captain', reduzPor: { generic: 1, per: 'creatures-you-attacked-with-this-turn' }, abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'draw', amount: 1 }] }], example: ex },
  Stratadon: { name: 'Stratadon', reduzPor: { generic: 1, per: 'basic-land-types-you-control' }, example: ex },
  Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 1, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -1 } } }
};
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 5, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Island', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const podeConjurar = (s, oid, mana) => { s = comMana(s, mana); return legais(s, 0, x => x.t === 'cast' && x.oid === oid).length > 0; };

test('601.2f · Cryptic Serpent: {1} a menos por mágica instantânea ou feitiço no seu cemitério, nunca abaixo do colorido', () => {
  let s = mesaX(['Cryptic Serpent', 'Raio', 'Urso']), cs;
  [s, cs] = poe(s, 0, 'Cryptic Serpent', 'hand');
  assert.equal(podeConjurar(s, cs, 'UUUU'), false, 'cemitério vazio: custa 7');
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Raio', 'graveyard');
  [s] = poe(s, 0, 'Urso', 'graveyard');
  assert.equal(podeConjurar(s, cs, 'UUUU'), true, 'três Raios (a criatura não conta): custa 4');
  assert.equal(podeConjurar(s, cs, 'UUU'), false, '3 de mana não bastam');
  for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Raio', 'graveyard');
  assert.equal(podeConjurar(s, cs, 'UU'), true, 'oito mágicas: só o {U}{U} sobra');
  assert.equal(podeConjurar(s, cs, 'U'), false, 'a redução não tira do custo colorido');
  const t = act(comMana(s, 'UU'), legais(comMana(s, 'UU'), 0, x => x.t === 'cast' && x.oid === cs)[0]);
  assert.equal(t.objects[cs].zone, 'stack'); assert.equal(t.players[0].pool.U, 0, 'pagou {U}{U}');
});

test('601.2f · Blasphemous Act conta as criaturas dos dois lados; Stratadon conta os tipos básicos de terreno que você controla (domínio)', () => {
  let s = mesaX(['Blasphemous Act', 'Urso', 'Stratadon'], ['Urso']), ba, st;
  [s, ba] = poe(s, 0, 'Blasphemous Act', 'hand'); [s, st] = poe(s, 0, 'Stratadon', 'hand');
  for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Urso');
  for (let i = 0; i < 4; i++) [s] = poe(s, 1, 'Urso');
  assert.equal(podeConjurar(s, ba, 'R'), true, 'oito criaturas no campo: só o {R}');
  let u = J(s); u.zones[1].battlefield.pop();
  assert.equal(podeConjurar(u, ba, 'R'), false, 'sete: custa {1}{R}');
  assert.equal(podeConjurar(s, st, 'WWWWWWWWW'), false, 'sem terrenos: custa 10');
  const vir = { tapped: true }; // virados: só a reserva paga
  [s] = poe(s, 0, 'Plains', 'battlefield', vir); [s] = poe(s, 0, 'Plains', 'battlefield', vir); [s] = poe(s, 0, 'Island', 'battlefield', vir); [s] = poe(s, 0, 'Swamp', 'battlefield', vir);
  assert.equal(podeConjurar(s, st, 'WWWWWWW'), true, 'Planície, Ilha e Pântano (a segunda Planície não conta): custa 7');
  assert.equal(podeConjurar(s, st, 'WWWWWW'), false);
});

test('601.2f · Search Party Captain: {1} a menos por criatura com que você atacou neste turno (a contagem zera no turno seguinte)', () => {
  let s = mesaX(['Search Party Captain', 'Urso']), sp, u1, u2;
  [s, sp] = poe(s, 0, 'Search Party Captain', 'hand'); [s, u1] = poe(s, 0, 'Urso'); [s, u2] = poe(s, 0, 'Urso');
  assert.equal(podeConjurar(s, sp, 'WW'), false, 'sem ataque: custa 4');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: [u1, u2] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main2' && !x.stack.length && !x.pending);
  assert.equal(podeConjurar(s, sp, 'WW'), true, 'atacou com duas: custa {1}{W}');
  const t = passaAte(s, x => x.turn.active === 0 && x.turn.number > s.turn.number && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(podeConjurar(t, sp, 'WW'), false, 'no turno seguinte, antes de atacar: custa 4 de novo');
});

test('601.2f · combate extra: a criatura que ataca duas vezes conta uma vez em "each creature you attacked with this turn" (achado da revisão do lote VII)', () => {
  const RA = { name: 'Relentless Assault', type_line: 'Sorcery', mana_cost: '{2}{R}{R}', cmc: 4, keywords: [], oracle_text: 'Untap all creatures that attacked this turn. After this main phase, there is an additional combat phase followed by an additional main phase.', colors: ['R'] };
  let s = E.createGame({ format: 'livre', seed: 5, mode: 'full', cards: { ...CARTAS, ...cards, 'Relentless Assault': RA }, scripts, first: 0,
    players: [{ name: 'A', deck: [{ name: 'Search Party Captain', qty: 8, zone: 'main' }, { name: 'Urso', qty: 8, zone: 'main' }, { name: 'Relentless Assault', qty: 8, zone: 'main' }, { name: 'Plains', qty: 8, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Forest', qty: 30, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let sp, ra, u1, u2; [s, sp] = poe(s, 0, 'Search Party Captain', 'hand'); [s, ra] = poe(s, 0, 'Relentless Assault', 'hand'); [s, u1] = poe(s, 0, 'Urso'); [s, u2] = poe(s, 0, 'Urso');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [u1, u2] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main2' && !x.stack.length && !x.pending);
  s = comMana(s, 'RRRR'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ra)[0]); s = passaAte(s, x => !x.stack.length || !!x.pending);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [u1] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main2' && !x.stack.length && !x.pending);
  assert.equal(s.turn.number, 1, 'segundo combate no mesmo turno');
  assert.equal(podeConjurar(s, sp, 'WW'), true, 'duas criaturas atacaram: custa {1}{W}');
  assert.equal(podeConjurar(s, sp, 'W'), false, 'não três: a Urso que atacou duas vezes conta uma');
});

test('601.2f · a redução tira do genérico do custo total (com o imposto de comandante), não só do impresso (achado da revisão do lote VII)', () => {
  const k = (name, type_line, x = {}) => ({ name, type_line, mana_cost: '', cmc: 0, keywords: [], oracle_text: '', colors: [], ...x });
  const CS = { 'Blasphemous Act': cards['Blasphemous Act'], Mountain: k('Mountain', 'Basic Land — Mountain', { oracle_text: '({T}: Add {R}.)' }),
    Capitao: { ...k('Capitao', 'Legendary Creature — Human Soldier', { mana_cost: '{1}{R}', cmc: 2, colors: ['R'], power: '2', toughness: '2' }), color_identity: ['R'] }, Urso: cards.Urso };
  const sc = { Capitao: { name: 'Capitao', reduzPor: { generic: 1, per: 'creatures-on-battlefield' }, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const deck = [{ name: 'Capitao', qty: 1, zone: 'commander' }, { name: 'Mountain', qty: 60, zone: 'main' }];
  let s = E.createGame({ format: 'commander', seed: 3, mode: 'full', cards: { ...CS }, scripts: sc, first: 0, players: [{ name: 'A', deck }, { name: 'B', deck: [{ name: 'Mountain', qty: 60, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  const cap = s.zones[0].command[0];
  s = J(s); s.players[0].commanderCasts = { ...(s.players[0].commanderCasts || {}), [cap]: 1 }; // imposto {2}: total {3}{R}
  s.facts.Urso = s.facts.Urso || E.cardFacts(cards.Urso);
  for (let i = 0; i < 3; i++) { const oid = 'u' + i; s.objects[oid] = { oid, name: 'Urso', owner: 1, controller: 1, zone: 'battlefield', tapped: false, sick: false, damage: 0, counters: {} }; s.zones[1].battlefield.push(oid); }
  const pode = m => legais(comMana(s, m), 0, x => x.t === 'cast' && x.oid === cap).length > 0;
  assert.equal(pode('R'), true, 'três criaturas: {3}{R} − 3 = {R}');
  assert.equal(pode(''), false);
});

test('M-333 · leitor: "This spell costs {N} less to cast for each …" vira reduzPor e "Ward {N}" é palavra-chave; as 15 do lote VII revisadas jogam (decisão A)', async () => {
  const { loadModules } = await import('./_load.mjs'); const { scripts: S, leitor: L } = loadModules();
  const c = n => OF.find(x => x.name === n);
  assert.equal(JSON.stringify(L.ler(c('Tolarian Terror')).script), JSON.stringify({ name: 'Tolarian Terror', reduzPor: { generic: 1, per: 'instants-sorceries-in-your-graveyard' } }));
  assert.equal(JSON.stringify(L.ler(c('Stratadon')).script.reduzPor), JSON.stringify({ generic: 1, per: 'basic-land-types-you-control' }), '"Domain —" na frente');
  for (const n of ['Blasphemous Act', 'Tolarian Terror', 'Cryptic Serpent', 'Search Party Captain', 'Stratadon', 'Writhing Necromass', 'The Mary Janes', 'Witchstalker Frenzy', 'Inspired Fire', 'Rowdy Research', 'Toadstool Admirer', 'Pharaoh Rama-Tut', 'Lionheart Glimmer', 'Unflinching Hortimancer', 'Archive Dragon'])
    assert.equal(S.coverage(c(n)).level, 'completo', n + ' joga');
});
