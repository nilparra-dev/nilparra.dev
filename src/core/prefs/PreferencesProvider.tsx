import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { detectLocale, isLocale, type Locale } from '../i18n/I18nProvider';
import { readStored, writeStored } from '../persist/storage';
import { DEFAULT_WALLPAPER_ID, WALLPAPERS } from './wallpapers';

export const PREFERENCES_VERSION = 1;
export const PREFERENCES_KEY = 'preferences';

export interface Preferences {
  /** Resolved language of the interface. Never null once booted. */
  locale: Locale;
  wallpaperId: string;
  soundsEnabled: boolean;
  /** 0..100, used by the synthesised system sounds. */
  volume: number;
  /** The Welcome window opens on the first visit unless this is disabled. */
  openWelcomeOnStart: boolean;
  reduceMotion: boolean;
  /** Draws a solid plate behind desktop icon labels for readability. */
  highContrastLabels: boolean;
  autoArrangeIcons: boolean;
  /** Explorer windows show the folder tree on the left. */
  showExplorerTree: boolean;
  /** Links to other sites ask before opening a new tab. */
  confirmExternalLinks: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  locale: 'es',
  wallpaperId: DEFAULT_WALLPAPER_ID,
  soundsEnabled: false,
  volume: 60,
  openWelcomeOnStart: true,
  reduceMotion: false,
  highContrastLabels: false,
  autoArrangeIcons: true,
  showExplorerTree: true,
  confirmExternalLinks: true,
};

/** Defensive read: stored values can come from a modified or older client. */
export function sanitizePreferences(input: unknown): Preferences {
  const source = (input ?? {}) as Partial<Preferences>;
  const wallpaperIds = new Set(WALLPAPERS.map((wallpaper) => wallpaper.id));
  return {
    locale: isLocale(source.locale) ? source.locale : detectLocale(),
    wallpaperId:
      typeof source.wallpaperId === 'string' && wallpaperIds.has(source.wallpaperId)
        ? source.wallpaperId
        : DEFAULT_PREFERENCES.wallpaperId,
    soundsEnabled:
      typeof source.soundsEnabled === 'boolean'
        ? source.soundsEnabled
        : DEFAULT_PREFERENCES.soundsEnabled,
    volume:
      typeof source.volume === 'number' && Number.isFinite(source.volume)
        ? Math.min(100, Math.max(0, Math.round(source.volume)))
        : DEFAULT_PREFERENCES.volume,
    openWelcomeOnStart:
      typeof source.openWelcomeOnStart === 'boolean'
        ? source.openWelcomeOnStart
        : DEFAULT_PREFERENCES.openWelcomeOnStart,
    reduceMotion:
      typeof source.reduceMotion === 'boolean' ? source.reduceMotion : DEFAULT_PREFERENCES.reduceMotion,
    highContrastLabels:
      typeof source.highContrastLabels === 'boolean'
        ? source.highContrastLabels
        : DEFAULT_PREFERENCES.highContrastLabels,
    autoArrangeIcons:
      typeof source.autoArrangeIcons === 'boolean'
        ? source.autoArrangeIcons
        : DEFAULT_PREFERENCES.autoArrangeIcons,
    showExplorerTree:
      typeof source.showExplorerTree === 'boolean'
        ? source.showExplorerTree
        : DEFAULT_PREFERENCES.showExplorerTree,
    confirmExternalLinks:
      typeof source.confirmExternalLinks === 'boolean'
        ? source.confirmExternalLinks
        : DEFAULT_PREFERENCES.confirmExternalLinks,
  };
}

export interface PreferencesValue {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  reset: () => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    sanitizePreferences(readStored<Preferences | null>(PREFERENCES_KEY, PREFERENCES_VERSION, null)),
  );

  useEffect(() => {
    writeStored(PREFERENCES_KEY, PREFERENCES_VERSION, preferences);
  }, [preferences]);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => sanitizePreferences({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setPreferences({ ...DEFAULT_PREFERENCES, locale: detectLocale() });
  }, []);

  const value = useMemo<PreferencesValue>(
    () => ({ preferences, update, reset }),
    [preferences, update, reset],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return value;
}
