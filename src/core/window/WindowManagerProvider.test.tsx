// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWindowManager, WindowManagerProvider } from './WindowManagerProvider';

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
});
