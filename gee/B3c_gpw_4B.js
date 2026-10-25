// =====================================================================
// B3c_gpw_4B.js  (v0.1) — derivado de 04b_gpw_altura.js (mesma lógica)
// Projeto: stable-unburned — PARTE 2 do piloto: savana queimada (4-B)
//
// STATUS: A RODAR (TEST = true primeiro).
// O QUE MUDA: amostra = pilot_4B_sample_v0_1; população = pilot_4B_cerrado_core_edge250;
//   arquivo gpw4B_height_v0.1.csv. Nos pontos 'hls' (não puros no pixel MODIS),
//   a altura usa só os pixels de 30 m da população dentro do quadrado (pode ser
//   uma fração pequena: ver n_px).
// =====================================================================

var P = {
  SAMPLE: 'projects/ee-barroso2501/assets/stable/pilot_4B_sample_v0_1',
  POP: 'projects/ee-barroso2501/assets/stable/pilot_4B_cerrado_core_edge250',
  GPW: 'projects/global-pasture-watch/assets/gsvh-30m/v1/short-veg-height_m',
  HALF_SIDE_M: 231.6,   // meio lado do pixel MODIS 463 m
  TEST: true,
  TEST_N_POINTS: 20,
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var sample = ee.FeatureCollection(P.SAMPLE).select(['point_id', 'lat_band']);
var pop = ee.Image(P.POP).select(0).mask().gt(0);
var gpw = ee.ImageCollection(P.GPW);
var proj = ee.Image(gpw.first()).projection();

var squares = sample.map(function (f) {
  return f.setGeometry(f.geometry().buffer(P.HALF_SIDE_M).bounds());
});

// estatísticas da altura (m) nos pixels de 30 m da população dentro do quadrado
var reducer = ee.Reducer.count().setOutputs(['n_px'])
  .combine(ee.Reducer.mean().setOutputs(['h_mean']), null, true)
  .combine(ee.Reducer.median().setOutputs(['h_median']), null, true)
  .combine(ee.Reducer.percentile([10, 90]).setOutputs(['h_p10', 'h_p90']), null, true);

function extract(pts) {
  return gpw.map(function (img) {
    img = ee.Image(img);
    var year = ee.Date(img.get('system:time_start')).get('year');
    var h = img.select('height').multiply(0.1).updateMask(pop);
    return h.reduceRegions({collection: pts, reducer: reducer, crs: proj, scale: proj.nominalScale()})
      .filter(ee.Filter.gt('n_px', 0))
      .map(function (f) {
        return f.setGeometry(null).set({year: year, run_tag: P.RUN_TAG, created: created});
      });
  }).flatten();
}

print('GPW: nº de imagens (anos):', gpw.size());
print('GPW: anos disponíveis:', gpw.aggregate_array('system:time_start')
  .map(function (t) { return ee.Date(t).get('year'); }));
print('GPW: bandas da 1ª imagem:', ee.Image(gpw.first()).bandNames());

if (P.TEST) {
  var t = extract(squares.limit(P.TEST_N_POINTS));
  print('Prévia (h_mean em m; deve ter valores):', t.limit(5));
  print('Linhas ponto × ano no teste:', t.size());
  print('Pontos com dado (de ' + P.TEST_N_POINTS + '):', t.aggregate_count_distinct('point_id'));
} else {
  Export.table.toDrive({
    collection: extract(squares),
    description: 'gpw4B_height_' + P.RUN_TAG.replace('.', '_'),
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: 'gpw4B_height_' + P.RUN_TAG,
    fileFormat: 'CSV',
    selectors: ['point_id', 'lat_band', 'year', 'n_px', 'h_mean', 'h_median', 'h_p10', 'h_p90', 'run_tag', 'created']
  });
}
