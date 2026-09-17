import type { IconId } from '../../assets/generated/icons';

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export type WindowState = 'normal' | 'minimized' | 'maximized';

/**
 * One open window.
 *
 * `rect` is always the *restored* rectangle: a maximised window keeps its
 * previous geometry so restoring it puts the window back where it was, which
 * also makes the layout survive a resolution change.
 */
export interface WindowInstance {
  id: string;
  appId: string;
  title: string;
  icon: IconId;
  rect: WindowRect;
  state: WindowState;
  z: number;
  resizable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  minWidth: number;
  minHeight: number;
  /** Launch arguments: file ids, paths, search terms… They must be serialisable. */
  params: Record<string, unknown>;
  /** Identifies "one window per document" applications. */
  docKey: string | null;
  /** Optional help topic opened by the "?" caption button. */
  helpTopicId: string | null;
  createdAt: number;
}

/** Window description used when opening a new one. */
export interface NewWindow extends Omit<WindowInstance, 'z' | 'createdAt' | 'rect' | 'state'> {
  rect?: WindowRect;
  /** Preferred size; the manager cascades it inside the viewport. */
  size?: { width: number; height: number };
  state?: WindowState;
}

export interface WindowManagerState {
  windows: WindowInstance[];
  viewport: ViewportSize;
  /** Counter used to hand out the next z index. */
  nextZ: number;
  /** Cascade position for the next window that does not bring its own rect. */
  cascadeStep: number;
}

export type WindowAction =
  | { type: 'open'; window: NewWindow }
  | { type: 'close'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'minimize'; id: string }
  | { type: 'maximize'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'toggle'; id: string }
  | { type: 'move'; id: string; rect: WindowRect }
  | { type: 'resize'; id: string; rect: WindowRect }
  | { type: 'setTitle'; id: string; title: string }
  | { type: 'setParams'; id: string; params: Record<string, unknown> }
  | { type: 'setViewport'; viewport: ViewportSize }
  | { type: 'minimizeAll' }
  | { type: 'closeAll' }
  | { type: 'resetLayout' }
  | { type: 'hydrate'; windows: WindowInstance[] };
