# 🐝 INSTRUÇÕES PARA ADICIONAR A LOGO DO JATAÍ

## Passo a Passo

1. **Salve a imagem do JATAÍ** (a abelha verde/amarela que foi enviada)
   
2. **Renomeie a imagem para:** `jatai-logo.png`

3. **Coloque no caminho:**
   ```
   frontend/public/images/jatai-logo.png
   ```

4. **Crie a pasta `images` se não existir:**
   ```powershell
   cd "c:\Users\anton\OneDrive\Documentos\harpia\sentine\sentinel0-aidsafwdsignaw igk\ARARABRASIL\sentinel-ia\frontend\public"
   if (!(Test-Path "images")) { New-Item -ItemType Directory -Name "images" }
   ```

## Como a Animação Funciona

Quando você clicar no botão "Chat com IA", vai acontecer:

### 🎬 Fase 1: Abelha Voando (1 segundo)
- A abelha JATAÍ aparece do lado esquerdo da tela
- Voa até o centro com asas batendo
- Tem um rastro de luz dourada

### ✨ Fase 2: Transformação (0.8 segundos)  
- A abelha gira 360° com brilho intenso
- Pulsa e aumenta o brilho
- Se transforma suavemente

### 📦 Fase 3: Painel Abrindo (0.6 segundos)
- O painel do chat se expande a partir da logo
- Começa como um círculo pequeno
- Cresce até virar o painel completo
- Logo do JATAÍ aparece no header girando

## Testando

1. Inicie o frontend:
   ```powershell
   cd frontend
   npm run dev
   ```

2. Desenhe um polígono no mapa

3. Clique no botão "Chat com IA"

4. Observe a animação da abelha! 🐝✨

## Detalhes Técnicos

A animação usa:
- **Framer Motion** para animações suaves
- **3 fases** controladas por estado
- **Timings precisos**: 1s → 0.8s → 0.6s
- **Efeitos visuais**: 
  - Asas batendo (0.1s loop infinito)
  - Rastro luminoso pulsante
  - Glow dourado na transformação
  - Expansão circular → retangular

## Cores do JATAÍ

- **Primária**: #FFD700 (Dourado)
- **Secundária**: #FFA500 (Laranja)
- **Glow**: rgba(255, 193, 7, 0.6)

Tudo configurado! Só falta adicionar a imagem. 🚀
