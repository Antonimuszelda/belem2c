# backend/app/main.py - VERSÃO HARPIA (Processando MÚLTIPLOS GeoJSON)

import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Tuple, Dict, Any
import ee
import fiona # type: ignore
from shapely.geometry import shape, Polygon, mapping # type: ignore
from geojson import FeatureCollection # type: ignore
import datetime
import traceback # For detailed error logging

# --- ID do Projeto GEE (Substitua se necessário) ---
GEE_PROJECT_ID = 'gen-lang-client-0502761424' # VERIFIQUE SE ESTE É O SEU ID CORRETO

# --- Caminhos para os arquivos GeoJSON ---
# Assume que este script está em backend/app/ e o data está em backend/data/
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
GEOJSON_FILES = [
    'geopackages_n_setorizadas.json', # Renomeado para remover caracteres problemáticos
    'FCUs_BR.json',
    'qg_2022_670_fcu_agreg.json',
    'setores_censitarios.json'
]

# --- Inicialização do GEE e Tratamento de Erro ---
try:
    ee.Initialize(project=GEE_PROJECT_ID)
    GEE_INITIALIZED = True
    print("\nSUCESSO: Google Earth Engine inicializado com sucesso.")
except Exception as e:
    try:
        print("\nAviso: Tentando autenticação explícita do GEE...")
        ee.Authenticate()
        ee.Initialize(project=GEE_PROJECT_ID)
        GEE_INITIALIZED = True
        print("\nSUCESSO: Google Earth Engine inicializado após autenticação.")
    except Exception as auth_e:
        GEE_INITIALIZED = False
        print(f"\nERRO FATAL: Falha ao inicializar o Google Earth Engine.")
        print(f"Erro Inicial: {e}")
        print(f"Erro Autenticação: {auth_e}")
        print("Verifique o Project ID, a autenticação ('earthengine authenticate') e as permissões da conta.")

# =========================================================
# 🎯 Configuração FastAPI e CORS
# =========================================================
app = FastAPI(title="Harpia Geo-Analysis API")

origins = ["harp-iademo-production.up.railway.app, http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# 🎯 Classes de Modelos (Pydantic) - Sem alterações aqui
# =========================================================
class Coordinate(BaseModel):
    lat: float
    lng: float

class PolygonRequest(BaseModel):
    polygon: List[Coordinate]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    satellite: Optional[str] = None

class ImageResult(BaseModel):
    date: str
    satellite: str
    tile_url: str

class AnalysisResponse(BaseModel):
    available_images: List[ImageResult]

class TileResponse(BaseModel):
    tile_url: str

class DEMAnalysisResponse(BaseModel):
    tile_url: str
    min_elevation: Optional[float] = None
    max_elevation: Optional[float] = None

# =========================================================
# 🎯 FUNÇÕES AUXILIARES GEE - Sem alterações aqui
# =========================================================

def apply_s1_preprocessing(image: ee.Image) -> ee.Image:
    """Converte S1 linear para dB."""
    bands = image.bandNames().getInfo()
    sar_bands = [b for b in bands if b in ['VV', 'VH']]
    if not sar_bands:
        return image
    db_image = image.select(sar_bands).log10().multiply(10).rename(sar_bands)
    return image.addBands(db_image, None, True)

def get_gee_config(data_type: str) -> Tuple[ee.ImageCollection | ee.Image, Dict[str, Any]]:
    """Obtém a coleção GEE e a configuração de visualização para um tipo de dado."""
    if data_type == 'Sentinel-2_RGB':
        collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        config = {'bands': ['B4', 'B3', 'B2'], 'min': 0, 'max': 3000, 'gamma': 1.4}
    elif data_type == 'Sentinel-2_FCC':
        collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        config = {'bands': ['B8', 'B4', 'B3'], 'min': 0, 'max': 3000, 'gamma': 1.4}
    elif 'Sentinel-1' in data_type:
        collection = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT') \
                     .filter(ee.Filter.eq('instrumentMode', 'IW'))
        if data_type == 'Sentinel-1_VV':
            collection = collection.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
            config = {'bands': ['VV'], 'min': -25, 'max': 0}
        elif data_type == 'Sentinel-1_VH':
            collection = collection.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
            config = {'bands': ['VH'], 'min': -30, 'max': -5}
        elif data_type == 'Sentinel-1_VV_VH_RGB':
             collection = collection.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
                                     .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
             config = {'bands': ['VV', 'VH', 'VV'], 'min': [-25, -30, -25], 'max': [0, -5, 0], 'gamma': 1.0}
        else:
             raise ValueError(f"Composição Sentinel-1 desconhecida: {data_type}")
    elif data_type == 'NDVI':
        collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').select(['B4', 'B8'])
        config = {'min': -0.2, 'max': 0.8, 'palette': ['blue', 'white', 'lightgreen', 'green', 'darkgreen']}
    elif data_type == 'DEM':
        collection = ee.Image('USGS/SRTMGL1_003').select('elevation')
        config = {}
    else:
        raise ValueError(f"Tipo de dado/Satélite desconhecido: {data_type}")

    return collection, config

def create_ee_roi(polygon: List[Coordinate]) -> ee.Geometry.Polygon:
    """Cria um ee.Geometry.Polygon a partir de coordenadas do frontend."""
    coords_tuples = [(c.lng, c.lat) for c in polygon]
    if coords_tuples and coords_tuples[0] != coords_tuples[-1]:
        coords_tuples.append(coords_tuples[0])
    if not coords_tuples or len(coords_tuples) < 4:
         raise ValueError("Polígono inválido para GEE ROI (mínimo 3 vértices distintos).")
    return ee.Geometry.Polygon(coords_tuples)

# =========================================================
# 🎯 ENDPOINTS GEE: IMAGENS INDIVIDUAIS, MOSAICOS, DEM, NDVI - Sem alterações aqui
# =========================================================

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_area(request: PolygonRequest):
    if not GEE_INITIALIZED:
        raise HTTPException(status_code=500, detail="Google Earth Engine não inicializado.")
    if not request.satellite or not request.start_date or not request.end_date:
         raise HTTPException(status_code=400, detail="Satélite, data de início e data de fim são obrigatórios.")
    if not request.polygon or len(request.polygon) < 3:
        raise HTTPException(status_code=400, detail="Polígono inválido.")
    try:
        roi = create_ee_roi(request.polygon)
        collection, vis_config = get_gee_config(request.satellite)
        if not isinstance(collection, ee.ImageCollection):
             raise HTTPException(status_code=400, detail=f"Análise individual não suportada para tipo '{request.satellite}'. Use Mosaico ou endpoint específico.")
        filtered_collection = collection.filterBounds(roi) \
                                        .filterDate(request.start_date, request.end_date) \
                                        .sort('system:time_start', False)
        if 'Sentinel-2' in request.satellite:
             filtered_collection = filtered_collection.filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', 20))
        count = filtered_collection.size().getInfo()
        if count == 0:
            raise HTTPException(status_code=404, detail=f"Nenhuma imagem ({request.satellite}) encontrada para o período/área.")
        image_list = filtered_collection.toList(5)
        available_images = []
        for i in range(image_list.length().getInfo()):
            image = ee.Image(image_list.get(i))
            processed_image = image
            if 'Sentinel-1' in request.satellite:
                processed_image = apply_s1_preprocessing(image)
            clipped_image = processed_image.clip(roi)
            try:
                display_image = clipped_image.select(vis_config['bands'])
                map_id = display_image.getMapId(vis_config)
            except ee.EEException as e:
                print(f"Aviso: Erro ao gerar MapId para imagem {i}: {e}. Pulando imagem.")
                continue
            tile_url = map_id['tile_fetcher'].url_format
            date_ms = image.get('system:time_start').getInfo()
            date_str = datetime.datetime.fromtimestamp(date_ms / 1000, tz=datetime.timezone.utc).strftime('%Y-%m-%d')
            available_images.append(ImageResult(date=date_str, satellite=request.satellite, tile_url=tile_url))
        if not available_images:
             raise HTTPException(status_code=404, detail=f"Nenhuma imagem válida pôde ser processada para ({request.satellite}).")
        return AnalysisResponse(available_images=available_images)
    except ValueError as ve:
         raise HTTPException(status_code=400, detail=str(ve))
    except ee.EEException as gee_e:
        print(f"Erro GEE em /analyze: {gee_e}")
        raise HTTPException(status_code=500, detail=f"Erro GEE: {gee_e}")
    except Exception as e:
        print(f"Erro inesperado em /analyze: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {e}")

@app.post("/composite_analysis", response_model=TileResponse)
async def composite_analysis(request: PolygonRequest):
    if not GEE_INITIALIZED:
        raise HTTPException(status_code=500, detail="Google Earth Engine não inicializado.")
    if not request.satellite or not request.start_date or not request.end_date:
         raise HTTPException(status_code=400, detail="Satélite, data de início e data de fim são obrigatórios.")
    if request.satellite == 'DEM' or request.satellite == 'NDVI':
         raise HTTPException(status_code=400, detail=f"Use o endpoint específico '/{request.satellite.lower()}_analysis' para {request.satellite}.")
    if not request.polygon or len(request.polygon) < 3:
        raise HTTPException(status_code=400, detail="Polígono inválido.")
    try:
        roi = create_ee_roi(request.polygon)
        collection, vis_config = get_gee_config(request.satellite)
        if not isinstance(collection, ee.ImageCollection):
             raise HTTPException(status_code=400, detail=f"Mosaico não aplicável para tipo '{request.satellite}'.")
        filtered_collection = collection.filterBounds(roi) \
                                        .filterDate(request.start_date, request.end_date)
        if 'Sentinel-2' in request.satellite:
            filtered_collection = filtered_collection.filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', 20)) \
                                                     .select(vis_config['bands'])
        count = filtered_collection.size().getInfo()
        if count == 0:
             raise HTTPException(status_code=404, detail=f"Nenhuma imagem ({request.satellite}) encontrada para criar o mosaico.")
        if 'Sentinel-1' in request.satellite:
            composite_image = filtered_collection.mean()
            composite_image = apply_s1_preprocessing(composite_image)
        else:
            composite_image = filtered_collection.median()
        clipped_composite = composite_image.clip(roi)
        display_composite = clipped_composite.select(vis_config['bands'])
        map_id = display_composite.getMapId(vis_config)
        tile_url = map_id['tile_fetcher'].url_format
        return TileResponse(tile_url=tile_url)
    except ValueError as ve:
         raise HTTPException(status_code=400, detail=str(ve))
    except ee.EEException as gee_e:
        print(f"Erro GEE em /composite_analysis: {gee_e}")
        raise HTTPException(status_code=500, detail=f"Erro GEE: {gee_e}")
    except Exception as e:
        print(f"Erro inesperado em /composite_analysis: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {e}")

@app.post("/dem_analysis", response_model=DEMAnalysisResponse)
async def dem_analysis(request: PolygonRequest):
    if not GEE_INITIALIZED:
        raise HTTPException(status_code=500, detail="Google Earth Engine não inicializado.")
    if not request.polygon or len(request.polygon) < 3:
        raise HTTPException(status_code=400, detail="Polígono inválido.")
    try:
        roi = create_ee_roi(request.polygon)
        dem_image, _ = get_gee_config('DEM')
        clipped_dem = dem_image.clip(roi)
        stats = clipped_dem.reduceRegion(
            reducer=ee.Reducer.minMax(),
            geometry=roi,
            scale=30,
            maxPixels=1e9
        ).getInfo()
        min_elevation = stats.get('elevation_min')
        max_elevation = stats.get('elevation_max')
        dem_vis_config = {
            'min': min_elevation if min_elevation is not None else 0,
            'max': max_elevation if max_elevation is not None else 3000,
            'palette': ['0000ff', '00ff00', 'ffff00', 'ff0000', 'ffffff']
        }
        map_id = clipped_dem.getMapId(dem_vis_config)
        tile_url = map_id['tile_fetcher'].url_format
        return DEMAnalysisResponse(tile_url=tile_url, min_elevation=min_elevation, max_elevation=max_elevation)
    except ValueError as ve:
         raise HTTPException(status_code=400, detail=str(ve))
    except ee.EEException as gee_e:
        print(f"Erro GEE em /dem_analysis: {gee_e}")
        raise HTTPException(status_code=500, detail=f"Erro GEE: {gee_e}")
    except Exception as e:
        print(f"Erro inesperado em /dem_analysis: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {e}")

@app.post("/ndvi_analysis", response_model=TileResponse)
async def ndvi_analysis(request: PolygonRequest):
    if not GEE_INITIALIZED:
        raise HTTPException(status_code=500, detail="Google Earth Engine não inicializado.")
    if not request.start_date or not request.end_date:
         raise HTTPException(status_code=400, detail="Data de início e data de fim são obrigatórios.")
    if not request.polygon or len(request.polygon) < 3:
        raise HTTPException(status_code=400, detail="Polígono inválido.")
    try:
        roi = create_ee_roi(request.polygon)
        s2_collection, _ = get_gee_config('Sentinel-2_RGB')
        _, ndvi_vis_config = get_gee_config('NDVI')
        def compute_ndvi(image):
            ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
            return image.addBands(ndvi)
        def mask_s2_clouds(image):
            qa = image.select('QA60')
            cloud_bit_mask = 1 << 10
            cirrus_bit_mask = 1 << 11
            mask = qa.bitwiseAnd(cloud_bit_mask).eq(0) \
                   .And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
            return image.updateMask(mask).select("B4","B8", "QA60").copyProperties(image, ["system:time_start"]) # Adicionado QA60 à seleção
        filtered_collection = s2_collection.filterBounds(roi) \
                                           .filterDate(request.start_date, request.end_date) \
                                           .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', 30)) \
                                           .map(mask_s2_clouds) \
                                           .map(compute_ndvi) \
                                           .select('NDVI')
        count = filtered_collection.size().getInfo()
        if count == 0:
             raise HTTPException(status_code=404, detail=f"Nenhuma imagem Sentinel-2 adequada encontrada para calcular NDVI.")
        ndvi_composite = filtered_collection.median()
        clipped_ndvi = ndvi_composite.clip(roi)
        map_id = clipped_ndvi.getMapId(ndvi_vis_config)
        tile_url = map_id['tile_fetcher'].url_format
        return TileResponse(tile_url=tile_url)
    except ValueError as ve:
         raise HTTPException(status_code=400, detail=str(ve))
    except ee.EEException as gee_e:
        print(f"Erro GEE em /ndvi_analysis: {gee_e}")
        raise HTTPException(status_code=500, detail=f"Erro GEE: {gee_e}")
    except Exception as e:
        print(f"Erro inesperado em /ndvi_analysis: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {e}")


# =========================================================
# 🎯 ENDPOINT: CENSO ANALYSIS (AGORA PROCESSA MÚLTIPLOS ARQUIVOS)
# =========================================================

@app.post("/censo_analysis")
async def censo_analysis(request: PolygonRequest):
    """Recorta MÚLTIPLOS GeoJSON locais pela ROI e retorna as feições intersectadas."""
    if not request.polygon or len(request.polygon) < 3:
        raise HTTPException(status_code=400, detail="Polígono inválido ou não fornecido.")

    coords_list = [[c.lng, c.lat] for c in request.polygon]
    if coords_list and coords_list[0] != coords_list[-1]:
        coords_list.append(coords_list[0])

    all_filtered_features = [] # Lista para acumular feições de todos os arquivos

    try:
        # Cria o polígono Shapely para interseção
        roi_polygon = Polygon(coords_list)
        if not roi_polygon.is_valid:
             raise ValueError("Polígono da ROI inválido.")

        # Itera sobre a lista de nomes de arquivos GeoJSON
        for filename in GEOJSON_FILES:
            geojson_path = os.path.join(DATA_DIR, filename)

            # Verifica se o arquivo GeoJSON existe antes de tentar abrir
            if not os.path.exists(geojson_path):
                print(f"Aviso: Arquivo GeoJSON não encontrado em '{geojson_path}'. Pulando.")
                continue # Pula para o próximo arquivo

            try:
                # Abre o GeoJSON e filtra por interseção
                with fiona.open(geojson_path, 'r', encoding='utf-8') as source:
                    source_crs = source.crs
                    print(f"Processando '{filename}' (CRS: {source_crs})...")

                    for feature in source:
                        try:
                            feature_shape = shape(feature['geometry'])

                            # Verifica validade das geometrias antes da interseção
                            if not feature_shape.is_valid:
                                print(f"Aviso: Geometria inválida encontrada em '{filename}'. Tentando corrigir...")
                                feature_shape = feature_shape.buffer(0) # Tenta corrigir geometria inválida
                                if not feature_shape.is_valid:
                                     print(f"Aviso: Correção falhou. Pulando feature inválida.")
                                     continue # Pula esta feature se ainda for inválida

                            # Realiza a interseção
                            if feature_shape.intersects(roi_polygon):
                                intersected_geom = feature_shape.intersection(roi_polygon)

                                # Pega TODAS as propriedades originais
                                properties = dict(feature['properties'])
                                # Adiciona o nome do arquivo de origem às propriedades
                                properties['source_file'] = filename

                                # Cria a nova feature com a geometria intersectada/clipada
                                new_feature = {
                                    "type": "Feature",
                                    # Corrige geometria resultante se necessário (pode gerar MultiPolygons, etc.)
                                    "geometry": mapping(intersected_geom.buffer(0)),
                                    "properties": properties
                                }
                                all_filtered_features.append(new_feature)
                        except Exception as feat_e:
                            print(f"Aviso: Erro ao processar uma feature em '{filename}': {feat_e}. Pulando feature.")
                            continue # Pula para a próxima feature

            except fiona.errors.DriverError as fiona_err:
                print(f"Erro Crítico ao abrir ou ler '{filename}': {fiona_err}. Verifique se o arquivo é um GeoJSON válido.")
                # Decide se quer parar ou continuar com os outros arquivos
                # raise HTTPException(status_code=500, detail=f"Erro ao ler o arquivo de dados '{filename}'.")
                continue # Continua com o próximo arquivo
            except Exception as file_e:
                print(f"Erro inesperado ao processar o arquivo '{filename}': {type(file_e).__name__} - {file_e}")
                continue # Continua com o próximo arquivo

        # Após iterar por todos os arquivos
        if not all_filtered_features:
            print("Aviso: Nenhum setor encontrado intersectando o polígono em nenhum dos arquivos.")
            return FeatureCollection([])

        print(f"Sucesso: {len(all_filtered_features)} setores encontrados em {len(GEOJSON_FILES)} arquivo(s).")
        return FeatureCollection(all_filtered_features)

    except ValueError as ve:
         raise HTTPException(status_code=400, detail=f"Erro de validação: {str(ve)}")
    except ImportError:
         raise HTTPException(status_code=500, detail="Erro de dependência: Fiona ou Shapely não instalados corretamente.")
    except Exception as e:
        print(f"Erro inesperado no processamento geral do GeoJSON: {type(e).__name__} - {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar GeoJSON: {type(e).__name__}: {str(e)}")

# =========================================================
# 🎯 Ponto de Entrada (para Uvicorn)
# =========================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)