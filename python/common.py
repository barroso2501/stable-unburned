"""
common.py — leitura e limpeza das séries da etapa 05 (usado por 05_qc_series.py e 06_metricas.py)

Regras de limpeza (decisões D19–D22, ver KB):
  - HLS: remove reflectâncias negativas; opcionalmente remove aerossol alto (Fmask
    bits 6–7 = 11); junta duplicatas de tiles sobrepostos pela mediana; EVI; 0 < EVI < 1.
  - MOD13Q1: EVI ×0,0001; SummaryQA ≤ 1; data real da observação (DayOfYear);
    exclui pontos com pureza < 80% no pixel de 232 m (D21).
  - MCD43A4: −0,2 < EVI < 1; data = meio da janela de 8 dias.
Todas as funções devolvem colunas: point_id, lat_band, d (data), EVI.
"""

from pathlib import Path
import glob

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "series"
OUT = ROOT / "outputs"
SAMPLE_CSV = OUT / "pilot_4A_sample_v0.1.csv"
MOD13Q1_MIN_PURITY_232 = 80   # D21


def read_all(pattern):
    """Lê e concatena todos os CSVs que casam com o padrão; para se não achar nenhum."""
    files = sorted(glob.glob(str(DATA / pattern)))
    if not files:
        raise FileNotFoundError(f"Nenhum arquivo {pattern} em {DATA}")
    df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)
    df["date"] = pd.to_datetime(df["date"])
    return df


def clean_hls(h, drop_high_aerosol=False):
    h = h[(h[["blue", "red", "nir"]] >= 0).all(axis=1)]
    if drop_high_aerosol:
        # Fmask bits 6–7: 00 clima, 01 baixo, 10 moderado, 11 alto
        aer = (h.Fmask.astype("int64").to_numpy() // 64) % 4   # bits 6–7
        h = h[aer != 3]
    h = h.groupby(["point_id", "lat_band", "date"], as_index=False)[["blue", "red", "nir"]].median()
    h["EVI"] = 2.5 * (h.nir - h.red) / (h.nir + 6 * h.red - 7.5 * h.blue + 1)
    h = h[(h.EVI > 0) & (h.EVI < 1)]
    return h.rename(columns={"date": "d"})[["point_id", "lat_band", "d", "EVI"]]


def clean_mod13q1(m, apply_purity_filter=True):
    m = m[m.SummaryQA <= 1].copy()
    m["EVI"] = m.EVI * 1e-4
    yr = m.date.dt.year
    nxt = m.DayOfYear < m.date.dt.dayofyear          # composto de dez com obs. em jan
    base = pd.to_datetime((yr + nxt.astype(int)).astype(str) + "-01-01")
    m["d"] = base + pd.to_timedelta(m.DayOfYear - 1, unit="D")
    m = m[["point_id", "lat_band", "d", "EVI"]]
    if apply_purity_filter:
        s = pd.read_csv(SAMPLE_CSV)
        keep = set(s.loc[s.purity_232m >= MOD13Q1_MIN_PURITY_232, "point_id"])
        m = m[m.point_id.isin(keep)]
    return m


def clean_mcd43a4(n):
    n = n[(n.EVI_median > -0.2) & (n.EVI_median < 1)].copy()
    n["d"] = n.date + pd.Timedelta(days=4)
    return n.rename(columns={"EVI_median": "EVI"})[["point_id", "lat_band", "d", "EVI"]]
