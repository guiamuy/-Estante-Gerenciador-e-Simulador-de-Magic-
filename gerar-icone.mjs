// E50 · gera icon.svg e icon-512.png a partir da fonte única do ícone (brand.js → iconeDoApp).
// Rode depois de mudar o ícone:  PW_CHROMIUM=... node gerar-icone.mjs
import { writeFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { chromium } from 'playwright';
const { brand } = loadModules();
const svg = brand.iconeDoApp({ tamanho: 512 });
writeFileSync(new URL('./icon.svg', import.meta.url), svg + '\n');
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await page.screenshot({ path: new URL('./icon-512.png', import.meta.url).pathname, omitBackground: true, clip: { x: 0, y: 0, width: 512, height: 512 } });
await browser.close();
console.log('icon.svg e icon-512.png gerados');
