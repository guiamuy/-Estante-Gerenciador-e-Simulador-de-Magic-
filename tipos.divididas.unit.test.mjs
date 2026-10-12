// T-10 · CR5 · cartas divididas (Comprehensive Rules 709.1–709.4).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge,
// clone de 11/10/2026): Wax // Wane, Assault // Battery e Dead // Gone. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { E, S, T, J, act, poe, legais, passaAte, resolveUm, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const CARTAS = {};
for (const c of L('oficiais-tipos.json')) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // dividida instantânea // feitiço: Cura ({W}, instantânea): ganhe 3 · Festa ({2}{G}, feitiço): ganhe 10
  'Cura // Festa': { name: 'Cura // Festa', self: { dividida: true, mana: '{W}', types: ['instant'] }, effects: [{ do: 'gain', amount: 3 }],
    back: { name: 'Festa', types: ['sorcery'], mana: '{2}{G}', effects: [{ do: 'gain', amount: 10 }] }, ...EX },
  'Anula Instantânea': { name: 'Anula Instantânea', effects: [{ do: 'counter', target: 'instant-spell' }], ...EX },
  'Mata': { name: 'Mata', effects: [{ do: 'destroy', target: 'creature' }], ...EX },
  'Aura Teste': { name: 'Aura Teste', aura: { enchant: 'creature' }, ...EX },
};
carta('Cura // Festa', 'Instant // Sorcery', { mana_cost: '{W} // {2}{G}', cmc: 4, colors: ['W', 'G'] });
carta('Anula Instantânea', 'Instant'); carta('Mata', 'Instant'); carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Aura Teste', 'Enchantment — Aura');

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
function mesa(a = [], b = a, seed = 1, cards = CARTAS) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p, n = 9) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += n; return s; };
const semMana = (s, p) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] = 0; for (const oid of s.zones[p].battlefield) s.objects[oid].tapped = true; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const naMao = (s, p, nome) => { let oid; [s, oid] = poe(s, p, nome, 'hand'); return [s, oid]; };
const conjuras = (s, p, oid) => legais(s, p, a => a.t === 'cast' && a.oid === oid);
const metade = (s, p, oid, lado) => conjuras(s, p, oid).filter(a => a.face === lado);
const alvo = oid => a => (a.targets || [])[0] && a.targets[0].oid === oid;
const esvazia = s => passaAte(s, x => !x.stack.length || !!x.pending);
const vida = (s, p = 0) => s.players[p].life - 20;
const zona = (s, oid) => s.objects[oid].zone;
const nome = (s, oid) => s.objects[oid].name;
const fatos = (s, oid) => s.facts[nome(s, oid)];

/* ---------------- 709.3 · escolher a metade ---------------- */
test('CR 709.3 · 709.3a · o jogador escolhe a metade antes de conjurar: uma oferta por metade, cada uma com o custo, o tempo e os alvos dela; não há oferta da carta inteira', () => {
  let s, c; [s, c] = naMao(mesa(['Cura // Festa']), 0, 'Cura // Festa'); s = mana(s, 0);
  eq(conjuras(s, 0, c).map(a => a.face).sort(), ['direita', 'esquerda'], 'Cura ou Festa, nunca as duas');
  let t = semMana(s, 0); t.players[0].pool.W = 1;
  eq(conjuras(t, 0, c).map(a => a.face), ['esquerda'], 'com {W}: só a Cura (a carta inteira custaria {W}{2}{G})');
  // no turno do oponente só a metade instantânea
  let u = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && x.turn.priority === 1); u = act(u, { t: 'pass', p: 1 }); u = mana(u, 0);
  eq(conjuras(u, 0, c).map(a => a.face), ['esquerda'], 'a Festa é feitiço');
  assert.throws(() => act(u, { t: 'cast', p: 0, oid: c, face: 'direita' }), /fase principal|tempo/);
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: c, face: 'as duas' }), /metade/);
});

test('CR 709.3b · na pilha só existem as características da metade conjurada: nome, tipo, custo e valor de mana dela; "anule a mágica instantânea alvo" alcança a Cura e não a Festa', () => {
  let s, c, x; [s, c] = naMao(mesa(['Cura // Festa', 'Anula Instantânea']), 0, 'Cura // Festa'); s = mana(s, 0);
  let t = act(s, metade(s, 0, c, 'esquerda')[0]);
  eq([zona(t, c), nome(t, c), J(fatos(t, c).types), fatos(t, c).cmc, J(E.coresDe(t, t.objects[c]))], ['stack', 'Cura', ['instant'], 1, ['W']]);
  [t, x] = naMao(t, 1, 'Anula Instantânea'); t = mana(t, 1); t = act(t, { t: 'pass', p: 0 });
  assert.ok(conjuras(t, 1, x).some(alvo(c)), 'a Cura é mágica instantânea');
  let u = act(s, metade(s, 0, c, 'direita')[0]);
  eq([nome(u, c), J(fatos(u, c).types), fatos(u, c).cmc, J(E.coresDe(u, u.objects[c]))], ['Festa', ['sorcery'], 3, ['G']]);
  [u, x] = naMao(u, 1, 'Anula Instantânea'); u = mana(u, 1); u = act(u, { t: 'pass', p: 0 });
  assert.ok(!conjuras(u, 1, x).some(alvo(c)), 'a Festa é feitiço');
});

test('CR 709.3 · a metade escolhida resolve só o efeito dela e a carta vai ao cemitério com as duas metades', () => {
  let s, c; [s, c] = naMao(mesa(['Cura // Festa']), 0, 'Cura // Festa'); s = mana(s, 0);
  const a = esvazia(act(s, metade(s, 0, c, 'esquerda')[0])), b = esvazia(act(s, metade(s, 0, c, 'direita')[0]));
  eq([vida(a), zona(a, c), nome(a, c), vida(b), zona(b, c), nome(b, c)], [3, 'graveyard', 'Cura // Festa', 10, 'graveyard', 'Cura // Festa']);
});

/* ---------------- 709.4 · fora da pilha, as duas metades ---------------- */
test('CR 709.4 · 709.4b–c · 709.2 · fora da pilha a carta tem as duas metades: os dois tipos, o custo somado, a cor e o valor de mana desse custo; é uma carta só', () => {
  let s, c; [s, c] = naMao(mesa(['Cura // Festa']), 0, 'Cura // Festa');
  const f = fatos(s, c);
  eq([J(f.types).sort(), f.cmc, f.cost.generic, J(f.cost.colored), J(E.coresDe(s, s.objects[c])).sort()], [['instant', 'sorcery'], 4, 2, { W: 1, G: 1 }, ['G', 'W']]);
  assert.ok(!Object.values(s.objects).some(o => o.name === 'Cura' || o.name === 'Festa'), 'nenhum objeto com o nome de uma metade fora da pilha');
});

test('CR 709.4a · a carta dividida tem os dois nomes: E.nomesDe devolve as duas metades', () => {
  let s, c; [s, c] = naMao(mesa(['Cura // Festa']), 0, 'Cura // Festa');
  eq(E.nomesDe(s, s.objects[c]), ['Cura', 'Festa']);
  let t = mana(s, 0); t = act(t, metade(t, 0, c, 'direita')[0]); eq(E.nomesDe(t, t.objects[c]), ['Festa'], 'na pilha, só o da metade');
});

/* ---------------- dados reais ---------------- */
test('CR 709 · a lista pode trazer a carta pelo nome de uma metade ("Wax") ou pelo nome completo ("Wax // Wane"), com o dado no formato da Scryfall: a partida usa sempre a carta inteira', () => {
  const scry = { name: 'Wax // Wane', layout: 'split', mana_cost: '{G} // {W}', cmc: 2, type_line: 'Instant // Instant', oracle_text: 'Target creature gets +2/+2 until end of turn.\n//\nDestroy target enchantment.', keywords: [], colors: ['G', 'W'],
    faces: [{ name: 'Wax', mana_cost: '{G}', type_line: 'Instant', oracle_text: 'Target creature gets +2/+2 until end of turn.' }, { name: 'Wane', mana_cost: '{W}', type_line: 'Instant', oracle_text: 'Destroy target enchantment.' }] };
  for (const chave of ['Wax', 'Wax // Wane']) {
    const cards = { [chave]: scry, Urso: CARTAS.Urso, 'Aura Teste': CARTAS['Aura Teste'] }; for (const n of ['Plains', 'Forest', 'Island', 'Mountain']) cards[n] = CARTAS[n];
    let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: { 'Aura Teste': SCRIPTS['Aura Teste'] }, players: [{ name: 'A', deck: [{ name: chave, qty: 20, zone: 'main' }, { name: 'Urso', qty: 10, zone: 'main' }, { name: 'Forest', qty: 10, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Aura Teste', qty: 20, zone: 'main' }, { name: 'Island', qty: 20, zone: 'main' }] }] });
    for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
    s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    let c, u; [s, c] = poe(s, 0, 'Wax // Wane', 'hand'); [s, u] = poe(s, 0, 'Urso', 'battlefield'); s = mana(s, 0);
    assert.equal(nome(s, c), 'Wax // Wane', chave + ': o objeto é a carta inteira');
    eq([fatos(s, c).cmc, J(fatos(s, c).types)], [2, ['instant']], chave);
    const t = esvazia(act(s, metade(s, 0, c, 'esquerda').find(alvo(u))));
    eq(E.stats(t, t.objects[u]), { power: 4, toughness: 4 }, chave + ': Wax');
    assert.ok(metade(s, 0, c, 'direita').length === 0, chave + ': sem encantamento no campo, a Wane não tem alvo');
  }
});

/* ---------------- cartas exemplo ---------------- */
test('S8 · Wax // Wane, Assault // Battery e Dead // Gone: cada metade com o efeito dela', () => {
  let s, c, u, au, x; [s, c] = naMao(mesa(['Wax // Wane', 'Urso', 'Aura Teste']), 0, 'Wax // Wane'); [s, u] = poe(s, 0, 'Urso', 'battlefield');
  [s, au] = poe(s, 1, 'Aura Teste', 'battlefield'); s = J(s); s.objects[au].attachedTo = u; s = mana(s, 0);
  let t = esvazia(act(s, metade(s, 0, c, 'direita').find(alvo(au)))); assert.equal(zona(t, au), 'graveyard', 'Wane destrói o encantamento');
  let a; [t, a] = naMao(mesa(['Assault // Battery']), 0, 'Assault // Battery'); t = mana(t, 0);
  const t1 = esvazia(act(t, metade(t, 0, a, 'esquerda').find(x => x.targets[0].player === 1))); assert.equal(vida(t1, 1), -2);
  const t2 = esvazia(act(t, metade(t, 0, a, 'direita')[0])); const el = Object.values(t2.objects).find(o => o.token && o.zone === 'battlefield');
  eq([el && el.name, E.stats(t2, el), J(E.coresDe(t2, el))], ['Elephant', { power: 3, toughness: 3 }, ['G']]);
  let d, meu, dele; [t, d] = naMao(mesa(['Dead // Gone', 'Urso']), 0, 'Dead // Gone'); [t, meu] = poe(t, 0, 'Urso', 'battlefield'); [t, dele] = poe(t, 1, 'Urso', 'battlefield'); t = mana(t, 0);
  const g = metade(t, 0, d, 'direita'); assert.ok(g.some(alvo(dele)) && !g.some(alvo(meu)), 'Gone: só criatura que você não controla');
  const t3 = esvazia(act(t, g.find(alvo(dele)))); assert.equal(zona(t3, dele), 'hand');
  const t4 = esvazia(act(t, metade(t, 0, d, 'esquerda').find(alvo(dele)))); assert.equal(zona(t4, dele), 'graveyard', 'Dead: 2 de dano no Urso 2/2');
  for (const n of ['Wax // Wane', 'Assault // Battery', 'Dead // Gone']) { const sc = S.SCRIPTS[n]; assert.ok(sc && sc.example, n); eq([...S.validateScript(sc)], [], n); }
});

/* ---------------- validador, mesa e guarda-corpos ---------------- */
test('CR 709 · validador: `self.dividida` pede o custo e o tipo da metade esquerda e a metade direita (back) com custo; as metades são instantânea ou feitiço', () => {
  const v = sc => S.validateScript({ name: 'X', ...sc, ...EX }).join(' | ');
  assert.equal(v(SCRIPTS['Cura // Festa']), '');
  assert.match(v({ self: { dividida: true, types: ['instant'] }, effects: [{ do: 'gain', amount: 1 }], back: { name: 'Y', types: ['sorcery'], mana: '{1}', effects: [] } }), /dividida.*custo/);
  assert.match(v({ self: { dividida: true, mana: '{1}', types: ['instant'] }, effects: [{ do: 'gain', amount: 1 }], back: { name: 'Y', types: ['creature'], mana: '{1}', power: 1, toughness: 1 } }), /instantânea ou feitiço/);
  assert.match(v({ self: { dividida: true, mana: '{1}', types: ['instant'] }, effects: [{ do: 'gain', amount: 1 }] }), /dividida.*metade direita/);
});

test('CR 709.3 · mesa: um botão por metade ("Conjurar Cura · {W}", "Conjurar Festa · {2}{G}") e o registro diz a metade', () => {
  let s, c; [s, c] = naMao(mesa(['Cura // Festa']), 0, 'Cura // Festa'); s = mana(s, 0);
  eq(E.metadesDe(s, c), [{ nome: 'Cura', mana: '{W}' }, { nome: 'Festa', mana: '{2}{G}' }]);
  const a = metade(s, 0, c, 'direita')[0];
  assert.match(T.describe(s, a, [], act(s, a)).join(' | '), /A conjurou Festa \(metade de Cura \/\/ Festa\)/);
  const src = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(src, /`Conjurar \$\{md\.nome\} · \$\{md\.mana\}`/);
});

test('CR 709 · partida sem a carta não ganha nada no estado; passeio aleatório com divididas: nada oferecido é recusado e fora da pilha a carta é sempre a inteira', () => {
  const jogo = nomes => { const cards = Object.fromEntries(['Plains', 'Forest', 'Island', 'Mountain', ...nomes].map(n => [n, CARTAS[n]]));
    return E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: {}, players: [{ name: 'A', deck: baralho([...nomes, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...nomes, 'Island', 'Mountain']) }] }); };
  const sem = jogo(['Urso']);
  for (const n of ['Wax', 'Wane', 'Assault', 'Battery', 'Dead', 'Gone']) assert.equal(sem.facts[n], undefined, n);
  let metades = 0;
  for (let seed = 1; seed <= 5; seed++) {
    let s = mesa(['Wax // Wane', 'Assault // Battery', 'Dead // Gone', 'Cura // Festa', 'Urso', 'Aura Teste'], undefined, seed), r = seed * 49979687;
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 8 === 0 && !s.pending) s = mana(s, p, 2);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'cast');
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (a.face === 'esquerda' || a.face === 'direita') metades++;
      let out; try { out = E.apply(s, a); } catch (e) { assert.fail(`semente ${seed}, passo ${i}: ação oferecida recusada ${JSON.stringify(a)} — ${e.message}`); }
      s = out.state;
      eq(E.invariants(s).filter(x => !/parado em passo sem prioridade/.test(x)), [], `semente ${seed}, passo ${i}, depois de ${a.t}`);
      for (const o of Object.values(s.objects)) if (!o.ability && o.zone !== 'stack') assert.ok(!['Wax', 'Wane', 'Assault', 'Battery', 'Dead', 'Gone', 'Cura', 'Festa'].includes(o.name), `semente ${seed}, passo ${i}: ${o.name} em ${o.zone}`);
    }
  }
  assert.ok(metades > 15, 'metades conjuradas no passeio: ' + metades);
});

/* ================= T-11 · correções da auditoria independente das divididas ================= */
Object.assign(SCRIPTS, { 'Covil': { name: 'Covil', effects: [{ do: 'draw_free_cast', amount: 1 }], ...EX } }); // "compre uma carta; você pode conjurá-la sem pagar"
carta('Covil', 'Sorcery');
/** Resolve o Covil com `nome` no topo do grimório de A: para na decisão "conjurar sem pagar" com a carta comprada. */
function covilCom(nomes, nome) {
  let s = mesa(['Covil', ...nomes]), cv; [s, cv] = naMao(s, 0, 'Covil'); s = J(s);
  const L = s.zones[0].library, o = L.find(x => s.objects[x].name === nome); L.splice(L.indexOf(o), 1); L.unshift(o);
  s = mana(s, 0); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cv)[0]); s = passaAte(s, x => !!x.pending);
  assert.equal(s.pending && s.pending.kind, 'free_cast'); return [s, o];
}

test('CR 709.3 · conjurar sem pagar (D1): a decisão oferece as duas metades, cada uma com os alvos dela, e nunca a carta inteira; oferta = aceito', () => {
  let [s, c] = covilCom(['Assault // Battery'], 'Assault // Battery');
  const of = legais(s, 0, a => a.t === 'cast_free' && a.oid === c);
  eq([...new Set(of.map(a => a.face))].sort(), ['direita', 'esquerda'], 'Assault ou Battery: ' + JSON.stringify(of));
  assert.ok(of.filter(a => a.face === 'esquerda').every(a => a.targets && a.targets.length === 1), 'Assault tem alvo');
  assert.ok(of.filter(a => a.face === 'direita').every(a => !a.targets || !a.targets.length), 'Battery não tem');
  const t = esvazia(act(s, of.find(a => a.face === 'direita')));
  eq([zona(t, c), nome(t, c), Object.values(t.objects).filter(o => o.token && o.name === 'Elephant' && o.zone === 'battlefield').length], ['graveyard', 'Assault // Battery', 1], 'Battery sem pagar: o Elefante');
  let u; [s, c] = covilCom(['Wax // Wane', 'Urso', 'Aura Teste'], 'Wax // Wane'); [s, u] = poe(s, 0, 'Urso', 'battlefield');
  eq([...new Set(legais(s, 0, a => a.t === 'cast_free' && a.oid === c).map(a => a.face))], ['esquerda'], 'sem encantamento, a Wane não tem alvo');
  let au; [s, au] = poe(s, 1, 'Aura Teste', 'battlefield'); s = J(s); s.objects[au].attachedTo = u;
  const w = legais(s, 0, a => a.t === 'cast_free' && a.oid === c && a.face === 'direita');
  assert.ok(w.length && w.every(alvo(au)), 'com encantamento, a Wane é oferecida e mira só ele');
  assert.equal(zona(esvazia(act(s, w[0])), au), 'graveyard');
});

test('CR 709.2 · lista com o nome de uma metade sem dado próprio (só "Assault // Battery" no mapa de cartas): a partida usa a carta inteira (D2)', () => {
  const cards = { 'Assault // Battery': CARTAS['Assault // Battery'], Urso: CARTAS.Urso }; for (const n of ['Plains', 'Forest', 'Island', 'Mountain']) cards[n] = CARTAS[n];
  for (const chave of ['Battery', 'Assault']) {
    const s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: {}, players: [{ name: 'A', deck: [{ name: chave, qty: 20, zone: 'main' }, { name: 'Mountain', qty: 20, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Urso', qty: 20, zone: 'main' }, { name: 'Island', qty: 20, zone: 'main' }] }] });
    const meus = Object.values(s.objects).filter(o => o.owner === 0 && o.name !== 'Mountain');
    eq([meus.length, [...new Set(meus.map(o => o.name))]], [20, ['Assault // Battery']], chave);
    eq([s.facts['Assault // Battery'].cmc, J(s.facts['Assault // Battery'].types).sort()], [5, ['sorcery']], chave);
  }
});

test('Bot · as duas metades com os mesmos alvos são jogadas diferentes para o bot (D3): chaves distintas e empate estável nas duas ordens; sem `face` a chave não muda', () => {
  const B = loadModules().bot;
  const c = [{ t: 'cast', p: 0, oid: 'o1', face: 'esquerda', targets: [{ oid: 'o9' }] }, { t: 'cast', p: 0, oid: 'o1', face: 'direita', targets: [{ oid: 'o9' }] }];
  assert.notEqual(B.chaveAcao(c[0]), B.chaveAcao(c[1]));
  assert.equal(B.chaveAcao({ t: 'cast', p: 0, oid: 'o1' }), B.chaveAcao({ t: 'cast', p: 0, oid: 'o1', face: null }));
  assert.equal(E.chaveDeFaceT({ t: 'cast', oid: 'o1' }), '');
  eq([B.escolhe(c, () => 1).acao.face, B.escolhe([...c].reverse(), () => 1).acao.face], ['direita', 'direita'], 'mesmo empate, mesma escolha');
  eq([B.escolhe(c, x => (x.face === 'direita' ? 2 : 1)).acao.face, B.escolhe([...c].reverse(), x => (x.face === 'esquerda' ? 2 : 1)).acao.face], ['direita', 'esquerda']);
});
