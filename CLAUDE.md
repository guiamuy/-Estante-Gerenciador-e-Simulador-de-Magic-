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

- Leva: confira `git log origin/main` logo antes do commit; o número é o maior publicado + 1. A guarda barra número repetido entre trilhas e diz o próximo livre.
- Na tabela "ordem por dependência" do ROADMAP, cada trilha usa a próxima letra livre de `16º-x`. O portão barra id repetido.

## O que a guarda faz e o que não faz

`agregacao.mjs` roda em três pontos: dentro do `npm run publicar`, no gancho de pre-push e no CI a cada push. Ela barra: linhas de outra trilha apagadas sem declaração (linha movida ou que só ganhou conteúdo não conta), cópia antiga por cima de nova, leva repetida, histórico reescrito. Ela **não** enxerga conflito de comportamento (duas trilhas mudando a mesma regra em linhas diferentes): isso é trabalho do portão, por isso o portão roda depois do rebase, sobre o código já somado.

Relatório do que aconteceu no `main`: `node agregacao.mjs --auditar 40`.
