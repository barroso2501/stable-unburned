// =====================================================================
// 04_gedi.js  (v0.2)
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: A RODAR. Rodar primeiro com TEST = true (só console).
//
// O QUE FAZ
//   Extrai a estrutura do dossel do GEDI nos 1215 pontos da amostra, para
//   relacionar com o nível de EVI na seca e a amplitude sazonal (pergunta 2).
//     L2B: cover (fração 0–1), pai (m²/m²), fhd_normal
//     L2A: rh98 e rh50 (altura em m) — a altura não está no L2B
//
//   Unidade: o pixel MODIS de 463 m de cada ponto (quadrado de ~463 m em torno
//   do ponto). Entram só footprints que:
//     - caem na população do piloto (4-A, núcleo 3×3, borda ≥ 250 m);
//     - têm flag de qualidade = 1, degrade_flag = 0 e sensitivity ≥ MIN_SENS.
//
//   Exporta UM FOOTPRINT POR LINHA (não agrega no GEE): a distribuição, o mês,
//   o feixe e dia/noite ficam disponíveis no Python.
//
// MUDANÇAS EM RELAÇÃO À v0.1
//   - rh100 não existe no L2B → altura passa a vir do L2A (rh98, rh50).
//   - A coleção "mensal" tem uma imagem por órbita (67.044 no total), não por mês:
//     agora filtra pelas áreas dos pontos (filterBounds) antes de processar.
//   - Exporta por footprint (sampleRegions) em vez de estatística por imagem.
//   - Corrige "reduceRegions is not a function": o resultado de copyProperties
//     precisa ser convertido de volta com ee.Image().
//
// SAÍDAS (Drive/GEE_exports)
//   gedi_l2b_band<N>_v0.2.csv — point_id, lat_band, granule, month, lon, lat,
//                               beam, solar_elevation, sensitivity, cover, pai, fhd_normal
//   gedi_l2a_band<N>_v0.2.csv — point_id, lat_band, granule, month, lon, lat,
//                               beam, solar_elevation, sensitivity, rh50, rh98
// =====================================================================

var P = {
  SAMPLE: 'projects/ee-barroso2501/assets/stable/pilot_4A_sample_v0_1',
  POP: 'projects/ee-barroso2501/assets/stable/pilot_4A_cerrado_core_edge250',
  L2B: 'LARSE/GEDI/GEDI02_B_002_MONTHLY',
  L2A: 'LARSE/GEDI/GEDI02_A_002_MONTHLY',
  VARS_L2B: ['cover', 'pai', 'fhd_normal'],
  VARS_L2A: ['rh50', 'rh98'],
  AUX: ['beam', 'solar_elevation', 'sensitivity'],
  MIN_SENS: 0.95,        // sensibilidade mínima do feixe (savana: dossel aberto)
  HALF_SIDE_M: 231.6,    // meio lado do pixel MODIS 463 m
  BANDS: [1, 2, 3, 4, 5],
  TEST: true,            // true = só checagens no console, sem exportar
  TEST_BAND: 4,
  TEST_N_POINTS: 20,
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.2'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var sample = ee.FeatureCollection(P.SAMPLE).select(['point_id', 'lat_band']);
// população: o asset é mascarado fora da população → mask() = 1 dentro, 0 fora
var pop = ee.Image(P.POP).select(0).mask().gt(0);

// quadrado do pixel MODIS em torno de cada ponto (aproximado em graus; erro de poucos %)
var squares = sample.map(function (f) {
  return f.setGeometry(f.geometry().buffer(P.HALF_SIDE_M).bounds());
});

var PRODUCTS = {
  l2b: {coll: P.L2B, qflag: 'l2b_quality_flag', vars: P.VARS_L2B},
  l2a: {coll: P.L2A, qflag: 'quality_flag', vars: P.VARS_L2A}
};

// footprint bom = qualidade + não degradado + sensibilidade + dentro da população.
// Acrescenta lon/lat do centro do pixel de 25 m (permite casar L2A × L2B depois).
function qualify(img, prod) {
  img = ee.Image(img);
  var ok = img.select(prod.qflag).eq(1)
    .and(img.select('degrade_flag').eq(0))
    .and(img.select('sensitivity').gte(P.MIN_SENS))
    .and(pop);
  return ee.Image(img.select(prod.vars.concat(P.AUX))
    .addBands(ee.Image.pixelLonLat().rename(['lon', 'lat']))
    .updateMask(ok)
    .copyProperties(img, ['system:time_start', 'system:index']));
}

// um footprint por linha, para os pontos pts
function extract(prod, pts) {
  var coll = ee.ImageCollection(prod.coll).filterBounds(pts.geometry());
  var proj = ee.Image(coll.first()).projection();
  var fc = coll.map(function (img) {
    var q = qualify(img, prod);
    var month = ee.Date(q.get('system:time_start')).format('YYYY-MM');
    var granule = ee.String(img.get('system:index'));
    return q.sampleRegions({
      collection: pts, properties: ['point_id', 'lat_band'],
      projection: proj, scale: proj.nominalScale(), geometries: false
    }).map(function (f) {
      return f.set({granule: granule, month: month, run_tag: P.RUN_TAG, created: created});
    });
  }).flatten();
  return {coll: coll, fc: fc};
}

function selectors(prod) {
  return ['point_id', 'lat_band', 'granule', 'month', 'lon', 'lat']
    .concat(P.AUX).concat(prod.vars).concat(['run_tag', 'created']);
}

if (P.TEST) {
  var pts = squares.filter(ee.Filter.eq('lat_band', P.TEST_BAND)).limit(P.TEST_N_POINTS);
  print('Bandas L2A (conferir rh50, rh98, quality_flag, degrade_flag, sensitivity):',
        ee.ImageCollection(P.L2A).first().bandNames());
  Object.keys(PRODUCTS).forEach(function (k) {
    var r = extract(PRODUCTS[k], pts);
    print(k + ': órbitas que cruzam os ' + P.TEST_N_POINTS + ' pontos de teste:', r.coll.size());
    print(k + ': prévia (deve ter linhas com valores):', r.fc.limit(3));
    print(k + ': footprints bons nos pontos de teste:', r.fc.size());
    print(k + ': pontos com ≥ 1 footprint (de ' + P.TEST_N_POINTS + '):', r.fc.aggregate_count_distinct('point_id'));
  });
} else {
  P.BANDS.forEach(function (b) {
    var pts = squares.filter(ee.Filter.eq('lat_band', b));
    Object.keys(PRODUCTS).forEach(function (k) {
      Export.table.toDrive({
        collection: extract(PRODUCTS[k], pts).fc,
        description: 'gedi_' + k + '_band' + b + '_' + P.RUN_TAG.replace('.', '_'),
        folder: P.EXPORT_FOLDER,
        fileNamePrefix: 'gedi_' + k + '_band' + b + '_' + P.RUN_TAG,
        fileFormat: 'CSV',
        selectors: selectors(PRODUCTS[k])
      });
    });
  });
}
