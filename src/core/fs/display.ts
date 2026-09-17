/**
 * How a file or folder is presented: icon, visible name (system folders are
 * translated) and type label. Keeps i18n decisions out of the file system
 * itself, whose names and paths are always stable.
 */
import type { IconId } from '../../assets/generated/icons';
import { APP_CATALOG } from '../apps/catalog';
import type { I18nValue } from '../i18n/I18nProvider';
import { ROOT_ID, type FsNode } from './types';
import { iconForName, isTextExtension, extensionOf } from './vfsUtils';

type Translate = I18nValue['t'];

const SYSTEM_ICONS: Record<string, IconId> = {
  desktop: 'folder',
  documents: 'folder-docs',
  portfolio: 'projects',
  pictures: 'folder-pictures',
  recycleBin: 'recycle-full',
};

export function nodeDisplayName(node: FsNode, t: Translate): string {
  if (node.id === ROOT_ID || node.parentId === null) return t('folder.drive');
  if (node.systemKey) return t(`folder.${node.systemKey}` as Parameters<Translate>[0]);
  return node.name;
}

export function nodeTypeLabel(node: FsNode, t: Translate): string {
  if (node.kind === 'folder') return t('file.folder');
  if (node.shortcut) return t('file.shortcut');
  const extension = extensionOf(node.name);
  if (isTextExtension(extension)) return t('file.textDocument');
  if (extension === '.lnk' || extension === '.url') return t('file.shortcut');
  const key = iconForName(node.name);
  switch (key) {
    case 'doc-image':
      return t('file.image');
    case 'doc-audio':
      return t('file.audio');
    case 'doc-video':
      return t('file.video');
    case 'doc-web':
      return t('file.webPage');
    case 'doc-pdf':
      return t('file.pdf');
    default:
      return t('file.unknown');
  }
}

export function iconForNode(node: FsNode): IconId {
  if (node.kind === 'folder') {
    if (node.id === ROOT_ID) return 'drive';
    if (node.systemKey) return SYSTEM_ICONS[node.systemKey] ?? 'folder';
    return node.origin === 'portfolio' ? 'folder' : 'folder';
  }
  if (node.icon) return node.icon;
  if (node.shortcut) {
    if (node.shortcut.type === 'app') return APP_CATALOG[node.shortcut.appId]?.icon ?? 'doc-web';
    if (node.shortcut.type === 'url') return 'doc-web';
    return 'shortcut' in node && node.shortcut.type === 'node' ? 'folder' : 'doc-web';
  }
  return iconForName(node.name);
}

/**
 * Application that opens a file, or null when nothing is associated. The
 * caller decides what to offer in that case (exporting it is usually enough).
 */
export function appForNode(node: FsNode): string | null {
  if (node.kind === 'folder') return 'explorer';
  if (node.shortcut) return null;
  const extension = extensionOf(node.name);
  if (isTextExtension(extension)) return 'notepad';
  const mime = node.mime;
  if (mime.startsWith('image/')) return 'paint';
  if (mime.startsWith('audio/') || mime.startsWith('video/')) return 'mediaplayer';
  if (mime === 'application/pdf') return 'viewer';
  if (mime === 'text/html') return 'internet';
  return null;
}

/** Folder to open when a system folder icon is double clicked. */
export function systemFolderIcon(key: string, isEmpty: boolean): IconId {
  if (key === 'recycleBin') return isEmpty ? 'recycle-empty' : 'recycle-full';
  return SYSTEM_ICONS[key] ?? 'folder';
}
