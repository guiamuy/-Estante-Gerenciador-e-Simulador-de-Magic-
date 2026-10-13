// M-367 · LT39 · Energia (107.14 / 122.1) e "attach it to target creature you control" — revisão por lote XXX: Inventor's Axe (texto: corpus do Oracle do
// Forge, consulta de 12/10/2026, guardado em .listas/oficiais-revisadas.json). Todos os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L, scripts: S } = loadModules();

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const ia = OF.find(x => x.name === "Inventor's Axe");
const carta = { name: ia.name, type_line: ia.type_line, mana_cost: ia.mana_cost, cmc: 1, keywords: ['Flash'], oracle_text: ia.oracle_text, colors: ['R'] };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 2, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const lido = L.ler(carta);
const cards = { "Inventor's Axe": carta, Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }) };
const scripts = { "Inventor's Axe": { ...lido.script, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesaE(seed = 19) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(["Inventor's Axe", 'Urso', 'Mountain']) }, { name: 'B', deck: baralho(['Plains', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 12 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }); return s; };

test('LT39 · leitor: Inventor\'s Axe lida por inteiro — energia ao entrar, anexar ao entrar, +2/+0 e "Equip—Pay {E}{E}"', () => {
  assert.equal(lido.completa, true, JSON.stringify(lido.frases));
  assert.deepEqual(JSON.parse(JSON.stringify(lido.script.equip)), { enchant: 'creature', cost: { energia: 2 } });
  assert.deepEqual([...S.validateScript(scripts["Inventor's Axe"])], []);
});

test('LT39 · 107.14: ao entrar você ganha {E}{E} e o Machado se anexa à criatura alvo sua (+2/+0); equipar de novo custa os dois marcadores de energia', () => {
  let s = mesaE(), ax, u1, u2;
  [s, ax] = poe(s, 0, "Inventor's Axe", 'hand'); [s, u1] = poe(s, 0, 'Urso'); [s, u2] = poe(s, 0, 'Urso');
  const m = comMana(s, 'R'); let t = tudo(act(m, legais(m, 0, a => a.t === 'cast' && a.oid === ax)[0]));
  assert.equal(t.players[0].energia, 2, 'ganhou dois marcadores de energia');
  const anexo = t.objects[ax].attachedTo; assert.ok([u1, u2].includes(anexo), 'anexou a uma das criaturas');
  const st = E.stats(t, t.objects[anexo]); assert.deepEqual([st.power, st.toughness], [4, 2]);
  const outra = anexo === u1 ? u2 : u1;
  const eq = legais(t, 0, a => a.t === 'activate' && a.oid === ax && (a.targets || []).some(x => x.oid === outra)); assert.ok(eq.length, 'equipar pagando energia é oferecido sem mana');
  t = tudo(act(t, eq[0]));
  assert.equal(t.objects[ax].attachedTo, outra); assert.equal(t.players[0].energia || 0, 0, 'pagou {E}{E}');
  assert.equal(legais(t, 0, a => a.t === 'activate' && a.oid === ax).length, 0, 'sem energia, equipar não é oferecido');
  assert.throws(() => E.apply(t, { ...eq[0], targets: [{ oid: anexo }] }), /energia/);
});
