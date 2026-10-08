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
| Q · Qualidade | Q9 homologação das levas 66–80 (H1–H15) · Q10 homologação das levas 81–87 + auditoria offline · Q11 regras Pauper contra o texto oficial | ✅ |
| U · Patamar de produto | U1 tema em dois estados · U5 cartas iguais em leque · U6 mão recolhível · U7 turno visível · U12 imagens do jogo sozinhas · U10 Shark | ✅ |
| M · Motor | M6 combate · M7 mana · M14 companheiro na partida | ✅ |
| A · Mesa | A6 combate na mesa | ✅ |
| A · Mesa | A12 listas prontas e escolha do modo de jogo | ✅ |
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
| S · Scripts | S31 cancelar prevenção, alvos distintos e contagem multiplicada | ✅ |
| S · Scripts | S32 devoção, sacrifício e exílio do cemitério como custo | ✅ |
| S · Scripts | S33 afinidade, adaptar, marcadores e terceira compra | ✅ |
| S · Scripts | S34 tempestade, conceder e metamorfo | ✅ |
| S · Scripts | S35 varredura das Pauper: gatilho da encantada e alvos de artefato | ✅ |
| S · Scripts | S36 proteção de várias cores e prevenção do dano de uma mágica | 🟡 |
| S · Scripts | S37 exilar cemitérios, descarte escolhido, habilidade da mão e barganha | 🟡 |
| S · Scripts | S38 alvo por cor, varredura que poupa subtipo e "até dois alvos" | 🟡 |
| S · Scripts | S39 habilidade ativada concedida por aura e por vínculo de alma | 🟡 |
| S · Scripts | S40 conluio e força por outras criaturas suas | 🟡 |
| S · Scripts | S41 colher provas, vigilância e canalizar | 🟡 |
| S · Scripts | S42 vários efeitos no mesmo alvo, devolver mágica e fichas Tesouro | 🟡 |
| S · Scripts | S43 proteção pela cor escolhida e indestrutível por sacrifício | 🟡 |
| S · Scripts | S44 carta que volta para a mão, busca de básico e rótulos errados | 🟡 |
| S · Scripts | S45 você escolhe: descarte do oponente e carta do cemitério | 🟡 |
| S · Scripts | S46 busca do oponente, sacrifício por subtipo e lampejo com cor | 🟡 |
| S · Scripts | S47 custo opcional no gatilho, condição do custo pago e mágica sem alvo | 🟡 |
| S · Scripts | S48 vida pelo dano causado, fuga e devolver o que foi exilado | 🟡 |
| S · Scripts | S49 gatilho opcional, "a menos que tenha entrado agora" e desconto por condição | 🟡 |
| S · Scripts | S50 escolher o tipo de criatura, custo X e custo por subtipo | 🟡 |
| S · Scripts | S51 cemitério de qualquer um, mana convertido e par escolhido | 🟡 |
| S · Scripts | S52 vida pelo dano prevenido de fato e a face de trás que exila | 🟡 |
| S · Scripts | S53 plot e custo adicional com opções | 🟡 |
| S · Scripts | S54 metamorfose e esgueirar-se | 🟡 |
| S · Scripts | S55 colher provas escolhida por você e tipo de criatura do campo | ✅ |
| B · Bot | B2 avaliador de posição e arcabouço de decisão | 🟡 |
| B · Bot | B3 amador experiente e B4 profissional, jogáveis na mesa | 🟡 |
| B · Bot | B5 escolha na mesa e B6 torneio medido no portão | 🟡 |
| B · Bot | B7 didática do bot: resumo do turno e "o que eu poderia fazer" | 🟡 |
| A · Mesa | A13 campo que se lê de relance: P/T, anéis de estado, pilhas de terreno | 🟡 |
| A · Mesa | A14 pilha explicada, recusa com motivo, registro em linha do tempo | 🟡 |
| A · Mesa | A15 segurar para ler a carta com texto, estado e ações | 🟡 |
| A · Mesa | A16 prévia de combate que bate com o motor e resumo dos turnos | 🟡 |
| X · Scanner | X7 captura automática sem moldura | 🟡 |
| X · Scanner | X8 pilha de leitura na tela | 🟡 |
| X · Scanner | X9 validação ágil: confira com um toque | 🟡 |
| X · Scanner | X10 acerto medido no portão (fotos sintéticas; reais pendentes) | 🟡 |
| X · Scanner | X11 leitura por contorno: quatro cantos, carta retificada, linha do nome (leva 116) | 🟡 |
| X · Scanner | X12 reconhecimento pela arte (impressão digital da imagem) | ○ |
| X · Scanner | X13 câmera no máximo e cronômetro de leitura (leva 120) | 🟡 |
| X · Scanner | X14 resposta imediata (leva 127) | 🟡 |
| X · Scanner | X15 melhor quadro e edição em resolução cheia | ▶ |
| X · Scanner | X16 tela nova do scanner · X17 pilha e conferência visuais · X18 sessão de catalogação | ○ |
| C · Coleção | C10 exportar por lista (três formatos, seleção manual) | 🟡 |
| C · Coleção | C11 importar por lista com conferência, pendências e desfazer | 🟡 |
| O · Offline | O1 o que é seu fica no aparelho: guardião, painel e portão offline | 🟡 |
| O · Offline | O2 telas sem rede: ambiente vivo, chip, fallbacks, base local alimentada por tudo | 🟡 |
| O · Offline | O3 conduta offline para o que vem, espaço e proteção no painel | 🟡 |
| C · Coleção | C12 filtros de verdade: motor, painel, recorte exportável, link, visões salvas, listas | 🟡 |
| C · Coleção | C13 galeria, densa e pilhas; agrupar, ordenar e lembrar | 🟡 |
| C · Coleção | C14 painel: números, barras que filtram, curva, o que falta para montar | 🟡 |
| S · Scripts | S66 partida guiada dos Elfos, ficha de Elfo e gatilho opcional de outra permanente | ✅ |
| S · Scripts | S65 matriz de palavras-chave e combate | ✅ |
| A · Mesa | S64 lista guardada no aparelho para jogar sem internet | ✅ |
| S · Scripts | S63 auditoria dos gatilhos + mão inicial não conta como compra do turno | ✅ |
| S · Scripts | S62 enjoo só prende o {T} da própria carta + auditoria das listas Pauper | ✅ |
| S · Scripts | S61 Mago Louco: jogar do exílio, conjurar sem pagar — Pauper em 100% | ✅ |
| S · Scripts | S60 Tumba da Aniquilação: perder ou pagar, e sacrificar escolhendo | 🟡 |
| S · Scripts | S59 Cidade Baixa: provocar e o Trono dos Três Mortos | 🟡 |
| S · Scripts | S58 terreno básico embutido e cobertura pelo nome da lista | ✅ |
| S · Scripts | S57 masmorra: aventurar-se, escolher a sala e completar | 🟡 |
| S · Scripts | S56 terrenos das listas, medição honesta e gatilho com modos | 🟡 |
| A · Mesa | A13 o goldfish resolve a escolha em vez de desistir | ✅ |
| U · Patamar de produto | U7b faixa de turno em duas palavras com balão de detalhes (leva 121) | 🟡 |
| R · Revisão carta a carta | R0 sonda de alcance e registro por carta · Highway Robbery revisada (leva 121) | 🟡 |
| R · Revisão carta a carta | R1 Axebane Guardian: mana em qualquer combinação de cores — **as sete listas Pauper em 100%** (leva 122) | 🟡 |
| R · Revisão carta a carta | R2 Rakdos Madness carta a carta: 21 cartas revisadas, pagamento sem toque à toa, decisões legíveis (leva 125, **motor v65**) | 🟡 |
| R · Revisão carta a carta | R3 Mono Blue Faeries carta a carta: 17 cartas revisadas, alvo sem ambiguidade e pelo toque na carta, Sewer-veillance Cam pela regra (leva 131, **motor v66**) | 🟡 |
| R · Revisão carta a carta | R4 Elves carta a carta: 23 cartas revisadas, colher provas alcançável, Winding Way sem pergunta, pagar custo tocando nas cartas, Elves 100% sem rede (leva 136, **motor v67**) | 🟡 |
| R · Revisão carta a carta | R5 GW Bogles carta a carta: 23 cartas revisadas, gatilhos simultâneos corrigidos, Aura ao lado de quem a carrega (leva 139, **motor v68**) | 🟡 |
| R · Revisão carta a carta | R6 Boros Bully carta a carta: 23 cartas revisadas, gatilhos iguais sem pergunta, lampejo com custo por extenso; contadores de zona não se sobrepõem com fonte larga (leva 144, **motor v69**) | 🟡 |
| R · Revisão carta a carta | R7 Jund Wildfire carta a carta: 23 cartas revisadas, custos de sacrifício por extenso, as sete listas Pauper 100% sem rede (leva 148, motor v69 sem mudança) | 🟡 |
| R · Revisão carta a carta | R8 Walls Combo carta a carta: 24 cartas revisadas, Freed from the Real utilizável pela tela; **as sete listas Pauper revisadas carta a carta** (leva 165, motor v69 sem mudança) | 🟡 |
| R · Revisão carta a carta | R9 homologação independente das sete listas Pauper: sete revisores sem acesso às levas R1–R8, 10 divergências de regra corrigidas com teste (leva 178, motor v70) | 🟡 |
| R · Revisão carta a carta | Proteção contra a cor à escolha pela tela (relato do aparelho): Mother of Runes, Benevolent Bodyguard e Alseid protegem a criatura tocada, com a cor tocada (leva 179, motor v70 sem mudança) | 🟡 |
| R · Revisão carta a carta | R9b tela da homologação: registro não diz mais "anulou"/"indestrutível" sem ter feito, pilha explicada com a linha do gatilho, sobrecarga e perturbar com o rótulo certo, ward como salvaguarda, 35 frases do dicionário de efeitos em português (leva 181, motor v70 sem mudança) | 🟡 |
| R · Revisão carta a carta | R10 plano do lote Commander: texto oficial das 158 cartas que faltavam, triagem das 164 em baldes (54 prontas · 24 A · 70 B · 16 C) e matriz primitiva × cartas (leva 184, sem mudança de motor) | ✅ |
| R · Revisão carta a carta | R11.1 auditoria frase a frase das 59 cartas de Commander que o motor dava como prontas ou quase: 9 corrigidas, 3 terrenos rebaixados a parciais, 1 devolvida a manual (leva 189, motor v71) | 🟡 |
| R · Revisão carta a carta | R11.2a terrenos e pedras de mana do Commander: 19 cartas completas (dano ao gerar cor, cor condicional, entra virado a menos que, sacrifício por mana); Killian 36% → 48%, Malcolm 50% → 57% (leva 191, motor v72) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR0 mapa regra × motor: os 1.174 itens numerados das regras de 25/09/2026 classificados contra o motor v72 com evidência — 204 cobertos, 211 parciais, 475 ausentes, 108 só definição, 176 fora de escopo; 23% do aplicável (leva 194) | ✅ |
| CR · Conformidade com as Comprehensive Rules | CR1a 14 bugs da auditoria corrigidos com teste de conformidade: custos de vida, mana phyrexiana, carta sem custo, X no valor de mana, dano 0, busca e topo do grimório, 2/2 virada para baixo, marcadores que se anulam, Aura solta, fim de combate, limpeza, conceder, Veículo comandante (leva 196, motor v73) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR1b resto dos bugs da auditoria que não pedem estrutura: fração de segundo, proteção impressa contra cor, medo, intimidar, sombra, esgueirar e travessias, gatilho modal sem modo ilegal, condição em gatilho de outra permanente, gerar mana durante um pagamento pedido por efeito (motor v74) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2a.1 ações de estado: regra das lendas com escolha do jogador, nada de checagem no meio da resolução, Equipamento em não-criatura se solta (motor v75) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2a.2 objeto novo ao mudar de zona: o alvo não segue a carta que saiu e voltou (400.7, motor v76) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | Decisões do dono registradas (06/10/2026), texto das regras no repositório e numeração de leva por trilha (Q13, leva M-206) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2a.3 mortes simultâneas se enxergam e a permanente que sai deixa a última informação conhecida (603.10a, 704.8; leva M-208, motor v77) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2a.4 resolução parada numa escolha sem checagem no meio (704.4 coberta), "cada jogador sacrifica" em lote e efeito que lê a criatura sacrificada; Accursed Marauder e Ayli completas (leva M-209, motor v78) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2b.1 gatilho atrasado "no início da manutenção do próximo turno" (603.7); Arcane Denial e Mishra's Bauble completas; "cada jogador" de sala de masmorra sem criatura na mesa (leva M-210, motor v79) | 🟡 |
| Q · Qualidade e publicação | Q14 portão em duas fases, segunda chance para teste de tela instável e publicar que interrompe quando o main anda (leva M-212) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2b.2 gatilho atrasado no passo final e no fim do combate, preso a um objeto (603.7c), e gatilho reflexivo (603.12 coberta); leva M-213, motor v80 | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2b.3 gatilhos novos: recebe dano, a permanente anexada morre ou é exilada, criatura de oponente entra, criatura posta no seu cemitério; "that card" lembrada; cinco cartas do Commander completas (leva M-214, motor v81) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2b.4 gatilho com vários alvos (603.3d), "sempre que você descartar", "a criatura encantada causa dano a um oponente" e "ative só atacando"; Curiosity e Glint-Horn Buccaneer completas (leva M-215, motor v82) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2b.5 manutenção cumulativa (702.24), "a menos que aquele jogador pague", "sempre que um oponente conjurar" e gatilhos de passo (passo final, cada manutenção, início do combate); Mystic Remora completa (leva M-216, motor v83) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2d.2 terreno que vira criatura até o fim do turno (613, 205.1b) com enjoo pelo ruling (302.6); Mishra's Factory e Blinkmoth Nexus completas (leva M-224, motor v91) | 🟡 |
| CR · Conformidade com as Comprehensive Rules | CR2c.2 "destruir todas" por filtro em lote e devolver do cemitério por valor de mana, que fecham Austere Command, Silverquill Command e Profane Command | ▶ |
| CR · Conformidade com as Comprehensive Rules | CR2 alicerces do motor · CR3 ações · CR4 habilidades · CR5 tipos de carta · CR6 multijogador · CR7 consolidação | ○ |
| R · Revisão carta a carta | R11.2b em diante — **pausado em 06/10/2026**: o trabalho passa a ser guiado pelo épico CR; as cartas de Commander voltam quando as estruturas que elas pedem entrarem · R11–R13 Commander (Killian e Malcolm) · R14 mapa das regras não contempladas | ○ |
| Q · Qualidade | Q12 publicação aditiva entre trilhas: guarda de agregação, `npm run publicar`, pre-push e CI (leva 124) | ✅ |

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

**Conduta padrão de entrega (definida pelo usuário em 27/09/2026).** Toda leva sai com uma camada de
testes rigorosa e completa, para minimizar a chance e a quantidade de bugs — sem depender de o usuário
pedir. Na prática, em cada leva: cada regra nova nasce com teste que falharia sem ela; cada bug vira teste
antes da correção; o caminho que o usuário vai tocar no aparelho tem teste headless; e o que ficou sem
cobertura é declarado na entrega, não omitido.

**Conduta de design (definida pelo usuário em 29/09/2026, "a partir de agora e sempre").** Toda leva que toca
tela é tratada como trabalho de design de produto, não só de funcionalidade: (1) antes de mexer, captura da tela
real em 360×780 e 390×844, clara e escura; (2) desenho decidido por espaço útil da mesa, hierarquia e toque (alvo
≥ 44px, uma mão, nada que dependa de hover); (3) ícones do conjunto do app (SVG com `currentColor`, traço 1,75), nunca
emoji; (4) CTAs curtos, com ícone quando o gesto é conhecido; (5) movimento curto e com propósito, respeitando
`prefers-reduced-motion`; (6) captura de novo depois, nas mesmas medidas, e ajuste até ficar limpo; (7) teste que
mede o que foi prometido (altura, alinhamento, alvo de toque, contraste).

**Conduta offline (definida pelo usuário em 28/09/2026, épico E42; reforçada em 29/09/2026).** Toda funcionalidade — a que existe e
a que vier (Coleção, Mesa, Commander) — funciona sem internet com o que já está no aparelho. **O que não puder
funcionar sem rede por natureza precisa ser carregado sozinho nos momentos em que há rede**, para funcionar da
próxima vez (guardião offline: `manter()` ao abrir o app, quando a rede volta e ao voltar para o app). Só depende de
rede o que é chamada a API externa por natureza (carta nunca vista, edição pela Scryfall, imagem nunca
vista), e a tela diz isso em vez de falhar. Na prática, em cada leva: a história declara no Aceite **o que
faz sem rede**; dado novo que a funcionalidade precise entra no guardião offline (`src/app/offline.js`) e
no painel da tela inicial; e o teste "tudo sem internet" (`e2e · O1`, com as rotas da Scryfall abortando)
ganha o passo da funcionalidade na mesma leva.

**Done.** Uma história só está pronta quando:
- todos os critérios de aceite foram demonstrados;
- os testes das camadas aplicáveis estão escritos e passando;
- `npm test` está verde localmente e no CI;
- não há erro de console nos fluxos e2e tocados;
- o contrato visual está verde nos dois temas, com alvo de toque ≥ 44 px;
- o texto de interface está em pt-BR, voz ativa, sem jargão de sistema;
- o fluxo funciona offline para dado já visitado, e o passo dele está no teste "tudo sem internet";
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

A cada push no `main` o mesmo workflow roda antes a **guarda de agregação** (Q12): nenhuma trilha apaga a entrega de outra sem declarar.

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

**Replanejamento de 27/09/2026.** Com o Pauper em 100% e verificado em quatro camadas (cartas oferecidas,
gatilhos disparando, palavras-chave provadas e uma partida guiada), o Commander sai da frente da fila e
entra depois de cinco épicos de profundidade, nesta ordem:

**Ordem de entrega definida pelo usuário em 27/09/2026** (eu havia sugerido Mesa em 2º; a ordem
abaixo é a que vale):

| Ordem | Épico | Rodadas |
|---|---|---|
| 1º ✅ | **E37 · Bot (B2–B7)** — entregue em 5 levas (59 a 63) | 5 |
| 2º ✅ | **E39 · Scanner (X7–X10)** — entregue em 4 levas (64 a 67); X10 parcial até fotos reais | 4 a 5 |
| 3º ✅ | **E41 · Listas (C10, C11)** — entregue em 2 levas (68 e 69) | 2 |
| 3º-A ✅ | **E42 · Offline de verdade (O1–O3)** — entregue em 3 levas (70 a 72) | 2 a 3 |
| 4º ✅ | **E40 · Coleção (C12–C14)** — entregue em 4 levas (73 a 76) | 4 |
| 5º ✅ | **E38 · Mesa (A13–A16)** — entregue em 4 levas (77 a 80) | 4 a 5 |

**Regra que o E42 fixa, valendo para tudo que vier depois:** toda funcionalidade nova nasce funcionando
sem internet com o que já está no aparelho, e o portão prova isso no teste "tudo sem internet"
(`e2e · O1`). Só o que é chamada a API externa por natureza (busca de carta nova na Scryfall, edição pela
linha de coleção, imagem nunca vista) pode depender de rede — e a tela diz isso em vez de falhar.

**Ajuste de dependência que essa ordem exige:** a C10 previa exportar "o resultado do filtro atual", mas o
motor de filtro é a C12, que vem depois. Então a C10 entrega exportar a **coleção inteira ou uma seleção
manual**, e exportar o recorte do filtro entra junto com a C12. Está anotado na própria história.

Total estimado: **20 a 23 rodadas** até o Commander voltar à fila. Cada história fecha numa rodada, com
portão verde e algo testável no celular em menos de um minuto — histórias que não couberem numa rodada
são quebradas na hora, e a quebra é anotada aqui.


**Replanejamento de 29/09/2026 (definido pelo usuário).** O Commander (E36) volta a esperar. Antes dele
entram os épicos de patamar de produto abaixo, pedidos nesta ordem de assunto e ordenados aqui por
dependência técnica e por custo. Toda leva continua com portão verde, teste sem internet e história
atualizada. Tamanhos são estimativas de rodadas; o que passar disso é quebrado na hora.

| Ordem | História | Épico | Rodadas | Observação |
|---|---|---|---|---|
| 1º ✅ | U1 tema em dois estados (leva 82) | E43 | 1 | — |
| 2º ✅ | U5 cartas iguais em leque na mesa (leva 83) | E44 | 1 | — |
| 3º ✅ | U6 bandeja da mão recolhível (leva 84) | E44 | 1 | — |
| 4º ✅ | U7 de quem é o turno, visível de longe (leva 85) | E44 | 1 | — |
| 5º ✅ | U12 imagens do jogo baixadas sozinhas (leva 86) | E45 | 1 | estende o guardião offline (O1) |
| 6º ✅ | U10 Shark: um bot só, com nome (leva 87) | E46 | 1 | remove o amador; muda a tela de preparar |
| 7º ✅ | U3 símbolos de Magic em botões, textos e filtros (levas 90 e 91) | E43 | 2 | renderizador de {W}{U}{B}{R}{G}{C}{T}{X}{E} e números |
| 8º ✅ | U2 ícones flat, botões com profundidade e toque animado, CTAs sem excesso de texto (levas 92, 93 e 96) | E43 | 3 | — |
| 9º ✅ | U4 "sem internet" mais visual (leva 97) | E43 | 1 | — |
| 10º ✅ | U8 disposições por tamanho de aparelho (Galaxy S, S+ e Ultra) (leva 99) | E44 | 1 | — |
| 11º ✅ | U11 Shark mais forte, medido no torneio (leva 101) | E46 | 1 | 70% contra a versão anterior |
| 12º | U13 conta e perfil com Google (nome, avatar, backup) | E47 | 3 a 4 | **precisa de decisão e de um Client ID seu** (abaixo) |
| 13º | U14 partida online 1x1 | E48 | 6 a 10 | **precisa de decisão de infraestrutura** (abaixo) |
| 14º | U15 chat na partida 1x1 | E49 | 1 a 2 | depende de U14 |
| 15º | E36 · Commander: M13b ✅ (leva 103), depois S67+ | — | — | em curso enquanto U13/U14 esperam decisão |
| 15º-a ✅ | Escolhas de quem paga e X (leva 104) | E33 | 1 | relato do usuário |
| 15º-b ✅ | Auditoria texto × script, parte 1: 111 cartas, 9 correções (leva 105) | E33 | 1 | — |
| 15º-c ✅ | Auditoria texto × script, parte 2: 27 textos do Forge e 15 correções de impacto médio (leva 106) | E33 | 1 | — |
| 15º-d ✅ | Auditoria texto × script, parte 3: 22 achados de impacto baixo (leva 107) | E33 | 1 | — |
| 15º-e ✅ | Homologação da auditoria por leitura independente: 11 correções (leva 108) | E33 | 1 | — |
| 16º ✅ | Scanner automático de verdade (leva 109) | E39 | 1 | ajuste fino depende do diagnóstico do aparelho |
| 16º-a ✅ | Mesa e listas, cinco relatos com fotos do aparelho (leva 110) | E43 | 1 | — |
| 16º-b ✅ | Habilidades das fichas (leva 111) | M12 | 1 | — |
| 16º-c ✅ | Scanner de alto padrão (leva 112) | E39 | 1 | calibração fina depende do diagnóstico do aparelho |
| 16º-d ✅ | Modo único (motor completo), cores do deck principal, coleção reordenada (leva 113) | E43 | 1 | — |
| 16º-e ✅ | Melhor de 3 com trocas da reserva (leva 114) | E51 | 1 | — |
| 16º-f ✅ | Shark v3: mulligan e decisão medida em torneio (leva 115) | B | 1 | — |
| 16º-g 🟡 | Scanner por contorno e linha do nome, medido em fotos reais (leva 116) | E39 | 1 | teste no aparelho; fotos do próprio usuário (X10) |
| 16º-h ✅ | Shark com informação justa: decide sem ver a mão do oponente (leva 117) | B8 | 1 | — |
| 16º-i ✅ | Shark: sequência do turno (leva 118) | B11 | 1 | — |
| 16º-j 🟡 | Shark: usar os recursos (leva 119) — erros visíveis corrigidos, ganho de força não demonstrado | B17 | 1 | — |
| 16º-j2 🟡 | Scanner de referência (E52), primeiro passo: X13 câmera no máximo e cronômetro (leva 120) | E52 | 1 de 6 a 7 | teste no aparelho: diagnóstico com a subida de resolução e o tempo até aceitar |
| 16º-z12 ✅ | Combo do Shark na mesa: uma linha no registro para o laço inteiro e sem parada repetida na mesma habilidade (leva 164) | B9 | 1 | — |
| 16º-z11 🟡 | Shark pilotando Mono Blue Faeries: aceita a compra opcional de graça; segurar a mana da anulação medido e desligado; sem ganho demonstrado (leva 162) | B10b | 1 | a lista segue em 41% |
| 16º-z10 🟡 | Shark: truque próprio no ataque (conta com a habilidade usada depois dos bloqueios e espera os bloqueios); Elves medido por piloto: sem ganho demonstrado (leva 159) | B16 | 1 | bloqueio com truque, truque do oponente |
| 16º-z9 🟡 | Shark: plano do baralho — Walls Combo fecha a mana infinita; vitórias pilotando a lista 18% → 33% (leva 147) | B9 | 1 | Elves e os outros perfis |
| 16º-z2 ✅ | Shark usa todas as mecânicas, inclusive as dos terrenos: estoura o terreno que busca básico, abre mana com habilidades, ordena antes do corte do relógio; auditoria de uso (leva 143) | B21 | 1 | — |
| 16º-y ✅ | Shark: olhar o turno seguinte (simulação até o próximo turno) — medido, não pagou, fica desligado; achado: a força está no plano de cada baralho (leva 131) | B15 | 1 | — |
| 16º-w ✅ | Shark: pesos da avaliação postos à prova por torneio — nenhum paga; achado: o limite é a profundidade, não o peso (leva 126) | B20 | 1 | — |
| 16º-j3 🟡 | Scanner de referência (E52): X14 resposta imediata (leva 127) | E52 | 2 de 6 a 7 | teste no aparelho: "até aceitar" no diagnóstico |
| 16º-k | Shark profissional: B9, B10, B12 a B16 e B18 a B20 (perfis, mulligan, sequência, papel, jogar em volta, busca, plano, combate, recursos, reserva, leitura, pesos) | B9–B20 | 12 | uma leva por história; cada uma só fica se o torneio pagar |
| 16º-l 🟡 | Faixa de turno, Highway Robbery (tramar e escolha), gatilho com modos e sonda de alcance (leva 121) | U7b · R0 | 1 | teste no aparelho |
| 16º-m 🟡 | Axebane Guardian: mana em qualquer combinação de cores; Walls Combo volta a jogar (leva 122) | R1 | 1 | teste no aparelho |
| 16º-n 🟡 | Rakdos Madness carta a carta: pagamento automático sem virar terreno à toa (motor v65), decisões escritas na bandeja, escolha tocando na carta (leva 125) | R2 | 1 | teste no aparelho; partidas salvas da v64 não abrem |
| 16º-n2 ▶ | Revisão carta a carta das outras seis listas Pauper e homologação (R3–R9) | R | 6 a 8 | uma leva por lista; homologação independente no fim |
| 16º-r9 🟡 | Homologação independente das Pauper: perturbar e presságio cobrados, Hallow só no turno, Lembas, Masked Vandal sem alvo, insanidade na limpeza, Utopia Sprawl + Abundant Growth, Hydra concedida, virada para baixo sem tipo, Flagbearer (leva 178) | R9 | 1 | teste no aparelho |
| 16º-prot 🟡 | Proteção contra a cor à escolha: botão por criatura e pergunta da cor; regra fixada no motor com fonte multicolorida e incolor (leva 179) | R | 1 | teste no aparelho |
| 16º-r9b 🟡 | Tela da homologação: registro, pilha explicada, rótulos e dicionário de efeitos (leva 181) | R9 | 1 | teste no aparelho |
| 16º-r9d ○ | Resto da tela da homologação: cor escolhida visível na mesa (Benevolent Blessing, Utopia Sprawl), habilidade do par (Galvanic Alchemist) com custo e efeito no botão, ordem de gatilhos com botões iguais de valor diferente, registro do ninjutsu só na resolução, "pode" sem custo descrito como pagamento | R9 | 1 | — |
| 16º-r9c ○ | Estruturas apontadas pela homologação: regra das lendas, atacante divide o dano entre bloqueadores, escolha de como pagar (mana flutuante e fontes), busca que pode não achar, reciclar e rajada pela pilha | R12 | 3 a 5 | decisão por estrutura |
| 16º-r8 🟡 | Walls Combo carta a carta: habilidades de mesmo custo com nomes diferentes na folha (Freed from the Real não desvirava pela tela); fecha as sete listas Pauper (leva 165) | R8 | 1 | teste no aparelho |
| 16º-r7 🟡 | Jund Wildfire carta a carta: custos de sacrifício e adaptar por extenso, permanentes iguais juntas na escolha, Vault of Whispers com script (leva 148) | R7 | 1 | teste no aparelho |
| 16º-r6 🟡 | Boros Bully carta a carta: gatilhos idênticos não pedem ordem (motor v69), lampejo e esgueirar-se com o custo escrito, iguais juntas ao devolver; conserto do portão do CI (sobreposição com fonte larga) e anotação dos testes que falham (leva 144) | R6 · Q | 1 | teste no aparelho; partidas salvas da v68 não abrem |
| 16º-ab 🟡 | GW Bogles carta a carta: dois gatilhos seus ao mesmo tempo mantêm alvo, valor e "você pode" (motor v68); Aura ao lado de quem a carrega; alvos iguais dizem a força (leva 139) | R5 | 1 | teste no aparelho; partidas salvas da v67 não abrem |
| 16º-z 🟡 | Elves carta a carta: colher provas na folha (não era alcançável), Winding Way entrega as cartas sem pergunta (motor v67), custo de várias cartas tocando nelas, Llanowar Elves e Elvish Mystic com script (leva 136) | R4 | 1 | teste no aparelho; partidas salvas da v66 não abrem |
| 16º-x 🟡 | Mono Blue Faeries carta a carta: escolha de alvo sem nome repetido e tocando na carta, Sewer-veillance Cam pela regra (motor v66), ninjutsu e desconto escritos na folha (leva 131) | R3 | 1 | teste no aparelho; partidas salvas da v65 não abrem |
| 16º-o | Revisão carta a carta das listas Commander (R10–R13) e mapa das regras que faltam (R14) | R | 14 a 22 | depende de quatro estruturas do motor (camadas, substituição, cópia, troca de controle) |
| 16º-p ✅ | Dívidas do design system pagas, com guarda-corpos (leva 123) | U16 | 1 | — |
| 16º-q ✅ | Perfil local: nome, avatar e backup completo por arquivo (U13 fase 1, leva 128) | E47 | 1 | — |
| 16º-r ✅ | Entrar com Google e backup no Drive, pronto atrás de uma constante (U13 fase 2, leva 129) | E47 | 1 | **OAuth Client ID do usuário** para ligar na publicação |
| 16º-s 🟡 | Partida online 1x1: transporte abstraído, adaptador local nos testes, Firebase atrás de config (U14) — parte 1 na leva 130 (sala, transporte, sincronização), parte 2 na leva 133 (telas; joga entre duas abas), parte 3 na leva 134 (Firebase REST + eventos), parte 4 na leva 135 (ausência e encerramento) | E48 | 4 | **URL do Realtime Database** em `FIREBASE_DB_URL` para dois celulares |
| 16º-t ✅ | Chat na partida online (U15, leva 137) | E49 | 1 | — |
| 16º-u ✅ | Roadmap completo de design (épico E53 · D1–D12) escrito a partir da auditoria de 13 telas (leva 137); execução sequencial a partir da D1 | D | 12 | capturas do aparelho depois de D2 e D6 |
| 16º-aa ✅ | D1 fundamentos: escala de texto e densidade por tokens, literais zerados, aviso que não atravessa telas (leva 138) | D | 1 | — |
| 16º-ac ✅ | D2 Ajustes e Aparência: tema, cor de destaque (4 acentos AA), texto, densidade, movimento, vibração (leva 140) | D | 1 | — |
| 16º-ad ✅ | D3 Início que lembra de você: "Olá, Nome", cartão Continuar (partida, última lista, pilha do scanner), painel offline em uma linha (leva 141) | D | 1 | — |
| 16º-ae ✅ | D4a estados vazios de Listas e Coleção: cartão de primeiro uso com ícone, título, frase, um primário e um secundário; o resto em "Mais" (leva 142) | D | 1 | — |
| 16º-af ✅ | D4b apresentação de 3 passos na primeira abertura, pulável, uma vez só, "Rever apresentação" no Perfil (leva 145) | D | 1 | — |
| 16º-ag ✅ | Coleção com blocos expansíveis e ícone (painel, adicionar carta de volta ao topo), Jogar sem "Todos", enquadrar a foto do perfil (leva 149) | U17 | 1 | teste no aparelho |
| 16º-aq ✅ | Coleção: bloco expansível **Exportar** com ícone próprio abaixo de Adicionar carta — texto, CSV, filtradas e seleção; sai do fim da página (leva 160) | U18 | 1 | teste no aparelho |
| 16º-ar ✅ | G1 preço da carta em dólar, real e euro, com a cotação do dólar buscada e guardada no aparelho (leva 163) | G | 1 | teste no aparelho |
| 16º-as ✅ | G2 etiquetas coloridas em cartas da coleção e em listas: criar, aplicar em lote ou pela carta, filtrar por chip (leva 166) | G | 1 | teste no aparelho |
| 16º-at ✅ | G3 valor acumulado em real, dólar e euro: coleção, recorte do filtro, cada etiqueta, cada lista (deck, reserva, falta comprar) e total da estante (leva 167) | G | 1 | teste no aparelho |
| 16º-au ✅ | G4 som na partida: eventos de mesa lidos do estado (compra, ataque, dano, cura, anulação, destruição, descarte, remoção global…) e vinte sons sintetizados, com liga/desliga e volume (leva 168) | G | 1 | teste no aparelho |
| 16º-av ✅ | G5 efeitos visuais na partida: um efeito por evento (compra, ataque, dano com número, cura, anulação, destruição, exílio, descarte, remoção global, aprimoramento), por tokens de movimento, com menos movimento respeitado (leva 169) | G | 1 | teste no aparelho |
| 16º-aw ✅ | Correção do CI: botão Etiquetas da lista sai da linha de ações (derrubava o Excluir com fonte larga); o e2e confere a linha com a fonte do CI (leva 170) | G2 | 1 | teste no aparelho |
| 16º-ax ✅ | H1 imagens nítidas: verso de dupla face na mesa e na folha (com Virar carta) e cartas com imagem na troca de reserva (leva 171) | H | 1 | teste no aparelho |
| 16º-ay ✅ | H2 contra o bot, desfazer volta quantas jogadas quiser (até a mão inicial) e o Registro volta ao começo de um turno (leva 173) | H | 1 | teste no aparelho |
| 16º-az ✅ | H4 resumo do turno recolhido: faixa de 44 px com ícone e sinais, detalhe por cima da mesa, fecha fácil (leva 174) | H | 1 | teste no aparelho |
| 16º-ba ✅ | H5 ver o oponente jogar: o turno do bot passa quadro a quadro, com legenda, a tela indo até onde acontece, som e efeito por passo, Pular e liga/desliga (leva 175) | H | 1 | teste no aparelho |
| 16º-bb ✅ | H6 pagar com as manas que eu escolho: folha de pagamento com a sugestão do motor, contador por fonte e cor, conferência a cada toque (certo, falta, sobra) (leva 176) | H | 1 | teste no aparelho |
| 16º-bc ✅ | H3 melhor de 3 online: quem cria a sala escolhe a série; trocas com a reserva em cada aparelho, a partida seguinte abre sozinha nos dois lados, desistir de uma partida não fecha a sala (leva 177) | H | 1 | teste no aparelho com dois celulares |
| 16º-bd ✅ | H7 imagens que não somem na partida: cada imagem baixa uma vez, é conferida inteira e fica no aparelho; a que falha ou chega cortada volta sozinha; redesenhar a mesa não vai à rede (leva 180) | H | 1 | teste no aparelho com sinal fraco |
| 16º-be ✅ | L7 edição rápida da lista: chip Ajustar, − e + em cada carta, adicionar pelo nome com sugestões da base local, Desfazer ao tirar a última cópia (leva 182) | L | 1 | teste no aparelho |
| 16º-bf ✅ | I1 mesa legível, parte 2: bloqueios em pares (atacante e bloqueador na mesma linha), registro com a fase em cima e ícone por acontecimento, resumo com a mesma linha (leva 183) | I | 1 | teste no aparelho |
| 16º-bg ✅ | I2 coleção e listas no mesmo padrão: contagem só no Painel; listas com busca (lista ou carta), filtros de formato, cor, posse e ordem; Formato em primeiro na coleção (leva 185) | I | 1 | teste no aparelho |
| 16º-bh ✅ | I3 tela Jogar sem texto solto: estado da lista em ladrilhos (motor, reserva, offline) com folha de detalhe; dica a um toque em Série, Paradas e Semente; componente Dica no design system (leva 186) | I | 1 | teste no aparelho |
| 16º-bi ✅ | I4 fichas do seu jeito: Perfil › Fichas lista as fichas que as cartas criam (ícone, cores), busca as artes na Scryfall, guarda opções e imagens e a mesa usa a escolhida; offline troca entre as já baixadas (leva 187) | I | 1 | teste no aparelho |
| 16º-bj ✅ | I5 histórico e estatísticas de partidas: Perfil › Partidas com ladrilhos, medidor de resultados, últimas 20, barras por oponente e lista (que filtram), quem começou, colunas por semana e a lista; vai no backup (leva 188) | I | 1 | teste no aparelho |
| 16º-bk ✅ | L8 estatísticas da lista: ladrilhos, barras por tipo, curva por tipo com as criaturas em destaque e, por cor, símbolos de custo contra fontes de mana (leva 190) | L | 1 | teste no aparelho |
| 16º-bl ✅ | V1 impressões e arte por carta: a carta da lista abre as impressões da Scryfall e a escolhida vale no deck e na reserva, guardada na lista e offline (leva 192) | V | 1 | teste no aparelho; destrava C4 |
| 16º-bm ✅ | J1 ficar onde está (app): tocar num controle não move a tela — `mount` devolve a rolagem e a âncora do toque segura o controle; guarda-corpo `semSalto` e contrato dos pontos que rolam (leva 195) | J | 1 | teste no aparelho |
| 16º-bn ✅ | J2 ficar onde está (mesa): fileiras e página não voltam ao começo ao agir; a mesa só anda para mostrar o que está fora da vista (`levaSeEscondido`) (leva 197) | J | 1 | teste no aparelho |
| 16º-bo ✅ | J3 leque das viradas: atacantes iguais sem bloqueio ficam num leque só, dos dois lados (os terrenos virados já juntavam) (leva 199) | J | 1 | teste no aparelho |
| 16º-bp ✅ | J4 carregamento com identidade: `Carregando` (cartas que se arrumam na prateleira, três tamanhos) e `Esqueleto` de lista, trocados nas esperas de tela e de bloco (leva 203) | J | 1 | teste no aparelho |
| 16º-bq ✅ | J5 abertura: ao abrir o app o ícone se monta (ladrilho, estante, três cartas) em 1,2 s, sem segurar o app nem receber toque; uma vez por sessão (leva 205) | J | 1 | teste no aparelho |
| 16º-br ✅ | J6 botão de ação: componente `BotaoDeAcao`, Listas (Nova lista, Prontas) e Coleção (Escanear, Adicionar, Colar lista); o bot joga com a arte padrão (leva 208) | J | 1 | teste no aparelho |
| 16º-bs ✅ | J7 botão de ação na Lista (Jogar, Editar, Exportar; Jogar abre o preparo com a lista escolhida) e em Partidas (Jogar); Início, Cartas e Jogar sem botão, com o motivo (leva G-209) | J | 1 | teste no aparelho |
| 16º-bt ✅ | N1 coletor de notícias: `noticias.mjs` lê seis fontes (RSS e Atom), normaliza, tira repetidos, guarda 30 dias em páginas de 20; fluxo agendado de hora em hora publica no ramo `noticias` (leva G-210) | N | 1 | primeira coleta conferida no ramo |
| 16º-bu ✅ | N2 tela Notícias: linha do tempo com destaque, rolagem infinita e estados desenhados; idioma por bandeiras (português, inglês ou os dois); duas fontes em português no coletor, com capa buscada na página (leva G-211) | N | 1 | teste no aparelho |
| 16º-bv ✅ | N3 notícias do seu jeito: filtros por tema e fonte, marca de novas com contador na Início, atualizar pelo botão e puxando, volta à tela no mesmo ponto com aviso de novas (leva G-212) | N | 1 | teste no aparelho |
| 16º-bw ✅ | N4 guardar e compartilhar: "Mais ações" em cada notícia (Guardar, Compartilhar, Abrir), marcador na guardada, tela Guardadas que abre sem internet, tirar com Desfazer (leva G-213) | N | 1 | teste no aparelho |
| 16º-bx ✅ | N5 coleções na linha do tempo: lançadas e a caminho, da Scryfall, entre as notícias pela data e na Início; tocar abre as cartas da coleção (leva G-217) | N | 1 | teste no aparelho |
| 16º-by ✅ | I6 terrenos do seu jeito: Perfil › Terrenos com os doze básicos (ícone, cor), artes da Scryfall em lotes de 6 com "Mais artes", escolha guardada e usada na partida; fichas na mesma mecânica (leva 200) | I | 1 | teste no aparelho |
| 16º-bz ✅ | I7 acabamento: artes com espera própria e pequena primeiro, um lote por vez, escolha na hora, artes de terreno e ficha em toda partida, abertura de 2 s e maior, toque sem realce do navegador (leva 206) | I | 1 | teste no aparelho |
| 16º-ca ✅ | K1 decisão que esconde a mão: seletor Escolha / Mão para alternar entre a decisão e a mão (leva G-214) | K | 1 | teste no aparelho |
| 16º-cb ✅ | K2 feltros do escuro com presença: verde novo, Oceano e Vinho, todos separados das zonas e com texto AA (leva G-214) | K | ½ | teste no aparelho |
| 16º-cc ✅ | K3 parar sempre por etapa: Paradas no balão da faixa, chaves do seu turno e do oponente; sem a chave, a mesa só para com ação ou resposta possível (leva G-215) | K | 1 | teste no aparelho |
| 16º-cd ✅ | K4 Início redesenhada: data e saudação, Jogar em destaque, quatro destinos numa linha, notícias integradas (destaque e duas) com Ver todas (leva G-216) | K | 1 | teste no aparelho |
| 16º-ce ✅ | L9 versões da lista: salvar como está e comparar duas versões (entrou e saiu, por zona), guardadas na lista e no backup (leva G-218) | L | 1 | teste no aparelho |
| 16º-cf ✅ | V2 rulings na carta: seção que abre e lembra, data e fonte, guardados no aparelho com prazo, sem internet mostra a cópia (leva G-219) | V | 1 | teste no aparelho |
| 16º-ah ✅ | D7 mesa do seu jeito: superfície (nogueira, feltro, pedra, linho), cor do oponente (azul, rubi, ametista), verso de carta (estante, selo, trama); carta virada do outro mostra o verso (leva 151) | D | 1 | capturas do aparelho |
| 16º-ai ✅ | D6 mesa de relance: campo vazio não ocupa linha, zeros apagados, Terrenos/Permanentes só quando há; 98 px ganhos no início (leva 152) | D | 1 | capturas do aparelho |
| 16º-aj ✅ | D8 avisos no lugar: linha de estado com folha na lista (−109 px sem rede), ✓ no botão por 1,2 s antes do aviso, barra não vaza com o chip Sem rede (leva 153) | D | 1 | scanner fica com a X16 |
| 16º-ak ✅ | D9 coleção: agrupar e ordem lado a lado, desfazer importação numa linha; o painel recolhido cedeu ao bloco expansível da leva 149 (leva 154) | D | 1 | — |
| 16º-al ✅ | D10 movimento com sistema: pulsos por token, vibração por evento (toque · confirmação · alerta · turno), catálogo em /ds, portão confere keyframes e menos movimento (leva 155) | D | 1 | literais do scanner ficam com a X16 |
| 16º-am ✅ | D11 acessibilidade medida: axe-core no portão (12 telas e folhas × 2 temas, zero achados); selects com nome, h1 na partida, texto sutil e cabeçalho de grupo AA no claro (leva 156) | D | 1 | — |
| 16º-an ✅ | D12 guia visual vivo: /ds com tokens lidos do documento, componentes com estados, movimento e checklist; o portão barra componente do DS fora do catálogo — fecha o épico E53 (leva 157) | D | 1 | capturas do aparelho |
| 16º-ap ✅ | Barra sem internet em tela estreita: chip só com ícone e tema fora da barra; e2e D8 audita com fonte larga (CI verde de novo) (leva 158) | D | 1 | — |
| 16º-ao ✅ | D5 dados num lugar só: Perfil › Dados com backup, conta, base local de cartas e espaço; Listas sem backup; Cartas abre na busca (leva 150) | D | 1 | — |
| 16º-v ✅ | Publicação aditiva entre trilhas: nenhuma conversa apaga a entrega de outra sem declarar (leva 124) | Q12 | 1 | — |

Total estimado: **26 a 33 rodadas** até o Commander voltar. O que ficará sem teste em aparelho cresce com
cada leva; a recomendação de testar no celular antes de seguir continua de pé em toda entrega.

**Duas decisões que só o usuário toma, e que eu preciso antes de U13 e U14:**
1. **Conta com Google (U13) — código pronto desde a leva 129; falta só o Client ID.** Dá para fazer sem servidor: Google Identity Services para entrar e a pasta
   privada do app no Google Drive (`appDataFolder`) para o backup, tudo direto do navegador. Mas exige um
   projeto no Google Cloud com um OAuth Client ID criado por você e a origem do GitHub Pages autorizada.
   Sem esse ID o login não abre. Alternativa sem Google: perfil local (nome e avatar) e backup por arquivo,
   que já existe em L1. Recomendo fazer o perfil local primeiro (1 rodada) e ligar o Google quando o ID
   existir.
2. **Partida online (U14).** O motor é determinístico e joga por registro de ações, então sincronizar é
   mandar as ações de um aparelho ao outro. O que não existe é o canal entre os dois celulares: GitHub Pages
   não roda servidor. Opções: (a) Firebase Realtime Database no plano gratuito como transporte — mais
   simples, funciona atrás de qualquer rede de celular, exige um projeto Firebase seu; (b) WebRTC ponto a
   ponto com sinalização no Firebase — menos tráfego no servidor, mas falha em muitas redes de operadora
   sem um servidor TURN; (c) um servidor próprio de WebSocket — melhor controle, mas você passa a manter um
   serviço. Recomendo (a). Em qualquer opção a partida online precisa de internet nos dois lados, por
   natureza, e isso fica declarado na conduta offline.

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
| E32 ✅ | S31 (leva 22) | Boros Bully fechado: cancelar prevenção, dois alvos, modais |
| E33 ✅ | S32 (leva 23) | Elves e Jund: devoção, sacrifício e exílio como custo |
| E33b ✅ | S33 (leva 24) | Afinidade, adaptar, gatilho de marcadores e terceira compra |
| E33c ✅ | S34 (leva 25) | Tempestade, conceder e metamorfo |
| E33d ✅ | S35 (leva 26) | Varredura das Pauper: medição e gatilho da criatura encantada |
| E33e 🟡 | S36 (leva 27) | Proteção de várias cores e prevenção do dano de uma mágica |
| E33f 🟡 | S37 (leva 28) | Exilar cemitérios, descarte escolhido, habilidade da mão e barganha |
| E33g 🟡 | S38 (leva 29) | Alvo por cor, varredura que poupa subtipo e "até dois alvos" |
| E33h 🟡 | S39 (leva 30) | Habilidade ativada concedida por aura e por vínculo de alma |
| E33i 🟡 | S40 (leva 31) | Conluio e força por outras criaturas suas |
| E33j ✅ | S41 (leva 32) | Colher provas, vigilância e canalizar — **Pauper sem cartas manuais** |
| E33k 🟡 | S42 (leva 33) | Listas de Commander restauradas + mesmo alvo, devolver mágica e Tesouro |
| E33l 🟡 | S43 (leva 34) | Killian: proteção pela cor escolhida e indestrutível por sacrifício |
| E33m ▶ | S44 | Commander: seguir nas 67 manuais (42 Killian, 25 Malcolm) |
| E33n 🟡 | S44 (leva 36) | Pauper para 100%: primeiras 6 parciais fechadas (106 → 87 cópias) |
| E33o 🟡 | S45 (leva 37) | Você escolhe: descarte do oponente e carta do cemitério (87 → 81 cópias) |
| E33p 🟡 | S46 (leva 38) | Jund Wildfire 95% e Boros Bully 89% (81 → 62 cópias parciais) |
| E33q 🟡 | S47 (leva 39) | **Jund Wildfire em 100%** e Rakdos em 95% (62 → 50 cópias parciais) |
| E33r 🟡 | S48 (leva 40) | **GW Bogles em 100%** (50 → 42 cópias parciais) |
| E33s 🟡 | S49 (leva 41) | **Mono Blue Faeries em 100%** (42 → 34 cópias parciais) |
| E33t 🟡 | S50 (leva 42) | Custo X, escolha de tipo e custo por subtipo (34 → 30 cópias parciais) |
| E33u 🟡 | S51 (leva 43) | **Walls Combo em 100%** (30 → 25 cópias parciais) |
| E33v 🟡 | S52 (leva 44) | Boros Bully em 97% (25 → 14 cópias parciais) |
| E33w 🟡 | S53 (leva 45) | **Rakdos Madness em 100%**: plot e custo adicional com opções |
| E33x 🟡 | S54 (leva 46) | **Boros Bully em 100%**: metamorfose e esgueirar-se |
| E33y ✅ | S55 (leva 47) | **PAUPER 100%: as sete listas rodam no Motor completo** |
| E33z 🟡 | S56 (leva 48) | Medição corrigida + 15 cartas: seis Pauper em 100% de verdade |
| E33aa 🟡 | S57 (leva 49) | Masmorra: máquina pronta e a Mina Perdida de Phandelver inteira |
| E33ab ✅ | S58 (leva 50) | Básico embutido: as listas param de perder % por falta de rede |
| E33ac 🟡 | S59 (leva 51) | Cidade Baixa inteira: provocar, Trono dos Três Mortos, escolha de masmorra |
| E33ad 🟡 | S60 (leva 52) | Tumba da Aniquilação inteira: "a menos que", sacrifício escolhido, O Atropal |
| E33ae ✅ | S61 (leva 53) | Mago Louco e Secret Door completa: as sete listas Pauper em 100% |
| E33af ✅ | S62 (leva 54) | Custo que vira outra criatura + auditoria que abre cada carta das listas |
| E33ag ✅ | S63 (leva 55) | Auditoria dos gatilhos: cada gatilho das listas disparando numa partida |
| E33ah ✅ | S64 (leva 56) | Lista guardada no aparelho, sem prazo, e motor completo exige os dados |
| E33ai ✅ | S65 (leva 57) | Matriz de palavras-chave: as quinze provadas em combate, com teste de completude |
| E33aj ✅ | S66 (leva 58) | Partida guiada: a corrente de interações dos Elfos, passo a passo |
| E37 🟡 | B2–B7 (levas 59 a 63) — épico do bot completo, aguardando teste no aparelho | Bot com duas dificuldades: amador experiente e profissional, medidos no portão |
| E38 🟡 | A13 (leva 77) · A14 (leva 78) · A15 (leva 79) · A16 (leva 80) — épico completo, aguardando teste no aparelho | Mesa profissional: leitura do campo, pilha explicada, zoom e prévia de combate |
| E39 🟡 | X7 (leva 64) · X8 (leva 65) · X9 (leva 66) · X10 🟡 (leva 67) · X11 🟡 (leva 116) · X12 ○ | Scanner sem moldura, pilha de leitura, validação ágil, acerto medido e leitura por contorno |
| E52 🟡 | X13 🟡 (leva 120) · X14 🟡 (leva 127) · X15 ▶ · X16 · X17 · X18 | Scanner de referência: imagem no máximo da câmera, resposta imediata e experiência de outro patamar |
| E40 🟡 | C12 (levas 73 e 74) · C13 (leva 75) · C14 (leva 76) — épico completo, aguardando teste no aparelho | Filtros de verdade e a coleção como coleção, com painel gráfico |
| E41 🟡 | C10 (leva 68) · C11 (leva 69) | Importar e exportar a coleção por lista, com conferência e desfazer |
| E42 🟡 | O1 (leva 70) · O2 (leva 71) · O3 (leva 72) — épico completo, aguardando teste no aparelho | Offline de verdade: o que é seu fica no aparelho, telas sem rede e portão offline |
| E36 🟡 | M13a (leva 81) · S67+ | Commander: regras do formato no motor (identidade na mana, volta à zona de comando); depois 95 cartas sem script (terrenos que só geram mana já rodam pelo texto) e 22 parciais |
| E34 | S33 | Commander Killian e Malcolm: reanimação por aura, modais e tutores |
| E35 ✅ | deploy | Merge na main em 26/09/2026: motor v3 → v35, Pauper sem carta manual |
| E35b | deploy | Próximo merge quando o Commander fechar |
| E28 | B2–B4 | Bot heurístico, dificuldade e torneio de aferição |
| E43 ✅ | U1 (leva 82) · U3 (levas 90 e 91) · U2 (levas 92, 93 e 96) · U4 (leva 97) | Identidade visual: tema em dois estados, símbolos de Magic, ícones flat, botões com toque animado, sem internet mais visual |
| E50 ✅ | P1 (leva 94) · P2–P6 (leva 95) · E51 reserva nas listas já salvas (leva 98) | Polimento de jogo e app (pedido de 30/09): ícone com relevo, X nos diálogos, bloqueio mais claro, imagens de fichas, balão na bandeja, side deck separado, pilha com a carta e texto oficial |
| E44 🟡 | U5 (leva 83) · U6 (leva 84) · U7 (leva 85) · U8 | Mesa mais legível: cartas em leque, mão recolhível, turno visível, disposições por aparelho |
| E45 ✅ | U12 (leva 86) | Imagens do jogo baixadas sozinhas quando há internet |
| E46 🟡 | U10 (leva 87) · U11 | Shark: um bot só, com nome, e mais forte |
| E47 | U13 | Conta e perfil: nome, avatar e backup com Google (decisão pendente) |
| E48 | U14 | Partida online 1x1 entre dois celulares (decisão de infraestrutura pendente) |
| E49 | U15 | Chat na partida online |

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

**Q12 · Publicação aditiva entre trilhas** ✅ (leva 124, 02/10/2026)
- **Origem:** o usuário passou a trabalhar com conversas simultâneas e pediu a prova de que nada se sobrepôs, e uma camada que faça o deploy sempre somar, salvo intenção declarada.
- **Auditoria do `main` (levas 109 a 122, 16 commits, linha por linha):** histórico linear, 30 pushes sem push forçado, os dois ramos `acumulado/*` já contidos no `main`. Todo o código e todos os testes das levas 113 a 122 estão vivos no `HEAD`. **Uma perda real:** o commit da leva 122 (trilha do motor) apagou do ROADMAP a história **B17 · Usar os recursos** (leva 119, trilha do bot), 20 linhas; restaurada nesta leva. **Uma remoção de propósito:** a leva 121 tirou o placar da série da faixa (leva 114) e o levou para o balão, dito no próprio commit.
- **Valor:** cada conversa publica por cima das outras; o que uma entrega a outra não desfaz sem escrever que quis desfazer.
- **Entregue:**
  - `agregacao.mjs` (guarda): um commit novo não pode apagar linhas que um commit das últimas 72 horas, de outra trilha, acrescentou. Linha só mudada de lugar, ou que só ganhou conteúdo (todas as palavras e números antigos continuam), não conta. Mostra as linhas, o commit atingido e as duas saídas.
  - Rodapés no commit: `Trilha: <nome>` (quem publica) e `Sobrescreve: <sha> — motivo` (a única forma de passar apagando; sem motivo não vale).
  - `npm run publicar` (`publicar.mjs`): busca o `main`, rebase, guarda, portão sobre o código já somado, push sem `--force`; se outra trilha publicar no meio, recomeça.
  - Gancho `pre-push` (ligado pelo `npm install`) e passo no CI: barram também push forçado e número de leva repetido entre trilhas.
  - `ROADMAP.md` com `merge=union`: em conflito o git fica com os dois lados, que foi exatamente onde a perda aconteceu.
  - `CLAUDE.md` na raiz: o protocolo chega sozinho a toda conversa que clonar o repositório.
- **Testes:** U `agregacao.unit` (14): só acrescentar passa; linha estendida passa e número trocado não; gancho de pre-push (deixa passar o que soma, barra push forçado e cópia antiga); cópia antiga por cima é barrada e o relato traz a linha e o rodapé pronto; declaração com e sem motivo; a própria trilha; linha movida; fora da janela; commit sem trilha; leva repetida; rebase com os dois lados no ROADMAP; instalação; nenhum arquivo com marca de conflito nem id `16º-x` repetido. A guarda rodada sobre o histórico real aponta só os dois casos acima; a leva 123 (U16), que estendeu duas linhas da leva 121 sem tirar nada, passa.
- **Sem rede:** não muda o app; `index.html` e `sw.js` intactos. Motor continua v64, goldens intactos.
- **Fora / parcial declarado:** a guarda vê texto, não comportamento: duas trilhas mudando a mesma regra em linhas diferentes só o portão pega. Trabalho que ainda não foi publicado por uma conversa não é visível daqui. O CI acusa depois do push; quem barra antes é o `publicar` e o gancho. O Pages continua publicando o `main` mesmo com portão vermelho (a leva 119 foi ao ar com ✗): amarrar o deploy ao ✓ pede trocar a fonte do Pages para GitHub Actions, decisão do usuário. Upload pela interface web não passa pelo gancho; o CI marca ✗ se ele apagar entrega recente.
- **Prova em uso, na própria publicação:** enquanto o portão desta leva rodava, a trilha `geral` publicou a leva 123 (U16). O `publicar` recomeçou sozinho, o rebase parou no conflito do ROADMAP (mesma linha `16º-p`, mesmo número de leva) e a resolução ficou com os dois lados: U16 mantém 123 e `16º-p`…`16º-u`; esta leva virou 124 e `16º-v`.
- **Depende de:** Q6.

**Q11 · Regras das listas Pauper contra o texto oficial, 29/09/2026** ✅ (leva 89)
- **Origem:** o usuário viu no aparelho o Timberwatch Elf contando só os Elfos dele. O texto diz "the number of Elves on the battlefield" (de todos).
- **Como:** um juiz independente conferiu as 138 cartas únicas das 7 listas Pauper contra o texto oficial (mtgdecks.net, Card Kingdom, TappedOut e mtg.wtf em 29/09/2026; Scryfall e Gatherer recusaram as consultas). 120 estavam corretas; 18 tinham erro (com o Elf). Todas corrigidas, cada uma com teste que falha na versão anterior (`pauper.regras.test.mjs`, 11 testes, com mesa real).
- **Erros que mudavam a partida (alto):** Krark-Clan Shaman cobrava {R} a mais e acertava voadoras (texto: "each creature without flying"); Electrickery varria as criaturas do oponente por {R} (texto: 1 alvo; varredura só com sobrecarga {1}{R}); End the Festivities queimava as suas criaturas e não tirava vida do oponente; Timberwatch Elf.
- **Médio:** Alms of the Vein causava dano (é perda de vida, e só no oponente); Bloodrite Invoker drenava 2 (são 3); Moon-Circuit Hacker cobrava ninjutsu {1}{U} (é {U}); Elvish Vanguard ignorava Elfos do oponente; Spirit Link dava vínculo com a vida (é gatilho de quem controla a aura, e soma com Armadillo Cloak); Fanatical Offering não criava a ficha Map.
- **Baixo:** Utopia Sprawl encantava qualquer terreno (é "Enchant Forest"); Setessan Training encantava criatura do oponente; Ninja of the Deep Hours, Squadron Hawk e Shield-Wall Sentinel tinham compra/busca obrigatória ("you may"); Faerie Macabre exigia um alvo ("up to two"); Bojuka Bog só mirava o oponente ("target player"); Tinder Wall não tinha a segunda habilidade.
- **Motor ganhou (para as correções acima, sem aproximação):** custo alternativo com efeitos próprios (sobrecarga); varredura "cada criatura sem voar"; alvo "criatura que a fonte está bloqueando" com última informação conhecida (a fonte já sacrificada); gatilho "outra permanente entra" de qualquer controlador (`anyController`); aura com subtipo de terreno e "criatura que você controla"; o efeito **explorar** (701.45), usado pela ficha Map.
- **Não corrigido, declarado:** Hydroblast exige alvo vermelho na conjuração; a carta real aceita qualquer alvo e só age se for vermelho. Resultado igual em quase todo jogo; fica registrado.
- **Portão:** cobertura das 7 listas continua 100%; `pauper.audit` (cada habilidade oferecida numa mesa farta) ganhou a exceção declarada "Tinder Wall #1: só bloqueando", coberta no teste próprio.

**U6b · Bandeja da mão, segunda versão (retorno do usuário no aparelho), 29/09/2026** ✅ (leva 89)
- **Retorno:** recolhida, a bandeja ainda ocupava muito da tela; o emoji de mão era pouco elegante; faltava gesto; "O que eu poderia fazer?" ocupava espaço.
- **Entregue:** desenho de folha inferior. Puxador na borda de cima; uma linha com o botão da mão (ícone do app + contagem), o momento em duas palavras ("Sua vez", "Pilha: X") e as ações; as cartas embaixo. **Recolhida: 69 px num 390×844 (antes: 169 px, 20% da tela → 8%). Aberta: 224 px (antes: 324 px).** "Passar o turno" virou ícone (com nome acessível). "O que eu poderia fazer?" saiu (o avaliador continua no bot). Arrastar a borda de cima: para baixo recolhe, para cima abre; a folha acompanha o dedo, com resistência no sentido que não muda nada; arrasto curto e lento volta; peteleco rápido vale; o toque que vira arrasto não aciona o botão que estava embaixo. Na mão inicial e no descarte a bandeja abre sozinha com uma frase de ação ("Decida a mão inicial", "Escolha o que descartar"). O aviso flutuante (toast) sobe para ficar acima da bandeja.
- **Divergência:** o pedido dizia "slide de cima para baixo para expandir" nos dois sentidos; implementei o padrão de folha inferior (para baixo recolhe, para cima abre), que é o que o dedo espera numa bandeja presa ao rodapé.
- **Testes:** U (`bandeja.unit.test.mjs`: decisão do gesto — distância, velocidade, sentido, lateral); e2e U6 (altura ≤ 80 px recolhida, ações na mesma linha com alvo ≥ 44 px, ícone SVG e não emoji, avisos), e2e U6b (arrasto para baixo e para cima, arrasto curto não muda, arrasto a partir do botão não passa a prioridade, toque logo depois continua funcionando), e2e B4 (sem "O que eu poderia fazer?").

**Q10 · Homologação das levas 81–87 e auditoria offline do app inteiro, 29/09/2026** ✅ (leva 88)
- **Como:** dois revisores independentes, sem contexto da implementação: um leu o diff das levas 81–87 (Commander M13a, tema, leque, mão, turno, imagens, Shark); o outro fez o inventário de todos os pontos do app que tocam a rede e o que acontece com cada um sem rede e quando a rede volta. Cada achado corrigido virou teste que falha na versão anterior.
- **Motor (regras):**
  - A1 · comandante devolvido/exilado/morto **no meio da resolução** de uma mágica: o resto dos efeitos sumia e ficava pendurado para disparar fora de hora (Vapor Snag, Lightning Helix, Resculpt, Anguished Unmaking). Corrigido; e a retomada agora leva o alvo junto — "perde 1 de vida" era cobrado de quem conjurou.
  - A2 · ativar Arcane Signet sem escolher cor virava a fonte e não produzia nada; agora é recusado.
  - `commander-7` regravada: registro e resultado final idênticos; dois pontos de controle intermediários mudam porque o estado da retomada passou a guardar o alvo.
- **Mesa:** A4 · leque juntava cartas com vínculo de alma, proteção até o fim do turno ou "uma vez por turno" (nome de campo errado `pairedWith`); A8 · a faixa de turno virou uma região viva estável, anunciada pelo leitor de tela; a espiada e a folha da carta sem imagem mostram o nome em vez de um retângulo vazio.
- **Offline (auditoria), em ordem de impacto:**
  1. visualizador de carta pedia a imagem "large", que nunca é guardada; agora mostra a "normal" guardada (antes: "imagem ainda não guardada" com a imagem no aparelho);
  2. galeria e pilhas da coleção usam a miniatura guardada; carta sem imagem vira o nome;
  3. cache de imagens apagado pelo navegador com o app aberto: o app escrevia num cache fantasma e "confirmava" que guardou; agora abre o cache a cada operação;
  4. "Leitor de texto do scanner ✓" mentia depois de o navegador apagar o cache; o status confere os arquivos, e `manter()` baixa de novo o que a pessoa já tinha preparado;
  5. base de nomes do scanner e dados das 9 listas prontas (301 cartas) entram sozinhos com rede, uma vez por versão;
  6. começar uma partida guarda as imagens das listas em jogo em segundo plano;
  7. `manter()` roda uma passada por vez, também ao voltar para o app (a aba suspensa perde o evento "online"), no máximo a cada 10 min; fila única de imagens: dois fluxos não baixam a mesma URL duas vezes;
  8. Wi-Fi sem internet (o navegador diz "online", nada responde) era classificado como "visualizador restrito", com texto errado e sem o chip; agora é "sem conexão";
  9. service worker sem rede e sem cópia respondia 503 e o app retentava 3 vezes (~1,4 s) com "erro 503"; agora é falha de rede imediata;
  10. lista aberta sem rede diz "não conferida" (aviso) em vez de "não reconhecida" (erro) para carta sem dados;
  11. a contagem "Imagens do jogo" inclui a grande (mão e zoom), não só a pequena.
- **Testes corrigidos (passavam sem testar):** asserção da coleção que tinha virado comentário no `O1`; tautologia no teste do leque; teste do tema que não olhava o documento (agora injeta um documento falso e confere `data-theme` e o botão); duas esperas assíncronas no e2e que passavam na hora (Playwright não espera função assíncrona) viraram laços de consulta.
- **Declarado, sem mudança:** A13 · o rename "Bot amador → Shark" ao abrir partida salva não alcança partidas gravadas antes do motor v57, porque a mesa recusa qualquer partida de motor diferente (regra que já existia). O código fica para as próximas mudanças de nome; a frase "partidas antigas abrem como Shark" vale só para partidas do v57.
- **Ficou de fora (próximas levas):** aquecer imagens da coleção em tamanho grande (dobra o volume); adicionar impressão sem rede (busca na Scryfall por natureza); testes com o service worker real (hoje o e2e o bloqueia).
- **Portão:** 499 verdes (454 + 45 e2e); motor v57; goldens: só `commander-7`, pelo motivo acima.

**Q9 · Homologação dos épicos O, C (C10–C14), X (X9–X10) e A (A13–A16), 28/09/2026** ✅
- **Valor:** as últimas 15 levas foram entregues sem teste em aparelho; uma revisão independente e uma bateria de ponta a ponta procuraram o que escapou antes de seguir.
- **Como:** revisor sem contexto da implementação leu o código das levas; cada achado virou teste que falha na versão anterior e passa na corrigida (`homologacao.unit.test.mjs`, e2e `HOMOLOGAÇÃO 1–5`).
- **Achados e correções:**
  - H1 prévia de combate: criatura que sai do campo por outro caminho (ficha, exílio) agora conta como morta na prévia.
  - H2 link de filtro: valores com `&` e vários critérios sobrevivem à recarga (hash codificado).
  - H3 leitor ao vivo: depois de quadros vazios, a mesma carta pode ser lida de novo.
  - H4 marcar com toque duplo: desfazer não devolve chave crua nem carta já zerada.
  - H5 vida no Commander: botões do diálogo usavam o componente errado e não respondiam.
  - H6 link de filtro não sequestra o endereço quando você já saiu da Coleção.
  - H7 desfazer importação subtrai só o que a importação somou; edições feitas depois ficam.
  - H8 toque duplo em Importar, Desfazer, Resolver pendência, Descartar e Enviar lote não duplica.
  - H9 pilha de terrenos: virado separado de desvirado; terreno com marcador, dano ou anexo fica sozinho.
  - H10 toque longo no iPhone não abre o menu de imagem; a espiada fecha ao trocar de tela.
  - H11 guardião offline da coleção não roda duas passagens ao mesmo tempo.
  - H12 resumo do turno diz o que saiu do campo sem morrer (ficha, exílio).
  - H13 enjoo de invocação respeita ímpeto concedido por efeito, não só impresso.
  - H14 motivo das jogadas do bot aparece também na linha do tempo.
  - Logo da barra superior com alvo de toque de 44 px.
- **Declarado, sem mudança:** H15 — o filtro de identidade de cor não inclui incolores a menos que "C" esteja marcado. É intencional (identidade vazia não é subconjunto marcado pelo usuário); fica registrado aqui.
- **Expectativas alteradas, com motivo:** A13 pilhas de terreno (agora 2, por H9); C12 hash `f=e%3Dcmm` (H2); C11 desfazer mantém a resolução feita depois (H7).
- **Auditoria de tela:** todas as telas em claro e escuro, sem rolagem horizontal e com alvos ≥ 44 px (e2e `HOMOLOGAÇÃO 1`); partida inteira contra o bot profissional (`HOMOLOGAÇÃO 5`).
- **Só o aparelho confirma:** toque longo no iOS, OCR com fotos reais, desempenho da coleção grande no celular.
- **Portão:** 448 verdes (409 unidade/fuzz/golden + 39 e2e); motor v56 inalterado; goldens inalterados.

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

**M13 · Regras específicas de Commander** ✅ (leva 81: identidade na mana e volta à zona de comando; leva 103: parcerias e mana pelos terrenos do oponente)
- **Entregue (leva 81, E36):**
  - identidade de cor do comandante fixada no jogador ao começar (903.4); dois comandantes somam as identidades;
  - "one mana of any color in your commander's color identity": Command Tower (lida do texto) e Arcane Signet (script, agora completo) só geram cores da identidade; comandante incolor ou partida sem comandante não gera nada, nem {C} (rulings de 10/11/2020, conferidos na Scryfall em 29/09/2026);
  - comandante que vai para cemitério, exílio, mão ou grimório: o dono decide se volta para a zona de comando (903.9a/b, conferido em 29/09/2026); dois de uma vez, uma pergunta de cada; bots e goldfish sempre levam;
  - mesa: aviso "X saiu do campo" com "Zona de comando" e "Deixar no cemitério/exílio/mão/grimório"; linha do tempo registra a escolha.
- **Sem rede:** tudo roda no motor, no aparelho; passo novo no `e2e · O1` (Commander sem internet, comandante exilado volta para a zona de comando).
- **Simplificação declarada:** para mão e grimório a regra é de substituição (o comandante nem chega lá); no motor a pergunta vem logo depois da mudança de zona. O resultado só difere para efeitos que olham a mão ou o grimório nesse intervalo, e nenhuma carta das listas faz isso.
- **Testes:** `commander.unit.test.mjs` (11, todos falham na versão anterior), e2e `M13` na mesa, passo no `e2e · O1`; `commander-7` regravada: a partida-referência agora passa por 4 decisões de zona de comando (2 sim, 2 não).
- **Entregue (leva 103, M13b):**
  - validação de lista com dois comandantes (702.124, regras de 07/06/2024 conferidas em 30/09/2026): "Partner" nos dois, "Partner with" um nomeando o outro, "Friends forever" nos dois, "Choose a Background" + Antecedente lendário (o Antecedente deixa de ser "não pode ser comandante" só nesse par), "Doctor's companion" + Doutor (criatura lendária só Time Lord Doctor); variantes não se misturam (702.124f); identidade soma os dois;
  - variante "Partner—…" que o app não conhece vira **aviso** para conferir, nunca aprovação nem erro;
  - "any color that a land an opponent controls could produce": Exotic Orchard (lida do texto) e Fellwar Stone (script, agora completo). Rulings do Exotic Orchard de 01/02/2009, conferidos na Scryfall em 30/09/2026: nunca {C}; terreno virado ou com custo conta; dois Orchards sozinhos não geram nada; uma Forest de qualquer lado habilita os dois. Fellwar sem cor possível é recusada e fica desvirada.
- **Fora (declarado):** o efeito dos Antecedentes na partida ("Commander creatures you own have …") depende do script de cada carta; nenhum está nas listas prontas. Doctor's companion validado pela linha de tipo, sem carta real nas listas.
- **Valor:** o Commander completo sem lembrar exceções.
- **Aceite:**
  - substituição do comandante para a zona de comando (escolha);
  - partner e background ✅ (leva 103);
  - identidade de cor aplicada à mana produzida ✅ (leva 81).
- **Testes:** U (`commander.unit.test.mjs`, 3 novos da M13b; `decks.unit.test.mjs`, 5 novos de parceria).
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

**A12 · Listas prontas e escolha do modo de jogo** ✅
- **Problema que resolveu:** o motor sabia jogar as sete listas Pauper, mas não havia caminho no
  aplicativo para chegar nelas: a tela Jogar só oferece listas salvas, e não havia nenhuma. Falha
  minha de sequência — o motor andou 30 levas sem que os decks entrassem no app.
- **Valor:** em dois toques o usuário tem um deck real na estante e começa uma partida no modo dele.
- **Aceite:**
  - `/listas/prontas` mostra as nove listas que vêm com o app, com formato e número de cartas;
  - filtro por modo de jogo (Todas · Pauper · Commander), com estado vazio próprio;
  - "Adicionar" põe a lista na estante e vira "já na sua estante"; não dá para adicionar duas vezes;
  - "Adicionar todas" respeita o filtro e avisa quando já estão todas lá;
  - a tela Jogar ganhou o seletor de modo de jogo, que filtra as listas suas e do oponente, e avisa
    quando você não tem lista naquele modo;
  - o estado vazio da tela Jogar e o da tela Listas levam para as listas prontas.
- **Como o dado entra:** a lista pronta é texto no mesmo formato de uma exportação de Moxfield e passa
  pelo mesmo `parseDeckText`. Não existe um segundo caminho de dados.
- **Declarado:** as sete listas do Pauper têm 75 cartas no deck principal porque a origem não separava
  a reserva; a validação trata isso como aviso, não erro, e o usuário pode editar a lista e mover 15
  cartas para a reserva. As duas de Commander têm 100 cartas com o comandante, e o companheiro do
  Killian fica fora das 100, como manda a regra.
- **Testes:** U (as nove leem sem sobra, formato e contagem certos, comandante e companheiro nas de
  Commander, nenhuma passa de 4 cópias no Pauper) e integração headless (filtrar, adicionar, não
  adicionar duas vezes, ver o selo do formato na estante e escolher o modo na tela Jogar).
- **Fora:** editar a lista pronta sem antes adicioná-la; separar a reserva automaticamente.

**A10 · Cobertura antes da partida** ✅
- **Valor:** saber antes o que o motor resolve sozinho.
- **Aceite:**
  - selo por carta na galeria da lista (✓ completo, ◐ parcial, ✎ manual) com o motivo;
  - resumo na lista: percentual completo, contagem por nível e as cartas que você vai precisar adjudicar;
  - na preparação da partida, a mesma cobertura da lista escolhida.
- **Testes:** I, U.
- **Depende de:** S2.
- **Fora:** —

**A13 · Mesa de verdade: leitura instantânea do campo** 🟡
- **Valor:** olhar a tela e entender a partida em dois segundos, sem decorar convenções.
- **Aceite:**
  - zonas com hierarquia visual clara (campo, terrenos, mão, pilha, cemitério e exílio), cada uma com
    contagem e estado vazio próprio;
  - estado da carta legível sem tocar: virada, enjoo, atacando, bloqueando, marcadores, alvo de mágica,
    encantada por aura, ficha;
  - carta maior no campo, com nome, custo e P/T sempre legíveis em tela de celular;
  - movimento curto quando a carta muda de zona (até 200 ms), respeitando "reduzir animações" do sistema;
  - tudo em tokens `ds-*`, sem estilo solto, com alvo de toque de 44px.
- **Entregue (leva 77):** a carta do campo cresceu (64 → 84 px; mão 100 px) e passou a dizer tudo sem
  toque: **nome** numa faixa por cima da arte, **P/T atual** da criatura (marcadores, bônus e dano já
  contados, pelo mesmo cálculo do motor), **anel de estado** (vermelho = ataca, dourado = bloqueia,
  tracejado = alvo de mágica na pilha), selos de enjoo (só criatura sem ímpeto) e ficha, pílulas para
  marcadores, dano, aura anexada ("→ Sky Pike") e encantada ("com Pacifism"); o atacante ou bloqueador
  escolhido já mostra o anel antes de confirmar. **Terrenos iguais viram uma pilha** ("×4 · 2 virada(s)";
  tocar age no primeiro desvirado) e as zonas contam cartas de verdade ("Terrenos · 4"). Quem entra no
  campo ganha um movimento de 180 ms, desligado com "reduzir animações". Tudo em tokens.
- **Decisão:** o estado da carta é calculado num módulo puro (`estadoDaCarta`, `agrupaTerrenos` em
  table-model), então cada marca tem teste sem navegador; a tela só desenha.
- **Testes:** U (P/T com marcadores, bônus e dano; terreno sem P/T nem enjoo; ímpeto sem selo; anel e
  marcas de ataca, bloqueia, alvo, ficha, anexada e encantada; plano de ataque/bloqueio antes de
  confirmar; pilhas de terreno com total, viradas e primeira desvirada), V (tamanhos, nome e P/T, anéis
  só com tokens, movimento ≤ 200 ms e desligado em "reduzir animações"), I headless (pilha de Island
  ×2 virada para pagar, zona contando 2, Sky Pike com 2/1 e enjoo que passa no turno seguinte, movimento
  de entrada, anel de ataque no planejamento; testes existentes da mesa, do bot e do offline seguem).
- **Depende de:** A1, A6.
- **Fora:** arte animada; mesa em 3D; P/T na mão (a carta da mão mostra a arte inteira).

**A14 · A pilha explicada** 🟡
- **Valor:** entender o que está acontecendo, principalmente no motor completo, onde o motor decide sozinho.
- **Aceite:**
  - a pilha aparece como uma coluna de cartões, do topo para baixo, cada um com quem controla, o que faz
    em português e qual é o alvo;
  - o que vai resolver a seguir fica destacado, e a mesa diz de quem é a prioridade;
  - o registro vira uma linha do tempo por turno, agrupada por fase, em linguagem de jogador;
  - quando uma ação é recusada, a mesa explica o motivo em uma frase, no lugar de um aviso genérico.
- **Entregue (leva 78):** a pilha virou uma **coluna de cartões** do topo para baixo: miniatura, nome
  ("Habilidade de X" para habilidades), **de quem é**, **o que faz em português** (dicionário de efeitos do
  motor: "causa 3 de dano a qualquer alvo", "compra 2 cartas", "cria 2 fichas de Goblin 1/1"…; permanente
  = "entra no campo de batalha"; carta sem script = primeira linha do oracle ou "você aplica o efeito na
  mesa") e **o alvo** ("→ Goldfish"). O que resolve a seguir vem destacado com "resolve a seguir", e o
  cabeçalho diz **"Prioridade: Ana"**. **Ação recusada** vira uma frase na mesa, no lugar do aviso
  genérico: "Não dá para jogar o terreno Island agora. Já jogou terreno neste turno." + dica por tipo de
  motivo (prioridade, tempo, mana, custo, alvo); some na próxima ação válida. O **registro** virou linha
  do tempo: turno mais recente primeiro, cada um agrupado por fase (Mão inicial, Início, Principal 1,
  Combate, Principal 2, Final), e cada linha do registro agora sabe o turno e o passo em que aconteceu.
- **Decisão:** um gancho de teste (`window.__estanteMesa`, só com `window.__MTG_TEST`) permite ao
  portão provocar uma recusa que a folha de ações nunca oferece; em uso normal não existe.
- **Testes:** U (dicionário de efeitos, um a um, e o desconhecido aparecendo pelo nome; pilha explicada
  com habilidade, mágica com script, permanente e carta sem script, alvos e prioridade; recusa por código
  com título, motivo e dica; linha do tempo por turno e fase e a mesa gravando turno/passo de cada
  linha), V (cartão da pilha com 44 px, destaque do topo por token), I headless (hot-seat com Counterspell
  na mão do outro para a pilha esperar: cartão com quem/o que faz/"resolve a seguir"/prioridade; segundo
  terreno recusado com a frase na mesa e sumindo na próxima ação; linha do tempo com o turno mais recente
  primeiro, fases nomeadas e sem separadores soltos).
- **Depende de:** A4, A13.
- **Fora:** modo tutorial guiado; ver na tela a pilha de uma habilidade que ninguém pode responder (ela
  resolve sozinha antes de aparecer — o registro conta o que aconteceu).

**A15 · Ler a carta sem sair da partida** 🟡
- **Valor:** conferir o texto no meio da jogada, com uma mão.
- **Aceite:**
  - toque longo amplia a carta com o texto de oracle e os marcadores dela; soltar fecha;
  - dentro da ampliação, as ações legais daquela carta continuam disponíveis;
  - funciona igual na mão, no campo, na pilha e nas zonas abertas.
- **Entregue (leva 79):** **segurar** qualquer carta (mão, campo, pilha de terrenos, pilha de mágicas,
  cemitério/exílio abertos, escolha de cartas) abre a carta grande por cima da mesa: arte, nome, tipo,
  custo, zona, **P/T atual**, estado (virada, enjoo, ataca, marcadores…), texto de regras e **"Pode
  agora:"** com as ações legais daquela carta como chips (as mesmas da folha). **Soltar fecha**, e o
  clique que o navegador dispara ao soltar é engolido — segurar nunca vira toque simples. Um **toque
  curto** continua abrindo a folha para agir. Arrastar (rolar a faixa) cancela; o menu de contexto do
  navegador não aparece enquanto segura; vibração curta ao abrir.
- **Decisão:** dentro da ampliação as ações são **só leitura** (chips): com um dedo segurando, tocar num
  botão não é gesto de uma mão. Agir é um toque curto na mesma carta — a folha e o espiar saem da mesma
  lista (`acoesDe`), então nunca divergem.
- **Testes:** U (gesto: segurar abre, soltar fecha, o clique seguinte é engolido e o próximo é normal;
  toque curto passa; arrastar cancela; botão direito não conta; menu de contexto bloqueado; cancelamento
  antes do tempo não abre), V (sobreposição fixa sem roubar o toque, proporção da carta, animação só sem
  "reduzir animações", só tokens), I headless (mão: espiar com P/T, tipo, zona e chip "Conjurar", sem
  abrir a folha; soltar sem virar toque; toque curto abre a folha; campo com estado "enjoo"; pilha de
  terrenos).
- **Depende de:** A13, D5.
- **Fora:** rulings na mesa (V2); teclado (o espiar é gesto de toque; a folha cobre leitura e ação).

**A16 · Prévia de combate e resumo do turno** 🟡
- **Valor:** decidir ataque e bloqueio sem contar de cabeça.
- **Aceite:**
  - ao montar o ataque, a mesa mostra o dano que passa, quem morre dos dois lados e a vida resultante;
  - ao montar o bloqueio, a mesma prévia, atualizada a cada toque;
  - no fim do turno, um resumo curto: vida, cartas compradas, o que entrou e o que morreu.
- **Entregue (leva 80):** ao escolher atacantes, a faixa diz "Se ninguém bloquear: Bia 20 → 18 ·
  ninguém morre." (e "É letal." quando é), atualizada a cada toque. No bloqueio, a mesma frase com os
  bloqueios escolhidos: vida antes → depois de cada jogador, "morrem seus" / "morrem do outro lado";
  bloqueio ilegal (ameaça com um só) diz que não dá. Quando o turno vira, a mesa mostra o **resumo dos
  últimos turnos** (o seu e o do oponente, até o próximo OK): vida, quem comprou quantas, o que entrou no
  campo, o que foi para o cemitério. A prévia usa o próprio motor numa cópia do estado
  (`previewAttack`, `previewCombat` agora com a vida resultante e o lado de cada morto), então nunca
  diverge das regras.
- **Motor:** só leitura — duas funções de prévia, estado e partidas-referência inalterados (motor v56).
- **Testes:** U (a prévia bate com o combate real em sete cenários — simples, vínculo com a vida, toque
  mortífero, atropelar, golpe duplo com um sem bloqueio, ameaça bloqueada por dois com indestrutível,
  alcance contra voar —, prévia de ataque sem bloqueio igual ao real, prévia não muda o estado, bloqueio
  ilegal sem prévia; texto da prévia pelos dois lados e letal; resumo do turno com vida, compras, entrada
  e cemitério, e a mesa guardando o resumo do turno de verdade), V, I headless (goldfish: prévia do ataque
  e resumo com "Vida: Goldfish 20 → 18" mesmo com o goldfish jogando logo depois; hot-seat: prévia do
  ataque, do bloqueio sem e com Wall Guard).
- **Depende de:** M6, A13.
- **Fora:** sugerir o melhor bloqueio (isso é bot, B4); prévia com mágicas de combate que ainda não foram
  conjuradas.

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

**S66 · Partida guiada dos Elfos, ficha de Elfo e gatilho opcional de outra permanente** ✅
- **Valor:** os goldens aleatórios provam que o motor é determinístico; esta partida prova que as cartas
  **conversam entre si**. É uma sequência escolhida por mim, turno a turno, com o resultado conferido em
  cada passo: gatilho alimenta contagem, contagem alimenta mana, mana paga a próxima carta.
- **A corrente provada (P1):** Vanguarda entra → outro Elfo entra e ele ganha marcador → a Sacerdotisa
  gera um mana por Elfo no campo → conjurar um Elfo dispara a Caçadora, que pergunta se você quer a ficha
  → a ficha é um Elfo e conta na contagem → no turno seguinte o Vigia usa {T} e dá +5/+5 por cinco Elfos →
  o Vanguarda 5/5 ataca como 10/10 e leva o oponente a 10.
- **Segunda cena (P2):** o Arqueiro vira e derruba o voador do oponente; a Sacerdotisa gera três manas; o
  Patrulheiro devolve uma floresta para a mão como custo e desvira a Sacerdotisa, que gera mana de novo no
  mesmo turno.
- **Dois erros meus que a partida achou:**
  1. **A ficha da Lys Alana Huntmaster não era um Elfo** (nem verde), então não contava para a Sacerdotisa,
     para o Vigia nem para o Vanguarda — e o gatilho era obrigatório, sendo que a carta diz "você **pode**".
     Texto conferido em 27/09/2026 (mtgsalvation, confirmado pela busca): "Whenever you cast an Elf spell,
     you may create a 1/1 green Elf Warrior creature token."
  2. **Gatilho de "outra permanente" perdia as marcas do gatilho**: `optional`, custo, custo opcional e
     modos eram copiados no gatilho próprio e **descartados** no de outra permanente. Qualquer "você pode"
     nesse formato virava obrigatório. Hoje só a Caçadora usava isso nas listas, mas o buraco valia para
     todos.
- **Declarado:** os custos de mana desta partida são **de teste** ({1} para tudo), porque os custos
  oficiais dessas cartas não estão disponíveis neste ambiente. A partida prova a corrente de interações e o
  encanamento do mana, não a curva real do deck Elves.
- **Goldens regravados:** a sequência de ações das quatro partidas-referência é idêntica; mudou o hash
  porque a versão do motor entra no estado.
- **Testes:** partida guiada P1 e P2, com conferência a cada passo.

**S65 · Matriz de palavras-chave e combate** ✅
- **Risco que esta leva fecha:** a cobertura conta como **completa** toda carta cujo texto é só
  palavra-chave. Se uma dessas palavras não mudasse nada no combate, a lista jogaria errado em silêncio —
  e nenhum teste de carta pegaria isso, porque a carta "não tem script para testar".
- **Aceite:** um cenário de partida por palavra-chave, com o resultado conferido no estado:
  voar e alcance no bloqueio, atropelar passando o excesso, toque mortífero matando com 1 de dano,
  indestrutível sobrevivendo ao toque mortífero e à destruição, vínculo com a vida dando vida,
  vigilância não virando, pressa atacando no turno em que entra, iniciativa matando antes do troco,
  golpe duplo somando dois golpes, ameaça exigindo dois bloqueadores, defensor ficando em casa,
  lampejo conjurando no turno do outro, ilusão barrando só o oponente e véu barrando os dois.
- **Teste de completude (K12):** a lista de palavras-chave do motor é comparada com as provadas aqui. Uma
  palavra-chave nova sem cenário **derruba o portão** — não dá mais para declarar que o motor resolve algo
  sem mostrar onde isso muda a partida.
- **Combate além das palavras-chave:** dois bloqueadores dividindo o dano e somando o troco no atacante;
  criatura bloqueada não causando dano ao jogador; atacar virando quem não tem vigilância.
- **Resultado:** nenhum erro encontrado — as quinze palavras-chave que o motor declara resolver mudam a
  partida como deveriam. A leva não corrige nada; ela fecha um buraco de verificação.
- **Fora, declarado:** proteção por cor não é palavra-chave da lista do motor (é efeito, coberto na S43);
  quais cartas das listas carregam cada palavra-chave depende dos dados buscados na Scryfall, então isso
  é conferido no aparelho, não aqui.

**S64 · Lista guardada no aparelho para jogar sem internet** ✅
- **Decisão de rota, declarada:** o plano dizia "embutir os dados das cartas das listas prontas no
  aplicativo". Não deu para fazer assim: **este ambiente não alcança a Scryfall** (a saída de rede é
  restrita), e as sete listas somam ~170 cartas cujos dados oficiais eu não tenho aqui. Escrever custo,
  tipo e força de memória é exatamente o que o projeto proíbe. Então o app passou a **guardar** o que ele
  mesmo busca, sem prazo de validade — o resultado para você é o mesmo (a lista joga sem internet), com
  uma diferença honesta: **é preciso uma preparação com rede, uma vez por lista**.
- **Aceite:**
  - a tela de jogar mostra quantas cartas da lista já estão guardadas, e o botão
    **"Guardar para jogar sem internet"** busca o que falta e guarda;
  - carta guardada **não vence** — o prazo de sete dias não vale para ela, e sem rede ela responde do
    aparelho;
  - ao começar uma partida, as cartas que acabaram de vir da rede são guardadas sozinhas: quem jogou uma
    vez com internet joga de novo sem;
  - o botão diz quantas guardou e quantas a rede não trouxe, em vez de fingir sucesso;
  - **motor completo não começa sem os dados das cartas**: sem tipo, custo e força o motor jogaria errado
    em silêncio. A mesa explica e oferece a mesa assistida.
- **Fora:** os dados não viajam no `index.html`. Se você nunca abrir a lista com internet, ela não fica
  guardada — e a tela diz isso em vez de prometer o contrário.
- **Testes:** U (carta guardada respondendo um mês depois sem nem tentar a rede, e o relato do que a rede
  não trouxe), I headless (o botão aparece com "0 de N guardadas" e o número muda depois do toque).

**S63 · Auditoria dos gatilhos, e a mão inicial que contava como compra do turno** ✅
- **Valor:** fecha o buraco declarado na S62. Agora o portão prova as três pontas de cada carta das listas
  Pauper: a mesa **oferece** (A14/A15/A16), o gatilho **dispara** (A17) e o efeito **faz a coisa certa** (S8).
- **A17 · cada gatilho é provocado de verdade numa partida:** entrar no campo, morrer, sair do campo,
  atacar, causar dano de combate ao jogador, ser conjurada, outra criatura entrando, morrendo, saindo ou
  sendo **sacrificada** (sacrifício de verdade, não "mover para o cemitério"), receber marcadores de um
  efeito, a manutenção, a segunda fase principal, o fim do combate e a terceira compra do turno.
- **Bug que a auditoria achou:** a **mão inicial contava como compra do turno**. `drawnThisTurn` começava
  em 7 (ou 14, com mulligan), então "quando você compra a terceira carta do turno" disparava **antes do
  jogo começar** e nunca disparava no primeiro turno. No Rakdos Madness isso é o Sneaky Snacker, que volta
  do cemitério. Corrigido: as compras da mão inicial e dos mulligans são zeradas quando a partida começa.
- **A18 · gatilhos condicionais ficam declarados:** Faerie Miscreant (outra com o mesmo nome),
  Troublemaker Ouphe (barganha) e Vitu-Ghazi Inspector (colher provas) não são provocados pela A17 porque
  a condição depende do que foi pago na conjuração. O teste lista os três: se aparecer um quarto, ele cai
  na revisão em vez de sumir.
- **O que ainda não tem driver, declarado no próprio arquivo:** gatilhos de aura que observam a criatura
  encantada (`enchanted-deals-damage`, `enchanted-tapped-or-damaged`) e os gatilhos de sala de masmorra,
  cobertos pelos testes S57–S61.
- **Goldens regravados:** a sequência de ações das quatro partidas é idêntica; mudou o hash porque o estado
  do jogador não carrega mais as compras da mão inicial.
- **Testes:** U (mão inicial e mulligan não contando, e o gatilho da terceira compra trazendo a carta do
  cemitério no primeiro turno), auditoria A17/A18 sobre as sete listas.

**S62 · Enjoo de invocação só prende o {T} da própria carta, e auditoria das listas Pauper** ✅
- **O bug que o usuário achou:** a habilidade da **Jaspera Sentinel** ("{T}, Vire uma criatura desvirada
  que você controla: adicione um mana de qualquer cor") não aparecia na mesa quando a única outra criatura
  tinha entrado naquele turno. A regra 302.6 prende o enjoo de invocação apenas ao {T} **da própria
  permanente**; virar OUTRA criatura como custo aceita criatura recém-chegada. Regra conferida na ruling
  oficial da carta em 27/09/2026: "You can tap any untapped creature you control, including one you
  haven't controlled continuously since the beginning of your most recent turn."
- **Alcance da correção:** valia para todo custo "vire outra criatura", não só a Jaspera —
  **Saruli Caretaker**, **Birchlore Rangers** e o lampejo do passado do **Battle Screech** (quatro cópias
  no Boros Bully) sofriam do mesmo.
- **Camada de teste nova — auditoria das listas (`pauper.audit.test.mjs`):** o cenário S8 prova que o
  efeito funciona quando é executado; ele não prova que dá para **chegar** nele numa partida. A auditoria
  monta uma mesa farta (quatro criaturas, dois terrenos, artefato, encantamento, cemitério povoado,
  permanentes e mágicas do outro lado) e exige que o motor ofereça:
  - **A14** · toda habilidade ativada das listas Pauper;
  - **A15** · a conjuração de toda carta das listas Pauper;
  - **A16** · o custo "vire outra criatura" numa mesa **recém-montada**, com tudo enjoado — o cenário exato
    do relato. Sem a correção, A16 acusa as três cartas de uma vez.
- **O que a auditoria ainda não cobre:** que o **resultado** do efeito esteja certo (isso é o S8, um
  cenário por script) e que os **gatilhos** disparem numa partida de verdade. A auditoria dos gatilhos é a
  S63.
- **Correção de dado de teste:** a linha de tipo da Jaspera Sentinel estava como Elf Warrior; a carta é
  Elf Rogue. Não mudava contagem de Elfos, mas era dado errado no repositório.
- **Testes:** U (custo virando criatura enjoada e gerando mana, com cobrança de mana ligada), auditoria
  A14/A15/A16 sobre as sete listas.

**S61 · Masmorra do Mago Louco: jogar do exílio, conjurar sem pagar — Secret Door completa** ✅
- **Valor:** a quarta e última masmorra. Com ela a **Secret Door deixa de ser parcial** e o Walls Combo
  fecha em 100%: as sete listas Pauper agora rodam no modo motor completo.
- **Texto conferido:** 26/09/2026, em mtg.wtf (lista de cartas de masmorra).
- **Aceite:**
  - as nove salas: Portal Bocejante → Nível da Masmorra → Bazar dos Goblins ou Cavernas Retorcidas →
    Nível Perdido → Cavernas das Runas ou Cemitério de Muiral → Minas Profundas → Covil do Mago Louco;
  - **não pode atacar até o seu próximo turno** (Cavernas Retorcidas): a criatura sai da lista de
    atacantes e volta quando o seu turno começa;
  - **jogar do exílio** (Cavernas das Runas): as duas cartas exiladas do topo ficam jogáveis por você, sem
    prazo; terreno gasta o terreno do turno e mágica paga o custo normal. Na mesa, elas aparecem tocando
    na zona de exílio;
  - **conjurar sem pagar** (Covil do Mago Louco): compra três e você escolhe uma para conjurar de graça, ou
    recusa. Por ser durante a resolução, não valem a restrição de fase nem a de pagar (608.2f) — e isso
    funciona também no motor completo, onde conjurar de graça à mão livre continua proibido.
- **Simplificações declaradas:** "compre três e **revele**" não modela a revelação (nada muda contra o
  goldfish; num hot-seat, o oponente não vê as cartas). Provocar não exige "ataque outro jogador" porque a
  mesa tem dois jogadores (S59). A masmorra é marcada como completa ao entrar na última sala, e não quando
  a habilidade dela sai da pilha (S57).
- **Testes:** U (criatura impedida de atacar no turno do oponente e liberada no seu; as duas cartas do
  exílio oferecidas, terreno jogado gastando o terreno do turno e mágica conjurada de lá; Covil com as três
  compradas, recusa mantendo tudo na mão e conjuração gratuita sem um único terreno em jogo, com cobrança
  de mana ligada; percurso das nove salas até o Covil e as quatro masmorras na escolha), S8 na Secret Door.
- **Cobertura real:** as sete listas Pauper em 100%, medidas com a mesma função da tela de jogar.

**S60 · Tumba da Aniquilação: perder ou pagar, e sacrificar escolhendo** 🟡
- **Valor:** a terceira das quatro masmorras. Falta uma para a Secret Door fechar.
- **Texto conferido:** 26/09/2026, em mtg.wtf (lista de cartas de masmorra).
- **Aceite:**
  - as cinco salas: Entrada Armadilhada → Véus do Medo ou Oubliette → Cela de Areia → Berço do Deus da Morte;
  - **"cada jogador perde 2 a menos que …"**: cada um decide na sua vez, começando por quem controla o
    efeito; quem não tem como pagar perde sem ser perguntado;
  - **sacrifício escolhido por você**, dentro do tipo pedido (criatura, artefato, terreno): na mesa, toque
    na permanente ou use os botões; com um único candidato, vai sozinho;
  - **Oubliette** encadeia quatro decisões suas: descarte, criatura, artefato e terreno;
  - **O Atropal**: ficha lendária 4/4 preta de Deus Horror com toque mortífero.
- **Correção de motor (bug antigo, achado aqui):** o descarte pedido por um efeito **não retomava o resto
  do efeito**. "Descarte uma carta, compre duas" perdia a compra. Nenhum script da biblioteca tinha
  descarte no meio de uma sequência, então nunca apareceu em partida — o Oubliette foi o primeiro a exigir.
  Tem teste próprio agora.
- **Parcial declarada:** **Secret Door** segue parcial: falta a Masmorra do Mago Louco, que precisa de
  jogar cartas do exílio e conjurar sem pagar o custo. Uma leva.
- **Testes:** U (Véus do Medo com quem controla pagando o descarte e o oponente escolhendo perder;
  Oubliette com as quatro decisões e a recusa de sacrificar a permanente do tipo errado; ninguém com carta
  na mão perdendo sem pergunta; O Atropal 4/4 lendário com toque mortífero fechando a Tumba; descarte por
  efeito retomando a compra), S8 na Secret Door.

**S59 · Cidade Baixa: provocar e o Trono dos Três Mortos** 🟡
- **Valor:** a segunda das quatro masmorras, e a primeira vez que a mesa pergunta **em qual** masmorra
  você quer entrar.
- **Texto conferido:** 26/09/2026, em mtg.wtf (lista de cartas de masmorra).
- **Aceite:**
  - as nove salas da Cidade Baixa, com as bifurcações: Entrada Secreta → Forja ou Poço Perdido →
    Armadilha!, Arena ou Esconderijo → Arquivos ou Catacumbas → Trono dos Três Mortos;
  - **provocar** (Arena): até o próximo turno de quem provocou, a criatura ataca se puder — a mesa não
    oferece mais "sem ataque", inclui a provocada em todo conjunto oferecido e recusa a declaração que a
    deixa em casa;
  - **Trono dos Três Mortos**: revela as dez do topo, põe uma criatura no campo com três marcadores
    +1/+1 e ilusão até o seu próximo turno, e embaralha o resto; com criatura no topo, pôr é obrigatório;
  - palavra-chave concedida **até o seu próximo turno** (antes só existia até o fim do turno).
- **Simplificação declarada:** provocar também diz "e ataca um jogador que não seja você, se puder".
  Com dois jogadores na mesa não há como satisfazer isso, então a exigência que sobra é atacar. Numa
  mesa de três ou mais isso precisa voltar em `mustAttack`.
- **Correção de bug de tela:** dois avisos da mesa (o par do vínculo de alma e, agora, a provocada)
  chamavam uma função que mora no módulo do modelo e não existe no módulo da tela. Qualquer partida que
  abrisse a pergunta do vínculo de alma — Galvanic Alchemist, que está no Walls Combo — quebrava a tela.
  Nunca apareceu no portão porque nenhum teste headless chegava a essa pergunta.
- **Parcial declarada:** **Secret Door** segue parcial: faltam a Tumba da Aniquilação e a Masmorra do
  Mago Louco na escolha. A Tumba precisa de "perde 2 a menos que descarte/sacrifique" (escolha por
  jogador); o Mago Louco precisa de jogar cartas do exílio e conjurar sem pagar. Duas levas.
- **Testes:** U (provocada recusando ataque vazio e ataque sem ela, opções da mesa incluindo a provocada,
  provocação caindo no turno de quem provocou; percurso da Cidade Baixa até o Trono com o Esqueleto 4/1
  com ameaça, criatura entrando com três marcadores e ilusão, ilusão durando o turno do oponente e
  caindo no seu; escolha da masmorra aparecendo com as duas opções), S8 na Secret Door.

**S58 · Terreno básico embutido e cobertura pelo nome da lista** ✅
- **O erro que esta leva corrige:** o usuário viu Boros Bully e Walls Combo abaixo de 100% no celular
  enquanto a minha medição dizia 100%. Causa real: a tela calcula a cobertura com os dados de carta
  **buscados na Scryfall**, e o que não vem na resposta conta como "carta desconhecida" — inclusive os
  **terrenos básicos**. Boros Bully tem 11 básicos em 75 cartas: exatamente os 15% que faltavam (85%).
  Walls Combo tem 12 Forest: 83%. A minha ferramenta nunca viu isso porque ela **fabricava** os básicos.
- **Consequência pior que o número:** o modo "motor completo" só libera com 100%, então a lista ficava
  trancada na mesa assistida. E numa partida sem rede o básico entrava sem tipo e não dava mana.
- **Aceite:**
  - os cinco básicos existem dentro do app (tipo e mana), e voltam da tabela embutida quando a busca não
    traz nada — a cobertura e a partida não dependem de rede para eles;
  - a cobertura acha o script pelo **nome da lista**, não só pelo nome devolvido pela busca: apóstrofo
    curvo, acento e nome de carta de duas faces ("A // B") não derrubam mais a carta para "sem script";
  - "carta não encontrada" guardada no cache vale **um dia**, não uma semana;
  - a tela de jogar diz **quais** cartas ficam com você e mostra a **versão do motor** — sem isso, "97%"
    não diz nada e uma versão antiga em cache parece bug de regra.
- **Cobertura real, medida nos dois cenários** (a ferramenta agora mede os dois):
  com texto buscado, seis listas Pauper em 100% e Walls Combo em 99%; **sem rede nenhuma**, Mono Blue
  Faeries, Rakdos Madness e Boros Bully também em 100%.
- **O que ainda depende da busca:** Gladecover Scout, Slippery Bogle (GW Bogles), Llanowar Elves,
  Elvish Mystic (Elves) e Vault of Whispers (Jund Wildfire) não têm script — são cobertas pelo texto,
  então sem o texto buscado caem para manual. Fechar isso é embutir os dados das cartas das listas
  prontas (S59), que também é o que faz a partida funcionar sem rede.
- **Testes:** U (cobertura com nome buscado diferente do nome da lista, inclusive "A // B"; lista dizendo
  qual carta fica na mão e por quê; básico vindo da tabela embutida com a rede fora; "não encontrada"
  valendo um dia), I headless (lista pronta Boros Bully em 100% e motor completo liberado com a Scryfall
  não conhecendo nenhuma carta da lista — antes desta leva a mesma tela mostrava 85%).

**S57 · Masmorra: aventurar-se, escolher a sala e completar** 🟡
- **Valor:** "aventure-se na masmorra" existe no motor, e a Secret Door do Walls Combo deixa de ser
  um botão que não faz nada.
- **Texto conferido:** 26/09/2026, em mtg.wtf. Secret Door: criatura artefato — Muro 0/4, {U},
  defensor, `{4}{U}: Aventure-se na masmorra. Ative somente como um feitiço.` As salas da
  Mina Perdida de Phandelver vêm da lista de cartas de masmorra do mesmo dia.
- **Aceite:**
  - sem masmorra, você entra na primeira sala; com masmorra, **você escolhe** para qual das saídas avançar;
  - o efeito da sala vai para a pilha como habilidade disparada, com alvo escolhido por você quando tem alvo;
  - na última sala a masmorra fica **completa**, conta no total do jogador, e a próxima aventura começa outra;
  - a masmorra e a sala atual aparecem embaixo do nome do jogador na mesa;
  - o goldfish escolhe masmorra e sala sozinho, em vez de desistir.
- **Mina Perdida de Phandelver, as sete salas:** Entrada da Caverna (scry 1) → Covil dos Goblins (ficha
  1/1 vermelha de Goblin) ou Túneis da Mina (ficha de Tesouro) → Depósito (+1/+1 numa criatura alvo),
  Poço Escuro (cada oponente perde 1, você ganha 1) ou Caverna dos Fungos (−4/−0 até o seu próximo
  turno) → Templo de Dumathoin (compre uma carta).
- **Regra nova de duração:** "até o seu próximo turno" agora existe; antes todo bônus temporário acabava
  no fim do turno. Ele atravessa o turno do oponente e cai quando o seu turno começa.
- **Simplificação declarada:** pela regra 309.6 a masmorra só é removida quando a habilidade da última
  sala **sai da pilha**; aqui ela é marcada como completa ao entrar na última sala. A diferença aparece
  só se você se aventurar de novo com essa habilidade ainda na pilha. Gatilhos de "quando você completa
  uma masmorra" não entram — nenhuma carta das listas tem um.
- **Parcial declarada:** **Secret Door** continua parcial. Das quatro masmorras de papel, só a Mina
  Perdida está montada, então você não escolhe a masmorra. Falta: Tumba da Aniquilação (perder vida a
  menos que descartar ou sacrificar), Cidade Baixa (provocar, revelar dez e pôr criatura em jogo) e
  Masmorra do Mago Louco (jogar cartas do exílio, conjurar de graça, não poder atacar até o próximo
  turno). São capacidades que o motor não tem — estimativa honesta: duas a três levas.
- **Goldens regravados:** a sequência de ações das quatro partidas-referência é **idêntica**; só mudou o
  hash, porque o estado de cada jogador agora carrega a masmorra e o total de masmorras completadas.
- **Testes:** U (primeira sala e o scry na pilha; a segunda aventura perguntando a sala, com Tesouro num
  caminho e Goblin vermelho no outro; percurso inteiro até o Templo, masmorra completa e a próxima
  começando na entrada; −4/−0 atravessando o turno do oponente e caindo no seu), S8 na Secret Door.
- **Cobertura real:** seis listas Pauper em 100%, Walls Combo em 99%.

**S56 · Terrenos das listas, medição honesta e gatilho com modos** 🟡
- **O erro que esta leva corrige:** eu anunciei "Pauper 100%" na leva 47 e no aplicativo os decks
  apareciam entre 84% e 97%. A culpa era da minha ferramenta de medição: o `.listas/medir.mjs` tinha uma
  **lista branca escrita à mão** de cartas que eu *supunha* que o motor resolvia lendo o texto — incluindo
  terrenos que entram virados, ciclam ou devolvem terreno. O aplicativo lê o texto real e contava essas
  cartas como manuais. A ferramenta me dava a resposta que eu queria ouvir.
- **Correção estrutural:** `medir.mjs` agora chama o **mesmo `deckCoverage`** da tela de jogar, com os
  textos reais guardados em `.listas/cartas.json` (conferidos na fonte, um por um). Nada de lista branca.
  A ferramenta também avisa quais cartas ainda não têm texto conferido, em vez de chutar que estão cobertas.
- **Aceite:**
  - terreno que entra virado, e o que entra virado **a menos que** alguém esteja com 13 ou menos de vida;
  - terreno que ao entrar devolve um terreno seu para a mão, ou causa 1 de dano, ou dá 1 de vida;
  - terreno que se sacrifica para buscar um básico de três tipos, com ciclagem;
  - permanente que dá **pressa a todas as suas criaturas**, e não às do oponente;
  - gatilho com **modos** ("vire **ou** desvire"): a mesa pergunta o que fazer, junto do alvo.
- **Entregue (13 completas):** Jagged Barrens, Razortrap Gorge, Rakdos Carnarium, Boros Garrison,
  Wind-Scarred Crag, Perilous Landscape, Twisted Landscape, Drossforge Bridge, Slagwoods Bridge,
  Salt Road Packbeast, Tuktuk Rubblefort, Sewer-veillance Cam, e os textos de Gladecover Scout,
  Slippery Bogle, Llanowar Elves, Elvish Mystic e Vault of Whispers conferidos como cobertos pelo texto.
- **Parcial:** **Secret Door** — aventurar-se na masmorra não entra, porque o motor ainda não tem masmorra.
  A habilidade só mostra o topo do grimório. É a única carta que separa o Walls Combo dos 100%.
- **Correção de motor:** no caminho do custo opcional de gatilho, os efeitos eram aplicados **sem o alvo**
  que o gatilho já tinha escolhido, então "desvire a criatura alvo" não fazia nada.
- **Testes:** U (terreno virado e desvirado pela vida do oponente, devolução do terreno escolhido, pressa
  só nas suas criaturas com ataque no turno em que entrou, gatilho com modos escolhendo desvirar e
  recusando), S8 com os nove terrenos tipados no cenário.
- **Cobertura real:** seis das sete listas em 100%; Walls Combo em 99%.

**S55 · Colher provas escolhida por você e tipo de criatura do campo** ✅
- **Aceite:**
  - **colher provas**: você escolhe quais cartas do cemitério exilar, e a escolha só fecha quando a soma
    do valor de mana alcança o número pedido — não dá para encerrar antes;
  - a escolha de tipo de criatura lista os tipos presentes no campo dos **dois** lados.
- **Entregue (as duas completas):** Vitu-Ghazi Inspector e Distant Melody.
- **Regra que mudou, com motivo:** colher provas era paga pelo motor, que exilava as cartas de maior valor.
  A carta diz que **você** escolhe, e a diferença é real: guardar o gigante no cemitério e gastar três
  criaturas pequenas muda o que sobra para reanimar depois. O teste da leva 32 foi reescrito.
- **Testes:** U (escolha recusando encerrar antes de somar 6, fechando sozinha ao somar, deixando no
  cemitério o que eu não escolhi, e o gatilho acontecendo depois; lista de tipos com a criatura do
  oponente e compra zero ao escolher o tipo dele), S8.

### Marco: Pauper em 100% — alcançado na leva 53, medido em dois cenários

| Lista | Com texto buscado | Sem rede nenhuma |
|---|---|---|
| Pauper Mono Blue Faeries | 100% | 100% |
| Pauper Rakdos Madness | 100% | 100% |
| Pauper Boros Bully | 100% | 100% |
| Pauper Walls Combo | 100% | 100% |
| Pauper GW Bogles | 100% | 89% |
| Pauper Elves | 100% | 92% |
| Pauper Jund Wildfire | 100% | 97% |

As três últimas caem sem rede porque cinco cartas delas não têm script — são cobertas pelo texto buscado
(Gladecover Scout, Slippery Bogle, Llanowar Elves, Elvish Mystic, Vault of Whispers). Embutir os dados das
cartas das listas prontas (S62) fecha isso e faz a partida funcionar sem internet.

### Histórico do marco: **anunciado errado na leva 47, corrigido na leva 48**

Este marco foi declarado com base numa medição minha que estava errada (ver S56). A contagem real,
medida pela mesma função que a tela de jogar usa, é a de baixo.

| Lista | Cobertura |
|---|---|
| Pauper Mono Blue Faeries | 100% |
| Pauper Rakdos Madness | 100% |
| Pauper GW Bogles | 100% |
| Pauper Boros Bully | 100% |
| Pauper Walls Combo | 99% na leva 48 · 100% desde a leva 53 (Secret Door completa) |

Medida também **sem rede** (leva 50): Mono Blue Faeries, Rakdos Madness e Boros Bully seguem em 100%;
GW Bogles 89%, Elves 92% e Jund Wildfire 97%, porque cinco cartas dessas listas são cobertas pelo texto
buscado e não por script. Embutir os dados dessas cartas é a S59.
| Pauper Jund Wildfire | 100% |
| Pauper Elves | 100% |

Falta montar as outras três masmorras para o Walls Combo fechar, e depois o Commander: 67 cartas manuais (42 no Killian,
25 no Malcolm) e 24 parciais.

**S54 · Metamorfose e esgueirar-se** 🟡
- **Aceite:**
  - **metamorfose**: conjurar a carta virada para baixo por {3}; virada para baixo ela é uma criatura 2/2
    **sem nome, sem palavra-chave, sem habilidade e sem subtipo**, e nenhum gatilho por subtipo a
    reconhece; virar para cima a qualquer momento pagando o custo de metamorfose devolve tudo;
  - **esgueirar-se**: no passo de declarar bloqueadores, pagar {W}, devolver para a mão um atacante seu
    sem bloqueio, e a criatura entra **virada e atacando**.
- **Entregue (todas completas):** Birchlore Rangers e Leonardo, Big Brother.
- **Como foi feito:** esgueirar-se entrou pelo mesmo caminho do ninjutsu, que já fazia a troca do atacante
  — a diferença é que aqui existe custo de mana. Metamorfose exigiu que força, resistência, palavras-chave,
  habilidades e filtro de subtipo passassem a olhar se a carta está virada para baixo.
- **Testes:** U (2/2 sem palavra-chave e sem habilidade enquanto virada, virar para cima devolvendo
  1/1 com voo e com a habilidade; esgueirar-se devolvendo o atacante e entrando virada e atacando), S8.
- **Resultado:** **Boros Bully em 100%** — sexta lista fechada. **Seis das sete Pauper em 100%.**
  Falta só Elves, com 2 cartas.

**S53 · Plot e custo adicional com opções** 🟡
- **Aceite:**
  - **plot**: pagar o custo e exilar a carta da mão, e conjurar de graça num turno **seguinte** — no mesmo
    turno a mesa não oferece;
  - custo adicional com **duas opções** ("descarte uma carta **ou** sacrifique um terreno") e **opcional**:
    a mesa oferece as duas opções e a de não pagar nada;
  - efeito que só acontece se o custo opcional foi pago ("se você fizer, compre duas cartas").
- **Entregue (completa):** Highway Robbery.
- **Correção:** a carta estava com o descarte como custo **obrigatório** e sem a opção de sacrificar
  terreno, então ela sempre cobrava uma carta da mão e sempre comprava duas — mais forte do que a carta
  real quando você não quer pagar, e mais fraca quando você só tem terreno para dar.
- **Testes:** U (as três opções de custo com o resultado de cada uma; plot exilando, recusando conjurar
  no mesmo turno e liberando no turno seguinte de graça), S8.
- **Resultado:** **Rakdos Madness em 100%** — quinta lista fechada. Faltam 2 cartas únicas nas Pauper.

**S52 · Vida pelo dano prevenido de fato e a face de trás que exila** 🟡
- **Aceite:**
  - "previna todo o dano que a mágica causaria; você ganha vida igual ao dano prevenido": a vida vem
    quando o dano é realmente prevenido, não na hora de conjurar;
  - a face de trás pode ter gatilho próprio ("quando outra criatura sua sai do campo") e regra estática
    ("se fosse para o cemitério, exile em vez disso").
- **Entregue (todas completas):** Hallow e Lunarch Veteran // Luminous Phantom.
- **Regra que mudou, com motivo:** o Hallow dava vida na hora de conjurar, calculada pelo dano que a
  mágica *diria* causar. Se a mágica fosse anulada, ou o alvo dela mudasse, a vida vinha do mesmo jeito.
  Agora a vida acompanha o dano que foi prevenido de verdade, e o teste da leva 27 foi reescrito.
- **Testes:** U (vida só depois de o raio resolver e ser prevenido; face de trás dando vida quando outra
  criatura sua morre e sendo exilada quando ela mesma morre), S8.
- **Resultado:** Boros Bully em 97%. Cópias parciais nas Pauper de 25 para 14, em 5 cartas únicas.

**S51 · Cemitério de qualquer um, mana convertido e par escolhido** 🟡
- **Aceite:**
  - "criatura ou terreno alvo de **um** cemitério": mira qualquer cemitério e volta para a mão do **dono**
    da carta, não para a de quem conjurou;
  - converter mana: pagar {G} e gerar a cor escolhida, sem virar a criatura;
  - vínculo de alma passou a sempre perguntar com quem emparelhar, com opção de **não emparelhar**;
  - a busca do verso da Sagu Wildling pede terreno **básico**.
- **Entregue (todas completas):** Pulse of Murasa, Orochi Leafcaller, Sagu Wildling e Galvanic Alchemist.
- **Correções — três notas minhas descreviam a carta errada:**
  1. **Orochi Leafcaller** gerava mana **virando a criatura**. A carta não vira nada: ela **paga {G}** e
     devolve a cor escolhida. Virando, a carta dava mana do nada no combo das Walls.
  2. **Pulse of Murasa** mirava só o seu cemitério e só criatura. A carta mira **qualquer** cemitério,
     aceita **terreno** e devolve para a mão do dono.
  3. **Roost Seek** (verso da Sagu Wildling) buscava qualquer terreno; a carta pede **básico**.
- **Regra que mudou, com motivo:** o vínculo de alma emparelhava sozinho quando havia só um par possível.
  A carta diz "você **pode** emparelhar", então recusar é legal. Agora a mesa sempre pergunta, e os testes
  da leva 30 foram reescritos para responder a pergunta.
- **Mesa:** as escolhas novas (tipo de criatura e par do vínculo de alma) ganharam aviso próprio na mesa,
  com os botões de cada opção e o de recusar — sem isso a partida travaria no celular.
- **Testes:** U (alvo aceitando criatura e terreno de qualquer cemitério e recusando instantânea, volta
  para a mão do dono, mana convertido sem virar, escolha do par com as duas opções e recusa), S8.
- **Resultado:** **Walls Combo em 100%** — quarta lista fechada. Cópias parciais de 30 para 25.

**S50 · Escolher o tipo de criatura, custo X e custo por subtipo** 🟡
- **Aceite:**
  - "escolha um tipo de criatura": a mesa abre a escolha entre os tipos que você controla, e o que vem
    depois conta por aquele tipo;
  - **custo X**: a mesa oferece os valores de X que dá para pagar, e a criatura entra com X marcadores +1/+1;
  - um custo pode exigir "dois Elfos que você controla", e criatura de outro tipo não serve.
- **Entregue:** Nyxborn Hydra (completa); Distant Melody e Birchlore Rangers seguem parciais, com o que
  falta reescrito depois de conferir o texto.
- **Parciais e o que falta:**
  - **Distant Melody** — a escolha é entre os tipos que você controla; escolher um tipo que você não
    controla (e comprar zero cartas) não entra.
  - **Birchlore Rangers** — metamorfose (morph {G}) não entra. Virar dois Elfos para gerar mana funciona.
- **Correções — duas notas minhas estavam erradas sobre o texto da carta:**
  1. **Birchlore Rangers**: a nota dizia "ela também pode virar Elfo". A carta não tem isso: ela tem
     **metamorfose {G}**. E o custo estava aceitando qualquer criatura, quando a carta pede dois **Elfos**.
  2. **Nyxborn Hydra**: o custo de conceder estava escrito `{X}{X}{G}`; as fontes dizem `{X}{G}{G}`.
     E a carta entra com **X** marcadores, não com 1 fixo.
- **Testes:** U (lista de tipos e compra por permanente do tipo escolhido, X oferecido de 0 a 2 com
  quatro terrenos e marcadores iguais ao X pago, custo recusando Ursos e aceitando dois Elfos), S8 com
  criaturas do subtipo injetadas sem mexer no grimório dos outros cenários.
- **Fora:** metamorfose (morph); escolher um tipo que você não controla.
- **Resultado:** cópias parciais nas Pauper de 34 para 30. Elves em 89%.

**S49 · Gatilho opcional, "a menos que tenha entrado agora" e desconto por condição** 🟡
- **Aceite:**
  - "você **pode** comprar uma carta": a mesa pergunta, sem custo nenhum, e recusar não faz nada;
  - "descarte uma carta **a menos que** esta criatura tenha entrado neste turno": a criatura que entrou
    agora compra e não descarta;
  - habilidade ativada que compra e descarta;
  - "esta mágica custa {2} menos se você controla um Humano e uma criatura não Humana": cada exigência
    precisa de uma criatura **diferente** sua.
- **Entregue (todas completas):** Moon-Circuit Hacker, Harrier Strix e Of One Mind.
- **Correções:**
  1. **A tela de "pagar" estava com o texto errado desde a leva 39.** O custo opcional de gatilho
     reaproveita a mesma decisão usada para "pagar para a mágica não ser anulada", e o aviso dizia
     justamente isso. Agora o aviso diz o que está em jogo: pagar para o efeito acontecer, ou só
     "fazer o efeito?" quando não há custo.
  2. **Harrier Strix mirava só permanente do oponente**; a carta diz "permanente alvo", qualquer uma.
  3. a condição do efeito era checada em três lugares com três códigos, e o caminho do custo opcional
     não checava nada — o descarte acontecia mesmo quando a carta dizia para não acontecer. Virou uma
     função só, usada pelos três caminhos.
- **Testes:** U (pergunta sem custo com recusa e aceite, criatura que entrou agora comprando sem
  descartar, habilidade de comprar e descartar, desconto valendo só com Humano **e** não Humano), S8.
- **Resultado:** **Mono Blue Faeries em 100%** — terceira lista fechada. Cópias parciais de 42 para 34.

**S48 · Vida pelo dano causado, fuga e devolver o que foi exilado** 🟡
- **Aceite:**
  - "sempre que a criatura encantada causar dano, você ganha aquela quantidade de vida": a aura recebe
    o valor do dano e converte em vida;
  - **fuga**: conjurar a carta do cemitério pagando mana e exilando duas outras cartas dele — e a carta
    fica em jogo, ao contrário do lampejo do passado, que exila depois;
  - "quando isto sai do campo de batalha, devolva a carta exilada": a permanente lembra o que exilou e
    devolve para o controle do dono.
- **Entregue (todas completas):** Armadillo Cloak, Sentinel's Eyes e Journey to Nowhere.
- **Correções — dois erros meus de fidelidade:**
  1. **Armadillo Cloak estava com a regra errada.** O script dava **prevenção de dano** à criatura
     encantada, e a nota dizia "ganhar vida igual ao dano que a criatura receberia". As duas fontes
     dizem outra coisa: a carta dá +2/+2 e atropelar, e a vida vem do dano que a criatura **causa**.
     A prevenção era invenção minha e mudava o resultado da partida.
  2. o valor trazido por um gatilho era procurado na permanente que o gerou, e não na habilidade na
     pilha, então qualquer efeito baseado nesse valor saía zero.
- **Testes:** U (ataque de 4 dando 4 de vida, fuga recusada sem duas cartas no cemitério e aceita com
  elas exilando as duas, criatura exilada voltando ao dono quando o encantamento é destruído), S8.
- **Teste ajustado:** o teste de cobertura parcial exigia que a nota contivesse a frase "ainda não
  entra". Isso checava estilo de texto, não regra. Agora ele garante o que importa: nenhuma carta
  parcial fica sem nota, e a nota chega na cobertura.
- **Resultado:** **GW Bogles em 100%** — segunda lista fechada. Cópias parciais nas Pauper de 50 para 42.

**S47 · Custo opcional no gatilho, condição do custo pago e mágica sem alvo** 🟡
- **Aceite:**
  - "quando isto vai para o cemitério, você **pode** pagar {B}. Se fizer, compre uma carta": a mesa
    pergunta, pagar compra, recusar não faz nada;
  - um efeito pode depender do que foi pago como custo ("se a carta descartada não era terreno");
  - mágica de "até dois alvos" pode ser conjurada **sem mirar nada** e resolve sem ser anulada (608.2b).
- **Entregue (todas completas):** Nihil Spellbomb, Grab the Prize e Cast into the Fire.
- **Correções — três erros reais:**
  1. **Nihil Spellbomb estava com o custo errado no script**: o custo de ativação era `{B}` + sacrifício,
     quando a carta pede `{T}` + sacrifício, e o `{B}` é o custo **opcional do gatilho**. A nota antiga
     também dizia `{1}` em vez de `{B}`. Os dois erros vinham de eu ter escrito o custo sem conferir.
  2. **dano "a cada oponente" caía na varredura de criaturas** e acabava mirando as criaturas do próprio
     conjurador. Nenhuma carta usava esse alvo até agora, então o furo estava latente.
  3. mágica de "até N alvos" conjurada sem alvo era **anulada** em vez de resolver sem efeito.
- **Testes:** U (pagar compra e recusar não compra, dano só com descarte que não é terreno, conjuração
  sem alvo resolvendo e com um alvo causando dano), S8.
- **Fora:** plot (Highway Robbery), que é mecânica própria e vai ter leva só dela.
- **Resultado:** **Jund Wildfire em 100%** — a primeira lista fechada. Rakdos Madness em 95%, a uma
  carta do 100%. Cópias parciais nas Pauper de 62 para 50.

**S46 · Busca feita pelo oponente, sacrifício por subtipo e lampejo com cor** 🟡
- **Foco:** só Pauper, a pedido do usuário. Atacadas as duas listas mais atrasadas.
- **Fonte:** textos conferidos em `mtg.cardsrealm.com` em 26/09/2026.
- **Aceite:**
  - "destrua o terreno; o controlador **dele** pode vasculhar": quem vasculha é o dono do terreno,
    a busca é opcional e só aceita terreno básico;
  - "sempre que você sacrificar outro Eldrazi": o gatilho de sacrifício passou a respeitar o subtipo;
  - "para cada oponente que não puder descartar, compre uma carta";
  - lampejo do passado que pede três criaturas **brancas** não é oferecido com criaturas de outra cor;
  - um modo pode exilar o cemitério de até dois jogadores.
- **Entregue (todas completas):** Cleansing Wildfire, Writhing Chrysalis, Refurbished Familiar,
  Battle Screech e Thraben Charm.
- **Correções — três bugs reais que os testes pegaram:**
  1. o custo de "vire três criaturas brancas" **ignorava a cor** na hora de decidir se dava para pagar:
     o lampejo do passado aparecia com criaturas de qualquer cor;
  2. **fichas não tinham subtipo**. A ficha Eldrazi Spawn não contava como Eldrazi e a ficha Bird não
     contava como Bird, então nenhum gatilho por subtipo as reconhecia. Agora a ficha declara subtipo;
  3. a busca feita por outro jogador caía em quem conjurou, porque o efeito sem alvo não recebia o
     alvo da mágica. Passou a usar o caminho de "controlador do alvo" que já existia.
- **Declarado:** "exilar o cemitério de qualquer número de jogadores" entra como até dois, que é o
  máximo possível na mesa de dois jogadores do app.
- **Testes:** U (busca opcional na mão do dono do terreno com só básicos na lista, marcador vindo do
  Eldrazi e não vindo da cabra, compra por mão vazia e descarte quando há carta, lampejo recusado com
  criaturas verdes e aceito com brancas, dois cemitérios exilados), S8.
- **Resultado:** cópias parciais nas Pauper de 81 para 62. **Jund Wildfire 95%**, Boros Bully 89%.

**S45 · Você escolhe: descarte do oponente e carta do cemitério** 🟡
- **Valor:** o motor parava de escolher no seu lugar. Três cartas passaram a funcionar como a carta
  real manda, e a máquina de escolha agora serve para qualquer carta que diga "escolha".
- **Fonte:** textos já conferidos nas levas 28 e 32 (26/09/2026), sem mudança de texto.
- **Aceite:**
  - o oponente revela a mão e **você** escolhe o que ele descarta; criatura e terreno ficam fora da escolha;
  - exilar até duas cartas de **qualquer** cemitério, mirando uma ou duas;
  - "o jogador alvo exila uma carta do próprio cemitério": quem escolhe é ele, não quem ativou;
  - uma habilidade ativada também aceita "até N alvos", inclusive ativada da mão.
- **Entregue (as três viraram completas):** Duress, Faerie Macabre e Relic of Progenitus.
- **Correção (A13):** quando uma escolha caía no goldfish, a mesa fazia ele **desistir da partida**.
  Agora o goldfish resolve o que o motor pedir a ele — escolha de carta, descarte, cor, pagar ou não,
  alvo de gatilho — e só desiste se for realmente o caso.
- **Expectativa que mudou, com motivo:** o teste da leva 28 afirmava que o motor escolhia a primeira
  carta que não fosse criatura nem terreno. Essa era a simplificação; agora a escolha é sua, e o teste
  foi reescrito para checar a regra certa.
- **Testes:** U (escolha do descarte com criatura e terreno fora dela e a carta escolhida saindo da mão
  certa, exílio de uma ou duas cartas de qualquer cemitério, escolha feita pelo jogador alvo) e
  mesa (escolha que cai no goldfish não derruba a partida).
- **Resultado:** cópias parciais nas Pauper de 87 para 81. Mono Blue Faeries, Walls Combo e Elves em 87%.

**S44 · Carta que volta para a mão, busca de básico e três rótulos errados** 🟡
- **Por que esta leva existe:** no celular nenhum deck Pauper passava de 84% e o "Motor completo"
  não liberava. A causa não era carta faltando: são as **cartas parciais**. Enquanto uma carta está
  parcial, a lista não fecha 100%. Eram 35 cartas únicas, 106 cópias.
- **Fonte:** textos conferidos em `mtg.cardsrealm.com` e `mtg.wtf` em 26/09/2026.
- **Correção de rótulo (erro meu):** três cartas estavam marcadas como parciais sem motivo —
  o script já cobria o texto inteiro.
  - **Jaspera Sentinel** e **Silhana Ledgewalker** — alcance e maldição de véu são palavras-chave que
    o motor resolve sozinho; o resto do texto já estava no script.
  - **Saruli Caretaker** — a nota dizia que a carta gera {G} ou {W}. Está errado: as duas fontes
    dizem "mana de qualquer cor", que é exatamente o que o script fazia.
- **Aceite:**
  - uma aura pode voltar para a mão quando vai para o cemitério (Rancor);
  - a busca no grimório pode exigir terreno **básico** e um de uma lista de subtipos;
  - lampejo do passado numa mágica de bônus coletivo (Rally the Peasants).
- **Entregue (todas completas):** Jaspera Sentinel, Silhana Ledgewalker, Saruli Caretaker,
  Rancor, Sheltering Landscape e Rally the Peasants.
- **Testes:** U (aura voltando para a mão depois de a criatura morrer, busca recusando Ilha básica e
  Portal e aceitando só a Montanha básica, lampejo do passado dando o bônus e exilando), S8.
- **Resultado:** cópias parciais nas Pauper de 106 para 87; GW Bogles 89%, Elves 87%.

**S43 · Proteção pela cor escolhida e indestrutível por sacrifício** 🟡
- **Fonte:** textos conferidos em `mtg.cardsrealm.com` em 26/09/2026.
- **Aceite:**
  - uma habilidade pode dar proteção contra a cor que **você escolhe na hora**, até o fim do turno,
    e a mesa oferece uma opção por cor;
  - a proteção barra a mágica daquela cor no oferecimento de alvo e desaparece no fim do turno;
  - "outra criatura que você controla" não aceita a própria fonte nem a criatura do oponente;
  - sacrificar-se pode dar indestrutível a uma criatura ou a todas as suas;
  - um encantamento também pode receber proteção.
- **Entregue (todas completas):** Mother of Runes, Benevolent Bodyguard, Alseid of Life's Bounty,
  Selfless Savior, Selfless Spirit e Kami of False Hope.
- **Testes:** U (uma opção por cor, cor certa barrando e a outra passando, proteção acabando no turno
  seguinte; fonte fora da lista de alvos; indestrutível só nas suas criaturas; prevenção de combate
  e proteção de encantamento), S8.
- **Depende de:** proteção por aura (S36) e prevenção de combate (S29), já no motor.
- **Fora:** escolher a cor depois de ver a resposta do oponente (a cor é escolhida ao ativar).
- **Resultado:** Killian de 44% para 50%; manuais do Commander de 73 para 67.

**S42 · Vários efeitos no mesmo alvo, devolver mágica e fichas Tesouro** 🟡
- **Dados recuperados:** as duas listas de Commander voltaram para `.listas/decks.json` (elas tinham
  sido perdidas quando o arquivo foi zerado por um comando meu na leva 26). A medição agora cobre as
  nove listas.
- **Tamanho real do que falta:** 73 cartas manuais no Commander (48 Killian, 25 Malcolm) e 106 cópias
  parciais nas Pauper. No ritmo de 4 a 6 cartas por leva, são de 13 a 18 levas até 100%.
- **Fonte:** textos conferidos em `mtg.cardsrealm.com` em 26/09/2026; Shore Up conferida também em
  `mtg.wtf` porque a primeira fonte errou o custo.
- **Aceite:**
  - uma mágica pode aplicar vários efeitos na **mesma** criatura, e a mesa pede um alvo só;
  - devolver para a mão pode mirar uma mágica na pilha ou uma criatura no campo;
  - anular uma mágica pode dar fichas ao dono dela, e uma ficha Tesouro gera mana de qualquer cor
    sacrificando-se.
- **Entregue:** Shore Up, Unsubstantiate e An Offer You Can't Refuse (completas); Arcane Denial e
  Delay (parciais).
- **Parciais e o que falta:**
  - **Arcane Denial** — as compras no início do próximo turno (duas para o dono da mágica, uma para você) não entram.
  - **Delay** — a mágica vai para o cemitério; exilar com três marcadores de tempo e ganhar suspender não entra.
- **Testes:** U (um alvo só para três efeitos, com maldição de véu barrando o oponente depois;
  devolver mágica da pilha e criatura do campo; duas fichas Tesouro para o oponente, gerando mana
  e deixando de existir ao serem sacrificadas), S8.
- **Fora:** suspender; compras adiadas para o próximo turno.

**S41 · Colher provas, vigilância e canalizar** 🟡
- **Fonte:** textos conferidos em `mtg.wtf` e `mtg.cardsrealm.com` em 26/09/2026, os dois idênticos
  nas duas cartas.
- **Aceite:**
  - colher provas: custo adicional opcional pago exilando cartas do seu cemitério até somar o valor
    de mana pedido, e o gatilho da carta só acontece se ele foi pago;
  - vigilância: quando uma mágica ou habilidade do oponente mira a criatura, ele paga ou a mágica é anulada;
    mirar a sua própria criatura com vigilância não cobra nada;
  - canalizar: descartar a carta da mão anula uma mágica **ou uma habilidade** na pilha.
- **Entregue:** Mirrorshell Crab (completa) e Vitu-Ghazi Inspector (parcial).
- **Parciais e o que falta:**
  - **Vitu-Ghazi Inspector** — o motor escolhe quais cartas do cemitério exilar (as de maior valor
    primeiro, para gastar o menor número de cartas); escolher você mesmo não entra.
- **Simplificação declarada:** a vigilância é cobrada no momento da conjuração ou da ativação, não como
  gatilho separado na pilha. Ninguém responde entre a vigilância e a mágica, e com mais de um alvo com
  vigilância só o primeiro é cobrado.
- **Correções:** anular uma habilidade na pilha derrubava a partida — o registro lia o nome do alvo
  depois de a habilidade deixar de existir. Agora o nome é guardado antes de o efeito ser aplicado.
- **Testes:** U (colher provas recusada sem cemitério suficiente, aceita com ele e gastando o mínimo,
  gatilho só com provas; vigilância paga, recusada e não cobrada do próprio dono; canalizar contra
  mágica e contra habilidade), S8.
- **Fora:** escolher as cartas de colher provas; vigilância como gatilho na pilha.
- **Resultado:** **as sete listas Pauper não têm mais nenhuma carta manual.** O que falta nelas são
  106 cópias parciais.

**S40 · Conluio e força por outras criaturas suas** 🟡
- **Fonte:** textos conferidos em `mtg.wtf` e `mtg.cardsrealm.com` em 26/09/2026 (as duas cartas
  conferidas nas duas fontes; a primeira fonte trazia só o custo de esgueirar-se do Leonardo,
  a segunda deu o custo de mana real).
- **Aceite:**
  - conluio: a criatura entra, você compra uma carta e escolhe uma para descartar; se a descartada
    não for terreno, ela ganha um marcador +1/+1;
  - uma criatura pode ganhar força por cada **outra** criatura sua, sem se contar e sem contar as do oponente.
- **Entregue:** Raffine's Informant (completa) e Leonardo, Big Brother (parcial).
- **Parciais e o que falta:**
  - **Leonardo, Big Brother** — esgueirar-se (conjurar por {W} devolvendo um atacante sem bloqueio
    no passo de declarar bloqueadores, entrando virada e atacando) não entra. Conjurado normalmente,
    o +1/+0 por outra criatura sua funciona.
- **Testes:** U (conluio dando marcador com carta que não é terreno, conluio sem marcador com terreno,
  força contando só as outras criaturas suas e reagindo a perdas), S8 com a verificação nova
  `selfStats` (olha a própria carta, não a criatura vizinha).
- **Fora:** esgueirar-se; conjurar uma permanente diretamente para o combate.
- **Resultado:** Boros Bully ficou sem carta manual. **Seis das sete listas Pauper não têm mais
  nenhuma carta manual.** Faltam 2 cartas únicas, as duas nas Elves.

**S39 · Habilidade ativada concedida por aura e por vínculo de alma** 🟡
- **Fonte:** textos conferidos em `mtg.wtf` e `mtg.cardsrealm.com` em 26/09/2026 (as duas cartas
  conferidas nas duas fontes).
- **Aceite:**
  - uma aura pode dar habilidade ativada à criatura que ela encanta, e a habilidade some quando a aura sai;
  - a habilidade age na própria criatura, sem pedir alvo;
  - o muro encantado desvira e gera mana mais de uma vez no mesmo turno (é o combo das Walls);
  - vínculo de alma: ao entrar em campo, a criatura emparelha com uma criatura sua sem par, as duas
    ganham a habilidade, e o par se desfaz quando uma delas sai do campo.
- **Entregue:** Freed from the Real (completa) e Galvanic Alchemist (parcial).
- **Parciais e o que falta:**
  - **Galvanic Alchemist** — o motor escolhe o par (a primeira criatura sua sem par); escolher o par
    você mesmo, ou recusar o emparelhamento, ainda não entra.
- **Correções:** o vínculo de alma não funcionava porque a cópia do script guardada na partida não
  levava o campo novo — a lista de campos copiados precisa crescer junto com o vocabulário.
- **Testes:** U (aura concede duas habilidades e as leva ao sair, mana duas vezes no mesmo turno,
  par mútuo com habilidade nas duas criaturas, par não é roubado por quem entra depois), S8 com a
  verificação nova `selfUntapped` (a carta precisa estar virada antes, senão o teste passaria de graça).
- **Fora:** escolher o par do vínculo de alma; reemparelhar depois que o par se desfaz.
- **Resultado:** Walls Combo ficou sem carta manual. Faltam 4 cartas únicas nas Pauper
  (Boros Bully e Elves).

**S38 · Alvo por cor, varredura que poupa um subtipo e "até dois alvos"** 🟡
- **Fonte:** textos conferidos em `mtg.wtf` e `mtg.cardsrealm.com` em 26/09/2026; Breath Weapon
  conferido nas duas fontes porque a primeira não trouxe o custo.
- **Aceite:**
  - o dano de uma mágica pode ir para quem controlava o alvo dela;
  - um alvo pode excluir uma cor ("criatura não-preta"), e a mesa nem oferece o alvo errado;
  - uma varredura pode poupar um subtipo, e metamorfo conta como esse subtipo;
  - "até dois alvos": a mesa oferece uma ou duas criaturas conforme o campo permitir.
- **Entregue:** Ancient Grudge, Smash to Smithereens, Dark Withering e Breath Weapon (completas);
  Cast into the Fire (parcial).
- **Parciais e o que falta:**
  - **Cast into the Fire** — mirar uma ou duas criaturas funciona; conjurar sem mirar nenhuma não entra.
- **Testes:** U (dano ao controlador do artefato, alvo não-preto recusado no oferecimento e na validação,
  varredura poupando Dragão e metamorfo, um e dois alvos com recusa de alvo repetido), S8.
- **Depende de:** lampejo do passado (S16) e insanidade (S18), já no motor.
- **Fora:** conjurar uma mágica de "até N alvos" sem alvo nenhum.
- **Resultado:** cartas manuais das Pauper de 17 cópias para 9 (6 cartas únicas). Mono Blue Faeries,
  Rakdos Madness, GW Bogles e Jund Wildfire ficaram sem nenhuma carta manual.

**S37 · Exilar cemitérios, descarte escolhido, habilidade da mão e barganha** 🟡
- **Fonte:** textos conferidos em `grimoria.app` em 26/09/2026 (a fonte anterior, `mtg.wtf`, seguiu
  recusando por excesso de consultas).
- **Aceite:**
  - uma habilidade pode exilar o cemitério de um jogador ou de todos de uma vez;
  - uma mágica pode fazer o oponente descartar uma carta que não é criatura nem terreno;
  - uma carta pode ter habilidade que só funciona com ela na mão, pagando o descarte dela mesma;
  - barganha: sacrificar um artefato, encantamento ou ficha ao conjurar, e o gatilho da carta
    só acontece se isso foi feito.
- **Entregue:** Troublemaker Ouphe (completa), Duress, Faerie Macabre, Relic of Progenitus e
  Journey to Nowhere (parciais, cada uma com o que falta declarado abaixo).
- **Parciais e o que falta:**
  - **Duress** — o motor escolhe a primeira carta que não é criatura nem terreno; escolher você mesmo não entra.
  - **Faerie Macabre** — exila o cemitério inteiro do alvo, não até duas cartas escolhidas.
  - **Relic of Progenitus** — a primeira habilidade exila o cemitério inteiro, não uma carta.
  - **Journey to Nowhere** — devolver a criatura quando o encantamento sai do campo não entra.
- **Correções:** Journey to Nowhere estava modelada como aura e morria sozinha (o próprio exílio
  tirava a criatura hospedeira, e a regra 704.5m matava a aura); e habilidade de mão estava sendo
  oferecida com a carta já no campo de batalha.
- **Testes:** U (exilar todos os cemitérios com compra, descarte que pula criatura e terreno,
  habilidade da mão aceita na mão e recusada no campo, barganha abrindo e fechando o gatilho), S8.
- **Fora:** escolher qual carta o oponente descarta e escolher quais cartas do cemitério exilar —
  as duas dependem de escolha em zona escondida pelo jogador, não pelo motor.
- **Resultado:** cartas manuais das Pauper de 28 cópias para 17 (11 cartas únicas).

**S36 · Proteção de várias cores e prevenção do dano de uma mágica** 🟡
- **Fonte:** textos conferidos em 26/09/2026.
- **Aceite:**
  - uma aura pode conceder proteção contra mais de uma cor de uma vez, e cada cor barra alvo,
    dano e bloqueio daquela cor;
  - prevenir todo o dano que uma mágica da pilha causaria no turno, ganhando essa vida.
- **Entregue:** Mask of Law and Grace e Hallow (parcial: a vida ganha é o dano previsto da mágica,
  não o dano efetivamente prevenido).
- **Testes:** U (duas cores barrando e a terceira passando, prevenção da mágica com ganho de vida), S8.
- **Não lida:** Troublemaker Ouphe — a fonte recusou por excesso de consultas.

**S35 · Varredura das Pauper: gatilho da criatura encantada e alvos de artefato** 🟡
- **Ferramenta nova:** `.listas/medir.mjs` mede a cobertura de cada lista salva, com as cartas manuais
  e parciais nomeadas. É o que guia a escolha da próxima leva.
- **Fonte:** textos conferidos em 26/09/2026.
- **Aceite:**
  - gatilho "quando a criatura encantada vira ou recebe dano", disparando por virar de qualquer origem
    (efeito, mana, adjudicação) e por dano de mágica ou de combate;
  - alvo "a criatura que esta aura encanta";
  - anular mágica de artefato e devolver artefato ao dono.
- **Entregue:** Cryoshatter e Steel Sabotage.
- **Medição em 26/09:** Faeries 84%, Elves 80%, Rakdos 77%, Walls 77%, Bogles 75%, Boros 73%, Jund 71%.
- **Testes:** U (destruir ao virar, destruir ao receber dano, anular e devolver artefato), S8.
- **Não lida:** Mask of Law and Grace — a fonte recusou por excesso de consultas.

**S34 · Tempestade, conceder e metamorfo** 🟡
- **Fonte:** textos conferidos em 26/09/2026.
- **Aceite:**
  - tempestade: a mágica é copiada uma vez para cada mágica conjurada antes dela no turno, e as
    cópias resolvem com os mesmos alvos; a contagem zera a cada turno;
  - conceder (bestow): a carta pode ser conjurada como aura, pelo custo de conceder. Enquanto anexada
    ela **não é criatura**, então não morre por resistência zero, não ataca e não pode ser alvo de
    efeito de criatura; se a criatura encantada sai, ela volta a ser criatura em vez de ir ao cemitério;
  - metamorfo (changeling): a carta conta como qualquer subtipo de criatura, tanto em gatilho quanto
    em contagem;
  - permanente que entra com marcadores +1/+1.
- **Entregue:** Weather the Storm, Reaping the Graves, Nyxborn Hydra (parcial: entra sempre com um
  marcador, escolher o X ainda não entra), e o Masked Vandal deixou de ser parcial pelo metamorfo.
- **Testes:** U (cópias por tempestade, contagem zerando no turno, conceder como aura e como criatura,
  metamorfo disparando gatilho de Elfo), S8.
- **Depende de:** S11, S33.

**S33 · Afinidade, adaptar, marcadores e terceira compra** 🟡
- **Fonte:** textos conferidos em 26/09/2026.
- **Aceite:**
  - afinidade por artefatos: cada artefato seu reduz um genérico do custo, e a redução vale tanto
    na oferta da mesa quanto no pagamento;
  - adaptar: a habilidade só põe marcadores se a criatura não tiver nenhum;
  - pôr marcadores +1/+1 dispara gatilhos que observam marcadores;
  - contagem de compras por turno, com gatilho na terceira, e gatilho que funciona **do cemitério**;
  - efeito de voltar do cemitério direto ao campo, virada.
- **Entregue:** Evolution Witness, Sneaky Snacker, e o Refurbished Familiar deixou de ser parcial pela afinidade.
- **Testes:** U (desconto por artefato, adaptar com e sem marcadores, terceira compra), S8.
- **Depende de:** S20, S32.
- **Correções:** a oferta da mesa não aplicava o desconto de custo que o pagamento já aplicava; e um
  script que só declara uma regra estática (sem efeitos) era recusado pela validação.

**S32 · Devoção, sacrifício e exílio do cemitério como custo** 🟡
- **Fonte:** textos conferidos em 26/09/2026.
- **Aceite:**
  - devoção: conta os símbolos de mana de uma cor no custo das permanentes que você controla,
    incluindo os híbridos;
  - sacrificar é diferente de ir para o cemitério: um gatilho pode observar "quando você sacrifica
    outra permanente", e sacrificar a própria fonte não dispara o gatilho dela;
  - custo de exilar uma carta do seu cemitério, inclusive em gatilho: sem carta que sirva, o gatilho
    não acontece;
  - alvos novos: terreno e artefato ou encantamento que o oponente controla.
- **Entregue:** Nylea's Disciple, Gixian Infiltrator, Masked Vandal, Cleansing Wildfire e Makeshift Munitions.
- **Parciais:** Masked Vandal (metamorfo), Cleansing Wildfire (a busca de terreno básico pelo controlador).
- **Testes:** U (devoção somando Elfos e a própria carta, sacrifício disparando e não disparando, gatilho
  com e sem carta no cemitério), S8.
- **Depende de:** S19, S20.
- **Não lida:** Ancient Grudge — a fonte recusou por excesso de consultas.
- **Fica para a próxima:** tempestade (Weather the Storm), afinidade (Refurbished Familiar),
  adaptar (Evolution Witness), metamorfo (Masked Vandal).

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

### R · Revisão carta a carta (pedido em 02/10/2026)

**Por que existe.** As listas Pauper já foram auditadas contra o texto oficial (levas 105 a 108) e seis das sete
medem 100% em `medir.mjs`. Mesmo assim, no aparelho, a Highway Robbery não podia ser tramada. A causa não estava na
regra: o motor oferecia `plot` e a tela não desenhava o botão. A leva 121 achou mais dois casos da mesma classe
(`unmorph` e a escolha de modo do gatilho da Sewer-veillance Cam, que parava a partida em "Aguardando"). A medição de
cobertura conta o que o motor **resolve**; não conta o que o jogador **alcança** pela tela. Este épico fecha essa
distância, carta por carta.

**Número de partida (02/10/2026, `node .listas/revisar.mjs`).** 296 cartas únicas não básicas nas nove listas: 138 nas
sete Pauper (133 com script, 5 cobertas pelo texto) e 164 nas duas Commander, 6 delas também em listas Pauper (98 cópias manuais e 21 parciais, por
`medir.mjs`). Das 138 Pauper, só 21 aparecem em algum teste que passa pela tela de verdade. Revisadas até aqui: 1.

**Método (os cinco passos do pedido, com o que cada um produz).**

1. **Ler a carta.** Texto Oracle e rulings em `.listas/oficiais.json`, com fonte e data. Sem texto confiável, a carta fica manual.
2. **Entender as mecânicas.** Ficha de leitura frase a frase (tipo da frase, mira ou escolhe, quem decide, "may", o que conta e de quem, quando confere, duração, zona, pilha, dano ou perda de vida) e as 28 armadilhas do protocolo.
3. **Motor.** Primeiro conferir se já está certo (sonda no motor com a carta em jogo). Só o que divergir vira correção, pela **classe** (regra numerada), com teste que falha antes. Carta que depende de estrutura que o motor não tem fica declarada, não aproximada.
4. **Experiência.** Jogar a carta pela tela publicada em 360×780: cada ação que ela gera tem botão com rótulo próprio; cada decisão tem aviso, mostra as opções separadas por origem, diz o que vai acontecer e tem recusa explícita quando o texto diz "may"; a informação que a carta cria (tramada, exilada, marcador, modo escolhido) fica à vista; o registro conta. Só o que não estiver nesse nível é redesenhado, com captura antes e depois e `auditaTela`.
5. **Registrar e avançar.** Ficha em `.listas/revisao.json` (`status`, `leitura`, `motor`, `tela`, `bot`, `testes`, `notas`). `revisada` exige os quatro passos e um teste de tela apontado.

**Guarda-corpos do épico (valem para toda carta, revisada ou não).**
- `tela.acoes.unit`: todo tipo de ação que `legalActions` devolve é tratado pela tela da mesa. Tipo novo no motor sem botão derruba o portão.
- `e2e · R0 sonda de alcance`: joga as listas Pauper reais pela tela, com ações sorteadas por semente; a cada estado, toda ação legal de carta está na folha da carta e nenhuma decisão de quem vê a tela cai em "Aguardando".

**R0 · Sonda de alcance, registro por carta e a primeira carta** 🟡 (leva 121, 02/10/2026)
- **Valor:** o que o motor oferece, a mesa mostra; e existe um quadro dizendo, por lista, quantas cartas já foram revistas de ponta a ponta.
- **Entregue:** os dois guarda-corpos acima; `.listas/revisao.json` com 296 fichas e `.listas/revisar.mjs` (quadro e sincronização); `window.__estanteMesa.acoesDe/legais/quemVe` só sob `__MTG_TEST`.
- **Highway Robbery (revisada).** Motor conferido sem correção: escolha na resolução, plot como ação especial fora da pilha, conjurar só em turno posterior e no tempo de feitiço, insanidade da carta descartada decidida depois das duas compras, resolução em branco sem mão e sem terreno. Tela corrigida: botão **Tramar · {1}{R}** na folha (apagado com o motivo quando não dá); a tramada aparece primeiro na bandeja com contorno tracejado e selo, e diz se já pode ser conjurada; **Conjurar sem pagar**; a escolha virou duas pilhas num segmentado (**Descartar · N** / **Sacrificar · N**), carta marcada, frase com o que vai acontecer e dois botões (**Não pagar** / **Descartar** ou **Sacrificar**); o registro conta "tramou".
- **Achados da classe "motor oferece, tela não desenha":** `plot`, `unmorph` (Birchlore Rangers não virava para cima e "Conjurar virada para baixo" se fundia com "Conjurar") e `choose_mode` (Sewer-veillance Cam). Os três corrigidos. Carta conjurada virada para baixo deixou de ter o nome escrito no registro (708.2).
- **Testes:** `tela.acoes.unit` (3), `pauper.regras` Leva 121 (insanidade, em branco, limites do plot), `e2e` Leva 121 (Highway Robbery ponta a ponta com `auditaTela` em quatro telas; gatilho com modos; sonda R0, que falha sem o botão de tramar — conferido por mutação).
- **Versão e goldens:** motor continua v64. Nenhuma regra mudou; só tela, modelo de apresentação e registro. Goldens intactos, sem regravar.
- **Sem rede:** tudo local; os dois ícones novos (`tramar`, `terreno`) são SVG no arquivo.
- **Ajuste depois das fotos do aparelho (02/10/2026):** as fotos confirmaram os três relatos. Um ponto novo: com a imagem da carta carregada, a folha passa da altura da tela e os botões ficavam depois do texto, abaixo da dobra; "Tramar" nasceria escondido. As ações da carta passaram a vir logo abaixo da imagem, antes do texto (vale para a folha de toda carta). Teste: e2e "folha da carta com a imagem carregada".
- **Fora / parcial declarado:** Sewer-veillance Cam fica **em revisão** (modo → alvo → "fazer?" são três perguntas; falta a ficha e decidir se "não fazer" entra como terceira opção da primeira). Birchlore Rangers ganhou os botões, mas a ficha completa fica para a lista dos Elfos. O Shark não foi revisto para plot.

**R1 · Axebane Guardian: mana em qualquer combinação de cores** 🟡 (leva 122, 02/10/2026)
- **Valor:** a Walls Combo volta a jogar; as sete listas Pauper medem 100% em `medir.mjs`, com e sem texto buscado para esta lista.
- **Classe:** produção de mana com cor escolhida por unidade (106.1, 605). Texto oficial em `.listas/oficiais.json` (Oracle do Forge, 30/09/2026) e ruling de 01/10/2012: é habilidade de mana; contagem e cores definidas na resolução, que é imediata.
- **Cartas:** Axebane Guardian (4 cópias, Walls Combo) é a única das nove listas com "any combination of colors" (busca no texto oficial, não pelo nome). No mesmo caminho e conferidas pelo portão: Overgrown Battlement, Priest of Titania, Jaspera Sentinel, Utopia Sprawl e todo `produces`.
- **Entregue:** campo `combination: true` em `produces` (só com `anyColor`; o validador recusa o resto). O pagamento automático (`planTaps`) monta a divisão que paga o custo: só as cores que o custo pede, até a quantidade pedida, e o resto numa cor de enchimento — sem enumerar as C(X+4,4) combinações. Gerar à mão: `tap_mana` com `mana: [...]`, recusada se a quantidade não bater com a contagem do momento, se houver incolor ou se a fonte não tiver combinação. `legalActions` marca a ação com `combo: X`.
- **Tela:** a folha da Axebane tem um botão só, **Gerar N manas** (antes: cinco botões de uma cor). Ele abre a divisão: cinco cores, um toque soma uma mana, **Completar** enche o resto com a última cor (tudo de uma cor = dois toques), tocar numa mana escolhida a tira, **Gerar** só acende com as N. O registro diz o que foi gerado.
- **Decisões do jogador:** a divisão é sempre dele quando gera à mão. No pagamento de uma mágica o motor escolhe uma divisão que paga, como já faz com qual terreno virar; quem quiser outra, gera à mão antes.
- **Testes:** `pauper.regras` Leva 122 (três cores num toque, custo com genérico, X insuficiente, divisão à mão, três recusas, contagem na hora) — falha na versão anterior; e2e Leva 122 (folha, divisão, `auditaTela` vazia e completa, reserva e registro); a sonda R0 passou a exigir as sete listas.
- **Versão e goldens:** motor continua v64, sem regravar: os quatro goldens saíram idênticos. Justificativa para não subir a versão: nenhuma partida publicada podia ter Axebane em campo (a Walls Combo não iniciava desde o modo único, leva 113), então nenhum registro salvo muda de resultado; partidas salvas das outras listas continuam abrindo.
- **Sem rede:** tudo local.
- **Parcial declarado / Fora:** o Shark paga com a combinação certa (usa o mesmo `planTaps`), mas não gera mana solta em combinação; não foi medido em torneio com a Walls Combo. A ficha frase a frase das outras 23 cartas da lista fica para a R8.
- **Achado para as próximas:** três listas dependem do texto buscado para medir 100% sem rede (GW Bogles 89%, Jund Wildfire 97%, Elves 92%: Gladecover Scout, Slippery Bogle, Vault of Whispers, Llanowar Elves, Elvish Mystic). Entram na revisão das respectivas listas, pela conduta offline.

**R2 · Rakdos Madness, carta a carta** 🟡 (leva 125, 02/10/2026)
- **Valor:** a lista de duas cores deixa de desperdiçar terreno a cada mágica, e toda decisão das cartas dela diz o que está sendo perguntado.
- **Método:** as 21 cartas não básicas lidas contra o texto oficial, sondadas no motor com a lista real em modo único e jogadas pela tela em 360×780 com imagem de carta. Fichas em `.listas/revisao.json` (21 de 21 revisadas).
- **Achado de regra (classe: pagamento, 601.2g/h).** `planTaps` devolvia a primeira solução da busca, que vira toda fonte anterior à que resolve: com três Mountain e um Swamp, pagar {B} virava os quatro e a mana sobrando evaporava. Só acontece com duas cores, e por isso nem as listas mono nem os baralhos de teste acusavam. O plano agora é enxugado: sai cada toque que não faz falta, do mais flexível (mais opções de cor) para o menos. Vale para o jogador e para o Shark, que usa o mesmo plano.
- **Regras conferidas sem correção:** terceira compra da Sneaky Snacker (a carta descartada depois da terceira compra não volta); compra e descarte da Faithless Looting na mesma resolução e lampejo que exila; insanidade em descarte por efeito, por custo e na limpeza, no turno do oponente; Vampire's Kiss em qualquer jogador e Alms of the Vein só no oponente; End the Festivities sem alvo; os quatro terrenos especiais; Nihil Spellbomb; os modos e alvos de Red Elemental Blast, Cast into the Fire, Smash to Smithereens e Dark Withering; custo adicional da Grab the Prize.
- **Dados corrigidos:** `.listas/oficiais.json` trazia a Dark Withering com custo {B} (o da insanidade); é {4}{B}{B} (mtg.wtf TSP 101, 02/10/2026). Smash to Smithereens tinha o custo preenchido de memória: confirmado em segunda fonte. **Pendência registrada:** outras 32 cartas das listas Pauper têm fonte única, 7 delas com custo "por conhecimento geral" (Gladecover Scout, Silhana Ledgewalker, Aura Gnarlid, Ancestral Mask, Armadillo Cloak, Rancor, Ethereal Armor); cada uma é reconferida em segunda fonte na revisão da própria lista. O app usa o custo que vem da Scryfall, então o erro do arquivo não chegava à partida.
- **Tela (o que mudou para o jogador):**
  - **Decisão escrita.** Quando a mesa espera uma decisão sua, a bandeja mostra em duas linhas de quem é e o que se pergunta ("Faithless Looting: descarte 2 cartas", "Kitchen Imp: insanidade {B}", "Nihil Spellbomb: pagar {B}? Se pagar: compra 1 carta."). Antes aparecia uma palavra ("Decidir", "Alvo", "Insanidade") e a pergunta ficava atrás de um balão. Ataque e bloqueio continuam como eram.
  - **Descarte por efeito** dizia "Mão acima de 7 na limpeza": agora diz a carta que pediu.
  - **Insanidade:** botões **Conjurar** e **Cemitério**; sem mana, "Conjurar" fica apagado e a frase explica (antes o botão sumia).
  - **Carta do custo se escolhe tocando nela** (Grab the Prize, ficha de Sangue, e todo custo de uma carta só): cartas com imagem, cópias iguais da mão juntas com ×N. Antes era uma lista de botões dourados "Descartar Kitchen Imp (1)", "(2)".
  - **Por que não posso?** No modo único, a folha de uma carta que não dá para jogar agora diz o motivo: "Conjurar · {1}{R}{R} — mana insuficiente", "Jogar terreno — já jogou terreno neste turno", "Lampejo do passado · {2}{R} — mana insuficiente".
  - **Lampejo à vista:** o chip do cemitério (e o do exílio) ganha um ponto quando há carta jogável ali agora; o rótulo do lampejo deixou de repetir o custo impresso ("{2}{R} · {R}").
  - **Cemitério aberto sem cartas umas sobre as outras** (a coluna da grade era mais estreita que a carta).
  - **Alvo de gatilho** sem botão dourado por padrão (com o Bojuka Bog o destaque era "Você", exilar o próprio cemitério) e dizendo o que o gatilho faz.
  - **Dois alvos do mesmo efeito** aparecem uma vez na folha (Cast into the Fire listava A + B e B + A).
- **Pixels (360×780):** o cabeçalho de decisão custa de 50 a 70 px de altura da bandeja só enquanto há decisão pendente; fora disso a bandeja não mudou. Em troca, a palavra do momento e o balão dela saem nesse estado, e os botões da decisão cabem numa linha (antes quebravam em duas).
- **Divergência registrada (leva 110):** aquela leva pôs o texto das decisões num balão para dar espaço à mesa. Para decisões pendentes isso escondia a pergunta; o momento de rotina (fase, pilha, aguardando) continua compacto.
- **Simplificação declarada:** a insanidade é decidida no momento do descarte, não como gatilho que vai à pilha e pode ser respondido antes da decisão (702.35a). Com a Faithless Looting, cada carta descartada é decidida antes do descarte seguinte; as duas mágicas chegam à pilha, na ordem dos descartes. O oponente responde às mágicas, não ao gatilho. Entra no mapa de regras (R14).
- **Testes:** `mana.unit` (3: plano mínimo, fonte flexível guardada, reserva usada antes) — os dois primeiros falham na v64; `rakdos.regras` (12, com a lista real e o texto oficial); e2e Leva 125 (4: motivo e pagamento, decisões escritas com descarte, insanidade e lampejo, escolha tocando na carta, alvo de gatilho/Carnarium/Spellbomb/alvos sem repetição), todos com `auditaTela`. Apoio novo `listas.mjs` (partidas de teste com as listas reais), que as próximas listas reutilizam.
- **Versão e goldens:** **motor v65**. A regra de pagamento muda o resultado de partidas com duas cores, então registros antigos dariam outro estado. Os quatro goldens foram regravados **só pela versão**: com a regra nova e a versão antiga eles passavam sem regravar, e log, status e turno saíram idênticos, conferidos um a um. **Partida salva na v64 não abre** (a tela oferece começar outra).
- **Publicação (erros desta trilha, corrigidos):** a leva saiu primeiro como "124" sem o rodapé `Trilha: motor`, no mesmo minuto em que a trilha de infra publicou a Q12 como leva 124; a guarda de agregação acusou no CI e a leva foi renumerada para 125 no commit seguinte. A mesma guarda mostrou que o commit da leva 122 desta trilha, ao recompor a tabela de ordem à mão, tinha apagado a história B17 do bot (restaurada pela Q12). Desde a Q12 esta trilha publica só por `npm run publicar`.
- **Sem rede:** tudo local.
- **Fora:** o Shark não foi medido em torneio depois da correção do pagamento (ele só ganha: deixa de desperdiçar mana com listas de duas cores); a prévia de ataque e bloqueio continua no balão; partida guiada da lista pela tela fica para a homologação (R9).

**R3 · Mono Blue Faeries, carta a carta** 🟡 (leva 131, **motor v66**; falta o teste no aparelho)
- **Valor:** cada carta da lista faz o que o texto oficial diz e a tela deixa escolher o alvo certo sem adivinhar. É a lista que mais mira coisas (anulações, gatilhos com alvo, auras), então o ganho principal é a escolha de alvo, que vale para todas as listas.
- **Aceite:** as 17 cartas com ficha `revisada` em `.listas/revisao.json` (texto de `.listas/oficiais.json`, consultas de 30/09/2026); regra conferida com a lista real; as jogadas-chave feitas pela tela em 360×780 com `auditaTela`.
- **Regra corrigida (muda resultado de partida):** **Sewer-veillance Cam** — "you may tap or untap target creature". A criatura é **alvo**, escolhido quando o gatilho vai à pilha; virar, desvirar ou nada é escolha da **resolução** (primitiva nova `tap_or_untap`). Antes a mesa perguntava "virar ou desvirar" antes do alvo, perguntava mesmo sem criatura em campo e eram três toques. As outras 16 cartas estavam certas no motor.
- **Tela corrigida:**
  - **Alvo de gatilho:** só os seis primeiros alvos tinham botão (o sétimo não podia ser escolhido) e cópias iguais repetiam o nome. Agora um botão por alvo diferente, "Mais alvos" abre a lista por dono quando passa de quatro, as cartas que podem ser alvo ficam marcadas na mesa e **tocar na carta escolhe**.
  - **Mesmo nome dos dois lados (espelho):** "→ Faerie Seer" era um botão só e mirava a primeira. Agora "Faerie Seer (você)" e "Faerie Seer (oponente)"; do mesmo dono, "(virada)"/"(desvirada)" quando isso separa.
  - **Alvo sem efeito:** Hydroblast sem nada vermelho oferecia em dourado "Destruir… → Island". O alvo em que "se for vermelha" não faz nada sai da frente e fica num botão discreto que abre a lista (o motor continua aceitando, como manda o texto).
  - **Muitos alvos na folha:** mais de quatro alvos para a mesma ação viram um botão "· N alvos" que abre a lista por dono.
  - **Ninjutsu:** "Ninjutsu · {U} → devolve Faerie Seer"; fora do combate aparece apagado com o motivo.
  - **Custo cobrado:** Of One Mind com o desconto valendo dizia {2}{U}; agora "Conjurar · {U} (com desconto)" (vale para afinidade também).
  - **Condição no aviso:** o gatilho do Moon-Circuit Hacker dizia "descarta 1 carta" no turno em que ele entra; agora "(só se ela não entrou neste turno)".
  - **Textos:** "Scry" virou "Vidência"; Relic of Progenitus mostra "Ativar ({1}, exilar esta)".
- **Expectativas alteradas (com motivo):** e2e "Leva 121 · gatilho com modos" esperava o modo antes do alvo e os botões "Virar uma criatura"/"Desvirar uma criatura": passou a esperar alvo, depois Virar, Desvirar e Nada (regra acima). Um e2e antigo conferia a palavra "Scry" no aviso: passou a conferir "Vidência" (texto de interface em português).
- **Testes:** `faeries.regras` (12: 9 de regra com a lista real, 3 do modelo da tela — rótulos de alvo, alvo sem efeito e folha enxuta, condição no aviso); e2e Leva 131 (5: vidência/alvo/Cam, ninjutsu, Hydroblast/Relic/Sprite, desconto/Miscreant/Intruder, Counterspell/Dispel/Cryoshatter).
- **Versão e goldens:** **motor v66**. O gatilho da Cam passa por outra sequência de decisões, então um registro antigo com a carta daria outro estado. Os quatro goldens foram regravados **só pela versão** (uma linha em cada; nenhum usa a Cam). **Partida salva na v65 não abre.**
- **Cobertura de tela declarada:** Blue Elemental Blast, Steel Sabotage, Annul e Ninja of the Deep Hours não têm teste de tela próprio: usam o mesmo caminho de Counterspell/Hydroblast e do Moon-Circuit Hacker. A habilidade {2}{U} da Harrier Strix também não. Contra o Goldfish não há mágica do oponente na pilha: as anulações foram feitas pela tela em mágicas próprias e, contra o oponente, nos testes de regra.
- **Fora:** gatilho que sai da pilha por falta de alvo não avisa na tela (só no registro); o Shark escolhe o primeiro alvo e "Virar" no gatilho da Cam sem olhar de quem é a criatura (trilha bot); a condição no aviso cobre só "não entrou neste turno" (as outras duas condições do dicionário ficam para a lista que as usa); partida guiada inteira da lista fica para a homologação (R9).

**R4 · Elves, carta a carta** 🟡 (leva 136, **motor v67**; falta o teste no aparelho)
- **Valor:** a lista que mais gera mana por criatura joga pela tela sem lista de botões: paga-se tocando nas cartas, e as três mágicas de busca dizem o que fazem. Elves passa a funcionar inteira sem internet.
- **Aceite:** as 23 cartas com ficha `revisada` (texto de `.listas/oficiais.json`, consultas de 30/09/2026); regra conferida com a lista real; jogadas-chave pela tela em 360×780 com `auditaTela`.
- **Bugs reais corrigidos:**
  - **Vitu-Ghazi Inspector — colher provas não era alcançável pela tela.** Conjurar com e sem provas tinham o mesmo nome na folha; a mesa juntava as duas e conjurava sempre sem. Agora "Conjurar com provas 6" é um botão, e a escolha das cartas diz quanto falta somar.
  - **Mirrorshell Crab — canalizar oferecido sem mana.** A habilidade da mão não conferia a mana: sem {U} o botão aparecia e o motor recusava. Vale para toda habilidade ativada a partir da mão.
- **Regra corrigida (muda resultado de partida):** **Winding Way** — "put ALL cards of the chosen type into your hand" não tem escolha. Antes a mesa exigia um toque em cada carta obrigatória; agora elas vão sozinhas, o resto vai para o cemitério e as quatro reveladas entram no registro ("Reveal": os dois jogadores veem) e num aviso na mesa.
- **Sem rede:** Llanowar Elves e Elvish Mystic ganharam script ({T}: {G}); dependiam do texto buscado. **Elves mede 100% sem rede** (`node .listas/medir.mjs`). Continuam dependendo do texto: Gladecover Scout e Slippery Bogle (GW Bogles), Vault of Whispers (Jund Wildfire).
- **Tela corrigida:**
  - **Pagar com várias cartas** (Birchlore Rangers: vire dois Elfos): era uma lista com todos os pares (55 botões com 11 Elfos); agora toca-se nas cartas, cópias iguais em pilha, e a conta fecha sozinha. Vale para todo custo de duas ou mais cartas.
  - **Qual terreno volta** (Quirion Ranger): Florestas iguais juntas e a virada à parte; o botão diz o custo ("Ativar (devolver Forest à mão)"). Com muitos alvos, primeiro o alvo, depois a Floresta.
  - **Lead the Stampede:** o aviso diz o que pode ser pego e para onde vai ("Toque nas criaturas que vão para a mão: 0 de 3"), ou que não há criatura.
  - **Distant Melody:** o aviso diz de qual carta é a escolha do tipo.
  - **Priest of Titania:** "Gerar 9 × {G}" no lugar de nove símbolos.
- **Expectativas alteradas (com motivo):** `pauper.regras` "Leva 106 · Winding Way" esperava a escolha aberta com mínimo igual às criaturas: passou a esperar as cartas na mão sem pergunta (mesma regra). `pauper.regras` "Leva 104 · custo adicional" escolhia a última carta da mão do baralho de teste, que muda a cada script novo e caiu numa carta de insanidade: passou a escolher uma sem insanidade. `bot.unit` "Leva 115 · Winding Way" (trilha bot) dizia que o v2 deixava a carta na mão por causa da escolha: sem escolha, o v2 também conjura; o teste confere as criaturas na mão e continua conferindo que o bot pega cartas numa escolha aberta, agora com Lead the Stampede. O cenário do script de Winding Way deixou de conferir "picked".
- **Testes:** `elves.regras` (19, com a lista real); e2e Leva 136 (3: mana e custos tocando nas cartas; Winding Way/Lead the Stampede/Huntmaster/colher provas; Distant Melody/Packbeast).
- **Versão e goldens:** **motor v67**; goldens regravados só pela versão (registro, estado final e turno idênticos; o resumo muda porque o estado guarda a versão). **Partida salva na v66 não abre.**
- **Simplificação declarada:** Winding Way decide "criatura ou terreno" ao conjurar (como modo), não na resolução; o oponente fica sabendo antes. Entra no mapa de regras (R14).
- **Cobertura de tela declarada:** sem teste de tela próprio — Timberwatch Elf, Scattershot Archer, Masked Vandal (sem alvo contra o Goldfish), Mirrorshell Crab, Negate, Spell Pierce, Valakut Invoker, Elvish Mystic, Elvish Vanguard e Nylea's Disciple; usam caminhos de tela já testados e têm teste de regra. Jaspera Sentinel e Nyxborn Hydra ficam com os e2e da leva 104.
- **Fora:** o Shark com as cartas desta lista não foi revisado (trilha bot); a escolha de tipo da Distant Melody não mostra quantas cartas cada tipo rende.

**R5 · GW Bogles, carta a carta** 🟡 (leva 139, **motor v68**; falta o teste no aparelho)
- **Valor:** o baralho de Auras joga pela tela sabendo em quem cada Aura está, e os gatilhos de ganhar vida valem quando vêm juntos.
- **Aceite:** as 23 cartas com ficha `revisada` (texto de `.listas/oficiais.json`, consultas de 30/09/2026); regra conferida com a lista real; jogadas-chave pela tela em 360×780 com `auditaTela`.
- **Bug real do motor (muda resultado de partida):** **dois ou mais gatilhos do mesmo jogador ao mesmo tempo.** Depois da pergunta de ordem, o gatilho ia à pilha por um caminho que perdia o alvo, o valor, o custo opcional, a condição e o "você pode". Efeitos: Armadillo Cloak + Spirit Link ganhavam **0** de vida; gatilho com alvo ia sem alvo; gatilho opcional virava obrigatório. Agora o gatilho escolhido segue o mesmo caminho dos outros, e o último que sobra vai sozinho (uma pergunta a menos). Vale para todas as listas.
- **Sem rede:** Gladecover Scout e Slippery Bogle ganharam script com a resistência a magia (e a Silhana Ledgewalker passou a declará-la); a palavra-chave vale mesmo se o dado da carta vier sem ela. **GW Bogles mede 100% sem rede.** Só Vault of Whispers (Jund Wildfire) ainda depende do texto buscado.
- **Tela corrigida:**
  - **Aura ao lado de quem a carrega:** as permanentes vinham na ordem de chegada; agora cada Aura ou Equipamento fica colado, com um filete, logo depois da criatura. A Aura de terreno vai para a linha dos terrenos, ao lado dele, e não entra na conta dos terrenos.
  - **Alvos iguais:** dois Slippery Bogle, um com Auras e outro sem, eram um botão só (mirava o primeiro); agora cada um diz a força ("Slippery Bogle (3/1)"). Terrenos iguais dizem o que carregam ("Forest (desvirada, com Utopia Sprawl)").
  - **Olhar o topo:** carta que está entre as olhadas mas não pode ser pega aparece apagada (antes parecia escolhível e o toque dava em recusa); Malevolent Rumble diz "Pode levar uma permanente para a mão".
  - **Busca no grimório de uma carta:** cópias iguais viram uma carta com a contagem (Sheltering Landscape mostrava nove terrenos em fila).
  - **Mana de habilidade com custo:** a ficha Eldrazi Spawn mostra "Gerar {C} (sacrificar)" no lugar de "Ativar (sacrificar)".
- **Expectativas alteradas (com motivo):** `rules.unit` "M10 · dois gatilhos ao mesmo tempo" esperava uma segunda pergunta de ordem com uma opção só: passou a esperar a pilha pronta depois da primeira escolha. O cenário de scripts passou a mirar o oponente quando o alvo é um jogador (mirava "o primeiro da lista", que dependia do sorteio de quem começa e quebrou com dois scripts novos na biblioteca).
- **Testes:** `bogles.regras` (14, com a lista real); `faeries.regras` +1 (dois gatilhos opcionais simultâneos continuam opcionais); e2e R5 (2: alvo e mesa com Auras; gatilhos de vida, Malevolent Rumble e Sheltering Landscape).
- **Versão e goldens:** **motor v68**; um registro antigo com dois gatilhos simultâneos tinha duas escolhas de ordem e agora tem uma. Goldens regravados só pela versão. **Partida salva na v67 não abre.**
- **Cobertura de tela declarada:** sem teste de tela próprio — Gladecover Scout, Silhana Ledgewalker, Aura Gnarlid, Ancestral Mask, Sentinel's Eyes (fuga), Benevolent Blessing, Setessan Training, Mask of Law and Grace, Flaring Pain, Journey to Nowhere, Standard Bearer, Tormod's Crypt e Lifelink; têm teste de regra e usam o caminho de tela das Auras ou da escolha de alvo. Flaring Pain não foi exercitada contra uma carta que previna dano.
- **Fora:** as Auras continuam ocupando uma carta inteira cada na linha (cinco Auras num Bogle rolam para o lado); empilhar as Auras atrás da criatura é história de design (E53). O Shark com esta lista não foi revisado (trilha bot).

**R6 · Boros Bully, carta a carta** 🟡 (leva 144, **motor v69**; falta o teste no aparelho)
- **Valor:** o baralho de fichas e ganho de vida joga sem perguntas inúteis e com os custos escritos; e o portão do CI volta a dizer a verdade.
- **Aceite:** as 23 cartas com ficha `revisada` (texto de `.listas/oficiais.json`, consultas de 30/09/2026); regra conferida com a lista real; jogadas-chave pela tela em 360×780 com `auditaTela`.
- **Motor:** as 23 cartas estavam certas na regra. Uma mudança de fluxo (muda o registro da partida): **gatilhos idênticos da mesma fonte não pedem ordem** — a Lunarch Veteran com os dois Pássaros da Battle Screech perguntava "qual entra primeiro" entre duas opções iguais. Gatilhos diferentes continuam pedindo.
- **Tela corrigida:**
  - **Lampejo do passado sem mana** (Battle Screech, Prismatic Strands): o botão saía com o custo vazio; agora "virar 3 criaturas brancas", e a escolha é tocando nas cartas.
  - **Esgueirar-se** (Leonardo): o botão saía como "Ninjutsu · " sem custo; agora "Esgueirar-se · {W} → devolve <atacante>", e apagado com o motivo fora do combate.
  - **Devolver uma permanente** (Boros Garrison, Kor Skyfisher): iguais no mesmo estado vêm juntas, com a virada marcada (antes: nove terrenos em fila).
  - **Fichas:** o botão da habilidade diz o que ela faz ("Ativar ({2}, sacrificar): compra 1 carta"), porque a ficha não tem texto na folha.
  - **Cor de mágica:** Prismatic Strands dizia "a carta pede uma cor ao entrar no campo".
- **Portão do CI (vermelho desde a leva 137):** a causa era de tela, não de teste. Com a fonte do sistema do CI (mais larga) e nome de jogador comprido (partida online), o contador de vida crescia e "Grimório" passava por cima de "Cemitério"; a auditoria de sobreposição acusava em quatro testes da partida online. A trilha bot chegou ao mesmo diagnóstico e publicou primeiro (leva 143): com quatro contadores eles ganham a linha de baixo. Esta leva soma a rede de segurança: em telas até 399 px o nome encolhe com reticências, a vida ocupa até metade da linha e o rótulo do contador de zona é cortado dentro dele. Conferido rodando o e2e inteiro com a fonte larga (DejaVu Sans): só sobra o teste instável do scanner. O workflow ganhou um passo que **anota no job o nome de cada teste que falhou** (dá para ler pela API sem baixar o log).
- **Testes:** `boros.regras` (12, com a lista real); e2e R6 (2: gatilhos iguais, lampejo da Battle Screech e Squadron Hawk; Boros Garrison, Pista, Leonardo, Prismatic Strands e Kor Skyfisher). O apoio `comOficiais` ganhou a opção `cores` (a cor sai do custo de mana).
- **Versão e goldens:** **motor v69**; registro antigo com gatilhos idênticos tinha uma escolha de ordem que deixou de existir. Goldens regravados só pela versão. **Partida salva na v68 não abre.**
- **Cobertura declarada:** o verso da Lunarch Veteran (Luminous Phantom) não tem texto oficial em `.listas/oficiais.json`; o que o script faz no verso não foi conferido contra fonte nesta revisão. Sem teste de tela próprio: Novice Inspector, Raffine's Informant, Rally the Peasants, Thraben Charm, Perilous Landscape, Wind-Scarred Crag, Dust to Dust, Electrickery, Hallow e Martyr of Sands.
- **Fora:** Martyr of Sands pergunta quantas cartas revela com um botão por quantidade, sem dizer a vida de cada uma; a busca da Squadron Hawk mostra as cópias em fila (são até três toques). O teste `e2e · X11 scanner` continua instável (trilha scanner). O Shark com esta lista não foi revisado (trilha bot).

**R7 · Jund Wildfire, carta a carta** 🟡 (leva 148, motor v69 sem mudança; falta o teste no aparelho)
- **Valor:** o baralho de sacrifício joga dizendo o que cada custo pede; a jogada central (Cleansing Wildfire na própria Ponte) está conferida de ponta a ponta.
- **Aceite:** as 23 cartas com ficha `revisada` (texto de `.listas/oficiais.json`, consultas de 30/09/2026); regra conferida com a lista real; jogadas-chave pela tela em 360×780 com `auditaTela`.
- **Motor:** as 23 cartas estavam certas na regra; nenhuma mudança de resultado, **versão do motor mantida (v69)** e partidas salvas continuam abrindo. Dois reforços de dado: Writhing Chrysalis declara "desprovida de cor" no script (fica incolor mesmo se o dado da carta vier com cor) e **Vault of Whispers ganhou script** ({T}: {B}).
- **Sem rede:** com a Vault, **as sete listas Pauper medem 100% sem rede** (`node .listas/medir.mjs`). Fecha a pendência aberta na leva 48.
- **Tela corrigida:**
  - **Custo de sacrificar:** "Ativar (sacrificar outra)" virou "Ativar (sacrificar um artefato)" (Krark-Clan Shaman) e "sacrificar artefato ou criatura" (Makeshift Munitions).
  - **Adaptar:** Evolution Witness mostra "Adaptar 2 ({1}{G})" no lugar de "Ativar ({1}{G})".
  - **Escolha do sacrifício:** permanentes iguais e sem nada em cima vêm juntas (duas Ichor Wellspring eram duas cartas).
  - **Fichas com alvo:** o Mapa diz o que faz no botão.
- **Testes:** `jund.regras` (11, com a lista real); e2e R7 (1: custos, sacrifício da Fanatical Offering, Mapa, Cleansing Wildfire na Ponte com a busca).
- **Cobertura de tela declarada:** sem teste de tela próprio — Refurbished Familiar, Writhing Chrysalis, Gixian Infiltrator, Cast Down, Eviscerator's Insight, Terminate, Lembas, Makeshift Munitions, Slagwoods Bridge, Twisted Landscape, Vault of Whispers, Weather the Storm, Troublemaker Ouphe, Breath Weapon e Ancient Grudge; têm teste de regra e usam caminhos de tela já testados.
- **Fora:** Weather the Storm não mostra quantas cópias fará antes de conjurar; "não pode ser regenerada" (Terminate) não existe no motor porque nenhuma lista regenera. O Shark com esta lista não foi revisado (trilha bot).

**R8 · Walls Combo, carta a carta** 🟡 (leva 165, motor v69 sem mudança; falta o teste no aparelho)
- **Valor:** o combo do baralho sai pela tela, e a revisão carta a carta das sete listas Pauper fica completa (154 cartas).
- **Aceite:** as 24 cartas com ficha `revisada` (texto de `.listas/oficiais.json`, consultas de 30/09/2026); regra conferida com a lista real; o motor de mana do baralho feito pela tela em 360×780 com `auditaTela`.
- **Motor:** as 16 cartas que faltavam estavam certas na regra; nenhuma mudança de resultado, versão mantida (v69).
- **Bug real de tela:** **Freed from the Real** tem duas habilidades de {U} (vira e desvira a criatura encantada). As duas saíam como "Ativar ({U})"; a folha juntava botões de mesmo nome e o toque fazia sempre a primeira — **desvirar não podia ser usado**, então a Overgrown Battlement nunca gerava mana duas vezes. Com custo repetido, o botão passa a dizer o que cada habilidade faz ("Ativar ({U}): desvira a criatura encantada"). Mesma classe do bug da colheita de provas (R4): ações diferentes com o mesmo rótulo.
- **Testes:** `walls.regras` (8, com a lista real); e2e R8 (1: mana das muralhas, Aura na Battlement, os dois botões, desvirar e gerar mana de novo).
- **Fontes conferidas nesta leva:** o verso da Lunarch Veteran (Luminous Phantom) no mtg.wtf, MID 27b, em 04/10/2026 — confere com o script (pendência da R6 fechada). **Não conferido:** o lado Presságio do Sagu Wildling (Roost Seek) não tem texto em `.listas/oficiais.json` e a consulta ao mtg.wtf foi recusada por limite de requisições; o que o script faz nele não foi conferido contra fonte.
- **Cobertura de tela declarada:** sem teste de tela próprio — Drift of Phantasms, Sagu Wildling, Shield-Wall Sentinel, Bloodrite Invoker, Galvanic Alchemist, Orochi Leafcaller, Secret Door, Tuktuk Rubblefort, Pulse of Murasa, Reaping the Graves, Faerie Macabre e Moment's Peace; têm teste de regra e usam caminhos de tela já testados.
- **Fora:** a habilidade de dano da Tinder Wall, fora do bloqueio, aparece apagada com o motivo "escolha 1 alvo(s)" (devia dizer "só quando ela bloqueia"). O Shark com esta lista é assunto da trilha bot (B9).

**R3 a R8 · notas comuns às levas por lista** — uma leva por lista, nesta ordem (da que mais se joga contra o Shark para a que tem mais mecânica própria): R3 Mono Blue Faeries (feita, leva 131) · R4 Elves (feita, leva 136) · R5 GW Bogles (feita, leva 139) · R6 Boros Bully (feita, leva 144) · R7 Jund Wildfire (feita, leva 148) · R8 Walls Combo (feita).
- **Aceite de cada uma:** todas as cartas da lista com ficha `revisada` ou com a pendência escrita; uma partida guiada da lista pela tela (as jogadas-chave do baralho) no e2e; captura das decisões novas; a sonda R0 com mais uma semente para a lista.
- **Estimativa:** 7 a 8 levas. Apoio: a auditoria de texto fez 111 cartas numa leva (105), mas sem tela; mecânica nova rendeu de 4 a 6 cartas por leva; aqui o motor já está auditado e o trabalho é de tela, com 17 a 24 cartas por lista e muita mecânica repetida entre listas (14 auras, 8 lampejos, 7 modais).

**R9 · Homologação independente das Pauper** 🟡 (leva 178, motor v70) — sete revisores independentes, um por lista, só com o texto oficial (`.listas/oficiais.json`), o motor e o apoio `listas.mjs`; sem acesso ao ROADMAP, às fichas nem aos testes das levas R1–R8. Cada um escreveu experimentos próprios (partidas reais da lista, casos negativos, interação entre cartas) e devolveu só o que reproduziu. 154 cartas relidas; **10 divergências de regra que mudam o resultado da partida**, todas corrigidas com teste antes (`homologacao.regras.test.mjs`, 10 testes que falhavam):
- **Perturbar (Lunarch Veteran) e presságio (Sagu Wildling → Roost Seek) saíam de graça.** A carta troca de face antes do pagamento e o custo era procurado na face de trás, que não tem; caía em {0}. Agora o custo vem da frente.
- **Hallow numa mágica de criatura prevenia para sempre.** A marca ficava na criatura e ela nunca mais causava dano. Agora acaba na limpeza ("neste turno").
- **Lembas** era embaralhada no grimório mesmo depois de voltar à mão (Evolution Witness em resposta) ou de ser exilada (Nihil Spellbomb em resposta). Agora só se ainda está no cemitério (400.7).
- **Masked Vandal** (e todo gatilho "pode pagar" com alvo): com o alvo já fora do campo, o motor perguntava o custo e, pago, exilava a carta de onde ela estivesse (até do grimório). Agora a habilidade sai da pilha antes da pergunta (608.2b).
- **Insanidade no descarte da limpeza** virava o turno com a mágica na pilha: ela resolvia na manutenção do oponente, com os terrenos dele desvirados. Agora há prioridade na limpeza e depois outra limpeza (514.3a).
- **Utopia Sprawl + Abundant Growth** na mesma Forest: o mana extra só valia para as opções que existiam quando a Sprawl entrou; na ordem normal de jogo, a cor da Growth saía sem o bônus e a Armadillo Cloak não era conjurável. Agora o extra vale para toda a produção.
- **Nyxborn Hydra concedida** continuava valendo como criatura: contava na afinidade da Salt Road Packbeast, pagava o "vire uma criatura" da Jaspera Sentinel, atacava e bloqueava. Agora é só Aura enquanto anexada.
- **Permanente virada para baixo** (Birchlore Rangers por metamorfose) era contada como Elfo pela Distant Melody e tinha o {G} somado à devoção da Nylea's Disciple. Agora não tem tipo nem custo (708.2).
- **Standard Bearer:** o texto pede "um Flagbearer no campo"; o motor só aceitava o do oponente. No espelho (Bogles × Boros têm os dois) o jogador agora pode mirar o próprio, e metamorfo (Masked Vandal) conta como Flagbearer. Leitura literal do texto oficial; sem ruling conferido.
- **Golden:** as quatro partidas-referência regravadas só pela versão (69 → 70); nenhuma jogada mudou.
- **Simplificações que alteram resultado, agora declaradas** (viram a história 16º-r9c, decisão por estrutura junto da R12): **regra das lendas não existe** (dois Leonardo, Big Brother ficam em campo); **o atacante não divide o dano** entre vários bloqueadores (o motor dá o letal na ordem em que o defensor declarou); **o jogador não escolhe qual mana paga o genérico** (mana flutuante sai em ordem fixa; com {G}{G}{U}{U}{U} a Freed from the Real gasta os azuis e o combo do Walls não começa — contorno: gerar outra cor para o genérico) e o pagamento automático não enxerga mana de habilidade ativada (Orochi Leafcaller, Saruli Caretaker, Tinder Wall, Eldrazi Spawn, Birchlore Rangers, Jaspera Sentinel: é preciso gerar antes) nem guarda a cor da insanidade; **busca "por característica" é obrigatória** (as três Landscapes, Roost Seek; pela regra o jogador pode não achar); **reciclar não usa a pilha**; **cópias de rajada** (Weather the Storm, Reaping the Graves) nascem como habilidades, sem o gatilho de rajada, e não são alvo de anulação; **insanidade e ward** abrem como decisão imediata, sem gatilho na pilha; **ninjutsu no passo de fim de combate** não é oferecido (o combate já foi desmontado); **ordem do fundo** em Vidência e Lead the Stampede não é escolhida; **Winding Way** escolhe o tipo ao conjurar (já declarado); **Thraben Charm** modo 3 exige ao menos um alvo; atacante morto continua na lista do combate (sem efeito visto).
- **Tela (história 16º-r9b, próxima leva):** registro diz "anulou" e "(indestrutível)" quando o Hydroblast não fez nada; pilha explicada mostra a habilidade ativada no lugar do gatilho (Harrier Strix, Sewer-veillance Cam); sobrecarga rotulada "Conjurar sem pagar mana"; "Disturb" em inglês; ward chamado de "vigilância"; seta solta em ação sem alvo (Cast into the Fire, Faerie Macabre); faixa de insanidade diz "sem mana" quando falta alvo; cor escolhida (Benevolent Blessing, Utopia Sprawl) não aparece na mesa; habilidade do par (Galvanic Alchemist) sai "Ativar" puro; canalizar e Faerie Macabre sem custo no rótulo; descrições de reserva em inglês ("flying creature", "return held", "−NaN/−NaN"); ordem de gatilhos com botões iguais quando o valor difere; registro do ninjutsu fala antes de resolver.
- **Texto oficial:** nenhum revisor achou texto truncado ou marcado incerto nas 154 cartas.
- **Testes:** `homologacao.regras` (10). Portão completo verde.
- **Fora:** as histórias 16º-r9b (tela) e 16º-r9c (estruturas); nenhuma partida guiada nova pela tela nesta leva.

**Proteção contra a cor à escolha pela tela** 🟡 (leva 179, motor v70 sem mudança) — relato do aparelho: "escolhi proteção contra uma cor em resposta a uma mágica de dano daquela cor e tomei o dano".
- **Causa (tela, classe do rótulo repetido):** a habilidade "a criatura alvo ganha proteção contra a cor à sua escolha" (Mother of Runes, Benevolent Bodyguard, Alseid of Life's Bounty) traz a cor na ação, como a mana de qualquer cor. A folha desenhava "Gerar {W}", "Gerar {U}"… — cinco botões que juntavam todos os alvos e executavam o primeiro: a proteção ia sempre para a primeira criatura da lista (em geral a própria Mother), não para a que ia levar o dano.
- **Correção:** um botão por criatura ("Proteger de uma cor ({T}) → Thraben Inspector"); tocado, a folha pergunta "Contra qual cor?" com as cinco cores. Ações que só diferem na cor nunca mais são executadas pela primeira (`escolher` → `escolherCor`).
- **Motor conferido, sem mudança:** `protecao.regras` (5 testes) fixa a regra 702.16 — mágica com alvo perde o alvo; dano sem alvo (Breath Weapon) é prevenido só na protegida; combate; **fonte multicolorida barra com qualquer uma das cores** (Terminate preta e vermelha; Slippery Bogle verde e azul); fonte incolor (Writhing Chrysalis) passa; criatura da cor não bloqueia a protegida. Esses cinco já passavam antes: são guarda-corpo, não reprodução.
- **Texto oficial:** Mother of Runes conferida em casualplaneswalker.com em 04/10/2026.
- **Testes:** e2e "proteção contra cor · Mother of Runes" (falhava: a folha mostrava cinco "Gerar"); `protecao.regras` (5).
- **Simplificação declarada:** a cor é escolhida ao ativar (pela regra, na resolução); o oponente vê a cor antes de responder.
- **Fora:** Benevolent Bodyguard e Alseid usam o mesmo caminho e não têm teste de tela próprio.

**R9b · Tela da homologação** 🟡 (leva 181, motor v70 sem mudança de regra) — o que os revisores apontaram como texto errado ou enganoso:
- **Registro que mentia:** Hydroblast numa mágica que não é vermelha dizia "anulou" (e a mágica resolvia); numa permanente que não é vermelha dizia "não destruiu (indestrutível)". Agora "não anulou X: sem efeito" e "não destruiu X: sem efeito"; "indestrutível" só quando é esse o motivo (o evento do motor passou a dizer o porquê; o estado não muda).
- **Pilha explicada:** o gatilho de entrada da Harrier Strix e da Sewer-veillance Cam mostrava o texto da habilidade ativada da mesma carta. Gatilhos e ativadas são separados por tipo antes de casar com as linhas do texto oficial.
- **Rótulos:** custo alternativo que cobra mana (sobrecarga da Electrickery) dizia "Conjurar sem pagar mana" → "Custo alternativo · Sobrecarga {1}{R}…"; "Disturb" → "Perturbar"; ward cobrado como "vigilância de X" → "salvaguarda de X"; ação com zero alvos (Cast into the Fire, Faerie Macabre) não deixa mais a seta solta; canalizar (Mirrorshell Crab) e Faerie Macabre dizem "descartar esta carta" no custo; a faixa de insanidade diz "sem alvo" quando o que falta é alvo, não mana.
- **Dicionário de efeitos:** 35 frases saíam em inglês, com chave de script ou sem frase ("cada flying creature", "self source", "return held", "−NaN/−NaN", "indestructible"). Todas em português; um teste percorre os efeitos de todos os scripts e derruba o portão se voltar inglês, chave ou NaN.
- **Testes:** `homologacao.tela.unit` (6, todos falhavam).
- **Fora (história 16º-r9d):** cor escolhida visível na mesa; botão da habilidade do par; ordem de gatilhos com botões iguais; registro do ninjutsu antes de resolver; "pode" sem custo descrito como pagamento. Os rótulos da folha foram conferidos por leitura do código da tela (teste de fonte), não por partida guiada.

**R10 · Plano do lote Commander** ✅ (leva 184, motor v70 sem mudança) — o plano saiu do texto oficial, não de palpite.
- **Texto oficial:** 158 cartas das duas listas não tinham texto conferido. Coletadas em 05/10/2026 e gravadas em `.listas/oficiais-commander.json`, cada uma com fonte, data e nota do que foi montado de duas fontes. Scryfall e Gatherer recusaram (403); custo, tipo, P/T e rulings vêm de api.magicthegathering.io (redação às vezes antiga) e a redação atual de casualplaneswalker.com, mtg.wtf, mtgnexus.com e grimoria.app. Páginas HTML erraram custo de mana em mais de 20 leituras (o custo é imagem); valeu o que duas fontes estruturadas disseram. **Incertas (2):** Kytheon, Hero of Akros (fonte única, redação antiga) e Sorin of House Markov (o gatilho de transformar diverge entre fontes). Não escrever script delas sem nova conferência.
- **Triagem** (`.listas/triagem-commander.json`, 164 cartas não básicas): **54 prontas** (script completo; falta a auditoria frase a frase) · **24 no balde A** (cabem no vocabulário de hoje; 5 delas só têm a nota do script velha) · **70 no balde B** (pedem primitiva nova) · **16 no balde C** (dependem de estrutura que o motor não tem). Por lista — Killian: 25 prontas, 16 A, 38 B, 9 C. Malcolm + Kediss: 34 prontas, 8 A, 32 B, 7 C.
- **O achado que muda a estimativa:** o balde B é uma cauda longa. São ~55 primitivas para 70 cartas, e 45 delas destravam uma carta só. As que rendem: reanimar por valor de mana (7 cartas), "ative somente se" (5), revelar até achar (5: o plano inteiro do baralho do Malcolm), édito (4), modal de escolher dois ou três (4), mana com dano ou vida (4), custo alternativo novo (4), kicker (3), marcador nomeado (3), entra virado a menos que (3).
- **Estruturas (balde C):** camadas de efeito contínuo 613 (7 cartas: Darksteel Mutation, Reprobation, Mishra's Factory, Blinkmoth Nexus, Smuggler's Copter, Animate Dead, Gideon), veneno (3), fase (2), cópia (2), suspender (1), troca de controle (1).
- **Ordem proposta para a R11** (cada linha uma leva, salvo indicação):
  1. Auditoria frase a frase das 54 prontas + as 5 de nota velha contra o texto novo (a auditoria das Pauper achou 18 erros em 138 cartas; esperar de 5 a 8 aqui).
  2. Os dois comandantes e os terrenos: Killian (redução por alvo), Malcolm (dano por Pirata → Treasure), Kediss, e os 20 terrenos e pedras de mana (entra virado a menos que, mana com sacrifício, mana com dano). 2 levas. Terreno aparece em toda mão: é o que mais se sente.
  3. Resto do balde A (Elas il-Kor, Leonin Relic-Warder, Open the Armory, Reprieve, Rite of Oblivion, Swan Song, Bounty Agent, You See a Guard Approach…).
  4. Revelar até achar (Polymorph, Transmogrify, Reality Scramble, Reweave, −2 da Lukka): o baralho do Malcolm passa a fazer o que ele faz.
  5. Reanimar por valor + modal múltiplo + édito: o miolo do Killian (Patch Up, Call of the Death-Dweller, Ascend from Avernus, Sevinne's Reclamation, Profane Command, Silverquill Command, Wretched Confluence, Austere Command, Accursed Marauder, os dois Priests). 2 a 3 levas.
  6. "Ative somente se", kicker, marcador nomeado, custos alternativos, gatilho atrasado. 2 levas.
  7. A cauda de uma carta por primitiva: 4 a 6 levas, ou as cartas ficam manuais declaradas.
- **Estimativa honesta:** R11 de 13 a 17 levas; R12 (estruturas) de 6 a 10. As duas listas a 100% ficam a **19 a 27 levas**. O Malcolm chega antes: 42 das 81 cartas já estão prontas ou no balde A.
- **Decisão pendente do dono do produto:** hoje lista com carta parcial ou manual não joga (modo único, leva 113). Com essa regra, nenhuma lista de Commander joga antes de ~12 levas. Alternativa: deixar a lista jogar quando só restarem cartas do balde C, com essas cartas marcadas "manual" na mesa (o jogador aplica o efeito). Não foi feito; fica registrado para decidir.
- **Testes:** `commander.lote.unit` (2): toda carta das listas tem texto com fonte e data; a triagem cobre as mesmas cartas e toda B ou C diz o que falta.
- **Fora:** nenhum script escrito ou alterado nesta leva; `medir.mjs` ainda conta "sem texto conferido" só por `oficiais.json` (passa a ler os dois arquivos na auditoria da R11).

**R11.1 · Auditoria das cartas de Commander "prontas"** 🟡 (leva 189, motor v71) — as 54 cartas com cobertura completa e as 5 de nota velha, lidas frase a frase contra `.listas/oficiais-commander.json` (consultas de 05/10/2026). 46 conferem. **13 divergiam:**
- **Corrigidas, com teste que falhava (`commander.regras`, 8 testes):**
  - **Anguished Unmaking, Utter End** — "target nonland permanent": miravam terreno.
  - **Miscast** — "instant or sorcery spell unless its controller pays {3}": o script cobrava {1} e mirava qualquer mágica que não fosse de criatura.
  - **Flusterstorm** — só mirava instantânea e não tinha rajada. Agora instantânea ou feitiço, com rajada.
  - **Zulaport Cutthroat, Cruel Celebrant** — "this creature or another creature you control dies": a própria morte não disparava; a Celebrant conta também planeswalker.
  - **Soul-Guide Lantern** — a habilidade de exilar pedia um jogador alvo (podia ser você); o texto exila o cemitério de cada oponente, sem alvo. Entraram o exílio de uma carta ao entrar e a habilidade de {1} que compra.
  - **Angelic Gift** — faltava comprar ao entrar. **Flickering Ward** — faltava tudo menos anexar: cor ao entrar, proteção sem derrubar a si mesma, {W} volta para a mão.
- **Rebaixadas a parcial, com o que falta escrito** (eram "completas" só porque o motor lia a linha de mana): **Caves of Koilos, Shivan Reef** (gerar cor deveria causar 1 de dano a você) e **Tainted Field** (cor só com um Swamp). Primitivas na R11.2.
- **Devolvida a manual:** **Curiosity** — o gatilho de dano da criatura encantada não sabe quem recebeu o dano ("to an opponent"); mesma classe do Malcolm.
- **Motor:** filtros de alvo `targetNotLand` e `targetTypes`; exílio do cemitério de cada oponente; filtro "criatura ou planeswalker" em gatilho; devolver para a mão a partir do campo; proteção que não derruba a própria Aura. Versão 70 → 71 (as cartas acima mudam de comportamento); as quatro partidas-referência regravadas só pela versão.
- **Triagem depois da auditoria:** 55 prontas e auditadas · 19 A · 74 B · 16 C. Killian 26/13/40/9; Malcolm 34/6/34/7.
- **Simplificação declarada:** nas cópias da Flusterstorm o "pague {1}" é perguntado cópia a cópia, na ordem da pilha (regra certa, muitos toques).
- **Fora:** `medir.mjs` ainda não lê `oficiais-commander.json` para a coluna "com texto"; Command Tower e Exotic Orchard não tiveram teste novo (cobertos pelos testes M13 existentes); homologação independente das cartas de Commander fica para a R13.

**R11.2a · Terrenos e pedras de mana do Commander** 🟡 (leva 191, motor v72) — 19 cartas passam a completas, todas com teste citando a frase do texto oficial (`commander.regras`, bloco R11.2, 8 testes).
- **Dano ao gerar cor** (regra de mana nova, `manaRule`): Caves of Koilos, Shivan Reef, Talisman of Creativity, Talisman of Hierarchy — {C} de graça, cor custa 1 de dano. Os Talismãs antes só geravam uma das duas cores. **Vida para gerar cor, com condição:** Spire of Industry (um artefato). **Cor condicional:** Tainted Field (um Swamp).
- **Entra virado a menos que você controle…:** Isolated Chapel (Plains ou Swamp), Sulfur Falls (Island ou Mountain). Só os seus terrenos contam.
- **Só script:** Orzhov Basilica, Temple of Silence, Secluded Steppe, The Dross Pits, The Fair Basilica, Kher Keep (ficha Kobolds of Kher Keep 0/1 vermelha), Vault of the Archangel, Dwarven Ruins, Svyelunite Temple, Phyrexian Tower, Fetid Heath (três habilidades de mana: {W}{W}, {W}{B}, {B}{B}).
- **Tela:** o botão diz o preço da cor — "Gerar {W} (1 de dano em você)", "Gerar {G} (paga 1 de vida)". Conferido no código da tela, sem partida guiada.
- **Pagamento automático:** o genérico sai em {C} e nos básicos antes de ferir (teste: Mind Stone com Plains + Caves não custa vida; Thraben Inspector só com a Caves custa 1).
- **Simplificações declaradas:** o dano dos terrenos de dor e Talismãs é aplicado como perda direta de vida (não passa por prevenção nem conta como dano para gatilhos); as habilidades de sacrificar por duas manas (Dwarven Ruins, Svyelunite Temple, Phyrexian Tower) e a Fetid Heath não entram no pagamento automático — o jogador ativa antes, como a Tinder Wall.
- **Medição (`medir.mjs`):** Killian 36% → 48% (49 cópias manuais, 4 parciais); Malcolm + Kediss 50% → 57% (32 manuais, 11 parciais). Triagem: 74 prontas · 9 A · 65 B · 16 C.
- **Golden:** regravadas só pela versão (71 → 72).
- **Fora desta leva:** Shineshadow Snarl ("você pode revelar": pede decisão nova), Cephalid Coliseum (limiar: "ative somente se"), Saprazzan Skerry (marcador nomeado), Path of Ancestry (vidência ao gastar a mana), Windbrisk Heights (hideaway), Mishra's Factory e Blinkmoth Nexus (camadas). Os dois comandantes ficam para a R11.2b.

## Épico CR · Conformidade com as Comprehensive Rules

**Decisão de 06/10/2026 (dono do produto):** a evolução do motor deixa de ser guiada lista a lista e passa a ser guiada pelas regras: construir, implementar, revisar por simulação, corrigir e consolidar até o motor contemplar as Comprehensive Rules inteiras (documento de 25/09/2026, 147 regras, 1.174 itens numerados, 1.991 subitens de letra). A homologação final é do dono do produto, jogando com várias listas e relatando os bugs.

**O que "100%" quer dizer aqui, e o que não quer.** O motor não interpreta texto de carta (ADR do motor): cumprir uma regra significa que existe a primitiva e que ela se comporta como a regra manda. Para uma carta jogar, alguém ainda escreve o script dela com essas primitivas. Conformidade de regras e cobertura de cartas são duas medidas; este épico cuida da primeira e torna a segunda barata.

**Instrumentos (ficam no repositório):**
- `.regras/indice.json` — número e título de cada regra e item.
- `.regras/cr-2026-09-25.txt` — o texto integral da edição em que o mapa se apoia (decisão 10b de 06/10/2026). Edição nova entra como arquivo novo, ao lado.
- `.regras/mapa.json` — cada item com `status` (coberta · parcial · ausente · definicao · fora), `evidencia` (linha de código, teste ou sonda), `falta`, `esforco` (P · M · G), `depende` e, para 701 e 702, a frequência em cartas. Quando um item muda de status, o teste que prova entra em `testes`.
- `node .regras/medir.mjs [--fases] [--falta NNN]` — o placar. `regras.mapa.unit` derruba o portão se o mapa ficar para trás do índice, afirmar cobertura sem evidência ou a cobertura cair.
- Testes de conformidade levam o número da regra no nome: `test('CR 704.5j · …')`.

**Decisões do dono do produto (06/10/2026)** — respondidas uma a uma; valem até nova decisão.

| # | Assunto | Decisão | Efeito no plano |
|---|---|---|---|
| 1 | Fora de escopo | Planechase, Archenemy, Vanguard, Conspiracy, Unfinity, aposta, subjogos, equipes e itens de jogo físico ficam fora | As 176 regras "fora" não voltam |
| 2 | Mesa de três e quatro jogadores | No fim, na CR6 | CR2g faz combate de dois; a CR6 remexe combate e prioridade (10 a 14 levas) |
| 3 | Lista com carta manual | Modo único mantido: só joga lista 100% | Commander só joga quando as listas fecharem |
| 4 | Ordem das palavras-chave | Pelos formatos do dono (Pauper e Commander), frequência geral como desempate | Ordem da CR4 |
| 5 | Partida salva entre versões | Como está: versão nova invalida a partida salva | Sem trabalho extra |
| 6 | Teste em aparelho | Só no fim do épico | O épico não para por teste; a CR7 abre com roteiro de homologação |
| 6b | Relato de bug | Botão "Relatar" na mesa (copia a partida e o registro) | 1 leva, feita na véspera da homologação (CR7) |
| 7 | Scripts de carta durante o épico | Regras e, na mesma leva, as cartas das listas que cada estrutura destrava | Cerca de 15% mais levas; R11.2b em diante deixa de estar pausado e passa a andar a reboque das fases |
| 8 | Regras × cartas | Scripts sob demanda agora; leitor de texto com revisão depois da CR2 | 8 a 12 levas depois da CR2 |
| 9 | Numeração das levas | Prefixo por trilha: `Leva M-206` | Feita nesta leva (Q13) |
| 10a | Edição nova das regras | Atualizar a cada edição | Meia leva por edição |
| 10b | Texto das regras | No repositório | `.regras/cr-2026-09-25.txt` |

- **Divergências registradas (par técnico):** 3 e 6 juntas adiam todo teste real para o fim, e a homologação virá com bugs antigos e novos misturados; 10b republica num repositório público um texto que a Wizards distribui de graça — se virar problema, o arquivo sai para os documentos do Projeto sem outra mudança.
- **Estimativa refeita:** de 160–220 para 185–255 levas (decisão 7, botão "Relatar" e meia leva do prefixo).

**Q13 · Numeração de leva por trilha** 🟡 — a guarda de agregação aceita `Leva <P>-<n>`, em que `<P>` é a inicial da trilha (motor M, bot B, geral G, design D, scanner S, infra I). Cada trilha conta a sua; a contagem antiga, sem prefixo, continua valendo para quem não migrou e segue barrando repetição.
- **Valor:** o número deixa de colidir entre trilhas (na trilha do motor, 9 colisões em 12 levas, cada uma repetindo o portão de 25 minutos).
- **Aceite:** `Leva M-10` do motor passa ao lado da `Leva 10` e da `Leva B-10` do bot; prefixo de outra trilha é barrado com o prefixo certo na mensagem.
- **Testes:** `agregacao.unit` Q13 (2). **Fora:** renumerar o histórico; obrigar as outras trilhas a migrar (cada uma adota quando quiser, a partir do maior número publicado).

**X11 · Linha de coleção estável (correção pedida pelo dono, feita pela trilha do motor)** 🟡 (leva M-207) — o teste `e2e · X11 scanner com foto de carta inclinada` derrubava o portão de todas as trilhas em cerca de uma rodada a cada três. Não era só o teste: o scanner entregava ao leitor, em parte dos quadros, a beira da moldura no lugar da linha de coleção, e a edição não saía.
- **Causa:** com carta de borda preta sobre fundo escuro, o contorno alterna entre a borda de fora e a moldura de dentro; a faixa de coleção (17% da altura) cortava a segunda linha, e o seletor de linha escolhia a moldura hachurada de tom médio, que passava por "borda preta".
- **Correção no scanner:** faixa de coleção com 22% da altura; o seletor só aceita linha cuja margem de cima também é escura (o texto fica dentro da borda preta).
- **Medição:** conjunto de 27 fotos — nome 27/27 (igual), edição 22/27 → 24/27. O e2e passou 10 de 10 rodadas seguidas (antes, 5 de 8).
- **No teste:** a conferência com OCR de verdade olha todos os recortes distintos que o leitor recebeu (até 18), não só os quatro primeiros do nome e o primeiro da coleção; a afirmação é a mesma.
- **Correção do diagnóstico (leva M-211):** a causa principal do vermelho por sorteio estava no leitor de mentira do teste, não no scanner. O laço tenta em rodízio a linha do nome pelo contorno, pela moldura guia e pelo contorno de cabeça para baixo; o leitor de mentira entregava o nome a qualquer tentativa. Quando caía na de cabeça para baixo, o app passava a tratar a carta como invertida e lia a linha de coleção do lado errado. E, com a fila vazia, três leituras sem nome valiam "a carta saiu", e a mesma carta entrava de novo depois da espera de 2,5 s ("2 !== 1", visto no portão da M-210).
- **No teste (M-211):** o leitor de mentira passa a olhar o recorte (só "lê" o que está em pé e retificado, como um OCR de verdade) e continua lendo a carta parada. 15 de 15 rodadas, nove delas com três cópias ao mesmo tempo. As mudanças da M-207 no scanner ficam: a melhora de 22/27 para 24/27 foi medida no conjunto de fotos, sem depender desse teste.
- **Fora:** o teste da foto de cabeça para baixo usa o mesmo leitor de mentira no modo antigo; se voltar a falhar, liga-se o mesmo modo nele.

**Q14 · Portão em duas fases, com segunda chance para teste de tela** 🟡 (leva M-212; pedido do dono em 07/10/2026 e pedido da trilha geral à infra) — entre as levas M-206 e M-211, 10 de 16 rodadas do portão da trilha do motor foram perdidas: 6 por teste de tela instável (X11 do scanner, H2, H7 e I7 da trilha geral) e 4 porque outra trilha publicou no meio. Cada rodada custava 25 a 27 minutos.
- **Valor:** publicar deixa de depender de sorte; a entrega fica mais rápida para todas as trilhas.
- **Duas fases (`portao.mjs`, por trás do `npm test`):** rápida (tudo menos o navegador, um processo por núcleo) e de tela (`e2e.test.mjs` sozinho). A rápida caiu, a de tela nem começa. Medido nesta máquina de dois núcleos: fase rápida de ~12 para 6,6 min; fase de tela 15 min; portão inteiro de ~27 para ~22 min.
- **Segunda chance, só na tela:** teste que cai roda de novo sozinho, uma vez. Passou → portão verde e o teste sai na lista de INSTÁVEIS (aviso no CI). Caiu de novo → vermelho. Mais de cinco quedas não se repetem. `PORTAO_SEM_REPETIR=1` desliga.
- **Publicar não termina portão perdido:** o `main` é conferido a cada dois minutos; se andou, a fase é interrompida e a volta recomeça (até 6 voltas). Antes a descoberta vinha no fim, 25 minutos depois.
- **CI:** dois passos no `gate.yml` (rápida, depois tela), tempo-limite de 40 min, e o log inteiro guardado como artefato quando o portão cai.
- **Aceite:** `npm test`, `npm run publicar` e o CI passam pelo mesmo `portao.mjs`; as duas fases somadas cobrem todos os arquivos `.test.mjs`; nenhum arquivo da fase rápida abre navegador.
- **Testes:** `portao.unit` (4). **Risco declarado:** a segunda chance pode esconder um defeito intermitente de verdade no produto; por isso o aviso é alto e cada instável é dívida com dono.
- **Instável conhecido hoje:** `e2e · I7 toque sem realce…` (trilha geral) cai com o arquivo inteiro e passa sozinho — depois do toque no acento a tela é redesenhada e o Tab pode cair antes de o foco existir.
- **Fora:** fila de publicação entre trilhas (tentei uma trava em `refs/vez/*`; o proxy do ambiente recusa esse tipo de referência, e trava em ramo dispararia o CI); dividir a fase de tela em dois navegadores em paralelo; Pages só com portão verde (depende do dono, em Settings → Pages).

**CR0 · Mapa regra × motor** ✅ (leva 194, motor v72 sem mudança) — 14 auditores independentes, um por trecho das regras, cada um obrigado a mostrar evidência vista e a escolher o nível mais baixo na dúvida.

| Fase | Cobertos | Parciais | Ausentes | Definição | Fora | Cobertos ÷ aplicáveis |
|---|---|---|---|---|---|---|
| CR2a · zonas, objetos e ações de estado (400–408, 608, 703, 704, 733) | 30 | 16 | 10 | 7 | 5 | 54% |
| CR2b · gatilhos e estáticas (603, 604) | 4 | 8 | 3 | 3 | 1 | 27% |
| CR2c · conjurar, ativar e pagar (113–118, 600–602, 605–609, 700) | 29 | 35 | 22 | 10 | 1 | 34% |
| CR2d · efeitos contínuos e camadas (610–613) | 1 | 9 | 18 | 0 | 1 | 4% |
| CR2e · substituição e prevenção (614–616) | 4 | 9 | 18 | 1 | 0 | 13% |
| CR2f · cópia (707) | 0 | 2 | 11 | 1 | 0 | 0% |
| CR2g · turno e combate (500–514) | 19 | 21 | 16 | 4 | 2 | 34% |
| CR2h · conceitos do jogo (100–123 restantes, 200–213) | 44 | 47 | 48 | 30 | 22 | 32% |
| CR3 · ações de palavra-chave (701) | 13 | 12 | 39 | 1 | 6 | 20% |
| CR4 · habilidades de palavra-chave (702) | 19 | 21 | 150 | 1 | 4 | 10% |
| CR5 · tipos e formatos de carta (300–315, 705–732) | 36 | 23 | 96 | 40 | 66 | 23% |
| CR6 · multijogador e variantes (800–905) | 5 | 8 | 44 | 10 | 68 | 9% |
| **Total** | **204** | **211** | **475** | **108** | **176** | **23%** |

- **Onde o motor é raso de verdade:** camadas (613: poder e resistência são uma soma solta; não existe "vira N/N", perder habilidade, mudar tipo, cor ou controle), substituição (614: cada caso é um `if`; nada de regeneração, "em vez de", escudos de prevenção), cópia (707: só a rajada, e como gatilho), gatilho atrasado e reflexivo (603.7, 603.12), pagamento com escolha (601.2: híbrido, phyrexiano, mana com restrição, custos que outra carta aumenta ou reduz), combate (510.4 sem segundo passo de dano para iniciativa; 510.1c o atacante não divide o dano; 506/508 não se ataca planeswalker nem batalha) e mesa de três ou mais jogadores.
- **As dependências mais citadas pelos auditores:** 601 (70 itens), 613 (61), 614 (58), mais de dois jogadores (50), 603 (43), 707 (42). São essas seis estruturas que destravam o resto: por isso a CR2 vem antes das palavras-chave.
- **Tamanho estimado pelos auditores dos 686 itens parciais ou ausentes:** 318 pequenos, 292 médios, 76 grandes.
- **Escopo marcado "fora" (176 itens), a confirmar pelo dono do produto:** adesivos e Atrações (Unfinity), aposta, Planechase, Vanguard, Archenemy, Conspiracy, equipes e Gigante de Duas Cabeças, subjogos. Podem voltar; estão no mapa com o motivo.

**CR1 · Bugs reproduzidos pela auditoria** ▶ — cada um vira teste com o número da regra antes da correção. 2 a 3 levas.
- **Resultado de partida errado hoje:** ações de estado rodam no meio da resolução (704.3, 608.2: "cada oponente perde 1, você perde 1" com os dois em 1 de vida dá vitória em vez de empate); objeto que sai e volta continua sendo alvo da mágica antiga (400.7); duas mortes simultâneas não se veem (603.10a: dois Zulaport Cutthroat geram 3 gatilhos, não 4); iniciativa e golpe duplo sem prioridade entre os dois danos (510.4); atacante não divide o dano (510.1c); dano prevenido da limpeza com insanidade (514.2); gatilho de fim de combate só do jogador ativo (511.2).
- **Custos:** mana phyrexiana paga 2 de vida sem perguntar e sem conferir a vida (107.4f, 118.13, 119.4); pagar vida exige vida estritamente maior que o custo (119.4); carta sem custo de mana é conjurada de graça (202.1b, 118.6); X pago não entra no valor de mana na pilha (202.3e).
- **Ações de estado:** regra das lendas (704.5j); anexo ilegal não cai, Aura que entra sem ser conjurada fica solta (704.5m, 704.5n, 303.4f); +1/+1 e −1/−1 não se anulam (704.5q); o laço não repete até estabilizar (704.3).
- **Fichas e cartas:** fichas de mesmo nome dividem as características (111.3: o Bird 2/2 azul da Swan Song sai 1/1 branco depois de uma Battle Screech); Krosan Grip ignora a própria fração de segundo (702.61); proteção impressa na carta não existe (702.16); medo, intimidar, sombra e travessia são ignorados (702.36, 702.13, 702.28, 702.14); carta virada para baixo mantém a cor e ignora bônus de Aura (708.2, 613.4c).
- **Buscas e efeitos:** Mystical Tutor embaralha a carta que devia ficar no topo (701.24b); busca por característica não deixa "não achar" (701.23b); dano 0 conta como dano (120.8); gatilho modal oferece modo sem alvo legal (700.2b); gatilho "se" de outra permanente não confere a condição (603.4); `tap_mana` recusado durante "a menos que pague" (605.3a).
- **Commander e mesa:** Veículo lendário recusado como comandante (903.3); jogador que sai numa mesa de três deixa as permanentes no campo (800.4); motivo da derrota ao conceder sai como "vida".

**CR1a · Primeira leva de correções** 🟡 (leva 196, motor v73) — 14 testes de conformidade em `cr.conformidade.test.mjs`, todos falhavam antes. Placar: 204 → 207 cobertos, 211 → 208 parciais.
- **119.4** pagar vida com exatamente aquela vida (antes exigia vida maior); a Spire of Industry só gera cor se houver a vida. **107.4f** mana phyrexiana paga com mana quando há a cor (antes tirava 2 de vida com a Ilha desvirada) e só usa vida que o jogador tem; a escolha livre entre mana e vida fica na CR2c.
- **202.1b** carta sem custo de mana não é conjurável pelo custo normal. **202.3e** o X pago conta no valor de mana na pilha (Spell Snare).
- **120.8** dano 0 não dispara "recebeu dano". **701.24b** Mystical Tutor deixa a carta no topo. **701.23b** busca por característica aceita "não achar" (o bot e o piloto automático continuam achando).
- **708.2** carta virada para baixo é incolor e recebe bônus de Aura. **704.5q** +1/+1 e −1/−1 se anulam. **704.5m** Aura no campo sem hospedeiro, ou presa a algo que não pode encantar, vai para o cemitério.
- **511.2** "no fim do combate" dispara para todos os jogadores. **514.2** na limpeza o dano sai antes da prioridade (insanidade). **104.3** conceder registra desistência. **903.3** Veículo lendário pode ser comandante.
- **Golden:** regravadas só pela versão (72 → 73).
- **Expectativa ajustada com justificativa:** o apoio de teste das masmorras (`rules.unit`, `fechaEscolha`) passou a pegar a carta numa busca, porque a busca deixou de ser obrigatória.
- **Ficam para a CR1b:** fração de segundo (702.61), proteção impressa (702.16), medo, intimidar, sombra e travessia, gatilho modal com modo sem alvo (700.2b), condição de gatilho de outra permanente (603.4), `tap_mana` durante "a menos que pague" (605.3a), jogador que sai numa mesa de três (800.4).
- **Ficam para a CR2 (pedem estrutura ou decisão nova):** regra das lendas (704.5j), objeto novo ao mudar de zona (400.7), ações de estado no meio da resolução (704.3), mortes simultâneas (603.10a), segundo passo de dano (510.4), divisão de dano (510.1c), fichas por instância (111.3).

**CR1b · Segunda leva de correções** 🟡 (motor v74) — 10 testes de conformidade novos em `cr.conformidade.test.mjs` (todos falhavam antes) e o cenário K12b em `combat.audit`. Placar: 207 → 212 cobertos, 475 → 469 ausentes (24%).
- **Valor:** mágicas e criaturas com essas palavras passam a jogar como o texto manda, sem script por carta: o motor lê a palavra-chave do dado da carta.
- **702.61** fração de segundo: com a mágica na pilha ninguém conjura, recicla, usa ninjutsu ou insanidade, nem ativa habilidade que não seja de mana; gerar mana, virar para cima e gatilhos continuam. Vale para a Krosan Grip sem mexer no script.
- **702.16** proteção impressa contra cor ("Protection from black and from red"), lida da linha de palavra-chave do texto: alvo, bloqueio, dano e anexos. **Parcial:** só cores; proteção contra tipo, "tudo", multicolorido e de jogador ficam para a CR4.
- **702.36** medo, **702.13** intimidar, **702.28** sombra, **702.118** esgueirar e **702.14** travessia de ilha, pântano, floresta, montanha e planície. **Parcial em 702.14:** travessia de terreno não básico, lendário e da neve não entra. A recusa de bloqueio agora diz o motivo (antes dizia sempre "voar").
- **700.2b** gatilho modal: modo sem alvo legal não é oferecido nem aceito; sem nenhum modo legal o gatilho sai. **603.4** gatilho "se" de outra permanente confere a condição ao disparar e ao resolver. **605.3a** quem decide um "pague ou…", um "você pode pagar" ou a insanidade pode gerar mana antes de responder, escolhendo as fontes.
- **Aceite:** cada item acima tem teste com o número da regra no título; `combat.audit` K12 exige cenário para toda palavra-chave que o motor declara.
- **Golden:** regravadas só pela versão (73 → 74).
- **Fora (segue no épico):** jogador que sai numa mesa de três (800.4) vai para a CR6; os bugs que pedem estrutura seguem na CR2.

**CR2a.1 · Ações de estado** 🟡 (motor v75) — 3 testes de conformidade novos, todos falhavam antes.
- **Valor:** partidas com lendárias (todo Commander) e mágicas de dois efeitos passam a terminar como a regra manda.
- **704.5j** regra das lendas: com duas permanentes lendárias de mesmo nome sob o mesmo controlador, ele escolhe qual fica; as outras vão para o cemitério (indestrutível não salva; gatilhos de morte disparam). Virada para baixo não conta. Tela: faixa "Qual … fica?" com um botão por cópia; o registro diz "foi para o cemitério pela regra das lendas".
- **704.4** as ações de estado não rodam mais entre um efeito e outro da mesma mágica ou habilidade (antes: 3 de dano em si mesmo com 3 de vida e "ganhe 3" perdia o jogo). **Parcial:** se a resolução para numa escolha do jogador, a checagem ainda roda antes de retomar.
- **704.5n** Equipamento preso a algo que não é criatura se solta e fica no campo.
- **Simplificação declarada:** a escolha da lenda é pedida logo depois das outras ações da mesma checagem, não no mesmo instante (704.3). Muda o resultado só se um gatilho depender dessa simultaneidade.
- **Golden:** regravadas só pela versão (74 → 75); os registros das quatro partidas são idênticos.
- **Fora (segue na CR2a):** objeto novo ao mudar de zona (400.7), última informação conhecida (704.8), laço de checagem com gatilhos (704.3), veneno e regeneração.

**CR2a.2 · Objeto novo ao mudar de zona** 🟡 (motor v76) — 1 teste de conformidade novo, falhava antes.
- **Valor:** salvar uma criatura devolvendo-a à mão (ou piscando) em resposta a uma remoção passa a funcionar: a remoção perde o alvo.
- **400.7** cada objeto conta as mudanças de zona; mágica e habilidade guardam, em cada alvo, qual "encarnação" miraram. Na resolução, alvo de outra encarnação é ilegal (a mágica é anulada se não sobrar alvo).
- **Parcial:** vale para alvos. Outras referências (fonte da habilidade, "ela" de um gatilho, efeito retomado depois de uma escolha) ainda seguem a carta; ficam para a CR2a.3 junto com a última informação conhecida.
- **Golden:** regravadas (75 → 76); os registros das partidas são idênticos.

**CR2a.3 · Mortes simultâneas e última informação conhecida** 🟡 (leva M-208, motor v77) — 2 testes de conformidade novos, os dois falhavam antes.
- **Valor:** numa troca em que várias criaturas suas morrem juntas, cada "sempre que outra criatura sua morrer" conta todas as outras (Zulaport Cutthroat, Cruel Celebrant); carta que morre virada para baixo deixa de disparar a habilidade da face escondida.
- **603.10a** as mortes de uma mesma checagem de estado saem em lote: quem morre junto também observa. **704.8 / 113.7a** a permanente que sai do campo guarda a última informação conhecida (controlador, face, virada, marcadores, poder e resistência).
- **Bug real corrigido:** criatura virada para baixo que morria disparava o gatilho "quando morrer" da face de cima.
- **Cartas das listas (decisão 7):** nenhum script novo — Zulaport Cutthroat e Cruel Celebrant já tinham script e passam a contar certo; nenhuma carta pendente das duas listas dependia só desta estrutura.
- **Parcial:** o lote vale para ações de estado (dano letal, resistência 0, planeswalker sem lealdade). Varredura que destrói ou exila e sacrifício múltiplo ainda saem uma a uma; nenhum efeito lê ainda marcadores ou poder da foto.
- **Golden:** regravadas (76 → 77); registros conferidos na entrega.

**CR2a.4 · Resolução que espera, édito em lote e leitura da permanente que saiu** 🟡 (leva M-209, motor v78) — 1 teste de conformidade e 4 de carta, todos falhavam antes. Fecha a CR2a.
- **704.4 (coberta)** enquanto a resolução espera uma escolha do jogador nenhuma ação de estado roda; `apply` retoma a resolução antes da checagem (antes: dano em si mesmo, descarte escolhido e "ganhe 3" perdia o jogo no descarte).
- **Cartas das listas (decisão 7), texto oficial em `oficiais-commander.json` (consulta de 05/10/2026):**
  - **Accursed Marauder** completa: cada jogador sacrifica uma criatura que não seja ficha; quem está na vez escolhe primeiro, ninguém sai antes de todos escolherem, e as escolhidas saem juntas (primitiva `sacrifice_each`).
  - **Ayli, Eternal Pilgrim** completa: ganha vida igual à resistência que a criatura sacrificada tinha no campo (`per: 'sacrificed-toughness'`, lendo a foto); a segunda habilidade só ativa com 10 de vida acima da inicial (`onlyIfLifeOverStart`) e não mira terreno.
- **Bug encontrado no caminho:** a oferta de alvos de habilidade ativada ignorava as restrições do efeito (terreno era oferecido a um "permanente que não é terreno" e o motor recusava depois).
- **Medição:** Killian 48% → 50%. Triagem: 76 prontas · 9 A · 63 B · 16 C.
- **Golden:** regravadas (77 → 78); registros conferidos na entrega.
- **Fora:** varredura que destrói ou exila tudo (não existe a primitiva; entra com "destruir todas" na CR3), marcadores e poder lidos da foto, Benalish Sleeper (pede reforço/kicker), Priest of Forgotten Gods (alvo "qualquer número de jogadores").

**CR2b.1 · Gatilho atrasado** 🟡 (leva M-210, motor v79) — 1 teste de conformidade, 2 de carta e 1 de regressão.
- **603.7 (parcial)** uma mágica ou habilidade pode deixar uma promessa para depois: o gatilho é criado na resolução, vai à pilha uma vez no início da manutenção do próximo turno (de quem for) e é controlado por quem controlava a mágica, mesmo com a fonte já fora do campo. Dá para responder a ele.
- **Cartas das listas (decisão 7), texto oficial de `oficiais-commander.json` (consulta de 05/10/2026):**
  - **Arcane Denial** completa (antes parcial): o dono da mágica anulada escolhe comprar 0, 1 ou 2 na manutenção do próximo turno, e quem conjurou compra 1.
  - **Mishra's Bauble** completa (antes manual): só quem ativou vê a carta do topo do grimório do jogador alvo; a compra vem na manutenção do próximo turno.
- **Bug corrigido:** efeito de sala de masmorra "cada jogador perde vida a menos que…" não acontecia quando quem controlava não tinha criatura na mesa (caía na varredura de criaturas).
- **Medição:** triagem 78 prontas · 9 A · 61 B · 16 C.
- **Golden:** regravadas (78 → 79); registros conferidos na entrega.
- **Fora:** outros momentos de gatilho atrasado e o gatilho reflexivo (603.12) — nenhuma carta das duas listas depende deles hoje; seguem na CR2b.2.

**CR2b.2 · Mais gatilhos atrasados e o gatilho reflexivo** 🟡 (leva M-213, motor v80) — 3 testes de conformidade novos.
- **603.7** o gatilho atrasado também dispara "no início do próximo passo final" e "no fim do combate". Quando ele fala de uma permanente ("devolva-a", "sacrifique-a"), guarda qual era; se a carta saiu e voltou, não a acha mais (603.7c).
- **603.12 (coberta)** gatilho reflexivo: "você pode pagar; quando fizer, …" cria uma segunda habilidade, com alvo escolhido depois de pagar, que vai à pilha e pode ser respondida. "Se fizer" (sem "quando") continua resolvendo dentro da mesma habilidade, como a regra manda.
- **Cartas das listas (decisão 7):** nenhuma carta pendente das duas listas depende só destas duas estruturas; os testes usam cartas inventadas.
- **Golden:** regravadas (79 → 80); registros conferidos na entrega.
- **Fora:** gatilho atrasado de evento ("quando ela morrer neste turno"), duração que expira sem disparar e gatilho criado por efeito de substituição (603.7d).

**CR2b.3 · Pontos de disparo novos e a carta lembrada** 🟡 (leva M-214, motor v81) — 5 testes de carta, todos falhavam antes.
- **603.2 / 603.6e / 603.10a** gatilhos novos: "sempre que esta criatura receber dano" (uma vez por instância, mesmo letal); "quando a permanente anexada morrer" e "morrer ou for exilada" (o Equipamento ou a Aura olha para trás); "sempre que uma criatura de um oponente entrar"; "sempre que uma criatura for posta no seu cemitério vinda do campo" (vale o dono, não quem controlava).
- **"That card":** o gatilho lembra a carta que saiu, na encarnação nova. Se ela deixou o cemitério ou o exílio antes de a habilidade resolver, fica onde está; ficha não volta.
- **Cartas das listas (decisão 7), texto oficial de `oficiais-commander.json` (consulta de 05/10/2026), todas completas:**
  - **Skullclamp** (antes parcial): compra duas quando a criatura equipada morre.
  - **High Priest of Penance:** pode destruir uma permanente que não é terreno a cada dano recebido.
  - **Authority of the Consuls:** criaturas dos oponentes entram viradas; cada uma que entra dá 1 de vida.
  - **Kaya's Ghostform:** só encanta criatura ou planeswalker seu; a permanente que morre ou é exilada volta sob o seu controle.
  - **Angelic Renewal:** pode sacrificar o encantamento para devolver a criatura; com várias mortes juntas, uma devolução só.
- **Também novo:** custo opcional "sacrificar esta permanente" em gatilho (`mayPay: { sacrificeSelf: true }`), alvo de Aura "criatura ou planeswalker que você controla", regra estática `opponent-creatures-enter-tapped`.
- **Medição:** triagem 83 prontas · 9 A · 56 B · 16 C.
- **Golden:** regravadas (80 → 81); registros conferidos na entrega.
- **Fora:** quando existir "destruir todas", a varredura precisa sair em lote para a Aura ver a saída junto com a permanente (anotado na triagem do Kaya's Ghostform); gatilhos com mais de um alvo.

**CR2b.4 · Vários alvos num gatilho, descarte e dano a oponente** 🟡 (leva M-215, motor v82) — 1 teste de conformidade e 2 de carta, todos falhavam antes.
- **603.3d** gatilho com mais de um alvo: cada alvo é escolhido em ordem (a mesa diz "1º alvo (de 2)"), todos diferentes, e a habilidade só vai à pilha com todos escolhidos. O validador deixou de recusar esses scripts.
- **603.2** "sempre que você descartar uma carta" (vale descarte por efeito, como custo, reciclar e insanidade) e "sempre que a criatura encantada causar dano a um oponente" (só dano em jogador; oponente é o de quem controla a Aura). **602.5** "ative somente se esta criatura estiver atacando".
- **Cartas das listas (decisão 7), texto oficial consultado em 05/10/2026, completas:** **Curiosity** (antes manual) e **Glint-Horn Buccaneer**.
- **Medição:** triagem 85 prontas · 9 A · 54 B · 16 C.
- **Golden:** regravadas (81 → 82); registros conferidos na entrega.
- **Fora:** "até N alvos" opcional em gatilho; Mystic Remora (pede manutenção cumulativa e "a menos que aquele jogador pague").

**CR2b.5 · Manutenção cumulativa, "a menos que ele pague" e gatilhos de passo** 🟡 (leva M-216, motor v83) — 2 testes de conformidade e 2 de carta. Fecha a CR2b.
- **702.24 (parcial)** manutenção cumulativa: na sua manutenção entra um marcador de idade e você paga o custo uma vez por marcador, ou sacrifica. Sem pagamento parcial; sem poder pagar, a permanente é sacrificada direto. **Falta:** custo que não é mana fixa ("{W} ou {U}", "sacrifique uma criatura") e mais de uma instância na mesma permanente.
- **"A menos que aquele jogador pague {N}":** quem conjurou decide pagar; se não pagar ou não puder, o efeito acontece (`unless_pays`, com o jogador lembrado pelo gatilho).
- **603.2** gatilhos novos: "sempre que um oponente conjurar", "no início do seu passo final", "no início de cada manutenção" (de qualquer jogador) e "no início do combate no seu turno".
- **Carta das listas (decisão 7), texto oficial consultado em 05/10/2026:** **Mystic Remora** completa.
- **Medição:** triagem 86 prontas · 9 A · 53 B · 16 C. Malcolm 61%.
- **Para a trilha do bot:** diante de "pagar ou…" o Shark recusa por padrão — com a Remora em campo ele a sacrifica na primeira manutenção, e nunca paga {4} para negar a compra.
- **Golden:** regravadas (82 → 83); registros conferidos na entrega.
- **Tela:** o marcador de idade aparece na carta como "idade N"; a pergunta é "pagar {N} de manutenção cumulativa?".
- **Fora:** passo de compra como gatilho.

**CR2c.1 · Reforço e mágica com vários modos** 🟡 (leva M-217, motor v84) — 4 testes de carta, todos falhavam antes.
- **702.33 (parcial)** reforço e multirreforço: a mesa oferece conjurar sem e com reforço (e quantas vezes couber, até 5, no multirreforço), cobrado junto com o custo. A mágica fica marcada como reforçada e leva isso para o campo; "se foi reforçada" vale em efeito e em gatilho. **Falta:** carta com dois custos de reforço, reforço junto com custo alternativo e cópia de mágica reforçada.
- **700.2d** "escolha dois/três" (com repetição quando a carta deixa): só aparecem combinações de modos com alvo legal; cada "alvo" de cada modo é escolhido à parte (o mesmo objeto pode valer em modos diferentes); os efeitos saem na ordem impressa e "o mesmo alvo" vale dentro do modo. Na folha da carta o botão diz os modos ("−2/−2 + −2/−2 + Criatura do cemitério para a mão") e o reforço ("com reforço", "reforço ×2").
- **Cartas das listas (decisão 7), texto oficial consultado em 05/10/2026, completas:** **Into the Roil**, **Benalish Sleeper**, **Everflowing Chalice** e **Wretched Confluence**.
- **Medição:** Killian 57%, Malcolm 63%. Triagem 90 prontas · 9 A · 49 B · 16 C.
- **Simplificação declarada:** o pagamento automático não usa o Everflowing Chalice como fonte de mana (gera {C} só ativando à mão); com muitos modos e alvos, a lista de combinações oferecidas é cortada no limite de combinações do motor.
- **Golden:** regravadas (83 → 84); registros conferidos na entrega.
- **Fora:** "um ou ambos" / "qualquer número de modos"; Austere, Silverquill e Profane Command (Austere e Silverquill feitas na CR2c.2; Profane na CR2c.3).

**CR2c.2 · "Destruir todas" por filtro e édito de alvo** 🟡 (leva M-218, motor v85) — 2 testes de carta, os dois falhavam antes.
- **701.8 + 603.10a** "destroy all <tipos> [com valor de mana N ou menos / N ou mais]": a lista é feita primeiro e tudo muda de zona junto, então quem sai junto vê as outras saídas (Zulaport destruída com mais duas criaturas dispara três vezes). Indestrutível fica; carta virada para baixo conta valor de mana 0.
- **701.21a** "oponente alvo sacrifica uma criatura à escolha dele": quem escolhe é o oponente; sem criatura, a mesa registra que não havia o que sacrificar.
- **Ruling do Silverquill (16/04/2021) conferido:** com um alvo morto antes da resolução, os outros modos ainda acontecem.
- **Cartas das listas (decisão 7), texto oficial consultado em 05/10/2026, completas:** **Austere Command** e **Silverquill Command**.
- **Medição:** Killian 59%, Malcolm 63%. Triagem 92 prontas · 9 A · 47 B · 16 C.
- **Apoio de teste:** o cenário automático de carta com "escolha dois" sem repetição usa o modo pedido com um companheiro que a mesa oferece (de preferência sem alvo); antes ele repetia o modo, o que só vale com repetição.
- **Golden:** regravadas (84 → 85); registros das quatro partidas iguais.
- **Fora:** **Profane Command** — X precisa decidir o alvo ("valor de mana X ou menos") e o número de alvos ("até X alvos"); hoje o motor escolhe alvos antes do X. Feita na CR2c.3.

**CR2c.3 · X decide o alvo e quantos alvos cabem** 🟡 (leva M-219, motor v86) — 2 testes, os dois falhavam antes.
- **107.3a / 601.2c** o X escolhido vale em todo o texto (inclusive negativo, −X/−X) e entra na escolha de alvos: "valor de mana X ou menos" é conferido na oferta, na conjuração e na resolução com o X daquela conjuração; "até X alvos" vira X alvos opcionais (X = 0: nenhum). A mesa monta os alvos para cada X possível só nas cartas em que o X decide alvo.
- **Carta das listas (decisão 7), texto oficial consultado em 05/10/2026, completa:** **Profane Command**.
- **Correção de tela (bug da M-218, virou teste):** a folha da carta dizia "destrói todos os criaturas"; agora "todas as criaturas". E "−X/−X" saía como "+X/+X".
- **Medição:** Killian 60%, Malcolm 63%. Triagem 93 prontas · 9 A · 46 B · 16 C.
- **Custo declarado:** com a Profane na mão e a mesa sem cobrar mana (X de 0 a 20), a mesa oferece cerca de mil formas de conjurar (agrupadas por X na tela); com mana cobrada, só os X pagáveis (cerca de 350 com seis manas). As combinações de alvo continuam cortadas no limite do motor (16 por par de modos).
- **Golden:** regravadas (85 → 86); registros das quatro partidas iguais.
- **Fora:** "qualquer número de alvos", X em habilidade ativada que decide alvo, dividir dano entre alvos (601.2d).

**CR2c.4 · Phyrexiano à escolha e custos alternativos novos** 🟡 (leva M-220, motor v87) — 5 testes de carta, todos falhavam antes.
- **107.4f / 119.4** mana phyrexiana na conjuração: a mesa oferece uma forma de conjurar para cada quantidade de símbolos pagos com 2 de vida ("pagando com mana" / "pagando 2 de vida"); com menos vida do que o pagamento, a forma não aparece e é recusada. Antes o motor decidia sozinho (mana primeiro).
- **118.9** custos alternativos novos: descartar uma carta de um subtipo junto com outra (Foil: toda forma de pagar inclui uma Ilha), exilar da mão uma carta de uma cor (Snapback), de graça sob condição do campo (Mogg Salvage: um oponente controla Ilha e você controla Montanha).
- **702.148** clivar: custo alternativo que tira o trecho entre colchetes; a mágica guarda de onde foi conjurada, e "que não foi conjurada da mão do dono" vale para cemitério (lampejo do passado), exílio e zona de comando.
- **Efeito novo:** olhar a mão do jogador alvo (só quem conjurou vê).
- **Cartas das listas (decisão 7), texto oficial consultado em 05/10/2026, completas:** **Gitaxian Probe**, **Foil** (era parcial: não exigia a Ilha), **Snapback**, **Mogg Salvage** e **Wash Away**.
- **Medição:** Malcolm 68% (antes 63%), Killian 60%. Triagem 98 prontas · 9 A · 41 B · 16 C.
- **Para a trilha do bot:** a deduplicação de candidatas do Shark (chave por carta, alvos, modo e X) não separa reforço, vários modos nem phyrexiano: das formas "com mana" e "com vida" ele avalia só uma.
- **Golden:** regravadas (86 → 87); registros das quatro partidas iguais.
- **Fora:** phyrexiano em habilidade ativada (Skrelv) continua decidido pelo motor; híbrido ({2/W}, {W/U}) ainda sem escolha do jogador.

**CR2c.5 · Devolver do cemitério por valor de mana** 🟡 (leva M-221, motor v88) — 4 testes de carta, todos falhavam antes.
- **601.2c** "até N alvos com valor de mana total M ou menos": a soma é conferida na oferta (combinações que passam são cortadas antes do limite de combinações, e a mesma escolha em outra ordem não se repete) e na conjuração.
- **122.1b** marcador de palavra-chave: a permanente com marcador de toque mortífero, ameaça, voar, vigilância etc. tem a habilidade. "Ponha um marcador em qualquer uma delas" pergunta entre as criaturas que a própria mágica devolveu; com uma só, vai direto; sem nenhuma, nada.
- **Devolver todas** de um tipo com valor de mana até X, do seu cemitério, de uma vez; e a mágica que se exila pelo próprio texto.
- **Cartas das listas (decisão 7), texto oficial consultado em 05/10/2026:** completas — **Patch Up**, **Call of the Death-Dweller** e **Ascend from Avernus**; parcial — **Priest of Fell Rites** (a habilidade de pagar 3 de vida e sacrificar está completa; **falta o desenterrar**, 702.84, que pede efeito de substituição da CR2e). **Sevinne's Reclamation** continua parcial (a cópia ao conjurar do cemitério é cópia de mágica, CR2f).
- **Medição:** Killian 63% (antes 60%), Malcolm 68%. Triagem 101 prontas · 9 A · 38 B · 16 C.
- **Apoio de teste:** o cenário automático da Foil passou a pôr uma Ilha na mão em vez de depender do sorteio (os scripts novos mudaram o embaralhamento e a Ilha sumiu); a mágica que se exila pelo próprio texto não precisa terminar no cemitério.
- **Golden:** regravadas (87 → 88); registros das quatro partidas iguais.
- **Fora:** desenterrar (CR2e), cópia da Sevinne's Reclamation (CR2f).

**M-222 · Revelar do topo até achar** 🟡 (leva M-222, motor v89) — 5 testes de carta, todos falhavam antes.
- **701.20** "revele cartas do topo do grimório até revelar…": uma criatura, uma carta que divida um tipo com a referência (só de permanente, quando a carta pede) ou uma criatura de valor de mana maior. A referência é o alvo pela última informação conhecida (destruído, exilado, sacrificado ou posto no fundo antes). A carta achada vai para o campo de quem revelou; as outras são embaralhadas ou vão para o fundo em ordem aleatória, conforme a carta. Sem nenhuma que sirva, revela tudo e embaralha.
- **Efeitos novos:** pôr a sua permanente alvo no fundo do grimório; "o controlador sacrifica a permanente alvo"; alvo "permanente que você possui" (mesmo controlada por outro).
- **702.81** retraçar: do cemitério, pagando o custo normal e descartando um terreno da mão; volta ao cemitério ao resolver.
- **Cartas das listas (decisão 7), texto oficial consultado em 05/10/2026:** completas — **Polymorph** ("não pode ser regenerada" sem efeito enquanto o motor não tem regeneração), **Transmogrify** e **Reality Scramble**; parciais — **Reweave** (falta o encaixar, Splice onto Arcane, 702.47) e **Lukka, Coppercoat Outcast** (−2 completo; faltam o +1 e o −7).
- **Medição:** Malcolm 71% (antes 68%), Killian 63%. Triagem 104 prontas · 9 A · 35 B · 16 C.
- **Golden:** regravadas (88 → 89); registros das quatro partidas iguais.
- **Fora:** estado "revelada" que dura até a mágica sair da pilha (701.20a); encaixar; +1 e −7 da Lukka.

**CR2d.1 · Camadas: Aura que redefine a criatura** 🟡 (leva M-223, motor v90) — 3 testes, todos falhavam antes. Primeira leva da CR2d (estimativa total: 9 a 12 levas).
- **613 camadas 4, 6 e 7b** para "a criatura encantada é um <tipo> com P/T base X/Y e perde as (outras) habilidades": tipo e subtipos novos (alvo de "destruir artefato" passa a valer, contagens por tipo de criatura veem Inseto/Covarde), habilidades impressas somem (palavras-chave, gatilhos, ativadas, mana, estáticas, proteção impressa, metamorfo, regras estáticas) e o P/T base é fixado; o que soma ao P/T (marcadores, +N/+N, bônus de Aura e equipamento) continua por cima (7c/7d).
- **613.7 carimbo de tempo:** cada permanente ganha carimbo ao entrar no campo, cada Aura/equipamento ao ser anexado e cada palavra-chave do turno ao ser concedida. Habilidade concedida antes da Aura que tira tudo some; a concedida depois fica.
- **603.10a:** a criatura que morre sem habilidades (Reprobation) não dispara o próprio gatilho de morte.
- **Cartas das listas (decisão 7), texto oficial consultado em 05/10/2026, completas:** **Darksteel Mutation** e **Reprobation**.
- **Medição:** Killian 65% (antes 63%), Malcolm 71%. Triagem 106 prontas · 9 A · 35 B · 14 C.
- **Simplificações declaradas (alteram o resultado em casos raros):** marcador de palavra-chave e "até o seu próximo turno" não têm carimbo — a Aura que tira as habilidades os apaga mesmo quando vieram depois; a Darksteel Mutation não mantém subtipos de artefato que a criatura já tinha (Equipamento-criatura); com duas Auras dessas, vale a anexada por último, sem dependência (613.8).
- **Apoio de teste:** o cenário automático de busca por nome (Squadron Hawk) passa a manter as outras cópias no grimório (o sorteio da mão mudou com os scripts novos).
- **Golden:** regravadas (89 → 90); registros das quatro partidas iguais.
- **Próximas da CR2d:** terreno que vira criatura até o fim do turno (Mishra's Factory, Blinkmoth Nexus), Veículo e tripular (Smuggler's Copter), Animate Dead, Kytheon (transformar).

**CR2d.2 · Terreno que vira criatura até o fim do turno** 🟡 (leva M-224, motor v91) — 3 testes, todos falhavam antes.
- **613 / 205.1b** "esta terra vira uma criatura artefato N/N <subtipo> até o fim do turno. Ela continua sendo terreno": tipos e subtipos somados aos que ela tinha, P/T base, palavras-chave dadas pelo efeito, tudo com carimbo de tempo próprio, na mesma ordem das Auras da CR2d.1; acaba na limpeza do turno. A tela mostra o P/T dela enquanto é criatura.
- **302.6** (ruling das duas cartas): a permanente que entrou neste turno sem ser criatura e virou criatura tem enjoo — não ataca nem usa {T} de criatura.
- **Alvo por subtipo:** "Assembly-Worker alvo", "Blinkmoth alvo" (metamorfo conta).
- **Cartas das listas (decisão 7), texto oficial consultado em 05/10/2026, completas:** **Mishra's Factory** e **Blinkmoth Nexus** (eram parciais: só geravam {C}).
- **Medição:** Malcolm 73% (antes 71%), Killian 65%. Triagem 108 prontas · 9 A · 35 B · 12 C.
- **Para a trilha do bot:** o Shark decide "é criatura" pelo tipo impresso (`ehCriatura`), então ainda não ataca com terreno animado nem o conta como bloqueador.
- **Golden:** regravadas (90 → 91); registros das quatro partidas iguais.

**CR2 · Alicerces do motor** ○ — as estruturas de que as palavras-chave dependem, cada uma com a regra numerada inteira, fuzz e teste de conformidade. Estimativa: 55 a 70 levas.
- **CR2a** zonas, objeto novo ao mudar de zona, última informação conhecida, ações de estado completas e no momento certo (704, 608.2). 5 a 7 levas.
- **CR2b** gatilhos: atrasados (603.7), reflexivos (603.12), pontos de disparo de todos os passos e de todos os jogadores (603.2), "olhar para trás" e eventos simultâneos (603.10), mais de um alvo (603.3d). 5 a 6 levas.
- **CR2c** conjurar, ativar e pagar: passos da 601.2 com escolha do jogador (modos múltiplos, X em tudo, híbrido e phyrexiano, divisão entre alvos), custos que outra permanente altera, habilidades de mana durante qualquer pagamento, mana com fonte e restrição (106), "não pode" e "ative somente se", mudança de alvo. 9 a 11 levas.
- **CR2d** efeitos contínuos em camadas (613) com carimbo de tempo e dependência, mudança de controle, estáticos de qualquer forma (611, 604). 9 a 12 levas. É a maior obra do épico.
- **CR2e** arcabouço de substituição e prevenção (614–616): "em vez de", "entra com", regeneração, escudos por quantidade, ordem escolhida pelo afetado. 7 a 9 levas.
- **CR2f** cópia de mágica e de permanente, ficha-cópia (707). 4 a 6 levas.
- **CR2g** turno e combate: passo de dano de iniciativa, divisão de dano, atacar planeswalker e batalha, exigências, restrições e custos de atacar e bloquear, gatilhos de bloqueio, turnos, fases e combates extras, pular. 7 a 9 levas.
- **CR2h** conceitos: veneno e marcadores nomeados em jogador e permanente (122), emblemas (114), vencer, perder e empatar por efeito, laço obrigatório (104), X (107.3), fichas por instância e fichas predefinidas (111), APNAP em escolhas (101.4), ações de mão inicial (103). 10 a 13 levas.

**CR3 · Ações de palavra-chave (701)** ○ — 39 ausentes e 12 parciais; primeiro as comuns (lutar, trocar, dobrar, proliferar, regenerar, manifestar, descartar ao acaso, buscar e embaralhar completos). 12 a 16 levas.

**CR4 · Habilidades de palavra-chave (702)** ○ — 150 ausentes e 21 parciais, em ondas pela frequência em cartas anotada no mapa: (1) fechar as evergreen e as parciais; (2) "muito comum" (proeza, tripular, reforço, convocar, cascata, evocar, persistir, imortal, fração de segundo, infectar e tóxico…); (3) "comum"; (4) "rara" e "uma coleção só". 50 a 65 levas.

**CR5 · Tipos e formatos de carta** ○ — planeswalker completo, Sagas, Veículos, batalhas, aventuras, cartas divididas, dupla face modal, Classes, Casos, Salas, protótipo, mutação, nivelar, virar (flip), face para baixo completa, monarca, iniciativa, dia e noite, moeda e dado. 25 a 35 levas.

**CR6 · Multijogador e variantes** ○ — mesa de três e quatro (800–803, 806), Commander de mesa (903.2), Brawl (903.12); as variantes hoje "fora" só entram por decisão. 10 a 14 levas.

**CR7 · Consolidação** ○ (em paralelo a partir da CR2) — a cada fase: fuzz em modo completo com listas reais, homologação por revisor independente relendo a seção das regras contra o motor, e rodada de simulação do dono do produto. 6 a 8 levas ao todo.

**Estimativa do épico inteiro: 160 a 220 levas.** Apoio: nas levas recentes, estrutura nova rendeu de 1 a 3 itens por leva e primitiva pequena de 4 a 8. É estimativa, não medição; o placar do `medir.mjs` diz o progresso real a cada leva.

**Riscos declarados:** (1) a CR2d mexe no cálculo de toda criatura e pede regravar partidas-referência; (2) cada mudança de regra sobe a versão do motor e invalida partida salva — vale agrupar; (3) regra implementada sem carta que a exercite só é testada por carta sintética: a homologação por simulação do dono do produto é o que fecha; (4) o documento das regras muda a cada coleção: o índice precisa ser refeito quando sair versão nova.

**R11 a R13 · Commander** ○ — Orzhov Killian (88 cartas; 60 cópias manuais, 8 parciais) e Malcolm + Kediss (81; 38 manuais, 13 parciais).
- **R10 · Plano do lote:** texto oficial das 105 cartas sem texto conferido, ficha de leitura e triagem em três baldes (só script · primitiva nova · lacuna estrutural), com a matriz primitiva × cartas. Sem isso a ordem é palpite. 1 leva.
- **R11 · Balde A e B**, na ordem que mais destrava por leva (terrenos de duas cores e pedras de mana primeiro: Command Tower, Exotic Orchard e Sol Ring estão nas duas listas). 6 a 10 levas.
- **R12 · Estruturas** que as listas exigem, cada uma com a regra numerada inteira e fuzz: camadas de efeito contínuo (613), efeitos de substituição (614), cópia de mágica e de permanente (707), troca de controle, regra de lenda, ataque a planeswalker, mais de um alvo por gatilho. A decisão de construir ou deixar a carta manual é tomada por estrutura, com a contagem de cartas que cada uma destrava. 5 a 8 levas.
- **R13 · Tela e partida guiada** de cada lista de Commander, e homologação independente. 2 a 3 levas.

**R14 · Mapa das regras não contempladas** ○ — depois das nove listas: percorrer as Comprehensive Rules por seção (100 a 800) e o glossário de palavras-chave (702), marcando cada uma como coberta, parcial ou ausente, com o tamanho em levas e as cartas mais jogadas que dependem dela. Vira a fila seguinte, uma regra por leva, inteira. 1 leva para o mapa; a execução é fila aberta.

**Total estimado:** 8 a 10 levas até o fim das Pauper; 14 a 22 para as Commander; o mapa em mais 1. A recomendação de testar no aparelho a cada três levas continua valendo.

### B · Bot adversário

**B1 · Política aleatória legal** ✅
- **Valor:** base do fuzz e do nível mais fácil.
- **Aceite:**
  - escolhe entre `legalActions` com semente própria;
  - pondera jogar contra passar.
- **Testes:** P.
- **Depende de:** M4.
- **Fora:** —

**B2 · Avaliador de posição e arcabouço de decisão** 🟡
- **Valor:** a base dos dois bots. Sem um avaliador honesto, "difícil" vira só aleatório com sorte.
- **Aceite:**
  - função pura `avalia(estado, jogador)` que devolve um número e a lista de parcelas que o formaram:
    vida própria e do oponente, poder e resistência em campo, cartas na mão, mana disponível, marcadores,
    ameaça bloqueada e cartas no cemitério que ainda voltam;
  - determinística: mesmo estado, mesma nota, sem depender de ordem de objetos;
  - `simula(estado, ação)` usa o próprio motor (ADR-04) e nunca muta o estado recebido;
  - orçamento de tempo configurável, com corte seguro que devolve a melhor jogada até ali.
- **Entregue (leva 59):** módulo `src/engine/bot.js` (`__m25`) com `avalia`, `simula`, `escolhe` e
  `chaveAcao`. A nota é **antissimétrica** por construção — toda parcela é uma diferença entre os dois
  lados —, então o que me favorece desfavorece o outro na mesma medida, e isso virou teste.
- **Parcelas e pesos:** vida própria (2) e vida que falta no oponente (2), poder (3) e resistência (2) em
  campo, corpo em campo (2), outra permanente (2), carta na mão (4), fonte de mana desvirada (3),
  marcador +1/+1 (2), carta no cemitério que sabe voltar (2), partida decidida (10 000).
- **Aproximação assumida:** mana que vem de aura anexada não entra na contagem de fontes — a avaliação roda
  milhares de vezes por jogada e lê os fatos da carta direto. É heurística de avaliação, não regra.
- **Testes:** U (cada parcela isolada; antissimetria; campo em outra ordem dando a mesma nota; simular sem
  mutação e ação ilegal devolvendo nulo; escolha com desempate estável e corte por orçamento com relógio
  injetado), desempenho (mil avaliações bem abaixo de 50 ms).
- **Depende de:** S9, M9.
- **Fora:** aprendizado de máquina; peso ajustado por deck.

**B3 · Bot "amador experiente"** 🟡
- **Valor:** o oponente do dia a dia: joga certo, erra pouco, não calcula o impossível.
- **Aceite:**
  - baixa terreno todo turno, seguindo a cor que a mão precisa;
  - conjura seguindo a curva, preferindo usar todo o mana do turno;
  - ataca quando a troca é favorável ou o oponente não tem bloqueador; bloqueia para não morrer e para
    trocar bem; segura resposta quando tem mana aberto e a mão pede;
  - usa remoção na maior ameaça, não na primeira criatura;
  - **não** olha a mão do oponente nem o grimório de ninguém — decide só com o que a mesa mostra;
  - cada jogada entra no registro com uma linha do motivo ("ataquei: você não tem bloqueador").
- **Entregue (leva 60):** `jogadaAmador` no módulo do bot, mais o assento dirigido pelo bot na mesa e a
  opção **"Bot amador experiente"** na tela de jogar — dá para jogar contra ele hoje.
- **Como ele decide:** uma camada de simulação (a jogada **e a resolução dela**) avaliada pela B2, com
  três regras próprias por cima: terreno todo turno antes de tudo; ataque e bloqueio por regra, porque
  simular o ataque não mostra o dano; e, no turno do oponente, só gasta resposta se o ganho equivaler a
  tirar uma ameaça de 3/3 para cima.
- **Aproximação assumida:** ao resolver a jogada simulada, o oponente é tratado como quem passa a
  prioridade. É o que separa o amador do profissional (B4), que vai simular a melhor resposta.
- **Testes:** U (terreno primeiro; prefere a criatura maior; remoção na maior ameaça; ataca sem bloqueador,
  fica em casa na troca ruim e vai com tudo no letal; bloqueia a troca boa e segura o dano quando a vida
  está no fim; guarda a resposta no turno do outro), P (partida inteira bot contra bot sem nenhuma ação
  ilegal e com o estado íntegro no fim), I (o assento do bot joga sozinho, o motivo entra no registro e a
  escolha sobrevive a salvar e continuar).
- **Justificativa de limite de teste:** o alvo de desempenho da B2 é mil avaliações abaixo de 50 ms, e é o
  que acontece com a máquina livre (~10 ms). O portão roda os arquivos em paralelo, então o relógio de
  parede sobe sem o código piorar; o teste cobra 200 ms, que ainda garante mais de 2 500 avaliações dentro
  do orçamento de 500 ms de uma jogada.
- **Depende de:** B2.
- **Fora:** blefe; guardar carta para o turno seguinte por leitura de metagame.

**B4 · Bot "profissional"** 🟡
- **Valor:** o desafio de verdade.
- **Aceite:**
  - busca rasa sobre as ações legais (duas camadas: minha jogada e a melhor resposta do oponente),
    com poda por nota e ordenação das candidatas;
  - usa o mesmo avaliador da B2, para a diferença entre os níveis ser **profundidade e critério**, não
    informação privilegiada — o profissional também não vê a mão do oponente;
  - responde em menos de 500 ms no celular (orçamento da B2), e nunca trava a interface;
  - sequencia melhor: usa mana de criatura antes de terreno, guarda o terreno para depois do combate
    quando isso não muda a curva.
- **Entregue (leva 61):** `jogadaProfissional` e `decideAtaqueProfissional`, mais a opção
  **"Bot profissional"** na tela de jogar. Mesmo avaliador e as mesmas regras de jogo do amador; o que
  muda é a profundidade.
- **As duas camadas, na prática:**
  1. fora do combate, cada jogada minha é medida **depois da melhor resposta do oponente** (até dez
     respostas por posição, em ordem estável, dentro do orçamento);
  2. no combate, o ataque é escolhido resolvendo o combate inteiro — bloqueio provável (o oponente bloqueia
     como o amador) mais o dano —, em vez de regra de bolso.
- **Diferença medida:** com três 2/2 contra um 5/5 e o oponente em 3 de vida, o amador fica em casa e o
  profissional ataca com todos: um morre no bloqueio, quatro de dano passam e a partida fecha. Isso é
  teste, não anedota.
- **Testes:** U (o ataque letal por cima do bloqueio que o amador não vê; recusa de ataque que piora a
  posição depois do bloqueio; a resposta do oponente nunca melhorando a minha nota; mesma posição dando a
  mesma jogada; orçamento estourado ainda devolvendo jogada), P (partida inteira profissional contra
  amador sem ação ilegal e com estado íntegro), I headless (escolher o nível na tela e ver o bot na mesa).
- **Depende de:** B3.
- **Fora:** busca profunda; tabela de aberturas; sequenciamento de mana (usar criatura antes de terreno) —
  o motor paga sozinho, então isso fica para quando o pagamento tiver escolha.

**B5 · Escolher o oponente na mesa** 🟡
- **Valor:** decidir contra quem jogar, sem editar nada.
- **Aceite:**
  - na tela de jogar, o oponente é Goldfish, Amador experiente, Profissional ou hot-seat;
  - o nível escolhido aparece na mesa durante a partida e no resumo do fim;
  - trocar de nível exige partida nova, e a mesa diz isso em vez de trocar no meio;
  - bot só joga no motor completo (ADR-05): com lista abaixo de 100%, os dois níveis aparecem
    desabilitados com o motivo.
- **Entregue (leva 62):** quatro oponentes na tela de jogar (Goldfish, amador, profissional, hot-seat),
  com a lista do bot escolhida ao lado. Sem a lista **100% coberta**, os dois níveis ficam desabilitados
  com o motivo escrito na tela, e a escolha volta para o Goldfish sozinha. Com partida em andamento, a
  tela avisa que trocar de oponente exige descartar a partida. O nome do bot aparece na mesa e no fim.
- **Testes:** I headless (escolher o nível, ver o bot jogando e o nome dele na mesa; lista incompleta
  deixando os dois níveis bloqueados com o aviso e o Goldfish livre), U (o assento do bot joga sozinho, o
  motivo entra no registro e a escolha sobrevive a salvar e continuar).
- **Depende de:** B3, A12.
- **Fora:** dificuldade adaptativa.

**B6 · Torneio de bots no portão** 🟡
- **Valor:** provar que "profissional" é mesmo mais forte, e que nenhum dos dois trava.
- **Aceite:**
  - N partidas por semente fixa, bot contra bot, no CI;
  - profissional vence o amador em **≥ 60%**, e o amador vence a política aleatória em **≥ 70%**;
  - nenhuma partida termina por ação ilegal, laço ou estouro de tempo;
  - o relatório sai no log do portão: vitórias, turnos médios e tempo médio por jogada.
- **Entregue (leva 62):** `bot.torneio.test.mjs`. Semente fixa por partida, **assentos trocados a cada
  rodada** (senão a medida vira vantagem de começar jogando) e relatório no log do portão.
- **Medido:** amador **100%** contra a política aleatória (16 partidas) e profissional **63%** contra o
  amador (24 partidas), sem nenhuma ação ilegal e sem partida indecisa. Tempo médio por jogada: 0,7 ms no
  amador e 1,3 ms no profissional.
- **O que a medição obrigou a corrigir:** na primeira rodada o profissional ficou em **50%** — ou seja,
  não era mais forte. Duas causas, as duas corrigidas:
  1. a amostra de respostas do oponente era cortada **em ordem alfabética da chave da ação**, o que dava
     uma amostra sem sentido; agora todas as respostas são lidas de forma barata e só as dez piores para
     mim são lidas por inteiro;
  2. faltava **disciplina de instantânea**: o profissional gastava mágica rápida na própria fase principal
     como o amador. Agora ele só gasta fora do combate se o ganho for grande.
- **Tentativa que piorou e foi revertida:** encaixar a melhor continuação do próprio turno antes de medir
  a posição (uma camada a mais de mim mesmo) derrubou o profissional para **20%**. Está registrado aqui
  para não ser tentado de novo sem medir.
- **Tamanho da amostra:** 12 partidas davam ±15 pontos de variação — número que não significa nada. O
  portão roda 16 e 24 partidas, que é o que cabe no tempo do portão com medida estável.
- **Testes:** P (as duas séries e a reprodutibilidade por semente).
- **Depende de:** B4.
- **Fora:** ajuste automático de pesos.

**B7 · Didática do bot** 🟡
- **Valor:** aprender jogando contra ele.
- **Aceite:**
  - ao fim de cada turno do bot, um resumo em português do que ele fez e por quê (até três linhas);
  - opção "mostrar o que eu poderia ter feito" no fim do meu turno, com as duas melhores jogadas que
    deixei passar, segundo o avaliador.
- **Entregue (leva 63):**
  - **resumo do turno do bot** no registro: até três linhas em português e na terceira pessoa
    ("Baixou um terreno. Conjurou Urso, Alce. Atacou com 2: nenhum bloqueio me mata de graça."),
    fechado quando o turno vira;
  - **"O que eu poderia fazer?"** no painel de prioridade, no motor completo: as duas jogadas que mais
    melhoram a sua posição agora, com o ganho estimado, pelo mesmo avaliador que o bot usa. Quando não há
    nada melhor, ele diz isso em vez de inventar dica.
- **Decisão de escopo:** a dica mostra, não joga por você. E ela lê só o que a mesa mostra, como o bot.
- **Testes:** U (resumo cortando em três linhas, ignorando "passei", virando terceira pessoa e cobrindo o
  caso sem jogada; dicas ordenadas por ganho, só com ganho positivo, apontando a remoção no 5/5 e vazias
  quando não há o que fazer), I headless (resumo do turno no registro da mesa; o botão de dica existindo
  no motor completo e abrindo o painel).
- **Depende de:** B4.
- **Fora:** análise pós-partida completa; a leitura do que passou batido no turno inteiro (a dica é do
  momento, que é onde ela muda a sua jogada).

**B8 · Informação justa** ✅ (leva 117, 02/10/2026)
- **Valor:** o Shark vira adversário honesto: ganhar espiando a mão não treina ninguém.
- **Regra:** ele conhece as duas listas, a própria mão, tudo que está em zona aberta e o que a partida mostrou.
  Não conhece as cartas da mão do oponente nem a ordem de nenhum grimório.
- **Entregue:**
  - toda decisão do Shark passa a ser tomada sobre **mundos possíveis** (`visaoDe`): as cartas do oponente que ele
    não viu (mão + grimório) são sorteadas entre si, o próprio grimório é embaralhado e a semente da partida é
    trocada; a nota de cada jogada é a média de 3 mundos;
  - o sorteio usa só informação pública, então a mesma mesa dá sempre os mesmos mundos;
  - **memória do que foi mostrado**: carta do oponente vista em zona aberta que voltou para a mão dele continua
    sabida; voltou ao grimório, é esquecida; carta citada pela decisão em curso fica onde está;
  - o v3 fica congelado como `shark-v3` (régua de torneio; ele simula sobre o estado real).
- **Medição (sete listas Pauper, 224 partidas cada):** atual × v2 = **64% em 222 decididas** (o v3 fazia 65%);
  atual × v3 congelado = **46% em 220** (dentro da margem de ±7). Parar de espiar não custou força mensurável.
  Sonda de vazamento em 7 partidas: o v3 mudava a jogada em 4 de 227 decisões ao trocar a mão do oponente; o
  atual, em 0 de 227. Zero ações ilegais. Pior decisão 1249 ms com dois torneios em paralelo e orçamento de 250 ms.
- **Simplificações declaradas:** o Shark esquece o que a vidência mostrou do próprio topo; a memória do que foi
  revelado se perde se a partida for restaurada; o número de mundos (3) não foi afinado — fica para a B14; a dica
  "O que eu poderia fazer?" do jogador humano ainda simula sobre o estado real (só afeta a contagem de cartas).
- **Testes:** U (mundo possível preserva o que é público e os tamanhos; mesma mesa, mesmos mundos; memória de
  revelações; não vazamento em partida real, com a posição em que o v3 vazava; só joga ação legal), P (torneio).
- **Depende de:** B6.

**Roteiro do Shark profissional (B9–B20)** — pedido em 02/10/2026: tornar o bot o adversário mais difícil possível,
conhecendo os dois baralhos e as estratégias de cada um, sem conhecer a mão do jogador. Uma leva por história; cada
técnica entra atrás de opção e só fica se pagar em torneio com listas reais (≥ 200 partidas decididas, versão
anterior congelada). Ordem revista a cada leva pela leitura de partidas narradas.

| # | História | Erro de jogo que elimina |
|---|---|---|
| B9 | Conhecer os baralhos: perfil derivado das duas listas e contagem do que resta | joga sem saber o que o oponente pode ter nem o que pode comprar |
| B10 | Mulligan com cores, curva e primeiro/depois | mantém mão sem cor ou sem jogada |
| B11 | Sequenciamento do turno | desperdiça mana, baixa o terreno errado |
| B12 | Papel e corrida | defende quando devia atacar, e o contrário |
| B13 | Jogar em volta (anulação, truque, varredura) | ataca para dentro do truque, estende para a varredura |
| B14 | Busca com mãos sorteadas e número de mundos afinado | avalia a resposta do oponente por poucas mãos |
| B15 | Plano de dois ou três turnos | não vê o letal em dois turnos nem monta combo |
| B16 | Combate profissional | trocas ruins, truque próprio mal usado |
| B17 | Remoção e anulação como recurso | gasta a resposta na ameaça errada |
| B18 | Melhor de três: troca de reserva por confronto | não usa a reserva |
| B19 | Leitura do oponente e blefe | não aprende com o que o oponente segura |
| B20 | Pesos afinados por torneio automático | avaliação calibrada no olho |

**B11 · Sequenciamento do turno** ✅ (leva 118, 02/10/2026) — passou à frente da B9 porque a partida narrada (Jund
Wildfire × Rakdos Madness) mostrou este como o erro mais caro.
- **Erros de jogo eliminados:**
  - gastava a mana na manutenção, antes de comprar e baixar terreno → agora espera a fase principal;
  - baixava o terreno que entra virado tendo o desvirado e mágica para conjurar → escolhe pelo que o terreno
    permite jogar neste turno; se nada depende dele, baixa o virado e guarda o outro;
  - baixava terreno sem a cor que a mão pedia → desempata pela cor que destrava cartas da mão;
  - sacrificava fichas à toa com a própria mágica na pilha, e respondia pouco a mágica do oponente → a nota de
    "passar" com a pilha cheia passou a ser a de depois de a pilha resolver (antes era tirada com a pilha parada).
- **Medição (sete listas Pauper, 224 partidas, contra o `shark-v4` congelado):** as quatro peças juntas = **57% em
  221 decididas (125–96)**, na borda da margem de ±7. Isoladas ficaram no ruído: manutenção + terreno 49% em 221;
  pilha 52% em 221. Zero ações ilegais. Pior decisão sem concorrência: 270–350 ms em cinco partidas, 1126 ms em uma.
- **Tentado e retirado:** plano de duas jogadas na fase principal (escolher a primeira jogada pela melhor dupla):
  50% em 218 e pior tempo. Não repetir sem mudar a abordagem.
- **Aprendizado de método:** 224 partidas só enxergam ganho de 7 pontos para cima e custam 50–70 min. Peça pequena
  não aparece sozinha; a medição por peça precisa de amostra maior ou de partidas mais rápidas (ver B14).
- **Erros vistos na partida narrada e ainda abertos:** segura remoção com o oponente batendo; não baixa criatura que
  troca um por um; descarta por mão cheia.
- **Testes:** U (manutenção, terreno pela jogada, terreno pela cor, fichas com mágica na pilha — todos com o v4
  fazendo o erro), P.
- **Depende de:** B8.

**B10c · A "regressão" do Mono Blue Faeries não existe** ✅ (medição de 04/10/2026, sem mudança no Shark)
- **Suspeita:** depois da leva 143 o Shark venceu 26–38 pilotando Faeries no torneio geral; antes, 35–29.
- **Medição por piloto (`PILOTO=0`, 96 pares, mesma semente e mesmo oponente):** `shark-v7` (leva 143) contra
  `shark-v6` (antes dela): **44 de 96 cada um (46%)**; só o novo ganhou em 4 pares, só o antigo em 4. E o Shark de hoje
  sem a avaliação nova (`y:!av4`) contra o `shark-v9`: 39 contra 38 de 96. **Sem regressão.**
- **Lição de método:** o placar por lista do torneio geral compara amostras diferentes (64 partidas, oponentes e
  sementes diferentes) e oscila 15 pontos à toa. Para um baralho, vale só a medição por piloto.
- **Ferramenta:** `'y:!peça'` no torneio desliga uma peça do Shark (`node torneio.listas.mjs 'y:!ordena' shark-v9 ...`).

**B9 · Combo do Shark na mesa** ✅ (leva 164, 04/10/2026) — segunda passada no Walls Combo.
- **Achado:** o combo de mana infinita da leva 147 são mais de cem ações iguais. Na mesa, cada uma virava linha no
  registro, e o jogador com uma resposta na mão era parado a cada vez que a habilidade de desvirar ia para a pilha
  (dezenas de paradas no mesmo turno).
- **Entregue:**
  - o laço inteiro vira **uma linha** no registro, atualizada no lugar ("combo de mana infinita — Axebane Guardian
    vira para mana e Freed from the Real desvira (N×)"); o dano do finalizador continua aparecendo;
  - quem passou a prioridade uma vez com uma habilidade do outro lado na pilha não é parado de novo pela **mesma
    habilidade** no mesmo turno (vale para qualquer habilidade repetida, não só para o combo);
  - a compactação é decidida pelo estado e pela ação, então refazer a partida (desfazer, restaurar) dá o mesmo registro.
- **Força do Walls: nada mudou.** Li duas partidas narradas (contra Rakdos Madness e GW Bogles) e não achei erro de
  decisão barato de corrigir: nas duas o Shark usou toda a mana e perdeu por mão sem terreno (dois mulligans), por
  remoção em todas as criaturas ou por uma criatura protegida e enorme que as muralhas não seguram. Os 33% parecem
  mais da lista contra este campo do que do piloto. Sem medição nova: as decisões do bot não mudaram.
- **Simplificação declarada:** quem cede à habilidade repetida perde a chance de responder a uma repetição posterior
  no mesmo turno (é o atalho de laço do Magic de mesa).
- **Tela de outra trilha:** `createTable` (registro e paradas) — o combo é entrega desta trilha e a mesa ficava
  impraticável com ele.
- **Testes:** U (cada ação do laço é reconhecida como repetição, o finalizador e a resolução do dano não; a habilidade
  repetida tem uma chave só no turno; fora do combo nada é repetição).
- **Depende de:** B9 (leva 147).

**B10b · Mono Blue Faeries: recursos e resposta** 🟡 (leva 162, 04/10/2026) — resultado quase todo negativo.
- **Partida narrada (Mono Blue Faeries × Jund Wildfire):** o Shark recusava a compra opcional do Moon-Circuit Hacker
  todas as vezes (empate na avaliação caía em "não fazer"); gastava a Ilha da anulação numa criatura de um mana e, no
  turno seguinte, descartava a Counterspell para o Refurbished Familiar.
- **Entregue:** em empate, o efeito opcional sem custo é aceito (`aceita`). O v9 (leva 159) fica congelado.
- **Tentado e desligado:** `segura` — com uma anulação na mão que as fontes desviradas pagam, a jogada que tira essa
  mana do turno do oponente custa 6 pontos. Fica só como opção de torneio.
- **Medição por piloto (`PILOTO=0`, 96 pares, mesma semente, contra o `shark-v9`):**
  só o aceite: 40 de 96 (42%) contra 39 de 96 (41%); só o novo ganhou em 4 pares, só o antigo em 3: **ruído.**
  aceite + segurar: 35 de 96 (36%) contra 39 (41%); só o novo em 3, só o antigo em 7: **pior, dentro do ruído.**
  Segurar a mana custa desenvolvimento e o Shark não converte a anulação em vantagem. Zero ações ilegais.
- **Não medido:** torneio geral das sete listas com o aceite (a mudança só age em empate de efeito opcional).
- **Estado do Faeries:** 41% pilotado pelo Shark contra o próprio Shark com as outras listas. Segue a lista mais fraca
  depois do Walls. O que falta parece ser de leitura do jogo (quando anular, ninjutsu no atacante certo), não de regra
  simples; candidatas: valor da anulação pelo que a mágica do oponente faria (hoje ele anula o que aparecer) e ninjutsu
  contado na escolha do ataque, como o truque da B16.
- **Testes:** U (compra do Hacker aceita, com o v9 recusando; a opção `segura` ligada à mão segura as duas Ilhas e o
  Shark publicado não).
- **Depende de:** B16.

**B16 · Combate: truque próprio no ataque** 🟡 (leva 159, 04/10/2026) — parte entregue; saiu da leitura do Elves.
- **Partida narrada (Elves × Rakdos Madness):** o Shark de Elves decidia o ataque sem contar com o Timberwatch Elf
  ({T}: +X/+X, X = Elfos em campo) e, quando usava a habilidade, usava antes dos bloqueios.
- **Entregue:**
  - ao escolher o ataque, as três melhores formações, o ataque com tudo e "todos menos quem tem habilidade de virar
    com alvo" são medidos de novo contando o melhor truque próprio depois dos bloqueios (`notaDoAtaqueComTruque`);
  - com o ataque declarado e o bloqueio ainda não, ele passa e espera os bloqueios para usar o truque.
- **Medição por piloto, Elves (`PILOTO=6`, 96 pares, mesma semente, contra o `shark-v8`):** novo venceu 50 de 96
  (52%); v8 venceu 48 de 96 (50%); só o novo ganhou em 5 pares, só o antigo em 3. **Ganho não demonstrado.**
  O truque decide poucas partidas. Fica pelo erro visível que corrige (teste com o v8 errando), não por força.
- **Torneio geral contra o v8:** 52% em 224 decididas (117–107): sem regressão. Zero ações ilegais.
- **Achado:** pilotando Elves contra o Shark de hoje, ele já ganha metade das partidas; Elves não é mais a lista
  fraca que parecia (27–37 era contra outro oponente). **Perfil de Elves não foi escrito**: não achei um plano de
  combinação que mudasse o resultado. Lista mais fraca agora, depois do Walls (33%): Mono Blue Faeries (26–38 na
  leva 143), que depende de segurar mana para a anulação — a próxima a olhar.
- **Falta:** truque na defesa (bloquear contando com a habilidade), e contar com o truque do oponente (B13).
- **Testes:** U (Timberwatch Elf fica em casa, os outros atacam, o truque sai depois dos bloqueios e fecha a partida;
  o v8 não atacava).
- **Depende de:** B9.

**B9 · Conhecer os baralhos: o plano de cada um** 🟡 (leva 147, 03/10/2026) — primeiro perfil: Walls Combo.
- **Por que este primeiro:** era a lista que o Shark pilotava pior (23–39 na leva 143; 15–43 antes).
- **Partida narrada (Walls Combo × Boros Bully):** devolvia as Florestas para a mão com a Quirion Ranger até ficar
  sem terreno em campo; nunca conjurava a Freed from the Real; com mana de sobra, não sabia fechar a partida.
- **Entregue:**
  - `PERFIS` (dado): o baralho é reconhecido pelas próprias cartas; o perfil diz o motor de mana (Axebane Guardian), a
    carta que o desvira (Freed from the Real, {U}), os finalizadores (Valakut Invoker, Bloodrite Invoker) e o custo;
  - a avaliação, com perfil, conta as peças do combo que ele tem (mão ou campo) e, muito, o motor já com a aura: ele
    passa a conjurar a Freed no Axebane, a transmutar a Drift of Phantasms para buscar a peça que falta e a escolher
    as peças nas buscas;
  - `passoDoCombo`: com o combo montado, dois ou mais defensores e um finalizador em campo, executa a mana infinita
    (vira o motor para azul, desvira, repete) e usa o finalizador no oponente até a partida acabar, no mesmo turno;
  - para todos os baralhos: terreno na mão vale menos que terreno em campo (fim da Floresta devolvida à toa).
- **Medição por piloto (`PILOTO=4 node torneio.listas.mjs shark shark-v7 8 110000`):** 96 pares de partidas, mesma
  semente e mesmo oponente (`shark-v7` com cada uma das outras seis listas), só o piloto do Walls muda.
  **Novo venceu 32 de 96 (33%); o v7 venceu 17 de 96 (18%).** Só o novo ganhou em 17 pares; só o antigo em 2
  (teste de sinais: p < 0,001). **Ganho demonstrado.** Zero ações ilegais.
- **Sem regressão nas outras listas:** torneio geral contra o v7, 222 decididas: 50% (112–110).
- **Tempo (seis partidas de mesa grande, 250 ms, sem concorrência):** p50 25 ms · p95 341 ms · p99 424 ms · pior 780 ms.
- **Ainda aberto no Walls (da partida narrada depois da mudança):** segura Lead the Stampede e o segundo Invoker com
  mana sobrando; ataca com o Valakut Invoker (peça do combo); não bloqueia voadoras e perde a corrida para elas; o
  oponente responder ao combo (matar o motor em resposta) não é previsto. 33% ainda é baixo.
- **Falta:** perfil das outras listas (Elves é a próxima: 27–37), mulligan pelo perfil, reserva pelo perfil.
- **Testes:** U (perfil reconhecido; Quirion Ranger com o v7 errando; Freed no Axebane com o v7 errando; combo até o
  fim da partida sem ação ilegal; não começa sem finalizador, com um defensor só ou no turno do oponente; transmutar
  e buscar a Freed).
- **Depende de:** B21.

**B21 · O Shark usa todas as mecânicas das cartas, inclusive as dos terrenos** ✅ (leva 143, 03/10/2026)
- **Origem:** o usuário viu o Shark travado numa partida, preso à mana incolor de um terreno que podia ser sacrificado
  para buscar um terreno básico, sem estourá-lo.
- **Auditoria de uso (`node auditoria.uso.mjs shark 28 500`):** em 28 partidas das sete listas, conta para cada
  habilidade quantas decisões a tiveram disponível e quantas vezes foi usada. **Antes: 16 de 40 nunca usadas**; o
  terreno que busca básico era estourado 2 vezes em 382 chances (Perilous Landscape) e 4 em 191 (Twisted Landscape).
- **Três causas, três consertos:**
  - a avaliação não via o que destrava → `avaliaV4` conta a mágica presa na mão por falta de cor (−3 cada) e o
    terreno sobrando na mão (−2 cada, com cinco ou mais em campo). É o que faz estourar o terreno e buscar a cor certa,
    e ciclar o terreno que sobra;
  - com muitas jogadas possíveis e o relógio curto, as candidatas eram lidas em ordem alfabética e as últimas (alvo
    "jogador") nem eram vistas → uma leitura barata ordena antes do corte, e cópias iguais contam uma vez;
  - mana que pede um gesto (virar outra criatura, sacrificar, pagar {G}) não entra no pagamento automático → o Shark
    procura o plano "abro esta mana → faço aquela jogada" (até 3 habilidades em sequência) e guarda as próximas ações.
- **Depois (mesma auditoria):** Saruli Caretaker 0 → 14 usos · Valakut Invoker 0 → 11 · Bloodrite Invoker 0 → 4 ·
  Jaspera Sentinel 0 → 3 · Harrier Strix 0 → 1 · Sheltering Landscape (reciclar) 0 → 1 · Twisted Landscape 4/191 → 6/54 ·
  Perilous Landscape 2/382 → 4/134 (menos chances porque o terreno sai da mesa mais cedo).
- **Ainda nunca usadas, declaradas:** Tinder Wall (sacrificar por {R}{R}: quase nunca compensa perder o bloqueador),
  Orochi Leafcaller (só troca a cor da mana), Birchlore Rangers (desvirar a metamorfose), Prismatic Strands por lampejo,
  Winding Way no modo "terreno", Thraben Charm no terceiro modo, Highway Robbery tramada, Drift of Phantasms
  (transmutar), Secret Door e Freed from the Real. As quatro últimas são peças do plano do Walls Combo: ficam para a B9.
- **Medição de força (sete listas Pauper, contra o `shark-v6`):** duas medições de 224 partidas: 56% (125–97) e 52%
  (116–108); juntas **54% em 446 decididas (241–205)**, margem de ±5: **ganho de força não demonstrado.** A segunda
  foi depois dos limites de tempo. Pilotando Walls Combo: 23–39 (era 15–43 na leva 132). Pilotando Mono Blue Faeries:
  26–38 (era 35–29): **possível regressão, não investigada.** Zero ações ilegais.
- **Tempo (seis partidas de mesa grande, orçamento de 250 ms, sem concorrência):** p50 24 ms · p95 330 ms · p99 449 ms ·
  pior 572 ms. Antes dos limites desta leva o p95 era 937 ms.
- **Portão do `main` consertado nesta leva (autorizado pelo usuário, tela de outra trilha):** desde a leva 137 quatro
  testes da partida online falhavam com "Grimório" por cima de "Cemitério" (quatro contadores ao lado da vida não cabem
  em 360 px). Com quatro contadores, eles passam a ocupar a linha de baixo inteira. Só CSS, na faixa até 399 px.
- **Testes:** U (o caso do usuário, com o v6 errando; avaliação das presas e da sobra; plano de mana com a Saruli
  Caretaker, em duas chamadas; o dano que fecha a partida achado com relógio curto, com o v6 errando).
- **Depende de:** B17.

**B15 · Olhar o turno seguinte** ✅ (leva 132, 03/10/2026) — fechada com resultado negativo; **o Shark não mudou de jogo.**
- **Pergunta:** simular o resto do turno e o turno inteiro do oponente (em vez de um lance) deixa o Shark mais forte?
- **Entregue (desligado):** política rápida para os dois lados (`politicaRapida`), rolagem até o próprio turno seguinte
  (`rola`), e duas opções de torneio: `rolaAtaque` (as três melhores formações de ataque e "não atacar" são roladas) e
  `rolaJogada` (as duas melhores jogadas da fase principal e "passar"). Tudo sobre mundos possíveis.
- **Medição (sete listas Pauper, 224 partidas cada, contra o `shark-v6`):** só ataque = **53% em 222** (117–105);
  ataque + jogada = **53% em 220** (117–103). Margem de ±7: **ruído.** Pior decisão 1,7–2,0 s (dois torneios em
  paralelo). Zero ações ilegais. Não foi promovido.
- **Achado que muda o roteiro:** nas quatro últimas medições o resultado depende muito mais do baralho que o Shark
  pilota do que da técnica testada. Vitórias do Shark por lista pilotada (somando os dois torneios desta leva):
  Rakdos Madness 50–14 · GW Bogles 40–24 · Mono Blue Faeries 35–29 · Jund Wildfire 34–30 · Boros Bully 32–32 ·
  Elves 28–36 · **Walls Combo 15–43**. Ele não sabe pilotar os baralhos de combinação. É aí que há ganho grande e
  mensurável: o plano de cada baralho (B9), começando por Walls Combo e Elves.
- **Mudança de método a partir daqui:** medir por baralho pilotado, com as mesmas sementes e o mesmo oponente
  (só o piloto muda), em vez da média das sete listas.
- **Testes:** U (política rápida: terreno, permanente mais cara, passar; rolagem: para no meu próximo turno, não muda
  o estado, é determinística).
- **Depende de:** B8.

**B20 · Pesos da avaliação por torneio** ✅ (leva 126, 03/10/2026) — fechada com resultado negativo.
- **Pergunta:** a avaliação foi calibrada no olho; mudar o peso de alguma parcela deixa o Shark mais forte?
- **Entregue:** a avaliação aceita multiplicador por parcela (`avaliadorCom`), o torneio aceita `p:mao=0.5,...`,
  `ORC=<ms>` e `MUNDOS=<n>` para partidas rápidas; o Shark da leva 119 fica congelado como `shark-v6`.
  **O Shark não mudou de jogo:** nenhum peso foi promovido.
- **Medição (sete listas Pauper, 112 partidas por candidato, partidas rápidas: 60 ms e 1 mundo, contra o `shark-v6`):**
  carta na mão ×0,5 = 54% · ×0,25 = 48% · poder e resistência ×1,5 = 50% · evasão ×2 = 52% · dano no oponente ×1,5 = 51% ·
  mana ×0,5 = 46% · perigo ×2 = 51% · corpo em campo ×2 = 53%. Margem de ±9: **tudo ruído.**
- **Achado:** dobrar ou cortar pela metade qualquer parcela não muda o resultado. O que limita o Shark é olhar só um
  lance à frente; as levas que pagaram (115, 118) mudaram o que ele simula, não quanto cada coisa vale.
  Não repetir busca de pesos antes de ele simular mais longe.
- **Custo medido para simular turnos:** aplicar uma ação custa ~1 ms e um turno tem ~21 ações (quase todas passar a
  prioridade): ~20–40 ms por turno simulado. Seis simulações de um turno e meio cabem em ~250 ms no computador.
- **Limite da medição:** triagem curta (112 partidas) e no modo rápido; efeito pequeno (até ~5 pontos) pode existir e
  não foi visto.
- **Testes:** U (multiplicador muda só a parcela pedida, não muda partida decidida, vazio é a avaliação de sempre).
- **Depende de:** B17.

**B17 · Usar os recursos** 🟡 (leva 119, 02/10/2026) — parte entregue; "guardar a resposta para a ameaça certa" depende da B9.
- **Erros de jogo eliminados** (partida narrada Mono Blue Faeries × Boros Bully):
  - ficava a partida inteira com permanente barata na mão e mana parada → permanente que só custa sair da mão entra
    na segunda fase principal; a que tem lampejo entra no passo final do oponente;
  - descartava a anulação tendo terreno sobrando → o descarte escolhe a carta que menos faz falta;
  - **regressão da leva 118**: virava terrenos à toa quando o oponente conjurava (a nota de passar era medida depois
    da pilha e a de virar terreno, antes) → virar terreno por conta própria deixou de ser candidata e toda jogada é
    medida depois da pilha;
  - decisão de vários segundos em mesa grande → a leitura das respostas do oponente passou a respeitar o relógio.
- **Medição (sete listas Pauper, 448 partidas em duas fatias, contra o `shark-v5` congelado):** **54% em 443 decididas
  (238–205)**, dentro da margem de ±5. As fatias deram 59% e 49%. **Ganho de força não demonstrado.** Fica pelo que
  corrige na mesa, não por força. Medido antes do limite de relógio entrar.
- **Tempo (cinco partidas, sem concorrência, orçamento de 250 ms):** p50 15 ms, p95 271 ms, p99 343 ms, pior 557 ms.
  O v5 passava de 700 ms em 29 decisões das mesmas partidas; no torneio houve decisão de 12,9 s.
- **Erros vistos nas partidas narradas e ainda abertos:** Bogles segura auras e bloqueia com a criatura encantada;
  recusa o "compre e descarte" opcional; ataca com tudo estando para morrer no contra-ataque de voadoras; baixa a
  permanente só na segunda fase principal, mesmo quando ela ajudaria no combate.
- **Ferramenta:** `FATIA=i/n node torneio.listas.mjs ...` divide o torneio entre os núcleos.
- **Testes:** U (toque de terreno com o v5 errando, mana sobrando no meu turno e no passo final do oponente, descarte).
- **Depende de:** B11.

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

**C10 · Exportar por lista, não só CSV** 🟡
- **Valor:** levar a coleção (ou um recorte dela) para qualquer lugar que entenda uma lista de cartas.
- **Aceite:**
  - exporta em texto de lista ("4 Lightning Bolt"), com variações: com ou sem edição e número, e no
    formato que Arena e MTGO aceitam;
  - exporta a coleção inteira ou uma seleção manual; exportar o recorte do filtro entra com a C12, que é
    quem traz o motor de filtro (ajuste registrado na ordem de entrega da seção 6);
  - copiar com um toque e baixar como arquivo; o CSV atual continua existindo;
  - o que não tem edição definida sai como cópia genérica, e o cabeçalho diz isso.
- **Entregue (leva 68):** botão **Exportar** na coleção abre o diálogo com três formatos — *Só nome e
  quantidade* (MTGO, Moxfield, Archidekt e as listas da Estante; soma as impressões numa linha por nome),
  *Com edição (Arena)* ("3 Sol Ring (CMM) 400", sem comentários porque o Arena rejeita, só a frente da
  carta de duas faces) e *Com edição e foil (Moxfield)* (`*F*`/`*E*`, nome inteiro). Prévia na tela,
  **Copiar** (área de transferência), **Baixar .txt** e **Baixar CSV** (o CSV mudou de lugar, não de
  formato). O cabeçalho diz quantas cartas e cópias e quantas cópias sem edição definida saem só com o
  nome. Botão **Selecionar** liga o modo de seleção: caixa de 44 px em cada carta, barra fixa embaixo com
  a contagem, *Todas*, *Exportar seleção* e *Sair*; no diálogo dá para alternar entre seleção e coleção
  inteira. Ordem: alfabética por nome; dentro do nome, genérica antes das impressões, normal antes de foil.
- **Testes:** U (os três formatos com acentos, apóstrofo e carta de duas faces; o texto exportado volta a
  entrar pelo leitor de listas sem linha ignorada; seleção; coleção vazia; ordem dentro do nome), I headless
  (importar CSV, exportar nos três formatos, copiar e conferir a área de transferência, baixar .txt,
  selecionar uma carta e exportar só ela, trocar para a coleção inteira, sair da seleção).
- **Depende de:** C1, L6.
- **Fora:** exportar preço; exportar o recorte do filtro (C12).

**C11 · Importar por lista, com conferência antes** 🟡
- **Valor:** colar uma lista e ver a coleção crescer sem medo.
- **Aceite:**
  - aceita texto colado e arquivo, nos mesmos formatos da C10, tolerando numeração, comentários e linhas
    em branco;
  - antes de gravar, mostra a conferência: quantas cartas novas, quantas somam a uma existente, quais
    linhas não foram reconhecidas e por quê;
  - a importação é uma operação só, com desfazer;
  - nome não reconhecido não some: fica numa lista de pendências para corrigir.
- **Entregue (leva 69):** botão **Importar lista** na coleção: cola o texto ou abre um arquivo (.txt, .dec,
  .dek), **Conferir** mostra o total de cópias, quantas cartas são novas e quantas somam ao que você já
  tem, e cada linha não reconhecida com o número da linha e o motivo (*quantidade zero*, *sem nome*,
  *acima de 999*, *nome não encontrado* — este com "parecido: X" quando a base de nomes tem um palpite).
  **Importar** grava tudo de uma vez; a barra "Importação: N cópia(s)" traz **Desfazer**, que devolve a
  coleção e as pendências exatamente ao que eram antes. Linha com nome não encontrado vai para as
  **pendências** (aviso na coleção → **Resolver pendências**: nome editável, até três sugestões da base
  como chips, *Adicionar* confere o nome antes de somar, *Descartar* tira). A linha guarda edição, número
  e foil (`(MH2) 267 *F*`), então o que a C10 exporta volta inteiro.
- **Reconhecimento dos nomes:** primeiro o que já está na coleção; depois a base de nomes do scanner
  (offline, quando já baixada); o que sobrar vai à Scryfall. Sem base e sem internet a conferência avisa
  que não pôde conferir e importa como está — nada fica pendente às cegas.
- **Decisão:** "1. Sol Ring" e "1) Sol Ring" contam como numeração (uma cópia), não como quantidade;
  "1 Sol Ring" e "1x Sol Ring" são quantidade.
- **Testes:** U (leitor com numeração, cabeçalhos, comentários, `SB:`, `*F*`/`*E*`, `(SET) N` e `[SET] N`,
  linhas com lixo e os motivos; ida e volta com os três formatos da C10; plano da conferência com
  existentes, conhecidos e sugestões, e o caso sem como conferir; pendências guardadas, removidas e
  limpas), I headless (colar lista com erro e nome parecido, conferir, importar, ver edição e foil na
  coleção, resolver pendência pela sugestão, descartar a outra, desfazer tudo, reimportar somando).
- **Depende de:** C10, L2.
- **Fora:** casar impressão por número quando a lista não traz edição; importar direto para uma lista
  (isso é o editor de listas).

**C12 · Filtros de verdade** 🟡
- **Valor:** achar exatamente o que você procura na coleção e nas listas.
- **Aceite:**
  - filtra por cor e identidade, tipo e subtipo, raridade, custo convertido, legalidade de formato,
    edição, idioma, acabamento, quantidade e "tenho / falta";
  - busca por texto no nome e no texto da carta, combinada com os filtros;
  - filtros combinam entre si com contagem viva ("312 cartas") e limpam com um toque;
  - o recorte atual vira link e pode ser salvo como visão ("Meus verdes de Pauper");
  - o mesmo motor de filtro serve coleção e listas.
- **Entregue (leva 73):** motor puro `src/data/filter.js` (`filtraColecao`, `opcoesDeFiltro`,
  `descreveFiltro`, `filtrosAtivos`) e o botão **Filtros** na coleção, que abre um painel com: cor (qualquer
  uma / identidade dentro delas, com incolor), tipo (chips + campo de subtipo ou palavra do tipo),
  raridade, custo de/até, legal em (Pauper, Commander, Modern, Legacy, Standard), edição (as que existem
  na coleção, com contagem, mais "sem edição"), idioma, acabamento, cópias de/até, "só em lista" / "só fora
  de lista" e "só sem edição definida". Tudo combina com contagem viva no painel e na tela ("N cartas · M
  cópias" + a descrição do recorte), o campo de busca procura no nome **e no texto da carta**, **Limpar
  filtros** desfaz tudo com um toque, e **Exportar** ganhou o escopo **Recorte do filtro**, que sai só com
  as impressões que passaram (o que ficou de fora da C10). Carta sem dados guardados responde a nome,
  edição, idioma, acabamento, cópias e lista; para cor, tipo, custo, raridade e formato a tela diz quantas
  ficaram sem julgar. Funciona sem internet com o que está guardado (passo no portão offline).
- **Sem rede:** filtra pelos dados já guardados; o que não tem dados é contado à parte, não escondido.
- **Entregue (leva 74, C12b):** o recorte **vira link** (`#/colecao?f=…`, curto, só o que está ligado;
  abrir o link reaplica tudo, inclusive o texto) e **visão salva** com nome ("Meus verdes de Pauper"):
  chips acima da lista, um toque aplica, outro desliga, × apaga com confirmação; a visão fica ligada
  quando o filtro atual é igual ao dela. O painel de filtros virou um componente único
  (`abrirPainelFiltros`) e passou a existir também na **lista**: campo de nome/texto e botão Filtros
  sobre a galeria, contagem do recorte, sem as seções que só fazem sentido com impressões (edição, idioma,
  acabamento, listas). Escrever no campo redesenha a galeria sem perder o foco.
- **Decisão:** visões são por aparelho (ficam no armazenamento local, não no backup ainda); "sem edição"
  dentro de uma lista de edições vai no link como `~`.
- **Testes:** U (texto no nome e no texto; cor qualquer/incolor/identidade; tipo por palavra inteira e
  subtipo; raridade, custo, formato; edição/idioma/acabamento recontando cópias; quantidade, lista, sem
  edição e combinações; contagem de ativos, opções que existem e descrição; 5 000 cartas com filtro
  combinado em menos de 100 ms; link ida e volta sem perda e lixo virando padrão; visões salvas,
  apagadas e por aparelho), I headless (coleção real: cor → tipo → acabamento com contagem viva, vazio
  honesto, botão com o número de filtros, limpar, texto de regras, edição, exportar o recorte, link do
  recorte, salvar/aplicar/desligar/apagar visão, abrir o link direto, filtro de texto e painel na lista;
  passo no portão offline).
- **Depende de:** C1, L3.
- **Fora:** busca com sintaxe da Scryfall.

**C13 · A coleção como coleção** 🟡
- **Valor:** ver o acervo de forma organizada e bonita, não como uma tabela infinita.
- **Aceite:**
  - três visões: galeria (arte), densa (uma linha por carta) e pilhas (agrupadas);
  - agrupar por cor, tipo, edição, raridade ou custo, com cabeçalho e contagem por grupo;
  - ordenar por nome, custo, raridade, edição, quantidade e entrada mais recente;
  - a visão, o agrupamento e a ordenação ficam lembrados por aparelho;
  - rolagem fluida com muitas cartas, sem travar no celular.
- **Entregue (leva 75):** chips **Lista / Galeria / Densa / Pilhas** (a Lista é a visão de trabalho que já
  existia, com os controles de quantidade; Galeria mostra a arte com a quantidade e abre as impressões
  com um toque; Densa é uma linha por carta com tipo, edições e quantidade; Pilhas empilha as primeiras
  cartas de cada grupo com rótulo e contagem, um toque abre a pilha, "Fechar pilha" volta). **Agrupar**
  por cor (branco…verde, multicolor, incolor), tipo, edição (carta com duas edições aparece nas duas, só
  com as cópias de cada), raridade ou custo (0…7+), com cabeçalho e contagem; carta sem dados guardados
  vai para "Sem dados" no fim. **Ordem** por nome, custo, raridade, edição, mais cópias e mais recentes
  (cada item passou a guardar quando entrou; item antigo conta como o mais velho). Tudo lembrado por
  aparelho. A tela desenha em **lotes de 120** com "Mostrar mais (N restantes)" que também dispara
  sozinho ao rolar até o fim — os grupos fechados nas pilhas não gastam lote.
- **Sem rede:** tudo trabalha com os dados guardados; arte que não está no aparelho vira o nome.
- **Testes:** U (ordenar por cada critério com "sem dados" no fim e critério desconhecido caindo no nome;
  agrupar por cada critério com contagem e rótulos, edição repartindo as impressões; 5 000 cartas
  ordenadas e agrupadas em menos de 100 ms), V (linha densa e pilha com 44 px, só tokens, proporção da
  carta), I headless (303 cartas: lotes de 120 e "mostrar mais" até acabar, ordem por cópias, galeria com
  quantidade e impressões, densa com tipo e edição, agrupar por edição com cabeçalhos e ordem dentro do
  grupo, pilhas abrindo e fechando, escolhas lembradas ao voltar).
- **Depende de:** C12.
- **Fora:** arrastar para reordenar manualmente; virtualização real da rolagem (o lote de 120 resolve até
  alguns milhares; se travar no aparelho com mais, vira história).

**C14 · Painel da coleção** 🟡
- **Valor:** entender o acervo de relance, em números e gráficos.
- **Aceite:**
  - resumo no topo: total de cartas, cartas distintas, edições, distribuição por cor, por tipo, por
    raridade e curva de custo;
  - cada pedaço do gráfico é um filtro: tocar em "verde" filtra os verdes;
  - "o que falta para montar": escolhe uma lista salva e mostra o que você já tem e o que falta;
  - tudo desenhado com os tokens do design system, legível no claro e no escuro.
- **Entregue (leva 76):** **Painel** no topo da coleção (recolhe e fica lembrado): três números (cartas,
  cópias, edições), barras por cor (com a cor de mana do próprio design system e a pipa ao lado), por tipo
  e por raridade, e a curva de custo de 0 a 7+. Cada barra e cada coluna é um botão de 44 px que liga o
  filtro correspondente (e desliga ao tocar de novo); o painel passa a mostrar os números **do recorte**,
  então filtrar e ler o painel se alimentam. Multicolor, "Outro" e "Sem dados" não são botões (não há
  filtro equivalente) — declarado na tela. **O que falta para montar**: escolhe uma lista salva e vê
  "16 de 32 · faltam 16 · 50%", as cartas que faltam (mais falta primeiro), *Copiar o que falta* e
  *Abrir a lista*. Marcas finas, valores em texto dos tokens, sem cor literal.
- **Sem rede:** só dados guardados; carta sem dados fica fora das distribuições, e o painel diz quantas.
- **Testes:** U (resumo com totais, edições, sem dados, distribuições e a curva sempre com 8 degraus; a
  fatia "verde" bate com o filtro por verde; o que falta por carta, total e porcentagem, reserva fora),
  V (barras e colunas com 44 px, só tokens, cores de mana pelos tokens), I headless (números, rótulos
  das barras, tocar em verde filtra e o painel muda, tocar de novo desliga, coluna da curva filtra,
  o que falta para a Delver, recolher lembrado ao voltar).
- **Depende de:** C13.
- **Fora:** valor em dinheiro da coleção; gráfico de identidade de cor (o painel usa a cor da carta).

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

**X7 · Captura automática sem moldura** 🟡
- **Valor:** apontar a câmera e a carta ser lida sozinha, sem encaixar em retângulo.
- **Aceite:**
  - o scanner encontra a carta no quadro (bordas e proporção) em qualquer posição e rotação leve, sem
    exigir a moldura;
  - captura sozinho quando a imagem está estável e nítida o bastante, com retorno visual imediato
    (contorno na carta encontrada) e vibração curta;
  - a moldura vira ajuda opcional, não obrigação, e continua disponível para quem preferir;
  - luz baixa ou carta cortada geram uma instrução curta do que corrigir, em vez de leitura errada;
  - a decisão de "está pronto para ler" é uma função pura, testável fora da câmera.
- **Entregue (leva 64):** o scanner olha o quadro cinco vezes por segundo, acha a carta sozinho, desenha o
  contorno em cima dela, diz o que corrigir e dispara a leitura quando está tudo certo. A moldura virou
  chip opcional e **começa desligada**. A faixa do nome passou a sair da carta encontrada, então funciona
  com a carta em qualquer posição do quadro.
- **Como ele decide (tudo função pura, sem câmera):** perfis de borda por linha e coluna acham o
  retângulo; a proporção 63×88 valida; **as quatro bordas precisam ser degrau de verdade** (senão a textura
  da arte vira "carta"); brilho e nitidez medem luz e tremor; três quadros no mesmo lugar contam como
  parada. A mesma carta parada não entra duas vezes.
- **O que a medição obrigou a corrigir:** o tamanho mínimo era cobrado na **largura** do quadro, e com o
  vídeo em paisagem a carta ocupa pouca largura — o detector desistia de uma carta que estava inteira ali.
  Agora o mínimo é cobrado na altura, que é onde a carta é grande.
- **Instruções que a tela dá:** "Mostre a carta inteira no quadro", "Está escuro: procure mais luz",
  "Muito claro: tire o reflexo da carta", "Imagem tremida: segure firme", "Quase lá: segure firme mais um
  instante", "Carta já lida: mostre a próxima".
- **Testes:** U (acha a carta no meio, no canto e afastada; recusa quadro liso, carta cortada e objeto
  quadrado; brilho e nitidez medindo o que prometem; uma instrução por problema; o detector exigindo três
  quadros parados, não repetindo a mesma carta e voltando a aceitar depois de rearmar; ida e volta entre
  coordenadas do quadro e da tela; menos de 60 ms por quadro), I headless (câmera falsa mostrando uma
  carta de verdade: o contorno aparece, a leitura dispara sozinha sem ninguém tocar em "Ler agora", e a
  moldura volta quando o usuário quer).
- **Depende de:** X1, X2.
- **Fora:** reconhecimento pela arte; corrigir perspectiva forte; leitura com a carta muito torta (X10 mediu: até ~3,5° lê; acima disso fica fora).

**X8 · Pilha de leitura** 🟡
- **Valor:** escanear várias cartas seguidas e resolver tudo no fim.
- **Aceite:**
  - cada leitura vira um cartão empilhado na tela, com miniatura, nome, edição e nota de confiança;
  - a pilha cresce enquanto você escaneia, sem interromper a câmera, e mostra o total;
  - dá para desfazer a última, remover uma do meio e ajustar quantidade sem sair da câmera;
  - a pilha sobrevive a fechar o app e volta ao reabrir;
  - "Adicionar em lote" manda tudo de uma vez para a coleção ou para uma lista, com resumo do que entrou.
- **Entregue (leva 65):** a pilha virou uma faixa de cartões **na própria tela do scanner**, embaixo da
  câmera: miniatura, nome, edição e a confiança da leitura em porcentagem. Ela cresce enquanto você
  escaneia, mostra o total, e cada cartão tem −, + e × para ajustar ou tirar da pilha **sem sair da
  câmera**. O botão "Adicionar em lote" abre o destino (coleção ou lista) com o resumo do envio.
- **O que o lote ganhou por dentro:** `score` e `img` por item (a leitura mais recente é a que a pilha
  mostra), `remove(key)` para tirar um do meio sem mexer nos outros, e `resumo()` com itens, cópias e
  quantas têm edição.
- **Testes:** U (confiança e miniatura guardadas e atualizadas pela leitura mais recente; remover do meio
  sem afetar as outras nem o desfazer; resumo com e sem edição; a pilha voltando inteira depois de fechar
  o app), I headless (escanear com a câmera falsa, ver o cartão na pilha com nome e confiança, somar uma
  cópia e tirar da pilha, tudo sem sair da câmera).
- **Depende de:** X4, X7.
- **Fora:** editar condição e idioma no lote (fica na coleção); miniatura sem rede (a carta aparece com a
  inicial até a imagem existir no cache).

**X9 · Validação ágil da leitura** 🟡
- **Valor:** confiar no que entrou na coleção, gastando um toque por carta.
- **Aceite:**
  - leitura com confiança alta entra confirmada; as demais ficam marcadas como "confira";
  - conferir é um toque: o palpite principal e até três alternativas ficam visíveis no próprio cartão;
  - corrigir abre busca por nome com teclado, sem perder o resto da pilha;
  - nada entra na coleção marcado como conferido sem você ter confirmado.
- **Entregue (leva 66):** dois patamares de confiança (`ACCEPT` 0,82 entra na pilha; `ALTA` 0,92 entra
  confirmada). Entre os dois, o cartão da pilha fica com borda e selo **"Confira"** e traz, no próprio
  cartão, o botão **"É essa"**, até três alternativas que a leitura ofereceu (um toque troca o nome) e
  **"Corrigir"** (busca por nome com teclado, que volta para a pilha, não para o lote). No lote, os
  itens a conferir ficam marcados, um aviso diz quantos faltam e o botão principal vira
  "Adicionar N à coleção (K a conferir)": nada entra como conferido sem um toque consciente.
- **Correção no caminho:** "Corrigir" escolhendo o mesmo nome deixava a marca "confira" (o `rename` saía
  cedo quando a chave não mudava). Agora escolher o mesmo nome também confere.
- **Testes:** U (patamares e alternativas guardadas; confirmar, corrigir para outro nome e corrigir para o
  mesmo nome tiram a marca sem duplicar cópias; leitura nova de confiança média volta a marcar), I headless
  (leitura de 87% entra marcada, o lote avisa e o botão principal mostra "a conferir"; "É essa" limpa a
  marca; leitura de 100% entra confirmada; "Corrigir" resolve e volta para a pilha).
- **Depende de:** X8.
- **Fora:** aprender com as correções (subir a nota de um nome que o usuário confirmou várias vezes).

**X10 · Medir o acerto com fotos reais** 🟡 (parcial: conjunto sintético; fotos reais pendentes — desde a leva 116 o portão mede o caminho da X11 e o conjunto tem 27 fotos)
- **Valor:** fechar a pendência declarada em X2 e X3: hoje o portão mede a correspondência, não o OCR.
- **Aceite:**
  - conjunto de fotos reais de cartas no repositório (variando luz, ângulo, acabamento e idioma);
  - o portão roda o reconhecimento sobre elas e exige acerto de nome ≥ 90% e de edição ≥ 70%;
  - o relatório mostra quais fotos falharam, para virar caso de teste.
- **Entregue (leva 67):** o portão agora roda o **caminho inteiro do scanner fora do navegador**, com OCR
  de verdade (`scanner.fotos.test.mjs`): achar a carta → recortar nome e linha de coleção → tratar a
  imagem exatamente como o app → Tesseract com os mesmos parâmetros → casar com a base de nomes →
  resolver a edição contra as impressões conhecidas, como `identify` faz. Conjunto em `fotos/`
  (`manifest.json` diz o que cada foto deveria dar; `gerar.mjs` produz as sintéticas): 12 fotos
  variando fundo, luz (escura, estourada), inclinação (até 3,5°), foco, reflexo, tamanho e posição
  da carta, retrato e nome longo. **Medida atual: carta achada 12/12, nome 12/12, edição 11/12.**
- **O que a medição encontrou e mudou no app** (nada disso era visível pelos testes de unidade):
  1. o detector prende ora na borda preta, ora na moldura interna da carta (borda preta sobre mesa
     escura) — as faixas do nome e da linha de coleção agora passam da borda de propósito
     (`NAME_BAND` 0–12%, `COLLECTOR_BAND` 90–110%) e a linha de coleção é recortada pelo trecho escuro
     de baixo, invertida (branco sobre preto → preto sobre branco) e aplanada (tira reflexo em degradê);
  2. linha da moldura colada na margem do recorte fazia o OCR devolver **vazio** com o nome perfeitamente
     legível — `limpaBordas` apaga o que é escuro e encosta na margem (o texto não encosta);
  3. contraste fixo estourava foto escura — níveis automáticos por faixa (percentis);
  4. o OCR recebia texto de 10 px — a ampliação agora sai da altura da carta (`escalaOcr`, alvo 2000 px);
  5. carta pequena (48% do quadro) não era achada em 80 px e carta inclinada não era achada em 120 px —
     o detector olha o quadro nas duas escalas (`ESCALAS_DETECTOR`), a primeira que acha manda.
- **Parcial, e o que falta:** as 12 fotos são **sintéticas** (carta desenhada em HTML e "fotografada" com
  variações); elas provam o caminho e pegaram cinco defeitos reais, mas não substituem foto de celular
  (grão, perspectiva, foil, texto impresso). Para fechar: 10 a 20 fotos reais em `fotos/` com uma linha
  cada no `manifest.json` (`origem: "real"`, nome, set, número, impressões). O runner já aceita `.jpg`
  e `.png` e falha se uma foto do manifest não existir.
- **Limites medidos:** número de coleção lido em texto de ~7 px (carta pequena no quadro) e com desfoque
  forte falha — a edição desses casos se resolve só quando o código da edição sozinho é único entre as
  impressões. A faixa do nome **não** é aplanada: o halo da janela larga ao redor da arte atrapalha mais
  do que o reflexo ajuda (medido).
- **Decisões:** `fotos/` é uma subpasta (ADR-07 fala de testes na raiz; 12 imagens binárias na raiz
  poluiriam o layout — o teste continua na raiz). `tesseract.js`, `@tesseract.js-data/eng` (dados do OCR
  empacotados, sem download), `jpeg-js` e `pngjs` entram como devDependencies; sem eles o teste de fotos
  se declara pulado com instrução, e o resto do portão segue.
- **Testes:** U (escala do OCR e faixas que passam da borda; níveis automáticos em foto escura, estourada
  e invertida; aplanar degradê; trecho escuro com e sem reflexo; limpar bordas preserva o texto solto;
  tratamento da linha de coleção; detector em duas escalas e `quadro()` com lista), fotos (12 fotos, nome
  ≥ 90%, edição ≥ 70%, relatório por foto; manifest íntegro), I headless inalterada (scanner com câmera
  falsa continua achando a carta e lendo).
- **Depende de:** X7, X9.
- **Fora:** conjunto com centenas de fotos; corrigir perspectiva; aprender com correções.

**X11 · Leitura por contorno: quatro cantos, carta retificada e linha do nome** 🟡 (leva 116; aguardando teste no aparelho)
- **Valor:** o scanner lê a carta onde ela estiver no quadro, inclinada ou em perspectiva, sobre papel, playmat
  ou pano escuro, com protetor ou em cima de uma pilha. Pedido de 01/10/2026: "não está reconhecendo nenhuma carta".
- **Diagnóstico medido (01/10/2026), antes de mexer:** 11 fotos reais de carta tiradas com celular (repositórios
  públicos `hj3yoo/mtg_card_detector` e `tmikonen/magic_card_detector`) passaram pelo caminho exato do app
  publicado (leva 112). **Acerto: 3 de 11**, e só nas fotos em que a carta foi alinhada à mão na moldura; nas 6 em
  que o detector achou a carta sozinho, a leitura veio vazia ou lixo. Duas causas:
  1. o detector (perfis de borda, retângulo reto) prende em retângulos errados — moldura interna, sombra, outra
     carta, protetor — e não tolera mais de ~3,5° de inclinação; a faixa do nome sai do lugar errado;
  2. o tratamento da faixa (`realcaTexto` + `limpaBordas`) recebia borda preta, barra do título e começo da arte
     juntos: em carta de verdade o "fundo" não fica branco, o preenchimento a partir da margem engole o texto e o
     OCR devolve vazio.
  Terceira causa, não medida aqui (só existe no aparelho) e corrigida por construção: a cada leitura o app criava
  um canvas do tamanho do vídeo inteiro (4K = 33 MB), várias vezes por segundo. Em celular isso esgota a memória
  de canvas e as cópias passam a vir em branco — o sintoma é exatamente "não lê nada".
- **Aceite:**
  - a carta é achada por quatro cantos (não por retângulo reto), com inclinação e perspectiva, em qualquer lugar do quadro;
  - o leitor recebe só a linha do nome: retificada, localizada dentro da faixa do topo, binarizada e sem as linhas da barra;
  - sem contorno (carta na mão, mesa da cor da borda), o mesmo caminho vale a partir da moldura guia;
  - nenhuma leitura copia o quadro inteiro nem cria canvas novo;
  - o portão mede o caminho novo em fotos com desenho de carta de verdade e cena de uso real, e o caminho
    antigo fica abaixo do alvo nesse conjunto.
- **Entregue (leva 116):**
  - **contorno:** retas do quadro por transformada de Hough sobre as bordas (quadro em 320 px), quadrilátero de
    proporção 63×88 com as quatro bordas apoiadas; entre os válidos ganha o mais apoiado, mais próximo da
    proporção, maior (a arte tem quase a proporção da carta, deitada) e com o lado mais fraco mais forte (numa
    pilha, só a carta de cima tem as quatro bordas à vista). `achaQuadrilatero` — 7 ms por quadro no Node;
  - **retificação:** homografia dos quatro cantos; do vídeo sai só o pedaço que tem o nome, na resolução cheia
    (`recorteDaFaixa` → `camera.capture(regiao, { canvas })`), e ele é endireitado em 800 px de largura;
  - **linha do nome:** a faixa é generosa (−3% a 19% da carta) porque o quadrilátero pode ser a borda de fora, a
    moldura de dentro ou um protetor; dentro dela a linha é **achada** (traços verticais entre duas faixas calmas),
    não suposta (`linhaDoNome`). Só essa linha é binarizada (fundo local, polaridade automática) e limpa
    (`binarizaLinha`, `limpaLinha`); `preparaNome` junta tudo e é a mesma função no app e no portão;
  - **linha de coleção:** o mesmo caminho no canto de baixo, só sobre a borda escura (`preparaColecao`);
  - **nome:** o OCR também arrasta lixo no **começo** da linha (a curva da barra vira "l", "fi", "ol"); a
    correspondência tenta de novo sem as palavrinhas de até 2 letras da frente;
  - **laço:** contorno primeiro; sem leitura, a moldura guia na mesma passada. Depois de três leituras sem nome
    com o contorno achado, a carta é lida de cabeça para baixo e **continua** virada enquanto a leitura der nome
    (o porteiro precisa de leituras seguidas). Contorno pequeno demais não é lido, mas não impede a moldura guia
    ("Aproxime a carta" só aparece se ela também não ler). Carta em movimento não vai para o OCR. A régua de
    nitidez passou a medir a linha retificada. O porteiro (leva 112) não mudou;
  - **edição:** os cantos são conferidos de novo no quadro do momento do aceite (o nome foi lido uma ou mais
    passadas antes); sem bloco de texto sobre borda escura (carta de borda branca), nada vai para o leitor;
  - **câmera:** 1440p primeiro (antes 4K), depois 1080p; três canvas reaproveitados (quadro pequeno, pedaço do
    vídeo, linha pronta);
  - **tela:** o contorno é o quadrilátero desenhado sobre a carta (SVG); com a carta achada, a moldura guia sai da
    frente; a dica, com a carta achada e sem nome, fala de leitura ("aproxime e tire o reflexo"), não de
    enquadramento; o diagnóstico mostra a versão do leitor.
- **Medido depois (01/10/2026):**

  | Conjunto | Antes (leva 112) | Depois (leva 116) |
  |---|---|---|
  | 11 fotos reais de celular (nome) | 3 | **7** |
  | — as 7 de moldura moderna | 3 | 6 |
  | — as 4 de moldura antiga (Alpha, 1993) | 0 | 1 |
  | 27 fotos do portão (nome) | 20 (74%, abaixo do alvo de 90%) | **27 (100%)** |
  | 27 fotos do portão (edição) | 16 | 22 |

  As fotos reais não entram no repositório: `hj3yoo/mtg_card_detector` não tem licença. O conjunto do portão
  ganhou 15 fotos sintéticas de estilo `real` (`fotos/gerar.mjs`): carta com borda preta, barra do título, custo
  de mana, arte, regras e linha de coleção em duas linhas, em papel pautado, playmat, pano preto, pilha,
  protetor com reflexo, sombra de mão, inclinação de até 14° e perspectiva.
- **Parcial, e o que falta:**
  - **não testado em aparelho real** nesta leva; a calibração (nitidez mínima, distância) saiu de fotos de 720p;
  - **moldura antiga** (nome claro com sombra sobre fundo texturizado, cartas até 2003): o OCR não lê. Uma de
    quatro. É o caso que o reconhecimento pela arte (X12) resolve;
  - carta com perspectiva forte e pequena no quadro (foto tirada de longe e de lado) não lê;
  - pilha sobre fundo escuro: o contorno pode cair numa carta de baixo; a moldura guia resolve;
  - edição em 22 de 27: texto de ~7 px e desfoque continuam fora, como em X10.
- **Testes:** U (cantos de carta reta, inclinada, fora do centro e clara em fundo claro; arte e meia carta não
  ganham; quadrado, quadro liso e carta cortada não são carta; ruído; menos de 25 ms; homografia e retificação;
  linha do nome entre faixas calmas; binarização nas duas polaridades; limpeza que preserva letra e não apaga
  fundo texturizado; nitidez e deslocamento; recorte da faixa; lixo no começo do nome; linha de coleção só
  sobre a borda escura; câmera sem canvas novo), fotos (27, nome ≥ 90%, edição ≥ 70%, pelo caminho do app),
  I headless (foto de carta inclinada 12° num playmat: contorno de quatro cantos na tela; a imagem que o leitor
  recebeu no navegador é lida pelo Tesseract de verdade, nome e linha de coleção; cinco leituras, zero canvas novo;
  a mesma foto de cabeça para baixo: três passadas seguidas com o nome do lado certo).
- **Revisão independente do código (01/10/2026), antes do portão final:** uma leitura sem contexto da implementação
  apontou 12 itens; os que mudavam comportamento foram corrigidos e viraram teste: carta de cabeça para baixo
  nunca seria aceita (virava uma leitura em cada três; o porteiro precisa de seguidas), preenchimento do contorno
  ficaria preto opaco em navegador sem `color-mix`, contorno "longe" travava a moldura guia, recorte com palco sem
  tamanho derrubava "Ler agora", linha de coleção lida de uma tira qualquer em carta de borda branca, contorno
  parado na tela com o automático pausado, deslocamento falso quando a ordem dos cantos gira.
- **Expectativas ajustadas com justificativa:** diagnóstico da leva 112 (nitidez com uma casa decimal: a medida
  mudou de faixa crua para linha retificada); X3/X5 (a câmera falsa mostra a foto de uma carta: a linha de coleção
  só vai para o leitor quando há texto sobre a borda escura, e o quadro de ruído não tem).
- **Depende de:** X7, X10.
- **Fora:** reconhecimento pela arte (X12); cartas de dupla face pelo verso; idiomas além do inglês.

**X12 · Reconhecimento pela arte (impressão digital da imagem)** ○
- **Valor:** identificar a carta e a **edição** sem depender do OCR: moldura antiga, foil, nome coberto, carta em
  outro idioma. É como ManaBox e Delver Lens resolvem o que o texto não resolve.
- **Aceite:**
  - a carta retificada (X11) vira uma impressão digital perceptual de 256 bits da arte;
  - a base de impressões (uma por arte, ~35 mil) é gerada fora do app a partir das imagens da Scryfall e baixada
    sob demanda como a base de nomes, com tamanho medido (estimativa: ~1,2 MB) e uso offline;
  - nome por OCR e nome por arte se confirmam; quando discordam, a leitura fica "confira";
  - a edição sai da arte quando a linha de coleção não lê.
- **Testes:** U (impressão estável a luz, inclinação e reflexo; busca em 35 mil em menos de 50 ms), fotos.
- **Depende de:** X11. **Decisão pendente do usuário:** quem gera a base — um fluxo do GitHub Actions neste
  repositório, que baixa as imagens da Scryfall uma vez por semana e publica o arquivo no Pages (recomendado), ou
  geração no aparelho a partir das cartas da própria coleção (sem custo de infraestrutura, cobre só o que já se tem).
- **Fora:** rede neural no aparelho.

### X · Scanner de referência (E52, pedido de 02/10/2026)

Retorno do usuário depois da leva 116, no aparelho: "o scanner ficou muito bom, está acertando as cartas e está mais
rápido". Pedido, **nesta ordem**: (1) o máximo da qualidade de imagem que a câmera entrega; (2) o menor tempo de
resposta até identificar a carta; (3) a experiência de uso em outro patamar — sofisticada, minimalista, fluida e visual.

**O que foi medido antes de planejar (02/10/2026, Node 22 em servidor, 27 fotos do portão):**

| Etapa de uma passada | Tempo | Leitura |
|---|---|---|
| Detector (contorno, quadro em 320 px) | 7 ms | barato |
| Preparo (retificar, achar e binarizar a linha) | 12 ms | barato |
| OCR da linha do nome (Tesseract, 800 px) | 46 ms | o maior, e pouco sensível ao modelo (`best_int` 47 ms, completo 46 ms) e à largura (600 px: 37 ms; 400 px: 35 ms, mesmo acerto) |
| Casar com 34 mil nomes | 7 a 17 ms | barato; leitura exata pode ser O(1) |

Uma passada custa cerca de 75 ms no servidor (num celular, 3 a 5 vezes mais). **O tempo até aceitar não é dominado pelo
OCR, e sim pela regra:** o porteiro exige duas leituras exatas seguidas, com 120 ms de respiro entre elas, e a primeira
passada de uma carta que chega costuma ser descartada por movimento. São de 2 a 3 passadas onde uma bastaria. É aí que a
X14 ataca. Sobre imagem: acima de 1440p o **nome** não ganha (a linha é lida em 800 px); o que ganha com mais resolução
é a **edição** (texto de 1,6% da carta) e a carta longe. Para o nome, o que pesa é foco, zoom e luz.

**Orçamentos do épico** (a X13 mede; as seguintes cobram):

| Medida | Hoje | Meta |
|---|---|---|
| Tempo até aceitar no aparelho, mediana, carta entrando no quadro | desconhecido (a X13 passou a medir) | ≤ 600 ms |
| Passadas até aceitar uma leitura exata pelo contorno | 1 desde a X14 (era 2 a 3) | 1 |
| Detector + preparo no navegador de teste | ~55 ms | ≤ 40 ms |
| Edição certa no conjunto do portão | 22 de 27 | ≥ 25 de 27 |
| Toques para escanear e guardar um lote | abrir pilha → lote → destino → adicionar | 1 depois do lote lido |

| Ordem | História | Frente | Levas |
|---|---|---|---|
| 1º 🟡 | **X13** câmera no máximo e cronômetro | imagem | 1 (leva 120) |
| 2º 🟡 | **X14** resposta imediata | velocidade | 1 (leva 127) |
| 3º | **X15** melhor quadro e edição em resolução cheia | imagem e velocidade | 1 |
| 4º | **X16** tela nova do scanner | experiência | 1 a 2 |
| 5º | **X17** pilha e conferência visuais | experiência | 1 |
| 6º | **X18** sessão de catalogação | experiência | 1 |
| à parte | **X12** reconhecimento pela arte · **X10** fotos reais | decisão e insumo do usuário | 2 |

**X13 · Câmera no máximo e cronômetro de leitura** 🟡 (leva 120; aguardando teste no aparelho)
- **Valor:** o scanner usa tudo o que a câmera do aparelho entrega, e passa a dizer quanto demora, por etapa.
- **Aceite:**
  - a câmera sobe até a maior resolução que declara (teto 4K) sem cair de 15 quadros por segundo, com o vídeo já na tela; um degrau só vale se a câmera passou a entregar mais pixels de fato; se o maior arrasta, fica o de baixo; se nenhum serve, volta ao formato de antes;
  - foco, exposição e branco contínuos seguem valendo a cada novo pedido (zoom, lanterna, resolução);
  - toque na câmera foca e mede a luz no ponto tocado, quando o navegador aceita;
  - lanterna, zoom (1×, 1,5×, 2×, 3×, dentro do que a câmera aceita) e troca de lente traseira, cada um só quando o aparelho tem; zoom e lente escolhidos voltam ao reabrir;
  - o diagnóstico mostra resolução, máximo declarado, a subida degrau a degrau, zoom, lanterna, lente, o tempo por etapa de cada leitura (detector, preparo, leitor, casamento) e o **tempo até aceitar** (mediana).
- **Entregue (leva 120):** tudo acima. Na camada de plataforma (`webCamera`): `melhorar`, `zoom`, `zooms`, `lanterna`, `lentes`, `trocarLente`, `focar(ponto)`; `degrausDeResolucao` e `medeFpsDoVideo` (conta quadros por `requestVideoFrameCallback`). No scanner: `criaCronometro` (confirmação: da primeira leitura do nome até o aceite; desde a entrada: só quando o quadro estava vazio antes). Os controles ficam em "Mais", como chips; a X16 leva para a tela.
- **Revisão independente do código, antes do portão (02/10/2026), contra o código-fonte do Chromium:** a primeira versão desta história **não subia a resolução no Chrome do Android e dizia que tinha subido**. No Chrome, um pedido à câmera que traz qualquer chave de imagem (foco, zoom, lanterna) é tratado só como pedido de imagem: largura e altura no mesmo pedido são ignoradas. Corrigido antes de publicar: o formato vai num pedido só dele, e o degrau só é aceito se a trilha passou a entregar mais pixels. Outros achados corrigidos: a volta ao formato de antes não voltava; subida não cancelava ao trocar de lente ou parar a câmera; lente que não abria caía calada na padrão e ficava guardada; ponto de foco ficava pesando a medição pelo resto da sessão e não era girado para o sensor com o celular em pé; contagem de quadros começava antes do primeiro quadro e reprovava formato bom; cronômetro inflava com carta repetida. O teto da escada ficou em 4K (a área inteira do sensor em vídeo esquenta e não devolve leitura).
- **Sem rede:** nada aqui usa rede.
- **Limites declarados:** não testado em aparelho real. O comportamento do Chrome veio da leitura do código-fonte, não de um aparelho; o do Safari do iPhone não foi conferido (lá os controles não devem aparecer: a câmera não os declara). **A conferir no aparelho:** (1) a linha "subida" do diagnóstico mostra um degrau com ✓ e a resolução da câmera muda; (2) tocar numa área clara faz a exposição ceder ali (o giro do ponto para o sensor é a parte menos certa). A lente padrão continua sendo a que o navegador escolhe para "traseira"; a troca é manual.
- **Testes:** U, com câmera falsa que se comporta como o Chrome (escada com teto 4K; subida com régua de fluidez e pedido só de formato; volta ao formato de antes; câmera que finge aceitar; câmera que recusa; aba escondida; cancelamento ao parar; contagem de quadros que espera o primeiro; zoom preso e sem resto de ponto flutuante; lanterna recusada não contamina o pedido seguinte; foco no ponto num pedido só, girado com o vídeo em pé, e o ponto saindo depois; lentes, lente que não abre, lente guardada que sumiu; cronômetro; diário com etapas), I headless (câmera falsa com capacidades a 30 quadros por segundo: pedido de 3840×2160 só de formato e o foco logo depois, lanterna, zoom que volta ao reabrir, foco no ponto tocado em frações do quadro, troca de lente, diagnóstico com máximo, subida e tempo até aceitar; câmera sem capacidades não mostra controle).
- **Depende de:** X11.
- **Fora:** escolher sozinho a melhor lente; zoom automático de enquadramento (X15); foto em resolução cheia para a edição (X15).

**X14 · Resposta imediata** 🟡 (leva 127; aguardando teste no aparelho)
- **Valor:** a carta entra na pilha na primeira leitura boa, sem esperar a segunda.
- **Aceite:**
  - leitura **idêntica** a um nome da base (letra por letra, sem limpeza de lixo), pelo contorno, com a carta parada, com nome de 5 letras ou mais e que não seja o começo de outro nome ("Mountain" / "Mountain Goat"): aceita na primeira passada. Nome curto, começo de outro nome, leitura aproximada, carta em movimento e leitura pela moldura continuam precisando de 2 e 3 leituras;
  - um nome aceito há menos de 2,5 s não entra de novo, mesmo que outra carta tenha sido lida no meio (A, Z, A);
  - carta já aceita e parada no quadro: o laço descansa 250 ms entre passadas; carta no quadro sem nome por 8 passadas: volta ao passo de 120 ms (bateria);
  - a próxima passada começa no próximo quadro do vídeo (sem os 120 ms de respiro) enquanto há carta no quadro; sem carta, o laço segue no ritmo antigo, para poupar bateria;
  - nome exato é achado por consulta direta, sem percorrer a base;
  - a edição é lida por um segundo leitor, sem segurar a leitura da carta seguinte.
- **Entregue (leva 127):** `leituraConfiavel` e `porteiro.voto(found, { confiavel })`; `proximoQuadro` no laço (`requestVideoFrameCallback`); tabela `exatos` no índice de nomes; `createOcr` com dois leitores (nome e edição), o segundo sobe em segundo plano quando o do nome fica pronto e é encerrado ao sair do scanner. O diagnóstico marca "(1ª leitura)" no aceite. "Ler agora" tem a vez sobre o automático; alternar o Automático não cria laços em paralelo.
- **Revisão independente antes de publicar (02/10/2026), corrigido na mesma leva:** sequência A, Z, A duplicava a carta; a entrada imediata não conferia se a carta estava parada (agora mede o contorno de novo depois da leitura); nota 1 vinda do caminho aproximado contava como idêntica; nome que é começo de outro entrava na primeira; carta aceita parada era lida quadro a quadro; a primeira edição pagava a carga do segundo leitor, que nunca era encerrado; chave repetida no índice ficava com o primeiro nome (agora o mais curto).
- **Medido (02/10/2026):**

  | Medida | Antes (leva 120) | Depois |
  |---|---|---|
  | Tempo de confirmação no navegador de teste (leitor falso: é o custo do próprio app) | 228 ms | **45 a 80 ms** (37 ms antes da conferência de carta parada) |
  | Passadas até aceitar uma leitura exata pelo contorno | 2, com 120 ms entre elas | 1 |
  | Fotos com contorno (27 do portão + 11 reais) que entram na primeira leitura | — | 17 de 36 (23 antes de excluir começo de outro nome e nota 1 não idêntica) |
  | Dessas, aceitas com o nome errado (contra 34 mil nomes) | — | **0** |
  | Consulta de nome exato | 7 ms (percorre a base) | < 0,05 ms |

- **Medido e NÃO adotado:**
  - linha do nome em 600 px (estava no aceite original): o leitor ganha ~10 ms por linha no servidor e a carta de moldura antiga que hoje lê deixa de ler (85% → 79%). Ficou em 800 px;
  - aquecer o leitor com uma leitura em branco ao abrir: o modelo já é carregado na criação do leitor; sem medida no aparelho de que a primeira leitura é mais lenta, não entrou.
- **Já era assim, conferido:** a carta que chega não perde a primeira passada para a régua de movimento (sem contorno na passada anterior, não há deslocamento a medir).
- **Risco declarado:** aceitar na primeira leitura troca uma margem de segurança por velocidade. As salvaguardas são a identidade exata com a base, o mínimo de 5 letras, o contorno e o desfazer de um toque. A medida de erro acima é de 36 fotos; o aparelho é quem confirma. Numa pilha, a primeira leitura pode ser a de uma carta de baixo cujo nome aparece inteiro (isso já acontecia com duas leituras).
- **Expectativas ajustadas com justificativa:** leva 112 (o trecho que alternava dois nomes exatos passou a alternar leituras aproximadas: exata pelo contorno agora entra na primeira); X11 e X3/X5 (a linha de coleção vai para a fila do segundo leitor nos testes); O1.
- **Testes:** U (porteiro: confiável entra na 1ª, sem a marca precisa de duas, aproximada segue com três; não duplica a carta parada; reentra depois de sair e do intervalo; leitura confiável só com nota 1, contorno e 5 letras; consulta direta com o mesmo resultado, carta dividida, troca típica de OCR, custo), fotos (27, sem mudança de acerto), I headless (uma leitura basta e sai marcada "1ª leitura"; edição com 1,5 s de atraso não segura as leituras de nome; confirmação abaixo de 200 ms; a carta parada não entra de novo; leitura pela moldura segue precisando de duas no teste X1/X2/X4).
- **Depende de:** X13.
- **Fora:** leitor mais rápido que o Tesseract; pular a leitura enquanto a carta aceita continua no quadro (numa pilha a carta de cima troca sem o contorno mudar).

**X15 · Melhor quadro e edição em resolução cheia** ○
- **Valor:** a edição acerta mais e a carta pode ficar mais longe.
- **Aceite:** entre os quadros recentes, vai para o leitor o mais nítido; depois do aceite, a linha de coleção é lida de uma foto em resolução cheia do sensor (`takePhoto`) quando o aparelho tem; zoom automático que enquadra a carta pequena; foco reapontado para a linha do nome quando ela sai desfocada.
- **Testes:** U, fotos (edição ≥ 25 de 27), I headless. **Depende de:** X14. **Risco:** `takePhoto` pausa o vídeo em alguns aparelhos; entra com chave e medida.

**X16 · Tela nova do scanner** ○
- **Valor:** a câmera é a tela; o resto aparece quando é preciso.
- **Aceite:** câmera de borda a borda; controles por ícone sobre ela (lanterna, zoom, lente, pausar); estados desenhados (procurando, carta achada, lendo, entrou) com movimento curto; a carta lida "voa" para a pilha; dica só quando há o que corrigir; sem rolagem em 360×780; contraste AA sobre o vídeo; `prefers-reduced-motion` respeitado.
- **Testes:** I e V (capturas 360 e 390, claro e escuro; auditoria de sobreposição; alvos de 44 px). **Depende de:** X13.

**X17 · Pilha e conferência visuais** ○
- **Valor:** conferir o lote olhando para as cartas, não para uma lista.
- **Aceite:** faixa de miniaturas com a arte na base da câmera, a mais recente em destaque; toque abre a carta grande com edição e alternativas; arrastar remove, com desfazer; "confira" resolvido na própria miniatura; guardar o lote em um toque para o último destino.
- **Testes:** U, I, V. **Depende de:** X16.

**X18 · Sessão de catalogação** ○
- **Valor:** catalogar uma caixa inteira com ritmo.
- **Aceite:** contador da sessão e ritmo (cartas por minuto); som e vibração opcionais; tela não apaga durante a sessão; resumo ao fim (quantas, quantas a conferir, tempo); primeira vez com uma tela de instrução.
- **Testes:** U, I. **Depende de:** X17.

### O · Offline de verdade (E42)

Pedido do usuário em 28/09/2026: "tornar o funcionamento de tudo da aplicação mesmo offline (tirando os
acionamentos de APIs externas), tanto o que já foi desenvolvido quanto o que vem adiante". O que já
existia antes deste épico: casca do app pelo service worker (W1), cache de cartas com degradação (D2),
imagens (D3), busca pela base local (D4), base de nomes (C6), leitor OCR guardado (X6) e lista guardada
sob demanda (S64). O que faltava: **garantia** (guardar sem pedir), **um lugar que diga o que funciona**,
**fallback nas telas que ainda batem na rede** e **um portão que prove tudo de uma vez**.

**O1 · O que é seu fica no aparelho** 🟡
- **Valor:** nunca mais "preparar" lista por lista: tudo que você salva já fica pronto para usar sem internet.
- **Aceite:**
  - lista salva (nova, editada ou pronta adicionada) tem os dados de todas as cartas guardados sem prazo
    e a imagem grande aquecida, sozinha, quando há rede;
  - coleção alterada (adicionar, importar, escanear, editar impressão) tem os dados e a miniatura
    guardados sozinha, uma vez por rajada de mudanças;
  - ao abrir o app com rede, o que ainda não está guardado é guardado em silêncio; ao voltar a rede, idem;
  - a tela inicial mostra o que já funciona sem internet (listas prontas, cartas da coleção guardadas,
    base de nomes, leitor do scanner) e um botão **Preparar tudo agora** com progresso e relato honesto
    do que a rede não trouxe;
  - guardar de novo o que já está guardado é barato: não volta à rede nem regrava.
- **Entregue (leva 70):** módulo `src/app/offline.js` (guardião): `guardarLista`, `guardarColecao`,
  `prepararTudo` (base de nomes → leitor → listas → coleção, com progresso), `manter` (silencioso, ao
  abrir e ao voltar a rede) e `status`. Ganchos `decks.onSave` e `collection.onChange` (novos nos
  módulos de dados). `cardRepo.pin` passou a pular o que já está guardado e manda a grafia original à
  rede. Painel **Sem internet** na tela inicial com as quatro linhas de estado, o botão e o aviso quando
  já se está offline.
- **Portão offline (o teste "tudo sem internet"):** prepara com rede, corta a rede
  (`context.setOffline`) e usa listas, mesa com bot amador no motor completo, coleção (exportar e importar
  por lista com conferência pela base de nomes), busca pela base local e scanner — sem erro na tela.
- **Testes:** U (nomes da lista e URLs de imagem; lista salva guardada sozinha com imagem grande; coleção
  guardada uma vez por rajada com miniatura; sem rede nada é tentado e guardar de novo não chama a rede;
  status e relato do preparar, inclusive o que a rede não trouxe e o caso sem rede; preparar em curso
  não roda em paralelo), I headless (o portão offline acima; A12 ajustada: a lista pronta adicionada já
  chega parcialmente guardada — só os básicos, porque a Scryfall falsa do teste não conhece as outras).
- **Depende de:** S64, C6, X6, D2, D3, D4.
- **Fora:** guardar imagem grande da coleção inteira (miniatura basta na lista; a grande vem sob
  demanda); dados que nunca passaram pelo app com rede.

**O2 · Telas sem rede** 🟡
- **Valor:** nenhuma tela quebra ou finge quando a internet cai no meio do uso.
- **Aceite:**
  - o app percebe rede indo e voltando durante o uso (hoje o ambiente é detectado uma vez ao abrir):
    chip discreto "Sem internet" na barra, que leva ao painel;
  - coleção: "Adicionar pelo nome" confere pela base de nomes quando a Scryfall não responde;
  - editor de listas: carta desconhecida sem rede é "não conferida", não "não encontrada";
  - busca de cartas: sem rede vai direto à base local, sem tentar a rede e sem mensagem de erro;
  - scanner: edição pela linha de coleção só com impressões já vistas; a tela diz "edição sem internet";
  - visualizador de carta sem imagem guardada mostra o texto da carta, não um quadrado vazio;
  - toda mensagem de rede tem a mesma voz: o que não deu e o que funciona mesmo assim.
- **Entregue (leva 71):** ambiente **vivo** (`envVivo`): as telas leem o estado da rede na hora, e os
  eventos `online`/`offline` do navegador trocam o ambiente, pintam o chip **Sem internet** na barra (leva
  ao painel) e disparam a manutenção quando a rede volta. Coleção: "Adicionar" confere pela base de nomes
  quando a Scryfall não responde ("Parecido: X" para grafia próxima; aviso claro quando não há base nem
  rede). Lista: sem rede, carta sem dados guardados vira aviso "ainda não conferida (sem internet)" em
  vez de erro "não reconhecida". Busca: sem rede vai direto à base local, sem mensagem de falha — e
  **tudo que passa pelo app entra na base local** (antes só o resultado de busca entrava; carta de lista
  ou coleção não era achável sem rede). Scanner: "Sem internet: a cópia entra sem edição (defina depois,
  na coleção)". Imagem que não carrega vira o nome da carta (cartão) ou "imagem ainda não guardada"
  (visualizador), nunca um ícone quebrado.
- **Correção no portão:** o teste "tudo sem internet" da leva 70 cortava a rede com `setOffline`, mas as
  rotas falsas da Scryfall ainda respondiam — a busca "offline" estava passando pela rede. Agora as rotas
  abortam (`internetdisconnected`) e o portão é estrito; foi isso que revelou a base local vazia.
- **Testes:** U (validação sem rede: aviso, não erro), I headless (portão offline estrito com: chip na
  barra, adicionar pelo nome com acerto, parecido e desconhecido, visualizador sem imagem, lista editada
  sem rede com carta nunca vista, busca local sem mensagem de falha, scanner sem edição; e o chip sumindo
  quando a rede volta).
- **Depende de:** O1.
- **Fora:** fila de ações para sincronizar depois (não há servidor: nada a sincronizar); mensagens das
  telas de rede que já existiam (Scryfall recusou, erro HTTP) seguem como estavam.

**O3 · Conduta offline para o que vem** 🟡
- **Valor:** o que for feito daqui em diante (Coleção, Mesa, Commander) nasce funcionando sem internet.
- **Aceite:**
  - toda história nova declara no Aceite o que faz sem rede e o teste "tudo sem internet" ganha o passo
    correspondente na mesma leva;
  - o painel da tela inicial continua sendo a única fonte da verdade do que está pronto;
  - medição no aparelho: `navigator.storage.estimate()` exibido no painel (uso e cota), para o gatilho G1.
- **Entregue (leva 72):** a conduta está na seção 4 ("Conduta offline"), ao lado da conduta de testes, e
  o item offline do Done passou a exigir o passo no teste "tudo sem internet". Painel da tela inicial
  mostra **espaço usado de cota** e se o armazenamento está protegido; botão **Proteger armazenamento**
  quando o navegador pode apagar; aviso quando o uso passa de 80% da cota (gatilho G1). Novo
  `persistence.estimate()` no contrato de plataforma.
- **Testes:** U (adaptador web com e sem `estimate`, falha do navegador, leitura humana em KB/MB/GB e
  limite de 80%; status do guardião com espaço e proteção, e sem adaptador), I headless (a linha de espaço
  no portão offline).
- **Depende de:** O1, O2.
- **Fora:** —

### V · Visualização

**V1 · Impressões e arte por carta** ✅ (leva 192, 06/10/2026)
- **Valor:** escolher a versão que aparece na lista.
- **Entregue:** na tela da lista, tocar na carta e em **Impressões** abre a grade com as impressões da Scryfall
  (`/cards/search?unique=prints`, da mais recente à mais antiga, só as que têm imagem), cada uma com edição e número.
  Tocar escolhe: a carta passa a aparecer nessa versão **no deck e na reserva**, o visualizador mostra a imagem
  (frente e verso), a edição, a raridade e o preço dela, e a escolha fica **salva na entrada da lista** (`print`),
  vai no backup e tem **Desfazer**. "Padrão" volta à impressão de sempre.
- **Mantém a escolha:** editar a lista pelo texto, somar cópia (L7), mover entre deck e reserva e definir companheiro.
- **Estados:** buscando; erro com "Repetir busca"; carta sem outra impressão com imagem; **sem internet** a busca não
  é tentada, a escolhida continua aparecendo (o guardião offline baixa a pequena e a grande, frente e verso) e dá
  para voltar ao padrão.
- **Limites declarados:** as impressões só são buscadas **com internet** e a lista delas vale enquanto a tela está
  aberta (não fica guardada); teto de **60** impressões, as mais recentes; a escolha vale para a **tela da lista e o
  visualizador** — a **mesa de jogo**, a linha da lista em "Listas", o valor da lista e o texto exportado seguem na
  impressão padrão; o preço mostrado é o **do dia da escolha**; importar texto com "(SET) 123" ainda não escolhe a
  impressão sozinho.
- **Modelo (puro, `decks`):** `impressaoDe`, `opcoesDeImpressao`, `rotuloDaImpressao`, `comImpressao`,
  `herdaImpressoes`, `cartaNaImpressao`, `impressoesDaLista`.
- **Testes:** U `decks.unit` ×2, `offline.unit` ×1; e2e "V1" (busca por impressão, grade, escolha no deck e na
  reserva, guardada, visualizador, voltar, Desfazer, editar sem perder, vazio, erro e nova tentativa, sem internet;
  `auditaTela` em 360 px nos dois temas e com a fonte larga do CI).
- **Depende de:** D5, L1.
- **Fora:** arte escolhida na mesa de jogo e na exportação (candidatas a história própria, junto com a C4).

**V2 · Rulings** ✅ (leva G-219, 08/10/2026)
- **Valor:** tirar dúvida de regra na hora.
- **Entregue:** no visualizador de carta (Cartas, lista, coleção e troca de reserva da série), logo abaixo do texto, a seção **Rulings**:
  - **fechada por padrão** e não busca nada fechada; abrir busca na Scryfall e mostra cada ruling com **data e fonte**
    (Wizards ou Scryfall), da mais antiga para a mais nova, com o texto original em inglês e os custos em símbolos;
  - aberta ou fechada **fica lembrada** no aparelho; fechada, o cabeçalho já diz quantos (se estiverem guardados);
  - **guardados no aparelho** por carta (vale para todas as impressões), com a data: "Da Scryfall · guardados em
    08/10/2026"; depois de 30 dias a próxima abertura com internet busca de novo;
  - **sem internet:** os guardados aparecem (com "a última cópia" se vencidos); sem cópia, aviso de uma linha;
    **falha com internet:** nota de erro e **Repetir busca**; carta sem rulings: "Nenhum ruling publicado".
- **Limites:** cartas sem id da Scryfall (os básicos embutidos, carta só pelo nome) não mostram a seção; o texto dos
  rulings fica em inglês, como a Scryfall publica.
- **Modelo e serviço (`cards`, `__m7`):** `limpaRulings`, `temRulings`, `createRulings` (`busca`, `guardados`,
  `aberto`, `lembraAberto`); cliente `scryfall.rulings(id)` (`/cards/<id>/rulings`); chaves `rulings.<oracle_id>` e
  `cartas.rulings`. O visualizador recebe o serviço por `__m12.usaRulings`.
- **Testes:** U `rulings.unit` ×3 (limpeza e ordem, cliente, cache com prazo, outra impressão, forçar, cópia velha sem
  rede, erro sem cópia, lembrar aberto); e2e "V2" (fechada não busca, abrir, ordem, data e fonte, símbolo, lembrado,
  sem pedir de novo, erro com Repetir, vazio, sem internet com e sem cópia; `auditaTela` nas quatro medidas e nos dois
  temas).
- **Depende de:** D1.
- **Correção (leva G-220):** a seção se redesenha sozinha ao abrir e tirava o foco do diálogo (o portão pegou no E50,
  que passou como instável); agora o foco volta para ela, e todo diálogo abre no topo (o foco inicial não rola a folha).
- **Fora:** tradução dos rulings; rulings dentro da mesa fora do visualizador (a folha de segurar a carta da mesa é outra).

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

**L7 · Edição rápida** ✅ (leva 182, 04/10/2026)
- **Valor:** ajustar a lista sem colar o texto de novo.
- **Entregue:** na tela da lista, o chip **Ajustar** (ao lado de "Marcar as minhas") liga o modo de edição:
  - **cada carta ganha − e +** (dois alvos de 44 px sob a carta); a quantidade muda na hora e fica guardada;
    **−** na última cópia tira a carta, com **Desfazer** no aviso; comandante e companheiro não somam cópia;
  - **Adicionar carta:** campo com **sugestões enquanto se digita** (até seis, da base de nomes guardada no
    aparelho — funciona sem internet), um toque soma uma cópia; nome inteiro + Enter também entra (confere na
    Scryfall ou na base de nomes; grafia errada diz o parecido); o campo limpa e fica com o foco para a próxima;
  - **Deck ou Reserva** para a carta nova (fora do Commander); a escolha vale para as seguintes;
  - **teclado:** com a carta em foco, `+` soma e `−` tira; `/` leva ao campo de adicionar.
- **Mover entre zonas** continua na folha da carta (E51: "1 para a reserva", "Todas para o deck"); não foi
  duplicado nos botões da carta para caberem dois alvos de 44 px na coluna de 104 px.
- **Divergência do aceite original, declarada:** o aceite pedia `/cards/autocomplete` (rede). As sugestões saem da
  base de nomes local (C6), pela conduta offline; ao ligar o modo com internet e sem a base, ela é baixada sozinha.
  Sem base e sem rede, vale só o nome inteiro.
- **Modelo (puro, `decks`):** `ajustaEntrada(entries, nome, zona, delta)`, `sugereNomes(nomes, texto, limite)`;
  a base de nomes ganhou `nomes()`.
- **Testes:** U `decks.unit` ×2; e2e "L7" (− e +, última cópia com Desfazer, sugestão com 44 px, reserva, nome
  inteiro, grafia errada, teclado, foco, recarga; `auditaTela` em 360 px, claro e escuro, com e sem sugestões).
- **Depende de:** L3.
- **Fora:** arrastar carta entre zonas; editar a impressão (V1).

**L8 · Estatísticas** ✅ (leva 190, 05/10/2026)
- **Valor:** entender a lista como no Archidekt.
- **Entregue:** na tela da lista, o bloco **Estatísticas** (abre e fecha; fechado, o cabeçalho já diz terrenos e
  custo médio; aberto ou fechado fica lembrado no aparelho):
  - três **ladrilhos**: cartas, terrenos (número e %), custo médio das mágicas;
  - **Por tipo:** barras de um tom, do maior para o menor (terrenos, criaturas, instantâneas…);
  - **Curva por tipo:** sete colunas (0 a 6+), com as **criaturas em destaque** na base e as outras mágicas em cima,
    legenda, e o toque numa coluna diz os números daquele custo;
  - **Cores: custo e fontes:** para cada cor da lista, duas barras na mesma escala — a fatia dos **símbolos de cor
    nos custos** e a fatia das **cartas que geram essa mana** — com o percentual e a contagem ao lado. Fatias
    parecidas, base equilibrada.
- **Conta:** deck e comandante; **reserva e companheiro ficam fora**. Carta ainda sem dados guardados é contada à
  parte e avisada. Símbolo híbrido conta para as duas cores.
- **Limites declarados:** as fontes de mana são **lidas do tipo e do texto da carta** ("{T}: Add {G}", "any color",
  Forest/Island…), não das regras do motor: carta que gera mana de jeito incomum pode ficar de fora ou contar a mais;
  não há sugestão de corte nem de quantos terrenos usar (escopo negativo).
- **Modelo (puro, `decks`):** `estatisticasDaLista(deck, cards)`, `coresQueGera(card)`.
- **Testes:** U `decks.unit` ×2; e2e "L8" (fechado com resumo, ladrilhos, barras proporcionais, curva com detalhe,
  cores com as duas séries e nome falado, legenda, lembrar aberto; `auditaTela` em 360 px claro, escuro e com a
  fonte larga do CI).
- **Depende de:** L3.
- **Fora:** sugestão de corte (escopo negativo).

**L9 · Versões da lista** ✅ (leva G-218, 08/10/2026)
- **Valor:** comparar a v2 com a v3.
- **Entregue:** na tela da lista, o botão de ação ganha **Versões** (quarta ação, depois de Exportar), que abre a folha:
  - sem versão: estado vazio com **Salvar versão** (único primário);
  - **Salvar versão** guarda a lista como está (v1, v2, v3…) e avisa; igual à última, o botão sai e a frase diz
    "A lista está igual à v3. Mude cartas para salvar outra versão." (não duplica);
  - **De** e **Para** (versões pela data, e Atual): o padrão é a última versão contra a lista atual quando ela mudou,
    senão as duas últimas; a mesma dos dois lados pede outra;
  - a diferença em duas partes, **Entrou** e **Saiu**: sinal e quantidade antes do nome (+4 Brainstorm, −1 Island),
    "16 → 15" quando só a quantidade mudou, selo Reserva, Comandante ou Companheiro; resumo em cópias numa linha.
- **Regras:** a versão é foto de nome, quantidade e zona — **a impressão (V1) não conta**, trocar a arte não é versão
  nova; mover entre deck e reserva é sair de uma zona e entrar na outra; ficam as **30 mais recentes** (a mais antiga
  sai, com aviso), numeração sem reaproveitar número.
- **Onde mora:** dentro da própria lista (`versoes`), então vai e volta no **backup** sem formato novo; o editor e o
  Ajustar preservam as versões. Versão quebrada vinda de backup é ignorada.
- **Modelo (puro, `decks`):** `fotoDaLista`, `versoesDa`, `salvaVersao`, `diffListas`, `rotuloDaVersao`, `VERSOES_MAX`.
  Ícone novo `historico` no `/ds`.
- **Testes:** U `decks.unit` ×3 (foto, não duplica, limite, versão quebrada; diferença por zona com de/para e espelho;
  backup ida e volta e editor que preserva); e2e "L9" (vazio, salvar, igual não duplica, editar e comparar, De/Para,
  espelho, recarga; `auditaTela` nas quatro medidas, nos dois temas e com a fonte larga); J7 passa a esperar quatro ações.
- **Depende de:** L1.
- **Fora:** **restaurar** uma versão (mexe na lista e pede desfazer: história própria se fizer falta), dar nome à
  versão, apagar versão, comparar impressões.

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

### U · Patamar de produto (E43–E49, pedidos em 29/09/2026)


**U7b · Faixa de turno em duas palavras, com balão de detalhes** 🟡 (leva 121, 02/10/2026) — relato do usuário: "Turno de Shark" aparecia cortado.
- **Causa:** a faixa dividia a linha com o placar da série e as três ferramentas e encolhia com reticências; o selo "você responde" empilhado piorava. Em 360 px, faixa + placar + ferramentas não cabem numa linha.
- **Entregue:** a faixa mostra só o ícone de quem joga (a barbatana do design system para o Shark, a inicial para pessoas) e duas palavras: **Turno Shark** / **Seu turno**. Ela abraça o conteúdo e não encolhe. Um toque abre um balão com Série (se houver), Turno, Etapa, Joga e Prioridade (ou "Decide", quando há decisão pendente); fecha no X, no toque fora, no Esc ou tocando a faixa de novo.
- **Pixels (360×780):** a faixa foi de 184 px para 129 px de largura ("Seu turno"); o topo continua com 84 px e o campo começa no mesmo ponto (y = 142): nenhum pixel de campo perdido.
- **Divergência registrada (leva 114):** o placar da série deixou de ficar sempre à vista no topo; virou a primeira linha do balão, a um toque. A tela de fim de partida e a de trocas continuam mostrando o placar.
- **Testes:** `vez.unit` (rótulo, ícone, detalhes, série em qualquer fase); e2e em 320, 360, 384, 390 e 412 px com série ligada: rótulo inteiro, dentro da faixa, ferramentas na mesma linha a partir de 360; as quatro formas de fechar; `auditaTela` com o balão aberto. Expectativas antigas ("Turno de X", selo `#tb-vez-prio`, `#tb-serie` no topo) ajustadas com a justificativa escrita em cada teste.
- **Sem rede:** tudo local.
- **Intermitência corrigida no portão:** como a faixa virou botão, o teste antigo do goldfish passou a medi-la, e no meio da animação de entrada (translateY fracionário) o retângulo dá 43,999996 px. A asserção passou a usar a mesma tolerância da auditoria geral (43,5 px); o alvo real continua 44.

**U1 · Tema em dois estados** ✅ (leva 82)
- **Entregue:** o botão da barra alterna só entre escuro e claro. O estado "automático", que no aparelho do usuário era igual ao escuro, deixou de existir como opção. Na primeira abertura o app segue a preferência do sistema e, a partir do primeiro toque, guarda a escolha.
- **Valor:** um toque, dois estados, sem estado que parece não fazer nada.
- **Aceite:** ícone ☾/☀ com rótulo acessível; a escolha sobrevive à recarga; quem já tinha "automático" guardado passa para o tema que o sistema dava naquele momento; sem rede funciona igual (é só preferência local).
- **Sem rede:** tudo local.
- **Testes:** U (`theme.unit.test.mjs`: alternância, migração do "auto", persistência, primeira abertura pelo sistema); e2e (toque alterna e persiste após recarga; auditoria de tela roda nos dois temas); contrato visual mantido.
- **Correção (leva 83):** o botão nascia sempre com ☾, mesmo no tema claro, até o primeiro toque. Agora nasce com o ícone do tema aplicado; o e2e confere antes e depois de recarregar.
- **Fora:** tema "automático" como opção. Quem quiser seguir o sistema toca uma vez.

**E50 · Polimento de jogo e app** (pedido de 30/09; executado antes de U4/U8/E36)

**P1 · Ícone do app com relevo e X no topo dos diálogos** ✅ (leva 94)
- **Entregue:** o ícone de instalação, o favicon e o ladrilho da barra saem de uma fonte única (`iconeDoApp` em brand.js): ladrilho escuro com brilho no topo, verniz escurecendo embaixo, marca em marfim e latão com sombra; `icon.svg` e `icon-512.png` são gerados por `node gerar-icone.mjs` e um teste garante que o publicado é o que a fonte gera. Na barra, o ladrilho tem o mesmo relevo dos botões e afunda ao toque. Todo diálogo ganhou um cabeçalho fixo com o X (44px, nome "Fechar"): fecha sem rolar até o fim; ao rolar, o cabeçalho ganha sombra; o foco inicial continua no primeiro controle útil, não no X.
- **Sem internet:** nada muda (ícones e SVG dentro do arquivo).
- **Testes:** `icone.unit.test.mjs` (fonte única, zona segura do mascarável, PNG 512); e2e "E50 X no topo".
- **Fora:** o botão "Fechar" do rodapé continua nos diálogos que já tinham; sai quando a parte 3 do U2 passar pelos diálogos.

**P2 · Declaração de bloqueio mais clara e janela do atacante depois dos bloqueios** ✅ (leva 95)
- **Entregue:** depois dos bloqueios, a mesa PARA para quem tem resposta (antes o passo `combat_blockers` era pulado direto para o dano: o atacante nunca podia reforçar ou tirar um bloqueador). A faixa do atacante vira "Bloqueios declarados" com o quadro "Sky Pike ← Wall Guard · Outra: sem bloqueio" e "Sua janela: reforce, remova um bloqueador ou passe para o dano"; o botão diz "Ir ao dano". A defensora recebe a mesma janela ("Bloqueios feitos"). Nas cartas: o atacante bloqueado mostra "← bloqueador", o que passou mostra "livre", o bloqueador mostra "→ quem bloqueia" (antes só "ataca"/"bloqueia").
- **Regra que muda o resultado:** nenhuma regra do motor mudou (a prioridade depois dos bloqueios já era do jogador ativo); mudou onde a mesa para sozinha (`shouldStop`). Goldens intactos.
- **Testes:** `table.unit` (resumoDosBloqueios, marcas); e2e "E50 janela do atacante" (Raio no bloqueador antes do dano; a defensora vê o Raio na pilha).

**P3 · Imagens de fichas** ✅ (leva 95)
- **Entregue:** as fichas que as cartas da lista criam (Clue, Elf Warrior, Goblin, Treasure…) são buscadas na Scryfall como cartas de tipo Token (`!"nome" t:token`, com força/resistência e cor quando é criatura), guardadas para sempre no repositório (chave `ficha:`) e as imagens baixadas junto com as da lista pelo guardião. Na mesa a ficha aparece com a figura e o texto oficial na folha.
- **Sem internet:** ao preparar a partida sem rede, só as fichas já guardadas têm imagem (as outras mostram o nome, como antes); o guardião completa quando a rede volta.
- **Testes:** `fichas.unit.test.mjs` (coleta nos scripts, busca, cache, sem rede, rede quebrada); e2e "E50 fichas têm imagem".
- **Fora:** fichas criadas por cartas sem script (adjudicação manual) continuam sem imagem.

**P4 · Balão expansível na bandeja da mão** ✅ (leva 95)
- **Entregue:** o momento e a dica na barra da bandeja viram um botão (44px) quando não cabem — um chevron indica que há mais — e um toque abre um balão por cima da bandeja com o título e a dica inteiros; X ou toque fora fecham; medido de novo a cada mudança de tamanho.
- **Testes:** e2e "E50 balão da bandeja".

**P5 · Side deck separado do deck titular (listas e mesa)** ✅ (leva 95)
- **Entregue:** as sete listas prontas de Pauper agora têm a reserva sob "Sideboard" (o parser já entendia; a origem não separava). Corte depois do último terreno, onde toda lista de torneio fecha o principal. **Correção (leva 100):** o corte "depois do último terreno" errou em quatro listas (Mono Blue e Rakdos 62/13, Jund 63/12, Walls 64/11): era palpite e não devia ter sido feito. As sete agora são exatamente a lista que o usuário enviou em 22/09 (`.listas/pauper.txt`: as linhas até somar 60 são o principal, o resto é a reserva) — 60/15 em todas; a conversão original somava a mesma carta que aparecia nos dois lados (3+1 Cryoshatter, 1+1 Dispel, 1+2 End the Festivities, 1+2 Pulse of Murasa, 3+1 Krark-Clan Shaman…). A partida carrega só o principal (o grimório do Elves cai de 67 para 52 depois da mão). Listas: selo "+15 reserva" no item; listas prontas: "60 cartas + 15 na reserva"; lista: grupo "Reserva" separado por linha tracejada, esmaecido, com "fora da partida · trocas entre jogos"; preparar partida: "Nome · Pauper · 60 cartas (+15 na reserva)" e a linha "Reserva: 15 carta(s) ficam de fora da partida".
- **Testes:** `decks.unit` (principal ≥ 60, reserva ≤ 15, 75 no total, só o principal na mesa); a auditoria de regras do Pauper continua cobrindo a reserva.
- **Fora:** trocas de reserva entre jogos (melhor de três) — história futura.

**P6 · Pilha mostra a carta de origem e o texto oficial em inglês** ✅ (leva 95)
- **Entregue:** a habilidade na pilha mostra a imagem da carta de onde veio com um selo "habilidade" (antes: cartão escrito "hab."); toque e segurar abrem/espiam a carta de origem. O "o que faz" passa a ser o texto oficial da carta em inglês: a mágica mostra o texto inteiro; a habilidade mostra só a sua linha (gatilho por "When/Whenever/At", ativada pela linha com custo; quando a correspondência não é segura, o texto inteiro). Só sem texto guardado a descrição em português do script entra, e agora sem vazar chaves ("permanent-you-control" → "uma permanente que você controla").
- **Testes:** `table.unit` (linhaOficialDaHabilidade, descreveAlvo, explicaPilha); e2e A14 (painel montado com o estado real).

**P7 · X no topo dos diálogos** ✅ (absorvido em P1)

**E51 · Reserva separada também nas listas já salvas** ✅ (levas 98 e 100, prioridade pedida em 30/09)
- **Correção (leva 100):** as listas que o aparelho guardou com o corte errado da leva 95 (reserva de 11 a 13) são corrigidas ao abrir o app, com marca própria (`decks.reservaVista.v2`), só quando a reserva salva é exatamente a errada e as cartas no total são as da pronta; lista editada não é tocada. Guarda-corpos: teste de unidade exige 60/15 em toda lista pronta de Pauper e compara, zona a zona, com o arquivo original do usuário; e2e grava a lista errada no banco e confere 60/15 depois de abrir.
- **Valor:** as listas prontas que já estavam no aparelho (salvas antes da leva 95 com as 75 no principal) jogam com 60, sem o jogador refazer nada.
- **Entregue:** ao abrir o app, cada lista salva é olhada uma vez: se ela tem exatamente as mesmas cartas de uma lista pronta com reserva (nome e quantidade, somando as zonas; o nome da lista pode ter mudado) e não tem reserva, recebe a reserva separada ("Reserva separada em Pauper Elves"). Lista editada não é tocada: a tela da lista mostra um aviso "76 cartas no deck e nenhuma na reserva" e, se existe lista pronta de mesmo nome, o botão "Separar reserva" move para a reserva as cartas que a pronta tem lá. Em qualquer lista de 60 (não Commander), a folha da carta ganha "Todas para a reserva"/"1 para a reserva" e o caminho de volta ("Todas para o deck"/"1 para o deck"). Restaurar backup também separa. A escolha do jogador vale: se ele juntar a reserva de volta, a próxima abertura não separa outra vez.
- **Sem internet:** tudo local (a comparação usa o texto das listas prontas dentro do app).
- **Testes:** `decks.unit` (migração segura, renomeada, editada, Commander nunca, sugestão, aviso, uma vez só); e2e "E51" (lista gravada no banco como antiga → migra ao abrir; editada → "Separar reserva"; mover 1 cópia e voltar; recarregar não mexe; a mesa carrega 60).
- **Fora:** lista montada à mão sem "Sideboard" e sem lista pronta equivalente: o app avisa, mas quem escolhe as cartas da reserva é o jogador (não há como adivinhar).

**U2 · Ícones flat, botões com profundidade e toque animado, CTAs enxutos** ✅ (levas 92, 93 e 96)
- **Entregue (parte 1, leva 92):** conjunto único de 25 ícones SVG do app (traço 1,75, cor herdada), no catálogo `#/ds` em "Ícones"; os da mesa (mão, passar, subir) passaram a vir dele. Botões ganharam profundidade: brilho no topo, lábio e sombra curta em repouso; ao toque afundam (1px, 97%, sombra interna); com movimento reduzido só a sombra muda; fantasmas ficam planos. Barra: Jogar, Listas e Coleção viraram ícone com legenda de uma palavra, e o destino atual fica marcado (sublinhado + `aria-current`); tema, instalar e "sem internet" também viraram ícones (o ☾/☀ saiu). Início: atalhos em cartões com ícone e uma palavra (Jogar em destaque, largura toda; Listas, Coleção, Escanear e Buscar em duas colunas, cada um com detalhe curto); "Catálogo de componentes" desceu para um botão discreto no rodapé. Painel sem internet: Preparar e Proteger com ícone. Mesa: Desfazer, Registro e Desistir viraram ícones com nome falado e passaram para a mesma linha da faixa de vez (ganha uma linha inteira de mesa); o selo de prioridade usa ampulheta (a bandeira ficou para desistir) e fica embaixo do rótulo; a mão inicial usa o ícone da mão no lugar do ✋.
- **Entregue (parte 2, leva 93):** 20 ícones novos (mais, menos, fechar, editar, lixeira, exportar, importar, copiar, filtro, selecionar, marcar, caixa, planilha, linhas, densa, pilhas, descer…). Listas: "Prontas" e "Nova" com ícone na linha do título; item da lista com seta; backup "Exportar"/"Restaurar" com ícone. Listas prontas: voltar acima do título; "Adicionar" deixou de ser dourado (seis botões dourados competiam). Lista: Editar e Exportar com ícone, Excluir virou lixeira vermelha discreta (confirmação mantida); "Copiar cartas sem script" → "Copiar sem script"; "Marcar o que tenho" → "Marcar as minhas" com ✓ desenhado. Editor: "Já tenho todas" (nome falado completo). Coleção: Buscar vira lupa e Escanear fica na linha do título; contagem não quebra no meio; as quatro ações em grade 2×2 ("Colar lista", "Abrir CSV", "Exportar", "Selecionar"); adicionar carta vira "+"; − e + desenhados; Remover vira lixeira com o nome da carta falado; visões Lista/Galeria/Densa/Pilhas num controle segmentado com ícone que cabe em 360; Filtros ganha selo com o número de filtros ativos (antes "Filtros (3)"); seleção com "Sair da seleção" em ícone.
- **Entregue (parte 3, leva 96):** 7 ícones novos (peixe, tubarão, pessoas, meia, pausa, virar, externo). Busca de cartas: importar/exportar/limpar base, Buscar e Limpar com ícone; cores viram o chip de símbolo do filtro da coleção (U3), com nome falado. Scanner: Ler agora, Lote, Desfazer e Coleção com ícone; −, + e × da pilha desenhados. Preparar partida: oponentes num segmentado com ícone ("Goldfish", "Shark", "A dois"; nome longo no title e no nome falado); "Guardar para jogar sem internet" → "Baixar cartas"; "Parar em todos os passos" → "Parar sempre" (a explicação ficou na nota); Começar/Continuar com ícone; Descartar com lixeira. Lista: marcas de cobertura das cartas e os selos do motor viram ícones (✓ marcar, ◐ meia, ✎ lápis) com nome falado "Motor: completo/parcial/manual". Na folha da carta, "Virar carta" com ícone e "Abrir na Scryfall" → "Scryfall" com ícone de link externo.
- **Fora (declarado):** o botão "Fechar" do rodapé continua nos diálogos que o tinham, ao lado do X do topo (redundante, sem prejuízo); os ✓/· do painel sem internet ficam para a U4, que redesenha esse painel. Texto de botões dentro de diálogos (ações de carta como "Conjurar → alvo") não entra na contagem de palavras: descreve a jogada.
- **Testes (parte 3):** e2e "U2 parte 3" (auditoria em 360 de cartas, scanner, preparar partida e mesa; cores em símbolo; marcas desenhadas; oponentes numa linha); e2e X8 do scanner acha +/× pelo nome falado.
- **Sem internet:** nada muda — ícones são SVG dentro do `index.html`, sem fonte ou arquivo externo.
- **Valor:** a interface se entende pelo símbolo, não pelo texto; cada toque tem confirmação visual.
- **Aceite:** conjunto de ícones SVG inline no catálogo `/ds`, um por conceito (adicionar, remover, buscar, filtrar, exportar, importar, câmera, jogar, desfazer, configurar, offline, tema…); `ds-btn` ganha sombra em repouso, afundamento no toque (`:active`, 120 ms) e estado de foco; CTAs com ícone + rótulo curto (até 2 palavras) ou só ícone com `aria-label`; auditoria automática do texto dos botões (nenhum CTA com mais de 3 palavras fora dos diálogos); tudo pelos tokens `ds-*`.
- **Testes:** contrato visual (tokens, sem cor solta, tap ≥ 44px, ícones com `aria-label`); e2e de auditoria (contagem de palavras nos CTAs em cada tela); capturas nas duas cores.
- **Depende de:** U1.
- **Fora:** ilustrações; animações além do toque e das transições já existentes.

**U3 · Símbolos de Magic em toda a plataforma** ✅ (levas 90 e 91)
- **Entregue (parte 1):** renderizador de símbolos com glifos próprios do app (desenho original, flat: sol, gota, caveira, chama, árvore, losango, setas de virar e desvirar, raio, floco), números e X/Y/Z, híbridos de duas cores, "2 ou cor" e phyrexianos. Aplicado em: toda a mesa (botões de habilidade e de conjurar com custo, linha de custo da folha da carta, pilha, registro), espiada da carta (texto de regras), todo diálogo do app (o visualizador de carta nas listas, na coleção e na busca inclusive) e a reserva de mana, que virou um símbolo por cor com a quantidade ("{U} ×3"). Seção "Símbolos de mana" no catálogo `#/ds` como referência viva.
- **Valor:** {T}, {W}{U}{B}{R}{G}{C}, {X}, {E} e números em símbolo, como na carta.
- **Aceite (como ficou):**
  - analisador puro `analisaSimbolos` (reconhece só símbolos de Magic; `{abc}`, `{100}`, `{W/U/B}` e JSON continuam texto) e aplicador `simbolizar(raiz)`, idempotente, que nunca mexe em campo de texto, `select`, `code` ou `pre`;
  - cada símbolo tem nome falado em português ("1 genérico", "azul", "branco ou azul", "vermelho phyrexiano", "virar");
  - o texto original "{1}{U}" continua no documento, sem ocupar espaço: copiar, buscar e os testes leem exatamente o que liam antes (medido: `innerText` idêntico);
  - números e X/Y/Z vêm de pseudo-elemento CSS, não de `<text>` no SVG (que entraria no texto lido como "1{1}");
  - cores só por tokens (`--mana-*`, `--mana-ink-dark`, `--mana-ink-light`, `--mana-ring`), iguais nos dois temas; alinhamento pelo meio da linha e numeral compensado opticamente;
  - dentro de botão (flex), o trecho vira um `span` inline, para não quebrar o texto em itens separados.
- **Entregue (parte 2, leva 91):** carta sem imagem (sem internet ou ainda não guardada) deixou de ser só o nome: vira uma "carta em texto" com nome, custo em símbolos e tipo — na lista, na galeria da coleção e na busca. Linha e visão densa da coleção mostram o custo ao lado do nome. Filtro de cor: chips redondos só com o símbolo (nome falado "Azul", alvo 44px; desmarcado fica esmaecido, marcado ganha anel). Identidade de cor (listas de Commander) em símbolos com nome falado ("identidade: azul e vermelho"), no lugar das bolinhas lisas.
- **Sem rede:** só apresentação; os glifos são SVG embutido no app (nada de fonte ou imagem externa).
- **Testes:** U (`simbolos.unit.test.mjs`, 5: separação, todos os tipos, o que não é símbolo, nome falado, reentrância); e2e U3 parte 2 (carta em texto com custo e tipo na lista, terreno sem linha de custo vazia, custo na linha e na densa com texto lido intacto, galeria, chip de cor por símbolo com nome falado, 44px, ordem WUBRGC e filtro funcionando, busca); e2e U3 (reserva "{U} ×3" com nome, espiada com {T}, catálogo com 22 símbolos e texto lido idêntico, campo de texto intocado); e2e M7/M6/A6 (botão "Conjurar · {1}{U}" com dois símbolos, nomes falados, texto intacto, símbolo redondo ≥ 14px).
- **Depende de:** —.
- **Fora:** símbolos de expansão; ícones de raridade; símbolo de meio mana ({H}).

**Leva 102 · Cartas nítidas, visor da carta na coleção e mão visível no 1º turno** ✅ (pedido de 30/09)
- **Imagens:** componente único `ImagemCarta` com `srcset` (small 146, normal 488, large 672, png 745 px) e `sizes` pela largura real na tela: o navegador pede o tamanho nítido para a densidade do celular (tela 3×). Cadeia sem rede: a imagem que não estiver guardada cai para a próxima (normal → small → large → png) e só no fim vira a carta em texto. Aplicado na coleção (lista, galeria, pilhas), no visor da carta e no `CardFace`. Mesa: campo e pilha passam a usar a "normal" (a carta de 84 px numa tela 3× precisa de ~250 px; a small tem 146). Guardião: a coleção passa a guardar a "normal" (mais espaço no aparelho: ~60–80 KB por carta em vez de ~10 KB — declarado).
- **Visor da carta na coleção:** um toque na carta (galeria ou miniatura da lista) abre a carta grande (até 380 px, proporção exata, brilho enquanto carrega), com custo em símbolos, tipo, força/resistência, "você tem N" e o texto oficial numa caixa embaixo; X no topo fecha; botão "Impressões" leva à edição e quantidade (antes o toque na galeria abria direto as impressões).
- **Bug corrigido:** quem tinha recolhido a mão numa partida anterior começava o 1º turno sem ver as cartas — a mão inicial abria forçada e, ao manter, voltava a recolher. Agora toda partida sai da mão inicial com a mão aberta; recolher dentro da partida continua valendo.
- **Testes:** e2e "leva 102 mão aberta" (preferência recolhida gravada → 1º turno com a mão à vista; recolher dentro da partida persiste); e2e "leva 102 coleção" (tela 3×: miniatura e galeria não usam a small; visor grande com proporção da carta, texto embaixo, quantidade, X, auditoria de sobreposição, atalho para impressões). Expectativas alteradas com justificativa: U6 (a mão não volta a recolher depois do mulligan), C13 (galeria abre o visor), O1 e offline.unit (coleção guarda e mostra a "normal"; com srcset vale o evento de carga, não a largura natural do PNG de 1 px do teste).

**Leva 104 · Escolhas de quem paga: custo que escolhe outra permanente e custo com X** ✅ (relato do usuário de 30/09)
- **Relato:** a Jaspera Sentinel virava sozinha uma criatura que o jogador não escolheu; a Nyxborn Hydra não deixava escolher o X.
- **Causa (classe, não carta):** o motor oferecia só a primeira forma de pagar os custos com escolha (virar outra, sacrificar outra, descartar, devolver terreno, exilar do cemitério, barganha) e o X ia de 1 a 4 fixos no conjurar normal e nem existia no conceder. Na mesa, as opções saíam com o mesmo rótulo ("Conjurar", "Conjurar", …), sem dizer o X.
- **Entregue:**
  - motor: uma ação por forma de pagar (`pagamentosDe`, até 24 por custo) em habilidades, custos adicionais, lampejo do passado, custos alternativos e barganha; X de 0 até o máximo pagável (teto 20) no conjurar e no conceder; conceder cobra {X}{G}{G} de verdade e a Hydra entra com os X marcadores; X inválido é recusado; a linha do tempo registra "com X = n";
  - mesa: ações que só diferem no pagamento viram um botão só; o toque abre "Qual criatura vira para pagar?" (ou sacrifica, descarta, devolve, exila), com o nome de cada opção; com X, um seletor − / + que só anda no intervalo pagável, mostra o total em símbolos e confirma "Conjurar com X = n"; "Como você paga o custo?" quando há caminhos diferentes (Highway Robbery: descartar, sacrificar terreno ou não pagar).
- **Achados no caminho:** Birchlore Rangers não podia se virar como um dos dois Elfos — ruling de 04/10/2004 ("It can tap itself but is not required to do so."), corrigido; símbolos: o primeiro símbolo de um texto às vezes ficava como texto ("{3}" no total do X), porque o `matchAll` herdava o `lastIndex` da expressão global — corrigido com teste.
- **Guarda-corpo:** auditoria `A19` (todo custo com escolha das listas Pauper oferece mais de uma forma de pagar na mesa farta) e `A20` (toda carta com {X} pergunta o valor em cada forma de conjurar). Com o código anterior as duas falham, citando Grab the Prize, Highway Robbery, Prismatic Strands, Battle Screech, Quirion Ranger, Saruli Caretaker e a Nyxborn Hydra no conceder.
- **Textos oficiais coletados:** `.listas/oficiais.json` com as 138 cartas não básicas das listas Pauper (30/09/2026); 27 marcadas `incerto` (16 sem texto) porque a Scryfall recusou as páginas e a cota de busca da sessão acabou. Jaspera Sentinel e Nyxborn Hydra entraram na base da auditoria (`.listas/cartas.json`).
- **Declarado para a leva 105 (auditoria texto × script):** Highway Robbery está modelada como custo adicional; no texto oficial o descarte ou sacrifício acontece na resolução ("You may discard a card or sacrifice a land. If you do, draw two cards."). Diferença só aparece se a mágica for anulada. Exilar do cemitério por fuga/delve ainda pega as primeiras cartas.
- **Testes:** 6 unidades em `pauper.regras.test.mjs`, 1 em `simbolos.unit.test.mjs`, A19 e A20 na auditoria, e2e "leva 104" (Jaspera com escolha, seletor de X com intervalo, total em símbolos, auditoria de tela). Expectativa alterada com justificativa: S53 (uma oferta por carta descartável, não uma por opção).
- **Motor:** v58 sem mudança de versão — ações antigas continuam válidas (o pagamento escolhido já ia no log) e as partidas-referência não mudaram.
- **Portão:** 567 verdes (505 + 62 e2e).

**Leva 105 · Auditoria texto × script das cartas Pauper — parte 1** ✅ (111 de 138 conferidas)
- **Como:** as 111 cartas com texto oficial confirmado (`.listas/oficiais.json`, 30/09/2026) foram comparadas frase a frase com o script e o motor; resultado em `.listas/auditoria-2026-09-30.json` (111 cartas, 50 com achados). Cada achado corrigido abaixo foi confirmado por um teste que falha no motor anterior.
- **Corrigido (9 testes novos em `pauper.regras.test.mjs`):**
  - 400.7 · carta que muda de zona vira objeto novo: X pago, conceder, provas, face para baixo, lampejo, custo adicional pago, cor escolhida e plot não sobrevivem (Nyxborn Hydra reconjurada com X = 0 entrava com o X antigo; Vitu-Ghazi Inspector disparava sem provas; conceder "grudava");
  - 702.103e · Nyxborn Hydra concedida cuja criatura sai antes de resolver entra como criatura com os X marcadores (antes: cemitério);
  - 702.34a · Ancient Grudge (e todo lampejo) anulada vai para o exílio (antes: cemitério, e podia voltar);
  - 702.35a · insanidade também no descarte como custo e no descarte escolhido: Grab the Prize, ficha de Blood (Voldaren Epicure, Vampire's Kiss) e Duress — o motor do Rakdos Madness;
  - Highway Robbery conjurada do plot oferece descartar ou sacrificar terreno (antes: só "não pagar", e a carta não fazia nada);
  - fichas: aves da Battle Screech brancas (antes incolores: não pagavam o lampejo "vire três criaturas brancas"); Clue, Blood e Map com subtipo; Eldrazi Spawn incolor declarado; guarda-corpo: toda ficha das cartas Pauper declara cor e subtipo;
  - Prismatic Strands e Hallow previnem também o dano "a cada oponente" (End the Festivities);
  - Freed from the Real: as duas habilidades são da aura (quem ativa é o controlador dela, também na criatura do oponente).
- **Motor v59:** regras mudaram (lampejo, insanidade, conceder, 400.7), então partidas salvas no v58 não abrem. Partidas-referência regravadas só pela versão: logs, status e turnos idênticos, conferidos um a um.
- **Portão:** 576 verdes (514 + 62 e2e).

**Leva 106 · Auditoria texto × script — parte 2: as 27 cartas sem texto e os achados de impacto médio** ✅
- **Textos:** as 27 cartas sem fonte confiável vieram do Oracle do Forge (simulador aberto no GitHub), que bateu 6 de 6 com textos já confirmados na Scryfall; entraram em `.listas/oficiais.json` (138/138 com texto e data) e passaram pela mesma comparação (`.listas/auditoria-2026-09-30.json`, 138 cartas).
- **Corrigido (15 testes novos em `pauper.regras.test.mjs`, todos falham no motor anterior):**
  - tempestade (702.40): cópias vão para a pilha por cima da original, cada uma escolhe alvo ("may choose new targets") e resolve mesmo com a original anulada — Weather the Storm e Reaping the Graves; cópias da mesma mágica não pedem ordem;
  - Cryoshatter: "becomes tapped" também ao atacar, ao pagar {T} e ao ser virada como custo;
  - Winding Way: TODAS as cartas do tipo escolhido vão para a mão;
  - Masked Vandal: exilar do cemitério é opcional, o jogador escolhe a carta, o alvo vem antes e recusar não faz nada;
  - Spellstutter Sprite (e toda condição de alvo): conferida de novo na resolução, contando as Fadas de quem conjurou;
  - vínculo com a vida, Armadillo Cloak e Spirit Link valem para dano fora do combate (habilidades e mágicas);
  - Flaring Pain: "Damage can't be prevented" vale também para a proteção;
  - Standard Bearer: a regra vale só ao conjurar/ativar, depois da cor, e basta um alvo ser o porta-estandarte (REB volta a ter alvo);
  - Kor Skyfisher, Rakdos Carnarium e Boros Garrison: devolvem por escolha na resolução, sem alvo (a Skyfisher pode devolver a si mesma);
  - adaptar (Evolution Witness) passa pela pilha;
  - proteção contra a cor derruba auras e solta equipamentos dessa cor (Benevolent Blessing, Mask of Law and Grace);
  - Distant Melody: todos os tipos, do que mais rende para o menos ("Outros tipos" na mesa quando passam de 8);
  - esgueirar-se (Leonardo, Big Brother) é conjurar: pilha, pode ser anulado, conta para tempestade e dispara "quando você conjura".
- **Declarado parcial:** Axebane Guardian gera X de uma cor por toque; "qualquer combinação de cores" não entra (com 5 defensores seriam 126 opções por toque).
- **Expectativas ajustadas com justificativa:** S33 (adaptar na pilha), S34 (cópias de tempestade como itens da pilha), S54 (esgueirar-se passa pela pilha), S30 (Flagbearer nas ações de conjurar/ativar), cenário S8 da Kor Skyfisher (escolha em vez de alvo).
- **Motor v60** (regras mudaram; partidas do v59 não abrem). Partidas-referência regravadas só pela versão: logs, status e turnos idênticos.
- **Portão:** 591 verdes (529 + 62 e2e).

**Leva 107 · Auditoria texto × script — parte 3: achados de impacto baixo** ✅
- **Corrigido (18 testes novos em `pauper.regras.test.mjs` e 1 e2e, todos falham no motor anterior):**
  - Rancor exilado com o gatilho na pilha fica no exílio (400.7);
  - Sentinel's Eyes (fuga) e delve: o jogador escolhe quais cartas do cemitério exila;
  - Abundant Growth e Utopia Sprawl encantam terreno de qualquer jogador;
  - Smash to Smithereens: o dano vai para quem controlava o artefato na hora (608.2h), não para o dono;
  - Aura Gnarlid conta toda Aura pela linha de tipo (com ou sem script) e a criatura concedida;
  - Setessan Training cai quando outro jogador passa a controlar a criatura;
  - Journey to Nowhere: saindo antes do exílio resolver, a criatura fica exilada para sempre; uma Journey nova não devolve criatura antiga;
  - Lunarch Veteran: a face de trás (Luminous Phantom) é branca e Spirit Cleric (Oracle do Forge);
  - Hydroblast e Pyroblast miram qualquer mágica/permanente; a cor é conferida na resolução (Red/Blue Elemental Blast continuam mirando só a cor, como diz o texto);
  - Faerie Miscreant (e todo "se" de gatilho): condição conferida de novo na resolução (603.4); informação de combate passada vale o que foi visto no disparo;
  - ninjutsu é habilidade ativada: pela pilha, e disponível do bloqueio até o fim do combate (esgueirar-se só no passo de bloqueio);
  - Moon-Circuit Hacker: "entrou neste turno" vale a última informação, mesmo fora do campo;
  - Duress: a mão inteira do oponente aparece; as que não servem ficam apagadas e não podem ser escolhidas; as escolhíveis vêm primeiro;
  - Martyr of Sands: o jogador escolhe quantas cartas brancas revela;
  - Drift of Phantasms (transmutar): pela pilha, embaralha mesmo sem achar nada; descartar abre insanidade;
  - Priest of Titania e Timberwatch Elf: metamorfo conta como Elfo; carta virada para baixo não;
  - Lys Alana Huntmaster não dispara com Elfo conjurado virado para baixo (os gatilhos de conjuração veem a mágica como ela foi conjurada);
  - Mirrorshell Crab e toda proteção (ward): cobra também de gatilho que mira, e cada permanente com ward cobra a sua;
  - Negate e Spell Pierce miram mágica concedida (é Aura, não criatura); virada para baixo é mágica de criatura;
  - End the Festivities atinge planeswalker do oponente;
  - Highway Robbery: descartar ou sacrificar um terreno acontece na resolução (anulada, nada foi pago), também conjurada do plot;
  - Refurbished Familiar: "cada oponente descarta" sem alvo.
- **Achado no caminho:** gatilho com alvo escolhido pelo jogador (mais de uma opção) perdia o custo opcional, o "você pode", a condição e o valor — Masked Vandal exilava de graça quando o oponente tinha dois alvos. Corrigido com `marcasDoGatilho`, usado nos dois caminhos.
- **Tela:** faixa de texto do aviso da bandeja com altura mínima de toque (o guarda-corpo pegou 43 px no aviso do Duress). Capturas em 390 claro e 360 escuro.
- **Declarado:** Refurbished Familiar e "cada oponente" contam o oponente da mesa 1 contra 1 (o motor não tem multijogador na interface).
- **Expectativas ajustadas com justificativa:** S18 (ninjutsu pela pilha), S29 (transmutar pela pilha), teste da Highway Robbery da leva 105 reescrito (a escolha agora é na resolução).
- **Motor v61.** Partidas-referência regravadas só pela versão: logs, status e turnos idênticos.
- **Portão:** 609 verdes (546 + 63 e2e).

**Leva 108 · Homologação da auditoria por leitura independente** ✅
- **Como:** três leituras novas das 138 cartas contra o motor v61, feitas sem acesso ao raciocínio das correções e com sondas executando o motor de verdade (`.listas/homologacao-v61.json`). As correções das levas 105–107 se confirmaram; sobraram 11 divergências, todas corrigidas com teste que falha no motor anterior:
  - Benevolent Blessing: a correção da leva 106 (proteção derruba anexos) passava por cima de "This effect doesn't remove Auras and Equipment you control that are already attached to it" — agora os seus anexos ficam;
  - Secret Door: aventurar-se não oferece a Cidade Baixa (ruling da Scryfall: só por instrução, como a iniciativa); `venture` ganhou `into` para essa instrução;
  - busca sem achar nada embaralha (Sheltering Landscape, Perilous Landscape, Roost Seek da Sagu Wildling, Squadron Hawk, Shield-Wall Sentinel);
  - Cryoshatter não mira (não cobra ward) e destrói a criatura que disparou mesmo se a aura sair antes;
  - conjurar pela insanidade (Fiery Temper, Dark Withering, Alms of the Vein, Kitchen Imp) conta para tempestade, dispara "quando você conjura", respeita o Standard Bearer e cobra ward;
  - Duress revela a mão mesmo sem carta que sirva;
  - alvos "criatura" em campo usam o que a permanente É (Brinebarrow Intruder não mira mágica concedida; virada para baixo é criatura);
  - Malevolent Rumble revela as quatro cartas na linha do tempo;
  - vínculo de alma (Galvanic Alchemist) vai para a pilha;
  - Birchlore Rangers virada para baixo não conta como Elfo num custo.
- **Declarado, sem mudança:** Terminate "can't be regenerated" não faz diferença (o motor não tem regeneração); Distant Melody lista os tipos de criatura em campo (a escolha que rende é sempre uma delas).
- **Expectativas ajustadas com justificativa:** S57/S59/S61 (a Cidade Baixa entra pela instrução, não pela escolha), S39/S51 e cenário S8 da Galvanic Alchemist (vínculo pela pilha).
- **Motor v62.** Partidas-referência regravadas só pela versão: logs, status e turnos idênticos.
- **Portão:** 618 verdes (555 + 63 e2e).

**Leva 109 · Scanner automático de verdade** ✅ (relato do usuário de 30/09: "muito ruim e nada funcional")
- **Causas encontradas (lendo o scanner inteiro):** (1) o automático começava desligado; (2) a leitura só disparava
  quando o detector de retângulo achava a carta inteira, parada por três quadros e com as quatro bordas em degrau —
  carta na mão, com sleeve, sombra ou mesa escura: nada acontecia; e o "plano B" por relógio lia uma região de largura
  zero (a moldura escondida); (3) cada leitura aceita ficava travada esperando a segunda leitura (edição) e a Scryfall;
  (4) o "leu" animava a moldura, que está escondida; (5) sem diagnóstico, impossível saber o que o aparelho lia.
- **Entregue:**
  - automático ligado sozinho assim que câmera, base de nomes e leitor ficam prontos; o chip vira "Pausado/Automático"; "Ler agora" continua como reserva e espera a leitura em curso;
  - laço contínuo (uma leitura atrás da outra, respiro de 120 ms), uma captura por passada: carta achada → faixa do nome; carta não achada → **plano B**: o quadro inteiro (até 960 px) em texto esparso (PSM 11), cada linha casada com a base de nomes (`matchLines`), no máximo a cada 0,9 s;
  - aceite por **votos** (`criaVotacao`): leitura exata (≥ 97%) entra na hora; aproximada (≥ 82%) precisa de duas seguidas com o mesmo nome; quadro sem nome zera. Não exige mais carta parada (o detector segue dando contorno e dicas);
  - a carta entra na pilha no instante do aceite (vibração, flash no palco, "+1"); edição (linha de coleção do mesmo quadro) e miniatura chegam depois, em segundo plano (`lot.enrich`), sem travar a próxima leitura; o resultado mostra "Conferindo a edição…" enquanto isso;
  - um só motor de OCR, com fila: laço e edição não se atropelam;
  - painel **Diagnóstico** (chip): as últimas leituras com caminho (carta/quadro), tempo, texto lido, palpite e decisão, e **Copiar** (aparelho, resolução da câmera, base, leitor) — é o que o usuário manda quando algo não lê.
- **Correções:** região de leitura com a moldura escondida (largura zero); pulso no palco; "Ler agora" não fica desabilitado enquanto o laço lê; dock em duas linhas (quatro chips não cabiam em 360 px, o guarda-corpo pegou).
- **Testes:** U (casamento por linha, votos, `enrich` sem perder quantidade/confiança e fundindo edição igual, diário), e2e "leva 109" (liga sozinho, plano B no quadro cinza, aproximada só com duas seguidas, edição depois, diagnóstico copiado). Expectativas alteradas com justificativa: X7, X9, X1/X2/X4, X3/X5 e O1 (o automático começa ligado; leituras manuais pausam antes).
- **Limite declarado:** não testado em aparelho real nesta leva. O que falta ajustar sai do diagnóstico copiado do celular (tempo por leitura, texto que o OCR devolve, caminho carta/quadro).
- **Portão:** 623 verdes (559 + 64 e2e).

**Leva 129 · U13 fase 2 · Conta Google e backup na nuvem, atrás do Client ID** ✅ (03/10/2026; trilha geral)
- **Valor:** entrar com a conta Google, trazer nome e foto para a mesa e guardar o backup completo na pasta privada
  do app no Google Drive — sem servidor próprio. Tudo pronto e testado; liga quando o Client ID for colado.
- **Como liga:** constante `GOOGLE_CLIENT_ID` no app (comentário diz o quê e onde). Vazia, a seção "Conta Google"
  aparece com o motivo e o botão apagado; o backup por arquivo segue sendo o caminho.
- **Desenho (seção na tela Perfil, entre o perfil e o backup):** sem conta — uma frase e **Entrar**; conectada —
  avatar da conta, nome e e-mail numa linha, **Usar na mesa** (nome e foto da conta viram o perfil, com a foto
  recortada e reduzida como a da galeria), "Backup na nuvem · último envio: dd/mm hh:mm", **Enviar**, **Baixar**
  e **Sair** (fantasma). Nenhum primário novo: Salvar continua o único. Erros viram frase: sem internet, recusado,
  sessão expirada, Google não carregou, API.
- **Modelo (`src/data/conta.js`, `__m29`):** Google Identity Services (token de acesso só na memória, nunca no
  store; pedido silencioso quando expira), escopos `drive.appdata openid email profile` (nunca o Drive inteiro),
  `userinfo` para nome/e-mail/foto, Drive v3 em `appDataFolder` (procura o arquivo, cria com `POST multipart` ou
  substitui com `PATCH`; baixa com `alt=media`). `google` e `fetch` injetáveis; em testes `window.__GOOGLE_CLIENT_ID`
  e `window.__GOOGLE_FALSO`. `backup.texto()` e `backup.restaurar(texto)` compartilhados com o arquivo.
- **Offline declarado:** entrar, enviar e baixar precisam de internet por natureza e dizem isso; o resto do perfil
  continua local.
- **Testes:** U (`conta.unit.test.mjs`, 5: sem ID tudo recusa com motivo; entrar guarda nome/e-mail/foto e não
  guarda token; recusa e falta de rede; criar → substituir → baixar e reuso do token, pedido silencioso ao
  expirar; 401 derruba o token); e2e "Leva 129" (sem ID: apagado e explicado; com ID falso: entra, um primário só,
  usar na mesa com foto 192 px e barra atualizada, enviar cria e depois substitui, aparelho limpo + baixar traz
  lista e perfil, sair revoga e mantém o perfil local, sem internet explica; `auditaTela` nos dois temas).
- **Capturas:** perfil sem ID e conectado (escuro).
- **Fora:** backup automático na nuvem (agendado); conta em vários aparelhos ao mesmo tempo com fusão; avatar da
  conta nas mensagens (U15).
- **Portão:** pelo `npm run publicar` (número na mensagem de publicação).

**Leva 128 · U13 fase 1 · Perfil local** ✅ (02/10/2026; trilha "tudo que não é bot")
- **Valor:** seu nome e sua foto na mesa e no jogo a dois, e um backup que leva tudo (listas, coleção, perfil e
  preferências) — sem conta, sem servidor. A conta Google (fase 2) entra por cima deste modelo.
- **Desenho:** círculo de 36 px (toque de 44) ao lado do logo na barra, nos 66 px livres medidos em 360 — foto,
  inicial ou o ícone de pessoa apagado; toque abre `#/perfil` e o círculo marca a tela atual. Tela Perfil: avatar
  de 96 px, "Escolher/Trocar foto" e "Remover foto" (ícones, fantasma), campo Nome (até 24), **Salvar** (único
  primário, só liga quando algo mudou), linha "Na mesa: <nome>"; abaixo, Backup completo com Exportar e Restaurar.
  A foto da galeria é recortada no quadrado central e reduzida a 192 px (JPEG ~8 KB) antes de guardar.
- **Mesa:** o assento "Você" passa a ter o nome do perfil (contador de vida, registro); no jogo a dois o campo
  "Seu nome" já vem preenchido; a foto entra no círculo da faixa de vez quando o turno é seu.
- **Backup v3:** `decks.exportAll(collection, { perfil, prefs })` e `importAll` devolve os extras; o serviço
  `backup` do app aplica perfil e preferências (tema, mão recolhida, visões e preferências da coleção, reserva à
  vista) e reaplica o tema na hora. O v2 continua abrindo. A tela Listas passa a usar o mesmo backup completo.
- **Módulos:** `src/data/perfil.js` (`__m28`: `createPerfil`, `limpaNome`, `inicialDe`, `avatarValido`,
  `quadradoCentral`, `PREFERENCIAS`); `Avatar` em `__m3`; ícones novos `pessoa` e `camera`; evento
  `estante:perfil` atualiza a barra sem recarregar.
- **Estados:** vazio (ícone de pessoa, "Sem nome, a mesa diz 'Você'"), erro de leitura do store (nota negativa),
  imagem ilegível (aviso), backup inválido (aviso). Tudo offline.
- **Testes:** U (`perfil.unit.test.mjs`, 5: nome/inicial/avatar válido, recorte, guardar e remover sem lançar,
  preferências, backup v3 e v2); e2e "Leva 128" (barra vazia → foto → inicial, alvo de 44 px sem encostar em
  "Jogar", um primário, foto 192×192, persistência após recarga, hot-seat preenchido, nome no contador de vida,
  foto na faixa de vez, exportar → apagar o banco → restaurar traz perfil, tema e lista; Listas exporta v3;
  `auditaTela` em perfil nos dois temas e nas quatro medidas e na mesa com perfil).
- **Fora:** conta Google e backup no Drive (fase 2, leva seguinte); avatar nas mensagens (U15); recorte manual.
- **Portão:** rodado pelo `npm run publicar` (Q12) sobre a árvore somada às levas 123 e 124 das outras trilhas; número final na mensagem do commit de publicação. Antes dele, `npm test` local: 724 de 725, com a única falha (rolagem lateral em 320 px pelo avatar na barra) corrigida e os três e2e afetados reconferidos.

**Leva 123 · U16 · Dívidas do design system pagas, com guarda-corpos** ✅ (02/10/2026; trilha "tudo que não é bot",
conversa paralela à do Shark e à da revisão carta a carta)
- **Medido antes de mexer:** 5 tokens usados e nunca definidos (`--font-body`, `--surface`, `--surface-2`, `--line`,
  `--muted`: a regra inteira sumia — pilha do scanner sem fundo e sem borda, visor da carta sem fundo); `Badge`
  com tom `warning` sem CSS; `Note(x, { tone })` gerava classe `ds-note--[object Object]` (erro da coleção e aviso da
  mesa sem cor); 5 regras `:hover` fora de `@media (hover: hover)` (no celular o hover gruda depois do toque);
  `.ds-btn--icon`/`--icone` em duas regras; diálogo sem armadilha de foco e sem devolver o foco; carta da lista
  era `<div>` (sem foco, sem teclado); `safe-area-inset` só na bandeja; sem aviso depois do deploy (o app servido
  pelo worker antigo até a próxima abertura, sem dizer nada); imagem da mesa por `src` simples (84 px numa tela 3×
  pedia a `normal`, mas sem `srcset` o navegador não escolhe); `navigator.vibrate` chamado direto em 4 lugares;
  **a bandeja da mesa parava no meio da tela quando o campo era curto (começo da partida) e o aviso flutuante caía
  por cima da mão; no scanner e nas trocas o aviso cobria os botões de baixo.**
- **Entregue:**
  - tokens corrigidos para os do design system (`--font-ui`, `--bg-elev-1/2`, `--border`, `--fg-muted`);
  - `Note` e `Badge` aceitam o tom em texto ou objeto; `danger` é apelido de `negative`; `.ds-badge--warning`
    criado; `--warning` do tema claro escurecido (#8a6410 → #7a580d) para passar AA sobre o fundo (3,9 → 4,8);
  - hover só com mouse; uma regra para o botão de ícone; `.tb-peek` na camada `--z-modal` em vez de `60`;
  - diálogo: Tab e Shift+Tab circulam dentro, Esc fecha, o foco volta para quem abriu; a carta da lista virou
    `<button>` (`CardFace(…, { botao: true })`) e abre pelo teclado;
  - áreas seguras no topo da barra, no diálogo e no aviso;
  - **aviso de nova versão**: o registro do worker observa `updatefound`; quando o worker novo termina de instalar
    com a página ainda servida pelo antigo, aparece "Nova versão pronta · Atualizar" (ícone novo `atualizar`),
    que fica até ser tocado e só recarrega no toque — nunca no meio de uma partida; `toast(msg, 0, { acao })`;
  - mesa: `TableCard` leva `srcset` + `sizes` (60/110/92 px por tamanho) quando a carta tem o objeto de imagens;
    se o CDN falha, cai no `src` simples (caminho que já existia);
  - vibração pela camada de plataforma: `haptics.vibrate(ms)` no contrato F2, instância padrão `__m0.haptics`;
  - **`reservaDoca(el)`** em `__m3`: toda doca inferior (bandeja da mesa, botões do scanner, rodapé das trocas)
    reserva a própria altura em `--doca-h`; o aviso sobe acima dela e a reserva some ao sair da tela;
  - mesa com `min-height` da tela e bandeja colada embaixo também com o campo curto (`.tb:has(.tb-dock)`).
- **Guarda-corpos novos (contrato visual, 7):** todo `var(--x)` do CSS existe (definido no CSS ou atribuído pelo
  JS); `:hover` só dentro de `@media (hover: hover)`; `z-index` literal só ≤ 5 (ordem local), camada é token;
  áreas seguras na barra, diálogo, aviso e bandeja; todo tom pedido a `Badge`/`Note` no código tem CSS; botão de
  ícone com uma regra e aviso só com tokens; `--warning` AA sobre fundo e superfície nos dois temas.
- **Testes:** U (`ds.unit.test.mjs`, 3: contrato de vibração sem lançar; aviso de versão uma vez só, silencioso na
  primeira instalação e imediato com worker já esperando; tons de Note/Badge); e2e "Leva 119" (foco preso e
  devolvido com 12 Tabs e 4 Shift+Tabs; aviso com ação de 44 px acima da bandeja, texto numa linha, bandeja
  colada embaixo; carta da mão com `srcset` quando o CDN responde e queda para o `src` quando falha; aviso acima
  da doca do scanner; reserva zerada fora da tela; `auditaTela` na mesa com aviso). `_load.mjs` expõe `pwa: __m11`.
- **Capturas:** mesa 360×780 escuro e claro antes/depois (antes: aviso sobre as cartas da mão, bandeja no meio da
  tela; depois: bandeja embaixo, aviso acima). Scanner antes/depois (antes: aviso sobre "Digitar").
- **Fora (dívidas que ficam medidas, sem guarda-corpo de contagem):** 14 `font-size` e 8 durações em literal nos
  componentes; sem aviso de atualização quando o worker é bloqueado (file://, origem insegura).
- **Portão:** 719 verdes (`npm test` completo sobre a árvore rebaseada com as levas 119 a 122 das outras trilhas: unidade, fuzz, golden, torneio, fotos e 74 e2e), motor v64 sem mudança. O e2e pegou um parêntese meu errado no rodapé das trocas (leva 114) antes de publicar.

**Leva 127 · X14 resposta imediata** 🟡 (épico E52, segundo passo)
- **Entregue:** leitura idêntica a um nome da base, pelo contorno, com a carta parada, com 5 letras ou mais e que não seja começo de outro nome, entra na primeira passada; nome aceito há menos de 2,5 s não entra de novo; carta já aceita parada faz o laço descansar; com carta no quadro a passada seguinte sai no próximo quadro do vídeo; nome exato por consulta direta; a edição é lida por um segundo leitor e não segura o nome da carta seguinte.
- **Medido:** confirmação no navegador de teste de 228 ms para 45 a 80 ms; 17 de 36 fotos entram na primeira leitura, nenhuma com o nome errado contra 34 mil nomes. Linha em 600 px medida e não adotada (perde a moldura antiga por ~10 ms). História **X14**.
- **Limite declarado:** não testado em aparelho real; a meta de 600 ms até aceitar só se confere com o diagnóstico do celular.
- **Portão:** `npm test` 725 de 725 verdes (02/10/2026, sobre a árvore com a leva 123 · U16 da outra trilha; rodado de novo por `npm run publicar` depois de receber a leva 124 · Q12), incluindo o e2e novo da X14 e os 71 testes de unidade do scanner. O e2e "goldfish: mão, terreno…" (mesa, fora desta leva) estourou o tempo esperando `#tb-pass` depois de recarregar em 2 de 5 rodadas completas; passa sempre isolado (7 de 7, inclusive com a CPU ocupada) — instável sob carga, causa não achada, não corrigido aqui. O teste passou a dizer em que tela a página voltou quando falha.

**Leva 120 · X13 câmera no máximo e cronômetro de leitura** 🟡 (pedido de 02/10/2026; primeiro passo do épico E52 "Scanner de referência")
- **Plano do épico:** três frentes na ordem pedida — imagem (X13, X15), velocidade (X14, X15), experiência (X16 a X18) — com orçamentos medidos. Seção "X · Scanner de referência (E52)".
- **Medido antes de planejar:** uma passada custa ~75 ms no servidor (detector 7, preparo 12, OCR 46, casamento 7 a 17). O tempo até aceitar é dominado pela regra das duas leituras e pelo respiro de 120 ms, não pelo OCR; modelo e largura da linha mudam pouco.
- **Entregue:** a câmera sobe até a maior resolução (teto 4K) que entrega sem arrastar; foco no ponto tocado; lanterna, zoom e troca de lente quando o aparelho tem, com zoom e lente lembrados; diagnóstico com tempo por etapa e tempo até aceitar. Detalhes e limites: história **X13**.
- **Erro meu, pego pela revisão independente antes de publicar:** a primeira versão não subia a resolução no Chrome e dizia que tinha subido (pedido de formato misturado com pedido de foco é ignorado). Corrigido e coberto por teste com câmera falsa que se comporta como o Chrome.
- **Limite declarado:** não testado em aparelho real.
- **Portão:** 694 verdes (620 + 74 e2e), rodado depois de integrar com a leva 119 (Shark). Motor v64 inalterado.

**Leva 116 · Scanner por contorno e linha do nome** 🟡 (pedido de 01/10/2026: "não está reconhecendo nenhuma carta")
- **Medido antes de mexer:** o caminho publicado acertava 3 de 11 fotos reais de celular, só com a carta alinhada à mão na moldura. Causas, correção, medida depois e limites: história **X11**.
- **Entregue:** contorno da carta por quatro cantos (inclinação e perspectiva), carta retificada, linha do nome achada e binarizada, linha de coleção pelo mesmo caminho, lixo no começo do nome tolerado, câmera sem canvas novo por leitura (1440p), contorno desenhado sobre a carta, dicas coerentes com o que foi achado. Fotos reais: 3 → 7 de 11. Portão (27 fotos): nome 20 → 27, edição 16 → 22.
- **Erro meu registrado:** as levas 109 e 112 foram entregues como "pronto" com o portão medindo só fotos sintéticas de carta desenhada sem borda preta, sem arte e sem cena. O conjunto passava em 12/12 enquanto o app falhava na carta de verdade. O conjunto agora tem 15 fotos com desenho de carta real e cena de uso, em que o caminho antigo fica em 74%.
- **Limite declarado:** não testado em aparelho real nesta leva. Moldura antiga (até 2003) fica para a X12.
- **Portão do GitHub Actions vermelho desde a O2 (28/09), em cerca de 50 commits seguidos, com o portão local verde.** Achado ao publicar esta leva. Causa reproduzida: os dados de teste apontam imagens para `cards.scryfall.io/.../x/…`, que não existem; no ambiente de desenvolvimento o host é inalcançável (erro de rede, que o teste ignora), e no CI a internet responde 404, que o console acusa e o teste conta como erro do app. Correção: o contexto do navegador de teste deixa o CDN de imagens fora do ar nos dois ambientes, salvo quando o teste o simula. Conferido rodando os 73 testes headless com o CDN respondendo 404. **Nenhuma entrega desde a O2 teve o ✓ do CI, e isso não foi relatado: erro de processo meu.** A partir daqui a entrega confere o resultado do CI, não só o portão local.
- **Portão:** 672 verdes (599 + 73 e2e), rodado depois de integrar com a leva 115 (Shark v3), que entrou na `main` durante esta leva. Motor inalterado (v64), partidas-referência idênticas.

**Leva 115 · Shark v3: mulligan e decisões medidas em torneio** ✅ (pedido de 01/10/2026: "jogar como profissional, saber fazer mulligan")
- **Medida (01/10/2026), v3 contra o v2 congelado (`shark-v2`), assentos e lados trocados, sem ação ilegal:**
  - listas Pauper de verdade (as sete do app, todos os confrontos): **65%** em 221 partidas decididas de 224 (`node torneio.listas.mjs shark shark-v2 4 20000`);
  - decks de teste do portão: 57% em 160 partidas; no portão ficam 60 partidas de semente fixa (60%, piso 52%).
  - Por peça, nas listas de verdade: sem a simulação das escolhas o v3 ficava em 57%; a simulação das escolhas levou a 65%. Nos decks de teste, mulligan, corrida e formações de ataque sozinhos ficaram dentro do ruído (48–49% contra 48% do espelho); a nota sem bônus temporário com o combate projetado deu +8 pontos.
- **O que mudou no jeito de jogar:**
  - **mulligan (London):** mão sem terreno, com um só (em 6 ou 7 cartas), só de terreno, com seis ou mais, ou de 7 cartas com 2 ou 5 terrenos e nada barato não fica; a cada mulligan ele escolhe o fundo (terreno acima do ideal primeiro, depois a mágica mais cara); no terceiro mulligan fica com o que vier. O motivo vai para o registro.
  - **cartas com escolha** (Winding Way, Lead the Stampede, modos, "pague ou não"): a simulação faz as escolhas até o fim antes de dar a nota. Antes a nota saía com a mágica parada no meio, e o bot nunca conjurava essas cartas (ficavam a partida inteira na mão) ou encerrava a escolha sem pegar nada.
  - **truque de combate:** bônus "até o fim do turno" não conta na nota parada; jogada feita no meio do combate é medida depois do dano.
  - **mana que ia sobrar:** na segunda fase principal ele conjura o que não piora a posição (compra que troca carta por carta); instantâneas ficam para o turno do oponente.
  - **corrida:** não ataca deixando o contra-ataque que mata; mais formações de ataque (só evasivos, todos menos um, pares).
- **Declarado:**
  - "sempre a melhor decisão" não é garantido: é um jogador de uma jogada à frente (mais a resposta do oponente e o combate), com orçamento de 400 ms por decisão. Não planeja vários turnos, não blefa, não joga em volta de anulação.
  - O Shark não troca cartas com a reserva na melhor de 3.
  - Achado, não corrigido nesta leva: ao simular a resposta do oponente, o bot usa as ações legais dele, que dependem da mão dele; o cabeçalho do módulo diz que ele não vê a mão. Corrigir muda a força do bot e pede torneio próprio (próximo item do épico B).
  - O mulligan não olha cor (terreno que não paga a mágica conta como terreno).
- **Testes:** U mulligan (10 mãos, fundo, terceiro mulligan, ação legal, v2 mantém), corrida, bônus temporário, mana que ia sobrar (v3 conjura, v2 passava, na primeira principal espera), Winding Way (v3 conjura e pega as cartas; v2 deixava na mão); mesa: o Shark faz mulligan sozinho e explica no registro; torneio v3 × v2 (60 partidas) e quatro partidas com listas de verdade sem ação ilegal. O teste U11 passou a medir `shark-v2` × `shark-v1`.
- **Novo no repositório:** `torneio.listas.mjs` (torneio com as listas Pauper, fora do portão; aceita ligar as peças do v3 uma a uma).
- **Portão:** 658 verdes (587 + 71 e2e); o arquivo de torneio leva ~5 min. Motor v64 inalterado.
**Leva 114 · Melhor de 3 com trocas da reserva** ✅ (pedido de 01/10/2026)
- **Regras seguidas** (Comprehensive Rules 100.2a e 100.4a, regras de torneio 3.15; conferidas em 01/10/2026): deck construído com no mínimo 60 cartas e reserva com no máximo 15 depois das trocas; as trocas não precisam ser uma por uma; a lista volta ao original numa série nova; quem perdeu a partida anterior escolhe quem começa. Formato livre: mínimo = o menor entre 60 e o tamanho original do deck.
- **Preparar partida:** "Partida única" (padrão) ou "Melhor de 3".
- **Na mesa:** placar da série no topo ("J2 0–1"); ao fim da partida, "Próxima partida"; a série fecha em duas vitórias (ou, com empates, em três partidas: leva quem tem mais vitórias, ou empate). Recarregar a página não conta a partida duas vezes.
- **Tela de trocas (`#/serie`):** deck em cima, reserva embaixo, cartas com imagem e quantidade; um toque passa uma cópia para o outro lado, com animação; segurar abre a carta inteira; a barra fixa mostra Deck e Reserva contra os limites, em verde ou aviso; "Entram / Saem" resume as trocas; "voltar à lista original" desfaz tudo; o botão de começar fica desligado enquanto os limites não valem, com o motivo escrito. Comandante e companheiro não entram em troca.
- **A dois:** cada jogador troca na sua vez, depois de "Sou [nome]"; um não vê as trocas do outro.
- **Quem começa:** quem perdeu escolhe (padrão: ele mesmo); se foi o Shark, ele começa. `setup.first` no motor; o sorteio continua sendo consumido, então a mesma semente embaralha igual.
- **A lista salva não muda:** as trocas valem só dentro da série.
- **Declarado:** o Shark não troca cartas com a reserva (joga as três com a lista principal). Commander não tem reserva: a série pula as trocas.
- **Testes:** U série (2 vitórias, registro único, empates, partida única), troca (uma cópia por toque, sem mutar, limites, 61+14 vale, diff, formato livre), quem começa (semente igual); e2e "leva 114" (placar, recarregar, limites e motivo, diff, marca da carta que entrou, voltar ao original, deck trocado na partida 2, série 2–0, lista intacta) e "a dois" (entrega do aparelho, trocas secretas, escolha de quem começa).
- **Motor v64 inalterado** (partidas-referência idênticas, sem regravar).
- **Portão:** 649 verdes (578 + 71 e2e).

**Leva 113 · Modo único, cores do deck principal e coleção reordenada** ✅ (pedido de 01/10/2026)
- **Jogar tem um modo só: o motor completo.** Saíram "Mesa assistida / Motor completo" e "Cobrar mana". Lista que o motor não resolve 100% não joga: o botão fica desligado e o aviso diz quantas e quais cartas faltam. Vale também para a lista do oponente (Shark ou a dois). O filtro de listas passou a se chamar "Formato".
- **Consequência declarada:** as duas listas prontas de Commander (e qualquer lista com carta parcial ou manual) deixam de jogar até o motor cobri-las; as sete de Pauper estão em 100%. É o caminho da E36 · S67+.
- **Mesa assistida:** continua no motor (ADR-04 não muda) e nos testes de mesa, que montam o estado à mão; só aparece com `window.__MESA_DEV`, que o app publicado não liga. Partida assistida já salva continua abrindo.
- **Cores na escolha de lista:** só o deck principal conta (a reserva nunca entrou; teste novo com vermelho só na reserva). Carta de dupla face conta a cor da frente (antes: as duas faces).
- **Coleção:** painel primeiro; depois filtro, visões (lista, galeria, densa, pilhas) e a lista; adicionar carta (com colar lista, CSV, exportar, selecionar) e o aviso de backup no fim. Atalho "+" no topo leva ao campo de adicionar.
- **Testes:** e2e "leva 113 modo único" (sem controles de modo, bloqueio com o nome da carta, bloqueio pela lista do oponente, cor da reserva fora, mesa sem ajuste manual) e "leva 113 coleção" (ordem na página, atalho). Os e2e de mesa existentes rodam com `__MESA_DEV`.
- **Portão:** 644 verdes (575 + 69 e2e). Motor v64.

**Leva 112 · Scanner de alto padrão** ✅ (pedido de 01/10/2026: leitura errada com a carta mal posicionada, câmera embaçada, às vezes não registra, às vezes registra duas vezes, tela que rola)
- **Referências (01/10/2026):** ManaBox (guia oficial do scanner), Delver Lens, TCGplayer e o comparativo da Scrytics; boas práticas da TCG Stacked. O que todos fazem e entrou aqui: leitura só dentro da moldura, câmera ocupando a tela, confirmação visível com o nome, a mesma carta parada não soma de novo ("toque na tela para somar outra", como no ManaBox), foco por toque, revisão da pilha antes de salvar.
- **Câmera:** pede a maior resolução que o aparelho der (4K → 1440p → 1080p) e foco, exposição e balanço de branco contínuos quando a câmera suporta; tocar na câmera sem carta lida pede foco. O diagnóstico mostra a resolução, o fps e o modo de foco reais.
- **Porteiro (nunca registrar errado):** leitura exata precisa de 2 leituras seguidas iguais; aproximada, de 3; dois candidatos colados (diferença < 6 pontos) nunca entram; nome que alterna entre quadros nunca soma; a mesma carta só entra de novo depois de sair do quadro (3 leituras sem nome) **e** 2,5 s. Antes: exata entrava na primeira leitura e o "plano B" lia o quadro inteiro, que pegava nome de qualquer texto em volta.
- **Plano B removido:** sem carta achada, a leitura vale só na faixa do nome da moldura. Carta achada fora da moldura não é lida ("Centralize a carta na moldura").
- **Antes do OCR:** nitidez da faixa do nome (variância do laplaciano normalizada pelo contraste; texto nítido 47–123, a foto "borrada" do conjunto 4,8, limiar 3) e movimento entre quadros (limiar 12): quadro desfocado ou tremido não vai para o OCR e a dica diz o que fazer.
- **Tela (S25, 360×780):** sem rolagem. Câmera ocupando o que sobra, estado ("Automático", com ponto pulsando), dica por cima da câmera, **"[nome] ✓"** grande por 1,6 s com vibração, linha do resultado (✓ nome · edição) e duas linhas de botões: Ler agora · Automático; Pilha · N · Desfazer · Digitar · Mais. Pilha, digitar, opções (edição, moldura) e diagnóstico abrem em folhas.
- **Pilha:** miniatura em qualidade normal (antes: small, borrada), nome, edição, confiança, quantidade e conferência.
- **Testes:** U porteiro (exata/aproximada, ambígua, alternando, parada, saiu e voltou, toque soma, cooldown), nitidez (nítida clara e escura passam; desfoque gaussiano fica de fora) e movimento; fotos X10: a régua de nitidez não descarta nenhuma foto legível (12/12 nome, 11/12 edição); e2e "leva 112" (sem rolagem em 360×780, nome alternando não registra, duas iguais registram com "[nome] ✓", parada não duplica, imagem normal na pilha, diagnóstico com nitidez/movimento e cópia com foco e limiares).
- **Expectativas ajustadas com justificativa:** X7 (moldura começa visível; leitura dentro dela), X1/X2/X4 (porteiro: exata precisa de duas; a mesma carta só volta depois do intervalo; leitura fraca vira escolha), X9 e X3/X5 (pilha e lote em folha; linha do resultado sem o rótulo "Edição:"), O1/C11/U2 ("Pilha · N" no lugar de "Lote: N"; base de nomes em "Mais"). O teste da leva 109 (plano B) foi substituído pelo da leva 112. A câmera falsa dos testes passou a mostrar textura nítida (quadro liso é descartado como desfocado).
- **Limite declarado:** "infalível" não existe em OCR de câmera; a garantia é de precisão (não registrar o incerto), ao custo de esperar 2–3 leituras. Limiares calibrados em fotos do repositório, não no aparelho: o diagnóstico copiado do celular calibra a próxima rodada.
- **Portão:** 642 verdes (575 + 67 e2e). Motor inalterado (v64).

**Leva 111 · Habilidades das fichas** ✅ (relato do usuário com foto, 30/09/2026: "não me deu a opção de usar a habilidade" do Sangue)
- **Causa:** desde a E50 P3 a mesa traz a carta da ficha (imagem e texto da Scryfall) ao preparar a partida; o motor criava os fatos dela pela carta, sem script, e `createToken` só punha as habilidades quando os fatos ainda não existiam. Resultado: com rede, toda ficha nascia sem habilidade (Blood, Clue, Food, Map, Treasure, Eldrazi Spawn). Nos testes de motor, sem a carta da ficha, tudo passava.
- **Entregue:** a ficha sempre recebe as habilidades da definição do script. Fichas predefinidas conferidas contra o Oracle do Forge (tokenscripts, consulta de 30/09/2026): Treasure, Clue, Food, Blood e Map batem com o script; Eldrazi Spawn bate com Writhing Chrysalis e Malevolent Rumble (`.listas/oficiais.json`).
- **Folha da permanente:** habilidade que existe mas não dá para ativar agora aparece apagada, com o motivo ("— mana insuficiente"), em vez de a folha vir vazia; o custo no botão diz tudo, inclusive "descartar uma carta".
- **Fichas corrigidas no caminho (texto do Forge, 30/09/2026):** Goblin (Dragon Fodder, Krenko's Command) agora vermelho e Goblin; Dinosaur, Human Soldier, Crab, Bird 2/2 (Swan Song), Servo, Treasure, Clue e Food com subtipo e cor. **Resculpt** estava errado (palpite): ficha "Phyrexian Golem" incolor e alvo só criatura → agora "Elemental" 4/4 azul e vermelho e alvo artefato ou criatura (novo alvo `artifact-creature`). **Saheeli, Sublime Artificer**: o −2 criava um Servo (palpite); o texto real copia um artefato até o fim do turno, que o motor não faz → o −2 saiu e a carta fica parcial declarada.
- **Declarado, sem mudança:** a ficha da sala Muiral (Dungeon of the Mad Mage) aparece como "Skeleton Muiral" porque os fatos do motor são por nome e o Skeleton 4/1 com ameaça da outra sala tem o mesmo nome; a regra (1/1 preto Esqueleto) está certa, só o nome mostrado difere.
- **Testes novos (todos falham antes):** U Blood com e sem a carta da ficha (descarte escolhido, sacrifica, compra); Clue, Eldrazi Spawn, Treasure (só gera sacrificando, uma opção por cor), Food (Sorin transformado) e Map (mira criatura sua); e2e "leva 111" (Sangue sem mana apagado com motivo; com mana, descarta, sacrifica e compra) e a E50 P3 confere a habilidade da Pista na folha.
- **Motor v64** (definições de ficha e dois scripts mudaram). Partidas-referência regravadas só pela versão: logs, status e turnos idênticos.
- **Capturas:** 360 escuro e 390 claro (folha do Sangue sem mana).
- **Portão:** 634 verdes (567 + 67 e2e).

**Leva 110 · Mesa e listas: cinco relatos com fotos do aparelho** ✅ (30/09/2026)
- **Fiery Temper (e todo "qualquer alvo"):** com 10 ou mais criaturas no campo, o motor cortava a lista de alvos antes dos jogadores (`TARGET_LIMIT`), e a mesa mostrava só os 3 primeiros botões da insanidade (4 no "conjurar de graça"). Agora, com um alvo, nada é cortado; com vários, os jogadores nunca saem (`limitaAlvos`). Insanidade e conjurar de graça abrem a folha **Escolha o alvo** com todos os alvos, agrupados em jogadores, suas permanentes e as do oponente, com o estado quando houver (virada, dano). Texto oficial em `.listas/oficiais.json` (consulta de 30/09/2026).
- **Selo na carta no lugar do nome:** marcas que citavam outra carta ("com Utopia Sprawl", "→ Forest", "alvo de…", "← Wall Guard") viraram selos redondos com ícone (anexo, alvo, espada, escudo) e número quando há mais de uma; o nome inteiro aparece ao espiar a carta e no nome falado ("Com Utopia Sprawl", "Bloqueada por Wall Guard"). Guarda: nenhuma pílula passa da largura da carta (teste). A pilha de cópias diz "×3" com o ícone de virar e o número, sem "· 2 virada(s)".
- **Nome da carta virada:** o rótulo do nome saiu da face que gira; a carta virada mostra o nome na horizontal, colado à borda de cima (antes: "Razortrap Go…" de pé). O nome usa até duas linhas antes de cortar; o selo de enjoo desce para não cobrir o nome.
- **Registro:** frases mais precisas: "Bia perdeu 2 de vida (20 → 18)", "bloqueou Sky Pike com Wall Guard", "conjurou Lightning Bolt · alvo: Bia", "moveu Island do grimório para a mão", "manteve a mão (7 cartas)", "comprou 1 carta (Preordain)", "Urso recebeu 2 marcadores +1/+1", "X não resolveu: alvo ilegal", "devolveu X à mão do dono". Correções: ficha registrada como "Ana criou a ficha Goblin" (antes "Goblin criou 1 ficha"); pagar/recusar diziam "a mágica não foi anulada" também em custo opcional de efeito; "terminou a escolha" saiu. Shark: só os motivos que explicam uma decisão entram (antes: "passei: …" a cada passo e "conjurei X" repetindo o evento); o resumo do turno do bot saiu da linha do tempo (repetia os eventos), mas continua no texto corrido.
- **Listas em símbolos:** a linha da estante, das listas prontas e da escolha de lista na preparação da partida (antes um `<select>` de texto) mostra só o nome em palavras; o resto é cor em símbolos de mana, selo do formato, ícone do deck principal e da reserva com o número, e a posse como barra fina. As cores vêm só do que está guardado no aparelho (`cardRepo.cached`, sem rede); faltando o dado de alguma carta, a cor não aparece (nunca "incolor" por engano). Adicionar uma pronta virou botão "+" e "já na estante", um ícone.
- **Bandeja da mão:** ao lado do número de cartas, o momento em ícone + palavra inteira (Principal 1, Ataque, Bloqueio, Pilha 2, Insanidade, Aguardando…), sem reticências; um toque abre o balão com o título e a dica completos. O chevron do botão da mão saiu (o puxador já diz isso); as ações quebram linha à direita quando não cabem; recolhida, a bandeja mantém o momento.
- **Testes novos (todos falham antes):** U "qualquer alvo com a mesa cheia" (12 criaturas + 2 jogadores), selo com ícone e rótulo, frases do registro, cores da lista (4 casos); e2e "leva 110" (folha de alvos da insanidade, selo dentro da carta, nome da carta virada na horizontal, momento inteiro e balão, bandeja recolhida, listas em símbolos, escolha de lista sem `<select>`).
- **Expectativas ajustadas com justificativa:** registro (A7, A9, E50 P2, combate, Raio), aria das marcas de combate (E50 P2), balão da bandeja (E50 P4: compacto em vez de cortado), contagem da reserva e posse na estante (leva 100, homologação 1), "já na sua estante" (A12), escolha de lista (S9, A12, S58, E51).
- **Motor v63** (a lista de ações legais mudou com a mesa cheia). Partidas-referência regravadas só pela versão: logs, status e turnos idênticos.
- **Capturas:** 360 escuro e 390 claro (bandeja, selo de anexo, carta virada, alvos, listas, prontas, preparar partida, escolher lista).
- **Portão:** 630 verdes (564 + 66 e2e).

**Leva 103 · E36 · M13b: parcerias de comandante e mana pelos terrenos do oponente** ✅ (pedido de 30/09)
- **Lista:** dois comandantes só com parceria válida (Partner, Partner with, Friends forever, Choose a Background + Antecedente, Doctor's companion); mensagem diz o que falta; variante desconhecida vira aviso. Funciona sem internet (só dados guardados).
- **Mesa:** Exotic Orchard e Fellwar Stone geram só as cores que um terreno de um oponente poderia gerar, com os rulings oficiais (ver M13).
- **Motor v58:** a produção de mana do Exotic Orchard mudou (antes: qualquer cor); partidas salvas no v57 com essa carta repetiriam o log com opções diferentes, então a versão sobe e a mesa recusa partidas antigas, como já fazia. **Goldens regravadas** só pela versão (entra no hash do estado): os quatro logs, status e turnos idênticos, conferidos um a um.
- **Testes:** 8 unidades novas, todas falham na versão anterior; cenário S8 da Fellwar Stone ganha uma Floresta do oponente.
- **Portão:** 557 verdes (496 unidade/fuzz/golden/torneio + 61 e2e); motor v58.

**Guarda-corpo de sobreposição (leva 100)** ✅
- **Problema:** em 360 px, no aparelho do usuário, o "Blue" de "Pauper Mono Blue Faeries" passava por cima do selo "Pauper" na tela de listas. No teste a fonte é mais estreita e a tinta não encostava; a caixa reservada pelo layout, sim.
- **Entregue:** item da lista redesenhado — nome ocupa o espaço que sobra e quebra dentro dele; coluna da direita (selo do formato e "tenho X de Y") com largura própria, sem quebra; a reserva desceu para a linha de apoio ("60 cartas + 15 na reserva").
- **Guarda-corpo:** a auditoria de tela (`auditaTela`, usada na homologação de todas as telas nos dois temas, na U8 nas quatro medidas e no teste novo com as nove listas prontas) agora falha se (1) a caixa de um bloco de texto cruza um selo, chip ou botão que não o contém — independe da fonte do aparelho — ou (2) a faixa de tinta de uma linha de texto cruza a de outra. Só compara elementos da mesma camada (página, barra fixa, bandeja, diálogo); sobreposição de design fica de fora por seletor (carta da mesa, leque, anel, símbolo de mana, balão, aviso flutuante) ou por `data-sobrepoe`. Prova: com o código antigo o teste acusa as três colisões (Mono Blue, Rakdos, Commander Malcolm & Kediss).

**U4 · Sem internet mais visual** ✅ (leva 97)
- **Entregue:** o painel da tela inicial ganhou um anel de progresso (média do que cada item já guardou; verde com ✓ desenhado em 100%) e uma linha por item — listas, coleção, base de nomes, leitor de texto, imagens do jogo — com ícone, detalhe ("2 de 2 prontas para jogar") e estado desenhado (pronto, em parte, falta baixar, nada a guardar) com nome falado. Estado geral: "Tudo pronto", "Falta preparar N itens" ou, sem rede, "Você está sem internet agora" com a nuvem cortada. O chip da barra virou "Sem rede" (era "Offline") com um ponto que pulsa devagar (parado com movimento reduzido). Avisos de rede viraram uma linha com ícone (`AvisoRede`): busca de cartas, lista sem Scryfall, scanner sem leitor e sem base de nomes. Busca sem resultado na base do aparelho mostra estado vazio com ícone grande. Componentes novos no catálogo: `AnelProgresso`, `AvisoRede`, `Empty` com ícone.
- **Fora:** avisos dentro de diálogos (importar lista sem conferir, edição sem Scryfall) continuam como nota; avisos de ambiente que não são "sem internet" (origem bloqueada, arquivo local) continuam explicados por extenso.
- **Testes:** `offline.visual.unit.test.mjs` (estado por item, anel, itens vazios fora do cálculo); e2e O1 lê o estado de cada linha, o anel em 100% e abaixo de 100 com o leitor apagado, o ícone e o pulso sem rede, e o vazio com ícone na busca.
- **Valor:** o estado sem rede se percebe pelo símbolo e pela cor, não por uma frase.
- **Aceite:** chip da barra vira ícone com pulso discreto e rótulo acessível; painel da tela inicial com anel de progresso do que está guardado; cada tela que hoje mostra um aviso em texto ganha ícone e uma linha só; estados vazios sem rede com ilustração de ícone.
- **Testes:** e2e no `O1 tudo sem internet` (o chip e o painel novos aparecem); contrato visual.
- **Depende de:** U2.

**U5 · Cartas iguais em leque na mesa** ✅ (leva 83)
- **Entregue:** no campo, cópias iguais (terrenos, criaturas, fichas, artefatos) viram um leque: a carta da frente é o botão e até três aparecem atrás, deslocadas 14px, com "×N" na frente. Quatro Ilhas ocupam menos que duas cartas. Os dois lados da mesa usam o leque.
- **Valor:** cinco Ilhas ocupam o espaço de uma e meia; a mesa cabe na tela.
- **Aceite (como ficou):**
  - só junta o que é intercambiável: mesmo nome, mesmo controlador, mesmo estado (virada; enjoo, só para criatura), sem marcador, dano, anexo, efeito até o fim do turno ou papel no combate;
  - o toque é do leque inteiro e age na primeira desvirada (ou na primeira, se todas viradas); segurar espia; alvo de toque ≥ 44px;
  - no combate, quem pode atacar ou bloquear sai do leque para ter o seu próprio toque;
  - leque virado gira junto; `prefers-reduced-motion` respeitado (sem animação nova).
- **Divergência do aceite original:** o texto dizia "cada carta ainda tocável". Como as cartas do leque são iguais por construção, tocar em qualquer uma faria a mesma coisa; o leque inteiro virou um alvo só, maior e mais fácil de acertar.
- **Sem rede:** só apresentação; passo no `e2e · O1` (duas Planícies viram um leque sem internet).
- **Testes:** U (`leque.unit.test.mjs`, 6: o que junta, o que separa, ordem, `separa`, robustez); e2e `U5` (leque de 4 com 3 camadas, deslocamento medido, largura menor que 2 cartas, toque abre a folha, sem rolagem horizontal, combate abre o leque em 3 atacantes); passo no `O1`.
- **Fora:** abrir o leque com gesto; arrastar cartas.

**U6 · Bandeja da mão recolhível** ✅ (leva 84)
- **Entregue:** um puxador no topo da mão ("✋ 7 ▾") recolhe e expande a bandeja em 200 ms. Recolhida, sobra só o puxador e a mesa ganha a altura da mão. A escolha fica guardada no aparelho e vale para as próximas partidas.
- **Valor:** ver a mesa inteira quando a mão não importa.
- **Aceite (como ficou):**
  - puxador com alvo ≥ 44px, `aria-expanded` e rótulo "Recolher/Mostrar a mão (N cartas)";
  - recolher e expandir não repintam a mesa (a animação roda no mesmo elemento); recolhida, as cartas saem do toque e do leitor de tela;
  - mão inicial e descarte abrem a bandeja sozinhos, o puxador diz "aberta para descarte" e fica travado até a decisão; depois volta a recolher;
  - `prefers-reduced-motion` sem animação.
- **Divergência do aceite original:** dizia "a preferência dura a partida". Ficou guardada no aparelho, valendo também para as próximas, porque quem prefere a mesa limpa prefere em todas.
- **Sem rede:** preferência local; passo no `e2e · O1`.
- **Testes:** U (`bandeja.unit.test.mjs`, 3: padrão, forçada por mão inicial e descarte, só a mão de quem vê); e2e `U6` (recolher, corpo com altura 0, doca encolhe mais de 100px, persiste após recarga, descarte força abrir e trava, mão inicial força abrir, volta a recolher); passo no `O1`.
- **Fora:** gesto de arrastar o puxador.

**U7 · De quem é o turno, visível de longe** ✅ (leva 85)
- **Entregue:** faixa no topo da mesa com a inicial e "Seu turno" (na cor de acento) ou "Turno de Ana" (em azul, a cor do oponente); o lado de quem joga acende com borda e brilho na mesma cor; quando a vez de agir não é de quem tem o turno, um selo "⚑ você responde" / "⚑ Bia responde" aparece separado; a faixa entra com um movimento curto quando o turno troca; a cortina do jogo a dois no mesmo aparelho mostra a mesma faixa para quem recebe.
- **Valor:** saber em um relance quem joga, bot × você ou jogador 1 × jogador 2.
- **Aceite (como ficou):**
  - cores dos jogadores vêm de tokens (`--player-opp`, `--player-opp-fg`, `--player-opp-soft`; o seu é o acento), com contraste conferido no contrato visual nos dois temas;
  - turno ≠ prioridade: a decisão pendente (bloqueio, descarte) conta como a vez de quem decide;
  - mão inicial e fim de partida têm faixa neutra própria ("Mão inicial", "Você venceu", "Empate");
  - faixa com alvo ≥ 44px; transição de 300 ms; `prefers-reduced-motion` sem animação.
- **Efeito colateral medido:** a faixa desce o campo cerca de 50px; num 390×844 com a mão aberta, a primeira fila do seu lado cai atrás da doca. Hoje a pessoa rola ou recolhe a mão (U6); a U8 resolve por tamanho de aparelho. O e2e A15 passou a rolar a carta para a vista antes de segurá-la (mesma correção já feita para a pilha de terrenos).
- **Divergência do aceite original:** o aceite falava em avatar; sem perfil (U13) ainda, o círculo mostra a inicial do nome. Quando o perfil existir, a foto entra no mesmo círculo.
- **Sem rede:** só apresentação; passo no `e2e · O1`.
- **Testes:** U (`vez.unit.test.mjs`, 4: seu turno/do outro, prioridade separada inclusive em bloqueio pendente, mão inicial e fim, nome ausente); contrato visual (3 pares de contraste novos); e2e `U7` (faixa na mão inicial, seu turno com lado aceso, cortina diz o turno, animação na troca, ataque real com bloqueio pendente do outro: faixa azul, "você responde", lado do oponente aceso, cores diferentes medidas); passo no `O1`.

**U8 · Disposições por tamanho de aparelho** ✅ (leva 99)
- **Medidas (consulta em 30/09/2026, [yesviz.com](https://yesviz.com/viewport.php)):** Galaxy S23/S24/S25 360×780 CSS px (DPR 3); Galaxy S25+ e S25 Ultra 412×891 (DPR 3,5). As capturas do aparelho do usuário (1080×2340) dão 360×780: é um Galaxy S de tela padrão.
- **Entregue:** três faixas por largura — estreita ≤ 374 (Galaxy S), padrão 375–399 (iPhone 390, S+ com zoom de tela), larga ≥ 400 (S+ e Ultra) — com tokens de tamanho de carta: campo 76/84/92, mão 92/100/110, pilha 52/56/60; tela baixa (≤ 740 de altura útil, a barra do navegador come ~80) encolhe a mão para 84. Na estreita: fases com nome curto ("princ. 1", o leitor de tela lê o nome inteiro), a linha repetida "Turno N · Fulano … Principal 1" sai (a faixa de vez e o trilho já dizem), vida um pouco menor, botões da barra da bandeja mais justos. Até 399: contadores de zona (Grimório, Cemitério, Exílio) empilhados, número em cima, numa grade de uma linha ao lado da vida — antes o Exílio caía numa segunda linha e empurrava as permanentes para baixo da bandeja.
- **Testes:** e2e "U8" (quatro medidas × início, listas, lista, coleção, preparar e mesa: sem rolagem lateral, alvos ≥ 44 px, carta no tamanho da faixa, fases inteiras, contadores numa linha, linha repetida só sai na estreita); contrato visual confere os tokens por faixa.
- **Fora:** tablets e paisagem (como previsto); zoom de fonte do sistema acima do padrão.
- **Valor:** a mesa aproveita a tela de um Galaxy S, S+ e Ultra sem sobra nem corte.
- **Aceite:** três disposições por faixa de largura/altura em CSS px (medidas conferidas na especificação de cada aparelho antes de codificar, com a data da consulta anotada aqui); tamanho de carta, zonas e bandeja escalam por faixa; a auditoria de tela roda nas três medidas mais o iPhone de referência.
- **Testes:** e2e (auditoria de overflow e alvo de toque em cada medida); capturas por medida.
- **Depende de:** U5, U6, U7.
- **Fora:** tablets; modo paisagem.

**U10 · Shark: um bot só, com nome** ✅ (leva 87)
- **Entregue:** a tela de jogar oferece três oponentes: Goldfish (sem oponente), Shark (bot) e Outra pessoa neste aparelho. O Shark é o bot profissional de antes, com o nome "Shark" na mesa, no registro, na linha do tempo e no resumo do turno. Os textos da tela falam do Shark, não de "bots".
- **Valor:** menos escolha na preparação, nome com identidade: Goldfish (sem oponente) e Shark (o bot).
- **Aceite (como ficou):**
  - partida salva contra "Bot amador" ou "Bot profissional" abre como Shark: o nome do assento e o nível guardado são trocados na hora de abrir; nome escolhido pela pessoa no jogo a dois nunca é trocado;
  - `criaBot()` sem nível passou a ser o Shark.
- **Divergência do aceite original:** dizia "o amador sai do torneio de aferição". Ele saiu da tela, mas ficou no torneio como sparring: é a versão mais simples do mesmo avaliador e serve de régua para provar que o Shark joga melhor. O torneio ganhou "Shark × aleatório ≥ 80%" (deu 16–0) e manteve "Shark × sparring ≥ 60%" (deu 15–9, 63%).
- **Sem rede:** o `e2e · O1` agora joga contra o Shark sem internet.
- **Testes:** U (`shark.unit.test.mjs`, 4: padrão, nível da mesa, partida antiga "amador" e "profissional" abrindo como Shark, nome do jogo a dois preservado); torneio (Shark × aleatório novo); e2e B4/U10 (só três oponentes, nenhum nível antigo na tela, "Shark" no registro), B5 (Shark bloqueado sem 100%), HOMOLOGAÇÃO 5 (partida inteira contra o Shark), O1.
- **Expectativas alteradas:** A14 da mesa (nome "Shark" e nível "shark" depois de salvar), B3 do bot (nível do sparring explícito, porque o padrão virou o Shark), e2e B4, B5, O1 e HOMOLOGAÇÃO 5 (seletor e nome). Cada uma diz o motivo no próprio teste.

**U11 · Shark mais forte** ✅ (leva 101)
- **Entregue:** o Shark de antes ficou congelado como `shark-v1` (só existe no torneio); o Shark da mesa passou a ser o v2, com três mudanças: (1) avaliação de mana conta as fontes em campo, viradas ou não — o v1 contava só as desviradas, então virar terrenos para conjurar parecia perda e ele segurava criaturas na mão; no turno do oponente, fonte desvirada ainda vale um pouco (resposta possível); (2) evasão (voar, atropelar, ameaça) e perigo (vida baixa dos dois lados) entram na nota; (3) no combate ele supõe que o oponente bloqueia contando o dano e considera bloqueio duplo (dois bloqueadores que juntos matam um atacante que nenhum mata sozinho).
- **Medida (semente fixa, assentos trocados, metade das partidas com um deck de voadores):** Shark v2 × v1 70% (28–12) em 40 partidas no portão; 72% em 60 no roteiro de exploração. Shark × sparring subiu para 71%; Shark × aleatório 100%. Tempo: média ~5 ms por jogada, pior jogada 334 ms no Node (limite do portão: 1 s).
- **Desvio declarado do aceite:** a medida é com os decks sintéticos do torneio, não com as listas Pauper reais — o repositório não tem os dados completos (custo, força, resistência) das cartas das sete listas sem rede. Fica para quando houver um pacote de dados das cartas no próprio repositório.
- **Fora:** "guardar remoção para a ameaça maior" (o avaliador já pesa o valor do alvo, mas não há regra explícita); profundidade 2 além da resposta imediata.
- **Sem internet:** o bot é todo local; o O1 já joga contra ele sem rede.
- **Testes:** `bot.torneio.test.mjs` (v2 × v1 ≥ 60%, sem ação ilegal, pior jogada < 1 s, média < 50 ms; avaliação v2 determinística e respeita vitória/derrota).
- **Valor:** o bot joga melhor de forma medida.
- **Aceite:** ganho comprovado no torneio (`bot.torneio.test.mjs`) contra a versão anterior do próprio Shark, com semente fixa, em Pauper; candidatos: profundidade 2 na resposta, avaliação de curva e de mana disponível, bloqueio com troca favorável, guardar remoção para ameaça maior; tempo por jogada no celular continua abaixo de 1 s (medido no portão).
- **Testes:** torneio (vitórias e tempo); fuzz (nenhuma ação ilegal).
- **Depende de:** U10.

**U12 · Imagens do jogo baixadas sozinhas** ✅ (leva 86)
- **Entregue:** o guardião offline agora baixa, para cada carta das listas salvas, a imagem pequena (a do campo da mesa) e a grande (mão e zoom), a pequena primeiro. Acontece sozinho ao salvar uma lista, ao abrir o app com internet e quando a internet volta. O painel da tela inicial ganhou a linha "Imagens do jogo: N de M", e o que falta entra na lista de "Falta preparar".
- **Correção que a história revelou:** até aqui a lista só guardava a imagem grande, e o campo da mesa usa a pequena. Sem internet, as permanentes apareciam só com o nome, mesmo depois de "Preparar tudo".
- **Aceite (como ficou):**
  - uma imagem por vez, com folga de 80 ms depois de cada download de verdade; o que já está guardado não espera nem baixa de novo;
  - sem rede nada é tentado; a contagem do painel lê só o que está no aparelho (nova `cardRepo.emCache`, que nunca chama a rede);
  - navegador sem cache de imagens: a linha não aparece, em vez de mostrar um número falso.
- **Sem rede:** é a própria história; passo no `e2e · O1` (contagem 1 de 1, pequena e grande no cache, pequena pedida primeiro).
- **Testes:** U (`offline.unit.test.mjs`: 4 novos — contagem sem ir à rede e com imagem apagada, rede volta e `manter()` baixa, navegador sem cache, uma por vez com folga só após download); e2e `U12` (salvar a lista baixa a imagem sem tocar em nada; cache apagado e internet caindo: nada tentado; internet volta: baixa sozinho; painel conta); passo no `O1`. Todos falham na versão anterior.
- **Expectativa alterada:** o teste O1 "lista não aquece miniatura" afirmava o comportamento antigo; agora afirma as duas, a pequena primeiro. O motivo está escrito no teste.
- **Fora:** imagens da coleção em tamanho grande (continua só a miniatura, que é o que a tela da coleção usa).

**U13 · Conta e perfil** ✅ (fase 1 na leva 128; fase 2 na leva 129, pronta atrás de `GOOGLE_CLIENT_ID`, ver §6)
- **Valor:** nome e avatar seus na mesa e no chat; backup fora do aparelho.
- **Aceite (fase 1, sem Google):** tela Perfil com nome e avatar (foto da galeria ou ícone), guardados localmente, usados na mesa e no hot-seat; exportar/importar backup completo (listas, coleção, preferências) por arquivo.
- **Aceite (fase 2, com Google):** entrar com Google (Identity Services), uma conta por Gmail, backup automático na pasta privada do app no Drive; restauração em aparelho novo.
- **Testes:** U (modelo de perfil, backup completo ida e volta); e2e (perfil aparece na mesa); fase 2 com o Google simulado.
- **Depende de:** Client ID do usuário para a fase 2.

**U14 · Partida online 1x1** ✅ (levas 130, 133, 134 e 135; dois celulares dependem de `FIREBASE_DB_URL`, ver §6)
- **Leva 130 · parte 1 — sala, transporte e sincronização (módulo puro `src/online/sala.js`, `__m30`):**
  - código de sala `ESTA-XXXX` (alfabeto sem 0/O/1/I), digitado de qualquer jeito e normalizado;
  - contrato de transporte (`ler`, `escrever`, `atualizar`, `empurrar`, `ouvir`, `ligado`) com dois adaptadores:
    **memória** (testes, avisos assíncronos como numa rede) e **local** (storage + canal: duas abas do mesmo
    aparelho e os testes de navegador). O Firebase (REST + eventos, sem SDK) é a leva 132;
  - sala: criar (sorteia outro código se o sorteado existir), entrar (erros com nome: `codigo-invalido`,
    `sala-inexistente`, `sala-cheia`, `sala-velha` após 6 h, `formato-diferente`), publicar o setup do anfitrião
    (semente, as duas listas e as cartas — os dois lados montam a mesma mesa), ações empurradas em ordem, presença,
    encerrar;
  - **sincronizador**: cada aparelho só age pelo próprio assento; aplica a ação local na hora e manda para a sala;
    a lista da sala é a verdade: quem chega depois (ou volta de uma queda) alcança aplicando em ordem; se os dois
    agiram "ao mesmo tempo", a ordem da sala vence e a mesa é reconstruída do zero — ação que ficou ilegal nessa
    ordem é ignorada e contada, e quem a fez vê a mesa voltar; jogada que não chegou à sala (sem rede) é desfeita na
    hora e a tela é avisada (`nao-enviada`).
  - **Limite declarado:** confiança entre os dois aparelhos (cada um tem o estado inteiro na memória, como no jogo
    a dois no mesmo celular); a tela esconde a mão do oponente, mas não há servidor que a esconda de quem abrir o
    console. Para jogar com amigos é o suficiente; para desconhecidos não é, e isso fica escrito na tela.
  - **Testes (U, `online.unit.test.mjs`, 8):** código; transporte em memória (ordem, ouvir, sem rede); transporte
    local entre duas "abas"; sala inteira; duas mesas convergem (estado idêntico a cada ação); terceiro aparelho
    alcança e queda + volta reconstrói; corrida de duas ações; sem rede a jogada é desfeita.
- **Leva 133 · parte 2 — telas (criar sala, entrar, mesa online):**
  - preparar partida ganha o quarto oponente **Online** (ícone globo); com quatro opções o segmentado vira grade
    2×2 (os rótulos não cabiam numa linha de 360 px — padrão aprendido na U2); "Começar partida" some no modo
    online: o painel tem os próprios primários;
  - **Criar sala**: cartão com o código `ESTA-XXXX` em serifa grande, copiar, "Esperando o outro jogador…",
    Cancelar (encerra a sala); quando o convidado entra, o anfitrião busca as cartas das duas listas, confere que
    a lista do convidado também joga 100% (senão encerra e diz quantas cartas faltam), publica o setup e os dois
    vão para a mesa;
  - **Entrar**: campo do código (maiúsculas, prefixo opcional) + Entrar, erros em frase (sala inexistente, cheia,
    velha, formato diferente); "Esperando o anfitrião preparar a mesa…";
  - **mesa online**: `mesaOnline(sinc)` por cima do sincronizador — quem vê é sempre o meu assento (sem cortina),
    sem desfazer (botão apagado com o motivo), ícone de globo nas ferramentas com o código no title, presença a
    cada 15 s; ação que não chegou à sala ou que o outro atropelou vira aviso de uma linha; desistir encerra a
    sala. O assento desta aba fica em `sessionStorage` (duas abas dividem o store);
  - **sem Firebase configurado** (`FIREBASE_DB_URL` vazia) o transporte é o local: a sala funciona entre duas abas
    deste aparelho — dá para testar tudo hoje; a tela diz isso e diz que a partida é de confiança entre os dois.
  - **Testes:** e2e "Leva 133" com duas abas do mesmo contexto: criar, código legível, entrar com código errado e
    certo (digitado em minúsculas, sem prefixo), os dois chegam à mesa sem cortina, cada um vê o próprio assento,
    estados idênticos depois de cada keep e de três passes, indicador online e desfazer apagado, desistir
    encerra e o outro vence, `auditaTela` nas telas novas nos dois temas. Expectativas B4/U10 e U2 parte 3
    ajustadas (quatro oponentes em duas linhas), com o motivo nos testes.
  - **Pendência vista no caminho:** no Playwright, a captura de tela da aba do anfitrião trava depois de a mesa
    abrir (JS ocioso a 96%, fps baixo na aba; o convidado captura normal). Não afeta o teste nem o app; fica para
    a leva 133 investigar (composição/animação).
- **Leva 134 · parte 3 — transporte Firebase (dois celulares pela internet), atrás de `FIREBASE_DB_URL`:**
  - `transporteFirebase({ url })`: Realtime Database por **REST** (`GET/PUT/PATCH/POST/DELETE <caminho>.json`;
    `POST` dá a chave cronológica do servidor) e **fluxo de eventos** (`EventSource` no nó da sala; réplica local
    aplica `put`/`patch` com caminho relativo; ao reconectar o Firebase manda o nó inteiro de novo). Sem SDK, sem
    build, nada para guardar offline. `fetch` e `EventSource` injetáveis.
  - `ligado()`/`aoMudarLigacao`: o globo da mesa fica âmbar e pulsa (sem movimento com `prefers-reduced-motion`)
    enquanto reconecta; a tela de preparar diz "A sala vive na internet". O anfitrião apaga a sala um minuto
    depois do fim.
  - **Como ligar (usuário):** console.firebase.google.com → projeto → Realtime Database → criar (modo de teste) →
    copiar a URL `https://<projeto>-default-rtdb.firebaseio.com` em `FIREBASE_DB_URL`. Regras recomendadas:
    `{"rules":{"salas":{"$codigo":{".read":true,".write":true,".validate":"$codigo.matches(/^ESTA-[A-HJ-NP-Z2-9]{4}$/)"}}}}`.
    **Limite declarado:** sem autenticação — qualquer um com a URL pode ler/escrever em `salas`; só o código de 4
    letras protege a sala; não serve para desconhecidos. Autenticação anônima do Firebase fica para depois, se o
    usuário quiser.
  - **Testes:** U (`firebase.unit.test.mjs`, 5: REST completo e URL com barra; fluxo de eventos com put inteiro,
    put parcial, patch em filho novo e parar; queda e volta refazem a réplica; sem rede com nome; a sala inteira
    por cima do Firebase; `aplica()`); e2e "Leva 134" com banco falso por rota nas duas abas e EventSource de
    sondagem: criar por PUT, entrar, keeps por POST, mesas iguais, indicador conectado.
- **Leva 135 · parte 4 — o outro sumiu, o outro encerrou, voltar à partida:**
  - a mesa avisa quando o outro aparelho está sem sinal há mais de 45 s ("parece ter saído", com os minutos),
    sem travar: a partida fica guardada e continua quando ele voltar; repinta a cada 15 s junto com a presença;
  - sala encerrada do outro lado ("Encerrar por abandono" na preparação, ou cancelada) vira aviso na mesa:
    "Partida encerrada. O outro jogador saiu da sala";
  - o cartão "Partida em andamento" da preparação diz "online, sala ESTA-XXXX"; "Descartar" vira **Encerrar por
    abandono** e encerra a sala para o outro lado também.
  - **Testes:** e2e "Leva 135" (duas abas: cartão online, aviso de ausência com presença envelhecida, encerramento
    pelo outro lado visto na mesa; `auditaTela` nas duas telas).
  - **Fora:** vitória automática por abandono (o motor só aceita desistência do próprio assento; sem servidor
    árbitro, atribuir vitória seria palavra de um lado só).
- **Valor:** dois celulares, cada um com o app, uma partida.
- **Aceite:** criar sala com código de 6 letras, entrar pelo código, cada aparelho aplica as ações do outro no mesmo motor; reconexão retoma pelo registro; mão do oponente escondida na tela (a sincronização é por ações, então o estado completo está nos dois aparelhos — declarado como limite de confiança entre amigos); sem rede a tela diz que a partida online precisa de internet.
- **Testes:** U (protocolo de sala e reconciliação de ações); e2e com dois contextos de navegador e transporte simulado; O1 (mensagem sem rede).
- **Depende de:** U13 (nome/avatar), decisão de transporte.

**U15 · Chat na partida online** ✅ (leva 137)
- **Entregue:** botão **Conversa** nas ferramentas da mesa (só online) com selo de novas e o **ponto de ligação**
  dentro dele (verde conectado, âmbar pulsando ao reconectar — o globo separado saiu: cinco ícones não cabiam na
  linha da faixa em 360 px e empurravam o campo); folha "Conversa" (diálogo com X, foco preso): balões com hora,
  os meus à direita em latão, os do outro à esquerda; quatro frases rápidas (Boa!, GG, Um minuto, Sua vez); campo
  de 200 caracteres com Enter ou botão. Mensagem nova com a folha fechada vira aviso curto "Nome: texto" e
  vibração; com a folha aberta já conta como lida. O texto é guardado e desenhado como texto: HTML digitado
  nunca é interpretado.
- **Nomes online:** sem perfil, o anfitrião é "Jogador 1" e o convidado "Jogador 2" (antes os dois assentos
  apareciam como "Você" na mesa do outro).
- **Modelo (puro, em `__m30`):** `limpaMensagem`, `mensagensDe(sala, assento)`, `naoLidas(ms, assento, lidoAte)`,
  `FRASES`, `MENSAGEM_MAX`; `sala.enviarMensagem` empurra em `mensagens/` pelo mesmo transporte da partida.
- **Testes:** U (`online.unit`: limpeza e limite, ordem, "minha", não lidas, envio e leitura pela sala, vazio
  recusado); e2e "Leva 137" (duas abas: selo 0 → 2, frase rápida e texto com HTML chegam como texto, aviso com
  nome e mensagem, abrir zera, resposta chega na folha aberta; `auditaTela` nas duas abas).
- **Fora:** "digitando…"; histórico fora da sala; avatar nos balões (quando o perfil da conta estiver na sala).
**U18 · Exportar como bloco expansível, no alto da coleção** ✅ (leva 160, pedido de 04/10/2026)
- **Valor:** exportar deixa de ficar escondido depois da lista (rolagem inteira) e passa a ter lugar, ícone e
  nome próprios, junto dos outros blocos; as variações ficam à vista em vez de dentro de uma folha.
- **Entregue:** bloco **Exportar** (`Expansivel`, o mesmo do Painel e do Adicionar carta), logo abaixo de
  "Adicionar carta" e acima do filtro. Ícone novo `cartaSai` (a carta com a seta que sai, par do `cartaMais`), no
  selo do cabeçalho e no catálogo `/ds`. Dentro, quatro saídas em duas colunas, cada uma com ícone:
  **Em texto** (abre a folha com os formatos simples · Arena · Moxfield, copiar ou baixar), **Em CSV** (baixa
  direto e confirma com ✓ no botão), **Filtradas** (só o recorte do filtro; apagado sem filtro, com a contagem
  quando há) e **Selecionar** (liga a seleção para exportar só as escolhidas; fica marcado enquanto ligada). Uma
  linha lembra que o backup completo mora em Perfil › Dados. Fechado, o cabeçalho resume "texto · CSV · seleção".
  Aberto/fechado lembrado por aparelho (`prefs.exportar`); **aberto por padrão**, como os outros dois blocos.
  Coleção vazia: o bloco não aparece.
- **Mudou de lugar (declarado):** a leva 149 tinha posto Exportar e Selecionar depois da lista (`#col-acoes-lista`)
  porque agem sobre ela; este pedido traz para cima. Os ids `#col-export` e `#col-select` continuam os mesmos.
- **Medido (360×780):** o bloco aberto ocupa 222 px e o fechado 62 px; com os três blocos abertos a primeira carta
  fica a ~950 px do topo. **Risco apontado:** três blocos abertos por padrão empurram a lista para o segundo ecrã;
  quem exporta pouco fecha o bloco uma vez e fica lembrado. Se o uso no aparelho incomodar, o padrão do Exportar
  vira "fechado" numa linha.
- **Testes:** e2e "leva 160" (vazia sem bloco; cabeçalho ≥ 44 px na largura toda com `cartaSai`; ordem adicionar ›
  exportar › filtro › lista; quatro botões com ícone, até duas palavras e 44 px; texto abre a folha; CSV baixa e
  confirma; Filtradas acende com filtro, mostra a contagem e exporta só o recorte; Selecionar marca; fechar resume,
  sobe a lista ≥ 120 px e fica lembrado; ícone no catálogo; `auditaTela` aberto e fechado). Expectativas da leva
  149 e da U2 parte 2 atualizadas com o motivo (posição e pares de botões).
- **Fora:** exportar para imagem/PDF; compartilhar direto por app; exportar o que falta para uma lista (já está em
  Painel › montar).

**U17 · Blocos expansíveis da coleção, formato obrigatório em Jogar e enquadrar a foto** ✅ (leva 149, pedido de 03/10/2026)
- **Valor:** a coleção mostra o que cada bloco é de relance e deixa a lista subir; a partida sempre tem formato; a foto do perfil fica como o usuário quer.
- **Entregue:**
  - **Componente `Expansivel` (F5, no `/ds`):** o cabeçalho inteiro é o botão (60 px, largura toda): selo com o ícone do conceito, título em serifada, resumo opcional e seta que gira. `aria-expanded`; entrada do corpo em 180 ms, sem movimento com `prefers-reduced-motion`. Ícones novos: `painel` (barras) e `cartaMais` (carta com sinal de mais). Componente `Range` (controle deslizante, alvo de 44 px).
  - **Coleção:** Painel e **Adicionar carta** são blocos expansíveis, nesta ordem, antes do filtro (a leva 113 tinha levado "adicionar" para o fim; este pedido traz de volta para cima). Aberto/fechado lembrado por aparelho (`prefs.adicionar`, `prefs.painel`). Fechado, o painel resume "N cartas · N cópias". Com os dois fechados a lista sobe mais de 300 px em 360×780. O "+" do topo abre o bloco e foca o campo.
  - **Divergência declarada:** dentro de "Adicionar carta" ficam só as ações que põem carta na coleção (nome, Colar lista, Abrir CSV). **Exportar** e **Selecionar** agem sobre a lista e ficaram depois dela (`#col-acoes-lista`), para não sumirem quando o bloco fecha.
  - **Jogar:** saiu o chip "Todos". Os chips são os formatos que têm lista; começa ligado o formato da primeira lista da estante; tocar no ligado não desliga. As listas oferecidas são só as do formato.
  - **Perfil:** escolher a foto abre "Enquadrar foto": palco quadrado com a foto, círculo de latão mostrando o que vira o avatar, arrastar posiciona (segue o dedo, para na borda), pinça/roda/barra/botões aproximam até 4×, setas movem, "Usar foto" confirma, Cancelar/X/Esc não troca. O recorte é do modelo puro (`perfil.enquadra`, `enquadraZoom`, `enquadraMove`): nunca sobra faixa vazia. Saiu o texto "Na mesa: nome".
- **Testes:** U `perfil.unit` (+2: recorte sempre dentro da foto, com propriedade em 400 combinações; arrastar e aproximar com ponto fixo); e2e "leva 149" ×3: blocos (ícone, 44 px, ordem, lembrar, resumo, altura fechada ≤ 64 px, catálogo), formato (sem "Todos", sempre um ligado, listas do formato), enquadrar (central por padrão, arrasto até o canto, barra, roda, teclado, cancelar, salvar e recarregar, cor do avatar medida em pixel). `auditaTela` nas quatro medidas e nos dois temas em cada tela.
- **Sem rede:** tudo local; nada novo para o guardião.
- **Fora:** reenquadrar uma foto já salva (só a versão reduzida de 192 px é guardada); lembrar o último formato escolhido em Jogar; a foto da conta Google continua entrando pelo recorte central.

- **Depende de:** U14.

### D · Design de patamar (E53, pedido de 03/10/2026)

**Pedido:** "roadmap completo de revisão e aprimoramento de design para elevar o patamar da aplicação, com os
conceitos mais sofisticados e refinados de UX/UI, foco profundo em experiência e em customização visual".

**Auditoria de 03/10/2026 (13 telas, 360×780, escuro e claro, capturas no Playwright; o aparelho do usuário é o
Galaxy S, 360×780 a 3×).** O que a Estante já tem de bom e deve ser preservado: identidade própria (nogueira, papel
e latão; serifa de livro nos títulos), ícones flat de um só traço, alvos de 44 px em toda parte, auditoria de
sobreposição e de rolagem lateral no portão, offline desenhado em todas as telas, mesa com três camadas de leitura.
O que puxa o patamar para baixo, em ordem de impacto no uso:

| # | Problema | Onde | Evidência |
|---|---|---|---|
| 1 | **Estados vazios que gritam**: Coleção vazia mostra 6 botões (Escanear, Filtros, Importar lista, Importar CSV, +, Colar lista, Abrir CSV) e três parágrafos; Cartas abre com "Base local de cartas" (3 botões, um deles vermelho) antes do campo de busca | Coleção, Cartas, Scanner | captura 06, 07, 08 |
| 2 | **Primeiro contato sem rumo**: o início diz "Plataforma de Magic", não lembra a partida em andamento nem a última lista, e o painel offline ("0% · Sem internet · falta preparar 2 itens") é a segunda coisa que se lê | Início | captura 01 |
| 3 | **Avisos empilhados**: o scanner mostra três notas (base de nomes, câmera, leitor) antes da moldura — 200 px de aviso numa tela de 780; a Lista repete "sem conexão" acima do cartão do motor | Scanner, Lista | captura 08, 04 |
| 4 | **Mesa com zonas vazias ocupando campo**: "Terrenos nenhum / Permanentes nenhuma" em duas linhas por lado (≈ 60 px cada) e chips "Cemitério 0 · Exílio 0" com o mesmo peso de "Grimório 52" | Mesa | captura 10, 11 |
| 5 | **Aviso flutuante que não sai**: o toast de uma tela ("Pauper Elves está na sua estante") continua na tela seguinte por cima do conteúdo | todas | capturas 02–05 |
| 6 | **Backup em dois lugares** (Listas e Perfil) e "Base local" em Cartas: ajustes e dados espalhados pelas telas de uso | Listas, Cartas, Perfil | captura 02, 07, 12 |
| 7 | **Nenhuma personalização além do tema**: acento, densidade, tamanho de texto, superfície da mesa, verso de carta, cor do oponente, vibração — tudo fixo | app inteiro | — |
| 8 | **Literais fora dos tokens**: 14 `font-size`, 8 durações e 5 raios em px/ms nos componentes; sem escala de densidade | CSS | contrato visual (leva 123) |
| 9 | **Movimento sem sistema**: entradas de carta, troca de turno, folhas e avisos com durações próprias; só parte respeita `prefers-reduced-motion` | mesa, diálogos | CSS |
| 10 | **Acessibilidade sem medição automática**: contraste medido só nos pares listados; sem varredura de nomes, foco e papéis no headless | portão | contrato visual |

**Princípios que o épico aplica (os "conceitos sofisticados", em termos verificáveis):** hierarquia por um
primário por tela; progressive disclosure (o raro vai para folhas e para Ajustes); estados vazios com uma frase, um
primário e um secundário; conteúdo antes de administração (busca antes de "base local"); feedback no lugar da ação
(não só toast); densidade e tipografia por escala (tokens), não por tela; movimento com propósito e duração por
token; personalização por tokens (um ajuste muda o app inteiro) guardada no aparelho e no backup; medição no portão
para cada promessa (pixels de campo, contraste, sobreposição, nomes falados).

**Ordem de execução (uma leva por história, estimativa 1,5–2,5 h cada com portão e publicação):**

| Ordem | História | Entrega em uma frase | Mede |
|---|---|---|---|
| D1 | Fundamentos: escala e densidade | Tokens `--escala-texto` (3 passos) e `--densidade` (2 passos) aplicados a texto, espaço e alvos; literais restantes viram tokens; toast fecha ao trocar de tela | contrato visual: zero literal; e2e: a escala muda a mesa inteira |
| D2 | Ajustes e Aparência | Tela **Ajustes** (em Perfil): tema, acento (latão · cobre · prata · jade), densidade, tamanho do texto, movimento reduzido, vibração; tudo por aparelho e no backup v3 | AA nos dois temas × quatro acentos; e2e troca e persiste |
| D3 | Início que lembra de você | Cabeçalho "Olá, Nome"; cartão **Continuar** (partida em andamento com placar/sala, última lista, última leitura do scanner); painel offline vira uma linha com anel e abre em folha | pixels: o primeiro atalho sobe ≥ 80 px; `auditaTela` |
| D4 | Estados vazios e primeiro uso | Coleção, Listas, Cartas e Scanner vazios: ícone grande do DS, uma frase, um primário e um secundário; o resto vai para a folha "Mais"; onboarding de 3 passos na primeira abertura, pulável | e2e conta ≤ 2 botões visíveis no vazio |
| D5 | Dados e administração num lugar só | Backup (arquivo e nuvem), base local de cartas, espaço usado, limpar dados: tudo em Ajustes › Dados; Listas e Cartas ficam só com uso | e2e: Listas sem seção de backup; Cartas abre na busca |
| D6 | Mesa: relance | Zonas vazias colapsam numa linha, zeros apagados, "Terrenos/Permanentes" só quando há; registro e resumo em folha; medir campo ganho em 360×780 | pixels de campo antes/depois (meta ≥ 60 px no início da partida) |
| D7 | Mesa: superfície e verso (personalização) | Superfície (nogueira, feltro, pedra, papel) e verso de carta (3 desenhos próprios, sem marca), cor do oponente (azul · rubi · ametista) com par de contraste; no catálogo `/ds` | contrato visual dos novos tokens nos dois temas; e2e troca e persiste |
| D8 | Avisos e retorno no lugar | Notas de estado empilhadas viram uma linha de ícones com folha de detalhe (scanner, lista, cartas); confirmação de ação perto do botão (marca ✓ por 1,2 s) antes do toast | pixels no scanner (≥ 120 px devolvidos à moldura) |
| D9 | Coleção e cartas: ver e trabalhar | Busca em primeiro lugar; filtros em folha inferior com contagem ao vivo; linha densa com símbolos; galeria com sombra e canto por token; seleção múltipla com barra de ações | `auditaTela` nas três visões; e2e de filtro em folha |
| D10 | Movimento com sistema | Catálogo de movimentos (entrar, sair, trocar turno, folha, aviso) por tokens `--dur-*` e `--ease-*`, cada um com regra de movimento reduzido; vibração mapeada por evento | contrato visual: nenhuma animação sem regra de reduced motion |
| D11 | Acessibilidade medida | Varredura automática no headless (nomes, papéis, foco visível, contraste de tudo que é texto) em todas as telas e nos dois temas; correções | teste novo no portão com zero achados |
| D12 | Guia visual vivo | `/ds` completo: tokens (inclusive escala, densidade, acentos, superfícies), componentes com estados, capturas de referência das telas; checklist de design por leva | o portão confere que todo componente usado está no catálogo |

**D1 · Fundamentos: escala e densidade** ✅ (leva 138, 03/10/2026)
- **Entregue:** dois tokens multiplicadores no `:root` — `--escala-texto` (pequena .92 · média 1 · grande 1.12)
  dentro de todos os `--text-*`, e `--densidade` (confortável 1 · compacta .85) dentro de todos os `--space-*`;
  aplicados por atributo no `<html>` (`data-escala`, `data-densidade`), guardados em `ui.aparencia` (vai no backup
  v3) e reaplicados no `init` do tema (`theme.setAparencia`, `theme.aparencia`). O alvo de toque (`--tap-min`)
  não encolhe. A tela de Ajustes que expõe isso é a D2; nesta leva muda-se pelo gancho de teste e pela preferência.
- **Literais zerados nos componentes:** 14 `font-size`, 9 durações e 5 raios viraram tokens — novos `--text-2xs`,
  `--text-3xs`, `--simbolo-sm/md/lg/xl` (símbolos de mana e custos), `--dur-4` (chegada de carta, troca de vez),
  `--dur-giro` (carregando), `--radius-0` (trilhos e sublinhado), `--radius-tile` (ladrilho da marca).
- **Aviso que não atravessa telas:** `fechaToast()` no roteador; o aviso com ação ("Nova versão pronta") fica.
- **Medido (mesa, 360×780, começo da partida):** compacta devolve ≈ 25 px de campo; grande mantém os alvos em 44 px
  e nenhuma sobreposição nas quatro combinações (capturas padrão · grande · compacta · pequena+compacta).
- **Guarda-corpos:** contrato visual — zero `font-size`/`ms`/`border-radius` literal nos componentes; tokens de
  texto e espaço são `calc(... var(--escala-texto|--densidade))`; os seletores de atributo existem; `--tap-min`
  fixo. U (`theme.unit`: atributos, inválido cai no padrão, guardado volta no init). e2e "D1" (escala grande e
  pequena mudam a mesa inteira na proporção certa, densidade compacta encolhe espaços, alvos ≥ 44 em todos,
  `auditaTela` em grande e em compacta, preferência sobrevive à recarga, aviso some ao trocar de tela e o com ação
  fica).
- **Fora:** a interface de Ajustes (D2); escala por tela.

**D2 · Ajustes e Aparência** ✅ (leva 140, 03/10/2026)
- **Entregue:** seção **Aparência** na tela Perfil: Tema (Escuro · Claro, segmentado com lua e sol), **Cor de
  destaque** (Latão · Cobre · Prata · Jade, chips com amostra), Tamanho do texto (Menor · Normal · Maior),
  Densidade (Confortável · Compacta), Menos movimento e Vibração (chips liga/desliga). Tudo aplica na hora,
  vale neste aparelho (`ui.aparencia`) e vai no backup completo.
- **Acentos por token:** `:root[data-acento=…]` redefine o quarteto `--accent/--accent-hover/--accent-fg/
  --accent-soft` nos dois temas, com AA sobre fundo e superfície e texto do botão legível (contrato visual
  confere os três acentos novos × dois temas); amostras `--acento-*` por tema. **Menos movimento** por escolha
  zera animações e transições (`:root[data-movimento="reduzido"]`), além do que o sistema já pede. **Vibração**
  liga/desliga pela camada de plataforma (`haptics.ligar`), inclusive a instância padrão usada pela mesa,
  gestos e scanner.
- **Correção no caminho:** os dois chips de liga/desliga passaram a alternar a partir do estado atual do tema,
  não do desenho, para dois toques rápidos não se perderem.
- **Testes:** U (`theme.unit`: acento, movimento e vibração com validação e aviso a quem ouve; `ds.unit`:
  vibração desligada não chama o aparelho); contrato visual (AA dos acentos, amostras nos dois temas); e2e "D2"
  (cada controle muda o `<html>` e o app na hora — o primário fica com o acento novo —, persiste após recarga, a
  vibração desligada não vibra, o backup leva a aparência; `auditaTela` em escuro padrão, jade+grande+compacta e
  claro). Expectativas da D1 e da leva 123 estendidas com o motivo no teste (aparência com cinco campos; contrato
  da vibração com liga/desliga).
- **Fora:** acento por tela; cor do oponente (D7); nome "Ajustes" como tela própria (fica em Perfil até D5).

**D3 · Início que lembra de você** ✅ (leva 141, 03/10/2026)
- **Entregue:** cabeçalho **"Olá, Nome"** quando há perfil (a frase de apresentação só aparece sem perfil, e
  virou uma linha: "Listas, coleção, scanner e mesa com regras."); cartão **Continuar** acima dos atalhos, uma
  linha por coisa a retomar, a linha inteira é o toque: **partida em andamento** (jogadores · ações, ou placar e
  jogo da série, ou "online · sala ESTA-XXXX") abre a mesa; **última lista aberta** (registrada em
  `ui.ultimaLista` ao abrir a tela da lista; some se a lista foi apagada) abre a lista; **pilha do scanner**
  (N cartas esperando conferência) abre o scanner. Com partida salva, o atalho Jogar deixa de ser o primário:
  a linha da partida é o caminho principal. Sem nada a retomar, o cartão não existe.
- **Painel "Sem internet":** com tudo guardado e rede, recolhe em **uma linha** (anel de 44 px, "Tudo pronto",
  botão **Detalhes**) de no máximo 72 px; "Detalhes" abre no lugar as linhas por item, o espaço e "Conferir de
  novo" (`aria-expanded`/`aria-controls`). Faltando algo, sem rede ou com aviso de preparo, continua aberto como
  antes. Divergência da história: abre **no lugar**, não em folha — mantém os ids e os testes O1/Q10/U12 e evita
  uma camada para ler cinco linhas.
- **Medido (360×780, escuro):** topo do atalho Jogar **209 → 151 px sem perfil (−58) e 130 px com perfil
  (−79)**; o cartão Continuar com partida e lista ocupa 151 px e empurra os atalhos para 297 px, de propósito:
  o que está no meio vem antes do que começa do zero.
- **Testes:** e2e "D3" (vazio sem cartão; "Olá, Gui" e frase escondida; linha da lista abre a lista; linha da
  partida abre a mesa e tira o primário dos atalhos; pilha do scanner com contagem; cada linha ≥ 44 px com nome
  falado completo; `auditaTela`; lista apagada sai do cartão). Expectativa de O1 mudou com o motivo no teste:
  com tudo pronto o painel está recolhido (≤ 72 px) e o teste abre "Detalhes" antes de ler as linhas.
- **Fora:** sugestão de "próxima lista" ou "jogar de novo" por histórico; cartão com miniatura da carta; tempo
  relativo ("há 2 h") — entram se o uso pedir.

**D4a · Estados vazios de Listas e Coleção** ✅ (leva 142, 03/10/2026) — a D4 foi partida em duas: esta (os vazios) e
a D4b (onboarding). O vazio de Cartas é o cartão "Base local", que a D5 leva para Ajustes › Dados; o do Scanner é
pilha de avisos e fica com a D8.
- **Entregue:** componente `Empty` com `titulo` e variante `hero` (ícone de 88 px no acento, título em display,
  uma frase, ações centradas, sem tracejado). **Listas vazia:** "Nenhuma lista ainda" com **Ver prontas**
  (primário) e **Nova lista**; os botões Prontas/Nova do título e o cartão de backup saem (repetiam o cartão);
  **Mais** abre uma folha com **Restaurar backup** — o que quem chega de outro aparelho procura. **Coleção vazia:**
  "Sua coleção está vazia" com **Escanear** (primário) e **Colar lista**; **Abrir CSV**, **Pelo nome** e **Buscar**
  como botões discretos; busca/filtro, botões do título e a seção Adicionar somem — "Pelo nome" abre a seção no
  lugar e foca o campo. Com o primeiro item tudo volta ao lugar de sempre (os botões Colar lista e Abrir CSV são
  os mesmos nos dois estados, por isso os ids `#col-import`/`#col-csv-import` não mudaram).
- **Medido (360×780):** as duas telas vazias cabem sem rolagem (Coleção tinha 909 px, Cartas segue com 1090 até
  a D5); de 6 e 11 botões visíveis para 3 (2 sólidos + Mais) e 5 (2 sólidos + 3 discretos).
- **Testes:** e2e "D4a" (ícone, título, exatamente 2 sólidos e 1 primário em cada vazio, botões do título e backup
  escondidos, folha Mais, sem rolagem, `auditaTela`, "Pelo nome" foca o campo, tudo volta com o primeiro item);
  ajuda `digitaCarta` em 5 testes que digitavam na coleção vazia; "criar lista…" passa a tocar
  `#decks-new-empty` (o Nova do título não existe na estante vazia). Contrato visual verde.
- **Fora:** vazios de Cartas (D5) e Scanner (D8); vazio da busca de cartas sem rede já tinha ícone (U4).

**D4b · Apresentação de primeira abertura** ✅ (leva 145, 03/10/2026) — decisão tomada com a opção recomendada:
na primeira abertura, pulável (não como "Ajuda" escondida).
- **Entregue:** folha **"Bem-vindo à Estante"** com três passos, um por vez — *Tudo fica no aparelho*
  (listas e coleção guardadas, sem internet, backup), *Jogue com regras de verdade* (Shark, sozinho ou a dois,
  motor cuida de turno, pilha e vida), *Do seu jeito* (nome, foto, tema, acento, texto no Perfil) — ícone grande
  no acento, pontos de progresso com nome falado ("Passo 1 de 3"), **Pular** desde o primeiro passo, **Próximo**,
  e no último **Abrir perfil** ou **Começar**. Aparece **uma vez só** por aparelho (`ui.apresentacao`); fechar de
  qualquer jeito (X, Escape, toque fora) conta como vista — a marca é gravada ao abrir, por isso não insiste. O Perfil ganhou
  **Rever apresentação**. Abre depois de a tela de trás estar pintada, e o foco volta para ela ao fechar.
- **Testes:** e2e "D4b" (três passos, um primário por passo, Pular visível, `auditaTela`, Começar devolve a tela,
  não volta ao recarregar, Escape também marca como vista em contexto limpo, Rever no Perfil, Abrir perfil leva ao
  perfil). O harness `open()` passa a pular a apresentação em todos os testes (gancho `__SEM_APRESENTACAO` no
  contexto, inclusive nas abas da partida online); só `open(t, { apresentacao: true })` a vê.
- **Fora:** apresentação por tela (dicas no primeiro uso da mesa ou do scanner); vídeo ou animação; pedir o nome
  dentro da apresentação (o Perfil está a um toque).

**D5 · Dados e administração num lugar só** ✅ (leva 150, 03/10/2026)
- **Entregue:** seção **Dados** no Perfil, nesta ordem: **Backup completo** (arquivo), **Conta Google** (nuvem,
  atrás do Client ID), **Base local de cartas** (contagem, Importar, Exportar e Limpar — agora com confirmação) e
  **Espaço no aparelho** (espaço usado e proteção contra limpeza, com "Proteger armazenamento" quando vulnerável; o
  mesmo que o painel da tela inicial mostra). **Listas** perdeu o cartão de backup (a estante vazia continua
  oferecendo "Restaurar backup" em Mais). **Cartas** abre direto na busca: o cartão "Base local" e a frase de
  apresentação saíram; `painelBaseLocal` é um componente do módulo de cartas, com os mesmos ids de antes.
- **Nome da tela:** continua "Perfil" (avatar na barra). Renomear para "Ajustes" fica para quando a tela tiver
  mais ajustes do que perfil — hoje são três grupos (Perfil, Aparência, Dados) e o avatar é o caminho natural.
- **Medido (360×780, sem rede):** Cartas, campo de busca de 578 px para 230 px do topo; tela de 1090 px para 780 (sem
  rolagem com o aviso de rede). Listas com listas: de 2 cartões para 1.
- **Testes:** e2e "D5" (Cartas sem painel e campo no alto; busca alimenta a base; Listas sem backup; Perfil › Dados
  com os quatro blocos na ordem, contagem viva, ícones, Limpar pede confirmação, `auditaTela`). Expectativas
  mudadas com motivo: U2 parte 2 (Listas sem backup), U2 parte 3 (base local fora de Cartas), Leva 128 (backup só no
  Perfil), D4a (sem asserção sobre o backup em Listas).
- **Fora:** "Apagar tudo" (limpar listas, coleção e perfil de uma vez) — ação destrutiva que pede desenho próprio
  com desfazer; renomear Perfil → Ajustes; cache de imagens como item de Dados (entra se o espaço apertar).

**D7 · Mesa: superfície, cor do oponente e verso** ✅ (leva 151, 03/10/2026) — feita antes da D6 de propósito: a D6
mexe nas mesmas linhas da mesa que a trilha motor está revisando (R5 moveu Auras e terrenos); esta só acrescenta
tokens, um atributo no `<html>` e o verso.
- **Entregue:** em Perfil › Aparência, bloco **Mesa**: **Superfície** (Nogueira · Feltro · Pedra · Linho), **Cor do
  oponente** (Azul · Rubi · Ametista) e **Verso de carta** (Estante · Selo · Trama), cada chip com amostra. A
  superfície só vale na tela da partida (`body[data-tela="partida"]` troca `--bg` e os veios pelos `--mesa-*`): o
  resto do app continua o móvel de sempre. A cor do oponente redefine o trio `--player-opp*` nos dois temas (faixa
  "vez do oponente", lado aceso, avatar). Os versos são três desenhos próprios só com tokens (`.ds-verso`), sem
  marca; ficam no catálogo `/ds` com as amostras.
- **Regra respeitada no caminho:** a carta **virada para baixo do outro jogador** passou a mostrar o verso — sem
  nome, sem imagem, só o que é público (2/2, "virada para baixo"); espiar e abrir a folha também não revelam. Antes
  a mesa mostrava a face para quem não devia ver (hot-seat e online). Quem conjurou continua vendo a própria carta
  com a marca.
- **Medido:** contrato visual confere `--fg` e `--fg-muted` AA (≥ 4,5) sobre cada superfície nos dois temas, texto
  sobre a cor do oponente ≥ 4,5 e a cor sobre o fundo ≥ 3, versos sem cor literal; e2e em 360×780 (`auditaTela`
  na Aparência e na mesa com feltro e verso).
- **Testes:** U (`theme.unit`: três campos novos com validação, padrão sem atributo, guardado volta no init;
  expectativa da D1/D2 estendida com motivo); contrato visual "D7"; e2e "D7" (chips, aplica na hora, fundo só na
  partida, persiste após recarga; partida hot-seat com Birchlore Rangers virada para baixo: Ana vê a carta, Bia vê
  o verso e a folha não revela).
- **Fora:** verso como imagem do usuário; superfície por foto; cor do oponente por jogador na partida online
  (cada aparelho escolhe a sua); animação de virar a carta (D10).

**D6 · Mesa: relance** ✅ (leva 152, 03/10/2026)
- **Entregue:** com o campo vazio, o lado do jogador é só a linha de vida e zonas — as linhas "Terrenos nenhum" e
  "Permanentes nenhuma" não existem até a primeira carta entrar (o nome falado do lado diz "campo vazio";
  `data-campo` marca); com uma das duas zonas vazia ela continua como linha fina. **Zeros apagados:** chip de zona
  com 0 perde borda, fundo e peso (fica `data-zero`), mas continua um alvo de 44 px que abre a zona. O grimório e
  qualquer contagem > 0 seguem como antes.
- **Medido (360×780, Delver × Goldfish, início da partida):** cada lado **121 → 72 px**; os dois lados **242 → 144
  px**, **98 px de campo ganhos** (meta ≥ 60). Depois do primeiro terreno: "Terrenos · 1" + "Permanentes nenhuma"
  numa linha fina.
- **Divergência da história:** "registro e resumo em folha" ficou de fora de propósito: o resumo dos últimos turnos
  (`#tb-resumo`) é o que diz o que o oponente fez enquanto você não olhava, e já some com um toque (OK); o registro
  completo já é uma folha. Tirá-los da mesa pouparia pixels só depois do início e esconderia leitura útil.
- **Testes:** e2e "D6" (altura dos lados ≤ 81 px no início contra 121, nenhuma `.tb-zone` com campo vazio,
  `data-campo` e nome falado, zero sem borda e com 44 px, grimório com borda, primeiro terreno traz "Terrenos · 1" e
  a linha fina de Permanentes, `auditaTela`). U5/U7/R2/R5 da mesa continuam verdes.
- **Fora:** colapsar o lado do oponente inteiro quando ele está fora da partida; esconder o chip de exílio até a
  primeira carta exilada (é alvo de toque para ver o que já saiu).

**D8 · Avisos e retorno no lugar** ✅ (leva 153, 03/10/2026) — **sem o scanner**, de propósito: a trilha scanner tem a
X16 (tela nova, estados desenhados) planejada em cima das mesmas notas; mexer nelas aqui cruzaria as duas. A medida
"≥ 120 px devolvidos à moldura" fica com a X16.
- **Entregue:** componente **`LinhaEstado`** no DS — os avisos de uma tela numa linha só (ícone + rótulo curto por
  item, tom pelo pior; o toque abre a folha com os textos completos; nome falado lista os itens). Na **tela da lista**
  ela junta "Sem internet", erros e avisos de validação (ou "Válida · Formato") no lugar do aviso de rede + nota
  empilhada. Componente **`confirmaBotao`**: ✓ e rótulo curto no próprio botão por 1,2 s, antes do aviso flutuante —
  em Copiar sem script e Copiar da exportação ("Copiado"), Salvar do perfil ("Salvo"), Exportar backup
  ("Exportado") e no + de adicionar carta ("Somou"). Ícone novo `alerta`.
- **Correções no caminho:** em 360 px com o chip "Sem rede" na barra, os destinos vazavam para o lado (382 px); agora
  apertam o passo. A frase "base local vazia" em Cartas aponta para Perfil › Dados (D5).
- **Medido (360×780, lista sem rede):** duas notas (52 + 101 px) viram uma linha de 44 px — **109 px devolvidos** à
  lista de cartas.
- **Testes:** e2e "D8" (lista nova sem rede: uma linha ≤ 48 px, nenhuma nota na tela, itens com tom, nome falado,
  folha com uma nota por item, `auditaTela` com o chip Sem rede; ✓ no botão de copiar e volta ao rótulo; Salvar vira
  "Salvo"). Quatro testes que liam os textos de validação no `main` passaram a abrir a folha (`estadoDaLista`),
  com o motivo no teste.
- **Correção depois de publicada (leva 158):** o portão do CI ficou vermelho na 157 só no e2e "D8": com a fonte de
  sistema do CI (mais larga), o aperto que a D8 deu nos destinos da barra fazia "Coleção" encostar em "Sem rede".
  Agora, sem internet em tela até 379 px, o chip fica só com o ícone e o ponto (nome falado mantido) e o botão de tema
  sai da barra (o tema continua em Perfil › Aparência); os destinos não encolhem. O e2e "D8" passou a auditar a tela
  também com fonte larga, para o portão local pegar o que só o CI via.
- **Fora:** scanner (X16); linha de estado na coleção (os avisos dela já são contextuais: backup e armazenamento);
  ✓ nos botões da mesa (o retorno lá é o próprio estado do jogo).

**D9 · Coleção e cartas: ver e trabalhar** ✅ (leva 154, 03/10/2026) — **recorte menor que o planejado, por causa da
leva 149 (U17):** enquanto esta leva esperava o portão, a leva 149 (pedido do usuário em outra conversa) transformou
Painel e Adicionar carta em blocos expansíveis **abertos por padrão**, com o painel resumindo o recorte quando
fechado. A D9 trazia "painel recolhido por padrão"; o pedido do usuário vence, e esta leva **cedeu** essa parte no
rebase (nada dela ficou no código). Divergência registrada: a primeira carta continua abaixo dos dois blocos
abertos até o usuário fechá-los (fica lembrado).
- **Entregue:** **Agrupar e Ordem** dividem a linha (antes duas linhas de 44 px); **Desfazer importação** numa linha
  — texto, ícone de desfazer (nome falado "Desfazer a importação") e X — em vez de três linhas em 360 px.
- **O que já existia e ficou como está:** filtros em folha com contagem ao vivo (C12), visão densa com símbolos,
  seleção múltipla com barra (C13), galeria por token (contrato visual).
- **Testes:** e2e "D9" (agrupar/ordem lado a lado, desfazer numa linha com alvos de 44 px e nome falado, ordem
  painel › filtro › lista preservada, `auditaTela`). C14 segue o padrão da leva 149 (aberto; recolher lembrado).
- **Fora:** o painel recolhido por padrão (decidido pela leva 149); miniatura maior na visão densa.

**D10 · Movimento com sistema** ✅ (leva 155, 03/10/2026)
- **O que já havia:** a regra global de menos movimento (sistema) desde a U-era e a da escolha (D2); durações em
  `--dur-1…4` e `--dur-giro` (D1). Faltavam os pulsos (1,2 s · 2,4 s · 1,2 s em literal), um `ease-in-out` solto, a
  vibração sem vocabulário (8, 12, 30 ms espalhados) e nada no catálogo.
- **Entregue:** tokens **`--dur-pulso`** (atenção: ligação caindo), **`--dur-pulso-lento`** (sem internet na barra)
  e **`--dur-brilho`** (carregamento do visor), aplicados; `ease-in-out` por token. **Vibração por evento** na
  camada de plataforma — `haptics.evento('toque' | 'confirmacao' | 'alerta' | 'turno')`, catálogo
  `EVENTOS_HAPTICOS` (8 · 12 · 30 · [12, 40, 12]) — usada no pulso de posse da lista, em Salvar do perfil, na
  espiada da carta, na mão recolhida e na mensagem nova do chat; **a vez chegando a você vibra com o padrão de
  turno** (hot-seat e online). Seção **Movimento** no `/ds`: cada duração com nome, uso e demonstração, e os quatro
  eventos de vibração para sentir no aparelho.
- **Portão:** contrato visual "D10" — a regra global de menos movimento existe (sistema e escolha), nenhuma duração
  em segundos fora de token (0s de atraso é legítimo), toda animação nomeada tem `@keyframes` e todo `@keyframes` é
  usado, tokens de pulso existem. Os três literais do scanner (`.scan-*`, leva 112) ficam fora da regra, declarados
  para a X16 da trilha scanner. U (`ds.unit`: eventos, sequência do turno, desligada não chama o aparelho; contrato
  da plataforma com `evento`); e2e "D10" (catálogo com 8 durações e demo pelo token, botão do evento vibra
  [12, 40, 12], chip sem rede pulsa em 2,4 s, a vez de Bia chega com o padrão de turno no hot-seat, menos movimento
  por escolha zera a demo).
- **Fora:** transições de troca de tela (o router troca seco de propósito: no celular a animação de rota custa
  quadros); animação de virar a carta (verso ↔ face); sons.

**D11 · Acessibilidade medida** ✅ (leva 156, 03/10/2026)
- **Medição:** `axe-core` 4.13 (devDependency nova — a única desde o Playwright; justificativa: é o motor de
  contraste e de nomes/papéis de referência, roda dentro da página no headless, sem rede) com as regras WCAG 2.1
  A/AA e boas práticas, em **12 telas e folhas** (início, listas, lista, coleção, folha de filtros, cartas, scanner,
  preparar partida, partida, perfil, apresentação, catálogo) **nos dois temas**, em 360×780. Varredura inicial:
  **5 achados**; depois das correções, **zero**.
- **Correções:** os três `select` da coleção (agrupar, ordenar, lista para montar) sem nome acessível — `Select`
  ganhou `ariaLabel`; a tela da partida não tinha título de nível 1 — `h1` só para leitor de tela ("Mesa"), classe
  `ds-sr-only` no DS; no tema claro, `--fg-subtle` passou de 4,44 para 5,33:1 sobre a superfície elevada (#5f4f36)
  e o cabeçalho de grupo das listas (latão sobre a estante, 3,55:1) passou a usar o token novo `--fg-grupo` (latão no
  escuro, 6,1:1; texto apagado no claro, ≥ 4,5).
- **Portão:** e2e "D11" falha com a lista de achados (tema · tela: regra · alvos) se qualquer tela regredir; falha
  também se o `axe-core` não estiver instalado (clone antigo sem `npm install`).
- **Fora:** leitura com leitor de tela real (TalkBack/VoiceOver) — só o aparelho confirma; teclado completo no
  desktop (o app é celular primeiro); regras AAA.

**D12 · Guia visual vivo** ✅ (leva 157, 03/10/2026) — fecha o épico E53 (D1–D12, levas 138–157, um dia de trabalho
da trilha geral em paralelo às trilhas bot, motor e scanner).
- **Entregue:** `/ds` passa a ser o guia: seção **Tokens** com as 21 cores lidas do documento no momento (mudam com
  tema, acento e superfície), escala de texto (9 passos) e espaço (8) multiplicados pela Aparência, raios, e a lista
  do que a Aparência oferece; **Botões** com estados (confirmado ✓, chip ligado/desligado, destino da barra, atalho e
  atalho principal); **Perfil e progresso** (avatar sem perfil, com inicial; anel 0 · 45 · 100); **Estados** com o
  vazio de primeiro uso, o vazio simples, a linha de estado, o aviso de rede e as notas; **Sobreposições** com o
  aviso com ação; **Checklist de design por leva** (8 itens, o que o portão mede e o que a revisão olha) e o comando
  das capturas de referência.
- **Portão:** contrato visual "D12" — todo componente visual exportado pelo DS aparece no catálogo (lista de
  utilitários não visuais declarada), as nove seções existem e os ids do guia estão lá; e2e "D12" (21 tokens de cor
  com o valor que está valendo, troca de acento reflete no guia, 9 textos, 8 espaços, 8 itens do checklist, estados
  presentes, ✓ no botão, `auditaTela`).
- **Arrumação:** o bloco da D5 estava duplicado no ROADMAP por uma junção automática (`merge=union`) entre levas;
  ficou um só, e a D11 foi para depois da D10.
- **Fora:** capturas de tela guardadas no repositório (pesam e envelhecem; o comando gera na hora); página de
  componentes por tela (o guia é por componente, de propósito).

**Fora do épico (escopo negativo mantido):** tablet e paisagem; temas enviados por terceiros; sons; gerador de
decks, sugestão de cartas, ranking, marketplace.

**Depende do usuário:** teste no aparelho das levas 138–157 (as que mais mexem na tela do dia a dia: D2/D7 em Perfil ›
Aparência, D3 no início, D6 na mesa, D9 na coleção); OAuth Client ID (`GOOGLE_CLIENT_ID`) e URL do Firebase
(`FIREBASE_DB_URL`) continuam pendentes das levas 129 e 134. A decisão do onboarding foi tomada na D4b com a opção
recomendada (primeira abertura, pulável; "Rever" no Perfil).

### G · Gestão com valor e partida sensorial (E54, pedido de 04/10/2026)

**Pedido:** agrupar cartas na coleção e nas listas; preço em dólar, real e euro com cotação por API; valor
acumulado da coleção, das listas e dos agrupamentos; sons e efeitos visuais na partida (compra, ataque, dano, cura,
anulação, destruição, descarte, remoção global, aprimoramento).

**Decisões de desenho (declaradas ao usuário antes de executar):** agrupamento por **etiquetas** coloridas (uma
carta ou lista pode ter várias), não por pastas exclusivas; som **sintetizado no aparelho** (zero arquivo de áudio,
funciona offline, cabe no arquivo único da ADR-02); "cotação em tempo real" é a mais recente que a API pública dá.

| Ordem | História | Entrega em uma frase |
|---|---|---|
| G1 | Preço em três moedas | detalhe da carta com US$, R$ e €, normal e foil; cotação guardada no aparelho |
| G2 | Etiquetas | criar, colorir e aplicar etiquetas em cartas da coleção e em listas; filtrar por chip |
| G3 | Valor acumulado | coleção inteira, recorte do filtro, cada etiqueta e cada lista, nas três moedas |
| G4 | Som na partida | motor de eventos puro + sons sintetizados, com liga/desliga e volume |
| G5 | Efeitos visuais na partida | um efeito por evento, por tokens de movimento, com menos movimento respeitado |

**G1 · Preço em dólar, real e euro** ✅ (leva 163, 04/10/2026)
- **Entregue:** no detalhe da carta, seção **Preço** com uma linha por acabamento (Normal, Foil) e três colunas:
  **US$** (TCGplayer, pela Scryfall), **R$** (dólar × cotação) e **€** (Cardmarket, pela Scryfall, quando existe;
  senão o dólar convertido — a dica do valor diz qual é). Abaixo, "Dólar a R$ X · cotação de DD/MM HH:MM · fonte".
  Carta sem preço na Scryfall diz **"Sem preço"**; nada é estimado.
- **Cotação do dólar:** módulo novo `src/data/cambio.js` (`__m31`). Três fontes públicas sem chave, tentadas em
  ordem — AwesomeAPI, Frankfurter (BCE), ExchangeRate-API — com validação de faixa (resposta estranha é descartada).
  Guardada no aparelho (`cambio.usd`), vale por uma hora; sem internet vale a última, marcada "a última guardada";
  sem nunca ter tido cotação, o real fica em branco com a explicação. Duas telas pedindo juntas fazem uma busca só.
- **Limites declarados:** o preço é o que a Scryfall tinha quando a carta foi buscada (ela atualiza uma vez por
  dia; carta guardada há tempo mostra preço antigo). O formato da AwesomeAPI não pôde ser conferido daqui em
  04/10/2026 (a consulta devolveu 429); se ele mudar, a validação descarta e a segunda fonte responde. Frankfurter
  e ExchangeRate-API foram conferidas em 04/10/2026 (USD→BRL 5,22; USD→EUR 0,89).
- **Testes:** U `cambio.unit` ×4 (formato de cada fonte e descarte; ordem das fontes, guarda, validade, sem rede,
  busca única; preços normal/foil, euro de mercado × convertido, só euro, sem preço; escrita brasileira dos
  valores); e2e "leva 163" (três moedas nas duas linhas, legenda da cotação, carta sem preço, cotação guardada sem
  nova busca e valendo sem internet, `auditaTela`). O harness aborta as três fontes por padrão.
- **Correção de arrumação:** saiu do repositório o arquivo `undefined/x.png`, uma captura que a trilha geral deixou
  escapar na leva 133.
- **Fora:** escolher a moeda principal; histórico de preço; preço por impressão na lista de impressões (G3 usa a
  impressão padrão e declara).

**G2 · Etiquetas em cartas e listas** ✅ (leva 166, 04/10/2026)
- **Decisão de desenho:** etiqueta, não pasta. Uma carta ou lista pode ter várias ("Troca" e "Pauper" ao mesmo
  tempo); nada "mora" num lugar só e nada precisa ser movido. Uma etiqueta = nome (até 24 letras) + uma de seis
  cores do próprio design system (latão, cobre, jade, azul, rubi, ametista). O conjunto é um só para cartas e listas.
- **Coleção:** fileira de chips logo abaixo da busca (ponto de cor, nome e quantas cartas); um toque filtra, vários
  ligados somam ("tem qualquer uma"). O recorte conta no botão Filtros, vai para o link (`x=`), entra nas visões
  salvas e na exportação "Filtradas". Cada linha (visões Lista e Densa) mostra os pontos das etiquetas da carta.
- **Aplicar:** (a) várias de uma vez — Selecionar → toque nas cartas → **Etiquetar**; a folha mostra cada etiqueta
  com caixa de três estados (todas, em parte, nenhuma) e um toque liga ou desliga em todas; (b) numa carta só —
  abrir a carta → **Etiquetas**. Criar uma etiqueta com cartas escolhidas já aplica nelas.
- **Gerir, no lugar:** a mesma folha cria (campo + cor, Enter cria), renomeia, troca a cor e apaga. Apagar pergunta
  dentro da folha, dizendo quantas cartas e listas perdem a etiqueta; nada sai da coleção nem das listas.
- **Listas:** botão **Etiquetas** sob o nome da lista, junto das etiquetas por extenso (leva 170: saiu da linha de
  Editar/Exportar/Excluir, onde derrubava o Excluir para a linha de baixo com a fonte larga do CI); na estante,
  pontos em cada linha e chips de filtro só das etiquetas que têm lista.
- **Barra de seleção** refeita em duas fileiras (contagem, Todas, sair / Etiquetar, Exportar): antes eram três em 360.
- **Dados:** módulo novo `src/data/etiquetas.js` (`__m32`), modelo puro + serviço; chave `etiquetas` no aparelho,
  incluída nas preferências do backup (v3) — restaura junto. Excluir uma lista tira as marcas dela. Etiqueta
  apagada (ou vinda de link de outro aparelho) sai do filtro em vez de esconder a coleção.
- **Medido em 360×780:** chips e amostras de cor com 44 px; as seis cores numa fileira; sem rolagem lateral;
  `auditaTela` em seis telas (folha gerindo e aplicando, coleção selecionando e filtrada, lista, estante filtrada).
- **Testes:** U `etiquetas.unit` ×5 (criar/renomear/apagar sem mexer no estado recebido; marcar em lote, três
  estados, contagem; saneamento do que vem guardado; serviço, releitura pós-backup e chave no backup; filtro por
  etiqueta, link e descrição); e2e "G2 etiquetas" (fluxo inteiro na coleção e nas listas).
- **Fora (declarado):** etiquetar pela Galeria e pelas Pilhas (a seleção múltipla só existe na visão Lista);
  agrupar a coleção por etiqueta no seletor "Agrupar"; etiqueta por impressão (vale para a carta, todas as
  cópias); o link com filtro de etiqueta só faz sentido no próprio aparelho (os ids são locais). Valor em dinheiro
  por etiqueta é a G3.

- **Correção (leva 170, 04/10/2026):** o portão do CI ficou vermelho na 168 e na 169 — "excluir ao lado de editar"
  (e2e U2 parte 2). O botão de etiqueta era o quarto na linha de ações da lista; com a fonte de sistema do CI, mais
  larga, o Excluir descia. O portão local não via porque mede com a fonte daqui. O botão foi para baixo do nome e
  o teste passou a conferir a linha **também com a fonte larga** (falha no código antigo, passa no novo).

**G3 · Valor acumulado da coleção, das etiquetas e das listas** ✅ (leva 167, 04/10/2026)
- **Coleção (Painel):** bloco **Valor** com uma linha por recorte — **Coleção** (tudo), **Recorte** (aparece com
  filtro ligado, em destaque, com a descrição do filtro) e **uma linha por etiqueta** que tem carta. Cada linha
  mostra o real em destaque e, embaixo, dólar e euro. Com o painel fechado, o cabeçalho diz "N cópias · R$ X".
- **Lista:** bloco **Valor** abaixo do resumo — **Lista inteira**, **Deck** e **Reserva** (quando há reserva) e
  **Falta comprar** (as cópias que não estão na coleção, contadas pelo nome somando as zonas).
- **Estante:** valor em cada linha de lista e o **total das listas à vista** (com chip de etiqueta ligado, é o
  total daquela etiqueta).
- **Como a conta é feita (declarado na tela):** soma cópia a cópia do preço em dólar que a Scryfall guardou para a
  carta (TCGplayer), **na impressão padrão** — não na impressão exata que a pessoa marcou; foil pelo preço foil,
  etched pelo etched, e o outro acabamento quando só ele tem preço. Real e euro do total saem da cotação do
  dólar (G1); o euro do total é convertido, não o do mercado europeu. Cópia sem preço **fica fora e é contada**
  ("4 cópia(s) sem preço ficam fora da soma"). Sem cotação, o total sai em dólar e a tela diz por quê.
- **Limites declarados:** é estimativa, não avaliação — preço da impressão padrão pode ficar longe do de uma
  edição antiga ou especial; preço guardado envelhece até a carta ser buscada de novo; na estante só entram
  cartas já guardadas no aparelho (lista nunca aberta aparece sem valor ou com "N sem preço").
- **Testes:** U `cambio.unit` +2 (soma por acabamento, sem preço, arredondamento de centavos, número em destaque
  e nota; coleção impressão a impressão, lista com deck/reserva/falta); e2e "G3 valor acumulado" (sem cotação em
  dólar; com cotação nas três moedas; recorte; etiqueta; painel fechado; lista com e sem reserva; estante),
  com `auditaTela` em quatro telas.
- **Fora:** preço pela impressão exata (pede buscar cada impressão na Scryfall); ordenar a coleção por preço;
  histórico de valor; escolher a moeda em destaque.

**G4 · Som na partida** ✅ (leva 168, 04/10/2026)
- **Decisão de desenho:** som **sintetizado no aparelho** (WebAudio), zero arquivo de áudio — funciona offline, não
  pesa no download e cabe no arquivo único (ADR-02). Cada som tem de 1 a 4 vozes curtas (oscilador ou ruído
  filtrado), menos de um segundo, passando por um compressor para nada estourar no alto-falante do celular.
- **Motor de eventos (puro, `src/app/sentidos.js`, `__m33`):** `eventosSensoriais(antes, depois)` compara dois
  estados do motor e diz o que aconteceu na mesa: **compra, descarte, terreno, conjurar, anulação, entrar no
  campo, ficha, aprimorar** (marcador +1/+1 ou bônus de força), **enfraquecer, ataque, bloqueio, dano em criatura,
  dano em jogador, ganho de vida, criatura destruída/morta, exílio, devolver à mão, remoção global** (três ou mais
  permanentes saindo do campo de uma vez, fora do dano de combate), **troca de turno e fim de partida**. Não mexe no
  motor (ADR-04) e não depende de quem jogou: vale para o Shark e para a partida online. É a mesma lista que a G5
  usa para os efeitos visuais.
- **Sons (20):** comprar, descartar, baixar terreno, conjurar, entrar no campo, aprimorar, enfraquecer, atacar,
  bloquear, dano em criatura, dano em jogador, ganhar vida, anular, criatura destruída, exilar, devolver à mão,
  remoção global, sua vez, vitória, derrota. Quando várias coisas acontecem juntas (o turno inteiro do Shark), tocam
  no máximo quatro, espaçados, sem repetir; fim de partida, remoção global, dano e anulação nunca são cortados.
- **Controle:** chip **Som** no balão da faixa de turno da mesa (um toque na faixa abre; vale também na partida
  online); em Perfil › Aparência › Mesa, chip **Som**, **volume** e **Ouvir sons** (folha com os vinte, um toque toca). Guardado no
  aparelho (`mesa.som`) e levado no backup. Ligado por padrão a 60%. **Desfazer não toca nada.**
- **Limites declarados:** (1) anulação e "conjurou e já resolveu" dependem dos eventos da jogada feita neste
  aparelho; na partida **online**, a jogada do outro lado chega só como estado, então uma mágica anulada lá soa
  como conjurar e uma instantânea que resolveu de vez pode soar como descarte. (2) O botão de som não coube na
  linha da faixa (um quarto ícone derruba as ferramentas para a linha de baixo em 360 px — o portão barrou): por
  isso mora no balão. (3) O navegador só
  libera áudio depois do primeiro toque na mesa; no iPhone com a chave de silêncio ligada o som não sai.
  (4) "Remoção global" é reconhecida pelo efeito (três ou mais saindo), não pelo texto da carta.
- **Medido:** cada som renderizado fora de linha a volume máximo — pico entre 0,14 e 0,41 (nada estoura), o mais
  longo com 0,78 s. Balão da faixa com o chip de som em 360×780 sem sobreposição (`auditaTela`).
- **Testes:** U `sentidos.unit` ×6 (zona a zona; combate e força; saída do campo, remoção global × dano de combate,
  anulação, fim; plano de som; receitas, preferências e serviço com áudio de mentira; com o motor de verdade);
  e2e "G4 som na partida" (terreno, sua vez + compra, conjurar + dano sem soar descarte, desfazer silencioso,
  desligar lembrado, volume, as vinte receitas aceitas pelo áudio do navegador, `auditaTela` em três telas).
- **Fora:** música de fundo; som por carta específica; som na coleção e nas listas; vibração por evento de mesa
  (hoje só a troca de turno vibra).

**G5 · Efeitos visuais na partida** ✅ (leva 169, 04/10/2026)
- **Como funciona:** os mesmos eventos de mesa da G4 viram um plano de efeitos (`planoDeEfeitos`, puro): cada item
  diz o efeito e o alvo (uma carta, o marcador de vida, a pilha ou a mesa). A mesa é redesenhada inteira a cada
  jogada, então o efeito é posto **por cima do desenho novo**; a carta que saiu da tela é **fotografada antes** e a
  foto é que se desfaz (camada fixa `#tb-fx`, sem toque, fora do leitor de tela).
- **Um efeito por evento:**
  - **Comprar:** a carta chega à mão deslizando, uma depois da outra.
  - **Baixar terreno:** a carta pousa. **Entrar no campo / ficha:** anel de latão que se abre.
  - **Conjurar:** a pilha pulsa. **Anular:** um anel vermelho se fecha onde a mágica estava.
  - **Atacar:** cada atacante investe para o outro lado da mesa, em fila. **Bloquear:** a criatura firma, com anel.
  - **Dano em jogador:** o marcador de vida treme e fica vermelho, e o número (−3) sobe; se o dano é em você, as
    bordas da tela acendem em vermelho. **Ganhar vida:** o marcador pulsa em verde e sobe o +N.
  - **Dano em criatura:** a carta treme com um clarão vermelho e o número. **Aprimorar:** pulso com anel de latão.
    **Enfraquecer:** a carta murcha e escurece um instante.
  - **Criatura destruída / permanente destruída:** a foto da carta perde a cor, cai e some. **Exilar:** clareia e
    some. **Devolver à mão:** desliza para a mão do dono. **Descartar:** a carta cai da mão.
  - **Remoção global:** a mesa treme, a tela clareia e as cartas se desfazem em fila.
- **Design system:** três tokens novos de duração (`--dur-fx-curto` 320 ms, `--dur-fx` 560 ms, `--dur-fx-longo`
  900 ms), no catálogo de movimento; curvas e cores dos tokens que já existiam; só `transform`, `opacity` e
  `filter` (nada mexe no layout). No máximo 16 efeitos por jogada (o turno inteiro do Shark não vira chuva).
- **Menos movimento** (Aparência ou sistema): sem fantasma, sem clarão e sem tremor; o número aparece **parado**
  ao lado do marcador e sai sozinho.
- **Limites declarados:** compra e descarte do **oponente** não têm efeito (a mão dele não está na tela); troca de
  turno e fim de partida ficam com o desenho que já tinham (faixa de vez e placar); efeito aplicado numa carta se
  perde se a mesa for redesenhada antes de terminar (o número e a foto, que moram na camada, continuam); numa
  jogada que junta várias coisas (turno do Shark) os efeitos saem juntos, não em sequência de turno.
- **Testes:** U `sentidos.unit` +1 (plano de efeitos: alvo e número de cada evento, fila de atacantes, fantasmas,
  remoção global, teto); e2e "G5 efeitos visuais" (terreno, compra, entrar, dano com número, criatura morta, camada
  sem toque, limpeza sozinha, menos movimento com número parado), com capturas em `SHOTS`.
- **Fora:** partículas e trilhas por cor de mana; efeito por carta específica; animar a carta indo da mão à pilha;
  sequenciar o turno do bot jogada a jogada (pede o modelo da mesa entregar um passo de cada vez).

### H · Mesa legível (E55, pedido de 04/10/2026, noite)

**Pedido:** voltar quantas jogadas quiser contra o bot; verso das cartas de duas faces e cartas da troca de reserva
em imagem nítida; melhor de 3 contra bot e contra humano; trocar o balão grande do registro entre as mesas por algo
recolhível; conseguir acompanhar as jogadas do oponente; escolher as manas que pagam uma mágica, com validação.

| Ordem | História | Entrega em uma frase |
|---|---|---|
| H1 | Imagens nítidas | verso de dupla face na mesa e na folha; cartas com imagem na troca de reserva |
| H2 | Voltar à vontade | contra o bot, desfazer volta jogada a jogada sem limite |
| H3 | Melhor de 3 a dois | série também em hot-seat e online |
| H4 | Registro recolhível | o resumo entre as mesas vira uma linha com ícone, que abre e fecha |
| H5 | Ver o oponente jogar | o turno do oponente passa jogada a jogada, com a tela indo até onde acontece |
| H6 | Pagar com as manas que eu escolho | folha de pagamento com validação antes de conjurar |
| H7 | Imagens que não somem | cada imagem da partida baixa uma vez, inteira, e fica no aparelho |

**H1 · Imagens nítidas: verso de dupla face e troca de reserva** ✅ (leva 171, 04/10/2026)
- **Defeito 1 (verso):** quando a carta transforma, o motor troca o nome do objeto para o da face de trás (Lunarch
  Veteran vira Luminous Phantom), e a mesa procurava a imagem pelo nome novo num índice que só tem a frente: a carta
  transformada ficava **sem imagem, só com o nome**. Agora o nome do verso acha a própria face (`T.cartaDaMesa`,
  puro): imagem, texto e tipo do verso, no campo, ao espiar e na folha.
- **Defeito 2 (folha):** a carta grande da folha da mesa pedia só a imagem "normal" (488 px), borrada em tela 3×.
  Agora leva todos os tamanhos (o navegador escolhe a grande) e a carta de duas faces ganhou **Virar carta** na
  própria folha: a outra face aparece inteira, com o nome e o texto dela. Carta de uma face não ganha o botão.
- **Defeito 3 (troca de reserva):** a tela de trocas lia as cartas no formato cru da Scryfall (`image_uris`), mas a
  partida guarda o formato do app (`images`): **nenhuma carta tinha imagem**, todas saíam só com o nome. Agora usa
  `ImagemCarta` com todos os tamanhos e a cadeia de reserva; sem imagem guardada, continua caindo para o nome.
- **Testes:** U `table.unit` (nome da frente, do verso, face sem imagem própria, nome desconhecido); e2e "H1"
  (folha com srcset e 240 px, virar e desvirar, carta de uma face sem botão, Luminous Phantom no campo com a imagem
  do verso depois do disturb, as três cartas da troca com imagem carregada; `auditaTela` em três telas).
- **Limite declarado:** carta de duas faces cuja face de trás o motor não conhece (Delver of Secrets, por exemplo)
  continua fora da partida — isso é da trilha motor, não de imagem. Sem a foto que acompanhou o pedido, o defeito
  foi reproduzido pela descrição; se a foto mostrar outro caso, ele entra como correção.

**H2 · Voltar quantas jogadas quiser contra o bot** ✅ (leva 173, 04/10/2026)
- **Antes:** desfazer só voltava a última jogada e parava em qualquer compra, mulligan ou olhada no grimório
  (a "barreira de informação revelada", que protege o jogo a dois).
- **Agora, contra o Shark:** não há outra pessoa de quem esconder nada, então o botão **Desfazer** volta jogada a
  jogada **até a mão inicial**, atravessando compra e o turno inteiro do bot. Cada toque volta uma jogada sua, com
  tudo o que o bot e o motor fizeram depois dela.
- **Voltar a um turno:** no **Registro**, cada turno com jogada sua ganhou **Voltar** (ícone de desfazer). Pede
  confirmação ("Voltar ao turno 5?") e leva a partida ao ponto em que aquele turno chegou para você.
- **Justo com o bot:** ao voltar, o Shark **esquece** o que viu e planejou no futuro desfeito (`esquece()`); reaprende
  do que está à vista, como quando a partida é reaberta. Ele decide de novo — pensa com relógio, então a segunda
  vez pode não repetir a primeira.
- **Continua valendo ao reabrir** a partida (as marcas das jogadas vão no que é salvo).
- **Não mudou:** a dois (hot-seat) a barreira continua; online não desfaz; goldfish fica como estava. Partida de
  série que já terminou e entrou no placar não volta (o resultado contado não muda por baixo).
- **Modelo (puro, `table-model`):** `semBarreira()`, `desfaziveis()`, `undo(n)` (devolve quantas voltou),
  `jogadasDesde(turno)`.
- **Testes:** U `table.unit` (volta uma a uma com o estado exato, várias de uma vez, ao começo de um turno, pedir
  demais para no começo, reabrir, hot-seat e goldfish inalterados); e2e "H2" (registro com Voltar de 44 px e ícone,
  cancelar não mexe, confirmar volta ao estado exato, três toques atravessando turno, até a mão inicial, reabrir).
- **Fora:** refazer (avançar de novo o que foi desfeito); desfazer sem limite no goldfish e a dois.
- **Instabilidade do teste e2e "H2" (leva G-221, 08/10/2026):** a queda de 08/10 mostrou a causa: Manter valeu, mas o teste
  recarregava logo depois e corria contra a gravação da partida (IndexedDB, sem esperar), voltando na mão inicial — a
  mesma corrida que a A8 teve na leva 183. Corrigido na classe: o `page.reload` dos testes de tela espera a gravação em
  curso da mesa (`__estanteMesa.gravado()`) antes de recarregar. No aparelho, o mesmo só acontece fechando o app no
  instante do toque (perde aquela jogada). O diagnóstico "TOQUE PERDIDO" continua no teste para a forma de 07/10, se voltar.

**H3 · Melhor de 3 contra outra pessoa, também online** ✅ (leva 177, 04/10/2026)
- **Antes:** a série já valia contra o Goldfish, contra o Shark e a dois no mesmo aparelho (leva 114). Na partida
  **online** o chip "Melhor de 3" aparecia e não fazia nada: a partida era sempre única e desistir fechava a sala.
- **Agora:** quem **cria a sala** escolhe "Melhor de 3"; a sala guarda a escolha e a série nasce nos dois aparelhos.
  - fim de partida sem série decidida: os dois veem **Próxima partida**; desistir de uma partida **não fecha a
    sala** (o aviso diz que a série continua);
  - **trocas com a reserva:** cada aparelho mexe só na própria lista (sem "passe o aparelho"); quem perdeu escolhe
    quem começa, o outro lê quem está escolhendo; **Pronto** envia as trocas e a tela passa a "Esperando …";
  - com as duas trocas, o **anfitrião monta a mesa** da partida seguinte e ela **abre sozinha nos dois lados**,
    com o deck trocado e quem foi escolhido começando;
  - a série fecha com duas vitórias; aí a sala é encerrada como antes.
- **Como funciona (sem regra nova):** a partida N ≥ 2 tem mesa e ações num nó próprio da sala
  (`jogos/j<N>`), longe das da partida 1; as trocas vão em `serie/j<N>/a<assento>`. As cartas não viajam de novo
  (já estão nos dois aparelhos desde a partida 1). A troca do outro aparelho só vale se for **a mesma lista com
  cartas mudadas de lado** e dentro dos limites (`trocaLegitima`); senão a partida usa a lista original dele.
- **Estados:** sem conexão ao enviar (aviso e Pronto de novo); o outro saiu da sala ("A série parou aqui" e caminho
  de volta); voltar à tela depois de enviar retoma a espera.
- **Limites declarados:** (1) a troca enviada não pode ser refeita depois do Pronto; (2) o convidado não escolhe o
  tamanho da série (vale a de quem cria); (3) duas abas no mesmo aparelho dividem o que fica guardado: recarregar a
  tela de trocas numa aba depois de a outra já ter aberto a partida seguinte cai em "não há série esperando"
  (não acontece entre dois aparelhos); (4) a lista de cada um fica legível na sala para o outro aparelho (a tela
  não mostra; a informação oculta online é a mesma da leva 133).
- **Testes:** U `online.unit` ×3 (sala melhor de 3, trocas por assento, partida 2 com ações separadas; duas mesas
  na partida 2 convergem sem as ações da partida 1; `trocaLegitima`); e2e "H3" com duas abas (série nos dois lados,
  desistir não encerra, trocas só da própria lista, um primário, espera, partida 2 com o deck trocado e quem começa,
  2–0 encerra a sala; `auditaTela` em 360 px, claro e escuro).

**H4 · Resumo do turno recolhido** ✅ (leva 174, 04/10/2026)
- **Antes:** o resumo dos últimos turnos nascia aberto entre as duas mesas — uma caixa com as linhas do seu turno
  e do turno do oponente (150 px ou mais em 360×780), afastando os dois lados e escondendo o seu campo.
- **Agora:** uma **faixa de 44 px** com o ícone de registro, os turnos ("Turnos 2 e 3") e **sinais do que
  aconteceu** — ícone + número para vida, compras, entradas no campo, cemitério e saídas; "sem mudança" quando nada
  houve. Um toque **abre o detalhe por cima da mesa** (não empurra o campo: o seu lado fica no mesmo pixel), com
  ícone em cada linha e o botão **Registro** para o histórico completo. Fecha tocando de novo, tocando fora ou
  com Esc; o **X** dispensa a faixa até o próximo turno.
- **Medido em 360×780:** resumo de 2 turnos ocupava ≥ 150 px entre as mesas; agora 46 px, aberto ou fechado.
- **Modelo:** o resumo do turno ganhou `fatos` contados (`T.sinaisDoResumo`, `T.iconeDaLinhaDoResumo`, puros); ícone
  novo `vida`.
- **Testes:** U `table.unit` (sinais, resumo antigo sem fatos, ícone por linha, fatos saindo do modelo); e2e "H4"
  (altura, alvos de 44 px, ícones, nome falado, abrir sem mover o campo, três jeitos de fechar, Registro, X;
  `auditaTela` aberto e fechado). A expectativa do e2e A16 mudou com justificativa: o texto do resumo abre a um toque.
- **Fora:** lembrar aberto/fechado entre partidas; resumo por fase.

**H5 · Ver o oponente jogar** ✅ (leva 175, 04/10/2026)
- **Antes:** uma jogada sua (passar o turno, por exemplo) fazia o Shark jogar o turno inteiro dele dentro do motor, e
  a mesa era desenhada **uma vez só, já no fim**: terreno, criatura, ataque e dano apareciam prontos, todos os
  efeitos juntos. Não dava para acompanhar.
- **Agora, contra o bot:** o turno dele passa **quadro a quadro**. Cada quadro é um estado que o motor já tinha
  produzido (nenhuma regra muda): a sua jogada, cada jogada do oponente e cada passo em que algo acontece na mesa.
  Passos em que só a prioridade passa somem dentro do quadro anterior.
  - **Legenda** presa acima da bandeja: quem jogou, o que fez (as mesmas frases do Registro), a miniatura da
    carta quando há, a contagem ("3/7") e **Pular**.
  - **A tela vai até onde acontece:** rola sozinha para a carta, a criatura ou o marcador de vida do quadro, e volta
    para o seu lado no fim.
  - **Som e efeito por quadro:** como a G4 e a G5 leem a diferença entre dois estados, cada passo toca o som dele e
    mostra o efeito dele, em sequência — antes saíam empilhados.
  - **A mesa não aceita toque durante a cena** (campo e bandeja); a jogada tentada no meio é recusada sem estragar a
    partida. **Pular** vai direto ao estado final, sem tocar todos os sons de uma vez.
- **Ritmo:** 1 s por jogada do oponente, 0,8 s por acontecimento, 0,35 s para o que não aparece (compra dele);
  a cena inteira cabe em cerca de 12 s (turno longo acelera, nunca abaixo de 0,3 s por quadro); até 40 quadros.
- **Liga e desliga:** chip **Ver jogadas** no balão da faixa de turno, ao lado do Som; guardado no aparelho
  (`mesa.verJogadas`) e levado no backup. Ligado por padrão.
- **Modelo:** `guardaPassos()`/`colhePassos()` no modelo da mesa (só guarda quando a tela pede: torneio e teste não
  acumulam estados); `roteiroDaJogada` puro em `sentidos.js`.
- **Limites declarados:** só contra o bot (a dois, as jogadas já acontecem na sua frente; online, chegam uma a uma
  pela sala). A legenda usa as frases do Registro, que já dizia qual carta o Shark escolheu numa vidência — isso
  é do registro, não mudou aqui. Com "Ver jogadas" ligado, passar o turno leva alguns segundos a mais.
- **Testes:** U `sentidos.unit` +2 (roteiro: quadros, passes absorvidos, estado final, sem cena sem oponente, teto;
  passos encadeados do modelo com o motor de verdade); e2e "H5" (cena com legenda e contagem, Pular de 44 px,
  mesa sem toque, jogada recusada no meio, fim no estado real, Pular, desligar e lembrar; `auditaTela` na cena).
  O harness dos e2e desliga a cena por padrão (`open(t, { cena: true })` liga).
- **Fora:** escolher a velocidade; voltar um quadro; cena na partida online e a dois.

**H6 · Pagar com as manas que eu escolho** ✅ (leva 176, 04/10/2026)
- **Antes:** ao conjurar, o motor escolhia sozinho quais terrenos virar (e que cor cada um gerava). Só dava para
  escolher virando terreno por terreno pela folha de cada carta, antes de conjurar.
- **Agora:** toda jogada em que o motor viraria fonte de mana abre a **folha de pagamento** ("Pagar · nome da
  carta", com a ação e o custo em símbolos):
  - **uma linha por fonte e por cor que ela gera** (Mountain {R}, Swamp {B}; terreno de duas cores tem uma linha
    por cor), com contador **− n/N +**; fontes iguais ficam juntas;
  - já vem **marcada como o motor pagaria** — um toque em **Pagar** dá o resultado de antes; mudar é opcional;
  - **confere a cada toque, no próprio motor:** "Pagamento certo.", "Falta mana. Para completar ainda seria preciso
    virar: Mountain." (cor errada cai aqui: preto não paga vermelho), "Paga, e sobra {B} na reserva até o fim da
    etapa." ou "Com essas escolhas não dá para pagar…"; mostra a mana que a escolha gera e a que já está na reserva;
  - **Pagar** só acende com a conta fechada; fechar a folha não conjura nem vira nada; **Automático** paga como antes.
- **Como confere (sem regra nova):** o motor já usa primeiro o que está na reserva e só vira o que falta. A folha
  vira as fontes escolhidas e aplica a jogada **numa simulação** (o motor é puro): se o motor ainda precisou virar
  alguma coisa, a escolha não paga. Assim lampejo, desconto, X, imposto de comandante e custo alternativo valem
  como o motor os cobra, sem conta refeita na tela. Ao confirmar, as fontes viram de verdade e a jogada segue.
- **Liga e desliga:** chip **Escolher mana** no balão da faixa de turno; guardado no aparelho (`mesa.manaManual`)
  e levado no backup. Ligado por padrão (foi o pedido).
- **Limites declarados:** (1) fonte de "qualquer combinação de cores" (Axebane Guardian): a folha não sabe dividir
  as cores — nessas jogadas o motor paga sozinho, como antes; (2) **qual mana da reserva paga o custo genérico**
  continua sendo escolha do motor (incolor primeiro, depois W U B R G): escolher isso pede mudança no motor (ação de
  conjurar com o pagamento explícito) e fica proposto à trilha motor; (3) cada fonte virada é uma jogada para o
  Desfazer (voltar um pagamento de três terrenos são quatro toques); (4) fontes iguais não são distinguidas (as
  duas Mountain valem o mesmo).
- **Modelo (puro, `table-model`):** `fontesDeMana`, `conferePagamento`, `planoDePagamento`, `gruposDeFontes`,
  `contagemDosToques`, `toquesDaContagem`.
- **Testes:** U `pagamento.unit` ×3, com lista real e texto oficial (sugestão = plano do motor; falta, sobra,
  impossível; partida intocada pela conferência; não abre quando a reserva já paga; terreno de duas cores com a cor
  certa; grupos); e2e "H6" (folha com sugestão, 44 px, falta, cor errada, sobra, contador no limite, pagar vira o
  escolhido, cancelar, Automático, desligar e lembrar; `auditaTela`). O harness dos e2e desliga a folha por padrão.

**H7 · Imagens que não somem na partida** ✅ (leva 180, 04/10/2026)
- **Relato (capturas do aparelho, 04/10 21h, em roaming):** na mesa, cartas em branco ou pintadas só numa tira do
  topo (Plains na mão e no campo, Squadron Hawk), enquanto outras apareciam inteiras.
- **Causa (três, somadas):** (1) a mesa cria `<img>` novos a cada jogada; com sinal fraco, o download que estava no
  meio era abandonado e recomeçava, e a carta ficava parada na tira que já tinha chegado; (2) uma resposta cortada
  podia ser guardada no cache do aparelho e repetir o defeito para sempre (o cache responde antes da rede);
  (3) imagem que falhava não era pedida de novo, e as cartas da mesa esperavam rolagem para carregar (`lazy`).
- **Agora:**
  - cada imagem da partida tem **um dono que não sai da memória**: baixa uma vez, confere que veio **inteira**,
    guarda os bytes no aparelho e toda carta da mesa pinta dali — redesenhar não vai à rede;
  - ao abrir a mesa, as imagens de **todas as cartas da partida** (frente e verso) começam a chegar, quatro por vez:
    a carta comprada no turno 8 já está pronta;
  - **o que falha volta sozinho**: nova tentativa em 1,5 s, 4 s, 10 s e 30 s, e na hora em que a rede volta; a
    carta recebe a imagem sem toque. Enquanto isso fica o nome (sem ícone quebrado);
  - **imagem cortada não é aceita nem guardada**: é pedida de novo sem o cache do navegador; a cópia cortada que já
    estiver no aparelho é apagada e trocada na próxima vez que for usada (service worker e aquecimento offline).
- **Como confere "inteira":** tamanho anunciado pelo servidor e fecho do formato (JPEG termina em FFD9, PNG em
  IEND, WebP traz o tamanho no cabeçalho). Formato desconhecido passa.
- **Tamanho pedido:** o menor que cobre os pixels da tela (campo 92 px e mão 110 px num celular 3× = "normal", 488
  px), nunca o PNG. A conta que o `srcset` fazia passou para `fonteParaLargura`; o `srcset` continua sendo o caminho
  quando a imagem não pode ser lida (CDN sem CORS, navegador antigo).
- **Limites declarados:** (1) não reproduzi o defeito no aparelho: a causa foi deduzida das capturas e coberta por
  simulação (primeiro pedido cai, segundo chega pela metade); (2) vale para as cartas da mesa (campo, mão, pilha,
  zonas); a carta grande ao segurar e a folha da carta continuam indo ao cache do navegador; (3) resposta opaca
  (sem CORS) não pode ser conferida; (4) as imagens ficam na memória enquanto o app está aberto (até 600).
- **Testes:** U `offline.unit` ×5 (`imagemInteira`; aquecimento não guarda cortada; service worker de verdade com
  rede e cache falsos: cortada na rede, cortada no cache, cortada sempre; `fonteParaLargura`); e2e "H7" (falha →
  cortada → inteira sem toque, lista inteira na memória, seis redesenhos sem download). Expectativa mudada de
  propósito nos e2e "Leva 123" e "H1": a carta da mesa pinta de `blob:` e diz o endereço em `data-fonte`.

### I · Leitura e gestão (E56, pedido de 05/10/2026)

**Pedido (oito pontos, 05/10/2026):** bloqueios declarados mais visuais (atacante e bloqueador na mesma linha, com
símbolo); registro com as fases em cima e ícone por acontecimento, sem coluna vazia; resumo da mesa na mesma
gramática; contagem da coleção só no painel; listas com filtros e gestão como a coleção, e filtro por formato nas
duas; área no Perfil para escolher a arte de cada ficha; tela Jogar sem texto solto (ícone + dica); histórico e
estatísticas de partidas por conta. A mensagem chegou cortada no último ponto ("…seguindo o mesmo"): assumido "o
mesmo padrão de design".

| Ordem | História | Entrega em uma frase |
|---|---|---|
| I1 | Mesa legível, parte 2 | bloqueios em pares; registro com fase em cima e ícone por linha; resumo com a mesma linha |
| I2 | Coleção e listas no mesmo padrão | contagem no painel; busca e filtros nas listas; filtro por formato nas duas |
| I3 | Tela Jogar sem texto solto | estados em ícone + palavra; explicação em dica do design system |
| I4 | Fichas do seu jeito | Perfil › Fichas: escolher a arte de cada ficha, com internet, e guardar para jogar offline |
| I5 | Histórico e estatísticas | partidas guardadas por conta e painel gráfico |

**I1 · Mesa legível, parte 2: bloqueios em pares, registro e resumo estruturados** ✅ (leva 183, 05/10/2026)
- **Bloqueios declarados:** o balão deixou de ser uma frase corrida ("Sky Pike ← Wall Guard · …"). Agora é uma
  lista de **pares**, um por linha: atacante à esquerda com espada (vermelho), bloqueador à direita com escudo
  (dourado); dois bloqueadores no mesmo atacante empilham do lado direito; atacante sem bloqueio diz **livre**.
  A dica da janela ("reforce, remova um bloqueador ou passe") fica embaixo. Os pares usam a largura inteira do balão.
- **Registro:** a fase saiu da coluna da esquerda (6,5 em, que deixava as linhas começando no meio da tela) e foi
  para **cima**, como divisória: ícone da fase, nome e um fio. Os acontecimentos usam a **largura inteira**, cada
  um com o **ícone do que conta** (terreno, conjurar, ativar/gatilho, atacar, bloquear, vida, morte/descarte,
  exílio, devolver, compra, mana, alvo, escolha, mão inicial, fim) e um **filete da cor de quem agiu** (você no
  acento, o oponente na cor dele). Medido em 360 px: a linha começa na borda do corpo do diálogo.
- **Resumo da mesa:** o painel aberto usa a mesma linha (`tb-fatos`), o mesmo cabeçalho de turno e os mesmos
  ícones; a faixa recolhida de 44 px (H4) não muda.
- **Modelo (puro, `table-model`):** `iconeDaLinhaDoRegistro`, `donoDaLinha`, `iconeDaFase`. Componente
  `QuadroDeBloqueios` (`table-components`); `PriorityBanner` aceita `corpo`.
- **Limites declarados:** o ícone sai do texto da linha (o registro guarda frases, não eventos): linha nova do motor
  sem regra cai no ícone genérico; o balão dos bloqueios continua abrindo por toque na bandeja.
- **Testes:** U `table.unit` ×2; e2e "E50 janela do atacante" (pares na mesma linha, ícones, cores, nome falado,
  `auditaTela`) e e2e "I1" (fase em cima, largura inteira, ícone por linha, filete, resumo com a mesma linha;
  `auditaTela` claro e escuro).

**I2 · Coleção e listas no mesmo padrão de filtro** ✅ (leva 185, 05/10/2026)
- **Coleção:** a linha "N carta(s) · M cópia(s)" saiu de baixo do título (repetia o Painel). O **cabeçalho do Painel**
  passa a dizer **cartas e cópias** sempre (aberto ou fechado); com preço guardado, o valor vai numa segunda linha
  (antes, com valor, o cabeçalho trocava "cartas" pelo total para caber em 360 px). No painel de filtros, **Formato**
  (o antigo "Legal em") subiu para o primeiro campo.
- **Listas:** a estante ganhou o mesmo conjunto da coleção — campo de **busca** (nome da lista **ou de uma carta
  dela**) e botão **Filtros** com o número de critérios ligados; folha "Filtrar listas" com **Formato** (só os que
  existem na estante), **Cor** (símbolos; "qualquer uma delas" ou "só dentro delas"), **Coleção** (tenho todas ·
  falta carta) e **Ordem** (recentes · nome · formato · mais completas); contador ao vivo, **Limpar** e **Mostrar**;
  linha de contagem "N de M lista(s)" com o filtro por extenso; vazio desenhado quando nada passa. As etiquetas (G2)
  continuam como chips e somam com o filtro. O total em valor acompanha o recorte.
- **O filtro da estante vale enquanto o app está aberto:** abrir uma lista e voltar não o desfaz.
- **Modelo (puro, `filter`):** `filtraListas`, `novoFiltroDeListas`, `filtrosDeListaAtivos`, `filtroDeListasVazio`,
  `descreveFiltroDeListas`, `ORDENS_DE_LISTA`, `POSSES_DE_LISTA`. `Expansivel` aceita `resumo` em linhas.
- **Limites declarados:** (1) o filtro das listas não vai para o endereço nem é guardado entre aberturas do app (o da
  coleção vai; visões salvas de listas ficam para depois); (2) cor da lista depende das cartas já guardadas no
  aparelho — lista sem dados é contada à parte, não some calada; (3) "Formato" na coleção é legalidade da carta; nas
  listas é o formato da lista.
- **Testes:** U `filter.unit` ×2; e2e "I2" (texto por lista e por carta sem perder o foco, formato, cor, selo no
  botão, contagem, voltar de uma lista mantém, vazio, ordem, coleção sem contagem sob o título e Formato em
  primeiro; `auditaTela` em 360 px claro e escuro). Expectativas mudadas de propósito em seis e2e que liam
  `#col-summary` (agora leem o cabeçalho do Painel).

**I3 · Tela Jogar sem texto solto** ✅ (leva 186, 05/10/2026)
- **Antes:** sob o seletor da lista, quatro linhas de texto ("Reserva: 15 carta(s) ficam de fora…", "Motor: 100%
  completo", "Guardada para jogar sem internet.", "motor v70") e, sob Série, Paradas e Semente, uma frase de
  explicação cada.
- **Agora:**
  - **estado da lista em três ladrilhos** iguais (ícone + valor em cima, rótulo embaixo): **Motor 100%**, **Reserva
    15**, **Offline Pronta** (ou "41/60" com o botão Baixar cartas). O grupo é um botão: o toque abre a folha "Sua
    lista" com as frases inteiras e a versão do motor. Lista que não joga continua com o aviso inteiro à vista;
  - **dica a um toque:** Série, Paradas e Semente levam um "i" de 44 px ao lado do rótulo; o toque abre a explicação
    logo abaixo do rótulo (em fluxo: não cobre o controle nem sai da tela) e fecha no segundo toque, no toque fora
    ou no Esc. Textos encurtados.
- **Design system:** componente **`Dica`** e `rotuloDeCampo` (com `Field(..., { dica })`), ícone `info`,
  `LinhaEstado(..., { ladrilhos: true })` com `valor`, `fala` e `id` por item; os três no catálogo `/ds`.
- **Medido em 360×780:** o bloco sob a lista foi de quatro linhas de texto para uma faixa de ladrilhos; a tela
  inteira perde seis frases soltas. Os ladrilhos cabem com a fonte larga do CI (teste).
- **Limites declarados:** as notas de bloqueio do oponente ("O Shark joga só com lista 100% coberta…") e os textos de
  sala online continuam por extenso — são o motivo de um botão estar travado, não explicação opcional; a dica vale
  só na tela Jogar por enquanto (os outros campos do app migram quando forem tocados).
- **Testes:** e2e "I3" (ladrilhos com ícone, iguais e sem corte com fonte larga, nome falado, frases antigas fora da
  tela, folha com as frases e a versão, três dicas de 44 px, abre em fluxo, fecha de três jeitos, foco, não aciona o
  campo; `auditaTela` claro e escuro); contrato visual (catálogo). Expectativas mudadas de propósito em cinco e2e que
  liam as frases antigas.

**I4 · Fichas do seu jeito** ✅ (leva 187, 05/10/2026)
- **Onde:** Perfil › **Fichas** (rota `/perfil/fichas`), uma área só para isso.
- **Lista:** todas as fichas que as cartas com regra completa criam (15 hoje: Treasure, Clue, Food, Blood, Map, Bird
  1/1, Bird 2/2, Goblin, Servo, Elf Warrior, Eldrazi Spawn, Dinosaur, Human Soldier, Crab, Elemental). As das **suas
  listas** vêm primeiro. Cada linha: miniatura da arte em uso (ou o ícone), **ícone do tipo** (garras para criatura,
  gema para artefato), nome, força/resistência, **símbolos de cor** e o estado (Padrão · N baixadas · Sua arte).
- **Artes:** ao abrir uma ficha com internet, o app busca na Scryfall as impressões dela (`!"nome" t:token`, com
  força e cor), mostra uma por arte (reimpressão com a mesma ilustração não repete; teto de 36) e **guarda as opções
  e as imagens no aparelho**. Um toque escolhe: a arte fica marcada, a imagem grande é baixada e **a mesa passa a
  usá-la** nas próximas partidas. "Padrão" volta ao automático. "Atualizar" busca de novo.
- **Sem internet:** aviso na lista e na ficha; dá para **trocar entre as artes já baixadas**; ficha nunca aberta diz
  que as artes aparecem quando houver conexão; nada é pedido à rede.
- **Estados:** buscando, erro com "Tentar de novo", ficha que a Scryfall não tem ("Sem arte disponível"), offline.
- **Guardado:** `fichas.escolhas` (vai no backup v3) e `fichas.opcoes` (só no aparelho). O repositório de cartas
  consulta a escolha antes do próprio cache.
- **Limites declarados:** (1) "todos os tipos de ficha" são os que o motor do app cria, não todas as fichas do Magic;
  a lista cresce sozinha quando um script novo cria ficha; (2) partida já em andamento continua com a arte com que
  começou; (3) a escolha é por ficha (nome + força/resistência), não por lista; (4) as opções vêm da Scryfall em
  inglês e ficam limitadas a 36 artes por ficha.
- **Modelo e serviço (`src/data/fichas.js`, `__m34`):** `listaDeFichas`, `chaveDaFicha`, `iconeDaFicha`,
  `coresDaFicha`, `descricaoDaFicha`, `consultaDaFicha`, `opcoesDeArte`, `rotuloDaOpcao`, `createFichas`. Ícones
  novos: `garras`, `gema`, `ficha`.
- **Testes:** U `fichas.unit` ×3; e2e "I4" (entrada no Perfil, lista com ícone e cores, busca, mesma arte não
  repete, escolha guardada e usada na mesa, ficha sem arte, offline com e sem opções, padrão; `auditaTela` em 360 px
  claro e escuro).

**I5 · Histórico e estatísticas de partidas** ✅ (leva 188, 05/10/2026)
- **Onde:** Perfil › **Partidas** (rota `/perfil/partidas`); o atalho no Perfil já diz "N · X% de vitória".
- **O que entra:** toda partida do **motor completo** que termina (Goldfish, Shark, a dois e online), do ponto de
  vista de quem joga neste aparelho: resultado, oponente, sua lista e as cores dela, formato, turno em que acabou,
  motivo (vida a zero, grimório vazio, dano de comandante, desistência), quem começou, duração e, na série, "jogo 2
  de 3". Uma vez por partida: recarregar a mesa não duplica; **desfazer o fim** (contra o bot) tira o registro e o
  novo fim grava de novo.
- **Painel (formas escolhidas pelo que o número faz):**
  - três **ladrilhos**: partidas, % de vitórias, sequência atual;
  - **Resultados:** um medidor de uma barra só (vitórias · empates · derrotas, com 2 px de respiro) e a legenda com
    **ícone e número** de cada um — nunca só cor; as **últimas 20** em casas de forma diferente por resultado (cheia,
    vazada, traço); melhor sequência, média de turnos e de minutos;
  - **Por oponente** e **Por lista:** barras de um tom só com a taxa de vitória e o total ao lado; a barra do
    oponente **filtra** o painel inteiro (número é filtro); chips de oponente quando há mais de um;
  - **Quem começou:** a taxa quando você começa e quando o oponente começa;
  - **Por semana:** oito colunas (partidas), com as vitórias em destaque na base, legenda, e o toque numa coluna
    diz os números da semana;
  - **Histórico:** a lista (a visão em tabela de tudo), a mais nova primeiro, em lotes de 30.
- **Estados:** vazio com "Jogar"; **Limpar histórico** pede confirmação e tem Desfazer.
- **Por conta:** fica no aparelho (`partidas.historico`, até 500 partidas) e **vai no backup v3** junto do perfil —
  é o que acompanha a conta hoje. Texto usa as cores de texto; as cores de estado (positivo, negativo) só marcam
  resultado, sempre com ícone.
- **Limites declarados:** (1) partidas anteriores a esta leva não existem no histórico; (2) a mesa assistida de teste
  não conta; (3) a dois no mesmo aparelho conta do ponto de vista do primeiro jogador; (4) abandonar uma partida sem
  terminá-la (Descartar) não entra; (5) o motor registra a desistência como "vida": o histórico corrige olhando a
  última jogada; (6) sem estatística por carta (ficou fora: pede registrar a partida inteira).
- **Modelo e serviço (`src/data/partidas.js`, `__m35`):** `daMesa`, `registra`, `remove`, `normaliza`,
  `estatisticas`, `createPartidas`. A mesa guarda `options.iniciada` e `options.minhaLista`. Ícone novo: `trofeu`.
- **Testes:** U `partidas.unit` ×4; e2e "I5" (vazio, registro, desfazer o fim, não duplicar, ladrilhos, medidor
  proporcional, legenda com ícone, últimas, barras com 44 px que filtram, colunas, lista, limpar com Desfazer;
  `auditaTela` em 360 px claro, escuro e com a fonte larga do CI).

**I6 · Terrenos do seu jeito e artes de 6 em 6** ✅ (leva 200, 06/10/2026 · pedido de 06/10/2026)
- **Valor:** jogar com a arte que eu gosto em cada terreno básico, e escolher artes sem baixar dezenas de imagens.
- **Entregue:**
  - **Perfil › Terrenos** (área só disso, rota `/perfil/terrenos`): a lista dos **doze terrenos básicos** — Plains,
    Island, Swamp, Mountain, Forest, Wastes e os seis nevados — cada um com um ícone próprio (planície, ilha,
    pântano, montanha, floresta, ermo), o nome, o símbolo de mana da cor e o estado (padrão, baixadas, sua arte); os
    que estão nas suas listas vêm primeiro;
  - abrir um terreno busca as artes na Scryfall (`!"nome"`, uma por arte, da mais recente) e mostra **as 6 primeiras**;
    **"Mais artes"** baixa mais 6 por vez, sem nova busca, até acabarem (teto de 120 por terreno); o contador diz
    quantas já foram baixadas e quando são todas;
  - tocar numa arte a escolhe: fica guardada no aparelho (`terrenos.escolhas`, vai no backup), a imagem grande é
    baixada e **a partida passa a usá-la** — na mão, em campo e na folha da carta, inclusive na partida em andamento;
    "Padrão" volta à impressão de sempre;
  - **as fichas (I4) passaram à mesma mecânica**: 6 artes e "Mais artes" (antes baixava até 36 de uma vez).
- **Internet:** buscar e baixar artes só com conexão, e a tela diz isso sempre (nota na lista com internet; aviso
  desenhado sem internet). Sem internet as artes **já baixadas** continuam à mão e dá para trocar entre elas;
  terreno nunca aberto só avisa. Erro de busca tem "Repetir busca".
- **Desenho:** a mesma tela das fichas (`telaDeArtes`), com o botão **depois** da grade: quem toca em "Mais artes"
  fica onde está (J1) e as artes novas entram acima do botão. As artes aparecem na hora e cada imagem se completa
  quando chega.
- **Limites declarados:** a escolha vale **na partida** (mesa); listas, coleção, a troca de reserva entre jogos e o
  texto exportado seguem na impressão padrão (ou na escolhida por lista, V1); a escolha é uma por terreno, igual
  para todas as listas e para os dois lados da mesa neste aparelho; terrenos não básicos ficam fora; as candidatas
  de uma busca valem enquanto o app está aberto (reabrir e pedir mais refaz a busca, sem baixar de novo o que já tem).
- **Modelo:** `src/data/terrenos.js` (`__m36`: `TERRENOS`, `listaDeTerrenos`, `cartaComTerreno`, `createTerrenos`);
  em `fichas.js`, a galeria comum `criaGaleria` (`mais`, `temMais`, `escolher`) e o puro `proximoLote`.
- **Testes:** U `terrenos.unit` ×4 (lista dos doze; lotes: próximas 6, sem repetir, teto, fim; serviço: uma busca,
  6 por pedido, só com internet, guardado, escolha e carta da partida; fichas de 6 em 6); e2e "I6" (entrada no perfil,
  lista com ícone e cor, 6 artes e só as imagens delas pedidas, "Mais artes" sem saltar e sem nova busca, fim,
  escolha guardada, vazio, sem internet, **a Forest da partida com a arte escolhida**, padrão, fichas em lotes;
  `auditaTela` nos dois temas e com a fonte larga); e2e I4 segue verde.
- **Depende de:** I4, V1, J1.
- **Fora:** terrenos não básicos; arte por lista para a mesa (V1 na mesa).

**I7 · Acabamento: artes rápidas, escolha na hora, abertura maior e toque sem realce** ✅ (leva 206, 06/10/2026 · pedido de 06/10/2026)
- **Valor:** escolher arte sem esperar, ver o que está carregando, e tocar na tela vendo só a reação do app.
- **Causas encontradas:**
  - *escolher demorava*: guardar a escolha **esperava** o download de três imagens numa fila em série, atrás das
    doze do lote, com 80 ms de pausa entre cada uma;
  - *o lote demorava a aparecer*: cada arte pedia direto a imagem nítida (488 px), e a tela inteira era redesenhada
    (e as imagens recriadas) a cada lote e a cada escolha;
  - *pedir mais depois de reabrir* refazia a busca na Scryfall.
- **Entregue — artes (fichas e terrenos):**
  - cada arte tem a própria moldura com **a espera do app desenhada dentro** (as três cartas na prateleira) até a
    imagem chegar; a **pequena chega primeiro** e a nítida entra por cima em seguida (a moldura nunca fica vazia);
  - **um lote por vez**: enquanto o lote busca ou as imagens dele chegam, "Mais artes" fica desligado, com
    "Chegando N artes…" ao lado; dois toques seguidos pedem um lote só;
  - escolher e pedir mais **mexem só no que mudou**: as artes já desenhadas não são redesenhadas nem baixadas de novo;
  - a busca fica guardada no aparelho: "Mais artes" não volta à Scryfall, nem depois de reabrir o app;
  - **escolher marca na hora**; gravar e baixar a imagem grande seguem por trás, com prioridade sobre a fila, e o
    **selo da própria arte mostra a espera** até ficar guardada (aí vira o visto e vem o aviso). Trocar de novo
    durante a espera vale a última.
- **Entregue — artes na partida:** a arte escolhida de **terreno e de ficha** vale para **todas as listas**, dos dois
  lados da mesa, inclusive na partida que já começou (antes a ficha só mudava em partida nova), e na troca de reserva
  entre os jogos de uma série.
- **Entregue — abertura (J5):** de 1,2 s para **2 s**; o ícone passa de 112 px para **pouco mais da metade da largura
  da tela** (202 px em 360, teto de 240). Duas causas prováveis da falha na parte de baixo, corrigidas: a sombra do
  ícone tinha a região calculada pela caixa das cartas, que muda a cada quadro enquanto elas caem (agora é fixa); e a
  camada cobria só a caixa da janela, deixando uma faixa do app embaixo quando a barra do navegador recolhe (agora o
  fundo se estende para além da caixa). A mesma extensão foi aplicada aos diálogos e à carta espiada na mesa.
- **Entregue — toque:** o realce azulado que o navegador pinta sobre o que é tocado foi desligado no app inteiro;
  tocar não desenha contorno de foco (o teclado continua desenhando); segurar um controle não seleciona o rótulo nem
  abre o menu da imagem.
- **Limites declarados:** a falha da abertura **não foi reproduzida** no ambiente de teste (só aparece no aparelho):
  as duas causas acima são as que o código explica; se persistir, uma gravação de tela mostra onde. O tamanho
  "proporcional à pré-tela" foi lido como o ícone da tela de abertura do sistema; a medida exata dela varia por
  aparelho. A imagem nítida de cada arte ainda é baixada (é ela que fica guardada para jogar sem internet).
- **Testes:** U `terrenos.unit` +2 (busca guardada entre aberturas do app, escolher responde antes do download e com
  prioridade; ficha e terreno na carta da partida), `icone.unit` (sombra de região fixa só no ícone animado; 2 s),
  `ds.unit` (contrato: realce desligado na raiz; toda camada de tela inteira com fundo tem a extensão); e2e "I7"
  (mais de 150 controles em dez telas sem realce e sem rótulo selecionável; com a rede de imagem lenta: seis artes
  esperando com a animação, pequena primeiro, botão desligado e "Chegando 6 artes…", nítida por cima, dois toques =
  um lote, nenhuma imagem pedida de novo, escolha marcada em menos de 600 ms com a espera no selo, a grande baixada,
  última escolha vale, a Forest da partida com a arte escolhida); e2e J5, I4 e I6 ajustados às mudanças pedidas.
- **Ajuste (leva 207):** a mesa passa a ler as artes escolhidas **antes do primeiro desenho** (a carta já nasce com a
  arte certa, sem redesenhar depois); a âncora do toque (J1) ficou mais barata — guarda o controle reencontrado, conta
  as mudanças de um mesmo quadro uma vez só e solta quando o controle some de vez. Motivo: o CI caiu duas vezes no
  passo "a Forest da partida com a arte escolhida" (I6 e I7) e duas no teste do Shark (H2), sempre em testes da mesa e
  nunca neste ambiente (nem com o processador 8× mais lento). **A causa não foi identificada**: o log do CI não é
  legível daqui. O passo agora espera 30 s e, se cair, a mensagem traz o estado da mesa.
- **Depende de:** I6, J4, J5.

### J · Fluidez e orientação (E57, pedido de 06/10/2026)

**Pedido (cinco pontos, 06/10/2026):** quem toca num controle fica onde está para ver o resultado (a tela só anda
quando a jornada pede); cópias iguais **viradas** empilhadas em leque como as desviradas; carregamento com animação
própria do design system; abertura do app com animação que termina no logo; botão flutuante no canto inferior
direito com as ações principais da tela (referência: ManaBox).

**Conduta do épico:** conduta de design (capturas antes e depois em 360×780 e 390×844, clara e escura; medida em
pixels; `auditaTela` nas quatro larguras e com a fonte larga do CI); movimento novo com regra de
`prefers-reduced-motion`; nada atrasa o uso (animação nunca segura o app pronto); componente novo entra no `/ds`.

**J1 · Ficar onde está (app)** ✅ (leva 195, 06/10/2026)
- **Valor:** tocar num chip, numa chave, num filtro ou num botão e ver o resultado ali mesmo, sem a tela pular.
- **Medido antes (360×780, página rolada):** na Lista, "Marcar as minhas" e "Ajustar" jogavam a tela 1 531 px para
  o topo e "Estatísticas" 230 px; no Perfil, **todos** os 24 controles de aparência voltavam ao topo (136 a 366 px);
  em Jogar, a série andava 98 px.
- **Causa:** as telas repintam inteiras; ao esvaziar a raiz a página encolhe e o navegador puxa a rolagem para cima.
  E quando o que muda fica **acima** do controle (letra maior, densidade, um bloco que abre), ele é empurrado.
- **Entregue (duas peças centrais, valem para toda tela, inclusive as futuras):**
  - `mount` devolve a rolagem depois de repintar a raiz de uma tela;
  - **âncora do toque** (`instalaAncora`): o controle tocado continua no mesmo lugar da janela enquanto a tela
    muda — na hora, durante animações (700 ms, quadro a quadro) e quando o resultado chega depois (rede), até o
    próximo gesto. No fim da página, a tela guarda a altura que falta em vez de puxar o controle.
- **A tela só anda quando:** troca de tela (começa do topo); o app leva o olhar de propósito por `levaAte(el)`
  (hoje: "Adicionar carta" e "Pelo nome" na Coleção, que respeitam movimento reduzido); a pessoa rola ou toca de
  novo; ou o controle tocado sai da tela.
- **Divergência do planejado:** o roteador continua indo ao topo também quando só o parâmetro muda (`/lista?id=`,
  `/perfil/fichas?f=` são telas novas); a exceção é declarada por `levaAte`, não por atributo `data-leva`.
- **Limites declarados:** a âncora não vale na partida (J2); vale para botões, chips, chaves, abas e seletores dentro
  da tela (não para a barra do topo nem para diálogos); controle sem `id` cujo rótulo muda ao tocar não é
  reencontrado depois de repintar (fica só a rolagem devolvida pelo `mount`).
- **Testes:** U `ds.unit` ×2 (regra pura `deveAncorar`; **contrato**: todo ponto do arquivo que move a rolagem está
  numa lista com o motivo — ponto novo quebra o portão); e2e "J1" com o guarda-corpo `semSalto` (varre os controles
  de estado de Lista, Listas, Coleção, Cartas, Jogar e Perfil — 60 ou mais — com a página rolada, tolerância de
  2 px) e `tocaSemSalto` (somar e tirar cópia, marcar que tenho, coluna da curva, fim da página, levar de propósito,
  troca de tela no topo).
- **Depende de:** — · **Fora:** a mesa de jogo (J2); Fichas e Partidas não têm controle de estado na varredura
  (as linhas navegam) e ficam cobertas pela regra central.

**J2 · Ficar onde está (mesa)** ✅ (leva 197, 06/10/2026)
- **Valor:** na partida, agir numa carta ou na bandeja sem o campo correr.
- **Regra (ajuste do usuário, 06/10/2026):** a mesa **pode** se mover, mas só para mostrar algo que não está à vista e
  que ajuda a jogar; se já está visível, fica parada.
- **Medido antes (360×780, mesa com 6 permanentes diferentes e 6 cartas na mão):** qualquer ação que redesenha a mesa
  (virar um terreno, passar) devolvia a fileira de permanentes e a mão ao começo (202 → 4 px e 264 → 4 px); fechar um
  diálogo levava a tela até o botão que o abriu; a cena do oponente centralizava a jogada mesmo já estando na tela.
- **Entregue:**
  - redesenhar a mesa **mantém a rolagem lateral** de cada fileira (permanentes, terrenos, mão) e a rolagem da página;
  - a âncora do toque (J1) vale também na partida: o que aparece acima (a pilha, um aviso) não empurra a carta tocada;
  - fechar um diálogo devolve o foco **sem** mover a tela (vale no app inteiro);
  - **a mesa só anda para mostrar o que está escondido** (`levaSeEscondido`): a jogada do oponente na cena (H5), o meu
    lado ao fim da cena, a permanente que acabei de pôr em campo e o motivo de uma recusa. "À vista" = inteiro na
    janela, **acima da bandeja** e dentro da fileira; escondido só de lado, só a fileira rola.
- **Limites declarados:** quando a página encolhe e não sobra rolagem (ex.: a pilha some), o campo sobe o que faltar —
  a bandeja, onde está o dedo, não se move; cópia nova que entra num leque já visível não é procurada (o leque
  mostra o ×N); a mão não rola sozinha até a carta comprada.
- **Modelo (puro, DS):** `oQueEsconde(caixa, { alturaDaJanela, topoDaDoca, fileira, naDoca })`.
- **Testes:** U `ds.unit` (à vista ou escondido: janela, bandeja, fileira; âncora na partida — expectativa da J1
  ajustada de propósito); contrato dos pontos que rolam (a mesa não chama mais `scrollIntoView` direto); e2e "J2"
  (virar terreno, folhas de permanente e de carta da mão, Registro, passar: página e fileiras no mesmo lugar, 2 px;
  permanente nova fora da vista é mostrada; com tudo à vista nada se move; `auditaTela`).
- **Depende de:** J1.

**J3 · Leque das viradas** ✅ (leva 199, 06/10/2026)
- **Valor:** quatro cópias viradas ocupam o lugar de um leque, não de quatro cartas.
- **Diagnóstico (diferente do planejado):** terrenos e permanentes iguais **já** se juntavam quando virados (U5, H9) —
  medido: 7 Island viradas num leque de 148 px. O que ficava espalhado era o **ataque**: cada atacante saía do leque
  enquanto estivesse atacando. Quatro Sky Pike atacando ocupavam 4 × 108 px (≈ 460 px numa fileira de 302 px, que
  passava a rolar). E havia uma assimetria: quem atacava o jogador 0 juntava por acaso (o zero passava por "sem valor");
  quem atacava o jogador 1, não.
- **Entregue:** atacantes iguais, **ainda sem bloqueio e atacando o mesmo alvo**, ficam num leque só (148 px para
  quatro; a da frente leva o anel de ataque, até três bordas atrás e o selo ×N), dos dois lados da mesa. Continuam com
  toque próprio: quem ainda pode ser escolhida para atacar ou bloquear, a atacante bloqueada e quem bloqueia.
  Atacando em pé (vigilância) junta à parte das viradas.
- **Não mudou:** o desenho do leque virado (camadas giradas, passo de 14 px) e o agrupamento de terrenos.
- **Testes:** U `leque.unit` ×2 (atacantes juntas nos dois lados, alvo diferente e quem ficou em casa separados,
  vigilância; bloqueada, bloqueadora e escolhível fora do leque); e2e "J3" (terrenos: dois leques vizinhos e depois
  um só com ×N e nome falado; ataque com a partida parando em todos os passos: uma por uma na escolha, um leque
  depois de declarar, largura ≤ 160 px e fileira sem rolar, toque abre a da frente; `auditaTela` nas quatro larguras).
  O e2e cai no código anterior ("1 !== 4").
- **Depende de:** U5, H9.
- **Fora:** juntar cartas de nomes diferentes; leque para atacantes bloqueadas.
- **Pendência com o usuário:** se ainda houver cópias viradas espalhadas em outra situação, uma captura da mesa mostra
  qual estado as separa (marcador, anexo, efeito do turno).

**J4 · Carregamento com identidade** ✅ (leva 203, 06/10/2026)
- **Valor:** esperar sem achar que travou, com a cara do app.
- **Entregue:**
  - `Carregando(texto, { tamanho })` no design system: **três cartas se arrumam na prateleira**, uma depois da outra,
    em traço no acento do tema, com a prateleira e o lábio dela (só tokens; ciclo de 1,68 s, `--dur-arruma`). Três
    tamanhos: **tela** (120×90, ocupa 46% da altura: nada pula quando o conteúdo chega), **bloco** (72×54) e
    **linha** (32×24, ao lado do texto). Sempre diz o que está fazendo; o texto pode mudar no lugar (progresso
    "Buscando cartas… 12 de 60"). `role="status"`, anunciado ao leitor de tela;
  - `Esqueleto({ linhas })`: a espera de uma lista já tem a forma da lista (selo + dois traços, pulsando devagar);
  - **trocado nas esperas de tela**: abrir lista e buscar cartas, Perfil, Partidas, Fichas, Terrenos, Jogar, a mesa,
    a série e os diálogos de lista; **em bloco**: buscar artes, impressões, edições, conferir nomes; **em linha**:
    cobertura do motor e o painel offline da tela inicial; **esqueleto**: Listas e Coleção.
- **Movimento reduzido** (Aparência › Menos movimento ou a preferência do sistema): quadro parado com as três cartas
  no lugar; o esqueleto não pulsa.
- **O anel continua** onde a espera é do tamanho de um botão: ao lado de "Mais artes", na busca de cartas, na edição
  do scanner e nas esperas pelo outro jogador (online e série).
- **Testes:** contrato visual (tokens, sem cor literal; os dois componentes no `/ds`); e2e "J4" (três tamanhos e
  medidas, três cartas com entradas defasadas, traço = acento, texto embaixo ou ao lado, esqueleto, dois temas com
  `auditaTela`, movimento reduzido pelos dois caminhos, lista com a rede lenta: a espera de tela aparece, diz o que
  faz, ocupa a tela, não usa o anel e some; nenhuma tela nasce com o anel solto).
- **Depende de:** J1.
- **Fora:** esqueleto em forma de grade de cartas (a lista aberta usa a espera de tela); barra de progresso.

**J5 · Abertura** ✅ (leva 205, 06/10/2026)
- **Valor:** o app abre como um objeto bem-feito: as cartas se arrumam na estante e viram o logo.
- **Entregue:** ao abrir o app, sobre o fundo do tema, **o ícone se monta**: o ladrilho pousa (com a sombra dele), a
  moldura e a tábua da estante aparecem e as três cartas caem no lugar, uma depois da outra — a de latão por último,
  já inclinada. Plano, com a sombra curta e o relevo do próprio ícone. **O último quadro é exatamente o ícone do
  app** (o mesmo desenho da barra, medido no teste). Dura 1,2 s (`--dur-abertura`) e esmaece em 180 ms.
- **Não segura o app:** a tela inicial é montada por baixo enquanto a abertura roda; a camada **não recebe toque**
  (o app por baixo já responde) e **qualquer toque ou tecla a dispensa** na hora — o mesmo toque já vale no app. Se
  o carregamento passar de 1,2 s, o que aparece em seguida é a espera do app (`Carregando`, J4).
- **Quando aparece:** uma vez por sessão (abrir o app instalado ou a aba). Não repete ao recarregar, ao trocar de
  tela nem ao voltar do segundo plano. Nada vem da rede: vale sem internet.
- **Movimento reduzido:** o logo parado, sem animação, que esmaece em meio segundo.
- **Divergência do planejado:** "um toque pula" virou "a camada não recebe toque": o toque vai direto para o app e
  dispensa a abertura — não há um toque gasto só para pular.
- **Limite declarado:** a abertura começa depois de o tema ser lido (para não piscar do escuro para o claro); antes
  disso a tela fica alguns milissegundos no fundo padrão.
- **Modelo (`brand`):** `iconeDoApp({ animado: true })` (o mesmo ícone com um grupo por parte), `deveAbrir`,
  `duracaoDaAbertura`, `mostraAbertura`; gancho de teste `window.__SEM_ABERTURA`.
- **Testes:** U `icone.unit` ×2 (o ícone animado, sem os grupos, é idêntico ao ícone; uma vez por sessão e
  durações); e2e "J5" (a tela inicial chega com a abertura ainda visível; camada sem toque; duração; as seis
  animações e a ordem das cartas; último quadro = ícone da barra; não repete ao trocar de tela nem ao recarregar;
  o toque dispensa e chega ao app; movimento reduzido; sem internet; sem erro de console).
- **Depende de:** J4.
- **Fora:** animação entre telas; o ícone voar até a barra.

**J6 · Botão de ação (componente, Listas e Coleção)** ✅ (leva 208, 07/10/2026)
- **Valor:** a ação principal da tela sempre ao alcance do polegar.
- **Entregue — componente `BotaoDeAcao(acoes, { id, rotulo })` (no `/ds`):** botão de 56 px no canto inferior direito, a
  16 px das bordas (mais a área segura), com o desenho do botão primário. **Uma ação:** toca e faz. **Várias (até
  quatro):** abre para cima uma lista de pílulas com rótulo de até duas palavras e ícone, 44 px cada; o "+" gira para
  "×". Fecha ao escolher, no Esc (o foco volta ao botão) e no toque fora — e **o toque que fecha não aciona o que
  está embaixo**. Fica acima do conteúdo e abaixo de diálogos e avisos; o aviso flutuante sobe para cima dele; a
  página ganha 88 px de respiro no fim para ele não cobrir a última linha. Movimento reduzido: sem animação.
- **Listas:** "Nova" e "Prontas" **saíram do topo** (a linha do título ficou só com o título) e moram no botão:
  *Nova lista*, *Prontas*. Sem botão na estante vazia (os convites dela são o primário).
- **Coleção:** "Adicionar" e "Escanear" saíram do topo (a busca ficou); o botão traz *Escanear*, *Adicionar* (abre o
  bloco e leva até o campo) e *Colar lista*. Sem botão na coleção vazia e durante a seleção de cartas (a barra da
  seleção ocupa o pé). O "+" do bloco "Adicionar carta" deixou de ser primário: um primário por tela.
- **Divergência do planejado:** a tela da **Lista** ficou para a J7 (junto com "Jogar com esta lista", que ainda não
  existe como atalho e é a ação principal dela).
- **Testes:** contrato visual (tokens; componente no `/ds`); e2e "J6" (posição e medida nas quatro larguras e dois
  temas, único primário, ações com ícone e até duas palavras, foco, Esc, toque fora sem acionar o fundo, teclado,
  fim da página, reserva do aviso, coleção com três ações, some na tela vazia e na seleção, não fica para trás ao
  trocar de tela; `auditaTela`); e2e antigos de Listas e Coleção ajustados com justificativa (as ações mudaram de lugar).
- **Depende de:** J1. · **Fora:** a mesa de jogo (a bandeja já é o lugar da ação).

**J6b · O bot joga com a arte padrão** ✅ (leva 208, 07/10/2026 · pedido de 07/10/2026)
- **Valor:** as artes que escolhi são minhas; o oponente automático não as usa.
- **Entregue:** a arte escolhida de terreno e de ficha vale só para as cartas **de quem a escolheu**: contra o Shark,
  o meu lado sai na arte escolhida e **o lado do bot na arte padrão da plataforma** (em campo, na folha da carta e
  na legenda da cena). Numa partida online, o lado de quem está no outro aparelho também fica na arte padrão. A dois
  no mesmo aparelho, os dois lados usam as artes do aparelho. As fichas passam a ser guardadas na partida na arte
  padrão; a escolhida entra ao desenhar, só do lado certo.
- **Limite declarado:** partida começada antes desta leva guardou a ficha já na arte escolhida: nela, a ficha do bot
  só volta ao padrão numa partida nova.
- **Testes:** U `terrenos.unit` (regra `valeArteDoUsuario`: bot, online, a dois, dono desconhecido); e2e "J6 arte
  escolhida só do meu lado" (contra o Shark com a mesma lista: a minha Forest na arte escolhida, a do bot não).

**J7 · Botão de ação (resto do app)** ✅ (leva G-209, 07/10/2026)
- **Valor:** o mesmo gesto em todo lugar.
- **Entregue · Lista:** botão de ação com *Jogar*, *Editar* e *Exportar* (ícone e uma palavra, 44 px cada). **Editar e
  Exportar saíram do topo**: a linha do título ficou com o nome e o excluir (ícone discreto, com confirmação). O botão
  é o único primário da tela ("Separar reserva" deixou de ser primário); no modo **Ajustar** ele sai, porque ali a
  ação é o campo de adicionar, e volta ao sair do modo.
- **Entregue · Jogar com esta lista:** *Jogar* abre o preparo da partida com **a lista já escolhida** e o formato dela
  (`#/mesa?lista=<id>`; id desconhecido cai na primeira lista, sem erro). Lista que o motor ainda não resolve chega
  ao preparo do mesmo jeito, e é ele que diz o que falta (uma regra só, num lugar só).
- **Entregue · Perfil › Partidas:** com partidas no histórico, botão de ação único *Jogar* (uma ação: o botão a
  executa, sem abrir lista). No histórico vazio continua o convite da própria tela.
- **Divergência do planejado (decisão de design):** **Início, Cartas e Jogar ficam sem botão.** No Início o atalho
  Jogar já é o primário e os outros atalhos são as ações (o botão só repetiria); em Cartas a ação é Buscar, colada ao
  campo; em Jogar a ação é "Começar partida", que precisa do rótulo e fica no fim do formulário. Um botão flutuante
  nessas telas seria um segundo primário. Notícias recebe o dela na N2.
- **Testes:** e2e "J7" (posição e medida nas quatro larguras e dois temas, único primário, três ações com ícone e
  uma palavra, fonte larga, fim da página, Jogar com cada uma de duas listas, id desconhecido, Editar, Exportar,
  some no Ajustar, Início e Cartas sem botão; `auditaTela`); e2e I5 ganhou o botão de Partidas (medida, fim da
  página, leva a Jogar); e2e antigos da Lista ajustados com justificativa (as ações mudaram de lugar).
- **Depende de:** J6. · **Fora:** atalho "jogar contra o Shark" direto da lista (hoje o oponente se escolhe no preparo).

**Fora do épico:** tablet e paisagem; sons; animação entre telas; botão flutuante na partida.

### N · Notícias (E58, pedido de 06/10/2026)

**Pedido (06/10/2026):** feed de notícias de Magic com rolagem infinita, só com internet, com tela estática
bem-feita quando não houver o que carregar, juntando as melhores fontes, no design system do app e com as
mecânicas dos melhores leitores de notícia.

**Decisão de arquitetura (ADR-08, aceita pelo dono em 07/10/2026):** o navegador não consegue ler o RSS de
outros sites (bloqueio de origem) e o app não tem servidor. Um **fluxo agendado do GitHub Actions** lê as fontes de
hora em hora, normaliza e publica páginas JSON prontas num **ramo próprio (`noticias`)**, que o app lê. O `main`
não recebe esses commits (a guarda de agregação e o histórico das levas ficam intactos). Custo: zero; atraso
máximo de uma hora. Alternativa descartada: serviço de terceiros que converte RSS (limite de uso, chave exposta,
some sem aviso).

**Conteúdo e direito autoral:** o app mostra título, fonte, autor, data, imagem de capa (endereço da própria
fonte) e um resumo de até 280 caracteres; **o texto completo abre no site da fonte**. Nada de copiar artigo.

**Fontes (conferidas uma a uma em 07/10/2026, feed público respondendo):**

| Fonte | Feed | Formato | Observação |
|---|---|---|---|
| MTGGoldfish | `mtggoldfish.com/feed` | Atom | sem capa no feed |
| EDHREC | `edhrec.com/articles/feed` | RSS | capa dentro do resumo; tema fixo Commander |
| Star City Games | `articles.starcitygames.com/magic-the-gathering/feed/` | RSS | usa o feed só de Magic (o geral traz outros jogos) |
| Card Kingdom | `blog.cardkingdom.com/feed/` | RSS | capa dentro do resumo |
| Hipsters of the Coast | `hipstersofthecoast.com/feed/` | RSS | publica também D&D: filtrado |
| MTG Arena Zone | `mtgazone.com/feed/` | RSS | tema fixo Arena |
| **Cards Realm** (português) | `mtg.cardsrealm.com/pt-br/pt/feed.rss` | RSS | cerca de 12 matérias por semana, só Magic; o feed não manda capa nem autor: a capa vem da página (og:image) |
| **O Vício** (português) | `ovicio.com.br/tag/magic-the-gathering/feed/` | RSS | portal geral, só a etiqueta de Magic; cerca de uma matéria por mês; com capa e autor |

**Pesquisa de fontes em português (07/10/2026, mais de 60 candidatos conferidos um a um):** o que existe em
português com feed público, vivo e de Magic são as duas da tabela. O resto:
- **Sem feed ou bloqueado para leitura automática:** LigaMagic (403 em tudo; só entraria com acordo), Wizards em
  pt-BR (página de notícias ativa, sem feed), Bazar de Bagdá, Magic Domain, MTG Brasil, Epic Game, Mana Fix (403),
  Iluro (sem feed), Eternal Magic (laço de redirecionamento).
- **Feed existe, mas o site proíbe a coleta:** Deck Certo (o `robots.txt` veda reuso automático sem permissão).
- **Feed de etiqueta de Magic parado há mais de 60 dias:** Mox Land (jul/2026, reavaliar se voltar), Diviny Games,
  Critical Hits, Olhar Digital, Adrenaline, MeuPlayStation, PróximoNível, Salão de Jogos, e outros mortos há anos.
- **Não conferidos (bloqueados para a ferramenta de pesquisa):** boletins no Substack, IGN Brasil, Tecmundo,
  The Enemy, Google Notícias. Ficam como candidatos.
Acrescentar fonte é uma linha em `FONTES` (`noticias.mjs`).

**N1 · Coletor de notícias** ✅ (leva G-210, 07/10/2026)
- **Valor:** as notícias chegam sozinhas, de várias fontes, numa linha do tempo só.
- **Entregue:** `noticias.mjs` (Node, sem dependência nova) lê RSS 2.0 e Atom, normaliza cada item (`id`, `titulo`,
  `resumo` ≤ 280 em texto puro, `url`, `fonte`, `autor`, `data` ISO, `imagem`, `idioma`, `temas`), junta com o que já
  estava publicado, descarta repetidos (mesmo endereço — com rastreio, âncora ou barra a mais — ou mesmo título no
  mesmo dia), mantém os últimos 30 dias, ordena da mais nova para a mais antiga e corta em páginas de 20
  (`pagina-1.json`…, `indice.json` com total, páginas, hora da coleta, temas e o estado de cada fonte).
  Fonte fora do ar ou ilegível não derruba a coleta: as outras entram, o que ela já tinha continua e a falha fica
  no índice. Se todas caem, o que estava publicado continua no ar e o fluxo acusa.
- **Fluxo:** `.github/workflows/noticias.yml`, de hora em hora (minuto 17) e por disparo manual, publica no ramo
  **`noticias`**. O `main` não recebe commit. Sem notícia nova o índice só é regravado a cada 6 h (não vira um
  commit por hora).
- **Segurança e direito autoral:** só endereço `http(s)` entra (capa só `https`); título e resumo saem sem HTML e
  sem script; o corpo da matéria nunca é guardado; o rodapé automático do feed ("The post … appeared first on …") sai.
- **Temas** (para a N3): `commander`, `pauper`, `arena`, `lancamentos`, `competitivo`, pelo título e pelas
  categorias do feed, mais o tema fixo da fonte.
- **Limites declarados:** matéria de outro jogo (D&D, Lorcana, Riftbound, Pokémon…) fica fora pelo título e pela
  categoria — uma matéria de Magic marcada com a categoria de outro jogo sai junto; o leitor de XML é o mínimo para
  RSS e Atom (não é um leitor geral de XML); item com data inválida é descartado; fonte que não manda capa fica
  sem capa (a N2 desenha a capa em traço); as palavras dos temas são em inglês (todas as fontes são).
- **Como o app vai ler (N2):** `https://raw.githubusercontent.com/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-/noticias/indice.json`
  e `pagina-N.json` (o endereço aceita leitura de outra origem).
- **Testes:** U `noticias.unit` com feeds de exemplo inventados em `.noticias/` (RSS, Atom, HTML e script no
  resumo, entidade dentro de entidade, data inválida e no futuro, item sem imagem, pixel de rastreio, capa em http,
  endereço perigoso, outro jogo, repetido, fonte que falha e fonte ilegível, paginação, janela de 30 dias, não
  regravar sem novidade, página que sobra some); o portão não depende da rede.
- **Depende de:** ADR-08 aceito. · **Trilha:** `geral`, com um arquivo de fluxo novo — **aviso à trilha `infra`:**
  `noticias.yml` é independente do Portão de release e só escreve no ramo `noticias`.

**N2 · Tela Notícias** ✅ (leva G-211, 07/10/2026)
- **Valor:** saber o que está acontecendo no Magic sem sair do app, no idioma que eu leio.
- **Entregue · tela:** rota `/noticias`, com entrada pela Início (atalho largo "Notícias", no fim). Linha do tempo em
  uma coluna: a primeira notícia é o **destaque** (capa 16:9 com moldura reservada — nada pula quando a imagem
  chega —, fonte, tempo relativo, título em serifada até três linhas, resumo até duas); a cada seis, uma notícia com
  capa ganha o cartão cheio; as demais são linhas compactas com miniatura (sem capa, a linha é só texto). Tocar abre
  a matéria no navegador, em outra aba. Título e resumo ficam no idioma da fonte (`lang`).
- **Entregue · rolagem infinita:** a página seguinte é pedida uma tela e meia antes do fim; esqueleto enquanto
  chega; o que já está na tela não é redesenhado; "Você está em dia" no fim. Erro no meio: aviso ali mesmo, com
  "Tentar de novo", e o que já chegou continua.
- **Entregue · idioma por bandeiras (pedido de 07/10/2026):** dois botões de 44 px no topo, **Português** (bandeira
  do Brasil) e **English** (bandeira dos Estados Unidos), ligados ou desligados cada um — dá para ler só em
  português, só em inglês ou os dois (padrão). O último ligado não desliga, e a tela diz. A escolha fica no aparelho
  (`noticias.idiomas`, vai no backup). Com os dois ligados, cada notícia leva a bandeirinha do idioma. As bandeiras
  são desenho do conjunto do app (componente `Bandeira`, no `/ds`), em cores por token, nunca emoji.
- **Entregue · coletor:** duas fontes em português (tabela acima); **séries por idioma** (`pt-pagina-N.json`,
  `en-pagina-N.json`, e `idiomas` no índice) para quem lê num idioma só não atravessar as páginas do outro; **capa
  pela página** para a fonte que não a manda no feed (og:image, até 15 matérias por coleta, uma vez por notícia);
  temas com as palavras em português; notícia de Magic que cita outro jogo no título fica.
- **Estados:** carregando (esqueleto); **sem internet**, **notícias fora do ar** e **nada publicado**: tela parada
  desenhada (ícone em traço, uma linha dizendo o que houve e o que funciona, "Tentar de novo"); a internet voltando,
  as notícias chegam sozinhas; capa que falha vira capa em traço no mesmo espaço.
- **Segurança:** o que vem do ramo é tratado como dado: só entra notícia com endereço `http(s)`, capa só `https`,
  título e resumo são escritos como texto (HTML não vira elemento), a matéria abre com `noopener noreferrer` e a
  imagem é pedida sem informar de onde (`no-referrer`).
- **Divergências do planejado:** sem entrada na barra de navegação (em 360 px ela já está cheia; entra pela
  Início); "alternar cartão cheio e linha" virou "um cartão cheio a cada seis" (mais notícia por tela); "voltar à
  tela no mesmo ponto da rolagem" fica na N3, com as novas e o atualizar.
- **Limites declarados:** nada é guardado para ler sem internet (a N4 guarda título e endereço); em português há
  hoje cerca de 12 matérias por semana, quase todas de uma fonte só; a bandeira dos Estados Unidos é simplificada
  (sete faixas, oito pontos) para caber em 21×14 px.
- **Testes:** U `noticias.unit` (português, séries por idioma, capa pela página com teto e sem repetir pedido);
  U `noticias.tela.unit` (idiomas, série a ler, tempo relativo, junção de páginas, forma, serviço); e2e "N2" com o
  ramo de mentira (entrada, destaque, capa 16:9, capa que falha, endereço perigoso e HTML no título, três páginas
  até o fim sem repetir, só português pela série própria com o botão no lugar, último idioma não desliga, escolha
  guardada, erro no meio, índice antigo, sem internet e volta, falha, vazio; `auditaTela` nas quatro larguras, dois
  temas e fonte larga; sem emoji).
- **Depende de:** N1, J4.

**N3 · Ler do seu jeito** ✅ (leva G-212, 07/10/2026)
- **Valor:** ver só o que interessa e não perder o ponto.
- **Entregue · filtros:** botão **Filtros** (com o número de critérios ligados, como em Listas e Coleção) abre a
  folha com os **temas** (Commander, Pauper, Lançamentos, Competitivo, Arena) e as **fontes** dos idiomas ligados.
  Passa quem tem algum dos temas ligados **e** é de alguma das fontes ligadas. Filtrar redesenha o que já foi lido
  e busca as páginas seguintes sozinho até encher a tela ou acabar; a primeira que passa vira o destaque. Quando
  nada passa, a tela diz e oferece "Limpar filtros". A escolha fica no aparelho (`noticias.filtro`, vai no backup).
- **Entregue · novas:** a notícia mais nova já mostrada fica guardada (`noticias.vista`); na visita seguinte, o que
  chegou depois leva o selo **Nova** e a tela diz quantas são ("3 novas"). Na **Início**, o atalho Notícias troca a
  frase por "3 novas" (olha só a primeira página, nos idiomas e filtros escolhidos; "20+" quando a página inteira é
  nova). Quem nunca abriu Notícias não tem "novas" e a Início não pede nada à rede.
- **Entregue · atualizar:** botão de atualizar e **puxar para baixo no topo** (o gesto do navegador de recarregar a
  página fica desligado nesta tela). Busca por cima da cópia do navegador e diz o resultado ("3 notícias novas" ou
  "Nada de novo por enquanto"). Puxão curto ou com a página rolada não faz nada.
- **Entregue · voltar no mesmo ponto:** sair da tela e voltar em até 30 minutos devolve a linha do tempo já lida e
  o ponto da rolagem, sem buscar as páginas de novo. Se chegou notícia nesse meio-tempo, a leitura fica onde estava
  e um **aviso flutuante** ("3 novas") leva ao topo e atualiza.
- **Limites declarados:** os temas vêm das palavras do título e das categorias do feed (uma notícia sem palavra
  conhecida fica sem tema e só aparece sem filtro de tema); o contador da Início conta até a primeira página; o
  ramo é servido com cópia de até cinco minutos pelo próprio GitHub, então "atualizar" pode não mostrar o que foi
  coletado no último minuto; a linha do tempo guardada para a volta vive só enquanto o app está aberto.
- **Testes:** U `noticias.tela.unit` (filtro limpo e regra de passar, contar novas, data mais nova, rótulos,
  serviço: guardar filtro e visita, atualizar sem cópia, novas para a Início); contrato de rolagem (`ds.unit`: o
  ponto novo está declarado); e2e "N3" (ferramentas de 44 px, filtros por tema e fonte com interseção, guardados,
  nada passa e limpar, voltar no mesmo ponto sem novas buscas, contador na Início, aviso flutuante, selo Nova,
  atualizar pelo botão, puxar curto, puxar inteiro e puxar com a página rolada, visita seguinte sem novas;
  `auditaTela` nas quatro larguras, dois temas e fonte larga).
- **Depende de:** N2.

**N4 · Guardar e compartilhar** ✅ (leva G-213, 08/10/2026)
- **Valor:** separar o que ler depois.
- **Entregue · mais ações:** cada notícia ganhou o botão **Mais ações** (três pontos, 44 px, ao lado da fonte). Ele
  abre a folha da notícia: fonte, manchete e três ações — **Guardar** (ou **Tirar**), **Compartilhar** e **Abrir**.
  O resto do cartão continua abrindo a matéria com um toque.
- **Entregue · guardar:** a notícia guardada ganha o marcador ao lado da fonte, no lugar (nada é redesenhado), e o
  botão **Guardadas** das ferramentas mostra quantas são. Tirar tem **Desfazer**. Ficam no aparelho título, fonte,
  data, endereço e o endereço da capa (`noticias.guardadas`, até 200, vai no backup).
- **Entregue · Guardadas:** rota `/noticias/guardadas`, a última guardada primeiro. **Abre sem internet**: a lista
  vem do aparelho, sem miniaturas, e a tela diz que a matéria abre quando a conexão voltar (a folha da notícia diz
  o mesmo). Vazio: tela parada com "Ver notícias". Voltar leva às notícias no ponto em que a leitura estava.
- **Entregue · compartilhar:** usa a folha de compartilhar do sistema (título e endereço); onde ela não existe, copia
  o endereço e avisa. Quem fecha a folha do sistema sem escolher não vê aviso de erro.
- **Mudança de estrutura (para as outras trilhas):** o cartão de notícia deixou de ser um link e virou um
  `article`; o **título é o link**, esticado sobre o cartão inteiro, e o botão fica por cima. A auditoria de tela
  (`auditaTela`) passou a medir o alvo de um link esticado pelo cartão que ele cobre, e só quando o link tem de
  fato esse `::after` cobrindo o ancestral.
- **Divergência do planejado:** Guardar e Compartilhar ficam a dois toques (três pontos → ação), não direto no
  cartão: dois botões de 44 px por notícia não cabem na linha compacta em 360 px sem tirar largura do título.
- **Limites declarados:** só o endereço e os dados da notícia ficam guardados — a matéria em si não é copiada (direito
  autoral) e pede internet; a miniatura das guardadas também pede internet; o teto é de 200 guardadas (as mais
  antigas saem).
- **Testes:** U `noticias.tela.unit` (guardar no começo, guardar de novo, tirar, crivo do que vem do disco, teto,
  serviço com repor para o Desfazer); e2e "N4" (botão de 44 px em cada notícia e cartão inteiro como link, folha
  com três ações, marcador no lugar, contador, tirar e desfazer, abrir, compartilhar copiando, pela folha do
  sistema e cancelando, lista de guardadas, sem internet, vazio, volta; `auditaTela` nas quatro larguras, dois
  temas e fonte larga); e2e N2 e N3 ajustados com justificativa (o link passou a ser o título).
- **Depende de:** N2.

**N5 · Lançamentos na linha do tempo** ✅ (leva G-217, 08/10/2026)
- **Valor:** saber que coleção está chegando sem depender de matéria.
- **Entregue:** cartões de **coleção** montados com as coleções da Scryfall — as lançadas nos últimos 30 dias e as
  que chegam nos próximos 60 (no máximo três a caminho, a mais próxima primeiro), só de papel e das séries que
  importam para quem joga (expansão, básica, Masters, draft, Commander). Cada cartão traz o símbolo da coleção (ou o
  código, quando o símbolo não carrega), "Coleção nova" ou "Coleção a caminho", "lançada em 06/10" ou "chega em
  20/10", o nome, o tipo e o número de cartas. Em Notícias, as coleções entram **entre as notícias pela data** (a
  que chega fica no topo, a primeira notícia continua sendo o destaque); na Início, no máximo uma entre as três.
- **Tocar abre as cartas da coleção** na busca do app (`#/cartas?colecao=<código>&nome=<nome>`), com o selo
  "Coleção: …" que se tira com um toque. Sem internet, a busca usa a base do aparelho, só com as cartas daquela
  coleção.
- **Detalhes:** coleção tem o tema Lançamentos (e Commander, quando é de Commander) para os filtros da N3; não conta
  como notícia nova; fica fora quando há filtro de fonte; aparece nos dois idiomas (o nome é o da Scryfall, em
  inglês). A lista de coleções é buscada uma vez por abertura e guardada no aparelho por um dia; sem Scryfall, as
  notícias seguem sem coleções.
- **Testes:** U `noticias.tela.unit` (quais coleções entram, a ordem das que chegam, a data de ordem, símbolo só
  em https, a mistura com as notícias por página e no fim, coleção não conta como nova, cache de um dia, falha da
  Scryfall); e2e "N5" (a que chega no topo e o destaque logo depois, digital e fichas fora, a recém-lançada no fim
  da linha, tocar e buscar `e:<código>`, selo que se tira, Início com uma; `auditaTela` nas quatro larguras e dois
  temas).
- **Depende de:** N2.

**Fora do épico (escopo negativo mantido):** ranking de metagame e listas de torneio como dado do app (a notícia
pode falar disso; o app não monta ranking); comentários, curtidas e conta em rede social; notificação por push
(precisa de servidor); leitura da matéria inteira dentro do app; vídeo embutido.

### K · Mesa e Início (E59, pedido de 08/10/2026)

**Pedido (08/10/2026):** na partida, poder voltar a ver a mão durante uma decisão que a esconde (vidência, vigiar,
olhar o topo…) e voltar à decisão quando quiser; feltros do modo escuro com mais destaque, confortáveis e da paleta
do app; um controle na partida para ligar e desligar "parar sempre" por etapa do turno, parando sempre que houver
resposta ou ação possível e seguindo sozinho quando não houver; e uma tela inicial mais sofisticada, com as
notícias integradas, porque ela é a tela que mostra o patamar do app.

**Ordem e tamanho:** K1 e K2 numa leva (as duas da mesa, pequenas); K3 numa leva (mexe na passagem automática de
prioridade, que é da mesa e conversa com o motor); K4 em uma ou duas levas.

**K1 · A mão de volta durante a decisão** ✅ (leva G-214, 08/10/2026)
- **Valor:** decidir o que fica no topo olhando a própria mão, sem perder a decisão.
- **Entregue:** nas decisões que tomam o lugar da mão na bandeja — escolher cartas (vidência, vigiar, olhar o topo,
  buscar, devolver, descartar do oponente) e escolher o modo de um gatilho — entra um seletor de dois botões de
  44 px, **Escolha** e **Mão · N**. "Mão" troca as cartas da decisão pela sua mão, que fica **só para ver** (tocar
  abre a carta grande; nada se joga dali); a instrução da decisão e o Confirmar continuam à vista, e a decisão
  continua esperando. Dá para alternar quantas vezes quiser; o seletor não sai do lugar. A decisão seguinte começa
  mostrando a decisão.
- **Fora:** "descartar ou sacrificar" (Highway Robbery) já mostra a mão no próprio seletor dela; decisões em
  diálogo (pagar, alvo de gatilho) deixam a mão à vista e não precisam do seletor.
- **Custo em 360×780:** +52 px na bandeja só enquanto a decisão está aberta.
- **Testes:** e2e "K1" (Preordain: seletor de 44 px com ícone e contagem da mão, alternar ida e volta três vezes, o
  botão no mesmo lugar, a decisão pendente o tempo todo, a carta da mão só abre a folha, decidir depois e o seletor
  sumir; `auditaTela` nas quatro larguras, dois temas, nas duas vistas).

**K2 · Feltros com presença** ✅ (leva G-214, 08/10/2026)
- **Valor:** a mesa parece mesa no escuro, sem cansar a vista.
- **Diagnóstico:** o feltro escuro (`#15302a`) ficava a 1,24:1 das zonas (`--bg-elev-1`): na prática, a mesa
  parecia toda marrom-escura.
- **Entregue:** feltro verde novo (`#1b4535`) e dois feltros novos, **Oceano** (`#173f57`) e **Vinho** (`#632a3b`),
  em Perfil › Aparência › Mesa (agora seis superfícies), com as versões do tema claro. Os três ficam a 1,5:1 ou
  mais das zonas e mantêm `--fg` e `--fg-muted` AA sobre a mesa (o teto de claridade é o texto secundário: 4,5:1).
- **Testes:** contrato visual D7 (AA nos dois temas para as cinco superfícies); e2e "K2" (na partida, cada feltro do
  escuro a 1,5:1 ou mais das zonas e texto secundário AA, `auditaTela`); e2e D7 ajustado (seis superfícies).

**K3 · Parar sempre por etapa** ✅ (leva G-215, 08/10/2026)
- **Valor:** decidir em que etapas a partida espera por mim, sem perder a chance de jogar ou responder.
- **Regra (definida pelo dono em 08/10/2026):** cada etapa tem a chave **"parar sempre"**. **Ligada:** a partida para
  em toda passagem pela etapa. **Desligada:** só para quando você tem uma **ação ou resposta possível** ali. Sem nada
  a fazer, segue sozinha. Há uma lista de chaves para o **seu turno** e outra para o **turno do oponente**, nas cinco
  etapas da barra de fases (Início, Principal 1, Combate, Principal 2, Final). Padrão: Principal 1 e Principal 2 do
  seu turno.
- **Entregue:** **Paradas** no balão da faixa de vez abre a folha "Parar sempre" com as dez chaves (componente novo
  `Chave`, no `/ds`) e o botão **Padrão**. Muda na hora, vale para a partida em andamento e para as próximas, e fica
  no aparelho (`mesa.paradas`, vai no backup; entregue ao modelo da mesa no começo do app).
- **"Ação possível" de verdade:** o motor lista a instantânea mesmo sem mana para ela (o pagamento é conferido ao
  conjurar); a parada só conta a ação que o motor aceitaria agora — ela é tentada numa cópia do estado (motor puro).
  Gerar mana sozinho não conta. Com a pilha cheia e nenhuma resposta possível, passar é deixar resolver: a chave da
  etapa não segura a mesa ali.
- **Mudança de comportamento (declarada):** antes as paradas eram fixas (principal 1, ataque e principal 2 do seu
  turno; no turno alheio, só ataque e final, e só com resposta). Agora, **com uma instantânea e mana para ela, a
  partida para em qualquer etapa** — inclusive na manutenção e na compra do oponente — porque há resposta possível.
  Quem não quiser isso tem o "Passar o turno", que continua indo direto à sua próxima principal 1.
- **Fora:** chave por passo fino (início de combate, bloqueio, dano separados); a escolha "Parar em todos os passos"
  do preparo da partida continua como estava (desliga toda passagem automática).
- **Testes:** U `table.unit` (chaves limpas e padrão, grupo de cada passo, ligada para nos dois turnos mesmo sem
  nada a fazer, desligada segue sozinha, resposta possível para em qualquer etapa, instantânea sem mana não conta);
  A9 e A4 ajustados com justificativa (a política mudou a pedido); e2e "K3" (folha, dez chaves de 44 px, padrão,
  ligar Final e a mesa parar no final, guardado ao recarregar, Padrão, catálogo; `auditaTela` nas quatro larguras e
  dois temas).

**K4 · Início com notícias integradas** ✅ (leva G-216, 08/10/2026)
- **Valor:** a primeira tela mostra o patamar do app e o que há de novo, sem parecer uma pilha de botões.
- **Diagnóstico (antes, 360×780):** seis caixas iguais empilhadas (Jogar, quatro destinos em 2×2 e Notícias como mais
  uma caixa), dois primários (Jogar e "Preparar tudo agora") e nada de conteúdo vivo acima da dobra.
- **Entregue:** de cima para baixo — a **data** (dia da semana e mês, em caixa alta discreta) e a saudação; o cartão
  **Continuar** quando há o que retomar; **Jogar** em destaque, único primário; **Listas, Coleção, Escanear e Buscar
  numa linha só**, leves (ícone num círculo de 52 px e uma palavra, sem caixa); a seção **Notícias** integrada — título
  com o ícone, quantas são novas e **Ver todas**, o destaque com capa 16:9 e as duas seguintes em linha, nos idiomas e
  filtros escolhidos em Notícias, cada uma abrindo a matéria; depois o painel "Sem internet" e o catálogo.
- **Estados da seção:** carregando (esqueleto no próprio lugar), **sem internet** (uma linha; quando a internet volta,
  as notícias chegam sozinhas), **fora do ar** (uma linha com "Tentar de novo"), **nada publicado** (uma linha). A
  seção nunca segura a Início.
- **Também:** "Preparar tudo agora" (painel Sem internet) deixou de ser primário — um primário por tela.
- **Custo em 360×780:** a data acima do título desce o Jogar uns 20 px em relação à D3 (209 → 175 px sem perfil,
  150 com perfil; a D3 tinha chegado a 159 e 134). O guarda-corpo da D3 foi ajustado com essa justificativa.
- **Para as outras trilhas:** `#go-news` passou a ser o "Ver todas" da seção (antes um atalho); a Início lê o índice e a
  primeira página do ramo `noticias` a cada visita com internet — nos testes de navegador o ramo fica fora do ar por
  padrão (rota no `open()`), salvo no teste que o simula.
- **Fora:** o painel "Sem internet" continua como estava (recolhe numa linha quando tudo está guardado);
  lançamentos de coleção na Início (vêm com a N5).
- **Testes:** e2e "K4" (data em português, um primário, quatro destinos na mesma linha com círculo e 44 px ou mais,
  seção com destaque 16:9 e duas linhas, bandeiras com os dois idiomas, Ver todas, só português, fora do ar e tentar
  de novo, sem internet e volta, nada publicado; `auditaTela` nas quatro larguras, dois temas e fonte larga); e2e U2,
  N2 e N3 ajustados com justificativa (a entrada de Notícias e os destinos mudaram de forma).

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

### Publicar a partir de uma conversa (padrão desde a leva 124)

```
npm install        # uma vez por clone; liga o gancho de pre-push
npm run publicar   # busca o main, rebase, guarda de agregação, portão, push
```

Regras completas em `CLAUDE.md`. Trilhas em uso (o nome vai no rodapé `Trilha:` de todo commit):

| Trilha | Escopo |
|---|---|
| `bot` | Shark: B9–B20 |
| `motor` | épico R, regras e scripts de carta |
| `geral` | design system, scanner, coleção, listas, offline, o que não é bot nem motor |
| `infra` | portão, CI, publicação |

### Publicar pela interface web

1. Suba os arquivos alterados em **Add file → Upload files**.
2. A aba **Actions** roda o Portão de release. ✓ verde significa publicável.
3. Com ✗, abra o job, leia o primeiro teste que falhou e não siga com o deploy até corrigir.
   - Com o fuzz noturno, a falha traz a semente: ela reproduz o bug localmente.
4. O GitHub Pages publica o `main` sozinho. Na primeira abertura depois de um deploy, recarregue uma vez: o service worker usa rede primeiro para o HTML.
