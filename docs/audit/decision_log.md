# Registro de decisões (espelho da KB, para o GitHub)

Auditoria de 2026-10-27. Fonte: KB do projeto "Picos Produtividade", `kb/03_decisoes.md` (D01–D31), que traz o motivo, a consequência e o teste crítico de cada decisão. Aqui ficam só o essencial e o **estado real**, conferido nesta auditoria.

A **origem** indica quem tomou ou propôs a decisão, segundo o registro na KB. "Mario" = proposta ou decisão explícita dele. "Análise" = proposta feita durante o trabalho e aceita por Mario. Nenhuma discussão exploratória foi promovida a decisão.

| ID | Data | Decisão (resumo) | Origem | Estado na KB | Estado real (auditoria) | Onde |
| --- | --- | --- | --- | --- | --- | --- |
| D01 | 2026-10-23 | Fogo (A/B) como estrato de descrição, sem comparação A × B | Análise (aceita por Mario) | vigente na parte 1; **substituída por D23 na parte 2** | executado (parte 1); substituída na parte 2 por D23 | — |
| D02 | 2026-10-23 | Excluir a classe 11 (Campo Alagado) | Análise (aceita por Mario) | vigente | implementado (classe 11 fora do escopo) | 00 (ausente) |
| D03 | 2026-10-23 | Foco no contexto A; B onde houver amostra | Análise (aceita por Mario) | vigente | superada por D23 e D31 (A e B, só classe 4) | — |
| D04 | 2026-10-23 | Núcleo 3×3 Landsat: ponto e 8 vizinhos com mesma classe estável e mesmo contexto de fogo | Análise (aceita por Mario) | vigente | executado | 02a (A), B1a (B: mesma assinatura) |
| D05 | 2026-10-23 | Classes definidas por estrutura (floresta, savana, campo) e origem (natural/antrópica), não por uso | Análise (aceita por Mario) | vigente | regra conceitual | — |
| D06 | 2026-10-23 | Pastagem (15): não usar o produto de vigor/qualidade como estrato | Análise (aceita por Mario) | vigente | fora do escopo (D31) | — |
| D07 | 2026-10-23 | Usar fitofisionomia do mapa de vegetação IBGE como estrato (proposta de Mario) | Mario | vigente; versão do mapa [P] | **planejado, não implementado** | — |
| D08 | 2026-10-23 | Piloto: classe 4, contexto A, só no Cerrado, com 3 perguntas (padrões espaciais; desacoplamento lenhosas × gramíneas; sensores) | Análise (aceita por Mario) | vigente | executado | 01–10 |
| D09 | 2026-10-23 | Estrutura da vegetação pelo GEDI L2B; `treecover2000` só para sensibilidade | Análise (aceita por Mario) | vigente | executado (GEDI); sensibilidade com treecover2000 **não feita** | 04, 08 |
| D10 | 2026-10-23 | Fragmentação excluída por critério amostral (tamanho mínimo de fragmento, distância mínima da borda), não analisada | Análise (aceita por Mario) | limiares definidos em D12 e D13 | executado (D12, D13) | 01, 02a |
| D11 | 2026-10-23 | KB do projeto para fundamentação e decisões; GitHub para a implementação | Análise (aceita por Mario) | vigente | **revisar**: a auditoria propõe o GitHub como fonte canônica também das decisões | docs/audit/decision_log.md |
| D12 | 2026-10-24 | Distância mínima à borda antrópica = **250 m** no piloto; 500 m como teste de sensibilidade | Análise (aceita por Mario) | vigente | executado (250 m); sensibilidade de 500 m **não feita** | 02a, B1a |
| D13 | 2026-10-24 | Retirar o critério de fragmento pequeno (< ~92 ha) | Análise (aceita por Mario) | vigente | executado | 02a |
| D14 | 2026-10-24 | Estratificação do piloto por faixas latitudinais de 5° (escolha de Mario, usada em outros trabalhos) | Mario | vigente; n por faixa a verificar na etapa 02 | executado | 02a, B1a |
| D15 | 2026-10-24 | Faixa 20–25° S mantida separada, como estrato **exploratório** (não fundida com 15–20° S) | Análise (aceita por Mario) | vigente | executado | 03, análises |
| D16 | 2026-10-24 | Contar ciclos/picos por **ano hidrológico (jul–jun)**, não por ano civil | Análise (aceita por Mario) | vigente | executado | 02e, 06, 07 |
| D17 | 2026-10-24 | "Número de picos" pelo MCD12Q2 deixa de ser métrica central; a pergunta 2 (desacoplamento lenhosas × gramíneas) passa a usar a **forma da curva** do nosso próprio ajuste: data e magnitude do pico, assimetria, presença de … | Análise (aceita por Mario) | vigente | executado; detector de ombro sem validade (não usar) | 06 |
| D18 | 2026-10-24 | Amostra do piloto: candidatos = pixels MODIS 463 m com pureza ≥ 90% em grade de linha/coluna pares (~926 m entre vizinhos); sorteio estratificado por faixa, 300 pontos/faixa, semente 42; ponto aceito só se o pixel de 30 m sob … | Análise (aceita por Mario) | vigente (console: 300/300/300/300/15 pontos) | executado | 03 |
| D19 | 2026-10-24 | Janela de análise do HLS = anos hidrológicos **2018/19–2024/25** (7 anos) | Análise (aceita por Mario) | vigente | executado | 06 |
| D20 | 2026-10-24 | HLS: manter observações com aerossol alto (Fmask bits 6–7 = 11, valor 192) e testar a sensibilidade | Análise (aceita por Mario) | vigente | executado (sensibilidade feita: efeito desprezível) | 06 |
| D21 | 2026-10-24 | Excluir das análises com MOD13Q1 os 49 pontos com pureza < 80% no pixel de 232 m | Análise (aceita por Mario) | vigente | executado em A; **não aplicado em B** (B4b) | common.py, B4b |
| D22 | 2026-10-24 | **MCD43A4** (NBAR, BRDF, janelas de 8 dias) como produto MODIS principal; MOD13Q1 só como checagem | Análise (aceita por Mario) | vigente | executado | 06–09, B4 |
| D23 | 2026-10-24 | **Parte 2 do piloto: comparar A com savana 4-B queimada sob intervalos compatíveis com o regime natural** (proposta de Mario, a partir dos resultados da parte 1 e da hipótese da macega) | Mario | vigente | executado | B1–B4 |
| D24 | 2026-10-24 | Parte 2 usa **Fogo Col. 5.1 + LULC Col. 11** (como A), com a tipologia de intervalos do manuscrito de Mario & Hofmann (Definição A: não censurados, censura à esquerda, à direita e total) recalculada sobre essa base | Mario | vigente | executado | B1a, B3d |
| D25 | 2026-10-24 | "Regime compatível com o natural" = **intervalo + estação do fogo** (intervalo médio observado numa faixa definida por Mario e fogos concentrados na transição seca–chuva) | Mario | vigente; limites [P] | parte "intervalo" substituída por D28; estação implementada via D27/D30 | B4a |
| D26 | 2026-10-24 | Unidade de análise da parte 2: **MODIS 463 m com coerência do histórico de fogo e HLS 30 m em paralelo** | Análise (aceita por Mario) | vigente | executado; coerência redefinida por evento em D30 | B1c, B2, B4a |
| D27 | 2026-10-24 | Na parte 2, cada fogo de 2000–2025 é descrito por **duas dimensões**: o intervalo (efeito de médio e longo prazo) e o **momento na estação** (início, meio ou fim da seca, ou estação úmida) (proposta de Mario) | Mario | vigente; esquema de estação [P] | executado (esquema por ponto e ano, CHIRPS); "fim da seca" e "início das chuvas" separados (decisão de Mario, 2026-10-25) | B4a, B4c |
| D28 | 2026-10-24 | Universo amostral da parte 2 (proposta de Mario): savana 4-B **sem fogo em 1985–2000** e, em **2001–2025**, com **até 5 fogos** e **intervalos entre fogos consecutivos > 3 anos** (≥ 4 anos pela Definição A) | Mario | vigente; refinamentos [P] | executado; refinamentos (estratos 1/2, 1º fogo ≥ 2002) aprovados por Mario | B1a, B4a |
| D29 | 2026-10-25 | Amostra da parte 2, fixada antes do sorteio: (a) **MODIS**: pixels 463 m com pureza ≥ 90% e coerência ≥ 90%, grade par, até 300 por faixa × estrato, semente 42, pixel de 30 m sob o ponto na população e no mesmo estrato; (b) … | Análise (aceita por Mario) | vigente | executado | B2 |
| D30 | 2026-10-25 | Na parte 2, fogo descrito pelo **produto mensal** e pelo **ano de fogo do ciclo de chuva** (do fim das chuvas de um ano ao fim das chuvas do seguinte, por ponto, CHIRPS), não pelo produto anual e pelo ano civil (proposta de Mario) | Mario | vigente | executado; unidades de fogo por evento desde a B4a v0.2 (2026-10-27) | B3b v0.2, B3d v0.2, B4a |
| D31 | 2026-10-25 | **Escopo da implementação final: só savana estável (classe 4) no Cerrado** (decisão de Mario); classes 3, 12 e 15 saem do projeto | Mario | vigente | vigente para a implementação final | — |

## Decisões e premissas registradas fora da tabela de decisões da KB

| Origem | Conteúdo | Onde está na KB | Situação |
| --- | --- | --- | --- |
| Mario, 2026-10-23 | Cerradão está na classe 3, não na 4 | "Correções de premissa" | premissa vigente |
| Mario, 2026-10-23 | Savanas do Cerrado não se explicam por restrição hídrica (limitação química do solo) | idem | premissa vigente |
| Mario, 2026-10-24 | Gatilho hídrico das gramíneas (recarga da camada superficial); brotação lenhosa por fotoperíodo | idem | premissas; testadas nas etapas 09 (compatível) e 09 Teste 2 (efeito fraco) |
| Mario, 2026-10-24 | Exclusão prolongada de fogo como alteração (macega) | idem | hipótese **não testada** (o EVI não enxerga material morto) |
| Mario, 2026-10-25 | Manter "fim da seca" e "início das chuvas" separados | resultados B4a | vigente |
| Mario, 2026-10-24 | Não usar a ausência de tendência do GPW como prova de estabilidade sem as ressalvas (seleção por estabilidade, exclusão de fogo, sensibilidade do produto) | nota técnica GPW | vigente |

## Pontos em aberto que não são decisões

Limites do intervalo "natural" (D25), versão do mapa de vegetação do IBGE (D07), estrato de fogo frequente, inclusão ou não da macega no escopo final: discutidos, **não decididos**.
