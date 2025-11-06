# Uso de áudio (Railway backend + Vercel frontend)

Este mini-guia explica a abordagem recomendada para ter uma experiência de "ligação" dinâmica,
gratuita e compatível com Railway (backend) + Vercel (frontend).

Resumo da arquitetura (recomendada)
- STT (speech-to-text): rodar no navegador (Web Speech API - SpeechRecognition)
- Backend (Railway): recebe texto, usa `sacy_agent` quando disponível ou fallback, aplica
  dialetização paraense e retorna texto. Endpoint: `/api/agent/chat/text` (POST JSON)
- TTS (text-to-speech): rodar no navegador (SpeechSynthesis) para resposta em áudio

Vantagens
- 100% grátis (usa APIs do navegador)
- Funciona no plano gratuito do Railway e Vercel
- Dinâmico (sente-se como uma ligação) e rápido

Configurar o backend (Railway)
1. Suba o backend para Railway. Railway define a variável `PORT` automaticamente.
2. Configure CORS: no backend coloque a URL do frontend em `FRONTEND_URL` (ex: https://meu-frontend.vercel.app)
3. O endpoint leve que o frontend usa é:

   POST https://<seu-backend>.railway.app/api/agent/chat/text

   Body JSON: { "message": "texto transcrito do usuário" }

4. Resposta: JSON { "response": "texto dialetizado e resposta do agente", "context_summary": "..." }

Configurar o frontend (Vercel)
1. No seu app Vite (esta repo tem um `frontend/`), adicione a variável de ambiente `VITE_API_URL` com o URL do backend Railway.
2. Use o componente de exemplo `frontend/src/components/AudioCall.tsx` (já incluso) — ele utiliza a Web Speech API e envia transcrições para o backend.
3. SpeechRecognition funciona melhor em Chrome/Edge. SpeechSynthesis usa as vozes do sistema.

Exemplo de uso (fetch simples)

```js
const apiBase = import.meta.env.VITE_API_URL;
const res = await fetch(`${apiBase}/api/agent/chat/text`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Qual a situação do NDVI na área X?' })
});
const data = await res.json();
console.log(data.response);
```

Notas e limitações
- Se quiser STT/TTS no servidor (ex.: Whisper, Coqui TTS), isso exigirá instalar modelos e dependências pesadas (torch, etc.). No Railway free isso normalmente não é viável.
- Mantenha o backend leve: ele só precisa gerar/formatar texto e aplicar a dialetização (já implementada em `audio_chat.py`).
- Certifique-se de definir `FRONTEND_URL` no backend para habilitar CORS entre Vercel e Railway.

Próximos passos (opcionais)
- Adicionar um endpoint de upload de áudio `/api/agent/chat/audio` que tenta STT server-side se o deploy suportar modelos locais.
- Melhorar o UX do frontend para chamadas contínuas (abrir canal de áudio, playback incremental).

Boa prática: testar localmente com `VITE_API_URL=http://localhost:8000` e iniciar o frontend no Vercel somente após confirmar CORS e variáveis.
