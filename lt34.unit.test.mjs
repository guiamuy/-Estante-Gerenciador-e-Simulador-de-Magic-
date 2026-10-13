// M-351 · LT32 · Frases do Pauper: Extract a Confession ("you may collect evidence 6"; "if evidence was collected, instead each opponent sacrifices a
// creature with the greatest power"), Land Grant ("if you have no land cards in hand, you may reveal your hand rather than pay"), Ramosian Rally
// ("if you control a Plains, you may tap an untapped creature you control rather than pay"), Arms of Hadar ("creatures target player controls get
// -2/-2"), Ghostly Flicker ("exile two target …, then return those cards … under your control") e Goblin Tomb Raider ("as long as you control an
// artifact, ~ gets +1/+0 and has haste"). Texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste de regra
// falha no leitor/motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
import { T } from './listas.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : x[1] === 'X' ? 0 : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Extract a Confession', 'Land Grant', 'Ramosian Rally', 'Arms of Hadar', 'Ghostly Flicker', 'Goblin Tomb Raider'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Gigante: c0('Gigante', 'Creature — Giant', '{3}{R}', { power: '4', toughness: '4' }), Arte: c0('Arte', 'Artifact', '{1}'), Feitico: c0('Feitico', 'Sorcery', '{5}{B}'), Capa: c0('Capa', 'Enchantment — Aura', '{G}') };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }])), Feitico: { name: 'Feitico', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } },
  Capa: { name: 'Capa', aura: { enchant: 'creature' }, grants: { power: 2, toughness: 2 }, example: { action: 'etb', target: 'own-creature', expect: { attached: true } } } };
function mesaX(a = [], b = [], seed = 59) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Swamp', 'Plains', 'Island']) }, { name: 'B', deck: baralho([...b, 'Forest', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const resolve = s => tudo(resolveSo(s));
const limpaMao = (s, p) => { s = J(s); for (const o of s.zones[p].hand.slice()) { s.zones[p].hand = s.zones[p].hand.filter(x => x !== o); s.zones[p].library.push(o); s.objects[o].zone = 'library'; } return s; };

test('LT32 · Extract a Confession sem provas: cada oponente sacrifica uma criatura à escolha dele; com provas 6, só a de maior poder serve', () => {
  let s = mesaX(['Extract a Confession', 'Feitico'], ['Urso', 'Gigante']), ec, u, g;
  [s, ec] = poe(s, 0, 'Extract a Confession', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, g] = poe(s, 1, 'Gigante');
  const m = comMana(s, 'BB');
  const sem = legais(m, 0, x => x.t === 'cast' && x.oid === ec && !x.evidence)[0]; assert.ok(sem, 'conjurar sem provas');
  assert.equal(legais(m, 0, x => x.t === 'cast' && x.oid === ec && x.evidence).length, 0, 'sem cemitério que some 6, não há oferta com provas');
  let t = resolveSo(act(m, sem));
  assert.equal(t.pending && t.pending.kind, 'sacrifice'); assert.equal(t.pending.p, 1); assert.deepEqual([...t.pending.options].sort(), [u, g].sort(), 'o oponente escolhe entre as duas');
  t = tudo(act(t, { t: 'sacrifice', p: 1, oid: u })); assert.equal(t.objects[u].zone, 'graveyard'); assert.equal(t.objects[g].zone, 'battlefield');
  // com provas: dois Feitiços de valor 6 no cemitério
  let v = s; [v] = poe(v, 0, 'Feitico', 'graveyard'); v = comMana(v, 'BB');
  const com = legais(v, 0, x => x.t === 'cast' && x.oid === ec && x.evidence)[0]; assert.ok(com, 'oferta com provas');
  v = act(v, com); assert.equal(v.pending.kind, 'pick', 'escolhe as cartas das provas'); v = act(v, { t: 'pick', p: 0, oid: v.pending.from[0] }); if (v.pending && v.pending.kind === 'pick') v = act(v, { t: 'pick_done', p: 0 });
  assert.equal(v.objects[ec].evidenced, true);
  v = tudo(resolveSo(v));
  assert.equal(v.objects[g].zone, 'graveyard', 'o Gigante (maior poder) foi sacrificado sem perguntar: só ele servia'); assert.equal(v.objects[u].zone, 'battlefield');
});

test("LT32 · Land Grant: sem terreno na mão, dá para revelar a mão em vez de pagar; com terreno na mão, só pagando {1}{G}", () => {
  let s = mesaX(['Land Grant', 'Forest']), lg;
  s = limpaMao(s, 0); [s, lg] = poe(s, 0, 'Land Grant', 'hand');
  console.log('DBG', s.zones[0].hand.map(o=>s.objects[o].name), JSON.stringify(legais(s,0,x=>x.oid===lg)), s.turn.step, s.stack.length, JSON.stringify(s.pending)); const gratis = legais(s, 0, x => x.t === 'cast' && x.oid === lg && x.alt != null); assert.equal(gratis.length, 1, 'oferta de revelar a mão (sem mana nenhuma)');
  const h = s.zones[0].hand.length;
  let t = act(s, gratis[0]); assert.ok(E.apply(s, gratis[0]).events.some(e => e.kind === 'reveal-hand'), 'a mão revelada vai ao registro');
  t = tudo(resolveSo(t), x => x.pending.kind === 'pick' ? { t: 'pick', p: 0, oid: x.pending.from[0] } : legais(x, x.pending.p)[0]);
  assert.equal(t.zones[0].hand.length, h, 'uma Floresta buscada entra no lugar da Land Grant');
  assert.ok(t.zones[0].hand.some(o => /Forest/.test(t.objects[o].name)), 'uma Floresta na mão');
  let u = s; [u] = poe(u, 0, 'Plains', 'hand');
  assert.equal(legais(u, 0, x => x.t === 'cast' && x.oid === lg && x.alt != null).length, 0, 'com um terreno na mão a condição não vale');
  assert.ok(legais(comMana(u, 'GG'), 0, x => x.t === 'cast' && x.oid === lg && x.alt == null).length, 'pagando, sim');
});

test('LT32 · Ramosian Rally: com uma Planície, vira uma criatura sua desvirada em vez de pagar; sem Planície, não', () => {
  let s = mesaX(['Ramosian Rally', 'Urso']), rr, u;
  [s, rr] = poe(s, 0, 'Ramosian Rally', 'hand'); [s, u] = poe(s, 0, 'Urso');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === rr && x.alt != null).length, 0, 'sem Planície no campo, nada');
  let p; [s, p] = poe(s, 0, 'Plains');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === rr && x.alt != null); assert.ok(a.length, 'com Planície, a oferta de virar');
  const t = resolve(act(s, a.find(x => x.pay && [].concat(x.pay.tapOther).includes(u)) || a[0]));
  assert.equal(t.objects[u].tapped, true, 'a criatura virou como custo'); assert.equal(E.stats(t, t.objects[u]).power, 3, 'e recebeu +1/+1'); assert.equal(t.objects[rr].zone, 'graveyard');
});

test('LT32 · Arms of Hadar: só as criaturas do jogador alvo recebem -2/-2 (as suas não)', () => {
  let s = mesaX(['Arms of Hadar', 'Urso'], ['Urso', 'Gigante']), ah, meu, u, g;
  [s, ah] = poe(s, 0, 'Arms of Hadar', 'hand'); [s, meu] = poe(s, 0, 'Urso'); [s, u] = poe(s, 1, 'Urso'); [s, g] = poe(s, 1, 'Gigante');
  const m = comMana(s, 'BBBB'), ofertas = legais(m, 0, x => x.t === 'cast' && x.oid === ah);
  assert.ok(ofertas.some(x => x.targets[0].player === 1) && ofertas.some(x => x.targets[0].player === 0), 'alvo: qualquer jogador');
  const t = resolve(act(m, ofertas.find(x => x.targets[0].player === 1)));
  assert.equal(t.objects[u].zone, 'graveyard', 'o Urso dele morre'); assert.equal(E.stats(t, t.objects[g]).power, 2, 'o Gigante dele fica 2/2'); assert.equal(E.stats(t, t.objects[meu]).power, 2, 'o meu Urso intacto');
});

test('LT32 · Ghostly Flicker: dois alvos diferentes entre artefatos, criaturas e terrenos seus; voltam juntos, sob o seu controle, como objetos novos (a Aura cai)', () => {
  let s = mesaX(['Ghostly Flicker', 'Urso', 'Arte', 'Capa']), gf, u, a, capa, sw;
  [s, gf] = poe(s, 0, 'Ghostly Flicker', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, a] = poe(s, 0, 'Arte'); [s, capa] = poe(s, 0, 'Capa', 'hand'); [s, sw] = poe(s, 0, 'Swamp');
  s = resolve(act(comMana(s, 'G'), legais(comMana(s, 'G'), 0, x => x.t === 'cast' && x.oid === capa && x.targets[0].oid === u)[0])); assert.equal(s.objects[capa].attachedTo, u);
  const m = comMana(s, 'UUU'), ofertas = legais(m, 0, x => x.t === 'cast' && x.oid === gf);
  assert.ok(ofertas.every(x => x.targets.length === 2 && x.targets[0].oid !== x.targets[1].oid), 'dois alvos, sempre diferentes (601.2c)');
  assert.ok(ofertas.some(x => x.targets.some(t => t.oid === sw)), 'terreno vale como alvo'); assert.ok(!ofertas.some(x => x.targets.some(t => t.oid === capa)), 'a Aura não (não é artefato, criatura nem terreno)');
  const zcU = s.objects[u].zc || 0;
  const t = resolve(act(m, ofertas.find(x => x.targets.some(t => t.oid === u) && x.targets.some(t => t.oid === a))));
  assert.equal(t.objects[u].zone, 'battlefield'); assert.equal(t.objects[a].zone, 'battlefield'); assert.equal(t.objects[u].zc, zcU + 2, 'saiu e voltou');
  assert.equal(t.objects[capa].zone, 'graveyard', 'a Aura do Urso piscado vai ao cemitério (400.7, 704.5m)'); assert.equal(t.objects[u].controller, 0);
  // um só alvo legal: não há oferta (601.2c exige dois)
  let v = s; v = J(v); for (const o of [a, sw]) { v.zones[0].battlefield = v.zones[0].battlefield.filter(x => x !== o); v.zones[0].graveyard.push(o); v.objects[o].zone = 'graveyard'; }
  v = J(v); for (const o of v.zones[0].battlefield.slice()) if (v.objects[o].name !== 'Urso') { v.zones[0].battlefield = v.zones[0].battlefield.filter(x => x !== o); v.zones[0].graveyard.push(o); v.objects[o].zone = 'graveyard'; }
  assert.equal(legais(comMana(v, 'UUU'), 0, x => x.t === 'cast' && x.oid === gf).length, 0, 'com um permanente só, não conjura');
});

test('LT32 · Goblin Tomb Raider (1/2): com um artefato seu no campo ganha +1/+0 e ímpeto; sem, volta ao impresso', () => {
  let s = mesaX(['Goblin Tomb Raider', 'Arte']), gt, a;
  [s, gt] = poe(s, 0, 'Goblin Tomb Raider');
  assert.equal(E.stats(s, s.objects[gt]).power, 1, 'impresso 1/2'); assert.equal(E.hasKeyword(s, s.objects[gt], 'haste'), false);
  [s, a] = poe(s, 0, 'Arte');
  assert.equal(E.stats(s, s.objects[gt]).power, 2, '+1/+0 com artefato'); assert.equal(E.stats(s, s.objects[gt]).toughness, 2); assert.equal(E.hasKeyword(s, s.objects[gt], 'haste'), true, 'ímpeto');
  const t = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  assert.ok(legais(t, 0, x => x.t === 'attack' && x.attackers.includes(gt)).length, 'ataca no turno em que entrou');
  const v = J(s); v.zones[0].battlefield = v.zones[0].battlefield.filter(x => x !== a); v.zones[0].graveyard.push(a); v.objects[a].zone = 'graveyard';
  assert.equal(E.stats(v, v.objects[gt]).power, 1, 'o artefato saiu: volta a 1/2'); assert.equal(E.hasKeyword(v, v.objects[gt], 'haste'), false);
});

test('R9b (achado da C-1) · pilha explicada: contagem por subtipo não sai como "−NaN" (Defile, Basilisk Gate); efeitos novos em português', () => {
  const d1 = T.descreveEfeitos([{ do: 'pump', target: 'creature', power: { subtype: 'Swamp', times: -1 }, toughness: { subtype: 'Swamp', times: -1 } }]);
  const d2 = T.descreveEfeitos([{ do: 'pump', target: 'creature', power: { subtype: 'Gate' }, toughness: { subtype: 'Gate' } }]);
  for (const d of [d1, d2]) assert.doesNotMatch(d, /NaN/, d);
  assert.match(d1, /−X\/−X/); assert.match(d1, /Pântanos/); assert.match(d2, /\+X\/\+X/); assert.match(d2, /Portões/);
  for (const n of NOMES) { const sc = scripts[n]; for (const e of [...(sc.effects || []), ...(sc.abilities || []).flatMap(a => a.effects || [])]) { const d = T.descreveEfeitos([e]); assert.ok(d && !/NaN|undefined|_/.test(d), n + ': ' + d); } }
});

test('achado da revisão do lote XXIII · 701.20a: Land Grant revela a Floresta achada (vai ao registro com o nome)', () => {
  let s = mesaX(['Land Grant', 'Forest']), lg;
  s = limpaMao(s, 0); [s, lg] = poe(s, 0, 'Land Grant', 'hand');
  s = resolveSo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === lg && x.alt != null)[0]));
  assert.equal(s.pending.kind, 'pick'); const f = s.pending.from[0];
  const r = E.apply(s, { t: 'pick', p: 0, oid: f }); let evs = r.events, t = r.state;
  if (t.pending && t.pending.kind === 'pick') { const r2 = E.apply(t, { t: 'pick_done', p: 0 }); evs = evs.concat(r2.events); t = r2.state; }
  assert.ok(evs.some(e => e.do === 'reveal' && e.target === t.objects[f].name), 'evento de revelar com o nome da carta');
});

test('achado da revisão do lote XXIII · pilha explicada: Arms of Hadar diz de quem são as criaturas; Extract a Confession diz qual frase vale com e sem provas', () => {
  const ah = T.descreveEfeitos(scripts['Arms of Hadar'].effects), ec = T.descreveEfeitos(scripts['Extract a Confession'].effects);
  assert.match(ah, /cada criatura que o jogador alvo controla recebe −2\/−2/, ah); assert.doesNotMatch(ah, /que cada criatura/);
  assert.match(ec, /se não colheu provas/, ec); assert.match(ec, /se colheu provas/, ec);
});

test('M-351 · as do lote XXIII revisadas jogam (decisão A)', () => {
  for (const n of NOMES) assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
