/**
 * The desktop mascot: a 32x32 pixel portrait of the site's owner, drawn from
 * the profile photo (side parted brown hair, strong brows, short stubble, navy
 * collared shirt).
 *
 * It is original work and uses its own palette instead of the Windows 95 one,
 * so it reads as a person and not as a system icon. Every frame shares the
 * same base and only swaps the rows that change: blinking eyes, an open mouth
 * and a smile.
 */
import { createCanvas, setPixel } from '../lib/raster.mjs';

const LEGEND = {
  K: '#1a1210', // outline
  H: '#4a3220', // hair
  h: '#6b4a2f', // hair highlight
  S: '#efc7a6', // skin
  s: '#d4a07f', // skin shadow
  U: '#b58d78', // stubble
  B: '#2a1c14', // brows
  W: '#f6f2ec', // eye white
  E: '#2b2118', // iris
  M: '#a8625c', // mouth
  O: '#5a1f22', // open mouth
  N: '#1c2340', // shirt
  n: '#2f3b6b', // shirt light
  P: '#10152a', // placket
};

/** Rows 0-25: the head and the neck, 20 columns wide, centred on the canvas. */
const HEAD = [
  '....KKKKKKKKKKKK....',
  '..KKHHHHHHHHHHHHKK..',
  '.KHHHhhhHHHHHHHHHHK.',
  '.KHHHHhhhHHHHHHHHHK.',
  'KHHHHHhhHHHHHHHHHHHK',
  'KHHHHHHHHHHHHHHHHHHK',
  'KHHHHHHHHHHHHHHHHHHK',
  'KHHHHHHHHHSSSSSSHHHK',
  'KHHSSSSSSSSSSSSSSHHK',
  'KHHSSSSSSSSSSSSSSHHK',
  '.KHSBBBBSSSSBBBBSHK.',
  'KSSSSSSSSSSSSSSSSSSK', // 11: eyelids
  'KSSSKKKKSSSSKKKKSSSK', // 12: eyes
  'KSSSssssSSSSssssSSSK',
  '.KSSSSSSSSsSSSSSSSK.',
  '.KSSSSSSSSsSSSSSSSK.',
  '.KSSSSSSSsKsSSSSSSK.',
  '..KSSSSSSSSSSSSSSK..',
  '..KSSSSUUUUUUSSSSK..', // 18: stubble
  '..KSSSSSMMMMSSSSSK..', // 19: mouth
  '..KSSSSSSSSSSSSSSK..',
  '...KSSSSSSSSSSSSK...',
  '...KsSSSSSSSSSSsK...',
  '....KKSSSSSSSSKK....',
  '.....KssSSSSssK.....',
  '.....KssssssssK.....',
];

/** Open eyes replace the lids row and the eyes row. */
const OPEN_EYES = {
  11: 'KSSSKKKKSSSSKKKKSSSK',
  12: 'KSSSWEEWSSSSWEEWSSSK',
};

const BLINK = { 11: 'KSSSSSSSSSSSSSSSSSSK', 12: 'KSSSKKKKSSSSKKKKSSSK' };

const FRAMES = {
  neutral: { ...OPEN_EYES },
  blink: { ...BLINK },
  talk: { ...OPEN_EYES, 19: '..KSSSSSKKKKSSSSSK..', 20: '..KSSSSSSMMSSSSSSK..' },
  happy: { ...OPEN_EYES, 19: '..KSSSSMWWWWMSSSSK..' },
  /* Asleep: closed eyes, a slack mouth and a floating "z" that rises on the second frame. */
  sleep: { ...BLINK, 19: '..KSSSSSSOOSSSSSSK..' },
  sleep2: { ...BLINK },
};

/** Where each sleeping frame floats its "z", top left corner. */
const SLEEP_Z = { sleep: [26, 10], sleep2: [26, 4] };
const Z_SPRITE = ['WWWWW', '...W.', '..W..', '.W...', 'WWWWW'];

/** Shoulders and open collar, built symmetric so both sides always match. */
function shirtRow(left, navy, middle) {
  const side = 'N'.repeat(navy);
  const body = `${side}nn${middle}nn${side}`;
  return '.'.repeat(left) + body + '.'.repeat(32 - left - body.length);
}

/** Rows 26-31: two rows of neck and collar, then the buttoned front. */
const SHIRT = [
  shirtRow(7, 5, 'ssss'),
  shirtRow(4, 9, 'ss'),
  shirtRow(1, 12, 'PP'),
  shirtRow(1, 12, 'PP'),
  shirtRow(1, 12, 'PP'),
  shirtRow(1, 12, 'PP'),
];

const HEAD_LEFT = 6;

export const MASCOT_FRAMES = Object.keys(FRAMES);

/** Draws one frame of the mascot on a 32x32 canvas. */
export function drawMascot(canvas, frame) {
  const overrides = FRAMES[frame];
  if (!overrides) throw new Error(`Unknown mascot frame: ${frame}`);
  const paint = (rows, x, y) =>
    rows.forEach((row, ry) => {
      [...row].forEach((cell, rx) => {
        if (cell === '.') return;
        const value = LEGEND[cell];
        if (!value) throw new Error(`Unknown mascot colour: ${cell}`);
        setPixel(canvas, x + rx, y + ry, value);
      });
    });

  const head = HEAD.map((row, index) => overrides[index] ?? row);
  head.forEach((row) => {
    if (row.length !== 20) throw new Error(`Mascot row is ${row.length} wide: ${row}`);
  });
  SHIRT.forEach((row) => {
    if (row.length !== 32) throw new Error(`Mascot shirt row is ${row.length} wide: ${row}`);
  });
  paint(SHIRT, 0, 26);
  paint(head, HEAD_LEFT, 0);

  const z = SLEEP_Z[frame];
  if (z) {
    /* A dark outline keeps the white letter readable on any wallpaper. */
    const cells = [];
    Z_SPRITE.forEach((row, ry) => {
      [...row].forEach((cell, rx) => {
        if (cell !== '.') cells.push([z[0] + rx, z[1] + ry]);
      });
    });
    for (const [x, y] of cells) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) setPixel(canvas, x + dx, y + dy, LEGEND.K);
      }
    }
    for (const [x, y] of cells) setPixel(canvas, x, y, '#ffffff');
  }
}

export function createMascotCanvas(frame) {
  const canvas = createCanvas(32, 32);
  drawMascot(canvas, frame);
  return canvas;
}
