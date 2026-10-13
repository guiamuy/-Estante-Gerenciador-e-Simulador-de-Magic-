// T-68 · CR5 · Face para baixo completa (Comprehensive Rules 708): entrar e virar sem gatilho de entrada (708.3, 708.8), os efeitos que já
// valiam continuam (708.8), cópia de virada para baixo (708.10), "ao ser virada para cima" na megamorfose (708.11) e o registro da partida
// que não revela a permanente virada para baixo (708.2, 708.5; revelada ao sair do campo, 708.9). Texto da regra: .regras/cr-2026-09-25.txt.
// As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S as SC, T, J, act, poe, legais, passaAte } from './listas.mjs';

const C = {};
for (const [n, k] of Object.entries({ Forest: 'G', Island: 'U' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'creature' }], ...EX },
  'Entra Vida': { name: 'Entra Vida', self: { disfarce: '{1}' }, abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'gain', amount: 3 }] }], ...EX },
  'Manifesta': { name: 'Manifesta', effects: [{ do: 'manifest' }], ...EX },
  'Cresce': { name: 'Cresce', effects: [{ do: 'continuo', target: 'creature', poder: 1, resistencia: 1 }], ...EX },
  'Mega': { name: 'Mega', morph: { mana: '{1}', mega: true }, abilities: [{ kind: 'triggered', when: 'turned-face-up', effects: [{ do: 'gain', amount: { per: 'power-of-source' } }] }], ...EX },
};
carta('Choque', 'Instant'); carta('Manifesta', 'Sorcery'); carta('Cresce', 'Instant');
carta('Entra Vida', 'Creature — Human', { power: '4', toughness: '4', mana_cost: '{4}', cmc: 4, keywords: ['Disguise'] });
carta('Mega', 'Creature — Beast', { power: '3', toughness: '3', mana_cost: '{4}', cmc: 4, keywords: ['Megamorph'] });
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
function mesa(seed = 1) {
  const deck = [...Object.keys(SCRIPTS).map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Urso', qty: 3, zone: 'main' }, { name: 'Forest', qty: 12, zone: 'main' }, { name: 'Island', qty: 10, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
const viradaBaixo = (s, nome) => { let g; [s, g] = poe(s, 0, nome, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === g && x.faceDown)[0]; assert.ok(a, 'virada para baixo ' + nome); return [esvazia(act(s, a)), g]; };

test('CR 708.3 / 708.4 · conjurada virada para baixo (disfarce) ou manifestada: o gatilho de entrada não dispara', () => {
  let s = mesa(); const v = s.players[0].life; let g; [s, g] = viradaBaixo(s, 'Entra Vida');
  eq([s.objects[g].faceDown, s.players[0].life - v], [true, 0]);
  let t = mesa(); let e; [t, e] = poe(t, 0, 'Entra Vida', 'hand'); t = J(t); const z = t.zones[0]; z.hand.splice(z.hand.indexOf(e), 1); z.library.unshift(e); t.objects[e].zone = 'library';
  const v2 = t.players[0].life; let m; [t, m] = poe(t, 0, 'Manifesta', 'hand'); t = mana(t); t = esvazia(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === m)[0]));
  eq([t.objects[e].zone, !!t.objects[e].faceDown, t.players[0].life - v2], ['battlefield', true, 0]);
});

test('CR 708.8 · virada para cima: volta aos valores dela sem gatilho de entrada; o +1/+1 até o fim do turno, os marcadores e o dano continuam', () => {
  let s = mesa(); let g; [s, g] = viradaBaixo(s, 'Entra Vida'); const v = s.players[0].life;
  let c; [s, c] = poe(s, 0, 'Cresce', 'hand'); s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c && a.targets[0].oid === g)[0]));
  s = J(s); s.objects[g].counters = { p1p1: 1 }; s.objects[g].damage = 1;
  eq(pt(s, g), [4, 4], '2/2, +1/+1 do efeito e +1/+1 do marcador');
  s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'unmorph' && a.oid === g)[0]));
  eq([!!s.objects[g].faceDown, pt(s, g), s.objects[g].damage, s.players[0].life - v], [false, [6, 6], 1, 0]);
});

test('CR 708.10 · a virada para baixo que vira cópia continua 2/2 sem tipo de criatura; e só vira para cima se o que ela copiou tiver o custo para isso (702.37e)', () => {
  let s = mesa(); let g; [s, g] = viradaBaixo(s, 'Entra Vida'); let u; [s, u] = poe(s, 0, 'Urso', 'battlefield');
  s = J(s); const src = { oid: 'h', name: 'Molde', controller: 0, ability: true };
  E.applyEffect(s, src, { do: 'escolhe_copiadora', target: 'creature' }, { oid: g }, []); E.applyEffect(s, src, { do: 'torna_copia', target: 'creature', ate: 'fim-do-turno' }, { oid: u }, []);
  eq([!!s.objects[g].faceDown, pt(s, g), E.tiposDe(s, s.objects[g])], [true, [2, 2], ['creature']]);
  s = mana(s); eq(legais(s, 0, x => x.t === 'unmorph' && x.oid === g).length, 0, 'o Urso não tem disfarce');
});

test('CR 708.11 · megamorfose: o marcador +1/+1 entra enquanto ela vira — o gatilho "quando é virada para cima" já vê poder 4', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, 'Mega', 'hand'); s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g && a.faceDown)[0]));
  const v = s.players[0].life; s = mana(s);
  s = esvazia(act(s, legais(s, 0, x => x.t === 'unmorph' && x.oid === g)[0]));
  eq([s.players[0].life - v, pt(s, g)], [4, [4, 4]]);
});

test('CR 708.2 / 708.5 / 708.9 · o registro não revela a virada para baixo (alvo, dano, ataque); quando ela sai do campo, o nome aparece', () => {
  let s = mesa(); let g; [s, g] = viradaBaixo(s, 'Entra Vida');
  let c; [s, c] = poe(s, 0, 'Choque', 'hand'); s = mana(s);
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets[0].oid === g)[0];
  const r0 = E.apply(s, a); const L0 = T.describe(s, a, r0.events, r0.state).join(' | ');
  assert.match(L0, /alvo: uma criatura virada para baixo/, L0); assert.doesNotMatch(L0, /Entra Vida/, L0);
  const r1 = E.apply(r0.state, { t: 'pass', p: 0 }); const r2 = E.apply(r1.state, { t: 'pass', p: 1 });
  const L = T.describe(r1.state, { t: 'pass', p: 1 }, r2.events, r2.state).join(' | ');
  assert.match(L, /causou 2 de dano a uma criatura virada para baixo/, L);
  assert.match(L, /Entra Vida morreu/, '708.9: ao sair do campo ela é revelada — ' + L);
  let t = mesa(); let h; [t, h] = viradaBaixo(t, 'Entra Vida'); t = J(t); t.objects[h].sick = false;
  t = passaAte(t, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  const at = { t: 'attack', p: 0, attackers: [h] }; const ra = E.apply(t, at);
  const La = T.describe(t, at, ra.events, ra.state).join(' | '); assert.doesNotMatch(La, /Entra Vida/, La);
});

/* ---------------- T-71 · correções da auditoria independente (T-68): nenhuma linha revela quem continua virada ---------------- */
Object.assign(SCRIPTS, {
  'Anula Criatura': { name: 'Anula Criatura', effects: [{ do: 'counter', target: 'creature-spell' }], ...EX },
  'Caca': { name: 'Caca', effects: [{ do: 'lutador', target: 'creature-you-control' }, { do: 'fight', quem: 'primeiro-alvo', target: 'creature-opponent-controls' }], ...EX },
  'Murcha': { name: 'Murcha', effects: [{ do: 'counters', amount: 1, tipo: 'm1m1', target: 'creature' }], ...EX },
});
for (const n of ['Anula Criatura', 'Caca', 'Murcha']) carta(n, 'Instant');
const registra = (s, a) => { const r = E.apply(s, a); return [r.state, T.describe(s, a, r.events, r.state)]; };
const resolveRegistrando = s => { const L = []; for (let i = 0; i < 40 && s.stack.length && !s.pending; i++) { let l; [s, l] = registra(s, { t: 'pass', p: s.turn.priority }); L.push(...l); } return [s, L]; };
const deB = (s, nome, f) => { let c; [s, c] = poe(s, 1, nome, 'hand'); s = mana(s, 1); s = J(s); s.turn.priority = 1; return [s, legais(s, 1, x => x.t === 'cast' && x.oid === c && f(x))[0]]; };
const naoDiz = (L, ...nomes) => { const t = L.join(' | '); for (const n of nomes) assert.doesNotMatch(t, new RegExp(n), t); };

test('CR 708.2 · luta, marcador -1/-1 e salvaguarda {2} com a virada para baixo que continua no campo: nenhuma linha (nem a decisão de pagar) diz o nome', () => {
  let s = mesa(); let g; [s, g] = viradaBaixo(s, 'Entra Vida'); let u; [s, u] = poe(s, 1, 'Urso', 'battlefield'); s = J(s); s.objects[g].counters = { p1p1: 2 };
  let c; [s, c] = poe(s, 0, 'Caca', 'hand'); s = mana(s);
  let L0; [s, L0] = registra(s, legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets[0].oid === g && x.targets[1].oid === u)[0]);
  let L1; [s, L1] = resolveRegistrando(s);
  eq([s.objects[g].zone, !!s.objects[g].faceDown], ['battlefield', true]); naoDiz([...L0, ...L1], 'Entra Vida');
  let a; [s, a] = deB(s, 'Murcha', x => x.targets[0].oid === g); let L2; [s, L2] = registra(s, a);
  if (s.pending) { const j = s.pending; assert.doesNotMatch(JSON.stringify(j), /Entra Vida/, 'a salvaguarda pendente não leva o nome'); }
  naoDiz(L2, 'Entra Vida');
});

test('CR 708.4 · a mágica virada para baixo na pilha: "alvo:" de quem a anula não diz o nome; a pilha explicada mostra "Criatura virada para baixo", sem imagem', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, 'Entra Vida', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === g && x.faceDown)[0]);
  const p = T.explicaPilha(s); const it = p.itens.find(x => x.oid === g);
  eq([it.nome, it.imagemDe], ['Criatura virada para baixo', null]); assert.doesNotMatch(JSON.stringify(p), /Entra Vida/);
  let a; [s, a] = deB(s, 'Anula Criatura', x => x.targets[0].oid === g);
  const [, L] = registra(s, a); naoDiz(L, 'Entra Vida'); assert.match(L.join(' | '), /alvo: uma criatura virada para baixo/);
});

test('CR 708.9 · quem sai do campo é revelada: na luta em que a virada morre, o registro diz o nome dela', () => {
  let s = mesa(); let g; [s, g] = viradaBaixo(s, 'Entra Vida'); let u; [s, u] = poe(s, 1, 'Urso', 'battlefield');
  let c; [s, c] = poe(s, 0, 'Caca', 'hand'); s = mana(s);
  let L0; [s, L0] = registra(s, legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets[0].oid === g && x.targets[1].oid === u)[0]);
  let L1; [s, L1] = resolveRegistrando(s);
  eq(s.objects[g].zone, 'graveyard'); assert.match([...L0, ...L1].join(' | '), /Entra Vida morreu/);
});
