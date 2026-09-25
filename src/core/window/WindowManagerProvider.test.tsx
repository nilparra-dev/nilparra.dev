// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWindowManager, WindowManagerProvider, type WindowManagerValue } from './WindowManagerProvider';

const originalWidth = window.innerWidth;

beforeEach(() => {
  /* Fine pointer: only the width can make the desktop compact. */
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
});

describe('window manager provider', () => {
  it('starts compact on a narrow screen from the very first render', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
    const seen: boolean[] = [];
    function Probe() {
      seen.push(useWindowManager().compact);
      return null;
    }
    render(
      <WindowManagerProvider appIds={[]} iconIds={[]}>
        <Probe />
      </WindowManagerProvider>,
    );
    expect(seen[0]).toBe(true);
  });

  it('keeps close guards when every window is minimized', async () => {
    let wm: WindowManagerValue | null = null;
    function Probe() {
      wm = useWindowManager();
      return null;
    }
    render(
      <WindowManagerProvider appIds={['notepad']} iconIds={['notepad']}>
        <Probe />
      </WindowManagerProvider>,
    );
    const manager = (): WindowManagerValue => {
      if (!wm) throw new Error('Window manager not rendered');
      return wm;
    };

    act(() =>
      manager().openWindow({
        id: 'draft',
        appId: 'notepad',
        title: 'Borrador',
        icon: 'notepad',
        resizable: true,
        minimizable: true,
        maximizable: true,
        minWidth: 200,
        minHeight: 120,
        params: {},
        docKey: null,
        helpTopicId: null,
      }),
    );
    act(() => {
      manager().registerCloseGuard('draft', () => false);
    });
    act(() => manager().minimizeAll());
    await act(async () => {
      await manager().close('draft');
    });

    expect(manager().windows.map((window) => window.id)).toEqual(['draft']);
  });
});
