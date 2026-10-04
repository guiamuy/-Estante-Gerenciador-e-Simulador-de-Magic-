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
    [{ tipo: 'compra', jogador: 0, n: 2 }, { tipo: 'compra', jogador: 1, n: 1 }], 'compra é contada por jogador, não por carta');
  assert.deepEqual(ev(st([ob(1, 'hand'), ob(2, 'hand')]), st([ob(1, 'graveyard'), ob(2, 'graveyard')])), [{ tipo: 'descarte', jogador: 0, n: 2 }]);
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
  assert.deepEqual(ouve(() => t.act({ t: 'draw', p, target: p, n: 2 })), [{ tipo: 'compra', jogador: p, n: 2 }]);
  assert.deepEqual(ouve(() => t.act({ t: 'life', p, target: 1 - p, delta: -3 })), [{ tipo: 'dano', jogador: 1 - p, n: 3 }]);
  assert.deepEqual(ouve(() => t.act({ t: 'life', p, target: p, delta: 2 })), [{ tipo: 'cura', jogador: p, n: 2 }]);
  const ilha = t.state.zones[p].hand.find(o => t.state.facts[t.state.objects[o].name].types.includes('land')) ?? (() => { const o = t.state.zones[p].library.find(x => t.state.facts[t.state.objects[x].name].types.includes('land')); t.act({ t: 'move', p, oid: o, to: 'hand' }); return o; })();
  assert.deepEqual(ouve(() => t.act({ t: 'move', p, oid: ilha, to: 'battlefield' })), [{ tipo: 'terreno', oid: ilha, jogador: p }]);
  assert.deepEqual(ouve(() => t.act({ t: 'move', p, oid: ilha, to: 'graveyard' })).map(e => e.tipo), ['destroi']);
  const antes = t.state; assert.equal(t.undo(), true); assert.notEqual(t.state, antes, 'desfazer troca o estado: a mesa não toca nada nessa volta (teste e2e)');
});
