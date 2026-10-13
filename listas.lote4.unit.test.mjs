// L-4 · trilha listas · Pauper de M a Z, lote 4: teste de regra de cada mecânica tocada pelos scripts do lote, numa partida em modo
// único (mana cobrada), com o texto oficial de .listas/oficiais-listas.json (Oracle do Forge, consulta de 12/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, mesa, comMana, tudo, fichas, criatura, CARTAS } from './trilha-listas.mjs';

criatura('Urso de Teste', 2, 2); criatura('Sliver de Teste', 1, 1, { subtipo: 'Sliver' });
CARTAS['Unbounded Potential'].keywords = ['Entwine']; CARTAS['Molten Gatekeeper'].keywords = ['Unearth'];
const conjura = (s, oid, mana, f = () => true) => { const a = legais(comMana(s, mana), 0, x => x.t === 'cast' && x.oid === oid && f(x)); if (!a.length) throw new Error('não ofereceu'); return tudo(act(comMana(s, mana), a[0])); };
const pt = (s, oid) => [E.stats(s, s.objects[oid]).power, E.stats(s, s.objects[oid]).toughness];

test('L-4 · Unbounded Potential: "Put a +1/+1 counter on each of up to two target creatures" (alvos diferentes, de qualquer jogador, até nenhum) ou "Proliferate"; entrelaçar {3}{W} faz os dois', () => {
  let s = mesa(['Unbounded Potential', 'Urso de Teste'], ['Urso de Teste']), up, meu, deles; [s, up] = poe(s, 0, 'Unbounded Potential', 'hand'); [s, meu] = poe(s, 0, 'Urso de Teste'); [s, deles] = poe(s, 1, 'Urso de Teste');
  const of = legais(comMana(s, 'WW'), 0, a => a.t === 'cast' && a.oid === up && a.mode === 0);
  assert.ok(of.some(a => a.targets.filter(t => t && t.oid != null).length === 2 && a.targets[0].oid !== a.targets[1].oid), 'duas criaturas diferentes');
  assert.ok(!of.some(a => a.targets.length === 2 && a.targets[0].oid != null && a.targets[0].oid === a.targets[1].oid), 'a mesma criatura não serve duas vezes (115.3)');
  let r = tudo(act(comMana(s, 'WW'), of.find(a => a.targets.some(t => t && t.oid === meu) && a.targets.some(t => t && t.oid === deles))));
  assert.equal(r.objects[meu].counters.p1p1, 1); assert.equal(r.objects[deles].counters.p1p1, 1);
  const nenhum = of.find(a => a.targets.every(t => !t || t.oid == null)); assert.ok(nenhum, '"up to two": também sem alvo nenhum');
});

test('L-4 · Unbounded Potential: proliferar dá mais um marcador do mesmo tipo; com entrelaçar, os dois modos', () => {
  let s = mesa(['Unbounded Potential', 'Urso de Teste']), up, meu; [s, up] = poe(s, 0, 'Unbounded Potential', 'hand'); [s, meu] = poe(s, 0, 'Urso de Teste', 'battlefield', { counters: { p1p1: 1 } });
  const escolhe = x => legais(x, x.pending.p, a => a.oid === meu)[0] || legais(x, x.pending.p, a => /done|fim|conclui/.test(a.t))[0] || legais(x, x.pending.p)[0];
  let r = tudo(act(comMana(s, 'WW'), legais(comMana(s, 'WW'), 0, a => a.t === 'cast' && a.oid === up && a.mode === 1)[0]), escolhe);
  assert.equal(r.objects[meu].counters.p1p1, 2, 'proliferou');
  const modos = s.facts['Unbounded Potential'].script.modes, ie = modos.findIndex(m => m.entrelacarK);
  assert.ok(ie >= 0, 'o modo "todos os modos" do entrelaçar (702.42a)');
  assert.equal(legais(comMana(s, 'WW'), 0, a => a.t === 'cast' && a.oid === up && a.mode === ie).length, 0, 'sem {3}{W} a mais, não entrelaça');
  const ent = legais(comMana(s, 'WWWWWW'), 0, a => a.t === 'cast' && a.oid === up && a.mode === ie && a.targets.some(t => t && t.oid === meu));
  assert.ok(ent.length > 0, 'entrelaçar oferecido com {1}{W} + {3}{W}');
  r = tudo(act(comMana(s, 'WWWWWW'), ent[0]), escolhe); assert.equal(r.objects[meu].counters.p1p1, 3, 'marcador do primeiro modo e mais um do proliferar');
});

test('L-4 · Molten Gatekeeper: outra criatura sua entra → 1 de dano em cada oponente; "Unearth {R}" volta do cemitério com ímpeto e é exilado no fim do turno', () => {
  let s = mesa(['Molten Gatekeeper', 'Urso de Teste'], ['Urso de Teste']), mg, urso; [s, mg] = poe(s, 0, 'Molten Gatekeeper'); [s, urso] = poe(s, 0, 'Urso de Teste', 'hand');
  let r = conjura(s, urso, 'G'); assert.equal(r.players[1].life, 19, 'criatura sua entrou');
  let o; [r, o] = poe(r, 1, 'Urso de Teste', 'battlefield'); assert.equal(r.players[1].life, 19);
  let g = J(s); g.zones[0].battlefield.splice(g.zones[0].battlefield.indexOf(mg), 1); g.zones[0].graveyard.push(mg); g.objects[mg].zone = 'graveyard';
  const de = legais(comMana(g, 'R'), 0, a => a.oid === mg && (a.t === 'unearth' || a.unearth || a.desenterrar));
  assert.ok(de.length > 0, 'desenterrar oferecido');
  let t = tudo(act(comMana(g, 'R'), de[0])); assert.equal(t.objects[mg].zone, 'battlefield'); assert.ok(E.hasKeyword(t, t.objects[mg], 'haste'));
  t = passaAte(t, x => x.turn.active === 1, 120); assert.equal(t.objects[mg].zone, 'exile', 'exilado no início do próximo passo final');
});

test('L-4 · Survivors\' Encampment: "{T}: Add {C}." e "{T}, Tap an untapped creature you control: Add one mana of any color." (a criatura recém-chegada serve)', () => {
  let s = mesa(["Survivors' Encampment", 'Urso de Teste']), se, urso; [s, se] = poe(s, 0, "Survivors' Encampment"); [s, urso] = poe(s, 0, 'Urso de Teste', 'battlefield', { sick: true });
  assert.ok(E.productions(s, s.objects[se]).some(x => x.join('') === 'C'));
  const hab = legais(s, 0, a => a.t === 'activate' && a.oid === se && a.color);
  assert.deepEqual([...new Set(hab.map(a => a.color))].sort(), ['B', 'G', 'R', 'U', 'W'], 'qualquer cor');
  const r = act(s, hab.find(a => a.color === 'G')); assert.equal(r.players[0].pool.G, 1); assert.equal(r.objects[urso].tapped, true); assert.equal(r.objects[se].tapped, true);
  const sem = J(s); sem.objects[urso].tapped = true; assert.equal(legais(sem, 0, a => a.t === 'activate' && a.oid === se && a.color).length, 0, 'sem criatura desvirada, só o {C}');
});

test('L-4 · Well-Worn Spatula: ao entrar, ganha 2; equipada +1/+1; "Equip {1}"', () => {
  let s = mesa(['Well-Worn Spatula', 'Urso de Teste']), sp, urso; [s, sp] = poe(s, 0, 'Well-Worn Spatula', 'hand'); [s, urso] = poe(s, 0, 'Urso de Teste');
  let r = conjura(s, sp, 'C'); assert.equal(r.players[0].life, 22);
  const eq = legais(comMana(r, 'C'), 0, a => a.t === 'activate' && a.oid === sp && (a.targets || [])[0] && a.targets[0].oid === urso);
  assert.ok(eq.length); r = tudo(act(comMana(r, 'C'), eq[0])); assert.equal(r.objects[sp].attachedTo, urso); assert.deepEqual(pt(r, urso), [3, 3]);
});

test('L-4 · Slivers: "All Sliver creatures" (Muscle +1/+1, Plated +0/+1, Sinew +1/+1, Sidewinder flanqueamento) valem para os dois lados; "Sliver creatures you control" (Predatory +1/+1, Sentinel vigilância) só para os seus', () => {
  const caso = (nome, esperaMeu, esperaDeles, palavra) => {
    let s = mesa([nome, 'Sliver de Teste'], ['Sliver de Teste']), lorde, meu, deles; [s, lorde] = poe(s, 0, nome); [s, meu] = poe(s, 0, 'Sliver de Teste'); [s, deles] = poe(s, 1, 'Sliver de Teste');
    if (palavra) { assert.equal(E.hasKeyword(s, s.objects[meu], palavra), esperaMeu, `${nome}: o seu`); assert.equal(E.hasKeyword(s, s.objects[deles], palavra), esperaDeles, `${nome}: o do oponente`); assert.equal(E.hasKeyword(s, s.objects[lorde], palavra), true, `${nome}: ele mesmo é Sliver`); return; }
    assert.deepEqual(pt(s, meu), esperaMeu, `${nome}: o seu`); assert.deepEqual(pt(s, deles), esperaDeles, `${nome}: o do oponente`);
  };
  caso('Muscle Sliver', [2, 2], [2, 2]); caso('Plated Sliver', [1, 2], [1, 2]); caso('Sinew Sliver', [2, 2], [2, 2]); caso('Predatory Sliver', [2, 2], [1, 1]);
  caso('Sentinel Sliver', true, false, 'vigilance'); caso('Sidewinder Sliver', true, true, 'flanking');
  let s = mesa(['Muscle Sliver', 'Urso de Teste']), ms, urso; [s, ms] = poe(s, 0, 'Muscle Sliver'); [s, urso] = poe(s, 0, 'Urso de Teste');
  assert.deepEqual(pt(s, ms), [2, 2], 'conta ele mesmo'); assert.deepEqual(pt(s, urso), [2, 2], 'quem não é Sliver não ganha');
});

test('L-4 · Thermo-Alchemist: "{T}: deals 1 damage to each opponent" e desvira quando você conjura instantânea ou feitiço', () => {
  let s = mesa(['Thermo-Alchemist', 'Thrill of Possibility', 'Urso de Teste']), ta, th, urso; [s, ta] = poe(s, 0, 'Thermo-Alchemist'); [s, th] = poe(s, 0, 'Thrill of Possibility', 'hand'); [s, urso] = poe(s, 0, 'Urso de Teste', 'hand');
  let r = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ta)[0])); assert.equal(r.players[1].life, 19); assert.equal(r.objects[ta].tapped, true);
  let c = conjura(r, urso, 'G'); assert.equal(c.objects[ta].tapped, true, 'criatura não desvira');
  c = conjura(r, th, 'RR'); assert.equal(c.objects[ta].tapped, false, 'instantânea desvira');
});

test('L-4 · Thrill of Possibility: descartar é custo adicional; compra duas', () => {
  let s = mesa(['Thrill of Possibility']), th; [s, th] = poe(s, 0, 'Thrill of Possibility', 'hand');
  const mao = s.zones[0].hand.length; const r = conjura(s, th, 'RR');
  assert.equal(r.zones[0].hand.length, mao - 2 + 2); assert.equal(r.zones[0].graveyard.length, 2, 'a mágica e a descartada');
  const so = J(s); so.zones[0].hand = [th]; assert.equal(legais(comMana(so, 'RR'), 0, a => a.t === 'cast' && a.oid === th).length, 0, 'sem carta para descartar, não conjura');
});

test('L-4 · Stickytongue Sentinel: "return up to one other target permanent you control to its owner\'s hand" — outra, sua, qualquer permanente, ou nenhuma', () => {
  let s = mesa(['Stickytongue Sentinel', 'Urso de Teste'], ['Urso de Teste']), st, meu, deles, terra; [s, st] = poe(s, 0, 'Stickytongue Sentinel', 'hand'); [s, meu] = poe(s, 0, 'Urso de Teste'); [s, deles] = poe(s, 1, 'Urso de Teste'); [s, terra] = poe(s, 0, 'Forest');
  let r = passaAte(act(comMana(s, 'GGG'), legais(comMana(s, 'GGG'), 0, a => a.t === 'cast' && a.oid === st)[0]), x => !!x.pending);
  const ops = r.pending.options.filter(o => o && o.oid != null).map(o => o.oid);
  assert.ok(ops.includes(meu) && ops.includes(terra), 'criatura ou terreno seu'); assert.ok(!ops.includes(deles) && !ops.includes(st), 'nem do oponente, nem ela mesma');
  const v = tudo(r, x => x.pending.kind === 'pick_target' ? { t: 'pick_target', p: x.pending.p, index: x.pending.options.findIndex(o => o && o.oid === terra) } : legais(x, x.pending.p)[0]);
  assert.equal(v.objects[terra].zone, 'hand');
  const n = tudo(r, x => x.pending.kind === 'pick_target' ? { t: 'pick_target', p: x.pending.p, nenhum: true } : legais(x, x.pending.p)[0]);
  assert.equal(n.objects[meu].zone, 'battlefield'); assert.equal(n.objects[terra].zone, 'battlefield');
});

test('L-4 · Patient Instructor: ao entrar, recrutar — compra, descarta; descartou não terreno → ficha Human Soldier 1/1 branca', () => {
  let s = mesa(['Patient Instructor', 'Urso de Teste']), pi; [s, pi] = poe(s, 0, 'Patient Instructor', 'hand');
  const descarta = filtro => x => x.pending.kind === 'discard' ? { t: 'discard', p: 0, oid: x.zones[0].hand.find(o => filtro(x.facts[x.objects[o].name].typeText || '')) || x.zones[0].hand[0] } : legais(x, x.pending.p)[0];
  const naoTerra = tudo(act(comMana(s, 'WWWW'), legais(comMana(s, 'WWWW'), 0, a => a.t === 'cast' && a.oid === pi)[0]), descarta(t => !/Land/.test(t)));
  assert.equal(fichas(naoTerra, 0, 'Human Soldier').length, 1);
  const terra = tudo(act(comMana(s, 'WWWW'), legais(comMana(s, 'WWWW'), 0, a => a.t === 'cast' && a.oid === pi)[0]), descarta(t => /Land/.test(t)));
  assert.equal(fichas(terra, 0, 'Human Soldier').length, 0, 'descartou terreno: sem ficha');
});
