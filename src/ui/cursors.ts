import { CURSOR_ASSETS, CURSOR_SCALES, type CursorId } from '../assets/generated/cursors';

type CursorScale = (typeof CURSOR_SCALES)[number];

export interface CursorImageChoice {
  /** Which enlargement of the art to use. */
  scale: CursorScale;
  /** Image pixels per CSS pixel, as written in image-set(). */
  resolution: number;
}

/**
 * CSS zoom does not reach cursors, so the pointers would stay at 1x while the
 * interface is zoomed, and the browser would stretch them with smoothing on
 * dense screens. The best image is the enlargement closest to the device
 * pixels one interface pixel covers; its resolution then sizes the pointer to
 * exactly `uiScale` CSS pixels per art pixel. On the pixel perfect zooms of
 * src/ui/scale.ts every art pixel lands on a whole number of device pixels.
 */
export function cursorImageFor(uiScale: number, devicePixelRatio: number): CursorImageChoice {
  const target = uiScale * devicePixelRatio;
  const largest = CURSOR_SCALES[CURSOR_SCALES.length - 1];
  const rounded = Number.isFinite(target) ? Math.round(target) : 1;
  const scale = Math.min(largest, Math.max(1, rounded)) as CursorScale;
  return { scale, resolution: scale / uiScale };
}

/** Full `cursor` value for one pointer, with its hotspot in CSS pixels. */
export function cursorValue(
  id: CursorId,
  uiScale: number,
  devicePixelRatio: number,
  imageSet = 'image-set',
): string {
  const asset = CURSOR_ASSETS[id];
  const { scale, resolution } = cursorImageFor(uiScale, devicePixelRatio);
  const [hx, hy] = asset.hotspot.map((value) => Math.round(value * uiScale));
  return `${imageSet}(url("${asset.images[scale]}") ${resolution}x) ${hx} ${hy}, ${asset.fallback}`;
}

/** The image-set() spelling this browser accepts in `cursor`, if any. */
function supportedImageSet(): string | null {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return null;
  const probe = (name: string) => CSS.supports('cursor', `${name}(url("a.png") 2x) 1 1, auto`);
  if (probe('image-set')) return 'image-set';
  if (probe('-webkit-image-set')) return '-webkit-image-set';
  return null;
}

/**
 * Rewrites the `--cursor-*` properties of cursors.generated.css for the
 * current zoom and density. Browsers without image-set() in `cursor` keep the
 * 1x values of the stylesheet.
 */
export function applyCursorScale(uiScale: number, devicePixelRatio: number): void {
  const imageSet = supportedImageSet();
  if (!imageSet) return;
  const style = document.documentElement.style;
  for (const id of Object.keys(CURSOR_ASSETS) as CursorId[]) {
    style.setProperty(`--cursor-${id}`, cursorValue(id, uiScale, devicePixelRatio, imageSet));
  }
}
