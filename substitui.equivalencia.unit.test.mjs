// M-240 · CR2-G R5a · substituições de mudança de zona num formato só (614): `substitui` ("se fosse para X, vai para Y em vez
// disso") e `entra` ("entra virada", "a menos que…", "entra com N marcadores"), da própria carta ou de uma permanente que
// alcança outras por seletor. As regras antigas viraram atalhos; este teste compara com o caminho antigo (destinoLegado,
// entradaLegado) em partidas aleatórias e numa matriz com as 20 cartas que usam essas regras.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, T, J, act, decks, jogo, poe } from './listas.mjs';
import { CARTAS, mesa } from './cmd.mjs';

const LISTAS = Object.keys(decks);
const ZONAS = ['battlefield', 'graveyard', 'exile', 'hand', 'library'];

function comparaDestinos(s, rotulo) {
  let n = 0;
  for (const z of s.zones) for (const zona of ['battlefield', 'graveyard', 'hand', 'exile']) for (const oid of z[zona]) for (const para of ZONAS) {
    const o = s.objects[oid];
    assert.equal(E.destinoSubstituido(s, o, o.zone, para), E.destinoLegado(s, o, o.zone, para), `${rotulo} · ${o.name} ${o.zone} → ${para}`); n++;
  }
  return n;
}
/** Entrada pelos dois caminhos num clone, com o objeto já no campo (como no moveObject). */
function comparaEntrada(s, oid, xPago, rotulo) {
  const a = J(s), b = J(s);
  for (const x of [a, b]) { const o = x.objects[oid]; o.tapped = false; o.counters = {}; }
  E.entradaLegado(a, a.objects[oid], xPago);
  const r = E.entradaModificada(b, b.objects[oid], xPago), o = b.objects[oid];
  if (r.virada != null) o.tapped = r.virada; for (const [k, n] of Object.entries(r.marcadores)) o.counters[k] = (o.counters[k] || 0) + n;
  assert.deepEqual(J({ tapped: o.tapped, counters: o.counters }), J({ tapped: a.objects[oid].tapped, counters: a.objects[oid].counters }), rotulo);
}

test('M-240 · R5a · destino substituído ("em vez disso"): o caminho único e o antigo dão o mesmo para cada objeto, zona e destino, em partidas aleatórias com as listas reais', () => {
  let n = 0;
  LISTAS.forEach((lista, i) => {
    let s = jogo({ lista, oponente: LISTAS[(i + 3) % LISTAS.length], seed: 50 + i });
    const politica = E.randomPolicy(7333 + i);
    for (let k = 0; k < 160 && s.status !== 'over'; k++) { const a = politica(s); if (!a) break; s = act(s, a); if (k % 10 === 0) n += comparaDestinos(s, `${lista} · ${k}`); }
  });
  assert.ok(n > 10000, `amostra pequena (${n})`);
});

const ENTRAM = () => S.RAW_SCRIPTS.filter(sc => CARTAS[sc.name] && S.substituicoesDoScript(sc).entra.length).map(sc => sc.name);
test('M-240 · R5a · matriz de entradas: cada carta com "entra virada", "a menos que…" ou "entra com marcadores", dos dois lados, com e sem Authority of the Consuls do outro lado, com vida alta e baixa, com e sem terreno do tipo pedido, X e reforço pagos — o mesmo pelos dois caminhos', () => {
  const nomes = [...new Set([...ENTRAM(), 'Plains', 'Swamp', 'Island', 'Mountain', 'Lunarch Veteran', 'Kor Skyfisher'])];
  assert.ok(ENTRAM().length >= 18, `poucas cartas (${ENTRAM().length})`);
  let n = 0;
  for (const authority of [null, 0, 1]) for (const vida of [20, 13, 5]) for (const comTerreno of [false, true]) {
    let s = mesa(nomes, nomes, 7);
    if (authority != null) [s] = poe(s, authority, 'Authority of the Consuls');
    if (comTerreno) for (const p of [0, 1]) for (const b of ['Plains', 'Swamp', 'Island', 'Mountain']) { try { [s] = poe(s, p, b); } catch { /* sem cópia */ } }
    s = J(s); s.players[0].life = vida; s.players[1].life = 20;
    for (const p of [0, 1]) for (const nome of [...ENTRAM(), 'Lunarch Veteran']) {
      let x, oid; try { [x, oid] = poe(s, p, nome); } catch { continue; }
      for (const xPago of [0, 3]) for (const kicked of [0, 2]) {
        const y = J(x); y.objects[oid].kicked = kicked || undefined;
        comparaEntrada(y, oid, xPago, `${nome} de ${p} · Authority ${authority} · vida ${vida} · terreno ${comTerreno} · X ${xPago} · reforço ${kicked}`); n++;
      }
    }
  }
  assert.ok(n > 1000, `amostra pequena (${n})`);
});

test('M-240 · R5a · matriz de destino com a carta que vai para o exílio em vez do cemitério (Luminous Phantom), com e sem a Aura que tira as habilidades', () => {
  let s = mesa(['Lunarch Veteran', 'Darksteel Mutation', 'Kor Skyfisher'], ['Lunarch Veteran'], 3), lv, dm;
  [s, lv] = poe(s, 0, 'Lunarch Veteran'); [s, dm] = poe(s, 0, 'Darksteel Mutation');
  s = J(s); s.objects[lv].name = 'Luminous Phantom';
  assert.equal(E.destinoSubstituido(s, s.objects[lv], 'battlefield', 'graveyard'), 'exile');
  let n = comparaDestinos(s, 'fantasma');
  s.objects[dm].attachedTo = lv; s.objects[dm].anexadaEm = 99; s.objects[lv].mutavel = true;
  assert.equal(E.destinoSubstituido(s, s.objects[lv], 'battlefield', 'graveyard'), 'graveyard', 'sem as habilidades, vai para o cemitério');
  n += comparaDestinos(s, 'fantasma mutado');
  assert.ok(n > 50);
});

test('M-240 · R5a · a comparação pega divergência: uma substituição escrita como dado só o caminho novo vê', () => {
  let s = mesa(['Kor Skyfisher', 'Lunarch Veteran'], ['Kor Skyfisher'], 2), kor;
  [s, kor] = poe(s, 0, 'Kor Skyfisher'); s = J(s);
  s.facts['Kor Skyfisher'] = { ...s.facts['Kor Skyfisher'], script: { ...s.facts['Kor Skyfisher'].script, substitui: [{ quando: { para: 'graveyard', objeto: 'self' }, em: { para: 'hand' } }] } };
  assert.throws(() => comparaDestinos(s, 'com substituição'));
});

test('M-240 · R5a · escritas como dado na partida: "terrenos dos oponentes entram virados", "suas criaturas entram com um marcador +1/+1 a mais" e "se uma carta fosse para o cemitério de um oponente, exile-a em vez disso"', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 8 }), fonte, kor, elfo, floresta;
  [s, fonte] = poe(s, 0, 'Lunarch Veteran'); [s, kor] = poe(s, 0, 'Kor Skyfisher', 'hand'); [s, elfo] = poe(s, 1, 'Llanowar Elves'); [s, floresta] = poe(s, 1, 'Forest', 'hand');
  s = J(s);
  const sc = { substitui: [{ quando: { para: 'graveyard', objeto: { de: 'opponent', dono: 'opponent' } }, em: { para: 'exile' } }],
    entra: [{ afetados: { tipos: ['land'], de: 'opponent' }, virada: true }, { afetados: { tipos: ['creature'], de: 'you' }, marcadores: { p1p1: 1 } }] };
  for (const [i, r] of sc.substitui.entries()) assert.deepEqual(J(S.substituiErros(r, 's' + i)), []);
  for (const [i, r] of sc.entra.entries()) assert.deepEqual(J(S.entraErros(r, 'e' + i)), []);
  s.facts['Lunarch Veteran'] = { ...s.facts['Lunarch Veteran'], script: { ...s.facts['Lunarch Veteran'].script, ...sc } };
  const x = J(s);
  E.moveObject(x, floresta, 'battlefield'); assert.equal(x.objects[floresta].tapped, true, 'terreno do oponente entra virado');
  E.moveObject(x, kor, 'battlefield'); assert.equal(x.objects[kor].counters.p1p1, 1, 'sua criatura entra com marcador');
  E.moveObject(x, elfo, 'graveyard'); assert.equal(x.objects[elfo].zone, 'exile', 'a carta do oponente vai para o exílio');
  E.moveObject(x, fonte, 'graveyard'); assert.equal(x.objects[fonte].zone, 'graveyard', 'a sua vai para o cemitério');
});

test('M-240 · R5a · validador das substituições', () => {
  assert.ok(J(S.substituiErros({ quando: { para: 'graveyard' } }, 's')).some(e => /precisa de "quando" e "em"/.test(e)));
  assert.ok(J(S.substituiErros({ quando: { para: 'cemiterio' }, em: { para: 'exile' } }, 's')).some(e => /precisa ser uma zona/.test(e)));
  assert.ok(J(S.substituiErros({ quando: { para: 'graveyard' }, em: { para: 'graveyard' } }, 's')).some(e => /outra zona/.test(e)));
  assert.ok(J(S.entraErros({ afetados: 'self' }, 'e')).some(e => /não muda nada/.test(e)));
  assert.ok(J(S.entraErros({ afetados: 'self', virada: { aMenosQue: { lua: 1 } } }, 'e')).some(e => /aMenosQue/.test(e)));
  assert.ok(J(S.entraErros({ afetados: 'self', marcadores: { p1p1: -1 } }, 'e')).some(e => /inteiro/.test(e)));
  assert.ok(J(S.entraErros({ afetados: { palavra: 'flying' }, virada: true }, 'e')).some(e => /palavra-chave/.test(e)));
});
