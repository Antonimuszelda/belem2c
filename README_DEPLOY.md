# 🚀 Sentinel-IA - Guia de Deploy

Este projeto está configurado para deploy do **backend no Railway** e do **frontend no Vercel**.

## 📚 Documentação

Escolha o guia adequado para suas necessidades:

### 🎯 Iniciante / Primeira vez
**→ Leia: [`QUICK_DEPLOY.md`](./QUICK_DEPLOY.md)**
- Passos simplificados
- Comandos diretos
- Checklist rápido

### 📖 Completo / Detalhado
**→ Leia: [`DEPLOY.md`](./DEPLOY.md)**
- Explicações completas
- Troubleshooting detalhado
- Boas práticas de segurança
- Recursos adicionais

### 📋 Resumo das Mudanças
**→ Leia: [`CHANGES_SUMMARY.md`](./CHANGES_SUMMARY.md)**
- Lista de arquivos modificados/criados
- Variáveis de ambiente necessárias
- Checklist de verificação

### 🧪 Testes Locais
**→ Leia: [`TESTING_COMMANDS.md`](./TESTING_COMMANDS.md)**
- Comandos para testar localmente
- Docker, build, preview
- Debug e troubleshooting local

## ⚡ Deploy Rápido

### Backend (Railway)
1. Conecte repositório no [Railway](https://railway.app)
2. Configure Root Directory: `backend`
3. Adicione variáveis de ambiente (veja `.env.example`)
4. Deploy automático!

### Frontend (Vercel)
1. Importe projeto no [Vercel](https://vercel.com)
2. Configure Root Directory: `frontend`
3. Adicione `VITE_API_URL` (URL do Railway)
4. Deploy automático!

## 📝 Arquivos de Configuração

### Backend
- `backend/Dockerfile` - Container Docker
- `backend/procfile` - Comando de inicialização
- `backend/railway.json` - Configuração Railway
- `backend/.env.example` - Template de variáveis
- `backend/check_config.py` - Verificação de configuração

### Frontend
- `frontend/vercel.json` - Configuração Vercel
- `frontend/.env.example` - Template de variáveis
- `frontend/src/config/api.ts` - Configuração de API

## 🔐 Variáveis de Ambiente

### Railway (Backend)
```env
D_DO_PROJETO_GEE=seu-projeto-gee
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account"...}
GOOGLE_API_KEY=sua-chave-api
FRONTEND_URL=https://seu-app.vercel.app
```

### Vercel (Frontend)
```env
VITE_API_URL=https://seu-backend.railway.app
```

## ✅ Checklist

- [ ] Backend deployado no Railway
- [ ] Frontend deployado no Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] CORS funcionando
- [ ] `/docs` acessível no backend
- [ ] Frontend conecta ao backend

## 🆘 Problemas?

1. Consulte [`DEPLOY.md`](./DEPLOY.md) seção Troubleshooting
2. Verifique logs:
   - Railway: `railway logs`
   - Vercel: Painel de deployment
3. Teste localmente com [`TESTING_COMMANDS.md`](./TESTING_COMMANDS.md)

## 🛠️ Tecnologias

### Backend
- Python 3.11
- FastAPI
- Google Earth Engine
- Gunicorn + Uvicorn
- Docker

### Frontend
- React + TypeScript
- Vite
- Leaflet
- Three.js
- Axios

## 📦 Estrutura do Projeto

```
sentinel-ia/
├── backend/               # API FastAPI
│   ├── app/              # Código da aplicação
│   ├── data/             # Dados GeoJSON
│   ├── Dockerfile        # Container Docker
│   ├── requirements.txt  # Dependências Python
│   └── .env.example      # Template de variáveis
│
├── frontend/             # Interface React
│   ├── src/             # Código fonte
│   ├── public/          # Assets públicos
│   ├── vercel.json      # Config Vercel
│   └── .env.example     # Template de variáveis
│
├── DEPLOY.md            # Guia completo de deploy
├── QUICK_DEPLOY.md      # Guia rápido
├── CHANGES_SUMMARY.md   # Resumo das mudanças
└── TESTING_COMMANDS.md  # Comandos de teste
```

## 🔗 Links Úteis

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Vite Docs](https://vitejs.dev)

---

**Pronto para começar?** Leia [`QUICK_DEPLOY.md`](./QUICK_DEPLOY.md) e faça seu primeiro deploy! 🚀
