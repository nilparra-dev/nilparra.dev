/**
 * Read/write operations of the virtual disk.
 *
 * Everything the desktop does with files goes through here; the React layer
 * only keeps an in-memory copy of the tree for rendering.
 */
import {
  deleteDatabase,
  openDatabase,
  readAllNodes,
  readBlob,
  STORE_BLOBS,
  STORE_NODES,
  storageEstimate,
  write,
} from './db';
import { FsError, type FsBlob, type FsNode, type SystemFolderKey } from './types';

/** Reads every node (including the ones in the Recycle Bin). */
export async function loadNodes(): Promise<FsNode[]> {
  const raw = await readAllNodes();
  return raw.map((entry) => normalizeNode(entry)).filter((node): node is FsNode => node !== null);
}

/** Checking and seeding share a transaction, including across tabs and StrictMode mounts. */
export async function initializeNodes(createSeed: () => FsNode[]): Promise<FsNode[]> {
  await write([STORE_NODES], (tx) => {
    const store = tx.objectStore(STORE_NODES);
    const count = store.count();
    count.onsuccess = () => {
      if (count.result === 0) createSeed().forEach((node) => store.put(node));
    };
  });
  return loadNodes();
}

/** Repair untouched system shortcuts produced by the old non-atomic initialisation. */
export async function repairDuplicateDesktopShortcuts(nodes: FsNode[]): Promise<FsNode[]> {
  const desktop = nodes.find((node) => node.systemKey === 'desktop');
  if (!desktop) return nodes;
  const seen = new Map<string, string>();
  const replacements = new Map<string, string>();
  for (const node of nodes) {
    if (node.parentId !== desktop.id || node.origin !== 'system' || !node.shortcut ||
        node.deletedAt !== null || node.createdAt !== node.updatedAt) continue;
    const target = node.shortcut;
    const key = JSON.stringify([node.name, node.icon, target.type,
      target.type === 'app' ? target.appId : target.type === 'url' ? target.url : target.nodeId]);
    const existing = seen.get(key);
    if (existing) replacements.set(node.id, existing);
    else seen.set(key, node.id);
  }
  if (!replacements.size) return nodes;
  const changes: FsNode[] = [];
  const repaired = nodes.filter((node) => !replacements.has(node.id)).map((node) => {
    if (node.shortcut?.type !== 'node') return node;
    const targetId = replacements.get(node.shortcut.nodeId);
    if (!targetId) return node;
    const updated: FsNode = { ...node, shortcut: { type: 'node', nodeId: targetId } };
    changes.push(updated);
    return updated;
  });
  await write([STORE_NODES], (tx) => {
    const store = tx.objectStore(STORE_NODES);
    changes.forEach((node) => store.put(node));
    replacements.forEach((_, id) => store.delete(id));
  });
  return repaired;
}

/** Defensive: a stored record could come from an older or tampered schema. */
export function normalizeNode(input: unknown): FsNode | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<FsNode>;
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  if (raw.kind !== 'folder' && raw.kind !== 'file') return null;
  return {
    id: raw.id,
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    kind: raw.kind,
    name: raw.name,
    systemKey: (raw.systemKey ?? null) as SystemFolderKey | null,
    origin: raw.origin === 'system' || raw.origin === 'portfolio' ? raw.origin : 'user',
    readonly: raw.readonly === true,
    mime: typeof raw.mime === 'string' ? raw.mime : 'application/octet-stream',
    size: typeof raw.size === 'number' && Number.isFinite(raw.size) ? raw.size : 0,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    deletedAt: typeof raw.deletedAt === 'number' ? raw.deletedAt : null,
    deletedFromParentId:
      typeof raw.deletedFromParentId === 'string' ? raw.deletedFromParentId : null,
    content: typeof raw.content === 'string' ? raw.content : undefined,
    blobId: typeof raw.blobId === 'string' ? raw.blobId : raw.blobId === null ? null : undefined,
    shortcut: raw.shortcut ?? null,
    icon: raw.icon ?? null,
  };
}

export async function putNodes(nodes: FsNode[]): Promise<void> {
  if (!nodes.length) return;
  await write([STORE_NODES], (tx) => {
    const store = tx.objectStore(STORE_NODES);
    nodes.forEach((node) => store.put(node));
  });
}

export async function putBlobs(blobs: FsBlob[]): Promise<void> {
  if (!blobs.length) return;
  await write([STORE_BLOBS], (tx) => {
    const store = tx.objectStore(STORE_BLOBS);
    blobs.forEach((blob) => store.put(blob));
  }, 'quota');
}

/** Removes nodes for good, together with their binary content. */
export async function removeNodes(ids: string[], blobIds: string[] = []): Promise<void> {
  if (!ids.length && !blobIds.length) return;
  await write([STORE_NODES, STORE_BLOBS], (tx) => {
    const nodes = tx.objectStore(STORE_NODES);
    const blobs = tx.objectStore(STORE_BLOBS);
    ids.forEach((id) => nodes.delete(id));
    blobIds.forEach((id) => blobs.delete(id));
  });
}

export async function readBlobData(id: string): Promise<Blob | null> {
  return readBlob(id);
}

/** Deletes the whole database: used by the "reset the disk" action. */
export async function wipeDisk(): Promise<void> {
  await deleteDatabase();
}

export async function diskUsage(): Promise<{ usage: number; quota: number }> {
  return storageEstimate();
}

/** Ensures the database exists before the first write. */
export async function warmUp(): Promise<void> {
  await openDatabase();
}

export function isQuotaError(error: unknown): boolean {
  return error instanceof FsError && error.code === 'quota';
}
