// CR2d.13 · os três erros restantes da auditoria independente das camadas e da cópia (11/10/2026): cada "até o seu próximo turno" tem o seu
// dono (611.2a); cópia e controle com "até o seu próximo turno" ou "até o fim do seu próximo turno" acabam no prazo (611.2a); a exceção da
// cópia faz parte dos valores copiáveis (707.9b, 707.3). Cada teste falha no motor v103.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, tudo, passaAte } from './cmd.mjs';

const efeito = (s, alvo, eff, ctrl = 0) => { s = J(s); E.applyEffect(s, { oid: 'efeito', name: 'Teste', controller: ctrl }, { do: 'continuo', target: 'creature', ...eff }, { oid: alvo }, []); return s; };
const pt = (s, o) => { const st = E.stats(s, s.objects[o]); return [st.power, st.toughness].join('/'); };

test('CR 611.2 · dois "até o seu próximo turno" de jogadores diferentes: no turno de B acaba só o de B (antes se fundiam com o dono do último)', () => {
  let s = mesa(['Thraben Inspector'], []), ins; [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = efeito(s, ins, { poder: 2, resistencia: 2, ate: 'seu-proximo-turno' }, 0);
  s = efeito(s, ins, { poder: 1, resistencia: 1, ate: 'seu-proximo-turno' }, 1);
  assert.equal(pt(s, ins), '4/5');
  const x = passaAte(s, y => y.turn.active === 1 && y.turn.step === 'main1');
  assert.equal(pt(x, ins), '3/4', 'o +2/+2 de A continua até o turno de A');
  let k = efeito(s, ins, { palavras: ['flying'], ate: 'seu-proximo-turno' }, 0); k = efeito(k, ins, { palavras: ['trample'], ate: 'seu-proximo-turno' }, 1);
  const kx = passaAte(k, y => y.turn.active === 1 && y.turn.step === 'main1');
  assert.equal(E.hasKeyword(kx, kx.objects[ins], 'flying'), true, 'o voar dado por A continua');
  assert.equal(E.hasKeyword(kx, kx.objects[ins], 'trample'), false, 'o atropelar dado por B acabou');
  const ka = passaAte(kx, y => y.turn.active === 0 && y.turn.step === 'main1');
  assert.equal(E.hasKeyword(ka, ka.objects[ins], 'flying'), false, 'no turno de A, o de A acaba');
});

test('CR 611.2 · cópia "até o seu próximo turno" e "até o fim do seu próximo turno" acaba no prazo (antes ficava para sempre)', () => {
  for (const ate of ['seu-proximo-turno', 'fim-do-seu-proximo-turno']) {
    let s = mesa(['Sol Ring', 'Thraben Inspector'], []), ring, ins;
    [s, ring] = poe(s, 0, 'Sol Ring'); [s, ins] = poe(s, 0, 'Thraben Inspector');
    s = J(s); const src = { oid: 'h', name: 'Teste', controller: 0, ability: true };
    E.applyEffect(s, src, { do: 'escolhe_copiadora', target: 'artifact' }, { oid: ring }, []); E.applyEffect(s, src, { do: 'torna_copia', target: 'creature', ate }, { oid: ins }, []);
    assert.equal(s.objects[ring].name, 'Thraben Inspector');
    let x = passaAte(s, y => y.turn.active === 1 && y.turn.step === 'main1');
    assert.equal(x.objects[ring].name, 'Thraben Inspector', `${ate}: no turno do oponente ainda é cópia`);
    x = passaAte(x, y => y.turn.active === 0 && y.turn.step === 'main1');
    if (ate === 'fim-do-seu-proximo-turno') { assert.equal(x.objects[ring].name, 'Thraben Inspector', 'no seu próximo turno ainda é cópia'); x = passaAte(x, y => y.turn.active === 1 && y.turn.step === 'main1'); }
    assert.equal(x.objects[ring].name, 'Sol Ring', `${ate}: depois do prazo volta a ser Sol Ring`);
  }
});

test('CR 611.2 · controle "até o fim do seu próximo turno" volta ao dono na limpeza do próximo turno de quem ganhou (antes nunca voltava)', () => {
  let s = mesa([], ['Faerie Seer']), seer; [s, seer] = poe(s, 1, 'Faerie Seer');
  s = J(s); E.applyEffect(s, { oid: 'h', name: 'Teste', controller: 0, ability: true }, { do: 'ganhar_controle', target: 'creature', ate: 'fim-do-seu-proximo-turno' }, { oid: seer }, []);
  let x = passaAte(s, y => y.turn.active === 1 && y.turn.step === 'main1'); assert.equal(x.objects[seer].controller, 0);
  x = passaAte(x, y => y.turn.active === 0 && y.turn.step === 'main1'); assert.equal(x.objects[seer].controller, 0, 'no próximo turno de A ainda é de A');
  x = passaAte(x, y => y.turn.active === 1 && y.turn.step === 'main1'); assert.equal(x.objects[seer].controller, 1, 'volta a B');
});

test('CR 707.9 · a exceção da cópia é copiável: a ficha que copia o Sol Ring "cópia do Inspector, além de artefato" também é artefato', () => {
  let s = mesa(['Saheeli, Sublime Artificer', 'Sol Ring', 'Thraben Inspector'], []), sa, ring, ins;
  [s, sa] = poe(s, 0, 'Saheeli, Sublime Artificer', 'battlefield', { counters: { loyalty: 5 } }); [s, ring] = poe(s, 0, 'Sol Ring'); [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === sa && (x.targets || []).length === 2 && x.targets[0].oid === ring && x.targets[1].oid === ins)[0]));
  assert.equal(E.linhaDeTipo(s, s.objects[ring]), 'Artifact Creature — Human Soldier', 'na ordem da linha de tipo');
  const x = J(s); E.applyEffect(x, { oid: 'h', name: 'Teste', controller: 0, ability: true }, { do: 'ficha_copia', target: 'artifact' }, { oid: ring }, []);
  const f = Object.values(x.objects).find(o => o.token && o.name === 'Thraben Inspector');
  assert.ok(f && /Artifact/.test(E.linhaDeTipo(x, f)), 'a ficha herda o "além de artefato"');
});
