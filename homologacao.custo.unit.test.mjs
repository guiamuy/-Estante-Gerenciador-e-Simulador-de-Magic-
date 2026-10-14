// H-13 · CR 601.2g–h / 602.2b · custo "{1}, {T}, Tap an untapped Gate you control" (Heap Gate): o pagamento automático da mana não pode virar,
// para gerar mana, o Portão que o jogador escolheu virar como custo. Achado da prova do catálogo (14/10, Pauper, Esper Frogmite ×
// Esper Guardian of the Guildpact, semente 37209): a mesa oferecia a habilidade virando a Sea Gate e o motor recusava ("vire 1 criatura(s)
// que sirvam de custo"), porque a mana {1} saía da própria Sea Gate.
// Texto oficial: Oracle do Forge (forge-gui/res/cardsfolder/h/heap_gate.txt, consultado em 14/10/2026):
// "{T}: Add {C}. / {1}, {T}: Add one mana of any color. / {1}, {T}, Tap an untapped Gate you control: Create a Treasure token."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, limpaMao, legais, passaAte } from './listas.mjs';
const T = (name, type_line, oracle_text) => ({ name, type_line, mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text });
const CARTAS = {
  'Heap Gate': T('Heap Gate', 'Land — Gate', '{T}: Add {C}.\n{1}, {T}: Add one mana of any color.\n{1}, {T}, Tap an untapped Gate you control: Create a Treasure token. (It\'s an artifact with "{T}, Sacrifice this token: Add one mana of any color.")'),
  Island: T('Island', 'Basic Land — Island', '({T}: Add {U}.)'),
  Plains: T('Plains', 'Basic Land — Plains', '({T}: Add {W}.)'),
};
function mesa(extras) {
  let s = E.createGame({ format: 'livre', seed: 4, mode: 'full', cards: CARTAS, players: [
    { name: 'A', deck: [{ name: 'Heap Gate', qty: 4 }, { name: 'Island', qty: 36 }] }, { name: 'B', deck: [{ name: 'Plains', qty: 40 }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0);
  let fonte, portao; [s, fonte] = poe(s, 0, 'Heap Gate'); [s, portao] = poe(s, 0, 'Heap Gate');
  const outros = []; for (const n of extras) { let o; [s, o] = poe(s, 0, n); outros.push(o); }
  s = J(s); for (const o of Object.values(s.objects)) if (o.zone === 'battlefield' && o.controller === 0) o.tapped = false; // nada virado
  return { s, fonte, portao, outros };
}
const ofertasDoTesouro = (s, fonte) => legais(s, 0, a => a.t === 'activate' && a.oid === fonte && a.pay && a.pay.tapOther);

test('H-13 · com uma Ilha para a mana, virar o outro Portão como custo é aceito: a Ilha paga o {1}, o Portão vira pelo custo e nasce o Tesouro', () => {
  const { s, fonte, portao, outros: [ilha] } = mesa(['Island']);
  const oferta = ofertasDoTesouro(s, fonte).find(a => [].concat(a.pay.tapOther).includes(portao));
  assert.ok(oferta, 'a mesa oferece virar o outro Portão');
  const t = act(s, oferta); // antes: "vire 1 criatura(s) que sirvam de custo" (o {1} saía do próprio Portão escolhido)
  assert.equal(t.objects[portao].tapped, true); assert.equal(t.objects[ilha].tapped, true, 'a Ilha pagou o {1}'); assert.equal(t.objects[fonte].tapped, true);
});

test('H-13 · sem outra fonte de mana, a habilidade não é oferecida: o único outro Portão não pode pagar o {1} e ser virado como custo', () => {
  const { s, fonte } = mesa([]);
  assert.equal(ofertasDoTesouro(s, fonte).length, 0);
});
