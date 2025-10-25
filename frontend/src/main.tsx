import React from 'react';
import ReactDOM from 'react-dom/client';
// Corrigido: Esta linha garante que o tema escuro definido em App.css seja carregado.
import './App.css'; 
import App from './App';

// Se você estiver usando o React 18:
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// NOTA: Se você estiver usando uma versão antiga do React:
// ReactDOM.render(<App />, document.getElementById('root'));