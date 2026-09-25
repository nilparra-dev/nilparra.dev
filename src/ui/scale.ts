import { applyCursorScale } from './cursors';

/** Size the interface was drawn for: 125% of the 96 dpi original. */
const DESIGN_SCALE = 1.25;
/** Below this zoom the bitmap font gets too small to read comfortably. */
const MIN_SCALE = 1;

/**
 * Zoom that keeps the pixel art crisp: every interface pixel covers a whole
 * number of device pixels, because a fractional zoom (1.25 on a 1x screen)
 * smears icons and the bitmap font across pixel boundaries. The largest such
 * zoom between MIN_SCALE and the design size wins; it is never larger than
 * the design size, so the desktop never gets more cramped. When there is
 * none (a 125% or 150% laptop), the design size stays and the art is
 * slightly soft.
 */
export function pixelPerfectScale(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) return DESIGN_SCALE;
  const scale = Math.floor(devicePixelRatio * DESIGN_SCALE) / devicePixelRatio;
  return scale >= MIN_SCALE ? scale : DESIGN_SCALE;
}

/**
 * Applies the pixel perfect zoom, and the cursor size that matches it, now
 * and whenever the viewport or the device pixel ratio changes (browser zoom,
 * moving the window to another monitor).
 * Call it before the first render: its resize listener must run before the
 * ones that measure the desktop in interface pixels.
 */
export function installPixelPerfectScale(): void {
  const apply = () => {
    const scale = pixelPerfectScale(window.devicePixelRatio);
    document.documentElement.style.setProperty('--w95-ui-scale', String(scale));
    applyCursorScale(scale, window.devicePixelRatio);
  };
  apply();
  window.addEventListener('resize', apply);
}

/** CSS zoom scales rendering; pointer events and client rectangles remain in screen pixels. */
export function uiScale(): number {
  const zoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

export function uiPixels(screenPixels: number): number {
  return screenPixels / uiScale();
}

export function uiRect(element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  const scale = uiScale();
  return new DOMRect(rect.x / scale, rect.y / scale, rect.width / scale, rect.height / scale);
}

export function uiViewport() {
  const scale = uiScale();
  return { width: window.innerWidth / scale, height: window.innerHeight / scale };
}
