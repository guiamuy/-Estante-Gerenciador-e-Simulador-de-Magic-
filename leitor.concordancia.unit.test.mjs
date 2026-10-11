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
const TOPO = ['flashback', 'madness', 'cycling', 'storm', 'delve', 'aura', 'grants', 'entersTapped', 'ninjutsu', 'produces'];
// `self.keywords` repete a linha de palavras-chave impressa (o motor já a lê da carta): não é regra a mais
const SO_REPETE = (h, c) => Object.keys(h).every(k => k !== 'self' || (Object.keys(h.self).join() === 'keywords' && h.self.keywords.every(k2 => new RegExp('\\b' + k2 + '\\b', 'i').test(c.oracle_text || ''))));
// texto oficial incompleto no acervo (falta a face Omen do Sagu Wildling em .listas/oficiais.json): o leitor não tem como ver; registrado como pendência de dados
const TEXTO_INCOMPLETO = { 'Sagu Wildling': 'falta a face Omen (Roost Seek) no texto oficial guardado' };
const ordena = v => Array.isArray(v) ? v.map(ordena) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordena(v[k])])) : v;
const efs = l => (l || []).map(e => Object.fromEntries(CAMPOS.filter(k => e[k] != null).map(k => [k, e[k]])));
const abs = l => (l || []).map(a => ({ kind: a.kind, when: a.when, optional: !!a.optional, effects: efs(a.effects) }));
// `produces` só conta quando o script à mão o declara (o motor lê a mana do texto da carta; o leitor também anota, por completude)
const efeitos = (sc, ref) => JSON.stringify(ordena({ effects: efs(sc.effects), modes: (sc.modes || []).map(m => efs(m.effects)), abilities: abs(sc.abilities), ...Object.fromEntries(TOPO.filter(k => sc[k] != null && (k !== 'produces' || (ref || sc).produces != null)).map(k => [k, sc[k]])) }));
const SO_EFEITOS = ['name', 'effects', 'modes', 'abilities', 'example', 'covers', 'note', ...TOPO];

test('LT1 · concordância: toda carta lida por inteiro dá o mesmo script escrito à mão (nenhuma divergência)', () => {
  const lidas = [], divergentes = [];
  for (const c of CARTAS) {
    const r = L.ler(c); if (!r.completa) continue;
    const h = S.SCRIPTS[c.name];
    lidas.push(c.name);
    if (!h && !r.script) continue; // permanente que o motor joga pelos dados da carta (palavras-chave, mana): nada a comparar
    if (!h) { divergentes.push(`${c.name}: sem script à mão para comparar`); continue; }
    if (TEXTO_INCOMPLETO[c.name]) continue;
    const aMais = Object.keys(h).filter(k => !SO_EFEITOS.includes(k) && !(k === 'self' && SO_REPETE(h, c)));
    if (aMais.length) divergentes.push(`${c.name}: o script à mão tem ${aMais.join(', ')} e o leitor disse que leu tudo`);
    else if (!r.script) { if (!SO_REPETE(h, c) || Object.keys(h).some(k => !['name', 'self', 'example'].includes(k))) divergentes.push(`${c.name}: o leitor não montou script, mas há um à mão`); }
    else if (efeitos(h, h) !== efeitos(r.script, h)) divergentes.push(`${c.name}: leitor ${efeitos(r.script, h)} × à mão ${efeitos(h, h)}`);
  }
  assert.deepEqual(divergentes, []);
  assert.ok(lidas.length >= 38, 'cartas lidas por inteiro: ' + lidas.length + ' (' + lidas.join(', ') + ')');
});

test('LT1 · fidelidade: frase sem padrão fica não lida, com o texto dela, e a carta não sai completa; permanente ainda não é lida', () => {
  const r = L.ler({ name: 'Teste', type_line: 'Instant', oracle_text: 'Draw two cards. Then the moon turns purple.' });
  assert.equal(r.completa, false);
  assert.deepEqual(Array.from(r.frases, f => [f.texto, f.lida]), [['Draw two cards', true], ['Then the moon turns purple', false]]);
  const p = L.ler({ name: 'Ursa', type_line: 'Creature — Bear', oracle_text: 'When this creature enters, draw a card.' });
  assert.equal(p.completa, true, 'LT3: gatilho de entrada lido'); assert.deepEqual(JSON.parse(JSON.stringify(p.script.abilities)), [{ kind: 'triggered', when: 'etb', effects: [{ do: 'draw', amount: 1 }] }]);
  const q = L.ler({ name: 'Ursa', type_line: 'Creature — Bear', oracle_text: 'When this creature enters, draw a card. {2}: Ursa gains flying until end of turn.' });
  assert.equal(q.completa, false, 'habilidade ativada ainda não é lida (LT4)');
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
