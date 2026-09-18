// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../../core/i18n/I18nProvider';
import { PreferencesProvider } from '../../core/prefs/PreferencesProvider';
import { useVfs, VfsProvider, type VfsValue } from '../../core/fs/VfsProvider';
import type { FileDialogResult } from '../../core/dialogs/types';
import { FileDialog } from './FileDialog';

const vfsRef: { current: VfsValue | null } = { current: null };

function Harness({ onResult }: { onResult: (result: FileDialogResult | null) => void }) {
  const vfs = useVfs();
  vfsRef.current = vfs;
  const documents = vfs.folders.documents;
  if (!vfs.ready || !documents) return null;
  return (
    <FileDialog
      options={{ mode: 'open', startFolderId: documents }}
      onResult={onResult}
    />
  );
}

function currentVfs(): VfsValue {
  if (!vfsRef.current) throw new Error('VFS has not mounted');
  return vfsRef.current;
}

beforeEach(() => {
  vfsRef.current = null;
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('FileDialog', () => {
  it('uses the typed name and resolves a path instead of the previous selection', async () => {
    const onResult = vi.fn<(result: FileDialogResult | null) => void>();
    render(
      <PreferencesProvider>
        <I18nProvider locale="es">
          <VfsProvider>
            <Harness onResult={onResult} />
          </VfsProvider>
        </I18nProvider>
      </PreferencesProvider>,
    );

    await waitFor(() => expect(currentVfs().ready).toBe(true), { timeout: 4000 });
    const documents = currentVfs().folders.documents;
    if (!documents) throw new Error('Documents folder was not seeded');
    const target = await currentVfs().createTextFile(documents, 'typed-target.txt', 'target');
    if (!target) throw new Error('Could not create target file');

    await waitFor(() => expect(screen.getByText('typed-target.txt')).toBeTruthy());
    fireEvent.click(screen.getByRole('option', { name: 'Bienvenida.txt' }));

    const name = screen.getByLabelText('Nombre:');
    fireEvent.change(name, { target: { value: 'C:/Documents/typed-target.txt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(onResult).toHaveBeenCalledWith({
      folderId: documents,
      name: target.name,
      node: target,
    });

    fireEvent.change(name, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(screen.getByText('(ninguno)')).toBeTruthy();
  });
});
