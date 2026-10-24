"""
07_chuva_verdor.py — início/fim da estação chuvosa (CHIRPS) e defasagem em relação ao verdor
Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado (pergunta 2; D17)

O QUE FAZ
  1. Lê as pêntadas CHIRPS da etapa 05b (data/series/chirps_pentad_band*_v0*2.csv; o Drive
     pode gravar "v0.2" como "v02", o padrão aceita os dois)
     e converte em chuva diária média de cada pêntada (mm/dia).
  2. Para cada ponto e ano hidrológico (1º jul – 30 jun), calcula o início e o fim
     da estação chuvosa pelo método de acumulação anômala (Liebmann & Marengo 2001):
        A(t) = Σ [R(d) − R̄]  desde 1º de julho,
     onde R̄ é a chuva média diária do ponto em 2000/01–2024/25.
     Início (onset) = dia do mínimo de A; fim (demise) = dia do máximo de A após o início.
     A referência deve ser conferida antes de citar.
  3. Junta com as métricas da etapa 06 (outputs/metrics_point_year_v0.1.csv) e calcula,
     por sensor, ponto e ano:
        lag_sos20 = sos20 − onset   (dias; negativo = verdor começa ANTES das chuvas)
        lag_sos50 = sos50 − onset
        lag_eos50 = eos50 − demise
        pre_rain_greenup = 1 se sos20 < onset
  4. Resume por sensor × faixa.

SAÍDAS (outputs/)
  rain_onset_point_year_v0.1.csv    onset, demise, duração e total da estação por ponto × ano
  rain_greenup_lag_v0.1.csv         métricas da etapa 06 + onset/demise + defasagens
  rain_greenup_summary_v0.1.csv     medianas e quartis das defasagens; % de verdor antes da chuva

COMO RODAR
  python python/07_chuva_verdor.py   (depois de 06_metricas.py)

LIMITAÇÕES CONHECIDAS
  - CHIRPS tem ~5,5 km: pontos vizinhos compartilham a mesma série de chuva.
  - Resolução de pêntada: datas de onset/demise têm incerteza de ~±3 dias.
  - Se o ano não tiver estação definida (A sem mínimo interno), onset fica vazio.
"""

import glob

import numpy as np
import pandas as pd

from common import DATA, OUT

TAG = "v0.1"
CLIM_YEARS = range(2000, 2025)   # anos hidrológicos usados para R̄
METRICS_CSV = OUT / "metrics_point_year_v0.1.csv"


def read_chirps():
    files = sorted(glob.glob(str(DATA / "chirps_pentad_band*_v0*2.csv")))
    if not files:
        raise FileNotFoundError(f"Nenhum chirps_pentad_band*_v0*2.csv em {DATA}")
    c = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)
    c["date"] = pd.to_datetime(c["date"])
    return c


def pentads_to_daily(g):
    """Pêntadas de um ponto → série diária (cada dia recebe a média diária da sua pêntada)."""
    g = g.sort_values("date")
    starts = g.date.to_numpy()
    # fim de cada pêntada = início da seguinte (a última termina no fim do mês)
    ends = np.r_[starts[1:], (pd.Timestamp(starts[-1]) + pd.offsets.MonthBegin(1)).to_datetime64()]
    lens = (ends - starts).astype("timedelta64[D]").astype(int)
    rate = g.precip_mm.to_numpy() / np.maximum(lens, 1)
    days = np.repeat(starts, lens) + np.concatenate([np.arange(n) for n in lens]).astype("timedelta64[D]")
    return pd.Series(np.repeat(rate, lens), index=pd.DatetimeIndex(days))


def onset_demise(daily, rbar, y):
    a, z = pd.Timestamp(f"{y}-07-01"), pd.Timestamp(f"{y + 1}-07-01")
    r = daily[(daily.index >= a) & (daily.index < z)]
    out = {"hy": y, "hydro_year": f"{y}/{str(y + 1)[2:]}", "onset": np.nan, "demise": np.nan,
           "season_days": np.nan, "season_total_mm": np.nan, "year_total_mm": np.nan}
    if len(r) < 360:
        return out
    acc = np.cumsum(r.to_numpy() - rbar)
    i_on = int(np.argmin(acc))
    # mínimo nas bordas = sem estação definida no ano
    if i_on < 5 or i_on > len(acc) - 30:
        return out
    i_de = i_on + int(np.argmax(acc[i_on:]))
    out.update({"onset": i_on, "demise": i_de, "season_days": i_de - i_on,
                "season_total_mm": round(float(r.iloc[i_on:i_de + 1].sum()), 1),
                "year_total_mm": round(float(r.sum()), 1)})
    return out


def main():
    c = read_chirps()
    rows = []
    for (pid, band), g in c.groupby(["point_id", "lat_band"]):
        daily = pentads_to_daily(g)
        clim = daily[(daily.index >= f"{CLIM_YEARS.start}-07-01") & (daily.index < f"{CLIM_YEARS.stop}-07-01")]
        rbar = clim.mean()
        for y in CLIM_YEARS:
            rows.append({"point_id": pid, "lat_band": band, "rbar_mm_day": round(rbar, 3),
                         **onset_demise(daily, rbar, y)})
    rain = pd.DataFrame(rows)
    rain.to_csv(OUT / f"rain_onset_point_year_{TAG}.csv", index=False)

    met = pd.read_csv(METRICS_CSV)
    j = met.merge(rain[["point_id", "hy", "onset", "demise", "season_days", "season_total_mm"]],
                  on=["point_id", "hy"], how="left")
    j["lag_sos20"] = j.sos20 - j.onset
    j["lag_sos50"] = j.sos50 - j.onset
    j["lag_eos50"] = j.eos50 - j.demise
    j["pre_rain_greenup"] = np.where(j.sos20.notna() & j.onset.notna(), (j.sos20 < j.onset).astype(float), np.nan)
    j.to_csv(OUT / f"rain_greenup_lag_{TAG}.csv", index=False)

    v = j[(j.valid == 1) & j.onset.notna()]
    cols = ["onset", "demise", "lag_sos20", "lag_sos50", "lag_eos50"]
    q = v.groupby(["sensor", "lat_band"])[cols].quantile([0.25, 0.5, 0.75]).unstack()
    q.columns = [f"{a}_p{int(b * 100)}" for a, b in q.columns]
    extra = v.groupby(["sensor", "lat_band"]).agg(
        n_point_years=("point_id", "size"),
        pct_pre_rain_greenup=("pre_rain_greenup", lambda s: round(s.mean() * 100, 1)))
    pd.concat([extra, q.round(1)], axis=1).reset_index().to_csv(OUT / f"rain_greenup_summary_{TAG}.csv", index=False)
    print("Etapa 07 concluída; saídas em", OUT)


if __name__ == "__main__":
    main()
