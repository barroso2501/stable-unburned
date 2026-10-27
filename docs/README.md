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

## Decisões

O registro completo (D01–D31), com origem, estado real e onde cada decisão está no código, fica em [`audit/decision_log.md`](audit/decision_log.md). É um espelho da KB, conferido na auditoria de 2026-10-27. Motivo, consequência e teste crítico de cada decisão continuam na KB (`kb/03_decisoes.md`). Em divergência sobre **o que foi executado**, vale este repositório.

## Auditoria (2026-10-27)

| Arquivo | Conteúdo |
| --- | --- |
| [`audit/state_assessment.md`](audit/state_assessment.md) | estado real de cada etapa (planejado, implementado, executado, validado) e matriz de rastreabilidade |
| [`audit/scientific_consistency.md`](audit/scientific_consistency.md) | o que os resultados sustentam, o que é condicional e o que não se pode afirmar |
| [`audit/technical_validation.md`](audit/technical_validation.md) | reprodução completa, testes e diagnósticos |
| [`audit/correction_plan.md`](audit/correction_plan.md) | pendências P0/P1/P2, com estado |
| [`audit/decision_log.md`](audit/decision_log.md) | decisões D01–D31 |

## Marcas de evidência

**[D]** documentado · **[M]** decisão de método · **[H]** hipótese · **[P]** pendente.

## Arquivos desta pasta

- `produto_areas_estaveis_fogo.md` — descrição do produto da etapa 00.
- `piloto_especificacao.md` — o que o piloto executa, em que ordem, com que entradas e saídas.
- `execucoes.md` — registro de rodadas.
