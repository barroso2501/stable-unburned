// =====================================================================
// 05_series.js
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: A RODAR. Rodar PRIMEIRO em modo teste (TEST_POINTS > 0).
//
// O QUE FAZ
//   Extrai as séries temporais dos 1215 pontos da amostra (etapa 03)
//   para três produtos, em formato longo (1 linha por ponto × data):
//
//   1. MOD13Q1 (MODIS 232 m, composição de 16 dias), 2000–2025
//      colunas: EVI (bruto, ×0,0001), SummaryQA (0 bom, 1 marginal,
//      2 neve, 3 nuvem), DayOfYear (dia real da observação no composto)
//   2. MCD43A4 (MODIS 463 m, NBAR com correção BRDF), 2000–2025
//      EVI calculado no GEE a partir das reflectâncias NBAR diárias e
//      resumido em janelas de 8 dias: mediana do EVI nos dias válidos,
//      nº de dias válidos e nº de dias com inversão completa (qualidade 0)
//   3. HLS v2.0 (30 m), L30 (Landsat 8/9) e S30 (Sentinel-2), 2016–2025
//      só observações válidas pelo Fmask (sem nuvem, adjacente a nuvem,
//      sombra, neve ou água); colunas: blue, red, nir (brutas, como estão
//      no GEE) e Fmask. O EVI do HLS é calculado depois, em Python, para
//      não depender de suposição sobre a escala das bandas no GEE.
//
//   Exportação dividida por produto × faixa de latitude (e, no HLS,
//   também por período), para evitar tarefas grandes demais.
//
// SAÍDAS (Drive/GEE_exports)
//   series_<produto>_band<N>[_<período>]_<RUN_TAG>.csv
//   colunas comuns: point_id, lat_band, product, date + bandas do produto
// =====================================================================

var P = {
  SAMPLE: 'projects/ee-barroso2501/assets/stable/pilot_4A_sample_v0_1',

  // Quais produtos exportar nesta rodada
  RUN: {MOD13Q1: true, MCD43A4: true, HLS_L30: true, HLS_S30: true},

  BANDS: [1, 2, 3, 4, 5],

  MODIS_START: '2000-01-01',
  MODIS_END: '2026-01-01',
  // Períodos do HLS (uma tarefa por período × faixa × sensor)
  HLS_PERIODS: [['2016-01-01', '2021-01-01', '2016_2020'],
                ['2021-01-01', '2026-01-01', '2021_2025']],

  // MODO TESTE: se > 0, usa só os N primeiros pontos de cada faixa,
  // só a faixa 3 e só o ano TEST_YEAR. Rode assim primeiro para medir
  // o tempo e conferir as colunas; depois ponha 0.
  TEST_POINTS: 10,
  TEST_YEAR: 2020,

  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var sample = ee.FeatureCollection(P.SAMPLE).select(['point_id', 'lat_band']);
print('Pontos na amostra (esperado 1215):', sample.size());

var testing = P.TEST_POINTS > 0;
var bandsToRun = testing ? [3] : P.BANDS;

// Período efetivo (no teste, um ano só)
function period(start, end) {
  if (testing) { return [P.TEST_YEAR + '-01-01', (P.TEST_YEAR + 1) + '-01-01']; }
  return [start, end];
}

// Pontos de uma faixa (no teste, os N primeiros)
function pointsOfBand(b) {
  var pts = sample.filter(ee.Filter.eq('lat_band', b));
  return testing ? pts.limit(P.TEST_POINTS) : pts;
}

// Amostra uma coleção de imagens nos pontos e devolve 1 linha por
// ponto × imagem, só onde há valor (pixel não mascarado).
// bandNames: bandas exportadas; checkBand: banda usada para descartar nulos.
function sampleCollection(col, pts, scale, crs, productName, bandNames, checkBand) {
  return col.map(function (img) {
    var date = ee.Date(img.get('system:time_start')).format('YYYY-MM-dd');
    var args = {collection: pts, reducer: ee.Reducer.first(), scale: scale};
    if (crs) { args.crs = crs; }
    return img.select(bandNames).reduceRegions(args)
      .filter(ee.Filter.notNull([checkBand]))
      .map(function (f) {
        return f.set({product: productName, date: date, run_tag: P.RUN_TAG, created: created});
      });
  }).flatten();
}

function exportTable(fc, name, columns) {
  Export.table.toDrive({
    collection: fc,
    description: name.replace(/\./g, '_'),
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: name,
    fileFormat: 'CSV',
    selectors: ['point_id', 'lat_band', 'product', 'date'].concat(columns).concat(['run_tag', 'created'])
  });
}

// ---------------------------------------------------------------------
// 1. MOD13Q1 — EVI 16 dias, 232 m
// ---------------------------------------------------------------------
if (P.RUN.MOD13Q1) {
  var mod = ee.ImageCollection('MODIS/061/MOD13Q1');
  var modProj = mod.first().select('EVI').projection();
  var modBands = ['EVI', 'SummaryQA', 'DayOfYear'];
  var pm = period(P.MODIS_START, P.MODIS_END);
  bandsToRun.forEach(function (b) {
    var pts = pointsOfBand(b);
    var col = mod.filterDate(pm[0], pm[1]);
    var fc = sampleCollection(col, pts, modProj.nominalScale(), modProj, 'MOD13Q1', modBands, 'EVI');
    exportTable(fc, 'series_MOD13Q1_band' + b + (testing ? '_TEST' : '') + '_' + P.RUN_TAG, modBands);
  });
}

// ---------------------------------------------------------------------
// 2. MCD43A4 — EVI de NBAR diário, resumido em janelas de 8 dias
// ---------------------------------------------------------------------
if (P.RUN.MCD43A4) {
  var nbar = ee.ImageCollection('MODIS/061/MCD43A4');
  var nbarProj = nbar.first().select('Nadir_Reflectance_Band1').projection();

  // EVI diário: banda 1 = vermelho, 2 = NIR, 3 = azul; escala 0,0001.
  // Válido se as bandas 1–3 têm qualidade 0 (inversão completa) ou
  // 1 (magnitude). 'full' marca os dias com as três em 0.
  var daily = nbar.map(function (img) {
    var red = img.select('Nadir_Reflectance_Band1').multiply(0.0001);
    var nir = img.select('Nadir_Reflectance_Band2').multiply(0.0001);
    var blue = img.select('Nadir_Reflectance_Band3').multiply(0.0001);
    var q1 = img.select('BRDF_Albedo_Band_Mandatory_Quality_Band1');
    var q2 = img.select('BRDF_Albedo_Band_Mandatory_Quality_Band2');
    var q3 = img.select('BRDF_Albedo_Band_Mandatory_Quality_Band3');
    var valid = q1.lte(1).and(q2.lte(1)).and(q3.lte(1));
    var full = q1.eq(0).and(q2.eq(0)).and(q3.eq(0));
    var evi = nir.subtract(red).multiply(2.5)
      .divide(nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1))
      .rename('EVI');
    return evi.addBands(valid.rename('valid')).addBands(full.rename('full'))
      .updateMask(valid)
      .copyProperties(img, ['system:time_start']);
  });

  // Janelas de 8 dias a partir de 1º de janeiro de cada ano (46 por ano)
  var pn = period(P.MODIS_START, P.MODIS_END);
  var y0 = parseInt(pn[0].slice(0, 4), 10), y1 = parseInt(pn[1].slice(0, 4), 10);
  var starts = [];
  for (var y = y0; y < y1; y++) {
    for (var k = 0; k < 46; k++) { starts.push(ee.Date(y + '-01-01').advance(8 * k, 'day').millis()); }
  }

  // Imagem vazia (tudo mascarado) para janelas sem dado: evita erro de
  // "banda não encontrada" no início de 2000 e no fim da série.
  var emptyImg = ee.Image.constant([0, 0, 0]).rename(['EVI_median', 'n_valid', 'n_full'])
    .updateMask(ee.Image(0));

  var composites = ee.ImageCollection.fromImages(ee.List(starts).map(function (t) {
    var d0 = ee.Date(t);
    var win = daily.filterDate(d0, d0.advance(8, 'day'));
    var filled = ee.Image(ee.Algorithms.If(win.size().gt(0),
      win.select('EVI').median().rename('EVI_median')
        .addBands(win.select('valid').count().rename('n_valid'))   // dias válidos
        .addBands(win.select('full').sum().rename('n_full')),       // dias com inversão completa
      emptyImg));
    return filled.setDefaultProjection(nbarProj).set('system:time_start', d0.millis());
  }));

  var nbarBands = ['EVI_median', 'n_valid', 'n_full'];
  bandsToRun.forEach(function (b) {
    var pts = pointsOfBand(b);
    var fc = sampleCollection(composites, pts, nbarProj.nominalScale(), nbarProj,
                              'MCD43A4_8d', nbarBands, 'EVI_median');
    exportTable(fc, 'series_MCD43A4_band' + b + (testing ? '_TEST' : '') + '_' + P.RUN_TAG, nbarBands);
  });
}

// ---------------------------------------------------------------------
// 3. HLS L30 e S30 — observações válidas, 30 m
// ---------------------------------------------------------------------
// Fmask (bits): 1 nuvem, 2 adjacente a nuvem/sombra, 3 sombra, 4 neve/gelo, 5 água.
// Válido = todos esses bits iguais a 0.
function fmaskValid(img) {
  var f = img.select('Fmask');
  var bad = f.bitwiseAnd(1 << 1).neq(0)
    .or(f.bitwiseAnd(1 << 2).neq(0))
    .or(f.bitwiseAnd(1 << 3).neq(0))
    .or(f.bitwiseAnd(1 << 4).neq(0))
    .or(f.bitwiseAnd(1 << 5).neq(0));
  return bad.not();
}

function runHLS(colId, nirBand, sensorName) {
  var hlsBands = ['blue', 'red', 'nir', 'Fmask'];
  var periods = testing ? [[P.TEST_YEAR + '-01-01', (P.TEST_YEAR + 1) + '-01-01', 'TEST']] : P.HLS_PERIODS;
  bandsToRun.forEach(function (b) {
    var pts = pointsOfBand(b);
    periods.forEach(function (per) {
      var col = ee.ImageCollection(colId)
        .filterBounds(pts.geometry())
        .filterDate(per[0], per[1])
        .map(function (img) {
          var out = img.select(['B2', 'B4', nirBand, 'Fmask'], hlsBands);
          return out.updateMask(fmaskValid(img)).copyProperties(img, ['system:time_start']);
        });
      // escala 30 m na projeção nativa de cada cena (UTM)
      var fc = sampleCollection(col, pts, 30, null, sensorName, hlsBands, 'nir');
      exportTable(fc, 'series_' + sensorName + '_band' + b + '_' + per[2] + '_' + P.RUN_TAG, hlsBands);
    });
  });
}

// L30: NIR = B5. S30: NIR estreito = B8A (é a banda harmonizada com o B5 do Landsat).
if (P.RUN.HLS_L30) { runHLS('NASA/HLS/HLSL30/v002', 'B5', 'HLS_L30'); }
if (P.RUN.HLS_S30) { runHLS('NASA/HLS/HLSS30/v002', 'B8A', 'HLS_S30'); }

// Prévia no console (teste): primeiras linhas de cada produto da faixa 3
if (testing) {
  print('MODO TESTE: faixa 3, ' + P.TEST_POINTS + ' pontos, ano ' + P.TEST_YEAR +
        '. Confira as prévias e o tempo das tarefas; depois ponha TEST_POINTS = 0.');
  var pts3 = pointsOfBand(3);
  var tp = period(P.MODIS_START, P.MODIS_END);
  print('Prévia MOD13Q1:', sampleCollection(ee.ImageCollection('MODIS/061/MOD13Q1').filterDate(tp[0], tp[1]),
    pts3, 231.656, null, 'MOD13Q1', ['EVI', 'SummaryQA', 'DayOfYear'], 'EVI').limit(5));
}
