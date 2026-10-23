// M-570 · LT229 · revisão por lote CCV (textos da Scryfall de 23/10/2026): Elven Farsight ("Scry 3, then you may reveal the top card of your library. If a
// creature card is revealed this way, draw a card."), Bushwhack (modal: terreno básico para a mão, ou luta entre uma criatura sua e uma que você não controla),
// Self-Assembler ("When this creature enters, you may search your library for an Assembly-Worker creature card, reveal it, put it into your hand, then shuffle.").
// Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Elven Farsight', 'Bushwhack', 'Self-Assembler'];
const cor = c => [...new Set((c.match(/[WUBRG]/g) || []))];
const C = Object.fromEntries(NOMES.map(n => { const o = OF.find(x => x.name === n); return [n, { name: n, type_line: o.type_line, mana_cost: o.mana_cost, cmc: [...o.mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((t, [, x]) => t + (/^\d+$/.test(x) ? +x : 1), 0), keywords: o.keywords || [], oracle_text: o.oracle_text, ...(o.power ? { power: o.power, toughness: o.toughness } : {}), colors: cor(o.mana_cost) }]; }));
Object.assign(C, Object.fromEntries([['Forest', 'G'], ['Island', 'U'], ['Plains', 'W']].map(([n, k]) => [n, { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] }])),
  { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '3', toughness: '3', colors: ['G'] },
    Rato: { name: 'Rato', type_line: 'Creature — Rat', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', power: '1', toughness: '1', colors: [] },
    Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } });
function mesa(deckA, deckB = [['Rato', 4], ['Island', 36]], seed = 252) {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(deckA) }, { name: 'B', deck: b(deckB) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const noTopo = (s, p, n) => { s = JSON.parse(JSON.stringify(s)); const L = s.zones[p].library, o = L.find(x => s.objects[x].name === n); L.splice(L.indexOf(o), 1); L.unshift(o); return [s, o]; };
const resolve = (s, escolha = (pd, st) => legais(st, pd.p)[0]) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, escolha(pd, s)) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };
// na vidência, mantém só a carta que estava no topo (o resto vai para o fundo); nas outras escolhas, a primeira opção
const semMexer = (pd, st) => pd.kind === 'pick' && pd.label === 'scry' ? ((pd.picked || []).length ? legais(st, pd.p, a => a.t === 'pick_done')[0] : { t: 'pick', p: pd.p, oid: pd.from[0] }) : legais(st, pd.p)[0];

test('M-570 · as três jogam (lidas e aprovadas)', () => { for (const n of NOMES) assert.equal(S.coverage(C[n]).level, 'completo', n); });

test('M-570 · Elven Farsight: vidência 3; a pergunta de revelar vem sempre (não conta o que é a carta); revelando criatura, compra; outra carta, não compra', () => {
  const joga = (topo, revela) => {
    let s = mesa([['Elven Farsight', 2], ['Urso', 4], ['Forest', 34]]), e; [s, e] = poe(s, 0, 'Elven Farsight', 'hand'); [s] = poe(s, 0, 'Forest');
    let u; [s, u] = noTopo(s, 0, topo); const mao0 = s.zones[0].hand.length; let perguntou = false;
    const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === e)[0]), (pd, st) => { if (pd.kind === 'may_pay') { perguntou = true; assert.ok(!pd.name.includes(st.objects[st.zones[0].library[0]].name), 'a pergunta não diz a carta'); return { t: revela ? 'pay' : 'decline', p: pd.p }; } return semMexer(pd, st); });
    return { perguntou, comprou: t.zones[0].hand.length - (mao0 - 1), u, t };
  };
  const a = joga('Urso', true); assert.ok(a.perguntou); assert.equal(a.comprou, 1); assert.ok(a.t.zones[0].hand.includes(a.u), 'comprou a criatura revelada');
  const b = joga('Forest', true); assert.ok(b.perguntou, 'com terreno no topo também pergunta'); assert.equal(b.comprou, 0);
  const c = joga('Urso', false); assert.equal(c.comprou, 0, 'recusou: não compra');
});

test('M-570 · Bushwhack: busca um terreno básico para a mão, ou a sua criatura luta com uma do oponente', () => {
  let s = mesa([['Bushwhack', 2], ['Urso', 2], ['Forest', 36]]), b, u, r; [s, b] = poe(s, 0, 'Bushwhack', 'hand'); [s] = poe(s, 0, 'Forest'); [s, u] = poe(s, 0, 'Urso'); [s, r] = poe(s, 1, 'Rato');
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === b);
  const luta = cs.find(a => (a.targets || []).some(t => t.oid === u) && (a.targets || []).some(t => t.oid === r)); assert.ok(luta, 'modo da luta com os dois alvos');
  let t = resolve(act(s, luta)); assert.equal(t.objects[r].zone, 'graveyard'); assert.equal(t.objects[u].damage, 1, 'as duas causam dano');
  const busca = cs.find(a => !(a.targets || []).length); assert.ok(busca, 'modo da busca, sem alvo');
  const mao0 = s.zones[0].hand.length;
  let t2 = resolve(act(s, busca), (pd, st) => pd.kind === 'pick' ? (legais(st, pd.p, a => a.t === 'pick')[0] || legais(st, pd.p, a => a.t === 'pick_done')[0]) : legais(st, pd.p)[0]);
  assert.equal(t2.zones[0].hand.length, mao0, 'saiu a mágica, entrou a Floresta'); assert.ok(t2.zones[0].hand.some(x => t2.objects[x].name === 'Forest'));
});

test('M-570 · Self-Assembler: ao entrar, pode buscar uma criatura Assembly-Worker para a mão', () => {
  let s = mesa([['Self-Assembler', 4], ['Pedra', 2], ['Plains', 34]]), a; [s, a] = poe(s, 0, 'Self-Assembler', 'hand'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Plains');
  const mao0 = s.zones[0].hand.length; let oferta = [];
  const t = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a)[0]), (pd, st) => {
    if (pd.kind === 'pick') { oferta = legais(st, pd.p, x => x.t === 'pick').map(x => st.objects[x.oid].name); return legais(st, pd.p, x => x.t === 'pick')[0] || legais(st, pd.p, x => x.t === 'pick_done')[0]; }
    if (pd.kind === 'may_pay') return { t: 'pay', p: pd.p }; return legais(st, pd.p)[0]; });
  assert.ok(oferta.length && oferta.every(n => n === 'Self-Assembler'), JSON.stringify(oferta));
  assert.equal(t.zones[0].hand.length, mao0, 'saiu um, voltou outro'); assert.equal(t.objects[a].zone, 'battlefield');
});
