// Mede a cobertura do motor em cada lista salva, usando EXATAMENTE a mesma função
// que a tela de jogar usa (deckCoverage). Antes esta ferramenta tinha uma lista
// branca escrita à mão de cartas que eu "supunha" cobertas pelo texto, e isso
// dava 100% falso: o app lia o texto real e contava a carta como manual.
// Regra agora: carta sem script só conta como completa se o texto real disser
// que o motor dá conta — e o texto vem de .listas/cartas.json, conferido na fonte.
import { readFileSync, existsSync } from 'node:fs';
import { loadModules } from '../_load.mjs';
const { scripts: S, cards: C } = loadModules();
const decks = JSON.parse(readFileSync(new URL('./decks.json', import.meta.url), 'utf8'));
const textos = existsSync(new URL('./cartas.json', import.meta.url))
  ? JSON.parse(readFileSync(new URL('./cartas.json', import.meta.url), 'utf8')) : {};
const BASICS = { Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' };

/** Carta como o app a veria: script pelo nome, texto do arquivo, ou nada. */
function carta(nome) {
  if (BASICS[nome]) return { name: nome, type_line: `Basic Land — ${nome}`, oracle_text: `{T}: Add {${BASICS[nome]}}.`, keywords: [], cmc: 0 };
  if (textos[nome]) return textos[nome];
  return null; // sem texto: o app diria "carta desconhecida"
}

const so = process.argv[2];
let pendentes = new Map();
for (const [nome, cartas] of Object.entries(decks)) {
  if (so && !nome.toLowerCase().includes(so.toLowerCase())) continue;
  const entries = Object.entries(cartas).map(([name, qty]) => ({ name, qty, zone: 'main' }));
  const mapa = new Map();
  for (const e of entries) { const c = carta(e.name); if (c) { mapa.set(e.name, c); mapa.set(C.norm(e.name), c); } }
  const cv = S.deckCoverage(entries, mapa);
  const semTexto = entries.filter(e => !S.SCRIPTS[e.name] && !carta(e.name));
  console.log(`${nome} | ${cv.pct}% | completo ${cv.completo} · parcial ${cv.parcial} · manual ${cv.manual}`);
  if (cv.worst.length) console.log(`   falta: ${[...new Set(cv.worst)].join(', ')}`);
  if (semTexto.length) console.log(`   sem texto conferido (o app lê da Scryfall): ${semTexto.map(e => e.name).join(', ')}`);
  for (const n of new Set(cv.worst)) pendentes.set(n, (pendentes.get(n) || 0) + 1);
}
if (pendentes.size) {
  console.log('\n=== cartas que impedem 100%, por número de listas ===');
  console.log([...pendentes.entries()].sort((a, b) => b[1] - a[1]).map(([n, q]) => `${q} lista(s): ${n}`).join('\n'));
}
