"""Escolha do limiar de chuva fora da amostra (anos ímpares → avaliação nos pares), etapa 09."""
import argparse
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("--data", default=str(ROOT / "data" / "series"), help="pasta com os CSVs brutos")
ap.add_argument("--outputs", default=str(ROOT / "outputs"), help="pasta com as saídas Python")
ap.add_argument("--b4", default="v0.2", help="versão das saídas B4 a testar")
args = ap.parse_args()
D = args.data.rstrip("/") + "/"
O = args.outputs.rstrip("/") + "/"
import numpy as np, pandas as pd
th=pd.read_csv(O+'threshold_point_year_v0.1.csv'); met=pd.read_csv(O+'metrics_point_year_v0.1.csv')
met=met[(met.sensor=='MCD43A4')&(met.valid==1)][['point_id','lat_band','hy','sos50']]
j=met.merge(th,on=['point_id','lat_band','hy'])
trig=[c for c in th.columns if c.startswith('T')]
def skill(g,tr,yrs):
    g=g[g.hy.isin(yrs)].dropna(subset=['sos50',tr])
    if len(g)<5 or g.sos50.std()==0: return np.nan
    s=g.sos50.to_numpy(); t=g[tr].to_numpy()
    r0=np.sqrt(np.mean((s-s.mean())**2)); rx=np.sqrt(np.mean((s-(t+(s-t).mean()))**2)); return 1-rx/r0
odd=[y for y in range(2000,2025) if y%2]; even=[y for y in range(2000,2025) if not y%2]
rows=[]
for band,gb in j.groupby('lat_band'):
    sk={tr:{'odd':[], 'even':[]} for tr in trig}
    for pid,g in gb.groupby('point_id'):
        for tr in trig:
            sk[tr]['odd'].append(skill(g,tr,odd)); sk[tr]['even'].append(skill(g,tr,even))
    med={tr:(np.nanmedian(sk[tr]['odd']),np.nanmedian(sk[tr]['even'])) for tr in trig}
    best_odd=max(trig,key=lambda t:med[t][0]); best_even=max(trig,key=lambda t:med[t][1])
    rows.append(dict(lat_band=band,best_on_odd=best_odd,skill_even_of_best_odd=round(med[best_odd][1],3),
                     best_on_even=best_even,skill_even_in_sample=round(med[best_even][1],3),
                     skill_even_T75=round(med['T75'][1],3)))
print(pd.DataFrame(rows).to_string(index=False))
