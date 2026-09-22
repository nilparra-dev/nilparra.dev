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

  it('follows the interface language on the next boot', () => {
    const nodes = buildSeed('es', 1000).nodes;
    const plan = planSeedSync(nodes, 'en', allOffered(nodes), 2000);
    const readme = plan.changes.find((node) => node.name === 'README.txt' && node.parentId === portfolioId);
    expect(readme?.content).toContain('This folder holds the portfolio');
  });

  it('adds shortcuts published after the first visit but not the ones the visitor removed', () => {
    const nodes = buildSeed('es', 1000).nodes.filter(
      (node) => node.shortcut?.type !== 'app' || !['mail', 'about'].includes(node.shortcut.appId),
    );
    /* Disk from before the offer list existed: `about` was seeded and then removed. */
    const plan = planSeedSync(nodes, 'es', null, 2000);
    const added = plan.changes.filter((node) => node.shortcut);
    expect(added.map((node) => node.shortcut)).toEqual([{ type: 'app', appId: 'mail' }]);
    expect(plan.offered).toContain('app:mail');

    /* Once offered, deleting it for good keeps it deleted. */
    const again = planSeedSync(nodes, 'es', plan.offered, 3000);
    expect(again.changes).toEqual([]);
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
