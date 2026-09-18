import { useVfs } from '../../core/fs/VfsProvider';
import { nodeTypeLabel } from '../../core/fs/display';
import type { FsNode } from '../../core/fs/types';
import { formatBytes, folderSize } from '../../core/fs/vfsUtils';
import { useI18n } from '../../core/i18n/I18nProvider';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { iconForNode, nodeDisplayName } from '../../core/fs/display';

/** Properties sheet: the real data of the node, nothing invented. */
export function PropertiesDialog({ node, onClose }: { node: FsNode; onClose: () => void }) {
  const { t, formatDateTime } = useI18n();
  const vfs = useVfs();

  const location = node.parentId ? vfs.pathOf(node.parentId)?.path ?? '' : '';
  const size = node.kind === 'folder' ? folderSize(vfs.nodes, node.id) : node.size;

  const rows: Array<[string, string]> = [
    [t('common.name'), nodeDisplayName(node, t)],
    [t('common.type'), nodeTypeLabel(node, t)],
    [t('common.location'), location],
    [t('common.size'), node.kind === 'folder' ? formatBytes(size) : formatBytes(node.size)],
    ['', ''],
    [t('common.date'), formatDateTime(node.updatedAt)],
  ];

  return (
    <Dialog
      title={`${nodeDisplayName(node, t)} — ${t('desktop.properties')}`}
      icon="system-properties"
      width={430}
      onClose={onClose}
      buttons={<Button primary onClick={onClose}>{t('common.ok')}</Button>}
    >
      <div className="dialog-message properties-dialog">
        <div className="properties-head">
          <Icon id={iconForNode(node)} size={32} shortcut={Boolean(node.shortcut)} />
          <div className="u-grow">
            <p className="u-selectable properties-name">{node.name}</p>
            <p className="u-muted u-selectable">{t('desktop.properties')}</p>
          </div>
        </div>
        <dl className="properties-grid">
          {rows.map(([label, value], index) =>
            label === '' ? (
              <div key={index} className="properties-sep" />
            ) : (
              <div key={label} className="properties-row">
                <dt>{label}</dt>
                <dd className="u-selectable">{value}</dd>
              </div>
            ),
          )}
        </dl>
        <p className="u-muted">
          {node.readonly ? t('dialog.readOnly', { name: node.name }) : node.origin === 'system' ? t('dialog.cannotDeleteSystem') : ''}
        </p>
      </div>
    </Dialog>
  );
}
