/**
 * 16x16 versions of every icon in `icons.mjs`, drawn by hand.
 *
 * Halving the 32x32 art does not work: its 1px outlines and details either
 * vanish or merge into dark blobs. Like the originals of the era, the small
 * size is its own drawing with fewer, bolder shapes. Title bars, taskbar
 * buttons, menus, toolbars and the list views of Explorer use these.
 */
import {
  bevel,
  bevelEllipse,
  bevelIn,
  ellipseRing,
  fillEllipse,
  frame,
  hLine,
  rect,
  setPixel,
  stamp,
  text,
  vLine,
} from '../lib/raster.mjs';

/** Stamp a full 16x16 sprite, rejecting rows that would shift the art. */
function sprite(c, rows) {
  if (rows.length !== 16) throw new Error(`16px sprite has ${rows.length} rows`);
  rows.forEach((row, index) => {
    if (row.length !== 16) throw new Error(`16px sprite row ${index} is ${row.length} wide`);
  });
  stamp(c, rows, 0, 0);
}

/* ------------------------------------------------------------------ *
 * Shared shapes
 * ------------------------------------------------------------------ */

/** Sheet of paper with a folded corner; the writable area is x 3..12, y 4..14. */
const page = (c) =>
  sprite(c, [
    '..KKKKKKKKK.....',
    '..KWWWWWWWKK....',
    '..KWWWWWWWKDK...',
    '..KWWWWWWWKKKK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KKKKKKKKKKKK..',
  ]);

const folder = (c) =>
  sprite(c, [
    '................',
    '................',
    '..KKKKK.........',
    '.KWYYYYKKKKKKKK.',
    '.KWWWWWWWWWWWWK.',
    '.KWYYYYYYYYYYOK.',
    '.KWYYYYYYYYYYOK.',
    '.KWYYYYYYYYYYOK.',
    '.KWYYYYYYYYYYOK.',
    '.KWYYYYYYYYYYOK.',
    '.KWYYYYYYYYYYOK.',
    '.KWYYYYYYYYYYOK.',
    '.KOOOOOOOOOOOOK.',
    '.KKKKKKKKKKKKKK.',
    '................',
    '................',
  ]);

const folderOpen = (c) =>
  sprite(c, [
    '................',
    '................',
    '..KKKK..........',
    '.KYYYYKKKKKKK...',
    '.KYWWWWWWWWWK...',
    '.KYWYYYYYYYYK...',
    '.KYWKKKKKKKKKKKK',
    '.KYWKWWWWWWWWWWK',
    '.KYKYYYYYYYYYYK.',
    '.KYKYYYYYYYYYOK.',
    '.KKYYYYYYYYYYK..',
    '.KKYYYYYYYYYOK..',
    '.KYYYYYYYYYYK...',
    '.KKKKKKKKKKKK...',
    '................',
    '................',
  ]);

/** Monitor on a desktop case; the screen is x 4..10, y 3..6. */
const computer = (c) =>
  sprite(c, [
    '.KKKKKKKKKKKKK..',
    '.KWLLLLLLLLLGK..',
    '.KWKKKKKKKKKGK..',
    '.KWKQQQQQQQKGK..',
    '.KWKQQQQQQQKGK..',
    '.KWKQQQQQQQKGK..',
    '.KWKQQQQQQQKGK..',
    '.KWKKKKKKKKKGK..',
    '.KLLLLLLLLLLGK..',
    '.KKKKKKKKKKKKK..',
    '....KGGGGGK.....',
    '.KKKKKKKKKKKKKK.',
    '.KWLLLLLLLLLLGK.',
    '.KLLLLLLLLLELGK.',
    '.KGGGGGGGGGGGGK.',
    '.KKKKKKKKKKKKKK.',
  ]);

/** Wire basket; `full` adds the crumpled papers above the rim. */
const recycleBin = (c, { full }) => {
  if (full) {
    stamp(c, ['KKKK.KKK', 'KWDK.KWK', 'KWWKKKDK'], 4, 0);
  }
  stamp(
    c,
    [
      'KKKKKKKKKKKK',
      'KWLLLLLLLLGK',
      'KKKKKKKKKKKK',
      '.KDDDDDDDDK.',
      '.KDLDDDDGDK.',
      '.KDLDTTDGDK.',
      '.KDLTDDEGDK.',
      '.KDLDEEDGDK.',
      '.KDLDDDDGDK.',
      '..KDLDDGDK..',
      '..KDLDDGDK..',
      '..KKKKKKKK..',
    ],
    2,
    3,
  );
};

/** Magnifying glass whose lens starts at x, y (7x7) with the handle below-right. */
const magnifier = (c, x, y) => {
  stamp(
    c,
    ['..KKK..', '.KWWCK.', 'KWWCCCK', 'KWCCCCK', 'KCCCCGK', '.KCCGK.', '..KKK..'],
    x,
    y,
  );
  for (let i = 0; i < 4; i += 1) {
    setPixel(c, x + 5 + i, y + 6 + i, 'K');
    setPixel(c, x + 6 + i, y + 6 + i, 'K');
  }
};

/** Window frame with a navy caption row, as used by several app icons. */
const appWindow = (c, y = 1, h = 14) => {
  bevel(c, 0, y, 16, h, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  hLine(c, 1, y + 1, 14, 'N');
};

/**
 * Round glyphs drawn by hand: at this size a computed ellipse leaves a ragged
 * rim. `l`, `f` and `d` are the light, fill and dark shades.
 */
const DISC_15 = [
  '.....KKKKK.....',
  '...KKlllllKK...',
  '..KllffffffdK..',
  '.KlfffffffffdK.',
  '.KlfffffffffdK.',
  'KlfffffffffffdK',
  'KlfffffffffffdK',
  'KlfffffffffffdK',
  'KlfffffffffffdK',
  'KlfffffffffffdK',
  '.KffffffffffdK.',
  '.KffffffffffdK.',
  '..KfffffffddK..',
  '...KKdddddKK...',
  '.....KKKKK.....',
];

const DISC_11 = [
  '...KKKKK...',
  '.KKlllllKK.',
  '.KlfffffdK.',
  'KlfffffffdK',
  'KlfffffffdK',
  'KlfffffffdK',
  'KlfffffffdK',
  'KlfffffffdK',
  '.KfffffddK.',
  '.KKdddddKK.',
  '...KKKKK...',
];

function disc(c, rows, x, y, { fill, light, dark }) {
  const shades = { l: light, f: fill, d: dark };
  stamp(c, rows.map((row) => row.replace(/[lfd]/g, (key) => shades[key])), x, y);
}

const BLUE = { fill: 'B', light: 'C', dark: 'N' };
const RED = { fill: 'R', light: 'F', dark: 'M' };

/* ------------------------------------------------------------------ *
 * Shell icons
 * ------------------------------------------------------------------ */

const network = (c) =>
  sprite(c, [
    '................',
    'KKKKKKK..KKKKKKK',
    'KCQQQQK..KCQQQQK',
    'KQQQQQK..KQQQQQK',
    'KQQQQQK..KQQQQQK',
    'KKKKKKK..KKKKKKK',
    '..KGK......KGK..',
    '.KLLLK....KLLLK.',
    '.KKKKK....KKKKK.',
    '...K........K...',
    '...K........K...',
    'KKKKKKKKKKKKKKKK',
    '................',
    '................',
    '................',
    '................',
  ]);

const drive = (c) =>
  sprite(c, [
    '................',
    '................',
    '................',
    '................',
    '.KKKKKKKKKKKKKK.',
    '.KWWWWWWWWWWWGK.',
    '.KWLLLLLLLLLLGK.',
    '.KWLLLLLLLLLLGK.',
    '.KWGGGGGGGGGEGK.',
    '.KWLLLLLLLLLLGK.',
    '.KGGGGGGGGGGGGK.',
    '.KKKKKKKKKKKKKK.',
    '................',
    '................',
    '................',
    '................',
  ]);

const folderDocs = (c) => {
  rect(c, 7, 0, 7, 5, 'W');
  frame(c, 7, 0, 7, 5, 'K');
  hLine(c, 9, 2, 3, 'A');
  folder(c);
};

const folderPictures = (c) => {
  folder(c);
  stamp(
    c,
    [
      'KKKKKKKKK',
      'KCCCCCYCK',
      'KCCCCCCCK',
      'KCCCECCCK',
      'KCCEEECCK',
      'KCEEEEECK',
      'KTTTTTTTK',
      'KKKKKKKKK',
    ],
    7,
    7,
  );
};

const explorer = (c) => {
  folder(c);
  magnifier(c, 6, 4);
};

const controlPanel = (c) => {
  appWindow(c);
  vLine(c, 4, 5, 7, 'K');
  bevel(c, 2, 7, 5, 3, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  bevelEllipse(c, 10, 8, 3, 3, { fill: 'D', light: 'W', dark: 'G', outline: 'K' });
  setPixel(c, 10, 8, 'K');
  setPixel(c, 11, 7, 'K');
};

const systemProperties = (c) => {
  computer(c);
  bevelEllipse(c, 12, 12, 3, 3, { fill: 'W', light: 'W', dark: 'G', outline: 'K' });
  setPixel(c, 12, 10, 'B');
  vLine(c, 12, 12, 3, 'B');
};

const mail = (c) =>
  sprite(c, [
    '................',
    '................',
    '................',
    'KKKKKKKKKKKKKKKK',
    'KAWWWWWWWWWWWWAK',
    'KWAWWWWWWWWWWAWK',
    'KWWAWWWWWWWWAWWK',
    'KWWWAWWWWWWAWWWK',
    'KWWWWAWWWWAWWWWK',
    'KWWWWWAAAAWWWWWK',
    'KWWWWWWWWWWWWWWK',
    'KWWWWWWWWWWWWWWK',
    'KAAAAAAAAAAAAAAK',
    'KKKKKKKKKKKKKKKK',
    '................',
    '................',
  ]);

const internet = (c) => {
  disc(c, DISC_15, 0, 1, BLUE);
  stamp(c, ['.WW..WW', 'WWWW.WW', 'WWW....', '.W...W.', '....WWW', '....WW.'], 3, 4);
};

const calculator = (c) => {
  bevel(c, 2, 0, 12, 16, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  bevelIn(c, 4, 2, 8, 4, { fill: 'Q', dark: 'G', light: 'D', outline: 'K' });
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      rect(c, 4 + col * 3, 7 + row * 3, 2, 2, col === 2 ? 'R' : 'K');
    }
  }
};

const paint = (c) => {
  bevelEllipse(c, 7, 9, 7, 6, { fill: 'Y', light: 'W', dark: 'O', outline: 'K' });
  ellipseRing(c, 5, 12, 1, 1, 'K');
  rect(c, 3, 7, 2, 2, 'R');
  rect(c, 6, 5, 2, 2, 'B');
  rect(c, 9, 6, 2, 2, 'E');
  rect(c, 10, 10, 2, 2, 'F');
  for (let i = 0; i < 6; i += 1) {
    setPixel(c, 10 + i, 6 - i, 'K');
    setPixel(c, 11 + i, 6 - i, 'Q');
  }
};

const minesweeper = (c) => {
  bevel(c, 0, 0, 16, 16, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  fillEllipse(c, 8, 8, 3, 3, 'K');
  vLine(c, 8, 3, 11, 'K');
  hLine(c, 3, 8, 11, 'K');
  [
    [5, 5],
    [11, 5],
    [5, 11],
    [11, 11],
  ].forEach(([x, y]) => setPixel(c, x, y, 'K'));
  rect(c, 7, 7, 2, 1, 'W');
  setPixel(c, 7, 8, 'W');
};

const solitaire = (c) => {
  bevel(c, 0, 0, 9, 12, { fill: 'N', light: 'B', dark: 'K', outline: 'K' });
  for (let y = 2; y <= 9; y += 2) {
    for (let x = 2; x <= 6; x += 2) setPixel(c, x + ((y / 2) % 2), y, 'C');
  }
  bevel(c, 5, 3, 10, 13, { fill: 'W', light: 'W', dark: 'D', outline: 'K' });
  stamp(c, ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], 6, 6);
};

const poker = (c) => {
  disc(c, DISC_11, 5, 0, BLUE);
  ellipseRing(c, 10, 5, 2, 2, 'W');
  disc(c, DISC_11, 0, 5, RED);
  ellipseRing(c, 5, 10, 2, 2, 'W');
};

const mediaPlayer = (c) => {
  appWindow(c);
  bevelIn(c, 2, 4, 12, 7, { fill: 'K', dark: 'G', light: 'W' });
  stamp(c, ['E..', 'EE.', 'EEE', 'EE.', 'E..'], 7, 5);
  rect(c, 3, 12, 2, 1, 'E');
  rect(c, 6, 12, 2, 1, 'R');
  rect(c, 9, 12, 2, 1, 'K');
};

const find = (c) => {
  rect(c, 0, 1, 9, 13, 'W');
  frame(c, 0, 1, 9, 13, 'K');
  hLine(c, 2, 4, 3, 'A');
  hLine(c, 2, 7, 3, 'A');
  hLine(c, 2, 10, 5, 'A');
  magnifier(c, 6, 3);
};

const run = (c) => {
  appWindow(c, 2, 12);
  bevelIn(c, 2, 5, 12, 7, { fill: 'W', dark: 'G', light: 'D', outline: 'K' });
  text(c, 'C:', 4, 6, 'K');
  vLine(c, 11, 6, 5, 'K');
};

const help = (c) => {
  bevel(c, 2, 0, 12, 16, { fill: 'Y', light: 'W', dark: 'O', outline: 'K' });
  vLine(c, 4, 1, 14, 'O');
  text(c, '?', 6, 3, 'N', { scale: 2 });
};

/** Red power button over the monitor. */
const shutdown = (c) => {
  computer(c);
  bevelEllipse(c, 7, 5, 3, 3, { fill: 'R', light: 'F', dark: 'M', outline: 'K' });
  vLine(c, 7, 3, 3, 'W');
};

/** Crescent moon over the monitor. */
const suspend = (c) => {
  computer(c);
  stamp(c, ['..KKK', '.KYYK', 'KYYK.', 'KYYK.', 'KYYK.', '.KYYK', '..KKK'], 5, 1);
};

const consoleIcon = (c) => {
  appWindow(c);
  rect(c, 2, 4, 12, 9, 'K');
  text(c, 'C:\\', 3, 5, 'D');
  hLine(c, 3, 11, 3, 'D');
};

const projects = (c) => {
  folder(c);
  rect(c, 5, 4, 11, 12, 'W');
  frame(c, 5, 4, 11, 12, 'K');
  hLine(c, 6, 5, 9, 'N');
  rect(c, 7, 10, 2, 4, 'B');
  rect(c, 10, 7, 2, 7, 'E');
  rect(c, 13, 11, 2, 3, 'R');
};

const aboutMe = (c) => {
  bevel(c, 0, 2, 16, 12, { fill: 'W', light: 'W', dark: 'A', outline: 'K' });
  hLine(c, 1, 3, 14, 'N');
  rect(c, 2, 5, 5, 7, 'D');
  frame(c, 2, 5, 5, 7, 'K');
  rect(c, 4, 6, 1, 2, 'G');
  hLine(c, 3, 9, 3, 'G');
  hLine(c, 3, 10, 3, 'G');
  hLine(c, 8, 6, 6, 'A');
  hLine(c, 8, 8, 6, 'A');
  hLine(c, 8, 10, 4, 'A');
};

const welcome = (c) =>
  sprite(c, [
    '.C............C.',
    '..C..KKKKKK..C..',
    '....KWWYYYYK....',
    '...KWYYYYYYOK...',
    '...KWYYYYYYOK...',
    'CC.KYYYYYYYOK.CC',
    '...KYYYYYYYOK...',
    '....KYYYYYOK....',
    '.....KYYYOK.....',
    '.....KKKKKK.....',
    '.....KLLLLK.....',
    '.....KKKKKK.....',
    '.....KAAAAK.....',
    '......KKKK......',
    '................',
    '................',
  ]);

/* ------------------------------------------------------------------ *
 * File type icons
 * ------------------------------------------------------------------ */

const docText = (c) => {
  page(c);
  hLine(c, 4, 5, 7, 'A');
  hLine(c, 4, 7, 8, 'A');
  hLine(c, 4, 9, 8, 'A');
  hLine(c, 4, 11, 5, 'A');
};

const notepad = (c) => {
  page(c);
  hLine(c, 4, 5, 7, 'A');
  hLine(c, 4, 7, 5, 'A');
  for (let i = 0; i < 6; i += 1) {
    setPixel(c, 7 + i, 13 - i, 'K');
    setPixel(c, 8 + i, 13 - i, 'Y');
    setPixel(c, 8 + i, 12 - i, 'K');
    setPixel(c, 9 + i, 13 - i, 'K');
  }
  setPixel(c, 6, 14, 'K');
};

const docImage = (c) => {
  page(c);
  stamp(
    c,
    ['KKKKKKKK', 'KCCCCYCK', 'KCCCCCCK', 'KCCECCCK', 'KCEEECCK', 'KEEEEECK', 'KTTTTTTK', 'KKKKKKKK'],
    4,
    5,
  );
};

const docAudio = (c) => {
  page(c);
  stamp(c, ['...KK..', '...KNK.', '...K.NK', '...K...', '...K...', '.KKK...', 'KNNK...', '.KK....'], 5, 5);
};

const docVideo = (c) => {
  page(c);
  rect(c, 4, 5, 8, 9, 'K');
  for (let y = 6; y <= 12; y += 2) {
    setPixel(c, 4, y, 'W');
    setPixel(c, 11, y, 'W');
  }
  rect(c, 6, 6, 4, 3, 'B');
  rect(c, 6, 10, 4, 3, 'B');
};

const docWeb = (c) => {
  page(c);
  bevelEllipse(c, 8, 9, 4, 4, { fill: 'B', light: 'C', dark: 'N', outline: 'K' });
  rect(c, 6, 7, 3, 2, 'W');
  rect(c, 8, 10, 2, 2, 'W');
};

const docPdf = (c) => {
  page(c);
  hLine(c, 4, 5, 7, 'A');
  rect(c, 1, 8, 14, 7, 'R');
  frame(c, 1, 8, 14, 7, 'K');
  text(c, 'PDF', 3, 9, 'W');
};

const docUnknown = (c) => {
  page(c);
  text(c, '?', 5, 5, 'K', { scale: 2 });
};

/* ------------------------------------------------------------------ *
 * Toolbar glyphs
 * ------------------------------------------------------------------ */

const navBack = (c) => {
  folder(c);
  stamp(c, ['..K....', '.KK....', 'KKKKKKK', '.KK....', '..K....'], 4, 6);
};

const navUp = (c) => {
  folder(c);
  stamp(c, ['..K..', '.KKK.', 'KKKKK', '..K..', '..K..', '..K..'], 6, 5);
};

const cut = (c) =>
  sprite(c, [
    '....K.....K.....',
    '....K.....K.....',
    '....KK...KK.....',
    '.....K...K......',
    '.....KK.KK......',
    '......K.K.......',
    '.......K........',
    '......K.K.......',
    '....RRR.RRR.....',
    '...R..R.R..R....',
    '..R...R.R...R...',
    '..R...R.R...R...',
    '...R..R.R..R....',
    '....RR...RR.....',
    '................',
    '................',
  ]);

const copy = (c) => {
  rect(c, 5, 0, 10, 11, 'W');
  frame(c, 5, 0, 10, 11, 'K');
  rect(c, 1, 4, 10, 12, 'W');
  frame(c, 1, 4, 10, 12, 'K');
  hLine(c, 3, 7, 6, 'A');
  hLine(c, 3, 9, 5, 'A');
  hLine(c, 3, 11, 6, 'A');
};

const paste = (c) => {
  rect(c, 2, 2, 12, 14, 'W');
  frame(c, 2, 2, 12, 14, 'K');
  bevel(c, 5, 0, 6, 4, { fill: 'Y', light: 'W', dark: 'O', outline: 'K' });
  hLine(c, 4, 7, 8, 'A');
  hLine(c, 4, 9, 6, 'A');
  hLine(c, 4, 11, 8, 'A');
};

const viewLarge = (c) => {
  [1, 9].forEach((y) =>
    [1, 9].forEach((x) => {
      rect(c, x, y, 6, 6, 'Y');
      frame(c, x, y, 6, 6, 'K');
    }),
  );
};

const viewSmall = (c) => {
  [1, 6, 11].forEach((y) =>
    [1, 6, 11].forEach((x) => {
      rect(c, x, y, 4, 4, 'Y');
      frame(c, x, y, 4, 4, 'K');
    }),
  );
};

const viewList = (c) => {
  [1, 5, 9, 13].forEach((y) => {
    rect(c, 1, y, 3, 3, 'K');
    setPixel(c, 2, y + 1, 'Y');
    hLine(c, 6, y + 1, 9, 'A');
  });
};

const viewDetails = (c) => {
  rect(c, 0, 1, 16, 3, 'D');
  frame(c, 0, 1, 16, 3, 'K');
  vLine(c, 10, 1, 3, 'K');
  [6, 9, 12].forEach((y) => {
    rect(c, 1, y - 1, 2, 2, 'K');
    hLine(c, 4, y, 5, 'A');
    hLine(c, 12, y, 3, 'A');
  });
};

const floppy = (c) => {
  bevel(c, 0, 0, 16, 16, { fill: 'A', light: 'D', dark: 'G', outline: 'K' });
  bevelIn(c, 4, 1, 8, 5, { fill: 'D', dark: 'G', light: 'W', outline: 'K' });
  rect(c, 8, 2, 2, 3, 'A');
  bevel(c, 2, 8, 12, 7, { fill: 'W', light: 'W', dark: 'A', outline: 'K' });
  hLine(c, 4, 10, 8, 'A');
  hLine(c, 4, 12, 6, 'A');
};

/* ------------------------------------------------------------------ *
 * Message box glyphs
 * ------------------------------------------------------------------ */

const dialogInfo = (c) => {
  disc(c, DISC_15, 0, 0, BLUE);
  rect(c, 6, 3, 2, 2, 'W');
  rect(c, 6, 6, 2, 6, 'W');
};

const dialogQuestion = (c) => {
  disc(c, DISC_15, 0, 0, BLUE);
  text(c, '?', 4, 2, 'W', { scale: 2 });
};

const dialogWarning = (c) =>
  sprite(c, [
    '.......KK.......',
    '......KYYK......',
    '......KYYK......',
    '.....KYYYYK.....',
    '.....KYKKYK.....',
    '....KYYKKYYK....',
    '....KYYKKYYK....',
    '...KYYYKKYYYK...',
    '...KYYYKKYYYK...',
    '..KYYYYYYYYYYK..',
    '..KYYYYKKYYYYK..',
    '.KYYYYYKKYYYYYK.',
    '.KYYYYYYYYYYYYK.',
    'KKKKKKKKKKKKKKKK',
    '................',
    '................',
  ]);

const dialogError = (c) => {
  disc(c, DISC_15, 0, 0, RED);
  for (let i = 0; i < 6; i += 1) {
    setPixel(c, 4 + i, 4 + i, 'W');
    setPixel(c, 5 + i, 4 + i, 'W');
    setPixel(c, 10 - i, 4 + i, 'W');
    setPixel(c, 11 - i, 4 + i, 'W');
  }
};

/* ------------------------------------------------------------------ *
 * Registry: one entry per id of ICONS
 * ------------------------------------------------------------------ */

export const ICONS_16 = {
  computer,
  network,
  drive,
  folder,
  'folder-open': folderOpen,
  'folder-docs': folderDocs,
  'folder-pictures': folderPictures,
  'recycle-empty': (c) => recycleBin(c, { full: false }),
  'recycle-full': (c) => recycleBin(c, { full: true }),
  explorer,
  'control-panel': controlPanel,
  'system-properties': systemProperties,
  mail,
  internet,
  calculator,
  paint,
  minesweeper,
  solitaire,
  poker,
  'media-player': mediaPlayer,
  find,
  run,
  help,
  shutdown,
  suspend,
  console: consoleIcon,
  projects,
  'about-me': aboutMe,
  welcome,
  'doc-text': docText,
  notepad,
  'doc-image': docImage,
  'doc-audio': docAudio,
  'doc-video': docVideo,
  'doc-web': docWeb,
  'doc-pdf': docPdf,
  'doc-unknown': docUnknown,
  'nav-back': navBack,
  'nav-up': navUp,
  cut,
  copy,
  paste,
  delete: (c) => recycleBin(c, { full: true }),
  'view-large': viewLarge,
  'view-small': viewSmall,
  'view-list': viewList,
  'view-details': viewDetails,
  floppy,
  'dialog-info': dialogInfo,
  'dialog-question': dialogQuestion,
  'dialog-warning': dialogWarning,
  'dialog-error': dialogError,
};
