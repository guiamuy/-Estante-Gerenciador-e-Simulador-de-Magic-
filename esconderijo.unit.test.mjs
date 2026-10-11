// M-268 · esconderijo (702.75, redação de 2022: o resto vai para o fundo em ordem aleatória) e "você pode jogar a carta exilada sem pagar
// o custo de mana se atacou com três ou mais criaturas neste turno". Carta: Windbrisk Heights (texto oficial em .listas/oficiais-commander.json,
// 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026; rulings de 2007-10-01 e 2022-04-29).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && (s.stack.length || s.queued.length); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

/** Joga a Windbrisk Heights da mão com o topo arrumado; devolve o estado já na escolha do esconderijo. */
function joga(topo) {
  let s = mesa(['Windbrisk Heights', 'Lightning Bolt', 'Thraben Inspector'], ['Faerie Seer']), wb;
  [s, wb] = poe(s, 0, 'Windbrisk Heights', 'hand');
  s = J(s); const t4 = s.zones[0].library.slice(0, 4); topo.forEach((n, i) => { s.objects[t4[i]].name = n; });
  s = ateDecisao(act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === wb)[0]));
  return { s, wb, t4 };
}

test('M-268 · Windbrisk Heights: entra virada; ao entrar, olha as quatro de cima, exila uma virada para baixo e põe as outras três no fundo', () => {
  let { s, wb, t4 } = joga(['Lightning Bolt', 'Plains', 'Thraben Inspector', 'Swamp']);
  assert.equal(s.objects[wb].tapped, true, 'entra virada');
  assert.equal(s.pending && s.pending.kind, 'pick'); assert.equal(s.pending.label, 'esconder'); assert.deepEqual(J(s.pending.from), t4); assert.equal(s.pending.min, 1); assert.equal(s.pending.max, 1);
  const lib = s.zones[0].library.length;
  s = tudo(act(s, { t: 'pick', p: 0, oid: t4[0] }));
  assert.equal(s.objects[t4[0]].zone, 'exile'); assert.equal(s.objects[t4[0]].faceDown, true, 'virada para baixo');
  assert.equal(s.objects[wb].escondida, t4[0], 'ligada à Windbrisk');
  assert.equal(s.zones[0].library.length, lib - 1);
  assert.deepEqual(J(s.zones[0].library.slice(-3)).sort(), J(t4.slice(1)).sort(), 'as outras três no fundo');
  assert.ok(!t4.slice(1).some(o => s.zones[0].library.slice(0, 3).includes(o)), 'nenhuma ficou no topo');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Windbrisk Heights'].abilities[0].effects), 'olha as 4 cartas de cima e exila uma virada para baixo; o resto vai para o fundo em ordem aleatória');
});

test('M-268 · Windbrisk Heights: sem ter atacado com três, a habilidade resolve sem nada; depois de atacar com três criaturas, joga a escondida sem pagar', () => {
  let { s, wb, t4 } = joga(['Lightning Bolt', 'Plains', 'Thraben Inspector', 'Swamp']);
  s = tudo(act(s, { t: 'pick', p: 0, oid: t4[0] })); // o raio fica escondido
  const cr = []; for (let i = 0; i < 3; i++) { let o; [s, o] = poe(s, 0, 'Thraben Inspector'); cr.push(o); }
  s = J(s); s.objects[wb].tapped = false; cr.forEach(o => { s.objects[o].sick = false; });
  // antes de atacar: ativa e nada acontece
  let x = comMana(s, 'W'); x = tudo(act(x, legais(x, 0, a => a.t === 'activate' && a.oid === wb)[0]));
  assert.equal(x.pending, null); assert.equal(x.objects[t4[0]].zone, 'exile'); assert.equal(x.objects[t4[0]].playableFromExile, undefined, 'continua escondida, sem permissão');
  // ataca com as três e, na segunda fase principal, ativa
  s = passaAte(s, y => y.pending && y.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: cr });
  for (let i = 0; i < 60 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, s.pending.kind === 'blockers' ? { t: 'block', p: s.pending.p, blocks: [] } : legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); s.objects[wb].tapped = false; s = comMana(s, 'W');
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === wb)[0]);
  for (let i = 0; i < 6 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending.kind, 'free_cast'); assert.deepEqual(J(s.pending.options), [t4[0]]);
  const vida = s.players[1].life;
  const c = legais(s, 0, a => a.t === 'cast_free' && a.oid === t4[0] && (a.targets || []).some(t => t.player === 1))[0];
  assert.ok(c, 'o raio, sem pagar, com alvo');
  s = tudo(act(s, c));
  assert.equal(s.players[1].life, vida - 3); assert.equal(s.objects[t4[0]].zone, 'graveyard'); assert.equal(s.objects[t4[0]].faceDown, undefined);
});

test('M-268 · Windbrisk Heights: recusar mantém escondida; terreno escondido usa a jogada de terreno do turno; a Windbrisk que sai e volta não tem mais a ligação', () => {
  let { s, wb, t4 } = joga(['Plains', 'Lightning Bolt', 'Thraben Inspector', 'Swamp']);
  s = tudo(act(s, { t: 'pick', p: 0, oid: t4[0] })); // uma Planície escondida
  const prep = (y, jogouTerreno) => { y = J(y); y.objects[wb].tapped = false; y.players[0].atacouCom = 3; y.players[0].landsPlayed = jogouTerreno ? 1 : 0; y = comMana(y, 'W');
    y = act(y, legais(y, 0, a => a.t === 'activate' && a.oid === wb)[0]); for (let i = 0; i < 6 && !y.pending; i++) y = act(y, { t: 'pass', p: y.turn.priority }); return y; };
  let x = prep(s, false);
  assert.equal(x.pending.kind, 'free_cast'); assert.ok(legais(x, 0, a => a.t === 'cast_free' && a.oid === t4[0]).length, 'terreno: pode jogar');
  x = act(x, { t: 'decline_free', p: 0 });
  assert.equal(x.objects[t4[0]].zone, 'exile'); assert.equal(x.objects[t4[0]].faceDown, true); assert.equal(x.objects[t4[0]].playableFromExile, undefined, 'recusou: sem permissão');
  assert.equal(legais(x, 0, a => a.oid === t4[0]).length, 0, 'não pode ser jogada depois');
  let y = prep(s, false); y = tudo(act(y, legais(y, 0, a => a.t === 'cast_free' && a.oid === t4[0])[0]));
  assert.equal(y.objects[t4[0]].zone, 'battlefield'); assert.equal(y.players[0].landsPlayed, 1, 'conta como a jogada de terreno');
  const z = prep(s, true); assert.equal(legais(z, 0, a => a.t === 'cast_free').length, 0, 'já jogou terreno: não pode');
  const w = J(s); E.moveObject(w, wb, 'hand'); E.moveObject(w, wb, 'battlefield'); assert.equal(w.objects[wb].escondida, undefined, 'objeto novo (400.7)');
  assert.ok(J(S.validateScript({ name: 'T', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'jogar_escondida', seAtacouCom: 0 }] }], example: { action: 'etb', target: 'none', expect: { picked: true } } })).some(e => /se atacou com/.test(e)));
});
