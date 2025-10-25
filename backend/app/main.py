# backend/app/main.py - VERSÃO FINAL CORRIGIDA E PRONTA PARA RAILWAY/GUNICORN

import os
import datetime
import traceback
from typing import List, Optional, Tuple, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from geojson import FeatureCollection # type: ignore
import ee # type: ignore
import fiona # type: ignore
from shapely.geometry import shape, Polygon, mapping # type: ignore


# --- ID do Projeto GEE ---
GEE_PROJECT_ID = 'gen-lang-client-0502761424'

# --- Caminhos para os arquivos GeoJSON ---
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
# 🎯 SCHEMAS, ENDPOINTS E LÓGICA (Sem alterações estruturais)
# =========================================================
class Coordinate(BaseModel):
    lat: float
    lng: float

class PolygonRequest(BaseModel):
    polygon: List[Coordinate]

class SatelliteRequest(PolygonRequest):
    start_date: str = '2024-01-01'
    end_date: str = datetime.date.today().isoformat()
    satellite: str

@app.get("/health")
def health_check():
    """Verifica o status da API e do GEE."""
    return {
        "status": "ok",
        "gee_initialized": EE_INITIALIZED,
        "gee_project": GEE_PROJECT_ID,
        "message": "API está rodando."
    }

@app.post("/censo_analysis")
def censo_analysis(request: PolygonRequest):
    """Busca setores censitários ou outras feições GeoJSON."""
    if not request.polygon or len(request.polygon) < 3:
        raise HTTPException(status_code=400, detail="Polígono inválido. Mínimo de 3 coordenadas.")

    try:
        coords_list = [(c.lng, c.lat) for c in request.polygon]
        user_polygon = Polygon(coords_list)
        all_filtered_features: List[Dict[str, Any]] = []

        for filename in GEOJSON_FILES:
            filepath = os.path.join(DATA_DIR, filename)
            if not os.path.exists(filepath):
                continue
            try:
                with fiona.open(filepath) as source:
                    for feature in source:
                        feature_shape = shape(feature['geometry'])
                        if user_polygon.intersects(feature_shape):
                            feature_data = {
                                "type": "Feature",
                                "geometry": mapping(feature_shape),
                                "properties": feature['properties']
                            }
                            feature_data['properties']['source_file'] = filename 
                            all_filtered_features.append(feature_data)
            except fiona.errors.DriverError:
                continue 
            except Exception as file_e:
                print(f"Erro inesperado ao processar o arquivo '{filename}': {type(file_e).__name__} - {file_e}")
                continue 

        if not all_filtered_features:
            return FeatureCollection([])
        return FeatureCollection(all_filtered_features)

    except ValueError as ve:
         raise HTTPException(status_code=400, detail=f"Erro de validação: {str(ve)}")
    except ImportError:
         raise HTTPException(status_code=500, detail="Erro de dependência: Fiona ou Shapely não instalados corretamente.")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar GeoJSON: {type(e).__name__}: {str(e)}")