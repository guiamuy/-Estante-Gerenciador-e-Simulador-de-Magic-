// M-231 · CR2-G R2a · gatilho de mudança de zona como um evento só (603.6). Os nomes antigos (etb, dies, leaves-battlefield,
// other-*, attached-*) viraram atalhos para um descritor { evento:'zona', de, para, objeto, quem }. Este teste roda o modo
// sombra: a cada mudança de zona, o motor calcula a fila de gatilhos pelo caminho antigo e pelo novo e anota a diferença.
// Enquanto ele existir, o caminho antigo (gatilhosDeZonaLegado) fica no motor só para esta comparação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, J, act, decks, jogo, poe, passaAte } from './listas.mjs';
import { CARTAS, mesa } from './cmd.mjs';

const LISTAS = Object.keys(decks);

function partidasComSombra(sementes, acoes) {
  E.sombraDosGatilhos(true);
  try {
    LISTAS.forEach((lista, i) => {
      for (const seed of sementes) {
        let s = jogo({ lista, oponente: LISTAS[(i + seed) % LISTAS.length], seed });
        const politica = E.randomPolicy(seed * 104729 + i);
        for (let k = 0; k < acoes && s.status !== 'over'; k++) { const a = politica(s); if (!a) break; s = act(s, a); }
      }
    });
  } catch (e) { E.sombraDosGatilhos(false); throw e; }
  return E.sombraDosGatilhos(false);
}

test('M-231 · R2a · gatilhos de mudança de zona: o despachante novo e o caminho antigo enfileiram exatamente o mesmo, em partidas aleatórias com as listas reais', () => {
  const r = partidasComSombra([1, 2, 3], 220);
  assert.deepEqual(J(r.diferencas), [], 'diferença entre o caminho novo e o antigo');
  assert.ok(r.total > 1000 && r.comFila > 30, `amostra pequena demais (${r.total} mudanças de zona, ${r.comFila} com gatilho)`);
});

test('M-231 · R2a · matriz de mudanças de zona: toda carta com gatilho de zona, nos dois lados, indo para cada zona, sozinha, virada para baixo, junto com o resto do campo e voltando ao campo — a mesma fila pelos dois caminhos', () => {
  const ZONA = Object.keys(S.GATILHO_ZONA);
  const nomes = Object.entries(S.SCRIPTS).filter(([n, sc]) => CARTAS[n] && (sc.abilities || []).some(ab => ab.kind === 'triggered' && ZONA.includes(ab.when))).map(([n]) => n);
  assert.ok(nomes.length >= 45, `poucas cartas com gatilho de zona (${nomes.length})`);
  let s = mesa(nomes, nomes, 3);
  for (const p of [0, 1]) for (const n of nomes) for (const z of ['battlefield', 'graveyard', 'exile']) { try { [s] = poe(s, p, n, z); } catch { /* sem cópia sobrando */ } }
  s = J(s);
  for (const p of [0, 1]) {
    const bf = s.zones[p].battlefield.map(o => s.objects[o]);
    const criatura = bf.find(o => s.facts[o.name].types.includes('creature')), terreno = bf.find(o => s.facts[o.name].types.includes('land'));
    for (const o of bf) if (/Aura|Equipment/.test(CARTAS[o.name].type_line)) o.attachedTo = /enchant land/i.test(CARTAS[o.name].oracle_text) ? terreno.oid : criatura.oid;
  }
  // observador sintético com as variações de "outra" que nenhuma carta usa ainda (sair do campo; de quem é a permanente)
  const obs = s.zones[0].battlefield.find(o => s.objects[o].name === 'Lunarch Veteran');
  s.facts['Lunarch Veteran'] = { ...s.facts['Lunarch Veteran'], script: { name: 'Lunarch Veteran', effects: [], abilities: [
    { kind: 'triggered', when: 'other-leaves-battlefield', filter: { types: ['creature'] }, effects: [{ do: 'gain', amount: 1 }] },
    { kind: 'triggered', when: 'other-leaves-battlefield', anyController: true, optional: true, effects: [{ do: 'gain', amount: 1 }] },
    { kind: 'triggered', when: 'other-dies', ownerIsYou: true, mayPay: { sacrificeSelf: true }, effects: [{ do: 'gain', amount: 1 }] },
    { kind: 'triggered', when: 'other-etb', controller: 'opponent', effects: [{ do: 'gain', amount: 1 }] }] } };
  assert.ok(obs, 'Lunarch Veteran no campo de A');
  E.sombraDosGatilhos(true);
  try {
    const todos = [0, 1].flatMap(p => s.zones[p].battlefield);
    for (const oid of todos) for (const z of ['graveyard', 'exile', 'hand', 'library']) { const x = J(s); E.moveObject(x, oid, z); }
    for (const oid of todos) { const x = J(s); x.objects[oid].faceDown = true; E.moveObject(x, oid, 'graveyard'); }
    for (const p of [0, 1]) for (const z of ['graveyard', 'exile']) { const x = J(s); const vao = x.zones[p].battlefield.slice(); x.saindoJuntas = vao; for (const oid of vao) E.moveObject(x, oid, z); }
    for (const p of [0, 1]) for (const z of ['graveyard', 'exile', 'hand']) for (const oid of s.zones[p][z]) { const x = J(s); E.moveObject(x, oid, 'battlefield'); }
  } catch (e) { E.sombraDosGatilhos(false); throw e; }
  const r = E.sombraDosGatilhos(false);
  assert.deepEqual(J(r.diferencas), [], 'diferença entre o caminho novo e o antigo');
  for (const k of ZONA) assert.ok(r.porGatilho[k] > 0, `o atalho "${k}" não disparou nenhuma vez na matriz: ${JSON.stringify(r.porGatilho)}`);
  assert.ok(r.total > 800 && r.comFila > 300, `amostra pequena (${r.total}/${r.comFila})`);
});

test('M-231 · R2a · a comparação pega divergência: um atalho trocado de propósito muda a fila', () => {
  const antes = S.GATILHO_ZONA.etb;
  let r;
  try { S.GATILHO_ZONA.etb = { evento: 'zona', para: 'graveyard', objeto: 'self' }; r = partidasComSombra([1], 120); }
  finally { S.GATILHO_ZONA.etb = antes; }
  assert.ok(r.diferencas.length > 0, 'o modo sombra não viu a troca');
});

test('M-231 · R2a · descritor de zona escrito no script: validador aceita o certo e recusa o errado', () => {
  const sc = w => ({ name: 'Teste gatilho', abilities: [{ kind: 'triggered', when: w, effects: [{ do: 'gain', amount: 1 }] }] });
  const erros = w => J(S.validateScript(sc(w))).filter(e => /gatilho|objeto|quem/.test(e));
  assert.deepEqual(erros({ evento: 'zona', de: 'battlefield', para: 'exile', objeto: 'outra', quem: 'qualquer' }), []);
  assert.deepEqual(erros({ evento: 'zona', para: ['graveyard', 'exile'] }), []);
  assert.ok(erros({ evento: 'zona', objeto: 'self' }).some(e => /precisa de "de" ou "para"/.test(e)));
  assert.ok(erros({ evento: 'zona', para: 'cemiterio' }).some(e => /zona "cemiterio"/.test(e)));
  assert.ok(erros({ evento: 'zona', para: 'battlefield', quem: 'oponente' }).some(e => /só valem para outra/.test(e)));
  assert.ok(erros({ evento: 'zona', para: 'battlefield', depois: 1 }).some(e => /chave "depois"/.test(e)));
  assert.ok(erros('quando-quiser').some(e => /desconhecido/.test(e)), 'nome antigo desconhecido continua recusado');
});

test('M-231 · R2a · "sempre que uma criatura de qualquer jogador for exilada do campo": descritor novo dispara, o "morre" do mesmo observador não', () => {
  let s = jogo({ lista: 'Pauper Elves', oponente: 'Pauper Boros Bully', seed: 4 });
  let obs, alvo;
  [s, obs] = poe(s, 0, 'Jaspera Sentinel');
  [s, alvo] = poe(s, 1, 'Lunarch Veteran');
  s = J(s);
  s.facts['Jaspera Sentinel'] = { ...s.facts['Jaspera Sentinel'], script: { name: 'Jaspera Sentinel', effects: [], abilities: [
    { kind: 'triggered', when: { evento: 'zona', de: 'battlefield', para: 'exile', objeto: 'outra', quem: 'qualquer' }, effects: [{ do: 'gain', amount: 2 }] },
    { kind: 'triggered', when: 'other-dies', effects: [{ do: 'gain', amount: 5 }] }] } };
  // exilada: só o descritor novo
  let x = J(s); x.queued = [];
  x.zones[1].battlefield.splice(x.zones[1].battlefield.indexOf(alvo), 1); x.zones[1].exile.push(alvo); x.objects[alvo].zone = 'exile';
  E.gatilhosDeZona(x, x.objects[alvo], 'battlefield', 'exile', 1, { power: 1 });
  assert.equal(x.queued.length, 1, J(x.queued));
  assert.equal(x.queued[0].source, obs); assert.equal(x.queued[0].controller, 0); assert.equal(x.queued[0].jogador, 1);
  assert.deepEqual(J(x.queued[0].lembrada), { oid: alvo, z: x.objects[alvo].zc || 0 }, '"aquela carta" viaja com o gatilho');
  // morreu: só o other-dies, e ele olha só para as suas (o padrão "sua" continua)
  let y = J(s); y.queued = [];
  y.zones[1].battlefield.splice(y.zones[1].battlefield.indexOf(alvo), 1); y.zones[1].graveyard.push(alvo); y.objects[alvo].zone = 'graveyard';
  E.gatilhosDeZona(y, y.objects[alvo], 'battlefield', 'graveyard', 1, { power: 1 });
  assert.equal(y.queued.length, 0, 'criatura do oponente morreu: "outra criatura sua" não dispara e o descritor de exílio também não');
});

test('M-231 · R2a · descritor de zona na partida: a criatura do oponente morre pela checagem de estado e o gatilho "vai do campo para o cemitério" resolve', () => {
  let s = jogo({ lista: 'Pauper Elves', oponente: 'Pauper Boros Bully', seed: 6 });
  let obs, alvo;
  [s, obs] = poe(s, 0, 'Jaspera Sentinel');
  [s, alvo] = poe(s, 1, 'Lunarch Veteran');
  s = J(s);
  s.facts['Jaspera Sentinel'] = { ...s.facts['Jaspera Sentinel'], script: { name: 'Jaspera Sentinel', effects: [], abilities: [
    { kind: 'triggered', when: { evento: 'zona', de: 'battlefield', para: 'graveyard', objeto: 'outra', quem: 'oponente' }, effects: [{ do: 'gain', amount: 3 }] }] } };
  s.objects[alvo].damage = 5; // 704.5g na próxima checagem
  const vida = s.players[0].life;
  const passe = E.legalActions(s, 0).find(a => a.t === 'pass');
  s = act(s, passe);
  s = passaAte(s, x => !x.stack.length && !x.queued.length && !x.pending || x.turn.active !== 0);
  assert.equal(s.objects[alvo].zone, 'graveyard');
  assert.equal(s.players[0].life, vida + 3, 'ganhou 3 pelo gatilho do descritor');
});

test('M-231 · R2a · descritor de zona aparece em português no registro', () => {
  assert.equal(S.descreveGatilho('other-dies'), 'quando outra criatura sua morre');
  assert.equal(S.descreveGatilho({ evento: 'zona', de: 'battlefield', para: 'exile', objeto: 'outra', quem: 'qualquer' }), 'quando outra permanente vai do campo para o exílio');
  assert.equal(S.descreveGatilho({ evento: 'zona', de: 'battlefield', para: 'graveyard', objeto: 'outra', quem: 'oponente' }), 'quando uma permanente de um oponente morre');
  assert.equal(S.descreveGatilho({ evento: 'zona', para: 'battlefield' }), 'quando entra no campo');
  assert.equal(S.descreveGatilho({ evento: 'zona', de: 'graveyard', objeto: 'self' }), 'quando sai do cemitério');
});
