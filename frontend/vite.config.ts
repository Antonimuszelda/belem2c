import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // FIX: Adiciona a base para deploys de subdiretório (como no Vercel/Railway)
  base: './', 
  
  // FIX: O bloco optimizeDeps deve ser corrigido para evitar problemas com Leaflet
  optimizeDeps: {
    // Apenas mantenha as dependências do Leaflet que você realmente usa
    include: ['react-leaflet', 'leaflet', 'react-leaflet-draw', 'leaflet-draw'], 
  },
});