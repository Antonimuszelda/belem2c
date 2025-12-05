import { useEffect, useRef, useState, Component } from "react";
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import "./App.css";
import "./components/FloatingActions.css";
import ChatPanel from "./components/ChatPanel";
import Loading3D from "./components/Loading3D";
import IntroSlides from "./components/IntroSlides";
import HyperspaceTransition from "./components/HyperspaceTransition";
import LiveWeatherWidget from "./components/LiveWeatherWidget";
import GPSButton from "./components/GPSButton";
import LayerControlSidebar from "./components/LayerControlSidebar";
import type { LayerConfig } from "./components/LayerControlSidebar";
import AIAnalystModal from "./components/AIAnalystModal";
import ComparisonSlider from "./components/ComparisonSlider";
import TimeSeriesChart from "./components/TimeSeriesChart";
import type { TimeSeriesData } from "./components/TimeSeriesChart";
import TimelapsePlayer from "./components/TimelapsePlayer";
import WindMap from "./components/WindMap";
import { audioService } from "./services/AudioService";
import { CacheService } from "./services/CacheService";
import { AnalyticsService } from "./services/AnalyticsService";
import { NotificationService } from "./services/NotificationService";
import { PDFExportService } from "./services/PDFExportService";
import { VulnerabilityCalculator } from "./services/VulnerabilityCalculator";
import type { VulnerabilityFactors } from "./services/VulnerabilityCalculator";

// Mapbox Token
mapboxgl.accessToken = 'pk.eyJ1IjoiYXN0cm9tYXBzIiwiYSI6ImNtaWFhdmFqZDB3bjMybG9hcnJ3aXVxZ2sifQ.75cnJYD49-JkLGIOLMSjwg';

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
type LayerType = "SENTINEL2_RGB" | "SENTINEL2_FALSE_COLOR" | "LANDSAT_RGB" | "SENTINEL1_VV" | "NDVI" | "NDWI" | "LST" | "UHI" | "UTFVI" | "DEM";
type ActiveLayers = Partial<Record<LayerType, string>>;

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
  const [appState, setAppState] = useState<'loading1' | 'slides' | 'hyperspace' | 'app'>('loading1');
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  
  const [polygon, setPolygon] = useState<Coordinate[]>([]);
  const [polygonLocked, setPolygonLocked] = useState(false); // Bloquear polígono após finalizar
  const [startDate] = useState(daysAgoStr(365));
  const [endDate] = useState(todayStr());
  const [cloud] = useState(5);
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>({});
  const [layerOpacity, setLayerOpacity] = useState<Record<string, number>>({
    SENTINEL2_RGB: 1.0,
    SENTINEL2_FALSE_COLOR: 1.0,
    URBANIZATION: 1.0,
    LANDSAT_RGB: 1.0,
    SENTINEL1_VV: 0.8,
    NDVI: 0.7,
    NDWI: 0.7,
    LST: 0.7,
    UHI: 0.8,
    UTFVI: 0.8,
    DEM: 0.6,
    favelas: 0.7,
  });
  const [geojsonLayerData, setGeojsonLayerData] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [is3DMode, setIs3DMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(deviceType === 'mobile');
  const [drawMode, setDrawMode] = useState(false);
  
  // Novos estados para interface futurística
  const [mapCenter, setMapCenter] = useState({ lat: 0, lon: 0 }); // Começa neutro, será atualizado por geolocalização
  const [showAIAnalyst, setShowAIAnalyst] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showTimeSeries, setShowTimeSeries] = useState(false);
  const [showTimeSeriesConfig, setShowTimeSeriesConfig] = useState(false);
  const [timeSeriesPeriod, setTimeSeriesPeriod] = useState<'30d' | '90d' | '1y'>('30d');
  const [timeSeriesDataType, setTimeSeriesDataType] = useState<'all' | 'temperature' | 'vegetation' | 'water'>('all');
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [showWindMap, setShowWindMap] = useState(false);
  const [timelapseFrames, _setTimelapseFrames] = useState<Array<{date: string; imageUrl: string; thumbnail?: string}>>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [vulnerabilityData, setVulnerabilityData] = useState<VulnerabilityFactors | null>(null);
  const [layerConfigs, setLayerConfigs] = useState<LayerConfig[]>([
    // SOCIOECONÔMICO
    { id: 'favelas', name: 'Comunidades Vulneráveis', icon: '👥', description: 'Fonte: IBGE (GeoJSON)', enabled: false, category: 'socioeconomico' },

    // URBANO
    { id: 'URBANIZATION', name: 'Urbanização', icon: '🏙️', description: 'Sentinel-2 False Color (Planetary Computer)', enabled: false, category: 'urbano' },

    // AMBIENTAL + CLIMÁTICO (unificado)
    { id: 'SENTINEL1_VV', name: 'Radar de Superfície (SAR)', icon: '📡', description: 'Radar Sentinel-1 (atravessa nuvens)', enabled: false, category: 'ambiental' },
    { id: 'NDVI', name: 'Saúde da Vegetação', icon: '🌿', description: 'Índice NDVI atualizado', enabled: false, category: 'ambiental' },
    { id: 'LST', name: 'Temperatura de Superfície', icon: '🔥', description: 'Landsat 8/9 térmico (30m)', enabled: false, category: 'ambiental' },
    { id: 'UHI', name: 'Ilha de Calor Urbana', icon: '🏙️', description: 'Urban Heat Island normalizada', enabled: false, category: 'ambiental' },
    { id: 'UTFVI', name: 'Variação Térmica Urbana', icon: '🌡️', description: 'Urban Thermal Field Variance Index', enabled: false, category: 'ambiental' },
    { id: 'NDWI', name: 'Água & Alagamento', icon: '💧', description: 'Sensoriamento de água livre', enabled: false, category: 'ambiental' },

    // ELEVAÇÃO
    { id: 'DEM', name: 'Topografia (DEM)', icon: '⛰️', description: 'Modelo SRTM 30m', enabled: false, category: 'elevacao' },
  ]);

  const GEOJSON_LAYERS: Record<string, { filename: string; cacheTtlMinutes?: number }> = {
    favelas: {
      filename: 'qg_2022_670_fcu_agreg.json',
      cacheTtlMinutes: 120,
    },
  };
  
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
      // Wake up backend and play startup sound
      fetch(`${API_BASE}/health`).catch(() => {});
      audioService.playStartup();
      
      const timer = setTimeout(() => setAppState('slides'), 3000);
      return () => clearTimeout(timer);
    } else if (appState === 'hyperspace') {
      const timer = setTimeout(() => setAppState('app'), 2500);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  const handleSlidesComplete = () => {
    setAppState('hyperspace');
  };

  // Initialize services on app load
  useEffect(() => {
    if (appState === 'app') {
      // Request notification permissions
      NotificationService.requestPermission();
      
      // Track page view
      AnalyticsService.trackPageView('main-app');
      
      // Track device type
      AnalyticsService.trackEvent('device', 'detected', deviceType);
      
      console.log('✅ Services initialized: Cache, Analytics, Notifications');
    }
  }, [appState, deviceType]);

  // Sidebar começa expandida em mobile para ser visível

  // Inicializar Mapbox
  useEffect(() => {
    if (appState !== 'app' || !mapContainer.current || map.current) return;

    // Usar a detecção mobile já feita no estado
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/astromaps/cmikidkhw001u01sd9dvo1g2d',
      center: [0, 0], // Começa centrado no mundo
      zoom: 1.5, // Zoom bem distante para ver a Terra
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
    
    // Animação de zoom do mundo até Belém quando o mapa carrega
    map.current.on('load', () => {
      audioService.playProcessing();
      
      // Espera 500ms e depois tenta usar geolocalização
      setTimeout(() => {
        // Tentar obter localização do usuário
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Sucesso: voar para localização do usuário
              const userLat = position.coords.latitude;
              const userLon = position.coords.longitude;
              
              map.current?.flyTo({
                center: [userLon, userLat],
                zoom: deviceType === 'mobile' ? 10 : 11,
                pitch: deviceType === 'mobile' ? 0 : 45,
                bearing: 0,
                duration: 4000,
                essential: true,
                curve: 1.5
              });
              
              setTimeout(() => {
                audioService.playSuccess();
                setMapCenter({ lat: userLat, lon: userLon });
              }, 4000);
            },
            (error) => {
              // Erro ou negado: ficar no zoom global (mundo inteiro)
              console.log('Geolocalização negada ou não disponível:', error);
              audioService.playSuccess();
              // Manter zoom global sem voar para nenhum lugar específico
            }
          );
        } else {
          // Navegador não suporta: ficar no zoom global
          audioService.playSuccess();
        }
      }, 500);
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
    
    // Ao criar polígono, voltar para modo seleção e bloquear
    map.current.on('draw.create', () => {
      updatePolygon();
      // Sair do modo desenho automaticamente e bloquear polígono
      setTimeout(() => {
        if (draw.current && map.current) {
          const canvas = map.current.getCanvasContainer();
          draw.current.changeMode('simple_select');
          // Desabilitar edição do polígono
          draw.current.changeMode('static');
          map.current.dragPan.enable();
          map.current.touchZoomRotate.enable();
          canvas.classList.remove('mode-draw');
          setDrawMode(false);
          setPolygonLocked(true); // Bloquear polígono
          audioService.playSuccess();
        }
      }, 100);
    });
    
    // Impedir atualização se polígono estiver bloqueado
    map.current.on('draw.update', () => {
      if (!polygonLocked) {
        debouncedUpdate();
      }
    });
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



  // Handler para GPS location
  const handleGPSLocation = (lat: number, lon: number) => {
    console.log('GPS Location received:', lat, lon);
    if (map.current) {
      map.current.flyTo({
        center: [lon, lat],
        zoom: 14,
        duration: 2000,
        essential: true
      });
      setMapCenter({ lat, lon });
      audioService.playSuccess();
      console.log('Map flyTo triggered');
    } else {
      console.warn('Map not initialized');
    }
  };

  // Helper: Mapear IDs de camadas do frontend para o backend
  const mapLayerIdToBackend = (layerId: string): string => {
    const mapping: Record<string, string> = {
      'cobertura_vegetal': 'NDVI',
      'infraestrutura': 'SENTINEL2_RGB',
      'favelas': 'SENTINEL2_RGB',
      'UTFVI': 'LST', // Ilha de calor usa LST
      'NDVI': 'NDVI',
      'NDWI': 'NDWI',
      'DEM': 'DEM',
      'URBANIZATION': 'SENTINEL2_FALSE_COLOR', // Urbanização usa false color via GEE
      'SENTINEL2_FALSE_COLOR': 'SENTINEL2_FALSE_COLOR'
    };
    return mapping[layerId] || layerId.toUpperCase();
  };

  // Handler para toggle de camadas
  const handleLayerToggle = async (layerId: string) => {
    const layer = layerConfigs.find(l => l.id === layerId);
    if (!layer) return;

    const isCurrentlyEnabled = layer.enabled;
    
    // Atualizar estado visual primeiro
    setLayerConfigs(prev => 
      prev.map(l => 
        l.id === layerId 
          ? { ...l, enabled: !l.enabled }
          : l
      )
    );
    audioService.playToggle();

    // Track analytics
    AnalyticsService.trackEvent('layer', isCurrentlyEnabled ? 'disable' : 'enable', layerId);

    if (isCurrentlyEnabled) {
      // Desativar camada - remover do mapa
      if (GEOJSON_LAYERS[layerId]) {
        // GeoJSON special handling
        if (map.current?.getLayer('geojson-layer')) map.current.removeLayer('geojson-layer');
        if (map.current?.getLayer('geojson-layer-outline')) map.current.removeLayer('geojson-layer-outline');
        if (map.current?.getSource('geojson-source')) map.current.removeSource('geojson-source');
        setGeojsonLayerData(null);
      } else {
        if (map.current?.getLayer(`layer-${layerId}`)) {
          map.current.removeLayer(`layer-${layerId}`);
        }
        if (map.current?.getSource(`source-${layerId}`)) {
          map.current.removeSource(`source-${layerId}`);
        }
        setActiveLayers(prev => {
          const newLayers = { ...prev };
          delete newLayers[layerId as LayerType];
          return newLayers;
        });
      }
    } else {
      // Ativar camada - carregar do GEE
      if (polygon.length < 3) {
        alert("Primeiro, desenhe um polígono para delimitar a área de análise.");
        audioService.playError();
        // Reverter estado
        setLayerConfigs(prev => 
          prev.map(l => 
            l.id === layerId 
              ? { ...l, enabled: false }
              : l
          )
        );
        return;
      }

      setLoading(prev => ({ ...prev, [layerId]: true }));
      
      // Check cache first
      const cacheKey = `layer_${layerId}_${JSON.stringify(polygon)}_${startDate}_${endDate}`;
      const cachedData = CacheService.get<{tileUrl: string}>(cacheKey);
      
      if (cachedData) {
        console.log(`✅ Cache hit for ${layerId}`);
        setActiveLayers(prev => ({ ...prev, [layerId as LayerType]: cachedData.tileUrl }));
        setLoading(prev => ({ ...prev, [layerId]: false }));
        audioService.playSuccess();
        return;
      }
      
      try {
        const startTime = performance.now();
        // Special-case: GeoJSON layers (e.g., favelas)
        if (GEOJSON_LAYERS[layerId]) {
          const filename = GEOJSON_LAYERS[layerId].filename;
          const payload = { filename, polygon };
          const res = await fetch(`${API_BASE}/api/geojson/render_layer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            throw new Error(`GeoJSON fetch failed: [${res.status}] ${await res.text()}`);
          }

          const gj = await res.json();

          const count = gj.features?.length || 0;
          if (count === 0) {
            alert('Nenhuma feição encontrada no GeoJSON para a área selecionada.');
            // revert state
            setLayerConfigs(prev => prev.map(l => l.id === layerId ? { ...l, enabled: false } : l));
            audioService.playError();
            return;
          }

          // Cache combined geojson as simple object
          CacheService.set(cacheKey, { geojson: gj }, GEOJSON_LAYERS[layerId].cacheTtlMinutes || 60);
          setGeojsonLayerData(gj);
          audioService.playSuccess();
          AnalyticsService.trackTiming('geojson_load', layerId, performance.now() - startTime);
          alert(`✅ ${count} comunidades encontradas na área!`);
          return;
        }

        // Todas as camadas térmicas (LST, UHI, UTFVI) usam Landsat 8/9 via Google Earth Engine
        // Cobertura nacional com dados térmicos de alta resolução (30m)

        const endpoint = layerId === 'DEM' ? '/api/get_dem' : '/api/get_tile';
        const backendLayerType = mapLayerIdToBackend(layerId);
        
        const body = layerId === 'DEM' 
          ? { polygon: polygon } 
          : { 
              polygon: polygon, 
              start_date: startDate, 
              end_date: endDate, 
              layer_type: backendLayerType, 
              cloud_percentage: cloud 
            };
        
        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);
        const data = await res.json();
        const url = data.tileUrl || data.tile_url;

        // Cache the result
        CacheService.set(cacheKey, { tileUrl: url }, 60); // Cache for 60 minutes

        setActiveLayers(prev => ({ ...prev, [layerId as LayerType]: url }));
        audioService.playSuccess();

        // Track timing
        const duration = performance.now() - startTime;
        AnalyticsService.trackTiming('layer_load', layerId, duration);
        
      } catch (e: any) {
        alert(`Erro ao carregar camada ${layer.name}: ${e.message || e}`);
        audioService.playError();
        AnalyticsService.trackError(e, `layer_toggle: ${layerId}`);
        // Reverter estado em caso de erro
        setLayerConfigs(prev => 
          prev.map(l => 
            l.id === layerId 
              ? { ...l, enabled: false }
              : l
          )
        );
      } finally {
        setLoading(prev => ({ ...prev, [layerId]: false }));
      }
    }
  };

  // Handler para abrir AI Analyst
  const handleOpenAIAnalyst = () => {
    if (polygon.length < 3) {
      alert("Primeiro, desenhe um polígono para delimitar a área de análise.");
      audioService.playError();
      return;
    }
    setShowAIAnalyst(true);
    audioService.playPanelOpen();
    AnalyticsService.trackEvent('ai_analyst', 'open', 'manual');
  };

  // Handler para exportar PDF
  const handleExportPDF = async () => {
    if (polygon.length < 3) {
      alert("Primeiro, desenhe um polígono para realizar análise.");
      return;
    }

    try {
      audioService.playProcessing();
      NotificationService.notify('📄 Gerando relatório PDF...', { 
        body: 'Isso pode levar alguns segundos',
        icon: '/images/logo.png'
      });

      // Buscar dados reais da última análise ou usar valores padrão
      const cacheKey = `last_analysis_${JSON.stringify(polygon)}`;
      const lastAnalysis = CacheService.get<any>(cacheKey);
      
      const reportData = {
        title: 'Análise Geoespacial - HARP-IA',
        location: `${mapCenter.lat.toFixed(4)}, ${mapCenter.lon.toFixed(4)}`,
        date: new Date().toLocaleDateString('pt-BR'),
        avgTemperature: lastAnalysis?.avgTemperature || 25,
        vegetationDensity: lastAnalysis?.vegetationDensity || 50,
        floodRisk: lastAnalysis?.floodRisk || 'MÉDIO',
        aiSummary: lastAnalysis?.aiSummary || 'Execute a análise de AI para obter um relatório completo com dados da área.',
        recommendations: lastAnalysis?.recommendations || ['1. Execute a análise de AI para recomendações personalizadas', '2. Adicione camadas para visualizar dados geoespaciais'],
        vulnerability: vulnerabilityData ? VulnerabilityCalculator.calculate(vulnerabilityData) : undefined,
        areaSize: lastAnalysis?.area_km2 || 0
      };

      await PDFExportService.downloadReport(reportData, `relatorio-harpia-${Date.now()}.pdf`);
      
      audioService.playSuccess();
      NotificationService.alertSuccess('Relatório PDF gerado e baixado com sucesso!');
      AnalyticsService.trackEvent('export', 'pdf', 'success');
      
    } catch (error: any) {
      audioService.playError();
      NotificationService.alertCritical('Erro ao gerar PDF', error.message);
      AnalyticsService.trackError(error, 'pdf_export');
    }
  };

  // Handler para abrir modal de configuração do time series
  const handleOpenTimeSeries = () => {
    if (polygon.length < 3) {
      alert("Primeiro, desenhe um polígono para delimitar a área de análise.");
      return;
    }
    audioService.playClick();
    setShowTimeSeriesConfig(true);
  };

  // Handler para carregar os dados após configuração
  const handleLoadTimeSeries = async () => {
    setShowTimeSeriesConfig(false);
    
    try {
      audioService.playProcessing();
      
      const days = timeSeriesPeriod === '30d' ? 30 : timeSeriesPeriod === '90d' ? 90 : 365;
      NotificationService.notify('📊 Carregando dados temporais...', { 
        body: `Buscando histórico dos últimos ${days} dias`
      });

      // Buscar dados REAIS do backend
      const polygonArray = polygon.map(coord => [coord.lng, coord.lat]);
      
      const res = await fetch(`${API_BASE}/api/time_series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          polygon: polygonArray,
          start_date: daysAgoStr(days),
          end_date: todayStr()
        })
      });

      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      
      const data = await res.json();
      setTimeSeriesData(data.timeseries || []);
      setShowTimeSeries(true);
      
      audioService.playSuccess();
      AnalyticsService.trackEvent('time_series', 'open', 'success');
      
    } catch (error: any) {
      console.error('Erro ao carregar séries temporais:', error);
      audioService.playError();
      alert(`Erro ao carregar dados temporais: ${error.message}`);
      AnalyticsService.trackError(error, 'time_series_load');
    }
  };

  const handleClear = () => {
    audioService.playClick();
    setPolygon([]);
    setPolygonLocked(false); // Desbloquear para novo desenho
    setActiveLayers({});
    setGeojsonLayerData(null);
    if (draw.current) {
      draw.current.deleteAll();
    }
    // Não mexe no mapa - apenas limpa os dados
  };

  // Handler para mudança de opacidade
  const handleOpacityChange = (layerId: string, opacity: number) => {
    setLayerOpacity(prev => ({ ...prev, [layerId]: opacity }));
    
    // Atualizar opacidade no mapa
    if (map.current) {
      const rasterId = `layer-${layerId}`;
      if (map.current.getLayer(rasterId)) {
        map.current.setPaintProperty(rasterId, 'raster-opacity', opacity);
      }
      // Para camada GeoJSON (favelas)
      if (layerId === 'favelas') {
        if (map.current.getLayer('geojson-layer')) {
          map.current.setPaintProperty('geojson-layer', 'fill-opacity', opacity * 0.3);
        }
        if (map.current.getLayer('geojson-layer-outline')) {
          map.current.setPaintProperty('geojson-layer-outline', 'line-opacity', opacity);
        }
      }
    }
  };

  // Handler para minimizar/expandir sidebar
  const handleSidebarMinimize = () => {
    setSidebarCollapsed(prev => !prev);
    audioService.playToggle();
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
    <ErrorBoundary>
      <div className={`app ${isTouch ? 'touch-device' : 'desktop-device'} device-${deviceType}`}>
        {/* Layer Control Sidebar - Futuristic Accordion */}
        <LayerControlSidebar 
          layers={layerConfigs}
          onLayerToggle={handleLayerToggle}
          onOpacityChange={handleOpacityChange}
          onMinimize={handleSidebarMinimize}
          collapsed={sidebarCollapsed}
          layerOpacities={layerOpacity}
        />

        {/* Top-Right Utilities */}
        <LiveWeatherWidget lat={mapCenter.lat} lon={mapCenter.lon} />
        <GPSButton onLocationFound={handleGPSLocation} />

        {/* Main Map Content */}
        <main className="main-content">
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </main>

        {/* Floating Action Buttons */}
        <div className="floating-actions">
          <button 
            className="fab-button ai-analyst-btn"
            onClick={handleOpenAIAnalyst}
            onMouseEnter={() => audioService.playHover()}
            disabled={polygon.length < 3}
            title="AI Analyst Report"
          >
            <span className="fab-icon">🤖</span>
            <span className="fab-label">AI ANALYST</span>
          </button>

          <button 
            className="fab-button pdf-export-btn"
            onClick={handleExportPDF}
            onMouseEnter={() => audioService.playHover()}
            disabled={polygon.length < 3}
            title="Exportar Relatório PDF"
          >
            <span className="fab-icon">📄</span>
            <span className="fab-label">PDF</span>
          </button>

          <button 
            className="fab-button time-series-btn"
            onClick={handleOpenTimeSeries}
            onMouseEnter={() => audioService.playHover()}
            title="Gráficos Temporais"
          >
            <span className="fab-icon">📈</span>
            <span className="fab-label">GRÁFICOS</span>
          </button>

          <button 
            className="fab-button wind-btn"
            onClick={() => { setShowWindMap(true); audioService.playClick(); }}
            onMouseEnter={() => audioService.playHover()}
            title="Mapa de Ventos"
          >
            <span className="fab-icon">💨</span>
            <span className="fab-label">VENTOS</span>
          </button>

          <button 
            className="fab-button draw-btn"
            onClick={toggleDrawMode}
            onMouseEnter={() => audioService.playHover()}
            title={drawMode ? 'Finalizar Desenho' : 'Desenhar Área'}
          >
            <span className="fab-icon">{drawMode ? '✓' : '✏️'}</span>
            <span className="fab-label">{drawMode ? 'FINALIZAR' : 'DESENHAR'}</span>
          </button>

          <button 
            className="fab-button mode-3d-btn"
            onClick={toggle3DMode}
            onMouseEnter={() => audioService.playHover()}
            title={is3DMode ? 'Modo 2D' : 'Modo 3D'}
          >
            <span className="fab-icon">{is3DMode ? '🗺️' : '🏔️'}</span>
            <span className="fab-label">{is3DMode ? '2D' : '3D'}</span>
          </button>

          <button 
            className="fab-button chat-btn"
            onClick={() => { setChatOpen(true); audioService.playPanelOpen(); }}
            onMouseEnter={() => audioService.playHover()}
            disabled={polygon.length < 3}
            title="Chat com IA"
          >
            <span className="fab-icon">💬</span>
            <span className="fab-label">CHAT IA</span>
          </button>

          <button 
            className="fab-button clear-btn"
            onClick={handleClear}
            onMouseEnter={() => audioService.playHover()}
            disabled={isAnythingLoading}
            title="Limpar Tudo"
          >
            <span className="fab-icon">🗑️</span>
            <span className="fab-label">LIMPAR</span>
          </button>
        </div>

      {/* AI Analyst Modal */}
      <AIAnalystModal 
        isOpen={showAIAnalyst}
        onClose={() => { setShowAIAnalyst(false); audioService.playPanelClose(); }}
        polygon={polygon}
        onAnalysisComplete={(result) => {
          console.log('Analysis completed:', result);
          // Salvar dados de vulnerabilidade
          if (result) {
            const vulnFactors = VulnerabilityCalculator.fromAnalysisData(result);
            setVulnerabilityData(vulnFactors);
          }
          // Notificar conclusão
          NotificationService.analysisComplete(polygon.length);
          AnalyticsService.trackAIAnalysis(polygon.length, 0, true);
        }}
      />

      {/* Comparison Slider Modal */}
      {showComparison && (
        <ComparisonSlider
          beforeDate={daysAgoStr(365)}
          afterDate={todayStr()}
          beforeLayerUrl={activeLayers.NDVI || ''}
          afterLayerUrl={activeLayers.NDVI || ''}
          layerType="NDVI"
          onClose={() => setShowComparison(false)}
        />
      )}

      {/* Time Series Config Modal */}
      {showTimeSeriesConfig && (
        <div className="timeseries-modal-overlay" onClick={() => setShowTimeSeriesConfig(false)}>
          <div className="timeseries-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="timeseries-header">
              <h2>⚙️ Configurar Análise Temporal</h2>
              <button className="close-btn" onClick={() => setShowTimeSeriesConfig(false)}>✕</button>
            </div>
            
            <div className="config-section">
              <h3>📅 Período de Análise</h3>
              <div className="config-options">
                <button 
                  className={`config-btn ${timeSeriesPeriod === '30d' ? 'active' : ''}`}
                  onClick={() => setTimeSeriesPeriod('30d')}
                >
                  📊 30 dias
                </button>
                <button 
                  className={`config-btn ${timeSeriesPeriod === '90d' ? 'active' : ''}`}
                  onClick={() => setTimeSeriesPeriod('90d')}
                >
                  📈 90 dias
                </button>
                <button 
                  className={`config-btn ${timeSeriesPeriod === '1y' ? 'active' : ''}`}
                  onClick={() => setTimeSeriesPeriod('1y')}
                >
                  📉 1 ano
                </button>
              </div>
            </div>

            <div className="config-section">
              <h3>📊 Tipo de Dados</h3>
              <div className="config-options">
                <button 
                  className={`config-btn ${timeSeriesDataType === 'all' ? 'active' : ''}`}
                  onClick={() => setTimeSeriesDataType('all')}
                >
                  🌐 Todos os dados
                </button>
                <button 
                  className={`config-btn ${timeSeriesDataType === 'temperature' ? 'active' : ''}`}
                  onClick={() => setTimeSeriesDataType('temperature')}
                >
                  🌡️ Temperatura
                </button>
                <button 
                  className={`config-btn ${timeSeriesDataType === 'vegetation' ? 'active' : ''}`}
                  onClick={() => setTimeSeriesDataType('vegetation')}
                >
                  🌳 Vegetação
                </button>
                <button 
                  className={`config-btn ${timeSeriesDataType === 'water' ? 'active' : ''}`}
                  onClick={() => setTimeSeriesDataType('water')}
                >
                  💧 Água
                </button>
              </div>
            </div>

            <button className="load-btn" onClick={handleLoadTimeSeries}>
              🚀 Carregar Dados
            </button>
          </div>
        </div>
      )}

      {/* Time Series Chart Modal */}
      {showTimeSeries && timeSeriesData.length > 0 && (
        <TimeSeriesChart
          data={timeSeriesData}
          title="Análise Temporal da Área"
          onClose={() => setShowTimeSeries(false)}
          initialChart={timeSeriesDataType === 'all' ? 'temperature' : timeSeriesDataType}
        />
      )}

      {/* Timelapse Player Modal */}
      {showTimelapse && timelapseFrames.length > 0 && (
        <TimelapsePlayer
          frames={timelapseFrames}
          isOpen={showTimelapse}
          onClose={() => setShowTimelapse(false)}
          title="Time-Lapse Temporal"
        />
      )}

      <ChatPanel 
        isOpen={chatOpen}
        onClose={() => { setChatOpen(false); audioService.playPanelClose(); }}
        polygon={polygon}
        activeLayers={activeLayers}
        geojsonLayerData={geojsonLayerData}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Wind Map Modal */}
      <WindMap 
        isOpen={showWindMap}
        onClose={() => { setShowWindMap(false); audioService.playPanelClose(); }}
      />
      
      </div>
    </ErrorBoundary>
  );
}
