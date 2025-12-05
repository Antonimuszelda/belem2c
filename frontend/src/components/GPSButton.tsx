// 📍 GPS Location Button Component
import { useState } from 'react';
import { audioService } from '../services/AudioService';
import './GPSButton.css';

interface GPSButtonProps {
  onLocationFound: (lat: number, lon: number) => void;
}

export default function GPSButton({ onLocationFound }: GPSButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    audioService.playGPS();
    setLoading(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          onLocationFound(latitude, longitude);
          setLoading(false);
          audioService.playSuccess();
        },
        (error) => {
          console.error('GPS Error:', error);
          audioService.playError();
          setLoading(false);
          alert('Não foi possível obter sua localização. Verifique as permissões.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      audioService.playError();
      alert('Geolocalização não suportada neste navegador.');
      setLoading(false);
    }
  };

  return (
    <button
      className={`gps-button ${loading ? 'loading' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => audioService.playHover()}
      title="Minha Localização"
      disabled={loading}
    >
      <span className="gps-icon">
        {loading ? '⟳' : '📍'}
      </span>
    </button>
  );
}
