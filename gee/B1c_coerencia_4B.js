// =====================================================================
// B1c_coerencia_4B.js  (v0.1)
// Projeto: stable-unburned — PARTE 2 do piloto: savana queimada (4-B)
//
// STATUS: A RODAR depois de B1a.
//
// O QUE FAZ  (decisão D26)
//   Na grade MODIS de 463 m (MCD12Q2), calcula para cada pixel MODIS:
//     purity     % da área do pixel que é população 4-B (qualquer histórico)
//     coherence  % mínima, entre os anos 2001–2025, de concordância do status
//                de queima dentro do pixel:  min_ano( max(f, 1 − f) ), onde f =
//                fração dos pixels de 30 m da população que queimaram no ano.
//                100 = todos os pixels de 30 m com o mesmo histórico de fogo.
//   O filtro de amostragem será purity ≥ 90 e coherence ≥ 90 (a confirmar com
//   as contagens de B1d, antes de sortear a amostra).
//
// POR QUE NÃO SÓ A PUREZA
//   Cicatrizes de fogo são irregulares em 30 m: um pixel MODIS 100% savana 4-B
//   pode estar meio queimado num ano. A coerência garante que a série MODIS do
//   pixel responde ao mesmo histórico de fogo.
//
// RESSALVA (D26)
//   A coerência favorece fogos grandes e homogêneos; fogos pequenos e em manchas
//   (típicos de raio e da estação úmida) tendem a ser excluídos → medir o viés
//   em B1d e cobrir com o HLS.
//
// SAÍDA
//   projects/ee-barroso2501/assets/stable/pilot_4B_purity_coherence_mcd500
// =====================================================================

var P = {
  POP_ID: 'projects/ee-barroso2501/assets/stable/pilot_4B_cerrado_core_edge250',
  MCD12Q2: 'MODIS/061/MCD12Q2',
  FIRST: 2001,
  LAST: 2025,
  BBOX: [-61, -25, -41, -2],
  OUT: 'projects/ee-barroso2501/assets/stable/pilot_4B_purity_coherence_mcd500',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);
var popAsset = ee.Image(P.POP_ID);
var popProj = popAsset.select('lat_band').projection();
var inPop = popAsset.select('lat_band').gt(0).unmask(0).toFloat();
var sig = popAsset.select('signature').unmask(0).toInt32();

// banda por ano: 1 se pixel da população queimou no ano (bit da assinatura)
var bands = [inPop.rename('pop')];
for (var y = P.FIRST; y <= P.LAST; y++) {
  bands.push(sig.rightShift(y - P.FIRST).bitwiseAnd(1).toFloat().multiply(inPop).rename('b' + y));
}
// setDefaultProjection: evita o erro "no valid default projection" do reduceResolution (02c)
var stack = ee.Image.cat(bands).setDefaultProjection(popProj);

var mcdProj = ee.ImageCollection(P.MCD12Q2).first().projection();
var mcdPI = mcdProj.getInfo();
var means = stack.reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 1024}).reproject({crs: mcdProj});

var popFrac = means.select('pop');
var coh = ee.Image(1);
for (var y2 = P.FIRST; y2 <= P.LAST; y2++) {
  var f = means.select('b' + y2).divide(popFrac.max(1e-6));   // fração queimada entre os pixels da população
  coh = coh.min(f.max(ee.Image(1).subtract(f)));
}
var out = popFrac.multiply(100).round().toByte().rename('purity')
  .addBands(coh.multiply(100).round().toByte().rename('coherence'))
  .updateMask(popFrac.gt(0))
  .set({pop_asset: P.POP_ID, units: 'percent', years: P.FIRST + '-' + P.LAST,
        run_tag: P.RUN_TAG, created: created});

Map.centerObject(ee.Geometry.Point([-47.8, -15.8]), 9);
Map.addLayer(out.select('coherence'), {min: 50, max: 100, palette: ['d73027', 'fee08b', '1a9850']},
             'coerência (prévia)', false);

Export.image.toAsset({
  image: out,
  description: 'pilot_4B_purity_coherence_mcd500',
  assetId: P.OUT,
  region: bbox, crs: mcdPI.crs, crsTransform: mcdPI.transform,
  maxPixels: 1e13, pyramidingPolicy: {'.default': 'mean'}
});
