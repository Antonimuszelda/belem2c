# ⚠️ SOLUÇÃO URGENTE PARA ERRO 405

## 🔴 O PROBLEMA

O Vercel está usando a URL ERRADA porque a variável `VITE_API_URL` está configurada INCORRETAMENTE.

**URL Atual (ERRADA):**
```
https://harp-ia-demo-wwbv.vercel.app/harp-iademo-production.up.railway.app/api/...
```

Isso significa que `VITE_API_URL` está como `/harp-iademo-production.up.railway.app` (SEM https://)

---

## ✅ SOLUÇÃO EM 3 PASSOS

### PASSO 1: Acessar Vercel
1. Vá para https://vercel.com
2. Faça login
3. Selecione o projeto `harp-ia-demo-wwbv`

### PASSO 2: Configurar a Variável
1. Clique em **Settings** (no topo)
2. Clique em **Environment Variables** (menu lateral esquerdo)
3. Procure se já existe `VITE_API_URL`
   - Se EXISTE: Clique no ícone de lápis ✏️ para EDITAR
   - Se NÃO EXISTE: Clique em **Add New**

4. Configure EXATAMENTE assim:
   ```
   Name (Nome): VITE_API_URL
   Value (Valor): https://harp-iademo-production.up.railway.app
   ```

   ⚠️ **IMPORTANTE:**
   - ✅ DEVE começar com `https://`
   - ✅ NÃO colocar `/` no final
   - ✅ Usar a URL COMPLETA

5. Marque todos os ambientes:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

6. Clique em **Save**

### PASSO 3: Forçar Redeploy
1. Vá para **Deployments** (no topo)
2. Encontre o deployment mais recente (primeiro da lista)
3. Clique nos 3 pontinhos (...) do lado direito
4. Clique em **Redeploy**
5. Na janela que abre, clique em **Redeploy** novamente para confirmar

---

## 🔍 COMO VERIFICAR SE FUNCIONOU

Depois do redeploy (aguarde 2-3 minutos):

1. Abra https://harp-ia-demo-wwbv.vercel.app
2. Pressione F12 para abrir o Console
3. Cole este comando:
   ```javascript
   console.log('API URL:', import.meta.env.VITE_API_URL);
   ```
4. Pressione Enter

**Deve mostrar:**
```
API URL: https://harp-iademo-production.up.railway.app
```

**Se mostrar `undefined` ou algo diferente, a variável NÃO foi configurada corretamente!**

---

## 🆘 SE AINDA NÃO FUNCIONAR

### Opção 1: Deletar e Recriar a Variável
1. Em **Environment Variables**, DELETEINALMENTE a variável `VITE_API_URL`
2. Clique em **Add New** 
3. Adicione novamente com o valor correto
4. Faça **Redeploy**

### Opção 2: Verificar se o Railway está funcionando
1. Abra https://harp-iademo-production.up.railway.app/health
2. Deve mostrar:
   ```json
   {
     "status": "ok",
     "services": {"gee": "ok"},
     "timestamp": "2025-11-07T..."
   }
   ```
3. Se NÃO funcionar, o problema está no Railway, não no Vercel

### Opção 3: Limpar Cache do Vercel
1. Em **Settings** → **General**
2. Role até **Build & Development Settings**
3. Ative **Clear Build Cache** na próxima build

---

## 📸 SCREENSHOT DO QUE FAZER

Quando você estiver em **Environment Variables**, deve ficar assim:

```
┌─────────────────────────────────────────────────────────────┐
│ Name          │ Value                                        │
├─────────────────────────────────────────────────────────────┤
│ VITE_API_URL  │ https://harp-iademo-production.up.railway.app│
│               │ ✓ Production ✓ Preview ✓ Development        │
└─────────────────────────────────────────────────────────────┘
```

---

## ⏱️ QUANTO TEMPO LEVA?

- Configurar variável: **30 segundos**
- Build do Vercel: **2-3 minutos**
- **Total: ~3 minutos**

---

## 🎯 RESUMO DO QUE VOCÊ DEVE FAZER AGORA

1. ✅ Ir para Vercel → Settings → Environment Variables
2. ✅ Adicionar/Editar `VITE_API_URL` com valor `https://harp-iademo-production.up.railway.app`
3. ✅ Marcar todos os ambientes (Production, Preview, Development)
4. ✅ Salvar
5. ✅ Ir para Deployments → Redeploy
6. ✅ Aguardar 3 minutos
7. ✅ Testar no console: `console.log(import.meta.env.VITE_API_URL)`

**SE VOCÊ FEZ TUDO ISSO E AINDA NÃO FUNCIONA, ME ENVIE UM PRINT DA TELA DE ENVIRONMENT VARIABLES!**
