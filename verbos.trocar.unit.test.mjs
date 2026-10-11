// V-8 · CR 701.12 · trocar. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge e mtggoldfish, 11/10/2026):
// Switcheroo — "Exchange control of two target creatures." · Tree of Perdition — "{T}: Exchange target opponent's life total with
// Tree of Perdition's toughness."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura, passaAte } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/4', 2, 4), RATO = criatura('Rato de Teste 1/1', 1, 1);
const fonte = (p = 0, source = null) => ({ oid: 'hab', name: 'Teste', controller: p, ability: true, source, effects: [], targets: [] });
function arma(meus, deles) { let s = mesa(['Switcheroo', ...meus], deles), m, a = [], b = []; [s, m] = poe(s, 0, 'Switcheroo', 'hand');
  for (const n of meus) { let o; [s, o] = poe(s, 0, n); a.push(o); } for (const n of deles) { let o; [s, o] = poe(s, 1, n); b.push(o); } return [comMana(s, 'UUUUU'), m, a, b]; }

test('CR 701.12 · trocar o controle de duas permanentes (b): cada jogador passa a controlar a do outro, ao mesmo tempo; a que muda de dono fica com enjoo de invocação', () => {
  const [s, m, [urso], [lobo]] = arma([URSO], [LOBO]);
  const r = tudo(conjura(s, 0, m, [urso, lobo]));
  assert.equal(r.objects[urso].controller, 1); assert.equal(r.objects[lobo].controller, 0);
  assert.equal(r.objects[urso].owner, 0, 'o dono não muda'); assert.equal(r.objects[lobo].sick, true);
  const depois = passaAte(r, x => x.turn.number > r.turn.number + 1); assert.equal(depois.objects[lobo].controller, 0, 'sem prazo: a troca continua nos turnos seguintes');
});

test('CR 701.12 · trocar o controle (b): as duas do mesmo jogador — nada acontece; (a) se uma saiu do campo, a outra não muda de controle', () => {
  const [s, m, [urso, rato], [lobo]] = arma([URSO, RATO], [LOBO]);
  let r = tudo(conjura(s, 0, m, [urso, rato])); assert.equal(r.objects[urso].controller, 0); assert.equal(r.objects[rato].controller, 0);
  const sai = (st, oid, p) => { st = J(st); st.zones[p].battlefield.splice(st.zones[p].battlefield.indexOf(oid), 1); st.zones[p].exile.push(oid); st.objects[oid].zone = 'exile'; return st; };
  const naPilha = conjura(s, 0, m, [urso, lobo]);
  r = tudo(sai(naPilha, lobo, 1)); assert.equal(r.objects[urso].controller, 0, 'o segundo alvo saiu: a troca inteira não acontece');
  r = tudo(sai(naPilha, urso, 0)); assert.equal(r.objects[lobo].controller, 1, 'o primeiro alvo saiu: idem'); assert.equal(r.trocaV, undefined, 'nada sobra no estado');
});

test('CR 701.12 · trocar totais de vida (c): cada jogador ganha ou perde o que falta para ficar com o total do outro — e conta como ganho e perda de vida', () => {
  let s = mesa([URSO], []); s = J(s); s.players[0].life = 4; s.players[1].life = 17;
  const ev = []; E.applyEffect(s, fonte(), { do: 'trocar', o: 'vida', target: 'opponent' }, { player: 1 }, ev);
  assert.equal(s.players[0].life, 17); assert.equal(s.players[1].life, 4); assert.equal(s.players[0].lifeGained, 13, 'ganhou 13'); assert.equal(s.players[1].lifeLost, 13, 'perdeu 13');
  // dois jogadores alvo: "trocar_com" anota o primeiro
  let d = mesa([URSO], []); d = J(d); d.players[0].life = 9; const f = fonte();
  E.applyEffect(d, f, { do: 'trocar_com', target: 'player' }, { player: 1 }, []); E.applyEffect(d, f, { do: 'trocar', o: 'vida', target: 'player' }, { player: 0 }, []);
  assert.equal(d.players[0].life, 20); assert.equal(d.players[1].life, 9);
});

test('CR 701.12 · trocar totais de vida (a, c): quem não pode ganhar vida não pode subir assim — e então nada é trocado', () => {
  let s = mesa([URSO], []); s = J(s); s.players[0].life = 4; s.players[1].life = 17;
  E.applyEffect(s, fonte(1), { do: 'efeito_jogador', quem: 'oponentes', naoGanhaVida: true }, null, []); // o oponente proíbe você de ganhar vida
  const ev = []; E.applyEffect(s, fonte(), { do: 'trocar', o: 'vida', target: 'opponent' }, { player: 1 }, ev);
  assert.equal(s.players[0].life, 4); assert.equal(s.players[1].life, 17, 'a troca inteira não acontece'); assert.ok(ev.some(e => e.do === 'trocar' && e.failed));
});

test('CR 701.12 · trocar o total de vida com a resistência de uma criatura (g): o jogador fica com o valor, e a criatura recebe um efeito que fixa a resistência no total antigo (Tree of Perdition)', () => {
  let s = mesa(['Tree of Perdition'], []), arv; [s, arv] = poe(s, 0, 'Tree of Perdition'); s = J(s);
  const hab = { name: 'Tree of Perdition', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'trocar', o: 'vida-resistencia', target: 'opponent' }] }] };
  assert.deepEqual([...S.validateScript({ ...hab, example: { action: 'activate:0', target: 'opponent', expect: { opponentLife: -7 } } })], []);
  s.facts['Tree of Perdition'] = { ...s.facts['Tree of Perdition'], script: { ...hab, effects: [] } };
  let r = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === arv)[0]));
  assert.equal(r.players[1].life, 13, 'o oponente fica com 13'); const st = E.stats(r, r.objects[arv]); assert.deepEqual([st.power, st.toughness], [0, 20], 'a Árvore fica 0/20');
  // marcador posto depois soma por cima do valor fixado (camada 7c depois da 7b)
  r = J(r); r.objects[arv].counters.p1p1 = 1; assert.equal(E.stats(r, r.objects[arv]).toughness, 21);
  // com o poder
  let p = mesa([URSO], []), urso; [p, urso] = poe(p, 0, URSO); p = J(p);
  E.applyEffect(p, fonte(0, urso), { do: 'trocar', o: 'vida-poder' }, null, []); assert.equal(p.players[0].life, 3); assert.equal(E.stats(p, p.objects[urso]).power, 20);
});

test('CR 701.12 · trocar: o validador e a frase em português', () => {
  const erros = effects => S.validateScript({ name: 'X', effects, example: { target: 'own-creature', expect: { handDelta: 0 } } }).join(' | ');
  assert.match(erros([{ do: 'trocar', o: 'controle', target: 'creature' }]), /precisa de dois alvos/); assert.match(erros([{ do: 'trocar_com', target: 'creature' }]), /precisa ser seguido da troca/);
  assert.match(erros([{ do: 'trocar', o: 'cartas', target: 'player' }]), /"o" precisa ser/); assert.match(erros([{ do: 'trocar', o: 'vida' }]), /precisa de um jogador alvo/);
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Switcheroo'].effects), 'escolhe uma criatura para a troca; troca o controle dela com o de uma criatura');
  assert.equal(T.descreveEfeitos([{ do: 'trocar', o: 'vida', target: 'opponent' }]), 'troca os totais de vida com um oponente');
  assert.equal(T.descreveEfeitos([{ do: 'trocar', o: 'vida-resistencia', target: 'opponent' }]), 'troca o total de vida de um oponente com a resistência desta criatura');
});
