# Piloto — especificação de implementação

Versão 2026-10-23. Fundamentação científica: KB `kb/02_piloto_savana_cerrado.md`.

## População

Classe 4 estável 1985–2025 (Col. 11, `strict`), nunca queimada (Fogo 5.1), dentro do Cerrado (IBGE), no núcleo 3×3 e a ≥ 250 m da borda antrópica de 2025 (D12). Sem filtro de tamanho de fragmento (D13). Estratos: faixas de latitude de 5° (D14). Área ≈ 4,34 Mha (etapa 01).

## Etapas

| Etapa | Script | Entrada | Saída | Status |
| --- | --- | --- | --- | --- |
| 00 | `gee/00_stable_unburned_lulc.js` | LULC Col. 11, Fogo 5.1 | assets estável A e B; CSV de áreas por classe × contexto | executada (data a registrar) |
| 01 | `gee/01_zonal_4A_cerrado.js` | asset A, LULC 2025, limite do Cerrado | `outputs/zonal_4A_cerrado_v0.2_*.csv` (área por núcleo × borda × fragmento) | executada (v0.2); definiu D12, D13 |
| 02 | `gee/02_populacao_mcd12q2.js` | assets A e B, LULC 2025, MCD12Q2, MOD13Q1 | fase `assets`: asset da população (`pilot_4A_cerrado_core_edge250`), assets de pureza 500 m e 232 m, CSV de área 4-A/4-B por faixa; fase `stats`: CSV de pureza por faixa e CSV de ciclos MCD12Q2 2016–2024 | pronto para rodar |
| 03 | a escrever | população filtrada | amostra de pontos (semente fixa), distância mínima 500 m | — |
| 04 | a escrever | amostra, GEDI L2B | footprints de boa qualidade nos núcleos | — |
| 05 | a escrever | amostra, MODIS, HLS | séries temporais e contagem de observações válidas por mês | — |
| 06 | a escrever (Python) | séries | métricas de pico; critérios de viabilidade | — |

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
