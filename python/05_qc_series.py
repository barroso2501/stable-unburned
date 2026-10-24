"""
05_qc_series.py — controle de qualidade e primeira comparação das séries
Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado

O QUE FAZ
  1. Lê os CSVs da etapa 05 (MOD13Q1, MCD43A4 8 dias, HLS L30/S30) em data/series/.
  2. Limpa cada produto:
     - HLS: remove reflectâncias negativas; junta duplicatas (mesma passagem em
       tiles MGRS sobrepostos) pela mediana; calcula EVI; mantém 0 < EVI < 1.
     - MOD13Q1: EVI ×0,0001; mantém SummaryQA ≤ 1 (bom ou marginal); usa a data
       real da observação (DayOfYear), não a data de início do composto.
     - MCD43A4: mantém −0,2 < EVI < 1; data = meio da janela de 8 dias.
  3. Resume a disponibilidade de dados (observações válidas por mês).
  4. Calcula, para o período comum 2018/19–2024/25 (jul/2018–jun/2025):
     climatologia mensal por ponto, mês de pico, concordância entre sensores,
     nível médio, correlação e amplitude sazonal.

SAÍDAS (em outputs/)
  qc_hls_obs_wet_season_v0.1.csv     % de meses chuvosos sem observação HLS, por faixa e período
  qc_mod13q1_qa_by_month_v0.1.csv    % de compostos com QA 0 e QA ≤ 1, por faixa e mês
  qc_mcd43a4_full_by_month_v0.1.csv  % de janelas com ≥ 1 dia de inversão completa, por faixa e mês
  clim_evi_by_band_month_v0.1.csv    EVI mediano por sensor × faixa × mês (2018/19–2024/25)
  peak_month_dist_v0.1.csv           distribuição do mês de pico por sensor × faixa
  sensor_agreement_v0.1.csv          concordância do mês de pico, correlação, nível e amplitude

COMO RODAR
  python python/05_qc_series.py           (a partir da raiz do repositório)
  Requer: pandas, numpy (versões em env/requirements.txt)
"""

from pathlib import Path
import glob

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Parâmetros
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "series"
OUT = ROOT / "outputs"
TAG = "v0.1"

PERIOD_START = pd.Timestamp("2018-07-01")   # início do período comum (ano hidrológico 2018/19)
PERIOD_END = pd.Timestamp("2025-07-01")     # fim exclusivo (último ano 2024/25)
WET_MONTHS = [11, 12, 1, 2, 3]


def read_all(pattern):
    """Lê e concatena todos os CSVs que casam com o padrão; para se não achar nenhum."""
    files = sorted(glob.glob(str(DATA / pattern)))
    if not files:
        raise FileNotFoundError(f"Nenhum arquivo {pattern} em {DATA}")
    df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)
    df["date"] = pd.to_datetime(df["date"])
    return df


# ---------------------------------------------------------------------------
# 1–2. Leitura e limpeza
# ---------------------------------------------------------------------------
def clean_hls(h):
    # Reflectâncias negativas são artefato de correção atmosférica: fora
    h = h[(h[["blue", "red", "nir"]] >= 0).all(axis=1)]
    # Mesma passagem aparece em 2+ tiles sobrepostos com valores quase iguais
    h = h.groupby(["point_id", "lat_band", "date"], as_index=False)[["blue", "red", "nir"]].median()
    h["EVI"] = 2.5 * (h.nir - h.red) / (h.nir + 6 * h.red - 7.5 * h.blue + 1)
    # EVI fora de (0, 1) = nuvem residual, sombra ou erro
    h = h[(h.EVI > 0) & (h.EVI < 1)]
    return h.rename(columns={"date": "d"})[["point_id", "lat_band", "d", "EVI"]]


def clean_mod13q1(m):
    m = m[m.SummaryQA <= 1].copy()
    m["EVI"] = m.EVI * 1e-4
    # Data real = 1º de janeiro do ano + DayOfYear − 1. Compostos que começam em
    # dezembro podem ter observação em janeiro do ano seguinte (DOY menor que o
    # DOY da data de início).
    yr = m.date.dt.year
    nxt = m.DayOfYear < m.date.dt.dayofyear
    base = pd.to_datetime((yr + nxt.astype(int)).astype(str) + "-01-01")
    m["d"] = base + pd.to_timedelta(m.DayOfYear - 1, unit="D")
    return m[["point_id", "lat_band", "d", "EVI"]]


def clean_mcd43a4(n):
    n = n[(n.EVI_median > -0.2) & (n.EVI_median < 1)].copy()
    n["d"] = n.date + pd.Timedelta(days=4)     # meio da janela de 8 dias
    return n.rename(columns={"EVI_median": "EVI"})[["point_id", "lat_band", "d", "EVI"]]


# ---------------------------------------------------------------------------
# 3. Disponibilidade de dados
# ---------------------------------------------------------------------------
def hls_wet_season_gaps(h):
    """% de ponto-mês chuvoso (nov–mar) sem nenhuma observação HLS válida."""
    h = h.copy()
    h["ym"] = h.d.dt.to_period("M")
    rows = []
    months = pd.period_range("2016-01", "2025-12", freq="M")
    for band, g in h.groupby("lat_band"):
        idx = pd.MultiIndex.from_product([g.point_id.unique(), months], names=["point_id", "ym"])
        cnt = g.groupby(["point_id", "ym"]).size().reindex(idx, fill_value=0).reset_index(name="n")
        cnt["m"], cnt["y"] = cnt.ym.dt.month, cnt.ym.dt.year
        wet = cnt[cnt.m.isin(WET_MONTHS)]
        for label, (a, z) in {"2016-2017": (2016, 2017), "2018-2020": (2018, 2020), "2021-2025": (2021, 2025)}.items():
            w = wet[(wet.y >= a) & (wet.y <= z)]
            rows.append({"lat_band": band, "period": label,
                         "pct_wet_months_no_obs": round((w.n == 0).mean() * 100, 1),
                         "mean_obs_per_wet_month": round(w.n.mean(), 2)})
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# 4. Climatologia e comparação entre sensores
# ---------------------------------------------------------------------------
def monthly_climatology(df):
    d = df[(df.d >= PERIOD_START) & (df.d < PERIOD_END)].copy()
    d["month"] = d.d.dt.month
    return d.groupby(["point_id", "lat_band", "month"]).EVI.median().reset_index()


def circular_month_diff(a, b):
    diff = (a - b).abs()
    return np.minimum(diff, 12 - diff)


def main():
    OUT.mkdir(exist_ok=True)

    h_raw = read_all("series_HLS_*.csv")
    m_raw = read_all("series_MOD13Q1_*.csv")
    n_raw = read_all("series_MCD43A4_*.csv")

    # QC de qualidade antes da limpeza
    m_raw["month"] = m_raw.date.dt.month
    qa = m_raw.groupby(["lat_band", "month"]).SummaryQA.agg(
        pct_qa0=lambda s: round((s == 0).mean() * 100, 1),
        pct_qa_le1=lambda s: round((s <= 1).mean() * 100, 1)).reset_index()
    qa.to_csv(OUT / f"qc_mod13q1_qa_by_month_{TAG}.csv", index=False)

    n_raw["month"] = n_raw.date.dt.month
    full = n_raw.groupby(["lat_band", "month"]).n_full.agg(
        pct_windows_with_full=lambda s: round((s > 0).mean() * 100, 1)).reset_index()
    full.to_csv(OUT / f"qc_mcd43a4_full_by_month_{TAG}.csv", index=False)

    series = {"HLS": clean_hls(h_raw), "MOD13Q1": clean_mod13q1(m_raw), "MCD43A4": clean_mcd43a4(n_raw)}
    hls_wet_season_gaps(series["HLS"]).to_csv(OUT / f"qc_hls_obs_wet_season_{TAG}.csv", index=False)

    clim = {k: monthly_climatology(v) for k, v in series.items()}

    # EVI mediano por sensor × faixa × mês
    pd.concat([c.groupby(["lat_band", "month"]).EVI.median().rename("EVI_median").reset_index().assign(sensor=k)
               for k, c in clim.items()]).to_csv(OUT / f"clim_evi_by_band_month_{TAG}.csv", index=False)

    # Mês de pico por ponto (máximo da climatologia mensal)
    peaks = {k: c.loc[c.groupby("point_id").EVI.idxmax()].set_index("point_id")[["lat_band", "month"]]
             for k, c in clim.items()}
    dist = pd.concat([p.groupby("lat_band").month.value_counts(normalize=True).mul(100).round(1)
                      .rename("pct_points").reset_index().assign(sensor=k) for k, p in peaks.items()])
    dist.to_csv(OUT / f"peak_month_dist_{TAG}.csv", index=False)

    # Concordância entre sensores
    level = pd.concat([c.set_index(["point_id", "month"]).EVI.rename(k) for k, c in clim.items()], axis=1).dropna()
    corr = level.corr()
    amp = {k: c.groupby("point_id").EVI.agg(lambda s: s.max() - s.min()).median() for k, c in clim.items()}
    rows = []
    for x, y in [("HLS", "MOD13Q1"), ("HLS", "MCD43A4"), ("MOD13Q1", "MCD43A4")]:
        j = pd.concat([peaks[x].month, peaks[y].month], axis=1, keys=[x, y]).dropna()
        dd = circular_month_diff(j[x], j[y])
        rows.append({"pair": f"{x} vs {y}", "n_points": len(j),
                     "pct_same_peak_month": round((dd == 0).mean() * 100, 1),
                     "pct_within_1_month": round((dd <= 1).mean() * 100, 1),
                     "corr_monthly_clim": round(corr.loc[x, y], 3),
                     f"mean_evi_{x}": round(level[x].mean(), 3), f"mean_evi_{y}": round(level[y].mean(), 3),
                     f"median_amplitude_{x}": round(amp[x], 3), f"median_amplitude_{y}": round(amp[y], 3)})
    pd.DataFrame(rows).to_csv(OUT / f"sensor_agreement_{TAG}.csv", index=False)
    print("QC concluído; saídas em", OUT)


if __name__ == "__main__":
    main()
