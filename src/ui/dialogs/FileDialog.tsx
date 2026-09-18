import { useEffect, useMemo, useRef, useState } from 'react';
import type { FileDialogOptions, FileDialogResult } from '../../core/dialogs/types';
import { useVfs } from '../../core/fs/VfsProvider';
import { ROOT_ID, type FsNode } from '../../core/fs/types';
import { formatBytes, isValidName } from '../../core/fs/vfsUtils';
import { useI18n } from '../../core/i18n/I18nProvider';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { Select } from '../Select';
import { iconForNode, nodeDisplayName, nodeTypeLabel } from '../../core/fs/display';

type FileDialogView = 'list' | 'details';

/**
 * File picker of the shell. The layout follows the old common dialog: a
 * location combo, a small navigation/view toolbar, a list, then name/type
 * fields. The name field is authoritative when opening, just as it is when
 * saving, so typing a filename cannot accidentally open an older selection.
 */
export function FileDialog({
  options,
  onResult,
}: {
  options: FileDialogOptions;
  onResult: (result: FileDialogResult | null) => void;
}) {
  const { t, locale, formatDateTime } = useI18n();
  const vfs = useVfs();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const documentsFolder =
    vfs.folders.documents ??
    vfs.folders.portfolio ??
    [...vfs.nodes.values()].find((node) => node.parentId === null)?.id ??
    '';
  const [folderId, setFolderId] = useState(options.startFolderId ?? documentsFolder);
  const [fileName, setFileName] = useState(options.fileName ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filterIndex, setFilterIndex] = useState(0);
  const [view, setView] = useState<FileDialogView>('list');
  const [error, setError] = useState<string | null>(null);

  const filters = options.filters ?? [];
  const activeFilter = filters[filterIndex];
  const folder = vfs.nodeById(folderId);

  const collator = useMemo(() => new Intl.Collator(locale, { sensitivity: 'base', numeric: true }), [locale]);

  const children = useMemo(() => {
    const items = vfs.liveChildren(folderId);
    const visible = activeFilter
      ? items.filter((node) => {
          return node.kind === 'folder' || activeFilter.test(node.name);
        })
      : items;
    return [...visible].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return collator.compare(nodeDisplayName(a, t), nodeDisplayName(b, t));
    });
  }, [activeFilter, collator, folderId, t, vfs]);

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

  const selected = selectedId ? vfs.nodeById(selectedId) : undefined;

  const navigate = (targetId: string) => {
    if (!vfs.nodeById(targetId)) return;
    setFolderId(targetId);
    setSelectedId(null);
    setSelectedIndex(-1);
    setError(null);
  };

  const selectNode = (node: FsNode, index: number) => {
    setSelectedId(node.id);
    setSelectedIndex(index);
    if (node.kind === 'file') setFileName(node.name);
    setError(null);
  };

  const moveSelection = (index: number) => {
    if (!children.length) return;
    const nextIndex = Math.max(0, Math.min(children.length - 1, index));
    const node = children[nextIndex];
    if (!node) return;
    selectNode(node, nextIndex);
    listRef.current?.querySelector<HTMLElement>(`[data-file-id="${node.id}"]`)?.focus();
  };

  const findFileByName = (enteredName: string): FsNode | undefined => {
    const normalized = enteredName.trim();
    if (!normalized) return undefined;

    const matchesName = (candidate: FsNode, value: string): boolean =>
      candidate.kind === 'file' &&
      (!activeFilter || activeFilter.test(candidate.name)) &&
      (candidate.name.toLocaleLowerCase() === value.toLocaleLowerCase() ||
        nodeDisplayName(candidate, t).toLocaleLowerCase() === value.toLocaleLowerCase());

    if (!/[\\/]/.test(normalized)) return children.find((candidate) => matchesName(candidate, normalized));

    const segments = normalized
      .split(/[\\/]+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (segments[0]?.toLocaleLowerCase() === 'c:') segments.shift();
    let currentId = ROOT_ID;
    for (const segment of segments) {
      const next = vfs.liveChildren(currentId).find(
        (candidate) =>
          candidate.name.toLocaleLowerCase() === segment.toLocaleLowerCase() ||
          nodeDisplayName(candidate, t).toLocaleLowerCase() === segment.toLocaleLowerCase(),
      );
      if (!next) return undefined;
      currentId = next.id;
    }
    const resolved = vfs.nodeById(currentId);
    const leaf = segments[segments.length - 1];
    return resolved && leaf && matchesName(resolved, leaf) ? resolved : undefined;
  };

  const accept = () => {
    if (options.mode === 'open') {
      const candidate = findFileByName(fileName);
      if (!candidate) {
        setError(t('common.none'));
        return;
      }
      onResult({ folderId: candidate.parentId ?? folderId, name: candidate.name, node: candidate });
      return;
    }

    const name = fileName.trim();
    if (!name) {
      setError(t('dialog.nameRequired'));
      return;
    }
    if (!isValidName(name)) {
      setError(t('dialog.invalidName'));
      return;
    }
    onResult({ folderId, name });
  };

  const createFolder = async () => {
    const created = await vfs.createFolder(folderId);
    if (!created) return;
    selectNode(created, children.length);
  };

  useEffect(() => {
    nameRef.current?.focus({ preventScroll: true });
    nameRef.current?.select();
  }, []);

  return (
    <Dialog
      title={options.title ?? (options.mode === 'open' ? t('desktop.open') : t('common.save'))}
      icon={options.itemIcon ?? 'folder-open'}
      width={520}
      onClose={() => onResult(null)}
      buttons={
        <>
          <Button primary onClick={accept}>
            {options.mode === 'open' ? t('desktop.open') : t('common.save')}
          </Button>
          <Button onClick={() => onResult(null)}>{t('common.cancel')}</Button>
        </>
      }
    >
      <div className="dialog-message file-dialog">
        <div className="file-dialog-row file-dialog-location">
          <span className="field-label">{t('common.location')}:</span>
          <Select
            ariaLabel={t('common.location')}
            className="u-grow"
            value={folderId}
            options={ancestors.map((node) => ({ value: node.id, label: vfs.pathOf(node.id)?.path ?? node.name }))}
            onChange={navigate}
          />
        </div>

        <div className="toolbar file-dialog-toolbar">
          <button
            type="button"
            className="tool-btn"
            onClick={() => folder?.parentId && navigate(folder.parentId)}
            disabled={!folder?.parentId}
            title={t('menu.up')}
          >
            <Icon id="nav-up" size={16} />
            <span>{t('menu.up')}</span>
          </button>
          <button type="button" className="tool-btn" onClick={() => void createFolder()} title={t('desktop.newFolder')}>
            <Icon id="folder" size={16} />
            <span>{t('desktop.newFolder')}</span>
          </button>
          <span className="tool-sep" />
          <button
            type="button"
            className="tool-btn"
            aria-pressed={view === 'list'}
            aria-label={t('desktop.viewList')}
            onClick={() => setView('list')}
            title={t('desktop.viewList')}
          >
            <Icon id="view-list" size={16} />
          </button>
          <button
            type="button"
            className="tool-btn"
            aria-pressed={view === 'details'}
            aria-label={t('desktop.viewDetails')}
            onClick={() => setView('details')}
            title={t('desktop.viewDetails')}
          >
            <Icon id="view-details" size={16} />
          </button>
        </div>

        <div
          ref={listRef}
          className={`file-dialog-list w95-scroll file-dialog-list--${view}`}
          role="listbox"
          aria-label={t('common.name')}
          tabIndex={0}
          onKeyDown={(event) => {
            switch (event.key) {
              case 'ArrowDown':
              case 'ArrowRight':
                event.preventDefault();
                moveSelection(selectedIndex < 0 ? 0 : selectedIndex + 1);
                break;
              case 'ArrowUp':
              case 'ArrowLeft':
                event.preventDefault();
                moveSelection(selectedIndex < 0 ? children.length - 1 : selectedIndex - 1);
                break;
              case 'Home':
                event.preventDefault();
                moveSelection(0);
                break;
              case 'End':
                event.preventDefault();
                moveSelection(children.length - 1);
                break;
              case 'Enter':
                event.preventDefault();
                if (selected?.kind === 'folder') navigate(selected.id);
                else accept();
                break;
              case 'Backspace':
                event.preventDefault();
                if (folder?.parentId) navigate(folder.parentId);
                break;
              default:
                break;
            }
          }}
        >
          {children.map((node, index) => (
            <button
              key={node.id}
              type="button"
              role="option"
              aria-selected={node.id === selectedId}
              data-file-id={node.id}
              className="file-dialog-entry"
              data-selected={node.id === selectedId || undefined}
              onClick={() => selectNode(node, index)}
              onDoubleClick={() => {
                if (node.kind === 'folder') navigate(node.id);
                else onResult({ folderId: node.parentId ?? folderId, name: node.name, node });
              }}
            >
              <Icon id={iconForNode(node)} size={16} shortcut={Boolean(node.shortcut)} />
              <span className="file-dialog-entry-name">{nodeDisplayName(node, t)}</span>
              {view === 'details' && (
                <>
                  <span className="file-dialog-entry-type">{nodeTypeLabel(node, t)}</span>
                  <span className="file-dialog-entry-size">{node.kind === 'folder' ? '' : formatBytes(node.size)}</span>
                  <span className="file-dialog-entry-date">{formatDateTime(node.updatedAt)}</span>
                </>
              )}
            </button>
          ))}
          {children.length === 0 && <p className="explorer-empty">{t('explorer.empty')}</p>}
        </div>

        <div className="file-dialog-row">
          <label className="field-label" htmlFor="file-dialog-name">
            {t('common.name')}:
          </label>
          <input
            ref={nameRef}
            id="file-dialog-name"
            className="field u-grow"
            value={fileName}
            onChange={(event) => {
              setFileName(event.target.value);
              setSelectedId(null);
              setSelectedIndex(-1);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                accept();
              }
            }}
          />
        </div>

        {filters.length > 0 && (
          <div className="file-dialog-row">
            <label className="field-label" htmlFor="file-dialog-type">
              {t('common.type')}:
            </label>
            <Select
              ariaLabel={t('common.type')}
              className="u-grow"
              value={String(filterIndex)}
              options={filters.map((filter, index) => ({ value: String(index), label: filter.label }))}
              onChange={(value) => {
                setFilterIndex(Number(value));
                setSelectedId(null);
                setSelectedIndex(-1);
              }}
            />
          </div>
        )}

        {error && <p className="dialog-error">{error}</p>}
        <p className="file-dialog-path u-muted">{vfs.pathOf(folderId)?.path ?? ''}</p>
      </div>
    </Dialog>
  );
}
