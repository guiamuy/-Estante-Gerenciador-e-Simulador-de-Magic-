# DS-K3 · Vitrine e Movimento — especificação por fatia

Fonte: as duas propostas aprovadas pelo dono, condensadas em 09/11/2026 (leva G-362) para que outra sessão implemente sem
abrir os artefatos:

- "DS-K3 · Vitrine" (07/11/2026): https://claude.ai/artifact/459GzLeaqeXuujLpde1Nuy
- "DS-K3 · Movimento" (08/11/2026): https://claude.ai/artifact/AuGE564WAZMzC9mhgTgUeW

Estado de cada fatia e ordem: `ROADMAP.md`, seção "### DS-K3 · Vitrine e Movimento". Este arquivo diz **o quê** e **com
que valores**; a história de cada leva (Valor, Aceite, Testes, Fora) continua sendo escrita no ROADMAP ao fechar a fatia.

## Decisões do dono (08/11/2026: "seguir com todo o plano", opções recomendadas)

- Veio de madeira sai do fundo; fica grão fino (2A, feito na K3-1).
- Arte que inclina com o aparelho (P7): **ligada por padrão**, com opção para desligar em Aparência.
- Barra que recolhe ao rolar: **sim** (K3-3).
- Navegação entre telas: **com direção e elemento compartilhado** (MV-1, MV-2).
- Movimento em Aparência: **três níveis** — Completo (segue o aparelho) · Moderado · Reduzido (feito na MV-0).
- Gestos: **os cinco** (voltar pela borda, puxar para atualizar, segurar para espiar, arrastar para reordenar, folha).
- Ordem: **intercalar** MV nas levas K3 (cada tela já nasce com a sua receita de movimento).
- **Fora:** MV-10 (abertura "A montagem, elevada" e a troca de marca) e o nome **"The Shelf"**, adiados pelo dono; voltam
  só depois da FA-2, com ele. Nenhuma fatia abaixo usa "The Shelf".

## Gramática de movimento (R1–R5)

- **R1 · Tudo vem de onde está.** O que o dedo tocou é o que se transforma (ladrilho vira hero; carta lida cai na doca;
  número rola, não troca). Nada aparece do nada; nada some sem ir para algum lugar (lista excluída afunda). Técnica: View
  Transitions com nome compartilhado; FLIP onde a tela não troca.
- **R2 · Avançar afasta, voltar aproxima.** Subtela: a atual recua 4 % e escurece; a nova chega da direita e da
  profundidade. Voltar: o inverso, no mesmo caminho. Folha sobe de baixo; aviso desce de cima; diálogo cresce do centro;
  troca de aba é esmaecer com deslize de 8 px no sentido da aba.
- **R3 · Mola para o que pousa, saída para o que vai.** O que chega e fica pousa com mola; o que sai sai com `--sai`, sempre
  mais curto que a entrada (≤ `--dur-2`). O que acompanha o dedo tem a velocidade do dedo; a mola só entra quando ele solta.
- **R4 · O dedo manda.** Toda animação é interrompida pelo próximo toque, que conclui o estado na hora. Gesto tem
  resistência no sentido que não faz nada e limiar de velocidade para concluir.
- **R5 · Uma coisa por vez.** Por tela: um movimento-herói (≤ `--dur-4`), micro-movimentos silenciosos (≤ `--dur-2`, no
  lugar, deslocamento ≤ `--desloc-1`) e nada mais; `--calma` (300 ms) sem herói novo depois de um herói; laço só em dois
  lugares (ocioso da marca e espera).

**Critério de rejeição (dono, 24/10):** toda receita diz numa linha o que a separa de uma transição linear 2D —
profundidade (Z ou sombra que muda), luz (varredura ou fio), massa (mola ou antecipação) ou coreografia (etapas
sobrepostas). Só deslizar ou só esmaecer não entra (exceto a saída, curta de propósito). Toda receita declara plano · luz ·
curva · etapas · reduzido, e as três variantes (completo, moderado, reduzido).

## Base já no app (não recriar)

- **Material (K3-0, G-357):** `--elev-0..4` (escuro `#0a0704 #130e09 #1b140d #241b12 #2e2318`; claro `#e9dfc9 #f1e8d4
  #f7f0df #fcf6e8 #fffaf0`), `--edge`/`--edge-strong`, `--shadow-contact`/`--shadow-key`/`--shadow-float`, `--lacquer`,
  `--grain`, `--scrim-art` + `--fg-sobre-arte` (`#f6eedd`) e `--fg-sobre-arte-muted` (`#d6c8ad`), iguais nos dois temas,
  `--radius-4` 22 px, `--tilt-max` 6deg. `--brass-soft` da proposta = `--accent-soft`. Latão: `--accent`, `--accent-hi`,
  `--accent-lo` (mudam com a cor de destaque escolhida).
- **Movimento (MV-0, G-357):** `--dur-0` 60 · `--dur-1` 110 · `--dur-2` 180 · `--dur-3` 280 · `--dur-4` 420 · `--dur-5` 600 ms;
  `--escalona-1/2/3` 60/90/140 ms; molas em `linear()`: `--mola-firme` (rigidez 220, amortecimento 18; par `--dur-3`;
  chip, segmento, botão e barra que voltam), `--mola-macia` (170/14; par `--dur-4`; ladrilho, carta que pousa, aviso,
  hero), `--mola-suave` (120/16, quase sem repique; par `--dur-5`; folha ao soltar, odômetro, tela que chega);
  `--sai: cubic-bezier(.4,0,1,1)`; `--ease-out: cubic-bezier(.22,.61,.36,1)`; `--desloc-1/2/3` 8/16/32 px;
  `--z-recuo` −40 px e `--z-chega` −120 px (com `perspective: 900px`); `--calma` 300 ms.
  - **Moderado** (`:root[data-movimento="moderado"]`): deslocamentos 4/6/8 px, Z 0, inclinação 0, escalonamento 30/45/70 ms,
    `--dur-4` e `--dur-5` = `--dur-3`, as três molas = `--ease-out`. Ou seja: sem profundidade, sem inclinação, viagens curtas.
  - **Reduzido** (`data-movimento="reduzido"` ou o sistema com Completo): deslocamentos e Z 0, inclinação 0, animações e
    transições instantâneas; estado final num quadro. Laços (fio, brilho) param.
- **Superfície (K3-1, G-358):** fundo fora da mesa = luz de cima (E3) + grão; cartões E3 com laca, aresta e duas sombras;
  folha e diálogo E4 + `--shadow-float`.
- **Espera (MV-4, G-359, parcial):** imperceptível < 300 ms; curta = fio que percorre (`Spinner`); média = esqueleto com luz.
- **Barra (K3-2, G-362):** pílula `--navbar-alt` 64 a `--navbar-folga` 14 das bordas, Jogar 56 px com `--navbar-ressalto`
  16; vidro (`--vidro`, `--vidro-desfoque`) só nela, reserva opaca `--vidro-reserva`; `--navbar-h` (pé até o topo da barra)
  e `--navbar-reserva` (+ ressalto). O contrato "DS-K3 K3-2" barra `--vidro-desfoque` fora da barra.

## Regras transversais (valem em toda fatia)

- **Balcão · Gaveta · Armário** (ROADMAP, Conduta de design): por tela, 1 ponto de luz (hero ou destaque), 1 primário em
  latão, ≤ 3 secundárias visíveis, ≤ 4 chips na primeira dobra, 5 destinos na barra. Semanal/contextual vai para gaveta
  (folha com alça, menu de três pontos ou chip "Mais"); configuração vai para o Perfil.
- **Orçamento técnico:** só `transform`, `opacity` e `filter` (mais `clip-path` e `stroke-dashoffset` em desenho);
  nenhuma duração, curva, distância, sombra, raio ou alfa literal em componente (só token); cor nova = token nos três
  blocos (escuro, claro, claro automático) com par de contraste no contrato visual; componente novo entra no `/ds` antes do uso.
- **Texto sobre arte:** sempre sobre `--scrim-art`; AA medido sobre o pé do véu, não sobre a arte. Arte = Scryfall
  `art_crop` da carta-chave, por `ImagemCarta` (cadeia de reserva: placa com a identidade de cor da lista + símbolo de mana).
- **Tipografia editorial:** eixo à esquerda; rótulo 11 px, caixa alta, espaçamento .18em, latão, peso 600; título em
  `--font-display` 34 px, entrelinha 1, −.015em, itálico (peso 500, `--accent-hi`) só na palavra viva ("Boa *noite*,
  Guilherme"); número grande em `--font-display` 40 px; título compacto 18 px. Nada centralizado além da vitrine vazia e do
  número grande.
- **Idioma (G-361):** todo texto novo de tela precisa de tradução em `idiomas/en.json` e `idiomas/es.json` (o
  `idioma-pacotes.unit` barra; `node idioma-extrai.mjs --faltam en`).
- **Testes:** contrato visual "DS-K3 <fatia>" + e2e "G-<leva>" em 360 × 780 nos dois temas com `auditaTela`; receitas com
  as três variantes; e2e que espera movimento mede o fim (`finished`/estado assentado), nunca tempo fixo.
- **Desfoque:** a proposta permite desfoque só na barra e na faixa compacta do cabeçalho (duas áreas pequenas). Selo sobre
  arte e Relatar, que na proposta têm desfoque, ficam **sem** desfoque (fundo ébano a .55 sobre o véu).

## Valores das telas-modelo (360 × 780; mapeados para tokens)

- **Hero de arte:** 200 px de altura (Lista: até 210), raio `--radius-3`, `inset 0 1px 0 var(--edge-strong)`,
  `--shadow-key`, `--shadow-contact`; véu `--scrim-art`; texto no terço inferior, a 16 px das laterais e 14 px do pé:
  rótulo 10 px .18em caixa alta `--accent-hi`, título `--font-display` 26 px entrelinha 1 em `--fg-sobre-arte`, linha 12 px
  em `--fg-sobre-arte-muted`; mana em pontos de 14 px + selo.
- **Selo:** 24 px de altura (22 no ladrilho), padding 0 9 px, raio cheio, 11 px (10 no ladrilho) .06em caixa alta, peso
  600, texto `--accent-hi`, borda 1 px de latão a .45; variante neutra em `--fg-muted` com borda clara .18.
- **Ladrilho de lista:** grade de 2 colunas, gap 12, 150 px de altura (largo: coluna inteira, 120 px), raio 14,
  `inset 0 1px 0 var(--edge-strong)` + chave + contato; véu; texto a 12 px das laterais e 10 do pé: nome em
  `--font-display` 17 px entrelinha 1.05, linha 11 px com mana e "60 · 52 na coleção"; posse = fio de 2 px a 4 px do pé,
  trilho claro .18, preenchimento gradiente `--accent-lo` → `--accent-hi`; selo do formato no canto superior esquerdo (10/10).
- **Linha de coleção:** grade `40px 1fr auto`, gap 12, padding 10 0, divisor 1 px de luz a .06; miniatura 40 × 56 raio 4 com
  contato + `0 4px 10px -6px`; nome 14 px 600; linha 11,5 px em `--fg-subtle` (edição com símbolo + número · raridade);
  quantidade em `--font-display` 20 px `--accent-hi` (em `--warning` quando falta carta). 72 px por linha, 7 por tela.
- **Botões da proposta:** 48 px, raio 14, 14,5 px 600, padding 0 14; latão (primário), fantasma (fio claro .10 + aresta),
  texto (40 px, `--accent-hi`). O app já tem `Button`: usar as variantes existentes, ajustando altura/raio por token.
- **Chip:** 36 px de desenho (44 de toque), padding 0 12, raio cheio, 13 px 600 `--fg-muted`, fio claro .14 + aresta;
  ligado: texto `--accent-hi`, fio de latão .55, brilho `0 0 14px -4px` latão .5, fundo `--accent-soft`. Linha de chips
  com máscara que esmaece a partir de 85 %. Nunca dois chips cheios.
- **Segmentado:** 40 px, raio 12, fundo ébano .35 com sombra interna, padding 3, gap 3; ligado: E4 → E3 +
  `--edge-strong` + contato, texto `--fg`; desligado `--fg-subtle`. Sem latão cheio.
- **Busca:** 46 px, raio 14, padding 0 14, fundo ébano .35 com sombra interna e fio .06; 14 px `--fg-subtle`.
- **Topo:** 52 px; marca 34 × 34 raio 9; avatar 34; botões de ícone com 44 de toque.
- **Tema claro das telas-modelo:** papel `--elev-*` claro; texto `#241b0f`, apagado `#5a4a33`, sutil `#7d6b50`; latão
  `#7a5a17`, alto `#9a7526`, baixo `#5e4410` (usar os tokens `--fg*`/`--accent*` do app, que já têm AA); primário claro com
  texto `#fbf6ea` sobre latão escuro (já é o `--accent-fg` do claro).

## Fatias pendentes

### MV-1 · navegação com direção (depois da K3-2)
- **Entrega:** Avançar, Voltar e Troca de aba com View Transitions (`document.startViewTransition`); reserva sem a API =
  esmaecer com `--desloc-1`; a cortina `Transicao()` deixa de travar o toque (hoje mínimo de 450 ms).
- **Avançar (abrir subtela):** a tela atual recua `--z-recuo` e escurece 6 %; a nova chega de `--desloc-3` à direita e de
  `--z-chega`; `--mola-suave` · `--dur-4`; recuo e chegada juntos, cabeçalho da nova 60 ms depois (`--escalona-1`); o fio
  de luz da nova acende ao pousar. Separa do 2D: recuo em Z da tela de trás.
- **Voltar:** inverso exato, `--ease-out` · `--dur-3`.
- **Troca de aba (os cinco destinos da barra, na ordem Início · Listas · Jogar · Coleção · Scanner):** o conteúdo esmaece e
  desliza `--desloc-1` no sentido da aba; a barra fica; o indicador (fio de 16 px) varre até a aba nova; `--ease-out` ·
  `--dur-2`; indicador → conteúdo com 40 ms.
- **Cortina de espera:** só quando há espera real > 200 ms; ébano com a arte de espera; não trava toque e some sozinha;
  entra e sai em `--dur-2`; reduzido: "Um momento…" parado.
- `view-transition-name` só no hero e na barra; o resto esmaece em grupo (orçamento de quadros).
- **Moderado:** sem Z (tokens já valem 0), deslocamentos curtos, `--ease-out`. **Reduzido:** Avançar/Voltar = esmaecer;
  Troca de aba = troca direta.
- **Telas:** roteador (`hashchange`) e `Transicao()`; todas as telas fora da mesa. **Aceite:** abrir qualquer subtela
  empurra a de trás; voltar faz o caminho inverso; nenhum "Um momento…" trava o toque. **Testes:** e2e nas duas vias (com e
  sem a API). **Fora:** elemento compartilhado ladrilho → hero (MV-2), Jogar → mesa (MV-9), gesto de voltar pela borda (MV-6).

### K3-3 + K3-4 (+ MV-7) · barra que recolhe e cabeçalho editorial que recolhe
- **K3-3 · barra que recolhe:** ao rolar para baixo a pílula desce 100 % + `--navbar-folga` (+ área segura), com o Jogar
  junto; volta no primeiro gesto para cima. Saída `--sai` · `--dur-2` (proposta: ease-out 220 ms); volta `--mola-firme` ·
  `--dur-3` (proposta: mola 320 ms). Parada: ganha 0 px; rolando: +78 px de conteúdo. Moderado: igual com `--ease-out`.
  Reduzido: a barra fica sempre visível. A decidir na leva (não coberto pela proposta): Relatar, botão de ação e aviso
  descem junto (recomendado: sim, pela mesma variável) e o vão do `#outlet` continua reservado no fim da página.
- **K3-4 · cabeçalho:** duas alturas — editorial (rótulo + título 34 à esquerda; ex.: "Minhas listas · 6" sobre
  "Listas") e compacta (faixa de 48 px, título 18 px `--font-display` 600) ao rolar; −40 px ao rolar; o voltar fica em
  44 × 44 à esquerda nas duas; subtelas já abrem compactas com o voltar. Telas: Início, Listas, Coleção, Perfil, Notícias.
  Faixa compacta: E0 a .98 → .90; a proposta permite desfoque nela — se usar, a K3-4 amplia o guarda-corpo da K3-2 para
  duas regras e dá a ela a mesma reserva opaca; sem desfoque, opaca. Reduzido: troca direta nos 40 px.
- **MV-7 por dentro:** cabeçalho, barra e paralaxe do hero guiados pela rolagem com `animation-timeline: scroll()` em
  `@supports`, reserva em JS com `requestAnimationFrame` e ouvinte `passive` (mesma receita, sem mudar o que se vê).
- **Aceite:** rolando a Coleção a barra some e a lista ganha a altura dela, um gesto para cima a traz; o título de Listas
  está à esquerda com o rótulo acima e vira faixa de 48 px ao rolar; rolar devagar move o cabeçalho na proporção do dedo.

### K3-5 · ladrilho com a arte da carta-chave
- **Entrega:** o ladrilho de lista (evolui a I1) com a arte da carta-chave sob `--scrim-art`, selo do formato, nome em
  Cormorant 17, mana em pontos, posse em fio de latão (valores em "Ladrilho de lista" acima). Vale em Listas, Últimas
  listas (Início) e Listas prontas.
- **Estados:** sem arte ou sem rede, a placa com a identidade de cor + símbolo de mana; arte em cache pelo `sw.js`.
- **Movimento:** a posse cresce ao entrar (`--ease-out` · `--dur-4`, `--escalona-2` entre ladrilhos); reduzido: fio no lugar.
  O "ladrilho tocado" entra na K3-12.
- **Aceite:** cada lista mostra a arte da carta-chave e o texto é legível em qualquer arte (AA medido sobre o véu).
  **Risco declarado:** grade de arte pode "virar Netflix" — selo e fio de posse seguram a identidade.

### K3-6 · vitrine vazia
- **Entrega:** componente `Vitrine` no `/ds` e em todos os vazios: Início, Listas, Coleção, Notícias, Partidas, Relatos.
  Texto à esquerda (padding 28 18 22), 1 primário + 1 fantasma (botões lado a lado, `flex: 1`, gap 10) e o resto numa
  gaveta "Mais formas".
- **Desenho:** placa de 150 px, raio 14, fundo radial (70 % × 90 % no topo, latão a .22) sobre E1 → E0; prateleira a 14 px
  das laterais e 26 do pé, 6 px de altura, raio 3, madeira (escuro `#4a3a27 → #2a2118`, claro `#b79c6a → #8a7046`, como
  tokens novos), sombra `0 6px 10px -4px` .8 + aresta; quatro silhuetas de carta 46 × 64 raio 5 a 32 px do pé, em
  x = 60/118/176/234 px, rotação −4°/2°/−2°/5°, tracejado de latão a .45 com fundo .05; a do meio (x 118) **acesa**: borda
  sólida `--accent-hi` .7, gradiente .25 → .05, brilho `0 0 24px` latão .35; foco de luz 160 × 200 acima (topo −40),
  radial `--accent-hi` .35 com blur 4. Claro: latão `#7a5a17`/`#9a7526` nas mesmas alfas. Título `--font-display` 24 px
  (entrelinha 1.05, margem 14 0 6), texto 13 px.
- **Textos das telas-modelo:** Coleção — "Nenhuma carta ainda" / "Aponte a câmera para a primeira" / "O scanner lê o nome
  e a edição e guarda a carta aqui. Depois, a Coleção mostra o que falta para cada lista." / Escanear · Colar lista ·
  "Mais formas de importar". Listas — "Nenhuma lista ainda" / "Sete listas de Pauper já estão prontas e jogam a 100% no
  motor. Uma delas pode ser sua em um toque." / Ver prontas · Nova lista · "Colar do Moxfield, Archidekt ou Arena". Início
  — "Comece pela prateleira de cima" / "Escolha uma lista pronta de Pauper e jogue contra o Shark em um minuto. Ou cole a
  sua do Moxfield, Archidekt ou Arena." / Ver prontas · Colar lista.
- **Movimento:** a ilustração se desenha na MV-11 e a "porta de vitrine" é da K3-12; o momento "primeira lista na estante" é
  da MV-8. Reduzido: estática. **Aceite:** a Coleção vazia mostra a prateleira com uma carta acesa, "Escanear" e "Colar
  lista"; o resto está em "Mais formas" (−1 linha de botões).

### K3-7 · Início na direção Vitrine
- **Entrega:** Balcão = hero (Continuar, se há partida, ou lista em destaque) + Últimas listas (ladrilhos) + Notícias.
  Os atalhos saem (a barra já é o atalho); Relatar discreto; faixa sem internet de uma linha (I2); um único latão cheio na
  tela (o Jogar da barra).
- **Modelo:** rótulo "Sábado · 7 de novembro"; título "Boa *noite*, Guilherme" (saudação pela hora); linha "4 listas
  prontas para jogar · Pauper a 100%"; hero: rótulo "Continuar · turno 6", título "Dimir Faeries × Shark", linha "Você 14 ·
  Shark 11 · sua vez de jogar"; "Últimas listas" em ladrilhos (selo, nome, "60 · 58 na coleção"); "Notícias" em linhas.
  Vazio: vitrine da K3-6.
- **Movimento:** hero e ladrilhos chegam pela "porta de vitrine" (K3-12), ladrilhos escalonados `--escalona-2`; um herói só.
- **Aceite:** o Início cabe em uma tela e meia; há um único latão cheio. **Risco:** duas artes claras lado a lado
  competem — ordenar os ladrilhos por cor. **Fora:** Continuar → mesa (MV-9).

### K3-8 + MV-3 · Coleção, FLIP, odômetro e chips
- **K3-8:** rótulo "Coleção · 312 cartas únicas"; o número grande é o título ("1.248 cartas", `--font-display` 40 px,
  −.02em, sufixo 12 px .08em caixa alta); painel por cor (padding 14 16): seis barras W U B R G C (`--mana-*`), grade de 6,
  gap 6, 54 px de altura, raio 4 4 2 2, brilho interno no topo .25 + contato; "Por cor · toque filtra" e "R$ 2.140 ·
  estimado"; **tocar uma barra filtra**; chips em fio (Tudo · Pauper · Faltam nas listas · Repetidas, ≤ 4); busca no topo;
  linhas densas (valores acima). Vistas, CSV, "pelo nome" e exportar descem para a gaveta. Importar (prévia) não anima.
- **MV-3 · Reorganizar (FLIP com Web Animations):** quem fica desliza `--mola-firme` · `--dur-3`; quem entra pousa de
  `--z-chega` curto; quem sai afunda e esmaece `--sai` · `--dur-2`; ordem saídas → deslizes (`--escalona-1`) → entradas;
  acima de 40 visíveis, só os visíveis (+ 1 tela) animam, teto de 40 nós; só `translate`, nunca `scale` em texto.
  Reduzido: troca direta. Vale também em Listas (filtro, ordem, nova, excluir).
- **Odômetro (componente):** dígitos rolam separados, só os que mudam, `--mola-suave` · `--dur-4`; reduzido: o número
  troca. Usos: total da coleção, posse da lista, contador do scanner (a mesa já tem o seu).
- **Chip e segmento que mudam de forma:** ao ligar, a pílula vira retângulo arredondado (raio cheio → 12 px, padding
  14 → 18) e o fio de latão acende (`--dur-0`); `--mola-firme` · `--dur-2`; o anterior desliga 40 ms antes. Reduzido: troca de cor.
- Barras por cor mudam de altura com `--mola-firme` ao filtrar. Esqueleto → conteúdo: opacidade cruzada sem salto de
  altura, `--ease-out` · `--dur-2`, blocos escalonados `--escalona-1`.
- **Aceite:** tocar a barra azul filtra as azuis; tocar "Pauper" faz as listas deslizarem para o lugar novo; o total rola
  ao adicionar cartas; a linha mostra miniatura, edição com número e quantidade em Cormorant.

### K3-9 · Lista
- **Entrega (evolui a L1):** o hero é o título (abre já com o cabeçalho compacto): selos "Pauper" e "100% jogável",
  rótulo "Carta-chave · Spellstutter Sprite", título "Dimir Faeries", linha "60 cartas · você tem 52 · faltam 8"; três
  números (Criaturas 18 · Mágicas 24 · Terrenos 18, em `--font-display`); segmentado Cartas · Curva · Partidas; linhas
  densas ("Spellstutter Sprite · Criatura · MMA · 4 na coleção", "Counterspell · Instantânea · MH2 · 2 de 4") com a
  quantidade em Cormorant e em `--warning` quando falta.
- **Movimento:** posse e números com odômetro (MV-3); segmentos que mudam de forma. Hero de 210 px empurra a lista —
  compensado pelo cabeçalho compacto (−40) e pela barra que recolhe (+78).
- **Aceite:** a Lista abre compacta com o hero; quantidade em âmbar quando falta carta.

### MV-2 · ladrilho → hero e espiar (depois da K3-5 e da K3-9)
- **Ladrilho → hero:** `view-transition-name` no ladrilho tocado e no hero da Lista; o navegador anima posição, tamanho e
  canto; o texto fica fixo e cresce junto; a tela de trás recua 4 % em Z e escurece. `--mola-macia` · `--dur-4`; etapas
  ladrilho (0) → véu (40 ms) → cabeçalho compacto (120 ms); varredura única no hero ao pousar. Voltar: o caminho inverso.
  Vale em Listas → Lista e Últimas listas → Lista. Reduzido: esmaecer com o hero no lugar.
- **Segurar para espiar (Coleção, Lista):** a miniatura cresce do próprio lugar até a carta grande, o fundo escurece junto;
  soltar devolve; reflexo P7 na carta grande; `--mola-macia` · `--dur-3`; reduzido: a carta grande aparece no lugar. Mesma
  regra de segurar da mesa (o clique ao soltar é engolido; arrastar cancela).
- **Aceite:** tocar uma lista faz o ladrilho crescer até o hero; segurar uma carta a traz do próprio lugar.

### K3-10 · Notícias e scanner
- **Notícias:** capa = arte da carta citada (92 × 72, raio 10, lateral; 100 % × 160 no destaque "Destaque · hoje"); sem
  carta citada, papel com o rótulo da fonte; **nunca sigla em caixa**. Linha: grade `1fr 92px`, gap 12, padding 12 0;
  fonte 10,5 px .1em caixa alta latão 600; título `--font-display` 17 px entrelinha 1.1; linha 11,5 px ("Pauper · 4 min ·
  cita Lightning Bolt"). Chips Português · English · Guardadas · N. Sem internet: faixa "Sem internet · Mostrando as 12
  notícias guardadas de ontem · Ver" e as guardadas marcadas "guardada".
- **Scanner (coordenar com a trilha `scanner`, que é a dona da tela):** a barra some (como hoje); doca com alça (40 × 4,
  raio 2, clara .25), raio 24 24 0 0, E3 → E1, aresta forte e sombra para cima `0 -14px 30px -12px`; selo de confirmação
  com nome e edição ("Lightning Bolt · 2XM"); "Lidas nesta sessão · 7 cartas · 1 para conferir"; miniaturas 44 × 62 raio 4,
  gap 8, marca de lida (círculo 12 px `--positive`) ou dúvida (14 px `--warning` com "?"); primário "Guardar N". Moldura e
  linha de varredura atuais ficam; com OCR ocupado nenhum outro movimento roda.
- **Movimento:** "carta lida" (K3-12) — a miniatura cai na doca de 24 px acima com sombra que encurta, varredura no selo,
  `--mola-macia` · `--dur-4` (proposta: 380 ms) + vibração curta; reduzido: o selo aparece, sem queda.
- **Aceite:** a notícia que cita uma carta mostra a arte dela; no scanner, a carta lida aparece como selo e cai na doca.

### K3-11 · Perfil
- **Entrega:** cartão de identidade de 150 px (raio `--radius-3`, foco de luz radial 60 % × 80 % em 30 % 0 com latão
  .25, E3 → E1, aresta forte e chave): avatar 64 px (16, 22) com aro `--accent-lo` 2 px e brilho 24 px; nome em
  `--font-display` 24 a partir de x 96 ("Guilherme", linha 12 px 'Na mesa, "Gui" · desde 2026'); rótulo "Conta Google ·
  sincronizado 22:30"; três números no pé (Listas 6 · Cartas 1.248 · Partidas 23: rótulo 11 px .06em caixa alta, número
  `--font-display` 22 `--accent-hi`). Aparência: segmentado Escuro · Claro sem latão cheio. Ajustes em lista com ícone em
  latão (itens de 52 px, grade `36px 1fr auto`, subtítulo de estado 11,5 px): Cor de destaque (Latão) · Movimento ("Arte
  inclina com o aparelho · ligado") · Dados e backup ("Último backup hoje, 21:10") · O que sai do aparelho ("Scryfall,
  GitHub, Firebase") · Relatos ("2 em andamento"); cada item abre a sua subtela. **Salvar some** (salva ao sair).
- **Aceite:** o Perfil não tem latão cheio; cada item diz o seu estado no subtítulo. É a tela mais "lista": vive de
  tipografia e espaço, de propósito.

### MV-5 · retorno de ação (feedback)
- **Aviso (toast):** pousa com mola e empilha até 3 (o de baixo recua 4 % e escurece); sai curto; fio de luz no topo;
  `--mola-macia` · `--dur-4`; sai `--sai` · `--dur-2`; teto de 3 e saída automática em 4 s; reduzido: aparece no lugar.
  A proposta faz o aviso descer de cima (R2); hoje ele mora embaixo, acima da barra e das docas — a leva decide e declara
  (recomendado: manter a posição atual e aplicar a mola e a pilha).
- **Negar (ação inválida):** o controle treme 2 px, duas vezes, e volta; `--ease-out` · `--dur-2`; reduzido: borda em
  `--negative` por `--dur-3`.
- **Destrutivo com desfazer:** o item afunda (escala .96, Z −20 px, sombra encurta) com `--sai` · `--dur-3`; o aviso com
  Desfazer pousa 80 ms depois; desfazer o traz pelo mesmo caminho com `--mola-macia`; reduzido: some e o aviso aparece.
- **Vibração fora da mesa** (pela camada de plataforma, `haptics.evento` da trilha MJ): confirmar = curta; limiar de gesto =
  curta; erro = dupla; destrutivo = nenhuma; momento = longa. Som fora da mesa só em momentos, opcional.
- **Otimismo:** ação local aparece feita na hora; se a rede falhar, o item volta com treme curto e aviso.
- **Herdado da MV-4:** o giro do botão ocupado (`aria-busy`) vira o fio da família de espera.
- **Aceite:** excluir uma lista a afunda na prateleira e o aviso com Desfazer a traz de volta pelo mesmo caminho.

### MV-6 · os cinco gestos (depende da MV-1)
- **Voltar pela borda:** arrastar da borda esquerda (faixa de 24 px; limiar de 12 px antes de assumir) puxa a subtela com o
  dedo e a de trás volta de Z proporcionalmente; ao soltar, `--mola-suave` conclui ou volta (limiar 35 % da largura ou
  0,4 px/ms); reduzido: igual, sem Z.
- **Puxar para atualizar (Notícias, Relatos):** só com a lista no topo; resistência logarítmica; a prateleira da arte de
  espera desce; no limiar, vibração curta; soltar aciona e a luz percorre a prateleira enquanto carrega; `--mola-firme` ao
  soltar; reduzido: indicador parado.
- **Segurar para espiar:** na MV-2.
- **Arrastar para reordenar (listas):** o item levanta 6 px com sombra longa (`--dur-1`) e segue o dedo; os outros abrem
  espaço com FLIP `--mola-firme` · `--dur-2`; fio de luz do item acende; reduzido: setas ▲▼. Pede ordem manual de listas
  (hoje não existe): só depois da K3-5.
- **Folha:** a atual + véu com vinheta que acompanha a posição e limiar de velocidade para soltar (`--mola-suave`).
- Todo gesto tem botão equivalente. **Testes:** toque sintético do Playwright. **Aceite:** arrastar da borda esquerda puxa
  a subtela com o dedo e a de trás volta em profundidade.

### K3-12 · receitas de movimento no `/ds` (e P7)
- **Porta de vitrine (entrar na tela):** fundo escurece 6 %; o conteúdo sobe 12 px (usar `--desloc-2`) e aproxima em Z
  (escala .98 → 1); sombra-chave cresce; varredura única no hero ao pousar; `--mola-macia` · `--dur-4`; cabeçalho → hero →
  blocos com `--escalona-2`; reduzido: estado final em um quadro.
- **Ladrilho tocado:** levanta 3 px, sombra-chave alonga, arte aproxima 2 %, fio de luz do topo clareia; `--mola-firme` ·
  `--dur-3` (proposta: 260 ms); solta `--sai` · `--dur-2`; reduzido: só o fio de luz.
- **Arte que inclina (P7):** arte ±`--tilt-max` (6°), véu e texto fixos, moldura ±2°, reflexo de 8 % desliza no sentido
  oposto, sombra alonga do lado contrário à luz; giroscópio pela camada de plataforma a 30 Hz, suavização de 120 ms; só
  hero e carta grande; ligada por padrão, opção em Aparência › Movimento; desligada em Moderado e Reduzido; no iOS, só
  depois da permissão.
- **Carta lida (scanner):** ver K3-10.
- **Aceite:** inclinar o aparelho move a arte do hero até 6°; desligar em Aparência para tudo.

### MV-11 · ícones vivos 2 (depois da K3-2 e da K3-6)
- Quatro famílias, mapeadas aos 27 movimentos atuais (`MOVIMENTOS_DE_ICONE`), que continuam valendo no toque:
  - **Navegação** (barra, abas, voltar): ao ficar ativo, o traço vira preenchimento que sobe de baixo como tinta
    (`fill-opacity` por `clip-path`) e o fio de latão varre até o ícone; `--mola-firme` · `--dur-2`; reduzido: troca de cor.
  - **Ação** (guardar, excluir, atualizar, compartilhar, colar): no resultado, um segundo gesto curto (guardar: a tinta
    preenche; excluir: a tampa tomba e fecha; atualizar: meia volta e para; compartilhar: a seta sai e volta);
    `--mola-firme` · `--dur-2`; reduzido: só o estado final.
  - **Estado** (sino, nuvem, sincronizado, posse, coração): quando o estado muda, sem toque, **uma batida** (sino balança
    uma vez — 0° → 14° → −11° → 6° → 0° — e o ponto de latão salta com mola; nuvem pisca uma vez); `--mola-macia` ·
    `--dur-3`; nunca em laço; reduzido: o ponto aparece.
  - **Ilustração** (vitrine vazia, tutorial, momentos): o traço se desenha (`stroke-dashoffset`), cerca de 1 cm por 100 ms,
    escalonado por caminho, fio de luz ao terminar; `--ease-out` até `--dur-5`; reduzido: traço pronto.
- Regras: o desenho do ícone se move, botão, sombra e rótulo ficam; um ícone por vez por tela; ícone em latão recebe a
  varredura do botão, nunca a sua. Guarda-corpo: ícone sem movimento declarado em `MOVIMENTO_DO_ICONE` (ou `'nada'`
  explícito) falha o teste do `/ds`.
- **Aceite:** chegar uma notificação faz o sino balançar uma vez e o ponto saltar; a aba ativa da barra está preenchida; a
  vitrine vazia se desenha ao abrir.

### MV-8 · momentos e tema que troca em círculo (depois da K3-6 e da K3-10)
- Raros, com `--dur-5`, cada um só na primeira vez por dia (lista completa) ou por sessão (scanner):
  - **Primeira lista na estante:** a vitrine vazia acende a carta do meio e o ladrilho real pousa na prateleira; o foco de
    cima intensifica e volta; `--mola-macia` · `--dur-5`; acende → pousa → título troca; reduzido: ladrilho no lugar.
  - **Lista completa (posse 100 %):** o fio de posse fecha e vira selo "Completa" com varredura única; `--ease-out` ·
    `--dur-5`; reduzido: o selo aparece.
  - **Scanner guardou N:** as miniaturas da doca se juntam numa pilha que desce para a aba Coleção da barra e o contador
    rola (odômetro); `--mola-suave` · `--dur-5`; reduzido: o contador troca.
- **Tema claro ↔ escuro:** View Transition circular a partir do segmentado de tema, `--dur-4`; reduzido: troca direta.
- **Aceite:** guardar as cartas do scanner junta as miniaturas numa pilha que desce para a aba Coleção e o contador rola.

### MV-9 · ponte da mesa (trilha `jogabilidade`, pela skill da mesa)
- Única fatia que toca a mesa; o contrato vai para o `/ds` e a leva é executada na trilha `jogabilidade`.
- **Jogar → mesa:** o hero da lista recua e vira a carta-chave no grimório; a mesa chega de `--z-chega`; as cartas da mão
  pousam escalonadas (receita Pousar da MJ, `--escalona-3`); varredura na faixa de vez; `--mola-suave` · `--dur-5`;
  reduzido: a mesa aparece montada. Depende do degrau 1 da escada MJ (identidade por `oid`) para a carta-chave atravessar
  as telas; até lá, só recuo e chegada.
- **Desfecho → Início:** o placar do desfecho recua e vira o cartão "Continuar/Última partida" do Início; `--ease-out` ·
  `--dur-4`; reduzido: esmaecer.
- **Aceite:** começar uma partida leva o hero da lista para dentro da mesa e a mão pousa carta a carta.

### FA-1 · FA-M · medir no aparelho e auditar o movimento
- **FA-1:** medir no Galaxy S (360 × 780) e nas quatro medidas, dois temas, CPU 4×: nenhuma tela abaixo de 55 fps na
  rolagem; nenhum par de texto abaixo de AA (inclusive sobre véu); desfoque da barra (se < 55 fps, a reserva opaca vira o
  padrão daquele aparelho); peso do `index.html` (estimativa da proposta: +18 KB brutos, ≈ +4 KB comprimido; molas ≈ 1 KB;
  receitas ≈ +9 KB). Corrigir o que o portão e o celular mostrarem.
- **FA-M · `auditaMovimento` no portão:** conta animações e transições ativas por quadro na entrada de cada tela (≤ 1 herói +
  micro); confere a calma (nenhum herói a menos de 300 ms de outro); mede quadros nas receitas de cena (Avançar, Ladrilho →
  hero, Reorganizar com 40 itens, Jogar → mesa) com CPU 4× (≥ 55 fps, nenhuma tarefa longa > 50 ms); confere as três
  variantes e que em reduzido nada se desloca; confere que nada roda com o OCR ocupado; laços (fio, moldura) param depois
  de 8 s e viram estado "demorando".
- **Guarda-corpos de balcão (Vitrine):** `auditaTela` conta por tela primários em latão (máx. 1), ações visíveis fora da
  barra (máx. 4) e chips na primeira dobra (máx. 4); token referenciado existe; toda arte com texto tem `--scrim-art`;
  nenhum literal de sombra, raio, duração ou alfa em componente.
- **Pendência herdada da MV-4:** espera longa (> 4 s ou quantidade conhecida) = anel de latão que fecha com
  `--mola-suave` a cada passo + odômetro + frase ("Baixando os dados das cartas · 128 de 340"), varredura no "pronto",
  reduzido: número só; imagem de carta = moldura em traço com varredura diagonal (laço de 1,6 s) e a arte entrando por
  esmaecer `--dur-2`, reduzido: moldura parada; `ArteDeEspera` vira mini-vitrine (lâmpada acende sobre a prateleira em
  traço e uma silhueta pousa; 3 nós). Entra na leva que tocar essas esperas, no máximo aqui.

### FA-2 · aposentar os apelidos e fechar contra as telas-modelo
- Aposentar `--bg-elev-*`, `--shadow-1..3`, `--ease-spring`, `--ease-mola` (e o que restar do veio do fundo), trocando cada
  uso pelo token novo.
- Fechar o épico pelo modelo aprovado, não pelo roadmap técnico: tabela tela-modelo × app com veredito "igual" nas doze
  telas-modelo (Início cheio e vazio, Listas cheia e vazia, Lista, Coleção cheia e vazia, Scanner, Perfil, Notícias e
  Notícias sem internet, mais a barra) e as receitas do `/ds` uma a uma.
- Depois da FA-2, o dono decide a MV-10 e o nome "The Shelf".
