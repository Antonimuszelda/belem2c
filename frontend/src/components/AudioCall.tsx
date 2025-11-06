import { useEffect, useRef, useState } from 'react';

// Componente leve para Vercel: usa Web Speech API para STT e SpeechSynthesis para TTS.
// Envia texto transcrito para o backend (Railway) em /api/agent/chat/text e reproduz a resposta.

export default function AudioCall() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Inicializar SpeechRecognition se disponível
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API SpeechRecognition não disponível no navegador. Use Chrome/Edge com suporte.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      // enviar para backend
      sendMessageToBackend(text);
    };

    rec.onend = () => {
      setListening(false);
    };

    rec.onerror = (ev: any) => {
      console.error('SpeechRecognition error', ev);
      setListening(false);
    };

    recognitionRef.current = rec;
  }, []);

  const startListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return alert('SpeechRecognition não disponível');
    setTranscript('');
    setResponseText('');
    setListening(true);
    try {
      rec.start();
    } catch (e) {
      // já rodando
    }
  };

  const stopListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch (e) {}
    setListening(false);
  };

  async function sendMessageToBackend(text: string) {
    const apiBase = (import.meta as any).env.VITE_API_URL || '';
    const url = (apiBase ? apiBase : '') + '/api/agent/chat/text';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('Erro backend', res.status, txt);
        setResponseText('Erro na resposta do servidor');
        return;
      }

      const data = await res.json();
      setResponseText(data.response || data);
      // TTS via SpeechSynthesis
      speakText(data.response || data);
    } catch (e) {
      console.error('Falha ao contatar backend', e);
      setResponseText('Falha ao contatar backend');
    }
  }

  function speakText(text: string) {
    if (!text) return;
    const synth = window.speechSynthesis;
    if (!synth) return console.warn('SpeechSynthesis não disponível');

    // Escolher voz pt-BR se disponível
    let utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';

    // ajustar pitch/rate para um tom mais natural
    utter.rate = 0.95;
    utter.pitch = 1;

    // tentar selecionar voz pt-BR
    const voices = synth.getVoices();
    const ptVoice = voices.find((v: SpeechSynthesisVoice) => v.lang && v.lang.startsWith('pt'));
    if (ptVoice) utter.voice = ptVoice;

    synth.cancel();
    synth.speak(utter);
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8, maxWidth: 640 }}>
      <h3>Chamada com Sacy (exemplo)</h3>
      <p>Pressione para começar a falar. O reconhecimento usa o navegador (Web Speech API) e o backend dialetiza a resposta.</p>
      <div style={{ marginBottom: 8 }}>
        {!listening ? (
          <button onClick={startListening}>Iniciar fala</button>
        ) : (
          <button onClick={stopListening}>Parar</button>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <strong>Transcrição:</strong>
        <div style={{ minHeight: 36, background: '#f7f7f7', padding: 8 }}>{transcript || '...'}</div>
      </div>

      <div>
        <strong>Resposta (dialetizada):</strong>
        <div style={{ minHeight: 48, background: '#eef7ff', padding: 8 }}>{responseText || '...'}</div>
      </div>
    </div>
  );
}
