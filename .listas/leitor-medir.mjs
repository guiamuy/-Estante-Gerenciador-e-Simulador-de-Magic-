// LT6 · Mede o leitor de texto nas listas reais: quantas cartas de cada lista o motor leria SOZINHO a partir do texto oficial
// (sem o script à mão) e o que falta, agrupado por classe de frase e pela trilha que cuida dela. É a mesma função `ler` do app,
// sobre o mesmo texto oficial conferido (.listas/oficiais*.json). Nada aqui é estimativa: cada linha vem de uma frase não lida.
//   node .listas/leitor-medir.mjs            → quadro por lista + o que falta, por classe
//   node .listas/leitor-medir.mjs --json     → o mesmo em JSON (para o ROADMAP e as trilhas)
import { readFileSync } from 'node:fs';
import { loadModules } from '../_load.mjs';

const BASICS = { Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' };
// palavras-chave e ações de palavra-chave que ainda não estão no vocabulário do motor caem na trilha dona delas (CR4 `keywords`, CR3 `verbos`)
const PALAVRAS_CR4 = /^(partner|ward|prowess|exalted|convoke|cascade|landfall|flanking|rampage|bushido|afflict|changeling|devoid|improvise|fabricate|crew|outlast|skulk|unleash|undying|persist|wither|shadow|phasing|horsemanship|banding|absorb|amplify|annihilator|battle cry|bloodthirst|cumulative upkeep|dethrone|echo|entwine|epic|evoke|evolve|extort|fading|fear|frenzy|graft|gravestorm|haunt|hideaway|intimidate|kicker|level up|living weapon|melee|mentor|miracle|modular|monstrosity|myriad|offering|poisonous|provoke|prowl|rebound|recover|reinforce|renown|retrace|riot|ripple|soulshift|spectacle|split second|sunburst|suspend|totem armor|training|tribute|undaunted|unearth|vanishing|wither|afterlife|adapt|amass|ascend|assist|boast|casualty|cleave|compleated|connive|daybound|nightbound|decayed|demonstrate|disturb|encore|enlist|escalate|foretell|for mirrodin!|hidden agenda|jump-start|learn|magecraft|mutate|offspring|read ahead|ravenous|reconfigure|saddle|squad|surge|toxic|umbra armor|vanishing|spree|gift|impending|eerie|forage|exhaust|harmonize|job select|mobilize|renew|station|flurry|max speed|start your engines!|threshold|hellbent|morbid|metalcraft|fateful hour|ferocious|formidable|lieutenant|raid|revolt|spell mastery|undergrowth|addendum|battalion|bloodrush|channel|chroma|constellation|converge|council's dilemma|delirium|domain|enrage|grandeur|heroic|imprint|inspired|join forces|kinship|parley|radiance|strive|sweep|tempting offer|will of the council|alliance|coven|descend|pack tactics|celebration|corrupted|paradox|valiant)\b/i;
const VERBOS_CR3 = /^(?:(?:you may |its controller may |target player may |that player may |each player may |you |~ |that player |its controller |each player |each opponent |target player |target opponent |the player |its owner |that creature's controller )?)(sacrifice|exile|destroy|counter|tap|untap|mill|scry|surveil|search|shuffle|reveal|discard|fight|regenerate|transform|attach|unattach|cast|activate|play|create|double|exchange|goad|investigate|manifest|meld|monstrosity|populate|proliferate|scry|vote|bolster|support|explore|amass|learn|venture|connive|incubate|discover|forage|cloak|collect evidence|endure|return|put|look|choose|copy|gain control|flip|phase|clash|planeswalk|set in motion|abandon|detain|convert|open an attraction|roll|exert|adapt|ring|suspect|time travel|exhaust|renew|harmonize|mobilize|station|behold|detain|distribute|prevent|skip|switch|add|remove|deals?|loses?|gains?|draws?|discards?|sacrifices?|exiles?|reveals?|shuffles?|puts?|chooses?|get|become|can't|doesn't|has|have|is|are|enters|attack|block|take|spend|pay|move|turn|unlock|lock|crew|saddle|equip|fortify|plot|forecast|assemble)\b/i;
const TIPOS_CR5 = /\b(saga|chapter|vehicle|crew \d|adventure|class|level \d|battle|siege|defeat|dungeon|room|unlock|double-faced|transform|daybound|nightbound|omen|split card|fuse|aftermath|kindred|tribal|planeswalker|loyalty|emblem|scheme|plane|phenomenon|conspiracy|attraction|sticker|case|solved|clue|food|treasure|blood|map|incubator|powerstone|role|shard|junk|lander)\b/i;

/** Classe da frase não lida e a trilha que cuida dela (K keywords · V verbos · T tipos · M motor/leitor). */
export function classifica(frase, motivo, tipoCarta) {
  const f = frase.trim(), fl = f.toLowerCase();
  if (PALAVRAS_CR4.test(fl) && f.length < 40) return { classe: 'palavra-chave fora do vocabulário', trilha: 'K' };
  if (/^(escape|flashback|madness|cycling|transmute|bestow|ninjutsu|kicker|morph|disturb|plot|affinity|storm|delve|overload|soulbond|bargain|collect evidence|omen)\b/i.test(fl)) return { classe: 'palavra-chave com custo que o motor já executa (leitor não lê a forma)', trilha: 'M' };
  if (/^enchant\b/i.test(fl)) return { classe: '"Enchant <tipo>" fora do vocabulário do leitor', trilha: 'M' };
  if (/^as (~|this|[a-z' ]+) enters/i.test(fl)) return { classe: 'substituição "as ~ enters" (escolha ao entrar)', trilha: 'M' };
  if (/^(when|whenever|at the beginning)\b/i.test(fl)) return { classe: 'gatilho (abertura ou corpo) sem padrão', trilha: 'M' };
  if (/^(\{[^}]+\}|sacrifice |discard |pay |tap |remove |exile |return )/i.test(f) && f.includes(':')) return { classe: 'habilidade ativada sem padrão', trilha: 'M' };
  if (/^as an additional cost/i.test(fl)) return { classe: 'custo adicional', trilha: 'V' };
  if (/^(choose two|choose one or more|choose three)\b/i.test(fl)) return { classe: 'modos (dois ou mais)', trilha: 'M' };
  if (/^(•|•)/.test(f)) return { classe: 'modo sem padrão', trilha: 'M' };
  if (TIPOS_CR5.test(fl) && /\b(saga|chapter|vehicle|crew|adventure|class|level|battle|dungeon|room|omen|loyalty|emblem)\b/i.test(fl)) return { classe: 'tipo ou formato de carta', trilha: 'T' };
  if (/^(enchanted|equipped|~|this creature|this permanent|this artifact|creatures you control|other creatures you control|each creature you control)\b.*\b(has|have|gets?|can't|doesn't|is|are|enters?)\b/i.test(fl) && !/^~ deals/i.test(fl)) return { classe: 'estática de permanente sem padrão', trilha: 'M' };
  if (/\b(if|as long as|unless|only if|where x is)\b/i.test(fl)) return { classe: 'condição ou valor variável', trilha: 'M' };
  const v = fl.match(VERBOS_CR3);
  if (v) return { classe: `ação "${v[1]}" fora do padrão`, trilha: 'V' };
  if (/^(target|each|any|all|up to)\b/i.test(fl)) return { classe: 'seletor de alvo ou de conjunto sem padrão', trilha: 'M' };
  return { classe: 'outra frase', trilha: 'M' };
}

export function mede() {
  const { leitor: L, scripts: S } = loadModules();
  const base = new URL('./', import.meta.url);
  const oficiais = [...JSON.parse(readFileSync(new URL('oficiais.json', base), 'utf8')).cartas, ...JSON.parse(readFileSync(new URL('oficiais-commander.json', base), 'utf8')).cartas];
  const porNome = Object.fromEntries(oficiais.map(c => [c.name, c]));
  for (const [n, c] of Object.entries(BASICS)) porNome[n] = { name: n, type_line: `Basic Land — ${n}`, oracle_text: `{T}: Add {${c}}.` };
  const decks = JSON.parse(readFileSync(new URL('decks.json', base), 'utf8'));
  const leituras = {}; // nome → { completa, frases }
  const le = n => leituras[n] || (leituras[n] = porNome[n] ? L.ler(porNome[n]) : { completa: false, frases: [{ texto: '(sem texto oficial guardado)', lida: false }], semTexto: true });
  const listas = Object.entries(decks).map(([nome, cartas]) => {
    const nomes = Object.keys(cartas); const lidas = nomes.filter(n => le(n).completa);
    const aMao = nomes.filter(n => S.SCRIPTS[n]).length;
    return { lista: nome, cartas: nomes.length, lidas: lidas.length, pct: Math.round(100 * lidas.length / nomes.length), comScriptAMao: aMao };
  });
  const classes = {}; const cartasPorClasse = {};
  for (const c of oficiais) {
    const r = le(c.name); if (r.completa) continue;
    for (const f of r.frases.filter(x => !x.lida)) {
      const { classe, trilha } = classifica(f.texto, f.motivo, c.type_line);
      const k = `${trilha} · ${classe}`;
      classes[k] = classes[k] || { trilha, classe, frases: 0, cartas: new Set(), exemplos: [] };
      classes[k].frases++; classes[k].cartas.add(c.name); if (classes[k].exemplos.length < 3 && !classes[k].exemplos.includes(f.texto)) classes[k].exemplos.push(f.texto.slice(0, 90));
    }
  }
  const faltas = Object.values(classes).map(x => ({ ...x, cartas: x.cartas.size })).sort((a, b) => b.cartas - a.cartas || b.frases - a.frases);
  const total = oficiais.length, completas = oficiais.filter(c => le(c.name).completa).length;
  const porTrilha = {}; for (const f of faltas) porTrilha[f.trilha] = (porTrilha[f.trilha] || 0) + f.frases;
  return { total, completas, listas, faltas, porTrilha };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = mede();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 1)); }
  else {
    console.log(`Leitor de texto · ${r.completas} de ${r.total} cartas do acervo lidas por inteiro (${Math.round(100 * r.completas / r.total)}%)`);
    for (const l of r.listas) console.log(`  ${l.lista.padEnd(28)} ${String(l.lidas).padStart(3)} / ${String(l.cartas).padStart(3)} lidas (${String(l.pct).padStart(3)}%) · ${l.comScriptAMao} com script à mão`);
    console.log('\nO que falta, por classe (cartas afetadas · frases · trilha):');
    for (const f of r.faltas) console.log(`  ${String(f.cartas).padStart(3)} · ${String(f.frases).padStart(3)} · ${f.trilha} · ${f.classe}\n        ex.: ${f.exemplos.join(' | ')}`);
    console.log('\nFrases não lidas por trilha:', Object.entries(r.porTrilha).map(([k, v]) => `${k}=${v}`).join(' · '));
  }
}
