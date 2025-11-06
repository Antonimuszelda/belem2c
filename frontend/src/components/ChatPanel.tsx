// frontend/src/components/ChatPanel.tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceCallScreen from './VoiceCallScreen';
import './ChatPanel.css';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  polygon: Array<{ lat: number; lng: number }>;
  activeLayers: Record<string, string>;
  geojsonLayerData: any;
  startDate: string;
  endDate: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'jatai';
  timestamp: Date;
}

export default function ChatPanel({ isOpen, onClose, polygon, activeLayers, geojsonLayerData, startDate, endDate }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'bee' | 'morph' | 'panel'>('bee');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_BASE = (import.meta as any).env.VITE_API_URL || "http://127.0.0.1:8000";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Controlar animação de entrada
  useEffect(() => {
    if (isOpen) {
      setAnimationPhase('bee');
      setTimeout(() => setAnimationPhase('morph'), 3000);
      setTimeout(() => {
        setAnimationPhase('panel');
        setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
        }, 100);
      }, 3800);
    } else {
      setAnimationPhase('bee');
      // Limpar mensagens ao fechar o chat
      setMessages([]);
    }
  }, [isOpen]);

  // NÃO carregar contexto inicial automaticamente - aguardar usuário falar primeiro
  // useEffect removido para não enviar mensagem automática

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const contextData = {
        polygon: polygon.length >= 3 ? polygon : null,
        satellite_layers: activeLayers,
        geojson_data: geojsonLayerData,
        start_date: startDate,
        end_date: endDate,
        metadata: {
          layers_count: Object.keys(activeLayers).length,
          has_polygon: polygon.length >= 3
        }
      };

      const response = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          context_data: contextData
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();

      const jataiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'jatai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, jataiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ Erro ao processar mensagem: ${error.message || error}`,
        sender: 'jatai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  const contextData = {
    polygon: polygon.length >= 3 ? polygon : null,
    satellite_layers: activeLayers,
    geojson_data: geojsonLayerData,
    start_date: startDate,
    end_date: endDate,
    metadata: {
      layers_count: Object.keys(activeLayers).length,
      has_polygon: polygon.length >= 3
    }
  };

  return (
    <>
      <VoiceCallScreen 
        isActive={isVoiceMode} 
        onClose={() => setIsVoiceMode(false)}
        contextData={contextData}
      />
      
      <div className="chat-panel-overlay" onClick={onClose}>
      <AnimatePresence mode="wait">
        {/* Fase 1: Abelha voando pela tela */}
        {animationPhase === 'bee' && (
          <motion.div
            key="bee"
            className="jatai-bee-flying"
            style={{
              position: 'fixed',
              width: '150px',
              height: '150px',
              zIndex: 10000
            }}
            initial={{ 
              left: -200, 
              top: window.innerHeight * 0.8,
              scale: 0.4,
              rotate: -45
            }}
            animate={{ 
              left: [
                -200,
                window.innerWidth * 0.3 - 75,
                window.innerWidth * 0.7 - 75,
                window.innerWidth * 0.4 - 75,
                window.innerWidth / 2 - 75
              ],
              top: [
                window.innerHeight * 0.8,
                window.innerHeight * 0.3 - 75,
                window.innerHeight * 0.6 - 75,
                window.innerHeight * 0.2 - 75,
                window.innerHeight / 2 - 75
              ],
              scale: [0.4, 0.8, 0.9, 1.0, 1.2],
              rotate: [-45, 20, -15, 10, 0],
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              duration: 3,
              ease: "easeInOut",
              times: [0, 0.3, 0.55, 0.8, 1]
            }}
          >
            <div className="bee-container">
              <img src="/images/jatai-logo.png" alt="JATAÍ" className="jatai-bee-img" />
              
              {/* Asas batendo */}
              <motion.div 
                className="bee-wing bee-wing-left"
                animate={{ 
                  scaleY: [1, 1.5, 1],
                  rotate: [0, -25, 0]
                }}
                transition={{ 
                  duration: 0.08,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div 
                className="bee-wing bee-wing-right"
                animate={{ 
                  scaleY: [1, 1.5, 1],
                  rotate: [0, 25, 0]
                }}
                transition={{ 
                  duration: 0.08,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Rastro de luz seguindo a abelha */}
              <motion.div
                className="bee-trail-path"
                style={{
                  position: 'absolute',
                  width: '300px',
                  height: '3px',
                  left: '-150px',
                  top: '50%',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 193, 7, 0.8) 50%, transparent 100%)',
                  filter: 'blur(8px)',
                  transformOrigin: 'center',
                  pointerEvents: 'none'
                }}
                animate={{
                  opacity: [0.6, 0.9, 0.6],
                  scaleX: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Glow ao redor da abelha */}
              <motion.div
                className="bee-trail"
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                  scale: [0.9, 1.3, 0.9]
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>
        )}

        {/* Fase 2: Transformação em logo (spin e brilho) */}
        {animationPhase === 'morph' && (
          <motion.div
            key="morph"
            className="jatai-logo-transforming"
            style={{
              position: 'fixed',
              left: window.innerWidth / 2 - 75,
              top: window.innerHeight / 2 - 75,
              width: '150px',
              height: '150px',
              zIndex: 10000
            }}
            initial={{ 
              scale: 1.2,
              rotate: 0,
              filter: 'brightness(1)'
            }}
            animate={{ 
              scale: [1.2, 1.5, 1],
              rotate: [0, 180, 360],
              filter: ['brightness(1)', 'brightness(2)', 'brightness(1)']
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.8,
              ease: "easeInOut"
            }}
          >
            <img src="/images/jatai-logo.png" alt="JATAÍ" className="jatai-logo-img" />
            <motion.div
              className="logo-glow-pulse"
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.3, 1]
              }}
              transition={{
                duration: 0.8,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        )}

        {/* Fase 3: Painel expandindo da logo */}
        {animationPhase === 'panel' && (
          <motion.div 
            key="panel"
            className="chat-panel" 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              transformOrigin: 'center center'
            }}
            initial={{ 
              left: window.innerWidth / 2 - 75,
              top: window.innerHeight / 2 - 75,
              scale: 0,
              opacity: 0,
              borderRadius: '50%',
              width: 150,
              height: 150
            }}
            animate={{ 
              left: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : '5%',
              top: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : '7.5%',
              scale: 1,
              opacity: 1,
              borderRadius: '24px',
              width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100vw' : '90%',
              height: typeof window !== 'undefined' && window.innerWidth < 768 ? '100vh' : '85vh'
            }}
            exit={{ 
              scale: 0,
              opacity: 0,
              borderRadius: '50%'
            }}
            transition={{ 
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <div className="chat-header">
              <div className="chat-header-title">
                <motion.div 
                  className="jatai-avatar"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
                >
                  <img src="/images/jatai-logo.png" alt="JATAÍ" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                </motion.div>
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                  >
                    JATAÍ
                  </motion.h2>
                  <motion.p 
                    className="chat-status"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="status-dot"></span>
                    Online
                  </motion.p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="chat-voice-btn" 
                  onClick={() => setIsVoiceMode(true)}
                  title="Chat de voz"
                >
                  🎤
                </button>
                <button className="chat-close-btn" onClick={onClose}>✕</button>
              </div>
            </div>

            <motion.div 
              className="chat-messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              {messages.length === 0 && !isLoading && (
                <motion.div 
                  className="chat-welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.7)'
                  }}
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{ fontSize: '4rem', marginBottom: '1rem' }}
                  >
                    🐝
                  </motion.div>
                  <h3 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '1.5rem' }}>
                    JATAÍ
                  </h3>
                  <p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
                    Pergunte sobre a área no mapa, análises ambientais,<br />
                    satélites ou qualquer coisa relacionada! 🛰️
                  </p>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    width: '100%',
                    maxWidth: '600px',
                    marginTop: '1rem'
                  }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}>
                      💡 "Quero ver a temperatura"
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}>
                      🌳 "Tem muita vegetação aqui?"
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}>
                      💧 "Essa área alaga?"
                    </div>
                  </div>
                </motion.div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className={`message message-${msg.sender}`}>
                  {msg.sender === 'jatai' && (
                    <div className="message-avatar">
                      <img src="/images/jatai-logo.png" alt="JATAÍ" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                    </div>
                  )}
                  <div className="message-content">
                    <div className="message-text" dangerouslySetInnerHTML={{ 
                      __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/`(.*?)`/g, '<code>$1</code>')
                        .replace(/\n/g, '<br/>')
                    }} />
                    <div className="message-time">
                      {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {msg.sender === 'user' && <div className="message-avatar user-avatar">👤</div>}
                </div>
              ))}
              {isLoading && (
                <div className="message message-jatai">
                  <div className="message-avatar">
                    <img src="/images/jatai-logo.png" alt="JATAÍ" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </motion.div>

            <motion.div 
              className="chat-input-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                placeholder={messages.length === 0 ? "E aí! Pergunta qualquer coisa sobre a área... 🐝" : "Digite tua pergunta..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <button 
                className="chat-send-btn" 
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
