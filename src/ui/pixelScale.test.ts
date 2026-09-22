import { describe, expect, it } from 'vitest';
import { automaticPixelScale, availablePixelScales, isPixelScalePreference, resolvePixelScale } from './pixelScale';

const screen = (width: number, height: number, devicePixelRatio: number) => ({ width, height, devicePixelRatio });

describe('pixel scale', () => {
  it('always lands on a whole number of screen pixels per interface pixel', () => {
    for (const dpr of [1, 1.25, 1.5, 1.75, 2, 2.625, 3]) {
      const scale = automaticPixelScale(screen(Math.round(1920 / dpr), Math.round(1080 / dpr), dpr));
      expect(Number.isInteger(scale)).toBe(true);
      expect(scale).toBeGreaterThanOrEqual(1);
    }
  });

  it('aims for text close to 16.5 CSS px on common screens', () => {
    expect(automaticPixelScale(screen(1920, 1080, 1))).toBe(2);
    expect(automaticPixelScale(screen(1536, 864, 1.25))).toBe(2);
    expect(automaticPixelScale(screen(1280, 720, 1.5))).toBe(2);
    expect(automaticPixelScale(screen(1440, 900, 2))).toBe(3);
  });

  it('never leaves a desktop too small for floating windows', () => {
    // 1366x768 at 100 %: 2x would leave 683x384, so only the original size fits.
    expect(availablePixelScales(screen(1366, 768, 1))).toEqual([1]);
    expect(automaticPixelScale(screen(1366, 768, 1))).toBe(1);
  });

  it('keeps phones readable on the compact layout', () => {
    expect(automaticPixelScale(screen(390, 844, 3))).toBe(3);
  });

  it('honours a forced scale only when it fits', () => {
    expect(resolvePixelScale(1, screen(1920, 1080, 1))).toBe(1);
    expect(resolvePixelScale(5, screen(1920, 1080, 1))).toBe(2);
  });

  it('accepts only auto or a small whole number as a stored preference', () => {
    expect(isPixelScalePreference('auto')).toBe(true);
    expect(isPixelScalePreference(2)).toBe(true);
    expect(isPixelScalePreference(1.5)).toBe(false);
    expect(isPixelScalePreference('2')).toBe(false);
  });
});
