// Camada 1b · auditoria das listas Pauper: cada carta é posta numa mesa farta e o
// motor precisa OFERECER o que a carta sabe fazer. O cenário S8 prova que o efeito
// funciona quando é executado; esta auditoria prova que dá para chegar nele numa
// partida. Ela nasceu do relato do usuário: a habilidade da Jaspera Sentinel não
// aparecia na mesa porque a única outra criatura tinha entrado no turno (S62).
// Quem achou aquele bug foi o usuário, não o portão — por isso a mesa "recém-montada"
// (A16), onde tudo acabou de entrar, virou parte da auditoria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { PERM_TYPES } from './fixtures.mjs';
const { engine: E, scripts: S, decks: D, starter } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const TEXTOS = JSON.parse(readFileSync(new URL('./.listas/cartas.json', import.meta.url), 'utf8'));
const BASICOS = { Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' };

/** Cartas de apoio: existem só para satisfazer custos (virar, sacrificar, descartar).
    O mímico conta como qualquer tipo de criatura e como qualquer cor de propósito:
    a pergunta da auditoria é "o motor oferece quando o campo tem o que o custo pede". */
const APOIO = {
  'Mímico': { name: 'Mímico', type_line: 'Creature — Shapeshifter', mana_cost: '{1}', cmc: 1, colors: ['W', 'U', 'B', 'R', 'G'],
    power: '2', toughness: '2', keywords: [], oracle_text: 'Changeling' },
  'Bugiganga': { name: 'Bugiganga', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, colors: [], keywords: [], oracle_text: '' },
  'Talismã': { name: 'Talismã', type_line: 'Enchantment', mana_cost: '{1}', cmc: 1, colors: [], keywords: [], oracle_text: '' },
  'Vítima': { name: 'Vítima', type_line: 'Creature — Human', mana_cost: '{1}', cmc: 1, colors: ['W'], power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'Isca': { name: 'Isca', type_line: 'Sorcery', mana_cost: '{1}', cmc: 1, colors: ['U'], keywords: [], oracle_text: 'Draw a card.' },
  'Reação': { name: 'Reação', type_line: 'Instant', mana_cost: '{1}', cmc: 1, colors: ['R'], keywords: [], oracle_text: 'Draw a card.' }
};
const APOIO_SCRIPTS = {
  'Mímico': { name: 'Mímico', changeling: true, example: { target: 'none', expect: { tappedOnEntry: false } } },
  'Isca': { name: 'Isca', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } },
  'Reação': { name: 'Reação', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } }
};

function cartaDe(nome) {
  if (BASICOS[nome]) return { name: nome, type_line: `Basic Land — ${nome}`, mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: `{T}: Add {${BASICOS[nome]}}.` };
  if (TEXTOS[nome]) return TEXTOS[nome];
  if (APOIO[nome]) return APOIO[nome];
  // carta com script: a linha de tipo real vem de PERM_TYPES; o custo não importa
  // porque a auditoria roda sem cobrança de mana
  const sc = S.SCRIPTS[nome]; if (!sc) return null;
  const linha = PERM_TYPES[nome] || 'Instant';
  return { name: nome, type_line: linha, mana_cost: '{1}', cmc: 1, colors: ['G'], keywords: [],
    power: /Creature/.test(linha) ? '1' : undefined, toughness: /Creature/.test(linha) ? '1' : undefined, oracle_text: '' };
}

/** Nomes das sete listas Pauper prontas. */
function cartasPauper() {
  const nomes = new Set();
  for (const d of starter.STARTER_DECKS) {
    if (d.format !== 'pauper') continue;
    for (const e of D.parseDeckText(d.text).entries) if (e.zone !== 'side') nomes.add(e.name);
  }
  return [...nomes];
}

/** Mesa farta: tudo que um custo pode pedir está lá. */
function mesa(nomeAlvo, { naMao = false, comPilha = false, todosEnjoados = false, naCova = false } = {}) {
  const cards = { ...APOIO };
  for (const n of [...cartasPauper(), ...Object.keys(BASICOS)]) { const c = cartaDe(n); if (c) cards[n] = c; }
  const scripts = { ...APOIO_SCRIPTS };
  const deck = [{ name: 'Forest', qty: 10, zone: 'main' }, { name: 'Island', qty: 10, zone: 'main' },
    { name: 'Mímico', qty: 10, zone: 'main' }, { name: 'Isca', qty: 10, zone: 'main' },
    { name: 'Bugiganga', qty: 6, zone: 'main' }, { name: 'Talismã', qty: 4, zone: 'main' }, { name: 'Reação', qty: 4, zone: 'main' },
    { name: 'Vítima', qty: 4, zone: 'main' }, { name: nomeAlvo, qty: 4, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 7, mode: 'assisted', manaCheck: false, cards, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state;
  while (s.turn.step !== 'main1') s = E.apply(s, { t: 'pass', p: s.turn.priority }).state;
  const a = s.turn.active, d = 1 - a;
  s = J(s);
  const mover = (p, nome, zona, extra = {}) => {
    const oid = ['library', 'hand'].map(z => s.zones[p][z]).flat().find(o => s.objects[o].name === nome);
    if (!oid) return null;
    const de = s.zones[p][s.objects[oid].zone];
    de.splice(de.indexOf(oid), 1);
    (zona === 'stack' ? s.stack : s.zones[p][zona]).push(oid);
    Object.assign(s.objects[oid], { zone: zona, sick: false, tapped: false }, extra);
    return oid;
  };
  // campo do jogador: quatro criaturas, dois terrenos, artefato e encantamento
  for (let i = 0; i < 4; i++) mover(a, 'Mímico', 'battlefield', { sick: todosEnjoados || i === 3 });
  mover(a, 'Forest', 'battlefield'); mover(a, 'Island', 'battlefield');
  mover(a, 'Bugiganga', 'battlefield'); mover(a, 'Talismã', 'battlefield');
  // cemitério: criatura, terreno e mágica
  mover(a, 'Mímico', 'graveyard'); mover(a, 'Forest', 'graveyard'); mover(a, 'Isca', 'graveyard');
  // do outro lado: criatura, terreno, artefato e encantamento (efeitos que pedem dois alvos)
  mover(d, 'Vítima', 'battlefield'); mover(d, 'Forest', 'battlefield');
  mover(d, 'Bugiganga', 'battlefield'); mover(d, 'Talismã', 'battlefield');
  // uma mágica do oponente na pilha, para quem responde à pilha ter o que anular
  // pilha com uma de cada: feitiço, instantânea e artefato — quem anula tem alvo
  if (comPilha) { mover(d, 'Isca', 'stack'); mover(d, 'Reação', 'stack'); mover(d, 'Bugiganga', 'stack'); }
  // a carta auditada
  const alvo = mover(a, nomeAlvo, naCova ? 'graveyard' : naMao ? 'hand' : 'battlefield');
  return { s, a, d, alvo };
}

const ativadas = nome => ((S.SCRIPTS[nome] || {}).abilities || []).filter(x => x.kind === 'activated');

/** Habilidades que o motor não oferece na mesa farta por um motivo declarado. */
const EXCECOES = {};

test('A14 · toda habilidade ativada das listas Pauper é oferecida numa mesa farta', () => {
  const faltas = [];
  for (const nome of cartasPauper()) {
    const abs = ativadas(nome);
    if (!abs.length) continue;
    const perm = !(TEXTOS[nome] && /\b(instant|sorcery)\b/i.test(TEXTOS[nome].type_line || ''));
    abs.forEach((ab, i) => {
      const naMao = !!(ab.cost || {}).fromHand || !perm;
      // habilidade que responde à pilha precisa de uma mágica na pilha
      const comPilha = (ab.effects || []).some(e => /spell/.test(e.target || ''));
      const { s, a, alvo } = mesa(nome, { naMao, comPilha });
      if (!alvo) return faltas.push(`${nome}: não consegui pôr a carta na mesa`);
      const ops = E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === alvo && (x.index || 0) === i);
      const chave = `${nome} #${i}`;
      if (!ops.length && !EXCECOES[chave]) faltas.push(chave);
    });
  }
  assert.deepEqual(faltas, [], 'habilidades que a mesa não oferece: ' + faltas.join(' · '));
});

/** Cartas que a mesa farta não oferece para conjurar, com o motivo declarado. */
const EXCECOES_CAST = {};

test('A15 · toda carta das listas Pauper pode ser conjurada numa mesa farta', () => {
  const faltas = [];
  for (const nome of cartasPauper()) {
    const c = cartaDe(nome);
    if (!c || /\bLand\b/i.test(c.type_line || '')) continue; // terreno é jogado, não conjurado
    const sc = S.SCRIPTS[nome] || {};
    const alvos = [...(sc.effects || []), ...(sc.modes || []).flatMap(m => m.effects || [])];
    const comPilha = alvos.some(e => /spell/.test(e.target || ''));
    const { s, a, alvo } = mesa(nome, { naMao: true, comPilha });
    if (!alvo) { faltas.push(`${nome}: não consegui pôr na mão`); continue; }
    const ops = E.legalActions(s, a).filter(x => (x.t === 'cast' || x.t === 'play_land') && x.oid === alvo);
    if (!ops.length && !EXCECOES_CAST[nome]) faltas.push(nome);
  }
  assert.deepEqual(faltas, [], 'cartas que a mesa não deixa conjurar: ' + faltas.join(' · '));
});


test('A16 · custo que vira outra criatura é oferecido numa mesa recém-montada (tudo enjoado)', () => {
  // 302.6: o enjoo de invocação prende só o {T} da própria permanente. Uma criatura
  // que entrou neste turno pode ser virada como custo de outra.
  const faltas = [];
  for (const nome of cartasPauper()) {
    ativadas(nome).forEach((ab, i) => {
      if (!(ab.cost || {}).tapOther) return;
      const { s, a, alvo } = mesa(nome, { naMao: !!(ab.cost || {}).fromHand, todosEnjoados: true });
      if (!alvo) return faltas.push(`${nome}: não consegui pôr a carta na mesa`);
      const ops = E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === alvo && (x.index || 0) === i);
      if (!ops.length) faltas.push(`${nome} #${i}`);
    });
    // o mesmo custo aparece no lampejo do passado (Battle Screech vira três criaturas brancas)
    const fb = (S.SCRIPTS[nome] || {}).flashback;
    if (fb && fb.tapOther) {
      const { s, a, alvo } = mesa(nome, { naCova: true, todosEnjoados: true });
      if (!alvo) faltas.push(`${nome}: não consegui pôr no cemitério`);
      else if (!E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === alvo && x.flashback)) faltas.push(`${nome} · lampejo`);
    }
  }
  assert.deepEqual(faltas, [], 'habilidades recusadas por enjoo alheio: ' + faltas.join(' · '));
});
