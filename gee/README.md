# Scripts Google Earth Engine

- Numerados na ordem de execução (`00_`, `01_`, ...).
- Cada script tem um bloco `PARÂMETROS` no topo. Só ali se muda algo entre rodadas.
- O GitHub é a fonte. Para rodar, copie o script para o Code Editor; se alterar algo lá, traga a alteração de volta antes de exportar.
- Toda exportação grava propriedades de proveniência (assets de entrada, parâmetros, `RUN_TAG`, data).

## Pendente

- **`00_stable_unburned_lulc.js`**: adicionar o script original (`stable_unburned_lulc.js`) que gerou os assets estáveis, com o mesmo conteúdo usado na rodada.

## Antes de rodar `01_zonal_4A_cerrado.js`

1. Limite do Cerrado: `projects/ee-barroso2501/assets/biomas_IBGE`. Conferir no console o nome do campo (`BIOME_FIELD`, padrão `Bioma`) e a grafia "Cerrado".
2. Conferir `ANTHROPIC` e `NATURAL_VEG` contra a legenda oficial da Col. 11.
3. No console, conferir que a projeção do asset é ~30 m e que o Cerrado tem ≥ 1 feição.
4. Validação: a soma de `area_ha` deve ser menor que 49,2 Mha (4-A no Brasil inteiro, ver `outputs/area_stable_...csv`).

## Rodar `02_populacao_mcd12q2.js`

1. `RUN_PART: 'assets'` → 4 tarefas (3 assets + 1 CSV). Confirmar antes o caminho de `STABLE_B`.
2. Quando os assets `pilot_4A_purity_mcd500` e `pilot_4A_purity_mod13q1` terminarem, `RUN_PART: 'stats'` → 2 CSVs.
3. Validação: a soma de 4-A no CSV de área deve dar ~11,43 Mha (etapa 01).
