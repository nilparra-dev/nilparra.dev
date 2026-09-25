// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { APP_COMPONENTS, preloadApps } from '../core/apps/components';
import { DialogProvider } from '../core/dialogs/DialogProvider';
import { VfsProvider } from '../core/fs/VfsProvider';
import { I18nProvider } from '../core/i18n/I18nProvider';
import { PreferencesProvider } from '../core/prefs/PreferencesProvider';
import { WindowManagerProvider, useWindowManager } from '../core/window/WindowManagerProvider';
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

/** The projects window next to a dump of the open windows, to see what it launches. */
function ProjectsWithWindows() {
  const Projects = APP_COMPONENTS.projects;
  const { windows } = useWindowManager();
  if (!Projects) return null;
  return (
    <>
      <Projects windowId="win-test-projects" params={{}} />
      <output data-testid="windows">
        {JSON.stringify(windows.map((window) => ({ appId: window.appId, params: window.params })))}
      </output>
    </>
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

/* Split applications resolve at once after this, so every test renders synchronously. */
beforeAll(() => preloadApps());

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
    expect(screen.getByRole('button', { name: 'Sobre mí' })).toBeTruthy();
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

  it('hides and shows the explorer folder tree on demand', async () => {
    const { container } = renderApp('explorer');
    await waitFor(() => expect(container.querySelector('.explorer-item')).toBeTruthy(), { timeout: 4000 });
    // My Computer never shows the tree; browsing into a folder does.
    expect(container.querySelector('.explorer-tree')).toBeNull();
    fireEvent.doubleClick(screen.getByRole('option', { name: 'Documentos' }));
    await waitFor(() => expect(container.querySelector('.explorer-tree')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Panel de carpetas' }));
    await waitFor(() => expect(container.querySelector('.explorer-tree')).toBeNull());
    expect(container.querySelector('.explorer-splitter')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Panel de carpetas' }));
    await waitFor(() => expect(container.querySelector('.explorer-tree')).toBeTruthy());
  });

  it('renders the notepad with an empty buffer', async () => {
    const { container } = renderApp('notepad');
    await waitFor(() => expect(container.querySelector('textarea')).toBeTruthy());
  });

  it('renders the recycle bin', async () => {
    renderApp('recyclebin');
    expect(await screen.findByRole('listbox', { name: 'Papelera de reciclaje' })).toBeTruthy();
  });

  it('renders the projects window with the detail pane of the selected project', async () => {
    const { container } = renderApp('projects');
    expect(await screen.findByRole('heading', { name: 'Mis proyectos' })).toBeTruthy();

    // The projects are tabs across the top; the first one is selected.
    expect(screen.getByRole('tab', { name: 'Wooster' }).getAttribute('aria-selected')).toBe('true');

    // The published project leads with its mark and its main action.
    expect(screen.getByRole('heading', { name: 'Wooster' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir en GitHub' }).getAttribute('href')).toBe(
      'https://github.com/nilparra-dev/wooster',
    );
    expect(container.querySelectorAll('.project-tech-item img')).toHaveLength(8);
    expect(screen.getByText('Descarga reanudable en un único archivo, con tres motores de descarga')).toBeTruthy();

    // The long description stays hidden until the visitor asks for it.
    expect(screen.queryByText(/Wooster es una herramienta/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles técnicos' }));
    expect(screen.getByText(/Wooster es una herramienta/)).toBeTruthy();

    // Selecting the closed-source project moves the pane to it, states that
    // the code is private and offers the demo through the contact window.
    fireEvent.click(screen.getByRole('tab', { name: 'Antevue' }));
    expect(await screen.findByRole('heading', { name: /Antevue/ })).toBeTruthy();
    expect(screen.getByText('Código privado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pedir una demostración' })).toBeTruthy();
    expect(screen.queryByText('Pendiente')).toBeNull();
    expect(screen.queryAllByRole('link', { name: 'Abrir en GitHub' })).toHaveLength(0);
  });

  it('pages through the project screenshots and opens the selected one in the viewer', async () => {
    render(
      <Providers>
        <ProjectsWithWindows />
      </Providers>,
    );
    await screen.findByRole('heading', { name: 'Wooster' });

    // The first capture leads, with its caption and position under it.
    expect(screen.getByRole('button', { name: /^Ampliar captura: Reproductor local/ })).toBeTruthy();
    expect(screen.getByText('Captura 1 de 5')).toBeTruthy();
    const thumbs = screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'));
    expect(thumbs).toHaveLength(5);
    expect(thumbs[0]?.getAttribute('aria-pressed')).toBe('true');

    // A thumbnail moves the large view; the arrow keys walk the strip.
    fireEvent.click(screen.getByRole('button', { name: /^Terminal con la lista de emisiones/ }));
    expect(screen.getByText('Captura 2 de 5')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Ampliar captura: Terminal con la lista/ })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('button', { name: /^Terminal con la lista de emisiones/ }), { key: 'ArrowRight' });
    expect(screen.getByText('Captura 3 de 5')).toBeTruthy();
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Terminal resolviendo/);
    fireEvent.keyDown(document.activeElement as Element, { key: 'End' });
    expect(screen.getByText('Captura 5 de 5')).toBeTruthy();

    // The large view opens the full-resolution file in the image viewer.
    fireEvent.click(screen.getByRole('button', { name: /^Ampliar captura:/ }));
    const windows = JSON.parse(screen.getByTestId('windows').textContent ?? '[]') as Array<{
      appId: string;
      params: Record<string, unknown>;
    }>;
    expect(windows).toContainEqual({ appId: 'viewer', params: { src: 'portfolio/wooster-chat@2x.png' } });
  });

  it('renders the about window with education grouped by school and the CV in its language', async () => {
    renderApp('about');
    expect(await screen.findByRole('heading', { name: 'Nil Parra Luna' })).toBeTruthy();
    expect(screen.getByText('Estudiante de Administración de Sistemas Informáticos en Red (ASIX)')).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Institut Sa Palomera, Blanes' })).toHaveLength(1);
    expect(screen.getByText('En curso')).toBeTruthy();
    expect(screen.getByText('Experiencia')).toBeTruthy();
    expect(screen.getByText(/iDiomund, SL/)).toBeTruthy();
    expect(screen.getByText('Conocimientos')).toBeTruthy();
    expect(screen.getByText('Odoo')).toBeTruthy();
    expect(screen.getByText('Currículum')).toBeTruthy();

    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar el CV en PDF' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith(
      new URL('cv/nil-parra-cv-es.pdf', window.location.href).href,
      '_blank',
      'noopener,noreferrer',
    ));
    open.mockRestore();
  });

  it('renders the browser, the mail window and the control panel', async () => {
    const internet = renderApp('internet');
    expect(await screen.findByRole('heading', { name: 'Sobre este escritorio' })).toBeTruthy();
    internet.unmount();

    const mail = renderApp('mail');
    expect(await screen.findByDisplayValue('nil@nilparra.dev')).toBeTruthy();
    // Opening the external program gives feedback inside the window: a machine
    // without a mail app would otherwise look like a broken button.
    fireEvent.click(screen.getByRole('link', { name: 'Abrir mi cliente de correo' }));
    expect(screen.getAllByText(/Si no se abre, copia la dirección/).length).toBeGreaterThan(0);
    mail.unmount();

    renderApp('controlpanel');
    expect(await screen.findByRole('tab', { name: 'Apariencia' })).toBeTruthy();
  });

  it('renders the system information window', async () => {
    renderApp('sysinfo');
    expect(await screen.findByRole('tab', { name: 'General' })).toBeTruthy();
    expect(screen.getAllByText(/Windows 95/).length).toBeGreaterThan(0);
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

  it('shows a site image in the viewer from its public path', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) }));
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:shot');
    URL.revokeObjectURL = vi.fn();
    renderApp('viewer', { src: 'portfolio/wooster-list@2x.png' });
    const image = await screen.findByRole('img', { name: 'wooster-list@2x.png' });
    expect(image.getAttribute('src')).toBe('blob:shot');
    expect(fetchMock).toHaveBeenCalledWith('/portfolio/wooster-list@2x.png');
  });

  it('refuses a viewer source outside the site', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderApp('viewer', { src: 'https://example.com/a.png' });
    expect((await screen.findAllByText(/No hay ningún archivo cargado/)).length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('renders a solitaire table and deals from the deck', async () => {
    const { container } = renderApp('solitaire');
    await waitFor(() =>
      expect(container.querySelectorAll('.card').length).toBeGreaterThanOrEqual(28),
    );
    // Seven columns plus the four foundations.
    expect(container.querySelectorAll('[data-sol-pile]')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: /Mazo/ }));
    await waitFor(() => expect(container.querySelectorAll('.sol-waste .card')).toHaveLength(1));
  });

  it('renders the poker lobby and starts a match', async () => {
    const { container } = renderApp('poker');
    fireEvent.click(await screen.findByRole('button', { name: 'Empezar a jugar' }));
    await waitFor(() => expect(container.querySelectorAll('.poker-seat').length).toBe(4));
    expect(container.querySelectorAll('.poker-card').length).toBeGreaterThanOrEqual(8);
    expect(container.querySelector('.poker-actions')).toBeTruthy();
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
