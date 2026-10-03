// Leva 131 · R3 · Mono Blue Faeries carta a carta: o que o texto oficial diz e o motor precisa fazer, com a lista real
// (.listas/decks.json), o texto de .listas/oficiais.json (consultas de 30/09/2026) e o modo único.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, T, J, act, poe, jogo as jogoDaLista, legais, conjura, resolve, resolveUm, passaAte, alvosDe, temPalavra } from './listas.mjs';
const ILHAS = ['Island', 'Island', 'Island', 'Island', 'Island'];
const jogo = (seed = 1, o = {}) => jogoDaLista({ lista: 'Pauper Mono Blue Faeries', oponente: 'Pauper Rakdos Madness', seed, terrenos: ILHAS, terrenosDoOponente: ['Mountain', 'Mountain', 'Mountain', 'Swamp', 'Swamp'], ...o });
const zona = (s, oid) => s.objects[oid].zone;
const vida = s => J(s.players.map(p => p.life));
const forca = (s, oid) => { const x = E.stats(s, s.objects[oid]); return `${x.power}/${x.toughness}`; };
const tira = (s, p, oid, para = 'graveyard') => { s = J(s); const de = s.objects[oid].zone; s.zones[p][de].splice(s.zones[p][de].indexOf(oid), 1); s.zones[p][para].push(oid); s.objects[oid].zone = para; return s; };
/** Turno do oponente (B), fase principal, com as ilhas de A desviradas e a mágica de B na pilha esperando resposta de A. */
function comMagicaDoOponente(s, nome) {
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  let m; [s, m] = poe(s, 1, nome, 'hand');
  s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === m && !x.faceDown)[0]);
  while (s.pending && s.pending.p === 1) s = act(s, legais(s, 1)[0]);
  if (s.turn.priority === 1) s = act(s, { t: 'pass', p: 1 });
  return [s, m];
}
const respostas = (s, oid) => legais(s, 0, x => x.t === 'cast' && x.oid === oid);

test('Leva 131 · Sewer-veillance Cam: o alvo é escolhido quando o gatilho vai à pilha; virar, desvirar ou nada se decide na resolução', () => {
  // sem criatura em campo não há alvo: o gatilho sai e a mesa não pergunta nada (antes perguntava o modo à toa)
  let s = jogo(9); let cam; [s, cam] = poe(s, 0, 'Sewer-veillance Cam', 'hand');
  let vazio = resolve(conjura(s, 0, cam));
  assert.equal(zona(vazio, cam), 'battlefield'); assert.equal(vazio.pending, null, 'sem criatura: nenhuma pergunta'); assert.equal(vazio.stack.length, 0);
  // com criaturas: "target creature" é alvo (escolhido ao pôr o gatilho na pilha); "you may tap or untap" é escolha da resolução
  let meu, dele; [s, meu] = poe(s, 0, 'Faerie Seer'); [s, dele] = poe(s, 1, 'Kitchen Imp');
  s = resolveUm(conjura(s, 0, cam));
  assert.equal(s.pending.kind, 'pick_target', 'primeiro o alvo (antes: primeiro o modo, antes de o gatilho existir na pilha)');
  assert.deepEqual(alvosDe(s, [{ targets: J(s.pending.options) }]), ['Faerie Seer de A', 'Kitchen Imp de B']);
  s = act(s, { t: 'pick_target', p: 0, index: J(s.pending.options).findIndex(t => t.oid === dele) });
  assert.equal(s.pending, null); assert.equal(s.stack.length, 1, 'o gatilho está na pilha com o alvo, e o oponente pode responder sem saber se é virar ou desvirar');
  assert.equal(s.objects[dele].tapped, false);
  const naPilha = s;
  s = resolveUm(s);
  assert.equal(s.pending.kind, 'choose_mode'); assert.equal(s.pending.p, 0);
  assert.deepEqual(J(s.pending.options), ['Virar', 'Desvirar']);
  assert.deepEqual(J(legais(s, 0).map(x => x.decline ? 'recusar' : x.label)), ['Virar', 'Desvirar', 'recusar'], '"you may": recusar é uma das saídas, na mesma pergunta');
  let t = act(s, { t: 'choose_mode', p: 0, index: 0 }); assert.equal(t.objects[dele].tapped, true, 'virou'); assert.equal(t.pending, null);
  t = act(s, { t: 'choose_mode', p: 0, decline: true }); assert.equal(t.objects[dele].tapped, false, 'recusou: nada');
  let virado = J(s); virado.objects[dele].tapped = true; t = act(virado, { t: 'choose_mode', p: 0, index: 1 }); assert.equal(t.objects[dele].tapped, false, 'desvirou');
  assert.throws(() => E.apply(s, { t: 'choose_mode', p: 0, index: 2 }), /modo/);
  // alvo que sai do campo antes de resolver: o gatilho não faz nada e não pergunta
  t = resolve(tira(naPilha, 1, dele)); assert.equal(t.pending, null, 'alvo ilegal: sem pergunta');
  // sair do campo também dispara: sacrificar por {3}{U} compra duas e põe o gatilho na pilha
  let u = act(s, { t: 'choose_mode', p: 0, decline: true });
  u = J(u); for (const o of u.zones[0].battlefield) u.objects[o].tapped = false;
  const mao = u.zones[0].hand.length;
  u = act(u, legais(u, 0, x => x.t === 'activate' && x.oid === cam)[0]);
  assert.equal(zona(u, cam), 'graveyard', 'sacrificada como custo');
  assert.equal(u.pending.kind, 'pick_target', 'gatilho de saída: escolhe o alvo');
  u = act(u, { t: 'pick_target', p: 0, index: 0 }); u = resolve(u);
  assert.equal(u.pending.kind, 'choose_mode'); u = resolve(act(u, { t: 'choose_mode', p: 0, decline: true }));
  assert.equal(u.zones[0].hand.length, mao + 2, 'a habilidade compra duas');
});

test('Leva 131 · Brinebarrow Intruder: lampejo; -2/-0 até o fim do turno numa criatura do oponente; sem criatura do oponente, o gatilho sai', () => {
  let s = jogo(1); let bi, imp, meu; [s, imp] = poe(s, 1, 'Kitchen Imp'); [s, meu] = poe(s, 0, 'Faerie Seer'); [s, bi] = poe(s, 0, 'Brinebarrow Intruder', 'hand');
  assert.equal(s.facts['Brinebarrow Intruder'].flash, true);
  s = resolve(resolve(conjura(s, 0, bi)));
  assert.equal(forca(s, imp), '0/2', 'só a força cai; uma criatura do oponente: sem pergunta'); assert.equal(forca(s, meu), '1/1', 'a minha não é alvo');
  const t0 = s.turn.number; s = passaAte(s, x => x.turn.number > t0); assert.equal(forca(s, imp), '2/2', 'até o fim do turno');
  let u = jogo(2); let b2; [u, b2] = poe(u, 0, 'Brinebarrow Intruder', 'hand'); u = resolve(conjura(u, 0, b2));
  assert.equal(zona(u, b2), 'battlefield'); assert.equal(u.pending, null); assert.equal(u.stack.length, 0);
});

test('Leva 131 · Faerie Miscreant: compra só com outra Miscreant em campo, conferido ao entrar e de novo ao resolver (603.4)', () => {
  let s = jogo(3); let m1, m2, m3; [s, m1] = poe(s, 0, 'Faerie Miscreant', 'hand');
  let mao = s.zones[0].hand.length; s = resolve(resolve(conjura(s, 0, m1)));
  assert.equal(s.zones[0].hand.length, mao - 1, 'a primeira não compra');
  [s, m2] = poe(s, 0, 'Faerie Miscreant', 'hand'); mao = s.zones[0].hand.length; s = resolveUm(conjura(s, 0, m2));
  assert.equal(s.stack.length, 1, 'gatilho na pilha'); s = resolve(s);
  assert.equal(s.zones[0].hand.length, mao, 'a segunda compra (−1 conjurada, +1 comprada)');
  [s, m3] = poe(s, 0, 'Faerie Miscreant', 'hand'); s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  s = resolveUm(conjura(s, 0, m3)); assert.equal(s.stack.length, 1);
  let u = tira(tira(s, 0, m1), 0, m2); mao = u.zones[0].hand.length; u = resolve(u);
  assert.equal(u.zones[0].hand.length, mao, 'as outras saíram antes de resolver: não compra (ruling)');
  assert.equal(temPalavra(s, m1, 'flying'), true);
});

test('Leva 131 · Spellstutter Sprite: anula mágica de valor de mana até o número de Fadas suas, contado ao mirar e de novo ao resolver', () => {
  let s = jogo(4); let sp; [s, sp] = poe(s, 0, 'Spellstutter Sprite', 'hand');
  let [u, imp] = comMagicaDoOponente(s, 'Kitchen Imp');                        // valor de mana 4
  u = resolveUm(conjura(u, 0, sp)); assert.equal(zona(u, sp), 'battlefield', 'lampejo: entra em resposta');
  assert.equal(u.stack.map(o => u.objects[o].name).join(), 'Kitchen Imp', 'uma Fada não alcança valor 4: o gatilho não tem alvo e sai');
  let bolt; [u, bolt] = comMagicaDoOponente(s, 'Lightning Bolt');             // valor de mana 1
  u = resolveUm(conjura(u, 0, sp));
  assert.equal(u.stack.map(o => u.objects[o].name).join(), 'Lightning Bolt,Spellstutter Sprite', 'gatilho na pilha mirando o Bolt');
  let normal = resolve(u); assert.equal(zona(normal, bolt), 'graveyard', 'anulado'); assert.deepEqual(vida(normal), [20, 20]);
  let semFada = resolve(tira(u, 0, sp)); assert.deepEqual(vida(semFada).includes(17), true, 'a Sprite morreu em resposta: zero Fadas, o alvo fica ilegal e o Bolt resolve (ruling)');
  assert.equal(temPalavra(u, sp, 'flying'), true);
});

test('Leva 131 · Faerie Seer vidência 2; Harrier Strix vira uma permanente alvo e tem {2}{U}: compre uma, descarte uma', () => {
  let s = jogo(10); let fs, hs; [s, fs] = poe(s, 0, 'Faerie Seer', 'hand');
  s = resolve(resolve(conjura(s, 0, fs)));
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.label, 'scry'); assert.equal(s.pending.from.length, 2); assert.equal(s.pending.min, 0);
  const [a, b] = J(s.pending.from); s = act(s, { t: 'pick', p: 0, oid: b }); s = act(s, { t: 'pick_done', p: 0 });
  assert.equal(s.zones[0].library[0], b, 'a escolhida fica no topo'); assert.equal(s.zones[0].library[s.zones[0].library.length - 1], a, 'a outra vai para o fundo');
  s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  [s, hs] = poe(s, 0, 'Harrier Strix', 'hand'); s = resolve(conjura(s, 0, hs));
  assert.equal(s.pending.kind, 'pick_target');
  const opcoes = J(s.pending.options); assert.ok(opcoes.some(t => s.objects[t.oid].controller === 1) && opcoes.some(t => s.objects[t.oid].controller === 0), '"target permanent": de qualquer jogador');
  const terrenoDele = opcoes.findIndex(t => s.objects[t.oid].controller === 1 && s.objects[t.oid].name === 'Mountain');
  const alvo = opcoes[terrenoDele].oid; s = resolve(act(s, { t: 'pick_target', p: 0, index: terrenoDele }));
  assert.equal(s.objects[alvo].tapped, true);
  s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  const mao = s.zones[0].hand.length; s = resolve(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === hs)[0]));
  assert.equal(s.pending.kind, 'discard'); assert.equal(s.pending.source, 'Harrier Strix'); assert.equal(s.zones[0].hand.length, mao + 1);
  s = act(s, { t: 'discard', p: 0, oid: s.zones[0].hand[0] }); assert.equal(s.zones[0].hand.length, mao);
});

test('Leva 131 · ninjutsu: só com atacante sem bloqueio, depois dos bloqueios; o ninja entra virado e atacando; Moon-Circuit Hacker não descarta no turno em que entrou', () => {
  let s = jogo(5); let seer, hk, dh; [s, seer] = poe(s, 0, 'Faerie Seer'); [s, hk] = poe(s, 0, 'Moon-Circuit Hacker', 'hand'); [s, dh] = poe(s, 0, 'Ninja of the Deep Hours', 'hand');
  const nj = x => legais(x, 0, y => y.t === 'ninjutsu' && [hk, dh].includes(y.oid));
  assert.equal(nj(s).length, 0, 'na fase principal não');
  s = passaAte(s, x => !!(x.pending && x.pending.kind === 'attackers')); s = act(s, { t: 'attack', p: 0, attackers: [seer] });
  assert.equal(nj(s).length, 0, 'antes dos bloqueios não (702.49a: precisa de atacante não bloqueado)');
  for (let i = 0; i < 6 && !nj(s).length; i++) s = s.pending && s.pending.kind === 'blockers' ? act(s, { t: 'block', p: 1, blocks: [] }) : act(s, { t: 'pass', p: s.turn.priority });
  assert.deepEqual(J(nj(s).map(x => s.objects[x.oid].name)).sort(), ['Moon-Circuit Hacker', 'Ninja of the Deep Hours']);
  const mao = s.zones[0].hand.length;
  s = act(s, nj(s).find(x => x.oid === hk));
  assert.equal(zona(s, seer), 'hand', 'o atacante volta como custo'); assert.equal(s.stack.length, 1, 'ninjutsu usa a pilha');
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].tapped && s.objects[o].name === 'Island').length, 1, '{U}');
  s = resolve(s);
  assert.equal(zona(s, hk), 'battlefield'); assert.equal(s.objects[hk].tapped, true); assert.notEqual(s.objects[hk].attacking, null, 'virado e atacando');
  s = passaAte(s, x => !!x.pending || x.turn.step === 'main2');
  assert.deepEqual(vida(s), [20, 18], '2 de dano de combate');
  assert.equal(s.pending.kind, 'may_pay', '"you may draw"'); s = act(s, { t: 'pay', p: 0 });
  assert.equal(s.pending, null, 'entrou neste turno: compra sem descartar'); assert.equal(s.zones[0].hand.length, mao + 1, '−1 Hacker, +1 Seer, +1 compra');
  // no turno seguinte o Hacker já estava em campo: compra e descarta
  let t = jogo(6); let h2; [t, h2] = poe(t, 0, 'Moon-Circuit Hacker');
  t = passaAte(t, x => !!(x.pending && x.pending.kind === 'attackers')); t = act(t, { t: 'attack', p: 0, attackers: [h2] });
  t = passaAte(t, x => !!(x.pending && x.pending.kind !== 'blockers') || x.turn.step === 'main2');
  if (t.pending && t.pending.kind === 'blockers') t = act(t, { t: 'block', p: 1, blocks: [] });
  t = passaAte(t, x => !!x.pending || x.turn.step === 'main2');
  assert.equal(t.pending.kind, 'may_pay'); const m2 = t.zones[0].hand.length; t = act(t, { t: 'pay', p: 0 });
  assert.equal(t.pending.kind, 'discard', 'não entrou neste turno: descarta'); assert.equal(t.zones[0].hand.length, m2 + 1);
});

test('Leva 131 · as anulações da lista miram o que o texto diz: Dispel só instantânea, Annul artefato ou encantamento, Steel Sabotage artefato, Blue Elemental Blast só vermelho, Hydroblast qualquer coisa (confere a cor ao resolver)', () => {
  const s = jogo(7); let base = s; const ids = {};
  for (const n of ['Dispel', 'Annul', 'Hydroblast', 'Blue Elemental Blast', 'Steel Sabotage', 'Counterspell']) [base, ids[n]] = poe(base, 0, n, 'hand');
  const quem = (u, nome) => respostas(u, ids[nome]).filter(x => (x.targets || []).some(t => u.objects[t.oid] && u.objects[t.oid].zone === 'stack')).length > 0;
  const tabela = {};
  for (const magica of ['Lightning Bolt', 'Kitchen Imp', 'Nihil Spellbomb', 'Faithless Looting']) { const [u] = comMagicaDoOponente(base, magica); tabela[magica] = Object.keys(ids).filter(n => quem(u, n)).sort(); }
  assert.deepEqual(tabela['Lightning Bolt'], ['Blue Elemental Blast', 'Counterspell', 'Dispel', 'Hydroblast'], 'instantânea vermelha');
  assert.deepEqual(tabela['Kitchen Imp'], ['Counterspell', 'Hydroblast'], 'criatura preta: BEB não mira; Hydroblast mira (e não fará nada)');
  assert.deepEqual(tabela['Nihil Spellbomb'], ['Annul', 'Counterspell', 'Hydroblast', 'Steel Sabotage'], 'artefato');
  assert.deepEqual(tabela['Faithless Looting'], ['Blue Elemental Blast', 'Counterspell', 'Hydroblast'], 'feitiço vermelho: Dispel não');
  // Hydroblast numa mágica que não é vermelha: resolve e não faz nada (ruling: confere a cor só na resolução)
  let [u, imp] = comMagicaDoOponente(base, 'Kitchen Imp');
  u = resolve(resolve(act(u, respostas(u, ids.Hydroblast).find(x => x.mode === 0 && x.targets[0].oid === imp))));
  assert.equal(zona(u, imp), 'battlefield', 'o Imp entra'); assert.equal(zona(u, ids.Hydroblast), 'graveyard');
  // e numa vermelha: anula
  let bolt; [u, bolt] = comMagicaDoOponente(base, 'Lightning Bolt');
  u = resolve(resolve(act(u, respostas(u, ids.Hydroblast).find(x => x.mode === 0 && x.targets[0].oid === bolt))));
  assert.equal(zona(u, bolt), 'graveyard'); assert.deepEqual(vida(u), [20, 20]);
  // Steel Sabotage, segundo modo: devolve o artefato para a mão do dono
  let rl; let w = base; [w, rl] = poe(w, 1, 'Nihil Spellbomb');
  w = resolve(act(w, respostas(w, ids['Steel Sabotage']).find(x => x.mode === 1 && x.targets[0].oid === rl)));
  assert.equal(zona(w, rl), 'hand'); assert.ok(w.zones[1].hand.includes(rl), 'para a mão do dono');
});

test('Leva 131 · Of One Mind custa {U} com um Humano e um não Humano; Cryoshatter dá -5/-0 e destrói a criatura quando ela vira ou leva dano', () => {
  let s = jogo(11, { terrenos: ['Island'] }); let om, humano, fada, cr;
  [s, om] = poe(s, 0, 'Of One Mind', 'hand');
  assert.equal(respostas(s, om).length, 0, 'com uma ilha e sem criaturas: custa {2}{U}');
  [s, humano] = poe(s, 0, 'Brinebarrow Intruder'); assert.equal(respostas(s, om).length, 0, 'só Humano não basta');
  [s, fada] = poe(s, 0, 'Faerie Seer'); assert.equal(respostas(s, om).length, 1, 'Humano e não Humano: {U}');
  const mao = s.zones[0].hand.length; s = resolve(act(s, respostas(s, om)[0])); assert.equal(s.zones[0].hand.length, mao + 1, 'compra duas');
  let t = jogo(12); let imp, ep; [t, imp] = poe(t, 1, 'Kitchen Imp'); [t, ep] = poe(t, 1, 'Voldaren Epicure'); [t, cr] = poe(t, 0, 'Cryoshatter', 'hand');
  assert.deepEqual(alvosDe(t, respostas(t, cr)), ['Kitchen Imp de B', 'Voldaren Epicure de B']);
  t = resolve(act(t, respostas(t, cr).find(x => x.targets[0].oid === imp)));
  assert.equal(forca(t, imp), '-3/2'); assert.equal(zona(t, cr), 'battlefield');
  // o oponente ataca com ela: virar dispara, e a criatura é destruída
  t = passaAte(t, x => !!(x.pending && x.pending.kind === 'attackers' && x.pending.p === 1)); t = act(t, { t: 'attack', p: 1, attackers: [imp] });
  t = passaAte(t, x => x.objects[imp].zone !== 'battlefield' || x.turn.step === 'main2');
  assert.equal(zona(t, imp), 'graveyard'); assert.equal(zona(t, cr), 'graveyard', 'a aura vai junto');
});

test('Leva 131 · Relic of Progenitus: o jogador alvo escolhe a carta dele que é exilada; {1} e exilar a relíquia: exila os cemitérios e compra', () => {
  let s = jogo(8); let rl; [s, rl] = poe(s, 0, 'Relic of Progenitus');
  for (const n of ['Lightning Bolt', 'Kitchen Imp']) [s] = poe(s, 1, n, 'graveyard'); [s] = poe(s, 0, 'Counterspell', 'graveyard');
  const ab = legais(s, 0, x => x.t === 'activate' && x.oid === rl);
  assert.deepEqual(alvosDe(s, ab.filter(x => x.index === 0)), ['jogador A', 'jogador B']);
  let u = resolve(act(s, ab.find(x => x.index === 0 && x.targets[0].player === 1)));
  assert.equal(u.pending.kind, 'pick'); assert.equal(u.pending.p, 1, 'quem escolhe é o jogador alvo (ruling)'); assert.equal(u.pending.min, 1);
  u = act(u, { t: 'pick', p: 1, oid: u.pending.from[0] }); assert.equal(u.zones[1].graveyard.length, 1); assert.equal(u.zones[1].exile.length, 1);
  const mao = s.zones[0].hand.length; let w = resolve(act(s, ab.find(x => x.index === 1)));
  assert.equal(zona(w, rl), 'exile'); assert.deepEqual([w.zones[0].graveyard.length, w.zones[1].graveyard.length], [0, 0]); assert.equal(w.zones[0].hand.length, mao + 1);
});

// ---- a tela: como o alvo é oferecido (modelo puro da mesa) ----
test('Leva 131 · alvos com o mesmo nome dizem de quem são e se estão virados; nome único fica como está', () => {
  let s = jogoDaLista({ lista: 'Pauper Mono Blue Faeries', oponente: 'Pauper Mono Blue Faeries', seed: 3, terrenos: ILHAS, terrenosDoOponente: ILHAS });
  let minha, dele, strix; [s, minha] = poe(s, 0, 'Faerie Seer'); [s, dele] = poe(s, 1, 'Faerie Seer'); [s, strix] = poe(s, 0, 'Harrier Strix');
  const nomeB = s.players[1].name;
  assert.deepEqual(J(T.rotulosDeAlvos(s, 0, [{ oid: minha }, { oid: dele }, { oid: strix }, { player: 1 }])), ['Faerie Seer (você)', `Faerie Seer (${nomeB})`, 'Harrier Strix', nomeB]);
  // do mesmo dono, o que separa é estar virada
  const ilhas = s.zones[0].battlefield.filter(o => s.objects[o].name === 'Island'); s = J(s); s.objects[ilhas[0]].tapped = true;
  assert.deepEqual(J(T.rotulosDeAlvos(s, 0, [{ oid: ilhas[0] }, { oid: ilhas[1] }, { oid: ilhas[2] }])), ['Island (virada)', 'Island (desvirada)', 'Island (desvirada)']);
  // no espelho, a aura na mão oferece as duas Faerie Seer como alvos diferentes (antes eram um botão só, "→ Faerie Seer", que mirava a primeira)
  let cryo; [s, cryo] = poe(s, 0, 'Cryoshatter', 'hand');
  const alvos = legais(s, 0, x => x.t === 'cast' && x.oid === cryo).map(a => a.targets[0]);
  const rot = J(T.rotulosDeAlvos(s, 0, alvos));
  assert.equal(new Set(rot).size, rot.length, 'nenhum rótulo repetido: ' + rot.join(' | '));
  assert.ok(rot.includes('Faerie Seer (você)') && rot.includes(`Faerie Seer (${nomeB})`));
});

test('Leva 131 · folha: alvo em que "se for vermelha" não faz nada sai da frente; mais de quatro alvos viram um botão que abre a lista', () => {
  let s = jogo(4); let hydro, imp, seer; [s, hydro] = poe(s, 0, 'Hydroblast', 'hand'); [s, imp] = poe(s, 1, 'Kitchen Imp'); [s, seer] = poe(s, 0, 'Faerie Seer');
  let rubra; [s, rubra] = poe(s, 1, 'Voldaren Epicure');
  const modos = s.facts.Hydroblast.script.modes;
  const efeitosDe = d => modos[d.action.mode || 0].effects;
  const botoes = legais(s, 0, x => x.t === 'cast' && x.oid === hydro).map(a => ({ label: `${modos[a.mode || 0].label} → ${s.objects[a.targets[0].oid].name}`, action: a, variant: 'primary' }));
  assert.ok(botoes.length > 6, 'o motor oferece toda permanente como alvo (o texto diz "target permanent"): ' + botoes.length);
  assert.equal(J(T.alvoSemEfeito(s, modos[1].effects, [{ oid: seer }])), true, 'Faerie Seer é azul: Hydroblast não faz nada');
  assert.equal(J(T.alvoSemEfeito(s, modos[1].effects, [{ oid: rubra }])), false, 'Voldaren Epicure é vermelha');
  const out = J(T.enxugaAlvos(s, botoes, efeitosDe));
  const vermelhas = s.zones.flatMap(z => z.battlefield).filter(o => (s.facts[s.objects[o].name].colors || []).includes('R')).map(o => s.objects[o].name);
  assert.deepEqual(out.filter(d => d.variant === 'primary').map(d => d.label).sort(), vermelhas.map(n => `Destruir uma permanente, se for vermelha → ${n}`).sort(), 'na frente, só o que o efeito alcança');
  const resto = out.filter(d => d.semEfeito);
  assert.deepEqual(resto.map(d => [d.label, d.variant]), [['Destruir uma permanente, se for vermelha — sem efeito nos alvos de agora', 'ghost']]);
  assert.equal(resto[0].opcoes.length + vermelhas.length, botoes.length, 'nenhuma ação que o motor oferece fica sem caminho na folha');
  // muitos alvos úteis: um botão só, com a contagem
  const muitos = ['A', 'B', 'C', 'D', 'E'].map((n, i) => ({ label: `Conjurar → ${n}`, action: { t: 'cast', targets: [{ player: i % 2 }] }, variant: 'primary' }));
  const junto = J(T.enxugaAlvos(s, muitos));
  assert.deepEqual(junto.map(d => [d.label, d.alvos.length, d.opcoes.length]), [['Conjurar · 5 alvos', 5, 5]]);
  assert.deepEqual(J(T.enxugaAlvos(s, muitos.slice(0, 4))).map(d => d.label), muitos.slice(0, 4).map(d => d.label), 'até quatro, cada alvo tem o seu botão');
});

test('Leva 131 · o aviso do gatilho opcional diz a condição: Moon-Circuit Hacker só descarta se não entrou neste turno', () => {
  let s = jogo(2); const sc = s.facts['Moon-Circuit Hacker'].script;
  assert.equal(T.descreveEfeitos(sc.abilities[0].effects), 'compra 1 carta; descarta 1 carta (só se ela não entrou neste turno)');
});
