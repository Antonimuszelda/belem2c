# backend/app/agent_tools.py - Ferramentas para o agente Sacy
"""
Ferramentas que permitem ao agente Sacy executar ações reais:
- Buscar imagens de satélite
- Analisar dados GeoJSON
- Calcular estatísticas
- Filtrar por critérios
"""

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import ee

def list_available_images_tool(
    polygon_coords: List[Dict[str, float]],
    layer_type: str,
    start_date: str,
    end_date: str,
    max_results: int = 50
) -> Dict[str, Any]:
    """
    Busca imagens disponíveis para um tipo de camada e área.
    
    Args:
        polygon_coords: Lista de coordenadas do polígono
        layer_type: Tipo de camada (LST, NDVI, NDWI, etc.)
        start_date: Data inicial (YYYY-MM-DD)
        end_date: Data final (YYYY-MM-DD)
        max_results: Número máximo de resultados
    
    Returns:
        Dict com lista de imagens e metadados
    """
    try:
        # Converter polígono para geometria EE
        coords_ee = [[p['lng'], p['lat']] for p in polygon_coords]
        geometry = ee.Geometry.Polygon([coords_ee])
        
        # Selecionar coleção baseado no tipo
        if layer_type in ['LST', 'UHI', 'UTFVI']:
            # Landsat 8/9 para dados térmicos
            collection_l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
            collection_l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
            collection = collection_l8.merge(collection_l9)
        elif layer_type in ['NDVI', 'NDWI']:
            # Sentinel-2 para índices espectrais
            collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        else:
            return {"error": f"Tipo de camada não suportado: {layer_type}"}
        
        # Filtrar por área e datas
        filtered = collection.filterBounds(geometry).filterDate(start_date, end_date)
        
        # Obter lista de imagens
        images_list = filtered.toList(max_results)
        size = images_list.size().getInfo()
        
        results = []
        for i in range(min(size, max_results)):
            img = ee.Image(images_list.get(i))
            props = img.getInfo()['properties']
            
            # Extrair metadados relevantes
            image_data = {
                'date': props.get('DATE_ACQUIRED') or props.get('system:time_start'),
                'cloud_cover': props.get('CLOUD_COVER') or props.get('CLOUDY_PIXEL_PERCENTAGE', 0),
                'satellite': props.get('SPACECRAFT_ID') or props.get('SPACECRAFT_NAME', 'Unknown'),
                'id': props.get('system:index', f'img_{i}')
            }
            results.append(image_data)
        
        # Ordenar por cobertura de nuvens (menor para maior)
        results.sort(key=lambda x: x['cloud_cover'])
        
        return {
            'success': True,
            'layer_type': layer_type,
            'total_found': size,
            'images': results[:max_results],
            'best_image': results[0] if results else None
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def analyze_geojson_features_tool(
    geojson_data: Dict[str, Any],
    polygon_coords: Optional[List[Dict[str, float]]] = None,
    property_filter: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Analisa features de um GeoJSON, opcionalmente filtrando por polígono.
    
    Args:
        geojson_data: Dados GeoJSON completos
        polygon_coords: Polígono opcional para filtrar features
        property_filter: Filtro opcional por propriedades
    
    Returns:
        Dict com estatísticas e features filtradas
    """
    try:
        features = geojson_data.get('features', [])
        
        # Se tem polígono, filtrar features que intersectam
        if polygon_coords:
            coords_ee = [[p['lng'], p['lat']] for p in polygon_coords]
            filter_geom = ee.Geometry.Polygon([coords_ee])
            
            filtered_features = []
            for feature in features:
                try:
                    # Converter feature para geometria EE
                    geom_type = feature['geometry']['type']
                    coords = feature['geometry']['coordinates']
                    
                    if geom_type == 'Polygon':
                        feat_geom = ee.Geometry.Polygon(coords)
                    elif geom_type == 'MultiPolygon':
                        feat_geom = ee.Geometry.MultiPolygon(coords)
                    elif geom_type == 'Point':
                        feat_geom = ee.Geometry.Point(coords)
                    else:
                        continue
                    
                    # Verificar interseção
                    if feat_geom.intersects(filter_geom).getInfo():
                        filtered_features.append(feature)
                except:
                    continue
            
            features = filtered_features
        
        # Aplicar filtro de propriedades se fornecido
        if property_filter:
            filtered = []
            for feature in features:
                props = feature.get('properties', {})
                match = True
                for key, value in property_filter.items():
                    if props.get(key) != value:
                        match = False
                        break
                if match:
                    filtered.append(feature)
            features = filtered
        
        # Coletar estatísticas
        total_features = len(features)
        properties_summary = {}
        
        if features:
            # Pegar propriedades únicas da primeira feature
            sample_props = features[0].get('properties', {})
            
            for key in sample_props.keys():
                values = [f.get('properties', {}).get(key) for f in features]
                values = [v for v in values if v is not None]
                
                if values:
                    if isinstance(values[0], (int, float)):
                        properties_summary[key] = {
                            'type': 'numeric',
                            'min': min(values),
                            'max': max(values),
                            'avg': sum(values) / len(values)
                        }
                    else:
                        unique_values = list(set(values))
                        properties_summary[key] = {
                            'type': 'categorical',
                            'unique_count': len(unique_values),
                            'sample_values': unique_values[:10]
                        }
        
        return {
            'success': True,
            'total_features': total_features,
            'properties_summary': properties_summary,
            'features': features[:100]  # Limitar para não sobrecarregar
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def calculate_image_statistics_tool(
    polygon_coords: List[Dict[str, float]],
    layer_type: str,
    specific_date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calcula estatísticas de uma camada sobre uma área.
    
    Args:
        polygon_coords: Coordenadas do polígono
        layer_type: Tipo de camada (LST, NDVI, NDWI, etc.)
        specific_date: Data específica da imagem
        start_date: Data inicial para período
        end_date: Data final para período
    
    Returns:
        Dict com estatísticas calculadas
    """
    try:
        # Converter polígono
        coords_ee = [[p['lng'], p['lat']] for p in polygon_coords]
        geometry = ee.Geometry.Polygon([coords_ee])
        
        # Obter imagem baseado no tipo
        if layer_type == 'LST':
            # Usar Landsat para temperatura
            collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(
                ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
            )
            
            if specific_date:
                filtered = collection.filterDate(specific_date, specific_date).filterBounds(geometry)
            else:
                filtered = collection.filterDate(start_date, end_date).filterBounds(geometry)
            
            # Pegar a melhor imagem (menos nuvens)
            best_image = filtered.sort('CLOUD_COVER').first()
            
            # Calcular LST
            thermal = best_image.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15)
            
            stats = thermal.reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    ee.Reducer.min(), '', True
                ).combine(
                    ee.Reducer.max(), '', True
                ).combine(
                    ee.Reducer.stdDev(), '', True
                ),
                geometry=geometry,
                scale=30,
                maxPixels=1e9
            ).getInfo()
            
            return {
                'success': True,
                'layer_type': 'LST',
                'unit': '°C',
                'mean': stats.get('ST_B10_mean'),
                'min': stats.get('ST_B10_min'),
                'max': stats.get('ST_B10_max'),
                'std_dev': stats.get('ST_B10_stdDev')
            }
            
        elif layer_type == 'NDVI':
            collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            
            if specific_date:
                filtered = collection.filterDate(specific_date, specific_date).filterBounds(geometry)
            else:
                filtered = collection.filterDate(start_date, end_date).filterBounds(geometry)
            
            best_image = filtered.sort('CLOUDY_PIXEL_PERCENTAGE').first()
            
            # Calcular NDVI
            nir = best_image.select('B8')
            red = best_image.select('B4')
            ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
            
            stats = ndvi.reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    ee.Reducer.min(), '', True
                ).combine(
                    ee.Reducer.max(), '', True
                ),
                geometry=geometry,
                scale=10,
                maxPixels=1e9
            ).getInfo()
            
            return {
                'success': True,
                'layer_type': 'NDVI',
                'unit': 'índice (-1 a 1)',
                'mean': stats.get('NDVI_mean'),
                'min': stats.get('NDVI_min'),
                'max': stats.get('NDVI_max')
            }
        
        else:
            return {'error': f'Tipo {layer_type} não implementado ainda'}
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def analyze_sar_data_tool(
    polygon_coords: List[Dict[str, float]],
    start_date: str,
    end_date: str,
    polarization: str = 'VV'
) -> Dict[str, Any]:
    """
    Analisa dados SAR (Sentinel-1) para detecção de mudanças,
    monitoramento de inundações e análise de superfície.
    
    Args:
        polygon_coords: Coordenadas do polígono
        start_date: Data inicial
        end_date: Data final
        polarization: Polarização (VV, VH, ou ambas)
    
    Returns:
        Dict com estatísticas SAR e análise
    """
    try:
        coords_ee = [[p['lng'], p['lat']] for p in polygon_coords]
        geometry = ee.Geometry.Polygon([coords_ee])
        
        # Sentinel-1 SAR GRD
        collection = ee.ImageCollection('COPERNICUS/S1_GRD') \
            .filterBounds(geometry) \
            .filterDate(start_date, end_date) \
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', polarization))
        
        # Imagem mediana do período
        median_image = collection.select(polarization).median()
        
        # Calcular estatísticas
        stats = median_image.reduceRegion(
            reducer=ee.Reducer.mean().combine(
                ee.Reducer.min(), '', True
            ).combine(
                ee.Reducer.max(), '', True
            ).combine(
                ee.Reducer.stdDev(), '', True
            ),
            geometry=geometry,
            scale=10,
            maxPixels=1e9
        ).getInfo()
        
        # Análise de variação temporal
        count = collection.size().getInfo()
        
        # Detectar possível inundação (valores muito baixos de backscatter)
        mean_value = stats.get(f'{polarization}_mean', 0)
        flood_threshold = -18  # dB (típico para água)
        possible_flood = mean_value < flood_threshold
        
        return {
            'success': True,
            'data_type': 'SAR',
            'polarization': polarization,
            'unit': 'dB',
            'images_used': count,
            'mean_backscatter': mean_value,
            'min_backscatter': stats.get(f'{polarization}_min'),
            'max_backscatter': stats.get(f'{polarization}_max'),
            'std_dev': stats.get(f'{polarization}_stdDev'),
            'flood_indicator': possible_flood,
            'interpretation': 'Possível área inundada ou com muita água' if possible_flood else 'Superfície seca ou vegetada'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def detect_change_tool(
    polygon_coords: List[Dict[str, float]],
    layer_type: str,
    date_before: str,
    date_after: str
) -> Dict[str, Any]:
    """
    Detecta mudanças entre duas datas para uma camada específica.
    Útil para monitorar desmatamento, urbanização, etc.
    
    Args:
        polygon_coords: Coordenadas do polígono
        layer_type: Tipo de camada (NDVI, LST, etc.)
        date_before: Data anterior
        date_after: Data posterior
    
    Returns:
        Dict com análise de mudanças
    """
    try:
        coords_ee = [[p['lng'], p['lat']] for p in polygon_coords]
        geometry = ee.Geometry.Polygon([coords_ee])
        
        if layer_type == 'NDVI':
            collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            
            # Imagem antes
            img_before = collection.filterDate(date_before, date_before).filterBounds(geometry).first()
            nir_b = img_before.select('B8')
            red_b = img_before.select('B4')
            ndvi_before = nir_b.subtract(red_b).divide(nir_b.add(red_b))
            
            # Imagem depois
            img_after = collection.filterDate(date_after, date_after).filterBounds(geometry).first()
            nir_a = img_after.select('B8')
            red_a = img_after.select('B4')
            ndvi_after = nir_a.subtract(red_a).divide(nir_a.add(red_a))
            
            # Diferença
            difference = ndvi_after.subtract(ndvi_before)
            
            # Estatísticas
            stats = difference.reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    ee.Reducer.min(), '', True
                ).combine(
                    ee.Reducer.max(), '', True
                ),
                geometry=geometry,
                scale=10,
                maxPixels=1e9
            ).getInfo()
            
            mean_change = stats.get('B8_mean', 0)
            
            return {
                'success': True,
                'layer_type': layer_type,
                'date_before': date_before,
                'date_after': date_after,
                'mean_change': mean_change,
                'min_change': stats.get('B8_min'),
                'max_change': stats.get('B8_max'),
                'interpretation': 'Aumento de vegetação' if mean_change > 0.1 else 'Perda de vegetação' if mean_change < -0.1 else 'Sem mudança significativa'
            }
        
        return {'error': f'Detecção de mudança não implementada para {layer_type}'}
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def calculate_urban_heat_island_tool(
    polygon_coords: List[Dict[str, float]],
    date: str
) -> Dict[str, Any]:
    """
    Calcula intensidade de ilha de calor urbana (UHI).
    
    Args:
        polygon_coords: Coordenadas do polígono
        date: Data da análise
    
    Returns:
        Dict com análise de UHI
    """
    try:
        coords_ee = [[p['lng'], p['lat']] for p in polygon_coords]
        geometry = ee.Geometry.Polygon([coords_ee])
        
        # Landsat para dados térmicos
        collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(
            ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
        )
        
        image = collection.filterDate(date, date).filterBounds(geometry).first()
        
        # LST em Celsius
        lst = image.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15)
        
        # Buffer para comparar com área rural próxima
        buffer_geom = geometry.buffer(5000)  # 5km buffer
        
        # LST urbana (dentro do polígono)
        urban_stats = lst.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        ).getInfo()
        
        # LST rural (buffer menos polígono)
        rural_area = buffer_geom.difference(geometry)
        rural_stats = lst.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=rural_area,
            scale=30,
            maxPixels=1e9
        ).getInfo()
        
        urban_temp = urban_stats.get('ST_B10', 0)
        rural_temp = rural_stats.get('ST_B10', 0)
        uhi_intensity = urban_temp - rural_temp
        
        return {
            'success': True,
            'urban_temperature': urban_temp,
            'rural_temperature': rural_temp,
            'uhi_intensity': uhi_intensity,
            'unit': '°C',
            'classification': 'Ilha de calor forte' if uhi_intensity > 3 else 'Ilha de calor moderada' if uhi_intensity > 1.5 else 'Ilha de calor fraca'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def analyze_water_bodies_tool(
    polygon_coords: List[Dict[str, float]],
    date: str
) -> Dict[str, Any]:
    """
    Analisa corpos d'água usando NDWI e identifica áreas úmidas.
    
    Args:
        polygon_coords: Coordenadas do polígono
        date: Data da análise
    
    Returns:
        Dict com análise de água
    """
    try:
        coords_ee = [[p['lng'], p['lat']] for p in polygon_coords]
        geometry = ee.Geometry.Polygon([coords_ee])
        
        # Sentinel-2
        collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        image = collection.filterDate(date, date).filterBounds(geometry).first()
        
        # NDWI = (Green - NIR) / (Green + NIR)
        green = image.select('B3')
        nir = image.select('B8')
        ndwi = green.subtract(nir).divide(green.add(nir))
        
        # Área total do polígono
        total_area = geometry.area().getInfo() / 10000  # em hectares
        
        # Identificar água (NDWI > 0.3)
        water_mask = ndwi.gt(0.3)
        water_area = water_mask.multiply(ee.Image.pixelArea()).reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geometry,
            scale=10,
            maxPixels=1e9
        ).getInfo()
        
        water_ha = water_area.get('B3', 0) / 10000
        water_percentage = (water_ha / total_area) * 100 if total_area > 0 else 0
        
        # Estatísticas NDWI
        ndwi_stats = ndwi.reduceRegion(
            reducer=ee.Reducer.mean().combine(
                ee.Reducer.min(), '', True
            ).combine(
                ee.Reducer.max(), '', True
            ),
            geometry=geometry,
            scale=10,
            maxPixels=1e9
        ).getInfo()
        
        return {
            'success': True,
            'total_area_ha': total_area,
            'water_area_ha': water_ha,
            'water_percentage': water_percentage,
            'ndwi_mean': ndwi_stats.get('B3_mean'),
            'ndwi_min': ndwi_stats.get('B3_min'),
            'ndwi_max': ndwi_stats.get('B3_max'),
            'interpretation': f'{water_percentage:.1f}% da área possui água ou superfície úmida'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


# Registro de ferramentas disponíveis
AVAILABLE_TOOLS = {
    'list_images': {
        'function': list_available_images_tool,
        'description': 'Lista imagens de satélite disponíveis para uma área e período',
        'parameters': ['polygon_coords', 'layer_type', 'start_date', 'end_date']
    },
    'analyze_geojson': {
        'function': analyze_geojson_features_tool,
        'description': 'Analisa features de GeoJSON, com filtros opcionais',
        'parameters': ['geojson_data', 'polygon_coords', 'property_filter']
    },
    'calculate_statistics': {
        'function': calculate_image_statistics_tool,
        'description': 'Calcula estatísticas de uma camada sobre área',
        'parameters': ['polygon_coords', 'layer_type', 'specific_date', 'start_date', 'end_date']
    },
    'analyze_sar': {
        'function': analyze_sar_data_tool,
        'description': 'Analisa dados SAR (Sentinel-1) para detecção de inundações e mudanças',
        'parameters': ['polygon_coords', 'start_date', 'end_date', 'polarization']
    },
    'detect_change': {
        'function': detect_change_tool,
        'description': 'Detecta mudanças entre duas datas (desmatamento, urbanização, etc.)',
        'parameters': ['polygon_coords', 'layer_type', 'date_before', 'date_after']
    },
    'calculate_uhi': {
        'function': calculate_urban_heat_island_tool,
        'description': 'Calcula intensidade de ilha de calor urbana',
        'parameters': ['polygon_coords', 'date']
    },
    'analyze_water': {
        'function': analyze_water_bodies_tool,
        'description': 'Analisa corpos d\'água e áreas úmidas',
        'parameters': ['polygon_coords', 'date']
    }
}
