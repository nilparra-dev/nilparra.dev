import { describe, expect, it } from 'vitest';
import { ICON_CELL, ICON_MARGIN } from '../desktop/iconLayout';
import { cascadeRect } from './layout';

describe('cascadeRect', () => {
  it('opens beside the first two icon columns when the window fits', () => {
    const rect = cascadeRect(0, { width: 540, height: 400 }, { width: 1152, height: 686 });
    expect(rect.x).toBeGreaterThanOrEqual(ICON_MARGIN + ICON_CELL * 2);
  });

  it('clears only the first column when two do not fit', () => {
    const rect = cascadeRect(0, { width: 540, height: 400 }, { width: 700, height: 600 });
    expect(rect.x).toBeGreaterThanOrEqual(ICON_MARGIN + ICON_CELL);
    expect(rect.x).toBeLessThan(ICON_MARGIN + ICON_CELL * 2);
  });

  it('falls back to the left edge when the viewport is too narrow', () => {
    const rect = cascadeRect(0, { width: 300, height: 400 }, { width: 320, height: 600 });
    expect(rect.x).toBeLessThan(ICON_MARGIN + ICON_CELL);
    expect(rect.x + rect.width).toBeLessThanOrEqual(320);
  });
});
