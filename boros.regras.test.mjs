// R6 · Boros Bully carta a carta: o que o texto oficial diz e o motor precisa fazer, com a lista real
// (.listas/decks.json), o texto de .listas/oficiais.json (consultas de 30/09/2026) e o modo único.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, jogo as jogoDaLista, legais, conjura, resolveUm, passaAte, temPalavra } from './listas.mjs';
const TERRENOS = ['Plains', 'Plains', 'Plains', 'Plains', 'Mountain', 'Mountain'];
const jogo = (seed = 1, o = {}) => jogoDaLista({ lista: 'Pauper Boros Bully', oponente: 'Pauper Rakdos Madness', seed, terrenos: TERRENOS, terrenosDoOponente: ['Mountain', 'Mountain', 'Swamp', 'Swamp'], ...o });
const zona = (s, oid) => s.objects[oid].zone;
const forca = (s, oid) => { const x = E.stats(s, s.objects[oid]); return `${x.power}/${x.toughness}`; };
const vida = s => J(s.players.map(p => p.life));
const desvira = (s, p = 0) => { s = J(s); for (const o of s.zones[p].battlefield) s.objects[o].tapped = false; return s; };
const acoes = (s, oid, f = () => true, p = 0) => legais(s, p, x => x.oid === oid && f(x));
const nomes = (s, p, z) => J(s.zones[p][z].map(o => s.objects[o].name));
const fichas = (s, nome) => s.zones[0].battlefield.filter(o => s.objects[o].name === nome);
function ate(s, decide = s => legais(s, s.pending.p)[0]) { for (let i = 0; i < 40 && (s.pending || s.stack.length); i++) s = s.pending ? act(s, decide(s)) : resolveUm(s); return s; }
const noTurnoDoOponente = s => passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
/** A ataca com as criaturas e para no passo de bloqueadores, com a prioridade de A (o oponente não bloqueia). */
function ateOsBloqueios(s, atacantes) { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: atacantes });
  for (let i = 0; i < 20 && !(s.turn.step === 'combat_blockers' && !s.pending && s.turn.priority === 0); i++) s = s.pending ? act(s, s.pending.kind === 'blockers' ? { t: 'block', p: 1, blocks: [] } : legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  return s; }

test('R6 · Lunarch Veteran: 1 de vida quando outra criatura entra sob o seu controle (não com artefato, não com criatura do oponente); perturbar {1}{W} volta como Luminous Phantom 1/1 voando', () => {
  let s = jogo(1); let v, i; [s, v] = poe(s, 0, 'Lunarch Veteran'); [s, i] = poe(s, 0, 'Thraben Inspector', 'hand');
  s = ate(conjura(s, 0, i)); assert.deepEqual(vida(s), [21, 20], 'o Inspector entrou: +1; a Pista (artefato) não conta');
  let o = noTurnoDoOponente(s); let imp; [o, imp] = poe(o, 1, 'Kitchen Imp', 'hand'); o = ate(act(o, legais(o, 1, x => x.t === 'cast' && x.oid === imp)[0])); assert.equal(o.players[0].life, 21, 'criatura do oponente não dispara');
  let g; [s, g] = poe(desvira(s), 0, 'Lunarch Veteran', 'graveyard');
  const d = acoes(s, g); assert.deepEqual(J(d.map(x => !!x.disturb)), [true], 'do cemitério, só perturbar');
  s = ate(act(s, d[0]));
  assert.equal(zona(s, g), 'battlefield'); assert.equal(s.objects[g].name, 'Luminous Phantom'); assert.equal(forca(s, g), '1/1'); assert.ok(E.hasKeyword(s, s.objects[g], 'flying'));
  assert.equal(s.players[0].life, 22, 'a Phantom entrando dispara a Veteran que está em campo');
});

test('R6 · Squadron Hawk: pode buscar até três Squadron Hawk; Thraben Inspector e Novice Inspector investigam (Pista: {2}, sacrificar: compre)', () => {
  let s = jogo(2); let h; [s, h] = poe(s, 0, 'Squadron Hawk', 'hand'); const mao = s.zones[0].hand.length;
  const noGrimorio = Math.min(3, s.zones[0].library.filter(o => s.objects[o].name === 'Squadron Hawk').length);
  let a = resolveUm(resolveUm(conjura(s, 0, h)));
  assert.equal(a.pending.kind, 'pick'); assert.equal(a.pending.min, 0, '"you may"'); assert.equal(a.pending.max, 3); assert.equal(a.pending.label, 'vasculhar');
  assert.ok(legais(a, 0, x => x.t === 'pick').every(x => a.objects[x.oid].name === 'Squadron Hawk'));
  a = ate(a, x => legais(x, 0, y => y.t === 'pick')[0] || { t: 'pick_done', p: 0 });
  assert.ok(noGrimorio >= 2); assert.equal(a.zones[0].hand.length, mao - 1 + noGrimorio, 'todas as que estavam no grimório, até três'); assert.ok(temPalavra(a, h, 'flying'));
  for (const nome of ['Thraben Inspector', 'Novice Inspector']) {
    let t = jogo(3); let i; [t, i] = poe(t, 0, nome, 'hand'); t = ate(conjura(t, 0, i));
    const pista = fichas(t, 'Clue'); assert.equal(pista.length, 1, nome); assert.equal(forca(t, i), '1/2');
    const m = t.zones[0].hand.length; t = ate(act(desvira(t), acoes(t, pista[0])[0]));
    assert.equal(t.zones[0].hand.length, m + 1); assert.equal(fichas(t, 'Clue').length, 0); assert.equal(t.zones[0].battlefield.filter(o => t.objects[o].tapped).length, 2, '{2}');
  }
});

test('R6 · Kor Skyfisher devolve uma permanente sua à mão (pode ser ela mesma); Raffine\'s Informant conspira: compra, descarta, marcador se a carta não for terreno', () => {
  let s = jogo(4); let k; [s, k] = poe(s, 0, 'Kor Skyfisher', 'hand');
  let a = resolveUm(resolveUm(conjura(s, 0, k)));
  assert.equal(a.pending.kind, 'pick'); assert.equal(a.pending.min, 1, 'é obrigatório');
  const ops = legais(a, 0, x => x.t === 'pick').map(x => x.oid); assert.ok(ops.includes(k), 'pode devolver a própria Skyfisher'); assert.equal(ops.length, 7, 'seis terrenos e ela');
  const terreno = ops.find(o => a.objects[o].name === 'Mountain'); a = ate(act(a, { t: 'pick', p: 0, oid: terreno }), x => ({ t: 'pick_done', p: 0 }));
  assert.equal(zona(a, terreno), 'hand'); assert.equal(zona(a, k), 'battlefield'); assert.equal(forca(a, k), '2/3'); assert.ok(temPalavra(a, k, 'flying'));
  for (const [tipo, esperado] of [['naoTerreno', '3/2'], ['terreno', '2/1']]) {
    let t = jogo(5); let r; [t, r] = poe(t, 0, "Raffine's Informant", 'hand'); const m = t.zones[0].hand.length;
    t = ate(conjura(t, 0, r), x => { assert.equal(x.pending.kind, 'discard'); const eTerreno = y => x.facts[x.objects[y.oid].name].types.includes('land'); let d = legais(x, 0).find(y => y.oid && (tipo === 'terreno') === eTerreno(y));
      if (!d) { /* garante uma carta do tipo pedido na mão */ d = legais(x, 0)[0]; } return d; });
    assert.equal(t.zones[0].hand.length, m - 1, 'comprou uma, descartou uma');
    const descartou = t.objects[t.zones[0].graveyard[t.zones[0].graveyard.length - 1]].name; const eraTerreno = t.facts[descartou].types.includes('land');
    assert.equal(forca(t, r), eraTerreno ? '2/1' : '3/2', `descartou ${descartou}`);
    if ((tipo === 'terreno') === eraTerreno) assert.equal(forca(t, r), esperado);
  }
});

test('R6 · Leonardo, Big Brother: +1/+0 por outra criatura sua; esgueirar-se {W} só nos bloqueadores, devolvendo atacante sem bloqueio; é conjurado e entra virado e atacando', () => {
  let s = jogo(6); let le, insp, vet; [s, le] = poe(s, 0, 'Leonardo, Big Brother', 'hand'); [s, insp] = poe(s, 0, 'Thraben Inspector'); [s, vet] = poe(s, 0, 'Lunarch Veteran');
  assert.deepEqual(J(acoes(s, le).map(x => x.t)), ['cast'], 'na fase principal, só conjurar por {2}{W}');
  s = ateOsBloqueios(s, [insp]);
  const sn = acoes(s, le, x => x.t === 'ninjutsu' && x.sneak); assert.equal(sn.length, 1); assert.equal(sn[0].attacker, insp);
  const livres = s.zones[0].battlefield.filter(o => !s.objects[o].tapped && s.facts[s.objects[o].name].types.includes('land')).length;
  s = act(s, sn[0]);
  assert.equal(zona(s, insp), 'hand', 'o atacante volta para a mão como custo'); assert.equal(zona(s, le), 'stack', '"cast this spell": passa pela pilha');
  assert.equal(s.zones[0].battlefield.filter(o => !s.objects[o].tapped && s.facts[s.objects[o].name].types.includes('land')).length, livres - 1, '{W}');
  s = ate(s);
  assert.equal(zona(s, le), 'battlefield'); assert.equal(s.objects[le].tapped, true); assert.ok(s.objects[le].attacking != null, 'entra atacando');
  assert.equal(forca(s, le), '2/3', '1/3 e +1/+0 pela Veteran');
});

test('R6 · Prismatic Strands: escolhe a cor na resolução e previne todo o dano de fontes dessa cor no turno; lampejo do passado virando uma criatura branca', () => {
  let s = jogo(7); let ps, vet, imp; [s, vet] = poe(s, 0, 'Lunarch Veteran'); [s, imp] = poe(s, 1, 'Kitchen Imp');
  s = noTurnoDoOponente(s); [s, ps] = poe(desvira(s), 0, 'Prismatic Strands', 'hand');
  // o Imp (preto) ataca; em resposta, Strands nomeando preto
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 1); s = act(s, { t: 'attack', p: 1, attackers: [imp] });
  for (let i = 0; i < 10 && s.turn.priority !== 0; i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  let a = resolveUm(act(s, acoes(s, ps, x => !x.flashback)[0]));
  assert.equal(a.pending.kind, 'choose_color'); assert.equal(a.pending.p, 0, 'a cor é escolhida quando a mágica resolve');
  a = act(a, { t: 'choose_color', p: 0, color: 'B' });
  for (let i = 0; i < 40 && a.turn.active === 1 && a.turn.step !== 'main2'; i++) a = a.pending ? act(a, a.pending.kind === 'blockers' ? { t: 'block', p: 0, blocks: [] } : legais(a, a.pending.p)[0]) : act(a, { t: 'pass', p: a.turn.priority });
  assert.equal(a.players[0].life, 20, 'o dano do Imp foi prevenido');
  // sem a Strands, o Imp causa 2
  let b = s; for (let i = 0; i < 40 && b.turn.active === 1 && b.turn.step !== 'main2'; i++) b = b.pending ? act(b, b.pending.kind === 'blockers' ? { t: 'block', p: 0, blocks: [] } : legais(b, b.pending.p)[0]) : act(b, { t: 'pass', p: b.turn.priority });
  assert.equal(b.players[0].life, 18);
  // lampejo do passado
  if (a.turn.priority !== 0 && !a.pending) a = act(a, { t: 'pass', p: a.turn.priority });
  assert.equal(zona(a, ps), 'graveyard'); const fb = acoes(a, ps, x => x.flashback); assert.ok(fb.length >= 1); assert.deepEqual(J(fb[0].pay.tapOther), [vet], 'vira uma criatura branca desvirada');
  let c = ate(act(a, fb[0]), x => x.pending.kind === 'choose_color' ? { t: 'choose_color', p: 0, color: 'R' } : legais(x, x.pending.p)[0]);
  assert.equal(zona(c, ps), 'exile'); assert.equal(c.objects[vet].tapped, true);
});

test('R6 · Battle Screech: duas fichas de Pássaro 1/1 brancas voando; lampejo do passado virando três criaturas brancas (as fichas servem)', () => {
  let s = jogo(8); let bs, vet; [s, bs] = poe(s, 0, 'Battle Screech', 'hand'); [s, vet] = poe(s, 0, 'Lunarch Veteran');
  s = ate(conjura(s, 0, bs));
  const aves = fichas(s, 'Bird'); assert.equal(aves.length, 2); assert.equal(forca(s, aves[0]), '1/1'); assert.ok(E.hasKeyword(s, s.objects[aves[0]], 'flying'));
  assert.equal(s.players[0].life, 22, 'cada Pássaro dispara a Veteran');
  const fb = acoes(s, bs, x => x.flashback); assert.equal(fb.length, 1); assert.deepEqual(J(fb[0].pay.tapOther).sort(), J([vet, ...aves]).sort(), 'as fichas acabaram de entrar e podem virar (não é {T})');
  s = ate(act(s, fb[0]));
  assert.equal(fichas(s, 'Bird').length, 4); assert.equal(zona(s, bs), 'exile'); assert.equal(s.players[0].life, 24);
  // com duas criaturas brancas só, não há lampejo
  let t = jogo(9); let b2; [t, b2] = poe(t, 0, 'Battle Screech', 'graveyard'); [t] = poe(t, 0, 'Lunarch Veteran'); [t] = poe(t, 0, 'Thraben Inspector');
  assert.equal(acoes(t, b2).length, 0);
});

test('R6 · Rally the Peasants: +2/+0 nas suas criaturas até o fim do turno, lampejo {2}{R}; Lightning Bolt 3 em qualquer alvo', () => {
  let s = jogo(10); let r, vet, imp; [s, r] = poe(s, 0, 'Rally the Peasants', 'hand'); [s, vet] = poe(s, 0, 'Lunarch Veteran'); [s, imp] = poe(s, 1, 'Kitchen Imp');
  s = ate(conjura(s, 0, r)); assert.equal(forca(s, vet), '3/1'); assert.equal(forca(s, imp), '2/2', 'só as suas');
  const fb = acoes(s, r, x => x.flashback); assert.equal(fb.length, 1);
  s = ate(act(s, fb[0])); assert.equal(forca(s, vet), '5/1'); assert.equal(zona(s, r), 'exile'); assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].tapped).length, 6, '{2}{W} e {2}{R}');
  s = passaAte(s, x => x.turn.active === 1); assert.equal(forca(s, vet), '1/1');
  let t = jogo(11); let lb; [t, lb] = poe(t, 0, 'Lightning Bolt', 'hand'); t = ate(act(t, acoes(t, lb, x => x.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 17);
});

test('R6 · Thraben Charm: dano igual ao dobro das suas criaturas; destruir encantamento; exilar o cemitério de quantos jogadores quiser', () => {
  let s = jogo(12, { oponente: 'Pauper GW Bogles', terrenosDoOponente: ['Forest', 'Plains'] }); let tc, bog, aura;
  [s, tc] = poe(s, 0, 'Thraben Charm', 'hand'); [s] = poe(s, 0, 'Lunarch Veteran'); [s] = poe(s, 0, 'Thraben Inspector'); [s, bog] = poe(s, 1, 'Aura Gnarlid'); [s, aura] = poe(s, 1, 'Ethereal Armor', 'battlefield', { attachedTo: bog });
  [s] = poe(s, 1, 'Rancor', 'graveyard'); [s] = poe(s, 0, 'Lightning Bolt', 'graveyard');
  const dano = ate(act(s, acoes(s, tc, x => x.mode === 0 && x.targets[0].oid === bog)[0])); assert.equal(zona(dano, bog), 'graveyard', 'duas criaturas: 4 de dano na Gnarlid 3/3');
  const destroi = ate(act(s, acoes(s, tc, x => x.mode === 1 && x.targets[0].oid === aura)[0])); assert.equal(zona(destroi, aura), 'graveyard');
  const so1 = ate(act(s, acoes(s, tc, x => x.mode === 2 && x.targets.length === 1 && x.targets[0].player === 1)[0]));
  assert.equal(so1.zones[1].graveyard.length, 0); assert.ok(nomes(so1, 0, 'graveyard').includes('Lightning Bolt'), 'só o do jogador alvo');
  const os2 = ate(act(s, acoes(s, tc, x => x.mode === 2 && x.targets.length === 2)[0]));
  assert.equal(os2.zones[1].graveyard.length, 0); assert.deepEqual(nomes(os2, 0, 'graveyard'), ['Thraben Charm'], 'os dois cemitérios; a Charm vai para o cemitério depois de resolver');
});

test('R6 · Dust to Dust exige dois artefatos diferentes; Electrickery: 1 de dano numa criatura que você não controla, ou em todas elas com a sobrecarga {1}{R}', () => {
  let s = jogo(13, { oponente: 'Pauper GW Bogles', terrenosDoOponente: ['Forest'] }); let dd, c1, c2;
  [s, dd] = poe(s, 0, 'Dust to Dust', 'hand'); [s, c1] = poe(s, 1, "Tormod's Crypt"); assert.equal(acoes(s, dd).length, 0, 'com um artefato só, não há como conjurar');
  [s, c2] = poe(s, 1, "Tormod's Crypt"); const ops = acoes(s, dd); assert.ok(ops.length >= 1 && ops.every(x => x.targets.length === 2 && x.targets[0].oid !== x.targets[1].oid));
  s = ate(act(s, ops[0])); assert.equal(zona(s, c1), 'exile'); assert.equal(zona(s, c2), 'exile');
  let t = jogo(14); let el, e1, e2, meu; [t, el] = poe(t, 0, 'Electrickery', 'hand'); [t, e1] = poe(t, 1, 'Voldaren Epicure'); [t, e2] = poe(t, 1, 'Voldaren Epicure'); [t, meu] = poe(t, 0, 'Lunarch Veteran');
  const normal = acoes(t, el, x => x.alt == null); assert.ok(normal.every(x => [e1, e2].includes(x.targets[0].oid)), 'não mira criatura sua');
  const um = ate(act(t, normal.find(x => x.targets[0].oid === e1))); assert.equal(zona(um, e1), 'graveyard'); assert.equal(zona(um, e2), 'battlefield');
  const todos = ate(act(t, acoes(t, el, x => x.alt != null)[0])); assert.equal(zona(todos, e1), 'graveyard'); assert.equal(zona(todos, e2), 'graveyard'); assert.equal(zona(todos, meu), 'battlefield', 'a sua criatura 1/1 fica');
  assert.equal(todos.zones[0].battlefield.filter(o => todos.objects[o].tapped).length, 2, '{1}{R}');
});

test('R6 · Hallow previne o dano da mágica alvo e você ganha essa vida; Martyr of Sands: {1}, revelar X cartas brancas, sacrificar: 3X de vida', () => {
  let s = jogo(15); let ha; [s, ha] = poe(s, 0, 'Hallow', 'hand'); s = desvira(noTurnoDoOponente(s));
  let ft; [s, ft] = poe(s, 1, 'Fiery Temper', 'hand'); s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === ft && x.targets[0].player === 0)[0]); if (s.turn.priority === 1) s = act(s, { t: 'pass', p: 1 });
  assert.deepEqual(J(acoes(s, ha).map(x => x.targets[0].oid)), [ft]);
  s = ate(act(s, acoes(s, ha)[0])); assert.deepEqual(vida(s), [23, 20], '3 de dano prevenidos, 3 de vida');
  let t = jogo(16); let m; [t, m] = poe(t, 0, 'Martyr of Sands');
  const brancas = t.zones[0].hand.filter(o => (t.facts[t.objects[o].name].colors || []).includes('W')).length;
  const ops = acoes(t, m); assert.deepEqual(J(ops.map(x => x.pay.revelar)).sort(), Array.from({ length: brancas + 1 }, (_, i) => i), 'de 0 até as brancas da mão');
  t = ate(act(t, ops.find(x => x.pay.revelar === brancas))); assert.equal(t.players[0].life, 20 + 3 * brancas); assert.equal(zona(t, m), 'graveyard');
});

test('R6 · terrenos: Boros Garrison entra virada, devolve um terreno seu e gera {R}{W}; Wind-Scarred Crag entra virada, 1 de vida, {R} ou {W}; Perilous Landscape busca Ilha, Montanha ou Planície básica', () => {
  let s = jogo(17); let g; [s, g] = poe(s, 0, 'Boros Garrison', 'hand');
  s = act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === g)[0]); assert.equal(s.objects[g].tapped, true);
  s = resolveUm(s); assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.min, 1);
  assert.ok(legais(s, 0, x => x.t === 'pick').every(x => s.facts[s.objects[x.oid].name].types.includes('land')), 'só terreno');
  const pl = legais(s, 0, x => x.t === 'pick' && s.objects[x.oid].name === 'Plains')[0].oid; s = ate(act(s, { t: 'pick', p: 0, oid: pl }), x => ({ t: 'pick_done', p: 0 }));
  assert.equal(zona(s, pl), 'hand'); assert.deepEqual(J(E.productions(s, s.objects[g])), [['R', 'W']]);
  let c = jogo(18); let cr; [c, cr] = poe(c, 0, 'Wind-Scarred Crag', 'hand'); c = ate(act(c, legais(c, 0, x => x.t === 'play_land' && x.oid === cr)[0]));
  assert.equal(c.objects[cr].tapped, true); assert.equal(c.players[0].life, 21); assert.deepEqual(J(E.productions(c, c.objects[cr])), [['R'], ['W']]);
  let p = jogo(19, { terrenos: ['Plains', 'Mountain'] }); let ld; [p, ld] = poe(p, 0, 'Perilous Landscape');
  assert.equal(act(p, acoes(p, ld, x => x.t === 'tap_mana')[0]).players[0].pool.C, 1);
  p = resolveUm(act(p, acoes(p, ld, x => x.t === 'activate')[0])); assert.equal(zona(p, ld), 'graveyard');
  assert.deepEqual([...new Set(legais(p, 0, x => x.t === 'pick').map(x => p.objects[x.oid].name))].sort(), ['Mountain', 'Plains']);
  const m = legais(p, 0, x => x.t === 'pick' && p.objects[x.oid].name === 'Mountain')[0].oid; p = ate(act(p, { t: 'pick', p: 0, oid: m }), x => ({ t: 'pick_done', p: 0 }));
  assert.equal(zona(p, m), 'battlefield'); assert.equal(p.objects[m].tapped, true);
});

test('v69 · gatilhos idênticos da mesma fonte não pedem ordem: a Lunarch Veteran com os dois Pássaros da Battle Screech vai à pilha duas vezes sem pergunta', () => {
  let s = jogo(20); let bs, vet; [s, bs] = poe(s, 0, 'Battle Screech', 'hand'); [s, vet] = poe(s, 0, 'Lunarch Veteran');
  s = resolveUm(conjura(s, 0, bs));
  assert.equal(s.pending, null, 'antes: "Ordem dos gatilhos" com duas opções iguais');
  assert.deepEqual(nomes(s, 0, 'battlefield').filter(n => n === 'Bird').length, 2);
  assert.deepEqual(J(s.stack.map(o => s.objects[o].name)), ['Lunarch Veteran', 'Lunarch Veteran']);
  // gatilhos DIFERENTES continuam pedindo a ordem (Squadron Hawk entrando com a Veteran em campo)
  let t = jogo(21); let h; [t, h] = poe(t, 0, 'Squadron Hawk', 'hand'); [t] = poe(t, 0, 'Lunarch Veteran');
  t = resolveUm(conjura(t, 0, h)); assert.equal(t.pending && t.pending.kind, 'triggers');
});
