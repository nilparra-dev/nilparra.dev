// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { emitDesktopEvent } from './core/desktop/events';

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

/** jsdom has no pointer capture; the desktop icons rely on it to track a drag. */
function stubPointerCapture(): void {
  for (const name of ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture'] as const) {
    Object.defineProperty(Element.prototype, name, {
      configurable: true,
      value: name === 'hasPointerCapture' ? () => false : () => {},
    });
  }
}

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
    expect(within(windows[0]).getByText('Estudiante de Administración de Sistemas Informáticos en Red (ASIX)')).toBeTruthy();
  });

  it('seeds the virtual disk with the system folders and the shortcuts', async () => {
    render(<App />);
    const desktop = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    await waitFor(() => {
      expect(within(desktop).getAllByRole('option').length).toBeGreaterThanOrEqual(6);
    });
    expect(within(desktop).getByText('Mi PC')).toBeTruthy();
    expect(within(desktop).getByText('Papelera de reciclaje')).toBeTruthy();
    expect(within(desktop).getByText('Mis proyectos')).toBeTruthy();
    expect(within(desktop).queryByText('Mis proyectos.lnk')).toBeNull();
  });

  it('translates the seeded desktop shortcuts when the language changes', async () => {
    render(<App />);
    const desktopEs = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    expect(within(desktopEs).getByText('Sobre mí')).toBeTruthy();
    expect(within(desktopEs).getByText('Currículum')).toBeTruthy();

    // The disk stays seeded in Spanish: only the interface language changes.
    cleanup();
    window.localStorage.setItem(
      'nilparra-win95:preferences',
      JSON.stringify({ version: 1, data: { ...PREFERENCES, locale: 'en' } }),
    );
    render(<App />);
    const desktopEn = await screen.findByRole('listbox', { name: 'Desktop' }, { timeout: 4000 });
    expect(within(desktopEn).getByText('About me')).toBeTruthy();
    expect(within(desktopEn).getByText('Résumé (CV)')).toBeTruthy();
    expect(within(desktopEn).getByText('My projects')).toBeTruthy();
    expect(within(desktopEn).queryByText('Sobre mí')).toBeNull();
  });

  it('retitles the Welcome window and its taskbar button when the language changes', async () => {
    render(<App />);
    const welcome = await screen.findByRole('dialog', { name: 'Bienvenida' }, { timeout: 4000 });
    const taskbar = screen.getByRole('toolbar', { name: 'Escritorio' });
    expect(within(taskbar).getByRole('button', { name: /Bienvenida/ })).toBeTruthy();

    fireEvent.click(within(welcome).getByRole('button', { name: 'Idioma del escritorio' }));
    fireEvent.click(await screen.findByRole('option', { name: 'English' }));

    expect(await screen.findByRole('dialog', { name: 'Welcome' })).toBeTruthy();
    expect(within(screen.getByRole('toolbar', { name: 'Desktop' })).getByRole('button', { name: /Welcome/ })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Bienvenida' })).toBeNull();
  });

  describe('pixel assistant', () => {
    const face = () => screen.getByRole('button', { name: /Asistente en píxeles/ });
    /** What the assistant is saying, as announced to assistive technology. */
    const says = (text: string) => screen.queryByText(text, { selector: '[role="status"]' });

    beforeEach(() => {
      window.sessionStorage.setItem('mascot-greeted', '1');
    });

    it('offers a shortcut when clicked and goes quiet once it is followed', async () => {
      render(<App />);
      await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });

      fireEvent.click(face());
      expect(says('¿Quieres ver en qué he trabajado?')).toBeTruthy();

      fireEvent.click(screen.getAllByRole('button', { name: 'Ver mis proyectos' }).at(-1)!);
      expect(await screen.findByRole('dialog', { name: 'Mis proyectos' })).toBeTruthy();
      expect(says('¿Quieres ver en qué he trabajado?')).toBeNull();
      expect(face().getAttribute('data-state')).toBe('idle');
    });

    it('skips the tip of an application that is already open', async () => {
      render(<App />);
      const desktop = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
      fireEvent.doubleClick(within(desktop).getByRole('option', { name: 'Sobre mí' }));
      await screen.findByRole('dialog', { name: 'Sobre mí' });

      fireEvent.click(face());
      expect(says('¿Quieres ver en qué he trabajado?')).toBeTruthy();
      fireEvent.click(face());
      expect(says('Si prefieres saber quién soy, empieza por aquí.')).toBeNull();
      expect(says('Mi CV está listo para descargar.')).toBeTruthy();
    });

    it('dismisses a tip with a press elsewhere on the desktop', async () => {
      stubPointerCapture();
      render(<App />);
      const desktop = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
      fireEvent.click(face());
      expect(says('¿Quieres ver en qué he trabajado?')).toBeTruthy();

      fireEvent.pointerDown(desktop);
      expect(says('¿Quieres ver en qué he trabajado?')).toBeNull();
    });

    it('loses its temper when poked and gives no tips until it is left alone', async () => {
      const start = Date.now();
      const now = vi.spyOn(Date, 'now').mockReturnValue(start);
      try {
        render(<App />);
        await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
        for (let click = 0; click < 5; click += 1) fireEvent.click(face());
        expect(says('¡Eh, eh! Con un clic me basta.')).toBeTruthy();
        expect(face().getAttribute('data-state')).toBe('annoyed');

        // More clicks only keep it angry, and each one restarts the sulk.
        now.mockReturnValue(start + 2000);
        fireEvent.click(face());
        now.mockReturnValue(start + 4000);
        fireEvent.click(face());
        expect(says('¡Eh, eh! Con un clic me basta.')).toBeTruthy();
        expect(face().getAttribute('data-state')).toBe('annoyed');

        now.mockReturnValue(start + 7000);
        fireEvent.click(face());
        expect(says('¡Eh, eh! Con un clic me basta.')).toBeNull();
        expect(face().getAttribute('data-state')).toBe('happy');
      } finally {
        now.mockRestore();
      }
    });

    it('stands on the desktop while no window fills the screen', async () => {
      render(<App />);
      await screen.findByRole('dialog', { name: 'Bienvenida' }, { timeout: 4000 });
      const taskbar = screen.getByRole('toolbar', { name: 'Escritorio' });
      expect(taskbar.contains(face())).toBe(false);
    });

    it('moves into the taskbar tray on a narrow screen and still talks from there', async () => {
      const width = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
      try {
        render(<App />);
        await screen.findByRole('dialog', { name: 'Bienvenida' }, { timeout: 4000 });
        const taskbar = screen.getByRole('toolbar', { name: 'Escritorio' });
        expect(taskbar.contains(face())).toBe(true);

        fireEvent.click(face());
        expect(says('¿Quieres ver en qué he trabajado?')).toBeTruthy();
      } finally {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      }
    });

    it('reacts to the outcome of a game', async () => {
      render(<App />);
      await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });

      act(() => emitDesktopEvent({ type: 'game-lost', game: 'minesweeper' }));
      expect(says('¡Bum! Esa mina no la vi venir.')).toBeTruthy();
      expect(face().getAttribute('data-state')).toBe('ouch');

      act(() => emitDesktopEvent({ type: 'game-won', game: 'minesweeper' }));
      expect(says('¡Bien jugado!')).toBeTruthy();
      expect(face().getAttribute('data-state')).toBe('joy');
    });

    it('falls asleep after a minute without input and wakes on touch', async () => {
      /* The idle check is a 5 second interval: grab it instead of waiting a real minute. */
      const idleChecks: Array<() => void> = [];
      const realSetInterval = window.setInterval.bind(window);
      vi.spyOn(window, 'setInterval').mockImplementation(((handler: () => void, delay?: number) => {
        if (delay === 5000) idleChecks.push(handler);
        return realSetInterval(handler, delay);
      }) as typeof window.setInterval);

      render(<App />);
      await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
      expect(face().getAttribute('data-state')).toBe('idle');

      const start = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(start + 66_000);
      act(() => idleChecks.forEach((check) => check()));
      expect(face().getAttribute('data-state')).toBe('asleep');

      act(() => {
        fireEvent.pointerDown(window);
      });
      expect(face().getAttribute('data-state')).not.toBe('asleep');
      expect(says('Perdona, me había dormido.')).toBeTruthy();
      vi.restoreAllMocks();
    });
  });

  it('keeps the pixel assistant away when the preference is off', async () => {
    window.localStorage.setItem(
      'nilparra-win95:preferences',
      JSON.stringify({ version: 1, data: { ...PREFERENCES, showMascot: false } }),
    );
    render(<App />);
    await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    expect(screen.queryByRole('button', { name: /Asistente en píxeles/ })).toBeNull();
  });

  it('opens the GitHub shortcut inside the Internet window', async () => {
    render(<App />);
    const desktop = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    fireEvent.doubleClick(within(desktop).getByRole('option', { name: 'GitHub' }));

    expect(await screen.findByText(/no permite que su página se muestre dentro de otra web/)).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'GitHub' })).toBeTruthy();
  });

  it('opens a desktop icon with a single tap on a touch screen', async () => {
    stubPointerCapture();
    render(<App />);
    const desktop = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    const about = within(desktop).getByRole('option', { name: 'Sobre mí' });

    fireEvent.pointerDown(about, { pointerType: 'touch', pointerId: 1, button: 0 });
    fireEvent.pointerUp(about, { pointerType: 'touch', pointerId: 1, button: 0 });

    expect(await screen.findByRole('dialog', { name: 'Sobre mí' })).toBeTruthy();
  });

  it('leaves a single mouse click as a selection', async () => {
    stubPointerCapture();
    render(<App />);
    const desktop = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    const about = within(desktop).getByRole('option', { name: 'Sobre mí' });

    fireEvent.pointerDown(about, { pointerType: 'mouse', pointerId: 1, button: 0 });
    fireEvent.pointerUp(about, { pointerType: 'mouse', pointerId: 1, button: 0 });

    await screen.findAllByRole('dialog');
    expect(screen.queryByRole('dialog', { name: 'Sobre mí' })).toBeNull();
  });

  it('returns to the desktop from the taskbar on a narrow screen', async () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
    try {
      render(<App />);
      await screen.findByRole('dialog', { name: 'Bienvenida' }, { timeout: 4000 });
      const taskbar = screen.getByRole('toolbar', { name: 'Escritorio' });

      fireEvent.click(within(taskbar).getByRole('button', { name: 'Escritorio' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    }
  });

  it('keeps the desktop button out of the taskbar on a wide screen', async () => {
    render(<App />);
    await screen.findByRole('dialog', { name: 'Bienvenida' }, { timeout: 4000 });
    const taskbar = screen.getByRole('toolbar', { name: 'Escritorio' });
    expect(within(taskbar).queryByRole('button', { name: 'Escritorio' })).toBeNull();
  });

  it('opens the Start menu with Ctrl+Esc', async () => {
    render(<App />);
    await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true }));
    expect(await screen.findByRole('menu', { name: 'Inicio' })).toBeTruthy();
  });

  it.each([
    ['Accesorios', 'Calculadora'],
    ['Juegos', 'Buscaminas'],
    ['Internet', 'Correo'],
  ])('launches an application through Programas > %s', async (group, application) => {
    render(<App />);
    await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: 'Inicio' }));
    const programs = screen.getByRole('menuitem', { name: 'Programas' });
    fireEvent.mouseEnter(programs);
    // Clicking a group already opened by hover must not close it.
    fireEvent.click(programs);
    const child = within(screen.getByRole('menu', { name: 'Programas' })).getByRole('menuitem', { name: group });
    fireEvent.mouseEnter(child);
    fireEvent.click(child);
    const menu = screen.getByRole('menu', { name: group });
    fireEvent.click(within(menu).getByRole('menuitem', { name: application }));
    expect(screen.queryByRole('menu', { name: 'Inicio' })).toBeNull();
    expect(await screen.findByRole('dialog', { name: new RegExp(`^${application}(?: - .+)?$`) })).toBeTruthy();
  });

  it('navigates nested Start groups with the keyboard without launching an application early', async () => {
    render(<App />);
    await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    const start = screen.getByRole('button', { name: 'Inicio' });
    fireEvent.click(start);
    const programs = screen.getByRole('menuitem', { name: 'Programas' });
    fireEvent.focus(programs);
    fireEvent.keyDown(programs, { key: 'Enter' });
    const programMenu = screen.getByRole('menu', { name: 'Programas' });
    expect(programMenu.contains(document.activeElement)).toBe(true);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    const accessories = within(programMenu).getByRole('menuitem', { name: 'Accesorios' });
    fireEvent.focus(accessories);
    fireEvent.keyDown(accessories, { key: 'ArrowRight' });
    const accessoryMenu = screen.getByRole('menu', { name: 'Accesorios' });
    expect(accessoryMenu.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement ?? accessoryMenu, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Calculadora');
    fireEvent.keyDown(document.activeElement ?? accessoryMenu, { key: 'ArrowLeft' });
    expect(screen.queryByRole('menu', { name: 'Accesorios' })).toBeNull();
    expect(document.activeElement).toBe(accessories);
    fireEvent.keyDown(accessories, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Programas' })).toBeNull();
    expect(document.activeElement).toBe(programs);
    fireEvent.keyDown(programs, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Inicio' })).toBeNull();
    expect(document.activeElement).toBe(start);
  });

  it('closes the previous branch when hovering a sibling and dismisses on outside click', async () => {
    render(<App />);
    await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: 'Inicio' }));
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Programas' }));
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Accesorios' }));
    expect(screen.getByRole('menu', { name: 'Accesorios' })).toBeTruthy();
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Juegos' }));
    expect(screen.queryByRole('menu', { name: 'Accesorios' })).toBeNull();
    expect(screen.getByRole('menu', { name: 'Juegos' })).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu', { name: 'Inicio' })).toBeNull();
  });

  it('applies the stored language to the document', async () => {
    render(<App />);
    await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    expect(document.documentElement.lang).toBe('es');
  });

  it('opens and highlights a desktop submenu after separators and dismisses outside it', async () => {
    render(<App />);
    const desktop = await screen.findByRole('listbox', { name: 'Escritorio' }, { timeout: 4000 });
    fireEvent.contextMenu(desktop, { clientX: 500, clientY: 250 });
    const newItem = screen.getByRole('menuitem', { name: 'Nuevo' });
    fireEvent.mouseEnter(newItem);
    expect(newItem.getAttribute('data-highlighted')).toBe('true');
    expect(screen.getByRole('menuitem', { name: 'Carpeta' })).toBeTruthy();
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Propiedades' }));
    expect(screen.queryByRole('menuitem', { name: 'Carpeta' })).toBeNull();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
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
