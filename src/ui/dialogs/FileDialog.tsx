import { useMemo, useState } from 'react';
import type { FileDialogOptions, FileDialogResult } from '../../core/dialogs/types';
import { useVfs } from '../../core/fs/VfsProvider';
import type { FsNode } from '../../core/fs/types';
import { isValidName } from '../../core/fs/vfsUtils';
import { useI18n } from '../../core/i18n/I18nProvider';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { Select } from '../Select';
import { iconForNode, nodeDisplayName, nodeTypeLabel } from '../../core/fs/display';

/**
 * File picker of the shell: location list, contents, name field and file type
 * filter. Browsing uses the real virtual disk, so it always matches what the
 * Explorer shows.
 */
export function FileDialog({
  options,
  onResult,
}: {
  options: FileDialogOptions;
  onResult: (result: FileDialogResult | null) => void;
}) {
  const { t, locale } = useI18n();
  const vfs = useVfs();

  const documentsFolder =
    vfs.folders.documents ?? vfs.folders.portfolio ?? [...vfs.nodes.values()].find((node) => node.parentId === null)?.id ?? '';
  const [folderId, setFolderId] = useState(options.startFolderId ?? documentsFolder);
  const [fileName, setFileName] = useState(options.fileName ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterIndex, setFilterIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const filters = options.filters ?? [];
  const activeFilter = filters[filterIndex];

  const collator = useMemo(() => new Intl.Collator(locale, { sensitivity: 'base', numeric: true }), [locale]);

  const children = useMemo(() => {
    const items = vfs.liveChildren(folderId);
    const visible = activeFilter
      ? items.filter((node) => node.kind === 'folder' || activeFilter.test(node.name))
      : items;
    return [...visible].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return collator.compare(nodeDisplayName(a, t), nodeDisplayName(b, t));
    });
  }, [activeFilter, collator, folderId, t, vfs]);

  const path = vfs.pathOf(folderId);

  const ancestors = useMemo(() => {
    const result: FsNode[] = [];
    let current = vfs.nodeById(folderId);
    let guard = 0;
    while (current && guard < 32) {
      result.unshift(current);
      current = current.parentId ? vfs.nodeById(current.parentId) : undefined;
      guard += 1;
    }
    return result;
  }, [folderId, vfs]);

  const selected = selectedId ? vfs.nodeById(selectedId) : undefined;

  const accept = () => {
    if (options.mode === 'open') {
      if (!selected || selected.kind !== 'file') {
        setError(t('common.none'));
        return;
      }
      onResult({ folderId: selected.parentId ?? folderId, name: selected.name, node: selected });
      return;
    }
    const name = fileName.trim();
    if (!name) {
      setError(t('dialog.nameRequired'));
      return;
    }
    if (options.mode === 'save' && !isValidName(name)) {
      setError(t('dialog.invalidName'));
      return;
    }
    // Saving may overwrite: the caller asks for confirmation when the name is
    // already taken, which is how the original Save As dialog behaved.
    onResult({ folderId, name });
  };

  return (
    <Dialog
      title={options.title ?? (options.mode === 'open' ? t('common.ok') : t('common.save'))}
      icon={options.itemIcon ?? 'folder-open'}
      width={470}
      onClose={() => onResult(null)}
      buttons={
        <>
          <Button primary onClick={accept}>
            {t('common.ok')}
          </Button>
          <Button onClick={() => onResult(null)}>{t('common.cancel')}</Button>
        </>
      }
    >
      <div className="dialog-message file-dialog">
        <div className="file-dialog-row">
          <span className="field-label">{t('common.location')}:</span>
          <Select
            ariaLabel={t('common.location')}
            className="u-grow"
            value={folderId}
            options={ancestors.map((node) => ({ value: node.id, label: vfs.pathOf(node.id)?.path ?? node.name }))}
            onChange={(value) => {
              setFolderId(value);
              setSelectedId(null);
            }}
          />
        </div>

        <ul className="list-view w95-scroll file-dialog-list" role="listbox" aria-label={t('common.name')}>
          {children.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                role="option"
                aria-selected={node.id === selectedId}
                className="list-row"
                data-selected={node.id === selectedId || undefined}
                onClick={() => {
                  setSelectedId(node.kind === 'file' ? node.id : null);
                  if (node.kind === 'file') setFileName(node.name);
                }}
                onDoubleClick={() => {
                  if (node.kind === 'folder') {
                    setFolderId(node.id);
                    setSelectedId(null);
                  } else {
                    setSelectedId(node.id);
                    onResult({ folderId: node.parentId ?? folderId, name: node.name, node });
                  }
                }}
              >
                <Icon id={iconForNode(node)} size={16} />
                <span className="u-grow">{nodeDisplayName(node, t)}</span>
                <span className="u-muted">{nodeTypeLabel(node, t)}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="file-dialog-row">
          <span className="field-label">{t('common.name')}:</span>
          <input
            className="field u-grow"
            value={fileName}
            onChange={(event) => {
              setFileName(event.target.value);
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
            <span className="field-label">{t('common.type')}:</span>
            <Select
              ariaLabel={t('common.type')}
              className="u-grow"
              value={String(filterIndex)}
              options={filters.map((filter, index) => ({ value: String(index), label: filter.label }))}
              onChange={(value) => setFilterIndex(Number(value))}
            />
          </div>
        )}

        {error && <p className="dialog-error">{error}</p>}
        <p className="file-dialog-path u-muted">{path?.path ?? ''}</p>
      </div>
    </Dialog>
  );
}
