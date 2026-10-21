// M-539 · LT201 · revisão por lote CLXXVII (textos da Scryfall de 20/10/2026): Edge of Autumn ("If you control four or fewer lands, search
// your library for a basic land card, put it onto the battlefield tapped, then shuffle. / Cycling—Sacrifice a land.") e Get Out ("Choose one —
// • Counter target creature or enchantment spell. • Return one or two target creatures and/or enchantments you own to your hand."). Falham
// no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, J, act, poe, legais, passaAte, valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Edge of Autumn', 'Get Out'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))] }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Forest: terra('Forest', 'Forest', 'G'), Island: terra('Island', 'Island', 'U'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Aura: { name: 'Aura', type_line: 'Enchantment', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'] },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 221, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Aura', 'Forest', 'Island']) }, { name: 'B', deck: b(['Urso', 'Aura', 'Pedra', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const nTerras = (s, p) => s.zones[p].battlefield.filter(o => /Land/.test(C[s.objects[o].name].type_line)).length;

test('M-539 · as duas jogam (lidas e aprovadas)', () => { for (const n of NOMES) assert.equal(S.coverage(of(n)).level, 'completo', n); });

test('M-539 · Edge of Autumn busca um terreno básico virado só com quatro terrenos ou menos (conferido ao resolver)', () => {
  const resolve = k => { let s = mesa(), ea; [s, ea] = poe(s, 0, 'Edge of Autumn', 'hand'); s = terras(s, 0, 'Forest', k); const n0 = nTerras(s, 0), b0 = s.zones[0].library.length;
    s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ea)[0]); s = passaAte(s, x => !x.stack.length || !!x.pending);
    if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick', p: 0, oid: s.pending.from[0] });
    s = limpa(s); const novo = s.zones[0].battlefield.filter(o => /Land/.test(C[s.objects[o].name].type_line)).slice(n0)[0];
    return [nTerras(s, 0) - n0, novo != null ? s.objects[novo].tapped : null, b0 - s.zones[0].library.length]; };
  assert.deepEqual(resolve(4), [1, true, 1], 'quatro terrenos: busca, entra virado');
  assert.deepEqual(resolve(5), [0, null, 0], 'cinco terrenos: não busca');
});

test('M-539 · Edge of Autumn cicla sacrificando um terreno à escolha (sem terreno, não cicla)', () => {
  let s = mesa(), ea, f1, f2; [s, ea] = poe(s, 0, 'Edge of Autumn', 'hand');
  assert.equal(legais(s, 0, a => a.t === 'cycle' && a.oid === ea).length, 0, 'sem terreno não há como ciclar');
  [s, f1] = poe(s, 0, 'Forest'); [s, f2] = poe(s, 0, 'Island');
  const ofs = legais(s, 0, a => a.t === 'cycle' && a.oid === ea); assert.deepEqual(Array.from(ofs, a => a.sacrifica).sort(), [f1, f2].sort(), 'uma forma por terreno');
  const mao = s.zones[0].hand.length; s = limpa(act(s, ofs.find(a => a.sacrifica === f2)));
  assert.equal(s.objects[f2].zone, 'graveyard'); assert.equal(s.objects[f1].zone, 'battlefield'); assert.equal(s.objects[ea].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, mao, 'descarta e compra uma');
});

test('M-539 · Get Out anula mágica de criatura ou encantamento (não de artefato)', () => {
  const contra = nome => { let s = mesa(), go, o; [s, go] = poe(s, 0, 'Get Out', 'hand'); s = terras(s, 0, 'Island', 2);
    s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    [s, o] = poe(s, 1, nome, 'hand'); s = terras(s, 1, 'Forest', 3); s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === o)[0]); s = act(s, { t: 'pass', p: 1 });
    const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === go && a.targets && a.targets[0] && a.targets[0].oid === o); if (!ofs.length) return [false];
    s = passaAte(act(s, ofs[0]), x => !x.stack.includes(o) || !!x.pending); return [true, s.objects[o].zone]; };
  assert.deepEqual(contra('Urso'), [true, 'graveyard']); assert.deepEqual(contra('Aura'), [true, 'graveyard']); assert.deepEqual(contra('Pedra'), [false]);
});

test('M-539 · Get Out devolve uma ou duas criaturas ou encantamentos que você possui; não mira o que é do oponente', () => {
  let s = mesa(), go, u, a, ub; [s, go] = poe(s, 0, 'Get Out', 'hand'); s = terras(s, 0, 'Island', 2); [s, u] = poe(s, 0, 'Urso'); [s, a] = poe(s, 0, 'Aura'); [s, ub] = poe(s, 1, 'Urso');
  const ofs = legais(s, 0, x => x.t === 'cast' && x.oid === go && x.targets && x.targets.some(t => t && t.oid != null && s.objects[t.oid].zone === 'battlefield'));
  assert.ok(ofs.length && ofs.every(x => x.targets.every(t => !t || t.oid == null || t.oid !== ub)), 'não mira a criatura do oponente');
  assert.ok(ofs.some(x => x.targets.filter(t => t && t.oid != null).length === 1), 'um alvo só é oferecido');
  const dois = ofs.find(x => { const ids = x.targets.filter(t => t && t.oid != null).map(t => t.oid); return ids.length === 2 && ids.includes(u) && ids.includes(a); });
  assert.ok(dois, 'os dois alvos'); assert.ok(ofs.every(x => { const ids = x.targets.filter(t => t && t.oid != null).map(t => t.oid); return new Set(ids).size === ids.length; }), 'alvos diferentes');
  s = limpa(act(s, dois)); assert.equal(s.objects[u].zone, 'hand'); assert.equal(s.objects[a].zone, 'hand'); assert.equal(s.objects[ub].zone, 'battlefield');
});

test('M-539 · achado da revisão: com dois terrenos de mesmo nome, os botões de ciclar dizem qual terreno sai (virado ou desvirado)', () => {
  let s = mesa(), ea, f1, f2; [s, ea] = poe(s, 0, 'Edge of Autumn', 'hand'); [s, f1] = poe(s, 0, 'Forest'); [s, f2] = poe(s, 0, 'Forest'); s = J(s); s.objects[f2].tapped = true;
  const ofs = legais(s, 0, a => a.t === 'cycle' && a.oid === ea), rot = Array.from(T.rotulosDeCiclar(s, 0, ofs, { sacrificaTerreno: true }));
  assert.equal(new Set(rot).size, 2, 'dois rótulos diferentes'); assert.ok(rot.every(r => /^Ciclar · sacrificar Forest/.test(r)));
  assert.match(rot[Array.from(ofs).findIndex(a => a.sacrifica === f2)], /virada/); assert.match(rot[Array.from(ofs).findIndex(a => a.sacrifica === f1)], /desvirada/);
  assert.deepEqual(Array.from(T.rotulosDeCiclar(s, 0, [{ t: 'cycle', p: 0, oid: ea }], { mana: '{2}' })), ['Ciclar · {2}'], 'custo de mana como antes');
});
