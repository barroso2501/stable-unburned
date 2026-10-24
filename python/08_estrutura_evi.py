"""
08_estrutura_evi.py — estrutura do dossel (GEDI) × curva sazonal do EVI (pergunta 2)
Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado

PERGUNTA
  Se o EVI de savana mistura um componente lenhoso (mais sempre-verde) e um herbáceo
  (sazonal), então, entre pontos, mais dossel deveria dar:
    (a) EVI mais alto na seca (base_pre),
    (b) amplitude relativa menor (amplitude / pico),
    (c) mais verdor antecipado às chuvas (se a brotação lenhosa for visível no EVI).
  Este script testa (a)–(c) com a cobertura e a altura do GEDI.

O QUE FAZ
  1. Lê os footprints GEDI (etapa 04 v0.2), limpa e marca:
       - estação do footprint: chuvosa se o meio do mês cai entre o onset e o demise medianos
         do ponto (etapa 07); seca caso contrário;
       - noite (elevação solar < 0) e feixe de alta potência (5, 6, 8, 11).
  2. Agrega por ponto: n de footprints, mediana de cover, PAI, FHD (L2B) e rh98, rh50 (L2A),
     para três subconjuntos: todos; só estação chuvosa; só noite + alta potência.
  3. Checa o efeito da estação: cover na seca − cover na chuva, pareado por ponto.
  4. Agrega a curva do EVI por ponto (MCD43A4, anos válidos, mediana entre anos):
     base_pre, peak_evi, amplitude, amplitude relativa, sos50; e a fração de anos com
     verdor > 16 d antes das primeiras 25 mm de chuva (etapa 07b, nos dois sensores).
  5. Correlação de Spearman estrutura × EVI, por faixa e no conjunto das faixas 2–4 com
     postos dentro da faixa (remove o gradiente norte–sul). Intervalo de 95% por bootstrap
     em blocos de 0,5° (os pontos são agrupados no espaço; reamostrar ponto a ponto daria
     intervalo estreito demais).
  6. Medianas das métricas de EVI por tercil de cobertura (dentro da faixa).

ENTRADAS
  data/series/gedi_l2a_band*_v0*2.csv, gedi_l2b_band*_v0*2.csv
  outputs/metrics_point_year_v0.1.csv, rain_onset_point_year_v0.1.csv, rain_early_greenup_points_v0.1.csv
SAÍDAS (outputs/)
  gedi_point_v0.1.csv               estrutura por ponto (3 subconjuntos)
  gedi_qc_v0.1.csv                  footprints e pontos por faixa; efeito da estação
  structure_evi_point_v0.1.csv      estrutura + EVI por ponto (base da análise)
  structure_evi_spearman_v0.1.csv   correlações e IC por faixa / conjunto
  structure_evi_tercile_v0.1.csv    medianas de EVI por tercil de cobertura
"""

import glob

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from common import DATA, OUT

TAG = "v0.1"
MIN_FP = 3                    # footprints mínimos por ponto para entrar na análise
POWER_BEAMS = {5, 6, 8, 11}
RH98_MAX = 40.0               # m; acima disso é erro (savana)
BLOCK_DEG = 0.5               # bloco do bootstrap espacial
N_BOOT = 1000
RNG = np.random.default_rng(42)
SENSOR = "MCD43A4"


def read(kind):
    files = sorted(glob.glob(str(DATA / f"gedi_{kind}_band*_v0*2.csv")))
    if not files:
        raise FileNotFoundError(f"Nenhum gedi_{kind}_band*_v0*2.csv em {DATA}")
    d = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)
    d["night"] = (d.solar_elevation < 0).astype(int)
    d["power"] = d.beam.isin(POWER_BEAMS).astype(int)
    return d


def tag_season(d, rain):
    """Marca o footprint como chuvoso (1) se o dia 15 do mês cai entre onset e demise medianos do ponto."""
    mid = pd.to_datetime(d.month + "-15")
    hy = np.where(mid.dt.month >= 7, mid.dt.year, mid.dt.year - 1)
    start = pd.to_datetime(pd.DataFrame({"year": hy, "month": 7, "day": 1}, index=d.index))
    doy = (mid - start).dt.days          # dias desde 1º jul, como onset/demise
    clim = rain.groupby("point_id")[["onset", "demise"]].median()
    on = d.point_id.map(clim.onset)
    de = d.point_id.map(clim.demise)
    d["wet"] = np.where(on.notna(), ((doy >= on) & (doy <= de)).astype(float), np.nan)
    return d


def agg_points(d, cols, label):
    g = d.groupby(["point_id", "lat_band"])
    out = g[cols].median().add_suffix(f"_{label}")
    out[f"n_{label}"] = g.size()
    return out


def block_boot_rho(x, y, lon, lat):
    """Spearman com IC de 95% por bootstrap em blocos espaciais."""
    ok = x.notna() & y.notna()
    x, y, lon, lat = x[ok].to_numpy(), y[ok].to_numpy(), lon[ok].to_numpy(), lat[ok].to_numpy()
    if len(x) < 10:
        return np.nan, np.nan, np.nan, len(x), 0
    rho = spearmanr(x, y).statistic
    blk = (np.floor(lon / BLOCK_DEG)).astype(int) * 10000 + np.floor(lat / BLOCK_DEG).astype(int)
    ub = np.unique(blk)
    idx = {b: np.flatnonzero(blk == b) for b in ub}
    bs = []
    for _ in range(N_BOOT):
        take = np.concatenate([idx[b] for b in RNG.choice(ub, len(ub), replace=True)])
        if len(np.unique(x[take])) > 2:
            bs.append(spearmanr(x[take], y[take]).statistic)
    lo, hi = np.nanpercentile(bs, [2.5, 97.5])
    return rho, lo, hi, len(x), len(ub)


def main():
    rain = pd.read_csv(OUT / "rain_onset_point_year_v0.1.csv")
    b = tag_season(read("l2b"), rain)
    a = tag_season(read("l2a"), rain)
    a = a[(a.rh98 > 0) & (a.rh98 <= RH98_MAX)]

    # ---- 1. QC e efeito da estação ----
    qc = []
    for kind, d in (("l2b", b), ("l2a", a)):
        for band, g in d.groupby("lat_band"):
            per = g.groupby("point_id").size()
            qc.append({"product": kind, "lat_band": band, "footprints": len(g), "points": len(per),
                       "fp_per_point_p50": per.median(), "pct_points_ge_MIN_FP": round((per >= MIN_FP).mean() * 100, 1),
                       "pct_wet": round(g.wet.mean() * 100, 1), "pct_night": round(g.night.mean() * 100, 1),
                       "pct_power": round(g.power.mean() * 100, 1)})
    qc = pd.DataFrame(qc)
    # cover seca − chuva no mesmo ponto (só pontos com ≥ 2 footprints em cada estação)
    s = b.dropna(subset=["wet"]).groupby(["lat_band", "point_id", "wet"]).cover.agg(["median", "size"]).unstack("wet")
    s = s[(s[("size", 0.0)] >= 2) & (s[("size", 1.0)] >= 2)]
    s["dry_minus_wet"] = s[("median", 0.0)] - s[("median", 1.0)]
    sea = s.groupby(level="lat_band").dry_minus_wet.agg(n_points_season="size", cover_dry_minus_wet_p50="median",
                                                         pct_dry_lower=lambda v: round((v < 0).mean() * 100, 1))
    qc = qc.merge(sea.reset_index(), on="lat_band", how="left")
    qc.loc[qc["product"] != "l2b", ["n_points_season", "cover_dry_minus_wet_p50", "pct_dry_lower"]] = np.nan
    qc.round(3).to_csv(OUT / f"gedi_qc_{TAG}.csv", index=False)

    # ---- 2. estrutura por ponto ----
    sets = {"all": lambda d: d, "wet": lambda d: d[d.wet == 1], "nightpow": lambda d: d[(d.night == 1) & (d.power == 1)]}
    parts = []
    for lab, f in sets.items():
        parts.append(agg_points(f(b), ["cover", "pai", "fhd_normal"], lab))
        parts.append(agg_points(f(a), ["rh98", "rh50"], lab).rename(columns={f"n_{lab}": f"nA_{lab}"}))
    gp = pd.concat(parts, axis=1).reset_index()
    gp.to_csv(OUT / f"gedi_point_{TAG}.csv", index=False)

    # ---- 3. EVI por ponto ----
    m = pd.read_csv(OUT / "metrics_point_year_v0.1.csv")
    m = m[(m.sensor == SENSOR) & (m.valid == 1)].copy()
    m["rel_amp"] = m.amplitude / m.peak_evi
    ev = m.groupby(["point_id", "lat_band"])[["base_pre", "peak_evi", "amplitude", "rel_amp", "sos50"]].median()
    ev["n_years"] = m.groupby(["point_id", "lat_band"]).size()
    early = pd.read_csv(OUT / "rain_early_greenup_points_v0.1.csv").set_index(["point_id", "lat_band"])
    ev["early_frac"] = early.frac_both
    ev = ev.reset_index()

    smp = pd.read_csv(OUT / "pilot_4A_sample_v0.1.csv", usecols=["point_id", "lon", "lat"])
    df = gp.merge(ev, on=["point_id", "lat_band"], how="inner").merge(smp, on="point_id")
    df.to_csv(OUT / f"structure_evi_point_{TAG}.csv", index=False)

    # ---- 4. correlações ----
    pairs = [(sx, e) for sx in ("cover", "rh98", "pai", "fhd_normal")
             for e in ("base_pre", "rel_amp", "amplitude", "peak_evi", "sos50", "early_frac")]
    rows = []
    for subset in ("all", "wet", "nightpow"):
        nfp = df[f"n_{subset}"].fillna(0)
        nfa = df[f"nA_{subset}"].fillna(0)
        for sx, e in pairs:
            col = f"{sx}_{subset}"
            keep = (nfa if sx.startswith("rh") else nfp) >= MIN_FP
            d = df[keep]
            for band, g in list(d.groupby("lat_band")) + [("2-4 (postos na faixa)", d[d.lat_band.isin([2, 3, 4])])]:
                if isinstance(band, str):
                    x = g.groupby("lat_band")[col].rank(pct=True)
                    y = g.groupby("lat_band")[e].rank(pct=True)
                else:
                    x, y = g[col], g[e]
                rho, lo, hi, n, nb = block_boot_rho(x, y, g.lon, g.lat)
                rows.append({"subset": subset, "structure": sx, "evi_metric": e, "lat_band": band,
                             "n_points": n, "n_blocks": nb, "rho": rho, "ci_lo": lo, "ci_hi": hi})
    pd.DataFrame(rows).round(3).to_csv(OUT / f"structure_evi_spearman_{TAG}.csv", index=False)

    # ---- 5. tercis de cobertura dentro da faixa (subconjunto 'all') ----
    d = df[df.n_all >= MIN_FP].copy()
    d["cover_tercile"] = d.groupby("lat_band").cover_all.transform(
        lambda v: pd.qcut(v.rank(method="first"), 3, labels=["T1 baixo", "T2", "T3 alto"]))
    t = d.groupby(["lat_band", "cover_tercile"], observed=True).agg(
        n=("point_id", "size"), cover=("cover_all", "median"), rh98=("rh98_all", "median"),
        base_pre=("base_pre", "median"), peak_evi=("peak_evi", "median"), amplitude=("amplitude", "median"),
        rel_amp=("rel_amp", "median"), sos50=("sos50", "median"), early_frac=("early_frac", "mean"))
    t.round(3).reset_index().to_csv(OUT / f"structure_evi_tercile_{TAG}.csv", index=False)
    print("Etapa 08 concluída; saídas em", OUT)


if __name__ == "__main__":
    main()
