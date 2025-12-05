// 🔄 Comparison Slider Component - Antes/Depois
import { useState, useEffect, useRef } from 'react';
import './ComparisonSlider.css';

interface ComparisonSliderProps {
  beforeDate: string;
  afterDate: string;
  beforeLayerUrl: string;
  afterLayerUrl: string;
  layerType: string;
  onClose: () => void;
}

export default function ComparisonSlider({
  beforeDate,
  afterDate,
  beforeLayerUrl,
  afterLayerUrl,
  layerType,
  onClose
}: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setSliderPosition(Math.min(Math.max(percent, 0), 100));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percent = (x / rect.width) * 100;
    setSliderPosition(Math.min(Math.max(percent, 0), 100));
  };

  return (
    <div className="comparison-modal-overlay">
      <div className="comparison-modal">
        {/* Header */}
        <div className="comparison-header">
          <h2>🔄 Comparação Temporal - {layerType}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Date Labels */}
        <div className="comparison-dates">
          <div className="date-label before">
            <span className="date-icon">⏪</span>
            <span className="date-text">{new Date(beforeDate).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="date-label after">
            <span className="date-text">{new Date(afterDate).toLocaleDateString('pt-BR')}</span>
            <span className="date-icon">⏩</span>
          </div>
        </div>

        {/* Comparison Container */}
        <div 
          ref={containerRef}
          className="comparison-container"
          onTouchMove={handleTouchMove}
        >
          {/* Before Image (Left) */}
          <div className="comparison-layer before-layer">
            <img 
              src={beforeLayerUrl} 
              alt={`Antes - ${beforeDate}`}
              draggable={false}
            />
            <div className="layer-watermark">ANTES</div>
          </div>

          {/* After Image (Right) - Clipped */}
          <div 
            className="comparison-layer after-layer"
            style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
          >
            <img 
              src={afterLayerUrl} 
              alt={`Depois - ${afterDate}`}
              draggable={false}
            />
            <div className="layer-watermark">DEPOIS</div>
          </div>

          {/* Slider Handle */}
          <div 
            className="comparison-slider-handle"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
          >
            <div className="slider-line" />
            <div className="slider-grip">
              <span className="grip-icon">⟨</span>
              <span className="grip-icon">⟩</span>
            </div>
          </div>

          {/* Position Indicator */}
          <div className="position-indicator">
            {sliderPosition.toFixed(0)}%
          </div>
        </div>

        {/* Info Panel */}
        <div className="comparison-info">
          <div className="info-item">
            <span className="info-icon">📅</span>
            <span className="info-text">
              Período analisado: {Math.abs(
                Math.floor(
                  (new Date(afterDate).getTime() - new Date(beforeDate).getTime()) / 
                  (1000 * 60 * 60 * 24)
                )
              )} dias
            </span>
          </div>
          <div className="info-item">
            <span className="info-icon">🔍</span>
            <span className="info-text">
              Arraste o controle para comparar as mudanças ao longo do tempo
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="comparison-actions">
          <button 
            className="action-btn"
            onClick={() => setSliderPosition(0)}
          >
            ⏪ Ver Antes
          </button>
          <button 
            className="action-btn"
            onClick={() => setSliderPosition(50)}
          >
            ⏸️ 50/50
          </button>
          <button 
            className="action-btn"
            onClick={() => setSliderPosition(100)}
          >
            Ver Depois ⏩
          </button>
        </div>
      </div>
    </div>
  );
}
