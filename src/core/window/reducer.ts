import { cascadeRect, clampRect } from './layout';
import type {
  NewWindow,
  ViewportSize,
  WindowAction,
  WindowInstance,
  WindowManagerState,
} from './types';

export function createWindowManagerState(viewport: ViewportSize): WindowManagerState {
  return { windows: [], viewport, nextZ: 1, cascadeStep: 0 };
}

/** Highest z-index among the windows that are actually visible. */
export function activeWindowId(state: WindowManagerState): string | null {
  let best: WindowInstance | null = null;
  for (const window of state.windows) {
    if (window.state === 'minimized') continue;
    if (!best || window.z > best.z) best = window;
  }
  return best ? best.id : null;
}

function withWindows(
  state: WindowManagerState,
  windows: WindowInstance[],
): WindowManagerState {
  return { ...state, windows };
}

function focusWindow(state: WindowManagerState, id: string): WindowManagerState {
  const target = state.windows.find((window) => window.id === id);
  if (!target) return state;
  const z = state.nextZ;
  return {
    ...state,
    nextZ: z + 1,
    windows: state.windows.map((window) =>
      window.id === id
        ? { ...window, z, state: window.state === 'minimized' ? 'normal' : window.state }
        : window,
    ),
  };
}

function patchWindow(
  state: WindowManagerState,
  id: string,
  patch: (window: WindowInstance) => WindowInstance,
): WindowManagerState {
  let changed = false;
  const windows = state.windows.map((window) => {
    if (window.id !== id) return window;
    const next = patch(window);
    if (next !== window) changed = true;
    return next;
  });
  return changed ? withWindows(state, windows) : state;
}

export function windowManagerReducer(
  state: WindowManagerState,
  action: WindowAction,
): WindowManagerState {
  switch (action.type) {
    case 'open': {
      const request: NewWindow = action.window;
      if (request.docKey) {
        const existing = state.windows.find((window) => window.docKey === request.docKey);
        if (existing) {
          // A second launch can carry new arguments (a help topic, a project to
          // show): the open window takes them, then comes to the front.
          const updated =
            Object.keys(request.params).length > 0
              ? patchWindow(state, existing.id, (window) => ({
                  ...window,
                  params: { ...window.params, ...request.params },
                }))
              : state;
          return focusWindow(updated, existing.id);
        }
      }
      const minimum = { width: request.minWidth, height: request.minHeight };
      const rect = clampRect(
        request.rect ??
          cascadeRect(
            state.cascadeStep,
            request.size ?? { width: 520, height: 360 },
            state.viewport,
          ),
        state.viewport,
        minimum,
      );
      const window: WindowInstance = {
        ...request,
        rect,
        state: request.state ?? 'normal',
        z: state.nextZ,
        createdAt: Date.now(),
      };
      return {
        ...state,
        windows: [...state.windows, window],
        nextZ: state.nextZ + 1,
        cascadeStep: state.cascadeStep + 1,
      };
    }

    case 'close':
      return withWindows(
        state,
        state.windows.filter((window) => window.id !== action.id),
      );

    case 'focus':
      return focusWindow(state, action.id);

    case 'minimize':
      return patchWindow(state, action.id, (window) =>
        window.minimizable && window.state !== 'minimized'
          ? { ...window, state: 'minimized' }
          : window,
      );

    case 'maximize': {
      const next = patchWindow(state, action.id, (window) =>
        window.maximizable && window.state !== 'maximized'
          ? { ...window, state: 'maximized', z: state.nextZ }
          : window,
      );
      /* The z it took is spent: the next window must land above it, not beside it. */
      return next === state ? state : { ...next, nextZ: state.nextZ + 1 };
    }

    case 'restore':
      return patchWindow(state, action.id, (window) =>
        window.state === 'normal' ? window : { ...window, state: 'normal' },
      );

    case 'toggle': {
      const active = activeWindowId(state);
      if (active === action.id) return windowManagerReducer(state, { type: 'minimize', id: action.id });
      return focusWindow(state, action.id);
    }

    case 'move':
      return patchWindow(state, action.id, (window) =>
        window.state === 'normal'
          ? {
              ...window,
              rect: clampRect(
                { ...window.rect, x: action.rect.x, y: action.rect.y },
                state.viewport,
                { width: window.minWidth, height: window.minHeight },
              ),
            }
          : window,
      );

    case 'resize':
      return patchWindow(state, action.id, (window) =>
        window.resizable
          ? {
              ...window,
              rect: clampRect(action.rect, state.viewport, {
                width: window.minWidth,
                height: window.minHeight,
              }),
            }
          : window,
      );

    case 'setTitle':
      return patchWindow(state, action.id, (window) =>
        window.title === action.title ? window : { ...window, title: action.title },
      );

    case 'setParams':
      return patchWindow(state, action.id, (window) => ({ ...window, params: action.params }));

    case 'setViewport': {
      const width = Math.max(320, action.viewport.width);
      const height = Math.max(240, action.viewport.height);
      if (width === state.viewport.width && height === state.viewport.height) return state;
      const viewport = { width, height };
      return {
        ...state,
        viewport,
        windows: state.windows.map((window) =>
          window.state === 'maximized'
            ? window
            : {
                ...window,
                rect: clampRect(window.rect, viewport, {
                  width: window.minWidth,
                  height: window.minHeight,
                }),
              },
        ),
      };
    }

    case 'minimizeAll':
      return withWindows(
        state,
        state.windows.map((window) =>
          window.state === 'minimized' ? window : { ...window, state: 'minimized' },
        ),
      );

    case 'closeAll':
      return withWindows(state, []);

    case 'resetLayout': {
      let step = state.cascadeStep;
      const windows = state.windows.map((window) => {
        const rect = cascadeRect(step, { width: window.rect.width, height: window.rect.height }, state.viewport);
        step += 1;
        return { ...window, state: 'normal' as const, rect };
      });
      return { ...state, windows, cascadeStep: step };
    }

    case 'hydrate':
      return {
        ...state,
        windows: action.windows,
        nextZ:
          action.windows.reduce((top, window) => Math.max(top, window.z), 0) + 1,
        cascadeStep: action.windows.length,
      };

    default:
      return state;
  }
}
