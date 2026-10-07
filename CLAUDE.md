# Estante — regras para toda conversa que mexe neste repositório

Várias conversas (trilhas) evoluem o mesmo `index.html` ao mesmo tempo. Publicar **soma** ao produto: nenhuma trilha apaga a entrega de outra sem dizer isso por escrito. Contexto do produto e do plano: `ROADMAP.md` e `PROMPT.md`.

## Publicar

Um caminho só:

```
npm install        # uma vez por clone; também liga o gancho de pre-push
npm run publicar   # busca o main, rebase, guarda de agregação, portão, push
```

- Nunca `git push --force`, nunca `--no-verify`, nunca `git push` direto no `main` sem passar por `npm run publicar`.
- Nunca grave um arquivo inteiro a partir de cópia que não veio do `main` de agora. Edite por patch em cima do que está no clone.
- Leva pequena, um assunto, publicada ao terminar. Quanto mais tempo sem publicar, mais conflito.

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

- Leva com prefixo da trilha (decisão de 06/10/2026): `Leva M-206 · …` para o motor, `B-` bot, `G-` geral, `D-` design, `S-` scanner, `I-` infra — a inicial do rodapé `Trilha:`. Cada trilha conta a sua: o número é o maior `Leva <P>-N` dela em `git log origin/main` + 1 (na primeira vez, o maior número publicado + 1). Não colide com ninguém; a guarda só barra prefixo que não é o da trilha.
- Leva sem prefixo (contagem antiga, ainda aceita): o número é o maior publicado + 1, conferido em `git log origin/main` logo antes do commit. A guarda barra número repetido entre trilhas e diz o próximo livre.
- Na tabela "ordem por dependência" do ROADMAP, cada trilha usa a próxima letra livre de `16º-x`. O portão barra id repetido.

## O portão (`npm test`) tem duas fases

`portao.mjs` roda a **fase rápida** (tudo menos o navegador, um processo por núcleo) e, se ela passar, a **fase de tela** (`e2e.test.mjs` sozinho). `npm run test:rapido` e `npm run test:e2e` rodam uma fase só.

- Teste de tela que cai roda de novo, **sozinho, uma vez**. Passou: o portão passa e o nome sai na lista **INSTÁVEIS** (no CI, como aviso do job). Caiu de novo: portão vermelho. Mais de cinco quedas na mesma rodada não são repetidas.
- Instável não é "resolvido": é dívida da trilha dona do teste. Conserte a causa (espera explícita, estado que sobra do teste anterior, leitor de mentira que não olha o que recebe) e registre na história.
- A fase rápida nunca é repetida. `PORTAO_SEM_REPETIR=1 npm test` desliga a segunda chance, para caçar instabilidade.
- Arquivo de teste novo que abre navegador entra na fase de tela (hoje só `e2e.test.mjs`; `portao.unit` barra navegador na fase rápida).
- O `npm run publicar` olha o `main` a cada dois minutos durante o portão: se outra trilha publicar no meio, ele interrompe a fase e recomeça em cima do `main` novo, em vez de terminar um portão que não serviria.

## O que a guarda faz e o que não faz

`agregacao.mjs` roda em três pontos: dentro do `npm run publicar`, no gancho de pre-push e no CI a cada push. Ela barra: linhas de outra trilha apagadas sem declaração (linha movida ou que só ganhou conteúdo não conta), cópia antiga por cima de nova, leva repetida, histórico reescrito. Ela **não** enxerga conflito de comportamento (duas trilhas mudando a mesma regra em linhas diferentes): isso é trabalho do portão, por isso o portão roda depois do rebase, sobre o código já somado.

Relatório do que aconteceu no `main`: `node agregacao.mjs --auditar 40`.
