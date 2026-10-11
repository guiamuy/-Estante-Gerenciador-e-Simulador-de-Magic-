// CR2d.12 · correções achadas pela auditoria independente das camadas e da cópia (CR2d/CR2f, 11/10/2026): a virada para baixo é a camada
// 1b (2/2, criatura sem subtipo, incolor) e os efeitos de camadas posteriores valem por cima (613.2b, 708.2); subtipo é o de agora em todo
// seletor (camada 4, 613.1d); metamorfo com subtipo redefinido depois deixa de ter todos (613.3); carimbo novo ao virar para cima (613.7f);
// copiar uma permanente virada para baixo copia os valores de virada para baixo (707.2, 708.10). Cada teste falha no motor v102.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa } from './cmd.mjs';

const efeito = (s, alvo, eff) => { s = J(s); E.applyEffect(s, { oid: 'efeito', name: 'Teste', controller: 0 }, { do: 'continuo', target: 'creature', ...eff }, { oid: alvo }, []); return s; };
const pt = (s, o) => { const st = E.stats(s, s.objects[o]); return [st.power, st.toughness].join('/'); };
const nomes = (s, sel) => Array.from(E.selecionar(s, 0, { tipos: ['creature'], zona: 'battlefield', ...sel }), x => s.objects[x.oid].name + (s.objects[x.oid].faceDown ? ' (virada)' : '')).sort().join(', ');

test('CR 613.2 · virada para baixo é a camada 1b: "torna-se 0/1" vale por cima do 2/2, e "torna-se vermelha" por cima do incolor', () => {
  let s = mesa(['Birchlore Rangers'], []), b; [s, b] = poe(s, 0, 'Birchlore Rangers', 'battlefield', { faceDown: true });
  assert.equal(pt(s, b), '2/2');
  let x = efeito(s, b, { torna: { base: [0, 1] } });
  assert.equal(pt(x, b), '0/1', 'antes o 2/2 da virada vencia o "torna-se 0/1"');
  x = efeito(x, b, { poder: 2, resistencia: 2 });
  assert.equal(pt(x, b), '2/3');
  const r = efeito(s, b, { cores: ['R'] });
  assert.deepEqual(Array.from(E.coresDe(r, r.objects[b])), ['R'], 'antes continuava incolor');
});

test('CR 708.2 · virada para baixo não tem subtipo: o hino de Elfos não a alcança e "exceto Elfos" a alcança', () => {
  let s = mesa(['Birchlore Rangers', 'Quirion Ranger', 'Thraben Inspector'], []), b, q, ins;
  [s, b] = poe(s, 0, 'Birchlore Rangers', 'battlefield', { faceDown: true }); [s, q] = poe(s, 0, 'Quirion Ranger'); [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = J(s); s.facts['Thraben Inspector'].script = { ...(s.facts['Thraben Inspector'].script || {}), continuo: [{ afetados: { tipos: ['creature'], subtipos: ['Elf'], de: 'you' }, poder: 1, resistencia: 1 }] };
  assert.equal(E.linhaDeTipo(s, s.objects[b]), 'Creature');
  assert.equal(pt(s, q), '2/2', 'o Quirion Ranger (Elfo) recebe o hino');
  assert.equal(pt(s, b), '2/2', 'a virada para baixo não é Elfo (antes 3/3)');
  assert.equal(nomes(s, { semSubtipos: ['Elf'] }), 'Birchlore Rangers (virada), Thraben Inspector');
});

test('CR 613.3 · subtipo de agora: "exceto Humanos" alcança o Humano que virou Rã, e o metamorfo que virou Rã deixa de ser Elfo', () => {
  let s = mesa(['Thraben Inspector', 'Quirion Ranger', 'Masked Vandal'], []), ins, q, v;
  [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, q] = poe(s, 0, 'Quirion Ranger'); [s, v] = poe(s, 0, 'Masked Vandal');
  const x = efeito(s, ins, { torna: { subtipos: ['Frog'] } });
  assert.ok(nomes(x, { semSubtipos: ['Human'] }).includes('Thraben Inspector'), 'o Inspector virou Rã: não é mais Humano (antes ficava poupado)');
  assert.ok(nomes(s, { subtipos: ['Elf'] }).includes('Masked Vandal'), 'metamorfo é Elfo');
  const y = efeito(s, v, { torna: { subtipos: ['Frog'] } });
  assert.ok(!nomes(y, { subtipos: ['Elf'] }).includes('Masked Vandal'), 'o "torna-se Rã" posterior sobrepõe o metamorfo (antes continuava Elfo)');
});

test('CR 613.7 · virada para cima recebe carimbo novo: a estática dela vence um "perde voar" aplicado antes', () => {
  let s = mesa(['Birchlore Rangers', 'Thraben Inspector'], []), x, ins;
  [s, x] = poe(s, 0, 'Birchlore Rangers', 'battlefield', { faceDown: true }); [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = J(s); s.facts['Birchlore Rangers'].script = { ...(s.facts['Birchlore Rangers'].script || {}), morph: { mana: '{0}' }, continuo: [{ afetados: { tipos: ['creature'], de: 'you' }, palavras: ['flying'] }] };
  s = efeito(s, ins, { perde: ['flying'] });
  assert.equal(E.hasKeyword(s, s.objects[ins], 'flying'), false);
  s = act(s, legais(s, 0, q => q.t === 'unmorph' && q.oid === x)[0]);
  assert.equal(E.hasKeyword(s, s.objects[ins], 'flying'), true, 'o voar da carta desvirada é mais novo (antes perdia)');
});

test('CR 707.2 · copiar uma permanente virada para baixo copia a 2/2 sem habilidades e incolor, não a carta escondida', () => {
  let s = mesa(['Birchlore Rangers', 'Sol Ring'], []), b, ring;
  [s, b] = poe(s, 0, 'Birchlore Rangers', 'battlefield', { faceDown: true }); [s, ring] = poe(s, 0, 'Sol Ring');
  let x = J(s); E.applyEffect(x, { oid: 'h', name: 'Teste', controller: 0, ability: true }, { do: 'ficha_copia', target: 'creature' }, { oid: b }, []);
  const f = Object.values(x.objects).find(o => o.token);
  assert.notEqual(f.name, 'Birchlore Rangers', 'a ficha não é a carta escondida');
  assert.equal(pt(x, f.oid), '2/2'); assert.deepEqual(Array.from(E.coresDe(x, f)), []);
  assert.equal(E.productions(x, f).length, 0, 'sem as habilidades de mana da carta escondida');
  assert.ok(!f.faceDown, 'a cópia fica virada para cima');
  let y = J(s); const src = { oid: 'h', name: 'Teste', controller: 0, ability: true };
  E.applyEffect(y, src, { do: 'escolhe_copiadora', target: 'artifact' }, { oid: ring }, []); E.applyEffect(y, src, { do: 'torna_copia', target: 'creature' }, { oid: b }, []);
  assert.notEqual(y.objects[ring].name, 'Birchlore Rangers'); assert.equal(pt(y, ring), '2/2');
});
