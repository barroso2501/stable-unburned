# Registro de execuções

Uma linha por rodada. Preencher ao exportar; fazer o commit do script e da saída juntos.

| Data | Etapa / script | Commit | Parâmetros-chave | Saída | Observações |
| --- | --- | --- | --- | --- | --- |
| a registrar | 00 `stable_unburned_lulc.js` | — (anterior ao repositório) | `STABILITY_MODE='strict'`, classes [3, 4, 11, 12, 15], 1985–2025 | assets `stable_col11_fire5_1_strict_never_burned` e `_burned`; `outputs/area_stable_col11_fire5_1_strict_by_fire_context.csv` | pendentes: período do fogo até 2025; A + B = total |
| 2026-10-24 | 01 `01_zonal_4A_cerrado.js` v0.1 | — | redução única sobre o polígono do Cerrado, 30 m | nenhuma | cancelar: >5 h em "Running", tentativa #2, ~0,7 EECU-s. Substituída pela v0.2 (blocos de 1°, máscara raster, exportação em partes) |
| 2026-10-24 | 01 `01_zonal_4A_cerrado.js` v0.2 (teste) | — | `TEST_N_TILES=3`, `TILE_DEG=1`, `RUN_SMALL_PATCH=true` | `outputs/zonal_4A_cerrado_v0.2_test.csv` | executou; 3 blocos da borda oeste (-61_-13, -60_-15, -60_-16), 50.608 ha de 4-A; núcleo 3×3 retém 66%; 67% a ≥ 1000 m da borda; fragmento < 92 ha = 0,06%. Tempo de execução: a registrar. Blocos não representativos do bioma |
| 2026-10-24 | 01 `01_zonal_4A_cerrado.js` v0.2 (completa) | — | `TEST_N_TILES=0`, `N_PARTS=4`, `TILE_DEG=1`, `RUN_SMALL_PATCH=true` | `outputs/zonal_4A_cerrado_v0.2_tiles.csv` (4 partes unidas, 232 blocos); `outputs/zonal_4A_cerrado_v0.2_summary.csv` | part01: 6 min, 568.290 EECU-s, tentativa #1 (demais partes: a registrar). 4-A no Cerrado = 11,43 Mha (23% dos 49,2 Mha de 4-A no Brasil); núcleo 3×3 = 54%; fragmento < 92 ha = 2,6%, quase todo a < 250 m da borda |
