// M-247 · balde B do Commander que o vocabulário da v95 já cobre, e a condição nova "um oponente controla mais terrenos que você"
// (603.4: conferida ao disparar e de novo na resolução). Texto oficial em .listas/oficiais-commander.json (05/10/2026; segunda fonte
// de 10/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';
import { S } from './listas.mjs';
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && (s.stack.length || s.queued.length); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
const zona = (s, oid) => s.objects[oid].zone;

test('M-247 · Speaker of the Heavens: "{T}: Create a 4/4 white Angel creature token with flying. Activate only if you have at least 7 life more than your starting life total and only as a sorcery."', () => {
  let s = mesa(['Speaker of the Heavens'], []), sp; [s, sp] = poe(s, 0, 'Speaker of the Heavens');
  const ativa = x => legais(x, 0, a => a.t === 'activate' && a.oid === sp);
  s = J(s); s.players[0].life = 26; assert.equal(ativa(s).length, 0, '26 de vida: só 6 acima dos 20 iniciais');
  s.players[0].life = 27; assert.equal(ativa(s).length, 1, '27: exatamente 7 acima');
  const s2 = tudo(act(s, ativa(s)[0]));
  const anjo = Object.values(s2.objects).find(o => o.token && o.name === 'Angel');
  assert.ok(anjo && anjo.controller === 0); assert.equal(E.stats(s2, anjo).power, 4); assert.equal(E.hasKeyword(s2, anjo, 'flying'), true);
  const naPilha = J(s); naPilha.stack.push('x'); naPilha.objects.x = { oid: 'x', ability: true, name: 'X', controller: 1, zone: 'stack', effects: [] };
  assert.equal(ativa(naPilha).length, 0, 'só como feitiço: com a pilha ocupada, não');
});

test('M-247 · Jirina: "When Jirina enters, exile target player\'s graveyard." · "Sacrifice Jirina: Humans you control gain hexproof and indestructible until end of turn."', () => {
  let s = mesa(['Jirina, Dauntless General', 'Thraben Inspector', 'Faerie Seer'], ['Faerie Seer', 'Lightning Bolt']), j, ins, seer, opp;
  [s, j] = poe(s, 0, 'Jirina, Dauntless General', 'hand'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, seer] = poe(s, 0, 'Faerie Seer'); [s, opp] = poe(s, 1, 'Lightning Bolt', 'graveyard');
  s = comMana(s, 'WB'); s = ateDecisao(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === j)[0]));
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.player === 1) });
  s = tudo(s); assert.equal(zona(s, opp), 'exile', 'o cemitério do jogador alvo foi exilado');
  s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === j)[0]));
  assert.equal(zona(s, j), 'graveyard');
  assert.equal(E.hasKeyword(s, s.objects[ins], 'hexproof'), true); assert.equal(E.hasKeyword(s, s.objects[ins], 'indestructible'), true, 'Humano seu');
  assert.equal(E.hasKeyword(s, s.objects[seer], 'hexproof'), false, 'Faerie Seer não é Humano');
  s = act(s, { t: 'pass', p: 0 }); // nada muda até a limpeza
  const fim = (() => { let x = s; for (let i = 0; i < 40 && x.turn.active === 0; i++) x = x.pending ? act(x, legais(x, x.pending.p)[0]) : act(x, { t: 'pass', p: x.turn.priority }); return x; })();
  assert.equal(E.hasKeyword(fim, fim.objects[ins], 'indestructible'), false, 'até o fim do turno');
});

test('M-247 · Knight of the White Orchid: "When … enters, if an opponent controls more lands than you, you may search your library for a Plains card, put it onto the battlefield, then shuffle."', () => {
  const montar = (meus, deles) => { let s = mesa(['Knight of the White Orchid'], []), k; [s, k] = poe(s, 0, 'Knight of the White Orchid', 'hand');
    for (let i = 0; i < meus; i++) [s] = poe(s, 0, 'Plains'); for (let i = 0; i < deles; i++) [s] = poe(s, 1, 'Island');
    return { s: comMana(s, 'WW'), k }; };
  { let { s, k } = montar(1, 1); s = ateDecisao(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === k)[0])); s = tudo(s);
    assert.equal(s.queued.length + s.stack.length, 0); assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Plains').length, 1, 'terrenos iguais: não dispara'); }
  { let { s, k } = montar(1, 2); s = ateDecisao(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === k)[0]));
    assert.equal(s.pending && s.pending.kind, 'may_pay', '"you may"');
    s = ateDecisao(act(s, { t: 'pay', p: 0 })); assert.equal(s.pending.kind, 'pick');
    assert.ok(s.pending.from.every(o => s.objects[o].name === 'Plains'), 'só Planícies');
    s = tudo(act(s, legais(s, 0, a => a.t === 'pick')[0]));
    const planicies = s.zones[0].battlefield.filter(o => s.objects[o].name === 'Plains');
    assert.equal(planicies.length, 2); assert.equal(planicies.every(o => !s.objects[o].tapped || o === planicies[0]), true, 'entra desvirada'); }
  { let { s, k } = montar(1, 2); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === k)[0]);
    for (let i = 0; i < 10 && !(s.stack.length && s.objects[s.stack[s.stack.length - 1]].ability); i++) s = act(s, { t: 'pass', p: s.turn.priority });
    assert.ok(s.objects[s.stack[s.stack.length - 1]].ability, 'o gatilho disparou e está na pilha');
    // 603.4: se ao resolver o oponente já não tem mais terrenos, nada acontece
    s = J(s); const ilha = s.zones[1].battlefield.find(o => s.objects[o].name === 'Island'); E.moveObject(s, ilha, 'graveyard');
    s = tudo(s, x => legais(x, x.pending.p, a => a.t === 'pay')[0] || legais(x, x.pending.p)[0]);
    assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Plains').length, 1, 'condição conferida de novo na resolução'); }
  assert.ok(J(S.validateScript({ name: 'T', abilities: [{ kind: 'triggered', when: 'etb', condition: { maisTerrenos: true }, effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } })).some(e => /condição/.test(e)));
});
