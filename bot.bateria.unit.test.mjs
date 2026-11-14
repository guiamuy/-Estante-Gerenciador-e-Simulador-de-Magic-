// B-188 · B25 fase 0 · a bateria profissional do Shark (bot.bateria.mjs): cada posição é montável, a jogada certa é legal
// nela (a bateria não pede o impossível), e a nota do Shark publicado não cai abaixo do piso. O piso só sobe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { POSICOES, pontua } from './bot.bateria.mjs';
const { engine: E, bot: B } = loadModules();

const PISO = 36; // B-217 · 36 de 40 (posição nova `alcance-controle-thorn`, que o Shark publicado acerta com o `alcance` e o shark-v33 erra) · B-216 · 35 de 39 (posição nova `rem-controle-guttersnipe`, que o Shark publicado acerta com o `usaNaAmeaca` e o shark-v32 erra) · B-215 · 34 de 38 (posição nova `seq-elfos-lead-antes`, que o Shark publicado acerta com o `antesDoCombate` e o shark-v31 erra) · B-214 · 33 de 37 (posição nova `rem-faeries-flamebreather`, que o Shark publicado acerta com o `alvoNaAmeaca`) · B-209 · 32 de 36 (posição nova `seq-faeries-duas-anulacoes`, que o Shark publicado erra: a opção `seguraComDuas` acerta e mediu 30 × 38 nas Faeries) · B-208 · 32 de 35 (posições novas `seq-faeries-brainstorm-espera`, que o Shark publicado já acerta, e `seq-faeries-sprite-espera`, que ele erra: a opção `esperaOLampejo` acerta e mediu 31 × 33 nas Faeries) · B-207 · 31 de 33 (posições novas `rem-elfo-de-mana`, que o Shark publicado erra, e `rem-priest-sim`) · B-200 · 30 de 31 com o ninja pelo ataque (erra só a isca `volta-isca`). Era 29 (B-196), 27 (B-195), 26 (B-192), 25 (B-191), 24 (B-190), 22 (B-188)

test('B-188 · toda posição da bateria monta, tem classe, porquê, e a jogada certa está entre as legais', () => {
  const ids = new Set();
  for (const P of POSICOES) {
    assert.ok(!ids.has(P.id), 'id repetido: ' + P.id); ids.add(P.id);
    assert.ok(P.classe && P.porque && typeof P.certo === 'function', P.id);
    const { s } = P.monta();
    assert.equal(s.status === 'mulligan' || s.status === 'playing', true, P.id + ': ' + s.status);
    const legais = P.mulligan ? [{ t: 'keep', p: 0, bottom: [] }, { t: 'mulligan', p: 0 }] : E.legalActions(s, 0).filter(a => a.t !== 'concede');
    assert.ok(legais.some(a => P.certo(s, { acao: a })), P.id + ': a jogada certa não é legal');
  }
  assert.ok(POSICOES.length >= 20);
});

test('B-188 · a nota do Shark publicado na bateria não cai abaixo do piso; o shark-v12 congelado acerta menos', () => {
  const novo = pontua('shark'), v12 = pontua('shark-v12');
  assert.ok(novo.certas >= PISO, `shark ${novo.certas}/${novo.total}: ` + novo.erradas.map(e => e.id).join(', '));
  assert.ok(v12.certas < novo.certas, `v12 ${v12.certas} × shark ${novo.certas}`);
});

test('B-190 · contra-ataque: com Tolarian Terror e Serpentes (ou o Avenging Hunter) do outro lado, o Shark publicado segura os Baleful Strix em casa; o shark-v18 congelado atacava', () => {
  for (const id of ['papel-strix-segura-serpentes', 'papel-strix-segura-hunter']) {
    const P = POSICOES.find(x => x.id === id), joga = nivel => { const { s } = P.monta(); const j = B.criaBot({ nivel, agora: () => 0 }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
    const novo = joga('shark'), v18 = joga('shark-v18');
    assert.ok(novo.ok, id + ' · publicado: ' + novo.j.motivo); assert.ok(!v18.ok, id + ' · v18: ' + v18.j.motivo);
  }
});

test('B-191 · motor de mana: com quatro Elfos, o Shark publicado não manda o Priest of Titania nem o Timberwatch atacar contra dois Baleful Strix; o shark-v19 congelado mandava', () => {
  const P = POSICOES.find(x => x.id === 'papel-elfos-motor-em-casa'), joga = nivel => { const { s } = P.monta(); const j = B.criaBot({ nivel, agora: () => 0 }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
  const novo = joga('shark'), v19 = joga('shark-v19');
  assert.ok(novo.ok, 'publicado: ' + novo.j.motivo); assert.ok(!v19.ok, 'v19: ' + v19.j.motivo);
});

test('B-192 · o que a habilidade abre: com o Viridian Longbow solto e o Priest of Titania do outro lado, o Shark publicado equipa; o shark-v20 congelado passava', () => {
  const P = POSICOES.find(x => x.id === 'recurso-longbow-equipa'), joga = nivel => { const { s } = P.monta(); const j = B.criaBot({ nivel, agora: () => 0 }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
  const novo = joga('shark'), v20 = joga('shark-v20');
  assert.ok(novo.ok, 'publicado: ' + novo.j.motivo); assert.ok(!v20.ok, 'v20: ' + v20.j.motivo);
});

test('B-195 · grimório: com duas cartas no grimório e o Campfire em jogo, o Shark publicado reembaralha o cemitério; o shark-v21 congelado ganhava 2 de vida', () => {
  const P = POSICOES.find(x => x.id === 'recurso-campfire-reembaralha'), joga = nivel => { const { s } = P.monta(); const j = B.criaBot({ nivel, agora: () => 0 }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
  const novo = joga('shark'), v21 = joga('shark-v21');
  assert.ok(novo.ok, 'publicado: ' + novo.j.motivo); assert.ok(!v21.ok, 'v21: ' + v21.j.motivo);
});

test('B-196 · anulação aberta do Control: com a Counterspell na mão, o Shark publicado não gasta a mana na segunda fase principal e ainda cicla o Lórien por uma Ilha; o shark-v22 congelado gastava', () => {
  for (const id of ['seq-guarda-anulacao-spellbomb', 'seq-guarda-anulacao-preordain']) {
    const P = POSICOES.find(x => x.id === id), joga = nivel => { const { s } = P.monta(); const j = B.criaBot({ nivel, agora: () => 0 }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
    const novo = joga('shark'), v22 = joga('shark-v22');
    assert.ok(novo.ok, id + ' · publicado: ' + novo.j.motivo); assert.ok(!v22.ok, id + ' · v22: ' + v22.j.motivo);
  }
  const L = POSICOES.find(x => x.id === 'recurso-lorien-ciclar'), { s } = L.monta(), j = B.criaBot({ nivel: 'shark', agora: () => 0 }).jogada(s, 0);
  assert.ok(L.certo(s, j), 'o terreno que ainda dá para baixar conta como fonte: ' + j.motivo);
});

test('B-197 · o pedágio de segurar a anulação vem do perfil: Control e Terror ligam, Faeries não (dado em PERFIS)', () => {
  const pf = id => B.PERFIS.find(x => x.id === id) || {};
  assert.equal(pf('controle').segura, true); assert.equal(pf('terror').segura, true);
  assert.ok(!B.PERFIS.some(x => /faer/i.test(x.id) && x.segura), 'as Faeries perdem com o pedágio (8 × 11)');
});

test('B-198 · o perfil desliga: as Faeries não ligam `respondeNoMeuTurno` (dado em PERFIS); o Control e o Terror continuam com ela', () => {
  const pf = id => B.PERFIS.find(x => x.id === id) || {};
  assert.deepEqual([...pf('faeries').desliga], ['respondeNoMeuTurno']);
  assert.ok(!(pf('controle').desliga || []).length && !(pf('terror').desliga || []).length);
  assert.deepEqual([...pf('faeries').exige], ['Spellstutter Sprite', 'Ninja of the Deep Hours']);
});

test('B-200 · o ninja pelo ataque: com o Augur desvirado e o outro lado sem bloqueador, o Shark publicado não conjura o Ninja of the Deep Hours pela mão; o shark-v24 congelado conjurava', () => {
  const P = POSICOES.find(x => x.id === 'seq-ninja-pelo-ataque'), joga = nivel => { const { s } = P.monta(); const j = B.criaBot({ nivel, agora: () => 0 }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
  const novo = joga('shark'), v24 = joga('shark-v24');
  assert.ok(novo.ok, 'publicado: ' + novo.j.motivo); assert.ok(!v24.ok, 'v24: ' + v24.j.motivo);
});

test('B-208 · lampejo espera o turno do outro: com a Counterspell na mão, `esperaOLampejo` não conjura a Spellstutter Sprite sem alvo no próprio turno; o Shark publicado (opção desligada, 31 × 33 em 96 pares nas Faeries) conjura', () => {
  const P = POSICOES.find(x => x.id === 'seq-faeries-sprite-espera'), joga = extra => { const { s } = P.monta(); const j = B.criaBot({ nivel: 'shark', agora: () => 0, ...(extra ? { extra } : {}) }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
  const com = joga({ esperaOLampejo: true }), sem = joga(null);
  assert.ok(com.ok, 'com a opção: ' + com.j.motivo); assert.ok(!sem.ok, 'publicado mudou (a opção é só de torneio): ' + sem.j.motivo);
  const Q = POSICOES.find(x => x.id === 'seq-faeries-brainstorm-espera'), m = Q.monta(), j = B.criaBot({ nivel: 'shark', agora: () => 0, extra: { esperaOLampejo: true } }).jogada(m.s, 0);
  assert.ok(Q.certo(m.s, j), 'Brainstorm com a opção: ' + j.motivo);
});

test('B-215 · antes do combate: na primeira fase principal, o Lead the Stampede vai antes do ataque que vira os elfos de mana; o shark-v31 congelado esperava a segunda fase', () => {
  const P = POSICOES.find(x => x.id === 'seq-elfos-lead-antes'), joga = (nivel, extra) => { const { s } = P.monta(); const j = B.criaBot({ nivel, agora: () => 0, ...(extra ? { extra } : {}) }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
  const novo = joga('shark'), v31 = joga('shark-v31'), sem = joga('shark', { antesDoCombate: false });
  assert.ok(novo.ok, 'publicado: ' + novo.j.motivo); assert.ok(/antes do combate/.test(novo.j.motivo), 'motivo: ' + novo.j.motivo);
  assert.ok(!v31.ok, 'v31: ' + v31.j.motivo); assert.ok(!sem.ok, 'sem a opção: ' + sem.j.motivo);
});

test('B-215 · soTrazCartas pelo dado do motor: o feitiço que só traz cartas sim (Lead the Stampede, Winding Way, Ponder, Deep Analysis); a instantânea (Brainstorm), o tutor de terreno (Land Grant) e o feitiço com outro efeito (Sleep of the Dead) não', () => {
  const { s } = POSICOES.find(x => x.id === 'seq-elfos-lead-antes').monta();
  const de = nome => { const oid = Object.keys(s.objects).find(o => s.objects[o].name === nome); assert.ok(oid, 'falta ' + nome); return B.soTrazCartas(s, s.objects[oid]); };
  for (const n of ['Lead the Stampede', 'Winding Way', 'Ponder', 'Deep Analysis']) assert.equal(de(n), true, n);
  for (const n of ['Brainstorm', 'Land Grant', 'Sleep of the Dead', 'Forest']) assert.equal(de(n), false, n);
});

test('B-216 · a remoção na ameaça: no meu turno, o Cast Down vai no Guttersnipe com a mana que ia sobrar (na primeira e na segunda fase); o shark-v32 congelado guardava a instantânea e conjurava o Preordain', () => {
  const P = POSICOES.find(x => x.id === 'rem-controle-guttersnipe'), joga = (nivel, extra, passo) => { const { s } = P.monta(); if (passo) s.turn.step = passo; const j = B.criaBot({ nivel, agora: () => 0, ...(extra ? { extra } : {}) }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
  const novo = joga('shark'), cedo = joga('shark', null, 'main1'), v32 = joga('shark-v32'), sem = joga('shark', { usaNaAmeaca: false });
  assert.ok(novo.ok, 'publicado: ' + novo.j.motivo); assert.ok(/a ameaça sai antes do turno dele/.test(novo.j.motivo), 'motivo: ' + novo.j.motivo);
  assert.ok(cedo.ok, 'primeira fase: ' + cedo.j.motivo);
  assert.ok(!v32.ok, 'v32: ' + v32.j.motivo); assert.ok(!sem.ok, 'sem a opção: ' + sem.j.motivo);
});

test('B-216 · tiraAmeaca: só a remoção que tira do campo a criatura do outro que é ameaça pelo efeito (o Cast Down no Guttersnipe sim; o Preordain e a jogada vazia não)', () => {
  const { s, ids } = POSICOES.find(x => x.id === 'rem-controle-guttersnipe').monta();
  const W = B.visaoDe(s, 0, 0, new Set());
  const cast = (nome, alvo) => E.legalActions(s, 0).find(a => a.t === 'cast' && s.objects[a.oid].name === nome && (!alvo || (a.targets || []).some(t => t.oid && s.objects[t.oid].name === alvo)));
  const cd = cast('Cast Down', 'Guttersnipe'); assert.ok(cd, 'Cast Down no Guttersnipe é legal');
  assert.equal(B.tiraAmeaca(s, W, 0, cd), true);
  assert.equal(B.tiraAmeaca(s, W, 0, cast('Preordain')), false);
  assert.equal(B.tiraAmeaca(s, W, 0, null), false);
  assert.ok(ids[1].Guttersnipe, 'monta o Guttersnipe');
});

test('B-216 · ameacaQueCobra: o gatilho a cada mágica que só ganha vida (God-Pharaoh\'s Faithful) não pede a remoção; o que causa dano, cria ficha, compra ou cresce com a mesa pede', async () => {
  const { listasDeFora, listasDoShark } = await import('./torneio.listas.mjs');
  const todas = [...listasDeFora(), ...listasDoShark()];
  const de = nome => { const d = todas.find(x => x.entries.some(e => e.name === nome)); const cards = {}; for (const e of d.entries) cards[e.name] = d.cartas[e.name];
    const s = E.createGame({ format: 'pauper', seed: 1, mode: 'full', manaCheck: true, cards, players: [{ name: 'a', deck: d.entries }, { name: 'b', deck: d.entries }] }); return B.ameacaQueCobra(s, { name: nome }); };
  assert.equal(de("God-Pharaoh's Faithful"), false);
  for (const n of ['Guttersnipe', 'Kessig Flamebreather', 'Murmuring Mystic', 'Priest of Titania', 'Ninja of the Deep Hours']) assert.equal(de(n), true, n);
});

test('B-217 · o alcance da queima: com 7 de vida contra o Madness de quatro Mountain, o Control segura a Counterspell em vez de virar tudo no Thorn; o shark-v33 congelado e o Shark sem a opção viram', () => {
  const P = POSICOES.find(x => x.id === 'alcance-controle-thorn'), joga = (nivel, extra) => { const { s } = P.monta(); const j = B.criaBot({ nivel, agora: () => 0, ...(extra ? { extra } : {}) }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
  const novo = joga('shark'), v33 = joga('shark-v33'), sem = joga('shark', { alcance: false });
  assert.ok(novo.ok, 'publicado: ' + novo.j.motivo);
  assert.ok(!v33.ok, 'v33: ' + v33.j.motivo); assert.ok(!sem.ok, 'sem a opção: ' + sem.j.motivo);
});

test('B-217 · alcanceDoOutro pelo dado do motor: a Fireblast sai de graça com duas Mountain, a Counterspell de pé tira a maior queima, o gatilho do Guttersnipe soma por mágica; lista sem queima dá zero', () => {
  const { s } = POSICOES.find(x => x.id === 'alcance-controle-thorn').monta();
  const W = J => { const w = JSON.parse(JSON.stringify(s)); J(w); return w; };
  const mao = (w, nomes) => { const z = w.zones[1]; for (const oid of [...z.hand]) { z.hand.splice(z.hand.indexOf(oid), 1); z.library.push(oid); }
    for (const n of nomes) { const oid = [...z.library, ...z.exile].find(o => w.objects[o].name === n && !z.hand.includes(o)); assert.ok(oid, 'falta ' + n); for (const k of ['library', 'exile']) if (z[k].includes(oid)) z[k].splice(z[k].indexOf(oid), 1); z.hand.push(oid); w.objects[oid].zone = 'hand'; } };
  const vira = (w, p) => { for (const oid of w.zones[p].battlefield) w.objects[oid].tapped = true; };
  // Bolt 3 + Fireblast 4 (custo alternativo) + Lava Dart 1 com quatro manas: 8; a Counterspell de pé tira a Fireblast
  assert.deepEqual({ ...B.alcanceDoOutro(W(w => mao(w, ['Lightning Bolt', 'Fireblast', 'Lava Dart'])), 0) }, { queima: 4, campo: 0 });
  assert.deepEqual({ ...B.alcanceDoOutro(W(w => { mao(w, ['Lightning Bolt', 'Fireblast', 'Lava Dart']); vira(w, 0); }), 0) }, { queima: 8, campo: 0 });
  // sem terreno na mão nem campo, a mana dele paga: quatro Lightning Bolt com quatro Mountain = 12, menos a Counterspell
  assert.equal({ ...B.alcanceDoOutro(W(w => { mao(w, ['Lightning Bolt', 'Lightning Bolt', 'Lightning Bolt', 'Lightning Bolt']); vira(w, 0); }), 0) }.queima, 12);
  // o gatilho de quem conjura: o Guttersnipe no campo dele soma 2 por mágica, mesmo a anulada
  const comGutter = W(w => { mao(w, ['Lightning Bolt', 'Lava Dart']); const z = w.zones[1], oid = [...z.library, ...z.exile].find(o => w.objects[o].name === 'Guttersnipe'); for (const k of ['library', 'exile']) if (z[k].includes(oid)) z[k].splice(z[k].indexOf(oid), 1); z.battlefield.push(oid); Object.assign(w.objects[oid], { zone: 'battlefield', sick: false, tapped: true }); });
  assert.deepEqual({ ...B.alcanceDoOutro(comGutter, 0) }, { queima: 1 + 2 * 2, campo: 2 }); // o Guttersnipe desvira e ataca: 2 passam (o Control não tem criatura)
  // do lado do Madness olhando o Control (sem queima na lista dele), nada
  assert.equal(B.alcanceDoOutro(s, 1).queima, 0);
});
