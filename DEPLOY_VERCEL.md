# 🚀 Deploy no Vercel - Configuração Mapbox

## ✅ Alterações Feitas

### 1. **vite.config.ts** - Otimização do Build
- Adicionado `mapbox-gl` e `@mapbox/mapbox-gl-draw` ao `optimizeDeps`
- Configurado `manualChunks` para separar código do Mapbox em chunks próprios
- Isso melhora o carregamento e evita problemas de bundle

### 2. **vercel.json** - Headers CORS e Segurança
- Adicionado headers CORS para permitir requisições de APIs externas (GEE, Mapbox)
- Configurado `Cross-Origin-Embedder-Policy: credentialless` para workers do Mapbox
- Configurado `Cross-Origin-Opener-Policy: same-origin` para segurança

### 3. **.env.production** - Variáveis de Ambiente
- Arquivo criado com token do Mapbox
- Template para URL do backend em produção

## 📋 Checklist de Deploy no Vercel

### Antes de fazer o deploy:

1. **✅ Verificar package.json**
   - Mapbox GL JS instalado: `mapbox-gl@^3.1.2`
   - Mapbox Draw instalado: `@mapbox/mapbox-gl-draw@^1.4.3`

2. **✅ Configurar Variáveis de Ambiente no Vercel**
   - Ir em: Settings → Environment Variables
   - Adicionar:
     ```
     VITE_MAPBOX_TOKEN = pk.eyJ1IjoiYW5kcmV3b2J4IiwiYSI6ImNtMWh2MXZ5eDBqNnQyeG9za2R1N2lwc2YifQ.7yCrlwa4nNFKpg2TcQoFQg
     VITE_API_URL = https://seu-backend-url.com
     ```

3. **✅ Verificar Importações CSS**
   - Confirmar que `App.tsx` tem:
     ```typescript
     import 'mapbox-gl/dist/mapbox-gl.css';
     import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
     ```

4. **✅ Testar Build Local**
   ```bash
   npm run build
   npm run preview
   ```

### Durante o Deploy:

1. **Fazer commit das alterações**
   ```bash
   git add .
   git commit -m "feat: Configuração Mapbox para Vercel"
   git push origin main
   ```

2. **Vercel vai detectar automaticamente**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Aguardar build (2-5 minutos)**

### Após o Deploy:

1. **Testar funcionalidades:**
   - ✅ Mapa carrega em modo escuro?
   - ✅ Controles de navegação visíveis?
   - ✅ Consegue desenhar polígonos?
   - ✅ Botão 3D funciona?
   - ✅ Prédios 3D aparecem em zoom próximo?
   - ✅ Tiles GEE carregam?
   - ✅ Mosaicos podem ser carregados?

2. **Verificar Console do Navegador (F12)**
   - Não deve ter erros relacionados a Mapbox
   - Não deve ter erros CORS
   - Tiles devem carregar sem 403/404

## 🔧 Configurações Necessárias no Vercel Dashboard

### Environment Variables (obrigatório):
```
VITE_MAPBOX_TOKEN = pk.eyJ1IjoiYW5kcmV3b2J4IiwiYSI6ImNtMWh2MXZ5eDBqNnQyeG9za2R1N2lwc2YifQ.7yCrlwa4nNFKpg2TcQoFQg
VITE_API_URL = https://seu-backend.herokuapp.com (ou URL do seu backend)
```

### Build & Development Settings:
- Framework Preset: **Vite**
- Build Command: `npm run build` (padrão)
- Output Directory: `dist` (padrão)
- Install Command: `npm install` (padrão)

### Root Directory:
- Se projeto frontend está em subpasta: `frontend`
- Se está na raiz: deixar em branco

## ⚠️ Possíveis Problemas e Soluções

### Problema: "mapbox-gl.css not found"
**Solução**: Verificar que importação está no topo de `App.tsx`:
```typescript
import 'mapbox-gl/dist/mapbox-gl.css';
```

### Problema: "MAPBOX_TOKEN is undefined"
**Solução**: 
1. Adicionar variável de ambiente no Vercel
2. Nome DEVE começar com `VITE_` para Vite detectar
3. Fazer redeploy após adicionar variável

### Problema: Mapa não aparece/tela branca
**Solução**:
1. Abrir console (F12)
2. Verificar se tem erro de token inválido
3. Verificar se CSS foi carregado
4. Verificar se há erro de CORS

### Problema: Tiles GEE não carregam
**Solução**:
1. Verificar headers CORS no `vercel.json` (já configurado)
2. Backend precisa ter headers CORS corretos
3. URLs dos tiles devem estar corretas

### Problema: Build falha com "out of memory"
**Solução**:
1. Adicionar em `package.json` scripts:
```json
"build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
```

## 🎯 Resumo do que PRECISA fazer no Vercel:

1. ✅ **Arquivos já estão configurados** (vite.config.ts, vercel.json)
2. ⚠️ **FALTA**: Adicionar variáveis de ambiente no dashboard do Vercel:
   - `VITE_MAPBOX_TOKEN`
   - `VITE_API_URL`
3. ✅ **Fazer commit e push** para disparar deploy automático

## 📝 Comando Resumido:

```bash
# 1. Commit das configurações
git add .
git commit -m "config: Preparar deploy Vercel com Mapbox"
git push origin main

# 2. Aguardar deploy automático no Vercel

# 3. Adicionar variáveis de ambiente no dashboard:
# https://vercel.com/seu-projeto/settings/environment-variables
```

---

**Status**: ✅ Arquivos configurados  
**Próximo Passo**: Adicionar variáveis de ambiente no Vercel e fazer deploy
