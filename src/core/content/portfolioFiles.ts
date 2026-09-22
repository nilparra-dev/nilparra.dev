/**
 * Content of the files that ship inside the virtual disk.
 *
 * They are generated from the personal content (profile and projects) so the
 * portfolio folder is always in sync with the site, and they can be restored
 * to this initial version from the Control Panel.
 */
import type { Locale } from '../i18n/I18nProvider';
import { PROFILE } from './profile';
import { PROJECTS, type ProjectContent } from './projects';
import { TECHNOLOGIES } from './technologies';
import type { Localized } from './types';
import { pick } from './types';

export interface PortfolioFileSeed {
  /** Path relative to C:\Portfolio, without the file name. */
  folder: string[];
  name: string;
  content: Localized<string>;
}

const README: Localized<string> = {
  es: [
    'C:\\Portfolio',
    '=============',
    '',
    'Esta carpeta contiene el portfolio de Nil Parra Luna tal y como lo publica la web.',
    'Es contenido de solo lectura: si lo editas en el Bloc de notas tendrás que usar',
    '"Guardar como" para crear una copia, porque la versión original se conserva.',
    '',
    'Puedes recuperar esta versión inicial en cualquier momento desde el Panel de control',
    '(Restablecer el contenido del portfolio).',
    '',
    'Los archivos son un espejo de src/core/content en el repositorio del proyecto.',
  ].join('\n'),
  ca: [
    'C:\\Portfolio',
    '=============',
    '',
    'Aquesta carpeta conté el portfolio de Nil Parra Luna tal com el publica la web.',
    'És contingut de només lectura: si l’edites al Bloc de notes hauràs de fer servir',
    '"Anomena i desa" per crear-ne una còpia, perquè la versió original es conserva.',
    '',
    'Pots recuperar aquesta versió inicial en qualsevol moment des del Tauler de control',
    '(Restableix el contingut del portfolio).',
    '',
    'Els fitxers són un mirall de src/core/content al repositori del projecte.',
  ].join('\n'),
  en: [
    'C:\\Portfolio',
    '=============',
    '',
    'This folder holds the portfolio of Nil Parra Luna as published by the website.',
    'It is read only content: editing it in Notepad requires "Save as" to create a',
    'copy, because the original version is kept.',
    '',
    'You can restore this initial version at any time from the Control Panel',
    '(Restore the portfolio content).',
    '',
    'These files mirror src/core/content in the project repository.',
  ].join('\n'),
};

const ABOUT: Localized<string> = {
  es: [
    PROFILE.displayName,
    '='.repeat(PROFILE.displayName.length),
    '',
    pick(PROFILE.tagline, 'es'),
    '',
    ...pick(PROFILE.bio, 'es'),
    '',
    'Enlaces:',
    ...PROFILE.links.map((link) => `- ${link.label}: ${link.url}`),
    '',
    'Correo: ' + PROFILE.email,
  ].join('\n'),
  ca: [
    PROFILE.displayName,
    '='.repeat(PROFILE.displayName.length),
    '',
    pick(PROFILE.tagline, 'ca'),
    '',
    ...pick(PROFILE.bio, 'ca'),
    '',
    'Enllaços:',
    ...PROFILE.links.map((link) => `- ${link.label}: ${link.url}`),
    '',
    'Correu: ' + PROFILE.email,
  ].join('\n'),
  en: [
    PROFILE.displayName,
    '='.repeat(PROFILE.displayName.length),
    '',
    pick(PROFILE.tagline, 'en'),
    '',
    ...pick(PROFILE.bio, 'en'),
    '',
    'Links:',
    ...PROFILE.links.map((link) => `- ${link.label}: ${link.url}`),
    '',
    'Email: ' + PROFILE.email,
  ].join('\n'),
};

const CONTACT: Localized<string> = {
  es: [
    'Contacto',
    '========',
    '',
    `Correo: ${PROFILE.email}`,
    ...PROFILE.links.filter((link) => !link.url.startsWith('mailto')).map((link) => `${link.label}: ${link.url}`),
    '',
    'La ventana de Correo del escritorio permite copiar la dirección y abrir tu',
    'cliente de correo con un enlace mailto. No se envía nada desde la web.',
  ].join('\n'),
  ca: [
    'Contacte',
    '========',
    '',
    `Correu: ${PROFILE.email}`,
    ...PROFILE.links.filter((link) => !link.url.startsWith('mailto')).map((link) => `${link.label}: ${link.url}`),
    '',
    'La finestra de Correu de l’escriptori permet copiar l’adreça i obrir el teu',
    'client de correu amb un enllaç mailto. No s’envia res des de la web.',
  ].join('\n'),
  en: [
    'Contact',
    '=======',
    '',
    `Email: ${PROFILE.email}`,
    ...PROFILE.links.filter((link) => !link.url.startsWith('mailto')).map((link) => `${link.label}: ${link.url}`),
    '',
    'The Mail window of the desktop can copy the address and open your mail client',
    'through a mailto link. Nothing is sent from the website.',
  ].join('\n'),
};

const PROJECTS_README: Localized<string> = {
  es: [
    'Proyectos',
    '=========',
    '',
    'Un archivo por proyecto, generado desde src/core/content/projects.ts.',
    'Las entradas marcadas como [PENDIENTE] son plantillas, no trabajo inventado.',
  ].join('\n'),
  ca: [
    'Projectes',
    '=========',
    '',
    'Un fitxer per projecte, generat des de src/core/content/projects.ts.',
    'Les entrades marcades com [PENDIENTE] són plantilles, no treball inventat.',
  ].join('\n'),
  en: [
    'Projects',
    '========',
    '',
    'One file per project, generated from src/core/content/projects.ts.',
    'Entries marked as [PENDIENTE] are templates, not invented work.',
  ].join('\n'),
};

/** Demo line for published projects that deliberately have no public demo. */
const NO_PUBLIC_DEMO: Localized<string> = {
  es: 'Sin demo pública',
  ca: 'Sense demo pública',
  en: 'No public demo',
};

const CLOSED_REPO: Localized<string> = {
  es: 'Privado (código cerrado)',
  ca: 'Privat (codi tancat)',
  en: 'Private (closed source)',
};

const NO_REPO: Localized<string> = {
  es: 'Sin repositorio público',
  ca: 'Sense repositori públic',
  en: 'No public repository',
};

/** Repository line for the generated files, with the same states as the card. */
function repoLine(project: ProjectContent | undefined, locale: Locale): string {
  if (project?.repo.kind === 'public') return project.repo.url;
  if (project?.repo.kind === 'closed') return pick(CLOSED_REPO, locale);
  return project?.status === 'published' ? pick(NO_REPO, locale) : '[PENDIENTE]';
}

/** Long description joined into a single block for the generated .txt files. */
function descriptionText(project: ProjectContent | undefined, locale: Locale): string {
  return pick(project?.description ?? { es: [''], ca: [''], en: [''] }, locale).join('\n\n');
}

function projectFile(index: number): PortfolioFileSeed {
  const project = PROJECTS[index];
  const label = project ? project.title : { es: `Proyecto ${index + 1}`, ca: `Projecte ${index + 1}`, en: `Project ${index + 1}` };
  const body: Localized<string> = {
    es: [
      pick(label, 'es'),
      '='.repeat(pick(label, 'es').length),
      '',
      descriptionText(project, 'es'),
      '',
      `Tecnologías: ${project?.technologies.length ? project.technologies.map((id) => TECHNOLOGIES[id].name).join(', ') : '[PENDIENTE]'}`,
      `Repositorio: ${repoLine(project, 'es')}`,
      `Demo: ${project?.demoUrl ?? (project?.status === 'published' ? pick(NO_PUBLIC_DEMO, 'es') : '[PENDIENTE]')}`,
    ].join('\n'),
    ca: [
      pick(label, 'ca'),
      '='.repeat(pick(label, 'ca').length),
      '',
      descriptionText(project, 'ca'),
      '',
      `Tecnologies: ${project?.technologies.length ? project.technologies.map((id) => TECHNOLOGIES[id].name).join(', ') : '[PENDIENTE]'}`,
      `Repositori: ${repoLine(project, 'ca')}`,
      `Demo: ${project?.demoUrl ?? (project?.status === 'published' ? pick(NO_PUBLIC_DEMO, 'ca') : '[PENDIENTE]')}`,
    ].join('\n'),
    en: [
      pick(label, 'en'),
      '='.repeat(pick(label, 'en').length),
      '',
      descriptionText(project, 'en'),
      '',
      `Technologies: ${project?.technologies.length ? project.technologies.map((id) => TECHNOLOGIES[id].name).join(', ') : '[PENDIENTE]'}`,
      `Repository: ${repoLine(project, 'en')}`,
      `Demo: ${project?.demoUrl ?? (project?.status === 'published' ? pick(NO_PUBLIC_DEMO, 'en') : '[PENDIENTE]')}`,
    ].join('\n'),
  };
  return {
    folder: ['Proyectos'],
    name: `${project?.slug ?? `proyecto-${index + 1}`}.txt`,
    content: body,
  };
}

/** Files copied into C:\Portfolio the first time (and on restore). */
export function portfolioFiles(locale: Locale): Array<{ folder: string[]; name: string; content: string }> {
  const seeds: PortfolioFileSeed[] = [
    { folder: [], name: 'README.txt', content: README },
    { folder: [], name: 'Sobre-mi.txt', content: ABOUT },
    { folder: [], name: 'Contacto.txt', content: CONTACT },
    { folder: ['Proyectos'], name: 'README.txt', content: PROJECTS_README },
    ...PROJECTS.map((_, index) => projectFile(index)),
  ];
  return seeds.map((seed) => ({
    folder: seed.folder.flatMap((segment) => segment.split('\\')),
    name: seed.name,
    content: pick(seed.content, locale),
  }));
}

/** Initial note that the visitor finds in Documents (editable). */
export function welcomeNote(locale: Locale): string {
  const text: Localized<string> = {
    es: [
      'Bienvenido a tu disco C:',
      '=======================',
      '',
      'Esta carpeta es tuya: puedes crear carpetas, escribir documentos con el Bloc de',
      'notas y guardarlos aquí. Todo se guarda en este navegador (IndexedDB), no viaja',
      'a ningún servidor.',
      '',
      'Prueba a:',
      '  1. Crear una carpeta con el botón derecho > Nuevo > Carpeta.',
      '  2. Abrir el Bloc de notas, escribir algo y usar Archivo > Guardar como.',
      '  3. Recargar la página: el documento seguirá ahí.',
      '',
      'C:\\Portfolio es contenido del autor y es de solo lectura.',
    ].join('\n'),
    ca: [
      'Benvingut al teu disc C:',
      '========================',
      '',
      'Aquesta carpeta és teva: pots crear carpetes, escriure documents amb el Bloc de',
      'notes i desar-los aquí. Tot es guarda en aquest navegador (IndexedDB), no viatja',
      'enlloc.',
      '',
      'Prova de:',
      '  1. Crear una carpeta amb el botó dret > Nou > Carpeta.',
      '  2. Obrir el Bloc de notes, escriure-hi alguna cosa i fer servir "Anomena i desa".',
      '  3. Recarregar la pàgina: el document seguirà allà.',
      '',
      'C:\\Portfolio és contingut de l’autor i és de només lectura.',
    ].join('\n'),
    en: [
      'Welcome to your C: drive',
      '========================',
      '',
      'This folder is yours: you can create folders, write documents with Notepad and',
      'save them here. Everything is stored in this browser (IndexedDB); nothing is',
      'uploaded anywhere.',
      '',
      'Try this:',
      '  1. Create a folder with the right mouse button > New > Folder.',
      '  2. Open Notepad, type something and use File > Save as.',
      '  3. Reload the page: the document is still there.',
      '',
      'C:\\Portfolio is the author content and is read only.',
    ].join('\n'),
  };
  return pick(text, locale);
}
