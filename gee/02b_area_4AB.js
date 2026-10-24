// =====================================================================
// 02b_area_4AB.js
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
//
// STATUS: EXECUTADO em 2026-10-24 (ver docs/execucoes.md).
//
// O QUE FAZ
//   Soma a área de savana (classe 4) estável no Cerrado, separada em
//   nunca queimada (A) e queimada ≥ 1 vez (B), por faixa de 5° de
//   latitude. Sem núcleo 3×3 e sem borda: é a savana estável inteira.
//   Serve para saber que fração da savana estável do Cerrado nunca
//   queimou (comparar com a estimativa de ~48% de Mario).
//
// POR QUE ESTE ARQUIVO SUBSTITUI A TENTATIVA ANTERIOR
//   Duas rodadas anteriores (dentro de 02_populacao_mcd12q2.js) geraram
//   CSV vazio. Causa provável: os assets A e B são mascarados fora das
//   próprias classes, e a máscara se propagava pela função where(),
//   mascarando tudo. Aqui o código é feito só com aritmética sobre
//   imagens desmascaradas (unmask(0)), como na etapa 01, que funcionou.
//
// v0.3 (2026-10-24): campo do bioma corrigido para NM_BIOMA (a causa real
//   do CSV vazio era o filtro do Cerrado não encontrar nenhum polígono) e
//   exportação dividida em 4 partes (a rodada única reiniciou 3 vezes).
//
// ANTES DE EXPORTAR: rode e olhe o console. A "Checagem" deve mostrar
//   uma lista de códigos com área em ha. Se vier lista vazia, NÃO
//   envie a tarefa — mande o console.
//
// SAÍDA
//   Drive/GEE_exports/area_4AB_cerrado_by_latband_v0.3_part01..04.csv
//   colunas: tile_id, fire_context, lat_band, area_ha + proveniência
//   lat_band: 1 = 0–5° S · 2 = 5–10° S · 3 = 10–15° S · 4 = 15–20° S · 5 = 20–25° S
// =====================================================================

var P = {
  STABLE_A: 'projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_never_burned',
  STABLE_B: 'projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_burned',
  BIOMES: 'projects/ee-barroso2501/assets/biomas_IBGE',
  BIOME_FIELD: 'NM_BIOMA',
  BIOME_VALUE: 'Cerrado',
  TARGET_CLASS: 4,
  LAT_BAND_DEG: 5,
  BBOX: [-61, -25, -41, -2],
  TILE_DEG: 1,
  // Nº de tarefas de exportação (a rodada única com 232 blocos falhou e
  // reiniciou 3 vezes; a etapa 01 funcionou dividida em 4 partes)
  N_PARTS: 4,
  // Quadrado de checagem (0,2°) — mover para uma área de cerrado conhecida se vier vazio
  PROBE: [-47.9, -15.9, -47.7, -15.7],
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.3'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');

// Assets A e B, desmascarados: 1 onde é classe 4 naquele contexto, 0 no resto
var stableA = ee.Image(P.STABLE_A).select('stable_class');
var stableB = ee.Image(P.STABLE_B).select('stable_class');
var projInfo = stableA.projection().getInfo();
var isA = stableA.eq(P.TARGET_CLASS).unmask(0);
var isB = stableB.eq(P.TARGET_CLASS).unmask(0);

// Máscara raster do Cerrado
var cerrado = ee.FeatureCollection(P.BIOMES).filter(ee.Filter.eq(P.BIOME_FIELD, P.BIOME_VALUE));
print('Feições do Cerrado (esperado ≥ 1):', cerrado.size());
var cerradoMask = ee.Image(0).byte().paint(cerrado, 1).eq(1);

// Faixa de latitude 1–5
var latBand = ee.Image.pixelLonLat().select('latitude')
  .multiply(-1).divide(P.LAT_BAND_DEG).floor().add(1);

// Código por aritmética (sem where): A → 10 + faixa; B → 20 + faixa.
// Ex.: 14 = A na faixa 15–20° S; 23 = B na faixa 10–15° S.
var code = isA.multiply(10).add(isB.multiply(20)).add(latBand)
  .updateMask(isA.or(isB).and(cerradoMask))
  .rename('code').toInt();

var img = ee.Image.pixelArea().divide(1e4).rename('area_ha').addBands(code);
var groupReducer = ee.Reducer.sum().group({groupField: 1, groupName: 'code'});

// --- Checagem no console
print('Checagem (ha por código no quadrado de teste):',
  img.reduceRegion({
    reducer: groupReducer,
    geometry: ee.Geometry.Rectangle(P.PROBE, null, false),
    crs: projInfo.crs, crsTransform: projInfo.transform, maxPixels: 1e9
  }));

// --- Grade de blocos de 1° (mesma lógica da etapa 01)
var step = P.TILE_DEG;
var lons = ee.List.sequence(P.BBOX[0], P.BBOX[2] - step, step);
var lats = ee.List.sequence(P.BBOX[1], P.BBOX[3] - step, step);
var grid = ee.FeatureCollection(lons.map(function (x) {
  return lats.map(function (y) {
    x = ee.Number(x); y = ee.Number(y);
    return ee.Feature(ee.Geometry.Rectangle([x, y, x.add(step), y.add(step)], null, false),
      {tile_id: x.format('%.0f').cat('_').cat(y.format('%.0f'))});
  });
}).flatten()).filterBounds(cerrado.geometry());
print('Nº de blocos (esperado ~232):', grid.size());

var nTiles = grid.size().getInfo();
var gridList = grid.toList(nTiles);

// Reduz um conjunto de blocos: uma linha por bloco × código
function reduceTiles(tiles) {
  var res = img.reduceRegions({
    collection: tiles, reducer: groupReducer,
    crs: projInfo.crs, crsTransform: projInfo.transform, tileScale: 16
  });
  return res.map(function (f) {
    return ee.FeatureCollection(ee.List(f.get('groups')).map(function (g) {
      g = ee.Dictionary(g);
      var c = ee.Number(g.get('code'));
      return ee.Feature(null, {
        tile_id: f.get('tile_id'),
        fire_context: ee.String(ee.Algorithms.If(c.lt(20), 'A_never_burned', 'B_burned')),
        lat_band: c.mod(10),
        area_ha: g.get('sum'),
        stable_a_asset: P.STABLE_A, stable_b_asset: P.STABLE_B, biome_asset: P.BIOMES,
        target_class: P.TARGET_CLASS, run_tag: P.RUN_TAG, created: created
      });
    }));
  }).flatten();
}

// Exporta em N_PARTS tarefas independentes (como na etapa 01)
var perPart = Math.ceil(nTiles / P.N_PARTS);
for (var i = 0; i < P.N_PARTS; i++) {
  var start = i * perPart;
  var end = Math.min(start + perPart, nTiles);
  if (start >= end) { break; }
  var suffix = 'part0' + (i + 1);
  Export.table.toDrive({
    collection: reduceTiles(ee.FeatureCollection(gridList.slice(start, end))),
    description: 'area_4AB_cerrado_by_latband_' + P.RUN_TAG.replace('.', '_') + '_' + suffix,
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: 'area_4AB_cerrado_by_latband_' + P.RUN_TAG + '_' + suffix,
    fileFormat: 'CSV',
    selectors: ['tile_id', 'fire_context', 'lat_band', 'area_ha',
                'stable_a_asset', 'stable_b_asset', 'biome_asset', 'target_class', 'run_tag', 'created']
  });
}
