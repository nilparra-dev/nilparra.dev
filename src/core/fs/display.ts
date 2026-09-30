/**
 * How a file or folder is presented: icon, visible name (system folders are
 * translated) and type label. Keeps i18n decisions out of the file system
 * itself, whose names and paths are always stable.
 */
import type { IconId } from '../../assets/generated/icons';
import { APP_CATALOG } from '../apps/catalog';
import { PROFILE } from '../content/profile';
import type { I18nValue } from '../i18n/I18nProvider';
import { WELCOME_FILE_NAME } from './seed';
import { ROOT_ID, type FsNode } from './types';
import { baseNameOf, iconForName, isTextExtension, extensionOf } from './vfsUtils';

type Translate = I18nValue['t'];

const SYSTEM_ICONS: Record<string, IconId> = {
  desktop: 'folder',
  documents: 'folder-docs',
  portfolio: 'projects',
  pictures: 'folder-pictures',
  recycleBin: 'recycle-full',
};

/** Labels of the app shortcuts the disk seed puts on the desktop. */
const SYSTEM_SHORTCUT_LABELS: Record<string, Parameters<Translate>[0]> = {
  projects: 'app.projects',
  about: 'app.about',
  mail: 'app.mail',
  welcome: 'app.welcome',
};

/**
 * A seeded system shortcut shows the name of the app it opens, so the desktop
 * follows the interface language. Renaming or moving it bumps `updatedAt`, and
 * from then on the visitor's own name wins.
 */
function systemShortcutLabel(node: FsNode): Parameters<Translate>[0] | null {
  if (node.origin !== 'system' || node.deletedAt !== null) return null;
  if (node.createdAt !== node.updatedAt) return null;
  if (node.shortcut?.type === 'cv') return 'desktop.cvShortcut';
  if (node.shortcut?.type !== 'app') return null;
  return SYSTEM_SHORTCUT_LABELS[node.shortcut.appId] ?? null;
}

/**
 * Seeded files and folders keep stable Spanish names on disk (the seed sync
 * matches them by name), but are shown in the interface language while the
 * visitor has not changed them. Portfolio content is read only, so it always
 * qualifies; the welcome note only until it is edited or renamed.
 */
const SEEDED_NAME_LABELS: Record<string, Parameters<Translate>[0]> = {
  Proyectos: 'seed.projectsFolder',
  'Sobre-mi.txt': 'seed.aboutFile',
  'Contacto.txt': 'seed.contactFile',
};

function seededNameLabel(node: FsNode): Parameters<Translate>[0] | null {
  if (node.deletedAt !== null) return null;
  if (node.origin === 'portfolio') return SEEDED_NAME_LABELS[node.name] ?? null;
  if (node.name === WELCOME_FILE_NAME && node.kind === 'file' && node.createdAt === node.updatedAt) {
    return 'seed.welcomeFile';
  }
  return null;
}

export function nodeDisplayName(node: FsNode, t: Translate): string {
  if (node.id === ROOT_ID || node.parentId === null) return t('folder.drive');
  if (node.systemKey) return t(`folder.${node.systemKey}` as Parameters<Translate>[0]);
  const shortcutLabel = systemShortcutLabel(node);
  if (shortcutLabel) return t(shortcutLabel);
  const seededLabel = seededNameLabel(node);
  if (seededLabel) return t(seededLabel);
  if (node.shortcut && (extensionOf(node.name) === '.lnk' || extensionOf(node.name) === '.url')) {
    return baseNameOf(node.name);
  }
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
  if (node.shortcut?.type === 'url') {
    /* Profile links get their brand icon, also on disks seeded before it existed. */
    const url = node.shortcut.url;
    const profileLink = PROFILE.links.find((link) => link.url === url);
    if (profileLink) return profileLink.icon;
  }
  if (node.icon) return node.icon;
  if (node.shortcut) {
    if (node.shortcut.type === 'app') return APP_CATALOG[node.shortcut.appId]?.icon ?? 'doc-web';
    if (node.shortcut.type === 'url') return 'doc-web';
    if (node.shortcut.type === 'cv') return 'doc-pdf';
    return node.shortcut.type === 'node' ? 'folder' : 'doc-web';
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
