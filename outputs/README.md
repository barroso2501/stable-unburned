# Saídas

Só arquivos pequenos (CSV de áreas, contagens, métricas resumidas). Rasters e séries grandes ficam no GEE ou no Drive.

Convenção de nome: `<produto>_<versão ou RUN_TAG>.csv`. Cada saída deve ter uma linha correspondente em `docs/execucoes.md`.

| Arquivo | Etapa | Conteúdo |
| --- | --- | --- |
| `area_stable_col11_fire5_1_strict_by_fire_context.csv` | 00 | área (ha) por classe e contexto de fogo, Brasil, modo `strict` |
| `zonal_4A_cerrado_v0.2_test.csv` | 01 (teste) | área de 4-A por bloco × núcleo × borda × fragmento, 3 blocos da borda oeste |
| `zonal_4A_cerrado_v0.2_tiles.csv` | 01 | rodada completa: 4 partes unidas, uma linha por bloco × combinação |
| `zonal_4A_cerrado_v0.2_summary.csv` | 01 | soma por núcleo × borda × fragmento (Mha e fração) |
| `area_4AB_cerrado_by_latband_v0.3_tiles.csv` | 02b | área 4-A e 4-B por bloco e faixa (4 partes unidas) |
| `area_4AB_cerrado_by_latband_v0.3_summary.csv` | 02b | soma por faixa (Mha) e % nunca queimada |
| `pilot_4A_purity_counts_v0.2.csv` | 02d | nº de pixels MODIS por classe de pureza e faixa |
| `pilot_4A_mcd12q2_cycles_v0.2.csv` | 02d | nº de pixels puros (≥ 90%) por nº de ciclos MCD12Q2, ano e faixa |
| `pilot_4A_mcd12q2_cycles_hydro_v0.1.csv` | 02e | nº de pixels puros por nº de ciclos MCD12Q2, ano hidrológico e faixa |
| `pilot_4A_mcd12q2_qa_hist_v0.1.csv` | 02e | histograma de QA_Overall_1 por ano civil |
| `pilot_4A_sample_v0.1.csv` | 03 | amostra do piloto: 1215 pontos, faixa, lon/lat, pureza 463 m e 232 m |
