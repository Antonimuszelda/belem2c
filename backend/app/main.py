# backend/app/main.py - GEE Autenticado REAL, SEM IA, Sintaxe Corrigida

import os
import datetime
import traceback
import json
from typing import List, Dict, Any
import base64
import tempfile # Para usar a chave JSON da variável de ambiente

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from geojson import FeatureCollection, Feature, Point # type: ignore
import ee # type: ignore
import fiona # type: ignore
from shapely.geometry import shape, Polygon, mapping # type: ignore

# REMOVIDA A IMPORTAÇÃO: from .ia_processor import generate_ai_report

# --- Variáveis de Ambiente e Autenticação GEE ---
GEE_PROJECT_ID = os.getenv('GEE_PROJECT_ID')
CREDENTIALS_JSON_CONTENT = os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON')
CREDENTIALS_JSON_BASE64 = os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64')

# --- Caminhos GeoJSON ---
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
GEOJSON_FILES = [
    'geopackages_n_setorizadas.json',
    'FCUs_BR.json',
    'qg_2022_670_fcu_agreg.json',
    'setores_censitarios.json'
]

# --- Inicialização GEE ---
EE_INITIALIZED = False
_temp_cred_file_path = None # Guarda o caminho do arquivo temporário

try:
    if not GEE_PROJECT_ID:
        print("AVISO: GEE_PROJECT_ID não definido.")
    else:
        credentials_dict = None
        # Prioriza a variável Base64 se existir
        if CREDENTIALS_JSON_BASE64:
            try:
                print("Tentando autenticar GEE via JSON Base64...")
                json_bytes = base64.b64decode(CREDENTIALS_JSON_BASE64)
                credentials_dict = json.loads(json_bytes.decode('utf-8'))
            except Exception as b64_e:
                print(f"ERRO CRÍTICO: Falha ao decodificar GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64: {b64_e}")
        # Senão, tenta a variável JSON direta
        elif CREDENTIALS_JSON_CONTENT:
            try:
                print("Tentando autenticar GEE via JSON direto...")
                credentials_dict = json.loads(CREDENTIALS_JSON_CONTENT)
            except json.JSONDecodeError:
                 print(f"ERRO CRÍTICO: GOOGLE_APPLICATION_CREDENTIALS_JSON não é um JSON válido.")

        # Se conseguiu carregar as credenciais de alguma forma
        if credentials_dict:
            try:
                # Cria um arquivo temporário para as credenciais (algumas libs GEE preferem arquivo)
                # O arquivo será excluído quando o programa sair
                with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.json') as temp_f:
                    json.dump(credentials_dict, temp_f)
                    _temp_cred_file_path = temp_f.name

                # Define a variável de ambiente para que ee.Initialize() a encontre
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = _temp_cred_file_path

                # Inicializa usando as credenciais do ambiente (que agora apontam para o temp file)
                # Usar o endpoint high volume é recomendado para APIs
                ee.Initialize(project=GEE_PROJECT_ID, opt_url='https://earthengine-highvolume.googleapis.com')
                EE_INITIALIZED = True
                print("GEE inicializado com sucesso usando Conta de Serviço.")

            except KeyError as key_err:
                print(f"ERRO CRÍTICO: Chave ausente no JSON da Conta de Serviço: {key_err}")
            except Exception as auth_e:
                print(f"ERRO CRÍTICO: Falha na autenticação GEE com Conta de Serviço: {auth_e}")
        else:
             print("AVISO: Nenhuma credencial GEE (JSON ou Base64) encontrada. GEE não autenticado.")

except Exception as e:
    print(f"ERRO GERAL na inicialização do GEE: {e}")

# Limpeza do arquivo temporário (opcional, mas boa prática)
# Pode ser feito no shutdown do FastAPI se necessário, mas geralmente o SO limpa /tmp
# def cleanup_temp_file():
#     if _temp_cred_file_path and os.path.exists(_temp_cred_file_path):
#         os.remove(_temp_cred_file_path)
# atexit.register(cleanup_temp_file) # Registra a limpeza para a saída


# =========================================================
# API E CORS
# =========================================================
app = FastAPI(title="HARP-IA GeoProcessor API (Sem IA)", version="1.2.0")

origins = [
    "https://harp-ia-demo-vovn-g0epl4hsg-antonimuszeldas-projects.vercel.app/", # Sua URL Vercel
    "http://localhost:3000", # Para dev local
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

# =========================================================
# SCHEMAS (Pydantic)
# =========================================================
class GeoJSONRequest(BaseModel):
    geojson: Dict[str, Any] = Field(..., description="Geometria GeoJSON (ex: {type: Polygon, coordinates: [...]}).")

class GEEImageRequest(GeoJSONRequest):
    date_from: str
    date_to: str
    composition: str

# REMOVIDO: AIAnalysisRequest

# =========================================================
# ENDPOINTS
# =========================================================

@app.get("/health")
def health_check():
    return {"status": "ok", "gee_initialized": EE_INITIALIZED}

# --- Endpoint GeoJSON (Favelas/Comunidades) ---
@app.post("/process_geojson", response_model=dict)
async def process_geojson(request: GeoJSONRequest):
    # ... (lógica fiona/shapely otimizada - INALTERADA) ...
    try:
        if request.geojson.get('type') != 'Polygon': raise ValueError("Geometria deve ser Polygon.")
        user_polygon = shape(request.geojson)
        all_features = []
        print(f"Iniciando busca em {len(GEOJSON_FILES)} arquivos GeoJSON...") # Log
        for filename in GEOJSON_FILES:
            filepath = os.path.join(DATA_DIR, filename)
            if not os.path.exists(filepath):
                 print(f"Aviso: Arquivo não encontrado {filepath}")
                 continue
            try:
                with fiona.open(filepath) as source:
                    # Filtra bounding box primeiro
                    possible_matches_index = list(source.items(bbox=user_polygon.bounds))
                    print(f"  Arquivo {filename}: {len(possible_matches_index)} features na BBox.") # Log
                    count_intersect = 0
                    for index, feature in possible_matches_index:
                        if feature['geometry'] and feature['geometry']['coordinates']:
                            feature_shape = shape(feature['geometry'])
                            if user_polygon.intersects(feature_shape):
                                intersection_geom = feature_shape.intersection(user_polygon)
                                if not intersection_geom.is_empty:
                                    feature_obj = Feature(
                                        geometry=mapping(intersection_geom),
                                        properties=feature.get('properties', {}) # Garante que properties exista
                                    )
                                    feature_obj.properties['source_file'] = filename
                                    all_features.append(feature_obj)
                                    count_intersect += 1
                        else:
                            # Log apenas se a geometria for realmente inválida
                            geom_type = feature.get('geometry', {}).get('type') if feature.get('geometry') else 'None'
                            if geom_type != 'Point' and geom_type != 'LineString' and geom_type != 'Polygon' and geom_type != 'MultiPolygon': # etc.
                                 print(f"Aviso: Geometria inválida/vazia em {filename}, idx {index}")

                    print(f"  Arquivo {filename}: {count_intersect} features intersectaram.") # Log
            except Exception as file_e:
                print(f"Erro processando {filename}: {type(file_e).__name__} - {file_e}")
                continue
        print(f"Total de {len(all_features)} feições encontradas.")
        return FeatureCollection(all_features)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro GeoJSON: {e}")


# --- Endpoints GEE (Imagens Satélite e DEM - Lógica Real) ---
@app.post("/get_latest_image")
async def get_latest_image(request: GEEImageRequest):
    if not EE_INITIALIZED: raise HTTPException(status_code=503, detail="GEE não inicializado.")
    try:
        ee_geom = ee.Geometry(request.geojson)
        composition_map = {
            'Sentinel-2_RGB': {'id': 'COPERNICUS/S2_SR_HARMONIZED', 'bands': ['B4', 'B3', 'B2'], 'vis': {'min': 100, 'max': 3500, 'gamma': 1.4}},
            'Sentinel-2_FCC': {'id': 'COPERNICUS/S2_SR_HARMONIZED', 'bands': ['B8', 'B4', 'B3'], 'vis': {'min': 100, 'max': 5000, 'gamma': 1.4}},
            'Sentinel-1_VV': {'id': 'COPERNICUS/S1_GRD', 'bands': ['VV'], 'vis': {'min': -25, 'max': 0}},
            'Sentinel-1_VH': {'id': 'COPERNICUS/S1_GRD', 'bands': ['VH'], 'vis': {'min': -30, 'max': -5}},
        }
        image_date = 'N/A'

        if request.composition == 'NDVI':
            collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(ee_geom).filterDate(request.date_from, request.date_to).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            image = collection.median().clip(ee_geom) # Usar mediana para NDVI é mais robusto
            band_names = image.bandNames().getInfo()
            if 'B8' not in band_names or 'B4' not in band_names: raise ValueError("Bandas NDVI (B8, B4) não encontradas.")
            ndvi = image.normalizedDifference(['B8', 'B4']).rename('ndvi')
            vis_params = {'min': -0.5, 'max': 0.9, 'palette': ['blue', 'white', 'green']}
            final_image = ndvi
        elif request.composition in composition_map:
            config = composition_map[request.composition]
            collection = ee.ImageCollection(config['id']).filterBounds(ee_geom).filterDate(request.date_from, request.date_to)
            if config['id'] == 'COPERNICUS/S1_GRD':
                 collection = collection.filter(ee.Filter.listContains('transmitterReceiverPolarisation', config['bands'][0])).filter(ee.Filter.eq('instrumentMode', 'IW'))
            elif config['id'] == 'COPERNICUS/S2_SR_HARMONIZED':
                 collection = collection.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            # Tenta pegar a imagem mais recente, senão mediana
            image = collection.sort('system:time_start', False).first()
            if image is None: image = collection.median()
            if image.bandNames().size().getInfo() == 0: raise HTTPException(status_code=404, detail=f"Nenhuma imagem {request.composition} encontrada.")
            else: # Tenta obter data da imagem (se for 'first')
                 try: date_millis = image.get('system:time_start').getInfo(); image_date = datetime.datetime.fromtimestamp(date_millis / 1000).strftime('%Y-%m-%d')
                 except Exception: pass # Ignora erro se for mediana
            image = image.clip(ee_geom)
            # Verifica se as bandas selecionadas existem na imagem
            img_bands = image.bandNames().getInfo()
            req_bands = config['bands']
            if not all(band in img_bands for band in req_bands):
                raise ValueError(f"Bandas requeridas {req_bands} não encontradas na imagem GEE. Bandas disponíveis: {img_bands}")
            final_image = image.select(req_bands)
            vis_params = config['vis']
        else: raise HTTPException(status_code=400, detail=f"Composição inválida: {request.composition}")

        map_info = final_image.getMapId(vis_params)
        return {"tile_url": map_info['tile_fetcher'].url_format, "date": image_date, "satellite": request.composition.split('_')[0]}
    except HTTPException as http_exc: raise http_exc
    except ee.EEException as gee_e: raise HTTPException(status_code=500, detail=f"Erro GEE: {gee_e}")
    except ValueError as val_e: raise HTTPException(status_code=400, detail=str(val_e)) # Erro de bandas, etc.
    except Exception as e: traceback.print_exc(); raise HTTPException(status_code=500, detail=f"Erro interno: {e}")

@app.post("/get_dem")
async def get_dem_data(request: GeoJSONRequest):
    if not EE_INITIALIZED: raise HTTPException(status_code=503, detail="GEE não inicializado.")
    try:
        ee_geom = ee.Geometry(request.geojson)
        dem = ee.Image('USGS/SRTMGL1_003').clip(ee_geom)
        stats = dem.reduceRegion(reducer=ee.Reducer.minMax(), geometry=ee_geom, scale=90, maxPixels=1e9).getInfo()
        min_el, max_el = stats.get('elevation_min'), stats.get('elevation_max')
        vis_params = {'min': min_el if min_el is not None else 0, 'max': max_el if max_el is not None else 3000, 'palette': ['006837', '1a9850', '66bd63', 'a6d96a', 'd9ef8b', 'fee08b', 'fdae61', 'f46d43', 'd73027', 'a50026']}
        map_info = dem.getMapId(vis_params)
        return {"tileUrl": map_info['tile_fetcher'].url_format, "min_elevation": min_el, "max_elevation": max_el}
    except Exception as e: traceback.print_exc(); raise HTTPException(status_code=500, detail=f"Erro GEE DEM: {e}")

# --- Endpoint Ilhas de Calor (GEE Real) ---
@app.post("/heat_island_analysis", response_model=dict)
async def heat_island_analysis(request: GeoJSONRequest):
    if not EE_INITIALIZED: raise HTTPException(status_code=503, detail="GEE não inicializado.")
    try:
        ee_geom = ee.Geometry(request.geojson)
        landsat = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2') \
            .filterBounds(ee_geom).filterDate('2023-01-01', datetime.datetime.now().strftime('%Y-%m-%d')) \
            .filter(ee.Filter.lt('CLOUD_COVER', 15)).select(['ST_B10'], ['LST']).median() # Mediana LST
        lst_celsius = landsat.multiply(0.00341802).add(149.0).subtract(273.15).clip(ee_geom)
        mean_temp_dict = lst_celsius.reduceRegion(ee.Reducer.mean(), ee_geom, 90).getInfo()
        mean_temp = mean_temp_dict.get('LST') if mean_temp_dict else None
        if mean_temp is None: raise ValueError("Temp. média não calculada.")
        threshold = mean_temp + 3.0
        hotspots = lst_celsius.gt(threshold).selfMask()
        temp_range = lst_celsius.reduceRegion(ee.Reducer.max().combine(ee.Reducer.min(), sharedInputs=True), ee_geom, 90).getInfo()
        min_t, max_t = temp_range.get('LST_min'), temp_range.get('LST_max')
        if min_t is None or max_t is None or max_t == min_t: intensity = lst_celsius.multiply(0).add(0.5).rename('intensity')
        else: intensity = lst_celsius.subtract(min_t).divide(max_t - min_t).rename('intensity')
        hotspots_with_intensity = hotspots.updateMask(hotspots).addBands(intensity)
        vectors = hotspots_with_intensity.reduceToVectors(geometry=ee_geom, scale=90, geometryType='polygon', eightConnected=False, labelProperty='intensity_val', reducer=ee.Reducer.mean(), maxPixels=5e8)
        geojson_result = vectors.getInfo()
        output_features = []
        for feature_dict in geojson_result['features']:
            intensity_val = feature_dict['properties'].get('intensity_val')
            intensity_norm = max(0, min(1, intensity_val if intensity_val is not None else 0))
            output_feature = Feature(geometry=feature_dict['geometry'], properties={'intensity': round(intensity_norm, 2)})
            output_features.append(output_feature)
        return FeatureCollection(output_features)
    except ee.EEException as gee_e: raise HTTPException(status_code=500, detail=f"Erro GEE Ilha de Calor: {gee_e}.")
    except Exception as e: traceback.print_exc(); raise HTTPException(status_code=500, detail=f"Erro interno Ilha de Calor: {e}")

# REMOVIDO: Endpoint /ai_analysis

# CORREÇÃO DE SINTAXE: Removido bloco if __name__ == "__main__":
# A inicialização é feita pelo Gunicorn/Uvicorn via Dockerfile ou Procfile