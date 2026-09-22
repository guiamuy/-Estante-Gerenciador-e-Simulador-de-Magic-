# Estante — coleção, listas e mesa de Magic

PWA sem build e sem servidor de aplicação. O `index.html` é o código-fonte.
Planejamento, decisões e status das histórias: **[ROADMAP.md](ROADMAP.md)**.
Prompt para retomar o trabalho numa conversa nova: **[PROMPT.md](PROMPT.md)**.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | A aplicação inteira: design system, dados, listas, motor de regras e mesa |
| `sw.js` | Service worker: funcionamento offline e cache da Scryfall |
| `manifest.webmanifest`, `icon-512.png`, `icon.svg` | Instalação como app |
| `*.test.mjs`, `_load.mjs`, `fixtures.mjs`, `generate.mjs`, `*.json` | Portão de release: unidade, fuzz, golden, integração headless e contrato visual |
| `.github/workflows/gate.yml` | Roda o portão a cada push e toda noite |

## Por que precisa ser publicado

A Scryfall só libera CORS quando a página tem origem http válida. Aberto como arquivo (`file://`), o navegador não envia origem e a requisição é bloqueada.

## Publicar (GitHub Pages)

1. Suba os arquivos em **Add file → Upload files**.
2. Em **Settings → Pages**, selecione **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Abra `https://guiamuy.github.io/-Estante-Gerenciador-e-Simulador-de-Magic-/`.

## Portão de release

```
npm install
npx playwright install chromium
npm test
```

No GitHub, a aba **Actions** mostra o resultado a cada envio: ✓ significa publicável, ✗ significa que não deve ir ao ar.
