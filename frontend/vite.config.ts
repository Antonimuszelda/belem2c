// frontend/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // =========================================================
  // ✅ CORREÇÃO CRÍTICA: ADICIONE ESTA LINHA
  base: './', 
  // =========================================================
  
  optimizeDeps: {
    // Apenas mantenha as dependências do Leaflet que você realmente usa
    include: ['react-leaflet', 'leaflet', 'react-leaflet-draw', 'leaflet-draw'], 
  },
});