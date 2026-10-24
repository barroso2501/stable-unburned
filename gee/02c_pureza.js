// =====================================================================
// 02c_pureza.js
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: EXECUTADO em 2026-10-24 (ver docs/execucoes.md).
//
// O QUE FAZ
//   Para cada pixel MODIS, calcula a % da área ocupada pela população
//   do piloto (pixels de 30 m do asset 02a). Duas grades:
//     - ~463 m (MCD12Q2 / MCD43A4)
//     - ~232 m (MOD13Q1)
//   Gera dois assets com valores 0–100 (%), usados na etapa 02d.
//
// POR QUE ESTE ARQUIVO SUBSTITUI A TENTATIVA ANTERIOR
//   A primeira tentativa falhou com "reduceResolution: The input ...
//   does not have a valid default projection", porque a entrada
//   combinava uma máscara sem projeção. Aqui a entrada é só o asset da
//   população, com a projeção de 30 m fixada explicitamente.
//
// SAÍDAS
//   projects/ee-barroso2501/assets/stable/pilot_4A_purity_mcd500
//   projects/ee-barroso2501/assets/stable/pilot_4A_purity_mod13q1
// =====================================================================

var P = {
  POP_ID: 'projects/ee-barroso2501/assets/stable/pilot_4A_cerrado_core_edge250',
  BIOMES: 'projects/ee-barroso2501/assets/biomas_IBGE',
  BIOME_FIELD: 'NM_BIOMA',
  BIOME_VALUE: 'Cerrado',
  MCD12Q2: 'MODIS/061/MCD12Q2',
  MOD13Q1: 'MODIS/061/MOD13Q1',
  BBOX: [-61, -25, -41, -2],
  OUT_500: 'projects/ee-barroso2501/assets/stable/pilot_4A_purity_mcd500',
  OUT_250: 'projects/ee-barroso2501/assets/stable/pilot_4A_purity_mod13q1',
  RUN_TAG: 'v0.2'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);

// População: 1 onde é população, 0 no resto, com projeção de 30 m explícita
var popAsset = ee.Image(P.POP_ID);
var popBinary = popAsset.gt(0).unmask(0).toFloat()
  .setDefaultProjection(popAsset.projection())
  .rename('purity');

// Máscara do Cerrado, aplicada direto na grade de destino
var cerrado = ee.FeatureCollection(P.BIOMES).filter(ee.Filter.eq(P.BIOME_FIELD, P.BIOME_VALUE));
var cerradoMask = ee.Image(0).byte().paint(cerrado, 1).eq(1);

// Média de "é população" dentro de cada pixel MODIS (~280 px de 30 m por
// pixel de 500 m, abaixo do limite de 1024 do reduceResolution)
function purityOnGrid(gridProj) {
  return popBinary
    .reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 1024})
    .reproject({crs: gridProj})
    .multiply(100).round().toByte()
    .updateMask(cerradoMask);
}

var mcdProj = ee.ImageCollection(P.MCD12Q2).first().projection();
var modProj = ee.ImageCollection(P.MOD13Q1).first().select('EVI').projection();
var mcdPI = mcdProj.getInfo();
var modPI = modProj.getInfo();
print('Escala grade MCD12Q2 (~463 m):', mcdProj.nominalScale());
print('Escala grade MOD13Q1 (~232 m):', modProj.nominalScale());

var props = {pop_asset: P.POP_ID, units: 'percent', run_tag: P.RUN_TAG, created: created};

Export.image.toAsset({
  image: purityOnGrid(mcdProj).set(props).set({grid: 'MCD12Q2'}),
  description: 'pilot_4A_purity_mcd500',
  assetId: P.OUT_500,
  region: bbox, crs: mcdPI.crs, crsTransform: mcdPI.transform,
  maxPixels: 1e13, pyramidingPolicy: {'.default': 'mean'}
});

Export.image.toAsset({
  image: purityOnGrid(modProj).set(props).set({grid: 'MOD13Q1'}),
  description: 'pilot_4A_purity_mod13q1',
  assetId: P.OUT_250,
  region: bbox, crs: modPI.crs, crsTransform: modPI.transform,
  maxPixels: 1e13, pyramidingPolicy: {'.default': 'mean'}
});

Map.centerObject(bbox, 5);
Map.addLayer(purityOnGrid(mcdProj), {min: 0, max: 100, palette: ['ffffff', '1f8d49']},
             'pureza 500 m (prévia)', false);
