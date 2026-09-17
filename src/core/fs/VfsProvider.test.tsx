// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { PreferencesProvider } from '../prefs/PreferencesProvider';
import { useVfs, VfsProvider, type VfsValue } from './VfsProvider';

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

beforeEach(() => {
  apiRef.current = null;
});

describe('virtual disk', () => {
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
