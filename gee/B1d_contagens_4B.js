// =====================================================================
// B1d_contagens_4B.js  (v0.1)
// Projeto: stable-unburned — PARTE 2 do piloto: savana queimada (4-B)
//
// STATUS: A RODAR depois de B1a e B1c.
//
// O QUE FAZ
//   Conta pixels MODIS de 463 m candidatos à amostra da parte 2, por
//   faixa × estrato × classe de pureza × classe de coerência, para fixar
//   os limiares de pureza e coerência ANTES de sortear a amostra (lição da
//   parte 1: limiares não fixados a priori).
//   Estrato e faixa do pixel MODIS = moda dos pixels de 30 m da população.
//
//   classes de pureza:    0 = < 80 · 1 = 80–89 · 2 = ≥ 90
//   classes de coerência: 0 = < 80 · 1 = 80–89 · 2 = 90–99 · 3 = 100
//
// SAÍDA (Drive/GEE_exports)
//   pilot_4B_candidates_mcd500_v0.1.csv
//   colunas: lat_band, stratum, purity_class, coherence_class, n_pixels
// =====================================================================

var P = {
  POP_ID: 'projects/ee-barroso2501/assets/stable/pilot_4B_cerrado_core_edge250',
  PC_ID: 'projects/ee-barroso2501/assets/stable/pilot_4B_purity_coherence_mcd500',
  BBOX: [-61, -25, -41, -2],
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);
var pc = ee.Image(P.PC_ID);
var mcdProj = pc.projection();
var mcdPI = mcdProj.getInfo();

// faixa e estrato do pixel MODIS = moda dos pixels de 30 m
var pop = ee.Image(P.POP_ID);
var modal = pop.select(['lat_band', 'stratum']).setDefaultProjection(pop.select('lat_band').projection())
  .reduceResolution({reducer: ee.Reducer.mode(), maxPixels: 1024})
  .reproject({crs: mcdProj});

var pur = pc.select('purity'), coh = pc.select('coherence');
var purClass = pur.gte(80).add(pur.gte(90));
var cohClass = coh.gte(80).add(coh.gte(90)).add(coh.gte(100));
var code = modal.select('lat_band').toInt().multiply(1000)
  .add(modal.select('stratum').toInt().multiply(100))
  .add(purClass.multiply(10)).add(cohClass)
  .rename('code').toInt();

var res = ee.Image(1).rename('n').addBands(code).reduceRegion({
  reducer: ee.Reducer.count().group({groupField: 1, groupName: 'code'}),
  geometry: bbox, crs: mcdPI.crs, crsTransform: mcdPI.transform, maxPixels: 1e10, tileScale: 8
});
var fc = ee.FeatureCollection(ee.List(res.get('groups')).map(function (g) {
  g = ee.Dictionary(g);
  var c = ee.Number(g.get('code'));
  return ee.Feature(null, {
    lat_band: c.divide(1000).floor(), stratum: c.mod(1000).divide(100).floor(),
    purity_class: c.mod(100).divide(10).floor(), coherence_class: c.mod(10),
    n_pixels: g.get('count'), run_tag: P.RUN_TAG, created: created
  });
}));
print('Prévia (primeiras linhas):', fc.limit(10));

Export.table.toDrive({
  collection: fc,
  description: 'pilot_4B_candidates_mcd500_' + P.RUN_TAG.replace('.', '_'),
  folder: P.EXPORT_FOLDER,
  fileNamePrefix: 'pilot_4B_candidates_mcd500_' + P.RUN_TAG,
  fileFormat: 'CSV',
  selectors: ['lat_band', 'stratum', 'purity_class', 'coherence_class', 'n_pixels', 'run_tag', 'created']
});
