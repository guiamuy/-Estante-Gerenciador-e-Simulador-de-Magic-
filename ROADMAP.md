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
| S · Scripts | S1 formato e validador · S2 cobertura · S3 palavras-chave · S4 efeitos · S5 alvos · A10 cobertura visível | ✅ |
| S · Scripts | S8 cenário em cada script · S9 modo motor completo | ✅ |
| M · Motor | M9 habilidades ativadas e disparadas · M10 ordem dos gatilhos | ✅ |
| S · Scripts | S6/S7 levas das listas do Guilherme | 🟡 |
| S · Scripts | S11 auras e equipamentos · S11b mana de aura, prevenção, proteção e evasão | ✅ |
| M · Motor | M12 fichas · S10 cartas que criam fichas | ✅ |
| S · Scripts | S12 escolhas do jogador: descartar, modos e condição de cor | ✅ |
| S · Scripts | S13 vasculhar e moer · S14 scry, vigiar e olhar o topo | ✅ |
| S · Scripts | S15 gatilhos com alvo e de outras permanentes · S17 filtros de alvo | ✅ |
| S · Scripts | S16 custos alternativos, lampejo do passado e "a menos que pague" | ✅ |
| S · Scripts | S18 ninjutsu, insanidade e dano de combate ao jogador | ✅ |
| S · Scripts | S19 valores dinâmicos | ✅ |
| S · Scripts | S20 cemitério, mana direta e custos adicionais | ✅ |
| S · Scripts | S21 planeswalkers | ✅ |
| S · Scripts | S22 entra virado, ciclar, custo de descarte e cartas conferidas na Scryfall | ✅ |
| S · Scripts | S23 gatilhos de conjuração e mana de qualquer cor | ✅ |
| S · Scripts | S24 faces duplas: disturb e presságio | ✅ |
| S · Scripts | S25 transformar no campo, condições de gatilho e palavra-chave temporária | ✅ |
| S · Scripts | S26 delve, lampejo com custo de virar criaturas e últimas cartas | ✅ |
| S · Scripts | S27 fechamento das listas e medição por lista | ✅ |
| S · Scripts | S28 Faeries: condição de nome, subtipo e alvo do oponente | ✅ |
| S · Scripts | S29 Walls: devolver terreno, transmutar e Fog | ✅ |
| S · Scripts | S30 Boros: prevenção por cor, Flagbearer e custo de revelar | ✅ |
| S · Scripts | S31 cancelar prevenção, alvos distintos e contagem multiplicada | 🟡 |

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
| E8 ✅ | S1–S5, A10 | Primeiros scripts de carta, alvos e cobertura visível |
| E9 ✅ | S8, S9, biblioteca ampliada | Cenário obrigatório por script, varreduras e o modo sem pausa nenhuma |
| E10 ✅ | M9, M10 | Cartas com gatilho e habilidade ativada entram no motor |
| E11 🟡 | S6, S7 (leva 1) | Primeiras cartas das listas reais, e o mapa do que falta |
| E12 🟡 | S11 (leva 2) | Auras e equipamentos: anexar, bônus, cair quando o alvo some |
| E13 ✅ | S11b (leva 3) | Auras que dão mana, prevenção, proteção de cor, evasão e P/T dinâmico |
| E14 ✅ | M12, S10 (leva 4) | Fichas: Battle Screech, Dragon Fodder, Swan Song, pistas |
| E15 ✅ | S12 (leva 5) | Escolhas do jogador: descartar, modos, Hydroblast e cia. |
| E16 ✅ | S13, S14 (leva 6) | Vasculhar o grimório, moer, scry e olhar o topo |
| E17 ✅ | S15, S17 (leva 7) | Gatilhos com alvo e de outras permanentes, filtros de alvo |
| E18 ✅ | S16 (leva 8) | Custos alternativos, lampejo do passado e "a menos que pague" |
| E19 ✅ | S18 (leva 9) | Ninjutsu, insanidade e gatilho de dano de combate |
| E20 ✅ | S19 (leva 10) | Valores dinâmicos: mana, pump e compra que contam o campo |
| E21 ✅ | S20 (leva 11) | Cemitério, mana direta e custos adicionais |
| E22 ✅ | S21 (leva 12) | Planeswalkers: lealdade, uma por turno, dano e morte |
| E23 ✅ | S22 (leva 13) | Entra virado, ciclar, custo de descarte e as cartas que faltavam texto |
| E24 ✅ | S23 (leva 14) | Gatilhos de conjuração e mana de qualquer cor com escolha |
| E25 ✅ | S24 (leva 15) | Faces duplas: disturb e presságio |
| E26 ✅ | S25 (leva 16) | Sorin e Kytheon: transformar no campo |
| E27 ✅ | S26 (leva 17) | Delve, lampejo com custo de virar criaturas e as últimas cartas |
| E28 ✅ | S27 (leva 18) | Pedras de mana, fechamento de parciais e medição por lista |
| E29 ✅ | S28 (leva 19) | Mono Blue Faeries: de 56% para 77% |
| E30 ✅ | S29 (leva 20) | Walls Combo: custo de devolver terreno, transmutar e Fog |
| E31 ✅ | S30 (leva 21) | Boros Bully: prevenção por cor, Flagbearer e revelar |
| E32 🟡 | S31 (leva 22) | Boros Bully fechado: cancelar prevenção, dois alvos, modais |
| E33 ▶ | S32 | Elves e Jund: devoção, gatilho de sacrifício e afinidade |
| E34 | S33 | Commander Killian e Malcolm: reanimação por aura, modais e tutores |
| E35 | deploy | Merge na main e teste no celular |
| E28 | B2–B4 | Bot heurístico, dificuldade e torneio de aferição |

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

**M9 · Habilidades ativadas e disparadas** ✅
- **Valor:** a base de quase toda carta de permanente.
- **Aceite:**
  - o script de uma permanente declara habilidades: ativadas (custo de mana, virar, sacrificar, e a opção "só no tempo de feitiço") e disparadas (entra no campo, morre, manutenção, ataca);
  - a habilidade vira um objeto próprio na pilha, que pode ser respondido e some ao resolver;
  - alvos seguem as mesmas regras das mágicas, inclusive a anulação quando o alvo some;
  - gatilhos entram na pilha antes de qualquer prioridade;
  - biblioteca ganhou 7 permanentes com habilidade.
- **Testes:** U (cada gatilho, cada custo, anulação), S8 (cenário por script), P (fuzz).
- **Depende de:** M4, M10.
- **Fora:** gatilho com alvo, habilidades de mana escritas em script (a leitura do texto já cobre), habilidades em outras zonas.

**M10 · Decisões pendentes genéricas** ✅
- **Valor:** o motor pede escolhas de forma uniforme para humano e bot.
- **Aceite:**
  - `state.pending` cobre descarte, atacantes, bloqueadores e agora a ordem dos gatilhos;
  - com dois ou mais gatilhos do mesmo controlador, ele escolhe qual entra primeiro na pilha;
  - `legalActions` lista as escolhas, e a mesa mostra um botão por gatilho.
- **Testes:** U, P.
- **Depende de:** M4.
- **Fora:** escolha de modo e de divisão de dano.

**M11 · Ações baseadas em estado com escolha** ○
- **Valor:** a regra de lenda e os marcadores se resolvem sozinhos.
- **Aceite:** regra de lenda (escolha via M10), anulação de +1/+1 com −1/−1, planeswalker com 0 de lealdade, aura ilegal.
- **Testes:** U, P.
- **Depende de:** M10.
- **Fora:** —

**M12 · Fichas** ✅
- **Valor:** as listas que ganham a partida com fichas ficam jogáveis.
- **Aceite:**
  - o efeito `token` declara nome, tipos, poder, resistência, palavras-chave e até habilidades da ficha;
  - a ficha é objeto sem carta: entra no campo, entra com enjoo se for criatura e não conta como carta nas invariantes;
  - 704.5d: ao sair do campo, a ficha deixa de existir em vez de ir para o cemitério;
  - fichas com habilidade funcionam (a pista compra ao ser sacrificada);
  - a ficha pode ir para o controlador do alvo (Swan Song, Resculpt);
  - na mesa, a carta aparece marcada como "ficha".
- **Entregue na biblioteca:** Dragon Fodder, Krenko's Command, Battle Screech, Forbidden Friendship, Hard Evidence, Thraben Inspector, Novice Inspector, Swan Song e Resculpt.
- **Testes:** U (criação, sumiço, ficha com habilidade), S8 (cenário por script), P (invariantes).
- **Depende de:** M5, S1.
- **Fora:** cópias de permanentes e fichas que copiam outra carta.

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

**A10 · Cobertura antes da partida** ✅
- **Valor:** saber antes o que o motor resolve sozinho.
- **Aceite:**
  - selo por carta na galeria da lista (✓ completo, ◐ parcial, ✎ manual) com o motivo;
  - resumo na lista: percentual completo, contagem por nível e as cartas que você vai precisar adjudicar;
  - na preparação da partida, a mesma cobertura da lista escolhida.
- **Testes:** I, U.
- **Depende de:** S2.
- **Fora:** —

### S · Scripts de carta (motor completo)

**S1 · Formato de script e validador** ✅
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

**S2 · Nível de cobertura** ✅
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

**S4 · Efeitos base** ✅
- **Biblioteca:** 39 mágicas comuns, incluindo varreduras (dano ou −X/−X em todas as criaturas, ou só nas do oponente).
- **Valor:** mágicas simples resolvidas sem pausa.
- **Aceite:**
  - dano, destruir, exilar, devolver à mão, anular, comprar, ganhar e perder vida, ±X/±X até o fim do turno, virar e desvirar;
  - indestrutível resiste a destruir, e o registro diz isso;
  - efeito até o fim do turno acaba na limpeza;
  - com script, a mesa assistida não pede adjudicação; o registro conta cada efeito.
- **Testes:** U por efeito, cenário de cada script da biblioteca, P (fuzz), G.
- **Depende de:** S1, M12 para fichas.
- **Fora:** criar ficha (depende de M12), vasculhar, escolher modo, custo alternativo.

**S5 · Alvos** ✅
- **Valor:** mágica com alvo ilegal é tratada como a regra manda.
- **Aceite:**
  - alvo escolhido na conjuração; a mesa oferece uma opção por alvo legal;
  - tipos: qualquer alvo, criatura, jogador, oponente, permanente, artefato, encantamento e mágica (inclusive só de criatura e só de não-criatura);
  - proteção (hexproof) bloqueia o oponente, maldição de véu (shroud) bloqueia todos;
  - rechecagem na resolução: sem alvo legal, a mágica é anulada (608.2b).
- **Testes:** U, P.
- **Depende de:** S1.
- **Fora:** múltiplos alvos do mesmo efeito e alvos ilegais parciais com divisão de dano.

**S6 · Cobertura das listas do usuário: Pauper** 🟡
**S7 · Cobertura das listas do usuário: Commander** 🟡
- **Valor:** as listas reais ficam jogáveis, e o percentual mede o avanço.
- **Listas recebidas (22/09):** Commander Malcolm/Kediss (100), Commander Orzhov Killian, e as Pauper Mono Blue Faeries, Rakdos Madness, GW Bogles, Boros Bully, Walls Combo, Jund Wildfire e Elves.
- **Leva 1 entregue:** Terminate, Utter End, Anguished Unmaking, End the Festivities, Fiery Temper, Alms of the Vein, Rally the Peasants, Tormod's Crypt e Ichor Wellspring, além do que já havia (Lightning Bolt, Counterspell, Dispel, Negate, Doom Blade, Disenchant, Electrickery, Pyroclasm e as demais).
- **Correção:** Journey to Nowhere saiu da biblioteca. Estava escrita como mágica de exílio, e na verdade é um encantamento que exila ao entrar e devolve ao sair; entra de novo com S11 e S15.
- **O que trava o resto** (estimativa por leitura das listas, a ser confirmada pelo percentual do app):

| Falta | Histórias | Cartas suas, aprox. | Exemplos |
|---|---|---|---|
| Fichas | M12, S10 | 12 | Battle Screech, Dragon Fodder, Krenko's Command, Swan Song, Thraben Inspector |
| Auras e equipamentos | S11 | 25 | Ancestral Mask, Ethereal Armor, Rancor, Utopia Sprawl, Curiosity, Animate Dead, Skullclamp |
| Escolhas do jogador (descartar, modos) | M10+, S12 | 25 | Faithless Looting, Chart a Course, Abrade, Silverquill Command, Hydroblast |
| Vasculhar o grimório | S13 | 12 | Mystical Tutor, Squadron Hawk, Lead the Stampede, Idyllic Tutor |
| Scry, surveil e olhar o topo | S14 | 10 | Preordain, Opt, Consider, Impulse, Brainstorm, Faerie Seer |
| Gatilhos com alvo e de outras permanentes | S15 | 15 | Zulaport Cutthroat, Cruel Celebrant, Kor Skyfisher, Ninja of the Deep Hours |
| Custos alternativos e adicionais | S16 | 20 | Daze, Foil, Gitaxian Probe, madness, flashback, sobrecarga, ninjutsu |
| Condições e contadores | S17 | 15 | Spell Pierce, Spell Snare, Cast Down, Prismatic Strands, Elvish Vanguard |

- **Ordem escolhida:** fichas primeiro (destrava as listas brancas e vermelhas e é pré-requisito de M12), depois auras (destrava o Bogles inteiro), depois escolhas.
- **Testes:** o cenário declarado de cada script novo (S8).
- **Depende de:** S3–S5, S8, e as histórias da tabela.

**S11 · Auras e equipamentos** ✅
- **Valor:** destravar as listas que dependem de anexar, começando pelo GW Bogles.
- **Aceite:**
  - o script declara `aura` (o que encanta) ou `equip` (com custo), e `grants` com poder, resistência e palavras-chave;
  - a aura escolhe o alvo na conjuração, entra no campo já anexada e é anulada se o alvo sumir antes;
  - bônus dinâmicos por contagem: "por encantamento que você controla" (Ethereal Armor) e "por outro encantamento" (Ancestral Mask);
  - palavras-chave concedidas valem no combate (atropelar, iniciativa, vínculo com a vida, voar, vigilância);
  - equipar é habilidade ativada com custo, no tempo de feitiço, e só em criatura sua;
  - 704.5m: se a criatura sai, a aura vai para o cemitério e o equipamento apenas desanexa;
  - a mesa mostra o que está anexado e o poder/resistência já com os bônus.
- **Entregue na biblioteca:** Rancor, Ethereal Armor, Ancestral Mask, Sentinel's Eyes, Spirit Link, Lifelink, Angelic Gift, Flickering Ward e Skullclamp.
- **Testes:** U (anexar, somar bônus, contagem dinâmica, queda da aura, Skullclamp matando um 1/1), S8 (cenário por script).
- **Depende de:** M9, S5.
- **Fora:** auras que dão mana, prevenção de dano, proteção e P/T dinâmico da própria criatura — ficam na S11b.

**S11b · Mana de aura, prevenção, proteção e evasão** ✅
- **Valor:** fechar o GW Bogles e abrir caminho para as outras listas com aura.
- **Aceite:**
  - aura pode conceder mana à permanente encantada: cor extra escolhida ao entrar (Utopia Sprawl) ou uma opção nova de qualquer cor (Abundant Growth);
  - escolha de cor ao entrar é decisão pendente (M10), com uma opção por cor;
  - prevenção: a criatura encantada não recebe dano nenhum (Armadillo Cloak), nem de mágica nem de combate;
  - proteção de cor: não pode ser alvo, não recebe dano e não é bloqueada por criaturas daquela cor (Benevolent Blessing);
  - evasão estática: "só é bloqueada por criaturas com voar" (Silhana Ledgewalker) e "criaturas com poder menor não podem bloquear" (Aura Gnarlid);
  - bônus próprio dinâmico: +1/+1 por aura no campo (Aura Gnarlid).
- **Testes:** U, S8 (cenário por script).
- **Depende de:** S11.
- **Fora:** ganhar vida junto com a prevenção (Armadillo Cloak completo), fuga, vasculhar o grimório.

**S8 · Cenário declarado em cada script** ✅
- **Valor:** todo script nasce testado.
- **Aceite:**
  - o script traz um `example` com o alvo a usar e o que esperar (vida, carta que sai do campo, devolvida, anulada, virada, pump, cartas compradas);
  - o validador recusa script sem cenário, com alvo de cenário desconhecido ou sem nada a verificar;
  - o teste monta a mesa, confere que a mesa ofereceu aquela conjuração, resolve e checa o resultado, script por script;
  - o cenário não entra no estado da partida.
- **Testes:** U (a biblioteca inteira).
- **Depende de:** S1.
- **Fora:** cenários com mais de um alvo.

**S9 · Modo motor completo jogável** ✅
- **Valor:** partida sem pausa nenhuma.
- **Aceite:**
  - a preparação mostra os dois modos; motor completo só libera com a lista 100% coberta, e diz isso quando não libera;
  - no motor completo a mana é sempre cobrada e o controle manual (mover, virar, marcadores, vida, comprar, conjurar sem pagar) não aparece;
  - a mesa assistida segue igual.
- **Testes:** I (liberação pela cobertura e ausência dos controles manuais), U (o motor recusa adjudicação no modo completo).
- **Depende de:** S2, A2.
- **Fora:** bot adversário (B2).

**S28 · Faeries: condição de nome, contagem por subtipo e alvo do oponente** ✅
- **Fonte:** textos conferidos na Scryfall em 22/09/2026.
- **Aceite:** condição "se você controla outra permanente com este nome"; valores e limites contados
  por subtipo (Spellstutter Sprite conta as Faeries); alvos restritos a permanentes do oponente.
- **Entregue:** Faerie Seer, Faerie Miscreant, Spellstutter Sprite, Brinebarrow Intruder, Harrier Strix, Of One Mind.
- **Correções de regra achadas pelo fuzz:** habilidade na pilha não pode ser alvo de anulação, e ao sair
  da pilha ela deixa de existir em vez de virar carta no cemitério.
- **Resultado:** Mono Blue Faeries de 56% para 77%.

**S31 · Cancelar prevenção, alvos distintos e contagem multiplicada** 🟡
- **Fonte:** textos conferidos em 26/09/2026.
- **Aceite:**
  - efeito que cancela toda prevenção de dano no turno, valendo para Fog, prevenção por cor e
    prevenção de aura (615.7);
  - 601.2c: dois alvos da mesma mágica ou habilidade precisam ser diferentes — a mesa não oferece
    a repetição e o motor recusa se ela for enviada;
  - contagem com multiplicador ("o dobro do número de criaturas que você controla");
  - exilar mira artefato.
- **Entregue:** Flaring Pain, Dust to Dust e Thraben Charm (parcial: o terceiro modo atinge um jogador por vez).
- **Correção de regra:** a mesa oferecia o mesmo alvo duas vezes numa mágica de dois alvos, e o motor aceitava.
- **Testes:** U (prevenção cancelada, alvos distintos na oferta e na validação, dano multiplicado), S8.
- **Depende de:** S30.
- **Não lida:** Raffine's Informant — a fonte recusou por excesso de consultas. Fica para a próxima leva.

**S30 · Prevenção por cor, Flagbearer e custo de revelar** 🟡
- **Fonte:** textos conferidos em 26/09/2026 (mtg.wtf, base oficial de oracle).
- **Aceite:**
  - a mágica pode pedir uma cor ao **resolver**, e o resto do efeito espera essa escolha;
  - prevenção por cor: nenhum dano de fonte daquela cor acontece no turno, valendo para mágica,
    habilidade e combate; o escudo some na limpeza;
  - regra estática de Flagbearer: quando o oponente escolhe alvos, a mesa só oferece o Flagbearer
    enquanto ele for alvo legal, e recusa outro alvo;
  - custo de revelar cartas de uma cor, sem perder a carta, com o valor revelado alimentando o efeito.
- **Entregue:** Prismatic Strands (com lampejo pago virando uma criatura branca), Standard Bearer e Martyr of Sands.
- **Testes:** U (prevenção em mágica e combate, expiração no turno, Flagbearer obrigando e liberando o dono,
  vida por cartas reveladas), S8.
- **Depende de:** S11b, S16, S29.
- **Não lidas nesta rodada:** Flaring Pain, Hallow, Dust to Dust, Thraben Charm e Raffine's Informant —
  a fonte limitou o acesso por excesso de consultas. Ficam para a próxima leva, sem palpite.

**S29 · Walls: custo de devolver terreno, transmutar e Fog** 🟡
- **Fonte:** textos conferidos na Scryfall em 26/09/2026.
- **Aceite:**
  - custo de habilidade que devolve um terreno de um tipo à mão, e habilidade limitada a uma vez por turno;
  - busca filtrada por palavra-chave (criatura com defensor);
  - transmutar: descarta a carta no tempo de feitiço e busca outra de mesmo valor de mana;
  - efeito Fog: previne todo o dano de combate do turno, e o efeito zera na limpeza;
  - varredura que atinge só criaturas com voar (Scattershot Archer).
- **Entregue:** Quirion Ranger, Shield-Wall Sentinel, Drift of Phantasms, Moment's Peace,
  Orochi Leafcaller, Saruli Caretaker e Scattershot Archer.
- **Correção de usabilidade:** a mesa cortava a lista de alvos em 6, escondendo alvos legais em campos
  grandes. O limite subiu para 10 alvos e 16 combinações.
- **Testes:** U (custo de terreno, uma vez por turno, filtro por palavra-chave, transmutar, Fog), S8.
- **Depende de:** S13, S20.
- **Fora:** converter mana de uma cor em outra (Orochi real), escolher entre {G} e {W} no Saruli.

**S27 · Fechamento das listas e medição** 🟡
- **Entregue:** pedras de mana e utilidades das listas de Commander (Izzet Signet, Orzhov Signet, Arcane Signet, os dois Talismãs, Fellwar Stone, Lotus Petal, Chromatic Sphere, Chromatic Star, Soul-Guide Lantern, Nihil Spellbomb), custo de vida em habilidade, e o fechamento de Unearth e das fichas de Blood.
- **Medição em 22/09/2026**, contando como resolvido o que o motor lê do texto da carta (baunilha, só palavras-chave, terrenos simples e mana):

| Lista | Cartas | Resolvido | Parcial | Manual |
|---|---|---|---|---|
| Commander Malcolm/Kediss | 100 | 57% | 13 | 30 |
| Commander Orzhov Killian | 102 | 43% | 9 | 49 |
| Pauper Mono Blue Faeries | 75 | 56% | 4 | 29 |
| Pauper Rakdos Madness | 75 | 72% | 10 | 11 |
| Pauper GW Bogles | 75 | 67% | 14 | 11 |
| Pauper Boros Bully | 75 | 57% | 11 | 21 |
| Pauper Walls Combo | 75 | 47% | 7 | 33 |
| Pauper Jund Wildfire | 75 | 60% | 12 | 18 |
| Pauper Elves | 75 | 67% | 10 | 15 |

- **O número exato sai no app**, que lê o texto de cada carta pela Scryfall; esta tabela é a estimativa feita aqui.
- **O que ainda impede o motor completo:** gatilhos de condição de estado (Spellstutter Sprite, Faerie Miscreant), prevenção por cor (Prismatic Strands, Hallow), devoção (Nylea's Disciple), desvirar terreno (Quirion Ranger), transmutar (Drift of Phantasms), afinidade, tempestade e plot.
- **Depende de:** S1 a S26.

**S26 · Delve, lampejo com custo de virar criaturas e as últimas cartas** 🟡
- **Fonte:** textos conferidos na Scryfall em 22/09/2026.
- **Aceite:**
  - custo alternativo pode exilar cartas do cemitério (delve), virar outras criaturas ou sacrificar permanentes;
  - lampejo do passado aceita custo que não seja mana, como virar três criaturas (Battle Screech);
  - efeito de voltar embaralhado para o grimório (Lembas).
- **Entregue na biblioteca:** Treasure Cruise, Dig Through Time, Battle Screech, Eviscerator's Insight, Lembas e Refurbished Familiar.
- **Ficam manuais, por dependerem de mecânicas fora do plano atual:** Gixian Infiltrator (gatilho de sacrifício), Evolution Witness (adaptar e gatilho de marcadores), Sneaky Snacker (gatilho de terceira compra) e Leonardo, Big Brother (texto não localizado com segurança).
- **Testes:** U (delve exilando o cemitério, lampejo virando três criaturas), S8 (cenário por script).
- **Depende de:** S16, S20.
- **Fora:** delve parcial (escolher quantas exilar), afinidade, tempestade e plot.

**S25 · Transformar no campo** 🟡
- **Valor:** Sorin e Kytheon, as duas cartas que viram planeswalker no meio da partida.
- **Fonte:** textos e lealdades conferidos na Scryfall em 22/09/2026 (ambos entram com 3).
- **Aceite:**
  - gatilhos de fase pós-combate e de fim de combate;
  - condições de gatilho: "se você ganhou 3 ou mais vidas neste turno" e "se três criaturas atacaram, incluindo esta";
  - efeito de transformar: a permanente troca de face no campo e, virando planeswalker, entra com a lealdade da face de trás;
  - a vida ganha no turno é contada (inclusive por vínculo com a vida) e zera na limpeza;
  - palavra-chave concedida até o fim do turno, como o indestrutível do Kytheon.
- **Entregue na biblioteca:** Sorin of House Markov // Sorin, Ravenous Neonate e Kytheon, Hero of Akros // Gideon, Battle-Forged, ambos parciais (falta o −6 do Sorin, e o +2 e o 0 do Gideon).
- **Testes:** U (condição de vida, condição de atacantes, lealdade ao transformar, dano pela vida ganha), S8 (cenário por script).
- **Depende de:** S21, S24.
- **Fora:** extorsão, virar planeswalker em criatura 4/4, roubo de criatura.

**S24 · Faces duplas** 🟡
- **Valor:** as cartas de duas faces das listas entram na mesa.
- **Fonte:** textos conferidos na Scryfall em 22/09/2026.
- **Aceite:**
  - a face de trás vira um conjunto de dados próprio, com tipos, poder, resistência, palavras-chave e efeitos;
  - disturb: conjura do cemitério já transformada, e a permanente entra pela face de trás;
  - presságio (omen): conjura a face de trás da mão como feitiço, e a carta volta embaralhada para o grimório ao resolver;
  - fora do campo e da pilha, a carta sempre volta para a face da frente;
  - conjurada normalmente, usa a face da frente, com os gatilhos dela.
- **Entregue na biblioteca:** Lunarch Veteran // Luminous Phantom e Sagu Wildling // Roost Seek.
- **Testes:** U (disturb, presságio, volta à frente, conjuração normal), S8 (cenário por script).
- **Depende de:** S1, S13.
- **Fora:** transformar no campo por gatilho ou custo (Sorin e Kytheon), e as cartas modais de duas faces com terreno atrás.

**S23 · Gatilhos de conjuração e mana de qualquer cor** 🟡
- **Valor:** Elves, Walls e Saheeli passam a funcionar como na carta.
- **Aceite:**
  - gatilho "quando você conjura esta mágica" e "sempre que você conjura uma mágica", com filtro por tipo, subtipo e "que não é criatura";
  - mana de qualquer cor com escolha: a mesa oferece uma opção por cor;
  - custo de virar mais de uma outra criatura.
- **Entregue na biblioteca:** Kitchen Imp, Writhing Chrysalis, Springleaf Drum, Jaspera Sentinel, Birchlore Rangers, Lys Alana Huntmaster, e a Saheeli deixou de ser parcial.
- **Testes:** U (filtro do gatilho, uma opção por cor, custo de virar outra), S8 (cenário por script).
- **Depende de:** M9, M7.
- **Fora:** gatilhos de compra de carta e de sacrifício de outra permanente.

**S22 · Entra virado, ciclar, custo de descarte e as cartas que faltavam** 🟡
- **Valor:** fechar as cartas que estavam paradas por falta do texto oficial.
- **Fonte:** textos conferidos na Scryfall em 22/09/2026.
- **Aceite:**
  - permanente que entra virada;
  - ciclar: paga o custo, descarta a carta e compra outra (e respeita insanidade);
  - custo adicional de descarte na conjuração;
  - busca que põe a carta no campo virada.
- **Entregue na biblioteca:** Malevolent Rumble, Sheltering Landscape, Setessan Training, Vampire's Kiss, Voldaren Epicure, Grab the Prize, Highway Robbery e Bojuka Bog (que deixou de ser parcial).
- **Parciais registradas:** o dano condicional do Grab the Prize, a opção de sacrificar terreno e o plot do Highway Robbery, e o custo de descarte das fichas de Blood.
- **Testes:** U (entra virado, busca para o campo virado, ciclar cobrando o custo), S8 (cenário por script).
- **Depende de:** S12, S13.
- **Fora:** plot, gift e as fichas de Blood completas.

**S21 · Planeswalkers** 🟡
- **Valor:** as planeswalkers das listas de Commander entram na mesa.
- **Aceite:**
  - a planeswalker entra com a lealdade impressa como marcadores;
  - habilidades de lealdade são ativadas de tempo de feitiço, uma por planeswalker por turno, e só quando a lealdade cobre o custo;
  - +N sobe e −N desce os marcadores;
  - dano numa planeswalker tira lealdade, e com lealdade zero ela vai para o cemitério;
  - "qualquer alvo" passa a incluir planeswalkers;
  - na mesa, a carta mostra a lealdade e cada habilidade vira um botão com o rótulo da carta.
- **Entregue na biblioteca:** Saheeli, Sublime Artificer (parcial: a habilidade estática ainda não entra).
- **Testes:** U (lealdade inicial, uma por turno, custo insuficiente, tempo de feitiço, morte por dano), S8 (cenário por script).
- **Depende de:** M9, S4.
- **Fora:** atacar planeswalker, habilidades estáticas de planeswalker, emblemas e ultimates que mudam a partida inteira.

**S20 · Cemitério, mana direta e custos adicionais** 🟡
- **Valor:** recursão do Killian e do Jund, e os aceleradores do Walls.
- **Aceite:**
  - alvos no seu cemitério, com limite de valor de mana;
  - efeitos de devolver para a mão e de reanimar (volta ao campo com enjoo);
  - efeito de pôr mana direto na reserva, e habilidade de mana resolve sem usar a pilha (605.1a);
  - custos adicionais de sacrificar outra permanente ou virar outra criatura, tanto em habilidade quanto na conjuração;
  - a mesa só oferece a ação quando há o que sacrificar ou virar, e sugere qual.
- **Entregue na biblioteca:** Unearth, Sevinne's Reclamation, Pulse of Murasa, Tinder Wall, Fanatical Offering e Krark-Clan Shaman.
- **Testes:** U (limite de valor de mana, reanimar com enjoo, custo sugerido e cobrado, mana sem pilha), S8 (cenário por script).
- **Depende de:** S4, M9.
- **Fora:** reanimar com aura (Animate Dead), devolver do cemitério do oponente, ciclar.

**S19 · Valores dinâmicos** 🟡
- **Valor:** Elves e Walls Combo dependem quase todos de contar o campo.
- **Aceite:**
  - qualquer valor de efeito (dano, compra, vida, pump) pode ser uma contagem: criaturas suas, Elfos, criaturas com defensor, permanentes suas, encantamentos;
  - produção de mana declarada no script, com contagem e opção de qualquer cor (Priest of Titania, Overgrown Battlement, Axebane Guardian);
  - quando o script declara a produção, ela substitui o que foi lido do texto da carta;
  - o cálculo é feito na hora de usar, então o campo mudando muda o resultado.
- **Entregue na biblioteca:** Priest of Titania, Overgrown Battlement, Axebane Guardian, Timberwatch Elf, Distant Melody, Valakut Invoker e Bloodrite Invoker.
- **Testes:** U (mana que cresce, pump por Elfos, compra por criaturas), S8 (cenário por script).
- **Depende de:** M7, S4.
- **Fora:** devoção, contar cartas no cemitério e contagens do oponente.

**S18 · Ninjutsu, insanidade e dano de combate** 🟡
- **Valor:** o coração do Mono Blue Faeries e do Rakdos Madness.
- **Aceite:**
  - ninjutsu: depois dos bloqueadores, devolve um atacante seu sem bloqueio para a mão e o ninja entra virado e atacando, pagando o custo de ninjutsu;
  - só vale no passo de bloqueio e só com atacante não bloqueado;
  - gatilho de dano de combate ao jogador (o ninja compra quando conecta);
  - insanidade: a carta descartada vai para o exílio e o dono escolhe conjurar pelo custo de insanidade ou deixar no cemitério;
  - a insanidade devolve a pendência que interrompeu, inclusive o descarte da limpeza.
- **Entregue na biblioteca:** Ninja of the Deep Hours, Moon-Circuit Hacker, Fiery Temper e Alms of the Vein (estas duas deixaram de ser parciais).
- **Testes:** U (troca do atacante, bloqueio impede, gatilho de dano, insanidade aceitando e recusando, insanidade dentro da limpeza), S8 (cenário por script).
- **Depende de:** M6, S12, S16.
- **Fora:** ninjutsu de cartas que entram de outras zonas, insanidade com descarte causado pelo oponente.

**S16 · Custos alternativos, lampejo do passado e "a menos que pague"** 🟡
- **Valor:** os counters livres do Faeries e do Malcolm, e o reaproveitamento do cemitério.
- **Aceite:**
  - custo alternativo declarado no script, com mana, vida, descarte ou devolver um terreno; a mesa sugere o pagamento e mostra o rótulo no botão;
  - lampejo do passado: a carta pode ser conjurada do cemitério pelo custo do lampejo e é exilada ao resolver;
  - "anular a menos que pague": quem controla a mágica decide, com botão de pagar ou deixar anular, e o resto da mágica espera essa decisão.
- **Entregue na biblioteca:** Daze, Spell Pierce, Miscast, Lose Focus, Flusterstorm, Foil, e o lampejo do passado em Faithless Looting e Rally the Peasants.
- **Testes:** U (custo devolvendo Ilha, pagar e não pagar, lampejo exilando), S8 (cenário por script).
- **Depende de:** M7, S12.
- **Fora:** insanidade (madness), ninjutsu, tempestade, replicar e delve.

**S15/S17 · Gatilhos com alvo, gatilhos de outras permanentes e filtros de alvo** 🟡
- **Valor:** destravar os drenos, os "quando entra devolva", os tutores condicionais e os counters de condição.
- **Aceite:**
  - gatilho pode ter alvo: sem alvo legal ele nem vai para a pilha, com um alvo vai direto, com vários a mesa pergunta;
  - gatilhos de outras permanentes suas, ao entrar e ao morrer, com filtro por tipo e subtipo;
  - alvo "cada oponente" para perder vida, e efeito de marcadores +1/+1;
  - filtros de alvo: não lendária (Cast Down), valor de mana exato (Spell Snare) e mágica de artefato ou encantamento (Annul).
- **Entregue na biblioteca:** Zulaport Cutthroat, Cruel Celebrant, Corpse Knight, Elvish Vanguard, Kor Skyfisher, Bojuka Bog, Cast Down, Spell Snare e Annul.
- **Testes:** U (dreno só com criatura sua, escolha de alvo do gatilho, filtros), S8 (cenário por script).
- **Depende de:** M9, M10, S5.
- **Fora:** "anular a menos que pague", gatilho de dano em combate, gatilhos de zona que não seja o campo.

**S13/S14 · Zonas ocultas: vasculhar, moer, scry e olhar o topo** 🟡
- **Valor:** o maior bloco que faltava nas listas: tutores, cavadores e manipulação de topo.
- **Aceite:**
  - decisão pendente genérica de escolha de cartas: a lista revelada aparece só para quem escolhe, com mínimo, máximo, filtro por tipo ou nome, destino do escolhido e destino do resto;
  - `search` (com embaralhar), `look`, `scry`, `surveil`, `mill` e `put_back`;
  - o que vem depois da escolha na mesma mágica só acontece quando a escolha termina (Preordain faz o scry antes de comprar);
  - desfazer não atravessa uma escolha, porque ela revela informação oculta;
  - na mesa, a faixa de baixo passa a mostrar as cartas reveladas, e o hot-seat esconde do outro jogador.
- **Entregue na biblioteca:** Preordain, Opt, Consider, Sleight of Hand, Impulse, Brainstorm, Lead the Stampede, Winding Way, Mystical Tutor, Solve the Equation, Idyllic Tutor, Squadron Hawk e Stream of Thought.
- **Testes:** U (scry com compra depois, filtro do tutor, olhar o topo com resto no cemitério, moer), S8 (cenário por script), I (scry na mesa).
- **Depende de:** M10, S1.
- **Fora:** revelar a mão do oponente, escolher carta do grimório alheio, embaralhar cemitério.

**S12 · Escolhas do jogador** ✅
- **Valor:** destravar descarte, mágicas modais e as blasts dos sideboards.
- **Aceite:**
  - efeito `discard`: o motor abre decisão pendente e o jogador escolhe as cartas; descarte de efeito não mexe na limpeza do turno;
  - mágica modal: o script declara modos com rótulo, a mesa oferece um botão por modo e o modo escolhido fica guardado na pilha;
  - alvo condicionado por cor: Hydroblast, Pyroblast, Red e Blue Elemental Blast só miram o que for da cor certa;
  - o registro conta o descarte e o modo escolhido.
- **Entregue na biblioteca:** Faithless Looting, Frantic Search, Chart a Course, Abrade, Hydroblast, Pyroblast, Red Elemental Blast e Blue Elemental Blast.
- **Testes:** U (modo, cor do alvo, descarte pendente), S8 (cenário por script).
- **Depende de:** S1, M10.
- **Fora:** "escolha dois", descartar carta do oponente com escolha (Duress) e "você pode pagar".

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
