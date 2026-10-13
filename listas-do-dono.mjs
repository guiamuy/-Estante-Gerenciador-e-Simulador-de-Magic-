// G-262 · relato #17: as listas que vinham com o app (`STARTER_DECKS`, `src/data/starter-decks.js`) eram as do dono. A tela
// não as oferece mais; este script gera o arquivo de backup que o dono importa uma vez (Listas › Mais › Restaurar backup) para
// elas virarem listas dele. Só listas: a coleção e o perfil de quem importa não mudam. Ids fixos: importar de novo não duplica.
//   node listas-do-dono.mjs estante-minhas-listas.json
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadModules } from './_load.mjs';

const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** O backup (formato `estante.backup` v2, sem coleção) com as listas que vinham com o app. Puro. */
export function backupDasListas({ starter, decks }, agora = Date.parse('2026-10-13T12:00:00Z')) {
  return { kind: 'estante.backup', version: 2, decks: starter.STARTER_DECKS.map(sd => ({ id: 'guilherme-' + slug(sd.name), name: sd.name, format: sd.format, entries: decks.parseDeckText(sd.text).entries, created: agora, updated: agora })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const saida = process.argv[2] || 'estante-minhas-listas.json';
  const b = backupDasListas(loadModules());
  writeFileSync(saida, JSON.stringify(b, null, 1) + '\n');
  console.log(`${b.decks.length} listas em ${saida}`);
}
