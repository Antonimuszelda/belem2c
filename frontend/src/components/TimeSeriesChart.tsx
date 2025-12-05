// 📈 Time Series Chart Component - Gráficos de Séries Temporais
import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import './TimeSeriesChart.css';

export interface TimeSeriesData {
  date: string;
  temperature?: number;
  ndvi?: number;
  ndwi?: number;
  precipitation?: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  title: string;
  onClose: () => void;
  initialChart?: 'temperature' | 'vegetation' | 'water' | 'radar';
}

export default function TimeSeriesChart({ data, title, onClose, initialChart = 'temperature' }: TimeSeriesChartProps) {
  const [activeChart, setActiveChart] = useState<'temperature' | 'vegetation' | 'water' | 'radar'>(initialChart);
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '1y' | 'all'>('30d');
  const [filteredData, setFilteredData] = useState(data);

  useEffect(() => {
    console.log('🔄 TimeSeriesChart - Data recebida:', data.length, 'pontos');
    console.log('📊 Primeiro ponto:', data[0]);
    console.log('📊 Último ponto:', data[data.length - 1]);
    
    // Filtrar dados baseado no range selecionado
    const now = new Date();
    let cutoffDate: Date;

    switch (dateRange) {
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        setFilteredData(data);
        console.log('✅ Mostrando todos os', data.length, 'pontos');
        return;
    }

    const filtered = data.filter(d => new Date(d.date) >= cutoffDate);
    setFilteredData(filtered);
    console.log(`✅ Filtrado para ${dateRange}: ${filtered.length} pontos de ${data.length}`);
  }, [dateRange, data]);

  // Calcular estatísticas
  const stats = {
    temperature: {
      avg: filteredData.reduce((acc, d) => acc + (d.temperature || 0), 0) / filteredData.length,
      min: Math.min(...filteredData.map(d => d.temperature || 0)),
      max: Math.max(...filteredData.map(d => d.temperature || 0))
    },
    ndvi: {
      avg: filteredData.reduce((acc, d) => acc + (d.ndvi || 0), 0) / filteredData.length,
      min: Math.min(...filteredData.map(d => d.ndvi || 0)),
      max: Math.max(...filteredData.map(d => d.ndvi || 0))
    }
  };

  // Dados para radar chart (último ponto)
  const lastData = filteredData[filteredData.length - 1];
  const radarData = [
    { indicator: 'Temperatura', value: (lastData?.temperature || 0) / 40 * 100, fullMark: 100 },
    { indicator: 'Vegetação (NDVI)', value: ((lastData?.ndvi || 0) + 1) * 50, fullMark: 100 },
    { indicator: 'Água (NDWI)', value: ((lastData?.ndwi || 0) + 1) * 50, fullMark: 100 },
    { indicator: 'Precipitação', value: (lastData?.precipitation || 0) / 100 * 100, fullMark: 100 }
  ];

  return (
    <div className="timeseries-modal-overlay">
      <div className="timeseries-modal">
        {/* Header */}
        <div className="timeseries-header">
          <h2>📈 {title}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Controls */}
        <div className="timeseries-controls">
          {/* Chart Type Selector */}
          <div className="chart-selector">
            <button
              className={`chart-btn ${activeChart === 'temperature' ? 'active' : ''}`}
              onClick={() => {
                console.log('🌡️ Mudando para: temperature');
                setActiveChart('temperature');
              }}
            >
              🌡️ Temperatura
            </button>
            <button
              className={`chart-btn ${activeChart === 'vegetation' ? 'active' : ''}`}
              onClick={() => {
                console.log('🌳 Mudando para: vegetation');
                setActiveChart('vegetation');
              }}
            >
              🌳 Vegetação
            </button>
            <button
              className={`chart-btn ${activeChart === 'water' ? 'active' : ''}`}
              onClick={() => {
                console.log('💧 Mudando para: water');
                setActiveChart('water');
              }}
            >
              💧 Água
            </button>
            <button
              className={`chart-btn ${activeChart === 'radar' ? 'active' : ''}`}
              onClick={() => {
                console.log('📊 Mudando para: radar');
                setActiveChart('radar');
              }}
            >
              📊 Radar
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="range-selector">
            <button
              className={`range-btn ${dateRange === '30d' ? 'active' : ''}`}
              onClick={() => {
                console.log('📅 Mudando range para: 30d');
                setDateRange('30d');
              }}
            >
              30 dias
            </button>
            <button
              className={`range-btn ${dateRange === '90d' ? 'active' : ''}`}
              onClick={() => {
                console.log('📅 Mudando range para: 90d');
                setDateRange('90d');
              }}
            >
              90 dias
            </button>
            <button
              className={`range-btn ${dateRange === '1y' ? 'active' : ''}`}
              onClick={() => {
                console.log('📅 Mudando range para: 1y');
                setDateRange('1y');
              }}
            >
              1 ano
            </button>
            <button
              className={`range-btn ${dateRange === 'all' ? 'active' : ''}`}
              onClick={() => setDateRange('all')}
            >
              Tudo
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-cards">
          {activeChart === 'temperature' && (
            <>
              <div className="stat-card">
                <div className="stat-label">Média</div>
                <div className="stat-value">{stats.temperature.avg.toFixed(1)}°C</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Mínima</div>
                <div className="stat-value">{stats.temperature.min.toFixed(1)}°C</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Máxima</div>
                <div className="stat-value">{stats.temperature.max.toFixed(1)}°C</div>
              </div>
            </>
          )}
          {activeChart === 'vegetation' && (
            <>
              <div className="stat-card">
                <div className="stat-label">NDVI Médio</div>
                <div className="stat-value">{stats.ndvi.avg.toFixed(3)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Mínimo</div>
                <div className="stat-value">{stats.ndvi.min.toFixed(3)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Máximo</div>
                <div className="stat-value">{stats.ndvi.max.toFixed(3)}</div>
              </div>
            </>
          )}
        </div>

        {/* Chart Area */}
        <div className="chart-container" key={`${activeChart}-${dateRange}`}>
          <ResponsiveContainer width="100%" height={400}>
            {activeChart === 'temperature' && (() => {
              console.log('📈 Renderizando gráfico TEMPERATURE com', filteredData.length, 'pontos');
              console.log('📊 Dados temp:', filteredData.slice(0, 3).map(d => ({ date: d.date, temp: d.temperature })));
              return <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff1744" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ff1744" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#888"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#888" unit="°C" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                    border: '1px solid #00d9ff',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#ff1744" 
                  fillOpacity={1} 
                  fill="url(#colorTemp)"
                  name="Temperatura (°C)"
                />
              </AreaChart>;
            })()}

            {activeChart === 'vegetation' && (() => {
              console.log('🌳 Renderizando gráfico VEGETATION com', filteredData.length, 'pontos');
              console.log('📊 Dados NDVI:', filteredData.slice(0, 3).map(d => ({ date: d.date, ndvi: d.ndvi })));
              return <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#888"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#888" domain={[-1, 1]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                    border: '1px solid #00e676',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="ndvi" 
                  stroke="#00e676" 
                  strokeWidth={3}
                  dot={{ fill: '#00e676', r: 4 }}
                  name="NDVI"
                />
              </LineChart>;
            })()}

            {activeChart === 'water' && (() => {
              console.log('💧 Renderizando gráfico WATER com', filteredData.length, 'pontos');
              console.log('📊 Dados NDWI:', filteredData.slice(0, 3).map(d => ({ date: d.date, ndwi: d.ndwi })));
              return <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#888"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#888" domain={[-1, 1]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                    border: '1px solid #2962ff',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="ndwi" 
                  stroke="#2962ff" 
                  strokeWidth={3}
                  dot={{ fill: '#2962ff', r: 4 }}
                  name="NDWI (Água)"
                />
                {filteredData.some(d => d.precipitation !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey="precipitation" 
                    stroke="#00e5ff" 
                    strokeWidth={2}
                    dot={{ fill: '#00e5ff', r: 3 }}
                    name="Precipitação (mm)"
                    yAxisId="right"
                  />
                )}
              </LineChart>;
            })()}

            {activeChart === 'radar' && (
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.2)" />
                <PolarAngleAxis dataKey="indicator" stroke="#888" />
                <PolarRadiusAxis stroke="#888" />
                <Radar 
                  name="Indicadores Atuais" 
                  dataKey="value" 
                  stroke="#00d9ff" 
                  fill="#00d9ff" 
                  fillOpacity={0.6}
                />
              </RadarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Info Footer */}
        <div className="chart-info">
          <p>
            <span className="info-icon">📊</span>
            Análise de {filteredData.length} pontos de dados no período selecionado
          </p>
        </div>
      </div>
    </div>
  );
}
