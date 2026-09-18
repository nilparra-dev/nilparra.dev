// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDatabase } from './db';
import { buildSeed } from './seed';
import { initializeNodes, loadNodes, putNodes, repairDuplicateDesktopShortcuts } from './vfs';
import type { FsNode } from './types';

beforeEach(async () => { await deleteDatabase(); });

describe('disk initialization', () => {
  it('creates one seed when two mounts initialize an empty disk concurrently', async () => {
    const results = await Promise.all([
      initializeNodes(() => buildSeed('es').nodes),
      initializeNodes(() => buildSeed('es').nodes),
    ]);
    const stored = await loadNodes();
    expect(stored).toHaveLength(buildSeed('es').nodes.length);
    expect(results[0].map((node) => node.id)).toEqual(results[1].map((node) => node.id));
    const shortcuts = stored.filter((node) => node.parentId === 'folder-desktop');
    expect(new Set(shortcuts.map((node) => node.name)).size).toBe(shortcuts.length);
  });

  it('repairs duplicate untouched system shortcuts while preserving user files and references', async () => {
    const nodes = buildSeed('es', 1000).nodes;
    const shortcut = nodes.find((node) => node.shortcut?.type === 'app');
    if (!shortcut) throw new Error('Missing seeded shortcut');
    const duplicate: FsNode = { ...shortcut, id: 'duplicate' };
    const userCopy: FsNode = { ...shortcut, id: 'user-copy', origin: 'user' };
    const modified: FsNode = { ...shortcut, id: 'modified', updatedAt: 2000 };
    const reference: FsNode = { ...userCopy, id: 'reference', shortcut: { type: 'node', nodeId: duplicate.id } };
    await putNodes([...nodes, duplicate, userCopy, modified, reference]);
    const repaired = await repairDuplicateDesktopShortcuts([...nodes, duplicate, userCopy, modified, reference]);
    expect(repaired.some((node) => node.id === duplicate.id)).toBe(false);
    expect(repaired).toContainEqual(userCopy);
    expect(repaired).toContainEqual(modified);
    expect(repaired.find((node) => node.id === reference.id)?.shortcut).toEqual({ type: 'node', nodeId: shortcut.id });
    expect(await loadNodes()).toHaveLength(repaired.length);
    expect(await repairDuplicateDesktopShortcuts(repaired)).toEqual(repaired);
  });
});
