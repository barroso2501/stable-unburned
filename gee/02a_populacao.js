// =====================================================================
// 02a_populacao.js
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: EXECUTADO em 2026-10-24 (ver docs/execucoes.md).
//
// O QUE FAZ
//   Gera o asset da POPULAÇÃO do piloto, a 30 m:
//   savana (classe 4) estável 1985–2025 e nunca queimada (contexto A),
//   dentro do Cerrado, que
//     - passa no núcleo 3×3 (ponto + 8 vizinhos também 4-A)  → D04
//     - está a ≥ 250 m da borda antrópica do mapa de 2025     → D12
//   sem filtro de tamanho de fragmento                         → D13
//   Banda única 'lat_band' = faixa de 5° de latitude           → D14
//     1 = 0–5° S · 2 = 5–10° S · 3 = 10–15° S · 4 = 15–20° S · 5 = 20–25° S
//   Fora da população o pixel é mascarado.
//
// SAÍDA
//   projects/ee-barroso2501/assets/stable/pilot_4A_cerrado_core_edge250
// =====================================================================

var P = {
  STABLE_A: 'projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_never_burned',
  LULC: 'projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3',
  LULC_REF_YEAR: 2025,
  BIOMES: 'projects/ee-barroso2501/assets/biomas_IBGE',
  BIOME_FIELD: 'NM_BIOMA',
  BIOME_VALUE: 'Cerrado',
  TARGET_CLASS: 4,
  // Classes antrópicas (borda) — mesmas da etapa 01; CONFERIR na legenda Col. 11
  ANTHROPIC: [9, 15, 18, 19, 20, 21, 24, 30, 31, 35, 36, 39, 40, 41, 46, 47, 48, 62, 75],
  EDGE_MIN_M: 250,
  EDGE_SEARCH_PX: 64,
  LAT_BAND_DEG: 5,
  BBOX: [-61, -25, -41, -2],
  ASSET_ID: 'projects/ee-barroso2501/assets/stable/pilot_4A_cerrado_core_edge250',
  RUN_TAG: 'v0.2'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);

// Asset 4-A e sua grade de 30 m (todas as contas nessa grade)
var stableA = ee.Image(P.STABLE_A).select('stable_class');
var projInfo = stableA.projection().getInfo();

// Máscara raster do Cerrado
var cerrado = ee.FeatureCollection(P.BIOMES).filter(ee.Filter.eq(P.BIOME_FIELD, P.BIOME_VALUE));
print('Feições do Cerrado (esperado ≥ 1):', cerrado.size());
var cerradoMask = ee.Image(0).byte().paint(cerrado, 1).eq(1);

// Núcleo 3×3: 1 só se o pixel e os 8 vizinhos forem 4-A
var is4A = stableA.eq(P.TARGET_CLASS).unmask(0);
var core3x3 = is4A.focalMin({radius: 1, kernelType: 'square', units: 'pixels'});

// Distância (m) até o pixel antrópico mais próximo no mapa de 2025
var lulcRef = ee.Image(P.LULC).select('classification_' + P.LULC_REF_YEAR);
var anthropic = lulcRef.remap(P.ANTHROPIC, ee.List.repeat(1, P.ANTHROPIC.length), 0).unmask(0).toInt();
var distM = anthropic.fastDistanceTransform(P.EDGE_SEARCH_PX).sqrt()
  .unmask(P.EDGE_SEARCH_PX * 10)
  .multiply(ee.Image.pixelArea().sqrt());

// Faixa de latitude 1–5
var latBand = ee.Image.pixelLonLat().select('latitude')
  .multiply(-1).divide(P.LAT_BAND_DEG).floor().add(1).toByte().rename('lat_band');

var popMask = core3x3.eq(1).and(distM.gte(P.EDGE_MIN_M)).and(cerradoMask);
var pop = latBand.updateMask(popMask).set({
  stable_asset: P.STABLE_A, lulc_asset: P.LULC, lulc_ref_year: P.LULC_REF_YEAR,
  biome_asset: P.BIOMES, target_class: P.TARGET_CLASS, core: '3x3 focalMin',
  edge_min_m: P.EDGE_MIN_M, edge_search_px: P.EDGE_SEARCH_PX, lat_band_deg: P.LAT_BAND_DEG,
  run_tag: P.RUN_TAG, created: created, decisions: 'D04 D08 D12 D13 D14'
});

Export.image.toAsset({
  image: pop,
  description: 'pilot_4A_cerrado_core_edge250',
  assetId: P.ASSET_ID,
  region: bbox,
  crs: projInfo.crs,
  crsTransform: projInfo.transform,
  maxPixels: 1e13,
  pyramidingPolicy: {'.default': 'mode'}
});
