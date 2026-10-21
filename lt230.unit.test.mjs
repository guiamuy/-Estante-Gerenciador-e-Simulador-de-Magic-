// M-548 · LT210 · revisão por lote CLXXXVI (textos e rulings da Scryfall de 21/10/2026): Phelia, Exuberant Shepherd ("Flash / Whenever Phelia attacks,
// exile up to one other target nonland permanent. At the beginning of the next end step, return that card to the battlefield under its owner's control.
// If it entered under your control, put a +1/+1 counter on Phelia.") e Flickerwisp ("Flying / When this creature enters, exile another target permanent.
// Return that card to the battlefield under its owner's control at the beginning of the next end step."). Gatilho atrasado (603.7); objeto novo (400.7);
// volta mesmo sem a fonte (rulings). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte, valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const PH = 'Phelia, Exuberant Shepherd', FW = 'Flickerwisp';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || [], oracle_text: c.oracle_text, colors: ['W'], power: c.power, toughness: c.toughness }; };
const OC = JSON.parse(readFileSync(new URL('./.listas/oficiais-cartas.json', import.meta.url), 'utf8')).cartas, hu = OC.find(x => x.name === 'Hyena Umbra');
const C = { [PH]: of(PH), [FW]: of(FW), 'Hyena Umbra': { name: hu.name, type_line: hu.type_line, mana_cost: hu.mana_cost, cmc: valorDeMana(hu.mana_cost), keywords: palavrasDoTexto(hu.oracle_text), oracle_text: hu.oracle_text, colors: ['W'] } };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Mountain: terra('Mountain', 'Mountain', 'R'),
  Choque: { name: 'Choque', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Gigante: { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', power: '4', toughness: '4', colors: ['G'] } });
const SCRIPTS = { Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 230, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([PH, FW, 'Choque', 'Urso', 'Hyena Umbra', 'Plains', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
// resolve tudo; na escolha de alvo do gatilho, escolhe `alvo` (null: nenhum)
const resolve = (s, alvo) => { for (let i = 0; i < 20; i++) { s = passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length)); if (!s.pending) return s;
  const pd = s.pending; if (pd.kind !== 'pick_target') return s; const k = pd.options.findIndex(o => alvo == null ? o == null || o.none : o && o.oid === alvo); s = act(s, { t: 'pick_target', p: pd.p, index: k }); } return s; };
const ateFinal = s => passaAte(s, x => x.turn.step === 'end' && !x.stack.length && !(x.queued || []).length && !x.pending);

test('M-548 · Phelia e Flickerwisp jogam (lidas e aprovadas)', () => { for (const n of [PH, FW]) assert.equal(S.coverage(of(n)).level, 'completo', n); });

test('M-548 · Flickerwisp exila outra permanente e ela volta no começo do passo final, sob o controle do dono, como objeto novo (desvirada, sem marcadores); volta mesmo sem o Flickerwisp', () => {
  let s = mesa(), fw, g; [s, fw] = poe(s, 0, FW, 'hand'); [s, g] = poe(s, 1, 'Gigante'); s = terras(s, 0, 'Plains', 3);
  s = JSON.parse(JSON.stringify(s)); s.objects[g].tapped = true; s.objects[g].counters.p1p1 = 2;
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fw)[0]), g);
  assert.equal(s.objects[g].zone, 'exile', 'exilado');
  s = ateFinal(s); const x = s.objects[g];
  assert.deepEqual([x.zone, x.controller, !!x.tapped, x.counters.p1p1 || 0], ['battlefield', 1, false, 0], 'volta ao campo do dono, desvirado e sem marcadores');
  let t = mesa(), fw2, u, ch; [t, fw2] = poe(t, 0, FW, 'hand'); [t, u] = poe(t, 1, 'Urso'); [t, ch] = poe(t, 0, 'Choque', 'hand'); t = terras(t, 0, 'Plains', 3); t = terras(t, 0, 'Mountain', 1);
  t = resolve(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === fw2)[0]), u); assert.equal(t.objects[u].zone, 'exile');
  t = resolve(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ch && a.targets && a.targets[0].oid === fw2)[0])); assert.equal(t.objects[fw2].zone, 'graveyard', 'o Flickerwisp morreu');
  t = ateFinal(t); assert.deepEqual([t.objects[u].zone, t.objects[u].controller], ['battlefield', 1], 'volta mesmo assim');
});

test('M-548 · Phelia: a permanente sua que volta sob o seu controle dá um marcador +1/+1 à Phelia; a do oponente volta para ele sem marcador; sem alvo, nada', () => {
  const ataca = (alvoDe) => { let s = mesa(), ph, alvo; [s, ph] = poe(s, 0, PH); [s, alvo] = alvoDe === 'seu' ? poe(s, 0, 'Urso') : alvoDe === 'oponente' ? poe(s, 1, 'Gigante') : [s, null];
    s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [ph] });
    s = resolve(s, alvo); const exilado = alvo == null ? null : s.objects[alvo].zone;
    s = passaAte(s, x => (x.pending && x.pending.kind === 'blockers') || x.turn.step === 'end'); if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
    s = ateFinal(s); return { s, ph, alvo, exilado }; };
  { const { s, ph, alvo, exilado } = ataca('seu'); assert.equal(exilado, 'exile');
    assert.deepEqual([s.objects[alvo].zone, s.objects[alvo].controller, s.objects[ph].counters.p1p1 || 0], ['battlefield', 0, 1], 'Urso volta para você; Phelia ganha 1'); }
  { const { s, ph, alvo, exilado } = ataca('oponente'); assert.equal(exilado, 'exile');
    assert.deepEqual([s.objects[alvo].zone, s.objects[alvo].controller, s.objects[ph].counters.p1p1 || 0], ['battlefield', 1, 0], 'Gigante volta para o oponente; sem marcador'); }
  { const { s, ph } = ataca(null); assert.equal(s.objects[ph].counters.p1p1 || 0, 0, 'sem alvo: nada'); }
});

// passa até o fim do passo final guardando as linhas do registro (T.describe)
const ateFinalRegistro = s => { const L = []; for (let i = 0; i < 400 && !(s.turn.step === 'end' && !s.stack.length && !(s.queued || []).length && !s.pending); i++) { const pd = s.pending;
  const a = pd && pd.kind === 'blockers' ? { t: 'block', p: pd.p, blocks: [] } : pd && pd.kind === 'attackers' ? { t: 'attack', p: pd.p, attackers: [] } : pd ? null : { t: 'pass', p: s.turn.priority }; if (!a) break;
  const r = E.apply(s, a); L.push(String(T.describe(s, a, r.events, r.state))); s = r.state; } return { s, L: L.join('\n') }; };

test('M-548 · achados da revisão: o registro diz quando a Phelia ganha o marcador e quando a carta exilada fica no exílio por não ter onde voltar (Aura sem criatura, 303.4g)', () => {
  let s = mesa(), ph, u; [s, ph] = poe(s, 0, PH); [s, u] = poe(s, 0, 'Urso');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = resolve(act(s, { t: 'attack', p: 0, attackers: [ph] }), u);
  const r = ateFinalRegistro(s); assert.match(r.L, /voltou ao campo sob o controle do dono; Phelia, Exuberant Shepherd ganhou um marcador \+1\/\+1/);
  let t = mesa(), ph2, au, ch; [t, ph2] = poe(t, 0, PH); [t, au] = poe(t, 0, 'Hyena Umbra'); t = JSON.parse(JSON.stringify(t)); t.objects[au].attachedTo = ph2; [t, ch] = poe(t, 0, 'Choque', 'hand'); t = terras(t, 0, 'Mountain', 1);
  t = passaAte(t, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); t = resolve(act(t, { t: 'attack', p: 0, attackers: [ph2] }), au); assert.equal(t.objects[au].zone, 'exile');
  t = passaAte(t, x => (x.pending && x.pending.kind === 'blockers') || x.turn.step === 'main2'); if (t.pending && t.pending.kind === 'blockers') t = act(t, { t: 'block', p: 1, blocks: [] });
  t = passaAte(t, x => x.turn.step === 'main2' && !x.stack.length && !x.pending);
  t = resolve(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ch && a.targets && a.targets[0].oid === ph2)[0])); assert.equal(t.objects[ph2].zone, 'graveyard');
  const r2 = ateFinalRegistro(t); assert.equal(r2.s.objects[au].zone, 'exile', 'sem criatura para encantar, fica no exílio');
  assert.match(r2.L, /não tinha como voltar ao campo e fica no exílio/); assert.doesNotMatch(r2.L, /já não estava no exílio/);
});
