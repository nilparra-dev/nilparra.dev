import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { clampViewportSize, effectiveRect, isViewportSmall, TASKBAR_HEIGHT } from './layout';
import { loadWindowLayout, saveWindowLayout } from './layoutPersistence';
import { activeWindowId, createWindowManagerState, windowManagerReducer } from './reducer';
import type { NewWindow, ViewportSize, WindowInstance, WindowRect } from './types';
import { uiViewport } from '../../ui/scale';

function measureViewport(): ViewportSize {
  if (typeof window === 'undefined') return { width: 1024, height: 740 };
  return clampViewportSize(uiViewport());
}

function prefersCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export interface WindowManagerValue {
  windows: WindowInstance[];
  /** The window that currently owns the focus ring and the taskbar highlight. */
  activeId: string | null;
  viewport: ViewportSize;
  /** True while the screen is too narrow for floating windows. */
  compact: boolean;
  /** False until the saved session has been restored. */
  booted: boolean;
  openWindow: (request: NewWindow) => void;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  maximize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
  taskbarClick: (id: string) => void;
  move: (id: string, rect: WindowRect) => void;
  resize: (id: string, rect: WindowRect) => void;
  setTitle: (id: string, title: string) => void;
  setParams: (id: string, params: Record<string, unknown>) => void;
  minimizeAll: () => void;
  closeAll: () => void;
  resetLayout: () => void;
  rectOf: (id: string) => WindowRect | null;
  /**
   * Registers a guard that decides whether a window may close (unsaved
   * documents ask for confirmation). Returns the unregister function.
   */
  registerCloseGuard: (id: string, handler: () => boolean | Promise<boolean>) => () => void;
  /** Cycles to the next window in z order (keyboard window switching). */
  cycleWindows: () => void;
  /** Message for the aria-live region. */
  announcement: string;
  announce: (message: string) => void;
}

const WindowManagerContext = createContext<WindowManagerValue | null>(null);

export interface WindowManagerProviderProps {
  /** Application ids known to the registry: unknown saved windows are dropped. */
  appIds: readonly string[];
  /** Icon ids known to the asset manifest. */
  iconIds: readonly string[];
  children: ReactNode;
}

export function WindowManagerProvider({
  appIds,
  iconIds,
  children,
}: WindowManagerProviderProps) {
  const [state, dispatch] = useReducer(windowManagerReducer, undefined, () =>
    createWindowManagerState(measureViewport()),
  );
  const [compact, setCompact] = useState(() => prefersCoarsePointer());
  const [booted, setBooted] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const restored = useRef(false);

  /* --- viewport tracking ------------------------------------------- */
  useEffect(() => {
    const onResize = () => {
      const next = measureViewport();
      dispatch({ type: 'setViewport', viewport: next });
      setCompact(isViewportSmall(next) || prefersCoarsePointer());
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  /* --- session restore --------------------------------------------- */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const knownApps = new Set(appIds);
    const knownIcons = new Set(iconIds);
    const windows = loadWindowLayout(
      measureViewport(),
      (appId) => knownApps.has(appId),
      (icon) => knownIcons.has(icon),
    );
    dispatch({ type: 'hydrate', windows });
    setBooted(true);
  }, [appIds, iconIds]);

  /* --- persistence -------------------------------------------------- */
  useEffect(() => {
    if (!booted) return;
    const timeout = window.setTimeout(() => saveWindowLayout(state.windows), 250);
    return () => window.clearTimeout(timeout);
  }, [state.windows, booted]);

  const activeId = useMemo(() => activeWindowId(state), [state]);

  const openWindow = useCallback((request: NewWindow) => {
    dispatch({ type: 'open', window: request });
  }, []);

  const guards = useRef(new Map<string, () => boolean | Promise<boolean>>());

  const registerCloseGuard = useCallback(
    (id: string, handler: () => boolean | Promise<boolean>) => {
      guards.current.set(id, handler);
      return () => {
        if (guards.current.get(id) === handler) guards.current.delete(id);
      };
    },
    [],
  );

  const close = useCallback(async (id: string) => {
    const guard = guards.current.get(id);
    if (guard) {
      let allowed = false;
      try {
        allowed = await guard();
      } catch {
        allowed = false;
      }
      if (!allowed) return;
    }
    guards.current.delete(id);
    dispatch({ type: 'close', id });
  }, []);

  const value = useMemo<WindowManagerValue>(() => {
    const windowsById = new Map(state.windows.map((window) => [window.id, window]));
    return {
      windows: state.windows,
      activeId,
      viewport: state.viewport,
      compact,
      booted,
      openWindow,
      close: (id) => void close(id),
      focus: (id) => dispatch({ type: 'focus', id }),
      minimize: (id) => dispatch({ type: 'minimize', id }),
      maximize: (id) => dispatch({ type: 'maximize', id }),
      restore: (id) => dispatch({ type: 'restore', id }),
      toggleMaximize: (id) => {
        const window = windowsById.get(id);
        if (!window || !window.maximizable) return;
        dispatch({ type: window.state === 'maximized' ? 'restore' : 'maximize', id });
      },
      taskbarClick: (id) => dispatch({ type: 'toggle', id }),
      move: (id, rect) => dispatch({ type: 'move', id, rect }),
      resize: (id, rect) => dispatch({ type: 'resize', id, rect }),
      setTitle: (id, title) => dispatch({ type: 'setTitle', id, title }),
      setParams: (id, params) => dispatch({ type: 'setParams', id, params }),
      minimizeAll: () => {
        guards.current.clear();
        dispatch({ type: 'minimizeAll' });
      },
      closeAll: () => {
        guards.current.clear();
        dispatch({ type: 'closeAll' });
      },
      resetLayout: () => dispatch({ type: 'resetLayout' }),
      registerCloseGuard,
      rectOf: (id) => {
        const window = windowsById.get(id);
        return window ? effectiveRect(window, state.viewport) : null;
      },
      cycleWindows: () => {
        const visible = state.windows
          .filter((window) => window.state !== 'minimized')
          .sort((a, b) => a.z - b.z);
        if (visible.length < 2) return;
        const current = activeWindowId(state);
        const index = visible.findIndex((window) => window.id === current);
        const next = visible[(index + 1) % visible.length];
        dispatch({ type: 'focus', id: next.id });
      },
      announcement,
      announce: setAnnouncement,
    };
  }, [state, activeId, compact, booted, openWindow, close, registerCloseGuard, announcement]);

  return (
    <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>
  );
}

export function useWindowManager(): WindowManagerValue {
  const value = useContext(WindowManagerContext);
  if (!value) throw new Error('useWindowManager must be used inside <WindowManagerProvider>');
  return value;
}

export { TASKBAR_HEIGHT };
