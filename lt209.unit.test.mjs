// M-527 · LT189 · revisão por lote CLXV: gatilho modal em permanente — "When/Whenever …, choose one —" seguido das linhas "•" (700.2;
// textos da Scryfall de 19/10/2026): Archive Arbiter, Cosmogrand Zenith, Plundering Barbarian (modos com nome) e Knight of Autumn. Quem
// controla escolhe o modo quando o gatilho vai para a pilha (700.2a / 603.3c). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { 'Archive Arbiter': ['Flying'] };
const NOMES = ['Archive Arbiter', 'Cosmogrand Zenith', 'Plundering Barbarian', 'Knight of Autumn'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Amuleto: { name: 'Amuleto', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Aura: { name: 'Aura', type_line: 'Enchantment', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 209, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Lightning Bolt', 'Plains', 'Mountain', 'Forest', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Amuleto', 'Aura', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
// conjura, espera a pergunta do modo, escolhe o índice i e, se houver alvo, o primeiro que `alvo` aceitar
const entraEscolhe = (s, oid, i, alvo = () => true) => {
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === oid)[0]);
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'choose_mode'); assert.equal(s.pending.p, 0, 'quem controla escolhe');
  s = act(s, { t: 'choose_mode', p: 0, index: i });
  for (let k = 0; k < 6 && (s.pending || s.stack.length || (s.queued || []).length); k++) { if (s.pending) { const a = legais(s, s.pending.p, alvo)[0] || legais(s, s.pending.p)[0]; s = act(s, a); } else s = limpa(s); }
  return s;
};

test('M-527 · Archive Arbiter: ao entrar, destrói uma permanente não criatura e não terreno, ou ganha 4 de vida', () => {
  let s = mesa(), aa, am, u; [s, aa] = poe(s, 0, 'Archive Arbiter', 'hand'); s = terras(s, 'Plains', 6); [s, am] = poe(s, 1, 'Amuleto'); [s, u] = poe(s, 1, 'Urso');
  s = entraEscolhe(s, aa, 0, x => !x.targets || (x.targets[0] && x.targets[0].oid === am) || x.oid === am);
  assert.equal(s.objects[am].zone, 'graveyard'); assert.equal(s.objects[u].zone, 'battlefield');
  let t = mesa(), a2; [t, a2] = poe(t, 0, 'Archive Arbiter', 'hand'); t = terras(t, 'Plains', 6); const v = t.players[0].life;
  t = entraEscolhe(t, a2, 1); assert.equal(t.players[0].life, v + 4);
  const r = L.ler({ name: 'X', type_line: 'Creature — Sphinx', mana_cost: '{6}', oracle_text: 'When this creature enters, choose one —\n• Destroy target noncreature, nonland permanent.\n• You gain 4 life.', power: '4', toughness: '4' });
  const sel = JSON.parse(JSON.stringify(r.script.abilities[0].modes[0].effects[0].target)); assert.deepEqual(sel, { semTipos: ['creature', 'land'] });
});

test('M-527 · Cosmogrand Zenith: na segunda mágica do turno, dois Soldados 1/1 ou +1/+1 em cada criatura sua', () => {
  const roda = i => { let s = mesa(), cz, u; [s, cz] = poe(s, 0, 'Cosmogrand Zenith'); [s, u] = poe(s, 0, 'Urso'); s = terras(s, 'Mountain', 2);
    for (let k = 0; k < 2; k++) { let lb; [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0] && a.targets[0].player === 1)[0]);
      s = passaAte(s, x => !x.stack.length && !(x.queued || []).length || !!x.pending);
      if (k === 0) assert.ok(!(s.pending && s.pending.kind === 'choose_mode'), 'primeira: nada');
      if (s.pending && s.pending.kind === 'choose_mode') s = act(s, { t: 'choose_mode', p: 0, index: i }); s = limpa(s); }
    return [s, cz, u]; };
  let [s] = roda(0); assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Human Soldier').length, 2);
  let [t, cz, u] = roda(1); assert.equal(t.objects[cz].counters.p1p1, 1); assert.equal(t.objects[u].counters.p1p1, 1);
});

test('M-527 · Plundering Barbarian: modos com nome — destrói um artefato ou cria um Tesouro', () => {
  let s = mesa(), pb, am; [s, pb] = poe(s, 0, 'Plundering Barbarian', 'hand'); s = terras(s, 'Mountain', 3); [s, am] = poe(s, 1, 'Amuleto');
  s = entraEscolhe(s, pb, 0); assert.equal(s.objects[am].zone, 'graveyard');
  let t = mesa(), p2; [t, p2] = poe(t, 0, 'Plundering Barbarian', 'hand'); t = terras(t, 'Mountain', 3);
  t = entraEscolhe(t, p2, 1); assert.equal(t.zones[0].battlefield.filter(o => t.objects[o].name === 'Treasure').length, 1);
});

test('M-527 · Knight of Autumn: dois +1/+1 nele, destruir artefato ou encantamento, ou 4 de vida', () => {
  let s = mesa(), ka; [s, ka] = poe(s, 0, 'Knight of Autumn', 'hand'); s = terras(s, 'Forest', 2); [s] = poe(s, 0, 'Plains');
  s = entraEscolhe(s, ka, 0); assert.equal(s.objects[ka].counters.p1p1, 2);
  let t = mesa(), k2, au; [t, k2] = poe(t, 0, 'Knight of Autumn', 'hand'); t = terras(t, 'Forest', 2); [t] = poe(t, 0, 'Plains'); [t, au] = poe(t, 1, 'Aura');
  t = entraEscolhe(t, k2, 1); assert.equal(t.objects[au].zone, 'graveyard');
  let w = mesa(), k3; [w, k3] = poe(w, 0, 'Knight of Autumn', 'hand'); w = terras(w, 'Forest', 2); [w] = poe(w, 0, 'Plains'); const v = w.players[0].life;
  w = entraEscolhe(w, k3, 2); assert.equal(w.players[0].life, v + 4);
});
