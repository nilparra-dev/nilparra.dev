/**
 * Session restore: the open windows (and where they were) survive a reload,
 * which also means the Control Panel can offer "restore the window layout".
 *
 * Only serialisable fields are stored; unknown applications are dropped when
 * the layout is read back.
 */
import { readStored, writeStored } from '../persist/storage';
import { clampRect } from './layout';
import type { ViewportSize, WindowInstance, WindowState } from './types';

export const LAYOUT_VERSION = 1;
export const LAYOUT_KEY = 'window-layout';

interface StoredWindow {
  id: string;
  appId: string;
  title: string;
  icon: string;
  rect: { x: number; y: number; width: number; height: number };
  state: WindowState;
  z: number;
  resizable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  minWidth: number;
  minHeight: number;
  params: Record<string, unknown>;
  docKey: string | null;
  helpTopicId: string | null;
}

export function saveWindowLayout(windows: WindowInstance[]): void {
  const stored: StoredWindow[] = windows
    .filter((window) => window.state !== 'minimized')
    .map((window) => ({
      id: window.id,
      appId: window.appId,
      title: window.title,
      icon: window.icon,
      rect: window.rect,
      state: window.state === 'maximized' ? 'maximized' : 'normal',
      z: window.z,
      resizable: window.resizable,
      minimizable: window.minimizable,
      maximizable: window.maximizable,
      minWidth: window.minWidth,
      minHeight: window.minHeight,
      params: window.params,
      docKey: window.docKey,
      helpTopicId: window.helpTopicId,
    }));
  writeStored(LAYOUT_KEY, LAYOUT_VERSION, stored);
}

export function loadWindowLayout(
  viewport: ViewportSize,
  isKnownApp: (appId: string) => boolean,
  isKnownIcon: (icon: string) => boolean,
): WindowInstance[] {
  const stored = readStored<StoredWindow[]>(LAYOUT_KEY, LAYOUT_VERSION, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(
      (window) =>
        window &&
        typeof window.appId === 'string' &&
        isKnownApp(window.appId) &&
        window.rect &&
        typeof window.rect.width === 'number',
    )
    .slice(0, 24)
    .map((window) => ({
      id: window.id,
      appId: window.appId,
      title: String(window.title ?? ''),
      icon: (isKnownIcon(window.icon) ? window.icon : 'doc-unknown') as WindowInstance['icon'],
      rect: clampRect(window.rect, viewport, {
        width: Math.max(160, window.minWidth ?? 200),
        height: Math.max(90, window.minHeight ?? 120),
      }),
      state: window.state === 'maximized' ? 'maximized' : 'normal',
      z: typeof window.z === 'number' ? window.z : 1,
      resizable: window.resizable !== false,
      minimizable: window.minimizable !== false,
      maximizable: window.maximizable !== false,
      minWidth: window.minWidth ?? 200,
      minHeight: window.minHeight ?? 120,
      params: typeof window.params === 'object' && window.params !== null ? window.params : {},
      docKey: typeof window.docKey === 'string' ? window.docKey : null,
      helpTopicId: typeof window.helpTopicId === 'string' ? window.helpTopicId : null,
      createdAt: Date.now(),
    }));
}
