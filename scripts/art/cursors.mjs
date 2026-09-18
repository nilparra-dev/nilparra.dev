/**
 * Monochrome cursors in the style of the 9x pointer set, drawn from scratch.
 *
 * Real .cur files are 32x32 bitmaps where the visible shape occupies only part
 * of the canvas; the CSS `cursor` rule then places the hotspot on top of that
 * shape. We follow the same model so the sizes match a 96 dpi screen.
 */
import { createCanvas, ellipseRing, setPixel, stamp, text } from '../lib/raster.mjs';
import { fillBox, fillPolygon, outlineShape, translate } from '../lib/vector.mjs';

/** Classic 11x19 pointer; see scripts/art/THIRD_PARTY.md for the bitmap reference. */
const drawArrow = (canvas) => {
  stamp(canvas, [
    'K',
    'KK',
    'KWK',
    'KWWK',
    'KWWWK',
    'KWWWWK',
    'KWWWWWK',
    'KWWWWWWK',
    'KWWWWWWWK',
    'KWWWWWWWWK',
    'KWWWWWKKKKK',
    'KWWKWWK',
    'KWK.KWWK',
    'KK..KWWK',
    'K....KWWK',
    '.....KWWK',
    '......KWWK',
    '......KWWK',
    '.......KK',
  ], 1, 1);
};

/** I-beam: top and bottom serifs joined by a 1px stem. */
const drawIBeam = (canvas) => {
  stamp(
    canvas,
    [
      'KKK.KKK',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      '...K...',
      'KKK.KKK',
    ],
    13,
    9,
  );
};

/** Hourglass: two facing triangles with the 90s "sand" look. */
const drawHourglass = (canvas) => {
  fillPolygon(
    canvas,
    [
      [10, 8],
      [22, 8],
      [17, 15],
      [15, 15],
    ],
    'W',
  );
  fillPolygon(
    canvas,
    [
      [15, 17],
      [17, 17],
      [22, 24],
      [10, 24],
    ],
    'W',
  );
  outlineShape(canvas, 'K');
};

/** Two-headed arrow, `vertical` selects the axis. */
const doubleArrowPoints = (vertical) => {
  // Walk the perimeter once; self-intersecting polygons lose an arrowhead.
  const points = [
    [0, -12], [4, -7], [2, -7], [2, 7], [4, 7],
    [0, 12], [-4, 7], [-2, 7], [-2, -7], [-4, -7],
  ];
  return vertical ? points : points.map(([x, y]) => [y, x]);
};

const drawDoubleArrow = (canvas, vertical) => {
  fillPolygon(canvas, translate(doubleArrowPoints(vertical), 16, 16), 'W');
  outlineShape(canvas, 'K');
};

/** Diagonal two-headed arrow (NW-SE), optionally mirrored to NE-SW. */
const drawDiagonalArrow = (canvas, flip) => {
  fillPolygon(
    canvas,
    [
      [6, 6], [13, 6], [10, 9], [23, 22], [26, 19],
      [26, 26], [19, 26], [22, 23], [9, 10], [6, 13],
    ],
    'W',
  );
  outlineShape(canvas, 'K');
  if (flip) {
    const snapshot = canvas.pixels.slice();
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        canvas.pixels[y * canvas.width + x] = snapshot[y * canvas.width + canvas.width - 1 - x];
      }
    }
  }
};

const drawMove = (canvas) => {
  fillPolygon(canvas, translate(doubleArrowPoints(true), 16, 16), 'W');
  fillPolygon(canvas, translate(doubleArrowPoints(false), 16, 16), 'W');
  outlineShape(canvas, 'K');
};

const drawCross = (canvas) => {
  const arm = 9;
  const thick = 1;
  fillPolygon(
    canvas,
    [
      [16 - thick, 16 - arm],
      [16 + thick, 16 - arm],
      [16 + thick, 16 - thick],
      [16 + arm, 16 - thick],
      [16 + arm, 16 + thick],
      [16 + thick, 16 + thick],
      [16 + thick, 16 + arm],
      [16 - thick, 16 + arm],
      [16 - thick, 16 + thick],
      [16 - arm, 16 + thick],
      [16 - arm, 16 - thick],
      [16 - thick, 16 - thick],
    ],
    'W',
  );
  outlineShape(canvas, 'K');
};

/** Circle with a slash: the "not available" pointer. */
const drawNo = (canvas) => {
  ellipseRing(canvas, 16, 16, 8, 8, 'W');
  fillPolygon(
    canvas,
    [
      [10, 13],
      [13, 10],
      [22, 19],
      [19, 22],
    ],
    'W',
  );
  outlineShape(canvas, 'K');
};

/** Pointing hand used for links. */
const drawHand = (canvas) => {
  fillBox(canvas, 5, 0, 3, 9, 'W');
  fillBox(canvas, 4, 7, 10, 9, 'W');
  fillBox(canvas, 1, 9, 4, 4, 'W');
  fillBox(canvas, 9, 8, 5, 4, 'W');
  fillBox(canvas, 5, 15, 8, 3, 'W');
  outlineShape(canvas, 'K');
};

/** Arrow plus a "?" plate: the "what is this?" pointer of property sheets. */
const drawHelp = (canvas) => {
  drawArrow(canvas);
  fillBox(canvas, 12, 13, 12, 12, 'W');
  outlineShape(canvas, 'K');
  text(canvas, '?', 16, 15, 'K', { scale: 2 });
};

export const CURSORS = {
  arrow: { hotspot: [1, 1], draw: drawArrow },
  text: { hotspot: [16, 16], draw: drawIBeam },
  wait: { hotspot: [16, 16], draw: drawHourglass },
  cross: { hotspot: [16, 16], draw: drawCross },
  move: { hotspot: [16, 16], draw: drawMove },
  sizens: { hotspot: [16, 16], draw: (c) => drawDoubleArrow(c, true) },
  sizewe: { hotspot: [16, 16], draw: (c) => drawDoubleArrow(c, false) },
  sizenwse: { hotspot: [16, 16], draw: (c) => drawDiagonalArrow(c, false) },
  sizenesw: { hotspot: [16, 16], draw: (c) => drawDiagonalArrow(c, true) },
  no: { hotspot: [16, 16], draw: drawNo },
  hand: { hotspot: [6, 1], draw: drawHand },
  help: { hotspot: [1, 1], draw: drawHelp },
};

export { createCanvas, setPixel };
