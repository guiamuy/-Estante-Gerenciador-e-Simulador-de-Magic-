# Estante — estado do projeto (ler primeiro)

Arquivo de entrada de toda conversa. Diz onde o projeto está, o que cada trilha está fazendo e onde mora o detalhe. **Teto: 8 KB.** Histórico não entra aqui: vai para o `ROADMAP.md` e para o `git log`.

## Regra de leitura (economia de contexto)

1. Leia este arquivo e o `CLAUDE.md`. Na maioria das levas, isso basta para começar.
2. **Nunca leia o `ROADMAP.md` inteiro** (≈ 2,4 MB, ~15 mil linhas). Puxe só a seção do item: `grep -n "^### <épico>" ROADMAP.md` e `sed -n '<ini>,<fim>p' ROADMAP.md`. A seção 2 (estado por épico) e a tabela de trilhas (seção 8) também são lidas por recorte.
3. Últimas levas da sua trilha: `git log origin/main --format='%cs %s' | grep -m5 "Leva <P>-"`.
4. Conversa longa, contexto pesado: grave o estado aqui, publique e retome numa conversa nova com "segue".

## O produto

PWA de Magic: The Gathering publicado: listas, coleção, scanner de cartas, mesa (assistida e com motor de regras completo), bot Shark, notícias, relatos do dono e painel de BI (`painel.html`). `index.html` é o código-fonte (sem build). Offline primeiro. Portão: `npm test` (fase rápida + fase de tela). Publicação só pela fila (`npm run publicar`; regras no `CLAUDE.md`).

Marcos: Pauper 100% (as sete listas revisadas carta a carta; 644 de 644 listas Pauper a 100% na sentinela, M-607). Commander parcial. Conformidade com as Comprehensive Rules em andamento (épico CR).

## Trilhas (uma linha por trilha; cada trilha reescreve só a sua)

| Trilha | Prefixo | Foco atual | Última leva | Próximo |
|---|---|---|---|---|
| `scanner` | S | X16/X20: tela nova do scanner, edição e arte pela impressão, idiomas impressos (coreano, russo, phyrexiano) — relatos #60–#65 | S-618 · 07/11 | relato #62 (OCR do alfabeto phyrexiano fora); X15 melhor quadro ▶ |
| `geral` | G | Coleção grande sem esperar artes, gravação em transação (relato #65); seleção e etiquetas na Coleção (G2); tour guiado (TUT) | G-352 · 07/11 | fechar relato #65; relatos #53/#66 (pacotes de idioma) |
| `motor` | M | cartas lidas por inteiro (Shadowspear, Once Upon a Time…); sentinela Pauper | M-608 · 07/11 | CR2c.2 "destruir todas" por filtro ▶; relato #58 (Lotleth Giant) |
| `radar` | R | BI4 · Painel Estante: comparar períodos, metas, tendência | R-44 · 07/11 | BI4-6 em diante; validação do dono após os primeiros pilares |
| `jogabilidade` | J | MJ25/MJ27 · mesa de patamar: paisagem, orientação, Cancelar em toda escolha | J-62 · 03/11 | relato #54 (efeito da Cidade Baixa) |
| `bot` | B | B25 · Shark por baralho; força absoluta 55% (alvo 60%) | B-201 · 02/11 | subir a força para 60% |
| `infra` | I | portão em duas fases, fila de publicação (Q17), tempo do CI | I-321 · 07/11 | — |
| `homologacao` | H | prova de partida do catálogo, revisão em lote (Commander) | H-24 · 01/11 | lote 8 |
| `protecao` | P | segurança e privacidade; Apoiar a Estante (MON1) | P-21 · 26/10 | — |

Datas no formato dia/mês, horário de Brasília. Trilha que muda de foco atualiza a linha no commit de docs da leva.

## Relatos do dono abertos (etiqueta `relato`)

#66 e #53 pacotes de idioma · #65 scanner (alta) · #62 cartas phyrexianas · #58 Lotleth Giant sem dano (impede o uso) · #54 efeito da Cidade Baixa · #49 transcrição. Leitura e fila dos relatos: seção "Relatos do dono" do `CLAUDE.md`.

## Decisões e pendências do dono

- Commander (R11.2b em diante) pausado desde 06/10/2026: volta quando o épico CR entregar as estruturas que as cartas pedem.
- Radar: depois dos primeiros pilares, pedir validação do dono antes dos demais tópicos (`claude/DIRETRIZ-radar-continuo.md`, no Projeto).
- Pendências que só o dono executa: `claude/PENDENCIAS-dono-*.md` no Projeto, triadas pela `mtg-triagem-pendencias`.

## Onde mora o detalhe

| O quê | Onde |
|---|---|
| Regras de publicação, trilhas, numeração, portão, relatos | `CLAUDE.md` |
| Escopo, ADRs, DoR/DoD, épicos e histórias com status | `ROADMAP.md` (só por recorte) |
| Prompt de sessão | `PROMPT.md` |
| Reservas entre conversas | `claude/TRILHAS-reserva-*.md` e `claude/TRILHAS-ativas.md` (Projeto), lidas pela `mtg-coordenacao` |
| Diretrizes permanentes (motor contínuo, radar, animação) | `claude/DIRETRIZ-*.md` (Projeto) |
| Registro e histórico do orquestrador | `claude/ORQUESTRADOR-registro.md`, `claude/ORQUESTRADOR-historico.md` (Projeto) |

## Como atualizar

No commit de docs de cada leva (o mesmo que atualiza o ROADMAP): reescreva a **sua** linha na tabela de trilhas, atualize relatos e pendências se mudaram e troque a data abaixo. Edite por patch, nunca o arquivo inteiro. Conflito no rebase: fique com as linhas das outras trilhas e a sua. Passou de 8 KB: resuma, não acrescente.

Atualizado: 07/11/2026 · I-321 (criação do arquivo)
