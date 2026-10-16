// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDatabase } from './db';
import { buildSeed } from './seed';
import { planSeedSync, shortcutKey } from './seedSync';
import type { FsNode } from './types';
import { loadNodes, putNodes, syncSeedNodes } from './vfs';

beforeEach(async () => {
  await deleteDatabase();
  window.localStorage.clear();
});

const portfolioId = 'folder-portfolio';
const desktopId = 'folder-desktop';

/** A disk seeded by an older release: its project files still hold the old text. */
function staleDisk(): FsNode[] {
  return buildSeed('es', 1000).nodes.map((node) =>
    node.origin === 'portfolio' && node.name.endsWith('.txt') && node.name !== 'README.txt'
      ? { ...node, content: `${node.content ?? ''}\nversión antigua` }
      : node,
  );
}

function allOffered(nodes: FsNode[]): string[] {
  return nodes.flatMap((node) => (node.shortcut ? [shortcutKey(node.shortcut)] : []));
}

describe('seed sync', () => {
  it('leaves a disk that already matches the published content alone', () => {
    const nodes = buildSeed('es', 1000).nodes;
    const plan = planSeedSync(nodes, 'es', allOffered(nodes), 2000);
    expect(plan.changes).toEqual([]);
    expect(plan.removals).toEqual([]);
  });

  it('rewrites a stale portfolio in place, so references to its files stay valid', () => {
    const nodes = staleDisk();
    const about = nodes.find((node) => node.name === 'Sobre-mi.txt');
    if (!about) throw new Error('Missing Sobre-mi.txt');
    const reference: FsNode = {
      ...about,
      id: 'reference',
      parentId: desktopId,
      name: 'Sobre mí.lnk',
      origin: 'user',
      readonly: false,
      content: undefined,
      shortcut: { type: 'node', nodeId: about.id },
    };
    const plan = planSeedSync([...nodes, reference], 'es', allOffered(nodes), 2000);

    expect(plan.removals).toEqual([]);
    const freshAbout = plan.changes.find((node) => node.name === 'Sobre-mi.txt');
    expect(freshAbout?.id).toBe(about.id);
    expect(freshAbout?.parentId).toBe(portfolioId);
    expect(freshAbout?.content).not.toContain('versión antigua');
    expect(plan.changes.find((node) => node.id === 'reference')).toBeUndefined();
  });

  it('removes portfolio files that are no longer published and redirects their references', () => {
    const nodes = staleDisk();
    const about = nodes.find((node) => node.name === 'Sobre-mi.txt');
    if (!about) throw new Error('Missing Sobre-mi.txt');
    const retired: FsNode = { ...about, id: 'retired', name: 'Retirado.txt' };
    const reference: FsNode = {
      ...about,
      id: 'reference',
      parentId: desktopId,
      name: 'Retirado.lnk',
      origin: 'user',
      readonly: false,
      content: undefined,
      shortcut: { type: 'node', nodeId: retired.id },
    };
    const plan = planSeedSync([...nodes, retired, reference], 'es', allOffered(nodes), 2000);

    expect(plan.removals).toEqual([retired.id]);
    expect(plan.changes.find((node) => node.id === 'reference')?.shortcut).toEqual({
      type: 'node',
      nodeId: portfolioId,
    });
  });

  it('keeps visitor files inside a surviving portfolio folder and avoids name collisions', () => {
    const nodes = staleDisk();
    const oldProjects = nodes.find((node) => node.name === 'Proyectos' && node.parentId === portfolioId);
    const oldWooster = oldProjects && nodes.find((node) => node.name === 'wooster.txt' && node.parentId === oldProjects.id);
    if (!oldProjects || !oldWooster) throw new Error('Missing project folder');

    const visitorFile: FsNode = {
      ...oldWooster,
      id: 'visitor-file',
      parentId: oldProjects.id,
      name: 'wooster.txt',
      origin: 'user',
      readonly: false,
      content: 'notas del visitante',
    };
    const plan = planSeedSync([...nodes, visitorFile], 'es', allOffered(nodes), 2000);
    const moved = plan.changes.find((node) => node.id === visitorFile.id);
    const plannedProjects = plan.changes.find(
      (node) => node.name === 'Proyectos' && node.parentId === portfolioId,
    );

    expect(plannedProjects?.id).toBe(oldProjects.id);
    expect(moved?.parentId).toBe(oldProjects.id);
    expect(moved?.name).toBe('wooster (2).txt');
    expect(moved?.content).toBe(visitorFile.content);
  });

  it('moves visitor files out of a replaced portfolio folder', () => {
    const nodes = staleDisk();
    const oldProjects = nodes.find((node) => node.name === 'Proyectos' && node.parentId === portfolioId);
    if (!oldProjects) throw new Error('Missing project folder');
    /* A folder published by an older release and gone from the current one. */
    const retiredFolder: FsNode = { ...oldProjects, id: 'retired-folder', name: 'Antiguos' };
    const visitorFile: FsNode = {
      ...oldProjects,
      id: 'visitor-file',
      kind: 'file',
      parentId: retiredFolder.id,
      name: 'notas.txt',
      origin: 'user',
      readonly: false,
      content: 'notas del visitante',
    };
    const recycleBin = nodes.find((node) => node.systemKey === 'recycleBin');
    if (!recycleBin) throw new Error('Missing recycle bin');
    const deletedVisitorFile: FsNode = {
      ...visitorFile,
      id: 'deleted-visitor-file',
      parentId: recycleBin.id,
      deletedAt: 1500,
      deletedFromParentId: retiredFolder.id,
    };
    const plan = planSeedSync(
      [...nodes, retiredFolder, visitorFile, deletedVisitorFile],
      'es',
      allOffered(nodes),
      2000,
    );

    expect(plan.removals).toEqual([retiredFolder.id]);
    expect(plan.changes.find((node) => node.id === visitorFile.id)?.parentId).toBe(portfolioId);
    expect(plan.changes.find((node) => node.id === deletedVisitorFile.id)?.deletedFromParentId).toBe(portfolioId);
  });

  it('keeps every id when only the language changes', () => {
    const nodes = buildSeed('es', 1000).nodes;
    const plan = planSeedSync(nodes, 'en', allOffered(nodes), 2000);
    const ids = new Set(nodes.map((node) => node.id));
    expect(plan.removals).toEqual([]);
    expect(plan.changes.every((node) => ids.has(node.id))).toBe(true);
  });

  it('follows the interface language on the next boot', () => {
    const nodes = buildSeed('es', 1000).nodes;
    const plan = planSeedSync(nodes, 'en', allOffered(nodes), 2000);
    const readme = plan.changes.find((node) => node.name === 'README.txt' && node.parentId === portfolioId);
    expect(readme?.content).toContain('This folder holds the portfolio');
  });

  it('adds shortcuts published after the first visit but not the ones the visitor removed', () => {
    const nodes = buildSeed('es', 1000).nodes.filter(
      (node) =>
        (node.shortcut?.type !== 'app' || !['mail', 'about'].includes(node.shortcut.appId)) &&
        (node.shortcut?.type !== 'url' ||
          !['https://github.com/nilparra-dev', 'https://www.linkedin.com/in/nilparra1/'].includes(
            node.shortcut.url,
          )),
    );
    /* Disk from before the offer list existed: `about` and LinkedIn were removed. */
    const plan = planSeedSync(nodes, 'es', null, 2000);
    const added = plan.changes.filter((node) => node.shortcut);
    expect(added.map((node) => node.shortcut)).toEqual([{ type: 'app', appId: 'mail' }]);
    expect(plan.offered).toContain('app:mail');

    /* Once offered, deleting it for good keeps it deleted. */
    const again = planSeedSync(nodes, 'es', plan.offered, 3000);
    expect(again.changes).toEqual([]);
  });

  it('repairs duplicate seeds and syncs the portfolio in one transaction', async () => {
    const first = buildSeed('es', 1000).nodes;
    const second = buildSeed('es', 2000).nodes;
    const nodes = [...new Map([...first, ...second].map((node) => [node.id, node])).values()];
    const projects = nodes.filter((node) => node.name === 'Proyectos' && node.parentId === portfolioId);
    const duplicateWooster = projects[1] && nodes.find(
      (node) => node.name === 'wooster.txt' && node.parentId === projects[1].id,
    );
    if (projects.length < 2 || !duplicateWooster) throw new Error('Missing duplicate project');

    const reference: FsNode = {
      ...duplicateWooster,
      id: 'duplicate-reference',
      parentId: desktopId,
      name: 'Wooster.lnk',
      origin: 'user',
      readonly: false,
      content: undefined,
      shortcut: { type: 'node', nodeId: duplicateWooster.id },
    };
    await putNodes([...nodes, reference]);
    await syncSeedNodes('es', 3000);

    const stored = await loadNodes();
    const repairedReference = stored.find((node) => node.id === reference.id);
    const repairedTarget =
      repairedReference?.shortcut?.type === 'node' ? repairedReference.shortcut.nodeId : null;
    const liveProjectFolders = stored.filter(
      (node) => node.name === 'Proyectos' && node.parentId === portfolioId && node.deletedAt === null,
    );
    expect(liveProjectFolders).toHaveLength(1);
    expect(
      stored.filter(
        (node) => node.name === 'wooster.txt' && node.parentId === liveProjectFolders[0].id,
      ),
    ).toHaveLength(1);
    expect(stored.find((node) => node.id === repairedTarget)?.deletedAt).toBeNull();
  });

  it('writes the plan once even when two tabs boot together', async () => {
    const nodes = staleDisk();
    await putNodes(nodes);
    await Promise.all([syncSeedNodes('es', 2000), syncSeedNodes('es', 2000)]);
    const stored = await loadNodes();
    const readmes = stored.filter((node) => node.name === 'README.txt' && node.parentId === portfolioId);
    expect(readmes).toHaveLength(1);
    expect(stored.filter((node) => node.shortcut?.type === 'app' && node.shortcut.appId === 'mail')).toHaveLength(1);
    expect(stored.some((node) => node.content?.includes('versión antigua'))).toBe(false);
  });
});
