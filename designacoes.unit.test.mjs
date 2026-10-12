// M-332 · CR 725 (o monarca) e CR 726 (a iniciativa), texto das Comprehensive Rules de 25/09/2026. Thorn of the Black Rose e Avenging Hunter
// (texto oficial em .listas/oficiais-revisadas.json, Oracle do Forge, 12/10/2026). As habilidades inerentes não têm fonte (725.2, 726.2).
// Cada teste falha no motor anterior (não havia monarca nem iniciativa).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const carta = (n, kw = [], cmc = 4) => { const c = OF.find(x => x.name === n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc, keywords: kw, oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], power: c.power, toughness: c.toughness }; };
const cards = { 'Thorn of the Black Rose': carta('Thorn of the Black Rose', ['Deathtouch']), 'Avenging Hunter': carta('Avenging Hunter', ['Trample'], 5),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' } };
const scripts = {
  'Thorn of the Black Rose': { name: 'Thorn of the Black Rose', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'monarch' }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  'Avenging Hunter': { name: 'Avenging Hunter', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'initiative' }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } }
};
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 3, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Swamp', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => tudo(act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }));
const conjura = (s, oid, mana) => { s = comMana(s, mana); const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid)[0]; assert.ok(a, 'conjurar'); return tudo(resolve(act(s, a))); };
const mao = (s, p) => s.zones[p].hand.length;
/** passa até o começo do passo pedido do jogador `ativo`, com a habilidade inerente na pilha. */
const ateInerente = (s, ativo, passo, nome) => passaAte(s, x => x.turn.active === ativo && x.turn.step === passo && x.stack.some(o => x.objects[o].name === nome));
/** ataque de B com as criaturas dadas (sem bloqueio de A) até o fim do dano. */
const bAtaca = (s, quem, nome) => { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 1); s = act(s, { t: 'attack', p: 1, attackers: quem });
  return passaAte(s, x => x.turn.active === 1 && (x.stack.some(o => x.objects[o].name === nome) || x.turn.step === 'main2')); };

test('CR 725 · Thorn of the Black Rose: você se torna o monarca; no seu passo final compra uma carta, no do oponente não', () => {
  let s = mesaX(['Thorn of the Black Rose']), t;
  [s, t] = poe(s, 0, 'Thorn of the Black Rose', 'hand');
  assert.equal(s.monarca, undefined, '725.1: não há monarca até alguém se tornar');
  s = conjura(s, t, 'BBBB');
  assert.equal(s.monarca, 0, 'A é o monarca');
  s = ateInerente(s, 0, 'end', 'Monarca');
  const h = mao(s, 0), topo = s.objects[s.stack[s.stack.length - 1]];
  assert.equal(topo.source, null, '725.2: a habilidade não tem fonte');
  assert.equal(topo.controller, 0);
  s = tudo(resolve(s));
  assert.equal(mao(s, 0), h + 1, 'o monarca compra no próprio passo final');
  const u = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'end');
  assert.ok(!u.stack.some(o => u.objects[o].name === 'Monarca'), 'no passo final do oponente, nada');
});

test('CR 725.2 · a criatura que causa dano de combate ao monarca dá a coroa ao controlador dela; bloqueada, não', () => {
  let s = mesaX(['Thorn of the Black Rose'], ['Urso']), t, u1, u2;
  [s, t] = poe(s, 0, 'Thorn of the Black Rose', 'hand'); s = conjura(s, t, 'BBBB');
  [s, u1] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Urso');
  let x = bAtaca(s, [u1, u2], 'Monarca');
  assert.equal(x.stack.filter(o => x.objects[o].name === 'Monarca').length, 2, 'cada criatura que causou dano dispara (sem pergunta de ordem: são iguais)');
  assert.ok(!x.pending, 'gatilhos iguais não pedem ordem');
  assert.equal(x.objects[x.stack[0]].controller, 0, 'controlados por quem era o monarca');
  x = tudo(x);
  assert.equal(x.monarca, 1, 'B se torna o monarca');
  // bloqueada: nenhuma criatura causa dano ao monarca
  let y = J(s); y.objects[t].tapped = false;
  y = passaAte(y, z => z.pending && z.pending.kind === 'attackers' && z.pending.p === 1); y = act(y, { t: 'attack', p: 1, attackers: [u1] });
  y = passaAte(y, z => z.pending && z.pending.kind === 'blockers'); y = act(y, { t: 'block', p: 0, blocks: [[t, u1]] });
  y = tudo(passaAte(y, z => z.turn.step === 'main2' || z.stack.length > 0));
  y = passaAte(y, z => z.turn.step === 'main2');
  assert.equal(y.monarca, 0, 'bloqueado: A continua o monarca');
});

test('CR 726 · Avenging Hunter: tomar a iniciativa aventura na Cidade Baixa; na sua manutenção, de novo; tomar de novo dispara de novo (726.5)', () => {
  let s = mesaX(['Avenging Hunter']), h;
  [s, h] = poe(s, 0, 'Avenging Hunter', 'hand');
  s = conjura(s, h, 'GGGGG');
  assert.equal(s.iniciativa, 0, 'A tem a iniciativa');
  assert.equal(s.players[0].dungeon.name, 'Undercity', 'entrou na Cidade Baixa');
  assert.equal(s.players[0].dungeon.room, 'entrada-secreta');
  s = ateInerente(s, 0, 'upkeep', 'Iniciativa');
  assert.equal(s.objects[s.stack[s.stack.length - 1]].source, null, '726.2: sem fonte');
  s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(s.pending && s.pending.kind, 'choose_room', 'na manutenção: avança e escolhe a sala (Forja ou Poço Perdido)');
  s = tudo(s);
  assert.ok(['forja', 'poco-perdido'].includes(s.players[0].dungeon.room), 'saiu da Entrada Secreta');
});

test('CR 726.5 · quem já tem a iniciativa e a toma de novo se aventura de novo (sem segunda designação)', () => {
  let s = mesaX(['Avenging Hunter']), h1, h2;
  [s, h1] = poe(s, 0, 'Avenging Hunter', 'hand'); [s, h2] = poe(s, 0, 'Avenging Hunter', 'hand');
  s = conjura(s, h1, 'GGGGG');
  assert.equal(s.players[0].dungeon.room, 'entrada-secreta');
  s = conjura(s, h2, 'GGGGG');
  assert.equal(s.iniciativa, 0);
  assert.ok(['forja', 'poco-perdido'].includes(s.players[0].dungeon.room), 'a segunda vez avança na Cidade Baixa');
});

test('CR 726.2 · criaturas do oponente que causam dano a quem tem a iniciativa tomam a iniciativa (uma vez por jogador) e ele se aventura na própria masmorra', () => {
  let s = mesaX(['Avenging Hunter'], ['Urso']), h, u1, u2;
  [s, h] = poe(s, 0, 'Avenging Hunter', 'hand'); s = conjura(s, h, 'GGGGG');
  s = J(s); s.objects[h].tapped = true; // fora do bloqueio
  [s, u1] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Urso');
  let x = bAtaca(s, [u1, u2], 'Iniciativa');
  assert.equal(x.stack.filter(o => x.objects[o].name === 'Iniciativa').length, 1, 'duas criaturas do mesmo jogador: um gatilho só');
  assert.equal(x.objects[x.stack[0]].controller, 0, 'controlado por quem tinha a iniciativa');
  x = tudo(x);
  assert.equal(x.iniciativa, 1, 'B toma a iniciativa');
  assert.equal(x.players[1].dungeon && x.players[1].dungeon.name, 'Undercity', 'B se aventura na Cidade Baixa');
  assert.equal(x.players[0].dungeon.room, 'entrada-secreta', 'a masmorra de A fica onde estava');
});

test('CR 608.2h · "its controller" é lido na resolução: se o controle da criatura muda com o gatilho na pilha, vale o novo; se ela morreu, o último (achado da revisão do lote VI)', () => {
  let s = mesaX(['Thorn of the Black Rose'], ['Urso']), t, u;
  [s, t] = poe(s, 0, 'Thorn of the Black Rose', 'hand'); s = conjura(s, t, 'BBBB');
  s = J(s); s.objects[t].tapped = true;
  [s, u] = poe(s, 1, 'Urso');
  const x = bAtaca(s, [u], 'Monarca');
  assert.equal(x.stack.filter(o => x.objects[o].name === 'Monarca').length, 1);
  let y = J(x); y.objects[u].controller = 0; // o controle muda em resposta
  y = tudo(y);
  assert.equal(y.monarca, 0, 'o controlador na resolução é A: A continua o monarca');
  let z = J(x); const o = z.objects[u]; z.zones[1].battlefield.splice(z.zones[1].battlefield.indexOf(u), 1); z.zones[1].graveyard.push(u); o.zone = 'graveyard'; o.zc = (o.zc || 0) + 1; // morreu em resposta
  z = tudo(z);
  assert.equal(z.monarca, 1, 'saiu do campo: vale o último controlador conhecido (B)');
});

test('M-332 · leitor: "you become the monarch" e "you take the initiative" são lidas; as 11 do lote VI revisadas jogam (decisão A)', async () => {
  const { loadModules } = await import('./_load.mjs'); const { scripts: S, leitor: L } = loadModules();
  const REV = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
  const th = REV.find(c => c.name === 'Thorn of the Black Rose'), ah = REV.find(c => c.name === 'Avenging Hunter');
  assert.equal(JSON.stringify(L.ler(th).script.abilities), JSON.stringify([{ kind: 'triggered', when: 'etb', effects: [{ do: 'monarch' }] }]));
  assert.equal(JSON.stringify(L.ler(ah).script.abilities), JSON.stringify([{ kind: 'triggered', when: 'etb', effects: [{ do: 'initiative' }] }]));
  for (const n of ['Thorn of the Black Rose', 'Avenging Hunter', 'Seal of Cleansing', 'Throne of the High City', 'Feast of Succession', 'Palace Sentinels', 'Crimson Fleet Commodore', 'Goliath Paladin', 'Staunch Throneguard', 'Underdark Explorer', 'Aarakocra Sneak']) {
    const c = REV.find(x => x.name === n); assert.ok(c, n + ' com texto guardado');
    assert.equal(S.coverage(c).level, 'completo', n + ' joga');
  }
});
