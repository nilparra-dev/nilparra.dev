/**
 * IndexedDB layer of the virtual disk.
 *
 * Two stores: `nodes` (metadata of files and folders) and `blobs` (binary
 * content, stored as Blob). The schema is versioned so a future release can
 * migrate it without losing the visitor's files.
 */
import { FsError, type FsErrorCode } from './types';

export const DB_NAME = 'nilparra-win95';
export const DB_VERSION = 1;
export const STORE_NODES = 'nodes';
export const STORE_BLOBS = 'blobs';

let databasePromise: Promise<IDBDatabase> | null = null;

function request<T>(input: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    input.onsuccess = () => resolve(input.result);
    input.onerror = () =>
      reject(new FsError('read', input.error?.message ?? 'IndexedDB request failed'));
  });
}

export function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new FsError('read', 'IndexedDB is not available in this browser'));
      return;
    }
    const open = indexedDB.open(DB_NAME, DB_VERSION);

    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORE_NODES)) {
        const nodes = db.createObjectStore(STORE_NODES, { keyPath: 'id' });
        nodes.createIndex('parentId', 'parentId', { unique: false });
        nodes.createIndex('deletedAt', 'deletedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };

    open.onsuccess = () => {
      const db = open.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    open.onerror = () =>
      reject(new FsError('read', open.error?.message ?? 'Cannot open the database'));
    open.onblocked = () =>
      reject(new FsError('read', 'The database is blocked by another tab'));
  });
  return databasePromise;
}

function transaction(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
): IDBTransaction {
  const tx = db.transaction(stores, mode);
  tx.onerror = () => {
    /* errors surface on the individual requests */
  };
  return tx;
}

function isQuotaError(error: unknown): boolean {
  const name = (error as DOMException | undefined)?.name ?? '';
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function wrapError(error: unknown, fallback: FsErrorCode): FsError {
  if (error instanceof FsError) return error;
  if (isQuotaError(error)) {
    return new FsError('quota', (error as DOMException).message || 'Quota exceeded');
  }
  return new FsError(fallback, error instanceof Error ? error.message : String(error));
}

export async function readAllNodes(): Promise<unknown[]> {
  try {
    const db = await openDatabase();
    const tx = transaction(db, [STORE_NODES], 'readonly');
    return await request(tx.objectStore(STORE_NODES).getAll());
  } catch (error) {
    throw wrapError(error, 'read');
  }
}

export async function readBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    const tx = transaction(db, [STORE_BLOBS], 'readonly');
    const record = await request(tx.objectStore(STORE_BLOBS).get(id));
    return (record as { data?: Blob } | undefined)?.data ?? null;
  } catch (error) {
    throw wrapError(error, 'read');
  }
}

/** Runs a write transaction and waits for it to commit. */
export async function write(
  stores: string[],
  run: (tx: IDBTransaction) => void,
  errorCode: 'write' | 'quota' = 'write',
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = transaction(db, stores, 'readwrite');
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new FsError(errorCode, 'Transaction aborted'));
      tx.onerror = () => reject(tx.error ?? new FsError(errorCode, 'Transaction failed'));
    });
    run(tx);
    await done;
  } catch (error) {
    throw wrapError(error, errorCode);
  }
}

export async function deleteDatabase(): Promise<void> {
  try {
    const db = await openDatabase();
    db.close();
  } catch {
    /* ignore */
  }
  databasePromise = null;
  await new Promise<void>((resolve, reject) => {
    const removal = indexedDB.deleteDatabase(DB_NAME);
    removal.onsuccess = () => resolve();
    removal.onerror = () => reject(new FsError('write', 'Cannot delete the database'));
    removal.onblocked = () => resolve();
  });
}

export async function storageEstimate(): Promise<{ usage: number; quota: number }> {
  try {
    if (!navigator.storage?.estimate) return { usage: 0, quota: 0 };
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return { usage: 0, quota: 0 };
  }
}
