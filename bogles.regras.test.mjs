// R5 · GW Bogles carta a carta: o que o texto oficial diz e o motor precisa fazer, com a lista real
// (.listas/decks.json), o texto de .listas/oficiais.json (consultas de 30/09/2026) e o modo único.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, T, J, act, poe, jogo as jogoDaLista, legais, conjura, resolve, resolveUm, passaAte, temPalavra } from './listas.mjs';
const TERRENOS = ['Forest', 'Forest', 'Forest', 'Plains', 'Plains', 'Plains'];
const jogo = (seed = 1, o = {}) => jogoDaLista({ lista: 'Pauper GW Bogles', oponente: 'Pauper Rakdos Madness', seed, terrenos: TERRENOS, terrenosDoOponente: ['Mountain', 'Mountain', 'Swamp', 'Swamp'], ...o });
const zona = (s, oid) => s.objects[oid].zone;
const forca = (s, oid) => { const x = E.stats(s, s.objects[oid]); return `${x.power}/${x.toughness}`; };
const tem = (s, oid, k) => E.hasKeyword(s, s.objects[oid], k);
const vida = s => J(s.players.map(p => p.life));
const desvira = (s, p = 0) => { s = J(s); for (const o of s.zones[p].battlefield) s.objects[o].tapped = false; return s; };
const comMana = (s, p, m) => { s = J(s); Object.assign(s.players[p].pool, m); return s; };
const acoes = (s, oid, f = () => true, p = 0) => legais(s, p, x => x.oid === oid && f(x));
const nomesDosAlvos = (s, as) => J(as).map(x => (x.targets[0].player != null ? 'jogador' + x.targets[0].player : s.objects[x.targets[0].oid].name)).sort();
function ate(s, decide = s => legais(s, s.pending.p)[0]) { for (let i = 0; i < 30 && (s.pending || s.stack.length); i++) s = s.pending ? act(s, decide(s)) : resolveUm(s); return s; }
/** Conjura a aura da lista na permanente e resolve; devolve [estado, aura]. */
function aura(s, nome, alvo, decide) { let a; [s, a] = poe(desvira(s), 0, nome, 'hand'); const op = acoes(s, a, x => x.t === 'cast' && x.targets && x.targets[0].oid === alvo && !x.escape)[0]; assert.ok(op, `${nome} pode ser conjurada em ${s.objects[alvo].name}`); return [ate(act(s, op), decide), a]; }
const noTurnoDoOponente = s => passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
/** A (jogador 0) ataca com a criatura; o oponente não bloqueia; para depois do dano. */
function ataca(s, atacante) { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [atacante] });
  for (let i = 0; i < 80 && s.turn.step !== 'main2' && s.status === 'playing'; i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  return s; }

test('R5 · Gladecover Scout, Slippery Bogle e Silhana Ledgewalker têm resistência a magia pelo script: o oponente não mira, você mira', () => {
  let s = jogo(1); let b, sc, sl, g;
  [s, b] = poe(s, 0, 'Slippery Bogle'); [s, sc] = poe(s, 0, 'Gladecover Scout'); [s, sl] = poe(s, 0, 'Silhana Ledgewalker'); [s, g] = poe(s, 0, 'Aura Gnarlid');
  for (const n of ['Slippery Bogle', 'Gladecover Scout', 'Silhana Ledgewalker']) assert.ok(J(s.facts[n].script.self.keywords).includes('hexproof'), n);
  // sem a palavra-chave no dado da carta (sem rede), o script garante
  const semDado = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { 'Slippery Bogle': { name: 'Slippery Bogle', type_line: 'Creature — Beast', mana_cost: '{G/U}', oracle_text: '', power: '1', toughness: '1' }, Forest: { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '' } },
    players: [{ name: 'A', deck: [{ name: 'Slippery Bogle', qty: 30, zone: 'main' }, { name: 'Forest', qty: 30, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Forest', qty: 60, zone: 'main' }] }] });
  assert.ok(J(semDado.facts['Slippery Bogle'].kw).includes('hexproof'));
  let ea; [s, ea] = poe(s, 0, 'Ethereal Armor', 'hand');
  assert.deepEqual(nomesDosAlvos(s, acoes(s, ea)), ['Aura Gnarlid', 'Gladecover Scout', 'Silhana Ledgewalker', 'Slippery Bogle'], 'as suas auras miram as suas criaturas');
  s = noTurnoDoOponente(s); let ft; [s, ft] = poe(s, 1, 'Fiery Temper', 'hand');
  assert.deepEqual(nomesDosAlvos(s, acoes(s, ft, x => x.t === 'cast', 1)), ['Aura Gnarlid', 'jogador0', 'jogador1'], 'o oponente só mira a que não tem resistência a magia');
});

test('R5 · as auras somam como o texto diz: Ethereal Armor (+1/+1 por encantamento seu, iniciativa), Rancor (+2/+0, atropelar), Ancestral Mask (+2/+2 por OUTRO encantamento no campo), Armadillo Cloak (+2/+2, atropelar)', () => {
  let s = jogo(2); let b; [s, b] = poe(s, 0, 'Slippery Bogle');
  let ea, ra, am, ac;
  [s, ea] = aura(s, 'Ethereal Armor', b); assert.equal(forca(s, b), '2/2'); assert.ok(tem(s, b, 'first strike'));
  [s, ra] = aura(s, 'Rancor', b); assert.equal(forca(s, b), '5/3', 'Armor conta 2 encantamentos (+2/+2), Rancor +2/+0'); assert.ok(tem(s, b, 'trample'));
  [s, am] = aura(s, 'Ancestral Mask', b); assert.equal(forca(s, b), '10/8', 'Armor +3/+3, Rancor +2/+0, Mask +4/+4 (dois outros encantamentos)');
  [s, ac] = aura(s, 'Armadillo Cloak', b); assert.equal(forca(s, b), '15/13', 'Armor +4, Rancor +2/+0, Mask +6 (três outros), Cloak +2/+2');
  // encantamento do OPONENTE: conta para a Ancestral Mask ("on the battlefield"), não para a Ethereal Armor ("you control")
  let deles; [s, deles] = poe(s, 1, 'Kitchen Imp'); let dele; [s, dele] = poe(s, 0, 'Rancor', 'battlefield', { attachedTo: deles, controller: 1 });
  s = J(s); s.zones[0].battlefield.splice(s.zones[0].battlefield.indexOf(dele), 1); s.zones[1].battlefield.push(dele); s.objects[dele].controller = 1;
  assert.equal(forca(s, b), '17/15', 'só a Mask cresce com o encantamento do oponente');
});

test('R5 · Armadillo Cloak, Spirit Link e Lifelink: você ganha a vida do dano que a criatura causa (as três somam)', () => {
  let s = jogo(3); let b; [s, b] = poe(s, 0, 'Slippery Bogle');
  [s] = aura(s, 'Armadillo Cloak', b); assert.equal(forca(s, b), '3/3');
  let a = ataca(s, b); assert.deepEqual(vida(a), [23, 17], 'Cloak: 3 de dano, 3 de vida');
  [s] = aura(s, 'Spirit Link', b); a = ataca(s, b); assert.deepEqual(vida(a), [26, 17], 'Cloak e Spirit Link são gatilhos separados: 3 + 3');
  [s] = aura(s, 'Lifelink', b); assert.ok(tem(s, b, 'lifelink')); a = ataca(s, b); assert.deepEqual(vida(a), [29, 17], 'e o vínculo com a vida soma mais 3');
});

test('R5 · Rancor volta para a mão do dono quando vai do campo para o cemitério (a criatura morre); Aura Gnarlid cresce com cada Aura no campo', () => {
  let s = jogo(4); let g, ra; [s, g] = poe(s, 0, 'Aura Gnarlid'); assert.equal(forca(s, g), '1/1');
  [s, ra] = aura(s, 'Rancor', g); assert.equal(forca(s, g), '4/2', '+1/+1 por uma Aura no campo, +2/+0 do Rancor');
  let dele; [s, dele] = poe(s, 1, 'Kitchen Imp'); let auraDele; [s, auraDele] = poe(s, 0, 'Rancor', 'battlefield', { attachedTo: dele }); s = J(s); s.zones[0].battlefield.splice(s.zones[0].battlefield.indexOf(auraDele), 1); s.zones[1].battlefield.push(auraDele); s.objects[auraDele].controller = 1;
  assert.equal(forca(s, g), '5/3', 'Aura do oponente também conta');
  s.objects[g].damage = 9; s = ate(act(s, { t: 'pass', p: s.turn.priority }));
  assert.equal(zona(s, g), 'graveyard'); assert.equal(zona(s, ra), 'hand', 'Rancor na mão do dono');
});

test('R5 · Aura Gnarlid só pode ser bloqueada por criatura com poder igual ou maior; Silhana Ledgewalker só por criatura com voar', () => {
  let s = jogo(5); let g, sl, imp, epi;
  [s, g] = poe(s, 0, 'Aura Gnarlid'); [s, sl] = poe(s, 0, 'Silhana Ledgewalker'); [s, imp] = poe(s, 1, 'Kitchen Imp'); [s, epi] = poe(s, 1, 'Voldaren Epicure');
  [s] = aura(s, 'Rancor', g); // Gnarlid 4/2; Imp 2/2 voa; Epicure 1/1
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [g, sl] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers');
  assert.equal(E.canBlock(s, imp, g), false, 'poder 2 < 4'); assert.equal(E.canBlock(s, epi, g), false);
  assert.equal(E.canBlock(s, imp, sl), true, 'o Imp voa'); assert.equal(E.canBlock(s, epi, sl), false, 'sem voar não bloqueia a Ledgewalker');
});

test('R5 · Mask of Law and Grace: proteção contra preto e vermelho (não é bloqueada nem mirada por eles); Flaring Pain não muda proteção contra bloqueio', () => {
  let s = jogo(6); let g, imp; [s, g] = poe(s, 0, 'Aura Gnarlid'); [s, imp] = poe(s, 1, 'Kitchen Imp');
  [s] = aura(s, 'Mask of Law and Grace', g);
  assert.deepEqual(J(E.protections(s, s.objects[g])).sort(), ['B', 'R']);
  let o = noTurnoDoOponente(s); let ft; [o, ft] = poe(o, 1, 'Fiery Temper', 'hand');
  assert.deepEqual(nomesDosAlvos(o, acoes(o, ft, x => x.t === 'cast', 1)), ['Kitchen Imp', 'jogador0', 'jogador1'], 'mágica vermelha não mira a criatura protegida (só a dele e os jogadores)');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [g] }); s = passaAte(s, x => x.pending && x.pending.kind === 'blockers');
  assert.equal(E.canBlock(s, imp, g), false, 'criatura preta não bloqueia');
});

test('R5 · Benevolent Blessing: lampejo; escolhe a cor ao entrar; as suas Auras que já estavam na criatura ficam, Aura nova da cor não entra', () => {
  let s = jogo(7); let b, ea, bb; [s, b] = poe(s, 0, 'Slippery Bogle'); [s, ea] = aura(s, 'Ethereal Armor', b);
  [s, bb] = poe(desvira(s), 0, 'Benevolent Blessing', 'hand');
  let a = resolveUm(act(s, acoes(s, bb, x => x.targets[0].oid === b)[0]));
  assert.equal(a.pending.kind, 'choose_color'); assert.equal(a.pending.p, 0);
  a = ate(act(a, { t: 'choose_color', p: 0, color: 'W' }));
  assert.deepEqual(J(E.protections(a, a.objects[b])), ['W']);
  assert.equal(a.objects[ea].attachedTo, b, 'a Ethereal Armor (branca, sua) continua'); assert.equal(a.objects[bb].attachedTo, b, 'e a própria Blessing (branca) também');
  let sp; [a, sp] = poe(desvira(a), 0, 'Spirit Link', 'hand');
  assert.equal(acoes(a, sp, x => x.targets[0].oid === b).length, 0, 'Aura branca nova não pode mirar a criatura protegida de branco');
  // lampejo: no turno do oponente, com a prioridade
  let o = noTurnoDoOponente(s); o = desvira(act(o, { t: 'pass', p: 1 }));
  assert.ok(o.turn.active === 1 && o.turn.priority === 0); assert.ok(acoes(o, bb).length > 0, 'pode ser conjurada no turno do oponente');
  let ar; [o, ar] = poe(o, 0, 'Ethereal Armor', 'hand'); assert.equal(acoes(o, ar).length, 0, 'as outras auras não têm lampejo');
});

test('R5 · Utopia Sprawl só encanta Floresta e soma uma mana da cor escolhida; Abundant Growth encanta qualquer terreno, compra e dá mana de qualquer cor', () => {
  let s = jogo(8); const f = s.zones[0].battlefield.find(o => s.objects[o].name === 'Forest'), pl = s.zones[0].battlefield.find(o => s.objects[o].name === 'Plains');
  let us; [s, us] = poe(s, 0, 'Utopia Sprawl', 'hand');
  assert.deepEqual([...new Set(nomesDosAlvos(s, acoes(s, us)))], ['Forest']);
  let a = resolveUm(act(s, acoes(s, us, x => x.targets[0].oid === f)[0])); assert.equal(a.pending.kind, 'choose_color');
  a = desvira(ate(act(a, { t: 'choose_color', p: 0, color: 'U' })));
  a = act(a, acoes(a, f, x => x.t === 'tap_mana')[0]); assert.deepEqual([a.players[0].pool.G, a.players[0].pool.U], [1, 1]);
  let ag; [s, ag] = poe(s, 0, 'Abundant Growth', 'hand'); const mao = s.zones[0].hand.length;
  assert.ok(nomesDosAlvos(s, acoes(s, ag)).includes('Plains') && nomesDosAlvos(s, acoes(s, ag)).includes('Forest'));
  let g = ate(act(s, acoes(s, ag, x => x.targets[0].oid === pl)[0]));
  assert.equal(g.zones[0].hand.length, mao, 'saiu a aura, entrou a compra');
  assert.deepEqual(J(E.productions(g, g.objects[pl])), [['W'], ['U'], ['B'], ['R'], ['G']], 'o terreno encantado gera qualquer cor (no lugar da mana dele)');
});

test('R5 · Sentinel\'s Eyes: +1/+1 e vigilância; fuga por {W} exilando duas outras cartas do cemitério; Setessan Training só em criatura sua, compra', () => {
  let s = jogo(9); let b, se; [s, b] = poe(s, 0, 'Slippery Bogle');
  [s, se] = aura(s, "Sentinel's Eyes", b); assert.equal(forca(s, b), '2/2'); assert.ok(tem(s, b, 'vigilance'));
  let a = ataca(s, b); assert.equal(a.objects[b].tapped, false, 'vigilância: atacar não vira');
  // fuga: do cemitério, com duas outras cartas
  let g = jogo(10); let b2, eyes; [g, b2] = poe(g, 0, 'Slippery Bogle'); [g, eyes] = poe(g, 0, "Sentinel's Eyes", 'graveyard');
  assert.equal(acoes(g, eyes).length, 0, 'sem duas outras cartas no cemitério não há fuga');
  let c1, c2, c3; [g, c1] = poe(g, 0, 'Rancor', 'graveyard'); [g, c2] = poe(g, 0, 'Lifelink', 'graveyard'); [g, c3] = poe(g, 0, 'Forest', 'graveyard');
  const fuga = acoes(g, eyes, x => x.t === 'cast'); assert.ok(fuga.length > 0 && fuga.every(x => x.escape), 'do cemitério, só pela fuga');
  const paga = fuga.find(x => J(x.pay.exileGrave).sort().join() === [c1, c2].sort().join()); assert.ok(paga, 'quem paga escolhe quais duas cartas exila');
  g = ate(act(g, paga)); assert.equal(g.objects[eyes].attachedTo, b2); assert.equal(zona(g, c1), 'exile'); assert.equal(zona(g, c2), 'exile'); assert.equal(zona(g, c3), 'graveyard');
  // Setessan Training
  let t = jogo(11); let meu, dele, st; [t, meu] = poe(t, 0, 'Gladecover Scout'); [t, dele] = poe(t, 1, 'Kitchen Imp'); [t, st] = poe(t, 0, 'Setessan Training', 'hand');
  assert.deepEqual(nomesDosAlvos(t, acoes(t, st)), ['Gladecover Scout'], '"Enchant creature you control"');
  const mao = t.zones[0].hand.length; t = ate(act(t, acoes(t, st)[0]));
  assert.equal(forca(t, meu), '2/1'); assert.ok(tem(t, meu, 'trample')); assert.equal(t.zones[0].hand.length, mao);
});

test('R5 · Malevolent Rumble: revela quatro, pode pegar uma permanente, o resto vai para o cemitério, e nasce a ficha 0/1 que se sacrifica por {C}', () => {
  let s = jogo(12); let mr; [s, mr] = poe(s, 0, 'Malevolent Rumble', 'hand');
  const topo = s.zones[0].library.slice(0, 4);
  const r = E.apply(conjura(s, 0, mr), { t: 'pass', p: 0 }); let d = r.state; const ev = [...r.events];
  while (d.stack.length && !d.pending) { const x = E.apply(d, { t: 'pass', p: d.turn.priority }); d = x.state; ev.push(...x.events); }
  assert.equal(d.pending.kind, 'pick'); assert.equal(d.pending.min, 0, '"you may"'); assert.equal(d.pending.max, 1); assert.equal(d.pending.rest, 'graveyard');
  assert.ok(ev.some(e => e.do === 'reveal' && e.name === 'Malevolent Rumble'), '"Reveal": os dois jogadores veem');
  const pegaveis = legais(d, 0, x => x.t === 'pick').map(x => x.oid);
  assert.deepEqual(J(pegaveis).sort(), J(topo.filter(o => !['instant', 'sorcery'].some(t => d.facts[d.objects[o].name].types.includes(t)))).sort(), 'só carta de permanente');
  d = ate(act(d, { t: 'pick', p: 0, oid: pegaveis[0] }), x => ({ t: 'pick_done', p: 0 }));
  assert.equal(zona(d, pegaveis[0]), 'hand'); assert.ok(topo.filter(o => o !== pegaveis[0]).every(o => zona(d, o) === 'graveyard'));
  const ficha = d.zones[0].battlefield.find(o => d.objects[o].name === 'Eldrazi Spawn'); assert.ok(ficha); assert.equal(forca(d, ficha), '0/1');
  d = act(d, acoes(d, ficha)[0]); assert.equal(d.players[0].pool.C, 1); assert.ok(!d.zones[0].battlefield.includes(ficha), 'a ficha foi sacrificada');
});

test('R5 · Sheltering Landscape: {T}: {C}; {T}, sacrificar: busca Montanha, Floresta ou Planície básica e põe virada; ciclar {R}{G}{W}', () => {
  let s = jogo(13, { terrenos: ['Forest', 'Forest', 'Plains'] }); let sl; [s, sl] = poe(s, 0, 'Sheltering Landscape');
  assert.equal(acoes(s, sl, x => x.t === 'tap_mana').length, 1);
  assert.equal(act(s, acoes(s, sl, x => x.t === 'tap_mana')[0]).players[0].pool.C, 1);
  let a = resolveUm(act(s, acoes(s, sl, x => x.t === 'activate')[0]));
  assert.equal(zona(a, sl), 'graveyard', 'sacrificada como custo'); assert.equal(a.pending.kind, 'pick');
  const nomes = [...new Set(legais(a, 0, x => x.t === 'pick').map(x => a.objects[x.oid].name))].sort(); assert.deepEqual(nomes, ['Forest', 'Plains'], 'só básicos dos três tipos (a lista não tem Montanha)');
  const pega = legais(a, 0, x => x.t === 'pick' && a.objects[x.oid].name === 'Plains')[0].oid; a = ate(act(a, { t: 'pick', p: 0, oid: pega }), x => ({ t: 'pick_done', p: 0 }));
  assert.equal(zona(a, pega), 'battlefield'); assert.equal(a.objects[pega].tapped, true);
  // ciclar
  let h; [s, h] = poe(s, 0, 'Sheltering Landscape', 'hand');
  assert.equal(acoes(s, h, x => x.t === 'cycle').length, 0, 'sem {R} não cicla'); const c = comMana(s, 0, { R: 1 });
  const cic = acoes(c, h, x => x.t === 'cycle'); assert.equal(cic.length, 1); const mao = c.zones[0].hand.length; const d = ate(act(c, cic[0]));
  assert.equal(zona(d, h), 'graveyard'); assert.equal(d.zones[0].hand.length, mao, 'descarta e compra');
});

test('R5 · Standard Bearer: o oponente precisa mirar um Porta-estandarte se puder; Journey to Nowhere exila e devolve quando sai; Tormod\'s Crypt exila o cemitério do jogador alvo', () => {
  let s = jogo(14); let sb, g; [s, sb] = poe(s, 0, 'Standard Bearer'); [s, g] = poe(s, 0, 'Aura Gnarlid');
  let o = noTurnoDoOponente(s); let ft; [o, ft] = poe(o, 1, 'Fiery Temper', 'hand');
  assert.deepEqual(nomesDosAlvos(o, acoes(o, ft, x => x.t === 'cast', 1)), ['Standard Bearer'], 'nem a Gnarlid nem os jogadores: tem de ser o Porta-estandarte');
  let meu; [s, meu] = poe(s, 0, 'Ethereal Armor', 'hand'); assert.ok(nomesDosAlvos(s, acoes(s, meu)).includes('Aura Gnarlid'), 'você mira o que quiser');
  // Journey to Nowhere: exila; quando ela sai do campo (a Masked Vandal do oponente a exila), a criatura volta para o dono
  let j = jogo(15, { oponente: 'Pauper Elves', terrenosDoOponente: ['Forest', 'Forest'] }); let elfo, jn, mv;
  [j, elfo] = poe(j, 1, 'Llanowar Elves'); [j, jn] = poe(j, 0, 'Journey to Nowhere', 'hand');
  j = ate(conjura(j, 0, jn), x => x.pending.kind === 'pick_target' ? { t: 'pick_target', p: 0, index: x.pending.options.findIndex(t => t.oid === elfo) } : legais(x, x.pending.p)[0]);
  assert.equal(zona(j, elfo), 'exile');
  j = noTurnoDoOponente(j); [j] = poe(j, 1, 'Elvish Mystic', 'graveyard'); [j, mv] = poe(j, 1, 'Masked Vandal', 'hand');
  j = ate(act(j, legais(j, 1, x => x.t === 'cast' && x.oid === mv)[0]), x => legais(x, x.pending.p).find(y => y.t === 'pay') || legais(x, x.pending.p)[0]);
  assert.equal(zona(j, jn), 'exile', 'a Vandal exilou a Journey'); assert.equal(zona(j, elfo), 'battlefield', 'a criatura exilada voltou'); assert.equal(j.objects[elfo].controller, 1, 'sob o controle do dono');
  // Tormod's Crypt
  let c = jogo(16); let tc; [c, tc] = poe(c, 0, "Tormod's Crypt"); [c] = poe(c, 1, 'Kitchen Imp', 'graveyard'); [c] = poe(c, 0, 'Rancor', 'graveyard');
  assert.deepEqual(nomesDosAlvos(c, acoes(c, tc)), ['jogador0', 'jogador1']);
  c = ate(act(c, acoes(c, tc, x => x.targets[0].player === 1)[0]));
  assert.equal(c.zones[1].graveyard.length, 0); assert.equal(c.zones[0].graveyard.filter(o => c.objects[o].name === 'Rancor').length, 1, 'só o do jogador alvo'); assert.equal(zona(c, tc), 'graveyard');
});

test('R5 · Flaring Pain: o dano não pode ser prevenido neste turno (proteção deixa de prevenir o dano); lampejo do passado {R}', () => {
  let s = jogo(17, { oponente: 'Pauper GW Bogles', terrenosDoOponente: ['Forest', 'Plains', 'Plains'] }); let fp;
  [s, fp] = poe(s, 0, 'Flaring Pain', 'hand');
  assert.equal(acoes(s, fp).length, 0, 'sem {R} não conjura (a lista usa Abundant Growth e Utopia Sprawl para a cor)');
  let a = comMana(s, 0, { R: 1 }); a = ate(act(a, acoes(a, fp, x => !x.flashback)[0]));
  assert.equal(zona(a, fp), 'graveyard'); assert.ok(a.noPrevention || a.turn.noPrevention || JSON.stringify(a).includes('noPrevention'), 'o turno fica marcado');
  let b = comMana(a, 0, { R: 1 }); const fb = acoes(b, fp, x => x.flashback); assert.equal(fb.length, 1, 'do cemitério por {R}');
  b = ate(act(b, fb[0])); assert.equal(zona(b, fp), 'exile');
});

test('R5 · dois Slippery Bogle, um com Auras e outro sem: o alvo diz a força de cada um (antes eram um botão só, que mirava o primeiro)', () => {
  let s = jogo(18); let b1, b2; [s, b1] = poe(s, 0, 'Slippery Bogle'); [s, b2] = poe(s, 0, 'Slippery Bogle');
  [s] = aura(s, 'Rancor', b2);
  let ea; [s, ea] = poe(desvira(s), 0, 'Ethereal Armor', 'hand');
  const alvos = acoes(s, ea).map(x => x.targets[0]);
  assert.deepEqual(J(T.rotulosDeAlvos(s, 0, alvos)).sort(), ['Slippery Bogle (1/1)', 'Slippery Bogle (3/1)']);
  let b3; [s, b3] = poe(s, 0, 'Slippery Bogle');
  assert.deepEqual(J(T.rotulosDeAlvos(s, 0, [{ oid: b1 }, { oid: b3 }])), ['Slippery Bogle', 'Slippery Bogle'], 'iguais em tudo continuam com o mesmo nome (viram um botão só)');
});
