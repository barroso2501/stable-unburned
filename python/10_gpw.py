"""
10_gpw.py — altura do Global Pasture Watch (GPW) em savana natural sem fogo
Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado

PERGUNTAS
  1. O GPW (modelo treinado com ICESat-2, validado sobretudo em pastagens) concorda com o
     GEDI em savana natural? Com qual altura do GEDI (rh50 ou rh98) e com a cobertura?
  2. A altura muda em 25 anos sem fogo detectado (2000–2024)? A tendência é independente
     do sinal espectral? Checagem de circularidade: o GPW usa Landsat; se a tendência de
     altura acompanha a tendência de EVI do MODIS no mesmo ponto, ela pode ser verdor
     reinterpretado como altura, e não estrutura.
  3. A altura do GPW se relaciona com a curva sazonal (piso da seca, amplitude) e com o
     acoplamento do verdor à chuva (etapa 09), como a estrutura do GEDI (etapa 08)?

O QUE FAZ
  - QC: pontos, anos, pixels por quadrado, variação dentro do quadrado (p90 − p10).
  - Série anual mediana por faixa (procura degraus de sensor, ex. 2012–2013).
  - Tendência por ponto 2000–2024: Theil–Sen (m/década) e teste de Mann–Kendall (Kendall τ).
    2025 fica fora (imagem possivelmente provisória). Sem correção para autocorrelação
    temporal → os p-valores são otimistas.
  - Tendências do EVI MCD43A4 por ponto (base_pre, peak_evi, amplitude) para a checagem
    de circularidade.
  - Correlações de Spearman com postos dentro da faixa, faixas 2–4, IC 95% por bootstrap
    em blocos de 0,5° (mesma função da etapa 08).

ENTRADAS
  data/series/gpw_height_v0*1.csv; outputs/structure_evi_point_v0.1.csv (08),
  outputs/metrics_point_year_v0.1.csv (06), outputs/threshold_skill_point_v0.1.csv e
  threshold_skill_summary_v0.1.csv (09)
SAÍDAS (outputs/)
  gpw_qc_v0.1.csv               por faixa: pontos, pixels, altura, variação no quadrado
  gpw_annual_band_v0.1.csv      mediana anual da altura por faixa
  gpw_trend_point_v0.1.csv      tendência por ponto (GPW e EVI)
  gpw_trend_summary_v0.1.csv    tendências por faixa
  gpw_correlations_v0.1.csv     Spearman GPW × GEDI, GPW × EVI, GPW × acoplamento, tendências
  gpw_annual_common_v0.1.csv    fração da variação anual comum aos pontos da faixa; relação com chuva e EVI
"""

import glob
import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import theilslopes, kendalltau, spearmanr

from common import DATA, OUT

_spec = importlib.util.spec_from_file_location("e08", Path(__file__).with_name("08_estrutura_evi.py"))
e08 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(e08)

TAG = "v0.1"
TREND_YEARS = (2000, 2024)
GEDI_YEARS = (2019, 2024)      # janela do GEDI, para a comparação de nível
MIN_FP = 3
SENSOR = "MCD43A4"


def trend(years, values):
    """Theil–Sen (unidade/década) e p-valor de Kendall; NaN se poucos anos."""
    ok = ~np.isnan(values)
    if ok.sum() < 15:
        return np.nan, np.nan
    s = theilslopes(values[ok], years[ok]).slope * 10
    p = kendalltau(years[ok], values[ok]).pvalue
    return s, p


def corr_rows(df, pairs, label):
    """Spearman com postos dentro da faixa (faixas 2–4) e IC por bootstrap espacial."""
    d = df[df.lat_band.isin([2, 3, 4])]
    rows = []
    for x, y in pairs:
        xr = d.groupby("lat_band")[x].rank(pct=True)
        yr = d.groupby("lat_band")[y].rank(pct=True)
        rho, lo, hi, n, nb = e08.block_boot_rho(xr, yr, d.lon, d.lat)
        rows.append({"block": label, "x": x, "y": y, "n_points": n, "n_blocks": nb,
                     "rho": rho, "ci_lo": lo, "ci_hi": hi})
    return rows


def main():
    files = sorted(glob.glob(str(DATA / "gpw_height_v0*1.csv")))
    if not files:
        raise FileNotFoundError(f"Nenhum gpw_height_v0*1.csv em {DATA}")
    g = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)
    g["spread"] = g.h_p90 - g.h_p10

    # ---- QC e série anual ----
    qc = g.groupby("lat_band").agg(points=("point_id", "nunique"), years=("year", "nunique"),
                                   n_px_p50=("n_px", "median"), h_mean_p50=("h_mean", "median"),
                                   h_mean_p10=("h_mean", lambda v: v.quantile(.1)),
                                   h_mean_p90=("h_mean", lambda v: v.quantile(.9)),
                                   spread_in_square_p50=("spread", "median")).round(2).reset_index()
    qc.to_csv(OUT / f"gpw_qc_{TAG}.csv", index=False)
    g.groupby(["lat_band", "year"]).h_mean.median().round(3).unstack("lat_band").to_csv(
        OUT / f"gpw_annual_band_{TAG}.csv")

    # ---- sinal anual comum: quanto da variação ano a ano é compartilhada pelos pontos da faixa,
    #      e se acompanha chuva (CHIRPS) ou EVI do MODIS no mesmo ano ----
    r = pd.read_csv(OUT / "rain_onset_point_year_v0.1.csv")
    mm = pd.read_csv(OUT / "metrics_point_year_v0.1.csv")
    mm = mm[(mm.sensor == SENSOR) & (mm.valid == 1)]

    def band_anom(d, col, key):
        d = d.copy()
        d["a"] = d[col] - d.groupby("point_id")[col].transform("mean")
        return d.groupby(["lat_band", key]).a.median()

    ga = g[g.year.between(*TREND_YEARS)].copy()
    ga["a"] = ga.h_mean - ga.groupby("point_id").h_mean.transform("mean")
    G = ga.groupby(["lat_band", "year"]).a.median()
    drivers = {"rain_hy_start": (band_anom(r, "year_total_mm", "hy"), 0),     # ano hidrológico que começa em Y
               "rain_hy_prev": (band_anom(r, "year_total_mm", "hy"), 1),      # que termina em Y
               "peak_evi_hy_start": (band_anom(mm, "peak_evi", "hy"), 0),
               "base_pre_hy_start": (band_anom(mm, "base_pre", "hy"), 0)}
    rows = []
    for band, d in ga.groupby("lat_band"):
        common = d.groupby("year").a.transform("median")
        rec = {"lat_band": band, "r2_common_year_signal": 1 - ((d.a - common) ** 2).sum() / (d.a ** 2).sum()}
        gb = G.loc[band]
        for k, (S, shift) in drivers.items():
            s = S.loc[band] if band in S.index.get_level_values(0) else pd.Series(dtype=float)
            x = pd.Series({y: s.get(y - shift, np.nan) for y in gb.index})
            ok = x.notna()
            rec[f"rho_{k}"] = spearmanr(gb[ok], x[ok]).statistic if ok.sum() >= 10 else np.nan
        rows.append(rec)
    pd.DataFrame(rows).round(3).to_csv(OUT / f"gpw_annual_common_{TAG}.csv", index=False)

    # ---- tendências por ponto: GPW e EVI ----
    gt = g[g.year.between(*TREND_YEARS)]
    m = pd.read_csv(OUT / "metrics_point_year_v0.1.csv")
    m = m[(m.sensor == SENSOR) & (m.valid == 1)]
    rows = []
    for (pid, band), d in gt.groupby(["point_id", "lat_band"]):
        yrs = d.year.to_numpy(float)
        s, p = trend(yrs, d.h_mean.to_numpy(float))
        rec = {"point_id": pid, "lat_band": band, "gpw_slope_m_dec": s, "gpw_p": p}
        e = m[m.point_id == pid]
        for col in ("base_pre", "peak_evi", "amplitude"):
            es, ep = trend(e.hy.to_numpy(float), e[col].to_numpy(float))
            rec[f"{col}_slope_dec"], rec[f"{col}_p"] = es, ep
        rows.append(rec)
    tr = pd.DataFrame(rows)
    tr.round(5).to_csv(OUT / f"gpw_trend_point_{TAG}.csv", index=False)
    ts = tr.groupby("lat_band").agg(
        n=("point_id", "size"), gpw_slope_p50=("gpw_slope_m_dec", "median"),
        pct_gpw_up_p05=("gpw_p", lambda v: np.nan),   # preenchido abaixo
        base_pre_slope_p50=("base_pre_slope_dec", "median"),
        peak_evi_slope_p50=("peak_evi_slope_dec", "median"))
    for band, d in tr.groupby("lat_band"):
        ts.loc[band, "pct_gpw_up_p05"] = ((d.gpw_slope_m_dec > 0) & (d.gpw_p < 0.05)).mean() * 100
        ts.loc[band, "pct_gpw_down_p05"] = ((d.gpw_slope_m_dec < 0) & (d.gpw_p < 0.05)).mean() * 100
    ts.round(4).reset_index().to_csv(OUT / f"gpw_trend_summary_{TAG}.csv", index=False)

    # ---- nível por ponto: média da janela do GEDI e média de todo o período ----
    lvl = (g[g.year.between(*GEDI_YEARS)].groupby("point_id").agg(gpw_h_gedi_win=("h_mean", "mean"),
                                                                   gpw_spread=("spread", "mean"))
           .join(g[g.year.between(*TREND_YEARS)].groupby("point_id").h_mean.mean().rename("gpw_h_all")))
    st = pd.read_csv(OUT / "structure_evi_point_v0.1.csv")
    df = st.merge(lvl.reset_index(), on="point_id").merge(tr, on=["point_id", "lat_band"])
    gedi_ok = df.n_all >= MIN_FP

    # acoplamento à chuva (etapa 09): melhor limiar da faixa, MCD43A4, sos50
    sp = pd.read_csv(OUT / "threshold_skill_point_v0.1.csv")
    su = pd.read_csv(OUT / "threshold_skill_summary_v0.1.csv")
    su = su[(su.sensor == SENSOR) & (su.metric == "sos50") & (su.trigger != "onset")]
    best = su.loc[su.groupby("lat_band").skill_p50.idxmax(), ["lat_band", "trigger"]]
    sk = sp[(sp.sensor == SENSOR) & (sp.metric == "sos50")].merge(best, on=["lat_band", "trigger"])
    df = df.merge(sk[["point_id", "skill", "slope"]].rename(columns={"slope": "rain_slope"}), on="point_id", how="left")

    rows = []
    rows += corr_rows(df[gedi_ok], [("gpw_h_gedi_win", "rh50_all"), ("gpw_h_gedi_win", "rh98_all"),
                                    ("gpw_h_gedi_win", "cover_all")], "GPW × GEDI")
    rows += corr_rows(df, [("gpw_h_all", y) for y in ("base_pre", "amplitude", "rel_amp", "peak_evi",
                                                      "sos50", "early_frac", "skill", "rain_slope")],
                      "GPW × EVI e acoplamento")
    rows += corr_rows(df, [("gpw_slope_m_dec", "base_pre_slope_dec"), ("gpw_slope_m_dec", "peak_evi_slope_dec"),
                           ("gpw_slope_m_dec", "amplitude_slope_dec"), ("gpw_slope_m_dec", "gpw_h_all")],
                      "tendência GPW × tendência EVI (circularidade)")
    pd.DataFrame(rows).round(3).to_csv(OUT / f"gpw_correlations_{TAG}.csv", index=False)

    # nível absoluto GPW vs GEDI (mediana das diferenças)
    d = df[gedi_ok]
    print("GPW − rh50 (m), mediana:", round((d.gpw_h_gedi_win - d.rh50_all).median(), 2),
          "| GPW − rh98 (m), mediana:", round((d.gpw_h_gedi_win - d.rh98_all).median(), 2))
    print("Etapa 10 concluída; saídas em", OUT)


if __name__ == "__main__":
    main()
