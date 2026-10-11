// CR2b.6 · os três erros restantes da auditoria da fase CR2b (11/10/2026), todos de última informação conhecida: o "se" de um gatilho cuja
// fonte mudou de zona usa o retrato do disparo (603.4, 608.2h); o observador vê quem saiu do campo como era lá (603.10a); a habilidade
// disparada concedida também olha para trás (603.10a). Cada teste falha no motor v107.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, tudo, mesa, CARTAS } from './cmd.mjs';

const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
function mesaX(a = [], b = [], { cards = {}, scripts = {} } = {}) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const EX = { action: 'etb', target: 'none', expect: { attached: false } };

test('CR 603.4 · Benalish Sleeper conjurada com reforço e devolvida em resposta ao gatilho: cada jogador sacrifica mesmo assim (antes o gatilho falhava)', () => {
  const cards = { Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }) };
  let s = mesaX(['Benalish Sleeper', 'Ursa'], ['Snapback', 'Ursa'], { cards }), bs, u, g1, g2;
  [s, bs] = poe(s, 0, 'Benalish Sleeper', 'hand'); [s, g1] = poe(s, 0, 'Ursa'); [s, g2] = poe(s, 1, 'Ursa'); [s, u] = poe(s, 1, 'Snapback', 'hand');
  s = comMana(s, 'WWBB'); s = comMana(s, 'UU', 1);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === bs && a.kick)[0]);
  for (let i = 0; i < 6 && !(s.objects[bs].zone === 'battlefield' && s.stack.length); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'pass', p: 0 }); s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === u && !a.alt && JSON.stringify(a.targets).includes(bs))[0]); s = act(s, { t: 'pass', p: 1 }); s = act(s, { t: 'pass', p: 0 });
  assert.equal(s.objects[bs].zone, 'hand', 'a Sleeper voltou à mão antes do gatilho resolver');
  for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[g1].zone, 'graveyard'); assert.equal(s.objects[g2].zone, 'graveyard');
});

test('CR 603.10 · Mishra\'s Factory animada morre com Zulaport Cutthroat no campo: era criatura ao morrer, o oponente perde 1 (antes 0)', () => {
  let s = mesa(['Zulaport Cutthroat', "Mishra's Factory", 'Lightning Bolt']), m, b;
  [s] = poe(s, 0, 'Zulaport Cutthroat'); [s, m] = poe(s, 0, "Mishra's Factory"); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand');
  s = comMana(s, 'C'); const at = legais(s, 0, a => a.t === 'activate' && a.oid === m); s = tudo(act(s, at.find(x => !x.targets || !x.targets.length) || at[0]));
  s = comMana(s, 'R'); const v1 = s.players[1].life;
  s = tudo(act(act(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === b && a.targets && a.targets[0].oid === m)[0]), { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
  assert.equal(s.objects[m].zone, 'graveyard');
  assert.equal(v1 - s.players[1].life, 1);
});

test('CR 603.10 · a habilidade disparada concedida por uma Aura ("quando esta criatura morrer, compre") dispara quando a criatura morre', () => {
  const cards = { Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }), Legado: c('Legado', 'Enchantment — Aura', '{B}'), Propria: c('Propria', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }) };
  const scripts = { Legado: { name: 'Legado', aura: { enchant: 'creature' }, grants: { triggered: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'draw', amount: 1 }] }] }, example: { action: 'aura', target: 'own-creature', expect: { attached: true } } },
    Propria: { name: 'Propria', abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'draw', amount: 1 }] }], example: EX } };
  for (const [quem, compra] of [['Ursa', 1], ['Propria', 2]]) {
    let s = mesaX(['Ursa', 'Legado', 'Propria', 'Lightning Bolt'], [], { cards, scripts }), u, l, b;
    [s, u] = poe(s, 0, quem); [s, l] = poe(s, 0, 'Legado'); s = J(s); s.objects[l].attachedTo = u; [s, b] = poe(s, 0, 'Lightning Bolt', 'hand');
    s = comMana(s, 'R'); const mao0 = s.zones[0].hand.length;
    s = tudo(act(act(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === b && a.targets && a.targets[0].oid === u)[0]), { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
    assert.equal(s.zones[0].hand.length - (mao0 - 1), compra, `${quem}: ${compra === 1 ? 'só a concedida (antes 0)' : 'a própria e a concedida (antes 1)'}`);
  }
});
