// G-387 · T-IDIOMA relato #151, fatia 5c: as cartas de Commander que seguiam em inglês porque o repositório não tinha o
// Oracle delas (a Scryfall não responde nas sessões de nuvem). O Oracle vem do Forge (idiomas/oficiais-forge-commander.json,
// lido em 13/11/2026), o --faltam do idioma-cartas.mjs passa a enxergá-lo, e o primeiro lote (as cartas mais usadas nas listas
// de Commander: 36 em português, 28 em espanhol) entra nos pacotes pelo conferidor. Falhava antes: o arquivo não existia e
// nenhuma destas cartas estava no pacote.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { conferePacote, lePacote, IDIOMAS, juntaTextos, textosDoIdioma } from './idioma-cartas.mjs';
import { ARQUIVOS } from './vercel-publico.mjs';
const { cards: C } = loadModules();

const BASE = JSON.parse(readFileSync(new URL('./idiomas/oficiais-forge-commander.json', import.meta.url), 'utf8'));
const LOTE_PT = ['Volcanic Island', 'Underground Sea', 'Tundra', 'Tropical Island', 'Scrubland', 'Badlands', 'Plateau', 'Bayou', 'Savannah', 'Taiga',
  'Shang-Chi, Master of Kung Fu', 'Flesh Duplicate', 'Marvin, Murderous Mimic', 'Allosaurus Shepherd', 'Emiel the Blessed', 'Deadpool, Trading Card',
  'Gene Pollinator', "Hazel's Brewmaster", 'Untimely Malfunction', 'Candelabra of Tawnos', "Mishra's Workshop", 'Saw in Half', "Loki's Scepter",
  'Dack Fayden, Helping Hand', '_____ Goblin', 'Electro, Assaulting Battery', 'Propaganda', 'Vibrance', 'Weftstalker Ardent',
  'The Unbeatable Squirrel Girl', 'Forsaken Monument', 'Gigantoplasm', "Machine God's Effigy", 'Chimil, the Inner Sun', 'Hall of Echoes', 'Metamorphosis'];
const LOTE_ES = ['Volcanic Island', 'Underground Sea', 'Tundra', 'Tropical Island', 'Scrubland', 'Badlands', 'Plateau', 'Bayou', 'Savannah', 'Taiga',
  'Allosaurus Shepherd', 'Deadpool, Trading Card', 'Candelabra of Tawnos', "Mishra's Workshop", '_____ Goblin', 'Propaganda', 'Metamorphosis', 'Vesuva',
  'Xorn', 'Skittering Cicada', 'Arena Rector', 'Clown Car', 'Irma, Part-Time Mutant', 'Bonus Round', 'Casey Jones, Back Alley Brute',
  "Vivi's Persistence", 'Abstergo Entertainment', 'Bartolomé del Presidio'];

const JA_TINHAM = ['Vibrance', 'Weftstalker Ardent', 'Irma, Part-Time Mutant'];

test('G-387 · base de Commander: o Oracle do Forge, uma carta por entrada, com fonte, fora do que a Vercel publica', () => {
  assert.ok(Array.isArray(BASE.cartas) && BASE.cartas.length >= 1800, `cartas: ${BASE.cartas && BASE.cartas.length}`);
  assert.match(BASE.nota, /G-387/);
  const nomes = new Set();
  for (const c of BASE.cartas) {
    assert.ok(typeof c.name === 'string' && c.name && !nomes.has(c.name), `nome: ${c.name}`); nomes.add(c.name);
    assert.ok(typeof c.type_line === 'string', `${c.name}: type_line`);
    if (c.card_faces) assert.ok(c.card_faces.length > 1 && c.card_faces.every(f => typeof f.name === 'string' && typeof f.oracle_text === 'string'), `${c.name}: faces`);
    else assert.equal(typeof c.oracle_text, 'string', `${c.name}: oracle_text`);
    assert.match(c.fonte, /^https:\/\/raw\.githubusercontent\.com\/Card-Forge\/forge\/master\/forge-gui\/res\/cardsfolder\/[a-z0-9]\/[^/]+\.txt$/, c.name);
  }
  assert.ok(!ARQUIVOS.some(a => /oficiais/.test(a)), 'a base é ferramenta, não vai para o app');
});

test('G-387 · o --faltam enxerga o Oracle de Commander (as fontes locais do idioma trazem a base nova)', () => {
  const textos = juntaTextos(textosDoIdioma());
  for (const n of ['Volcanic Island', 'Shang-Chi, Master of Kung Fu', 'Vesuva']) {
    const t = textos.get(n); assert.ok(t && typeof t.oracle_text === 'string' && t.oracle_text, n);
  }
  assert.equal(textos.get('Volcanic Island').oracle_text, '({T}: Add {U} or {R}.)');
});

test('G-387 · pacotes: o primeiro lote de Commander está lá, traduz o Oracle da base, passa no conferidor e vale no app', () => {
  const base = new Map(BASE.cartas.map(c => [c.name, c]));
  for (const lang of IDIOMAS) assert.deepEqual(conferePacote(lePacote(lang), lang), {}, lang);
  for (const [lang, lote] of [['pt', LOTE_PT], ['es', LOTE_ES]]) {
    const P = lePacote(lang);
    for (const nome of lote) {
      const e = P.cartas[nome]; assert.ok(e, `${lang} · ${nome}`);
      // Vibrance, Weftstalker Ardent e Irma já tinham o Oracle da Scryfall na cobertura do catálogo: o resto vem da base nova
      if (!JA_TINHAM.includes(nome)) assert.equal(e.original, base.get(nome)?.oracle_text, `${lang} · ${nome}: o original é o Oracle da base`);
      assert.ok(typeof e.tipo === 'string' && e.tipo.trim(), `${lang} · ${nome}: tipo`);
      assert.ok(C.traducaoDaCarta(P, { name: nome, oracle_text: e.original }, lang), `${lang} · ${nome} aparece no app`);
    }
  }
  // o termo das terras de duas cores: o mana no idioma, os símbolos intactos
  assert.equal(lePacote('pt').cartas['Volcanic Island'].texto, '({T}: Adicione {U} ou {R}.)');
  assert.equal(lePacote('es').cartas['Volcanic Island'].tipo, 'Tierra — Isla Montaña');
});
