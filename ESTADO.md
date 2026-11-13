# Estante — estado do projeto (ler primeiro)

Arquivo de entrada de toda conversa. Diz onde o projeto está, o que cada trilha está fazendo e onde mora o detalhe. **Teto: 8 KB.** Histórico não entra aqui: vai para o `ROADMAP.md` e para o `git log`.

## Regra de leitura (economia de contexto)

1. Leia este arquivo e o `CLAUDE.md`. Na maioria das levas, isso basta para começar.
2. **Nunca leia o `ROADMAP.md` inteiro** (≈ 2,4 MB, ~15 mil linhas). Puxe só a seção do item: `grep -n "^### <épico>" ROADMAP.md` e `sed -n '<ini>,<fim>p' ROADMAP.md`. A seção 2 (estado por épico) e a tabela de trilhas (seção 8) também são lidas por recorte.
3. Últimas levas da sua trilha: `git log origin/main --format='%cs %s' | grep -m5 "Leva <P>-"`.
4. Conversa longa, contexto pesado: grave o estado aqui, publique e retome numa conversa nova com "segue".

## O produto

PWA de Magic: The Gathering publicado: listas, coleção, scanner de cartas, mesa (assistida e com motor de regras completo), bot Shark, notícias, relatos do dono e painel de BI (`painel.html`). `index.html` é o código-fonte (sem build). Offline primeiro. Portão: `npm test` (fase rápida + fase de tela). Publicação: PR por leva e trem de produção (`npm run publicar`, `node trem.mjs`; regras no `CLAUDE.md`).

Marcos: Pauper 100% (as sete listas revisadas carta a carta; 681 de 686 listas Pauper a 100% depois da M-623, 12/11; 5 cartas esperam primitiva). Motor v112. Commander parcial. Conformidade com as Comprehensive Rules em andamento (épico CR).

## Trilhas (uma linha por trilha; cada trilha reescreve só a sua)

| Trilha | Prefixo | Foco atual | Última leva | Próximo |
|---|---|---|---|---|
| `scanner` | S | X16: #90 foil (F1 só foil; F2 selo "Foil?") | S-625 · 11/11 | calibrar o foil e #79 no aparelho |
| `geral` | G | DS-K3 K3-5 ladrilhos (G-378); T-IDIOMA (G-380, G-383) | G-383 · 12/11 | K3-6; Commander sem Oracle (falta a Scryfall); Darval |
| `motor` | M | Modern 144/743 | M-628 · 13/11 | Cling to Dust |
| `radar` | R | BI4 · Painel Estante: comparar períodos, metas, tendência | R-44 · 07/11 | BI4-6 em diante; validação do dono após os primeiros pilares |
| `jogabilidade` | J | MK3 · Mesa Vitrine (rotina); #152 (J-72, 1/3) | J-72 · 12/11 | #152 fatias 2 e 3; MK3-P2; #54 |
| `bot` | B | B25 · força 55%, Faeries 32,5%, fora 52% ✓ | B-212 · 11/11 | força e Faeries |
| `infra` | I | trem de produção (I-331/I-332): leva abre PR sem prévia; o trem soma os PRs a cada 2 h (rotina própria desde 12/11), portão sobre a soma, uma prévia e um merge; orçamento de 24 h com reserva de 30 | I-332 · 12/11 | primeiro trem com I-331, I-332 e o backlog; ponte das coleções; repo privado |
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
- **Trem de produção**, a cada 2 h: junta os PRs abertos sobre o `main`, portão uma vez, uma prévia e um merge (`node trem.mjs`; seção no `CLAUDE.md`). Nenhuma outra rotina faz merge.
- **Motor contínuo**, a cada 3 h: campanha de formato (Modern), primitiva antes de carta.

## Relatos do dono abertos (etiqueta `relato`)

#90 foil (S-623, S-624). #66/#53 idiomas: lotes G-365 a G-380 (Pauper a Commander). #151 idioma na mesa: G-381 (fatia 5a; 5b e 5c seguem). #152 ritmo do turno do oponente: livre. #135: G-379. #136: J-69.
Fila da Relatos contínuo: #90 foil (opção A, fatias em curso: S-623). #66/#53 idiomas: lotes G-365, G-368 (Pauper e Shark), G-373 Standard, G-374 Pioneer/Modern, G-377 Legacy/Vintage, G-380 Commander, G-383 cartas novas. #95 resolvido (G-363, 09/11; #97 duplicata). #106: G-369. Novos: #108, #107. #90 F2: S-624. #107: G-372.
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

Atualizado: 13/11/2026 · J-64 · M-623 · G-383 · M-624 · M-628
