// M-252 · "ataca sozinha" (506.5) como condição de gatilho concedido pela Aura, contagem de permanentes que não são terreno, e
// "revelar ao entrar" (Snarl: a escolha de revelar vem na própria ação de jogar o terreno, uma por nome de carta que serve).
// Cartas: Idolized e Shineshadow Snarl (texto oficial em .listas/oficiais-commander.json, 05/10/2026; segunda fonte 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { S } from './listas.mjs';
const anexa = (s, aura, host) => { s = J(s); s.objects[aura].attachedTo = host; s.objects[aura].anexadaEm = 900; return s; };
const atacaCom = (s, quem) => { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: quem });
  for (let i = 0; i < 12 && (s.queued.length || s.stack.length) && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return tudo(s); };

test('M-252 · Idolized: "Whenever this creature attacks alone, it gets +X/+X until end of turn, where X is the number of nonland permanents you control."', () => {
  let s = mesa(['Idolized', 'Thraben Inspector', 'Faerie Seer', 'Sol Ring'], []), id, ins, seer;
  [s, id] = poe(s, 0, 'Idolized'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, seer] = poe(s, 0, 'Faerie Seer'); [s] = poe(s, 0, 'Sol Ring'); [s] = poe(s, 0, 'Plains');
  s = anexa(s, id, ins);
  const base = E.stats(s, s.objects[ins]);
  // permanentes suas que não são terreno: Idolized, Inspector, Seer, Sol Ring = 4 (a Planície não conta)
  const sozinha = atacaCom(s, [ins]);
  assert.equal(E.stats(sozinha, sozinha.objects[ins]).power, base.power + 4, 'atacou sozinha: +4/+4');
  assert.equal(E.stats(sozinha, sozinha.objects[ins]).toughness, base.toughness + 4);
  const juntas = atacaCom(s, [ins, seer]);
  assert.equal(E.stats(juntas, juntas.objects[ins]).power, base.power, 'com outra atacante: nada');
  const semAura = atacaCom(anexa(s, id, null), [ins]);
  assert.equal(E.stats(semAura, semAura.objects[ins]).power, base.power, 'sem a Aura: nada');
});

test('M-252 · Shineshadow Snarl: "you may reveal a Plains or Swamp card from your hand. If you don\'t, this land enters tapped." — a mesa oferece jogar virada ou revelando, uma opção por carta que serve', () => {
  let s = mesa(['Shineshadow Snarl', 'Faerie Seer'], []), sn;
  [s, sn] = poe(s, 0, 'Shineshadow Snarl', 'hand');
  s = J(s); for (const oid of s.zones[0].hand.filter(x => x !== sn)) { s.zones[0].hand.splice(s.zones[0].hand.indexOf(oid), 1); s.zones[0].library.push(oid); s.objects[oid].zone = 'library'; }
  assert.deepEqual(J(legais(s, 0, a => a.t === 'play_land' && a.oid === sn)).map(a => a.revela ?? null), [null], 'sem Planície nem Pântano na mão: só jogar (virada)');
  let x = act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === sn)[0]); assert.equal(x.objects[sn].tapped, true, 'não revelou: virada');
  let pl, pl2, sw; [s, pl] = poe(s, 0, 'Plains', 'hand'); [s, pl2] = poe(s, 0, 'Plains', 'hand'); [s, sw] = poe(s, 0, 'Swamp', 'hand');
  const ofertas = J(legais(s, 0, a => a.t === 'play_land' && a.oid === sn));
  assert.equal(ofertas.length, 3, 'jogar sem revelar, revelando a Planície (uma vez, mesmo com duas) e revelando o Pântano');
  const r = E.apply(s, ofertas.find(a => a.revela === sw)); x = r.state;
  assert.equal(x.objects[sn].tapped, false, 'revelou: desvirada'); assert.equal(x.objects[sn].revelaAoEntrar, undefined, 'a marca não fica no objeto');
  assert.ok(r.events.some(e => e.do === 'reveal' && e.target === 'Swamp'), 'o registro diz o que foi revelado');
  assert.equal(x.zones[0].hand.includes(sw), true, 'revelar não tira a carta da mão');
  assert.throws(() => act(s, { t: 'play_land', p: 0, oid: sn, revela: s.zones[0].library[0] }), /revele uma carta/);
  assert.equal(act(s, ofertas.find(a => a.revela == null)).objects[sn].tapped, true, 'pode escolher não revelar');
});
