# Changelog

## [0.9.0] — 2026-10-24

- `python/common.py`: leitura e limpeza compartilhadas (D19–D22).
- `python/06_metricas.py`: métricas de forma da curva por sensor × ponto × ano hidrológico; diferenças entre sensores; sensibilidade ao aerossol; variabilidade interanual.
- `python/05_qc_series.py` passa a usar `common.py` (resultados idênticos).
- `env/requirements.txt` inclui scipy.

## [0.8.0] — 2026-10-24

- Etapa 05 concluída (30 tarefas). Séries brutas em `data/series/` (fora do git).
- `python/05_qc_series.py`: limpeza (duplicatas HLS, QA MOD13Q1, faixa de EVI) e comparação entre sensores; saídas em `outputs/`.
- `env/requirements.txt` com as versões de pandas e numpy.

## [0.7.0] — 2026-10-24

- `gee/05_series.js`: extração das séries MOD13Q1 (2000–2025), MCD43A4 em janelas de 8 dias (2000–2025) e HLS L30/S30 (2016–2025, Fmask) nos pontos da amostra; modo teste.
- Saída da etapa 03 em `outputs/pilot_4A_sample_v0.1.csv`.

## [0.6.0] — 2026-10-24

- `gee/03_amostra.js`: sorteio estratificado da amostra do piloto (D18, proposta).
- Métrica "número de picos" do MCD12Q2 rebaixada; pergunta 2 passa a usar a forma da curva (D17).

## [0.5.1] — 2026-10-24

- Saídas do 02e em `outputs/`; status atualizado.

## [0.5.0] — 2026-10-24

- `gee/02e_ciclos_ano_hidrologico.js`: recontagem dos ciclos MCD12Q2 por ano hidrológico (D16) e histograma de QA_Overall_1.
- Decisões D15 (faixa 20–25° S exploratória) e D16 (ano hidrológico) registradas na KB.

## [0.4.2] — 2026-10-24

- Etapa 02 concluída: saídas de 02b e 02d em `outputs/`; status dos scripts atualizado.

## [0.4.1] — 2026-10-24

- Campo do limite do bioma corrigido para `NM_BIOMA` em todos os scripts (causa real dos CSVs vazios da etapa 02).
- `02a_populacao.js`: marcado para refazer (asset anterior gerado com o campo errado).
- `02b_area_4AB.js` v0.3: exportação dividida em 4 partes.
- `02b_diagnostico.js`: checagem só no console.

## [0.4.0] — 2026-10-24

- Etapa 02 reorganizada em quatro scripts de propósito único, substituindo `02_populacao_mcd12q2.js` (removido):
  - `02a_populacao.js` — asset da população (já executado; arquivo registra como foi feito);
  - `02b_area_4AB.js` — área 4-A/4-B por faixa, refeita só com aritmética e com checagem no console (as versões anteriores davam CSV vazio);
  - `02c_pureza.js` — pureza MODIS lendo o asset da população (corrige o erro de projeção do `reduceResolution`);
  - `02d_stats_mcd12q2.js` — contagens de pureza e ciclos MCD12Q2.
- `gee/README.md` com tabela de estado; `docs/execucoes.md` com as rodadas da etapa 02 reescritas.

## [0.3.0] — 2026-10-24

- `gee/02_populacao_mcd12q2.js`: asset da população do piloto (núcleo 3×3, borda ≥ 250 m, faixas de 5°), assets de pureza MODIS (500 m e 232 m), área 4-A/4-B por faixa e ciclos MCD12Q2 2016–2024.
- Saídas consolidadas da etapa 01 (`outputs/zonal_4A_cerrado_v0.2_tiles.csv`, `_summary.csv`).
- Decisões D12 (borda 250 m), D13 (sem filtro de fragmento), D14 (faixas de 5°) registradas na KB.

## [0.2.0] — 2026-10-24

- `gee/01_zonal_4A_cerrado.js` v0.2: redução por blocos de 1°, máscara raster do Cerrado, exportação em partes, modo teste e opção de desligar o cálculo de fragmento. A v0.1 ficou presa no servidor.

## [0.1.0] — 2026-10-23

- Estrutura inicial do repositório.
- Documentação do produto de áreas estáveis (etapa 00) e especificação do piloto.
- `gee/01_zonal_4A_cerrado.js`: área de 4-A no Cerrado por núcleo 3×3, distância à borda e fragmento pequeno.
- Saída da etapa 00: `outputs/area_stable_col11_fire5_1_strict_by_fire_context.csv`.
