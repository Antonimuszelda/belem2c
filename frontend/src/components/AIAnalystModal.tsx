// 🤖 AI Analyst Modal - Advanced Analysis Interface
import { useState, useEffect } from 'react';
import { audioService } from '../services/AudioService';
import './AIAnalystModal.css';

export interface AnalysisResult {
  // Temperaturas
  avgAnnualTemperature: number;
  extremeHeatDays: number;
  heatIslandRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Vegetação
  vegetationDensity: number;
  vegetationLossRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Riscos ambientais
  environmentalRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  floodRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  droughtRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Social
  favelaCount: number;
  favelaPopulation: number;
  socialVulnerability: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // IA
  aiSummary: string;
  recommendations: string[];
}

interface AIAnalystModalProps {
  isOpen: boolean;
  onClose: () => void;
  polygon: Array<{ lat: number; lng: number }>;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

export default function AIAnalystModal({ 
  isOpen, 
  onClose, 
  polygon,
  onAnalysisComplete 
}: AIAnalystModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (isOpen && polygon.length >= 3) {
      startAnalysis();
    }
  }, [isOpen]);

  const startAnalysis = async () => {
    setAnalyzing(true);
    setProgress(0);
    setResult(null);
    audioService.playProcessing();

    const steps = [
      { text: 'Analisando Assinaturas Espectrais...', duration: 800 },
      { text: 'Processando Dados Climáticos...', duration: 900 },
      { text: 'Calculando Índices de Vegetação (NDVI)...', duration: 700 },
      { text: 'Avaliando Risco de Alagamento (NDWI)...', duration: 800 },
      { text: 'Detectando Ilhas de Calor Urbanas...', duration: 900 },
      { text: 'Gerando Relatório com IA Generativa...', duration: 1200 }
    ];

    let currentProgress = 0;
    for (const step of steps) {
      setCurrentStep(step.text);
      await new Promise(resolve => setTimeout(resolve, step.duration));
      currentProgress += 100 / steps.length;
      setProgress(Math.min(currentProgress, 95));
    }

    // Simular análise real (substitua por API call real)
    await performAnalysis();
  };

  const performAnalysis = async () => {
    try {
      const area = calculatePolygonArea(polygon);
      
      // Chamar API real do backend para análise
      const API_BASE = (import.meta as any).env.VITE_API_URL || "http://127.0.0.1:8000";
      
      const response = await fetch(`${API_BASE}/api/analyze_area`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          polygon: polygon.map(p => [p.lng, p.lat]), // [longitude, latitude]
          area_km2: area
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na análise: ${response.status}`);
      }

      const data = await response.json();
      
      const analysisResult: AnalysisResult = {
        avgAnnualTemperature: data.avg_annual_temperature || 0,
        extremeHeatDays: data.extreme_heat_days || 0,
        heatIslandRisk: data.heat_island_risk || 'LOW',
        vegetationDensity: data.vegetation_density || 0,
        vegetationLossRisk: data.vegetation_loss_risk || 'LOW',
        environmentalRisk: data.environmental_risk || 'LOW',
        floodRisk: data.flood_risk || 'LOW',
        droughtRisk: data.drought_risk || 'LOW',
        favelaCount: data.favela_count || 0,
        favelaPopulation: data.favela_population || 0,
        socialVulnerability: data.social_vulnerability || 'LOW',
        aiSummary: data.ai_summary || `Análise da área de ${area.toFixed(2)} km² concluída.`,
        recommendations: data.recommendations || []
      };

      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      setResult(analysisResult);
      setAnalyzing(false);
      audioService.playSuccess();
      onAnalysisComplete?.(analysisResult);
      
    } catch (error: any) {
      console.error('Erro na análise:', error);
      setAnalyzing(false);
      audioService.playError();
      alert(`Erro ao realizar análise: ${error.message}`);
      onClose();
    }
  };

  const calculatePolygonArea = (coords: Array<{ lat: number; lng: number }>): number => {
    // Fórmula simplificada de área de polígono (aproximação)
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i].lng * coords[j].lat;
      area -= coords[j].lng * coords[i].lat;
    }
    return Math.abs(area / 2) * 12364; // Conversão aproximada para km²
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'var(--neon-green)';
      case 'MEDIUM': return 'var(--harpia-yellow)';
      case 'HIGH': return 'var(--neon-red)';
      case 'CRITICAL': return 'var(--neon-magenta)';
      default: return 'var(--harpia-cyan)';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'Baixo';
      case 'MEDIUM': return 'Médio';
      case 'HIGH': return 'Alto';
      case 'CRITICAL': return 'Crítico';
      default: return 'Desconhecido';
    }
  };

  const handleClose = () => {
    audioService.playPanelClose();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="ai-analyst-modal-overlay" onClick={handleClose}>
      <div 
        className="ai-analyst-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="modal-close-btn"
          onClick={handleClose}
          onMouseEnter={() => audioService.playHover()}
        >
          ✕
        </button>

        <div className="modal-header">
          <div className="header-icon">🤖</div>
          <h2 className="modal-title">ANÁLISE ESPACIAL INTELIGENTE</h2>
          <p className="modal-subtitle">Powered by AI + Sensoriamento Remoto</p>
        </div>

        {analyzing && (
          <div className="analysis-progress">
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="progress-text">{currentStep}</p>
          </div>
        )}

        {result && (
          <div className="analysis-results">
            {/* Risco Ambiental Geral - Destaque */}
            <div 
              className="environmental-risk-banner"
              style={{ '--risk-color': getRiskColor(result.environmentalRisk) } as any}
            >
              <span className="banner-icon">🎯</span>
              <div className="banner-content">
                <span className="banner-label">Risco Ambiental Geral</span>
                <span className="banner-value">{getRiskLabel(result.environmentalRisk)}</span>
              </div>
            </div>

            <div className="metrics-grid">
              {/* Temperatura Anual */}
              <div className="metric-card temperature">
                <div className="metric-icon">🌡️</div>
                <div className="metric-content">
                  <span className="metric-label">Temp. Média Anual</span>
                  <span className="metric-value">{result.avgAnnualTemperature.toFixed(1)}°C</span>
                  {result.extremeHeatDays > 0 && (
                    <span className="metric-subvalue">
                      {result.extremeHeatDays} dias &gt;35°C
                    </span>
                  )}
                </div>
              </div>

              {/* Ilha de Calor */}
              <div 
                className="metric-card heat-island"
                style={{ '--risk-color': getRiskColor(result.heatIslandRisk) } as any}
              >
                <div className="metric-icon">🔥</div>
                <div className="metric-content">
                  <span className="metric-label">Ilha de Calor</span>
                  <span className="metric-value risk-badge">
                    {getRiskLabel(result.heatIslandRisk)}
                  </span>
                </div>
              </div>

              {/* Vegetação */}
              <div className="metric-card vegetation">
                <div className="metric-icon">🌿</div>
                <div className="metric-content">
                  <span className="metric-label">Cobertura Vegetal</span>
                  <span className="metric-value">{result.vegetationDensity.toFixed(0)}%</span>
                </div>
              </div>

              {/* Risco de Inundação */}
              <div 
                className="metric-card flood-risk"
                style={{ '--risk-color': getRiskColor(result.floodRisk) } as any}
              >
                <div className="metric-icon">💧</div>
                <div className="metric-content">
                  <span className="metric-label">Risco Inundação</span>
                  <span className="metric-value risk-badge">
                    {getRiskLabel(result.floodRisk)}
                  </span>
                </div>
              </div>

              {/* Risco de Seca */}
              <div 
                className="metric-card drought-risk"
                style={{ '--risk-color': getRiskColor(result.droughtRisk) } as any}
              >
                <div className="metric-icon">☀️</div>
                <div className="metric-content">
                  <span className="metric-label">Risco de Seca</span>
                  <span className="metric-value risk-badge">
                    {getRiskLabel(result.droughtRisk)}
                  </span>
                </div>
              </div>

              {/* Favelas */}
              {result.favelaCount > 0 && (
                <div 
                  className="metric-card favelas"
                  style={{ '--risk-color': getRiskColor(result.socialVulnerability) } as any}
                >
                  <div className="metric-icon">🏘️</div>
                  <div className="metric-content">
                    <span className="metric-label">Vulnerabilidade Social</span>
                    <span className="metric-value">
                      {result.favelaCount} área{result.favelaCount > 1 ? 's' : ''}
                    </span>
                    {result.favelaPopulation > 0 && (
                      <span className="metric-subvalue">
                        ~{result.favelaPopulation.toLocaleString('pt-BR')} hab.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="ai-summary-section">
              <h3 className="section-title">
                <span className="section-icon">🧠</span>
                Análise Ambiental Completa
              </h3>
              <pre className="ai-summary-text">{result.aiSummary}</pre>
            </div>

            <div className="recommendations-section">
              <h3 className="section-title">
                <span className="section-icon">💡</span>
                Recomendações Técnicas
              </h3>
              <ul className="recommendations-list">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="recommendation-item">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
