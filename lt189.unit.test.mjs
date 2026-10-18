// M-507 · 601.2g–h / 118.3 / 704.5a: com nenhum símbolo phyrexiano pago com vida, o motor não confere mais nada depois da mana — o dano de uma
// fonte (Talismã) não é custo, e ficar com vida abaixo de 1 é ação de estado. A mesa oferecia conjurar e o motor recusava (achado da revisão da M-503).
// Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte } from './listas.mjs';
const c0 = (name, type_line, mana_cost, oracle_text = '') => ({ name, type_line, mana_cost, cmc: (mana_cost.match(/\{[^}]+\}/g) || []).length, keywords: [], oracle_text, colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])] });
const C = {
  'Mana Confluence': c0('Mana Confluence', 'Land', '', '{T}, Pay 1 life: Add one mana of any color.'),
  Talisma: c0('Talisma', 'Artifact', '{2}', '{T}: Add {C}.\n{T}: Add {U} or {B}. Talisma deals 1 damage to you.'),
  Feitico: c0('Feitico', 'Sorcery', '{B/P}{B/P}', 'Draw a card.'),
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
};
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 20 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 189, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Mana Confluence', 'Talisma', 'Feitico', 'Swamp']) }, { name: 'B', deck: b(['Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('M-507 · vida 1, Confluência e Talismã: conjurar {B/P}{B/P} só com mana é oferecido e aceito; a dor leva a vida a -1 e o jogador perde', () => {
  let s = mesa(), f; [s] = poe(s, 0, 'Mana Confluence'); [s] = poe(s, 0, 'Talisma'); [s, f] = poe(s, 0, 'Feitico', 'hand'); s = JSON.parse(JSON.stringify(s)); s.players[0].life = 1;
  const ls = legais(s, 0, a => a.t === 'cast' && a.oid === f);
  assert.ok(ls.length > 0, 'oferecido');
  for (const a of ls) { const r = act(s, a); assert.ok(r, 'aceito: ' + JSON.stringify(a)); }
  const r = act(s, ls.find(a => a.vida === 0) || ls[0]); assert.ok(r.players[0].life <= 0 || r.players[0].lost || r.winner != null, 'vida ' + r.players[0].life);
});

test('M-507 · com símbolo pago com vida a conferência continua: vida 3, um símbolo por vida e o outro pelo Talismã fica em 0 e conjura', () => {
  let s = mesa(), f; [s] = poe(s, 0, 'Talisma'); [s, f] = poe(s, 0, 'Feitico', 'hand'); s = JSON.parse(JSON.stringify(s)); s.players[0].life = 3;
  const um = legais(s, 0, a => a.t === 'cast' && a.oid === f && a.vida === 1); assert.ok(um.length > 0);
  const r = act(s, um[0]); assert.equal(r.players[0].life, 0);
});
