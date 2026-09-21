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
| L · Listas e coleção | L1 persistência e backup · L2 leitura de texto · L3 galeria · L4 coleção por nome · L5 validação de formato · L6 exportação | 🟡 |
| Q · Qualidade | Q1 harness · Q2 fuzz · Q3 golden · Q4 integração headless · Q5 contrato visual · Q6 portão e CI | 🟡 |
| M · Motor núcleo | M1 estado e semente · M2 formato e mulligan · M3 turno · M4 prioridade e pilha · M5 ações baseadas em estado · M8 replay e desfazer | 🟡 |
| B · Bot | B1 política aleatória legal (base do fuzz) | 🟡 |

**Dívida registrada.** Os IDs F1 e F3 não aparecem no código e não são rastreáveis. Os testes originais de F, D e W não estão no repositório. A história **Q7** paga essa dívida.

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

O código original era organizado em `src/…` com um empacotador, e essa árvore se perdeu. Decisão: o `index.html` publicado é a fonte, e os testes carregam exatamente esse arquivo (`tests/_load.mjs`).

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
| 1 · Unidade | `tests/engine.unit.test.mjs`, `tests/decks.unit.test.mjs` | Regras puras, sem DOM |
| 2 · Propriedade e fuzz | `tests/engine.fuzz.test.mjs` | Partidas aleatórias: sem exceção fora de `RuleError`, sem travar, invariantes válidas a cada ação |
| 3 · Golden replay | `tests/engine.golden.test.mjs` + `tests/golden/*.json` | Mesma semente e mesmas ações produzem o mesmo estado, ponto a ponto |
| 4 · Integração headless | `tests/e2e.test.mjs` | Fluxo do usuário no Chromium, com a Scryfall simulada |
| 5 · Contrato visual | `tests/contract.visual.test.mjs` | Contraste AA nos dois temas, zero cor fora de token, alvo de 44 px, tema claro sem divergência |

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

**Próximas entregas:**

| Entrega | Conteúdo | Resultado para o usuário |
|---|---|---|
| E1 (esta) | Q1–Q6, M1–M5, M8, B1 | Portão de qualidade e motor testado; ainda sem tela de jogo |
| E2 | A0–A5, A7, A9, Q7 | **Primeira partida jogável:** mesa assistida no celular, goldfish e hot-seat |
| E3 | M6, A6, M7 | Combate e mana resolvidos pelo motor |
| E4 | S1–S5, S2 + A10 | Primeiros scripts de carta e cobertura visível |
| E5 | C1–C3, C5 | Coleção de verdade, com importação do ManaBox e outros |

---

## 7. Épicos e histórias

Camadas de teste: **U** unidade · **P** propriedade/fuzz · **G** golden · **I** integração headless · **V** contrato visual.

### Q · Qualidade

**Q1 · Harness sobre o arquivo publicado** 🟡
- **Valor:** o que é testado é exatamente o que vai ao ar.
- **Aceite:** `tests/_load.mjs` extrai o script do `index.html` e expõe os módulos sem DOM e sem rede.
- **Testes:** U — todos os demais arquivos dependem dele.
- **Depende de:** —
- **Fora:** empacotador.

**Q2 · Fuzz e propriedade** 🟡
- **Valor:** bugs de regra aparecem antes do usuário.
- **Aceite:**
  - N partidas por formato, com e sem adjudicação;
  - invariantes checadas a cada ação;
  - toda ação de `legalActions` é aceita por `apply`;
  - `FUZZ_GAMES` configurável.
- **Testes:** P.
- **Depende de:** Q1, M1.
- **Fora:** —

**Q3 · Golden replay** 🟡
- **Valor:** mudança de regra nunca passa despercebida.
- **Aceite:**
  - 3 partidas gravadas, com hash a cada 25 ações;
  - regravação só por `npm run golden:update`.
- **Testes:** G.
- **Depende de:** M8.
- **Fora:** —

**Q4 · Integração headless** 🟡
- **Valor:** o fluxo real do usuário é verificado sem abrir o celular.
- **Aceite:**
  - Playwright com a Scryfall simulada;
  - falha se houver erro de console;
  - pula localmente sem Playwright e falha no CI.
- **Testes:** I.
- **Depende de:** Q1.
- **Fora:** testes contra a Scryfall real.

**Q5 · Contrato visual** 🟡
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

**Q6 · Portão por comando único e CI** 🟡
- **Valor:** "está pronto?" vira um ✓ ou ✗ no GitHub.
- **Aceite:**
  - `npm test` roda as 5 camadas;
  - workflow no push, no PR e à noite;
  - status visível no commit.
- **Testes:** o próprio portão.
- **Depende de:** Q1–Q5.
- **Fora:** deploy automático condicionado (ver seção 8).

**Q7 · Dívida de testes das histórias F, D e W** ▶
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

**M1 · Estado, zonas e semente** 🟡
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

**M2 · Preparação por formato e mulligan** 🟡
- **Valor:** a partida começa como na mesa real.
- **Aceite:**
  - Pauper com 20 de vida;
  - Commander com 40 de vida e comandante na zona de comando;
  - quem começa é sorteado pela semente;
  - mulligan London: compra 7 e põe N no fundo.
- **Testes:** U.
- **Depende de:** M1.
- **Fora:** mulligan gratuito do multiplayer.

**M3 · Estrutura de turno** 🟡
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

**M4 · Prioridade e pilha** 🟡
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

**M5 · Ações baseadas em estado, núcleo** 🟡
- **Valor:** derrota e morte de criatura acontecem sem ninguém lembrar.
- **Aceite:**
  - vida ≤ 0, compra com grimório vazio e 21 de dano de comandante levam à derrota;
  - dano letal ou resistência ≤ 0 levam a criatura ao cemitério;
  - as checagens repetem até estabilizar;
  - quem sai da partida leva a pilha que possuía.
- **Testes:** U, P.
- **Depende de:** M4.
- **Fora:** regra de lenda e anulação de marcadores (M11).

**M6 · Combate** ▶
- **Valor:** atacar e bloquear sem conta manual.
- **Aceite:**
  - declarar atacantes com legalidade (enjoo, virado, defensor);
  - declarar bloqueadores, com menace e reach;
  - ordem de dano; first strike e double strike;
  - dano ao jogador e dano de comandante automático;
  - vigilance.
- **Testes:** U por keyword, P, G novo.
- **Depende de:** M5.
- **Fora:** banding e efeitos de "não pode bloquear" vindos de script (S4).

**M7 · Mana** ○
- **Valor:** o motor sabe o que dá para pagar.
- **Aceite:**
  - reserva de mana por cor que esvazia entre passos;
  - custo parseado de `mana_cost`, incluindo híbrido, fóbico e X;
  - pagamento automático sugerido e ajuste manual;
  - imposto do comandante cobrado;
  - na mesa assistida o pagamento é opcional (liga ou desliga na partida).
- **Testes:** U, P.
- **Depende de:** M4.
- **Fora:** custos alternativos exóticos.

**M8 · Registro, replay e desfazer** 🟡
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

### A · Mesa assistida

**A0 · Componentes da mesa no design system** ▶
- **Valor:** a mesa nasce coerente com o resto do app.
- **Aceite:**
  - zona, carta na mesa (virada, com enjoo, com marcadores), pilha, contador de vida, banner de prioridade, cartão de adjudicação e barra de passo;
  - todos no `/ds`, nos dois temas.
- **Testes:** V, I (`/ds` sem erro).
- **Depende de:** F5.
- **Fora:** animações de carta.

**A1 · Layout da mesa** ▶
- **Valor:** ver o estado inteiro da partida numa tela de celular.
- **Aceite:**
  - retrato: oponente em cima, você embaixo, pilha e passo ao centro, mão em faixa rolável;
  - hierarquia de zonas inspirada no Arena;
  - cemitério e exílio abrem em lista.
- **Testes:** I, V (alvo de toque na mesa).
- **Depende de:** A0, M5.
- **Fora:** paisagem e tablet.

**A2 · Preparar partida** ▶
- **Valor:** do deck salvo à mão inicial em três toques.
- **Aceite:**
  - escolher lista(s), formato, modo (só mesa assistida até S9) e oponente (goldfish ou hot-seat);
  - semente visível;
  - tela de mulligan com escolha das cartas para o fundo.
- **Testes:** I.
- **Depende de:** L1, M2.
- **Fora:** motor completo (S9).

**A3 · Mão e ações legais** ▶
- **Valor:** só aparece o que se pode fazer agora.
- **Aceite:**
  - botões derivados de `legalActions`;
  - ação ilegal nunca é oferecida;
  - `RuleError` vira mensagem clara.
- **Testes:** I, P (toda ação exibida é aceita).
- **Depende de:** A1, M4.
- **Fora:** —

**A4 · Pilha e momento de prioridade** ▶
- **Valor:** saber quando é a sua vez de responder.
- **Aceite:**
  - banner "Você tem prioridade" com Passar como ação primária;
  - pilha empilhada visível com quem conjurou;
  - movimento curto que confirma a resolução, respeitando `prefers-reduced-motion`.
- **Testes:** I.
- **Depende de:** A1.
- **Fora:** —

**A5 · Adjudicação** ▶
- **Valor:** qualquer carta joga, mesmo sem script.
- **Aceite:**
  - ao resolver, abre um cartão com o oracle e os controles diretos (mover para zona, virar, marcadores, dano, vida, comprar, dano de comandante);
  - o cartão fecha com "Efeito aplicado";
  - cada controle gera ação no log.
- **Testes:** I, U (ações de adjudicação no motor já cobertas).
- **Depende de:** A4.
- **Fora:** —

**A6 · Combate na mesa** ○
- **Valor:** atacar com arrastar ou tocar.
- **Aceite:** seleção de atacantes e bloqueadores e prévia do dano.
- **Testes:** I, G.
- **Depende de:** M6, A1.
- **Fora:** —

**A7 · Registro legível e desfazer** ▶
- **Valor:** entender o que aconteceu e corrigir engano.
- **Aceite:**
  - log em pt-BR ("Bot conjurou Counterspell");
  - Desfazer sempre visível;
  - desfazer não atravessa informação revelada.
- **Testes:** I, G.
- **Depende de:** M8.
- **Fora:** —

**A8 · Salvar e retomar partida** ○
- **Valor:** a partida sobrevive a fechar o app.
- **Aceite:**
  - salva automaticamente a cada ação (semente + log);
  - "Continuar partida" na tela inicial;
  - incompatibilidade de versão do motor avisa em vez de quebrar.
- **Testes:** I, G.
- **Depende de:** A1, M8.
- **Fora:** sincronizar entre aparelhos.

**A9 · Oponentes da mesa assistida** ▶
- **Valor:** treinar sozinho ou jogar com alguém ao lado.
- **Aceite:**
  - goldfish (oponente passivo que só passa);
  - hot-seat com tela de passagem que esconde a mão.
- **Testes:** I.
- **Depende de:** A3.
- **Fora:** bot (ADR-05).

**A10 · Cobertura antes da partida** ○
- **Valor:** saber antes o que o motor resolve sozinho.
- **Aceite:**
  - cada carta mostra o selo completo, parcial ou manual na galeria e na preparação;
  - percentual por lista.
- **Testes:** I, U.
- **Depende de:** S2.
- **Fora:** —

### S · Scripts de carta (motor completo)

**S1 · Formato de script e validador** ○
- **Valor:** adicionar carta ao motor vira dado, não código espalhado.
- **Aceite:**
  - script declarativo por `oracle_id`, com efeitos, alvos, gatilhos e custo;
  - schema validado;
  - carta com script inválido é rejeitada no carregamento.
- **Testes:** U.
- **Depende de:** M9, M10.
- **Fora:** editor visual de script.

**S2 · Nível de cobertura** ○
- **Valor:** transparência sobre o que o motor entende.
- **Aceite:**
  - completo: script validado com teste;
  - parcial: palavras-chave conhecidas, texto restante manual;
  - manual: sem script;
  - cálculo por carta e por lista.
- **Testes:** U.
- **Depende de:** S1, S3.
- **Fora:** —

**S3 · Palavras-chave permanentes** ○
- **Valor:** a maioria das criaturas funciona sem script próprio.
- **Aceite:** flying, reach, trample, deathtouch, lifelink, vigilance, haste, first strike, double strike, menace, defender, hexproof, indestructible e flash.
- **Testes:** U por keyword, G.
- **Depende de:** M6.
- **Fora:** keywords de edição específica.

**S4 · Efeitos base** ○
- **Valor:** mágicas simples resolvidas sem pausa.
- **Aceite:** comprar, dano, destruir, exilar, anular, devolver à mão, ±X/±X até o fim do turno, criar ficha, ganhar e perder vida.
- **Testes:** U, P.
- **Depende de:** S1, M12.
- **Fora:** —

**S5 · Alvos** ○
- **Valor:** mágica com alvo ilegal é tratada como a regra manda.
- **Aceite:**
  - restrições de alvo;
  - rechecagem na resolução (608.2b);
  - hexproof e shroud.
- **Testes:** U, P.
- **Depende de:** S1.
- **Fora:** —

**S6 · Cobertura das listas do usuário: Pauper** ○
- **Valor:** as listas Pauper salvas ficam jogáveis no motor completo.
- **Aceite:** meta de cobertura completa por lista, medida por S2 e definida na abertura da história.
- **Testes:** U (um teste de cenário por script).
- **Depende de:** S3–S5.
- **Fora:** cartas fora das listas salvas.

**S7 · Cobertura das listas do usuário: Commander (Malcolm v3 primeiro)** ○
- **Valor:** a lista principal fica jogável no motor completo.
- **Aceite:** como em S6.
- **Testes:** U.
- **Depende de:** S6, M13.
- **Fora:** —

**S8 · Teste de carta gerado** ○
- **Valor:** todo script nasce testado.
- **Aceite:** cada script declara um cenário mínimo (estado inicial, ação, estado esperado) que vira teste automaticamente.
- **Testes:** U.
- **Depende de:** S1.
- **Fora:** —

**S9 · Modo motor completo jogável** ○
- **Valor:** partida sem pausa nenhuma.
- **Aceite:**
  - A2 libera o modo quando a lista está 100% coberta;
  - senão, mostra o que falta.
- **Testes:** I, G.
- **Depende de:** S2, A2.
- **Fora:** —

### B · Bot adversário

**B1 · Política aleatória legal** 🟡
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

**C1 · Coleção por impressão** ○
- **Valor:** saber exatamente qual versão você tem.
- **Aceite:**
  - item = carta + edição + número + foil + idioma + condição + quantidade;
  - migração automática da coleção por nome (L4) sem perda.
- **Testes:** U, I.
- **Depende de:** L4.
- **Fora:** preço histórico.

**C2 · Tela Coleção** ○
- **Valor:** consultar o acervo com a densidade do Moxfield.
- **Aceite:**
  - busca, filtros (cor, tipo, edição, foil) e totais;
  - valor estimado em US$ pela Scryfall, com data.
- **Testes:** I, V.
- **Depende de:** C1.
- **Fora:** —

**C3 · Importar e exportar CSV** ○
- **Valor:** trazer a coleção de outros apps.
- **Aceite:**
  - reconhece os cabeçalhos de ManaBox, Moxfield, Delver Lens e Archidekt;
  - relatório de linhas não reconhecidas;
  - exporta CSV.
- **Testes:** U com arquivos de exemplo de cada app.
- **Depende de:** C1.
- **Fora:** sincronização por API de terceiros.

**C4 · Faltantes por impressão** ○
- **Valor:** a lista de compras considera a versão desejada.
- **Aceite:** L6 passa a respeitar a impressão escolhida (V1) quando houver.
- **Testes:** U.
- **Depende de:** C1, V1.
- **Fora:** —

**C5 · Persistência garantida** ○
- **Valor:** não perder a coleção.
- **Aceite:**
  - pede `storage.persist()`;
  - lembra de fazer backup se o último tiver mais de 30 dias;
  - mostra o estado da persistência.
- **Testes:** I.
- **Depende de:** L1.
- **Fora:** backup em nuvem.

**C6 · Base offline de cartas** ○
- **Valor:** buscar qualquer carta sem rede.
- **Aceite:**
  - baixa a base leve (oracle) sob demanda, com progresso e tamanho medido;
  - alimenta D4;
  - mede G1.
- **Testes:** U, I.
- **Depende de:** D4, P1.
- **Fora:** imagens de todas as cartas.

### X · Scanner

**X1 · Câmera com moldura guia** ○
- **Valor:** apontar e enquadrar com uma mão.
- **Aceite:**
  - câmera traseira via F2;
  - moldura na proporção da carta;
  - lanterna quando o aparelho suporta;
  - permissão negada gera instrução clara.
- **Testes:** I (câmera simulada).
- **Depende de:** F2.
- **Fora:** —

**X2 · Reconhecimento pelo nome** ○
- **Valor:** identificar a carta sem digitar.
- **Aceite:**
  - OCR no aparelho da faixa do nome;
  - correspondência aproximada com o índice de nomes;
  - ≥ 90% de acerto no conjunto de fotos de teste.
- **Testes:** U com fixture de fotos, desempenho.
- **Depende de:** X1, C6.
- **Fora:** OCR em servidor.

**X3 · Identificação da impressão** ○
- **Valor:** registrar a versão certa.
- **Aceite:**
  - OCR da linha de coleção (edição e número);
  - quando ambíguo, oferece as 3 impressões mais prováveis.
- **Testes:** U com fixture.
- **Depende de:** X2, C1.
- **Fora:** —

**X4 · Fluxo em lote com uma mão** ○
- **Valor:** catalogar uma caixa inteira depressa.
- **Aceite:**
  - captura contínua com contador;
  - confirmar, corrigir e desfazer a última;
  - vibração ao reconhecer.
- **Testes:** I.
- **Depende de:** X2.
- **Fora:** processamento em segundo plano (gatilho G3).

**X5 · Destino da leitura** ○
- **Valor:** o scanner alimenta coleção ou lista.
- **Aceite:** escolha do destino antes do lote, com resumo ao final.
- **Testes:** I.
- **Depende de:** X4, C1, L1.
- **Fora:** —

**X6 · Scanner offline** ○
- **Valor:** funciona na loja sem sinal.
- **Aceite:** modelo de OCR e índice de nomes em cache.
- **Testes:** I offline.
- **Depende de:** X2, C6.
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
4. O GitHub Pages publica o `main` sozinho. Na primeira abertura depois de um deploy, recarregue uma vez: o service worker usa rede primeiro para o HTML.
