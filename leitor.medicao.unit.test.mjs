// LT6 · Medição do leitor nas listas reais (.listas/leitor-medir.mjs): o que o motor leria sozinho em cada lista e o que falta, por classe
// e por trilha. O medidor usa a mesma `ler` do app sobre o mesmo texto oficial; toda frase não lida cai em exatamente uma classe e uma trilha.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mede, classifica } from './.listas/leitor-medir.mjs';

test('LT6 · o medidor cobre as nove listas, conta as cartas lidas (piso 64) e põe cada falta numa trilha', () => {
  const r = mede();
  assert.equal(r.listas.length, 9);
  assert.ok(r.completas >= 64, `cartas lidas por inteiro: ${r.completas}`);
  for (const l of r.listas) { assert.ok(l.lidas <= l.cartas && l.lidas >= 0, l.lista); assert.ok(l.comScriptAMao <= l.cartas, l.lista); }
  assert.ok(r.faltas.length > 0);
  for (const f of r.faltas) { assert.ok(['K', 'V', 'T', 'M'].includes(f.trilha), f.classe); assert.ok(f.cartas >= 1 && f.frases >= f.cartas, f.classe); assert.ok(f.exemplos.length >= 1); }
  assert.equal(Object.values(r.porTrilha).reduce((a, b) => a + b, 0), r.faltas.reduce((a, f) => a + f.frases, 0), 'toda frase não lida tem uma trilha');
});

test('LT6 · a classificação manda cada frase para a trilha dona dela', () => {
  assert.equal(classifica('Disturb {1}{W}').trilha, 'K', 'palavra-chave nova: trilha keywords (CR4)');
  assert.equal(classifica('Exile two target artifacts').trilha, 'V', 'ação de palavra-chave fora do padrão: trilha verbos (CR3)');
  assert.equal(classifica('As an additional cost to cast this spell, discard a card').trilha, 'V');
  assert.equal(classifica('I — Draw a card.').trilha === 'T' || classifica('Chapter I: draw a card').trilha === 'T', true, 'Saga: trilha tipos (CR5)');
  assert.equal(classifica('When this artifact enters or leaves the battlefield, you may tap or untap target creature.').trilha, 'M', 'gatilho: leitor/motor');
  assert.equal(classifica('{2}{U}: Draw a card, then discard a card').classe, 'habilidade ativada sem padrão');
  assert.equal(classifica('Escape—{W}, Exile two other cards from your graveyard.').trilha, 'M', 'mecânica que o motor já executa: só falta o leitor');
});
