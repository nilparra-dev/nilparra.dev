// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';

/**
 * Smoke test of the whole shell in jsdom: it catches runtime errors the type
 * checker cannot see (missing providers, bad hooks, crash on first render) and
 * checks that the desktop, the taskbar, the Start menu and the Welcome window
 * are really there.
 */
const PREFERENCES = {
  locale: 'es',
  wallpaperId: 'blue-rings',
  soundsEnabled: false,
  volume: 60,
  openWelcomeOnStart: true,
  reduceMotion: false,
  highContrastLabels: false,
  autoArrangeIcons: true,
};

beforeEach(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  );
  window.localStorage.clear();
  window.localStorage.setItem(
    'nilparra-win95:preferences',
    JSON.stringify({ version: 1, data: PREFERENCES }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('shell', () => {
  it('renders the desktop, the taskbar and the welcome window', async () => {
    render(<App />);

    expect(await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 })).toBeTruthy();

    const taskbar = screen.getByRole('toolbar', { name: 'Escritorio' });
    expect(within(taskbar).getByRole('button', { name: /Inicio/ })).toBeTruthy();

    const windows = await screen.findAllByRole('dialog');
    expect(windows).toHaveLength(1);
    expect(within(windows[0]).getByText('Bienvenida')).toBeTruthy();
    expect(within(windows[0]).getByText(/Estoy ahora mismo estudiando 2n de ASIX/)).toBeTruthy();
  });

  it('seeds the virtual disk with the system folders and the shortcuts', async () => {
    render(<App />);
    const desktop = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    await waitFor(() => {
      expect(within(desktop).getAllByRole('option').length).toBeGreaterThanOrEqual(6);
    });
    expect(within(desktop).getByText('Mi PC')).toBeTruthy();
    expect(within(desktop).getByText('Papelera de reciclaje')).toBeTruthy();
    expect(within(desktop).getByText('Mis proyectos.lnk')).toBeTruthy();
  });

  it('opens the Start menu with Ctrl+Esc', async () => {
    render(<App />);
    await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true }));
    expect(await screen.findByRole('menu', { name: 'Inicio' })).toBeTruthy();
  });

  it('applies the stored language to the document', async () => {
    render(<App />);
    await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    expect(document.documentElement.lang).toBe('es');
  });

  it('lists the desktop icons and keeps their positions stable', async () => {
    render(<App />);
    const desktop = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    const icons = within(desktop).getAllByRole('option');
    expect(icons.length).toBeGreaterThanOrEqual(2);
    const tops = icons.map((icon) => (icon as HTMLElement).style.top);
    expect(new Set(tops).size).toBe(icons.length);
  });
});
