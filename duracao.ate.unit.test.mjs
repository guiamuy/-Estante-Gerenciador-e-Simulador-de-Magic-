// CR2d.1 · 610.3: "exile target X until ~ leaves the battlefield". O exílio é um efeito único com duração; quando a fonte sai do campo,
// um segundo efeito único devolve o objeto na hora, sem usar a pilha (610.3), sob o controle do dono (610.3b); se a fonte já saiu quando
// o exílio resolveria, nada se move (610.3a). Cada teste falha no motor v109 (a duração `fonte-sair` não existia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { S } from './listas.mjs';

const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { Banidor: c('Banidor', 'Enchantment', '{2}{W}'), Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }), Desencanta: c('Desencanta', 'Instant', '{W}') };
const scripts = { Desencanta: { name: 'Desencanta', effects: [{ do: 'destroy', target: 'enchantment' }], example: { target: 'enemy-permanent', expect: { gone: true } } },
  Banidor: { name: 'Banidor', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'exile', target: 'creature', ate: 'fonte-sair' }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveTudo = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('CR 610.3 · o script aceita `ate: fonte-sair` só em exile/mover', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(S.validateScript(scripts.Banidor))), []);
  assert.ok(S.validateScript({ ...scripts.Banidor, abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'draw', amount: 1, ate: 'fonte-sair' }] }] }).some(e => /fonte-sair/.test(e)));
  assert.ok(S.validateScript({ ...scripts.Banidor, abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'exile', target: 'creature', ate: 'fim-do-turno' }] }] }).some(e => /fonte-sair/.test(e)));
});

test('CR 610.3 · o Banidor exila a Ursa do oponente; quando o Banidor morre, a Ursa volta na hora, sem pilha, sob o controle do dono', () => {
  let s = mesaX(['Banidor', 'Desencanta'], ['Ursa']), ba, u, b;
  [s, u] = poe(s, 1, 'Ursa'); [s, ba] = poe(s, 0, 'Banidor', 'hand'); [s, b] = poe(s, 0, 'Desencanta', 'hand');
  s = J(s); s.objects[u].controller = 0; // A tinha roubado a Ursa: ao voltar, ela é de B de novo (610.3b)
  s = comMana(s, 'WWW');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ba)[0]); s = resolveTudo(s);
  if (s.pending) s = act(s, legais(s, s.pending.p).find(a => JSON.stringify(a).includes(u)) || legais(s, s.pending.p)[0]); s = resolveTudo(s);
  assert.equal(s.objects[u].zone, 'exile', 'exilada até o Banidor sair');
  assert.deepEqual(J(s).objects[ba].ate.map(a => a.oid), [u]);
  s = comMana(s, 'W');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === b && a.targets && a.targets[0].oid === ba)[0]);
  // o Desencanta resolve: o Banidor vai ao cemitério e, no mesmo passo, a Ursa volta — antes de qualquer jogador receber prioridade
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.objects[ba].zone, 'graveyard');
  assert.equal(s.objects[u].zone, 'battlefield', 'voltou na hora (610.3)');
  assert.equal(s.stack.length, 0, 'sem gatilho na pilha: a volta não usa a pilha');
  assert.equal(s.objects[u].controller, 1, 'sob o controle do dono (610.3b)');
  assert.equal(s.objects[ba].ate, undefined);
});

test('CR 610.3a · o Banidor morre em resposta ao gatilho de entrada: a Ursa NÃO é exilada (o evento "até" já aconteceu)', () => {
  let s = mesaX(['Banidor'], ['Ursa', 'Desencanta']), ba, u, b;
  [s, u] = poe(s, 1, 'Ursa'); [s, ba] = poe(s, 0, 'Banidor', 'hand'); [s, b] = poe(s, 1, 'Desencanta', 'hand');
  s = comMana(s, 'WWW'); s = comMana(s, 'W', 1);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ba)[0]);
  for (let i = 0; i < 6 && !(s.objects[ba].zone === 'battlefield' && s.stack.length); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  if (s.pending) s = act(s, legais(s, s.pending.p).find(a => JSON.stringify(a).includes(u)) || legais(s, s.pending.p)[0]);
  assert.ok(s.stack.length && s.objects[ba].zone === 'battlefield', 'gatilho na pilha mirando a Ursa');
  s = act(s, { t: 'pass', p: 0 });
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === b && a.targets && a.targets[0].oid === ba)[0]);
  s = act(s, { t: 'pass', p: 1 }); s = act(s, { t: 'pass', p: 0 });
  assert.equal(s.objects[ba].zone, 'graveyard', 'o Desencanta resolveu primeiro');
  s = resolveTudo(s);
  assert.equal(s.objects[u].zone, 'battlefield', 'nada se move (610.3a) — antes do v110 ela ficaria exilada para sempre');
});
