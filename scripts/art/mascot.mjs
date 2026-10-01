/**
 * The desktop mascot: a 32x32 pixel portrait of the site's owner, drawn from
 * the profile photo (brown hair parted on one side and swept across the
 * forehead, strong brows, light stubble, navy collared shirt).
 *
 * It is original work and uses its own palette instead of the Windows 95 one,
 * so it reads as a person and not as a system icon.
 *
 * The portrait is split in layers that the runtime stacks: one base (head,
 * hair and shirt, with bare skin where the features go), one pair of eyes with
 * their brows, one mouth and an optional overlay. Gaze and expression then
 * combine freely without drawing every combination.
 */
import { createCanvas, setPixel } from '../lib/raster.mjs';
import { blit } from '../lib/png.mjs';

export const MASCOT_SIZE = 32;

const LEGEND = {
  K: '#1a1210', // outline
  H: '#4f3523', // hair
  h: '#7a5536', // hair highlight
  D: '#33211a', // hair shadow
  S: '#efc7a6', // skin
  s: '#d9a684', // skin shadow
  U: '#d7ad92', // stubble
  B: '#2a1c14', // brows
  L: '#6e4634', // upper lid
  W: '#f6f2ec', // eye white
  E: '#3a2a1c', // iris
  M: '#a8625c', // lips
  O: '#5a1f22', // open mouth
  N: '#1c2340', // shirt
  n: '#3d4d8c', // collar
  P: '#10152a', // placket
  R: '#e0392b', // anger mark
  F: '#e3836e', // flushed cheeks
};

/** Rows 0-25: the head and the neck, 20 columns wide, centred on the canvas. */
const HEAD = [
  '......KKKKKKKKKK....',
  '...KKKHHHHhhHHHHKK..',
  '..KHHHHhhhhHHHHHHHK.',
  '.KHHHhhhhHHHHhhHHHK.',
  'KHHHhhhHHHHhhhHHHHHK',
  'KHHhhHHHHHHHHHHhhHHK',
  'KHHDDSSSSHHHHHHHhhHK',
  'KHHDSSSSSSSSHHHHHhHK',
  'KHDSSSSSSSSSSSSDHHHK',
  'KHDSSSSSSSSSSSSSSDHK', // 9: brows
  'KHSSSSSSSSSSSSSSSSHK',
  'KHSSSSSSSSSSSSSSSSHK', // 11: upper lids
  'KSSSSSSSSSSSSSSSSSSK', // 12-13: eyes, between the ears
  'KSSSSSSSSSSSSSSSSSSK',
  'KsSSSSSSSSsSSSSSSSsK',
  '.KSSSSSSSSsSSSSSSSK.',
  '.KSSSSSSSssSSSSSSSK.',
  '.KSSSSSUUUUUUSSSSSK.',
  '..KSSSSSSSSSSSSSSK..', // 18: mouth
  '..KUSSSSSSSSSSSSUK..',
  '...KUUSSSSSSSSUUK...',
  '....KUUUUUUUUUUK....',
  '.....KKsUUUUsKK.....',
  '......KssssssK......',
  '......KsSSSSsK......',
  '......KSSSSSSK......',
];

const HEAD_LEFT = 6;

/** Builds a full row from its left half, so both shoulders always match. */
const mirrored = (half) => half + [...half].reverse().join('');

/** Rows 26-31: the open collar over the neck, then the buttoned front. */
const SHIRT = [
  '......KKNNNNnnSS',
  '...KKKNNNNNNNnnS',
  '.KKNNNNNNNNNNNnP',
  'KNNNNNNNNNNNNNNP',
  'KNNNNNNNNNNNNNNP',
  'KNNNNNNNNNNNNNNP',
].map(mirrored);

const SHIRT_TOP = 26;

/* --------------------------------------------------------------- *
 * Eyes
 * --------------------------------------------------------------- */

const EYE_WIDTH = 4;
const LEFT_EYE_X = HEAD_LEFT + 4;
const RIGHT_EYE_X = HEAD_LEFT + 12;
/** Canvas row of the brows at rest; the eye sprites start here. */
const EYES_TOP = 9;

/**
 * Open eye looking towards (gx, gy), each -1, 0 or 1. The iris is two pixels
 * wide and slides sideways; looking up or down it keeps only the row on that
 * side, which leaves the white showing on the other one.
 */
function openEye(gx, gy) {
  const iris = '.'.repeat(1 + gx) + 'EE' + '.'.repeat(1 - gx);
  const row = (visible) => [...iris].map((cell) => (visible && cell === 'E' ? 'E' : 'W')).join('');
  return ['BBBB', '....', 'LLLL', row(gy <= 0), row(gy >= 0)];
}

const GAZES = {
  center: [0, 0],
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
  'up-left': [-1, -1],
  'up-right': [1, -1],
  'down-left': [-1, 1],
  'down-right': [1, 1],
};

/**
 * Each entry is the left eye, rows from EYES_TOP - 1 (room for raised brows).
 * The right eye is its mirror image unless `same` says both look alike, which
 * is what a shared gaze direction needs.
 */
const EYES = {
  ...Object.fromEntries(
    Object.entries(GAZES).map(([id, [gx, gy]]) => [id, { rows: ['....', ...openEye(gx, gy)], same: true }]),
  ),
  closed: { rows: ['....', 'BBBB', '....', '....', '....', 'KKKK'] },
  /* Smiling so much the eyes arch shut. */
  joy: { rows: ['....', 'BBBB', '....', '....', '.KK.', 'K..K'] },
  /* Screwed shut: > < */
  wince: { rows: ['....', '....', '....', 'KK..', '..KK', 'KK..'] },
  /* Brows slanted down towards the nose. */
  angry: { rows: ['....', 'BB..', '..BB', 'LLLL', 'WEEW', 'WEEW'] },
  /* Brows up. */
  surprised: { rows: ['BBBB', '....', '....', 'LLLL', 'WEEW', 'WEEW'] },
};

/* --------------------------------------------------------------- *
 * Mouths
 * --------------------------------------------------------------- */

/** Six columns wide, centred under the nose, rows from MOUTH_TOP. */
const MOUTH_LEFT = HEAD_LEFT + 7;
const MOUTH_TOP = 17;

const MOUTHS = {
  neutral: ['......', '.MMMM.'],
  smile: ['M....M', '.MMMM.'],
  /* The two frames of speech. */
  ajar: ['......', '.MOOM.'],
  open: ['......', '.OOOO.', '..MM..'],
  laugh: ['M....M', '.OOOO.', '..MM..'],
  round: ['......', '..OO..', '..OO..'],
  frown: ['......', '.MMMM.', 'M....M'],
  /* Clenched teeth. */
  grit: ['......', 'MWWWWM', 'M....M'],
  wobble: ['......', '.MM..M', 'M..MM.'],
};

/* --------------------------------------------------------------- *
 * Overlays
 * --------------------------------------------------------------- */

const SMALL_Z = ['WWWW', '..W.', '.W..', 'WWWW'];
const BIG_Z = ['WWWWW', '...W.', '..W..', '.W...', 'WWWWW'];

const ANGER_MARK = ['.R..R.', 'RR..RR', '......', '......', 'RR..RR', '.R..R.'];

/**
 * Stamps drawn over the face. `shadow` adds a dark copy down and to the
 * right instead of a full outline: the letters stay readable on light and
 * dark wallpapers without turning into a black box.
 */
const OVERLAYS = {
  /* The snore: a small "z" that rises and grows on the second beat. */
  sleep1: [{ rows: SMALL_Z, x: 27, y: 7, shadow: true }],
  sleep2: [{ rows: BIG_Z, x: 26, y: 1, shadow: true }],
  /* The comic book vein next to the head, and red cheeks. */
  anger: [
    { rows: ANGER_MARK, x: 26, y: 1 },
    { rows: ['FFF', 'FF.'], x: HEAD_LEFT + 2, y: 14 },
    { rows: ['FFF', '.FF'], x: HEAD_LEFT + 15, y: 14 },
  ],
};

/* --------------------------------------------------------------- *
 * Tray icon
 * --------------------------------------------------------------- */

/** Side of the head drawn by hand for the taskbar tray. */
export const MASCOT_TRAY_SIZE = 16;

const TRAY_HEAD = [
  '....KKKKKKKK....',
  '..KKHHhhhHHHKK..',
  '.KHHhhHHHHhhHHK.',
  '.KHHHHHHHHHhhHK.',
  '.KHDSSSSHHHHHHK.',
  '.KHSSSSSSSSDHHK.',
  '.KSBBBSSSSBBBSK.', // 6: brows
  '.KSSSSSSSSSSSSK.',
  '.KSSEESSSSEESSK.', // 8: eyes
  '.KSSSSSssSSSSSK.',
  '..KSSSSSSSSSSK..',
  '..KSSSMMMMSSSK..', // 11: mouth
  '...KUSSSSSSUK...',
  '....KKUUUUKK....',
  '..KKNNnSSnNNKK..',
  '.KNNNNNnnNNNNNK.',
];

/** Rows each tray face replaces in TRAY_HEAD. */
const TRAY_FACES = {
  idle: {},
  talk: { 11: '..KSSSOOOOSSSK..' },
  closed: { 8: '.KSSLLSSSSLLSSK.' },
  angry: {
    6: '.KSSSSSSSSSSSSK.',
    7: '.KSBBSSSSSSBBSK.',
    8: '.KSFEBSSSSBEFSK.',
    11: '..KSSSMMMMSSSK..',
    12: '...KUMSSSSMUK...',
  },
};

/* --------------------------------------------------------------- *
 * Drawing
 * --------------------------------------------------------------- */

function paint(canvas, rows, x, y) {
  rows.forEach((row, ry) => {
    [...row].forEach((cell, rx) => {
      if (cell === '.') return;
      const value = LEGEND[cell];
      if (!value) throw new Error(`Unknown mascot colour: ${cell}`);
      setPixel(canvas, x + rx, y + ry, value);
    });
  });
}

function assertWidths(name, rows, width) {
  for (const row of rows) {
    if (row.length !== width) throw new Error(`Mascot ${name} row is ${row.length} wide: ${row}`);
  }
}

function drawBase(canvas) {
  assertWidths('head', HEAD, 20);
  assertWidths('shirt', SHIRT, MASCOT_SIZE);
  paint(canvas, SHIRT, 0, SHIRT_TOP);
  paint(canvas, HEAD, HEAD_LEFT, 0);
}

function drawEyes(canvas, id) {
  const { rows, same } = EYES[id];
  assertWidths(`eyes "${id}"`, rows, EYE_WIDTH);
  const mirror = rows.map((row) => [...row].reverse().join(''));
  paint(canvas, rows, LEFT_EYE_X, EYES_TOP - 1);
  paint(canvas, same ? rows : mirror, RIGHT_EYE_X, EYES_TOP - 1);
}

function drawMouth(canvas, id) {
  assertWidths(`mouth "${id}"`, MOUTHS[id], 6);
  paint(canvas, MOUTHS[id], MOUTH_LEFT, MOUTH_TOP);
}

function drawOverlay(canvas, id) {
  for (const { rows, x, y, shadow } of OVERLAYS[id]) {
    if (shadow) paint(canvas, rows.map((row) => row.replace(/[^.]/g, 'K')), x + 1, y + 1);
    paint(canvas, rows, x, y);
  }
}

/** The tray head sits in the top left corner of its cell, at its own size. */
function drawTray(canvas, id) {
  const rows = TRAY_HEAD.map((row, index) => TRAY_FACES[id][index] ?? row);
  assertWidths(`tray "${id}"`, rows, MASCOT_TRAY_SIZE);
  paint(canvas, rows, 0, 0);
}

const LAYERS = {
  base: { ids: ['base'], draw: drawBase },
  eyes: { ids: Object.keys(EYES), draw: drawEyes },
  mouth: { ids: Object.keys(MOUTHS), draw: drawMouth },
  overlay: { ids: Object.keys(OVERLAYS), draw: drawOverlay },
  tray: { ids: Object.keys(TRAY_FACES), draw: drawTray },
};

/** Every sprite of the mascot, in sheet order: `{ layer, id }`. */
export const MASCOT_SPRITES = Object.entries(LAYERS).flatMap(([layer, { ids }]) =>
  ids.map((id) => ({ layer, id })),
);

/** Draws one sprite on its own transparent 32x32 canvas. */
export function createMascotSprite(layer, id) {
  const definition = LAYERS[layer];
  if (!definition?.ids.includes(id)) throw new Error(`Unknown mascot sprite: ${layer}/${id}`);
  const canvas = createCanvas(MASCOT_SIZE, MASCOT_SIZE);
  definition.draw(canvas, id);
  return canvas;
}

/** Stacks the layers the way the runtime does, for the review sheet. */
export function composeMascot({ eyes, mouth, overlay }) {
  const canvas = createMascotSprite('base', 'base');
  blit(canvas, createMascotSprite('eyes', eyes), 0, 0);
  blit(canvas, createMascotSprite('mouth', mouth), 0, 0);
  if (overlay) blit(canvas, createMascotSprite('overlay', overlay), 0, 0);
  return canvas;
}

/** The faces worth reviewing side by side (qa/mascot-sheet@4x.png). */
export const MASCOT_REVIEW = [
  { eyes: 'center', mouth: 'neutral' },
  { eyes: 'up-left', mouth: 'neutral' },
  { eyes: 'left', mouth: 'neutral' },
  { eyes: 'up', mouth: 'smile' },
  { eyes: 'down-right', mouth: 'neutral' },
  { eyes: 'closed', mouth: 'neutral' },
  { eyes: 'center', mouth: 'ajar' },
  { eyes: 'center', mouth: 'open' },
  { eyes: 'center', mouth: 'smile' },
  { eyes: 'joy', mouth: 'laugh' },
  { eyes: 'wince', mouth: 'wobble' },
  { eyes: 'angry', mouth: 'grit', overlay: 'anger' },
  { eyes: 'surprised', mouth: 'round' },
  { eyes: 'closed', mouth: 'round', overlay: 'sleep1' },
  { eyes: 'closed', mouth: 'neutral', overlay: 'sleep2' },
];
