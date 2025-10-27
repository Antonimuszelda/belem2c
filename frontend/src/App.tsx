// frontend/src/App.tsx - VERSÃO FINAL CORRIGIDA

import React, { useState, useEffect, useRef, useCallback } from 'react';
// CORREÇÃO 1: Usar 'import type' para tipos do geojson
import type { Feature, Geometry, FeatureCollection as GeoJSONFeatureCollection } from 'geojson';
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap } from 'react-leaflet'; // useMap re-adicionado para DrawControl
import L, { type StyleFunction } from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw-src.js';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './App.css';

// --- Ícones Leaflet ---
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});

// --- Interfaces ---
interface Coordinate { lat: number; lng: number; }
interface DEMResult { tileUrl: string; min_elevation?: number | null; max_elevation?: number | null; }
interface LayerData {
    tileUrl: string | null;
    opacity: number;
    dem: DEMResult | null;
    satellite: string;
    key: number;
}
// Usar o tipo importado
interface GeoJSONData extends GeoJSONFeatureCollection {}
type ClearDrawRef = React.MutableRefObject<(() => void) | null>;

// --- Componente GEE Tile Layer ---
interface GEETileLayerProps { tileUrl: string; opacity: number; layerKey: number; }
const GEETileLayerComponent: React.FC<GEETileLayerProps> = ({ tileUrl, opacity, layerKey }) => {
    return tileUrl ? (
        <TileLayer key={layerKey} url={tileUrl} opacity={opacity} attribution="Google Earth Engine" zIndex={10} />
    ) : null;
};

// --- Componente Draw Control ---
interface DrawControlProps {
    onPolygonCreated: (coords: Coordinate[]) => void;
    clearRef: ClearDrawRef;
}
const DrawControl: React.FC<DrawControlProps> = ({ onPolygonCreated, clearRef }) => {
     // CORREÇÃO 3: Reintroduzido useMap pois é necessário para Leaflet.Draw
     const map = useMap();
     const featureGroupRef = useRef<L.FeatureGroup>(L.featureGroup()).current;
     useEffect(() => {
         // Lógica real do DrawControl usando 'map'
         map.addLayer(featureGroupRef);
         const drawControl = new L.Control.Draw({
             edit: { featureGroup: featureGroupRef },
             draw: { polygon: { shapeOptions: { color: '#DAA520' } }, polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false },
         });
         map.addControl(drawControl);
         const handleCreated = (e: L.DrawEvents.Created) => {
             const layer = e.layer as L.Polygon;
             featureGroupRef.clearLayers();
             featureGroupRef.addLayer(layer);
             const latlngs = layer.getLatLngs()[0] as L.LatLng[];
             onPolygonCreated(latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng })));
         };
         map.on(L.Draw.Event.CREATED, handleCreated as L.LeafletEventHandlerFn);
         if (clearRef && 'current' in clearRef) { clearRef.current = () => featureGroupRef.clearLayers(); }
         return () => {
             // Cleanup: remove controle e listener
             if (map && drawControl) { // Verifica se map existe antes de remover
                try { // Adiciona try/catch para robustez no cleanup
                 map.removeControl(drawControl);
                 map.off(L.Draw.Event.CREATED, handleCreated as L.LeafletEventHandlerFn);
                } catch (error) {
                    console.warn("Erro ao limpar DrawControl:", error)
                }
             }
         };
     }, [map, onPolygonCreated, clearRef, featureGroupRef]); // Dependência 'map' adicionada
    return null;
};

// =========================================================
// COMPONENTE PRINCIPAL APP
// =========================================================
const App: React.FC = () => {
    // --- Estados e Refs ---
    const [selectedPolygon, setSelectedPolygon] = useState<Coordinate[] | null>(null);
    const [censoGeoJSON, setCensoGeoJSON] = useState<GeoJSONData | null>(null);
    const [heatIslandData, setHeatIslandData] = useState<GeoJSONData | null>(null);
    const [layerA, setLayerA] = useState<LayerData>({ tileUrl: null, opacity: 0.8, dem: null, satellite: 'Sentinel-2_RGB', key: 1 });
    const [layerB, setLayerB] = useState<LayerData>({ tileUrl: null, opacity: 0.8, dem: null, satellite: 'Sentinel-1_VV', key: 2 });
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('Desenhe um polígono no mapa.');
    const clearDrawRef = useRef<(() => void) | null>(null) as ClearDrawRef;
    const geojsonRef = useRef<L.GeoJSON | null>(null);
    const heatIslandRef = useRef<L.GeoJSON | null>(null);
    const [censoLayerKey, setCensoLayerKey] = useState<number>(0);
    const [heatIslandKey, setHeatIslandKey] = useState<number>(0);

    // --- Constantes ---
    const API_URL = import.meta.env.VITE_API_URL || 'https://harp-iademo-production.up.railway.app';
    const compositionOptions = [
        { value: 'Sentinel-2_RGB', label: 'S2 (RGB)' }, { value: 'Sentinel-2_FCC', label: 'S2 (FCC)' }, { value: 'NDVI', label: 'NDVI' },
        { value: 'Sentinel-1_VV', label: 'S1 (VV)' }, { value: 'Sentinel-1_VH', label: 'S1 (VH)' }, { value: 'DEM', label: 'DEM' },
    ];

    // --- Funções Auxiliares ---
    const handlePolygonCreated = useCallback((coords: Coordinate[]) => { 
        setSelectedPolygon(coords); 
        setMessage('Polígono definido.'); 
        setCensoGeoJSON(null); 
        setHeatIslandData(null); 
        setLayerA(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 })); 
        setLayerB(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 })); 
    }, []);

    const clearAll = useCallback(() => { 
        if (clearDrawRef.current) clearDrawRef.current(); 
        setSelectedPolygon(null); 
        setCensoGeoJSON(null); 
        setHeatIslandData(null); 
        setLayerA(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 })); 
        setLayerB(prev => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 })); 
        setMessage('Área limpa.'); 
    }, []);

    const checkPolygon = useCallback((): boolean => { 
        if (!selectedPolygon || selectedPolygon.length < 3) { 
            setMessage('Desenhe um polígono.'); 
            return false; 
        } 
        return true; 
    }, [selectedPolygon]);

    // --- Chamadas de API ---
    const fetchGeoJSON = useCallback(async () => {
        if (!checkPolygon()) return; 
        setLoading(true); 
        setMessage('Buscando Favelas/Comunidades...'); 
        setCensoGeoJSON(null); 
        const polygonGeoJSON = { type: 'Polygon', coordinates: [selectedPolygon!.map((c: Coordinate) => [c.lng, c.lat])] }; 
        try { 
            const response = await fetch(`${API_URL}/process_geojson`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geojson: polygonGeoJSON }), }); 
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`); 
            const data: GeoJSONData = await response.json(); 
            if (data.features.length > 0) { 
                setCensoGeoJSON(data); 
                setMessage(`${data.features.length} feições.`); 
                setCensoLayerKey(prev => prev + 1); 
            } else { 
                setMessage('Nenhuma feição encontrada.'); 
            } 
        } catch (err) { 
            setMessage(`ERRO GeoJSON: ${(err as Error).message}`); 
            console.error(err); 
        } finally { 
            setLoading(false); 
        } 
    }, [selectedPolygon, API_URL, checkPolygon]);

    const fetchGEEImage = useCallback(async (layerKey: 'A' | 'B') => {
        if (!checkPolygon()) return; 
        const layerState = layerKey === 'A' ? layerA : layerB; 
        const setLayer = layerKey === 'A' ? setLayerA : setLayerB; 
        setLoading(true); 
        setMessage(`Buscando ${layerState.satellite}...`); 
        setLayer((prev: LayerData) => ({ ...prev, tileUrl: null, dem: null, key: prev.key + 1 })); 
        const polygonGeoJSON = { type: 'Polygon', coordinates: [selectedPolygon!.map((c: Coordinate) => [c.lng, c.lat])] }; 
        const endpoint = layerState.satellite === 'DEM' ? 'get_dem' : 'get_latest_image'; 
        const body = { geojson: polygonGeoJSON, date_from: '2024-01-01', date_to: new Date().toISOString().split('T')[0], composition: layerState.satellite, }; 
        try { 
            const response = await fetch(`${API_URL}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), }); 
            if (!response.ok) { 
                const errorData = await response.json().catch(async () => ({ detail: await response.text() })); 
                if (response.status === 503 && typeof errorData.detail === 'string' && errorData.detail.includes("GEE")) { 
                    throw new Error("GEE não inicializado no backend."); 
                } 
                throw new Error(`HTTP ${response.status}: ${errorData.detail || 'Erro servidor'}`); 
            } 
            const data = await response.json(); 
            if (data.tileUrl || data.tile_url) { 
                const url = data.tileUrl || data.tile_url; 
                const demData = data.tileUrl ? { tileUrl: url, min_elevation: data.min_elevation, max_elevation: data.max_elevation } : null; 
                setLayer((prev: LayerData) => ({ ...prev, tileUrl: url, dem: demData, key: prev.key + 1 })); 
                setMessage(`Camada ${layerKey} carregada.`); 
            } else { 
                setMessage(`Nenhuma imagem ${layerState.satellite} encontrada.`); 
            } 
        } catch (err) { 
            setMessage(`ERRO GEE ${layerKey}: ${(err as Error).message}`); 
            console.error(err); 
        } finally { 
            setLoading(false); 
        } 
    }, [selectedPolygon, API_URL, checkPolygon, layerA, layerB]);

    const fetchHeatIsland = useCallback(async () => {
        if (!checkPolygon()) return; 
        setLoading(true); 
        setMessage('Analisando Ilhas de Calor...'); 
        setHeatIslandData(null); 
        const polygonGeoJSON = { type: 'Polygon', coordinates: [selectedPolygon!.map((c: Coordinate) => [c.lng, c.lat])] }; 
        try { 
            const response = await fetch(`${API_URL}/heat_island_analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geojson: polygonGeoJSON }), }); 
            if (!response.ok) { 
                const errorData = await response.json().catch(async () => ({ detail: await response.text() })); 
                if (response.status === 503 && typeof errorData.detail === 'string' && errorData.detail.includes("GEE")) { 
                    throw new Error("GEE não inicializado no backend."); 
                } 
                throw new Error(`HTTP ${response.status}: ${errorData.detail || 'Erro servidor'}`); 
            } 
            const data: GeoJSONData = await response.json(); 
            if (data.features.length > 0) { 
                setHeatIslandData(data); 
                setMessage(`Ilhas de Calor (${data.features.length} áreas).`); 
                setHeatIslandKey(prev => prev + 1); 
            } else { 
                setMessage('Nenhuma Ilha de Calor detectada.'); 
            } 
        } catch (err) { 
            setMessage(`ERRO Ilhas de Calor: ${(err as Error).message}`); 
            console.error(err); 
        } finally { 
            setLoading(false); 
        } 
    }, [selectedPolygon, API_URL, checkPolygon]);

    // --- Estilos e Handlers GeoJSON ---
    const defaultCensoStyle: L.PathOptions = { color: '#e67e22', weight: 1, opacity: 0.8, fillColor: '#f39c12', fillOpacity: 0.3 };
    const highlightCensoStyle: L.PathOptions = { weight: 3, color: '#f1c40f', fillOpacity: 0.5 };
    const heatIslandStyle = (feature: Feature<Geometry, any> | undefined): L.PathOptions => {
        const intensity = feature?.properties?.intensity || 0.5;
        let fillColor = '#ffff00'; if (intensity > 0.7) fillColor = '#ff0000'; else if (intensity > 0.4) fillColor = '#ffa500';
        return { fillColor, weight: 0.5, opacity: 1, color: 'white', fillOpacity: 0.6 };
    };
    const onEachFeature = (feature: Feature<Geometry, any>, layer: L.Layer) => { 
        let popupContent = '<strong>Propriedades:</strong><br/>'; 
        for (const key in feature.properties) { 
            popupContent += `${key}: ${feature.properties[key]}<br/>`; 
        } 
        layer.bindPopup(popupContent); 
        if (feature.properties.source_file) { 
            layer.on({ 
                mouseover: (e) => (e.target as L.Path).setStyle(highlightCensoStyle), 
                mouseout: (e) => geojsonRef.current?.resetStyle(e.target), 
            }); 
        } else if (feature.properties.intensity) { 
            layer.bindTooltip(`Intensidade: ${(feature.properties.intensity * 100).toFixed(0)}%`); 
        }
    };

    // --- RENDERIZAÇÃO ---
    return (
        <div className="app-container theme-azul">
            <div className="sidebar">
                <h1>HARP-IA</h1>
                <div className="status-box"><p className={`status-message ${loading ? 'loading' : ''}`}>{message}</p></div>
                {/* Área */}
                <div className="control-group"><h2>Área</h2><p className="hint">Desenhe um polígono.</p><button className="btn-secondary" onClick={clearAll} disabled={loading}>Limpar Área</button></div>
                {/* Geoespaciais */}
                <div className="control-group"><h2>Dados Geoespaciais</h2>{!censoGeoJSON ? (<button className="btn-primary" onClick={fetchGeoJSON} disabled={!selectedPolygon || loading}>Favelas/Comunidades (IBGE)</button>) : (<button className="btn-secondary" onClick={() => setCensoGeoJSON(null)} disabled={loading}>Remover Favelas</button>)}{!heatIslandData ? (<button className="btn-primary" onClick={fetchHeatIsland} disabled={!selectedPolygon || loading} style={{marginTop: '10px'}}>Ilhas de Calor (GEE)</button>) : (<button className="btn-secondary" onClick={() => setHeatIslandData(null)} disabled={loading} style={{marginTop: '10px'}}>Remover Ilhas de Calor</button>)}</div>
                {/* Satélites */}
                <div className="control-group"><h2>Camadas de Satélite (A e B)</h2><div className="layer-control-item"><label>A:</label><select value={layerA.satellite} onChange={(e) => setLayerA(prev => ({...prev, satellite: e.target.value}))} disabled={loading}>{compositionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><input type="range" min="0" max="1" step="0.05" value={layerA.opacity} onChange={(e) => setLayerA(prev => ({...prev, opacity: parseFloat(e.target.value)}))} disabled={!layerA.tileUrl || loading} /><button className="btn-accent" onClick={() => fetchGEEImage('A')} disabled={!selectedPolygon || loading}>Buscar A</button>{layerA.dem && <p className="dem-info">DEM: {layerA.dem.min_elevation?.toFixed(0)}m - {layerA.dem.max_elevation?.toFixed(0)}m</p>}</div><div className="layer-control-item"><label>B:</label><select value={layerB.satellite} onChange={(e) => setLayerB(prev => ({...prev, satellite: e.target.value}))} disabled={loading}>{compositionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><input type="range" min="0" max="1" step="0.05" value={layerB.opacity} onChange={(e) => setLayerB(prev => ({...prev, opacity: parseFloat(e.target.value)}))} disabled={!layerB.tileUrl || loading} /><button className="btn-accent" onClick={() => fetchGEEImage('B')} disabled={!selectedPolygon || loading}>Buscar B</button>{layerB.dem && <p className="dem-info">DEM: {layerB.dem.min_elevation?.toFixed(0)}m - {layerB.dem.max_elevation?.toFixed(0)}m</p>}</div></div>
                {/* REMOVIDA: Seção de Análise IA */}
            </div> {/* Fim Sidebar */}

            {/* Mapa */}
            <div className="map-wrapper">
                <MapContainer center={[-15.78, -47.92]} zoom={5} className="leaflet-map" zoomControl={false} >
                    {/* MAPA CLARO (OpenStreetMap Padrão) */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        zIndex={0}
                    />
                    <ZoomControl position="topright" />
                    <DrawControl onPolygonCreated={handlePolygonCreated} clearRef={clearDrawRef} />
                    {/* Camada Favelas */}
                    {censoGeoJSON && (<GeoJSON ref={geojsonRef} key={`censo-${censoLayerKey}`} data={censoGeoJSON} style={defaultCensoStyle as StyleFunction} onEachFeature={onEachFeature} />)}
                    {/* Camada Ilhas Calor */}
                    {heatIslandData && (<GeoJSON ref={heatIslandRef} key={`heat-${heatIslandKey}`} data={heatIslandData} style={heatIslandStyle} onEachFeature={onEachFeature} />)}
                    {/* Camadas GEE */}
                    {layerB.tileUrl && <GEETileLayerComponent tileUrl={layerB.tileUrl} opacity={layerB.opacity} layerKey={layerB.key} />}
                    {layerA.tileUrl && <GEETileLayerComponent tileUrl={layerA.tileUrl} opacity={layerA.opacity} layerKey={layerA.key} />}
                </MapContainer>
            </div>
        </div>
    );
};
export default App;