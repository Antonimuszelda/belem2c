# ✅ Checklist de Deploy - Sentinel-IA

## 📋 Pré-Deploy

### Arquivos Backend
- [x] `backend/Dockerfile` - Otimizado para Railway
- [x] `backend/procfile` - Comando de start correto
- [x] `backend/requirements.txt` - Todas dependências
- [x] `backend/.dockerignore` - Reduz tamanho da imagem
- [x] `backend/railway.json` - Configuração Railway
- [x] `backend/.env.example` - Template de variáveis
- [x] `backend/check_config.py` - Script de validação
- [x] `backend/app/main.py` - CORS configurado

### Arquivos Frontend
- [x] `frontend/vercel.json` - Configuração Vercel
- [x] `frontend/.env.example` - Template de variáveis
- [x] `frontend/.vercelignore` - Otimização deploy
- [x] `frontend/src/config/api.ts` - Config API
- [x] `frontend/src/vite-env.d.ts` - Type definitions
- [x] `frontend/src/components/ControlPanel.tsx` - Usa VITE_API_URL
- [x] `frontend/src/components/ChatPanel.tsx` - Usa VITE_API_URL

### Documentação
- [x] `DEPLOY.md` - Guia completo
- [x] `QUICK_DEPLOY.md` - Guia rápido
- [x] `CHANGES_SUMMARY.md` - Resumo mudanças
- [x] `TESTING_COMMANDS.md` - Comandos teste
- [x] `README_DEPLOY.md` - Índice documentação
- [x] `validate_deploy.py` - Script validação

---

## 🚀 Deploy Backend (Railway)

### Preparação
- [ ] Ter conta no Railway
- [ ] Ter credenciais Google Earth Engine
- [ ] Ter Google API Key (Gemini)
- [ ] Repositório no GitHub

### Passos
1. **Conectar Repositório**
   - [ ] Acessar https://railway.app
   - [ ] New Project → Deploy from GitHub repo
   - [ ] Selecionar repositório sentinel-ia
   - [ ] Autorizar Railway no GitHub

2. **Configurar Serviço**
   - [ ] Settings → Root Directory → `backend`
   - [ ] Railway detecta Dockerfile automaticamente
   
3. **Variáveis de Ambiente**
   - [ ] `D_DO_PROJETO_GEE` = seu-projeto-gee-id
   - [ ] `GOOGLE_APPLICATION_CREDENTIALS_JSON` = {"type":"service_account"...}
   - [ ] `GOOGLE_API_KEY` = sua-chave-api-google
   - [ ] Aguardar primeiro deploy

4. **Verificação**
   - [ ] Build completo sem erros
   - [ ] Deploy bem-sucedido
   - [ ] Copiar URL gerada (ex: https://xxx.railway.app)
   - [ ] Acessar `/docs` (ex: https://xxx.railway.app/docs)
   - [ ] Swagger UI carregando corretamente

---

## 🌐 Deploy Frontend (Vercel)

### Preparação
- [ ] Ter conta no Vercel
- [ ] URL do backend Railway
- [ ] Repositório no GitHub

### Passos
1. **Importar Projeto**
   - [ ] Acessar https://vercel.com
   - [ ] Add New → Project
   - [ ] Import from GitHub
   - [ ] Selecionar repositório sentinel-ia

2. **Configurar Build**
   - [ ] Root Directory: `frontend`
   - [ ] Framework Preset: Vite
   - [ ] Build Command: `npm run build`
   - [ ] Output Directory: `dist`
   - [ ] Install Command: `npm install`

3. **Variáveis de Ambiente**
   - [ ] `VITE_API_URL` = https://seu-backend.railway.app
   - [ ] (sem trailing slash na URL)

4. **Deploy**
   - [ ] Clicar em "Deploy"
   - [ ] Aguardar build (2-5 min)
   - [ ] Build bem-sucedido
   - [ ] Copiar URL gerada (ex: https://xxx.vercel.app)

5. **Verificação**
   - [ ] Acessar URL do Vercel
   - [ ] Aplicação carrega
   - [ ] Abrir Console (F12)
   - [ ] Sem erros de CORS

---

## 🔗 Integração Backend ↔ Frontend

### Atualizar CORS
1. **Voltar ao Railway**
   - [ ] Acessar projeto backend
   - [ ] Settings → Variables
   - [ ] Adicionar `FRONTEND_URL` = https://seu-app.vercel.app
   - [ ] Aguardar redeploy automático

2. **Verificar Integração**
   - [ ] Acessar frontend no Vercel
   - [ ] Abrir Console do navegador (F12)
   - [ ] Testar chat ou funcionalidade
   - [ ] Verificar que requests vão para Railway
   - [ ] Sem erros de CORS
   - [ ] Respostas chegando corretamente

---

## ✅ Testes Pós-Deploy

### Backend
- [ ] https://seu-backend.railway.app/ retorna resposta
- [ ] https://seu-backend.railway.app/docs carrega Swagger
- [ ] Testar endpoint de chat via Swagger
- [ ] Verificar logs no Railway (sem erros)

### Frontend
- [ ] https://seu-frontend.vercel.app carrega
- [ ] Interface aparece corretamente
- [ ] Console sem erros (F12)
- [ ] Assets carregando (imagens, fontes)

### Integração
- [ ] Chat funciona
- [ ] Análises funcionam
- [ ] Mapas carregam
- [ ] Não há erros de CORS
- [ ] Resposta do backend chega no frontend

---

## 🐛 Troubleshooting

### ❌ Build falhou no Railway
- [ ] Verificar Dockerfile está correto
- [ ] Conferir requirements.txt completo
- [ ] Ver logs de build no Railway
- [ ] Testar build local com Docker

### ❌ Build falhou no Vercel
- [ ] Verificar Root Directory = `frontend`
- [ ] Confirmar `npm run build` funciona localmente
- [ ] Ver logs de build no Vercel
- [ ] Verificar VITE_API_URL está definida

### ❌ Erro 500 no Backend
- [ ] Ver logs: `railway logs`
- [ ] Verificar variáveis de ambiente
- [ ] Testar credenciais GEE
- [ ] Verificar GOOGLE_API_KEY

### ❌ Erro de CORS
- [ ] FRONTEND_URL está correta no Railway?
- [ ] URL não tem trailing slash?
- [ ] Backend foi redeployado após adicionar FRONTEND_URL?
- [ ] Console mostra qual origin está sendo bloqueada?

### ❌ Frontend não conecta ao Backend
- [ ] VITE_API_URL está correta no Vercel?
- [ ] Backend está online? Teste: /docs
- [ ] URL não tem trailing slash?
- [ ] Console mostra o erro exato?

---

## 📊 Monitoramento

### Railway
- [ ] Configurar alertas de uptime
- [ ] Verificar uso de recursos
- [ ] Monitorar logs de erro
- [ ] Configurar domínio customizado (opcional)

### Vercel
- [ ] Verificar Analytics
- [ ] Monitorar Core Web Vitals
- [ ] Configurar domínio customizado (opcional)
- [ ] Habilitar Preview Deployments

---

## 🔐 Segurança

### Variáveis Sensíveis
- [ ] Nenhuma chave no código
- [ ] `.env` no `.gitignore`
- [ ] Credenciais diferentes dev/prod
- [ ] Rotação regular de chaves

### CORS
- [ ] `allow_origins` específico (não usar *)
- [ ] Apenas domínios necessários
- [ ] HTTPS em produção

---

## 📝 Notas Finais

### URLs para Salvar
- Backend Railway: ___________________________
- Frontend Vercel: ___________________________
- Swagger Docs: ___________________________

### Credenciais Usadas
- GEE Project ID: ___________________________
- Google API Key: (salvo em gerenciador de senhas)

### Próximas Melhorias
- [ ] Configurar domínio customizado
- [ ] Adicionar monitoramento (Sentry, etc)
- [ ] Configurar CI/CD avançado
- [ ] Otimizar performance
- [ ] Adicionar testes automatizados

---

## ✨ Deploy Completo!

Parabéns! Seu projeto está no ar! 🎉

**Backend**: https://seu-backend.railway.app
**Frontend**: https://seu-frontend.vercel.app

Para dúvidas ou problemas:
1. Consulte `DEPLOY.md` (guia completo)
2. Veja `TESTING_COMMANDS.md` (testes locais)
3. Execute `python validate_deploy.py` (validação)

**Bom trabalho! 🚀**
