// M-347 · LT29 · Pauper: as 58 cartas lidas pelo motor que faltavam em listas do catálogo passam a jogar depois da revisão independente por lote
// (decisão A; 322 verificações, nenhum desvio). Texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Também guarda as
// âncoras das trilhas paralelas `cartas` (↓ C) e `listas` (↓ L) em RAW_SCRIPTS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadModules } from './_load.mjs';

const { scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : x[1] === 'X' ? 0 : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const LOTE = ['Fungal Infection', 'Jewel Thief', 'Nutrient Block', 'Rimewood Falls', 'Outlaw Medic', 'Shattered Landscape', 'Fog', 'Paradox Gardens', 'Force Spike', "Ashnod's Altar", 'Tireless Tribe', 'Lonely Arroyo', 'Fiery Cannonade', 'Molten Tributary', 'Tinder Farm', 'Tangled Islet', 'Bloodthrone Vampire', 'Radiant Fountain', 'Humbling Elder', 'Ichorclaw Myr', 'Dimension X', 'Whitemane Lion', 'Reckless Lackey', 'Goldhound', 'Unmake', 'Artful Dodge', 'Vampire Sovereign', 'Wooded Ridgeline', 'Mwonvuli Acid-Moss', 'Abraded Bluffs', 'Sinister Hideout', 'Blight Mamba', 'Go Forth', 'Eroded Canyon', 'Kiln Fiend', 'Slip Through Space', 'North Pole Gates', 'Golden Egg', 'Surveillance Room', "Tocasia's Dig Site", 'Imposing Vantasaur', 'Alpine Meadow', 'Lagonna-Band Trailblazer', 'Energy Refractor', 'Myr Kinsmith', 'Prosperous Pirates', 'Crystal Grotto', 'Omen of the Dead', 'Creosote Heath', 'Etched Cornfield', 'Erebor Flamesmith', 'Firebrand Archer', 'Sunscorched Desert', 'World Map', 'Tranquil Landscape', 'Shattered Acolyte', 'Old Thrush', 'Cogwork Wrestler'];

test('M-347 · as 58 do lote XX (Pauper) revisadas jogam (decisão A)', () => {
  for (const n of LOTE) assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});

test('M-347 · âncoras das trilhas paralelas `cartas` (↓ C) e `listas` (↓ L) existem em RAW_SCRIPTS, nesta ordem, antes do fim da lista', () => {
  const src = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const c = src.indexOf('/* ↓ C · scripts da trilha cartas'), l = src.indexOf('/* ↓ L · scripts de carta da trilha listas'), fim = src.indexOf('\n];\nconst SCRIPTS = {};'); // a âncora ↓ C é a que a C-1 publicou primeiro (a da M-347 saiu no rebase)
  assert.ok(c > 0 && l > c && fim > l, 'âncoras na ordem C, L, fim');
  assert.equal((src.match(/↓ C · scripts da trilha cartas/g) || []).length, 1); assert.equal((src.match(/↓ L · scripts de carta/g) || []).length, 1);
});
