// M-246 · balde A do Commander: nove cartas escritas com o vocabulário da CR2-G, conferidas frase a frase contra o texto oficial
// (.listas/oficiais-commander.json, consulta de 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, alvos } from './cmd.mjs';
import { S, T } from './listas.mjs';
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && (s.stack.length || s.queued.length); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
const zona = (s, oid) => s.objects[oid].zone;

test('M-246 · Bounty Agent: "{T}, Sacrifice this creature: Destroy target legendary permanent that\'s an artifact, creature, or enchantment."', () => {
  let s = mesa(['Bounty Agent'], ['Elas il-Kor, Sadistic Pilgrim', 'Faerie Seer', 'Sol Ring']), b, elas;
  [s, b] = poe(s, 0, 'Bounty Agent'); [s, elas] = poe(s, 1, 'Elas il-Kor, Sadistic Pilgrim'); [s] = poe(s, 1, 'Faerie Seer'); [s] = poe(s, 1, 'Sol Ring');
  assert.deepEqual(alvos(s, 0, b), ['Elas il-Kor, Sadistic Pilgrim'], 'só a lendária: a criatura comum e o artefato comum não são alvo');
  const virada = J(s); virada.objects[elas].faceDown = true;
  assert.deepEqual(alvos(virada, 0, b), [], 'virada para baixo não é lendária');
  s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === b)[0]));
  assert.equal(zona(s, elas), 'graveyard'); assert.equal(zona(s, b), 'graveyard', 'sacrificado como custo');
  const enjoada = J(mesa(['Bounty Agent'], ['Elas il-Kor, Sadistic Pilgrim'])); let x, ag; [x, ag] = poe(enjoada, 0, 'Bounty Agent', 'battlefield', { sick: true }); [x] = poe(x, 1, 'Elas il-Kor, Sadistic Pilgrim');
  assert.equal(legais(x, 0, a => a.t === 'activate' && a.oid === ag).length, 0, '{T} pede que ela esteja desde o começo do turno');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Bounty Agent'].abilities[0].effects), 'destrói uma permanente lendária que é artefato ou criatura ou encantamento');
  assert.ok(J(S.validateScript({ name: 'T', effects: [{ do: 'destroy', target: { lendaria: 'sim' } }] })).some(e => /lendaria/.test(e)));
});

test('M-246 · Elas il-Kor: "Whenever another creature you control enters, you gain 1 life. Whenever another creature you control dies, each opponent loses 1 life."', () => {
  let s = mesa(['Elas il-Kor, Sadistic Pilgrim', 'Thraben Inspector', 'Lightning Bolt'], ['Faerie Seer']), elas, ins, bolt, seer;
  [s, elas] = poe(s, 0, 'Elas il-Kor, Sadistic Pilgrim'); [s, ins] = poe(s, 0, 'Thraben Inspector', 'hand'); [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, seer] = poe(s, 1, 'Faerie Seer', 'hand');
  s = comMana(s, 'WR');
  s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ins)[0]));
  assert.equal(s.players[0].life, 21, 'outra criatura sua entrou: +1');
  const x = J(s); E.moveObject(x, seer, 'battlefield'); const y = tudo(ateDecisao(x));
  assert.equal(y.players[0].life, 21, 'criatura do oponente entrando não conta');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === bolt && (a.targets || []).some(t => t.oid === ins))[0]));
  assert.equal(s.players[1].life, 19, 'outra criatura sua morreu: cada oponente perde 1');
  const z = J(s); E.moveObject(z, elas, 'graveyard'); const w = tudo(ateDecisao(z));
  assert.equal(w.players[1].life, 19, 'a própria Elas morrendo não dispara ("another")');
});

test('M-246 · Kediss: na mesa de dois jogadores o gatilho ("each other opponent") não muda nada; o script declara o motivo', () => {
  const sc = S.SCRIPTS['Kediss, Emberclaw Familiar'];
  assert.ok(sc && /dois jogadores/.test(sc.semEfeito));
  assert.deepEqual(J(S.validateScript(sc)), []);
  assert.ok(J(S.validateScript({ name: 'T', semEfeito: '  ', example: sc.example })).some(e => /semEfeito/.test(e)), 'o motivo é obrigatório');
});

test('M-246 · Leonin Relic-Warder: "you may exile target artifact or enchantment" e "When this creature leaves the battlefield, return the exiled card to the battlefield under its owner\'s control"', () => {
  const base = () => { let s = mesa(['Leonin Relic-Warder', 'Lightning Bolt'], ['Sol Ring', 'Faerie Seer']), w, b, ring;
    [s, w] = poe(s, 0, 'Leonin Relic-Warder', 'hand'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, ring] = poe(s, 1, 'Sol Ring'); [s] = poe(s, 1, 'Faerie Seer');
    s = comMana(s, 'WWR'); s = ateDecisao(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === w)[0])); return { s, w, b, ring }; };
  { let { s, w, b, ring } = base();
    if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === ring) });
    s = ateDecisao(s); assert.equal(s.pending.kind, 'may_pay', '"you may"');
    s = tudo(act(s, { t: 'pay', p: 0 })); assert.equal(zona(s, ring), 'exile');
    s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && (x.targets || []).some(t => t.oid === w))[0]));
    assert.equal(zona(s, ring), 'battlefield', 'voltou quando a Relic-Warder saiu'); assert.equal(s.objects[ring].controller, 1, 'sob o controle do dono'); }
  { let { s, ring } = base(); s = ateDecisao(s); s = tudo(act(s, { t: 'decline', p: 0 })); assert.equal(zona(s, ring), 'battlefield', 'recusou: nada é exilado'); }
  { let { s, w, ring } = base(); // ruling: se ela sai antes de o gatilho de entrada resolver, a carta fica exilada para sempre
    s = J(s); E.moveObject(s, w, 'hand'); s = ateDecisao(s);
    if (s.pending && s.pending.kind === 'may_pay') s = tudo(act(s, { t: 'pay', p: 0 })); else s = tudo(s);
    assert.equal(zona(s, ring), 'exile', 'exilada sem volta'); }
});

test('M-246 · Open the Armory: "Search your library for an Aura or Equipment card, reveal it, put it into your hand, then shuffle." — pode não achar', () => {
  let s = mesa(['Open the Armory', 'Rancor', 'Skullclamp', 'Faerie Seer'], []), o;
  [s, o] = poe(s, 0, 'Open the Armory', 'hand'); s = comMana(s, 'WC');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === o)[0]); s = ateDecisao(s);
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.min, 0, 'busca por qualidade não obriga a achar');
  const nomes = [...new Set(s.pending.from.map(x => s.objects[x].name))].sort();
  assert.deepEqual(nomes.filter(n => !['Rancor', 'Skullclamp'].includes(n)), [], 'só Aura e Equipamento');
  assert.ok(nomes.includes('Rancor') && nomes.includes('Skullclamp'));
});

test('M-246 · Reprieve: "Return target spell to its owner\'s hand. Draw a card." — e a mágica com lampejo do passado vai para o exílio', () => {
  let s = mesa(['Lightning Bolt'], ['Reprieve']), bolt, rep;
  [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, rep] = poe(s, 1, 'Reprieve', 'hand'); s = comMana(s, 'R'); s = comMana(s, 'WC', 1);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === bolt && x.targets[0].player === 1)[0]);
  s = act(s, { t: 'pass', p: 0 });
  const mao = s.zones[1].hand.length;
  s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === rep && x.targets[0].oid === bolt)[0]);
  s = tudo(s);
  assert.equal(zona(s, bolt), 'hand', 'o raio voltou à mão do dono'); assert.equal(s.players[1].life, 20, 'e não resolveu');
  assert.equal(s.zones[1].hand.length, mao, 'o Reprieve saiu da mão e comprou uma');
});

test('M-246 · Rite of Oblivion: custo adicional "sacrifice a nonland permanent" (também no lampejo do passado) e "Exile target nonland permanent"', () => {
  let s = mesa(['Rite of Oblivion', 'Thraben Inspector'], ['Faerie Seer']), r, ins, seer;
  [s, r] = poe(s, 0, 'Rite of Oblivion', 'hand'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, seer] = poe(s, 1, 'Faerie Seer'); [s] = poe(s, 1, 'Island'); [s] = poe(s, 0, 'Plains');
  s = comMana(s, 'WB');
  const ofertas = legais(s, 0, x => x.t === 'cast' && x.oid === r);
  assert.ok(ofertas.length > 0);
  assert.ok(ofertas.every(x => !(x.targets || []).some(t => s.objects[t.oid] && /Land/.test(s.facts[s.objects[t.oid].name].typeText || ''))), 'terreno não é alvo');
  s = tudo(act(s, ofertas.find(x => x.targets[0].oid === seer)));
  assert.equal(zona(s, seer), 'exile'); assert.notEqual(zona(s, ins), 'battlefield', 'o Inspector foi sacrificado como custo'); assert.equal(zona(s, r), 'graveyard');
  // lampejo do passado: sem permanente que não seja terreno para sacrificar, não dá para conjurar
  s = comMana(s, 'WBCC');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === r && x.flashback).length, 0, 'o custo adicional também vale no lampejo do passado');
});

test('M-246 · Swan Song: "Counter target enchantment, instant, or sorcery spell. Its controller creates a 2/2 blue Bird creature token with flying."', () => {
  let s = mesa(['Lightning Bolt', 'Sol Ring', 'Faerie Seer'], ['Swan Song']), bolt, ring, seer, sw;
  [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, ring] = poe(s, 0, 'Sol Ring', 'hand'); [s, seer] = poe(s, 0, 'Faerie Seer', 'hand'); [s, sw] = poe(s, 1, 'Swan Song', 'hand');
  s = comMana(s, 'RCU'); s = comMana(s, 'U', 1);
  const naPilha = oid => act(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === oid)[0]), { t: 'pass', p: 0 });
  assert.deepEqual(alvos(naPilha(ring), 1, sw), [], 'mágica de artefato não é alvo (antes era)');
  assert.deepEqual(alvos(naPilha(seer), 1, sw), [], 'mágica de criatura não é alvo');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === bolt && x.targets[0].player === 1)[0]);
  s = act(s, { t: 'pass', p: 0 });
  assert.deepEqual(alvos(s, 1, sw), ['Lightning Bolt']);
  s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === sw)[0]);
  s = ateDecisao(act(s, { t: 'pass', p: 1 })); for (let i = 0; i < 4 && s.stack.includes(sw); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(zona(s, bolt), 'graveyard', 'anulado');
  assert.ok(Object.values(s.objects).some(o => o.token && o.name === 'Bird' && o.controller === 0), 'o controlador da mágica anulada ganha o Pássaro');
});

test('M-246 · You See a Guard Approach: "Distract the Guard — Tap target creature." · "Hide — Target creature you control gains hexproof until end of turn."', () => {
  let s = mesa(['Faerie Seer'], ['You See a Guard Approach', 'Thraben Inspector']), seer, g, ins;
  [s, seer] = poe(s, 0, 'Faerie Seer'); [s, g] = poe(s, 1, 'You See a Guard Approach', 'hand'); [s, ins] = poe(s, 1, 'Thraben Inspector'); s = comMana(s, 'UU', 1);
  s = act(s, { t: 'pass', p: 0 });
  const vira = legais(s, 1, x => x.t === 'cast' && x.oid === g && (x.mode || 0) === 0 && x.targets[0].oid === seer)[0];
  let x = tudo(act(s, vira)); assert.equal(x.objects[seer].tapped, true);
  assert.ok(!legais(s, 1, a => a.t === 'cast' && a.oid === g && a.mode === 1 && a.targets[0].oid === seer).length, '"Hide" mira só criatura sua');
  x = tudo(act(s, legais(s, 1, a => a.t === 'cast' && a.oid === g && a.mode === 1 && a.targets[0].oid === ins)[0]));
  assert.equal(E.hasKeyword(x, x.objects[ins], 'hexproof'), true);
});
