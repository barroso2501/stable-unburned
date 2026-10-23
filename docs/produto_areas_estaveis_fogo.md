# Áreas estáveis por histórico de fogo — MapBiomas LULC Col. 11 × Fogo Col. 5.1

**Versão da descrição:** 2026-10-23
**Script:** `gee/00_stable_unburned_lulc.js` (Google Earth Engine, Code Editor; originalmente `stable_unburned_lulc.js`)
**Status:** executado em modo `strict` (data de execução a registrar em `docs/execucoes.md`). Assets e CSV gerados:

- `projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_never_burned` (contexto A)
- `projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_burned` (contexto B; caminho presumido pelo padrão de nomes, **confirmar**)
- `outputs/area_stable_col11_fire5_1_strict_by_fire_context.csv`

As checagens de período e de A + B continuam pendentes (§8).

> **Marcas de evidência usadas neste documento**
> - **[D]** documentado em fonte oficial (página de downloads do MapBiomas, ATBD, user-toolkit)
> - **[M]** decisão de método deste produto
> - **[H]** hipótese plausível, não verificada
> - **[P]** pendente: precisa de execução ou checagem

---

## 1. O que é

O produto identifica, para cinco classes de cobertura e uso, os pixels que mantiveram **a mesma classe em todos os anos de 1985 a 2025**. Esses pixels estáveis são separados em dois contextos de fogo:

| Contexto | Definição |
|---|---|
| **(A) Estável e nunca queimado** | pixel estável sem nenhuma detecção de queimada no acumulado 1985–2025 |
| **(B) Estável e queimado ≥ 1 vez** | pixel estável com pelo menos uma detecção de queimada no acumulado 1985–2025 |

A e B são **complementares**: não se sobrepõem e, somados, dão todo o conjunto estável de cada classe [M].

**Classes-alvo** (códigos da legenda da Col. 11 [D]):

| Código | Classe |
|---|---|
| 3 | Formação Florestal |
| 4 | Formação Savânica |
| 11 | Campo Alagado e Área Pantanosa |
| 12 | Formação Campestre |
| 15 | Pastagem |

## 2. Dados de entrada

| Insumo | Asset GEE | Período | Fonte |
|---|---|---|---|
| Cobertura e uso (LULC) Col. 11 | `projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3` | 1985–2025, uma banda por ano (`classification_AAAA`) | user-toolkit `collections-lulc.js` [D] |
| Fogo Col. 5.1 — área queimada acumulada | `projects/mapbiomas-public/assets/brazil/fire/collection5_1/mapbiomas_fire_collection51_accumulated_burned_v1` | 1985–2025 | página "Assets no Google Earth Engine" do MapBiomas Brasil, consultada em 2026-10-23 [D] |

**Observação sobre fontes:** em out/2026, o user-toolkit lista só a Col. 5 de Fogo. A Col. 5.1 aparece apenas na página de downloads, ou seja, o toolkit está atrasado em relação à página [D].

## 3. Método

1. **Série completa** [M]: o pixel precisa ter classe válida em todos os 41 anos. Isso evita que anos sem dado façam um pixel parecer estável por omissão.
2. **Estabilidade** [M]
   - Modo `strict` (padrão): número de classes distintas na série = 1, e essa classe é uma das classes-alvo.
   - Modo `group` (opcional): a estabilidade é avaliada sobre grupos de classes definidos pelo usuário (`GROUP_IDS`), o que tolera oscilações entre classes do mesmo grupo (ex.: 3↔4). O agrupamento é uma decisão metodológica em aberto (ver §6).
3. **Histórico de fogo** [M]: o pixel conta como "queimou" se qualquer banda do acumulado de fogo for diferente de zero. Pixel mascarado no produto de fogo conta como não queimado. Usar o máximo de todas as bandas torna o resultado independente da nomenclatura das bandas.
4. **Separação**: a classe estável é mascarada por "nunca queimou" (A) ou por "queimou" (B).

## 4. Saídas

| Saída | Formato | Conteúdo |
|---|---|---|
| `stable_col11_fire5_1_<modo>_never_burned` | Asset GEE, 1 banda `stable_class` (byte) | código da classe nos pixels do contexto A; resto mascarado |
| `stable_col11_fire5_1_<modo>_burned` | Asset GEE, 1 banda `stable_class` (byte) | código da classe nos pixels do contexto B; resto mascarado |
| `area_stable_col11_fire5_1_<modo>_by_fire_context.csv` | CSV no Drive | colunas `class`, `fire_context`, `area_ha` |

**Grade e região:** a grade é a nativa do LULC (esperado EPSG:4326, ~30 m [H]; confirmar em `proj` no console [P]), com o mesmo `crsTransform` do asset de origem, para manter o alinhamento pixel a pixel. A região é o retângulo envolvente do Brasil (FAO GAUL nível 0); fora do Brasil os pixels saem mascarados porque o LULC é mascarado.

**Pirâmides:** `mode`, para preservar o caráter categórico nas visualizações em escala reduzida.

**Proveniência:** cada asset exportado carrega as propriedades `lulc_asset`, `fire_asset`, `target_classes`, `stability_mode`, `group_ids`, `period`, `created` e `fire_context`.

## 5. Checagens incluídas no script

- O console mostra o último ano do produto de fogo e o compara com o último ano do LULC, avisando se houver descasamento [P].
- O console mostra a primeira e a última banda do LULC, para confirmar o asset e o período [P].
- **Conferência sugerida:** para cada classe, A + B no CSV deve ser igual à área estável total da classe [P].

## 6. Limitações e pontos de atenção

**Sobre a estabilidade**
- **O critério `strict` mistura mudança real com ruído de classificação.** A confusão 3↔4 e 4↔12 é conhecida no Cerrado. Pixels de vegetação nativa estável que oscilam entre essas classes ficam de fora [H: o quanto isso pesa não foi medido].
- **Classes novas na Col. 11** podem capturar parte dos pixels de 4, 11 e 12 em alguns anos: Floresta Alagável (6), Savana Alagada (7, beta) e Formação Herbáceo-Arbustiva (77, restrita à Caatinga segundo o ATBD) [D]. No modo `strict`, isso tende a reduzir a área estável em ambientes alagáveis e na Caatinga [H].
- **O rótulo da classe 12 mudou** ("Grassland" → "Grassland Formation"). Não está documentado se a definição também mudou [D/lacuna].
- **Resultados não são comparáveis com rodadas na Col. 10.1**, porque a coleção é outra e a série tem um ano a mais [M].

**Sobre o fogo**
- **Contexto A (nunca queimado):** em savanas e campos do Cerrado, 41 anos sem fogo é raro do ponto de vista ecológico. Parte de A pode ser omissão do produto de fogo: fogo de sub-bosque, cicatrizes pequenas ou de curta duração, nuvens nos primeiros anos do Landsat [H]. Antes de interpretar A como "refúgio sem fogo", confrontar com a acurácia por classe do ATBD de Fogo [P].
- **Contexto B na classe 3:** pode incluir floresta degradada por fogo que o LULC não reclassificou. "Estável" não significa "intacta" [H].
- **Contexto B na classe 11:** risco maior de falso positivo, por confusão espectral entre cicatriz e solo escuro ou água rasa [H].
- **Contexto B na classe 15:** fogo em pastagem é sobretudo manejo, então B mede um processo diferente do das classes nativas. Recomenda-se reportar a pastagem separadamente [M].
- **"Queimou ≥ 1 vez" é binário:** não distingue 1 queima de 25 queimas. Para análises de regime de fogo, substituir o acumulado pela frequência de fogo da Col. 5.1 [M].

## 7. Parâmetros configuráveis no script

| Parâmetro | Padrão | Função |
|---|---|---|
| `TARGET_CLASSES` | `[3, 4, 11, 12, 15]` | classes analisadas |
| `STABILITY_MODE` | `'strict'` | `'strict'` ou `'group'` |
| `GROUP_IDS` | `[1, 1, 1, 1, 2]` | grupos (só no modo `group`); valor de exemplo, **não validado** |
| `START_YEAR` / `END_YEAR` | 1985 / 2025 | período |
| `EXPORT_ASSET_ROOT` | `projects/SEU_PROJETO/assets/` | **ajustar antes de rodar** |
| `EXPORT_FOLDER_DRIVE` | `GEE_exports` | pasta do CSV |

## 8. Pendências

- [ ] Executar o script e registrar a data de execução.
- [ ] Confirmar no console que o período do fogo chega a 2025.
- [ ] Conferir A + B = total estável por classe.
- [ ] Inspecionar visualmente uma amostra de pixels de B na classe 11 (falso positivo de fogo).
- [ ] Decidir se o modo `group` será usado e, se sim, como agrupar, incluindo se 6, 7 e 77 entram.
- [ ] Levantar a acurácia do produto de Fogo Col. 5.1 por classe para qualificar o contexto A.
- [ ] Versionar o script em git, junto com este documento.
