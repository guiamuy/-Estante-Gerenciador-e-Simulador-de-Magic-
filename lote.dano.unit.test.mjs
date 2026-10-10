// M-258 · gatilho em lote de dano (603.2c: "whenever one or more … deal damage to your opponents" dispara uma vez por golpe simultâneo)
// e "exile as fichas de mesmo nome". Cartas: Malcolm, Keen-Eyed Navigator e Legions to Ashes (texto oficial em
// .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && (s.stack.length || s.queued.length); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
const tesouros = (s, p) => Object.values(s.objects).filter(o => o.token && o.name === 'Treasure' && o.controller === p && o.zone === 'battlefield').length;

function combate(s, atacantes) {
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: atacantes });
  for (let i = 0; i < 40 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, s.pending.kind === 'blockers' ? { t: 'block', p: s.pending.p, blocks: [] } : legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  return s;
}

test('M-258 · Malcolm: "Whenever one or more Pirates you control deal damage to your opponents, you create a Treasure token for each opponent dealt damage." — dois Piratas no mesmo combate: um gatilho, um Tesouro', () => {
  let s = mesa(['Malcolm, Keen-Eyed Navigator', 'Thraben Inspector'], []), m, ins;
  [s, m] = poe(s, 0, 'Malcolm, Keen-Eyed Navigator'); [s, ins] = poe(s, 0, 'Thraben Inspector');
  // um segundo Pirata: o próprio Malcolm (Siren Pirate) e uma cópia do Inspector feita Pirata
  s = J(s); s.facts['Pirata Teste'] = E.cardFacts({ name: 'Pirata Teste', type_line: 'Creature — Human Pirate', power: '1', toughness: '1', keywords: [], oracle_text: '' });
  s.objects.pt = { oid: 'pt', name: 'Pirata Teste', owner: 0, controller: 0, zone: 'battlefield', tapped: false, sick: false, damage: 0, counters: {} }; s.zones[0].battlefield.push('pt');
  const a = combate(s, [m, 'pt']);
  assert.equal(a.players[1].life, 20 - 2 - 1, 'os dois Piratas causaram dano');
  assert.equal(tesouros(a, 0), 1, 'um lote, um oponente: um Tesouro');
  const b = combate(s, [ins]);
  assert.equal(tesouros(b, 0), 0, 'criatura que não é Pirata: nada');
  // dano de efeito de um Pirata ao oponente também dispara
  const c = J(s); E.applyEffect(c, c.objects[m], { do: 'damage', amount: 1, target: 'player' }, { player: 1 }, []);
  const d = tudo(ateDecisao(c)); assert.equal(tesouros(d, 0), 1, 'dano de efeito: um Tesouro');
  const e = J(s); E.applyEffect(e, e.objects[m], { do: 'damage', amount: 1, target: 'player' }, { player: 0 }, []);
  assert.equal(e.queued.length, 0, 'dano em você mesmo não conta');
});

test('M-258 · Legions to Ashes: "Exile target nonland permanent an opponent controls and all tokens that player controls with the same name as that permanent."', () => {
  let s = mesa(['Legions to Ashes'], ['Thraben Inspector', 'Faerie Seer']), lg, ins;
  [s, lg] = poe(s, 0, 'Legions to Ashes', 'hand'); [s, ins] = poe(s, 1, 'Thraben Inspector'); [s] = poe(s, 1, 'Island');
  s = J(s); const pista = n => { const id = 'c' + n; s.objects[id] = { oid: id, name: 'Clue', token: true, owner: 1, controller: 1, zone: 'battlefield', tapped: false, sick: false, damage: 0, counters: {} }; s.zones[1].battlefield.push(id); return id; };
  s.facts.Clue = s.facts.Clue || E.cardFacts({ name: 'Clue', type_line: 'Token Artifact — Clue', oracle_text: '', keywords: [] });
  const c1 = pista(1), c2 = pista(2);
  const minha = 'c9'; s.objects[minha] = { oid: minha, name: 'Clue', token: true, owner: 0, controller: 0, zone: 'battlefield', tapped: false, sick: false, damage: 0, counters: {} }; s.zones[0].battlefield.push(minha);
  s = comMana(s, 'WBC');
  const ofertas = legais(s, 0, a => a.t === 'cast' && a.oid === lg);
  assert.ok(ofertas.every(a => s.objects[a.targets[0].oid].controller === 1 && !/Land/.test(s.facts[s.objects[a.targets[0].oid].name].typeText || '')), 'só permanente que não é terreno, do oponente');
  const x = tudo(act(s, ofertas.find(a => a.targets[0].oid === c1)));
  assert.notEqual(x.objects[c2] && x.objects[c2].zone, 'battlefield', 'a outra Pista dele foi junto');
  assert.equal(x.objects[minha].zone, 'battlefield', 'a sua Pista fica');
  assert.equal(x.objects[ins].zone, 'battlefield', 'nome diferente fica');
  const y = tudo(act(s, ofertas.find(a => a.targets[0].oid === ins)));
  assert.equal(y.objects[ins].zone, 'exile'); assert.equal(y.objects[c1].zone, 'battlefield', 'alvo que não é ficha: só fichas de mesmo nome (nenhuma)');
});
