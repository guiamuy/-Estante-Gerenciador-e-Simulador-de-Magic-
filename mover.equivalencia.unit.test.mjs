// M-237 · CR2-G R4a · mover entre zonas num verbo só (701 / 400.7): `{ do: 'mover', para, de, posicao, virada, controle,
// lembra }`. Exilar, devolver à mão, reanimar (virada ou não), embaralhar no grimório e pôr no fundo viraram atalhos.
// Este teste compara, objeto a objeto, o caminho antigo desses sete verbos (moverLegado) com o atalho novo (applyEffect).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, T, J, jogo, poe, passaAte, conjura, resolve, legais } from './listas.mjs';
import { mesa } from './cmd.mjs';

const VERBOS = [
  { do: 'exile' }, { do: 'exile', remember: true }, { do: 'bounce' }, { do: 'to_hand' }, { do: 'to_hand', target: 'self-source' },
  { do: 'to_hand', target: 'self-source', from: 'battlefield' }, { do: 'reanimate' }, { do: 'reanimate_tapped' }, { do: 'reanimate_tapped', target: 'self-source' },
  { do: 'to_library_shuffled' }, { do: 'to_library_shuffled', target: 'self-source' }, { do: 'to_bottom' }];

function mesaDeZonas() {
  const nomes = ['Lunarch Veteran', 'Kor Skyfisher', 'Journey to Nowhere', 'Rancor', 'Sneaky Snacker', 'Lightning Bolt', 'Thraben Inspector', 'Faerie Seer'];
  let s = mesa(nomes, nomes, 2);
  for (const p of [0, 1]) for (const n of nomes) for (const z of ['battlefield', 'graveyard', 'exile']) { try { [s] = poe(s, p, n, z); } catch { /* sem cópia */ } }
  s = J(s);
  // uma mágica na pilha, de cada jogador, para servir de fonte "mágica"
  for (const p of [0, 1]) { const oid = s.zones[p].hand[0]; s.zones[p].hand.splice(0, 1); s.stack.push(oid); s.objects[oid].zone = 'stack'; }
  return s;
}

test('M-237 · R4a · os sete verbos de mudança de zona e o verbo "mover" deixam o estado igual ao caminho antigo, para cada objeto de cada zona, com fonte mágica e fonte habilidade', () => {
  const s = mesaDeZonas();
  const objetos = s.zones.flatMap(z => [...z.battlefield, ...z.graveyard, ...z.exile, ...z.hand.slice(0, 2), ...z.library.slice(0, 1)]).concat(s.stack);
  let n = 0;
  for (const eff of VERBOS) for (const oid of objetos) for (const fonte of s.stack) for (const comoHabilidade of [false, true]) {
    const montaFonte = x => comoHabilidade ? { oid: 'hab', name: 'habilidade', controller: x.objects[fonte].controller, ability: true, source: oid } : x.objects[fonte];
    const a = J(s), b = J(s);
    const ctrl = a.objects[fonte].controller;
    let erroA = null, erroB = null;
    try { E.moverLegado(a, montaFonte(a), eff, a.objects[oid], ctrl); } catch (e) { erroA = String(e.message); }
    try { E.applyEffect(b, montaFonte(b), eff, { oid }, []); } catch (e) { erroB = String(e.message); }
    const rot = `${eff.do}${eff.target ? ' ' + eff.target : ''}${eff.remember ? ' lembra' : ''} · ${s.objects[oid].name} (${s.objects[oid].zone}) · fonte ${comoHabilidade ? 'habilidade' : 'mágica'}`;
    assert.equal(erroB, erroA, `${rot}: erro diferente`);
    assert.deepEqual(J(b), J(a), rot);
    n++;
  }
  assert.ok(n > 1500, `amostra pequena (${n})`);
});

test('M-237 · R4a · a comparação pega divergência: "devolver à mão" escrito como mover para o exílio deixa outro estado', () => {
  const s = mesaDeZonas(), oid = s.zones[1].battlefield[0];
  const a = J(s), b = J(s);
  E.moverLegado(a, a.objects[s.stack[0]], { do: 'bounce' }, a.objects[oid], 0);
  E.applyEffect(b, b.objects[s.stack[0]], { do: 'mover', para: 'exile' }, { oid }, []);
  assert.notDeepEqual(J(b), J(a));
});

test('M-237 · R4a · verbo "mover" na partida: embaralhar a criatura alvo no grimório do dono; pôr no campo, virada e sob o seu controle, uma criatura do cemitério de qualquer jogador', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 4, terrenos: ['Mountain', 'Plains'] }), bolt, kor, elfo;
  [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, kor] = poe(s, 1, 'Llanowar Elves'); [s, elfo] = poe(s, 1, 'Elvish Mystic', 'graveyard');
  s = J(s);
  const embaralha = { do: 'mover', target: 'creature', para: 'library', posicao: 'embaralhado' };
  assert.deepEqual(J(S.validateScript({ name: 'Teste', effects: [embaralha] })).filter(e => !/cenário/.test(e)), []);
  s.facts['Lightning Bolt'] = { ...s.facts['Lightning Bolt'], script: { name: 'Lightning Bolt', effects: [embaralha] } };
  const tamanho = s.zones[1].library.length;
  s = resolve(conjura(s, 0, bolt, x => (x.targets || []).some(t => t.oid === kor)));
  assert.equal(s.objects[kor].zone, 'library');
  assert.equal(s.zones[1].library.length, tamanho + 1, 'foi para o grimório do dono');
  assert.equal(T.descreveEfeitos([embaralha]), 'embaralha uma criatura no grimório do dono');
  // reanimar virada uma criatura do cemitério do oponente (seletor de cemitério de qualquer jogador)
  const rouba = { do: 'mover', target: { zona: 'graveyard', tipos: ['creature'] }, para: 'battlefield', virada: true };
  assert.deepEqual(J(S.validateScript({ name: 'Teste', effects: [rouba] })).filter(e => !/cenário/.test(e)), []);
  const x = J(s); E.applyEffect(x, { oid: 'h', name: 'Teste', controller: 0, ability: true, source: null }, rouba, { oid: elfo }, []);
  assert.equal(x.objects[elfo].zone, 'battlefield'); assert.equal(x.objects[elfo].controller, 0); assert.equal(x.objects[elfo].tapped, true);
  assert.equal(T.descreveEfeitos([rouba]), 'põe uma carta de criatura de um cemitério no campo sob o seu controle, virada');
});

test('M-237 · R4a · 400.7: com `de`, o objeto que já mudou de zona fica onde está; validador do verbo', () => {
  const s = mesaDeZonas(), oid = s.zones[1].graveyard[0];
  const x = J(s), ev = [];
  E.applyEffect(x, x.objects[s.stack[0]], { do: 'mover', para: 'hand', de: 'battlefield' }, { oid }, ev);
  assert.equal(x.objects[oid].zone, 'graveyard', 'estava no cemitério, não no campo: nada acontece');
  assert.equal(ev[0].failed, true);
  const erros = e => J(S.validateScript({ name: 'Teste', effects: [{ do: 'mover', target: 'creature', ...e }] })).filter(x => !/cenário/.test(x));
  assert.ok(erros({}).some(x => /precisa de "para"/.test(x)));
  assert.ok(erros({ para: 'hand', posicao: 'fundo' }).some(x => /só vale para o grimório/.test(x)));
  assert.ok(erros({ para: 'hand', virada: true }).some(x => /só valem para o campo/.test(x)));
  assert.ok(erros({ para: 'battlefield', controle: 'ele' }).some(x => /voce ou dono/.test(x)));
  assert.ok(erros({ para: 'hand', lembra: true }).some(x => /só vale para o exílio/.test(x)));
  assert.ok(erros({ para: 'hand', de: 'ceu' }).some(x => /origem desconhecida/.test(x)));
});
