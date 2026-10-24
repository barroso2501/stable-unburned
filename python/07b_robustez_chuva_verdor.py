"""
07b_robustez_chuva_verdor.py — testes de robustez do resultado "verdor antes da chuva" (etapa 07)
Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado (pergunta 2)

POR QUE EXISTE
  A etapa 07 mostrou sos20 antes do onset em 53–74% dos ponto-anos (MODIS). Isso pode ser
  (a) verdor real antes das chuvas (compatível com rebrota lenhosa — hipótese) ou
  (b) artefato: o onset por acumulação anômala marca o início da chuva PERSISTENTE acima da média,
      não as primeiras chuvas; e o sos20 (20% da amplitude) é ruidoso.
  Este script separa (a) de (b) com quatro testes.

TESTES
  T1. Chuva acumulada de 1º jul até sos20 e nos 30 dias anteriores ao sos20.
      Se o verdor começa com < ~25 mm acumulados, não há água de chuva nova disponível.
  T2. Onset alternativo pelas "primeiras chuvas": 1º dia em que o acumulado desde 1º jul
      atinge 25 mm e 50 mm. Defasagem sos20/sos50 em relação a eles.
  T3. Tolerância: % de ponto-anos com sos20 < onset − 16 dias (2 bins de 8 d + pêntada),
      em vez de qualquer diferença negativa.
  T4. Acoplamento interanual: dentro de cada ponto, correlação entre a anomalia do onset e a
      anomalia do sos20/sos50 (anos com ambos válidos; ≥ 8 anos por ponto). Se o verdor fosse
      disparado pela chuva, os anos de chuva tardia teriam verdor tardio (r > 0, inclinação ~1).
  T5. Antecipação maior que o borramento temporal dos produtos: sos20 > 16 dias antes das
      primeiras 25 mm (16 d ≈ janela de composição do MOD13Q1 e de recuperação do MCD43A4).
      Mede (a) a frequência, (b) a repetição por ponto (fração de anos com o evento) e
      (c) a concordância MCD43A4 × MOD13Q1 no mesmo ponto-ano.

ENTRADAS
  data/series/chirps_pentad_band*_v0*2.csv; outputs/rain_greenup_lag_v0.1.csv (etapa 07)
SAÍDAS (outputs/)
  rain_robust_point_year_v0.1.csv   chuva antes do sos20 e onsets alternativos por sensor × ponto × ano
  rain_robust_summary_v0.1.csv      resumo T1–T3 por sensor × faixa
  rain_coupling_summary_v0.1.csv    resumo T4 por sensor × faixa
  rain_early_greenup_v0.1.csv       T5 por faixa: frequência por sensor, concordância entre sensores, repetição por ponto
  rain_early_greenup_points_v0.1.csv  T5 por ponto: fração de anos com antecipação > 16 d em ambos os sensores
"""

import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd

from common import OUT

# reaproveita as funções de leitura da etapa 07 (nome do arquivo começa com dígito → importlib)
_spec = importlib.util.spec_from_file_location("e07", Path(__file__).with_name("07_chuva_verdor.py"))
e07 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(e07)

TAG = "v0.1"
FIRST_RAIN_MM = (25, 50)   # limiares das "primeiras chuvas" (T2)
TOL_DAYS = 16              # tolerância do T3
MIN_YEARS = 8              # anos mínimos por ponto no T4


def rain_features(daily, y, sos20):
    """Acumulados de chuva no ano hidrológico y, em dias desde 1º jul."""
    a = pd.Timestamp(f"{y}-07-01")
    r = daily[(daily.index >= a) & (daily.index < pd.Timestamp(f"{y + 1}-07-01"))].to_numpy()
    out = {f"first{t}": np.nan for t in FIRST_RAIN_MM}
    out.update(rain_to_sos20=np.nan, rain_30d_pre_sos20=np.nan)
    if len(r) < 360:
        return out
    cum = np.cumsum(r)
    for t in FIRST_RAIN_MM:
        idx = np.argmax(cum >= t)
        out[f"first{t}"] = float(idx) if cum[-1] >= t else np.nan
    if not np.isnan(sos20):
        k = int(sos20)
        out["rain_to_sos20"] = round(float(cum[k]), 1)
        out["rain_30d_pre_sos20"] = round(float(r[max(0, k - 30):k + 1].sum()), 1)
    return out


def main():
    j = pd.read_csv(OUT / "rain_greenup_lag_v0.1.csv")
    j = j[j.valid == 1].copy()
    c = e07.read_chirps()

    # séries diárias por ponto (uma vez) e atributos por sensor × ponto × ano
    feats = []
    daily_by_pt = {pid: e07.pentads_to_daily(g) for pid, g in c.groupby("point_id")}
    for row in j[["sensor", "point_id", "hy", "sos20"]].itertuples(index=False):
        feats.append(rain_features(daily_by_pt[row.point_id], row.hy, row.sos20))
    j = pd.concat([j.reset_index(drop=True), pd.DataFrame(feats)], axis=1)
    for t in FIRST_RAIN_MM:
        j[f"lag_sos20_first{t}"] = j.sos20 - j[f"first{t}"]
        j[f"lag_sos50_first{t}"] = j.sos50 - j[f"first{t}"]
    j["pre_onset_tol"] = np.where(j.onset.notna(), (j.sos20 < j.onset - TOL_DAYS).astype(float), np.nan)
    j["pre_first25"] = np.where(j.first25.notna(), (j.sos20 < j.first25).astype(float), np.nan)
    j.to_csv(OUT / f"rain_robust_point_year_{TAG}.csv", index=False)

    # T1–T3: resumo
    g = j.groupby(["sensor", "lat_band"])
    summ = pd.DataFrame({
        "n": g.size(),
        "rain_to_sos20_p50": g.rain_to_sos20.median(),
        "pct_sos20_with_lt25mm": g.rain_to_sos20.apply(lambda s: (s < 25).mean() * 100),
        "rain_30d_pre_sos20_p50": g.rain_30d_pre_sos20.median(),
        "first25_p50": g.first25.median(), "first50_p50": g.first50.median(), "onset_p50": g.onset.median(),
        "lag_sos20_first25_p50": g.lag_sos20_first25.median(),
        "lag_sos50_first50_p50": g.lag_sos50_first50.median(),
        "pct_pre_first25": g.pre_first25.mean() * 100,
        "pct_pre_onset_tol16": g.pre_onset_tol.mean() * 100,
    }).round(1).reset_index()
    summ.to_csv(OUT / f"rain_robust_summary_{TAG}.csv", index=False)

    # T4: acoplamento interanual dentro do ponto
    rows = []
    for (sen, band, pid), d in j.dropna(subset=["onset"]).groupby(["sensor", "lat_band", "point_id"]):
        rec = {"sensor": sen, "lat_band": band, "point_id": pid}
        for m in ("sos20", "sos50"):
            dd = d.dropna(subset=[m])
            if len(dd) >= MIN_YEARS and dd.onset.std() > 0 and dd[m].std() > 0:
                x, yv = dd.onset - dd.onset.mean(), dd[m] - dd[m].mean()
                rec[f"r_{m}"] = float(np.corrcoef(x, yv)[0, 1])
                rec[f"slope_{m}"] = float((x * yv).sum() / (x ** 2).sum())
        rows.append(rec)
    cp = pd.DataFrame(rows)
    g = cp.groupby(["sensor", "lat_band"])
    coup = pd.DataFrame({
        "n_points": g.size(),
        "r_sos20_p50": g.r_sos20.median(), "pct_r_sos20_gt0": g.r_sos20.apply(lambda s: (s > 0).mean() * 100),
        "slope_sos20_p50": g.slope_sos20.median(),
        "r_sos50_p50": g.r_sos50.median(), "pct_r_sos50_gt0": g.r_sos50.apply(lambda s: (s > 0).mean() * 100),
        "slope_sos50_p50": g.slope_sos50.median(),
    }).round(2).reset_index()
    coup.to_csv(OUT / f"rain_coupling_summary_{TAG}.csv", index=False)

    # T5: antecipação > 16 d em relação às primeiras 25 mm (só MODIS: série longa)
    m = j[j.sensor.isin(["MCD43A4", "MOD13Q1"]) & j.first25.notna()].copy()
    m["early16"] = ((m.first25 - m.sos20) > TOL_DAYS).astype(float)
    w = m.pivot_table(index=["lat_band", "point_id", "hy"], columns="sensor", values="early16").dropna()
    w["both"] = w.MCD43A4 * w.MOD13Q1
    rows = []
    for band, d in w.groupby(level="lat_band"):
        per_pt = d.groupby(level="point_id").both.mean()
        rows.append({"lat_band": band, "n_paired": len(d),
                     "pct_early16_MCD43A4": round(d.MCD43A4.mean() * 100, 1),
                     "pct_early16_MOD13Q1": round(d.MOD13Q1.mean() * 100, 1),
                     "pct_early16_both": round(d.both.mean() * 100, 1),
                     # entre os eventos do MCD43A4, % confirmados pelo MOD13Q1
                     "pct_MCD_events_confirmed": round(d.both.sum() / max(d.MCD43A4.sum(), 1) * 100, 1),
                     "points_with_both_ge25pct_years": int((per_pt >= 0.25).sum()),
                     "n_points": len(per_pt)})
    pd.DataFrame(rows).to_csv(OUT / f"rain_early_greenup_{TAG}.csv", index=False)
    pts = (w.groupby(level=["lat_band", "point_id"])
             .agg(n_years=("both", "size"), frac_both=("both", "mean")).round(3).reset_index())
    pts.sort_values("frac_both", ascending=False).to_csv(OUT / f"rain_early_greenup_points_{TAG}.csv", index=False)
    print("Etapa 07b concluída; saídas em", OUT)


if __name__ == "__main__":
    main()
