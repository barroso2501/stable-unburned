import numpy as np, pandas as pd
O='/home/claude/audit/rerun/outputs/'
rng=np.random.default_rng(42)
m=pd.read_csv(O+'metrics4B_point_year_v0.1.csv'); m=m[(m.valid==1)&(m.sensor=='MCD43A4')]
fo=m[(m.event_time<0)|(m.n_prior<=1)].copy()
def boot(u):
    u=np.asarray(u); u=u[~np.isnan(u)]
    bs=np.median(rng.choice(u,(1000,len(u))),axis=1); return np.median(u),*np.percentile(bs,[2.5,97.5]),len(u)
print('== (a) tendência pré-fogo: inclinação de d_m em event_time<0 por ponto (≥3 ciclos), mediana entre unidades ==')
for met in ['peak_evi','base_pre','sos50','amplitude']:
    pre=fo[fo.event_time<0]; sl=[]
    for (pid,u),g in pre.groupby(['point_id','fire_unit']):
        g=g.dropna(subset=[f'd_{met}'])
        if len(g)>=3: sl.append((u,np.polyfit(g.event_time,g[f'd_{met}'],1)[0]))
    s=pd.DataFrame(sl,columns=['u','b']).groupby('u').b.mean()
    print(met,'inclinação/ciclo: med %.4f IC [%.4f; %.4f] n_unid %d'%boot(s))
print('== (b) efeito em t=0 por tipo de referência A ==')
for met in ['peak_evi','sos50']:
    pre=fo[fo.event_time<0].groupby('point_id')[f'd_{met}'].agg(['mean','count']); pre=pre[pre['count']>=2]['mean']
    t0=fo[fo.event_time==0].join(pre.rename('base'),on='point_id').dropna(subset=['base'])
    t0['eff']=t0[f'd_{met}']-t0.base
    for rt,g in t0.groupby('ref_type'):
        print(met,rt,'med %.3f IC [%.3f; %.3f] n_unid %d'%boot(g.groupby('fire_unit').eff.mean()))
    t0['y2010']=np.where(t0.hy==2010,'1º fogo 2010','outros anos')
    for k,g in t0.groupby('y2010'):
        print(met,k,'med %.3f IC [%.3f; %.3f] n_unid %d'%boot(g.groupby('fire_unit').eff.mean()))
print('== (c) composição por tempo de evento: ano do 1º fogo ==')
x=fo[fo.event_time>=0].copy(); x['fy']=x.hy-x.event_time
print(x.groupby(pd.cut(x.event_time,[-1,0,2,5,9,15,30])).fy.describe()[['count','min','50%','max']])
print('== (d) unidades de fogo refeitas com eventos mensais (ano de fogo + mês ±1, ≤5 km) ==')
ev=pd.read_csv(O+'fire4B_events_v0.1.csv'); s=pd.read_csv(O+'pilot_4B_sample_reval_v0.1.csv'); s=s[s.keep==1]
ev=ev[ev.fire_year>2000]
sig=ev.groupby('point_id').apply(lambda g: ';'.join(f'{r.fire_year}-{r.month}' for r in g.itertuples()),include_groups=False).rename('msig')
s=s.join(sig,on='point_id')
def hav(lo1,la1,lo2,la2):
    lo1,la1,lo2,la2=map(np.radians,(lo1,la1,lo2,la2)); a=np.sin((la2-la1)/2)**2+np.cos(la1)*np.cos(la2)*np.sin((lo2-lo1)/2)**2; return 12742*np.arcsin(np.sqrt(a))
def units(g):
    lon,lat=g.lon.to_numpy(),g.lat.to_numpy(); n=len(g); lab=-np.ones(n,int); k=0
    for i in range(n):
        if lab[i]>=0: continue
        st=[i]; lab[i]=k
        while st:
            j=st.pop(); nb=np.flatnonzero((lab<0)&(hav(lon[j],lat[j],lon,lat)<=5)); lab[nb]=k; st.extend(nb.tolist())
        k+=1
    return pd.Series([f'{g.name}_{x}' for x in lab],index=g.index)
s['unit_m']=s.groupby(['sample_type','msig'],group_keys=False).apply(units)
for t,g in s.groupby('sample_type'):
    print(t,'unidades antigas',g.fire_unit.nunique(),'novas',g.unit_m.nunique(),'| pontos cuja unidade mudou de composição:',
          (g.groupby('fire_unit').unit_m.transform('nunique')>1).sum())
print('== (e) cisalhamento do pixel sinusoidal × quadrado geográfico (pontos A) ==')
a=pd.read_csv(O+'pilot_4A_sample_v0.1.csv')
shift=231.6*np.abs(np.radians(a.lon)*np.sin(np.radians(a.lat)))   # deslocamento da borda no topo/base (m)
frac=shift/463.3/2*2/2  # fração de área fora ≈ 2 triângulos por lado / área
frac=(2*0.5*231.6*shift*2)/(463.3**2)
print('desloc. de borda (m): mediana %.0f, p90 %.0f, máx %.0f | área do pixel fora do quadrado: mediana %.1f%%, máx %.1f%%'%(np.median(shift),np.percentile(shift,90),shift.max(),np.median(frac)*100,frac.max()*100))
