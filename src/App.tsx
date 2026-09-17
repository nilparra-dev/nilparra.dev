import type { ReactNode } from 'react';
import { ICON_URLS } from './assets/generated/icons';
import { APP_IDS } from './core/apps/catalog';
import { DialogProvider } from './core/dialogs/DialogProvider';
import { VfsProvider } from './core/fs/VfsProvider';
import { I18nProvider } from './core/i18n/I18nProvider';
import { PreferencesProvider, usePreferences } from './core/prefs/PreferencesProvider';
import { WindowManagerProvider } from './core/window/WindowManagerProvider';
import { Shell } from './shell/Shell';
import { MenuLayerProvider } from './ui/menu/MenuLayer';

const ICON_IDS = Object.keys(ICON_URLS);

/** Picks the catalogue of the language stored in the preferences. */
function LocaleBridge({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  return <I18nProvider locale={preferences.locale}>{children}</I18nProvider>;
}

export function App() {
  return (
    <PreferencesProvider>
      <LocaleBridge>
        <WindowManagerProvider appIds={APP_IDS} iconIds={ICON_IDS}>
          <VfsProvider>
            <DialogProvider>
              <MenuLayerProvider>
                <Shell />
              </MenuLayerProvider>
            </DialogProvider>
          </VfsProvider>
        </WindowManagerProvider>
      </LocaleBridge>
    </PreferencesProvider>
  );
}
