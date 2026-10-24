// =====================================================================
// 02b_diagnostico.js
// Só para o console — NÃO exporta nada.
// Objetivo: descobrir em que passo o 02b_area_4AB.js perde os dados
// (o CSV veio vazio três vezes). Rode e copie TODO o console.
// Cada bloco imprime um resultado; o primeiro que vier vazio ou com
// erro mostra onde está o problema.
// =====================================================================

var STABLE_A = 'projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_never_burned';
var STABLE_B = 'projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_burned';
var BIOMES = 'projects/ee-barroso2501/assets/biomas_IBGE';

// Quadrado pequeno (0,2°) perto de Brasília. Se os blocos 3 e 4 derem
// zero, mova para uma área de savana que você saiba que é estável.
var probe = ee.Geometry.Rectangle([-47.9, -15.9, -47.7, -15.7], null, false);

// 1. Os dois assets existem e têm a banda esperada?
var a = ee.Image(STABLE_A);
var b = ee.Image(STABLE_B);
print('1a. Bandas A:', a.bandNames(), 'Projeção A:', a.projection());
print('1b. Bandas B:', b.bandNames(), 'Projeção B:', b.projection());

var projInfo = a.select('stable_class').projection().getInfo();
// Monta os argumentos de reduceRegion no quadrado, na grade de 30 m.
function rr(reducer) {
  return {reducer: reducer, geometry: probe, crs: projInfo.crs,
          crsTransform: projInfo.transform, maxPixels: 1e9};
}

// 2. Que valores de classe existem no quadrado, em cada asset?
print('2a. Histograma de classes em A (quadrado):',
  a.select('stable_class').reduceRegion(rr(ee.Reducer.frequencyHistogram())));
print('2b. Histograma de classes em B (quadrado):',
  b.select('stable_class').reduceRegion(rr(ee.Reducer.frequencyHistogram())));

// 3. Contagem de pixels classe 4 em A e em B (depois do unmask)
var isA = a.select('stable_class').eq(4).unmask(0);
var isB = b.select('stable_class').eq(4).unmask(0);
print('3. Pixels 4-A e 4-B no quadrado (soma):',
  isA.rename('isA').addBands(isB.rename('isB'))
     .reduceRegion(rr(ee.Reducer.sum())));

// 4. Máscara do Cerrado no quadrado (deve ser > 0)
var cerrado = ee.FeatureCollection(BIOMES).filter(ee.Filter.eq('NM_BIOMA', 'Cerrado'));
var cerradoMask = ee.Image(0).byte().paint(cerrado, 1).eq(1);
print('4. Pixels do Cerrado no quadrado:',
  cerradoMask.rename('cerrado').reduceRegion(rr(ee.Reducer.sum())));

// 5. Código final e soma por código no quadrado (é o que o 02b exporta)
var latBand = ee.Image.pixelLonLat().select('latitude').multiply(-1).divide(5).floor().add(1);
var code = isA.multiply(10).add(isB.multiply(20)).add(latBand)
  .updateMask(isA.or(isB).and(cerradoMask)).rename('code').toInt();
var img = ee.Image.pixelArea().divide(1e4).rename('area_ha').addBands(code);
var grp = ee.Reducer.sum().group({groupField: 1, groupName: 'code'});
print('5. Área por código no quadrado:', img.reduceRegion(rr(grp)));

// 6. O mesmo, via reduceRegions num único bloco de 1° (como no export)
var tile = ee.FeatureCollection([ee.Feature(ee.Geometry.Rectangle([-48, -16, -47, -15], null, false), {tile_id: '-48_-16'})]);
var r = img.reduceRegions({collection: tile, reducer: grp,
  crs: projInfo.crs, crsTransform: projInfo.transform, tileScale: 16});
print('6. reduceRegions num bloco de 1° (propriedade "groups"):', r.first().get('groups'));
