/**
 * Desktop icon positions.
 *
 * Icons live on a 90x90 pixel grid (a slightly enlarged classic cell) and only their slot
 * is stored, so the layout survives a resolution change: the grid is
 * recalculated and every icon keeps a valid position.
 */
import { readStored, writeStored } from '../persist/storage';

export interface IconSlot {
  col: number;
  row: number;
}

export const ICON_CELL = 90;
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
    cols: Math.max(1, Math.floor((Math.max(0, area.width) - ICON_MARGIN) / ICON_CELL)),
    rows: Math.max(1, Math.floor((Math.max(0, area.height) - ICON_MARGIN) / ICON_CELL)),
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
 * desktop filled the left side first. When a small viewport has more icons
 * than visible cells, the logical grid continues into extra columns. The
 * desktop surface can scroll in that exceptional case, so an icon is never
 * dropped just because the viewport became smaller.
 */
export function resolveLayout(
  ids: string[],
  stored: IconLayout,
  grid: { cols: number; rows: number },
): IconLayout {
  const result: IconLayout = {};
  const taken = new Set<string>();

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
    // The row limit is the measured grid height. The old implementation used
    // a hard-coded 400 here, which put every icon below the taskbar instead of
    // moving to the next column once the visible rows were exhausted.
    for (let col = 0; col < grid.cols + ids.length && !placed; col += 1) {
      for (let row = 0; row < grid.rows && !placed; row += 1) {
        const candidate = { col, row };
        if (taken.has(slotKey(candidate))) continue;
        result[id] = candidate;
        taken.add(slotKey(candidate));
        placed = true;
      }
    }
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
  // Search the visible grid first, then enough overflow columns to guarantee
  // a free destination even when every visible cell is occupied.
  const largestExistingColumn = Object.values(layout).reduce(
    (largest, slot) => Math.max(largest, slot.col),
    grid.cols - 1,
  );
  const searchColumns = Math.max(grid.cols, largestExistingColumn + 2) + movingIds.length;
  for (let col = 0; col < searchColumns; col += 1) {
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
