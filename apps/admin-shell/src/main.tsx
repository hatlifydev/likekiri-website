import { createRoot } from 'react-dom/client';

import { App } from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('falta el nodo #root en el documento');
}
createRoot(container).render(<App />);
