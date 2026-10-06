// Conformidade do motor com as Comprehensive Rules: lê .regras/mapa.json e mostra, por seção e por fase do épico CR,
// quantos itens estão cobertos, parciais, ausentes, só definição ou fora de escopo. Uso: node .regras/medir.mjs [--fases] [--falta NNN]
import { readFileSync } from 'node:fs';
const mapa = JSON.parse(readFileSync(new URL('./mapa.json', import.meta.url), 'utf8'));
export const STATUS = ['coberta', 'parcial', 'ausente', 'definicao', 'fora'];
/** Fase do épico CR a que cada regra pertence (ver ROADMAP.md, épico CR). */
export function faseDe(n) { const r = +String(n).slice(0, 3);
  if (r === 701) return 'CR3 · ações de palavra-chave'; if (r === 702) return 'CR4 · habilidades de palavra-chave';
  if (r >= 800) return 'CR6 · multijogador e variantes';
  if (r >= 705 && r !== 707 && r !== 733) return 'CR5 · tipos e formatos de carta'; if (r >= 300 && r < 400) return 'CR5 · tipos e formatos de carta';
  if (r === 707) return 'CR2f · cópia'; if (r >= 614 && r <= 616) return 'CR2e · substituição e prevenção'; if (r >= 610 && r <= 613) return 'CR2d · efeitos contínuos e camadas';
  if (r === 603 || r === 604) return 'CR2b · gatilhos e estáticas'; if (r >= 500 && r < 600) return 'CR2g · turno e combate';
  if ([113, 115, 116, 117, 118, 600, 601, 602, 605, 606, 607, 609, 700].includes(r)) return 'CR2c · conjurar, ativar e pagar';
  if ((r >= 400 && r < 500) || r === 608 || r === 703 || r === 704 || r === 733) return 'CR2a · zonas, objetos e ações de estado';
  return 'CR2h · conceitos do jogo'; }
export function conta(itens) { const c = Object.fromEntries(STATUS.map(s => [s, 0])); for (const i of itens) c[i.status]++; c.aplicavel = c.coberta + c.parcial + c.ausente; c.pct = c.aplicavel ? Math.round(100 * c.coberta / c.aplicavel) : null; return c; }
if (process.argv[1] && process.argv[1].endsWith('medir.mjs')) {
  const linha = (k, c) => `${k.padEnd(42)} ${STATUS.map(s => String(c[s]).padStart(5)).join('')}   ${c.pct == null ? '—' : c.pct + '%'}`;
  console.log(`Comprehensive Rules de ${mapa.cr} × motor v${mapa.motor} (auditoria de ${mapa.auditoria})\n${''.padEnd(42)} ${STATUS.map(s => s.slice(0, 4).padStart(5)).join('')}   cobertas/aplicáveis`);
  const grupos = process.argv.includes('--fases') ? [...new Set(mapa.itens.map(i => faseDe(i.n)))].sort().map(f => [f, mapa.itens.filter(i => faseDe(i.n) === f)]) : '123456789'.split('').map(d => [d + 'xx', mapa.itens.filter(i => i.n[0] === d)]);
  for (const [k, its] of grupos) console.log(linha(k, conta(its))); console.log(linha('TOTAL', conta(mapa.itens)));
  const k = process.argv.indexOf('--falta'); if (k > 0) for (const i of mapa.itens.filter(i => i.n.startsWith(process.argv[k + 1] + '.') && ['parcial', 'ausente'].includes(i.status))) console.log(`${i.n} [${i.status}${i.esforco ? ' ' + i.esforco : ''}] ${i.titulo}: ${i.falta || ''}`);
}
