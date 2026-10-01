// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { File as NativeFile } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { PreferencesProvider } from '../prefs/PreferencesProvider';
import { useVfs, VfsProvider, type VfsValue } from './VfsProvider';
import { deleteDatabase } from './db';
import { loadNodes } from './vfs';

/**
 * End to end test of the virtual disk, following the walkthrough of the brief:
 * create a folder, save a document in it, rename and move it, send it to the
 * Recycle Bin, restore it and destroy it for good.
 *
 * Mutations are asynchronous (the write happens before the screen updates), so
 * every assertion waits for the new tree to reach React.
 */
const apiRef: { current: VfsValue | null } = { current: null };

function Harness() {
  apiRef.current = useVfs();
  return null;
}

function mount() {
  window.localStorage.clear();
  return render(
    <PreferencesProvider>
      <I18nProvider locale="es">
        <VfsProvider>
          <Harness />
        </VfsProvider>
      </I18nProvider>
    </PreferencesProvider>,
  );
}

const api = () => apiRef.current as VfsValue;

async function ready(): Promise<void> {
  await waitFor(() => expect(apiRef.current?.ready).toBe(true), { timeout: 4000 });
}

async function expectNode(id: string): Promise<void> {
  await waitFor(() => expect(api().nodeById(id)).toBeTruthy());
}

beforeEach(async () => {
  apiRef.current = null;
  await deleteDatabase();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('virtual disk', () => {
  it('refuses to save text into a read-only portfolio file', async () => {
    mount();
    await ready();
    const file = [...api().nodes.values()].find((node) => node.readonly && typeof node.content === 'string');
    if (!file) throw new Error('Missing read-only file');
    expect(await api().saveText(file.id, 'Overwritten')).toBe(false);
    expect((await loadNodes()).find((node) => node.id === file.id)?.content).toBe(file.content);
  });

  it('reserves distinct names for concurrent folder creations', async () => {
    mount();
    await ready();
    const parent = api().folders.documents;
    if (!parent) throw new Error('Missing Documents folder');
    await act(async () => {
      const created = await Promise.all([api().createFolder(parent, 'Notes'), api().createFolder(parent, 'notes')]);
      expect(created.map((node) => node?.name.toLowerCase()).sort()).toEqual(['notes', 'notes (2)']);
    });
    const stored = (await loadNodes()).filter((node) => node.parentId === parent && node.name.toLowerCase().startsWith('notes'));
    expect(stored).toHaveLength(2);
    expect(new Set(stored.map((node) => node.name.toLowerCase())).size).toBe(2);
  });

  it('reserves distinct names for concurrent text files and shortcuts', async () => {
    mount();
    await ready();
    const parent = api().folders.documents;
    if (!parent) throw new Error('Missing Documents folder');
    await act(async () => {
      const texts = await Promise.all([api().createTextFile(parent, 'note.txt', 'one'), api().createTextFile(parent, 'note.txt', 'two')]);
      expect(texts.map((node) => node?.name).sort()).toEqual(['note (2).txt', 'note.txt']);
      const shortcuts = await Promise.all([
        api().createShortcut(parent, 'Link', { type: 'app', appId: 'notepad' }),
        api().createShortcut(parent, 'Link', { type: 'app', appId: 'notepad' }),
      ]);
      expect(shortcuts.map((node) => node?.name).sort()).toEqual(['Link (2).lnk', 'Link.lnk']);
    });
  });

  it('reserves names against the disk when two providers have separate snapshots', async () => {
    mount();
    await ready();
    const first = api();
    mount();
    await ready();
    const second = api();
    const parent = first.folders.documents;
    if (!parent) throw new Error('Missing Documents folder');
    await act(async () => {
      const created = await Promise.all([first.createFolder(parent, 'Shared'), second.createFolder(parent, 'Shared')]);
      expect(created.map((node) => node?.name).sort()).toEqual(['Shared', 'Shared (2)']);
    });
    expect((await loadNodes()).filter((node) => node.parentId === parent && node.name.startsWith('Shared'))).toHaveLength(2);
  });

  it('creates the initial structure with the system folders', async () => {
    mount();
    await ready();
    expect(api().folders.desktop).toBeTruthy();
    expect(api().folders.documents).toBeTruthy();
    expect(api().folders.portfolio).toBeTruthy();
    expect(api().folders.pictures).toBeTruthy();
    expect(api().folders.recycleBin).toBeTruthy();
    expect(api().pathOf(api().folders.documents as string)?.path).toBe('C:\\Documents');
  });

  it('keeps concurrent binary imports distinct and preserves their contents', async () => {
    // fake-indexeddb uses structuredClone, which cannot preserve jsdom's File objects.
    vi.stubGlobal('File', NativeFile);
    mount();
    await ready();
    const parent = api().folders.documents;
    if (!parent) throw new Error('Missing Documents folder');
    await act(async () => {
      const imports = await Promise.all([
        api().importFiles(parent, [new File(['one'], 'image.png', { type: 'image/png' })]),
        api().importFiles(parent, [new File(['second'], 'image.png', { type: 'image/png' })]),
      ]);
      expect(imports.flat().map((node) => node.name).sort()).toEqual(['image (2).png', 'image.png']);
    });
    const files = api().liveChildren(parent).filter((node) => node.name.endsWith('.png'));
    expect(files).toHaveLength(2);
    for (const file of files) expect((await api().readFileBlob(file.id))?.size).toBe(file.size);
  });

  it('keeps names distinct when copying a document twice concurrently', async () => {
    mount();
    await ready();
    const parent = api().folders.documents;
    if (!parent) throw new Error('Missing Documents folder');
    const file = await api().createTextFile(parent, 'note.txt', 'Copied text');
    if (!file) throw new Error('Missing source file');
    await expectNode(file.id);
    await act(async () => {
      expect(await Promise.all([api().copy([file.id], parent), api().copy([file.id], parent)])).toEqual([true, true]);
    });
    const files = api().liveChildren(parent).filter((node) => node.content === 'Copied text');
    expect(files).toHaveLength(3);
    expect(new Set(files.map((node) => node.name.toLowerCase())).size).toBe(3);
  });

  it('follows the acceptance walkthrough', async () => {
    mount();
    await ready();
    const documents = api().folders.documents as string;

    /* 1. create a folder in Documents */
    const folder = await api().createFolder(documents, 'Apuntes');
    expect(folder).not.toBeNull();
    await expectNode(folder!.id);
    expect(api().pathOf(folder!.id)?.path).toBe('C:\\Documents\\Apuntes');

    /* 2. write a document and save it inside that folder */
    const file = await api().createTextFile(folder!.id, 'nota.txt', 'hola mundo');
    await expectNode(file!.id);
    expect(api().pathOf(file!.id)?.path).toBe('C:\\Documents\\Apuntes\\nota.txt');

    /* the content survives a write/read cycle */
    await api().saveText(file!.id, 'hola mundo, segunda versión');
    await waitFor(async () =>
      expect(await api().readFileContent(file!.id)).toBe('hola mundo, segunda versión'),
    );

    /* 3. duplicate names never collide */
    const twin = await api().createTextFile(folder!.id, 'nota.txt', 'otra cosa');
    expect(twin!.name).toBe('nota (2).txt');
    await expectNode(twin!.id);

    /* 4. rename and move */
    expect(await api().rename(twin!.id, 'copia.txt')).toBe(true);
    await waitFor(() => expect(api().nodeById(twin!.id)?.name).toBe('copia.txt'));
    expect(await api().move([twin!.id], documents)).toBe(true);
    await waitFor(() => expect(api().pathOf(twin!.id)?.path).toBe('C:\\Documents\\copia.txt'));

    /* 5. a folder cannot be moved inside itself */
    expect(await api().move([folder!.id], folder!.id)).toBe(false);

    /* 6. the Recycle Bin keeps it and brings it back */
    expect(await api().trash([file!.id])).toBe(true);
    await waitFor(() => expect(api().binItems().map((node) => node.id)).toContain(file!.id));
    expect(api().liveChildren(folder!.id)).toHaveLength(0);

    expect(await api().restore([file!.id])).toBe(true);
    await waitFor(() =>
      expect(api().liveChildren(folder!.id).map((node) => node.id)).toContain(file!.id),
    );

    /* 7. deleting for good removes it from the disk */
    expect(await api().trash([file!.id])).toBe(true);
    await waitFor(() => expect(api().binItems().length).toBe(1));
    expect(await api().emptyBin()).toBe(true);
    await waitFor(() => expect(api().nodeById(file!.id)).toBeUndefined());
    expect(api().binItems()).toHaveLength(0);
  });

  it('refuses to delete system and portfolio content', async () => {
    mount();
    await ready();
    const portfolio = api().folders.portfolio as string;
    const children = api().liveChildren(portfolio);
    expect(children.length).toBeGreaterThan(0);
    expect(children.every((node) => node.readonly)).toBe(true);
    expect(await api().trash([children[0].id])).toBe(false);
  });

  it('searches by name and by contents', async () => {
    mount();
    await ready();
    const documents = api().folders.documents as string;
    const file = await api().createTextFile(documents, 'receta.txt', 'patatas y cebolla');
    await expectNode(file!.id);
    expect(api().search({ term: 'receta' })).toHaveLength(1);
    expect(api().search({ term: 'cebolla', contents: true })).toHaveLength(1);
    expect(api().search({ term: 'cebolla' })).toHaveLength(0);
  });
});
