/**
 * Pixel art of the project: 32x32 application/file icons plus a few 16x16
 * chrome glyphs (taskbar, tray, start button). The 16x16 versions of the
 * application/file icons are drawn separately in icons16.mjs.
 *
 * Every icon is original. The shapes follow the visual language of mid-90s
 * desktop UI (1px outlines, light from the top-left, small palettes) but none
 * of them is a copy of a Microsoft bitmap.
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

/** White sheet of paper with the folded top-right corner used by file icons. */
function drawPage(canvas, px = 6, py = 3) {
  const w = 20;
  const h = 26;
  rect(canvas, px, py, w, h, 'W');
  hLine(canvas, px, py, w - 4, 'K');
  vLine(canvas, px, py, h, 'K');
  hLine(canvas, px, py + h - 1, w, 'K');
  vLine(canvas, px + w - 1, py + 4, h - 4, 'K');
  for (let i = 0; i < 4; i += 1) setPixel(canvas, px + 16 + i, py + i, 'K');
  for (let i = 0; i < 3; i += 1) {
    for (let x = px + 17 + i; x <= px + 19; x += 1) setPixel(canvas, x, py + i, 'D');
  }
}

function drawTextLines(canvas, lines, color = 'A') {
  lines.forEach(([x, y, w]) => hLine(canvas, x, y, w, color));
}

const CONTENT = { x: 9, y: 9, w: 14, h: 16 };

const FOLDER_BACK = [
  'KKKKKKKKKKKKK............',
  'KWWWWWWWWWWWK............',
  'KWYYYYYYYYYYK............',
  'KWYYYYYYYYYYKKKKKKKKKKKKK',
  'KWYYYYYYYYYYKWWWWWWWWWWWW',
  'KWYYYYYYYYYYKWYYYYYYYYYYK',
  'KWYYYYYYYYYYKWYYYYYYYYYYK',
  'KWYYYYYYYYYYKWYYYYYYYYYYK',
];

/* ------------------------------------------------------------------ *
 * Shell icons
 * ------------------------------------------------------------------ */

const computer = (c) => {
  bevel(c, 3, 2, 24, 18, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  bevelIn(c, 6, 5, 18, 12, { fill: 'Q', dark: 'G', light: 'D', outline: 'K' });
  rect(c, 9, 8, 12, 8, 'W');
  rect(c, 9, 8, 12, 2, 'N');
  frame(c, 9, 8, 12, 8, 'K');
  hLine(c, 11, 12, 7, 'G');
  hLine(c, 11, 14, 5, 'G');
  rect(c, 8, 20, 10, 2, 'D');
  frame(c, 8, 20, 10, 2, 'K');
  bevel(c, 18, 20, 12, 9, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  hLine(c, 20, 23, 8, 'G');
  hLine(c, 20, 25, 8, 'G');
  rect(c, 26, 22, 2, 1, 'E');
};

const network = (c) => {
  bevel(c, 1, 3, 14, 12, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  bevelIn(c, 3, 5, 10, 8, { fill: 'Q', dark: 'G', light: 'D', outline: 'K' });
  bevel(c, 17, 3, 14, 12, { fill: 'D', light: 'W', dark: 'G', outline: 'K' });
  bevelIn(c, 19, 5, 10, 8, { fill: 'Q', dark: 'G', light: 'D', outline: 'K' });
  vLine(c, 8, 15, 6, 'A');
  vLine(c, 24, 15, 6, 'A');
  hLine(c, 4, 21, 25, 'K');
  hLine(c, 4, 22, 25, 'K');
  rect(c, 3, 20, 3, 4, 'G');
  rect(c, 27, 20, 3, 4, 'G');
};

const drive = (c) => {
  bevel(c, 2, 7, 28, 18, { fill: 'D', light: 'W', dark: 'G', outline: 'K' });
  bevel(c, 4, 9, 24, 6, { fill: 'L', light: 'W', dark: 'A', outline: 'K' });
  hLine(c, 6, 11, 14, 'G');
  rect(c, 23, 11, 3, 2, 'E');
  bevel(c, 4, 17, 24, 6, { fill: 'L', light: 'W', dark: 'A', outline: 'K' });
  hLine(c, 6, 19, 20, 'G');
};

const folder = (c) => {
  stamp(c, FOLDER_BACK, 3, 5);
  bevel(c, 3, 13, 25, 13, { fill: 'Y', light: 'W', dark: 'O', outline: 'K' });
};

const folderOpen = (c) => {
  stamp(c, FOLDER_BACK, 3, 2);
  for (let i = 0; i <= 15; i += 1) {
    const y = 10 + i;
    const left = 3 - Math.round(i * 0.2);
    const right = 27 - Math.round(i * 0.27);
    hLine(c, left, y, right - left + 1, 'Y');
    setPixel(c, left, y, 'K');
    setPixel(c, right, y, 'K');
  }
  hLine(c, 3, 10, 24, 'K');
  hLine(c, 3, 12, 23, 'W');
};

const folderDocs = (c) => {
  rect(c, 14, 2, 12, 20, 'W');
  frame(c, 14, 2, 12, 20, 'K');
  hLine(c, 16, 5, 8, 'A');
  hLine(c, 16, 8, 6, 'A');
  folder(c);
};

const folderPictures = (c) => {
  folder(c);
  rect(c, 14, 11, 13, 17, 'W');
  frame(c, 14, 11, 13, 17, 'K');
  rect(c, 15, 12, 11, 7, 'C');
  frame(c, 15, 12, 11, 7, 'K');
  for (let i = 0; i < 5; i += 1) hLine(c, 15 + i, 18 - i, 11 - 2 * i, 'T');
  rect(c, 22, 13, 2, 2, 'Y');
  hLine(c, 16, 22, 9, 'A');
  hLine(c, 16, 25, 5, 'A');
};

const recycleBin = (c, { full }) => {
  if (full) {
    rect(c, 8, 3, 8, 8, 'W');
    frame(c, 8, 3, 8, 8, 'K');
    setPixel(c, 10, 5, 'D');
    setPixel(c, 12, 7, 'D');
    rect(c, 17, 2, 7, 9, 'W');
    frame(c, 17, 2, 7, 9, 'K');
    hLine(c, 19, 5, 3, 'A');
    hLine(c, 19, 7, 3, 'A');
    hLine(c, 19, 9, 3, 'A');
  }
  for (let i = 0; i <= 15; i += 1) {
    const y = 10 + i;
    const inset = Math.round((i / 15) * 3);
    hLine(c, 6 + inset, y, 20 - inset * 2, 'D');
    setPixel(c, 6 + inset, y, 'K');
    setPixel(c, 25 - inset, y, 'K');
    const slide = (i / 15) * 3;
    setPixel(c, 11 - Math.round(slide), y, 'L');
    setPixel(c, 20 + Math.round(slide), y, 'G');
  }
  rect(c, 17, 17, 3, 1, 'T');
  rect(c, 13, 18, 1, 2, 'T');
  rect(c, 12, 20, 6, 1, 'E');
  rect(c, 14, 22, 4, 1, 'T');
  rect(c, 13, 24, 6, 1, 'E');
  bevel(c, 5, 8, 22, 4, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  hLine(c, 8, 10, 16, 'A');
};

const explorer = (c) => {
  folder(c);
  bevelEllipse(c, 20, 19, 7, 7, { fill: 'C', light: 'W', dark: 'G', outline: 'K' });
  fillEllipse(c, 19, 18, 3, 3, 'W');
  for (let i = 0; i < 4; i += 1) {
    setPixel(c, 26 + i, 25 + i, 'A');
    setPixel(c, 27 + i, 25 + i, 'A');
    setPixel(c, 26 + i, 24 + i, 'K');
    setPixel(c, 28 + i, 25 + i, 'K');
  }
  rect(c, 28, 27, 4, 4, 'A');
  frame(c, 28, 27, 4, 4, 'K');
};

const controlPanel = (c) => {
  bevel(c, 2, 3, 28, 26, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  hLine(c, 3, 4, 26, 'N');
  hLine(c, 3, 5, 26, 'N');
  rect(c, 5, 7, 8, 16, 'D');
  frame(c, 5, 7, 8, 16, 'K');
  bevelIn(c, 7, 10, 4, 10, { fill: 'A', dark: 'G', light: 'W' });
  bevel(c, 6, 12, 6, 4, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  bevelEllipse(c, 21, 14, 6, 6, { fill: 'D', light: 'W', dark: 'G', outline: 'K' });
  for (let i = 0; i < 4; i += 1) setPixel(c, 21 + i, 14 - i, 'K');
  bevel(c, 6, 24, 20, 4, { fill: 'D', light: 'W', dark: 'G', outline: 'K' });
  hLine(c, 8, 25, 16, 'A');
};

const systemProperties = (c) => {
  computer(c);
  bevelEllipse(c, 23, 23, 8, 8, { fill: 'W', light: 'W', dark: 'G', outline: 'K' });
  rect(c, 22, 18, 3, 3, 'B');
  rect(c, 22, 22, 3, 8, 'B');
};

const mail = (c) => {
  rect(c, 8, 3, 15, 7, 'S');
  frame(c, 8, 3, 15, 7, 'K');
  hLine(c, 10, 5, 11, 'A');
  hLine(c, 10, 7, 8, 'A');
  bevel(c, 2, 8, 28, 18, { fill: 'W', light: 'W', dark: 'A', outline: 'K' });
  for (let i = 0; i < 10; i += 1) {
    setPixel(c, 3 + i, 9 + i, 'A');
    setPixel(c, 28 - i, 9 + i, 'A');
  }
};

const internet = (c) => {
  bevelEllipse(c, 16, 16, 13, 13, { fill: 'B', light: 'C', dark: 'N', outline: 'K' });
  stamp(
    c,
    [
      '...WWWW....WW..',
      '.WWWWWWWW.WWWW.',
      'WWWWWWWWW.WWWW.',
      'WWWWWWWW..WWW..',
      '.WWWWWW........',
      '..WWWW.........',
      '....WW.........',
      '...WWWW..WW....',
      '...WWWW.WWWW...',
      '....WW..WWW....',
      '.........W.....',
    ],
    7,
    8,
  );
};

const calculator = (c) => {
  bevel(c, 5, 1, 22, 30, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  bevelIn(c, 7, 3, 18, 7, { fill: 'Q', dark: 'G', light: 'D', outline: 'K' });
  text(c, '1234', 9, 5, 'K');
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      bevel(c, 7 + col * 5, 12 + row * 5, 4, 4, {
        fill: col === 3 ? 'R' : 'D',
        light: 'W',
        dark: 'G',
        outline: 'K',
      });
    }
  }
};

const paint = (c) => {
  bevelEllipse(c, 15, 19, 13, 10, { fill: 'Y', light: 'W', dark: 'O', outline: 'K' });
  bevelEllipse(c, 10, 23, 4, 3, { fill: 'L', light: 'D', dark: 'A', outline: 'K' });
  const dots = [
    [8, 12, 'R'],
    [13, 10, 'B'],
    [18, 11, 'E'],
    [22, 15, 'F'],
    [20, 21, 'C'],
  ];
  dots.forEach(([x, y, color]) => {
    rect(c, x, y, 3, 3, color);
    frame(c, x, y, 3, 3, 'K');
  });
  for (let i = 0; i < 9; i += 1) {
    setPixel(c, 20 + i, 12 - i, 'K');
    setPixel(c, 21 + i, 12 - i, 'Q');
    setPixel(c, 22 + i, 12 - i, 'Q');
    setPixel(c, 22 + i, 13 - i, 'K');
  }
  rect(c, 27, 2, 4, 4, 'W');
  frame(c, 27, 2, 4, 4, 'K');
};

const minesweeper = (c) => {
  bevel(c, 2, 2, 28, 28, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  for (let i = 1; i < 3; i += 1) {
    hLine(c, 3, 2 + i * 9, 26, 'A');
    vLine(c, 2 + i * 9, 3, 26, 'A');
  }
  fillEllipse(c, 13, 21, 6, 6, 'K');
  setPixel(c, 11, 19, 'W');
  setPixel(c, 12, 19, 'W');
  setPixel(c, 11, 20, 'W');
  rect(c, 12, 13, 3, 3, 'K');
  rect(c, 6, 20, 3, 3, 'K');
  rect(c, 18, 20, 3, 3, 'K');
  rect(c, 12, 27, 3, 2, 'K');
  vLine(c, 24, 8, 11, 'K');
  rect(c, 25, 8, 5, 4, 'R');
  frame(c, 25, 8, 5, 4, 'K');
  rect(c, 22, 18, 6, 2, 'G');
  frame(c, 22, 18, 6, 2, 'K');
};

/** Small pixel heart used by the Solitaire icon. */
function drawHeart(c, cx, cy) {
  fillEllipse(c, cx - 2, cy - 2, 3, 3, 'R');
  fillEllipse(c, cx + 2, cy - 2, 3, 3, 'R');
  for (let i = 0; i <= 4; i += 1) {
    hLine(c, cx - 4 + i, cy - 1 + i, 9 - i * 2, 'R');
  }
  setPixel(c, cx - 3, cy - 3, 'W');
  setPixel(c, cx - 2, cy - 3, 'W');
}

const solitaire = (c) => {
  // Patterned back card, peeking behind the front one.
  bevel(c, 2, 2, 15, 21, { fill: 'N', light: 'B', dark: 'K', outline: 'K' });
  for (let y = 5; y <= 20; y += 3) {
    for (let x = 4; x <= 14; x += 3) {
      setPixel(c, x + (y % 2), y, 'C');
    }
  }
  // Front card: an ace of hearts.
  bevel(c, 12, 8, 17, 22, { fill: 'W', light: 'W', dark: 'D', outline: 'K' });
  text(c, 'A', 14, 10, 'R');
  drawHeart(c, 20, 21);
};

const poker = (c) => {
  // Two chips: a blue one behind, a red one in front.
  bevelEllipse(c, 20, 12, 11, 11, { fill: 'B', light: 'C', dark: 'N', outline: 'K' });
  ellipseRing(c, 20, 12, 6, 6, 'W');
  bevelEllipse(c, 12, 20, 11, 11, { fill: 'R', light: 'F', dark: 'M', outline: 'K' });
  ellipseRing(c, 12, 20, 6, 6, 'W');
  // Dashed rim of the front chip.
  const dashes = [
    [12, 9],
    [12, 31],
    [1, 20],
    [23, 20],
    [4, 12],
    [20, 12],
    [4, 28],
    [20, 28],
  ];
  dashes.forEach(([x, y]) => setPixel(c, x, y, 'W'));
};

const mediaPlayer = (c) => {
  bevel(c, 2, 3, 28, 26, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  hLine(c, 3, 4, 26, 'N');
  hLine(c, 3, 5, 26, 'N');
  bevelIn(c, 5, 8, 22, 12, { fill: 'K', dark: 'G', light: 'D', outline: 'K' });
  for (let i = 0; i < 8; i += 1) vLine(c, 13 + i, 12 + i, 10 - i * 2, 'E');
  hLine(c, 5, 22, 22, 'G');
  for (let i = 0; i < 5; i += 1) {
    bevel(c, 4 + i * 5, 24, 5, 5, { fill: 'D', light: 'W', dark: 'G', outline: 'K' });
  }
  rect(c, 6, 26, 2, 2, 'E');
  rect(c, 11, 26, 2, 2, 'R');
  rect(c, 15, 26, 2, 2, 'K');
  rect(c, 21, 26, 2, 2, 'K');
  rect(c, 26, 26, 2, 2, 'K');
};

const find = (c) => {
  rect(c, 3, 6, 15, 19, 'W');
  frame(c, 3, 6, 15, 19, 'K');
  hLine(c, 6, 10, 9, 'A');
  hLine(c, 6, 13, 9, 'A');
  hLine(c, 6, 16, 9, 'A');
  hLine(c, 6, 19, 5, 'A');
  bevelEllipse(c, 20, 15, 9, 9, { fill: 'C', light: 'W', dark: 'G', outline: 'K' });
  fillEllipse(c, 18, 13, 4, 4, 'W');
  for (let i = 0; i < 6; i += 1) {
    setPixel(c, 27 + i, 23 + i, 'K');
    setPixel(c, 28 + i, 23 + i, 'A');
    setPixel(c, 29 + i, 23 + i, 'K');
  }
};

const run = (c) => {
  bevel(c, 2, 5, 28, 22, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  hLine(c, 3, 6, 26, 'N');
  hLine(c, 3, 7, 26, 'N');
  bevelIn(c, 5, 10, 22, 8, { fill: 'W', dark: 'G', light: 'D', outline: 'K' });
  text(c, 'C:\\', 7, 12, 'K');
  rect(c, 16, 12, 1, 5, 'K');
  for (let i = 0; i < 6; i += 1) {
    rect(c, 5 + 2 * i, 22 + i, 2, 1, 'T');
    rect(c, 5 + 2 * i, 29 - i, 2, 1, 'T');
  }
  rect(c, 17, 24, 8, 2, 'T');
};

const help = (c) => {
  bevel(c, 4, 3, 24, 27, { fill: 'Y', light: 'W', dark: 'O', outline: 'K' });
  vLine(c, 8, 5, 23, 'O');
  vLine(c, 9, 5, 23, 'W');
  for (let y = 4; y < 30; y += 1) {
    setPixel(c, 26, y, 'W');
    setPixel(c, 27, y, 'D');
  }
  text(c, '?', 13, 8, 'N', { scale: 4 });
};

const shutdown = (c) => {
  computer(c);
  bevelEllipse(c, 14, 10, 7, 7, { fill: 'R', light: 'F', dark: 'M', outline: 'K' });
  rect(c, 13, 4, 3, 7, 'L');
  frame(c, 13, 4, 3, 7, 'K');
};

const suspend = (c) => {
  computer(c);
  fillEllipse(c, 14, 10, 7, 7, 'Y');
  fillEllipse(c, 11, 7, 6, 6, 'L');
  ellipseRing(c, 14, 10, 7, 7, 'K');
};

const consoleIcon = (c) => {
  bevel(c, 1, 3, 30, 26, { fill: 'K', light: 'D', dark: 'G', outline: 'K' });
  bevelIn(c, 3, 5, 26, 22, { fill: 'K', dark: 'G', light: 'D', outline: 'K' });
  text(c, 'C:\\>', 5, 8, 'D');
  rect(c, 5, 16, 12, 1, 'D');
  rect(c, 5, 18, 18, 1, 'G');
  rect(c, 5, 20, 14, 1, 'G');
  rect(c, 22, 8, 6, 5, 'D');
};

const projects = (c) => {
  folder(c);
  rect(c, 12, 9, 18, 18, 'W');
  frame(c, 12, 9, 18, 18, 'K');
  rect(c, 13, 10, 16, 2, 'N');
  const bars = [
    [14, 20, 4, 5, 'B'],
    [19, 17, 4, 8, 'E'],
    [24, 22, 4, 3, 'R'],
  ];
  bars.forEach(([x, y, w, h, color]) => {
    rect(c, x, y, w, h, color);
    frame(c, x, y, w, h, 'K');
  });
  hLine(c, 14, 26, 14, 'K');
};

const aboutMe = (c) => {
  bevel(c, 3, 4, 26, 24, { fill: 'W', light: 'W', dark: 'A', outline: 'K' });
  hLine(c, 4, 5, 24, 'N');
  hLine(c, 4, 6, 24, 'N');
  bevelIn(c, 6, 9, 10, 10, { fill: 'D', dark: 'G', light: 'W', outline: 'K' });
  fillEllipse(c, 11, 12, 3, 3, 'A');
  for (let i = 0; i < 5; i += 1) hLine(c, 7 + i, 16 + Math.round(i * 0.5), 9 - i * 2, 'A');
  hLine(c, 18, 11, 9, 'A');
  hLine(c, 18, 14, 9, 'A');
  hLine(c, 18, 17, 6, 'A');
  hLine(c, 6, 23, 20, 'A');
  hLine(c, 6, 26, 12, 'A');
};

const welcome = (c) => {
  bevelEllipse(c, 16, 12, 9, 9, { fill: 'Y', light: 'W', dark: 'O', outline: 'K' });
  rect(c, 12, 20, 8, 3, 'L');
  frame(c, 12, 20, 8, 3, 'K');
  rect(c, 13, 23, 6, 2, 'A');
  frame(c, 13, 23, 6, 2, 'K');
  rect(c, 14, 25, 4, 2, 'G');
  frame(c, 14, 25, 4, 2, 'K');
  hLine(c, 3, 6, 3, 'C');
  vLine(c, 4, 5, 5, 'C');
  hLine(c, 26, 4, 3, 'C');
  vLine(c, 27, 3, 5, 'C');
  hLine(c, 24, 25, 3, 'C');
  vLine(c, 26, 23, 5, 'C');
};

/* ------------------------------------------------------------------ *
 * File type icons
 * ------------------------------------------------------------------ */

const docText = (c) => {
  drawPage(c);
  drawTextLines(c, [
    [10, 12, 11],
    [10, 15, 11],
    [10, 18, 11],
    [10, 21, 7],
  ]);
};

const notepad = (c) => {
  drawPage(c);
  drawTextLines(c, [
    [9, 10, 9],
    [9, 13, 9],
    [9, 16, 8],
  ]);
  for (let i = 0; i < 10; i += 1) {
    setPixel(c, 15 + i, 26 - i, 'K');
    setPixel(c, 16 + i, 26 - i, 'Y');
    setPixel(c, 17 + i, 26 - i, 'Y');
    setPixel(c, 17 + i, 25 - i, 'K');
  }
  rect(c, 24, 15, 4, 4, 'M');
  frame(c, 24, 15, 4, 4, 'K');
  rect(c, 12, 27, 3, 3, 'K');
  setPixel(c, 13, 27, 'A');
};

const docImage = (c) => {
  drawPage(c);
  rect(c, CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h, 'W');
  frame(c, CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h, 'K');
  rect(c, CONTENT.x + 1, CONTENT.y + 1, CONTENT.w - 2, 7, 'C');
  hLine(c, CONTENT.x + 1, CONTENT.y + 8, CONTENT.w - 2, 'T');
  hLine(c, CONTENT.x + 1, CONTENT.y + 9, CONTENT.w - 2, 'T');
  for (let i = 0; i < 5; i += 1) {
    hLine(c, CONTENT.x + 2 + i, CONTENT.y + 13 - i, 3 + i, 'E');
  }
  rect(c, CONTENT.x + 9, CONTENT.y + 2, 3, 3, 'Y');
  frame(c, CONTENT.x + 9, CONTENT.y + 2, 3, 3, 'K');
};

const docAudio = (c) => {
  drawPage(c);
  rect(c, CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h, 'W');
  frame(c, CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h, 'K');
  fillEllipse(c, CONTENT.x + 5, CONTENT.y + 12, 3, 2, 'N');
  ellipseRing(c, CONTENT.x + 5, CONTENT.y + 12, 3, 2, 'K');
  rect(c, CONTENT.x + 7, CONTENT.y + 3, 2, 9, 'N');
  frame(c, CONTENT.x + 7, CONTENT.y + 3, 2, 9, 'K');
  rect(c, CONTENT.x + 9, CONTENT.y + 3, 3, 2, 'N');
  frame(c, CONTENT.x + 9, CONTENT.y + 3, 3, 2, 'K');
  rect(c, CONTENT.x + 10, CONTENT.y + 5, 2, 3, 'N');
  frame(c, CONTENT.x + 10, CONTENT.y + 5, 2, 3, 'K');
};

const docVideo = (c) => {
  drawPage(c);
  rect(c, CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h, 'W');
  frame(c, CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h, 'K');
  rect(c, CONTENT.x + 1, CONTENT.y + 3, CONTENT.w - 2, 10, 'N');
  for (let i = 0; i < 3; i += 1) {
    rect(c, CONTENT.x + 2 + i * 4, CONTENT.y + 4, 2, 2, 'W');
    rect(c, CONTENT.x + 2 + i * 4, CONTENT.y + 8, 2, 2, 'W');
    rect(c, CONTENT.x + 3 + i * 3, CONTENT.y + 11, 2, 2, 'W');
  }
  for (let i = 0; i < 4; i += 1) rect(c, CONTENT.x + 4 + i, CONTENT.y + 6 + i, 3, 1, 'W');
};

const docWeb = (c) => {
  drawPage(c);
  bevelEllipse(c, 16, 17, 7, 7, { fill: 'B', light: 'C', dark: 'N', outline: 'K' });
  rect(c, 12, 14, 8, 2, 'W');
  rect(c, 13, 18, 6, 2, 'W');
};

const docPdf = (c) => {
  drawPage(c);
  drawTextLines(c, [
    [10, 12, 11],
    [10, 15, 11],
  ]);
  rect(c, 9, 20, 14, 6, 'R');
  frame(c, 9, 20, 14, 6, 'K');
  text(c, 'PDF', 12, 21, 'W');
};

const docUnknown = (c) => {
  drawPage(c);
  drawTextLines(c, [
    [10, 12, 11],
    [10, 15, 11],
  ]);
  rect(c, 9, 18, 14, 8, 'D');
  frame(c, 9, 18, 14, 8, 'K');
  text(c, '?', 14, 19, 'K', { scale: 2 });
};

/* Toolbar glyphs. The 16px toolbar uses their hand drawn versions in
 * icons16.mjs. */
const navBack = (c) => {
  folderOpen(c);
  hLine(c, 3, 27, 14, 'N');
  setPixel(c, 3, 27, 'K');
  setPixel(c, 4, 26, 'N');
  setPixel(c, 4, 28, 'N');
};

const navUp = (c) => {
  folder(c);
  vLine(c, 16, 17, 11, 'N');
  hLine(c, 11, 18, 11, 'N');
  setPixel(c, 15, 16, 'N');
  setPixel(c, 14, 17, 'N');
  setPixel(c, 17, 16, 'N');
  setPixel(c, 18, 17, 'N');
};

const cut = (c) => {
  bevelEllipse(c, 8, 10, 5, 5, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  bevelEllipse(c, 8, 22, 5, 5, { fill: 'L', light: 'W', dark: 'G', outline: 'K' });
  for (let i = 0; i < 12; i += 1) {
    setPixel(c, 12 + i, 13 + Math.round(i * 0.45), 'K');
    setPixel(c, 12 + i, 19 - Math.round(i * 0.45), 'K');
  }
  rect(c, 24, 14, 5, 4, 'R');
  frame(c, 24, 14, 5, 4, 'K');
};

const copy = (c) => {
  rect(c, 8, 3, 17, 22, 'W');
  frame(c, 8, 3, 17, 22, 'K');
  rect(c, 4, 8, 17, 21, 'W');
  frame(c, 4, 8, 17, 21, 'K');
  hLine(c, 7, 14, 10, 'A');
  hLine(c, 7, 17, 8, 'A');
  hLine(c, 7, 20, 10, 'A');
};

const paste = (c) => {
  rect(c, 7, 5, 19, 24, 'W');
  frame(c, 7, 5, 19, 24, 'K');
  bevel(c, 12, 2, 9, 6, { fill: 'Y', light: 'W', dark: 'O', outline: 'K' });
  hLine(c, 11, 13, 11, 'A');
  hLine(c, 11, 17, 8, 'A');
  hLine(c, 11, 21, 10, 'A');
};

const deleteIcon = (c) => recycleBin(c, { full: true });

const viewLarge = (c) => {
  rect(c, 3, 3, 11, 11, 'Y');
  frame(c, 3, 3, 11, 11, 'K');
  rect(c, 18, 3, 11, 11, 'Y');
  frame(c, 18, 3, 11, 11, 'K');
  rect(c, 3, 18, 11, 11, 'Y');
  frame(c, 3, 18, 11, 11, 'K');
  rect(c, 18, 18, 11, 11, 'Y');
  frame(c, 18, 18, 11, 11, 'K');
};

const viewSmall = (c) => {
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      rect(c, 3 + col * 7, 3 + row * 9, 5, 6, 'Y');
      frame(c, 3 + col * 7, 3 + row * 9, 5, 6, 'K');
    }
  }
};

const viewList = (c) => {
  for (let row = 0; row < 4; row += 1) {
    rect(c, 3, 3 + row * 7, 4, 4, 'Y');
    frame(c, 3, 3 + row * 7, 4, 4, 'K');
    hLine(c, 10, 4 + row * 7, 19, 'A');
  }
};

const viewDetails = (c) => {
  rect(c, 3, 3, 26, 6, 'D');
  frame(c, 3, 3, 26, 6, 'K');
  for (let row = 0; row < 3; row += 1) {
    hLine(c, 3, 12 + row * 6, 26, 'A');
    vLine(c, 3, 12 + row * 6, 5, 'K');
  }
  vLine(c, 18, 9, 20, 'G');
};

const floppy = (c) => {
  bevel(c, 2, 2, 28, 28, { fill: 'A', light: 'D', dark: 'G', outline: 'K' });
  bevelIn(c, 8, 3, 16, 10, { fill: 'D', dark: 'G', light: 'W', outline: 'K' });
  rect(c, 14, 4, 5, 8, 'A');
  frame(c, 14, 4, 5, 8, 'K');
  bevel(c, 4, 16, 24, 12, { fill: 'W', light: 'W', dark: 'A', outline: 'K' });
  hLine(c, 7, 19, 18, 'A');
  hLine(c, 7, 22, 18, 'A');
  hLine(c, 7, 25, 10, 'A');
};

/* ------------------------------------------------------------------ *
 * Message box glyphs (32x32)
 * ------------------------------------------------------------------ */

const dialogInfo = (c) => {
  bevelEllipse(c, 16, 16, 14, 14, { fill: 'B', light: 'C', dark: 'N', outline: 'K' });
  rect(c, 14, 8, 4, 4, 'W');
  rect(c, 14, 14, 4, 10, 'W');
};

const dialogQuestion = (c) => {
  bevelEllipse(c, 16, 16, 14, 14, { fill: 'B', light: 'C', dark: 'N', outline: 'K' });
  text(c, '?', 11, 7, 'W', { scale: 4 });
};

const dialogWarning = (c) => {
  const rows = 27;
  for (let i = 0; i < rows; i += 1) {
    const y = 2 + i;
    const half = Math.round((i * 13.5) / (rows - 1));
    hLine(c, 16 - half, y, half * 2 + 1, 'Y');
    setPixel(c, 16 - half, y, 'K');
    setPixel(c, 16 + half, y, 'K');
    if (i > 0) {
      setPixel(c, 16 - half + 1, y, 'W');
      setPixel(c, 16 + half - 1, y, 'O');
    }
  }
  hLine(c, 2, 29, 28, 'K');
  setPixel(c, 15, 1, 'K');
  setPixel(c, 16, 1, 'K');
  rect(c, 15, 11, 3, 8, 'K');
  rect(c, 15, 22, 3, 3, 'K');
};

const dialogError = (c) => {
  bevelEllipse(c, 16, 16, 14, 14, { fill: 'R', light: 'F', dark: 'M', outline: 'K' });
  for (let i = 0; i < 8; i += 1) {
    rect(c, 11 + i, 11 + i, 2, 2, 'W');
    rect(c, 20 - i, 11 + i, 2, 2, 'W');
    rect(c, 11 + i, 18 - i, 2, 2, 'K');
    rect(c, 20 - i, 18 - i, 2, 2, 'K');
  }
};

/* ------------------------------------------------------------------ *
 * 16x16 chrome glyphs
 * ------------------------------------------------------------------ */

const startMark = (c) => {
  // Four panes on a flag that tilts up to the right, like the original mark:
  // the right column sits two rows higher and the cross steps with it.
  stamp(c, [
    '........KKKKKKK.',
    '........KEEEEEK.',
    '..KKKKKKKEEEEEK.',
    '..KRRRRRKEEEEEK.',
    '..KRRRRRKEEEEEK.',
    '..KRRRRRKKKKKKK.',
    '..KRRRRRKYYYYYK.',
    '..KKKKKKKYYYYYK.',
    '..KBBBBBKYYYYYK.',
    '..KBBBBBKYYYYYK.',
    '..KBBBBBKKKKKKK.',
    '..KBBBBBK.......',
    '..KKKKKKK.......',
  ], 0, 2);
};

const speaker = (c) => {
  bevel(c, 1, 5, 4, 6, { fill: 'G', light: 'D', dark: 'K', outline: 'K' });
  for (let x = 5; x <= 9; x += 1) {
    const half = 1 + (x - 5);
    hLine(c, x, 8 - half, half * 2 + 1, 'G');
    setPixel(c, x, 8 - half, 'K');
    setPixel(c, x, 8 + half, 'K');
  }
  hLine(c, 9, 3, 3, 'K');
  hLine(c, 9, 13, 3, 'K');
  setPixel(c, 11, 5, 'K');
  setPixel(c, 12, 6, 'K');
  setPixel(c, 12, 11, 'K');
  setPixel(c, 11, 12, 'K');
  setPixel(c, 14, 3, 'K');
  setPixel(c, 15, 5, 'K');
  setPixel(c, 15, 4, 'K');
  setPixel(c, 15, 11, 'K');
  setPixel(c, 15, 12, 'K');
  setPixel(c, 14, 13, 'K');
};

const shortcut = (c) => {
  rect(c, 1, 1, 14, 14, 'W');
  frame(c, 1, 1, 14, 14, 'K');
  for (let i = 0; i < 6; i += 1) {
    setPixel(c, 9 + i, 11 - i, 'K');
    setPixel(c, 9 + i, 12 - i, 'K');
  }
  hLine(c, 4, 11, 6, 'K');
  hLine(c, 4, 12, 6, 'K');
  rect(c, 8, 4, 5, 4, 'K');
  setPixel(c, 9, 5, 'W');
  setPixel(c, 12, 6, 'W');
};

/* ------------------------------------------------------------------ *
 * Profile links
 *
 * Pixel renditions of the GitHub and LinkedIn marks, so the desktop shortcuts
 * to those profiles read at a glance instead of as generic web pages.
 * ------------------------------------------------------------------ */

const github = (c) => {
  fillEllipse(c, 16, 16, 14, 14, 'K');
  stamp(
    c,
    [
      '.WW..........WW.',
      '.WWW........WWW.',
      '.WWWW......WWWW.',
      '.WWWWWWWWWWWWWW.',
      'WWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWW',
      '.WWWWWWWWWWWWWW.',
      '..WWWWWWWWWWWW..',
      '....WWWWWWWW....',
      '.....WWWWWW.....',
      '.....WWWWWW.....',
      'W....WWWWWW.....',
      'WW...WWWWWW.....',
      '.WW..WWWWWW.....',
      '..WWWWWWWWW.....',
      '...WWWWWWWW.....',
      '.....WWWWWW.....',
      '.....WWWWWW.....',
    ],
    8,
    5,
  );
};

const linkedin = (c) => {
  bevel(c, 2, 2, 28, 28, { fill: 'N', light: 'B', dark: 'K', outline: 'K' });
  rect(c, 8, 7, 4, 4, 'W');
  rect(c, 8, 13, 4, 12, 'W');
  rect(c, 14, 13, 4, 12, 'W');
  rect(c, 14, 13, 8, 3, 'W');
  rect(c, 20, 15, 4, 10, 'W');
  setPixel(c, 22, 14, 'W');
};

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

export const ICONS = {
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
  delete: deleteIcon,
  'view-large': viewLarge,
  'view-small': viewSmall,
  'view-list': viewList,
  'view-details': viewDetails,
  floppy,
  'dialog-info': dialogInfo,
  'dialog-question': dialogQuestion,
  'dialog-warning': dialogWarning,
  'dialog-error': dialogError,
  github,
  linkedin,
};

/** Icons drawn on a 16x16 canvas (taskbar buttons, tray, start button). */
export const SMALL_ICONS = {
  'start-mark': startMark,
  speaker,
  shortcut,
};
