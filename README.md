# stable-unburned

Picos sazonais de atividade vegetal em áreas de cobertura estável (MapBiomas Col. 11, 1985–2025), estratificadas por histórico de fogo (MapBiomas Fogo Col. 5.1). Análise exploratória e descritiva, com duas janelas de sensor: MODIS 2000–2025 e HLS 2016–2025.

**Status (2026-10-23):** produto de áreas estáveis gerado (etapa 00). Piloto especificado, não executado.

## Primeiro passo: piloto

Savana (classe 4) estável e nunca queimada, só no Cerrado. Três perguntas:

1. Padrões espaciais da variação sazonal, da intensidade e do número de picos.
2. É possível inferir o desacoplamento entre lenhosas e gramíneas? (estrutura via GEDI L2B)
3. Como os sensores (MODIS, HLS, MCD12Q2) se comportam nessas comparações?

Especificação: [`docs/piloto_especificacao.md`](docs/piloto_especificacao.md).

## Estrutura

```
stable-unburned/
├── README.md
├── CHANGELOG.md
├── docs/
│   ├── README.md                     # relação com a KB e índice de decisões
│   ├── produto_areas_estaveis_fogo.md
│   ├── piloto_especificacao.md
│   └── execucoes.md                  # registro de cada rodada (data, script, commit, saída)
├── gee/
│   ├── README.md
│   ├── 00_stable_unburned_lulc.js    # A ADICIONAR (script original da etapa 00)
│   └── 01_zonal_4A_cerrado.js
├── outputs/                          # CSVs pequenos, nome com versão; ver outputs/README.md
└── env/                              # ambiente Python (quando houver)
```

## Assets usados

| Papel | Asset |
| --- | --- |
| LULC Col. 11 | `projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3` |
| Fogo Col. 5.1 acumulado | `projects/mapbiomas-public/assets/brazil/fire/collection5_1/mapbiomas_fire_collection51_accumulated_burned_v1` |
| Estável, nunca queimado (A) | `projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_never_burned` |
| Estável, queimado ≥ 1 vez (B) | `projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_burned` (confirmar) |
| Limite do Cerrado (biomas IBGE) | `projects/ee-barroso2501/assets/biomas_IBGE` |

## Como reproduzir

1. Scripts GEE em `gee/`, numerados na ordem de execução. Cada um tem um bloco `PARÂMETROS` no topo; só ali se altera algo.
2. Colar o script no Code Editor do GEE (o GitHub é a fonte; o Code Editor é só onde se executa).
3. Rodar a tarefa de exportação. Baixar o CSV do Drive para `outputs/`, mantendo o nome com `RUN_TAG`.
4. Registrar a rodada em `docs/execucoes.md` e fazer o commit do script e da saída juntos.

## Nível de reprodutibilidade

Leve, proporcional ao estágio: código versionado, parâmetros explícitos no topo de cada script, proveniência gravada nos assets e CSVs, registro de execuções. Ainda não há: ambiente Python capturado (sem Python por enquanto), versionamento de assets GEE (o GEE não versiona; a proveniência fica nas propriedades), testes automatizados.

## Documentação científica

Fundamentação, decisões (D01–D11) e benchmark de literatura ficam na base de conhecimento do projeto no Claude ("Picos Produtividade"). Ver [`docs/README.md`](docs/README.md). Regra: a KB prevalece para decisões; este repositório prevalece para o que foi executado.

## Licença

A definir.
