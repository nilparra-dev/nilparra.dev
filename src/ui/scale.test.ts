import { describe, expect, it } from 'vitest';
import { pixelPerfectScale } from './scale';

describe('pixelPerfectScale', () => {
  it.each([
    [1, 1],
    [1.75, 2],
    [2, 2],
    [2.625, 3],
    [3, 3],
  ])('at %sx draws each interface pixel with %s whole device pixels', (dpr, pixels) => {
    expect(pixelPerfectScale(dpr) * dpr).toBeCloseTo(pixels, 9);
  });

  it.each([1, 1.75, 2, 2.625, 3])('never zooms past the design size at %sx', (dpr) => {
    expect(pixelPerfectScale(dpr)).toBeLessThanOrEqual(1.25);
  });

  it.each([1.25, 1.5])('keeps the design size at %sx, where no whole pixel count is comfortable', (dpr) => {
    expect(pixelPerfectScale(dpr)).toBe(1.25);
  });

  it('falls back to the design size when the ratio is unusable', () => {
    expect(pixelPerfectScale(0)).toBe(1.25);
    expect(pixelPerfectScale(Number.NaN)).toBe(1.25);
  });
});
