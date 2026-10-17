// M-475 · LT141 · correções da revisão independente de M-455…M-465: (1) 400.7 no "you may" do gatilho do cemitério (Aurora Eidolon);
// (2) 603.2c: descarte escolhido de N cartas é um evento só (Magmakin Artillerist com Faithless Looting e na limpeza, 514.1/514.3a);
// (3) "exile up to two target cards from graveyards" é uma instrução só (Faerie Macabre com Spirit Mascot); (4) a oferta do cemitério respeita
// "Activate only during your upkeep" (Necrosavant, texto da Scryfall de 17/10/2026). Cada caso falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = ['oficiais.json', 'oficiais-revisadas.json'].flatMap(f => JSON.parse(readFileSync(new URL('./.listas/' + f, import.meta.url), 'utf8')).cartas);
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: [...palavrasDoTexto(c.oracle_text), ...(/^Flashback/m.test(c.oracle_text) ? ['Flashback'] : []), ...(/^Cycling/m.test(c.oracle_text) ? ['Cycling'] : [])], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost || '').match(/[WUBRG]/g) || [])], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Aurora Eidolon', 'Terminate', 'Thrill of Possibility', 'Magmakin Artillerist', 'Faithless Looting', 'Spirit Mascot', 'Faerie Macabre', 'Necrosavant'];
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, m) => ({ name, type_line: `Basic Land — ${name}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'R'), Plains: terra('Plains', 'W'), Swamp: terra('Swamp', 'B'), Island: terra('Island', 'U') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /^(Mountain|Plains|Swamp|Island)$/.test(name) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 145, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Mountain', 'Plains', 'Swamp', 'Island']) }, { name: 'B', deck: b(['Urso', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const passa = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });

test('LT141 · Necrosavant joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C.Necrosavant).level, 'completo'); assert.equal(S.APROVADAS.Necrosavant.leva, 'M-475');
});

test('LT141 · Aurora Eidolon: o gatilho mais antigo não devolve a carta que já voltou ao cemitério como objeto novo (400.7)', () => {
  let s = mesa(), ae, t1, t2, th, u1, u2; [s, ae] = poe(s, 0, 'Aurora Eidolon', 'graveyard'); [s, u1] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Urso');
  [s, t1] = poe(s, 0, 'Terminate', 'hand'); [s, t2] = poe(s, 0, 'Terminate', 'hand'); [s, th] = poe(s, 0, 'Thrill of Possibility', 'hand');
  s = terras(s, 'Swamp', 2); s = terras(s, 'Mountain', 4);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t1 && a.targets[0].oid === u1)[0]); // G1 do Eidolon
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t2 && a.targets[0].oid === u2)[0]); // G2 do Eidolon
  s = passa(s); assert.equal(s.pending && s.pending.kind, 'may_pay', 'G2 pergunta'); s = act(s, { t: 'pay', p: 0 });
  assert.equal(s.objects[ae].zone, 'hand', 'G2 devolveu');
  const thr = legais(s, 0, a => a.t === 'cast' && a.oid === th); assert.ok(thr.length > 0);
  s = act(s, thr.find(a => a.pay && (a.pay.discard || [])[0] === ae) || thr[0]);
  if (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: 0, oid: ae });
  assert.equal(s.objects[ae].zone, 'graveyard', 'descartada: objeto novo no cemitério');
  for (let i = 0; i < 30 && s.stack.length && !(s.pending && s.pending.kind === 'may_pay'); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s);
  for (let i = 0; i < 30 && (s.stack.length || s.pending); i++) { if (s.pending && s.pending.kind === 'may_pay') { s = act(s, { t: 'pay', p: 0 }); continue; } s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s); }
  assert.equal(s.objects[ae].zone, 'graveyard', 'G1 não acha a carta: era outra encarnação');
});

test('LT141 · Magmakin Artillerist: Faithless Looting descarta duas = um gatilho de 2 (603.2c)', () => {
  let s = mesa(), ma, fl; [s, ma] = poe(s, 0, 'Magmakin Artillerist'); [s, fl] = poe(s, 0, 'Faithless Looting', 'hand'); s = terras(s, 'Mountain', 1);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fl)[0]); s = passa(s);
  let gat = 0;
  for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { gat = Math.max(gat, s.stack.filter(x => (s.objects[x] || {}).name === 'Magmakin Artillerist' && s.objects[x].ability).length); s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s); }
  assert.equal(gat, 1, 'um gatilho só'); assert.equal(s.players[1].life, 18);
});

test('LT141 · Magmakin Artillerist: a limpeza descarta três = um gatilho de 3, com prioridade depois (514.1, 514.3a)', () => {
  let s = mesa(), ma; [s, ma] = poe(s, 0, 'Magmakin Artillerist');
  while (s.zones[0].hand.length < 10) [s] = poe(s, 0, 'Urso', 'hand');
  s = passaAte(s, x => x.pending && x.pending.kind === 'discard' && x.pending.p === 0, 60);
  for (let k = 0; k < 3; k++) s = act(s, { t: 'discard', p: 0, oid: s.zones[0].hand[0] });
  assert.equal(s.stack.filter(x => s.objects[x] && s.objects[x].ability).length, 1, 'um gatilho na pilha');
  s = passa(s); assert.equal(s.players[1].life, 17);
});

test('LT141 · Faerie Macabre exila duas cartas do seu cemitério: Spirit Mascot ganha um marcador, não dois', () => {
  let s = mesa(), sm, fm, u1, u2; [s, sm] = poe(s, 0, 'Spirit Mascot'); [s, u1] = poe(s, 0, 'Urso', 'graveyard'); [s, u2] = poe(s, 0, 'Urso', 'graveyard'); [s, fm] = poe(s, 0, 'Faerie Macabre', 'hand');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === fm && x.targets && x.targets.length === 2 && x.targets.some(t => t.oid === u1) && x.targets.some(t => t.oid === u2));
  assert.ok(a.length > 0); s = act(s, a[0]);
  for (let i = 0; i < 30 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s);
  assert.equal(s.objects[u1].zone, 'exile'); assert.equal(s.objects[u2].zone, 'exile');
  assert.equal((s.objects[sm].counters || {}).p1p1 || 0, 1);
});

test('LT141 · Necrosavant: a oferta do cemitério só aparece na sua manutenção, e a ativação volta ao campo sacrificando', () => {
  let s = mesa(), ns, u; [s, ns] = poe(s, 0, 'Necrosavant', 'graveyard'); [s, u] = poe(s, 0, 'Urso'); s = terras(s, 'Swamp', 5);
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === ns).length, 0, 'fora da manutenção');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep' && x.turn.priority === 0 && !x.pending, 400);
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === ns).length, 0, 'manutenção do oponente');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep' && x.turn.priority === 0 && !x.pending, 400);
  const l = legais(s, 0, a => a.t === 'activate' && a.oid === ns); assert.ok(l.length > 0, 'na sua manutenção');
  s = act(s, l[0]); for (let i = 0; i < 30 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s);
  assert.equal(s.objects[ns].zone, 'battlefield'); assert.equal(s.objects[u].zone, 'graveyard');
});
