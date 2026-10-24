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
| `qc_hls_obs_wet_season_v0.1.csv` | 05 (QC) | % de meses chuvosos sem observação HLS, por faixa e período |
| `qc_mod13q1_qa_by_month_v0.1.csv` | 05 (QC) | % de compostos MOD13Q1 com QA 0 e ≤ 1, por faixa e mês |
| `qc_mcd43a4_full_by_month_v0.1.csv` | 05 (QC) | % de janelas MCD43A4 com inversão completa, por faixa e mês |
| `clim_evi_by_band_month_v0.1.csv` | 05 (QC) | EVI mediano por sensor × faixa × mês, 2018/19–2024/25 |
| `peak_month_dist_v0.1.csv` | 05 (QC) | distribuição do mês de pico (climatologia mensal) por sensor × faixa |
| `sensor_agreement_v0.1.csv` | 05 (QC) | concordância do mês de pico, correlação, nível e amplitude entre sensores |
