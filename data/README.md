# Dados brutos (`data/series/`)

Os CSVs exportados do GEE para o Google Drive (pasta `GEE_exports`) são a entrada de todos os scripts `python/`. **Não ficam no git** (são 895 MB). Para reproduzir, copie-os do Drive para `data/series/`.

O Drive grava `v0.1` como `v01` e `v0.2` como `v02` no nome; os scripts aceitam as duas formas. Arquivos `*_TEST_*` (modo teste) não entram nas análises.

## Integridade

`manifest_sha256.txt` lista o SHA-256 dos 113 arquivos usados na reprodução da auditoria de 2026-10-27, que regenerou de forma idêntica todas as saídas versionadas. Para conferir uma cópia local:

```
cd data/series && sha256sum -c ../manifest_sha256.txt
```

Ainda **não conferido**: se os arquivos hoje no Drive têm os mesmos checksums (pendência P1-7).

## Conteúdo

| Padrão | Nº | MB | Gerado por | Amostra | Usado por |
| --- | --- | --- | --- | --- | --- |
| `series_MCD43A4_band*_v01.csv` | 5 | 98.5 | `gee/05_series.js` v0.1 | A | 06, 05_qc, 06b |
| `series_MOD13Q1_band*_v01.csv` | 5 | 41.2 | `gee/05_series.js` v0.1 | A | 06, 05_qc, 06b |
| `series_HLS_L30_band*_*_v01.csv` | 10 | 23.9 | `gee/05_series.js` v0.1 | A | 06, 05_qc |
| `series_HLS_S30_band*_*_v01.csv` | 10 | 46.9 | `gee/05_series.js` v0.1 | A | 06, 05_qc |
| `chirps_pentad_band*_v02.csv` | 5 | 127.0 | `gee/05b_chirps.js` v0.2 | A | 07, 07b, 09 |
| `gedi_l2a_band*_v02.csv` | 5 | 2.2 | `gee/04_gedi.js` v0.2 | A | 08 |
| `gedi_l2b_band*_v02.csv` | 5 | 2.7 | `gee/04_gedi.js` v0.2 | A | 08 |
| `gpw_height_v01.csv` | 1 | 3.1 | `gee/04b_gpw_altura.js` v0.1 | A | 10 |
| `pilot_4B_sample_v01.csv` | 1 | 0.4 | `gee/B2_amostra_4B.js` v0.1 | B | B2_qc_amostra |
| `series4B_MCD43A4_band*_s*_v01.csv` | 10 | 78.9 | `gee/B3a_series_4B.js` v0.1 | B | B4b |
| `series4B_MOD13Q1_band*_s*_v01.csv` | 10 | 33.7 | `gee/B3a_series_4B.js` v0.1 | B | B4b |
| `series4B_HLS_L30_band*_s*_*_v01.csv` | 20 | 35.7 | `gee/B3a_series_4B.js` v0.1 | B | B4b |
| `series4B_HLS_S30_band*_s*_*_v01.csv` | 20 | 72.4 | `gee/B3a_series_4B.js` v0.1 | B | B4b |
| `chirps4B_pentad_band*_v02.csv` | 5 | 325.5 | `gee/B3b_chirps_4B.js` v0.2 | B | B4a |
| `fire4B_monthly_v02.csv` | 1 | 2.6 | `gee/B3d_fogo_mensal_4B.js` v0.2 | B | B4a |

Seis arquivos `series4B_*_band1_s2_*` têm só o cabeçalho: não há pontos na faixa 1 × estrato 2. É esperado.
