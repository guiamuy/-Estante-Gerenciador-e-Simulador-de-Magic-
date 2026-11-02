// B-188 · B25 fase 0 · BATERIA PROFISSIONAL do Shark: posições montadas com as cinco listas do Shark, cada uma com a jogada
// que um profissional faz e o porquê. A nota (acertos ÷ posições) é a terceira régua da B25 (alvo ≥ 85%). Posição que o Shark
// erra hoje fica aqui de propósito: é a fila de trabalho. Fora do portão como medida; o `bot.bateria.unit.test.mjs` confere que
// cada posição é montável, que a jogada certa é legal e que a nota não cai abaixo do piso.
// Uso: node bot.bateria.mjs [nivel=shark] [nivel2 …]   — imprime a nota por classe e as posições erradas.
// Só decisões de jogo, nunca texto de carta: as cartas vêm das listas do Shark (texto oficial em `.listas/`).
import { loadModules } from './_load.mjs';
import { listasDoShark } from './torneio.listas.mjs';

const { engine: E, bot: B } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const act = (s, a) => E.apply(s, a).state;
const MADNESS = 0, CONTROLE = 1, FAERIES = 2, TERROR = 3, ELFOS = 4; // índices em LISTAS_DO_SHARK

function jogo(a, b, seed = 9) {
  const L = listasDoShark(), d0 = L[a], d1 = L[b];
  const cards = {}; for (const e of [...d0.entries, ...d1.entries]) cards[e.name] = d0.cartas[e.name] || d1.cartas[e.name];
  return E.createGame({ format: 'pauper', seed, mode: 'full', manaCheck: true, cards, players: [{ name: 'P0', deck: d0.entries }, { name: 'P1', deck: d1.entries }] });
}
/** Posição com duas listas do Shark (o Shark é sempre o jogador 0). `cfg`: { ativo, vez, passo, terreno (o ativo ainda pode baixar
    terreno), p0/p1: { campo, mao, cemiterio, vida, viradas (nomes do campo virados), soNoGrimorio (o resto do grimório vai ao
    exílio, que é aberto: todo mundo possível dá ao jogador só essas cartas) } }. */
export function monta(a, b, { ativo = 0, vez = 0, passo = 'main1', terreno = false, p0 = {}, p1 = {}, seed = 9 } = {}) {
  let s = jogo(a, b, seed);
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); const ids = [{}, {}];
  [p0, p1].forEach((cfg, p) => {
    const z = s.zones[p]; z.exile = z.exile || [];
    for (const oid of [...z.hand]) { z.hand.splice(z.hand.indexOf(oid), 1); z.library.push(oid); s.objects[oid].zone = 'library'; }
    const tira = (nome, para) => {
      const oid = z.library.find(o => s.objects[o].name === nome);
      if (!oid) throw new Error(`a lista ${listasDoShark()[p ? b : a].id} não tem mais ${nome}`);
      z.library.splice(z.library.indexOf(oid), 1); z[para].push(oid); Object.assign(s.objects[oid], { zone: para, sick: false, tapped: false });
      (ids[p][nome] = ids[p][nome] || []).push(oid); return oid;
    };
    for (const n of cfg.campo || []) tira(n, 'battlefield');
    for (const n of cfg.mao || []) tira(n, 'hand');
    for (const n of cfg.cemiterio || []) tira(n, 'graveyard');
    for (const n of cfg.viradas || []) { const oid = (ids[p][n] || []).find(o => !s.objects[o].tapped); if (oid) s.objects[oid].tapped = true; }
    if (cfg.vida != null) s.players[p].life = cfg.vida;
    if (cfg.soNoGrimorio) for (const oid of [...z.library]) if (!cfg.soNoGrimorio.includes(s.objects[oid].name)) { z.library.splice(z.library.indexOf(oid), 1); z.exile.push(oid); s.objects[oid].zone = 'exile'; }
    s.players[p].landsPlayed = p === ativo && !terreno ? 1 : 0; // o motor conta `landsPlayed` (o `landPlayed` dos testes antigos não faz nada)
  });
  Object.assign(s.turn, { active: ativo, priority: vez, step: passo });
  s.stack = []; s.pending = null;
  return { s, ids };
}
const um = (ids, p, nome) => (ids[p][nome] || [])[0];
/** Avança passando a prioridade até o passo pedido (o ataque abre a decisão de atacantes). */
const passaAte = (s, passo) => { for (let i = 0; i < 60 && s.turn.step !== passo; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
/** O oponente (jogador 1) conjura `nome` e passa: o Shark decide com a mágica no topo da pilha. */
function comMagicaDoOponente(m, nome, alvo = () => true) {
  const oid = um(m.ids, 1, nome);
  const c = E.legalActions(m.s, 1).find(x => x.t === 'cast' && x.oid === oid && alvo(x));
  if (!c) throw new Error('o oponente não consegue conjurar ' + nome);
  let s = act(m.s, c); if (s.turn.priority === 1) s = act(s, { t: 'pass', p: 1 });
  return { ...m, s, alvo: s.stack[s.stack.length - 1] };
}
/** Mão inicial do Shark (jogador 0) para a decisão de mulligan. */
function maoInicial(a, b, nomes, { mulligans = 0 } = {}) {
  const s = J(jogo(a, b)); const z = s.zones[0];
  for (const oid of z.hand) { s.objects[oid].zone = 'library'; z.library.push(oid); }
  z.hand = [];
  for (const n of nomes) { const oid = z.library.find(o => s.objects[o].name === n); if (!oid) throw new Error('falta ' + n); z.library.splice(z.library.indexOf(oid), 1); z.hand.push(oid); s.objects[oid].zone = 'hand'; }
  s.players[0].mulligans = mulligans;
  return { s, ids: [{}, {}] };
}
const nomeDe = (s, oid) => (s.objects[oid] || {}).name;
const conjura = (nome, alvo) => (s, j) => j.acao.t === 'cast' && nomeDe(s, j.acao.oid) === nome && (!alvo || (j.acao.targets || []).some(t => alvo(s, t)));
const noJogador = p => (s, t) => t.player === p;
const naCarta = nome => (s, t) => t.oid && nomeDe(s, t.oid) === nome;
const naPilhaDoOutro = (s, t) => t.oid && s.stack.includes(t.oid) && s.objects[t.oid].controller === 1;
const nao = f => (s, j) => !f(s, j);
const ataqueCom = nomes => (s, j) => (j.acao.attackers || []).length > 0 && (j.acao.attackers || []).some(o => nomes.includes(nomeDe(s, o)));

/** As posições. `certo(s, j)` diz se a jogada `j` (o que `criaBot().jogada` ou `.mulligan` devolve) é a do profissional. */
export const POSICOES = [
  // ---- letal: a partida se fecha agora
  { id: 'letal-bolt', classe: 'letal', lista: MADNESS, porque: 'oponente com 3 de vida e Lightning Bolt na mão: é a vitória',
    monta: () => monta(MADNESS, ELFOS, { p0: { campo: ['Mountain'], mao: ['Lightning Bolt', 'Fiery Temper'] }, p1: { campo: ['Forest', 'Llanowar Elves'], vida: 3 } }),
    certo: conjura('Lightning Bolt', noJogador(1)) },
  { id: 'letal-fireblast', classe: 'letal', lista: MADNESS, porque: 'com as duas Montanhas viradas, Fireblast pelo custo alternativo dá os 4 que faltam',
    monta: () => monta(MADNESS, CONTROLE, { p0: { campo: ['Mountain', 'Mountain'], viradas: ['Mountain', 'Mountain'], mao: ['Fireblast'] }, p1: { campo: ['Island', 'Swamp'], vida: 4 } }),
    certo: conjura('Fireblast', noJogador(1)) },
  { id: 'letal-ataque', classe: 'letal', lista: TERROR, porque: 'oponente com 1 de vida e sem criatura: ataca com a Delver',
    monta: () => { const m = monta(TERROR, MADNESS, { p0: { campo: ['Island', 'Delver of Secrets'] }, p1: { campo: ['Mountain'], vida: 1 } }); return { ...m, s: passaAte(m.s, 'combat_attackers') }; },
    certo: ataqueCom(['Delver of Secrets', 'Insectile Aberration']) },
  // ---- remoção no alvo certo
  { id: 'remocao-ninja', classe: 'remocao', lista: CONTROLE, porque: 'no fim do turno do oponente, Cut Down vai no Ninja of the Deep Hours (o que compra cartas), não na Faerie Seer; guardar a mana até ali e não usar é perdê-la',
    monta: () => monta(CONTROLE, FAERIES, { ativo: 1, vez: 0, passo: 'end', p0: { campo: ['Island', 'Swamp'], mao: ['Cut Down'] }, p1: { campo: ['Island', 'Island', 'Faerie Seer', 'Ninja of the Deep Hours'] } }),
    certo: conjura('Cut Down', naCarta('Ninja of the Deep Hours')) },
  { id: 'remocao-priest', classe: 'remocao', lista: MADNESS, porque: 'no fim do turno em que os Elfos baixaram a Priest of Titania (o motor de mana), o Bolt vai nela antes de ela desvirar, não no Llanowar Elves; guardar a mana até ali e não usar é perdê-la',
    monta: () => monta(MADNESS, ELFOS, { ativo: 1, vez: 0, passo: 'end', p0: { campo: ['Mountain'], mao: ['Lightning Bolt'] }, p1: { campo: ['Forest', 'Forest', 'Llanowar Elves', 'Priest of Titania'] } }),
    certo: conjura('Lightning Bolt', naCarta('Priest of Titania')) },
  { id: 'remocao-deem', classe: 'remocao', lista: TERROR, porque: 'Deem Inferior tira a Baleful Strix (que troca com qualquer atacante) e o dono não a compra de novo tão cedo',
    monta: () => monta(TERROR, FAERIES, { p0: { campo: ['Island', 'Island', 'Island', 'Island'], mao: ['Deem Inferior'] }, p1: { campo: ['Island', 'Island', 'Baleful Strix'] } }),
    certo: conjura('Deem Inferior', naCarta('Baleful Strix')) },
  // ---- anulação: o que vale a carta
  { id: 'anula-guttersnipe', classe: 'anulacao', lista: TERROR, porque: 'Guttersnipe é a ameaça que faz cada mágica do Madness virar dano: anula',
    monta: () => comMagicaDoOponente(monta(TERROR, MADNESS, { ativo: 1, vez: 1, p0: { campo: ['Island', 'Island'], mao: ['Counterspell'] }, p1: { campo: ['Mountain', 'Mountain', 'Mountain'], mao: ['Guttersnipe'] } }), 'Guttersnipe'),
    certo: conjura('Counterspell', naPilhaDoOutro) },
  { id: 'anula-nao-cantrip', classe: 'anulacao', lista: TERROR, porque: 'a única Counterspell não vai no Brainstorm: a ameaça ainda vem',
    monta: () => comMagicaDoOponente(monta(TERROR, FAERIES, { ativo: 1, vez: 1, p0: { campo: ['Island', 'Island'], mao: ['Counterspell'] }, p1: { campo: ['Island', 'Island', 'Island'], mao: ['Brainstorm'] } }), 'Brainstorm'),
    certo: nao(conjura('Counterspell')) },
  { id: 'anula-lose-focus', classe: 'anulacao', lista: CONTROLE, porque: 'oponente sem mana para pagar {2}: o Lose Focus anula a Spellstutter Sprite',
    monta: () => comMagicaDoOponente(monta(CONTROLE, FAERIES, { ativo: 1, vez: 1, p0: { campo: ['Island', 'Island', 'Swamp'], mao: ['Lose Focus'] }, p1: { campo: ['Island', 'Island'], mao: ['Spellstutter Sprite'] } }), 'Spellstutter Sprite'),
    certo: conjura('Lose Focus', naPilhaDoOutro) },
  { id: 'anula-dispel-protege', classe: 'anulacao', lista: TERROR, porque: 'no próprio turno, o Dispel na Counterspell do oponente salva o Murmuring Mystic',
    monta: () => {
      const m = monta(TERROR, CONTROLE, { p0: { campo: ['Island', 'Island', 'Island', 'Island', 'Island'], mao: ['Murmuring Mystic', 'Dispel'] }, p1: { campo: ['Island', 'Island'], mao: ['Counterspell'] } });
      let s = act(m.s, E.legalActions(m.s, 0).find(a => a.t === 'cast' && a.oid === um(m.ids, 0, 'Murmuring Mystic')));
      s = act(s, { t: 'pass', p: 0 });
      s = act(s, E.legalActions(s, 1).find(a => a.t === 'cast' && a.oid === um(m.ids, 1, 'Counterspell')));
      if (s.turn.priority === 1) s = act(s, { t: 'pass', p: 1 });
      return { ...m, s };
    },
    certo: conjura('Dispel', naPilhaDoOutro) },
  // ---- jogar em volta
  { id: 'volta-segura', classe: 'jogar-em-volta', lista: TERROR, porque: 'duas Ilhas abertas e a anulação certa do outro lado: o Mystic espera o oponente virar',
    monta: () => monta(TERROR, CONTROLE, { p0: { campo: ['Island', 'Island', 'Island', 'Island'], mao: ['Murmuring Mystic'] }, p1: { campo: ['Island', 'Island'], mao: ['Counterspell'], soNoGrimorio: ['Counterspell'] } }),
    certo: nao(conjura('Murmuring Mystic')) },
  { id: 'volta-virado', classe: 'jogar-em-volta', lista: TERROR, porque: 'oponente virado: a janela da ameaça é agora',
    monta: () => monta(TERROR, CONTROLE, { p0: { campo: ['Island', 'Island', 'Island', 'Island'], mao: ['Murmuring Mystic'] }, p1: { campo: ['Island', 'Island'], viradas: ['Island', 'Island'], mao: ['Counterspell'], soNoGrimorio: ['Counterspell'] } }),
    certo: conjura('Murmuring Mystic') },
  { id: 'volta-isca', classe: 'jogar-em-volta', lista: TERROR, porque: 'Delver e Mystic com mana para os dois contra a anulação certa: a Delver vai primeiro como isca; anulada, o Mystic passa',
    monta: () => monta(TERROR, CONTROLE, { p0: { campo: ['Island', 'Island', 'Island', 'Island', 'Island'], mao: ['Delver of Secrets', 'Murmuring Mystic'] }, p1: { campo: ['Island', 'Island'], mao: ['Counterspell'], soNoGrimorio: ['Counterspell'] } }),
    certo: conjura('Delver of Secrets') },
  // ---- sequência do turno
  { id: 'seq-terreno-primeiro', classe: 'sequencia', lista: ELFOS, porque: 'terreno antes das mágicas: a Floresta nova abre o Priest of Titania no mesmo turno',
    monta: () => monta(ELFOS, MADNESS, { terreno: true, p0: { campo: ['Forest', 'Llanowar Elves'], mao: ['Forest', 'Priest of Titania'] }, p1: { campo: ['Mountain'] } }),
    certo: (s, j) => j.acao.t === 'play_land' },
  { id: 'seq-mana-primeiro', classe: 'sequencia', lista: ELFOS, porque: 'turno 1 com Floresta: o Llanowar Elves é a jogada (acelera o turno 2)',
    monta: () => monta(ELFOS, CONTROLE, { p0: { campo: ['Forest'], mao: ['Llanowar Elves', 'Timberwatch Elf', 'Forest'] }, p1: { campo: ['Island'] } }),
    certo: conjura('Llanowar Elves') },
  { id: 'seq-looting-temper', classe: 'sequencia', lista: MADNESS, porque: 'Faithless Looting com Fiery Temper na mão: o descarte vira mágica pela loucura',
    monta: () => monta(MADNESS, ELFOS, { p0: { campo: ['Mountain', 'Mountain', 'Mountain'], mao: ['Faithless Looting', 'Fiery Temper', 'Sneaky Snacker', 'Lightning Bolt'] }, p1: { campo: ['Forest', 'Forest', 'Timberwatch Elf'] } }),
    certo: conjura('Faithless Looting') },
  { id: 'seq-scour-proprio', classe: 'recurso', lista: TERROR, porque: 'no fim do turno do oponente, com a mana sobrando, Thought Scour no próprio grimório: o Terror vive de mágicas no próprio cemitério',
    monta: () => monta(TERROR, MADNESS, { ativo: 1, vez: 0, passo: 'end', p0: { campo: ['Island'], mao: ['Thought Scour', 'Tolarian Terror'] }, p1: { campo: ['Mountain'] } }),
    certo: conjura('Thought Scour', noJogador(0)) },
  { id: 'recurso-lorien-ciclar', classe: 'recurso', lista: CONTROLE, porque: 'dois terrenos e nenhum na mão: ciclar o Lórien Revealed por uma Ilha e baixá-la neste turno',
    monta: () => monta(CONTROLE, MADNESS, { terreno: true, p0: { campo: ['Island', 'Swamp'], mao: ['Lórien Revealed', 'Counterspell', 'Cut Down'] }, p1: { campo: ['Mountain', 'Mountain'] } }),
    certo: (s, j) => nomeDe(s, j.acao.oid) === 'Lórien Revealed' && j.acao.t !== 'cast' },
  // ---- combate
  { id: 'combate-nao-ataca-para-morte', classe: 'combate', lista: TERROR, porque: 'com 2 de vida contra Kessig Flamebreather e Voldaren Epicure (2 de poder), a Delver virada no ataque abre o letal de volta: fica para bloquear',
    monta: () => { const m = monta(TERROR, MADNESS, { p0: { campo: ['Island', 'Delver of Secrets'], vida: 2 }, p1: { campo: ['Mountain', 'Kessig Flamebreather', 'Voldaren Epicure'] } }); return { ...m, s: passaAte(m.s, 'combat_attackers') }; },
    certo: (s, j) => (j.acao.attackers || []).length === 0 },
  // B-189 · posições das partidas narradas (derrotas do Control, sementes 1002 e 951 da `bot.narra.mjs`): o Control atacava
  // com o bloqueador de que precisava ("o dano compensa") e o contra-ataque passava por cima — 14 vezes em 7 derrotas.
  { id: 'papel-strix-segura-serpentes', classe: 'papel', lista: CONTROLE, porque: 'dois Baleful Strix (voar e toque mortal) contra Tolarian Terror e duas Cryptic Serpent: atacar por 2 vira os Strix e os 16 de poder do outro lado passam livres no turno dele',
    monta: () => { const m = monta(CONTROLE, TERROR, { p0: { campo: ['Contaminated Aquifer', 'Island', 'Island', 'Baleful Strix', 'Baleful Strix'], vida: 18 }, p1: { campo: ['Island', 'Island', 'Island', 'Island', 'Cryptic Serpent', 'Cryptic Serpent', 'Tolarian Terror'] } }); return { ...m, s: passaAte(m.s, 'combat_attackers') }; },
    certo: (s, j) => !(j.acao.attackers || []).some(o => nomeDe(s, o) === 'Baleful Strix') },
  { id: 'papel-strix-segura-hunter', classe: 'papel', lista: CONTROLE, porque: 'o Baleful Strix é o único que troca com o Avenging Hunter 5/4: atacar por 1 deixa o Hunter bater 5 livre',
    monta: () => { const m = monta(CONTROLE, ELFOS, { p0: { campo: ['Contaminated Aquifer', 'Contaminated Aquifer', 'Island', 'Baleful Strix'], mao: ['Counterspell', 'Thorn of the Black Rose'] }, p1: { campo: ['Forest', 'Forest', 'Forest', 'Elvish Mystic', 'Llanowar Elves', 'Avenging Hunter', 'Quirion Ranger'] } }); return { ...m, s: passaAte(m.s, 'combat_attackers') }; },
    certo: (s, j) => !(j.acao.attackers || []).some(o => nomeDe(s, o) === 'Baleful Strix') },
  // B-191 · Elfos (partidas narradas da B-189): os motores atacavam contra bloqueador desvirado — 5 vezes em 5 derrotas.
  { id: 'papel-elfos-motor-em-casa', classe: 'papel', lista: ELFOS, porque: 'Priest of Titania com quatro Elfos dá quatro manas por turno e o Timberwatch dá +4/+4: atacar com eles por 1 contra dois Baleful Strix (toque mortal) entrega os motores; quem ataca é o Avenging Hunter',
    monta: () => { const m = monta(ELFOS, CONTROLE, { p0: { campo: ['Forest', 'Forest', 'Forest', 'Priest of Titania', 'Timberwatch Elf', 'Llanowar Elves', 'Avenging Hunter'] }, p1: { campo: ['Island', 'Island', 'Swamp', 'Baleful Strix', 'Baleful Strix'] } }); return { ...m, s: passaAte(m.s, 'combat_attackers') }; },
    certo: (s, j) => !(j.acao.attackers || []).some(o => ['Priest of Titania', 'Timberwatch Elf'].includes(nomeDe(s, o))) },
  // B-192 · Control (partidas narradas da B-189): o Viridian Longbow nunca foi equipado em 4 partidas.
  { id: 'recurso-longbow-equipa', classe: 'recurso', lista: CONTROLE, porque: 'Longbow solto, Trinket Mage desvirado e quatro manas contra Priest of Titania e dois elfos de mana 1/1: equipar e atirar no Priest no mesmo turno',
    monta: () => monta(CONTROLE, ELFOS, { p0: { campo: ['Island', 'Island', 'Swamp', 'Island', 'Viridian Longbow', 'Trinket Mage'] }, p1: { campo: ['Forest', 'Forest', 'Llanowar Elves', 'Priest of Titania', 'Elvish Mystic'] } }),
    certo: (s, j) => j.acao.t === 'activate' && nomeDe(s, j.acao.oid) === 'Viridian Longbow' },
  // ---- mulligan
  { id: 'mull-sete-terrenos', classe: 'mulligan', lista: TERROR, porque: 'sete terrenos não jogam: mulligan',
    mulligan: true, monta: () => maoInicial(TERROR, MADNESS, ['Island', 'Island', 'Island', 'Island', 'Island', 'Island', 'Island']),
    certo: (s, j) => j.acao.t === 'mulligan' },
  { id: 'mull-sem-terreno', classe: 'mulligan', lista: MADNESS, porque: 'zero terrenos: mulligan',
    mulligan: true, monta: () => maoInicial(MADNESS, ELFOS, ['Lightning Bolt', 'Lava Dart', 'Fireblast', 'Guttersnipe', 'Fiery Temper', 'Grab the Prize', 'Kessig Flamebreather']),
    certo: (s, j) => j.acao.t === 'mulligan' },
  { id: 'mull-terror-mantem', classe: 'mulligan', lista: TERROR, porque: 'duas Ilhas, Brainstorm e Ponder para achar a terceira, Delver no turno 1 e Counterspell: mantém',
    mulligan: true, monta: () => maoInicial(TERROR, MADNESS, ['Island', 'Island', 'Brainstorm', 'Ponder', 'Delver of Secrets', 'Counterspell', 'Thought Scour']),
    certo: (s, j) => j.acao.t === 'keep' },
  { id: 'mull-elfos-mantem', classe: 'mulligan', lista: ELFOS, porque: 'duas Florestas, dois elfos de mana, Priest e o reabastecimento: mantém',
    mulligan: true, monta: () => maoInicial(ELFOS, MADNESS, ['Forest', 'Forest', 'Llanowar Elves', 'Elvish Mystic', 'Priest of Titania', 'Lead the Stampede', 'Timberwatch Elf']),
    certo: (s, j) => j.acao.t === 'keep' },
];

/** Nota de um nível: acertos por classe e as posições erradas (com o motivo do Shark). */
export function pontua(nivel = 'shark', extra = null) {
  const porClasse = {}, erradas = []; let certas = 0;
  for (const P of POSICOES) {
    const m = P.monta();
    const bot = B.criaBot({ nivel, agora: () => 0, ...(extra ? { extra } : {}) });
    const j = P.mulligan ? bot.mulligan(m.s, 0) : bot.jogada(m.s, 0);
    const ok = !!j && !!j.acao && P.certo(m.s, j);
    const c = (porClasse[P.classe] = porClasse[P.classe] || [0, 0]); c[1]++;
    if (ok) { certas++; c[0]++; } else erradas.push({ id: P.id, fez: j && j.acao ? `${j.acao.t} ${nomeDe(m.s, j.acao.oid) || ''}`.trim() : 'nada', motivo: j && j.motivo });
  }
  return { nivel, certas, total: POSICOES.length, pct: Math.round(1000 * certas / POSICOES.length) / 10, porClasse, erradas };
}

if (process.argv[1] && process.argv[1].endsWith('bot.bateria.mjs')) {
  for (const nivel of process.argv.slice(2).length ? process.argv.slice(2) : ['shark']) {
    const r = nivel.startsWith('z:') ? pontua('shark', Object.fromEntries(nivel.slice(2).split(',').filter(Boolean).map(k => k.startsWith('!') ? [k.slice(1), false] : [k, true]))) : pontua(nivel); // B-190 · 'z:peça' = o Shark publicado com a peça a mais
    console.log(`${nivel}: ${r.certas} de ${r.total} (${r.pct}%) · ` + Object.entries(r.porClasse).map(([k, [a, t]]) => `${k} ${a}/${t}`).join(' · '));
    for (const e of r.erradas) console.log(`  errou ${e.id}: ${e.fez} · ${e.motivo || ''}`);
  }
}
