// M-234 · CR2-G R3a · efeitos contínuos estáticos num caminho só (613, camadas 6 e 7c). Os bônus de Aura e Equipamento
// (grants), "suas criaturas têm" (grantsAll) e o bônus próprio por contagem (self.per) viraram atalhos de um efeito
// { afetados, poder, resistencia, palavras, per… }. Este teste compara o caminho novo com o antigo (bonusLegado, hasLegado)
// para cada objeto e cada palavra-chave, em partidas aleatórias com as listas reais e numa matriz com as cartas que concedem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, T, J, act, decks, jogo, poe, passaAte } from './listas.mjs';
import { CARTAS, mesa } from './cmd.mjs';

const LISTAS = Object.keys(decks);
const KWS = S.KEYWORDS;

function compara(s, rotulo) {
  let n = 0;
  for (const z of s.zones) for (const zona of ['battlefield', 'hand', 'graveyard']) for (const oid of z[zona]) {
    const o = s.objects[oid]; if (!o || !s.facts[o.name]) continue;
    assert.deepEqual(J(E.bonus(s, o)), J(E.bonusLegado(s, o)), `${rotulo} · bônus de ${o.name} (${zona})`);
    for (const k of KWS) { assert.equal(E.hasKeyword(s, o, k), E.hasLegado(s, o, k), `${rotulo} · ${o.name} (${zona}) · ${k}`); n++; }
  }
  return n;
}

test('M-234 · R3a · bônus de P/T e palavras-chave concedidas: o caminho único e o antigo dão o mesmo para cada objeto e cada palavra-chave, em partidas aleatórias com as listas reais', () => {
  let comparacoes = 0;
  LISTAS.forEach((lista, i) => {
    for (const seed of [1, 2]) {
      let s = jogo({ lista, oponente: LISTAS[(i + 2 + seed) % LISTAS.length], seed });
      const politica = E.randomPolicy(seed * 6007 + i);
      for (let k = 0; k < 180 && s.status !== 'over'; k++) {
        const a = politica(s); if (!a) break; s = act(s, a);
        if (k % 10 === 0) comparacoes += compara(s, `${lista} · semente ${seed} · ação ${k}`);
      }
    }
  });
  assert.ok(comparacoes > 20000, `amostra pequena (${comparacoes})`);
});

const CONCEDEM = () => Object.entries(S.SCRIPTS).filter(([n, sc]) => CARTAS[n] && ((sc.grants && (sc.grants.power || sc.grants.toughness || sc.grants.per || (sc.grants.keywords || []).length)) || sc.grantsAll || (sc.self && sc.self.per))).map(([n]) => n);
function mesaQueConcede() {
  const nomes = [...CONCEDEM(), 'Darksteel Mutation', 'Reprobation', 'Lunarch Veteran', 'Kor Skyfisher'];
  let s = mesa(nomes, nomes, 4);
  for (const p of [0, 1]) for (const n of nomes) { try { [s] = poe(s, p, n); } catch { /* sem cópia */ } try { [s] = poe(s, p, n, 'hand'); } catch { /* sem cópia */ } }
  s = J(s);
  let relogio = 1;
  for (const p of [0, 1]) {
    const bf = s.zones[p].battlefield.map(o => s.objects[o]);
    for (const o of bf) o.ts = relogio++;
    const concede = o => { const sc = s.facts[o.name].script || {}; return sc.self || sc.grantsAll ? 1 : 0; };
    // as que têm bônus próprio por contagem ou concedem a todas ficam por último (não levam a Aura que tira tudo nem viram para baixo)
    const criaturas = bf.filter(o => s.facts[o.name].types.includes('creature')).sort((a, b) => concede(a) - concede(b));
    // Auras e Equipamentos espalhados; a primeira criatura recebe também uma Aura que tira as habilidades no meio da fila
    bf.filter(o => /Aura|Equipment/.test(CARTAS[o.name].type_line) && !['Darksteel Mutation', 'Reprobation'].includes(o.name)).forEach((o, i) => { o.attachedTo = criaturas[i % 3].oid; o.anexadaEm = relogio++; });
    const muta = bf.find(o => o.name === (p ? 'Reprobation' : 'Darksteel Mutation'));
    if (muta) { muta.attachedTo = criaturas[0].oid; muta.anexadaEm = 4 + p; criaturas[0].mutavel = true; }
    const hidra = bf.find(o => o.name === 'Nyxborn Hydra'); if (hidra) { hidra.bestowed = true; hidra.attachedTo = criaturas[1].oid; hidra.anexadaEm = relogio++; }
    if (criaturas[2]) criaturas[2].faceDown = true;
  }
  return s;
}

test('M-234 · R3a · matriz das cartas que concedem: Auras, Equipamentos, concedida a todas, bônus por contagem, Aura que tira as habilidades no meio da fila, concessão com esperar (bestow) e virada para baixo — o mesmo pelos dois caminhos', () => {
  const s = mesaQueConcede();
  assert.ok(CONCEDEM().length >= 12, `poucas cartas que concedem (${CONCEDEM().length})`);
  const n = compara(s, 'matriz');
  assert.ok(n > 1000, `amostra pequena (${n})`);
  // a matriz exercita os três atalhos e o corte da Aura que tira tudo
  const afetados = s.zones.flatMap(z => z.battlefield).flatMap(oid => E.continuosQueAfetam(s, s.objects[oid]));
  for (const k of ['anexada', 'self']) assert.ok(afetados.some(e => e.afetados === k), `nenhum efeito "${k}" na matriz`);
  assert.ok(afetados.some(e => typeof e.afetados === 'object'), 'nenhum "suas criaturas têm" na matriz');
});

test('M-234 · R3a · a comparação pega divergência: um efeito `continuo` só o caminho novo vê', () => {
  let s = mesaQueConcede();
  s.facts['Tuktuk Rubblefort'] = { ...s.facts['Tuktuk Rubblefort'], script: { ...(s.facts['Tuktuk Rubblefort'].script || {}), continuo: [{ afetados: { tipos: ['creature'], de: 'you' }, poder: 1, palavras: ['flying'] }] } };
  assert.throws(() => compara(s, 'com hino'), /bônus|flying/);
});

test('M-234 · R3a · hino escrito como dado: "As criaturas que você controla recebem +1/+1" e "as dos oponentes recebem -1/-1" — a criatura X/1 do oponente morre na checagem de estado', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 3 }), host, kor, elfo;
  [s, host] = poe(s, 0, 'Lunarch Veteran'); [s, kor] = poe(s, 0, 'Kor Skyfisher'); [s, elfo] = poe(s, 1, 'Llanowar Elves');
  s = J(s);
  const base = E.stats(s, s.objects[kor]);
  s.facts['Lunarch Veteran'] = { ...s.facts['Lunarch Veteran'], script: { name: 'Lunarch Veteran', effects: [], continuo: [
    { afetados: { tipos: ['creature'], de: 'you' }, poder: 1, resistencia: 1 },
    { afetados: { tipos: ['creature'], de: 'opponent' }, poder: -1, resistencia: -1 },
    { afetados: { tipos: ['creature'], de: 'you', outra: true }, palavras: ['flying'] }] } };
  for (const c of s.facts['Lunarch Veteran'].script.continuo) assert.deepEqual(J(S.continuoErros(c, 'c')), []);
  assert.deepEqual(J(E.stats(s, s.objects[kor])), { power: base.power + 1, toughness: base.toughness + 1 });
  assert.equal(E.hasKeyword(s, s.objects[kor], 'flying'), true, '"outra" ganha voar');
  assert.equal(E.hasKeyword(s, s.objects[host], 'flying'), false, 'a fonte não é "outra"');
  assert.equal(E.stats(s, s.objects[host]).toughness, 2, 'Lunarch Veteran 1/1 recebe o próprio hino');
  assert.equal(E.stats(s, s.objects[elfo]).toughness, 0);
  const passe = E.legalActions(s, 0).find(a => a.t === 'pass');
  s = act(s, passe);
  assert.equal(s.objects[elfo].zone, 'graveyard', '704.5f: resistência 0 vai para o cemitério');
});

test('M-234 · R3a · validador e português do efeito contínuo', () => {
  const erros = c => J(S.continuoErros(c, 'c'));
  assert.deepEqual(erros({ afetados: { tipos: ['creature'], de: 'you', subtipos: ['Elf'], outra: true }, poder: 1, resistencia: 1, palavras: ['trample'] }), []);
  assert.deepEqual(erros({ afetados: 'self', per: 'creatures-you-control', perPoder: 1 }), []);
  assert.ok(erros({ afetados: { palavra: 'flying' }, poder: 1 }).some(e => /não aceita "palavra"/.test(e)), 'camada 6 não depende dela mesma');
  assert.ok(erros({ afetados: { zona: 'graveyard' }, poder: 1 }).some(e => /só permanentes no campo/.test(e)));
  assert.ok(erros({ afetados: 'self' }).some(e => /não muda nada/.test(e)));
  assert.ok(erros({ afetados: 'self', palavras: ['voar'] }).some(e => /palavra-chave desconhecida/.test(e)));
  assert.ok(erros({ afetados: 'self', perPoder: 1, per: 'sei-la' }).some(e => /contagem/.test(e)));
  assert.ok(erros({ afetados: 'todos', poder: 1 }).some(e => /self, anexada ou um seletor/.test(e)));
  assert.equal(T.descreveContinuo({ afetados: { tipos: ['creature'], de: 'you' }, poder: 1, resistencia: 1 }), 'cada criatura que você controla recebe +1/+1');
  assert.equal(T.descreveContinuo({ afetados: { tipos: ['creature'], de: 'opponent' }, poder: -1, resistencia: 0 }), 'cada criatura que um oponente controla recebe -1/+0');
  assert.equal(T.descreveContinuo({ afetados: 'anexada', poder: 2, resistencia: 2, palavras: ['trample'] }), 'a permanente anexada recebe +2/+2 e tem atropelar');
  assert.equal(T.descreveContinuo({ afetados: 'self', per: 'creatures-you-control', perPoder: 1, perResistencia: 1 }), 'esta permanente recebe +1/+1 para cada criatura que você controla');
});
