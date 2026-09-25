#!/usr/bin/env node
/**
 * Builds every graphic asset of the project from the original pixel art in
 * `scripts/art`. Nothing is downloaded: the icons, cursors, wallpaper tiles
 * and the favicon are produced here, so the repository is self contained and
 * free of third party artwork.
 *
 * Outputs
 *   src/assets/generated/icons/*.png      32x32 and hand drawn 16x16 app/file icons
 *   src/assets/generated/chrome/*.png     16x16 taskbar/tray glyphs
 *   src/assets/generated/cursors/*.png    32x32 cursors with their hotspot
 *   src/styles/cursors.generated.css      ready to use `cursor` values
 *   src/theme/patterns.generated.ts       repeating SVG wallpaper tiles
 *   src/assets/generated/*.ts             static imports typed for Vite
 *   public/favicon.png                    32x32 app icon
 *   public/favicon.ico                    16/32/48 Windows icon
 *   public/favicon.svg                    scalable copy of the same art
 *   public/apple-touch-icon.png           180x180 icon for iOS
 *   public/icon-192.png                   Android/PWA icon
 *   public/icon-512.png                   Android/PWA icon
 *   public/icon-maskable-512.png          Android adaptive icon
 *   qa/*.png                              contact sheets for visual review (not committed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, downscale } from './lib/raster.mjs';
import { blit, encodePNG, scaleUp } from './lib/png.mjs';
import { ICONS, SMALL_ICONS } from './art/icons.mjs';
import { ICONS_16 } from './art/icons16.mjs';
import { CURSORS } from './art/cursors.mjs';
import { renderPattern, PATTERNS } from './art/patterns.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const dirs = {
  icons: path.join(root, 'src/assets/generated/icons'),
  chrome: path.join(root, 'src/assets/generated/chrome'),
  cursors: path.join(root, 'src/assets/generated/cursors'),
  styles: path.join(root, 'src/styles'),
  theme: path.join(root, 'src/theme'),
  public: path.join(root, 'public'),
  qa: path.join(root, 'qa'),
};

const CURSOR_FALLBACK = {
  arrow: 'default',
  text: 'text',
  wait: 'wait',
  cross: 'crosshair',
  move: 'move',
  sizens: 'ns-resize',
  sizewe: 'ew-resize',
  sizenwse: 'nwse-resize',
  sizenesw: 'nesw-resize',
  no: 'not-allowed',
  hand: 'pointer',
  help: 'help',
};

const written = [];

function write(relativePath, contents) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  written.push(relativePath);
}

function writePNG(relativePath, canvas) {
  write(relativePath, encodePNG(canvas));
}

/** SVG with one <rect> run per row: pixel exact and tiny. */
function svgFromCanvas(canvas) {
  const parts = [];
  for (let y = 0; y < canvas.height; y += 1) {
    let x = 0;
    while (x < canvas.width) {
      const value = canvas.pixels[y * canvas.width + x];
      if (!value) {
        x += 1;
        continue;
      }
      let run = 1;
      while (
        x + run < canvas.width &&
        canvas.pixels[y * canvas.width + x + run] === value
      ) {
        run += 1;
      }
      parts.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${value}"/>`);
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" shape-rendering="crispEdges">${parts.join('')}</svg>`;
}

/**
 * ICO container whose entries carry PNG payloads, which every shell since
 * Windows Vista understands. Sizes are addressed by byte, so the browser can
 * pick the closest one instead of rescaling a single bitmap.
 */
function encodeICO(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const directory = entries.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width, 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size: truecolour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...directory, ...entries.map((entry) => entry.png)]);
}

/* --------------------------------------------------------------- *
 * 1. Icons
 * --------------------------------------------------------------- */

const iconIds = Object.keys(ICONS);

/* Every icon needs its hand drawn small size: halving the 32x32 art loses the
 * outlines, so there is no automatic fallback. */
const missingSmall = iconIds.filter((id) => !ICONS_16[id]);
const orphanSmall = Object.keys(ICONS_16).filter((id) => !ICONS[id]);
if (missingSmall.length > 0 || orphanSmall.length > 0) {
  throw new Error(
    `scripts/art/icons16.mjs is out of sync with icons.mjs. Missing: ${missingSmall.join(', ') || 'none'}. ` +
      `Unknown: ${orphanSmall.join(', ') || 'none'}.`,
  );
}

function drawIcon16(id) {
  const canvas = createCanvas(16, 16);
  ICONS_16[id](canvas);
  return canvas;
}
const smallIconIds = Object.keys(SMALL_ICONS);
const iconIdentifier = (id) => `icon_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;
const smallIconIdentifier = (id) => `chrome_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

for (const id of iconIds) {
  const canvas = createCanvas(32, 32);
  ICONS[id](canvas);
  writePNG(`src/assets/generated/icons/${id}.png`, canvas);
  writePNG(`src/assets/generated/icons/${id}-16.png`, drawIcon16(id));
}

for (const id of smallIconIds) {
  const canvas = createCanvas(16, 16);
  SMALL_ICONS[id](canvas);
  writePNG(`src/assets/generated/chrome/${id}.png`, canvas);
}

const iconImports = iconIds
  .map((id) => `import ${iconIdentifier(id)} from './icons/${id}.png';`)
  .join('\n');
const iconEntries = iconIds
  .map((id) => `  '${id}': ${iconIdentifier(id)},`)
  .join('\n');
const icon16Imports = iconIds
  .map((id) => `import ${iconIdentifier(id)}_16 from './icons/${id}-16.png';`)
  .join('\n');
const icon16Entries = iconIds
  .map((id) => `  '${id}': ${iconIdentifier(id)}_16,`)
  .join('\n');
const smallImports = smallIconIds
  .map((id) => `import ${smallIconIdentifier(id)} from './chrome/${id}.png';`)
  .join('\n');
const smallEntries = smallIconIds
  .map((id) => `  '${id}': ${smallIconIdentifier(id)},`)
  .join('\n');

write(
  'src/assets/generated/icons.ts',
  `// Generated by scripts/generate-assets.mjs -- do not edit by hand.
// Run "npm run assets" after touching scripts/art.
${iconImports}
${icon16Imports}
${smallImports}

/** 32x32 icons used on the desktop, in windows and in list views. */
export const ICON_URLS = {
${iconEntries}
} as const;

export type IconId = keyof typeof ICON_URLS;

/** Hand drawn 16x16 variants (scripts/art/icons16.mjs). */
export const ICON_URLS_16 = {
${icon16Entries}
} as const;

/** 16x16 glyphs for the taskbar, the tray and the start button. */
export const SMALL_ICON_URLS = {
${smallEntries}
} as const;

export type SmallIconId = keyof typeof SMALL_ICON_URLS;
`,
);

/* --------------------------------------------------------------- *
 * 2. Cursors
 * --------------------------------------------------------------- */

const cursorRules = [];
for (const [id, definition] of Object.entries(CURSORS)) {
  const canvas = createCanvas(32, 32);
  definition.draw(canvas);
  writePNG(`src/assets/generated/cursors/${id}.png`, canvas);
  const [hx, hy] = definition.hotspot;
  const fallback = CURSOR_FALLBACK[id] ?? 'default';
  cursorRules.push(
    `  /* ${id} */ --cursor-${id}: url('../assets/generated/cursors/${id}.png') ${hx} ${hy}, ${fallback};`,
  );
}

write(
  'src/styles/cursors.generated.css',
  `/* Generated by scripts/generate-assets.mjs -- do not edit by hand.
 *
 * Every value is a complete "cursor" declaration: the pointer image with its
 * hotspot plus the native keyword used as fallback when the image cannot be
 * loaded. Consumers write: cursor: var(--cursor-arrow);
 */
:root {
${cursorRules.join('\n')}
}
`,
);

/* --------------------------------------------------------------- *
 * 3. Wallpaper tiles
 * --------------------------------------------------------------- */

const patternEntries = [];
for (const id of Object.keys(PATTERNS)) {
  const canvas = renderPattern(id);
  const svg = svgFromCanvas(canvas);
  patternEntries.push(
    `  '${id}': { size: ${canvas.width}, svg: '${encodeURIComponent(svg).replace(/'/g, '%27')}' },`,
  );

  // Preview: the tile repeated 6x6 so the desktop texture can be reviewed.
  const tile = canvas.width * 6;
  const preview = createCanvas(tile, tile);
  for (let ty = 0; ty < 6; ty += 1) {
    for (let tx = 0; tx < 6; tx += 1) blit(preview, canvas, tx * canvas.width, ty * canvas.height);
  }
  writePNG(`qa/pattern-${id}@3x.png`, scaleUp(preview, 3));
}

write(
  'src/theme/patterns.generated.ts',
  `// Generated by scripts/generate-assets.mjs -- do not edit by hand.
// Each tile is a repeating SVG data URI, crisp at any device pixel ratio.

export interface WallpaperPattern {
  /** Tile size in CSS pixels. */
  size: number;
  /** URL encoded SVG source. */
  svg: string;
}

export const WALLPAPER_PATTERNS: Record<string, WallpaperPattern> = {
${patternEntries.join('\n')}
};

export function patternBackground(id: string): string {
  const pattern = WALLPAPER_PATTERNS[id];
  if (!pattern) return '';
  return \`url("data:image/svg+xml,\${pattern.svg}")\`;
}
`,
);

/* --------------------------------------------------------------- *
 * 4. Favicon, application icons + contact sheets
 * --------------------------------------------------------------- */

const faviconArt = createCanvas(32, 32);
ICONS.computer(faviconArt);
const faviconArt16 = drawIcon16('computer');
writePNG('public/favicon.png', faviconArt);
write('public/favicon.svg', svgFromCanvas(faviconArt));

/* The raster helpers only scale by whole factors, so 48x48 (still requested by
 * Windows shells) is scaled up to 96 and down again instead of interpolated. */
write(
  'public/favicon.ico',
  encodeICO([
    { size: 16, png: encodePNG(faviconArt16) },
    { size: 32, png: encodePNG(faviconArt) },
    { size: 48, png: encodePNG(downscale(scaleUp(faviconArt, 3), 2)) },
  ]),
);

/**
 * Icon drawn the way the platforms want it: the art centred on the desktop
 * teal instead of on transparency. Android and iOS paint their own mask, so
 * the padding keeps the art inside the safe area (a 512 square masked by a
 * circle of 80% diameter only keeps what fits in a 288px square).
 */
function iconTile(color, size, factor) {
  const canvas = createCanvas(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) canvas.pixels[y * size + x] = color;
  }
  const art = faviconArt.width * factor;
  const offset = Math.floor((size - art) / 2);
  blit(canvas, faviconArt, offset, offset, factor);
  return canvas;
}

const ICON_COLOR = '#008080';
writePNG('public/icon-192.png', iconTile(ICON_COLOR, 192, 5));
writePNG('public/icon-512.png', iconTile(ICON_COLOR, 512, 15));
writePNG('public/icon-maskable-512.png', iconTile(ICON_COLOR, 512, 9));
writePNG('public/apple-touch-icon.png', iconTile(ICON_COLOR, 180, 5));

/** Grid of artwork; each cell is at least as large as the scaled art. */
function buildSheet(entries, { columns, cell, scale, background, pad }) {
  const largest = Math.max(...entries.map(({ canvas: art }) => Math.max(art.width, art.height)));
  if (largest * scale > cell) {
    throw new Error(`Contact sheet cell of ${cell}px cannot hold ${largest}px art at ${scale}x`);
  }
  const rows = Math.ceil(entries.length / columns);
  const canvas = createCanvas(columns * cell + pad * 2, rows * cell + pad * 2);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      canvas.pixels[y * canvas.width + x] = background;
    }
  }
  entries.forEach(({ canvas: art }, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const size = art.width * scale;
    const offsetX = pad + col * cell + Math.floor((cell - size) / 2);
    const offsetY = pad + row * cell + Math.floor((cell - size) / 2);
    blit(canvas, art, offsetX, offsetY, scale);
  });
  return canvas;
}

const iconSheetEntries = iconIds.map((id) => {
  const canvas = createCanvas(32, 32);
  ICONS[id](canvas);
  return { canvas };
});
writePNG(
  'qa/icons-sheet@2x.png',
  buildSheet(iconSheetEntries, { columns: 8, cell: 72, scale: 2, background: '#c0c0c0', pad: 6 }),
);
writePNG(
  'qa/icons16-sheet@4x.png',
  buildSheet(
    iconIds.map((id) => ({ canvas: drawIcon16(id) })),
    { columns: 8, cell: 72, scale: 4, background: '#c0c0c0', pad: 6 },
  ),
);

const smallSheetEntries = smallIconIds.map((id) => {
  const canvas = createCanvas(16, 16);
  SMALL_ICONS[id](canvas);
  return { canvas };
});
writePNG(
  'qa/small-icons-sheet@4x.png',
  buildSheet(smallSheetEntries, { columns: 4, cell: 72, scale: 4, background: '#c0c0c0', pad: 6 }),
);

const cursorEntries = Object.entries(CURSORS).map(([, definition]) => {
  const canvas = createCanvas(32, 32);
  definition.draw(canvas);
  return { canvas };
});
writePNG(
  'qa/cursors-sheet@3x.png',
  buildSheet(cursorEntries, { columns: 4, cell: 108, scale: 3, background: '#008080', pad: 6 }),
);

/* --------------------------------------------------------------- */

console.log(`generate-assets: ${written.length} files written`);
console.log(`  icons:    ${iconIds.length} (plus hand drawn 16x16 variants)`);
console.log(`  chrome:   ${smallIconIds.length}`);
console.log(`  cursors:  ${Object.keys(CURSORS).length}`);
console.log(`  patterns: ${Object.keys(PATTERNS).length}`);
console.log('  browsers: favicon.png, favicon.ico, favicon.svg, apple-touch-icon.png, icon-{192,512}.png');
console.log('  review:   qa/icons-sheet@2x.png, qa/icons16-sheet@4x.png, qa/cursors-sheet@3x.png, qa/pattern-*@3x.png');
