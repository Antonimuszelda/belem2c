# 🚀 HARP-IA - Urban Climate Digital Twin Dashboard

## 🎨 Nova Interface Futurística Cyberpunk/Solarpunk

Uma interface de alta fidelidade para monitoramento de riscos sócio-ambientais na Amazônia, com design moderno, intuitivo e impressionante.

---

## ✨ Funcionalidades Implementadas

### 1. **Map-First Approach**
- Mapa em tela cheia como protagonista
- Estilo dark (CartoDB Dark Matter) para visual cyberpunk
- Camadas de dados com cores neon (Verde para NDVI, Vermelho para Calor, Azul para Água)

### 2. **Top-Right Utilities Stack** 📍🌦️⏰

#### **Live Weather Widget** 🌦️
- Integração com **OpenMeteo API**
- Dados em tempo real:
  - Temperatura atual
  - Umidade relativa
  - Velocidade do vento
  - Condição climática com ícones
- Widget expansível com hover
- Atualização automática a cada 5 minutos
- Efeito glassmorphism e animações de pulso

#### **GPS Location Button** 📍
- Botão de localização precisa
- Voa até a localização do usuário no mapa
- Zoom automático para nível 12
- Animações de GPS pulsante
- Feedback sonoro e visual

#### **Date/Time Indicator** ⏰
- Relógio digital em tempo real
- Exibição de data e hora (pt-BR)
- Estilo cyberpunk com fonte monospace
- Efeito de pulso ciano

### 3. **Layer Control Sidebar** (Esquerda) 🎛️

Um sidebar futurístico com sistema de **accordion** organizado por categorias:

#### **Categorias Implementadas:**

##### 🧑‍🤝‍🧑 SOCIOECONÔMICO
- **Favelas e Comunidades Vulneráveis** (Fonte: IBGE)

##### 🏙️ URBANO
- **Infraestrutura Urbana** (Microsoft Buildings + False Color IR Sentinel-2)
  - Camada estática com menor cobertura de nuvens disponível

##### 🌿 AMBIENTAL
- **Cobertura Vegetal** (MODIS)
- **Saúde da Vegetação (NDVI)** (Sentinel-2)
  - Auto-carrega imagem mais recente livre de nuvens

##### 🌡️ CLIMÁTICO (com Time-Lapse)
- **Ilhas de Calor Urbana (UTFVI)**
  - Suporta modo Time-Lapse para visualizar evolução temporal
  - Animação de acumulação de calor ao longo do tempo
- **Risco de Alagamento (NDWI)**
  - Suporta modo Time-Lapse
  - Visualização de tendências de incidência

##### ⛰️ ELEVAÇÃO
- **Topografia (DEM 2002)**
  - Camada estática

#### **Recursos do Sidebar:**
- **Accordion animado** com expansão/colapso suave
- **Indicadores visuais**: badges mostrando quantas camadas estão ativas por categoria
- **Ícones e cores temáticas** por categoria
- **Botão Time-Lapse** para camadas climáticas
- **Hover effects** com som e brilho neon
- **Glassmorphism** com blur e transparência
- **Scrollbar customizado** estilo cyberpunk

### 4. **AI Analyst Feature** 🤖

#### **Fluxo de Interação:**

1. **Desenhar Área**: Usuário seleciona ferramenta "Desenhar"
2. **Desenhar Polígono**: Usuário define área de interesse no mapa
3. **Abrir AI Analyst**: Clica no botão flutuante "AI ANALYST"
4. **Estado de Carregamento**: Modal exibe animação de análise:
   - "Analisando Assinaturas Espectrais..."
   - "Processando Dados Climáticos..."
   - "Calculando Índices de Vegetação (NDVI)..."
   - "Avaliando Risco de Alagamento (NDWI)..."
   - "Detectando Ilhas de Calor Urbanas..."
   - "Gerando Relatório com IA Generativa..."

5. **Resultado Detalhado**:
   
   **Métricas em Cards:**
   - 🌡️ **Temperatura Média** (em °C)
   - 🌿 **Densidade Vegetal (NDVI)** (em %)
   - 💧 **Risco de Alagamento** (Baixo/Médio/Alto/Crítico)
   
   **Texto Gerado por IA:**
   - Resumo inteligente da análise da área
   - Interpretação contextualizada dos dados espectrais e climáticos
   - Avisos e alertas quando necessário
   
   **Recomendações Técnicas:**
   - 🌳 Aumentar cobertura arbórea
   - 💧 Implementar sistemas de drenagem sustentável (SuDS)
   - 🏗️ Revisar zoneamento urbano
   - 📊 Monitoramento contínuo recomendado

### 5. **Floating Action Buttons (FABs)** 🎯

Botões flutuantes estilosos no canto inferior direito:

- **🤖 AI ANALYST**: Abre modal de análise IA (desabilitado até desenhar polígono)
- **✏️ DESENHAR**: Ativa/desativa modo de desenho de polígono
- **🏔️/🗺️ 3D/2D**: Alterna entre visualização 2D e 3D com terreno
- **💬 CHAT IA**: Abre painel de chat com IA (desabilitado até desenhar polígono)
- **🗑️ LIMPAR**: Remove todos os desenhos e camadas

#### **Recursos dos FABs:**
- **Glassmorphism** com backdrop-filter blur
- **Bordas neon** específicas por função (magenta para IA, verde para desenho, etc.)
- **Animações hover** com translação e escala
- **Efeitos sonoros** únicos para cada ação
- **Estados disabled** para UX clara
- **Responsivo**: Em mobile, transforma em botões circulares apenas com ícones

### 6. **Efeitos Sonoros Futurísticos** 🔊

Implementado **AudioService** com síntese de áudio WebAudio API:

- **Click**: Tom suave para botões comuns
- **Hover**: Som sutil ao passar mouse
- **Toggle**: Som duplo para switches
- **Success**: Sequência harmônica (C5 → E5 → G5)
- **Processing**: Loop de tons ascendentes
- **Error**: Tom grave de alerta
- **Panel Open/Close**: Tons espaciais
- **Draw**: Tom triangular agudo
- **GPS**: Beep duplo de localização

### 7. **Tema Visual Cyberpunk/Solarpunk** 🎨

#### **Paleta de Cores:**
```css
--harpia-cyan: #00d9ff        /* Cyan vibrante - detalhes turquesa */
--harpia-magenta: #ff00a0     /* Magenta cyberpunk */
--neon-green: #00e676         /* Verde neon - vegetação */
--neon-red: #ff1744           /* Vermelho neon - calor */
--neon-blue: #2962ff          /* Azul neon - água */
```

#### **Efeitos Visuais:**
- **Glassmorphism**: Transparência com blur backdrop
- **Neon Glows**: Box-shadows com cores vibrantes
- **Pulse Animations**: Elementos "respiram" continuamente
- **Smooth Transitions**: Cubic-bezier para movimentos fluidos
- **Hover States**: Transformações e brilhos intensificados

### 8. **Animações e Interações** ✨

- **Icon Pulse**: Ícones pulsam suavemente
- **Hover Scale**: Elementos crescem ao passar mouse
- **Slide Animations**: Accordion e modais com entrada suave
- **Scanning Effect**: Radar circular no AI Analyst loading
- **Progress Bar**: Barra de progresso com gradiente animado
- **Float Effects**: Botões e widgets flutuam no hover

---

## 📱 Responsividade

### **Desktop** (>1024px)
- Sidebar expandida por padrão
- FABs com labels completos
- Todos os widgets visíveis

### **Tablet** (768px - 1024px)
- Sidebar inicia expansível
- FABs com labels
- Controles adaptativos

### **Mobile** (<768px)
- Sidebar na parte inferior (60vh máx)
- FABs circulares sem texto
- Widgets compactos no topo
- Touch gestures otimizados

---

## 🛠️ Tecnologias Utilizadas

- **React 18** + **TypeScript**
- **Mapbox GL JS** (dark theme)
- **Vite** (build tool)
- **WebAudio API** (efeitos sonoros)
- **OpenMeteo API** (clima ao vivo)
- **Geolocation API** (GPS)
- **CSS3** (animações, glassmorphism, gradientes)

---

## 🚀 Como Usar

### **Iniciar Desenvolvimento:**
```bash
cd frontend
npm install
npm run dev
```

### **Build de Produção:**
```bash
npm run build
```

### **Acessar:**
```
http://localhost:5173
```

---

## 🎯 Fluxo de Uso Recomendado

1. **Explorar Mapa**: Navegue pelo mapa dark da Amazônia
2. **Ativar Camadas**: Abra sidebar e selecione camadas de interesse
3. **Observar Clima**: Widget de clima atualiza automaticamente
4. **Localizar-se**: Use botão GPS para ir à sua localização
5. **Desenhar Área**: Ative modo desenho e trace polígono
6. **Análise IA**: Clique em "AI ANALYST" para relatório detalhado
7. **Time-Lapse**: Visualize evolução temporal de ilhas de calor
8. **Chat IA**: Converse com assistente sobre a área selecionada

---

## 🎨 Design System

### **Typography:**
- **Headers**: Font-weight 700-800, letter-spacing 1-2px
- **Body**: -apple-system, BlinkMacSystemFont, Segoe UI
- **Mono**: Courier New (para relógio digital)

### **Spacing:**
- **Gaps**: 8px, 12px, 16px, 20px, 24px
- **Padding**: 12-32px dependendo do componente
- **Border Radius**: 8px (small), 12-16px (medium), 50px (pills)

### **Shadows:**
- **Soft**: `0 8px 32px rgba(0, 0, 0, 0.5)`
- **Medium**: `0 12px 48px rgba(0, 0, 0, 0.6)`
- **Neon Glow**: `0 0 20-40px rgba(<color>, 0.3-0.6)`

---

## 📝 Notas Técnicas

- **Estado Gerenciado**: useState hooks para reatividade
- **Refs**: useRef para instâncias Mapbox e MapboxDraw
- **Effects**: useEffect para lifecycle e subscriptions
- **Memoização**: Evitado re-renders desnecessários
- **Performance**: Camadas otimizadas, debounce onde necessário
- **Acessibilidade**: Títulos, labels, estados disabled claros

---

## 🐛 Troubleshooting

### **Mapbox não carrega:**
- Verifique o token em `App.tsx`
- Confira conexão com internet

### **Clima não atualiza:**
- OpenMeteo API pode estar offline (raro)
- Verifique CORS no navegador

### **GPS não funciona:**
- Usuário precisa permitir geolocalização
- Funciona apenas em HTTPS (ou localhost)

### **Sons não tocam:**
- Navegador pode bloquear autoplay
- AudioContext precisa de interação do usuário primeiro

---

## 🎉 Features Futuras Sugeridas

- [ ] Integração real com backend para análise IA (atualmente simulado)
- [ ] Time-Lapse funcional com animação de frames
- [ ] Exportar relatórios em PDF
- [ ] Salvar áreas favoritas
- [ ] Comparação lado-a-lado de períodos
- [ ] Integração com mais APIs de clima (NASA, NOAA)
- [ ] Modo offline com cache de tiles

---

## 👨‍💻 Desenvolvido por

**GitHub Copilot** + **Claude Sonnet 4.5**  
Para o projeto HARP-IA - Análise Geoespacial com IA

---

## 📄 Licença

MIT License - Use livremente!

---

**Aproveite o Gêmeo Digital Climático Urbano mais futurístico da Amazônia! 🦅🌳🔥**
