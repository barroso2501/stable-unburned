"""Testes de integridade dos dados brutos e das saídas (auditoria 2026-10-27). Saída: tabela OK/FALHA."""
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
import glob, json, numpy as np, pandas as pd
res=[]
def ok(name,cond,detail): res.append((name,'OK' if cond else 'FALHA',detail))
a=pd.read_csv(O+'pilot_4A_sample_v0.1.csv')
ok('A: ids únicos',a.point_id.is_unique,f'{len(a)} pontos')
ok('A: faixa = floor(-lat/5)+1',((-a.lat//5+1).astype(int)==a.lat_band).all(),'')
ok('A: pureza 463 m ≥ 90',(a.purity_463m>=90).all(),f'min {a.purity_463m.min()}')
ok('A: n por faixa',a.lat_band.value_counts().sort_index().tolist()==[300,300,300,300,15],str(a.lat_band.value_counts().sort_index().tolist()))
ids=set(a.point_id)
for prod in ['MCD43A4','MOD13Q1','HLS_L30','HLS_S30']:
    fs=sorted(glob.glob(D+f'series_{prod}_*.csv')); s=pd.concat([pd.read_csv(f,usecols=['point_id','date']) for f in fs])
    ok(f'A séries {prod}: pontos cobertos', set(s.point_id)==ids, f'{s.point_id.nunique()} pontos; ids fora da amostra: {len(set(s.point_id)-ids)}')
    dup=s.duplicated().mean()
    res.append((f'A séries {prod}: duplicatas ponto×data',f'{dup*100:.1f}%','HLS esperado (tiles sobrepostos); MODIS deve ser 0'))
m=pd.concat([pd.read_csv(f,usecols=['DayOfYear','SummaryQA']) for f in glob.glob(D+'series_MOD13Q1_*.csv')])
ok('MOD13Q1: DayOfYear válido nos QA≤1',(m[m.SummaryQA<=1].DayOfYear.between(1,366)).all(),f'fora: {(~m[m.SummaryQA<=1].DayOfYear.between(1,366)).sum()}')
c=pd.concat([pd.read_csv(f,usecols=['point_id','date']) for f in glob.glob(D+'chirps_pentad_band*_v02.csv')])
g=c.groupby('point_id').size(); ok('A CHIRPS: 1872 pêntadas/ponto e todos os pontos', (g==1872).all() and set(g.index)==ids, f'{len(g)} pontos')
# GEDI dentro do quadrado (aprox. 231.6 m em graus)
for k in ['l2a','l2b']:
    gg=pd.concat([pd.read_csv(f) for f in glob.glob(D+f'gedi_{k}_band*.csv')]).merge(a[['point_id','lon','lat']],on='point_id',suffixes=('','_p'))
    dlat=(gg.lat-gg.lat_p).abs()*111320; dlon=(gg.lon-gg.lon_p).abs()*111320*np.cos(np.radians(gg.lat_p))
    ok(f'GEDI {k}: footprints dentro do quadrado (±232 m + 25 m)',((dlat<=260)&(dlon<=260)).all(),f'{len(gg)} footprints; máx dlat {dlat.max():.0f} m, dlon {dlon.max():.0f} m')
# B
b=pd.read_csv(O+'pilot_4B_sample_v0.1.csv')
ok('B: ids únicos e sem colisão com A',b.point_id.is_unique and not (set(b.point_id)&ids),f'{len(b)}')
bits=lambda s:[2001+i for i in range(25) if (int(s)>>i)&1]
ok('B: assinatura ↔ n/1º/último fogo',b.apply(lambda r: len(bits(r.signature))==r.n_fires and min(bits(r.signature))==r.first_fire and max(bits(r.signature))==r.last_fire,axis=1).all(),'')
f=pd.read_csv(D+'fire4B_monthly_v02.csv').merge(b[['point_id','signature']],on='point_id')
mism=0
for r in f.itertuples():
    s=set(bits(r.signature))
    for y in range(2001,2026):
        if (getattr(r,f'a_{y}')==1)!=(y in s): mism+=1
pre=sum((f[f'a_{y}']==1).sum() for y in range(1985,2001))
ok('B: fogo anual no pixel (B3d) = assinatura (B1a)',mism==0,f'divergências ponto-ano: {mism}')
ok('B: sem fogo anual 1985–2000 no pixel',pre==0,f'ponto-anos com fogo: {pre}')
bids=set(b.point_id); mod=set(b[b.sample_type=='modis'].point_id)
for prod,exp in [('MCD43A4',mod),('MOD13Q1',mod),('HLS_L30',bids),('HLS_S30',bids)]:
    fs=sorted(glob.glob(D+f'series4B_{prod}_*.csv')); s=pd.concat([pd.read_csv(f,usecols=['point_id']) for f in fs])
    ok(f'B séries {prod}: pontos esperados',set(s.point_id)==exp,f'{s.point_id.nunique()} de {len(exp)}; extras {len(set(s.point_id)-exp)}')
c=pd.concat([pd.read_csv(f,usecols=['point_id']) for f in glob.glob(D+'chirps4B_pentad_band*_v02.csv')]); g=c.groupby('point_id').size()
ok('B CHIRPS: 3024 pêntadas/ponto',(g==3024).all() and set(g.index)==bids,f'{len(g)}')
mb=pd.read_csv(O+f'metrics4B_point_year_{args.b4}.csv')
ok('metrics4B: uma linha por sensor×ponto×ciclo',not mb.duplicated(['sensor','point_id','hy']).any(),'')
ok('metrics4B: só pontos mantidos na B4a',set(mb.point_id)<=set(pd.read_csv(O+f'pilot_4B_sample_reval_{args.b4}.csv').query('keep==1').point_id),'')
ma=pd.read_csv(O+'metrics_point_year_v0.1.csv')
ok('metrics A: uma linha por sensor×ponto×ciclo',not ma.duplicated(['sensor','point_id','hy']).any(),'')
pd.set_option('display.width',250); pd.set_option('display.max_colwidth',120)
print(pd.DataFrame(res,columns=['verificação','resultado','detalhe']).to_string(index=False))

import sys as _s
_s.exit(1 if any(r[1]=='FALHA' for r in res) else 0)
