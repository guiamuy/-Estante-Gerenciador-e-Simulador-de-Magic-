// T-1 · CR5 · Sagas (Comprehensive Rules 714, com 703.4f, 704.5s e o read ahead de 714.3b / 702.155).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge,
// consulta de 11/10/2026): History of Benalia, The Birth of Meletis e The Weatherseed Treaty. As Sagas "de Teste" são scripts
// sintéticos que isolam a regra: cada capítulo ganha uma quantidade de vida diferente (I = 1, II = 10, III = 100), de modo que a
// vida do jogador diz quais capítulos resolveram.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte, resolveUm, palavrasDoTexto, valorDeMana } from './listas.mjs';
import { loadModules } from './_load.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const OFICIAIS = L('oficiais-tipos.json');
const CARTAS = {};
for (const c of OFICIAIS) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } }; // os scripts sintéticos não passam pelo S8; o campo é exigido pelo validador
const ganha = n => [{ do: 'gain', amount: n }];
const cap = (chapters, effects) => ({ kind: 'triggered', when: 'chapter', chapters, effects });
const LORE1 = { entra: [{ afetados: 'self', marcadores: { lore: 1 } }] };
const maisLore = n => ({ kind: 'activated', cost: { mana: '{0}' }, effects: [{ do: 'counters', tipo: 'lore', amount: n, target: 'self-source' }] });
const menosLore = { kind: 'activated', cost: { removeCounters: { tipo: 'lore', n: 1 } }, effects: ganha(1000) };
const SCRIPTS = {
  'Saga de Teste': { name: 'Saga de Teste', ...LORE1, abilities: [cap([1], ganha(1)), cap([2], ganha(10)), cap([3], ganha(100)), maisLore(2), menosLore], ...EX },
  'Saga Dupla': { name: 'Saga Dupla', ...LORE1, abilities: [cap([1, 2], ganha(1)), cap([3], ganha(100)), maisLore(1)], ...EX },
  'Saga Adiantada': { name: 'Saga Adiantada', self: { readAhead: true }, abilities: [cap([1], ganha(1)), cap([2], ganha(10)), cap([3], ganha(100)), maisLore(2)], ...EX },
  'Saga de Um Capítulo': { name: 'Saga de Um Capítulo', self: { readAhead: true }, abilities: [cap([1], ganha(1))], ...EX },
  'Saga Mira': { name: 'Saga Mira', ...LORE1, abilities: [cap([1], ganha(1)), cap([2], [{ do: 'damage', amount: 1, target: 'any' }])], ...EX },
  'Saga Busca': { name: 'Saga Busca', ...LORE1, abilities: [cap([1], [{ do: 'search', amount: 1, filter: { types: ['land'], basic: true }, to: 'hand' }])], ...EX },
  'Saga Sem Alvo': { name: 'Saga Sem Alvo', ...LORE1, abilities: [cap([1], [{ do: 'destroy', target: 'creature' }])], ...EX },
  'Saga Criatura': { name: 'Saga Criatura', ...LORE1, abilities: [cap([1], ganha(1)), cap([2], ganha(10)), { kind: 'triggered', when: 'attacks', effects: ganha(1000) }], ...EX },
  'Vigia': { name: 'Vigia', abilities: [{ kind: 'triggered', when: 'other-sacrificed', effects: ganha(1000) }], ...EX },
  'Volta': { name: 'Volta', effects: [{ do: 'reanimate', target: 'permanent-in-your-graveyard' }], ...EX },
  'Imitação': { name: 'Imitação', effects: [{ do: 'ficha_copia', amount: 1, target: 'permanent' }], ...EX },
  'Sopro': { name: 'Sopro', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Quebra': { name: 'Quebra', effects: [{ do: 'destroy', target: 'enchantment' }], ...EX },
};
for (const n of ['Saga de Teste', 'Saga Dupla', 'Saga Adiantada', 'Saga de Um Capítulo', 'Saga Mira', 'Saga Busca', 'Saga Sem Alvo']) carta(n, 'Enchantment — Saga');
carta('Saga Blindada', 'Enchantment — Saga', { keywords: ['Indestructible'], oracle_text: 'Indestructible' }); SCRIPTS['Saga Blindada'] = { ...SCRIPTS['Saga Dupla'], name: 'Saga Blindada' };
carta('Saga Criatura', 'Enchantment Creature — Saga Spirit', { power: '2', toughness: '2' });
carta('Vigia', 'Creature — Human', { power: '1', toughness: '1' });
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Volta', 'Sorcery'); carta('Imitação', 'Sorcery'); carta('Sopro', 'Instant'); carta('Quebra', 'Instant');

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
/** Partida livre no modo completo, parada na 1ª fase principal de A, com a pilha vazia. */
function mesa(a = [], b = a, seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += 9; return s; };
/** Conjura a carta pelo motor (mão → pilha), com mana na reserva. Devolve [estado, oid]. */
function conjura(s, p, nome, f = () => true) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && f(x))[0];
  assert.ok(a, `conjurar ${nome}: nenhuma ação legal`);
  return [act(s, a), oid];
}
/** Conjura e resolve só a mágica: a Saga fica no campo e o capítulo dela (se houver) ainda está na pilha. */
function entra(s, p, nome) { let oid; [s, oid] = conjura(s, p, nome); return [resolveUm(s), oid]; }
const lore = (s, oid) => s.objects[oid].counters.lore || 0;
const vida = (s, p = 0) => s.players[p].life - 20;
const noCampo = (s, oid) => !!s.objects[oid] && s.objects[oid].zone === 'battlefield';
const pilha = s => [...s.stack].map(x => s.objects[x]).filter(o => o.ability).map(o => String(o.name));
const ativa = (s, p, oid, index) => act(mana(s, p), legais(mana(s, p), p, a => a.t === 'activate' && a.oid === oid && (a.index || 0) === index)[0] || assert.fail(`habilidade ${index} não oferecida`));
/** Passa até o começo da próxima fase principal pré-combate do jogador `p` (para logo depois da ação de turno, com o gatilho na pilha). */
const proximaPrincipal = (s, p) => { const n = s.turn.number; return passaAte(s, x => x.turn.number > n && x.turn.active === p && x.turn.step === 'main1'); };
const esvazia = s => passaAte(s, x => !x.stack.length || !!x.pending);

/* ---------------- 714.3a · entra com um marcador de lore ---------------- */
test('CR 714.3a · a Saga entra com um marcador de lore (substituição, sem pilha) e o capítulo I dispara ao entrar: vai à pilha e pode ser respondido', () => {
  let s = mesa(['History of Benalia']), saga;
  [s, saga] = entra(s, 0, 'History of Benalia');
  assert.equal(lore(s, saga), 1, 'um marcador de lore ao entrar');
  assert.deepEqual(pilha(s), ['History of Benalia'], 'o capítulo I está na pilha');
  assert.equal(s.turn.priority, 0, 'e o jogador ativo tem prioridade com ele na pilha (pode responder)');
  assert.equal(Object.values(s.objects).filter(o => o.token).length, 0, 'nada resolveu ainda');
  s = esvazia(s);
  const fichas = Object.values(s.objects).filter(o => o.token);
  assert.deepEqual(fichas.map(o => o.name), ['Knight']);
  const st = E.stats(s, fichas[0]);
  assert.deepEqual([st.power, st.toughness, E.hasKeyword(s, fichas[0], 'vigilance'), E.coresDe(s, fichas[0]).join('')], [2, 2, true, 'W'], '2/2 branca com vigilância');
  assert.ok(noCampo(s, saga), 'a Saga fica no campo depois do capítulo I');
});

test('CR 714.3a · vale para qualquer entrada no campo: devolvida do cemitério por um efeito e ficha que é cópia também entram com um marcador e disparam o capítulo I', () => {
  let s = mesa(['Saga de Teste', 'Volta', 'Imitação']), saga, x;
  [s, saga] = poe(s, 0, 'Saga de Teste', 'graveyard');
  [s, x] = conjura(s, 0, 'Volta'); s = resolveUm(s);
  assert.ok(noCampo(s, saga)); assert.equal(lore(s, saga), 1, 'reanimada: um marcador');
  assert.deepEqual(pilha(s), ['Saga de Teste']); s = esvazia(s); assert.equal(vida(s), 1, 'capítulo I');
  [s, x] = conjura(s, 0, 'Imitação', a => (a.targets || [])[0] && a.targets[0].oid === saga); s = resolveUm(s);
  const copia = Object.values(s.objects).find(o => o.token && o.name === 'Saga de Teste');
  assert.ok(copia, 'a ficha é cópia da Saga'); assert.equal(lore(s, copia.oid), 1, 'ficha: um marcador');
  s = esvazia(s); assert.equal(vida(s), 2, 'o capítulo I da ficha também resolveu');
});

/* ---------------- 714.3c / 703.4f · a ação de turno ---------------- */
test('CR 714.3c · no começo da fase principal pré-combate o jogador ativo põe um marcador em cada Saga sua, sem pilha e antes da prioridade; a conjurada na principal só ganha no turno seguinte', () => {
  let s = mesa(['Saga de Teste']), saga, outra;
  [s, saga] = entra(s, 0, 'Saga de Teste'); s = esvazia(s);
  assert.equal(lore(s, saga), 1, 'conjurada na própria fase principal: a ação de turno já passou');
  s = passaAte(s, x => x.turn.step === 'main2' && !x.stack.length); assert.equal(lore(s, saga), 1, 'nem na segunda principal');
  [s, outra] = poe(s, 0, 'Saga de Teste', 'hand');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.equal(lore(s, saga), 1, 'no turno do oponente a Saga não ganha marcador');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'draw');
  assert.equal(lore(s, saga), 1, 'nem na manutenção ou na compra do dono');
  const r = E.apply(s, { t: 'pass', p: s.turn.priority }), r2 = r.state.turn.step === 'main1' ? r : E.apply(r.state, { t: 'pass', p: r.state.turn.priority });
  s = r2.state;
  assert.equal(s.turn.step, 'main1'); assert.equal(lore(s, saga), 2, 'a fase principal começou: segundo marcador');
  assert.deepEqual(pilha(s), ['Saga de Teste'], 'o capítulo II já está na pilha quando o jogador recebe prioridade');
  assert.ok(r2.events.some(e => e.kind === 'effect' && e.do === 'counters' && e.tipo === 'lore' && e.amount === 1), 'o marcador aparece no registro');
  s = esvazia(s); assert.equal(vida(s), 11, 'capítulos I e II resolveram');
});

test('CR 714.3c · dois jogadores com Sagas: cada um só ganha marcador no próprio turno; a que entrou antes da fase principal do mesmo turno também ganha', () => {
  let s = mesa(['Saga de Teste', 'Volta']), a, b;
  [s, a] = entra(s, 0, 'Saga de Teste'); s = esvazia(s);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep');
  // a Saga de B entra na manutenção dele (posta no campo pelo motor, como por um efeito): na principal do MESMO turno ela ganha o segundo marcador
  [s, b] = poe(s, 1, 'Saga de Teste', 'graveyard'); let v; [s, v] = poe(s, 1, 'Volta', 'hand');
  s = J(s); s.facts['Volta'] = { ...s.facts['Volta'], types: ['instant'], flash: true };
  s = act(mana(s, 1), legais(mana(s, 1), 1, x => x.t === 'cast' && x.oid === v)[0]); s = esvazia(s);
  assert.deepEqual([lore(s, a), lore(s, b)], [1, 1]);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.deepEqual([lore(s, a), lore(s, b)], [1, 2], 'turno de B: só a Saga de B');
  s = esvazia(s); assert.deepEqual([vida(s, 0), vida(s, 1)], [1, 11]);
  s = proximaPrincipal(s, 0);
  assert.deepEqual([lore(s, a), lore(s, b)], [2, 2], 'turno de A: só a Saga de A');
});

/* ---------------- 714.2 · habilidades de capítulo ---------------- */
test('CR 714.2b · pôr dois marcadores de uma vez dispara cada capítulo atravessado uma vez, e o controlador escolhe a ordem entre eles', () => {
  let s = mesa(['Saga de Teste']), saga;
  [s, saga] = entra(s, 0, 'Saga de Teste'); s = esvazia(s);
  s = ativa(s, 0, saga, 0); s = resolveUm(s); // "ponha dois marcadores de lore": de 1 para 3
  assert.equal(lore(s, saga), 3);
  assert.equal(s.pending && s.pending.kind, 'triggers', 'capítulos II e III dispararam juntos: a ordem é do controlador');
  assert.deepEqual(J(s.queued.map(q => [q.when, q.capitulo])), [['chapter', 2], ['chapter', 3]]);
  assert.ok(noCampo(s, saga), 'com capítulo na fila a Saga não é sacrificada (714.4)');
  s = act(s, { t: 'order_trigger', p: 0, index: 1 }); // o III vai primeiro à pilha; o II resolve antes
  s = passaAte(s, x => x.stack.length === 2); s = resolveUm(s);
  assert.equal(vida(s), 11, 'resolveu o II (topo da pilha)'); assert.ok(noCampo(s, saga), 'o III ainda está na pilha');
  s = esvazia(s);
  assert.equal(vida(s), 111, 'I, II e III, cada um uma vez'); assert.equal(s.objects[saga].zone, 'graveyard');
});

test('CR 714.2c · "I, II — efeito" são dois capítulos com o mesmo efeito: dispara no primeiro e no segundo marcador (History of Benalia cria um Cavaleiro em cada)', () => {
  let s = mesa(['History of Benalia']), saga;
  [s, saga] = entra(s, 0, 'History of Benalia'); s = esvazia(s);
  s = esvazia(proximaPrincipal(s, 0));
  assert.equal(lore(s, saga), 2);
  assert.equal(Object.values(s.objects).filter(o => o.token && o.name === 'Knight').length, 2, 'um Cavaleiro por capítulo');
  // dois marcadores de uma vez numa Saga "I, II —": os dois capítulos disparam (efeitos iguais: sem pergunta de ordem)
  let t = mesa(['Saga Dupla']), d;
  [t, d] = poe(t, 0, 'Saga Dupla', 'graveyard'); t = J(t);
  t.zones[0].graveyard.splice(t.zones[0].graveyard.indexOf(d), 1); t.zones[0].battlefield.push(d); Object.assign(t.objects[d], { zone: 'battlefield', entrouNoTurno: 0 }); // no campo sem marcador
  t = ativa(t, 0, d, 0); t = resolveUm(t); assert.equal(lore(t, d), 1); t = esvazia(t); assert.equal(vida(t), 1, 'capítulo I');
  t = ativa(t, 0, d, 0); t = esvazia(t);
  assert.equal(vida(t), 2, 'capítulos I e II, mesmo efeito, um de cada vez');
});

test('CR 714.2b · o capítulo é habilidade disparada: escolhe o alvo ao ir para a pilha (a mesa pergunta) e a Saga espera a escolha', () => {
  let s = mesa(['Saga Mira']), saga;
  [s, saga] = entra(s, 0, 'Saga Mira'); s = esvazia(s);
  s = proximaPrincipal(s, 0);
  assert.equal(s.pending && s.pending.kind, 'pick_target', 'capítulo II: "causa 1 de dano a qualquer alvo"');
  assert.equal(lore(s, saga), 2); assert.ok(noCampo(s, saga), 'marcadores no capítulo final, mas o capítulo disparou e ainda não saiu da pilha (714.4)');
  assert.equal(E.capituloPendente(s, s.objects[saga]), true);
  const i = s.pending.options.findIndex(o => o.player === 1);
  s = act(s, { t: 'pick_target', p: 0, index: i });
  assert.ok(noCampo(s, saga), 'na pilha: ainda não');
  s = esvazia(s);
  assert.equal(s.players[1].life, 19); assert.equal(s.objects[saga].zone, 'graveyard', 'resolveu: sacrificada');
});

test('CR 714.2d · Saga que perdeu as habilidades tem capítulo final 0: não ganha marcador na fase principal e não é sacrificada, mesmo com marcadores de sobra', () => {
  let s = mesa(['Saga de Teste']), saga;
  [s, saga] = entra(s, 0, 'Saga de Teste'); s = esvazia(s);
  s = J(s); s.objects[saga].faceDown = true; s.objects[saga].counters.lore = 5; // virada para baixo não tem as habilidades da frente (708.2)
  assert.equal(E.capituloFinal(s, s.objects[saga]), 0); assert.deepEqual(J(E.capitulosDe(s, s.objects[saga])), []);
  s = proximaPrincipal(s, 0);
  assert.equal(lore(s, saga), 5, 'sem capítulos, a ação de turno não põe marcador (714.3c)');
  assert.ok(noCampo(s, saga), 'e a ação de estado não a sacrifica (714.4)');
  assert.equal(vida(s), 1, 'nenhum capítulo disparou');
  assert.equal(E.capituloFinal(s, { ...s.objects[saga], faceDown: false }), 3, '714.2d/e: o capítulo final é o maior número');
});

/* ---------------- 714.4 / 704.5s · sacrifício ---------------- */
test('CR 714.4 · depois que o último capítulo resolve, o controlador SACRIFICA a Saga: quem observa sacrifício dispara e indestrutível não salva', () => {
  let s = mesa(['Saga Blindada', 'Vigia']), saga, vigia;
  [s, vigia] = poe(s, 0, 'Vigia');
  [s, saga] = entra(s, 0, 'Saga Blindada'); s = esvazia(s);
  assert.equal(E.hasKeyword(s, s.objects[saga], 'indestructible'), true);
  s = esvazia(proximaPrincipal(s, 0)); assert.ok(noCampo(s, saga), 'capítulo II resolvido: fica');
  s = proximaPrincipal(s, 0);
  assert.equal(lore(s, saga), 3); assert.deepEqual(pilha(s), ['Saga Blindada']);
  assert.ok(noCampo(s, saga), 'marcadores = capítulo final, mas o capítulo III está na pilha: ainda não');
  const r = E.apply(s, { t: 'pass', p: 0 }), r2 = E.apply(r.state, { t: 'pass', p: 1 });
  s = r2.state;
  assert.equal(s.objects[saga].zone, 'graveyard', 'o III resolveu: sacrificada, mesmo indestrutível');
  assert.ok(r2.events.some(e => e.kind === 'effect' && e.do === 'sacrificar' && e.name === 'Saga Blindada' && e.target === 'A'), 'evento de sacrifício no registro');
  assert.deepEqual(pilha(s), ['Vigia'], '"sempre que você sacrificar outra permanente" disparou');
  s = esvazia(s); assert.equal(vida(s), 1 + 1 + 100 + 1000);
});

test('CR 714.4 · marcadores acima do capítulo final com o gatilho pendente não sacrificam antes; se o capítulo final é anulado ou sai da pilha de outro jeito, a Saga é sacrificada', () => {
  let s = mesa(['Saga de Teste']), saga;
  [s, saga] = entra(s, 0, 'Saga de Teste'); s = esvazia(s);
  s = ativa(s, 0, saga, 0); s = resolveUm(s); s = act(s, { t: 'order_trigger', p: 0, index: 0 }); s = passaAte(s, x => x.stack.length === 2);
  s = ativa(s, 0, saga, 0); s = resolveUm(s); // mais dois marcadores em resposta: 5, acima do final
  assert.equal(lore(s, saga), 5); assert.equal(s.stack.length, 2); assert.ok(noCampo(s, saga), '5 marcadores e capítulos na pilha: fica');
  assert.equal(s.queued.length, 0, 'de 3 para 5 não atravessa capítulo nenhum: nada dispara de novo');
  // os capítulos saem da pilha sem resolver (anulados): na próxima conferência a Saga é sacrificada
  s = J(s); for (const x of s.stack.splice(0)) delete s.objects[x];
  assert.equal(E.capituloPendente(s, s.objects[saga]), false);
  s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[saga].zone, 'graveyard'); assert.equal(vida(s), 1, 'os capítulos II e III não resolveram');
});

test('CR 714.4 · capítulo final sem alvo legal sai da pilha sem resolver e a Saga é sacrificada; com o efeito do capítulo final parado numa escolha do jogador, o sacrifício espera a resolução terminar (704.4)', () => {
  let s = mesa(['Saga Sem Alvo']), saga;
  [s, saga] = entra(s, 0, 'Saga Sem Alvo'); // "destrua a criatura alvo" sem criatura no campo: o gatilho não vai à pilha
  assert.deepEqual(pilha(s), []); assert.equal(s.pending, null);
  assert.equal(s.objects[saga].zone, 'graveyard', 'capítulo final fora da pilha: sacrificada');
  let t = mesa(['Saga Busca']), b;
  const mao = t.zones[0].hand.length;
  [t, b] = entra(t, 0, 'Saga Busca'); t = passaAte(t, x => !!x.pending);
  assert.equal(t.pending.kind, 'pick'); assert.equal(t.stack.length, 0, 'a habilidade já saiu da pilha, mas ainda está resolvendo');
  assert.ok(noCampo(t, b), 'no meio da resolução do capítulo final a Saga continua no campo');
  t = act(t, legais(t, 0, a => a.t === 'pick')[0]); if (t.pending && t.pending.kind === 'pick') t = act(t, { t: 'pick_done', p: 0 });
  assert.equal(t.zones[0].hand.length, mao + 1, 'a busca terminou'); assert.equal(t.objects[b].zone, 'graveyard', 'e só então a Saga foi sacrificada');
});

test('CR 714.2b · tirar um marcador e repor redispara o capítulo: "era menor que N e passou a ser pelo menos N"', () => {
  let s = mesa(['Saga de Teste']), saga;
  [s, saga] = entra(s, 0, 'Saga de Teste'); s = esvazia(s);
  s = esvazia(proximaPrincipal(s, 0)); s = proximaPrincipal(s, 0);
  assert.equal(lore(s, saga), 3); assert.deepEqual(pilha(s), ['Saga de Teste']);
  s = ativa(s, 0, saga, 1); // em resposta ao capítulo III: "remova um marcador de lore: ganhe 1000"
  assert.equal(lore(s, saga), 2);
  s = esvazia(s);
  assert.equal(vida(s), 1 + 10 + 100 + 1000); assert.ok(noCampo(s, saga), 'o III resolveu com 2 marcadores: não é sacrificada');
  s = proximaPrincipal(s, 0);
  assert.equal(lore(s, saga), 3); assert.deepEqual(pilha(s), ['Saga de Teste'], 'de 2 para 3 de novo: o capítulo III dispara outra vez');
  s = esvazia(s); assert.equal(vida(s), 1 + 10 + 100 + 1000 + 100); assert.equal(s.objects[saga].zone, 'graveyard');
});

test('CR 714.2b · marcador de lore posto por efeito (não pela ação de turno) dispara o capítulo, também no turno do oponente', () => {
  let s = mesa(['Saga de Teste']), saga;
  [s, saga] = entra(s, 0, 'Saga de Teste'); s = esvazia(s);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep' && x.turn.priority === 0);
  s = J(s); E.applyEffect(s, s.objects[saga], { do: 'counters', tipo: 'lore', amount: 1, target: 'self-source' }, null, []);
  assert.equal(lore(s, saga), 2);
  s = act(s, { t: 'pass', p: 0 });
  assert.deepEqual(pilha(s), ['Saga de Teste'], 'o capítulo II foi à pilha na conferência seguinte');
  s = esvazia(s); assert.equal(vida(s), 11);
});

/* ---------------- objeto novo e última informação conhecida ---------------- */
test('CR 714.3a · Saga que muda de zona é objeto novo (400.7): devolvida à mão e conjurada de novo, recomeça com um marcador e o capítulo I dispara outra vez', () => {
  let s = mesa(['Saga de Teste', 'Sopro']), saga, x;
  [s, saga] = entra(s, 0, 'Saga de Teste'); s = esvazia(s);
  s = esvazia(proximaPrincipal(s, 0)); assert.equal(lore(s, saga), 2); assert.equal(vida(s), 11);
  [s, x] = conjura(s, 0, 'Sopro', a => a.targets[0].oid === saga); s = esvazia(s);
  assert.equal(s.objects[saga].zone, 'hand'); assert.equal(lore(s, saga), 0);
  s = mana(s, 0); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === saga)[0]); s = resolveUm(s);
  assert.equal(lore(s, saga), 1); assert.deepEqual(pilha(s), ['Saga de Teste']);
  s = esvazia(s); assert.equal(vida(s), 12, 'capítulo I de novo');
});

test('CR 714.2b · o capítulo na pilha resolve mesmo se a Saga saiu do campo (a habilidade existe independente da fonte: 113.7a)', () => {
  let s = mesa(['Saga de Teste', 'Quebra']), saga, x;
  [s, saga] = entra(s, 0, 'Saga de Teste');
  assert.deepEqual(pilha(s), ['Saga de Teste']);
  [s, x] = conjura(s, 0, 'Quebra', a => a.targets[0].oid === saga); s = resolveUm(s);
  assert.equal(s.objects[saga].zone, 'graveyard', 'destruída em resposta'); assert.equal(vida(s), 0);
  s = esvazia(s); assert.equal(vida(s), 1, 'o capítulo I resolveu sem a Saga');
});

/* ---------------- 714.3b / 702.155 · read ahead ---------------- */
test('CR 714.3b · read ahead: ao entrar, o controlador escolhe um número entre 1 e o capítulo final; a escolha é decisão pendente com uma ação por capítulo', () => {
  let s = mesa(['Saga Adiantada']), saga;
  [s, saga] = entra(s, 0, 'Saga Adiantada');
  assert.deepEqual(J(s.pending), { kind: 'saga_capitulo', p: 0, oid: saga, name: 'Saga Adiantada', max: 3 });
  assert.deepEqual(J(E.legalActions(s, 0)), [1, 2, 3].map(n => ({ t: 'saga_capitulo', p: 0, n, label: 'Capítulo ' + ['I', 'II', 'III'][n - 1] })));
  assert.deepEqual(J(E.legalActions(s, 1)), [], 'o oponente espera');
  assert.throws(() => act(s, { t: 'pass', p: 0 }), 'nada mais é aceito enquanto a escolha está aberta');
  assert.throws(() => act(s, { t: 'saga_capitulo', p: 0, n: 4 }), /capítulo/); assert.throws(() => act(s, { t: 'saga_capitulo', p: 0, n: 0 }), /capítulo/);
  assert.throws(() => act(s, { t: 'saga_capitulo', p: 1, n: 1 }));
  for (const [n, ganho] of [[1, 1], [2, 10], [3, 100]]) {
    let t = act(s, { t: 'saga_capitulo', p: 0, n });
    assert.equal(lore(t, saga), n, `entra com ${n} marcador(es)`); assert.equal(t.pending, null);
    assert.deepEqual(t.queued.length + pilha(t).length, 1, 'só um capítulo dispara');
    t = esvazia(t);
    assert.equal(vida(t), ganho, `só o capítulo ${n} aconteceu: os anteriores foram pulados (702.155a)`);
    assert.equal(noCampo(t, saga), n < 3, n === 3 ? 'começou no capítulo final: resolveu e foi sacrificada' : 'fica no campo');
  }
});

test('CR 714.3b · read ahead: no turno em que entrou só dispara o capítulo de número igual aos marcadores (702.155a); do turno seguinte em diante vale a regra normal', () => {
  let s = mesa(['Saga Adiantada']), saga;
  [s, saga] = entra(s, 0, 'Saga Adiantada'); s = esvazia(act(s, { t: 'saga_capitulo', p: 0, n: 1 }));
  assert.equal(vida(s), 1);
  s = ativa(s, 0, saga, 0); s = resolveUm(s); // dois marcadores de uma vez, no turno em que entrou: de 1 para 3
  assert.equal(lore(s, saga), 3); assert.equal(s.pending, null, 'um capítulo só: sem pergunta de ordem'); assert.deepEqual(pilha(s), ['Saga Adiantada']);
  s = esvazia(s); assert.equal(vida(s), 101, 'só o capítulo III (o II foi pulado)');
  assert.equal(s.objects[saga].zone, 'graveyard');
  // do turno seguinte em diante: de 1 para 3 dispara o II e o III
  let t = mesa(['Saga Adiantada']), b;
  [t, b] = entra(t, 0, 'Saga Adiantada'); t = esvazia(act(t, { t: 'saga_capitulo', p: 0, n: 1 }));
  t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'upkeep' && x.turn.priority === 0);
  t = ativa(t, 0, b, 0); t = resolveUm(t);
  assert.equal(t.pending && t.pending.kind, 'triggers'); t = act(t, { t: 'order_trigger', p: 0, index: 0 }); t = esvazia(t);
  assert.equal(vida(t), 111);
});

test('CR 714.3b · read ahead vale para qualquer entrada (devolvida do cemitério: a mesa pergunta); com um capítulo só não há o que escolher', () => {
  let s = mesa(['Saga Adiantada', 'Volta', 'Saga de Um Capítulo']), saga, x, um;
  [s, saga] = poe(s, 0, 'Saga Adiantada', 'graveyard'); [s, x] = conjura(s, 0, 'Volta'); s = resolveUm(s);
  assert.equal(s.pending && s.pending.kind, 'saga_capitulo'); assert.equal(s.pending.oid, saga);
  s = esvazia(act(s, { t: 'saga_capitulo', p: 0, n: 2 })); assert.equal(vida(s), 10);
  [s, um] = entra(s, 0, 'Saga de Um Capítulo');
  assert.equal(s.pending, null, 'um candidato só: o motor não pergunta'); assert.equal(lore(s, um), 1);
  s = esvazia(s); assert.equal(vida(s), 11); assert.equal(s.objects[um].zone, 'graveyard');
});

/* ---------------- 714.1a · Saga que também é criatura ---------------- */
test('CR 714.1a · Saga encantamento-criatura: tem P/R, ataca, as habilidades fora dos capítulos funcionam à parte, e a regra dos capítulos vale igual', () => {
  let s = mesa(['Saga Criatura']), saga;
  [s, saga] = entra(s, 0, 'Saga Criatura'); s = esvazia(s);
  const st = E.stats(s, s.objects[saga]); assert.deepEqual([st.power, st.toughness], [2, 2]);
  assert.deepEqual(J(E.tiposDe(s, s.objects[saga])).sort(), ['creature', 'enchantment']);
  assert.equal(lore(s, saga), 1); assert.equal(vida(s), 1);
  s = proximaPrincipal(s, 0); assert.equal(lore(s, saga), 2); assert.equal(E.capituloFinal(s, s.objects[saga]), 2);
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.objects[saga].zone, 'graveyard', 'capítulo final resolvido: sacrificada'); assert.equal(vida(s), 11);
  // a habilidade "quando ataca" não é capítulo: dispara no ataque e não segura o sacrifício
  let t = mesa(['Saga Criatura']), c;
  [t, c] = entra(t, 0, 'Saga Criatura'); t = esvazia(t); t = J(t); t.objects[c].sick = false;
  t = passaAte(t, x => x.pending && x.pending.kind === 'attackers'); t = act(t, { t: 'attack', p: 0, attackers: [c] });
  assert.deepEqual(pilha(t), ['Saga Criatura']); assert.equal(E.capituloPendente(t, t.objects[c]), false, 'gatilho de ataque não é capítulo');
  t = esvazia(t); assert.equal(vida(t), 1001);
});

/* ---------------- cartas exemplo ---------------- */
test('CR 714 · The Birth of Meletis, do começo ao fim: I busca uma Planície básica para a mão, II cria a Muralha 0/4 artefato com defensor, III ganha 2 de vida e a Saga é sacrificada', () => {
  let s = mesa(['The Birth of Meletis']), saga;
  const mao = s.zones[0].hand.length;
  [s, saga] = entra(s, 0, 'The Birth of Meletis'); s = passaAte(s, x => !!x.pending);
  assert.equal(s.pending.kind, 'pick', 'capítulo I: escolher a carta no grimório');
  const opcoes = legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name);
  assert.ok(opcoes.length > 0 && opcoes.every(n => n === 'Plains'), 'só Planície básica: ' + [...new Set(opcoes)].join(', '));
  assert.ok(noCampo(s, saga));
  s = act(s, legais(s, 0, a => a.t === 'pick')[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  s = esvazia(s);
  assert.equal(s.zones[0].hand.length, mao + 1, 'a Planície foi para a mão');
  s = esvazia(proximaPrincipal(s, 0));
  const muro = Object.values(s.objects).find(o => o.token && o.name === 'Wall'); assert.ok(muro, 'capítulo II');
  const st = E.stats(s, muro);
  assert.deepEqual([st.power, st.toughness, E.hasKeyword(s, muro, 'defender'), E.coresDe(s, muro).length, J(E.tiposDe(s, muro)).sort().join()], [0, 4, true, 0, 'artifact,creature']);
  const antes = s.players[0].life;
  s = esvazia(proximaPrincipal(s, 0));
  assert.equal(s.players[0].life, antes + 2, 'capítulo III'); assert.equal(s.objects[saga].zone, 'graveyard');
});

test('CR 714 · History of Benalia III: "Knights you control get +2/+1 until end of turn" vale para os dois Cavaleiros e acaba na limpeza; depois a Saga é sacrificada', () => {
  let s = mesa(['History of Benalia']), saga;
  [s, saga] = entra(s, 0, 'History of Benalia'); s = esvazia(s);
  s = esvazia(proximaPrincipal(s, 0)); s = esvazia(proximaPrincipal(s, 0));
  const ks = Object.values(s.objects).filter(o => o.token && o.name === 'Knight');
  assert.equal(ks.length, 2);
  for (const k of ks) { const st = E.stats(s, k); assert.deepEqual([st.power, st.toughness], [4, 3]); }
  assert.equal(s.objects[saga].zone, 'graveyard');
  s = passaAte(s, x => x.turn.active === 1);
  for (const k of ks) { const st = E.stats(s, s.objects[k.oid]); assert.deepEqual([st.power, st.toughness], [2, 2], 'até o fim do turno'); }
});

test('CR 714.3b · The Weatherseed Treaty (read ahead): a mesa pergunta o capítulo; I busca um terreno básico e o põe no campo virado; II cria o Saproling 1/1 verde; a carta é parcial declarada (domínio do capítulo III)', () => {
  let s = mesa(['The Weatherseed Treaty']), saga;
  [s, saga] = entra(s, 0, 'The Weatherseed Treaty');
  assert.equal(s.pending.kind, 'saga_capitulo'); assert.equal(s.pending.max, 3);
  let t = passaAte(act(s, { t: 'saga_capitulo', p: 0, n: 1 }), x => !!x.pending);
  assert.equal(t.pending.kind, 'pick'); const terrenos = t.zones[0].battlefield.length;
  const esc = legais(t, 0, a => a.t === 'pick'); assert.ok(esc.every(a => /Basic Land/.test(CARTAS[t.objects[a.oid].name].type_line)));
  t = act(t, esc[0]); if (t.pending && t.pending.kind === 'pick') t = act(t, { t: 'pick_done', p: 0 }); t = esvazia(t);
  assert.equal(t.zones[0].battlefield.length, terrenos + 1); assert.equal(t.objects[esc[0].oid].tapped, true, 'entra virado');
  let u = esvazia(act(s, { t: 'saga_capitulo', p: 0, n: 2 }));
  const sap = Object.values(u.objects).find(o => o.token && o.name === 'Saproling'); assert.ok(sap);
  assert.deepEqual([E.stats(u, sap).power, E.stats(u, sap).toughness, E.coresDe(u, sap).join('')], [1, 1, 'G']);
  assert.equal(u.zones[0].battlefield.length, terrenos + 1, 'o capítulo I foi pulado: nenhum terreno buscado (só o Saproling entrou)');
  const cov = S.coverage(CARTAS['The Weatherseed Treaty']);
  assert.equal(cov.level, 'parcial'); assert.match(cov.reason, /domínio/);
  for (const n of ['History of Benalia', 'The Birth of Meletis']) assert.equal(S.coverage(CARTAS[n]).level, 'completo', n);
});

test('S8 · cenário das cartas exemplo com a linha de tipo real ("Enchantment — Saga"): conjurada, entra com um marcador e o capítulo I acontece', () => {
  // scripts.unit monta as cartas da biblioteca pelo PERM_TYPES de fixtures.mjs (arquivo da trilha motor): sem a linha de tipo lá, a
  // Saga vira feitiço naquele cenário e o `example` só confere o que vale nos dois casos. O cenário de verdade é este.
  for (const [nome, confere] of [['History of Benalia', s => Object.values(s.objects).filter(o => o.token && o.name === 'Knight').length === 1],
    ['The Birth of Meletis', s => s.pending && s.pending.kind === 'pick']]) {
    const sc = S.SCRIPTS[nome]; assert.ok(sc && sc.example, nome + ' tem script e cenário'); assert.deepEqual([...S.validateScript(sc)], []);
    let s = mesa([nome]), saga; [s, saga] = entra(s, 0, nome); s = passaAte(s, x => !x.stack.length || !!x.pending);
    assert.ok(noCampo(s, saga)); assert.equal(lore(s, saga), 1); assert.ok(confere(s), nome + ': capítulo I');
    assert.equal(!!s.objects[saga].attachedTo, sc.example.expect.attached);
  }
});

/* ---------------- validador, estado e guarda-corpos ---------------- */
test('CR 714 · validador: Saga sem o marcador de entrada, com capítulo repetido ou faltando, read ahead fora de Saga ou com marcador de entrada são recusados', () => {
  const v = sc => S.validateScript({ name: 'X', ...sc, ...EX }).join(' | ');
  assert.equal(v({ ...LORE1, abilities: [cap([1, 2], ganha(1)), cap([3], ganha(1))] }), '');
  assert.equal(v({ self: { readAhead: true }, abilities: [cap([1], ganha(1)), cap([2], ganha(1))] }), '');
  assert.match(v({ abilities: [cap([1], ganha(1))] }), /precisa de entra/);
  assert.match(v({ entra: [{ afetados: 'self', marcadores: { lore: 2 } }], abilities: [cap([1], ganha(1))] }), /precisa de entra/);
  assert.match(v({ ...LORE1, abilities: [cap([1], ganha(1)), cap([1], ganha(2))] }), /capítulo 1 repetido/);
  assert.match(v({ ...LORE1, abilities: [cap([1], ganha(1)), cap([3], ganha(2))] }), /falta o capítulo 2/);
  assert.match(v({ ...LORE1, abilities: [cap([], ganha(1))] }), /chapters/);
  assert.match(v({ ...LORE1, abilities: [{ kind: 'triggered', when: 'chapter', effects: ganha(1) }] }), /chapters/);
  assert.match(v({ ...LORE1, self: { readAhead: true }, abilities: [cap([1], ganha(1))] }), /não declara marcador/);
  assert.match(v({ self: { readAhead: true }, effects: ganha(1) }), /só vale em Saga/);
  assert.match(v({ abilities: [{ kind: 'triggered', when: 'etb', chapters: [1], effects: ganha(1) }] }), /só vale em habilidade de capítulo/);
  assert.ok(S.TRIGGERS ? S.TRIGGERS.includes('chapter') : true);
});

test('CR 714 · partida sem Saga não ganha campo novo no estado (o hash das partidas existentes não muda), e o registro das Sagas some quando a última sai do campo', () => {
  let s = mesa(['Urso']);
  for (let i = 0; i < 30; i++) s = passaAte(s, x => x.turn.number > s.turn.number, 60);
  assert.equal('sagas' in s, false); assert.equal('sagaAviso' in s, false);
  let t = mesa(['Saga de Um Capítulo']), um; [t, um] = entra(t, 0, 'Saga de Um Capítulo');
  assert.deepEqual(J(t.sagas), { [um]: { z: t.objects[um].zc || 0, n: 1 } });
  t = esvazia(t); assert.equal(t.objects[um].zone, 'graveyard');
  t = act(t, { t: 'pass', p: t.turn.priority });
  assert.equal('sagas' in t, false, 'sem Saga no campo, o estado volta a não ter o campo'); assert.equal('sagaAviso' in t, false);
});

test('CR 714 · partidas aleatórias com as três Sagas e as de teste: toda ação oferecida é aceita, as invariantes valem e as Sagas chegam ao fim', () => {
  const nomes = ['History of Benalia', 'The Birth of Meletis', 'The Weatherseed Treaty', 'Saga de Teste', 'Saga Adiantada', 'Saga Mira', 'Saga Criatura', 'Urso'];
  let acoes = 0, escolhas = 0, sacrificios = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...nomes, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...nomes, 'Plains', 'Forest']) }] });
    const total = Object.keys(s.objects).length, politica = E.randomPolicy(seed * 7919);
    for (let k = 0; k < 700 && s.status !== 'over'; k++) {
      const a = politica(s); if (!a) break;
      if (a.t === 'saga_capitulo') escolhas++;
      const r = E.apply(s, a); s = r.state; acoes++;
      sacrificios += r.events.filter(e => e.saga).length;
      const erros = J(E.invariants(s, total));
      assert.deepEqual(erros, [], `semente ${seed}, ação ${k} (${a.t})`);
      for (const o of Object.values(s.objects)) if (o.zone === 'battlefield' && E.capituloFinal(s, o) > 0 && !s.pending && !E.capituloPendente(s, o)) assert.ok((o.counters.lore || 0) < E.capituloFinal(s, o), `semente ${seed}, ação ${k}: ${o.name} com ${o.counters.lore} marcadores e nenhum capítulo pendente deveria ter sido sacrificada`);
    }
  }
  assert.ok(acoes > 1500, 'amostra: ' + acoes); assert.ok(escolhas > 0, 'o read ahead foi escolhido em alguma partida'); assert.ok(sacrificios > 3, 'Sagas chegaram ao fim: ' + sacrificios);
});

test('CR 714.3b · o Shark responde à escolha do capítulo com uma das ações oferecidas, e o goldfish da mesa escolhe o capítulo I', () => {
  const { bot: B, engine: E2, table: T } = loadModules();
  let s = mesa(['Saga Adiantada']), saga; [s, saga] = entra(s, 0, 'Saga Adiantada');
  const r = B.jogadaProfissional(s, 0, {});
  assert.ok(r && r.acao && r.acao.t === 'saga_capitulo' && [1, 2, 3].includes(r.acao.n), 'jogada do Shark: ' + JSON.stringify(r && r.acao));
  assert.equal(lore(E2.apply(s, r.acao).state, saga), r.acao.n);
  // goldfish: a resposta automática do modelo da mesa a uma decisão do jogador sem humano
  const src = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(src, /pd\.kind === 'saga_capitulo' \? \{ t: 'saga_capitulo', p: pd\.p, n: 1 \}/, 'o goldfish tem resposta para a decisão (senão concederia a partida)');
  // a carta no campo diz em que capítulo está (marcador de lore), em português
  const t2 = act(s, { t: 'saga_capitulo', p: 0, n: 2 });
  assert.ok(J(T.estadoDaCarta(t2, t2.objects[saga]).marcas).some(m => m.k === 'marcador' && m.texto === 'capítulo II'), 'marca "capítulo II" na carta: ' + JSON.stringify(T.estadoDaCarta(t2, t2.objects[saga]).marcas));
});
