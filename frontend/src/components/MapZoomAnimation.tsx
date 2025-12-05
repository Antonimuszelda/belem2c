// 🌍 Map Zoom Animation - Zoom from world to Belém
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './MapZoomAnimation.css';

interface MapZoomAnimationProps {
  onComplete: () => void;
  targetLat?: number;
  targetLon?: number;
  duration?: number;
}

export default function MapZoomAnimation({ 
  onComplete, 
  targetLat = -1.46, 
  targetLon = -48.49,
  duration = 4000 
}: MapZoomAnimationProps) {
  const [phase, setPhase] = useState<'zooming' | 'complete'>('zooming');

  useEffect(() => {
    // Play startup sound
    const audio = new Audio('/sounds/startup.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});

    // Wake up backend
    fetch('/health').catch(() => {});

    const timer = setTimeout(() => {
      setPhase('complete');
      setTimeout(onComplete, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {phase === 'zooming' && (
        <motion.div 
          className="map-zoom-animation"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Fundo com mapa estilizado */}
          <div className="zoom-map-container">
            <motion.div 
              className="zoom-earth"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ 
                scale: [0.3, 1, 3, 8, 20],
                opacity: [0, 1, 1, 1, 0]
              }}
              transition={{ 
                duration: duration / 1000,
                times: [0, 0.2, 0.5, 0.8, 1],
                ease: "easeInOut"
              }}
            >
              <img 
                src="/images/earth-south-america.png" 
                alt="Earth"
                className="earth-image"
                onError={(e) => {
                  // Fallback se imagem não existir
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              
              {/* Círculos de foco */}
              <motion.div 
                className="focus-ring ring-1"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div 
                className="focus-ring ring-2"
                animate={{ 
                  scale: [1, 1.8, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              />
            </motion.div>

            {/* Marcador de destino */}
            <motion.div 
              className="target-marker"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 0, 1, 1],
                scale: [0, 0, 1.5, 1]
              }}
              transition={{ 
                duration: duration / 1000,
                times: [0, 0.6, 0.8, 1]
              }}
            >
              <span className="marker-icon">📍</span>
              <span className="marker-label">BELÉM, PA</span>
            </motion.div>
          </div>

          {/* Overlay com informações */}
          <div className="zoom-overlay">
            <motion.div 
              className="zoom-info"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <h2 className="zoom-title">
                <span className="title-icon">🛰️</span>
                HARP-IA
              </h2>
              <p className="zoom-subtitle">Navegando para área de análise...</p>
              
              <div className="coordinates-display">
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  LAT: {targetLat.toFixed(4)}° | LON: {targetLon.toFixed(4)}°
                </motion.span>
              </div>
            </motion.div>

            {/* Barra de progresso */}
            <motion.div 
              className="zoom-progress"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
