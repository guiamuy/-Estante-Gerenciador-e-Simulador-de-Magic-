// M-544 · LT206 · revisão por lote CLXXXII (texto da Scryfall de 20/10/2026): The Sackville-Bagginses ("When The Sackville-Bagginses enter,
// you may sacrifice another creature or artifact. If you do, draw a card and create a Treasure token. / Whenever you sacrifice a token, target
// opponent loses 1 life."). Custo opcional do gatilho (sacrificar outra; a própria não serve) e gatilho de sacrificar ficha. Falha no motor
// anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const SB = 'The Sackville-Bagginses';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['B'], power: c.power, toughness: c.toughness }; };
const C = { [SB]: of(SB) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Swamp: terra('Swamp', 'Swamp', 'B'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Altar: { name: 'Altar', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Copiar: { name: 'Copiar', type_line: 'Sorcery', mana_cost: '{B}', cmc: 1, keywords: [], oracle_text: '', colors: ['B'] } });
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = { Altar: { name: 'Altar', abilities: [{ kind: 'activated', cost: { sacrificeOther: { types: ['artifact', 'creature'] } }, effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'activate:0', target: 'none', expect: { selfLife: 0 } } },
  Copiar: { name: 'Copiar', effects: [{ do: 'ficha_copia', amount: 1, target: { tipos: ['creature'], de: 'you' } }], ...EX } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 226, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([SB, 'Urso', 'Pedra', 'Altar', 'Copiar', 'Swamp']) }, { name: 'B', deck: b(['Urso', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const ateDecisao = s => passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));
const conjura = s => { const sb = s.zones[0].hand.find(o => s.objects[o].name === SB); s = terras(s, 0, 'Swamp', 2); return ateDecisao(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sb)[0])); };
const tesouros = s => s.zones[0].battlefield.filter(o => s.objects[o].name === 'Treasure');

test('M-544 · The Sackville-Bagginses joga (lida e aprovada)', () => { assert.equal(S.coverage(of(SB)).level, 'completo'); });

test('M-544 · ao entrar pode sacrificar outra criatura ou artefato (a própria não): se sacrificar, compra e cria um Tesouro', () => {
  let s = mesa(), u, pd; [s] = poe(s, 0, SB, 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, pd] = poe(s, 0, 'Pedra');
  s = conjura(s); assert.equal(s.pending && s.pending.kind, 'may_pay');
  const ofs = legais(s, 0, a => a.t === 'pay'); const sb = s.zones[0].battlefield.find(o => s.objects[o].name === SB);
  assert.deepEqual(Array.from(ofs, a => [].concat(a.pay.sacrifice)[0]).sort(), [u, pd].sort(), 'Urso e Pedra; a própria fica de fora');
  const mao = s.zones[0].hand.length; s = limpa(act(s, ofs.find(a => [].concat(a.pay.sacrifice)[0] === pd)));
  assert.equal(s.objects[pd].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, mao + 1, 'compra'); assert.equal(tesouros(s).length, 1, 'Tesouro'); assert.equal(s.objects[sb].zone, 'battlefield');
  let t = mesa(); [t] = poe(t, 0, SB, 'hand'); [t] = poe(t, 0, 'Urso'); t = conjura(t); const m2 = t.zones[0].hand.length;
  t = limpa(act(t, { t: 'decline', p: 0 })); assert.equal(t.zones[0].hand.length, m2, 'recusar: nada'); assert.equal(tesouros(t).length, 0);
  let v = mesa(); [v] = poe(v, 0, SB, 'hand'); v = conjura(v); assert.ok(!v.pending || v.pending.kind !== 'may_pay', 'sem outra criatura ou artefato, não pergunta'); v = limpa(v); assert.equal(tesouros(v).length, 0);
});

test('M-544 · sacrificar uma ficha faz o oponente perder 1 (o Tesouro criado e sacrificado para mana); sacrificar carta não', () => {
  let s = mesa(), pd; [s] = poe(s, 0, SB, 'hand'); [s, pd] = poe(s, 0, 'Pedra'); s = conjura(s);
  const vida0 = s.players[1].life; s = limpa(act(s, legais(s, 0, a => a.t === 'pay')[0]));
  assert.equal(s.players[1].life, vida0, 'sacrificar a Pedra (carta) não faz perder');
  const tz = tesouros(s)[0]; s = act(s, legais(s, 0, a => a.oid === tz)[0]); s = limpa(s);
  assert.equal(s.objects[tz] == null || s.objects[tz].zone !== 'battlefield', true, 'o Tesouro saiu'); assert.equal(s.players[1].life, vida0 - 1, 'ficha sacrificada: perde 1');
});

test('M-544 · achados da revisão: a ficha-cópia do Sackville sacrificada dispara o próprio gatilho (603.10a); a pergunta diz "sacrificar"', () => {
  let s = mesa(), sb, al, cp; [s, sb] = poe(s, 0, SB); [s, al] = poe(s, 0, 'Altar'); [s, cp] = poe(s, 0, 'Copiar', 'hand'); s = terras(s, 0, 'Swamp', 1);
  s = ateDecisao(act(s, { t: 'cast', p: 0, oid: cp, targets: [{ oid: sb }] }));
  for (let i = 0; i < 8 && s.pending; i++) { const la = legais(s, s.pending.p), tok = s.zones[0].battlefield.find(o => s.objects[o].name === SB && s.objects[o].token);
    s = ateDecisao(act(s, s.pending.kind === 'legend' ? la.find(a => a.oid === tok) : la.find(a => a.t === 'decline') || la[0])); }
  s = limpa(s); const tok = s.zones[0].battlefield.find(o => s.objects[o].name === SB && s.objects[o].token); assert.ok(tok, 'a ficha-cópia ficou');
  const v = s.players[1].life; s = limpa(act(s, legais(s, 0, k => k.t === 'activate' && k.oid === al && k.pay && [].concat(k.pay.sacrifice)[0] === tok)[0]));
  assert.equal(v - s.players[1].life, 1, 'a ficha sacrificada era ela mesma: perde 1');
  const tx = T.textoDoCustoOpcionalM({ sacrificeOther: { types: ['creature', 'artifact'] } }, SB);
  assert.equal(tx.botao, 'Sacrificar'); assert.match(tx.titulo, /sacrificar outra criatura ou artefato/);
  assert.equal(T.textoDoCustoOpcionalM({ exileFromGraveyard: { types: ['creature'] } }, 'X').botao, 'Exilar', 'o exílio do cemitério como antes');
});
