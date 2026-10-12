// V-21 · CR 701.35 · deter. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026):
// Inaction Injunction — "Detain target creature an opponent controls. Draw a card." · Azorius Arrester — "When Azorius Arrester enters,
// detain target creature an opponent controls." (script provado aqui)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura, CARTAS } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/2', 2, 2);
CARTAS['Elfo de Mana'] = { name: 'Elfo de Mana', type_line: 'Creature — Elf Druid', mana_cost: '{G}', cmc: 1, keywords: [], oracle_text: '{T}: Add {G}.', colors: ['G'], power: '1', toughness: '1' };
CARTAS['Atirador de Teste'] = { name: 'Atirador de Teste', type_line: 'Creature — Human Wizard', mana_cost: '{2}{U}', cmc: 3, keywords: [], oracle_text: '', colors: ['U'], power: '1', toughness: '1' };
const ATIRADOR = { name: 'Atirador de Teste', effects: [], abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }, { kind: 'triggered', when: 'upkeep', effects: [{ do: 'gain', amount: 1 }] }] };
const resolve = s => tudo(s, x => legais(x, x.pending.p)[0]);
const fonte = (p = 0) => ({ oid: 'h', name: URSO, controller: p, ability: true, source: null });
const faz = (s, eff, oid, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, oid == null ? null : { oid }, ev); return [s, ev]; };
const ateOTurnoDe = (s, p) => { const n0 = s.turn.number; for (let i = 0; i < 400 && !(s.turn.active === p && s.turn.number > n0); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); assert.ok(s.turn.active === p && s.turn.number > n0); return s; };
const ate = (s, para) => { for (let i = 0; i < 60 && !para(s); i++) s = s.pending && !para(s) ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };
/** Mesa com o jogador 1 dono de um atirador, um elfo de mana e um lobo, todos sem enjoo; o turno é do jogador 0. */
const monta = () => { let s = mesa([URSO, URSO, 'Inaction Injunction'], ['Atirador de Teste', 'Elfo de Mana', LOBO]), at, el, lo, ur; [s, at] = poe(s, 1, 'Atirador de Teste'); [s, el] = poe(s, 1, 'Elfo de Mana'); [s, lo] = poe(s, 1, LOBO); [s, ur] = poe(s, 0, URSO); s = J(s);
  s.facts['Atirador de Teste'] = { ...s.facts['Atirador de Teste'], script: ATIRADOR }; for (const o of [at, el, lo, ur]) s.objects[o].sick = false;
  if (s.turn.active !== 0) s = ateOTurnoDe(s, 0); return [s, at, el, lo, ur]; };

test('CR 701.35 · deter (a): as habilidades ativadas da detida não são oferecidas nem aceitas — as de mana também; as outras permanentes seguem normais', () => {
  let [s, at, el, lo] = monta();
  s = J(s); s.turn.priority = 1; // o dono olha o que pode fazer, em resposta
  assert.ok(legais(s, 1, a => a.t === 'activate' && a.oid === at).length > 0, 'antes: o atirador pode atirar'); assert.equal(E.productions(s, s.objects[el]).length, 1);
  [s] = faz(s, { do: 'detain', target: 'creature-opponent-controls' }, at); [s] = faz(s, { do: 'detain', target: 'creature-opponent-controls' }, el);
  assert.equal(E.ehDetida(s, s.objects[at]), true); assert.equal(legais(s, 1, a => a.t === 'activate' && a.oid === at).length, 0);
  assert.throws(() => E.apply(s, { t: 'activate', p: 1, oid: at, index: 0, targets: [{ player: 0 }] }), /detida/);
  assert.equal(E.productions(s, s.objects[el]).length, 0, 'o elfo detido não dá mana'); assert.throws(() => E.apply(s, { t: 'tap_mana', p: 1, oid: el, option: 0 }));
  assert.equal(E.ehDetida(s, s.objects[lo]), false);
});

test('CR 701.35 · deter (a): a detida não ataca nem bloqueia até o próximo turno de quem deteve; nesse turno volta tudo — e as habilidades disparadas nunca pararam', () => {
  let [s, at, el, lo, ur] = monta(); const vida1 = s.players[1].life;
  [s] = faz(s, { do: 'detain', target: 'creature-opponent-controls' }, lo); [s] = faz(s, { do: 'detain', target: 'creature-opponent-controls' }, at);
  assert.equal(E.eligibleBlockers(s, 1).includes(lo), false, 'não bloqueia no turno de quem deteve'); assert.ok(E.eligibleBlockers(s, 1).includes(el));
  s = ateOTurnoDe(s, 1); // turno do dono da detida: ainda detida
  assert.equal(E.ehDetida(s, s.objects[lo]), true); assert.equal(E.eligibleAttackers(s, 1).includes(lo), false, 'não ataca no próprio turno'); assert.ok(E.eligibleAttackers(s, 1).includes(el));
  s = ate(s, x => x.turn.active === 1 && x.turn.step !== 'upkeep' && !x.stack.length);
  assert.equal(s.players[1].life, vida1 + 1, 'o gatilho de manutenção do atirador detido resolveu');
  s = ateOTurnoDe(s, 0); // próximo turno de quem deteve: acabou
  assert.equal(E.ehDetida(s, s.objects[lo]), false); assert.equal(s.objects[lo].detidaV, undefined); assert.ok(E.eligibleBlockers(s, 1).includes(lo));
  s = J(s); s.turn.priority = 1; assert.ok(legais(s, 1, a => a.t === 'activate' && a.oid === at).length > 0, 'o atirador volta a atirar');
});

test('CR 701.35 · deter: a marca segue a permanente se o controle mudar e acaba ao sair do campo (de volta, é objeto novo)', () => {
  let [s, at] = monta();
  [s] = faz(s, { do: 'detain', target: 'creature-opponent-controls' }, at); s = J(s);
  s.objects[at].controller = 0; s.zones[1].battlefield = s.zones[1].battlefield.filter(x => x !== at); s.zones[0].battlefield.push(at);
  assert.equal(E.ehDetida(s, s.objects[at]), true); assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === at).length, 0, 'quem roubou também não ativa');
  let [x] = faz(s, { do: 'bounce', target: 'creature' }, at); x = J(x); E.moveObject(x, at, 'battlefield'); x.objects[at].sick = false;
  assert.equal(E.ehDetida(x, x.objects[at]), false);
});

test('Inaction Injunction e Azorius Arrester: os scripts, os alvos e a frase em português', () => {
  let [s, at, el, lo, ur] = monta(), ii; [s, ii] = poe(s, 0, 'Inaction Injunction', 'hand');
  const alvos = [...new Set(legais(comMana(s, 'UU'), 0, a => a.t === 'cast' && a.oid === ii).flatMap(a => (a.targets || []).map(t => t.oid)))].sort();
  assert.deepEqual(alvos, [at, el, lo].sort(), 'só criatura que um oponente controla');
  const mao = s.zones[0].hand.length; s = resolve(conjura(comMana(s, 'UU'), 0, ii, [lo]));
  assert.equal(E.ehDetida(s, s.objects[lo]), true); assert.equal(s.zones[0].hand.length, mao, 'gastou a mágica e comprou uma');
  const ARRESTER = { name: 'Azorius Arrester', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'detain', target: 'creature-opponent-controls' }] }], example: { action: 'etb', target: 'enemy-creature', expect: { attached: false } } };
  assert.equal(S.validateScript(ARRESTER).join(), '');
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'detain', target: 'player' }], example: { target: 'opponent', expect: { handDelta: 0 } } }).join(), /detain/);
  assert.equal(T.descreveEfeitos([{ do: 'detain', target: 'creature-opponent-controls' }]), 'detém uma criatura de um oponente (até o seu próximo turno ela não ataca, não bloqueia e as habilidades ativadas dela não podem ser ativadas)');
});
