// Camada 1c · matriz de palavras-chave: cada palavra-chave que o motor declara
// resolver precisa mudar o resultado de uma partida. A cobertura das listas conta
// como "completa" toda carta cujo texto é só palavra-chave — se uma delas não
// fizer nada no combate, a lista joga errado em silêncio. O teste final exige que
// TODA palavra-chave da lista do motor tenha cenário aqui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { engine: E, scripts: S } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const act = (s, a) => E.apply(s, a).state;

const cre = (name, power, toughness, keywords = [], extra = {}) => ({
  name, type_line: 'Creature — Soldier', mana_cost: '{1}', cmc: 1, colors: ['W'],
  power: String(power), toughness: String(toughness), keywords, oracle_text: keywords.join(', '), ...extra });
const CARDS = {
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '{T}: Add {W}.' },
  Urso: cre('Urso', 2, 2),
  Voadora: cre('Voadora', 2, 2, ['Flying']),
  Alcance: cre('Alcance', 1, 3, ['Reach']),
  Atropela: cre('Atropela', 4, 4, ['Trample']),
  Mortal: cre('Mortal', 1, 1, ['Deathtouch']),
  Vampira: cre('Vampira', 2, 2, ['Lifelink']),
  Vigia: cre('Vigia', 2, 2, ['Vigilance']),
  Rápida: cre('Rápida', 2, 2, ['Haste']),
  Primeira: cre('Primeira', 2, 2, ['First strike']),
  Dupla: cre('Dupla', 2, 2, ['Double strike']),
  Ameaça: cre('Ameaça', 3, 3, ['Menace']),
  Muro: cre('Muro', 0, 4, ['Defender']),
  Eterna: cre('Eterna', 2, 2, ['Indestructible']),
  Relâmpago: cre('Relâmpago', 2, 2, ['Flash']),
  Ilusa: cre('Ilusa', 2, 2, ['Hexproof']),
  Velada: cre('Velada', 2, 2, ['Shroud']),
  Choque: { name: 'Choque', type_line: 'Instant', mana_cost: '{R}', cmc: 1, colors: ['R'], keywords: [], oracle_text: 'Choque deals 2 damage to any target.' },
  Matar: { name: 'Matar', type_line: 'Instant', mana_cost: '{B}', cmc: 1, colors: ['B'], keywords: [], oracle_text: 'Destroy target creature.' }
};
const SCRIPTS = {
  Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: 18 } } },
  Matar: { name: 'Matar', effects: [{ do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } }
};
const DECK = Object.keys(CARDS).filter(n => n !== 'Plains').map(name => ({ name, qty: 4, zone: 'main' }))
  .concat([{ name: 'Plains', qty: 20, zone: 'main' }]);

function jogo(seed = 5) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: CARDS, scripts: SCRIPTS,
    players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  return s;
}
/** Põe a carta no campo (ou na mão) do jogador, direto pelo estado. */
function poe(s, p, nome, { zone = 'battlefield', sick = false, tapped = false } = {}) {
  s = J(s);
  const oid = ['library', 'hand'].map(z => s.zones[p][z]).flat().find(o => s.objects[o].name === nome);
  if (!oid) throw new Error('não achei ' + nome);
  const de = s.zones[p][s.objects[oid].zone];
  de.splice(de.indexOf(oid), 1);
  s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick, tapped });
  return [s, oid];
}
const passaAte = (s, passo) => { for (let i = 0; i < 60 && s.turn.step !== passo; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
/** Ataca com os atacantes e bloqueia com os pares dados; devolve o estado depois do dano. */
function combate(s, atacantes, blocos = []) {
  const a = s.turn.active, d = 1 - a;
  s = passaAte(s, 'combat_attackers');
  s = act(s, { t: 'attack', p: a, attackers: atacantes });
  // a pergunta de bloqueio só chega quando o passo avança
  for (let i = 0; i < 60 && s.turn.step !== 'main2'; i++) {
    if (s.pending && s.pending.kind === 'blockers') { s = act(s, { t: 'block', p: d, blocks: blocos }); blocos = []; continue; }
    // CR2g.2 · 510.1c: com dois bloqueadores, quem ataca escolhe a divisão; a auditoria fica com a primeira opção (a ordem do bloqueio, como antes)
    if (s.pending && s.pending.kind === 'dividir_dano') { s = act(s, { t: 'dividir_dano', p: s.pending.p, index: 0 }); continue; }
    if (s.pending) break;
    s = act(s, { t: 'pass', p: s.turn.priority });
  }
  return s;
}
/** Vai até a pergunta de bloqueio, com os atacantes já declarados. */
function ateBloqueio(s, atacantes) {
  const a = s.turn.active;
  s = passaAte(s, 'combat_attackers');
  s = act(s, { t: 'attack', p: a, attackers: atacantes });
  for (let i = 0; i < 20 && !(s.pending && s.pending.kind === 'blockers'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  return s;
}
const vivo = (s, oid) => s.objects[oid].zone === 'battlefield';
const COBERTAS = new Set();
const cobre = k => { COBERTAS.add(k); return k; };

test('K1 · voar e alcance: quem não voa não bloqueia; quem tem alcance, sim', () => {
  cobre('flying'); cobre('reach');
  let s = jogo(11); const a = s.turn.active, d = 1 - a;
  let voadora, urso, alcance;
  [s, voadora] = poe(s, a, 'Voadora');
  [s, urso] = poe(s, d, 'Urso');
  [s, alcance] = poe(s, d, 'Alcance');
  assert.equal(E.canBlock(s, urso, voadora), false, 'sem voar nem alcance, não bloqueia voadora');
  assert.equal(E.canBlock(s, alcance, voadora), true, 'alcance bloqueia voadora');
  const bloqueado = combate(s, [voadora], [[alcance, voadora]]);
  assert.equal(bloqueado.players[d].life, 20, 'bloqueada, não passa dano');
  const passou = combate(s, [voadora], []);
  assert.equal(passou.players[d].life, 18, 'sem bloqueio, o dano vai ao jogador');
});

test('K2 · atropelar: o excesso passa para o jogador', () => {
  cobre('trample');
  let s = jogo(12); const a = s.turn.active, d = 1 - a;
  let atropela, muro;
  [s, atropela] = poe(s, a, 'Atropela');   // 4/4
  [s, muro] = poe(s, d, 'Urso');           // 2/2
  const r = combate(s, [atropela], [[muro, atropela]]);
  assert.equal(vivo(r, muro), false, 'o bloqueador morreu');
  assert.equal(r.players[d].life, 18, 'os 2 de excesso passaram');
});

test('K3 · toque mortífero mata com qualquer dano; indestrutível não morre', () => {
  cobre('deathtouch'); cobre('indestructible');
  let s = jogo(13); const a = s.turn.active, d = 1 - a;
  let mortal, grande, eterna;
  [s, mortal] = poe(s, d, 'Mortal');       // 1/1 toque mortífero, bloqueia
  [s, grande] = poe(s, a, 'Atropela');     // 4/4
  const r = combate(s, [grande], [[mortal, grande]]);
  assert.equal(vivo(r, grande), false, '1 de dano com toque mortífero mata o 4/4');
  // indestrutível aguenta o toque mortífero e a destruição
  let s2 = jogo(13); [s2, eterna] = poe(s2, a, 'Eterna'); [s2, mortal] = poe(s2, d, 'Mortal');
  const r2 = combate(s2, [eterna], [[mortal, eterna]]);
  assert.equal(vivo(r2, eterna), true, 'indestrutível sobrevive ao toque mortífero');
  let s3 = jogo(14); let matar;
  [s3, eterna] = poe(s3, s3.turn.active, 'Eterna');
  [s3, matar] = poe(s3, s3.turn.active, 'Matar', { zone: 'hand' });
  s3 = act(s3, { t: 'cast', p: s3.turn.active, oid: matar, targets: [{ oid: eterna }] });
  s3 = act(s3, { t: 'pass', p: s3.turn.priority }); s3 = act(s3, { t: 'pass', p: s3.turn.priority });
  assert.equal(vivo(s3, eterna), true, 'indestrutível não é destruída');
});

test('K4 · vínculo com a vida dá vida a quem causou o dano', () => {
  cobre('lifelink');
  let s = jogo(15); const a = s.turn.active;
  let vampira; [s, vampira] = poe(s, a, 'Vampira');
  const r = combate(s, [vampira], []);
  assert.equal(r.players[a].life, 22, 'ganhei 2 de vida com o dano');
});

test('K5 · vigilância não vira ao atacar; sem ela, vira', () => {
  cobre('vigilance');
  let s = jogo(16); const a = s.turn.active;
  let vigia, urso;
  [s, vigia] = poe(s, a, 'Vigia'); [s, urso] = poe(s, a, 'Urso');
  const r = combate(s, [vigia, urso], []);
  assert.equal(r.objects[vigia].tapped, false, 'com vigilância, não virou');
  assert.equal(r.objects[urso].tapped, true, 'sem vigilância, virou');
});

test('K6 · pressa ataca no turno em que entra; sem ela, não', () => {
  cobre('haste');
  let s = jogo(17); const a = s.turn.active;
  let rapida, urso;
  [s, rapida] = poe(s, a, 'Rápida', { sick: true });
  [s, urso] = poe(s, a, 'Urso', { sick: true });
  s = passaAte(s, 'combat_attackers');
  const podem = E.eligibleAttackers(s, a);
  assert.equal(podem.includes(rapida), true, 'com pressa, ataca');
  assert.equal(podem.includes(urso), false, 'sem pressa, não ataca');
});

test('K7 · iniciativa mata antes de levar o troco; golpe duplo bate duas vezes', () => {
  cobre('first strike'); cobre('double strike');
  let s = jogo(18); const a = s.turn.active, d = 1 - a;
  let primeira, urso;
  [s, primeira] = poe(s, a, 'Primeira');   // 2/2 iniciativa
  [s, urso] = poe(s, d, 'Urso');           // 2/2
  const r = combate(s, [primeira], [[urso, primeira]]);
  assert.equal(vivo(r, urso), false, 'o 2/2 comum morreu na iniciativa');
  assert.equal(vivo(r, primeira), true, 'e não levou o troco');
  // golpe duplo contra um 4/4: bate 2 na iniciativa e 2 no dano normal
  let s2 = jogo(19); let dupla, grande;
  const a2 = s2.turn.active, d2 = 1 - a2; // outra semente, outro jogador ativo
  [s2, dupla] = poe(s2, a2, 'Dupla'); [s2, grande] = poe(s2, d2, 'Atropela'); // 4/4
  const r2 = combate(s2, [dupla], [[grande, dupla]]);
  assert.equal(vivo(r2, grande), false, 'os dois golpes somam 4 e matam o 4/4');
});

test('K8 · ameaça pede dois bloqueadores', () => {
  cobre('menace');
  let s = jogo(20); const a = s.turn.active, d = 1 - a;
  let ameaca, u1, u2;
  [s, ameaca] = poe(s, a, 'Ameaça');
  [s, u1] = poe(s, d, 'Urso'); [s, u2] = poe(s, d, 'Urso');
  s = ateBloqueio(s, [ameaca]);
  assert.throws(() => act(s, { t: 'block', p: d, blocks: [[u1, ameaca]] }), /./, 'um bloqueador só é recusado');
  const dois = act(s, { t: 'block', p: d, blocks: [[u1, ameaca], [u2, ameaca]] });
  assert.equal(dois.combat.attackers.includes(ameaca), true, 'com dois, o bloqueio vale');
});

test('K9 · defensor não ataca', () => {
  cobre('defender');
  let s = jogo(21); const a = s.turn.active;
  let muro; [s, muro] = poe(s, a, 'Muro');
  s = passaAte(s, 'combat_attackers');
  assert.equal(E.eligibleAttackers(s, a).includes(muro), false, 'defensor fica em casa');
});

test('K10 · lampejo: conjura fora da sua fase principal', () => {
  cobre('flash');
  let s = jogo(22); const a = s.turn.active, d = 1 - a;
  let rel, urso;
  [s, rel] = poe(s, d, 'Relâmpago', { zone: 'hand' });   // do oponente, no meu turno
  [s, urso] = poe(s, d, 'Urso', { zone: 'hand' });
  s = act(s, { t: 'pass', p: a }); // passo a prioridade para o oponente
  const ops = E.legalActions(s, d);
  assert.equal(ops.some(x => x.t === 'cast' && x.oid === rel), true, 'com lampejo, dá para conjurar no turno do outro');
  assert.equal(ops.some(x => x.t === 'cast' && x.oid === urso), false, 'sem lampejo, não');
});

test('K11 · ilusão protege do oponente; véu protege de todo mundo', () => {
  cobre('hexproof'); cobre('shroud');
  let s = jogo(23); const a = s.turn.active, d = 1 - a;
  let ilusa, velada, choque;
  [s, ilusa] = poe(s, a, 'Ilusa');
  [s, velada] = poe(s, a, 'Velada');
  [s, choque] = poe(s, d, 'Choque', { zone: 'hand' });
  assert.equal(E.targetable(s, d, s.objects[ilusa]), false, 'o oponente não mira quem tem ilusão');
  assert.equal(E.targetable(s, a, s.objects[ilusa]), true, 'mas eu miro a minha');
  assert.equal(E.targetable(s, a, s.objects[velada]), false, 'véu tira até a minha mira');
  assert.equal(E.targetable(s, d, s.objects[velada]), false, 'e a do oponente também');
});

test('K12b · evasões por palavra-chave: medo, intimidar, sombra, esgueirar e as cinco travessias recusam o bloqueio errado e aceitam o certo', () => {
  const terra = n => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '' });
  const cartas = { ...CARDS, Preta: cre('Preta', 2, 2, [], { colors: ['B'] }), Golem: cre('Golem', 2, 2, [], { colors: [], type_line: 'Artifact Creature — Golem' }), Forte: cre('Forte', 3, 3),
    Medo: cre('Medo', 2, 2, ['Fear'], { colors: ['B'] }), Intimida: cre('Intimida', 2, 2, ['Intimidate'], { colors: ['R'] }), Rubra: cre('Rubra', 2, 2, [], { colors: ['R'] }),
    Sombra: cre('Sombra', 2, 2, ['Shadow']), Esgueira: cre('Esgueira', 2, 2, ['Skulk']) };
  const TERRAS = { islandwalk: 'Island', swampwalk: 'Swamp', forestwalk: 'Forest', mountainwalk: 'Mountain', plainswalk: 'Plains' };
  for (const [k, n] of Object.entries(TERRAS)) { cartas[n] = terra(n); cartas['Anda ' + n] = cre('Anda ' + n, 2, 2, [k[0].toUpperCase() + k.slice(1)]); }
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  const base = () => { let s = E.createGame({ format: 'livre', seed: 31, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
    for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
  // [palavra, atacante, quem NÃO bloqueia, quem bloqueia, terreno do defensor]
  const casos = [['fear', 'Medo', 'Urso', 'Preta'], ['fear', 'Medo', 'Urso', 'Golem'], ['intimidate', 'Intimida', 'Urso', 'Rubra'], ['intimidate', 'Intimida', 'Urso', 'Golem'],
    ['shadow', 'Sombra', 'Urso', 'Sombra'], ['skulk', 'Esgueira', 'Forte', 'Urso'], ...Object.entries(TERRAS).map(([k, n]) => [k, 'Anda ' + n, 'Urso', null, n])];
  for (const [k, atacante, naoPode, pode, terreno] of casos) {
    cobre(k);
    let s = base(); const a = s.turn.active, d = 1 - a; let atk, ruim, bom;
    [s, atk] = poe(s, a, atacante); [s, ruim] = poe(s, d, naoPode); if (pode) [s, bom] = poe(s, d, pode); if (terreno) [s] = poe(s, d, terreno);
    s = ateBloqueio(s, [atk]);
    assert.throws(() => act(s, { t: 'block', p: d, blocks: [[ruim, atk]] }), /não pode bloquear/, `${k}: ${naoPode} não bloqueia ${atacante}`);
    if (pode) assert.equal(act(s, { t: 'block', p: d, blocks: [[bom, atk]] }).objects[bom].blocking, atk, `${k}: ${pode} bloqueia ${atacante}`);
    if (terreno) { let t = base(); [t, atk] = poe(t, a, atacante); [t, ruim] = poe(t, d, naoPode); t = ateBloqueio(t, [atk]); // sem o terreno, a travessia não faz nada
      assert.equal(act(t, { t: 'block', p: d, blocks: [[ruim, atk]] }).objects[ruim].blocking, atk, `${k}: sem ${terreno} o bloqueio vale`); }
  }
  // sombra do outro lado: criatura com sombra não bloqueia quem não tem
  { let s = base(); const a = s.turn.active, d = 1 - a; let atk, sb; [s, atk] = poe(s, a, 'Urso'); [s, sb] = poe(s, d, 'Sombra'); s = ateBloqueio(s, [atk]);
    assert.throws(() => act(s, { t: 'block', p: d, blocks: [[sb, atk]] }), /sombra/); }
});

test('K12c · infectar (702.90): na criatura, o dano vira marcadores −1/−1; no jogador, vira veneno, sem perder vida; com vínculo com a vida ainda ganha', () => {
  cobre('infect');
  const cartas = { ...CARDS, Infecta: cre('Infecta', 2, 2, ['Infect']), InfectaVida: cre('InfectaVida', 2, 2, ['Infect', 'Lifelink']), Forte: cre('Forte', 3, 3) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  const base = () => { let s = E.createGame({ format: 'livre', seed: 32, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
    for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
  const fim = s => { for (let i = 0; i < 30 && s.turn.step !== 'main2' && s.turn.step !== 'end'; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };
  { let s = base(); const a = s.turn.active, d = 1 - a; let atk, bl; [s, atk] = poe(s, a, 'Infecta'); [s, bl] = poe(s, d, 'Forte');
    s = ateBloqueio(s, [atk]); s = fim(act(s, { t: 'block', p: d, blocks: [[bl, atk]] }));
    assert.equal(s.objects[bl].counters.m1m1, 2, 'o bloqueador recebeu dois marcadores −1/−1'); assert.equal(s.objects[bl].damage, 0, 'e nenhum dano marcado');
    assert.equal(E.stats(s, s.objects[bl]).power, 1, 'virou 1/1'); assert.ok(vivo(s, bl)); }
  { let s = base(); const a = s.turn.active, d = 1 - a; let atk; [s, atk] = poe(s, a, 'InfectaVida');
    s = ateBloqueio(s, [atk]); s = fim(s.pending && s.pending.kind === 'blockers' ? act(s, { t: 'block', p: d, blocks: [] }) : s);
    assert.equal(s.players[d].life, 20, 'o jogador não perde vida'); assert.equal(s.players[d].poison, 2, 'recebe dois venenos');
    assert.equal(s.players[a].life, 22, 'o vínculo com a vida conta o dano causado'); }
});

/* ↓ K · cenários da trilha keywords (CR4): cada palavra-chave que a trilha põe em KEYWORDS ganha a prova aqui */
test('K-1 · metamorfo (702.73) e desprovido (702.114): lidos da palavra-chave impressa, definem tipo e cor', () => {
  cobre('changeling'); cobre('devoid');
  const cartas = { ...CARDS, Muda: cre('Muda', 1, 1, ['Changeling'], { type_line: 'Creature — Shapeshifter' }), Eld: cre('Eld', 2, 2, ['Devoid'], { colors: ['R'], mana_cost: '{1}{R}' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 33, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  let muda, eld; [s, muda] = poe(s, 0, 'Muda'); [s, eld] = poe(s, 0, 'Eld');
  assert.equal(E.metamorfoK(s, s.objects[muda], 'Goblin'), true, 'metamorfo é Goblin'); assert.equal(E.metamorfoK(s, s.objects[muda], 'Forest'), false, 'mas não Floresta');
  assert.deepEqual(J(E.colorsOf(s, s.objects[eld])), [], 'desprovido é incolor');
});

test('K-3 · proeza (702.108): a mágica que não é criatura antes do ataque faz o atacante causar 1 a mais', () => {
  cobre('prowess');
  const cartas = { ...CARDS, Monge: cre('Monge', 1, 2, ['Prowess']) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 34, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let monge, choque; [s, monge] = poe(s, a, 'Monge'); [s, choque] = poe(s, a, 'Choque', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: choque, targets: [{ player: d }] });
  for (let i = 0; i < 6 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const r = combate(s, [monge]);
  assert.equal(r.players[d].life, 20 - 2 - 2, 'Choque 2 + Monge 1+1');
});

test('K-4 · persistir (702.79) e imortal (702.93): o bloqueador que morre no combate volta, com o marcador', () => {
  cobre('persist'); cobre('undying');
  const cartas = { ...CARDS, Teimoso: cre('Teimoso', 2, 2, ['Persist']), Lobo: cre('Lobo', 2, 2, ['Undying']), Grande: cre('Grande', 4, 4) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 35, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let g1, g2, t, l; [s, g1] = poe(s, a, 'Grande'); [s, g2] = poe(s, a, 'Grande'); [s, t] = poe(s, d, 'Teimoso'); [s, l] = poe(s, d, 'Lobo');
  let r = combate(s, [g1, g2], [[t, g1], [l, g2]]);
  for (let i = 0; i < 10 && (r.stack.length || r.pending); i++) r = r.pending ? act(r, E.legalActions(r, r.pending.p)[0]) : act(r, { t: 'pass', p: r.turn.priority });
  assert.ok(vivo(r, t) && vivo(r, l), 'os dois voltaram');
  assert.equal(E.stats(r, r.objects[t]).power, 1, 'persistir: −1/−1'); assert.equal(E.stats(r, r.objects[l]).power, 3, 'imortal: +1/+1');
});

test('K-5 · exaltado (702.83): atacar sozinho com uma exaltada no campo causa 1 a mais', () => {
  cobre('exalted');
  const cartas = { ...CARDS, Nobre: cre('Nobre', 1, 1, ['Exalted']) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 36, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let urso; [s] = poe(s, a, 'Nobre'); [s, urso] = poe(s, a, 'Urso');
  const r = combate(s, [urso]);
  assert.equal(r.players[d].life, 17, 'Urso 2 + exaltado 1');
});

test('K-6 · pós-vida (702.135): o bloqueador que morre deixa uma ficha 1/1 voando', () => {
  cobre('afterlife');
  const cartas = { ...CARDS, Clerigo: cre('Clerigo', 2, 1, ['Afterlife'], { oracle_text: 'Afterlife 1' }), Grande: cre('Grande', 4, 4) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 37, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let g, c; [s, g] = poe(s, a, 'Grande'); [s, c] = poe(s, d, 'Clerigo');
  let r = combate(s, [g], [[c, g]]);
  for (let i = 0; i < 10 && (r.stack.length || r.pending); i++) r = r.pending ? act(r, E.legalActions(r, r.pending.p)[0]) : act(r, { t: 'pass', p: r.turn.priority });
  const fichas = r.zones[d].battlefield.filter(x => r.objects[x].token);
  assert.equal(fichas.length, 1); assert.ok(E.hasKeyword(r, r.objects[fichas[0]], 'flying'));
});

test('K-7 · cascata (702.85): conjurar a criatura com cascata traz de graça a de valor menor do topo', () => {
  cobre('cascade');
  const cartas = { ...CARDS, Cascateira: cre('Cascateira', 3, 3, ['Cascade'], { mana_cost: '{3}{W}', cmc: 4 }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 38, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active; let c; [s, c] = poe(s, a, 'Cascateira', { zone: 'hand' });
  s = J(s); const lib = s.zones[a].library; const urso = lib.find(o => s.objects[o].name === 'Urso'); lib.splice(lib.indexOf(urso), 1); lib.unshift(urso);
  s = act(s, { t: 'cast', p: a, oid: c });
  for (let i = 0; i < 4 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'cast_free', p: a, oid: urso });
  for (let i = 0; i < 8 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(vivo(s, urso) && vivo(s, c), 'as duas no campo');
});

test('K-8 · evocar (702.74): a criatura evocada é sacrificada ao entrar; pelo custo normal, fica no campo', () => {
  cobre('evoke');
  const cartas = { ...CARDS, Evocada: cre('Evocada', 3, 3, ['Evoke'], { mana_cost: '{3}{W}', cmc: 4, oracle_text: 'Evoke {W}' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 39, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active; let c; [s, c] = poe(s, a, 'Evocada', { zone: 'hand' });
  const ofertas = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === c);
  let ev = act(s, ofertas.find(x => x.alt != null));
  for (let i = 0; i < 8 && (ev.stack.length || ev.pending); i++) ev = ev.pending ? act(ev, E.legalActions(ev, ev.pending.p)[0]) : act(ev, { t: 'pass', p: ev.turn.priority });
  assert.equal(ev.objects[c].zone, 'graveyard', 'evocada: sacrificada');
  let n = act(s, ofertas.find(x => x.alt == null));
  for (let i = 0; i < 8 && n.stack.length; i++) n = act(n, { t: 'pass', p: n.turn.priority });
  assert.ok(vivo(n, c), 'pelo custo normal, fica');
});

test('K-9 · arremeter (702.109): a arremetida ataca no turno em que entra e volta para a mão no passo final', () => {
  cobre('dash');
  const cartas = { ...CARDS, Batedor: cre('Batedor', 3, 1, ['Dash'], { mana_cost: '{R}{R}', cmc: 2, oracle_text: 'Dash {1}{R}' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 40, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let c; [s, c] = poe(s, a, 'Batedor', { zone: 'hand' });
  s = act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === c && x.alt != null));
  for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const r = combate(s, [c]);
  assert.equal(r.players[d].life, 17, 'atacou no turno em que entrou');
  let f = r; for (let i = 0; i < 40 && f.turn.active === a; i++) f = f.pending ? act(f, E.legalActions(f, f.pending.p)[0]) : act(f, { t: 'pass', p: f.turn.priority });
  assert.equal(f.objects[c].zone, 'hand', 'voltou para a mão');
});

test('K-10 · recomeçar (702.133): a mágica volta do cemitério descartando uma carta e depois fica no exílio', () => {
  cobre('jump-start');
  const cartas = { ...CARDS, Ideia: { name: 'Ideia', type_line: 'Instant', mana_cost: '{1}{U}', cmc: 2, colors: ['U'], keywords: ['Jump-start'], oracle_text: 'Draw a card.\nJump-start' } };
  const scripts = { ...SCRIPTS, Ideia: { name: 'Ideia', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 41, mode: 'assisted', manaCheck: false, cards: cartas, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active; let c; [s, c] = poe(s, a, 'Ideia', { zone: 'graveyard' });
  s = act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === c && x.recomecarK));
  for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[c].zone, 'exile');
});

test('K-11 · evoluir (702.100): a criatura que evoluiu com a entrada de uma maior bate mais forte', () => {
  cobre('evolve');
  const cartas = { ...CARDS, Mutante: cre('Mutante', 1, 1, ['Evolve'], { oracle_text: 'Evolve' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 42, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let m, u; [s, m] = poe(s, a, 'Mutante'); [s, u] = poe(s, a, 'Urso', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: u });
  for (let i = 0; i < 6 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  const r = combate(s, [m]);
  assert.equal(r.players[d].life, 18, 'Mutante 1/1 + 1 marcador');
});

test('K-12 · explorar (702.110): sacrificar o Urso ao entrar deixa o oponente sem bloqueador para o ataque seguinte', () => {
  cobre('exploit');
  const cartas = { ...CARDS, Grande: cre('Grande', 4, 4), Exploradora: cre('Exploradora', 2, 2, ['Exploit'], { oracle_text: 'Exploit\nWhen Exploradora exploits a creature, destroy target creature.' }) };
  const scripts = { ...SCRIPTS, Exploradora: { name: 'Exploradora', abilities: [{ kind: 'triggered', when: 'exploits', effects: [{ do: 'destroy', target: 'creature' }] }], example: { action: 'etb', target: 'enemy-creature', expect: { gone: true } } } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 43, mode: 'assisted', manaCheck: false, cards: cartas, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let e, u, uo, g; [s, u] = poe(s, a, 'Urso'); [s, g] = poe(s, a, 'Grande'); [s, uo] = poe(s, d, 'Urso'); [s, e] = poe(s, a, 'Exploradora', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: e });
  for (let i = 0; i < 20 && (s.stack.length || s.pending); i++) {
    if (s.pending) { const la = E.legalActions(s, s.pending.p); s = act(s, s.pending.kind === 'may_pay' ? la.find(x => x.t === 'pay') : s.pending.kind === 'sacrifice' ? la.find(x => x.oid === u) : la.find(x => JSON.stringify((s.pending.options || [])[x.index] || '').includes(uo)) || la[0]); }
    else s = act(s, { t: 'pass', p: s.turn.priority });
  }
  assert.ok(!vivo(s, uo), 'explorou: o Urso do oponente foi destruído');
  const r = combate(s, [g]);
  assert.equal(r.players[d].life, 16, 'o Grande passou sem bloqueio');
});

test('K-13 · convocar e improvisar (702.51, 702.126): quem virou para pagar a mágica não ataca neste turno', () => {
  cobre('convoke'); cobre('improvise');
  const terra = n => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '' });
  const cartas = { ...CARDS, Forest: terra('Forest'), Convocada: cre('Convocada', 4, 4, ['Convoke'], { mana_cost: '{2}{G}{G}', cmc: 4, colors: ['G'], oracle_text: 'Convoke' }),
    Improvisada: cre('Improvisada', 3, 3, ['Improvise'], { mana_cost: '{3}', cmc: 3, colors: [], oracle_text: 'Improvise' }), Peca: { name: 'Peca', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, colors: [], keywords: [], oracle_text: '' },
    Verde: cre('Verde', 2, 2, [], { colors: ['G'] }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 44, mode: 'assisted', manaCheck: true, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active; let c, im, v1, v2, f1, f2, p1, p2, p3;
  [s, v1] = poe(s, a, 'Verde'); [s, v2] = poe(s, a, 'Verde'); [s, f1] = poe(s, a, 'Forest'); [s, f2] = poe(s, a, 'Forest');
  [s, p1] = poe(s, a, 'Peca'); [s, p2] = poe(s, a, 'Peca'); [s, p3] = poe(s, a, 'Peca');
  [s, c] = poe(s, a, 'Convocada', { zone: 'hand' }); [s, im] = poe(s, a, 'Improvisada', { zone: 'hand' });
  const conv = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === c && x.tapaK && x.tapaK.length === 2 && x.tapaK.includes(v1) && x.tapaK.includes(v2));
  assert.ok(conv, 'as duas Verdes pagam {G}{G}; as Florestas, o {2}');
  s = act(s, conv); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const imp = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === im && x.tapaK && x.tapaK.length === 3);
  assert.ok(imp, 'os três artefatos pagam o {3}'); s = act(s, imp);
  for (let i = 0; i < 6 && s.turn.step !== 'combat_attackers'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const atacantes = E.legalActions(s, a).filter(x => x.t === 'attack').flatMap(x => x.attackers || [x.oid]).filter(Boolean);
  assert.ok(s.objects[v1].tapped && s.objects[v2].tapped && [p1, p2, p3].every(x => s.objects[x].tapped), 'quem pagou ficou virado');
  assert.ok(!atacantes.includes(v1) && !atacantes.includes(v2), 'as Verdes viraram para convocar e não atacam');
});

test('K-17 · proteção contra criaturas (702.16): bloqueia o Urso e não leva dano dele', () => {
  cobre('protection');
  const cartas = { ...CARDS, Capelao: cre('Capelao', 1, 1, ['Protection'], { oracle_text: 'Protection from creatures' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 45, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let u, c; [s, u] = poe(s, a, 'Urso'); [s, c] = poe(s, d, 'Capelao');
  const r = combate(s, [u], [[c, u]]);
  assert.ok(vivo(r, c), 'o dano do Urso foi prevenido'); assert.equal(r.objects[u].damage, 1, 'e o Capelão causou o dele');
});

test('K-21 · travessia com qualidade (702.14): a travessia de não básico passa pelo Urso quando o defensor tem um terreno não básico', () => {
  cobre('landwalk');
  const cartas = { ...CARDS, Driade: cre('Driade', 2, 1, [], { oracle_text: 'Nonbasic landwalk' }), Ermo: { name: 'Ermo', type_line: 'Land', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '' } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 46, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let x, u; [s, x] = poe(s, a, 'Driade'); [s, u] = poe(s, d, 'Urso'); [s] = poe(s, d, 'Ermo');
  assert.throws(() => combate(s, [x], [[u, x]]), /travessia|bloque/i, 'o bloqueio é recusado');
  const r = combate(s, [x]); assert.equal(r.players[d].life, 18);
});

test('K-22 · suspender (702.62): a criatura suspensa volta no turno seguinte com ímpeto e ataca', () => {
  cobre('suspend');
  const cartas = { ...CARDS, Suspensa: cre('Suspensa', 3, 3, ['Suspend'], { mana_cost: '{3}{G}{G}', cmc: 5, oracle_text: 'Suspend 1—{G}' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 47, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let c; [s, c] = poe(s, a, 'Suspensa', { zone: 'hand' });
  s = act(s, { t: 'suspender_k', p: a, oid: c });
  for (let i = 0; i < 200 && !(s.pending && s.pending.kind === 'free_cast'); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p).find(x => x.t !== 'concede') || E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'cast_free', p: a, oid: c }); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  for (let i = 0; i < 20 && s.turn.step !== 'main1'; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(vivo(s, c) && E.hasKeyword(s, s.objects[c], 'haste'), 'no campo, com ímpeto');
  const vida = s.players[d].life; const r = combate(s, [c]);
  assert.equal(r.players[d].life, vida - 3, 'atacou no turno em que voltou');
});

test('K-30 · grito de guerra (702.91): o Urso que ataca junto bate 3', () => {
  cobre('battle cry');
  const cartas = { ...CARDS, Arauto: cre('Arauto', 1, 1, ['Battle cry'], { oracle_text: 'Battle cry' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 48, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a;
  let ar, u; [s, ar] = poe(s, a, 'Arauto'); [s, u] = poe(s, a, 'Urso');
  assert.equal(combate(s, [ar, u]).players[d].life, 16, 'Arauto 1 + Urso 2+1');
});

test('K-30 · alvoroço (702.23): bloqueado por dois Ursos, o 3/3 com alvoroço 2 vira 5/5 e sobrevive', () => {
  cobre('rampage');
  const cartas = { ...CARDS, Fera: cre('Fera', 3, 3, ['Rampage'], { oracle_text: 'Rampage 2' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 49, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a;
  let f, u1, u2; [s, f] = poe(s, a, 'Fera'); [s, u1] = poe(s, d, 'Urso'); [s, u2] = poe(s, d, 'Urso');
  const r = combate(s, [f], [[u1, f], [u2, f]]); assert.equal(vivo(r, f), true, '5/5 leva 4');
});

test('K-30 · flanquear (702.25): o Urso que bloqueia vira 1/1 e morre para a 1/2', () => {
  cobre('flanking');
  const cartas = { ...CARDS, Cavaleiro: cre('Cavaleiro', 1, 2, ['Flanking'], { oracle_text: 'Flanking' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 50, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a;
  let c, u; [s, c] = poe(s, a, 'Cavaleiro'); [s, u] = poe(s, d, 'Urso');
  const r = combate(s, [c], [[u, c]]); assert.equal(vivo(r, u), false, 'Urso 1/1 levou 1'); assert.equal(vivo(r, c), true, 'e o Cavaleiro 1/2 levou só 1');
});

test('K-30 · bushido (702.45): bloqueando, a 1/1 com bushido 1 vira 2/2 e mata o Urso que ataca', () => {
  cobre('bushido');
  const cartas = { ...CARDS, Samurai: cre('Samurai', 1, 1, ['Bushido'], { oracle_text: 'Bushido 1' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 51, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a;
  let sa, u; [s, u] = poe(s, a, 'Urso'); [s, sa] = poe(s, d, 'Samurai');
  const r = combate(s, [u], [[sa, u]]); assert.equal(vivo(r, u), false, '2 de dano no Urso'); assert.equal(vivo(r, sa), false, 'e os 2 do Urso matam a 2/2');
});

test('K-31 · aflição (702.130): bloqueada pelo Urso, o defensor perde 2 mesmo sem dano passar', () => {
  cobre('afflict');
  const cartas = { ...CARDS, Chacal: cre('Chacal', 2, 2, ['Afflict'], { oracle_text: 'Afflict 2' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 52, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a;
  let c, u; [s, c] = poe(s, a, 'Chacal'); [s, u] = poe(s, d, 'Urso');
  assert.equal(combate(s, [c], [[u, c]]).players[d].life, 18);
});

test('K-31 · refrega (702.121): a 1/1 que ataca bate 2', () => {
  cobre('melee');
  const cartas = { ...CARDS, Ave: cre('Ave', 1, 1, ['Melee'], { oracle_text: 'Melee' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 53, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a;
  let v; [s, v] = poe(s, a, 'Ave');
  assert.equal(combate(s, [v]).players[d].life, 18);
});

test('K-31 · mentor (702.134): a 1/1 que ataca junto da mentora 2/2 ganha o marcador e bate 2', () => {
  cobre('mentor');
  const cartas = { ...CARDS, Mestra: cre('Mestra', 2, 2, ['Mentor'], { oracle_text: 'Mentor' }), Aprendiz: cre('Aprendiz', 1, 1) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 54, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a;
  let m, ap; [s, m] = poe(s, a, 'Mestra'); [s, ap] = poe(s, a, 'Aprendiz');
  assert.equal(combate(s, [m, ap]).players[d].life, 16, '2 + (1+1)');
});

test('K-31 · treinamento (702.149): a 1/1 que ataca com um 2/2 ganha o marcador e bate 2', () => {
  cobre('training');
  const cartas = { ...CARDS, Recruta: cre('Recruta', 1, 1, ['Training'], { oracle_text: 'Training' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 55, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a;
  let r, u; [s, r] = poe(s, a, 'Recruta'); [s, u] = poe(s, a, 'Urso');
  assert.equal(combate(s, [r, u]).players[d].life, 16, '(1+1) + 2');
});

test('K-32 · espetáculo e surto (702.137, 702.117): depois do Urso passar, a criatura sai pelo custo menor e bloqueia no turno do oponente', () => {
  cobre('spectacle'); cobre('surge');
  const cartas = { ...CARDS, Acrobata: cre('Acrobata', 3, 3, ['Spectacle'], { mana_cost: '{4}{R}', cmc: 5, oracle_text: 'Spectacle {R}' }), Surfista: cre('Surfista', 2, 2, ['Surge'], { mana_cost: '{3}{U}', cmc: 4, oracle_text: 'Surge {U}' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 56, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let u, ac, su; [s, u] = poe(s, a, 'Urso'); [s, ac] = poe(s, a, 'Acrobata', { zone: 'hand' }); [s, su] = poe(s, a, 'Surfista', { zone: 'hand' });
  assert.ok(!E.legalActions(s, a).some(x => x.oid === ac && x.alt != null), 'antes do dano, sem espetáculo');
  s = combate(s, [u]); assert.equal(s.players[d].life, 18);
  const esp = E.legalActions(s, a).find(x => x.oid === ac && x.alt != null); assert.ok(esp, 'o oponente perdeu vida: espetáculo');
  s = act(s, esp); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(vivo(s, ac), true);
  const sur = E.legalActions(s, a).find(x => x.oid === su && x.alt != null); assert.ok(sur, 'já conjurou outra mágica: surto');
});

test('K-33 · recompra (702.27): a névoa com recompra sacrificando um terreno impede o dano do Urso e volta para a mão; sem recompra, cemitério', () => {
  cobre('buyback');
  const cartas = { ...CARDS, Brumas: { name: 'Brumas', type_line: 'Instant', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], keywords: ['Buyback'], oracle_text: 'Buyback—Sacrifice a land.\nPrevent all combat damage that would be dealt this turn.' } };
  const scripts = { ...SCRIPTS, Brumas: { name: 'Brumas', effects: [{ do: 'fog' }], example: { target: 'none', expect: { fogged: true } } } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 57, mode: 'assisted', manaCheck: false, cards: cartas, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let u, br, pl; [s, u] = poe(s, a, 'Urso'); [s, pl] = poe(s, a, 'Plains'); [s, br] = poe(s, a, 'Brumas', { zone: 'hand' });
  const comR = E.legalActions(s, a).find(x => x.oid === br && x.recompraK); assert.ok(comR, 'com um terreno no campo: a recompra é oferecida');
  let t = act(s, comR); for (let i = 0; i < 4 && t.stack.length; i++) t = act(t, { t: 'pass', p: t.turn.priority });
  assert.equal(t.objects[br].zone, 'hand'); assert.equal(t.objects[pl].zone, 'graveyard', 'o terreno pagou a recompra');
  assert.equal(combate(t, [u]).players[d].life, 20, 'dano de combate prevenido');
  let v = act(s, E.legalActions(s, a).find(x => x.oid === br && !x.recompraK)); for (let i = 0; i < 4 && v.stack.length; i++) v = act(v, { t: 'pass', p: v.turn.priority });
  assert.equal(v.objects[br].zone, 'graveyard'); assert.equal(v.objects[pl].zone, 'battlefield');
});
test('K-34 · entrelaçar (702.42): Dream’s Grip com os dois modos vira o bloqueador do oponente e desvira o Urso virado, que ataca sem bloqueio', () => {
  cobre('entwine');
  const cartas = { ...CARDS, "Dream's Grip": { name: "Dream's Grip", type_line: 'Instant', mana_cost: '{U}', cmc: 1, colors: ['U'], keywords: ['Entwine'], oracle_text: 'Choose one —\n• Tap target permanent.\n• Untap target permanent.\nEntwine {1}' } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 58, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let u, b, g; [s, u] = poe(s, a, 'Urso', { tapped: true }); [s, b] = poe(s, d, 'Urso'); [s, g] = poe(s, a, "Dream's Grip", { zone: 'hand' });
  const ie = s.facts["Dream's Grip"].script.modes.findIndex(m => m.entrelacarK);
  const of = E.legalActions(s, a).find(x => x.oid === g && x.mode === ie && x.targets[0].oid === b && x.targets[1].oid === u); assert.ok(of, 'os dois modos, um alvo em cada');
  s = act(s, of); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[b].tapped, true); assert.equal(s.objects[u].tapped, false);
  assert.equal(combate(s, [u], [[b, u]]).players[d].life, 18, 'o bloqueador virado não bloqueia');
});
test('K-35 · ricochete (702.88): o +2/+2 da mão faz o Urso causar 4 e a carta vai para o exílio, não para o cemitério', () => {
  cobre('rebound');
  const cartas = { ...CARDS, Vinganca: { name: 'Vinganca', type_line: 'Instant', mana_cost: '{G}', cmc: 1, colors: ['G'], keywords: ['Rebound'], oracle_text: 'Target creature gets +2/+2 until end of turn.\nRebound' } };
  const scripts = { ...SCRIPTS, Vinganca: { name: 'Vinganca', effects: [{ do: 'pump', power: 2, toughness: 2, target: 'creature' }], example: { target: 'own-creature', expect: { pump: [2, 2] } } } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 59, mode: 'assisted', manaCheck: false, cards: cartas, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let u, v; [s, u] = poe(s, a, 'Urso'); [s, v] = poe(s, a, 'Vinganca', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: v, targets: [{ oid: u }] }); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[v].zone, 'exile');
  assert.equal(combate(s, [u]).players[d].life, 16);
});
test('K-36 · eco (702.30): a criatura com eco que entrou neste turno, sem o eco pago na sua manutenção seguinte, é sacrificada e não ataca', () => {
  cobre('echo');
  const cartas = { ...CARDS, Gargula: cre('Gargula', 3, 2, ['Echo'], { oracle_text: 'Echo {2}{R}' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 60, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active; let g; [s, g] = poe(s, a, 'Gargula', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: g }); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  let pago = false;
  for (let i = 0; i < 300 && !(s.turn.active === a && s.turn.step === 'main1' && s.turn.number > 1); i++) {
    if (s.pending && s.pending.kind === 'may_pay') { s = act(s, { t: 'decline', p: s.pending.p }); pago = true; continue; }
    s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  }
  assert.ok(pago, 'a pergunta do eco veio'); assert.equal(vivo(s, g), false, 'recusou: sacrificada');
});
test('K-37 · desvanecer e sumir (702.32, 702.63): a 5/5 com "Fading 1" e a 3/3 com "Vanishing 1" atacam no turno em que entram; na sua manutenção seguinte a de sumir sai, e na outra a de desvanecer', () => {
  cobre('fading'); cobre('vanishing');
  const cartas = { ...CARDS, Bola: cre('Bola', 5, 5, ['Fading', 'Haste'], { oracle_text: 'Haste\nFading 1' }), Fenda: cre('Fenda', 3, 3, ['Vanishing', 'Haste'], { oracle_text: 'Haste\nVanishing 1' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 61, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let b, f; [s, b] = poe(s, a, 'Bola', { zone: 'hand' }); [s, f] = poe(s, a, 'Fenda', { zone: 'hand' });
  for (const x of [b, f]) { s = act(s, { t: 'cast', p: a, oid: x }); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority }); }
  assert.equal(s.objects[b].counters.fade, 1); assert.equal(s.objects[f].counters.time, 1);
  s = combate(s, [b, f]); assert.equal(s.players[d].life, 12);
  const proxima = st => { const t0 = st.turn.number; for (let i = 0; i < 300 && !(st.turn.active === a && st.turn.step === 'main1' && st.turn.number > t0); i++) st = st.pending ? act(st, E.legalActions(st, st.pending.p)[0]) : act(st, { t: 'pass', p: st.turn.priority }); return st; };
  s = proxima(s); assert.equal(vivo(s, f), false, 'sumir: saiu o último, sacrificada'); assert.equal(vivo(s, b), true, 'desvanecer: tirou o último, ainda fica');
  s = proxima(s); assert.equal(vivo(s, b), false, 'desvanecer: não deu para tirar, sacrificada');
});
test('K-38 · tumulto e fabricar (702.136, 702.123): a de tumulto escolhe ímpeto e ataca no turno em que entra; a de fabricar cria um Servo, que bloqueia', () => {
  cobre('riot'); cobre('fabricate');
  const cartas = { ...CARDS, Arruaca: cre('Arruaca', 2, 2, ['Riot'], { oracle_text: 'Riot' }), Artesa: cre('Artesa', 2, 2, ['Flash', 'Fabricate'], { oracle_text: 'Flash\nFabricate 1' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 62, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let r, f; [s, r] = poe(s, a, 'Arruaca', { zone: 'hand' }); [s, f] = poe(s, d, 'Artesa', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: r });
  for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'choose_mode'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, E.legalActions(s, a).find(x => x.t === 'choose_mode' && /ímpeto/.test(x.label)));
  assert.equal(combate(s, [r]).players[d].life, 18, 'com ímpeto, atacou no turno em que entrou');
  let t = J(s); t.turn.priority = d; t = act(t, { t: 'cast', p: d, oid: f });
  for (let i = 0; i < 8 && !(t.pending && t.pending.kind === 'choose_mode'); i++) t = act(t, { t: 'pass', p: t.turn.priority });
  t = act(t, E.legalActions(t, d).find(x => x.t === 'choose_mode' && /Servo/.test(x.label)));
  for (let i = 0; i < 4 && t.stack.length; i++) t = act(t, { t: 'pass', p: t.turn.priority });
  const servo = t.zones[d].battlefield.find(x => t.objects[x].name === 'Servo'); assert.ok(servo, 'o Servo entrou');
  t = combate(t, [r], [[servo, r]]); assert.equal(t.players[d].life, 20, 'o Servo bloqueou'); assert.ok(!t.objects[servo] || t.objects[servo].zone !== 'battlefield', 'e morreu');
});
test('K-40 · aniquilador, venenoso, renome e ingerir (702.86, 702.70, 702.112, 702.115): um ataque sem bloqueio muda vida, veneno, marcadores, campo e grimório do defensor', () => {
  cobre('annihilator'); cobre('poisonous'); cobre('renown'); cobre('ingest');
  const cartas = { ...CARDS, Colosso: cre('Colosso', 4, 4, ['Annihilator'], { oracle_text: 'Annihilator 1' }), Viboras: cre('Viboras', 1, 1, ['Poisonous'], { oracle_text: 'Poisonous 1' }),
    Cavaleira: cre('Cavaleira', 2, 2, ['Renown'], { oracle_text: 'Renown 2' }), Zangao: cre('Zangao', 1, 1, ['Ingest'], { oracle_text: 'Ingest' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 63, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let c, v, k, z, pl; [s, c] = poe(s, a, 'Colosso'); [s, v] = poe(s, a, 'Viboras'); [s, k] = poe(s, a, 'Cavaleira'); [s, z] = poe(s, a, 'Zangao'); [s, pl] = poe(s, d, 'Plains');
  const topo = s.zones[d].library[0];
  s = combate(s, [c, v, k, z]); for (let i = 0; i < 40 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); // a ordem dos gatilhos é perguntada
  assert.equal(s.objects[pl].zone, 'graveyard', 'aniquilador: a única permanente dele foi sacrificada');
  assert.equal(s.players[d].poison || 0, 1, 'venenoso'); assert.equal(s.objects[k].counters.p1p1, 2, 'renome'); assert.equal(s.objects[topo].zone, 'exile', 'ingerir');
  assert.equal(s.players[d].life, 12, '4 + 1 + 2 + 1');
});
test('K-41 · modular e transmigrar (702.43, 702.46): o 0/0 artefato com "Modular 1" entra 1/1 e ataca; o Espírito com "Soulshift 2" morre bloqueando e devolve o Espírito do cemitério', () => {
  cobre('modular'); cobre('soulshift');
  const art = (n, p, t, k, txt) => ({ name: n, type_line: 'Artifact Creature — Construct', mana_cost: '{1}', cmc: 1, colors: [], power: String(p), toughness: String(t), keywords: k, oracle_text: txt });
  const cartas = { ...CARDS, Peca: art('Peca', 0, 0, ['Modular'], 'Modular 1'), Torre: art('Torre', 0, 3, [], ''), Kami: { name: 'Kami', type_line: 'Creature — Spirit', mana_cost: '{1}{W}', cmc: 2, colors: ['W'], power: '1', toughness: '1', keywords: ['Soulshift'], oracle_text: 'Soulshift 2' },
    Fantasma: { name: 'Fantasma', type_line: 'Creature — Spirit', mana_cost: '{1}', cmc: 1, colors: ['W'], power: '1', toughness: '1', keywords: [], oracle_text: '' } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 64, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let pc, tr, km, fa, u;
  [s, pc] = poe(s, a, 'Peca', { zone: 'hand' }); [s, tr] = poe(s, a, 'Torre'); [s, km] = poe(s, d, 'Kami'); [s, fa] = poe(s, d, 'Fantasma', { zone: 'graveyard' }); [s, u] = poe(s, a, 'Urso');
  s = act(s, { t: 'cast', p: a, oid: pc }); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[pc].counters.p1p1, 1); s = J(s); s.objects[pc].sick = false;
  s = combate(s, [pc, u], [[km, u]]);
  for (let i = 0; i < 30 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, s.pending.kind === 'may_pay' ? { t: 'pay', p: s.pending.p } : E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(vivo(s, km), false, 'o Kami morreu bloqueando'); assert.equal(s.objects[fa].zone, 'hand', 'transmigrar: o Espírito voltou para a mão');
  assert.equal(s.players[d].life, 19, 'a Peça 1/1 passou');
});
test('K-42 · destronar, frenesi e perdurar (702.105, 702.68, 702.107): o empate em vida dá o marcador, o frenesi soma ao dano sem bloqueio, e o perdurar cresce a criatura antes do combate', () => {
  cobre('dethrone'); cobre('frenzy'); cobre('outlast');
  const cartas = { ...CARDS, Rebelde: cre('Rebelde', 2, 1, ['Dethrone'], { oracle_text: 'Dethrone' }), Furia: cre('Furia', 1, 1, ['Frenzy'], { oracle_text: 'Frenzy 1' }),
    Paciente: cre('Paciente', 1, 1, ['Outlast'], { oracle_text: 'Outlast {1}' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 65, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let r, f, pa; [s, r] = poe(s, a, 'Rebelde'); [s, f] = poe(s, a, 'Furia'); [s, pa] = poe(s, a, 'Paciente'); [s] = poe(s, a, 'Plains');
  s = act(s, E.legalActions(s, a).find(x => x.t === 'activate' && x.oid === pa)); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[pa].counters.p1p1, 1, 'perdurar');
  s = combate(s, [r, f]); for (let i = 0; i < 30 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[r].counters.p1p1, 1, 'destronar'); assert.equal(s.players[d].life, 15, '(2 + 1) + (1 + 1)');
});
test('K-43 · devorar e amplificar (702.82, 702.38): a de devorar come o Urso e entra maior; a de amplificar revela a irmã da mão; as duas atacam maiores', () => {
  cobre('devour'); cobre('amplify');
  const cartas = { ...CARDS, Glutao: cre('Glutao', 1, 1, ['Devour', 'Haste'], { oracle_text: 'Haste\nDevour 2' }),
    Fera: { name: 'Fera', type_line: 'Creature — Beast', mana_cost: '{1}', cmc: 1, colors: ['G'], power: '1', toughness: '1', keywords: ['Amplify', 'Haste'], oracle_text: 'Haste\nAmplify 1' } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 66, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let g, u, f, f2; [s, g] = poe(s, a, 'Glutao', { zone: 'hand' }); [s, u] = poe(s, a, 'Urso'); [s, f] = poe(s, a, 'Fera', { zone: 'hand' }); [s, f2] = poe(s, a, 'Fera', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: g }); for (let i = 0; i < 6 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'pick', p: a, oid: u }); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: a });
  assert.equal(s.objects[g].counters.p1p1, 2); assert.equal(vivo(s, u), false);
  s = act(s, { t: 'cast', p: a, oid: f }); for (let i = 0; i < 6 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'pick', p: a, oid: f2 }); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: a });
  assert.equal(s.objects[f].counters.p1p1, 1); assert.equal(s.objects[f2].zone, 'hand');
  assert.equal(combate(s, [g, f]).players[d].life, 15, '3 + 2');
});
test('K-44 · campeão (702.72): o campeão exila o Urso ao entrar e ataca; morto no bloqueio, o Urso volta', () => {
  cobre('champion');
  const cartas = { ...CARDS, Heroi: cre('Heroi', 3, 3, ['Champion', 'Haste'], { oracle_text: 'Haste\nChampion a creature' }), Muralha: cre('Muralha', 3, 5, []) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 67, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let h, u, m; [s, h] = poe(s, a, 'Heroi', { zone: 'hand' }); [s, u] = poe(s, a, 'Urso'); [s, m] = poe(s, d, 'Muralha');
  s = act(s, { t: 'cast', p: a, oid: h }); for (let i = 0; i < 8 && !(s.pending && s.pending.kind === 'pick') && (s.stack.length || (s.queued || []).length); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'pick', p: a, oid: u }); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[u].zone, 'exile');
  let v = J(s); v.objects[m] && (v.objects[m].counters = { p1p1: 2 }); v = combate(v, [h], [[m, h]]); for (let i = 0; i < 10 && (v.stack.length || v.pending); i++) v = v.pending ? act(v, E.legalActions(v, v.pending.p)[0]) : act(v, { t: 'pass', p: v.turn.priority });
  assert.equal(vivo(v, h), false, 'contra a 5/7, morre'); assert.equal(v.objects[u].zone, 'battlefield', 'o Urso voltou');
});
test('K-46 · enxerto (702.58): a 0/0 com "Graft 2" passa um marcador para a criatura com ímpeto que entra, e ela ataca 3/3', () => {
  cobre('graft');
  const cartas = { ...CARDS, Enxerto: cre('Enxerto', 0, 0, ['Graft'], { oracle_text: 'Graft 2' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 68, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let e, u; [s, e] = poe(s, a, 'Enxerto', { zone: 'hand' }); [s, u] = poe(s, a, 'Rápida', { zone: 'hand' });
  for (const x of [e, u]) { s = act(s, { t: 'cast', p: a, oid: x }); for (let i = 0; i < 10 && (s.stack.length || s.pending || (s.queued || []).length); i++) s = s.pending ? act(s, s.pending.kind === 'may_pay' ? { t: 'pay', p: s.pending.p } : E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); }
  assert.equal(s.objects[e].counters.p1p1, 1); assert.equal(s.objects[u].counters.p1p1, 1);
  assert.equal(combate(s, [u]).players[d].life, 17, 'a Rápida 2/2 + 1');
});
test('K-47 · emergir (702.119): sacrificando o Urso, a 5/5 voadora sai pelo custo alternativo', () => {
  cobre('emerge');
  const cartas = { ...CARDS, Grifo: cre('Grifo', 5, 5, ['Emerge', 'Flying'], { mana_cost: '{7}', cmc: 7, oracle_text: 'Emerge {5}{U}\nFlying' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 69, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let g, u; [s, g] = poe(s, a, 'Grifo', { zone: 'hand' }); [s, u] = poe(s, a, 'Urso');
  const of = E.legalActions(s, a).find(x => x.oid === g && x.alt != null && [].concat((x.pay || {}).sacrifice || [])[0] === u); assert.ok(of, 'emergir sacrificando o Urso');
  s = act(s, of); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(vivo(s, g), true); assert.equal(s.objects[u].zone, 'graveyard');
});
test('K-48 · escalar (702.120): Borrowed Hostility com os dois modos dá +3/+0 e iniciativa ao Urso, que mata o bloqueador antes de levar dano', () => {
  cobre('escalate');
  const cartas = { ...CARDS, Hostil: { name: 'Hostil', type_line: 'Instant', mana_cost: '{R}', cmc: 1, colors: ['R'], keywords: ['Escalate'], oracle_text: 'Escalate {3} (Pay this cost for each mode chosen beyond the first.)\nChoose one or both —\n• Target creature gets +3/+0 until end of turn.\n• Target creature gains first strike until end of turn.' } };
  const scripts = { ...SCRIPTS, Hostil: { ...S.SCRIPTS['Borrowed Hostility'], name: 'Hostil' } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 70, mode: 'assisted', manaCheck: false, cards: cartas, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let u, b, h; [s, u] = poe(s, a, 'Urso'); [s, b] = poe(s, d, 'Urso'); [s, h] = poe(s, a, 'Hostil', { zone: 'hand' });
  const ie = s.facts.Hostil.script.modes.findIndex(m => m.escalarK);
  const of = E.legalActions(s, a).find(x => x.oid === h && x.mode === ie && x.targets.every(t => t.oid === u)); assert.ok(of, 'os dois modos no mesmo Urso (115.3)');
  s = act(s, of); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const t = combate(s, [u], [[b, u]]);
  assert.equal(vivo(t, u), true, 'iniciativa: o bloqueador morre antes'); assert.equal(vivo(t, b), false);
});
test('K-51 · dobra (702.185): a 4/4 com ímpeto entra pela dobra, ataca por 4 e é exilada na etapa final', () => {
  cobre('warp');
  const cartas = { ...CARDS, Dobrada: cre('Dobrada', 4, 4, ['Haste', 'Warp'], { mana_cost: '{4}{R}', cmc: 5, oracle_text: 'Haste\nWarp {R}' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 71, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let g; [s, g] = poe(s, a, 'Dobrada', { zone: 'hand' });
  const of = E.legalActions(s, a).find(x => x.oid === g && x.alt != null); assert.ok(of, 'a dobra é oferecida');
  s = act(s, of); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const t = combate(s, [g]); assert.equal(t.players[d].life, 16);
  let v = t; for (let i = 0; i < 40 && v.objects[g].zone === 'battlefield' && v.turn.active === a; i++) v = v.pending ? act(v, E.legalActions(v, v.pending.p)[0]) : act(v, { t: 'pass', p: v.turn.priority });
  assert.equal(v.objects[g].zone, 'exile');
});
test('K-52 · mobilizar (702.181): o Urso com "Mobilize 1" ataca e traz um Guerreiro 1/1 atacando: 3 de dano', () => {
  cobre('mobilize');
  const cartas = { ...CARDS, Mobil: cre('Mobil', 2, 2, ['Mobilize'], { oracle_text: 'Mobilize 1' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 72, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let m; [s, m] = poe(s, a, 'Mobil');
  assert.equal(combate(s, [m]).players[d].life, 17);
});
test('K-53 · prole (702.175): pagando a prole, a ficha cópia 1/1 com atropelar entra e ataca por 1', () => {
  cobre('offspring');
  const cartas = { ...CARDS, Prole: cre('Prole', 3, 3, ['Offspring', 'Trample'], { oracle_text: 'Offspring {2}\nTrample' }) };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 73, mode: 'assisted', manaCheck: false, cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let g; [s, g] = poe(s, a, 'Prole', { zone: 'hand' });
  s = act(s, E.legalActions(s, a).find(x => x.oid === g && x.proleK)); for (let i = 0; i < 8 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  const f = s.zones[a].battlefield.find(x => s.objects[x].token && s.objects[x].name === 'Prole'); assert.ok(f, 'a ficha cópia');
  s = JSON.parse(JSON.stringify(s)); s.objects[f].sick = false;
  assert.equal(combate(s, [f]).players[d].life, 19, 'a cópia é 1/1');
});
test('K-54 · spree (702.172): +2/+0 e iniciativa no mesmo Urso (os dois modos), que mata o bloqueador antes', () => {
  cobre('spree');
  const cartas = { ...CARDS, Farra: { name: 'Farra', type_line: 'Instant', mana_cost: '{R}', cmc: 1, colors: ['R'], keywords: ['Spree'], oracle_text: 'Spree\n+ {1} — Target creature gets +2/+0 until end of turn.\n+ {1} — Target creature gains first strike until end of turn.' } };
  const scripts = { ...SCRIPTS, Farra: { name: 'Farra', modes: [{ label: '+2/+0', effects: [{ do: 'pump', power: 2, toughness: 0, target: 'creature' }] }, { label: 'Iniciativa', effects: [{ do: 'keyword', keyword: 'first strike', target: 'creature' }] }], example: { action: 'mode:0', target: 'own-creature', expect: { pump: [2, 0] } } } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 74, mode: 'assisted', manaCheck: false, cards: cartas, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let u, b, h; [s, u] = poe(s, a, 'Urso'); [s, b] = poe(s, d, 'Urso'); [s, h] = poe(s, a, 'Farra', { zone: 'hand' });
  const ie = s.facts.Farra.script.modes.findIndex(m => (m.modosK || []).length === 2);
  const of = E.legalActions(s, a).find(x => x.oid === h && x.mode === ie && x.targets.every(t => t.oid === u)); assert.ok(of);
  s = act(s, of); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const t = combate(s, [u], [[b, u]]);
  assert.equal(vivo(t, u), true); assert.equal(vivo(t, b), false);
});
test('K-55 · harmonizar (702.180): Wild Ride do cemitério, virando outro Urso, dá +3/+0 e ímpeto ao atacante: 5 de dano', () => {
  cobre('harmonize');
  const cartas = { ...CARDS, Passeio: { name: 'Passeio', type_line: 'Sorcery', mana_cost: '{R}', cmc: 1, colors: ['R'], keywords: ['Harmonize'], oracle_text: 'Target creature gets +3/+0 and gains haste until end of turn.\nHarmonize {4}{R}' } };
  const scripts = { ...SCRIPTS, Passeio: { ...S.SCRIPTS['Wild Ride'], name: 'Passeio' } };
  const deck = Object.keys(cartas).map(name => ({ name, qty: 3, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 75, mode: 'assisted', manaCheck: false, cards: cartas, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] }); for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active, d = 1 - a; let u, v, w; [s, u] = poe(s, a, 'Urso'); [s, v] = poe(s, a, 'Urso'); [s, w] = poe(s, a, 'Passeio', { zone: 'graveyard' });
  const of = E.legalActions(s, a).find(x => x.oid === w && x.harmonizarK === v && x.targets[0].oid === u); assert.ok(of, 'do cemitério, virando o outro Urso');
  s = act(s, of); for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[w].zone, 'exile');
  assert.equal(combate(s, [u]).players[d].life, 15);
});
test('K12 · toda palavra-chave que o motor declara resolver tem cenário aqui', () => {
  const faltando = [...S.KEYWORDS].filter(k => !COBERTAS.has(k));
  assert.equal(faltando.length, 0, 'palavras-chave sem prova de regra: ' + faltando.join(', '));
});

test('K13 · dois bloqueadores dividem o dano do atacante, e o atacante leva a soma', () => {
  let s = jogo(24); const a = s.turn.active, d = 1 - a;
  let grande, u1, u2;
  [s, grande] = poe(s, a, 'Atropela');     // 4/4 (o atropelar não muda o bloqueio duplo aqui)
  [s, u1] = poe(s, d, 'Urso'); [s, u2] = poe(s, d, 'Urso');   // dois 2/2
  const r = combate(s, [grande], [[u1, grande], [u2, grande]]);
  assert.equal(vivo(r, grande), false, 'levou 2+2 e morreu');
  const mortos = [u1, u2].filter(x => !vivo(r, x)).length;
  assert.equal(mortos >= 1, true, 'os 4 de dano mataram pelo menos um bloqueador');
  assert.equal(r.players[d].life, 20, 'nada passou para o jogador com os dois bloqueando');
});

test('K14 · criatura bloqueada não causa dano ao jogador, e atacar vira quem não tem vigilância', () => {
  let s = jogo(25); const a = s.turn.active, d = 1 - a;
  let urso, muro;
  [s, urso] = poe(s, a, 'Urso');
  [s, muro] = poe(s, d, 'Muro');           // 0/4 defensor bloqueia
  const r = combate(s, [urso], [[muro, urso]]);
  assert.equal(r.players[d].life, 20, 'bloqueado, não passa dano');
  assert.equal(r.objects[urso].tapped, true, 'atacar virou a criatura');
  assert.equal(vivo(r, muro), true, 'o muro 0/4 aguentou o 2/2');
});
