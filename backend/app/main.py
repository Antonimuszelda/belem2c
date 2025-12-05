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
from shapely.geometry import shape, Polygon, MultiPolygon

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
    "https://harp-ia-demo-wwbv.vercel.app",  # URL de produção do Vercel
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
        pattern="^(SENTINEL2_RGB|SENTINEL2_FALSE_COLOR|LANDSAT_RGB|SENTINEL1_VV|NDVI|NDWI|LST|UHI|UTFVI|DEM)$"
    )
    cloud_percentage: int = Field(default=5, ge=0, le=100)
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

class AnalyzeAreaRequest(BaseModel):
    polygon: List[List[float]]  # [[lng, lat], ...]
    area_km2: float

class AnalyzeAreaResponse(BaseModel):
    # Temperaturas
    avg_annual_temperature: float  # Temperatura média anual
    extreme_heat_days: int  # Dias com calor extremo (>35°C)
    heat_island_risk: str  # LOW, MEDIUM, HIGH, CRITICAL - Risco de ilha de calor
    
    # Vegetação e ambiente
    vegetation_density: float  # NDVI em %
    vegetation_loss_risk: str  # Risco de perda de vegetação
    
    # Riscos ambientais
    environmental_risk: str  # LOW, MEDIUM, HIGH, CRITICAL - Risco ambiental geral
    flood_risk: str  # Risco de inundação
    drought_risk: str  # Risco de seca
    
    # Social
    favela_count: int = 0  # Número de aglomerados subnormais na área
    favela_population: int = 0  # População estimada em aglomerados
    social_vulnerability: str = "LOW"  # Vulnerabilidade social
    
    # Análise IA
    ai_summary: str
    recommendations: List[str]

# =========================
# Utils
# =========================
def count_favelas_in_polygon(polygon_coords: List[List[float]]) -> Dict[str, Any]:
    """
    Conta quantas áreas de favela (aglomerados subnormais) estão dentro do polígono fornecido.
    Retorna contagem e população estimada.
    """
    try:
        # Criar polígono Shapely a partir das coordenadas [[lng, lat], ...]
        if polygon_coords[0] != polygon_coords[-1]:
            polygon_coords = polygon_coords + [polygon_coords[0]]
        
        analysis_polygon = Polygon(polygon_coords)
        
        # Carregar arquivo FCUs_BR.json (favelas do Brasil)
        fcus_path = DATA_DIR / "FCUs_BR.json"
        if not fcus_path.exists():
            return {"count": 0, "population": 0, "areas": []}
        
        with fcus_path.open("r", encoding="utf-8") as f:
            fcus_data = json.load(f)
        
        count = 0
        population = 0
        areas = []
        
        for feature in fcus_data.get("features", []):
            try:
                geom = shape(feature.get("geometry", {}))
                props = feature.get("properties", {})
                
                # Verificar se a geometria intersecta com a área de análise
                if analysis_polygon.intersects(geom):
                    count += 1
                    # Tentar extrair população das propriedades
                    pop = props.get("pop", props.get("population", props.get("POP", 0)))
                    if pop and isinstance(pop, (int, float)):
                        population += int(pop)
                    areas.append({
                        "name": props.get("nome", props.get("NOME", f"Área {count}"))
                    })
            except Exception:
                continue
        
        return {"count": count, "population": population, "areas": areas}
    except Exception as e:
        print(f"Erro ao contar favelas: {e}")
        return {"count": 0, "population": 0, "areas": []}

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
        if request.layer_type in ["SENTINEL2_RGB", "SENTINEL2_FALSE_COLOR", "NDVI", "NDWI"]:
            collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(geometry)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", request.cloud_percentage))
                .sort("CLOUDY_PIXEL_PERCENTAGE", True)  # Menor cobertura de nuvem primeiro
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
            
            collection = landsat8.merge(landsat9).sort("CLOUD_COVER", True)  # Menor cobertura de nuvem primeiro
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
        elif request.layer_type == "DEM":
            # DEM é estático (SRTM), retorna apenas uma "imagem" fixa
            return ImageListResponse(
                images=[
                    ImageListItem(
                        date="2000-02-11",  # Data da missão SRTM
                        cloud_cover=0.0,
                        satellite="SRTM (Shuttle Radar Topography Mission)"
                    )
                ],
                total_found=1
            )
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
        # Ordenar por CLOUDY_PIXEL_PERCENTAGE (menor primeiro) para sempre pegar imagem com menos nuvem
        s2_collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", request.cloud_percentage))
            .sort("CLOUDY_PIXEL_PERCENTAGE", True)  # True = ascendente (menor nuvem primeiro)
        )

        if request.layer_type == "SENTINEL2_RGB":
            s2_image = s2_collection.first()
            if s2_image is None:
                raise HTTPException(status_code=404, detail="Nenhuma imagem Sentinel-2 encontrada para o período.")
            image = s2_image.clip(geometry)
            vis_params = {"bands": ["B4", "B3", "B2"], "min": 0, "max": 3000}
        
        elif request.layer_type == "SENTINEL2_FALSE_COLOR":
            s2_image = s2_collection.first()
            if s2_image is None:
                raise HTTPException(status_code=404, detail="Nenhuma imagem Sentinel-2 encontrada para o período.")
            image = s2_image.clip(geometry)
            # False Color: NIR, Red, Green (B8, B4, B3) - destaca vegetação
            vis_params = {"bands": ["B8", "B4", "B3"], "min": 0, "max": 3000}
        
        elif request.layer_type == "LANDSAT_RGB":
            collection = (
                ee.ImageCollection("LANDSAT/LC09/C02/T1_L2") # Landsat 9
                .filterBounds(geometry)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
                .sort("CLOUD_COVER", True)  # Menor cobertura de nuvem primeiro
            )
            landsat_image = collection.first()
            # Validação acontece no getMapId - mais eficiente
            
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
            # LST (Land Surface Temperature) usando banda térmica do Landsat 8/9
            # Implementação melhorada com máscara de qualidade QA_PIXEL e QA_RADSAT
            
            # Função para aplicar máscara de nuvens e saturação
            def mask_landsat_qa(image):
                # QA_PIXEL bits:
                # Bit 0 - Fill, Bit 1 - Dilated Cloud, Bit 2 - Cirrus
                # Bit 3 - Cloud, Bit 4 - Cloud Shadow
                qa_mask = image.select('QA_PIXEL').bitwiseAnd(int('11111', 2)).eq(0)
                saturation_mask = image.select('QA_RADSAT').eq(0)
                
                # Aplicar scaling factors
                optical_bands = image.select('SR_B.').multiply(0.0000275).add(-0.2)
                thermal_bands = image.select('ST_B.*').multiply(0.00341802).add(149.0)
                
                # Substituir bandas com valores escalados e aplicar máscaras
                return (image.addBands(optical_bands, None, True)
                       .addBands(thermal_bands, None, True)
                       .updateMask(qa_mask)
                       .updateMask(saturation_mask))
            
            # Função para converter Kelvin para Celsius
            def kelvin_to_celsius(image):
                temp = image.select('ST_B10').subtract(273.15).rename('temp')
                return (image.addBands(temp)
                       .set('date', image.date().format('YYYY-MM-dd'))
                       .copyProperties(image, image.propertyNames()))
            
            # Limitar busca até 2024
            user_end = datetime.strptime(end_date, "%Y-%m-%d")
            max_thermal_date = datetime(2024, 12, 31)
            effective_end = min(user_end, max_thermal_date).strftime("%Y-%m-%d")
            
            # Merge Landsat 8 e 9 com filtro de nuvens baixo
            landsat8 = (ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
                       .filterBounds(geometry)
                       .filterDate(start_date, effective_end)
                       .filter(ee.Filter.lt("CLOUD_COVER", 10))
                       .map(mask_landsat_qa)
                       .map(kelvin_to_celsius))
            
            landsat9 = (ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
                       .filterBounds(geometry)
                       .filterDate(start_date, effective_end)
                       .filter(ee.Filter.lt("CLOUD_COVER", 10))
                       .map(mask_landsat_qa)
                       .map(kelvin_to_celsius))
            
            lst_collection = landsat8.merge(landsat9).sort("CLOUD_COVER", True)
            
            # Se não encontrar, relaxar filtro (server-side check)
            collection_size = lst_collection.size()
            if collection_size.getInfo() == 0:
                expanded_start = (max_thermal_date - timedelta(days=730)).strftime("%Y-%m-%d")
                landsat8 = (ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
                           .filterBounds(geometry)
                           .filterDate(expanded_start, effective_end)
                           .filter(ee.Filter.lt("CLOUD_COVER", 30))
                           .map(mask_landsat_qa)
                           .map(kelvin_to_celsius))
                
                landsat9 = (ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
                           .filterBounds(geometry)
                           .filterDate(expanded_start, effective_end)
                           .filter(ee.Filter.lt("CLOUD_COVER", 30))
                           .map(mask_landsat_qa)
                           .map(kelvin_to_celsius))
                
                lst_collection = landsat8.merge(landsat9).sort("CLOUD_COVER", True)
            
            if lst_collection.size().getInfo() == 0:
                raise HTTPException(status_code=404, detail="Nenhuma imagem Landsat com dados térmicos encontrada. Dados disponíveis até 2024.")
            
            lst_image = lst_collection.first()
            
            # Usar banda 'temp' já convertida para Celsius
            lst_celsius = lst_image.select('temp').clip(geometry)
            
            # Preservar timestamp
            image = lst_celsius.set('system:time_start', lst_image.get('system:time_start'))
            
            vis_params = {
                'min': 20,
                'max': 40,
                'palette': ['blue', 'cyan', 'lime', 'yellow', 'orange', 'red', 'darkred']
            }
        
        elif request.layer_type == "UHI":
            # Urban Heat Island (Ilha de Calor Urbana) usando Landsat thermal
            # UHI = diferença normalizada da temperatura em relação à média da região
            
            # Limitar busca até 2024 (Landsat thermal pode não estar disponível após)
            user_end = datetime.strptime(end_date, "%Y-%m-%d")
            max_thermal_date = datetime(2024, 12, 31)
            effective_end = min(user_end, max_thermal_date).strftime("%Y-%m-%d")
            
            # Tentar Landsat 8 e 9 juntos
            landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").filterBounds(geometry).filterDate(start_date, effective_end).filter(ee.Filter.lt("CLOUD_COVER", 30))
            landsat9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2").filterBounds(geometry).filterDate(start_date, effective_end).filter(ee.Filter.lt("CLOUD_COVER", 30))
            
            landsat_collection = landsat8.merge(landsat9).sort("CLOUD_COVER", True)
            
            # Se não encontrar, expandir para 2 anos
            if landsat_collection.size().getInfo() == 0:
                expanded_start = (max_thermal_date - timedelta(days=730)).strftime("%Y-%m-%d")
                landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").filterBounds(geometry).filterDate(expanded_start, effective_end).filter(ee.Filter.lt("CLOUD_COVER", 50))
                landsat9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2").filterBounds(geometry).filterDate(expanded_start, effective_end).filter(ee.Filter.lt("CLOUD_COVER", 50))
                landsat_collection = landsat8.merge(landsat9).sort("CLOUD_COVER", True)
            
            if landsat_collection.size().getInfo() == 0:
                raise HTTPException(status_code=404, detail="Nenhuma imagem Landsat com dados térmicos encontrada. Dados térmicos disponíveis até 2024.")
            
            landsat_image = landsat_collection.first()
            
            # Calcular LST (Land Surface Temperature) em Celsius
            thermal = landsat_image.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15)
            
            # Calcular estatísticas da região para normalizar (server-side)
            lst_clipped = thermal.clip(geometry)
            lst_stats = lst_clipped.reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), None, True),
                geometry=geometry,
                scale=100,
                maxPixels=1e8,
                bestEffort=True
            )
            
            lst_mean = ee.Number(lst_stats.get('ST_B10_mean'))
            lst_std = ee.Number(lst_stats.get('ST_B10_stdDev'))
            
            # UHI normalizado = (LST - média) / desvio padrão
            uhi = lst_clipped.subtract(lst_mean).divide(lst_std)
            
            # Preservar timestamp
            image = uhi.set('system:time_start', landsat_image.get('system:time_start'))
            
            # Visualização: azul (frio) -> branco (normal) -> vermelho (ilha de calor)
            vis_params = {
                'min': -2.5,
                'max': 2.5,
                'palette': ['#08519c', '#3182bd', '#6baed6', '#bdd7e7', '#eff3ff',
                           '#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15']
            }

        elif request.layer_type == "UTFVI":
            # UTFVI (Urban Thermal Field Variance Index) usando Landsat thermal
            # Índice de variação térmica urbana
            
            # Usar Landsat 8/9 para dados térmicos
            landsat_collection = (
                ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
                .filterBounds(geometry)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
                .sort("CLOUD_COVER", True)
            )
            
            # Fallback para Landsat 8
            collection_size = landsat_collection.size()
            if collection_size.getInfo() == 0:
                landsat_collection = (
                    ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
                    .filterBounds(geometry)
                    .filterDate(start_date, end_date)
                    .filter(ee.Filter.lt("CLOUD_COVER", request.cloud_percentage))
                    .sort("CLOUD_COVER", True)
                )
            
            if collection_size.getInfo() == 0:
                raise HTTPException(status_code=404, detail="Nenhuma imagem Landsat encontrada para calcular UTFVI.")
            
            landsat_image = landsat_collection.first()
            
            # Calcular LST em Celsius
            thermal = landsat_image.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15)
            
            # Calcular média da temperatura (server-side)
            lst_clipped = thermal.clip(geometry)
            lst_stats = lst_clipped.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geometry,
                scale=100,
                maxPixels=1e8,
                bestEffort=True
            )
            
            lst_mean = ee.Number(lst_stats.get('ST_B10'))
            
            # UTFVI = (LST - média) / LST
            # Valores positivos = áreas mais quentes que a média
            utfvi = lst_clipped.subtract(lst_mean).divide(lst_clipped)
            
            # Preservar timestamp
            image = utfvi.set('system:time_start', landsat_image.get('system:time_start'))
            
            vis_params = {
                'min': -0.15,
                'max': 0.15,
                'palette': ['#5e4fa2', '#3288bd', '#66c2a5', '#abdda4', '#e6f598',
                           '#fee08b', '#fdae61', '#f46d43', '#d53e4f', '#9e0142']
            }
        
        elif request.layer_type == "DEM":
            # DEM (SRTM) - Modelo Digital de Elevação
            dem = ee.Image("USGS/SRTMGL1_003").clip(geometry)
            
            # Calcular estatísticas de elevação para a área (server-side)
            stats = dem.reduceRegion(
                reducer=ee.Reducer.minMax(),
                geometry=geometry,
                scale=90,
                maxPixels=1e8,
                bestEffort=True
            ).getInfo()
            
            min_elev = stats.get("elevation_min", 0)
            max_elev = stats.get("elevation_max", 3000)
            
            image = dem
            vis_params = {
                "min": min_elev,
                "max": max_elev,
                "palette": ["blue", "green", "yellow", "red"]
            }
            date_str = "2000-02-11"  # Data da missão SRTM
        
        if image is None:
            raise HTTPException(status_code=404, detail=f"Nenhuma imagem encontrada para a camada '{request.layer_type}' no período/região.")

        # A data é extraída da imagem efetivamente usada
        try:
            img_date = image.get("system:time_start")
            date_str = ee.Date(img_date).format("YYYY-MM-dd").getInfo() if img_date else end_date
        except Exception as e:
            print(f"⚠️ Aviso: não foi possível extrair data da imagem: {e}")
            date_str = end_date

        # Aplicar visualização
        if vis_params:
            # Para camadas com uma banda (LST, UHI, UTFVI, índices), usar getMapId com vis_params
            if request.layer_type in ["LST", "UHI", "UTFVI", "NDVI", "NDWI"]:
                map_id = image.getMapId(vis_params)
            else:
                map_id = image.visualize(**vis_params).getMapId()
        else:
            map_id = image.getMapId()
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
# Análise de Área com IA - RISCO AMBIENTAL
# =========================
@app.post("/api/analyze_area", response_model=AnalyzeAreaResponse)
async def analyze_area(req: AnalyzeAreaRequest):
    """
    Analisa uma área definida por polígono com foco em RISCO AMBIENTAL:
    - Temperatura média anual e dias de calor extremo
    - Ilhas de calor urbanas
    - Densidade de vegetação e risco de perda
    - Risco de inundação e seca
    - Vulnerabilidade social (favelas)
    """
    try:
        # Criar geometria do polígono
        polygon_coords = req.polygon
        if polygon_coords[0] != polygon_coords[-1]:
            polygon_coords.append(polygon_coords[0])
        
        geometry = ee.Geometry.Polygon([polygon_coords])
        
        # Contar favelas na área (usando FCUs_BR.json)
        favela_info = count_favelas_in_polygon(req.polygon)
        favela_count = favela_info.get("count", 0)
        favela_population = favela_info.get("population", 0)
        
        # Período de análise: últimos 2 anos (mais dados disponíveis)
        end_date = datetime.now()
        start_date_annual = end_date - timedelta(days=730)
        start_str_annual = start_date_annual.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        # 1. TEMPERATURA ANUAL E DIAS EXTREMOS (MODIS LST)
        print(f"🌡️ Analisando temperatura MODIS para período {start_str_annual} a {end_str}")
        
        # MODIS tem cobertura global, então não precisa filterBounds inicial
        modis_lst = ee.ImageCollection("MODIS/061/MOD11A2") \
            .filterDate(start_str_annual, end_str) \
            .select("LST_Day_1km")
        
        modis_count = modis_lst.size().getInfo()
        print(f"📊 Total de imagens MODIS LST disponíveis: {modis_count}")
        
        if modis_count == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Nenhuma imagem MODIS LST encontrada para o período {start_str_annual} a {end_str}. MODIS pode estar temporariamente indisponível."
            )
        
        # Converter para Celsius
        lst_celsius = modis_lst.map(lambda img: img.multiply(0.02).subtract(273.15))
        
        # Temperatura média anual
        lst_mean = lst_celsius.mean()
        temp_stats = lst_mean.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=1000,
            maxPixels=1e9
        ).getInfo()
        
        avg_annual_temp = temp_stats.get("LST_Day_1km")
        if avg_annual_temp is None:
            raise HTTPException(
                status_code=500,
                detail="Falha ao calcular temperatura média. Dados MODIS LST inválidos."
            )
        
        print(f"✅ Temperatura média anual calculada: {avg_annual_temp:.2f}°C")
        
        # Contar dias com calor extremo (>35°C)
        extreme_count = lst_celsius.map(lambda img: img.gt(35).selfMask()).sum()
        extreme_stats = extreme_count.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=1000,
            maxPixels=1e9
        ).getInfo()
        extreme_heat_days = int(extreme_stats.get("LST_Day_1km", 0) or 0)
        print(f"🔥 Dias com calor extremo (>35°C): {extreme_heat_days}")
        
        # Calcular risco de ilha de calor
        if avg_annual_temp > 32 or extreme_heat_days > 60:
            heat_island_risk = "CRITICAL"
        elif avg_annual_temp > 30 or extreme_heat_days > 40:
            heat_island_risk = "HIGH"
        elif avg_annual_temp > 28 or extreme_heat_days > 20:
            heat_island_risk = "MEDIUM"
        else:
            heat_island_risk = "LOW"
        
        # 2. VEGETAÇÃO (NDVI) - Sentinel-2
        print(f"🌿 Analisando vegetação Sentinel-2 para período {start_str_annual} a {end_str}")
        
        s2_collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
            .filterDate(start_str_annual, end_str) \
            .filterBounds(geometry) \
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
        
        s2_count = s2_collection.size().getInfo()
        print(f"📊 Encontradas {s2_count} imagens Sentinel-2")
        
        if s2_count == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Nenhuma imagem Sentinel-2 encontrada para a área no período {start_str_annual} a {end_str}. Tente uma área diferente ou aumente a tolerância de nuvens."
            )
        
        def calc_ndvi(img):
            ndvi = img.normalizedDifference(["B8", "B4"]).rename("NDVI")
            return img.addBands(ndvi)
        
        ndvi_collection = s2_collection.map(calc_ndvi)
        ndvi_mean = ndvi_collection.select("NDVI").mean()
        
        ndvi_stats = ndvi_mean.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=100,
            maxPixels=1e9
        ).getInfo()
        
        ndvi_value = ndvi_stats.get("NDVI")
        if ndvi_value is None:
            raise HTTPException(
                status_code=500,
                detail="Falha ao calcular NDVI. Dados Sentinel-2 inválidos."
            )
        
        vegetation_density = max(0, min(100, (ndvi_value + 1) * 50))
        print(f"✅ NDVI médio: {ndvi_value:.3f} | Densidade vegetal: {vegetation_density:.1f}%")
        
        # Risco de perda de vegetação
        if vegetation_density < 20:
            vegetation_loss_risk = "CRITICAL"
        elif vegetation_density < 35:
            vegetation_loss_risk = "HIGH"
        elif vegetation_density < 50:
            vegetation_loss_risk = "MEDIUM"
        else:
            vegetation_loss_risk = "LOW"
        
        # 3. RISCO DE INUNDAÇÃO E SECA (NDWI + elevação)
        print(f"💧 Analisando índice de água (NDWI)")
        
        def calc_ndwi(img):
            ndwi = img.normalizedDifference(["B3", "B8"]).rename("NDWI")
            return img.addBands(ndwi)
        
        ndwi_collection = s2_collection.map(calc_ndwi)
        ndwi_mean = ndwi_collection.select("NDWI").mean()
        
        ndwi_stats = ndwi_mean.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=100,
            maxPixels=1e9
        ).getInfo()
        
        ndwi_value = ndwi_stats.get("NDWI")
        if ndwi_value is None:
            raise HTTPException(
                status_code=500,
                detail="Falha ao calcular NDWI. Dados Sentinel-2 inválidos."
            )
        
        print(f"✅ NDWI médio: {ndwi_value:.3f}")
        
        # Elevação
        print(f"🏔️ Analisando elevação (DEM)")
        dem = ee.Image("USGS/SRTMGL1_003")
        elev_stats = dem.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=90,
            maxPixels=1e9
        ).getInfo()
        
        avg_elevation = elev_stats.get("elevation")
        if avg_elevation is None:
            raise HTTPException(
                status_code=500,
                detail="Falha ao calcular elevação. Dados DEM inválidos."
            )
        
        print(f"✅ Elevação média: {avg_elevation:.1f}m")
        
        # Risco de inundação
        if ndwi_value > 0.3 or avg_elevation < 10:
            flood_risk = "CRITICAL"
        elif ndwi_value > 0.2 or avg_elevation < 50:
            flood_risk = "HIGH"
        elif ndwi_value > 0.1 or avg_elevation < 100:
            flood_risk = "MEDIUM"
        else:
            flood_risk = "LOW"
        
        # Risco de seca (baixo NDWI + baixa vegetação)
        if ndwi_value < -0.2 and vegetation_density < 30:
            drought_risk = "CRITICAL"
        elif ndwi_value < -0.1 and vegetation_density < 40:
            drought_risk = "HIGH"
        elif ndwi_value < 0 and vegetation_density < 50:
            drought_risk = "MEDIUM"
        else:
            drought_risk = "LOW"
        
        # 4. RISCO AMBIENTAL GERAL (combinação de fatores)
        risk_score = 0
        
        # Pontuação por categoria
        heat_scores = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
        risk_score += heat_scores.get(heat_island_risk, 0) * 2  # Peso dobrado para calor
        risk_score += heat_scores.get(vegetation_loss_risk, 0)
        risk_score += heat_scores.get(flood_risk, 0)
        risk_score += heat_scores.get(drought_risk, 0)
        
        # Favelas aumentam vulnerabilidade
        if favela_count > 0:
            risk_score += min(3, favela_count)  # Máximo +3 por favelas
        
        # Classificação final
        if risk_score >= 10:
            environmental_risk = "CRITICAL"
        elif risk_score >= 7:
            environmental_risk = "HIGH"
        elif risk_score >= 4:
            environmental_risk = "MEDIUM"
        else:
            environmental_risk = "LOW"
        
        # Vulnerabilidade social
        if favela_count > 3 or favela_population > 5000:
            social_vulnerability = "CRITICAL"
        elif favela_count > 1 or favela_population > 2000:
            social_vulnerability = "HIGH"
        elif favela_count > 0 or favela_population > 500:
            social_vulnerability = "MEDIUM"
        else:
            social_vulnerability = "LOW"
        
        # 5. GERAR RESUMO E RECOMENDAÇÕES COM IA
        ai_summary = f"📊 ANÁLISE AMBIENTAL - Área de {req.area_km2:.2f} km²\n\n"
        
        # Análise climática
        ai_summary += f"🌡️ CLIMA: Temperatura média anual de {avg_annual_temp:.1f}°C"
        if extreme_heat_days > 0:
            ai_summary += f", com {extreme_heat_days} dias de calor extremo (>35°C) no último ano"
        ai_summary += ". "
        
        if heat_island_risk in ["HIGH", "CRITICAL"]:
            ai_summary += "⚠️ Área identificada como ILHA DE CALOR URBANA - temperaturas significativamente acima da média regional. "
        
        # Vegetação
        if vegetation_density < 25:
            ai_summary += f"🌱 VEGETAÇÃO CRÍTICA: Apenas {vegetation_density:.0f}% de cobertura vegetal - área altamente impermeabilizada. "
        elif vegetation_density < 45:
            ai_summary += f"🌿 Cobertura vegetal moderada ({vegetation_density:.0f}%) com potencial de melhoria. "
        else:
            ai_summary += f"🌳 Boa cobertura vegetal ({vegetation_density:.0f}%), contribuindo para regulação térmica. "
        
        # Riscos hídricos
        if flood_risk in ["HIGH", "CRITICAL"]:
            ai_summary += f"💧 ALERTA DE INUNDAÇÃO: Área com elevação média de {avg_elevation:.0f}m e alta presença hídrica. "
        if drought_risk in ["HIGH", "CRITICAL"]:
            ai_summary += "☀️ RISCO DE SECA: Área vulnerável a estresse hídrico em períodos secos. "
        
        # Vulnerabilidade social
        if favela_count > 0:
            ai_summary += f"\n\n🏘️ VULNERABILIDADE SOCIAL: {favela_count} aglomerado(s) subnormal(is) identificado(s)"
            if favela_population > 0:
                ai_summary += f" com ~{favela_population:,} habitantes".replace(",", ".")
            ai_summary += ". População em situação de maior exposição aos riscos ambientais. "
        
        # Conclusão
        ai_summary += f"\n\n🎯 RISCO AMBIENTAL GERAL: {environmental_risk}"
        
        # RECOMENDAÇÕES
        recommendations = []
        
        # Por ilha de calor
        if heat_island_risk in ["HIGH", "CRITICAL"]:
            recommendations.append("🌳 URGENTE: Implementar programa de arborização urbana massiva (meta: +30% de cobertura)")
            recommendations.append("🏗️ Adotar tetos e pavimentos permeáveis e refletivos em novas construções")
            recommendations.append("💨 Criar corredores de ventilação urbana conectando áreas verdes")
        
        # Por vegetação
        if vegetation_loss_risk in ["HIGH", "CRITICAL"]:
            recommendations.append("🌱 Criar Áreas de Preservação Permanente (APPs) e Reservas Ecológicas")
            recommendations.append("🏞️ Implementar parques lineares ao longo de cursos d'água")
        
        # Por inundação
        if flood_risk in ["HIGH", "CRITICAL"]:
            recommendations.append("💧 CRÍTICO: Implementar sistema de drenagem sustentável (jardins de chuva, biovaletas)")
            recommendations.append("🏗️ Revisar zoneamento - proibir novas edificações em cotas abaixo de " + str(int(avg_elevation + 10)) + "m")
            recommendations.append("⚠️ Instalar sistema de alerta precoce para enchentes")
        
        # Por seca
        if drought_risk in ["HIGH", "CRITICAL"]:
            recommendations.append("💧 Implementar sistemas de captação e reuso de água pluvial")
            recommendations.append("🌿 Priorizar espécies nativas resistentes à seca no paisagismo urbano")
        
        # Por vulnerabilidade social
        if favela_count > 0:
            recommendations.append(f"🏘️ Priorizar {favela_count} área(s) vulneráveis para programas de urbanização integrada")
            recommendations.append("🚰 Garantir 100% de cobertura de saneamento básico nas comunidades")
            if flood_risk in ["HIGH", "CRITICAL"] or heat_island_risk in ["HIGH", "CRITICAL"]:
                recommendations.append("🚨 EMERGÊNCIA: Mapear e reassentar famílias em áreas de risco imediato")
        
        # Monitoramento
        recommendations.append("📡 Estabelecer monitoramento contínuo via satélite (NDVI, LST, NDWI) para acompanhar evolução")
        
        return AnalyzeAreaResponse(
            avg_annual_temperature=round(avg_annual_temp, 2),
            extreme_heat_days=extreme_heat_days,
            heat_island_risk=heat_island_risk,
            vegetation_density=round(vegetation_density, 2),
            vegetation_loss_risk=vegetation_loss_risk,
            environmental_risk=environmental_risk,
            flood_risk=flood_risk,
            drought_risk=drought_risk,
            favela_count=favela_count,
            favela_population=favela_population,
            social_vulnerability=social_vulnerability,
            ai_summary=ai_summary,
            recommendations=recommendations
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")


# =========================
# Time Series Endpoint
# =========================
class TimeSeriesRequest(BaseModel):
    polygon: List[List[float]]
    start_date: str
    end_date: str

class TimeSeriesDataPoint(BaseModel):
    date: str
    temperature: Optional[float] = None
    ndvi: Optional[float] = None
    ndwi: Optional[float] = None
    precipitation: Optional[float] = None

class TimeSeriesResponse(BaseModel):
    timeseries: List[TimeSeriesDataPoint]
    total_points: int

@app.post("/api/time_series", response_model=TimeSeriesResponse)
async def get_time_series(req: TimeSeriesRequest):
    """
    Retorna séries temporais de dados ambientais para a área especificada
    """
    try:
        # Criar geometria
        coords = [[coord[0], coord[1]] for coord in req.polygon]
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        
        geometry = ee.Geometry.Polygon([coords])
        
        # Parse dates
        start = datetime.strptime(req.start_date, '%Y-%m-%d')
        end = datetime.strptime(req.end_date, '%Y-%m-%d')
        
        print(f"📊 Buscando time series de {req.start_date} a {req.end_date}")
        
        # Coleções
        modis_lst = ee.ImageCollection('MODIS/061/MOD11A2') \
            .filterBounds(geometry) \
            .filterDate(req.start_date, req.end_date) \
            .select('LST_Day_1km')
        
        s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
            .filterBounds(geometry) \
            .filterDate(req.start_date, req.end_date) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
        
        # Criar dicionário de dados por data
        data_by_date = {}
        
        # Processar MODIS LST (temperatura)
        modis_list = modis_lst.toList(1000)
        modis_size = modis_lst.size().getInfo()
        print(f"🌡️ Processando {modis_size} imagens MODIS LST")
        
        for i in range(min(modis_size, 100)):  # Limitar a 100 pontos
            try:
                img = ee.Image(modis_list.get(i))
                timestamp = img.get('system:time_start').getInfo()
                date_str = datetime.fromtimestamp(timestamp / 1000).strftime('%Y-%m-%d')
                
                # Calcular temperatura média
                lst_celsius = img.multiply(0.02).subtract(273.15)
                temp_stats = lst_celsius.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=geometry,
                    scale=1000,
                    maxPixels=1e9
                ).getInfo()
                
                temp_val = temp_stats.get('LST_Day_1km')
                if temp_val is not None:
                    if date_str not in data_by_date:
                        data_by_date[date_str] = {}
                    data_by_date[date_str]['temperature'] = round(float(temp_val), 2)
            except Exception as e:
                print(f"⚠️ Erro MODIS no índice {i}: {e}")
                continue
        
        # Processar Sentinel-2 (NDVI e NDWI)
        s2_list = s2.toList(1000)
        s2_size = s2.size().getInfo()
        print(f"🌿 Processando {s2_size} imagens Sentinel-2")
        
        for i in range(min(s2_size, 100)):  # Limitar a 100 pontos
            try:
                img = ee.Image(s2_list.get(i))
                timestamp = img.get('system:time_start').getInfo()
                date_str = datetime.fromtimestamp(timestamp / 1000).strftime('%Y-%m-%d')
                
                # NDVI
                ndvi_img = img.normalizedDifference(['B8', 'B4'])
                ndvi_stats = ndvi_img.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=geometry,
                    scale=100,
                    maxPixels=1e9
                ).getInfo()
                
                ndvi_val = ndvi_stats.get('nd')
                
                # NDWI
                ndwi_img = img.normalizedDifference(['B3', 'B8'])
                ndwi_stats = ndwi_img.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=geometry,
                    scale=100,
                    maxPixels=1e9
                ).getInfo()
                
                ndwi_val = ndwi_stats.get('nd')
                
                if date_str not in data_by_date:
                    data_by_date[date_str] = {}
                
                if ndvi_val is not None:
                    data_by_date[date_str]['ndvi'] = round(float(ndvi_val), 3)
                if ndwi_val is not None:
                    data_by_date[date_str]['ndwi'] = round(float(ndwi_val), 3)
                    
            except Exception as e:
                print(f"⚠️ Erro S2 no índice {i}: {e}")
                continue
        
        # Converter dicionário para lista ordenada
        timeseries = []
        temp_count = 0
        ndvi_count = 0
        ndwi_count = 0
        
        for date_str in sorted(data_by_date.keys()):
            data = data_by_date[date_str]
            temp_val = data.get('temperature')
            ndvi_val = data.get('ndvi')
            ndwi_val = data.get('ndwi')
            
            if temp_val is not None:
                temp_count += 1
            if ndvi_val is not None:
                ndvi_count += 1
            if ndwi_val is not None:
                ndwi_count += 1
            
            timeseries.append(TimeSeriesDataPoint(
                date=date_str,
                temperature=temp_val,
                ndvi=ndvi_val,
                ndwi=ndwi_val,
                precipitation=None  # TODO: Adicionar dados de precipitação
            ))
        
        print(f"✅ Time series gerado: {len(timeseries)} pontos | Temp: {temp_count} | NDVI: {ndvi_count} | NDWI: {ndwi_count}")
        
        return TimeSeriesResponse(
            timeseries=timeseries,
            total_points=len(timeseries)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar séries temporais: {str(e)}")


# =========================
# Timelapse Endpoint
# =========================
class TimelapseRequest(BaseModel):
    polygon: List[List[float]]
    start_date: str
    end_date: str
    layer_type: str = "NDVI"

class TimelapseFrame(BaseModel):
    date: str
    image_url: str
    thumbnail_url: str
    cloud_cover: Optional[float] = None

class TimelapseResponse(BaseModel):
    frames: List[TimelapseFrame]
    total_frames: int

@app.post("/api/timelapse", response_model=TimelapseResponse)
async def get_timelapse(req: TimelapseRequest):
    """
    Gera sequência de imagens (timelapse) para a área especificada
    """
    try:
        # Criar geometria
        coords = [[coord[0], coord[1]] for coord in req.polygon]
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        
        geometry = ee.Geometry.Polygon([coords])
        centroid = geometry.centroid().coordinates().getInfo()
        
        # Parse dates
        start = datetime.strptime(req.start_date, '%Y-%m-%d')
        end = datetime.strptime(req.end_date, '%Y-%m-%d')
        
        # Selecionar coleção baseada no layer_type
        if req.layer_type == "NDVI":
            collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                .filterBounds(geometry) \
                .filterDate(start, end) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
            
            def process_ndvi(img):
                ndvi = img.normalizedDifference(['B8', 'B4'])
                return ndvi.visualize(
                    min=-0.2,
                    max=0.8,
                    palette=['#d73027', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850']
                ).set('system:time_start', img.get('system:time_start'))
            
            processed = collection.map(process_ndvi)
            
        elif req.layer_type == "NDWI":
            collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                .filterBounds(geometry) \
                .filterDate(start, end) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
            
            def process_ndwi(img):
                ndwi = img.normalizedDifference(['B3', 'B8'])
                return ndwi.visualize(
                    min=-0.3,
                    max=0.5,
                    palette=['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c']
                ).set('system:time_start', img.get('system:time_start'))
            
            processed = collection.map(process_ndwi)
            
        elif req.layer_type == "LST" or req.layer_type == "UHI" or req.layer_type == "UTFVI":
            # Usar MODIS 061 (versão atualizada, 006 está deprecated)
            # Cobertura GLOBAL - não restringir por bbox para ter mais dados
            collection = ee.ImageCollection('MODIS/061/MOD11A2') \
                .filterDate(start, end) \
                .select('LST_Day_1km')
            
            # Se não houver dados no período, expandir para últimos 2 anos
            count = collection.size().getInfo()
            print(f"📊 MODIS LST: {count} imagens encontradas no período {start} a {end}")
            
            if count == 0:
                end_dt = datetime.now()
                start_dt = end_dt - timedelta(days=730)
                print(f"⚠️ Expandindo busca para {start_dt.strftime('%Y-%m-%d')} a {end_dt.strftime('%Y-%m-%d')}")
                collection = ee.ImageCollection('MODIS/061/MOD11A2') \
                    .filterDate(start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d")) \
                    .select('LST_Day_1km')
                count = collection.size().getInfo()
                print(f"📊 MODIS LST expandido: {count} imagens encontradas")
            
            # Aplicar filtro de área DEPOIS de garantir que temos dados
            if count > 0:
                collection = collection.filterBounds(geometry)
            
            def process_lst(img):
                lst_celsius = img.multiply(0.02).subtract(273.15)
                return lst_celsius.visualize(
                    min=15,
                    max=45,
                    palette=['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c']
                ).set('system:time_start', img.get('system:time_start'))
            
            processed = collection.map(process_lst)
            
        else:  # SENTINEL2_RGB ou default
            collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                .filterBounds(geometry) \
                .filterDate(start, end) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
            
            def process_rgb(img):
                return img.visualize(
                    bands=['B4', 'B3', 'B2'],
                    min=0,
                    max=3000
                ).set('system:time_start', img.get('system:time_start'))
            
            processed = collection.map(process_rgb)
        
        # Obter lista de imagens
        img_list = processed.toList(100)  # Limitar a 100 frames
        size = img_list.size().getInfo()
        
        frames = []
        for i in range(min(size, 100)):
            try:
                img = ee.Image(img_list.get(i))
                timestamp = img.get('system:time_start').getInfo()
                date = datetime.fromtimestamp(timestamp / 1000).strftime('%Y-%m-%d')
                
                # Gerar tile URL (imagem completa)
                map_id = img.getMapId({
                    'dimensions': 512,
                    'region': geometry,
                    'format': 'png'
                })
                
                # Thumbnail (menor resolução)
                thumbnail_url = img.getThumbUrl({
                    'dimensions': 128,
                    'region': geometry,
                    'format': 'png'
                })
                
                # Cloud cover (se disponível)
                cloud_cover = None
                try:
                    if req.layer_type in ["NDVI", "NDWI", "SENTINEL2_RGB"]:
                        original_img = collection.filter(
                            ee.Filter.eq('system:time_start', timestamp)
                        ).first()
                        cloud_cover = original_img.get('CLOUDY_PIXEL_PERCENTAGE').getInfo()
                except:
                    pass
                
                frames.append(TimelapseFrame(
                    date=date,
                    image_url=map_id['tile_fetcher'].url_format,
                    thumbnail_url=thumbnail_url,
                    cloud_cover=cloud_cover
                ))
                
            except Exception as e:
                print(f"Erro ao processar frame {i}: {e}")
                continue
        
        return TimelapseResponse(
            frames=frames,
            total_frames=len(frames)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar timelapse: {str(e)}")


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


# =========================
# Planetary Computer Endpoints (MODIS LST, Sentinel-2 False Color)
# =========================
class PlanetaryComputerRequest(BaseModel):
    polygon: List[Coordinate]
    layer_type: str = "LST"  # LST or URBANIZATION

class PlanetaryComputerResponse(BaseModel):
    tile_url: str
    date: str
    source: str

@app.post("/api/planetary_computer", response_model=PlanetaryComputerResponse)
async def get_planetary_computer_layer(request: PlanetaryComputerRequest):
    """
    Obtém camadas do Microsoft Planetary Computer:
    - URBANIZATION: Sentinel-2 False Color para visualização urbana
    (Nota: MODIS_LST foi substituído por LST, UHI e UTFVI usando Landsat 8/9)
    """
    try:
        from pystac_client import Client
        import planetary_computer as pc
        
        # Converter polígono para GeoJSON
        coords = [[c.lng, c.lat] for c in request.polygon]
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        
        aoi = {
            "type": "Polygon",
            "coordinates": [coords]
        }
        
        # Conectar ao catálogo
        catalog = Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
        
        if request.layer_type == "URBANIZATION":
            # Sentinel-2 para visualização de urbanização (falso-color)
            search = catalog.search(
                filter_lang="cql2-json",
                filter={
                    "op": "and",
                    "args": [
                        {"op": "s_intersects", "args": [{"property": "geometry"}, aoi]},
                        {"op": "=", "args": [{"property": "collection"}, "sentinel-2-l2a"]},
                        {"op": "<=", "args": [{"property": "eo:cloud_cover"}, 10]}
                    ]
                }
            )
            
            items = list(search.get_items())
            if not items:
                raise HTTPException(status_code=404, detail="Nenhuma imagem Sentinel-2 encontrada com baixa cobertura de nuvens")
            
            first_item = items[0]
            signed_item = pc.sign_item(first_item)
            
            # URL para renderização (visual ou rendered_preview)
            if 'rendered_preview' in signed_item.assets:
                tile_url = signed_item.assets['rendered_preview'].href
            elif 'visual' in signed_item.assets:
                tile_url = signed_item.assets['visual'].href
            else:
                tile_url = list(signed_item.assets.values())[0].href
            
            return PlanetaryComputerResponse(
                tile_url=tile_url,
                date=first_item.datetime.strftime("%Y-%m-%d") if first_item.datetime else "N/A",
                source="Sentinel-2 L2A (False Color Urban)"
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de camada '{request.layer_type}' não suportado")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro Planetary Computer: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao acessar Planetary Computer: {str(e)}")