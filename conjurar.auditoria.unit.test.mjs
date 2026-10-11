// CR2c.6 · correções achadas pela auditoria independente da fase CR2c (conjurar, ativar e pagar, 11/10/2026): a fonte do {T} não paga a
// própria mana (602.2b, 118.3); o objeto novo pode usar lealdade e "uma vez por turno" de novo (400.7, 606.3); marca interna não vem do
// jogador (117.1a); o reforço soma ao custo alternativo e conjurar sem pagar faz X = 0 (601.2f, 107.3b); conjurar por efeito durante a
// resolução vale para quem não tem a prioridade (608.2g). Cada teste falha no motor v104.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, tudo, CARTAS } from './cmd.mjs';

test('CR 602.2 · "{1}{R}, {T}": com só o Kher Keep e uma Mountain desvirados, a fonte do {T} não paga a própria mana', () => {
  let s = mesa(['Kher Keep', 'Mountain'], []), kk, mt;
  s = J(s); for (const oid of s.zones[0].battlefield) s.objects[oid].tapped = true;
  [s, kk] = poe(s, 0, 'Kher Keep'); [s, mt] = poe(s, 0, 'Mountain'); s = J(s); s.manaCheck = true;
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === kk).length, 0, 'a mesa não oferece');
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: kk, index: 0 }), /mana insuficiente/, 'antes o Keep virava para gerar {C} e ainda pagava o {T}');
  let ok; [ok] = poe(s, 0, 'Mountain'); ok = J(ok);
  assert.equal(legais(ok, 0, a => a.t === 'activate' && a.oid === kk).length, 1, 'com duas Mountains, ativa');
});

test('CR 606.3 · a planeswalker que muda de zona é um objeto novo: depois de voltar ao campo pode ativar lealdade no mesmo turno', () => {
  const s0 = mesa([], []);
  const nome = Object.values(CARTAS).filter(c => c.loyalty != null && (s0.facts[c.name] || {}).script && s0.facts[c.name].script.loyalty).map(c => c.name)[0];
  let s = mesa([nome], ['Into the Roil']), pw, roil;
  [s, pw] = poe(s, 0, nome); [s, roil] = poe(s, 1, 'Into the Roil', 'hand'); s = J(s); s.manaCheck = false;
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === pw)[0]));
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === pw).length, 0, 'uma por turno');
  s = act(s, { t: 'pass', p: 0 }); s = tudo(act(s, { t: 'cast', p: 1, oid: roil, targets: [{ oid: pw }] }));
  s = tudo(act(s, { t: 'cast', p: 0, oid: pw }));
  assert.equal(s.objects[pw].zone, 'battlefield');
  assert.ok(legais(s, 0, a => a.t === 'activate' && a.oid === pw).length > 0, 'o objeto novo pode ativar (antes: "já usou uma habilidade neste turno")');
});

test('CR 117.1 · marca interna não vem do jogador: "concedido por efeito" não fura a fase nem a prioridade, e habilidade de campo não ativa da mão', () => {
  let s = mesa(['Grizzly Bears', 'Forest', 'Lightning Bolt', 'Kher Keep'], []), b, f, bolt, kk;
  [s, b] = poe(s, 0, 'Grizzly Bears', 'hand'); [s, f] = poe(s, 0, 'Forest', 'hand'); [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, kk] = poe(s, 0, 'Kher Keep', 'hand');
  s = J(s); s.manaCheck = false;
  s = act(s, { t: 'cast', p: 0, oid: bolt, targets: [{ player: 1 }] });
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: b, granted: true }), /efeito de carta/, 'criatura com o raio na pilha');
  const sB = act(s, { t: 'pass', p: 0 });
  assert.throws(() => act(sB, { t: 'play_land', p: 0, oid: f, granted: true }), /efeito de carta/, 'terreno sem prioridade');
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: kk, index: 0, fromHand: true, targets: [] }), /no campo/, 'o Kher Keep não cria Kobold da mão');
});

test('CR 601.2 · o reforço soma ao custo alternativo (antes saía de graça), e conjurar sem pagar faz X = 0 (107.3b)', () => {
  let s = mesa(['Into the Roil', 'Island', 'Grizzly Bears'], ['Grizzly Bears']), roil, ilha, alvo;
  s = J(s); for (const oid of s.zones[0].battlefield) s.objects[oid].tapped = true;
  [s, roil] = poe(s, 0, 'Into the Roil', 'hand'); [s, ilha] = poe(s, 0, 'Island'); [s, alvo] = poe(s, 1, 'Grizzly Bears');
  s = J(s); s.manaCheck = true; s.objects[ilha].tapped = true;
  s.facts['Into the Roil'].script = { ...s.facts['Into the Roil'].script, alt: [{ label: 'Devolver uma Ilha', cost: { returnLand: 'Island' } }] };
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: roil, alt: 0, kick: 1, targets: [{ oid: alvo }], pay: { land: ilha } }), /mana insuficiente/);
  let h, t = mesa(['Nyxborn Hydra'], []); [t, h] = poe(t, 0, 'Nyxborn Hydra', 'hand');
  t = J(t); t.manaCheck = true; t.pending = { kind: 'free_cast', p: 0, options: [h], name: 'teste' };
  assert.throws(() => act(t, { t: 'cast_free', p: 0, oid: h, x: 7 }), /X é 0/, 'antes entrava com 7 marcadores sem pagar');
  assert.doesNotThrow(() => act(t, { t: 'cast_free', p: 0, oid: h }));
});

test('CR 608.2 · conjurar sem pagar durante a resolução: o jogador da decisão conjura mesmo sem ser o ativo', () => {
  let s = mesa([], ['Windbrisk Heights', 'Lightning Bolt']), wh, bolt;
  [s, wh] = poe(s, 1, 'Windbrisk Heights'); [s, bolt] = poe(s, 1, 'Lightning Bolt');
  s = J(s); s.manaCheck = false;
  s.facts['Windbrisk Heights'].script = { ...s.facts['Windbrisk Heights'].script, abilities: [s.facts['Windbrisk Heights'].script.abilities[0], { kind: 'activated', cost: { tap: true }, effects: [{ do: 'jogar_escondida' }] }] };
  s.zones[1].battlefield = s.zones[1].battlefield.filter(x => x !== bolt); s.zones[1].exile.push(bolt); Object.assign(s.objects[bolt], { zone: 'exile', faceDown: true }); s.objects[wh].escondida = bolt; s.objects[wh].tapped = false;
  s = act(s, { t: 'pass', p: 0 });
  const ab = legais(s, 1, a => a.t === 'activate' && a.oid === wh); s = act(s, ab[ab.length - 1]);
  s = act(s, { t: 'pass', p: 1 }); s = act(s, { t: 'pass', p: 0 });
  assert.equal(s.pending && s.pending.kind, 'free_cast'); assert.equal(s.pending.p, 1);
  const of = legais(s, 1, a => a.t === 'cast_free' && a.oid === bolt);
  assert.ok(of.length > 0);
  s = act(s, of[0]);
  assert.equal(s.objects[bolt].zone, 'stack', 'B conjura (antes: "jogador sem prioridade")');
});

test('CR 601.2 · o lampejo do passado cobra só o custo do lampejo, mesmo com o reforço somado no caminho alternativo (guarda contra o custo cobrado em dobro)', () => {
  let s = mesa(['Faithless Looting'], []), f; [s, f] = poe(s, 0, 'Faithless Looting', 'graveyard');
  s = J(s); for (const oid of s.zones[0].battlefield) s.objects[oid].tapped = true; s.manaCheck = true; s.players[0].pool.R = 4;
  const a = legais(s, 0, x => x.oid === f && x.flashback)[0];
  assert.ok(a, 'o lampejo é oferecido');
  s = act(s, a);
  assert.equal(4 - s.players[0].pool.R, 3, 'Faithless Looting com lampejo {2}{R}: 3 manas, não 4');
});
