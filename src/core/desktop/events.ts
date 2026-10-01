/**
 * Things that happen inside an application and that the rest of the desktop
 * may want to react to. The applications only say what happened; they do not
 * know who listens (today, the mascot).
 */
export type DesktopEvent =
  | { type: 'game-won'; game: 'minesweeper' | 'solitaire' }
  | { type: 'game-lost'; game: 'minesweeper' };

const EVENT_NAME = 'w95:desktop-event';

export function emitDesktopEvent(event: DesktopEvent): void {
  window.dispatchEvent(new CustomEvent<DesktopEvent>(EVENT_NAME, { detail: event }));
}

/** Subscribes to the desktop events. Returns the unsubscribe function. */
export function onDesktopEvent(handler: (event: DesktopEvent) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<DesktopEvent>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
