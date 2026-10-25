// =====================================================================
// B3b_chirps_4B.js  (v0.1) — derivado de 05b_chirps.js v0.2 (mesma lógica)
// Projeto: stable-unburned — PARTE 2 do piloto: savana queimada (4-B)
//
// STATUS: A RODAR.
// O QUE MUDA: amostra = pilot_4B_sample_v0_1 (1899 pontos, modis + hls); período desde 1984 (v0.2, D30);
//   arquivos chirps4B_pentad_band<N>_v0.1.csv. Colunas iguais às de 05b.
// =====================================================================

var P = {
  SAMPLE: 'projects/ee-barroso2501/assets/stable/pilot_4B_sample_v0_1',
  CHIRPS: 'UCSB-CHG/CHIRPS/PENTAD',
  START: '1984-01-01',   // desde 1984: o ano de fogo pelo ciclo de chuva (D30) precisa do CHIRPS do período 1985–2000

  END: '2026-01-01',
  BANDS: [1, 2, 3, 4, 5],
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.2'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var sample = ee.FeatureCollection(P.SAMPLE).select(['point_id', 'lat_band']);
var chirps = ee.ImageCollection(P.CHIRPS).filterDate(P.START, P.END).select('precipitation');
var chirpsProj = chirps.first().projection();

print('Pontos (esperado 1899):', sample.size());
print('Pêntadas no período (esperado ~3000):', chirps.size());
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
    description: 'chirps4B_pentad_band' + b + '_' + P.RUN_TAG.replace('.', '_'),
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: 'chirps4B_pentad_band' + b + '_' + P.RUN_TAG,
    fileFormat: 'CSV',
    selectors: ['point_id', 'lat_band', 'date', 'precip_mm', 'run_tag', 'created']
  });
});
