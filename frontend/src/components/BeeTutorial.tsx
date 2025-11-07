// frontend/src/components/BeeTutorial.tsx
import React, { useState, useEffect } from 'react';
import './BeeTutorial.css';

interface BeeTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  position: { x: number; y: number };
  message: string;
  highlight?: string; // Selector CSS do elemento a destacar
}

const BeeTutorial: React.FC<BeeTutorialProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = tela inicial
  const [beePosition, setBeePosition] = useState({ x: 50, y: 50 }); // Posição central inicial
  const [isFlying, setIsFlying] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  const tutorialSteps: TutorialStep[] = [
    {
      position: { x: 5, y: 15 },
      message: "Aqui você encontra as ferramentas de desenho! 🎨 Use para desenhar polígonos, retângulos ou adicionar marcadores no mapa.",
      highlight: '.sidebar'
    },
    {
      position: { x: 5, y: 45 },
      message: "Esses são os botões de camadas! 🛰️ Clique para carregar dados de satélite como temperatura, vegetação e água.",
      highlight: '.layer-buttons'
    },
    {
      position: { x: 90, y: 10 },
      message: "Aqui você define as datas! 📅 Escolha o período que quer analisar - essencial para buscar imagens de satélite.",
      highlight: '.date-controls'
    },
    {
      position: { x: 90, y: 40 },
      message: "Esse é o painel de chat! 💬 Converse comigo para tirar dúvidas sobre os dados e análises. Sou sua copiloto ambiental!",
      highlight: '.chat-button'
    },
    {
      position: { x: 50, y: 50 },
      message: "E esse é o mapa interativo! 🗺️ Aqui você visualiza todas as camadas de dados. Zoom, arraste e explore à vontade!",
      highlight: '#map'
    }
  ];

  useEffect(() => {
    if (currentStep >= 0 && currentStep < tutorialSteps.length) {
      // Animar voo até a posição
      setIsFlying(true);
      setShowMessage(false);
      
      setTimeout(() => {
        setBeePosition(tutorialSteps[currentStep].position);
      }, 100);

      setTimeout(() => {
        setIsFlying(false);
        setShowMessage(true);
      }, 1500);
    } else if (currentStep === tutorialSteps.length) {
      // Tutorial completo - voo de saída
      handleComplete();
    }
  }, [currentStep]);

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
    // Voo dinâmico de saída
    setIsFlying(true);
    setShowMessage(false);
    
    // Voo em espiral saindo
    setBeePosition({ x: 50, y: 50 });
    setTimeout(() => setBeePosition({ x: 70, y: 30 }), 200);
    setTimeout(() => setBeePosition({ x: 90, y: 50 }), 400);
    setTimeout(() => setBeePosition({ x: 110, y: 30 }), 600);
    setTimeout(() => setBeePosition({ x: 130, y: -20 }), 800);
    
    setTimeout(() => {
      onComplete();
    }, 1200);
  };

  return (
    <div className="bee-tutorial-overlay">
      {/* Abelha animada */}
      <div 
        className={`bee-character ${isFlying ? 'flying' : 'hovering'}`}
        style={{
          left: `${beePosition.x}%`,
          top: `${beePosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="bee-body">
          <div className="bee-wing bee-wing-left"></div>
          <div className="bee-wing bee-wing-right"></div>
          <div className="bee-stripes">
            <div className="bee-stripe"></div>
            <div className="bee-stripe"></div>
            <div className="bee-stripe"></div>
          </div>
          <div className="bee-face">
            <div className="bee-eye bee-eye-left"></div>
            <div className="bee-eye bee-eye-right"></div>
            <div className="bee-smile"></div>
          </div>
          <div className="bee-antenna bee-antenna-left"></div>
          <div className="bee-antenna bee-antenna-right"></div>
        </div>
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

      {/* Mensagem do tutorial */}
      {currentStep >= 0 && currentStep < tutorialSteps.length && showMessage && (
        <div 
          className="tutorial-message"
          style={{
            left: beePosition.x > 50 ? '10%' : 'auto',
            right: beePosition.x <= 50 ? '10%' : 'auto',
            top: `${Math.max(10, Math.min(70, beePosition.y - 10))}%`
          }}
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

      {/* Highlight do elemento atual */}
      {currentStep >= 0 && currentStep < tutorialSteps.length && tutorialSteps[currentStep].highlight && (
        <div className="tutorial-highlight-overlay">
          <style>{`
            ${tutorialSteps[currentStep].highlight} {
              position: relative;
              z-index: 10001 !important;
              box-shadow: 0 0 0 4px var(--neon-yellow), 0 0 20px var(--neon-yellow) !important;
              animation: pulse-highlight 2s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default BeeTutorial;
