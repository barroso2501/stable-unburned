# Scripts Google Earth Engine

- Numerados na ordem de execução. Cada script faz **uma** coisa e tem os parâmetros no topo.
- O GitHub é a fonte. Para rodar, copie o script para o Code Editor; se alterar algo lá, traga a alteração de volta.
- Toda exportação grava proveniência (assets de entrada, parâmetros, `RUN_TAG`, data).

## Estado (2026-10-24)

| Script | Faz | Estado |
| --- | --- | --- |
| `00_stable_unburned_lulc.js` | assets de áreas estáveis A e B | executado; **arquivo a adicionar** (script original) |
| `01_zonal_4A_cerrado.js` | área de 4-A no Cerrado por núcleo × borda × fragmento | executado (v0.2) |
| `02a_populacao.js` | asset da população do piloto | **executado** — não rodar de novo |
| `02b_area_4AB.js` | CSV de área 4-A e 4-B por faixa | **a rodar** (independente) |
| `02c_pureza.js` | 2 assets de pureza MODIS | **a rodar** (depende de 02a, já pronto) |
| `02d_stats_mcd12q2.js` | CSVs de pureza e de ciclos MCD12Q2 | a rodar **depois** de 02c |

`02b` e `02c` podem rodar ao mesmo tempo.

## Checagens

- `01`, `02b`: limite do Cerrado = `projects/ee-barroso2501/assets/biomas_IBGE`, campo `Bioma`, valor `Cerrado`.
- `02b`: antes de exportar, o console deve mostrar a "Checagem" com códigos e áreas (ex.: 14, 24). Lista vazia → não exportar.
- `02b`: soma de A deve dar ~11,43 Mha (igual à etapa 01).
- `02d`: as prévias S1 e S2 no console devem trazer linhas.
- Listas `ANTHROPIC` e `NATURAL_VEG`: conferir na legenda oficial da Col. 11.
