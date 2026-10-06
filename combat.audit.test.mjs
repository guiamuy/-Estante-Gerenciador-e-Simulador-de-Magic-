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
