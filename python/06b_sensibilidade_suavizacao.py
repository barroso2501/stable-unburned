"""
06b_sensibilidade_suavizacao.py — o Savitzky–Golay adianta o início do verdor?
Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado (pergunta 2)

POR QUE EXISTE
  A etapa 07b achou ~24% dos ponto-anos (10–20° S) com início do verdor (sos20) antes de
  25 mm de chuva acumulada. A suavização da etapa 06 (janela de 7 composições = 56 dias) pode
  espalhar a subida da curva para trás e adiantar o sos20 artificialmente.
  Este script refaz as métricas com janelas menores e compara.

O QUE FAZ
  1. Recalcula as métricas da etapa 06 (mesmo código, importado) para MCD43A4 e MOD13Q1
     com SG_WINDOW = 3 (ordem 2 → sem suavização efetiva; só grade de 8 d + interpolação),
     5 (40 dias) e 7 (56 dias, a referência).
  2. Junta com as datas de chuva da etapa 07b (onset e primeiras 25 mm, que não dependem do sensor).
  3. Para cada janela × sensor × faixa: % de sos20 antes das primeiras 25 mm, % antes do onset,
     defasagens medianas e acoplamento interanual onset × sos20/sos50.
  4. Diferença pareada (mesmo ponto-ano válido nas três janelas) do sos20 e sos50 em relação à janela 7.
  O HLS fica de fora: tem poucos anos e lacunas maiores (a janela 3 deixaria muitas falhas).

ENTRADAS  data/series/series_MCD43A4_*.csv, series_MOD13Q1_*.csv; outputs/rain_robust_point_year_v0.1.csv
SAÍDAS (outputs/)
  smoothing_sensitivity_summary_v0.1.csv   indicadores por janela × sensor × faixa
  smoothing_sensitivity_paired_v0.1.csv    deslocamento pareado do sos20/sos50 vs janela 7
"""

import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd

from common import OUT, read_all, clean_mcd43a4, clean_mod13q1

# importa a etapa 06 (nome começa com dígito → importlib) para usar exatamente o mesmo código
_spec = importlib.util.spec_from_file_location("e06", Path(__file__).with_name("06_metricas.py"))
e06 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(e06)

TAG = "v0.1"
WINDOWS = (3, 5, 7)
MIN_YEARS = 8


def coupling(d, m):
    """r mediano e % de pontos com r > 0 entre anomalias de onset e da métrica m, dentro do ponto."""
    rs = []
    for _, g in d.dropna(subset=["onset", m]).groupby("point_id"):
        if len(g) >= MIN_YEARS and g.onset.std() > 0 and g[m].std() > 0:
            rs.append(np.corrcoef(g.onset, g[m])[0, 1])
    rs = np.array(rs)
    return (round(float(np.median(rs)), 2) if len(rs) else np.nan,
            round(float((rs > 0).mean() * 100), 1) if len(rs) else np.nan)


def main():
    series = {"MCD43A4": clean_mcd43a4(read_all("series_MCD43A4_*.csv")),
              "MOD13Q1": clean_mod13q1(read_all("series_MOD13Q1_*.csv"))}
    # datas de chuva por ponto × ano (iguais para todos os sensores)
    rain = (pd.read_csv(OUT / "rain_robust_point_year_v0.1.csv",
                        usecols=["point_id", "hy", "onset", "first25"])
            .drop_duplicates(["point_id", "hy"]))

    allm = []
    for w in WINDOWS:
        e06.SG_WINDOW = w          # troca a janela no módulo importado (smooth_point lê a global)
        for sen, s in series.items():
            m = e06.metrics_for_sensor(s, sen)
            m["window"] = w
            allm.append(m[["window", "sensor", "point_id", "lat_band", "hy", "valid", "sos20", "sos50"]])
            print(f"janela {w} × {sen}: {int(m.valid.sum())} ponto-anos válidos")
    met = pd.concat(allm, ignore_index=True).merge(rain, on=["point_id", "hy"], how="left")

    # 1) indicadores por janela × sensor × faixa (anos válidos daquela janela)
    rows = []
    v = met[met.valid == 1]
    for (w, sen, band), d in v.groupby(["window", "sensor", "lat_band"]):
        r20, p20 = coupling(d, "sos20")
        r50, p50 = coupling(d, "sos50")
        rows.append({"window": w, "window_days": w * 8, "sensor": sen, "lat_band": band, "n": len(d),
                     "pct_sos20_before_first25": round(((d.sos20 < d.first25)[d.first25.notna()]).mean() * 100, 1),
                     "pct_sos20_before_onset": round(((d.sos20 < d.onset)[d.onset.notna()]).mean() * 100, 1),
                     "lag_sos20_onset_p50": (d.sos20 - d.onset).median(),
                     "lag_sos50_onset_p50": (d.sos50 - d.onset).median(),
                     "r_sos20_p50": r20, "pct_r_sos20_gt0": p20,
                     "r_sos50_p50": r50, "pct_r_sos50_gt0": p50})
    pd.DataFrame(rows).to_csv(OUT / f"smoothing_sensitivity_summary_{TAG}.csv", index=False)

    # 2) deslocamento pareado: só ponto-anos válidos nas três janelas
    wide = v.pivot_table(index=["sensor", "point_id", "lat_band", "hy"], columns="window",
                         values=["sos20", "sos50"]).dropna()
    rows = []
    for (sen, band), d in wide.groupby(level=["sensor", "lat_band"]):
        rec = {"sensor": sen, "lat_band": band, "n_paired": len(d)}
        for mtr in ("sos20", "sos50"):
            for w in (3, 5):
                diff = d[(mtr, w)] - d[(mtr, 7)]   # positivo = janela menor dá data mais tardia
                rec[f"{mtr}_w{w}_minus_w7_p50"] = diff.median()
                rec[f"{mtr}_w{w}_minus_w7_p25"] = diff.quantile(.25)
                rec[f"{mtr}_w{w}_minus_w7_p75"] = diff.quantile(.75)
        rows.append(rec)
    pd.DataFrame(rows).to_csv(OUT / f"smoothing_sensitivity_paired_{TAG}.csv", index=False)
    print("Etapa 06b concluída; saídas em", OUT)


if __name__ == "__main__":
    main()
