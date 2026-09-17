import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/reset.css';
import './styles/cursors.generated.css';
import './styles/tokens.css';
import './styles/win95.css';
import './styles/desktop.css';
import './styles/apps.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root container');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
