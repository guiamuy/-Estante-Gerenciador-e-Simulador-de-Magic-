// T-19 · CR5 · restos de 3xx/7xx de tipo: 304.4 / 307.4 (instantânea e feitiço não entram no campo) e o mapa dos itens de tipo
// conferido contra o motor de hoje. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte } from './listas.mjs';

const C = {};
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // "Ponha no campo, sob seu controle, uma carta alvo do seu cemitério." (sem filtro de tipo: isola a regra do tipo)
  'Retorno': { name: 'Retorno', effects: [{ do: 'mover', target: { zona: 'graveyard', de: 'you' }, para: 'battlefield' }], ...EX },
  'Raio': { name: 'Raio', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX },
  'Estudo': { name: 'Estudo', effects: [{ do: 'draw', amount: 1 }], ...EX },
};
carta('Retorno', 'Sorcery'); carta('Raio', 'Instant'); carta('Estudo', 'Sorcery'); carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
function mesa() {
  const deck = [{ name: 'Retorno', qty: 8, zone: 'main' }, { name: 'Raio', qty: 8, zone: 'main' }, { name: 'Estudo', qty: 8, zone: 'main' }, { name: 'Urso', qty: 8, zone: 'main' }, { name: 'Island', qty: 18, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = s => { s = J(s); for (const c of 'WUBRG') s.players[0].pool[c] += 5; return s; };
function retorna(s, nome) {
  let alvo, r; [s, alvo] = poe(s, 0, nome, 'graveyard'); [s, r] = poe(s, 0, 'Retorno', 'hand'); s = mana(s);
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === r && (x.targets || []).some(t => t.oid === alvo))[0]; assert.ok(a, 'Retorno mira ' + nome);
  return [passaAte(act(s, a), x => !x.stack.length || !!x.pending), alvo];
}

test('CR 304.4 / 307.4 · instantânea e feitiço não entram no campo: o efeito que os poria lá os deixa na zona em que estavam', () => {
  for (const nome of ['Raio', 'Estudo']) {
    const [s, o] = retorna(mesa(), nome);
    assert.equal(s.objects[o].zone, 'graveyard', nome + ' continua no cemitério');
    assert.ok(J(s.zones[0].graveyard).includes(o) && !J(s.zones[0].battlefield).includes(o));
  }
  const [s, u] = retorna(mesa(), 'Urso');
  assert.equal(s.objects[u].zone, 'battlefield', 'a criatura entra (guarda)');
});
