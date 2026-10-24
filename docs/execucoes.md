# Registro de execuções

Uma linha por rodada. Preencher ao exportar; fazer o commit do script e da saída juntos.

| Data | Etapa / script | Commit | Parâmetros-chave | Saída | Observações |
| --- | --- | --- | --- | --- | --- |
| a registrar | 00 `stable_unburned_lulc.js` | — (anterior ao repositório) | `STABILITY_MODE='strict'`, classes [3, 4, 11, 12, 15], 1985–2025 | assets `stable_col11_fire5_1_strict_never_burned` e `_burned`; `outputs/area_stable_col11_fire5_1_strict_by_fire_context.csv` | pendentes: período do fogo até 2025; A + B = total |
| 2026-10-24 | 01 `01_zonal_4A_cerrado.js` v0.1 | — | redução única sobre o polígono do Cerrado, 30 m | nenhuma | cancelar: >5 h em "Running", tentativa #2, ~0,7 EECU-s. Substituída pela v0.2 (blocos de 1°, máscara raster, exportação em partes) |
| 2026-10-24 | 01 `01_zonal_4A_cerrado.js` v0.2 (teste) | — | `TEST_N_TILES=3`, `TILE_DEG=1`, `RUN_SMALL_PATCH=true` | `outputs/zonal_4A_cerrado_v0.2_test.csv` | executou; 3 blocos da borda oeste (-61_-13, -60_-15, -60_-16), 50.608 ha de 4-A; núcleo 3×3 retém 66%; 67% a ≥ 1000 m da borda; fragmento < 92 ha = 0,06%. Tempo de execução: a registrar. Blocos não representativos do bioma |
| 2026-10-24 | 01 `01_zonal_4A_cerrado.js` v0.2 (completa) | — | `TEST_N_TILES=0`, `N_PARTS=4`, `TILE_DEG=1`, `RUN_SMALL_PATCH=true` | `outputs/zonal_4A_cerrado_v0.2_tiles.csv` (4 partes unidas, 232 blocos); `outputs/zonal_4A_cerrado_v0.2_summary.csv` | part01: 6 min, 568.290 EECU-s, tentativa #1 (demais partes: a registrar). 4-A no Cerrado = 11,43 Mha (23% dos 49,2 Mha de 4-A no Brasil); núcleo 3×3 = 54%; fragmento < 92 ha = 2,6%, quase todo a < 250 m da borda |
| 2026-10-24 | 02a (gerado pelo antigo `02_populacao_mcd12q2.js`, fase `assets`) | — | núcleo 3×3, borda ≥ 250 m, faixas 5° | asset `pilot_4A_cerrado_core_edge250` | concluído: 26 min, 22.732 EECU-s. Lógica idêntica à de `02a_populacao.js` |
| 2026-10-24 | pureza (antigo `02_populacao_mcd12q2.js`) | — | — | nenhuma | falhou 2×: "reduceResolution: input does not have a valid default projection". Substituído por `02c_pureza.js` |
| 2026-10-24 | área 4-A/4-B (antigo `02_populacao_mcd12q2.js`) | — | — | `area_4AB_cerrado_by_latband_v0.1.csv` vazio (2 rodadas, 2 s cada) | causa provável: máscara dos assets A/B propagada por `where()`. Substituído por `02b_area_4AB.js` (só aritmética + checagem no console) |
| 2026-10-24 | `02b_area_4AB.js` v0.2 | — | campo `Bioma` | CSV vazio (2 s) | — |
| 2026-10-24 | `02b_diagnostico.js` | — | — | console | A e B corretos (27.878 px 4-A e 81.168 px 4-B no quadrado de Brasília); **máscara do Cerrado = 0** → causa real dos CSVs vazios: campo do bioma é `NM_BIOMA`, não `Bioma`. Afeta também o asset 02a (refazer) |
| 2026-10-24 | `02b_area_4AB.js` v0.2 com `NM_BIOMA` (corrigido por Mario) | — | 232 blocos numa só tarefa | nenhuma | cancelado na tentativa #3 (reinícios sucessivos). v0.3 divide em 4 partes |
| 2026-10-24 | `02b_diagnostico.js` com `NM_BIOMA` | — | quadrado 0,2° e bloco 1° (-48_-16), Brasília | console | todas as checagens OK. Asset B confirmado (mesma grade de A). Quadrado: 4-A 2.400 ha, 4-B 6.989 ha. Bloco -48_-16: 4-A 47.086 ha, 4-B 230.595 ha (A = 17% da savana estável do bloco) |
| 2026-10-24 | `02a_populacao.js` v0.2 (refeito com `NM_BIOMA`) | — | núcleo 3×3, borda ≥ 250 m, faixas 5° | asset `pilot_4A_cerrado_core_edge250` | concluído (tempo a registrar) |
| 2026-10-24 | `02b_area_4AB.js` v0.3 | — | 4 partes, 233 blocos | `outputs/area_4AB_cerrado_by_latband_v0.3_tiles.csv`, `_summary.csv` | 4-A = 11,43 Mha (idêntico à etapa 01 ✔); 4-B = 26,29 Mha; savana estável do Cerrado = 37,71 Mha, 30% nunca queimada |
| 2026-10-24 | `02c_pureza.js` | — | grades 463 m e 232 m | assets `pilot_4A_purity_mcd500`, `pilot_4A_purity_mod13q1` | concluído (tempo a registrar) |
| 2026-10-24 | `02d_stats_mcd12q2.js` | — | pureza ≥ 90%, 2016–2024 | `outputs/pilot_4A_purity_counts_v0.2.csv`, `outputs/pilot_4A_mcd12q2_cycles_v0.2.csv` | nenhum pixel com ≥ 3 ciclos; QA do ciclo 1 = 0–1 em 100% dos casos (suspeito, conferir); alternância de anos com 0 e 2 ciclos sugere artefato do ano civil |
