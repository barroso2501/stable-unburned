# Diagnóstico do estado do projeto (Produto A)

Rascunho de auditoria, 2026-10-27. **Ainda não está no repositório** e aguarda autorização.

**Fontes consultadas:**
- clone do GitHub `barroso2501/stable-unburned`, commit `8e9fc82` (2026-10-25 16:46 −03), 30 commits "Add files via upload", 103 arquivos;
- cópia de trabalho da sessão;
- séries brutas da sessão (113 CSVs, 854 MB, SHA-256 em `technical_validation.md`);
- KB do projeto "Picos Produtividade" (`kb/03_decisoes.md`, D01–D31);
- histórico desta conversa.

## Legenda de estado

| Estado | Critério usado nesta auditoria |
| --- | --- |
| **planejado** | descrito em documento; sem código |
| **implementado** | código existe no GitHub; sem evidência de execução |
| **executado** | há saída do script (arquivo no GitHub ou na sessão) ou registro de console em `docs/execucoes.md` |
| **validado** | saída **reproduzida** nesta auditoria a partir do código do GitHub e dos dados brutos, com integridade verificada (testes em `technical_validation.md`); para etapas GEE, que aqui não podem ser reexecutadas, "validado" exige checagem cruzada independente da saída |

Executar sem erro **não** conta como validação científica. "Validado" aqui significa **validado computacionalmente**: reproduz e é íntegro. A validade científica é tratada em `scientific_consistency.md`.

## Resumo

| Bloco | Etapas | Estado real |
| --- | --- | --- |
| Produto de entrada (A e B estáveis) | 00 | **executado, sem código no repositório** (P0) |
| Parte 1 — GEE | 01, 02a–02e, 03, 04, 04b, 05, 05b | executado. Saídas tabulares no GitHub; os assets só podem ser verificados no GEE |
| Parte 1 — Python | 05_qc, 06, 06b, 07, 07b, 08, 09, 10 | **validado computacionalmente**: reprodução idêntica, bit a bit, de todas as saídas |
| Parte 2 — GEE | B1a–B1d, B2, B3a, B3b, B3d | executado |
| Parte 2 — GEE | B3c (GPW em B) | **implementado, não executado** |
| Parte 2 — Python | B2_qc, B4a, B4b, B4c | **validado computacionalmente**: reprodução idêntica |
| Síntese | parte 1 (Claude Docs + ponteiro em `docs/`) | existe fora do repositório; parte 2 sem síntese |

## Matriz de rastreabilidade

Pergunta científica: **Q1** padrões espaciais · **Q2** desacoplamento lenhosas × gramíneas · **Q3** sensores · **QF** resposta ao fogo (parte 2). "GH" = presente no GitHub.

| Etapa | Pergunta | Script | Dados / assets | Parâmetros-chave | Saídas | Evidência | Estado | Problemas | Ação |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00 | base | `gee/00_stable_unburned_lulc.js` (**ausente**) | LULC Col. 11; Fogo 5.1 (qual asset? o README cita o *accumulated*) | `STABILITY_MODE='strict'`, classes [3,4,11,12,15], 1985–2025 | assets `stable_col11_fire5_1_strict_{never_burned,burned}`; `outputs/area_stable_…csv` | CSV no GH; os assets existem (usados por 01, 02a, B1a) | executado, **irreprodutível** | definição de "estável" e de "queimado" não está no repositório; período do fogo (até 2024 ou 2025?) não registrado | **P0-1** |
| 01 | Q1 (desenho) | `01_zonal_4A_cerrado.js` v0.2 | asset A, LULC 2025, biomas IBGE | blocos 1°, 4 partes | `zonal_4A_cerrado_v0.2_{tiles,summary}.csv` (GH) | 232 blocos; 4-A = 11,43 Mha | executado | lista `ANTHROPIC` não conferida com a legenda da Col. 11 | P1-9 |
| 02a | todas | `02a_populacao.js` v0.2 | asset A, LULC 2025 | núcleo 3×3, borda ≥ 250 m, faixas de 5° | asset `pilot_4A_cerrado_core_edge250` | usado por 02c, 03, 04, 04b | executado | idem lista antrópica; borda medida na paisagem de 2025 | P1-9 |
| 02 (antigo) | — | `02_populacao_mcd12q2.js` | — | campo `Bioma` (errado) | assets e CSVs vazios | o CHANGELOG 0.4.0 diz "removido", mas **o arquivo continua no GH** | obsoleto | risco de reuso de um script com erro conhecido | P2-6 |
| 02b | Q1 (contexto) | `02b_area_4AB.js` v0.3 | assets A, B | 4 partes | `area_4AB_…v0.3_{tiles,summary}.csv` (GH) | A = 11,43 Mha, igual à etapa 01 (checagem cruzada) | executado + checagem cruzada | — | — |
| 02c | todas | `02c_pureza.js` | asset 02a | reduceResolution média → grades MCD12Q2 / MOD13Q1 | 2 assets de pureza | `purity_463m` e `purity_232m` em `pilot_4A_sample` (GH) | executado | — | — |
| 02d/02e | Q1 | `02d_…`, `02e_…` | pureza, MCD12Q2 | pureza ≥ 90; ano civil / hidrológico | CSVs de ciclos (GH) | GH | executado | QA_Overall_1 = 0 em tudo (não discrimina) | — |
| 03 | todas | `03_amostra.js` | 02a, 02c | pureza ≥ 90%, grade par, 300/faixa, semente 42 | asset `pilot_4A_sample_v0_1`; `pilot_4A_sample_v0.1.csv` (GH) | 1215 pontos, ids únicos, faixas corretas (teste) | executado + íntegro | o sorteio depende do asset salvo (não basta a semente para reproduzir) | P1-7 |
| 04 | Q2 | `04_gedi.js` v0.2 | GEDI L2A/L2B mensais (por órbita), 02a | qualidade = 1, degrade = 0, sensibilidade ≥ 0,95, dentro da população | 10 CSVs `gedi_*` (sessão, fora do GH) | 14.084 + 13.200 footprints, todos dentro do quadrado (teste) | executado + íntegro | quadrado geográfico ≠ pixel sinusoidal (mediana 7% da área fora, máx. 18%) | P1-6 |
| 04b | Q2 | `04b_gpw_altura.js` | GPW v1, 02a | média, mediana, p10, p90 no quadrado | `gpw_height_v01.csv` (sessão) | 1215 × 26 anos | executado | idem geometria | P1-6 |
| 05 | Q1–Q3 | `05_series.js` | MOD13Q1, MCD43A4 (8 dias), HLS L30/S30 | 30 tarefas | 30 CSVs `series_*` (sessão, Drive) | cobertura de 1215 pontos em todos os produtos; MODIS sem duplicatas (teste) | executado + íntegro | janelas MCD43A4 começam em 1º jan; a grade da 06 começa em 1º jul (fase diferente) | P2-9 |
| 05b | Q2 | `05b_chirps.js` v0.2 | CHIRPS pêntadas | 2000–2025 | 5 CSVs `chirps_pentad_*` (sessão) | 1215 × 1872 (teste) | executado + íntegro | — | — |
| 05_qc | Q3 | `05_qc_series.py` | séries 05 | D19–D22 | `qc_*`, `clim_*`, `peak_month_dist`, `sensor_agreement` | reprodução idêntica | **validado** | — | — |
| 06 | Q1, Q3 | `06_metricas.py` | séries 05 | SG 7/2, lacuna ≤ 64 d, pico fora da borda de 15 d | `metrics_*` | reprodução idêntica (76.535 linhas) | **validado** | métrica de "ombro" ainda é exportada, embora não seja confiável; amplitude e integral são medidas a partir do piso | P1-4, P2-7 |
| 06b | Q2 | `06b_…py` | séries + 07b | SG 3/5/7 | `smoothing_sensitivity_*` | idêntica | **validado** | — | — |
| 07 | Q2 | `07_chuva_verdor.py` | CHIRPS + 06 | acumulação anômala, R̄ 2000/01–2024/25 | `rain_*` (3) | idêntica | **validado** | referência do método (Liebmann & Marengo) não conferida | P2-4 |
| 07b | Q2 | `07b_…py` | CHIRPS + 07 | 25/50 mm, tolerância 16 d, 5 km | `rain_robust_*`, `rain_coupling_*`, `rain_early_greenup_*` | idêntica | **validado** | — | — |
| 08 | Q2 | `08_estrutura_evi.py` | GEDI + 06 + 07 | MIN_FP = 3; bootstrap em blocos de 0,5° | `gedi_*`, `structure_evi_*` | idêntica | **validado** | 432 correlações sem hierarquia entre teste principal e exploratório | P1-5 |
| 09 | Q2 | `09_limiar_fotoperiodo.py` | CHIRPS + 06 + 08 | limiares 25–300 mm; ≥ 10 anos | `threshold_*`, `stability_structure` | idêntica; **2 das 4 saídas não estão no GH** | **validado** | limiar escolhido dentro da amostra (verificado fora da amostra: robusto) | P2-2 |
| 10 | Q2 | `10_gpw.py` | GPW + 08 + 09 | Theil–Sen, Kendall | `gpw_*` (6) | idêntica | **validado** | depende de `threshold_skill_point` (não está no GH) | P2-2 |
| B1a | QF | `B1a_populacao_4B.js` v0.1.1 | asset B, Fogo 5.1 anual | sem fogo 1985–2000; 1–5 fogos; ≥ 4 anos; 1º fogo ≥ 2002; núcleo com mesma assinatura | asset `pilot_4B_cerrado_core_edge250` | assinatura de 1899 pontos = fogo anual no pixel (teste) | executado + checagem cruzada | **seleção condicionada à estabilidade da classe 4 até 2025, depois do fogo** | P1-1 |
| B1b | QF | `B1b_area_4B.js` | B1a | 4 partes | `area_4B_pop_v0.1_{tiles,summary}.csv` (GH) | 1,46 Mha | executado | — | — |
| B1c/B1d | QF | `B1c_…`, `B1d_…` | B1a | coerência pelo fogo **anual** | asset; `pilot_4B_candidates…csv` (GH) | GH | executado; **coerência substituída pela B4a** | definição antiga (anual) segue nos assets | P2-8 |
| B2 | QF | `B2_amostra_4B.js` + `B2_qc_amostra.py` | B1a, B1c, amostra A | D29 | asset `pilot_4B_sample_v0_1`; CSV (sessão); `pilot_4B_sample{,_qc}_v0.1.csv` (GH) | 1899 pontos; ids únicos; parte Python idêntica | executado (GEE) + **validado** (Python) | `dist_A_m` do GEE vazio (corrigido em Python, documentado); unidades de fogo pelo fogo **anual** | P1-3 |
| B3a | QF | `B3a_series_4B.js` | amostra B | 60 tarefas | 60 CSVs (sessão; 6 vazios esperados) | 999 pontos MODIS / 1899 HLS cobertos (teste) | executado + íntegro | — | — |
| B3b | QF | `B3b_chirps_4B.js` v0.2 | amostra B | 1984–2025 | 5 CSVs (sessão) | 1899 × 3024 (teste) | executado + íntegro | — | — |
| **B3c** | QF | `B3c_gpw_4B.js` | amostra B | — | `gpw4B_height_v0.1.csv` | **nenhuma** | **implementado, não executado** | a documentação agrupa B3 como "a rodar" | P2-1 |
| B3d | QF | `B3d_fogo_mensal_4B.js` v0.2 | Fogo 5.1 mensal e anual | 1985–2025 | `fire4B_monthly_v02.csv` (sessão) | mês no pixel = anual em 100% | executado + íntegro | — | — |
| B4a | QF | `B4a_reavaliacao_fogo.py` | B3b, B3d, B2 | ano de fogo pelo ciclo de chuva; coerência por evento ≥ 0,9 | `fire4B_events`, `pilot_4B_sample_reval`, `…summary` (GH); `fire4B_rainyear` (sessão) | idêntica | **validado** | não recalcula as unidades de fogo com os eventos mensais | P1-3 |
| B4b | QF | `B4b_metricas_4B.py` | B3a, B4a, 06 (A) | referência A = par ≤ 20 km ou mediana da faixa | `metrics4B_point_year` (sessão, 18 MB) | idêntica | **validado** | MOD13Q1 de B sem o filtro D21 (assimetria com A); magnitude depende do tipo de referência | P1-2, P2-3 |
| B4c | QF | `B4c_trajetorias_fogo.py` | B4b | diferenças em diferenças; bootstrap por unidade | `fire_effect_*` (GH) | idêntica | **validado** | IC ignora a dependência espacial entre unidades vizinhas; amplitude e integral no ciclo do fogo são artefato | P1-2, P1-4 |

## A inconsistência B3 × B4

- **Evidência:**
    - `docs/piloto_especificacao.md`, linha 72: `| B3 | B3a, B3b, B3c, B3d | … | a rodar |`;
    - `gee/README.md`: B3a, B3b e B3d "executado", B3c "a rodar";
    - `docs/execucoes.md`: rodadas de B3a, B3b e B3d e de B4a–B4c registradas.
- **Diagnóstico:** **não há execução fora de ordem.** O B4 depende só de B3a, B3b e B3d, todos executados e íntegros. O B3c (GPW na amostra B) nunca rodou, e nenhuma etapa o consome. O erro é **documental**: a linha da especificação agrupa quatro scripts num único estado e não foi atualizada.
- **Ação:** P2-1.

## README × documentação técnica × evidências

| Documento | O que diz | O que as evidências mostram |
| --- | --- | --- |
| `README.md` | "Status (2026-10-23): … Piloto especificado, não executado"; decisões D01–D11; "Licença: A definir"; a estrutura lista só 00 e 01; o asset de fogo citado é o *accumulated* | piloto executado (partes 1 e 2); decisões até D31 (só na KB); `LICENSE` MIT existe no GH; 40 scripts; a parte 2 usa os assets anual e mensal |
| `docs/README.md` | resumo de decisões: D04, D08, D10 | desatualizado |
| `docs/piloto_especificacao.md` | etapas da parte 1 corretas; parte 2 com B3 "a rodar"; tabela de critérios de viabilidade com limiares em branco | ver acima |
| `gee/README.md` | "Estado (2026-10-24)"; ordem de execução só da parte 1 | estados corretos, cabeçalho e ordem desatualizados |
| `outputs/README.md` | marca 8 tabelas como "não versionado" | **4 delas estão no GH** (subiram antes da limpeza v0.16.1); as outras 4 não estão; o `.gitignore` **não está no GH** (o upload pela web não envia arquivos ocultos) |
| `docs/execucoes.md` | 46 rodadas | coluna "Commit" sempre "—"; tempos "a registrar" em várias rodadas |
| `data/README.md` | só cita as séries da etapa 05 | faltam GEDI, GPW, CHIRPS, toda a parte 2, um manifesto e os checksums |
| KB `03_decisoes.md` | D01–D31 | **não espelhada no repositório**, o que contraria o princípio 1 desta auditoria |

## O que não foi possível verificar

- **GEE:** existência, propriedades e data de criação dos assets; reexecução das etapas 00–05b e B1–B3. Seriam necessárias leitura das propriedades dos assets e reexportação.
- **Drive:** se os CSVs da sessão são os mesmos do Drive. Os SHA-256 da sessão estão registrados; falta compará-los com os do Drive.
- **Notebooks e protocolo do `cerrado-fire-interval`:** não acessíveis nesta sessão. Só usado como referência de formato.
