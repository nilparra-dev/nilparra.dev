import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useMenuLayer } from '../../ui/menu/MenuLayer';
import { menuSeparator, type MenuEntry } from '../../ui/menu/types';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { StatusBar } from '../../ui/StatusBar';
import { Icon } from '../../ui/Icon';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useVfs } from '../../core/fs/VfsProvider';
import { useClipboard } from '../../core/fs/clipboard';
import { useClipboardActions, useFileOpener } from '../../core/fs/useFileOpener';
import { nodeDisplayName, nodeTypeLabel, iconForNode } from '../../core/fs/display';
import { formatBytes, isValidName, folderSize } from '../../core/fs/vfsUtils';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { ROOT_ID, type FsNode } from '../../core/fs/types';
import { TriangleDown } from '../../ui/glyphs';

type ViewMode = 'large' | 'small' | 'details';
type SortKey = 'name' | 'type' | 'size' | 'date';

interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

/**
 * Explorer (and My Computer, which is the same window opened at the root of the
 * virtual disk). Everything it shows comes from the file system state, so a
 * document saved from Notepad appears here immediately.
 */
export function ExplorerApp({ windowId, params }: AppRenderProps) {
  const { t, locale, formatDateTime } = useI18n();
  const vfs = useVfs();
  const dialogs = useDialogs();
  const wm = useWindowManager();
  const { open: openMenu } = useMenuLayer();
  const openNode = useFileOpener();
  const { cut, copy, paste, trash } = useClipboardActions();
  const clipboard = useClipboard();

  const initialFolder =
    typeof params.folderId === 'string' && vfs.nodeById(params.folderId)
      ? params.folderId
      : vfs.folders.desktop ?? ROOT_ID;

  const [folderId, setFolderId] = useState(initialFolder);
  const [history, setHistory] = useState<string[]>([initialFolder]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>('large');
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState<{ ids: string[]; x: number; y: number } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const folder = vfs.nodeById(folderId);
  const isBin = folder?.systemKey === 'recycleBin';
  const collator = useMemo(() => new Intl.Collator(locale, { sensitivity: 'base', numeric: true }), [locale]);

  /* Keep the window title in sync with the folder being browsed. */
  useEffect(() => {
    if (folder) wm.setTitle(windowId, nodeDisplayName(folder, t));
  }, [folder, t, windowId, wm]);

  useEffect(() => {
    if (!vfs.nodeById(folderId)) {
      const fallback = vfs.folders.desktop ?? ROOT_ID;
      setFolderId(fallback);
    }
  }, [folderId, vfs]);

  const items = useMemo(() => {
    const children = isBin
      ? vfs.binItems()
      : vfs.liveChildren(folderId);
    const sorted = [...children].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      const factor = sort.dir === 'asc' ? 1 : -1;
      switch (sort.key) {
        case 'type':
          return factor * collator.compare(nodeTypeLabel(a, t), nodeTypeLabel(b, t));
        case 'size': {
          const sizeA = a.kind === 'folder' ? folderSize(vfs.nodes, a.id) : a.size;
          const sizeB = b.kind === 'folder' ? folderSize(vfs.nodes, b.id) : b.size;
          return factor * (sizeA - sizeB);
        }
        case 'date':
          return factor * (a.updatedAt - b.updatedAt);
        default:
          return factor * collator.compare(nodeDisplayName(a, t), nodeDisplayName(b, t));
      }
    });
    return sorted;
  }, [collator, isBin, sort.dir, sort.key, t, folderId, vfs]);

  const navigate = useCallback(
    (targetId: string) => {
      setFolderId(targetId);
      setSelected([]);
      setFocusedId(null);
      setHistory((current) => {
        const trimmed = current.slice(0, historyIndex + 1);
        return [...trimmed, targetId];
      });
      setHistoryIndex((index) => index + 1);
    },
    [historyIndex],
  );

  const goBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const target = history[historyIndex - 1];
    setHistoryIndex((index) => index - 1);
    setFolderId(target);
    setSelected([]);
  }, [history, historyIndex]);

  const goUp = useCallback(() => {
    if (folder?.parentId) navigate(folder.parentId);
  }, [folder, navigate]);

  const selectedNodes = useMemo(
    () => items.filter((item) => selected.includes(item.id)),
    [items, selected],
  );

  /* --- actions ------------------------------------------------------ */

  const openItems = useCallback(
    async (nodes: FsNode[]) => {
      for (const node of nodes) {
        if (node.kind === 'folder') {
          if (isBin) continue;
          navigate(node.id);
          return;
        }
        await openNode(node);
      }
    },
    [isBin, navigate, openNode],
  );

  const createFolder = useCallback(async () => {
    const created = await vfs.createFolder(folderId);
    if (!created) return;
    const name = await dialogs.prompt({
      title: t('desktop.newFolder'),
      label: t('common.name'),
      initialValue: created.name,
      validate: (value) => {
        if (!value.trim()) return t('dialog.nameRequired');
        if (!isValidName(value)) return t('dialog.invalidName');
        const problem = vfs.validateName(folderId, value, created.id);
        if (problem === 'taken') return t('dialog.nameInUse', { name: value });
        return null;
      },
    });
    if (name && name !== created.name) await vfs.rename(created.id, name);
    setSelected([created.id]);
  }, [dialogs, folderId, t, vfs]);

  const createDocument = useCallback(async () => {
    const created = await vfs.createTextFile(folderId, `${t('file.newFileName')}`, '');
    if (!created) return;
    const name = await dialogs.prompt({
      title: t('desktop.newDocument'),
      label: t('common.name'),
      initialValue: created.name,
      validate: (value) => {
        if (!value.trim()) return t('dialog.nameRequired');
        if (!isValidName(value)) return t('dialog.invalidName');
        const problem = vfs.validateName(folderId, value, created.id);
        if (problem === 'taken') return t('dialog.nameInUse', { name: value });
        return null;
      },
    });
    if (name && name !== created.name) await vfs.rename(created.id, name);
    setSelected([created.id]);
  }, [dialogs, folderId, t, vfs]);

  const renameSelected = useCallback(async () => {
    const node = selectedNodes[0];
    if (!node || node.readonly) return;
    const name = await dialogs.prompt({
      title: t('desktop.rename'),
      label: t('common.name'),
      initialValue: node.name,
      validate: (value) => {
        if (!value.trim()) return t('dialog.nameRequired');
        if (!isValidName(value)) return t('dialog.invalidName');
        const problem = vfs.validateName(node.parentId ?? folderId, value, node.id);
        if (problem === 'taken') return t('dialog.nameInUse', { name: value });
        return null;
      },
    });
    if (name && name !== node.name) await vfs.rename(node.id, name);
  }, [dialogs, folderId, selectedNodes, t, vfs]);

  const destroySelected = useCallback(async () => {
    if (!selectedNodes.length) return;
    const confirmed = await dialogs.confirm({
      title: t('desktop.delete'),
      kind: 'warning',
      message:
        selectedNodes.length === 1
          ? t('dialog.confirmDelete', { name: selectedNodes[0].name })
          : t('dialog.confirmDeleteMany', { count: selectedNodes.length }),
    });
    if (!confirmed) return;
    await vfs.destroy(selectedNodes.map((node) => node.id));
    setSelected([]);
  }, [dialogs, selectedNodes, t, vfs]);

  const emptyBin = useCallback(async () => {
    const count = vfs.binItems().length;
    if (!count) return;
    const confirmed = await dialogs.confirm({
      title: t('app.recycleBin'),
      kind: 'warning',
      message: t('dialog.confirmEmptyBin', { count }),
    });
    if (confirmed) await vfs.emptyBin();
  }, [dialogs, t, vfs]);

  const importFiles = useCallback(
    async (files: File[]) => {
      const created = await vfs.importFiles(folderId, files);
      if (created.length) setSelected(created.map((node) => node.id));
    },
    [folderId, vfs],
  );

  const deleteAction = useCallback(async () => {
    if (isBin) await destroySelected();
    else await trash(selectedNodes);
  }, [destroySelected, isBin, selectedNodes, trash]);

  /* --- menus -------------------------------------------------------- */

  const buildMenu = useCallback((): MenuBarMenu[] => {
    const selectionEmpty = selectedNodes.length === 0;
    const single = selectedNodes.length === 1 ? selectedNodes[0] : null;

    return [
      {
        id: 'file',
        label: t('menu.file'),
        accessKey: 'a',
        entries: [
          { kind: 'item', id: 'open', label: t('desktop.open'), disabled: selectionEmpty, onSelect: () => void openItems(selectedNodes) },
          { kind: 'item', id: 'explore', label: t('desktop.explore'), disabled: !single || single.kind !== 'folder', onSelect: () => single && navigate(single.id) },
          menuSeparator('sep1'),
          {
            kind: 'submenu',
            id: 'new',
            label: t('desktop.new'),
            items: [
              { kind: 'item', id: 'new-folder', label: t('desktop.newFolder'), onSelect: () => void createFolder() },
              { kind: 'item', id: 'new-doc', label: t('desktop.newDocument'), onSelect: () => void createDocument() },
            ],
          },
          {
            kind: 'item',
            id: 'import',
            label: t('menu.import'),
            onSelect: () => fileInputRef.current?.click(),
          },
          {
            kind: 'item',
            id: 'export',
            label: t('menu.export'),
            disabled: !single || single.kind !== 'file',
            onSelect: () => single && void vfs.exportNode(single.id),
          },
          menuSeparator('sep2'),
          { kind: 'item', id: 'rename', label: t('desktop.rename'), disabled: !single || single.readonly, onSelect: () => void renameSelected() },
          { kind: 'item', id: 'delete', label: t('desktop.delete'), disabled: selectionEmpty, onSelect: () => void deleteAction() },
          { kind: 'item', id: 'properties', label: t('desktop.properties'), disabled: !single, onSelect: () => single && void dialogs.properties(single) },
          menuSeparator('sep3'),
          { kind: 'item', id: 'close', label: t('window.close'), onSelect: () => wm.close(windowId) },
        ],
      },
      {
        id: 'edit',
        label: t('menu.edit'),
        accessKey: 'e',
        entries: [
          { kind: 'item', id: 'cut', label: t('desktop.cut'), disabled: selectionEmpty, onSelect: () => cut(selectedNodes) },
          { kind: 'item', id: 'copy', label: t('desktop.copy'), disabled: selectionEmpty, onSelect: () => copy(selectedNodes) },
          { kind: 'item', id: 'paste', label: t('desktop.paste'), disabled: !clipboard, onSelect: () => void paste(folderId) },
          menuSeparator('sep1'),
          { kind: 'item', id: 'select-all', label: t('desktop.selectAll'), onSelect: () => setSelected(items.map((item) => item.id)) },
        ],
      },
      {
        id: 'view',
        label: t('menu.view'),
        accessKey: 'v',
        entries: [
          { kind: 'item', id: 'large', label: t('desktop.viewLargeIcons'), checked: view === 'large', radio: true, onSelect: () => setView('large') },
          { kind: 'item', id: 'small', label: t('desktop.viewSmallIcons'), checked: view === 'small', radio: true, onSelect: () => setView('small') },
          { kind: 'item', id: 'details', label: t('desktop.viewDetails'), checked: view === 'details', radio: true, onSelect: () => setView('details') },
          menuSeparator('sep1'),
          {
            kind: 'submenu',
            id: 'sort',
            label: t('menu.sortBy'),
            items: [
              { kind: 'item', id: 'by-name', label: t('common.name'), checked: sort.key === 'name', radio: true, onSelect: () => setSort({ key: 'name', dir: 'asc' }) },
              { kind: 'item', id: 'by-type', label: t('common.type'), checked: sort.key === 'type', radio: true, onSelect: () => setSort({ key: 'type', dir: 'asc' }) },
              { kind: 'item', id: 'by-size', label: t('common.size'), checked: sort.key === 'size', radio: true, onSelect: () => setSort({ key: 'size', dir: 'asc' }) },
              { kind: 'item', id: 'by-date', label: t('common.date'), checked: sort.key === 'date', radio: true, onSelect: () => setSort({ key: 'date', dir: 'asc' }) },
            ],
          },
          menuSeparator('sep2'),
          { kind: 'item', id: 'refresh', label: t('desktop.refresh'), onSelect: () => void vfs.refreshUsage() },
        ],
      },
      {
        id: 'go',
        label: t('menu.go'),
        accessKey: 'i',
        entries: [
          { kind: 'item', id: 'back', label: t('menu.back'), disabled: historyIndex <= 0, onSelect: goBack },
          { kind: 'item', id: 'up', label: t('menu.up'), disabled: !folder?.parentId, onSelect: goUp },
          menuSeparator('sep1'),
          { kind: 'item', id: 'root', label: t('app.myComputer'), onSelect: () => navigate(ROOT_ID) },
          { kind: 'item', id: 'desktop-folder', label: t('folder.desktop'), onSelect: () => vfs.folders.desktop && navigate(vfs.folders.desktop) },
          { kind: 'item', id: 'documents', label: t('folder.documents'), onSelect: () => vfs.folders.documents && navigate(vfs.folders.documents) },
          { kind: 'item', id: 'portfolio', label: t('folder.portfolio'), onSelect: () => vfs.folders.portfolio && navigate(vfs.folders.portfolio) },
          { kind: 'item', id: 'pictures', label: t('folder.pictures'), onSelect: () => vfs.folders.pictures && navigate(vfs.folders.pictures) },
        ],
      },
      ...(isBin
        ? [
            {
              id: 'bin',
              label: t('app.recycleBin'),
              entries: [
                { kind: 'item' as const, id: 'restore', label: t('window.restore'), disabled: selectionEmpty, onSelect: () => void vfs.restore(selected.map((id) => id)) },
                menuSeparator('sep-bin'),
                { kind: 'item' as const, id: 'empty', label: t('desktop.delete'), onSelect: () => void emptyBin() },
              ],
            },
          ]
        : []),
    ];
  }, [
    clipboard,
    copy,
    createDocument,
    createFolder,
    cut,
    deleteAction,
    dialogs,
    emptyBin,
    folder?.parentId,
    folderId,
    goBack,
    goUp,
    historyIndex,
    isBin,
    items,
    navigate,
    openItems,
    paste,
    renameSelected,
    selected,
    selectedNodes,
    sort.key,
    t,
    view,
    vfs,
    windowId,
    wm,
  ]);

  const itemMenu = useCallback(
    (node: FsNode): MenuEntry[] => {
      const nodes = selected.includes(node.id) ? selectedNodes : [node];
      const single = nodes.length === 1 ? nodes[0] : null;
      const entries: MenuEntry[] = [
        { kind: 'item', id: 'open', label: t('desktop.open'), onSelect: () => void openItems(nodes) },
      ];
      if (isBin) {
        entries.push(
          menuSeparator('sep'),
          { kind: 'item', id: 'restore', label: t('window.restore'), onSelect: () => void vfs.restore(nodes.map((item) => item.id)) },
          { kind: 'item', id: 'destroy', label: t('desktop.delete'), onSelect: () => void destroySelected() },
        );
        entries.push(menuSeparator('sep2'));
        entries.push({ kind: 'item', id: 'properties', label: t('desktop.properties'), disabled: !single, onSelect: () => single && void dialogs.properties(single) });
        return entries;
      }
      entries.push(
        menuSeparator('sep'),
        { kind: 'item', id: 'cut', label: t('desktop.cut'), disabled: nodes.some((item) => item.readonly), onSelect: () => cut(nodes) },
        { kind: 'item', id: 'copy', label: t('desktop.copy'), onSelect: () => copy(nodes) },
        menuSeparator('sep2'),
        { kind: 'item', id: 'shortcut', label: t('desktop.createShortcut'), disabled: !single, onSelect: () => single && void createShortcutFor(single) },
        { kind: 'item', id: 'export', label: 'Exportar a mi equipo', disabled: !single || single.kind !== 'file', onSelect: () => single && void vfs.exportNode(single.id) },
        menuSeparator('sep3'),
        { kind: 'item', id: 'delete', label: t('desktop.delete'), disabled: nodes.some((item) => item.readonly), onSelect: () => void deleteAction() },
        { kind: 'item', id: 'rename', label: t('desktop.rename'), disabled: !single || single.readonly, onSelect: () => void renameSelected() },
        { kind: 'item', id: 'properties', label: t('desktop.properties'), disabled: !single, onSelect: () => single && void dialogs.properties(single) },
      );
      return entries;
    },
    [copy, cut, deleteAction, destroySelected, dialogs, isBin, openItems, renameSelected, selected, selectedNodes, t, vfs],
  );

  const createShortcutFor = useCallback(
    async (node: FsNode) => {
      const desktopId = vfs.folders.desktop;
      if (!desktopId) return;
      await vfs.createShortcut(
        desktopId,
        `${node.name}`,
        { type: 'node', nodeId: node.id },
        node.kind === 'folder' ? 'folder' : iconForNode(node),
      );
    },
    [vfs],
  );

  /* --- selection and pointer input ---------------------------------- */

  const select = (id: string, event: { ctrlKey: boolean; shiftKey: boolean; metaKey?: boolean }) => {
    setFocusedId(id);
    if (event.ctrlKey || event.metaKey) {
      setSelected((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
      return;
    }
    if (event.shiftKey && focusedId) {
      const from = items.findIndex((item) => item.id === focusedId);
      const to = items.findIndex((item) => item.id === id);
      if (from >= 0 && to >= 0) {
        const [start, end] = from < to ? [from, to] : [to, from];
        setSelected(items.slice(start, end + 1).map((item) => item.id));
        return;
      }
    }
    setSelected([id]);
  };

  const beginItemDrag = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: FsNode,
  ) => {
    if (event.button !== 0 || isBin) return;
    const nodes = selected.includes(node.id) ? selectedNodes : [node];
    const origin = { x: event.clientX, y: event.clientY };
    let moved = false;
    const onMove = (moveEvent: PointerEvent) => {
      if (moved) {
        setDragging((current) => (current ? { ...current, x: moveEvent.clientX, y: moveEvent.clientY } : current));
        const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const folderElement = target?.closest<HTMLElement>('[data-folder-id]');
        setDropTargetId(folderElement?.dataset.folderId ?? null);
        return;
      }
      if (Math.abs(moveEvent.clientX - origin.x) + Math.abs(moveEvent.clientY - origin.y) < 5) return;
      moved = true;
      setDragging({ ids: nodes.map((item) => item.id), x: moveEvent.clientX, y: moveEvent.clientY });
    };
    const finish = async () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', finish);
      const targetId = dropTargetId;
      setDragging(null);
      setDropTargetId(null);
      if (!moved || !targetId || targetId === folderId) return;
      await vfs.move(nodes.map((item) => item.id), targetId);
      setSelected([]);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', finish);
  };

  const beginMarquee = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || view === 'details') return;
    const surface = surfaceRef.current;
    if (!surface || event.target !== surface) return;
    const rect = surface.getBoundingClientRect();
    const origin = { x: event.clientX - rect.left + surface.scrollLeft, y: event.clientY - rect.top + surface.scrollTop };
    const base = event.ctrlKey || event.shiftKey ? selected : [];
    if (!base.length) setSelected([]);
    const onMove = (moveEvent: PointerEvent) => {
      const current = {
        x: moveEvent.clientX - rect.left + surface.scrollLeft,
        y: moveEvent.clientY - rect.top + surface.scrollTop,
      };
      const box = {
        x: Math.min(origin.x, current.x),
        y: Math.min(origin.y, current.y),
        width: Math.abs(current.x - origin.x),
        height: Math.abs(current.y - origin.y),
      };
      setMarquee(box);
      const hits = items
        .filter((item) => {
          const element = surface.querySelector<HTMLElement>(`[data-node-id="${item.id}"]`);
          if (!element) return false;
          const box2 = {
            x: element.offsetLeft,
            y: element.offsetTop,
            width: element.offsetWidth,
            height: element.offsetHeight,
          };
          return box.x < box2.x + box2.width && box.x + box.width > box2.x && box.y < box2.y + box2.height && box.y + box.height > box2.y;
        })
        .map((item) => item.id);
      setSelected([...new Set([...base, ...hits])]);
    };
    const finish = () => {
      surface.removeEventListener('pointermove', onMove);
      surface.removeEventListener('pointerup', finish);
      setMarquee(null);
    };
    surface.addEventListener('pointermove', onMove);
    surface.addEventListener('pointerup', finish);
  };

  /* --- keyboard ----------------------------------------------------- */

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const index = focusedId ? items.findIndex((item) => item.id === focusedId) : -1;
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          if (items.length) {
            const next = items[Math.min(items.length - 1, index + 1)] ?? items[0];
            setFocusedId(next.id);
            setSelected([next.id]);
          }
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          if (items.length) {
            const next = items[Math.max(0, index - 1)] ?? items[0];
            setFocusedId(next.id);
            setSelected([next.id]);
          }
          break;
        case 'Enter':
          event.preventDefault();
          void openItems(selectedNodes);
          break;
        case 'Backspace':
          event.preventDefault();
          goUp();
          break;
        case 'F2':
          event.preventDefault();
          void renameSelected();
          break;
        case 'Delete':
          event.preventDefault();
          void deleteAction();
          break;
        case 'F5':
          event.preventDefault();
          void vfs.refreshUsage();
          break;
        case 'a':
          if (event.ctrlKey) {
            event.preventDefault();
            setSelected(items.map((item) => item.id));
          }
          break;
        case 'c':
          if (event.ctrlKey) {
            event.preventDefault();
            copy(selectedNodes);
          }
          break;
        case 'x':
          if (event.ctrlKey) {
            event.preventDefault();
            cut(selectedNodes);
          }
          break;
        case 'v':
          if (event.ctrlKey) {
            event.preventDefault();
            void paste(folderId);
          }
          break;
        default:
          break;
      }
    };
    surface.addEventListener('keydown', onKeyDown);
    return () => surface.removeEventListener('keydown', onKeyDown);
  }, [copy, cut, deleteAction, focusedId, folderId, goUp, items, openItems, paste, renameSelected, selectedNodes, vfs]);

  /* --- rendering ---------------------------------------------------- */

  const ancestors = useMemo(() => {
    const result: FsNode[] = [];
    let current = folder;
    let guard = 0;
    while (current && guard < 32) {
      result.unshift(current);
      current = current.parentId ? vfs.nodeById(current.parentId) : undefined;
      guard += 1;
    }
    return result;
  }, [folder, vfs]);

  const totalSize = selectedNodes.reduce(
    (sum, node) => sum + (node.kind === 'folder' ? folderSize(vfs.nodes, node.id) : node.size),
    0,
  );

  return (
    <div className="app-explorer">
      <MenuBar menus={buildMenu()} ariaLabel={t('app.explorer')} />

      <div className="toolbar">
        <button type="button" className="tool-btn" onClick={goBack} disabled={historyIndex <= 0}>
          <Icon id="folder-open" size={16} />
          <span>{t('menu.back')}</span>
        </button>
        <button type="button" className="tool-btn" onClick={goUp} disabled={!folder?.parentId}>
          <Icon id="drive" size={16} />
          <span>{t('menu.up')}</span>
        </button>
        <span className="tool-sep" />
        <button type="button" className="tool-btn" onClick={() => cut(selectedNodes)} disabled={!selectedNodes.length}>
          <span>{t('desktop.cut')}</span>
        </button>
        <button type="button" className="tool-btn" onClick={() => copy(selectedNodes)} disabled={!selectedNodes.length}>
          <span>{t('desktop.copy')}</span>
        </button>
        <button type="button" className="tool-btn" onClick={() => void paste(folderId)} disabled={!clipboard}>
          <span>{t('desktop.paste')}</span>
        </button>
        <button type="button" className="tool-btn" onClick={() => void deleteAction()} disabled={!selectedNodes.length}>
          <span>{t('desktop.delete')}</span>
        </button>
        <span className="tool-sep" />
        {(['large', 'small', 'details'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className="tool-btn"
            aria-pressed={view === mode}
            onClick={() => setView(mode)}
            title={
              mode === 'large'
                ? t('desktop.viewLargeIcons')
                : mode === 'small'
                  ? t('desktop.viewSmallIcons')
                  : t('desktop.viewDetails')
            }
          >
            <Icon id={mode === 'details' ? 'doc-text' : 'folder'} size={16} />
          </button>
        ))}
      </div>

      <div className="explorer-address">
        <span className="explorer-address-label">{t('common.location')}</span>
        <div className="explorer-path field">
          {ancestors.map((node, index) => (
            <span key={node.id} className="explorer-path-segment">
              {index > 0 && <span className="explorer-path-sep">\</span>}
              <button type="button" className="explorer-path-button" onClick={() => navigate(node.id)}>
                {nodeDisplayName(node, t)}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="explorer-body">
        <div
          ref={surfaceRef}
          className={`explorer-surface client w95-scroll explorer-surface--${view}`}
          tabIndex={0}
          role="listbox"
          aria-multiselectable="true"
          aria-label={folder ? nodeDisplayName(folder, t) : t('app.explorer')}
          onPointerDown={beginMarquee}
          onContextMenu={(event) => {
            if (event.target !== event.currentTarget) return;
            event.preventDefault();
            openMenu({
              entries: [
                { kind: 'submenu', id: 'new', label: t('desktop.new'), items: [
                  { kind: 'item', id: 'new-folder', label: t('desktop.newFolder'), onSelect: () => void createFolder() },
                  { kind: 'item', id: 'new-doc', label: t('desktop.newDocument'), onSelect: () => void createDocument() },
                ] },
                { kind: 'item', id: 'import', label: t('menu.import'), onSelect: () => fileInputRef.current?.click() },
                menuSeparator('sep'),
                { kind: 'item', id: 'paste', label: t('desktop.paste'), disabled: !clipboard, onSelect: () => void paste(folderId) },
                { kind: 'item', id: 'select-all', label: t('desktop.selectAll'), onSelect: () => setSelected(items.map((item) => item.id)) },
              ],
              x: event.clientX,
              y: event.clientY,
            });
          }}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes('Files')) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event) => {
            if (!event.dataTransfer.files.length) return;
            event.preventDefault();
            void importFiles([...event.dataTransfer.files]);
          }}
        >
          {view === 'details' ? (
            <table className="explorer-details">
              <thead>
                <tr>
                  {(
                    [
                      ['name', t('common.name')],
                      ['size', t('common.size')],
                      ['type', t('common.type')],
                      ['date', t('common.date')],
                    ] as Array<[SortKey, string]>
                  ).map(([key, label]) => (
                    <th key={key} scope="col">
                      <button
                        type="button"
                        className="explorer-sort"
                        onClick={() =>
                          setSort((current) =>
                            current.key === key
                              ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
                              : { key, dir: 'asc' },
                          )
                        }
                      >
                        {label}
                        {sort.key === key && (
                          <span className={sort.dir === 'desc' ? 'explorer-sort-arrow explorer-sort-arrow--down' : 'explorer-sort-arrow'}>
                            <TriangleDown />
                          </span>
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((node) => (
                  <tr
                    key={node.id}
                    className="explorer-details-row"
                    data-selected={selected.includes(node.id) || undefined}
                  >
                    <td>
                      <button
                        type="button"
                        className="explorer-details-name"
                        onClick={(event) => select(node.id, event)}
                        onDoubleClick={() => void openItems([node])}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          if (!selected.includes(node.id)) select(node.id, { ctrlKey: false, shiftKey: false });
                          openMenu({ entries: itemMenu(node), x: event.clientX, y: event.clientY });
                        }}
                      >
                        <Icon id={iconForNode(node)} size={16} />
                        <span>{nodeDisplayName(node, t)}</span>
                      </button>
                    </td>
                    <td>{node.kind === 'folder' ? '' : formatBytes(node.size)}</td>
                    <td>{nodeTypeLabel(node, t)}</td>
                    <td>{formatDateTime(node.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            items.map((node) => (
              <button
                key={node.id}
                type="button"
                role="option"
                aria-selected={selected.includes(node.id)}
                data-node-id={node.id}
                data-folder-id={node.kind === 'folder' && !isBin ? node.id : undefined}
                className={`explorer-item explorer-item--${view}`}
                data-selected={selected.includes(node.id) || undefined}
                data-drop-target={dropTargetId === node.id || undefined}
                style={dragging ? { opacity: dragging.ids.includes(node.id) ? 0.6 : 1 } : undefined}
                onPointerDown={(event) => beginItemDrag(event, node)}
                onClick={(event) => select(node.id, event)}
                onDoubleClick={() => void openItems([node])}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (!selected.includes(node.id)) select(node.id, { ctrlKey: false, shiftKey: false });
                  openMenu({ entries: itemMenu(node), x: event.clientX, y: event.clientY });
                }}
              >
                <Icon id={iconForNode(node)} size={view === 'large' ? 32 : 16} />
                <span className="explorer-item-label">{nodeDisplayName(node, t)}</span>
                {view === 'small' && <span className="u-muted explorer-item-type">{nodeTypeLabel(node, t)}</span>}
              </button>
            ))
          )}

          {marquee && (
            <div
              className="marquee"
              style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }}
            />
          )}

          {items.length === 0 && <p className="explorer-empty">{t('explorer.empty')}</p>}
        </div>
      </div>

      <StatusBar
        grip
        panels={[
          {
            id: 'count',
            width: 180,
            content:
              selectedNodes.length > 0
                ? t('a11y.selectedItems', { count: selectedNodes.length })
                : t('common.items', { count: items.length }),
          },
          {
            id: 'size',
            width: 140,
            content: selectedNodes.length > 0 ? formatBytes(totalSize) : '',
          },
          { id: 'path', content: vfs.pathOf(folderId)?.path ?? '' },
        ]}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files ? [...event.target.files] : [];
          if (files.length) void importFiles(files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
