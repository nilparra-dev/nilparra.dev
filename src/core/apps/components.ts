import type { AppComponent } from './launcher';
import { WelcomeApp } from '../../apps/welcome/WelcomeApp';
import { HelpApp } from '../../apps/help/HelpApp';
import { ExplorerApp } from '../../apps/explorer/ExplorerApp';
import { NotepadApp } from '../../apps/notepad/NotepadApp';
import { RecycleBinApp } from '../../apps/recyclebin/RecycleBinApp';
import { ProjectsApp } from '../../apps/projects/ProjectsApp';
import { AboutApp } from '../../apps/about/AboutApp';
import { InternetApp } from '../../apps/internet/InternetApp';
import { MailApp } from '../../apps/mail/MailApp';
import { ControlPanelApp } from '../../apps/controlpanel/ControlPanelApp';
import { SystemInfoApp } from '../../apps/sysinfo/SystemInfoApp';
import { PaintApp } from '../../apps/paint/PaintApp';
import { MediaPlayerApp } from '../../apps/mediaplayer/MediaPlayerApp';
import { FindApp } from '../../apps/find/FindApp';
import { ViewerApp } from '../../apps/viewer/ViewerApp';
import { CalculatorApp } from '../../apps/calculator/CalculatorApp';
import { MinesweeperApp } from '../../apps/minesweeper/MinesweeperApp';
import { RunApp } from '../../apps/run/RunApp';
import { ConsoleApp } from '../../apps/console/ConsoleApp';

/**
 * Application id -> component.
 *
 * Kept apart from the catalogue so applications can open each other without
 * circular imports, and so the Start menu can list only what really exists.
 */
export const APP_COMPONENTS: Record<string, AppComponent> = {
  welcome: WelcomeApp,
  help: HelpApp,
  explorer: ExplorerApp,
  notepad: NotepadApp,
  recyclebin: RecycleBinApp,
  projects: ProjectsApp,
  about: AboutApp,
  internet: InternetApp,
  mail: MailApp,
  controlpanel: ControlPanelApp,
  sysinfo: SystemInfoApp,
  paint: PaintApp,
  mediaplayer: MediaPlayerApp,
  find: FindApp,
  viewer: ViewerApp,
  calculator: CalculatorApp,
  minesweeper: MinesweeperApp,
  run: RunApp,
  console: ConsoleApp,
};
