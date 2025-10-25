// frontend/src/components/cesium/CesiumViewer.tsx

import React, { useRef, useEffect, useState } from 'react';
import * as Cesium from 'cesium';

// ⚠️ INSERIR SEU TOKEN AQUI! (OBRIGATÓRIO para o mapa aparecer)
const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNzUwMWFmNy1jYmQxLTQyY2UtOTg0NS04OTA1OTNhMDIxN2EiLCJpZCI6MzQ3NTg0LCJpYXQiOjE3NTk5NjI1NDF9.lva173zj3aQBcR2zOczH0PIHqk4xR3K98C9GE-uTOYM'; 

// O CesiumViewerComponent agora será uma função que lida com o estado de montagem
export interface CesiumViewerProps {
    initialLat: number;
    initialLon: number;
}

export const CesiumViewerComponent: React.FC<CesiumViewerProps> = ({ initialLat, initialLon }) => {
    const cesiumContainer = useRef<HTMLDivElement>(null);
    const [cesiumReady, setCesiumReady] = useState(false);

    useEffect(() => {
        // 1. Define o Token Globalmente (CRÍTICO)
        if (CESIUM_ION_TOKEN && !Cesium.Ion.defaultAccessToken) {
            Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
        }

        const initializeCesium = async () => { 
            if (cesiumContainer.current) {
                try {
                    // 2. Carrega o Terreno Assíncrono
                    const terrainProvider = await Cesium.createWorldTerrainAsync();

                    // 3. Inicializa o Viewer
                    const viewer = new Cesium.Viewer(cesiumContainer.current, {
                        animation: false,
                        timeline: false,
                        infoBox: false,
                        selectionIndicator: false,
                        navigationHelpButton: false,
                        baseLayerPicker: true,
                        terrainProvider: terrainProvider, 
                    });

                    viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(initialLon, initialLat, 15000000), 
                        duration: 0,
                    });

                    setCesiumReady(true); // Mapa inicializado com sucesso!
                    
                    // 4. Função de Limpeza
                    return () => {
                        viewer.destroy();
                    };
                } catch (error) {
                    console.error("Erro ao inicializar o Cesium Viewer:", error);
                    // Se houver erro (geralmente por causa do token), o mapa fica em branco.
                }
            }
        };

        initializeCesium();

    }, [initialLat, initialLon]);

    // Retorna uma div que ocupará 100%
    return (
        <div 
            ref={cesiumContainer} 
            // Se o Cesium não estiver pronto, mostre um fundo preto para não piscar uma tela branca.
            style={{ 
                width: '100%', 
                height: '100%', 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                zIndex: 0,
                backgroundColor: cesiumReady ? 'transparent' : 'black'
            }} 
        />
    );
};