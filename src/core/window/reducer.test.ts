import { describe, expect, it } from 'vitest';
import { activeWindowId, createWindowManagerState, windowManagerReducer } from './reducer';
import type { NewWindow, ViewportSize } from './types';

const viewport: ViewportSize = { width: 1024, height: 740 };

function request(overrides: Partial<NewWindow> = {}): NewWindow {
  return {
    id: overrides.id ?? 'w1',
    appId: 'notepad',
    title: 'Sin título - Bloc de notas',
    icon: 'notepad',
    resizable: true,
    minimizable: true,
    maximizable: true,
    minWidth: 200,
    minHeight: 120,
    params: {},
    docKey: null,
    helpTopicId: null,
    size: { width: 400, height: 300 },
    ...overrides,
  };
}

describe('window manager reducer', () => {
  it('cascades new windows so they do not overlap exactly', () => {
    let state = createWindowManagerState(viewport);
    state = windowManagerReducer(state, { type: 'open', window: request({ id: 'a' }) });
    state = windowManagerReducer(state, { type: 'open', window: request({ id: 'b' }) });
    const [a, b] = state.windows;
    expect(a.rect.x).not.toBe(b.rect.x);
    expect(b.z).toBeGreaterThan(a.z);
    expect(activeWindowId(state)).toBe('b');
  });

  it('focuses the existing window when the same document is opened again', () => {
    let state = createWindowManagerState(viewport);
    state = windowManagerReducer(state, {
      type: 'open',
      window: request({ id: 'first', docKey: 'notepad:file-1' }),
    });
    state = windowManagerReducer(state, {
      type: 'open',
      window: request({ id: 'second', docKey: 'notepad:file-1' }),
    });
    expect(state.windows).toHaveLength(1);
    expect(activeWindowId(state)).toBe('first');
  });

  it('restores a minimised window when its taskbar button is clicked', () => {
    let state = createWindowManagerState(viewport);
    state = windowManagerReducer(state, { type: 'open', window: request({ id: 'a' }) });
    state = windowManagerReducer(state, { type: 'minimize', id: 'a' });
    expect(state.windows[0].state).toBe('minimized');
    expect(activeWindowId(state)).toBeNull();
    state = windowManagerReducer(state, { type: 'toggle', id: 'a' });
    expect(state.windows[0].state).toBe('normal');
    expect(activeWindowId(state)).toBe('a');
  });

  it('minimises the active window when its taskbar button is clicked', () => {
    let state = createWindowManagerState(viewport);
    state = windowManagerReducer(state, { type: 'open', window: request({ id: 'a' }) });
    state = windowManagerReducer(state, { type: 'toggle', id: 'a' });
    expect(state.windows[0].state).toBe('minimized');
  });

  it('keeps the restore rectangle when maximising and un-maximising', () => {
    let state = createWindowManagerState(viewport);
    state = windowManagerReducer(state, { type: 'open', window: request({ id: 'a', rect: { x: 60, y: 40, width: 400, height: 300 } }) });
    state = windowManagerReducer(state, { type: 'maximize', id: 'a' });
    expect(state.windows[0].state).toBe('maximized');
    expect(state.windows[0].rect).toEqual({ x: 60, y: 40, width: 400, height: 300 });
    state = windowManagerReducer(state, { type: 'restore', id: 'a' });
    expect(state.windows[0].rect.x).toBe(60);
  });

  it('never lets a window be dragged completely out of the viewport', () => {
    let state = createWindowManagerState(viewport);
    state = windowManagerReducer(state, { type: 'open', window: request({ id: 'a' }) });
    state = windowManagerReducer(state, {
      type: 'move',
      id: 'a',
      rect: { x: -900, y: -400, width: 400, height: 300 },
    });
    const rect = state.windows[0].rect;
    expect(rect.x).toBeGreaterThanOrEqual(-400 + 56);
    expect(rect.y).toBeGreaterThanOrEqual(0);
  });

  it('keeps windows reachable after a resolution change', () => {
    let state = createWindowManagerState(viewport);
    state = windowManagerReducer(state, {
      type: 'open',
      window: request({ id: 'a', rect: { x: 700, y: 600, width: 300, height: 200 } }),
    });
    state = windowManagerReducer(state, { type: 'setViewport', viewport: { width: 800, height: 560 } });
    const rect = state.windows[0].rect;
    expect(rect.x).toBeLessThanOrEqual(800 - 56);
    expect(rect.y).toBeLessThanOrEqual(560 - 22);
  });

  it('does not resize windows below their minimum size', () => {
    let state = createWindowManagerState(viewport);
    state = windowManagerReducer(state, { type: 'open', window: request({ id: 'a' }) });
    state = windowManagerReducer(state, {
      type: 'resize',
      id: 'a',
      rect: { x: 10, y: 10, width: 40, height: 20 },
    });
    expect(state.windows[0].rect.width).toBe(200);
    expect(state.windows[0].rect.height).toBe(120);
  });

  it('resets the layout without closing anything', () => {
    let state = createWindowManagerState(viewport);
    state = windowManagerReducer(state, { type: 'open', window: request({ id: 'a' }) });
    state = windowManagerReducer(state, { type: 'open', window: request({ id: 'b' }) });
    state = windowManagerReducer(state, { type: 'maximize', id: 'a' });
    state = windowManagerReducer(state, { type: 'resetLayout' });
    expect(state.windows).toHaveLength(2);
    expect(state.windows.every((window) => window.state === 'normal')).toBe(true);
  });
});
