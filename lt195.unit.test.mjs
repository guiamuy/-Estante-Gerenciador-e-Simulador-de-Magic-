// M-513 · lista Pauper da liga MTGO de 17/10: Satyr Wayfinder, Town Greeter, Gnaw to the Bone, Stinkweed Imp e Circle of the Land Druid
// (textos da Scryfall de 18/10/2026). Primitivas novas: moer e escolher entre as moídas; gatilho "deals combat damage to a creature" com
// "that creature" lembrada (sem alvo); ganho por cartas de criatura no cemitério com multiplicador; palavra de sabor antes do gatilho (207.2d).
// Falham no motor anterior (as cinco cartas não eram lidas por inteiro).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { 'Stinkweed Imp': ['Flying', 'Dredge'], 'Gnaw to the Bone': ['Flashback'], 'Town Greeter': ['Mill'], 'Circle of the Land Druid': ['Mill'], 'Satyr Wayfinder': [] }; // campo keywords da Scryfall
const NOMES = Object.keys(KW);
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const bicho = (name, p, t, kw = []) => ({ name, type_line: 'Creature — Beast', mana_cost: '{1}{G}', cmc: 2, keywords: kw, oracle_text: kw.join(', '), power: String(p), toughness: String(t), colors: ['G'] });
Object.assign(C, { Forest: terra('Forest', 'Forest', 'G'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'),
  Aldeia: { name: 'Aldeia', type_line: 'Land — Town', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {G}.', colors: [] },
  Urso: bicho('Urso', 2, 2), Aranha: bicho('Aranha', 4, 4, ['Reach']), Guardiao: bicho('Guardiao', 3, 3, ['Reach', 'Hexproof']) });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 195, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Forest', 'Island', 'Swamp', 'Aldeia', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Aranha', 'Guardiao', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
/** Põe as cartas nomeadas no topo do grimório, na ordem dada (a primeira fica em cima). */
const topo = (s, p, nomes) => { s = J(s); const oids = [];
  for (const n of nomes) { const z = ['library', 'hand', 'graveyard'].map(k => s.zones[p][k]).find(z => z.some(o => s.objects[o].name === n && !oids.includes(o)));
    const oid = z.find(o => s.objects[o].name === n && !oids.includes(o)); z.splice(z.indexOf(oid), 1); oids.push(oid); s.objects[oid].zone = 'library'; }
  s.zones[p].library.unshift(...oids); return [s, oids]; };
const ate = (s, kind) => passaAte(s, x => !!x.pending && x.pending.kind === kind);
const conj = (s, oid) => act(s, legais(s, 0, a => a.t === 'cast' && a.oid === oid)[0]);
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const escolhe = (s, oid) => { s = act(s, legais(s, 0, a => a.t === 'pick' && a.oid === oid)[0]); return s.pending && s.pending.kind === 'pick' ? act(s, legais(s, 0, a => a.t === 'pick_done')[0]) : s; };
const nenhuma = s => act(s, legais(s, 0, a => a.t === 'pick_done')[0]);

test('M-513 · Satyr Wayfinder revela as quatro de cima: um terreno vai para a mão, o resto para o cemitério', () => {
  let s = mesa(), sw, top; [s, sw] = poe(s, 0, 'Satyr Wayfinder', 'hand'); s = terras(s, 'Forest', 2);
  [s, top] = topo(s, 0, ['Island', 'Urso', 'Gnaw to the Bone', 'Forest']);
  s = ate(conj(s, sw), 'pick');
  assert.deepEqual([...legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name)].sort(), ['Forest', 'Island'], 'só terreno');
  assert.ok(legais(s, 0, a => a.t === 'pick_done').length, '"you may": pode não pegar nenhum');
  s = limpa(escolhe(s, top[0]));
  assert.equal(s.objects[top[0]].zone, 'hand'); for (const o of top.slice(1)) assert.equal(s.objects[o].zone, 'graveyard');
  let t = mesa(), sw2, top2; [t, sw2] = poe(t, 0, 'Satyr Wayfinder', 'hand'); t = terras(t, 'Forest', 2); [t, top2] = topo(t, 0, ['Island', 'Urso', 'Swamp', 'Forest']);
  t = limpa(nenhuma(ate(conj(t, sw2), 'pick'))); for (const o of top2) assert.equal(t.objects[o].zone, 'graveyard', 'recusou: as quatro no cemitério');
});

test('M-513 · Town Greeter mói quatro e pode pôr um terreno moído na mão; terreno Town dá 2 de vida', () => {
  let s = mesa(), tg, top; [s, tg] = poe(s, 0, 'Town Greeter', 'hand'); s = terras(s, 'Forest', 2); const vida = s.players[0].life;
  [s, top] = topo(s, 0, ['Urso', 'Aldeia', 'Forest', 'Gnaw to the Bone']);
  s = ate(conj(s, tg), 'pick');
  for (const o of top) assert.equal(s.objects[o].zone, 'graveyard', 'moeu as quatro antes de escolher');
  assert.deepEqual([...legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name)].sort(), ['Aldeia', 'Forest']);
  s = limpa(escolhe(s, top[1])); assert.equal(s.objects[top[1]].zone, 'hand'); assert.equal(s.players[0].life, vida + 2, 'Town: +2');
  let t = mesa(), tg2, top2; [t, tg2] = poe(t, 0, 'Town Greeter', 'hand'); t = terras(t, 'Forest', 2); [t, top2] = topo(t, 0, ['Urso', 'Aldeia', 'Forest', 'Gnaw to the Bone']);
  t = limpa(escolhe(ate(conj(t, tg2), 'pick'), top2[2])); assert.equal(t.objects[top2[2]].zone, 'hand'); assert.equal(t.players[0].life, vida, 'Floresta não é Town: sem vida');
});

test('M-513 · Town Greeter: sem terreno entre as moídas não há escolha, e terreno que já estava no cemitério não é oferecido', () => {
  let s = mesa(), tg, top, ilha; [s, ilha] = poe(s, 0, 'Island', 'graveyard'); [s, tg] = poe(s, 0, 'Town Greeter', 'hand'); s = terras(s, 'Forest', 2);
  [s, top] = topo(s, 0, ['Urso', 'Urso', 'Gnaw to the Bone', 'Satyr Wayfinder']);
  s = limpa(conj(s, tg)); for (const o of top) assert.equal(s.objects[o].zone, 'graveyard'); assert.equal(s.objects[ilha].zone, 'graveyard'); assert.ok(!s.pending);
});

test('M-513 · Gnaw to the Bone ganha 2 por carta de criatura no cemitério, também pelo flashback', () => {
  let s = mesa(), g; for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Urso', 'graveyard'); [s] = poe(s, 0, 'Forest', 'graveyard'); [s, g] = poe(s, 0, 'Gnaw to the Bone', 'hand'); s = terras(s, 'Forest', 6);
  const vida = s.players[0].life; s = limpa(conj(s, g)); assert.equal(s.players[0].life, vida + 6, 'três criaturas: +6 (a Floresta não conta)');
  assert.equal(s.objects[g].zone, 'graveyard');
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g)[0])); assert.equal(s.players[0].life, vida + 12, 'flashback: +6 de novo');
  assert.equal(s.objects[g].zone, 'exile');
});

const combate = (s, atacante, bloqueios) => {
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: [atacante] });
  if (bloqueios) { s = passaAte(s, x => x.pending && x.pending.kind === 'blockers'); s = act(s, { t: 'block', p: 1, blocks: bloqueios }); }
  return passaAte(s, x => x.turn.step === 'main2' && !x.stack.length && !x.pending);
};

test('M-513 · Stinkweed Imp destrói a criatura a que causa dano de combate, mesmo com resistência e hexproof (sem alvo)', () => {
  let s = mesa(), imp, ar; [s, imp] = poe(s, 0, 'Stinkweed Imp'); [s, ar] = poe(s, 1, 'Aranha');
  s = combate(s, imp, [[ar, imp]]); assert.equal(s.objects[ar].zone, 'graveyard', 'a 4/4 que recebeu 1 morre');
  let t = mesa(), imp2, gu; [t, imp2] = poe(t, 0, 'Stinkweed Imp'); [t, gu] = poe(t, 1, 'Guardiao');
  t = combate(t, imp2, [[gu, imp2]]); assert.equal(t.objects[gu].zone, 'graveyard', 'hexproof não impede: não mira');
});

test('M-513 · Stinkweed Imp sem bloqueio causa dano ao jogador e não destrói nada', () => {
  let s = mesa(), imp, u; [s, imp] = poe(s, 0, 'Stinkweed Imp'); [s, u] = poe(s, 1, 'Urso'); const vida = s.players[1].life;
  s = combate(s, imp, null); assert.equal(s.players[1].life, vida - 1); assert.equal(s.objects[u].zone, 'battlefield');
});

test('M-513 · Circle of the Land Druid: moer quatro é opcional; ao morrer, devolve o terreno alvo do cemitério à mão', () => {
  let s = mesa(), cd, top; [s, cd] = poe(s, 0, 'Circle of the Land Druid', 'hand'); s = terras(s, 'Forest', 2); [s, top] = topo(s, 0, ['Urso', 'Island', 'Swamp', 'Urso']);
  s = ate(conj(s, cd), 'may_pay'); s = limpa(act(s, legais(s, 0, a => a.t === 'pay')[0]));
  for (const o of top) assert.equal(s.objects[o].zone, 'graveyard', 'aceitou: moeu quatro');
  let t = mesa(), cd2, top2; [t, cd2] = poe(t, 0, 'Circle of the Land Druid', 'hand'); t = terras(t, 'Forest', 2); [t, top2] = topo(t, 0, ['Urso', 'Island', 'Swamp', 'Urso']);
  t = ate(conj(t, cd2), 'may_pay'); t = limpa(act(t, legais(t, 0, a => a.t === 'decline')[0])); for (const o of top2) assert.equal(t.objects[o].zone, 'library', 'recusou: nada moído');
  // morre bloqueada pela Aranha; o alvo é escolhido entre os terrenos do cemitério
  let u = s, ar; u = J(u); u.objects[cd].sick = false; [u, ar] = poe(u, 1, 'Aranha'); const ilha = top[1];
  u = passaAte(u, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); u = act(u, { t: 'attack', p: 0, attackers: [cd] });
  u = passaAte(u, x => x.pending && x.pending.kind === 'blockers'); u = act(u, { t: 'block', p: 1, blocks: [[ar, cd]] });
  u = passaAte(u, x => (!!x.pending && x.pending.kind === 'pick_target') || x.turn.step === 'main2');
  assert.equal(u.objects[cd].zone, 'graveyard');
  assert.ok(u.pending && u.pending.kind === 'pick_target', 'dois terrenos no cemitério: escolhe o alvo');
  const ops = u.pending.options.map(o => u.objects[o.oid] && u.objects[o.oid].name); assert.deepEqual([...ops].sort(), ['Island', 'Swamp'], JSON.stringify(ops));
  u = act(u, { t: 'pick_target', p: 0, index: ops.indexOf('Island') }); u = passaAte(u, x => x.turn.step === 'main2' && !x.stack.length && !x.pending);
  assert.equal(u.objects[ilha].zone, 'hand');
});

test('M-513 · leitor: palavra de sabor antes do gatilho não tem regra (207.2d); prefixos com regra continuam sem leitura', () => {
  const carta = pre => ({ name: 'Teste', type_line: 'Creature — Test', mana_cost: '{1}{G}', oracle_text: `${pre} — When this creature dies, return target land card from your graveyard to your hand.` });
  assert.equal(L.ler(carta('Natural Recovery')).completa, true);
  assert.equal(L.ler(carta("Hunter's Bounty")).completa, true);
  for (const pre of ['Max speed', 'Solved', 'To solve', 'Visit', 'Prize', 'II']) assert.notEqual(L.ler(carta(pre)).completa, true, pre);
  for (const sup of ['basic', 'legendary', 'snow']) assert.notEqual(L.ler({ name: 'Teste', type_line: 'Creature — Test', mana_cost: '{1}{G}', oracle_text: `When this creature enters, mill four cards. You may put a land card from among them into your hand. If you put a ${sup} card into your hand this way, you gain 2 life.` }).completa, true, `revisão da M-513: "${sup}" não é subtipo`);
  const imp = L.ler({ name: 'Teste', type_line: 'Creature — Imp', mana_cost: '{2}{B}', oracle_text: 'Whenever this creature deals combat damage to a creature, tap that creature.' });
  assert.notEqual(imp.completa, true, 'só "destroy that creature" é lido nesse gatilho');
});
