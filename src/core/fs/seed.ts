/**
 * Initial structure of the virtual disk.
 *
 * C:\
 *   Desktop\      (what appears on the desktop)
 *   Documents\    (the visitor's files)
 *   Portfolio\    (read only content of the author)
 *   Pictures\
 *   Recycle Bin\  (a real folder: deleted items are moved into it)
 *
 * The seed is used on the first visit and by the "reset the disk" action of the
 * Control Panel.
 */
import { APP_CATALOG } from '../apps/catalog';
import type { Locale } from '../i18n/I18nProvider';
import { createId } from '../ids';
import { portfolioFiles, welcomeNote } from '../content/portfolioFiles';
import { PROFILE } from '../content/profile';
import { mimeForName } from './vfsUtils';
import { ROOT_ID, type FsNode, type SystemFolderKey } from './types';

/** Name of the note the seed writes in `C:\Documents`. */
export const WELCOME_FILE_NAME = 'Bienvenida.txt';

/** Internal names are English and stable; the UI translates the systemKey. */
const SYSTEM_FOLDERS: Array<{ key: SystemFolderKey; name: string }> = [
  { key: 'desktop', name: 'Desktop' },
  { key: 'documents', name: 'Documents' },
  { key: 'portfolio', name: 'Portfolio' },
  { key: 'pictures', name: 'Pictures' },
  { key: 'recycleBin', name: 'Recycle Bin' },
];

export interface SeedResult {
  nodes: FsNode[];
  /** Folder id by system key, used to open the right window at boot. */
  folders: Record<SystemFolderKey, string>;
}

function folder(
  parentId: string,
  name: string,
  systemKey: SystemFolderKey | null,
  origin: FsNode['origin'],
  readonly: boolean,
  now: number,
): FsNode {
  return {
    id: systemKey ? `folder-${systemKey}` : createId('node'),
    parentId,
    kind: 'folder',
    name,
    systemKey,
    origin,
    readonly,
    mime: 'inode/directory',
    size: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedFromParentId: null,
  };
}

function textFile(
  parentId: string,
  name: string,
  content: string,
  origin: FsNode['origin'],
  readonly: boolean,
  now: number,
): FsNode {
  return {
    id: createId('node'),
    parentId,
    kind: 'file',
    name,
    systemKey: null,
    origin,
    readonly,
    mime: mimeForName(name),
    size: new Blob([content]).size,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedFromParentId: null,
    content,
  };
}

function shortcut(
  parentId: string,
  name: string,
  target: FsNode['shortcut'],
  icon: FsNode['icon'],
  now: number,
): FsNode {
  return {
    id: createId('node'),
    parentId,
    kind: 'file',
    name,
    systemKey: null,
    origin: 'system',
    readonly: false,
    mime: 'application/x-shortcut',
    size: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedFromParentId: null,
    shortcut: target,
    icon: icon ?? null,
  };
}

export function buildSeed(locale: Locale, now = Date.now()): SeedResult {
  const nodes: FsNode[] = [];
  const folders = {} as Record<SystemFolderKey, string>;

  const root: FsNode = {
    id: ROOT_ID,
    parentId: null,
    kind: 'folder',
    name: 'C:',
    systemKey: null,
    origin: 'system',
    readonly: false,
    mime: 'inode/directory',
    size: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedFromParentId: null,
  };
  nodes.push(root);

  for (const definition of SYSTEM_FOLDERS) {
    const node = folder(ROOT_ID, definition.name, definition.key, 'system', false, now);
    nodes.push(node);
    folders[definition.key] = node.id;
  }

  /* --- C:\Documents ------------------------------------------------- */
  nodes.push(textFile(folders.documents, WELCOME_FILE_NAME, welcomeNote(locale), 'user', false, now));

  /* --- C:\Portfolio (read only, restorable) ------------------------- */
  const portfolioFolders = new Map<string, string>();
  for (const file of portfolioFiles(locale)) {
    let parentId = folders.portfolio;
    let path = '';
    for (const segment of file.folder) {
      path = path ? `${path}\\${segment}` : segment;
      const existing = portfolioFolders.get(path);
      if (existing) {
        parentId = existing;
        continue;
      }
      const created = folder(parentId, segment, null, 'portfolio', true, now);
      nodes.push(created);
      portfolioFolders.set(path, created.id);
      parentId = created.id;
    }
    nodes.push(textFile(parentId, file.name, file.content, 'portfolio', true, now));
  }

  /* --- Desktop shortcuts ------------------------------------------- */
  const desktopId = folders.desktop;
  nodes.push(
    shortcut(
      desktopId,
      'Mis proyectos.lnk',
      { type: 'app', appId: 'projects' },
      APP_CATALOG.projects?.icon ?? 'projects',
      now,
    ),
  );
  nodes.push(
    shortcut(
      desktopId,
      'Sobre mí.lnk',
      { type: 'app', appId: 'about' },
      APP_CATALOG.about?.icon ?? 'about-me',
      now,
    ),
  );
  nodes.push(
    shortcut(
      desktopId,
      'Contacto.lnk',
      { type: 'app', appId: 'mail' },
      APP_CATALOG.mail?.icon ?? 'mail',
      now,
    ),
  );
  nodes.push(
    shortcut(
      desktopId,
      'Bienvenida.lnk',
      { type: 'app', appId: 'welcome' },
      APP_CATALOG.welcome?.icon ?? 'welcome',
      now,
    ),
  );
  for (const link of PROFILE.links) {
    if (!link.url.startsWith('http')) continue;
    nodes.push(
      shortcut(
        desktopId,
        `${link.label}.url`,
        { type: 'url', url: link.url },
        'doc-web',
        now,
      ),
    );
  }

  return { nodes, folders };
}

/**
 * Portfolio content only: used to restore the author folder without touching
 * the visitor's own files.
 */
export function buildPortfolioSeed(locale: Locale, portfolioId: string, now = Date.now()): FsNode[] {
  const nodes: FsNode[] = [];
  const created = new Map<string, string>();
  for (const file of portfolioFiles(locale)) {
    let parentId = portfolioId;
    let path = '';
    for (const segment of file.folder) {
      path = path ? `${path}\\${segment}` : segment;
      const existing = created.get(path);
      if (existing) {
        parentId = existing;
        continue;
      }
      const node = folder(parentId, segment, null, 'portfolio', true, now);
      nodes.push(node);
      created.set(path, node.id);
      parentId = node.id;
    }
    nodes.push(textFile(parentId, file.name, file.content, 'portfolio', true, now));
  }
  return nodes;
}
