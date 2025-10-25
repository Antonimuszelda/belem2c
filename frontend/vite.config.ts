// frontend/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // O bloco optimizeDeps deve ser corrigido:
  optimizeDeps: {
    // Apenas mantenha as dependências do Leaflet que você realmente usa
    include: ['react-leaflet', 'leaflet', 'react-leaflet-draw', 'leaflet-draw'], 
  },
});