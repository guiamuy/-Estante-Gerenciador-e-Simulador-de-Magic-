// M-558 · LT217 · revisão por lote CXCIII (textos e rulings da Scryfall de 22/10/2026): Grim Monolith, Mana Vault e Basalt Monolith — "This artifact
// doesn't untap during your untap step" (502.3) pelo leitor; Mana Vault: "At the beginning of your upkeep, you may pay {4}. If you do, untap this
// artifact." (custo opcional do gatilho) e "At the beginning of your draw step, if this artifact is tapped, it deals 1 damage to you." (603.4). Falha no
// motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = n => OF.find(x => x.name === n);
const carta = (n, cmc) => { const o = of(n); return { name: n, type_line: o.type_line, mana_cost: o.mana_cost, cmc, keywords: [], oracle_text: o.oracle_text, colors: [] }; };
const GM = 'Grim Monolith', MV = 'Mana Vault', BM = 'Basalt Monolith';
const C = { [GM]: carta(GM, 2), [MV]: carta(MV, 1), [BM]: carta(BM, 3),
  QuebraA: { name: 'QuebraA', type_line: 'Instant', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 240, mode: 'full', cards: C, scripts: { QuebraA: { name: 'QuebraA', effects: [{ do: 'destroy', target: 'artifact' }], example: { target: 'enemy-creature', expect: { gone: true } } } }, first: 0, players: [
    { name: 'A', deck: b([[GM, 2], [MV, 2], [BM, 2], ['QuebraA', 2], ['Island', 32]]) }, { name: 'B', deck: b([['Island', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ilhas = (s, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, 'Island'); return s; };
const proximoTurnoDeA = (s, passo) => passaAte(s, x => (x.turn.active === 0 && x.turn.number > s.turn.number && (x.turn.step === passo || !!x.pending)), 600);

test('M-558 · as três jogam (lidas e aprovadas)', () => { for (const n of [GM, MV, BM]) assert.equal(S.coverage(C[n]).level, 'completo', n); });

test('M-558 · Grim Monolith e Basalt Monolith: virados não desviram no passo de desvirar; a ativada desvira', () => {
  for (const [nome, custo] of [[GM, 4], [BM, 3]]) {
    let s = mesa(), g; [s, g] = poe(s, 0, nome, 'battlefield', { tapped: true }); s = ilhas(s, custo);
    s = proximoTurnoDeA(s, 'main1'); assert.equal(s.objects[g].tapped, true, `${nome}: continua virado no turno seguinte`);
    const des = legais(s, 0, a => a.t === 'activate' && a.oid === g); assert.ok(des.length, `${nome}: a ativada de desvirar é oferecida`);
    s = passaAte(act(s, des[0]), x => !x.stack.length || !!x.pending); assert.equal(s.objects[g].tapped, false, `${nome}: {${custo}} desvira`);
  }
});

test('M-558 · Mana Vault: na manutenção pode pagar {4} para desvirar; no passo de compra, virado, causa 1 de dano a quem controla', () => {
  let s = mesa(), v; [s, v] = poe(s, 0, MV, 'battlefield', { tapped: true }); s = ilhas(s, 4);
  const t0 = s.turn.number; s = passaAte(s, x => x.turn.active === 0 && x.turn.number > t0 && (!!x.pending || x.turn.step === 'main1'), 600); assert.equal(s.turn.step, 'upkeep'); assert.equal(s.pending && s.pending.kind, 'may_pay', 'pergunta se paga {4}'); assert.equal(s.objects[v].tapped, true);
  const vida = s.players[0].life;
  let r = act(s, legais(s, 0, a => a.t === 'decline')[0]); r = passaAte(r, x => x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(r.objects[v].tapped, true, 'recusou: continua virado'); assert.equal(r.players[0].life, vida - 1, 'virado no passo de compra: 1 de dano');
  let p = act(s, legais(s, 0, a => a.t === 'pay')[0]); p = passaAte(p, x => x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(p.objects[v].tapped, false, 'pagou: desvirou'); assert.equal(p.players[0].life, vida, 'desvirado no passo de compra: sem dano');
  assert.match(String(T.descreveEfeitos([{ do: 'damage', amount: 1, target: 'self' }])), /você/);
  assert.ok([...S.validateScript({ name: 'X', produces: [['C']], abilities: [{ kind: 'triggered', when: 'draw-step', condition: { fonteVirada: 'sim' }, effects: [{ do: 'damage', amount: 1, target: 'self' }] }] })].some(e => /fonteVirada/.test(e)), 'fonteVirada só como true');
});

test('M-558 · achado da revisão: Mana Vault destruído com o gatilho do passo de compra na pilha ainda causa 1 de dano (603.4, 608.2h: virado ao sair)', () => {
  let s = mesa(), v, q; [s, v] = poe(s, 0, MV, 'battlefield', { tapped: true }); [s, q] = poe(s, 0, 'QuebraA', 'hand'); s = ilhas(s, 1);
  const t0 = s.turn.number; // só 1 terreno: na manutenção não dá para pagar {4}, o gatilho resolve sem perguntar
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > t0 && x.turn.step === 'draw' && x.stack.length > 0 && legais(x, 0, a => a.t === 'cast' && a.oid === q).length > 0, 600);
  assert.equal(s.turn.step, 'draw'); assert.equal(s.objects[v].tapped, true);
  const vida = s.players[0].life;
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === q && (a.targets || []).some(t => t.oid === v))[0]);
  s = passaAte(s, x => x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(s.objects[v].zone, 'graveyard', 'destruído em resposta'); assert.equal(s.players[0].life, vida - 1, 'saiu virado: o dano acontece');
});
