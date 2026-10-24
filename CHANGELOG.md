# Changelog

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
