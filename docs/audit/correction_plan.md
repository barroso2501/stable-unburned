# Plano de correção priorizado (Produto D)

Auditoria de 2026-10-27, atualizada depois do item 1 do plano de correção.

**Prioridades:**
- **P0** bloqueante: impede reconstruir a análise ou compromete um resultado central.
- **P1** importante: afeta a robustez da inferência ou a reprodutibilidade.
- **P2** documental.

**Natureza da correção:**
- **doc** só documentação;
- **código** ajuste de código sem reprocessamento substancial;
- **reproc** recálculo;
- **decisão** exige decisão científica de Mario antes de implementar.

## Estado das pendências (atualizado em 2026-10-27, depois do item 1)

| ID | Estado | Onde |
| --- | --- | --- |
| P1-3 | **resolvido**: unidades por evento na B4a v0.2; B4b e B4c v0.2 reprocessados; conclusões mantidas | commit `4462396` |
| P1-4 | **resolvido (doc)**: avisos sobre amplitude e integral; nenhuma métrica nova | `8f21c54`, `4462396` |
| P1-5 | **resolvido (doc)**: tabela de testes principais × exploratórios em `outputs/README.md` | `8f21c54` |
| P1-7 | **parcial**: manifesto SHA-256 e inventário versionados; faltam os checksums do Drive e os metadados dos assets (Mario) | `590c27e` |
| P1-8 | **resolvido**: `docs/audit/decision_log.md`; estados de D25, D27 e D28 corrigidos também na KB | `3ffeb51` |
| P2-1 | **resolvido** | `54eedc2` |
| P2-2 | **resolvido**: `.gitignore` no repositório; política de tabelas grandes explícita | `79fff6e`, `8f21c54` |
| P2-3, P2-7, P2-8, P2-9, P2-11 | **resolvidos (doc)** | `4462396`, `8f21c54`, `54eedc2` |
| testes | **versionados** em `tests/audit/` | `c9696ee` |
| P0-1, P1-1, P1-2, P1-6, P1-9, P1-10, P2-4, P2-5, P2-6, P2-10 | **abertos** (dependem de Mario, de decisão científica ou ficam para o fim: README e sínteses) | — |

## P0

| ID | Problema | Evidência | Consequência | Correção | Arquivos | Natureza | Critério de encerramento |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-1 | Script da etapa 00 (assets A e B estáveis) ausente | `gee/00_…` está marcado "A ADICIONAR" no README e no `gee/README.md`; não existe no GH | as populações A e B, base de todos os resultados, não podem ser reconstruídas nem auditadas (definição de estabilidade "strict", classes, período e asset de fogo usados) | Mario recupera o script original do Code Editor; versiono, documento os parâmetros e cruzo com `outputs/area_stable_…csv`; registro os metadados dos assets A e B | `gee/00_stable_unburned_lulc.js`, `docs/produto_areas_estaveis_fogo.md`, `docs/execucoes.md` | doc + código (**depende de Mario**) | script no GH; parâmetros documentados; área A + B por classe reproduzível a partir do script (conferência pelos metadados dos assets ou por reexecução da tabela de áreas) |

## P1

| ID | Problema | Evidência | Consequência | Correção | Arquivos | Natureza | Critério de encerramento |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1-1 | B selecionada por estabilidade da classe 4 **depois** do fogo (viés de sobrevivência); idem A | critério de B1a (D28) e do asset 00 | o efeito do fogo vale só para fogos que não mudaram a classe; a recuperação "em 2–3 ciclos" pode estar superestimada | (a) declarar o escopo em todos os textos de resultado (doc, inequívoco); (b) **opcional, decisão:** quantificar no GEE a fração de pixels que mudou de classe após fogos que cumprem os critérios | `scientific_consistency.md`, síntese da parte 2; eventual `gee/B1e_…js` | doc + **decisão** | (a) escopo declarado; (b) se aprovado, fração reportada por faixa |
| P1-2 | Inferência do B4c: (i) IC ignora a dependência entre unidades vizinhas no mesmo ano; (ii) a magnitude depende do tipo de referência A | §4 da validação técnica: par × faixa (pico −0,074 × −0,050) | IC estreitos demais; magnitudes apresentadas como únicas | (i) bootstrap em blocos espaciais (0,5°) × ano do 1º fogo, como sensibilidade; (ii) reportar par e faixa lado a lado | `python/B4c_trajetorias_fogo.py` | reproc (leve) + **decisão** (escolha do bloco) | tabelas com os dois IC e as duas referências; texto de resultados atualizado |
| P1-3 ✔ | Unidades de fogo vêm do histórico **anual** | com mês exato: 419 → 491 unidades MODIS; com mês ± 1 (regra adotada): 419 → 423 | pseudorreplicação mal delimitada; incoerente com D30 | recalcular `fire_unit` na B4a com ano de fogo + mês ± 1, ≤ 5 km (consequência direta de D30); manter a unidade antiga em outra coluna; refazer B4b/B4c | `python/B4a_reavaliacao_fogo.py`, `B4b`, `B4c`, saídas `v0.2` | código + reproc (~3 min) | unidades novas nas saídas `v0.2`; diferença v0.1 × v0.2 registrada; IC atualizados |
| P1-4 | Amplitude e integral infladas no ciclo do fogo (medidas a partir do piso); "ombro" sem validade ainda exportado | `fire_effect_event` t = 0: amplitude +0,074 com pico −0,066 | leitura de "mais intensidade" após o fogo seria indevida | doc: marcar amplitude e integral como dependentes do piso e o ombro como "não usar"; **sem nova métrica** (uma integral absoluta seria análise nova: decisão) | `docs/…`, `outputs/README.md`, cabeçalho de `06_metricas.py` | doc (+ decisão para métrica nova) | avisos presentes; nenhuma conclusão apoiada em amplitude ou integral no ciclo do fogo |
| P1-5 | 432 correlações (08) e muitas na 09 e 10, sem distinção entre principal e exploratória | `structure_evi_spearman` | risco de ler um ρ isolado como achado | registrar como testes principais só (a)–(c) da 08 e o Teste 1 e 2 da 09; o resto marcado como exploratório | docs, `outputs/README.md` | doc | hierarquia explícita nos documentos de resultados |
| P1-6 | Agregação de GEDI, GPW e B3d no quadrado geográfico, não no pixel sinusoidal | §4: mediana 7%, máx. 18% da área fora | pequena incoerência entre a escala do EVI MODIS e a do GEDI/GPW e da coerência por evento | doc (limitação) **ou** corrigir a geometria nos scripts GEE e reexportar (decisão: custo de reprocessar 04, 04b, B3d) | `gee/04_gedi.js`, `04b`, `B3d`, docs | doc ou **decisão** + reproc GEE | limitação declarada, ou geometria corrigida com diferença v0.1 × v0.2 reportada |
| P1-7 | Assets GEE e amostras sem versão nem snapshot de metadados; dados brutos só no Drive, sem manifesto | README: "versionamento de assets: ainda não"; `data/README.md` incompleto | reconstrução depende do Drive e de assets que podem ser sobrescritos | versionar o manifesto SHA-256 dos 113 CSVs; documentar todos os assets e o par asset ↔ CSV; registrar metadados dos assets (Mario roda um bloco `print`) | `data/README.md`, `data/manifest_sha256.txt`, `docs/audit/gee_assets_metadata.md` | doc (+ console de Mario) | manifesto no GH; checksums do Drive conferidos; metadados dos assets salvos |
| P1-8 | Decisões científicas só na KB (D01–D31), fora do repositório; estados desatualizados na própria KB (D25, D27, D28) | `docs/README.md` cita D04, D08, D10; KB tem 31 decisões | o repositório não se explica sozinho (critério da auditoria) | `docs/audit/decision_log.md` espelhando D01–D31 com origem, estado (planejado / implementado / executado) e onde está no código; corrigir os estados na KB | `docs/audit/decision_log.md`, `docs/README.md`, KB | doc | todas as decisões rastreáveis no GH |
| P1-9 | Listas de classes antrópicas (borda) não conferidas com a legenda da Col. 11 | pendência desde 01/02a | a borda ≥ 250 m pode estar mal definida | conferir a lista com a legenda oficial e documentar; se houver diferença, decisão sobre reprocessar | `gee/01`, `02a`, `B1a`, docs | doc (+ decisão se divergir) | lista conferida e registrada |
| P1-10 | Acurácia do Fogo 5.1 para "nunca queimada" não avaliada | pendência desde D03 | A pode conter áreas queimadas não detectadas e diluir contrastes | **decisão:** checagem independente com MCD64A1 nos pontos A e B (validação de insumo, sem métrica nova de resultado) | novo `gee/V1_mcd64a1_pontos.js` + `python/V1_…` | **decisão** + GEE | fração de A com queima pelo MCD64A1 reportada; concordância em B |

## P2

| ID | Problema | Evidência | Correção | Arquivos | Encerramento |
| --- | --- | --- | --- | --- | --- |
| P2-1 | B3 marcado "a rodar" na especificação; B3c não executado | `docs/piloto_especificacao.md` L72 | separar B3a, B3b, B3c e B3d com o estado real; B3c "implementado, não executado; não usado" | especificação | tabela coerente com `gee/README.md` |
| P2-2 | `outputs/README.md` × GH: 4 tabelas "não versionadas" estão no GH, 4 não estão; `.gitignore` não está no GH (upload pela web) | §diagnóstico | decidir uma política (sugestão: manter fora do git as > 1 MB, regeneráveis, e listar as que já estão no GH como "versionadas por legado"); subir o `.gitignore` | `outputs/README.md`, `.gitignore` | README = conteúdo real do GH |
| P2-3 | MOD13Q1 de B sem o filtro de pureza 232 m (D21) aplicado em A | `B4b`: `apply_purity_filter=False` | documentar a assimetria; o MOD13Q1 é só checagem | docs, docstring da B4b | assimetria declarada |
| P2-4 | Referências não conferidas (Liebmann & Marengo; LAI sazonal; acúmulo de combustível; brotação por fotoperíodo) | KB [P] | conferir antes de qualquer texto para publicação | docs | referências com DOI |
| P2-5 | README, `docs/README.md` e `gee/README.md` desatualizados (status 2026-10-23, licença "a definir" com MIT presente, estrutura antiga, asset de fogo *accumulated*) | §diagnóstico | reescrever o README com o estado comprovado e a sequência de reprodução do zero | README, `docs/README.md`, `gee/README.md` | README coerente com a matriz |
| P2-6 | `gee/02_populacao_mcd12q2.js` (obsoleto, com campo errado) continua no GH | CHANGELOG 0.4.0 | Mario apaga no GitHub (a interface web permite apagar) ou move para `gee/obsoleto/` com aviso | `gee/` | arquivo removido ou marcado |
| P2-7 | Métrica "ombro" exportada sem aviso | `metrics_point_year` | aviso no `outputs/README.md` e na docstring da 06 (ver P1-4) | docs | aviso presente |
| P2-8 | Assets B1c com coerência anual, superada pela B4a | D30 | nota na documentação | `gee/README.md` | nota presente |
| P2-9 | Fases diferentes das janelas MCD43A4 (1º jan) e da grade da 06 (1º jul) | código | documentar; quantificação opcional | docstrings | documentado |
| P2-10 | `docs/execucoes.md` sem commit e com tempos "a registrar"; síntese da parte 1 fora do GH; parte 2 sem síntese | `execucoes.md`, `sintese_piloto.md` | preencher com os hashes do GH; exportar a síntese para Markdown no GH; escrever a síntese da parte 2 dentro dos limites deste relatório | docs | registros completos; sínteses no GH |
| P2-11 | Versão do Python não registrada | `env/` | registrar Python 3.13 e o comando de reprodução | `env/README.md` | registrado |

## Dependências e sequência

1. **Sem decisão, inequívocas:**
    - P2-1, P2-2, P2-3, P2-5, P2-7, P2-8, P2-9, P2-11;
    - P1-4 e P1-5 (só documentação);
    - P1-7 (manifesto);
    - P1-8 (decision log);
    - P1-3 (unidades por evento, consequência direta de D30) → reprocessamento B4a → B4b → B4c, saídas `v0.2` preservando as `v0.1`;
    - testes de auditoria em `tests/audit/`.
2. **Com Mario, sem decisão científica:** P0-1 (script 00), P1-7 (metadados dos assets, checksums do Drive), P2-6 (apagar o arquivo obsoleto).
3. **Com decisão científica:** P1-1b (quantificar a sobrevivência), P1-2 (bloco espacial × ano), P1-6 (corrigir a geometria ou declarar a limitação), P1-9 (se a lista divergir), P1-10 (MCD64A1).
4. **Por último:** README e sínteses (P2-5, P2-10), depois que 1–3 estabilizarem.

Nenhuma correção exige reprocessar a parte 1. Os reprocessamentos previstos são locais e curtos: B4a–B4c, ~3 min. Os opcionais no GEE dependem de decisão.
