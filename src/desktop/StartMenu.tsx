import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { IconId } from '../assets/generated/icons';
import { uiRect, uiViewport } from '../ui/scale';
import { APP_CATALOG, APP_IDS } from '../core/apps/catalog';
import { APP_COMPONENTS } from '../core/apps/components';
import { useAppLauncher } from '../core/apps/launcher';
import { DESKTOP_BRAND } from '../core/content/branding';
import { iconForNode } from '../core/fs/display';
import { useVfs } from '../core/fs/VfsProvider';
import { useFileOpener } from '../core/fs/useFileOpener';
import { useI18n } from '../core/i18n/I18nProvider';
import type { TranslationKey } from '../core/i18n/es';
import { SubmenuArrow } from '../ui/glyphs';
import { menuSeparator } from '../ui/menu/types';
import { Icon } from '../ui/Icon';

export interface StartMenuProps {
  onClose: () => void;
  onShutdown: () => void;
}

interface StartEntry {
  id: string;
  label: string;
  icon?: IconId;
  items?: StartEntry[];
  onSelect?: () => void;
  /** Submenu title shown when the entry has no label of its own. */
  heading?: boolean;
  disabled?: boolean;
}

/**
 * Start menu: vertical brand strip, program groups built from the application
 * catalogue (only the apps that really exist appear) and the classic power
 * entries.
 */
export function StartMenu({ onClose, onShutdown }: StartMenuProps) {
  const { t } = useI18n();
  const launch = useAppLauncher();
  const vfs = useVfs();
  const openNode = useFileOpener();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const appEntry = (appId: string): StartEntry | null => {
    const app = APP_CATALOG[appId];
    if (!app || !APP_COMPONENTS[appId]) return null;
    return {
      id: appId,
      label: t(app.nameKey),
      icon: app.icon,
      onSelect: () =>
        launch({
          appId,
          params: appId === 'explorer' ? { folderId: vfs.folders.desktop } : undefined,
        }),
    };
  };

  const group = (startMenu: string): StartEntry[] =>
    APP_IDS.map((appId) =>
      APP_CATALOG[appId].startMenu === startMenu ? appEntry(appId) : null,
    ).filter((entry): entry is StartEntry => entry !== null);

  const entries = useMemo<StartEntry[]>(() => {
    const portfolio = group('main').filter((entry) => entry.id !== 'help' && entry.id !== 'run');
    const programs: StartEntry[] = ([
      {
        id: 'accessories',
        label: t('start.accessories'),
        icon: 'folder',
        items: group('accessories'),
      },
      { id: 'games', label: t('start.games'), icon: 'folder', items: group('games') },
      { id: 'internet-group', label: t('start.internet'), icon: 'folder', items: group('internet') },
      { id: 'portfolio-group', label: t('folder.portfolio'), icon: 'folder', items: portfolio },
      ...group('programs'),
    ] satisfies StartEntry[]).filter((entry) => entry.items === undefined || entry.items.length > 0);

    const recent = [...vfs.nodes.values()]
      .filter((node) => node.kind === 'file' && node.deletedAt === null && !node.shortcut)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8)
      .map<StartEntry>((node) => ({
        id: `recent:${node.id}`,
        label: node.name,
        icon: iconForNode(node),
        onSelect: () => void openNode(node),
      }));

    return [
      {
        id: 'programs',
        label: t('start.programs'),
        icon: 'folder',
        items: programs,
      },
      {
        id: 'documents',
        label: t('start.documents'),
        icon: 'folder-docs',
        items:
          recent.length > 0
            ? recent
            : [{ id: 'no-recent', label: t('start.emptyDocuments'), disabled: true }],
      },
      { id: 'settings', label: t('start.settings'), icon: 'control-panel', items: group('settings') },
      {
        id: 'find',
        label: t('start.find'),
        icon: 'find',
        items: group('find-group').length
          ? group('find-group')
          : [{ id: 'find-apps', label: t('app.find'), icon: 'find', onSelect: () => launch({ appId: 'find' }) }],
      },
      { id: 'help', label: t('start.help'), icon: 'help', onSelect: () => launch({ appId: 'help', params: { topicId: 'welcome' } }) },
      { id: 'run', label: t('start.run'), icon: 'run', onSelect: () => launch({ appId: 'run' }) },
      { id: 'sep-power', label: '', heading: true },
      { id: 'shutdown', label: t('start.shutdown'), icon: 'shutdown', onSelect: onShutdown },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch, t, vfs, openNode, onShutdown]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (rootRef.current?.contains(target)) return;
      if (target.closest?.('.start-button')) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const activate = (entry: StartEntry) => {
    if (entry.items || entry.disabled) return;
    onClose();
    entry.onSelect?.();
  };

  return (
    <div
      className="start-menu"
      ref={rootRef}
      role="menu"
      aria-label={t('start.title')}
    >
      <div className="start-menu-strip" aria-hidden="true">
        <span className="start-menu-strip-text">
          <span className="start-menu-strip-brand">{DESKTOP_BRAND.name}</span>{DESKTOP_BRAND.version}
        </span>
      </div>
      <StartMenuList entries={entries} onActivate={activate} onDismiss={() => {
        onClose();
        document.querySelector<HTMLElement>('.start-button')?.focus({ preventScroll: true });
      }} />
    </div>
  );
}

/** Each level owns its selection and renders the same menu for child groups. */
function StartMenuList({
  entries,
  onActivate,
  onDismiss,
  onCloseAll = onDismiss,
  anchor,
  label,
  focusOnOpen = true,
}: {
  entries: StartEntry[];
  onActivate: (entry: StartEntry) => void;
  onDismiss: () => void;
  onCloseAll?: () => void;
  anchor?: HTMLButtonElement;
  label?: string;
  focusOnOpen?: boolean;
}) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [open, setOpen] = useState<{ id: string; keyboard: boolean } | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const enabled = entries.filter((entry) => !entry.heading && !entry.disabled);

  useLayoutEffect(() => {
    if (!anchor || !listRef.current) return;
    const parent = uiRect(anchor);
    const popup = uiRect(listRef.current);
    const viewport = uiViewport();
    const left = parent.right + popup.width <= viewport.width - 2
      ? parent.right - 2
      : Math.max(2, parent.left - popup.width + 2);
    setPosition({ left, top: Math.max(2, Math.min(parent.top - 3, viewport.height - popup.height - 2)) });
  }, [anchor]);

  useEffect(() => {
    if (!focusOnOpen) return;
    const first = entries.find((entry) => !entry.heading && !entry.disabled);
    if (first) {
      setHighlighted(first.id);
      buttons.current.get(first.id)?.focus({ preventScroll: true });
    }
  }, [focusOnOpen]);

  const focusEntry = (entry: StartEntry | undefined) => {
    if (!entry) return;
    setHighlighted(entry.id);
    setOpen(null);
    buttons.current.get(entry.id)?.focus({ preventScroll: true });
    buttons.current.get(entry.id)?.scrollIntoView?.({ block: 'nearest' });
  };

  const dismiss = () => {
    onDismiss();
    anchor?.focus({ preventScroll: true });
  };

  return (
    <ul
      ref={listRef}
      className={anchor ? 'menu-popup start-submenu' : 'start-menu-items'}
      role={anchor ? 'menu' : 'presentation'}
      aria-label={label}
      style={anchor ? { left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? 'visible' : 'hidden' } : undefined}
      onScroll={(event) => { if (event.target === event.currentTarget) setOpen(null); }}
      onKeyDown={(event) => {
        const index = enabled.findIndex((entry) => entry.id === highlighted);
        const entry = enabled[index];
        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowUp': {
            const delta = event.key === 'ArrowDown' ? 1 : -1;
            focusEntry(enabled[(index + delta + enabled.length) % enabled.length]);
            break;
          }
          case 'Home': focusEntry(enabled[0]); break;
          case 'End': focusEntry(enabled.at(-1)); break;
          case 'ArrowRight':
          case 'Enter':
          case ' ':
            if (entry?.items?.length) setOpen({ id: entry.id, keyboard: true });
            else if (entry && event.key !== 'ArrowRight') onActivate(entry);
            break;
          case 'ArrowLeft': if (anchor) dismiss(); break;
          case 'Escape': dismiss(); break;
          case 'Tab':
            onCloseAll();
            break;
          default: return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {entries.map((entry) => {
        if (entry.heading) return <li key={entry.id} className="start-menu-sep" role="separator" />;
        const hasSubmenu = !!entry.items?.length;
        const expanded = open?.id === entry.id;
        const button = buttons.current.get(entry.id);
        return (
          <li key={entry.id} className="start-menu-row" role="none">
            <button
              ref={(element) => { if (element) buttons.current.set(entry.id, element); else buttons.current.delete(entry.id); }}
              type="button"
              role="menuitem"
              className={anchor ? 'start-menu-item start-submenu-item' : 'start-menu-item'}
              data-highlighted={highlighted === entry.id || expanded}
              aria-haspopup={hasSubmenu ? 'menu' : undefined}
              aria-expanded={hasSubmenu ? expanded : undefined}
              disabled={entry.disabled}
              tabIndex={highlighted === entry.id ? 0 : -1}
              onFocus={() => setHighlighted(entry.id)}
              onMouseEnter={(event) => {
                if (entry.disabled) return;
                event.currentTarget.focus({ preventScroll: true });
                setHighlighted(entry.id);
                setOpen(hasSubmenu ? { id: entry.id, keyboard: false } : null);
              }}
              onClick={() => {
                setHighlighted(entry.id);
                if (hasSubmenu) setOpen({ id: entry.id, keyboard: false });
                else onActivate(entry);
              }}
            >
              <span className="start-menu-item-icon">
                {entry.icon && <Icon id={entry.icon} size={anchor ? 16 : 24} />}
              </span>
              <span className="start-menu-item-label">{entry.label}</span>
              {hasSubmenu && <span className="start-menu-item-arrow"><SubmenuArrow /></span>}
            </button>
            {expanded && entry.items && button && (
              <StartMenuList
                entries={entry.items}
                anchor={button}
                label={entry.label}
                focusOnOpen={open.keyboard}
                onActivate={onActivate}
                onCloseAll={onCloseAll}
                onDismiss={() => setOpen(null)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export { menuSeparator };
export type { TranslationKey };
