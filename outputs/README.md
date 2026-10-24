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
| `metrics_point_year_v0.1.csv` | 06 | métricas por sensor × ponto × ano hidrológico (dias contados a partir de 1º jul) |
| `metrics_summary_band_v0.1.csv` | 06 | quartis das métricas por sensor × faixa (anos válidos), % válidos, % com ombro |
| `metrics_sensor_diff_v0.1.csv` | 06 | diferenças entre sensores (vs MCD43A4) e sensibilidade ao aerossol no HLS |
| `metrics_interannual_v0.1.csv` | 06 | variabilidade interanual do pico por ponto (MCD43A4, ≥ 15 anos) |
| `rain_onset_point_year_v0.1.csv` | 07 | início/fim da estação chuvosa (acumulação anômala), duração e totais por ponto × ano hidrológico |
| `rain_greenup_lag_v0.1.csv` | 07 | métricas da etapa 06 + onset/demise + defasagens (dias) |
| `rain_greenup_summary_v0.1.csv` | 07 | quartis das defasagens e % de sos20 antes do onset, por sensor × faixa |
| `rain_robust_point_year_v0.1.csv` | 07b | chuva acumulada até o sos20, onsets por primeiras chuvas (25/50 mm), indicadores de verdor antecipado |
| `rain_robust_summary_v0.1.csv` | 07b | resumo dos testes T1–T3 por sensor × faixa |
| `rain_coupling_summary_v0.1.csv` | 07b | acoplamento interanual onset × sos20/sos50 dentro do ponto (r e inclinação) |
| `rain_early_greenup_v0.1.csv` | 07b (T5) | antecipação do sos20 > 16 d antes das primeiras 25 mm: frequência por sensor, concordância, pontos recorrentes, por faixa |
| `rain_early_greenup_points_v0.1.csv` | 07b (T5) | fração de anos com antecipação > 16 d nos dois sensores, por ponto |
| `smoothing_sensitivity_summary_v0.1.csv` | 06b | indicadores de verdor × chuva por janela SG (3/5/7) × sensor × faixa |
| `smoothing_sensitivity_paired_v0.1.csv` | 06b | deslocamento pareado do sos20/sos50 com janelas 3 e 5 em relação à 7 |
| `gedi_qc_v0.1.csv` | 08 | footprints e pontos por faixa e produto; % chuva, noite, alta potência; cover seca − chuva pareado |
| `gedi_point_v0.1.csv` | 08 | estrutura GEDI por ponto (medianas) para todos, só chuva, só noite + alta potência |
| `structure_evi_point_v0.1.csv` | 08 | estrutura + métricas de EVI (MCD43A4, mediana entre anos) + verdor antecipado, por ponto |
| `structure_evi_spearman_v0.1.csv` | 08 | Spearman estrutura × EVI por faixa e faixas 2–4, com IC 95% por bootstrap em blocos de 0,5° |
| `structure_evi_tercile_v0.1.csv` | 08 | medianas das métricas de EVI por tercil de cobertura dentro da faixa |
