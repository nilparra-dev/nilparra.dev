import { useEffect, useRef } from 'react';
import { APP_COMPONENTS } from '../apps/components';
import { useT } from '../i18n/I18nProvider';
import { usePreferences } from '../prefs/PreferencesProvider';
import { playSound } from '../sound/sounds';
import { WindowFrame } from './WindowFrame';
import { useWindowManager } from './WindowManagerProvider';

/**
 * Renders every open window.
 *
 * On a small screen only the active window is shown (filling the desktop area)
 * and the taskbar switches between them, which is the mobile behaviour asked
 * for in the brief.
 */
export function WindowsLayer() {
  const wm = useWindowManager();
  const t = useT();
  const { preferences } = usePreferences();
  const knownTitles = useRef(new Map<string, string>());
  const previousActive = useRef<string | null>(null);
  const soundOptions = { enabled: preferences.soundsEnabled, volume: preferences.volume };

  useEffect(() => {
    const currentIds = new Set(wm.windows.map((window) => window.id));
    for (const window of wm.windows) {
      if (!knownTitles.current.has(window.id)) {
        wm.announce(t('a11y.windowOpened', { name: window.title }));
        playSound('open', soundOptions);
      }
      knownTitles.current.set(window.id, window.title);
    }
    for (const [id, title] of [...knownTitles.current.entries()]) {
      if (!currentIds.has(id)) {
        wm.announce(t('a11y.windowClosed', { name: title }));
        playSound('close', soundOptions);
        knownTitles.current.delete(id);
      }
    }
  }, [wm, t, preferences.soundsEnabled, preferences.volume]);

  useEffect(() => {
    const previous = previousActive.current;
    previousActive.current = wm.activeId;
    if (!previous || previous === wm.activeId) return;
    const previousWindow = wm.windows.find((window) => window.id === previous);
    if (previousWindow && previousWindow.state !== 'minimized' && !wm.compact) return;
    if (wm.activeId) {
      const activeWindow = document.getElementById(`window-${wm.activeId}`);
      if (!activeWindow?.contains(document.activeElement)) activeWindow?.focus({ preventScroll: true });
    } else {
      document.querySelector<HTMLElement>('.desktop-surface')?.focus({ preventScroll: true });
    }
  }, [wm.activeId, wm.compact, wm.windows]);

  return (
    <>
      {/* Hidden windows stay mounted so drafts, games and close guards survive. */}
      {wm.windows.map((instance) => {
        const Application = APP_COMPONENTS[instance.appId];
        if (!Application) return null;
        return (
          <WindowFrame
            key={instance.id}
            instance={instance}
            active={instance.id === wm.activeId}
            hidden={instance.state === 'minimized' || (wm.compact && instance.id !== wm.activeId)}
          >
            {/* Split applications own their loading and retry state. */}
            <Application windowId={instance.id} params={instance.params} />
          </WindowFrame>
        );
      })}
    </>
  );
}
