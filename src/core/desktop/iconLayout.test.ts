import { describe, expect, it } from 'vitest';
import { gridSize, ICON_MARGIN, nearestFreeSlot, resolveLayout, slotToPixels } from './iconLayout';

describe('desktop icon layout', () => {
  it('assigns free slots column by column', () => {
    const grid = gridSize({ width: 800, height: 600 });
    const layout = resolveLayout(['a', 'b', 'c'], {}, grid);
    expect(layout.a).toEqual({ col: 0, row: 0 });
    expect(layout.b).toEqual({ col: 0, row: 1 });
    expect(layout.c).toEqual({ col: 0, row: 2 });
    expect(slotToPixels(layout.a!)).toEqual({ x: ICON_MARGIN, y: ICON_MARGIN });
  });

  it('starts a new column when the measured rows are full', () => {
    const grid = gridSize({ width: 800, height: 600 });
    const ids = Array.from({ length: grid.rows + 3 }, (_, index) => `icon-${index}`);
    const layout = resolveLayout(ids, {}, grid);

    expect(layout[`icon-${grid.rows - 1}`]).toEqual({ col: 0, row: grid.rows - 1 });
    expect(layout[`icon-${grid.rows}`]).toEqual({ col: 1, row: 0 });
    expect(Object.values(layout)).toHaveLength(ids.length);
    expect(new Set(Object.values(layout).map((slot) => `${slot.col}:${slot.row}`)).size).toBe(ids.length);
  });

  it('never gives two icons the same slot', () => {
    const grid = gridSize({ width: 800, height: 600 });
    const layout = resolveLayout(['a', 'b', 'c'], { a: { col: 1, row: 1 }, b: { col: 1, row: 1 } }, grid);
    expect(layout.a).toEqual({ col: 1, row: 1 });
    expect(layout.b).not.toEqual(layout.a);
  });

  it('drops icons that fall outside a smaller grid', () => {
    const grid = gridSize({ width: 160, height: 160 });
    const layout = resolveLayout(['a'], { a: { col: 6, row: 9 } }, grid);
    expect(layout.a).toEqual({ col: 0, row: 0 });
  });

  it('ignores stored positions of items that no longer exist', () => {
    const grid = gridSize({ width: 800, height: 600 });
    const layout = resolveLayout(['a'], { a: { col: 2, row: 3 }, ghost: { col: 0, row: 0 } }, grid);
    expect(Object.keys(layout)).toEqual(['a']);
  });

  it('ignores the slot of the icon being dragged', () => {
    const grid = gridSize({ width: 800, height: 600 });
    const layout = resolveLayout(['a', 'b'], { a: { col: 0, row: 0 }, b: { col: 0, row: 1 } }, grid);
    const destination = nearestFreeSlot({ x: 5, y: 5 }, layout, ['a'], grid);
    expect(destination).toEqual({ col: 0, row: 0 });
  });

  it('finds another cell when the target is occupied', () => {
    const grid = gridSize({ width: 800, height: 600 });
    const layout = resolveLayout(['a', 'b'], { a: { col: 0, row: 0 }, b: { col: 0, row: 1 } }, grid);
    const destination = nearestFreeSlot({ x: 5, y: 80 }, layout, ['a'], grid);
    expect(destination).not.toEqual(layout.b);
  });

  it('keeps a destination available when every visible cell is occupied', () => {
    const grid = { cols: 1, rows: 1 };
    const layout = { a: { col: 2, row: 0 }, b: { col: 0, row: 0 }, c: { col: 1, row: 0 } };
    const destination = nearestFreeSlot({ x: 5, y: 5 }, layout, ['a'], grid);

    expect(destination).toEqual({ col: 2, row: 0 });
  });

  it('searches one column beyond the existing layout when no icon is excluded', () => {
    const grid = { cols: 1, rows: 1 };
    const layout = { a: { col: 0, row: 0 }, b: { col: 1, row: 0 } };

    expect(nearestFreeSlot({ x: 5, y: 5 }, layout, [], grid)).toEqual({ col: 2, row: 0 });
  });
});
