"""
06_metricas.py — métricas de forma da curva sazonal por ponto e ano hidrológico
Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado (decisões D16, D17, D19–D22)

O QUE FAZ
  Para cada sensor, ponto e ano hidrológico (1º jul – 30 jun):
  1. Agrega as observações limpas em janelas de 8 dias (mediana), numa grade fixa
     que começa em 2000-07-01 (igual para todos os sensores).
  2. Interpola linearmente lacunas de até MAX_GAP_BINS janelas e suaviza com
     Savitzky–Golay (janela SG_WINDOW, ordem SG_ORDER) em cada trecho contínuo.
  3. Interpola a curva suavizada para passo diário e, dentro do ano hidrológico,
     extrai as métricas:
       peak_day        dia do pico, contado a partir de 1º de julho (0 = 1º jul)
       peak_evi        EVI no pico
       base_pre        mínimo antes do pico (seca anterior)
       amplitude       peak_evi − base_pre
       sos20, sos50    1º dia, após o mínimo, em que a curva passa 20% / 50% da amplitude
       eos50, eos20    último dia, após o pico, acima de 50% / 20% da amplitude de descida
       rise_days       peak_day − sos50 ; fall_days = eos50 − peak_day
       asymmetry       rise_days / fall_days (< 1: sobe rápido e desce devagar)
       integral        soma diária de (EVI − base_pre) entre sos20 e eos20
       shoulder        1 se a taxa de subida tem dois máximos separados por uma queda
                       para < 50% do menor deles (ombro na subida); shoulder_day = 1º máximo
       n_obs, max_gap  nº de observações brutas e maior lacuna (dias) no ano
       valid           1 se max_gap ≤ MAX_GAP_DAYS, n_obs ≥ MIN_OBS e pico não está na borda
  Sensores: MCD43A4 (principal, 2000/01–2024/25), MOD13Q1 (checagem, sem os 49 pontos
  de baixa pureza), HLS (2018/19–2024/25) em duas versões: com e sem aerossol alto (D20).

SAÍDAS (outputs/)
  metrics_point_year_v0.1.csv       uma linha por sensor × ponto × ano hidrológico
  metrics_summary_band_v0.1.csv     medianas e quartis por sensor × faixa (só anos válidos)
  metrics_sensor_diff_v0.1.csv      diferenças entre sensores nos mesmos ponto-anos (2018/19–2024/25)
  metrics_interannual_v0.1.csv      variabilidade interanual do pico por ponto (MCD43A4)

COMO RODAR
  python python/06_metricas.py   (séries em data/series/; ~2–5 min)
"""

import numpy as np
import pandas as pd
from scipy.signal import savgol_filter, find_peaks

from common import OUT, read_all, clean_hls, clean_mod13q1, clean_mcd43a4

TAG = "v0.1"

# ---------------------------------------------------------------------------
# Parâmetros (mudanças aqui devem ir para docs/execucoes.md)
# ---------------------------------------------------------------------------
GRID_ORIGIN = pd.Timestamp("2000-07-01")
BIN_DAYS = 8
MAX_GAP_BINS = 8          # interpola lacunas de até 8 janelas (64 dias)
SG_WINDOW = 7             # 7 janelas = 56 dias
SG_ORDER = 2
MAX_GAP_DAYS = 64         # ano inválido se houver lacuna maior que isso
MIN_OBS = {"MCD43A4": 30, "MOD13Q1": 15, "HLS": 15, "HLS_noaer": 15}
EDGE_DAYS = 15            # pico a menos de 15 dias da borda do ano → inválido
HYDRO_YEARS = {"MCD43A4": range(2000, 2025), "MOD13Q1": range(2000, 2025),
               "HLS": range(2018, 2025), "HLS_noaer": range(2018, 2025)}
COMMON_YEARS = range(2018, 2025)


def smooth_point(df):
    """Série de um ponto → curva diária suavizada (pd.Series indexada por data)."""
    s = df.set_index("d").EVI.sort_index()
    # Grade fixa de 8 dias a partir de GRID_ORIGIN (feita à mão: o 'origin' do
    # resample não vale para frequência em dias nesta versão do pandas)
    k = (s.index - GRID_ORIGIN).days // BIN_DAYS
    bins = s.groupby(k).median()
    bins.index = GRID_ORIGIN + pd.to_timedelta(bins.index * BIN_DAYS, unit="D")
    bins = bins[bins.index >= GRID_ORIGIN]
    full = pd.date_range(GRID_ORIGIN, bins.index.max(), freq=f"{BIN_DAYS}D")
    b = bins.reindex(full)
    b = b.interpolate(limit=MAX_GAP_BINS, limit_area="inside")
    out = pd.Series(np.nan, index=b.index)
    # suaviza cada trecho contínuo com pelo menos SG_WINDOW janelas
    valid = b.notna().values
    starts = np.flatnonzero(valid & ~np.r_[False, valid[:-1]])
    ends = np.flatnonzero(valid & ~np.r_[valid[1:], False])
    for a, z in zip(starts, ends):
        if z - a + 1 >= SG_WINDOW:
            out.iloc[a:z + 1] = savgol_filter(b.iloc[a:z + 1].values, SG_WINDOW, SG_ORDER)
    # passo diário (centro da janela de 8 dias)
    out.index = out.index + pd.Timedelta(days=BIN_DAYS // 2)
    daily = out.resample("D").interpolate(limit=BIN_DAYS, limit_area="inside")
    return daily


def year_metrics(daily, raw_dates, y):
    """Métricas de um ano hidrológico y (1º jul y – 30 jun y+1)."""
    a, z = pd.Timestamp(f"{y}-07-01"), pd.Timestamp(f"{y + 1}-07-01")
    c = daily[(daily.index >= a) & (daily.index < z)]
    obs = raw_dates[(raw_dates >= a) & (raw_dates < z)]
    n_obs = len(obs)
    # lacunas em dias entre 1º jul, as observações e 30 jun (independe da resolução de datetime)
    days = np.r_[0, np.sort(np.asarray((obs - a).days)), (z - a).days]
    gaps = np.diff(days)
    max_gap = float(gaps.max()) if len(gaps) else 365.0
    row = {"hydro_year": f"{y}/{str(y + 1)[2:]}", "hy": y, "n_obs": n_obs, "max_gap": round(max_gap, 1)}
    if c.notna().sum() < 300:
        return {**row, "valid": 0}
    v = c.values
    day = np.arange(len(v))
    ok = ~np.isnan(v)
    ip = int(np.nanargmax(v))
    peak = v[ip]
    pre = v[:ip + 1]
    if np.all(np.isnan(pre)):
        return {**row, "valid": 0}
    ib = int(np.nanargmin(pre))
    base = pre[ib]
    amp = peak - base
    post = v[ip:]
    base_post = np.nanmin(post)
    amp_post = peak - base_post

    def first_cross(frac):
        thr = base + frac * amp
        idx = np.flatnonzero((day >= ib) & (day <= ip) & ok & (v >= thr))
        return int(idx[0]) if len(idx) else np.nan

    def last_cross(frac):
        thr = base_post + frac * amp_post
        idx = np.flatnonzero((day >= ip) & ok & (v >= thr))
        return int(idx[-1]) if len(idx) else np.nan

    sos20, sos50, eos50, eos20 = first_cross(0.2), first_cross(0.5), last_cross(0.5), last_cross(0.2)
    rise = ip - sos50 if not np.isnan(sos50) else np.nan
    fall = eos50 - ip if not np.isnan(eos50) else np.nan
    asym = rise / fall if (fall and not np.isnan(fall) and fall > 0) else np.nan
    if not (np.isnan(sos20) or np.isnan(eos20)):
        seg = v[int(sos20):int(eos20) + 1]
        integral = float(np.nansum(seg - base))
    else:
        integral = np.nan

    # Ombro: dois máximos na taxa de subida entre o mínimo e o pico
    shoulder, shoulder_day = 0, np.nan
    if ip - ib >= 30:
        rate = np.gradient(v[ib:ip + 1])
        if not np.any(np.isnan(rate)) and rate.max() > 0:
            pk, _ = find_peaks(rate, prominence=0.15 * rate.max(), distance=16)
            if len(pk) >= 2:
                r1, r2 = pk[0], pk[1]
                dip = rate[r1:r2 + 1].min()
                if dip < 0.5 * min(rate[r1], rate[r2]):
                    shoulder, shoulder_day = 1, ib + int(r1)

    valid = int(max_gap <= MAX_GAP_DAYS and EDGE_DAYS <= ip <= len(v) - EDGE_DAYS and amp > 0.02)
    return {**row, "peak_day": ip, "peak_evi": round(peak, 4), "base_pre": round(base, 4),
            "amplitude": round(amp, 4), "sos20": sos20, "sos50": sos50, "eos50": eos50, "eos20": eos20,
            "rise_days": rise, "fall_days": fall, "asymmetry": None if np.isnan(asym) else round(asym, 3),
            "integral": None if np.isnan(integral) else round(integral, 2),
            "shoulder": shoulder, "shoulder_day": shoulder_day, "valid": valid}


def metrics_for_sensor(series, sensor):
    rows = []
    for (pid, band), g in series.groupby(["point_id", "lat_band"]):
        daily = smooth_point(g)
        dates = pd.DatetimeIndex(g.d)
        for y in HYDRO_YEARS[sensor]:
            m = year_metrics(daily, dates, y)
            m["valid"] = int(m.get("valid", 0) and m["n_obs"] >= MIN_OBS[sensor])
            rows.append({"sensor": sensor, "point_id": pid, "lat_band": band, **m})
    return pd.DataFrame(rows)


def main():
    OUT.mkdir(exist_ok=True)
    h_raw = read_all("series_HLS_*.csv")
    series = {
        "MCD43A4": clean_mcd43a4(read_all("series_MCD43A4_*.csv")),
        "MOD13Q1": clean_mod13q1(read_all("series_MOD13Q1_*.csv")),
        "HLS": clean_hls(h_raw),
        "HLS_noaer": clean_hls(h_raw, drop_high_aerosol=True),
    }
    met = pd.concat([metrics_for_sensor(s, k) for k, s in series.items()], ignore_index=True)
    met.to_csv(OUT / f"metrics_point_year_{TAG}.csv", index=False)

    # Resumo por sensor × faixa (anos válidos)
    v = met[met.valid == 1]
    cols = ["peak_day", "peak_evi", "amplitude", "sos20", "sos50", "eos50", "rise_days",
            "fall_days", "asymmetry", "integral"]
    q = v.groupby(["sensor", "lat_band"])[cols].quantile([0.25, 0.5, 0.75]).unstack()
    q.columns = [f"{c}_p{int(p * 100)}" for c, p in q.columns]
    extra = v.groupby(["sensor", "lat_band"]).agg(n_point_years=("valid", "size"),
                                                  pct_shoulder=("shoulder", lambda s: round(s.mean() * 100, 1)))
    share = met.groupby(["sensor", "lat_band"]).valid.mean().mul(100).round(1).rename("pct_valid")
    pd.concat([extra, share, q.round(3)], axis=1).reset_index().to_csv(
        OUT / f"metrics_summary_band_{TAG}.csv", index=False)

    # Diferenças entre sensores nos mesmos ponto-anos válidos (2018/19–2024/25)
    key = ["point_id", "hy"]
    base = met[(met.sensor == "MCD43A4") & met.hy.isin(COMMON_YEARS) & (met.valid == 1)].set_index(key)
    rows = []
    for other in ["MOD13Q1", "HLS", "HLS_noaer"]:
        o = met[(met.sensor == other) & met.hy.isin(COMMON_YEARS) & (met.valid == 1)].set_index(key)
        j = base.join(o, how="inner", lsuffix="_ref", rsuffix="_oth")
        for metric in ["peak_day", "sos20", "sos50", "eos50", "amplitude", "peak_evi"]:
            dd = j[f"{metric}_oth"] - j[f"{metric}_ref"]
            for band, ddb in dd.groupby(j.lat_band_ref):
                rows.append({"pair": f"{other} − MCD43A4", "metric": metric, "lat_band": band,
                             "n": int(ddb.notna().sum()), "median_diff": round(ddb.median(), 3),
                             "mad": round((ddb - ddb.median()).abs().median(), 3),
                             "pct_within_16d": round((ddb.abs() <= 16).mean() * 100, 1)
                             if metric in ("peak_day", "sos20", "sos50", "eos50") else None})
    # HLS com × sem aerossol alto (sensibilidade D20)
    hl = met[(met.sensor == "HLS") & (met.valid == 1)].set_index(key)
    hn = met[(met.sensor == "HLS_noaer") & (met.valid == 1)].set_index(key)
    j = hl.join(hn, how="inner", lsuffix="_all", rsuffix="_noaer")
    for metric in ["peak_day", "sos20", "sos50", "amplitude"]:
        dd = j[f"{metric}_noaer"] - j[f"{metric}_all"]
        rows.append({"pair": "HLS_noaer − HLS", "metric": metric, "lat_band": "all", "n": int(dd.notna().sum()),
                     "median_diff": round(dd.median(), 3), "mad": round((dd - dd.median()).abs().median(), 3),
                     "pct_within_16d": round((dd.abs() <= 16).mean() * 100, 1) if metric != "amplitude" else None})
    pd.DataFrame(rows).to_csv(OUT / f"metrics_sensor_diff_{TAG}.csv", index=False)

    # Variabilidade interanual do pico (MCD43A4, ≥ 15 anos válidos por ponto)
    mc = met[(met.sensor == "MCD43A4") & (met.valid == 1)]
    ang = 2 * np.pi * mc.peak_day / 365.0
    tmp = mc.assign(c=np.cos(ang), s=np.sin(ang))
    g = tmp.groupby(["point_id", "lat_band"]).agg(n_years=("hy", "size"), c=("c", "mean"), s=("s", "mean"),
                                                  peak_day_median=("peak_day", "median"),
                                                  amp_cv=("amplitude", lambda x: x.std() / x.mean()))
    R = np.sqrt(g.c ** 2 + g.s ** 2)
    g["peak_circ_sd_days"] = (np.sqrt(-2 * np.log(R.clip(1e-9, 1))) * 365 / (2 * np.pi)).round(1)
    g = g[g.n_years >= 15].drop(columns=["c", "s"]).reset_index()
    g.to_csv(OUT / f"metrics_interannual_{TAG}.csv", index=False)
    print("Métricas concluídas:", len(met), "linhas; saídas em", OUT)


if __name__ == "__main__":
    main()
