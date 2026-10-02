// X10 · gera as fotos SINTÉTICAS do conjunto de medição do scanner.
// Uso: node fotos/gerar.mjs   (precisa do Playwright; mesmo do e2e)
// Cada foto é uma "carta" desenhada em HTML, fotografada com variações de fundo,
// luz, ângulo, foco e tamanho. Elas cobrem o caminho inteiro (achar a carta,
// recortar a faixa do nome e a linha de coleção, OCR, correspondência) — mas não
// substituem fotos reais: as reais entram no manifest com `origem: "real"`.
import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
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

/* ---------------- X11 · estilo "real": a carta com o desenho de uma carta de verdade ----------------
   Borda preta de 3,4%, moldura colorida com textura, barra do título arredondada entre 4,4% e 10,4% com o
   custo de mana à direita, arte cheia de detalhe, linha de tipo, caixa de texto com regras e a linha de
   coleção em duas linhas sobre a borda. E a cena de quem escaneia de verdade: papel pautado, playmat,
   pano preto (a borda some), pilha de cartas por baixo, protetor com reflexo, sombra da mão, carta
   inclinada e em perspectiva. Foi nessas condições que o leitor anterior falhava nas fotos reais. */
const CORES = {
  azul: ['#2f6fb0', '#8fc0e8', '#dfe9f2'], vermelho: ['#b23a2a', '#e39a7c', '#f1dfd3'], verde: ['#2f7a45', '#93c79d', '#dfeada'],
  branco: ['#cfc9b4', '#f1ecd9', '#f6f2e6'], preto: ['#3b3640', '#9a93a0', '#d9d4dc'], ouro: ['#b89a3a', '#e6d28a', '#f3ecd0'], artefato: ['#7d8892', '#c3ccd3', '#e3e8eb']
};
const CENAS = {
  papel: 'repeating-linear-gradient(180deg, #f4f1ea 0 46px, #9fb6d6 46px 48px), #f4f1ea',
  playmat: 'radial-gradient(circle at 20% 15%, #7a3b1e 0 9%, transparent 10%), radial-gradient(circle at 75% 30%, #c98a3a 0 12%, transparent 13%), radial-gradient(circle at 60% 80%, #2c5a7a 0 16%, transparent 17%), repeating-linear-gradient(35deg, #3a2a22 0 14px, #5a3a2a 14px 22px, #2a1c18 22px 40px)',
  preto: 'radial-gradient(circle at 30% 20%, #1c1c1e, #0c0c0d)',
  branco: 'linear-gradient(180deg, #e9e6df, #cfc9bd)',
  mesa: FUNDOS.mesa
};
function cartaReal(f, cw, ch, extra = '') {
  const [c1, c2, c3] = CORES[f.cor || 'azul'];
  const fsT = (ch * 0.040).toFixed(1), fsTipo = (ch * 0.030).toFixed(1), fsR = (ch * 0.026).toFixed(1), fsC = (ch * 0.0165).toFixed(1), bola = (ch * 0.034).toFixed(1);
  const mana = (f.mana || ['1', 'U']).map(m => `<span class="m" style="background:${{ U: '#aad4f0', R: '#f0a890', G: '#9fd3a8', W: '#f6f0d0', B: '#bdb5b8' }[m] || '#cfcfcf'}">${/\d/.test(m) ? m : ''}</span>`).join('');
  return `<div class="carta real" style="width:${cw}px;height:${ch}px;${extra}">
    <div class="quadro" style="background:repeating-linear-gradient(60deg, ${c1} 0 7px, ${c2} 7px 9px, ${c1} 9px 17px), ${c1}"></div>
    <div class="tit" style="font-size:${fsT}px;background:linear-gradient(${c3}, ${c2})"><span>${f.nome}</span><span class="custo" style="--b:${bola}px">${mana}</span></div>
    <div class="art" style="background:
      radial-gradient(ellipse at 30% 35%, #f6d36a 0 6%, transparent 7%), radial-gradient(ellipse at 62% 55%, #1b1320 0 18%, transparent 19%),
      radial-gradient(ellipse at 58% 50%, ${c2} 0 26%, transparent 27%), repeating-linear-gradient(115deg, rgba(255,255,255,.12) 0 3px, transparent 3px 11px),
      linear-gradient(160deg, #0f1a2e, ${c1} 55%, #0a0d14)"></div>
    <div class="tipo" style="font-size:${fsTipo}px;background:linear-gradient(${c3}, ${c2})"><span>${f.tipo || 'Creature — Human Wizard'}</span></div>
    <div class="regras" style="font-size:${fsR}px;background:${c3}">${f.regras || 'When this creature enters the battlefield, draw a card, then discard a card.<br><br><i>"Knowledge is the sharpest blade."</i>'}</div>
    <div class="colecao" style="font-size:${fsC}px">${String(f.numero).padStart(3, '0')}/${String(parseInt(f.numero, 10) + 63).padStart(3, '0')} ${f.raridade || 'U'}\n${f.set.toUpperCase()} • EN  ${f.artista || 'Jane Artist'}</div>
    ${f.reflexo ? '<div class="reflexo"></div>' : ''}
  </div>`;
}
function htmlReal(f) {
  const { largura, altura, fundo = 'mesa', rot = 0, rotX = 0, rotY = 0, brilho = 1, borrao = 0, alturaCarta = 0.6, cx = 0.5, cy = 0.5, pilha = 0, protetor = false, sombra = false } = f;
  const ch = Math.round(altura * alturaCarta), cw = Math.round(ch * 63 / 88);
  const left = Math.round(largura * cx - cw / 2), top = Math.round(altura * cy - ch / 2);
  const porBaixo = Array.from({ length: pilha }, (_, i) => `<div style="position:absolute;left:${-Math.round(cw * 0.07 * (pilha - i))}px;top:${-Math.round(ch * 0.075 * (pilha - i))}px">${cartaReal({ ...f, nome: ['Muddle the Mixture', 'Fact or Fiction', 'Bishop of Rebirth'][i % 3], cor: ['azul', 'azul', 'branco'][i % 3], reflexo: false }, cw, ch)}</div>`).join('');
  const capa = protetor ? `<div class="protetor" style="left:${-Math.round(cw * 0.05)}px;top:${-Math.round(ch * 0.045)}px;width:${Math.round(cw * 1.1)}px;height:${Math.round(ch * 1.075)}px"></div>` : '';
  return `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;width:${largura}px;height:${altura}px;overflow:hidden}
  .foto{position:relative;width:${largura}px;height:${altura}px;background:${CENAS[fundo]};filter:brightness(${brilho}) blur(${borrao}px);perspective:${Math.round(altura * 1.1)}px}
  .cena{position:absolute;left:${left}px;top:${top}px;width:${cw}px;height:${ch}px;transform:rotateX(${rotX}deg) rotateY(${rotY}deg) rotate(${rot}deg);transform-style:preserve-3d}
  .carta.real{position:absolute;left:0;top:0;border-radius:4.6%/3.3%;background:#111112;box-shadow:0 ${Math.round(ch * 0.008)}px ${Math.round(ch * 0.025)}px rgba(0,0,0,.5);overflow:hidden;font-family:"DejaVu Serif","Liberation Serif",Georgia,serif;color:#15110a}
  .quadro{position:absolute;left:3.6%;right:3.6%;top:3.3%;bottom:6.6%;border-radius:1.6%}
  .tit,.tipo{position:absolute;left:5.3%;right:5.3%;border:${Math.max(1, Math.round(ch * 0.0022))}px solid #2a241a;border-radius:${Math.round(ch * 0.012)}px/${Math.round(ch * 0.03)}px;display:flex;align-items:center;justify-content:space-between;padding:0 2.6%;box-sizing:border-box;font-weight:700;white-space:nowrap;box-shadow:inset 0 0 0 ${Math.max(1, Math.round(ch * 0.002))}px rgba(255,255,255,.5)}
  .tit{top:4.4%;height:6%}
  .tipo{top:56.6%;height:5.3%}
  .custo{display:flex;gap:${Math.max(1, Math.round(ch * 0.004))}px}
  .m{width:var(--b);height:var(--b);border-radius:50%;border:1px solid #333;display:grid;place-items:center;font:700 calc(var(--b)*.7)/1 "DejaVu Sans",Arial,sans-serif;box-shadow:-1px 1px 0 #222}
  .art{position:absolute;left:7.4%;right:7.4%;top:11.2%;height:44.4%;border:${Math.max(1, Math.round(ch * 0.002))}px solid #1a1712}
  .regras{position:absolute;left:7.2%;right:7.2%;top:63%;bottom:10.5%;border:${Math.max(1, Math.round(ch * 0.002))}px solid #1a1712;padding:2.4% 3%;box-sizing:border-box;line-height:1.22;overflow:hidden}
  .colecao{position:absolute;left:5.2%;top:94.1%;width:70%;color:#f1f1f1;font-family:"DejaVu Sans",Arial,Helvetica,sans-serif;line-height:1.2;white-space:pre;letter-spacing:.3px}
  .reflexo{position:absolute;inset:0;background:linear-gradient(118deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.5) 44%,rgba(255,255,255,0) 58%);pointer-events:none}
  .protetor{position:absolute;border-radius:3%;border:${Math.max(2, Math.round(ch * 0.004))}px solid rgba(235,240,245,.75);background:linear-gradient(105deg,rgba(255,255,255,.28),rgba(255,255,255,0) 22%,rgba(255,255,255,0) 70%,rgba(255,255,255,.22));box-shadow:0 0 0 1px rgba(120,130,140,.5)}
  .sombra{position:absolute;left:${Math.round(largura * (cx - 0.1))}px;top:${Math.round(altura * (cy + 0.02))}px;width:${Math.round(largura * 0.75)}px;height:${Math.round(altura * 0.6)}px;background:rgba(0,0,0,.42);border-radius:38% 12% 0 0;transform:rotate(-8deg);filter:blur(${Math.round(altura * 0.012)}px)}
  </style><div class="foto"><div class="cena">${porBaixo}${cartaReal(f, cw, ch)}${capa}</div>${sombra ? '<div class="sombra"></div>' : ''}</div>`;
}

const todas = process.argv.includes('--todas');   // sem isto, só as fotos que ainda não existem (as antigas não mudam)
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage();
for (const f of manifest.fotos) {
  if (f.origem !== 'sintetica') continue;
  if (!todas && existsSync(join(dir, f.arquivo))) continue;
  await page.setViewportSize({ width: f.largura, height: f.altura });
  await page.setContent(f.estilo === 'real' ? htmlReal(f) : html(f));
  const buf = await page.screenshot({ type: 'jpeg', quality: 84, fullPage: false });
  writeFileSync(join(dir, f.arquivo), buf);
  console.log(`${f.arquivo} · ${buf.length} bytes`);
}
await browser.close();
