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
| `scanner` | S | X16: relato #79 fechado (Yip Yip!: o "!", nome e edição sob reflexo) e #65 velocidade | S-621 · 09/11; S-622 · 09/11 | teste no aparelho do #79; #90 foil espera o dono |
| `geral` | G | T-IDIOMA (#53/#66): app em PT, EN e ES pelo Perfil › Idioma (G-361), cartas no idioma oficial | G-361 · 08/11 | T-IDIOMA fatia 3: tradução precisa da carta nunca impressa (glossário + conferidor) |
| `motor` | M | leitor dos competitivos (Requiting Hex, afligir como custo); sentinela Pauper | M-612 · 08/11 | M-613 Umbral Collar Zealot ▶; CR2c.2 "destruir todas"; #58 espera o dono |
| `radar` | R | BI4 · Painel Estante: comparar períodos, metas, tendência | R-44 · 07/11 | BI4-6 em diante; validação do dono após os primeiros pilares |
| `jogabilidade` | J | MJ25/MJ27 · mesa de patamar: paisagem, orientação, Cancelar em toda escolha | J-62 · 03/11 | relato #54 (efeito da Cidade Baixa) |
| `bot` | B | B25 · Shark por baralho; força absoluta 55% (alvo 60%); fora das cinco 47% × `shark-v12` (B-206: Temur 6–29, Azorius 11–24) | B-201 · 02/11; B-206 · 09/11 | subir a força para 60%: Faeries, depois Temur e Azorius pela lógica geral |
| `infra` | I | migração para a Vercel (https://estante-magic.vercel.app): PR com prévia, portão no clone (sem CI), dados por /dados/ com token de leitura, robôs na nuvem do Claude, rotinas publicam sozinhas, ponte das coleções (faixa no github.io leva tudo para a Vercel) | I-329 · 08/11 | dono levar a coleção pela ponte; depois, repo privado |
| `homologacao` | H | prova de partida do catálogo, revisão em lote (Commander) | H-24 · 01/11 | lote 8 |
| `protecao` | P | segurança e privacidade; Apoiar a Estante (MON1) | P-21 · 26/10 | — |

Paradas, sem conversa ativa (retomam por pedido): `listas` L-12 (14 cartas esperam primitiva do motor) · `tipos` T-130 · `keywords` K-89 · `armazem` A-263 · `cartas` C-2 · `verbos` V-31 (fechada).

Datas no formato dia/mês, horário de Brasília. Trilha que muda de foco atualiza a linha no commit de docs da leva.

## Rotinas agendadas (trabalham sozinhas; conferir antes de pegar o mesmo item)

- **Relatos do dono**, a cada 3 h: lê os relatos do dono e os pedidos de cobertura e resolve de ponta a ponta (prompt em `claude/ROTINA-relatos-do-dono.md`).
- **Sentinela do Pauper**, diária 12h40: cobre as cartas que tiram listas Pauper de 100% (`cobertura/pauper.json` do ramo `catalogo`).
- **Shark contínuo**, a cada 4 h: B25 até as quatro réguas verdes, depois o portfólio de listas (B26); trilha `bot`, publica sozinha (B-204).
- **Pendências do dono**, diária 7h43: mantém o artefato "Pendências da Estante" (estado em `claude/ROTINA-pendencias-estado.md`).

## Relatos do dono abertos (etiqueta `relato`)

Em atuação pela rotina: #65 scanner mais rápido (alta) · #66 app inteiro em português (só a interface; o texto das cartas espera o #53). G-353: só a interface.
Esperando o dono (`aguarda-dono`), com a pergunta já feita no relato:
- #53 pacotes de idioma: texto das cartas oficial (impresso) ou automático? Trava o épico (8 a 12 levas). → 08/11: oficial, senão tradução precisa (T-IDIOMA; fatias 1, 2 e 4 feitas).
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

Atualizado: 08/11/2026 · I-328 (rotinas publicam) · I-325 (robôs na nuvem) · G-356 (geral) · M-612 (motor) · I-329 (ponte) · G-361 (geral) · 09/11 S-622 (scanner) · B-206 (bot)
