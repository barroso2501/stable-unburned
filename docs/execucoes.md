# Registro de execuções

Uma linha por rodada. Preencher ao exportar; fazer o commit do script e da saída juntos.

| Data | Etapa / script | Commit | Parâmetros-chave | Saída | Observações |
| --- | --- | --- | --- | --- | --- |
| a registrar | 00 `stable_unburned_lulc.js` | — (anterior ao repositório) | `STABILITY_MODE='strict'`, classes [3, 4, 11, 12, 15], 1985–2025 | assets `stable_col11_fire5_1_strict_never_burned` e `_burned`; `outputs/area_stable_col11_fire5_1_strict_by_fire_context.csv` | pendentes: período do fogo até 2025; A + B = total |
| 2026-10-24 | 01 `01_zonal_4A_cerrado.js` v0.1 | — | redução única sobre o polígono do Cerrado, 30 m | nenhuma | cancelar: >5 h em "Running", tentativa #2, ~0,7 EECU-s. Substituída pela v0.2 (blocos de 1°, máscara raster, exportação em partes) |
