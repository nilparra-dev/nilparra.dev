/**
 * Wallpaper tiles, drawn as 32x32 pixel art and exported as tiny repeating SVG
 * patterns (crisp at any device pixel ratio, no bitmap assets).
 *
 * The default tile recreates the navy "rings and diamonds" desktop of the
 * reference screenshot with our own shapes and palette.
 */
import { createCanvas, setPixel, hLine, vLine } from '../lib/raster.mjs';

const NAVY_BASE = '#00005e';
const NAVY_RING_A = '#1c1ca0';
const NAVY_RING_B = '#2a2ab8';
const NAVY_STAR = '#3d3dcb';
const NAVY_HILITE = '#5a5ae0';

/** Four-pointed star, the little motif that sits between the rings. */
function star(c, cx, cy, size, color) {
  for (let i = -size; i <= size; i += 1) {
    setPixel(c, cx + i, cy, color);
    setPixel(c, cx, cy + i, color);
  }
  setPixel(c, cx + 1, cy + 1, color);
  setPixel(c, cx - 1, cy + 1, color);
  setPixel(c, cx + 1, cy - 1, color);
  setPixel(c, cx - 1, cy - 1, color);
}

const blueRings = (c) => {
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) setPixel(c, x, y, NAVY_BASE);
  }
  const cx = c.width / 2;
  const cy = c.height / 2;
  // Two concentric dithered rings plus a bright core, like the reference tile.
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const dither = (x + y) % 2 === 0;
      if (distance > 11.6 && distance < 14.6) {
        setPixel(c, x, y, dither ? NAVY_RING_A : NAVY_RING_B);
      } else if (distance > 9.2 && distance < 10.4) {
        setPixel(c, x, y, dither ? NAVY_RING_B : NAVY_RING_A);
      } else if (distance < 2.6) {
        setPixel(c, x, y, dither ? NAVY_HILITE : NAVY_RING_B);
      }
    }
  }
  // Motifs at the four interstices of the tiled grid.
  star(c, 0, 0, 3, NAVY_RING_B);
  star(c, c.width - 1, 0, 3, NAVY_RING_B);
  star(c, 0, c.height - 1, 3, NAVY_RING_B);
  star(c, c.width - 1, c.height - 1, 3, NAVY_RING_B);
  setPixel(c, 0, 0, NAVY_HILITE);
  setPixel(c, c.width - 1, 0, NAVY_HILITE);
  setPixel(c, 0, c.height - 1, NAVY_HILITE);
  setPixel(c, c.width - 1, c.height - 1, NAVY_HILITE);
};

const blueMesh = (c) => {
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      setPixel(c, x, y, (x + y) % 8 < 2 ? NAVY_BASE : '#000070');
    }
  }
  for (let i = 0; i < 32; i += 1) {
    setPixel(c, i, i, NAVY_RING_A);
    setPixel(c, i, (i + 8) % 32, NAVY_RING_A);
    setPixel(c, i, (i + 16) % 32, NAVY_RING_A);
    setPixel(c, i, (i + 24) % 32, NAVY_RING_A);
  }
};

const blueDots = (c) => {
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) setPixel(c, x, y, NAVY_BASE);
  }
  for (const [cx, cy] of [
    [8, 8],
    [24, 24],
  ]) {
    setPixel(c, cx, cy - 2, NAVY_RING_A);
    setPixel(c, cx, cy + 2, NAVY_RING_A);
    setPixel(c, cx - 2, cy, NAVY_RING_A);
    setPixel(c, cx + 2, cy, NAVY_RING_A);
    setPixel(c, cx - 1, cy - 1, NAVY_RING_B);
    setPixel(c, cx + 1, cy - 1, NAVY_RING_B);
    setPixel(c, cx - 1, cy + 1, NAVY_RING_B);
    setPixel(c, cx + 1, cy + 1, NAVY_RING_B);
    setPixel(c, cx, cy, NAVY_HILITE);
  }
  for (const [cx, cy] of [
    [8, 24],
    [24, 8],
  ]) {
    hLine(c, cx - 2, cy, 5, NAVY_STAR);
    vLine(c, cx, cy - 2, 5, NAVY_STAR);
  }
};

export const PATTERNS = {
  'blue-rings': { size: 36, draw: blueRings },
  'blue-mesh': { size: 32, draw: blueMesh },
  'blue-dots': { size: 32, draw: blueDots },
};

export function renderPattern(id) {
  const definition = PATTERNS[id];
  const canvas = createCanvas(definition.size, definition.size);
  definition.draw(canvas);
  return canvas;
}
