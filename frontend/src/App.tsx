// frontend/src/App.tsx - VERSÃO HARPIA (UI Refatorada e Funcionalidades Expandidas) - CORRIGIDO e com Source File

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, GeoJSON, ZoomControl } from 'react-leaflet';
import L, { Map, FeatureGroup, GeoJSON as LeafletGeoJSON, type StyleFunction } from 'leaflet'; // Importações ajustadas // Importações adicionadas
import 'leaflet-draw';
import 'leaflet/dist/leaflet.css'; // Importa CSS base do Leaflet
import 'leaflet-draw/dist/leaflet.draw.css'; // Importa CSS do Leaflet Draw
import './App.css'; // Nosso CSS customizado (Harpia Theme)

// --- CORREÇÃO DE ÍCONES LEAFLET ---
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});

// --- Interfaces para Tipagem ---
interface Coordinate { lat: number; lng: number; }
interface ImageResult { date: string; satellite: string; tile_url: string; }
interface DEMResult { tileUrl: string; min_elevation?: number | null; max_elevation?: number | null; }
interface LayerData {
    tileUrl: string | null;
    opacity: number;
    dem: DEMResult | null;
    satellite: string;
    key: number;
}
interface DrawControlProps {
    onPolygonCreated: (coords: Coordinate[]) => void;
    clearRef: React.MutableRefObject<(() => void) | null>;
}

// --- Componente de Controle de Desenho (Leaflet Draw) ---
const DrawControl: React.FC<DrawControlProps> = ({ onPolygonCreated, clearRef }) => {
    const map = useMap() as Map;
    const drawnItemsRef = useRef<FeatureGroup>(new L.FeatureGroup());
    const drawControlRef = useRef<L.Control.Draw | null>(null);

    const clearLayers = useCallback(() => {
        drawnItemsRef.current.clearLayers();
        onPolygonCreated([]);
    }, [onPolygonCreated]);

    clearRef.current = clearLayers;

    useEffect(() => {
        if (!map.hasLayer(drawnItemsRef.current)) {
            map.addLayer(drawnItemsRef.current);
        }
        if (drawControlRef.current) {
            map.removeControl(drawControlRef.current);
        }
        drawControlRef.current = new L.Control.Draw({
            edit: {
                featureGroup: drawnItemsRef.current
            },
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: { color: '#DAA520' }
                },
                polyline: false, marker: false, circlemarker: false, rectangle: false, circle: false,
            },
        });
        map.addControl(drawControlRef.current);

        const onDrawCreated = (e: L.LeafletEvent) => {
            const event = e as L.DrawEvents.Created;
            const layer = event.layer as L.Polygon;
            drawnItemsRef.current.clearLayers();
            drawnItemsRef.current.addLayer(layer);
            const latlngs = (layer.getLatLngs()[0] as L.LatLng[]).map(coord => ({ lat: coord.lat, lng: coord.lng }));
            onPolygonCreated(latlngs);
        };

        const onDrawEdited = (e: L.LeafletEvent) => {
             const event = e as L.DrawEvents.Edited;
            event.layers.eachLayer((layer) => {
                if (layer instanceof L.Polygon) {
                    const latlngs = (layer.getLatLngs()[0] as L.LatLng[]).map(coord => ({ lat: coord.lat, lng: coord.lng }));
                    onPolygonCreated(latlngs);
                }
            });
        };

        map.on(L.Draw.Event.CREATED, onDrawCreated);
        map.on(L.Draw.Event.EDITED, onDrawEdited);

        return () => {
            map.off(L.Draw.Event.CREATED, onDrawCreated);
            map.off(L.Draw.Event.EDITED, onDrawEdited);
            if (drawControlRef.current) {
                map.removeControl(drawControlRef.current);
                drawControlRef.current = null;
            }
        };
    }, [map, onPolygonCreated]);

    return null;
};

// --- Componente para Camadas de Tile GEE ---
const GEETileLayerComponent: React.FC<{ tileUrl: string | null; opacity?: number; layerKey: number }> = ({ tileUrl, opacity = 1.0, layerKey }) => {
    if (!tileUrl) return null;
    return <TileLayer key={layerKey} url={tileUrl} attribution='&copy; Google Earth Engine / Sentinel-IA / Copernicus' opacity={opacity} zIndex={10} />;
};


// =========================================================
// 🎯 COMPONENTE PRINCIPAL (App)
// =========================================================
const App: React.FC = () => {
    // CRITICAL FIX 1: Define a variável de ambiente para a API
    const API_URL = import.meta.env.VITE_API_URL;

    // --- Estados ---
    const [polygonCoords, setPolygonCoords] = useState<Coordinate[]>([]);
    const [startDate] = useState<string>('2024-01-01');
    const [endDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

    const [layerA, setLayerA] = useState<LayerData>({ tileUrl: null, opacity: 0.8, dem: null, satellite: 'Sentinel-2_RGB', key: 1 });
    const [layerB, setLayerB] = useState<LayerData>({ tileUrl: null, opacity: 0.8, dem: null, satellite: 'Sentinel-1_VV', key: 1 });

    const [censoGeoJSON, setCensoGeoJSON] = useState<any>(null);
    const [censoOpacity, setCensoOpacity] = useState<number>(0.6);

    const [message, setMessage] = useState<string>('Desenhe um polígono no mapa para começar.');
    const [loading, setLoading] = useState<boolean>(false);

    const [imageResultsA, setImageResultsA] = useState<ImageResult[]>([]);
    const [imageResultsB, setImageResultsB] = useState<ImageResult[]>([]);

    const clearDrawRef = useRef<(() => void) | null>(null);

    const compositionOptions = [
        { value: 'Sentinel-2_RGB', label: 'Sentinel-2 (RGB)' },
        { value: 'Sentinel-2_FCC', label: 'Sentinel-2 (Falsa Cor IR)' },
        { value: 'NDVI', label: 'Índice de Vegetação (NDVI)' },
        { value: 'Sentinel-1_VV', label: 'SAR Sentinel-1 (VV)' },
        { value: 'Sentinel-1_VH', label: 'SAR Sentinel-1 (VH)' },
        { value: 'Sentinel-1_VV_VH_RGB', label: 'SAR Sentinel-1 (RGB Comp.)' },
        { value: 'DEM', label: 'Elevação (DEM SRTM)' },
    ];

    // --- Funções de Manipulação ---

    const handlePolygonCreated = (coords: Coordinate[]) => {
        setPolygonCoords(coords);
        setMessage(coords.length >= 3 ? `Polígono definido. Selecione as camadas e clique em Buscar/Analisar.` : 'Desenhe um polígono (mínimo 3 pontos).');
        setLayerA(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 }));
        setLayerB(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 }));
        setImageResultsA([]);
        setImageResultsB([]);
        setCensoGeoJSON(null);
    };

    const checkPolygon = useCallback(() => {
        if (polygonCoords.length < 3) {
            setMessage('ATENÇÃO: Desenhe um polígono válido (mínimo 3 pontos) no mapa.');
            return false;
        }
        return true;
    }, [polygonCoords]);

    const clearAll = useCallback(() => {
        if (clearDrawRef.current) clearDrawRef.current();
        setPolygonCoords([]);
        setLayerA(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 }));
        setLayerB(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 }));
        setImageResultsA([]);
        setImageResultsB([]);
        setCensoGeoJSON(null);
        setMessage('Área limpa. Desenhe um novo polígono.');
    }, []);

    // =========================================================
    // 🎯 FUNÇÕES GEOJSON (Estilo, Popup, Tooltip, Carregamento)
    // =========================================================

    const defaultCensoStyle = {
        fillColor: '#4F4F4F',
        weight: 1,
        opacity: 1,
        color: '#666',
        fillOpacity: censoOpacity * 0.6
    };

    const highlightCensoStyle = {
        weight: 3,
        color: '#DAA520',
        fillOpacity: censoOpacity * 0.8
    };

    // ATUALIZADO: Mostra 'source_file' no popup
    const onEachFeatureCenso = (feature: any, layer: L.Layer) => {
        const props = feature.properties;

        // Tooltip (Nome da Feature Unit)
        if (props && props.nm_fcu) {
            layer.bindTooltip(props.nm_fcu, {
                sticky: true,
                direction: 'top',
                className: 'censo-tooltip'
            });
        }

        // Popup (Todas as propriedades + Arquivo de Origem)
        if (props) {
            let popupContent = `<div style="max-height: 150px; overflow-y: auto;"><strong>Origem:</strong> ${props.source_file || 'N/A'}<hr/>`; // Mostra o arquivo de origem
            for (const key in props) {
                // Exclui a propriedade source_file duplicada e geometrias
                if (Object.prototype.hasOwnProperty.call(props, key) && key !== 'source_file' && key.toLowerCase() !== 'geometry') {
                     popupContent += `<strong>${key}:</strong> ${props[key] || 'N/A'}<br/>`;
                }
            }
             popupContent += '</div>';
            layer.bindPopup(popupContent);
        }

        // Efeitos de Hover
        layer.on({
            mouseover: (e) => {
                const targetLayer = e.target;
                targetLayer.setStyle(highlightCensoStyle);
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    targetLayer.bringToFront();
                }
            },
            mouseout: (e) => {
                 if (geojsonRef.current) {
                     geojsonRef.current.resetStyle(e.target);
                 }
            }
        });
    };

    // ATUALIZADO: Mensagens refletem múltiplos arquivos
    const loadCensoData = async () => {
        if (censoGeoJSON) {
            setCensoGeoJSON(null);
            setMessage('Camadas GeoJSON removidas.');
            return;
        }
        if (!checkPolygon()) return;
        setLoading(true);
        setMessage('Buscando e recortando dados GeoJSON...'); // Mensagem atualizada

        try {
            // CRITICAL FIX 1: Usando API_URL
            const response = await fetch(`${API_URL}/censo_analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ polygon: polygonCoords }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Erro HTTP: ${response.status}.`);
            }
            const data = await response.json();
            if (!data || data.type !== "FeatureCollection" || !data.features) {
                 throw new Error("Resposta inválida do servidor (esperado GeoJSON FeatureCollection).");
            }
            if (data.features.length === 0) {
                 setMessage('Nenhuma feição GeoJSON encontrada na área desenhada nos arquivos configurados.');
                 setCensoGeoJSON({ type: "FeatureCollection", features: [] });
            } else {
                 setCensoGeoJSON(data);
                 setMessage(`${data.features.length} feições GeoJSON carregadas.`); // Mensagem atualizada
            }
        } catch (error: any) {
            // Se falhar, o erro "Failed to fetch" (localhost) será capturado aqui
            setMessage(`ERRO ao carregar dados GeoJSON: ${error.message}. Verifique o console para CORS/localhost.`);
            console.error('Erro detalhado:', error);
            setCensoGeoJSON(null);
        } finally {
            setLoading(false);
        }
    };

    const geojsonRef = useRef<LeafletGeoJSON | null>(null);
    const censoLayerKey = `censo-${censoOpacity}`;

    // =========================================================
    // 🎯 FUNÇÃO GENÉRICA PARA BUSCAR DADOS GEE - Corrigida a URL
    // =========================================================
    const fetchData = async (
        layerId: 'A' | 'B',
        endpoint: 'analyze' | 'composite_analysis' | 'dem_analysis' | 'ndvi_analysis',
        dataType: string,
        setLayerFunc: React.Dispatch<React.SetStateAction<LayerData>>,
        setImageResultsFunc?: React.Dispatch<React.SetStateAction<ImageResult[]>>
    ) => {
        if (!checkPolygon()) return;
        setLoading(true);
        setMessage(`Buscando dados: ${dataType} para Camada ${layerId}...`);
        if (setImageResultsFunc) setImageResultsFunc([]);
        const requestBody: any = {
             polygon: polygonCoords,
             start_date: startDate,
             end_date: endDate,
             satellite: dataType
        };
        // CRITICAL FIX 1: Usando API_URL
        const url = `${API_URL}/${endpoint}`;
        try {
             const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Erro ${response.status} ao buscar ${dataType}.`);
            }
             const data = await response.json();
             if (endpoint === 'analyze') {
                 if (!data.available_images || data.available_images.length === 0) {
                     throw new Error(`Nenhuma imagem individual encontrada para ${dataType}.`);
                 }
                 if (setImageResultsFunc) setImageResultsFunc(data.available_images);
                 setLayerFunc(prev => ({ ...prev, tileUrl: data.available_images[0]?.tile_url || null, dem: null, key: prev.key + 1 }));
                 setMessage(`${data.available_images.length} imagens (${dataType}) encontradas para Camada ${layerId}. Exibindo a mais recente.`);
             }
             else if (endpoint === 'dem_analysis') {
                  setLayerFunc(prev => ({ ...prev, tileUrl: data.tile_url, dem: data, key: prev.key + 1 }));
                  setMessage(`Elevação (DEM) carregada para Camada ${layerId}.`);
             }
             else {
                  setLayerFunc(prev => ({ ...prev, tileUrl: data.tile_url, dem: null, key: prev.key + 1 }));
                  const label = endpoint === 'ndvi_analysis' ? 'NDVI' : 'Mosaico';
                  setMessage(`${label} (${dataType}) carregado para Camada ${layerId}.`);
             }
        } catch (error: any) {
            setMessage(`ERRO (Camada ${layerId} - ${dataType}): ${error.message}`);
            console.error(`Erro ${endpoint} ${dataType}:`, error);
            setLayerFunc(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 }));
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers específicos para os botões - Sem alterações aqui ---
    const handleGenericFetch = (layerId: 'A' | 'B') => {
        const layerState = layerId === 'A' ? layerA : layerB;
        const setLayerFunc = layerId === 'A' ? setLayerA : setLayerB;
        const setImageResultsFunc = layerId === 'A' ? setImageResultsA : setImageResultsB;
        const dataType = layerState.satellite;
        if (dataType === 'DEM') {
            fetchData(layerId, 'dem_analysis', dataType, setLayerFunc);
        } else if (dataType === 'NDVI') {
            fetchData(layerId, 'ndvi_analysis', dataType, setLayerFunc);
        } else {
             fetchData(layerId, 'analyze', dataType, setLayerFunc, setImageResultsFunc);
        }
    };
    const handleFetchComposite = (layerId: 'A' | 'B') => {
        const layerState = layerId === 'A' ? layerA : layerB;
        const setLayerFunc = layerId === 'A' ? setLayerA : setLayerB;
        const dataType = layerState.satellite;
        if (dataType === 'DEM' || dataType === 'NDVI') {
             setMessage(`Ação 'Mosaico' não aplicável para ${dataType}. Use 'Buscar Dados'.`);
             return;
        }
         fetchData(layerId, 'composite_analysis', dataType, setLayerFunc);
    };
    const handleImageSelect = (layerId: 'A' | 'B', tileUrl: string) => {
        const setLayerFunc = layerId === 'A' ? setLayerA : setLayerB;
        setLayerFunc(prev => ({ ...prev, tileUrl, dem: null, key: prev.key + 1 }));
    };

    // --- Renderização do Controle de Camada - Sem alterações aqui ---
    const renderLayerControl = (
        layerId: 'A' | 'B',
        layer: LayerData,
        setLayer: React.Dispatch<React.SetStateAction<LayerData>>,
        imageResults: ImageResult[],
    ) => (
        <div key={layerId} className="layer-control">
            <h3>Camada {layerId}</h3>
            <select
                value={layer.satellite}
                onChange={(e) => {
                    setLayer(prev => ({ ...prev, satellite: e.target.value, tileUrl: null, dem: null, key: prev.key + 1 }));
                    if (layerId === 'A') setImageResultsA([]); else setImageResultsB([]);
                }}
                disabled={loading}
            >
                {compositionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <div className="button-group">
                 <button onClick={() => handleGenericFetch(layerId)} disabled={loading || polygonCoords.length < 3} title={layer.satellite === 'DEM' || layer.satellite === 'NDVI' ? `Buscar ${layer.satellite}` : 'Buscar imagens individuais'}>
                    🔍 Buscar Dados
                </button>
                {(layer.satellite.includes('Sentinel-1') || layer.satellite.includes('Sentinel-2')) && (
                    <button onClick={() => handleFetchComposite(layerId)} disabled={loading || polygonCoords.length < 3} title="Criar mosaico com imagens do período">
                        🖼️ Mosaico
                    </button>
                )}
            </div>
            <label>Opacidade:</label>
            <input
                type="range" min="0" max="1" step="0.05"
                value={layer.opacity}
                onChange={(e) => setLayer(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                disabled={loading || !layer.tileUrl}
            />
            {layer.dem && layer.satellite === 'DEM' && (
                <div className="dem-stats">
                    <p>Elevação Mín: {layer.dem.min_elevation?.toFixed(1) ?? 'N/A'} m</p>
                    <p>Elevação Máx: {layer.dem.max_elevation?.toFixed(1) ?? 'N/A'} m</p>
                </div>
            )}
             {imageResults.length > 0 && (layer.satellite.includes('Sentinel-1') || layer.satellite.includes('Sentinel-2')) && (
                <div className="image-results">
                    <h4>Imagens Encontradas ({layer.satellite}):</h4>
                    {imageResults.map(img => (
                        <div
                            key={img.tile_url}
                            className={`image-card ${layer.tileUrl === img.tile_url ? 'selected' : ''}`}
                            onClick={() => handleImageSelect(layerId, img.tile_url)}
                            title={`Selecionar imagem de ${img.date}`}
                        >
                            <strong>{img.date}</strong>
                        </div>
                    ))}
                </div>
            )}
            <hr />
        </div>
    );

    // --- Renderização Principal ---
    return (
        <div className="app-container">
            {/* Barra Lateral */}
            <div className="sidebar">
                <h1>Harpia | GeoViewer</h1>
                <p>{loading ? 'Processando solicitação...' : message}</p>
                <button onClick={clearAll} disabled={loading} className="clear-button">
                    🧹 LIMPAR MAPA E DADOS
                </button>
                <hr/>
                {/* Seção GeoJSON */}
                 <h2>Análise Vetorial</h2>
                 <button onClick={loadCensoData} disabled={loading || polygonCoords.length < 3} className="layer-button" style={{ backgroundColor: censoGeoJSON ? '#8B4513' : '#B8860B' }}>
                     🗺️ {censoGeoJSON ? 'REMOVER CAMADAS GEOJSON' : 'CARREGAR CAMADAS GEOJSON'}
                 </button>
                 {censoGeoJSON && (
                      <div className="opacity-control">
                         <label>Opacidade Camadas GeoJSON:</label>
                         <input
                             type="range" min="0" max="1" step="0.05"
                             value={censoOpacity}
                             onChange={(e) => setCensoOpacity(parseFloat(e.target.value))}
                             disabled={loading}
                         />
                     </div>
                 )}
                 <hr/>
                {/* Controles das Camadas A e B */}
                {renderLayerControl('A', layerA, setLayerA, imageResultsA)}
                {renderLayerControl('B', layerB, setLayerB, imageResultsB)}
            </div>

            {/* Wrapper do Mapa */}
            <div className="map-wrapper">
                <MapContainer
                    center={[-1.35, -48.4]}
                    zoom={11}
                    scrollWheelZoom={true}
                    className="leaflet-map"
                    zoomControl={false}
                >
                    {/* CRITICAL FIX 2: Trocado Stadia Maps (401) por OpenStreetMap (Grátis) */}
                    <TileLayer
                       attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // <-- Solução
                        zIndex={0}
                    />
                     <ZoomControl position="topright" />
                    <DrawControl onPolygonCreated={handlePolygonCreated} clearRef={clearDrawRef} />

                    {/* Camada GeoJSON */}
                    {censoGeoJSON && (
                        <GeoJSON
                             ref={geojsonRef}
                             key={censoLayerKey} // Chave dinâmica
                             data={censoGeoJSON}
                             style={defaultCensoStyle as unknown as StyleFunction}
                             onEachFeature={onEachFeatureCenso}
                        />
                    )}

                    {/* Camadas GEE */}
                    {layerB.tileUrl && <GEETileLayerComponent tileUrl={layerB.tileUrl} opacity={layerB.opacity} layerKey={layerB.key} />}
                    {layerA.tileUrl && <GEETileLayerComponent tileUrl={layerA.tileUrl} opacity={layerA.opacity} layerKey={layerA.key} />}

                    {/* Legenda (Comentada) */}
                    {/* {censoGeoJSON && <MapLegend />} */}

                </MapContainer>
            </div>
        </div>
    );
};

export default App;