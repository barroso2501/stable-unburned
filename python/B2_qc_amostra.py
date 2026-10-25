"""
B2_qc_amostra.py — checagem da amostra 4-B (parte 2) e pareamento com A
Projeto: stable-unburned — parte 2 (savana queimada sob regime espaçado)

POR QUE EXISTE
  1. O campo dist_A_m do GEE saiu vazio: ee.Join.saveBest grava a distância na feição
     de A anexada, não no ponto B. A distância ao ponto A mais próximo é recalculada aqui
     (haversine), junto com o teste "mesma célula CHIRPS" (0,05°).
  2. Pontos com o MESMO histórico de fogo (assinatura) e próximos entre si provavelmente
     estão no mesmo evento de fogo: não são réplicas independentes. Aqui eles são agrupados
     em "unidades de fogo" (mesma assinatura, ligação simples ≤ LINK_KM) para medir o
     tamanho efetivo da amostra.

ENTRADAS
  data/series/pilot_4B_sample_v0*1.csv (GEE, B2); outputs/pilot_4A_sample_v0.1.csv
SAÍDAS (outputs/)
  pilot_4B_sample_v0.1.csv           amostra + near_A_id, dist_A_km, same_chirps_cell, fire_unit
  pilot_4B_sample_qc_v0.1.csv        resumo por tipo × classe: pontos, unidades de fogo,
                                     pares A ≤ 20 km, mesma célula CHIRPS, 1º fogo modal
"""

import glob

import numpy as np
import pandas as pd

from common import DATA, OUT

TAG = "v0.1"
LINK_KM = 5.0          # pontos com a mesma assinatura a ≤ 5 km = mesma unidade de fogo
PAIR_KM = 20.0
CHIRPS_DEG = 0.05


def haversine_km(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(np.radians, (lon1, lat1, lon2, lat2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * np.arcsin(np.sqrt(a))


def fire_units(g):
    """Ligação simples (≤ LINK_KM) entre pontos de mesma assinatura → rótulo de unidade."""
    lon, lat = g.lon.to_numpy(), g.lat.to_numpy()
    n = len(g)
    lab = -np.ones(n, int)
    k = 0
    for i in range(n):
        if lab[i] >= 0:
            continue
        stack, lab[i] = [i], k
        while stack:
            j = stack.pop()
            near = np.flatnonzero((lab < 0) & (haversine_km(lon[j], lat[j], lon, lat) <= LINK_KM))
            lab[near] = k
            stack.extend(near.tolist())
        k += 1
    return pd.Series(lab, index=g.index)


def main():
    files = sorted(glob.glob(str(DATA / "pilot_4B_sample_v0*1.csv")))
    if not files:
        raise FileNotFoundError(f"Nenhum pilot_4B_sample_v0*1.csv em {DATA}")
    b = pd.read_csv(files[0]).drop(columns=["dist_A_m"], errors="ignore")
    a = pd.read_csv(OUT / "pilot_4A_sample_v0.1.csv", usecols=["point_id", "lon", "lat"])

    # vizinho A mais próximo (matriz B × A, ~1900 × 1215)
    d = haversine_km(b.lon.to_numpy()[:, None], b.lat.to_numpy()[:, None],
                     a.lon.to_numpy()[None, :], a.lat.to_numpy()[None, :])
    j = d.argmin(axis=1)
    b["near_A_id"] = a.point_id.to_numpy()[j]
    b["dist_A_km"] = d[np.arange(len(b)), j].round(2)
    cell = lambda lon, lat: (np.floor(lon / CHIRPS_DEG).astype(int), np.floor(lat / CHIRPS_DEG).astype(int))
    bc, ac = cell(b.lon.to_numpy(), b.lat.to_numpy()), cell(a.lon.to_numpy()[j], a.lat.to_numpy()[j])
    b["same_chirps_cell"] = ((bc[0] == ac[0]) & (bc[1] == ac[1])).astype(int)

    # unidades de fogo (por tipo de amostra e assinatura)
    b["fire_unit"] = ""
    for (t, s), g in b.groupby(["sample_type", "signature"]):
        lab = fire_units(g)
        b.loc[g.index, "fire_unit"] = [f"{t[0]}{s}_{x}" for x in lab]
    b.to_csv(OUT / f"pilot_4B_sample_{TAG}.csv", index=False)

    q = b.groupby(["sample_type", "cls"]).agg(
        n_points=("point_id", "size"), n_fire_units=("fire_unit", "nunique"),
        n_pairs_le20km=("dist_A_km", lambda v: int((v <= PAIR_KM).sum())),
        dist_A_km_p50=("dist_A_km", "median"),
        n_same_chirps=("same_chirps_cell", "sum"),
        first_fire_mode=("first_fire", lambda v: int(v.mode().iloc[0])),
        pct_first_fire_mode=("first_fire", lambda v: round((v == v.mode().iloc[0]).mean() * 100, 1)),
        pct_first_fire_ge2019=("first_fire", lambda v: round((v >= 2019).mean() * 100, 1)),
    ).reset_index()
    q.to_csv(OUT / f"pilot_4B_sample_qc_{TAG}.csv", index=False)
    print(q.to_string(index=False))


if __name__ == "__main__":
    main()
