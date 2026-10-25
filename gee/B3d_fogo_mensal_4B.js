// =====================================================================
// B3d_fogo_mensal_4B.js  (v0.2)
// Projeto: stable-unburned — PARTE 2 do piloto: savana queimada (4-B)
//
// STATUS: A RODAR. Rápido: uma imagem, uma linha por ponto.
//
// O QUE FAZ  (decisão D27: momento do fogo na estação)
//   Para cada ponto da amostra 4-B e cada ano 1985–2025, extrai do Fogo 5.1
//   mensal o MÊS da queima (1–12; 0 = não queimou):
//     m_pt_<ano>    mês no pixel de 30 m sob o ponto
//     h_<ano>       histograma dos meses (JSON {"0": n, "8": n, …}; 0 = não queimou)
//                   entre os pixels de 30 m da população dentro do quadrado do
//                   pixel MODIS (463 m) — permite separar eventos de meses diferentes
//                   que o produto ANUAL junta num só (D30)
//   Também o status anual (a_<ano>) do produto anual, para conferir com a
//   assinatura da amostra.
//
//   O Python (B4a) define o ANO DE FOGO pelo ciclo de chuva de cada ponto (do fim
//   das chuvas de um ano ao fim das chuvas do ano seguinte, CHIRPS de B3b), separa
//   eventos por mês, recalcula os critérios de D28 nesse ano e classifica cada fogo
//   como estação úmida ou início, meio ou fim da seca (D27, D30).
//
// SAÍDA (Drive/GEE_exports)
//   fire4B_monthly_v0.1.csv — point_id, sample_type, lat_band, stratum + colunas por ano
//
// O QUE PODE QUEBRAR
//   - Se o produto mensal registrar um só mês por ano, fogos repetidos no mesmo
//     ano ficam com um mês só (improvável sob o critério de intervalo ≥ 4 anos).
//   - Nome das bandas: detectado pelo ano no fim do nome; o console mostra as
//     primeiras e últimas. Se o mensal não tiver algum ano, o script para.
// =====================================================================

var P = {
  SAMPLE: 'projects/ee-barroso2501/assets/stable/pilot_4B_sample_v0_1',
  POP_ID: 'projects/ee-barroso2501/assets/stable/pilot_4B_cerrado_core_edge250',
  FIRE_MONTHLY: 'projects/mapbiomas-public/assets/brazil/fire/collection5_1/mapbiomas_fire_collection51_monthly_burned_v1',
  FIRE_ANNUAL: 'projects/mapbiomas-public/assets/brazil/fire/collection5_1/mapbiomas_fire_collection51_annual_burned_v1',
  FIRST: 1985,
  LAST: 2025,
  HALF_SIDE_M: 231.6,
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.2'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var sample = ee.FeatureCollection(P.SAMPLE).select(['point_id', 'sample_type', 'lat_band', 'stratum']);
var pop = ee.Image(P.POP_ID).select('lat_band').mask().gt(0);

// mapa ano → banda (a banda cujo nome termina com o ano)
function bandMap(img, label) {
  var names = img.bandNames().getInfo(), map = {};
  names.forEach(function (n) { var m = n.match(/(19|20)\d{2}$/); if (m) { map[m[0]] = n; } });
  print(label + ' — bandas (primeira, última, total):', names[0], names[names.length - 1], names.length);
  for (var y = P.FIRST; y <= P.LAST; y++) {
    if (!map[y]) { throw new Error(label + ': sem banda para ' + y); }
  }
  return map;
}
var monthly = ee.Image(P.FIRE_MONTHLY), annual = ee.Image(P.FIRE_ANNUAL);
var mMap = bandMap(monthly, 'Mensal'), aMap = bandMap(annual, 'Anual');
var proj = monthly.select(mMap[P.FIRST]).projection();

// imagens: mês no pixel (0 = sem fogo) e status anual
var mBands = [], aBands = [];
for (var y = P.FIRST; y <= P.LAST; y++) {
  mBands.push(monthly.select(mMap[y]).unmask(0).toInt().rename('m_pt_' + y));
  aBands.push(annual.select(aMap[y]).gt(0).unmask(0).toInt().rename('a_' + y));
}
var ptImg = ee.Image.cat(mBands.concat(aBands));

// 1) valores no pixel de 30 m sob o ponto
var atPt = ptImg.reduceRegions({collection: sample, reducer: ee.Reducer.first(), crs: proj, scale: proj.nominalScale()});

// 2) histograma dos meses no quadrado do pixel MODIS (só pixels da população; 0 = sem fogo conta como valor)
var modeBands = [];
for (var y2 = P.FIRST; y2 <= P.LAST; y2++) {
  modeBands.push(monthly.select(mMap[y2]).unmask(0).toInt().updateMask(pop).rename('m_' + y2));
}
var modeImg = ee.Image.cat(modeBands);
var squares = atPt.map(function (f) { return f.setGeometry(f.geometry().buffer(P.HALF_SIDE_M).bounds()); });
var hist = modeImg.reduceRegions({collection: squares, reducer: ee.Reducer.frequencyHistogram(),
                                  crs: proj, scale: proj.nominalScale(), tileScale: 4});

// histograma {mês: nº de pixels de 30 m da população} por ano, como texto JSON:
// o Python (B4a) monta o ano de fogo pelo ciclo de chuva e separa eventos por mês (D30)
var out = hist.map(function (f) {
  var props = {};
  for (var y3 = P.FIRST; y3 <= P.LAST; y3++) {
    props['h_' + y3] = ee.String.encodeJSON(ee.Dictionary(f.get('m_' + y3)));   // JSON no servidor
  }
  return f.setGeometry(null).set(props).set({run_tag: P.RUN_TAG, created: created});
});

var cols = ['point_id', 'sample_type', 'lat_band', 'stratum'];
for (var y4 = P.FIRST; y4 <= P.LAST; y4++) { cols.push('m_pt_' + y4, 'h_' + y4, 'a_' + y4); }
cols.push('run_tag', 'created');

print('Prévia (deve ter m_pt_2010 e h_2010 como texto JSON):', out.limit(2));

Export.table.toDrive({collection: out, description: 'fire4B_monthly_' + P.RUN_TAG.replace('.', '_'),
                      folder: P.EXPORT_FOLDER, fileNamePrefix: 'fire4B_monthly_' + P.RUN_TAG,
                      fileFormat: 'CSV', selectors: cols});
