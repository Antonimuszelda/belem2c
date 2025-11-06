# Instruções para Deploy no Railway

## Passos Rápidos

### 1. Preparar o Backend
```bash
cd backend
python check_config.py  # Verificar configuração
```

### 2. Criar Projeto no Railway
1. Acesse https://railway.app
2. Novo Projeto → Deploy from GitHub
3. Selecione seu repositório
4. Configure Root Directory: `backend`

### 3. Configurar Variáveis de Ambiente

Copie e cole as variáveis abaixo no painel do Railway:

```env
D_DO_PROJETO_GEE=seu-projeto-gee-id
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account"...}
GOOGLE_API_KEY=sua-chave-api-google
```

Após deploy do frontend, adicione:
```env
FRONTEND_URL=https://seu-app.vercel.app
```

### 4. Deploy
- Railway fará deploy automaticamente
- Aguarde o build (5-10 minutos)
- Copie a URL gerada (ex: https://seu-app.railway.app)

---

# Instruções para Deploy no Vercel

## Passos Rápidos

### 1. Criar Projeto no Vercel
1. Acesse https://vercel.com
2. Add New → Project
3. Import do GitHub

### 2. Configurar Projeto
- **Root Directory**: `frontend`
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3. Configurar Variável de Ambiente
```env
VITE_API_URL=https://seu-backend.railway.app
```

### 4. Deploy
- Clique em Deploy
- Aguarde o build (2-3 minutos)
- Acesse a URL gerada

### 5. Atualizar Backend
- Volte ao Railway
- Adicione `FRONTEND_URL` com a URL do Vercel
- Aguarde redeploy

---

## ✅ Checklist Final

Backend (Railway):
- [ ] D_DO_PROJETO_GEE configurado
- [ ] GOOGLE_APPLICATION_CREDENTIALS_JSON configurado
- [ ] GOOGLE_API_KEY configurado
- [ ] Deploy bem-sucedido
- [ ] /docs acessível

Frontend (Vercel):
- [ ] Root directory = frontend
- [ ] VITE_API_URL configurado
- [ ] Deploy bem-sucedido
- [ ] App acessível

Integração:
- [ ] FRONTEND_URL configurado no Railway
- [ ] CORS funcionando
- [ ] Frontend conecta ao backend

---

## 🆘 Problemas Comuns

### Erro de Build no Railway
- Verifique se o Dockerfile está correto
- Confirme que requirements.txt tem todas as dependências
- Veja os logs: railway logs

### Erro de CORS
- Verifique FRONTEND_URL no Railway
- URL deve ser exatamente igual (sem trailing slash)
- Redeploy backend após mudanças

### Frontend não conecta
- Verifique VITE_API_URL no Vercel
- Teste manualmente: https://seu-backend.railway.app/docs
- Verifique console do navegador (F12)
