// Leva 136 · R4 · Elves carta a carta: o que o texto oficial diz e o motor precisa fazer, com a lista real
// (.listas/decks.json), o texto de .listas/oficiais.json (consultas de 30/09/2026) e o modo único.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, T, J, act, poe, jogo as jogoDaLista, legais, conjura, resolve, resolveUm, passaAte, temPalavra } from './listas.mjs';
const F = n => Array(n).fill('Forest');
const jogo = (seed = 1, o = {}) => jogoDaLista({ lista: 'Pauper Elves', oponente: 'Pauper Elves', seed, terrenos: F(8), terrenosDoOponente: F(4), ...o });
const contraFadas = (seed = 1) => jogo(seed, { oponente: 'Pauper Mono Blue Faeries', terrenosDoOponente: ['Island', 'Island', 'Island', 'Island'] });
const zona = (s, oid) => s.objects[oid].zone;
const forca = (s, oid) => { const x = E.stats(s, s.objects[oid]); return `${x.power}/${x.toughness}`; };
const mana = (s, p) => J(s.players[p].pool);
const comMana = (s, p, m) => { s = J(s); Object.assign(s.players[p].pool, m); return s; };
const acoes = (s, oid, f = () => true) => legais(s, 0, x => x.oid === oid && f(x));
const florestasDesviradas = s => s.zones[0].battlefield.filter(o => s.objects[o].name === 'Forest' && !s.objects[o].tapped).length;
/** Resolve tudo, respondendo às decisões com `decide(s)`; por padrão a primeira ação legal. */
function ate(s, decide = s => legais(s, s.pending.p)[0]) { for (let i = 0; i < 30 && (s.pending || s.stack.length); i++) s = s.pending ? act(s, decide(s)) : resolveUm(s); return s; }

test('Leva 136 · Llanowar Elves e Elvish Mystic: {T}: {G}, pelo script (sem depender do texto buscado); com enjoo não geram', () => {
  let s = jogo(1); let ll, em, novo;
  [s, ll] = poe(s, 0, 'Llanowar Elves'); [s, em] = poe(s, 0, 'Elvish Mystic'); [s, novo] = poe(s, 0, 'Llanowar Elves', 'battlefield', { sick: true });
  for (const n of ['Llanowar Elves', 'Elvish Mystic']) assert.deepEqual(J(s.facts[n].script.produces), [['G']], n + ' tem a produção no script');
  assert.equal(acoes(s, novo).length, 0, 'a que entrou neste turno não vira para mana');
  s = act(s, acoes(s, ll, x => x.t === 'tap_mana')[0]); s = act(s, acoes(s, em, x => x.t === 'tap_mana')[0]);
  assert.equal(mana(s, 0).G, 2); assert.ok(s.objects[ll].tapped && s.objects[em].tapped);
  // sem o texto oficial na carta (sem rede), a mana continua saindo do script
  const semTexto = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { 'Llanowar Elves': { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', mana_cost: '{G}', oracle_text: '', cmc: 1, power: '1', toughness: '1' }, Forest: { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '' } },
    players: [{ name: 'A', deck: [{ name: 'Llanowar Elves', qty: 30, zone: 'main' }, { name: 'Forest', qty: 30, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Forest', qty: 60, zone: 'main' }] }] });
  assert.deepEqual(J(semTexto.facts['Llanowar Elves'].script.produces), [['G']]);
});

test('Leva 136 · Priest of Titania: {G} para cada Elfo no campo, dos dois lados, contando fichas e a Masked Vandal (metamorfa)', () => {
  let s = jogo(2); let pt;
  [s, pt] = poe(s, 0, 'Priest of Titania'); [s] = poe(s, 0, 'Llanowar Elves'); [s] = poe(s, 0, 'Masked Vandal'); [s] = poe(s, 0, 'Salt Road Packbeast'); [s] = poe(s, 1, 'Elvish Mystic');
  s = act(s, acoes(s, pt, x => x.t === 'tap_mana')[0]);
  assert.equal(mana(s, 0).G, 4, 'Priest + Llanowar + Vandal + o Mystic do oponente; a Packbeast (Fera) não conta');
});

test('Leva 136 · Birchlore Rangers: vira dois Elfos desvirados (ela mesma e os com enjoo servem) por uma mana de qualquer cor; metamorfose {G}', () => {
  let s = jogo(3); let br, ll, pb;
  [s, br] = poe(s, 0, 'Birchlore Rangers', 'battlefield', { sick: true }); [s, pb] = poe(s, 0, 'Salt Road Packbeast');
  assert.equal(acoes(s, br).length, 0, 'sozinha (a Packbeast não é Elfo) não ativa');
  [s, ll] = poe(s, 0, 'Llanowar Elves', 'battlefield', { sick: true });
  const ops = acoes(s, br, x => x.t === 'activate');
  assert.deepEqual([...new Set(ops.map(x => x.color))].sort(), ['B', 'G', 'R', 'U', 'W'], 'uma opção por cor');
  assert.ok(ops.every(x => J(x.pay.tapOther).sort().join() === [br, ll].sort().join()), 'os dois Elfos, com enjoo e tudo (o custo não tem {T})');
  s = act(s, ops.find(x => x.color === 'U'));
  assert.equal(mana(s, 0).U, 1); assert.ok(s.objects[br].tapped && s.objects[ll].tapped && !s.objects[pb].tapped);
  // metamorfose: {3} virada para baixo, 2/2; vira para cima por {G}
  let m; [s, m] = poe(s, 0, 'Birchlore Rangers', 'hand');
  s = resolve(conjura(s, 0, m, x => x.faceDown));
  assert.equal(s.objects[m].faceDown, true); assert.equal(forca(s, m), '2/2');
  const vira = legais(s, 0, x => x.t === 'unmorph' && x.oid === m); assert.equal(vira.length, 1);
  s = act(s, vira[0]); assert.ok(!s.objects[m].faceDown); assert.equal(forca(s, m), '1/1');
});

test('Leva 136 · Jaspera Sentinel: {T} e virar outra criatura desvirada; sozinha ou com enjoo não ativa; alcance', () => {
  let s = jogo(4); let js, ll;
  [s, js] = poe(s, 0, 'Jaspera Sentinel');
  assert.equal(acoes(s, js).length, 0, 'sem outra criatura não há como pagar');
  [s, ll] = poe(s, 0, 'Llanowar Elves', 'battlefield', { sick: true });
  const ops = acoes(s, js, x => x.t === 'activate'); assert.equal(ops.length, 5);
  assert.ok(ops.every(x => J(x.pay.tapOther).join() === ll), 'a outra criatura pode estar com enjoo');
  s = act(s, ops.find(x => x.color === 'W')); assert.equal(mana(s, 0).W, 1); assert.ok(s.objects[js].tapped && s.objects[ll].tapped);
  let nova; [s, nova] = poe(s, 0, 'Jaspera Sentinel', 'battlefield', { sick: true }); [s] = poe(s, 0, 'Elvish Mystic');
  assert.equal(acoes(s, nova).length, 0, 'a Sentinel com enjoo não vira ({T})');
  assert.equal(temPalavra(s, js, 'reach'), true);
});

test('Leva 136 · Quirion Ranger: devolve uma Floresta sua à mão para desvirar a criatura alvo; uma vez por turno; funciona com enjoo', () => {
  let s = jogo(5); let qr, ll;
  [s, qr] = poe(s, 0, 'Quirion Ranger', 'battlefield', { sick: true }); [s, ll] = poe(s, 0, 'Llanowar Elves', 'battlefield', { tapped: true });
  const mao = s.zones[0].hand.length, florestas = florestasDesviradas(s);
  s = resolve(act(s, acoes(s, qr, x => x.targets[0].oid === ll)[0]));
  assert.equal(s.objects[ll].tapped, false); assert.equal(s.zones[0].hand.length, mao + 1, 'a Floresta voltou para a mão'); assert.equal(florestasDesviradas(s), florestas - 1);
  assert.equal(acoes(s, qr).length, 0, 'só uma vez por turno');
  assert.ok(legais(s, 0, x => x.t === 'play_land').length > 0, 'a Floresta devolvida pode ser jogada de novo se o terreno do turno não foi usado');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > s.turn.number && !x.stack.length && !x.pending);
  assert.ok(acoes(s, qr).length > 0, 'no turno seguinte volta a poder');
});

test('Leva 136 · Timberwatch Elf: +X/+X até o fim do turno, X = Elfos no campo dos dois lados, contado ao resolver e travado', () => {
  let s = jogo(6); let tw, ll;
  [s, tw] = poe(s, 0, 'Timberwatch Elf'); [s, ll] = poe(s, 0, 'Llanowar Elves'); [s] = poe(s, 1, 'Elvish Mystic');
  s = resolve(act(s, acoes(s, tw, x => x.targets[0].oid === ll)[0]));
  assert.equal(forca(s, ll), '4/4', 'três Elfos: +3/+3');
  [s] = poe(s, 0, 'Elvish Mystic'); assert.equal(forca(s, ll), '4/4', 'Elfo que entra depois não muda o que já resolveu');
  s = passaAte(s, x => x.turn.active === 1);
  assert.equal(forca(s, ll), '1/1', 'acaba no fim do turno');
});

test('Leva 136 · Elvish Vanguard: marcador +1/+1 quando outro Elfo entra (seu, do oponente ou ficha); não por ela mesma nem por não Elfo', () => {
  let s = jogo(7); let vg, ll, pb, hm;
  [s, vg] = poe(s, 0, 'Elvish Vanguard', 'hand'); s = ate(conjura(s, 0, vg));
  assert.equal(forca(s, vg), '1/1', 'não dispara por ela mesma');
  [s, ll] = poe(s, 0, 'Llanowar Elves', 'hand'); s = ate(conjura(s, 0, ll)); assert.equal(forca(s, vg), '2/2');
  [s, hm] = poe(s, 0, 'Lys Alana Huntmaster'); // (posta direto: não entra pela regra, não dispara)
  let mv; [s, mv] = poe(s, 0, 'Masked Vandal', 'hand'); s = ate(conjura(s, 0, mv), s => legais(s, s.pending.p).find(x => x.t === 'pay') || legais(s, s.pending.p)[0]);
  assert.equal(J(s.objects[vg].counters).p1p1, 3, 'a Vandal é Elfo (metamorfa) e a ficha de Elfo Guerreiro da Huntmaster também: +2');
  // Elfo do oponente
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let dele; [s, dele] = poe(s, 1, 'Llanowar Elves', 'hand'); s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === dele)[0]); s = ate(s);
  assert.equal(J(s.objects[vg].counters).p1p1, 4, 'Elfo do oponente também conta ("another Elf")');
});

test('Leva 136 · Lys Alana Huntmaster: só quando VOCÊ conjura mágica de Elfo; a ficha é opcional', () => {
  let s = jogo(8); let hm, ll, pb, ww;
  [s, hm] = poe(s, 0, 'Lys Alana Huntmaster'); [s, ll] = poe(s, 0, 'Llanowar Elves', 'hand'); [s, ww] = poe(s, 0, 'Winding Way', 'hand');
  const fichas = s => s.zones[0].battlefield.filter(o => s.objects[o].name === 'Elf Warrior').length;
  let a = conjura(s, 0, ll);
  assert.deepEqual(J(a.stack.map(o => a.objects[o].name)), ['Llanowar Elves', 'Lys Alana Huntmaster'], 'o gatilho vai por cima da mágica');
  a = resolveUm(a); assert.equal(a.pending.kind, 'may_pay');
  const sim = ate(act(a, { t: 'pay', p: 0 })); assert.equal(fichas(sim), 1); assert.equal(forca(sim, sim.zones[0].battlefield.find(o => sim.objects[o].name === 'Elf Warrior')), '1/1');
  const nao = ate(act(a, { t: 'decline', p: 0 })); assert.equal(fichas(nao), 0, '"you may"');
  // mágica que não é de Elfo não dispara
  const b = act(s, legais(s, 0, x => x.oid === ww)[0]); assert.deepEqual(J(b.stack.map(o => b.objects[o].name)), ['Winding Way']);
  // Elfo conjurado pelo oponente não dispara
  let c = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let dele; [c, dele] = poe(c, 1, 'Llanowar Elves', 'hand'); c = act(c, legais(c, 1, x => x.t === 'cast' && x.oid === dele)[0]);
  assert.deepEqual(J(c.stack.map(o => c.objects[o].name)), ['Llanowar Elves']);
});

test('Leva 136 · Salt Road Packbeast: afinidade com criaturas ({1} a menos por criatura sua) e compra ao entrar; o {W} vem dos Elfos', () => {
  let s = jogo(9); let pb, br;
  [s, pb] = poe(s, 0, 'Salt Road Packbeast', 'hand');
  for (const n of ['Llanowar Elves', 'Elvish Mystic', 'Priest of Titania']) [s] = poe(s, 0, n, 'battlefield', { tapped: true });
  assert.equal(acoes(s, pb).length, 0, 'só Florestas: não há {W}');
  [s, br] = poe(s, 0, 'Birchlore Rangers'); let j; [s, j] = poe(s, 0, 'Jaspera Sentinel');
  assert.equal(E.affinityDiscount(s, 0, s.objects[pb]), 5, 'cinco criaturas: {5}{W} vira {W}');
  s = act(s, acoes(s, br, x => x.color === 'W')[0]);
  const livres = florestasDesviradas(s), mao = s.zones[0].hand.length;
  s = ate(conjura(s, 0, pb));
  assert.equal(zona(s, pb), 'battlefield'); assert.equal(florestasDesviradas(s), livres, 'nenhuma Floresta virada'); assert.equal(s.zones[0].hand.length, mao, 'saiu a Packbeast, entrou a compra');
});

test('Leva 136 · Nyxborn Hydra: entra com X marcadores; concedida, dá +1/+1 por marcador, alcance e atropelar', () => {
  let s = jogo(10); let hy, ll;
  [s, hy] = poe(s, 0, 'Nyxborn Hydra', 'hand'); [s, ll] = poe(s, 0, 'Llanowar Elves', 'battlefield', { tapped: true });
  const a = ate(act(s, acoes(s, hy, x => x.x === 3 && !x.bestow)[0]));
  assert.equal(forca(a, hy), '3/4'); assert.equal(florestasDesviradas(a), 8 - 4, '{X}{G} com X=3');
  assert.ok(temPalavra(a, hy, 'reach') && temPalavra(a, hy, 'trample'));
  const b = ate(act(s, acoes(s, hy, x => x.x === 2 && x.bestow && x.targets[0].oid === ll)[0]));
  assert.equal(b.objects[hy].attachedTo, ll); assert.equal(forca(b, ll), '3/3'); assert.equal(florestasDesviradas(b), 8 - 4, '{X}{G}{G} com X=2');
  assert.ok(E.hasKeyword(b, b.objects[ll], 'trample') && E.hasKeyword(b, b.objects[ll], 'reach'));
});

test('Leva 136 · Lead the Stampede: olha cinco, pega quantas criaturas quiser, o resto vai para o fundo', () => {
  let s = jogo(11); let ls; [s, ls] = poe(s, 0, 'Lead the Stampede', 'hand');
  const topo = s.zones[0].library.slice(0, 5), criaturas = topo.filter(o => s.facts[s.objects[o].name].types.includes('creature'));
  s = resolve(conjura(s, 0, ls));
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.source, 'Lead the Stampede'); assert.equal(s.pending.min, 0, '"you may reveal any number"');
  assert.deepEqual(J(s.pending.from), J(topo));
  assert.deepEqual(J(legais(s, 0, x => x.t === 'pick').map(x => x.oid)).sort(), J(criaturas).sort(), 'só criatura pode ser escolhida');
  for (const o of criaturas) s = act(s, { t: 'pick', p: 0, oid: o });
  if (s.pending) s = act(s, { t: 'pick_done', p: 0 });
  assert.ok(criaturas.every(o => zona(s, o) === 'hand'));
  const resto = topo.filter(o => !criaturas.includes(o)); if (resto.length) assert.deepEqual(J(s.zones[0].library.slice(-resto.length)).sort(), J(resto).sort(), 'o resto no fundo');
});

test('Leva 136 · Winding Way: revela quatro e TODAS as do tipo escolhido vão para a mão sem pergunta; o resto vai para o cemitério', () => {
  for (const [modo, tipo] of [[0, 'creature'], [1, 'land']]) {
    let s = jogo(12); let ww; [s, ww] = poe(s, 0, 'Winding Way', 'hand');
    const topo = s.zones[0].library.slice(0, 4), servem = topo.filter(o => s.facts[s.objects[o].name].types.includes(tipo));
    const r = E.apply(act(s, acoes(s, ww, x => x.mode === modo)[0]), { t: 'pass', p: 0 }); let d = r.state; const ev = [...r.events];
    while (d.stack.length && !d.pending) { const x = E.apply(d, { t: 'pass', p: d.turn.priority }); d = x.state; ev.push(...x.events); }
    assert.equal(d.pending, null, 'nada a escolher: a carta diz "all"');
    assert.ok(servem.every(o => zona(d, o) === 'hand') && topo.filter(o => !servem.includes(o)).every(o => zona(d, o) === 'graveyard'), tipo);
    assert.ok(ev.some(e => e.do === 'reveal' && e.name === 'Winding Way' && e.target === topo.map(o => s.objects[o].name).join(', ')), 'as quatro reveladas aparecem no registro para os dois jogadores');
  }
});

test('Leva 136 · Distant Melody: escolhe um tipo de criatura e compra uma por permanente sua desse tipo', () => {
  let s = jogo(13); let dm;
  [s, dm] = poe(s, 0, 'Distant Melody', 'hand'); for (const n of ['Llanowar Elves', 'Birchlore Rangers', 'Masked Vandal', 'Salt Road Packbeast']) [s] = poe(s, 0, n);
  [s] = poe(s, 1, 'Elvish Mystic');
  assert.equal(acoes(s, dm).length, 0, 'sem {U} não conjura');
  s = comMana(s, 0, { U: 1 }); s = resolve(conjura(s, 0, dm));
  assert.equal(s.pending.kind, 'choose_type'); assert.ok(s.pending.options.includes('Elf') && s.pending.options.includes('Beast'));
  const mao = s.zones[0].hand.length;
  s = ate(act(s, { t: 'choose_type', p: 0, index: s.pending.options.indexOf('Elf') }));
  assert.equal(s.zones[0].hand.length, mao + 3, 'Llanowar, Birchlore e a Vandal (metamorfa); a Packbeast e o Elfo do oponente não');
});

test('Leva 136 · Masked Vandal: metamorfa; pode exilar criatura do seu cemitério para exilar artefato ou encantamento do oponente', () => {
  let s = jogo(14, { oponente: 'Pauper GW Bogles', terrenosDoOponente: ['Forest', 'Plains'] }); let mv, morta, bogle, aura;
  [s, mv] = poe(s, 0, 'Masked Vandal', 'hand');
  const semAlvo = ate(conjura(s, 0, mv)); assert.equal(semAlvo.pending, null, 'sem artefato ou encantamento do oponente o gatilho não vai à pilha');
  [s, bogle] = poe(s, 1, 'Slippery Bogle'); [s, aura] = poe(s, 1, 'Ethereal Armor', 'battlefield', { attachedTo: bogle });
  // com alvo mas sem criatura no cemitério: não há como pagar
  let a = resolveUm(conjura(s, 0, mv)); a = a.pending ? a : resolveUm(a);
  const semPagar = ate(a, x => legais(x, x.pending.p).find(y => y.t === 'decline') || legais(x, x.pending.p)[0]); assert.equal(zona(semPagar, aura), 'battlefield');
  [s, morta] = poe(s, 0, 'Llanowar Elves', 'graveyard');
  const pago = ate(conjura(s, 0, mv), x => legais(x, x.pending.p).find(y => y.t === 'pay') || legais(x, x.pending.p)[0]);
  assert.equal(zona(pago, morta), 'exile'); assert.equal(zona(pago, aura), 'exile');
  const recusado = ate(conjura(s, 0, mv), x => legais(x, x.pending.p).find(y => y.t === 'decline') || legais(x, x.pending.p)[0]);
  assert.equal(zona(recusado, morta), 'graveyard'); assert.equal(zona(recusado, aura), 'battlefield', '"you may": recusando, nada sai');
  assert.ok(E.apply && pago.facts['Masked Vandal'].script.changeling);
});

test("Leva 136 · Nylea's Disciple: ganha vida igual à devoção ao verde (cada {G} nos custos das suas permanentes, ela inclusive)", () => {
  let s = jogo(15); let nd; [s, nd] = poe(s, 0, "Nylea's Disciple", 'hand'); [s] = poe(s, 0, 'Llanowar Elves'); [s] = poe(s, 0, 'Lys Alana Huntmaster'); [s] = poe(s, 0, 'Salt Road Packbeast'); [s] = poe(s, 1, 'Llanowar Elves');
  s = ate(conjura(s, 0, nd));
  assert.equal(s.players[0].life, 25, '{G} + {G}{G} + os {G}{G} dela; {5}{W} e as cartas do oponente não contam');
});

test('Leva 136 · Scattershot Archer: 1 de dano em cada criatura com voar, dos dois lados', () => {
  let s = contraFadas(16); let ar, seer, ninja;
  [s, ar] = poe(s, 0, 'Scattershot Archer'); [s, seer] = poe(s, 1, 'Faerie Seer'); [s, ninja] = poe(s, 1, 'Ninja of the Deep Hours');
  const ops = acoes(s, ar); assert.equal(ops.length, 1); assert.equal(ops[0].targets, undefined, 'não tem alvo');
  s = ate(act(s, ops[0]));
  assert.equal(zona(s, seer), 'graveyard'); assert.equal(zona(s, ninja), 'battlefield', 'sem voar, não leva dano'); assert.ok(s.objects[ar].tapped);
});

test('Leva 136 · Vitu-Ghazi Inspector: colher provas 6 é custo opcional (exila do cemitério somando 6 ou mais); com provas, marcador na criatura alvo e 2 de vida', () => {
  let s = jogo(17); let vi, ll;
  [s, vi] = poe(s, 0, 'Vitu-Ghazi Inspector', 'hand'); [s, ll] = poe(s, 0, 'Llanowar Elves');
  assert.deepEqual(J(acoes(s, vi).map(x => !!x.evidence)), [false], 'cemitério vazio: só sem as provas');
  let hm, nd; [s, hm] = poe(s, 0, 'Lys Alana Huntmaster', 'graveyard'); [s, nd] = poe(s, 0, "Nylea's Disciple", 'graveyard'); [s] = poe(s, 0, 'Forest', 'graveyard');
  assert.deepEqual(J(acoes(s, vi).map(x => !!x.evidence)).sort(), [false, true]);
  let a = act(s, acoes(s, vi, x => x.evidence)[0]);
  assert.equal(a.pending.kind, 'pick'); assert.equal(a.pending.needMv, 6); assert.equal(a.pending.to, 'exile');
  a = act(a, { t: 'pick', p: 0, oid: hm }); assert.throws(() => E.apply(a, { t: 'pick_done', p: 0 }), /6/, 'valor 4 não basta');
  a = act(a, { t: 'pick', p: 0, oid: nd }); if (a.pending && a.pending.kind === 'pick') a = act(a, { t: 'pick_done', p: 0 });
  a = ate(a, x => x.pending.kind === 'pick_target' ? { t: 'pick_target', p: 0, index: x.pending.options.findIndex(o => o.oid === ll) } : legais(x, 0)[0]);
  assert.equal(zona(a, hm), 'exile'); assert.equal(zona(a, nd), 'exile'); assert.equal(J(a.objects[ll].counters).p1p1, 1); assert.equal(a.players[0].life, 22);
  const b = ate(conjura(s, 0, vi, x => !x.evidence)); assert.equal(b.players[0].life, 20); assert.equal(b.pending, null, 'sem provas, o gatilho não acontece');
  assert.equal(temPalavra(a, vi, 'reach'), true);
});

test('Leva 136 · Mirrorshell Crab: canalizar ({2}{U}, descartar) anula mágica ou habilidade a não ser que o controlador pague {3}; resguardar {3}', () => {
  let s = contraFadas(18); let cr, ll, cs;
  [s, cr] = poe(s, 0, 'Mirrorshell Crab', 'hand'); [s, ll] = poe(s, 0, 'Llanowar Elves', 'hand');
  s = act(conjura(s, 0, ll), { t: 'pass', p: 0 }); [s, cs] = poe(s, 1, 'Counterspell', 'hand');
  s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === cs)[0]); if (s.turn.priority === 1) s = act(s, { t: 'pass', p: 1 });
  assert.equal(acoes(s, cr).length, 0, 'sem {U} não canaliza');
  s = comMana(s, 0, { U: 1 });
  const canal = acoes(s, cr, x => x.t === 'activate' && x.fromHand && x.targets[0].oid === cs); assert.equal(canal.length, 1);
  s = act(s, canal[0]); assert.equal(zona(s, cr), 'graveyard', 'descartada como custo');
  s = resolveUm(s);
  // o oponente virou duas Ilhas para o Counterspell e tem duas: não paga {3}, a mesa nem pergunta
  s = ate(s, x => legais(x, x.pending.p).find(y => y.t === 'decline') || legais(x, x.pending.p)[0]);
  assert.equal(zona(s, cs), 'graveyard'); assert.equal(zona(s, ll), 'battlefield', 'o Counterspell foi anulado e o Elfo entrou');
  // resguardar: a habilidade do oponente que mira o Crab é anulada se ele não pagar {3}
  let w = contraFadas(19); let crab, strix; [w, crab] = poe(w, 0, 'Mirrorshell Crab');
  w = passaAte(w, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [w, strix] = poe(w, 1, 'Harrier Strix', 'hand'); w = act(w, legais(w, 1, x => x.t === 'cast' && x.oid === strix)[0]);
  const viu = [];
  w = ate(w, x => { viu.push(x.pending.kind + ':' + x.pending.p); return x.pending.kind === 'pick_target' ? { t: 'pick_target', p: 1, index: x.pending.options.findIndex(o => o.oid === crab) } : { t: 'decline', p: x.pending.p }; });
  assert.deepEqual(viu, ['pick_target:1', 'may_pay:1'], 'quem decide pagar o resguardo é o oponente');
  assert.equal(w.objects[crab].tapped, false, 'sem pagar {3}, a habilidade da Strix foi anulada');
});

test('Leva 136 · Negate e Spell Pierce só miram mágica que não é de criatura; Spell Pierce deixa pagar {2}; Valakut Invoker: {8}: 3 de dano', () => {
  let s = contraFadas(20); let ng, sp;
  [s, ng] = poe(s, 0, 'Negate', 'hand'); [s, sp] = poe(s, 0, 'Spell Pierce', 'hand');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = comMana(s, 0, { U: 3 });
  const naPilha = (s, nome) => { let m; [s, m] = poe(s, 1, nome, 'hand'); s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === m)[0]); while (s.pending && s.pending.p === 1) s = act(s, legais(s, 1)[0]); if (s.turn.priority === 1) s = act(s, { t: 'pass', p: 1 }); return [s, m]; };
  const [cri] = naPilha(s, 'Faerie Seer');
  assert.equal(acoes(cri, ng).length + acoes(cri, sp).length, 0, 'mágica de criatura não é alvo');
  const [fei, om] = naPilha(s, 'Of One Mind');
  assert.equal(acoes(fei, ng).length, 1); assert.equal(acoes(fei, sp).length, 1);
  assert.equal(zona(ate(act(fei, acoes(fei, ng)[0])), om), 'graveyard', 'Negate anula');
  // Spell Pierce: o oponente tem uma Ilha livre (três viradas para Of One Mind): não consegue pagar {2}
  assert.equal(zona(ate(act(fei, acoes(fei, sp)[0])), om), 'graveyard');
  // com duas livres, a mesa pergunta a ele
  let rico = J(fei); for (const o of rico.zones[1].battlefield) rico.objects[o].tapped = false;
  rico = resolveUm(act(rico, acoes(rico, sp)[0]));
  assert.equal(rico.pending.kind, 'may_pay'); assert.equal(rico.pending.p, 1); assert.equal(rico.pending.cost, '{2}');
  const pagou = ate(act(rico, { t: 'pay', p: 1 })); assert.equal(pagou.zones[1].hand.length, rico.zones[1].hand.length + 2, 'pagando {2}, Of One Mind resolve');
  // Valakut Invoker
  let v = jogo(21); let inv; [v, inv] = poe(v, 0, 'Valakut Invoker', 'battlefield', { sick: true });
  const alvos = acoes(v, inv); assert.ok(alvos.some(x => x.targets[0].player === 1), 'qualquer alvo, e sem {T} (funciona com enjoo)');
  v = ate(act(v, alvos.find(x => x.targets[0].player === 1))); assert.equal(v.players[1].life, 17); assert.equal(florestasDesviradas(v), 0);
});
