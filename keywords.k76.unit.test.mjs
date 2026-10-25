// K-76 · CR 205.1b / 205.3m / 611.2a / 613.1d–e / 613.4b · terreno que vira criatura ("It's still a land"), lido pelo leitor. Textos da
// Scryfall (api.scryfall.com, consulta de 25/10/2026) em .listas/oficiais-keywords.json. Antes, a frase "~ becomes a N/N … creature … It's
// still a land" não tinha padrão e as oito ficavam parciais. A aprovação (APROVADAS) é da homologação: aqui jogam pelo script lido passado
// à mão. Falham no motor anterior (sem padrão no leitor; sem "all creature types" no `torna`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n); return { name: n, type_line: c.type_line, mana_cost: '', cmc: 0, keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [] }; };
const OITO = ['Restless Reef', 'Restless Anchorage', 'Celestial Colonnade', 'Treetop Village', 'Inkmoth Nexus', 'Restless Bivouac', 'Mutavault', 'Soulstone Sanctuary'];
const viraDe = n => { const ab = S.leitura(of(n)).script.abilities.find(a => a.kind === 'activated'); return J(ab.effects); };

test('K-76 · 205.1b · o leitor lê as oito: o contínuo na própria fonte, com tipo somado, subtipos, P/T, cores e palavras-chave', () => {
  for (const n of OITO) { const l = S.leitura(of(n)); assert.ok(l, `${n}: leitura completa`); assert.equal(l.aprovada, false, n); assert.equal(S.coverage(of(n)).level, 'lida', n); }
  assert.deepEqual(viraDe('Restless Reef'), [{ do: 'continuo', target: 'self-source', torna: { tipos: ['creature'], somaTipos: true, subtipos: ['Shark'], base: [4, 4] }, palavras: ['deathtouch'], cores: ['U', 'B'] }]);
  assert.deepEqual(viraDe('Celestial Colonnade'), [{ do: 'continuo', target: 'self-source', torna: { tipos: ['creature'], somaTipos: true, subtipos: ['Elemental'], base: [4, 4] }, palavras: ['flying', 'vigilance'], cores: ['W', 'U'] }]);
  assert.deepEqual(viraDe('Inkmoth Nexus'), [{ do: 'continuo', target: 'self-source', torna: { tipos: ['artifact', 'creature'], somaTipos: true, subtipos: ['Phyrexian', 'Blinkmoth'], base: [1, 1] }, palavras: ['flying', 'infect'] }]);
  assert.deepEqual(viraDe('Mutavault'), [{ do: 'continuo', target: 'self-source', torna: { tipos: ['creature'], somaTipos: true, base: [2, 2], todosOsTiposDeCriatura: true } }]);
  assert.deepEqual(viraDe('Soulstone Sanctuary'), [{ do: 'continuo', target: 'self-source', torna: { tipos: ['creature'], somaTipos: true, base: [3, 3], todosOsTiposDeCriatura: true }, palavras: ['vigilance'], ate: 'sempre' }], '611.2a: sem "until end of turn" o efeito não acaba');
});

test('K-76 · o que não cabe continua sem leitura (nada aproximado): frase a mais, X, salvaguarda', () => {
  for (const n of ['Creeping Tar Pit', 'Lair of the Hydra', 'Hall of Storm Giants']) assert.equal(S.leitura(of(n)), null, n);
});

test('K-76 · "todosOsTiposDeCriatura" só como true, numa criatura, sem subtipos listados', () => {
  const sc = torna => ({ name: 'X', abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'continuo', target: 'self-source', torna }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } });
  assert.deepEqual(J(S.validateScript(sc({ tipos: ['creature'], somaTipos: true, base: [2, 2], todosOsTiposDeCriatura: true }))), []);
  for (const t of [{ tipos: ['artifact'], somaTipos: true, todosOsTiposDeCriatura: true }, { tipos: ['creature'], subtipos: ['Elf'], todosOsTiposDeCriatura: true }, { tipos: ['creature'], todosOsTiposDeCriatura: 1 }])
    assert.ok(S.validateScript(sc(t)).length, JSON.stringify(t));
});

const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const EX = { action: 'etb', target: 'none', expect: { attached: false } }; // o cenário S8 só para o validador da partida aceitar o script lido passado à mão
function mesa() {
  const C = { Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B') }, scripts = {};
  for (const n of ['Restless Reef', 'Mutavault', 'Soulstone Sanctuary']) { C[n] = of(n); scripts[n] = { ...S.leitura(C[n]).script, lido: true, example: EX }; }
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 76, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b(['Island', 'Swamp', 'Restless Reef', 'Mutavault', 'Soulstone Sanctuary']) }, { name: 'B', deck: b(['Island', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const proximoTurno = s => passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > s.turn.number && !x.stack.length && !x.pending, 800);
const ativa = (s, oid) => { const a = legais(s, 0, x => x.t === 'activate' && x.oid === oid); assert.ok(a.length, 'a mesa oferece virar criatura'); return limpa(act(s, a[0])); };

test('K-76 · Restless Reef: {2}{U}{B} vira 4/4 Tubarão azul e preto com toque mortal, continua terreno; no fim do turno volta a ser só terreno', () => {
  let s = mesa(), rr; [s, rr] = poe(s, 0, 'Restless Reef'); s = J(s); s.objects[rr].tapped = false;
  for (const n of ['Island', 'Island', 'Swamp', 'Swamp']) [s] = poe(s, 0, n);
  assert.equal(E.isCreature(s, s.objects[rr]), false);
  s = ativa(s, rr); const o = s.objects[rr];
  assert.equal(E.isCreature(s, o), true); assert.match(E.linhaDeTipo(s, o), /Land Creature — Shark/);
  assert.deepEqual(J(E.colorsOf(s, o)).sort(), ['B', 'U']); assert.equal(E.hasKeyword(s, o, 'deathtouch'), true);
  assert.deepEqual(J(E.stats(s, o)), { power: 4, toughness: 4 });
  s = proximoTurno(s); const d = s.objects[rr];
  assert.equal(E.isCreature(s, d), false, 'até o fim do turno'); assert.deepEqual(J(E.colorsOf(s, d)), []); assert.match(E.linhaDeTipo(s, d), /^Land$/);
});

test('K-76 · 205.3m · Mutavault vira 2/2 com todos os tipos de criatura até o fim do turno; Soulstone Sanctuary fica criatura (611.2a)', () => {
  let s = mesa(), mv, ss; [s, mv] = poe(s, 0, 'Mutavault'); [s, ss] = poe(s, 0, 'Soulstone Sanctuary');
  for (const n of ['Island', 'Island', 'Swamp', 'Swamp', 'Island']) [s] = poe(s, 0, n);
  assert.equal(E.metamorfoK(s, s.objects[mv], 'Goblin'), false, 'antes de ativar, nenhum tipo de criatura');
  s = ativa(s, mv);
  assert.equal(E.isCreature(s, s.objects[mv]), true); assert.deepEqual(J(E.stats(s, s.objects[mv])), { power: 2, toughness: 2 });
  for (const t of ['Goblin', 'Elf', 'Shark']) assert.equal(E.metamorfoK(s, s.objects[mv], t), true, t);
  assert.equal(E.metamorfoK(s, s.objects[mv], 'Forest'), false, '205.3m: tipo de terreno não é tipo de criatura');
  s = ativa(s, ss); assert.equal(E.hasKeyword(s, s.objects[ss], 'vigilance'), true);
  s = proximoTurno(s);
  assert.equal(E.isCreature(s, s.objects[mv]), false); assert.equal(E.metamorfoK(s, s.objects[mv], 'Goblin'), false);
  assert.equal(E.isCreature(s, s.objects[ss]), true, 'Soulstone Sanctuary continua criatura'); assert.equal(E.metamorfoK(s, s.objects[ss], 'Goblin'), true);
});
