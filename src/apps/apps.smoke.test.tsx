// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { APP_COMPONENTS } from '../core/apps/components';
import { DialogProvider } from '../core/dialogs/DialogProvider';
import { VfsProvider } from '../core/fs/VfsProvider';
import { I18nProvider } from '../core/i18n/I18nProvider';
import { PreferencesProvider } from '../core/prefs/PreferencesProvider';
import { WindowManagerProvider } from '../core/window/WindowManagerProvider';
import { MenuLayerProvider } from '../ui/menu/MenuLayer';

/**
 * Smoke test of every application: each one is mounted inside the real
 * providers, so a crash, a bad hook or a missing translation key is caught
 * here instead of in the browser.
 */
function Providers({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <I18nProvider locale="es">
        <WindowManagerProvider appIds={Object.keys(APP_COMPONENTS)} iconIds={[]}>
          <VfsProvider>
            <DialogProvider>
              <MenuLayerProvider>{children}</MenuLayerProvider>
            </DialogProvider>
          </VfsProvider>
        </WindowManagerProvider>
      </I18nProvider>
    </PreferencesProvider>
  );
}

function renderApp(appId: string, params: Record<string, unknown> = {}) {
  const Application = APP_COMPONENTS[appId];
  expect(Application, `missing component for ${appId}`).toBeTruthy();
  const utils = render(
    <Providers>
      <Application windowId={`win-test-${appId}`} params={params} />
    </Providers>,
  );
  return utils;
}

beforeEach(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
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
  cleanup();
  vi.unstubAllGlobals();
});

describe('applications', () => {
  it('renders the welcome window with its shortcuts', async () => {
    renderApp('welcome');
    expect(await screen.findByRole('button', { name: 'Ver mis proyectos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sobre mí y currículum' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Contacto' })).toBeTruthy();
  });

  it('renders the help window with its topics', async () => {
    renderApp('help');
    expect(await screen.findByRole('heading', { name: 'Qué es este escritorio' })).toBeTruthy();
  });

  it('renders the explorer over the seeded disk', async () => {
    const { container } = renderApp('explorer');
    await waitFor(
      () => expect(container.querySelector('.explorer-item, .explorer-empty')).toBeTruthy(),
      { timeout: 4000 },
    );
    expect(screen.getByRole('menubar')).toBeTruthy();
  });

  it('renders the notepad with an empty buffer', async () => {
    const { container } = renderApp('notepad');
    await waitFor(() => expect(container.querySelector('textarea')).toBeTruthy());
  });

  it('renders the recycle bin', async () => {
    renderApp('recyclebin');
    expect(await screen.findByRole('listbox', { name: 'Papelera de reciclaje' })).toBeTruthy();
  });

  it('renders the projects window with the placeholder badge', async () => {
    renderApp('projects');
    expect(await screen.findByRole('heading', { name: 'Mis proyectos' })).toBeTruthy();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
  });

  it('renders the about window with the real name and the CV note', async () => {
    renderApp('about');
    expect(await screen.findByRole('heading', { name: 'Nil Parra Luna' })).toBeTruthy();
    expect(screen.getAllByText(/estudiando 2n de ASIX/).length).toBeGreaterThan(0);
  });

  it('renders the browser, the mail window and the control panel', async () => {
    const internet = renderApp('internet');
    expect(await screen.findByRole('heading', { name: 'Sobre este escritorio' })).toBeTruthy();
    internet.unmount();

    const mail = renderApp('mail');
    expect(await screen.findByDisplayValue('nilparra@nilparra.dev')).toBeTruthy();
    mail.unmount();

    renderApp('controlpanel');
    expect(await screen.findByRole('tab', { name: 'Apariencia' })).toBeTruthy();
  });

  it('renders the system information window', async () => {
    renderApp('sysinfo');
    expect(await screen.findByRole('tab', { name: 'General' })).toBeTruthy();
    expect(screen.getAllByText(/Nil Parra 95/).length).toBeGreaterThan(0);
  });

  it('renders paint with a real canvas', async () => {
    const { container } = renderApp('paint');
    await waitFor(() => expect(container.querySelector('canvas')).toBeTruthy());
  });

  it('renders the media player without a file', async () => {
    renderApp('mediaplayer');
    expect((await screen.findAllByText(/No hay ningún archivo cargado/)).length).toBeGreaterThan(0);
  });

  it('renders find with its search fields', async () => {
    renderApp('find');
    expect((await screen.findAllByText(/Buscar: todos los archivos/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nombre:/).length).toBeGreaterThan(0);
  });

  it('renders the viewer without a file', async () => {
    renderApp('viewer');
    expect((await screen.findAllByText(/No hay ningún archivo cargado/)).length).toBeGreaterThan(0);
  });

  it('adds two numbers in the calculator', async () => {
    renderApp('calculator');
    await screen.findByRole('button', { name: 'Igual' });
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sumar' }));
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    fireEvent.click(screen.getByRole('button', { name: 'Igual' }));
    await waitFor(() => expect(screen.getAllByText('15').length).toBeGreaterThan(0));
  });

  it('renders a playable minesweeper board', async () => {
    const { container } = renderApp('minesweeper');
    await waitFor(() =>
      expect(container.querySelectorAll('button').length).toBeGreaterThan(40),
    );
  });

  it('accepts a command in the run dialog', async () => {
    const { container } = renderApp('run');
    expect(await screen.findByRole('button', { name: 'Aceptar' })).toBeTruthy();
    expect(container.querySelector('input')).toBeTruthy();
  });

  it('prints the command list in the console', async () => {
    const { container } = renderApp('console');
    const input = await waitFor(() => {
      const field = container.querySelector('input');
      expect(field).toBeTruthy();
      return field as HTMLInputElement;
    });
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((await screen.findAllByText(/Comandos disponibles/)).length).toBeGreaterThan(0);
  });
});
