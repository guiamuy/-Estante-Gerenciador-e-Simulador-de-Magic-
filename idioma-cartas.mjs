#!/usr/bin/env node
/* G-365 · T-IDIOMA fatia 3 (relatos #53/#66): a tradução precisa da carta que NUNCA saiu impressa no idioma.

   Decisão do dono (08/11/2026): o texto das cartas fora da imagem segue o idioma do app; primeiro o texto oficial impresso
   (G-356); para a carta que nunca saiu impressa nele, tradução precisa, marcada "Tradução", com um toque para o original.
   Meio escolhido: "robô" (o recomendado; modo agilidade, 09/11) — a rotina na nuvem do Claude traduz uma vez cada carta das
   listas e grava em idiomas/cartas-<idioma>.json, que o app baixa e guarda. A partida segue decidida pelo Oracle em inglês.

   O conferidor (`confere`) barra a tradução que:
     - muda, tira ou acrescenta símbolo de mana ou de custo ({T}, {U}, {2}, {X}…);
     - muda, tira ou acrescenta número escrito em algarismos (3 de dano, +1/+1, 20 de vida);
     - perde uma palavra-chave do Oracle (o termo oficial do glossário tem de aparecer: Flying → voar / vuela);
     - perde o nome da carta quando o Oracle o cita;
     - fica vazia, igual ao inglês ou fora do formato.
   O app só mostra a tradução se o Oracle que ela traduziu ainda é o da carta (`original`): texto de regra mudou, a tradução
   sai até o robô refazer.

     node idioma-cartas.mjs --faltam pt     cartas das listas sem impressão e sem tradução em pt (JSON com o Oracle a traduzir)
     node idioma-cartas.mjs --faltam pt --formato standard   idem, das listas de Standard do catálogo (G-373; padrão: pauper)
     node idioma-cartas.mjs --conferir      roda o conferidor nos pacotes (sai com erro se algum falhar)

   Fontes do --faltam (ramos de dados, lidos pelo git): nomes impressos por idioma (artes:nomes-<idioma>.json, Scryfall) e
   as listas Pauper do catálogo (catalogo:listas/*.json), mais as listas do Shark (.listas/decks.json); o Oracle vem dos
   textos oficiais conferidos em .listas/oficiais*.json. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
export const IDIOMAS = ['pt', 'es'];
export const arquivoDe = lang => join(RAIZ, 'idiomas', `cartas-${lang}.json`);

/** Palavras-chave do Oracle e o termo oficial em cada idioma (pt: o mesmo nome que a mesa usa, MARCADOR_PT/PALAVRA_PT do
    index.html; es: terminologia oficial em espanhol). O termo é procurado sem maiúsculas, pelo radical. */
export const GLOSSARIO = {
  'flying': { pt: /\bvoar\b/i, es: /\bvuela\b|\bvolar\b/i },
  'first strike': { pt: /\biniciativa\b/i, es: /\bdañar primero\b|\bdaña primero\b/i },
  'double strike': { pt: /\bgolpe duplo\b/i, es: /\bdañar dos veces\b|\bdaña dos veces\b/i },
  'deathtouch': { pt: /\btoque mortífero\b/i, es: /\btoque mortal\b/i },
  'haste': { pt: /\bímpeto\b/i, es: /\bprisa\b/i },
  'hexproof': { pt: /\bresistência a magia\b/i, es: /\bantimaleficio\b/i },
  'indestructible': { pt: /\bindestrutíve(?:l|is)\b/i, es: /\bindestructible(?:s)?\b/i },
  'lifelink': { pt: /\bvínculo com a vida\b/i, es: /\bvínculo vital\b/i },
  'menace': { pt: /\bameaçar\b/i, es: /\bamenaza\b/i },
  'reach': { pt: /\balcance\b/i, es: /\balcance\b/i },
  'trample': { pt: /\batropelar\b/i, es: /\barroll(?:ar|a)\b/i },
  'vigilance': { pt: /\bvigilância\b/i, es: /\bvigilancia\b/i },
  'defender': { pt: /\bdefensor\b/i, es: /\bdefensor\b/i },
  'flash': { pt: /\blampejo\b/i, es: /\bdestello\b/i },
  'flashback': { pt: /\blampejo do passado\b/i, es: /\bretrospectiva\b/i },
  'scry': { pt: /\bvidência\b/i, es: /\badivina\b/i },
  'equip': { pt: /\bequipar\b/i, es: /\bequipar\b/i },
  'enchant': { pt: /\bencantar\b/i, es: /\bencantar\b/i },
  'changeling': { pt: /\bmutável\b/i, es: /\bcambiaformas\b/i },
  'ward': { pt: /\bsalvaguarda\b/i, es: /\bcustodia\b/i }, // G-386 · termo impresso oficial (Scryfall, printed_text pt, 13/11/2026); "Proteção" é protection
};

// o \b do JavaScript não conhece letra acentuada ("ímpeto"): a fronteira de palavra vira a de letra Unicode
const FRONTEIRA = '(?:(?<!\\p{L})(?=\\p{L})|(?<=\\p{L})(?!\\p{L}))';
const uni = rx => new RegExp(rx.source.replace(/\\b/g, FRONTEIRA), 'iu');
const SIMBOLOS = /\{[^}]+\}/g;
const NUMEROS = /\d+/g;
const contagem = xs => xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
const iguais = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
const semLembrete = t => String(t || '').replace(/\([^()]*\)/g, ' ');
/** O Oracle comparável: sem espaço sobrando, sem diferença de aspas e travessões (o que a Scryfall troca sem mudar a regra). */
export const normaliza = t => String(t || '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/−/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();

/** Palavras-chave do glossário presentes no Oracle (fora do texto de lembrete e fora do nome da carta). */
export function palavrasDe(oracle, nome = '') {
  let t = semLembrete(oracle);
  if (nome) for (const n of String(nome).split(' // ')) t = t.split(n).join(' ');
  t = t.toLowerCase();
  const achadas = [];
  for (const k of Object.keys(GLOSSARIO)) {
    const rx = new RegExp(`(^|[^a-z])${k}([^a-z]|$)`, 'i');
    if (!rx.test(t)) continue;
    if (k === 'flash' && /flashback/.test(t) && !/(^|[^a-z])flash([^a-z]|$)/.test(t.replace(/flashback/g, ''))) continue;
    achadas.push(k);
  }
  return achadas;
}

/** Uma face: texto inglês × traduzido. Devolve a lista de problemas (vazia = passa). */
export function confereTexto(original, traduzido, lang, nome = '') {
  const erros = [];
  const o = String(original || ''), t = String(traduzido || '');
  if (!o.trim()) return t.trim() ? ['texto traduzido sem Oracle'] : [];
  if (!t.trim()) return ['tradução vazia'];
  if (normaliza(o) === normaliza(t)) erros.push('igual ao inglês');
  if (!iguais(contagem(o.match(SIMBOLOS) || []), contagem(t.match(SIMBOLOS) || []))) erros.push(`símbolos: ${(o.match(SIMBOLOS) || []).join('')} × ${(t.match(SIMBOLOS) || []).join('')}`);
  const so = o.replace(SIMBOLOS, ' '), st = t.replace(SIMBOLOS, ' ');
  if (!iguais(contagem(so.match(NUMEROS) || []), contagem(st.match(NUMEROS) || []))) erros.push(`números: ${(so.match(NUMEROS) || []).join(',')} × ${(st.match(NUMEROS) || []).join(',')}`);
  for (const k of palavrasDe(o, nome)) { const g = GLOSSARIO[k][lang]; if (g && !uni(g).test(t)) erros.push(`palavra-chave "${k}" sem o termo oficial`); }
  if (nome) for (const n of String(nome).split(' // ')) {
    const no = o.split(n).length - 1; if (!no) continue;
    if (t.split(n).length - 1 < no) erros.push(`o nome "${n}" sumiu`);
  }
  return erros;
}

/** Uma entrada do pacote: `{ original, tipo, texto }` ou, com duas faces, `{ original: [..], faces: [{ tipo, texto }] }`. */
export function confere(nome, e, lang) {
  if (!e || typeof e !== 'object') return ['entrada inválida'];
  if (Array.isArray(e.original)) {
    if (!Array.isArray(e.faces) || e.faces.length !== e.original.length) return ['faces e original não batem'];
    // G-374 · o app procura a carta pelo `name` da Scryfall, que na carta de duas faces é "Frente // Verso"
    const chave = String(nome).split(' // ').length !== e.faces.length ? [`chave "${nome}" sem o nome inteiro "Frente // Verso" (o app nunca acha)`] : [];
    return chave.concat(e.faces.flatMap((f, i) => {
      const er = confereTexto(e.original[i], f && f.texto, lang, nome);
      if (!f || typeof f.tipo !== 'string' || !f.tipo.trim()) er.push('face sem tipo');
      return er.map(x => `face ${i + 1}: ${x}`);
    }));
  }
  const er = confereTexto(e.original, e.texto, lang, nome);
  if (typeof e.tipo !== 'string' || !e.tipo.trim()) er.push('sem tipo');
  return er;
}

export function lePacote(lang) {
  const f = arquivoDe(lang);
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : { v: 1, idioma: lang, cartas: {} };
}

/** Todo o pacote: `{ nome: [erros] }` só das entradas que falham. */
export function conferePacote(p, lang) {
  const r = {};
  for (const [nome, e] of Object.entries((p && p.cartas) || {})) { const er = confere(nome, e, lang); if (er.length) r[nome] = er; }
  return r;
}

const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 28 });
/** Cartas das listas sem impressão no idioma e sem tradução no pacote, com o Oracle conhecido (ou null). */
export function faltam(lang, { impressos, listas, textos, pacote = lePacote(lang) } = {}) {
  const tem = new Set(impressos);
  // G-368 · a lista cita a carta de duas faces pela frente ("Fang Dragon"); o app procura pelo nome inteiro da Scryfall
  // ("Fang Dragon // Forktail Sweep"): o --faltam devolve o nome inteiro, que é a chave do pacote
  // G-374 · e a carta de duas faces (ou com aventura) que a fonte guardou pela frente, com `card_faces`: o nome inteiro sai
  // das faces ("Callous Sell-Sword // Burn Together"), que é o `name` da Scryfall que o app procura
  const inteiro = n => { const t = textos.get(n); if (!t) return n;
    const fs = Array.isArray(t.card_faces) && t.card_faces.length > 1 && t.card_faces.every(f => f && typeof f.name === 'string' && f.name) ? t.card_faces : null;
    return t.nome && t.nome.includes(' // ') ? t.nome : fs ? fs.map(f => f.name).join(' // ') : (t.nome || n); };
  const fora = [...new Set(listas.map(inteiro))].filter(n => !tem.has(n) && !tem.has(n.split(' // ')[0]) && !(pacote.cartas || {})[n]);
  return fora.sort().map(n => { const t = textos.get(n) || textos.get(n.split(' // ')[0]); return { nome: n, oracle: t ? { type_line: t.type_line, oracle_text: t.oracle_text, card_faces: t.card_faces } : null }; });
}

/** G-368 · guarda o Oracle de uma carta lida de uma fonte. A carta de duas faces vem como frente + `verso` (formato de
    .listas/oficiais*.json) ou com `card_faces` (Scryfall): fica pelo nome inteiro "Frente // Verso", com as faces, e a
    frente sozinha aponta para ele. A primeira fonte que traz a carta vale. */
export function registraTexto(textos, nome, x) {
  if (!x || typeof nome !== 'string' || !nome) return;
  const v = x.verso && typeof x.verso === 'object' && typeof x.verso.name === 'string' ? x.verso : null;
  if (v) {
    const inteiro = nome.includes(' // ') ? nome : `${nome} // ${v.name}`; // a Sala já vem com o nome inteiro
    if (textos.has(inteiro)) return;
    const faces = [{ name: inteiro.split(' // ')[0], type_line: x.type_line, oracle_text: x.oracle_text }, { name: v.name, type_line: v.type_line || v.types, oracle_text: v.oracle_text }];
    const e = { nome: inteiro, type_line: `${x.type_line || ''} // ${v.type_line || v.types || ''}`, oracle_text: undefined, card_faces: faces };
    textos.set(inteiro, e);
    const frente = inteiro.split(' // ')[0];
    if (!textos.has(frente)) textos.set(frente, e);
    return;
  }
  const faces = Array.isArray(x.card_faces) && x.card_faces.length > 1 ? x.card_faces : null;
  if (faces && nome.includes(' // ')) {
    if (textos.has(nome)) return;
    const e = { nome, type_line: x.type_line, oracle_text: undefined, card_faces: faces.map(f => ({ name: f.name, type_line: f.type_line, oracle_text: f.oracle_text })) };
    textos.set(nome, e);
    const frente = nome.split(' // ')[0];
    if (!textos.has(frente)) textos.set(frente, e);
    return;
  }
  if (typeof x.oracle_text !== 'string' || textos.has(nome)) return;
  textos.set(nome, { nome, type_line: x.type_line, oracle_text: x.oracle_text, card_faces: x.card_faces });
}

/** G-373 · lote 3: além do Pauper (padrão), as listas de outros formatos do catálogo (`--formato standard,pioneer`). */
export const FORMATOS_PADRAO = ['pauper'];
export function formatosDe(args = []) {
  const i = args.indexOf('--formato');
  const f = i >= 0 && args[i + 1] ? args[i + 1].split(',').map(x => x.trim().toLowerCase()).filter(Boolean) : [];
  return f.length ? f : FORMATOS_PADRAO;
}
export function fontes(lang, formatos = FORMATOS_PADRAO) {
  const impressos = JSON.parse(git('show', `origin/artes:nomes-${lang}.json`)).pares.map(p => p[1]);
  const listas = [];
  for (const f of git('ls-tree', '--name-only', 'origin/catalogo', 'listas/').split('\n').filter(Boolean)) {
    const j = JSON.parse(git('show', `origin/catalogo:${f}`));
    if (formatos.includes(j.formato)) for (const e of j.entradas || []) listas.push(e.name);
  }
  for (const l of Object.values(JSON.parse(readFileSync(join(RAIZ, '.listas/decks.json'), 'utf8')))) listas.push(...Object.keys(l));
  const textos = juntaTextos([
    ...readdirSync(join(RAIZ, '.listas')).filter(f => /^oficiais.*\.json$/.test(f)).sort((a, b) => (b === 'oficiais-revisadas.json') - (a === 'oficiais-revisadas.json'))
      .map(f => JSON.parse(readFileSync(join(RAIZ, '.listas', f), 'utf8'))),
    // G-368 · depois das oficiais: o Oracle que a cobertura do catálogo guardou (Scryfall) e o lido do Forge para o idioma
    ...git('ls-tree', '--name-only', 'origin/catalogo', 'cobertura/').split('\n').filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(git('show', `origin/catalogo:${f}`)); } catch (e) { return null; } }),
    ...textosDoIdioma(),
  ]);
  return { impressos, listas, textos };
}

/** G-368 · o Oracle lido do Forge para o idioma (idiomas/oficiais-*.json), local: o teste usa sem os ramos de dados. */
export const textosDoIdioma = () => readdirSync(join(RAIZ, 'idiomas')).filter(f => /^oficiais-.*\.json$/.test(f)).map(f => JSON.parse(readFileSync(join(RAIZ, 'idiomas', f), 'utf8')));

/** O Oracle de cada carta, de várias fontes em ordem (a primeira que traz a carta vale). */
export function juntaTextos(fontes) {
  const textos = new Map();
  const anda = x => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(anda);
    if (typeof x.name === 'string' && (typeof x.oracle_text === 'string' || x.verso || Array.isArray(x.card_faces))) registraTexto(textos, x.name, x);
    // G-368 · cobertura do catálogo: { name, texto: { oracle_text, type_line, card_faces } }
    if (typeof x.name === 'string' && x.texto && typeof x.texto === 'object') registraTexto(textos, x.name, x.texto);
    for (const [k, v] of Object.entries(x)) { if (v && typeof v === 'object' && typeof v.oracle_text === 'string' && !v.name) registraTexto(textos, k, v); if (k !== 'verso') anda(v); } };
  for (const f of fontes) anda(f);
  return textos;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [op, lang, ...resto] = process.argv.slice(2);
  const formatos = formatosDe(resto);
  if (op === '--faltam' && IDIOMAS.includes(lang)) {
    console.log(JSON.stringify(faltam(lang, fontes(lang, formatos)), null, 1));
  } else if (op === '--conferir') {
    let ruins = 0;
    for (const l of IDIOMAS) { const r = conferePacote(lePacote(l), l); for (const [n, e] of Object.entries(r)) { ruins++; console.log(`✗ ${l} · ${n}: ${e.join('; ')}`); } console.log(`${l}: ${Object.keys(lePacote(l).cartas || {}).length} traduções`); }
    process.exit(ruins ? 1 : 0);
  } else {
    console.log('uso: node idioma-cartas.mjs --faltam pt|es [--formato standard,pauper]  ·  node idioma-cartas.mjs --conferir');
    process.exit(2);
  }
}
