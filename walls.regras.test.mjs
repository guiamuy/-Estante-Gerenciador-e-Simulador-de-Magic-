// R8 · Walls Combo carta a carta: o que o texto oficial diz e o motor precisa fazer, com a lista real
// (.listas/decks.json), o texto de .listas/oficiais.json (consultas de 30/09/2026) e o modo único.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, T, J, act, poe, jogo as jogoDaLista, legais, conjura, resolveUm, passaAte, temPalavra } from './listas.mjs';
const jogo = (seed = 1, o = {}) => jogoDaLista({ lista: 'Pauper Walls Combo', oponente: 'Pauper Rakdos Madness', seed, terrenos: Array(6).fill('Forest'), terrenosDoOponente: ['Mountain', 'Mountain', 'Swamp', 'Swamp'], ...o });
const zona = (s, oid) => s.objects[oid].zone;
const forca = (s, oid) => { const x = E.stats(s, s.objects[oid]); return `${x.power}/${x.toughness}`; };
const desvira = (s, p = 0) => { s = J(s); for (const o of s.zones[p].battlefield) s.objects[o].tapped = false; return s; };
const comMana = (s, m) => { s = J(s); Object.assign(s.players[0].pool, m); return s; };
const acoes = (s, oid, f = () => true, p = 0) => legais(s, p, x => x.oid === oid && f(x));
const viradas = s => s.zones[0].battlefield.filter(o => s.objects[o].tapped).length;
function ate(s, decide = s => legais(s, s.pending.p)[0]) { for (let i = 0; i < 40 && (s.pending || s.stack.length); i++) s = s.pending ? act(s, decide(s)) : resolveUm(s); return s; }
const pegaPrimeira = x => legais(x, x.pending.p, y => y.t === 'pick')[0] || { t: 'pick_done', p: x.pending.p };
/** O oponente ataca com a criatura e para na declaração de bloqueadores de A. */
function oponenteAtaca(s, atacante) { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 1); s = act(s, { t: 'attack', p: 1, attackers: [atacante] }); return passaAte(s, x => x.pending && x.pending.kind === 'blockers'); }

test('R8 · Overgrown Battlement: defensor, {G} por criatura sua com defensor; Tuktuk Rubblefort dá ímpeto às suas criaturas (a muralha que entrou agora já gera mana)', () => {
  let s = jogo(1); let ob, tw; [s, ob] = poe(s, 0, 'Overgrown Battlement'); [s, tw] = poe(s, 0, 'Tinder Wall'); [s] = poe(s, 0, 'Quirion Ranger');
  assert.deepEqual(J(E.productions(s, s.objects[ob])), [['G', 'G']], 'duas com defensor; a Quirion Ranger não conta');
  assert.equal(E.eligibleAttackers(s, 0).includes(ob), false, 'defensor não ataca'); assert.equal(forca(s, ob), '0/4');
  let nova; [s, nova] = poe(s, 0, 'Overgrown Battlement', 'battlefield', { sick: true }); assert.equal(acoes(s, nova).length, 0, 'com enjoo não vira');
  let tr; [s, tr] = poe(s, 0, 'Tuktuk Rubblefort');
  assert.ok(E.hasKeyword(s, s.objects[nova], 'haste')); assert.equal(acoes(s, nova, x => x.t === 'tap_mana').length, 1, 'com ímpeto, vira no turno em que entrou');
  assert.ok(temPalavra(s, tr, 'defender') && temPalavra(s, tr, 'reach')); assert.equal(forca(s, tr), '0/3');
  assert.deepEqual(J(E.productions(s, s.objects[nova])), [['G', 'G', 'G', 'G']]);
});

test('R8 · Saruli Caretaker ({T} e virar outra criatura: qualquer cor) e Orochi Leafcaller ({G}: qualquer cor)', () => {
  let s = jogo(2); let sc; [s, sc] = poe(s, 0, 'Saruli Caretaker'); assert.equal(acoes(s, sc).length, 0, 'sozinha não paga o custo');
  let tw; [s, tw] = poe(s, 0, 'Tinder Wall', 'battlefield', { sick: true });
  const ops = acoes(s, sc); assert.deepEqual([...new Set(ops.map(x => x.color))].sort(), ['B', 'G', 'R', 'U', 'W']); assert.ok(ops.every(x => J(x.pay.tapOther).join() === tw));
  let a = act(s, ops.find(x => x.color === 'U')); assert.equal(a.players[0].pool.U, 1); assert.ok(a.objects[sc].tapped && a.objects[tw].tapped);
  let ol; [s, ol] = poe(s, 0, 'Orochi Leafcaller', 'battlefield', { sick: true });
  const fo = acoes(s, ol); assert.deepEqual([...new Set(fo.map(x => x.color))].sort(), ['B', 'G', 'R', 'U', 'W'], 'sem {T}: funciona com enjoo');
  const b = act(s, fo.find(x => x.color === 'B')); assert.equal(b.players[0].pool.B, 1); assert.equal(viradas(b), 1, 'pagou {G} com uma Floresta'); assert.equal(b.objects[ol].tapped, false);
});

test('R8 · Tinder Wall: sacrificar por {R}{R}; {R}, sacrificar: 2 de dano na criatura que ela está bloqueando (só quando bloqueia)', () => {
  let s = jogo(3); let tw, ep; [s, tw] = poe(s, 0, 'Tinder Wall'); [s, ep] = poe(s, 1, 'Voldaren Epicure');
  assert.deepEqual(J(acoes(s, tw).map(x => x.index)), [0], 'fora do bloqueio, só a mana');
  const m = act(s, acoes(s, tw)[0]); assert.equal(m.players[0].pool.R, 2); assert.equal(zona(m, tw), 'graveyard');
  s = oponenteAtaca(s, ep); s = act(s, { t: 'block', p: 0, blocks: [[tw, ep]] });
  for (let i = 0; i < 6 && s.turn.priority !== 0; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = comMana(s, { R: 1 }); const d = acoes(s, tw, x => x.index === 1); assert.deepEqual(J(d.map(x => x.targets[0].oid)), [ep]);
  s = ate(act(s, d[0])); assert.equal(zona(s, ep), 'graveyard'); assert.equal(zona(s, tw), 'graveyard');
});

test('R8 · Drift of Phantasms: defensor, voar, transmutar {1}{U}{U} busca carta de valor de mana 3; Shield-Wall Sentinel pode buscar criatura com defensor', () => {
  let s = jogo(4); let d; [s, d] = poe(s, 0, 'Drift of Phantasms', 'hand');
  assert.equal(acoes(s, d).length, 0, 'sem azul não conjura nem transmuta');
  s = comMana(s, { U: 2 });
  let a = resolveUm(act(s, acoes(s, d, x => x.t === 'transmute')[0])); assert.equal(zona(a, d), 'graveyard', 'descartada como custo');
  assert.equal(a.pending.kind, 'pick'); assert.ok(legais(a, 0, x => x.t === 'pick').every(x => a.facts[a.objects[x.oid].name].cmc === 3), 'só valor de mana 3');
  const mao = a.zones[0].hand.length; a = ate(a, pegaPrimeira); assert.equal(a.zones[0].hand.length, mao + 1);
  let c; [s, c] = poe(s, 0, 'Drift of Phantasms'); assert.equal(forca(s, c), '0/5'); assert.ok(temPalavra(s, c, 'defender') && temPalavra(s, c, 'flying'));
  let t = jogo(5); let sw; [t, sw] = poe(t, 0, 'Shield-Wall Sentinel', 'hand'); const m2 = t.zones[0].hand.length;
  t = ate(conjura(t, 0, sw), x => { assert.equal(x.pending.min, 0, '"you may"'); assert.ok(legais(x, 0, y => y.t === 'pick').every(y => (x.facts[x.objects[y.oid].name].kw || []).includes('defender'))); return pegaPrimeira(x); });
  assert.equal(t.zones[0].hand.length, m2, 'saiu a Sentinel, entrou a criatura buscada'); assert.equal(forca(t, sw), '1/3'); assert.equal(viradas(t), 4);
});

test('R8 · Galvanic Alchemist (vínculo de alma: as duas ganham "{2}{U}: desvire esta criatura") e Freed from the Real ({U}: vira, {U}: desvira a encantada): o motor de mana do baralho', () => {
  let s = jogo(6); let ob, ga; [s, ob] = poe(s, 0, 'Overgrown Battlement'); for (const n of ['Tinder Wall', 'Saruli Caretaker', 'Drift of Phantasms']) [s] = poe(s, 0, n);
  [s, ga] = poe(s, 0, 'Galvanic Alchemist', 'hand'); s = comMana(s, { U: 1 });
  s = ate(conjura(s, 0, ga), x => { assert.equal(x.pending.kind, 'choose_pair'); return { t: 'choose_pair', p: 0, oid: ob }; });
  assert.equal(s.objects[ga].paired, ob); assert.equal(forca(s, ga), '1/4');
  // a Battlement gera {G}{G}{G}{G}; {2}{U} desvira: com {U} de outra fonte, cada volta rende mana
  s = act(desvira(s), acoes(s = desvira(s), ob, x => x.t === 'tap_mana')[0]); assert.equal(s.players[0].pool.G, 4);
  s = comMana(s, { U: 1 }); const des = acoes(s, ob, x => x.t === 'activate'); assert.equal(des.length, 1, 'a habilidade concedida pelo par');
  s = ate(act(s, des[0])); assert.equal(s.objects[ob].tapped, false); assert.equal(s.players[0].pool.G, 2, 'pagou {2}{U}');
  // Freed from the Real
  let t = jogo(7); let b2, fr; [t, b2] = poe(t, 0, 'Overgrown Battlement'); [t, fr] = poe(t, 0, 'Freed from the Real', 'hand'); t = comMana(t, { U: 1 });
  t = ate(act(t, acoes(t, fr, x => x.targets[0].oid === b2)[0])); assert.equal(t.objects[fr].attachedTo, b2);
  t = comMana(desvira(t), { U: 2 }); const hs = acoes(t, fr); assert.deepEqual(J(hs.map(x => x.index)).sort(), [0, 1], 'duas habilidades de {U}');
  t = ate(act(t, hs.find(x => x.index === 0))); assert.equal(t.objects[b2].tapped, true, 'a primeira vira');
  t = ate(act(t, acoes(t, fr, x => x.index === 1)[0])); assert.equal(t.objects[b2].tapped, false, 'a segunda desvira');
  // os dois botões da folha têm nomes diferentes (com o mesmo nome a mesa juntava num só e desvirar ficava inalcançável)
  const sc = t.facts['Freed from the Real'].script.abilities;
  assert.deepEqual(J(sc.map(ab => T.descreveEfeitos(ab.effects))), ['vira a criatura encantada', 'desvira a criatura encantada']);
});

test('R8 · finalizadores: Bloodrite Invoker ({8}: o jogador alvo perde 3 e você ganha 3), Secret Door ({4}{U}: aventurar-se na masmorra, só em momento de feitiço), Sagu Wildling (voar, 3 de vida)', () => {
  let s = jogo(8); let bi; [s, bi] = poe(s, 0, 'Bloodrite Invoker', 'battlefield', { sick: true });
  assert.equal(acoes(s, bi).length, 0, 'seis terrenos não pagam {8}');
  let a = comMana(s, { G: 2 }); a = ate(act(a, acoes(a, bi, x => x.targets[0].player === 1)[0])); assert.deepEqual(J(a.players.map(p => p.life)), [23, 17]); assert.equal(forca(a, bi), '3/1');
  let sd; [s, sd] = poe(s, 0, 'Secret Door'); let d = comMana(s, { U: 1 });
  assert.equal(acoes(d, sd).length, 1); d = ate(act(d, acoes(d, sd)[0]), x => legais(x, 0)[0]);
  assert.ok(d.players[0].dungeon && d.players[0].dungeon.name, 'entrou numa masmorra'); assert.equal(forca(d, sd), '0/4');
  const op = passaAte(comMana(s, { U: 1 }), x => x.turn.active === 1 && x.turn.priority === 0 && !x.pending); assert.equal(acoes(comMana(desvira(op), { U: 1 }), sd).length, 0, 'no turno do oponente não ativa');
  let w = jogo(9); let sw; [w, sw] = poe(w, 0, 'Sagu Wildling', 'hand'); assert.deepEqual(J(acoes(w, sw).map(x => !!x.omen)).sort(), [false, true]);
  const c = ate(act(w, acoes(w, sw, x => !x.omen)[0])); assert.equal(c.players[0].life, 23); assert.equal(forca(c, sw), '3/3'); assert.ok(temPalavra(c, sw, 'flying')); assert.equal(viradas(c), 5);
});

test('R8 · cemitério: Pulse of Murasa devolve criatura ou terreno de qualquer cemitério e ganha 6; Reaping the Graves com tempestade escolhe alvo novo para a cópia; Faerie Macabre exila até duas cartas de cemitérios', () => {
  let s = jogo(10); let pm, c1, c2, imp; [s, pm] = poe(s, 0, 'Pulse of Murasa', 'hand'); [s, c1] = poe(s, 0, 'Tinder Wall', 'graveyard'); [s, imp] = poe(s, 1, 'Kitchen Imp', 'graveyard'); [s] = poe(s, 0, 'Lead the Stampede', 'graveyard');
  assert.deepEqual(J(acoes(s, pm).map(x => x.targets[0].oid)).sort(), [c1, imp].sort(), 'criatura ou terreno, dos dois cemitérios; a mágica não');
  const dele = ate(act(s, acoes(s, pm, x => x.targets[0].oid === imp)[0])); assert.equal(zona(dele, imp), 'hand'); assert.ok(dele.zones[1].hand.includes(imp), 'volta para a mão do DONO'); assert.equal(dele.players[0].life, 26);
  let rg, q; [s, rg] = poe(s, 0, 'Reaping the Graves', 'hand'); [s, c2] = poe(s, 0, 'Overgrown Battlement', 'graveyard'); [s, q] = poe(s, 0, 'Quirion Ranger', 'hand');
  s = desvira(ate(conjura(s, 0, q))); s = comMana(s, { B: 1 });
  assert.ok(acoes(s, rg).every(x => [c1, c2].includes(x.targets[0].oid)), 'só criatura do SEU cemitério');
  let r = act(s, acoes(s, rg, x => x.targets[0].oid === c1)[0]);
  assert.equal(r.pending.kind, 'pick_target', 'a cópia da tempestade pode escolher outro alvo');
  r = ate(act(r, { t: 'pick_target', p: 0, index: r.pending.options.findIndex(o => o.oid === c2) }));
  assert.equal(zona(r, c1), 'hand'); assert.equal(zona(r, c2), 'hand');
  let m = jogo(11); let fm, g1, g2; [m, fm] = poe(m, 0, 'Faerie Macabre', 'hand'); [m, g1] = poe(m, 1, 'Kitchen Imp', 'graveyard'); [m, g2] = poe(m, 1, 'Fiery Temper', 'graveyard');
  const ops = acoes(m, fm, x => x.t === 'activate'); assert.deepEqual([...new Set(ops.map(x => (x.targets || []).length))].sort(), [0, 1, 2], '"up to two"');
  m = ate(act(m, ops.find(x => (x.targets || []).length === 2))); assert.equal(zona(m, fm), 'graveyard', 'descartada como custo, sem mana'); assert.equal(zona(m, g1), 'exile'); assert.equal(zona(m, g2), 'exile');
});

test('R8 · Moment\'s Peace previne todo o dano de combate do turno; lampejo do passado {2}{G}', () => {
  let s = jogo(12); let mp, imp; [s, mp] = poe(s, 0, "Moment's Peace", 'hand'); [s, imp] = poe(s, 1, 'Kitchen Imp');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 1); s = act(s, { t: 'attack', p: 1, attackers: [imp] });
  for (let i = 0; i < 6 && s.turn.priority !== 0; i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  const fim = x => { for (let i = 0; i < 40 && x.turn.active === 1 && x.turn.step !== 'main2'; i++) x = x.pending ? act(x, x.pending.kind === 'blockers' ? { t: 'block', p: 0, blocks: [] } : legais(x, x.pending.p)[0]) : act(x, { t: 'pass', p: x.turn.priority }); return x; };
  assert.equal(fim(s).players[0].life, 18, 'sem a mágica, o Imp causa 2');
  let a = ate(act(desvira(s), acoes(desvira(s), mp)[0])); a = fim(a); assert.equal(a.players[0].life, 20);
  assert.equal(zona(a, mp), 'graveyard'); if (a.turn.priority !== 0 && !a.pending) a = act(a, { t: 'pass', p: a.turn.priority });
  const fb = acoes(desvira(a), mp); assert.ok(fb.length === 1 && fb[0].flashback); const b = ate(act(desvira(a), fb[0])); assert.equal(zona(b, mp), 'exile'); assert.equal(viradas(b), 3, '{2}{G}');
});
