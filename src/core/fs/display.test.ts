import { describe, expect, it } from 'vitest';
import { translate, type Locale } from '../i18n/I18nProvider';
import { iconForNode, nodeDisplayName } from './display';
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
    const about = seededShortcut('about');
    expect(nodeDisplayName(about, tFor('es'))).toBe('Sobre mí');
    expect(nodeDisplayName(about, tFor('ca'))).toBe('Sobre mi');
    expect(nodeDisplayName(about, tFor('en'))).toBe('About me');
  });

  it('seeds the CV shortcut with a translated name and the PDF icon', () => {
    const cv = buildSeed('es', 1000).nodes.find((node) => node.shortcut?.type === 'cv');
    if (!cv) throw new Error('Missing CV shortcut');
    expect(nodeDisplayName(cv, tFor('es'))).toBe('Currículum');
    expect(nodeDisplayName(cv, tFor('en'))).toBe('Résumé (CV)');
    expect(iconForNode(cv)).toBe('doc-pdf');
  });

  it('gives the profile link shortcuts their brand icon, also on older disks', () => {
    const github = buildSeed('es', 1000).nodes.find((node) => node.name === 'GitHub.url');
    if (!github) throw new Error('Missing GitHub shortcut');
    expect(iconForNode(github)).toBe('github');
    expect(iconForNode({ ...github, icon: 'doc-web' })).toBe('github');
  });

  it('keeps a renamed shortcut as the visitor named it', () => {
    const renamed: FsNode = { ...seededShortcut('about'), name: 'Mi enlace.lnk', updatedAt: 2000 };
    expect(nodeDisplayName(renamed, tFor('en'))).toBe('Mi enlace');
  });

  it('does not translate copies made by the visitor', () => {
    const copy: FsNode = { ...seededShortcut('about'), id: 'user-copy', origin: 'user' };
    expect(nodeDisplayName(copy, tFor('en'))).toBe('Sobre mí');
  });

  it('shows the seeded portfolio files and the untouched welcome note in the interface language', () => {
    const nodes = buildSeed('es', 1000).nodes;
    const byName = (name: string) => {
      const node = nodes.find((candidate) => candidate.name === name);
      if (!node) throw new Error(`Missing seeded node: ${name}`);
      return node;
    };
    expect(nodeDisplayName(byName('Proyectos'), tFor('en'))).toBe('Projects');
    expect(nodeDisplayName(byName('Contacto.txt'), tFor('ca'))).toBe('Contacte.txt');
    const welcome = byName('Bienvenida.txt');
    expect(nodeDisplayName(welcome, tFor('en'))).toBe('Welcome.txt');
    expect(nodeDisplayName({ ...welcome, updatedAt: 2000 }, tFor('en'))).toBe('Bienvenida.txt');
  });
});
