# 🧪 Comandos Úteis para Testes

## Backend (Local)

### Testar com Docker
```powershell
# Build da imagem
cd backend
docker build -t sentinel-backend .

# Rodar container (com .env)
docker run -p 8000:8000 --env-file .env sentinel-backend

# Rodar container (com variáveis inline)
docker run -p 8000:8000 `
  -e D_DO_PROJETO_GEE="seu-projeto" `
  -e GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account"...}' `
  -e GOOGLE_API_KEY="sua-chave" `
  sentinel-backend
```

### Testar sem Docker
```powershell
# Criar ambiente virtual
cd backend
python -m venv venv
.\venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Verificar configuração
python check_config.py

# Rodar servidor
uvicorn app.main:app --reload --port 8000

# OU com Gunicorn (mais próximo do Railway)
gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --reload
```

### Testar Endpoints
```powershell
# Testar health check
curl http://localhost:8000/

# Testar docs
Start-Process "http://localhost:8000/docs"

# Testar chat (PowerShell)
$body = @{
    message = "Olá, como você está?"
    conversation_id = "test-123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/agent/chat" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

## Frontend (Local)

### Desenvolvimento
```powershell
cd frontend

# Instalar dependências
npm install

# Criar .env para desenvolvimento
echo "VITE_API_URL=http://localhost:8000" > .env

# Rodar dev server
npm run dev

# Acessar
Start-Process "http://localhost:5173"
```

### Build para Produção
```powershell
# Build
npm run build

# Preview do build
npm run preview

# Acessar preview
Start-Process "http://localhost:4173"
```

### Testar com Backend no Railway
```powershell
# Criar .env apontando para Railway
echo "VITE_API_URL=https://seu-backend.railway.app" > .env

# Rodar dev
npm run dev
```

---

## Validação Completa

### 1. Backend Local + Frontend Local
```powershell
# Terminal 1 - Backend
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Backend Railway + Frontend Local
```powershell
# Frontend com backend em produção
cd frontend
echo "VITE_API_URL=https://seu-backend.railway.app" > .env
npm run dev
```

### 3. Build Final Local
```powershell
# Backend com Docker
cd backend
docker build -t sentinel-backend .
docker run -p 8000:8000 --env-file .env sentinel-backend

# Frontend build
cd frontend
npm run build
npm run preview
```

---

## Testes de API

### Com cURL (PowerShell)
```powershell
# Health check
curl http://localhost:8000/

# Chat
curl -X POST http://localhost:8000/api/agent/chat `
  -H "Content-Type: application/json" `
  -d '{"message":"Olá","conversation_id":"test"}'

# Análise (se existir endpoint)
curl -X POST http://localhost:8000/analyze `
  -H "Content-Type: application/json" `
  -d '{"latitude":-15.8,"longitude":-47.9,"start_date":"2024-01-01","end_date":"2024-01-31"}'
```

### Com Invoke-RestMethod (PowerShell)
```powershell
# Chat
$chatBody = @{
    message = "Me conte sobre áreas urbanas"
    conversation_id = "test-conversation"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/agent/chat" `
  -Method POST `
  -ContentType "application/json" `
  -Body $chatBody

# Análise
$analysisBody = @{
    latitude = -15.8
    longitude = -47.9
    start_date = "2024-01-01"
    end_date = "2024-01-31"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/analyze" `
  -Method POST `
  -ContentType "application/json" `
  -Body $analysisBody
```

---

## Logs e Debug

### Backend
```powershell
# Ver logs detalhados do Uvicorn
uvicorn app.main:app --reload --log-level debug

# Ver logs do Docker
docker logs <container-id> -f

# Railway logs (via CLI)
railway logs --follow
```

### Frontend
```powershell
# Dev com logs
npm run dev -- --debug

# Build com análise de bundle
npm run build -- --mode development
```

---

## Limpeza

### Backend
```powershell
# Limpar cache Python
cd backend
Remove-Item -Recurse -Force __pycache__, app/__pycache__

# Limpar containers Docker
docker system prune -a

# Desativar venv
deactivate
```

### Frontend
```powershell
# Limpar node_modules e build
cd frontend
Remove-Item -Recurse -Force node_modules, dist

# Reinstalar
npm install
```

---

## Variáveis de Ambiente - Testes

### Backend (.env)
```env
D_DO_PROJETO_GEE=seu-projeto-teste
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account"...}
GOOGLE_API_KEY=sua-chave-teste
FRONTEND_URL=http://localhost:5173
PORT=8000
```

### Frontend (.env)
```env
# Desenvolvimento local
VITE_API_URL=http://localhost:8000

# Ou apontando para Railway
VITE_API_URL=https://seu-backend.railway.app
```

---

## Checklist de Testes

### Backend
- [ ] `python check_config.py` passa sem erros
- [ ] Servidor inicia sem erros
- [ ] `/docs` acessível
- [ ] Endpoint de chat responde
- [ ] CORS permite localhost:5173
- [ ] GEE autenticação funciona

### Frontend
- [ ] `npm install` sem erros
- [ ] `npm run build` completa com sucesso
- [ ] Dev server inicia
- [ ] Conecta ao backend
- [ ] Sem erros no console (F12)
- [ ] Chat interface funciona

### Integração
- [ ] Frontend local + Backend local
- [ ] Frontend local + Backend Railway
- [ ] Build local funciona
- [ ] Sem erros de CORS

---

## Ferramentas Úteis

### Postman/Insomnia
Importe as seguintes requests:

**Chat Request**
```
POST http://localhost:8000/api/agent/chat
Content-Type: application/json

{
  "message": "Olá, como você está?",
  "conversation_id": "test-123"
}
```

**Health Check**
```
GET http://localhost:8000/
```

---

## Troubleshooting Local

### Porta já em uso
```powershell
# Ver processos na porta 8000
netstat -ano | findstr :8000

# Matar processo (substitua <PID>)
taskkill /PID <PID> /F
```

### Erro de importação Python
```powershell
# Verificar instalação
pip list

# Reinstalar dependências
pip install -r requirements.txt --force-reinstall
```

### Erro de build do Frontend
```powershell
# Limpar cache
npm cache clean --force

# Reinstalar
Remove-Item -Recurse -Force node_modules
npm install
```

Bons testes! 🧪
