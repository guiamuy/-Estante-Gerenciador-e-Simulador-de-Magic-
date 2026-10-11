// CR2e.1 · correções achadas pela auditoria independente da CR2e (11/10/2026): o dano "a cada oponente" passa pela substituição e pela
// prevenção (614.1, 615.1); fichas entram pelas modificações de entrada (614.12); virada para baixo não tem as regras de entrada da frente
// (708.2); com duas substituições de dano, o afetado escolhe a ordem (616.1). Regras escritas como dado em cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, poe, mesa } from './cmd.mjs';

const comScript = (s, nome, extra) => { s = J(s); s.facts[nome].script = { ...(s.facts[nome].script || { name: nome, effects: [], abilities: [] }), ...extra }; return s; };

test('CR 614.1 · dano "a cada oponente": o dobrador dobra e o escudo de prevenção segura (antes os dois eram ignorados)', () => {
  let s = mesa(['Thraben Inspector'], []), ins; [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = comScript(s, 'Thraben Inspector', { dano: [{ fonte: { de: 'you' }, a: 'oponente', multiplica: 2 }] });
  const vida = s.players[1].life, src = { oid: 'efeito', name: 'Thraben Inspector', controller: 0 };
  const x = J(s); E.applyEffect(x, x.objects[ins], { do: 'damage', amount: 3, target: 'each-opponent' }, null, []);
  assert.equal(x.players[1].life, vida - 6, 'o dobro chega a cada oponente');
  const y = J(s); y.prevencoes = [{ alvo: { player: 1 }, quantidade: 10 }]; E.applyEffect(y, y.objects[ins], { do: 'damage', amount: 3, target: 'each-opponent' }, null, []);
  assert.equal(y.players[1].life, vida, 'o escudo de 10 segura os 6'); assert.equal(y.prevencoes[0].quantidade, 4, 'e é gasto');
});

test('CR 614.12 · fichas entram viradas e com marcadores pelas regras de entrada de outras permanentes', () => {
  let s = mesa(['Thraben Inspector'], ['Faerie Seer']), ins; [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = comScript(s, 'Thraben Inspector', { entra: [{ afetados: { tipos: ['creature'], de: 'opponent' }, virada: true }, { afetados: { tipos: ['creature'], de: 'you' }, marcadores: { p1p1: 1 } }] });
  const x = J(s);
  E.applyEffect(x, { oid: 'h', name: 'Teste', controller: 1 }, { do: 'token', amount: 1, token: { name: 'Goblin', types: ['creature'], subtypes: ['Goblin'], colors: ['R'], power: 1, toughness: 1 } }, null, []);
  E.applyEffect(x, { oid: 'h', name: 'Teste', controller: 0 }, { do: 'token', amount: 1, token: { name: 'Soldier', types: ['creature'], subtypes: ['Soldier'], colors: ['W'], power: 1, toughness: 1 } }, null, []);
  const gob = Object.values(x.objects).find(o => o.token && o.name === 'Goblin'), sol = Object.values(x.objects).find(o => o.token && o.name === 'Soldier');
  assert.equal(gob.tapped, true, 'a do oponente entra virada'); assert.equal(sol.counters.p1p1, 1, 'a sua entra com o marcador');
});

test('CR 708.2 · virada para baixo não segue a regra de entrada da frente; CR 616.1 · o afetado escolhe a ordem das substituições de dano', () => {
  let s = mesa(['Thraben Inspector'], []), ins; [s, ins] = poe(s, 0, 'Thraben Inspector', 'hand');
  s = comScript(s, 'Thraben Inspector', { entra: [{ afetados: 'self', virada: true }] });
  const x = J(s); x.zones[0].hand.splice(x.zones[0].hand.indexOf(ins), 1); x.stack.push(ins); x.objects[ins].zone = 'stack'; x.objects[ins].faceDown = true;
  E.moveObject(x, ins, 'battlefield'); assert.equal(x.objects[ins].tapped, false, 'virada para baixo: sem a regra da frente');
  let y = mesa(['Thraben Inspector'], []), f; [y, f] = poe(y, 0, 'Thraben Inspector');
  y = comScript(y, 'Thraben Inspector', { dano: [{ fonte: { de: 'you' }, a: 'oponente', multiplica: 2 }, { fonte: { de: 'you' }, a: 'oponente', soma: 1 }] });
  assert.equal(E.danoSubstituido(y, y.objects[f], { player: 1 }, 1, false), 3, '1 com "+1" e "dobro": o oponente escolhe dobrar antes (3, não 4)');
});

test('CR 616.2 · uma substituição torna outra aplicável: "iria ao cemitério → exílio" e "iria ao exílio → mão" levam a criatura que morre para a mão', () => {
  let s = mesa(['Thraben Inspector', 'Faerie Seer'], []), ins, seer; [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, seer] = poe(s, 0, 'Faerie Seer');
  s = comScript(s, 'Thraben Inspector', { substitui: [{ quando: { para: 'graveyard', objeto: { tipos: ['creature'], outra: true } }, em: { para: 'exile' } }, { quando: { para: 'exile', objeto: { tipos: ['creature'], outra: true } }, em: { para: 'hand' } }] });
  const x = J(s); E.moveObject(x, seer, 'graveyard');
  assert.equal(x.objects[seer].zone, 'hand', 'as duas, em cadeia, cada uma uma vez');
});
