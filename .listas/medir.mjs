// Mede a cobertura do motor em cada lista salva, para guiar as próximas levas.
import { readFileSync } from 'node:fs';
import { loadModules } from '../_load.mjs';
const { scripts: S } = loadModules();
const decks = JSON.parse(readFileSync(new URL('./decks.json', import.meta.url), 'utf8'));
const BASICS = new Set(['Island', 'Mountain', 'Forest', 'Plains', 'Swamp']);
// cartas que o motor resolve lendo o próprio texto: baunilha, só palavras-chave, terreno simples
const TEXTO = new Set(['Gladecover Scout', 'Slippery Bogle', 'Llanowar Elves', 'Elvish Mystic', 'Salt Road Packbeast',
  'Command Tower', 'Exotic Orchard', 'Shivan Reef', 'Sulfur Falls', 'Spire of Industry', 'Caves of Koilos', 'Tainted Field',
  'Temple of Silence', 'Isolated Chapel', 'Fetid Heath', 'Secluded Steppe', 'Path of Ancestry', 'Shineshadow Snarl',
  'The Dross Pits', 'The Fair Basilica', 'Boros Garrison', 'Wind-Scarred Crag', 'Perilous Landscape', 'Drossforge Bridge',
  'Slagwoods Bridge', 'Twisted Landscape', 'Vault of Whispers', 'Jagged Barrens', 'Razortrap Gorge', 'Rakdos Carnarium',
  'Sol Ring', "Mishra's Bauble", 'Orzhov Basilica', 'Windbrisk Heights', 'Vault of the Archangel', 'Phyrexian Tower',
  'Cephalid Coliseum', 'Saprazzan Skerry', 'Dwarven Ruins', 'Svyelunite Temple', 'Kher Keep', "Mishra's Factory",
  'Blinkmoth Nexus', 'Sewer-veillance Cam', 'Secret Door', 'Tuktuk Rubblefort']);
const so = process.argv[2];
for (const [nome, cartas] of Object.entries(decks)) {
  if (so && !nome.toLowerCase().includes(so.toLowerCase())) continue;
  let cheio = 0, parcial = 0, manual = 0, total = 0;
  const faltam = [], parciais = [];
  for (const [carta, q] of Object.entries(cartas)) {
    total += q;
    const sc = S.SCRIPTS[carta];
    if (BASICS.has(carta) || TEXTO.has(carta)) cheio += q;
    else if (sc && sc.covers === 'partial') { parcial += q; parciais.push(carta); }
    else if (sc) cheio += q;
    else { manual += q; faltam.push(carta + (q > 1 ? ` x${q}` : '')); }
  }
  console.log(`${nome} | ${Math.round(100 * cheio / total)}% | parcial ${parcial} | manual ${manual}`);
  if (faltam.length) console.log(`   manual: ${faltam.join(', ')}`);
  if (parciais.length) console.log(`   parcial: ${parciais.join(', ')}`);
}
