import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installPixelPerfectScale } from './ui/scale';
import './styles/reset.css';
import './styles/static.css';
import './styles/cursors.generated.css';
import './styles/tokens.css';
import './styles/win95.css';
import './styles/desktop.css';
import './styles/apps.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root container');

/*
 * Clickjacking guard. Production sends X-Frame-Options and frame-ancestors
 * (public/_headers), but `vite preview` and any other static host do not, so
 * the client side defence stays: when the desktop is embedded by another site,
 * every pointer event would land on the attacker's overlay instead of on the
 * confirmation dialogs. Breaking out (or blanking the page while framed)
 * removes that attack. Local development is embedded by tooling all the time,
 * so it stays allowed.
 */
(function frameGuard(): void {
  const top = window.top;
  if (!top || top === window.self) return;
  const host = window.self.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (isLocal) return;
  try {
    // Navigating the top frame is one of the few operations the same-origin
    // policy still allows through a cross-origin WindowProxy.
    top.location.href = window.self.location.href;
  } catch {
    // The ancestor could not be replaced (sandbox without allow-top-navigation):
    // hide the whole application so the clickjacking overlay has nothing to draw over.
    document.documentElement.style.visibility = 'hidden';
  }
})();

installPixelPerfectScale();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
