// T-53 · CR5 · "Entra transformada" vinda de outra zona (Comprehensive Rules 712.14a, com 712.14 e 701.27e).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas "de teste": scripts sintéticos que isolam a regra (a opção `transformada` do
// efeito `mover`, que é como as cartas dizem "return it to the battlefield transformed / converted").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S as SC, T, J, act, poe, legais, passaAte } from './listas.mjs';

const C = {};
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{B}', cmc: 1, keywords: [], oracle_text: '', colors: ['B'], ...extra }; };
C.Swamp = { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // "Return target creature card from your graveyard to the battlefield transformed."
  'Volta Lunar': { name: 'Volta Lunar', effects: [{ do: 'mover', target: 'creature-in-your-graveyard', de: 'graveyard', para: 'battlefield', transformada: true }], ...EX },
  // dupla face: o verso ganha 2 de vida ao entrar e 5 ao transformar
  'Cultista': { name: 'Cultista', self: { duplaFace: true },
    back: { name: 'Cultista Desperto', types: ['creature'], subtypes: ['Horror'], colors: ['B'], power: 4, toughness: 4,
      abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'gain', amount: 2 }] }, { kind: 'triggered', when: 'transforms', effects: [{ do: 'gain', amount: 5 }] }] }, ...EX },
  // "When this creature dies, return it to the battlefield transformed under its owner's control." (verso planeswalker com lealdade 3)
  'Mago Caido': { name: 'Mago Caido', self: { duplaFace: true }, abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'mover', target: 'self-source', de: 'graveyard', para: 'battlefield', controle: 'dono', transformada: true }] }],
    back: { name: 'Mago Ascendido', types: ['planeswalker'], subtypes: ['Wizard'], colors: ['B'], loyalty: 3, loyaltyAbilities: [{ cost: 1, effects: [{ do: 'gain', amount: 1 }] }] }, ...EX },
  // modal: frente feitiço, verso terreno (712.14b)
  'Rito Duplo': { name: 'Rito Duplo', self: { modal: true }, effects: [{ do: 'gain', amount: 1 }], back: { name: 'Poço Duplo', types: ['land'], produces: [['B']] }, ...EX },
  // "Return target card from your graveyard to the battlefield."
  'Ressurgir': { name: 'Ressurgir', effects: [{ do: 'mover', target: 'card-in-your-graveyard', de: 'graveyard', para: 'battlefield' }], ...EX },
  // T-55 · frente "entra virada" e "entra com 2 marcadores +1/+1"; o verso não tem nada disso
  'Vigia Torto': { name: 'Vigia Torto', entersTapped: true, self: { duplaFace: true, entersWithCounters: 2 }, back: { name: 'Vigia Erguido', types: ['creature'], subtypes: ['Horror'], colors: ['B'], power: 3, toughness: 3 }, ...EX },
  // T-55 · frente Aura (encantar criatura sua), verso terreno — o padrão de Journey to Eternity // Atzal
  'Jornada Teste': { name: 'Jornada Teste', aura: { enchant: 'creature-you-control' }, self: { duplaFace: true }, back: { name: 'Cidade Teste', types: ['land'], produces: [['B']] }, ...EX },
  'Volta Qualquer': { name: 'Volta Qualquer', effects: [{ do: 'mover', target: 'card-in-your-graveyard', de: 'graveyard', para: 'battlefield', transformada: true }], ...EX },
  'Golpe': { name: 'Golpe', effects: [{ do: 'destroy', target: 'creature' }], ...EX },
};
carta('Volta Lunar', 'Sorcery'); carta('Golpe', 'Instant'); carta('Rito Duplo', 'Sorcery'); carta('Ressurgir', 'Sorcery'); carta('Volta Qualquer', 'Sorcery');
carta('Vigia Torto', 'Creature — Human', { power: '1', toughness: '1' }); carta('Jornada Teste', 'Legendary Enchantment — Aura');
carta('Cultista', 'Creature — Human Cleric', { power: '1', toughness: '1' });
carta('Mago Caido', 'Creature — Human Wizard', { power: '2', toughness: '2' });
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });

function mesa(seed = 1) {
  const deck = [{ name: 'Swamp', qty: 20, zone: 'main' }, { name: 'Volta Lunar', qty: 6, zone: 'main' }, { name: 'Golpe', qty: 4, zone: 'main' }, { name: 'Cultista', qty: 4, zone: 'main' }, { name: 'Mago Caido', qty: 3, zone: 'main' }, { name: 'Urso', qty: 3, zone: 'main' }, { name: 'Rito Duplo', qty: 2, zone: 'main' }, { name: 'Ressurgir', qty: 2, zone: 'main' }, { name: 'Volta Qualquer', qty: 2, zone: 'main' }, { name: 'Vigia Torto', qty: 1, zone: 'main' }, { name: 'Jornada Teste', qty: 1, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const conjura = (s, p, nome, filtro = () => true) => { let o; [s, o] = poe(s, p, nome, 'hand'); s = mana(s, p); const of = legais(s, p, a => a.t === 'cast' && a.oid === o && filtro(a)); assert.ok(of.length, `${nome}: conjurável`); return [esvazia(act(s, of[0])), o]; };

test('CR 712.14a · "return … to the battlefield transformed": a dupla face entra com o verso para cima; o gatilho de entrar do verso dispara, o de transformar não (701.27e)', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, 'Cultista', 'graveyard');
  const vida = s.players[0].life;
  [s] = conjura(s, 0, 'Volta Lunar', a => a.targets[0].oid === c);
  const o = s.objects[c];
  eq([o.zone, o.name, E.stats(s, o).power, s.players[0].life - vida], ['battlefield', 'Cultista Desperto', 4, 2]);
});

test('CR 712.14a · carta que não é de dupla face mandada entrar transformada fica onde está', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso', 'graveyard');
  [s] = conjura(s, 0, 'Volta Lunar', a => a.targets[0].oid === u);
  eq(s.objects[u].zone, 'graveyard');
});

test('CR 712.14 · sem "transformed", a dupla face entra com a frente para cima (o caminho de sempre)', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, 'Cultista', 'graveyard');
  const sc = J(SCRIPTS['Volta Lunar']); sc.effects[0].transformada = undefined;
  s = J(s); s.facts['Volta Lunar'].script.effects = sc.effects;
  [s] = conjura(s, 0, 'Volta Lunar', a => a.targets[0].oid === c);
  eq([s.objects[c].zone, s.objects[c].name], ['battlefield', 'Cultista']);
});

test('CR 712.14a / 306.5b · o verso planeswalker entra com a lealdade dele ("When this dies, return it transformed")', () => {
  let s = mesa(); let m; [s, m] = poe(s, 0, 'Mago Caido', 'battlefield');
  [s] = conjura(s, 0, 'Golpe', a => a.targets[0].oid === m);
  const o = s.objects[m];
  eq([o.zone, o.name, (o.counters || {}).loyalty], ['battlefield', 'Mago Ascendido', 3]);
});

test('CR 302.6 · entrou transformada numa criatura: enjoada no turno em que entrou', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, 'Cultista', 'graveyard');
  [s] = conjura(s, 0, 'Volta Lunar', a => a.targets[0].oid === c);
  eq(!!s.objects[c].sick, true);
});

test('Validador e frase · "transformada" só vale para o campo; a pilha explica "…, transformada"', () => {
  eq(SC.validateScript(SCRIPTS['Volta Lunar']), []);
  assert.ok(SC.validateScript({ name: 'X', effects: [{ do: 'mover', target: 'creature-in-your-graveyard', para: 'hand', transformada: true }], ...EX }).some(e => /transformada/.test(e)));
  assert.match(T.descreveEfeitos(SCRIPTS['Volta Lunar'].effects), /no campo sob o seu controle, transformada/);
});

test('CR 712.14b · a dupla face modal cuja frente não é de permanente, mandada ao campo por um efeito, fica onde está', () => {
  let s = mesa(); let r; [s, r] = poe(s, 0, 'Rito Duplo', 'graveyard');
  [s] = conjura(s, 0, 'Ressurgir', a => a.targets[0].oid === r);
  eq([s.objects[r].zone, s.objects[r].name], ['graveyard', 'Rito Duplo']);
});

/* ---------------- T-55 · correções da auditoria independente ---------------- */
test('CR 614.12 / 712.14a · as substituições de entrada olham a face que entra: o "entra virada" e o "entra com marcadores" da frente não valem para o verso (D1)', () => {
  let s = mesa(); let v; [s, v] = poe(s, 0, 'Vigia Torto', 'graveyard');
  [s] = conjura(s, 0, 'Volta Lunar', a => a.targets[0].oid === v);
  const o = s.objects[v];
  eq([o.name, !!o.tapped, (o.counters || {}).p1p1 || 0], ['Vigia Erguido', false, 0]);
});

test('CR 303.4g / 712.14a · frente Aura sem nada para encantar, verso terreno: entra transformada como terreno (D2)', () => {
  let s = mesa(); let j; [s, j] = poe(s, 0, 'Jornada Teste', 'graveyard');
  for (const oid of [...s.zones[0].battlefield]) if (E.tiposDe(s, s.objects[oid]).includes('creature')) s = act(s, { t: 'pass', p: s.turn.priority }); // nenhuma criatura nossa no campo (a mesa começa vazia)
  [s] = conjura(s, 0, 'Volta Qualquer', a => a.targets[0].oid === j);
  eq([s.objects[j].zone, s.objects[j].name], ['battlefield', 'Cidade Teste']);
});

test('Registro · a carta que entra transformada diz a face que ficou para cima (D6)', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, 'Cultista', 'graveyard'); s = mana(s);
  let x; [s, x] = poe(s, 0, 'Volta Lunar', 'hand'); s = mana(s);
  let t = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === x && a.targets[0].oid === c)[0]), linhas = [];
  for (let i = 0; i < 6 && t.stack.length; i++) { const pa = { t: 'pass', p: t.turn.priority }, r = E.apply(t, pa); linhas = linhas.concat(T.describe(t, pa, r.events, r.state).map(String)); t = r.state; }
  assert.ok(linhas.some(l => /Cultista foi para o campo transformada: agora é Cultista Desperto/.test(l)), JSON.stringify(linhas));
});
