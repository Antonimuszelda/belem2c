import { useState, useEffect, useRef } from 'react';
import './TimelapsePlayer.css';

interface TimelapseFrame {
  date: string;
  imageUrl: string;
  thumbnail?: string;
}

interface TimelapsePlayerProps {
  frames: TimelapseFrame[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function TimelapsePlayer({ frames, isOpen, onClose, title = "Time-Lapse Temporal" }: TimelapsePlayerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(500); // ms per frame
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  // Pre-load all images
  useEffect(() => {
    if (!isOpen || frames.length === 0) return;

    setIsLoading(true);
    let loadedCount = 0;

    frames.forEach(frame => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frames.length) {
          setIsLoading(false);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === frames.length) {
          setIsLoading(false);
        }
      };
      img.src = frame.imageUrl;
    });
  }, [frames, isOpen]);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && !isLoading) {
      intervalRef.current = window.setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % frames.length);
      }, playSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isLoading, playSpeed, frames.length]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentFrame(prev => (prev - 1 + frames.length) % frames.length);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentFrame(prev => (prev + 1) % frames.length);
          break;
        case 'Home':
          e.preventDefault();
          setCurrentFrame(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrentFrame(frames.length - 1);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, frames.length, onClose]);

  if (!isOpen) return null;

  const currentFrameData = frames[currentFrame];
  const progress = frames.length > 0 ? ((currentFrame + 1) / frames.length) * 100 : 0;

  return (
    <div className="timelapse-overlay" onClick={onClose}>
      <div className="timelapse-player" onClick={(e) => e.stopPropagation()}>
        <div className="timelapse-header">
          <h2>
            <i className="icofont-play-alt-2"></i> {title}
          </h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="timelapse-viewer">
          {isLoading ? (
            <div className="loading-animation">
              <div className="spinner"></div>
              <p>Carregando frames...</p>
            </div>
          ) : (
            <>
              <img
                src={currentFrameData?.imageUrl}
                alt={`Frame ${currentFrame + 1}`}
                className="timelapse-frame"
              />
              <div className="frame-info">
                <span className="frame-date">{currentFrameData?.date}</span>
                <span className="frame-counter">
                  {currentFrame + 1} / {frames.length}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="timelapse-controls">
          {/* Progress bar */}
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            <input
              type="range"
              min="0"
              max={frames.length - 1}
              value={currentFrame}
              onChange={(e) => setCurrentFrame(Number(e.target.value))}
              className="scrubber"
              disabled={isLoading}
            />
          </div>

          {/* Control buttons */}
          <div className="control-buttons">
            <button
              className="control-btn"
              onClick={() => setCurrentFrame(0)}
              disabled={isLoading}
              title="Primeiro frame (Home)"
            >
              <i className="icofont-double-left"></i>
            </button>

            <button
              className="control-btn"
              onClick={() => setCurrentFrame(prev => (prev - 1 + frames.length) % frames.length)}
              disabled={isLoading}
              title="Frame anterior (←)"
            >
              <i className="icofont-rounded-left"></i>
            </button>

            <button
              className="control-btn play-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={isLoading}
              title={isPlaying ? "Pausar (Espaço)" : "Play (Espaço)"}
            >
              {isPlaying ? (
                <i className="icofont-ui-pause"></i>
              ) : (
                <i className="icofont-ui-play"></i>
              )}
            </button>

            <button
              className="control-btn"
              onClick={() => setCurrentFrame(prev => (prev + 1) % frames.length)}
              disabled={isLoading}
              title="Próximo frame (→)"
            >
              <i className="icofont-rounded-right"></i>
            </button>

            <button
              className="control-btn"
              onClick={() => setCurrentFrame(frames.length - 1)}
              disabled={isLoading}
              title="Último frame (End)"
            >
              <i className="icofont-double-right"></i>
            </button>
          </div>

          {/* Speed control */}
          <div className="speed-control">
            <label>Velocidade:</label>
            <div className="speed-buttons">
              <button
                className={`speed-btn ${playSpeed === 1000 ? 'active' : ''}`}
                onClick={() => setPlaySpeed(1000)}
              >
                0.5x
              </button>
              <button
                className={`speed-btn ${playSpeed === 500 ? 'active' : ''}`}
                onClick={() => setPlaySpeed(500)}
              >
                1x
              </button>
              <button
                className={`speed-btn ${playSpeed === 250 ? 'active' : ''}`}
                onClick={() => setPlaySpeed(250)}
              >
                2x
              </button>
              <button
                className={`speed-btn ${playSpeed === 125 ? 'active' : ''}`}
                onClick={() => setPlaySpeed(125)}
              >
                4x
              </button>
            </div>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className="thumbnail-strip">
          {frames.map((frame, index) => (
            <div
              key={index}
              className={`thumbnail ${index === currentFrame ? 'active' : ''}`}
              onClick={() => setCurrentFrame(index)}
              title={frame.date}
            >
              <img src={frame.thumbnail || frame.imageUrl} alt={`Thumb ${index + 1}`} />
              {index === currentFrame && <div className="thumbnail-indicator"></div>}
            </div>
          ))}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="shortcuts-hint">
          <small>
            ⌨️ <strong>Espaço:</strong> Play/Pause | <strong>←/→:</strong> Frame anterior/próximo | 
            <strong>Home/End:</strong> Primeiro/Último | <strong>Esc:</strong> Fechar
          </small>
        </div>
      </div>
    </div>
  );
}
