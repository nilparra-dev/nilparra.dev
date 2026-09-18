import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useT } from '../i18n/I18nProvider';
import { uiPixels } from '../../ui/scale';
import { clampRect } from './layout';
import type { WindowInstance, WindowRect } from './types';
import { useWindowManager } from './WindowManagerProvider';
import { Icon } from '../../ui/Icon';
import { useMenuLayer } from '../../ui/menu/MenuLayer';
import { menuSeparator, type MenuEntry } from '../../ui/menu/types';
import { CloseGlyph, HelpGlyph, MaximizeGlyph, MinimizeGlyph, RestoreGlyph } from '../../ui/glyphs';

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

const RESIZE_DIRECTIONS: ResizeDirection[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];

export interface WindowFrameProps {
  instance: WindowInstance;
  active: boolean;
  children: ReactNode;
}

/**
 * A window of the shell: caption, caption buttons, client area, drag, resize,
 * system menu and keyboard move/size mode. The application renders its own
 * chrome (menu bar, client area, status bar) inside the body.
 */
export function WindowFrame({ instance, active, children }: WindowFrameProps) {
  const wm = useWindowManager();
  const t = useT();
  const { open: openMenu, close: closeMenu } = useMenuLayer();
  const [draft, setDraft] = useState<WindowRect | null>(null);
  const [interaction, setInteraction] = useState<'move' | 'size' | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const draftRef = useRef<WindowRect | null>(null);
  const keyboardOriginRef = useRef<WindowRect | null>(null);

  const compact = wm.compact;
  const maximized = instance.state === 'maximized' || compact;
  const rect: WindowRect = draft ?? (maximized
    ? { x: 0, y: 0, width: wm.viewport.width, height: wm.viewport.height }
    : instance.rect);

  const minimum = { width: instance.minWidth, height: instance.minHeight };

  useEffect(() => {
    if (interaction !== 'move' && interaction !== 'size') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 1 : 8;
      const current = instance.rect;
      let next: WindowRect | null = null;
      switch (event.key) {
        case 'ArrowLeft':
          next = interaction === 'move'
            ? { ...current, x: current.x - step }
            : { ...current, width: current.width - step };
          break;
        case 'ArrowRight':
          next = interaction === 'move'
            ? { ...current, x: current.x + step }
            : { ...current, width: current.width + step };
          break;
        case 'ArrowUp':
          next = interaction === 'move'
            ? { ...current, y: current.y - step }
            : { ...current, height: current.height - step };
          break;
        case 'ArrowDown':
          next = interaction === 'move'
            ? { ...current, y: current.y + step }
            : { ...current, height: current.height + step };
          break;
        case 'Enter':
          keyboardOriginRef.current = null;
          setInteraction(null);
          return;
        case 'Escape':
          if (keyboardOriginRef.current) {
            if (interaction === 'move') wm.move(instance.id, keyboardOriginRef.current);
            else wm.resize(instance.id, keyboardOriginRef.current);
          }
          keyboardOriginRef.current = null;
          setInteraction(null);
          return;
        default:
          return;
      }
      event.preventDefault();
      const clamped = clampRect(next, wm.viewport, minimum);
      if (interaction === 'move') {
        wm.move(instance.id, clamped);
      } else {
        wm.resize(instance.id, clamped);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [interaction, instance.id, instance.rect, instance.state, minimum.height, minimum.width, wm]);

  useEffect(() => {
    if (interaction) wm.announce(interaction === 'move' ? t('window.move') : t('window.size'));
  }, [interaction, t, wm]);

  const startPointerInteraction = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      kind: 'move' | ResizeDirection,
      target: HTMLElement,
    ) => {
      if (event.button !== 0) return;
      wm.focus(instance.id);
      const startRect = instance.rect;
      const origin = { x: event.clientX, y: event.clientY };
      target.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        const dx = uiPixels(moveEvent.clientX - origin.x);
        const dy = uiPixels(moveEvent.clientY - origin.y);
        let next: WindowRect = { ...startRect };
        if (kind === 'move') {
          next = { ...startRect, x: startRect.x + dx, y: startRect.y + dy };
        } else {
          if (kind.includes('e')) next.width = startRect.width + dx;
          if (kind.includes('s')) next.height = startRect.height + dy;
          if (kind.includes('w')) next.width = startRect.width - dx;
          if (kind.includes('n')) next.height = startRect.height - dy;
          next.width = Math.max(minimum.width, next.width);
          next.height = Math.max(minimum.height, next.height);
          next.x = kind.includes('w') ? startRect.x + (startRect.width - next.width) : startRect.x;
          next.y = kind.includes('n') ? startRect.y + (startRect.height - next.height) : startRect.y;
        }
        const clamped = clampRect(next, wm.viewport, minimum);
        draftRef.current = clamped;
        setDraft(clamped);
      };

      const finish = () => {
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', finish);
        target.removeEventListener('pointercancel', finish);
        const finalRect = draftRef.current;
        draftRef.current = null;
        setDraft(null);
        if (finalRect) {
          if (kind === 'move') wm.move(instance.id, finalRect);
          else wm.resize(instance.id, finalRect);
        }
      };

      target.addEventListener('pointermove', onMove);
      target.addEventListener('pointerup', finish);
      target.addEventListener('pointercancel', finish);
    },
    [instance.id, instance.rect, minimum, wm],
  );

  const systemMenuEntries = useCallback((): MenuEntry[] => {
    const canRestore = instance.state !== 'normal';
    return [
      {
        kind: 'item',
        id: 'restore',
        label: t('window.restore'),
        disabled: !canRestore,
        onSelect: () => wm.restore(instance.id),
      },
      {
        kind: 'item',
        id: 'move',
        label: t('window.move'),
        disabled: instance.state !== 'normal',
        onSelect: () => {
          keyboardOriginRef.current = instance.rect;
          setInteraction('move');
        },
      },
      {
        kind: 'item',
        id: 'size',
        label: t('window.size'),
        disabled: instance.state !== 'normal' || !instance.resizable,
        onSelect: () => {
          keyboardOriginRef.current = instance.rect;
          setInteraction('size');
        },
      },
      {
        kind: 'item',
        id: 'minimize',
        label: t('window.minimize'),
        disabled: !instance.minimizable,
        onSelect: () => wm.minimize(instance.id),
      },
      {
        kind: 'item',
        id: 'maximize',
        label: instance.state === 'maximized' ? t('window.restore') : t('window.maximize'),
        disabled: !instance.maximizable,
        onSelect: () => wm.toggleMaximize(instance.id),
      },
      menuSeparator('sep-1'),
      {
        kind: 'item',
        id: 'close',
        label: t('window.close'),
        onSelect: () => wm.close(instance.id),
      },
    ];
  }, [instance, t, wm]);

  const openSystemMenuAt = useCallback(
    (x: number, y: number) => {
      wm.focus(instance.id);
      openMenu({ entries: systemMenuEntries(), x, y });
    },
    [instance.id, openMenu, systemMenuEntries, wm],
  );

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' && event.altKey) {
        event.preventDefault();
        const rect = element.getBoundingClientRect();
        openSystemMenuAt(Math.round(rect.left + 2), Math.round(rect.top + 20));
      }
    };
    element.addEventListener('keydown', onKeyDown);
    return () => element.removeEventListener('keydown', onKeyDown);
  }, [openSystemMenuAt]);

  const className = [
    'window',
    active ? null : 'window--inactive',
    maximized ? 'window--maximized' : null,
    interaction ? 'window--interactive' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      ref={(element) => {
        rootRef.current = element;
      }}
      id={`window-${instance.id}`}
      className={className}
      role="dialog"
      aria-modal={false}
      aria-labelledby={`window-title-${instance.id}`}
      tabIndex={-1}
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: instance.z }}
      onPointerDownCapture={() => {
        if (!active) {
          wm.focus(instance.id);
          if (!rootRef.current?.contains(document.activeElement)) {
            rootRef.current?.focus({ preventScroll: true });
          }
        }
      }}
    >
      <header
        className="title-bar"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest('.caption-btn')) return;
          if (maximized) {
            wm.focus(instance.id);
            return;
          }
          startPointerInteraction(event, 'move', event.currentTarget);
        }}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest('.caption-btn')) return;
          wm.toggleMaximize(instance.id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          openSystemMenuAt(event.clientX, event.clientY);
        }}
      >
        <button
          type="button"
          className="caption-btn caption-btn--system"
          style={{ width: 18, height: 18 }}
          aria-label={t('window.systemMenu')}
          aria-haspopup="menu"
          onClick={(event) => {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            openSystemMenuAt(Math.round(rect.left), Math.round(rect.bottom));
          }}
        >
          <Icon id={instance.icon} size={16} />
        </button>
        <h2 className="title-bar-text" id={`window-title-${instance.id}`}>
          {instance.title}
        </h2>
        <div className="title-bar-buttons">
          {instance.minimizable && (
            <button
              type="button"
              className="caption-btn"
              aria-label={t('window.minimize')}
              onClick={() => {
                closeMenu();
                wm.minimize(instance.id);
              }}
            >
              <MinimizeGlyph size={8} />
            </button>
          )}
          {instance.maximizable && instance.resizable && (
            <button
              type="button"
              className="caption-btn"
              aria-label={instance.state === 'maximized' ? t('window.restore') : t('window.maximize')}
              onClick={() => {
                closeMenu();
                wm.toggleMaximize(instance.id);
              }}
            >
              {instance.state === 'maximized' ? <RestoreGlyph /> : <MaximizeGlyph />}
            </button>
          )}
          {instance.helpTopicId && (
            <button
              type="button"
              className="caption-btn"
              aria-label={t('start.help')}
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('w95:open-help', { detail: instance.helpTopicId }),
                );
              }}
            >
              <HelpGlyph size={9} />
            </button>
          )}
          <button
            type="button"
            className="caption-btn"
            aria-label={t('window.close')}
            onClick={() => {
              closeMenu();
              wm.close(instance.id);
            }}
          >
            <CloseGlyph />
          </button>
        </div>
      </header>

      <div className="window-body">{children}</div>

      {instance.resizable && !maximized && (
        <>
          {RESIZE_DIRECTIONS.map((direction) => (
            <div
              key={direction}
              className="resize-handle"
              data-dir={direction}
              onPointerDown={(event) => startPointerInteraction(event, direction, event.currentTarget)}
            />
          ))}
        </>
      )}
    </section>
  );
}
