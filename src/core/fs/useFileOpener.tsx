import { useCallback } from 'react';
import { useT } from '../i18n/I18nProvider';
import { useAppLauncher } from '../apps/launcher';
import { appNameKey } from '../apps/catalog';
import { useVfs } from './VfsProvider';
import { appForNode, nodeDisplayName } from './display';
import { parseWebUrl } from '../websearch/embed';
import { getClipboard, setClipboard } from './clipboard';
import { ROOT_ID, type FsNode } from './types';
import { useDialogs } from '../dialogs/DialogProvider';

export type OpenTarget =
  | { kind: 'node'; node: FsNode }
  | { kind: 'app'; appId: string }
  | { kind: 'url'; url: string }
  | { kind: 'missing'; node: FsNode }
  | { kind: 'cycle'; node: FsNode };

/** Resolves a shortcut chain without opening anything or recursing forever. */
export function resolveShortcutNode(
  start: FsNode,
  lookup: (id: string) => FsNode | undefined,
): OpenTarget {
  const visited = new Set<string>();
  let current = start;
  while (true) {
    if (visited.has(current.id)) return { kind: 'cycle', node: current };
    visited.add(current.id);
    if (current.kind === 'folder' || !current.shortcut) return { kind: 'node', node: current };
    if (current.shortcut.type === 'app') return { kind: 'app', appId: current.shortcut.appId };
    if (current.shortcut.type === 'url') return { kind: 'url', url: current.shortcut.url };
    const linked = lookup(current.shortcut.nodeId);
    if (!linked) return { kind: 'missing', node: current };
    current = linked;
  }
}

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
      const resolution = resolveShortcutNode(node, vfs.nodeById);
      if (resolution.kind === 'cycle') {
        await dialogs.alert({
          title: t('dialog.errorTitle'),
          kind: 'error',
          message: t('dialog.shortcutLoop', { name: nodeDisplayName(resolution.node, t) }),
        });
        return;
      }
      if (resolution.kind === 'missing') {
        await dialogs.alert({
          title: t('dialog.errorTitle'),
          kind: 'error',
          message: t('dialog.fileNotFound', { name: nodeDisplayName(resolution.node, t) }),
        });
        return;
      }
      if (resolution.kind === 'app') {
        launch({ appId: resolution.appId });
        return;
      }
      if (resolution.kind === 'url') {
        // Web addresses open inside the Internet window; mailto: and other
        // schemes keep going to the real browser or the mail client.
        const url = parseWebUrl(resolution.url);
        if (url) {
          launch({
            appId: 'internet',
            params: { url: url.href },
            title: nodeDisplayName(node, t),
            docKey: `internet:${url.href}`,
          });
          return;
        }
        // Only http(s) reaches the real browser. The stored shortcut could
        // carry any scheme (a tampered IndexedDB record is attacker controlled
        // data): javascript: or data: URLs must never be opened.
        if (/^https?:\/\//i.test(resolution.url)) {
          window.open(resolution.url, '_blank', 'noopener,noreferrer');
          return;
        }
        // The shortcut is stored but points nowhere safe: say so instead of
        // leaving the double click looking broken.
        await dialogs.alert({
          title: t('dialog.errorTitle'),
          kind: 'error',
          message: t('dialog.shortcutUnsafe', { name: nodeDisplayName(node, t) }),
        });
        return;
      }

      const current = resolution.node;
      if (current.kind === 'folder') {
        launch({
          appId: 'explorer',
          params: { folderId: current.id, myComputer: current.id === ROOT_ID },
          title: current.id === ROOT_ID ? t('app.myComputer') : nodeDisplayName(current, t),
          docKey: `explorer:${current.id}`,
        });
        return;
      }

      const appId = appForNode(current);
      if (!appId) {
        const exportIt = await dialogs.confirm({
          title: t('desktop.openWith'),
          kind: 'question',
          message: t('dialog.noAssociation'),
          detail: current.name,
        });
        if (exportIt) await vfs.exportNode(current.id);
        return;
      }

      launch({
        appId,
        params: { fileId: current.id },
        title: `${current.name} - ${t(appNameKey(appId) ?? 'app.explorer')}`,
        docKey: `${appId}:${current.id}`,
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
