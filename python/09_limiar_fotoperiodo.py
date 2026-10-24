"""
09_limiar_fotoperiodo.py — gatilho do verdor: limiar de chuva × data fixa (fotoperíodo)
Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado (pergunta 2)

PREMISSAS (Mario, 2026-10-24)
  - Gramíneas respondem quando a chuva acumulada recarrega a camada superficial do solo:
    importa a QUANTIDADE, não só a data de início das chuvas.
  - Parte das lenhosas acessa água profunda e brota pelo fotoperíodo: data mais constante
    entre anos, independente da chuva.

TESTE 1 — limiar de chuva
  Para cada ponto × ano: T_X = dia (desde 1º jul) em que a chuva acumulada atinge X mm,
  X ∈ {25, 50, 75, 100, 150, 200, 300}; e o onset por acumulação anômala (etapa 07).
  Modelos para o início do verdor (sos20 e sos50), avaliados DENTRO do ponto, entre anos:
    M0 data fixa:  sos = média do ponto                      (expectativa do fotoperíodo)
    MX gatilho:    sos = T_X + defasagem média do ponto      (inclinação fixa em 1)
  skill_X = 1 − RMSE(MX) / RMSE(M0). skill > 0: o limiar X prevê melhor que a data fixa.
  Também: correlação r e inclinação livre de sos contra T_X.

TESTE 2 — estabilidade × estrutura
  Por ponto: desvio-padrão entre anos do sos20 e do sos50 e o skill do melhor limiar da faixa.
  Previsão do fotoperíodo: mais dossel → DP menor e skill menor.
  Confusão: mais dossel tem mais amplitude (etapa 08) e amplitude maior reduz o ruído
  na estimativa do sos → DP menor sem nenhuma biologia. Por isso o teste é feito também
  como correlação parcial, controlando a amplitude (resíduos dos postos).
  Spearman com IC 95% por bootstrap em blocos de 0,5° (mesma função da etapa 08).

ENTRADAS
  data/series/chirps_pentad_band*_v0*2.csv; outputs/metrics_point_year_v0.1.csv,
  rain_onset_point_year_v0.1.csv, structure_evi_point_v0.1.csv (etapa 08)
SAÍDAS (outputs/)
  threshold_point_year_v0.1.csv     T_X por ponto × ano
  threshold_skill_point_v0.1.csv    skill, r e inclinação por sensor × ponto × métrica × gatilho
  threshold_skill_summary_v0.1.csv  medianas por sensor × faixa × métrica × gatilho
  stability_structure_v0.1.csv      Teste 2: Spearman simples e parcial (controle: amplitude)
"""

import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd

from common import OUT


def _load(name, fname):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(fname))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


e07 = _load("e07", "07_chuva_verdor.py")     # leitura do CHIRPS e série diária
e08 = _load("e08", "08_estrutura_evi.py")    # bootstrap espacial

TAG = "v0.1"
THRESH = (25, 50, 75, 100, 150, 200, 300)
SENSORS = ("MCD43A4", "MOD13Q1")
METRICS = ("sos20", "sos50")
MIN_YEARS = 10       # anos válidos mínimos por ponto
MIN_FP = 3           # footprints GEDI mínimos (igual à etapa 08)


def threshold_days(daily, y):
    """Dia (desde 1º jul de y) em que o acumulado atinge cada limiar; NaN se não atinge."""
    r = daily[(daily.index >= f"{y}-07-01") & (daily.index < f"{y + 1}-07-01")].to_numpy()
    if len(r) < 360:
        return {f"T{x}": np.nan for x in THRESH}
    cum = np.cumsum(r)
    return {f"T{x}": float(np.argmax(cum >= x)) if cum[-1] >= x else np.nan for x in THRESH}


def skill_one(sos, trig):
    """Skill do gatilho (inclinação 1 + defasagem média) contra a data fixa, dentro do ponto."""
    ok = ~(np.isnan(sos) | np.isnan(trig))
    s, t = sos[ok], trig[ok]
    if len(s) < MIN_YEARS or s.std() == 0:
        return np.nan, np.nan, np.nan, len(s)
    rmse0 = np.sqrt(np.mean((s - s.mean()) ** 2))
    lag = (s - t).mean()
    rmsex = np.sqrt(np.mean((s - (t + lag)) ** 2))
    r = np.corrcoef(s, t)[0, 1] if t.std() > 0 else np.nan
    slope = ((s - s.mean()) * (t - t.mean())).sum() / ((t - t.mean()) ** 2).sum() if t.std() > 0 else np.nan
    return 1 - rmsex / rmse0, r, slope, len(s)


def resid_rank(y, x):
    """Resíduo do posto de y após regressão linear no posto de x (para correlação parcial)."""
    ry, rx = y.rank(pct=True), x.rank(pct=True)
    ok = ry.notna() & rx.notna()
    b = np.polyfit(rx[ok], ry[ok], 1)
    out = pd.Series(np.nan, index=y.index)
    out[ok] = ry[ok] - np.polyval(b, rx[ok])
    return out


def main():
    # ---- datas dos limiares por ponto × ano ----
    c = e07.read_chirps()
    rows = []
    for (pid, band), g in c.groupby(["point_id", "lat_band"]):
        daily = e07.pentads_to_daily(g)
        for y in range(2000, 2025):
            rows.append({"point_id": pid, "lat_band": band, "hy": y, **threshold_days(daily, y)})
    th = pd.DataFrame(rows)
    rain = pd.read_csv(OUT / "rain_onset_point_year_v0.1.csv", usecols=["point_id", "hy", "onset"])
    th = th.merge(rain, on=["point_id", "hy"], how="left")
    th.to_csv(OUT / f"threshold_point_year_{TAG}.csv", index=False)

    # ---- Teste 1: skill por ponto ----
    met = pd.read_csv(OUT / "metrics_point_year_v0.1.csv")
    met = met[met.sensor.isin(SENSORS) & (met.valid == 1)]
    j = met.merge(th, on=["point_id", "lat_band", "hy"], how="left")
    triggers = [f"T{x}" for x in THRESH] + ["onset"]
    rows = []
    for (sen, pid, band), g in j.groupby(["sensor", "point_id", "lat_band"]):
        for m in METRICS:
            s = g[m].to_numpy(float)
            for tr in triggers:
                sk, r, sl, n = skill_one(s, g[tr].to_numpy(float))
                rows.append({"sensor": sen, "point_id": pid, "lat_band": band, "metric": m, "trigger": tr,
                             "n_years": n, "skill": sk, "r": r, "slope": sl,
                             "sd_sos": np.nanstd(s) if np.isfinite(s).sum() >= MIN_YEARS else np.nan})
    sp = pd.DataFrame(rows)
    sp.round(4).to_csv(OUT / f"threshold_skill_point_{TAG}.csv", index=False)

    g = sp.dropna(subset=["skill"]).groupby(["sensor", "lat_band", "metric", "trigger"])
    summ = pd.DataFrame({
        "n_points": g.size(), "skill_p50": g.skill.median(),
        "pct_skill_gt0": g.skill.apply(lambda v: (v > 0).mean() * 100),
        "r_p50": g.r.median(), "slope_p50": g.slope.median(), "sd_sos_p50": g.sd_sos.median()}).round(3).reset_index()
    summ.to_csv(OUT / f"threshold_skill_summary_{TAG}.csv", index=False)

    # ---- Teste 2: estabilidade × estrutura (MCD43A4; MOD13Q1 como checagem) ----
    st = pd.read_csv(OUT / "structure_evi_point_v0.1.csv")
    st = st[st.n_all >= MIN_FP]
    rows = []
    for sen in SENSORS:
        for m in METRICS:
            s = summ[(summ.sensor == sen) & (summ.metric == m) & (summ.trigger != "onset")]
            best = s.loc[s.groupby("lat_band").skill_p50.idxmax(), ["lat_band", "trigger"]]   # melhor limiar da faixa
            x = sp[(sp.sensor == sen) & (sp.metric == m)].merge(best, on=["lat_band", "trigger"])
            d = st.merge(x[["point_id", "skill", "sd_sos", "slope"]], on="point_id")
            d = d[d.lat_band.isin([2, 3, 4])].copy()
            for var in ("sd_sos", "skill", "slope"):
                for struct in ("cover_all", "rh98_all"):
                    # postos dentro da faixa (remove gradiente norte–sul)
                    xr = d.groupby("lat_band")[struct].rank(pct=True)
                    yr = d.groupby("lat_band")[var].rank(pct=True)
                    rho, lo, hi, n, nb = e08.block_boot_rho(xr, yr, d.lon, d.lat)
                    # parcial: resíduos após controlar a amplitude, dentro de cada faixa
                    xp = d.groupby("lat_band", group_keys=False).apply(lambda q: resid_rank(q[struct], q.amplitude))
                    yp = d.groupby("lat_band", group_keys=False).apply(lambda q: resid_rank(q[var], q.amplitude))
                    prho, plo, phi, _, _ = e08.block_boot_rho(xp, yp, d.lon, d.lat)
                    rows.append({"sensor": sen, "metric": m, "variable": var, "structure": struct,
                                 "best_trigger_by_band": ";".join(f"{b}:{t}" for b, t in best.values),
                                 "n_points": n, "n_blocks": nb, "rho": rho, "ci_lo": lo, "ci_hi": hi,
                                 "rho_partial_amp": prho, "ci_lo_partial": plo, "ci_hi_partial": phi})
    pd.DataFrame(rows).round(3).to_csv(OUT / f"stability_structure_{TAG}.csv", index=False)
    print("Etapa 09 concluída; saídas em", OUT)


if __name__ == "__main__":
    main()
