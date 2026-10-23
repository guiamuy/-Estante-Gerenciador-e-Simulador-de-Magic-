// M-568 · LT227 · revisão por lote CCIII (textos da Scryfall de 23/10/2026): seis cartas Pauper que o leitor já lia e só faltava aprovar — Highland
// Forest e Woodland Chasm (terras da neve com dois tipos básicos, entram viradas), Rubblebelt Maverick (vigiar 2 ao entrar; "{G}, Exile this card from
// your graveyard: Put a +1/+1 counter on target creature. Activate only as a sorcery."), Drown in Sorrow, Rewind, Mechanized Ninja Cavalry. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Highland Forest', 'Woodland Chasm', 'Rubblebelt Maverick', 'Drown in Sorrow', 'Rewind', 'Mechanized Ninja Cavalry'];
const cor = c => [...new Set((c.match(/[WUBRG]/g) || []))];
const C = Object.fromEntries(NOMES.map(n => { const o = OF.find(x => x.name === n); return [n, { name: n, type_line: o.type_line, mana_cost: o.mana_cost || '', cmc: [...(o.mana_cost || '').matchAll(/\{([^}]+)\}/g)].length, keywords: o.keywords || [], oracle_text: o.oracle_text, ...(o.power ? { power: o.power, toughness: o.toughness } : {}), colors: cor(o.mana_cost || '') }]; }));
Object.assign(C, Object.fromEntries([['Island', 'U'], ['Swamp', 'B'], ['Forest', 'G'], ['Mountain', 'R']].map(([n, k]) => [n, { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] }])),
  { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
    Gigante: { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{3}{G}', cmc: 4, keywords: [], oracle_text: '', power: '4', toughness: '4', colors: ['G'] } });
function mesa(deckA, deckB = [['Urso', 4], ['Island', 36]]) {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 250, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(deckA) }, { name: 'B', deck: b(deckB) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = (s, escolha = pd => legais(s, pd.p)[0]) => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, escolha(pd, s)) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('M-568 · as seis jogam (lidas e aprovadas)', () => { for (const n of NOMES) assert.equal(S.coverage(C[n]).level, 'completo', n); });

test('M-568 · terras da neve: entram viradas e geram uma das duas cores', () => {
  for (const [n, a, b] of [['Highland Forest', 'R', 'G'], ['Woodland Chasm', 'B', 'G']]) {
    let s = mesa([[n, 4], ['Island', 36]]), t; [s, t] = poe(s, 0, n, 'hand');
    s = act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === t)[0]); assert.equal(s.objects[t].tapped, true, `${n} entra virada`);
    s = JSON.parse(JSON.stringify(s)); s.objects[t].tapped = false;
    const ts = legais(s, 0, x => x.t === 'tap_mana' && x.oid === t); assert.ok(ts.length >= 1);
    const pools = [0, 1].map(o => act(s, { ...ts[0], option: o }).players[0].pool);
    assert.deepEqual(pools.map(p => Object.keys(p).filter(k => p[k] > 0).join('')).sort(), [a, b].sort(), n);
    assert.match(s.facts[n].typeLine || C[n].type_line, /Snow Land/);
  }
});

test('M-568 · Drown in Sorrow: todas as criaturas −2/−2 (as 2/2 morrem, dos dois lados) e vidência 1', () => {
  let s = mesa([['Drown in Sorrow', 2], ['Urso', 2], ['Gigante', 2], ['Swamp', 34]]), d, u1, g, u2;
  [s, d] = poe(s, 0, 'Drown in Sorrow', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Swamp');
  [s, u1] = poe(s, 0, 'Urso'); [s, g] = poe(s, 0, 'Gigante'); [s, u2] = poe(s, 1, 'Urso');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === d)[0]); let vid = false;
  s = resolve(s, (pd, st) => { if (/scry|vid/i.test(pd.kind + (pd.label || ''))) vid = true; return legais(st, pd.p)[0]; });
  assert.equal(s.objects[u1].zone, 'graveyard'); assert.equal(s.objects[u2].zone, 'graveyard'); assert.equal(s.objects[g].zone, 'battlefield');
  assert.ok(vid, 'perguntou a vidência');
});

test('M-568 · Rewind anula a mágica e desvira até quatro terrenos', () => {
  let s = mesa([['Rewind', 2], ['Island', 38]], [['Urso', 4], ['Forest', 36]]), r; [s, r] = poe(s, 0, 'Rewind', 'hand');
  const ilhas = []; for (let i = 0; i < 5; i++) { let o; [s, o] = poe(s, 0, 'Island'); ilhas.push(o); }
  let u; [s, u] = poe(s, 1, 'Urso', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Forest');
  s = JSON.parse(JSON.stringify(s)); s.turn.active = 1; s.turn.priority = 1; // B conjura no turno dele
  s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === u)[0]); s = act(s, { t: 'pass', p: 1 }); // B passa; A responde
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === r)[0]);
  assert.equal(ilhas.filter(o => s.objects[o].tapped).length, 4, 'pagou {2}{U}{U}');
  s = resolve(s, (pd, st) => { if (pd.kind === 'pick') { const l = legais(st, pd.p, a => a.t === 'pick'); return l.length ? l[0] : legais(st, pd.p, a => a.t === 'pick_done')[0]; } return legais(st, pd.p)[0]; });
  assert.equal(s.objects[u].zone, 'graveyard', 'Urso anulado'); assert.equal(ilhas.filter(o => s.objects[o].tapped).length, 0, 'as quatro desviradas');
});

test('M-568 · Rubblebelt Maverick: vigiar 2 ao entrar; do cemitério, {G} e exilá-la põe um marcador +1/+1 (só como feitiço)', () => {
  let s = mesa([['Rubblebelt Maverick', 2], ['Urso', 2], ['Forest', 36]]), m, u; [s, m] = poe(s, 0, 'Rubblebelt Maverick', 'hand'); [s] = poe(s, 0, 'Forest'); [s] = poe(s, 0, 'Forest'); [s, u] = poe(s, 0, 'Urso');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === m)[0]); let viu = false;
  s = resolve(s, (pd, st) => { if (pd.kind === 'pick' || /surveil|vigi/i.test(pd.label || '')) viu = true; const d = legais(st, pd.p, a => a.t === 'pick_done'); return d.length ? d[0] : legais(st, pd.p)[0]; });
  assert.ok(viu, 'vigiar perguntou'); assert.equal(s.objects[m].zone, 'battlefield');
  s = JSON.parse(JSON.stringify(s)); const zb = s.zones[0].battlefield; zb.splice(zb.indexOf(m), 1); s.zones[0].graveyard.push(m); s.objects[m].zone = 'graveyard';
  const at = legais(s, 0, a => a.t === 'activate' && a.oid === m && (a.targets || []).some(t => t.oid === u)); assert.ok(at.length, 'ativa do cemitério');
  let t = resolve(act(s, at[0])); assert.equal(t.objects[m].zone, 'exile'); assert.equal(t.objects[u].counters.p1p1, 1);
  const s2 = JSON.parse(JSON.stringify(s)); s2.turn.step = 'combat_begin';
  assert.equal(legais(s2, 0, a => a.t === 'activate' && a.oid === m).length, 0, 'fora da fase principal, não');
});

test('M-568 · Mechanized Ninja Cavalry: ao entrar, cria um Robô 1/1 artefato incolor', () => {
  let s = mesa([['Mechanized Ninja Cavalry', 2], ['Mountain', 38]]), m; [s, m] = poe(s, 0, 'Mechanized Ninja Cavalry', 'hand'); [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 0, 'Mountain');
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === m)[0]));
  const rob = s.zones[0].battlefield.map(o => s.objects[o]).find(o => o.token && o.name === 'Robot'); assert.ok(rob, 'Robô criado');
  const f = s.facts[rob.name]; assert.ok(f.types.includes('artifact') && f.types.includes('creature')); assert.equal((f.colors || []).length, 0);
});
