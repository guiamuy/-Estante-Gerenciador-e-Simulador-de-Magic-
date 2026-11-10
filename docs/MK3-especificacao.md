# MK3 · Mesa Vitrine — especificação por fatia

Pedido do dono (09/11/2026, 21h13): levar a mesa ao patamar de sofisticação do DS-K3, "nas mesmas diretrizes": simetria,
tridimensionalidade, sombra, estilização e animação de alto padrão em todos os elementos da mesa, com a partida mais fluida
e "real", em sinergia com o resto do app. Roadmap e execução contínua por rotina agendada. Modo agilidade: cada fatia vai à
prévia e à produção sem esperar OK; as decisões abaixo foram tomadas pela opção recomendada e o dono pode mudar o rumo.

- Revisão das 22h15 (dono): benchmarks, mão e gesto, zonas, combate sem setas, estojo das fases, organizar o campo.
- Proposta visual (artefato com antes/depois, benchmarks e demos): ver `claude/DESIGN-proposta-MK3-mesa-2026-11-09.md` no Projeto.
- Estado de cada fatia e ordem: `ROADMAP.md`, seção "### MK3 · Mesa Vitrine". Este arquivo diz **o quê** e **com que
  valores**; a história de cada leva (Valor, Aceite, Testes, Fora) é escrita no ROADMAP ao fechar a fatia.
- Dona: `mtg-table-experience-architect` (trilha `jogabilidade`, prefixo J). Tokens K3: `docs/DS-K3-especificacao.md`,
  seção "Base já no app". A mesa **não** cria um segundo sistema: só tokens de cena (`--mesa-*`, `--carta-*`).

## Diagnóstico (medido em 09/11/2026, `main c3abbd2`, 360 × 780, Elfos × Shark, campo cheio)

1. **Assimetria.** O lado do oponente tem faixa de identidade (nome, contadores) em cima e cartas soltas no meio; o seu
   lado não tem nome e tem os contadores à direita; alturas desiguais e o seu campo cortado pela bandeja.
2. **Um plano só.** Carta e playmat separados por borda de 1 px e sombra de 1–4 px; o playmat é um retângulo chapado com
   a borda de prateleira (3 px) do DS-K, não uma superfície com luz.
3. **Sem fonte de luz.** O app fora da mesa já tem luz de cima (K3-1); a mesa ainda tem o veio uniforme.
4. **Movimento em `--ease-out`.** As receitas da mesa (G5, MJ) usam curvas e durações do DS-K; as molas `linear()` e os
   três níveis de Movimento do K3 não chegam à mesa (só o reduzido global).
5. **Zonas como chips.** Grimório, cemitério e exílio são números em pílulas; não são objetos sobre o tampo.
6. **Pouca interação física** (dono, 22h15): a carta da mão não se arrasta para o campo; expandir só segurando; abrir uma
   zona não tem movimento; as cartas do campo não se reorganizam.
7. **Combate por setas que cruzam a mesa inteira** (dono: "rústico"); o trilho de fases sob "Seu turno" cruza a linha
   do topo e parece objeto sobreposto.

## Benchmarks (consultados em 09/11/2026; revisão pedida pelo dono às 22h15)

| Referência | O que faz bem | O que a Estante adota |
|---|---|---|
| Marvel Snap (Second Dinner; Apple Design Award 2023) | jogar é arrastar a carta da mão até o lugar; cartas com efeito 3D que usa o acelerômetro do celular | arrastar para jogar (MK3-5); carta grande que inclina (MK3-6, P7) |
| Hearthstone (Blizzard) | quem joga escolhe onde a criatura fica ao invocar; o ataque é arrastar da criatura ao alvo, e ela avança, bate e volta, com o dano mostrado no alvo | posição escolhida e organizar o campo (MK3-7); combate por investida e impacto, sem seta parada (MK3-13) |
| MTG Arena (Wizards) | atacantes avançam para a frente, bloqueadoras se alinham diante deles; agrupar cópias; críticas públicas a seta escondida por texto e a pareamento pouco claro | pareamento por alinhamento: a bloqueadora encaixa na frente do atacante (MK3-13); nada de texto sobre o combate |
| Legends of Runeterra (Riot) | combate em faixa própria: arrastar a unidade do banco para a linha de batalha; ritmo de animação ajustado por pedido da comunidade | linha de combate no eixo da mesa (MK3-13); orçamento de duração e o toque que conclui (R4) |
| Balatro (LocalThunk; Apple Design Award 2025) | cartas nunca paradas: levantam, inclinam com o ponteiro, têm paralaxe; feedback em camadas (carta, número que rola, tremor proporcional ao valor) | carta que segue o dedo e inclina pela velocidade (MK3-4); número que rola; tremor só no completo e proporcional ao dano (MK3-14); "60 % do que parece suficiente" contra excesso |
| Pokémon TCG Pocket | apresentação da carta e das zonas com animação de virar em cascata | abrir as zonas em leque a partir do ícone (MK3-9) |

Princípio comum: **a carta é o objeto que se move**. Em nenhum dos cinco o combate é representado por uma seta parada atravessando a mesa: a criatura avança, a bloqueadora se põe na frente, o impacto acontece no alvo. A seta só existe **durante o gesto** de mirar.

## Gramática de gestos da mesa (decisão D6)

| Gesto | Na mão | No campo | Nas zonas |
|---|---|---|---|
| Tocar | escolhe a carta (como hoje) | escolhe ou usa (como hoje) | abre a zona |
| Toque duplo (≤ 300 ms, mesmo alvo) | expande a carta (o segundo toque desfaz a escolha do primeiro, que é reversível) | expande a carta | — |
| Segurar (≥ 350 ms, sem mover) | expande a carta (como o espiar de hoje) | expande a carta | — |
| Pegar e arrastar | a carta sai do leque e segue o dedo; soltar no seu campo joga (se for legal); soltar fora volta com mola | — | — |
| Segurar e arrastar de lado | — | **organiza**: a carta levanta e troca de lugar na mesma fileira | — |
| Arrastar sem segurar | rola o leque | para o lado: rola a fileira; na direção do oponente, com habilidade de alvo: mira (MJ6) | — |

Toda a gramática passa por limiar de distância (8 px) e tempo; arrastar nunca vira toque (armadilha 4 da skill); o próximo toque conclui o efeito em curso (R4).

## Decisões (opção recomendada, adotada pelo modo agilidade)

- **D1 · Câmera:** A — **de frente em repouso, profundidade por luz e sombra, Z só no movimento** (legível em 360 px, 60
  quadros, testes de caixa estáveis). Alternativa B (inclinação permanente de 6–8°) fica registrada, fora.
- **D2 · Simetria:** A — **espelho pelo eixo horizontal**: os dois lados com a mesma faixa de identidade (nome, vida,
  zonas) na mesma posição relativa; o eixo central (pilha, aviso) entre eles.
- **D3 · Luz:** uma fonte, a da sala (cima-esquerda), **igual para os dois lados** (não gira com o jogador).
- **D4 · Tampo:** o playmat é um **poço** no tampo (sombra interna de cima, laca, aresta); feltro, oceano e vinho seguem
  como o tecido dentro do poço.
- **D5 · Ordem:** fundação → playmats da casa → mão e gesto → criação de playmat → zonas → eventos → cenas → medição.
- **D6 · Gestos:** a gramática acima (toque duplo e segurar expandem; segurar e arrastar organiza; pegar e arrastar joga).
- **D7 · Combate sem setas paradas:** atacantes avançam para a linha de combate no eixo; a bloqueadora encaixa na frente
  do atacante (o par se lê pela posição, com um elo curto de latão entre as duas cartas); o dano é impacto no alvo e
  número que sai dele. A seta só aparece durante o gesto de mirar e some ao soltar.
- **D9 · Criação de playmat:** função `api/playmat` na Vercel com o Workers AI da Cloudflare (FLUX), prompt base no
  servidor; MCP só do nosso lado (gerar e validar). **D10 · Cota:** 2 criações por dia e 8 guardados por conta, dentro do
  pote gratuito diário; sem conta, só os da casa.
- **D8 · Organizar o campo:** a ordem dentro da fileira é escolha do jogador e fica guardada na partida (é apresentação:
  não muda estado de regra, não vira nem desvira, não muda controlador); terrenos sempre na fileira de trás, permanentes
  não terreno na da frente; carta nova entra na ponta direita da sua fileira (ou onde for solta, na MK3-5).

## Contrato (vale em toda fatia)

- **Tokens:** material e movimento só por token K3 (`--elev-*`, `--edge*`, `--lacquer`, `--shadow-contact|key|float`,
  `--grain`, `--dur-0..5`, `--escalona-*`, `--mola-*`, `--sai`, `--desloc-*`, `--z-recuo|chega`, `--calma`) ou de cena
  (`--carta-espessura` 2 px, `--carta-lado`, `--carta-laca`, `--mesa-poco`; novos entram nos três blocos e no `/ds`).
- **Gramática R1–R5 e critério de rejeição** do DS-K3: cada receita declara plano · luz · curva · etapas · reduzido e o que
  a separa de uma transição linear 2D.
- **Três níveis de Movimento:** completo (mola, Z, escalonamento), moderado (sem Z, sem repique, viagens curtas),
  reduzido (estado final num quadro). Teste nos três.
- **Simetria S1–S4:** S1 espelho de material, largura, raio, luz e escala de carta; S2 mesmo tipo de informação na mesma
  posição relativa; S3 o que é de um lado só (mão, bandeja) não desloca o eixo; S4 assimetria só com `data-assimetria`.
  Medida por `auditaSimetria` (a partir da MK3-1) nas quatro medidas e nos dois temas.
- **Luz L1–L3:** L1 uma fonte; L2 a altura se lê pela sombra — no tampo: espessura + contato + chave
  (`--sombra-carta`); levantada, na mão, no ar: espessura + flutuante (`--sombra-carta-alta`); L3 Z só em movimento.
- **Orçamento:** só `transform`, `opacity`, `filter` pequeno, `clip-path`, `stroke-dashoffset`; pintura de estado novo com
  campo cheio ≤ 45 ms (CPU 1×, teste MJ11b); jogada pesada sem tarefa longa > 50 ms; nenhum efeito bloqueia o toque (R4).
- **Fora sempre:** regra e decisão do Shark, WebGL/canvas 3D, som novo (salvo fatia que diga), telas fora da mesa, nome
  "The Shelf".

## Fatias

| Fatia | O que entrega | Valores e roteiro |
|---|---|---|
| **MK3-0** · material | carta como objeto e playmat em poço; levantar com mola | `--sombra-carta` = espessura 2 px + contato + chave; alta = espessura + flutuante; face `::after` com `--carta-laca` + aresta `--edge-strong`; `.tb-side` = `--lacquer` sobre `--playmat`, `--mesa-poco` + contato, borda 1 px `--edge` (sai a prateleira de 3 px); levantar `--dur-3` `--mola-firme` |
| MK3-1 · estojo das fases | o trilho de pontos e traço sob a pílula "Seu turno" deixa de cruzar a linha do topo | o trilho vira um estojo rebaixado (pílula `--elev-1` com `--mesa-poco` pequeno e aresta), centrado no eixo da pílula, com folga simétrica acima e abaixo; a linha do topo para antes do estojo (nada passa por baixo dele); ponto atual em latão com fio de luz, passados em `--fg-subtle`, futuros vazados; troca de fase desliza o traço com `--mola-firme`; `auditaTela` sem sobreposição no topo nas quatro medidas |
| MK3-2 · simetria | os dois lados espelhados | faixa de identidade igual nos dois lados (nome · vida pequena · grimório · cemitério · exílio), a sua embaixo do seu campo, a do oponente em cima do dele; mesma altura mínima de campo; eixo central com a pilha; `auditaSimetria` (largura, esquerda, raio, material, escala de carta, posição relativa da faixa) |
| MK3-3 · carta-objeto | virar (tap) e desvirar com massa | girar 90° com `--mola-macia` `--dur-4`; a sombra gira junto e encurta; selos e P/T em laca; enjoo sem laço (P/T apagado); reduzido: estado final |
| MK3-4 · mão viva | pegar a carta | ao tocar e mover, a carta sai do leque (Z +40, `--sombra-carta-alta`), segue o dedo 1:1 e inclina até ±8° pela velocidade horizontal (Balatro); as vizinhas fecham o vão com `--mola-firme`; soltar fora de alvo volta ao lugar com `--mola-macia`; leque com profundidade (pontas recuam `--z-recuo`); comprar: a carta sai do grimório (R1) e pousa no leque escalonada `--escalona-2` |
| MK3-5 · arrastar para jogar | soltar no campo joga | ao arrastar uma carta jogável, o seu poço acende (fio de latão) e mostra o lugar onde ela vai pousar (vão que se abre na fileira certa: terreno atrás, permanente na frente); soltar acima do limiar joga pela mesma ação legal do toque (`legalActions`), com pagamento como hoje; carta que não pode ser jogada agora resiste (segue o dedo a 30 %) e volta; mágica sem permanente solta no eixo vai para a pilha; tocar continua valendo |
| MK3-6 · expandir | toque duplo e segurar | a carta voa do lugar onde está (R1) até o centro, em tamanho de leitura (largura de 78 % da tela), com véu E0 a .7 atrás; responde ao aparelho até `--tilt-max` (P7, desligável em Aparência) com brilho que segue a luz; foil com faixa de luz; toque fora ou arrastar para baixo devolve ao lugar com `--mola-macia`; texto oficial e "Pode agora:" como no espiar de hoje |
| MK3-7 · organizar o campo | trocar a ordem das cartas | segurar 350 ms + arrastar de lado levanta a carta (Z +24, sombra chave → flutuante) e as vizinhas abrem o vão com `--mola-firme`; soltar pousa com `--mola-macia`; só dentro da mesma fileira (terrenos ↔ terrenos; permanentes ↔ permanentes); ordem guardada na partida por `oid` (apresentação, fora do motor; goldens intactos); a ordem do oponente é dele; leque ×N move junto; reduzido: troca de lugar sem viagem |
| MK3-8 · zonas-objeto | grimório, cemitério e exílio sobre o tampo | grimório = maço com espessura proporcional (1 px a cada 8 cartas, teto 6 px) e verso; cemitério = carta do topo visível; exílio = carta do topo com véu; toque abre a lista como hoje (44 px) |
| MK3-9 · abrir as zonas | a zona se abre a partir de onde está | tocar no cemitério, no exílio ou no grimório (quando pode olhar): as cartas saem do ícone em leque e se assentam na folha escalonadas (`--escalona-1`), a folha cresce do ícone (R1); fechar devolve as cartas ao ícone com `--sai`; carta que vai para o cemitério cai no topo do maço com `--mola-macia` |
| MK3-10 · barra em latão | vida · vez · vida como peça de metal | vida com odômetro (`--mola-suave`, número rola, não troca); troca de vez: varredura de luz no latão (`--dur-4`) e o lado ativo acende pelo poço (fio de latão, sem halo largo) |
| MK3-11 · pousar | terreno, conjurar, entrar | toda entrada no campo com R1 (vem de onde estava: mão, pilha, grimório) e pouso `--mola-macia` em Z (`--z-chega` → 0) com sombra que encolhe de flutuante a chave; substitui `--ease-out` das receitas G5/MJ na mesa |
| MK3-12 · pilha em volume | magia e habilidade na pilha | cartões E4 com espessura empilhados em Z (−8 px por nível), topo levantado com flutuante; resolver: o topo desce para o destino (R1) com `--mola-macia`; anular: `--sai` para o cemitério |
| MK3-13 · combate sem setas | atacar e bloquear | declarar ataque: a criatura avança da fileira para a linha de combate no eixo (antecipação: recua 4 px `--dur-1`; avanço `--mola-firme`) e fica ali, inclinada 4° para o oponente; bloquear: a bloqueadora desliza e encaixa na frente do atacante, as duas ligadas por um elo curto de latão (8 px, aresta e contato); várias bloqueadoras: em leque atrás da primeira; ataque sem bloqueio aponta para a barra de vida do oponente; as setas MJ4 e MJ26 saem do combate (cores mantidas no elo: vermelho ataca, dourado bloqueia) |
| MK3-14 · dano e mira | impacto, vida e alvo | dano em criatura: investida curta até o alvo, impacto (achatamento 3 % + tremor de 2 quadros só no completo, proporcional ao dano até 3 px) e o número sai do alvo e sobe; dano no jogador: a vida rola no odômetro e a barra estremece; cura: luz que sobe; mira: linha curta de latão só durante o arrasto (`stroke-dashoffset`), anel do alvo que se fecha, e ao soltar a linha recolhe para a origem |
| MK3-15 · saídas | morrer, destruir, exilar, devolver, descartar | cada saída vai para o destino (R1) com `--sai` ≤ `--dur-2`; destruir: a carta perde a laca (escurece) antes de ir; exilar: some por véu claro; devolver: volta à mão do dono |
| MK3-16 · ritmo com luz | fases e turno | estojo das fases com fio de luz que percorre; luz da cor da mana (MJ12) como varredura única no poço do jogador ao gerar mana; `--calma` entre heróis |
| MK3-17 · ponte (MV-9) | entrar e sair da partida | Jogar → mesa: o hero da lista recua e a mesa chega de `--z-chega`, a mão pousa escalonada (`--escalona-3`), varredura na faixa de vez, `--mola-suave` `--dur-5`; desfecho → Início: o placar recua e vira o cartão "Continuar"; reduzido: montada |
| MK3-18 · mulligan e embaralhar | cena de abertura da partida | embaralhar: o maço se divide e junta (rotação ±4°, 2 ciclos, `--dur-4`); mão inicial abre em leque com escalonamento; mulligan: a mão volta ao maço por R1 |
| MK3-19 · fim em cena | vitória e derrota | luz do vencedor varre a mesa, as cartas do perdedor perdem a laca, placar pousa com `--mola-suave`; reduzido: placar parado |
| MK3-20 · orçamento | medição da mesa inteira | jogada pesada (combate com 6 atacantes, remoção global) e arrastar com o campo cheio no completo com CPU 4×: sem tarefa longa > 50 ms; `auditaMovimento` da mesa (nenhuma duração, curva ou sombra literal nas regras `.tb-*`) |
| MK3-21 · FA no aparelho | medir no Galaxy S do dono e fechar | página de medição na mesa; espera o dono; fechamento contra esta especificação |

## Playmats: da casa e criados pelo jogador (pedido do dono, 09/11/2026, 23h36)

**Pedido.** Escolher o playmat entre modelos da Estante, construídos com a paleta e o design system, e criar o próprio
playmat escrevendo o que quer; a resolução, o tamanho, a qualidade, a sofisticação e a profundidade vêm de um **prompt
base** que a Estante junta ao pedido; criar e guardar dentro do limite gratuito do serviço; a escolha (da casa ou criado)
vale na mesa na hora. A jornada fica fora da mesa (Perfil › Playmats) e se reflete nela.

**MCP: onde entra e onde não entra.** Um MCP roda nas sessões do Claude (do lado de quem constrói), não no aparelho de
quem joga. O app do usuário chama uma função nossa na Vercel (`api/playmat`), que guarda a chave e o prompt base no
servidor e chama o modelo de imagem pela API do provedor. Os MCPs entram do nosso lado: gerar e comparar candidatos dos
playmats da casa e validar o prompt base antes de liberar a criação (Hugging Face Spaces e Cloudflare, conectados à conta
do dono).

**Benchmark de provedores (consultado em 09/11/2026):**

| Provedor | Plano gratuito | Situação |
|---|---|---|
| Cloudflare Workers AI (FLUX.1 schnell; FLUX.2 klein) | 10.000 neurônios por dia, renovados 00h UTC; uma imagem 1024 × 1024 em 4 passos ≈ 58 neurônios (≈ 170 por dia); no plano gratuito o excedente falha em vez de cobrar | **recomendado** (D9): cota diária previsível, sem cartão, sem marca d'água, chave só no servidor |
| Hugging Face Inference Providers | sem crédito mensal para contas gratuitas desde 15/10/2026 (só PRO e organizações) | fora no app; os Spaces seguem úteis do nosso lado, pelo MCP |
| Pollinations | anônimo limitado a cerca de 1 pedido a cada 15 s, com marca d'água; conta gratuita remove | reserva sem garantia de serviço; não usar como principal |
| Adobe Firefly, Canva | créditos mensais por conta da pessoa (Firefly gratuito ≈ 25 por mês) | não serve a muitos usuários com uma chave só |

**Arquitetura (D9).** `api/playmat` (Vercel): recebe o texto do jogador e o token da conta; confere a conta (Firebase, como
os relatos); confere a cota; traduz o pedido para o inglês e filtra o que não pode (modelo de texto do próprio Workers AI;
pedido com personagem protegido, marca, pessoa real, nudez ou violência volta com o motivo, sem gerar); monta o prompt
final = prompt base + pedido; chama o FLUX; devolve WebP. A chave fica nas variáveis de ambiente da Vercel. Nada do
pedido é guardado no servidor.

**Prompt base (versão 1, a validar pelo MCP antes da MK3-P4):** vista de cima, ortográfica, sem perspectiva; superfície de
playmat premium (couro, feltro, madeira laqueada, latão gravado ou o material pedido); uma luz suave de cima à esquerda,
vinheta escura nas bordas; **centro calmo, de baixo contraste**, para as cartas lerem por cima; paleta que conversa com o
ébano e o latão da Estante, salvo pedido de outra cor; detalhe fino e nítido; sem texto, letras, logotipos, molduras de
interface, rostos de personagens existentes ou marcas; proporção do lado da mesa (a função gera 1024 × 1024 e o app
recorta ao centro).

**Cota (D10).** O plano gratuito é um pote só para todo mundo (≈ 170 imagens por dia). Por conta: 2 criações por dia e até
8 playmats guardados; acima do pote do dia, "Volte amanhã" com a hora de renovação. Os números ficam num lugar só da
função, para subir sem mudar o app. Sem conta: só os playmats da casa.

**Guardar.** No aparelho (IndexedDB, WebP de até 200 KB), no backup do app e, com conta, na sincronização que já existe;
apagar tem desfazer. O oponente vê o playmat dele (online) ou o da casa padrão.

**Legibilidade na mesa.** O app mede a luminosidade e o contraste do playmat criado e aplica o véu (`--scrim`) até as
cartas, os números e o anel de estado passarem o contraste do contrato visual; o centro fica sempre mais calmo que as bordas.

| Fatia | O que entrega | Valores e roteiro |
|---|---|---|
| MK3-P1 · playmats da casa | seis modelos no design system | Ébano (laca e grão), Feltro verde, Oceano, Vinho, Pergaminho e Latão gravado; procedurais (gradientes + `--grain` + padrão SVG inline, sem imagem), nos dois temas, cada um um conjunto de tokens sob `[data-playmat]` (o J-43 já marca o lado); poço do MK3-0 por cima; contraste das cartas medido sobre cada um |
| MK3-P2 · galeria e escolha | Perfil › Playmats | vitrine em ladrilhos (K3-5) com prévia ao vivo numa mini-mesa (dois lados, três cartas); tocar aplica com a receita "pousar" e vale na próxima partida e na partida em curso; estados vazio, carregando, erro e volta; atalho na mesa (menu de três pontos › Playmat) |
| MK3-P3 · serviço de criação | `api/playmat` | Workers AI FLUX.1 schnell, 1024 × 1024, 4 passos; prompt base v1; tradução e filtro; cota por conta e global; conta conferida; chave no ambiente da Vercel; testes com o provedor simulado; em produção, sem a chave, responde "Criação ainda não liberada" e o app mostra isso; revisão da `mtg-security-architect` (o que sai do aparelho, abuso) e da `mtg-scale-architect` (custo) |
| MK3-P4 · ateliê | criar, guardar e escolher | "Descreva o seu playmat" (campo grande, 200 caracteres, exemplos em chips: "couro verde com fio de latão", "mapa antigo em sépia", "mármore negro"); gerar com a espera longa da MV-4 (anel, frase, até 20 s), resultado numa mini-mesa, "Guardar" e "Criar outra"; cota visível ("1 de 2 hoje"); renomear e apagar com desfazer; sem internet: criação desligada com o motivo, os guardados seguem valendo |
| MK3-P5 · o playmat criado na mesa | legível e sem internet | véu medido até o contraste passar; recorte ao centro por lado; guardado no aparelho e no backup; o online mostra o playmat de cada jogador no lado dele |

## Testes por fatia

Contrato visual "MK3-<n>" (tokens e regras) + e2e "J-<leva>" em 360 × 780 nos dois temas com `auditaTela`; a partir da
MK3-1, `auditaSimetria`; toda receita com as três variantes de Movimento e e2e que mede o fim da animação (`finished`),
nunca tempo fixo; MJ11b (pintura com campo cheio) verde em toda leva; capturas antes e depois descritas no PR.
