import { useMemo, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { useVfs } from '../../core/fs/VfsProvider';
import { iconForNode, nodeDisplayName, nodeTypeLabel } from '../../core/fs/display';
import { formatBytes } from '../../core/fs/vfsUtils';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { StatusBar } from '../../ui/StatusBar';
import { useMenuLayer } from '../../ui/menu/MenuLayer';
import { menuSeparator } from '../../ui/menu/types';

/**
 * Recycle Bin: the items that were sent here keep their original location, so
 * they can be restored or destroyed.
 */
export function RecycleBinApp({ windowId }: AppRenderProps) {
  const { t, formatDateTime } = useI18n();
  const vfs = useVfs();
  const dialogs = useDialogs();
  const wm = useWindowManager();
  const { open: openMenu } = useMenuLayer();
  const [selected, setSelected] = useState<string[]>([]);

  const items = useMemo(
    () => [...vfs.binItems()].sort((a, b) => b.updatedAt - a.updatedAt),
    [vfs],
  );

  const selectedNodes = items.filter((node) => selected.includes(node.id));

  const restore = async () => {
    if (!selectedNodes.length) return;
    await vfs.restore(selectedNodes.map((node) => node.id));
    setSelected([]);
  };

  const empty = async () => {
    if (!items.length) return;
    const confirmed = await dialogs.confirm({
      title: t('app.recycleBin'),
      kind: 'warning',
      message: t('dialog.confirmEmptyBin', { count: items.length }),
    });
    if (confirmed) {
      await vfs.emptyBin();
      setSelected([]);
    }
  };

  const destroy = async () => {
    if (!selectedNodes.length) return;
    const confirmed = await dialogs.confirm({
      title: t('desktop.delete'),
      kind: 'warning',
      message: t('dialog.confirmDeleteMany', { count: selectedNodes.length }),
    });
    if (confirmed) {
      await vfs.destroy(selectedNodes.map((node) => node.id));
      setSelected([]);
    }
  };

  return (
    <div className="app-bin">
      <div className="toolbar">
        <Button size="small" onClick={() => void restore()} disabled={!selectedNodes.length}>
          {t('recycle.restore')}
        </Button>
        <Button size="small" onClick={() => void empty()} disabled={!items.length}>
          {t('recycle.empty')}
        </Button>
        <span className="tool-sep" />
        <Button size="small" onClick={() => void destroy()} disabled={!selectedNodes.length}>
          {t('desktop.delete')}
        </Button>
      </div>

      <p className="bin-hint">{t('recycle.hint')}</p>

      <ul
        className="list-view w95-scroll bin-list"
        role="listbox"
        aria-multiselectable="true"
        aria-label={t('app.recycleBin')}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Delete') {
            event.preventDefault();
            void destroy();
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            void restore();
          }
        }}
      >
        {items.map((node) => {
          const origin = node.deletedFromParentId ? vfs.pathOf(node.deletedFromParentId)?.path : '';
          return (
            <li key={node.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected.includes(node.id)}
                className="list-row bin-row"
                data-selected={selected.includes(node.id) || undefined}
                onClick={(event) => {
                  setSelected((current) =>
                    event.ctrlKey || event.metaKey
                      ? current.includes(node.id)
                        ? current.filter((id) => id !== node.id)
                        : [...current, node.id]
                      : [node.id],
                  );
                  wm.focus(windowId);
                }}
                onDoubleClick={() => void restore()}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (!selected.includes(node.id)) setSelected([node.id]);
                  openMenu({
                    entries: [
                      { kind: 'item', id: 'restore', label: t('recycle.restore'), onSelect: () => void restore() },
                      { kind: 'item', id: 'destroy', label: t('desktop.delete'), onSelect: () => void destroy() },
                      menuSeparator('sep'),
                      { kind: 'item', id: 'properties', label: t('desktop.properties'), onSelect: () => void dialogs.properties(node) },
                    ],
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
              >
                <Icon id={iconForNode(node)} size={16} shortcut={Boolean(node.shortcut)} />
                <span className="u-grow">{nodeDisplayName(node, t)}</span>
                <span className="u-muted bin-row-type">{nodeTypeLabel(node, t)}</span>
                <span className="u-muted bin-row-origin">{origin}</span>
                <span className="u-muted bin-row-size">{formatBytes(node.size)}</span>
                <span className="u-muted bin-row-date">{formatDateTime(node.updatedAt)}</span>
              </button>
            </li>
          );
        })}
        {items.length === 0 && <li className="bin-empty">{t('explorer.empty')}</li>}
      </ul>

      <StatusBar
        grip
        panels={[
          {
            id: 'count',
            content:
              selectedNodes.length > 0
                ? t('a11y.selectedItems', { count: selectedNodes.length })
                : t('common.items', { count: items.length }),
          },
        ]}
      />
    </div>
  );
}
