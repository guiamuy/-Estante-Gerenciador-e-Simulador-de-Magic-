// LT1 · Leitor de texto: o motor monta o script de uma carta a partir do texto oficial, frase a frase. Fidelidade antes de cobertura:
// toda carta que o leitor diz ter lido por inteiro precisa dar exatamente o script escrito à mão (e conferido) para ela; frase sem padrão
// fica "não lida" e a carta não sai completa. O piso de cartas lidas só sobe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const CARTAS = [...JSON.parse(readFileSync(new URL('./.listas/oficiais.json', import.meta.url), 'utf8')).cartas, ...JSON.parse(readFileSync(new URL('./.listas/oficiais-commander.json', import.meta.url), 'utf8')).cartas, ...JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas]; // M-305 · também as cartas dos alicerces
// o que conta para a regra: efeitos (com os campos que o motor lê), modos e as palavras-chave com custo do topo; rótulos não contam
const CAMPOS = ['do', 'amount', 'power', 'toughness', 'target', 'unless', 'token', 'targetNotLegendary', 'targetNotColor', 'optional', 'filter', 'to', 'ate', 'anyColor', 'exceptSubtype', 'types', 'nontoken', 'semRegenerar', 'targetNotLand', 'targetMv', 'targetMvMax', 'targetTypes', 'symbols', 'jogadores', 'keyword', 'tipo']; // LT13 · alvos com restrição e mana de símbolos fixos // LT5 · M-304: duração de mudança de zona · busca: filtro, destino e "pode"
const TOPO = ['omen', 'back' /* M-531 · o leitor passou a ler a face de trás da Aventura (Brazen Borrower): comparada com Bonecrusher Giant e Pegasus Guardian */, 'plot' /* M-524 · o leitor passou a ler "Plot {custo}" (Slickshot Show-Off): o tramar também é comparado (Highway Robbery) */, 'unearth' /* M-516 · o leitor passou a ler Priest of Fell Rites (reanimar) e o desenterrar da linha impressa: o desenterrar também é comparado, em vez de contar como regra a mais */, 'entra' /* M-402 · correção do portão: com a M-394 o leitor passou a ler "This land enters tapped with …" (Saprazzan Skerry); a entrada modificada também é comparada */, 'flashback', 'madness', 'cycling', 'storm', 'delve', 'transmute', 'escape', 'additional', 'affinity', 'aura', 'equip', 'grants', 'grantsAll', 'self', 'entersTapped', 'ninjutsu', 'produces', 'entersTappedUnless', 'kicker', 'splice', 'reduzPor', 'alt']; // M-338 · custo alternativo (sem comparar o rótulo da mesa) · M-337 · o leitor passou a ler reforço, encaixar (M-334) e redução por contagem (M-333)
// `self.keywords` repete a linha de palavras-chave impressa (o motor já a lê da carta): não é regra a mais
const SO_REPETE = (h, c) => Object.keys(h).every(k => k !== 'self' || (Object.keys(h.self).join() === 'keywords' && h.self.keywords.every(k2 => new RegExp('\\b' + k2 + '\\b', 'i').test(c.oracle_text || ''))));
// texto oficial incompleto no acervo (falta a face Omen do Sagu Wildling em .listas/oficiais.json): o leitor não tem como ver; registrado como pendência de dados
// M-322 · o texto guardado do Sagu Wildling já traz a face Omen (`verso`) e o leitor agora a vê: a carta deixou de contar como lida (ela não era — a face não é lida)
const TEXTO_INCOMPLETO = {};
const ordena = v => Array.isArray(v) ? v.map(ordena) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordena(v[k])])) : v;
// M-324 · "cada oponente/cada jogador" escrito como alvo antigo (each-opponent) ou como quantificador (jogadores) é o mesmo para o motor (SC.jogadoresDe)
const comoJogadores = e => { const q = S.jogadoresDe(e); if (!q || e.jogadores) return e; const { target, ...resto } = e; return { ...resto, jogadores: q }; };
const efs = l => (l || []).map(comoJogadores).map(e => Object.fromEntries(CAMPOS.filter(k => e[k] != null).map(k => [k, e[k]])));
// "you may <efeito único>": à mão às vezes está no efeito (search optional), no leitor fica na habilidade; para o motor é a mesma pergunta — normaliza para a habilidade
const abs = l => (l || []).map(a => { const es = efs(a.effects); const opt = !!a.optional || (es.length === 1 && !!es[0].optional); if (es.length === 1) delete es[0].optional; return { kind: a.kind, when: a.when, optional: opt, cost: a.cost || null, sorceryOnly: !!a.sorceryOnly, filter: a.filter || null, anyController: !!a.anyController, condition: a.condition || null, alvoDe: a.alvoDe || null, alvoDoControlador: !!a.alvoDoControlador, primeiraVezNoTurno: !!a.primeiraVezNoTurno, effects: es }; }); // LT10 · M-322: filtros de "se torna alvo" · LT10 · filtro, "de qualquer jogador" e condição do gatilho também contam
// `produces` só conta quando o script à mão o declara (o motor lê a mana do texto da carta; o leitor também anota, por completude)
const limpaSelf = sc => sc.self && Object.keys(sc.self).some(k => k !== 'keywords') ? Object.fromEntries(Object.entries(sc.self).filter(([k]) => k !== 'keywords')) : undefined;
const efeitos = (sc, ref) => JSON.stringify(ordena({ self: limpaSelf(sc), effects: efs(sc.effects), modes: (sc.modes || []).map(m => efs(m.effects)), abilities: abs(sc.abilities), ...Object.fromEntries(TOPO.filter(k => k !== 'self' && sc[k] != null && sc[k] !== false && (k !== 'produces' || (ref || sc).produces != null)).map(k => [k, k === 'alt' ? sc.alt.map(({ label, ...resto }) => resto) : sc[k]])) }));
const SO_EFEITOS = ['name', 'effects', 'modes', 'abilities', 'example', 'covers', 'note', ...TOPO];

test('LT1 · concordância (piso M-325: 157): toda carta lida por inteiro dá o mesmo script escrito à mão (nenhuma divergência)', () => {
  const lidas = [], divergentes = [];
  for (const c of CARTAS) {
    const r = L.ler(c); if (!r.completa) continue;
    const h = S.SCRIPTS[c.name];
    lidas.push(c.name);
    if (!h && !r.script) continue; // permanente que o motor joga pelos dados da carta (palavras-chave, mana): nada a comparar
    // só mana e palavras-chave impressas: o motor lê da carta e a cobertura nem consulta o leitor (SC.leitura devolve null) — Sol Ring, "{T}: Add {C}{C}"
    if (!h && Object.keys(r.script).every(k => k === 'name' || k === 'produces' || (k === 'self' && Object.keys(r.script.self).every(k2 => k2 === 'keywords')))) continue;
    if (!h) { divergentes.push(`${c.name}: sem script à mão para comparar`); continue; }
    if (TEXTO_INCOMPLETO[c.name]) continue;
    const aMais = Object.keys(h).filter(k => !SO_EFEITOS.includes(k) && !(k === 'self' && SO_REPETE(h, c)));
    if (aMais.length) divergentes.push(`${c.name}: o script à mão tem ${aMais.join(', ')} e o leitor disse que leu tudo`);
    else if (!r.script) { if (!SO_REPETE(h, c) || Object.keys(h).some(k => !['name', 'self', 'example'].includes(k))) divergentes.push(`${c.name}: o leitor não montou script, mas há um à mão`); }
    else if (efeitos(h, h) !== efeitos(r.script, h)) divergentes.push(`${c.name}: leitor ${efeitos(r.script, h)} × à mão ${efeitos(h, h)}`);
  }
  assert.deepEqual(divergentes, []);
  // M-322 · expectativa ajustada com justificativa: 140 → 139. O Sagu Wildling contava como lido sem a face Omen (texto incompleto no acervo);
  // com o verso no texto guardado, o leitor vê a segunda face, não a lê, e a carta deixa de contar. Nenhuma carta lida de verdade saiu.
  assert.ok(lidas.length >= 157, // M-323 · Heartfire Hero · M-324: 153 · M-325: 157 (vencer/perder)
     'cartas lidas por inteiro: ' + lidas.length + ' (' + lidas.join(', ') + ')');
});

test('LT1 · fidelidade: frase sem padrão fica não lida, com o texto dela, e a carta não sai completa; permanente ainda não é lida', () => {
  const r = L.ler({ name: 'Teste', type_line: 'Instant', oracle_text: 'Draw two cards. Then the moon turns purple.' });
  assert.equal(r.completa, false);
  assert.deepEqual(Array.from(r.frases, f => [f.texto, f.lida]), [['Draw two cards', true], ['Then the moon turns purple', false]]);
  const p = L.ler({ name: 'Ursa', type_line: 'Creature — Bear', oracle_text: 'When this creature enters, draw a card.' });
  assert.equal(p.completa, true, 'LT3: gatilho de entrada lido'); assert.deepEqual(JSON.parse(JSON.stringify(p.script.abilities)), [{ kind: 'triggered', when: 'etb', effects: [{ do: 'draw', amount: 1 }] }]);
  const q = L.ler({ name: 'Ursa', type_line: 'Creature — Bear', oracle_text: 'When this creature enters, draw a card. {2}: Ursa gains flying until end of turn.' });
  assert.equal(q.completa, false, 'frase da ativada fora do vocabulário (ganha voar) fica não lida');
  const a = L.ler({ name: 'Pinga', type_line: 'Creature — Wizard', oracle_text: '{1}, {T}, Sacrifice this creature: Pinga deals 1 damage to any target.' });
  assert.deepEqual(JSON.parse(JSON.stringify(a.script.abilities)), [{ kind: 'activated', cost: { mana: '{1}', tap: true, sacrifice: true }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }], 'LT4: ativada com mana, {T} e sacrifício');
  // LT9 · custo com símbolos de mana seguidos e fichas predefinidas (111.10)
  const st = L.ler({ name: 'Coruja', type_line: 'Creature — Bird', oracle_text: '{2}{U}: Draw a card, then discard a card.' });
  assert.equal(st.completa, true, '{2}{U} seguidos');
  const bl = L.ler({ name: 'Sangue', type_line: 'Sorcery', oracle_text: 'Create two Blood tokens.' });
  assert.equal(bl.completa, true); assert.equal(bl.script.effects[0].token.name, 'Blood'); assert.equal(bl.script.effects[0].amount, 2);
  assert.equal(L.ler({ name: 'Ouro', type_line: 'Sorcery', oracle_text: 'Create a Gold token.' }).completa, false, 'ficha predefinida que o leitor não conhece: não lida');
  const k = L.ler({ name: 'Voadora', type_line: 'Creature — Bird', oracle_text: 'Flying, vigilance' });
  assert.equal(k.frases[0].lida, true, 'linha só de palavras-chave conhecidas: o motor já lê');
  // LT5 · busca (701.23): qualidade, destino e "then shuffle"; qualidade fora do vocabulário fica não lida
  const b = L.ler({ name: 'Mapa', type_line: 'Sorcery', oracle_text: 'Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.' });
  assert.equal(b.completa, true); assert.deepEqual(JSON.parse(JSON.stringify(b.script.effects)), [{ do: 'search', amount: 1, filter: { basic: true, types: ['land'] }, to: 'battlefield-tapped' }]);
  const b2 = L.ler({ name: 'Mapa', type_line: 'Sorcery', oracle_text: 'Search your library for a card with mana value 3, reveal it, put it into your hand, then shuffle.' });
  assert.equal(b2.completa, false, 'qualidade "mana value 3" não cabe no filtro do motor: não lida');
  const b3 = L.ler({ name: 'Tutor', type_line: 'Instant', oracle_text: 'Search your library for an instant or sorcery card, reveal it, then shuffle and put that card on top.' });
  assert.deepEqual(JSON.parse(JSON.stringify(b3.script.effects)), [{ do: 'search', amount: 1, filter: { types: ['instant', 'sorcery'] }, to: 'library-top', revela: true }], 'LT5: "shuffle and put that card on top" vai ao topo do grimório; M-351: "reveal it" mostra a carta achada (701.20a; achado da revisão do lote XXIII)');
  const l5 = L.ler({ name: 'Terra', type_line: 'Land', oracle_text: '{T}: Add {C}.\nCycling {R}{G}{W}' });
  // LT13 · terreno de dor: a cobertura por texto ainda trata a linha como mana; lida pelo leitor, a carta sem script à mão deixaria de jogar (decisão 11)
  // M-331 · metalurgia, "cast from a graveyard … instead", P+T no alvo, lampejo que sacrifica
  const gb = L.ler({ name: 'Raio', type_line: 'Instant', oracle_text: 'Raio deals 2 damage to any target.\nMetalcraft — Raio deals 4 damage instead if you control three or more artifacts.' });
  assert.deepEqual(JSON.parse(JSON.stringify(gb.script.effects[0].amount)), { per: 'se', se: 'metalcraft', sim: 4, nao: 2 });
  const ds = L.ler({ name: 'Envio', type_line: 'Instant', oracle_text: 'Tap target creature.\nMetalcraft — If you control three or more artifacts, exile that creature.' });
  assert.deepEqual(JSON.parse(JSON.stringify(ds.script.effects[1])), { do: 'exile', target: 'first-target', onlyIf: 'metalcraft' });
  assert.equal(L.ler({ name: 'Corte', type_line: 'Instant', oracle_text: 'Destroy target creature with total power and toughness 5 or less.' }).script.effects[0].targetPTTotalMax, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(L.ler({ name: 'Dardo', type_line: 'Instant', oracle_text: 'Dardo deals 1 damage to any target.\nFlashback—Sacrifice a Mountain.' }).script.flashback)), { sacrificeOther: { types: ['land'], subtype: 'Mountain' } });
  // M-330 · terra de choque
  assert.deepEqual(JSON.parse(JSON.stringify(L.ler({ name: 'Vapor', type_line: 'Land — Island Mountain', oracle_text: "({T}: Add {U} or {R}.)\nAs Vapor enters, you may pay 2 life. If you don't, it enters tapped." }).script)), { name: 'Vapor', entersTappedUnless: { pagaVida: 2 } });
  // M-329 · "Pay N life" no custo de ativação (fetchlands)
  assert.deepEqual(JSON.parse(JSON.stringify(L.ler({ name: 'Busca', type_line: 'Land', oracle_text: '{T}, Pay 1 life, Sacrifice Busca: Search your library for an Island or Swamp card, put it onto the battlefield, then shuffle.' }).script.abilities[0].cost)), { tap: true, life: 1, sacrifice: true });
  // M-328 · tipociclar, custo alternativo de vida/sacrifício e gatilhos de conjurar
  assert.deepEqual(JSON.parse(JSON.stringify(L.ler({ name: 'Lorien', type_line: 'Sorcery', oracle_text: 'Draw three cards.\nIslandcycling {1}' }).script.cycling)), { mana: '{1}', busca: { subtypes: ['Island'] } });
  assert.deepEqual(JSON.parse(JSON.stringify(L.ler({ name: 'Cinza', type_line: 'Land', oracle_text: '{T}: Add {C}.\nBasic landcycling {1}' }).script.cycling)), { mana: '{1}', busca: { basic: true, types: ['land'] } });
  const fb = L.ler({ name: 'Rajada', type_line: 'Instant', oracle_text: 'You may sacrifice two Mountains rather than pay this spell\'s mana cost.\nRajada deals 4 damage to any target.' });
  assert.deepEqual(JSON.parse(JSON.stringify(fb.script.alt[0].cost)), { sacrificeOther: { types: ['land'], subtype: 'Mountain', amount: 2 } });
  const gs = L.ler({ name: 'Gato', type_line: 'Creature — Goblin', oracle_text: 'Whenever you cast an instant or sorcery spell, Gato deals 2 damage to each opponent.' });
  assert.deepEqual(JSON.parse(JSON.stringify(gs.script.abilities[0].filter)), { anyTypes: ['instant', 'sorcery'] });
  // M-324 · "outra criatura sua entra" leva o filtro de criatura (antes saía sem filtro: qualquer permanente dispararia); "ela ou outra sua morre" são dois gatilhos
  const ok = L.ler({ name: 'Cavaleiro', type_line: 'Creature — Knight', oracle_text: 'Whenever another creature enters the battlefield under your control, you gain 1 life.' });
  assert.deepEqual(JSON.parse(JSON.stringify(ok.script.abilities[0].filter)), { types: ['creature'] }, 'M-324: filtro de criatura');
  const zu = L.ler({ name: 'Zulu', type_line: 'Creature — Human', oracle_text: 'Whenever this creature or another creature you control dies, you gain 1 life.' });
  assert.deepEqual(Array.from(zu.script.abilities, a => a.when), ['other-dies', 'dies'], 'M-324: ela ou outra sua morre');
  const vt = L.ler({ name: 'Cofre', type_line: 'Land', oracle_text: '{2}{W}{B}, {T}: Creatures you control gain deathtouch and lifelink until end of turn.' });
  assert.deepEqual(Array.from(vt.script.abilities[0].effects, e => e.keyword), ['deathtouch', 'lifelink']);
  assert.equal(L.ler({ name: 'Cofre', type_line: 'Land', oracle_text: '{T}: Creatures you control gain moonglow until end of turn.' }).completa, false, 'palavra-chave fora do vocabulário: não lida');
  // M-322 · "se torna alvo" (valente) e segunda face: o leitor para em "//" e a carta não sai completa
  const va = L.ler({ name: 'Herói', type_line: 'Creature — Mouse', oracle_text: 'Valiant — Whenever Herói becomes the target of a spell or ability you control for the first time each turn, put a +1/+1 counter on it.' });
  assert.deepEqual(JSON.parse(JSON.stringify(va.script.abilities)), [{ kind: 'triggered', when: 'becomes-target', alvoDoControlador: true, primeiraVezNoTurno: true, effects: [{ do: 'counters', amount: 1, target: 'self-source' }] }], 'M-322: valente');
  const av = L.ler({ name: 'Gigante', type_line: 'Creature — Giant', oracle_text: 'Whenever Gigante becomes the target of a spell, Gigante deals 2 damage to that spell\'s controller.\n//\nDamage can\'t be prevented this turn. Stomp deals 2 damage to any target.' });
  assert.equal(av.completa, false, 'M-322: a Aventura (depois de "//") não é lida'); assert.equal(av.frases.at(-1).texto, '//');
  assert.equal(L.ler({ name: 'Dor', type_line: 'Land', oracle_text: '{T}: Add {C}.\n{T}: Add {W} or {B}. This land deals 1 damage to you.' }).completa, false, 'LT13: dor fica não lida');
  const fi = L.ler({ name: 'Fichas', type_line: 'Sorcery', oracle_text: 'Create two 1/1 red Goblin creature tokens.' });
  assert.equal(fi.completa, true, 'LT13: "Create" com maiúscula'); assert.equal(fi.script.effects[0].amount, 2);
  const sig = L.ler({ name: 'Sinete', type_line: 'Artifact', oracle_text: '{1}, {T}: Add {U}{R}.' });
  assert.deepEqual(JSON.parse(JSON.stringify(sig.script.abilities)), [{ kind: 'activated', cost: { mana: '{1}', tap: true }, effects: [{ do: 'add_mana', symbols: ['U', 'R'] }] }], 'LT13: mana de símbolos fixos com custo');
  const so = L.ler({ name: 'Rato', type_line: 'Creature — Rat', oracle_text: '{X}: Rato deals X damage to each creature and each player. Spend only black mana on X.' });
  assert.equal(so.completa, true); assert.equal(so.script.abilities[0].cost.xCor, 'B', 'LT13: "Spend only black mana on X" (CR2c.7)');
  const so2 = L.ler({ name: 'Rato', type_line: 'Creature — Rat', oracle_text: '{2}: Rato deals 1 damage to each creature. Spend only black mana on X.' });
  assert.equal(so2.completa, false, 'sem {X} no custo, a frase do X não se lê');
  assert.equal(l5.completa, true, 'LT5: reciclagem em terreno'); assert.deepEqual(JSON.parse(JSON.stringify(l5.script.cycling)), { mana: '{R}{G}{W}' });
});

test('LT1 · o que o leitor monta passa no validador e usa só o vocabulário do motor; o nome da carta no texto vira a própria carta', () => {
  const r = L.ler({ name: 'Choque Teste', type_line: 'Instant', oracle_text: 'Choque Teste deals 2 damage to any target.' });
  assert.equal(r.completa, true);
  assert.deepEqual(JSON.parse(JSON.stringify(r.script.effects)), [{ do: 'damage', amount: 2, target: 'any' }]);
  const v = L.ler({ name: 'Varios', type_line: 'Sorcery', oracle_text: 'Scry 2, then draw a card.' });
  assert.deepEqual(JSON.parse(JSON.stringify(v.script.effects)), [{ do: 'scry', amount: 2 }, { do: 'draw', amount: 1 }]);
  const x = L.ler({ name: 'Alvo Estranho', type_line: 'Instant', oracle_text: 'Destroy target creature with flying.' });
  assert.equal(x.completa, false, 'alvo fora do vocabulário: não lida, em vez de aproximar para "criatura"');
});
