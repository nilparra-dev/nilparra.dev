import { useMemo } from 'react';
import type { IconId } from '../../assets/generated/icons';
import { useAppLauncher } from '../apps/launcher';
import { useDialogs } from '../dialogs/DialogProvider';
import { iconForNode, nodeDisplayName } from '../fs/display';
import { useClipboardActions, useFileOpener } from '../fs/useFileOpener';
import { useVfs } from '../fs/VfsProvider';
import { ROOT_ID, type FsNode } from '../fs/types';
import { shortcutKey } from '../fs/seedSync';
import { isValidName } from '../fs/vfsUtils';
import { useI18n } from '../i18n/I18nProvider';
import type { MenuEntry } from '../../ui/menu/types';
import { menuSeparator } from '../../ui/menu/types';

/**
 * Reading order of the desktop: the personal shortcuts lead (about, projects,
 * the CV, contact), then the profile links, then other app shortcuts (such as
 * the welcome shortcut older disks still keep) and whatever the visitor puts
 * on the desktop. The system items close the list so the portfolio is what the
 * eye lands on first.
 */
const PERSONAL_SHORTCUTS = ['app:about', 'app:projects', 'cv', 'app:mail'];

function desktopRank(node: FsNode): number {
  const target = node.shortcut;
  const base = PERSONAL_SHORTCUTS.length;
  if (target) {
    const index = PERSONAL_SHORTCUTS.indexOf(shortcutKey(target));
    if (index >= 0) return index;
    if (target.type === 'url') return base;
    if (target.type === 'app') return base + 1;
  }
  return node.kind === 'folder' ? base + 2 : base + 3;
}

/**
 * One item shown on the desktop: the classic system items (My Computer and the
 * Recycle Bin) plus everything inside C:\Desktop, which is what makes a file
 * saved from Notepad appear on the desktop.
 */
export interface DesktopItem {
  /** Stable id, never derived from the label (see iconLayout). */
  id: string;
  label: string;
  icon: IconId;
  open: () => void;
  menu: () => MenuEntry[];
  /** System items cannot be renamed, deleted or dragged to the bin. */
  protectedItem?: boolean;
  node?: FsNode;
}

export function useDesktopItems(): DesktopItem[] {
  const { t, locale } = useI18n();
  const vfs = useVfs();
  const launch = useAppLauncher();
  const openNode = useFileOpener();
  const dialogs = useDialogs();
  const { cut, copy, trash } = useClipboardActions();
  const desktopFolderId = vfs.folders.desktop;
  const binIsEmpty = vfs.binItems().length === 0;

  return useMemo<DesktopItem[]>(() => {
    const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });

    const systemItems: DesktopItem[] = [
      {
        id: 'system:computer',
        label: t('app.myComputer'),
        icon: 'computer',
        protectedItem: true,
        open: () =>
          launch({ appId: 'explorer', params: { folderId: ROOT_ID, myComputer: true }, title: t('app.myComputer') }),
        menu: () => [
          {
            kind: 'item',
            id: 'open',
            label: t('desktop.open'),
            iconId: 'computer',
            onSelect: () =>
              launch({ appId: 'explorer', params: { folderId: ROOT_ID, myComputer: true }, title: t('app.myComputer') }),
          },
          menuSeparator('sep'),
          {
            kind: 'item',
            id: 'properties',
            label: t('desktop.properties'),
            onSelect: () => launch({ appId: 'sysinfo' }),
          },
        ],
      },
      {
        id: 'system:recyclebin',
        label: t('app.recycleBin'),
        icon: binIsEmpty ? 'recycle-empty' : 'recycle-full',
        protectedItem: true,
        open: () => launch({ appId: 'recyclebin' }),
        menu: () => [
          { kind: 'item', id: 'open', label: t('desktop.open'), iconId: 'recycle-full', onSelect: () => launch({ appId: 'recyclebin' }) },
          {
            kind: 'item',
            id: 'empty',
            label: t('recycle.empty'),
            disabled: binIsEmpty,
            onSelect: () => launch({ appId: 'recyclebin' }),
          },
        ],
      },
    ];

    if (!desktopFolderId) return systemItems;

    const fileItems: DesktopItem[] = [...vfs.liveChildren(desktopFolderId)]
      .sort((a, b) => {
        const rank = desktopRank(a) - desktopRank(b);
        if (rank !== 0) return rank;
        if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
        return collator.compare(nodeDisplayName(a, t), nodeDisplayName(b, t));
      })
      .map((node) => ({
        id: `node:${node.id}`,
        label: nodeDisplayName(node, t),
        icon: iconForNode(node),
        node,
        open: () => void openNode(node),
        menu: (): MenuEntry[] => {
          const entries: MenuEntry[] = [
            { kind: 'item', id: 'open', label: t('desktop.open'), iconId: iconForNode(node), onSelect: () => void openNode(node) },
            menuSeparator('sep1'),
            {
              kind: 'item',
              id: 'cut',
              label: t('desktop.cut'),
              disabled: node.readonly,
              onSelect: () => cut([node]),
            },
            { kind: 'item', id: 'copy', label: t('desktop.copy'), onSelect: () => copy([node]) },
          ];
          if (node.kind === 'file') {
            entries.push({
              kind: 'item',
              id: 'export',
              label: t('menu.export'),
              onSelect: () => void vfs.exportNode(node.id),
            });
          }
          entries.push(menuSeparator('sep2'));
          entries.push({
            kind: 'item',
            id: 'rename',
            label: t('desktop.rename'),
            disabled: node.readonly,
            onSelect: () => {
              void (async () => {
                const name = await dialogs.prompt({
                  title: t('desktop.rename'),
                  label: t('common.name'),
                  initialValue: node.name,
                  validate: (value) => {
                    if (!value.trim()) return t('dialog.nameRequired');
                    if (!isValidName(value)) return t('dialog.invalidName');
                    if (vfs.validateName(node.parentId ?? desktopFolderId, value, node.id) === 'taken') {
                      return t('dialog.nameInUse', { name: value });
                    }
                    return null;
                  },
                });
                if (name && name !== node.name) await vfs.rename(node.id, name);
              })();
            },
          });
          entries.push({
            kind: 'item',
            id: 'delete',
            label: t('desktop.delete'),
            disabled: node.readonly,
            onSelect: () => void trash([node]),
          });
          entries.push({
            kind: 'item',
            id: 'properties',
            label: t('desktop.properties'),
            onSelect: () => void dialogs.properties(node),
          });
          return entries;
        },
      }));

    return [...fileItems, ...systemItems];
  }, [
    binIsEmpty,
    copy,
    cut,
    desktopFolderId,
    dialogs,
    launch,
    locale,
    openNode,
    t,
    trash,
    vfs,
  ]);
}
