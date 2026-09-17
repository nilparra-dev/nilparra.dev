import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePreferences } from '../prefs/PreferencesProvider';
import type { IconId } from '../../assets/generated/icons';
import { buildPortfolioSeed, buildSeed } from './seed';
import { FsError, ROOT_ID, type FsBlob, type FsNode, type NodeWithPath, type ShortcutTarget, type SystemFolderKey } from './types';
import { diskUsage, loadNodes, putBlobs, putNodes, readBlobData, removeNodes, warmUp, wipeDisk } from './vfs';
import {
  childrenOf as childrenOfNodes,
  duplicateSubtree,
  folderSize as folderSizeOf,
  isDescendantOf,
  isValidName,
  isTextExtension,
  makeBinaryFile,
  makeFolder,
  makeShortcut,
  makeTextFile,
  pathOf as pathOfNode,
  searchNodes,
  uniqueName,
  extensionOf,
} from './vfsUtils';

export type NameProblem = 'ok' | 'empty' | 'invalid' | 'taken';

export interface VfsValue {
  ready: boolean;
  /** Last storage failure, to be shown as a translated message box. */
  error: FsError | null;
  clearError: () => void;
  /** True while an operation is being written: the shell shows the wait cursor. */
  busy: boolean;
  nodes: Map<string, FsNode>;
  folders: Partial<Record<SystemFolderKey, string>>;
  usage: { usage: number; quota: number };
  refreshUsage: () => Promise<void>;
  nodeById: (id: string) => FsNode | undefined;
  liveChildren: (parentId: string) => FsNode[];
  binItems: () => FsNode[];
  pathOf: (id: string) => NodeWithPath | null;
  descendantsOf: (id: string) => FsNode[];
  search: (options: { term: string; scopeId?: string; kind?: 'folder' | 'file' | 'any'; contents?: boolean }) => FsNode[];
  folderSize: (id: string) => number;
  validateName: (parentId: string, name: string, excludeId?: string) => NameProblem;
  createFolder: (parentId: string, name?: string) => Promise<FsNode | null>;
  createTextFile: (parentId: string, name: string, content: string) => Promise<FsNode | null>;
  createShortcut: (
    parentId: string,
    name: string,
    target: ShortcutTarget,
    icon?: IconId | null,
  ) => Promise<FsNode | null>;
  saveText: (id: string, content: string) => Promise<boolean>;
  rename: (id: string, name: string) => Promise<boolean>;
  move: (ids: string[], targetParentId: string) => Promise<boolean>;
  copy: (ids: string[], targetParentId: string) => Promise<boolean>;
  trash: (ids: string[]) => Promise<boolean>;
  restore: (ids: string[]) => Promise<boolean>;
  destroy: (ids: string[]) => Promise<boolean>;
  emptyBin: () => Promise<boolean>;
  importFiles: (parentId: string, files: File[]) => Promise<FsNode[]>;
  exportNode: (id: string) => Promise<boolean>;
  readFileContent: (id: string) => Promise<string | null>;
  readFileBlob: (id: string) => Promise<Blob | null>;
  resetDisk: () => Promise<boolean>;
  restorePortfolio: () => Promise<boolean>;
}

const VfsContext = createContext<VfsValue | null>(null);

export function VfsProvider({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const locale = preferences.locale;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const [nodes, setNodes] = useState<Map<string, FsNode>>(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<FsError | null>(null);
  const [busyCount, setBusyCount] = useState(0);
  const [usage, setUsage] = useState({ usage: 0, quota: 0 });

  const refreshUsage = useCallback(async () => {
    setUsage(await diskUsage());
  }, []);

  /* --- boot: open the database and seed it the first time ----------- */
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        await warmUp();
        let stored = await loadNodes();
        if (stored.length === 0) {
          const { nodes: seedNodes } = buildSeed(localeRef.current);
          await putNodes(seedNodes);
          stored = seedNodes;
        }
        if (cancelled) return;
        setNodes(new Map(stored.map((node) => [node.id, node])));
        setReady(true);
        void refreshUsage();
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof FsError ? cause : new FsError('read', String(cause)));
        setReady(true);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [refreshUsage]);

  const apply = useCallback((changes: FsNode[], removals: string[] = []) => {
    setNodes((current) => {
      const next = new Map(current);
      removals.forEach((id) => next.delete(id));
      changes.forEach((node) => next.set(node.id, node));
      return next;
    });
  }, []);

  /**
   * Writes first, updates the screen after: a failed write never looks like a
   * successful save.
   */
  const commit = useCallback(
    async (
      changes: FsNode[],
      options: { removals?: string[]; blobs?: FsBlob[]; blobRemovals?: string[] } = {},
    ): Promise<boolean> => {
      setBusyCount((count) => count + 1);
      try {
        if (options.blobs?.length) await putBlobs(options.blobs);
        if (changes.length) await putNodes(changes);
        if (options.removals?.length || options.blobRemovals?.length) {
          await removeNodes(options.removals ?? [], options.blobRemovals ?? []);
        }
        apply(changes, options.removals);
        void refreshUsage();
        return true;
      } catch (cause) {
        setError(cause instanceof FsError ? cause : new FsError('write', String(cause)));
        return false;
      } finally {
        setBusyCount((count) => Math.max(0, count - 1));
      }
    },
    [apply, refreshUsage],
  );

  const nodeById = useCallback((id: string) => nodes.get(id), [nodes]);

  const liveChildren = useCallback(
    (parentId: string) => childrenOfNodes(nodes.values(), parentId, { deleted: false }),
    [nodes],
  );

  const binItems = useCallback(() => {
    const bin = [...nodes.values()].find((node) => node.systemKey === 'recycleBin');
    if (!bin) return [];
    return childrenOfNodes(nodes.values(), bin.id, { deleted: true });
  }, [nodes]);

  const pathOf = useCallback((id: string) => pathOfNode(nodes, id), [nodes]);

  const descendantsOf = useCallback(
    (id: string) => [...nodes.values()].filter((node) => isDescendantOf(nodes, id, node.id)),
    [nodes],
  );

  const search = useCallback(
    (options: { term: string; scopeId?: string; kind?: 'folder' | 'file' | 'any'; contents?: boolean }) =>
      searchNodes(nodes, options),
    [nodes],
  );

  const folderSize = useCallback((id: string) => folderSizeOf(nodes, id), [nodes]);

  const folders = useMemo(() => {
    const result: Partial<Record<SystemFolderKey, string>> = {};
    for (const node of nodes.values()) {
      if (node.systemKey && node.deletedAt === null) result[node.systemKey] = node.id;
    }
    return result;
  }, [nodes]);

  const validateName = useCallback(
    (parentId: string, name: string, excludeId?: string): NameProblem => {
      const trimmed = name.trim();
      if (!trimmed) return 'empty';
      if (!isValidName(trimmed)) return 'invalid';
      const collision = liveChildren(parentId).some(
        (node) => node.id !== excludeId && node.name.toLowerCase() === trimmed.toLowerCase(),
      );
      return collision ? 'taken' : 'ok';
    },
    [liveChildren],
  );

  /* --- mutations ---------------------------------------------------- */

  const createFolder = useCallback(
    async (parentId: string, name?: string) => {
      const desired = name?.trim() || 'Nueva carpeta';
      const finalName = uniqueName(
        liveChildren(parentId).map((node) => node.name),
        desired,
      );
      const node = makeFolder(parentId, finalName);
      return (await commit([node])) ? node : null;
    },
    [commit, liveChildren],
  );

  const createTextFile = useCallback(
    async (parentId: string, name: string, content: string) => {
      const finalName = uniqueName(
        liveChildren(parentId).map((node) => node.name),
        name.trim() || 'Nuevo documento.txt',
      );
      const node = makeTextFile(parentId, finalName, content);
      return (await commit([node])) ? node : null;
    },
    [commit, liveChildren],
  );

  const createShortcut = useCallback(
    async (parentId: string, name: string, target: ShortcutTarget, icon?: IconId | null) => {
      const finalName = uniqueName(
        liveChildren(parentId).map((node) => node.name),
        name.endsWith('.lnk') ? name : `${name}.lnk`,
      );
      const node = makeShortcut(parentId, finalName, target, icon ?? null);
      return (await commit([node])) ? node : null;
    },
    [commit, liveChildren],
  );

  const saveText = useCallback(
    async (id: string, content: string) => {
      const node = nodes.get(id);
      if (!node || node.kind !== 'file') return false;
      return commit([
        {
          ...node,
          content,
          size: new Blob([content]).size,
          updatedAt: Date.now(),
        },
      ]);
    },
    [commit, nodes],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const node = nodes.get(id);
      if (!node) return false;
      const trimmed = name.trim();
      if (!isValidName(trimmed)) return false;
      if (node.parentId) {
        const problem = validateName(node.parentId, trimmed, id);
        if (problem !== 'ok') return false;
      }
      return commit([{ ...node, name: trimmed, updatedAt: Date.now() }]);
    },
    [commit, nodes, validateName],
  );

  const move = useCallback(
    async (ids: string[], targetParentId: string) => {
      const target = nodes.get(targetParentId);
      if (!target || target.kind !== 'folder') return false;
      const moved: FsNode[] = [];
      for (const id of ids) {
        const node = nodes.get(id);
        if (!node || node.id === targetParentId) continue;
        if (node.parentId === targetParentId) continue;
        if (node.kind === 'folder' && isDescendantOf(nodes, node.id, targetParentId)) continue;
        if (node.readonly) continue;
        const desired = uniqueName(
          liveChildren(targetParentId)
            .filter((candidate) => !ids.includes(candidate.id))
            .map((candidate) => candidate.name),
          node.name,
        );
        moved.push({
          ...node,
          parentId: targetParentId,
          name: desired,
          updatedAt: Date.now(),
        });
      }
      if (!moved.length) return false;
      return commit(moved);
    },
    [commit, liveChildren, nodes],
  );

  const copy = useCallback(
    async (ids: string[], targetParentId: string) => {
      const target = nodes.get(targetParentId);
      if (!target || target.kind !== 'folder') return false;
      const now = Date.now();
      const created: FsNode[] = [];
      const blobs: FsBlob[] = [];
      for (const id of ids) {
        const node = nodes.get(id);
        if (!node) continue;
        const { nodes: copies, blobMap } = duplicateSubtree(nodes, id, targetParentId, now);
        created.push(...copies);
        for (const [oldBlob, newBlob] of blobMap) {
          const data = await readBlobData(oldBlob);
          if (data) blobs.push({ id: newBlob, data });
        }
      }
      if (!created.length) return false;
      return commit(created, { blobs });
    },
    [commit, nodes],
  );

  const collectSubtree = useCallback(
    (id: string): { ids: string[]; blobIds: string[] } => {
      const ids = [id];
      const blobIds: string[] = [];
      const node = nodes.get(id);
      if (node?.blobId) blobIds.push(node.blobId);
      const walk = (parentId: string) => {
        for (const child of childrenOfNodes(nodes.values(), parentId, { deleted: true })) {
          ids.push(child.id);
          if (child.blobId) blobIds.push(child.blobId);
          walk(child.id);
        }
      };
      walk(id);
      return { ids, blobIds };
    },
    [nodes],
  );

  const trash = useCallback(
    async (ids: string[]) => {
      const binId = folders.recycleBin;
      if (!binId) return false;
      const now = Date.now();
      const changed: FsNode[] = [];
      for (const id of ids) {
        const node = nodes.get(id);
        if (!node || node.readonly || node.parentId === binId) continue;
        changed.push({
          ...node,
          deletedAt: now,
          deletedFromParentId: node.parentId,
          parentId: binId,
        });
      }
      if (!changed.length) return false;
      return commit(changed);
    },
    [commit, folders.recycleBin, nodes],
  );

  const restore = useCallback(
    async (ids: string[]) => {
      const binId = folders.recycleBin;
      const changed: FsNode[] = [];
      for (const id of ids) {
        const node = nodes.get(id);
        if (!node || node.deletedAt === null) continue;
        let parentId = node.deletedFromParentId ?? ROOT_ID;
        if (!nodes.has(parentId) || parentId === binId) parentId = ROOT_ID;
        const siblings = liveChildren(parentId).map((candidate) => candidate.name);
        changed.push({
          ...node,
          parentId,
          name: uniqueName(siblings, node.name),
          deletedAt: null,
          deletedFromParentId: null,
          updatedAt: Date.now(),
        });
      }
      if (!changed.length) return false;
      return commit(changed);
    },
    [commit, folders.recycleBin, liveChildren, nodes],
  );

  const destroy = useCallback(
    async (ids: string[]) => {
      const removeIds: string[] = [];
      const blobIds: string[] = [];
      for (const id of ids) {
        const { ids: subtree, blobIds: blobs } = collectSubtree(id);
        removeIds.push(...subtree);
        blobIds.push(...blobs);
      }
      if (!removeIds.length) return false;
      return commit([], { removals: removeIds, blobRemovals: blobIds });
    },
    [collectSubtree, commit],
  );

  const emptyBin = useCallback(async () => {
    const binId = folders.recycleBin;
    if (!binId) return false;
    const items = childrenOfNodes(nodes.values(), binId, { deleted: true });
    if (!items.length) return false;
    return destroy(items.map((item) => item.id));
  }, [destroy, folders.recycleBin, nodes]);

  const importFiles = useCallback(
    async (parentId: string, files: File[]) => {
      const created: FsNode[] = [];
      const blobs: FsBlob[] = [];
      const siblings = () => [
        ...liveChildren(parentId).map((node) => node.name),
        ...created.map((node) => node.name),
      ];
      for (const file of files) {
        const name = uniqueName(siblings(), file.name);
        const extension = extensionOf(name);
        const isText =
          isTextExtension(extension) ||
          file.type.startsWith('text/') ||
          file.type === 'application/json';
        if (isText) {
          const content = await file.text();
          created.push(makeTextFile(parentId, name, content));
        } else {
          const blobId = `blob_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
          blobs.push({ id: blobId, data: file });
          created.push(makeBinaryFile(parentId, name, blobId, file.size));
        }
      }
      if (!created.length) return [];
      const ok = await commit(created, { blobs });
      return ok ? created : [];
    },
    [commit, liveChildren],
  );

  const exportNode = useCallback(
    async (id: string) => {
      const node = nodes.get(id);
      if (!node || node.kind !== 'file') return false;
      setBusyCount((count) => count + 1);
      try {
        const blob =
          node.blobId !== undefined && node.blobId !== null
            ? await readBlobData(node.blobId)
            : new Blob([node.content ?? ''], { type: node.mime });
        if (!blob) {
          setError(new FsError('not-found', `Missing content for ${node.name}`));
          return false;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = node.name;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
        return true;
      } catch (cause) {
        setError(cause instanceof FsError ? cause : new FsError('read', String(cause)));
        return false;
      } finally {
        setBusyCount((count) => Math.max(0, count - 1));
      }
    },
    [nodes],
  );

  const readFileContent = useCallback(
    async (id: string) => {
      const node = nodes.get(id);
      if (!node) return null;
      if (typeof node.content === 'string') return node.content;
      if (node.blobId) {
        const blob = await readBlobData(node.blobId);
        if (!blob) return null;
        try {
          return await blob.text();
        } catch {
          return null;
        }
      }
      return '';
    },
    [nodes],
  );

  const readFileBlob = useCallback(
    async (id: string) => {
      const node = nodes.get(id);
      if (!node) return null;
      if (node.blobId) return readBlobData(node.blobId);
      if (typeof node.content === 'string') return new Blob([node.content], { type: node.mime });
      return new Blob([], { type: node.mime });
    },
    [nodes],
  );

  const resetDisk = useCallback(async () => {
    setBusyCount((count) => count + 1);
    try {
      await wipeDisk();
      await warmUp();
      const { nodes: seedNodes } = buildSeed(localeRef.current);
      await putNodes(seedNodes);
      setNodes(new Map(seedNodes.map((node) => [node.id, node])));
      void refreshUsage();
      return true;
    } catch (cause) {
      setError(cause instanceof FsError ? cause : new FsError('write', String(cause)));
      return false;
    } finally {
      setBusyCount((count) => Math.max(0, count - 1));
    }
  }, [refreshUsage]);

  const restorePortfolio = useCallback(async () => {
    const portfolioId = folders.portfolio;
    if (!portfolioId) return false;
    const existing = descendantsOf(portfolioId);
    const removals = existing.map((node) => node.id);
    const blobRemovals = existing.map((node) => node.blobId).filter((id): id is string => !!id);
    const fresh = buildPortfolioSeed(localeRef.current, portfolioId);
    setBusyCount((count) => count + 1);
    try {
      if (removals.length || blobRemovals.length) {
        await removeNodes(removals, blobRemovals);
      }
      await putNodes(fresh);
      setNodes((current) => {
        const next = new Map(current);
        removals.forEach((id) => next.delete(id));
        fresh.forEach((node) => next.set(node.id, node));
        return next;
      });
      void refreshUsage();
      return true;
    } catch (cause) {
      setError(cause instanceof FsError ? cause : new FsError('write', String(cause)));
      return false;
    } finally {
      setBusyCount((count) => Math.max(0, count - 1));
    }
  }, [descendantsOf, folders.portfolio, refreshUsage]);

  const value = useMemo<VfsValue>(
    () => ({
      ready,
      error,
      clearError: () => setError(null),
      busy: busyCount > 0,
      nodes,
      folders,
      usage,
      refreshUsage,
      nodeById,
      liveChildren,
      binItems,
      pathOf,
      descendantsOf,
      search,
      folderSize,
      validateName,
      createFolder,
      createTextFile,
      createShortcut,
      saveText,
      rename,
      move,
      copy,
      trash,
      restore,
      destroy,
      emptyBin,
      importFiles,
      exportNode,
      readFileContent,
      readFileBlob,
      resetDisk,
      restorePortfolio,
    }),
    [
      ready,
      error,
      busyCount,
      nodes,
      folders,
      usage,
      refreshUsage,
      nodeById,
      liveChildren,
      binItems,
      pathOf,
      descendantsOf,
      search,
      folderSize,
      validateName,
      createFolder,
      createTextFile,
      createShortcut,
      saveText,
      rename,
      move,
      copy,
      trash,
      restore,
      destroy,
      emptyBin,
      importFiles,
      exportNode,
      readFileContent,
      readFileBlob,
      resetDisk,
      restorePortfolio,
    ],
  );

  return <VfsContext.Provider value={value}>{children}</VfsContext.Provider>;
}

export function useVfs(): VfsValue {
  const value = useContext(VfsContext);
  if (!value) throw new Error('useVfs must be used inside <VfsProvider>');
  return value;
}
