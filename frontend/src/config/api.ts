// frontend/src/config/api.ts
// Configuração centralizada da API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  endpoints: {
    agent: {
      chat: '/api/agent/chat',
      chatText: '/api/agent/chat/text',
    },
    analysis: '/analyze',
    layers: '/layers',
    dem: '/dem',
  },
  timeout: 30000, // 30 segundos
};

export default API_CONFIG;
