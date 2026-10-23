# Documentação

## Relação com a base de conhecimento (KB)

O "porquê" (fundamentação, decisões, literatura) fica na KB do projeto "Picos Produtividade" no Claude. O "como foi executado" fica aqui. Quando um script implementa uma decisão, o comentário do script cita o ID (ex.: `decisão D04`).

| Arquivo da KB | Conteúdo |
| --- | --- |
| `kb/00_indice.md` | índice, divisão KB × GitHub, marcas de evidência |
| `kb/01_plano_analise.md` | plano geral |
| `kb/02_piloto_savana_cerrado.md` | especificação científica do piloto |
| `kb/03_decisoes.md` | registro de decisões |
| `kb/04_benchmark.md` | literatura e produtos de referência |

## Decisões implementadas no código (resumo)

| ID | Decisão | Onde |
| --- | --- | --- |
| D04 | núcleo 3×3 Landsat (ponto + 8 vizinhos com mesma classe e contexto) | `gee/01_zonal_4A_cerrado.js` §3 |
| D08 | piloto = classe 4, contexto A, Cerrado | `gee/01_zonal_4A_cerrado.js` §1 |
| D10 | fragmentação controlada por critério amostral (tamanho, borda) | `gee/01_zonal_4A_cerrado.js` §4–5 (quantifica para escolher limiares) |

## Marcas de evidência

**[D]** documentado · **[M]** decisão de método · **[H]** hipótese · **[P]** pendente.

## Arquivos desta pasta

- `produto_areas_estaveis_fogo.md` — descrição do produto da etapa 00.
- `piloto_especificacao.md` — o que o piloto executa, em que ordem, com que entradas e saídas.
- `execucoes.md` — registro de rodadas.
