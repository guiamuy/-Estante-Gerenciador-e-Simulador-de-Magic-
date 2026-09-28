// X10 · gera as fotos SINTÉTICAS do conjunto de medição do scanner.
// Uso: node fotos/gerar.mjs   (precisa do Playwright; mesmo do e2e)
// Cada foto é uma "carta" desenhada em HTML, fotografada com variações de fundo,
// luz, ângulo, foco e tamanho. Elas cobrem o caminho inteiro (achar a carta,
// recortar a faixa do nome e a linha de coleção, OCR, correspondência) — mas não
// substituem fotos reais: as reais entram no manifest com `origem: "real"`.
import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));

const FUNDOS = {
  mesa: 'linear-gradient(135deg, #6b4a2b 0 12%, #7a5633 12% 25%, #684628 25% 40%, #78552f 40% 60%, #6a4a2a 60% 80%, #7b5734 80%)',
  cinza: 'radial-gradient(circle at 40% 30%, #9a9a9a, #5c5c5c)',
  verde: 'repeating-linear-gradient(45deg, #2f5d3a 0 6px, #2a5434 6px 12px)',
  branco: 'linear-gradient(180deg, #e9e6df, #cfc9bd)'
};

function html(f) {
  const { largura, altura, nome, set, numero, raridade = 'U', fundo = 'mesa', rot = 0, brilho = 1, borrao = 0, alturaCarta = 0.7, cx = 0.5, cy = 0.5, reflexo = false } = f;
  const ch = Math.round(altura * alturaCarta), cw = Math.round(ch * 63 / 88);
  const left = Math.round(largura * cx - cw / 2), top = Math.round(altura * cy - ch / 2);
  const fs = Math.round(cw * 0.058), fsCol = Math.round(ch * 0.02);
  return `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;width:${largura}px;height:${altura}px;overflow:hidden}
  .foto{position:relative;width:${largura}px;height:${altura}px;background:${FUNDOS[fundo]};filter:brightness(${brilho}) blur(${borrao}px)}
  .carta{position:absolute;left:${left}px;top:${top}px;width:${cw}px;height:${ch}px;border-radius:${Math.round(cw * 0.045)}px;
    background:#0d0d0d;transform:rotate(${rot}deg);box-shadow:0 ${Math.round(ch * 0.01)}px ${Math.round(ch * 0.03)}px rgba(0,0,0,.55);overflow:hidden}
  .moldura{position:absolute;left:3.2%;top:3%;right:3.2%;bottom:8.5%;background:#cfc4a8;border-radius:2%}
  .titulo{position:absolute;left:4%;right:4%;top:1.8%;height:7.2%;background:linear-gradient(#f3ecd6,#d9cfb0);border:1px solid #6a5a3a;display:flex;align-items:center;padding-left:3.5%;
    font:700 ${fs}px/1 "Times New Roman",Georgia,serif;color:#1a1408;letter-spacing:.2px;white-space:nowrap}
  .arte{position:absolute;left:5%;right:5%;top:10.5%;height:41%;background:linear-gradient(160deg,#7d9bd1,#233a6b 55%,#0e1730);border:1px solid #6a5a3a}
  .tipo{position:absolute;left:4%;right:4%;top:53%;height:5.5%;background:linear-gradient(#f3ecd6,#d9cfb0);border:1px solid #6a5a3a}
  .texto{position:absolute;left:5%;right:5%;top:60%;bottom:12%;background:#efe7d2;border:1px solid #6a5a3a}
  .col{position:absolute;left:3.5%;top:92.4%;width:50%;height:7.5%;color:#f4f4f4;font:${fsCol}px/1.25 Arial,Helvetica,sans-serif;white-space:pre}
  .reflexo{position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,0) 35%,rgba(255,255,255,.55) 48%,rgba(255,255,255,0) 60%);pointer-events:none}
  </style><div class="foto"><div class="carta">
    <div class="moldura"></div><div class="titulo">${nome}</div><div class="arte"></div><div class="tipo"></div><div class="texto"></div>
    <div class="col">${String(numero).padStart(4, '0')}/0${(parseInt(numero, 10) + 63)} ${raridade}\n${set.toUpperCase()} • EN</div>
    ${reflexo ? '<div class="reflexo"></div>' : ''}
  </div></div>`;
}

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage();
for (const f of manifest.fotos) {
  if (f.origem !== 'sintetica') continue;
  await page.setViewportSize({ width: f.largura, height: f.altura });
  await page.setContent(html(f));
  const buf = await page.screenshot({ type: 'jpeg', quality: 82, fullPage: false });
  writeFileSync(join(dir, f.arquivo), buf);
  console.log(`${f.arquivo} · ${buf.length} bytes`);
}
await browser.close();
