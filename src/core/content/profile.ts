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

export interface LanguageEntry {
  /** BCP 47 tag, used by the structured data. */
  code: string;
  name: Localized<string>;
  level: Localized<string>;
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
  /** Where the CV PDF of each language lives, relative to the site root. */
  cvUrl: Localized<string> | null;
  cvUpdatedAt: string | null;
  links: ProfileLink[];
  tagline: Localized<string>;
  /** Paragraphs of the "About me" section. */
  bio: Localized<string[]>;
  studies: StudyEntry[];
  experience: ExperienceEntry[];
  skills: SkillGroup[];
  languages: LanguageEntry[];
  /** Free-form extras shown next to the CV (languages, certificates…). */
  extras: Localized<string[]>;
}

export const PROFILE: ProfileContent = {
  displayName: 'Nil Parra Luna',
  photoUrl: 'profile/nil-parra.jpg',
  location: 'Blanes, Girona',
  shortName: 'Nil Parra',
  email: 'nil@nilparra.dev',
  cvUrl: {
    es: 'cv/nil-parra-cv-es.pdf',
    ca: 'cv/nil-parra-cv-ca.pdf',
    en: 'cv/nil-parra-cv-en.pdf',
  },
  cvUpdatedAt: '2026-09-26',

  links: [
    {
      id: 'github',
      label: 'GitHub',
      url: 'https://github.com/nilparra-dev',
      icon: 'github',
      external: true,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/nilparra1/',
      icon: 'linkedin',
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
      'Me apasiona la ciberseguridad. Me gusta entender cómo funcionan los sistemas, identificar sus vulnerabilidades y buscar formas nuevas de protegerlos.',
      'Fuera de clase hago proyectos propios: he publicado Wooster, una herramienta para VODs de Twitch, en npm, y he hecho Antevue, un proyecto de predicción de partidos de fútbol con machine learning.',
      'Me gusta experimentar: probar enfoques distintos, comparar resultados y quedarme con lo que funciona.',
    ],
    ca: [
      'M’apassiona la ciberseguretat. M’agrada entendre com funcionen els sistemes, identificar-ne les vulnerabilitats i buscar maneres noves de protegir-los.',
      'Fora de classe faig projectes propis: he publicat Wooster, una eina per a VODs de Twitch, a npm, i he fet Antevue, un projecte de predicció de partits de futbol amb machine learning.',
      'M’agrada experimentar: provar enfocaments diferents, comparar resultats i quedar-me amb el que funciona.',
    ],
    en: [
      'I am passionate about cybersecurity. I like understanding how systems work, identifying their vulnerabilities and finding new ways to protect them.',
      'Outside class I build my own projects: I published Wooster, a Twitch VOD tool, on npm, and I built Antevue, a machine learning project that forecasts football matches.',
      'I like experimenting: trying different approaches, comparing results and keeping what works.',
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
        es: '3 nov. 2026 – actualidad',
        ca: '3 nov. 2026 – actualitat',
        en: 'Nov 3, 2026 – present',
      },
      role: {
        es: 'Becario en ciberseguridad y automatización',
        ca: 'Becari en ciberseguretat i automatització',
        en: 'Cybersecurity & Automation Intern',
      },
      company: 'SERHS',
      companyLogo: 'experience/serhs.png',
      description: {
        es: 'Prácticas de ciberseguridad y automatización en la sede de SERHS en Pineda de Mar. Presencial.',
        ca: 'Pràctiques de ciberseguretat i automatització a la seu de SERHS a Pineda de Mar. Presencial.',
        en: 'Cybersecurity and automation internship at the SERHS office in Pineda de Mar. On-site.',
      },
    },
    {
      period: {
        es: 'oct. 2024 – mar. 2025 · 6 meses',
        ca: 'oct. 2024 – març 2025 · 6 mesos',
        en: 'Oct 2024 – Mar 2025 · 6 months',
      },
      role: {
        es: 'Técnico informático en prácticas (SMX)',
        ca: 'Tècnic informàtic en pràctiques (SMX)',
        en: 'IT technician, work placement (SMX)',
      },
      company: 'iDiomund, SL',
      companyLogo: 'experience/idiomund.png',
      description: {
        es: 'Puesta a punto de equipos informáticos para la venta: desmontaje, sustitución y ampliación de componentes como la memoria RAM, configuración de los equipos y diagnóstico y reparación de averías. Documentación del estado de cada equipo configurado en el ERP Odoo, junto con la preparación y el seguimiento de los pedidos. Blanes, presencial.',
        ca: 'Posada a punt d’equips informàtics per a la venda: desmuntatge, substitució i ampliació de components com la memòria RAM, configuració dels equips i diagnòstic i reparació d’avaries. Documentació de l’estat de cada equip configurat a l’ERP Odoo, juntament amb la preparació i el seguiment de les comandes. Blanes, presencial.',
        en: 'Prepared computers for sale: disassembly, component replacement and upgrades such as RAM, system configuration, and fault diagnosis and repair. Documented the state of each configured computer in the Odoo ERP, alongside preparing and tracking orders. Blanes, on-site.',
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
  languages: [
    {
      code: 'es',
      name: { es: 'Castellano', ca: 'Castellà', en: 'Spanish' },
      level: { es: 'Nativo', ca: 'Natiu', en: 'Native' },
    },
    {
      code: 'ca',
      name: { es: 'Catalán', ca: 'Català', en: 'Catalan' },
      level: { es: 'Nativo', ca: 'Natiu', en: 'Native' },
    },
    {
      code: 'en',
      name: { es: 'Inglés', ca: 'Anglès', en: 'English' },
      level: {
        es: 'Avanzado, en torno a un C1 (sin certificar)',
        ca: 'Avançat, al voltant d’un C1 (sense certificar)',
        en: 'Advanced, around C1 (not certified)',
      },
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
