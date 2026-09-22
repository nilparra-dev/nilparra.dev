import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadPreferences } from './core/prefs/PreferencesProvider';
import { installPixelScale } from './ui/pixelScale';
import './styles/reset.css';
import './styles/cursors.generated.css';
import './styles/tokens.css';
import './styles/win95.css';
import './styles/desktop.css';
import './styles/apps.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root container');

/*
 * Clickjacking guard. GitHub Pages cannot send the X-Frame-Options or
 * frame-ancestors headers, so the only defence is the client side one: when
 * the desktop is embedded by another site, every pointer event would land on
 * the attacker's overlay instead of on the confirmation dialogs. Breaking out
 * (or blanking the page while framed) removes that attack. Local development
 * and the Pages preview are embedded by tooling all the time, so they stay
 * allowed.
 */
(function frameGuard(): void {
  const top = window.top;
  if (!top || top === window.self) return;
  const host = window.self.location.hostname;
  const isLocalOrPreview =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.github.io');
  if (isLocalOrPreview) return;
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

/* Decided before the first render so windows are laid out at the final size. */
installPixelScale(loadPreferences().pixelScale);

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
