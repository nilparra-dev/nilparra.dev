/**
 * Pure helpers of the virtual disk: naming rules, paths, subtree copies,
 * search and file type detection. No IndexedDB here, which keeps them easy to
 * test.
 */
import type { IconId } from '../../assets/generated/icons';
import type { TranslationKey } from '../i18n/es';
import { createId } from '../ids';
import type { FsNode, NodeWithPath, SystemFolderKey } from './types';
import { ROOT_ID } from './types';

const FORBIDDEN = /[\\/:*?"<>|]/;
const MAX_NAME_LENGTH = 120;
const MAX_DEPTH = 24;

export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..') return false;
  if (trimmed.length > MAX_NAME_LENGTH) return false;
  return !FORBIDDEN.test(trimmed);
}

export function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  if (index <= 0) return '';
  return name.slice(index).toLowerCase();
}

export function baseNameOf(name: string): string {
  const index = name.lastIndexOf('.');
  if (index <= 0) return name;
  return name.slice(0, index);
}

/** Folder name plus the extension of the file it is deleted from. */
export function withExtension(name: string, extension: string): string {
  return extension ? `${name}${extension}` : name;
}

/**
 * "notas.txt" already taken becomes "notas (2).txt"; `copyOf` produces
 * "notas - copia.txt" when the operation is a copy.
 */
export function uniqueName(existing: string[], desired: string, options: { copyOf?: boolean } = {}): string {
  const taken = new Set(existing.map((name) => name.toLowerCase()));
  if (!taken.has(desired.toLowerCase())) return desired;

  const extension = extensionOf(desired);
  const base = extension ? desired.slice(0, desired.length - extension.length) : desired;
  const suffix = options.copyOf ? ' - copia' : '';
  if (suffix && !taken.has(`${base}${suffix}${extension}`.toLowerCase())) {
    return `${base}${suffix}${extension}`;
  }
  for (let index = 2; index < 999; index += 1) {
    const candidate = options.copyOf
      ? `${base}${suffix} (${index})${extension}`
      : `${base} (${index})${extension}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} (${Date.now()})${extension}`;
}

export function childrenOf(
  nodes: Iterable<FsNode>,
  parentId: string,
  options: { deleted?: boolean } = {},
): FsNode[] {
  const wantDeleted = options.deleted ?? false;
  const result: FsNode[] = [];
  for (const node of nodes) {
    if (node.parentId !== parentId) continue;
    const isDeleted = node.deletedAt !== null;
    if (isDeleted !== wantDeleted) continue;
    result.push(node);
  }
  return result;
}

export function findByName(nodes: Iterable<FsNode>, parentId: string, name: string): FsNode | undefined {
  const target = name.trim().toLowerCase();
  for (const node of nodes) {
    if (node.parentId === parentId && node.deletedAt === null && node.name.toLowerCase() === target) {
      return node;
    }
  }
  return undefined;
}

export function pathOf(nodes: Map<string, FsNode>, id: string): NodeWithPath | null {
  const segments: string[] = [];
  let current = nodes.get(id);
  if (!current) return null;
  let guard = 0;
  while (current.parentId && guard < MAX_DEPTH) {
    const parent = nodes.get(current.parentId);
    if (!parent) break;
    segments.unshift(current.name);
    current = parent;
    guard += 1;
  }
  if (current.parentId === null) segments.unshift(current.name);
  return {
    node: nodes.get(id) as FsNode,
    segments: segments.slice(1),
    path: segments.join('\\'),
  };
}

export function isDescendantOf(nodes: Map<string, FsNode>, ancestorId: string, nodeId: string): boolean {
  let current = nodes.get(nodeId);
  let guard = 0;
  while (current?.parentId && guard < MAX_DEPTH) {
    if (current.parentId === ancestorId) return true;
    current = nodes.get(current.parentId);
    guard += 1;
  }
  return false;
}

export function depthOf(nodes: Map<string, FsNode>, id: string): number {
  let depth = 0;
  let current = nodes.get(id);
  let guard = 0;
  while (current?.parentId && guard < MAX_DEPTH) {
    depth += 1;
    current = nodes.get(current.parentId);
    guard += 1;
  }
  return depth;
}

export interface DuplicateResult {
  nodes: FsNode[];
  /** Old blob id -> new blob id, so the caller can copy the binary content. */
  blobMap: Map<string, string>;
}

/** Deep copy of a node (and of everything inside a folder). */
export function duplicateSubtree(
  nodes: Map<string, FsNode>,
  sourceId: string,
  targetParentId: string,
  now: number,
): DuplicateResult {
  const result: DuplicateResult = { nodes: [], blobMap: new Map() };

  const copyOne = (id: string, parentId: string, root: boolean): void => {
    const source = nodes.get(id);
    if (!source) return;
    const children = childrenOf(nodes.values(), id);
    const existingNames = childrenOf(nodes.values(), parentId).map((node) => node.name);
    const name = root ? uniqueName(existingNames, source.name, { copyOf: true }) : source.name;
    const newId = createId('node');
    let blobId = source.blobId ?? null;
    if (source.blobId) {
      blobId = createId('blob');
      result.blobMap.set(source.blobId, blobId);
    }
    result.nodes.push({
      ...source,
      id: newId,
      parentId,
      name,
      origin: 'user',
      readonly: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedFromParentId: null,
      blobId,
    });
    for (const child of children) copyOne(child.id, newId, false);
  };

  copyOne(sourceId, targetParentId, true);
  return result;
}

export interface SearchOptions {
  term: string;
  /** Restrict the search to a subtree; omit to search the whole disk. */
  scopeId?: string;
  /** Restrict by kind. */
  kind?: 'folder' | 'file' | 'any';
  /** Case insensitive substring inside text files. */
  contents?: boolean;
}

export function searchNodes(nodes: Map<string, FsNode>, options: SearchOptions): FsNode[] {
  const term = options.term.trim().toLowerCase();
  if (!term) return [];
  const results: FsNode[] = [];
  for (const node of nodes.values()) {
    if (node.deletedAt !== null) continue;
    if (options.scopeId && node.id !== options.scopeId) {
      if (!isDescendantOf(nodes, options.scopeId, node.id)) continue;
    }
    if (options.kind === 'folder' && node.kind !== 'folder') continue;
    if (options.kind === 'file' && node.kind !== 'file') continue;
    const inName = node.name.toLowerCase().includes(term);
    const inContent =
      options.contents && node.kind === 'file' && typeof node.content === 'string'
        ? node.content.toLowerCase().includes(term)
        : false;
    if (inName || inContent) results.push(node);
  }
  return results;
}

export function folderSize(nodes: Map<string, FsNode>, id: string): number {
  let total = 0;
  const walk = (parentId: string, depth: number) => {
    if (depth > MAX_DEPTH) return;
    for (const node of nodes.values()) {
      if (node.parentId !== parentId || node.deletedAt !== null) continue;
      if (node.kind === 'folder') walk(node.id, depth + 1);
      else total += node.size;
    }
  };
  walk(id, 0);
  return total;
}

const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.ini', '.md', '.csv', '.json', '.xml', '.yml', '.yaml', '.ts', '.js', '.css', '.html', '.sh', '.bat', '.cfg', '.conf']);

export function isTextExtension(extension: string): boolean {
  return TEXT_EXTENSIONS.has(extension);
}

export function mimeForName(name: string): string {
  const extension = extensionOf(name);
  switch (extension) {
    case '.txt':
    case '.log':
    case '.ini':
    case '.cfg':
    case '.conf':
    case '.sh':
    case '.bat':
    case '.csv':
      return 'text/plain';
    case '.md':
      return 'text/markdown';
    case '.json':
      return 'application/json';
    case '.xml':
      return 'application/xml';
    case '.html':
    case '.htm':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.js':
      return 'text/javascript';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.bmp':
      return 'image/bmp';
    case '.svg':
      return 'image/svg+xml';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
      return 'audio/ogg';
    case '.m4a':
      return 'audio/mp4';
    case '.flac':
      return 'audio/flac';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.ogv':
      return 'video/ogg';
    case '.mov':
      return 'video/quicktime';
    case '.pdf':
      return 'application/pdf';
    case '.url':
      return 'application/x-url';
    case '.lnk':
      return 'application/x-shortcut';
    default:
      return 'application/octet-stream';
  }
}

export function iconForName(name: string): IconId {
  const extension = extensionOf(name);
  if (extension === '.lnk' || extension === '.url') return 'doc-web';
  if (extension === '.pdf') return 'doc-pdf';
  if (isTextExtension(extension)) return 'doc-text';
  const mime = mimeForName(name);
  if (mime.startsWith('image/')) return 'doc-image';
  if (mime.startsWith('audio/')) return 'doc-audio';
  if (mime.startsWith('video/')) return 'doc-video';
  if (mime === 'text/html') return 'doc-web';
  return 'doc-unknown';
}

export function typeLabelKeyForName(name: string): TranslationKey {
  const extension = extensionOf(name);
  if (isTextExtension(extension)) return 'file.textDocument';
  const mime = mimeForName(name);
  if (mime.startsWith('image/')) return 'file.image';
  if (mime.startsWith('audio/')) return 'file.audio';
  if (mime.startsWith('video/')) return 'file.video';
  if (mime === 'application/pdf') return 'file.pdf';
  if (mime === 'text/html' || extension === '.url') return 'file.webPage';
  if (extension === '.lnk') return 'file.shortcut';
  return 'file.unknown';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function makeFolder(parentId: string, name: string, now = Date.now()): FsNode {
  return {
    id: createId('node'),
    parentId,
    kind: 'folder',
    name,
    systemKey: null,
    origin: 'user',
    readonly: false,
    mime: 'inode/directory',
    size: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedFromParentId: null,
  };
}

export function makeTextFile(
  parentId: string,
  name: string,
  content: string,
  now = Date.now(),
): FsNode {
  return {
    id: createId('node'),
    parentId,
    kind: 'file',
    name,
    systemKey: null,
    origin: 'user',
    readonly: false,
    mime: mimeForName(name),
    size: new Blob([content]).size,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedFromParentId: null,
    content,
  };
}

export function makeBinaryFile(
  parentId: string,
  name: string,
  blobId: string,
  size: number,
  now = Date.now(),
): FsNode {
  return {
    id: createId('node'),
    parentId,
    kind: 'file',
    name,
    systemKey: null,
    origin: 'user',
    readonly: false,
    mime: mimeForName(name),
    size,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedFromParentId: null,
    blobId,
  };
}

export function makeShortcut(
  parentId: string,
  name: string,
  shortcut: FsNode['shortcut'],
  icon: IconId | null,
  now = Date.now(),
): FsNode {
  return {
    id: createId('node'),
    parentId,
    kind: 'file',
    name,
    systemKey: null,
    origin: 'user',
    readonly: false,
    mime: 'application/x-shortcut',
    size: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedFromParentId: null,
    shortcut,
    icon,
  };
}

export function isRoot(node: FsNode | undefined): boolean {
  return !!node && node.id === ROOT_ID;
}

export function systemKeyOf(node: FsNode | undefined): SystemFolderKey | null {
  return node?.systemKey ?? null;
}
