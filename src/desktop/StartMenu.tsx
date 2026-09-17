import { useEffect, useMemo, useRef, useState } from 'react';
import { ICON_URLS, type IconId } from '../assets/generated/icons';
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

export interface StartMenuProps {
  onClose: () => void;
  onSuspend: () => void;
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
}

/**
 * Start menu: vertical brand strip, program groups built from the application
 * catalogue (only the apps that really exist appear) and the classic power
 * entries.
 */
export function StartMenu({ onClose, onSuspend, onShutdown }: StartMenuProps) {
  const { t } = useI18n();
  const launch = useAppLauncher();
  const vfs = useVfs();
  const openNode = useFileOpener();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [highlighted, setHighlighted] = useState(0);

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
    const programs: StartEntry[] = [
      ...group('programs'),
      {
        id: 'accessories',
        label: t('start.accessories'),
        items: group('accessories'),
      },
      { id: 'games', label: t('start.games'), items: group('games') },
      { id: 'internet-group', label: t('start.internet'), items: group('internet') },
    ].filter((entry) => entry.items === undefined || entry.items.length > 0);

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
      ...group('main'),
      {
        id: 'programs',
        label: t('start.programs'),
        items: programs,
      },
      {
        id: 'documents',
        label: t('start.documents'),
        items:
          recent.length > 0
            ? recent
            : [{ id: 'no-recent', label: t('start.emptyDocuments'), onSelect: () => undefined }],
      },
      { id: 'settings', label: t('start.settings'), items: group('settings') },
      {
        id: 'find',
        label: t('start.find'),
        items: group('find-group').length
          ? group('find-group')
          : [{ id: 'find-apps', label: t('app.find'), icon: 'find', onSelect: () => launch({ appId: 'find' }) }],
      },
      {
        id: 'help',
        label: t('start.help'),
        icon: 'help',
        onSelect: () => launch({ appId: 'help', params: { topicId: 'intro' } }),
      },
      {
        id: 'run',
        label: t('start.run'),
        icon: 'run',
        onSelect: () => launch({ appId: 'run' }),
      },
      { id: 'sep-power', label: '', heading: false },
      { id: 'suspend', label: t('start.suspend'), icon: 'suspend', onSelect: onSuspend },
      { id: 'shutdown', label: t('start.shutdown'), icon: 'shutdown', onSelect: onShutdown },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch, t, vfs, openNode, onSuspend, onShutdown]);

  const flat = useMemo(() => entries.filter((entry) => entry.id !== 'sep-power'), [entries]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (rootRef.current?.contains(target)) return;
      if (target.closest?.('.start-button')) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [onClose]);

  const activate = (entry: StartEntry) => {
    if (entry.items) return;
    onClose();
    entry.onSelect?.();
  };

  return (
    <div
      className="start-menu"
      ref={rootRef}
      role="menu"
      aria-label={t('start.title')}
      onKeyDown={(event) => {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            setHighlighted((current) => (current + 1) % flat.length);
            break;
          case 'ArrowUp':
            event.preventDefault();
            setHighlighted((current) => (current - 1 + flat.length) % flat.length);
            break;
          case 'Home':
            event.preventDefault();
            setHighlighted(0);
            break;
          case 'End':
            event.preventDefault();
            setHighlighted(flat.length - 1);
            break;
          case 'Enter':
          case ' ': {
            const entry = flat[highlighted];
            if (!entry) break;
            event.preventDefault();
            if (entry.items?.length) {
              const first = entry.items.find((item) => !item.heading && !item.items);
              if (first) activate(first);
            } else {
              activate(entry);
            }
            break;
          }
          case 'Escape':
          case 'Tab':
            event.preventDefault();
            onClose();
            document.querySelector<HTMLElement>('.start-button')?.focus({ preventScroll: true });
            break;
          default:
            break;
        }
      }}
    >
      <div className="start-menu-strip" aria-hidden="true">
        <span className="start-menu-strip-text">
          {DESKTOP_BRAND.name} <span className="start-menu-strip-brand">{DESKTOP_BRAND.version}</span>
        </span>
      </div>
      <ul className="start-menu-items" role="list">
        {entries.map((entry) => {
          if (entry.id === 'sep-power') {
            return <li key={entry.id} className="start-menu-sep" role="separator" />;
          }
          const index = flat.indexOf(entry);
          return (
            <StartMenuRow
              key={entry.id}
              entry={entry}
              highlighted={index === highlighted}
              onHighlight={() => setHighlighted(index)}
              onActivate={activate}
            />
          );
        })}
      </ul>
    </div>
  );
}

function StartMenuRow({
  entry,
  highlighted,
  onHighlight,
  onActivate,
}: {
  entry: StartEntry;
  highlighted: boolean;
  onHighlight: () => void;
  onActivate: (entry: StartEntry) => void;
}) {
  const [openSubmenu, setOpenSubmenu] = useState(false);
  const hasSubmenu = !!entry.items?.length;

  return (
    <li className="start-menu-row" onMouseLeave={() => setOpenSubmenu(false)}>
      <button
        type="button"
        role="menuitem"
        className="start-menu-item"
        data-highlighted={highlighted || openSubmenu}
        aria-haspopup={hasSubmenu || undefined}
        aria-expanded={hasSubmenu ? openSubmenu : undefined}
        tabIndex={highlighted ? 0 : -1}
        onMouseEnter={() => {
          onHighlight();
          if (hasSubmenu) setOpenSubmenu(true);
        }}
        onClick={() => (hasSubmenu ? setOpenSubmenu((current) => !current) : onActivate(entry))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' && hasSubmenu) {
            event.preventDefault();
            setOpenSubmenu(true);
          }
        }}
      >
        <span className="start-menu-item-icon">
          {entry.icon && (
            <img
              className="pixel"
              src={ICON_URLS[entry.icon]}
              width={24}
              height={24}
              alt=""
              aria-hidden="true"
            />
          )}
        </span>
        <span className="start-menu-item-label">{entry.label}</span>
        {hasSubmenu && (
          <span className="start-menu-item-arrow">
            <SubmenuArrow color={highlighted || openSubmenu ? '#ffffff' : '#000000'} />
          </span>
        )}
      </button>

      {hasSubmenu && openSubmenu && (
        <ul className="menu-popup start-submenu" role="menu" aria-label={entry.label}>
          {entry.items?.map((child) =>
            child.heading ? (
              <li key={child.id} className="menu-sep" role="separator" />
            ) : (
              <li key={child.id}>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item start-submenu-item"
                  style={{ width: '100%', background: 'transparent', border: 0, textAlign: 'left' }}
                  onClick={() => onActivate(child)}
                >
                  {child.icon && (
                    <span className="menu-item-mark">
                      <img className="pixel" src={ICON_URLS[child.icon]} width={16} height={16} alt="" />
                    </span>
                  )}
                  <span className="menu-item-label">{child.label}</span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </li>
  );
}

export { menuSeparator };
export type { TranslationKey };
