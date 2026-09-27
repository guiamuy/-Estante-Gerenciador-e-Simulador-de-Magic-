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
  'Fortificador': { name: 'Fortificador', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, colors: [], keywords: [], oracle_text: '{T}: Put a +1/+1 counter on target creature.' },
  'Talismã': { name: 'Talismã', type_line: 'Enchantment', mana_cost: '{1}', cmc: 1, colors: [], keywords: [], oracle_text: '' },
  'Vítima': { name: 'Vítima', type_line: 'Creature — Human', mana_cost: '{1}', cmc: 1, colors: ['W'], power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'Isca': { name: 'Isca', type_line: 'Sorcery', mana_cost: '{1}', cmc: 1, colors: ['U'], keywords: [], oracle_text: 'Draw a card.' },
  'Reação': { name: 'Reação', type_line: 'Instant', mana_cost: '{1}', cmc: 1, colors: ['R'], keywords: [], oracle_text: 'Draw a card.' }
};
const APOIO_SCRIPTS = {
  'Mímico': { name: 'Mímico', changeling: true,
    abilities: [{ kind: 'activated', cost: { sacrifice: true }, effects: [{ do: 'draw', amount: 1 }] }],
    example: { action: 'activate:0', target: 'none', expect: { handDelta: 1 } } },
  'Fortificador': { name: 'Fortificador', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'counters', amount: 1, target: 'creature' }] }],
    example: { action: 'activate:0', target: 'own-creature', expect: { counters: 1 } } },
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
    { name: 'Vítima', qty: 4, zone: 'main' }, { name: 'Fortificador', qty: 4, zone: 'main' }, { name: nomeAlvo, qty: 4, zone: 'main' }];
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
  mover(a, 'Bugiganga', 'battlefield'); mover(a, 'Talismã', 'battlefield'); mover(a, 'Fortificador', 'battlefield');
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

/* ---------------- A17 · os gatilhos das listas Pauper disparam numa partida ---------------- */
/** Gatilhos que esta auditoria ainda não sabe provocar, com o motivo. */
const GATILHOS_SEM_DRIVER = {
  'enchanted-deals-damage': 'precisa da aura anexada causando dano de combate',
  'enchanted-tapped-or-damaged': 'precisa da aura anexada sendo virada ou recebendo dano',
  room: 'só acontece dentro de uma masmorra, coberto pelos testes S57–S61'
};
const roda = (s, acao) => { const r = E.apply(s, acao); return { s: r.state, ev: r.events }; };
/** Passa a prioridade até a pilha esvaziar, juntando os eventos. */
function resolve(s, eventos) {
  for (let i = 0; i < 8 && s.stack.length && !s.pending; i++) {
    const r = roda(s, { t: 'pass', p: s.turn.priority }); s = r.s; eventos.push(...r.ev);
  }
  return s;
}
const disparou = (eventos, s, nome) => eventos.some(e => (e.kind === 'trigger' || e.kind === 'trigger-fizzled') && e.name === nome)
  // gatilho que para para perguntar (alvo, modo, custo opcional) também disparou
  || !!(s.pending && ['pick_target', 'choose_mode', 'may_pay', 'pick', 'discard', 'choose_type'].includes(s.pending.kind));

/** Provoca o gatilho `when` da carta `nome` e devolve se ele apareceu. */
function provoca(nome, when, ab = {}) {
  const eventos = [];
  const terreno = /\bLand\b/i.test((cartaDe(nome) || {}).type_line || '');
  const naMao = ['etb', 'cast-self'].includes(when);
  const { s: s0, a, d, alvo } = mesa(nome, { naMao, naCova: !!ab.fromGraveyard });
  if (!alvo) return { ok: false, motivo: 'não consegui pôr a carta na mesa' };
  let s = s0;
  const casa = () => { // conjura a carta (ou joga o terreno) e resolve
    const op = E.legalActions(s, a).find(x => (terreno ? x.t === 'play_land' : x.t === 'cast') && x.oid === alvo);
    if (!op) return false;
    const r = roda(s, op); s = r.s; eventos.push(...r.ev);
    s = resolve(s, eventos);
    return true;
  };
  const outroMimico = () => s.zones[a].battlefield.map(o => s.objects[o]).find(o => o.name === 'Mímico' && o.oid !== alvo);
  const passaAte = passo => { for (let i = 0; i < 40 && s.turn.step !== passo && !s.pending; i++) { const r = roda(s, { t: 'pass', p: s.turn.priority }); s = r.s; eventos.push(...r.ev); } };
  switch (when) {
    case 'etb': case 'cast-self': if (!casa()) return { ok: false, motivo: terreno ? 'a mesa não ofereceu jogar o terreno' : 'a mesa não ofereceu a conjuração' }; break;
    case 'dies': { const r = roda(s, { t: 'move', p: a, oid: alvo, to: 'graveyard' }); s = r.s; eventos.push(...r.ev); break; }
    case 'leaves-battlefield': { const r = roda(s, { t: 'move', p: a, oid: alvo, to: 'hand' }); s = r.s; eventos.push(...r.ev); break; }
    case 'other-etb': case 'other-cast': {
      const isca = s.zones[a].hand.map(o => s.objects[o]).find(o => o.name === 'Mímico') ;
      if (!isca) return { ok: false, motivo: 'sem carta de apoio na mão' };
      const op = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === isca.oid);
      if (!op) return { ok: false, motivo: 'a mesa não ofereceu conjurar o apoio' };
      const r = roda(s, op); s = r.s; eventos.push(...r.ev); s = resolve(s, eventos); break;
    }
    case 'other-dies': { const x = outroMimico(); if (!x) return { ok: false, motivo: 'sem outra criatura no campo' };
      const r = roda(s, { t: 'move', p: a, oid: x.oid, to: 'graveyard' }); s = r.s; eventos.push(...r.ev); break; }
    case 'other-leaves-battlefield': { const x = outroMimico(); if (!x) return { ok: false, motivo: 'sem outra criatura no campo' };
      const r = roda(s, { t: 'move', p: a, oid: x.oid, to: 'hand' }); s = r.s; eventos.push(...r.ev); break; }
    case 'other-sacrificed': { const x = outroMimico(); if (!x) return { ok: false, motivo: 'sem outra criatura no campo' };
      // sacrificar de verdade: mover para o cemitério não é sacrifício
      const r = roda(s, { t: 'activate', p: a, oid: x.oid, index: 0 }); s = r.s; eventos.push(...r.ev); break; }
    case 'attacks': case 'combat-damage': {
      passaAte('combat_attackers');
      if (!s.pending || s.pending.kind !== 'attackers') return { ok: false, motivo: 'não cheguei na declaração de atacantes' };
      if (!E.eligibleAttackers(s, a).includes(alvo)) return { ok: false, motivo: 'a carta não pode atacar' };
      const r = roda(s, { t: 'attack', p: a, attackers: [alvo] }); s = r.s; eventos.push(...r.ev);
      if (when === 'combat-damage') { // sem bloqueio, o dano vai para o jogador
        for (let i = 0; i < 40 && s.turn.step !== 'main2'; i++) {
          if (s.pending && s.pending.kind === 'blockers') { const b = roda(s, { t: 'block', p: s.pending.p, blocks: [] }); s = b.s; eventos.push(...b.ev); continue; }
          if (s.pending) break;
          const r2 = roda(s, { t: 'pass', p: s.turn.priority }); s = r2.s; eventos.push(...r2.ev);
        }
      }
      break;
    }
    case 'upkeep': case 'main2': case 'end-of-combat': {
      const passo = when === 'upkeep' ? 'upkeep' : when === 'main2' ? 'main2' : 'combat_end';
      if (when === 'upkeep') { // vai até a próxima manutenção do dono
        for (let i = 0; i < 200 && !(s.turn.step === 'upkeep' && s.turn.active === a && s.turn.number > 0) && !s.pending; i++) {
          const r = roda(s, { t: 'pass', p: s.turn.priority }); s = r.s; eventos.push(...r.ev);
        }
      } else passaAte(passo);
      break;
    }
    case 'counters-added': { // marcador posto por um efeito, não pela mão do adjudicador
      const forte = s.zones[a].battlefield.map(x => s.objects[x]).find(x => x.name === 'Fortificador');
      if (!forte) return { ok: false, motivo: 'sem fonte de marcadores na mesa' };
      const r = roda(s, { t: 'activate', p: a, oid: forte.oid, index: 0, targets: [{ oid: alvo }] }); s = r.s; eventos.push(...r.ev);
      s = resolve(s, eventos); break; }
    case 'third-draw': { for (let i = 0; i < 3; i++) { const r = roda(s, { t: 'draw', p: a }); s = r.s; eventos.push(...r.ev); } break; }
    default: return { ok: null, motivo: 'sem driver' };
  }
  return { ok: disparou(eventos, s, nome), motivo: 'o gatilho não apareceu' };
}

test('A17 · todo gatilho das listas Pauper dispara quando o evento acontece', () => {
  const faltas = [], semDriver = new Set();
  for (const nome of cartasPauper()) {
    for (const ab of ((S.SCRIPTS[nome] || {}).abilities || [])) {
      if (ab.kind !== 'triggered') continue;
      if (GATILHOS_SEM_DRIVER[ab.when]) { semDriver.add(ab.when); continue; }
      if (ab.condition) continue; // gatilho condicional: cobertos pelo cenário S8 (ver A18)
      const r = provoca(nome, ab.when, ab);
      if (r.ok === null) { semDriver.add(ab.when); continue; }
      if (!r.ok) faltas.push(`${nome} · ${ab.when}: ${r.motivo}`);
    }
  }
  assert.deepEqual(faltas, [], 'gatilhos que não dispararam: ' + faltas.join(' · '));
});

test('A18 · gatilhos condicionais das listas ficam declarados, não escondidos', () => {
  // A17 não provoca estes: a condição depende de algo que a carta cobra na conjuração
  // (barganha, colher provas) ou de outra permanente com o mesmo nome. O efeito de cada
  // um é coberto pelo cenário S8. Se aparecer um novo, ele cai aqui e pede decisão.
  const condicionais = [];
  for (const nome of cartasPauper())
    for (const ab of ((S.SCRIPTS[nome] || {}).abilities || []))
      if (ab.kind === 'triggered' && ab.condition) condicionais.push(`${nome} · ${Object.keys(ab.condition)[0]}`);
  assert.deepEqual(condicionais.sort(), [
    'Faerie Miscreant · controlsOtherNamed',
    'Troublemaker Ouphe · bargained',
    'Vitu-Ghazi Inspector · evidenced'
  ]);
});
