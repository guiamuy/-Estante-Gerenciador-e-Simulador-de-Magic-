// L-11 · trilha listas · Pauper de M a Z, lote 11 (plano paralelo de cobertura): presságio com descarte obrigatório (M-406), modal
// "up to two", anular e exilar com alvos no cemitério e "becomes a … artifact creature", numa partida em modo único (mana cobrada),
// com o texto oficial de .listas/oficiais-listas.json (Scryfall, consulta de 17/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, mesa, comMana, tudo, CARTAS } from './trilha-listas.mjs';

CARTAS['Bugiganga de Teste'] = { name: 'Bugiganga de Teste', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
CARTAS['Talismã de Teste'] = { name: 'Talismã de Teste', type_line: 'Artifact — Equipment', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
CARTAS['Aura de Teste'] = { name: 'Aura de Teste', type_line: 'Enchantment', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
CARTAS['Golem de Teste'] = { name: 'Golem de Teste', type_line: 'Artifact Creature — Golem', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '1', toughness: '1' };

const pt = (s, oid) => [E.stats(s, s.objects[oid]).power, E.stats(s, s.objects[oid]).toughness];
const zona = (s, oid) => s.objects[oid].zone;
const ate1aPrincipalSeguinte = s => passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > s.turn.number && !x.stack.length && !x.pending, 400);

test('L-11 · Stormshriek Feral: "Flying, haste" e "{1}{R}: This creature gets +1/+0 until end of turn." — só até o fim do turno', () => {
  let s = mesa(['Stormshriek Feral']), f; [s, f] = poe(s, 0, 'Stormshriek Feral', 'battlefield', { sick: true });
  assert.ok(E.hasKeyword(s, s.objects[f], 'flying') && E.hasKeyword(s, s.objects[f], 'haste'));
  assert.deepEqual(pt(s, f), [3, 3]);
  const m = comMana(s, 'RR'), at = legais(m, 0, a => a.t === 'activate' && a.oid === f);
  assert.ok(at.length, '{1}{R}: ativa (o custo não pede {T}, então enjoada também)');
  const r = tudo(act(m, at[0]));
  assert.deepEqual(pt(r, f), [4, 3], '+1/+0');
  assert.deepEqual(pt(ate1aPrincipalSeguinte(r), f), [3, 3], 'acabou no fim do turno');
});

test('L-11 · Flush Out (presságio): "Discard a card. If you do, draw two cards." — o descarte é obrigatório e a carta volta embaralhada ao grimório', () => {
  let s = mesa(['Stormshriek Feral', 'Urso de Teste']), f, u; [s, f] = poe(s, 0, 'Stormshriek Feral', 'hand'); [s, u] = poe(s, 0, 'Urso de Teste', 'hand');
  const m = comMana(s, 'RR'), om = legais(m, 0, a => a.t === 'cast' && a.oid === f && a.omen);
  assert.equal(om.length, 1, 'conjura o presságio por {1}{R}');
  const mao = m.zones[0].hand.length, cemi = m.zones[0].graveyard.length;
  let r = passaAte(act(m, om[0]), x => !x.stack.length || !!x.pending);
  assert.equal(r.pending && r.pending.kind, 'pick'); assert.equal(r.pending.min, 1, 'sem "you may": não dá para recusar o descarte');
  const picks = legais(r, 0); assert.ok(picks.length && picks.every(a => a.t === 'pick' && a.oid), 'só há descartes a escolher');
  r = tudo(act(r, picks.find(a => a.oid === u)));
  assert.equal(zona(r, u), 'graveyard', 'descartou o Urso');
  assert.equal(r.zones[0].hand.length, mao - 1 - 1 + 2, '−o presságio −o descarte +2 compradas');
  assert.equal(r.zones[0].graveyard.length, cemi + 1, 'só o descarte foi ao cemitério');
  assert.equal(zona(r, f), 'library', '"Then shuffle this card into its owner\'s library."');
});

test('L-11 · Flush Out: sem outra carta na mão, não descarta e por isso não compra ("If you do")', () => {
  let s = mesa(['Stormshriek Feral']), f; [s, f] = poe(s, 0, 'Stormshriek Feral', 'hand');
  s = JSON.parse(JSON.stringify(s));
  for (const oid of s.zones[0].hand.filter(o => o !== f)) { s.objects[oid].zone = 'library'; s.zones[0].library.push(oid); }
  s.zones[0].hand = [f];
  const m = comMana(s, 'RR'), om = legais(m, 0, a => a.t === 'cast' && a.oid === f && a.omen);
  const r = tudo(act(m, om[0]));
  assert.equal(r.zones[0].hand.length, 0, 'nenhuma compra');
  assert.equal(zona(r, f), 'library');
});

test('L-11 · Call Damage Control: "Choose up to two. Return those cards from your graveyard to your hand." — um ou dois modos, cada um com alvo legal', () => {
  let s = mesa(['Call Damage Control', 'Bugiganga de Teste', 'Urso de Teste']), c, a, u, l;
  [s, c] = poe(s, 0, 'Call Damage Control', 'hand'); [s, a] = poe(s, 0, 'Bugiganga de Teste', 'graveyard'); [s, u] = poe(s, 0, 'Urso de Teste', 'graveyard'); [s, l] = poe(s, 0, 'Forest', 'graveyard');
  const m = comMana(s, 'GG'), cs = legais(m, 0, x => x.t === 'cast' && x.oid === c);
  assert.ok(cs.length && cs.every(x => x.modes.length >= 1 && x.modes.length <= 2), 'até dois modos');
  assert.ok(!cs.some(x => x.modes.includes(2)), '"• Target enchantment card." sem encantamento no cemitério não é oferecido');
  const dois = cs.find(x => x.modes.length === 2 && x.modes.includes(0) && x.modes.includes(1));
  assert.ok(dois, '"• Target artifact card." e "• Target creature card." juntos');
  const r = tudo(act(m, dois));
  assert.equal(zona(r, a), 'hand'); assert.equal(zona(r, u), 'hand'); assert.equal(zona(r, l), 'graveyard', 'o terreno fica');
  assert.equal(zona(r, c), 'graveyard');
});

test('L-11 · Call Damage Control: "• Target land card." e "• Target enchantment card." — e só do seu cemitério', () => {
  let s = mesa(['Call Damage Control', 'Aura de Teste'], ['Aura de Teste']), c, en, l, deles;
  [s, c] = poe(s, 0, 'Call Damage Control', 'hand'); [s, en] = poe(s, 0, 'Aura de Teste', 'graveyard'); [s, l] = poe(s, 0, 'Forest', 'graveyard'); [s, deles] = poe(s, 1, 'Aura de Teste', 'graveyard');
  const m = comMana(s, 'GG'), cs = legais(m, 0, x => x.t === 'cast' && x.oid === c);
  assert.ok(!cs.some(x => (x.targets || []).some(t => t.oid === deles)), 'o cemitério do oponente não é alvo');
  const r = tudo(act(m, cs.find(x => x.modes.length === 2 && x.modes.includes(2) && x.modes.includes(3))));
  assert.equal(zona(r, en), 'hand'); assert.equal(zona(r, l), 'hand');
});

test('L-11 · Devious Cover-Up: "Counter target spell. If that spell is countered this way, exile it instead…" e "You may shuffle up to four target cards from your graveyard into your library."', () => {
  let s = mesa(['Devious Cover-Up', 'Bugiganga de Teste', 'Urso de Teste']), d, u, g1, g2;
  [s, d] = poe(s, 0, 'Devious Cover-Up', 'hand'); [s, u] = poe(s, 0, 'Urso de Teste', 'hand'); [s, g1] = poe(s, 0, 'Bugiganga de Teste', 'graveyard'); [s, g2] = poe(s, 0, 'Forest', 'graveyard');
  let m = comMana(s, 'GUUUU'); m = act(m, legais(m, 0, x => x.t === 'cast' && x.oid === u)[0]);
  const cs = legais(m, 0, x => x.t === 'cast' && x.oid === d);
  assert.ok(cs.some(x => x.targets.length === 1), 'zero cartas do cemitério: o "may"');
  assert.ok(!cs.some(x => x.targets.length > 5), 'no máximo quatro do cemitério');
  const r = tudo(act(m, cs.find(x => x.targets.length === 3)));
  assert.equal(zona(r, u), 'exile', 'anulada e exilada, não no cemitério');
  assert.equal(zona(r, g1), 'library'); assert.equal(zona(r, g2), 'library');
  assert.equal(zona(r, d), 'graveyard', 'a própria Cover-Up vai ao cemitério depois de resolver');
});

test('L-11 · Devious Cover-Up: sem cartas escolhidas, só anula e exila', () => {
  let s = mesa(['Devious Cover-Up', 'Urso de Teste']), d, u, g; [s, d] = poe(s, 0, 'Devious Cover-Up', 'hand'); [s, u] = poe(s, 0, 'Urso de Teste', 'hand'); [s, g] = poe(s, 0, 'Forest', 'graveyard');
  let m = comMana(s, 'GUUUU'); m = act(m, legais(m, 0, x => x.t === 'cast' && x.oid === u)[0]);
  const r = tudo(act(m, legais(m, 0, x => x.t === 'cast' && x.oid === d && x.targets.length === 1)[0]));
  assert.equal(zona(r, u), 'exile'); assert.equal(zona(r, g), 'graveyard');
});

test('L-11 · Kenku Artificer: "put three +1/+1 counters on up to one target noncreature artifact. That artifact becomes a 0/0 Homunculus artifact creature with flying." — para sempre, mantendo os tipos (205.1b)', () => {
  let s = mesa(['Kenku Artificer', 'Talismã de Teste', 'Golem de Teste']), k, t, g;
  [s, k] = poe(s, 0, 'Kenku Artificer', 'hand'); [s, t] = poe(s, 0, 'Talismã de Teste'); [s, g] = poe(s, 0, 'Golem de Teste');
  let r = act(comMana(s, 'UUU'), legais(comMana(s, 'UUU'), 0, x => x.t === 'cast' && x.oid === k)[0]);
  r = passaAte(r, x => !!x.pending || (!x.stack.length && x.objects[k].zone === 'battlefield'));
  const alvos = r.pending ? legais(r, r.pending.p) : [];
  assert.ok(!alvos.some(a => JSON.stringify(a).includes(`"${g}"`)), 'artefato que já é criatura não é alvo');
  r = tudo(r, x => legais(x, x.pending.p).find(a => JSON.stringify(a).includes(`"${t}"`)) || legais(x, x.pending.p)[0]);
  const o = r.objects[t];
  assert.equal(o.counters.p1p1, 3);
  assert.ok(E.isCreature(r, o), 'virou criatura');
  assert.deepEqual(pt(r, t), [3, 3], '0/0 com três marcadores');
  assert.ok(E.hasKeyword(r, o, 'flying'), 'com voar');
  const tp = JSON.stringify(E.tiposDe(r, o)), linha = E.linhaDeTipo(r, o); assert.ok(/artifact/.test(tp) && /creature/.test(tp), 'artefato criatura: ' + tp); assert.ok(/Homunculus/.test(linha) && /Equipment/.test(linha), 'Homúnculo e ainda Equipamento (205.1b): ' + linha);
  const depois = ate1aPrincipalSeguinte(r);
  assert.deepEqual(pt(depois, t), [3, 3], 'não acaba no fim do turno');
});

test('L-11 · Kenku Artificer: "up to one" — sem artefato que não seja criatura, entra e nada acontece', () => {
  let s = mesa(['Kenku Artificer']), k; [s, k] = poe(s, 0, 'Kenku Artificer', 'hand');
  const m = comMana(s, 'UUU'), r = tudo(act(m, legais(m, 0, x => x.t === 'cast' && x.oid === k)[0]));
  assert.equal(zona(r, k), 'battlefield'); assert.deepEqual(pt(r, k), [1, 1]);
});
