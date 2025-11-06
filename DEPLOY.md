# 🚀 Guia de Deploy - Sentinel-IA

Este guia descreve como fazer o deploy do **backend no Railway** e do **frontend no Vercel**.

---

## 📦 Backend - Railway

### Pré-requisitos
- Conta no [Railway](https://railway.app)
- Credenciais do Google Earth Engine (Service Account JSON)
- Google API Key para Gemini

### Passos para Deploy

1. **Criar novo projeto no Railway**
   - Acesse [railway.app](https://railway.app)
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Conecte seu repositório

2. **Configurar o serviço**
   - Selecione a pasta `backend` como root directory
   - Railway detectará automaticamente o Dockerfile

3. **Configurar Variáveis de Ambiente**
   
   No painel do Railway, vá em "Variables" e adicione:

   ```env
   # Google Earth Engine
   D_DO_PROJETO_GEE=seu-projeto-gee-id
   
   # Credenciais GEE (escolha UMA das opções):
   # Opção 1: JSON direto (recomendado)
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key":"..."}
   
   # Opção 2: JSON em base64
   GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64=eyJ0eXBlIjoi...
   
   # Google Generative AI
   GOOGLE_API_KEY=sua-chave-api-google
   
   # Frontend URL (adicione após deploy do frontend)
   FRONTEND_URL=https://seu-app.vercel.app
   ```

4. **Deploy**
   - Railway fará o deploy automaticamente
   - A aplicação estará disponível em `https://seu-app.railway.app`
   - Copie esta URL para usar no frontend

### Comandos Úteis

```bash
# Testar localmente com Docker
cd backend
docker build -t sentinel-backend .
docker run -p 8000:8000 --env-file .env sentinel-backend

# Ver logs no Railway
railway logs
```

---

## 🌐 Frontend - Vercel

### Pré-requisitos
- Conta no [Vercel](https://vercel.com)
- URL do backend no Railway

### Passos para Deploy

1. **Criar novo projeto no Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "Add New Project"
   - Importe seu repositório do GitHub

2. **Configurar o projeto**
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Configurar Variáveis de Ambiente**
   
   No painel do Vercel, vá em "Settings" > "Environment Variables" e adicione:

   ```env
   VITE_API_URL=https://seu-backend.railway.app
   ```

4. **Deploy**
   - Clique em "Deploy"
   - Vercel fará o build e deploy automaticamente
   - A aplicação estará disponível em `https://seu-app.vercel.app`

5. **Atualizar CORS no Backend**
   - Volte ao Railway
   - Adicione/atualize a variável `FRONTEND_URL` com a URL do Vercel
   - Exemplo: `FRONTEND_URL=https://seu-app.vercel.app`
   - Railway fará redeploy automaticamente

### Comandos Úteis

```bash
# Testar build localmente
cd frontend
npm run build
npm run preview

# Deploy via CLI (opcional)
npm install -g vercel
vercel --prod
```

---

## 🔄 Workflow de Deploy Automático

### Backend (Railway)
- Push para `main` → Deploy automático
- Railway rebuilda a imagem Docker
- Reinicia o serviço automaticamente

### Frontend (Vercel)
- Push para `main` → Deploy automático
- Vercel rebuilda os assets
- Deploy instantâneo com CDN global

---

## ✅ Verificação Pós-Deploy

### Backend
1. Acesse `https://seu-backend.railway.app/docs`
2. Verifique se a documentação Swagger está acessível
3. Teste o endpoint de health: `GET /`

### Frontend
1. Acesse `https://seu-app.vercel.app`
2. Abra o Console do navegador (F12)
3. Verifique se não há erros de CORS
4. Teste a conexão com o backend

---

## 🐛 Troubleshooting

### Erro de CORS
- Verifique se `FRONTEND_URL` está configurada corretamente no Railway
- Certifique-se de que a URL não tem trailing slash
- Redeploy o backend após mudanças

### Erro 500 no Backend
- Verifique os logs no Railway: `railway logs`
- Confirme se as variáveis de ambiente estão corretas
- Verifique as credenciais do GEE

### Build falhou no Vercel
- Verifique se `VITE_API_URL` está configurada
- Confira os logs de build no Vercel
- Teste o build localmente: `npm run build`

### Railway não inicia
- Verifique o Dockerfile
- Confirme que o Procfile está correto
- Verifique se a porta está configurada corretamente

---

## 📝 Checklist de Deploy

### Backend (Railway)
- [ ] Repositório conectado
- [ ] Dockerfile configurado
- [ ] Variáveis de ambiente configuradas
- [ ] GEE credenciais adicionadas
- [ ] API Key do Google configurada
- [ ] Deploy bem-sucedido
- [ ] `/docs` acessível

### Frontend (Vercel)
- [ ] Repositório conectado
- [ ] Root directory configurado (`frontend`)
- [ ] `VITE_API_URL` configurada
- [ ] Build bem-sucedido
- [ ] Aplicação acessível
- [ ] CORS funcionando

### Integração
- [ ] `FRONTEND_URL` configurada no Railway
- [ ] Backend aceita requests do frontend
- [ ] Frontend conecta ao backend
- [ ] Sem erros de CORS no console

---

## 📚 Recursos Adicionais

- [Documentação Railway](https://docs.railway.app)
- [Documentação Vercel](https://vercel.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

---

## 🔐 Segurança

### Variáveis Sensíveis
- **NUNCA** commite arquivos `.env` no Git
- Use `.env.example` como referência
- Gere novas chaves para produção
- Rotacione credenciais regularmente

### CORS
- Mantenha `allow_origins` restrito
- Não use `allow_origins=["*"]` em produção
- Configure apenas os domínios necessários

---

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs (Railway/Vercel)
2. Consulte a documentação oficial
3. Revise as configurações de ambiente
4. Teste localmente antes de fazer deploy

Boa sorte com o deploy! 🚀
