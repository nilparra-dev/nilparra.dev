import { PROJECTS } from '../content';
import type { LaunchOptions } from './launcher';

/**
 * Addresses that open a window straight away, so a CV, a message or a post
 * can point at one part of the desktop:
 *
 *   #projects            the projects window
 *   #projects/<slug>     the projects window on that project
 *   #about               the About me window
 *   #contact             the mail window
 *
 * The hash is the only place the site can keep them: GitHub Pages serves one
 * static page and answers every other path with the 404 copy.
 */
export function parseDeepLink(hash: string): LaunchOptions | null {
  const [section, detail, ...rest] = hash
    .replace(/^#\/?/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
    .split('/');
  if (rest.length > 0) return null;

  switch (section) {
    case 'projects': {
      if (detail === undefined) return { appId: 'projects' };
      const project = PROJECTS.find((entry) => entry.slug === detail);
      return project ? { appId: 'projects', params: { projectId: project.id } } : null;
    }
    case 'about':
      return detail === undefined ? { appId: 'about' } : null;
    case 'contact':
      return detail === undefined ? { appId: 'mail' } : null;
    default:
      return null;
  }
}

/** Full address that opens the projects window on one project. */
export function projectLink(slug: string, origin: string = window.location.origin): string {
  return `${origin}${import.meta.env.BASE_URL}#projects/${slug}`;
}
