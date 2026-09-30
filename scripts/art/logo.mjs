/**
 * The nilparra.dev mark: a Windows 95 terminal window titled "nil" with a
 * `>_` prompt.
 *
 * It is the site's own logo, not a desktop icon, so it lives outside the icon
 * registry. The generator turns it into the favicon, the ICO, the SVG and the
 * PWA and Apple icons. The 16x16 version is drawn by hand because a scaled
 * down 32x32 turns the prompt into a smudge at tab size. It keeps only the
 * prompt: its 2px title bar has no room for the name.
 */
import { bevel, hLine, rect, stamp, vLine } from '../lib/raster.mjs';

/** Draws each cell of a sprite as a `factor` x `factor` block. */
function stampScaled(canvas, rows, x, y, factor) {
  rows.forEach((row, ry) => {
    [...row].forEach((cell, rx) => {
      if (cell === '.') return;
      rect(canvas, x + rx * factor, y + ry * factor, factor, factor, cell);
    });
  });
}

const CHEVRON = ['D..', '.D.', '..D', '.D.', 'D..'];

/** Lowercase "nil": x-height of 3 rows, the dot and the ascender reach 5. */
const TITLE = ['....W.W', '......W', 'WWW.W.W', 'W.W.W.W', 'W.W.W.W'];

/** 32x32: window frame, navy title bar with "nil" and a close box, sunken black screen. */
export function drawLogo(c) {
  bevel(c, 1, 2, 30, 28, { fill: 'L', outline: 'K' });
  rect(c, 3, 4, 26, 7, 'N');
  stamp(c, TITLE, 5, 5);
  rect(c, 24, 5, 3, 5, 'L');

  // Sunken screen: shadow on the top-left edge, light on the bottom-right.
  rect(c, 4, 13, 24, 14, 'K');
  hLine(c, 3, 12, 26, 'G');
  vLine(c, 3, 12, 16, 'G');
  hLine(c, 3, 27, 26, 'W');
  vLine(c, 28, 12, 16, 'W');

  stampScaled(c, CHEVRON, 7, 15, 2);
  rect(c, 16, 23, 10, 2, 'W');
}

/** 16x16: the same window with a 1px prompt. */
export function drawLogo16(c) {
  bevel(c, 0, 1, 16, 14, { fill: 'L', outline: 'K' });
  rect(c, 2, 3, 12, 2, 'N');
  rect(c, 2, 6, 12, 7, 'K');
  stamp(c, CHEVRON, 4, 7);
  hLine(c, 9, 11, 3, 'W');
}
