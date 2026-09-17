import { useCallback, useEffect, useRef, useState } from 'react';
import { menuAnchorFromElement, useMenuLayer } from './MenuLayer';
import type { MenuEntry } from './types';

export interface MenuBarMenu {
  id: string;
  label: string;
  /** Letter highlighted with an underline and usable as Alt+letter. */
  accessKey?: string;
  entries: MenuEntry[];
  /** Items built at open time (recent files, window list…). */
  buildEntries?: () => MenuEntry[];
}

export interface MenuBarProps {
  menus: MenuBarMenu[];
  ariaLabel: string;
}

/**
 * Application menu bar. Clicking switches menus without losing the open one,
 * hovering a sibling moves the selection, and Alt+letter opens a menu when the
 * bar belongs to the active window.
 */
export function MenuBar({ menus, ariaLabel }: MenuBarProps) {
  const { open, close, isOpen } = useMenuLayer();
  const [openId, setOpenId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

  const openMenu = useCallback(
    (menu: MenuBarMenu) => {
      const trigger = buttonRefs.current.get(menu.id) ?? null;
      const anchor = menuAnchorFromElement(trigger);
      setOpenId(menu.id);
      open({
        entries: menu.buildEntries ? menu.buildEntries() : menu.entries,
        x: anchor.x,
        y: anchor.y + 1,
        onClose: () => {
          setOpenId(null);
          trigger?.focus({ preventScroll: true });
        },
      });
    },
    [open],
  );

  useEffect(() => {
    if (!isOpen && openId) setOpenId(null);
  }, [isOpen, openId]);

  /* Alt+letter shortcuts, only for the window that owns the focus. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const menu = menus.find(
        (candidate) => candidate.accessKey?.toLowerCase() === event.key.toLowerCase(),
      );
      if (!menu) return;
      const bar = barRef.current;
      if (!bar) return;
      const windowElement = bar.closest('.window');
      if (windowElement?.classList.contains('window--inactive')) return;
      event.preventDefault();
      openMenu(menu);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menus, openMenu]);

  const moveFocus = (currentId: string, delta: number) => {
    const index = menus.findIndex((menu) => menu.id === currentId);
    const next = menus[(index + delta + menus.length) % menus.length];
    buttonRefs.current.get(next.id)?.focus({ preventScroll: true });
    if (openId) openMenu(next);
  };

  return (
    <div className="menu-bar" role="menubar" aria-label={ariaLabel} ref={barRef}>
      {menus.map((menu) => {
        const label = menu.accessKey
          ? splitAccessKey(menu.label, menu.accessKey)
          : { before: menu.label, key: null, after: '' };
        return (
          <button
            key={menu.id}
            ref={(element) => {
              if (element) buttonRefs.current.set(menu.id, element);
              else buttonRefs.current.delete(menu.id);
            }}
            type="button"
            className="menu-bar-item"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openId === menu.id}
            data-open={openId === menu.id || undefined}
            onClick={() => {
              if (openId === menu.id) {
                close();
                setOpenId(null);
                return;
              }
              openMenu(menu);
            }}
            onMouseEnter={() => {
              if (openId && openId !== menu.id) openMenu(menu);
            }}
            onKeyDown={(event) => {
              switch (event.key) {
                case 'ArrowRight':
                  event.preventDefault();
                  moveFocus(menu.id, 1);
                  break;
                case 'ArrowLeft':
                  event.preventDefault();
                  moveFocus(menu.id, -1);
                  break;
                case 'ArrowDown':
                case 'Enter':
                case ' ':
                  event.preventDefault();
                  openMenu(menu);
                  break;
                case 'Escape':
                  close();
                  break;
                default:
                  break;
              }
            }}
          >
            {label.before}
            {label.key && <span className="menu-access-key">{label.key}</span>}
            {label.after}
          </button>
        );
      })}
    </div>
  );
}

function splitAccessKey(label: string, accessKey: string) {
  const index = label.toLowerCase().indexOf(accessKey.toLowerCase());
  if (index < 0) return { before: label, key: null, after: '' };
  return {
    before: label.slice(0, index),
    key: label[index],
    after: label.slice(index + 1),
  };
}
