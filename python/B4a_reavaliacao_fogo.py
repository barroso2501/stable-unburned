"""
B4a_reavaliacao_fogo.py — reavalia a amostra 4-B com o fogo MENSAL e o ANO DE FOGO do ciclo de chuva (D30)
Projeto: stable-unburned — parte 2 (savana queimada sob regime espaçado)

POR QUE EXISTE
  A população (B1) e a amostra (B2) foram montadas com o produto ANUAL e o ano CIVIL.
  O anual junta eventos de meses diferentes e o ano civil corta a estação seca. Aqui cada
  ponto é reavaliado com o mês do fogo e um ano de fogo definido pelas chuvas do próprio ponto.

DEFINIÇÕES
  Ciclo de chuva y (ano hidrológico jul y – jun y+1): início (onset_y) e fim (demise_y) das
  chuvas pela acumulação anômala (mesma função da etapa 07; R̄ do ponto em 2000/01–2024/25).
  Ano de fogo F_y = (fim das chuvas do ciclo y−1, fim das chuvas do ciclo y]
    → contém a estação seca do ano civil y e a estação chuvosa que se segue; um fogo em F_y
      precede (ou acompanha) o ciclo de verdor y da etapa 06.
    Se o fim das chuvas de um ciclo não for detectado, usa-se a mediana do ponto.
  Data do fogo = dia 15 do mês do produto mensal.
  Momento do fogo dentro de F_y (D27):
    úmida            entre onset_y e demise_y
    seca_inicio/meio/fim  terços entre demise_{y−1} e onset_y
  Evento no quadrado MODIS: pixels de 30 m que queimaram no mesmo mês ± 1 dentro de F_y.

CRITÉRIOS DE D28 REFEITOS EM ANOS DE FOGO (no pixel de 30 m do ponto)
  - nenhum fogo em F_1985 … F_2000;
  - 1 a 5 anos de fogo em F_2001 … F_2025, com ≥ 4 anos de fogo entre fogos consecutivos;
  - primeiro fogo em F_2002 ou depois.
  Estrato novo: 1 = um fogo; 2 = 2–5 fogos.

COERÊNCIA POR EVENTO (só pontos MODIS; limiar 90% de D29)
  Para cada F_y de 2001–2025: fração da população do quadrado que queimou em F_y (f).
  Ano sem fogo no ponto: exige f ≤ 0,10. Ano com fogo no ponto: exige f ≥ 0,90 E que ≥ 90%
  do que queimou esteja num só evento (mesmo mês ± 1).

UNIDADES DE FOGO (v0.2, auditoria 2026-10-27, item P1-3)
  Pontos do mesmo tipo de amostra ligados (ligação simples) quando estão a ≤ LINK_KM e têm os
  MESMOS anos de fogo (2001–2025) com meses que diferem no máximo MONTH_TOL em cada ano.
  Na v0.1 a unidade vinha do B2 (mesma assinatura ANUAL, ≤ 5 km), incoerente com D30: o anual
  junta eventos de meses diferentes. A unidade antiga é mantida na coluna fire_unit_annual.

ENTRADAS
  data/series/fire4B_monthly_v0*2.csv (B3d), chirps4B_pentad_band*_v0*2.csv (B3b),
  outputs/pilot_4B_sample_v0.1.csv (B2 + pareamento)
SAÍDAS (outputs/; <TAG> = v0.2; as saídas v0.1 continuam no repositório)
  fire4B_events_<TAG>.csv        um evento por linha: ponto, data, ano de fogo, momento, fração no quadrado
  fire4B_rainyear_<TAG>.csv      ciclo de chuva por ponto × ano (onset/demise como datas, 1984–2025)
  pilot_4B_sample_reval_<TAG>.csv  amostra com histórico refeito, estrato novo, coerência por evento,
                                   keep (1/0), motivo da exclusão, fire_unit (eventos) e fire_unit_annual (B2)
  pilot_4B_reval_summary_<TAG>.csv  quantos pontos mantêm, mudam de estrato ou saem, por tipo × classe

HISTÓRICO
  v0.1 (2026-10-25) unidades de fogo do B2 (fogo anual).
  v0.2 (2026-10-27) unidades de fogo por evento mensal; demais regras inalteradas
                    (as colunas de histórico e coerência são idênticas às da v0.1).
"""

import glob
import importlib.util
import json
from pathlib import Path

import numpy as np
import pandas as pd

from common import DATA, OUT

_spec = importlib.util.spec_from_file_location("e07", Path(__file__).with_name("07_chuva_verdor.py"))
e07 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(e07)

TAG = "v0.2"
RAIN_YEARS = range(1984, 2025)       # ciclos de chuva com dado completo (CHIRPS desde 1984)
CLIM_YEARS = range(2000, 2025)       # R̄ igual à etapa 07
BASE_LAST, FIRST_MIN, LAST_FY = 2000, 2002, 2025
MAX_FIRES, MIN_INTERVAL = 5, 4
COH_MIN = 0.90
LINK_KM = 5.0        # unidades de fogo: distância máxima de ligação (igual ao B2)
MONTH_TOL = 1        # unidades de fogo: diferença máxima de mês em cada ano de fogo


def rain_cycles(c):
    """Datas de início e fim das chuvas por ponto × ciclo (ano hidrológico)."""
    rows = []
    for pid, g in c.groupby("point_id"):
        daily = e07.pentads_to_daily(g)
        clim = daily[(daily.index >= f"{CLIM_YEARS.start}-07-01") & (daily.index < f"{CLIM_YEARS.stop}-07-01")]
        rbar = clim.mean()
        for y in RAIN_YEARS:
            od = e07.onset_demise(daily, rbar, y)
            base = pd.Timestamp(f"{y}-07-01")
            rows.append({"point_id": pid, "hy": y,
                         "onset": base + pd.Timedelta(days=od["onset"]) if pd.notna(od["onset"]) else pd.NaT,
                         "demise": base + pd.Timedelta(days=od["demise"]) if pd.notna(od["demise"]) else pd.NaT})
    r = pd.DataFrame(rows)
    # recuo: sem fim/início detectado → mediana do ponto (em dias desde 1º jul)
    for col in ("onset", "demise"):
        days = (r[col] - pd.to_datetime(r.hy.astype(str) + "-07-01")).dt.days
        med = days.groupby(r.point_id).transform("median")
        r[f"{col}_filled"] = r[col].isna().astype(int)
        r[col] = pd.to_datetime(r.hy.astype(str) + "-07-01") + pd.to_timedelta(days.fillna(med), unit="D")
    # ciclo 2025/26 ainda sem dado completo: mediana do ponto (permite classificar fogos de 2025)
    last = r.groupby("point_id").apply(lambda g: pd.Series({
        "hy": 2025,
        "onset": pd.Timestamp("2025-07-01") + pd.Timedelta(days=float((g.onset - pd.to_datetime(g.hy.astype(str) + "-07-01")).dt.days.median())),
        "demise": pd.Timestamp("2025-07-01") + pd.Timedelta(days=float((g.demise - pd.to_datetime(g.hy.astype(str) + "-07-01")).dt.days.median())),
        "onset_filled": 1, "demise_filled": 1}), include_groups=False).reset_index()
    return pd.concat([r, last], ignore_index=True).sort_values(["point_id", "hy"]).reset_index(drop=True)


def assign(date, cyc):
    """Ano de fogo F_y e momento do fogo para uma data, dado o ciclo do ponto (DataFrame por hy)."""
    # F_y = (demise_{y-1}, demise_y]; procura y tal que demise_{y-1} < date ≤ demise_y
    for y in cyc.index:
        if y - 1 not in cyc.index:
            continue
        d0, d1, on = cyc.at[y - 1, "demise"], cyc.at[y, "demise"], cyc.at[y, "onset"]
        if d0 < date <= d1:
            if date >= on:
                return y, "umida"
            third = (on - d0) / 3
            if date < d0 + third:
                return y, "seca_inicio"
            if date < d0 + 2 * third:
                return y, "seca_meio"
            return y, "seca_fim"
    # depois do último fim de chuva conhecido (2025): ano civil, momento pela mediana do ponto
    y = date.year
    return y, "sem_ciclo"


def haversine_km(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(np.radians, (lon1, lat1, lon2, lat2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * np.arcsin(np.sqrt(a))


def event_units(o, ev):
    """Unidades de fogo por evento: mesmos anos de fogo, meses a ≤ MONTH_TOL, ≤ LINK_KM (ligação simples)."""
    e = ev[(ev.fire_year > BASE_LAST) & (ev.fire_year <= LAST_FY)].sort_values(["point_id", "date"])
    hist = {pid: dict(zip(g.fire_year, g.month)) for pid, g in e.groupby("point_id")}
    unit = pd.Series("", index=o.index)
    o = o.assign(_fys=[";".join(map(str, sorted(hist.get(p, {})))) for p in o.point_id])
    for (t, fys), g in o.groupby(["sample_type", "_fys"]):
        idx = g.index.to_numpy()
        lon, lat = g.lon.to_numpy(), g.lat.to_numpy()
        months = np.array([[hist.get(p, {}).get(int(y), 0) for y in fys.split(";")] if fys else [] for p in g.point_id])
        lab = -np.ones(len(g), int)
        k = 0
        for i in range(len(g)):
            if lab[i] >= 0:
                continue
            stack, lab[i] = [i], k
            while stack:
                j = stack.pop()
                close = haversine_km(lon[j], lat[j], lon, lat) <= LINK_KM
                same = np.all(np.abs(months - months[j]) <= MONTH_TOL, axis=1) if months.size else np.ones(len(g), bool)
                nb = np.flatnonzero((lab < 0) & close & same)
                lab[nb] = k
                stack.extend(nb.tolist())
            k += 1
        unit.loc[idx] = [f"{t[0]}{fys.replace(';', '-') or 'sem'}_{x}" for x in lab]
    return unit


def main():
    # ---- entradas ----
    f = pd.read_csv(sorted(glob.glob(str(DATA / "fire4B_monthly_v0*2.csv")))[0])
    files = sorted(glob.glob(str(DATA / "chirps4B_pentad_band*_v0*2.csv")))
    c = pd.concat([pd.read_csv(x, usecols=["point_id", "date", "precip_mm"]) for x in files], ignore_index=True)
    c["date"] = pd.to_datetime(c["date"])
    s = pd.read_csv(OUT / "pilot_4B_sample_v0.1.csv")

    r = rain_cycles(c)
    r.to_csv(OUT / f"fire4B_rainyear_{TAG}.csv", index=False)
    cyc = {pid: g.set_index("hy") for pid, g in r.groupby("point_id")}

    # ---- eventos: no pixel do ponto e no quadrado ----
    years = range(1985, 2026)
    ev_rows, sq_rows = [], []
    for row in f.itertuples(index=False):
        rr = row._asdict()
        cy = cyc[rr["point_id"]]
        for y in years:
            m = int(rr[f"m_pt_{y}"])
            h = json.loads(rr[f"h_{y}"])
            tot = sum(h.values())
            for k, v in h.items():          # quadrado: um registro por mês com fogo
                k = int(float(k))
                if k == 0:
                    continue
                d = pd.Timestamp(year=y, month=k, day=15)
                fy, mom = assign(d, cy)
                sq_rows.append({"point_id": rr["point_id"], "date": d, "fire_year": fy, "frac": v / tot if tot else np.nan})
            if m > 0:
                d = pd.Timestamp(year=y, month=m, day=15)
                fy, mom = assign(d, cy)
                ev_rows.append({"point_id": rr["point_id"], "date": d, "cal_year": y, "month": m,
                                "fire_year": fy, "moment": mom,
                                "frac_square_same_month": h.get(str(m), h.get(f"{m}.0", 0)) / tot if tot else np.nan})
    ev = pd.DataFrame(ev_rows)
    sq = pd.DataFrame(sq_rows)

    # ---- histórico refeito por ponto ----
    out = []
    for p in s.itertuples(index=False):
        e = ev[ev.point_id == p.point_id].sort_values("date")
        fys = sorted(set(e.fire_year))
        base_fire = any(fy <= BASE_LAST for fy in fys)
        fy_win = [fy for fy in fys if BASE_LAST < fy <= LAST_FY]
        n = len(fy_win)
        gaps = np.diff(fy_win) if n > 1 else np.array([])
        multi_in_year = e[e.fire_year > BASE_LAST].groupby("fire_year").size().max() if n else 0
        reasons = []
        if base_fire:
            reasons.append("fogo_1985_2000")
        if n == 0:
            reasons.append("sem_fogo_2001_2025")
        if n > MAX_FIRES:
            reasons.append("mais_de_5")
        if len(gaps) and gaps.min() < MIN_INTERVAL:
            reasons.append("intervalo_menor_4")
        if n and fy_win[0] < FIRST_MIN:
            reasons.append("primeiro_fogo_antes_2002")

        # coerência por evento no quadrado (só MODIS)
        coh = np.nan
        if p.sample_type == "modis":
            q = sq[sq.point_id == p.point_id]
            vals = []
            for fy in range(BASE_LAST + 1, LAST_FY + 1):
                qq = q[q.fire_year == fy]
                fb = qq.frac.sum()
                if fy in fy_win:
                    # evento dominante: mês do fogo no ponto ± 1
                    md = e[e.fire_year == fy].date.iloc[0]
                    dom = qq[(qq.date - md).abs() <= pd.Timedelta(days=45)].frac.sum()
                    vals.append(min(fb, dom / fb if fb > 0 else 0))
                else:
                    vals.append(1 - fb)
            coh = float(np.min(vals)) if vals else np.nan
            if coh < COH_MIN:
                reasons.append("coerencia_evento_menor_90")

        moments = e[e.fire_year > BASE_LAST].moment.tolist()
        out.append({**p._asdict(),
                    "fy_fires": ";".join(map(str, fy_win)), "n_fires_fy": n,
                    "first_fy": fy_win[0] if n else np.nan, "last_fy": fy_win[-1] if n else np.nan,
                    "min_gap_fy": gaps.min() if len(gaps) else np.nan,
                    "events_per_fy_max": multi_in_year,
                    "moments": ";".join(moments),
                    "first_moment": moments[0] if moments else "",
                    "stratum_fy": (1 if n == 1 else 2) if 1 <= n <= MAX_FIRES else np.nan,
                    "coherence_event": coh,
                    "keep": int(not reasons), "reason": ";".join(reasons)})
    o = pd.DataFrame(out)
    o = o.rename(columns={"fire_unit": "fire_unit_annual"})
    o["fire_unit"] = event_units(o, ev)
    o["stratum_changed"] = ((o.keep == 1) & (o.stratum_fy != o.stratum)).astype(int)
    o.to_csv(OUT / f"pilot_4B_sample_reval_{TAG}.csv", index=False)
    ev.merge(s[["point_id", "sample_type", "lat_band", "stratum"]], on="point_id").to_csv(
        OUT / f"fire4B_events_{TAG}.csv", index=False)

    summ = o.groupby(["sample_type", "cls"]).agg(
        n=("point_id", "size"), keep=("keep", "sum"), stratum_changed=("stratum_changed", "sum"),
        out_base=("reason", lambda v: v.str.contains("fogo_1985_2000").sum()),
        out_interval=("reason", lambda v: v.str.contains("intervalo").sum()),
        out_first=("reason", lambda v: v.str.contains("primeiro").sum()),
        out_coherence=("reason", lambda v: v.str.contains("coerencia").sum()),
        out_nofire=("reason", lambda v: v.str.contains("sem_fogo").sum()),
    ).reset_index()
    summ.to_csv(OUT / f"pilot_4B_reval_summary_{TAG}.csv", index=False)
    print(summ.to_string(index=False))
    print("\nMomento do 1º fogo (pontos mantidos):")
    print(pd.crosstab([o[o.keep == 1].sample_type, o[o.keep == 1].stratum_fy], o[o.keep == 1].first_moment))


if __name__ == "__main__":
    main()
