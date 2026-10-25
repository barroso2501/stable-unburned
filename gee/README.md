# Scripts Google Earth Engine

- Numerados na ordem de execução. Cada script faz **uma** coisa e tem os parâmetros no topo.
- O GitHub é a fonte. Para rodar, copie o script para o Code Editor; se alterar algo lá, traga a alteração de volta.
- Toda exportação grava proveniência (assets de entrada, parâmetros, `RUN_TAG`, data).

## Estado (2026-10-24)

| Script | Faz | Estado |
| --- | --- | --- |
| `00_stable_unburned_lulc.js` | assets de áreas estáveis A e B | executado; **arquivo a adicionar** (script original) |
| `01_zonal_4A_cerrado.js` | área de 4-A no Cerrado por núcleo × borda × fragmento | executado (v0.2) |
| `04b_gpw_altura.js` | altura anual de vegetação baixa (Global Pasture Watch v1, 30 m) no pixel MODIS de cada ponto, só pixels da população (1 tarefa) | executado (v0.1) |
| `02a_populacao.js` | asset da população do piloto | executado (v0.2) |
| `02b_area_4AB.js` | CSV de área 4-A e 4-B por faixa (4 partes) | executado (v0.3) |
| `02c_pureza.js` | 2 assets de pureza MODIS | executado |
| `02d_stats_mcd12q2.js` | CSVs de pureza e de ciclos MCD12Q2 | executado (ciclos por ano civil; ver docs/execucoes.md) |
| `02e_ciclos_ano_hidrologico.js` | ciclos MCD12Q2 recontados por ano hidrológico (jul–jun, D16) + histograma de QA | executado |
| `03_amostra.js` | amostra estratificada por faixa (asset + CSV) | executado |
| `04_gedi.js` | estrutura do dossel GEDI: L2B (cover, PAI, FHD) e L2A (rh50, rh98) no pixel MODIS de cada ponto, só footprints bons dentro da população; um footprint por linha (10 tarefas) | executado (v0.2) |
| `05_series.js` | séries MOD13Q1, MCD43A4 (8 dias) e HLS L30/S30 nos 1215 pontos | executado (30 tarefas) |
| `05b_chirps.js` | chuva CHIRPS v2.0 por pêntada nos 1215 pontos, 2000–2025 (5 tarefas) | executado (v0.2) |

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

## Parte 2 — savana queimada (4-B) sob regime espaçado (D23–D28)

| Script | O que faz | Estado |
| --- | --- | --- |
| `B1a_populacao_4B.js` | asset da população 4-B: sem fogo 1985–2000; 1–5 fogos em 2001–2025 com ≥ 4 anos entre fogos; 1º fogo ≥ 2002; núcleo 3×3 com o mesmo histórico de fogo; borda ≥ 250 m; estratos 1 (um fogo) e 2 (2–5 fogos) | executado |
| `B1b_area_4B.js` | área por faixa × estrato × nº de fogos × ano do 1º fogo (4 partes) | executado |
| `B1c_coerencia_4B.js` | pureza e coerência do histórico de fogo no pixel MODIS 463 m (asset) | executado |
| `B1d_contagens_4B.js` | contagem de pixels MODIS candidatos por faixa × estrato × pureza × coerência, para fixar os limiares antes da amostra | executado |
| `B2_amostra_4B.js` | amostra 4-B: MODIS (pureza e coerência ≥ 90%, grade par, até 300 por faixa × estrato) + HLS (150 por faixa × estrato em 5–20° S, grade de ~510 m na população de 30 m); histórico de fogo e ponto A mais próximo | executado |
| `B3a_series_4B.js` | séries MOD13Q1 e MCD43A4 (pontos MODIS) e HLS L30/S30 (todos os pontos), por faixa × estrato; derivado de `05_series.js` | teste ok; completo em andamento |
| `B3b_chirps_4B.js` | CHIRPS por pêntada nos 1899 pontos, **desde 1984** (v0.2, D30); derivado de `05b_chirps.js` v0.2 | executado |
| `B3c_gpw_4B.js` | altura GPW anual no quadrado do pixel MODIS (pixels da população 4-B); derivado de `04b_gpw_altura.js` | **a rodar** (teste primeiro) |
| `B3d_fogo_mensal_4B.js` | v0.2: mês do fogo no pixel do ponto e histograma dos meses no quadrado MODIS, por ano 1985–2025, e status anual (D30) | executado |

