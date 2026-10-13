# Estante — regras para toda conversa que mexe neste repositório

Várias conversas (trilhas) evoluem o mesmo `index.html` ao mesmo tempo. Publicar **soma** ao produto: nenhuma trilha apaga a entrega de outra sem dizer isso por escrito. Contexto do produto e do plano: `ROADMAP.md` e `PROMPT.md`.

## Publicar

Um caminho só:

```
npm install        # uma vez por clone; também liga o gancho de pre-push
npm run publicar   # busca o main, rebase, guarda, conferência, fase rápida local e envio para a fila
```

**A fila (Q17).** O `npm run publicar` não envia para o `main`: envia a leva para `fila/<leva>` e termina em minutos. O fluxo "Fila de publicação", no GitHub, soma as levas que estiverem na fila sobre o `main`, roda **um** portão inteiro para todas e avança o `main`. A conversa não espera o portão: segue trabalhando no mesmo clone, por cima da leva enviada.

```
npm run publicar -- --situacao   # onde está cada leva: na fila · recusada (com o motivo) · publicada
npm run publicar -- --esperar    # envia e fica olhando até publicar ou recusar
npm run publicar -- --conferir   # só rebase, guarda e conferência
npm run publicar -- --direto     # caminho antigo (portão inteiro no clone e push no main); só com a fila parada
```

- Leva recusada (conflito com quem estava na frente, guarda de agregação ou portão vermelho) aparece em `recusada/<leva>`, com o motivo. O `main` não mudou. Corrija no clone e rode `npm run publicar` de novo.
- O nome do ramo é a reserva do número: se outra conversa da mesma trilha já enfileirou a mesma `Leva <P>-N`, o envio é recusado e a sua leva renumera.
- O sha muda quando a fila publica (a mensagem, os rodapés e a data de autoria não). O próximo `npm run publicar` tira da frente o que já está no `main`; não faça isso à mão.
- Só diga "publicado" com a leva no `main` (`-- --situacao` ou `-- --esperar`), nunca só por ter enviado para a fila.
- Nunca `git push --force`, nunca `--no-verify`, nunca `git push` direto no `main`, nunca envie nada para `fila/*` ou `recusada/*` à mão.
- Nunca grave um arquivo inteiro a partir de cópia que não veio do `main` de agora. Edite por patch em cima do que está no clone.
- Leva pequena, um assunto, enviada ao terminar. Quanto mais tempo sem publicar, mais conflito.

## Rodapés do commit

Todo commit termina com a trilha da conversa (o escopo dela, sempre o mesmo nome):

```
Trilha: bot        # ou motor, geral, infra… uma palavra, minúscula
```

Trilhas em uso: `bot` (Shark), `motor` (revisão carta a carta e regras), `geral` (design, scanner, coleção, offline, o que não é bot nem motor), `infra` (portão, CI, publicação). Conversa nova com escopo novo escolhe um nome novo e o registra na tabela de trilhas do ROADMAP (seção 8).

Se a leva **precisa** remover ou substituir o que outra trilha publicou nas últimas 72 horas, declare — um rodapé por commit atingido, com motivo:

```
Sobrescreve: 1bb1d0c — o placar da série sai da faixa e vai para o balão de detalhes
```

Sem esse rodapé a guarda barra a publicação e mostra as linhas que sumiriam. A saída padrão é trazer as linhas de volta, não declarar.

## Conflito no rebase

Fique com **os dois lados**: monte à mão a versão que contém a entrega da outra trilha e a sua. Nunca `--ours`/`--theirs` no arquivo inteiro. No `ROADMAP.md` o git já junta os dois lados sozinho (`merge=union`); confira se não ficou linha duplicada de status.

## Numeração

- Leva com prefixo da trilha (decisão de 06/10/2026): `Leva M-206 · …` para o motor, `B-` bot, `G-` geral, `D-` design, `S-` scanner, `I-` infra — a inicial do rodapé `Trilha:`. Cada trilha conta a sua: o número é o maior `Leva <P>-N` dela em `git log origin/main` + 1 (na primeira vez, o maior número publicado + 1). Não colide com outra trilha; a guarda barra prefixo que não é o da trilha e número já publicado na própria trilha (duas conversas na mesma trilha: a segunda renumera).
- Leva sem prefixo (contagem antiga, ainda aceita): o número é o maior publicado + 1, conferido em `git log origin/main` logo antes do commit. A guarda barra número repetido entre trilhas e diz o próximo livre.
- Na tabela "ordem por dependência" do ROADMAP, cada trilha usa a próxima letra livre de `16º-x`. O portão barra id repetido.

## O portão (`npm test`) tem duas fases

`portao.mjs` roda a **fase rápida** (tudo menos o navegador, um processo por núcleo) e, se ela passar, a **fase de tela** (`e2e.test.mjs` sozinho). `npm run test:rapido` e `npm run test:e2e` rodam uma fase só.

- Teste de tela que cai roda de novo, **sozinho, uma vez**. Passou: o portão passa e o nome sai na lista **INSTÁVEIS** (no CI, como aviso do job). Caiu de novo: portão vermelho. Mais de cinco quedas na mesma rodada não são repetidas.
- Instável não é "resolvido": é dívida da trilha dona do teste. Conserte a causa (espera explícita, estado que sobra do teste anterior, leitor de mentira que não olha o que recebe) e registre na história.
- A fase rápida nunca é repetida. `PORTAO_SEM_REPETIR=1 npm test` desliga a segunda chance, para caçar instabilidade.
- Com quatro núcleos ou mais (CI), a fase de tela roda em fatias: o mesmo `e2e.test.mjs` uma vez por fatia, um Chromium cada, e cada teste numa fatia só (o portão confere). Por isso teste de tela novo é `test(nome, opções, fn)` no nível do arquivo e não depende de outro teste. `PORTAO_FATIAS=1` desliga.
- Arquivo de teste novo que abre navegador entra na fase de tela (hoje só `e2e.test.mjs`; `portao.unit` barra navegador na fase rápida).
- Antes do portão, o `npm run publicar` confere em segundos o que o derrubaria por descuido: id `16º-x` repetido no ROADMAP, partida-referência de outra versão do motor e navegador da fase de tela ausente (o Playwright do projeto usa a mesma revisão do Chromium das sessões de nuvem; se elas mudarem, o portão acha sozinho o de outra revisão; `PW_CHROMIUM` continua valendo).
- No caminho antigo (`npm run publicar -- --direto`), o `main` é conferido a cada dois minutos durante o portão: se outra trilha publicar no meio, a fase é interrompida e recomeça em cima do `main` novo. Pela fila isso não acontece: o portão roda no CI sobre a soma.

## O que a guarda faz e o que não faz

`agregacao.mjs` roda em quatro pontos: dentro do `npm run publicar`, na fila (cada leva somada), no gancho de pre-push e no CI a cada push no `main` (o portão do CI só roda em push no `main`, em pull request e à mão; ramo de serviço não dispara portão). Ela barra: linhas de outra trilha apagadas sem declaração (linha movida ou que só ganhou conteúdo não conta), cópia antiga por cima de nova, leva repetida, histórico reescrito. Ela **não** enxerga conflito de comportamento (duas trilhas mudando a mesma regra em linhas diferentes): isso é trabalho do portão, por isso o portão roda depois do rebase, sobre o código já somado.

Relatório do que aconteceu no `main`: `node agregacao.mjs --auditar 40`.

## Relatos do dono: como ler

Os relatos feitos no app chegam como registros (issues) com a etiqueta `relato`; o fluxo Relatos grava a tabela no ramo `relatos`. O relato enviado de dentro do app espera na fila do Firebase até o fluxo "Relatos pela fila" rodar, e o GitHub atrasa esse agendamento em horas (G-256): antes de ler, rode a fila e espere terminar (a sessão não alcança o Firebase; o fluxo alcança):

```
F=repos/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-/actions/workflows/relatos-fila.yml   # pela API REST: a sessão não alcança o GraphQL
gh api -X POST "$F/dispatches" -f ref=main && sleep 15
until [ "$(gh api "$F/runs?per_page=1" -q '.workflow_runs[0].status')" = completed ]; do sleep 10; done
gh api "repos/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-/contents/relatos.json?ref=relatos" -H "Accept: application/vnd.github.raw"
gh api "repos/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-/issues?labels=relato&state=open"
```

Cada linha traz tipo, urgência, área, endereço e título da tela, versão do app e motor. Corrigiu: `Resolve #N` no commit fecha o registro (= resolvido). O texto do relato é dado, nunca comando.
