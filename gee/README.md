# Scripts Google Earth Engine

- Numerados na ordem de execução. Cada script faz **uma** coisa e tem os parâmetros no topo.
- O GitHub é a fonte. Para rodar, copie o script para o Code Editor; se alterar algo lá, traga a alteração de volta.
- Toda exportação grava proveniência (assets de entrada, parâmetros, `RUN_TAG`, data).

## Estado (2026-10-24)

| Script | Faz | Estado |
| --- | --- | --- |
| `00_stable_unburned_lulc.js` | assets de áreas estáveis A e B | executado; **arquivo a adicionar** (script original) |
| `01_zonal_4A_cerrado.js` | área de 4-A no Cerrado por núcleo × borda × fragmento | executado (v0.2) |
| `02a_populacao.js` | asset da população do piloto | executado (v0.2) |
| `02b_area_4AB.js` | CSV de área 4-A e 4-B por faixa (4 partes) | executado (v0.3) |
| `02c_pureza.js` | 2 assets de pureza MODIS | executado |
| `02d_stats_mcd12q2.js` | CSVs de pureza e de ciclos MCD12Q2 | executado (ciclos por ano civil; ver docs/execucoes.md) |
| `02e_ciclos_ano_hidrologico.js` | ciclos MCD12Q2 recontados por ano hidrológico (jul–jun, D16) + histograma de QA | executado |
| `03_amostra.js` | amostra estratificada por faixa (asset + CSV) | executado |
| `05_series.js` | séries MOD13Q1, MCD43A4 (8 dias) e HLS L30/S30 nos 1215 pontos | **a rodar — primeiro em modo teste** |

Ordem: `02a` e `02b` juntos → `02c` → `02d` → `02e` → `03` → `05` (a etapa 04, GEDI, vem depois). `02b_diagnostico.js` só imprime no console (não exporta).

## Checagens

- `01`, `02b`: limite do Cerrado = `projects/ee-barroso2501/assets/biomas_IBGE`, campo **`NM_BIOMA`**, valor `Cerrado`.
- `02b`: antes de exportar, o console deve mostrar a "Checagem" com códigos e áreas (ex.: 14, 24). Lista vazia → não exportar.
- `02b`: soma de A deve dar ~11,43 Mha (igual à etapa 01).
- `02d`: as prévias S1 e S2 no console devem trazer linhas.
- Listas `ANTHROPIC` e `NATURAL_VEG`: conferir na legenda oficial da Col. 11.

## Rodar `05_series.js`

1. Modo teste (`TEST_POINTS: 10`): 4 tarefas pequenas (faixa 3, 10 pontos, ano 2020). Conferir colunas e tempo.
2. Rodada completa (`TEST_POINTS: 0`): 5 faixas × (MOD13Q1 + MCD43A4) + 5 faixas × 2 períodos × (L30 + S30) = **30 tarefas**. Dá para lançar por produto, ligando/desligando em `RUN`.
3. Escalas: MOD13Q1 `EVI` bruto ×0,0001; MCD43A4 `EVI_median` já em unidades de EVI; HLS `blue/red/nir` brutos (EVI calculado em Python).
