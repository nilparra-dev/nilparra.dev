/**
 * Monochrome cursors in the style of the 9x pointer set, drawn from scratch.
 *
 * Every pointer is white with a 1px black outline, or black with a 1px white
 * halo for the thin ones (I-beam, crosshair, the "?" of help), so each one
 * stays visible on light and dark surfaces alike. The generator crops each
 * canvas to the drawn shape: Chrome drops custom cursors larger than 32x32
 * CSS pixels near the edge of the viewport, and the interface zoom enlarges
 * them by up to 1.25.
 */
import { createCanvas, setPixel, stamp } from '../lib/raster.mjs';
import { fillPolygon, outlineShape, translate } from '../lib/vector.mjs';

/** Paints `value` on every empty pixel that touches the shape (4-neighbours). */
function halo(canvas, value = 'W') {
  const snapshot = canvas.pixels.slice();
  const filled = (x, y) =>
    x >= 0 && y >= 0 && x < canvas.width && y < canvas.height && snapshot[y * canvas.width + x];
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        setPixel(canvas, x, y, value);
      }
    }
  }
}

/** Fills every pixel for which `inside(x, y)` holds. */
function fillWhere(canvas, inside, value = 'W') {
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (inside(x, y)) setPixel(canvas, x, y, value);
    }
  }
}

/** Classic 11x19 pointer; see scripts/art/THIRD_PARTY.md for the bitmap reference. */
const ARROW = [
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
];

const drawArrow = (canvas) => stamp(canvas, ARROW, 1, 1);

/** I-beam: serifs joined by a 1px stem, haloed so it reads on dark text boxes. */
const drawIBeam = (canvas) => {
  const stem = Array.from({ length: 13 }, () => '...K...');
  stamp(canvas, ['KKK.KKK', ...stem, 'KKK.KKK'], 13, 9);
  halo(canvas);
};

/** Hourglass with capped ends, sand draining from the top bulb into the bottom one. */
const drawHourglass = (canvas) => {
  stamp(
    canvas,
    [
      'KKKKKKKKKKKKK',
      'KWWWWWWWWWWWK',
      'KKKKKKKKKKKKK',
      '.KWWWWWWWWWK.',
      '.KWKKKKKKKWK.',
      '.KWWKKKKKWWK.',
      '..KWWKKKWWK..',
      '...KWWKWWK...',
      '....KWKWK....',
      '.....KWK.....',
      '.....KWK.....',
      '....KWWWK....',
      '...KWWKWWK...',
      '..KWWWKWWWK..',
      '.KWWWWKWWWWK.',
      '.KWWWKKKWWWK.',
      '.KWWKKKKKWWK.',
      '.KWKKKKKKKWK.',
      'KKKKKKKKKKKKK',
      'KWWWWWWWWWWWK',
      'KKKKKKKKKKKKK',
    ],
    10,
    6,
  );
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

/**
 * Diagonal two-headed arrow (NW-SE), optionally mirrored to NE-SW. Same build
 * as the straight ones: a 3px shaft and two right-angled heads, white inside a
 * black outline.
 */
const drawDiagonalArrow = (canvas, flip) => {
  const size = 17;
  const origin = 8;
  const last = size - 1;
  fillWhere(canvas, (x, y) => {
    const u = x - origin;
    const v = y - origin;
    if (u < 0 || v < 0 || u > last || v > last) return false;
    const shaft = Math.abs(u - v) <= 1;
    const head = u + v <= 7 || last - u + (last - v) <= 7;
    return shaft || head;
  });
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

/** Thin precision cross with a white halo, open in the middle like the original. */
const drawCross = (canvas) => {
  const arm = 8;
  for (let i = 2; i <= arm; i += 1) {
    setPixel(canvas, 16, 16 - i, 'K');
    setPixel(canvas, 16, 16 + i, 'K');
    setPixel(canvas, 16 - i, 16, 'K');
    setPixel(canvas, 16 + i, 16, 'K');
  }
  setPixel(canvas, 16, 16, 'K');
  halo(canvas);
};

/** Circle with a slash: the "not available" pointer, a thick white ring outlined in black. */
const drawNo = (canvas) => {
  const c = 16;
  fillWhere(canvas, (x, y) => {
    const d = Math.hypot(x - c, y - c);
    const ring = d <= 8.5 && d >= 5.5;
    const slash = d <= 7 && Math.abs(x - c - (y - c)) <= 1;
    return ring || slash;
  });
  outlineShape(canvas, 'K');
};

/** Pointing hand used for links: raised index finger, three folded fingers, thumb. */
const drawHand = (canvas) => {
  stamp(
    canvas,
    [
      '.....KK..........',
      '....KWWK.........',
      '....KWWK.........',
      '....KWWK.........',
      '....KWWK.........',
      '....KWWKKK.......',
      '....KWWKWWKKK....',
      '....KWWKWWKWWKK..',
      '.KK.KWWKWWKWWKWK.',
      'KWWKKWWWWWWWWKWWK',
      'KWWWKWWWWWWWWWWWK',
      '.KWWKWWWWWWWWWWWK',
      '..KWKWWWWWWWWWWWK',
      '..KWWWWWWWWWWWWWK',
      '...KWWWWWWWWWWWWK',
      '...KWWWWWWWWWWWK.',
      '....KWWWWWWWWWWK.',
      '....KWWWWWWWWWWK.',
      '.....KWWWWWWWWK..',
      '.....KWWWWWWWWK..',
      '.....KKKKKKKKKK..',
    ],
    1,
    1,
  );
};

/** Arrow with a black "?" beside it: the "what is this?" pointer of property sheets. */
const drawHelp = (canvas) => {
  const mark = createCanvas(canvas.width, canvas.height);
  stamp(
    mark,
    ['.KKKK.', 'KK..KK', '....KK', '...KK.', '..KK..', '..KK..', '......', '..KK..', '..KK..'],
    14,
    2,
  );
  halo(mark);
  drawArrow(canvas);
  mark.pixels.forEach((value, index) => {
    if (value) canvas.pixels[index] = value;
  });
};

/**
 * Hotspots are given on the 32x32 drawing canvas; the generator shifts them
 * when it crops the image.
 */
export const CURSORS = {
  arrow: { hotspot: [1, 1], draw: drawArrow },
  text: { hotspot: [16, 16], draw: drawIBeam },
  wait: { hotspot: [16, 16], draw: drawHourglass },
  cross: { hotspot: [16, 16], draw: drawCross },
  move: { hotspot: [16, 16], draw: drawMove },
  sizens: { hotspot: [16, 16], draw: (c) => drawDoubleArrow(c, true) },
  sizewe: { hotspot: [16, 16], draw: (c) => drawDoubleArrow(c, false) },
  sizenwse: { hotspot: [16, 16], draw: (c) => drawDiagonalArrow(c, false) },
  sizenesw: { hotspot: [15, 16], draw: (c) => drawDiagonalArrow(c, true) },
  no: { hotspot: [16, 16], draw: drawNo },
  hand: { hotspot: [6, 1], draw: drawHand },
  help: { hotspot: [1, 1], draw: drawHelp },
};
