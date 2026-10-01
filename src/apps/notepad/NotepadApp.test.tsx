// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_COMPONENTS, preloadApps } from '../../core/apps/components';
import { DialogProvider } from '../../core/dialogs/DialogProvider';
import { deleteDatabase } from '../../core/fs/db';
import { loadNodes } from '../../core/fs/vfs';
import { VfsProvider, useVfs, type VfsValue } from '../../core/fs/VfsProvider';
import { I18nProvider } from '../../core/i18n/I18nProvider';
import { PreferencesProvider } from '../../core/prefs/PreferencesProvider';
import { WindowsLayer } from '../../core/window/WindowsLayer';
import { WindowManagerProvider, useWindowManager, type WindowManagerValue } from '../../core/window/WindowManagerProvider';
import { MenuLayerProvider } from '../../ui/menu/MenuLayer';

let runtime: { wm: WindowManagerValue; vfs: VfsValue } | undefined;
const originalWidth = window.innerWidth;
const originalCreateUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

function current() {
  if (!runtime) throw new Error('Runtime not mounted');
  return runtime;
}

function Probe() {
  runtime = { wm: useWindowManager(), vfs: useVfs() };
  return null;
}

async function mount(width = 1024) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  render(
    <PreferencesProvider>
      <I18nProvider locale="en">
        <WindowManagerProvider appIds={Object.keys(APP_COMPONENTS)} iconIds={['notepad', 'about-me']}>
          <VfsProvider>
            <DialogProvider>
              <MenuLayerProvider>
                <Probe />
                <WindowsLayer />
              </MenuLayerProvider>
            </DialogProvider>
          </VfsProvider>
        </WindowManagerProvider>
      </I18nProvider>
    </PreferencesProvider>,
  );
  await waitFor(() => {
    expect(current().wm.booted).toBe(true);
    expect(current().vfs.ready).toBe(true);
  });
}

async function openNotepad(fileId?: string): Promise<HTMLTextAreaElement> {
  act(() => current().wm.openWindow({
    id: 'draft', appId: 'notepad', title: 'Notepad', icon: 'notepad',
    resizable: true, minimizable: true, maximizable: true,
    minWidth: 200, minHeight: 120, params: fileId ? { fileId } : {},
    docKey: null, helpTopicId: null,
  }));
  const editor = await screen.findByRole('textbox', { name: 'Notepad' });
  if (!(editor instanceof HTMLTextAreaElement)) throw new Error('Missing text editor');
  await waitFor(() => expect(editor.readOnly).toBe(false));
  return editor;
}

function openFileMenu() {
  fireEvent.click(screen.getByRole('menuitem', { name: 'File' }));
}

async function createDocument() {
  const parent = current().vfs.folders.documents;
  if (!parent) throw new Error('Missing Documents folder');
  let id = '';
  await act(async () => {
    const file = await current().vfs.createTextFile(parent, 'draft.txt', 'Saved text');
    if (!file) throw new Error('Document not created');
    id = file.id;
  });
  return id;
}

beforeAll(() => preloadApps());

beforeEach(async () => {
  runtime = undefined;
  window.localStorage.clear();
  await deleteDatabase();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: false, media,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }));
});

afterEach(async () => {
  cleanup();
  await deleteDatabase();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  if (originalCreateUrl) Object.defineProperty(URL, 'createObjectURL', originalCreateUrl);
  else Reflect.deleteProperty(URL, 'createObjectURL');
  if (originalRevokeUrl) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeUrl);
  else Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('document windows', () => {
  it('keeps unsaved text after minimizing and restoring', async () => {
    await mount();
    fireEvent.change(await openNotepad(), { target: { value: 'Unsaved draft' } });
    act(() => current().wm.minimize('draft'));
    expect(screen.queryByRole('textbox', { name: 'Notepad' })).toBeNull();
    act(() => current().wm.restore('draft'));
    expect((await openEditor()).value).toBe('Unsaved draft');
  });

  it('keeps unsaved text when switching windows on a compact screen', async () => {
    await mount(400);
    fireEvent.change(await openNotepad(), { target: { value: 'Mobile draft' } });
    act(() => current().wm.openWindow({
      id: 'about', appId: 'about', title: 'About me', icon: 'about-me',
      resizable: true, minimizable: true, maximizable: true,
      minWidth: 200, minHeight: 120, params: {}, docKey: null, helpTopicId: null,
    }));
    expect(screen.queryByRole('textbox', { name: 'Notepad' })).toBeNull();
    act(() => current().wm.focus('draft'));
    expect((await openEditor()).value).toBe('Mobile draft');
  });

  it('still asks about unsaved changes when closing a minimized document', async () => {
    await mount();
    fireEvent.change(await openNotepad(), { target: { value: 'Unsaved draft' } });
    act(() => current().wm.minimize('draft'));
    act(() => current().wm.close('draft'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(current().wm.windows.map((window) => window.id)).toContain('draft');
    act(() => current().wm.restore('draft'));
    expect((await openEditor()).value).toBe('Unsaved draft');
  });

  it('preserves the initial input focus of a newly opened compact application', async () => {
    await mount(400);
    await openNotepad();
    act(() => current().wm.openWindow({
      id: 'run', appId: 'run', title: 'Run', icon: 'run',
      resizable: false, minimizable: true, maximizable: false,
      minWidth: 200, minHeight: 120, params: {}, docKey: null, helpTopicId: null,
    }));
    const command = await screen.findByRole('textbox', { name: 'Type the name of a program and it will open:' });
    expect(document.activeElement).toBe(command);
  });

  it('ignores menu shortcuts from minimized applications', async () => {
    await mount();
    await openNotepad();
    act(() => current().wm.minimize('draft'));
    fireEvent.keyDown(document, { key: 'a', altKey: true });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does not overwrite read-only portfolio content through Save as', async () => {
    await mount();
    const file = [...current().vfs.nodes.values()].find((node) =>
      node.kind === 'file' && node.readonly && node.origin === 'portfolio' &&
      typeof node.content === 'string' && node.name.endsWith('.txt'),
    );
    if (!file) throw new Error('Missing read-only text file');
    const editor = await openNotepad(file.id);
    expect(editor.value).toBe(file.content);
    fireEvent.change(editor, { target: { value: 'Edited portfolio' } });
    openFileMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Save as/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));
    const stored = await loadNodes();
    expect(stored.find((node) => node.id === file.id)?.content).toBe(file.content);
    expect(editor.value).toBe('Edited portfolio');
    expect(screen.getByText('Not saved')).toBeTruthy();
  });

  it.each([
    { existing: false, text: 'New draft', name: 'Untitled.txt' },
    { existing: true, text: 'Saved text', name: 'draft.txt' },
    { existing: true, text: 'Latest draft', name: 'draft.txt' },
  ])('exports the current text "$text" as $name', async ({ existing, text, name }) => {
    await mount();
    const fileId = existing ? await createDocument() : undefined;
    const editor = await openNotepad(fileId);
    fireEvent.change(editor, { target: { value: text } });
    const downloads: Blob[] = [];
    const createUrl = vi.fn((blob: Blob) => {
      downloads.push(blob);
      return 'blob:document-download';
    });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    openFileMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Export/ }));
    await waitFor(() => expect(downloads).toHaveLength(1));
    const exported = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(downloads[0]);
    });
    expect(exported).toBe(text);
    expect(names).toEqual([name]);
    if (fileId) expect((await loadNodes()).find((node) => node.id === fileId)?.content).toBe('Saved text');
  });
});

async function openEditor(): Promise<HTMLTextAreaElement> {
  const editor = await screen.findByRole('textbox', { name: 'Notepad' });
  if (!(editor instanceof HTMLTextAreaElement)) throw new Error('Missing text editor');
  return editor;
}
