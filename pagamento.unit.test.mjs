// H6 · pagar com as manas que eu escolho: a escolha é conferida no próprio motor (viram as fontes, aplica a ação, vê se o motor
// ainda precisou virar alguma coisa). Lista real e texto oficial (.listas/decks.json e .listas/oficiais.json), como na leva 125.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, T, J, act, poe, decks, jogo as jogoDaLista } from './listas.mjs';
const jogo = (seed = 1) => jogoDaLista({ lista: 'Pauper Rakdos Madness', seed });
const nomes = (s, oids) => J(oids).map(o => s.objects[o].name).sort();
const conjurar = (s, p, oid) => E.legalActions(s, p).find(x => x.t === 'cast' && x.oid === oid);

test('H6 · o plano do motor vira sugestão; a conferência diz se a escolha paga, o que falta e o que sobra', () => {
  let s = jogo(); const a = s.turn.active; let sw, m1, m2, vk;
  [s, sw] = poe(s, a, 'Swamp'); [s, m1] = poe(s, a, 'Mountain'); [s, m2] = poe(s, a, 'Mountain'); [s, vk] = poe(s, a, "Vampire's Kiss", 'hand'); // {1}{B}
  const acao = conjurar(s, a, vk); assert.ok(acao, "Vampire's Kiss conjurável");
  const antes = E.hashState(s);
  const plano = T.planoDePagamento(s, acao);
  assert.equal(plano.precisa, true); assert.deepEqual(nomes(s, plano.sugestao.map(t => t.oid)), ['Mountain', 'Swamp'], 'a sugestão é o que o motor viraria sozinho');
  assert.deepEqual(nomes(s, plano.fontes.map(f => f.oid)), ['Mountain', 'Mountain', 'Swamp'], 'todas as fontes que posso virar');
  assert.equal(E.hashState(s), antes, 'planejar e conferir não mexem na partida');
  // a sugestão paga certo
  let r = T.conferePagamento(s, acao, plano.sugestao); assert.deepEqual([r.ok, J(r.falta), J(r.sobra), r.gerado.slice().sort().join('')], [true, [], {}, 'BR']);
  // só Mountains: falta o preto, e a conferência diz qual fonte completaria
  r = T.conferePagamento(s, acao, [{ oid: m1, option: 0 }, { oid: m2, option: 0 }]);
  assert.equal(r.ok, false); assert.deepEqual(nomes(s, r.falta), ['Swamp']); assert.equal(r.impossivel, false);
  // nada escolhido: falta tudo o que o motor viraria
  r = T.conferePagamento(s, acao, []); assert.equal(r.ok, false); assert.deepEqual(nomes(s, r.falta), ['Mountain', 'Swamp']);
  // a mais: paga e sobra na reserva
  r = T.conferePagamento(s, acao, [{ oid: sw, option: 0 }, { oid: m1, option: 0 }, { oid: m2, option: 0 }]);
  assert.equal(r.ok, true); assert.deepEqual(J(r.sobra), { R: 1 }, 'a Mountain a mais fica na reserva');
  // fonte que não existe ou já virada: impossível, com o motivo do motor
  r = T.conferePagamento(act(s, { t: 'tap_mana', p: a, oid: sw, option: 0 }), acao, [{ oid: sw, option: 0 }]); assert.equal(r.impossivel, true); assert.ok(r.erro);
  // pagando de verdade com a escolha: só o escolhido vira, nada flutua — igual ao que a conferência previu
  let t = s; for (const tq of [{ oid: sw }, { oid: m2 }]) t = act(t, { t: 'tap_mana', p: a, oid: tq.oid, option: 0 }); t = act(t, acao);
  assert.deepEqual([t.objects[sw].tapped, t.objects[m1].tapped, t.objects[m2].tapped], [true, false, true], 'virou a Mountain que eu escolhi, não a que o motor escolheria');
  assert.equal(Object.values(J(t.players[a].pool)).reduce((x, y) => x + y, 0), 0);
});

test('H6 · não abre folha quando não há o que escolher: mana já na reserva, ação sem custo de mana, passar', () => {
  let s = jogo(); const a = s.turn.active; let sw, m1, vk;
  [s, sw] = poe(s, a, 'Swamp'); [s, m1] = poe(s, a, 'Mountain'); [s, vk] = poe(s, a, "Vampire's Kiss", 'hand');
  const acao = conjurar(s, a, vk);
  const comReserva = act(act(s, { t: 'tap_mana', p: a, oid: sw, option: 0 }), { t: 'tap_mana', p: a, oid: m1, option: 0 });
  assert.equal(T.planoDePagamento(comReserva, acao).precisa, false, 'a reserva já paga: o motor não vira nada');
  assert.equal(T.planoDePagamento(s, { t: 'pass', p: a }).precisa, false); assert.equal(T.planoDePagamento(s, { t: 'tap_mana', p: a, oid: sw, option: 0 }).precisa, false);
  let terra; [s, terra] = poe(s, a, 'Mountain', 'hand');
  const jogaTerra = E.legalActions(s, a).find(x => x.t === 'play_land' && x.oid === terra); if (jogaTerra) assert.equal(T.planoDePagamento(s, jogaTerra).precisa, false, 'terreno não custa mana');
  assert.equal(T.planoDePagamento({ ...s, manaCheck: false }, acao).precisa, false, 'mesa sem cobrança de mana: nada a pagar');
  assert.equal(T.planoDePagamento(null, acao).precisa, false);
});

test('H6 · fonte de duas cores: a sugestão já traz a cor que paga; grupos com contador viram fontes de verdade', () => {
  let s = jogo(); const a = s.turn.active;
  // procura na lista um terreno que gere {B} ou {R}
  let dual = null, oidDual = null;
  for (const nome of Object.keys(decks['Pauper Rakdos Madness'])) { let t, o; try { [t, o] = poe(s, a, nome); } catch (e) { continue; }
    const ops = E.productions(t, t.objects[o]); if (ops.length === 2 && ops.every(x => x.length === 1)) { dual = nome; s = t; oidDual = o; if (s.objects[o].tapped) { s = J(s); s.objects[o].tapped = false; } break; } }
  if (!dual) return; // a lista não tem terreno de duas opções: os outros testes cobrem o resto
  const ops = E.productions(s, s.objects[oidDual]).map(x => x[0]);
  let vk; [s, vk] = poe(s, a, "Vampire's Kiss", 'hand'); let m1; [s, m1] = poe(s, a, 'Mountain');
  const acao = conjurar(s, a, vk); const plano = T.planoDePagamento(s, acao);
  assert.equal(plano.precisa, true);
  const doDual = plano.sugestao.find(t => t.oid === oidDual); assert.ok(doDual, `${dual} entra no pagamento de {1}{B}`);
  assert.equal(ops[doDual.option], 'B', 'a sugestão escolhe o preto no terreno de duas cores');
  assert.equal(T.conferePagamento(s, acao, plano.sugestao).ok, true);
  // trocar a cor do terreno para vermelho deixa o preto sem pagar
  const errada = plano.sugestao.map(t => t.oid === oidDual ? { oid: t.oid, option: ops.indexOf('R') } : t);
  const r = T.conferePagamento(s, acao, errada); assert.equal(r.ok, false, 'com o terreno gerando {R}, falta o {B}');
  // grupos e contagem: ida e volta
  const grupos = T.gruposDeFontes(plano.fontes); assert.deepEqual(J(grupos.map(g => [g.nome, g.oids.length, g.opcoes.length])).sort(), [[dual, 1, 2], ['Mountain', 1, 1]].sort());
  const conta = T.contagemDosToques(grupos, plano.sugestao);
  assert.deepEqual(J(T.toquesDaContagem(grupos, conta)).sort((x, y) => String(x.oid).localeCompare(String(y.oid))), J(plano.sugestao).sort((x, y) => String(x.oid).localeCompare(String(y.oid))));
  const g = grupos.find(x => x.nome === 'Mountain'); conta[g.chave][0] = 5; assert.equal(T.toquesDaContagem(grupos, conta).filter(t => g.oids.includes(t.oid)).length, 1, 'contador acima do que existe não inventa fonte');
});
