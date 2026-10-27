"""
B4b_metricas_4B.py — métricas da curva sazonal na amostra 4-B, com o contexto de fogo de cada ciclo
Projeto: stable-unburned — parte 2 (savana queimada sob regime espaçado)

O QUE FAZ
  1. Calcula, para os pontos 4-B mantidos na B4a, as mesmas métricas da etapa 06 (mesmo código,
     importado): MCD43A4 e MOD13Q1 nos pontos MODIS (2000/01–2024/25), HLS em todos (2018/19–2024/25).
     MOD13Q1 sem o filtro de pureza a 232 m da D21 (não calculado para B) — ressalva declarada.
  2. Para cada ponto × ciclo hidrológico y, anexa o contexto de fogo (B4a):
       event_time   y − ano de fogo do 1º fogo (0 = ciclo que segue o 1º fogo; < 0 = antes)
       tsf          ciclos desde o último fogo até y (NaN antes do 1º fogo)
       n_prior      nº de fogos até o ciclo y (inclusive)
       last_moment  momento do último fogo até y (seca_meio, seca_fim, umida = início das chuvas …)
       first_moment momento do 1º fogo
       fire_in_y    1 se houve fogo no ano de fogo F_y
  3. Anexa a referência A do mesmo ciclo e sensor:
       ref = ponto A pareado (≤ 20 km) se válido naquele ciclo; senão, mediana de A na faixa e ciclo.
     e calcula d_<métrica> = B − A_ref.

ENTRADAS
  data/series/series4B_*.csv (B3a); outputs/pilot_4B_sample_reval_v0.2.csv, fire4B_events_v0.2.csv (B4a v0.2);
  outputs/metrics_point_year_v0.1.csv (A, etapa 06)
SAÍDAS (outputs/)
  metrics4B_point_year_<TAG>.csv  métricas + contexto de fogo + referência A + diferenças (não versionado: > 1 MB)

RESSALVAS (auditoria 2026-10-27)
  - MOD13Q1 em B sem o filtro de pureza a 232 m (D21), aplicado em A: assimetria declarada (P2-3);
    o MOD13Q1 é só checagem.
  - amplitude e integral são medidas a partir do piso (base_pre): no ciclo do fogo o piso despenca
    e as duas sobem sem mais verde (P1-4). Para intensidade, usar peak_evi.

HISTÓRICO
  v0.1 (2026-10-25) entradas B4a v0.1.  v0.2 (2026-10-27) entradas B4a v0.2 (unidades de fogo por evento).
"""

import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd

from common import OUT, read_all, clean_mcd43a4, clean_mod13q1, clean_hls

_spec = importlib.util.spec_from_file_location("e06", Path(__file__).with_name("06_metricas.py"))
e06 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(e06)

TAG = "v0.2"
PAIR_KM = 20.0
METRICS = ["base_pre", "peak_evi", "amplitude", "sos20", "sos50", "eos50", "integral", "rise_days", "fall_days"]


def read_num(pattern):
    """read_all + converte colunas numéricas (CSVs vazios, só com cabeçalho, deixam a coluna como texto)."""
    d = read_all(pattern)
    for col in d.columns:
        if col not in ("point_id", "product", "date", "run_tag", "created"):
            d[col] = pd.to_numeric(d[col], errors="coerce")
    return d.dropna(subset=["lat_band"])


def main():
    s = pd.read_csv(OUT / f"pilot_4B_sample_reval_{TAG}.csv")
    s = s[s.keep == 1]
    keep = set(s.point_id)
    modis_ids = set(s.loc[s.sample_type == "modis", "point_id"])

    h_raw = read_num("series4B_HLS_*.csv")
    series = {
        "MCD43A4": clean_mcd43a4(read_num("series4B_MCD43A4_*.csv")),
        "MOD13Q1": clean_mod13q1(read_num("series4B_MOD13Q1_*.csv"), apply_purity_filter=False),
        "HLS": clean_hls(h_raw),
    }
    series = {k: v[v.point_id.isin(modis_ids if k != "HLS" else keep)] for k, v in series.items()}
    met = pd.concat([e06.metrics_for_sensor(v, k) for k, v in series.items()], ignore_index=True)

    # ---- contexto de fogo por ciclo ----
    ev = pd.read_csv(OUT / f"fire4B_events_{TAG}.csv")
    ev = ev[(ev.fire_year > 2000) & ev.point_id.isin(keep)].sort_values(["point_id", "fire_year"])
    fires = {pid: g[["fire_year", "moment"]].drop_duplicates("fire_year").to_numpy() for pid, g in ev.groupby("point_id")}

    def ctx(pid, y):
        f = fires.get(pid)
        if f is None or len(f) == 0:
            return dict(event_time=np.nan, tsf=np.nan, n_prior=0, last_moment="", first_moment="", fire_in_y=0)
        fy = f[:, 0].astype(int)
        prior = fy[fy <= y]
        return dict(event_time=y - fy[0],
                    tsf=(y - prior[-1]) if len(prior) else np.nan,
                    n_prior=len(prior),
                    last_moment=f[fy <= y][-1, 1] if len(prior) else "",
                    first_moment=f[0, 1],
                    fire_in_y=int(y in set(fy)))

    c = pd.DataFrame([ctx(p, y) for p, y in zip(met.point_id, met.hy)])
    met = pd.concat([met.reset_index(drop=True), c], axis=1)
    met = met.merge(s[["point_id", "sample_type", "stratum_fy", "fire_unit", "near_A_id", "dist_A_km"]],
                    on="point_id", how="left")

    # ---- referência A no mesmo ciclo e sensor ----
    a = pd.read_csv(OUT / "metrics_point_year_v0.1.csv")
    a = a[(a.valid == 1) & a.sensor.isin(series.keys())]
    a_pt = a.set_index(["sensor", "point_id", "hy"])[METRICS]
    a_band = a.groupby(["sensor", "lat_band", "hy"])[METRICS].median()
    ref, rtype = [], []
    for r in met[["sensor", "near_A_id", "dist_A_km", "lat_band", "hy"]].itertuples(index=False):
        k = (r.sensor, r.near_A_id, r.hy)
        if r.dist_A_km <= PAIR_KM and k in a_pt.index:
            ref.append(a_pt.loc[k].to_numpy()); rtype.append("par")
        elif (r.sensor, r.lat_band, r.hy) in a_band.index:
            ref.append(a_band.loc[(r.sensor, r.lat_band, r.hy)].to_numpy()); rtype.append("faixa")
        else:
            ref.append(np.full(len(METRICS), np.nan)); rtype.append("")
    ref = pd.DataFrame(np.vstack(ref), columns=[f"A_{m}" for m in METRICS])
    met = pd.concat([met, ref], axis=1)
    met["ref_type"] = rtype
    for m in METRICS:
        met[f"d_{m}"] = met[m] - met[f"A_{m}"]
    met.to_csv(OUT / f"metrics4B_point_year_{TAG}.csv", index=False)
    v = met[met.valid == 1]
    print(v.groupby(["sensor", "sample_type"]).agg(point_years=("hy", "size"), points=("point_id", "nunique"),
                                                   pct_ref_par=("ref_type", lambda x: round((x == "par").mean() * 100, 1))))


if __name__ == "__main__":
    main()
