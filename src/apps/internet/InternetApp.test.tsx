// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { APP_COMPONENTS } from '../../core/apps/components';
import { DialogProvider } from '../../core/dialogs/DialogProvider';
import { VfsProvider } from '../../core/fs/VfsProvider';
import { I18nProvider } from '../../core/i18n/I18nProvider';
import { PreferencesProvider } from '../../core/prefs/PreferencesProvider';
import { WindowManagerProvider } from '../../core/window/WindowManagerProvider';
import { InternetApp } from './InternetApp';

function Providers({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <I18nProvider locale="es">
        <WindowManagerProvider appIds={Object.keys(APP_COMPONENTS)} iconIds={[]}>
          <VfsProvider>
            <DialogProvider>{children}</DialogProvider>
          </VfsProvider>
        </WindowManagerProvider>
      </I18nProvider>
    </PreferencesProvider>
  );
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as unknown as Response;
}

function renderApp(params: Record<string, unknown> = {}) {
  return render(
    <Providers>
      <InternetApp windowId="win-internet-test" params={params} />
    </Providers>,
  );
}

/** Types a value in the address bar and submits it, as pressing Enter does. */
function searchFor(value: string) {
  const address = screen.getByLabelText('Dirección');
  fireEvent.change(address, { target: { value } });
  const form = address.closest('form');
  expect(form).toBeTruthy();
  fireEvent.submit(form!);
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

describe('InternetApp', () => {
  it('opens on the internal home page with its search box', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Sobre este escritorio' })).toBeTruthy();
    expect(screen.getByLabelText('Buscar en Internet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mis enlaces' })).toBeTruthy();
    // Internal pages keep the address bar empty, ready for a search.
    const address = screen.getByLabelText('Dirección');
    expect((address as HTMLInputElement).value).toBe('');
    expect(address.getAttribute('placeholder')).toBe('Buscar en Internet');
  });

  it('renders live results and points every one of them to a real browser tab', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          results: [
            { url: 'https://example.com/one', title: 'Result one', content: 'First snippet' },
            { url: 'https://example.com/two', title: 'Result two', content: 'Second snippet' },
          ],
        }),
      ),
    );

    renderApp();
    searchFor('windows 95');

    expect(await screen.findByRole('heading', { name: 'Resultados de «windows 95»' })).toBeTruthy();
    const link = await screen.findByRole('link', { name: 'Result one' });
    expect(link.getAttribute('href')).toBe('https://example.com/one');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByText('Second snippet')).toBeTruthy();
    // The footer is honest about where the results come from.
    expect(screen.getByText(/Resultados reales obtenidos con el buscador Tavily/)).toBeTruthy();
  });

  it('walks the internal pages without calling the search service', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderApp();
    searchFor('local://links');
    expect(screen.getByRole('heading', { name: 'Mis enlaces' })).toBeTruthy();
    expect((screen.getByLabelText('Dirección') as HTMLInputElement).value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(screen.getByRole('heading', { name: 'Sobre este escritorio' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Mis enlaces' })).toBeTruthy();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('warns when the free budget is spent and offers a retry plus a Google fallback', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ url: 'https://example.com/ok', title: 'At last', content: 'Now it works' }] }),
      );
    vi.stubGlobal('fetch', fetchMock);

    renderApp();
    searchFor('otra prueba');

    expect(await screen.findByText(/no admite más consultas/, { selector: 'p' })).toBeTruthy();
    const fallback = screen.getByRole('link', { name: 'Buscar en Google' });
    expect(fallback.getAttribute('href')).toContain('https://www.google.com/search?q=');

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('link', { name: 'At last' })).toBeTruthy();
  });

  it('shows a site that allows framing inside the window', () => {
    renderApp({ url: 'https://es.wikipedia.org/wiki/Windows_95' });
    const frame = screen.getByTitle('Página de es.wikipedia.org');
    expect(frame.getAttribute('src')).toBe('https://es.wikipedia.org/wiki/Windows_95');
    /* docs/security.md promises the framed site cannot open windows or escape. */
    const sandbox = frame.getAttribute('sandbox')?.split(/\s+/) ?? [];
    expect(sandbox).not.toContain('allow-popups');
    expect(sandbox).not.toContain('allow-top-navigation');
    const address = screen.getByLabelText('Dirección') as HTMLInputElement;
    expect(address.value).toBe('https://es.wikipedia.org/wiki/Windows_95');
  });

  it('offers a real browser tab when the site refuses to be framed', async () => {
    const openMock = vi.fn();
    vi.stubGlobal('open', openMock);
    renderApp({ url: 'https://github.com/nilparra-dev' });

    expect(screen.getByText(/no permite que su página se muestre dentro de otra web/)).toBeTruthy();
    expect(screen.queryByTitle(/^Página de /)).toBeNull();
    // The address stays visible in the notice and in the status bar.
    expect(screen.getAllByText('https://github.com/nilparra-dev').length).toBeGreaterThan(0);

    // The notice and the toolbar both offer the external tab.
    const buttons = screen.getAllByRole('button', { name: 'Abrir en una pestaña nueva' });
    expect(buttons.length).toBe(2);
    fireEvent.click(buttons[1]);
    // Leaving the desktop is confirmed first, naming the site.
    expect(openMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/Vas a salir de esta página para visitar github\.com/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    await waitFor(() => expect(openMock).toHaveBeenCalledWith(
      'https://github.com/nilparra-dev',
      '_blank',
      'noopener,noreferrer',
    ));
  });

  it('stays on the page when leaving is cancelled', async () => {
    const openMock = vi.fn();
    vi.stubGlobal('open', openMock);
    renderApp({ url: 'https://github.com/nilparra-dev' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Abrir en una pestaña nueva' })[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByText(/Vas a salir de esta página/)).toBeNull());

    // Escape backs out too: it must never count as Accept.
    fireEvent.click(screen.getAllByRole('button', { name: 'Abrir en una pestaña nueva' })[0]);
    const notice = await screen.findByText(/Vas a salir de esta página/);
    fireEvent.keyDown(notice, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText(/Vas a salir de esta página/)).toBeNull());
    expect(openMock).not.toHaveBeenCalled();
  });

  it('opens an address typed in the bar as a site instead of searching it', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderApp();
    searchFor('es.wikipedia.org/wiki/Windows_95');

    expect(screen.getByTitle('Página de es.wikipedia.org')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
