import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppLauncher } from '../core/apps/launcher';
import { useDialogs } from '../core/dialogs/DialogProvider';
import { useClipboard } from '../core/fs/clipboard';
import { useClipboardActions } from '../core/fs/useFileOpener';
import { useVfs } from '../core/fs/VfsProvider';
import { isValidName } from '../core/fs/vfsUtils';
import { useDesktopItems, type DesktopItem } from '../core/desktop/items';
import {
  gridSize,
  ICON_CELL,
  nearestFreeSlot,
  readIconLayout,
  resolveLayout,
  slotToPixels,
  writeIconLayout,
  type IconLayout,
} from '../core/desktop/iconLayout';
import { useI18n } from '../core/i18n/I18nProvider';
import { usePreferences } from '../core/prefs/PreferencesProvider';
import { findWallpaper, wallpaperStyle } from '../core/prefs/wallpapers';
import { uiPixels, uiRect, uiViewport } from '../ui/scale';
import { TASKBAR_HEIGHT } from '../core/window/layout';
import { Icon } from '../ui/Icon';
import { useMenuLayer } from '../ui/menu/MenuLayer';
import { menuSeparator, type MenuEntry } from '../ui/menu/types';

interface MarqueeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

function boxFromPoints(a: { x: number; y: number }, b: { x: number; y: number }): MarqueeBox {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function intersects(a: MarqueeBox, b: MarqueeBox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * The desktop: wallpaper, icons with the classic selection and drag
 * behaviour, marquee selection, keyboard navigation and the background menu.
 */
export function Desktop() {
  const launch = useAppLauncher();
  const { t } = useI18n();
  const { preferences, update } = usePreferences();
  const items = useDesktopItems();
  const { open: openMenu } = useMenuLayer();
  const vfs = useVfs();
  const dialogs = useDialogs();
  const clipboard = useClipboard();
  const { paste } = useClipboardActions();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [area, setArea] = useState(() =>
    typeof window === 'undefined'
      ? { width: 0, height: 0 }
      : { width: uiViewport().width, height: Math.max(0, uiViewport().height - TASKBAR_HEIGHT) },
  );
  const [stored, setStored] = useState<IconLayout>(() => readIconLayout());
  const [selection, setSelection] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<MarqueeBox | null>(null);
  const [dragging, setDragging] = useState<{ ids: string[]; dx: number; dy: number } | null>(null);

  const grid = useMemo(() => gridSize(area), [area]);

  const layout = useMemo<IconLayout>(() => {
    const ids = items.map((item) => item.id);
    if (preferences.autoArrangeIcons) return resolveLayout(ids, {}, grid);
    return resolveLayout(ids, stored, grid);
  }, [items, stored, grid, preferences.autoArrangeIcons]);

  useEffect(() => {
    writeIconLayout(layout);
  }, [layout]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setArea({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelection((current) => current.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const openItem = useCallback(
    (item: DesktopItem) => {
      item.open();
    },
    [],
  );

  const openSelection = useCallback(() => {
    const targets = items.filter((item) => selection.includes(item.id));
    if (targets.length === 0 && focusedId) {
      const focused = items.find((item) => item.id === focusedId);
      if (focused) openItem(focused);
      return;
    }
    targets.forEach(openItem);
  }, [focusedId, items, openItem, selection]);

  /* --- icon pointer behaviour -------------------------------------- */

  const beginIconInteraction = (
    event: React.PointerEvent<HTMLButtonElement>,
    item: DesktopItem,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const surface = surfaceRef.current;
    surface?.focus({ preventScroll: true });
    setFocusedId(item.id);

    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    let nextSelection: string[];
    if (additive) {
      nextSelection = selection.includes(item.id)
        ? selection.filter((id) => id !== item.id)
        : [...selection, item.id];
    } else if (selection.includes(item.id)) {
      nextSelection = selection;
    } else {
      nextSelection = [item.id];
    }
    setSelection(nextSelection);

    const movingIds = additive ? [item.id] : nextSelection;
    const target = event.currentTarget;
    const surfaceRect = surface ? uiRect(surface) : new DOMRect();
    target.setPointerCapture(event.pointerId);
    const startSlot = layout[item.id];
    const origin = { x: uiPixels(event.clientX), y: uiPixels(event.clientY) };
    const grabOffset = startSlot
      ? {
          x: origin.x - surfaceRect.left - slotToPixels(startSlot).x,
          y: origin.y - surfaceRect.top - slotToPixels(startSlot).y,
        }
      : { x: ICON_CELL / 2, y: ICON_CELL / 2 };
    let moved = false;
    let lastPointer = { ...origin };

    const onMove = (moveEvent: PointerEvent) => {
      lastPointer = { x: uiPixels(moveEvent.clientX), y: uiPixels(moveEvent.clientY) };
      const dx = lastPointer.x - origin.x;
      const dy = lastPointer.y - origin.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      moved = true;
      setDragging({ ids: movingIds, dx, dy });
    };

    const finish = () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', finish);
      target.removeEventListener('pointercancel', finish);
      if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
      setDragging(null);
      if (!moved || preferences.autoArrangeIcons || !startSlot) return;

      // Where the icon would land, in surface coordinates.
      const dropCentre = {
        x: lastPointer.x - surfaceRect.left - grabOffset.x + ICON_CELL / 2,
        y: lastPointer.y - surfaceRect.top - grabOffset.y + ICON_CELL / 2,
      };
      const destination = nearestFreeSlot(dropCentre, layout, movingIds, grid);
      const dcol = destination.col - startSlot.col;
      const drow = destination.row - startSlot.row;
      if (dcol === 0 && drow === 0) return;

      const next: IconLayout = { ...layout };
      movingIds.forEach((id) => delete next[id]);
      for (const id of movingIds) {
        const current = layout[id];
        if (!current) continue;
        const desired = {
          col: Math.max(0, Math.min(grid.cols - 1, current.col + dcol)),
          row: Math.max(0, Math.min(grid.rows - 1, current.row + drow)),
        };
         // The moving entries were removed from `next`; include each slot
         // assigned in this loop so a multi-selection cannot collapse onto one
         // destination.
         next[id] = nearestFreeSlot(slotToPixels(desired), next, [], grid);
      }
      setStored(next);
    };

    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', finish);
    target.addEventListener('pointercancel', finish);
  };

  /* --- marquee selection ------------------------------------------- */

  const beginMarquee = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    if (event.target !== surface) return;
    surface.setPointerCapture(event.pointerId);
    const rect = uiRect(surface);
    const origin = { x: uiPixels(event.clientX) - rect.left, y: uiPixels(event.clientY) - rect.top };
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const baseSelection = additive ? selection : [];
    if (!additive) setSelection([]);

    const onMove = (moveEvent: PointerEvent) => {
      const current = {
        x: Math.max(0, Math.min(rect.width, uiPixels(moveEvent.clientX) - rect.left)),
        y: Math.max(0, Math.min(rect.height, uiPixels(moveEvent.clientY) - rect.top)),
      };
      const box = boxFromPoints(origin, current);
      setMarquee(box);
      const hits = items
        .filter((item) => {
          const slot = layout[item.id];
          if (!slot) return false;
          const pixels = slotToPixels(slot);
          return intersects(box, { x: pixels.x, y: pixels.y, width: ICON_CELL, height: ICON_CELL });
        })
        .map((item) => item.id);
      setSelection([...new Set([...baseSelection, ...hits])]);
      setFocusedId(hits[0] ?? null);
    };

    const finish = () => {
      surface.removeEventListener('pointermove', onMove);
      surface.removeEventListener('pointerup', finish);
      surface.removeEventListener('pointercancel', finish);
      if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      setMarquee(null);
    };

    surface.addEventListener('pointermove', onMove);
    surface.addEventListener('pointerup', finish);
    surface.addEventListener('pointercancel', finish);
  };

  /* --- keyboard ----------------------------------------------------- */

  const moveFocus = (direction: Direction) => {
    const currentId = focusedId ?? selection[0] ?? null;
    const currentSlot = currentId ? layout[currentId] : null;
    if (!currentSlot) {
      const first = items[0];
      if (first) {
        setFocusedId(first.id);
        setSelection([first.id]);
      }
      return;
    }
    let best: { id: string; distance: number } | null = null;
    for (const item of items) {
      if (item.id === currentId) continue;
      const slot = layout[item.id];
      if (!slot) continue;
      const dcol = slot.col - currentSlot.col;
      const drow = slot.row - currentSlot.row;
      const inDirection =
        (direction === 'up' && drow < 0 && Math.abs(dcol) <= Math.abs(drow) * 2) ||
        (direction === 'down' && drow > 0 && Math.abs(dcol) <= Math.abs(drow) * 2) ||
        (direction === 'left' && dcol < 0 && Math.abs(drow) <= Math.abs(dcol) * 2) ||
        (direction === 'right' && dcol > 0 && Math.abs(drow) <= Math.abs(dcol) * 2);
      if (!inDirection) continue;
      const distance = Math.abs(dcol) * 2 + Math.abs(drow) * 3;
      if (!best || distance < best.distance) best = { id: item.id, distance };
    }
    if (best) {
      setFocusedId(best.id);
      setSelection([best.id]);
      const element = surfaceRef.current?.querySelector<HTMLButtonElement>(`[data-icon-id="${best.id}"]`);
      element?.focus({ preventScroll: true });
    }
  };

  const desktopFolderId = vfs.folders.desktop;

  const createFolder = useCallback(async () => {
    if (!desktopFolderId) return;
    const created = await vfs.createFolder(desktopFolderId);
    if (!created) return;
    const name = await dialogs.prompt({
      title: t('desktop.newFolder'),
      label: t('common.name'),
      initialValue: created.name,
      validate: (value) => {
        if (!value.trim()) return t('dialog.nameRequired');
        if (!isValidName(value)) return t('dialog.invalidName');
        if (vfs.validateName(desktopFolderId, value, created.id) === 'taken') {
          return t('dialog.nameInUse', { name: value });
        }
        return null;
      },
    });
    if (name && name !== created.name) await vfs.rename(created.id, name);
    setSelection([`node:${created.id}`]);
  }, [desktopFolderId, dialogs, t, vfs]);

  const createDocument = useCallback(async () => {
    if (!desktopFolderId) return;
    const created = await vfs.createTextFile(desktopFolderId, t('file.newFileName'), '');
    if (!created) return;
    const name = await dialogs.prompt({
      title: t('desktop.newDocument'),
      label: t('common.name'),
      initialValue: created.name,
      validate: (value) => {
        if (!value.trim()) return t('dialog.nameRequired');
        if (!isValidName(value)) return t('dialog.invalidName');
        if (vfs.validateName(desktopFolderId, value, created.id) === 'taken') {
          return t('dialog.nameInUse', { name: value });
        }
        return null;
      },
    });
    if (name && name !== created.name) await vfs.rename(created.id, name);
    setSelection([`node:${created.id}`]);
  }, [desktopFolderId, dialogs, t, vfs]);

  const desktopMenu = (): MenuEntry[] => [
    {
      kind: 'submenu',
      id: 'arrange',
      label: t('desktop.arrangeIcons'),
      items: [
        {
          kind: 'item',
          id: 'auto',
          label: t('desktop.autoArrange'),
          checked: preferences.autoArrangeIcons,
          onSelect: () => update({ autoArrangeIcons: !preferences.autoArrangeIcons }),
        },
      ],
    },
    {
      kind: 'item',
      id: 'lineup',
      label: t('desktop.lineUpIcons'),
      disabled: preferences.autoArrangeIcons,
      onSelect: () => setStored((current) => resolveLayout(items.map((item) => item.id), current, grid)),
    },
    menuSeparator('sep'),
    {
      kind: 'item',
      id: 'paste',
      label: t('desktop.paste'),
      disabled: !clipboard || !desktopFolderId,
      onSelect: () => desktopFolderId && void paste(desktopFolderId),
    },
    {
      kind: 'submenu',
      id: 'new',
      label: t('desktop.new'),
      items: [
        { kind: 'item', id: 'new-folder', label: t('desktop.newFolder'), onSelect: () => void createFolder() },
        { kind: 'item', id: 'new-doc', label: t('desktop.newDocument'), onSelect: () => void createDocument() },
        menuSeparator('sep-import'),
        { kind: 'item', id: 'import', label: t('menu.import'), onSelect: () => fileInputRef.current?.click() },
      ],
    },
    menuSeparator('sep-properties'),
    {
      kind: 'item',
      id: 'properties',
      label: t('desktop.properties'),
      onSelect: () => launch({ appId: 'controlpanel' }),
    },
  ];

  const wallpaper = findWallpaper(preferences.wallpaperId);
  const backgroundStyle = wallpaperStyle(wallpaper);

  return (
    <div
      className="desktop"
      data-wallpaper={wallpaper.id}
      style={backgroundStyle}
      aria-label={t('folder.desktop')}
    >
      <div
        ref={surfaceRef}
        className="desktop-surface"
        tabIndex={0}
        role="listbox"
        aria-multiselectable="true"
        aria-label={t('folder.desktop')}
        onPointerDown={beginMarquee}
        onKeyDown={(event) => {
          switch (event.key) {
            case 'ArrowUp':
              event.preventDefault();
              moveFocus('up');
              break;
            case 'ArrowDown':
              event.preventDefault();
              moveFocus('down');
              break;
            case 'ArrowLeft':
              event.preventDefault();
              moveFocus('left');
              break;
            case 'ArrowRight':
              event.preventDefault();
              moveFocus('right');
              break;
            case 'Enter':
              event.preventDefault();
              openSelection();
              break;
            case 'a':
              if (event.ctrlKey) {
                event.preventDefault();
                setSelection(items.map((item) => item.id));
              }
              break;
            case 'Escape':
              setSelection([]);
              setFocusedId(null);
              break;
            default:
              break;
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          openMenu({ entries: desktopMenu(), x: event.clientX, y: event.clientY });
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes('Files') || !desktopFolderId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.files.length || !desktopFolderId) return;
          event.preventDefault();
          void vfs.importFiles(desktopFolderId, [...event.dataTransfer.files]);
        }}
      >
        {items.map((item) => {
          const slot = layout[item.id];
          if (!slot) return null;
          const pixels = slotToPixels(slot);
          const isSelected = selection.includes(item.id);
          const isDragging = dragging?.ids.includes(item.id) ?? false;
          const offsetX = isDragging ? dragging?.dx ?? 0 : 0;
          const offsetY = isDragging ? dragging?.dy ?? 0 : 0;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-icon-id={item.id}
              className="desktop-icon"
              data-selected={isSelected || undefined}
              data-dragging={isDragging || undefined}
              style={{
                left: pixels.x + offsetX,
                top: pixels.y + offsetY,
                zIndex: isDragging ? 10 : undefined,
              }}
              tabIndex={focusedId === item.id ? 0 : -1}
              onPointerDown={(event) => beginIconInteraction(event, item)}
              onDoubleClick={(event) => {
                event.stopPropagation();
                openItem(item);
              }}
              onClick={(event) => {
                if (event.detail === 1) setFocusedId(item.id);
              }}
              onFocus={() => setFocusedId(item.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!selection.includes(item.id)) {
                  setSelection([item.id]);
                  setFocusedId(item.id);
                }
                openMenu({ entries: item.menu(), x: event.clientX, y: event.clientY });
              }}
            >
              <Icon
                id={item.icon}
                size={32}
                className="desktop-icon-image"
                shortcut={Boolean(item.node?.shortcut)}
              />
              <span
                className={
                  preferences.highContrastLabels
                    ? 'desktop-icon-label desktop-icon-label--contrast'
                    : 'desktop-icon-label'
                }
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {marquee && (
          <div
            className="marquee"
            style={{
              left: marquee.x,
              top: marquee.y,
              width: marquee.width,
              height: marquee.height,
            }}
          />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files ? [...event.target.files] : [];
          if (files.length && desktopFolderId) void vfs.importFiles(desktopFolderId, files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
