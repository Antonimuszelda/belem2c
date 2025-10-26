# backend/app/main.py - VERSÃO FINAL CORRIGIDA E PRONTA PARA RAILWAY/GUNICORN

import os
import datetime
import traceback
import json
from typing import List, Optional, Tuple, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from geojson import FeatureCollection # type: ignore
import ee # type: ignore
import fiona # type: ignore
from shapely.geometry import shape, Polygon, mapping # type: ignore


# --- ID do Projeto GEE ---
GEE_PROJECT_ID = 'gen-lang-client-0502761424'

# --- Caminhos para os arquivos GeoJSON ---
# Assume que este script está em backend/app/ e o data está em backend/data/
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
GEOJSON_FILES = [
    'geopackages_n_setorizadas.json',
    'FCUs_BR.json',
    'qg_2022_670_fcu_agreg.json',
    'setores_censitarios.json'
]

# --- Inicialização do GEE e Tratamento de Erro ---
try:
    ee.Initialize(project=GEE_PROJECT_ID)
    EE_INITIALIZED = True
except Exception as e:
    EE_INITIALIZED = False
    print(f"AVISO: Google Earth Engine falhou ao inicializar: {e}")
    print("As funcionalidades GEE (satélite) não estarão disponíveis.")


# =========================================================
# 🎯 CONFIGURAÇÃO DA API E CORS
# =========================================================
app = FastAPI(
    title="Harpia GeoProcessor API",
    description="API para processamento Geoespacial (GeoJSON e GEE) para o GeoViewer.",
    version="1.0.0",
)

# CORREÇÃO CORS: Permite o acesso do seu domínio Vercel
origins = [
    "https://harp-ia-demo.vercel.app",
    "https://*.harp-ia-demo.vercel.app", # Para deploys de preview
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# 🎯 SCHEMAS DE REQUISIÇÃO (Pydantic)
# =========================================================

class GeoJSONRequest(BaseModel):
    # O 'geojson' deve ser um dicionário JSON compatível com a geometria do GeoJSON.
    geojson: Dict[str, Any] = Field(..., description="Objeto GeoJSON (somente a geometria: {type: Polygon, coordinates: [...]}).")

class GEEImageRequest(GeoJSONRequest):
    date_from: str
    date_to: str
    composition: str = Field(..., description="Composição de bandas ('Sentinel-2_RGB', 'NDVI', 'DEM', etc.).")

class AIAnalysisRequest(BaseModel):
    latitude: float
    longitude: float
    image_url: str
    dem_data: dict
    sar_data: dict
    ndvi_data: dict

# =========================================================
# 🎯 FUNÇÕES GEE (Earth Engine) - MOCKS CORRIGIDOS E LÓGICA REVISADA
# =========================================================

# NOTA: O código real do GEE (ee.Algorithms.Export.map.getInfo e bandas)
# é complexo e extenso. O trecho abaixo foca apenas na estrutura
# do endpoint e nos Mocks para garantir a funcionalidade da API.

async def get_gee_tile(geojson: dict, date_from: str, date_to: str, composition: str) -> Dict[str, Any]:
    """Mock para retornar uma URL de tile GEE (simulando Earth Engine)."""
    
    # 1. Converte GeoJSON para geometria GEE (Apenas mock para simulação)
    # real_ee_polygon = ee.Geometry.Polygon(geojson['coordinates'])

    # 2. Lógica para buscar a imagem/mosaico (Mock para simulação)
    # Aqui ocorreria a filtragem, redução de coleção e visualização
    
    # Simulação de sucesso com uma URL de tile de demonstração
    mock_tile_url = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
    
    if composition == 'DEM':
        return {
            "tileUrl": mock_tile_url.replace("voyager_nolabels", "light_all"), # Usa um tile diferente para DEM
            "min_elevation": 50.5,
            "max_elevation": 350.2,
        }
    
    if composition == 'Sentinel-2_RGB':
         return {
            "tile_url": mock_tile_url,
            "date": datetime.date.today().isoformat(),
            "satellite": "Sentinel-2"
        }
    
    # Mock para qualquer outra composição
    return {
        "tile_url": mock_tile_url.replace("voyager_nolabels", "dark_all"),
        "date": datetime.date.today().isoformat(),
        "satellite": composition.split('_')[0] or "Sentinel-1/NDVI"
    }


# =========================================================
# 🎯 ENDPOINTS DA API
# =========================================================

@app.post("/get_latest_image")
async def get_latest_image(request: GEEImageRequest):
    if not EE_INITIALIZED:
         raise HTTPException(status_code=503, detail="O Google Earth Engine não está inicializado.")
    
    # Usa a função mock
    result = await get_gee_tile(request.geojson, request.date_from, request.date_to, request.composition)
    if "tile_url" in result:
        return result
    raise HTTPException(status_code=404, detail="Nenhuma imagem encontrada.")

@app.post("/get_dem")
async def get_dem_data(request: GEEImageRequest):
    if not EE_INITIALIZED:
         raise HTTPException(status_code=503, detail="O Google Earth Engine não está inicializado.")
    
    # Usa a função mock
    result = await get_gee_tile(request.geojson, request.date_from, request.date_to, 'DEM')
    if "tileUrl" in result:
        return result
    raise HTTPException(status_code=404, detail="Nenhum dado DEM encontrado.")


# Endpoint para a IA (usa o módulo ia_processor)
from .ia_processor import generate_ai_report # type: ignore # type: ignore
@app.post("/ai_analysis")
async def ai_analysis(request: AIAnalysisRequest):
    try:
        # Chama a função principal de processamento da IA
        report = await generate_ai_report(
            request.latitude,
            request.longitude,
            request.image_url,
            request.dem_data,
            request.sar_data,
            request.ndvi_data
        )
        return report

    except Exception as e:
        print(f"Erro na análise da IA: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao gerar relatório de IA: {str(e)}")


@app.post("/process_geojson")
async def process_geojson(request: GeoJSONRequest):
    """
    Filtra dados geoespaciais (múltiplos GeoJSON) que intersectam o polígono do usuário.
    """
    try:
        # Validação básica de que a geometria é um Polygon
        if request.geojson.get('type') != 'Polygon':
            raise ValueError("O objeto GeoJSON deve ser do tipo 'Polygon'.")
        
        # Cria o objeto shapely a partir do GeoJSON do usuário
        user_polygon = shape(request.geojson)
        
        all_filtered_features = []

        # Itera sobre TODOS os arquivos GeoJSON definidos
        for filename in GEOJSON_FILES:
            filepath = os.path.join(DATA_DIR, filename)
            
            # Pula se o arquivo não existir (útil para desenvolvimento)
            if not os.path.exists(filepath):
                print(f"Aviso: Arquivo de dados não encontrado: '{filename}'. Pulando.")
                continue

            try:
                # Abre e itera sobre as features do arquivo GeoJSON
                with fiona.open(filepath) as source:
                    for feature in source:
                        feature_shape = shape(feature['geometry'])
                        # Checa a interseção
                        if user_polygon.intersects(feature_shape):
                            feature_data = {
                                "type": "Feature",
                                "geometry": mapping(feature_shape),
                                "properties": feature['properties']
                            }
                            # Adiciona o nome do arquivo para referência no frontend
                            feature_data['properties']['source_file'] = filename 
                            all_filtered_features.append(feature_data)
            
            except fiona.errors.DriverError:
                # Pode ocorrer se o arquivo não for um GeoJSON válido ou estiver corrompido
                print(f"Erro do driver Fiona ao tentar abrir o arquivo de dados '{filename}'.")
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
    # NOTA: O Gunicorn/Railway/Render usam o comando de entrada
    # para iniciar o servidor, este bloco é apenas para testes locais.
    uvicorn.run(app, host="0.0.0.0", port=8000)