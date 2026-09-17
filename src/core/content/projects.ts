/**
 * Portfolio projects. Replace the placeholder entries with the real ones.
 *
 * Every string is localized; the screenshots are paths inside `public/`
 * (for example `portfolio/my-app-1.png`) or files imported from the virtual
 * disk later on. Leave `repoUrl` / `demoUrl` as null when they do not exist.
 */
import { PLACEHOLDER, type Localized } from './types';

export interface ProjectScreenshot {
  src: string;
  alt: Localized<string>;
}

export interface ProjectContent {
  id: string;
  slug: string;
  title: Localized<string>;
  summary: Localized<string>;
  description: Localized<string>;
  technologies: string[];
  repoUrl: string | null;
  demoUrl: string | null;
  screenshots: ProjectScreenshot[];
  year: string | null;
  /**
   * `placeholder` entries are shown with a visible "placeholder" badge so a
   * visitor never reads them as real work.
   */
  status: 'published' | 'placeholder';
}

export const PROJECTS: ProjectContent[] = [
  {
    id: 'placeholder-1',
    slug: 'proyecto-1',
    title: {
      es: 'Proyecto 1',
      ca: 'Projecte 1',
      en: 'Project 1',
    },
    summary: {
      es: `${PLACEHOLDER} resumen corto`,
      ca: `${PLACEHOLDER} resum curt`,
      en: `${PLACEHOLDER} short summary`,
    },
    description: {
      es: `${PLACEHOLDER} Sustituye este texto por la descripción real del proyecto: qué hace, qué problema resuelve y qué aprendiste. Edítalo en src/core/content/projects.ts.`,
      ca: `${PLACEHOLDER} Substitueix aquest text per la descripció real del projecte: què fa, quin problema resol i què hi vas aprendre. Edita’l a src/core/content/projects.ts.`,
      en: `${PLACEHOLDER} Replace this text with the real description of the project: what it does, which problem it solves and what you learned. Edit it in src/core/content/projects.ts.`,
    },
    technologies: [],
    repoUrl: null,
    demoUrl: null,
    screenshots: [],
    year: null,
    status: 'placeholder',
  },
  {
    id: 'placeholder-2',
    slug: 'proyecto-2',
    title: {
      es: 'Proyecto 2',
      ca: 'Projecte 2',
      en: 'Project 2',
    },
    summary: {
      es: `${PLACEHOLDER} resumen corto`,
      ca: `${PLACEHOLDER} resum curt`,
      en: `${PLACEHOLDER} short summary`,
    },
    description: {
      es: `${PLACEHOLDER} Descripción del segundo proyecto.`,
      ca: `${PLACEHOLDER} Descripció del segon projecte.`,
      en: `${PLACEHOLDER} Description of the second project.`,
    },
    technologies: [],
    repoUrl: null,
    demoUrl: null,
    screenshots: [],
    year: null,
    status: 'placeholder',
  },
  {
    id: 'placeholder-3',
    slug: 'proyecto-3',
    title: {
      es: 'Proyecto 3',
      ca: 'Projecte 3',
      en: 'Project 3',
    },
    summary: {
      es: `${PLACEHOLDER} resumen corto`,
      ca: `${PLACEHOLDER} resum curt`,
      en: `${PLACEHOLDER} short summary`,
    },
    description: {
      es: `${PLACEHOLDER} Descripción del tercer proyecto.`,
      ca: `${PLACEHOLDER} Descripció del tercer projecte.`,
      en: `${PLACEHOLDER} Description of the third project.`,
    },
    technologies: [],
    repoUrl: null,
    demoUrl: null,
    screenshots: [],
    year: null,
    status: 'placeholder',
  },
];

export function findProject(slug: string): ProjectContent | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}
