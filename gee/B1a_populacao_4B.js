// =====================================================================
// B1a_populacao_4B.js  (v0.1)
// Projeto: stable-unburned — PARTE 2 do piloto: savana queimada (4-B)
//
// STATUS: A RODAR. Conferir as checagens do console antes de exportar.
//
// O QUE FAZ
//   Gera o asset da população 4-B da parte 2, a 30 m (decisões D23–D28):
//     - savana (classe 4) estável 1985–2025 e queimada ≥ 1 vez (asset B);
//     - dentro do Cerrado (IBGE), a ≥ 250 m da borda antrópica de 2025 (como A);
//     - SEM fogo em 1985–2000;
//     - em 2001–2025: 1 a 5 fogos, com ≥ 4 anos entre fogos consecutivos
//       (Definição A: diferença entre anos de fogo) e primeiro fogo ≥ 2002
//       (≥ 2 anos hidrológicos MODIS de linha de base antes do fogo);
//     - núcleo 3×3: o pixel e os 8 vizinhos elegíveis E com o MESMO histórico
//       de fogo (mesma assinatura de anos queimados) — versão de D04 para B.
//
//   Estratos: 1 = um fogo (reintrodução única); 2 = 2–5 fogos espaçados.
//
// BANDAS DO ASSET (mascarado fora da população)
//   lat_band    1 = 0–5° S … 5 = 20–25° S
//   stratum     1 ou 2
//   n_fires     nº de anos com fogo em 2001–2025
//   first_fire  ano do primeiro fogo (2002–2025)
//   last_fire   ano do último fogo
//   signature   inteiro com 1 bit por ano 2001–2025 (bit 0 = 2001): histórico exato
//
// SAÍDA
//   projects/ee-barroso2501/assets/stable/pilot_4B_cerrado_core_edge250
//
// O QUE PODE QUEBRAR
//   - Se faltar a banda de algum ano, o script para com "Sem banda de fogo para AAAA":
//     ajustar FIRE_FIRST/FIRE_LAST ao período do produto.
// =====================================================================

var P = {
  STABLE_B: 'projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_burned',
  // Fogo 5.1 anual (informado por Mario). O nome da banda de cada ano é
  // detectado no console: a banda cujo nome termina com o ano.
  FIRE_ASSET: 'projects/mapbiomas-public/assets/brazil/fire/collection5_1/mapbiomas_fire_collection51_annual_burned_v1',
  FIRE_FIRST: 1985,
  FIRE_LAST: 2025,
  BASELINE_END: 2000,          // sem fogo até este ano (inclusive)
  MAX_FIRES: 5,
  MIN_INTERVAL: 4,             // anos entre fogos consecutivos (">3")
  MIN_FIRST_FIRE: 2002,        // linha de base MODIS ≥ 2 anos hidrológicos
  LULC: 'projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3',
  LULC_REF_YEAR: 2025,
  BIOMES: 'projects/ee-barroso2501/assets/biomas_IBGE',
  BIOME_FIELD: 'NM_BIOMA',
  BIOME_VALUE: 'Cerrado',
  TARGET_CLASS: 4,
  ANTHROPIC: [9, 15, 18, 19, 20, 21, 24, 30, 31, 35, 36, 39, 40, 41, 46, 47, 48, 62, 75],
  EDGE_MIN_M: 250,
  EDGE_SEARCH_PX: 64,
  LAT_BAND_DEG: 5,
  BBOX: [-61, -25, -41, -2],
  PROBE: [-47.9, -15.9, -47.7, -15.7],   // quadrado de checagem (Brasília)
  ASSET_ID: 'projects/ee-barroso2501/assets/stable/pilot_4B_cerrado_core_edge250',
  RUN_TAG: 'v0.1.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);

// ---- Savana 4-B estável e grade de 30 m ----
var stableB = ee.Image(P.STABLE_B).select('stable_class');
var projInfo = stableB.projection().getInfo();
var is4B = stableB.eq(P.TARGET_CLASS).unmask(0);

// ---- Fogo anual: 1 = queimou no ano, 0 = não (desmascarado) ----
var fire = ee.Image(P.FIRE_ASSET);
// mapa ano → nome da banda (a banda cujo nome termina com o ano)
var fireBands = fire.bandNames().getInfo();
var bandOf = {};
fireBands.forEach(function (n) { var m = n.match(/(19|20)\d{2}$/); if (m) { bandOf[m[0]] = n; } });
print('Bandas do fogo (primeira, última, total):', fireBands[0], fireBands[fireBands.length - 1], fireBands.length);
for (var yy = P.FIRE_FIRST; yy <= P.FIRE_LAST; yy++) {
  if (!bandOf[yy]) { throw new Error('Sem banda de fogo para ' + yy + ' — ajustar FIRE_FIRST/FIRE_LAST.'); }
}
function burned(y) {
  return fire.select(bandOf[y]).gt(0).unmask(0);
}

// sem fogo na linha de base 1985–2000
var preSum = ee.Image(0);
for (var y = P.FIRE_FIRST; y <= P.BASELINE_END; y++) { preSum = preSum.add(burned(y)); }

// 2001–FIRE_LAST: contagem, assinatura, primeiro e último ano
var nFires = ee.Image(0), sig = ee.Image(0).toInt32();
var first = ee.Image(9999), last = ee.Image(0);
for (var y2 = P.BASELINE_END + 1; y2 <= P.FIRE_LAST; y2++) {
  var b = burned(y2);
  nFires = nFires.add(b);
  sig = sig.add(b.toInt32().leftShift(y2 - P.BASELINE_END - 1));
  first = first.min(b.multiply(y2).add(b.not().multiply(9999)));
  last = last.max(b.multiply(y2));
}

// intervalo ≥ MIN_INTERVAL ⇔ nenhuma janela de MIN_INTERVAL anos consecutivos com 2+ fogos
var spacedOK = ee.Image(1);
for (var y3 = P.BASELINE_END + 1; y3 <= P.FIRE_LAST - P.MIN_INTERVAL + 1; y3++) {
  var w = ee.Image(0);
  for (var k = 0; k < P.MIN_INTERVAL; k++) { w = w.add(burned(y3 + k)); }
  spacedOK = spacedOK.and(w.lte(1));
}

var eligible = is4B.and(preSum.eq(0)).and(nFires.gte(1)).and(nFires.lte(P.MAX_FIRES))
  .and(spacedOK).and(first.gte(P.MIN_FIRST_FIRE));

// ---- Núcleo 3×3 com o mesmo histórico de fogo ----
var sigE = sig.updateMask(eligible).unmask(-1);       // -1 fora dos elegíveis
var sameSig = sigE.focalMin({radius: 1, kernelType: 'square', units: 'pixels'})
  .eq(sigE.focalMax({radius: 1, kernelType: 'square', units: 'pixels'}));
var core = eligible.and(sameSig).and(sigE.gte(0));

// ---- Borda antrópica e Cerrado (como em 02a) ----
var cerrado = ee.FeatureCollection(P.BIOMES).filter(ee.Filter.eq(P.BIOME_FIELD, P.BIOME_VALUE));
var cerradoMask = ee.Image(0).byte().paint(cerrado, 1).eq(1);
var lulcRef = ee.Image(P.LULC).select('classification_' + P.LULC_REF_YEAR);
var anthropic = lulcRef.remap(P.ANTHROPIC, ee.List.repeat(1, P.ANTHROPIC.length), 0).unmask(0).toInt();
var distM = anthropic.fastDistanceTransform(P.EDGE_SEARCH_PX).sqrt()
  .unmask(P.EDGE_SEARCH_PX * 10).multiply(ee.Image.pixelArea().sqrt());

var latBand = ee.Image.pixelLonLat().select('latitude')
  .multiply(-1).divide(P.LAT_BAND_DEG).floor().add(1).toByte().rename('lat_band');

var popMask = core.and(distM.gte(P.EDGE_MIN_M)).and(cerradoMask);
var stratum = nFires.gte(2).add(1).toByte().rename('stratum');   // 1 = um fogo; 2 = 2–5
var pop = latBand
  .addBands(stratum)
  .addBands(nFires.toByte().rename('n_fires'))
  .addBands(first.toInt16().rename('first_fire'))
  .addBands(last.toInt16().rename('last_fire'))
  .addBands(sig.rename('signature'))
  .updateMask(popMask)
  .set({stable_asset: P.STABLE_B, fire_asset: P.FIRE_ASSET, lulc_asset: P.LULC,
        baseline_end: P.BASELINE_END, max_fires: P.MAX_FIRES, min_interval: P.MIN_INTERVAL,
        min_first_fire: P.MIN_FIRST_FIRE, edge_min_m: P.EDGE_MIN_M,
        decisions: 'D04 D12 D23 D24 D28', run_tag: P.RUN_TAG, created: created});

// ---- Checagem no console (quadrado de Brasília) ----
var probe = ee.Geometry.Rectangle(P.PROBE, null, false);
print('Checagem — pixels 4-B no quadrado:', is4B.reduceRegion({reducer: ee.Reducer.sum(),
  geometry: probe, crs: projInfo.crs, crsTransform: projInfo.transform, maxPixels: 1e9}));
print('Checagem — elegíveis (antes do núcleo/borda):', eligible.reduceRegion({reducer: ee.Reducer.sum(),
  geometry: probe, crs: projInfo.crs, crsTransform: projInfo.transform, maxPixels: 1e9}));
print('Checagem — população por estrato:', pop.select('stratum').reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(), geometry: probe,
  crs: projInfo.crs, crsTransform: projInfo.transform, maxPixels: 1e9}));

Map.centerObject(probe, 11);
Map.addLayer(pop.select('stratum'), {min: 1, max: 2, palette: ['f4a261', 'e63946']}, 'estrato 4-B');

Export.image.toAsset({
  image: pop,
  description: 'pilot_4B_cerrado_core_edge250',
  assetId: P.ASSET_ID,
  region: bbox,
  crs: projInfo.crs,
  crsTransform: projInfo.transform,
  maxPixels: 1e13,
  pyramidingPolicy: {'.default': 'mode'}
});
