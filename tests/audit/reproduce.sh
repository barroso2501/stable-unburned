#!/usr/bin/env bash
# Reproduz todas as saídas Python a partir do código e dos dados brutos e compara com as versionadas.
# Uso: bash tests/audit/reproduce.sh /caminho/para/data/series
# Requer: Python 3.13 com env/requirements.txt. Tempo: ~15 min.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DATA="${1:-$ROOT/data/series}"
WORK="$(mktemp -d)"
cp -r "$ROOT/python" "$ROOT/env" "$WORK/"
mkdir -p "$WORK/outputs" "$WORK/data"
ln -s "$DATA" "$WORK/data/series"
cp "$ROOT/outputs/pilot_4A_sample_v0.1.csv" "$WORK/outputs/"   # saída do GEE (etapa 03), não do Python
cd "$WORK"
for s in 05_qc_series 06_metricas 07_chuva_verdor 07b_robustez_chuva_verdor 06b_sensibilidade_suavizacao \
         08_estrutura_evi 09_limiar_fotoperiodo 10_gpw B2_qc_amostra B4a_reavaliacao_fogo B4b_metricas_4B B4c_trajetorias_fogo; do
  echo ">> $s"; python3 "python/$s.py" > "$WORK/log_$s.txt" 2>&1
done
python3 "$ROOT/tests/audit/compare_outputs.py" "$WORK/outputs" "$ROOT/outputs" "$ROOT/outputs"
echo "Saídas regeneradas em $WORK/outputs"
