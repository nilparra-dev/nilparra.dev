import { useCallback } from 'react';
import { useT } from '../i18n/I18nProvider';
import { createId } from '../ids';
import { useWindowManager } from '../window/WindowManagerProvider';
import type { WindowRect, WindowState } from '../window/types';
import { APP_CATALOG } from './catalog';

export interface LaunchOptions {
  appId: string;
  /** Launch arguments: file ids, paths, search terms… */
  params?: Record<string, unknown>;
  /** Overrides the catalogue title (document windows use the file name). */
  title?: string;
  /** Deduplication key for document windows. */
  docKey?: string | null;
  rect?: WindowRect;
  state?: WindowState;
}

/**
 * Opens an application window using the catalogue defaults.
 *
 * "single" applications are deduplicated by their own id, so clicking twice on
 * My Computer focuses the existing window instead of opening a second one.
 */
export function useAppLauncher() {
  const wm = useWindowManager();
  const t = useT();

  return useCallback(
    (options: LaunchOptions) => {
      const app = APP_CATALOG[options.appId];
      if (!app) {
        console.warn(`Unknown application: ${options.appId}`);
        return;
      }
      const docKey = options.docKey !== undefined ? options.docKey : app.instance === 'single' ? app.id : null;
      wm.openWindow({
        id: createId('win'),
        appId: app.id,
        title: options.title ?? t(app.nameKey),
        icon: app.icon,
        size: app.defaultSize,
        resizable: app.resizable ?? true,
        minimizable: app.minimizable ?? true,
        maximizable: app.maximizable ?? false,
        minWidth: app.minSize?.width ?? 240,
        minHeight: app.minSize?.height ?? 140,
        params: options.params ?? {},
        docKey,
        helpTopicId: app.helpTopicId ?? null,
        ...(options.rect ? { rect: options.rect } : {}),
        state: options.state ?? (app.maximized ? 'maximized' : 'normal'),
      });
    },
    [t, wm],
  );
}

export interface AppRenderProps {
  windowId: string;
  params: Record<string, unknown>;
}

export type AppComponent = (props: AppRenderProps) => React.ReactElement | null;
