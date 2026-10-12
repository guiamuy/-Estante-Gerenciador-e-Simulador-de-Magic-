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
| `publicar.mjs`, `agregacao.mjs`, `.githooks/`, `CLAUDE.md` | Publicação entre conversas simultâneas: `npm run publicar` soma ao `main` e barra quem apagar a entrega de outra trilha sem declarar |
| `LICENSE` | Todos os direitos reservados ao autor; conteúdo de Magic é da Wizards of the Coast (Fan Content Policy) e os dados de cartas, da Scryfall |

## Licença

Código e textos próprios: © 2026 Guilherme de Aguiar Schmidt Amuy, todos os direitos reservados ([LICENSE](LICENSE)). Usar o app publicado é livre; copiar ou reaproveitar o código não. A Estante é conteúdo de fã não oficial, permitido pela Política de Conteúdo de Fãs; não é aprovada nem endossada pela Wizards. Partes dos materiais usados são propriedade da Wizards of the Coast. ©Wizards of the Coast LLC.

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
