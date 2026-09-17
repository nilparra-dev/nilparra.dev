import type { IconId } from '../../assets/generated/icons';
import type { TranslationKey } from '../i18n/es';

/**
 * Application catalogue: metadata only, no components, so any module can ask
 * "which application opens this file?" without importing the UI.
 *
 * Applications are added here as they are implemented, so the Start menu never
 * lists something that does not work.
 */
export interface AppDefinition {
  id: string;
  nameKey: TranslationKey;
  icon: IconId;
  /** `single` keeps one window; `document` opens one window per document. */
  instance: 'single' | 'document';
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
  resizable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  /** Opens filling the desktop area. */
  maximized?: boolean;
  /** File extensions (lower case, with the dot) handled by the application. */
  extensions?: string[];
  /** Where the Start menu shows it. */
  startMenu?: 'main' | 'programs' | 'accessories' | 'games' | 'internet' | 'settings' | 'find-group' | 'hidden';
  /** Topic opened by the "?" caption button. */
  helpTopicId?: string;
  /** MIME prefixes handled by the application, e.g. `audio/`. */
  mimePrefixes?: string[];
}

export const APP_CATALOG: Record<string, AppDefinition> = {
  welcome: {
    id: 'welcome',
    nameKey: 'app.welcome',
    icon: 'welcome',
    instance: 'single',
    defaultSize: { width: 470, height: 330 },
    minSize: { width: 360, height: 260 },
    startMenu: 'main',
    helpTopicId: 'welcome',
  },
  help: {
    id: 'help',
    nameKey: 'app.help',
    icon: 'help',
    instance: 'single',
    defaultSize: { width: 560, height: 400 },
    minSize: { width: 320, height: 200 },
    maximizable: true,
    startMenu: 'main',
    helpTopicId: 'help',
  },
  explorer: {
    id: 'explorer',
    nameKey: 'app.explorer',
    icon: 'explorer',
    /** One window per folder, like the original shell. */
    instance: 'document',
    defaultSize: { width: 660, height: 460 },
    minSize: { width: 360, height: 220 },
    maximizable: true,
    startMenu: 'programs',
    helpTopicId: 'storage',
  },
  notepad: {
    id: 'notepad',
    nameKey: 'app.notepad',
    icon: 'notepad',
    instance: 'document',
    defaultSize: { width: 580, height: 430 },
    minSize: { width: 260, height: 160 },
    maximizable: true,
    startMenu: 'accessories',
    extensions: ['.txt', '.log', '.ini', '.md', '.csv'],
    helpTopicId: 'storage',
  },
  recyclebin: {
    id: 'recyclebin',
    nameKey: 'app.recycleBin',
    icon: 'recycle-full',
    instance: 'single',
    defaultSize: { width: 620, height: 400 },
    minSize: { width: 380, height: 220 },
    maximizable: true,
    startMenu: 'programs',
    helpTopicId: 'storage',
  },
  projects: {
    id: 'projects',
    nameKey: 'app.projects',
    icon: 'projects',
    instance: 'single',
    defaultSize: { width: 700, height: 500 },
    minSize: { width: 380, height: 260 },
    maximizable: true,
    startMenu: 'main',
  },
  about: {
    id: 'about',
    nameKey: 'app.about',
    icon: 'about-me',
    instance: 'single',
    defaultSize: { width: 640, height: 500 },
    minSize: { width: 380, height: 260 },
    maximizable: true,
    startMenu: 'main',
  },
  internet: {
    id: 'internet',
    nameKey: 'app.internet',
    icon: 'internet',
    instance: 'document',
    defaultSize: { width: 660, height: 460 },
    minSize: { width: 380, height: 260 },
    maximizable: true,
    startMenu: 'internet',
    helpTopicId: 'intro',
  },
  mail: {
    id: 'mail',
    nameKey: 'app.mail',
    icon: 'mail',
    instance: 'single',
    defaultSize: { width: 470, height: 360 },
    minSize: { width: 340, height: 240 },
    startMenu: 'internet',
  },
  controlpanel: {
    id: 'controlpanel',
    nameKey: 'app.controlPanel',
    icon: 'control-panel',
    instance: 'single',
    defaultSize: { width: 560, height: 450 },
    minSize: { width: 400, height: 300 },
    maximizable: true,
    startMenu: 'settings',
    helpTopicId: 'languages',
  },
  sysinfo: {
    id: 'sysinfo',
    nameKey: 'app.systemProperties',
    icon: 'system-properties',
    instance: 'single',
    defaultSize: { width: 470, height: 420 },
    minSize: { width: 400, height: 320 },
    startMenu: 'settings',
  },
  calculator: {
    id: 'calculator',
    nameKey: 'app.calculator',
    icon: 'calculator',
    instance: 'single',
    defaultSize: { width: 272, height: 316 },
    resizable: false,
    maximizable: false,
    startMenu: 'accessories',
  },
  paint: {
    id: 'paint',
    nameKey: 'app.paint',
    icon: 'paint',
    instance: 'document',
    defaultSize: { width: 640, height: 480 },
    minSize: { width: 380, height: 300 },
    maximizable: true,
    startMenu: 'accessories',
    extensions: ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp'],
  },
  minesweeper: {
    id: 'minesweeper',
    nameKey: 'app.minesweeper',
    icon: 'minesweeper',
    instance: 'single',
    defaultSize: { width: 320, height: 380 },
    resizable: false,
    maximizable: false,
    startMenu: 'games',
  },
  mediaplayer: {
    id: 'mediaplayer',
    nameKey: 'app.mediaPlayer',
    icon: 'media-player',
    instance: 'document',
    defaultSize: { width: 440, height: 240 },
    minSize: { width: 360, height: 180 },
    startMenu: 'accessories',
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mp4', '.webm', '.ogv', '.mov'],
    mimePrefixes: ['audio/', 'video/'],
  },
  find: {
    id: 'find',
    nameKey: 'app.find',
    icon: 'find',
    instance: 'single',
    defaultSize: { width: 560, height: 420 },
    minSize: { width: 420, height: 300 },
    maximizable: true,
    startMenu: 'find-group',
  },
  run: {
    id: 'run',
    nameKey: 'app.run',
    icon: 'run',
    instance: 'single',
    defaultSize: { width: 420, height: 200 },
    resizable: false,
    maximizable: false,
    startMenu: 'main',
  },
  console: {
    id: 'console',
    nameKey: 'app.console',
    icon: 'console',
    instance: 'document',
    defaultSize: { width: 560, height: 360 },
    minSize: { width: 380, height: 220 },
    maximizable: true,
    startMenu: 'accessories',
  },
  viewer: {
    id: 'viewer',
    nameKey: 'app.viewer',
    icon: 'doc-image',
    instance: 'document',
    defaultSize: { width: 640, height: 480 },
    minSize: { width: 320, height: 240 },
    maximizable: true,
    startMenu: 'hidden',
    extensions: ['.pdf'],
    mimePrefixes: ['application/pdf'],
  },
};

export const APP_IDS = Object.keys(APP_CATALOG);

/** Translation key of an application name, or null for unknown ids. */
export function appNameKey(appId: string): TranslationKey | null {
  return APP_CATALOG[appId]?.nameKey ?? null;
}
