# Testes da auditoria (2026-10-27)

| Script | O que verifica | Como rodar |
| --- | --- | --- |
| `reproduce.sh` | regenera todas as saídas Python e compara célula a célula com as do repositório | `bash tests/audit/reproduce.sh data/series` |
| `test_integrity.py` | ids, cobertura das séries, duplicatas, histórico de fogo × assinatura, unicidade das tabelas de métricas | `python tests/audit/test_integrity.py` (código de saída 1 se algum teste falhar) |
| `diagnostics_fire.py` | pré-tendência B − A, sensibilidade ao tipo de referência A e ao ano de 2010, composição por tempo de evento, unidades com mês exato, geometria quadrado × pixel sinusoidal | `python tests/audit/diagnostics_fire.py` |
| `diagnostics_threshold.py` | escolha do limiar de chuva fora da amostra (etapa 09) | `python tests/audit/diagnostics_threshold.py` |
| `compare_outputs.py` | comparação de duas pastas de saídas | usado por `reproduce.sh` |

Os testes de integridade e os diagnósticos precisam das tabelas não versionadas (`metrics_point_year`, `metrics4B_point_year`, `threshold_point_year`, `fire4B_*`); gere-as antes com `reproduce.sh` ou com os scripts `python/`, e aponte `--outputs` para a pasta onde estão. Resultados da execução de 2026-10-27: `docs/audit/technical_validation.md`.
