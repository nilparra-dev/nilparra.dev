/**
 * Personal content: edit this file to change who the desktop belongs to.
 *
 * Nothing here is invented. Values marked with PLACEHOLDER are waiting for the
 * owner to fill them in and are rendered as clearly marked placeholders.
 */
import { PLACEHOLDER, type Localized } from './types';
import type { IconId } from '../../assets/generated/icons';

export interface ProfileLink {
  id: string;
  /** Label shown in lists; brand names are not translated. */
  label: string;
  url: string;
  icon: IconId;
  /** Links that leave the site are opened in a real browser tab. */
  external: boolean;
}

export interface StudyEntry {
  /** Free text, for example "2024 — 2026". */
  period: string;
  title: Localized<string>;
  centre: Localized<string>;
  description: Localized<string>;
}

export interface ExperienceEntry {
  period: string;
  role: Localized<string>;
  company: string;
  description: Localized<string>;
}

export interface SkillEntry {
  name: string;
  /** Optional, 0..100. Omit it when you do not want to show a level. */
  level?: number;
}

export interface ProfileContent {
  displayName: string;
  /** Short name used by the title bars of single-instance windows. */
  shortName: string;
  email: string;
  /** Where the CV PDF lives once it exists, relative to the site root. */
  cvUrl: string | null;
  cvUpdatedAt: string | null;
  links: ProfileLink[];
  tagline: Localized<string>;
  /** Paragraphs of the "About me" section. */
  bio: Localized<string[]>;
  studies: StudyEntry[];
  experience: ExperienceEntry[];
  skills: SkillEntry[];
  /** Free-form extras shown next to the CV (languages, certificates…). */
  extras: Localized<string[]>;
}

export const PROFILE: ProfileContent = {
  displayName: 'Nil Parra Luna',
  shortName: 'Nil Parra',
  email: 'nilparra@nilparra.dev',
  // Set these two when the PDF is published inside `public/`:
  //   cvUrl: 'cv/nil-parra-cv.pdf', cvUpdatedAt: '2026-09-17'
  cvUrl: null,
  cvUpdatedAt: null,

  links: [
    {
      id: 'github',
      label: 'GitHub',
      url: 'https://github.com/nilparra-dev',
      icon: 'internet',
      external: true,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/nilparra1/',
      icon: 'internet',
      external: true,
    },
    {
      id: 'email',
      label: 'nilparra@nilparra.dev',
      url: 'mailto:nilparra@nilparra.dev',
      icon: 'mail',
      external: true,
    },
  ],

  tagline: {
    es: 'Estoy ahora mismo estudiando 2n de ASIX',
    ca: 'Ara mateix estic estudiant 2n d’ASIX',
    en: 'I am currently studying the second year of ASIX',
  },

  bio: {
    es: [
      'Estoy ahora mismo estudiando 2n de ASIX.',
      `${PLACEHOLDER} Escribe aquí dos o tres frases sobre ti: qué te interesa, con qué tecnologías te sientes cómodo y qué buscas ahora mismo.`,
    ],
    ca: [
      'Ara mateix estic estudiant 2n d’ASIX.',
      `${PLACEHOLDER} Escriu aquí dues o tres frases sobre tu: què t’interessa, amb quines tecnologies et sents còmode i què busques ara mateix.`,
    ],
    en: [
      'I am currently studying the second year of ASIX.',
      `${PLACEHOLDER} Write two or three sentences about yourself here: what you are into, which technologies you feel comfortable with and what you are looking for.`,
    ],
  },

  /**
   * Studies, experience and skills are empty on purpose: the owner of the site
   * has to add the real ones. The About window explains where to do it.
   *
   * Template:
   * {
   *   period: '2025 — 2027',
   *   title: { es: 'Ciclo formativo de grado superior', ca: '...', en: '...' },
   *   centre: { es: 'Nombre del centro', ca: '...', en: '...' },
   *   description: { es: '...', ca: '...', en: '...' },
   * }
   */
  studies: [],
  experience: [],
  skills: [],
  extras: {
    es: [],
    ca: [],
    en: [],
  },
};

/** Convenience helpers used by several applications. */
export const EMAIL = PROFILE.email;
export const EXTERNAL_LINKS = PROFILE.links.filter((link) => link.external);
