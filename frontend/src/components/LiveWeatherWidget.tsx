// 🌦️ Live Weather Widget Component
import { useState, useEffect } from 'react';
import { liveWeatherService } from '../services/LiveWeatherService';
import type { WeatherData } from '../services/LiveWeatherService';
import { audioService } from '../services/AudioService';
import './LiveWeatherWidget.css';

interface LiveWeatherWidgetProps {
  lat: number;
  lon: number;
}

export default function LiveWeatherWidget({ lat, lon }: LiveWeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, 300000); // Atualiza a cada 5 min
    return () => clearInterval(interval);
  }, [lat, lon]);

  const loadWeather = async () => {
    setLoading(true);
    const data = await liveWeatherService.getCurrentWeather(lat, lon);
    setWeather(data);
    setLoading(false);
  };

  const toggleExpand = () => {
    audioService.playClick();
    setExpanded(!expanded);
  };

  if (loading && !weather) {
    return (
      <div className="live-weather-widget loading">
        <div className="weather-spinner"></div>
      </div>
    );
  }

  if (!weather) return null;

  const { icon, description } = liveWeatherService.getWeatherDescription(weather.weatherCode);

  return (
    <div 
      className={`live-weather-widget ${expanded ? 'expanded' : ''}`}
      onClick={toggleExpand}
      onMouseEnter={() => audioService.playHover()}
    >
      <div className="weather-header">
        <span className="weather-icon">{icon}</span>
        <span className="weather-temp">{Math.round(weather.temperature)}°C</span>
      </div>
      
      {expanded && (
        <div className="weather-details">
          <div className="weather-row">
            <span className="label">💧 Umidade:</span>
            <span className="value">{weather.humidity}%</span>
          </div>
          <div className="weather-row">
            <span className="label">💨 Vento:</span>
            <span className="value">{Math.round(weather.windSpeed)} km/h</span>
          </div>
          <div className="weather-row">
            <span className="label">🌤️ Condição:</span>
            <span className="value">{description}</span>
          </div>
          <div className="weather-time">
            Atualizado: {new Date(weather.time).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      )}
      
      <div className="weather-pulse"></div>
    </div>
  );
}
