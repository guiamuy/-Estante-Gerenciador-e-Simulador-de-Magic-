// M-515 · Drafna's Restoration (texto da Scryfall de 18/10/2026, .listas/oficiais-motor.json): "Put any number of target artifact cards from
// target player's graveyard on top of their library in any order." Os alvos das cartas (de zero a todas) são escolhidos logo depois de conjurar
// (601.2c), sem a oferta de combinações que cortava escolhas; na resolução, só os que ainda servem (608.2b) vão ao topo, na ordem de quem conjurou.
// Falham no motor anterior (a carta não tinha script).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte } from './listas.mjs';
const DR = JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.find(c => c.name === "Drafna's Restoration");
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const art = name => ({ name, type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] });
const C = { [DR.name]: { name: DR.name, type_line: DR.type_line, mana_cost: DR.mana_cost, cmc: 1, keywords: [], oracle_text: DR.oracle_text, colors: ['U'] },
  Esfera: art('Esfera'), Ancora: art('Ancora'), Prisma: art('Prisma'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Twincast: { name: 'Twincast', type_line: 'Instant', mana_cost: '{U}{U}', cmc: 2, keywords: [], oracle_text: 'Copy target instant or sorcery spell. You may choose new targets for the copy.', colors: ['U'] },
  Island: terra('Island', 'Island', 'U'), Forest: terra('Forest', 'Forest', 'G') };
const DRN = DR.name;
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 197, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([DRN, 'Esfera', 'Twincast', 'Island']) }, { name: 'B', deck: b(['Esfera', 'Ancora', 'Prisma', 'Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let d; [s, d] = poe(s, 0, DRN, 'hand'); [s] = poe(s, 0, 'Island');
  const cem = {}; for (const n of ['Esfera', 'Ancora', 'Prisma', 'Urso']) [s, cem[n]] = poe(s, 1, n, 'graveyard');
  return { s, d, cem };
}
const conjura = (s, d, p) => act(s, legais(s, 0, a => a.t === 'cast' && a.oid === d && a.targets && a.targets[0].player === p)[0]);
const marca = (s, oid) => act(s, legais(s, 0, a => a.t === 'pick' && a.oid === oid)[0]);
const pronto = s => act(s, legais(s, 0, a => a.t === 'pick_done')[0]);
const resolve = s => passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'));

test("M-515 · a oferta é uma por jogador alvo; as cartas são escolhidas logo depois, só artefatos do cemitério dele, de zero a todas", () => {
  let { s, d, cem } = mesa();
  const ofertas = legais(s, 0, a => a.t === 'cast' && a.oid === d); assert.deepEqual([...ofertas.map(a => a.targets[0].player)].sort(), [0, 1]);
  s = conjura(s, d, 1); assert.equal(s.pending && s.pending.kind, 'pick');
  assert.deepEqual([...legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name)].sort(), ['Ancora', 'Esfera', 'Prisma'], 'o Urso não é artefato');
  assert.ok(legais(s, 0, a => a.t === 'pick_done').length, 'zero alvos vale');
  assert.equal(s.objects[cem.Esfera].zone, 'graveyard', 'escolher não move nada');
});

test("M-515 · na resolução, as escolhidas vão ao topo do grimório do dono na ordem de quem conjurou; a que não foi escolhida fica", () => {
  let { s, d, cem } = mesa();
  s = conjura(s, d, 1); s = marca(s, cem.Esfera); s = marca(s, cem.Prisma); s = pronto(s);
  s = resolve(s); assert.equal(s.pending && s.pending.kind, 'pick', 'duas cartas: escolhe a ordem');
  s = marca(s, cem.Prisma); s = s.pending && s.pending.kind === 'pick' ? marca(s, cem.Esfera) : s; if (s.pending && s.pending.kind === 'pick') s = pronto(s);
  s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.deepEqual([...s.zones[1].library.slice(0, 2)], [cem.Prisma, cem.Esfera], 'a primeira tocada fica no topo');
  assert.equal(s.objects[cem.Ancora].zone, 'graveyard'); assert.equal(s.objects[d].zone, 'graveyard');
});

test("M-515 · alvo que saiu do cemitério antes de resolver fica de fora (608.2b); com uma só, vai direto ao topo", () => {
  let { s, d, cem } = mesa();
  s = conjura(s, d, 1); s = marca(s, cem.Esfera); s = marca(s, cem.Ancora); s = pronto(s);
  s = J(s); const g = s.zones[1].graveyard; g.splice(g.indexOf(cem.Ancora), 1); s.zones[1].exile.push(cem.Ancora); s.objects[cem.Ancora].zone = 'exile';
  s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.equal(s.zones[1].library[0], cem.Esfera); assert.equal(s.objects[cem.Ancora].zone, 'exile');
});

test("M-515 · sem nenhuma escolhida, resolve sem mover nada; no próprio cemitério também serve", () => {
  let { s, d, cem } = mesa(); const topo = s.zones[1].library[0];
  s = pronto(conjura(s, d, 1)); s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.equal(s.zones[1].library[0], topo); for (const o of Object.values(cem)) assert.equal(s.objects[o].zone, 'graveyard');
  let m = mesa(), t = m.s, e; [t, e] = poe(t, 0, 'Esfera', 'graveyard');
  t = conjura(t, m.d, 0); assert.deepEqual([...legais(t, 0, a => a.t === 'pick').map(a => t.objects[a.oid].name)], ['Esfera']);
  t = marca(t, e); if (t.pending && t.pending.kind === 'pick') t = pronto(t); t = passaAte(t, x => !x.stack.length && !x.pending);
  assert.equal(t.zones[0].library[0], e);
});

test("M-515 · revisão: a cópia (Twincast) leva as cartas alvo e resolve antes da original (707.10)", () => {
  let { s, d, cem } = mesa(), tw; [s, tw] = poe(s, 0, 'Twincast', 'hand'); [s] = poe(s, 0, 'Island'); [s] = poe(s, 0, 'Island');
  s = conjura(s, d, 1); s = marca(s, cem.Esfera); if (s.pending && s.pending.kind === 'pick') s = pronto(s);
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === tw && x.targets && x.targets[0].oid === d)[0]; assert.ok(a, 'Twincast mira a Drafna');
  s = act(s, a); let copiou = false;
  for (let i = 0; i < 40 && !copiou; i++) {
    const pk = s.pending, p = pk ? pk.p : s.turn.priority, l = legais(s, p);
    const alvoB = pk && pk.kind === 'pick_target' ? l.find(x => x.t === 'pick_target' && (pk.options[x.index] || {}).player === 1) : null; // a cópia mira o mesmo jogador
    const r = E.apply(s, alvoB || l.find(x => x.t === 'pass') || l.find(x => x.t === 'decline' || x.t === 'pick_done') || l[0]); s = r.state;
    copiou = r.events.some(ev => ev.kind === 'effect' && ev.do === 'topo_em_ordem');
  }
  assert.ok(copiou, 'a cópia resolveu'); assert.deepEqual([...s.stack], [d], 'a original ainda na pilha');
  assert.equal(s.zones[1].library[0], cem.Esfera, 'a cópia pôs a Esfera no topo');
});
