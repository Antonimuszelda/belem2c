// 🔊 Audio Service - Efeitos Sonoros Futuristas
class AudioService {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // 🎵 Som de clique suave (Cyberpunk)
  playClick() {
    this.playTone(800, 0.05, 'square', 0.2);
  }

  // 🎵 Som de hover (sutil)
  playHover() {
    this.playTone(600, 0.03, 'sine', 0.15);
  }

  // 🎵 Som de toggle/switch
  playToggle() {
    if (!this.audioContext) return;
    this.playTone(1200, 0.08, 'square', 0.25);
    setTimeout(() => this.playTone(900, 0.08, 'square', 0.2), 50);
  }

  // 🎵 Som de sucesso (análise completa)
  playSuccess() {
    if (!this.audioContext) return;
    this.playTone(523, 0.1, 'sine', 0.3); // C5
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 100); // E5
    setTimeout(() => this.playTone(784, 0.2, 'sine', 0.3), 200); // G5
  }

  // 🎵 Som de carregamento/processamento
  playProcessing() {
    if (!this.audioContext) return;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.playTone(440 + i * 100, 0.1, 'sawtooth', 0.15), i * 150);
    }
  }

  // 🎵 Som de erro/alerta
  playError() {
    if (!this.audioContext) return;
    this.playTone(200, 0.15, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.3), 100);
  }

  // 🎵 Som de abertura de painel
  playPanelOpen() {
    if (!this.audioContext) return;
    this.playTone(400, 0.05, 'sine', 0.2);
    setTimeout(() => this.playTone(800, 0.1, 'sine', 0.25), 60);
  }

  // 🎵 Som de fechamento de painel
  playPanelClose() {
    if (!this.audioContext) return;
    this.playTone(800, 0.05, 'sine', 0.2);
    setTimeout(() => this.playTone(400, 0.1, 'sine', 0.25), 60);
  }

  // 🎵 Som de desenho no mapa
  playDraw() {
    this.playTone(1000, 0.03, 'triangle', 0.15);
  }

  // 🎵 Som de localização GPS
  playGPS() {
    if (!this.audioContext) return;
    this.playTone(2000, 0.05, 'sine', 0.2);
    setTimeout(() => this.playTone(2500, 0.08, 'sine', 0.25), 80);
  }

  // 🎵 Som de startup - inicialização épica
  playStartup() {
    if (!this.audioContext) return;
    
    // Sequência de tons ascendentes para startup
    const notes = [
      { freq: 220, delay: 0, dur: 0.2 },     // A3
      { freq: 330, delay: 200, dur: 0.15 },  // E4
      { freq: 440, delay: 350, dur: 0.15 },  // A4
      { freq: 550, delay: 500, dur: 0.12 },  // C#5
      { freq: 660, delay: 650, dur: 0.25 },  // E5
      { freq: 880, delay: 850, dur: 0.4 },   // A5 (finale)
    ];

    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.freq, note.dur, 'sine', 0.25);
      }, note.delay);
    });
  }

  // Ativar/desativar sons
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const audioService = new AudioService();
