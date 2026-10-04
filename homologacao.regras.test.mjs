// R9 · Homologação independente das sete listas Pauper: cada divergência achada pelos revisores (texto oficial de
// .listas/oficiais.json × motor, sem acesso às levas R1–R8) vira um teste aqui antes da correção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, jogo, limpaMao, legais, conjura, resolve, resolveUm, passaAte, alvosDe } from './listas.mjs';
const comMana = (s, m, p = 0) => { s = J(s); for (const c of m) s.players[p].pool[c]++; return s; };
const viradas = (s, p = 0) => s.zones[p].battlefield.filter(o => s.objects[o].tapped).length;
const nomes = (s, z, p = 0) => J(s.zones[p][z].map(o => s.objects[o].name));
const semPendencia = s => { while (s.pending) s = act(s, legais(s, s.pending.p).at(-1)); return s; };

test('R9 · Lunarch Veteran: conjurar pelo cemitério cobra o custo de perturbar {1}{W} (saía de graça: o custo era lido na face de trás)', () => {
  let s = limpaMao(jogo({ lista: 'Pauper Boros Bully', terrenos: ['Plains', 'Mountain'] }), 0), v, h;
  [s, v] = poe(s, 0, 'Lunarch Veteran', 'graveyard'); [s, h] = poe(s, 0, 'Squadron Hawk', 'hand');
  s = act(s, legais(s, 0, a => a.oid === v && a.disturb)[0]);
  assert.equal(viradas(s), 2, 'os dois terrenos viram para pagar {1}{W}');
  s = resolve(s); assert.ok(nomes(s, 'battlefield').includes('Luminous Phantom'));
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === h).length, 0, 'não sobra mana para o Squadron Hawk');
});

test('R9 · Sagu Wildling: o presságio Roost Seek cobra {G} (saía de graça pelo mesmo motivo)', () => {
  let s = limpaMao(jogo({ lista: 'Pauper Walls Combo', terrenos: ['Forest'] }), 0), w, q;
  [s, w] = poe(s, 0, 'Sagu Wildling', 'hand'); [s, q] = poe(s, 0, 'Quirion Ranger', 'hand');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === w && x.omen)[0]);
  assert.equal(s.objects[s.stack[0]].name, 'Roost Seek'); assert.equal(viradas(s), 1, 'a Forest vira');
  s = semPendencia(resolve(s));
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === q).length, 0, 'a Forest já foi gasta');
});

test('R9 · Hallow numa mágica de criatura: a prevenção vale só "neste turno"; no turno seguinte a criatura causa dano', () => {
  const L = 'Pauper Boros Bully';
  let s = limpaMao(limpaMao(jogo({ lista: L, oponente: L, terrenos: ['Plains', 'Plains'], terrenosDoOponente: ['Plains'] }), 0), 1), k, hw;
  [s, k] = poe(s, 0, 'Kor Skyfisher', 'hand'); [s, hw] = poe(s, 1, 'Hallow', 'hand');
  const t0 = s.turn.number;
  s = conjura(s, 0, k); s = act(s, { t: 'pass', p: 0 });
  s = act(s, legais(s, 1, a => a.oid === hw)[0]);
  s = resolve(s); s = resolve(s);
  if (s.pending) s = resolve(act(s, { t: 'pick', p: 0, oid: s.zones[0].battlefield.find(o => s.objects[o].name === 'Plains') }));
  assert.equal(s.objects[k].zone, 'battlefield');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > t0 && x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [k] });
  s = passaAte(s, x => x.turn.step === 'main2');
  assert.equal(s.players[1].life, 18, 'Kor Skyfisher 2/3 sem bloqueio causa 2');
});

test('R9 · Lembas: o gatilho só embaralha a carta se ela ainda está no cemitério (400.7); devolvida à mão ou exilada em resposta, fica onde está', () => {
  const L = 'Pauper Jund Wildfire';
  const noGrimorio = s => nomes(s, 'library').filter(n => n === 'Lembas').length;
  const resolveTudo = s => { for (let i = 0; i < 20 && s.stack.length; i++) s = semPendencia(resolveUm(semPendencia(s))); return s; };
  { let s = limpaMao(jogo({ lista: L, terrenos: ['Swamp', 'Forest', 'Forest'] }), 0), le, ew, sh;
    [s, le] = poe(s, 0, 'Lembas'); [s, ew] = poe(s, 0, 'Evolution Witness'); [s, sh] = poe(s, 0, 'Krark-Clan Shaman');
    const antes = noGrimorio(s);
    s = act(s, { t: 'activate', p: 0, oid: sh, index: 0, pay: { sacrifice: le } });
    s = act(s, { t: 'activate', p: 0, oid: ew, index: 0 });
    s = resolveUm(s); if (s.pending) s = act(s, { t: 'pick_target', p: 0, index: 0 });
    s = resolveUm(s); assert.deepEqual(nomes(s, 'hand'), ['Lembas'], 'a Evolution Witness devolveu a Lembas');
    s = resolveTudo(s);
    assert.deepEqual(nomes(s, 'hand'), ['Lembas'], 'a Lembas continua na mão'); assert.equal(noGrimorio(s), antes); }
  { let s = limpaMao(jogo({ lista: L, terrenos: ['Swamp'] }), 0), le, ns, sh;
    [s, le] = poe(s, 0, 'Lembas'); [s, ns] = poe(s, 0, 'Nihil Spellbomb'); [s, sh] = poe(s, 0, 'Krark-Clan Shaman');
    const antes = noGrimorio(s);
    s = act(s, { t: 'activate', p: 0, oid: sh, index: 0, pay: { sacrifice: le } });
    s = act(s, { t: 'activate', p: 0, oid: ns, index: 0, targets: [{ player: 0 }] });
    s = resolveTudo(semPendencia(s));
    assert.equal(s.objects[le].zone, 'exile', 'a Lembas exilada fica no exílio'); assert.equal(noGrimorio(s), antes); }
  { let s = limpaMao(jogo({ lista: L, terrenos: ['Swamp'] }), 0), le, sh; // o caso normal continua valendo
    [s, le] = poe(s, 0, 'Lembas'); [s, sh] = poe(s, 0, 'Krark-Clan Shaman'); const antes = noGrimorio(s);
    s = resolveTudo(act(s, { t: 'activate', p: 0, oid: sh, index: 0, pay: { sacrifice: le } }));
    assert.equal(s.objects[le].zone, 'library'); assert.equal(noGrimorio(s), antes + 1); }
});

test('R9 · Masked Vandal: com o alvo fora do campo na resolução, o gatilho sai da pilha sem perguntar e sem exilar nada', () => {
  let s = limpaMao(jogo({ lista: 'Pauper Elves', oponente: 'Pauper Jund Wildfire' }), 0), mv, g, lem, sh;
  [s, mv] = poe(s, 0, 'Masked Vandal', 'hand'); [s, g] = poe(s, 0, 'Llanowar Elves', 'graveyard');
  [s, lem] = poe(s, 1, 'Lembas'); [s, sh] = poe(s, 1, 'Krark-Clan Shaman');
  s = comMana(s, 'GG'); s = act(s, { t: 'cast', p: 0, oid: mv });
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === lem) });
  s = act(s, { t: 'pass', p: 0 });
  s = act(s, legais(s, 1, a => a.t === 'activate' && a.oid === sh && a.pay && a.pay.sacrifice === lem)[0]); // sacrifica a Lembas em resposta
  for (let i = 0; i < 30 && (s.stack.length || s.pending); i++) {
    if (s.pending) { assert.notEqual(s.pending.kind, 'may_pay', 'não pergunta o custo de um gatilho sem alvo legal'); s = act(s, legais(s, s.pending.p)[0]); }
    else s = act(s, { t: 'pass', p: s.turn.priority });
  }
  assert.equal(s.objects[g].zone, 'graveyard', 'a carta de criatura não foi exilada'); assert.notEqual(s.objects[lem].zone, 'exile');
});

test('R9 · insanidade na etapa de limpeza: a mágica resolve ainda no turno de quem descartou (514.3a) e depois vem outra limpeza', () => {
  const L = 'Pauper Rakdos Madness';
  let s = jogo({ lista: L, oponente: L, terrenos: ['Swamp', 'Mountain'], terrenosDoOponente: ['Mountain'] });
  s = limpaMao(s, 0); const ids = [];
  for (const n of ['Kitchen Imp', 'Mountain', 'Mountain', 'Mountain', 'Mountain', 'Lightning Bolt', 'Lightning Bolt', 'Duress']) { let o; [s, o] = poe(s, 0, n, 'hand'); ids.push(o); }
  s = passaAte(s, x => x.pending); assert.equal(s.turn.step, 'cleanup'); const turno = s.turn.number;
  s = act(s, { t: 'discard', p: 0, oid: ids[0] }); assert.equal(s.pending.kind, 'madness');
  s = act(s, { t: 'cast_madness', p: 0 });
  assert.equal(s.turn.number, turno, 'o turno não vira com a mágica na pilha'); assert.equal(s.turn.active, 0); assert.equal(s.turn.step, 'cleanup');
  assert.equal(s.turn.priority, 0, 'o jogador ativo recebe a prioridade'); assert.deepEqual(J(s.stack.map(o => s.objects[o].name)), ['Kitchen Imp']);
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.objects[ids[0]].zone, 'battlefield'); assert.equal(s.turn.number, turno, 'resolveu no turno de A');
  s = passaAte(s, x => x.turn.number > turno); assert.equal(s.turn.active, 1, 'depois da nova limpeza o turno passa');
});

test('R9 · Utopia Sprawl + Abundant Growth na mesma Forest: o mana extra vale para qualquer cor gerada, em qualquer ordem de entrada', () => {
  for (const ordem of [['Utopia Sprawl', 'Abundant Growth'], ['Abundant Growth', 'Utopia Sprawl']]) {
    let s = limpaMao(jogo({ lista: 'Pauper GW Bogles', oponente: 'Pauper GW Bogles', terrenos: ['Forest', 'Forest', 'Forest'] }), 0), c;
    const f = s.zones[0].battlefield.find(o => s.objects[o].name === 'Forest');
    for (const n of ordem) [s] = poe(s, 0, n, 'battlefield', { attachedTo: f, ...(n === 'Utopia Sprawl' ? { chosenColor: 'W' } : {}) });
    const ops = J(E.productions(s, s.objects[f])).map(o => o.join(''));
    assert.deepEqual(ops.sort(), ['BW', 'GW', 'RW', 'UW', 'WW'], ordem.join(' depois de '));
    [s] = poe(s, 0, 'Slippery Bogle'); [s, c] = poe(s, 0, 'Armadillo Cloak', 'hand');
    assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === c).length, 'Armadillo Cloak {1}{G}{W} sai com W+W da Forest encantada e duas Forests');
  }
});

test('R9 · Nyxborn Hydra concedida é Aura, não criatura: não conta na afinidade, não paga "vire uma criatura", não ataca nem bloqueia', () => {
  let s = limpaMao(jogo({ lista: 'Pauper Elves', oponente: 'Pauper Elves' }), 0), l, h, pk, j;
  [s, l] = poe(s, 0, 'Llanowar Elves', 'battlefield', { tapped: true }); [s, h] = poe(s, 0, 'Nyxborn Hydra', 'hand');
  s = resolve(act(comMana(s, 'GGG'), { t: 'cast', p: 0, oid: h, bestow: true, targets: [{ oid: l }], x: 1 }));
  assert.equal(s.objects[h].attachedTo, l);
  [s, pk] = poe(s, 0, 'Salt Road Packbeast', 'hand');
  assert.equal(E.affinityDiscount(s, 0, s.objects[pk]), 1, 'afinidade conta só a Llanowar Elves');
  assert.throws(() => act(comMana(s, 'WGGG'), { t: 'cast', p: 0, oid: pk }), 'com uma criatura a Packbeast custa 5');
  [s, j] = poe(s, 0, 'Jaspera Sentinel');
  assert.equal(legais(s, 0, a => a.oid === j).length, 0, 'a única outra criatura está virada; a Hydra-Aura não serve de custo');
  assert.equal(E.eligibleAttackers(s, 0).includes(h), false); assert.equal(E.eligibleBlockers(s, 0).includes(h), false);
});

test('R9 · permanente virada para baixo não tem tipo nem custo de mana: Distant Melody não a conta como Elfo e a devoção ignora o {G} dela', () => {
  let s = limpaMao(jogo({ lista: 'Pauper Elves', oponente: 'Pauper Elves' }), 0), b;
  [s, b] = poe(s, 0, 'Birchlore Rangers', 'hand');
  s = resolve(act(comMana(s, 'GGG'), { t: 'cast', p: 0, oid: b, faceDown: true }));
  { let t, dm; [t] = poe(s, 0, 'Llanowar Elves'); [t, dm] = poe(t, 0, 'Distant Melody', 'hand');
    t = act(comMana(t, 'UGGG'), { t: 'cast', p: 0, oid: dm }); t = act(t, { t: 'pass', p: 0 }); t = act(t, { t: 'pass', p: 1 });
    const antes = t.zones[0].hand.length; t = act(t, { t: 'choose_type', p: 0, index: t.pending.options.indexOf('Elf'), subtype: 'Elf' });
    assert.equal(t.zones[0].hand.length - antes, 1, 'só a Llanowar Elves é Elfo'); }
  { let t, nd; [t, nd] = poe(s, 0, "Nylea's Disciple", 'hand'); const vida = t.players[0].life;
    t = resolve(act(comMana(t, 'GGGG'), { t: 'cast', p: 0, oid: nd }));
    assert.equal(t.players[0].life, vida + 2, "só os {G}{G} da própria Nylea's Disciple"); }
});

test('R9 · Standard Bearer: "pelo menos um Flagbearer no campo" — o do próprio jogador também cumpre, e metamorfo é Flagbearer', () => {
  { let s = limpaMao(jogo({ lista: 'Pauper GW Bogles', oponente: 'Pauper Boros Bully', terrenos: ['Forest'] }), 0), r;
    [s] = poe(s, 0, 'Standard Bearer'); [s] = poe(s, 1, 'Standard Bearer'); [s] = poe(s, 0, 'Slippery Bogle'); [s, r] = poe(s, 0, 'Rancor', 'hand');
    assert.deepEqual(alvosDe(s, legais(s, 0, a => a.t === 'cast' && a.oid === r)).sort(), ['Standard Bearer de A', 'Standard Bearer de B'], 'qualquer um dos dois porta-estandartes, nunca o Bogle'); }
  { let s = limpaMao(jogo({ lista: 'Pauper Elves', oponente: 'Pauper GW Bogles', terrenos: ['Forest'] }), 0), qr;
    [s] = poe(s, 1, 'Standard Bearer'); [s] = poe(s, 0, 'Masked Vandal'); [s] = poe(s, 0, 'Llanowar Elves'); [s, qr] = poe(s, 0, 'Quirion Ranger');
    assert.deepEqual(alvosDe(s, legais(s, 0, a => a.t === 'activate' && a.oid === qr)).sort(), ['Masked Vandal de A', 'Standard Bearer de B'], 'o metamorfo cumpre a exigência; a Llanowar Elves não'); }
  { let s = limpaMao(jogo({ lista: 'Pauper GW Bogles', oponente: 'Pauper Elves', terrenos: ['Forest'] }), 0), r; // sem Flagbearer de oponente, o dono segue livre
    [s] = poe(s, 0, 'Standard Bearer'); [s] = poe(s, 0, 'Slippery Bogle'); [s, r] = poe(s, 0, 'Rancor', 'hand');
    assert.ok(alvosDe(s, legais(s, 0, a => a.t === 'cast' && a.oid === r)).includes('Slippery Bogle de A')); }
});
