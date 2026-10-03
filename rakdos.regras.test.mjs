// Leva 124 · R2 · Rakdos Madness carta a carta: o que o texto oficial diz e o motor precisa fazer, com a lista real
// (.listas/decks.json), o texto de .listas/oficiais.json (consulta 30/09/2026; Dark Withering e Smash to Smithereens
// reconferidas em mtg.wtf em 02/10/2026) e o modo único. A revisão não achou regra errada nestas cartas: estes testes
// fixam o que foi conferido. O que a revisão achou de errado no motor (pagamento que vira terreno demais) está em mana.unit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, jogo as jogoDaLista, limpaMao, legais, conjura, resolve, passaAte, alvosDe, oficiais, temPalavra } from './listas.mjs';
const RAKDOS = ['Mountain', 'Mountain', 'Mountain', 'Mountain', 'Swamp', 'Swamp'];
const jogo = (seed = 1, extra = {}) => jogoDaLista({ lista: 'Pauper Rakdos Madness', seed, terrenos: RAKDOS, terrenosDoOponente: ['Island', 'Island', 'Island', 'Island'], ...extra });
const zona = (s, oid) => s.objects[oid].zone;
const vida = s => J(s.players.map(p => p.life));
const descartaTudoQuePedir = (s, p, prefere = []) => { for (let i = 0; i < 6 && s.pending && s.pending.kind === 'discard'; i++) s = act(s, { t: 'discard', p, oid: prefere.find(o => s.zones[p].hand.includes(o)) || s.zones[p].hand[0] }); return s; };

test('Leva 124 · Dark Withering custa {4}{B}{B} no arquivo de textos oficiais (estava {B}, o custo de insanidade)', () => {
  const dw = oficiais.find(c => c.name === 'Dark Withering');
  assert.equal(dw.mana_cost, '{4}{B}{B}'); assert.match(dw.oracle_text, /Madness \{B\}/);
});

test('Leva 124 · Sneaky Snacker: volta virada na terceira compra do turno; a que foi descartada depois da terceira compra não volta', () => {
  let s = jogo(); const a = s.turn.active; let noCemiterio, naMao, fl;
  s = limpaMao(s, a); [s, noCemiterio] = poe(s, a, 'Sneaky Snacker', 'graveyard'); [s, fl] = poe(s, a, 'Faithless Looting', 'hand'); [s, naMao] = poe(s, a, 'Sneaky Snacker', 'hand');
  s = J(s); s.players[a].drawnThisTurn = 1;                       // já comprou a do turno
  s = resolve(conjura(s, a, fl, x => !x.flashback));
  assert.equal(s.players[a].drawnThisTurn, 3, 'Faithless Looting comprou a segunda e a terceira');
  assert.equal(s.pending.kind, 'discard', 'compra e descarte acontecem na mesma resolução: nada entra no meio');
  assert.equal(zona(s, noCemiterio), 'graveyard', 'o gatilho ainda não resolveu');
  s = descartaTudoQuePedir(s, a, [naMao]);
  assert.equal(zona(s, naMao), 'graveyard');
  s = resolve(s);
  assert.equal(zona(s, noCemiterio), 'battlefield'); assert.equal(s.objects[noCemiterio].tapped, true, 'volta virada');
  assert.equal(zona(s, naMao), 'graveyard', 'a que só chegou ao cemitério depois da terceira compra não dispara');
  // voa
  assert.equal(temPalavra(s, noCemiterio, 'flying'), true);
});

test('Leva 124 · Faithless Looting: compra duas, descarta duas, e o lampejo do passado custa {2}{R} e exila a carta', () => {
  let s = jogo(2); const a = s.turn.active; let fl;
  s = limpaMao(s, a); [s, fl] = poe(s, a, 'Faithless Looting', 'graveyard');
  const ofertas = legais(s, a, x => x.t === 'cast' && x.oid === fl);
  assert.equal(ofertas.length, 1); assert.equal(ofertas[0].flashback, true, 'do cemitério, só pelo lampejo');
  s = resolve(act(s, ofertas[0]));
  assert.equal(s.zones[a].battlefield.filter(o => s.objects[o].tapped).length, 3, '{2}{R}: três terrenos');
  assert.equal(s.pending.kind, 'discard'); assert.equal(s.pending.n, 2); assert.equal(s.pending.source, 'Faithless Looting', 'a decisão diz de qual carta é o descarte');
  s = descartaTudoQuePedir(s, a);
  assert.equal(zona(s, fl), 'exile', 'conjurada pelo lampejo, vai para o exílio'); assert.equal(s.zones[a].hand.length, 0);
});

test('Leva 124 · Faithless Looting descartando duas cartas de insanidade: cada uma é decidida, e as duas vão para a pilha', () => {
  let s = jogo(3); const a = s.turn.active; let fl, ft, ki;
  s = limpaMao(s, a); [s, fl] = poe(s, a, 'Faithless Looting', 'hand'); [s, ft] = poe(s, a, 'Fiery Temper', 'hand'); [s, ki] = poe(s, a, 'Kitchen Imp', 'hand');
  s = resolve(conjura(s, a, fl));
  s = act(s, { t: 'discard', p: a, oid: ft });
  assert.equal(zona(s, ft), 'exile', 'insanidade: descartada para o exílio'); assert.equal(s.pending.kind, 'madness'); assert.equal(s.pending.cost, '{R}');
  assert.equal(alvosDe(s, legais(s, a, x => x.t === 'cast_madness')).length >= 2, true, 'Fiery Temper mira qualquer alvo');
  s = act(s, legais(s, a, x => x.t === 'cast_madness' && x.targets[0].player === 1 - a)[0]);
  assert.equal(s.pending.kind, 'discard', 'depois da decisão, o segundo descarte da Looting');
  s = act(s, { t: 'discard', p: a, oid: ki });
  assert.equal(s.pending.kind, 'madness'); assert.equal(s.pending.cost, '{B}');
  s = act(s, legais(s, a, x => x.t === 'cast_madness')[0]);
  assert.deepEqual(J(s.stack.map(o => s.objects[o].name)), ['Fiery Temper', 'Kitchen Imp']);
  s = resolve(resolve(s));
  assert.equal(zona(s, ki), 'battlefield'); assert.equal(vida(s)[1 - a], 17, 'Fiery Temper: 3 de dano');
  assert.equal(zona(s, ft), 'graveyard');
});

test('Leva 124 · Kitchen Imp: insanidade {B} no turno do oponente, descartado como custo da ficha de Sangue; voa e tem ímpeto', () => {
  let s = jogo(4); const a = s.turn.active; let ep, ki;
  [s, ep] = poe(s, a, 'Voldaren Epicure', 'hand');
  s = resolve(conjura(s, a, ep)); s = resolve(s);
  assert.equal(vida(s)[1 - a], 19, 'Voldaren Epicure: 1 de dano em cada oponente');
  const sangue = s.zones[a].battlefield.find(o => s.objects[o].name === 'Blood'); assert.ok(sangue, 'e uma ficha de Sangue');
  assert.equal(s.objects[sangue].token, true);
  s = limpaMao(s, a); [s, ki] = poe(s, a, 'Kitchen Imp', 'hand');
  const t0 = s.turn.number;
  s = passaAte(s, x => x.turn.number === t0 + 1 && x.turn.priority === a && !x.pending);
  assert.equal(s.turn.active, 1 - a, 'turno do oponente');
  s = J(s); for (const o of s.zones[a].battlefield) s.objects[o].tapped = false;
  const ativa = legais(s, a, x => x.t === 'activate' && x.oid === sangue)[0];
  assert.deepEqual(J(ativa.pay.discard), [ki], 'o custo pede a carta a descartar');
  s = act(s, ativa);
  assert.equal(s.pending.kind, 'madness', 'descarte como custo também dá insanidade');
  s = act(s, legais(s, a, x => x.t === 'cast_madness')[0]);
  assert.deepEqual(J(s.stack.map(o => s.objects[o].name)), ['Blood', 'Kitchen Imp'], 'o Imp resolve antes da habilidade que o descartou');
  s = resolve(resolve(s));
  assert.equal(zona(s, ki), 'battlefield', 'criatura conjurada no turno do oponente: a insanidade ignora o tempo de feitiço');
  assert.equal(temPalavra(s, ki, 'flying'), true); assert.equal(temPalavra(s, ki, 'haste'), true); assert.equal(s.objects[ki].sick && !temPalavra(s, ki, 'haste'), false, 'pode atacar no turno em que entrou');
  assert.equal(s.zones[a].hand.length, 1, 'e a ficha de Sangue comprou a carta');
});

test('Leva 124 · insanidade vale no descarte da limpeza; sem mana, a única saída é o cemitério', () => {
  let s = jogo(5); const a = s.turn.active; let ft;
  s = limpaMao(s, a); [s, ft] = poe(s, a, 'Fiery Temper', 'hand');
  for (let i = 0; i < 7; i++) [s] = poe(s, a, i % 2 ? 'Lightning Bolt' : 'Kitchen Imp', 'hand');
  s = J(s); for (const o of s.zones[a].battlefield) s.objects[o].tapped = true;
  s = passaAte(s, x => !!(x.pending && x.pending.kind === 'discard'));
  assert.equal(s.turn.step, 'cleanup'); assert.equal(s.pending.source, undefined, 'descarte da limpeza não tem carta de origem');
  s = act(s, { t: 'discard', p: a, oid: ft });
  assert.equal(zona(s, ft), 'exile'); assert.equal(s.pending.kind, 'madness');
  assert.deepEqual(J(legais(s, a).map(x => x.t)), ['decline_madness'], 'sem mana: só recusar');
  s = act(s, { t: 'decline_madness', p: a }); assert.equal(zona(s, ft), 'graveyard');
});

test("Leva 124 · Vampire's Kiss mira qualquer jogador; Alms of the Vein só o oponente; as duas tiram vida (não é dano) e dão vida", () => {
  let s = jogo(6); const a = s.turn.active; let vk, av;
  [s, vk] = poe(s, a, "Vampire's Kiss", 'hand'); [s, av] = poe(s, a, 'Alms of the Vein', 'hand');
  assert.deepEqual(alvosDe(s, legais(s, a, x => x.t === 'cast' && x.oid === vk)), ['jogador A', 'jogador B']);
  assert.deepEqual(alvosDe(s, legais(s, a, x => x.t === 'cast' && x.oid === av)), ['jogador B'], '"target opponent"');
  s = resolve(conjura(s, a, vk, x => x.targets[0].player === 1 - a));
  assert.deepEqual(vida(s), [22, 18]); assert.equal(s.zones[a].battlefield.filter(o => s.objects[o].name === 'Blood').length, 2, 'duas fichas de Sangue');
  s = resolve(conjura(s, a, av));
  assert.deepEqual(vida(s), [25, 15]);
});

test('Leva 124 · End the Festivities: 1 de dano no oponente e em cada criatura dele, nenhuma das minhas; não tem alvo', () => {
  let s = jogo(7); const a = s.turn.active; let ef, c1, c2, minha;
  [s, ef] = poe(s, a, 'End the Festivities', 'hand'); [s, c1] = poe(s, 1 - a, 'Faerie Seer'); [s, c2] = poe(s, 1 - a, 'Spellstutter Sprite'); [s, minha] = poe(s, a, 'Voldaren Epicure');
  const ofertas = legais(s, a, x => x.t === 'cast' && x.oid === ef);
  assert.equal(ofertas.length, 1); assert.equal((ofertas[0].targets || []).length, 0, 'sem "target" no texto: não mira');
  s = resolve(act(s, ofertas[0]));
  assert.equal(vida(s)[1 - a], 19); assert.equal(zona(s, c1), 'graveyard'); assert.equal(zona(s, c2), 'graveyard'); assert.equal(zona(s, minha), 'battlefield');
});

test('Leva 124 · terrenos da lista: Jagged Barrens, Bojuka Bog, Razortrap Gorge e Rakdos Carnarium', () => {
  const joga = (s, a, nome) => { let oid; [s, oid] = poe(s, a, nome, 'hand'); s = J(s); s.players[a].landsPlayed = 0; return [act(s, { t: 'play_land', p: a, oid }), oid]; };
  let s = jogo(8); const a = s.turn.active; let jb, bog, cr;
  [s, jb] = joga(s, a, 'Jagged Barrens');
  assert.equal(s.objects[jb].tapped, true, 'entra virado'); s = resolve(s);
  assert.equal(vida(s)[1 - a], 19, '1 de dano no oponente alvo (um só oponente: sem pergunta)');
  assert.deepEqual(J(E.productions(s, s.objects[jb])), [['B'], ['R']]);
  [s, bog] = joga(s, a, 'Bojuka Bog');
  assert.equal(s.objects[bog].tapped, true); assert.equal(s.pending.kind, 'pick_target');
  assert.deepEqual(J(s.pending.options), [{ player: 0 }, { player: 1 }], '"target player": pode ser o próprio cemitério');
  let u; [u] = poe(s, 1 - a, 'Counterspell', 'graveyard'); u = resolve(act(u, { t: 'pick_target', p: a, index: 1 - a }));
  assert.equal(u.zones[1 - a].graveyard.length, 0, 'cemitério do oponente exilado');
  // Razortrap Gorge: virado, a menos que algum jogador tenha 13 ou menos de vida
  for (const [vidaDoOponente, virado] of [[20, true], [14, true], [13, false]]) { let g = jogo(8); g = J(g); g.players[1 - a].life = vidaDoOponente; let rg; [g, rg] = joga(g, a, 'Razortrap Gorge'); assert.equal(g.objects[rg].tapped, virado, `oponente com ${vidaDoOponente}`); }
  // Rakdos Carnarium: devolve um terreno seu, que pode ser ele mesmo; sozinho, é ele que volta
  let c = jogo(8); [c, cr] = joga(c, a, 'Rakdos Carnarium'); c = resolve(c);
  assert.equal(c.pending.kind, 'pick'); assert.equal(c.pending.min, 1, 'devolver é obrigatório'); assert.ok(J(c.pending.from).includes(cr), 'ele mesmo é opção');
  assert.deepEqual(J(E.productions(c, c.objects[cr])), [['B', 'R']], '{T}: {B}{R}');
  let so = jogoDaLista({ lista: 'Pauper Rakdos Madness', seed: 8 }); const b = so.turn.active; let cr2; [so, cr2] = joga(so, b, 'Rakdos Carnarium'); so = resolve(so);
  assert.equal(zona(so, cr2), 'hand', 'sem outro terreno, volta para a mão (ruling)'); assert.equal(so.pending, null);
});

test('Leva 124 · Nihil Spellbomb: exila o cemitério de qualquer jogador; indo do campo para o cemitério, pagar {B} compra uma carta', () => {
  let s = jogo(9); const a = s.turn.active; let nb;
  [s, nb] = poe(s, a, 'Nihil Spellbomb'); [s] = poe(s, 1 - a, 'Counterspell', 'graveyard');
  const ativa = legais(s, a, x => x.t === 'activate' && x.oid === nb);
  assert.deepEqual(alvosDe(s, ativa), ['jogador A', 'jogador B']);
  s = act(s, ativa.find(x => x.targets[0].player === 1 - a));
  assert.equal(zona(s, nb), 'graveyard', 'sacrificada como custo');
  s = resolve(s);
  assert.equal(s.pending.kind, 'may_pay'); assert.equal(s.pending.cost, '{B}');
  const mao = s.zones[a].hand.length;
  s = resolve(resolve(act(s, legais(s, a, x => x.t === 'pay')[0])));
  assert.equal(s.zones[a].hand.length, mao + 1); assert.equal(s.zones[1 - a].graveyard.length, 0);
});

test('Leva 124 · Red Elemental Blast só mira azul; Cast into the Fire aceita zero, um ou dois alvos diferentes; Smash to Smithereens fere o controlador e não faz nada se o artefato sumir; Dark Withering não mira criatura preta', () => {
  let s = jogo(10); const a = s.turn.active, b = 1 - a; let reb, cif, sm, dw, azul1, azul2, reliquia, preta;
  [s, azul1] = poe(s, b, 'Faerie Seer'); [s, azul2] = poe(s, b, 'Spellstutter Sprite'); [s, reliquia] = poe(s, b, 'Relic of Progenitus'); [s, preta] = poe(s, a, 'Kitchen Imp');
  [s, reb] = poe(s, a, 'Red Elemental Blast', 'hand'); [s, cif] = poe(s, a, 'Cast into the Fire', 'hand'); [s, sm] = poe(s, a, 'Smash to Smithereens', 'hand'); [s, dw] = poe(s, a, 'Dark Withering', 'hand');
  const de = oid => legais(s, a, x => x.t === 'cast' && x.oid === oid);
  assert.deepEqual(alvosDe(s, de(reb)), ['Faerie Seer de B', 'Spellstutter Sprite de B'], 'permanentes azuis; sem mágica azul na pilha, o modo de anular não aparece');
  assert.ok(de(reb).every(x => x.mode === 1));
  const fogo = de(cif).filter(x => x.mode === 0).map(x => (x.targets || []).map(t => t.oid));
  assert.ok(fogo.some(t => t.length === 0), '"up to two": zero alvos vale'); assert.ok(fogo.some(t => t.length === 1));
  assert.ok(fogo.filter(t => t.length === 2).every(t => t[0] !== t[1]), 'dois alvos são criaturas diferentes');
  assert.deepEqual(alvosDe(s, de(cif).filter(x => x.mode === 1)), ['Relic of Progenitus de B'], 'segundo modo: exilar um artefato');
  assert.deepEqual(alvosDe(s, de(sm)), ['Relic of Progenitus de B'], 'Smash mira só o artefato');
  let t = resolve(act(s, de(sm)[0])); assert.equal(vida(t)[b], 17, '3 de dano no controlador'); assert.equal(zona(t, reliquia), 'graveyard');
  let u = J(act(s, de(sm)[0])); u.zones[b].battlefield.splice(u.zones[b].battlefield.indexOf(reliquia), 1); u.zones[b].graveyard.push(reliquia); u.objects[reliquia].zone = 'graveyard'; u = resolve(u);
  assert.equal(vida(u)[b], 20, 'alvo ilegal ao resolver: nenhum dano (ruling de 22/06/2015)');
  assert.deepEqual(alvosDe(s, de(dw)), ['Faerie Seer de B', 'Spellstutter Sprite de B'], '"nonblack": o Kitchen Imp não é alvo');
  assert.equal(J(s.facts['Dark Withering'].cost).generic, 4);
});

test('Leva 124 · Grab the Prize: sem outra carta na mão não conjura; descartando terreno não causa dano; descartando outra coisa, 2 em cada oponente', () => {
  let s = jogo(11); const a = s.turn.active; let g1, g2, mt, bolt;
  s = limpaMao(s, a); [s, g1] = poe(s, a, 'Grab the Prize', 'hand');
  assert.equal(legais(s, a, x => x.t === 'cast' && x.oid === g1).length, 0, 'custo adicional impagável');
  [s, mt] = poe(s, a, 'Mountain', 'hand'); [s, bolt] = poe(s, a, 'Lightning Bolt', 'hand');
  const formas = legais(s, a, x => x.t === 'cast' && x.oid === g1);
  assert.equal(formas.length, 2, 'uma ação por carta que pode ser descartada');
  let t = resolve(act(s, formas.find(x => x.pay.discard[0] === mt))); assert.equal(vida(t)[1 - a], 20, 'terreno: sem dano'); assert.equal(t.zones[a].hand.length, 3);
  t = resolve(act(s, formas.find(x => x.pay.discard[0] === bolt))); assert.equal(vida(t)[1 - a], 18);
});
