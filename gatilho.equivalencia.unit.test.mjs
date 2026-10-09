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

// ── M-232 · CR2-G R2b · os outros eventos no mesmo formato: começo de passo e o que acontece com um objeto (conjurar, atacar,
// bloquear, dano de combate). Mesma prova: modo sombra com o caminho antigo (queueTriggersLegado).
const HOSPEDES = ['Lunarch Veteran', 'Thraben Inspector'];
function mesaDeEventos() {
  const EV = Object.keys(S.GATILHO_EVENTO);
  const nomes = Object.entries(S.SCRIPTS).filter(([n, sc]) => CARTAS[n] && (sc.cumulativeUpkeep || (sc.abilities || []).some(ab => ab.kind === 'triggered' && EV.includes(ab.when)))).map(([n]) => n);
  let s = mesa([...nomes, ...HOSPEDES], [...nomes, ...HOSPEDES], 5);
  for (const p of [0, 1]) for (const n of [...nomes, ...HOSPEDES]) { try { [s] = poe(s, p, n); } catch { /* sem cópia */ } }
  s = J(s);
  // hospedeiros sintéticos com os nomes antigos que nenhuma carta usa ainda e as variações de "outra mágica"
  const g = (when, extra = {}) => ({ kind: 'triggered', when, ...extra, effects: [{ do: 'gain', amount: 1 }] });
  s.facts[HOSPEDES[0]] = { ...s.facts[HOSPEDES[0]], script: { name: HOSPEDES[0], effects: [], abilities: [
    g('upkeep'), g('each-upkeep', { optional: true }), g('begin-combat'), g('end-step'), g('main2'), g('end-of-combat'),
    g('other-cast'), g('other-cast', { controller: 'opponent', filter: { noncreature: true } }), g('attacks'), g('blocks'), g('combat-damage')] } };
  s.facts[HOSPEDES[1]] = { ...s.facts[HOSPEDES[1]], script: { name: HOSPEDES[1], effects: [], abilities: [
    g('other-cast', { anyController: true, mayPay: { sacrificeSelf: true } }), g('other-cast', { ownerIsYou: true, filter: { types: ['creature'] } }), g('cast-self'), g('upkeep', { cost: { mana: '{1}' } })] } };
  return s;
}
function rodaEventos(s) {
  for (const a of [0, 1]) for (const passo of S.PASSOS_DO_GATILHO) { const x = J(s); x.turn.active = a; E.enterStep(x, passo); }
  const objetos = [0, 1].flatMap(p => [...s.zones[p].battlefield, ...s.zones[p].hand]);
  for (const oid of objetos) for (const ev of ['conjurar', 'ataca', 'bloqueia', 'dano-combate']) { const x = J(s); E.disparaEvento(x, ev, [x.objects[oid]]); }
  for (const p of [0, 1]) for (const ev of ['ataca', 'bloqueia']) { const x = J(s); E.disparaEvento(x, ev, x.zones[p].battlefield.map(o => x.objects[o]).filter(o => x.facts[o.name].types.includes('creature'))); }
}

test('M-232 · R2b · matriz de eventos: começo de cada passo com cada jogador ativo e conjurar, atacar, bloquear e dano de combate de cada objeto — a mesma fila pelos dois caminhos', () => {
  const s = mesaDeEventos();
  E.sombraDosGatilhos(true);
  try { rodaEventos(s); } catch (e) { E.sombraDosGatilhos(false); throw e; }
  const r = E.sombraDosGatilhos(false);
  assert.deepEqual(J(r.diferencas), [], 'diferença entre o caminho novo e o antigo');
  for (const k of Object.keys(S.GATILHO_EVENTO)) assert.ok(r.porGatilho[k] > 0, `o atalho "${k}" não disparou nenhuma vez: ${JSON.stringify(r.porGatilho)}`);
  assert.ok(r.total > 150 && r.comFila > 60, `amostra pequena (${r.total}/${r.comFila})`);
});

test('M-232 · R2b · a comparação pega divergência nos eventos: "na sua manutenção" trocado por "em cada manutenção" muda a fila', () => {
  const antes = S.GATILHO_EVENTO.upkeep; let r;
  try { S.GATILHO_EVENTO.upkeep = { evento: 'passo', passo: 'upkeep', turno: 'qualquer' }; E.sombraDosGatilhos(true); rodaEventos(mesaDeEventos()); }
  finally { S.GATILHO_EVENTO.upkeep = antes; r = E.sombraDosGatilhos(false); }
  assert.ok(r.diferencas.length > 0, 'o modo sombra não viu a troca');
});

test('M-232 · R2b · começo de passo escrito como descritor: "no início de cada passo final" dispara no turno do oponente; "na manutenção de cada oponente" só no dele', () => {
  let s = mesaDeEventos();
  const host = s.zones[0].battlefield.find(o => s.objects[o].name === HOSPEDES[0]);
  s.facts[HOSPEDES[0]] = { ...s.facts[HOSPEDES[0]], script: { name: HOSPEDES[0], effects: [], abilities: [
    { kind: 'triggered', when: { evento: 'passo', passo: 'end', turno: 'qualquer' }, effects: [{ do: 'gain', amount: 1 }] },
    { kind: 'triggered', when: { evento: 'passo', passo: 'upkeep', turno: 'oponente' }, effects: [{ do: 'gain', amount: 2 }] },
    { kind: 'triggered', when: { evento: 'passo', passo: 'draw' }, effects: [{ do: 'gain', amount: 3 }] }] } };
  const fila = (a, passo) => { const x = J(s); x.queued = []; x.turn.active = a; E.enterStep(x, passo); return x.queued.filter(q => q.source === host).map(q => q.effects[0].amount); };
  assert.deepEqual(J(fila(1, 'end')), [1], 'passo final do oponente: dispara');
  assert.deepEqual(J(fila(0, 'end')), [1], 'o seu passo final também');
  assert.deepEqual(J(fila(1, 'upkeep')), [2], 'manutenção do oponente: dispara');
  assert.deepEqual(J(fila(0, 'upkeep')), [], 'a sua manutenção: não');
  assert.deepEqual(J(fila(0, 'draw')), [3], '"no início do seu passo de compra" (sem turno = seu)');
  assert.deepEqual(J(fila(1, 'draw')), [], 'passo de compra do oponente: não');
});

test('M-232 · R2b · "sempre que outra criatura sua ataca" escrito como descritor dispara na declaração de ataque de verdade', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Walls Combo', seed: 7 }), obs, kor;
  [s, obs] = poe(s, 0, 'Lunarch Veteran'); [s, kor] = poe(s, 0, 'Kor Skyfisher');
  s = J(s);
  s.facts['Lunarch Veteran'] = { ...s.facts['Lunarch Veteran'], script: { name: 'Lunarch Veteran', effects: [], abilities: [
    { kind: 'triggered', when: { evento: 'ataca', objeto: 'outra' }, effects: [{ do: 'gain', amount: 2 }] }] } };
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  const sozinho = act(s, { t: 'attack', p: 0, attackers: [obs] });
  assert.equal(sozinho.queued.length + sozinho.stack.length, 0, 'ela mesma atacando não é "outra"');
  const vida = s.players[0].life;
  let x = act(s, { t: 'attack', p: 0, attackers: [kor] });
  x = passaAte(x, y => !y.stack.length && !y.queued.length && !y.pending || y.turn.step !== 'combat_attackers');
  assert.equal(x.players[0].life, vida + 2, 'ganhou 2 quando o Kor Skyfisher atacou');
});

test('M-232 · R2b · "sempre que um jogador conjura uma mágica" escrito como descritor vê a mágica do oponente; o "você conjura" antigo não', () => {
  let s = mesaDeEventos();
  const host = s.zones[0].battlefield.find(o => s.objects[o].name === HOSPEDES[0]);
  s.facts[HOSPEDES[0]] = { ...s.facts[HOSPEDES[0]], script: { name: HOSPEDES[0], effects: [], abilities: [
    { kind: 'triggered', when: { evento: 'conjurar', objeto: 'outra', quem: 'qualquer' }, effects: [{ do: 'gain', amount: 1 }] },
    { kind: 'triggered', when: 'other-cast', effects: [{ do: 'gain', amount: 4 }] }] } };
  const magia = s.zones[1].hand[0]; assert.ok(magia, 'B tem carta na mão');
  const x = J(s); x.queued = []; E.disparaEvento(x, 'conjurar', [x.objects[magia]]);
  assert.deepEqual(J(x.queued.filter(q => q.source === host).map(q => [q.effects[0].amount, q.jogador])), [[1, 1]]);
});

test('M-232 · R2b · descritores de passo e de objeto: validador e português', () => {
  const erros = w => J(S.validateScript({ name: 'Teste', abilities: [{ kind: 'triggered', when: w, effects: [{ do: 'gain', amount: 1 }] }] })).filter(e => /gatilho|objeto|quem|turno|passo/.test(e));
  assert.deepEqual(erros({ evento: 'passo', passo: 'end', turno: 'oponente' }), []);
  assert.deepEqual(erros({ evento: 'ataca', objeto: 'outra', quem: 'qualquer' }), []);
  assert.ok(erros({ evento: 'passo', passo: 'cleanup' }).some(e => /passo "cleanup"/.test(e)));
  assert.ok(erros({ evento: 'passo', passo: 'end', turno: 'meu' }).some(e => /turno/.test(e)));
  assert.ok(erros({ evento: 'ataca', objeto: 'anexada' }).some(e => /objeto "anexada"/.test(e)));
  assert.ok(erros({ evento: 'conjurar', passo: 'end' }).some(e => /chave "passo"/.test(e)));
  assert.ok(erros({ evento: 'explode' }).some(e => /evento "explode"/.test(e)));
  assert.equal(S.descreveGatilho({ evento: 'passo', passo: 'end', turno: 'qualquer' }), 'no início de cada passo final');
  assert.equal(S.descreveGatilho({ evento: 'passo', passo: 'upkeep', turno: 'oponente' }), 'no início da manutenção de cada oponente');
  assert.equal(S.descreveGatilho({ evento: 'passo', passo: 'draw' }), 'no início do seu passo de compra');
  assert.equal(S.descreveGatilho({ evento: 'ataca', objeto: 'outra' }), 'quando outra criatura sua ataca');
  assert.equal(S.descreveGatilho({ evento: 'conjurar', objeto: 'outra', quem: 'oponente' }), 'quando um oponente conjura uma mágica');
  assert.equal(S.descreveGatilho({ evento: 'dano-combate', objeto: 'self' }), 'quando causa dano de combate a um jogador');
});
