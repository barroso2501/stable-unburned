// =====================================================================
// B2_amostra_4B.js  (v0.1)
// Projeto: stable-unburned — PARTE 2 do piloto: savana queimada (4-B)
//
// STATUS: A RODAR (depois de B1a e B1c). Conferir o console antes de exportar.
//
// O QUE FAZ  (decisão D29, fixada antes do sorteio)
//   Sorteia duas amostras de pontos na população 4-B:
//
//   A) MODIS (sample_type = 'modis'), como a amostra de A (03_amostra.js):
//      candidatos = pixels MODIS 463 m com pureza ≥ 90% e coerência do
//      histórico de fogo ≥ 90% (B1c), linha e coluna PARES (~926 m entre
//      vizinhos); sorteio estratificado por faixa × estrato, até 300 por classe,
//      semente 42; o pixel de 30 m sob o ponto tem de ser população e do mesmo
//      estrato do pixel MODIS.
//
//   B) HLS (sample_type = 'hls'): até 150 pontos por faixa × estrato nas faixas
//      2–4 (5–20° S), sorteados direto na população de 30 m, sem exigir pureza
//      MODIS, numa grade de 17 × 17 pixels de 30 m (~510 m entre vizinhos).
//      Cobre manchas pequenas e fogos em mosaico; só serve para fogos a partir
//      de ~2019 (série HLS 2018/19–2024/25).
//
//   Para cada ponto: histórico de fogo (n_fires, first_fire, last_fire,
//   signature), pureza e coerência MODIS, e o ponto A mais próximo (≤ 50 km)
//   com a distância em metros — para a comparação A × B pareada (≤ 20 km).
//
// SAÍDAS
//   asset: projects/ee-barroso2501/assets/stable/pilot_4B_sample_v0_1
//   CSV:   Drive/GEE_exports/pilot_4B_sample_v0.1.csv
//
// O QUE PODE QUEBRAR
//   - "Pontos finais por classe" muito abaixo das contagens de B1d (÷ 4 na
//     grade par): o filtro de estrato no pixel de 30 m pode estar descartando
//     demais → mandar o console.
//   - Join do vizinho A lento: reduzir NEAR_MAX_M.
// =====================================================================

var P = {
  POP_ID: 'projects/ee-barroso2501/assets/stable/pilot_4B_cerrado_core_edge250',
  PC_ID: 'projects/ee-barroso2501/assets/stable/pilot_4B_purity_coherence_mcd500',
  SAMPLE_A: 'projects/ee-barroso2501/assets/stable/pilot_4A_sample_v0_1',
  PURITY_MIN: 90,
  COHERENCE_MIN: 90,
  N_MODIS: 300,          // por faixa × estrato
  N_HLS: 150,            // por faixa × estrato, só faixas HLS_BANDS
  HLS_BANDS: [2, 3, 4],
  HLS_GRID_PX: 17,       // espaçamento da grade HLS em pixels de 30 m (~510 m)
  OVERSAMPLE: 1.3,
  SEED: 42,
  NEAR_MAX_M: 50000,
  BBOX: [-61, -25, -41, -2],
  ASSET_OUT: 'projects/ee-barroso2501/assets/stable/pilot_4B_sample_v0_1',
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);
var pop = ee.Image(P.POP_ID);
var popProj = pop.select('lat_band').projection();
var popInfo = popProj.getInfo();
var pc = ee.Image(P.PC_ID);
var mcdProj = pc.projection();

// classe = faixa × 10 + estrato (ex.: 32 = faixa 10–15° S, estrato 2)
function classOf(img) {
  return img.select('lat_band').toInt().multiply(10).add(img.select('stratum').toInt()).rename('cls');
}

// ---------------- A) amostra MODIS ----------------
// faixa e estrato do pixel MODIS = moda dos pixels de 30 m (como em B1d)
var modal = pop.select(['lat_band', 'stratum']).setDefaultProjection(popProj)
  .reduceResolution({reducer: ee.Reducer.mode(), maxPixels: 1024})
  .reproject({crs: mcdProj});
var pxc = ee.Image.pixelCoordinates(mcdProj);
var evenGrid = pxc.select('x').floor().mod(2).eq(0).and(pxc.select('y').floor().mod(2).eq(0));
var candM = classOf(modal).updateMask(
  pc.select('purity').gte(P.PURITY_MIN).and(pc.select('coherence').gte(P.COHERENCE_MIN)).and(evenGrid));

print('Candidatos MODIS por classe (grade par):', ee.Image(1).rename('n').addBands(candM).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'cls'}),
  geometry: bbox, crs: mcdProj, scale: mcdProj.nominalScale(), maxPixels: 1e12, tileScale: 4}));

var drawnM = candM.stratifiedSample({
  numPoints: Math.ceil(P.N_MODIS * P.OVERSAMPLE), classBand: 'cls', region: bbox,
  projection: mcdProj, scale: mcdProj.nominalScale(), seed: P.SEED,
  geometries: true, dropNulls: true, tileScale: 4
});

// atributos a 30 m sob o ponto + pureza/coerência MODIS
var attrs = pop.select(['lat_band', 'stratum', 'n_fires', 'first_fire', 'last_fire', 'signature'])
  .rename(['lat_band_30m', 'stratum_30m', 'n_fires', 'first_fire', 'last_fire', 'signature'])
  .addBands(pop.select('lat_band').gt(0).unmask(0).rename('is_pop'))
  .addBands(pc.select('purity').rename('purity_463m'))
  .addBands(pc.select('coherence').rename('coherence_463m'));

function attach(fc) {
  return attrs.reduceRegions({collection: fc, reducer: ee.Reducer.first(),
                              crs: popInfo.crs, crsTransform: popInfo.transform});
}

var checkedM = attach(drawnM)
  .filter(ee.Filter.eq('is_pop', 1))
  .map(function (f) {   // estrato do pixel de 30 m tem de ser o da classe MODIS
    return f.set('ok', ee.Number(f.get('stratum_30m')).eq(ee.Number(f.get('cls')).mod(10)));
  })
  .filter(ee.Filter.eq('ok', 1))
  .randomColumn('rand', P.SEED);

var classesM = [11, 12, 21, 22, 31, 32, 41, 42, 51, 52];
var sampleM = ee.FeatureCollection(classesM.map(function (c) {
  return checkedM.filter(ee.Filter.eq('cls', c)).sort('rand').limit(P.N_MODIS)
    .map(function (f) {
      return f.set({sample_type: 'modis',
                    point_id: ee.String('B').cat(ee.Number(c).format('%d')).cat('_').cat(ee.String(f.get('system:index')))});
    });
})).flatten();

// ---------------- B) amostra HLS ----------------
var pxp = ee.Image.pixelCoordinates(popProj);
var gridH = pxp.select('x').floor().mod(P.HLS_GRID_PX).eq(0).and(pxp.select('y').floor().mod(P.HLS_GRID_PX).eq(0));
var candH = classOf(pop).updateMask(gridH);
var drawnH = candH.stratifiedSample({
  numPoints: P.N_HLS, classBand: 'cls', region: bbox,
  projection: popProj, scale: popProj.nominalScale(), seed: P.SEED + 1,
  geometries: true, dropNulls: true, tileScale: 8
});
var classesH = [];
P.HLS_BANDS.forEach(function (b) { classesH.push(b * 10 + 1, b * 10 + 2); });
var sampleH = attach(drawnH.filter(ee.Filter.inList('cls', classesH)))
  .filter(ee.Filter.eq('is_pop', 1))
  .map(function (f) {
    return f.set({sample_type: 'hls',
                  point_id: ee.String('H').cat(ee.Number(f.get('cls')).format('%d')).cat('_').cat(ee.String(f.get('system:index')))});
  });

// ---------------- vizinho A mais próximo ----------------
var sampleA = ee.FeatureCollection(P.SAMPLE_A).select(['point_id'], ['a_point_id']);
var join = ee.Join.saveBest({matchKey: 'nearA', measureKey: 'dist_A_m'});
var near = ee.Filter.withinDistance({distance: P.NEAR_MAX_M, leftField: '.geo', rightField: '.geo', maxError: 10});

var sample = join.apply(sampleM.merge(sampleH), sampleA, near).map(function (f) {
  var c = f.geometry().coordinates();
  var a = ee.Feature(f.get('nearA'));
  return f.set({
    lon: c.get(0), lat: c.get(1),
    lat_band: ee.Number(f.get('cls')).divide(10).floor(),
    stratum: ee.Number(f.get('cls')).mod(10),
    near_A_id: a.get('a_point_id'),
    seed: P.SEED, purity_min_pct: P.PURITY_MIN, coherence_min_pct: P.COHERENCE_MIN,
    pop_asset: P.POP_ID, run_tag: P.RUN_TAG, created: created
  });
});
// pontos sem A a ≤ NEAR_MAX_M não entram no join → recolocá-los com campos vazios
var noA = sampleM.merge(sampleH).filter(ee.Filter.inList('point_id', sample.aggregate_array('point_id')).not())
  .map(function (f) {
    var c = f.geometry().coordinates();
    return f.set({lon: c.get(0), lat: c.get(1),
                  lat_band: ee.Number(f.get('cls')).divide(10).floor(), stratum: ee.Number(f.get('cls')).mod(10),
                  near_A_id: '', dist_A_m: -1, seed: P.SEED, purity_min_pct: P.PURITY_MIN,
                  coherence_min_pct: P.COHERENCE_MIN, pop_asset: P.POP_ID, run_tag: P.RUN_TAG, created: created});
  });
sample = sample.merge(noA);

print('Pontos finais por tipo:', sample.aggregate_histogram('sample_type'));
print('Pontos MODIS por classe:', sample.filter(ee.Filter.eq('sample_type', 'modis')).aggregate_histogram('cls'));
print('Pontos HLS por classe:', sample.filter(ee.Filter.eq('sample_type', 'hls')).aggregate_histogram('cls'));
print('Nº de pontos / ids distintos (devem ser iguais):', sample.size(), sample.aggregate_count_distinct('point_id'));
print('Pontos com A a ≤ 20 km:', sample.filter(ee.Filter.rangeContains('dist_A_m', 0, 20000)).size());
print('Prévia:', sample.limit(3));

var cols = ['point_id', 'sample_type', 'lat_band', 'stratum', 'cls', 'lon', 'lat',
            'n_fires', 'first_fire', 'last_fire', 'signature', 'purity_463m', 'coherence_463m',
            'near_A_id', 'dist_A_m', 'seed', 'purity_min_pct', 'coherence_min_pct', 'pop_asset', 'run_tag', 'created'];

Export.table.toAsset({collection: sample.select(cols), description: 'pilot_4B_sample_v0_1_asset', assetId: P.ASSET_OUT});
Export.table.toDrive({collection: sample, description: 'pilot_4B_sample_v0_1_csv', folder: P.EXPORT_FOLDER,
                      fileNamePrefix: 'pilot_4B_sample_' + P.RUN_TAG, fileFormat: 'CSV', selectors: cols});

Map.centerObject(bbox, 5);
Map.addLayer(sample.filter(ee.Filter.eq('sample_type', 'modis')), {color: 'e63946'}, 'B — MODIS');
Map.addLayer(sample.filter(ee.Filter.eq('sample_type', 'hls')), {color: 'f4a261'}, 'B — HLS');
Map.addLayer(ee.FeatureCollection(P.SAMPLE_A), {color: '1d3557'}, 'A');
