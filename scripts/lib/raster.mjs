/**
 * Tiny RGBA raster canvas with the primitives used to draw the pixel art of
 * this project (icons, cursors, dialog glyphs).
 *
 * Everything here is original work: no Microsoft bitmap is read, converted or
 * redistributed. The shapes reproduce the *style* of mid-90s UI art (1px black
 * outlines, light coming from the top-left, a 16 colour palette plus the greys
 * used by the Windows 95 chrome) but were drawn from scratch for this repo.
 */

/** Base 16 colours of the VGA/EGA palette plus the greys of the 95 chrome. */
export const PALETTE = {
  K: '#000000', // black
  W: '#ffffff', // white
  G: '#808080', // grey 50%
  L: '#c0c0c0', // silver (button face)
  D: '#dfdfdf', // light grey
  A: '#a0a0a0', // mid grey (extra shade of the era)
  N: '#000080', // navy
  B: '#0000ff', // blue
  C: '#00ffff', // cyan
  R: '#ff0000', // red
  M: '#800000', // maroon
  Y: '#ffff00', // yellow
  O: '#808000', // olive
  E: '#00ff00', // green
  T: '#008000', // dark green
  Q: '#008080', // teal
  P: '#800080', // purple
  F: '#ff00ff', // magenta
  S: '#fff8dc', // paper cream
};

/** Resolve a palette letter or a literal `#rrggbb` colour. */
export function color(value) {
  if (!value) return null;
  if (value.startsWith('#')) return value;
  const resolved = PALETTE[value];
  if (!resolved) throw new Error(`Unknown palette letter: ${value}`);
  return resolved;
}

export function createCanvas(width, height) {
  return { width, height, pixels: new Array(width * height).fill(null) };
}

export function setPixel(canvas, x, y, value) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  canvas.pixels[y * canvas.width + x] = color(value);
}

export function getPixel(canvas, x, y) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
  return canvas.pixels[y * canvas.width + x];
}

/** Stamp a rectangular sprite (array of strings) at x,y. `.` means transparent. */
export function stamp(canvas, rows, x, y) {
  rows.forEach((row, ry) => {
    [...row].forEach((cell, rx) => {
      if (cell === '.') return;
      setPixel(canvas, x + rx, y + ry, cell);
    });
  });
}

export function rect(canvas, x, y, w, h, value) {
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) setPixel(canvas, x + dx, y + dy, value);
  }
}

export function hLine(canvas, x, y, w, value) {
  for (let dx = 0; dx < w; dx += 1) setPixel(canvas, x + dx, y, value);
}

export function vLine(canvas, x, y, h, value) {
  for (let dy = 0; dy < h; dy += 1) setPixel(canvas, x, y + dy, value);
}

export function frame(canvas, x, y, w, h, value) {
  hLine(canvas, x, y, w, value);
  hLine(canvas, x, y + h - 1, w, value);
  vLine(canvas, x, y, h, value);
  vLine(canvas, x + w - 1, y, h, value);
}

/**
 * The 90s "3D" look: optional black outline, fill, light from the top-left and
 * shadow on the bottom-right. When `outline` is set the bevel is drawn one
 * pixel inside it, exactly like the real chrome.
 */
export function bevel(canvas, x, y, w, h, options) {
  const { fill, light = 'W', dark = 'G', outline, thickness = 1 } = options;
  if (outline) frame(canvas, x, y, w, h, outline);
  const inset = outline ? 1 : 0;
  const ix = x + inset;
  const iy = y + inset;
  const iw = w - inset * 2;
  const ih = h - inset * 2;
  if (iw <= 0 || ih <= 0) return;
  if (fill) rect(canvas, ix, iy, iw, ih, fill);
  for (let t = 0; t < thickness; t += 1) {
    if (iw - t * 2 <= 0 || ih - t * 2 <= 0) break;
    hLine(canvas, ix + t, iy + t, iw - t * 2, light);
    vLine(canvas, ix + t, iy + t, ih - t * 2, light);
    hLine(canvas, ix + t, iy + ih - 1 - t, iw - t * 2, dark);
    vLine(canvas, ix + iw - 1 - t, iy + t, ih - t * 2, dark);
  }
}

/** Sunken variant: shadow on the top-left, light on the bottom-right. */
export function bevelIn(canvas, x, y, w, h, options) {
  const { fill, light = 'W', dark = 'G', outline, thickness = 1 } = options;
  if (outline) frame(canvas, x, y, w, h, outline);
  const inset = outline ? 1 : 0;
  const ix = x + inset;
  const iy = y + inset;
  const iw = w - inset * 2;
  const ih = h - inset * 2;
  if (iw <= 0 || ih <= 0) return;
  if (fill) rect(canvas, ix, iy, iw, ih, fill);
  for (let t = 0; t < thickness; t += 1) {
    if (iw - t * 2 <= 0 || ih - t * 2 <= 0) break;
    hLine(canvas, ix + t, iy + t, iw - t * 2, dark);
    vLine(canvas, ix + t, iy + t, ih - t * 2, dark);
    hLine(canvas, ix + t, iy + ih - 1 - t, iw - t * 2, light);
    vLine(canvas, ix + iw - 1 - t, iy + t, ih - t * 2, light);
  }
}

export function insideEllipse(x, y, cx, cy, rx, ry) {
  if (rx <= 0 || ry <= 0) return false;
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

export function fillEllipse(canvas, cx, cy, rx, ry, value) {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      if (insideEllipse(x, y, cx, cy, rx, ry)) setPixel(canvas, x, y, value);
    }
  }
}

/** One pixel ring at the given radius: pixels inside the ellipse that touch air. */
export function ellipseRing(canvas, cx, cy, rx, ry, value) {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      if (!insideEllipse(x, y, cx, cy, rx, ry)) continue;
      const touching =
        !insideEllipse(x - 1, y, cx, cy, rx, ry) ||
        !insideEllipse(x, y - 1, cx, cy, rx, ry) ||
        !insideEllipse(x + 1, y, cx, cy, rx, ry) ||
        !insideEllipse(x, y + 1, cx, cy, rx, ry);
      if (touching) setPixel(canvas, x, y, value);
    }
  }
}

/**
 * Sphere style shape: outline, then a light rim on the upper-left and a shadow
 * rim on the lower-right, then the fill. Ideal for globes, dialog glyphs and
 * round buttons.
 */
export function bevelEllipse(canvas, cx, cy, rx, ry, options) {
  const { fill, light = 'W', dark = 'G', outline } = options;
  const inner = outline ? 1 : 0;
  if (outline) ellipseRing(canvas, cx, cy, rx, ry, outline);
  if (rx - inner <= 0 || ry - inner <= 0) return;
  if (fill) fillEllipse(canvas, cx, cy, rx - inner, ry - inner, fill);
  for (let y = cy - ry + inner; y <= cy + ry - inner; y += 1) {
    for (let x = cx - rx + inner; x <= cx + rx - inner; x += 1) {
      if (!insideEllipse(x, y, cx, cy, rx - inner, ry - inner)) continue;
      if (!insideEllipse(x - 1, y - 1, cx, cy, rx - inner, ry - inner)) {
        setPixel(canvas, x, y, light);
      } else if (!insideEllipse(x + 1, y + 1, cx, cy, rx - inner, ry - inner)) {
        setPixel(canvas, x, y, dark);
      }
    }
  }
}

/** 3x5 bitmap font: enough for "PDF", "C:\>" style glyphs and dialog marks. */
const FONT = {
  A: ['011', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '111', '011'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '011'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  ':': ['000', '010', '000', '010', '000'],
  '.': ['000', '000', '000', '000', '010'],
  '-': ['000', '000', '111', '000', '000'],
  '_': ['000', '000', '000', '000', '111'],
  '/': ['001', '001', '010', '100', '100'],
  '\\': ['100', '100', '010', '001', '001'],
  '>': ['100', '010', '001', '010', '100'],
  '<': ['001', '010', '100', '010', '001'],
  '?': ['110', '001', '010', '000', '010'],
  '!': ['010', '010', '010', '000', '010'],
  '=': ['000', '111', '000', '111', '000'],
  '+': ['000', '010', '111', '010', '000'],
  '(': ['001', '010', '010', '010', '001'],
  ')': ['100', '010', '010', '010', '100'],
  '%': ['101', '001', '010', '100', '101'],
  '*': ['101', '010', '111', '010', '101'],
  "'": ['010', '010', '000', '000', '000'],
  ' ': ['000', '000', '000', '000', '000'],
};

export function text(canvas, string, x, y, value, options = {}) {
  const { scale = 1, tracking = 1 } = options;
  let cursorX = x;
  for (const raw of string.toUpperCase()) {
    const glyph = FONT[raw] ?? FONT['?'];
    glyph.forEach((row, ry) => {
      [...row].forEach((cell, rx) => {
        if (cell !== '1') return;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            setPixel(canvas, cursorX + rx * scale + sx, y + ry * scale + sy, value);
          }
        }
      });
    });
    cursorX += 3 * scale + tracking;
  }
  return cursorX - tracking;
}

export function textWidth(string, scale = 1, tracking = 1) {
  return string.length * (3 * scale + tracking) - tracking;
}

export function textHeight(scale = 1) {
  return 5 * scale;
}

/**
 * Nearest-neighbour downscale by a whole factor. The 16x16 icons do not use it
 * (their 1px outlines would not survive); it only builds the 48x48 favicon
 * entry from a 3x enlargement. Fully transparent blocks stay transparent, otherwise the most
 * frequent opaque colour of the block wins (ties resolve to the darkest, so
 * outlines survive).
 */
export function downscale(canvas, factor = 2) {
  const width = Math.floor(canvas.width / factor);
  const height = Math.floor(canvas.height / factor);
  const out = createCanvas(width, height);
  const darkness = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const counts = new Map();
      let opaque = 0;
      let darkest = null;
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const value = getPixel(canvas, x * factor + dx, y * factor + dy);
          if (!value) continue;
          opaque += 1;
          counts.set(value, (counts.get(value) ?? 0) + 1);
          if (darkest === null || darkness(value) < darkness(darkest)) darkest = value;
        }
      }
      if (opaque < (factor * factor) / 2) continue;
      let best = darkest;
      let bestCount = 0;
      for (const [value, count] of counts) {
        if (count > bestCount || (count === bestCount && darkness(value) < darkness(best))) {
          best = value;
          bestCount = count;
        }
      }
      setPixel(out, x, y, best);
    }
  }
  return out;
}

export function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
