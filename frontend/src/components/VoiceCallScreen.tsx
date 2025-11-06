import { motion } from 'framer-motion';
import './VoiceCallScreen.css';

interface VoiceCallScreenProps {
  isActive: boolean;
  onClose: () => void;
  contextData?: any;
}

export default function VoiceCallScreen({ isActive, onClose }: VoiceCallScreenProps) {
  if (!isActive) return null;

  return (
    <motion.div
      className="voice-call-screen"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.28 }}
    >
      <button className="voice-close-btn" onClick={() => onClose()}>
        ✕
      </button>

      <motion.div
        className="voice-logo-container"
      >
        <img src="/images/jatai-logo.png" alt="JATAÍ" className="voice-logo" />
        <motion.div className="voice-glow" />
      </motion.div>

      <motion.div className="voice-status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <div className="status-indicator">
          <span className="status-dot" />
          Em desenvolvimento
        </div>

        <motion.div className="voice-transcript" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          🚧 Funcionalidade de chat por voz em desenvolvimento 🚧
          <br />
          <br />
          Por enquanto, use o chat de texto ao lado!
        </motion.div>
      </motion.div>

      <div className="voice-hint">Clique no X para fechar</div>
    </motion.div>
  );
}
