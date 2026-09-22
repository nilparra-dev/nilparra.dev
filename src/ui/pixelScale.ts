/**
 * Integer pixel scaling of the whole desktop.
 *
 * MS Sans Serif is a bitmap design on an 11 px grid (every glyph pixel is
 * 2048 / 11 font units), and the icons are pixel art. Both only stay sharp
 * when one interface pixel covers a whole number of screen pixels. The page
 * zoom is therefore chosen so that `zoom * devicePixelRatio` is an integer:
 * the "pixel scale". Any other factor rounds some strokes to one screen pixel
 * and others to two, which is what makes scaled bitmap text look uneven.
 */

/** A stored choice: follow the screen, or force a pixel scale. */
export type PixelScalePreference = 'auto' | number;

/** Text size, in CSS pixels, the automatic choice aims for (1.5 x 11 px). */
const TARGET_TEXT_CSS_PX = 16.5;
const FONT_GRID_PX = 11;
const MAX_PIXEL_SCALE = 6;

export interface ScreenMetrics {
  /** CSS viewport size without any page zoom. */
  width: number;
  height: number;
  devicePixelRatio: number;
}

/**
 * Smallest desktop, in interface pixels, a pixel scale must leave. Narrow
 * screens already switch to the compact layout, so they only need a phone
 * sized surface; everything else keeps room for floating windows.
 */
function minimumDesktop(screen: ScreenMetrics): { width: number; height: number } {
  return screen.width < 720 ? { width: 320, height: 480 } : { width: 800, height: 520 };
}

/** Every pixel scale that still leaves a usable desktop, smallest first. */
export function availablePixelScales(screen: ScreenMetrics): number[] {
  const dpr = screen.devicePixelRatio > 0 ? screen.devicePixelRatio : 1;
  const minimum = minimumDesktop(screen);
  const deviceWidth = screen.width * dpr;
  const deviceHeight = screen.height * dpr;
  const largest = Math.min(
    MAX_PIXEL_SCALE,
    Math.floor(deviceWidth / minimum.width),
    Math.floor(deviceHeight / minimum.height),
  );
  const scales: number[] = [];
  for (let scale = 1; scale <= Math.max(1, largest); scale += 1) scales.push(scale);
  return scales;
}

/** The scale whose text size is closest to the target, within what fits. */
export function automaticPixelScale(screen: ScreenMetrics): number {
  const dpr = screen.devicePixelRatio > 0 ? screen.devicePixelRatio : 1;
  const wanted = Math.max(1, Math.round((TARGET_TEXT_CSS_PX / FONT_GRID_PX) * dpr));
  const scales = availablePixelScales(screen);
  return Math.min(wanted, scales[scales.length - 1]);
}

export function resolvePixelScale(preference: PixelScalePreference, screen: ScreenMetrics): number {
  const scales = availablePixelScales(screen);
  if (preference !== 'auto' && scales.includes(preference)) return preference;
  return automaticPixelScale(screen);
}

export function isPixelScalePreference(value: unknown): value is PixelScalePreference {
  return value === 'auto' || (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_PIXEL_SCALE);
}

export function currentScreen(): ScreenMetrics {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

let activePreference: PixelScalePreference = 'auto';

/**
 * Sets the page zoom for a preference and tells the layout to measure again.
 * Returns the pixel scale in use.
 */
export function applyPixelScale(preference: PixelScalePreference = activePreference): number {
  activePreference = preference;
  const screen = currentScreen();
  const scale = resolvePixelScale(preference, screen);
  const zoom = scale / screen.devicePixelRatio;
  const root = document.documentElement;
  const next = String(zoom);
  if (root.style.zoom !== next) {
    root.style.zoom = next;
    /* Stylesheets divide viewport units by it (100vw is in screen pixels). */
    root.style.setProperty('--w95-ui-scale', next);
    root.dataset.pixelScale = String(scale);
    /* The window manager and the icon grid measure the desktop on resize. */
    window.dispatchEvent(new Event('resize'));
  }
  return scale;
}

/**
 * Keeps the scale right when the window is resized or moved to a screen with
 * another density (browser zoom changes the device pixel ratio as well).
 * Installed before React mounts so it runs ahead of the layout listeners.
 */
export function installPixelScale(preference: PixelScalePreference): void {
  applyPixelScale(preference);
  let lastRatio = window.devicePixelRatio;
  let lastSize = `${window.innerWidth}x${window.innerHeight}`;
  window.addEventListener('resize', () => {
    const size = `${window.innerWidth}x${window.innerHeight}`;
    if (window.devicePixelRatio === lastRatio && size === lastSize) return;
    lastRatio = window.devicePixelRatio;
    lastSize = size;
    applyPixelScale();
  });
}
