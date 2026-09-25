// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { APP_COMPONENTS } from '../core/apps/components';
import { DialogProvider } from '../core/dialogs/DialogProvider';
import { VfsProvider } from '../core/fs/VfsProvider';
import { I18nProvider } from '../core/i18n/I18nProvider';
import { PreferencesProvider } from '../core/prefs/PreferencesProvider';
import { WindowManagerProvider } from '../core/window/WindowManagerProvider';
import { ExternalLink } from './ExternalLink';

function renderLink() {
  return render(
    <PreferencesProvider>
      <I18nProvider locale="es">
        <WindowManagerProvider appIds={Object.keys(APP_COMPONENTS)} iconIds={[]}>
          <VfsProvider>
            <DialogProvider>
              <ExternalLink href="https://github.com/nilparra-dev">GitHub</ExternalLink>
            </DialogProvider>
          </VfsProvider>
        </WindowManagerProvider>
      </I18nProvider>
    </PreferencesProvider>,
  );
}

let open: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  open = vi.fn();
  vi.stubGlobal('open', open);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ExternalLink', () => {
  it('asks before leaving, and Cancel keeps the visitor on the desktop', async () => {
    renderLink();
    fireEvent.click(screen.getByText('GitHub'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(open).not.toHaveBeenCalled();
  });

  it('stops asking once "Do not ask again" is ticked and accepted', async () => {
    renderLink();
    fireEvent.click(screen.getByText('GitHub'));
    fireEvent.click(await screen.findByLabelText('No volver a preguntar'));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('GitHub'));
    await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: 'Aceptar' })).toBeNull();
  });
});
