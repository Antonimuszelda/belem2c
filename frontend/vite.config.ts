import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // FIX: Adiciona a base para deploys de subdiretório (como no Vercel/Railway)
  base: './', 
  
  // FIX: Incluir dependências Mapbox e Leaflet para otimização
  optimizeDeps: {
    include: [
      'react-leaflet', 
      'leaflet', 
      'react-leaflet-draw', 
      'leaflet-draw',
      'mapbox-gl',
      '@mapbox/mapbox-gl-draw'
    ], 
  },
  
  // Garantir que Mapbox CSS seja incluído no build
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'mapbox-gl': ['mapbox-gl'],
          'mapbox-draw': ['@mapbox/mapbox-gl-draw']
        }
      }
    }
  }
});