// M-601 · leitor, competitivos na ordem gulosa da sentinela (texto da Scryfall de 01/11/2026 em cobertura/<formato>.json):
// Floodpits Drowner — "When this creature enters, tap target creature an opponent controls and put a stun counter on it." (122.1d: o
// marcador vai no mesmo alvo) e "{1}{U}, {T}: Shuffle this creature and target creature with a stun counter on it into their owners'
// libraries." (as duas vão para o grimório do dono; alvo que perdeu o marcador deixa a habilidade sem efeito, 608.2b) — e Thundertrap
// Trainer — "look at the top four cards of your library. You may reveal a noncreature, nonland card from among them and put it into your
// hand. Put the rest on the bottom of your library in a random order." Cartas de teste com nomes inventados; a aprovação das cartas do
// catálogo é da homologacao. Falha no motor anterior (as frases ficavam sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Afogador: { name: 'Afogador', mana_cost: '{1}{U}', cmc: 2, type_line: 'Creature — Merfolk', oracle_text: "Flash\nVigilance\nWhen this creature enters, tap target creature an opponent controls and put a stun counter on it.\n{1}{U}, {T}: Shuffle this creature and target creature with a stun counter on it into their owners' libraries.", power: '2', toughness: '1', keywords: ['Flash', 'Vigilance'], colors: ['U'] },
  Treinador: { name: 'Treinador', mana_cost: '{1}{U}', cmc: 2, type_line: 'Creature — Otter Wizard', oracle_text: 'Offspring {4} (You may pay an additional {4} as you cast this spell. If you do, when this creature enters, create a 1/1 token copy of it.)\nWhen this creature enters, look at the top four cards of your library. You may reveal a noncreature, nonland card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.', power: '1', toughness: '2', keywords: ['Offspring'], colors: ['U'] },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: ['G'] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Afogador: lido('Afogador'), Treinador: lido('Treinador'), Urso: { name: 'Urso', ...ex }, Pedra: { name: 'Pedra', ...ex } };
function mesa(seed = 282) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Afogador', 2], ['Treinador', 2], ['Urso', 4], ['Pedra', 4], ['Island', 28]]) }, { name: 'B', deck: d([['Urso', 4], ['Forest', 36]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const resolve = (s, prefere) => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { if (s.pending) { const op = legais(s, s.pending.p); s = act(s, (prefere && prefere(s, op)) || op[0]); } else s = passa(s); } return s; };
const alvoOid = oid => (s, op) => { const pd = s.pending; const i = pd.kind === 'pick_target' ? (pd.options || []).findIndex(o => o.oid === oid) : -1; return i >= 0 ? op.find(x => x.index === i) : op.find(x => JSON.stringify(x).includes(`"${oid}"`)); };
const conjura = (s, oid) => act(s, legais(s, 0, a => a.t === 'cast' && a.oid === oid && !JSON.stringify(a).includes('offspring') && !JSON.stringify(a).includes('prole'))[0] || legais(s, 0, a => a.t === 'cast' && a.oid === oid)[0]);

test('M-601 · leitura: virar e atordoar o mesmo alvo; embaralhar as duas; olhar quatro e pegar a que não é criatura nem terreno', () => {
  const [etb, at] = SC.Afogador.abilities;
  assert.equal(JSON.stringify(etb.effects), JSON.stringify([{ do: 'tap', target: { tipos: ['creature'], de: 'opponent' } }, { do: 'counters', tipo: 'stun', amount: 1, target: 'first-target' }]));
  assert.equal(at.kind, 'activated'); assert.equal(at.cost.mana, '{1}{U}'); assert.equal(at.cost.tap, true);
  assert.equal(JSON.stringify(at.effects), JSON.stringify([{ do: 'mover', target: 'self-source', de: 'battlefield', para: 'library', posicao: 'embaralhado' }, { do: 'mover', de: 'battlefield', para: 'library', posicao: 'embaralhado', target: { tipos: ['creature'], comMarcador: 'stun' } }]));
  const lk = SC.Treinador.abilities[0].effects[0]; assert.equal(lk.do, 'look'); assert.equal(lk.count, 4); assert.equal(lk.min, 0); assert.equal(lk.rest, 'library-bottom-random');
  assert.equal(JSON.stringify(lk.filter), JSON.stringify({ notTypes: ['creature', 'land'] }));
  const V = loadModules().scripts.validateScript; assert.equal(V(SC.Afogador).length + V(SC.Treinador).length, 0);
});

test('M-601 · 122.1d: ao entrar, a criatura do oponente fica virada e com um marcador de atordoamento', () => {
  let s = mesa(), a, u; [s, u] = poe(s, 1, 'Urso'); [s, a] = poe(s, 0, 'Afogador', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  s = resolve(conjura(s, a), alvoOid(u));
  assert.equal(s.objects[a].zone, 'battlefield'); assert.equal(s.objects[u].tapped, true, 'virada');
  assert.equal((s.objects[u].counters || {}).stun, 1, 'com o marcador de atordoamento');
});

test('M-601 · a ativada embaralha o Afogador e a criatura atordoada nos grimórios dos donos; sem o marcador na resolução, nada acontece', () => {
  let s = mesa(), a, u; [s, u] = poe(s, 1, 'Urso', 'battlefield', { counters: { stun: 1 } }); [s, a] = poe(s, 0, 'Afogador'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  const ativa = legais(s, 0, x => x.t === 'activate' && x.oid === a); assert.ok(ativa.length, 'a ativada é oferecida com uma criatura atordoada no campo');
  const pilha = act(s, ativa[0]);
  const fim = resolve(pilha, alvoOid(u));
  assert.equal(fim.objects[a].zone, 'library'); assert.ok(fim.zones[0].library.includes(a), 'no grimório do dono (A)');
  assert.equal(fim.objects[u].zone, 'library'); assert.ok(fim.zones[1].library.includes(u), 'no grimório do dono (B)');
  // 608.2b: o alvo perdeu o marcador antes da resolução → a habilidade não faz nada, nem com o próprio Afogador
  let sem = JSON.parse(JSON.stringify(pilha)); if (sem.pending) { const op = legais(sem, sem.pending.p); sem = act(sem, alvoOid(u)(sem, op) || op[0]); }
  sem = JSON.parse(JSON.stringify(sem)); sem.objects[u].counters = {};
  sem = resolve(sem);
  assert.equal(sem.objects[a].zone, 'battlefield', 'o Afogador fica'); assert.equal(sem.objects[u].zone, 'battlefield', 'o Urso fica');
  // sem criatura atordoada, a ativada não tem alvo e não é oferecida
  let livre = mesa(), b; [livre] = poe(livre, 1, 'Urso'); [livre, b] = poe(livre, 0, 'Afogador'); for (let i = 0; i < 2; i++) [livre] = poe(livre, 0, 'Island');
  assert.equal(legais(livre, 0, x => x.t === 'activate' && x.oid === b).length, 0);
});

test('M-601 · Treinador: entre as quatro de cima só a que não é criatura nem terreno pode ir para a mão; o resto vai para o fundo', () => {
  let s = mesa(), t; [s, t] = poe(s, 0, 'Treinador', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  s = JSON.parse(JSON.stringify(s)); const lib = s.zones[0].library; const pega = n => lib.find(o => s.objects[o].name === n && !topo.includes(o));
  const topo = []; for (const n of ['Urso', 'Island', 'Pedra', 'Afogador']) topo.push(pega(n));
  s.zones[0].library = [...topo, ...lib.filter(o => !topo.includes(o))];
  s = conjura(s, t); for (let i = 0; i < 20 && !(s.pending && s.pending.kind !== 'pick_target') && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s);
  assert.ok(s.pending, 'a escolha entre as quatro aparece');
  const op = legais(s, s.pending.p), pedra = topo[2];
  assert.ok(op.some(x => JSON.stringify(x).includes(`"${pedra}"`)), 'a Pedra (artefato) pode ser escolhida');
  for (const o of [topo[0], topo[1], topo[3]]) assert.ok(!op.some(x => x.t === 'pick' && x.oid === o), `${s.objects[o].name} não pode ser escolhida`);
  s = resolve(act(s, op.find(x => JSON.stringify(x).includes(`"${pedra}"`))));
  assert.equal(s.objects[pedra].zone, 'hand', 'a Pedra vai para a mão');
  const lib2 = s.zones[0].library; assert.ok([topo[0], topo[1], topo[3]].every(o => lib2.slice(-3).includes(o)), 'as outras três no fundo');
});
