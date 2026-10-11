// LT1 · Leitor de texto: o motor monta o script de uma carta a partir do texto oficial, frase a frase. Fidelidade antes de cobertura:
// toda carta que o leitor diz ter lido por inteiro precisa dar exatamente o script escrito à mão (e conferido) para ela; frase sem padrão
// fica "não lida" e a carta não sai completa. O piso de cartas lidas só sobe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const CARTAS = [...JSON.parse(readFileSync(new URL('./.listas/oficiais.json', import.meta.url), 'utf8')).cartas, ...JSON.parse(readFileSync(new URL('./.listas/oficiais-commander.json', import.meta.url), 'utf8')).cartas];
// o que conta para a regra: efeitos (com os campos que o motor lê), modos e as palavras-chave com custo do topo; rótulos não contam
const CAMPOS = ['do', 'amount', 'power', 'toughness', 'target', 'unless', 'token', 'targetNotLegendary', 'targetNotColor'];
const TOPO = ['flashback', 'madness', 'cycling', 'storm', 'delve'];
const ordena = v => Array.isArray(v) ? v.map(ordena) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordena(v[k])])) : v;
const efs = l => (l || []).map(e => Object.fromEntries(CAMPOS.filter(k => e[k] != null).map(k => [k, e[k]])));
const efeitos = sc => JSON.stringify(ordena({ effects: efs(sc.effects), modes: (sc.modes || []).map(m => efs(m.effects)), ...Object.fromEntries(TOPO.filter(k => sc[k] != null).map(k => [k, sc[k]])) }));
const SO_EFEITOS = ['name', 'effects', 'modes', 'example', 'covers', 'note', ...TOPO];

test('LT1 · concordância: toda carta lida por inteiro dá o mesmo script escrito à mão (nenhuma divergência)', () => {
  const lidas = [], divergentes = [];
  for (const c of CARTAS) {
    const r = L.ler(c); if (!r.completa) continue;
    const h = S.SCRIPTS[c.name];
    lidas.push(c.name);
    if (!h) { divergentes.push(`${c.name}: sem script à mão para comparar`); continue; }
    const aMais = Object.keys(h).filter(k => !SO_EFEITOS.includes(k));
    if (aMais.length) divergentes.push(`${c.name}: o script à mão tem ${aMais.join(', ')} e o leitor disse que leu tudo`);
    else if (efeitos(h) !== efeitos(r.script)) divergentes.push(`${c.name}: leitor ${efeitos(r.script)} × à mão ${efeitos(h)}`);
  }
  assert.deepEqual(divergentes, []);
  assert.ok(lidas.length >= 20, 'cartas lidas por inteiro: ' + lidas.length + ' (' + lidas.join(', ') + ')');
});

test('LT1 · fidelidade: frase sem padrão fica não lida, com o texto dela, e a carta não sai completa; permanente ainda não é lida', () => {
  const r = L.ler({ name: 'Teste', type_line: 'Instant', oracle_text: 'Draw two cards. Then the moon turns purple.' });
  assert.equal(r.completa, false);
  assert.deepEqual(Array.from(r.frases, f => [f.texto, f.lida]), [['Draw two cards', true], ['Then the moon turns purple', false]]);
  const p = L.ler({ name: 'Ursa', type_line: 'Creature — Bear', oracle_text: 'When this creature enters, draw a card.' });
  assert.equal(p.completa, false); assert.equal(p.frases[0].lida, false);
  const k = L.ler({ name: 'Voadora', type_line: 'Creature — Bird', oracle_text: 'Flying, vigilance' });
  assert.equal(k.frases[0].lida, true, 'linha só de palavras-chave conhecidas: o motor já lê');
});

test('LT1 · o que o leitor monta passa no validador e usa só o vocabulário do motor; o nome da carta no texto vira a própria carta', () => {
  const r = L.ler({ name: 'Choque Teste', type_line: 'Instant', oracle_text: 'Choque Teste deals 2 damage to any target.' });
  assert.equal(r.completa, true);
  assert.deepEqual(JSON.parse(JSON.stringify(r.script.effects)), [{ do: 'damage', amount: 2, target: 'any' }]);
  const v = L.ler({ name: 'Varios', type_line: 'Sorcery', oracle_text: 'Scry 2, then draw a card.' });
  assert.deepEqual(JSON.parse(JSON.stringify(v.script.effects)), [{ do: 'scry', amount: 2 }, { do: 'draw', amount: 1 }]);
  const x = L.ler({ name: 'Alvo Estranho', type_line: 'Instant', oracle_text: 'Destroy target creature with flying.' });
  assert.equal(x.completa, false, 'alvo fora do vocabulário: não lida, em vez de aproximar para "criatura"');
});
