// T-16 · CR5 · Equipamento completo (Comprehensive Rules 301.5, com 704.5n e 702.6). Fortificação (301.6 / 702.67) fica fora.
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-revisadas.json (Oracle do Forge,
// consulta de 12/10/2026): Bonesplitter. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => { const o = JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')); return Array.isArray(o) ? o : o.cartas; };
const CARTAS = {};
for (const c of L('oficiais-revisadas.json').filter(x => x.name === 'Bonesplitter')) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: [] };
for (const [n, k] of Object.entries({ Plains: 'W', Mountain: 'R' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // Equipamento de teste que concede uma ativada à criatura equipada ("{1}: ganhe 1"; sem {T}, porque a criatura roubada fica com enjoo) — 301.5d.
  'Bastão': { name: 'Bastão', equip: { enchant: 'creature', cost: { mana: '{1}' } }, grants: { activated: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'gain', amount: 1 }] }] }, ...EX },
  // "O artefato alvo vira uma criatura artefato 3/3 até o fim do turno."
  'Animar': { name: 'Animar', effects: [{ do: 'continuo', target: { tipos: ['artifact'] }, torna: { tipos: ['artifact', 'creature'], base: [3, 3], somaTipos: true }, ate: 'fim-do-turno' }], ...EX },
  // "O artefato alvo vira um artefato Golem (perde os outros subtipos) até o fim do turno."
  'Desmonte': { name: 'Desmonte', effects: [{ do: 'continuo', target: { tipos: ['artifact'] }, torna: { tipos: ['artifact'], subtipos: ['Golem'] }, ate: 'fim-do-turno' }], ...EX },
  // T-17 · "exile a permanente alvo e devolva-a ao campo" (lampejo) e "crie uma ficha que é cópia do artefato alvo"
  'Lampejo': { name: 'Lampejo', effects: [{ do: 'exile', target: 'permanent' }, { do: 'mover', target: 'first-target', de: 'exile', para: 'battlefield', controle: 'dono' }], ...EX },
  'Cópia': { name: 'Cópia', effects: [{ do: 'ficha_copia', amount: 1, target: 'artifact' }], ...EX },
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Roubo': { name: 'Roubo', effects: [{ do: 'ganhar_controle', target: 'permanent' }], ...EX },
};
carta('Bastão', 'Artifact — Equipment'); carta('Animar', 'Instant'); carta('Desmonte', 'Instant'); carta('Lampejo', 'Instant'); carta('Cópia', 'Instant'); carta('Volta', 'Instant'); carta('Roubo', 'Instant');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
const TODAS = ['Bonesplitter', 'Bastão', 'Animar', 'Desmonte', 'Lampejo', 'Cópia', 'Volta', 'Roubo', 'Urso'];
function mesa(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...TODAS, 'Plains']) }, { name: 'B', deck: baralho([...TODAS, 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p, n = 9) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += n; return s; };
const esvazia = s => { for (let i = 0; i < 20; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || s.pending.kind !== 'triggers') return s; s = act(s, { t: 'order_trigger', p: s.pending.p, index: 0 }); } return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
const equipa = (s, p, e, alvo) => legais(mana(s, p), p, a => a.t === 'activate' && a.oid === e && E.abilitiesOf(s, s.objects[e]).filter(x => x.kind === 'activated')[a.index || 0].equip && (a.targets || []).some(t => t.oid === alvo))[0];
function mira(s, p, nome, alvo) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && (x.targets || []).some(t => t.oid === alvo))[0];
  assert.ok(a, `${nome} mira ${s.objects[alvo].name}`);
  return act(s, a);
}

/* ---------------- 301.5b · quem não pode equipar não se move ---------------- */
test('CR 301.5b / 400.7 · a habilidade de equipar que resolve depois de o Equipamento sair do campo não anexa nada (o Equipamento "não se move")', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, 'Bonesplitter'); let u; [s, u] = poe(s, 0, 'Urso');
  const a = equipa(s, 0, b, u); assert.ok(a, 'equipar oferecido');
  s = act(mana(s, 0), a);
  s = esvazia(mira(s, 0, 'Volta', b));
  eq([s.objects[b].zone, s.objects[b].attachedTo, pt(s, u)], ['hand', undefined, [2, 2]], 'o Equipamento foi para a mão e nada ficou anexado');
});

/* ---------------- 301.5c ---------------- */
test('CR 301.5c / 704.5n · o Equipamento que vira criatura se solta (ação de estado) e fica no campo; a criatura deixa de ser equipada', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, 'Bonesplitter'); let u; [s, u] = poe(s, 0, 'Urso');
  s = esvazia(act(mana(s, 0), equipa(s, 0, b, u)));
  eq([s.objects[b].attachedTo, pt(s, u)], [u, [4, 2]], 'equipado: +2/+0');
  s = esvazia(mira(s, 0, 'Animar', b));
  eq([s.objects[b].zone, s.objects[b].attachedTo, pt(s, u), pt(s, b)], ['battlefield', undefined, [2, 2], [3, 3]]);
});

test('CR 301.5c · o Equipamento que é criatura não equipa ninguém (nem a si mesmo): a habilidade resolve sem anexar', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, 'Bonesplitter'); let u; [s, u] = poe(s, 0, 'Urso');
  s = esvazia(mira(s, 0, 'Animar', b));
  for (const alvo of [u, b]) {
    const a = equipa(s, 0, b, alvo); if (!a) continue;
    const t = esvazia(act(mana(s, 0), a));
    eq([t.objects[b].attachedTo, pt(t, u)], [undefined, [2, 2]], 'nada anexado ao mirar ' + t.objects[alvo].name);
  }
});

/* ---------------- 301.5d ---------------- */
test('CR 301.5d · controles separados: a criatura equipada que muda de controle continua equipada; quem controla o Equipamento ativa o equipar, e a habilidade concedida é ativada por quem controla a criatura', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, 'Bastão'); let u; [s, u] = poe(s, 0, 'Urso');
  s = esvazia(act(mana(s, 0), equipa(s, 0, b, u)));
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = esvazia(mira(s, 1, 'Roubo', u));
  eq([s.objects[u].controller, s.objects[b].controller, s.objects[b].attachedTo], [1, 0, u], 'B controla o Urso; A, o Bastão; continua anexado');
  const concedida = p => legais(mana(s, p), p, a => a.t === 'activate' && a.oid === u).length;
  eq([concedida(1) > 0, concedida(0)], [true, 0], 'só B ativa a habilidade concedida ao Urso');
  assert.equal(legais(mana(s, 1), 1, a => a.t === 'activate' && a.oid === b).length, 0, 'B não ativa o equipar do Bastão de A');
});

/* ---------------- carta exemplo ---------------- */
test('Bonesplitter (texto oficial, Oracle do Forge, 12/10/2026) · equipar {1} só como feitiço, em criatura sua; +2/+0; reequipar move; a criatura que sai do campo deixa o Equipamento no campo, solto', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, 'Bonesplitter'); let u; [s, u] = poe(s, 0, 'Urso'); let v; [s, v] = poe(s, 0, 'Urso'); let w; [s, w] = poe(s, 1, 'Urso');
  assert.ok(!equipa(s, 0, b, w), 'não equipa criatura do oponente');
  s = esvazia(act(mana(s, 0), equipa(s, 0, b, u)));
  eq(pt(s, u), [4, 2]);
  s = esvazia(act(mana(s, 0), equipa(s, 0, b, v)));
  eq([pt(s, u), pt(s, v), s.objects[b].attachedTo], [[2, 2], [4, 2], v], 'reequipar move');
  s = esvazia(mira(s, 0, 'Volta', v));
  eq([s.objects[b].zone, s.objects[b].attachedTo], ['battlefield', undefined]);
});

test('CR 301.5c · o Equipamento que perde o subtipo Equipment se solta e não equipa mais', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, 'Bonesplitter'); let u; [s, u] = poe(s, 0, 'Urso');
  s = esvazia(act(mana(s, 0), equipa(s, 0, b, u)));
  s = esvazia(mira(s, 0, 'Desmonte', b));
  assert.equal(E.ehEquipamentoT(s, s.objects[b]), false, 'perdeu o subtipo');
  eq([s.objects[b].attachedTo, pt(s, u)], [undefined, [2, 2]]);
  const a = equipa(s, 0, b, u); if (a) assert.equal(esvazia(act(mana(s, 0), a)).objects[b].attachedTo, undefined, 'não equipa');
});

/* ---------------- T-17 · correções da auditoria independente ---------------- */
test('CR 400.7 / 301.5b · o Equipamento que sai e volta ao campo (lampejo) em resposta ao equipar é outro objeto: a habilidade não o anexa', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, 'Bonesplitter'); let u; [s, u] = poe(s, 0, 'Urso');
  s = act(mana(s, 0), equipa(s, 0, b, u));
  s = esvazia(mira(s, 0, 'Lampejo', b));
  eq([s.objects[b].zone, s.objects[b].attachedTo, pt(s, u)], ['battlefield', undefined, [2, 2]]);
});

test('CR 301.5b / 111.7 · a ficha de Equipamento que deixa de existir com o equipar na pilha: a habilidade resolve sem efeito, e a partida segue', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, 'Bonesplitter'); let u; [s, u] = poe(s, 0, 'Urso');
  s = esvazia(mira(s, 0, 'Cópia', b));
  const f = Object.values(s.objects).find(o => o.token && o.zone === 'battlefield' && o.name === 'Bonesplitter'); assert.ok(f, 'a ficha cópia');
  s = act(mana(s, 0), equipa(s, 0, f.oid, u));
  s = esvazia(mira(s, 0, 'Volta', f.oid));
  eq([!!s.objects[f.oid], pt(s, u), s.stack.length], [false, [2, 2], 0]);
});

test('CR 701.3b · equipar de novo a criatura que já está equipada por ele não faz nada (o carimbo de tempo do anexo não muda)', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, 'Bonesplitter'); let u; [s, u] = poe(s, 0, 'Urso');
  s = esvazia(act(mana(s, 0), equipa(s, 0, b, u)));
  const antes = s.objects[b].anexadaEm;
  const r = E.apply(mana(s, 0), equipa(s, 0, b, u)); let t = r.state;
  t = esvazia(t);
  eq([t.objects[b].attachedTo, t.objects[b].anexadaEm], [u, antes]);
});
