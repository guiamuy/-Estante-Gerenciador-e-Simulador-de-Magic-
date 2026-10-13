// M-354 · LT35 · Frases do Pauper: "you may put a land card from your hand onto the battlefield [tapped]" (Growth Spiral, Embrace the Paradox;
// 305.2), "gain life equal to the number of cards in your hand" (Union of the Third Path), palavra de habilidade + "1 damage … for each creature
// card in your graveyard" (Lotleth Giant; 207.2c), "-1/-1 for each Swamp you control" (Defile), "reveal a colorless card from among them" (Ancient
// Stirrings; 105.2c) e "damage equal to the sacrificed creature's power" (Fling; 608.2h). Texto oficial em .listas/oficiais-revisadas.json
// (Oracle do Forge, 13/10/2026). Cada teste de regra falha no leitor/motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
import { T } from './listas.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const cores = m => [...new Set((m.match(/[WUBRG]/g) || []))];
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Growth Spiral', 'Embrace the Paradox', 'Union of the Third Path', 'Lotleth Giant', 'Defile', 'Ancient Stirrings', 'Fling'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const EX = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Gigante: c0('Gigante', 'Creature — Giant', '{4}{R}', { power: '5', toughness: '5' }), Engenho: c0('Engenho', 'Artifact', '{2}') };
const scripts = Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, ...EX }]));
function mesaX(a = [], b = [], seed = 79) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Forest', 'Island', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Plains', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const limpaMao = (s, p) => { s = J(s); for (const o of s.zones[p].hand.slice()) { s.zones[p].hand = s.zones[p].hand.filter(x => x !== o); s.zones[p].library.push(o); s.objects[o].zone = 'library'; } return s; };
const conjura = (s, oid, mana, alvo) => { const m = comMana(s, mana); return act(m, legais(m, 0, a => a.t === 'cast' && a.oid === oid && (!alvo || (a.targets || []).some(t => (t.oid ?? t.player) === alvo)))[0]); };

test('LT35 · Growth Spiral e Embrace the Paradox: compra e PODE pôr um terreno da mão no campo (virado no Embrace); não gasta a jogada de terreno; recusar não põe', () => {
  let s = limpaMao(mesaX(['Growth Spiral', 'Embrace the Paradox']), 0), gs, ep, fo;
  [s, gs] = poe(s, 0, 'Growth Spiral', 'hand'); [s, fo] = poe(s, 0, 'Forest', 'hand');
  let t = resolveSo(conjura(s, gs, 'GU'));
  assert.equal(t.pending.kind, 'pick'); assert.ok(t.pending.from.includes(fo)); assert.equal(t.pending.min, 0, 'opcional');
  t = tudo(act(t, { t: 'pick', p: 0, oid: fo }));
  assert.equal(t.objects[fo].zone, 'battlefield'); assert.equal(t.objects[fo].tapped, false);
  assert.ok(legais(t, 0, a => a.t === 'play_land').length > 0 || !t.zones[0].hand.some(o => (t.facts[t.objects[o].name].types || []).includes('land')), 'a jogada de terreno do turno continua disponível');
  const r = tudo(act(resolveSo(conjura(s, gs, 'GU')), { t: 'pick_done', p: 0 })); assert.equal(r.objects[fo].zone, 'hand', 'recusou: fica na mão');
  let u = s; [u, ep] = poe(u, 0, 'Embrace the Paradox', 'hand');
  u = resolveSo(conjura(u, ep, 'GGGUU')); u = tudo(act(u, { t: 'pick', p: 0, oid: fo }));
  assert.equal(u.objects[fo].tapped, true, 'entra virado');
});

test('LT35 · Union of the Third Path: compra primeiro e ganha uma vida por carta na mão, contando na resolução', () => {
  let s = limpaMao(mesaX(['Union of the Third Path', 'Urso']), 0), un;
  [s, un] = poe(s, 0, 'Union of the Third Path', 'hand'); [s] = poe(s, 0, 'Urso', 'hand'); [s] = poe(s, 0, 'Urso', 'hand');
  const v = s.players[0].life; const t = tudo(resolveSo(conjura(s, un, 'WWW')));
  assert.equal(t.zones[0].hand.length, 3, 'dois Ursos + a comprada'); assert.equal(t.players[0].life, v + 3);
});

test('LT35 · Lotleth Giant: ao entrar, 1 de dano ao oponente alvo por carta de criatura no SEU cemitério (palavra de habilidade não muda nada)', () => {
  let s = mesaX(['Lotleth Giant', 'Urso', 'Engenho'], ['Urso']), lg;
  [s, lg] = poe(s, 0, 'Lotleth Giant', 'hand'); [s] = poe(s, 0, 'Urso', 'graveyard'); [s] = poe(s, 0, 'Urso', 'graveyard'); [s] = poe(s, 0, 'Engenho', 'graveyard'); [s] = poe(s, 1, 'Urso', 'graveyard');
  const v = s.players[1].life; const t = tudo(resolveSo(conjura(s, lg, 'BBBBBBB')));
  assert.equal(t.players[1].life, v - 2, 'duas criaturas no cemitério de A (o artefato e a do oponente não contam)');
});

test('LT35 · Defile: -1/-1 por Pântano seu, contado na resolução', () => {
  let s = mesaX(['Defile'], ['Gigante']), df, g;
  [s, df] = poe(s, 0, 'Defile', 'hand'); [s, g] = poe(s, 1, 'Gigante'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Swamp');
  const t = tudo(resolveSo(conjura(s, df, 'B', g)));
  assert.equal(E.stats(t, t.objects[g]).power, 2); assert.equal(E.stats(t, t.objects[g]).toughness, 2);
  assert.doesNotMatch(T.descreveEfeitos(scripts.Defile.effects), /NaN/);
});

test('LT35 · Ancient Stirrings: das cinco de cima pode pegar uma incolor (terreno vale, colorida não); o resto vai para o fundo', () => {
  let s = mesaX(['Ancient Stirrings', 'Engenho', 'Urso']), as, en, ur;
  [s, as] = poe(s, 0, 'Ancient Stirrings', 'hand');
  s = J(s); const lib = s.zones[0].library; en = lib.find(o => s.objects[o].name === 'Engenho'); ur = lib.find(o => s.objects[o].name === 'Urso'); const fl = lib.find(o => s.objects[o].name === 'Forest');
  for (const o of [fl, ur, en]) { lib.splice(lib.indexOf(o), 1); lib.unshift(o); }
  let t = resolveSo(conjura(s, as, 'G'));
  assert.equal(t.pending.kind, 'pick'); assert.ok(t.pending.from.includes(en) && t.pending.from.includes(fl), 'as cinco de cima');
  assert.throws(() => E.apply(t, { t: 'pick', p: 0, oid: ur }), 'o Urso verde não serve'); assert.doesNotThrow(() => E.apply(t, { t: 'pick', p: 0, oid: fl }), 'o terreno é incolor (105.2c)');
  t = tudo(act(t, { t: 'pick', p: 0, oid: en })); assert.equal(t.objects[en].zone, 'hand');
  assert.ok(t.zones[0].library.slice(-4).includes(ur), 'o resto no fundo');
});

test('LT35 · Fling: sacrifica uma criatura como custo e causa dano igual ao poder dela como era no campo', () => {
  let s = mesaX(['Fling', 'Gigante']), fl, g;
  [s, fl] = poe(s, 0, 'Fling', 'hand'); [s, g] = poe(s, 0, 'Gigante');
  const ofs = legais(comMana(s, 'RR'), 0, a => a.t === 'cast' && a.oid === fl && a.targets[0].player === 1); assert.ok(ofs.length, 'oferta sacrificando o Gigante');
  const v = s.players[1].life; const t = tudo(resolveSo(act(comMana(s, 'RR'), ofs[0])));
  assert.equal(t.objects[g].zone, 'graveyard'); assert.equal(t.players[1].life, v - 5);
});

test('achado da revisão do lote XXVI · pilha explicada: Ancient Stirrings diz quantas olha, o que pode pegar e para onde vai o resto; o X diz o que conta', () => {
  assert.equal(T.descreveEfeitos(scripts['Ancient Stirrings'].effects), 'olha as 5 cartas de cima; pode revelar e pôr uma carta incolor na mão; o resto vai para o fundo');
  assert.match(T.descreveEfeitos(scripts['Union of the Third Path'].effects), /X = cartas na sua mão/);
  assert.match(T.descreveEfeitos(scripts['Lotleth Giant'].abilities[0].effects), /X = cartas de criatura no seu cemitério/);
  assert.match(T.descreveEfeitos(scripts.Fling.effects), /X = o poder da criatura sacrificada/);
});

test('M-354 · pilha explicada dos efeitos novos em português, sem NaN', () => {
  for (const n of NOMES) { const sc = scripts[n]; for (const e of [...(sc.effects || []), ...(sc.abilities || []).flatMap(a => a.effects || [])]) { const d = T.descreveEfeitos([e]); assert.ok(d && !/NaN|undefined|_/.test(d), n + ': ' + d); } }
});

test('M-354 · as do lote XXVI revisadas jogam (decisão A)', () => {
  for (const n of NOMES) assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
