import { describe, expect, it } from 'vitest';
import { makeShortcut, makeTextFile } from './vfsUtils';
import { resolveShortcutNode } from './useFileOpener';
import type { FsNode } from './types';

function lookupOf(...nodes: FsNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return (id: string) => byId.get(id);
}

describe('shortcut resolution', () => {
  it('follows node shortcuts until it reaches the real file', () => {
    const target = makeTextFile('root-c', 'notes.txt', 'hello', 1);
    const middle = makeShortcut('root-c', 'middle.lnk', { type: 'node', nodeId: target.id }, 'doc-text', 1);
    const start = makeShortcut('root-c', 'start.lnk', { type: 'node', nodeId: middle.id }, 'doc-text', 1);

    expect(resolveShortcutNode(start, lookupOf(start, middle, target))).toEqual({ kind: 'node', node: target });
  });

  it('returns app and URL targets without looking them up', () => {
    const app = makeShortcut('root-c', 'calculator.lnk', { type: 'app', appId: 'calculator' }, 'calculator', 1);
    const url = makeShortcut('root-c', 'site.url', { type: 'url', url: 'https://nilparra.dev' }, 'doc-web', 1);

    expect(resolveShortcutNode(app, lookupOf(app))).toEqual({ kind: 'app', appId: 'calculator' });
    expect(resolveShortcutNode(url, lookupOf(url))).toEqual({ kind: 'url', url: 'https://nilparra.dev' });
  });

  it('reports missing targets and cycles instead of recursing forever', () => {
    const missing = makeShortcut('root-c', 'missing.lnk', { type: 'node', nodeId: 'does-not-exist' }, 'folder', 1);
    expect(resolveShortcutNode(missing, lookupOf(missing))).toEqual({ kind: 'missing', node: missing });

    const first = makeShortcut('root-c', 'first.lnk', { type: 'node', nodeId: 'second' }, 'folder', 1);
    const second = makeShortcut('root-c', 'second.lnk', { type: 'node', nodeId: first.id }, 'folder', 1);
    const linkedFirst: FsNode = { ...first, shortcut: { type: 'node', nodeId: second.id } };

    expect(resolveShortcutNode(linkedFirst, lookupOf(linkedFirst, second))).toEqual({ kind: 'cycle', node: linkedFirst });
  });
});
