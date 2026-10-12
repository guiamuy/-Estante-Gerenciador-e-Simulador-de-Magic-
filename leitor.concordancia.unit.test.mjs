// LT1 · Leitor de texto: o motor monta o script de uma carta a partir do texto oficial, frase a frase. Fidelidade antes de cobertura:
// toda carta que o leitor diz ter lido por inteiro precisa dar exatamente o script escrito à mão (e conferido) para ela; frase sem padrão
// fica "não lida" e a carta não sai completa. O piso de cartas lidas só sobe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const CARTAS = [...JSON.parse(readFileSync(new URL('./.listas/oficiais.json', import.meta.url), 'utf8')).cartas, ...JSON.parse(readFileSync(new URL('./.listas/oficiais-commander.json', import.meta.url), 'utf8')).cartas, ...JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas]; // M-305 · também as cartas dos alicerces
// o que conta para a regra: efeitos (com os campos que o motor lê), modos e as palavras-chave com custo do topo; rótulos não contam
const CAMPOS = ['do', 'amount', 'power', 'toughness', 'target', 'unless', 'token', 'targetNotLegendary', 'targetNotColor', 'optional', 'filter', 'to', 'ate']; // LT5 · M-304: duração de mudança de zona · busca: filtro, destino e "pode"
const TOPO = ['flashback', 'madness', 'cycling', 'storm', 'delve', 'aura', 'equip', 'grants', 'grantsAll', 'self', 'entersTapped', 'ninjutsu', 'produces'];
// `self.keywords` repete a linha de palavras-chave impressa (o motor já a lê da carta): não é regra a mais
const SO_REPETE = (h, c) => Object.keys(h).every(k => k !== 'self' || (Object.keys(h.self).join() === 'keywords' && h.self.keywords.every(k2 => new RegExp('\\b' + k2 + '\\b', 'i').test(c.oracle_text || ''))));
// texto oficial incompleto no acervo (falta a face Omen do Sagu Wildling em .listas/oficiais.json): o leitor não tem como ver; registrado como pendência de dados
const TEXTO_INCOMPLETO = { 'Sagu Wildling': 'falta a face Omen (Roost Seek) no texto oficial guardado' };
const ordena = v => Array.isArray(v) ? v.map(ordena) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordena(v[k])])) : v;
const efs = l => (l || []).map(e => Object.fromEntries(CAMPOS.filter(k => e[k] != null).map(k => [k, e[k]])));
// "you may <efeito único>": à mão às vezes está no efeito (search optional), no leitor fica na habilidade; para o motor é a mesma pergunta — normaliza para a habilidade
const abs = l => (l || []).map(a => { const es = efs(a.effects); const opt = !!a.optional || (es.length === 1 && !!es[0].optional); if (es.length === 1) delete es[0].optional; return { kind: a.kind, when: a.when, optional: opt, cost: a.cost || null, sorceryOnly: !!a.sorceryOnly, effects: es }; });
// `produces` só conta quando o script à mão o declara (o motor lê a mana do texto da carta; o leitor também anota, por completude)
const limpaSelf = sc => sc.self && Object.keys(sc.self).some(k => k !== 'keywords') ? Object.fromEntries(Object.entries(sc.self).filter(([k]) => k !== 'keywords')) : undefined;
const efeitos = (sc, ref) => JSON.stringify(ordena({ self: limpaSelf(sc), effects: efs(sc.effects), modes: (sc.modes || []).map(m => efs(m.effects)), abilities: abs(sc.abilities), ...Object.fromEntries(TOPO.filter(k => k !== 'self' && sc[k] != null && sc[k] !== false && (k !== 'produces' || (ref || sc).produces != null)).map(k => [k, sc[k]])) }));
const SO_EFEITOS = ['name', 'effects', 'modes', 'abilities', 'example', 'covers', 'note', ...TOPO];

test('LT1 · concordância (piso M-314: 78): toda carta lida por inteiro dá o mesmo script escrito à mão (nenhuma divergência)', () => {
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
  assert.ok(lidas.length >= 78, 'cartas lidas por inteiro: ' + lidas.length + ' (' + lidas.join(', ') + ')');
});

test('LT1 · fidelidade: frase sem padrão fica não lida, com o texto dela, e a carta não sai completa; permanente ainda não é lida', () => {
  const r = L.ler({ name: 'Teste', type_line: 'Instant', oracle_text: 'Draw two cards. Then the moon turns purple.' });
  assert.equal(r.completa, false);
  assert.deepEqual(Array.from(r.frases, f => [f.texto, f.lida]), [['Draw two cards', true], ['Then the moon turns purple', false]]);
  const p = L.ler({ name: 'Ursa', type_line: 'Creature — Bear', oracle_text: 'When this creature enters, draw a card.' });
  assert.equal(p.completa, true, 'LT3: gatilho de entrada lido'); assert.deepEqual(JSON.parse(JSON.stringify(p.script.abilities)), [{ kind: 'triggered', when: 'etb', effects: [{ do: 'draw', amount: 1 }] }]);
  const q = L.ler({ name: 'Ursa', type_line: 'Creature — Bear', oracle_text: 'When this creature enters, draw a card. {2}: Ursa gains flying until end of turn.' });
  assert.equal(q.completa, false, 'frase da ativada fora do vocabulário (ganha voar) fica não lida');
  const a = L.ler({ name: 'Pinga', type_line: 'Creature — Wizard', oracle_text: '{1}, {T}, Sacrifice this creature: Pinga deals 1 damage to any target.' });
  assert.deepEqual(JSON.parse(JSON.stringify(a.script.abilities)), [{ kind: 'activated', cost: { mana: '{1}', tap: true, sacrifice: true }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }], 'LT4: ativada com mana, {T} e sacrifício');
  const k = L.ler({ name: 'Voadora', type_line: 'Creature — Bird', oracle_text: 'Flying, vigilance' });
  assert.equal(k.frases[0].lida, true, 'linha só de palavras-chave conhecidas: o motor já lê');
  // LT5 · busca (701.23): qualidade, destino e "then shuffle"; qualidade fora do vocabulário fica não lida
  const b = L.ler({ name: 'Mapa', type_line: 'Sorcery', oracle_text: 'Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.' });
  assert.equal(b.completa, true); assert.deepEqual(JSON.parse(JSON.stringify(b.script.effects)), [{ do: 'search', amount: 1, filter: { basic: true, types: ['land'] }, to: 'battlefield-tapped' }]);
  const b2 = L.ler({ name: 'Mapa', type_line: 'Sorcery', oracle_text: 'Search your library for a card with mana value 3, reveal it, put it into your hand, then shuffle.' });
  assert.equal(b2.completa, false, 'qualidade "mana value 3" não cabe no filtro do motor: não lida');
  const b3 = L.ler({ name: 'Tutor', type_line: 'Instant', oracle_text: 'Search your library for an instant or sorcery card, reveal it, then shuffle and put that card on top.' });
  assert.deepEqual(JSON.parse(JSON.stringify(b3.script.effects)), [{ do: 'search', amount: 1, filter: { types: ['instant', 'sorcery'] }, to: 'library-top' }], 'LT5: "shuffle and put that card on top" vai ao topo do grimório');
  const l5 = L.ler({ name: 'Terra', type_line: 'Land', oracle_text: '{T}: Add {C}.\nCycling {R}{G}{W}' });
  assert.equal(l5.completa, true, 'LT5: reciclagem em terreno'); assert.deepEqual(JSON.parse(JSON.stringify(l5.script.cycling)), { mana: '{R}{G}{W}' });
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
