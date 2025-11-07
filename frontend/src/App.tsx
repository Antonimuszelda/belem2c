import { useEffect, useMemo, useRef, useState, Component } from "react";
import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap, GeoJSON } from "react-leaflet";
import * as L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

import "./App.css";
import ChatPanel from "./components/ChatPanel";
import Loading3D from "./components/Loading3D";
import IntroSlides from "./components/IntroSlides";
import HyperspaceTransition from "./components/HyperspaceTransition";

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

// Fix para os ícones padrão do Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Tipos
type Coordinate = { lat: number; lng: number };
type LayerType = "SENTINEL2_RGB" | "LANDSAT_RGB" | "SENTINEL1_VV" | "NDVI" | "NDWI" | "LST" | "UHI" | "UTFVI" | "DEM";
type ActiveLayers = Partial<Record<LayerType, string>>;
type ImageItem = { date: string; cloud_cover: number; satellite: string };

const API_BASE = (import.meta as any).env.VITE_API_URL || "http://127.0.0.1:8000";

// Funções Utilitárias
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Componente de Desenho no Mapa
function DrawControl({ onPolygonCreated, clearSignal }: { onPolygonCreated: (coords: Coordinate[]) => void; clearSignal: number; }) {
  const map = useMap();
  const groupRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

  useEffect(() => {
    map.addLayer(groupRef.current);
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: "var(--neon-cyan)" } },
        polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
      },
      edit: { featureGroup: groupRef.current },
    });
    map.addControl(drawControl as any);

    const onCreated = (e: L.LeafletEvent & { layer: L.Layer }) => {
      const layer = e.layer as L.Polygon;
      groupRef.current.clearLayers();
      groupRef.current.addLayer(layer);
      const latlngs = (layer.getLatLngs()[0] as L.LatLng[]).map(p => ({ lat: p.lat, lng: p.lng }));
      onPolygonCreated(latlngs);
    };

    const onEdited = (e: any) => {
      e.layers.eachLayer((layer: L.Layer) => {
        const poly = layer as L.Polygon;
        const latlngs = (poly.getLatLngs()[0] as L.LatLng[]).map(p => ({ lat: p.lat, lng: p.lng }));
        onPolygonCreated(latlngs);
      });
    };

    map.on("draw:created" as any, onCreated);
    map.on("draw:edited" as any, onEdited);

    return () => {
      map.off("draw:created" as any, onCreated);
      map.off("draw:edited" as any, onEdited);
      if (map.hasLayer(groupRef.current)) {
        map.removeControl(drawControl as any);
        map.removeLayer(groupRef.current);
      }
    };
  }, [map, onPolygonCreated]);

  useEffect(() => {
    if (clearSignal > 0) groupRef.current.clearLayers();
  }, [clearSignal]);

  return null;
}

// Componente Principal
export default function App() {
  // Navigation state: 'loading1' | 'slides' | 'hyperspace' | 'app'
  const [appState, setAppState] = useState<'loading1' | 'slides' | 'hyperspace' | 'app'>('loading1');
  
  const mapRef = useRef<L.Map | null>(null);
  const [polygon, setPolygon] = useState<Coordinate[]>([]);
  const [startDate, setStartDate] = useState(daysAgoStr(365));
  const [endDate, setEndDate] = useState(todayStr());
  const [cloud, setCloud] = useState(30);
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>({});
  const [layerOpacity, setLayerOpacity] = useState<Record<LayerType, number>>({
    SENTINEL2_RGB: 1.0,
    LANDSAT_RGB: 1.0,
    SENTINEL1_VV: 0.8,
    NDVI: 0.7,
    NDWI: 0.7,
    LST: 0.7,
    UHI: 0.8,
    UTFVI: 0.8,
    DEM: 0.6,
  });
  const [geojsonLayerData, setGeojsonLayerData] = useState<any>(null); // GeoJSON layer to render
  const [showImageListModal, setShowImageListModal] = useState(false);
  const [imageList, setImageList] = useState<ImageItem[]>([]);
  const [selectedLayerType, setSelectedLayerType] = useState<LayerType | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'mosaicos'>('lista'); // Tab control
  const [mosaics, setMosaics] = useState<Array<{dates: string[], startDate: string, endDate: string}>>([]);
  const [chatOpen, setChatOpen] = useState(false); // Chat panel state
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [clearSignal, setClearSignal] = useState(0);

  const center = useMemo(() => ({ lat: -15.78, lng: -47.93 }), []);

  // Função para formatar e traduzir propriedades do GeoJSON
  const formatGeoJSONPopup = (properties: any): string => {
    const translations: Record<string, string> = {
      // FCUs
      'cd_fcu': 'Código',
      'nm_fcu': 'Nome',
      'cd_uf': 'Código UF',
      'nm_uf': 'Estado',
      'sigla_uf': 'UF',
      'cd_mun': 'Código Município',
      'nm_mun': 'Município',
      'nommunic': 'Município',
      'codagsn': 'Código',
      'nome_agsn': 'Nome',
      'complement': 'Complemento',
      'ano_ref': 'Ano Referência',
      'ano_censo': 'Ano Censo',
      'rf': 'Regularização Fundiária',
      'ro': 'Remoção',
      'spe': 'Serviços Públicos',
      'pu': 'Parcelamento Urbano',
      'setorizado': 'Setorizado',
      // Setores
      'CD_MUN': 'Código Município',
      'NM_MUN': 'Município',
      'SIGLA_UF': 'UF',
      'AREA_KM2': 'Área (km²)',
      // Geral
      'uf': 'UF',
      'codmun': 'Código Município'
    };

    const importantFields = ['nm_fcu', 'nome_agsn', 'NM_MUN', 'nm_mun', 'nommunic', 'nm_uf', 'SIGLA_UF', 'sigla_uf', 'AREA_KM2'];
    
    let html = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; min-width: 200px;">';
    
    // Título principal
    const title = properties.nm_fcu || properties.nome_agsn || properties.NM_MUN || properties.nm_mun || properties.nommunic || 'Área';
    html += `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; margin: -13px -20px 12px -20px; border-radius: 12px 12px 0 0; font-weight: bold; font-size: 15px;">
      🏘️ ${title}
    </div>`;
    
    // Informações principais
    const entries = Object.entries(properties)
      .filter(([key, value]) => value != null && value !== '' && key !== 'geometry')
      .sort((a, b) => {
        const aImportant = importantFields.includes(a[0]) ? 0 : 1;
        const bImportant = importantFields.includes(b[0]) ? 0 : 1;
        return aImportant - bImportant;
      });
    
    if (entries.length > 0) {
      html += '<div style="display: grid; gap: 8px;">';
      
      entries.forEach(([key, value]) => {
        if (key === 'nm_fcu' || key === 'nome_agsn' || key === 'NM_MUN') return; // Já está no título
        
        const label = translations[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const displayValue = String(value);
        
        // Formatar valores especiais
        let formattedValue = displayValue;
        let icon = '📌';
        
        if (key.includes('area') || key.includes('AREA')) {
          icon = '📏';
        } else if (key.includes('mun') || key.includes('MUN')) {
          icon = '🏙️';
        } else if (key.includes('uf') || key.includes('UF')) {
          icon = '🗺️';
        } else if (key.includes('ano')) {
          icon = '📅';
        } else if (key.includes('cd_') || key.includes('CD_') || key.includes('cod')) {
          icon = '🔢';
        }
        
        html += `
          <div style="display: flex; align-items: start; padding: 6px; background: rgba(102, 126, 234, 0.05); border-radius: 6px; border-left: 3px solid #667eea;">
            <span style="margin-right: 8px;">${icon}</span>
            <div style="flex: 1;">
              <div style="font-size: 11px; color: #666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
              <div style="font-size: 13px; color: #333; font-weight: 600; margin-top: 2px;">${formattedValue}</div>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  };

  // Navigation flow control
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
  };

  const handlePolygonCreated = (coords: Coordinate[]) => {
    setPolygon(coords);
    setActiveLayers({}); // Limpa camadas ao desenhar novo polígono
  };

  // Função para gerar mosaicos a partir de lista de imagens
  const generateMosaics = (images: ImageItem[]) => {
    const mosaicList: Array<{dates: string[], startDate: string, endDate: string}> = [];
    const sortedImages = [...images].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let currentMosaic: string[] = [];
    let mosaicStartDate = '';
    
    for (let i = 0; i < sortedImages.length; i++) {
      const currentDate = new Date(sortedImages[i].date);
      
      if (currentMosaic.length === 0) {
        // Iniciar novo mosaico
        currentMosaic = [sortedImages[i].date];
        mosaicStartDate = sortedImages[i].date;
      } else {
        // Verificar se está dentro da tolerância de 2 meses
        const lastDate = new Date(currentMosaic[currentMosaic.length - 1]);
        const diffMonths = (currentDate.getFullYear() - lastDate.getFullYear()) * 12 + 
                          (currentDate.getMonth() - lastDate.getMonth());
        
        if (diffMonths <= 2 && currentMosaic.length < 15) {
          // Adicionar ao mosaico atual
          currentMosaic.push(sortedImages[i].date);
        } else {
          // Salvar mosaico atual se tiver pelo menos 10 imagens
          if (currentMosaic.length >= 10) {
            mosaicList.push({
              dates: [...currentMosaic],
              startDate: mosaicStartDate,
              endDate: currentMosaic[currentMosaic.length - 1]
            });
          }
          // Iniciar novo mosaico
          currentMosaic = [sortedImages[i].date];
          mosaicStartDate = sortedImages[i].date;
        }
      }
    }
    
    // Adicionar último mosaico se tiver pelo menos 10 imagens
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
      // Camada está ativa, então desativa
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

    // Buscar lista de imagens disponíveis
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
        
        // Gerar mosaicos automaticamente
        const generatedMosaics = generateMosaics(data.images);
        setMosaics(generatedMosaics);
        
        setShowImageListModal(true);
      } else {
        alert(`Nenhuma imagem encontrada para ${layerType} no período selecionado. Tente aumentar o intervalo de datas ou a tolerância de nuvens.`);
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
    setGeojsonLayerData(null); // Clear GeoJSON layer
    setClearSignal((s) => s + 1);
    if (mapRef.current) {
      mapRef.current.setView([-15.78, -47.93], 4);
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
    <div className="app">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>HARP-IA</h1>
          <p>Análise Geoespacial com IA</p>
        </header>

        <div className="sidebar-content">
          <div className="control-group">
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

          <div className="control-group">
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
                  <button className={`layer-btn ${activeLayers[key] ? 'active' : ''}`} onClick={() => handleToggleLayer(key)} disabled={!!loading[key]}>
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
              onClick={async () => {
                if (polygon.length < 3) {
                  alert("Primeiro, desenhe um polígono para delimitar a área.");
                  return;
                }
                
                setLoading(prev => ({ ...prev, geojson: true }));
                console.log('🚀 Iniciando carregamento de favelas...');
                console.log('🌐 API_BASE:', API_BASE);
                console.log('📍 Polígono:', JSON.stringify(polygon, null, 2));
                
                try {
                  // Carregar todos os GeoJSONs de favelas na área delimitada
                  const fileNames = ['FCUs_BR.json', 'geopackages_n_setorizadas.json', 'qg_2022_670_fcu_agreg.json', 'setores_censitarios.json'];
                  const allFeatures: any[] = [];
                  
                  console.log('🔍 Carregando GeoJSONs:', fileNames);
                  
                  for (const fileName of fileNames) {
                    try {
                      const payload = { filename: fileName, polygon: polygon };
                      const url = `${API_BASE}/api/geojson/render_layer`;
                      
                      console.log(`📁 Carregando ${fileName} de ${url}...`);
                      console.log(`📦 Payload:`, JSON.stringify(payload).substring(0, 200));
                      
                      const res = await fetch(url, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Accept': 'application/json'
                        },
                        body: JSON.stringify(payload),
                        mode: 'cors'
                      });
                      
                      console.log(`📡 Response status ${fileName}:`, res.status, res.statusText);
                      
                      if (res.ok) {
                        const geojsonData = await res.json();
                        const featuresCount = geojsonData.features?.length || 0;
                        console.log(`✅ ${fileName}: ${featuresCount} features`);
                        
                        if (geojsonData.features && geojsonData.features.length > 0) {
                          allFeatures.push(...geojsonData.features);
                        }
                      } else {
                        const errorText = await res.text();
                        console.error(`❌ ${fileName} falhou: ${res.status} - ${errorText}`);
                        console.error(`❌ Response headers:`, Array.from(res.headers.entries()));
                      }
                    } catch (fileError: any) {
                      console.error(`❌ Erro ao processar ${fileName}:`, fileError);
                      console.error(`❌ Stack:`, fileError.stack);
                    }
                  }
                  
                  console.log(`📊 Total de features encontradas: ${allFeatures.length}`);
                  
                  if (allFeatures.length > 0) {
                    const combinedGeoJSON = {
                      type: 'FeatureCollection',
                      features: allFeatures
                    };
                    console.log('✅ Setando GeoJSON no estado...');
                    setGeojsonLayerData(combinedGeoJSON);
                    alert(`✅ ${allFeatures.length} favelas/comunidades encontradas na área delimitada.`);
                  } else {
                    console.warn('⚠️ Nenhuma feature encontrada');
                    alert("Nenhuma favela/comunidade encontrada na área delimitada. Tente uma área maior ou diferente.");
                  }
                  
                } catch (e: any) {
                  console.error('❌ Erro geral ao carregar favelas:', e);
                  console.error('❌ Stack trace:', e.stack);
                  alert(`Erro ao carregar favelas: ${e.message || e}`);
                } finally {
                  setLoading(prev => ({ ...prev, geojson: false }));
                  console.log('🏁 Finalizado carregamento');
                }
              }}
              disabled={polygon.length < 3 || !!loading.geojson}
              style={{ width: '100%' }}
            >
              <i className="icofont-home"></i> {loading.geojson ? 'Carregando Favelas...' : 'Carregar Favelas na Área'}
            </button>
            
          </div>

        </div>

        <footer className="sidebar-footer">
          <button className="btn-ai" onClick={() => setChatOpen(true)} disabled={polygon.length < 3}>
            <><i className="icofont-robot"></i> Chat com IA</>
          </button>
          <button className="btn-clear" onClick={handleClear} disabled={isAnythingLoading}>
            Limpar Tudo
          </button>
        </footer>
      </aside>

      <main className="main-content">
        <MapContainer center={center as any} zoom={4} className="map" ref={mapRef}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {Object.entries(activeLayers).map(([type, url]) => 
            (url) ? <TileLayer key={type} url={url} opacity={layerOpacity[type as LayerType]} /> : null
          )}

          <FeatureGroup>
            {polygon.length >= 3 && <Polygon pathOptions={{ color: "var(--neon-cyan)", weight: 2, fillOpacity: 0.1 }} positions={polygon.map(p => [p.lat, p.lng]) as any} />}
          </FeatureGroup>

          {geojsonLayerData && (
            <GeoJSON 
              key={JSON.stringify(geojsonLayerData)} 
              data={geojsonLayerData}
              style={{
                color: "#667eea",
                weight: 2,
                fillOpacity: 0.2,
                fillColor: "#667eea"
              }}
              onEachFeature={(feature, layer) => {
                // Add popup with formatted feature properties
                if (feature.properties) {
                  const popupContent = formatGeoJSONPopup(feature.properties);
                  layer.bindPopup(popupContent, {
                    maxWidth: 350,
                    className: 'custom-popup'
                  });
                }
              }}
            />
          )}

          <DrawControl onPolygonCreated={handlePolygonCreated} clearSignal={clearSignal} />
        </MapContainer>
      </main>

      {showImageListModal && selectedLayerType && (
        <div className="ai-modal-overlay" onClick={() => { setShowImageListModal(false); setActiveTab('lista'); }}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="ai-modal-header">
              <h2><i className="icofont-satellite"></i> Imagens Disponíveis - {layerDefs[selectedLayerType].name}</h2>
              <button className="close-btn" onClick={() => { setShowImageListModal(false); setActiveTab('lista'); }}>✕</button>
            </div>
            
            {/* Tabs */}
            <div style={{ 
              display: 'flex', 
              borderBottom: '2px solid var(--neon-cyan)', 
              marginBottom: '15px',
              gap: '10px'
            }}>
              <button
                onClick={() => setActiveTab('lista')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: activeTab === 'lista' ? 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'lista' ? '3px solid var(--neon-cyan)' : '3px solid transparent',
                  color: activeTab === 'lista' ? 'var(--neon-cyan)' : '#aaa',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                📋 Lista ({imageList.length})
              </button>
              <button
                onClick={() => setActiveTab('mosaicos')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: activeTab === 'mosaicos' ? 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'mosaicos' ? '3px solid var(--neon-green)' : '3px solid transparent',
                  color: activeTab === 'mosaicos' ? 'var(--neon-green)' : '#aaa',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                🗂️ Mosaicos ({mosaics.length})
              </button>
            </div>

            <div className="ai-content" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {activeTab === 'lista' ? (
                <>
                  <p style={{ marginBottom: '15px', color: '#aaa' }}>
                    Encontradas {imageList.length} imagens. Clique para carregar:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {imageList.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleLoadSpecificImage(img.date)}
                        style={{
                          padding: '12px',
                          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                          border: '1px solid var(--neon-cyan)',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)';
                          e.currentTarget.style.borderColor = 'var(--neon-blue)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
                          e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
                            📅 {img.date}
                          </div>
                          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                            {img.satellite} • Nuvens: {img.cloud_cover}%
                          </div>
                        </div>
                        <i className="icofont-download" style={{ fontSize: '20px', color: 'var(--neon-green)' }}></i>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {mosaics.length > 0 ? (
                    <>
                      <p style={{ marginBottom: '15px', color: '#aaa' }}>
                        {mosaics.length} mosaico(s) gerado(s) com pelo menos 10 imagens cada (tolerância: 2 meses)
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {mosaics.map((mosaic, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '15px',
                              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                              border: '2px solid var(--neon-green)',
                              borderRadius: '12px',
                              color: '#fff'
                            }}
                          >
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '10px'
                            }}>
                              <h3 style={{ 
                                fontSize: '18px', 
                                fontWeight: 'bold', 
                                color: 'var(--neon-green)',
                                margin: 0 
                              }}>
                                🗂️ Mosaico #{idx + 1}
                              </h3>
                              <span style={{ 
                                padding: '4px 12px', 
                                background: 'var(--neon-green)', 
                                color: '#000', 
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}>
                                {mosaic.dates.length} imagens
                              </span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>
                              📅 Período: {mosaic.startDate} até {mosaic.endDate}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#888',
                              maxHeight: '100px',
                              overflowY: 'auto',
                              padding: '8px',
                              background: 'rgba(0,0,0,0.3)',
                              borderRadius: '4px'
                            }}>
                              <strong>Datas incluídas:</strong><br/>
                              {mosaic.dates.join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px', 
                      color: '#aaa' 
                    }}>
                      <i className="icofont-info-circle" style={{ fontSize: '48px', marginBottom: '15px', display: 'block', color: 'var(--neon-yellow)' }}></i>
                      <p>Nenhum mosaico gerado.</p>
                      <p style={{ fontSize: '14px', marginTop: '8px' }}>
                        São necessárias pelo menos 10 imagens dentro de 2 meses para criar um mosaico.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      <ChatPanel 
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        polygon={polygon}
        activeLayers={activeLayers}
        geojsonLayerData={geojsonLayerData}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}

// Definições das camadas para a UI
const layerDefs: Record<LayerType, { name: string; icon: string }> = {
  SENTINEL2_RGB: { name: "Sentinel-2 (RGB)", icon: "icofont-satellite" },
  LANDSAT_RGB: { name: "Landsat (RGB)", icon: "icofont-satellite-alt" },
  SENTINEL1_VV: { name: "Sentinel-1 (Radar)", icon: "icofont-radar" },
  NDVI: { name: "Vegetação (NDVI)", icon: "icofont-leaf" },
  NDWI: { name: "Água (NDWI)", icon: "icofont-water-drop" },
  LST: { name: "Temperatura (LST)", icon: "icofont-thermometer-alt" },
  UHI: { name: "Ilha de Calor (UHI)", icon: "icofont-fire-burn" },
  UTFVI: { name: "Variação Térmica (UTFVI)", icon: "icofont-chart-bar-graph" },
  DEM: { name: "Elevação (DEM)", icon: "icofont-mountain" },
};
