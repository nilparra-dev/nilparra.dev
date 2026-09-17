/**
 * Desktop icon positions.
 *
 * Icons live on a 75x75 pixel grid (the classic cell size) and only their slot
 * is stored, so the layout survives a resolution change: the grid is
 * recalculated and every icon keeps a valid position.
 */
import { readStored, writeStored } from '../persist/storage';

export interface IconSlot {
  col: number;
  row: number;
}

export const ICON_CELL = 75;
/** Distance from the top-left corner of the desktop, as in the reference. */
export const ICON_MARGIN = 8;

const LAYOUT_VERSION = 1;
const LAYOUT_KEY = 'desktop-icons';

export type IconLayout = Record<string, IconSlot>;

export function readIconLayout(): IconLayout {
  const stored = readStored<IconLayout>(LAYOUT_KEY, LAYOUT_VERSION, {});
  if (!stored || typeof stored !== 'object') return {};
  const clean: IconLayout = {};
  for (const [id, slot] of Object.entries(stored)) {
    if (
      slot &&
      typeof slot.col === 'number' &&
      typeof slot.row === 'number' &&
      Number.isFinite(slot.col) &&
      Number.isFinite(slot.row)
    ) {
      clean[id] = { col: Math.max(0, Math.round(slot.col)), row: Math.max(0, Math.round(slot.row)) };
    }
  }
  return clean;
}

export function writeIconLayout(layout: IconLayout): void {
  writeStored(LAYOUT_KEY, LAYOUT_VERSION, layout);
}

export function gridSize(area: { width: number; height: number }): { cols: number; rows: number } {
  return {
    cols: Math.max(1, Math.floor((area.width - ICON_MARGIN) / ICON_CELL)),
    rows: Math.max(1, Math.floor((area.height - ICON_MARGIN) / ICON_CELL)),
  };
}

export function slotToPixels(slot: IconSlot): { x: number; y: number } {
  return {
    x: ICON_MARGIN + slot.col * ICON_CELL,
    y: ICON_MARGIN + slot.row * ICON_CELL,
  };
}

export function slotKey(slot: IconSlot): string {
  return `${slot.col}:${slot.row}`;
}

/**
 * Ensures every icon of `ids` has a slot: stored positions are respected and
 * the rest fill the free cells column by column, exactly like the original
 * desktop filled the left side first.
 */
export function resolveLayout(
  ids: string[],
  stored: IconLayout,
  grid: { cols: number; rows: number },
): IconLayout {
  const result: IconLayout = {};
  const taken = new Set<string>();
  const wanted = new Set(ids);

  for (const id of ids) {
    const slot = stored[id];
    if (!slot) continue;
    if (slot.col >= grid.cols || slot.row >= grid.rows) continue;
    if (taken.has(slotKey(slot))) continue;
    result[id] = slot;
    taken.add(slotKey(slot));
  }

  for (const id of ids) {
    if (result[id]) continue;
    let placed = false;
    // Column by column, and never lose an icon: if the grid runs out of rows
    // the extra icons keep filling downwards (they become reachable again as
    // soon as the window is resized or the icons are rearranged).
    for (let col = 0; col < grid.cols && !placed; col += 1) {
      for (let row = 0; row < 400 && !placed; row += 1) {
        const candidate = { col, row };
        if (taken.has(slotKey(candidate))) continue;
        result[id] = candidate;
        taken.add(slotKey(candidate));
        placed = true;
      }
    }
  }

  // Drop positions of items that no longer exist.
  for (const id of Object.keys(result)) {
    if (!wanted.has(id)) delete result[id];
  }

  return result;
}

/** Nearest free slot to a pixel position, used after dragging an icon. */
export function nearestFreeSlot(
  point: { x: number; y: number },
  layout: IconLayout,
  movingIds: string[],
  grid: { cols: number; rows: number },
): IconSlot {
  const moving = new Set(movingIds);
  const taken = new Set(
    Object.entries(layout)
      .filter(([id]) => !moving.has(id))
      .map(([, slot]) => slotKey(slot)),
  );
  const target = {
    col: Math.max(0, Math.min(grid.cols - 1, Math.round((point.x - ICON_MARGIN) / ICON_CELL))),
    row: Math.max(0, Math.min(grid.rows - 1, Math.round((point.y - ICON_MARGIN) / ICON_CELL))),
  };
  if (!taken.has(slotKey(target))) return target;

  let best: IconSlot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let col = 0; col < grid.cols; col += 1) {
    for (let row = 0; row < grid.rows; row += 1) {
      const candidate = { col, row };
      if (taken.has(slotKey(candidate))) continue;
      const distance = Math.abs(candidate.col - target.col) + Math.abs(candidate.row - target.row) * 0.6;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
  }
  return best ?? target;
}
