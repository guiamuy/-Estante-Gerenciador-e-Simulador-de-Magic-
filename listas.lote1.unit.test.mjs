// L-1 · trilha listas · Pauper de M a Z, lote 1: teste de regra de cada mecânica tocada pelos scripts do lote, numa partida em modo
// único (mana cobrada), com o texto oficial de .listas/oficiais-listas.json (Oracle do Forge, consulta de 12/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, mesa, comMana, tudo, fichas } from './trilha-listas.mjs';

test('L-1 · Mukotai Ambusher: "Ninjutsu {1}{B}" troca um atacante sem bloqueio e ela entra virada e atacando; "Lifelink" ganha vida no dano de combate', () => {
  let s = mesa(['Mukotai Ambusher', 'Urso de Teste']), urso, nin; [s, urso] = poe(s, 0, 'Urso de Teste'); [s, nin] = poe(s, 0, 'Mukotai Ambusher', 'hand');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [urso] });
  s = passaAte(s, x => x.turn.step === 'combat_blockers' || (x.pending && x.pending.kind === 'blockers'));
  if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
  s = passaAte(s, x => x.turn.step === 'combat_blockers' && !x.pending && x.turn.priority === 0, 20); // prioridade no passo de bloqueadores, antes do dano (702.49a)
  assert.equal(legais(s, 0, a => a.t === 'ninjutsu' && a.oid === nin).length, 0, 'sem {1}{B}, não há ninjutsu');
  const r = comMana(s, 'BB'), oferta = legais(r, 0, a => a.t === 'ninjutsu' && a.oid === nin && a.attacker === urso);
  assert.equal(oferta.length > 0, true, 'com {1}{B} e o urso sem bloqueio, o ninjutsu é oferecido');
  let t = tudo(act(r, oferta[0]));
  assert.equal(t.objects[urso].zone, 'hand', 'o atacante volta para a mão');
  assert.equal(t.objects[nin].zone, 'battlefield'); assert.equal(t.objects[nin].tapped, true, 'entra virada'); assert.ok(t.objects[nin].attacking != null, 'e atacando');
  const vida = [t.players[0].life, t.players[1].life];
  t = passaAte(t, x => x.turn.step === 'combat_end' || x.turn.step === 'main2', 40);
  assert.deepEqual([t.players[0].life - vida[0], t.players[1].life - vida[1]], [3, -3], '3 de dano de combate e +3 de vida (vínculo com a vida)');
});

test('L-1 · Toxin Analysis: "Target creature gains deathtouch and lifelink until end of turn. Investigate." — qualquer criatura, até o fim do turno, e uma Pista', () => {
  let s = mesa(['Toxin Analysis'], ['Urso de Teste']), ta, deles; [s, ta] = poe(s, 0, 'Toxin Analysis', 'hand'); [s, deles] = poe(s, 1, 'Urso de Teste');
  const alvos = legais(comMana(s, 'B'), 0, a => a.t === 'cast' && a.oid === ta).map(a => a.targets[0].oid);
  assert.ok(alvos.includes(deles), 'mira também a criatura do oponente ("target creature")');
  const r = tudo(act(comMana(s, 'B'), legais(comMana(s, 'B'), 0, a => a.t === 'cast' && a.oid === ta && a.targets[0].oid === deles)[0]));
  assert.ok(E.hasKeyword(r, r.objects[deles], 'deathtouch') && E.hasKeyword(r, r.objects[deles], 'lifelink'), 'toque mortífero e vínculo com a vida');
  assert.equal(fichas(r, 0, 'Clue').length, 1, 'investigou: uma Pista de quem conjurou');
  const depois = passaAte(r, x => x.turn.active === 1 && x.turn.step === 'main1', 80);
  assert.ok(!E.hasKeyword(depois, depois.objects[deles], 'deathtouch') && !E.hasKeyword(depois, depois.objects[deles], 'lifelink'), 'acaba no fim do turno');
});

test('L-1 · Ramosian Rally: "If you control a Plains, you may tap an untapped creature you control rather than pay this spell\'s mana cost." — só com Planície; criatura recém-chegada serve; +1/+1 só nas suas', () => {
  let s = mesa(['Ramosian Rally', 'Urso de Teste'], ['Urso de Teste']), rr, meu, deles; [s, rr] = poe(s, 0, 'Ramosian Rally', 'hand'); [s, meu] = poe(s, 0, 'Urso de Teste', 'battlefield', { sick: true }); [s, deles] = poe(s, 1, 'Urso de Teste');
  const alt = x => legais(x, 0, a => a.t === 'cast' && a.oid === rr && a.alt === 0);
  assert.equal(alt(s).length, 0, 'sem Planície, o custo alternativo não existe');
  [s] = poe(s, 0, 'Plains', 'battlefield', { tapped: true });
  const oferta = alt(s); assert.ok(oferta.length > 0, 'com uma Planície (mesmo virada), virar uma criatura paga a mágica');
  const r = tudo(act(s, oferta[0]));
  assert.equal(r.objects[meu].tapped, true, 'a criatura recém-chegada virou para pagar (o enjoo só prende o {T} dela mesma)');
  assert.deepEqual([E.stats(r, r.objects[meu]).power, E.stats(r, r.objects[meu]).toughness], [3, 3], '"Creatures you control get +1/+1"');
  assert.deepEqual([E.stats(r, r.objects[deles]).power, E.stats(r, r.objects[deles]).toughness], [2, 2], 'a do oponente não');
});

test('L-1 · Sandstone Needle: entra virada com dois marcadores de esgotamento; cada {T} tira um e dá {R}{R}; sem marcador, é sacrificada', () => {
  let s = mesa(['Sandstone Needle']), ag; [s, ag] = poe(s, 0, 'Sandstone Needle', 'hand');
  s = tudo(act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === ag)[0]));
  assert.equal(s.objects[ag].tapped, true, '"enters tapped"'); assert.equal(s.objects[ag].counters.depletion, 2, '"with two depletion counters"');
  s = J(s); s.objects[ag].tapped = false;
  let r = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ag)[0]);
  assert.equal(r.players[0].pool.R, 2, 'Add {R}{R}'); assert.equal(r.objects[ag].counters.depletion, 1); assert.equal(r.objects[ag].zone, 'battlefield', 'ainda tem marcador: fica');
  r = J(r); r.objects[ag].tapped = false;
  r = tudo(act(r, legais(r, 0, a => a.t === 'activate' && a.oid === ag)[0]));
  assert.equal(r.players[0].pool.R, 4); assert.equal(r.objects[ag].zone, 'graveyard', 'sem marcador de esgotamento: sacrificada');
});

test('L-1 · Rally at the Hornburg: duas fichas Human Soldier 1/1 brancas; "Humans you control gain haste until end of turn" — só Humanos, só os seus', () => {
  let s = mesa(['Rally at the Hornburg', 'Humano de Teste', 'Urso de Teste'], ['Humano de Teste']), ra, hum, urso, deles;
  [s, ra] = poe(s, 0, 'Rally at the Hornburg', 'hand'); [s, hum] = poe(s, 0, 'Humano de Teste', 'battlefield', { sick: true }); [s, urso] = poe(s, 0, 'Urso de Teste', 'battlefield', { sick: true }); [s, deles] = poe(s, 1, 'Humano de Teste');
  const r = tudo(act(comMana(s, 'RR'), legais(comMana(s, 'RR'), 0, a => a.t === 'cast' && a.oid === ra)[0]));
  const fs = fichas(r, 0, 'Human Soldier'); assert.equal(fs.length, 2);
  assert.deepEqual([...r.facts['Human Soldier'].colors], ['W']); assert.match(r.facts['Human Soldier'].typeText, /Human Soldier/);
  for (const f of fs) assert.deepEqual([E.stats(r, f).power, E.stats(r, f).toughness], [1, 1]);
  for (const o of [...fs, r.objects[hum]]) assert.ok(E.hasKeyword(r, o, 'haste'), 'Humano seu tem ímpeto');
  assert.ok(!E.hasKeyword(r, r.objects[urso], 'haste'), 'o Urso não é Humano'); assert.ok(!E.hasKeyword(r, r.objects[deles], 'haste'), 'o Humano do oponente não');
  const atk = passaAte(r, x => x.pending && x.pending.kind === 'attackers');
  const pode = E.legalActions(atk, 0).filter(a => a.t === 'attack').flatMap(a => a.attackers || []);
  assert.ok(fs.every(f => pode.includes(f.oid)), 'as fichas que acabaram de entrar podem atacar');
});

test('L-1 · Skred: "deals damage to target creature equal to the number of snow permanents you control" — conta só as suas permanentes da neve', () => {
  let s = mesa(['Skred', 'Snow-Covered Mountain'], ['Urso de Teste', 'Snow-Covered Island']), sk, deles;
  [s, sk] = poe(s, 0, 'Skred', 'hand'); [s, deles] = poe(s, 1, 'Urso de Teste');
  [s] = poe(s, 0, 'Snow-Covered Mountain'); [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 1, 'Snow-Covered Island'); [s] = poe(s, 1, 'Snow-Covered Island');
  const cast = x => tudo(act(comMana(x, 'R'), legais(comMana(x, 'R'), 0, a => a.t === 'cast' && a.oid === sk && a.targets[0].oid === deles)[0]));
  let r = cast(s); assert.equal(r.objects[deles].damage, 1, 'uma permanente da neve sua (a Montanha comum e as do oponente não contam)');
  [s] = poe(s, 0, 'Snow-Covered Mountain'); r = cast(s);
  assert.equal(r.objects[deles].zone, 'graveyard', 'duas: 2 de dano no 2/2');
});

test('L-1 · Wild Growth: "Whenever enchanted land is tapped for mana, its controller adds an additional {G}" — para quem controla o terreno', () => {
  let s = mesa(['Wild Growth', 'Island']), wg, ilha; [s, wg] = poe(s, 0, 'Wild Growth', 'hand'); [s, ilha] = poe(s, 0, 'Island');
  assert.deepEqual(E.productions(s, s.objects[ilha]).map(x => x.join('')), ['U']);
  s = tudo(act(comMana(s, 'G'), legais(comMana(s, 'G'), 0, a => a.t === 'cast' && a.oid === wg && (a.targets || [])[0] && a.targets[0].oid === ilha)[0]));
  assert.equal(s.objects[wg].attachedTo, ilha); assert.deepEqual(E.productions(s, s.objects[ilha]).map(x => x.join('')), ['UG'], 'a Ilha encantada dá {U}{G}');
  let t = mesa(['Wild Growth'], ['Island']), w2, ilhaDeles; [t, w2] = poe(t, 0, 'Wild Growth', 'hand'); [t, ilhaDeles] = poe(t, 1, 'Island');
  t = tudo(act(comMana(t, 'G'), legais(comMana(t, 'G'), 0, a => a.t === 'cast' && a.oid === w2 && (a.targets || [])[0] && a.targets[0].oid === ilhaDeles)[0]));
  assert.deepEqual(E.productions(t, t.objects[ilhaDeles]).map(x => x.join('')), ['UG'], '"Enchant land": o terreno do oponente também; o {G} a mais vai para quem o vira');
});

test('L-1 · Sazacap\'s Brew: descartar é custo adicional; sem presente, o jogador alvo compra duas; prometendo o Peixe, o oponente cria um Peixe 1/1 azul virado antes e uma criatura sua alvo ganha +2/+0', () => {
  let s = mesa(["Sazacap's Brew", 'Urso de Teste']), br, urso; [s, br] = poe(s, 0, "Sazacap's Brew", 'hand'); [s, urso] = poe(s, 0, 'Urso de Teste');
  s = J(s); while (s.zones[0].hand.length > 2) { const x = s.zones[0].hand.find(o => o !== br); s.zones[0].hand.splice(s.zones[0].hand.indexOf(x), 1); s.zones[0].library.push(x); s.objects[x].zone = 'library'; }
  const ofertas = x => legais(comMana(x, 'RR'), 0, a => a.t === 'cast' && a.oid === br);
  const so = J(s); { const x = so.zones[0].hand.find(o => o !== br); so.zones[0].hand.splice(so.zones[0].hand.indexOf(x), 1); so.zones[0].library.push(x); so.objects[x].zone = 'library'; }
  assert.equal(ofertas(so).length, 0, 'sem outra carta para descartar, não se conjura ("As an additional cost … discard a card")');
  const sem = ofertas(s).find(a => a.mode === 0 && a.targets.length === 1 && a.targets[0].player === 1);
  assert.ok(sem, 'sem presente: só o jogador alvo (qualquer jogador)');
  let r = tudo(act(comMana(s, 'RR'), sem));
  assert.equal(r.zones[1].hand.length - s.zones[1].hand.length, 2, 'o oponente alvo comprou duas');
  assert.equal(r.zones[0].graveyard.length - s.zones[0].graveyard.length, 2, 'a mágica e a carta descartada');
  assert.equal(fichas(r, 1, 'Fish').length, 0);
  const modos = s.facts["Sazacap's Brew"].script.modes, aB = modos.findIndex(m => m.presenteK === 1);
  assert.equal(ofertas(s).filter(a => modos[a.mode].presenteK === 0).length, 0, 'o presente é para um oponente (702.174)');
  const com = ofertas(s).find(a => a.mode === aB && a.targets.length === 2 && a.targets[0].player === 0 && a.targets[1].oid === urso);
  assert.ok(com, 'prometendo o presente: jogador alvo e uma criatura sua alvo');
  assert.ok(ofertas(s).filter(a => a.mode === aB).every(a => s.objects[a.targets[1].oid].controller === 0), '"target creature you control"');
  r = tudo(act(comMana(s, 'RR'), com));
  const [peixe] = fichas(r, 1, 'Fish'); assert.ok(peixe, 'o oponente cria o Peixe'); assert.equal(peixe.tapped, true, 'virado'); assert.deepEqual([...r.facts.Fish.colors], ['U']);
  assert.deepEqual([E.stats(r, r.objects[urso]).power, E.stats(r, r.objects[urso]).toughness], [4, 2], '+2/+0');
  assert.equal(r.zones[0].hand.length, s.zones[0].hand.length - 2 + 2, 'você comprou duas (−a mágica, −o descarte)');
});

test('L-1 · Unfathomable Truths: "Devoid / Draw three cards and create a 0/1 colorless Eldrazi Spawn creature token with "Sacrifice this creature: Add {C}.""', () => {
  let s = mesa(['Unfathomable Truths']), ut; [s, ut] = poe(s, 0, 'Unfathomable Truths', 'hand');
  const mao = s.zones[0].hand.length;
  const r = tudo(act(comMana(s, 'UUUUU'), legais(comMana(s, 'UUUUU'), 0, a => a.t === 'cast' && a.oid === ut)[0]));
  assert.equal(r.zones[0].hand.length, mao - 1 + 3, 'compra três');
  const [cria] = fichas(r, 0, 'Eldrazi Spawn'); assert.ok(cria);
  assert.deepEqual([E.stats(r, cria).power, E.stats(r, cria).toughness], [0, 1]); assert.deepEqual([...r.facts['Eldrazi Spawn'].colors], [], 'incolor');
  const sac = legais(r, 0, a => a.t === 'activate' && a.oid === cria.oid); assert.ok(sac.length > 0, 'sacrificar dá {C}');
  const m = act(r, sac[0]); assert.equal(m.players[0].pool.C, 1); assert.ok(!m.objects[cria.oid] || m.objects[cria.oid].zone !== 'battlefield', 'a ficha foi sacrificada');
});

test('L-1 · Wild Growth numa terra de esgotamento: "{T}, Remove a depletion counter: Add {R}{R}" também é "tapped for mana" → {R}{R}{G} (106.12a)', () => {
  let t = mesa(['Wild Growth', 'Sandstone Needle']); let w2, nd; [t, w2] = poe(t, 0, 'Wild Growth', 'hand'); [t, nd] = poe(t, 0, 'Sandstone Needle', 'battlefield', { counters: { depletion: 2 } });
  t = tudo(act(comMana(t, 'G'), legais(comMana(t, 'G'), 0, a => a.t === 'cast' && a.oid === w2 && a.targets && a.targets[0].oid === nd)[0]));
  t = J(t); for (const k in t.players[0].pool) t.players[0].pool[k] = 0;
  const q = act(t, legais(t, 0, a => a.t === 'activate' && a.oid === nd)[0]);
  assert.deepEqual([q.players[0].pool.R, q.players[0].pool.G], [2, 1]);
});
