/**
 * Vector helpers on top of the pixel raster: polygon filling with the even-odd
 * rule and a "union outline" pass used by the monochrome cursors.
 */
import { setPixel, getPixel } from './raster.mjs';

/** Fills a polygon (list of [x, y] pixel coordinates) using the even-odd rule. */
export function fillPolygon(canvas, points, value) {
  if (points.length < 3) return;
  const ys = points.map((p) => p[1]);
  const minY = Math.max(0, Math.min(...ys));
  const maxY = Math.min(canvas.height - 1, Math.max(...ys));
  for (let y = minY; y <= maxY; y += 1) {
    const cy = y + 0.5;
    const crossings = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if (y1 === y2) continue;
      if ((cy >= Math.min(y1, y2)) && (cy < Math.max(y1, y2))) {
        const t = (cy - y1) / (y2 - y1);
        crossings.push(x1 + t * (x2 - x1));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.round(crossings[i]);
      const to = Math.round(crossings[i + 1]) - 1;
      for (let x = from; x <= to; x += 1) {
        if (x < 0 || x >= canvas.width) continue;
        if (canvas.pixels[y * canvas.width + x] === null) setPixel(canvas, x, y, value);
      }
    }
  }
}

/** Draws a filled rectangle as a polygon so it can take part in a union. */
export function fillBox(canvas, x, y, w, h, value) {
  fillPolygon(
    canvas,
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    value,
  );
}

/**
 * Turns every filled shape of the canvas into "white fill + 1px black outline":
 * pixels of the silhouette that touch air become the outline colour.
 */
export function outlineShape(canvas, value = 'K') {
  const snapshot = canvas.pixels.slice();
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    return snapshot[y * canvas.width + x];
  };
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (!at(x, y)) continue;
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) {
        setPixel(canvas, x, y, value);
      }
    }
  }
}

/** Rotates points 90 degrees counter-clockwise around the origin. */
export function rotateCCW(points) {
  return points.map(([x, y]) => [y, -x]);
}

export function translate(points, dx, dy) {
  return points.map(([x, y]) => [x + dx, y + dy]);
}

export function bounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export function mirrorX(points) {
  const { minX, maxX } = bounds(points);
  return points.map(([x, y]) => [minX + maxX - x, y]);
}

export function mirrorY(points) {
  const { minY, maxY } = bounds(points);
  return points.map(([x, y]) => [x, minY + maxY - y]);
}

export { getPixel };
