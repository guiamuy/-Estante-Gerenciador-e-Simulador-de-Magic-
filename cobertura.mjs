// H-15 · Sentinela de cobertura do Pauper. Roda no fluxo "Catálogo", logo depois da coleta, com rede: mede cada lista Pauper do
// catálogo como o APP mede (`deckCoverage`, a mesma função da tela, sobre o texto que o aparelho baixa da Scryfall) e grava
// `cobertura/<formato>.json` no ramo `catalogo`. Nasceu do achado de 23/10/2026: a prova de partida lia o Forge e dava 514 de 517;
// o app, com o texto da Scryfall, mostrava 420 — quatro cartas aprovadas tinham mudado de redação e duas eram novas.
//
// O arquivo é a fila de trabalho do motor: cada carta pendente vem classificada e com o texto da Scryfall do dia, para quem
// cobre a carta não precisar buscar de novo.
//   texto-mudou · aprovada (APROVADAS) com outro texto: a redação mudou na Scryfall; reaprovar se o leitor chega ao mesmo script
//   lida        · o leitor lê a carta inteira, falta a revisão por lote
//   nova        · nem script nem leitura: frase ou mecânica que o motor ainda não tem
//   parcial     · script à mão declarado parcial (o que falta está na nota)
//   sem-dados   · a Scryfall não devolveu a carta (nome diferente ou falha da rede): repetir na próxima coleta
// Não é teste do portão e nunca derruba a coleta: falha da Scryfall vira "parcial" no relatório (ou mantém o anterior).
//
// I-300 · também mede o Commander (pedido do dono de 24/10). Cada carta pendente traz `gulosa`: a ordem em que ela é preciso para fechar
// as listas pela ordem gulosa (a lista com menos cartas faltando primeiro, contando como resolvidas as cartas das listas anteriores);
// `curva` diz quantas cartas fecham 1, 5, 10, 25… listas. `--textos N` guarda o texto da Scryfall só nas N primeiras cartas dessa ordem
// (o Commander tem milhares de cartas pendentes; o texto do dia vai para as que o motor cobre primeiro).
//
// H-16 · fila de revisão e competitivos (plano do dono de 24/10, "competitivos primeiro"): toda carta `lida` ou `texto-mudou` leva o
// texto da Scryfall do dia, além das N primeiras da ordem gulosa (é a fila de quem revisa e aprova; sem o texto, a revisão teria de
// buscar de novo); `cartasDaScryfall` aceita um cache para não pedir de novo o que já veio; e cada execução regrava
// `cobertura/resumo.json`: uma linha por formato e a ordem gulosa somada dos competitivos de 60 cartas (Modern, Standard, Pioneer,
// Legacy, Vintage) — a ordem de trabalho do motor.
//
// H-17 · `rodada`: na linha de comando, um cache para todos os formatos do processo e `--textos-competitivos N`.
//
// Uso: node cobertura.mjs --catalogo <pasta do ramo catalogo> [--formato pauper|todos] [--exceto a,b] [--textos N] [--textos-competitivos N]
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadModules } from './_load.mjs';

const M = loadModules();
const S = M.scripts, SF = M.scryfall, norm = M.cards.norm, BASIC = M.cards.BASIC_CARDS;
export const UA = 'estante-catalogo (+https://github.com/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-)';
export const CLASSES = ['texto-mudou', 'lida', 'nova', 'parcial', 'sem-dados'];
export const REVISAO = new Set(['texto-mudou', 'lida']); // H-16 · classes que esperam só a revisão: o texto do dia vai sempre
export const COMPETITIVOS = ['modern', 'standard', 'pioneer', 'legacy', 'vintage']; // H-16 · competitivos de 60 cartas

/** Cartas da Scryfall por nome (lotes de 75, o limite da /cards/collection). Devolve { cartas: Map(norm(nome) → carta crua), falhas }. */
/** H-16 · cache entre chamadas: `pedidos` = nomes já respondidos por um lote que deu certo (achados ou não). */
export const novoCache = () => ({ cartas: new Map(), pedidos: new Set() });
export async function cartasDaScryfall(nomes, { busca = globalThis.fetch, pausa = 120, log = () => {}, cache = null } = {}) {
  const cartas = new Map(); let falhas = 0;
  const todos = [...new Set(nomes)].filter(n => !BASIC[norm(n)]);
  const lista = cache ? todos.filter(n => !cache.pedidos.has(norm(n))) : todos;
  for (let i = 0; i < lista.length; i += 75) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await busca('https://api.scryfall.com/cards/collection', { method: 'POST', signal: ctl.signal, body: JSON.stringify({ identifiers: lista.slice(i, i + 75).map(name => ({ name: String(name).split(' // ')[0] })) }),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      for (const c of (j && j.data) || []) { cartas.set(norm(c.name), c); if (String(c.name).includes(' // ')) cartas.set(norm(c.name.split(' // ')[0]), c); }
      if (cache) for (const n of lista.slice(i, i + 75)) cache.pedidos.add(norm(n));
    } catch (e) { falhas++; log(`✗ Scryfall (lote ${i / 75 + 1}): ${e.message}`); }
    finally { clearTimeout(t); }
    if (pausa && i + 75 < lista.length) await new Promise(r => setTimeout(r, pausa));
  }
  if (cache) {
    for (const [k, c] of cartas) cache.cartas.set(k, c);
    for (const n of todos) { const k = norm(n), c = cache.cartas.get(k) || cache.cartas.get(norm(String(n).split(' // ')[0])); if (c && !cartas.has(k)) cartas.set(k, c); }
  }
  return { cartas, falhas };
}

/** Classe de uma carta pendente (null = joga). `crua` é a carta como a Scryfall devolve; o app a passa por normalizeCard. */
export function classifica(nome, crua) {
  if (!crua && !S.SCRIPTS[nome] && !BASIC[norm(nome)]) return { classe: 'sem-dados', nivel: 'manual', motivo: 'a Scryfall não devolveu a carta' };
  const c = crua ? SF.normalizeCard(crua) : { name: nome };
  const cv = S.coverage(c, S.SCRIPTS, nome);
  if (cv.level === 'completo') return null;
  if (S.SCRIPTS[nome] || S.SCRIPTS[String(nome).split(' // ')[0]]) return { classe: 'parcial', nivel: cv.level, motivo: cv.reason };
  const aprovada = S.APROVADAS[nome] || S.APROVADAS[String(nome).split(' // ')[0]];
  if (aprovada) return { classe: 'texto-mudou', nivel: cv.level, motivo: `aprovada na ${aprovada.leva} com outro texto` };
  if (cv.level === 'lida') return { classe: 'lida', nivel: cv.level, motivo: cv.reason };
  return { classe: 'nova', nivel: cv.level, motivo: cv.reason };
}

const textoDe = c => !c ? null : {
  mana_cost: c.mana_cost || '', type_line: c.type_line || '', oracle_text: c.oracle_text || '', keywords: c.keywords || [], layout: c.layout || 'normal',
  ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}), ...(c.loyalty != null ? { loyalty: c.loyalty } : {}),
  ...(Array.isArray(c.card_faces) ? { card_faces: c.card_faces.map(f => ({ name: f.name, mana_cost: f.mana_cost || '', type_line: f.type_line || '', oracle_text: f.oracle_text || '', ...(f.power != null ? { power: f.power, toughness: f.toughness } : {}) })) } : {}) };

/** Mede as listas (forma do ramo catalogo: { id, nome, entradas: [{ name, qty, zone }] }) com as cartas da Scryfall. */
/** I-300 · ordem gulosa: fecha primeiro a lista com menos cartas ainda não resolvidas. Devolve { ordem: Map(nome → passo), curva }. */
export const MARCOS = [1, 5, 10, 25, 50, 100, 200, 500, 1000];
export function gulosa(incompletas, base = 0) {
  const resto = incompletas.map(l => [...new Set(l.faltam)]), feito = new Array(resto.length).fill(false), ordem = new Map(), curva = [];
  for (let passo = 1; passo <= resto.length; passo++) {
    let bi = -1, bn = Infinity;
    for (let i = 0; i < resto.length; i++) if (!feito[i]) { let n = 0; for (const c of resto[i]) if (!ordem.has(c)) n++; if (n < bn) { bn = n; bi = i; } }
    feito[bi] = true; for (const c of resto[bi]) if (!ordem.has(c)) ordem.set(c, passo);
    if (MARCOS.includes(passo) || passo === resto.length) curva.push({ listas: base + passo, cartas: ordem.size });
  }
  return { ordem, curva };
}

/** H-16 · resumo dos relatórios de `cobertura/`: uma linha por formato e a ordem gulosa somada dos competitivos de 60 cartas
    (as listas incompletas dos cinco formatos juntas, contando as já a 100%), com as `top` primeiras cartas dessa ordem. Puro. */
export function resumo(relatorios, { agora = new Date().toISOString(), competitivos = COMPETITIVOS, top = 300 } = {}) {
  const rels = relatorios.filter(r => r && r.versao === 1 && typeof r.formato === 'string' && Array.isArray(r.pendentes));
  const formatos = rels.map(r => ({ formato: r.formato, geradoEm: r.geradoEm, motor: r.motor, listas: r.listas, listas100: r.listas100,
    cartasPendentes: r.cartasPendentes, porClasse: r.porClasse, parcial: !!r.parcial })).sort((a, b) => a.formato.localeCompare(b.formato));
  const comp = rels.filter(r => competitivos.includes(r.formato));
  const info = new Map();
  for (const r of comp) for (const p of r.pendentes) {
    const i = info.get(p.name) || { classe: p.classe, listas: 0, formatos: [], texto: false };
    i.listas += p.listas || 0; i.formatos.push(r.formato); i.texto = i.texto || !!p.texto; info.set(p.name, i);
  }
  const base = comp.reduce((n, r) => n + (r.listas100 || 0), 0);
  const { ordem, curva } = gulosa(comp.flatMap(r => r.listasIncompletas || []), base);
  const lista = [...ordem].sort((a, b) => a[1] - b[1] || (info.get(b[0])?.listas || 0) - (info.get(a[0])?.listas || 0) || a[0].localeCompare(b[0]))
    .slice(0, top).map(([name, g]) => ({ name, gulosa: g, ...(info.get(name) || { classe: 'nova', listas: 0, formatos: [], texto: false }) }));
  return { versao: 1, geradoEm: agora, formatos,
    competitivos: { formatos: comp.map(r => r.formato).sort(), listas: comp.reduce((n, r) => n + (r.listas || 0), 0), listas100: base,
      cartasPendentes: info.size, porClasse: Object.fromEntries(CLASSES.map(c => [c, [...info.values()].filter(i => i.classe === c).length])), curva, ordem: lista } };
}
const FORA_DO_RESUMO = new Set(['motor.json', 'resumo.json']); // H-16 · motor.json é o selo do app (Q10-7b), não um relatório
/** H-16 · lê os relatórios gravados em `<pasta>/cobertura` e grava `cobertura/resumo.json`. Nunca lança. */
export function gravaResumo(pasta, { agora, log = console.log } = {}) {
  try {
    const dir = join(pasta, 'cobertura'); if (!existsSync(dir)) return null;
    const rels = readdirSync(dir).filter(f => f.endsWith('.json') && !FORA_DO_RESUMO.has(f))
      .map(f => { try { return JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { return null; } });
    const r = resumo(rels, { agora }); writeFileSync(join(dir, 'resumo.json'), JSON.stringify(r, null, 1) + '\n');
    const c = r.competitivos;
    log(`Resumo: ${r.formatos.map(f => `${f.formato} ${f.listas100}/${f.listas}`).join(' · ')} · competitivos ${c.listas100}/${c.listas}, ${c.cartasPendentes} carta(s) pendente(s)${c.curva.length ? `, curva ${c.curva.map(x => `${x.listas}→${x.cartas}`).join(' · ')}` : ''}`);
    return r;
  } catch (e) { log(`✗ resumo: ${e && e.message}`); return null; }
}

export function mede(listas, cartas, { formato = 'pauper', agora = new Date().toISOString(), falhas = 0, anterior = null, textos = Infinity } = {}) {
  const porNome = new Map(); let ok = 0; const incompletas = [];
  const mapa = new Map([...cartas].map(([k, c]) => [k, SF.normalizeCard(c)]));
  for (const l of listas) {
    const en = (l.entradas || []).filter(e => e.zone !== 'side' && e.zone !== 'maybe').map(e => ({ ...e, key: norm(e.name) }));
    const cv = S.deckCoverage(en, mapa);
    if (cv.completo === cv.total && cv.total > 0) { ok++; continue; }
    const faltam = [...new Set(cv.pending.map(x => x.name))];
    incompletas.push({ id: l.id, nome: l.nome || l.id, faltam });
    for (const n of faltam) porNome.set(n, (porNome.get(n) || 0) + 1);
  }
  const { ordem, curva } = gulosa(incompletas, ok);
  const comTexto = new Set([...porNome.keys()].sort((a, b) => ordem.get(a) - ordem.get(b) || porNome.get(b) - porNome.get(a) || a.localeCompare(b)).slice(0, textos));
  const pendentes = [...porNome].map(([name, nListas]) => {
    const crua = cartas.get(norm(name)) || null; const k = classifica(name, crua) || { classe: 'nova', nivel: 'manual', motivo: 'sem cobertura' };
    return { name, ...k, listas: nListas, gulosa: ordem.get(name), texto: comTexto.has(name) ? textoDe(crua) : null };
  }).sort((a, b) => b.listas - a.listas || a.name.localeCompare(b.name));
  for (const p of pendentes) if (!p.texto && REVISAO.has(p.classe)) p.texto = textoDe(cartas.get(norm(p.name)) || null); // H-16 · a fila de revisão sempre leva o texto do dia
  const antes = new Set(((anterior && anterior.pendentes) || []).map(p => p.name)), agoraSet = new Set(pendentes.map(p => p.name));
  return {
    versao: 1, formato, geradoEm: agora, motor: M.engine.ENGINE_VERSION, fonte: 'api.scryfall.com/cards/collection',
    listas: listas.length, listas100: ok, cartasPendentes: pendentes.length, parcial: falhas > 0, lotesComFalha: falhas,
    porClasse: Object.fromEntries(CLASSES.map(c => [c, pendentes.filter(p => p.classe === c).length])),
    novasDesdeAnterior: anterior ? pendentes.filter(p => !antes.has(p.name)).map(p => p.name) : [],
    resolvidasDesdeAnterior: anterior ? [...antes].filter(n => !agoraSet.has(n)) : [],
    curva, textos: Number.isFinite(textos) ? textos : null, pendentes, listasIncompletas: incompletas,
  };
}

/** Q10-7b (relato #32) · a porcentagem de cada lista que roda no motor, pela mesma conta do selo do app
    (`motorDaLista`: cópias do deck principal e do comandante; 100 só com tudo coberto). { id → [pct, cartas que faltam] };
    lista sem carta no deck fica fora. */
export function porcentagens(listas, cartas) {
  const mapa = new Map([...cartas].map(([k, c]) => [k, SF.normalizeCard(c)])), memo = new Map(), out = {};
  for (const l of listas) {
    const m = M.listas.motorDaLista((l.entradas || []).filter(e => e.zone !== 'maybe'), mapa, memo);
    if (m.total > 0) out[l.id] = [m.pct, m.faltam.length];
  }
  return out;
}
export const ARQ_MOTOR = 'motor.json'; // cobertura/motor.json: o que o app lê (pequeno; os relatórios por formato não)
/** Junta a medida de um formato ao arquivo que o app lê: as listas desse formato são trocadas pelas de agora, as dos
    outros formatos ficam, e lista que saiu do catálogo sai. */
export function juntaMotor(anterior, { formato, pct, idsDoCatalogo, idsDoFormato, agora, motor }) {
  const base = anterior && anterior.versao === 1 && anterior.pct && typeof anterior.pct === 'object' ? anterior : { pct: {}, formatos: {} };
  const fica = Object.entries(base.pct).filter(([id]) => idsDoCatalogo.has(id) && !idsDoFormato.has(id));
  const formatos = { ...(base.formatos || {}), [formato]: { geradoEm: agora, motor, listas: idsDoFormato.size, medidas: Object.keys(pct).length,
    listas100: Object.values(pct).filter(v => v[0] === 100).length } }; // G-311 · relato #36: o Jogar abre o formato só com todas a 100%
  return { versao: 1, geradoEm: agora, formatos, pct: Object.fromEntries([...fica, ...Object.entries(pct)].sort((a, b) => (a[0] < b[0] ? -1 : 1))) };
}
/** Lê as listas de um formato na pasta do ramo catalogo (indice.json + listas/<id>.json). */
export function listasDoCatalogo(pasta, formato = 'pauper') {
  const idx = JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8'));
  return (idx.listas || []).filter(r => r.formato === formato).map(r => {
    try { return JSON.parse(readFileSync(join(pasta, 'listas', `${r.id}.json`), 'utf8')); } catch { return null; }
  }).filter(Boolean);
}

/** Q10-7c · os formatos que o catálogo tem hoje (na ordem do índice), menos os de `exceto`. */
export function formatosDoCatalogo(pasta, exceto = []) {
  const idx = JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8')), fora = new Set(exceto);
  return [...new Set((idx.listas || []).map(r => r.formato).filter(f => typeof f === 'string' && /^[a-z0-9-]{1,30}$/.test(f) && !fora.has(f)))];
}
/** Q10-7c · mede vários formatos, um depois do outro; a falha de um não impede os outros. */
export async function executaVarios({ pasta, formatos, log = console.log, ...resto } = {}) {
  const feitos = [];
  for (const formato of formatos) {
    try { const r = await executa({ pasta, formato, log, ...resto }); feitos.push([formato, !!r.gravado]); }
    catch (e) { log(`✗ sentinela ${formato}: ${e && e.message}`); feitos.push([formato, false]); }
  }
  return feitos;
}
/** H-17 · configuração da rodada pela linha de comando (fluxo Catálogo): um cache para todos os formatos do mesmo processo e o texto
    do dia nas N primeiras cartas da ordem gulosa dos competitivos de 60 cartas. Fora da linha de comando fica desligada. */
export const rodada = { cache: null, textosCompetitivos: null };
/** H-17 · põe o texto do dia nas `n` primeiras pendentes da ordem gulosa de um relatório competitivo (as outras ficam como `mede` deixou). */
export function textosDosCompetitivos(rel, cartas, n) {
  if (n == null || !(n >= 0) || !COMPETITIVOS.includes(rel.formato)) return rel;
  const primeiras = [...rel.pendentes].sort((a, b) => (a.gulosa ?? Infinity) - (b.gulosa ?? Infinity) || b.listas - a.listas || a.name.localeCompare(b.name)).slice(0, n);
  for (const p of primeiras) if (!p.texto) p.texto = textoDe(cartas.get(norm(p.name)) || null);
  rel.textosCompetitivos = n;
  return rel;
}
export async function executa({ pasta, formato = 'pauper', busca = globalThis.fetch, pausa = 120, log = console.log, agora, textos = Infinity } = {}) {
  const listas = listasDoCatalogo(pasta, formato);
  const nomes = [...new Set(listas.flatMap(l => (l.entradas || []).filter(e => e.zone !== 'side' && e.zone !== 'maybe').map(e => e.name)))];
  const { cartas, falhas } = await cartasDaScryfall(nomes, { busca, pausa, log, cache: rodada.cache });
  const arq = join(pasta, 'cobertura', `${formato}.json`);
  const anterior = existsSync(arq) ? (() => { try { return JSON.parse(readFileSync(arq, 'utf8')); } catch { return null; } })() : null;
  if (!cartas.size && nomes.length) { log('✗ a Scryfall não respondeu: o relatório anterior fica como está'); return { gravado: false, anterior }; }
  const rel = mede(listas, cartas, { formato, agora, falhas, anterior, textos });
  textosDosCompetitivos(rel, cartas, rodada.textosCompetitivos); // H-17
  mkdirSync(join(pasta, 'cobertura'), { recursive: true });
  writeFileSync(arq, JSON.stringify(rel, null, 1) + '\n');
  if (!rel.parcial) { // medida pela metade não vai para o selo do app: fica a anterior
    const arqM = join(pasta, 'cobertura', ARQ_MOTOR);
    const antM = existsSync(arqM) ? (() => { try { return JSON.parse(readFileSync(arqM, 'utf8')); } catch { return null; } })() : null;
    const idx = JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8')), todas = idx.listas || [];
    const junto = juntaMotor(antM, { formato, pct: porcentagens(listas, cartas), agora: rel.geradoEm, motor: rel.motor,
      idsDoCatalogo: new Set(todas.map(r => r.id)), idsDoFormato: new Set(todas.filter(r => r.formato === formato).map(r => r.id)) });
    writeFileSync(arqM, JSON.stringify(junto) + '\n');
  }
  log(`Cobertura ${formato} (texto da Scryfall, motor v${rel.motor}): ${rel.listas100} de ${rel.listas} listas a 100% · ${rel.cartasPendentes} carta(s) pendente(s) ${JSON.stringify(rel.porClasse)}${rel.parcial ? ` · ${falhas} lote(s) sem resposta` : ''}`);
  if (rel.curva.length) log(`  ordem gulosa (listas a 100% → cartas a cobrir): ${rel.curva.map(c => `${c.listas}→${c.cartas}`).join(' · ')}`);
  if (rel.novasDesdeAnterior.length) log(`  novas desde a coleta anterior: ${rel.novasDesdeAnterior.join(', ')}`);
  gravaResumo(pasta, { agora: rel.geradoEm, log }); // H-16
  return { gravado: true, relatorio: rel };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
  if (!o.catalogo) { console.error('Informe --catalogo <pasta do ramo catalogo>'); process.exit(2); }
  const textos = Number.parseInt(o.textos, 10);
  const opc = { pasta: o.catalogo, textos: textos >= 0 ? textos : Infinity };
  // H-17 · a rodada (vários formatos no mesmo processo) busca cada nome uma vez; `--textos-competitivos N`: o texto do dia nas N primeiras dos competitivos
  rodada.cache = novoCache(); { const tc = Number.parseInt(o['textos-competitivos'], 10); if (tc >= 0) rodada.textosCompetitivos = tc; }
  // Q10-7c · `--formato todos --exceto pauper,commander`: os demais formatos do catálogo, cada um no seu relatório
  const vai = o.formato === 'todos' ? executaVarios({ ...opc, formatos: formatosDoCatalogo(o.catalogo, String(o.exceto || '').split(',').filter(Boolean)) })
    : executa({ ...opc, formato: o.formato || 'pauper' });
  vai.catch(e => { console.error('✗ sentinela:', e && e.message); }).finally(() => process.exit(0));
}
