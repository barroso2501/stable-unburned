import sys, glob, os
import numpy as np, pandas as pd
new, ref_gh, ref_loc = sys.argv[1:4]
rows=[]
for f in sorted(glob.glob(os.path.join(new,'*.csv'))):
    name=os.path.basename(f)
    ref = os.path.join(ref_gh,name) if os.path.exists(os.path.join(ref_gh,name)) else (os.path.join(ref_loc,name) if os.path.exists(os.path.join(ref_loc,name)) else None)
    src = 'gh' if ref and ref.startswith(ref_gh) else ('local' if ref else '-')
    if not ref: rows.append((name,src,'sem referência','','')); continue
    a=pd.read_csv(f); b=pd.read_csv(ref)
    if list(a.columns)!=list(b.columns) or a.shape!=b.shape:
        rows.append((name,src,'DIFERENTE estrutura',str(a.shape),str(b.shape))); continue
    num=a.select_dtypes('number').columns
    oth=[c for c in a.columns if c not in num]
    eq_oth = all((a[c].fillna('NA').astype(str)==b[c].fillna('NA').astype(str)).all() for c in oth)
    if len(num):
        d=(a[num].astype(float)-b[num].astype(float)).abs()
        nanmis=((a[num].isna())!=(b[num].isna())).sum().sum()
        mx=np.nanmax(d.to_numpy()) if d.size else 0
    else: mx,nanmis=0,0
    status='idêntico' if (mx==0 and nanmis==0 and eq_oth) else ('≈ (dif. máx %.3g)'%mx if eq_oth and nanmis==0 and mx<1e-6 else 'DIFERENTE')
    rows.append((name,src,status,f'max_abs={mx:.3g}; nan_mismatch={nanmis}; texto_igual={eq_oth}',str(a.shape)))
out=pd.DataFrame(rows,columns=['arquivo','ref','estado','detalhe','shape'])
pd.set_option('display.width',250); pd.set_option('display.max_colwidth',80); pd.set_option('display.max_rows',200)
print(out.to_string(index=False))
