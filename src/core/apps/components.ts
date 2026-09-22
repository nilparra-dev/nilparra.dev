import { lazy, type ComponentType } from 'react';
import type { AppComponent, AppRenderProps } from './launcher';
import { WelcomeApp } from '../../apps/welcome/WelcomeApp';
import { HelpApp } from '../../apps/help/HelpApp';
import { ProjectsApp } from '../../apps/projects/ProjectsApp';
import { AboutApp } from '../../apps/about/AboutApp';
import { MailApp } from '../../apps/mail/MailApp';

/** Loader of an application that is split out of the first bundle. */
type AppLoader = () => Promise<AppComponent>;

/**
 * Everything a visitor does not need to read the portfolio (games, tools,
 * the file manager) lives in its own chunk. Each loader is memoised so the
 * idle preload and a real open share one download.
 */
const LAZY_LOADERS: Record<string, AppLoader> = {
  explorer: () => import('../../apps/explorer/ExplorerApp').then((m) => m.ExplorerApp),
  notepad: () => import('../../apps/notepad/NotepadApp').then((m) => m.NotepadApp),
  recyclebin: () => import('../../apps/recyclebin/RecycleBinApp').then((m) => m.RecycleBinApp),
  internet: () => import('../../apps/internet/InternetApp').then((m) => m.InternetApp),
  controlpanel: () => import('../../apps/controlpanel/ControlPanelApp').then((m) => m.ControlPanelApp),
  sysinfo: () => import('../../apps/sysinfo/SystemInfoApp').then((m) => m.SystemInfoApp),
  paint: () => import('../../apps/paint/PaintApp').then((m) => m.PaintApp),
  mediaplayer: () => import('../../apps/mediaplayer/MediaPlayerApp').then((m) => m.MediaPlayerApp),
  find: () => import('../../apps/find/FindApp').then((m) => m.FindApp),
  viewer: () => import('../../apps/viewer/ViewerApp').then((m) => m.ViewerApp),
  calculator: () => import('../../apps/calculator/CalculatorApp').then((m) => m.CalculatorApp),
  minesweeper: () => import('../../apps/minesweeper/MinesweeperApp').then((m) => m.MinesweeperApp),
  solitaire: () => import('../../apps/solitaire/SolitaireApp').then((m) => m.SolitaireApp),
  poker: () => import('../../apps/poker/PokerApp').then((m) => m.PokerApp),
  run: () => import('../../apps/run/RunApp').then((m) => m.RunApp),
  console: () => import('../../apps/console/ConsoleApp').then((m) => m.ConsoleApp),
};

const loads = new Map<string, Promise<AppComponent>>();

function load(appId: string): Promise<AppComponent> {
  let pending = loads.get(appId);
  if (!pending) {
    pending = LAZY_LOADERS[appId]();
    /* A failed download (offline, new deploy) may be retried on the next open. */
    pending.catch(() => loads.delete(appId));
    loads.set(appId, pending);
  }
  return pending;
}

/** Downloads every split application; called when the desktop is idle. */
export async function preloadApps(): Promise<void> {
  await Promise.all(Object.keys(LAZY_LOADERS).map((appId) => load(appId)));
}

const LAZY_COMPONENTS = Object.fromEntries(
  Object.keys(LAZY_LOADERS).map((appId) => [
    appId,
    lazy(async () => ({ default: await load(appId) })),
  ]),
);

/**
 * Application id -> component.
 *
 * Kept apart from the catalogue so applications can open each other without
 * circular imports, and so the Start menu can list only what really exists.
 */
export const APP_COMPONENTS: Record<string, ComponentType<AppRenderProps>> = {
  ...LAZY_COMPONENTS,
  welcome: WelcomeApp,
  help: HelpApp,
  projects: ProjectsApp,
  about: AboutApp,
  mail: MailApp,
};
