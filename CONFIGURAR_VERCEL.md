# 🚀 Configuração Urgente do Vercel

## ❌ Problema Atual

A URL da API está sendo concatenada errado:
```
❌ ERRADO: https://harp-ia-demo-wwbv.vercel.app/harp-iademo-production.up.railway.app/api/...
✅ CORRETO: https://harp-iademo-production.up.railway.app/api/...
```

## ⚙️ Solução: Configurar Variável de Ambiente

### Passo 1: Acessar o Painel do Vercel

1. Acesse https://vercel.com/dashboard
2. Encontre o projeto `harp-ia-demo-wwbv`
3. Clique no projeto

### Passo 2: Adicionar Variável de Ambiente

1. Clique em **Settings** (Configurações)
2. No menu lateral, clique em **Environment Variables**
3. Adicione a seguinte variável:

   ```
   Nome: VITE_API_URL
   Valor: https://harp-iademo-production.up.railway.app
   ```

4. Selecione todos os ambientes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. Clique em **Save** (Salvar)

### Passo 3: Fazer Redeploy

Após salvar a variável de ambiente:

1. Vá para a aba **Deployments**
2. Encontre o último deployment
3. Clique nos 3 pontinhos (⋯) ao lado
4. Selecione **Redeploy**
5. Confirme o redeploy

### Passo 4: Aguardar Build

Aguarde 2-3 minutos para o Vercel:
- Reconstruir o projeto
- Aplicar a nova variável de ambiente
- Fazer deploy da nova versão

## ✅ Como Verificar se Funcionou

Após o redeploy, abra o console do navegador em https://harp-ia-demo-wwbv.vercel.app

Você deve ver:
- ✅ Sem erros de 405 (Method Not Allowed)
- ✅ Requisições indo para: `https://harp-iademo-production.up.railway.app/api/...`
- ✅ Tutorial funcionando corretamente

## 🔍 Verificação Rápida

Execute no console do navegador:
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
```

Deve mostrar:
```
API URL: https://harp-iademo-production.up.railway.app
```

---

## 📝 Notas Importantes

1. **A variável deve começar com `VITE_`** - isso é obrigatório no Vite
2. **Não adicione `/` no final da URL**
3. **Use `https://` - nunca `http://`**
4. **Sempre faça redeploy após alterar variáveis**

## 🆘 Se Ainda Não Funcionar

1. Verifique se a URL do Railway está correta: https://harp-iademo-production.up.railway.app
2. Teste a API diretamente: https://harp-iademo-production.up.railway.app/health
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Faça hard refresh (Ctrl+F5)
