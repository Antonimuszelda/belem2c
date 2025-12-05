// frontend/src/components/WindMap.tsx
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './WindMap.css';

interface WindMapProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WindMap({ isOpen, onClose }: WindMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && iframeRef.current) {
      // Windy.com com visão nacional do Brasil
      const windyUrl = 'https://embed.windy.com/embed2.html?lat=-15.78&lon=-47.93&detailLat=-15.78&detailLon=-47.93&width=650&height=450&zoom=4&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1';
      
      if (iframeRef.current.src !== windyUrl) {
        iframeRef.current.src = windyUrl;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      className="wind-map-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="wind-map-container"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wind-map-header">
          <h2 className="wind-map-title">
            <span className="wind-icon">💨</span>
            MAPA DE VENTOS - BELÉM
          </h2>
          <button className="wind-map-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="wind-map-content">
          <iframe
            ref={iframeRef}
            title="Mapa de Ventos"
            width="100%"
            height="100%"
            frameBorder="0"
            allow="geolocation"
          />
        </div>

        <div className="wind-map-footer">
          <p>📍 Belém, Pará • Dados em tempo real via Windy.com</p>
          <p className="wind-map-tip">
            💡 Use as camadas para ver: velocidade do vento, rajadas, temperatura, precipitação
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
