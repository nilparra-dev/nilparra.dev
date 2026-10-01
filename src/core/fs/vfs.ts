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
import { welcomeNote } from '../content/portfolioFiles';
import type { Locale } from '../i18n/I18nProvider';
import { readStored, writeStored } from '../persist/storage';
import { WELCOME_FILE_NAME } from './seed';
import { planSeedSync } from './seedSync';
import { FsError, type FsBlob, type FsNode, type SystemFolderKey } from './types';
import { uniqueName } from './vfsUtils';

/**
 * Texts the seed has written into the welcome note, one per language. A copy
 * that no longer matches is one the visitor edited, and it wins over the
 * untouched duplicates.
 */
const WELCOME_TEXTS = new Set([welcomeNote('es'), welcomeNote('ca'), welcomeNote('en')]);

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

/** localStorage entry with the shortcuts the seed has offered on this disk. */
const SEED_OFFER_KEY = 'seed-offer';
const SEED_OFFER_VERSION = 1;

/**
 * Brings the portfolio files and the desktop shortcuts up to the published
 * content. Planning and writing share one transaction that re-reads the
 * store, so a second tab booting at the same time finds the work done.
 */
export async function syncSeedNodes(locale: Locale, now = Date.now()): Promise<FsNode[]> {
  const offered = readStored<string[] | null>(SEED_OFFER_KEY, SEED_OFFER_VERSION, null);
  let nextOffer: string[] | null = null;
  await write([STORE_NODES], (tx) => {
    const store = tx.objectStore(STORE_NODES);
    const all = store.getAll();
    all.onsuccess = () => {
      const nodes = (all.result as unknown[])
        .map((entry) => normalizeNode(entry))
        .filter((node): node is FsNode => node !== null);
      const repair = planDuplicateRepair(nodes);
      const plan = planSeedSync(repair.nodes, locale, Array.isArray(offered) ? offered : null, now);
      const removals = new Set([...repair.removals.keys(), ...plan.removals]);
      removals.forEach((id) => store.delete(id));
      const changes = new Map<string, FsNode>();
      [...repair.changes, ...plan.changes].forEach((node) => changes.set(node.id, node));
      changes.forEach((node) => store.put(node));
      nextOffer = plan.offered;
    };
  });
  if (nextOffer) writeStored(SEED_OFFER_KEY, SEED_OFFER_VERSION, nextOffer);
  return loadNodes();
}

/** Deepest folder chain the repair walks; deeper chains are treated as corrupt. */
const MAX_REPAIR_DEPTH = 32;

/** Written once and never edited, renamed or moved since. */
function isUntouched(node: FsNode): boolean {
  return node.createdAt === node.updatedAt;
}

interface DuplicateRepairPlan {
  nodes: FsNode[];
  changes: FsNode[];
  removals: Map<string, string | null>;
}

function planDuplicateRepair(nodes: FsNode[]): DuplicateRepairPlan {
  const removals = planDuplicateRemovals(nodes);
  if (!removals.size) return { nodes, changes: [], removals };

  const changes: FsNode[] = [];
  const repaired = nodes
    .filter((node) => !removals.has(node.id))
    .map((node) => {
      if (node.shortcut?.type !== 'node') return node;
      const replacement = removals.get(node.shortcut.nodeId);
      if (!replacement) return node;
      const updated: FsNode = { ...node, shortcut: { type: 'node', nodeId: replacement } };
      changes.push(updated);
      return updated;
    });
  return { nodes: repaired, changes, removals };
}

/**
 * Duplicates left behind by the old non-atomic initialisation: two mounts
 * could seed an empty disk at the same time, and every node the seed creates
 * with a random id (desktop shortcuts, the note in Documents and the whole
 * portfolio subtree) ended up written twice.
 *
 * Only untouched copies are removed. Visitor files, and any copy that was
 * edited, renamed or moved, keep their place; a shortcut that points to a
 * removed copy is redirected to the one that stays.
 */
export async function repairDuplicateSeedNodes(nodes: FsNode[]): Promise<FsNode[]> {
  const repair = planDuplicateRepair(nodes);
  if (!repair.removals.size) return repair.nodes;
  await write([STORE_NODES], (tx) => {
    const store = tx.objectStore(STORE_NODES);
    repair.changes.forEach((node) => store.put(node));
    repair.removals.forEach((_, id) => store.delete(id));
  });
  return repair.nodes;
}

/** Removal plan of the duplicated nodes: id to remove -> id that takes its place. */
function planDuplicateRemovals(nodes: FsNode[]): Map<string, string | null> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const live = nodes.filter((node) => node.deletedAt === null);
  const removals = new Map<string, string | null>();

  const childrenOf = (parentId: string): FsNode[] =>
    live.filter((node) => node.parentId === parentId);

  /** Removes a node and, when it is a folder, adds its whole subtree to the plan. */
  const planRemoval = (node: FsNode, replacement: string | null, depth = 0): void => {
    removals.set(node.id, replacement);
    if (node.kind !== 'folder' || !replacement || depth >= MAX_REPAIR_DEPTH) return;
    const kept = byId.get(replacement);
    if (!kept) return;
    for (const child of childrenOf(node.id)) {
      const counterpart = childrenOf(kept.id).find(
        (candidate) => candidate.kind === child.kind && candidate.name === child.name,
      );
      planRemoval(child, counterpart?.id ?? null, depth + 1);
    }
  };

  const portfolioCopy = (node: FsNode): boolean =>
    node.origin === 'portfolio' && node.readonly && isUntouched(node);

  /** A duplicated folder only goes when everything inside is untouched portfolio content. */
  const removableSubtree = (folder: FsNode, depth = 0): boolean => {
    if (depth >= MAX_REPAIR_DEPTH) return false;
    return childrenOf(folder.id).every(
      (child) =>
        portfolioCopy(child) && (child.kind !== 'folder' || removableSubtree(child, depth + 1)),
    );
  };

  /** Keeps the first copy of every untouched duplicate group and removes the rest. */
  const dedupe = (
    parentId: string,
    isCopy: (node: FsNode) => boolean,
    subtreeAware: boolean,
  ): void => {
    const groups = new Map<string, FsNode[]>();
    for (const child of childrenOf(parentId)) {
      if (removals.has(child.id)) continue;
      const key = `${child.kind}\u0000${child.name}`;
      const group = groups.get(key);
      if (group) group.push(child);
      else groups.set(key, [child]);
    }
    for (const group of groups.values()) {
      const copies = group.filter(isCopy);
      if (copies.length < 2) continue;
      const [kept, ...duplicates] = copies;
      for (const duplicate of duplicates) {
        if (duplicate.kind === 'folder' && (!subtreeAware || !removableSubtree(duplicate))) continue;
        planRemoval(duplicate, kept.id);
      }
    }
  };

  const desktopId = live.find((node) => node.systemKey === 'desktop')?.id;
  if (desktopId) {
    dedupe(
      desktopId,
      (node) => node.origin === 'system' && node.shortcut !== null && isUntouched(node),
      false,
    );
  }

  const portfolioId = live.find((node) => node.systemKey === 'portfolio')?.id;
  if (portfolioId) {
    const walk = (parentId: string, depth: number): void => {
      if (depth >= MAX_REPAIR_DEPTH) return;
      dedupe(parentId, portfolioCopy, true);
      for (const child of childrenOf(parentId)) {
        if (child.kind === 'folder' && !removals.has(child.id)) walk(child.id, depth + 1);
      }
    };
    walk(portfolioId, 0);
  }

  const documentsId = live.find((node) => node.systemKey === 'documents')?.id;
  if (documentsId) {
    const group = childrenOf(documentsId).filter((node) => node.name === WELCOME_FILE_NAME);
    const copies = group.filter(
      (node) => isUntouched(node) && node.content !== undefined && WELCOME_TEXTS.has(node.content),
    );
    if (group.length > 1 && copies.length > 0) {
      const edited = group.filter((node) => !copies.includes(node));
      const kept = edited[0] ?? copies[0];
      for (const copy of copies) {
        if (copy.id !== kept.id) planRemoval(copy, kept.id);
      }
    }
  }

  return removals;
}

/**
 * A stored name has to survive a round trip through the naming rules. The
 * length cap stays looser than the writer's (`isValidName`) so records saved
 * by older versions keep loading; only control characters, path separators
 * and truncation are rejected here.
 */
function normalizeName(input: string): string | null {
  if (!input.trim() || input.length > 200) return null;
  // The disk root keeps its Windows-style drive name ("C:"), which is the only
  // legal place a colon can appear: a bare letter followed by a colon.
  if (/^[A-Za-z]:$/.test(input)) return input;
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(input)) return null;
  return input;
}

/** Shape of a valid shortcut target: the type decides which field must exist. */
function normalizeShortcut(input: unknown): FsNode['shortcut'] {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<NonNullable<FsNode['shortcut']>>;
  if (raw.type === 'app') {
    return typeof raw.appId === 'string' && raw.appId ? { type: 'app', appId: raw.appId } : null;
  }
  if (raw.type === 'url') {
    return typeof raw.url === 'string' && raw.url ? { type: 'url', url: raw.url } : null;
  }
  if (raw.type === 'cv') return { type: 'cv' };
  if (raw.type === 'node') {
    return typeof raw.nodeId === 'string' && raw.nodeId ? { type: 'node', nodeId: raw.nodeId } : null;
  }
  return null;
}

/** Defensive: a stored record could come from an older or tampered schema. */
export function normalizeNode(input: unknown): FsNode | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<FsNode>;
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  if (raw.kind !== 'folder' && raw.kind !== 'file') return null;
  const name = normalizeName(raw.name);
  if (!name) return null;
  return {
    id: raw.id,
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    kind: raw.kind,
    name,
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
    shortcut: normalizeShortcut(raw.shortcut),
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

/** Reserves sibling names and writes new nodes and their blobs in one transaction. */
export async function createNodes({ nodes, blobs = [] }: { nodes: FsNode[]; blobs?: FsBlob[] }): Promise<FsNode[]> {
  if (!nodes.length) return [];
  const created: FsNode[] = [];
  await write(blobs.length ? [STORE_NODES, STORE_BLOBS] : [STORE_NODES], (tx) => {
    const store = tx.objectStore(STORE_NODES);
    const all = store.getAll();
    all.onsuccess = () => {
      const namesByParent = new Map<string | null, string[]>();
      for (const entry of all.result) {
        const node = normalizeNode(entry);
        if (!node || node.deletedAt !== null) continue;
        const names = namesByParent.get(node.parentId) ?? [];
        names.push(node.name);
        namesByParent.set(node.parentId, names);
      }
      for (const node of nodes) {
        const names = namesByParent.get(node.parentId) ?? [];
        const name = uniqueName(names, node.name);
        names.push(name);
        namesByParent.set(node.parentId, names);
        const saved = { ...node, name };
        store.add(saved);
        created.push(saved);
      }
      if (blobs.length) {
        const content = tx.objectStore(STORE_BLOBS);
        blobs.forEach((blob) => content.add(blob));
      }
    };
  });
  return created;
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
