/**
 * Personal content: edit this file to change who the desktop belongs to.
 *
 * Nothing here is invented. Values marked with PLACEHOLDER are waiting for the
 * owner to fill them in and are rendered as clearly marked placeholders.
 */
import type { Localized } from './types';
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
  centreId: string;
  status: 'current' | 'completed';
  /** Free text, for example "2024 — 2026". */
  period: string;
  title: Localized<string>;
  centre: Localized<string>;
  centreLogo: string;
  description: Localized<string>;
}

export interface ExperienceEntry {
  period: Localized<string>;
  role: Localized<string>;
  company: string;
  companyLogo: string;
  description: Localized<string>;
}

export interface SkillEntry {
  name: string;
  /** Optional, 0..100. Omit it when you do not want to show a level. */
  level?: number;
}

export interface ProfileContent {
  displayName: string;
  photoUrl: string;
  location: string;
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
  photoUrl: 'profile/nil-parra.jpg',
  location: 'Blanes, Girona',
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
    es: 'Estudiante de ASIX',
    ca: 'Estudiant d’ASIX',
    en: 'ASIX student',
  },

  bio: {
    es: [
      'Me interesa especialmente la administración de redes, la ciberseguridad y la inteligencia artificial. Estudio segundo de ASIX y tengo claro que quiero desarrollar mi carrera en el sector informático.',
      'Me gusta entender cómo funcionan los sistemas y analizar el origen de los problemas antes de buscar una solución. Los proyectos que desarrollo me permiten poner en práctica lo que aprendo y explorar distintas tecnologías.',
      'Mi siguiente paso es realizar las prácticas profesionales y continuar mi formación con el curso de especialización en Inteligencia Artificial y Big Data.',
    ],
    ca: [
      'M’interessen especialment l’administració de xarxes, la ciberseguretat i la intel·ligència artificial. Estudio segon d’ASIX i tinc clar que vull desenvolupar la meva carrera en el sector informàtic.',
      'M’agrada entendre com funcionen els sistemes i analitzar l’origen dels problemes abans de buscar una solució. Els projectes que desenvolupo em permeten posar en pràctica el que aprenc i explorar diferents tecnologies.',
      'El meu següent pas és fer les pràctiques professionals i continuar la meva formació amb el curs d’especialització en Intel·ligència Artificial i Big Data.',
    ],
    en: [
      'I am particularly interested in network administration, cybersecurity and artificial intelligence. I am in my second year of ASIX, a vocational programme in networked computer systems administration, and I know I want to build my career in IT.',
      'I like understanding how systems work and identifying the cause of a problem before looking for a solution. The projects I develop let me put what I learn into practice and explore different technologies.',
      'My next step is to complete my work placement and continue my studies with the specialisation course in Artificial Intelligence and Big Data.',
    ],
  },

  studies: [
    {
      period: '2025–2027',
      centreId: 'sa-palomera',
      status: 'current',
      centreLogo: 'education/sa-palomera.png',
      title: {
        es: 'Grado superior en Administración de Sistemas Informáticos en Red (ASIX)',
        ca: 'Grau superior en Administració de Sistemes Informàtics en Xarxa (ASIX)',
        en: 'Higher vocational qualification in Networked Computer Systems Administration (ASIX)',
      },
      centre: {
        es: 'Institut Sa Palomera, Blanes',
        ca: 'Institut Sa Palomera, Blanes',
        en: 'Institut Sa Palomera, Blanes',
      },
      description: {
        es: 'Actualmente curso segundo. Finalización prevista en 2027.',
        ca: 'Actualment curso segon. Finalització prevista el 2027.',
        en: 'Currently in my second year. Expected completion in 2027.',
      },
    },
    {
      period: '2023–2025',
      centreId: 'sa-palomera',
      status: 'completed',
      centreLogo: 'education/sa-palomera.png',
      title: {
        es: 'Grado medio en Sistemas Microinformáticos y Redes (SMX)',
        ca: 'Grau mitjà en Sistemes Microinformàtics i Xarxes (SMX)',
        en: 'Intermediate vocational qualification in Microcomputer Systems and Networks (SMX)',
      },
      centre: {
        es: 'Institut Sa Palomera, Blanes',
        ca: 'Institut Sa Palomera, Blanes',
        en: 'Institut Sa Palomera, Blanes',
      },
      description: {
        es: 'Completé el ciclo en 2025 y continué mi formación con ASIX.',
        ca: 'Vaig completar el cicle el 2025 i vaig continuar la meva formació amb ASIX.',
        en: 'I completed the programme in 2025 and continued my studies with ASIX.',
      },
    },
    {
      period: '2019–2023',
      centreId: 'cor-de-maria',
      status: 'completed',
      centreLogo: 'education/cor-de-maria.png',
      title: {
        es: 'Educación Secundaria Obligatoria (ESO)',
        ca: 'Educació Secundària Obligatòria (ESO)',
        en: 'Compulsory Secondary Education (ESO)',
      },
      centre: {
        es: 'Cor de Maria, Blanes',
        ca: 'Cor de Maria, Blanes',
        en: 'Cor de Maria, Blanes',
      },
      description: {
        es: 'Finalicé la ESO en 2023.',
        ca: 'Vaig acabar l’ESO el 2023.',
        en: 'I completed secondary education in 2023.',
      },
    },
  ],
  experience: [
    {
      period: {
        es: 'Oct. 2025 a mar. 2026 · 6 meses',
        ca: 'Oct. 2025 a març 2026 · 6 mesos',
        en: 'Oct. 2025 to Mar. 2026 · 6 months',
      },
      role: {
        es: 'Técnico',
        ca: 'Tècnic',
        en: 'Technician',
      },
      company: 'iDiomund, SL',
      companyLogo: 'experience/idiomund.png',
      description: {
        es: 'Contrato de prácticas · Blanes, Cataluña, España · Presencial',
        ca: 'Contracte de pràctiques · Blanes, Catalunya, Espanya · Presencial',
        en: 'Internship · Blanes, Catalonia, Spain · On-site',
      },
    },
  ],
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
