import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createFoundation } from './app/bootstrap';
import './styles/base.css';
import './styles/simulator.css';
import './styles/simulator-3d.css';
import './styles/simulator-v3.css';
import './styles/simulator-humans.css';
import './styles/simulator-yolo.css';
const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el punto de entrada de VISION AI.');
try {
  const { config, sessionRepository } = createFoundation(import.meta.env);
  createRoot(root).render(<StrictMode><App origin={config.origin} apiBaseUrl={config.apiBaseUrl} sessionRepository={sessionRepository} /></StrictMode>);
} catch {
  const message = document.createElement('p');
  message.textContent = 'No se pudo iniciar la aplicación. Revisa la configuración del entorno.';
  message.setAttribute('role', 'alert'); root.replaceChildren(message);
}
