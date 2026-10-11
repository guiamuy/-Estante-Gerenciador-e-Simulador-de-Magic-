// CR2a.10 · 514.3a: na limpeza, se o fim dos efeitos "até o fim do turno" causa uma ação de estado ou um gatilho, os jogadores recebem
// prioridade e depois vem outra limpeza. Falha no motor v108 (o turno passava e o gatilho ia para a pilha no turno seguinte).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, passaAte, CARTAS } from './cmd.mjs';

const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
function mesaX(a = [], b = [], { cards = {}, scripts = {} } = {}) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('CR 514.3 · o 1/1 com marcador −1/−1 que perde o +1/+1 do turno morre na limpeza, o "morre" dele resolve ainda neste turno e vem outra limpeza', () => {
  const cards = { Fragil: c('Fragil', 'Creature — Spirit', '{W}', { power: '1', toughness: '1' }) };
  const scripts = { Fragil: { name: 'Fragil', abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'gain', amount: 2 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  let s = mesaX(['Fragil'], [], { cards, scripts }), f;
  [s, f] = poe(s, 0, 'Fragil');
  s = J(s); s.objects[f].counters.m1m1 = 1;
  E.applyEffect(s, { oid: 'x', name: 'Teste', controller: 0 }, { do: 'continuo', target: 'creature', poder: 1, resistencia: 1 }, { oid: f }, []);
  assert.equal(s.objects[f].zone, 'battlefield', '1/1 com −1/−1 e +1/+1 até o fim do turno: vive');
  const t0 = s.turn.number, v0 = s.players[0].life;
  s = passaAte(s, x => x.turn.step === 'cleanup' && x.stack.length > 0 || x.turn.number > t0);
  assert.equal(s.turn.number, t0, 'o turno não passa com o gatilho do que morreu na limpeza');
  assert.equal(s.objects[f].zone, 'graveyard');
  assert.equal(s.stack.length, 1, 'o "morre" está na pilha durante a limpeza');
  s = passaAte(s, x => x.turn.number > t0);
  assert.equal(s.players[0].life, v0 + 2, 'resolveu antes do turno seguinte');
});
