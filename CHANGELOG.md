# Changelog

## [0.22.0] — 2026-10-25

- B3a executado. `python/B4b_metricas_4B.py` (métricas 4-B com contexto de fogo e referência A) e `python/B4c_trajetorias_fogo.py` (efeito do fogo por tempo de evento).

## [0.21.0] — 2026-10-25

- B3b e B3d executados; B3a em andamento.
- `python/B4a_reavaliacao_fogo.py`: reavaliação da amostra 4-B com ano de fogo do ciclo de chuva e eventos mensais (D30).

## [0.20.1] — 2026-10-25

- D30: ano de fogo pelo ciclo de chuva e eventos pelo mês. `B3d_fogo_mensal_4B.js` v0.2 exporta o histograma de meses no quadrado MODIS; `B3b_chirps_4B.js` v0.2 começa em 1984. A amostra B2 (feita com o produto anual e o ano civil) será reavaliada ponto a ponto na etapa B4a.

## [0.20.0] — 2026-10-25

- Etapa B2 executada; `python/B2_qc_amostra.py` (pareamento com A, unidades de fogo).
- Etapa B3: `gee/B3a_series_4B.js`, `B3b_chirps_4B.js`, `B3c_gpw_4B.js` (derivados de 05, 05b, 04b) e `B3d_fogo_mensal_4B.js` (mês do fogo).

## [0.19.0] — 2026-10-25

- `gee/B2_amostra_4B.js`: amostra da parte 2 (D29).

## [0.18.2] — 2026-10-25

- Etapa B1 executada (B1a–B1d); saídas em `outputs/`.

## [0.18.1] — 2026-10-24

- `B1a_populacao_4B.js` v0.1.1: asset anual do Fogo 5.1 preenchido; nome da banda de cada ano detectado automaticamente. Asset mensal registrado para a etapa B3.

## [0.18.0] — 2026-10-24

- Parte 2 do piloto (savana queimada 4-B, D23–D28): scripts `gee/B1a`–`B1d` (população, área, pureza e coerência do histórico de fogo, contagem de candidatos).
- `docs/piloto_especificacao.md` e `gee/README.md` com a seção da parte 2.

## [0.17.0] — 2026-10-24

- `docs/sintese_piloto.md`: ponteiro e conclusões da síntese do piloto (documento completo no Claude Docs).

## [0.16.1] — 2026-10-24

- Tabelas por ponto × ano > 1 MB retiradas do versionamento (`.gitignore`); regeneráveis pelos scripts. Corrige a falha de upload por tamanho.

## [0.16.0] — 2026-10-24

- Etapa 04b (GPW) executada.
- `python/10_gpw.py`: GPW em savana natural (concordância com GEDI, tendência, circularidade com EVI, relação com a curva sazonal).

## [0.15.0] — 2026-10-24

- `python/09_limiar_fotoperiodo.py`: testes do limiar de chuva e do fotoperíodo (premissas de Mario).
- `gee/04b_gpw_altura.js`: altura anual do Global Pasture Watch nos pontos.

## [0.14.0] — 2026-10-24

- Etapa 04 (GEDI v0.2) executada; footprints em `data/series/`.
- `python/08_estrutura_evi.py`: estrutura do dossel × curva do EVI (pergunta 2).

## [0.13.0] — 2026-10-24

- `gee/04_gedi.js`: extração GEDI L2B por ponto × mês, com modo teste.
- `gee/04_gedi.js` v0.2: altura pelo L2A; filterBounds (a coleção tem uma imagem por órbita); exportação por footprint; correção do tipo após copyProperties.

## [0.12.0] — 2026-10-24

- `python/06b_sensibilidade_suavizacao.py`: sensibilidade das métricas de início do verdor à janela do Savitzky–Golay (3/5/7).
- `python/07b_robustez_chuva_verdor.py`: teste T5 (antecipação > 16 d, repetição por ponto, concordância entre sensores).

## [0.11.0] — 2026-10-24

- `gee/05b_chirps.js` v0.2 executado (1215 pontos × 1872 pêntadas).
- Etapa 07 executada; saídas em `outputs/`.
- `python/07b_robustez_chuva_verdor.py`: testes de robustez do verdor antes da chuva (chuva acumulada até o sos20, primeiras chuvas, tolerância, acoplamento interanual).

## [0.10.0] — 2026-10-24

- `gee/05b_chirps.js`: chuva CHIRPS por pêntada nos pontos da amostra.
- `python/07_chuva_verdor.py`: início e fim da estação chuvosa (acumulação anômala) e defasagem para o verdor (pergunta 2); testado com dados sintéticos.

## [0.9.0] — 2026-10-24

- `python/common.py`: leitura e limpeza compartilhadas (D19–D22).
- `python/06_metricas.py`: métricas de forma da curva por sensor × ponto × ano hidrológico; diferenças entre sensores; sensibilidade ao aerossol; variabilidade interanual.
- `python/05_qc_series.py` passa a usar `common.py` (resultados idênticos).
- `env/requirements.txt` inclui scipy.

## [0.8.0] — 2026-10-24

- Etapa 05 concluída (30 tarefas). Séries brutas em `data/series/` (fora do git).
- `python/05_qc_series.py`: limpeza (duplicatas HLS, QA MOD13Q1, faixa de EVI) e comparação entre sensores; saídas em `outputs/`.
- `env/requirements.txt` com as versões de pandas e numpy.

## [0.7.0] — 2026-10-24

- `gee/05_series.js`: extração das séries MOD13Q1 (2000–2025), MCD43A4 em janelas de 8 dias (2000–2025) e HLS L30/S30 (2016–2025, Fmask) nos pontos da amostra; modo teste.
- Saída da etapa 03 em `outputs/pilot_4A_sample_v0.1.csv`.

## [0.6.0] — 2026-10-24

- `gee/03_amostra.js`: sorteio estratificado da amostra do piloto (D18, proposta).
- Métrica "número de picos" do MCD12Q2 rebaixada; pergunta 2 passa a usar a forma da curva (D17).

## [0.5.1] — 2026-10-24

- Saídas do 02e em `outputs/`; status atualizado.

## [0.5.0] — 2026-10-24

- `gee/02e_ciclos_ano_hidrologico.js`: recontagem dos ciclos MCD12Q2 por ano hidrológico (D16) e histograma de QA_Overall_1.
- Decisões D15 (faixa 20–25° S exploratória) e D16 (ano hidrológico) registradas na KB.

## [0.4.2] — 2026-10-24

- Etapa 02 concluída: saídas de 02b e 02d em `outputs/`; status dos scripts atualizado.

## [0.4.1] — 2026-10-24

- Campo do limite do bioma corrigido para `NM_BIOMA` em todos os scripts (causa real dos CSVs vazios da etapa 02).
- `02a_populacao.js`: marcado para refazer (asset anterior gerado com o campo errado).
- `02b_area_4AB.js` v0.3: exportação dividida em 4 partes.
- `02b_diagnostico.js`: checagem só no console.

## [0.4.0] — 2026-10-24

- Etapa 02 reorganizada em quatro scripts de propósito único, substituindo `02_populacao_mcd12q2.js` (removido):
  - `02a_populacao.js` — asset da população (já executado; arquivo registra como foi feito);
  - `02b_area_4AB.js` — área 4-A/4-B por faixa, refeita só com aritmética e com checagem no console (as versões anteriores davam CSV vazio);
  - `02c_pureza.js` — pureza MODIS lendo o asset da população (corrige o erro de projeção do `reduceResolution`);
  - `02d_stats_mcd12q2.js` — contagens de pureza e ciclos MCD12Q2.
- `gee/README.md` com tabela de estado; `docs/execucoes.md` com as rodadas da etapa 02 reescritas.

## [0.3.0] — 2026-10-24

- `gee/02_populacao_mcd12q2.js`: asset da população do piloto (núcleo 3×3, borda ≥ 250 m, faixas de 5°), assets de pureza MODIS (500 m e 232 m), área 4-A/4-B por faixa e ciclos MCD12Q2 2016–2024.
- Saídas consolidadas da etapa 01 (`outputs/zonal_4A_cerrado_v0.2_tiles.csv`, `_summary.csv`).
- Decisões D12 (borda 250 m), D13 (sem filtro de fragmento), D14 (faixas de 5°) registradas na KB.

## [0.2.0] — 2026-10-24

- `gee/01_zonal_4A_cerrado.js` v0.2: redução por blocos de 1°, máscara raster do Cerrado, exportação em partes, modo teste e opção de desligar o cálculo de fragmento. A v0.1 ficou presa no servidor.

## [0.1.0] — 2026-10-23

- Estrutura inicial do repositório.
- Documentação do produto de áreas estáveis (etapa 00) e especificação do piloto.
- `gee/01_zonal_4A_cerrado.js`: área de 4-A no Cerrado por núcleo 3×3, distância à borda e fragmento pequeno.
- Saída da etapa 00: `outputs/area_stable_col11_fire5_1_strict_by_fire_context.csv`.
