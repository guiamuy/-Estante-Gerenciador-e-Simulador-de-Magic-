// M-555 · as nove Pathways que faltavam (dupla face modal, terreno // terreno, CR 712.12): textos das duas faces da Scryfall de 21/10/2026. Cada uma
// joga pela frente (mana da frente) ou pelo verso (mana do verso), desvirada; listada pelo nome inteiro, também. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas.filter(c => / Pathway \/\/ /.test(c.name) && !/^Brightclimb/.test(c.name));
const cor = t => t.match(/\{([WUBRG])\}/)[1];
const carta = (c, nome) => ({ name: nome, type_line: 'Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: c.faces[0].oracle_text, colors: [], layout: 'modal_dfc', faces: c.faces });

test('M-555 · nove Pathways: jogam (pela frente e pelo nome inteiro)', () => {
  assert.equal(OF.length, 9);
  for (const c of OF) for (const n of [c.faces[0].name, c.name]) assert.equal(S.coverage(carta(c, n)).level, 'completo', n);
});

test('M-555 · cada Pathway: a frente dá a mana da frente; o verso entra desvirado como o terreno do turno e dá só a mana do verso', () => {
  for (const c of OF) for (const nome of [c.faces[0].name, c.name]) {
    const C = { [nome]: carta(c, nome), Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] } };
    let s = E.createGame({ format: 'livre', seed: 237, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: [{ name: nome, qty: 4, zone: 'main' }, { name: 'Island', qty: 30, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Island', qty: 34, zone: 'main' }] }] });
    for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
    s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    let pw; [s, pw] = poe(s, 0, nome, 'hand');
    const jog = legais(s, 0, a => a.oid === pw && a.t === 'play_land'), fr = jog.filter(a => a.face !== 'verso'), vs = jog.filter(a => a.face === 'verso');
    assert.deepEqual([fr.length, vs.length], [1, 1], `${nome}: as duas faces são oferecidas`);
    const a = act(s, fr[0]), b = act(s, vs[0]);
    assert.deepEqual(Array.from(E.productions(a, a.objects[pw])).map(x => Array.from(x)), [[cor(c.faces[0].oracle_text)]], `${nome}: frente`);
    assert.deepEqual(Array.from(E.productions(b, b.objects[pw])).map(x => Array.from(x)), [[cor(c.faces[1].oracle_text)]], `${nome}: verso`);
    assert.deepEqual([b.objects[pw].name, !!b.objects[pw].tapped], [c.faces[1].name, false]);
  }
});
