# Validação técnica e reprodutibilidade (Produto C)

Rascunho de auditoria, 2026-10-27.

## 1. Ambiente da verificação

| Item | Valor |
| --- | --- |
| Código | clone do GitHub `barroso2501/stable-unburned`, commit `8e9fc82`, sem modificações |
| Python | 3.13.17 |
| Bibliotecas | pandas 3.0.5, numpy 2.5.3, scipy 1.18.1 (= `env/requirements.txt`; a versão do Python não está registrada no repositório) |
| Dados brutos | 113 CSVs, 854 MB, os da sessão de trabalho (exportados do GEE por Mario); manifesto SHA-256 em `data_series_manifest_sha256.txt`, tamanhos em `data_series_sizes.txt` |
| Procedimento | cópia limpa do repositório; `outputs/` esvaziado, exceto `pilot_4A_sample_v0.1.csv` (saída do GEE, não do Python); `data/series` apontando para os dados brutos; todos os scripts Python rodados em ordem; saídas comparadas célula a célula com as do GitHub ou, quando ausentes do GitHub, com as da sessão |

## 2. Reexecução completa do Python

Ordem e tempos: `05_qc_series` 5 s · `06_metricas` 121 s · `07` 15 s · `07b` 26 s · `06b` 217 s · `08` 186 s · `09` 51 s · `10` 26 s · `B2_qc_amostra` 1 s · `B4a` 78 s · `B4b` 96 s · `B4c` 12 s. Total ≈ 14 min; todos terminaram com código 0.

**Resultado:** as 46 saídas geradas são **idênticas** às de referência. São 41 comparadas com o GitHub e 5 com a sessão (`fire4B_rainyear`, `metrics4B_point_year`, `threshold_point_year`, `threshold_skill_point` e `pilot_4A_sample`, esta só copiada). Mesma estrutura, diferença numérica máxima 0, mesmo padrão de valores ausentes, texto igual. A semente do bootstrap (42) garante o determinismo.

**Limite:** isto valida que **o código do GitHub, aplicado a estes dados brutos, gera estas saídas**. Não valida que os dados brutos sejam os do Drive (falta conferir checksums) nem as etapas do GEE.

## 3. Testes de integridade

Todos com resultado OK.

| Teste | Resultado |
| --- | --- |
| A: ids únicos, faixa = ⌊−lat/5⌋+1, pureza 463 m ≥ 90, n por faixa 300/300/300/300/15 | OK |
| A: séries MCD43A4, MOD13Q1, HLS L30, HLS S30 cobrem exatamente os 1215 pontos, sem ids estranhos | OK |
| A: duplicatas ponto × data | MODIS 0%; HLS 26–29% (tiles sobrepostos, tratados por mediana) |
| MOD13Q1: `DayOfYear` válido em todas as observações com QA ≤ 1 | OK |
| A: CHIRPS com 1872 pêntadas por ponto, todos os pontos | OK |
| GEDI L2A/L2B: footprints dentro de ±232 m do ponto (o quadrado de agregação) | OK (máx. 232 m) |
| B: ids únicos, sem colisão com A | OK (1899) |
| B: assinatura ↔ nº, 1º e último fogo | OK |
| B: fogo anual no pixel (B3d) = assinatura da população (B1a), 2001–2025 | OK (0 divergências) |
| B: nenhum fogo anual em 1985–2000 no pixel | OK |
| B: MCD43A4 e MOD13Q1 cobrem os 999 pontos MODIS; HLS cobre os 1899 | OK |
| B: CHIRPS com 3024 pêntadas por ponto | OK |
| metrics A e metrics4B: uma linha por sensor × ponto × ciclo | OK |
| metrics4B: só pontos mantidos na B4a | OK |

## 4. Diagnósticos de validade (sem alterar resultados)

| Diagnóstico | Resultado | Implicação |
| --- | --- | --- |
| Tendência pré-fogo de B − A (inclinação por ponto, ≥ 3 ciclos; 394 unidades) | pico −0,0001/ciclo [−0,0005; 0,0002]; piso −0,0001; sos50 +0,08 d/ciclo [−0,02; 0,17]; amplitude +0,0003 [0,0000; 0,0007] | tendências paralelas plausíveis na janela pré-fogo |
| Efeito no ciclo do fogo, por tipo de referência A | pico −0,074 (par) × −0,051 (faixa); sos50 +31 d × +39 d | sinal robusto; a magnitude depende da referência → reportar as duas |
| Efeito no ciclo do fogo: 1º fogo em 2010 × demais anos | pico −0,058 × −0,069; sos50 +38 × +31 d | não é efeito exclusivo de 2010 |
| Unidades de fogo refeitas com os eventos mensais (ano de fogo + mês, ≤ 5 km) | MODIS 419 → 491 unidades, 313 pontos mudam de grupo; HLS 832 → 854 | as unidades atuais (fogo anual) agrupam eventos distintos; recalcular e refazer o B4c |
| Limiar de chuva escolhido fora da amostra (anos ímpares → avaliação nos pares) | skill fora da amostra 0,11–0,16 nas faixas 0–20° S; dentro da amostra, 15–20° S 0,21 × 0,135 fora | o resultado do gatilho por chuva se mantém; a magnitude dentro da amostra é otimista |
| Quadrado geográfico × pixel sinusoidal MODIS (pontos A) | deslocamento de borda: mediana 33 m, p90 52 m, máx. 82 m; área do pixel fora do quadrado: mediana 7,1%, máx. 17,8% | GEDI, GPW e coerência por evento (B3d) agregam numa janela ~7% diferente do pixel MODIS → limitação a declarar ou geometria a corrigir |
| Composição por tempo de evento | ciclos ≥ 10: 1º fogo entre 2002 e 2014; ciclos ≥ 16: só 2002–2008 | a trajetória longa mistura efeito do tempo com efeito de coorte |

Os scripts dos diagnósticos (`checks1.py`, `checks2.py`, `checks3.py`, `cmp_outputs.py`) estão na área de auditoria da sessão. Proposta: versionar em `tests/audit/` (ver o plano de correção).

## 5. Verificações estáticas do código

| Item | Achado |
| --- | --- |
| Resolução e projeção | 30 m na grade do asset A ou B (EPSG:4326, transform do asset); pureza por `reduceResolution(mean)` → grade MCD12Q2/MOD13Q1 (sinusoidal), correto. Agregação de GEDI, GPW e B3d no **quadrado geográfico**, não no pixel sinusoidal (ver §4) |
| IDs | A `P<faixa>_<system:index>`; B `B<classe>_<idx>` (MODIS), `H<classe>_<idx>` (HLS). Únicos e consistentes entre etapas (§3) |
| Junções | `ee.Join.saveBest` grava a distância na feição anexada → `dist_A_m` vazio no B2; recalculado em `B2_qc_amostra.py` (documentado) |
| Filtros e máscaras | coerência da B1c usa a assinatura **anual**; substituída pela coerência por evento da B4a, mas o asset da B1c continua com a definição antiga |
| Tempo | MCD43A4 resumido em janelas de 8 dias a partir de 1º de janeiro (a 46ª janela invade o ano seguinte); a 06 usa uma grade de 8 dias a partir de 1º/jul/2000 → fases diferentes, absorvidas pela mediana por janela e pela interpolação. Efeito pequeno, não quantificado |
| Valores ausentes | CSVs vazios (só cabeçalho) tornam colunas texto ao concatenar; a B4b converte (corrigido), outros scripts não (não afetou, pois não leem arquivos vazios) |
| Unidades | MOD13Q1 EVI × 1e-4; HLS reflectância já em 0–1; GPW × 0,1 m; GEDI rh em m (L2A), cover 0–1 |
| Pseudorreplicação | A: pontos ≥ 926 m, mas 468 com vizinho < 2 km → bootstrap por blocos de 0,5° nas correlações (08, 09, 10); resumos por faixa sem correção (descritivos). B: unidades de fogo (ver §4); dependência entre unidades vizinhas não tratada |
| Sementes | GEE: `stratifiedSample(seed 42)` — a reprodução exata depende também do asset da população e do `tileScale`; a amostra está preservada como CSV (lon/lat) no GitHub. Python: `default_rng(42)` |
| Versionamento | assets GEE sem versão (o GEE não versiona); a proveniência fica nas propriedades; `RUN_TAG` nos nomes de arquivo; coluna "Commit" de `docs/execucoes.md` vazia |
| Testes | nenhum teste no repositório |

## 6. Verificações que dependem do GEE ou do Drive

| Verificação | Por que importa | Procedimento |
| --- | --- | --- |
| Script 00 e definição dos assets A e B | base de tudo | Recuperar o script original no Code Editor (histórico do repositório GEE do usuário) e versionar como `gee/00_stable_unburned_lulc.js`; registrar `ee.data.getAsset()` dos dois assets (data de criação, propriedades) |
| Propriedades dos assets derivados | proveniência | No Code Editor: `print(ee.data.getAsset('<id>'))` para os assets `pilot_4A_*`, `pilot_4B_*` e `stable_*`; salvar a saída em `docs/audit/gee_assets_metadata.md` |
| Checksums do Drive | os dados brutos da sessão = os do Drive | Calcular SHA-256 dos CSVs no Drive (ou baixar e rodar `sha256sum`) e comparar com `data_series_manifest_sha256.txt` |
| Acurácia do Fogo 5.1 em A | "nunca queimada" | Proposta (decisão de Mario): extrair o MCD64A1 (MODIS burned area, 500 m, 2001–2025) nos 1215 pontos A e nos pixels MODIS da amostra B; fração de A com queima detectada pelo MCD64A1; concordância de anos em B |
| Viés de sobrevivência de B | interpretação do efeito do fogo | Proposta (decisão de Mario): no GEE, pixels da classe 4 em 2000 que cumprem os critérios de fogo de B1a, mas não a estabilidade até 2025 → fração que mudou de classe depois do fogo, e para qual classe |
