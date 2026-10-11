// T-3 · CR5 · Veículos e tripular (Comprehensive Rules 301.7 e 702.122, com 208.3a).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge,
// clone de 11/10/2026): Mobilizer Mech, Gearshift Ace, Speedway Fanatic, Veteran Motorist, Hotshot Mechanic, Giant Ox e Revoke
// Privileges. Os Veículos "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, J, act, poe, legais, passaAte, resolveUm, palavrasDoTexto, valorDeMana } from './listas.mjs';
import { loadModules } from './_load.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const CARTAS = {};
for (const c of L('oficiais-tipos.json')) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } }; // os scripts sintéticos não passam pelo S8; o campo é exigido pelo validador
const VIRA = { do: 'animate', target: 'self-source', becomes: { types: ['artifact', 'creature'], addTypes: true } };
const tripular = (n, mais = []) => ({ kind: 'activated', label: 'Tripular ' + n, cost: { crew: n }, effects: [VIRA, ...mais] });
const ganha = amount => [{ do: 'gain', amount }];
const SCRIPTS = {
  'Carro': { name: 'Carro', abilities: [tripular(3)], ...EX },
  'Carrinho': { name: 'Carrinho', abilities: [tripular(1)], ...EX },
  // "Whenever ~ becomes crewed, you gain life equal to the number of creatures that crewed it" (o valor do gatilho, 702.122e)
  'Carro Contador': { name: 'Carro Contador', abilities: [{ kind: 'triggered', when: 'becomes-crewed', effects: [{ do: 'gain', amount: { per: 'trigger-value' } }] }, tripular(1, [{ do: 'tripulada' }])], ...EX },
  'Piloto': { name: 'Piloto', abilities: [{ kind: 'triggered', when: 'crews', effects: ganha(10) }], ...EX },
  'Proibido': { name: 'Proibido', self: { naoTripula: true }, ...EX },
  'Capitã': { name: 'Capitã', self: { suasTripulamMais: 2 }, ...EX },
  'Sopro': { name: 'Sopro', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Vira': { name: 'Vira', effects: [{ do: 'tap', target: 'creature' }], ...EX },
  'Cala': { name: 'Cala', effects: [{ do: 'continuo', target: 'creature', torna: { perdeHabilidades: true } }], ...EX }, // "loses all abilities until end of turn"
};
carta('Carro', 'Artifact — Vehicle', { power: '3', toughness: '3' });
carta('Carrinho', 'Artifact — Vehicle', { power: '1', toughness: '1' });
carta('Carro Contador', 'Artifact — Vehicle', { power: '2', toughness: '2' });
carta('Piloto', 'Creature — Human Pilot', { power: '1', toughness: '1' });
carta('Proibido', 'Creature — Human', { power: '5', toughness: '5' });
carta('Capitã', 'Creature — Human Pilot', { power: '0', toughness: '3' });
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Filhote', 'Creature — Bear', { power: '1', toughness: '1' });
carta('Muro', 'Creature — Wall', { power: '0', toughness: '4' });
carta('Sopro', 'Instant'); carta('Vira', 'Instant'); carta('Cala', 'Instant');

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
/** Partida livre no modo completo, parada na 1ª fase principal de A, com a pilha vazia. */
function mesa(a = [], b = a, seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += 9; return s; };
function conjura(s, p, nome, f = () => true) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && f(x))[0];
  assert.ok(a, `conjurar ${nome}: nenhuma ação legal`);
  return [act(s, a), oid];
}
/** Põe no campo de `p` uma permanente de cada nome, sem enjoo. Devolve [estado, ...oids]. */
function campo(s, p, ...nomes) { const oids = []; for (const n of nomes) { let oid; [s, oid] = poe(s, p, n, 'battlefield'); oids.push(oid); } return [s, ...oids]; }
/** Valores do motor vêm de outro contexto (vm): compara pelo conteúdo. */
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const vida = (s, p = 0) => s.players[p].life - 20;
const virada = (s, oid) => !!s.objects[oid].tapped;
const ehCriatura = (s, oid) => E.isCreature(s, s.objects[oid]);
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
const tem = (s, oid, k) => E.hasKeyword(s, s.objects[oid], k);
const pilha = s => [...s.stack].map(x => s.objects[x]).filter(o => o.ability).map(o => String(o.name));
const esvazia = s => passaAte(s, x => !x.stack.length || !!x.pending);
const grupos = (s, v, p = 0) => legais(s, p, a => a.t === 'activate' && a.oid === v).map(a => a.pay.crew.slice().sort().join('+')).sort();
const tripula = (s, v, lista, p = 0) => act(s, { t: 'activate', p, oid: v, index: 0, pay: { crew: lista } });
const alvo = oid => a => (a.targets || [])[0] && a.targets[0].oid === oid;

/* ---------------- 301.7 · Veículo ---------------- */
test('CR 301.7a · o Veículo tem o P/T impresso só enquanto é criatura: parado no campo não é criatura, não ataca e não conta para efeito que olha criaturas', () => {
  let s, v, u; [s, v, u] = campo(mesa(['Carro', 'Urso']), 0, 'Carro', 'Urso');
  assert.equal(ehCriatura(s, v), false, 'Veículo sem tripulação não é criatura');
  assert.ok(E.tiposDe(s, s.objects[v]).includes('artifact'));
  assert.ok(!E.eligibleAttackers(s, 0).includes(v), 'não ataca');
  assert.ok(!E.candidatosATripular(s, 0, u).includes(v), 'e não tripula outro Veículo');
});

test('CR 301.7b · 702.122a · tripulado, o Veículo vira criatura artefato até o fim do turno, com o P/T impresso; na limpeza volta a ser só artefato', () => {
  let s, v, u, f; [s, v, u, f] = campo(mesa(['Carro', 'Urso', 'Filhote']), 0, 'Carro', 'Urso', 'Filhote');
  s = tripula(s, v, [u, f]);
  eq(pilha(s), ['Carro'], 'tripular usa a pilha');
  assert.equal(ehCriatura(s, v), false, 'ainda não resolveu');
  assert.ok(virada(s, u) && virada(s, f), 'as criaturas viram no pagamento');
  s = esvazia(s);
  assert.ok(ehCriatura(s, v)); eq(pt(s, v), [3, 3]);
  eq(['artifact', 'creature'].map(t => E.tiposDe(s, s.objects[v]).includes(t)), [true, true], 'criatura artefato');
  assert.match(E.linhaDeTipo(s, s.objects[v]), /Vehicle/, 'continua Veículo');
  s = passaAte(s, x => x.turn.active === 1);
  assert.equal(ehCriatura(s, v), false, 'no turno seguinte não é mais criatura');
});

/* ---------------- 702.122a · quem tripula ---------------- */
test('CR 702.122a · "qualquer número de outras criaturas": os grupos mínimos seguem oferecidos direto, e a escolha livre deixa virar criatura a mais de propósito', () => {
  let s, v, u1, u2, f; [s, v, u1, u2, f] = campo(mesa(['Carro', 'Urso', 'Filhote']), 0, 'Carro', 'Urso', 'Urso', 'Filhote');
  eq(grupos(s, v), [[u1, u2].sort().join('+'), [u1, f].sort().join('+'), [u2, f].sort().join('+')].sort(), 'grupos mínimos: dois Ursos, ou um Urso e o Filhote');
  const abre = legais(s, 0, a => a.t === 'tripular' && a.oid === v);
  assert.equal(abre.length, 1, 'a escolha livre é oferecida (há criatura sobrando)');
  s = act(s, abre[0]);
  assert.equal(s.pending.kind, 'tripular'); assert.equal(virada(s, u1), false, 'nada é pago ao abrir a escolha');
  eq(legais(s, 0, a => a.t !== 'concede').map(a => a.t), ['tripulante', 'tripulante', 'tripulante'], 'só as três criaturas');
  assert.ok(!legais(s, 0).some(a => a.t === 'tripular_pronto'), 'sem a soma não há "pronto"');
  assert.throws(() => act(s, { t: 'tripular_pronto', p: 0 }), /poder total 3 ou mais/);
  assert.throws(() => act(s, { t: 'pass', p: 0 }), e => e.code === 'pendente' && /escolha quem tripula o Veículo primeiro/.test(e.message));
  s = act(s, { t: 'tripulante', p: 0, oid: u1 });
  assert.throws(() => act(s, { t: 'tripulante', p: 0, oid: u1 }), /não pode tripular agora/, 'a mesma criatura não entra duas vezes');
  assert.ok(!legais(s, 0).some(a => a.t === 'tripular_pronto'), 'poder 2 de 3: ainda não');
  s = act(s, { t: 'tripulante', p: 0, oid: u2 });
  assert.ok(legais(s, 0).some(a => a.t === 'tripular_pronto'), 'poder 4 de 3: pode fechar');
  assert.ok(legais(s, 0).some(a => a.t === 'tripulante' && a.oid === f), 'e ainda pode pôr o Filhote');
  s = act(s, { t: 'tripulante', p: 0, oid: f });
  const r = E.apply(s, { t: 'tripular_pronto', p: 0 }); s = r.state;
  assert.equal(s.pending, null);
  assert.ok(virada(s, u1) && virada(s, u2) && virada(s, f), 'as três viraram (uma a mais que o necessário)');
  eq(pilha(s), ['Carro']);
  eq(E.tripulantesDe(s, s.objects[v]).sort(), [u1, u2, f].sort());
  s = esvazia(s); assert.ok(ehCriatura(s, v));
});

test('CR 702.122a · o motor aceita qualquer grupo que some N em `activate` (não só os mínimos) e recusa grupo que não soma, criatura virada, do oponente, repetida ou o próprio Veículo', () => {
  let s, v, u1, u2, f, deB; [s, v, u1, u2, f] = campo(mesa(['Carro', 'Urso', 'Filhote']), 0, 'Carro', 'Urso', 'Urso', 'Filhote');
  [s, deB] = campo(s, 1, 'Urso');
  assert.ok(virada(tripula(s, v, [u1, u2, f]), f), 'grupo com sobra é aceito');
  assert.throws(() => tripula(s, v, [u1]), /poder total 3 ou mais/);
  assert.throws(() => tripula(s, v, [u1, u1]), /poder total 3 ou mais/, 'repetida');
  assert.throws(() => tripula(s, v, [u1, deB]), /poder total 3 ou mais/, 'criatura do oponente');
  const t = J(s); t.objects[u2].tapped = true;
  assert.throws(() => tripula(t, v, [u1, u2]), /poder total 3 ou mais/, 'criatura virada');
  // o Veículo que já é criatura não tripula a si mesmo ("other")
  let w = esvazia(tripula(s, v, [u1, u2]));
  assert.ok(ehCriatura(w, v));
  assert.throws(() => tripula(w, v, [v]), /poder total 3 ou mais/);
  assert.ok(!E.candidatosATripular(w, 0, v).includes(v));
});

test('CR 702.122a · a escolha livre só aparece quando há criatura sobrando; criatura com enjoo de invocação tripula (o custo não é o {T} dela); Veículo que já é criatura tripula outro', () => {
  let s, v, u; [s, v, u] = campo(mesa(['Carrinho', 'Urso', 'Carro']), 0, 'Carrinho', 'Urso');
  assert.equal(legais(s, 0, a => a.t === 'tripular').length, 0, 'uma criatura só: não há o que escolher além do grupo mínimo');
  s = J(s); s.objects[u].sick = true; s.objects[u].entrouNoTurno = s.turn.number;
  eq(grupos(s, v), [u], 'com enjoo, tripula');
  s = esvazia(tripula(s, v, [u]));
  let c; [s, c] = campo(s, 0, 'Carro');
  assert.ok(E.candidatosATripular(s, 0, c).includes(v), 'o Carrinho tripulado (criatura 1/1) é candidato a tripular o Carro');
  assert.equal(E.forcaDeTripular(s, s.objects[v]), 1);
});

/* ---------------- 702.122b · "crews a Vehicle" ---------------- */
test('CR 702.122b · 208.3a · "Whenever ~ crews a Vehicle, that Vehicle gains first strike": dispara no pagamento, resolve antes da habilidade de tripular (o Veículo ainda não é criatura) e vale quando ele vira criatura', () => {
  let s, v, ace; [s, v, ace] = campo(mesa(['Carrinho', 'Gearshift Ace']), 0, 'Carrinho', 'Gearshift Ace');
  s = tripula(s, v, [ace]);
  eq(pilha(s), ['Carrinho', 'Gearshift Ace'], 'o gatilho fica acima da habilidade de tripular');
  s = resolveUm(s);
  eq(pilha(s), ['Carrinho']); assert.equal(ehCriatura(s, v), false, 'o gatilho resolveu com o Veículo ainda sem ser criatura');
  s = esvazia(s);
  assert.ok(ehCriatura(s, v)); assert.ok(tem(s, v, 'first strike'), 'iniciativa até o fim do turno');
  s = passaAte(s, x => x.turn.active === 1);
  assert.equal(tem(s, v, 'first strike'), false, 'só até o fim do turno');
});

test('CR 702.122b · cada criatura virada para pagar tripula: Gearshift Ace e Speedway Fanatic disparam os dois; Veteran Motorist dá +1/+1 (exemplo de 208.3a); virar por outro motivo não dispara', () => {
  let s, v, ace, fan, mot; [s, v, ace, fan, mot] = campo(mesa(['Carro', 'Gearshift Ace', 'Speedway Fanatic', 'Veteran Motorist', 'Vira']), 0, 'Carro', 'Gearshift Ace', 'Speedway Fanatic', 'Veteran Motorist');
  let t = tripula(s, v, [ace, fan, mot]);
  while (t.pending && t.pending.kind === 'triggers') t = act(t, legais(t, 0)[0]); // três gatilhos do mesmo jogador: a mesa pede a ordem
  assert.equal(pilha(t).length, 4, 'três gatilhos e a habilidade de tripular: ' + pilha(t));
  t = esvazia(t);
  assert.ok(tem(t, v, 'first strike') && tem(t, v, 'haste')); eq(pt(t, v), [4, 4], '3/3 impresso +1/+1 do Veteran Motorist');
  // virar a Ace com um efeito não é tripular
  let x; [s, x] = conjura(s, 0, 'Vira', alvo(ace)); s = esvazia(s);
  assert.ok(virada(s, ace)); assert.equal(tem(s, v, 'first strike'), false);
});

test('CR 702.122b · o gatilho de quem tripula lembra o Veículo e a encarnação dele: se o Veículo sai do campo e volta, "that Vehicle" não é o objeto novo (400.7)', () => {
  let s, v, ace, x; [s, v, ace] = campo(mesa(['Carrinho', 'Gearshift Ace', 'Sopro']), 0, 'Carrinho', 'Gearshift Ace');
  s = tripula(s, v, [ace]);
  [s, x] = conjura(s, 0, 'Sopro', alvo(v)); s = resolveUm(s);
  assert.equal(s.objects[v].zone, 'hand');
  s = J(s); s.zones[0].hand.splice(s.zones[0].hand.indexOf(v), 1); s.zones[0].battlefield.push(v); Object.assign(s.objects[v], { zone: 'battlefield', zc: (s.objects[v].zc || 0) + 1 });
  s = esvazia(s);
  assert.equal(tem(s, v, 'first strike'), false, 'o Veículo que voltou é outro objeto');
});

/* ---------------- 702.122c · "crewed by" ---------------- */
test('CR 702.122c · "tripulado por": soma as criaturas viradas para pagar a tripulação dele no turno, em todas as ativações, e zera no turno seguinte ou se ele mudar de zona', () => {
  let s, v, u, f, w; [s, v, u, f, w] = campo(mesa(['Carrinho', 'Urso', 'Filhote']), 0, 'Carrinho', 'Urso', 'Filhote', 'Carrinho');
  eq(E.tripulantesDe(s, s.objects[v]), []);
  s = esvazia(tripula(s, v, [u]));
  eq(E.tripulantesDe(s, s.objects[v]), [u]);
  s = esvazia(tripula(s, v, [f]));
  eq(E.tripulantesDe(s, s.objects[v]).sort(), [u, f].sort(), 'as duas ativações do turno');
  eq(E.tripulantesDe(s, s.objects[w]), [], 'o outro Veículo não foi tripulado');
  const t = J(s); t.objects[v].zc = (t.objects[v].zc || 0) + 1;
  eq(E.tripulantesDe(t, t.objects[v]), [], 'outra encarnação: nada');
  s = passaAte(s, x => x.turn.active === 1);
  eq(E.tripulantesDe(s, s.objects[v]), [], 'no turno seguinte: nada');
});

/* ---------------- 702.122d · "can't crew Vehicles" ---------------- */
test('CR 702.122d · "não pode tripular Veículos" (Revoke Privileges na criatura): ela fica fora dos grupos oferecidos, da escolha livre e do pagamento; sem a Aura volta a tripular', () => {
  let s, v, u, f, x; [s, v, u, f] = campo(mesa(['Carro', 'Urso', 'Filhote', 'Revoke Privileges', 'Sopro']), 0, 'Carro', 'Urso', 'Urso', 'Filhote');
  let aura; [s, aura] = conjura(s, 0, 'Revoke Privileges', alvo(u)); s = esvazia(s);
  assert.equal(s.objects[aura].attachedTo, u);
  assert.ok(!E.candidatosATripular(s, 0, v).includes(u));
  assert.ok(grupos(s, v).every(g => !g.split('+').includes(u)), 'nenhum grupo com a criatura encantada: ' + grupos(s, v));
  assert.throws(() => tripula(s, v, [u, f]), /poder total 3 ou mais/);
  [s, x] = conjura(s, 0, 'Sopro', alvo(aura)); s = esvazia(s);
  assert.ok(E.candidatosATripular(s, 0, v).includes(u), 'sem a Aura, tripula de novo');
});

test('CR 702.122d · criatura com "não pode tripular" impresso: fora da conta mesmo sendo a única com poder suficiente; perdendo as habilidades, pode', () => {
  let s, v, p, x; [s, v, p] = campo(mesa(['Carro', 'Proibido', 'Cala']), 0, 'Carro', 'Proibido');
  eq(grupos(s, v), [], 'ninguém pode tripular');
  assert.equal(legais(s, 0, a => a.t === 'tripular').length, 0);
  assert.throws(() => tripula(s, v, [p]), /poder total 3 ou mais/);
  [s, x] = conjura(s, 0, 'Cala', alvo(p)); s = esvazia(s);
  eq(grupos(s, v), [p], 'sem as habilidades impressas, tripula');
  assert.ok(ehCriatura(esvazia(tripula(s, v, [p])), v));
});

/* ---------------- 702.122e · "becomes crewed" ---------------- */
test('CR 702.122e · "Whenever ~ becomes crewed" dispara quando a habilidade de tripular RESOLVE (não na ativação), uma vez por ativação, e só conta as criaturas viradas para pagar aquela ativação', () => {
  let s, v, u, f, g; [s, v, u, f, g] = campo(mesa(['Carro Contador', 'Urso', 'Filhote']), 0, 'Carro Contador', 'Urso', 'Filhote', 'Filhote');
  s = tripula(s, v, [u, f]);
  eq(pilha(s), ['Carro Contador'], 'na ativação só a habilidade de tripular está na pilha');
  s = tripula(s, v, [g]); // em resposta, tripula de novo com uma criatura só
  s = resolveUm(s);
  eq(pilha(s), ['Carro Contador', 'Carro Contador'], 'a 2ª ativação resolveu: o gatilho dela foi para a pilha');
  s = resolveUm(s); assert.equal(vida(s), 1, 'tripulado por uma criatura naquela ativação');
  s = esvazia(s); assert.equal(vida(s), 1 + 2, 'a 1ª ativação: duas criaturas');
  assert.equal(s.tripulou, undefined, 'o registro das ativações some quando elas resolvem');
});

test('CR 702.122e · se o Veículo saiu do campo antes de a habilidade de tripular resolver, ele não fica tripulado', () => {
  let s, v, u, x; [s, v, u] = campo(mesa(['Carro Contador', 'Urso', 'Sopro']), 0, 'Carro Contador', 'Urso');
  s = tripula(s, v, [u]);
  [s, x] = conjura(s, 0, 'Sopro', alvo(v)); s = esvazia(s);
  assert.equal(s.objects[v].zone, 'hand'); assert.equal(vida(s), 0, 'nenhum gatilho');
});

test('CR 702.122e · Mobilizer Mech: ao ficar tripulado, até um outro Veículo seu alvo vira criatura artefato até o fim do turno (pode não escolher nenhum)', () => {
  let s, mech, carro, u1, u2; [s, mech, carro, u1, u2] = campo(mesa(['Mobilizer Mech', 'Carro', 'Urso']), 0, 'Mobilizer Mech', 'Carro', 'Urso', 'Urso');
  assert.ok(tem(s, mech, 'flying'), 'voar vem do texto');
  s = tripula(s, mech, [u1, u2]); s = resolveUm(s);
  assert.ok(ehCriatura(s, mech)); eq(pt(s, mech), [3, 4]);
  // o gatilho pede o alvo ao ir à pilha: o Carro (outro Veículo seu) é o único alvo; o próprio Mech não é
  if (s.pending && s.pending.kind === 'pick_target') {
    const nomes = s.pending.options.map(o => (o && o.oid != null ? s.objects[o.oid].name : 'nenhum'));
    assert.ok(nomes.includes('Carro') && !nomes.includes('Mobilizer Mech'), 'alvos: ' + nomes);
    s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o && o.oid === carro) });
  }
  s = esvazia(s);
  assert.ok(ehCriatura(s, carro), 'o Carro virou criatura sem ser tripulado'); eq(pt(s, carro), [3, 3]);
  assert.equal(virada(s, carro), false);
  s = passaAte(s, x => x.turn.active === 1);
  assert.equal(ehCriatura(s, carro), false);
});

/* ---------------- força de tripular ---------------- */
test('CR 702.122a · "crews Vehicles as though its power were 2 greater" (Hotshot Mechanic) e "using its toughness rather than its power" (Giant Ox) mudam só a conta da tripulação', () => {
  let s, v, hot, boi, muro; [s, v, hot, boi, muro] = campo(mesa(['Carro', 'Hotshot Mechanic', 'Giant Ox', 'Muro']), 0, 'Carro', 'Hotshot Mechanic', 'Giant Ox', 'Muro');
  eq(pt(s, hot), [2, 1], 'o poder de verdade não muda');
  eq([hot, boi, muro].map(x => E.forcaDeTripular(s, s.objects[x])), [4, 6, 0]);
  eq(grupos(s, v), [boi, hot].sort(), 'cada uma tripula o Carro (Crew 3) sozinha; o Muro 0/4 não soma nada');
  assert.ok(ehCriatura(esvazia(tripula(s, v, [hot])), v));
});

test('CR 702.122a · "Each creature you control crews Vehicles as though its power were 2 greater": vale para as suas e não para as do oponente; poder negativo conta como 0', () => {
  let s, v, cap, f, deB; [s, v, cap, f] = campo(mesa(['Carro', 'Capitã', 'Filhote']), 0, 'Carro', 'Capitã', 'Filhote');
  [s, deB] = campo(s, 1, 'Filhote');
  eq([cap, f, deB].map(x => E.forcaDeTripular(s, s.objects[x])), [2, 3, 1], 'as de A ganham 2; a de B não');
  eq(grupos(s, v), [f], 'o Filhote 1/1 tripula o Carro sozinho');
  const t = J(s); t.objects[f].counters.m1m1 = 4; // poder −3: como se fosse −1 → conta 0
  assert.equal(E.forcaDeTripular(t, t.objects[f]), 0);
});

/* ---------------- S8 · cartas exemplo ---------------- */
test('S8 · cenário das cartas exemplo com a linha de tipo real: scripts válidos e o efeito de cada uma numa partida', () => {
  for (const n of ['Mobilizer Mech', 'Gearshift Ace', 'Speedway Fanatic', 'Veteran Motorist', 'Hotshot Mechanic', 'Giant Ox', 'Revoke Privileges']) {
    const sc = S.SCRIPTS[n]; assert.ok(sc && sc.example, n + ' tem script e cenário'); eq([...S.validateScript(sc)], [], n);
  }
  assert.equal(S.SCRIPTS['Revoke Privileges'].covers, 'partial', 'a Aura é parcial declarada (falta não atacar nem bloquear)');
  assert.match(S.SCRIPTS['Revoke Privileges'].note, /atacar nem bloquear/);
  // Veteran Motorist conjurado: vidência 2 ao entrar (decisão do jogador)
  let s = mesa(['Veteran Motorist']), m; [s, m] = conjura(s, 0, 'Veteran Motorist'); s = passaAte(s, x => !x.stack.length || !!x.pending);
  assert.ok(s.pending, 'vidência 2 pede a escolha: ' + JSON.stringify(s.pending && s.pending.kind));
});

/* ---------------- validador, estado e guarda-corpos ---------------- */
test('CR 702.122 · validador: "tripulada" só fecha habilidade de tripular; "becomes-crewed" exige a habilidade de tripular terminada em "tripulada"; chaves de self conferidas', () => {
  const v = sc => S.validateScript({ name: 'X', ...sc, ...EX }).join(' | ');
  assert.equal(v({ abilities: [{ kind: 'triggered', when: 'becomes-crewed', effects: ganha(1) }, tripular(2, [{ do: 'tripulada' }])] }), '');
  assert.match(v({ abilities: [{ kind: 'triggered', when: 'becomes-crewed', effects: ganha(1) }, tripular(2)] }), /becomes-crewed.*tripulada/);
  assert.match(v({ abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'tripulada' }] }] }), /só vale como último efeito de uma habilidade de tripular/);
  assert.match(v({ abilities: [{ kind: 'activated', cost: { crew: 1 }, effects: [{ do: 'tripulada' }, VIRA] }] }), /último efeito/);
  assert.match(v({ self: { tripulaMais: 0 } }), /tripulaMais precisa ser um inteiro positivo/);
  assert.match(v({ self: { tripulaPela: 'defesa' } }), /só conhece 'resistencia'/);
  assert.match(v({ self: { anexadaNaoTripula: true } }), /só vale em Aura ou Equipamento/);
  assert.equal(v({ self: { naoTripula: true } }), '');
});

test('CR 702.122 · partida sem Veículo não ganha campo novo no estado (o hash das partidas existentes não muda)', () => {
  let s = mesa(['Urso']);
  for (let i = 0; i < 60 && s.status !== 'over'; i++) { const a = E.legalActions(s, s.pending ? s.pending.p : s.turn.priority); s = act(s, a.find(x => x.t === 'pass') || a[0]); }
  assert.equal(s.tripulou, undefined); assert.ok(!Object.values(s.objects).some(o => o.tripulantes));
});

test('CR 702.122a · passeio aleatório com Veículos e pilotos: toda ação oferecida é aceita, as invariantes valem a cada passo e a escolha livre é exercitada', () => {
  let abriu = 0, fechou = 0;
  for (let seed = 1; seed <= 6; seed++) {
    let s = mesa(['Carro', 'Carrinho', 'Carro Contador', 'Urso', 'Filhote', 'Gearshift Ace', 'Hotshot Mechanic'], undefined, seed), r = seed * 7919;
    [s] = campo(s, 0, 'Carro', 'Carro Contador', 'Urso', 'Urso', 'Filhote', 'Gearshift Ace'); [s] = campo(s, 1, 'Carrinho', 'Hotshot Mechanic', 'Filhote');
    for (let i = 0; i < 260 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority, acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação para ${p} (${s.pending && s.pending.kind})`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => ['tripular', 'tripulante', 'tripular_pronto', 'activate'].includes(a.t));
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (a.t === 'tripular') abriu++; if (a.t === 'tripular_pronto') fechou++;
      let out; try { out = E.apply(s, a); } catch (e) { assert.fail(`semente ${seed}, passo ${i}: ação oferecida recusada ${JSON.stringify(a)} — ${e.message}`); }
      s = out.state;
      const inv = E.invariants(s).filter(x => !/parado em passo sem prioridade/.test(x)); // pendência conhecida da trilha motor (514.3a), fora desta leva
      eq(inv, [], `semente ${seed}, passo ${i}, depois de ${a.t}`);
    }
  }
  assert.ok(abriu > 3 && fechou > 3, `a escolha livre foi aberta ${abriu} e fechada ${fechou} vezes`);
});

/* ---------------- mesa, Shark e goldfish ---------------- */
test('CR 702.122a · mesa: botão "Escolher quem tripula" na folha do Veículo, resumo da decisão para o aviso, registro em português; o Shark e o goldfish respondem à decisão', () => {
  const { bot: B } = loadModules();
  let s, v, u1, u2, f; [s, v, u1, u2, f] = campo(mesa(['Carro', 'Urso', 'Filhote']), 0, 'Carro', 'Urso', 'Urso', 'Filhote');
  eq(E.acoesDeTipos(s, 0, v).map(x => [x.label, x.action.t]), [['Escolher quem tripula', 'tripular']]);
  eq(E.acoesDeTipos(s, 0, u1), []);
  const a0 = { t: 'tripular', p: 0, oid: v, index: 0 };
  assert.match(T.describe(s, a0, [], s).join(' '), /A vai escolher quem tripula Carro/);
  s = act(s, a0);
  let tp = E.tripulacaoPendente(s);
  eq([tp.nome, tp.n, tp.soma, tp.pronto, tp.candidatos.map(c => `${c.nome} ${c.forca}`).sort().join(', ')], ['Carro', 3, 0, false, 'Filhote 1, Urso 2, Urso 2']);
  assert.equal(E.tripulacaoPadrao(s).t, 'tripulante', 'goldfish: sem a soma, põe uma criatura');
  const r = B.jogadaProfissional(s, 0, {});
  assert.ok(r && r.acao && r.acao.t === 'tripulante', 'jogada do Shark na decisão: ' + JSON.stringify(r && r.acao));
  const a1 = { t: 'tripulante', p: 0, oid: u1 };
  assert.match(T.describe(s, a1, [], s).join(' '), /A escolheu Urso para tripular/);
  s = act(act(s, a1), { t: 'tripulante', p: 0, oid: u2 });
  tp = E.tripulacaoPendente(s);
  eq([tp.soma, tp.pronto, tp.escolhidas.join(' + ')], [4, true, 'Urso + Urso']);
  eq(E.tripulacaoPadrao(s), { t: 'tripular_pronto', p: 0 }, 'goldfish: com a soma, fecha');
  assert.match(T.describe(s, { t: 'tripular_pronto', p: 0 }, [], s).join(' '), /A tripulou Carro com Urso \+ Urso/);
  const src = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(src, /pd\.kind === 'tripular' \? E\.tripulacaoPadrao\(s\)/, 'o goldfish tem resposta para a decisão (senão concederia a partida)');
  assert.match(src, /s\.pending\.kind === 'tripular' && s\.pending\.p === v/, 'a mesa tem o aviso da decisão');
  assert.match(src, /id: 'tb-tripular'/);
});
