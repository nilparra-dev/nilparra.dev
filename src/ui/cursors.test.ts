// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CURSOR_ASSETS } from '../assets/generated/cursors';
import { applyCursorScale, cursorImageFor, cursorValue } from './cursors';
import { pixelPerfectScale } from './scale';

describe('cursorImageFor', () => {
  it.each([1, 1.75, 2, 2.625, 3])(
    'maps one art pixel to whole device pixels on the pixel perfect zoom at %sx',
    (dpr) => {
      const uiScale = pixelPerfectScale(dpr);
      const { scale, resolution } = cursorImageFor(uiScale, dpr);
      // Device pixels drawn per image pixel.
      expect(dpr / resolution).toBeCloseTo(1, 9);
      expect(scale).toBe(Math.round(uiScale * dpr));
    },
  );

  it.each([
    [1.25, 1],
    [1.25, 1.25],
    [1, 2],
    [1.25, 1.5],
  ])('sizes the pointer with the interface (zoom %s at %sx)', (uiScale, dpr) => {
    const { scale, resolution } = cursorImageFor(uiScale, dpr);
    // CSS pixels per art pixel.
    expect(scale / resolution).toBeCloseTo(uiScale, 9);
  });

  it('stays within the generated sizes', () => {
    expect(cursorImageFor(1.25, 4).scale).toBe(3);
    expect(cursorImageFor(1, 0.5).scale).toBe(1);
    expect(cursorImageFor(1, Number.NaN).scale).toBe(1);
  });
});

describe('cursorValue', () => {
  it('scales the hotspot with the interface and keeps the native fallback', () => {
    const [hx, hy] = CURSOR_ASSETS.hand.hotspot;
    const value = cursorValue('hand', 1.25, 1);
    expect(value).toContain(CURSOR_ASSETS.hand.images[1]);
    expect(value).toContain(') 0.8x)');
    expect(value).toMatch(new RegExp(` ${Math.round(hx * 1.25)} ${Math.round(hy * 1.25)}, pointer$`));
  });
});

describe('applyCursorScale', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('style');
  });

  it('rewrites every cursor property when image-set() is supported', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    applyCursorScale(1, 2);
    for (const id of Object.keys(CURSOR_ASSETS)) {
      expect(document.documentElement.style.getPropertyValue(`--cursor-${id}`)).toMatch(/^image-set\(/);
    }
  });

  it('keeps the stylesheet values when image-set() is not supported', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    applyCursorScale(1, 2);
    expect(document.documentElement.style.getPropertyValue('--cursor-arrow')).toBe('');
  });
});
