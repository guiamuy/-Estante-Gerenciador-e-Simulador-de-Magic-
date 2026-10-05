// Proteção contra cor (702.16) ponta a ponta no motor, a partir do relato do aparelho de 04/10/2026 ("escolhi proteção contra
// uma cor em resposta a uma mágica de dano daquela cor e tomei o dano"). A causa estava na tela (ver e2e "proteção contra cor");
// estes testes fixam a regra no motor: alvo, dano com e sem alvo, combate, fonte multicolorida (basta UMA cor) e fonte incolor.
// Texto oficial da Mother of Runes: "{T}: Target creature you control gains protection from the color of your choice until end
// of turn." (casualplaneswalker.com, 04/10/2026). As outras cartas vêm de .listas/oficiais.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, CARDS, act, poe, legais, resolveUm, passaAte } from './listas.mjs';
const cards = { ...CARDS, 'Mother of Runes': { name: 'Mother of Runes', type_line: 'Creature — Human Cleric', mana_cost: '{W}', cmc: 1, keywords: [], colors: ['W'], power: '1', toughness: '1',
  oracle_text: '{T}: Target creature you control gains protection from the color of your choice until end of turn.' } };
const d = n => Object.entries(n).map(([name, qty]) => ({ name, qty, zone: 'main' }));
function jogo() {
  let s = E.createGame({ format: 'livre', seed: 3, mode: 'full', cards, players: [
    { name: 'A', deck: d({ 'Mother of Runes': 8, 'Kor Skyfisher': 12, Plains: 20 }) },
    { name: 'B', deck: d({ 'Lightning Bolt': 6, Terminate: 6, 'Breath Weapon': 6, 'Slippery Bogle': 4, 'Writhing Chrysalis': 4, 'Kitchen Imp': 4, Mountain: 10, Swamp: 6, Forest: 4 }) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  for (const t of ['Mountain', 'Mountain', 'Mountain', 'Swamp']) [s] = poe(s, 1, t);
  return s;
}
const protege = (s, mae, alvo, cor) => act(s, legais(s, 0, a => a.t === 'activate' && a.oid === mae && a.targets[0].oid === alvo && a.color === cor)[0]);
const tudo = s => { for (let i = 0; i < 30 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : resolveUm(s); return s; };
/** B conjura a mágica (no alvo, se tiver) e A responde dando proteção contra `cor` ao Skyfisher. */
function emResposta(magica, cor) {
  let s = jogo(), m, k, outro, b; [s, m] = poe(s, 0, 'Mother of Runes'); [s, k] = poe(s, 0, 'Kor Skyfisher'); [s, outro] = poe(s, 0, 'Kor Skyfisher'); [s, b] = poe(s, 1, magica, 'hand');
  s = act(s, { t: 'pass', p: 0 });
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === b && (!(a.targets || []).length || a.targets[0].oid === k))[0]); s = act(s, { t: 'pass', p: 1 });
  s = tudo(protege(s, m, k, cor));
  return { s, k, outro, m };
}

test('proteção · Lightning Bolt na criatura: proteção contra vermelho em resposta tira o alvo; nenhum dano entra', () => {
  const { s, k } = emResposta('Lightning Bolt', 'R');
  assert.equal(s.objects[k].zone, 'battlefield'); assert.equal(s.objects[k].damage, 0);
  const { s: x, k: k2 } = emResposta('Lightning Bolt', 'U'); assert.equal(x.objects[k2].zone, 'graveyard', 'proteção contra outra cor não salva');
});

test('proteção · fonte multicolorida: Terminate (preta e vermelha) é barrada pela proteção contra QUALQUER uma das cores dela', () => {
  for (const cor of ['B', 'R']) { const { s, k } = emResposta('Terminate', cor); assert.equal(s.objects[k].zone, 'battlefield', 'proteção contra ' + cor); }
  const { s, k } = emResposta('Terminate', 'W'); assert.equal(s.objects[k].zone, 'graveyard', 'branco não é cor da Terminate');
});

test('proteção · dano sem alvo (Breath Weapon, 2 em cada criatura): a protegida não leva dano, as outras levam', () => {
  const { s, k, outro, m } = emResposta('Breath Weapon', 'R');
  assert.equal(s.objects[k].zone, 'battlefield'); assert.equal(s.objects[k].damage, 0, 'dano vermelho prevenido');
  assert.equal(s.objects[outro].damage, 2, 'o outro Kor Skyfisher 2/3 leva 2'); assert.equal(s.objects[m].zone, 'graveyard', 'a Mother of Runes 1/1 morre');
});

/** B ataca com `atacante`; A dá proteção contra `cor` ao Skyfisher na declaração de atacantes e bloqueia com ele (se puder). */
function combate(atacante, cor) {
  let s = jogo(), m, k, x; [s, m] = poe(s, 0, 'Mother of Runes'); [s, k] = poe(s, 0, 'Kor Skyfisher'); [s, x] = poe(s, 1, atacante);
  s = passaAte(s, y => y.pending && y.pending.kind === 'attackers' && y.pending.p === 1); s = act(s, { t: 'attack', p: 1, attackers: [x] });
  s = passaAte(s, y => y.turn.priority === 0 || !!y.pending, 5); s = protege(s, m, k, cor); s = tudo(s);
  s = passaAte(s, y => y.pending && y.pending.kind === 'blockers'); s = act(s, { t: 'block', p: 0, blocks: [[k, x]] });
  s = passaAte(s, y => y.turn.step === 'main2');
  return { s, k, x };
}

test('proteção · combate: dano de criatura da cor protegida é prevenido; bicolor basta uma cor; incolor passa', () => {
  { const { s, k, x } = combate('Kitchen Imp', 'B'); assert.equal(s.objects[k].damage, 0, 'Kitchen Imp preto 2/2 não fere a protegida'); assert.equal(s.objects[x].zone, 'graveyard', 'e leva os 2 do Skyfisher'); }
  for (const cor of ['G', 'U']) { const { s, k } = combate('Slippery Bogle', cor); assert.equal(s.objects[k].damage, 0, 'Slippery Bogle é verde E azul: proteção contra ' + cor); }
  { const { s, k } = combate('Kitchen Imp', 'R'); assert.equal(s.objects[k].damage, 2, 'proteção contra vermelho não barra criatura preta'); }
  { const { s, k } = combate('Writhing Chrysalis', 'R'); assert.notEqual(s.objects[k].zone === 'battlefield' && s.objects[k].damage === 0, true, 'Writhing Chrysalis é incolor (desprovida de cor): o dano passa'); }
});

test('proteção · criatura da cor protegida não pode bloquear a protegida', () => {
  let s = jogo(), m, k, imp; [s, m] = poe(s, 0, 'Mother of Runes'); [s, k] = poe(s, 0, 'Kor Skyfisher'); [s, imp] = poe(s, 1, 'Slippery Bogle');
  s = tudo(protege(s, m, k, 'U'));
  s = passaAte(s, y => y.pending && y.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [k] });
  s = passaAte(s, y => (y.pending && y.pending.kind === 'blockers') || y.turn.step === 'main2');
  assert.throws(() => act(s, { t: 'block', p: 1, blocks: [[imp, k]] }), 'Slippery Bogle (verde e azul) não bloqueia quem tem proteção contra azul');
});
