import { describe, expect, it } from 'vitest';
import { translate, type Locale } from '../i18n/I18nProvider';
import { nodeDisplayName } from './display';
import { buildSeed } from './seed';
import type { FsNode } from './types';

function tFor(locale: Locale) {
  return (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
    translate(locale, key, params);
}

function seededShortcut(appId: string): FsNode {
  const node = buildSeed('es', 1000).nodes.find(
    (candidate) => candidate.shortcut?.type === 'app' && candidate.shortcut.appId === appId,
  );
  if (!node) throw new Error(`Missing seeded shortcut: ${appId}`);
  return node;
}

describe('node display names', () => {
  it('shows the seeded app shortcuts in the interface language', () => {
    const welcome = seededShortcut('welcome');
    expect(nodeDisplayName(welcome, tFor('es'))).toBe('Bienvenida');
    expect(nodeDisplayName(welcome, tFor('ca'))).toBe('Benvinguda');
    expect(nodeDisplayName(welcome, tFor('en'))).toBe('Welcome');
  });

  it('keeps a renamed shortcut as the visitor named it', () => {
    const renamed: FsNode = { ...seededShortcut('welcome'), name: 'Mi enlace.lnk', updatedAt: 2000 };
    expect(nodeDisplayName(renamed, tFor('en'))).toBe('Mi enlace');
  });

  it('does not translate copies made by the visitor', () => {
    const copy: FsNode = { ...seededShortcut('welcome'), id: 'user-copy', origin: 'user' };
    expect(nodeDisplayName(copy, tFor('en'))).toBe('Bienvenida');
  });
});
