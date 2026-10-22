// G4 · a partida que se ouve: o que mudou entre dois estados vira evento de mesa; os eventos viram poucos sons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { CARDS, PAUPER_DECK } from './fixtures.mjs';
const { sentidos: S, engine: E, table: T, perfil: PF } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const st = (objs = [], extra = {}) => ({ status: 'playing', winner: null, turn: { number: 3, active: 0, step: 'main1' }, players: [{ life: 20 }, { life: 20 }], objects: Object.fromEntries(objs.map(o => [o.oid, o])), ...extra });
const ob = (oid, zone, extra = {}) => ({ oid, name: 'Carta ' + oid, zone, owner: 0, controller: 0, counters: {}, damage: 0, ...extra });
const TIPOS = { Bicho: ['creature'], Ilha: ['land'], Pedra: ['artifact'] };
const tipos = nome => TIPOS[nome] || [];
const ev = (a, d, o = {}) => J(S.eventosSensoriais(a, d, { tipos, ...o }));
const so = (a, d, o) => ev(a, d, o).map(e => e.tipo);

test('G4 · vida, compra, descarte, terreno, conjurar e entrar no campo saem da diferença entre dois estados', () => {
  assert.deepEqual(ev(st(), st([], { players: [{ life: 17 }, { life: 24 }] })), [{ tipo: 'dano', jogador: 0, n: 3 }, { tipo: 'cura', jogador: 1, n: 4 }]);
  assert.deepEqual(ev(st([ob(1, 'library'), ob(2, 'library'), ob(3, 'library', { owner: 1 })]), st([ob(1, 'hand'), ob(2, 'hand'), ob(3, 'hand', { owner: 1 })])),
    [{ tipo: 'compra', jogador: 0, n: 2, oids: [1, 2] }, { tipo: 'compra', jogador: 1, n: 1, oids: [3] }], 'compra é contada por jogador e diz quais cartas (a G5 anima cada uma)');
  assert.deepEqual(ev(st([ob(1, 'hand'), ob(2, 'hand')]), st([ob(1, 'graveyard'), ob(2, 'graveyard')])), [{ tipo: 'descarte', jogador: 0, n: 2, oids: [1, 2] }]);
  assert.deepEqual(so(st([ob(1, 'hand', { name: 'Ilha' })]), st([ob(1, 'battlefield', { name: 'Ilha' })])), ['terreno']);
  assert.deepEqual(so(st([ob(1, 'hand', { name: 'Bicho' })]), st([ob(1, 'stack', { name: 'Bicho' })])), ['conjura']);
  assert.deepEqual(so(st([ob(1, 'stack', { name: 'Bicho' })]), st([ob(1, 'battlefield', { name: 'Bicho' })])), ['entra']);
  assert.deepEqual(ev(st(), st([ob(9, 'battlefield', { token: true, controller: 1 })])), [{ tipo: 'ficha', oid: 9, jogador: 1 }]);
  assert.deepEqual(ev(st([ob(1, 'library')]), st([ob(1, 'graveyard')])), [], 'triturar não é compra nem descarte');
  // conjurada e resolvida na mesma jogada (o oponente não respondeu): é conjurar, não descartar — quem diz é o evento do motor
  const mao = st([ob(1, 'hand'), ob(2, 'hand', { name: 'Bicho' }), ob(3, 'hand')]);
  assert.deepEqual(so(mao, st([ob(1, 'graveyard'), ob(2, 'hand', { name: 'Bicho' }), ob(3, 'hand')]), { eventos: [{ kind: 'resolved', oid: 1, to: 'graveyard' }] }), ['conjura']);
  assert.deepEqual(so(mao, st([ob(1, 'hand'), ob(2, 'battlefield', { name: 'Bicho' }), ob(3, 'hand')]), { eventos: [{ kind: 'resolved', oid: 2, to: 'battlefield' }] }), ['conjura', 'entra']);
  assert.deepEqual(so(mao, st([ob(1, 'graveyard'), ob(2, 'hand', { name: 'Bicho' }), ob(3, 'graveyard')]), { eventos: [{ kind: 'resolved', oid: 1, to: 'graveyard' }] }), ['conjura', 'descarte'], 'a outra carta que foi da mão ao cemitério continua sendo descarte');
  assert.deepEqual(so(mao, st([ob(1, 'graveyard'), ob(2, 'hand', { name: 'Bicho' }), ob(3, 'hand')]), { eventos: [{ kind: 'effect', do: 'counter', name: 'Counterspell', target: 'Carta 1' }] }), ['conjura', 'anula'], 'conjurada e anulada na mesma jogada');
  // nada mudou, ou falta um dos lados: nenhum evento, nenhum erro
  const mesmo = st([ob(1, 'hand')]);
  assert.deepEqual(ev(mesmo, mesmo), []); assert.deepEqual(ev(null, mesmo), []); assert.deepEqual(ev(mesmo, null), []);
});

test('G4 · combate e criaturas: ataque, bloqueio, dano marcado, aprimorar (marcador ou bônus) e enfraquecer', () => {
  assert.deepEqual(ev(st([ob(1, 'battlefield'), ob(2, 'battlefield')]), st([ob(1, 'battlefield', { attacking: 1 }), ob(2, 'battlefield', { attacking: 1 })])), [{ tipo: 'ataque', oids: [1, 2], jogador: 0 }]);
  assert.deepEqual(ev(st([ob(1, 'battlefield', { attacking: 1 })]), st([ob(1, 'battlefield', { attacking: 1 })])), [], 'quem já atacava não ataca de novo');
  assert.deepEqual(ev(st([ob(3, 'battlefield')]), st([ob(3, 'battlefield', { blocking: 1 })])), [{ tipo: 'bloqueio', oids: [3] }]);
  assert.deepEqual(ev(st([ob(1, 'battlefield', { damage: 1 })]), st([ob(1, 'battlefield', { damage: 3 })])), [{ tipo: 'danoCriatura', oid: 1, n: 2 }]);
  assert.deepEqual(so(st([ob(1, 'battlefield')]), st([ob(1, 'battlefield', { counters: { p1p1: 1 } })])), ['aprimora']);
  assert.deepEqual(so(st([ob(1, 'battlefield')]), st([ob(1, 'battlefield', { counters: { m1m1: 1 } })])), ['enfraquece']);
  // bônus até o fim do turno: quem diz a força é o motor (aqui, uma função de mentira)
  const stats = (s, o) => ({ power: 1 + ((o.pump || {}).p || 0), toughness: 1 + ((o.pump || {}).t || 0) });
  assert.deepEqual(so(st([ob(1, 'battlefield')]), st([ob(1, 'battlefield', { pump: { p: 3, t: 3 } })]), { stats }), ['aprimora']);
  assert.deepEqual(so(st([ob(1, 'battlefield', { pump: { p: 3, t: 3 } })]), st([ob(1, 'battlefield')]), { stats }), ['enfraquece'], 'o bônus que acaba também é mudança de força');
  assert.deepEqual(so(st([ob(1, 'battlefield')]), st([ob(1, 'battlefield', { tapped: true })]), { stats }), [], 'virar não é evento sensorial');
  assert.deepEqual(so(st([ob(1, 'battlefield')]), st([ob(1, 'battlefield', { pump: { p: 1 } })]), { stats: () => { throw new Error('carta desconhecida'); } }), [], 'força que não dá para calcular não derruba a mesa');
});

test('G4 · sair do campo: morrer, destruir, exilar, devolver; três de uma vez é remoção global, menos no dano de combate; anulação e fim de partida', () => {
  const campo = [ob(1, 'battlefield', { name: 'Bicho' }), ob(2, 'battlefield', { name: 'Pedra' }), ob(3, 'battlefield', { name: 'Bicho' }), ob(4, 'battlefield', { name: 'Bicho', controller: 1 })];
  const com = (...zonas) => st(campo.map((o, i) => ({ ...o, zone: zonas[i] || 'battlefield' })));
  assert.deepEqual(ev(st(campo), com('graveyard')), [{ tipo: 'morre', oid: 1, jogador: 0 }]);
  assert.deepEqual(so(st(campo), com(null, 'graveyard')), ['destroi'], 'permanente que não é criatura: destruída');
  assert.deepEqual(so(st(campo), com('exile', null, 'hand')), ['exila', 'devolve']);
  assert.deepEqual(ev(st(campo), com('graveyard', 'graveyard', 'graveyard')), [{ tipo: 'remocaoGlobal', oids: [1, 2, 3], n: 3 }]);
  // três mortes no dano de combate são três mortes, não uma remoção global…
  const dano = { turn: { number: 3, active: 0, step: 'combat_damage' } };
  assert.deepEqual(so(st(campo), { ...com('graveyard', 'graveyard', 'graveyard'), ...dano }), ['morre', 'morre', 'destroi']);
  // …a não ser que um efeito de destruir tenha resolvido ali
  assert.deepEqual(so(st(campo), { ...com('graveyard', 'graveyard', 'graveyard'), ...dano }, { eventos: [{ kind: 'effect', do: 'destroy', name: 'Ira' }] }), ['remocaoGlobal']);
  // anulação: só o motor sabe (o evento do efeito); paga ou pendente não é anulação
  const pilha = st([ob(7, 'stack')]), cemiterio = st([ob(7, 'graveyard')]);
  assert.deepEqual(so(pilha, cemiterio, { eventos: [{ kind: 'effect', do: 'counter', name: 'Counterspell', target: 'Carta 7' }] }), ['anula']);
  assert.deepEqual(so(pilha, cemiterio, { eventos: [{ kind: 'effect', do: 'counter', pending: true }] }), []);
  assert.deepEqual(so(pilha, cemiterio, { eventos: [{ kind: 'effect', do: 'counter', paid: true }] }), []);
  assert.deepEqual(so(pilha, cemiterio), [], 'mágica que resolveu e foi para o cemitério não faz barulho de anulação');
  // turno e fim; a ordem de saída é a ordem em que a jogada se conta
  const fim = ev(st(), st([], { status: 'over', winner: 1, players: [{ life: 0 }, { life: 20 }] }));
  assert.deepEqual(fim, [{ tipo: 'dano', jogador: 0, n: 20 }, { tipo: 'fim', vencedor: 1 }]);
  assert.deepEqual(ev(st(), st([], { turn: { number: 4, active: 1, step: 'untap' } })), [{ tipo: 'turno', jogador: 1 }]);
  const tudo = so(st([ob(1, 'library'), ob(2, 'battlefield', { name: 'Bicho' })]), st([ob(1, 'hand'), ob(2, 'graveyard', { name: 'Bicho' })], { turn: { number: 4, active: 0, step: 'draw' }, players: [{ life: 20 }, { life: 18 }] }));
  assert.deepEqual(tudo, ['turno', 'compra', 'dano', 'morre']);
});

test('G4 · plano de som: poucos sons, sem repetir, na ordem da jogada; "sua vez" só para quem vê; o fim e a remoção nunca são cortados', () => {
  const p = (evs, o) => J(S.planoDeSom(evs, o));
  assert.deepEqual(p([{ tipo: 'compra', jogador: 0, n: 1 }]), [{ som: 'compra', quando: 0 }]);
  assert.deepEqual(p([{ tipo: 'morre' }, { tipo: 'morre' }, { tipo: 'dano' }]).map(x => x.som), ['dano', 'morre'], 'duas mortes: um som; dano antes da morte');
  assert.deepEqual(p([{ tipo: 'danoCriatura' }, { tipo: 'ficha' }, { tipo: 'destroi' }]).map(x => x.som), ['entra', 'golpe', 'morre'], 'tipos que dividem o mesmo som');
  assert.deepEqual(p([{ tipo: 'turno', jogador: 1 }], { espectador: 0 }), [], 'o turno do oponente não toca');
  assert.deepEqual(p([{ tipo: 'turno', jogador: 0 }], { espectador: 0 }).map(x => x.som), ['suaVez']);
  assert.deepEqual(p([{ tipo: 'fim', vencedor: 0 }], { espectador: 0 }).map(x => x.som), ['vitoria']);
  assert.deepEqual(p([{ tipo: 'fim', vencedor: 1 }], { espectador: 0 }).map(x => x.som), ['derrota']);
  assert.deepEqual(p([{ tipo: 'fim', vencedor: null }], { espectador: 0 }), [], 'empate fica em silêncio');
  assert.deepEqual(p([{ tipo: 'remocaoGlobal' }, { tipo: 'morre' }, { tipo: 'exila' }]).map(x => x.som), ['remocaoGlobal']);
  // o turno inteiro do bot chega junto: no máximo quatro, espaçados, e o que importa fica
  const turnoDoBot = ['turno', 'compra', 'terreno', 'conjura', 'entra', 'ataque', 'dano', 'fim'].map(tipo => ({ tipo, jogador: 1, vencedor: 1 }));
  const plano = p(turnoDoBot, { espectador: 0 });
  assert.deepEqual(plano.map(x => x.som), ['compra', 'terreno', 'dano', 'derrota']);
  assert.deepEqual(plano.map(x => x.quando), [0, 0.14, 0.28, 0.42]);
  assert.deepEqual(p([{ tipo: 'tipo-que-nao-existe' }]), []);
});

test('G4 · receitas: todo evento tem som, todo som tem nome, cada um é curto e não estoura; preferências saneadas, guardadas e no backup', async () => {
  for (const tipo of S.ORDEM.filter(t => t !== 'turno' && t !== 'fim')) assert.ok(S.RECEITAS[S.SOM_DO_TIPO[tipo] || tipo], `sem som para ${tipo}`);
  for (const [nome, vozes] of Object.entries(S.RECEITAS)) {
    assert.ok(S.NOMES[nome], `sem nome para ${nome}`); assert.ok(vozes.length >= 1 && vozes.length <= 4);
    assert.ok(S.duracaoDe(nome) <= 1, `${nome} passa de um segundo`);
    for (const v of vozes) { assert.ok(v.g > 0 && v.g <= (v.o ? 0.8 : 1), `${nome}: ganho`); assert.ok(v.d > 0); assert.ok(v.o ? v.f.every(f => f >= 20 && f <= 6000) : v.filtro.slice(1).every(f => f >= 20 && f <= 6000), `${nome}: frequência`); }
  }
  assert.deepEqual(J(S.limpaPrefs(null)), { ligado: true, volume: 0.6 }); assert.deepEqual(J(S.limpaPrefs({ ligado: false, volume: 7 })), { ligado: false, volume: 1 });
  assert.deepEqual(J(S.limpaPrefs({ volume: 'alto' })), { ligado: true, volume: 0.6 }); assert.equal(S.limpaPrefs({ volume: -1 }).volume, 0);
  assert.ok(PF.PREFERENCIAS.includes(S.CHAVE));
  // serviço com um contexto de áudio de mentira: conta os nós criados, respeita desligado e volume
  const m = new Map(); const store = { get: async k => m.get(k), set: async (k, v) => { m.set(k, J(v)); } };
  let osc = 0, ruido = 0; const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const mestres = [];
  const ctx = { currentTime: 1, sampleRate: 8000, state: 'running', destination: {},
    createGain() { const g = { gain: param(), connect() {} }; mestres.push(g); return g; }, createOscillator() { osc++; return { frequency: param(), connect() {}, start() {}, stop() {} }; },
    createBufferSource() { ruido++; return { connect() {}, start() {}, stop() {} }; }, createBiquadFilter() { return { frequency: param(), connect() {} }; },
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; } };
  const som = S.createSom({ store, criaContexto: () => ctx });
  assert.deepEqual(J(await som.init()), { ligado: true, volume: 0.6 });
  assert.equal(som.toca('dano'), true); assert.equal(osc, 1); assert.equal(ruido, 1); assert.equal(mestres[0].gain.value, 0.6);
  assert.equal(som.toca('nao-existe'), false);
  assert.deepEqual(J(som.tocaEventos([{ tipo: 'compra' }, { tipo: 'cura' }])), [{ som: 'compra', quando: 0 }, { som: 'cura', quando: 0.14 }]);
  assert.deepEqual(J(som.tocados), ['dano', 'compra', 'cura']);
  await som.ajusta({ volume: 0.25 }); assert.equal(mestres[0].gain.value, 0.25); assert.deepEqual(J(m.get(S.CHAVE)), { ligado: true, volume: 0.25 });
  await som.ajusta({ ligado: false }); const antes = osc; assert.equal(som.toca('dano'), false); assert.equal(osc, antes, 'desligado: nenhum nó de áudio'); assert.equal(som.destrava(), false);
  // outro serviço lê o que ficou guardado; aparelho sem áudio não quebra
  assert.deepEqual(J(await S.createSom({ store }).init()), { ligado: false, volume: 0.25 });
  const semAudio = S.createSom({ criaContexto: () => null }); assert.equal(semAudio.toca('dano'), false); assert.deepEqual(J(semAudio.tocados), ['dano']);
  const quebrado = S.createSom({ criaContexto: () => { throw new Error('sem permissão'); } }); assert.equal(quebrado.toca('cura'), false);
});

test('G4 · com o motor de verdade: comprar, perder vida, baixar terreno e a carta que sai do campo', () => {
  const deck = { entries: PAUPER_DECK };
  const t = T.createTable(T.buildSetup({ format: 'pauper', seed: 11, cards: CARDS, seats: [{ name: 'Ana', deck }, { name: 'Bia', deck }] }));
  t.act({ t: 'keep', p: 0, bottom: [] }); t.act({ t: 'keep', p: 1, bottom: [] });
  const ouve = fn => { const antes = t.state; const eventos = fn() || []; return J(S.eventosSensoriais(antes, t.state, { eventos, stats: E.stats, tipos: n => t.state.facts[n].types })); };
  const p = t.state.turn.priority;
  const comprou = ouve(() => t.act({ t: 'draw', p, target: p, n: 2 }));
  assert.deepEqual(comprou.map(e => [e.tipo, e.jogador, e.n, e.oids.length]), [['compra', p, 2, 2]]); assert.ok(comprou[0].oids.every(o => t.state.objects[o].zone === 'hand'));
  assert.deepEqual(ouve(() => t.act({ t: 'life', p, target: 1 - p, delta: -3 })), [{ tipo: 'dano', jogador: 1 - p, n: 3 }]);
  assert.deepEqual(ouve(() => t.act({ t: 'life', p, target: p, delta: 2 })), [{ tipo: 'cura', jogador: p, n: 2 }]);
  const ilha = t.state.zones[p].hand.find(o => t.state.facts[t.state.objects[o].name].types.includes('land')) ?? (() => { const o = t.state.zones[p].library.find(x => t.state.facts[t.state.objects[x].name].types.includes('land')); t.act({ t: 'move', p, oid: o, to: 'hand' }); return o; })();
  assert.deepEqual(ouve(() => t.act({ t: 'move', p, oid: ilha, to: 'battlefield' })), [{ tipo: 'terreno', oid: ilha, jogador: p }]);
  assert.deepEqual(ouve(() => t.act({ t: 'move', p, oid: ilha, to: 'graveyard' })).map(e => e.tipo), ['destroi']);
  const antes = t.state; assert.ok(t.undo()); assert.notEqual(t.state, antes, 'desfazer troca o estado: a mesa não toca nada nessa volta (teste e2e)');
});

test('G5 · plano de efeitos: cada evento vira um efeito num alvo (carta, vida, pilha ou mesa); o que saiu da tela vira fantasma', () => {
  const p = (evs, o = { espectador: 0 }) => J(S.planoDeEfeitos(evs, o));
  assert.deepEqual(p([{ tipo: 'dano', jogador: 1, n: 3 }]), [{ atraso: 0, fx: 'dano', vida: 1, texto: '−3', tom: 'neg' }]);
  assert.deepEqual(p([{ tipo: 'dano', jogador: 0, n: 2 }]), [{ atraso: 0, fx: 'dano', vida: 0, texto: '−2', tom: 'neg' }, { atraso: 0, fx: 'vinheta', tom: 'neg' }], 'dano em quem está vendo: a tela avisa pelas bordas');
  assert.deepEqual(p([{ tipo: 'cura', jogador: 0, n: 4 }]), [{ atraso: 0, fx: 'cura', vida: 0, texto: '+4', tom: 'pos' }]);
  assert.deepEqual(p([{ tipo: 'danoCriatura', oid: 7, n: 2 }]), [{ atraso: 0, fx: 'golpe', oid: 7, texto: '−2', tom: 'neg' }]);
  assert.deepEqual(p([{ tipo: 'ataque', oids: [1, 2, 3], jogador: 0 }]), [{ atraso: 0, fx: 'ataque', oid: 1 }, { atraso: 60, fx: 'ataque', oid: 2 }, { atraso: 120, fx: 'ataque', oid: 3 }], 'atacantes saem em fila');
  assert.deepEqual(p([{ tipo: 'bloqueio', oids: [4] }, { tipo: 'aprimora', oid: 5 }, { tipo: 'enfraquece', oid: 6 }]).map(x => [x.fx, x.oid]), [['aprimora', 5], ['enfraquece', 6], ['bloqueio', 4]]);
  assert.deepEqual(p([{ tipo: 'terreno', oid: 1 }, { tipo: 'entra', oid: 2 }, { tipo: 'ficha', oid: 3 }]).map(x => [x.fx, x.oid]), [['terreno', 1], ['entra', 2], ['entra', 3]]);
  // compra: só a de quem está vendo (a mão do oponente não aparece na tela)
  assert.deepEqual(p([{ tipo: 'compra', jogador: 0, n: 2, oids: [8, 9] }]).map(x => [x.fx, x.oid, x.atraso]), [['compra', 8, 0], ['compra', 9, 60]]);
  assert.deepEqual(p([{ tipo: 'compra', jogador: 1, n: 2, oids: [8, 9] }]), []);
  // o que saiu: fantasma, com o jeito de sair
  assert.deepEqual(p([{ tipo: 'morre', oid: 1 }, { tipo: 'destroi', oid: 2 }, { tipo: 'exila', oid: 3 }, { tipo: 'devolve', oid: 4 }, { tipo: 'descarte', jogador: 0, n: 1, oids: [5] }]).map(x => [x.fx, x.oid, x.como]),
    [['fantasma', 5, 'descarte'], ['fantasma', 1, 'morre'], ['fantasma', 2, 'morre'], ['fantasma', 3, 'exila'], ['fantasma', 4, 'devolve']]);
  // remoção global: a mesa treme, a tela clareia e todas as cartas se desfazem em fila
  assert.deepEqual(p([{ tipo: 'remocaoGlobal', oids: [1, 2, 3], n: 3 }]).map(x => [x.fx, x.oid ?? (x.mesa ? 'mesa' : x.tom), x.atraso]),
    [['abalo', 'mesa', 0], ['vinheta', 'acento', 0], ['fantasma', 1, 0], ['fantasma', 2, 60], ['fantasma', 3, 120]]);
  // várias mágicas conjuradas: um pulso só na pilha; anulação tem efeito próprio; turno e fim não ganham efeito aqui
  assert.deepEqual(p([{ tipo: 'conjura', oid: 1 }, { tipo: 'conjura', oid: 2 }, { tipo: 'anula' }, { tipo: 'turno', jogador: 0 }, { tipo: 'fim', vencedor: 0 }]).map(x => x.fx), ['conjura', 'anula']);
  // teto: o turno inteiro do bot não vira uma chuva de efeitos
  assert.equal(p([{ tipo: 'remocaoGlobal', oids: Array.from({ length: 30 }, (_, i) => i), n: 30 }, { tipo: 'ataque', oids: Array.from({ length: 30 }, (_, i) => i) }]).length, 16);
  assert.deepEqual(p([]), []);
});

test('H5 · roteiro da jogada: a sua ação, cada jogada do oponente e cada passo em que algo acontece viram quadros; passes somem; sem jogada do oponente não há cena', () => {
  const base = (objs, extra) => st(objs, { players: [{ life: 20, name: 'Você' }, { life: 20, name: 'Shark' }], ...extra });
  const s0 = base([ob(1, 'hand', { name: 'Ilha' }), ob(5, 'hand', { owner: 1, controller: 1, name: 'Bicho' })]);
  const s1 = base([ob(1, 'battlefield', { name: 'Ilha' }), ob(5, 'hand', { owner: 1, controller: 1, name: 'Bicho' })]);                       // eu: terreno
  const s2 = { ...s1, turn: { number: 4, active: 1, step: 'main1' } };                                                                     // eu passo: vira o turno
  const s3 = base([ob(1, 'battlefield', { name: 'Ilha' }), ob(5, 'stack', { owner: 1, controller: 1, name: 'Bicho' })], { turn: s2.turn }); // bot conjura
  const s4 = base([ob(1, 'battlefield', { name: 'Ilha' }), ob(5, 'battlefield', { owner: 1, controller: 1, name: 'Bicho' })], { turn: s2.turn }); // eu passo: resolve
  const s5 = { ...s4, turn: { number: 4, active: 1, step: 'combat_begin' } };                                                               // bot passa: nada acontece
  const s6 = { ...s5, players: [{ life: 17, name: 'Você' }, { life: 20, name: 'Shark' }] };                                                                              // dano em mim
  const passos = [
    { antes: s0, depois: s1, acao: { t: 'play_land', p: 0, oid: 1 }, eventos: [], linhas: ['Você jogou Ilha'] },
    { antes: s1, depois: s2, acao: { t: 'pass', p: 0 }, eventos: [], linhas: ['— Turno 4 · Shark —'] },
    { antes: s2, depois: s3, acao: { t: 'cast', p: 1, oid: 5 }, eventos: [], linhas: ['Shark conjurou Bicho'] },
    { antes: s3, depois: s4, acao: { t: 'pass', p: 0 }, eventos: [{ kind: 'resolved', oid: 5, to: 'battlefield' }], linhas: ['Bicho entrou no campo'] },
    { antes: s4, depois: s5, acao: { t: 'pass', p: 1 }, eventos: [], linhas: [] },
    { antes: s5, depois: s6, acao: { t: 'pass', p: 0 }, eventos: [], linhas: ['Você perdeu 3 de vida (20 → 17)'] }];
  const q = S.roteiroDaJogada(passos, { eu: 0, tipos });
  assert.deepEqual(J(q.map(x => [x.quem, x.legenda, x.sentidos.map(e => e.tipo).join('+'), x.ms])), [
    [0, 'Você jogou Ilha', 'terreno', 450], [1, 'Turno 4 · Shark', 'turno', 800], [1, 'Shark conjurou Bicho', 'conjura', 1000], [1, 'Bicho entrou no campo', 'entra', 800], [0, 'Você perdeu 3 de vida (20 → 17)', 'dano', 800]]);
  assert.equal(q[0].meu, true); assert.equal(q[2].oid, 5, 'a carta da jogada vai na legenda');
  assert.equal(q[3].estado, s5, 'o passe sem nada foi absorvido pelo quadro anterior (a mesa não pisca à toa)');
  assert.equal(q[q.length - 1].estado, s6, 'o último quadro é o estado final');
  // sem jogada do oponente (só eu e passes): nada de cena
  assert.equal(S.roteiroDaJogada(passos.slice(0, 2), { eu: 0, tipos }).length, 0); assert.equal(S.roteiroDaJogada([], { eu: 0 }).length, 0); assert.equal(S.roteiroDaJogada(null, { eu: 0 }).length, 0);
  // turno comprido: a cena inteira cabe no teto, nenhum quadro some depressa demais
  const comprido = [passos[0], ...Array.from({ length: 30 }, () => passos[2])];
  const qs = S.roteiroDaJogada(comprido, { eu: 0, tipos, teto: 12000 });
  assert.ok(qs.reduce((n, x) => n + x.ms, 0) <= 12000 * 1.05 && qs.every(x => x.ms >= 300), 'perto do teto de 12 s (o mínimo de 300 ms por quadro pode passar um pouco)');
  assert.equal(S.roteiroDaJogada(comprido, { eu: 0, tipos, max: 10 }).length, 10);
});

test('H5 · o modelo da mesa guarda os passos só quando a tela pede, e a colheita esvazia', () => {
  const setup = T.buildSetup({ format: 'pauper', seed: 21, cards: CARDS, seats: [{ name: 'Você', deck: { entries: PAUPER_DECK } }, { name: 'Shark', deck: { entries: PAUPER_DECK } }], manaCheck: true, mode: 'full' });
  const mesa = T.createTable(setup, { options: { autoPass: true, bot: { nivel: 'shark', seat: 1 } } });
  mesa.act({ t: 'keep', p: 0, bottom: [] });
  assert.deepEqual(J(mesa.colhePassos()), [], 'desligado por padrão: torneio e teste não acumulam estados');
  mesa.guardaPassos(true);
  // joga até o bot ter feito alguma coisa numa jogada minha
  let passos = [], quadros = [];
  for (let i = 0; i < 40 && !quadros.length && mesa.state.status === 'playing'; i++) {
    const s = mesa.state, ls = E.legalActions(s, 0), antes = s;
    mesa.act(s.pending ? ls[0] : (ls.find(a => a.t === 'play_land') || { t: 'pass', p: 0 }));
    passos = mesa.colhePassos();
    assert.ok(passos.length >= 1); assert.equal(passos[0].antes, antes, 'o primeiro passo parte do estado em que eu joguei'); assert.equal(passos[passos.length - 1].depois, mesa.state, 'o último chega ao estado da mesa');
    for (let k = 1; k < passos.length; k++) assert.equal(passos[k].antes, passos[k - 1].depois, 'os passos encadeiam');
    quadros = S.roteiroDaJogada(passos, { eu: 0, stats: E.stats, tipos: n => mesa.state.facts[n].types });
  }
  assert.ok(quadros.length >= 2, 'o bot jogou e virou cena'); assert.ok(quadros.some(q => q.quem === 1 && q.legenda), 'com a jogada dele legendada: ' + JSON.stringify(quadros.map(q => q.legenda)));
  assert.equal(quadros[quadros.length - 1].estado, mesa.state);
  assert.deepEqual(J(mesa.colhePassos()), [], 'colheu, esvaziou');
  mesa.guardaPassos(false); mesa.act(mesa.state.pending ? E.legalActions(mesa.state, 0)[0] : { t: 'pass', p: 0 }); assert.deepEqual(J(mesa.colhePassos()), []);
});

test('MJ3a · plano de voo: a carta que chega ao campo sai da mão (mesmo oid) ou da faixa da pilha; o resto não voa', () => {
  const cx = (x, y, w, h) => ({ x, y, w, h });
  const antes = { 7: cx(100, 700, 100, 140) }, pilha = { caixa: cx(20, 380, 200, 44), oids: [9] };
  const p = J(S.planoDeVoo({ antes, pilha, chegaram: [{ oid: 7, caixa: cx(16, 600, 60, 84) }, { oid: 9, caixa: cx(100, 200, 76, 106) }, { oid: 5, caixa: cx(200, 600, 60, 84) }] }));
  assert.deepEqual(p.map(x => [x.oid, x.origem]), [['7', 'mao'], ['9', 'pilha']], 'oid 5 não estava na mão nem na pilha: entra sem voar');
  // da mão: começa centrado na caixa antiga (150, 770) com a escala da largura antiga
  assert.deepEqual([p[0].dx, p[0].dy, p[0].escala], [150 - 46, 770 - 642, Math.round(100 / 60 * 1000) / 1000]);
  // da pilha: começa no centro da faixa, do tamanho da altura dela
  assert.deepEqual([p[1].dx, p[1].dy, p[1].escala], [120 - 138, 402 - 253, Math.round(44 / 106 * 1000) / 1000]);
  assert.equal(p[0].esconde, true, 'carta sozinha: a de verdade espera a foto pousar');
  assert.equal(J(S.planoDeVoo({ antes, chegaram: [{ oid: 7, caixa: cx(16, 600, 60, 84), sozinha: false }] }))[0].esconde, false, 'chegou a um leque que já existia: o grupo fica à vista');
});

test('MJ3a · plano de voo: caixa vazia, deslocamento mínimo e teto de voos', () => {
  const cx = (x, y, w, h) => ({ x, y, w, h });
  assert.deepEqual(J(S.planoDeVoo({ antes: { 1: cx(0, 0, 0, 0) }, chegaram: [{ oid: 1, caixa: cx(10, 10, 60, 84) }] })), [], 'a mão recolhida não tem caixa: nada voa');
  assert.deepEqual(J(S.planoDeVoo({ antes: { 1: cx(12, 10, 60, 84) }, chegaram: [{ oid: 1, caixa: cx(10, 10, 60, 84) }] })), [], 'menos de 4 px: não voa');
  const muitos = Array.from({ length: 12 }, (_, i) => i + 1);
  const p = S.planoDeVoo({ antes: Object.fromEntries(muitos.map(i => [i, cx(0, 700, 60, 84)])), chegaram: muitos.map(i => ({ oid: i, caixa: cx(i * 10, 100, 60, 84) })) });
  assert.equal(p.length, 8, 'no máximo 8 voos por jogada');
  assert.deepEqual(J(S.planoDeVoo()), []);
});

test('MJ3b · onde pousa a carta que saiu: contador da zona do dono, faixa da pilha, ou a própria carta na sua mão', () => {
  const o = (zone, owner = 0) => ({ oid: 1, zone, owner, controller: 1 - owner });
  assert.deepEqual(J(S.ondePousa(o('graveyard'), 0)), { zona: 'graveyard', lado: 'me' }, 'vai ao cemitério do dono, não de quem controlava');
  assert.deepEqual(J(S.ondePousa(o('exile', 1), 0)), { zona: 'exile', lado: 'opp' });
  assert.deepEqual(J(S.ondePousa(o('library', 1), 0)), { zona: 'library', lado: 'opp' });
  assert.deepEqual(J(S.ondePousa(o('hand'), 0)), { zona: 'hand', lado: 'me', carta: true }, 'na sua mão: a própria carta, quando a mão está à vista');
  assert.deepEqual(J(S.ondePousa(o('hand', 1), 0)), { zona: 'hand', lado: 'opp' }, 'na mão do oponente: o contador da mão');
  assert.deepEqual(J(S.ondePousa(o('stack'), 0)), { zona: 'stack' });
  assert.equal(S.ondePousa(o('battlefield'), 0), null, 'no campo quem voa é a chegada (MJ3a)');
  assert.equal(S.ondePousa(null, 0), null);
});

test('MJ3b · plano de saída: a foto vai do centro da carta ao centro do alvo, encolhendo até a altura dele, sem crescer', () => {
  const cx = (x, y, w, h) => ({ x, y, w, h });
  assert.deepEqual(J(S.planoDeSaida([{ oid: 7, como: 'morre', de: cx(20, 300, 76, 106), para: cx(290, 190, 44, 44) }])),
    [{ oid: '7', como: 'morre', dx: 254, dy: -141, escala: 0.415 }]);
  assert.equal(S.planoDeSaida([{ oid: 1, como: 'devolve', de: cx(0, 0, 76, 106), para: cx(100, 600, 100, 140) }])[0].escala, 1, 'para a carta maior na mão: não cresce');
  assert.equal(S.planoDeSaida([{ oid: 1, como: 'conjura', de: cx(0, 0, 100, 400), para: cx(100, 600, 300, 20) }])[0].escala, 0.25, 'faixa baixa: no mínimo um quarto');
  assert.deepEqual(J(S.planoDeSaida([{ oid: 1, de: cx(0, 0, 0, 0), para: cx(1, 1, 44, 44) }, { oid: 2, de: cx(10, 10, 44, 44), para: cx(12, 10, 44, 44) }, { oid: 3, de: cx(0, 0, 44, 44) }])), [], 'sem caixa, sem alvo ou a menos de 4 px: se desfaz no lugar');
  const muitos = Array.from({ length: 12 }, (_, i) => ({ oid: i, como: 'morre', de: cx(i * 10, 100, 60, 84), para: cx(300, 600, 44, 44) }));
  assert.equal(S.planoDeSaida(muitos).length, 8, 'no máximo 8 voos por jogada');
  assert.deepEqual(J(S.planoDeSaida()), []);
});

test('MJ3c · plano de voo: a carta que estava na mão do oponente sai do contador da mão dele, de verso; a sua mão e a pilha vêm antes', () => {
  const cx = (x, y, w, h) => ({ x, y, w, h }), chip = cx(300, 40, 44, 44);
  assert.deepEqual(J(S.planoDeVoo({ oponente: { caixa: chip, oids: ['9'] }, chegaram: [{ oid: 9, caixa: cx(100, 140, 76, 106) }] })),
    [{ oid: '9', origem: 'oponente', dx: 184, dy: -131, escala: 0.415, esconde: true, verso: true }]);
  // a mesma carta na sua mão ou na pilha à vista: essa origem vence (o contador do oponente é só para o que estava escondido)
  assert.equal(S.planoDeVoo({ antes: { 9: cx(0, 700, 92, 128) }, oponente: { caixa: chip, oids: ['9'] }, chegaram: [{ oid: 9, caixa: cx(100, 140, 76, 106) }] })[0].origem, 'mao');
  assert.equal(S.planoDeVoo({ pilha: { caixa: cx(0, 400, 300, 44), oids: ['9'] }, oponente: { caixa: chip, oids: ['9'] }, chegaram: [{ oid: 9, caixa: cx(100, 140, 76, 106) }] })[0].origem, 'pilha');
  assert.deepEqual(J(S.planoDeVoo({ oponente: { caixa: chip, oids: ['8'] }, chegaram: [{ oid: 9, caixa: cx(100, 140, 76, 106) }] })), [], 'não estava na mão dele: não voa');
  assert.deepEqual(J(S.planoDeVoo({ oponente: { caixa: cx(0, 0, 0, 0), oids: ['9'] }, chegaram: [{ oid: 9, caixa: cx(100, 140, 76, 106) }] })), [], 'sem contador à vista (goldfish): não voa');
});

test('MJ4a · setas do combate: escolha em curso e combate declarado; ataque vai à vida do defensor ou ao planeswalker; bloqueio vai ao atacante; fora do combate não há seta', () => {
  const objs = [ob(1, 'battlefield'), ob(2, 'battlefield'), ob(5, 'battlefield', { owner: 1, controller: 1 }), ob(6, 'battlefield', { owner: 1, controller: 1 }), ob(9, 'graveyard')];
  const seta = x => [x.tipo, x.de, x.para.oid != null ? 'oid' + x.para.oid : 'j' + x.para.jogador, !!x.proposta];
  // escolhendo atacantes: o defensor é o outro jogador; a exigência de planeswalker muda o alvo; carta fora do campo não vira seta
  const esc = st(objs, { turn: { number: 3, active: 0, step: 'combat_attackers' } });
  assert.deepEqual(J(S.setasDoCombate(esc, { atacando: [1, 2, 9], alvos: { 2: 6 } })).map(seta), [['ataque', '1', 'j1', true], ['ataque', '2', 'oid6', true]]);
  // declarado: atacando o jogador 1, o 2 no planeswalker; bloqueio escolhido e bloqueio declarado
  const dec = st([ob(1, 'battlefield', { attacking: 1 }), ob(2, 'battlefield', { attacking: 1, atacandoPw: 6 }), ob(5, 'battlefield', { owner: 1, controller: 1, blocking: 1 }), ob(6, 'battlefield', { owner: 1, controller: 1 })],
    { turn: { number: 3, active: 0, step: 'combat_blockers' }, combat: { attackers: [1, 2], defender: 1 } });
  assert.deepEqual(J(S.setasDoCombate(dec)).map(seta), [['ataque', '1', 'j1', false], ['ataque', '2', 'oid6', false], ['bloqueio', '5', 'oid1', false]]);
  assert.deepEqual(J(S.setasDoCombate(dec, { bloqueios: [[6, 2]] })).map(seta).find(x => x[1] === '6'), ['bloqueio', '6', 'oid2', true], 'o bloqueio que ainda está sendo escolhido também tem seta');
  assert.equal(new Set(J(S.setasDoCombate(dec, { atacando: [1] })).map(x => x.chave)).size, 3, 'a mesma seta não sai duas vezes (escolha e declaração)');
  // o combate acabou (passo seguinte) ou a partida não tem combate: nenhuma seta
  assert.deepEqual(J(S.setasDoCombate({ ...dec, turn: { ...dec.turn, step: 'main2' } })), []);
  assert.deepEqual(J(S.setasDoCombate(st(objs))), []);
  assert.deepEqual(J(S.setasDoCombate(null)), []);
});

test('MJ4a · curva da seta: nasce por dentro da borda da origem, termina fora da borda do alvo, arqueia para o mesmo lado e tem ponta', () => {
  const cx = (x, y, w, h) => ({ x, y, w, h });
  const de = cx(100, 500, 76, 106), para = cx(120, 40, 44, 44);
  const c = S.curvaDaSeta(de, para);
  assert.match(c.d, /^M [\d.]+ [\d.]+ Q [\d.-]+ [\d.-]+ [\d.]+ [\d.]+$/);
  const dentro = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  assert.ok(dentro(c.inicio, de), 'nasce dentro da carta, perto da borda ' + JSON.stringify(c));
  assert.ok(!dentro(c.fim, para) && c.fim.y > para.y + para.h && c.fim.y < para.y + para.h + 8, 'a ponta para a 4 px da borda do alvo ' + JSON.stringify(c));
  assert.equal(c.ponta.split(' ').length, 3, 'a ponta é um triângulo');
  // a curva vai sempre para a direita de quem segue a seta: subindo, para a direita da tela; descendo, para a esquerda
  const sobe = S.curvaDaSeta(de, para), desce = S.curvaDaSeta(para, de);
  assert.ok(sobe.controle.x > (sobe.inicio.x + sobe.fim.x) / 2 && desce.controle.x < (desce.inicio.x + desce.fim.x) / 2, JSON.stringify([sobe, desce]));
  assert.equal(S.curvaDaSeta(cx(0, 0, 40, 40), cx(2, 2, 40, 40)), null, 'caixas quase em cima uma da outra: sem seta');
  assert.equal(S.curvaDaSeta(cx(0, 0, 0, 0), para), null, 'origem sem caixa (fora da vista)');
});

test('MJ4b · marcas da prévia: vida que muda vira número no marcador (letal quando chega a zero) e quem morre ganha a marca, sem repetir', () => {
  assert.deepEqual(J(S.marcasDaPrevia({ life: [0, -2], vida: [20, 18], mortos: [{ oid: 7, name: 'Sky Pike', controller: 0 }, { oid: 9, name: 'Sky Pike', controller: 1 }, { oid: 7 }] })),
    [{ tipo: 'vida', jogador: 1, texto: '−2', tom: 'neg', letal: false }, { tipo: 'morre', oid: '7' }, { tipo: 'morre', oid: '9' }]);
  assert.deepEqual(J(S.marcasDaPrevia({ life: [3, -5], vida: [23, 0], mortos: [] })).map(m => [m.texto, m.tom, m.letal]), [['+3', 'pos', false], ['−5', 'neg', true]], 'vínculo com a vida ganha número verde; a conta que zera é letal');
  assert.deepEqual(J(S.marcasDaPrevia({ life: [0, 0], vida: [20, 20], mortos: [] })), [], 'nada muda: nenhuma marca');
  assert.deepEqual(J(S.marcasDaPrevia(null)), [], 'prévia inválida (bloqueio que a ameaça não aceita): nada');
});

test('MJ5 · monte da pilha: até três miniaturas, do fundo para o topo, com o topo marcado; a virada para baixo fica de verso', () => {
  const it = (oid, extra = {}) => ({ oid, imagemDe: 'Carta ' + oid, topo: false, habilidade: false, ...extra });
  const itens = [it(9, { topo: true }), it(8, { habilidade: true }), it(7, { imagemDe: null }), it(6)]; // explicaPilha: topo primeiro
  assert.deepEqual(J(S.monteDaPilha(itens)), [
    { oid: '7', imagemDe: null, topo: false, habilidade: false },
    { oid: '8', imagemDe: 'Carta 8', topo: false, habilidade: true },
    { oid: '9', imagemDe: 'Carta 9', topo: true, habilidade: false }], 'a quarta (a mais funda) não aparece; o topo é o último desenhado, por cima');
  assert.deepEqual(J(S.monteDaPilha([it(1, { topo: true })])).map(m => m.oid), ['1']);
  assert.deepEqual(J(S.monteDaPilha()), []);
});

test('MJ5 · quem desce da pilha: a mágica que saiu para cemitério, exílio, mão ou grimório; não a que ficou, nem o permanente, nem a habilidade ou a cópia que deixaram de existir', () => {
  const s = st([ob(1, 'graveyard'), ob(2, 'exile'), ob(3, 'battlefield'), ob(4, 'stack'), ob(5, 'hand'), ob(6, 'library'), ob(8, 'graveyard', { ability: true })], { stack: [4] });
  assert.deepEqual(J(S.saidasDaPilha([1, 2, 3, 4, 5, 6, 7, 8], s)), ['1', '2', '5', '6'], '7 (cópia) e 8 (habilidade) não descem; 3 vai pela chegada ao campo; 4 continua na pilha');
  assert.deepEqual(J(S.saidasDaPilha(['1'], s)), ['1'], 'oid como texto ou número');
  assert.deepEqual(J(S.saidasDaPilha([], s)), []);
  assert.deepEqual(J(S.saidasDaPilha([1], null)), []);
});

test('MJ5 · plano de voo: o permanente que resolve sai da miniatura dele no monte (do tamanho da largura dela), não da faixa inteira', () => {
  const cx = (x, y, w, h) => ({ x, y, w, h });
  const pilha = { caixa: cx(20, 380, 200, 44), caixas: { 9: cx(30, 386, 23, 32) }, oids: [9, 4] };
  const p = J(S.planoDeVoo({ pilha, chegaram: [{ oid: 9, caixa: cx(100, 200, 76, 106) }, { oid: 4, caixa: cx(200, 200, 76, 106) }] }));
  assert.deepEqual(p.map(x => [x.oid, x.origem]), [['9', 'pilha'], ['4', 'pilha']]);
  assert.deepEqual([p[0].dx, p[0].dy, p[0].escala], [Math.round(41.5 - 138), 402 - 253, Math.round(23 / 76 * 1000) / 1000], 'do centro da miniatura, na largura dela');
  assert.deepEqual([p[1].dx, p[1].dy, p[1].escala], [120 - 238, 402 - 253, Math.round(44 / 106 * 1000) / 1000], 'sem miniatura à vista: da faixa, como antes');
  const semCaixa = J(S.planoDeVoo({ pilha: { ...pilha, caixas: { 9: cx(0, 0, 0, 0) } }, chegaram: [{ oid: 9, caixa: cx(100, 200, 76, 106) }] }));
  assert.equal(semCaixa[0].escala, Math.round(44 / 106 * 1000) / 1000, 'miniatura sem caixa (fora da tela): cai para a faixa');
});

test('MJ6a · alvos do arrasto: as conjurações de um alvo só, agrupadas por alvo; o que soltar faz (conjura, pergunta, folha)', () => {
  const c = (oid, targets, extra = {}) => ({ t: 'cast', p: 0, oid, targets, ...extra });
  const legais = [c('o5', [{ oid: 'o9' }]), c('o5', [{ player: 1 }]), c('o5', [{ player: 1 }], { x: 2 }), c('o5', [{ oid: 'o7' }], { pay: { tap: ['o1'] } }), c('o5', [{ oid: 'o7' }], { pay: { tap: ['o2'] } }),
    c('o5', [{ oid: 'o8' }], { modes: [1] }), c('o5', [{ oid: 'o8' }], { modes: [2] }), c('o6', [{ oid: 'o9' }]), { t: 'play_land', p: 0, oid: 'o5' }, { t: 'cast', p: 0, oid: 'o5' }];
  const a = J(S.alvosDoArrasto(legais, 'o5'));
  assert.deepEqual(a.map(x => [x.chave, x.como, x.acoes.length]), [['o:o9', 'conjura', 1], ['p:1', 'pergunta', 2], ['o:o7', 'pergunta', 2], ['o:o8', 'folha', 2]],
    'um alvo e uma ação: conjura; só muda X ou pagamento: a pergunta de sempre; muda o modo: a folha da carta');
  assert.deepEqual(a[0].alvo, { oid: 'o9' }); assert.deepEqual(a[1].alvo, { player: 1 });
  assert.deepEqual(J(S.alvosDoArrasto([c('o5', [{ oid: 'o9' }]), c('o5', [{ oid: 'o9' }, { oid: 'o7' }])], 'o5')), [], 'conjuração com dois alvos: a carta não mira por arrasto');
  assert.deepEqual(J(S.alvosDoArrasto([{ t: 'cast', p: 0, oid: 'o5' }], 'o5')), [], 'mágica sem alvo: nada');
  assert.deepEqual(J(S.alvosDoArrasto()), []);
});

test('MJ6a · gesto de mira: para cima além do limiar, com a vertical dominando, é mira; de lado é outro gesto; pouco é nada', () => {
  assert.equal(S.gestoDeMira(0, -14), 'mira');
  assert.equal(S.gestoDeMira(10, -20), 'mira');
  assert.equal(S.gestoDeMira(20, -10), 'outro', 'de lado: rola a mão');
  assert.equal(S.gestoDeMira(0, 20), 'outro', 'para baixo não mira');
  assert.equal(S.gestoDeMira(5, -10), null, 'abaixo do limiar ainda é toque');
  assert.equal(S.gestoDeMira(0, -10, { limiar: 8 }), 'mira');
});
