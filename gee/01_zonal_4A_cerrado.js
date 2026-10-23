// =====================================================================
// 01_zonal_4A_cerrado.js
// Projeto: stable-unburned — picos sazonais em áreas estáveis
// Etapa 0 do piloto (ver docs/piloto_especificacao.md)
//
// O QUE FAZ
//   Quantifica a área de savana (classe 4) estável 1985–2025 e nunca
//   queimada (contexto A) dentro do bioma Cerrado, separada por:
//     (a) passa ou não no núcleo 3×3 (ponto + 8 vizinhos também 4-A);
//     (b) classe de distância até a borda antrópica (mapa LULC de 2025);
//     (c) fragmento de vegetação natural pequeno (< ~92 ha) ou não.
//   O resultado é um CSV no Drive, com uma linha por combinação.
//   Serve para decidir os limiares de fragmento e borda do piloto
//   antes de sortear a amostra.
//
// ENTRADAS
//   - asset de áreas estáveis nunca queimadas (produto da etapa 00)
//   - MapBiomas LULC Col. 11 (ano de referência para borda)
//   - limite do bioma Cerrado (FeatureCollection — AJUSTAR abaixo)
//
// SAÍDA
//   Drive/<EXPORT_FOLDER>/zonal_4A_cerrado_<RUN_TAG>.csv
//   colunas: code, core3x3, edge_class, edge_label, small_patch,
//            area_ha + propriedades de proveniência
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

  // Limite do bioma Cerrado — AJUSTAR: caminho de uma FeatureCollection
  // com os biomas IBGE (1:250.000) e o campo/valor que identifica o Cerrado.
  // Ex.: um shapefile IBGE de biomas subido como asset próprio.
  BIOMES: 'projects/ee-barroso2501/assets/limites/biomas_ibge_250mil',
  BIOME_FIELD: 'Bioma',
  BIOME_VALUE: 'Cerrado',

  TARGET_CLASS: 4,       // Formação Savânica

  // Classes antrópicas da legenda Col. 11 (definem a "borda").
  // CONFERIR na legenda oficial da Col. 11 antes de rodar.
  ANTHROPIC: [9, 15, 18, 19, 20, 21, 24, 30, 31, 35, 36, 39, 40, 41, 46, 47, 48, 62, 75],

  // Classes de vegetação natural (definem o "fragmento").
  // CONFERIR na legenda Col. 11 (inclui classes novas 7 e 77).
  NATURAL_VEG: [3, 4, 5, 6, 7, 11, 12, 29, 32, 49, 50, 77],

  // Limites das classes de distância à borda, em metros
  EDGE_BREAKS_M: [90, 250, 500, 1000],

  // Raio de busca da transformada de distância, em pixels (~30 m cada).
  // 64 px ≈ 1,9 km: distâncias acima disso ficam todas na última classe.
  EDGE_SEARCH_PX: 64,

  // Fragmento "pequeno": menos que este número de pixels conectados.
  // O GEE limita connectedPixelCount a 1024 px (~92 ha a 30 m).
  SMALL_PATCH_MAXPIX: 1024,

  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};


// ---------------------------------------------------------------------
// 2. DADOS DE ENTRADA E CHECAGENS NO CONSOLE
// ---------------------------------------------------------------------
var stableA = ee.Image(P.STABLE_A).select('stable_class');

// Projeção nativa do produto: todas as contas são feitas nessa grade,
// para que o núcleo 3×3 corresponda exatamente aos pixels do LULC.
var proj = stableA.projection();
print('Projeção do asset 4-A (confirmar ~30 m):', proj);
print('Propriedades de proveniência do asset:', ee.Image(P.STABLE_A).toDictionary());

var lulcRef = ee.Image(P.LULC).select('classification_' + P.LULC_REF_YEAR);
print('Banda LULC usada para borda/fragmento:', lulcRef.bandNames());

var cerrado = ee.FeatureCollection(P.BIOMES)
  .filter(ee.Filter.eq(P.BIOME_FIELD, P.BIOME_VALUE));
print('Feições do Cerrado encontradas (esperado ≥ 1):', cerrado.size());
var region = cerrado.geometry();


// ---------------------------------------------------------------------
// 3. MÁSCARA 4-A E NÚCLEO 3×3
// ---------------------------------------------------------------------
// 1 onde o pixel é classe 4 estável e nunca queimado; 0 no resto.
// unmask(0) é necessário para que o focalMin "enxergue" vizinhos fora
// da máscara como 0 (e não como ausentes).
var is4A = stableA.eq(P.TARGET_CLASS).unmask(0);

// focalMin num quadrado 3×3: resulta 1 só se o pixel e os 8 vizinhos
// forem todos 4-A (decisão D04).
var core3x3 = is4A.focalMin({radius: 1, kernelType: 'square', units: 'pixels'});


// ---------------------------------------------------------------------
// 4. DISTÂNCIA ATÉ A BORDA ANTRÓPICA
// ---------------------------------------------------------------------
// 1 em pixels de classe antrópica no ano de referência, 0 no resto.
var anthropic = lulcRef.remap(P.ANTHROPIC, ee.List.repeat(1, P.ANTHROPIC.length), 0)
  .unmask(0).toInt();

// fastDistanceTransform devolve a distância ao pixel antrópico mais
// próximo, em pixels ao quadrado, dentro do raio de busca. Onde não há
// pixel antrópico no raio, preenche-se com um valor alto (sem borda próxima).
var distPx = anthropic.fastDistanceTransform(P.EDGE_SEARCH_PX).sqrt()
  .unmask(P.EDGE_SEARCH_PX * 10);

// Converte pixels em metros usando o lado do pixel (raiz da área).
// Em EPSG:4326 o pixel não é exatamente quadrado; o erro é de poucos %.
var distM = distPx.multiply(ee.Image.pixelArea().sqrt());

// Classe de distância: 0 = < 90 m, 1 = 90–250, 2 = 250–500,
// 3 = 500–1000, 4 = ≥ 1000 m.
var b = P.EDGE_BREAKS_M;
var edgeClass = ee.Image(4)
  .where(distM.lt(b[3]), 3)
  .where(distM.lt(b[2]), 2)
  .where(distM.lt(b[1]), 1)
  .where(distM.lt(b[0]), 0);


// ---------------------------------------------------------------------
// 5. FRAGMENTO PEQUENO
// ---------------------------------------------------------------------
// Vegetação natural contígua (conectividade de 8 vizinhos). O GEE só
// conta até SMALL_PATCH_MAXPIX pixels; fragmentos maiores saem com o
// valor máximo. Então só dá para afirmar "menor que ~92 ha" ou não.
var naturalVeg = lulcRef.remap(P.NATURAL_VEG, ee.List.repeat(1, P.NATURAL_VEG.length), 0)
  .unmask(0).selfMask();
var patchPix = naturalVeg.connectedPixelCount(P.SMALL_PATCH_MAXPIX, true);
var smallPatch = patchPix.lt(P.SMALL_PATCH_MAXPIX).unmask(0);


// ---------------------------------------------------------------------
// 6. ÁREA POR COMBINAÇÃO (um código numérico por combinação)
// ---------------------------------------------------------------------
// code = core3x3*100 + edge_class*10 + small_patch
// Ex.: 141 = passa no núcleo, borda ≥ 1000 m, fragmento pequeno.
var code = core3x3.multiply(100).add(edgeClass.multiply(10)).add(smallPatch)
  .updateMask(is4A)            // só pixels 4-A entram na conta
  .rename('code').toInt();

var areaHa = ee.Image.pixelArea().divide(1e4).rename('area_ha');

var projInfo = proj.getInfo();  // crs e transform para reduzir na grade nativa

var stats = areaHa.addBands(code).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
  geometry: region,
  crs: projInfo.crs,
  crsTransform: projInfo.transform,
  maxPixels: 1e13,
  tileScale: 16
});


// ---------------------------------------------------------------------
// 7. TABELA DE SAÍDA COM PROVENIÊNCIA
// ---------------------------------------------------------------------
var edgeLabels = ee.List(['<90m', '90-250m', '250-500m', '500-1000m', '>=1000m']);
var created = ee.Date(Date.now()).format('YYYY-MM-dd');

var table = ee.FeatureCollection(ee.List(stats.get('groups')).map(function (g) {
  g = ee.Dictionary(g);
  var c = ee.Number(g.get('code'));
  var edge = c.mod(100).divide(10).floor();
  return ee.Feature(null, {
    code: c,
    core3x3: c.divide(100).floor(),
    edge_class: edge,
    edge_label: edgeLabels.get(edge),
    small_patch: c.mod(10),
    area_ha: g.get('sum'),
    // proveniência
    stable_asset: P.STABLE_A,
    lulc_asset: P.LULC,
    lulc_ref_year: P.LULC_REF_YEAR,
    biome_asset: P.BIOMES,
    target_class: P.TARGET_CLASS,
    edge_search_px: P.EDGE_SEARCH_PX,
    small_patch_maxpix: P.SMALL_PATCH_MAXPIX,
    run_tag: P.RUN_TAG,
    created: created
  });
}));

Export.table.toDrive({
  collection: table,
  description: 'zonal_4A_cerrado_' + P.RUN_TAG.replace('.', '_'),
  folder: P.EXPORT_FOLDER,
  fileNamePrefix: 'zonal_4A_cerrado_' + P.RUN_TAG,
  fileFormat: 'CSV',
  selectors: ['code', 'core3x3', 'edge_class', 'edge_label', 'small_patch', 'area_ha',
              'stable_asset', 'lulc_asset', 'lulc_ref_year', 'biome_asset', 'target_class',
              'edge_search_px', 'small_patch_maxpix', 'run_tag', 'created']
});


// ---------------------------------------------------------------------
// 8. VISUALIZAÇÃO RÁPIDA (opcional, para inspeção no mapa)
// ---------------------------------------------------------------------
Map.centerObject(cerrado, 5);
Map.addLayer(is4A.selfMask().clip(region), {palette: ['7dc975']}, '4-A (Cerrado)', false);
Map.addLayer(core3x3.selfMask().clip(region), {palette: ['1f8d49']}, 'núcleo 3×3', false);
Map.addLayer(edgeClass.updateMask(is4A).clip(region),
  {min: 0, max: 4, palette: ['d7191c', 'fdae61', 'ffffbf', 'a6d96a', '1a9641']},
  'classe de distância à borda (só 4-A)', false);
Map.addLayer(smallPatch.selfMask().clip(region), {palette: ['ff00ff']}, 'fragmento < ~92 ha', false);
