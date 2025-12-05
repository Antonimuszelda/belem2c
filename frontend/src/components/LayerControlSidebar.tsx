// 🎛️ Layer Control Sidebar - Cyberpunk Accordion with Opacity Control
import { useState } from 'react';
import { audioService } from '../services/AudioService';
import './LayerControlSidebar.css';

export interface LayerConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
  category: 'socioeconomico' | 'urbano' | 'ambiental' | 'climatico' | 'elevacao';
  supportsTimeLapse?: boolean;
}

interface LayerControlSidebarProps {
  layers: LayerConfig[];
  onLayerToggle: (layerId: string) => void;
  onOpacityChange?: (layerId: string, opacity: number) => void;
  onMinimize?: () => void;
  collapsed?: boolean;
  layerOpacities?: Record<string, number>;
}

export default function LayerControlSidebar({ 
  layers, 
  onLayerToggle,
  onOpacityChange,
  onMinimize,
  collapsed = false,
  layerOpacities = {}
}: LayerControlSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['ambiental']) // Inicia com ambiental aberto
  );

  const categories = {
    socioeconomico: {
      name: '👥 SOCIOECONÔMICO',
      color: 'var(--neon-magenta)',
      glow: 'var(--neon-magenta-glow)'
    },
    urbano: {
      name: '🏙️ URBANO',
      color: 'var(--harpia-cyan)',
      glow: 'var(--harpia-cyan-glow)'
    },
    ambiental: {
      name: '🌿 AMBIENTE & CLIMA',
      color: 'var(--neon-green)',
      glow: 'var(--neon-green-glow)'
    },
    elevacao: {
      name: '⛰️ ELEVAÇÃO',
      color: 'var(--neon-blue)',
      glow: 'var(--neon-blue-glow)'
    }
  };

  const toggleCategory = (category: string) => {
    audioService.playToggle();
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleLayerToggle = (layerId: string) => {
    audioService.playClick();
    onLayerToggle(layerId);
  };

  const handleOpacityChange = (layerId: string, value: number) => {
    onOpacityChange?.(layerId, value);
  };

  const groupedLayers = layers.reduce((acc, layer) => {
    if (!acc[layer.category]) acc[layer.category] = [];
    acc[layer.category].push(layer);
    return acc;
  }, {} as Record<string, LayerConfig[]>);

  if (collapsed) {
    return (
      <div className="layer-control-sidebar collapsed" onClick={onMinimize}>
        <div className="sidebar-collapsed-indicator">
          <span>📊</span>
          <span className="expand-hint">▶</span>
        </div>
      </div>
    );
  }

  return (
    <div className="layer-control-sidebar">
      <div className="sidebar-header">
        <div className="header-content">
          <h2 className="sidebar-title">
            <span className="title-icon">🗺️</span>
            CAMADAS
          </h2>
          <p className="sidebar-subtitle">Selecione visualizações</p>
        </div>
        <button 
          className="minimize-button"
          onClick={onMinimize}
          title="Minimizar painel"
        >
          ◀
        </button>
      </div>

      <div className="categories-container">
        {Object.entries(categories).map(([categoryKey, categoryInfo]) => {
          const categoryLayers = groupedLayers[categoryKey] || [];
          if (categoryLayers.length === 0) return null;

          const isExpanded = expandedCategories.has(categoryKey);
          const enabledCount = categoryLayers.filter(l => l.enabled).length;

          return (
            <div 
              key={categoryKey} 
              className={`category-section ${isExpanded ? 'expanded' : ''}`}
              style={{ '--category-color': categoryInfo.color, '--category-glow': categoryInfo.glow } as any}
            >
              <button
                className="category-header"
                onClick={() => toggleCategory(categoryKey)}
                onMouseEnter={() => audioService.playHover()}
              >
                <span className="category-name">{categoryInfo.name}</span>
                <span className="category-meta">
                  {enabledCount > 0 && (
                    <span className="enabled-badge">{enabledCount}</span>
                  )}
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </span>
              </button>

              {isExpanded && (
                <div className="category-content">
                  {categoryLayers.map(layer => (
                    <div 
                      key={layer.id} 
                      className={`layer-item ${layer.enabled ? 'enabled' : ''}`}
                    >
                      <button
                        className="layer-toggle"
                        onClick={() => handleLayerToggle(layer.id)}
                        onMouseEnter={() => audioService.playHover()}
                      >
                        <span className="layer-icon">{layer.icon}</span>
                        <div className="layer-info">
                          <span className="layer-name">{layer.name}</span>
                          <span className="layer-description">{layer.description}</span>
                        </div>
                        <span className={`toggle-indicator ${layer.enabled ? 'on' : 'off'}`}>
                          {layer.enabled ? '●' : '○'}
                        </span>
                      </button>

                      {/* Controle de Opacidade (substitui timelapse) */}
                      {layer.enabled && (
                        <div className="opacity-control">
                          <label className="opacity-label">
                            <span>🔆</span>
                            Opacidade: {Math.round((layerOpacities[layer.id] ?? 1) * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={(layerOpacities[layer.id] ?? 1) * 100}
                            onChange={(e) => handleOpacityChange(layer.id, Number(e.target.value) / 100)}
                            className="opacity-slider"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
