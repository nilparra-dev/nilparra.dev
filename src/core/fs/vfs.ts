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
