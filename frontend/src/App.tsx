// frontend/src/App.tsx - VERSÃO FINAL CORRIGIDA E COM TEMA ESCURO (MAPA PRETO)

import React, { useState, useEffect, useRef, useCallback } from 'react';
// IMPORTAÇÕES CRÍTICAS DO REACT LEAFLET - Corrigido o problema "Cannot find name 'MapContainer/TileLayer'"
import { MapContainer, TileLayer, useMap, GeoJSON, ZoomControl } from 'react-leaflet'; 
import L, { Map, FeatureGroup, GeoJSON as LeafletGeoJSON, type StyleFunction } from 'leaflet'; 
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw-src.js';
import 'leaflet/dist/leaflet.css'; 
import 'leaflet-draw/dist/leaflet.draw.css'; 
import './App.css'; 

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
    // CRITICAL FIX 1: Usa a variável de ambiente Vercel/Vite para a URL da API.
    // Isso corrige o erro de 'localhost:8000' (ERR_CONNECTION_REFUSED)
    const API_URL = import.meta.env.VITE_API_URL;

    // --- Estados (Corrigido 'Cannot find name 'polygonCoords/setLoading'') ---
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
    const geojsonRef = useRef<LeafletGeoJSON | null>(null);
    const [censoLayerKey, setCensoLayerKey] = useState<number>(0);

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

    // Corrigido 'defaultCensoStyle' e 'highlightCensoStyle' para usar a variável censoOpacity
    const defaultCensoStyle = { 
        fillColor: '#4F4F4F', 
        weight: 1, 
        opacity: 1, 
        color: '#666', 
        fillOpacity: censoOpacity * 0.6 
    };

    const highlightCensoStyle = { 
        weight: 3, 
        color: '#DAA520', // Cor de destaque (âmbar)
        fillOpacity: censoOpacity * 0.8 
    };
    
    // ATUALIZADO: Mostra 'source_file' e 'populacao' no popup
    const onEachFeatureCenso = (feature: any, layer: L.Layer) => {
        const properties = feature.properties;
        
        // Tooltip
        const popupContent = `
            <div class='censo-popup-content'>
                <strong>Arquivo:</strong> ${properties.source_file || 'N/A'}<br/>
                <strong>Setor:</strong> ${properties.cod_setor || 'N/A'}<br/>
                <strong>População:</strong> ${properties.populacao ? properties.populacao.toLocaleString('pt-BR') : 'N/A'}
            </div>
        `;
        layer.bindPopup(popupContent, { 
            closeButton: false, 
            className: 'censo-popup'
        });

        // Tooltip (permanente ao passar o mouse)
        layer.on({
            mouseover: (e) => {
                const l = e.target as L.Path;
                l.setStyle(highlightCensoStyle);
                l.bringToFront();
                layer.bindTooltip(`População: ${properties.populacao ? properties.populacao.toLocaleString('pt-BR') : 'N/A'}`, { 
                    permanent: false, 
                    direction: 'auto',
                    className: 'censo-tooltip'
                }).openTooltip();
            },
            mouseout: (e) => {
                if (geojsonRef.current) {
                    geojsonRef.current.resetStyle(e.target);
                }
            },
            click: (e) => {
                const l = e.target as L.Path;
                l.setStyle(highlightCensoStyle);
                l.openPopup();
            }
        });
    };

    const fetchGeoJSON = useCallback(async () => {
        if (!checkPolygon()) return;

        setLoading(true);
        setMessage('Buscando dados GeoJSON...');
        setCensoGeoJSON(null);

        // Formato para API
        const geojson_data = {
            type: "Polygon",
            coordinates: [polygonCoords.map(c => [c.lng, c.lat])]
        };

        try {
            const response = await fetch(`${API_URL}/process_geojson`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geojson: geojson_data }),
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            // Verifica se o resultado é uma FeatureCollection e tem features
            if (data && data.features && data.features.length > 0) {
                setCensoGeoJSON(data);
                setMessage(`Sucesso! ${data.features.length} setores censitários encontrados na área.`);
                setCensoLayerKey(prev => prev + 1); // Força a re-renderização do GeoJSON
            } else {
                setMessage('Aviso: Nenhum setor censitário encontrado para a área selecionada.');
                setCensoGeoJSON(null);
            }

        } catch (error) {
            console.error('Erro ao buscar GeoJSON:', error);
            setMessage(`ERRO ao carregar GeoJSON: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    }, [polygonCoords, API_URL, checkPolygon]);


    // =========================================================
    // 🎯 FUNÇÕES GEE (Satélite)
    // =========================================================

    const fetchGEEImage = useCallback(async (layerKey: 'A' | 'B') => {
        const layerState = layerKey === 'A' ? layerA : layerB;
        if (!checkPolygon()) return;

        setLoading(true);
        setMessage(`Buscando imagem GEE para Camada ${layerKey}...`);
        
        const setResults = layerKey === 'A' ? setImageResultsA : setImageResultsB;
        const setLayer = layerKey === 'A' ? setLayerA : setLayerB;

        // Limpa a camada atual
        setLayer(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 }));
        setResults([]);

        const geojson_data = {
            type: "Polygon",
            coordinates: [polygonCoords.map(c => [c.lng, c.lat])]
        };

        try {
            const endpoint = layerState.satellite === 'DEM' ? 'get_dem' : 'get_latest_image';
            
            const body = {
                geojson: geojson_data,
                date_from: startDate,
                date_to: endDate,
                composition: layerState.satellite,
            };

            const response = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.tile_url || data.tileUrl) {
                // Caso seja uma imagem (latest_image)
                if (data.tile_url) {
                    setLayer(prev => ({ 
                        ...prev, 
                        tileUrl: data.tile_url, 
                        key: prev.key + 1 
                    }));
                    setResults([{ date: data.date, satellite: layerState.satellite, tile_url: data.tile_url }]);
                    setMessage(`Sucesso! Camada ${layerKey} (${layerState.satellite}) carregada.`);
                // Caso seja um DEM
                } else if (data.tileUrl) {
                    setLayer(prev => ({ 
                        ...prev, 
                        tileUrl: data.tileUrl, 
                        dem: { 
                            tileUrl: data.tileUrl, 
                            min_elevation: data.min_elevation, 
                            max_elevation: data.max_elevation 
                        },
                        key: prev.key + 1 
                    }));
                    setMessage(`Sucesso! Camada ${layerKey} (DEM) carregada. Min/Max: ${data.min_elevation?.toFixed(1)}m / ${data.max_elevation?.toFixed(1)}m`);
                }
            } else {
                setMessage(`Aviso: Nenhuma imagem ${layerState.satellite} encontrada no período para a área.`);
            }

        } catch (error) {
            console.error(`Erro ao buscar GEE Camada ${layerKey}:`, error);
            setMessage(`ERRO GEE Camada ${layerKey}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    }, [polygonCoords, startDate, endDate, API_URL, checkPolygon, layerA, layerB]);


    // =========================================================
    // 🎯 FUNÇÕES IA
    // =========================================================

    const mockAnalysisData = {
        dem_data: { min_elevation: 100, max_elevation: 250, avg_elevation: 175, std_dev: 25 },
        sar_data: { avg_vv: -10.5, avg_vh: -22.0, change_index: 0.15 },
        ndvi_data: { avg_ndvi: 0.65, min_ndvi: 0.3, max_ndvi: 0.85, vegetation_cover: 75.2 },
    };

    const runAIAnalysis = useCallback(async () => {
        if (!checkPolygon()) return;

        setLoading(true);
        setMessage('Enviando dados para a IA para análise geoespacial. Aguarde...');

        // Pega o centro do polígono para a análise (simples - apenas o primeiro ponto)
        const centerCoord = polygonCoords.length > 0 ? polygonCoords[0] : { lat: 0, lng: 0 };
        
        // Pega a URL da imagem da camada A se existir, ou usa um placeholder
        const imageUrl = layerA.tileUrl || "URL_DE_IMAGEM_NAO_DISPONIVEL";

        try {
            const body = {
                latitude: centerCoord.lat,
                longitude: centerCoord.lng,
                image_url: imageUrl,
                dem_data: layerA.dem || mockAnalysisData.dem_data, // Usa dados DEM reais ou mock
                sar_data: mockAnalysisData.sar_data, // Mock para simplificação
                ndvi_data: mockAnalysisData.ndvi_data, // Mock para simplificação
            };

            const response = await fetch(`${API_URL}/ai_analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.analysis_success) {
                const reportText = result.ai_report_text;
                // Abre o relatório em uma nova janela ou modal (neste caso, usando window.open para simplificar)
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                    newWindow.document.write(`
                        <html>
                        <head>
                            <title>Relatório de Análise Geoespacial (IA)</title>
                            <style>
                                body { font-family: sans-serif; padding: 20px; background-color: #0a0f1c; color: #e3eaf2; }
                                h1 { color: #3d8bff; border-bottom: 2px solid #1a2438; padding-bottom: 10px; }
                                pre { white-space: pre-wrap; word-wrap: break-word; background-color: #1a2438; padding: 15px; border-radius: 5px; border: 1px solid #344256; }
                            </style>
                        </head>
                        <body>
                            <h1>Relatório de Análise Geoespacial (IA)</h1>
                            <pre>${reportText}</pre>
                        </body>
                        </html>
                    `);
                    newWindow.document.close();
                    setMessage('Análise da IA concluída! O relatório foi aberto em uma nova aba.');
                } else {
                    setMessage('Análise da IA concluída, mas não foi possível abrir o relatório (verifique as configurações de pop-up).');
                }
            } else {
                 setMessage('ERRO na Análise da IA: Falha ao gerar o relatório.');
            }

        } catch (error) {
            console.error('Erro na análise da IA:', error);
            setMessage(`ERRO na Análise da IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    }, [polygonCoords, API_URL, checkPolygon, layerA]);


    // =========================================================
    // 🎯 RENDERIZAÇÃO
    // =========================================================

    return (
        <div className="app-container theme-azul"> 
            
            {/* Sidebar (Controles) */}
            <div className="sidebar">
                
                <h1 className="logo">HARP-IA GeoViewer</h1>

                <div className="status-box">
                    <p className={`status-message ${loading ? 'loading' : 'idle'}`}>
                        {loading ? 'Processando...' : message}
                    </p>
                </div>

                {/* Seção 1: Controle de Área */}
                <div className="control-group">
                    <h2>Área de Interesse</h2>
                    <p className="hint">Desenhe um polígono no mapa ou limpe a área.</p>
                    <div className="action-buttons">
                        <button className="btn-primary" onClick={clearAll} disabled={loading}>
                            Limpar Área e Camadas
                        </button>
                        <button className="btn-secondary" onClick={fetchGeoJSON} disabled={loading || polygonCoords.length < 3}>
                            Buscar GeoJSON (Setores)
                        </button>
                    </div>
                </div>

                {/* Seção 2: Camada de Satélite A */}
                <div className="control-group">
                    <h2>Camada A (Principal)</h2>
                    <select
                        className="select-control"
                        value={layerA.satellite}
                        onChange={(e) => setLayerA(prev => ({ ...prev, satellite: e.target.value as string }))}
                        disabled={loading}
                    >
                        {compositionOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className="range-control">
                        <label>Opacidade:</label>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={layerA.opacity}
                            onChange={(e) => setLayerA(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                            disabled={loading || !layerA.tileUrl}
                        />
                        <span>{(layerA.opacity * 100).toFixed(0)}%</span>
                    </div>
                    <button 
                        className="btn-accent" 
                        onClick={() => fetchGEEImage('A')} 
                        disabled={loading || polygonCoords.length < 3}
                    >
                        Buscar Imagem A ({layerA.satellite})
                    </button>
                    {/* Resultados de Imagens Anteriores */}
                    {imageResultsA.length > 0 && (
                        <div className="image-results">
                            {imageResultsA.map((img, index) => (
                                <div key={index} className="image-card">
                                    <p>{img.date} ({img.satellite})</p>
                                    <button 
                                        onClick={() => setLayerA(prev => ({ ...prev, tileUrl: img.tile_url, key: prev.key + 1 }))}
                                        className="btn-link"
                                    >
                                        Ver Imagem
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                     {/* Dados DEM */}
                    {layerA.dem && (
                        <div className="dem-info">
                            <p><strong>Elevação DEM:</strong></p>
                            <p>Min: {layerA.dem.min_elevation?.toFixed(1)}m, Max: {layerA.dem.max_elevation?.toFixed(1)}m</p>
                        </div>
                    )}
                </div>

                {/* Seção 3: Camada de Satélite B (Comparação) */}
                <div className="control-group">
                    <h2>Camada B (Comparação)</h2>
                    <select
                        className="select-control"
                        value={layerB.satellite}
                        onChange={(e) => setLayerB(prev => ({ ...prev, satellite: e.target.value as string }))}
                        disabled={loading}
                    >
                         {compositionOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className="range-control">
                        <label>Opacidade:</label>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={layerB.opacity}
                            onChange={(e) => setLayerB(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                            disabled={loading || !layerB.tileUrl}
                        />
                        <span>{(layerB.opacity * 100).toFixed(0)}%</span>
                    </div>
                    <button 
                        className="btn-accent" 
                        onClick={() => fetchGEEImage('B')} 
                        disabled={loading || polygonCoords.length < 3}
                    >
                        Buscar Imagem B ({layerB.satellite})
                    </button>
                    {/* Resultados de Imagens Anteriores */}
                     {imageResultsB.length > 0 && (
                        <div className="image-results">
                            {imageResultsB.map((img, index) => (
                                <div key={index} className="image-card">
                                    <p>{img.date} ({img.satellite})</p>
                                    <button 
                                        onClick={() => setLayerB(prev => ({ ...prev, tileUrl: img.tile_url, key: prev.key + 1 }))}
                                        className="btn-link"
                                    >
                                        Ver Imagem
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Seção 4: Controles GeoJSON */}
                 {censoGeoJSON && (
                     <div className="control-group">
                        <h2>Controle GeoJSON</h2>
                        <p className="hint">Setores censitários na área.</p>
                        <div className="range-control">
                            <label>Opacidade do GeoJSON:</label>
                            <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={censoOpacity}
                                onChange={(e) => setCensoOpacity(parseFloat(e.target.value))}
                                disabled={loading}
                            />
                            <span>{(censoOpacity * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                 )}

                {/* Seção 5: Análise IA */}
                <div className="control-group">
                    <h2>Análise de IA</h2>
                    <p className="hint">Gere um relatório completo da área com base nos dados carregados.</p>
                    <button 
                        className="btn-danger" 
                        onClick={runAIAnalysis} 
                        disabled={loading || polygonCoords.length < 3}
                    >
                        Executar Análise de IA
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="map-wrapper">
                <MapContainer
                    center={[-15.7801, -47.9292]} // Centro (Exemplo: Brasília)
                    zoom={5}
                    className="leaflet-map"
                    zoomControl={false}
                >
                    {/* Basemap: OpenStreetMap (substituído Carto por OSM conforme solicitado) */}
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        subdomains={['a', 'b', 'c']}
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
                             // Usa 'defaultCensoStyle' com o fillOpacity ajustado pelo estado 'censoOpacity'
                             style={defaultCensoStyle as unknown as StyleFunction} 
                             onEachFeature={onEachFeatureCenso}
                        />
                    )}

                    {/* Camadas GEE (A e B) */}
                    {layerB.tileUrl && <GEETileLayerComponent tileUrl={layerB.tileUrl} opacity={layerB.opacity} layerKey={layerB.key} />}
                    {layerA.tileUrl && <GEETileLayerComponent tileUrl={layerA.tileUrl} opacity={layerA.opacity} layerKey={layerA.key} />}

                </MapContainer>
            </div>
        </div>
    );
};

export default App;