"""
B4c_trajetorias_fogo.py — resposta das métricas ao fogo: antes × depois no mesmo ponto, descontado A no mesmo ciclo
Projeto: stable-unburned — parte 2 (pergunta: deslocamento no tempo ou mudança de intensidade?)

DESENHO (diferenças em diferenças, D23)
  Para cada ponto 4-B, sensor e métrica m:
    d_m(y)    = B(y) − A_ref(y)       (A pareado ≤ 20 km ou mediana de A na faixa; B4b)
                → remove o clima do ano (crucial: 1º fogo concentrado em 2007, 2010, 2012)
    base      = média de d_m nos ciclos ANTES do 1º fogo (≥ MIN_PRE ciclos válidos)
    efeito(t) = d_m(t) − base,  t = tempo de evento (ciclos desde o 1º fogo; 0 = ciclo que segue o fogo)
  Para isolar o 1º fogo, no estrato 2 só entram os ciclos antes do 2º fogo.
  Inferência por UNIDADE DE FOGO (B2): média dos pontos da unidade → mediana entre unidades,
  IC 95% por bootstrap das unidades (1000 réplicas, semente 42).

  Também:
    - pré-fogo × A: mediana de "base" (B antes do fogo − A) → B sem fogo há ≥ 16 anos ≈ A?
    - regime (estrato 2): efeito por ciclos desde o ÚLTIMO fogo, só depois do 2º fogo.
  Grupos: todos; estrato; momento do 1º fogo (seca_meio, seca_fim, umida = início das chuvas).

ENTRADAS  outputs/metrics4B_point_year_v0.1.csv (B4b)
SAÍDAS (outputs/)
  fire_effect_event_v0.1.csv     efeito por sensor × métrica × grupo × tempo de evento
  fire_effect_preA_v0.1.csv      B antes do fogo − A, por sensor × métrica × faixa
  fire_effect_regime_v0.1.csv    estrato 2: efeito por ciclos desde o último fogo (após o 2º fogo)
"""

import numpy as np
import pandas as pd

from common import OUT

TAG = "v0.1"
METRICS = ["base_pre", "peak_evi", "amplitude", "sos20", "sos50", "eos50", "integral"]
MIN_PRE = {"MCD43A4": 2, "MOD13Q1": 2, "HLS": 1}
T_MIN, T_MAX = -5, 15
N_BOOT = 1000
RNG = np.random.default_rng(42)


def unit_stat(d, col):
    """Mediana entre unidades de fogo (média dentro da unidade) e IC por bootstrap das unidades."""
    u = d.groupby("fire_unit")[col].mean().dropna().to_numpy()
    if len(u) < 5:
        return dict(n_units=len(u), n_points=d.point_id.nunique(), median=np.nan, ci_lo=np.nan, ci_hi=np.nan)
    bs = np.median(RNG.choice(u, (N_BOOT, len(u)), replace=True), axis=1)
    lo, hi = np.percentile(bs, [2.5, 97.5])
    return dict(n_units=len(u), n_points=d.point_id.nunique(), median=np.median(u), ci_lo=lo, ci_hi=hi)


def main():
    m = pd.read_csv(OUT / "metrics4B_point_year_v0.1.csv")
    m = m[m.valid == 1]
    rows_e, rows_p, rows_r = [], [], []
    for sen, g in m.groupby("sensor"):
        # ciclos do 1º fogo isolado: antes do 2º fogo
        first_only = g[(g.event_time < 0) | (g.n_prior <= 1)]
        for met in METRICS:
            col = f"d_{met}"
            pre = first_only[first_only.event_time < 0].groupby("point_id")[col].agg(["mean", "count"])
            pre = pre[pre["count"] >= MIN_PRE[sen]]["mean"].rename("base")
            d = first_only.merge(pre, left_on="point_id", right_index=True)
            d["eff"] = d[col] - d.base
            # pré-fogo × A (um valor por ponto)
            pp = d.drop_duplicates("point_id")[["point_id", "fire_unit", "lat_band", "base"]]
            for band, q in list(pp.groupby("lat_band")) + [("todas", pp)]:
                rows_p.append({"sensor": sen, "metric": met, "lat_band": band, **unit_stat(q, "base")})
            # efeito por tempo de evento
            groups = {"todos": d, "estrato_1": d[d.stratum_fy == 1], "estrato_2": d[d.stratum_fy == 2]}
            for mom in ("seca_meio", "seca_fim", "umida"):
                groups[f"1o_fogo_{mom}"] = d[d.first_moment == mom]
            for gname, q in groups.items():
                for t, qt in q[q.event_time.between(T_MIN, T_MAX)].groupby("event_time"):
                    rows_e.append({"sensor": sen, "metric": met, "group": gname, "event_time": int(t),
                                   **unit_stat(qt, "eff")})
            # regime: estrato 2, depois do 2º fogo, por ciclos desde o último fogo
            r = g[(g.stratum_fy == 2) & (g.n_prior >= 2)].merge(pre, left_on="point_id", right_index=True)
            r["eff"] = r[col] - r.base
            for t, qt in r[r.tsf.between(0, 10)].groupby("tsf"):
                rows_r.append({"sensor": sen, "metric": met, "tsf": int(t), **unit_stat(qt, "eff")})
    pd.DataFrame(rows_e).round(4).to_csv(OUT / f"fire_effect_event_{TAG}.csv", index=False)
    pd.DataFrame(rows_p).round(4).to_csv(OUT / f"fire_effect_preA_{TAG}.csv", index=False)
    pd.DataFrame(rows_r).round(4).to_csv(OUT / f"fire_effect_regime_{TAG}.csv", index=False)
    print("Etapa B4c concluída; saídas em", OUT)


if __name__ == "__main__":
    main()
