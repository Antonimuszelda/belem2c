// frontend/src/components/BeeTutorial.tsx
import React, { useState, useEffect } from 'react';
import './BeeTutorial.css';

interface BeeTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  target: string; // Seletor CSS do elemento
  message: string;
  position: 'left' | 'right' | 'top' | 'bottom';
}

const BeeTutorial: React.FC<BeeTutorialProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = tela inicial
  const [beePosition, setBeePosition] = useState({ x: 50, y: 50 });
  const [isFlying, setIsFlying] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [beeTrail, setBeeTrail] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const tutorialSteps: TutorialStep[] = [
    {
      target: '.sidebar',
      message: "Bem-vindo ao painel de controle! 🎛️ Aqui você tem acesso a todas as ferramentas de análise geoespacial.",
      position: 'right'
    },
    {
      target: '.date-controls',
      message: "Aqui você define as datas! 📅 Escolha o período inicial e final para buscar imagens de satélite. Quanto maior o período, mais imagens disponíveis!",
      position: 'right'
    },
    {
      target: '.cloud-filter',
      message: "Este é o filtro de nuvens! ☁️ Controla o percentual máximo de cobertura de nuvens aceito nas imagens. 0% = só imagens sem nuvens!",
      position: 'right'
    },
    {
      target: '.layers-grid',
      message: "Esses são os botões de camadas de satélite! 🛰️ Cada um carrega um tipo diferente de dado: RGB (cores reais), NDVI (vegetação), NDWI (água), LST (temperatura) e muito mais!",
      position: 'right'
    },
    {
      target: 'button[data-layer="SENTINEL2_RGB"]',
      message: "SENTINEL-2 RGB 📸 - Mostra imagens coloridas reais do satélite europeu Sentinel-2. Perfeito para ver o terreno como seus olhos veriam!",
      position: 'right'
    },
    {
      target: 'button[data-layer="LANDSAT_RGB"]',
      message: "LANDSAT RGB 🛰️ - Imagens do satélite americano Landsat. Útil quando Sentinel não está disponível. Tem histórico desde 1970!",
      position: 'right'
    },
    {
      target: 'button[data-layer="SENTINEL1_VV"]',
      message: "SENTINEL-1 VV 📡 - Radar de satélite que funciona dia e noite, mesmo com nuvens! Ideal para detectar mudanças e monitorar inundações.",
      position: 'right'
    },
    {
      target: 'button[data-layer="NDVI"]',
      message: "NDVI 🌱 - Índice de Vegetação! Verde = muita vegetação saudável. Vermelho = solo exposto ou vegetação morta. Essencial para agricultura!",
      position: 'right'
    },
    {
      target: 'button[data-layer="NDWI"]',
      message: "NDWI 💧 - Índice de Água! Azul = água. Marrom = terra. Perfeito para mapear rios, lagos e monitorar secas ou enchentes.",
      position: 'right'
    },
    {
      target: 'button[data-layer="LST"]',
      message: "LST 🌡️ - Temperatura da Superfície! Cores quentes = áreas mais quentes. Azul = áreas frias. Analise ilhas de calor urbano!",
      position: 'right'
    },
    {
      target: 'button[data-layer="UHI"]',
      message: "UHI 🏙️ - Ilha de Calor Urbano! Compara temperatura da cidade com áreas rurais. Vermelho = área muito mais quente que o normal.",
      position: 'right'
    },
    {
      target: 'button[data-layer="UTFVI"]',
      message: "UTFVI 🌳🏘️ - Índice de Conforto Térmico! Combina vegetação e temperatura. Verde = confortável. Vermelho = muito quente e sem árvores!",
      position: 'right'
    },
    {
      target: 'button[data-layer="DEM"]',
      message: "DEM 🏔️ - Modelo de Elevação! Mostra a altitude do terreno. Útil para análise de relevo, planejamento urbano e risco de deslizamento.",
      position: 'right'
    },
    {
      target: '.btn-communities',
      message: "Carregar Comunidades 🏘️ - Busca dados de favelas e setores censitários dentro da área que você desenhou. Combine com outras camadas!",
      position: 'right'
    },
    {
      target: '.btn-clear',
      message: "Limpar Tudo 🧹 - Remove todos os desenhos, camadas e dados do mapa. Use para recomeçar do zero!",
      position: 'right'
    },
    {
      target: '.chat-toggle',
      message: "Chat com IA! 💬 Clique para conversar comigo e tirar dúvidas sobre os dados. Posso explicar índices, interpretar resultados e dar dicas!",
      position: 'left'
    },
    {
      target: '#map',
      message: "E esse é o mapa interativo! 🗺️ Aqui você visualiza todas as camadas. Use as ferramentas de desenho no canto superior esquerdo do mapa para criar polígonos!",
      position: 'top'
    }
  ];

  useEffect(() => {
    if (currentStep >= 0 && currentStep < tutorialSteps.length) {
      const step = tutorialSteps[currentStep];
      const targetElement = document.querySelector(step.target);
      
      if (targetElement) {
        // Calcular posição do elemento
        const rect = targetElement.getBoundingClientRect();
        const newPos = calculateBeePosition(rect, step.position);
        
        // Animar voo rápido
        setIsFlying(true);
        setShowMessage(false);
        
        // Criar rastro
        createTrail(beePosition, newPos);
        
        setTimeout(() => {
          setBeePosition(newPos);
        }, 50);

        setTimeout(() => {
          setIsFlying(false);
          setShowMessage(true);
          setBeeTrail([]); // Limpar rastro
        }, 600);
      }
    } else if (currentStep === tutorialSteps.length) {
      // Tutorial completo - voo de saída
      handleComplete();
    }
  }, [currentStep]);

  const createTrail = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const trail: Array<{ x: number; y: number; id: number }> = [];
    const steps = 8; // Número de imagens no rastro
    
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      trail.push({
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
        id: Date.now() + i
      });
    }
    
    setBeeTrail(trail);
  };

  const calculateBeePosition = (rect: DOMRect, position: string) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let x = (centerX / window.innerWidth) * 100;
    let y = (centerY / window.innerHeight) * 100;
    
    // Ajustar posição baseado no lado
    switch (position) {
      case 'right':
        x = ((rect.right + 100) / window.innerWidth) * 100;
        break;
      case 'left':
        x = ((rect.left - 100) / window.innerWidth) * 100;
        break;
      case 'top':
        y = ((rect.top - 100) / window.innerHeight) * 100;
        break;
      case 'bottom':
        y = ((rect.bottom + 100) / window.innerHeight) * 100;
        break;
    }
    
    return { x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) };
  };

  const handleStart = () => {
    setCurrentStep(0);
  };

  const handleSkipTutorial = () => {
    // Animação de voo rápido para fora
    setIsFlying(true);
    setBeePosition({ x: 120, y: -20 });
    setTimeout(() => {
      onSkip();
    }, 800);
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = () => {
    // Voo dinâmico de saída em espiral
    setIsFlying(true);
    setShowMessage(false);
    
    const exitPath = [
      { x: 60, y: 40, delay: 0 },
      { x: 70, y: 50, delay: 200 },
      { x: 80, y: 40, delay: 400 },
      { x: 90, y: 50, delay: 600 },
      { x: 100, y: 30, delay: 800 },
      { x: 120, y: -10, delay: 1000 }
    ];
    
    exitPath.forEach(point => {
      setTimeout(() => setBeePosition({ x: point.x, y: point.y }), point.delay);
    });
    
    setTimeout(() => {
      onComplete();
    }, 1400);
  };

  const getMessagePosition = () => {
    if (currentStep < 0 || currentStep >= tutorialSteps.length) return {};
    
    const step = tutorialSteps[currentStep];
    const targetElement = document.querySelector(step.target);
    
    if (!targetElement) return {};
    
    const rect = targetElement.getBoundingClientRect();
    
    switch (step.position) {
      case 'right':
        return {
          left: `${rect.right + 150}px`,
          top: `${rect.top + rect.height / 2 - 100}px`
        };
      case 'left':
        return {
          left: `${rect.left - 470}px`,
          top: `${rect.top + rect.height / 2 - 100}px`
        };
      case 'top':
        return {
          left: `${rect.left + rect.width / 2 - 225}px`,
          top: `${rect.top - 280}px`
        };
      case 'bottom':
        return {
          left: `${rect.left + rect.width / 2 - 225}px`,
          top: `${rect.bottom + 20}px`
        };
      default:
        return {};
    }
  };

  const getHighlightPosition = () => {
    if (currentStep < 0 || currentStep >= tutorialSteps.length) return {};
    
    const step = tutorialSteps[currentStep];
    const targetElement = document.querySelector(step.target);
    
    if (!targetElement) return {};
    
    const rect = targetElement.getBoundingClientRect();
    
    return {
      left: `${rect.left - 10}px`,
      top: `${rect.top - 10}px`,
      width: `${rect.width + 20}px`,
      height: `${rect.height + 20}px`
    };
  };

  return (
    <>
      {/* Overlay escuro bloqueando interações */}
      <div className="tutorial-dark-overlay"></div>
      
      <div className="bee-tutorial-overlay">
        {/* Rastro da abelha */}
        {isFlying && beeTrail.map((pos, index) => (
          <div
            key={pos.id}
            className="bee-trail"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              opacity: (index + 1) / beeTrail.length * 0.6,
              animationDelay: `${index * 0.05}s`
            }}
          >
            <img 
              src="/images/jatai-logo.png" 
              alt="" 
              className="bee-logo"
            />
          </div>
        ))}
        
        {/* Logo JATAÍ como abelha voadora */}
        <div 
          className={`bee-character ${isFlying ? 'flying' : 'hovering'}`}
          style={{
            left: `${beePosition.x}%`,
            top: `${beePosition.y}%`,
          }}
        >
          <img 
            src="/images/jatai-logo.png" 
            alt="JATAÍ" 
            className="bee-logo"
          />
        </div>

        {/* Tela inicial */}
        {currentStep === -1 && (
          <div className="tutorial-welcome">
            <div className="welcome-card">
              <div className="welcome-header">
                <h1 className="welcome-title">
                  <span className="wave-emoji">👋</span>
                  Olá! Sou a JATAÍ
                </h1>
                <p className="welcome-subtitle">Sua copiloto ambiental paraense</p>
              </div>
              
              <div className="welcome-message">
                <p>E aí, maninho! Primeira vez aqui? 🐝</p>
                <p>Quer que eu te mostre como funciona essa belezura?</p>
              </div>

              <div className="welcome-buttons">
                <button 
                  className="tutorial-btn tutorial-btn-yes"
                  onClick={handleStart}
                >
                  <i className="icofont-check-circled"></i>
                  Sim, me ensina!
                </button>
                <button 
                  className="tutorial-btn tutorial-btn-no"
                  onClick={handleSkipTutorial}
                >
                  <i className="icofont-close-circled"></i>
                  Não, já sei usar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Highlight do elemento atual */}
        {currentStep >= 0 && currentStep < tutorialSteps.length && (
          <div 
            className="tutorial-highlight"
            style={getHighlightPosition()}
          />
        )}

        {/* Mensagem do tutorial */}
        {currentStep >= 0 && currentStep < tutorialSteps.length && showMessage && (
          <div 
            className="tutorial-message"
            style={getMessagePosition()}
          >
            <div className="message-bubble">
              <div className="message-content">
                <p>{tutorialSteps[currentStep].message}</p>
              </div>
              
              <div className="message-controls">
                <div className="step-indicator">
                  Passo {currentStep + 1} de {tutorialSteps.length}
                </div>
                
                <div className="message-buttons">
                  {currentStep > 0 && (
                    <button 
                      className="tutorial-nav-btn tutorial-nav-prev"
                      onClick={handlePrevious}
                    >
                      <i className="icofont-arrow-left"></i>
                      Voltar
                    </button>
                  )}
                  
                  <button 
                    className="tutorial-nav-btn tutorial-nav-next"
                    onClick={handleNext}
                  >
                    {currentStep === tutorialSteps.length - 1 ? 'Finalizar' : 'Próximo'}
                    <i className="icofont-arrow-right"></i>
                  </button>
                </div>
              </div>
            </div>

            <button 
              className="skip-tutorial-btn"
              onClick={handleSkipTutorial}
              title="Pular tutorial"
            >
              <i className="icofont-close"></i>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default BeeTutorial;

