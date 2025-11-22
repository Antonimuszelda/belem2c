import { useEffect, useRef, useState, Component } from "react";
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import "./App.css";
import ChatPanel from "./components/ChatPanel";
import Loading3D from "./components/Loading3D";
import IntroSlides from "./components/IntroSlides";
import HyperspaceTransition from "./components/HyperspaceTransition";
import BeeTutorial from "./components/BeeTutorial";

// Mapbox Token
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5kcmV3b2J4IiwiYSI6ImNtMWh2MXZ5eDBqNnQyeG9za2R1N2lwc2YifQ.7yCrlwa4nNFKpg2TcQoFQg';

// Error Boundary simples
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0e27',
          color: '#00e5ff',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h1>Carregando HARP-IA...</h1>
          <div className="spinner" style={{ width: '50px', height: '50px' }}></div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Tipos
type Coordinate = { lat: number; lng: number };
type LayerType = "SENTINEL2_RGB" | "LANDSAT_RGB" | "SENTINEL1_VV" | "SENTINEL1_VH" | "NDVI" | "NDWI" | "LST_SAR" | "UHI_SAR" | "UTFVI_SAR" | "DEM";
type ActiveLayers = Partial<Record<LayerType, string>>;
type ImageItem = { date: string; cloud_cover: number; satellite: string };

const API_BASE = (import.meta as any).env.VITE_API_URL || "http://127.0.0.1:8000";

// Detectar dispositivos touch
const isTouchDevice = () => {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0) ||
     ((navigator as any).msMaxTouchPoints > 0));
};

// Funções Utilitárias
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Função para detectar tipo de dispositivo
type DeviceType = 'mobile' | 'tablet' | 'desktop';

function getDeviceType(): DeviceType {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';      // Celular: < 768px
  if (width < 1024) return 'tablet';     // Tablet: 768px - 1024px
  return 'desktop';                       // Desktop: > 1024px
}

// Componente Principal
export default function App() {
  // Detectar tipo de dispositivo automaticamente
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType());
  const [isTouch] = useState(isTouchDevice());
  
  // Listener para mudanças de tamanho de tela
  useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Navigation state
  const [appState, setAppState] = useState<'loading1' | 'slides' | 'hyperspace' | 'app' | 'tutorial'>('loading1');
  const [showTutorial, setShowTutorial] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  
  const [polygon, setPolygon] = useState<Coordinate[]>([]);
  const [startDate, setStartDate] = useState(daysAgoStr(365));
  const [endDate, setEndDate] = useState(todayStr());
  const [cloud, setCloud] = useState(30);
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>({});
  const [layerOpacity, setLayerOpacity] = useState<Record<LayerType, number>>({
    SENTINEL2_RGB: 1.0,
    LANDSAT_RGB: 1.0,
    SENTINEL1_VV: 0.8,
    SENTINEL1_VH: 0.8,
    NDVI: 0.7,
    NDWI: 0.7,
    LST_SAR: 0.7,
    UHI_SAR: 0.8,
    UTFVI_SAR: 0.8,
    DEM: 0.6,
  });
  const [geojsonLayerData, setGeojsonLayerData] = useState<any>(null);
  const [showImageListModal, setShowImageListModal] = useState(false);
  const [imageList, setImageList] = useState<ImageItem[]>([]);
  const [selectedLayerType, setSelectedLayerType] = useState<LayerType | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'mosaicos'>('lista');
  const [mosaics, setMosaics] = useState<Array<{dates: string[], startDate: string, endDate: string}>>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [is3DMode, setIs3DMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(deviceType === 'mobile');
  const [drawMode, setDrawMode] = useState(false);
  
  // Atualizar estado do sidebar quando deviceType mudar
  useEffect(() => {
    if (deviceType === 'mobile') {
      setSidebarCollapsed(true); // Mobile começa colapsado
    } else {
      setSidebarCollapsed(false); // Tablet e Desktop começam expandidos
    }
  }, [deviceType]);

  // Função para formatar popups do GeoJSON
  const formatGeoJSONPopup = (properties: any): string => {
    const translations: Record<string, string> = {
      'cd_fcu': 'Código', 'nm_fcu': 'Nome', 'cd_uf': 'Código UF', 'nm_uf': 'Estado',
      'sigla_uf': 'UF', 'cd_mun': 'Código Município', 'nm_mun': 'Município',
      'nommunic': 'Município', 'codagsn': 'Código', 'nome_agsn': 'Nome',
      'complement': 'Complemento', 'ano_ref': 'Ano Referência', 'ano_censo': 'Ano Censo',
      'CD_MUN': 'Código Município', 'NM_MUN': 'Município', 'SIGLA_UF': 'UF', 'AREA_KM2': 'Área (km²)',
    };

    const title = properties.nm_fcu || properties.nome_agsn || properties.NM_MUN || properties.nm_mun || 'Área';
    let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">`;
    html += `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px; font-weight: bold;">🏘️ ${title}</div>`;
    
    Object.entries(properties).forEach(([key, value]) => {
      if (value != null && value !== '' && !['nm_fcu', 'nome_agsn', 'NM_MUN'].includes(key)) {
        const label = translations[key] || key;
        html += `<div style="padding: 5px; border-bottom: 1px solid #eee;"><strong>${label}:</strong> ${value}</div>`;
      }
    });
    
    html += `</div>`;
    return html;
  };

  // Navigation flow
  useEffect(() => {
    if (appState === 'loading1') {
      const timer = setTimeout(() => setAppState('slides'), 3000);
      return () => clearTimeout(timer);
    } else if (appState === 'hyperspace') {
      const timer = setTimeout(() => setAppState('app'), 2500);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  const handleSlidesComplete = () => {
    setAppState('hyperspace');
    setTimeout(() => {
      setShowTutorial(true);
      setAppState('app');
    }, 3000);
  };

  // Sidebar começa expandida em mobile para ser visível

  // Inicializar Mapbox
  useEffect(() => {
    if (appState !== 'app' || !mapContainer.current || map.current) return;

    // Usar a detecção mobile já feita no estado
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-47.93, -15.78],
      zoom: deviceType === 'mobile' ? 3 : 4,
      pitch: 0,
      bearing: 0,
      antialias: deviceType !== 'mobile',
      attributionControl: false,
      preserveDrawingBuffer: false,
      refreshExpiredTiles: false,
      maxZoom: deviceType === 'mobile' ? 18 : 20,
      touchPitch: false,
      touchZoomRotate: true,
      dragRotate: deviceType !== 'mobile',
      dragPan: true,
      fadeDuration: 0,
      crossSourceCollisions: false
    });
    
    // Garantir que todas as interações estão habilitadas
    map.current.dragPan.enable();
    if (deviceType !== 'mobile') {
      map.current.dragRotate.enable();
    }
    
    // Desabilitar interações que causam conflito durante desenho
    if (deviceType === 'mobile') {
      map.current.boxZoom.disable();
      map.current.doubleClickZoom.disable();
    }

    // Adicionar controles otimizados para mobile
    if (deviceType !== 'mobile') {
      const nav = new mapboxgl.NavigationControl({ visualizePitch: true });
      map.current.addControl(nav, 'top-right');
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right');
    } else {
      // Controles simplificados para mobile
      const nav = new mapboxgl.NavigationControl({ 
        showCompass: false, 
        showZoom: true, 
        visualizePitch: false 
      });
      map.current.addControl(nav, 'top-right');
    }
    
    // Fullscreen apenas em mobile
    if (deviceType === 'mobile') {
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-left');
    }

    // Adicionar Draw control otimizado para touch
    
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
      touchEnabled: true,
      touchBuffer: deviceType === 'mobile' ? 25 : 12,
      clickBuffer: deviceType === 'mobile' ? 20 : 5,
      // Estilos simplificados para melhor performance
      styles: [
        {
          'id': 'gl-draw-polygon-fill-inactive',
          'type': 'fill',
          'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          'paint': {
            'fill-color': '#00e5ff',
            'fill-opacity': 0.2
          }
        },
        {
          'id': 'gl-draw-polygon-fill-active',
          'type': 'fill',
          'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          'paint': {
            'fill-color': '#00e5ff',
            'fill-opacity': 0.15
          }
        },
        {
          'id': 'gl-draw-polygon-stroke-inactive',
          'type': 'line',
          'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          'paint': {
            'line-color': '#00e5ff',
            'line-width': 2
          }
        },
        {
          'id': 'gl-draw-polygon-stroke-active',
          'type': 'line',
          'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          'paint': {
            'line-color': '#00e5ff',
            'line-width': deviceType === 'mobile' ? 5 : 3
          }
        },
        {
          'id': 'gl-draw-line-inactive',
          'type': 'line',
          'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString']],
          'paint': {
            'line-color': '#00e5ff',
            'line-width': 2
          }
        },
        {
          'id': 'gl-draw-line-active',
          'type': 'line',
          'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
          'paint': {
            'line-color': '#00e5ff',
            'line-width': deviceType === 'mobile' ? 4 : 3
          }
        },
        {
          'id': 'gl-draw-polygon-and-line-vertex-inactive',
          'type': 'circle',
          'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['==', 'active', 'false']],
          'paint': {
            'circle-radius': deviceType === 'mobile' ? 8 : 5,
            'circle-color': '#fff'
          }
        },
        {
          'id': 'gl-draw-polygon-and-line-vertex-active',
          'type': 'circle',
          'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['==', 'active', 'true']],
          'paint': {
            'circle-radius': deviceType === 'mobile' ? 12 : 7,
            'circle-color': '#00e5ff'
          }
        }
      ]
    });
    map.current.addControl(draw.current as any, 'top-left');

    // Event listeners para desenho com debounce para prevenir travamentos
    let updateTimeout: number;
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = window.setTimeout(() => updatePolygon(), 100);
    };
    
    // Ao criar polígono, voltar para modo seleção
    map.current.on('draw.create', () => {
      updatePolygon();
      // Sair do modo desenho automaticamente
      setTimeout(() => {
        if (draw.current && map.current) {
          const canvas = map.current.getCanvasContainer();
          draw.current.changeMode('simple_select');
          map.current.dragPan.enable();
          map.current.touchZoomRotate.enable();
          canvas.classList.remove('mode-draw');
          setDrawMode(false);
        }
      }, 100);
    });
    
    map.current.on('draw.update', debouncedUpdate);
    map.current.on('draw.delete', () => setPolygon([]));

    // Quando carregar, adicionar terreno 3D e prédios 3D (se não for mobile)
    map.current.on('load', () => {
      if (!map.current) return;
      
      // Terreno 3D apenas em desktop para melhor performance
      if (deviceType !== 'mobile') {
        map.current.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
        
        // Configurar terreno 3D (inicialmente pitch 0, mas terreno habilitado)
        map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      }
      
      // Adicionar layer de sky para melhor visual 3D
      map.current.addLayer({
        'id': 'sky',
        'type': 'sky',
        'paint': {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });

      // Adicionar prédios 3D (casinhas) - apenas em desktop
      if (deviceType !== 'mobile') {
        const layers = map.current.getStyle().layers;
        const labelLayerId = layers.find(
          (layer: any) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
        )?.id;

        map.current.addLayer(
          {
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );
      }
      
      // Otimizações de performance para mobile
      if (deviceType === 'mobile' && map.current) {
        map.current.setRenderWorldCopies(false);
      }
      
      // Adicionar indicador visual quando mapa está processando
      if (map.current) {
        map.current.on('dataloading', () => {
          if (mapContainer.current) {
            mapContainer.current.style.cursor = 'wait';
          }
        });
        
        map.current.on('idle', () => {
          if (mapContainer.current) {
            mapContainer.current.style.cursor = '';
          }
        });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [appState]);

  // Função para atualizar polígono
  const updatePolygon = () => {
    if (!draw.current) return;
    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const coords = (data.features[0].geometry as any).coordinates[0].map(
        ([lng, lat]: [number, number]) => ({ lat, lng })
      );
      setPolygon(coords);
      setActiveLayers({}); // Limpa camadas ao desenhar novo polígono
    }
  };

  // Toggle Draw Mode
  const toggleDrawMode = () => {
    if (!draw.current || !map.current) return;
    
    const canvas = map.current.getCanvasContainer();
    
    if (drawMode) {
      // Desativar modo desenho
      draw.current.changeMode('simple_select');
      map.current.dragPan.enable();
      map.current.touchZoomRotate.enable();
      canvas.classList.remove('mode-draw');
      setDrawMode(false);
    } else {
      // Desativar 3D se estiver ativo (conflito)
      if (is3DMode) {
        map.current.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 500
        });
        setIs3DMode(false);
      }
      
      // Ativar modo desenho
      draw.current.changeMode('draw_polygon');
      map.current.dragPan.disable();
      canvas.classList.add('mode-draw');
      setDrawMode(true);
    }
  };

  // Toggle 3D Mode
  const toggle3DMode = () => {
    if (!map.current) return;
    
    // Se estiver em modo desenho, desativar primeiro
    if (drawMode && draw.current) {
      const canvas = map.current.getCanvasContainer();
      draw.current.changeMode('simple_select');
      map.current.dragPan.enable();
      canvas.classList.remove('mode-draw');
      setDrawMode(false);
    }
    
    if (is3DMode) {
      // Voltar para 2D
      map.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000
      });
      setIs3DMode(false);
    } else {
      // Ativar 3D com pitch reduzido em mobile para performance
      const targetPitch = deviceType === 'mobile' ? 45 : 60;
      
      // Garantir que dragPan e dragRotate estão habilitados para 3D
      map.current.dragPan.enable();
      if (deviceType !== 'mobile') {
        map.current.dragRotate.enable();
      }
      
      map.current.easeTo({
        pitch: targetPitch,
        bearing: 0,
        duration: 1000
      });
      setIs3DMode(true);
    }
  };

  // Atualizar opacidade das camadas
  useEffect(() => {
    if (!map.current) return;
    Object.entries(activeLayers).forEach(([type, url]) => {
      if (url && map.current?.getLayer(`layer-${type}`)) {
        map.current.setPaintProperty(`layer-${type}`, 'raster-opacity', layerOpacity[type as LayerType]);
      }
    });
  }, [layerOpacity, activeLayers]);

  // Adicionar camadas ao mapa
  useEffect(() => {
    if (!map.current) return;

    // Remover camadas antigas que não estão mais ativas
    const currentLayers = Object.keys(activeLayers);
    const mapLayers = map.current.getStyle()?.layers || [];
    
    mapLayers.forEach((layer: any) => {
      if (layer.id.startsWith('layer-') && !currentLayers.includes(layer.id.replace('layer-', ''))) {
        if (map.current?.getSource(layer.id.replace('layer-', 'source-'))) {
          map.current.removeLayer(layer.id);
          map.current.removeSource(layer.id.replace('layer-', 'source-'));
        }
      }
    });

    // Adicionar novas camadas
    Object.entries(activeLayers).forEach(([type, url]) => {
      if (!url || !map.current) return;
      
      const sourceId = `source-${type}`;
      const layerId = `layer-${type}`;
      
      if (!map.current.getSource(sourceId)) {
        // Para Mapbox, não precisamos encode - usar URL diretamente
        map.current.addSource(sourceId, {
          type: 'raster',
          tiles: [url],
          tileSize: 256,
          scheme: 'xyz',
          maxzoom: 18
        });
        
        // Inserir layer antes dos prédios 3D se existir
        const layers = map.current.getStyle().layers;
        const buildingLayer = layers.find((layer: any) => layer.id === '3d-buildings');
        
        map.current.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': layerOpacity[type as LayerType],
            'raster-fade-duration': 0
          }
        }, buildingLayer ? '3d-buildings' : undefined);
      }
    });
  }, [activeLayers]);

  // Adicionar GeoJSON ao mapa
  useEffect(() => {
    if (!map.current || !geojsonLayerData) return;

    const sourceId = 'geojson-source';
    const layerId = 'geojson-layer';

    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojsonLayerData);
    } else {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: geojsonLayerData
      });

      map.current.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#667eea',
          'fill-opacity': 0.2
        }
      });

      map.current.addLayer({
        id: `${layerId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#667eea',
          'line-width': 2
        }
      });

      // Adicionar popups
      map.current.on('click', layerId, (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(formatGeoJSONPopup(props))
          .addTo(map.current!);
      });

      map.current.on('mouseenter', layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    }
  }, [geojsonLayerData]);

  // Funções de controle (mesmas do código original)
  const generateMosaics = (images: ImageItem[]) => {
    const mosaicList: Array<{dates: string[], startDate: string, endDate: string}> = [];
    const sortedImages = [...images].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let currentMosaic: string[] = [];
    let mosaicStartDate = '';
    
    for (let i = 0; i < sortedImages.length; i++) {
      const currentDate = new Date(sortedImages[i].date);
      
      if (currentMosaic.length === 0) {
        currentMosaic = [sortedImages[i].date];
        mosaicStartDate = sortedImages[i].date;
      } else {
        const lastDate = new Date(currentMosaic[currentMosaic.length - 1]);
        const diffMonths = (currentDate.getFullYear() - lastDate.getFullYear()) * 12 + 
                          (currentDate.getMonth() - lastDate.getMonth());
        
        if (diffMonths <= 2 && currentMosaic.length < 15) {
          currentMosaic.push(sortedImages[i].date);
        } else {
          if (currentMosaic.length >= 10) {
            mosaicList.push({
              dates: [...currentMosaic],
              startDate: mosaicStartDate,
              endDate: currentMosaic[currentMosaic.length - 1]
            });
          }
          currentMosaic = [sortedImages[i].date];
          mosaicStartDate = sortedImages[i].date;
        }
      }
    }
    
    if (currentMosaic.length >= 10) {
      mosaicList.push({
        dates: [...currentMosaic],
        startDate: mosaicStartDate,
        endDate: currentMosaic[currentMosaic.length - 1]
      });
    }
    
    return mosaicList;
  };

  const handleToggleLayer = async (layerType: LayerType) => {
    if (activeLayers[layerType]) {
      setActiveLayers(prev => {
        const newLayers = { ...prev };
        delete newLayers[layerType];
        return newLayers;
      });
      return;
    }

    if (polygon.length < 3) {
      alert("Primeiro, desenhe um polígono ou carregue uma área de interesse.");
      return;
    }

    setLoading(prev => ({ ...prev, [layerType]: true }));
    try {
      const body = { polygon, start_date: startDate, end_date: endDate, layer_type: layerType, cloud_percentage: cloud };
      
      const res = await fetch(`${API_BASE}/api/list_images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);
      const data = await res.json();
      
      if (data.images && data.images.length > 0) {
        setImageList(data.images);
        setSelectedLayerType(layerType);
        const generatedMosaics = generateMosaics(data.images);
        setMosaics(generatedMosaics);
        setShowImageListModal(true);
      } else {
        alert(`Nenhuma imagem encontrada para ${layerType} no período selecionado.`);
      }
    } catch (e: any) {
      alert(`Erro ao buscar imagens para ${layerType}: ${e.message || e}`);
    } finally {
      setLoading(prev => ({ ...prev, [layerType]: false }));
    }
  };

  const handleLoadSpecificImage = async (date: string) => {
    if (!selectedLayerType) return;
    
    setLoading(prev => ({ ...prev, [selectedLayerType]: true }));
    setShowImageListModal(false);
    
    try {
      const endpoint = selectedLayerType === 'DEM' ? '/api/get_dem' : '/api/get_tile';
      const body = selectedLayerType === 'DEM' 
        ? { polygon } 
        : { polygon, start_date: startDate, end_date: endDate, layer_type: selectedLayerType, cloud_percentage: cloud, specific_date: date };
      
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);
      const data = await res.json();
      const url = data.tileUrl || data.tile_url;
      
      setActiveLayers(prev => ({ ...prev, [selectedLayerType]: url }));

    } catch (e: any) {
      alert(`Erro ao carregar imagem de ${date}: ${e.message || e}`);
    } finally {
      setLoading(prev => ({ ...prev, [selectedLayerType!]: false }));
    }
  };

  const handleClear = () => {
    setPolygon([]);
    setActiveLayers({});
    setGeojsonLayerData(null);
    if (draw.current) {
      draw.current.deleteAll();
    }
    if (map.current) {
      map.current.flyTo({ center: [-47.93, -15.78], zoom: 4 });
    }
  };

  const handleLoadCommunities = async () => {
    if (polygon.length < 3) {
      alert("Primeiro, desenhe um polígono para delimitar a área.");
      return;
    }
    
    setLoading(prev => ({ ...prev, geojson: true }));
    
    try {
      const fileNames = ['FCUs_BR.json', 'geopackages_n_setorizadas.json', 'qg_2022_670_fcu_agreg.json', 'setores_censitarios.json'];
      const allFeatures: any[] = [];
      
      for (const fileName of fileNames) {
        try {
          const payload = { filename: fileName, polygon: polygon };
          const url = `${API_BASE}/api/geojson/render_layer`;
          
          const res = await fetch(url, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            mode: 'cors'
          });
          
          if (res.ok) {
            const geojsonData = await res.json();
            if (geojsonData.features && geojsonData.features.length > 0) {
              allFeatures.push(...geojsonData.features);
            }
          }
        } catch (fileError: any) {
          console.error(`Erro ao processar ${fileName}:`, fileError);
        }
      }
      
      if (allFeatures.length > 0) {
        const combinedGeoJSON = {
          type: 'FeatureCollection',
          features: allFeatures
        };
        setGeojsonLayerData(combinedGeoJSON);
        alert(`✅ ${allFeatures.length} favelas/comunidades encontradas na área delimitada.`);
      } else {
        alert("Nenhuma favela/comunidade encontrada na área delimitada.");
      }
      
    } catch (e: any) {
      alert(`Erro ao carregar favelas: ${e.message || e}`);
    } finally {
      setLoading(prev => ({ ...prev, geojson: false }));
    }
  };

  const isAnythingLoading = Object.values(loading).some(v => v);

  // Render based on app state
  if (appState === 'loading1') {
    return (
      <ErrorBoundary>
        <Loading3D message="Inicializando Sistema HARP-IA..." />
      </ErrorBoundary>
    );
  }

  if (appState === 'slides') {
    return (
      <ErrorBoundary>
        <IntroSlides onComplete={handleSlidesComplete} />
      </ErrorBoundary>
    );
  }

  if (appState === 'hyperspace') {
    return (
      <ErrorBoundary>
        <HyperspaceTransition />
      </ErrorBoundary>
    );
  }

  // Main app
  return (
    <div className={`app ${isTouch ? 'touch-device' : 'desktop-device'} device-${deviceType}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        
        {/* Botão toggle - aparece em mobile e tablet */}
        {(deviceType === 'mobile' || deviceType === 'tablet') && (
          <button 
            className="sidebar-toggle-mobile" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ flexShrink: 0 }}
          >
            <i className={`icofont-${sidebarCollapsed ? 'rounded-down' : 'rounded-up'}`}></i>
            {sidebarCollapsed ? ' Expandir Painel' : ' Minimizar Painel'}
          </button>
        )}
        
        <header className="sidebar-header">
          <h1>HARP-IA</h1>
          <p>Análise Geoespacial com IA</p>
        </header>

        <div className="sidebar-content">
          <div className="control-group date-controls">
            <h3><i className="icofont-ui-calendar"></i> Período</h3>
            <div className="group">
              <label>Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isAnythingLoading} />
            </div>
            <div className="group">
              <label>Fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isAnythingLoading} />
            </div>
          </div>

          <div className="control-group cloud-filter">
            <h3><i className="icofont-cloud"></i> Filtro</h3>
            <div className="group">
              <label>Cobertura de Nuvem ({cloud}%)</label>
              <input type="range" min={0} max={100} value={cloud} onChange={(e) => setCloud(Number(e.target.value))} disabled={isAnythingLoading} />
            </div>
          </div>

          <div className="control-group">
            <h3><i className="icofont-layers"></i> Camadas</h3>
            <div className="layers-grid">
              {(Object.keys(layerDefs) as LayerType[]).map(key => (
                <div key={key} className="layer-item">
                  <button 
                    className={`layer-btn ${activeLayers[key] ? 'active' : ''}`} 
                    onClick={() => handleToggleLayer(key)} 
                    disabled={!!loading[key]}
                    data-layer={key}
                  >
                    {loading[key] ? <div className="spinner" /> : <i className={layerDefs[key].icon} />}
                    <span>{layerDefs[key].name}</span>
                  </button>
                  {activeLayers[key] && (
                    <div className="opacity-control">
                      <label>Opacidade: {Math.round(layerOpacity[key] * 100)}%</label>
                      <input 
                        type="range" 
                        min={0} 
                        max={100} 
                        value={layerOpacity[key] * 100} 
                        onChange={(e) => setLayerOpacity(prev => ({ ...prev, [key]: Number(e.target.value) / 100 }))}
                        className="opacity-slider"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="control-group">
            <h3><i className="icofont-map-pins"></i> Dados Geográficos</h3>
            <button 
              className="btn-communities" 
              onClick={handleLoadCommunities}
              disabled={polygon.length < 3 || !!loading.geojson}
              style={{ width: '100%' }}
            >
              <i className="icofont-home"></i> {loading.geojson ? 'Carregando...' : 'Carregar Favelas e Comunidades'}
            </button>
          </div>

        </div>

        <footer className="sidebar-footer">
          <button 
            className="btn-draw" 
            onClick={toggleDrawMode}
            style={{
              width: '100%',
              marginBottom: '10px',
              background: drawMode ? 'linear-gradient(135deg, #00e5ff 0%, #00b8d4 100%)' : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <i className={drawMode ? 'icofont-check-circled' : 'icofont-ui-edit'}></i> 
            {drawMode ? 'Finalizar Desenho' : 'Desenhar Polígono'}
          </button>
          <button 
            className="btn-3d" 
            onClick={toggle3DMode}
            style={{
              width: '100%',
              marginBottom: '10px',
              background: is3DMode ? 'linear-gradient(135deg, #00e5ff 0%, #00b8d4 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            <i className="icofont-cube"></i> {is3DMode ? 'Modo 2D' : 'Modo 3D'}
          </button>
          <button className="btn-ai chat-toggle" onClick={() => setChatOpen(true)} disabled={polygon.length < 3}>
            <i className="icofont-robot"></i> Chat com IA
          </button>
          <button className="btn-clear" onClick={handleClear} disabled={isAnythingLoading}>
            Limpar Tudo
          </button>
        </footer>
      </aside>

      <main className="main-content">
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      </main>

      {showImageListModal && selectedLayerType && (
        <div className="ai-modal-overlay" onClick={() => { setShowImageListModal(false); setActiveTab('lista'); }}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: isTouch ? '90%' : '700px' }}>
            <div className="ai-modal-header">
              <h2><i className="icofont-satellite"></i> Imagens - {layerDefs[selectedLayerType].name}</h2>
              <button className="close-btn" onClick={() => { setShowImageListModal(false); setActiveTab('lista'); }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', borderBottom: '2px solid var(--neon-cyan)', marginBottom: '15px', gap: '10px' }}>
              <button onClick={() => setActiveTab('lista')} style={{
                flex: 1, padding: '12px', background: activeTab === 'lista' ? 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)' : 'transparent',
                border: 'none', borderBottom: activeTab === 'lista' ? '3px solid var(--neon-cyan)' : '3px solid transparent',
                color: activeTab === 'lista' ? 'var(--neon-cyan)' : '#aaa', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
              }}>
                📋 Lista ({imageList.length})
              </button>
              <button onClick={() => setActiveTab('mosaicos')} style={{
                flex: 1, padding: '12px', background: activeTab === 'mosaicos' ? 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)' : 'transparent',
                border: 'none', borderBottom: activeTab === 'mosaicos' ? '3px solid var(--neon-green)' : '3px solid transparent',
                color: activeTab === 'mosaicos' ? 'var(--neon-green)' : '#aaa', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
              }}>
                🗂️ Mosaicos ({mosaics.length})
              </button>
            </div>

            <div className="ai-content" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {activeTab === 'lista' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {imageList.map((img, idx) => (
                    <button key={idx} onClick={() => handleLoadSpecificImage(img.date)} style={{
                      padding: '12px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                      border: '1px solid var(--neon-cyan)', borderRadius: '8px', color: '#fff',
                      cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>📅 {img.date}</div>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>{img.satellite} • Nuvens: {img.cloud_cover}%</div>
                      </div>
                      <i className="icofont-download" style={{ fontSize: '20px', color: 'var(--neon-green)' }}></i>
                    </button>
                  ))}
                </div>
              ) : (
                mosaics.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {mosaics.map((mosaic, idx) => (
                      <div key={idx} style={{
                        padding: '15px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        border: '2px solid var(--neon-green)', borderRadius: '12px', color: '#fff'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--neon-green)', marginBottom: '5px' }}>
                              🗂️ Mosaico #{idx + 1} ({mosaic.dates.length} imagens)
                            </h3>
                            <div style={{ fontSize: '14px', color: '#aaa' }}>📅 {mosaic.startDate} até {mosaic.endDate}</div>
                          </div>
                          <button
                            onClick={async () => {
                              if (!selectedLayerType) return;
                              setLoading(prev => ({ ...prev, [selectedLayerType]: true }));
                              try {
                                // Carregar mosaico usando o endpoint de mosaico
                                const res = await fetch(`${API_BASE}/api/get_tile/${selectedLayerType}`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    polygon,
                                    start_date: mosaic.startDate,
                                    end_date: mosaic.endDate,
                                    is_mosaic: true
                                  })
                                });
                                
                                if (!res.ok) {
                                  throw new Error(`Erro ao carregar mosaico: ${res.status}`);
                                }
                                
                                const data = await res.json();
                                if (data.tile_url) {
                                  setActiveLayers(prev => ({ ...prev, [selectedLayerType]: data.tile_url }));
                                  setShowImageListModal(false);
                                  alert(`✅ Mosaico #${idx + 1} carregado com sucesso!`);
                                } else {
                                  throw new Error('URL do mosaico não retornada');
                                }
                              } catch (error: any) {
                                alert(`Erro ao carregar mosaico: ${error.message}`);
                              } finally {
                                setLoading(prev => ({ ...prev, [selectedLayerType]: false }));
                              }
                            }}
                            style={{
                              padding: '10px 20px',
                              background: 'linear-gradient(135deg, #00e5ff 0%, #00b8d4 100%)',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#000',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'transform 0.2s ease',
                              boxShadow: '0 4px 15px rgba(0, 229, 255, 0.4)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            <i className="icofont-download" style={{ fontSize: '18px' }}></i>
                            Carregar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                    <p>Nenhum mosaico gerado. Necessário pelo menos 10 imagens.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <ChatPanel 
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        polygon={polygon}
        activeLayers={activeLayers}
        geojsonLayerData={geojsonLayerData}
        startDate={startDate}
        endDate={endDate}
      />
      
      {showTutorial && (
        <BeeTutorial 
          onComplete={() => setShowTutorial(false)}
          onSkip={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
}

// Definições das camadas
const layerDefs: Record<LayerType, { name: string; icon: string }> = {
  SENTINEL2_RGB: { name: "Sentinel-2 (RGB)", icon: "icofont-satellite" },
  LANDSAT_RGB: { name: "Landsat (RGB)", icon: "icofont-satellite-alt" },
  SENTINEL1_VV: { name: "SAR VV (Vertical)", icon: "icofont-radar" },
  SENTINEL1_VH: { name: "SAR VH (Cruzada)", icon: "icofont-radio-active" },
  NDVI: { name: "Vegetação (NDVI)", icon: "icofont-leaf" },
  NDWI: { name: "Água (NDWI)", icon: "icofont-water-drop" },
  LST_SAR: { name: "🛰️ Temperatura SAR", icon: "icofont-thermometer-alt" },
  UHI_SAR: { name: "🛰️ Ilha de Calor SAR", icon: "icofont-fire-burn" },
  UTFVI_SAR: { name: "🛰️ Variação Térmica SAR", icon: "icofont-chart-bar-graph" },
  DEM: { name: "Elevação (DEM)", icon: "icofont-mountain" },
};
