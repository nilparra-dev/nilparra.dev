import { useCallback } from 'react';
import { useT } from '../i18n/I18nProvider';
import { useAppLauncher } from '../apps/launcher';
import { appNameKey } from '../apps/catalog';
import { useVfs } from './VfsProvider';
import { appForNode, nodeDisplayName } from './display';
import { getClipboard, setClipboard } from './clipboard';
import type { FsNode } from './types';
import { useDialogs } from '../dialogs/DialogProvider';

/**
 * Opens a node with the application associated with its type (folders open in
 * Explorer, shortcuts follow their target) and resolves the "nothing is
 * associated" case by offering to export the file.
 */
export function useFileOpener() {
  const vfs = useVfs();
  const launch = useAppLauncher();
  const t = useT();
  const dialogs = useDialogs();

  return useCallback(
    async (node: FsNode) => {
      if (node.kind === 'folder') {
        launch({
          appId: 'explorer',
          params: { folderId: node.id },
          title: nodeDisplayName(node, t),
          docKey: `explorer:${node.id}`,
        });
        return;
      }

      if (node.shortcut) {
        const target = node.shortcut;
        if (target.type === 'app') {
          launch({ appId: target.appId });
          return;
        }
        if (target.type === 'url') {
          window.open(target.url, '_blank', 'noopener,noreferrer');
          return;
        }
        const linked = vfs.nodeById(target.nodeId);
        if (linked) {
          launch({
            appId: 'explorer',
            params: { folderId: linked.id },
            title: nodeDisplayName(linked, t),
            docKey: `explorer:${linked.id}`,
          });
          return;
        }
        await dialogs.alert({
          title: t('dialog.errorTitle'),
          kind: 'error',
          message: t('dialog.fileNotFound', { name: node.name }),
        });
        return;
      }

      const appId = appForNode(node);
      if (!appId) {
        const exportIt = await dialogs.confirm({
          title: t('desktop.openWith'),
          kind: 'question',
          message: t('file.unknown'),
          detail: node.name,
        });
        if (exportIt) await vfs.exportNode(node.id);
        return;
      }

      launch({
        appId,
        params: { fileId: node.id },
        title: `${node.name} - ${t(appNameKey(appId) ?? 'app.explorer')}`,
        docKey: `${appId}:${node.id}`,
      });
    },
    [dialogs, launch, t, vfs],
  );
}

/**
 * Copies or cuts nodes into the shell clipboard; pasting is a move for cut
 * items and a deep copy for copied ones.
 */
export function useClipboardActions() {
  const vfs = useVfs();
  const t = useT();
  const dialogs = useDialogs();

  const cut = useCallback((nodes: FsNode[]) => {
    if (!nodes.length) return;
    setClipboard({ mode: 'cut', ids: nodes.map((node) => node.id), sourceParentId: nodes[0].parentId });
  }, []);

  const copy = useCallback((nodes: FsNode[]) => {
    if (!nodes.length) return;
    setClipboard({ mode: 'copy', ids: nodes.map((node) => node.id), sourceParentId: nodes[0].parentId });
  }, []);

  const paste = useCallback(
    async (targetParentId: string) => {
      const clipboard = getClipboard();
      if (!clipboard || !clipboard.ids.length) return false;
      const target = vfs.nodeById(targetParentId);
      if (!target || target.kind !== 'folder') return false;
      const ok =
        clipboard.mode === 'cut'
          ? await vfs.move(clipboard.ids, targetParentId)
          : await vfs.copy(clipboard.ids, targetParentId);
      if (ok && clipboard.mode === 'cut') setClipboard(null);
      return ok;
    },
    [vfs],
  );

  const trash = useCallback(
    async (nodes: FsNode[]) => {
      const deletable = nodes.filter((node) => !node.readonly && node.origin !== 'system');
      if (!deletable.length) {
        await dialogs.alert({
          title: t('dialog.errorTitle'),
          kind: 'warning',
          message: t('dialog.cannotDeleteSystem'),
        });
        return false;
      }
      const confirmed = await dialogs.confirm({
        title: t('desktop.delete'),
        kind: 'question',
        message:
          deletable.length === 1
            ? t('dialog.confirmDelete', { name: deletable[0].name })
            : t('dialog.confirmDeleteMany', { count: deletable.length }),
      });
      if (!confirmed) return false;
      return vfs.trash(deletable.map((node) => node.id));
    },
    [dialogs, t, vfs],
  );

  return { cut, copy, paste, trash };
}
