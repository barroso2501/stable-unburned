// =====================================================================
// 01_zonal_4A_cerrado.js  —  v0.2 (versão em blocos/tiles)
// Projeto: stable-unburned — picos sazonais em áreas estáveis
// Etapa 01 do piloto (ver docs/piloto_especificacao.md)
//
// O QUE FAZ
//   Quantifica a área de savana (classe 4) estável 1985–2025 e nunca
//   queimada (contexto A) dentro do bioma Cerrado, separada por:
//     (a) passa ou não no núcleo 3×3 (ponto + 8 vizinhos também 4-A);
//     (b) classe de distância até a borda antrópica (mapa LULC de 2025);
//     (c) fragmento de vegetação natural pequeno (< ~92 ha) ou não.
//
// POR QUE EM BLOCOS (mudança da v0.1)
//   A v0.1 fazia um único reduceRegion sobre o polígono inteiro do
//   Cerrado a 30 m, com focalMin, fastDistanceTransform e
//   connectedPixelCount. Isso ficou preso no servidor (>5 h, quase sem
//   processamento). Agora:
//     - o Cerrado vira uma máscara raster (sem recorte por polígono
//       complexo durante a redução);
//     - a área é dividida em blocos retangulares de TILE_DEG graus;
//     - cada bloco é reduzido separadamente (reduceRegions), e a
//       exportação é dividida em N_PARTS tarefas independentes.
//   O CSV sai com uma linha por bloco × combinação; a soma final por
//   combinação é feita depois (planilha ou Python).
//
// SAÍDA
//   Drive/<EXPORT_FOLDER>/zonal_4A_cerrado_<RUN_TAG>_partNN.csv
//   colunas: tile_id, code, core3x3, edge_class, edge_label,
//            small_patch, area_ha + proveniência
// =====================================================================


// ---------------------------------------------------------------------
// 1. PARÂMETROS — tudo que pode mudar entre rodadas fica aqui
// ---------------------------------------------------------------------
var P = {
  // Produto da etapa 00 (contexto A = nunca queimado), banda 'stable_class'
  STABLE_A: 'projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_never_burned',

  // MapBiomas LULC Col. 11 (mesmo asset usado na etapa 00)
  LULC: 'projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3',
  LULC_REF_YEAR: 2025,   // paisagem usada para medir borda e fragmento

  // Limite do bioma Cerrado: biomas IBGE (asset do projeto).
  // BIOME_FIELD = nome do campo com o nome do bioma (conferir no console).
  BIOMES: 'projects/ee-barroso2501/assets/biomas_IBGE',
  BIOME_FIELD: 'NM_BIOMA',
  BIOME_VALUE: 'Cerrado',

  TARGET_CLASS: 4,       // Formação Savânica

  // Classes antrópicas da legenda Col. 11 (definem a "borda"). CONFERIR.
  ANTHROPIC: [9, 15, 18, 19, 20, 21, 24, 30, 31, 35, 36, 39, 40, 41, 46, 47, 48, 62, 75],

  // Classes de vegetação natural (definem o "fragmento"). CONFERIR.
  NATURAL_VEG: [3, 4, 5, 6, 7, 11, 12, 29, 32, 49, 50, 77],

  // Limites das classes de distância à borda, em metros
  EDGE_BREAKS_M: [90, 250, 500, 1000],
  // Raio de busca da transformada de distância, em pixels (~30 m cada)
  EDGE_SEARCH_PX: 64,

  // Fragmento pequeno: < este nº de pixels conectados (máx. GEE = 1024).
  // RUN_SMALL_PATCH = false desliga este cálculo (é o mais pesado) e
  // grava small_patch = 9 ("não calculado").
  RUN_SMALL_PATCH: true,
  SMALL_PATCH_MAXPIX: 1024,

  // Grade de blocos: retângulo envolvente aproximado do Cerrado
  // [oeste, sul, leste, norte] em graus, e lado do bloco em graus.
  // Blocos que não tocam o Cerrado são descartados automaticamente.
  BBOX: [-61, -25, -41, -2],
  TILE_DEG: 1,

  // Nº de tarefas de exportação (cada uma com uma fatia dos blocos)
  N_PARTS: 4,

  // TESTE: se > 0, exporta só os primeiros N blocos numa única tarefa.
  // Rode primeiro com 3 para medir o tempo por bloco; depois ponha 0.
  TEST_N_TILES: 3,

  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.2'
};


// ---------------------------------------------------------------------
// 2. DADOS DE ENTRADA E CHECAGENS NO CONSOLE
// ---------------------------------------------------------------------
var stableA = ee.Image(P.STABLE_A).select('stable_class');

// Projeção nativa do produto: todas as contas são feitas nessa grade,
// para que o núcleo 3×3 corresponda exatamente aos pixels do LULC.
var proj = stableA.projection();
var projInfo = proj.getInfo();
print('Projeção do asset 4-A (confirmar ~30 m):', projInfo);

var lulcRef = ee.Image(P.LULC).select('classification_' + P.LULC_REF_YEAR);

var biomes = ee.FeatureCollection(P.BIOMES);
print('Primeira feição dos biomas (conferir campo e grafia):', biomes.first());
var cerrado = biomes.filter(ee.Filter.eq(P.BIOME_FIELD, P.BIOME_VALUE));
print('Feições do Cerrado encontradas (esperado ≥ 1):', cerrado.size());

// Máscara raster do Cerrado: "pinta" o polígono numa imagem.
// Evita recortar pelo polígono complexo durante cada redução.
var cerradoMask = ee.Image(0).byte().paint(cerrado, 1).eq(1);


// ---------------------------------------------------------------------
// 3. MÁSCARA 4-A E NÚCLEO 3×3
// ---------------------------------------------------------------------
// 1 onde o pixel é classe 4 estável e nunca queimado; 0 no resto.
// unmask(0) faz o focalMin tratar vizinhos fora da máscara como 0.
var is4A = stableA.eq(P.TARGET_CLASS).unmask(0);

// focalMin 3×3: 1 só se o pixel e os 8 vizinhos forem 4-A (decisão D04).
var core3x3 = is4A.focalMin({radius: 1, kernelType: 'square', units: 'pixels'});


// ---------------------------------------------------------------------
// 4. DISTÂNCIA ATÉ A BORDA ANTRÓPICA
// ---------------------------------------------------------------------
var anthropic = lulcRef.remap(P.ANTHROPIC, ee.List.repeat(1, P.ANTHROPIC.length), 0)
  .unmask(0).toInt();

// Distância (pixels) ao pixel antrópico mais próximo dentro do raio;
// sem antrópico no raio → valor alto (cai na última classe).
var distPx = anthropic.fastDistanceTransform(P.EDGE_SEARCH_PX).sqrt()
  .unmask(P.EDGE_SEARCH_PX * 10);
// Pixels → metros pelo lado do pixel (aproximação em EPSG:4326).
var distM = distPx.multiply(ee.Image.pixelArea().sqrt());

// 0 = <90 m, 1 = 90–250, 2 = 250–500, 3 = 500–1000, 4 = ≥1000 m
var b = P.EDGE_BREAKS_M;
var edgeClass = ee.Image(4)
  .where(distM.lt(b[3]), 3)
  .where(distM.lt(b[2]), 2)
  .where(distM.lt(b[1]), 1)
  .where(distM.lt(b[0]), 0);


// ---------------------------------------------------------------------
// 5. FRAGMENTO PEQUENO (opcional)
// ---------------------------------------------------------------------
var smallPatch;
if (P.RUN_SMALL_PATCH) {
  var naturalVeg = lulcRef.remap(P.NATURAL_VEG, ee.List.repeat(1, P.NATURAL_VEG.length), 0)
    .unmask(0).selfMask();
  // Conta pixels conectados (8 vizinhos) até o máximo; maiores saturam.
  var patchPix = naturalVeg.connectedPixelCount(P.SMALL_PATCH_MAXPIX, true);
  smallPatch = patchPix.lt(P.SMALL_PATCH_MAXPIX).unmask(0);
} else {
  smallPatch = ee.Image(9);   // 9 = não calculado
}


// ---------------------------------------------------------------------
// 6. IMAGEM DE CÓDIGOS E ÁREA
// ---------------------------------------------------------------------
// code = core3x3*100 + edge_class*10 + small_patch
// Ex.: 141 = passa no núcleo, borda ≥ 1000 m, fragmento pequeno.
var code = core3x3.multiply(100).add(edgeClass.multiply(10)).add(smallPatch)
  .updateMask(is4A.and(cerradoMask))   // só 4-A dentro do Cerrado
  .rename('code').toInt();

var areaHa = ee.Image.pixelArea().divide(1e4).rename('area_ha');
var img = areaHa.addBands(code);


// ---------------------------------------------------------------------
// 7. GRADE DE BLOCOS
// ---------------------------------------------------------------------
var step = P.TILE_DEG;
var lons = ee.List.sequence(P.BBOX[0], P.BBOX[2] - step, step);
var lats = ee.List.sequence(P.BBOX[1], P.BBOX[3] - step, step);

var grid = ee.FeatureCollection(lons.map(function (x) {
  return lats.map(function (y) {
    x = ee.Number(x); y = ee.Number(y);
    var rect = ee.Geometry.Rectangle([x, y, x.add(step), y.add(step)], null, false);
    return ee.Feature(rect, {
      tile_id: x.format('%.0f').cat('_').cat(y.format('%.0f'))
    });
  });
}).flatten())
  .filterBounds(cerrado.geometry());   // descarta blocos fora do Cerrado

var nTiles = grid.size().getInfo();
print('Nº de blocos que tocam o Cerrado:', nTiles);
var gridList = grid.toList(nTiles);


// ---------------------------------------------------------------------
// 8. REDUÇÃO POR BLOCO E EXPORTAÇÃO EM PARTES
// ---------------------------------------------------------------------
var edgeLabels = ee.List(['<90m', '90-250m', '250-500m', '500-1000m', '>=1000m']);
var created = ee.Date(Date.now()).format('YYYY-MM-dd');

// Reduz um conjunto de blocos e devolve uma linha por bloco × código.
function reduceTiles(tiles) {
  var res = img.reduceRegions({
    collection: tiles,
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
    crs: projInfo.crs,
    crsTransform: projInfo.transform,
    tileScale: 16
  });
  return res.map(function (f) {
    var groups = ee.List(f.get('groups'));
    return ee.FeatureCollection(groups.map(function (g) {
      g = ee.Dictionary(g);
      var c = ee.Number(g.get('code'));
      var edge = c.mod(100).divide(10).floor();
      return ee.Feature(null, {
        tile_id: f.get('tile_id'),
        code: c,
        core3x3: c.divide(100).floor(),
        edge_class: edge,
        edge_label: edgeLabels.get(edge),
        small_patch: c.mod(10),
        area_ha: g.get('sum'),
        stable_asset: P.STABLE_A,
        lulc_asset: P.LULC,
        lulc_ref_year: P.LULC_REF_YEAR,
        biome_asset: P.BIOMES,
        target_class: P.TARGET_CLASS,
        edge_search_px: P.EDGE_SEARCH_PX,
        small_patch_maxpix: P.RUN_SMALL_PATCH ? P.SMALL_PATCH_MAXPIX : 0,
        tile_deg: P.TILE_DEG,
        run_tag: P.RUN_TAG,
        created: created
      });
    }));
  }).flatten();
}

var SELECTORS = ['tile_id', 'code', 'core3x3', 'edge_class', 'edge_label', 'small_patch', 'area_ha',
  'stable_asset', 'lulc_asset', 'lulc_ref_year', 'biome_asset', 'target_class',
  'edge_search_px', 'small_patch_maxpix', 'tile_deg', 'run_tag', 'created'];

function exportPart(tiles, suffix) {
  Export.table.toDrive({
    collection: reduceTiles(tiles),
    description: 'zonal_4A_cerrado_' + P.RUN_TAG.replace('.', '_') + '_' + suffix,
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: 'zonal_4A_cerrado_' + P.RUN_TAG + '_' + suffix,
    fileFormat: 'CSV',
    selectors: SELECTORS
  });
}

if (P.TEST_N_TILES > 0) {
  // Modo teste: uma tarefa só, com os primeiros N blocos.
  exportPart(ee.FeatureCollection(gridList.slice(0, P.TEST_N_TILES)), 'test');
  print('MODO TESTE: exportando ' + P.TEST_N_TILES + ' blocos. Para a rodada completa, TEST_N_TILES = 0.');
} else {
  // Rodada completa: N_PARTS tarefas, cada uma com uma fatia dos blocos.
  var perPart = Math.ceil(nTiles / P.N_PARTS);
  for (var i = 0; i < P.N_PARTS; i++) {
    var start = i * perPart;
    var end = Math.min(start + perPart, nTiles);
    if (start >= end) { break; }
    exportPart(ee.FeatureCollection(gridList.slice(start, end)),
               'part' + (i < 9 ? '0' : '') + (i + 1));
  }
}


// ---------------------------------------------------------------------
// 9. VISUALIZAÇÃO RÁPIDA (opcional; camadas desligadas por padrão)
// ---------------------------------------------------------------------
Map.centerObject(cerrado, 5);
Map.addLayer(grid, {color: '555555'}, 'blocos', false);
Map.addLayer(is4A.selfMask().updateMask(cerradoMask), {palette: ['7dc975']}, '4-A (Cerrado)', false);
Map.addLayer(core3x3.selfMask().updateMask(cerradoMask), {palette: ['1f8d49']}, 'núcleo 3×3', false);
Map.addLayer(edgeClass.updateMask(is4A).updateMask(cerradoMask),
  {min: 0, max: 4, palette: ['d7191c', 'fdae61', 'ffffbf', 'a6d96a', '1a9641']},
  'classe de distância à borda (só 4-A)', false);
