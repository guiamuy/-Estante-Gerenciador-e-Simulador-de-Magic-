// R7 · Jund Wildfire carta a carta: o que o texto oficial diz e o motor precisa fazer, com a lista real
// (.listas/decks.json), o texto de .listas/oficiais.json (consultas de 30/09/2026) e o modo único.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, jogo as jogoDaLista, legais, conjura, resolveUm, passaAte, temPalavra } from './listas.mjs';
const TERRENOS = ['Swamp', 'Swamp', 'Forest', 'Mountain'];
const jogo = (seed = 1, o = {}) => jogoDaLista({ lista: 'Pauper Jund Wildfire', oponente: 'Pauper Mono Blue Faeries', seed, terrenos: TERRENOS, terrenosDoOponente: ['Island', 'Island', 'Island'], ...o });
const zona = (s, oid) => s.objects[oid].zone;
const forca = (s, oid) => { const x = E.stats(s, s.objects[oid]); return `${x.power}/${x.toughness}`; };
const desvira = (s, p = 0) => { s = J(s); for (const o of s.zones[p].battlefield) s.objects[o].tapped = false; return s; };
const comMana = (s, p, m) => { s = J(s); Object.assign(s.players[p].pool, m); return s; };
const acoes = (s, oid, f = () => true, p = 0) => legais(s, p, x => x.oid === oid && f(x));
const fichas = (s, nome) => s.zones[0].battlefield.filter(o => s.objects[o].name === nome);
const terrenos = (s, p = 0) => s.zones[p].battlefield.filter(o => s.facts[s.objects[o].name].types.includes('land')).length;
const viradas = s => s.zones[0].battlefield.filter(o => s.objects[o].tapped).length;
function ate(s, decide = s => legais(s, s.pending.p)[0]) { for (let i = 0; i < 40 && (s.pending || s.stack.length); i++) s = s.pending ? act(s, decide(s)) : resolveUm(s); return s; }
const semPegar = x => legais(x, x.pending.p).find(y => y.t === 'pick_done') || legais(x, x.pending.p)[0];

test('R7 · Refurbished Familiar: afinidade com artefatos (terreno artefato conta), voar; cada oponente descarta e, se não puder, você compra', () => {
  let s = jogo(1); let rf; [s, rf] = poe(s, 0, 'Refurbished Familiar', 'hand'); [s] = poe(s, 0, 'Ichor Wellspring'); [s] = poe(s, 0, 'Vault of Whispers'); [s] = poe(s, 0, 'Drossforge Bridge');
  assert.equal(E.affinityDiscount(s, 0, s.objects[rf]), 3, 'Wellspring, Vault e a Ponte: {3}{B} vira {B}');
  const maoDele = s.zones[1].hand.length, minha = s.zones[0].hand.length;
  let a = ate(conjura(s, 0, rf), x => { assert.equal(x.pending.kind, 'discard'); assert.equal(x.pending.p, 1, 'quem escolhe o descarte é o oponente'); return legais(x, 1)[0]; });
  assert.equal(a.zones[1].hand.length, maoDele - 1); assert.equal(a.zones[0].hand.length, minha - 1, 'ele descartou: você não compra');
  assert.equal(viradas(a), 1, 'pagou só {B}'); assert.ok(temPalavra(a, rf, 'flying')); assert.equal(forca(a, rf), '2/1');
  let b = J(s); for (const o of b.zones[1].hand.splice(0)) { b.zones[1].library.push(o); b.objects[o].zone = 'library'; }
  b = ate(conjura(b, 0, rf)); assert.equal(b.zones[0].hand.length, minha, 'oponente sem mão: saiu a Familiar, entrou a compra');
});

test('R7 · Writhing Chrysalis: incolor (desprovida de cor); ao CONJURAR cria duas Eldrazi Spawn 0/1; marcador quando você sacrifica outro Eldrazi; alcance', () => {
  let s = jogo(2); let wc; [s, wc] = poe(s, 0, 'Writhing Chrysalis', 'hand');
  assert.deepEqual(J(s.facts['Writhing Chrysalis'].colors), [], 'desprovida de cor: mágica vermelha/verde no custo, carta incolor');
  let a = conjura(s, 0, wc);
  assert.deepEqual(J(a.stack.map(o => a.objects[o].name)), ['Writhing Chrysalis', 'Writhing Chrysalis'], 'o gatilho de conjurar vai por cima da mágica');
  a = resolveUm(a); assert.equal(fichas(a, 'Eldrazi Spawn').length, 2, 'as fichas chegam antes da Chrysalis (e ficam mesmo que ela seja anulada)'); assert.equal(zona(a, wc), 'stack');
  a = ate(a); assert.equal(forca(a, wc), '2/3'); assert.ok(temPalavra(a, wc, 'reach'));
  const sp = fichas(a, 'Eldrazi Spawn'); assert.equal(forca(a, sp[0]), '0/1');
  a = ate(act(a, acoes(a, sp[0])[0])); assert.equal(a.players[0].pool.C, 1); assert.equal(forca(a, wc), '3/4', 'sacrificou outro Eldrazi: +1/+1');
  // o Hydroblast do oponente não a destrói (não é vermelha)
  a = passaAte(a, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); let hb; [a, hb] = poe(a, 1, 'Hydroblast', 'hand');
  const d = ate(act(a, legais(a, 1, x => x.t === 'cast' && x.oid === hb && x.mode === 1 && x.targets[0].oid === wc)[0])); assert.equal(zona(d, wc), 'battlefield');
});

test('R7 · Gixian Infiltrator ganha marcador quando você sacrifica outra permanente; Krark-Clan Shaman: sacrificar um artefato, 1 de dano em cada criatura sem voar', () => {
  let s = jogo(3); let ks, w, gi, seer, intr; [s, ks] = poe(s, 0, 'Krark-Clan Shaman', 'battlefield', { sick: true }); [s, w] = poe(s, 0, 'Ichor Wellspring'); [s, gi] = poe(s, 0, 'Gixian Infiltrator');
  [s, seer] = poe(s, 1, 'Faerie Seer'); [s, intr] = poe(s, 1, 'Spellstutter Sprite');
  const ops = acoes(s, ks); assert.equal(ops.length, 1); assert.equal(ops[0].pay.sacrifice, w, 'o custo é sacrificar um artefato (sem {T}: funciona com enjoo)');
  const mao = s.zones[0].hand.length; s = ate(act(s, ops[0]));
  assert.equal(zona(s, w), 'graveyard'); assert.equal(s.zones[0].hand.length, mao + 1, 'a Ichor Wellspring compra ao ir para o cemitério');
  assert.equal(zona(s, ks), 'graveyard', 'a própria Shaman 1/1 leva o dano'); assert.equal(forca(s, gi), '3/2'); assert.equal(zona(s, gi), 'battlefield', 'a Infiltrator ganhou o marcador antes do dano resolver');
  assert.equal(zona(s, seer), 'battlefield', 'com voar não leva'); assert.equal(zona(s, intr), 'battlefield', 'a Sprite voa');
});

test('R7 · Evolution Witness: adaptar 2 por {1}{G}; ao receber marcadores devolve uma carta de permanente do seu cemitério; com marcadores, adaptar não põe mais', () => {
  let s = jogo(4); let ew, w, cd; [s, ew] = poe(s, 0, 'Evolution Witness'); [s, w] = poe(s, 0, 'Ichor Wellspring', 'graveyard'); [s, cd] = poe(s, 0, 'Cast Down', 'graveyard');
  s = ate(act(s, acoes(s, ew)[0]));
  assert.equal(forca(s, ew), '4/3'); assert.equal(zona(s, w), 'hand', 'a única permanente do cemitério volta'); assert.equal(zona(s, cd), 'graveyard', 'mágica instantânea não é alvo'); assert.equal(viradas(s), 2);
  const de = desvira(s); const outra = ate(act(de, acoes(de, ew)[0])); assert.equal(forca(outra, ew), '4/3', 'já tem marcadores: adaptar não faz nada');
});

test('R7 · Fanatical Offering e Eviscerator\'s Insight: sacrificar artefato ou criatura é custo adicional; compram duas; Offering cria Mapa, Insight tem lampejo {4}{B} (com o sacrifício de novo)', () => {
  let s = jogo(5); let fo, ei, w; [s, fo] = poe(s, 0, 'Fanatical Offering', 'hand'); [s, ei] = poe(s, 0, "Eviscerator's Insight", 'graveyard');
  assert.equal(acoes(s, fo).length + acoes(s, ei).length, 0, 'sem artefato nem criatura não há como pagar');
  [s, w] = poe(s, 0, 'Ichor Wellspring'); let gi; [s, gi] = poe(s, 0, 'Gixian Infiltrator');
  assert.deepEqual(J(acoes(s, fo).map(x => x.pay.sacrifice)).sort(), [w, gi].sort(), 'quem paga escolhe o que sacrifica');
  const mao = s.zones[0].hand.length; let a = ate(act(s, acoes(s, fo, x => x.pay.sacrifice === w)[0]));
  assert.equal(a.zones[0].hand.length, mao - 1 + 2 + 1, 'duas da Offering e uma da Wellspring'); assert.equal(forca(a, gi), '3/2', 'a Infiltrator viu o sacrifício');
  const mapa = fichas(a, 'Map'); assert.equal(mapa.length, 1);
  // o Mapa: {1}, {T}, sacrificar: a criatura sua alvo explora, só em momento de feitiço
  a = desvira(a); const usa = acoes(a, mapa[0]); assert.deepEqual(J(usa.map(x => x.targets[0].oid)), [gi]);
  const topo = a.objects[a.zones[0].library[0]].name, eTerreno = a.facts[topo].types.includes('land'), maoAntes = a.zones[0].hand.length;
  const exp = ate(act(a, usa[0]), x => legais(x, x.pending.p).find(y => y.t === 'decline') || legais(x, x.pending.p)[0]);
  assert.equal(fichas(exp, 'Map').length, 0);
  assert.equal(forca(exp, gi), eTerreno ? '4/3' : '5/4', `explorou revelando ${topo}: +1 pelo sacrifício do Mapa e, se não for terreno, +1 da exploração`);
  assert.equal(exp.zones[0].hand.length, maoAntes + (eTerreno ? 1 : 0), 'terreno revelado vai para a mão');
  // Insight pelo lampejo
  let b = desvira(s); [b] = poe(b, 0, 'Swamp'); const fb = acoes(b, ei); assert.ok(fb.length && fb.every(x => x.flashback && x.pay.sacrifice)); const m2 = b.zones[0].hand.length;
  b = ate(act(b, fb.find(x => x.pay.sacrifice === gi))); assert.equal(zona(b, ei), 'exile'); assert.equal(b.zones[0].hand.length, m2 + 2); assert.equal(viradas(b), 5, '{4}{B}');
});

test('R7 · Cleansing Wildfire na própria Ponte: indestrutível, não é destruída, e você ainda busca um terreno básico virado e compra uma carta', () => {
  let s = jogo(6); let cw, br; [s, cw] = poe(s, 0, 'Cleansing Wildfire', 'hand'); [s, br] = poe(s, 0, 'Drossforge Bridge');
  assert.deepEqual(J(s.facts['Drossforge Bridge'].types).sort(), ['artifact', 'land']); assert.ok(temPalavra(s, br, 'indestructible')); assert.deepEqual(J(E.productions(s, s.objects[br])), [['B'], ['R']]);
  const antes = terrenos(s), mao = s.zones[0].hand.length;
  let a = resolveUm(act(s, acoes(s, cw, x => x.targets[0].oid === br)[0]));
  assert.equal(zona(a, br), 'battlefield', 'a Ponte fica'); assert.equal(a.pending.kind, 'pick'); assert.equal(a.pending.p, 0); assert.equal(a.pending.min, 0, '"may search"');
  assert.ok(legais(a, 0, x => x.t === 'pick').every(x => ['Swamp', 'Forest', 'Mountain'].includes(a.objects[x.oid].name)), 'só terreno básico');
  const pega = legais(a, 0, x => x.t === 'pick')[0].oid; a = ate(act(a, { t: 'pick', p: 0, oid: pega }), semPegar);
  assert.equal(terrenos(a), antes + 1); assert.equal(a.objects[pega].tapped, true); assert.equal(a.zones[0].hand.length, mao, 'saiu a Wildfire, entrou a compra');
  // no terreno do oponente: é destruído e é ELE quem pode buscar
  const ilha = s.zones[1].battlefield[0]; let b = resolveUm(act(s, acoes(s, cw, x => x.targets[0].oid === ilha)[0]));
  assert.equal(zona(b, ilha), 'graveyard'); assert.equal(b.pending.p, 1, 'o controlador do terreno decide a busca');
  b = ate(b, semPegar); assert.equal(terrenos(b, 1), 2, 'ele não buscou'); assert.equal(b.zones[0].hand.length, mao);
  // Slagwoods Bridge
  let sl; [s, sl] = poe(s, 0, 'Slagwoods Bridge', 'hand'); s = act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === sl)[0]);
  assert.equal(s.objects[sl].tapped, true, 'entra virada'); assert.deepEqual(J(E.productions(s, s.objects[sl])), [['R'], ['G']]);
});

test('R7 · Ichor Wellspring compra ao entrar e ao ir para o cemitério; Lembas: vidência 1 e compra, {2}, {T}, sacrificar: 3 de vida, e volta embaralhada para o grimório', () => {
  let s = jogo(7); let w; [s, w] = poe(s, 0, 'Ichor Wellspring', 'hand'); const mao = s.zones[0].hand.length;
  s = ate(conjura(s, 0, w)); assert.equal(s.zones[0].hand.length, mao);
  let le; [s, le] = poe(desvira(s), 0, 'Lembas', 'hand'); const m2 = s.zones[0].hand.length; const viu = [];
  s = ate(conjura(s, 0, le), x => { viu.push(x.pending.label || x.pending.kind); return semPegar(x); });
  assert.deepEqual(viu, ['scry'], 'vidência antes da compra'); assert.equal(s.zones[0].hand.length, m2);
  s = desvira(s); s = ate(act(s, acoes(s, le)[0])); assert.equal(s.players[0].life, 23); assert.equal(zona(s, le), 'library', 'vai ao cemitério e o dono a embaralha no grimório');
});

test('R7 · Makeshift Munitions: {1}, sacrificar artefato ou criatura: 1 de dano em qualquer alvo; Vault of Whispers é terreno artefato e gera {B} pelo script', () => {
  let s = jogo(8); let mm, w, seer; [s, mm] = poe(s, 0, 'Makeshift Munitions'); [s, w] = poe(s, 0, 'Ichor Wellspring'); [s, seer] = poe(s, 1, 'Faerie Seer');
  const ops = acoes(s, mm); assert.ok(ops.every(x => x.pay.sacrifice === w)); assert.ok(ops.some(x => x.targets[0].player === 1) && ops.some(x => x.targets[0].oid === seer));
  s = ate(act(s, ops.find(x => x.targets[0].oid === seer))); assert.equal(zona(s, seer), 'graveyard'); assert.equal(viradas(s), 1);
  let v; [s, v] = poe(s, 0, 'Vault of Whispers');
  assert.deepEqual(J(s.facts['Vault of Whispers'].script.produces), [['B']]); assert.deepEqual(J(s.facts['Vault of Whispers'].types).sort(), ['artifact', 'land']);
  assert.equal(act(s, acoes(s, v, x => x.t === 'tap_mana')[0]).players[0].pool.B, 1);
});

test('R7 · Twisted Landscape busca Pântano, Montanha ou Floresta básica; Weather the Storm copia por mágica conjurada antes no turno', () => {
  let s = jogo(9); let tl; [s, tl] = poe(s, 0, 'Twisted Landscape');
  let a = resolveUm(act(s, acoes(s, tl, x => x.t === 'activate')[0])); assert.equal(zona(a, tl), 'graveyard');
  assert.ok(legais(a, 0, x => x.t === 'pick').length > 0 && legais(a, 0, x => x.t === 'pick').every(x => ['Swamp', 'Mountain', 'Forest'].includes(a.objects[x.oid].name)));
  let ws, w1, w2; [s, ws] = poe(s, 0, 'Weather the Storm', 'hand'); [s, w1] = poe(s, 0, 'Ichor Wellspring', 'hand'); [s, w2] = poe(s, 0, 'Nihil Spellbomb', 'hand');
  const sozinha = ate(conjura(s, 0, ws)); assert.equal(sozinha.players[0].life, 23, 'primeira mágica do turno: sem cópia');
  s = ate(conjura(s, 0, w1)); s = desvira(ate(conjura(desvira(s), 0, w2)));
  let t = conjura(s, 0, ws); assert.equal(t.stack.length, 3, 'duas mágicas antes: a original e duas cópias');
  t = ate(t); assert.equal(t.players[0].life, 29);
});

test('R7 · Troublemaker Ouphe: barganha opcional (sacrificar artefato, encantamento ou ficha); barganhada, exila artefato ou encantamento do oponente', () => {
  let s = jogo(10, { oponente: 'Pauper GW Bogles', terrenosDoOponente: ['Forest'] }); let to, w, cr;
  [s, to] = poe(s, 0, 'Troublemaker Ouphe', 'hand'); [s, w] = poe(s, 0, 'Ichor Wellspring'); [s, cr] = poe(s, 1, "Tormod's Crypt");
  assert.deepEqual(J(acoes(s, to).map(x => !!x.bargain)).sort(), [false, true]);
  const com = ate(act(s, acoes(s, to, x => x.bargain)[0])); assert.equal(zona(com, cr), 'exile'); assert.equal(zona(com, w), 'graveyard'); assert.equal(forca(com, to), '2/2');
  const sem = ate(act(s, acoes(s, to, x => !x.bargain)[0])); assert.equal(zona(sem, cr), 'battlefield'); assert.equal(zona(sem, w), 'battlefield');
});

test('R7 · remoções: Cast Down não mira lendária; Terminate destrói; Breath Weapon 2 em cada criatura que não é Dragão; Ancient Grudge destrói artefato e tem lampejo {G}', () => {
  let s = jogo(11, { oponente: 'Pauper Boros Bully', terrenosDoOponente: ['Plains', 'Plains'] }); let cd, tm, leo, vet;
  [s, cd] = poe(s, 0, 'Cast Down', 'hand'); [s, tm] = poe(s, 0, 'Terminate', 'hand'); [s, leo] = poe(s, 1, 'Leonardo, Big Brother'); [s, vet] = poe(s, 1, 'Lunarch Veteran');
  assert.deepEqual(J(acoes(s, cd).map(x => x.targets[0].oid)), [vet], 'Leonardo é lendário');
  assert.deepEqual(J(acoes(s, tm).map(x => x.targets[0].oid)).sort(), [leo, vet].sort());
  assert.equal(zona(ate(act(s, acoes(s, tm, x => x.targets[0].oid === leo)[0])), leo), 'graveyard');
  let bw, gi; [s, bw] = poe(s, 0, 'Breath Weapon', 'hand'); [s, gi] = poe(s, 0, 'Gixian Infiltrator');
  const b = ate(conjura(s, 0, bw)); assert.equal(zona(b, gi), 'graveyard', 'as suas também'); assert.equal(zona(b, vet), 'graveyard'); assert.equal(zona(b, leo), 'battlefield', 'Leonardo 2/3 com a Veteran morrendo junto leva 2 e fica');
  let ag, pista; [s, ag] = poe(s, 0, 'Ancient Grudge', 'graveyard'); [s, pista] = poe(s, 0, 'Ichor Wellspring');
  const fb = acoes(s, ag); assert.ok(fb.length && fb.every(x => x.flashback));
  const g = ate(act(s, fb.find(x => x.targets[0].oid === pista))); assert.equal(zona(g, ag), 'exile'); assert.equal(zona(g, pista), 'graveyard'); assert.equal(viradas(g), 1, '{G}');
});
