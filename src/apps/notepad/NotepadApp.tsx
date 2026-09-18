import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { useVfs } from '../../core/fs/VfsProvider';
import { extensionOf } from '../../core/fs/vfsUtils';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { StatusBar } from '../../ui/StatusBar';
import { menuSeparator } from '../../ui/menu/types';

function textFilters(t: ReturnType<typeof useI18n>['t']) {
  return [
    {
      label: t('notepad.textFilesFilter'),
      test: (name: string) => ['.txt', '.log', '.ini', '.md'].includes(extensionOf(name)),
    },
    { label: t('notepad.allFilesFilter'), test: () => true },
  ];
}

/**
 * Notepad: a real text editor over the virtual disk. Saving writes to
 * IndexedDB, so the document shows up in Explorer and survives a reload.
 */
export function NotepadApp({ windowId, params }: AppRenderProps) {
  const { t, formatDateTime } = useI18n();
  const vfs = useVfs();
  const dialogs = useDialogs();
  const wm = useWindowManager();

  const initialFileId = typeof params.fileId === 'string' ? params.fileId : null;
  const [fileId, setFileId] = useState<string | null>(initialFileId);
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [wrap, setWrap] = useState(true);
  const [loading, setLoading] = useState(initialFileId !== null);
  const [findTerm, setFindTerm] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const node = fileId ? vfs.nodeById(fileId) : undefined;
  const dirty = text !== savedText;
  const documentsFolder = vfs.folders.documents ?? vfs.folders.desktop ?? '';

  /* --- load the document ------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    if (!initialFileId) {
      setLoading(false);
      return;
    }
    if (!vfs.ready) return;
    void (async () => {
      const content = await vfs.readFileContent(initialFileId);
      if (cancelled) return;
      setText(content ?? '');
      setSavedText(content ?? '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialFileId, vfs.ready]);

  useEffect(() => {
    if (!node) return;
    wm.setTitle(windowId, `${node.name} - ${t('app.notepad')}`);
  }, [node, t, windowId, wm]);

  /* --- saving ------------------------------------------------------ */
  const confirmSaveChanges = useCallback(async (): Promise<'save' | 'discard' | 'cancel'> => {
    if (!dirty) return 'discard';
    const answer = await dialogs.message({
      title: t('dialog.unsavedTitle'),
      kind: 'warning',
      message: t('dialog.unsavedMessage', { name: node?.name ?? t('file.untitled') }),
      buttons: 'yesNoCancel',
    });
    if (answer === 'yes') return 'save';
    if (answer === 'no') return 'discard';
    return 'cancel';
  }, [dialogs, dirty, node?.name, t]);

  const saveAs = useCallback(async (): Promise<boolean> => {
    const result = await dialogs.saveFile({
      title: t('notepad.saveAs'),
      startFolderId: node?.parentId ?? documentsFolder,
      fileName: node?.name ?? `${t('file.untitled')}.txt`,
      filters: textFilters(t),
    });
    if (!result) return false;

    const existing = vfs
      .liveChildren(result.folderId)
      .find((candidate) => candidate.name.toLowerCase() === result.name.toLowerCase());

    if (existing) {
      const replace = await dialogs.confirm({
        title: t('notepad.saveAs'),
        kind: 'question',
        message: t('dialog.nameInUse', { name: result.name }),
        buttons: 'yesNo',
      });
      if (!replace) return false;
      const ok = await vfs.saveText(existing.id, text);
      if (ok) {
        setFileId(existing.id);
        setSavedText(text);
        setNotice(t('notepad.saved', { path: vfs.pathOf(existing.id)?.path ?? existing.name }));
      }
      return ok;
    }

    const created = await vfs.createTextFile(result.folderId, result.name, text);
    if (!created) return false;
    setFileId(created.id);
    setSavedText(text);
    setNotice(t('notepad.saved', { path: vfs.pathOf(created.id)?.path ?? created.name }));
    return true;
  }, [dialogs, documentsFolder, node, t, text, vfs]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!fileId || !node) return saveAs();
    if (node.readonly) {
      await dialogs.alert({
        title: t('notepad.save'),
        kind: 'info',
        message: t('dialog.readOnly', { name: node.name }),
      });
      return saveAs();
    }
    const ok = await vfs.saveText(fileId, text);
    if (ok) {
      setSavedText(text);
      setNotice(t('notepad.saved', { path: vfs.pathOf(fileId)?.path ?? node.name }));
    }
    return ok;
  }, [dialogs, fileId, node, saveAs, t, text, vfs]);

  const newDocument = useCallback(async () => {
    const decision = await confirmSaveChanges();
    if (decision === 'cancel') return;
    if (decision === 'save' && !(await save())) return;
    setFileId(null);
    setText('');
    setSavedText('');
    setNotice(null);
    wm.setTitle(windowId, `${t('file.untitled')} - ${t('app.notepad')}`);
  }, [confirmSaveChanges, save, t, windowId, wm]);

  const openDocument = useCallback(async () => {
    const decision = await confirmSaveChanges();
    if (decision === 'cancel') return;
    if (decision === 'save' && !(await save())) return;
    const result = await dialogs.openFile({
      title: t('notepad.open'),
      startFolderId: node?.parentId ?? documentsFolder,
      filters: textFilters(t),
    });
    if (!result?.node) return;
    const content = await vfs.readFileContent(result.node.id);
    setFileId(result.node.id);
    setText(content ?? '');
    setSavedText(content ?? '');
    setNotice(null);
  }, [confirmSaveChanges, dialogs, documentsFolder, node?.parentId, save, t, vfs]);

  const exportDocument = useCallback(async () => {
    if (fileId) {
      await vfs.exportNode(fileId);
      return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${t('file.untitled')}.txt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, [fileId, t, text, vfs]);

  /* Unsaved changes are never silently discarded. */
  useEffect(() => {
    return wm.registerCloseGuard(windowId, async () => {
      const decision = await confirmSaveChanges();
      if (decision === 'cancel') return false;
      if (decision === 'save') return save();
      return true;
    });
  }, [confirmSaveChanges, save, windowId, wm]);

  /* --- find bar ---------------------------------------------------- */
  const findNext = useCallback(
    (term: string, backwards = false) => {
      const textarea = textareaRef.current;
      if (!textarea || !term) return;
      const haystack = text;
      const from = backwards
        ? textarea.selectionStart - 1
        : textarea.selectionEnd;
      const index = backwards
        ? haystack.toLowerCase().lastIndexOf(term.toLowerCase(), Math.max(0, from))
        : haystack.toLowerCase().indexOf(term.toLowerCase(), from);
      const found = index >= 0 ? index : backwards
        ? haystack.toLowerCase().lastIndexOf(term.toLowerCase())
        : haystack.toLowerCase().indexOf(term.toLowerCase());
      if (found < 0) {
        setNotice(t('notepad.notFound', { term }));
        return;
      }
      setNotice(null);
      textarea.focus();
      textarea.setSelectionRange(found, found + term.length);
    },
    [t, text],
  );

  const openFindDialog = useCallback(async () => {
    const value = await dialogs.prompt({
      title: t('notepad.find'),
      label: t('notepad.findWhat'),
      initialValue: findTerm,
    });
    if (value === null) return;
    setFindTerm(value);
    findNext(value);
  }, [dialogs, findNext, findTerm, t]);

  /* --- menus ------------------------------------------------------- */
  const menus = useMemo<MenuBarMenu[]>(
    () => [
      {
        id: 'file',
        label: t('menu.file'),
        accessKey: 'a',
        entries: [
          { kind: 'item', id: 'new', label: t('notepad.new'), onSelect: () => void newDocument() },
          { kind: 'item', id: 'open', label: t('notepad.open'), onSelect: () => void openDocument() },
          { kind: 'item', id: 'save', label: t('notepad.save'), onSelect: () => void save() },
          { kind: 'item', id: 'save-as', label: t('notepad.saveAs'), onSelect: () => void saveAs() },
          { kind: 'item', id: 'export', label: t('menu.export'), onSelect: () => void exportDocument() },
          menuSeparator('sep'),
          { kind: 'item', id: 'exit', label: t('notepad.exit'), onSelect: () => void wm.close(windowId) },
        ],
      },
      {
        id: 'edit',
        label: t('menu.edit'),
        accessKey: 'e',
        entries: [
          {
            kind: 'item',
            id: 'undo',
            label: t('notepad.undo'),
            onSelect: () => {
              textareaRef.current?.focus();
              document.execCommand('undo');
            },
          },
          menuSeparator('sep1'),
          {
            kind: 'item',
            id: 'cut',
            label: t('desktop.cut'),
            onSelect: () => {
              textareaRef.current?.focus();
              document.execCommand('cut');
            },
          },
          {
            kind: 'item',
            id: 'copy',
            label: t('desktop.copy'),
            onSelect: () => {
              textareaRef.current?.focus();
              document.execCommand('copy');
            },
          },
          {
            kind: 'item',
            id: 'paste',
            label: t('desktop.paste'),
            onSelect: () => {
              textareaRef.current?.focus();
              void navigator.clipboard
                ?.readText()
                .then((clipboardText) => insertAtCursor(clipboardText, textareaRef.current, setText))
                .catch(() => undefined);
            },
          },
          menuSeparator('sep2'),
          {
            kind: 'item',
            id: 'select-all',
            label: t('desktop.selectAll'),
            onSelect: () => {
              textareaRef.current?.focus();
              textareaRef.current?.select();
            },
          },
          {
            kind: 'item',
            id: 'date',
            label: t('notepad.insertDate'),
            onSelect: () => {
              insertAtCursor(formatDateTime(new Date()), textareaRef.current, setText);
            },
          },
        ],
      },
      {
        id: 'search',
        label: t('menu.search'),
        accessKey: 'b',
        entries: [
          {
            kind: 'item',
            id: 'find',
            label: t('notepad.find'),
            onSelect: () => {
              void openFindDialog();
            },
          },
          {
            kind: 'item',
            id: 'find-next',
            label: t('notepad.findNext'),
            onSelect: () => (findTerm ? findNext(findTerm) : void openFindDialog()),
          },
        ],
      },
      {
        id: 'options',
        label: t('menu.options'),
        entries: [
          {
            kind: 'item',
            id: 'wrap',
            label: t('notepad.wrap'),
            checked: wrap,
            onSelect: () => setWrap((current) => !current),
          },
        ],
      },
      {
        id: 'help',
        label: t('menu.help'),
        accessKey: 'y',
        entries: [
          {
            kind: 'item',
            id: 'help-topics',
            label: t('app.help'),
            onSelect: () =>
              window.dispatchEvent(new CustomEvent('w95:open-help', { detail: 'welcome' })),
          },
        ],
      },
    ],
    [exportDocument, findNext, findTerm, formatDateTime, newDocument, openDocument, openFindDialog, save, saveAs, t, windowId, wm, wrap],
  );

  const path = fileId ? vfs.pathOf(fileId)?.path ?? '' : t('file.untitled');

  return (
    <div className="app-notepad">
      <MenuBar menus={menus} ariaLabel={t('app.notepad')} />

      <textarea
        ref={textareaRef}
        className={wrap ? 'client w95-scroll notepad-text notepad-text--wrap' : 'client w95-scroll notepad-text'}
        value={loading ? '' : text}
        readOnly={loading}
        spellCheck={false}
        aria-label={t('app.notepad')}
        onChange={(event) => {
          setText(event.target.value);
          setNotice(null);
        }}
        wrap={wrap ? 'soft' : 'off'}
      />

      <StatusBar
        panels={[
          {
            id: 'state',
            width: 200,
            content: notice ?? (loading ? t('common.loading') : dirty ? t('notepad.unsaved') : node?.readonly ? t('notepad.readonly') : ''),
          },
          { id: 'path', content: path },
        ]}
      />
    </div>
  );
}

/** Inserts text where the caret is, keeping the caret after the inserted text. */
function insertAtCursor(
  insertion: string,
  textarea: HTMLTextAreaElement | null,
  setText: (updater: (current: string) => string) => void,
): void {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  setText((current) => `${current.slice(0, start)}${insertion}${current.slice(end)}`);
  window.setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + insertion.length, start + insertion.length);
  }, 0);
}
