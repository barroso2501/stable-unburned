# Piloto — especificação de implementação

Versão 2026-10-23. Fundamentação científica: KB `kb/02_piloto_savana_cerrado.md`.

## População

Classe 4 estável 1985–2025 (Col. 11, `strict`), nunca queimada (Fogo 5.1), dentro do Cerrado (IBGE), no núcleo 3×3, em fragmentos acima de um tamanho mínimo e a mais de uma distância mínima da borda antrópica (limiares a definir com a etapa 01).

## Etapas

| Etapa | Script | Entrada | Saída | Status |
| --- | --- | --- | --- | --- |
| 00 | `gee/00_stable_unburned_lulc.js` | LULC Col. 11, Fogo 5.1 | assets estável A e B; CSV de áreas por classe × contexto | executada (data a registrar) |
| 01 | `gee/01_zonal_4A_cerrado.js` | asset A, LULC 2025, limite do Cerrado | `outputs/zonal_4A_cerrado_<tag>.csv` (área por núcleo × borda × fragmento) | pronto para rodar |
| 02 | a escrever | asset A, MCD12Q2 v061 | distribuição de 0, 1, ≥ 2 ciclos na população 4-A | — |
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
