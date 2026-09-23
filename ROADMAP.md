# Estante — Roadmap de épicos e histórias

Documento vivo. Fica na raiz do repositório para que qualquer conversa nova, humana ou com IA, retome do ponto exato. Atualize o status das histórias no mesmo commit que as entrega.

**Legenda:** ✅ entregue e publicado · 🟡 entregue, aguardando deploy · ▶ próxima · ○ planejada · ⛔ fora de escopo

---

## 1. Objetivo e escopo

**Objetivo.** Uma plataforma de Magic: The Gathering com qualidade profissional:
- jogabilidade completa de Commander e Pauper;
- gestão de coleção, listas e decks;
- scanner de cartas e visualização.

Tudo com testes que tornam a verificação manual quase desnecessária.

**Fora de escopo (decisão de produto, não reabrir sob outro nome):**
- gerador automático de decks;
- sugestão de cartas;
- ranking de metagame;
- multiplayer online;
- marketplace.

Motivo do corte do gerador: não existe fonte pública de decklists acessível pelo navegador, e gerar por consulta produz deck incoerente.

---

## 2. Estado atual

| Épico | Histórias | Status |
|---|---|---|
| F · Fundação | F2 camada de plataforma · F4 tokens e tema · F5 componentes e catálogo `/ds` | ✅ |
| D · Dados de carta | D1 cliente Scryfall · D2 repositório com cache · D3 cache de imagens · D4 busca · D5 visualizador | ✅ |
| W · PWA | W1 instalação, service worker e estratégia de cache | ✅ |
| L · Listas e coleção | L1 persistência e backup · L2 leitura de texto · L3 galeria · L4 coleção por nome · L5 validação de formato · L6 exportação | ✅ |
| Q · Qualidade | Q1 harness · Q2 fuzz · Q3 golden · Q4 integração headless · Q5 contrato visual · Q6 portão e CI | ✅ |
| Q · Qualidade | Q7 dívida de testes de F2, D1, D2 e W1 | ✅ |
| M · Motor núcleo | M1 estado e semente · M2 formato e mulligan · M3 turno · M4 prioridade e pilha · M5 ações baseadas em estado · M8 replay e desfazer | ✅ |
| A · Mesa assistida | A0 componentes · A1 layout · A2 preparar partida · A3 mão e ações legais · A4 prioridade e pilha · A5 adjudicação · A7 registro e desfazer · A8 continuar partida · A9 goldfish e hot-seat | ✅ |
| B · Bot | B1 política aleatória legal (base do fuzz) | ✅ |
| C · Coleção | C2 tela Coleção · C7 marcar com toque duplo · C8 lista nova já possuída · C9 editar quantidade e remover | ✅ |
| C · Coleção | C1 coleção por impressão · C3 importar e exportar CSV · C5 persistência garantida | ✅ |
| X · Scanner | X1 câmera com moldura · X2 reconhecimento pelo nome · X4 lote com uma mão · C6 base offline de nomes | ✅ |
| X · Scanner | X3 edição pela linha de coleção · X5 destino do lote · X6 scanner offline | ✅ |
| L · Listas | L11 companheiro | ✅ |
| M · Motor | M6 combate · M7 mana · M14 companheiro na partida | ✅ |
| A · Mesa | A6 combate na mesa | ✅ |
| S · Scripts | S1 formato e validador · S2 cobertura · S3 palavras-chave · S4 efeitos · S5 alvos · A10 cobertura visível | 🟡 |

**Dívida registrada.** Os IDs F1 e F3 não aparecem no código e não são rastreáveis. Os testes originais de F, D e W não estavam no repositório. A história **Q7** pagou essa dívida.

---

## 3. Decisões de arquitetura

### ADR-01 · PWA agora, pronto para Capacitor, com migração por gatilho

O que a lista de funcionalidades exige hoje cabe no navegador:
- câmera via `getUserMedia`;
- banco local via IndexedDB;
- imagens em Cache Storage;
- distribuição sem revisão de loja.

Toda capacidade de dispositivo já passa pela camada F2 (`store`, `camera`, `files`, `share`). O Capacitor entra trocando apenas o adaptador.

**Gatilhos de migração.** Basta um ser verdadeiro. São condições verificáveis, não datas.

| ID | Condição | Como verificar |
|---|---|---|
| G1 | A base offline necessária excede a cota prática | `navigator.storage.estimate().quota` no aparelho-alvo < 1,5 × tamanho medido da base leve (C6) |
| G2 | Dados apagados pelo navegador | `navigator.storage.persist()` negado **e** perda observada em aparelho-alvo (típico do Safari no iOS) |
| G3 | Scanner em lote precisa continuar com o app em segundo plano | Requisito aceito em X4 |
| G4 | Publicação em loja vira requisito de negócio | Decisão registrada |
| G5 | Câmera web não atinge a qualidade mínima de OCR | Taxa de acerto de nome < 90% no conjunto de fotos de teste, com o nativo acima disso |

A história P1 exibe G1, G2 e G5 medidos no próprio aparelho.

### ADR-02 · `index.html` é a fonte da verdade, sem etapa de build

O código original era organizado em `src/…` com um empacotador, e essa árvore se perdeu. Decisão: o `index.html` publicado é a fonte, e os testes carregam exatamente esse arquivo (`_load.mjs`).

- **Ganho:** o que é testado é o que vai ao ar.
- **Custo:** um arquivo grande.

Os módulos continuam isolados por IIFE (`__mN`), cada um com cabeçalho de história. Revisitar só se o arquivo passar de 400 KB.

### ADR-03 · Dois modos de partida, escolhidos pelo usuário por partida

"Todo deck é executável" e "qualquer partida de Magic" são objetivos contraditórios. A solução são dois modos:

- **Motor completo:** só entram cartas com script validado (S2 = completo). O motor resolve tudo, sem pausa.
- **Mesa assistida:** qualquer lista entra. O motor rastreia zonas, vida, pilha, turno e prioridade, resolve o que sabe e pede adjudicação do resto, com o texto oracle à vista e controles diretos de estado.

A mesa assistida é recurso de primeira classe, com desenho próprio, e não tela de erro. O motor já implementa os controles diretos, e o modo completo os recusa por regra.

### ADR-04 · Motor puro e determinístico

- O estado é JSON puro.
- Todo acaso sai da semente guardada no estado.
- `apply(estado, ação)` nunca muta o estado recebido e lança `RuleError` para ação ilegal.
- `legalActions` alimenta o bot, o fuzz e os botões da mesa.

Consequências: replay, desfazer e golden saem de graça, e a interface não decide regra.

### ADR-05 · Bot só joga no motor completo

Um bot não consegue adjudicar texto que o motor não entende. Na mesa assistida, o oponente é goldfish (sem oponente) ou hot-seat (duas pessoas no mesmo aparelho).

### ADR-06 · Coleção por nome agora, por impressão depois

A coleção por nome (L4) responde "tenho esta carta?". A coleção por impressão (C1) adiciona edição, número, foil e idioma, com migração automática.

### ADR-07 · Layout plano no repositório

A publicação é feita pelo GitHub web, muitas vezes pelo celular, onde não dá para enviar pastas. Por isso os testes, as fixtures e os golden ficam na raiz, ao lado do `index.html`. `_load.mjs` também aceita `tests/`, caso a estrutura mude.

A única pasta obrigatória é `.github/workflows/`, criada uma vez por **Add file → Create new file**.

---

## 4. Definition of Ready e Definition of Done

Valem para todas as histórias.

**Ready.** Uma história só entra em desenvolvimento quando:
- tem ID, valor em uma frase e critérios de aceite observáveis;
- tem os testes obrigatórios definidos por camada;
- tem todas as dependências entregues;
- não tem pergunta de produto em aberto;
- tem fixtures definidas (cartas, listas, fotos) quando precisa de dados.

**Done.** Uma história só está pronta quando:
- todos os critérios de aceite foram demonstrados;
- os testes das camadas aplicáveis estão escritos e passando;
- `npm test` está verde localmente e no CI;
- não há erro de console nos fluxos e2e tocados;
- o contrato visual está verde nos dois temas, com alvo de toque ≥ 44 px;
- o texto de interface está em pt-BR, voz ativa, sem jargão de sistema;
- o fluxo funciona offline para dado já visitado, quando a história toca dado;
- o golden foi regravado apenas com justificativa no commit;
- o status no ROADMAP foi atualizado no mesmo commit.

---

## 5. Pirâmide de testes e portão de release

| Camada | Arquivo | O que garante |
|---|---|---|
| 1 · Unidade | `engine.unit.test.mjs`, `decks.unit.test.mjs`, `table.unit.test.mjs`, `legacy.unit.test.mjs` | Regras puras, sem DOM |
| 2 · Propriedade e fuzz | `engine.fuzz.test.mjs`, fuzz da mesa em `table.unit.test.mjs` | Partidas aleatórias: sem exceção fora de `RuleError`, sem travar, invariantes válidas a cada ação |
| 3 · Golden replay | `engine.golden.test.mjs` + `*-NN.json` | Mesma semente e mesmas ações produzem o mesmo estado, ponto a ponto |
| 4 · Integração headless | `e2e.test.mjs` | Fluxo do usuário no Chromium, com a Scryfall simulada, sem rolagem lateral e com alvos de 44 px |
| 5 · Contrato visual | `contract.visual.test.mjs` | Contraste AA nos dois temas, zero cor fora de token, alvo de 44 px, tema claro sem divergência |

**Versão do motor.** A E8 levou o motor à versão 3 (alvos e efeitos de script entram no estado) e a E7 tinha levado à versão 2 (combate, mana e companheiro mudam o estado). Partidas salvas por uma versão anterior do motor não são retomadas: a mesa avisa e oferece nova partida. O golden foi regravado nessa mudança, com esta justificativa.

**Portão.** `npm test` roda tudo. No GitHub, o workflow **Portão de release** roda:
- 250 partidas de fuzz a cada push;
- 3.000 partidas toda noite.

Se o portão falhar, não há deploy (ver seção 8).

---

## 6. Ordem por dependência técnica

```
Q (portão) ─┬─► M núcleo ─► A mesa assistida ─► M6/M7 ─► S scripts ─► modo completo ─► B bot
            │                    ▲                          │
            │                    └──── A10 cobertura ◄──────┘
            └─► Q7 dívida de testes
L listas ─► C coleção ─► X scanner          (trilha Acervo, independente do motor)
D dados  ─► V visualização                  (trilha Acervo)
F2 plataforma ─► P1 monitor de gatilhos ─► P2 Capacitor (só com gatilho)
```

**Prioridade de produto (decidida em 21/09/2026).** Coleção e scanner vêm antes do combate e dos scripts. A trilha Acervo não depende do motor, então a troca de ordem não quebra dependência técnica.

**Próximas entregas:**

| Entrega | Conteúdo | Resultado para o usuário |
|---|---|---|
| E1 ✅ | Q1–Q6, M1–M5, M8, B1 | Portão de qualidade e motor testado |
| E2 ✅ | A0–A5, A7, A8, A9, Q7 | Primeira partida jogável: mesa assistida, goldfish e hot-seat |
| E3 ✅ | C2, C7, C8, C9 | Coleção gerenciável: tela própria, dois toques marcam, lista nova já possuída, editar e remover |
| E4 ✅ | C1, C3, C5 | Coleção por impressão, importação do ManaBox e outros, persistência garantida |
| E5 ✅ | X1, X2, X4, C6 | Scanner: câmera, reconhecimento pelo nome e lote com uma mão |
| E6 ✅ | X3, X5, X6, L11 | Scanner identifica a edição, alimenta coleção ou lista e funciona offline; listas com companheiro |
| E7 ✅ | M6, A6, M7, M14 | Combate e mana resolvidos pelo motor; companheiro jogável na mesa |
| E8 🟡 | S1–S5, A10 | Primeiros scripts de carta, alvos e cobertura visível |
| E9 ▶ | S6, S7, S8, S9 | Suas listas cobertas e o modo sem pausa nenhuma |
| E10 | B2–B4 | Bot heurístico, dificuldade e torneio de aferição |

---

## 7. Épicos e histórias

Camadas de teste: **U** unidade · **P** propriedade/fuzz · **G** golden · **I** integração headless · **V** contrato visual.

### Q · Qualidade

**Q1 · Harness sobre o arquivo publicado** ✅
- **Valor:** o que é testado é exatamente o que vai ao ar.
- **Aceite:** `_load.mjs` extrai o script do `index.html` e expõe os módulos sem DOM e sem rede.
- **Testes:** U — todos os demais arquivos dependem dele.
- **Depende de:** —
- **Fora:** empacotador.

**Q2 · Fuzz e propriedade** ✅
- **Valor:** bugs de regra aparecem antes do usuário.
- **Aceite:**
  - N partidas por formato, com e sem adjudicação;
  - invariantes checadas a cada ação;
  - toda ação de `legalActions` é aceita por `apply`;
  - `FUZZ_GAMES` configurável.
- **Testes:** P.
- **Depende de:** Q1, M1.
- **Fora:** —

**Q3 · Golden replay** ✅
- **Valor:** mudança de regra nunca passa despercebida.
- **Aceite:**
  - 3 partidas gravadas, com hash a cada 25 ações;
  - regravação só por `npm run golden:update`.
- **Testes:** G.
- **Depende de:** M8.
- **Fora:** —

**Q4 · Integração headless** ✅
- **Valor:** o fluxo real do usuário é verificado sem abrir o celular.
- **Aceite:**
  - Playwright com a Scryfall simulada;
  - falha se houver erro de console;
  - pula localmente sem Playwright e falha no CI.
- **Testes:** I.
- **Depende de:** Q1.
- **Fora:** testes contra a Scryfall real.

**Q5 · Contrato visual** ✅
- **Valor:** o design system não se degrada por acréscimo.
- **Aceite:**
  - contraste ≥ 4,5 nos pares texto/fundo usados, nos dois temas;
  - texto sutil ≥ 3:1;
  - nenhuma cor literal fora do bloco de tokens;
  - tema claro automático idêntico ao escolhido;
  - controles com `min-height: var(--tap-min)` e botões visíveis ≥ 44 px no celular.
- **Testes:** V, I.
- **Depende de:** F4, F5.
- **Fora:** regressão por screenshot.

**Q6 · Portão por comando único e CI** ✅
- **Valor:** "está pronto?" vira um ✓ ou ✗ no GitHub.
- **Aceite:**
  - `npm test` roda as 5 camadas;
  - workflow no push, no PR e à noite;
  - status visível no commit.
- **Testes:** o próprio portão.
- **Depende de:** Q1–Q5.
- **Fora:** deploy automático condicionado (ver seção 8).

**Q7 · Dívida de testes das histórias F, D e W** ✅
- **Valor:** o que já funciona continua funcionando.
- **Aceite:**
  - D1: lotes de 75, intervalo mínimo, retentativa em 429 e 5xx, 404 como "não encontrado", erro de origem em `file://`;
  - D2: cache primeiro, TTL de 7 dias, degradação para cache vencido;
  - W1: `pickStrategy` do service worker para cada tipo de URL;
  - F2: contrato de plataforma.
- **Testes:** U, I (busca offline).
- **Depende de:** Q1.
- **Fora:** —

**Q8 · Orçamento de desempenho** ○
- **Valor:** a mesa não engasga no celular.
- **Aceite:**
  - `apply` com p95 < 2 ms em partida Commander no CI;
  - primeira renderização < 2 s com 4G simulado;
  - o teste falha se o orçamento estourar.
- **Testes:** P, I.
- **Depende de:** A1.
- **Fora:** —

### M · Motor de regras

**M1 · Estado, zonas e semente** ✅
- **Valor:** qualquer partida pode ser reproduzida e auditada.
- **Aceite:**
  - estado JSON;
  - seis zonas por jogador, mais a pilha;
  - RNG mulberry32 guardado no estado;
  - reserva fica fora da partida;
  - invariantes: cada objeto em exatamente uma zona e contagem conservada.
- **Testes:** U, P.
- **Depende de:** —
- **Fora:** tokens (M12).

**M2 · Preparação por formato e mulligan** ✅
- **Valor:** a partida começa como na mesa real.
- **Aceite:**
  - Pauper com 20 de vida;
  - Commander com 40 de vida e comandante na zona de comando;
  - quem começa é sorteado pela semente;
  - mulligan London: compra 7 e põe N no fundo.
- **Testes:** U.
- **Depende de:** M1.
- **Fora:** mulligan gratuito do multiplayer.

**M3 · Estrutura de turno** ✅
- **Valor:** o jogo avança sozinho pelos passos certos.
- **Aceite:**
  - 12 passos;
  - desvirar e limpeza sem prioridade;
  - quem começa não compra no primeiro turno em partida a dois (103.8a);
  - sem atacantes, pula bloqueio e dano (508.8);
  - descarte obrigatório até 7.
- **Testes:** U, P.
- **Depende de:** M1.
- **Fora:** passos extras e turnos extras.

**M4 · Prioridade e pilha** ✅
- **Valor:** as respostas acontecem na ordem certa.
- **Aceite:**
  - quem conjura mantém a prioridade (117.3c);
  - a pilha resolve quando todos passam em sequência e resolve o topo (LIFO);
  - feitiço só na principal com pilha vazia; instantânea e lampejo a qualquer momento;
  - um terreno por turno;
  - comandante sai da zona de comando com imposto de +2 por conjuração;
  - na mesa assistida, a resolução emite `adjudicate`.
- **Testes:** U, P, G.
- **Depende de:** M3.
- **Fora:** habilidades ativadas (M9).

**M5 · Ações baseadas em estado, núcleo** ✅
- **Valor:** derrota e morte de criatura acontecem sem ninguém lembrar.
- **Aceite:**
  - vida ≤ 0, compra com grimório vazio e 21 de dano de comandante levam à derrota;
  - dano letal ou resistência ≤ 0 levam a criatura ao cemitério;
  - as checagens repetem até estabilizar;
  - quem sai da partida leva a pilha que possuía.
- **Testes:** U, P.
- **Depende de:** M4.
- **Fora:** regra de lenda e anulação de marcadores (M11).

**M6 · Combate** ✅
- **Valor:** atacar e bloquear sem conta manual.
- **Aceite:**
  - declarar atacantes é decisão pendente do jogador ativo: só criaturas desviradas, sem enjoo (ímpeto libera) e sem defensor; vigilância não vira;
  - sem atacantes, bloqueio e dano são pulados (508.8);
  - declarar bloqueadores é decisão pendente do defensor: voar só é bloqueado por voar ou alcance; ameaça exige dois ou mais bloqueadores;
  - dano em duas passadas quando há iniciativa ou golpe duplo; toque mortífero conta 1 como letal e destrói; atropelar passa o excesso; vínculo com a vida ganha o dano; indestrutível sobrevive;
  - dano de comandante contado automaticamente; o fim do combate limpa tudo.
- **Simplificações registradas:** a ordem de dano entre vários bloqueadores é a ordem da declaração; não há prioridade entre as duas passadas de dano; ataque só a jogadores (planeswalker e batalha depois).
- **Testes:** U por regra e palavra-chave, P (fuzz de combate com e sem mana, propriedade de ações legais), G (partida-referência de combate).
- **Depende de:** M5.
- **Fora:** efeitos de "não pode bloquear" e afins vindos de script (S4).

**M7 · Mana** ✅
- **Valor:** o motor sabe o que dá para pagar.
- **Aceite:**
  - custo lido de `mana_cost`: genérico, colorido, híbrido (inclusive {2/W}), phyrexiano (2 de vida) e X;
  - fontes lidas do texto ("{T}: Add …", "ou", "qualquer cor") e dos tipos básicos;
  - conjurar toca as fontes sozinho, por busca determinística; só oferece o que dá para pagar;
  - reserva de mana por cor, esvaziada a cada passo; imposto do comandante cobrado;
  - motor completo sempre cobra; mesa assistida tem a opção "Cobrar mana" (ligada por padrão) e "Conjurar sem pagar" para o que o motor não entende.
- **Simplificações registradas:** X entra como 0 pela mesa (escolha de X virá com os scripts); fontes com custo além de {T} (terrenos de dor, pedras com custo) não são usadas no pagamento automático.
- **Testes:** U (custo, produção, pagamento, reserva, imposto, modos), P (propriedade com mana cobrada), G.
- **Depende de:** M4.
- **Fora:** custos alternativos e redução de custo.

**M8 · Registro, replay e desfazer** ✅
- **Valor:** errou o toque, desfaz; quer rever, reproduz.
- **Aceite:**
  - `createMatch` guarda o log;
  - `undo` refaz do início sem a última ação;
  - `toJSON` serializa semente e log;
  - `hashState` é estável.
- **Testes:** U, G.
- **Depende de:** M1.
- **Fora:** desfazer informação oculta revelada.

**M9 · Habilidades ativadas e disparadas** ○
- **Valor:** a base para quase todo script de carta.
- **Aceite:**
  - objeto de habilidade na pilha;
  - gatilhos em fila, ordenados pelo controlador;
  - habilidades de mana sem pilha.
- **Testes:** U, P.
- **Depende de:** M4, M10.
- **Fora:** —

**M10 · Decisões pendentes genéricas** ○
- **Valor:** o motor pede escolhas (alvo, modo, ordem) de forma uniforme para humano e bot.
- **Aceite:**
  - `state.pending` tipado;
  - `legalActions` lista as escolhas;
  - mesmo contrato para a interface e para o bot.
- **Testes:** U, P.
- **Depende de:** M4.
- **Fora:** —

**M11 · Ações baseadas em estado com escolha** ○
- **Valor:** a regra de lenda e os marcadores se resolvem sozinhos.
- **Aceite:** regra de lenda (escolha via M10), anulação de +1/+1 com −1/−1, planeswalker com 0 de lealdade, aura ilegal.
- **Testes:** U, P.
- **Depende de:** M10.
- **Fora:** —

**M12 · Fichas e cópias** ○
- **Valor:** criaturas-ficha jogáveis.
- **Aceite:**
  - objeto sem carta;
  - deixa de existir fora do campo;
  - invariante de contagem ajustada.
- **Testes:** U, P.
- **Depende de:** M5.
- **Fora:** camadas de cópia completas.

**M13 · Regras específicas de Commander** ○
- **Valor:** o Commander completo sem lembrar exceções.
- **Aceite:**
  - substituição do comandante para a zona de comando (escolha);
  - partner e background;
  - identidade de cor aplicada à mana produzida.
- **Testes:** U.
- **Depende de:** M6, M10.
- **Fora:** multiplayer com mais de 2 jogadores na interface.

**M14 · Companheiro na partida** ✅
- **Entregue:** zona própria revelada desde o início; ação especial de {3} no tempo de feitiço, uma vez por partida, sem pilha; na mesa, o botão aparece na zona Companheiro dos dois jogadores.
- **Valor:** jogar com Lurrus e cia. como na mesa real.
- **Aceite (regra 702.139):**
  - o companheiro começa fora do jogo, revelado para o oponente antes dos mulligans, numa zona própria visível na mesa;
  - ação especial, uma vez por partida: quando você poderia conjurar um feitiço (seu turno, fase principal, pilha vazia), paga {3} e põe o companheiro na mão; não usa a pilha e não dá resposta;
  - depois disso ele é uma carta comum na mão, conjurada pelo custo normal;
  - motor completo: cobra {3} pela reserva de mana (M7); mesa assistida: o pagamento segue a opção de mana da partida;
  - no Commander, o companheiro não entra na zona de comando e não sofre imposto de comandante;
  - a lista só entra na partida se a condição do companheiro estiver cumprida (L11), senão a preparação avisa.
- **Testes:** U (tempo da ação, uma vez por partida, custo, não conta no grimório), P (fuzz com lista com companheiro), G (partida-referência com companheiro), I (botão na mesa e zona visível para o oponente no hot-seat).
- **Depende de:** M4, M7, L11.
- **Fora:** —

### A · Mesa assistida

**A0 · Componentes da mesa no design system** ✅
- **Valor:** a mesa nasce coerente com o resto do app.
- **Aceite:**
  - zona, carta na mesa (virada, com enjoo, com marcadores), pilha, contador de vida, banner de prioridade, cartão de adjudicação e barra de passo;
  - todos no `/ds`, nos dois temas.
- **Testes:** V, I (`/ds` sem erro).
- **Depende de:** F5.
- **Fora:** animações de carta.

**A1 · Layout da mesa** ✅
- **Valor:** ver o estado inteiro da partida numa tela de celular.
- **Aceite:**
  - retrato: oponente em cima, você embaixo, pilha e passo ao centro, mão em faixa rolável;
  - hierarquia de zonas inspirada no Arena;
  - cemitério e exílio abrem em lista.
- **Testes:** I, V (alvo de toque na mesa).
- **Depende de:** A0, M5.
- **Fora:** paisagem e tablet.

**A2 · Preparar partida** ✅
- **Valor:** do deck salvo à mão inicial em três toques.
- **Aceite:**
  - escolher lista(s), formato, modo (só mesa assistida até S9) e oponente (goldfish ou hot-seat);
  - semente visível;
  - tela de mulligan com escolha das cartas para o fundo.
- **Testes:** I.
- **Depende de:** L1, M2.
- **Fora:** motor completo (S9).

**A3 · Mão e ações legais** ✅
- **Valor:** só aparece o que se pode fazer agora.
- **Aceite:**
  - botões derivados de `legalActions`;
  - ação ilegal nunca é oferecida;
  - `RuleError` vira mensagem clara.
- **Testes:** I, P (toda ação exibida é aceita).
- **Depende de:** A1, M4.
- **Fora:** —

**A4 · Pilha e momento de prioridade** ✅
- **Valor:** saber quando é a sua vez de responder.
- **Aceite:**
  - banner "Você tem prioridade" com Passar como ação primária;
  - pilha empilhada visível com quem conjurou;
  - movimento curto que confirma a resolução, respeitando `prefers-reduced-motion`.
- **Testes:** I.
- **Depende de:** A1.
- **Fora:** —

**A5 · Adjudicação** ✅
- **Valor:** qualquer carta joga, mesmo sem script.
- **Aceite:**
  - ao resolver, abre um cartão com o oracle e os controles diretos (mover para zona, virar, marcadores, dano, vida, comprar, dano de comandante);
  - o cartão fecha com "Efeito aplicado";
  - cada controle gera ação no log.
- **Testes:** I, U (ações de adjudicação no motor já cobertas).
- **Depende de:** A4.
- **Fora:** —

**A6 · Combate na mesa** ✅
- **Valor:** atacar e bloquear tocando nas cartas.
- **Aceite:**
  - na declaração, criaturas elegíveis ficam destacadas; tocar escolhe (não abre a folha);
  - bloqueio: tocar na sua criatura lista os atacantes que ela pode bloquear;
  - prévia de dano ao montar o bloqueio (vida perdida e quem morre);
  - selos "ataca", "bloqueia" e "→ alvo" nas cartas; reserva de mana visível; registro com ataque, bloqueio, mana gerada e dano;
  - depois de declarar o ataque, a mesa só para se houver resposta possível.
- **Testes:** I (goldfish: pagar, faltar mana, atacar e dano; hot-seat: bloqueio com prévia e alcance contra voar), U (prévia sem mudar o estado).
- **Depende de:** M6, A1.
- **Fora:** arrastar para atacar.

**A7 · Registro legível e desfazer** ✅
- **Valor:** entender o que aconteceu e corrigir engano.
- **Aceite:**
  - log em pt-BR ("Bot conjurou Counterspell");
  - Desfazer sempre visível;
  - desfazer não atravessa informação revelada.
- **Testes:** I, G.
- **Depende de:** M8.
- **Fora:** —

**A8 · Salvar e retomar partida** ✅
- **Valor:** a partida sobrevive a fechar o app.
- **Aceite:**
  - salva automaticamente a cada ação (semente + log);
  - "Continuar partida" na tela inicial;
  - incompatibilidade de versão do motor avisa em vez de quebrar.
- **Testes:** I, G.
- **Depende de:** A1, M8.
- **Fora:** sincronizar entre aparelhos.

**A9 · Oponentes da mesa assistida** ✅
- **Valor:** treinar sozinho ou jogar com alguém ao lado.
- **Aceite:**
  - goldfish (oponente passivo que só passa);
  - hot-seat com tela de passagem que esconde a mão;
  - paradas automáticas no estilo Arena: você para nas suas principais, no ataque e na pilha em que pode responder; no turno alheio, no ataque e no passo final quando tem o que conjurar; a opção "Parar em todos os passos" desliga.
- **Testes:** I.
- **Depende de:** A3.
- **Fora:** bot (ADR-05).

**A10 · Cobertura antes da partida** 🟡
- **Valor:** saber antes o que o motor resolve sozinho.
- **Aceite:**
  - selo por carta na galeria da lista (✓ completo, ◐ parcial, ✎ manual) com o motivo;
  - resumo na lista: percentual completo, contagem por nível e as cartas que você vai precisar adjudicar;
  - na preparação da partida, a mesma cobertura da lista escolhida.
- **Testes:** I, U.
- **Depende de:** S2.
- **Fora:** —

### S · Scripts de carta (motor completo)

**S1 · Formato de script e validador** 🟡
- **Valor:** ensinar uma carta ao motor vira dado, não código espalhado.
- **Aceite:**
  - script declarativo por nome da carta: lista de efeitos, cada um com tipo, valores e alvo;
  - validador rejeita efeito desconhecido, campo faltando, alvo que não cabe no efeito e script sem nome;
  - script inválido é descartado no carregamento, com o erro registrado;
  - script só vale para mágicas instantâneas e feitiços (permanentes precisam de gatilhos, M9).
- **Testes:** U (validador e biblioteca inteira).
- **Nota:** a chave é o nome em inglês da carta; o `oracle_id` entra quando houver cartas com nome repetido entre edições.
- **Depende de:** M4.
- **Fora:** editor visual de script; efeitos com escolha além do alvo.

**S2 · Nível de cobertura** 🟡
- **Valor:** transparência sobre o que o motor entende.
- **Aceite:**
  - completo (script validado, carta sem texto, só palavras-chave conhecidas ou só mana), parcial (parte do texto) e manual;
  - cobertura por carta e por lista, com percentual, contagem e o que falta;
  - reserva não conta.
- **Testes:** U.
- **Depende de:** S1, S3.
- **Fora:** —

**S3 · Palavras-chave permanentes** ✅
- **Valor:** a maioria das criaturas funciona sem script próprio.
- **Entregue:** voar, alcance, atropelar, toque mortífero, vínculo com a vida, vigilância, ímpeto, iniciativa, golpe duplo, ameaça, defensor, indestrutível, lampejo, proteção e maldição de véu.
- **Testes:** U por palavra-chave (M6 e S5), G.
- **Depende de:** M6.
- **Fora:** palavras-chave de edição específica.

**S4 · Efeitos base** 🟡
- **Valor:** mágicas simples resolvidas sem pausa.
- **Aceite:**
  - dano, destruir, exilar, devolver à mão, anular, comprar, ganhar e perder vida, ±X/±X até o fim do turno, virar e desvirar;
  - indestrutível resiste a destruir, e o registro diz isso;
  - efeito até o fim do turno acaba na limpeza;
  - com script, a mesa assistida não pede adjudicação; o registro conta cada efeito.
- **Testes:** U por efeito, cenário de cada script da biblioteca, P (fuzz), G.
- **Depende de:** S1, M12 para fichas.
- **Fora:** criar ficha (depende de M12), vasculhar, escolher modo, custo alternativo.

**S5 · Alvos** 🟡
- **Valor:** mágica com alvo ilegal é tratada como a regra manda.
- **Aceite:**
  - alvo escolhido na conjuração; a mesa oferece uma opção por alvo legal;
  - tipos: qualquer alvo, criatura, jogador, oponente, permanente, artefato, encantamento e mágica (inclusive só de criatura e só de não-criatura);
  - proteção (hexproof) bloqueia o oponente, maldição de véu (shroud) bloqueia todos;
  - rechecagem na resolução: sem alvo legal, a mágica é anulada (608.2b).
- **Testes:** U, P.
- **Depende de:** S1.
- **Fora:** múltiplos alvos do mesmo efeito e alvos ilegais parciais com divisão de dano.

**S6 · Cobertura das listas do usuário: Pauper** ▶
- **Valor:** as listas Pauper salvas ficam jogáveis no motor completo.
- **Aceite:** meta de cobertura completa por lista, medida por S2 e definida na abertura da história.
- **Testes:** U (um teste de cenário por script).
- **Depende de:** S3–S5.
- **Fora:** cartas fora das listas salvas.

**S7 · Cobertura das listas do usuário: Commander (Malcolm v3 primeiro)** ▶
- **Valor:** a lista principal fica jogável no motor completo.
- **Aceite:** como em S6.
- **Testes:** U.
- **Depende de:** S6, M13.
- **Fora:** —

**S8 · Teste de carta gerado** ▶
- **Valor:** todo script nasce testado.
- **Aceite:** cada script declara um cenário mínimo (estado inicial, ação, estado esperado) que vira teste automaticamente.
- **Testes:** U.
- **Depende de:** S1.
- **Fora:** —

**S9 · Modo motor completo jogável** ▶
- **Valor:** partida sem pausa nenhuma.
- **Aceite:**
  - A2 libera o modo quando a lista está 100% coberta;
  - senão, mostra o que falta.
- **Testes:** I, G.
- **Depende de:** S2, A2.
- **Fora:** —

### B · Bot adversário

**B1 · Política aleatória legal** ✅
- **Valor:** base do fuzz e do nível mais fácil.
- **Aceite:**
  - escolhe entre `legalActions` com semente própria;
  - pondera jogar contra passar.
- **Testes:** P.
- **Depende de:** M4.
- **Fora:** —

**B2 · Bot heurístico** ○
- **Valor:** oponente que joga como gente.
- **Aceite:**
  - baixa terreno, segue a curva, ataca quando a troca favorece e segura resposta;
  - explicação curta da jogada no log.
- **Testes:** U por heurística, P.
- **Depende de:** S9.
- **Fora:** —

**B3 · Dificuldade configurável** ○
- **Valor:** desafio na medida.
- **Aceite:**
  - fácil = B1 ponderado;
  - médio = B2;
  - difícil = busca rasa com avaliação de estado;
  - resposta < 500 ms no celular.
- **Testes:** P, desempenho.
- **Depende de:** B2.
- **Fora:** aprendizado de máquina.

**B4 · Torneio bot contra bot** ○
- **Valor:** medir se "difícil" é mesmo mais forte.
- **Aceite:**
  - N partidas por semente;
  - relatório de taxa de vitória no CI;
  - difícil vence médio em ≥ 60%.
- **Testes:** P.
- **Depende de:** B3.
- **Fora:** —

### C · Coleção

**C1 · Coleção por impressão** ✅
- **Valor:** saber exatamente qual versão você tem.
- **Aceite:**
  - item = carta + edição + número + acabamento (normal, foil, etched) + idioma + condição + quantidade;
  - a coleção por nome antiga migra sem perda: cada carta vira "cópia genérica", sem edição definida;
  - listas continuam consultando por nome: o total é a soma de todas as impressões;
  - reduzir pelo nome tira primeiro as cópias genéricas e depois as impressões mais recentes;
  - na Coleção, tocar no nome abre as impressões: adicionar (edições vindas da Scryfall, ou código e número à mão sem rede), editar acabamento, idioma e condição (funde com uma igual já existente) e ajustar cada uma.
- **Testes:** U (migração, soma, redução, fusão), I (adicionar, editar e ajustar impressão).
- **Depende de:** L4.
- **Fora:** preço por impressão e valor da coleção (história própria, depois do scanner).

**C2 · Tela Coleção** ✅
- **Valor:** consultar e manter o acervo com a densidade do Moxfield.
- **Aceite:**
  - uma linha por carta, com miniatura, tipo e as listas que usam a carta;
  - totais de cartas e de cópias;
  - adicionar pelo nome (soma uma cópia, nome conferido na Scryfall);
  - filtrar pelo nome e ordenar por nome ou por quantidade;
  - funciona sem rede com os nomes já salvos.
- **Testes:** U, I, V (alvos de 44 px e sem rolagem lateral).
- **Depende de:** L4.
- **Fora:** filtros por cor, tipo e edição, e valor em US$ (entram com C1).

**C7 · Marcar com toque duplo** ✅
- **Valor:** marcar que tem uma carta sem abrir nada.
- **Aceite:**
  - dois toques numa carta da galeria da lista ou da busca marcam ou desmarcam "tenho";
  - um toque continua abrindo a carta;
  - na lista, marca a quantidade que a lista pede; na busca, uma cópia;
  - nunca apaga cópias acima do alvo: nesse caso avisa e manda ajustar na Coleção;
  - pulso visual e vibração curta confirmam.
- **Testes:** U (regra de alternância), I (toque duplo e toque simples).
- **Depende de:** L4.
- **Fora:** toque duplo na mesa.

**C8 · Lista nova já possuída** ✅
- **Valor:** cadastrar um deck montado sem marcar carta por carta.
- **Aceite:**
  - opção "Já tenho todas as cartas desta lista" ao criar ou editar;
  - garante na coleção ao menos a quantidade da lista, somando principal e reserva;
  - nunca reduz o que já existe.
- **Testes:** U, I.
- **Depende de:** L1, L4.
- **Fora:** —

**C9 · Editar quantidade e remover** ✅
- **Valor:** a coleção reflete a realidade.
- **Aceite:**
  - +/− na linha;
  - tocar no número abre a edição exata (zero remove);
  - remover pede confirmação e avisa quais listas passam a mostrar a carta como faltante.
- **Testes:** U, I.
- **Depende de:** C2.
- **Fora:** desfazer remoção.

**C3 · Importar e exportar CSV** ✅
- **Valor:** trazer a coleção de outros apps.
- **Aceite:**
  - reconhece colunas pelo cabeçalho: ManaBox, Moxfield, Archidekt, Delver Lens e planilhas com cabeçalhos parecidos;
  - aceita vírgula, ponto e vírgula ou tabulação, aspas e BOM;
  - normaliza acabamento, condição (NM, LP, MP, HP, DMG) e idioma;
  - prévia antes de importar, com formato reconhecido, total e linhas ignoradas com motivo;
  - somar à coleção ou substituir (com confirmação);
  - exporta no cabeçalho de coleção do Moxfield, que a própria Estante relê sem perda.
- **Testes:** U com arquivo de exemplo de cada app e ida e volta; I (importar, prévia, exportar).
- **Nota:** os arquivos de exemplo foram montados a partir dos cabeçalhos públicos de exportação. Validar com uma exportação real de cada app e, se algum divergir, virar fixture.
- **Depende de:** C1.
- **Fora:** sincronização por API de terceiros.

**C4 · Faltantes por impressão** ○
- **Valor:** a lista de compras considera a versão desejada.
- **Aceite:** L6 passa a respeitar a impressão escolhida (V1) quando houver.
- **Testes:** U.
- **Depende de:** C1, V1.
- **Fora:** —

**C5 · Persistência garantida** ✅
- **Valor:** não perder a coleção.
- **Aceite:**
  - a camada de plataforma ganha `persistence` (status e pedido de proteção);
  - na Coleção, aviso quando o navegador pode apagar os dados, com o botão "Proteger armazenamento";
  - lembrete quando nunca houve backup ou o último tem mais de 30 dias, com o botão "Exportar backup";
  - backup v2 leva as impressões; backups v1 continuam restaurando.
- **Testes:** U (backup v2 e data do último), I (aviso some depois do backup).
- **Depende de:** L1.
- **Fora:** backup em nuvem.

**C6 · Base offline de nomes** ✅
- **Valor:** reconhecer e sugerir qualquer carta sem depender da rede a cada leitura.
- **Aceite:**
  - baixa o catálogo de nomes da Scryfall (`/catalog/card-names`, cerca de 30 mil nomes) na primeira abertura do scanner;
  - guarda no aparelho e usa sem rede;
  - atualiza sozinho quando tem mais de 30 dias, mantendo a antiga se a atualização falhar;
  - mostra quantidade e tamanho, o insumo do gatilho G1.
- **Testes:** U.
- **Depende de:** D1.
- **Fora:** base completa de cartas (texto, imagens) offline; volta a ser avaliada com o gatilho G1.

### X · Scanner

**X1 · Câmera com moldura guia** ✅
- **Valor:** apontar e enquadrar com uma mão.
- **Aceite:**
  - câmera traseira pela camada F2;
  - moldura na proporção da carta, com a faixa do nome destacada;
  - a região lida é convertida da tela para o quadro da câmera (vídeo em `object-fit: cover`);
  - câmera bloqueada ou ausente gera instrução clara e libera a digitação do nome;
  - a câmera desliga ao sair da tela.
- **Testes:** U (conversão da região), I (câmera simulada e câmera bloqueada).
- **Depende de:** F2.
- **Fora:** lanterna e foco manual.

**X2 · Reconhecimento pelo nome** ✅
- **Valor:** identificar a carta sem digitar.
- **Aceite:**
  - OCR no aparelho (Tesseract, carregado só quando o scanner abre) da faixa do nome, com tons de cinza, contraste e ampliação;
  - correspondência aproximada contra a base de nomes: tolera trocas típicas do OCR, lixo do custo de mana no fim da linha e responde cartas divididas pela primeira metade;
  - mostra o melhor palpite com a nota e os candidatos, que entram no lote com um toque;
  - casar contra 30 mil nomes leva menos de 100 ms.
- **Testes:** U (textos ruidosos contra um catálogo de 30 mil nomes, desempenho), I (OCR simulado).
- **Pendente:** a meta de ≥ 90% de acerto precisa de um conjunto de fotos reais de cartas (fixture). Sem ele, a precisão do OCR em si não é medida pelo portão, só a correspondência.
- **Depende de:** X1, C6.
- **Fora:** OCR em servidor.

**X3 · Identificação da impressão** ✅
- **Valor:** registrar a versão certa.
- **Aceite:**
  - depois de reconhecer o nome, uma segunda leitura pega a linha de coleção (canto inferior esquerdo: "267/303 U · MH2 • EN" ou "0045 C · DMR • PT");
  - com rede, a leitura é conferida contra as impressões da carta: edição e número, só número ou só edição;
  - quando ambíguo, oferece até 3 edições prováveis para tocar;
  - sem rede, guarda edição e número lidos como "não conferida";
  - o lote separa impressões da mesma carta; na coleção, entram como impressão (C1);
  - chip "Edição" liga e desliga a segunda leitura.
- **Testes:** U (leitura da linha nos dois formatos, com ruído; casamento com impressões; lote por impressão), I (edição identificada e não identificada).
- **Pendente:** precisão real depende das fotos de teste (ver X2).
- **Depende de:** X2, C1.
- **Fora:** cartas antigas sem número de coleção impresso (entram sem edição).

**X4 · Fluxo em lote com uma mão** ✅
- **Valor:** catalogar uma caixa inteira depressa.
- **Aceite:**
  - "Ler agora" e modo automático (uma leitura a cada 1,4 s);
  - no automático, a mesma carta parada não soma de novo até sair do quadro;
  - contador do lote, desfazer a última, pulso e vibração ao reconhecer;
  - lote editável (+/−, corrigir com sugestões) e guardado no aparelho;
  - "Adicionar à coleção" soma cópias genéricas.
- **Testes:** U (regra de rearme, desfazer, corrigir, persistência), I.
- **Depende de:** X2.
- **Fora:** processamento em segundo plano (gatilho G3); destino lista (X5).

**X5 · Destino da leitura** ✅
- **Valor:** o scanner alimenta coleção ou lista.
- **Aceite:**
  - no lote, "Destino": Coleção ou qualquer lista salva;
  - para lista: soma no deck principal (funde com a mesma carta) e, por padrão, também na coleção;
  - resumo ao final (quantas cartas, quantas novas na lista).
- **Testes:** I.
- **Depende de:** X4, C1, L1.
- **Fora:** escolher zona (reserva, comandante) pelo scanner.

**X6 · Scanner offline** ✅
- **Valor:** funciona na loja sem sinal.
- **Aceite:**
  - o service worker guarda os arquivos do motor de OCR (CDN versionado, inclusive resposta opaca de `<script>`); os dados do idioma ficam no próprio cache do Tesseract;
  - a base de nomes (C6) já funciona sem rede;
  - o scanner mostra "leitor disponível offline" depois do primeiro uso com rede e avisa quando ainda não foi baixado;
  - sem rede, a edição lida entra como "não conferida" (X3).
- **Testes:** U (estratégia de cache do motor), I (fluxo com leitor simulado).
- **Pendente:** validar no aparelho: abrir o scanner uma vez com rede, ativar o modo avião e ler uma carta.
- **Depende de:** X2, C6, W1.
- **Fora:** —

### V · Visualização

**V1 · Impressões e arte por carta** ○
- **Valor:** escolher a versão que aparece na lista.
- **Aceite:** o visualizador lista as impressões (`/cards/search?unique=prints`) e a escolha é salva na entrada da lista.
- **Testes:** I.
- **Depende de:** D5, L1.
- **Fora:** —

**V2 · Rulings** ○
- **Valor:** tirar dúvida de regra na hora.
- **Aceite:** rulings da Scryfall no visualizador, com cache e data.
- **Testes:** U, I.
- **Depende de:** D1.
- **Fora:** —

**V3 · Modos da lista** ○
- **Valor:** galeria para ver, texto denso para editar.
- **Aceite:** galeria (L3), lista densa estilo Moxfield e pilhas por custo; a preferência é lembrada.
- **Testes:** I, V.
- **Depende de:** L3.
- **Fora:** —

**V4 · Zoom na mesa** ○
- **Valor:** ler a carta sem sair da partida.
- **Aceite:** tocar e segurar amplia com o oracle; soltar fecha.
- **Testes:** I.
- **Depende de:** A1.
- **Fora:** —

### L · Listas, continuação

**L7 · Edição rápida** ○
- **Valor:** ajustar a lista sem colar o texto de novo.
- **Aceite:**
  - buscar com autocompletar (`/cards/autocomplete`);
  - +/− quantidade e mover entre zonas;
  - atalhos de teclado no desktop.
- **Testes:** I.
- **Depende de:** L3.
- **Fora:** —

**L8 · Estatísticas** ○
- **Valor:** entender a lista como no Archidekt.
- **Aceite:** distribuição por tipo, símbolos de custo contra fontes de mana por cor e curva por tipo.
- **Testes:** U, I.
- **Depende de:** L3.
- **Fora:** sugestão de corte (escopo negativo).

**L9 · Versões da lista** ○
- **Valor:** comparar a v2 com a v3.
- **Aceite:** salvar como nova versão e ver o diff (entrou e saiu).
- **Testes:** U, I.
- **Depende de:** L1.
- **Fora:** —

**L10 · Importar por URL** ⛔
- Moxfield e Archidekt não liberam CORS para o navegador.
- Reabrir só com o gatilho G4 e um proxy próprio.

**L11 · Companheiro** ✅
- **Valor:** montar listas com companheiro (Lurrus e outros) sem burlar a contagem.
- **Aceite:**
  - zona própria "Companheiro": cabeçalho `Companion` no texto colado ou "Definir como companheiro" na carta (só para cartas com a habilidade); um por lista, e trocar devolve o anterior ao deck;
  - não conta nas 100 do Commander nem nas 60 do Pauper; no construído, ocupa uma vaga da reserva (15);
  - no Commander, precisa estar na identidade de cor do comandante;
  - a condição de construção é checada no deck inicial (comandante incluído): Lurrus, Gyruda, Obosh, Keruga, Jegantha, Kaheera, Zirda, Umori, Lutri e Yorion; companheiro não mapeado gera aviso para conferir;
  - fica fora do grimório na mesa até o M14; exportação preserva o bloco `Companion`.
- **Testes:** U (contagem, condições, identidade, reserva do Pauper, texto e exportação), I (definir companheiro e condição quebrada).
- **Depende de:** L1, L5.
- **Fora:** regra de jogo do companheiro (M14).

### P · Plataforma

**P1 · Monitor de gatilhos** ○
- **Valor:** a decisão de migrar vira fato medido.
- **Aceite:** a tela "Este aparelho" mostra cota e uso, persistência, câmera, modo instalado e a última taxa de acerto do scanner, marcando G1, G2 e G5.
- **Testes:** I.
- **Depende de:** F2.
- **Fora:** —

**P2 · Adaptador Capacitor** ○
- **Valor:** app nativo sem reescrever domínio.
- **Aceite:** implementações nativas do contrato F2 e o mesmo portão verde.
- **Testes:** todas as camadas.
- **Depende de:** algum gatilho acionado.
- **Fora:** iOS antes do Android.

---

## 8. Como publicar e verificar

1. Suba os arquivos alterados em **Add file → Upload files**.
2. A aba **Actions** roda o Portão de release. ✓ verde significa publicável.
3. Com ✗, abra o job, leia o primeiro teste que falhou e não siga com o deploy até corrigir.
   - Com o fuzz noturno, a falha traz a semente: ela reproduz o bug localmente.
4. O GitHub Pages publica o `main` sozinho. Na primeira abertura depois de um deploy, recarregue uma vez: o service worker usa rede primeiro para o HTML.
