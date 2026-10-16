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
import { uniqueName } from './vfsUtils';
import type { FsNode, ShortcutTarget } from './types';

export interface SeedSyncPlan {
  /** Nodes to write: the fresh portfolio, new shortcuts and redirected references. */
  changes: FsNode[];
  removals: string[];
  /** Every shortcut the seed has offered so far, to be stored for the next boot. */
  offered: string[];
}

/**
 * Shortcuts placed before the offer list was recorded. The Contact shortcut was
 * added later, so it must still be offered to existing disks.
 */
const LEGACY_OFFER = [
  'app:projects',
  'app:about',
  'app:welcome',
  'url:https://github.com/nilparra-dev',
  'url:https://www.linkedin.com/in/nilparra1/',
];

export function shortcutKey(target: ShortcutTarget): string {
  if (target.type === 'app') return `app:${target.appId}`;
  if (target.type === 'url') return `url:${target.url}`;
  if (target.type === 'cv') return 'cv';
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
    const published = buildPortfolioSeed(locale, portfolioId, now);
    const publishedPaths = portfolioPaths(published, portfolioId);
    if (signature(current, currentPaths) !== signature(published, publishedPaths)) {
      /*
       * A file that keeps its path keeps its id, so open windows, shortcuts
       * and the saved session still point at it when only its text changed
       * (a new release, or a new interface language).
       */
      const currentByPath = new Map(current.map((node) => [currentPaths.get(node.id) ?? '', node]));
      const reused = new Map<string, string>();
      for (const node of published) {
        const previous = currentByPath.get(publishedPaths.get(node.id) ?? '');
        if (previous && previous.kind === node.kind) reused.set(node.id, previous.id);
      }
      const fresh = published.map((node) => ({
        ...node,
        id: reused.get(node.id) ?? node.id,
        parentId: node.parentId === null ? null : reused.get(node.parentId) ?? node.parentId,
      }));
      const freshPaths = portfolioPaths(fresh, portfolioId);
      const idByPath = new Map([...freshPaths].map(([id, path]) => [path, id]));
      const kept = new Set(reused.values());
      for (const node of current) {
        if (kept.has(node.id)) continue;
        removals.push(node.id);
        replaced.set(node.id, idByPath.get(currentPaths.get(node.id) ?? '') ?? portfolioId);
      }
      changes.push(...fresh);

      /* Visitor nodes inside a portfolio folder stay there, or follow it when it is replaced. */
      const freshFolders = new Set(fresh.filter((node) => node.kind === 'folder').map((node) => node.id));
      freshFolders.add(portfolioId);
      const homeOf = (node: FsNode): string | undefined => {
        if (node.parentId === null || currentPaths.has(node.id)) return undefined;
        return replaced.get(node.parentId) ?? (freshFolders.has(node.parentId) ? node.parentId : undefined);
      };

      /* Reserve names before placing visitor nodes so a fresh file cannot collide with them. */
      const reservedNames = new Map<string, Set<string>>();
      const reserve = (parentId: string | null, name: string) => {
        if (parentId === null) return;
        const names = reservedNames.get(parentId) ?? new Set<string>();
        names.add(name.toLowerCase());
        reservedNames.set(parentId, names);
      };
      fresh.forEach((node) => reserve(node.parentId, node.name));
      nodes.forEach((node) => {
        if (!currentPaths.has(node.id) && homeOf(node) === undefined) reserve(node.parentId, node.name);
      });

      for (const node of nodes) {
        if (currentPaths.has(node.id)) continue;
        const home = homeOf(node);
        const target = node.shortcut?.type === 'node' ? replaced.get(node.shortcut.nodeId) : undefined;
        const deletedParent =
          node.deletedFromParentId === null
            ? undefined
            : replaced.get(node.deletedFromParentId);
        if (home === undefined && target === undefined && deletedParent === undefined) continue;

        let name = node.name;
        if (home !== undefined) {
          const names = reservedNames.get(home) ?? new Set<string>();
          name = uniqueName([...names], node.name);
          names.add(name.toLowerCase());
          reservedNames.set(home, names);
        }
        const parentId = home ?? node.parentId;
        if (parentId === node.parentId && name === node.name && target === undefined && deletedParent === undefined) {
          continue;
        }
        changes.push({
          ...node,
          name,
          parentId,
          deletedFromParentId: deletedParent ?? node.deletedFromParentId,
          shortcut: target === undefined ? node.shortcut : { type: 'node', nodeId: target },
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
