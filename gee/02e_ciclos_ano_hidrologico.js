// =====================================================================
// 02e_ciclos_ano_hidrologico.js
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: A RODAR. Pré-requisito: asset de pureza 463 m (02c) — pronto.
//
// O QUE FAZ
//   Reconta os ciclos do MCD12Q2 por ANO HIDROLÓGICO (1º jul a 30 jun),
//   decisão D16, em vez do ano civil usado pelo produto (e pelo 02d).
//   Para cada ano hidrológico H/H+1, junta as datas de pico (Peak_1 e
//   Peak_2) das imagens dos anos civis H e H+1 e conta quantas caem
//   na janela [1º jul H, 1º jul H+1).
//   Só pixels de 463 m com pureza ≥ 90% (mesmo critério do 02d).
//
//   Também confere a banda de qualidade: histograma de QA_Overall_1
//   por ano civil (o 02d deu QA 0–1 em 100% dos ciclos, o que é
//   suspeito).
//
// SAÍDAS (Drive/GEE_exports)
//   pilot_4A_mcd12q2_cycles_hydro_v0.1.csv
//     hydro_year (ex.: '2016/17'), lat_band, num_cycles (0,1,2,>=3), n_pixels
//   pilot_4A_mcd12q2_qa_hist_v0.1.csv
//     year, qa_overall_1 (0–3, ou 'sem ciclo'), n_pixels
//   lat_band: 1 = 0–5° S · 2 = 5–10° S · 3 = 10–15° S · 4 = 15–20° S
//             5 = 20–25° S (exploratória, D15)
// =====================================================================

var P = {
  PUR_500: 'projects/ee-barroso2501/assets/stable/pilot_4A_purity_mcd500',
  MCD12Q2: 'MODIS/061/MCD12Q2',
  // Anos hidrológicos: H = 2016 → jul/2016–jun/2017 ... H = 2023 → jul/2023–jun/2024
  HYDRO_START_YEARS: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
  QA_YEARS: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  PURITY_MIN: 90,
  LAT_BAND_DEG: 5,
  BBOX: [-61, -25, -41, -2],
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);

var pur500 = ee.Image(P.PUR_500);
var info500 = pur500.projection().getInfo();
var pureMask = pur500.gte(P.PURITY_MIN);
var mcd = ee.ImageCollection(P.MCD12Q2);

function latBand() {
  return ee.Image.pixelLonLat().select('latitude')
    .multiply(-1).divide(P.LAT_BAND_DEG).floor().add(1);
}

// Imagem do MCD12Q2 de um ano civil
function mcdYear(y) {
  return ee.Image(mcd.filterDate(y + '-01-01', (y + 1) + '-01-01').first());
}

// Dia (desde 1970-01-01) de 1º de julho do ano y — as datas de pico do
// MCD12Q2 estão nessa unidade
function julyFirstDay(y) {
  return Math.round(Date.UTC(y, 6, 1) / 86400000);
}

// Conta os picos de uma imagem que caem na janela [d0, d1).
// Pico ausente (sem ciclo) vira 0 e fica fora da janela.
function peaksInWindow(img, d0, d1) {
  var p1 = img.select('Peak_1').unmask(0);
  var p2 = img.select('Peak_2').unmask(0);
  var in1 = p1.gte(d0).and(p1.lt(d1));
  var in2 = p2.gte(d0).and(p2.lt(d1));
  return in1.add(in2);
}

// --- 1. Ciclos por ano hidrológico
var rows = ee.FeatureCollection(P.HYDRO_START_YEARS.map(function (h) {
  var d0 = julyFirstDay(h);
  var d1 = julyFirstDay(h + 1);
  var label = h + '/' + String(h + 1).slice(2);
  // Um ciclo com pico em jul–dez está na imagem do ano h; em jan–jun, na de h+1
  var n = peaksInWindow(mcdYear(h), d0, d1).add(peaksInWindow(mcdYear(h + 1), d0, d1)).min(3);
  var code = latBand().multiply(10).add(n).rename('code').toInt();
  var res = ee.Image(1).rename('n').addBands(code).updateMask(pureMask).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
    geometry: bbox, crs: info500.crs, crsTransform: info500.transform,
    maxPixels: 1e12, tileScale: 4
  });
  return ee.FeatureCollection(ee.List(res.get('groups')).map(function (g) {
    g = ee.Dictionary(g);
    var c = ee.Number(g.get('code'));
    return ee.Feature(null, {
      hydro_year: label,
      lat_band: c.divide(10).floor(),
      num_cycles: ee.List(['0', '1', '2', '>=3']).get(c.mod(10)),
      n_pixels: g.get('sum'),
      purity_min_pct: P.PURITY_MIN, mcd_asset: P.MCD12Q2,
      run_tag: P.RUN_TAG, created: created
    });
  }));
})).flatten();
print('Prévia ciclos por ano hidrológico:', rows.limit(10));

Export.table.toDrive({
  collection: rows,
  description: 'pilot_4A_mcd12q2_cycles_hydro_v0_1',
  folder: P.EXPORT_FOLDER,
  fileNamePrefix: 'pilot_4A_mcd12q2_cycles_hydro_' + P.RUN_TAG,
  fileFormat: 'CSV',
  selectors: ['hydro_year', 'lat_band', 'num_cycles', 'n_pixels',
              'purity_min_pct', 'mcd_asset', 'run_tag', 'created']
});

// --- 2. Conferência da banda de qualidade (QA_Overall_1), por ano civil
// Valor 9 = pixel sem ciclo (QA mascarado)
var qa = ee.FeatureCollection(P.QA_YEARS.map(function (y) {
  var q = mcdYear(y).select('QA_Overall_1').unmask(9).rename('qa').toInt();
  var res = ee.Image(1).rename('n').addBands(q).updateMask(pureMask).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'qa'}),
    geometry: bbox, crs: info500.crs, crsTransform: info500.transform,
    maxPixels: 1e12, tileScale: 4
  });
  return ee.FeatureCollection(ee.List(res.get('groups')).map(function (g) {
    g = ee.Dictionary(g);
    var v = ee.Number(g.get('qa'));
    return ee.Feature(null, {
      year: y,
      qa_overall_1: ee.Algorithms.If(v.eq(9), 'sem ciclo', v.format('%d')),
      n_pixels: g.get('sum'),
      run_tag: P.RUN_TAG, created: created
    });
  }));
})).flatten();
print('Prévia histograma de QA:', qa.limit(10));

Export.table.toDrive({
  collection: qa,
  description: 'pilot_4A_mcd12q2_qa_hist_v0_1',
  folder: P.EXPORT_FOLDER,
  fileNamePrefix: 'pilot_4A_mcd12q2_qa_hist_' + P.RUN_TAG,
  fileFormat: 'CSV',
  selectors: ['year', 'qa_overall_1', 'n_pixels', 'run_tag', 'created']
});
