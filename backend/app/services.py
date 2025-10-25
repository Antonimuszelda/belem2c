import httpx
from pystac_client import Client
from datetime import datetime, timezone
import json

# URL do Catálogo STAC do Planetary Computer
STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"

async def search_planetary_computer(latitude: float, longitude: float, date_from: str, date_to: str, cloud_cover: float = 10.0):
    """
    Busca imagens Sentinel-2 no MPC para a área e período especificados.
    """
    try:
        # Define a área de interesse (Bounding Box simples para a POC)
        # Para produção, você usaria um buffer maior e mais robusto.
        buffer = 0.01  # Pequena área ao redor do ponto
        bbox = [longitude - buffer, latitude - buffer, longitude + buffer, latitude + buffer]
        
        # Conecta ao cliente STAC
        catalog = Client.open(STAC_URL)

        # Realiza a busca. Usando Sentinel-2 L2A.
        search = catalog.search(
            collections=["sentinel-2-l2a"],
            bbox=bbox,
            datetime=f"{date_from}/{date_to}",
            query={"eo:cloud_cover": {"lte": cloud_cover}}
        )

        items = search.get_all_items()
        
        results = []
        for item in items[:5]: # Limita a 5 resultados para agilidade
            # Extrai as URLs mais importantes
            assets = item.assets
            
            # Tenta encontrar uma URL de visualização útil
            visual_asset = assets.get('visual') or assets.get('B4') # Visual ou Banda 4 (vermelho)
            
            if visual_asset:
                results.append({
                    "id": item.id,
                    "datetime": item.datetime.isoformat(),
                    "cloud_cover": item.properties.get('eo:cloud_cover'),
                    "visual_url": visual_asset.href, # URL que o Cesium pode usar ou a IA analisar
                    "center_coords": (latitude, longitude)
                })
        
        return results

    except Exception as e:
        print(f"Erro na busca STAC: {e}")
        return []

# NOTA: O 'pystac-client' é uma dependência leve que usa apenas HTTP.