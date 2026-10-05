// R9b · tela da homologação independente: o que os revisores apontaram como texto errado ou enganoso na mesa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, CARDS, act, poe, jogo, limpaMao, legais, conjura, resolveUm } from './listas.mjs';
const src = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const F = 'Pauper Mono Blue Faeries';

test('R9b · dicionário de efeitos: nenhuma frase da pilha explicada sai em inglês, com chave de script ou com NaN (todos os scripts)', () => {
  const EN = /NaN|(?<!\p{L})(self|source|creature|creatures|flying|nonflying|opponent|opponents|controls|control|you|your|own|held|ability|graveyard|target|controller|blocked|by|in|any|or|card|enchantment|each|other|spell|attacking|blocking|permanent|player|land|artifact|with|from|the|and|first|instant|indestructible|hexproof|untapped|tapped|chosen|type|top|hand|library|battlefield)(?!\p{L})/iu; // limites com letras acentuadas: "instantânea" não é "instant"
  const ruins = [];
  for (const sc of S.RAW_SCRIPTS) {
    const effs = [...(sc.effects || []), ...(sc.abilities || []).flatMap(a => a.effects || []), ...(sc.modes || []).flatMap(x => x.effects || []), ...(sc.alt || []).flatMap(x => x.effects || []), ...((sc.back || {}).abilities || []).flatMap(a => a.effects || [])];
    for (const e of effs) { const d = T.descreveEfeitos([e]); if (!d || EN.test(d) || d === String(e.do).replace(/_/g, ' ')) ruins.push(`${sc.name}: "${d}"`); }
  }
  assert.deepEqual(ruins, []);
});

test('R9b · pilha explicada: o gatilho de entrada mostra a linha do gatilho, não a da habilidade ativada (Harrier Strix, Sewer-veillance Cam)', () => {
  for (const [nome, esperado, errado] of [['Harrier Strix', /^When this creature enters, tap target permanent\./, /Draw a card, then discard/], ['Sewer-veillance Cam', /^When this artifact enters or leaves the battlefield/, /Draw two cards/]]) {
    let s = limpaMao(jogo({ lista: F, terrenos: ['Island', 'Island'] }), 0), x; [s] = poe(s, 0, 'Faerie Seer'); [s, x] = poe(s, 0, nome, 'hand');
    s = resolveUm(conjura(s, 0, x)); if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: 0 });
    const it = T.explicaPilha(s, { oracleDe: n => CARDS[n].oracle_text }).itens.find(i => /Habilidade/.test(i.nome));
    assert.ok(it, 'gatilho de ' + nome + ' na pilha'); assert.match(it.oQueFaz, esperado); assert.doesNotMatch(it.oQueFaz, errado);
  }
});

test('R9b · registro: Hydroblast que não fez nada não diz "anulou" nem "(indestrutível)"', () => {
  const linhas = (s, a) => { const r = E.apply(s, a); return [r.state, T.describe(s, a, r.events, r.state).join(' | ')]; };
  { let s = limpaMao(jogo({ lista: F, terrenos: ['Island'] }), 0), hb, n, l; [s, hb] = poe(s, 0, 'Hydroblast', 'hand'); [s, n] = poe(s, 1, 'Ninja of the Deep Hours');
    s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === hb && a.mode === 1 && a.targets[0].oid === n)[0]); s = act(s, { t: 'pass', p: 0 }); [s, l] = linhas(s, { t: 'pass', p: 1 });
    assert.equal(s.objects[n].zone, 'battlefield'); assert.doesNotMatch(l, /indestrut/); assert.match(l, /Hydroblast não destruiu Ninja of the Deep Hours: sem efeito/); }
  { let s = limpaMao(limpaMao(jogo({ lista: F, terrenos: ['Island', 'Island'], terrenosDoOponente: ['Island'] }), 0), 1), hb, i, l; [s, i] = poe(s, 0, 'Brinebarrow Intruder', 'hand'); [s, hb] = poe(s, 1, 'Hydroblast', 'hand');
    s = conjura(s, 0, i); s = act(s, { t: 'pass', p: 0 }); s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === hb && a.mode === 0)[0]); s = act(s, { t: 'pass', p: 1 }); [s, l] = linhas(s, { t: 'pass', p: 0 });
    assert.equal(s.objects[i].zone, 'stack', 'a mágica azul continua na pilha'); assert.doesNotMatch(l, /Hydroblast anulou/); assert.match(l, /Hydroblast não anulou Brinebarrow Intruder: sem efeito/); }
});

test('R9b · registro: indestrutível continua dito quando é esse o motivo', () => {
  let s = limpaMao(jogo({ lista: 'Pauper Jund Wildfire' }), 0), w, b; s = JSON.parse(JSON.stringify(s)); s.players[0].pool.R = 2; [s, b] = poe(s, 0, 'Drossforge Bridge'); [s, w] = poe(s, 0, 'Cleansing Wildfire', 'hand');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === w && a.targets[0].oid === b)[0]); s = act(s, { t: 'pass', p: 0 });
  const r = E.apply(s, { t: 'pass', p: 1 }); assert.match(T.describe(s, { t: 'pass', p: 1 }, r.events, r.state).join(' | '), /não destruiu Drossforge Bridge \(indestrutível\)/);
});

test('R9b · ward na cobrança chama "salvaguarda", não "vigilância" (que é outra habilidade)', () => {
  let s = limpaMao(jogo({ lista: 'Pauper Elves', oponente: 'Pauper Elves', terrenos: ['Forest', 'Forest', 'Forest'] }), 0), tw, cr; [s, tw] = poe(s, 0, 'Timberwatch Elf'); [s, cr] = poe(s, 1, 'Mirrorshell Crab');
  s = act(s, legais(s, 0, a => a.oid === tw && a.targets[0].oid === cr)[0]);
  assert.equal(s.pending.kind, 'may_pay'); assert.equal(s.pending.name, 'salvaguarda de Mirrorshell Crab');
});

test('R9b · rótulos da folha: custo alternativo com mana não diz "sem pagar mana"; perturbar em português; seta só com alvo; custo de descartar a própria carta', () => {
  const tela = src.slice(src.indexOf('function acoesDe(oid) {'), src.indexOf('/* ---- A15 · espiar'));
  assert.ok(tela.length > 1000);
  assert.doesNotMatch(tela, /`Disturb · /, 'o botão dizia "Disturb"'); assert.match(tela, /`Perturbar · /);
  assert.match(tela, /\(f\.script\.alt\[a\.alt\]\.cost \|\| \{\}\)\.mana \? `Custo alternativo · /, 'Electrickery com sobrecarga {1}{R} cobra mana: o rótulo não pode dizer "sem pagar mana"');
  assert.doesNotMatch(tela, /\ba(ct)?\.targets \? ` → /, 'ação com lista de alvos vazia (Cast into the Fire sem alvo, Faerie Macabre) ficava com a seta solta');
  assert.match(src, /c\.discardSelf \? 'descartar esta carta'/, 'canalizar (Mirrorshell Crab) e Faerie Macabre dizem o custo');
});
