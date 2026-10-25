// =====================================================================
// B1b_area_4B.js  (v0.1)
// Projeto: stable-unburned — PARTE 2 do piloto: savana queimada (4-B)
//
// STATUS: A RODAR depois de B1a (precisa do asset da população 4-B).
//
// O QUE FAZ
//   Área (ha) da população 4-B por faixa × estrato × ano do primeiro fogo,
//   e por faixa × nº de fogos. Mesma lógica de blocos de 1° e 4 partes da
//   etapa 02b (a rodada única travou antes).
//
// SAÍDA (Drive/GEE_exports)
//   area_4B_pop_v0.1_part01..04.csv
//   colunas: tile_id, lat_band, stratum, first_fire, n_fires, area_ha + proveniência
// =====================================================================

var P = {
  POP_ID: 'projects/ee-barroso2501/assets/stable/pilot_4B_cerrado_core_edge250',
  BIOMES: 'projects/ee-barroso2501/assets/biomas_IBGE',
  BIOME_FIELD: 'NM_BIOMA',
  BIOME_VALUE: 'Cerrado',
  BBOX: [-61, -25, -41, -2],
  TILE_DEG: 1,
  N_PARTS: 4,
  PROBE: [-47.9, -15.9, -47.7, -15.7],
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var pop = ee.Image(P.POP_ID);
var projInfo = pop.select('lat_band').projection().getInfo();

// código único: faixa · estrato · nº de fogos · ano do 1º fogo
// ex.: 3 2 3 2010 → 3232010 = faixa 3, estrato 2, 3 fogos, 1º fogo em 2010
var code = pop.select('lat_band').toInt().multiply(1000000)
  .add(pop.select('stratum').toInt().multiply(100000))
  .add(pop.select('n_fires').toInt().multiply(10000))
  .add(pop.select('first_fire').toInt())
  .rename('code').toInt();
var img = ee.Image.pixelArea().divide(1e4).rename('area_ha').addBands(code);
var groupReducer = ee.Reducer.sum().group({groupField: 1, groupName: 'code'});

print('Checagem (ha por código no quadrado de teste):', img.reduceRegion({
  reducer: groupReducer, geometry: ee.Geometry.Rectangle(P.PROBE, null, false),
  crs: projInfo.crs, crsTransform: projInfo.transform, maxPixels: 1e9}));

var cerrado = ee.FeatureCollection(P.BIOMES).filter(ee.Filter.eq(P.BIOME_FIELD, P.BIOME_VALUE));
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
var nTiles = grid.size().getInfo();
var gridList = grid.toList(nTiles);

function reduceTiles(tiles) {
  return img.reduceRegions({collection: tiles, reducer: groupReducer,
    crs: projInfo.crs, crsTransform: projInfo.transform, tileScale: 16
  }).map(function (f) {
    return ee.FeatureCollection(ee.List(f.get('groups')).map(function (g) {
      g = ee.Dictionary(g);
      var c = ee.Number(g.get('code'));
      return ee.Feature(null, {
        tile_id: f.get('tile_id'),
        lat_band: c.divide(1000000).floor(),
        stratum: c.mod(1000000).divide(100000).floor(),
        n_fires: c.mod(100000).divide(10000).floor(),
        first_fire: c.mod(10000),
        area_ha: g.get('sum'),
        pop_asset: P.POP_ID, run_tag: P.RUN_TAG, created: created
      });
    }));
  }).flatten();
}

var perPart = Math.ceil(nTiles / P.N_PARTS);
for (var i = 0; i < P.N_PARTS; i++) {
  var start = i * perPart, end = Math.min(start + perPart, nTiles);
  if (start >= end) { break; }
  var suffix = 'part0' + (i + 1);
  Export.table.toDrive({
    collection: reduceTiles(ee.FeatureCollection(gridList.slice(start, end))),
    description: 'area_4B_pop_' + P.RUN_TAG.replace('.', '_') + '_' + suffix,
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: 'area_4B_pop_' + P.RUN_TAG + '_' + suffix,
    fileFormat: 'CSV',
    selectors: ['tile_id', 'lat_band', 'stratum', 'n_fires', 'first_fire', 'area_ha', 'pop_asset', 'run_tag', 'created']
  });
}
