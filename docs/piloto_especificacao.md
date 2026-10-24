# Piloto — especificação de implementação

Versão 2026-10-24. Fundamentação científica: KB `kb/02_piloto_savana_cerrado.md`.

## População

Classe 4 estável 1985–2025 (Col. 11, `strict`), nunca queimada (Fogo 5.1), dentro do Cerrado (IBGE), no núcleo 3×3 e a ≥ 250 m da borda antrópica de 2025 (D12). Sem filtro de tamanho de fragmento (D13). Estratos: faixas de latitude de 5° (D14); faixa 20–25° S exploratória (D15). Ciclos contados por ano hidrológico jul–jun (D16). Área ≈ 4,34 Mha (etapa 01).

## Etapas

| Etapa | Script | Entrada | Saída | Status |
| --- | --- | --- | --- | --- |
| 00 | `gee/00_stable_unburned_lulc.js` | LULC Col. 11, Fogo 5.1 | assets estável A e B; CSV de áreas por classe × contexto | executada (data a registrar) |
| 01 | `gee/01_zonal_4A_cerrado.js` | asset A, LULC 2025, limite do Cerrado | `outputs/zonal_4A_cerrado_v0.2_*.csv` (área por núcleo × borda × fragmento) | executada (v0.2); definiu D12, D13 |
| 02a | `gee/02a_populacao.js` | asset A, LULC 2025, Cerrado | asset `pilot_4A_cerrado_core_edge250` | executada (v0.2) |
| 02b | `gee/02b_area_4AB.js` | assets A e B, Cerrado | CSV de área 4-A/4-B por faixa | executada (v0.3) |
| 02c | `gee/02c_pureza.js` | asset 02a, grades MODIS | assets `pilot_4A_purity_mcd500` e `pilot_4A_purity_mod13q1` | executada |
| 02d | `gee/02d_stats_mcd12q2.js` | assets 02c, MCD12Q2 | CSVs de pureza por faixa e de ciclos MCD12Q2 2016–2024 (ano civil) | executada |
| 02e | `gee/02e_ciclos_ano_hidrologico.js` | asset de pureza 463 m, MCD12Q2 | ciclos por ano hidrológico 2016/17–2023/24; histograma de QA | executada |
| 03 | `gee/03_amostra.js` | assets 02a e 02c | asset e CSV `pilot_4A_sample_v0.1`: até 300 pontos por faixa, 1 por pixel MODIS de 463 m puro (≥ 90%) em grade par (~926 m), semente 42 | executada |
| 04 | a escrever | amostra, GEDI L2B | footprints de boa qualidade nos núcleos | — |
| 05 | `gee/05_series.js` | asset da amostra; MOD13Q1, MCD43A4, HLS L30/S30 v2.0 | CSVs `series_<produto>_band<N>[_<período>]_v0.1.csv` (formato longo) | executada; QC em `python/05_qc_series.py` |
| 06 | a escrever (Python) | séries | métricas de forma da curva (data e magnitude do pico, assimetria, ombro, início do verdor vs. início das chuvas; D17); critérios de viabilidade | — |

## Critérios de viabilidade (limiares a fixar antes da etapa 03)

| Critério | Medida | Limiar |
| --- | --- | --- |
| Tamanho amostral | pontos por estrato após todos os filtros | ≥ N |
| Pureza MODIS | fração de pontos com footprint puro | ≥ x% |
| Estrutura GEDI | footprints bons por faixa de cobertura | ≥ N por faixa |
| Cobertura HLS | observações válidas por mês (nov–mar) | ≥ k |
| Concordância | diferença na data do pico MODIS × HLS | ≤ ±N dias |
| Nº de picos informativo | fração com ≥ 2 ciclos no MCD12Q2 | ≥ x% |

## Limitações técnicas conhecidas da etapa 01

- `connectedPixelCount` conta no máximo 1024 pixels: só identifica fragmentos menores que ~92 ha. Um limiar de fragmento maior exige vetorização ou outra abordagem.
- Borda e fragmento são medidos na paisagem de 2025, não na histórica.
- Distância em EPSG:4326 é aproximada (pixel não exatamente quadrado; erro de poucos %).
- As listas de classes antrópicas e naturais precisam ser conferidas contra a legenda oficial da Col. 11.
