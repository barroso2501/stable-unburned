# Saídas

Só arquivos pequenos (CSV de áreas, contagens, métricas resumidas). Rasters e séries grandes ficam no GEE ou no Drive.

Convenção de nome: `<produto>_<versão ou RUN_TAG>.csv`. Cada saída deve ter uma linha correspondente em `docs/execucoes.md`.

| Arquivo | Etapa | Conteúdo |
| --- | --- | --- |
| `area_stable_col11_fire5_1_strict_by_fire_context.csv` | 00 | área (ha) por classe e contexto de fogo, Brasil, modo `strict` |
