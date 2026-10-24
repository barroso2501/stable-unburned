// =====================================================================
// 04_gedi.js
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: A RODAR. Rodar primeiro com TEST = true (só console).
//
// O QUE FAZ
//   Extrai a estrutura do dossel do GEDI L2B (cobertura, PAI, FHD, altura rh100)
//   nos 1215 pontos da amostra, para relacionar com o nível de EVI na seca e a
//   amplitude sazonal (pergunta 2, proposta M da etapa 07b).
//
//   Unidade: o pixel MODIS de 463 m que cada ponto representa (quadrado de
//   ~463 m centrado no ponto). Dentro dele, entram só footprints GEDI que:
//     - caem na população do piloto (4-A, núcleo 3×3, borda ≥ 250 m) → evita
//       footprints em mancha de outra classe dentro do pixel MODIS;
//     - têm l2b_quality_flag = 1, degrade_flag = 0 e sensitivity ≥ MIN_SENS.
//
//   Saída por ponto × mês (o produto GEDI mensal tem uma imagem por mês):
//   número de footprints e média/mediana/p10/p90 de cada variável.
//   O mês fica registrado para separar chuva × seca no Python: na seca, a perda
//   de folhas das lenhosas reduz a cobertura medida (efeito a quantificar).
//
// SAÍDAS (Drive/GEE_exports)
//   gedi_l2b_band<N>_v0.1.csv — uma linha por ponto × mês com ≥ 1 footprint
//
// UNIDADES DO PRODUTO (conferir no console; ver catálogo LARSE/GEDI)
//   cover 0–1 (fração), pai m²/m², fhd_normal adimensional, rh100 em cm.
// =====================================================================

var P = {
  SAMPLE: 'projects/ee-barroso2501/assets/stable/pilot_4A_sample_v0_1',
  POP: 'projects/ee-barroso2501/assets/stable/pilot_4A_cerrado_core_edge250',
  GEDI: 'LARSE/GEDI/GEDI02_B_002_MONTHLY',
  VARS: ['cover', 'pai', 'fhd_normal', 'rh100'],
  MIN_SENS: 0.95,        // sensibilidade mínima do feixe (savana: dossel aberto)
  HALF_SIDE_M: 231.6,    // meio lado do pixel MODIS 463 m
  BANDS: [1, 2, 3, 4, 5],
  TEST: true,            // true = só checagens no console, sem exportar
  TEST_BAND: 4,
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var sample = ee.FeatureCollection(P.SAMPLE).select(['point_id', 'lat_band']);
// população: o asset é mascarado fora da população → mask() = 1 dentro, 0 fora
// (lida na grade de 25 m do GEDI pelo vizinho mais próximo)
var pop = ee.Image(P.POP).select(0).mask().gt(0);

var gedi = ee.ImageCollection(P.GEDI);
var gediProj = gedi.first().projection();

// ---- checagens do produto ----
print('Bandas do GEDI L2B mensal (conferir nomes de VARS e filtros):', gedi.first().bandNames());
print('Meses disponíveis:', gedi.size());
print('Primeiro e último mês:',
      ee.Date(gedi.aggregate_min('system:time_start')).format('YYYY-MM'),
      ee.Date(gedi.aggregate_max('system:time_start')).format('YYYY-MM'));

// quadrado do pixel MODIS em torno de cada ponto (aproximado em graus; erro de poucos %)
var squares = sample.map(function (f) {
  return f.setGeometry(f.geometry().buffer(P.HALF_SIDE_M).bounds());
});

// footprint bom = qualidade + não degradado + sensibilidade + dentro da população
function qualify(img) {
  var ok = img.select('l2b_quality_flag').eq(1)
    .and(img.select('degrade_flag').eq(0))
    .and(img.select('sensitivity').gte(P.MIN_SENS))
    .and(pop);
  return img.select(P.VARS).updateMask(ok)
    .copyProperties(img, ['system:time_start']);
}

// redutor: contagem + média + mediana + p10/p90 de cada variável
var reducer = ee.Reducer.count()
  .combine(ee.Reducer.mean(), null, true)
  .combine(ee.Reducer.median(), null, true)
  .combine(ee.Reducer.percentile([10, 90]), null, true);

function extract(pts) {
  return gedi.map(function (img) {
    var month = ee.Date(img.get('system:time_start')).format('YYYY-MM');
    return qualify(img).reduceRegions({
      collection: pts, reducer: reducer, crs: gediProj, scale: gediProj.nominalScale()
    }).filter(ee.Filter.gt('cover_count', 0))
      .map(function (f) {
        return f.setGeometry(null).set({month: month, run_tag: P.RUN_TAG, created: created});
      });
  }).flatten();
}

var cols = ['point_id', 'lat_band', 'month'];
P.VARS.forEach(function (v) {
  cols = cols.concat([v + '_count', v + '_mean', v + '_median', v + '_p10', v + '_p90']);
});
cols = cols.concat(['run_tag', 'created']);

if (P.TEST) {
  // teste: 20 pontos de uma faixa, todos os meses
  var t = extract(squares.filter(ee.Filter.eq('lat_band', P.TEST_BAND)).limit(20));
  print('Prévia (deve ter linhas com cover_count ≥ 1):', t.limit(5));
  print('Linhas ponto × mês no teste:', t.size());
  print('Footprints bons nos 20 pontos (soma de cover_count):', t.aggregate_sum('cover_count'));
  print('Pontos com ≥ 1 footprint (de 20):', t.aggregate_count_distinct('point_id'));
} else {
  P.BANDS.forEach(function (b) {
    Export.table.toDrive({
      collection: extract(squares.filter(ee.Filter.eq('lat_band', b))),
      description: 'gedi_l2b_band' + b + '_' + P.RUN_TAG.replace('.', '_'),
      folder: P.EXPORT_FOLDER,
      fileNamePrefix: 'gedi_l2b_band' + b + '_' + P.RUN_TAG,
      fileFormat: 'CSV',
      selectors: cols
    });
  });
}
