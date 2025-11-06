# backend/app/main.py - GEE + Agente + GeoJSON (pasta data)
from __future__ import annotations

from typing import List, Optional, Dict, Any
import os
import json
import base64
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import geojson
import ee

# Carrega variáveis do backend/.env para testes locais
load_dotenv()

# Rotas do agente
from .agent_routes import router as agent_router

# =========================
# Autenticação Google Earth Engine (robusta)
# =========================
def _load_service_account_json_str() -> str:
    """
    Carrega a credencial do serviço GEE como string JSON.
    Aceita:
      - GOOGLE_APPLICATION_CREDENTIALS_JSON (JSON puro)
      - GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64 (JSON em base64)
    """
    raw_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    raw_b64 = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64")

    if raw_json and raw_json.strip():
        # Pode estar com quebras de linha escapadas; normalize
        return raw_json.strip()

    if raw_b64 and raw_b64.strip():
        try:
            return base64.b64decode(raw_b64.strip()).decode("utf-8")
        except Exception as e:
            raise RuntimeError(f"Falha ao decodificar GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64: {e}")

    raise RuntimeError(
        "Credenciais GEE ausentes. Defina GOOGLE_APPLICATION_CREDENTIALS_JSON ou GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64."
    )

GEE_PROJECT_ID = os.getenv("D_DO_PROJETO_GEE")
if not GEE_PROJECT_ID:
    raise RuntimeError("Variável D_DO_PROJETO_GEE não definida.")

try:
    key_json_str = _load_service_account_json_str()
    key_obj = json.loads(key_json_str)
    service_email = key_obj.get("client_email")
    if not service_email:
        raise RuntimeError("Campo 'client_email' não encontrado no JSON da credencial.")

    # Importante: passar key_data como STRING JSON (não dict)
    credentials = ee.ServiceAccountCredentials(service_email, key_data=key_json_str)
    ee.Initialize(credentials, project=GEE_PROJECT_ID)
    print(f"✅ GEE inicializado com sucesso! Projeto: {GEE_PROJECT_ID} | Service: {service_email}")
except Exception as e:
    raise RuntimeError(f"Falha ao inicializar GEE: {e}")

# =========================
# Paths - pasta data (GeoJSON)
# =========================
# backend/app/main.py -> base_dir = backend/
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = (BASE_DIR / "data").resolve()  # esperado: backend/data

# =========================
# FastAPI app e CORS
# =========================
app = FastAPI(
    title="Sentinel-IA API + Agente",
    description="API para imagens (GEE), DEM, GeoJSON e agente (Google ADK).",
    version="2.1.1",
    docs_url="/docs",
    redoc_url="/redoc",
)

# =========================
# FastAPI app e CORS
# =========================
app = FastAPI(
    title="Sentinel-IA API + Agente",
    description="API para imagens (GEE), DEM, GeoJSON e agente (Google ADK).",
    version="2.1.1",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configuração de CORS para aceitar o frontend no Vercel
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://harp-ia-demo-5c39.vercel.app",  # URL de produção do Vercel
]

# Adiciona a URL do frontend do Vercel se definida
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)
    # Adiciona também a versão sem trailing slash
    allowed_origins.append(frontend_url.rstrip('/'))

# Permite todos os domínios do Vercel (para preview deployments)
# Formato: https://*.vercel.app
import re
def cors_allow_vercel(origin: str) -> bool:
    """Permite qualquer subdomínio do Vercel"""
    if origin in allowed_origins:
        return True
    # Aceita qualquer URL que termine com .vercel.app
    if re.match(r'^https://.*\.vercel\.app$', origin):
        return True
    return False

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r'^https://.*\.vercel\.app$',  # Aceita todos os deployments do Vercel
    allow_origins=allowed_origins,  # Também aceita localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas do agente
app.include_router(agent_router, prefix="/api/agent", tags=["agent"])

# =========================
# Modelos
# =========================
class Coordinate(BaseModel):
    lat: float
    lng: float

class LayerRequest(BaseModel):
    polygon: List[Coordinate]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    layer_type: str = Field(
        default="SENTINEL2_RGB",
        pattern="^(SENTINEL2_RGB|LANDSAT_RGB|SENTINEL1_VV|NDVI|NDWI|LST|UHI|UTFVI)$"
    )
    cloud_percentage: int = Field(default=20, ge=0, le=100)
    specific_date: Optional[str] = None  # Para carregar uma imagem de data específica

class LayerResult(BaseModel):
    date: str
    layer_type: str
    tile_url: str

class ImageListItem(BaseModel):
    date: str
    cloud_cover: float
    satellite: str

class ImageListResponse(BaseModel):
    images: List[ImageListItem]
    total_found: int

class AnalysisDataRequest(BaseModel):
    polygon: List[Coordinate]
    start_date: str
    end_date: str

class AnalysisDataResponse(BaseModel):
    stats: Dict[str, Optional[float]]
    period: Dict[str, str]
    satellite_source: str

class DEMRequest(BaseModel):
    polygon: List[Coordinate]

class DEMResult(BaseModel):
    tileUrl: str
    min_elevation: Optional[float] = None
    max_elevation: Optional[float] = None

class GeoJSONListResponse(BaseModel):
    files: List[str]

class GeoJSONLoadResponse(BaseModel):
    name: str
    type: str
    features_count: int
    bbox: Optional[List[float]] = None
    polygon: Optional[List[Coordinate]] = None
    raw: Dict[str, Any]

class GeoJSONLayerRequest(BaseModel):
    filename: str  # Nome do arquivo GeoJSON
    polygon: Optional[List[Coordinate]] = None  # Polígono para recorte (opcional)

# =========================
# Utils
# =========================
def coords_to_ee_geometry(coords: List[Coordinate]) -> ee.Geometry:
    """Converte lista de coordenadas lat/lng para ee.Geometry.Polygon"""
    if len(coords) < 3:
        raise ValueError("Polígono inválido: necessário ao menos 3 pontos")
    ring = [[c.lng, c.lat] for c in coords]
    if ring[0] != ring[-1]:
        ring.append(ring[0])  # fechar polígono
    return ee.Geometry.Polygon([ring])

def ensure_safe_path(base: Path, name: str) -> Path:
    """Garante que o arquivo solicitado está dentro de base e evita path traversal."""
    target = (base / name).resolve()
    if not str(target).startswith(str(base)):
        raise HTTPException(status_code=400, detail="Caminho inválido.")
    return target

def extract_polygon_latlng_from_geojson(gj: Dict[str, Any]) -> Optional[List[Coordinate]]:
    """Extrai a casca externa do primeiro polígono como lista de lat/lng para uso no frontend."""
    def lnglat_to_coords(ring: List[List[float]]) -> List[Coordinate]:
        cleaned = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
        return [Coordinate(lat=p[1], lng=p[0]) for p in cleaned]

    t = gj.get("type")
    if t == "FeatureCollection":
        feats = gj.get("features", [])
        if not feats:
            return None
        geom = feats[0].get("geometry", {})
        t = geom.get("type")
        coords = geom.get("coordinates")
    elif t == "Feature":
        geom = gj.get("geometry", {})
        t = geom.get("type")
        coords = geom.get("coordinates")
    else:
        coords = gj.get("coordinates")

    if t == "Polygon" and isinstance(coords, list) and coords:
        return lnglat_to_coords(coords[0])
    if t == "MultiPolygon" and isinstance(coords, list) and coords and coords[0]:
        return lnglat_to_coords(coords[0][0])
    return None

def geojson_to_ee_geometry(gj: Dict[str, Any]) -> ee.Geometry:
    """Converte GeoJSON em ee.Geometry suportando FeatureCollection/Feature/Polygon/MultiPolygon/Point/LineString."""
    t = gj.get("type")
    if t == "FeatureCollection":
        feats = gj.get("features", [])
        if not feats:
            raise ValueError("FeatureCollection vazia")
        geom = feats[0].get("geometry", {})
        t = geom.get("type")
        coords = geom.get("coordinates")
    elif t == "Feature":
        geom = gj.get("geometry", {})
        t = geom.get("type")
        coords = geom.get("coordinates")
    else:
        coords = gj.get("coordinates")

    if t == "Polygon":
        return ee.Geometry.Polygon(coords)
    if t == "MultiPolygon":
        return ee.Geometry.MultiPolygon(coords)
    if t == "Point":
        return ee.Geometry.Point(coords)
    if t == "MultiPoint":
        return ee.Geometry.MultiPoint(coords)
    if t == "LineString":
        return ee.Geometry.LineString(coords)
    if t == "MultiLineString":
        return ee.Geometry.MultiLineString(coords)
    raise ValueError(f"Tipo de geometria não suportado: {t}")

# =========================
# Endpoints
# =========================
@app.get("/")
def read_root():
    """Endpoint raiz com informações sobre a API."""
    return {
        "service": "Sentinel-IA API",
        "version": app.version,
        "description": "API para imagens de satélite (GEE), DEM, GeoJSON e análise com Agente de IA.",
        "gee_project": GEE_PROJECT_ID,
        "status": "running",
        "paths": {
            "get_tile": "/api/get_tile",
            "get_analysis_data": "/api/get_analysis_data",
            "dem": "/api/get_dem",
            "geojson_list": "/api/geojson/list",
            "geojson_load": "/api/geojson/load?name=arquivo.geojson",
            "agent_health": "/api/agent/health",
            "docs": "/docs"
        }
    }


@app.post("/api/list_images", response_model=ImageListResponse)
async def list_images(request: LayerRequest):
    """
    Lista todas as imagens disponíveis para uma camada específica.
    Retorna até 50 imagens ordenadas da mais recente para a mais antiga.
    """
    try:
        geometry = coords_to_ee_geometry(request.polygon)
        
        # Define datas
        from datetime import datetime, timedelta
        if not request.end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        else:
            end_date = request.end_date
            
        if not request.start_date:
            start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        else:
            start_date = request.start_date
        
        print(f"🔍 Listando imagens para layer_type={request.layer_type}, start={start_date}, end={end_date}")
        
        collection = None
        
        # Determina qual coleção usar baseado no tipo de camada
        if request.layer_type in ["SENTINEL2_RGB", "NDVI", "NDWI"]:
            collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(geometry)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", request.cloud_percentage))
                .sort("system:time_start", False)
            )
            satellite_name = "Sentinel-2"
            cloud_property = "CLOUDY_PIXEL_PERCENTAGE"
            
        elif request.layer_type in ["LANDSAT_RGB", "LST", "UHI", "UTFVI"]:
            # Para camadas térmicas, limitar a 2024
            user_end_date = datetime.strptime(end_date, "%Y-%m-%d")
            max_date = datetime.strptime("2024-12-31", "%Y-%m-%d")
            effective_end_date = min(user_end_date, max_date)
            
            user_start_date = datetime.strptime(start_date, "%Y-%m-%d")
            effective_start_date = min(user_start_date, max_date)
            
            search_start = effective_start_date.strftime("%Y-%m-%d")
            search_end = effective_end_date.strftime("%Y-%m-%d")
            
            landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").filterBounds(geometry).filterDate(search_start, search_end).filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
            landsat9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2").filterBounds(geometry).filterDate(search_start, search_end).filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
            
            collection = landsat8.merge(landsat9).sort("system:time_start", False)
            satellite_name = "Landsat 8/9"
            cloud_property = "CLOUD_COVER"
            
        elif request.layer_type == "SENTINEL1_VV":
            collection = (
                ee.ImageCollection('COPERNICUS/S1_GRD')
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                .filter(ee.Filter.eq('instrumentMode', 'IW'))
                .filterBounds(geometry)
                .filterDate(start_date, end_date)
                .sort("system:time_start", False)
            )
            satellite_name = "Sentinel-1"
            cloud_property = None
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de camada '{request.layer_type}' não suportado para listagem.")
        
        # Limita a 50 imagens
        limited_collection = collection.limit(50)
        
        # Obter informações das imagens
        images_info = limited_collection.getInfo()
        
        if not images_info or 'features' not in images_info or len(images_info['features']) == 0:
            return ImageListResponse(images=[], total_found=0)
        
        # Processar a lista
        image_list = []
        for feature in images_info['features']:
            props = feature.get('properties', {})
            
            # Extrair data
            timestamp = props.get('system:time_start')
            if timestamp:
                date_obj = datetime.fromtimestamp(timestamp / 1000)
                date_str = date_obj.strftime("%Y-%m-%d")
            else:
                date_str = "Data desconhecida"
            
            # Extrair cobertura de nuvens
            if cloud_property and cloud_property in props:
                cloud_cover = float(props[cloud_property])
            else:
                cloud_cover = 0.0
            
            # Determinar satélite específico
            if request.layer_type in ["LANDSAT_RGB", "LST", "UHI", "UTFVI"]:
                spacecraft = props.get('SPACECRAFT_ID', satellite_name)
                if 'LANDSAT_8' in spacecraft:
                    sat_name = "Landsat 8"
                elif 'LANDSAT_9' in spacecraft:
                    sat_name = "Landsat 9"
                else:
                    sat_name = satellite_name
            else:
                sat_name = satellite_name
            
            image_list.append(ImageListItem(
                date=date_str,
                cloud_cover=round(cloud_cover, 2),
                satellite=sat_name
            ))
        
        total_found = collection.size().getInfo()
        
        print(f"✅ Encontradas {len(image_list)} imagens (total no período: {total_found})")
        
        return ImageListResponse(images=image_list, total_found=total_found)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Erro ao listar imagens para {request.layer_type}:")
        print(error_trace)
        raise HTTPException(status_code=500, detail=f"Erro ao listar imagens: {e}")


@app.post("/api/get_tile", response_model=LayerResult)
async def get_tile(request: LayerRequest):
    """
    Gera um tile de mapa para uma camada específica (ex: NDVI, LST)
    recortado pela geometria do polígono.
    """
    try:
        geometry = coords_to_ee_geometry(request.polygon)
        
        # Define datas padrão se não fornecidas
        from datetime import datetime, timedelta
        if not request.end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        else:
            end_date = request.end_date
            
        if not request.start_date:
            start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        else:
            start_date = request.start_date
        
        # Se uma data específica foi fornecida, busca apenas essa data
        if request.specific_date:
            target_date = datetime.strptime(request.specific_date, "%Y-%m-%d")
            start_date = target_date.strftime("%Y-%m-%d")
            end_date = (target_date + timedelta(days=1)).strftime("%Y-%m-%d")
            print(f"🔍 Processando layer_type={request.layer_type} para data específica={request.specific_date}")
        else:
            print(f"🔍 Processando layer_type={request.layer_type}, start={start_date}, end={end_date}")
        
        image = None
        vis_params = {}
        date_str = end_date
        
        # Coleção base (Sentinel-2 para a maioria dos produtos derivados)
        s2_collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", request.cloud_percentage))
            .sort("system:time_start", False)
        )

        if request.layer_type == "SENTINEL2_RGB":
            s2_image = s2_collection.first()
            if s2_image is None:
                raise HTTPException(status_code=404, detail="Nenhuma imagem Sentinel-2 encontrada para o período.")
            image = s2_image.clip(geometry)
            vis_params = {"bands": ["B4", "B3", "B2"], "min": 0, "max": 3000}
        
        elif request.layer_type == "LANDSAT_RGB":
            collection = (
                ee.ImageCollection("LANDSAT/LC09/C02/T1_L2") # Landsat 9
                .filterBounds(geometry)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
                .sort("system:time_start", False)
            )
            landsat_image = collection.first()
            if not landsat_image.getInfo():
                raise HTTPException(status_code=404, detail="Nenhuma imagem Landsat encontrada para o período.")
            
            # Aplica scaling factors para Landsat C2 L2 e preserva propriedades ANTES de clip
            scaled = landsat_image.select(['SR_B4', 'SR_B3', 'SR_B2']).multiply(0.0000275).add(-0.2)
            scaled = ee.Image(scaled.copyProperties(landsat_image, ['system:time_start']))
            image = scaled.clip(geometry)
            vis_params = {"bands": ["SR_B4", "SR_B3", "SR_B2"], "min": 0.0, "max": 0.3}

        elif request.layer_type == "SENTINEL1_VV":
            collection = (
                ee.ImageCollection('COPERNICUS/S1_GRD')
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                .filter(ee.Filter.eq('instrumentMode', 'IW'))
                .filterBounds(geometry)
                .filterDate(start_date, end_date)
                .sort("system:time_start", False)
            )
            s1_image = collection.first()
            if s1_image is None:
                raise HTTPException(status_code=404, detail="Nenhuma imagem Sentinel-1 encontrada para o período.")
            image = s1_image.clip(geometry)
            vis_params = {'bands': ['VV'], 'min': -25, 'max': 0}

        elif request.layer_type == "NDVI":
            s2_image = s2_collection.first()
            if s2_image is None:
                raise HTTPException(status_code=404, detail="Imagens Sentinel-2 necessárias para NDVI não encontradas.")
            # Melhorar NDVI com escala correta
            B8 = s2_image.select('B8').multiply(0.0001)
            B4 = s2_image.select('B4').multiply(0.0001)
            ndvi = B8.subtract(B4).divide(B8.add(B4))
            image = ndvi.clip(geometry)
            # Preservar a data da imagem original - converter de volta para ee.Image
            image = ee.Image(image.copyProperties(s2_image, ['system:time_start']))
            vis_params = {
                'min': 0.0, 'max': 0.8,
                'palette': ['white', 'lightgreen', 'green', 'darkgreen']
            }

        elif request.layer_type == "NDWI":
            s2_image = s2_collection.first()
            if s2_image is None:
                raise HTTPException(status_code=404, detail="Imagens Sentinel-2 necessárias para NDWI não encontradas.")
            # Calcular NDWI
            ndwi = s2_image.normalizedDifference(['B3', 'B8'])
            image = ndwi.clip(geometry)
            # Preservar a data da imagem original - converter de volta para ee.Image
            image = ee.Image(image.copyProperties(s2_image, ['system:time_start']))
            vis_params = {
                'min': -1, 'max': 1,
                'palette': ['#b71c1c', '#ffff00', '#00ffff', '#0d47a1'] # Vermelho -> Amarelo -> Ciano -> Azul
            }
        
        elif request.layer_type == "LST":
            # Lógica aprimorada baseada no script GEE, com restrição de data
            
            # Garante que a data final não passe de 2024-12-31
            user_end_date = datetime.strptime(end_date, "%Y-%m-%d")
            max_date = datetime.strptime("2024-12-31", "%Y-%m-%d")
            effective_end_date = min(user_end_date, max_date)
            
            # Usa o período completo fornecido pelo usuário (limitado a 2024)
            user_start_date = datetime.strptime(start_date, "%Y-%m-%d")
            effective_start_date = min(user_start_date, max_date)
            
            search_start_date = effective_start_date.strftime("%Y-%m-%d")
            search_end_date = effective_end_date.strftime("%Y-%m-%d")
            
            print(f"LST: Buscando entre {search_start_date} e {search_end_date}")

            landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").filterBounds(geometry).filterDate(search_start_date, search_end_date).filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
            landsat9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2").filterBounds(geometry).filterDate(search_start_date, search_end_date).filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
            
            collection = landsat8.merge(landsat9).sort("CLOUD_COVER")
            
            # Se data específica, pega apenas uma imagem. Senão, faz mosaico das 3 melhores
            if request.specific_date:
                landsat_image = collection.first()
                if not landsat_image.getInfo():
                    raise HTTPException(status_code=404, detail="Imagem Landsat (até 2024) para LST não encontrada na data específica.")
            else:
                # Mosaico das 3 melhores imagens para evitar falhas
                top_images = collection.limit(3)
                if top_images.size().getInfo() == 0:
                    raise HTTPException(status_code=404, detail="Imagens Landsat (até 2024) necessárias para LST não encontradas.")
                landsat_image = top_images.median()  # Usa mediana para composição
            
            # Aplicar fator de escala térmico
            thermal_band = landsat_image.select('ST_B10').multiply(0.00341802).add(149.0)
            # Converter Kelvin para Celsius
            lst_celsius = thermal_band.subtract(273.15)
            
            image = lst_celsius.clip(geometry)
            vis_params = {
                'min': 20, 'max': 45,
                'palette': ['blue', 'cyan', 'green', 'yellow', 'orange', 'red', 'darkred']
            }

        elif request.layer_type == "UHI":
            # Lógica aprimorada com restrição de data
            user_end_date = datetime.strptime(end_date, "%Y-%m-%d")
            max_date = datetime.strptime("2024-12-31", "%Y-%m-%d")
            effective_end_date = min(user_end_date, max_date)
            
            # Usa o período completo fornecido pelo usuário (limitado a 2024)
            user_start_date = datetime.strptime(start_date, "%Y-%m-%d")
            effective_start_date = min(user_start_date, max_date)
            
            search_start_date = effective_start_date.strftime("%Y-%m-%d")
            search_end_date = effective_end_date.strftime("%Y-%m-%d")
            
            print(f"UHI: Buscando entre {search_start_date} e {search_end_date}")

            landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").filterBounds(geometry).filterDate(search_start_date, search_end_date).filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
            landsat9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2").filterBounds(geometry).filterDate(search_start_date, search_end_date).filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
            
            collection = landsat8.merge(landsat9).sort("CLOUD_COVER")
            
            # Mosaico das 3 melhores imagens
            if request.specific_date:
                landsat_image = collection.first()
                if not landsat_image.getInfo():
                    raise HTTPException(status_code=404, detail="Imagem Landsat (até 2024) para UHI não encontrada na data específica.")
            else:
                top_images = collection.limit(3)
                if top_images.size().getInfo() == 0:
                    raise HTTPException(status_code=404, detail="Imagens Landsat (até 2024) necessárias para UHI não encontradas.")
                landsat_image = top_images.median()
            
            # LST em Celsius
            thermal_band = landsat_image.select('ST_B10').multiply(0.00341802).add(149.0)
            lst_celsius = thermal_band.subtract(273.15)
            
            # Calcular estatísticas da área
            lst_clipped = lst_celsius.clip(geometry)
            lst_stats = lst_clipped.reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), None, True),
                geometry=geometry,
                scale=30,
                maxPixels=1e9
            )
            
            lst_mean = ee.Number(lst_stats.get('ST_B10_mean'))
            lst_std = ee.Number(lst_stats.get('ST_B10_stdDev'))
            
            # UHI = (LST - LST_mean) / LST_stdDev
            uhi = lst_clipped.subtract(lst_mean).divide(lst_std)
            image = uhi
            vis_params = {
                'min': -3, 'max': 3,
                'palette': ['313695', '74add1', 'fed976', 'feb24c', 'fd8d3c', 'fc4e2a', 'e31a1c', 'b10026']
            }

        elif request.layer_type == "UTFVI":
            # Lógica aprimorada com restrição de data
            user_end_date = datetime.strptime(end_date, "%Y-%m-%d")
            max_date = datetime.strptime("2024-12-31", "%Y-%m-%d")
            effective_end_date = min(user_end_date, max_date)
            
            # Usa o período completo fornecido pelo usuário (limitado a 2024)
            user_start_date = datetime.strptime(start_date, "%Y-%m-%d")
            effective_start_date = min(user_start_date, max_date)
            
            search_start_date = effective_start_date.strftime("%Y-%m-%d")
            search_end_date = effective_end_date.strftime("%Y-%m-%d")

            print(f"UTFVI: Buscando entre {search_start_date} e {search_end_date}")
            
            landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").filterBounds(geometry).filterDate(search_start_date, search_end_date).filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
            landsat9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2").filterBounds(geometry).filterDate(search_start_date, search_end_date).filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
            
            collection = landsat8.merge(landsat9).sort("CLOUD_COVER")
            
            # Mosaico das 3 melhores imagens
            if request.specific_date:
                landsat_image = collection.first()
                if not landsat_image.getInfo():
                    raise HTTPException(status_code=404, detail="Imagem Landsat (até 2024) para UTFVI não encontrada na data específica.")
            else:
                top_images = collection.limit(3)
                if top_images.size().getInfo() == 0:
                    raise HTTPException(status_code=404, detail="Imagens Landsat (até 2024) necessárias para UTFVI não encontradas.")
                landsat_image = top_images.median()
            
            # LST em Celsius
            thermal_band = landsat_image.select('ST_B10').multiply(0.00341802).add(149.0)
            lst_celsius = thermal_band.subtract(273.15)
            
            # Calcular média
            lst_clipped = lst_celsius.clip(geometry)
            lst_stats = lst_clipped.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geometry,
                scale=30,
                maxPixels=1e9
            )
            
            lst_mean = ee.Number(lst_stats.get('ST_B10'))
            
            # UTFVI = (LST - LST_mean) / LST
            utfvi = lst_clipped.subtract(lst_mean).divide(lst_clipped)
            image = utfvi
            vis_params = {
                'min': -0.1, 'max': 0.1,
                'palette': ['313695', '74add1', 'fed976', 'feb24c', 'fd8d3c', 'fc4e2a', 'e31a1c', 'b10026']
            }
        
        if image is None:
            raise HTTPException(status_code=404, detail=f"Nenhuma imagem encontrada para a camada '{request.layer_type}' no período/região.")

        # A data é extraída da imagem efetivamente usada
        try:
            img_date = image.get("system:time_start")
            date_str = ee.Date(img_date).format("YYYY-MM-dd").getInfo() if img_date else end_date
        except Exception as e:
            print(f"⚠️ Aviso: não foi possível extrair data da imagem: {e}")
            date_str = end_date

        map_id = image.visualize(**vis_params).getMapId()
        tile_url = map_id["tile_fetcher"].url_format
        
        print(f"✅ Sucesso: {request.layer_type} gerado com data {date_str}")

        return LayerResult(date=date_str, layer_type=request.layer_type, tile_url=tile_url)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Erro ao buscar camada {request.layer_type}:")
        print(error_trace)
        # Tenta extrair uma mensagem mais clara do GEE
        if "Collection query aborted" in str(e) or "found no images" in str(e):
            detail = f"Nenhuma imagem encontrada para os filtros aplicados ({request.layer_type}). Tente um período maior ou uma área diferente."
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=500, detail=f"Erro ao buscar camada: {e}")


@app.post("/api/get_analysis_data", response_model=AnalysisDataResponse)
async def get_analysis_data(request: AnalysisDataRequest):
    """
    Extrai dados numéricos (NDVI, NDWI, LST) para a IA.
    """
    try:
        geometry = coords_to_ee_geometry(request.polygon)
        
        # Usar Sentinel-2 como base para índices
        s2_image = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(geometry)
            .filterDate(request.start_date, request.end_date)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
            .median() # Usar mediana para compor uma imagem mais limpa
            .clip(geometry)
        )
        
        # Usar Landsat 8 para LST
        lst_image = (
            ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
            .filterBounds(geometry)
            .filterDate(request.start_date, request.end_date)
            .filter(ee.Filter.lt("CLOUD_COVER", 20))
            .median()
            .clip(geometry)
        )

        # Calcular Índices
        ndvi = s2_image.normalizedDifference(['B8', 'B4']).rename('ndvi')
        ndwi = s2_image.normalizedDifference(['B3', 'B8']).rename('ndwi')
        
        # Calcular LST em Celsius
        thermal_band = lst_image.select('ST_B10').multiply(0.00341802).add(149.0)
        lst = thermal_band.subtract(273.15).rename('lst')

        # Combinar bandas para análise
        analysis_image = s2_image.addBands(ndvi).addBands(ndwi).addBands(lst)
        
        # Reduzir para obter estatísticas (média)
        stats = analysis_image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        ).getInfo()

        return AnalysisDataResponse(
            stats={
                "ndvi_mean": stats.get('ndvi'),
                "ndwi_mean": stats.get('ndwi'),
                "lst_mean_celsius": stats.get('lst'),
            },
            period={"start": request.start_date, "end": request.end_date},
            satellite_source="Sentinel-2 (Índices) e Landsat-8 (LST)"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao extrair dados para análise: {e}")


@app.post("/api/get_dem", response_model=DEMResult)
async def get_dem(request: DEMRequest):
    """Gera um tile de mapa para o Modelo Digital de Elevação (DEM)."""
    try:
        geometry = coords_to_ee_geometry(request.polygon)
        
        # Obter a imagem DEM (SRTM)
        dem = ee.Image("USGS/SRTMGL1_003").clip(geometry)
        stats = dem.reduceRegion(
            reducer=ee.Reducer.minMax(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9,
        ).getInfo()

        min_elev = stats.get("elevation_min")
        max_elev = stats.get("elevation_max")

        vis_params = {
            "min": min_elev if min_elev is not None else 0,
            "max": max_elev if max_elev is not None else 3000,
            "palette": ["blue", "green", "yellow", "red"],
        }

        map_id = dem.visualize(**vis_params).getMapId()
        tile_url = map_id["tile_fetcher"].url_format

        return DEMResult(tileUrl=tile_url, min_elevation=min_elev, max_elevation=max_elev)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter DEM: {e}")

# =========================
# GeoJSON (pasta data)
# =========================
@app.get("/api/geojson/list", response_model=GeoJSONListResponse)
async def list_geojson_files():
    if not DATA_DIR.exists():
        return GeoJSONListResponse(files=[])
    files = sorted([p.name for p in DATA_DIR.glob("*.geojson")])
    return GeoJSONListResponse(files=files)

@app.get("/api/geojson/load", response_model=GeoJSONLoadResponse)
async def load_geojson_file(name: str = Query(..., description="Nome do arquivo .geojson na pasta data")):
    try:
        if not name.lower().endswith(".geojson"):
            raise HTTPException(status_code=400, detail="Informe um arquivo .geojson")

        if not DATA_DIR.exists():
            raise HTTPException(status_code=404, detail="Pasta data não encontrada em backend/data")

        path = ensure_safe_path(DATA_DIR, os.path.basename(name))
        if not path.exists():
            raise HTTPException(status_code=404, detail="Arquivo não encontrado")

        with path.open("r", encoding="utf-8") as f:
            gj_obj = geojson.load(f)

        # Converter para dict puro para garantir serialização
        gj_dict: Dict[str, Any] = json.loads(geojson.dumps(gj_obj))

        polygon_coords = extract_polygon_latlng_from_geojson(gj_dict)
        bbox = gj_dict.get("bbox")

        if gj_dict.get("type") == "FeatureCollection":
            feats_count = len(gj_dict.get("features", []))
            gj_type = "FeatureCollection"
        elif gj_dict.get("type") == "Feature":
            feats_count = 1
            gj_type = "Feature"
        else:
            feats_count = 0
            gj_type = gj_dict.get("type", "Geometry")

        return GeoJSONLoadResponse(
            name=path.name,
            type=gj_type,
            features_count=feats_count,
            bbox=bbox,
            polygon=polygon_coords,
            raw=gj_dict,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao carregar GeoJSON: {e}")


@app.post("/api/geojson/render_layer")
async def render_geojson_layer(request: GeoJSONLayerRequest):
    """
    Render a GeoJSON layer, optionally filtered by a polygon.
    """
    print(f"🔍 render_geojson_layer chamado com filename={request.filename}")
    print(f"📍 Polygon: {len(request.polygon) if request.polygon else 0} pontos")
    
    try:
        # Load the GeoJSON file
        if not request.filename.lower().endswith(".geojson") and not request.filename.lower().endswith(".json"):
            print(f"❌ Arquivo inválido: {request.filename}")
            raise HTTPException(status_code=400, detail="Informe um arquivo .geojson ou .json")
        
        if not DATA_DIR.exists():
            print(f"❌ Pasta data não encontrada: {DATA_DIR}")
            raise HTTPException(status_code=404, detail="Pasta data não encontrada em backend/data")
        
        geojson_path = ensure_safe_path(DATA_DIR, os.path.basename(request.filename))
        if not geojson_path.exists():
            print(f"❌ Arquivo não encontrado: {geojson_path}")
            raise HTTPException(status_code=404, detail=f"GeoJSON file '{request.filename}' not found")
        
        print(f"📂 Carregando arquivo: {geojson_path}")
        with geojson_path.open('r', encoding='utf-8') as f:
            geojson_data = geojson.load(f)
        
        total_features = len(geojson_data.get('features', []))
        print(f"📊 Total de features no arquivo: {total_features}")
        
        # If polygon is provided, filter features using bounding box (faster)
        if request.polygon:
            # Get bounding box of the polygon
            lats = [p.lat for p in request.polygon]
            lngs = [p.lng for p in request.polygon]
            min_lat, max_lat = min(lats), max(lats)
            min_lng, max_lng = min(lngs), max(lngs)
            
            print(f"🗺️ Bounding box: lat=[{min_lat}, {max_lat}], lng=[{min_lng}, {max_lng}]")
            
            # Filter features by bounding box overlap
            filtered_features = []
            for feature in geojson_data.get('features', []):
                try:
                    geom = feature.get('geometry', {})
                    coords = geom.get('coordinates', [])
                    
                    # Extract all coordinate pairs
                    def extract_coords(obj):
                        if isinstance(obj, list):
                            if len(obj) == 2 and isinstance(obj[0], (int, float)):
                                return [obj]
                            else:
                                result = []
                                for item in obj:
                                    result.extend(extract_coords(item))
                                return result
                        return []
                    
                    all_coords = extract_coords(coords)
                    
                    # Check if any coordinate is within bounding box
                    for coord in all_coords:
                        lng, lat = coord[0], coord[1]
                        if min_lng <= lng <= max_lng and min_lat <= lat <= max_lat:
                            filtered_features.append(feature)
                            break
                            
                except Exception as ex:
                    # Skip features that can't be processed
                    print(f"⚠️ Erro ao processar feature: {ex}")
                    continue
            
            print(f"✅ Features filtradas: {len(filtered_features)}")
            
            # Create filtered GeoJSON
            filtered_geojson = {
                "type": "FeatureCollection",
                "features": filtered_features
            }
            
            return filtered_geojson
        
        # Return full GeoJSON if no polygon filter
        print(f"✅ Retornando {total_features} features (sem filtro)")
        # Convert to dict for proper serialization
        gj_dict: Dict[str, Any] = json.loads(geojson.dumps(geojson_data))
        return gj_dict
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao renderizar camada GeoJSON: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao renderizar camada GeoJSON: {e}")


# =========================
# Health
# =========================
@app.get("/health")
async def health_check():
    gee_status = "ok"
    try:
        ee.Number(1).getInfo()
    except Exception:
        gee_status = "error"
    return {
        "status": "ok" if gee_status == "ok" else "degraded",
        "services": {"gee": gee_status},
        "timestamp": datetime.now().isoformat(),
    }