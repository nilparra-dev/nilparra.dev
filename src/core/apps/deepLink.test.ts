import { describe, expect, it } from 'vitest';
import { PROJECTS } from '../content';
import { parseDeepLink, projectLink } from './deepLink';

describe('deep links', () => {
  const [first] = PROJECTS;

  it('opens the sections it knows', () => {
    expect(parseDeepLink('#projects')).toEqual({ appId: 'projects' });
    expect(parseDeepLink('#about')).toEqual({ appId: 'about' });
    expect(parseDeepLink('#contact')).toEqual({ appId: 'mail' });
  });

  it('selects a project by its slug', () => {
    expect(parseDeepLink(`#projects/${first.slug}`)).toEqual({
      appId: 'projects',
      params: { projectId: first.id },
    });
  });

  it('tolerates a leading slash, a trailing slash and capitals', () => {
    expect(parseDeepLink(`#/Projects/${first.slug.toUpperCase()}/`)).toEqual({
      appId: 'projects',
      params: { projectId: first.id },
    });
  });

  it('ignores anything else', () => {
    for (const hash of ['', '#', '#projects/unknown', '#about/extra', '#projects/a/b', '#notepad']) {
      expect(parseDeepLink(hash)).toBeNull();
    }
  });

  it('builds the address of a project on the current base path', () => {
    expect(projectLink(first.slug, 'https://example.test')).toBe(
      `https://example.test/#projects/${first.slug}`,
    );
  });
});
