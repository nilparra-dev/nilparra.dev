/**
 * Keeps the seeded parts of a stored disk in step with the published content.
 *
 * The disk is seeded once, on the first visit, so a returning visitor would
 * otherwise keep the portfolio files and desktop shortcuts of that day. On
 * every boot this plans the smallest change that brings them up to date
 * without touching the visitor's own files.
 */
import type { Locale } from '../i18n/I18nProvider';
import { buildPortfolioSeed, seedShortcuts } from './seed';
import type { FsNode, ShortcutTarget } from './types';

export interface SeedSyncPlan {
  /** Nodes to write: the fresh portfolio, new shortcuts and redirected references. */
  changes: FsNode[];
  removals: string[];
  /** Every shortcut the seed has offered so far, to be stored for the next boot. */
  offered: string[];
}

/**
 * Shortcuts the seed placed before the offer list was recorded. On a disk with
 * no list, a missing one of these was removed by the visitor, not never given.
 */
const LEGACY_OFFER = ['app:projects', 'app:about', 'app:welcome'];

export function shortcutKey(target: ShortcutTarget): string {
  if (target.type === 'app') return `app:${target.appId}`;
  if (target.type === 'url') return `url:${target.url}`;
  return `node:${target.nodeId}`;
}

/** Relative path inside the portfolio of every live portfolio node, keyed by id. */
function portfolioPaths(nodes: Iterable<FsNode>, portfolioId: string): Map<string, string> {
  const children = new Map<string, FsNode[]>();
  for (const node of nodes) {
    if (node.deletedAt !== null || node.origin !== 'portfolio' || !node.parentId) continue;
    const list = children.get(node.parentId);
    if (list) list.push(node);
    else children.set(node.parentId, [node]);
  }
  const paths = new Map<string, string>();
  const walk = (parentId: string, prefix: string, depth: number) => {
    if (depth > 32) return;
    for (const child of children.get(parentId) ?? []) {
      const path = `${prefix}\\${child.name}`;
      paths.set(child.id, path);
      if (child.kind === 'folder') walk(child.id, path, depth + 1);
    }
  };
  walk(portfolioId, '', 0);
  return paths;
}

function signature(nodes: FsNode[], paths: Map<string, string>): string {
  return nodes
    .filter((node) => paths.has(node.id))
    .map((node) => `${paths.get(node.id)}\u0000${node.kind}\u0000${node.content ?? ''}`)
    .sort()
    .join('\u0001');
}

export function planSeedSync(
  nodes: FsNode[],
  locale: Locale,
  offered: readonly string[] | null,
  now = Date.now(),
): SeedSyncPlan {
  const changes: FsNode[] = [];
  const removals: string[] = [];
  const live = nodes.filter((node) => node.deletedAt === null);

  /* --- portfolio ---------------------------------------------------- */
  const portfolioId = live.find((node) => node.systemKey === 'portfolio')?.id;
  const replaced = new Map<string, string>();
  if (portfolioId) {
    const currentPaths = portfolioPaths(nodes, portfolioId);
    const current = nodes.filter((node) => currentPaths.has(node.id));
    const fresh = buildPortfolioSeed(locale, portfolioId, now);
    const freshPaths = portfolioPaths(fresh, portfolioId);
    if (signature(current, currentPaths) !== signature(fresh, freshPaths)) {
      const idByPath = new Map([...freshPaths].map(([id, path]) => [path, id]));
      for (const node of current) {
        removals.push(node.id);
        replaced.set(node.id, idByPath.get(currentPaths.get(node.id) ?? '') ?? portfolioId);
      }
      changes.push(...fresh);
      for (const node of nodes) {
        if (replaced.has(node.id)) continue;
        /* A visitor file left inside a folder that goes away moves up to the portfolio root. */
        const orphan = node.parentId !== null && replaced.has(node.parentId);
        const target = node.shortcut?.type === 'node' ? replaced.get(node.shortcut.nodeId) : undefined;
        if (!orphan && !target) continue;
        changes.push({
          ...node,
          parentId: orphan ? portfolioId : node.parentId,
          shortcut: target ? { type: 'node', nodeId: target } : node.shortcut,
        });
      }
    }
  }

  /* --- desktop shortcuts -------------------------------------------- */
  const desktopId = live.find((node) => node.systemKey === 'desktop')?.id;
  const known = new Set(offered ?? LEGACY_OFFER);
  if (desktopId) {
    const present = new Set(
      nodes.filter((node) => node.shortcut).map((node) => shortcutKey(node.shortcut as ShortcutTarget)),
    );
    for (const node of seedShortcuts(desktopId, now)) {
      const key = shortcutKey(node.shortcut as ShortcutTarget);
      if (!known.has(key) && !present.has(key)) changes.push(node);
      known.add(key);
    }
  }

  return { changes, removals, offered: [...known].sort() };
}
