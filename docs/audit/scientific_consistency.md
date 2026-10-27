# Consistência científica (Produto B)

Rascunho de auditoria, 2026-10-27.

**Classes usadas neste documento:**
- **Sustentado:** resultado reproduzido e robusto aos testes feitos.
- **Condicional:** vale sob pressupostos explícitos.
- **Não resolvido:** os dados atuais não decidem.
- **Interpretação indevida a evitar:** o que **não** se pode dizer.

Números e testes vêm das saídas reproduzidas nesta auditoria (`technical_validation.md`).

## 0. Lógica do estudo, reconstruída

| Elemento | Parte 1 (A: nunca queimada) | Parte 2 (B: queimada, regime espaçado) |
| --- | --- | --- |
| Perguntas | Q1 padrões espaciais do ciclo; Q2 desacoplamento lenhosas × gramíneas; Q3 sensores | QF: o fogo desloca o ciclo no tempo ou muda sua intensidade? Isso depende do momento do fogo e da repetição? |
| Hipóteses | H-Q2a: mais dossel → piso mais alto na seca e amplitude relativa menor; H-Q2b: verdor por limiar de chuva (gramíneas) × por fotoperíodo (lenhosas) | H1 deslocamento; H2 intensidade decai com o tempo desde o fogo (macega); H3 o piso cai e depois se recupera |
| População | 4-A: classe 4 estável 1985–2025, sem fogo detectado, Cerrado, núcleo 3×3, borda ≥ 250 m | 4-B: idem estável; sem fogo 1985–2000; 1–5 fogos espaçados ≥ 4 anos em 2001–2025 |
| Unidade | pixel MODIS 463 m puro (≥ 90%); HLS no centro dele | idem + coerência do evento; amostra HLS sem exigência de pureza |
| Variáveis explicativas | faixa de latitude; chuva (CHIRPS); estrutura (GEDI, GPW) | tempo desde o fogo; momento do fogo; nº de fogos; ano |
| Respostas | sos20/50, eos50, pico, piso, amplitude, integral | as mesmas, como diferença B − A no ano, descontada a linha de base |
| Inferência | descritiva por faixa; Spearman com bootstrap espacial; skill dentro do ponto | diferenças em diferenças dentro do ponto; bootstrap por unidade de fogo |

## B1. Populações

**Sustentado:**
- As populações são operacionalmente reprodutíveis a partir dos assets.
- Os critérios de B conferem no pixel: assinatura = fogo anual em 100%, nenhum fogo em 1985–2000.

**Distinções que a documentação precisa fixar:**
1. **Estabilidade de classe ≠ estabilidade ecológica.** "Estável" = mesmo rótulo do MapBiomas em 41 anos. A estrutura pode ter mudado dentro da classe 4: adensamento, perda de estrato, mudança de composição. A fronteira 4 × 3 e 4 × 12 é do classificador.
2. **Sem fogo detectado ≠ sem fogo.** A acurácia do Fogo 5.1 nesta população **não foi avaliada**. A omissão de queimas pequenas ou rasteiras, ou sob nuvem, transforma parte de A em "B não detectado" e dilui contrastes A × B. O manuscrito `cerrado-fire-interval` (Col. 4) faz a mesma ressalva.

**Vieses de seleção identificados:**
- **Condicionamento a um resultado posterior ao fogo (B):** B exige classe 4 estável **até 2025**, ou seja, depois do fogo. Fogos que levaram a mudança de classe (para 3, 12 ou antrópica) estão excluídos por construção. A recuperação "em 2–3 ciclos" vale **para os fogos que não alteraram a classe**; não é a resposta média da savana ao fogo. Vale também para A: exclui o que adensou a ponto de virar 3.
- **Espaciais:**
    - borda ≥ 250 m e pureza ≥ 90% favorecem manchas grandes e interiores;
    - em B, a pureza MODIS seleciona fogos grandes e homogêneos (~10% da área da população é candidata);
    - a representatividade em relação a toda a savana estável do Cerrado não foi quantificada (por exemplo, a fração em áreas protegidas).
- **Temporais:**
    - o 1º fogo de B concentra-se em 2007, 2010 e 2012;
    - os tempos de evento ≥ 10 vêm só de fogos de 2002–2014.
- **Faixas 0–5° S e 20–25° S:** a primeira mistura o limite IBGE com outras formações (hipótese dos cocais, não testada); a segunda tem n = 15. Ambas estão corretamente marcadas como exploratórias.

**Interpretação indevida a evitar:** "A representa a savana sem fogo"; "B representa a savana sob regime natural de fogo". B descreve **reintrodução do fogo após ≥ 16 anos sem fogo detectado, em savana que permaneceu na classe 4**.

## B2. Fenologia e sazonalidade

**Sustentado:**
- **Ciclo:** a savana 4-A é praticamente unimodal (MCD12Q2 por ano hidrológico: 2 ciclos em 0,1–0,6%).
- **Gradiente:** o início do verdor varia em latitude (sos50 de ~16/out a ~19/jan).
- **Métrica temporal robusta:** o início do verdor concorda entre sensores (diferença mediana 0–2 d). A data do pico não concorda (MAD 24–32 d) e foi corretamente rebaixada.

**Adequação dos procedimentos:**
- **Ano hidrológico jul–jun:** adequado para 5–25° S. Em 0–5° S o eos50 cai perto da borda de junho (p75 ≈ 4/jun) e o eos20 pode ser truncado; a regra de borda só se aplica ao pico. Mais um motivo para manter a faixa como exploratória.
- **Circularidade:** tratada para o pico (desvio circular). As métricas sos/eos ficam longe da borda, exceto na faixa 1.
- **Lacunas:** interpolação ≤ 64 d e ano inválido com lacuna maior. Razoável. O HLS antes de 2018/19 foi excluído com evidência.
- **Diferenças entre sensores:** a amplitude e a assimetria do HLS divergem do MODIS, sem explicação.

**Limites:**
- **Amplitude e integral** são medidas a partir do piso (mínimo antes do pico). Qualquer processo que derrube o piso, como o fogo, infla as duas sem mais verde. Para intensidade, o pico é a métrica direta.
- **Ombro:** detectado em 30–69% dos ponto-anos, ou seja, ruído. Continua nas saídas sem marca de "não usar".
- **Sazonal × interanual × estrutural:** só o ciclo anual é separado. Tendências interanuais aparecem só no GPW (etapa 10) e não foram analisadas para o EVI. Nada no desenho distingue mudança estrutural de variação climática interanual.

## B3. Chuva e verdor

**Sustentado:**
- O dia em que a chuva acumulada atinge 50–100 mm prevê o sos50 melhor que uma data fixa e que o início das chuvas pela acumulação anômala (faixas 5–20° S).
- **Verificação nova, fora da amostra:** escolhendo o limiar com os anos ímpares e avaliando nos pares, o skill fica entre 0,11 e 0,16 nas faixas 0–20° S. O limiar escolhido coincide ou fica vizinho (T50–T150). O resultado não é artefato da seleção, embora a magnitude dentro da amostra seja otimista (faixa 15–20° S: 0,21 dentro × 0,135 fora).

**Condicional:**
- "Verdor antes da chuva" desaparece quase todo ao se usar as primeiras chuvas e a imprecisão de data dos produtos. Os ~4–6% restantes dependem da precisão do CHIRPS para chuvas leves, que não foi testada.
- O controle do verdor pela data em 20–25° S tem n = 15.

**Associação ≠ mecanismo:**
- O limiar de chuva acumulada é **compatível** com recarga da camada superficial do solo (premissa de Mario), mas não a demonstra. Umidade do solo não foi medida.
- O método de início e fim das chuvas (acumulação anômala) tem a referência ainda não conferida.
- A relação foi modelada como gatilho com inclinação 1 ou livre. Não linearidades (saturação, dependência do solo) não foram exploradas.

## B4. Estrutura (GEDI, GPW)

**Sustentado:**
- Entre pontos, mais estrutura acompanha mais pico (ρ = 0,44), não um piso mais alto na seca (ρ = 0,02).
- O GPW concorda moderadamente com o GEDI (ρ = 0,28–0,37) e carrega sinal de verdor.

**Limites que restringem a inferência:**
- Os footprints GEDI são 75–85% da estação seca, ~10 por ponto (erro que atenua correlações), e cobrem 2019–2025, contra um EVI que é mediana de 2000–2024.
- Cobertura e PAI são redundantes.
- O GPW é modelo alimentado por Landsat: não é medida independente do verdor.
- **Geometria:** o quadrado geográfico usado para agregar GEDI e GPW difere do pixel sinusoidal MODIS (mediana de 7% da área fora, máx. 18%).
- **Comparações múltiplas:** a etapa 08 produz 432 correlações. Só as hipóteses (a)–(c) eram principais; o restante é exploratório e precisa estar marcado assim.

**Interpretação indevida a evitar:** tratar a correlação estrutura × amplitude como medida da contribuição fenológica do estrato lenhoso. Os dados **não** decompõem o sinal por estrato. Há duas leituras concorrentes que o desenho não separa: produtividade do sítio e macega.

## B5. A × B e trajetórias de fogo

**Desenho:** diferenças em diferenças dentro do ponto, com A do mesmo ano como controle climático (par ≤ 20 km em 64–66% dos ponto-anos MODIS; nos demais, a mediana de A na faixa).

**Pressupostos verificados nesta auditoria:**
- **Tendências paralelas antes do fogo:** a inclinação de B − A nos ciclos pré-fogo é ≈ 0 (pico −0,0001/ciclo [−0,0005; 0,0002]; sos50 +0,08 d/ciclo [−0,02; +0,17]; 394 unidades). Sustenta o pressuposto **dentro da janela pré-fogo observada**.
- **Antes do fogo, B ≈ A:** pico +0,011, demais métricas ≈ 0.
- **Sensibilidade ao tipo de referência:** no ciclo do fogo, pico −0,074 com o par e −0,051 com a mediana da faixa; sos50 +31 d e +39 d. O sinal é robusto e a magnitude depende da referência.
- **Fogos de 2010 × outros anos:** pico −0,058 × −0,069; sos50 +38 d × +31 d. O efeito não é produto do ano de 2010.

**Sustentado (para o universo de B, com os vieses de B1):** no ciclo seguinte ao 1º fogo, a estação se desloca (sos50 +32 d, eos50 +22 d) e o pico cai (~−0,066). Em 2–3 ciclos, a maior parte das métricas volta à linha de base. O momento do fogo modula o efeito agudo.

**Condicional ou não resolvido:**
- **Independência:** as unidades de fogo vieram do histórico **anual**. Refeitas com os eventos mensais, passam de 419 para 491 unidades MODIS, e 313 pontos mudam de grupo. Unidades vizinhas no mesmo ano não são independentes (mesmo clima, mesma região), e o bootstrap por unidade ignora isso → os intervalos estão provavelmente estreitos demais.
- **Momento × outros fatores:** "início das chuvas" e "fim da seca" distam ~1 mês, a resolução do produto mensal. O momento pode se correlacionar com intensidade do fogo e região. O efeito por momento é descritivo, não causal.
- **Efeitos persistentes pequenos** (amplitude +0,005–0,012; piso −0,004–0,007): a amplitude é parcialmente artefato do piso, e a magnitude fica perto do ruído entre referências.
- **Hipótese da macega:** **não testada**. O EVI não vê material morto. A volta à linha de base em 2–3 ciclos é do **verde**.

**Interpretação indevida a evitar:**
- "Efeito causal do fogo sobre a savana" sem os qualificadores: fogos detectados, em savana que permaneceu na classe 4, após ≥ 16 anos sem fogo detectado, MODIS 463 m.
- "A exclusão do fogo não altera a savana": o EVI não mede a estrutura herbácea nem o material morto, e B pré-fogo ≈ A só mostra que os dois estados excluídos são parecidos entre si.
