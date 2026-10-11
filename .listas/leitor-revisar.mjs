// LT7 · Revisão por lote das cartas lidas pelo motor (decisão A). Uma carta sem script à mão que o leitor lê por inteiro só joga depois
// que um revisor independente (sem acesso ao raciocínio do leitor) confere, frase a frase, o script lido contra o texto oficial.
//   node .listas/leitor-revisar.mjs --candidatas             → cartas do acervo lidas por inteiro SEM script à mão (o que a revisão destrava)
//   node .listas/leitor-revisar.mjs "Nome" ["Nome" …]        → ficha de revisão de cada carta: texto oficial × script lido, e a linha de APROVADAS
//   node .listas/leitor-revisar.mjs --lote cartas.json       → o mesmo para um arquivo [{ name, type_line, oracle_text, … }] (lista nova do dono)
//   node .listas/leitor-revisar.mjs --confere                → toda entrada de APROVADAS ainda casa com o texto guardado e continua lida por inteiro
// A linha de APROVADAS só entra em index.html (src/engine/scripts.js) depois do parecer do revisor; esta ferramenta não a grava.
import { readFileSync } from 'node:fs';
import { loadModules } from '../_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const base = new URL('./', import.meta.url);
const ACERVO = [...JSON.parse(readFileSync(new URL('oficiais.json', base), 'utf8')).cartas, ...JSON.parse(readFileSync(new URL('oficiais-commander.json', base), 'utf8')).cartas];
const porNome = Object.fromEntries(ACERVO.map(c => [c.name, c]));

/** Ficha de uma carta: o que o revisor lê. */
export function ficha(card) {
  const r = L.ler(card);
  return { name: card.name, type_line: card.type_line, oracle_text: card.oracle_text, completa: r.completa, frases: r.frases, script: r.script, erros: r.erros,
    aMao: !!S.SCRIPTS[card.name], aprovada: !!S.APROVADAS[card.name], assinatura: S.hashTexto(card.oracle_text) };
}
/** Cartas do acervo que a revisão destravaria: lidas por inteiro, com script, sem script à mão. */
export function candidatas(acervo = ACERVO) { return acervo.filter(c => !S.SCRIPTS[c.name]).map(ficha).filter(f => f.completa && f.script); }
/** Conferência das aprovadas: texto igual ao revisado e leitura ainda inteira. Devolve a lista de problemas (vazia = tudo certo). */
export function confere(acervo = ACERVO) {
  const nomes = Object.fromEntries(acervo.map(c => [c.name, c])); const problemas = [];
  for (const [nome, ass] of Object.entries(S.APROVADAS)) {
    const c = nomes[nome]; if (!c) { problemas.push(`${nome}: aprovada, mas sem texto oficial guardado em .listas/oficiais*.json`); continue; }
    if (S.hashTexto(c.oracle_text) !== ass.texto) problemas.push(`${nome}: o texto guardado mudou desde a revisão (assinatura ${S.hashTexto(c.oracle_text)} ≠ ${ass.texto})`);
    const r = L.ler(c); if (!r.completa || !r.script) problemas.push(`${nome}: o leitor não a lê mais por inteiro`);
    if (S.SCRIPTS[nome]) problemas.push(`${nome}: tem script à mão; a aprovação é redundante (o script à mão vence)`);
    if (!ass.leva) problemas.push(`${nome}: aprovação sem a leva da revisão`);
  }
  return problemas;
}
function imprime(f) {
  console.log(`\n## ${f.name} · ${f.type_line}${f.aMao ? ' · (tem script à mão: a revisão não muda nada)' : ''}${f.aprovada ? ' · APROVADA' : ''}`);
  console.log('Texto oficial:'); for (const l of String(f.oracle_text || '').split('\n')) console.log('  ' + l);
  console.log('Frases:'); for (const fr of f.frases) console.log(`  ${fr.lida ? '✓' : '✗'} ${fr.texto}${fr.motivo ? ' — ' + fr.motivo : ''}`);
  console.log(f.completa && f.script ? 'Script lido:\n  ' + JSON.stringify(f.script) : 'Não lida por inteiro: não há o que revisar.');
  if (f.completa && f.script && !f.aMao) console.log(`Linha para APROVADAS (depois do parecer): '${f.name.replace(/'/g, "\\'")}': { texto: '${f.assinatura}', leva: 'M-N' },`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args[0] === '--candidatas') { const cs = candidatas(); console.log(`${cs.length} carta(s) lida(s) por inteiro sem script à mão:`); for (const f of cs) console.log(`  ${f.name} · ${f.type_line}`); }
  else if (args[0] === '--confere') { const p = confere(); console.log(p.length ? p.join('\n') : `APROVADAS ✓ ${Object.keys(S.APROVADAS).length} carta(s), todas com o texto revisado e lidas por inteiro`); process.exitCode = p.length ? 1 : 0; }
  else if (args[0] === '--lote') { for (const c of JSON.parse(readFileSync(args[1], 'utf8'))) imprime(ficha(c)); }
  else if (args.length) { for (const n of args) { if (!porNome[n]) console.log(`\n## ${n}: sem texto oficial guardado (use --lote com o texto da Scryfall)`); else imprime(ficha(porNome[n])); } }
  else console.log('uso: --candidatas | --confere | --lote arquivo.json | "Nome" …');
}
