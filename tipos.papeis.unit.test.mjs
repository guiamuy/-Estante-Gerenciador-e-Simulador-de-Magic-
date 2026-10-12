// T-20 · CR5 · Papéis (Comprehensive Rules 303.7, 704.5z e as fichas de Papel de 111.10j–r).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge,
// consulta de 12/10/2026): Monstrous Rage e Embereth Veteran. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const CARTAS = {};
for (const c of L('oficiais-tipos.json').filter(x => ['Monstrous Rage', 'Embereth Veteran'].includes(x.name))) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Mountain: 'R', Island: 'U' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const PAPEIS = ['Cursed', 'Monster', 'Royal', 'Sorcerer', 'Virtuous', 'Wicked', 'Young Hero'];
const SCRIPTS = { 'Raio': { name: 'Raio', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX }, 'Marca': { name: 'Marca', effects: [{ do: 'counters', amount: 1, target: 'creature' }], ...EX } };
for (const p of PAPEIS) { const n = 'Papel ' + p; SCRIPTS[n] = { name: n, effects: [{ do: 'papel', papel: p, target: 'creature' }], ...EX }; carta(n, 'Instant'); }
carta('Raio', 'Instant'); carta('Marca', 'Instant');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Gigante', 'Creature — Giant', { power: '3', toughness: '4' });
carta('Muralha', 'Creature — Wall', { power: '2', toughness: '2', oracle_text: 'Protection from enchantments' }); // T-21

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
const TODAS = ['Muralha', 'Monstrous Rage', 'Embereth Veteran', 'Raio', 'Marca', 'Urso', 'Gigante', ...PAPEIS.map(p => 'Papel ' + p)];
function mesa(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...TODAS, 'Mountain']) }, { name: 'B', deck: baralho([...TODAS, 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p, n = 9) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += n; return s; };
const esvazia = s => { for (let i = 0; i < 20; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || s.pending.kind !== 'triggers') return s; s = act(s, { t: 'order_trigger', p: s.pending.p, index: 0 }); } return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
const papeisEm = (s, oid) => Object.values(s.objects).filter(o => o.zone === 'battlefield' && o.attachedTo === oid && o.token);
function mira(s, p, nome, alvo) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && (x.targets || []).some(t => t.oid === alvo))[0];
  assert.ok(a, `${nome} mira ${s.objects[alvo].name}`); return act(s, a);
}
const papel = (s, p, nome, alvo) => esvazia(mira(s, p, 'Papel ' + nome, alvo));
const atacaCom = (s, u) => { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); return esvazia(act(s, { t: 'attack', p: 0, attackers: [u] })); };

test('CR 111.10 / 303.7 · as fichas de Papel são encantamentos Aura Role incolores, com encantar criatura, e cada definição passa no validador', () => {
  for (const p of PAPEIS) { const sc = S.PAPEIS_T[p]; assert.ok(sc, p); eq(S.validateScript(sc), [], p); }
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  s = papel(s, 0, 'Monster', u);
  const [r] = papeisEm(s, u); assert.ok(r, 'a ficha anexada ao Urso');
  eq([r.name, r.controller, J(s.facts[r.name].types), /\bAura\b/.test(s.facts[r.name].typeText) && /\bRole\b/.test(s.facts[r.name].typeText), J(s.facts[r.name].colors)], ['Monster', 0, ['enchantment'], true, []]);
});

test('CR 303.7a / 704.5z · dois Papéis do mesmo controlador na mesma permanente: o mais antigo vai para o cemitério (a ficha deixa de existir); de controladores diferentes, os dois ficam', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  s = papel(s, 0, 'Monster', u); const [m] = papeisEm(s, u);
  s = papel(s, 0, 'Sorcerer', u);
  eq(papeisEm(s, u).map(o => o.name), ['Sorcerer'], 'só o mais novo');
  assert.ok(!s.objects[m.oid], 'a ficha antiga deixou de existir');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = papel(s, 1, 'Cursed', u);
  eq(papeisEm(s, u).map(o => o.name).sort(), ['Cursed', 'Sorcerer'], 'o de B convive com o de A');
});

test('CR 111.10k · Monster: +1/+1 e atropelar', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  s = papel(s, 0, 'Monster', u);
  eq(pt(s, u), [3, 3]); assert.ok(E.hasKeyword(s, s.objects[u], 'trample'));
});

test('CR 111.10j · Cursed: a criatura encantada tem P/R base 1/1 (marcadores e bônus continuam somando)', () => {
  let s = mesa(); let g; [s, g] = poe(s, 1, 'Gigante');
  s = papel(s, 0, 'Cursed', g);
  eq(pt(s, g), [1, 1]);
  s = esvazia(mira(s, 0, 'Marca', g));
  eq(pt(s, g), [2, 2], 'o marcador +1/+1 soma à base 1/1');
});

test('CR 111.10m · Royal: +1/+1 e salvaguarda {1}', () => {
  let s = mesa(); let u; [s, u] = poe(s, 1, 'Urso');
  s = papel(s, 0, 'Royal', u); // A dá o Papel ao Urso de B: a salvaguarda protege o Urso contra os oponentes de quem o controla (A)
  eq(pt(s, u), [3, 3]);
  s = mira(s, 0, 'Raio', u);
  assert.ok(s.stack.some(o => (s.objects[o].effects || []).some(e => e.do === 'salvaguarda')) || (s.pending && /salvaguarda|unless|may_pay/.test(s.pending.kind)), 'a salvaguarda dispara quando A mira o Urso de B');
});

test('CR 111.10n · Sorcerer: +1/+1 e "sempre que esta criatura ataca, vidência 1"', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  s = papel(s, 0, 'Sorcerer', u);
  eq(pt(s, u), [3, 3]);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, x => !!x.pending && x.pending.kind !== 'blockers' || x.turn.step === 'combat_end');
  assert.ok(s.pending && /scry|pick|topo/.test(s.pending.kind + ' ' + (s.pending.label || '')), 'a vidência pergunta: ' + (s.pending && s.pending.kind));
});

test('CR 111.10p · Virtuous: +1/+1 para cada encantamento que você controla (o próprio Papel conta)', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso'); let v; [s, v] = poe(s, 0, 'Urso');
  s = papel(s, 0, 'Virtuous', u);
  eq(pt(s, u), [3, 3], 'um encantamento: ele');
  s = papel(s, 0, 'Monster', v);
  eq(pt(s, u), [4, 4], 'dois encantamentos');
});

test('CR 111.10q · Wicked: +1/+1; quando vai para o cemitério (inclusive pela 704.5z ou com a criatura morrendo), cada oponente perde 1 de vida', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  s = papel(s, 0, 'Wicked', u);
  eq(pt(s, u), [3, 3]);
  let vida = s.players[1].life;
  s = papel(s, 0, 'Monster', u);
  assert.equal(s.players[1].life, vida - 1, 'trocado por outro Papel: B perde 1');
  s = papel(s, 0, 'Wicked', u); vida = s.players[1].life;
  s = esvazia(mira(s, 0, 'Raio', u)); s = esvazia(mira(s, 0, 'Raio', u));
  eq([s.objects[u].zone, s.players[1].life], ['graveyard', vida - 1], 'a criatura morre e o Papel cai: B perde 1');
});

test('CR 111.10r · Young Hero (Embereth Veteran, texto oficial): ao atacar com resistência 3 ou menos, ganha um marcador +1/+1; com resistência 4, não', () => {
  let s = mesa(); let e; [s, e] = poe(s, 0, 'Embereth Veteran'); let u; [s, u] = poe(s, 0, 'Urso'); let g; [s, g] = poe(s, 0, 'Gigante');
  const a = legais(mana(s, 0), 0, x => x.t === 'activate' && x.oid === e && (x.targets || []).some(t => t.oid === u))[0]; assert.ok(a, 'Embereth Veteran mira outra criatura');
  assert.ok(!legais(mana(s, 0), 0, x => x.t === 'activate' && x.oid === e && (x.targets || []).some(t => t.oid === e)).length, 'não mira a si mesma');
  s = esvazia(act(mana(s, 0), a));
  eq([s.objects[e].zone, papeisEm(s, u).map(o => o.name)], ['graveyard', ['Young Hero']]);
  s = papel(s, 0, 'Young Hero', g);
  s = J(s); s.objects[u].sick = false; s.objects[g].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = esvazia(act(s, { t: 'attack', p: 0, attackers: [u, g] }));
  eq([(s.objects[u].counters || {}).p1p1 || 0, (s.objects[g].counters || {}).p1p1 || 0], [1, 0]);
});

test('Monstrous Rage (texto oficial, Oracle do Forge, 12/10/2026) · +2/+0 até o fim do turno e um Papel de Monster anexado (+1/+1 e atropelar), que fica', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  s = esvazia(mira(s, 0, 'Monstrous Rage', u));
  eq([pt(s, u), papeisEm(s, u).map(o => o.name)], [[5, 3], ['Monster']]);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  eq(pt(s, u), [3, 3], 'o +2/+0 acaba; o Papel fica');
});

test('validador · papel desconhecido é recusado', () => {
  assert.ok(S.validateScript({ name: 'X', effects: [{ do: 'papel', papel: 'Dragão', target: 'creature' }], ...EX }).some(e => /papel/i.test(e)));
});

/* ---------------- T-21 · correções da auditoria independente ---------------- */
test('CR 303.4i / 702.16 · o Papel que não pode encantar a criatura (proteção contra encantamentos) não é criado: nada entra, nada vai ao cemitério, e o resto da mágica vale', () => {
  let s = mesa(); let m; [s, m] = poe(s, 0, 'Muralha');
  const vida = s.players[1].life, fichas = Object.values(s.objects).filter(o => o.token).length;
  s = esvazia(mira(s, 0, 'Monstrous Rage', m));
  eq([pt(s, m), papeisEm(s, m).length, Object.values(s.objects).filter(o => o.token).length], [[4, 2], 0, fichas], '+2/+0 vale; nenhuma ficha');
  s = papel(s, 0, 'Wicked', m);
  assert.equal(s.players[1].life, vida, 'o Wicked que não chegou a existir não faz ninguém perder vida');
});
