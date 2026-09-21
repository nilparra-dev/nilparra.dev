// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDatabase } from './db';
import { buildSeed } from './seed';
import { initializeNodes, loadNodes, normalizeNode, putNodes, repairDuplicateSeedNodes } from './vfs';
import type { FsNode } from './types';

beforeEach(async () => { await deleteDatabase(); });

/** Store contents after a disk that two mounts seeded at the same time. */
function doubleSeed(): FsNode[] {
  const first = buildSeed('es', 1000).nodes;
  const second = buildSeed('es', 2000).nodes;
  const stored = new Map([...first, ...second].map((node) => [node.id, node]));
  return [...stored.values()]
    .map((node) => normalizeNode(node))
    .filter((node): node is FsNode => node !== null);
}

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
    const repaired = await repairDuplicateSeedNodes([...nodes, duplicate, userCopy, modified, reference]);
    expect(repaired.some((node) => node.id === duplicate.id)).toBe(false);
    expect(repaired).toContainEqual(userCopy);
    expect(repaired).toContainEqual(modified);
    expect(repaired.find((node) => node.id === reference.id)?.shortcut).toEqual({ type: 'node', nodeId: shortcut.id });
    expect(await loadNodes()).toHaveLength(repaired.length);
    expect(await repairDuplicateSeedNodes(repaired)).toEqual(repaired);
  });

  it('removes the duplicates a double seed left in Documents and the portfolio', async () => {
    const nodes = doubleSeed();
    const portfolio = nodes.find((node) => node.systemKey === 'portfolio');
    const documents = nodes.find((node) => node.systemKey === 'documents');
    const desktop = nodes.find((node) => node.systemKey === 'desktop');
    if (!portfolio || !documents || !desktop) throw new Error('Missing system folders');
    const projects = nodes.filter((node) => node.parentId === portfolio.id && node.name === 'Proyectos');
    expect(projects).toHaveLength(2);
    const welcome = nodes.find((node) => node.name === 'Bienvenida.txt');
    if (!welcome) throw new Error('Missing welcome note');
    const userFile: FsNode = {
      ...welcome,
      id: 'user-file',
      name: 'Notas.txt',
      origin: 'user',
      content: 'mío',
    };
    const reference: FsNode = {
      ...userFile,
      id: 'reference',
      parentId: desktop.id,
      name: 'Proyectos.lnk',
      mime: 'application/x-shortcut',
      shortcut: { type: 'node', nodeId: projects[1].id },
    };
    await putNodes([...nodes, userFile, reference]);
    const repaired = await repairDuplicateSeedNodes([...nodes, userFile, reference]);
    const live = repaired.filter((node) => node.deletedAt === null);
    const named = (parentId: string, name: string) =>
      live.filter((node) => node.parentId === parentId && node.name === name);

    expect(named(portfolio.id, 'Proyectos')).toEqual([projects[0]]);
    expect(named(portfolio.id, 'README.txt')).toHaveLength(1);
    expect(named(portfolio.id, 'Sobre-mi.txt')).toHaveLength(1);
    expect(named(portfolio.id, 'Contacto.txt')).toHaveLength(1);
    expect(named(documents.id, 'Bienvenida.txt')).toHaveLength(1);
    expect(named(documents.id, 'Notas.txt')).toEqual([userFile]);
    expect(named(projects[0].id, 'proyecto-1.txt')).toHaveLength(1);
    expect(named(projects[0].id, 'proyecto-2.txt')).toHaveLength(1);
    expect(named(projects[0].id, 'proyecto-3.txt')).toHaveLength(1);
    expect(repaired.find((node) => node.id === 'reference')?.shortcut).toEqual({
      type: 'node',
      nodeId: projects[0].id,
    });
    // No live folder keeps two children with the same kind and name.
    const keys = live.map((node) => `${node.parentId}\u0000${node.kind}\u0000${node.name}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(await loadNodes()).toHaveLength(repaired.length);
  });

  it('keeps the copy of a duplicated welcome note the visitor edited', async () => {
    const nodes = doubleSeed();
    const notes = nodes.filter((node) => node.name === 'Bienvenida.txt');
    expect(notes).toHaveLength(2);
    const edited: FsNode = { ...notes[1], content: 'mi nota', updatedAt: notes[1].createdAt + 500 };
    const repaired = await repairDuplicateSeedNodes(
      nodes.map((node) => (node.id === edited.id ? edited : node)),
    );
    const remaining = repaired.filter(
      (node) => node.name === 'Bienvenida.txt' && node.deletedAt === null,
    );
    expect(remaining).toEqual([edited]);
  });
});
