// =====================================================================
// 05b_chirps.js
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: A RODAR.
//
// O QUE FAZ
//   Extrai a precipitação CHIRPS v2.0 por pêntada (5–6 dias, 0,05° ≈ 5,5 km)
//   nos 1215 pontos da amostra, de 2000 a 2025, para calcular o início e o
//   fim da estação chuvosa (método de acumulação anômala, em Python, etapa 07)
//   e comparar com o início do verdor (etapa 06).
//   Uma tarefa por faixa de latitude.
//
//   Observação de escala: vários pontos próximos caem na mesma célula de
//   ~5,5 km; eles terão a mesma série de chuva.
//
// SAÍDAS (Drive/GEE_exports)
//   chirps_pentad_band<N>_v0.2.csv
//   colunas: point_id, lat_band, date (início da pêntada), precip_mm (total da pêntada)
// =====================================================================

var P = {
  SAMPLE: 'projects/ee-barroso2501/assets/stable/pilot_4A_sample_v0_1',
  CHIRPS: 'UCSB-CHG/CHIRPS/PENTAD',
  START: '2000-01-01',
  END: '2026-01-01',
  BANDS: [1, 2, 3, 4, 5],
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.2'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var sample = ee.FeatureCollection(P.SAMPLE).select(['point_id', 'lat_band']);
var chirps = ee.ImageCollection(P.CHIRPS).filterDate(P.START, P.END).select('precipitation');
var chirpsProj = chirps.first().projection();

print('Pontos (esperado 1215):', sample.size());
print('Pêntadas no período (esperado ~1870):', chirps.size());
print('Última pêntada disponível:', ee.Date(chirps.aggregate_max('system:time_start')).format('YYYY-MM-dd'));

P.BANDS.forEach(function (b) {
  var pts = sample.filter(ee.Filter.eq('lat_band', b));
  var fc = chirps.map(function (img) {
    var date = ee.Date(img.get('system:time_start')).format('YYYY-MM-dd');
    // Com imagem de banda única, reduceRegions nomeia a saída pelo redutor
    // ('first'), não pela banda: setOutputs força o nome 'precip_mm'.
    // (Sem isso, a v0.1 exportou CSVs vazios.)
    return img.reduceRegions({
      collection: pts, reducer: ee.Reducer.first().setOutputs(['precip_mm']),
      crs: chirpsProj, scale: chirpsProj.nominalScale()
    }).filter(ee.Filter.notNull(['precip_mm']))
      .map(function (f) { return f.set({date: date, run_tag: P.RUN_TAG, created: created}); });
  }).flatten();

  // Checagem antes de exportar: a prévia precisa mostrar linhas com precip_mm
  if (b === P.BANDS[0]) { print('Prévia faixa ' + b + ' (deve ter 3 linhas):', fc.limit(3)); }

  Export.table.toDrive({
    collection: fc,
    description: 'chirps_pentad_band' + b + '_' + P.RUN_TAG.replace('.', '_'),
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: 'chirps_pentad_band' + b + '_' + P.RUN_TAG,
    fileFormat: 'CSV',
    selectors: ['point_id', 'lat_band', 'date', 'precip_mm', 'run_tag', 'created']
  });
});
