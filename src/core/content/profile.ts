/**
 * Personal content: edit this file to change who the desktop belongs to.
 *
 * Nothing here is invented. Values marked with PLACEHOLDER are waiting for the
 * owner to fill them in and are rendered as clearly marked placeholders.
 */
import type { TechnologyId } from './technologies';
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
  /** Name and logo come from the shared technology catalogue. */
  technology: TechnologyId;
  /** Optional, 0..100. Omit it when you do not want to show a level. */
  level?: number;
}

/** Skills shown together under one heading, such as networks or databases. */
export interface SkillGroup {
  title: Localized<string>;
  skills: SkillEntry[];
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
  skills: SkillGroup[];
  /** Free-form extras shown next to the CV (languages, certificates…). */
  extras: Localized<string[]>;
}

export const PROFILE: ProfileContent = {
  displayName: 'Nil Parra Luna',
  photoUrl: 'profile/nil-parra.jpg',
  location: 'Blanes, Girona',
  shortName: 'Nil Parra',
  email: 'nil@nilparra.dev',
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
      label: 'nil@nilparra.dev',
      url: 'mailto:nil@nilparra.dev',
      icon: 'mail',
      external: true,
    },
  ],

  tagline: {
    es: 'Estudiante de Administración de Sistemas Informáticos en Red (ASIX)',
    ca: 'Estudiant d’Administració de Sistemes Informàtics en Xarxa (ASIX)',
    en: 'Networked Computer Systems Administration student (ASIX)',
  },

  bio: {
    es: [
      'Estudio segundo de ASIX en el Institut Sa Palomera, en Blanes. Me interesan la administración de redes, la ciberseguridad y la inteligencia artificial.',
      'Me gusta entender cómo funcionan los sistemas y encontrar la causa de un problema antes de buscar la solución. Fuera de clase lo aplico en proyectos propios: una herramienta de línea de comandos publicada en npm y un sistema de predicción con machine learning que se ejecuta de forma autónoma en Linux.',
      'Al terminar ASIX quiero continuar con el curso de especialización en Inteligencia Artificial y Big Data.',
    ],
    ca: [
      'Estudio segon d’ASIX a l’Institut Sa Palomera, a Blanes. M’interessen l’administració de xarxes, la ciberseguretat i la intel·ligència artificial.',
      'M’agrada entendre com funcionen els sistemes i trobar la causa d’un problema abans de buscar-ne la solució. Fora de classe ho aplico en projectes propis: una eina de línia d’ordres publicada a npm i un sistema de predicció amb machine learning que s’executa de manera autònoma a Linux.',
      'Quan acabi ASIX vull continuar amb el curs d’especialització en Intel·ligència Artificial i Big Data.',
    ],
    en: [
      'I am in my second year of ASIX, a two-year vocational programme in networked computer systems administration, at Institut Sa Palomera in Blanes. I am interested in network administration, cybersecurity and artificial intelligence.',
      'I like understanding how systems work and finding the cause of a problem before looking for a fix. Outside class I put that into practice in my own projects: a command-line tool published on npm and a machine learning forecasting system that runs unattended on Linux.',
      'After ASIX I plan to take the specialisation course in Artificial Intelligence and Big Data.',
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
        es: 'Segundo curso.',
        ca: 'Segon curs.',
        en: 'Second year.',
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
        es: 'Ciclo completado, con las prácticas en empresa en iDiomund.',
        ca: 'Cicle completat, amb les pràctiques en empresa a iDiomund.',
        en: 'Completed, including the work placement at iDiomund.',
      },
    },
  ],
  experience: [
    {
      period: {
        es: 'Oct. 2025 – mar. 2026 · 6 meses',
        ca: 'Oct. 2025 – març 2026 · 6 mesos',
        en: 'Oct 2025 – Mar 2026 · 6 months',
      },
      role: {
        es: 'Técnico en prácticas (SMX)',
        ca: 'Tècnic en pràctiques (SMX)',
        en: 'Technician, work placement (SMX)',
      },
      company: 'iDiomund, SL',
      companyLogo: 'experience/idiomund.png',
      description: {
        es: 'Preparación y seguimiento de pedidos en el ERP Odoo, y alta y mantenimiento de los productos del catálogo, incluidas sus fotografías. Blanes, presencial.',
        ca: 'Preparació i seguiment de comandes a l’ERP Odoo, i alta i manteniment dels productes del catàleg, incloses les fotografies. Blanes, presencial.',
        en: 'Prepared and tracked orders in the Odoo ERP, and created and maintained catalogue products, including their photos. Blanes, on-site.',
      },
    },
  ],
  skills: [
    {
      title: { es: 'Sistemas operativos', ca: 'Sistemes operatius', en: 'Operating systems' },
      skills: [
        { technology: 'linux' },
        { technology: 'ubuntu' },
        { technology: 'debian' },
        { technology: 'windowsServer' },
        { technology: 'bash' },
        { technology: 'powershell' },
      ],
    },
    {
      title: { es: 'Redes y servicios', ca: 'Xarxes i serveis', en: 'Networks and services' },
      skills: [
        { technology: 'cisco' },
        { technology: 'nginx' },
        { technology: 'apache' },
        { technology: 'wireshark' },
      ],
    },
    {
      title: {
        es: 'Virtualización y seguridad',
        ca: 'Virtualització i seguretat',
        en: 'Virtualisation and security',
      },
      skills: [
        { technology: 'proxmox' },
        { technology: 'virtualbox' },
        { technology: 'docker' },
        { technology: 'pfsense' },
      ],
    },
    {
      title: { es: 'Automatización', ca: 'Automatització', en: 'Automation' },
      skills: [
        { technology: 'ansible' },
        { technology: 'git' },
        { technology: 'githubActions' },
        { technology: 'airflow' },
        { technology: 'grafana' },
      ],
    },
    {
      title: { es: 'Bases de datos', ca: 'Bases de dades', en: 'Databases' },
      skills: [{ technology: 'postgresql' }, { technology: 'mysql' }, { technology: 'mariadb' }],
    },
    {
      title: { es: 'Programación y web', ca: 'Programació i web', en: 'Programming and web' },
      skills: [
        { technology: 'python' },
        { technology: 'typescript' },
        { technology: 'php' },
        { technology: 'html' },
        { technology: 'css' },
      ],
    },
    {
      title: { es: 'Empresa', ca: 'Empresa', en: 'Business software' },
      skills: [{ technology: 'odoo' }],
    },
  ],
  extras: {
    es: [],
    ca: [],
    en: [],
  },
};

/** Convenience helpers used by several applications. */
export const EMAIL = PROFILE.email;
export const EXTERNAL_LINKS = PROFILE.links.filter((link) => link.external);
