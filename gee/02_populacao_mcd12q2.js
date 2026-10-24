// =====================================================================
// 02_populacao_mcd12q2.js  —  v0.1
// Projeto: stable-unburned — piloto savana estável sem fogo no Cerrado
// Etapa 02 (ver docs/piloto_especificacao.md e KB D12–D14)
//
// O QUE FAZ — em duas fases, escolhidas em RUN_PART:
//
//  RUN_PART = 'assets'  (rodar primeiro)
//   A1. Asset da POPULAÇÃO do piloto (30 m): 4-A no Cerrado que passa no
//       núcleo 3×3 (D04) e está a ≥ 250 m da borda antrópica (D12).
//       Banda única 'lat_band' (1–5, faixas de 5°, D14); fora da
//       população o pixel é mascarado.
//   A2. Asset de PUREZA no grid de 500 m do MODIS (MCD12Q2/MCD43A4):
//       % de pixels de 30 m da população dentro de cada pixel de 500 m.
//   A3. Asset de PUREZA no grid de ~232 m do MOD13Q1 (mesma lógica).
//   A4. CSV com a área de 4-A e de 4-B no Cerrado por faixa de latitude
//       (sem núcleo nem borda), para a fração sem fogo da savana estável.
//
//  RUN_PART = 'stats'  (rodar depois que A2 e A3 terminarem)
//   S1. CSV de viabilidade de pureza: nº de pixels MODIS puros
//       (≥ PURITY_MIN) por faixa e por grid (500 m e 232 m).
//   S2. CSV do MCD12Q2 2016–2024: nº de pixels puros de 500 m com
//       0, 1, 2 e ≥ 3 ciclos por ano e por faixa, e quantos têm o
//       ciclo 1 com qualidade boa (QA_Overall_1 ≤ 1).
//
// FAIXAS DE LATITUDE (lat_band)
//   1 = 0–5° S · 2 = 5–10° S · 3 = 10–15° S · 4 = 15–20° S · 5 = 20–25° S
// =====================================================================


// ---------------------------------------------------------------------
// 1. PARÂMETROS
// ---------------------------------------------------------------------
var P = {
  RUN_PART: 'assets',          // 'assets' ou 'stats'

  STABLE_A: 'projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_never_burned',
  STABLE_B: 'projects/ee-barroso2501/assets/stable/stable_col11_fire5_1_strict_burned',  // CONFIRMAR caminho
  LULC: 'projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3',
  LULC_REF_YEAR: 2025,

  BIOMES: 'projects/ee-barroso2501/assets/biomas_IBGE',
  BIOME_FIELD: 'Bioma',
  BIOME_VALUE: 'Cerrado',

  TARGET_CLASS: 4,
  // Mesmas listas da etapa 01 (CONFERIR na legenda Col. 11)
  ANTHROPIC: [9, 15, 18, 19, 20, 21, 24, 30, 31, 35, 36, 39, 40, 41, 46, 47, 48, 62, 75],
  EDGE_MIN_M: 250,             // D12
  EDGE_SEARCH_PX: 64,

  LAT_BAND_DEG: 5,             // D14

  // Pureza mínima (fração da população dentro do pixel MODIS) — a decidir;
  // o CSV S1 também traz contagens para 0,8 e 1,0, para sensibilidade.
  PURITY_MIN: 0.9,

  MCD12Q2: 'MODIS/061/MCD12Q2',
  MOD13Q1: 'MODIS/061/MOD13Q1',
  MCD_YEARS: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],

  BBOX: [-61, -25, -41, -2],   // retângulo envolvente do Cerrado
  TILE_DEG: 1,                 // blocos para a soma de área a 30 m (A4)

  ASSET_ROOT: 'projects/ee-barroso2501/assets/stable/',
  EXPORT_FOLDER: 'GEE_exports',
  RUN_TAG: 'v0.1'
};

var created = ee.Date(Date.now()).format('YYYY-MM-dd');
var bbox = ee.Geometry.Rectangle(P.BBOX, null, false);
var POP_ID = P.ASSET_ROOT + 'pilot_4A_cerrado_core_edge250';
var PUR500_ID = P.ASSET_ROOT + 'pilot_4A_purity_mcd500';
var PUR250_ID = P.ASSET_ROOT + 'pilot_4A_purity_mod13q1';


// ---------------------------------------------------------------------
// 2. FUNÇÕES AUXILIARES
// ---------------------------------------------------------------------
// Faixa de latitude 1–5 a partir da latitude do centro do pixel.
function latBandImage() {
  var lat = ee.Image.pixelLonLat().select('latitude');
  return lat.multiply(-1).divide(P.LAT_BAND_DEG).floor().add(1).toByte().rename('lat_band');
}

// Máscara raster do Cerrado (evita recorte por polígono complexo).
function cerradoMaskImage() {
  var cerrado = ee.FeatureCollection(P.BIOMES)
    .filter(ee.Filter.eq(P.BIOME_FIELD, P.BIOME_VALUE));
  print('Feições do Cerrado (esperado ≥ 1):', cerrado.size());
  return ee.Image(0).byte().paint(cerrado, 1).eq(1);
}


// =====================================================================
// FASE 'assets'
// =====================================================================
if (P.RUN_PART === 'assets') {

  var stableA = ee.Image(P.STABLE_A).select('stable_class');
  var proj = stableA.projection();
  var projInfo = proj.getInfo();
  print('Projeção 30 m:', projInfo);
  var cerradoMask = cerradoMaskImage();

  // --- A1. População: 4-A, núcleo 3×3, borda ≥ 250 m, dentro do Cerrado
  var is4A = stableA.eq(P.TARGET_CLASS).unmask(0);
  var core3x3 = is4A.focalMin({radius: 1, kernelType: 'square', units: 'pixels'});

  var lulcRef = ee.Image(P.LULC).select('classification_' + P.LULC_REF_YEAR);
  var anthropic = lulcRef.remap(P.ANTHROPIC, ee.List.repeat(1, P.ANTHROPIC.length), 0)
    .unmask(0).toInt();
  var distM = anthropic.fastDistanceTransform(P.EDGE_SEARCH_PX).sqrt()
    .unmask(P.EDGE_SEARCH_PX * 10)
    .multiply(ee.Image.pixelArea().sqrt());

  var popMask = core3x3.eq(1).and(distM.gte(P.EDGE_MIN_M)).and(cerradoMask);
  var pop = latBandImage().updateMask(popMask)
    .set({
      stable_asset: P.STABLE_A, lulc_asset: P.LULC, lulc_ref_year: P.LULC_REF_YEAR,
      biome_asset: P.BIOMES, target_class: P.TARGET_CLASS,
      core: '3x3 focalMin', edge_min_m: P.EDGE_MIN_M, edge_search_px: P.EDGE_SEARCH_PX,
      lat_band_deg: P.LAT_BAND_DEG, run_tag: P.RUN_TAG, created: created,
      decisions: 'D04 D08 D12 D13 D14'
    });

  Export.image.toAsset({
    image: pop,
    description: 'pilot_4A_cerrado_core_edge250',
    assetId: POP_ID,
    region: bbox,
    crs: projInfo.crs,
    crsTransform: projInfo.transform,
    maxPixels: 1e13,
    pyramidingPolicy: {'.default': 'mode'}
  });

  // --- A2/A3. Pureza nos grids MODIS: média de "é população" (0/1)
  // dentro de cada pixel MODIS. reduceResolution exige reproject no
  // grid de destino; ~280 px de 30 m por pixel de 500 m (< 1024).
  var popBinary = popMask.unmask(0).toFloat().rename('purity');

  function purityOnGrid(gridProj) {
    return popBinary
      .reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 1024})
      .reproject({crs: gridProj})
      .multiply(100).round().toByte()            // 0–100 (%)
      .updateMask(cerradoMask.reduceResolution({reducer: ee.Reducer.max(), maxPixels: 1024})
                              .reproject({crs: gridProj}));
  }

  var mcdProj = ee.ImageCollection(P.MCD12Q2).first().projection();
  var modProj = ee.ImageCollection(P.MOD13Q1).first().select('EVI').projection();
  print('Grid MCD12Q2 (~463 m):', mcdProj.nominalScale());
  print('Grid MOD13Q1 (~232 m):', modProj.nominalScale());

  var propsPurity = {pop_asset: POP_ID, run_tag: P.RUN_TAG, created: created, units: 'percent'};

  Export.image.toAsset({
    image: purityOnGrid(mcdProj).set(propsPurity).set({grid: 'MCD12Q2'}),
    description: 'pilot_4A_purity_mcd500',
    assetId: PUR500_ID,
    region: bbox,
    crs: mcdProj.getInfo().crs,
    crsTransform: mcdProj.getInfo().transform,
    maxPixels: 1e13,
    pyramidingPolicy: {'.default': 'mean'}
  });

  Export.image.toAsset({
    image: purityOnGrid(modProj).set(propsPurity).set({grid: 'MOD13Q1'}),
    description: 'pilot_4A_purity_mod13q1',
    assetId: PUR250_ID,
    region: bbox,
    crs: modProj.getInfo().crs,
    crsTransform: modProj.getInfo().transform,
    maxPixels: 1e13,
    pyramidingPolicy: {'.default': 'mean'}
  });

  // --- A4. Área de 4-A e 4-B no Cerrado por faixa (para a fração sem fogo)
  // code = contexto*10 + lat_band   (contexto 1 = A, 2 = B)
  var stableB = ee.Image(P.STABLE_B).select('stable_class');
  var ctx = ee.Image(0)
    .where(stableA.eq(P.TARGET_CLASS), 1)
    .where(stableB.eq(P.TARGET_CLASS), 2);
  var codeAB = ctx.multiply(10).add(latBandImage())
    .updateMask(ctx.gt(0).and(cerradoMask)).rename('code').toInt();
  var imgAB = ee.Image.pixelArea().divide(1e4).rename('area_ha').addBands(codeAB);

  // Grade de blocos (mesma lógica da etapa 01, que funcionou)
  var step = P.TILE_DEG;
  var lons = ee.List.sequence(P.BBOX[0], P.BBOX[2] - step, step);
  var lats = ee.List.sequence(P.BBOX[1], P.BBOX[3] - step, step);
  var grid = ee.FeatureCollection(lons.map(function (x) {
    return lats.map(function (y) {
      x = ee.Number(x); y = ee.Number(y);
      return ee.Feature(ee.Geometry.Rectangle([x, y, x.add(step), y.add(step)], null, false),
        {tile_id: x.format('%.0f').cat('_').cat(y.format('%.0f'))});
    });
  }).flatten());
  var cerradoFC = ee.FeatureCollection(P.BIOMES).filter(ee.Filter.eq(P.BIOME_FIELD, P.BIOME_VALUE));
  grid = grid.filterBounds(cerradoFC.geometry());

  var resAB = imgAB.reduceRegions({
    collection: grid,
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
    crs: projInfo.crs,
    crsTransform: projInfo.transform,
    tileScale: 16
  });
  var rowsAB = resAB.map(function (f) {
    return ee.FeatureCollection(ee.List(f.get('groups')).map(function (g) {
      g = ee.Dictionary(g);
      var c = ee.Number(g.get('code'));
      return ee.Feature(null, {
        tile_id: f.get('tile_id'),
        fire_context: ee.Algorithms.If(c.divide(10).floor().eq(1), 'A_never_burned', 'B_burned'),
        lat_band: c.mod(10),
        area_ha: g.get('sum'),
        stable_a_asset: P.STABLE_A, stable_b_asset: P.STABLE_B, biome_asset: P.BIOMES,
        target_class: P.TARGET_CLASS, run_tag: P.RUN_TAG, created: created
      });
    }));
  }).flatten();

  Export.table.toDrive({
    collection: rowsAB,
    description: 'area_4AB_cerrado_by_latband_' + P.RUN_TAG.replace('.', '_'),
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: 'area_4AB_cerrado_by_latband_' + P.RUN_TAG,
    fileFormat: 'CSV',
    selectors: ['tile_id', 'fire_context', 'lat_band', 'area_ha',
                'stable_a_asset', 'stable_b_asset', 'biome_asset', 'target_class', 'run_tag', 'created']
  });

  print('FASE assets: 3 exportações de asset + 1 CSV. Quando os assets de pureza ' +
        'terminarem, mude RUN_PART para "stats".');

  Map.centerObject(bbox, 5);
  Map.addLayer(pop, {min: 1, max: 5, palette: ['440154', '3b528b', '21918c', '5ec962', 'fde725']},
               'população por faixa (prévia)', false);
}


// =====================================================================
// FASE 'stats'  (lê os assets de pureza já exportados)
// =====================================================================
if (P.RUN_PART === 'stats') {

  var pur500 = ee.Image(PUR500_ID).divide(100);   // 0–1
  var pur250 = ee.Image(PUR250_ID).divide(100);
  var mcdInfo = pur500.projection().getInfo();
  var modInfo = pur250.projection().getInfo();

  // --- S1. Contagem de pixels por limiar de pureza, faixa e grid
  // code = lat_band*10 + classe de pureza (1: ≥0,8; 2: ≥0,9; 3: =1,0)
  function purityCounts(pur, info, gridName) {
    var cls = ee.Image(0)
      .where(pur.gte(0.8), 1).where(pur.gte(0.9), 2).where(pur.gte(1.0), 3);
    var code = latBandImage().multiply(10).add(cls).updateMask(cls.gt(0)).rename('code').toInt();
    var res = ee.Image(1).rename('n').addBands(code).reduceRegion({
      reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
      geometry: bbox, crs: info.crs, crsTransform: info.transform,
      maxPixels: 1e12, tileScale: 4
    });
    return ee.FeatureCollection(ee.List(res.get('groups')).map(function (g) {
      g = ee.Dictionary(g);
      var c = ee.Number(g.get('code'));
      return ee.Feature(null, {
        grid: gridName,
        lat_band: c.divide(10).floor(),
        purity_class: ee.List(['', '>=0.8 (exclusivo <0.9)', '>=0.9 (exclusivo <1.0)', '=1.0']).get(c.mod(10)),
        n_pixels: g.get('sum'),
        run_tag: P.RUN_TAG, created: created
      });
    }));
  }

  var s1 = purityCounts(pur500, mcdInfo, 'MCD12Q2_500m')
    .merge(purityCounts(pur250, modInfo, 'MOD13Q1_232m'));

  Export.table.toDrive({
    collection: s1,
    description: 'pilot_4A_purity_counts_' + P.RUN_TAG.replace('.', '_'),
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: 'pilot_4A_purity_counts_' + P.RUN_TAG,
    fileFormat: 'CSV',
    selectors: ['grid', 'lat_band', 'purity_class', 'n_pixels', 'run_tag', 'created']
  });

  // --- S2. Ciclos do MCD12Q2 nos pixels puros (≥ PURITY_MIN), por ano e faixa
  var pureMask = pur500.gte(P.PURITY_MIN);
  var mcd = ee.ImageCollection(P.MCD12Q2);

  var s2 = ee.FeatureCollection(P.MCD_YEARS.map(function (y) {
    var img = mcd.filterDate(y + '-01-01', (y + 1) + '-01-01').first();
    // Pixel sem ciclo válido sai mascarado no produto → 0 ciclos
    var nc = img.select('NumCycles').unmask(0).min(3);           // 0,1,2,3(=≥3)
    var good = img.select('QA_Overall_1').unmask(9).lte(1);       // ciclo 1 com QA 0–1
    var code = latBandImage().multiply(10).add(nc).rename('code').toInt();
    var res = ee.Image(1).rename('n').addBands(good.rename('good')).addBands(code)
      .updateMask(pureMask)
      .reduceRegion({
        reducer: ee.Reducer.sum().repeat(2).group({groupField: 2, groupName: 'code'}),
        geometry: bbox, crs: mcdInfo.crs, crsTransform: mcdInfo.transform,
        maxPixels: 1e12, tileScale: 4
      });
    return ee.FeatureCollection(ee.List(res.get('groups')).map(function (g) {
      g = ee.Dictionary(g);
      var c = ee.Number(g.get('code'));
      var sums = ee.List(g.get('sum'));
      return ee.Feature(null, {
        year: y,
        lat_band: c.divide(10).floor(),
        num_cycles: ee.List(['0', '1', '2', '>=3']).get(c.mod(10)),
        n_pixels: sums.get(0),
        n_cycle1_qa01: sums.get(1),
        purity_min: P.PURITY_MIN, mcd_asset: P.MCD12Q2,
        run_tag: P.RUN_TAG, created: created
      });
    }));
  })).flatten();

  Export.table.toDrive({
    collection: s2,
    description: 'pilot_4A_mcd12q2_cycles_' + P.RUN_TAG.replace('.', '_'),
    folder: P.EXPORT_FOLDER,
    fileNamePrefix: 'pilot_4A_mcd12q2_cycles_' + P.RUN_TAG,
    fileFormat: 'CSV',
    selectors: ['year', 'lat_band', 'num_cycles', 'n_pixels', 'n_cycle1_qa01',
                'purity_min', 'mcd_asset', 'run_tag', 'created']
  });

  print('FASE stats: 2 CSVs (pureza e ciclos MCD12Q2).');
  Map.centerObject(bbox, 5);
  Map.addLayer(pur500, {min: 0, max: 1, palette: ['ffffff', '1f8d49']}, 'pureza 500 m', false);
}
