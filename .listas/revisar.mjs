// Épico R · revisão carta a carta. Mantém .listas/revisao.json (uma ficha por carta) e imprime o quadro por lista.
// Uso: node .listas/revisar.mjs            → quadro
//      node .listas/revisar.mjs --sincroniza → acrescenta cartas novas das listas como "pendente" (nunca apaga ficha)
// A ficha diz o que foi conferido NA CARTA: texto oficial, mecânicas, motor e tela. "revisada" só com os quatro passos
// feitos e teste de tela apontado. O arquivo é dado de auditoria: não reescreva fichas à mão sem a revisão por trás.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadModules } from '../_load.mjs';
const { scripts: S } = loadModules();
const aqui = n => new URL('./' + n, import.meta.url);
const decks = JSON.parse(readFileSync(aqui('decks.json'), 'utf8'));
const oficiais = JSON.parse(readFileSync(aqui('oficiais.json'), 'utf8')).cartas;
const rev = existsSync(aqui('revisao.json')) ? JSON.parse(readFileSync(aqui('revisao.json'), 'utf8')) : { sobre: '', cartas: {} };
const BASICOS = ['Island', 'Mountain', 'Forest', 'Plains', 'Swamp'];
const MEC = ['alt', 'additional', 'flashback', 'escape', 'madness', 'cycling', 'ninjutsu', 'sneak', 'transmute', 'storm', 'bestow', 'bargain', 'evidence', 'soulbond', 'affinity', 'discount', 'changeling', 'morph', 'plot', 'disturb', 'omen', 'back', 'loyalty', 'modes', 'aura', 'equip', 'choose', 'staticRule', 'grants', 'grantsAll', 'entersTapped', 'entersTappedUnless', 'produces'];
const efeitos = sc => { const out = new Set(); const anda = x => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(anda); if (x.do) out.add(x.do); Object.values(x).forEach(anda); }; anda(sc); return [...out].sort(); };
function tracos(nome) {
  const sc = S.SCRIPTS[nome];
  if (!sc) return { script: false, mecanicas: [], efeitos: [], gatilhos: [], ativadas: 0 };
  return { script: true, cobertura: sc.covers || 'completo', mecanicas: MEC.filter(k => sc[k] != null), efeitos: efeitos(sc),
    gatilhos: [...new Set((sc.abilities || []).filter(a => a.kind === 'triggered').map(a => a.when))].sort(), ativadas: (sc.abilities || []).filter(a => a.kind === 'activated').length };
}
if (process.argv.includes('--sincroniza')) {
  let novas = 0;
  for (const [lista, cartas] of Object.entries(decks)) for (const nome of Object.keys(cartas)) {
    if (BASICOS.includes(nome)) continue;
    const f = rev.cartas[nome] || (novas++, rev.cartas[nome] = { status: 'pendente', listas: [], texto: null, motor: null, tela: null, bot: null, testes: [], notas: [] });
    if (!f.listas.includes(lista)) f.listas.push(lista);
    const o = oficiais.find(c => c.name === nome);
    if (!f.texto && o) f.texto = { fonte: o.fonte, consulta: o.consulta };
    f.tracos = tracos(nome);
  }
  rev.sobre = 'Épico R (ROADMAP): ficha de revisão por carta. status: pendente · em-revisao · revisada. motor/tela/bot: null (não conferido) ou { ok, leva, obs }. Gerado e mantido por .listas/revisar.mjs.';
  writeFileSync(aqui('revisao.json'), JSON.stringify(rev, null, 1) + '\n');
  console.log(`sincronizado: ${Object.keys(rev.cartas).length} fichas (${novas} novas)`);
}
const ordem = Object.keys(decks);
let tot = { n: 0, rev: 0, and: 0 };
for (const lista of ordem) {
  const nomes = Object.keys(decks[lista]).filter(n => !BASICOS.includes(n));
  const fs = nomes.map(n => [n, rev.cartas[n] || { status: 'sem ficha' }]);
  const c = st => fs.filter(([, f]) => f.status === st).length;
  console.log(`${lista} | ${nomes.length} cartas | revisadas ${c('revisada')} · em revisão ${c('em-revisao')} · pendentes ${c('pendente')}${c('sem ficha') ? ' · sem ficha ' + c('sem ficha') : ''}`);
  const and = fs.filter(([, f]) => f.status === 'em-revisao').map(([n]) => n); if (and.length) console.log('   em revisão: ' + and.join(', '));
}
const todas = Object.values(rev.cartas);
console.log(`\nTotal: ${todas.length} cartas únicas · revisadas ${todas.filter(f => f.status === 'revisada').length} · em revisão ${todas.filter(f => f.status === 'em-revisao').length} · pendentes ${todas.filter(f => f.status === 'pendente').length}`);
