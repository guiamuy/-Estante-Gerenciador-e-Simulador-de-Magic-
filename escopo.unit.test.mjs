// G-305 · relato #34 · classe: função auxiliar chamada fora do módulo que a define. Cada módulo do index.html é uma IIFE
// (`__mN`, ADR-02): o que um módulo declara no topo não existe nos outros. A folha e o espiar da mesa (src/app/table.js)
// chamavam plural(), declarada só em src/app/table-model.js — ReferenceError ao montar o custo "pôr/remover marcador"
// (Wall of Roots), e a carta não abria nem ativava. Esta guarda lê o arquivo: toda auxiliar `const nome = (…) =>` do topo
// de um módulo, chamada em outro, precisa estar ligada ali (declarada, importada por desestruturação ou recebida como
// parâmetro com padrão). Falha antes da G-305 com "src/app/table.js: plural()".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FONTE = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
export function auxiliaresForaDeEscopo(src) {
  const marcas = [...src.matchAll(/^\/\* ==== (src\/[^ ]+) ==== \*\/$/gm)];
  const mods = marcas.map((m, i) => ({ nome: m[1], txt: src.slice(m.index, i + 1 < marcas.length ? marcas[i + 1].index : src.indexOf('</script>', m.index)) }));
  const defs = new Map();
  for (const m of mods) for (const d of m.txt.matchAll(/^const ([A-Za-z_$][\w$]*) = \(/gm)) { if (!defs.has(d[1])) defs.set(d[1], new Set()); defs.get(d[1]).add(m.nome); }
  const achados = [];
  for (const m of mods) for (const [nome, onde] of defs) {
    if (onde.has(m.nome)) continue;
    const n = nome.replace(/\$/g, '\\$');
    const chamada = new RegExp(`(^|[^.\\w$])${n}\\(`), metodo = new RegExp(`^\\s*(async\\s+)?${n}\\([^)]*\\)\\s*\\{`);
    if (!m.txt.split('\n').some(l => chamada.test(l) && !metodo.test(l))) continue;
    const ligado = new RegExp(`\\b(const|let|var)\\s+${n}\\s*=\\s*(\\(|[\\w$]+\\s*=>|function)|function\\s+${n}\\s*\\(|[{,]\\s*${n}\\s*[,}]|\\b${n}\\s*=\\s*(\\([^)]*\\)|[\\w$]+)\\s*=>`).test(m.txt);
    if (!ligado) achados.push(`${m.nome}: chama ${nome}() sem tê-la no escopo (declarada em ${[...onde].join(', ')})`);
  }
  return achados;
}

test('G-305 · nenhum módulo chama auxiliar de outro módulo sem tê-la no escopo (a folha da carta não pode quebrar por ReferenceError)', () => {
  assert.deepEqual(auxiliaresForaDeEscopo(FONTE), []);
});

test('G-305 · a guarda acha o caso do relato e não acusa método, parâmetro com padrão nem importação', () => {
  const mod = (nome, corpo) => `/* ==== src/${nome}.js ==== */\nconst __m${nome.length} = (function () {\n${corpo}\n})();\n`;
  const base = mod('a', 'const plural = (n, um, muitos) => n + um;\nconst fmt = (x) => x;');
  assert.deepEqual(auxiliaresForaDeEscopo(base + mod('bb', 'function custo(c) { return plural(c.n, "marcador", "marcadores"); }') + '</script>'), ['src/bb.js: chama plural() sem tê-la no escopo (declarada em src/a.js)']);
  const ok = [
    'const plural = (n, um, muitos) => n;\nplural(1, "a", "b");',
    'const { plural, fmt } = __m1;\nplural(1);',
    'function f({ plural = () => 1 } = {}) { return plural(); }',
    'const api = {\n  async fmt(x) { return x; }\n};',
    'const quem = 1, plural = quem > 1;\nconst x = obj.plural(2);',
  ];
  for (const corpo of ok.slice(0, 4)) assert.deepEqual(auxiliaresForaDeEscopo(base + mod('cc', corpo) + '</script>'), [], corpo);
  assert.deepEqual(auxiliaresForaDeEscopo(base + mod('cc', ok[4]) + '</script>'), [], 'método de objeto não é a auxiliar');
  assert.deepEqual(auxiliaresForaDeEscopo(base + mod('cc', 'const quem = 1, plural = quem > 1;\nplural(2);') + '</script>').length, 1, 'variável local que não é função não liga a auxiliar');
});
