// =====================================================================
// 03_amostra.js
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: EXECUTADO em 2026-10-24 (1215 pontos; ver docs/execucoes.md).
//
// O QUE FAZ
//   Sorteia a amostra de pontos do piloto, estratificada por faixa de
//   latitude (D14), a mesma para MODIS e HLS:
//     1. candidatos = pixels MODIS de 463 m com pureza ≥ 90% (02c);
//     2. só pixels com linha e coluna PARES na grade MODIS → no máximo
//        um ponto a cada 2 pixels (~926 m entre pontos vizinhos),
//        o que cumpre a distância mínima de 500 m do plano;
//     3. sorteio estratificado (semente fixa) de N_PER_BAND pontos por
//        faixa, com sobra de 20%;
//     4. confere se o pixel de 30 m sob o ponto pertence à população
//        (02a); descarta os que não pertencem e fica com N_PER_BAND;
//     5. grava em cada ponto: faixa, pureza 463 m, pureza 232 m,
//        lon, lat, id.
//   A faixa 20–25° S (exploratória, D15) terá poucos pontos.
//
// SAÍDAS
//   asset: projects/ee-barroso2501/assets/stable/pilot_4A_sample_v0_1
//   CSV:   Drive/GEE_exports/pilot_4A_sample_v0.1.csv
// =====================================================================

var P = {
  POP_ID: 'projects/ee-barroso2501/assets/stable/pilot_4A_cerrado_core_edge250',
  PUR_500: 'projects/ee-barroso2501/assets/stable/pilot_4A_purity_mcd500',
  PUR_250: 'projects/ee-barroso2501/assets/stable/pilot_4A_purity_mod13q1',
  PURITY_MIN: 90,          // % no pixel de 463 m
  N_PER_BAND: 300,         // pontos por faixa (proposta; faixa 5 terá menos)
  OVERSAMPLE: 1.2,         // sobra para compensar descartes do passo 4
  SEED: 42,
  LAT_BAND_DEG: 5,
  BANDS: [1, 2, 3, 4, 5],
  BBOX: [-61, -25, -41, -2],
  ASSET_OUT: 'projects/ee-barroso2501/assets/stable/pilot_4A_sample_v0_1',
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);

var pop = ee.Image(P.POP_ID);                 // banda lat_band, 30 m
var pur500 = ee.Image(P.PUR_500);             // 0–100, grade 463 m
var pur250 = ee.Image(P.PUR_250);             // 0–100, grade 232 m
var mcdProj = pur500.projection();
var popInfo = pop.projection().getInfo();

// --- 1–2. Candidatos: pixels puros com linha e coluna pares na grade MODIS
var pc = ee.Image.pixelCoordinates(mcdProj);
var evenGrid = pc.select('x').floor().mod(2).eq(0)
  .and(pc.select('y').floor().mod(2).eq(0));

var latBand = ee.Image.pixelLonLat().select('latitude')
  .multiply(-1).divide(P.LAT_BAND_DEG).floor().add(1).toInt().rename('lat_band');

var candidates = latBand.updateMask(pur500.gte(P.PURITY_MIN).and(evenGrid));

// Quantos candidatos há por faixa (para saber se N_PER_BAND é atingível)
print('Candidatos por faixa (pixels 463 m puros, grade par):',
  ee.Image(1).rename('n').addBands(candidates).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'lat_band'}),
    geometry: bbox, crs: mcdProj, scale: mcdProj.nominalScale(), maxPixels: 1e12, tileScale: 4
  }));

// --- 3. Sorteio estratificado (pontos no centro dos pixels de 463 m)
var nDraw = Math.ceil(P.N_PER_BAND * P.OVERSAMPLE);
var drawn = candidates.stratifiedSample({
  numPoints: nDraw,
  classBand: 'lat_band',
  region: bbox,
  projection: mcdProj,
  scale: mcdProj.nominalScale(),
  seed: P.SEED,
  geometries: true,
  dropNulls: true,
  tileScale: 4
});

// --- 4. Confere a população a 30 m sob cada ponto e anexa as purezas
var attrs = pop.gt(0).unmask(0).rename('is_pop')
  .addBands(pur500.rename('purity_463m'))
  .addBands(pur250.unmask(0).rename('purity_232m'));

var checked = attrs.reduceRegions({
  collection: drawn,
  reducer: ee.Reducer.first(),
  crs: popInfo.crs,
  crsTransform: popInfo.transform
}).filter(ee.Filter.eq('is_pop', 1))
  .randomColumn('rand', P.SEED);

// Fica com N_PER_BAND por faixa (ordem aleatória, semente fixa)
var sample = ee.FeatureCollection(P.BANDS.map(function (b) {
  return checked.filter(ee.Filter.eq('lat_band', b)).sort('rand').limit(P.N_PER_BAND);
})).flatten();

// --- 5. Atributos finais
sample = sample.map(function (f) {
  var c = f.geometry().coordinates();
  return f.set({
    lon: c.get(0), lat: c.get(1),
    // id único: faixa + índice interno da feição (o índice derivado de
    // 'rand' da v0.1 podia repetir dentro da faixa)
    point_id: ee.String('P').cat(ee.Number(f.get('lat_band')).format('%d'))
      .cat('_').cat(ee.String(f.get('system:index'))),
    seed: P.SEED, purity_min_pct: P.PURITY_MIN, n_per_band: P.N_PER_BAND,
    pop_asset: P.POP_ID, run_tag: P.RUN_TAG, created: created
  });
});

print('Pontos finais por faixa:', sample.aggregate_histogram('lat_band'));
print('Prévia:', sample.limit(5));
// Checagem: ids devem ser todos distintos (os dois números iguais)
print('Nº de pontos / nº de ids distintos:', sample.size(), sample.aggregate_count_distinct('point_id'));

Export.table.toAsset({
  collection: sample,
  description: 'pilot_4A_sample_v0_1_asset',
  assetId: P.ASSET_OUT
});

Export.table.toDrive({
  collection: sample,
  description: 'pilot_4A_sample_v0_1_csv',
  folder: P.EXPORT_FOLDER,
  fileNamePrefix: 'pilot_4A_sample_' + P.RUN_TAG,
  fileFormat: 'CSV',
  selectors: ['point_id', 'lat_band', 'lon', 'lat', 'purity_463m', 'purity_232m',
              'seed', 'purity_min_pct', 'n_per_band', 'pop_asset', 'run_tag', 'created']
});

Map.centerObject(bbox, 5);
Map.addLayer(sample, {color: 'ff0000'}, 'amostra');
