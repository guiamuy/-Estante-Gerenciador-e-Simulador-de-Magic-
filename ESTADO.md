# Estante — estado do projeto (ler primeiro)

Arquivo de entrada de toda conversa. Diz onde o projeto está, o que cada trilha está fazendo e onde mora o detalhe. **Teto: 8 KB.** Histórico não entra aqui: vai para o `ROADMAP.md` e para o `git log`.

## Regra de leitura (economia de contexto)

1. Leia este arquivo e o `CLAUDE.md`. Na maioria das levas, isso basta para começar.
2. **Nunca leia o `ROADMAP.md` inteiro** (≈ 2,4 MB, ~15 mil linhas). Puxe só a seção do item: `grep -n "^### <épico>" ROADMAP.md` e `sed -n '<ini>,<fim>p' ROADMAP.md`. A seção 2 (estado por épico) e a tabela de trilhas (seção 8) também são lidas por recorte.
3. Últimas levas da sua trilha: `git log origin/main --format='%cs %s' | grep -m5 "Leva <P>-"`.
4. Conversa longa, contexto pesado: grave o estado aqui, publique e retome numa conversa nova com "segue".

## O produto

PWA de Magic: The Gathering publicado: listas, coleção, scanner de cartas, mesa (assistida e com motor de regras completo), bot Shark, notícias, relatos do dono e painel de BI (`painel.html`). `index.html` é o código-fonte (sem build). Offline primeiro. Portão: `npm test` (fase rápida + fase de tela). Publicação só pela fila (`npm run publicar`; regras no `CLAUDE.md`).

Marcos: Pauper 100% (as sete listas revisadas carta a carta; 682 de 685 listas Pauper a 100% na sentinela depois da M-610, 08/11; Retraction Helix e Rites of Initiation ficam manuais). Motor v112. Commander parcial. Conformidade com as Comprehensive Rules em andamento (épico CR).

## Trilhas (uma linha por trilha; cada trilha reescreve só a sua)

| Trilha | Prefixo | Foco atual | Última leva | Próximo |
|---|---|---|---|---|
| `scanner` | S | X16: #90 foil (F1 só foil; F2 selo "Foil?") | S-625 · 11/11 | calibrar o foil e #79 no aparelho |
| `geral` | G | DS-K3 K3-5 ladrilhos (G-378); T-IDIOMA (G-374, G-377) | G-378 · 11/11 | K3-6; lote Commander; Darval |
| `motor` | M | CR-PLANO Modern | M-619 · 11/11 | Phoenix+FOMO; {E}; Kaito |
| `radar` | R | BI4 · Painel Estante: comparar períodos, metas, tendência | R-44 · 07/11 | BI4-6 em diante; validação do dono após os primeiros pilares |
| `jogabilidade` | J | MK3 · Mesa Vitrine (rotina) | J-68 · 11/11 | MK3-P2 galeria e escolha; relato #54 |
| `bot` | B | B25 · força 55%, Faeries 32,5%, fora ≈ 47%; B-210 impulso e ritual | B-210 · 10/11 | terreno sacrificado; Azorius |
| `infra` | I | migração para a Vercel (https://estante-magic.vercel.app): PR com prévia, portão no clone (sem CI), dados por /dados/ com token de leitura, robôs na nuvem do Claude, rotinas publicam sozinhas, ponte das coleções (faixa no github.io leva tudo para a Vercel) | I-329 · 08/11 | dono levar a coleção pela ponte; depois, repo privado |
| `homologacao` | H | prova de partida do catálogo, revisão em lote (Commander) | H-24 · 01/11 | lote 8 |
| `protecao` | P | segurança e privacidade; Apoiar a Estante (MON1) | P-21 · 26/10 | — |

Paradas, sem conversa ativa (retomam por pedido): `listas` L-12 (14 cartas esperam primitiva do motor) · `tipos` T-130 · `keywords` K-89 · `armazem` A-263 · `cartas` C-2 · `verbos` V-31 (fechada).

Datas no formato dia/mês, horário de Brasília. Trilha que muda de foco atualiza a linha no commit de docs da leva.

## Rotinas agendadas (trabalham sozinhas; conferir antes de pegar o mesmo item)

- **Relatos do dono**, a cada 3 h: lê os relatos do dono e os pedidos de cobertura e resolve de ponta a ponta (prompt em `claude/ROTINA-relatos-do-dono.md`). A Relatos contínuo faz esse trabalho a cada hora.
- **Relatos contínuo**, a cada 1 h (nuvem): roda a fila e atua no relato pendente mais urgente até produção (modo agilidade, 09/11).
- **Sentinela do Pauper**, diária 12h40: cobre as cartas que tiram listas Pauper de 100% (`cobertura/pauper.json` do ramo `catalogo`).
- **Shark contínuo**, a cada 4 h: excelência nas listas que joga, depois todo o Pauper, depois o formato da campanha do motor; trilha `bot`, publica sozinha (B-204).
- **Design DS-K3**, a cada 4 h: uma fatia do DS-K3 por rodada (trilha `geral`).
- **Pendências do dono**, diária 7h43: mantém o artefato "Pendências da Estante" (estado em `claude/ROTINA-pendencias-estado.md`).
- **Motor contínuo**, a cada 3 h: campanha de formato (Modern), primitiva antes de carta.

## Relatos do dono abertos (etiqueta `relato`)

Fila da Relatos contínuo: #90 foil (opção A, fatias em curso: S-623). #66/#53 idiomas: fatias 1 a 5 (3 na G-365, lote 2 na G-368: Pauper e Shark completos, menos Darval, Standard na G-373, Pioneer/Modern G-374, Legacy/Vintage G-377). #95 resolvido (G-363, 09/11; #97 duplicata). #106: G-369. Novos: #108, #107. #90 F2: S-624. #107: G-372.
Leitura e fila dos relatos: seção "Relatos do dono" do `CLAUDE.md`.

## Decisões e pendências do dono

- Commander (R11.2b em diante) pausado desde 06/10/2026: volta quando o épico CR entregar as estruturas que as cartas pedem.
- Radar: depois dos primeiros pilares, pedir validação do dono antes dos demais tópicos (`claude/DIRETRIZ-radar-continuo.md`, no Projeto).
- Vigentes (`claude/DECISOES-dono-2026-10-12.md`): rotina agendada junta o próprio PR no `main` sem homologação, com as condições do `CLAUDE.md` (I-328, 08/11); repositório público (D6); monetização por doações e anúncios (D7), com os dados reais do Apoiar na P-21; política sem `'unsafe-inline'` só depois da integração do motor (D5); mutação e meld esperam (D15); um nome só por conta (D16, G-281).
- Em aberto: D10 patrocínio próprio · D11 rede de anúncios (fora até a D5).
- Escopo negativo: gerador de decks, sugestão de cartas, ranking de metagame, marketplace, multiplayer com mais de dois. Online 1x1 está dentro (U14).
- Design vigente: DS-K "Ébano e Ouro" (decisão de 24/10): `claude/DESIGN-direcoes-2026-10-24.md` e `claude/DIRETRIZ-animacao.md`.
- Sem teste no aparelho: scanner S-613…S-618, mesa DS-K2 (J-37…J-41), faixa sem internet (G-332).
- Pendências do dono: o artefato "Pendências da Estante", atualizado todo dia pela rotina e triado pela `mtg-triagem-pendencias`. Os `claude/PENDENCIAS-dono-*.md` são históricos.

## Onde mora o detalhe

| O quê | Onde |
|---|---|
| Regras de publicação, trilhas, numeração, portão, relatos | `CLAUDE.md` |
| Escopo, ADRs, DoR/DoD, épicos e histórias com status | `ROADMAP.md` (só por recorte) |
| Prompt de sessão | `PROMPT.md` |
| Reservas entre conversas | `claude/TRILHAS-reserva-*.md` (Projeto), uma por item, lidas pela `mtg-coordenacao`; `claude/TRILHAS-ativas.md` é legado, parado em 24/10 |
| Estado consolidado, divergências e índice das reservas | `claude/ESTADO-consolidado-<data>.md` (Projeto) |
| Diretrizes permanentes (telemetria, motor contínuo, radar, animação) | `claude/DIRETRIZ-*.md` (Projeto); o contrato do `telemetria.mjs` é a `DIRETRIZ-telemetria` |
| Estratégias e planos | `claude/ESTRATEGIA-*.md` (motor, épico CR) e `claude/PLANO-*.md` (monetização, cobertura) no Projeto |
| Detalhe por trilha | `claude/CONTEXTO-adendo-<trilha>-*.md` (Projeto); `claude/CONTEXTO.md` é retrato de 01/10 (motor v64), só história |
| Registro e histórico do orquestrador | `claude/ORQUESTRADOR-registro.md`, `claude/ORQUESTRADOR-historico.md` (Projeto; "Planos em curso" parado em 24/10) |

Os documentos `claude/…` moram no Projeto do claude.ai, fora do repositório: a sessão os lê pela ferramenta do Projeto.

## Como atualizar

No commit de docs de cada leva (o mesmo que atualiza o ROADMAP): reescreva a **sua** linha na tabela de trilhas, atualize relatos e pendências se mudaram e troque a data abaixo. Edite por patch, nunca o arquivo inteiro. Conflito no rebase: fique com as linhas das outras trilhas e a sua. Passou de 8 KB: resuma, não acrescente.

Atualizado: 11/11/2026 · I-328 (rotinas publicam) · M-612 (motor) · I-329 (ponte) · S-622 (scanner) · B-206 · B-207 · B-208 (bot) · G-362 a G-369 (geral) · S-623 (scanner) · M-613 · G-373 · M-615 · B-209 (bot) · G-371 · J-64 · J-65 · S-624 (scanner) · M-616 · G-372 · G-374 · S-625 · J-67 · G-375 · B-210 (bot) · M-618 · G-377 · J-68 · M-619 · G-378
