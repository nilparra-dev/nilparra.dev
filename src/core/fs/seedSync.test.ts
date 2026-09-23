// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDatabase } from './db';
import { buildPortfolioSeed, buildSeed } from './seed';
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

  it('rewrites a stale portfolio and redirects the visitor shortcuts to the new files', () => {
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

    const oldPortfolio = nodes.filter((node) => node.origin === 'portfolio');
    expect(plan.removals.sort()).toEqual(oldPortfolio.map((node) => node.id).sort());
    const freshAbout = plan.changes.find((node) => node.name === 'Sobre-mi.txt');
    expect(freshAbout?.parentId).toBe(portfolioId);
    expect(plan.changes.find((node) => node.id === 'reference')?.shortcut).toEqual({
      type: 'node',
      nodeId: freshAbout?.id,
    });
  });

  it('keeps visitor files inside a surviving portfolio folder and avoids name collisions', () => {
    const nodes = staleDisk();
    const oldProjects = nodes.find((node) => node.name === 'Proyectos' && node.parentId === portfolioId);
    const oldWooster = oldProjects && nodes.find((node) => node.name === 'wooster.txt' && node.parentId === oldProjects.id);
    const freshProjects = buildPortfolioSeed('es', portfolioId, 2000).find(
      (node) => node.name === 'Proyectos' && node.parentId === portfolioId,
    );
    if (!oldProjects || !oldWooster || !freshProjects) throw new Error('Missing project folder');

    const visitorFile: FsNode = {
      ...oldWooster,
      id: 'visitor-file',
      parentId: oldProjects.id,
      name: 'wooster.txt',
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
      deletedFromParentId: oldProjects.id,
    };
    const plan = planSeedSync([...nodes, visitorFile, deletedVisitorFile], 'es', allOffered(nodes), 2000);
    const moved = plan.changes.find((node) => node.id === visitorFile.id);
    const movedDeleted = plan.changes.find((node) => node.id === deletedVisitorFile.id);
    const plannedProjects = plan.changes.find(
      (node) => node.name === 'Proyectos' && node.parentId === portfolioId,
    );

    expect(plannedProjects).toBeTruthy();
    expect(moved?.parentId).toBe(plannedProjects?.id);
    expect(moved?.name).toBe('wooster (2).txt');
    expect(moved?.content).toBe(visitorFile.content);
    expect(movedDeleted?.deletedFromParentId).toBe(plannedProjects?.id);
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
