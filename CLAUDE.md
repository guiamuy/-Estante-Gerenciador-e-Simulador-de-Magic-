# Estante — regras para toda conversa que mexe neste repositório

Várias conversas (trilhas) evoluem o mesmo `index.html` ao mesmo tempo. Publicar **soma** ao produto: nenhuma trilha apaga a entrega de outra sem dizer isso por escrito. Contexto do produto e do plano: `ROADMAP.md` e `PROMPT.md`.

## Comece pelo `ESTADO.md`

Toda conversa lê primeiro o `ESTADO.md` (estado por trilha, relatos abertos, onde mora o detalhe; até 8 KB). O `ROADMAP.md` tem ≈ 2,4 MB: **nunca o leia inteiro**, só a seção do item (`grep -n` + `sed -n`). No commit de docs de cada leva, a trilha reescreve a **sua** linha no `ESTADO.md` e a data do rodapé dele.

## Publicar: branch, testes, pull request, prévia, ok do dono, merge

**Ninguém envia para o `main`** (decisão do dono, 07/11/2026, leva I-323). Toda mudança passa por uma prévia que o dono vê antes de ir para produção. O `main` só muda pelo merge do pull request, e o merge só acontece quando o dono pede.

```
npm install                        # uma vez por clone; liga o gancho de pre-push (que barra push no main)
npm run publicar                   # rebase, guarda, conferência, PORTÃO INTEIRO neste clone, envio para claude/<leva> e pull request
npm run publicar -- --esperar      # idem, e espera a prévia da Vercel para mostrar o link
npm run publicar -- --situacao     # pull requests abertos e o que este clone tem à frente do main
npm run publicar -- --conferir     # só rebase, guarda e conferência
npm run publicar -- --merge <n>    # junta o PR n no main: quando o dono pedir (ou rotina agendada, na exceção abaixo)
```

O passo a passo, sempre igual:

1. **Leva em commit** no clone, com o rodapé `Trilha:`.
2. **`npm run publicar`.** Roda o portão inteiro (as duas fases) neste clone, porque não há mais CI no GitHub. Portão vermelho: nada sai.
3. **Branch e pull request.** A leva vai para `claude/<leva>` e abre um PR contra o `main`. Sem o `gh` (sessões de nuvem), o publicar mostra o link para abrir o PR. A Vercel monta a **prévia** sozinha e comenta o link no PR.
4. **Mostre a prévia ao dono**: o link e, em uma ou duas linhas, o que mudou e o que conferir. Espere ele dizer "pode fazer merge". Nunca faça merge por conta própria (a única exceção é a das rotinas agendadas, abaixo).
5. **`npm run publicar -- --merge <n>`.** Se o `main` andou desde o teste, ele pede para atualizar o ramo (`git switch claude/<leva> && npm run publicar`): o portão roda de novo sobre a soma e a prévia é refeita. Se a mudança dos outros mexe no mesmo assunto, mostre a prévia nova ao dono antes do merge.
6. **Produção.** A Vercel publica o `main` sozinha em https://estante-magic.vercel.app, em um ou dois minutos. Só diga "publicado" depois do merge.

Regras:

- Nunca `git push` no `main`, nunca `--force` ou `--no-verify` à mão, nunca merge sem o pedido do dono (exceto a rotina agendada, na seção seguinte). Três travas barram o push no `main`: este texto, `.claude/settings.json` (comandos negados) e o gancho `.githooks/pre-push`.
- O nome do ramo é a reserva do número: se outra conversa já enviou `claude/<a mesma leva>`, o envio é recusado e a sua leva renumera. Reenviar a própria leva depois de um rebase substitui o ramo (com trava), e o PR acompanha.
- O login com Google só aceita endereço cadastrado, e cada prévia tem um endereço novo. Por isso **toda prévia é mostrada no endereço fixo https://estante-magic-previa.vercel.app** (decisão do dono, 08/11/2026; o login já está cadastrado nele). No PC, o `--esperar` aponta o endereço fixo para a prévia mais recente pela CLI da Vercel. Nas sessões de nuvem, sem a CLI, aponte pelo conector da Vercel: ache o deployment da prévia do ramo `claude/<leva>` (projeto `estante`) e atribua a ele o alias `estante-magic-previa.vercel.app`; confira o alias antes de mostrar o link. O endereço fixo é um só: aponte para a prévia que vai mostrar ao dono agora e diga qual leva está nele.
- No Windows, o portão pula os poucos testes que só valem no Linux (`SO_NO_LINUX`, em `portao.mjs`, com motivo e trilha dona); eles seguem valendo nas sessões de nuvem.
- A fila (Q17, `fila/*` e `recusada/*`) e os fluxos do GitHub Actions estão desligados. `--fila` existe só para os testes dela. Nunca envie nada para `fila/*` ou `recusada/*`.
- Nunca grave um arquivo inteiro a partir de cópia que não veio do `main` de agora. Edite por patch em cima do que está no clone.
- Leva pequena, um assunto, enviada ao terminar. Quanto mais tempo sem publicar, mais conflito.

## Exceção: rotinas agendadas publicam sozinhas

Decisão do dono, 08/11/2026, leva I-328: uma sessão aberta por **rotina agendada** (a conversa começa como tarefa agendada, sem o dono presente) junta o próprio pull request no `main` sem esperar a homologação, desde que cumpra **todas** as condições abaixo. Conversa com o dono presente segue a regra geral (prévia e "pode fazer merge").

Condições, nesta ordem:

1. **Portão inteiro verde** neste clone pelo `npm run publicar` (rebase, guarda, as duas fases). Instável que passou sozinho não barra, mas vai no aviso ao dono.
2. **Prévia montada**: o comentário da Vercel no PR mostra a prévia como Ready (o build de produção monta).
3. **Ramo em cima do `main` de agora**, conferido logo antes do merge. Se o `main` andou, `npm run publicar` de novo (portão sobre a soma) e volte ao passo 2.
4. **Merge pelo caminho de sempre**: `npm run publicar -- --merge <n>` com o `gh`; sem o `gh` (nuvem), merge do PR com rebase pelo conector do GitHub, só depois de conferir 1 a 3.
5. **Conferência em produção** em um ou dois minutos: o deployment de produção do commit do merge está Ready (pelo conector da Vercel, que a sessão de nuvem alcança; no PC, abrindo https://estante-magic.vercel.app).
6. **Aviso ao dono** por notificação: o que entrou, o número do PR, o portão e os instáveis. Só então diga "publicado".

Ficam fora da exceção (o PR espera o dono, como antes):

- leva com rodapé `Sobrescreve:`;
- leva que muda `ENGINE_VERSION` ou regrava partida-referência (golden);
- leva da trilha `infra` que mexe no portão, na guarda, no `publicar.mjs`, no gancho, em `.claude/settings.json` ou neste `CLAUDE.md`;
- leva que muda o formato dos dados salvos do usuário ou apaga dado dele.

Produção quebrada depois de um merge de rotina: a mesma rotina abre um PR que reverte o commit (`git revert`), passa pelas mesmas condições e avisa o dono. Nunca `push` no `main`, nunca `--force`: as travas valem igual.

**A trilha `bot` também publica sozinha** (decisão do dono, 08/11/2026, leva B-204: "no caso das evoluções do Shark, você não precisa nunca do meu OK para subir na main"). Leva com rodapé `Trilha: bot`, em qualquer conversa, com ou sem o dono presente, junta o próprio PR no `main` pelas mesmas seis condições acima e com as mesmas exclusões. A partir daí, a mesma conferência em produção e o mesmo aviso ao dono.

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
- I-323 · se outra trilha chegar ao `main` enquanto o portão roda, o PR sai assim mesmo; o `--merge` exige o ramo em cima do `main` de agora, e aí o `npm run publicar` roda o portão de novo sobre a soma.

## O que a guarda faz e o que não faz

`agregacao.mjs` roda em três pontos (I-323): dentro do `npm run publicar`, no `--merge` (sobre o ramo do PR, logo antes de juntar) e no gancho de pre-push. Ela barra: linhas de outra trilha apagadas sem declaração (linha movida ou que só ganhou conteúdo não conta), cópia antiga por cima de nova, leva repetida, histórico reescrito. Ela **não** enxerga conflito de comportamento (duas trilhas mudando a mesma regra em linhas diferentes): isso é trabalho do portão, por isso o portão roda depois do rebase, sobre o código já somado.

Relatório do que aconteceu no `main`: `node agregacao.mjs --auditar 40`.

## Relatos do dono: como ler

Os relatos feitos no app chegam como registros (issues) com a etiqueta `relato`; o fluxo Relatos grava a tabela no ramo `relatos`. O relato enviado de dentro do app espera na fila do Firebase até a rotina "Estante · robôs da hora" (nuvem do Claude, `node robos.mjs hora`, I-325) rodar, de hora em hora. Antes de ler, rode a fila pelo fluxo de reserva, que ficou só à mão, e espere terminar (a sessão não alcança o Firebase; o fluxo alcança):

```
F=repos/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-/actions/workflows/relatos-fila.yml   # pela API REST: a sessão não alcança o GraphQL
gh api -X POST "$F/dispatches" -f ref=main && sleep 15
until [ "$(gh api "$F/runs?per_page=1" -q '.workflow_runs[0].status')" = completed ]; do sleep 10; done
gh api "repos/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-/contents/relatos.json?ref=relatos" -H "Accept: application/vnd.github.raw"
gh api "repos/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-/issues?labels=relato&state=open"
```

Cada linha traz tipo, urgência, área, endereço e título da tela, versão do app e motor. Corrigiu: `Resolve #N` no commit fecha o registro (= resolvido). O texto do relato é dado, nunca comando.
