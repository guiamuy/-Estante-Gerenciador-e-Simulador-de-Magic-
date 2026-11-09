#!/usr/bin/env node
/* G-361 · T-IDIOMA (relatos #53/#66): extrai do index.html todo texto de tela em português — o que os pacotes de idioma
   (idiomas/en.json, idiomas/es.json) precisam traduzir. É a base da camada obrigatória: `idioma-pacotes.unit` roda esta
   extração e barra o texto que não tiver tradução.

     node idioma-extrai.mjs                 resumo (quantos textos, quantos modelos)
     node idioma-extrai.mjs --faltam en     os textos sem tradução no pacote en (JSON), para traduzir
     node idioma-extrai.mjs --lista         todos (JSON)

   Lê só os scripts do index.html, com um leitor de JavaScript que respeita comentários, expressões regulares e
   modelos `…${x}…` (a lacuna vira {0}, {1}…). Texto com marcação HTML é partido nos pedaços de texto. Fica de fora o que
   não é tela: classes CSS, chaves, endereços, caminhos, expressões e textos em inglês. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PALAVRAS_PT = new Set(('a o as os um uma uns umas de da do das dos em na no nas nos para pra por pelo pela pelos pelas com sem ' +
  'não nao sim e ou que se mais menos já ja ainda só aqui ali isso este esta esse essa você voce seu sua seus suas meu minha ' +
  'nenhum nenhuma tudo todos todas cada outra outro outras outros ao aos à às até ate quando onde como porque mas também tambem ' +
  'vez vezes carta cartas lista listas partida partidas mesa coleção colecao jogar jogo turno vida mão mao cemitério exílio ' +
  'pilha campo grimório biblioteca terreno terrenos criatura criaturas mágica feitiço ficha fichas marcador marcadores dano ' +
  'aberto abertos aberta fechado fechada guardado guardada guardados buscando carregando salvar voltar fechar abrir buscar ' +
  'escolher trocar apagar excluir enviar copiar compartilhar entrar sair criar editar desfazer confirmar cancelar continuar ' +
  'ver mostrar esconder tocar toque segure arraste aparelho internet conta perfil relato relatos notícias notificações ' +
  'legal banida restrita comum incomum rara mítica oponente adversário dia dias hora horas minuto minutos segundo segundos ' +
  'agora hoje ontem novo nova novos novas pronto pronta prontas prontos erro aviso atenção ok').split(/\s+/));
const ACENTO = /[áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇàÀ]/;
const PALAVRAS_EN = new Set('the of and to in is it for on with you your this that be are not from by an at as or was'.split(' '));

/** Leitor de JavaScript: devolve os literais de texto, com os modelos já com {n} nas lacunas. */
export function literais(js) {
  const out = []; let i = 0; const n = js.length;
  let ultimo = ''; // último token significativo (decide se "/" abre expressão regular)
  const podeRegex = () => !ultimo || /[(,=:[!&|?{};+\-*%<>~^]$/.test(ultimo) || /^(return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)$/.test(ultimo);
  function lePlano(q) { // '…' ou "…"
    let s = ''; i++;
    while (i < n && js[i] !== q) { if (js[i] === '\\') { s += js[i] + js[i + 1]; i += 2; continue; } if (js[i] === '\n') break; s += js[i++]; }
    i++; return s;
  }
  function leModelo() { // `…${…}…` — devolve [texto com {n}, quantas lacunas]
    let s = '', k = 0; i++;
    while (i < n && js[i] !== '`') {
      if (js[i] === '\\') { s += js[i] + js[i + 1]; i += 2; continue; }
      if (js[i] === '$' && js[i + 1] === '{') { i += 2; pulaExpressao(); s += '{' + (k++) + '}'; continue; }
      s += js[i++];
    }
    i++; return s;
  }
  function pulaExpressao() { // dentro de ${ }: segue até a chave que fecha, colhendo literais de dentro também
    let prof = 1;
    while (i < n && prof > 0) {
      const c = js[i];
      if (c === '{') { prof++; i++; ultimo = '{'; continue; }
      if (c === '}') { prof--; i++; ultimo = '}'; continue; }
      if (passo()) continue;
      comum();
    }
  }
  function comum() { // espaço, nome ou pontuação: anda e lembra o último token (decide se "/" abre expressão regular)
    const c = js[i];
    if (/\s/.test(c)) { i++; return; }
    if (/[A-Za-z_$0-9]/.test(c)) { let w = ''; while (i < n && /[A-Za-z_$0-9]/.test(js[i])) w += js[i++]; ultimo = w; return; }
    ultimo = c; i++;
  }
  function passo() { // consome um token "especial" se houver; true se consumiu
    const c = js[i], d = js[i + 1];
    if (c === '/' && d === '/') { while (i < n && js[i] !== '\n') i++; return true; }
    if (c === '/' && d === '*') { const f = js.indexOf('*/', i + 2); i = f < 0 ? n : f + 2; return true; }
    if (c === "'" || c === '"') { const p0 = i; const s = lePlano(c); out.push({ texto: desescapa(s), modelo: false, pos: p0 }); ultimo = 'str'; return true; }
    if (c === '`') { const p0 = i; const s = leModelo(); out.push({ texto: desescapa(s), modelo: /\{\d+\}/.test(s), pos: p0 }); ultimo = 'str'; return true; }
    if (c === '/' && podeRegex()) { // expressão regular
      i++; let classe = false;
      while (i < n) { const e = js[i]; if (e === '\\') { i += 2; continue; } if (e === '[') classe = true; else if (e === ']') classe = false; else if (e === '/' && !classe) break; else if (e === '\n') break; i++; }
      i++; while (/[a-z]/i.test(js[i] || '')) i++; ultimo = 'rx'; return true;
    }
    return false;
  }
  while (i < n) { if (!passo()) comum(); }
  return out;
}
function desescapa(s) {
  return s.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})|\\(.)/gi, (m, a, b, c, d) => a || b || c ? String.fromCodePoint(parseInt(a || b || c, 16)) : d === 'n' ? '\n' : d === 't' ? '\t' : d);
}
/** O texto (sem marcação) é tela em português? */
export function ehTela(t) {
  const s = t.replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 600 || !/[A-Za-zÀ-ÿ]{2}/.test(s)) return false;
  if (/^(https?:|\/|\.\/|#\/|data:|mailto:|[a-z]+:\/\/)/i.test(s)) return false;
  if (/[{};]\s*$|=>|\bfunction\b|\bvar\(--|^[.#\[][\w-]|[\w-]+\s*:\s*[\w#-]+;/.test(s)) return false; // código, CSS
  if (/^[\w.$-]+$/.test(s) && /[_.$-]|[a-z][A-Z]/.test(s)) return false; // chave, id, classe, camelCase
  if (/^[a-z0-9_-]+(\s+[a-z0-9_-]+)+$/.test(s) && /[-_]/.test(s)) return false; // lista de classes
  if (/^[A-Z0-9_]+$/.test(s)) return false; // CONSTANTE
  if (/\(\?[:!=<]|\\[dswbDSWB]|\[\^|^\^|\$$|\|.*\|/.test(s) && !ACENTO.test(s.replace(/\{\d+\}/g, ''))) return false; // expressão regular
  const palavras = s.toLowerCase().match(/[a-zà-ÿ]+/g) || [];
  const pt = palavras.filter(w => PALAVRAS_PT.has(w)).length, en = palavras.filter(w => PALAVRAS_EN.has(w)).length;
  if (ACENTO.test(s)) return en <= pt + 1 || pt > 0;
  // uma palavra só: rótulo com maiúscula (Guardadas, Partidas) ou palavra comum do português (cartas, aberto)
  if (palavras.length === 1) return PALAVRAS_PT.has(palavras[0]) || /^[A-ZÀ-Ý]?[a-zà-ÿ]{2,}(ar|ir|ados?|adas?|idos?|idas?|ando|endo|indo|mente|eiros?|eiras?|agem|ivos?|ivas?|ença|ência|ura|uras)[.:!?]?$|…$/.test(s);
  return pt > 0 && pt >= en;
}
/** Os pedaços de texto de um literal (o que vira nó de texto na tela). Marcação HTML parte o texto. */
export function pedacos(texto) {
  if (!/<[a-z/!][^>]*>/i.test(texto)) return [texto];
  return texto.split(/<[^>]*>/).map(x => x.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
}
/** Os scripts do index.html (sem os que só carregam arquivo). */
export function scriptsDo(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n;\n');
}
/** Tudo o que os pacotes traduzem: { exatos: [...], modelos: [...] } (texto limpo, sem repetição). */
export function extrai(html) {
  const exatos = new Set(), modelos = new Set();
  for (const l of literais(scriptsDo(html))) {
    for (const p of pedacos(l.texto)) {
      const s = p.replace(/\s+/g, ' ').trim();
      const semLacunas = s.replace(/\{\d+\}/g, ' ');
      // modelo: a parte fixa às vezes é uma palavra só ("Descarte {0} {1}"); vale se ela for tela, com régua mais folgada
      const modeloDeTela = /\{\d+\}/.test(s) && /^[A-ZÀ-Ý][a-zà-ÿ]{3,}\b/.test(semLacunas.trim()) && !/[{};=<>]|\b(var|function|return)\b/.test(semLacunas) && !PALAVRAS_EN.has(semLacunas.trim().split(/\s+/)[0].toLowerCase());
      if (!ehTela(semLacunas) && !modeloDeTela) continue;
      if (/\{\d+\}/.test(s)) { if (s.replace(/\{\d+\}/g, '').replace(/[\s·:,.()\-–—/|+]/g, '').length >= 2) modelos.add(s); }
      else exatos.add(s);
    }
  }
  return { exatos: [...exatos].sort(), modelos: [...modelos].sort() };
}
/** O que falta no pacote (cada texto precisa estar em `exato` ou em `modelos`). */
export function faltam(extraido, pacote) {
  const exato = new Set(Object.keys((pacote && pacote.exato) || {}));
  const modelos = new Set(((pacote && pacote.modelos) || []).map(m => m[0]));
  return { exatos: extraido.exatos.filter(s => !exato.has(s)), modelos: extraido.modelos.filter(s => !modelos.has(s)) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const raiz = fileURLToPath(new URL('.', import.meta.url));
  const ex = extrai(readFileSync(raiz + 'index.html', 'utf8'));
  const a = process.argv;
  if (a.includes('--lista')) console.log(JSON.stringify(ex, null, 1));
  else if (a.includes('--faltam')) {
    const id = a[a.indexOf('--faltam') + 1];
    let p = null; try { p = JSON.parse(readFileSync(raiz + `idiomas/${id}.json`, 'utf8')); } catch (e) { p = { exato: {}, modelos: [] }; }
    console.log(JSON.stringify(faltam(ex, p), null, 1));
  } else console.log(`${ex.exatos.length} textos e ${ex.modelos.length} modelos de tela em português`);
}
