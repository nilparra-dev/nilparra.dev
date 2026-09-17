/**
 * Monochrome cursors in the style of the 9x pointer set, drawn from scratch.
 *
 * Real .cur files are 32x32 bitmaps where the visible shape occupies only part
 * of the canvas; the CSS `cursor` rule then places the hotspot on top of that
 * shape. We follow the same model so the sizes match a 96 dpi screen.
 */
import { createCanvas, ellipseRing, setPixel, stamp, text } from '../lib/raster.mjs';
import { fillBox, fillPolygon, outlineShape, translate } from '../lib/vector.mjs';

/** Classic 9x arrow: triangle head plus the slanted tail. */
const ARROW_POINTS = [
  [1, 1],
  [12, 10],
  [7, 10],
  [9, 16],
  [6, 17],
  [4, 11],
  [1, 11],
];

const drawArrow = (canvas) => {
  fillPolygon(canvas, ARROW_POINTS, 'W');
  outlineShape(canvas, 'K');
};

/** I-beam: top and bottom serifs joined by a 1px stem. */
const drawIBeam = (canvas) => {
  stamp(
    canvas,
    [
      'KKKKKKKKK',
      'KWWWWWWWK',
      'KWWWWWWWK',
      'KKKKWKKKK',
      '...KWK...',
      '...KWK...',
      '...KWK...',
      '...KWK...',
      '...KWK...',
      '...KWK...',
      '...KWK...',
      '...KWK...',
      '...KWK...',
      'KKKKWKKKK',
      'KWWWWWWWK',
      'KWWWWWWWK',
      'KKKKKKKKK',
    ],
    12,
    8,
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
  const shaft = 3;
  const half = 8;
  const head = 6;
  if (vertical) {
    return [
      [shaft / 2, -half],
      [head, -half + head],
      [0, -half],
      [-head, -half + head],
      [-shaft / 2, -half],
      [-shaft / 2, half - head],
      [-head, half - head],
      [0, half],
      [head, half - head],
      [shaft / 2, half - head],
    ];
  }
  return [
    [-half, shaft / 2],
    [-half + head, head],
    [-half, 0],
    [-half + head, -head],
    [-half, -shaft / 2],
    [half - head, -shaft / 2],
    [half - head, -head],
    [half, 0],
    [half - head, head],
    [half - head, shaft / 2],
  ];
};

const drawDoubleArrow = (canvas, vertical) => {
  fillPolygon(canvas, translate(doubleArrowPoints(vertical), 16, 16), 'W');
  outlineShape(canvas, 'K');
};

/** Diagonal two-headed arrow (NW-SE), optionally mirrored to NE-SW. */
const drawDiagonalArrow = (canvas, flip) => {
  const reach = 8;
  const thickness = 3;
  const head = 5;
  fillPolygon(
    canvas,
    [
      [16 - reach, 16 - reach],
      [16 - reach + thickness, 16 - reach],
      [16 + reach, 16 + reach - thickness],
      [16 + reach, 16 + reach],
    ],
    'W',
  );
  const tipStart = 16 - reach - 2;
  const tipEnd = 16 + reach + 2;
  fillPolygon(
    canvas,
    [
      [tipStart, tipStart],
      [tipStart + head, tipStart + 1],
      [tipStart + 1, tipStart + head],
    ],
    'W',
  );
  fillPolygon(
    canvas,
    [
      [tipEnd, tipEnd],
      [tipEnd - head, tipEnd - 1],
      [tipEnd - 1, tipEnd - head],
    ],
    'W',
  );
  outlineShape(canvas, 'K');
  if (flip) {
    const snapshot = canvas.pixels.slice();
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        canvas.pixels[y * canvas.width + x] = snapshot[x * canvas.width + y];
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
