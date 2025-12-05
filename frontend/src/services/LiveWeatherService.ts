// 🌦️ Live Weather Widget - OpenMeteo API Service
export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  time: string;
}

class LiveWeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
        timezone: 'America/Sao_Paulo'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        weatherCode: data.current.weather_code,
        time: data.current.time
      };
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      return null;
    }
  }

  // Interpretar código de clima para ícone/descrição
  getWeatherDescription(code: number): { icon: string; description: string } {
    const weatherCodes: Record<number, { icon: string; description: string }> = {
      0: { icon: '☀️', description: 'Céu Limpo' },
      1: { icon: '🌤️', description: 'Parcialmente Nublado' },
      2: { icon: '⛅', description: 'Nublado' },
      3: { icon: '☁️', description: 'Muito Nublado' },
      45: { icon: '🌫️', description: 'Névoa' },
      48: { icon: '🌫️', description: 'Névoa Densa' },
      51: { icon: '🌦️', description: 'Garoa Leve' },
      53: { icon: '🌦️', description: 'Garoa Moderada' },
      55: { icon: '🌦️', description: 'Garoa Densa' },
      61: { icon: '🌧️', description: 'Chuva Leve' },
      63: { icon: '🌧️', description: 'Chuva Moderada' },
      65: { icon: '🌧️', description: 'Chuva Forte' },
      71: { icon: '🌨️', description: 'Neve Leve' },
      73: { icon: '🌨️', description: 'Neve Moderada' },
      75: { icon: '🌨️', description: 'Neve Forte' },
      80: { icon: '🌦️', description: 'Pancada Leve' },
      81: { icon: '⛈️', description: 'Pancada Moderada' },
      82: { icon: '⛈️', description: 'Pancada Forte' },
      95: { icon: '⛈️', description: 'Tempestade' },
      96: { icon: '⛈️', description: 'Tempestade com Granizo' },
      99: { icon: '⛈️', description: 'Tempestade Severa' }
    };

    return weatherCodes[code] || { icon: '🌡️', description: 'Desconhecido' };
  }
}

export const liveWeatherService = new LiveWeatherService();
