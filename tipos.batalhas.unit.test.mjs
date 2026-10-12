// T-14 · CR5 · Batalhas (Comprehensive Rules 310, com 704.5v–y, 506.4, 508.1b, 508.5, 120.3h, 115.4 e 702.19b).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge,
// consulta de 12/10/2026): Invasion of Dominaria // Serra Faithkeeper. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const CARTAS = {};
for (const c of L('oficiais-tipos.json')) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}), ...(c.defense != null ? { defense: c.defense } : {}) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // Cerco de teste: defesa 3 (do dado da carta), sem habilidade própria; o verso é uma criatura 3/3 com voar.
  'Cerco': { name: 'Cerco', self: { duplaFace: true }, back: { name: 'Verso do Cerco', types: ['creature'], subtypes: ['Angel'], colors: ['W'], power: 3, toughness: 3, keywords: ['flying'] }, ...EX },
  // Batalha sem tipo de batalha (310.9a: só o controlador protege; 310.8: com defesa 0 vai para o cemitério). A defesa vem do script.
  'Fronteira': { name: 'Fronteira', self: { defesa: 2 }, ...EX },
  'Raio': { name: 'Raio', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX },
  'Golpe': { name: 'Golpe', effects: [{ do: 'damage', amount: 2, target: 'creature' }], ...EX },
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Roubo': { name: 'Roubo', effects: [{ do: 'ganhar_controle', target: 'permanent' }], ...EX },
  'Imitação': { name: 'Imitação', effects: [{ do: 'ficha_copia', amount: 1, target: 'permanent' }], ...EX },
};
carta('Cerco', 'Battle — Siege', { defense: '3' }); carta('Fronteira', 'Battle');
carta('Raio', 'Instant'); carta('Golpe', 'Instant'); carta('Volta', 'Instant'); carta('Roubo', 'Instant'); carta('Imitação', 'Sorcery');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Vinculado', 'Creature — Cleric', { power: '2', toughness: '2', keywords: ['Lifelink'], oracle_text: 'Lifelink' });
carta('Pisoteador', 'Creature — Beast', { power: '4', toughness: '4', keywords: ['Trample'], oracle_text: 'Trample' });
carta('Aflito', 'Creature — Horror', { power: '1', toughness: '1', keywords: ['Afflict'], oracle_text: 'Afflict 2 (Whenever this creature becomes blocked, defending player loses 2 life.)' });

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
const TODAS = ['Cerco', 'Fronteira', 'Raio', 'Golpe', 'Volta', 'Roubo', 'Imitação', 'Urso', 'Vinculado', 'Pisoteador', 'Aflito', 'Invasion of Dominaria'];
function mesa(cartas = CARTAS, seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: cartas, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...TODAS, 'Plains']) }, { name: 'B', deck: baralho([...TODAS, 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p, n = 9) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += n; return s; };
const esvazia = s => { for (let i = 0; i < 20; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || s.pending.kind !== 'triggers') return s; s = act(s, { t: 'order_trigger', p: s.pending.p, index: 0 }); } return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const defesa = (s, oid) => (s.objects[oid].counters || {}).defense || 0;
const protetor = (s, oid) => E.protetorDaBatalhaT(s, s.objects[oid]);
/** Põe a batalha no campo como quem a conjurou e ela resolveu (entra de verdade: marcadores e protetor). */
function conjura(s, p, nome) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  s = esvazia(act(s, legais(s, p, a => a.t === 'cast' && a.oid === oid)[0]));
  return [s, oid];
}
/** Conjura uma mágica de `p` (com prioridade) mirando `alvo`. */
function mira(s, p, nome, alvo) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && (x.targets || []).some(t => t.oid === alvo))[0];
  assert.ok(a, `${nome} mira ${s.objects[alvo].name}`);
  return act(s, a);
}
const alvosDoAtaque = (s, p) => [...new Set(legais(s, p, a => a.t === 'attack').flatMap(a => Object.values(a.alvos || {})))];
function ataca(s, lista, alvo) {
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  return act(s, { t: 'attack', p: s.pending.p, attackers: lista, ...(alvo ? { alvos: Object.fromEntries(lista.map(o => [o, alvo])) } : {}) });
}
/** Passa até o fim do dano de combate (ou até a decisão de conjurar o Cerco derrotado), escolhendo a primeira divisão de dano. */
function aposDano(s) {
  for (let i = 0; i < 40; i++) {
    s = passaAte(s, x => ['combat_end', 'main2'].includes(x.turn.step) || (!!x.pending && !['attackers', 'blockers'].includes(x.pending.kind)));
    if (s.pending && s.pending.kind === 'dividir_dano') { s = act(s, legais(s, s.pending.p)[0]); continue; }
    return s;
  }
  return s;
}

/* ---------------- 310.4 · defesa ---------------- */
test('CR 310.4b / 310.4c · a batalha entra com marcadores de defesa iguais à defesa impressa (do dado da carta; sem o dado, da defesa do script) e a defesa no campo é o número de marcadores', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco');
  assert.equal(defesa(s, c), 3, 'Cerco: defesa 3 pelo dado da carta');
  let f; [s, f] = conjura(s, 0, 'Fronteira');
  assert.equal(defesa(s, f), 2, 'Fronteira: defesa 2 pelo script (o dado não tem defesa)');
  const semDado = { ...CARTAS, 'Invasion of Dominaria': { ...CARTAS['Invasion of Dominaria'] } }; delete semDado['Invasion of Dominaria'].defense;
  let i; [s, i] = conjura(mesa(semDado), 0, 'Invasion of Dominaria');
  assert.equal(defesa(s, i), 5, 'Invasion of Dominaria sem o dado da defesa: 5 pelo script');
  assert.equal(E.defesaDaBatalhaT(s, s.objects[i]), 5);
});

/* ---------------- 310.9 · protetor ---------------- */
test('CR 310.9a / 310.12a · ao entrar, o Cerco é protegido por um oponente de quem o controla; a batalha sem tipo de batalha, pelo próprio controlador', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco');
  assert.equal(protetor(s, c), 1, 'o Cerco de A é protegido por B');
  let f; [s, f] = conjura(s, 0, 'Fronteira');
  assert.equal(protetor(s, f), 0, 'a Fronteira de A é protegida por A');
});

/* ---------------- 310.5 / 310.9b / 508.1b · quem ataca a batalha ---------------- */
test('CR 310.5 / 310.9b / 508.1b · a batalha pode ser atacada por quem tem o protetor como jogador defensor (o Cerco, pelo próprio controlador); o protetor nunca a ataca e o pedido é recusado', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco'); let f; [s, f] = conjura(s, 0, 'Fronteira');
  let u; [s, u] = poe(s, 0, 'Urso'); let v; [s, v] = poe(s, 1, 'Urso');
  let t = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  eq(alvosDoAtaque(t, 0), [c], 'A ataca o próprio Cerco (protegido por B); a Fronteira (protegida por A) não');
  assert.throws(() => E.apply(t, { t: 'attack', p: 0, attackers: [u], alvos: { [u]: f } }), /alvo do ataque inválido/, 'A não ataca a batalha que protege');
  const ok = E.apply(t, { t: 'attack', p: 0, attackers: [u], alvos: { [u]: c } }).state;
  assert.equal(ok.objects[u].atacandoPw, c, 'o Urso ataca o Cerco');
  t = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 1);
  eq(alvosDoAtaque(t, 1), [f], 'B ataca a Fronteira de A (protegida por A); o Cerco (que B protege) não');
  assert.throws(() => E.apply(t, { t: 'attack', p: 1, attackers: [v], alvos: { [v]: c } }), /alvo do ataque inválido/, 'B não ataca o Cerco que protege');
});

/* ---------------- 310.6 / 120.3h · dano tira defesa ---------------- */
test('CR 310.6 / 120.3h / 510.1b · o dano de combate à batalha tira marcadores de defesa; o vínculo com a vida conta; nenhum jogador recebe o dano', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco'); let v; [s, v] = poe(s, 0, 'Vinculado');
  const vidas = s.players.map(p => p.life);
  s = aposDano(ataca(s, [v], c));
  assert.equal(defesa(s, c), 1, '3 − 2');
  eq(s.players.map(p => p.life), [vidas[0] + 2, vidas[1]], 'A ganha 2 pelo vínculo; B não perde nada');
  assert.equal(s.objects[c].zone, 'battlefield');
});

test('CR 702.19b · atropelar atacando a batalha: o excesso sobre o bloqueador letal vai para a batalha atacada', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco'); let p; [s, p] = poe(s, 0, 'Pisoteador'); let b; [s, b] = poe(s, 1, 'Urso');
  s = ataca(s, [p], c);
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers');
  s = act(s, { t: 'block', p: 1, blocks: [[b, p]] });
  s = aposDano(s);
  assert.equal(s.objects[b].zone, 'graveyard', 'o bloqueador recebe o letal');
  assert.equal(defesa(s, c), 1, 'os outros 2 vão para o Cerco');
});

/* ---------------- 115.4 / 120.1 · qualquer alvo ---------------- */
test('CR 115.4 / 120.1 / 120.3h · "qualquer alvo" inclui a batalha e o dano fora de combate tira defesa; "criatura alvo" não a inclui', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco');
  let r; [s, r] = poe(s, 0, 'Raio', 'hand'); s = mana(s, 0);
  assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || []).some(t => t.oid === c)).length, 'o Raio mira o Cerco');
  let g; [s, g] = poe(s, 0, 'Golpe', 'hand');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === g && (a.targets || []).some(t => t.oid === c)).length, 0, 'o Golpe (criatura alvo) não mira o Cerco');
  s = esvazia(mira(s, 0, 'Raio', c));
  assert.equal(defesa(s, c), 1);
});

/* ---------------- 310.8 / 704.5w ---------------- */
test('CR 310.8 / 704.5w · batalha que não é Cerco com defesa 0 vai para o cemitério do dono, sem gatilho nem conjuração', () => {
  let [s, f] = conjura(mesa(), 0, 'Fronteira');
  s = esvazia(mira(s, 0, 'Raio', f));
  assert.equal(s.objects[f].zone, 'graveyard');
  assert.equal(s.pending, null);
});

/* ---------------- 310.12b / 310.7 / 704.5v · Cerco derrotado ---------------- */
test('CR 310.12b / 310.7 / 704.5v · tirado o último marcador de defesa, o Cerco dispara; fica no campo enquanto o gatilho não sai da pilha; ao resolver, é exilado e pode ser conjurado transformado, sem pagar', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco');
  s = J(s); s.objects[c].counters.defense = 2;
  s = mira(s, 0, 'Raio', c);
  s = passaAte(s, x => !!x.pending || x.stack.some(o => (x.objects[o].effects || []).some(e => e.do === 'cerco_derrotado')));
  assert.equal(s.objects[c].zone, 'battlefield', '310.7: com o gatilho na pilha, o Cerco com defesa 0 fica');
  assert.equal(defesa(s, c), 0);
  s = passaAte(s, x => !!x.pending);
  assert.equal(s.objects[c].zone, 'exile', 'exilado ao resolver');
  assert.equal(s.pending && s.pending.kind, 'free_cast');
  const ofertas = legais(s, 0, a => a.t === 'cast_free');
  assert.ok(ofertas.length && ofertas.every(a => a.face === 'transformada' && a.oid === c), 'só a face transformada é oferecida: ' + JSON.stringify(ofertas));
  assert.throws(() => E.apply(s, { t: 'cast_free', p: 0, oid: c }), /transformad/, 'conjurar pela frente é recusado');
  const pool = J(s.players[0].pool);
  s = act(s, ofertas[0]);
  assert.equal(s.objects[c].zone, 'stack'); assert.equal(s.objects[c].name, 'Verso do Cerco', 'na pilha, a face de trás');
  eq(s.players[0].pool, pool, 'sem pagar');
  s = esvazia(s);
  const o = s.objects[c];
  eq([o.zone, o.name, o.frontName, o.controller], ['battlefield', 'Verso do Cerco', 'Cerco', 0], 'entra transformado');
  const st = E.stats(s, o); eq([st.power, st.toughness], [3, 3]);
  assert.equal(E.defesaDaBatalhaT(s, o), 0, 'não é mais batalha');
});

test('CR 310.12b · "you may": recusar deixa o Cerco no exílio, e ele não pode ser conjurado depois', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco');
  s = J(s); s.objects[c].counters.defense = 2;
  s = passaAte(mira(s, 0, 'Raio', c), x => !!x.pending);
  s = act(s, { t: 'decline_free', p: 0 });
  assert.equal(s.objects[c].zone, 'exile');
  assert.equal(s.objects[c].playableFromExile, undefined);
  s = esvazia(s);
  assert.equal(legais(mana(s, 0), 0, a => a.oid === c).length, 0, 'nenhuma oferta para a carta exilada');
});

test('CR 400.7 / 310.12b · o Cerco que sai do campo em resposta ao gatilho não é exilado nem conjurado (o gatilho não acha o objeto)', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco');
  s = J(s); s.objects[c].counters.defense = 2;
  s = mira(s, 0, 'Raio', c);
  s = passaAte(s, x => x.stack.some(o => (x.objects[o].effects || []).some(e => e.do === 'cerco_derrotado')));
  s = esvazia(mira(s, 0, 'Volta', c));
  assert.equal(s.objects[c].zone, 'hand', 'devolvido à mão');
  assert.equal(s.pending, null, 'nada a conjurar');
  assert.equal(s.objects[c].playableFromExile, undefined);
});

/* ---------------- 310.11 / 704.5y · protetor que não pode ser ---------------- */
test('CR 310.11 / 704.5y / 310.12a · quando o protetor passa a controlar o Cerco, ele deixa de poder protegê-lo: o protetor vira o outro jogador, e agora quem o controla pode atacá-lo', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = esvazia(mira(s, 1, 'Roubo', c));
  assert.equal(s.objects[c].controller, 1);
  assert.equal(protetor(s, c), 0, 'A protege o Cerco que B passou a controlar');
  let u; [s, u] = poe(s, 1, 'Urso');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 1);
  eq(alvosDoAtaque(s, 1), [c], 'B ataca o Cerco que agora controla');
});

/* ---------------- 506.4 · removida do combate ---------------- */
test('CR 506.4 / 506.4c · o protetor da batalha atacada muda no meio do combate: ela sai do combate e quem a atacava não causa dano a ninguém', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco'); let u; [s, u] = poe(s, 0, 'Urso');
  const vidas = s.players.map(p => p.life);
  s = ataca(s, [u], c);
  s = act(s, { t: 'pass', p: 0 });
  assert.equal(s.turn.priority, 1, 'B recebe prioridade no passo de atacar');
  s = mira(s, 1, 'Roubo', c);
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  assert.equal(protetor(s, c), 0, 'o protetor mudou');
  s = aposDano(s);
  assert.equal(defesa(s, c), 3, 'o Cerco não recebe o dano');
  eq(s.players.map(p => p.life), vidas, 'nenhum jogador recebe o dano');
});

/* ---------------- 508.5 · jogador defensor ---------------- */
test('CR 508.5 / 310.9d · o "jogador defensor" de quem ataca a batalha é o protetor dela (aflição: quem perde vida é B, que protege o Cerco de A)', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco'); let a; [s, a] = poe(s, 0, 'Aflito'); let b; [s, b] = poe(s, 1, 'Urso');
  const vidas = s.players.map(p => p.life);
  s = ataca(s, [a], c);
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers');
  s = act(s, { t: 'block', p: 1, blocks: [[b, a]] });
  s = esvazia(s);
  eq(s.players.map(p => p.life), [vidas[0], vidas[1] - 2], 'B perde 2');
});

/* ---------------- 707.8a / 310.4b · cópia ---------------- */
test('CR 707.2 / 310.4b / 310.12a · a ficha cópia de um Cerco entra com a defesa impressa e um oponente de quem a controla como protetor', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco');
  s = J(s); s.objects[c].counters.defense = 1;
  s = esvazia(mira(s, 0, 'Imitação', c));
  const ficha = Object.values(s.objects).find(o => o.token && o.zone === 'battlefield' && o.name === 'Cerco');
  assert.ok(ficha, 'a ficha cópia do Cerco');
  eq([ficha.controller, defesa(s, ficha.oid), protetor(s, ficha.oid)], [0, 3, 1], 'de A, defesa 3 (a impressa, não os marcadores do original), protegida por B');
});

/* ---------------- 310.10 ---------------- */
test('CR 310.10 · batalha anexada a uma permanente se solta (ação de estado)', () => {
  let [s, c] = conjura(mesa(), 0, 'Cerco'); let u; [s, u] = poe(s, 0, 'Urso');
  s = J(s); s.objects[c].attachedTo = u;
  s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[c].attachedTo, undefined);
  assert.equal(s.objects[c].zone, 'battlefield');
});

/* ---------------- forma do script ---------------- */
test('validador · self.defesa é um número inteiro, 0 ou mais', () => {
  const v = d => S.validateScript({ name: 'X', self: { defesa: d }, ...EX });
  eq(v(4), []);
  assert.ok(v(-1).some(e => /defesa/.test(e)));
  assert.ok(v('3').some(e => /defesa/.test(e)));
});

/* ---------------- carta exemplo ---------------- */
test("Invasion of Dominaria (texto oficial, Oracle do Forge, 12/10/2026) · completa: entra com 5 de defesa protegida por B e ganha 4 e compra 1; derrotada, vira Serra Faithkeeper 4/4 branca, voar e vigilância, sem pagar", () => {
  let s = mesa();
  const mao = s.zones[0].hand.length, vida0 = s.players[0].life;
  let i; [s, i] = conjura(s, 0, 'Invasion of Dominaria');
  eq([defesa(s, i), protetor(s, i), s.players[0].life - vida0, s.zones[0].hand.length - mao], [5, 1, 4, 1]);
  s = J(s); s.objects[i].counters.defense = 2;
  s = passaAte(mira(s, 0, 'Raio', i), x => !!x.pending);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast_free')[0]));
  const o = s.objects[i], st = E.stats(s, o);
  eq([o.zone, o.name, st.power, st.toughness], ['battlefield', 'Serra Faithkeeper', 4, 4]);
  assert.ok(E.hasKeyword(s, o, 'flying') && E.hasKeyword(s, o, 'vigilance'), 'voar e vigilância');
  assert.ok(E.isCreature(s, o));
  const sc = S.SCRIPTS['Invasion of Dominaria']; assert.ok(sc && sc.covers !== 'partial', 'script completo');
});
