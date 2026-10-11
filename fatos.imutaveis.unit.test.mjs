// Desempenho · os estados compartilham as entradas dos fatos das cartas (o motor não copia mais ≈ 75% do estado a cada ação). Isso só é
// seguro se nenhum caminho do motor alterar uma entrada por dentro. Aqui as entradas ficam blindadas (qualquer escrita lança) e partidas
// aleatórias com as listas reais (Commander e Pauper) passam por apply, legalActions, prévias e o Shark.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, jogo, J } from './listas.mjs';

const proxies = new WeakMap(), blindados = new WeakSet();
function blinda(o) {
  if (o === null || typeof o !== 'object' || blindados.has(o)) return o;
  if (proxies.has(o)) return proxies.get(o);
  const nega = (_, k) => { throw new Error('fato alterado por dentro: ' + String(k)); };
  const p = new Proxy(o, { set: nega, deleteProperty: nega, defineProperty: nega, get(t, k, r) { const v = Reflect.get(t, k, r); return v && typeof v === 'object' ? blinda(v) : v; } });
  proxies.set(o, p); blindados.add(p); return p;
}
const blindaFatos = s => { for (const k of Object.keys(s.facts)) s.facts[k] = blinda(s.facts[k]); return s; };

test('desempenho · o estado novo compartilha as entradas dos fatos e o JSON é o mesmo da cópia inteira', () => {
  const s = jogo({ lista: 'Commander Orzhov Killian', oponente: 'Commander Malcolm Kediss', seed: 3 });
  const a = E.legalActions(s, s.pending ? s.pending.p : s.turn.priority)[0];
  const r = E.apply(s, a).state;
  const k = Object.keys(s.facts)[0];
  assert.equal(r.facts[k], s.facts[k], 'mesma entrada, sem cópia');
  assert.notEqual(r.facts, s.facts, 'o mapa é novo: acrescentar uma ficha num estado não aparece no outro');
  assert.equal(JSON.stringify(Object.keys(r)), JSON.stringify(Object.keys(E.apply(J(s), a).state)), 'mesma ordem de chaves');
  assert.equal(E.hashState(r), E.hashState(E.apply(J(s), a).state), 'mesmo hash que a partir de uma cópia inteira');
});

test('desempenho · nenhuma ação altera um fato por dentro: partidas aleatórias com os fatos blindados', () => {
  const pares = [['Commander Orzhov Killian', 'Commander Malcolm Kediss'], ['Pauper Rakdos Madness', 'Pauper Mono Blue Faeries'], ['Pauper GW Bogles', 'Pauper Boros Bully'], ['Pauper Walls Combo', 'Pauper Jund Wildfire'], ['Pauper Elves', 'Pauper Mono Blue Faeries']];
  let acoes = 0;
  for (const [a, b] of pares) for (let seed = 1; seed <= 4; seed++) {
    let s = jogo({ lista: a, oponente: b, seed });
    s = blindaFatos(s); let r = 11 * seed;
    for (let i = 0; i < 250 && s.status === 'playing'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      const l = E.legalActions(s, p).filter(x => x.t !== 'concede'); if (!l.length) break;
      if (s.pending && s.pending.kind === 'blockers') E.previewCombat(s, []);
      r = (r * 1103515245 + 12345) % 2147483648;
      s = blindaFatos(E.apply(s, l[r % l.length]).state); acoes++;
    }
  }
  assert.ok(acoes > 3000, 'partidas suficientes: ' + acoes);
});
