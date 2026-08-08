import { createRoot } from 'react-dom/client';

import { App } from './App';

// Fase 3: este entry pasa a ser el runtime de hidratación (hydrateRoot sobre el
// HTML emitido por el core + escaneo de islas data-likekiri-island).
const container = document.getElementById('root');
if (!container) {
  throw new Error('falta el nodo #root en el documento');
}
createRoot(container).render(<App />);
