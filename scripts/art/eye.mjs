/**
 * The owner's mark: a single eye in the Egyptian style of the Eye of Horus,
 * reduced to the almond and the pupil. The heavy upper lid hides the top of
 * the pupil, which gives it a calm look.
 *
 * It is the icon of the Welcome window. The 16x16 version is drawn by hand
 * because the 32x32 one scaled down loses the white of the eye.
 */
import { stamp } from '../lib/raster.mjs';

const EYE = [
  '........KKKKKKK...........',
  '......KKKKKKKKKKKK........',
  '....KKKKKKKKKKKKKKKK......',
  '...KKKKKKKKKKKKKKKKKKK....',
  '..KKKKKKKKKKKKKKKKKKKKK...',
  '.KKKKKWWKKKKKKWWWWKKKKKK..',
  'KKKKKWWWKKKKKKWWWWWWKKKKK.',
  '.KKWWWWWKKKKKKWWWWWWWKKKK.',
  '..KKWWWWWKKKKWWWWWWWKKK...',
  '....KKKWWWWWWWWWWKKKK.....',
  '......KKKKKKKKKKKK........',
  '.........KKKK.............',
];

const EYE16 = [
  '....KKKKK....',
  '..KKKKKKKKK..',
  '.KWWWKKKWWWK.',
  'KWWWWKKKWWWWK',
  '.KKWWWWWWKKK.',
  '...KKKKKK....',
];

/** 32x32, centred. */
export function drawEyeIcon(canvas) {
  stamp(canvas, EYE, 3, 10);
}

/** 16x16, centred. */
export function drawEyeIcon16(canvas) {
  stamp(canvas, EYE16, 2, 5);
}
