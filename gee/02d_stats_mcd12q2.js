// =====================================================================
// 02d_stats_mcd12q2.js
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: EXECUTADO em 2026-10-24 (ver docs/execucoes.md).
//
// O QUE FAZ
//   S1. Pureza: quantos pixels MODIS (463 m e 232 m) são ocupados pela
//       população em ≥ 80%, ≥ 90% e 100%, por faixa de latitude.
//       → critério de viabilidade "pureza MODIS".
//   S2. MCD12Q2 2016–2024: nos pixels de 463 m com pureza ≥ 90%, quantos
//       têm 0, 1, 2 e ≥ 3 ciclos de vegetação por ano e por faixa, e
//       quantos têm o ciclo 1 com qualidade boa (QA_Overall_1 ≤ 1).
//       → critério "número de picos informativo".
//
// SAÍDAS (Drive/GEE_exports)
//   pilot_4A_purity_counts_v0.2.csv
//   pilot_4A_mcd12q2_cycles_v0.2.csv
//   lat_band: 1 = 0–5° S · 2 = 5–10° S · 3 = 10–15° S · 4 = 15–20° S · 5 = 20–25° S
// =====================================================================

var P = {
  PUR_500: 'projects/ee-barroso2501/assets/stable/pilot_4A_purity_mcd500',
  PUR_250: 'projects/ee-barroso2501/assets/stable/pilot_4A_purity_mod13q1',
  MCD12Q2: 'MODIS/061/MCD12Q2',
  MCD_YEARS: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  PURITY_MIN: 90,              // % (a decidir; S1 mostra 80/90/100)
  LAT_BAND_DEG: 5,
  BBOX: [-61, -25, -41, -2],
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.2'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);

function latBand() {
  return ee.Image.pixelLonLat().select('latitude')
    .multiply(-1).divide(P.LAT_BAND_DEG).floor().add(1);
}

var pur500 = ee.Image(P.PUR_500);     // 0–100, mascarado fora do Cerrado
var pur250 = ee.Image(P.PUR_250);
var info500 = pur500.projection().getInfo();
var info250 = pur250.projection().getInfo();

// --- S1. Pixels por classe de pureza (aritmética, sem where)
// classe: 1 = 80–89%, 2 = 90–99%, 3 = 100%
function purityCounts(pur, info, gridName) {
  var cls = pur.gte(80).add(pur.gte(90)).add(pur.gte(100));      // 0–3
  var code = latBand().multiply(10).add(cls).updateMask(cls.gt(0)).rename('code').toInt();
  var res = ee.Image(1).rename('n').addBands(code).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
    geometry: bbox, crs: info.crs, crsTransform: info.transform,
    maxPixels: 1e12, tileScale: 4
  });
  return ee.FeatureCollection(ee.List(res.get('groups')).map(function (g) {
    g = ee.Dictionary(g);
    var c = ee.Number(g.get('code'));
    return ee.Feature(null, {
      grid: gridName,
      lat_band: c.divide(10).floor(),
      purity_class: ee.List(['', '80-89%', '90-99%', '100%']).get(c.mod(10)),
      n_pixels: g.get('sum'),
      run_tag: P.RUN_TAG, created: created
    });
  }));
}

var s1 = purityCounts(pur500, info500, 'MCD12Q2_463m')
  .merge(purityCounts(pur250, info250, 'MOD13Q1_232m'));
print('Prévia S1 (pureza):', s1.limit(10));

Export.table.toDrive({
  collection: s1,
  description: 'pilot_4A_purity_counts_v0_2',
  folder: P.EXPORT_FOLDER,
  fileNamePrefix: 'pilot_4A_purity_counts_v0.2',
  fileFormat: 'CSV',
  selectors: ['grid', 'lat_band', 'purity_class', 'n_pixels', 'run_tag', 'created']
});

// --- S2. Ciclos MCD12Q2 nos pixels de 463 m com pureza ≥ PURITY_MIN
var pureMask = pur500.gte(P.PURITY_MIN);
var mcd = ee.ImageCollection(P.MCD12Q2);

var s2 = ee.FeatureCollection(P.MCD_YEARS.map(function (y) {
  var img = mcd.filterDate(y + '-01-01', (y + 1) + '-01-01').first();
  // Pixel sem ciclo válido aparece mascarado no produto → conta como 0 ciclos
  var nc = img.select('NumCycles').unmask(0).min(3);              // 0, 1, 2, 3 (= ≥3)
  var good = img.select('QA_Overall_1').unmask(9).lte(1);          // ciclo 1 com QA 0–1
  var code = latBand().multiply(10).add(nc).rename('code').toInt();
  var res = ee.Image(1).rename('n').addBands(good.rename('good')).addBands(code)
    .updateMask(pureMask)
    .reduceRegion({
      reducer: ee.Reducer.sum().repeat(2).group({groupField: 2, groupName: 'code'}),
      geometry: bbox, crs: info500.crs, crsTransform: info500.transform,
      maxPixels: 1e12, tileScale: 4
    });
  return ee.FeatureCollection(ee.List(res.get('groups')).map(function (g) {
    g = ee.Dictionary(g);
    var c = ee.Number(g.get('code'));
    var sums = ee.List(g.get('sum'));
    return ee.Feature(null, {
      year: y,
      lat_band: c.divide(10).floor(),
      num_cycles: ee.List(['0', '1', '2', '>=3']).get(c.mod(10)),
      n_pixels: sums.get(0),
      n_cycle1_qa01: sums.get(1),
      purity_min_pct: P.PURITY_MIN, mcd_asset: P.MCD12Q2,
      run_tag: P.RUN_TAG, created: created
    });
  }));
})).flatten();
print('Prévia S2 (ciclos, primeiras linhas):', s2.limit(10));

Export.table.toDrive({
  collection: s2,
  description: 'pilot_4A_mcd12q2_cycles_v0_2',
  folder: P.EXPORT_FOLDER,
  fileNamePrefix: 'pilot_4A_mcd12q2_cycles_v0.2',
  fileFormat: 'CSV',
  selectors: ['year', 'lat_band', 'num_cycles', 'n_pixels', 'n_cycle1_qa01',
              'purity_min_pct', 'mcd_asset', 'run_tag', 'created']
});
