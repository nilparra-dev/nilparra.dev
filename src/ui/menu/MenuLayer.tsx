import { uiPixels, uiRect, uiViewport } from '../scale';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useT } from '../../core/i18n/I18nProvider';
import { CheckGlyph, BulletGlyph, SubmenuArrow } from '../glyphs';
import { Icon } from '../Icon';
import type { MenuEntry } from './types';

/**
 * Global menu layer.
 *
 * Popups live outside the windows so they are never clipped by a client area,
 * exactly like the original shell drew menus on top of everything.
 */
export interface MenuRequest {
  entries: MenuEntry[];
  /** Screen coordinates of the top-left corner of the first popup. */
  x: number;
  y: number;
  /** Called when the whole chain closes, to restore focus. */
  onClose?: () => void;
  /** Preferred side when the menu does not fit; the layer flips it anyway. */
  align?: 'left' | 'right';
}

interface MenuLayerValue {
  open: (request: MenuRequest) => void;
  close: () => void;
  isOpen: boolean;
}

const MenuLayerContext = createContext<MenuLayerValue | null>(null);

interface Level {
  id: number;
  entries: MenuEntry[];
  anchor: { x: number; y: number };
  parentLevelId: number | null;
  parentItemIndex: number;
}

const MENU_MIN_WIDTH = 120;

export function MenuLayerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<MenuRequest | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [highlight, setHighlight] = useState<Record<number, number>>({});
  const [positions, setPositions] = useState<Record<number, { left: number; top: number }>>({});
  const nextId = useRef(1);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const popupRefs = useRef(new Map<number, HTMLUListElement>());

  const close = useCallback(() => {
    setRequest((current) => {
      current?.onClose?.();
      return null;
    });
    setLevels([]);
    setHighlight({});
    setPositions({});
    itemRefs.current.clear();
    popupRefs.current.clear();
  }, []);

  const open = useCallback((next: MenuRequest) => {
    setRequest(next);
    const id = 0;
    setLevels([{ id, entries: next.entries, anchor: { x: uiPixels(next.x), y: uiPixels(next.y) }, parentLevelId: null, parentItemIndex: -1 }]);
    setHighlight({ 0: -1 });
    setPositions({});
    nextId.current = 1;
  }, []);

  /* Close on scroll/resize: a popup must not stay anchored to nothing. */
  useEffect(() => {
    if (!request) return;
    const onScrollOrResize = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('.menu-popup')) return;
      close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.menu-layer')) return;
      close();
    };
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [request, close]);

  const openSubmenu = useCallback(
    (levelId: number, index: number) => {
      const level = levels.find((candidate) => candidate.id === levelId);
      const entry = level?.entries.filter((entry) => entry.kind !== 'separator')[index];
      if (!level || !entry || entry.kind !== 'submenu' || !entry.items || entry.disabled) return;
      const element = itemRefs.current.get(`${levelId}:${index}`);
      const rect = element ? uiRect(element) : undefined;
      const anchor = rect ? { x: rect.right - 3, y: rect.top - 3 } : level.anchor;
      if (levels.some((candidate) => candidate.parentLevelId === levelId && candidate.parentItemIndex === index)) return;
      const id = nextId.current;
      nextId.current += 1;
      setLevels((current) => [
        ...current.filter((candidate) => candidate.id <= levelId),
        { id, entries: entry.items ?? [], anchor, parentLevelId: levelId, parentItemIndex: index },
      ]);
      setHighlight((current) => ({ ...current, [id]: -1 }));
    },
    [levels],
  );

  const closeFromLevel = useCallback(
    (levelId: number) => {
      if (levelId === 0) {
        close();
        return;
      }
      const parentId = levels.find((candidate) => candidate.id === levelId)?.parentLevelId;
      setLevels((current) => current.filter((candidate) => candidate.id < levelId));
      if (parentId !== null && parentId !== undefined) popupRefs.current.get(parentId)?.focus({ preventScroll: true });
    },
    [close, levels],
  );

  /* Measure each popup once rendered and flip it inside the viewport. */
  useLayoutEffect(() => {
    if (!levels.length) return;
    const { width: viewportWidth, height: viewportHeight } = uiViewport();
    setPositions((current) => {
      let changed = false;
      const next = { ...current };
      for (const level of levels) {
        const element = popupRefs.current.get(level.id);
        const rect = element ? uiRect(element) : undefined;
        const width = Math.max(rect?.width ?? MENU_MIN_WIDTH, MENU_MIN_WIDTH);
        const height = rect?.height ?? 0;
        let left = level.anchor.x;
        let top = level.anchor.y;
        if (left + width > viewportWidth - 2) {
          const parent = itemRefs.current.get(`${level.parentLevelId}:${level.parentItemIndex}`);
          const parentRect = parent ? uiRect(parent) : undefined;
          left = Math.max(2, (parentRect?.left ?? level.anchor.x) - width + 3);
        }
        if (top + height > viewportHeight - 2) top = Math.max(2, viewportHeight - height - 2);
        if (top < 2) top = 2;
        const previous = next[level.id];
        if (!previous || previous.left !== left || previous.top !== top) {
          next[level.id] = { left, top };
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [levels]);

  const handleItem = useCallback(
    (levelId: number, index: number, entry: MenuEntry) => {
      if (entry.disabled) return;
      if (entry.kind === 'submenu') {
        openSubmenu(levelId, index);
        return;
      }
      close();
      entry.onSelect?.();
    },
    [close, openSubmenu],
  );

  const onKeyDown = useCallback(
    (levelId: number, event: React.KeyboardEvent) => {
      const level = levels.find((candidate) => candidate.id === levelId);
      if (!level) return;
      const items = level.entries.filter((entry) => entry.kind !== 'separator');
      const currentHighlight = highlight[levelId] ?? -1;
      const currentEntry = currentHighlight >= 0 ? items[currentHighlight] : undefined;

      const move = (delta: number) => {
        if (!items.length) return;
        let next = currentHighlight;
        for (let step = 0; step < items.length; step += 1) {
          next = (next + delta + items.length) % items.length;
          if (!items[next]?.disabled) break;
        }
        setHighlight((current) => ({ ...current, [levelId]: next }));
      };

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          event.stopPropagation();
          move(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          event.stopPropagation();
          move(-1);
          break;
        case 'Home':
          event.preventDefault();
          setHighlight((current) => ({ ...current, [levelId]: 0 }));
          break;
        case 'End':
          event.preventDefault();
          setHighlight((current) => ({ ...current, [levelId]: items.length - 1 }));
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentEntry?.kind === 'submenu' && currentHighlight >= 0) {
            openSubmenu(levelId, currentHighlight);
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          closeFromLevel(levelId);
          break;
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          close();
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (currentEntry && currentHighlight >= 0) handleItem(levelId, currentHighlight, currentEntry);
          break;
        case 'Tab':
          event.preventDefault();
          close();
          break;
        default:
          break;
      }
    },
    [close, closeFromLevel, handleItem, highlight, levels, openSubmenu],
  );

  const value = useMemo<MenuLayerValue>(
    () => ({ open, close, isOpen: request !== null }),
    [open, close, request],
  );

  return (
    <MenuLayerContext.Provider value={value}>
      {children}
      {request && levels.length > 0 && (
        <div className="menu-layer">
          {levels.map((level) => {
            const position = positions[level.id];
            return (
              <MenuPopup
                key={level.id}
                level={level}
                position={position}
                highlighted={highlight[level.id] ?? -1}
                onHighlight={(index) => setHighlight((current) => ({ ...current, [level.id]: index }))}
                onHoverEntry={(index, entry) => {
                  setHighlight((current) => ({ ...current, [level.id]: index }));
                  if (entry.kind === 'submenu' && !entry.disabled) openSubmenu(level.id, index);
                  else setLevels((current) => current.filter((candidate) => candidate.id <= level.id));
                }}
                onActivate={(index, entry) => handleItem(level.id, index, entry)}
                onKeyDown={(event) => onKeyDown(level.id, event)}
                registerPopup={(element) => {
                  if (element) popupRefs.current.set(level.id, element);
                  else popupRefs.current.delete(level.id);
                }}
                registerItem={(index, element) => {
                  const key = `${level.id}:${index}`;
                  if (element) itemRefs.current.set(key, element);
                  else itemRefs.current.delete(key);
                }}
              />
            );
          })}
        </div>
      )}
    </MenuLayerContext.Provider>
  );
}

interface MenuPopupProps {
  level: Level;
  position?: { left: number; top: number };
  highlighted: number;
  onHighlight: (index: number) => void;
  onHoverEntry: (index: number, entry: MenuEntry) => void;
  onActivate: (index: number, entry: MenuEntry) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  registerPopup: (element: HTMLUListElement | null) => void;
  registerItem: (index: number, element: HTMLLIElement | null) => void;
}

function MenuPopup({
  level,
  position,
  highlighted,
  onHighlight,
  onHoverEntry,
  onActivate,
  onKeyDown,
  registerPopup,
  registerItem,
}: MenuPopupProps) {
  const t = useT();
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    if (document.activeElement !== element) element.focus({ preventScroll: true });
  }, []);

  let itemIndex = -1;

  return (
    <ul
      ref={(element) => {
        listRef.current = element;
        registerPopup(element);
      }}
      className="menu-popup"
      role="menu"
      aria-label={t('window.systemMenu')}
      tabIndex={-1}
      style={{
        left: position?.left ?? level.anchor.x,
        top: position?.top ?? level.anchor.y,
        visibility: position ? 'visible' : 'hidden',
      }}
      onKeyDown={onKeyDown}
      onMouseDown={(event) => event.preventDefault()}
    >
      {level.entries.map((entry, index) => {
        if (entry.kind === 'separator') {
          return <li key={`${entry.id}-${index}`} className="menu-sep" role="separator" />;
        }
        itemIndex += 1;
        const entryIndex = itemIndex;
        const isHighlighted = highlighted === entryIndex;
        return (
          <li
            key={`${entry.id}-${index}`}
            ref={(element) => registerItem(entryIndex, element)}
            className="menu-item"
            role="menuitem"
            aria-disabled={entry.disabled || undefined}
            aria-checked={entry.checked ?? undefined}
            aria-haspopup={entry.kind === 'submenu' ? 'menu' : undefined}
            data-highlighted={isHighlighted}
            data-disabled={entry.disabled || undefined}
            onMouseEnter={() => onHoverEntry(entryIndex, entry)}
            onClick={() => {
              onActivate(entryIndex, entry);
            }}
            onMouseDown={(event) => {
              if (entry.kind === 'submenu') {
                event.preventDefault();
                onHighlight(entryIndex);
              }
            }}
          >
            <span className="menu-item-mark">
              {entry.checked ? (
                entry.radio ? (
                  <BulletGlyph color={isHighlighted ? '#ffffff' : '#000000'} />
                ) : (
                  <CheckGlyph color={isHighlighted ? '#ffffff' : '#000000'} />
                )
              ) : entry.iconId ? (
                <Icon id={entry.iconId} size={16} />
              ) : null}
            </span>
            <span className="menu-item-label">{entry.label}</span>
            {entry.accelerator && <span className="menu-item-accel">{entry.accelerator}</span>}
            {entry.kind === 'submenu' && (
              <span className="menu-item-arrow">
                <SubmenuArrow color={isHighlighted ? '#ffffff' : '#000000'} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function useMenuLayer(): MenuLayerValue {
  const value = useContext(MenuLayerContext);
  if (!value) throw new Error('useMenuLayer must be used inside <MenuLayerProvider>');
  return value;
}

/**
 * Opens a context menu next to a mouse event or to the centre of an element.
 */
export function menuAnchorFromEvent(event: { clientX: number; clientY: number }): {
  x: number;
  y: number;
} {
  return { x: Math.round(event.clientX), y: Math.round(event.clientY) };
}

export function menuAnchorFromElement(element: HTMLElement | null, align: 'left' | 'right' = 'left') {
  if (!element) return { x: 0, y: 0 };
  const rect = element.getBoundingClientRect();
  return {
    x: align === 'left' ? Math.round(rect.left) : Math.round(rect.right),
    y: Math.round(rect.bottom),
  };
}
