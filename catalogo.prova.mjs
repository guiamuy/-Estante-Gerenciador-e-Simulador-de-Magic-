// H-1 · Prova de partida do catálogo (trilha homologacao). Não é teste do portão: leva minutos e depende do ramo `catalogo`.
// A cobertura (`deckCoverage`, a mesma função da tela) diz se a lista PODE jogar no modo completo; esta ferramenta diz se ela
// JOGA: cada lista coberta faz partidas inteiras no modo completo contra outras listas cobertas do mesmo formato, com ações
// sorteadas de `legalActions` (a mesma fonte da mesa, do bot e do fuzz). A cada ação: `apply` aceita a ação legal, as
// invariantes do estado valem e a partida não trava. Cada falha sai com a carta culpada, para a trilha dona reproduzir.
//
// Os dados das cartas (tipo, custo, P/T, texto, palavras-chave, faces) vêm do Oracle do Forge, convertidos para a forma da
// Scryfall e passados pela MESMA normalização do app (`normalizeCard`). Diferença conhecida: a Scryfall também põe ações
// de palavra-chave (Scry, Mill…) em `keywords`; aqui só entram as palavras-chave que o texto da carta escreve.
// H-14 · o app lê o texto da Scryfall, e o Forge às vezes guarda uma redação anterior (Elven Farsight: "If it's a creature card", antes da errata "If a
// creature card is revealed this way"). Onde `.listas/oficiais-revisadas.json` tem o texto consultado na Scryfall (o mesmo que a revisão por lote aprovou),
// ele vence o do Forge — só em carta de uma face; o resto (tipo, custo, P/T, palavras-chave) continua do Forge. O placar diz quantas trocaram.
//
// Uso:
//   git fetch origin catalogo:refs/remotes/origin/catalogo           (uma vez; o catálogo vem do ramo `catalogo`)
//   git clone --depth 1 --filter=blob:none --sparse https://github.com/Card-Forge/forge <dir> && \
//     git -C <dir> sparse-checkout set forge-gui/res/cardsfolder      (uma vez; texto oficial das cartas)
//   node catalogo.prova.mjs --forge <dir>/forge-gui/res/cardsfolder [--formato pauper] [--partidas 2] [--acoes 1000]
//        [--lista <trecho do nome>] [--saida .tmp/prova-pauper.json] [--semente 1] [--todas] [--shark [--orcamento 60] [--fatia 1/2]] [--sem-telemetria]
//   R-17 · ao fim, o placar (contagens, Shark, 10 culpadas) vai para o ramo `telemetria` do repositório, que o Painel Estante lê;
//   --sem-telemetria desliga (também desligado no CI e com --lista, que é recorte); falha de envio nunca derruba a prova
//   --shark: as listas que jogam também fazem a mesma partida com o Shark nos dois assentos (H-3)
//   --todas: também joga as listas de cobertura incompleta (estresse do motor; a carta sem regra entra sem efeito)
// Saída: placar no terminal (joga / falha / cobertura incompleta / sem dados) e o detalhe em JSON (padrão `.tmp/`).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { loadModules, ROOT } from './_load.mjs';
import { gravar, placarDaProva } from './telemetria.mjs'; // R-17 · o placar vai para o ramo `telemetria` (Painel Estante)

const M = loadModules();
const E = M.engine, S = M.scripts, norm = M.cards.norm, normalizeCard = M.scryfall.normalizeCard, BASIC = M.cards.BASIC_CARDS;

/* ---------- argumentos ---------- */
const ARGS = (() => {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); o[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; }
  return o;
})();
const FORMATO = ARGS.formato || 'pauper';
const PARTIDAS = Math.max(1, +(ARGS.partidas || 2));
const MAX_ACOES = Math.max(50, +(ARGS.acoes || 1000));
const SEMENTE = +(ARGS.semente || 1) >>> 0;
const SAIDA = ARGS.saida || join(ROOT, '.tmp', `prova-${FORMATO}.json`);

/* ---------- Forge → forma da Scryfall ---------- */
const SUPER = new Set(['Basic', 'Legendary', 'Snow', 'World', 'Ongoing', 'Elite', 'Host']);
const TIPOS = new Set(['Artifact', 'Battle', 'Creature', 'Enchantment', 'Instant', 'Kindred', 'Tribal', 'Land', 'Planeswalker', 'Sorcery', 'Conspiracy', 'Dungeon', 'Phenomenon', 'Plane', 'Scheme', 'Vanguard']);
const CORES = { white: 'W', blue: 'U', black: 'B', red: 'R', green: 'G' };

/** "1 GW GW" → "{1}{G/W}{G/W}"; "no cost" → "". */
export function custoDoForge(s) {
  if (!s || /^no cost$/i.test(s.trim())) return '';
  return s.trim().split(/\s+/).map(t => {
    if (/^\d+$/.test(t) || /^[WUBRGCXYZS]$/.test(t)) return `{${t}}`;
    if (/^2\/?[WUBRG]$/.test(t)) return `{2/${t.slice(-1)}}`;
    const letras = t.replace(/\//g, '').split('');
    return `{${letras.join('/')}}`; // GW → {G/W}, BP → {B/P}, RWP → {R/W/P}, CW → {C/W}
  }).join('');
}
/** Valor de mana como a Scryfall: número soma, X conta 0, {2/R} conta 2, o resto conta 1. */
export function valorDeMana(custo) {
  return [...String(custo || '').matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : /^[XYZ]$/.test(x) ? 0 : /^2\//.test(x) ? 2 : 1), 0);
}
const coresDoCusto = c => [...new Set([...String(c || '').matchAll(/\{([^}]+)\}/g)].flatMap(([, x]) => x.split('/')).filter(x => 'WUBRG'.includes(x) && x.length === 1))];
/** "Legendary Creature Human Wizard" → "Legendary Creature — Human Wizard". */
export function linhaDeTipo(t) {
  const ps = String(t || '').trim().split(/\s+/).filter(Boolean);
  let i = 0; while (i < ps.length && (SUPER.has(ps[i]) || TIPOS.has(ps[i]))) i++;
  const cab = ps.slice(0, i).join(' '), sub = ps.slice(i).join(' ');
  return sub ? `${cab} — ${sub}` : cab;
}
function face(sec) {
  const v = k => (sec.find(l => l.startsWith(k + ':')) || '').slice(k.length + 1).trim();
  const oracle = v('Oracle').replace(/\\n/g, '\n');
  const custo = custoDoForge(v('ManaCost'));
  const pt = v('PT'), cl = v('Colors');
  const colors = cl ? cl.split(',').map(x => CORES[x.trim().toLowerCase()]).filter(Boolean) : coresDoCusto(custo);
  // palavra-chave só quando o texto da carta a escreve (o Forge usa K: também para regras internas)
  const textoMin = oracle.toLowerCase().replace(/\([^)]*\)/g, '');
  const keywords = [...new Set(sec.filter(l => l.startsWith('K:')).map(l => l.slice(2).split(':')[0].trim()).filter(k => k && !/[$|]/.test(k) && /^[A-Za-z][A-Za-z ' -]+$/.test(k) && textoMin.includes(k.toLowerCase())))];
  return { name: v('Name'), mana_cost: custo, type_line: linhaDeTipo(v('Types')), oracle_text: oracle,
    ...(pt ? { power: pt.split('/')[0], toughness: pt.split('/')[1] } : {}),
    ...(v('Loyalty') ? { loyalty: v('Loyalty') } : {}), ...(v('Defense') ? { defense: v('Defense') } : {}), colors, keywords };
}
const LAYOUT = { DoubleFaced: 'transform', Modal: 'modal_dfc', Split: 'split', Adventure: 'adventure', Flip: 'flip', Omen: 'omen', Meld: 'meld', Prepare: 'prepare' };
/** Um arquivo do Forge vira uma carta crua da Scryfall (com `card_faces` quando há duas faces). */
export function cartaDoForge(texto) {
  const secoes = texto.split(/\r?\n\s*ALTERNATE\s*\r?\n/).map(s => s.split(/\r?\n/).map(l => l.trim()).filter(Boolean));
  const f0 = face(secoes[0]);
  if (!f0.name) return null;
  const modo = (secoes[0].find(l => l.startsWith('AlternateMode:')) || '').slice(14).trim();
  const layout = LAYOUT[modo] || 'normal';
  if (secoes.length < 2 || layout === 'normal' || layout === 'meld') return { ...f0, cmc: valorDeMana(f0.mana_cost), color_identity: f0.colors, layout };
  const f1 = face(secoes[1]);
  const faces = [f0, f1];
  const nome = `${f0.name} // ${f1.name}`;
  // H-12 · carta de preparação (722, AlternateMode:Prepare): a carta é a permanente; a mágica de preparação vem do script (`back`), como em
  // .listas/oficiais-tipos.json. A lista do catálogo pode escrever "Permanente // Mágica": esse nome também acha a carta (nomeNaLista).
  if (layout === 'prepare') return { ...f0, cmc: valorDeMana(f0.mana_cost), color_identity: f0.colors, layout, preparo: { name: f1.name, mana_cost: f1.mana_cost, type_line: f1.type_line, oracle_text: f1.oracle_text }, nomeNaLista: nome };
  const kws = [...new Set([...f0.keywords, ...f1.keywords])];
  const ci = [...new Set([...f0.colors, ...f1.colors])];
  if (layout === 'transform' || layout === 'modal_dfc') return { name: nome, cmc: valorDeMana(f0.mana_cost), type_line: `${f0.type_line} // ${f1.type_line}`, card_faces: faces, keywords: kws, color_identity: ci, layout };
  // dividida, aventura, virada e presságio: um objeto só, custo e texto das duas metades na carta
  const cmc = layout === 'split' ? valorDeMana(f0.mana_cost) + valorDeMana(f1.mana_cost) : valorDeMana(f0.mana_cost);
  return { name: nome, mana_cost: `${f0.mana_cost} // ${f1.mana_cost}`, cmc, type_line: `${f0.type_line} // ${f1.type_line}`, card_faces: faces,
    colors: ci, keywords: kws, color_identity: ci, layout,
    ...(f0.power != null ? { power: f0.power, toughness: f0.toughness } : {}) };
}
/** Lê a pasta `cardsfolder` do Forge só para os nomes pedidos. Devolve Map(norm(nome) → carta normalizada). */
export function cartasDoForge(pasta, nomes) {
  const falta = new Set([...nomes].map(norm));
  const out = new Map();
  for (const letra of readdirSync(pasta)) {
    const dir = join(pasta, letra);
    if (!statSync(dir).isDirectory()) continue;
    for (const arq of readdirSync(dir)) {
      if (!arq.endsWith('.txt')) continue;
      const txt = readFileSync(join(dir, arq), 'utf8');
      const nome = (txt.match(/^Name:(.*)$/m) || [])[1];
      if (!nome) continue;
      const cru = cartaDoForge(txt);
      if (!cru) continue;
      const chaves = [norm(cru.name), norm(nome.trim()), ...(cru.nomeNaLista ? [norm(cru.nomeNaLista)] : [])]; // H-12
      if (!chaves.some(k => falta.has(k))) continue;
      const c = normalizeCard(cru);
      for (const k of chaves) if (!out.has(k)) out.set(k, c);
    }
  }
  return out;
}

/** H-14 · textos da Scryfall já consultados pela revisão por lote: Map(norm(nome) → texto). Só os de fonte Scryfall e de uma face. */
export function textosDaScryfall(arquivo = join(ROOT, '.listas', 'oficiais-revisadas.json')) {
  const m = new Map();
  if (!existsSync(arquivo)) return m;
  for (const c of (JSON.parse(readFileSync(arquivo, 'utf8')).cartas || []))
    if (c && c.oracle_text && /^https?:\/\/(?:[\w-]+\.)*scryfall\.com\//i.test(String(c.fonte || '')) && !String(c.name).includes('//')) m.set(norm(c.name), c.oracle_text);
  return m;
}
/** H-14 · troca o texto do Forge pelo da Scryfall onde houver e for diferente (carta de uma face). Muda o Map recebido; devolve os nomes trocados. */
export function aplicaTextosDaScryfall(cartas, textos) {
  const trocadas = [];
  for (const [k, c] of cartas) {
    const t = textos.get(k);
    if (!t || !c || c.oracle_text === t || String(c.name).includes('//') || (Array.isArray(c.faces) && c.faces.length)) continue;
    cartas.set(k, { ...c, oracle_text: t });
    if (!trocadas.includes(c.name)) trocadas.push(c.name);
  }
  return trocadas;
}

/* ---------- catálogo ---------- */
function doRamo(caminho) {
  try { return execFileSync('git', ['-C', ROOT, 'show', `origin/catalogo:${caminho}`], { encoding: 'utf8', maxBuffer: 64 << 20 }); }
  catch (e) { throw new Error(`não li ${caminho} do ramo catalogo (rode: git fetch origin catalogo:refs/remotes/origin/catalogo)`); }
}
export function listasDoCatalogo() {
  const indice = JSON.parse(doRamo('indice.json'));
  return indice.listas.filter(l => l.formato === FORMATO && (!ARGS.lista || l.nome.toLowerCase().includes(String(ARGS.lista).toLowerCase())))
    .map(l => ({ ...l, ...JSON.parse(doRamo(l.arquivo)) }));
}

/* ---------- uma partida ---------- */
const nomeDe = (s, oid) => (oid != null && s.objects[oid]) ? s.objects[oid].name : null;
/** Cartas citadas pela ação (a de quem age, o alvo, o que a pilha tem em cima): é a pista de quem quebrou. */
function cartasDaAcao(s, a) {
  const out = new Set();
  const visita = v => { if (v == null) return; if (typeof v === 'number' || (typeof v === 'string' && s.objects[v])) { const n = nomeDe(s, v); if (n) out.add(n); }
    else if (Array.isArray(v)) v.forEach(visita); else if (typeof v === 'object') Object.values(v).forEach(visita); };
  for (const k of ['oid', 'source', 'target', 'targets', 'attackers', 'blocks', 'picks', 'oids', 'chosen']) visita(a[k]);
  const topo = s.stack[s.stack.length - 1];
  if (topo) { const n = topo.name || nomeDe(s, topo.oid) || nomeDe(s, topo.source); if (n) out.add(n); }
  return [...out];
}
const resumoDaAcao = a => JSON.stringify(a).slice(0, 200);

/** Uma partida com ações sorteadas. `comEstado`: devolve também o estado no ponto da falha (para reproduzir). */
/** H-3 · oferta que some: na sua fase principal, com a pilha vazia e sem decisão pendente, a carta da mão (não terreno) cujo custo
    `canPay` diz que dá para pagar conta como "podia"; a carta conta como "oferecida" quando QUALQUER ação de `legalActions`, em
    qualquer momento, a usa (anular só aparece com mágica na pilha; remoção só com alvo). Carta que podia muitas vezes e nunca foi
    oferecida é pista de oferta que sumiu (ex.: filtro otimista do legalActions, M-259) — pista, não veredito: a condição impressa
    ("cast only if…", "sacrifique uma criatura como custo adicional") também a explica. */
// H-7 · mágica cujo alvo é uma mágica ("Counter target artifact or enchantment spell", Annul) não tem como ser oferecida com a pilha
// vazia; contá-la em "podia" fazia o Annul aparecer como oferta que some (10 listas, 13/10) sem desvio nenhum do motor.
export const alvoEMagica = c => /\b(instant|sorcery)\b/i.test(String(c && c.type_line || '')) && /\btarget (?:[\w-]+ |or )*spell\b/i.test(String(c && c.oracle_text || ''));
export function observaOferta(s, l, p, setup, obs) {
  if (!obs) return;
  for (const x of l) if (x.oid != null && s.objects[x.oid] && s.objects[x.oid].controller === p && ['cast', 'play', 'activate'].includes(x.t)) { const n = s.objects[x.oid].name; (obs.get(n) || obs.set(n, { podia: 0, oferecida: 0 }).get(n)).oferecida++; }
  if (s.pending || s.stack.length || s.turn.active !== p || !/^main/.test(s.turn.step)) return;
  for (const oid of s.zones[p].hand) {
    const n = s.objects[oid].name, c = setup.cards[n];
    if (!c || /\bLand\b/.test(c.type_line || '') || !c.mana_cost || /\/\//.test(c.mana_cost) || alvoEMagica(c)) continue;
    let pode = false; try { pode = E.canPay(s, p, E.parseCost(c.mana_cost.replace(/\{X\}/g, ''))); } catch (e) { pode = false; }
    if (pode) (obs.get(n) || obs.set(n, { podia: 0, oferecida: 0 }).get(n)).podia++;
  }
}

export function joga(setup, comEstado = false, obs = null) {
  let s;
  try { s = E.createGame(setup); } catch (e) { return { erro: 'criar', mensagem: e.message, cartas: [] }; }
  try { for (let p = 0; p < 2 && s.status === 'mulligan'; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state; } // as duas mãos ficam (como o fuzz das listas do acervo)
  catch (e) { return { erro: 'manter a mão', mensagem: e.message, cartas: [] }; }
  if (s.status !== 'playing') return { erro: 'começar', mensagem: `a partida não começou (situação ${s.status})`, cartas: [] };
  const total = Object.keys(s.objects).length;
  let r = (setup.seed * 2654435761) >>> 0, n = 0;
  const rastro = [];
  for (; n < MAX_ACOES && s.status === 'playing'; n++) {
    const p = s.pending ? s.pending.p : s.turn.priority;
    let l;
    try { l = E.legalActions(s, p).filter(x => x.t !== 'concede'); }
    catch (e) { return { erro: 'oferta', mensagem: e.message, acao: n, passo: s.turn.step, cartas: [...new Set(rastro.slice(-3).flatMap(x => x.cartas))], rastro: rastro.slice(-5) }; }
    observaOferta(s, l, p, setup, obs);
    if (!l.length) return { erro: 'travou', mensagem: `sem ação legal (passo ${s.turn.step}, pendência ${s.pending && s.pending.kind})`, acao: n, cartas: [...new Set(rastro.slice(-3).flatMap(x => x.cartas))], rastro: rastro.slice(-5) };
    r = (Math.imul(r, 1103515245) + 12345) >>> 0;
    const x = l[(r >>> 8) % l.length];
    const cartas = cartasDaAcao(s, x);
    rastro.push({ acao: resumoDaAcao(x), cartas });
    if (rastro.length > 12) rastro.shift();
    try { s = E.apply(s, x).state; }
    catch (e) { return { erro: 'recusada', mensagem: e.message, acao: n, cartas, rastro: rastro.slice(-5), ...(comEstado ? { estado: s, acaoRecusada: x } : {}) }; }
    let errs;
    try { errs = E.invariants(s, total); } catch (e) { errs = ['invariantes quebraram: ' + e.message]; }
    // H-11 · a conta de cartas é a do motor (`invariants` ignora cópia de mágica desde a M-355 e a cópia de preparação desde a T-51); a prova não reconta.
    if (errs.length) return { erro: 'invariante', mensagem: errs.join('; '), acao: n, cartas, rastro: rastro.slice(-5), ...(comEstado ? { estado: s } : {}) };
  }
  return { fim: s.status !== 'playing', acoes: n, turnos: s.turn.number, vencedor: s.winner ?? null };
}

/** H-3 · Shark × Shark: os dois assentos com o bot do app (informação justa), como o torneio das listas (torneio.listas.mjs).
    Falha: o motor recusa a jogada que o Shark escolheu entre as legais, o Shark fica sem jogada, ou uma invariante quebra. */
/** H-8 · `--fatia i/n`: o Shark joga só as listas de índice ≡ i (mod n), para dividir a rodada longa entre processos (os dois núcleos). */
const FATIA = /^(\d+)\/(\d+)$/.exec(String(ARGS.fatia || '')), naFatia = i => !FATIA || i % +FATIA[2] === +FATIA[1] - 1;
export function jogaShark(setup, max = 1500) {
  const B = M.bot;
  let s;
  try { s = E.createGame(setup); } catch (e) { return { erro: 'criar', mensagem: e.message, cartas: [] }; }
  const total = Object.keys(s.objects).length;
  const bots = [0, 1].map(() => B.criaBot({ nivel: 'shark', orcamentoMs: +(ARGS.orcamento || 60) }));
  let pior = 0, n = 0;
  const rastro = [];
  for (; n < max && s.status !== 'over'; n++) {
    const quem = s.status === 'mulligan' ? s.players.findIndex(pl => !pl.kept) : s.pending ? s.pending.p : s.turn.priority;
    if (quem < 0) break;
    let acao;
    try {
      if (s.status === 'mulligan') acao = bots[quem].mulligan ? bots[quem].mulligan(s, quem).acao : { t: 'keep', p: quem, bottom: [] };
      else { const t = Date.now(); const j = bots[quem].jogada(s, quem); pior = Math.max(pior, Date.now() - t); acao = j && j.acao; }
    } catch (e) { return { erro: 'shark', mensagem: `o Shark quebrou ao decidir: ${e.message}`, acao: n, cartas: [...new Set(rastro.slice(-3).flatMap(x => x.cartas))], rastro: rastro.slice(-5) }; }
    if (!acao) return { erro: 'shark', mensagem: `o Shark ficou sem jogada (pendência ${s.pending && s.pending.kind})`, acao: n, cartas: [...new Set(rastro.slice(-3).flatMap(x => x.cartas))], rastro: rastro.slice(-5) };
    const cartas = cartasDaAcao(s, acao);
    rastro.push({ acao: resumoDaAcao(acao), cartas }); if (rastro.length > 12) rastro.shift();
    try { s = E.apply(s, acao).state; } catch (e) { return { erro: 'recusada', mensagem: `jogada do Shark: ${e.message}`, acao: n, cartas, rastro: rastro.slice(-5) }; }
    if (s.status === 'mulligan') continue;
    let errs; try { errs = E.invariants(s, total); } catch (e) { errs = ['invariantes quebraram: ' + e.message]; }
    if (errs.length) return { erro: 'invariante', mensagem: errs.join('; '), acao: n, cartas, rastro: rastro.slice(-5) };
  }
  return { fim: s.status === 'over', acoes: n, turnos: s.turn.number, vencedor: s.winner ?? null, piorMs: pior };
}

/* ---------- placar ---------- */
function main() {
  if (!ARGS.forge || !existsSync(ARGS.forge)) { console.error('Informe --forge <pasta cardsfolder do Forge> (veja o cabeçalho deste arquivo).'); process.exit(2); }
  const t0 = Date.now();
  const listas = listasDoCatalogo();
  const nomes = new Set(listas.flatMap(l => (l.entradas || []).map(e => e.name)));
  const cartas = cartasDoForge(ARGS.forge, nomes);
  const textoDaScryfall = aplicaTextosDaScryfall(cartas, textosDaScryfall()); // H-14
  for (const [k, v] of Object.entries(BASIC)) if (!cartas.has(k)) cartas.set(k, v);
  const resultado = [], nivelDe = new Map(); // carta pendente → nível de cobertura e motivo (lida = o leitor leu, falta a revisão do motor)
  for (const l of listas) {
    const entradas = (l.entradas || []).filter(e => e.zone !== 'side' && e.zone !== 'maybe').map(e => ({ ...e, key: norm(e.name) }));
    const semDados = [...new Set(entradas.filter(e => !cartas.has(e.key)).map(e => e.name))];
    const cv = S.deckCoverage(entradas, cartas);
    for (const x of cv.pending) if (!nivelDe.has(x.name)) nivelDe.set(x.name, { nivel: x.level, motivo: x.reason });
    resultado.push({ id: l.id, nome: l.nome, cores: l.cores, evento: l.evento, data: l.data, entradas, semDados,
      cobertura: { completo: cv.completo, total: cv.total, pct: cv.pct, lida: cv.lida, pendentes: [...new Set(cv.pending.map(x => x.name))] },
      situacao: semDados.length ? 'sem dados' : cv.completo === cv.total ? 'a provar' : 'cobertura incompleta', partidas: [], falhas: [] });
  }
  const oferta = new Map(); // H-3 · carta → { podia, oferecida }
  /** Cada lista do grupo joga PARTIDAS vezes contra outras do mesmo grupo, nos dois assentos. */
  const provar = (grupo, campo) => {
    for (let i = 0; i < grupo.length; i++) {
      const a = grupo[i];
      for (let k = 0; k < PARTIDAS; k++) {
        const b = grupo.length > 1 ? grupo[(i + 1 + k * 7) % grupo.length] : a;
        const b2 = b === a && grupo.length > 1 ? grupo[(i + 1) % grupo.length] : b;
        const assentos = k % 2 ? [b2, a] : [a, b2];
        // como a mesa: o mapa de cartas da partida tem só as cartas das duas listas, pelo nome escrito na lista
        const doPar = Object.fromEntries(assentos.flatMap(x => x.entradas).map(e => [e.name, cartas.get(e.key)]));
        const setup = { format: FORMATO, seed: (SEMENTE * 7919 + i * 101 + k) >>> 0, mode: 'full', manaCheck: true, cards: doPar,
          players: assentos.map((x, j) => ({ name: j ? 'B' : 'A', deck: x.entradas.map(e => ({ name: e.name, qty: e.qty, zone: e.zone || 'main' })) })) };
        const res = joga(setup, false, oferta);
        const reg = { contra: b2.nome, contraId: b2.id, assento: k % 2, semente: setup.seed, ...res };
        if (ARGS.shark && campo === 'partidas' && k === 0 && naFatia(i)) { // H-3 · a primeira partida de cada lista, de novo com o Shark nos dois assentos
          const tS = Date.now(); process.stderr.write(`  shark ${i + 1}/${grupo.length} · ${a.nome} × ${b2.nome} (semente ${setup.seed}) … `); // H-8 · progresso: a partida que não termina fica visível no log
          const sh = jogaShark(setup); process.stderr.write(`${((Date.now() - tS) / 1000).toFixed(1)} s · ${sh.erro || (sh.fim ? 'fim' : 'limite')} · ${sh.acoes ?? sh.acao} ações\n`);
          const regS = { modo: 'shark', contra: b2.nome, contraId: b2.id, assento: k % 2, semente: setup.seed, ms: Date.now() - tS, ...sh }; // R-17 · `ms`: tempo médio por jogada no painel
          (a.shark = a.shark || []).push(regS);
          if (sh.erro) (a.falhas = a.falhas || []).push(regS);
        }
        // no estresse a lista tem carta sem regra: a falha só aponta o motor quando todas as cartas citadas estão cobertas
        if (res.erro && campo === 'estresse') reg.soCobertas = (res.cartas || []).length > 0 && res.cartas.every(n => !nivelDe.has(n));
        (a[campo] = a[campo] || []).push(reg);
        if (res.erro) (a[campo === 'partidas' ? 'falhas' : 'falhasEstresse'] = a[campo === 'partidas' ? 'falhas' : 'falhasEstresse'] || []).push(reg);
      }
      if (campo === 'partidas') a.situacao = a.falhas.length ? 'falha' : 'joga';
    }
  };
  provar(resultado.filter(x => x.situacao === 'a provar'), 'partidas');
  // --todas: estresse do motor com as listas de cobertura incompleta (a carta sem regra entra na partida sem efeito).
  // Não muda a situação da lista (ela continua sem jogar no app); serve para achar defeito nas cartas cobertas.
  if (ARGS.todas) provar(resultado.filter(x => x.situacao === 'cobertura incompleta'), 'estresse');
  // carta culpada: a que mais aparece nas falhas, contando uma vez por lista
  const culpadas = new Map(), faltantes = new Map();
  for (const x of resultado) {
    for (const n of new Set([...x.falhas, ...(x.falhasEstresse || []).filter(f => f.soCobertas)].flatMap(f => f.cartas || []))) culpadas.set(n, (culpadas.get(n) || 0) + 1);
    for (const n of new Set([...x.cobertura.pendentes, ...x.semDados])) faltantes.set(n, (faltantes.get(n) || 0) + 1);
  }
  // H-3 · oferta que some: carta coberta que podia ser paga na fase principal (3 vezes ou mais) e nunca apareceu em ação nenhuma
  const ofertaQueSome = [...oferta].filter(([n, o]) => o.podia >= 3 && o.oferecida === 0 && !nivelDe.has(n)).sort((a, b) => b[1].podia - a[1].podia).map(([carta, o]) => ({ carta, podia: o.podia }));
  const conta = s => resultado.filter(x => x.situacao === s).length;
  const placar = { formato: FORMATO, listas: resultado.length, joga: conta('joga'), falha: conta('falha'), coberturaIncompleta: conta('cobertura incompleta'), semDados: conta('sem dados'),
    ...(ARGS.todas ? { estresse: { listas: resultado.filter(x => x.estresse).length, falhas: resultado.filter(x => (x.falhasEstresse || []).length).length, falhasDoMotor: resultado.filter(x => (x.falhasEstresse || []).some(f => f.soCobertas)).length } } : {}),
    partidas: PARTIDAS, acoesMax: MAX_ACOES, semente: SEMENTE, motor: E.ENGINE_VERSION, segundos: Math.round((Date.now() - t0) / 1000) };
  const ordena = m => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([carta, listas]) => ({ carta, listas, ...(nivelDe.get(carta) || (resultado.some(x => x.semDados.includes(carta)) ? { nivel: 'sem dados' } : {})) }));
  mkdirSync(dirname(SAIDA), { recursive: true });
  const detalhe = { placar, culpadas: ordena(culpadas), faltantes: ordena(faltantes), ofertaQueSome, listas: resultado.map(({ entradas, ...x }) => x) };
  writeFileSync(SAIDA, JSON.stringify(detalhe, null, 1));
  // R-17 · BI2-1 · o placar vai para o ramo `telemetria` (dado, não produto): o Painel Estante mostra a série. Recorte (--lista) e CI não gravam.
  if (!ARGS['sem-telemetria'] && !ARGS.lista && !process.env.CI) {
    try { const r = gravar({ tipo: 'placar', registro: placarDaProva(detalhe) }); console.log(`  telemetria: placar gravado em ${r.arquivo} (${r.enviado ? 'enviado ao ramo telemetria' : 'sem envio'})`); }
    catch (e) { console.log(`  telemetria não gravada (${String(e && e.message).split('\n')[0].slice(0, 120)}); a prova vale do mesmo jeito`); }
  }
  console.log(`Prova de partida · ${FORMATO} · motor v${placar.motor} · ${placar.listas} listas · ${PARTIDAS} partida(s) por lista, até ${MAX_ACOES} ações · ${placar.segundos} s`);
  console.log(`  joga de verdade: ${placar.joga} · falha na partida: ${placar.falha} · cobertura incompleta: ${placar.coberturaIncompleta} · sem dados da carta: ${placar.semDados}`);
  console.log(`  texto da Scryfall no lugar do Forge (H-14): ${textoDaScryfall.length} carta(s)`);
  if (ARGS.shark) { const sh = resultado.flatMap(x => x.shark || []); console.log(`  Shark × Shark: ${sh.length} partidas · ${sh.filter(x => x.fim).length} até o fim · ${sh.filter(x => x.erro).length} com falha · pior jogada ${Math.max(0, ...sh.map(x => x.piorMs || 0))} ms`); }
  if (ofertaQueSome.length) console.log(`  oferta que some (podia pagar na fase principal e nunca foi oferecida; pista a conferir): ${ofertaQueSome.slice(0, 15).map(x => `${x.carta} (${x.podia})`).join(' · ')}`);
  if (placar.estresse) console.log(`  estresse (--todas, listas que não jogam no app): ${placar.estresse.listas} listas · ${placar.estresse.falhas} com falha · ${placar.estresse.falhasDoMotor} com falha só de cartas cobertas`);
  for (const x of resultado.filter(x => (x.falhasEstresse || []).some(f => f.soCobertas)).slice(0, 10)) { const f = x.falhasEstresse.find(f => f.soCobertas); console.log(`  ✗ (estresse) ${x.nome} × ${f.contra} (semente ${f.semente}): ${f.erro} — ${String(f.mensagem).slice(0, 160)} [${(f.cartas || []).join(', ')}]`); }
  if (culpadas.size) { console.log('  cartas nas falhas (listas):'); for (const { carta, listas } of ordena(culpadas).slice(0, 15)) console.log(`    ${listas} · ${carta}`); }
  for (const x of resultado.filter(x => x.falhas.length).slice(0, 10)) { const f = x.falhas[0]; console.log(`  ✗ ${x.nome} × ${f.contra} (semente ${f.semente}): ${f.erro} — ${String(f.mensagem).slice(0, 160)} [${(f.cartas || []).join(', ')}]`); }
  const por = n => ordena(faltantes).filter(x => n.includes(x.nivel));
  console.log(`  o que mais impede listas de jogar, sem script (listas): ${por(['manual', 'parcial']).slice(0, 12).map(x => `${x.carta} (${x.listas})`).join(' · ')}`);
  console.log(`  lidas pelo motor, esperando a revisão (listas): ${por(['lida']).slice(0, 12).map(x => `${x.carta} (${x.listas})`).join(' · ')}`);
  console.log(`  detalhe: ${SAIDA}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
