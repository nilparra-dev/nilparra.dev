import type { ViewportSize, WindowInstance, WindowRect } from './types';

/** Height of the taskbar, mirrored from the CSS token. */
export const TASKBAR_HEIGHT = 28;

/** Smallest window we ever allow. */
export const MIN_WINDOW_WIDTH = 180;
export const MIN_WINDOW_HEIGHT = 90;

/** Keeps at least this much of the window reachable on screen. */
const MIN_VISIBLE_X = 56;
const MIN_VISIBLE_Y = 22;

/**
 * Places a new window inside the viewport, cascading like the original shell
 * so windows never open exactly on top of each other.
 */
export function cascadeRect(
  step: number,
  size: { width: number; height: number },
  viewport: ViewportSize,
): WindowRect {
  const offset = 18;
  const shift = (step % 10) * 22;
  const maxWidth = Math.max(MIN_WINDOW_WIDTH, viewport.width - offset * 2);
  const maxHeight = Math.max(MIN_WINDOW_HEIGHT, viewport.height - offset * 2);
  const width = Math.min(size.width, maxWidth);
  const height = Math.min(size.height, maxHeight);
  const x = Math.max(0, Math.min(offset + shift, viewport.width - width - 6));
  const y = Math.max(0, Math.min(offset + shift, viewport.height - height - 6));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

/**
 * Keeps a rectangle usable: the title bar must stay on screen and the window
 * can never be smaller than its minimum. Used after moves, resizes and
 * viewport changes.
 */
export function clampRect(
  rect: WindowRect,
  viewport: ViewportSize,
  minimum: { width: number; height: number } = { width: MIN_WINDOW_WIDTH, height: MIN_WINDOW_HEIGHT },
): WindowRect {
  const width = Math.min(Math.max(rect.width, minimum.width), Math.max(minimum.width, viewport.width));
  const height = Math.min(
    Math.max(rect.height, minimum.height),
    Math.max(minimum.height, viewport.height),
  );
  const maxX = Math.max(0, viewport.width - MIN_VISIBLE_X);
  const maxY = Math.max(0, viewport.height - MIN_VISIBLE_Y);
  const minX = Math.min(0, viewport.width - width);
  const minY = 0;
  return {
    x: Math.round(Math.min(Math.max(rect.x, minX), maxX)),
    y: Math.round(Math.min(Math.max(rect.y, minY), maxY)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** The rectangle a window actually occupies right now. */
export function effectiveRect(window: WindowInstance, viewport: ViewportSize): WindowRect {
  if (window.state === 'maximized') {
    return { x: 0, y: 0, width: viewport.width, height: viewport.height };
  }
  return window.rect;
}

export function isViewportSmall(viewport: ViewportSize): boolean {
  return viewport.width <= 720;
}

export function clampViewportSize(viewport: ViewportSize): ViewportSize {
  return {
    width: Math.max(320, Math.floor(viewport.width)),
    height: Math.max(240, Math.floor(viewport.height - TASKBAR_HEIGHT)),
  };
}
