import { SMALL_ICON_URLS } from '../assets/generated/icons';
import { useI18n } from '../core/i18n/I18nProvider';
import { useWindowManager } from '../core/window/WindowManagerProvider';
import { Icon } from '../ui/Icon';
import { useMenuLayer } from '../ui/menu/MenuLayer';
import { menuSeparator, type MenuEntry } from '../ui/menu/types';
import { Clock } from './Clock';
import { VolumePopup } from './VolumePopup';
import { useState } from 'react';
import { Tooltip } from '../ui/Tooltip';

export interface TaskbarProps {
  startOpen: boolean;
  onToggleStart: () => void;
}

/**
 * Taskbar: start button, one button per open window and the tray with the
 * volume control and the clock.
 */
export function Taskbar({ startOpen, onToggleStart }: TaskbarProps) {
  const { t } = useI18n();
  const wm = useWindowManager();
  const { open: openMenu } = useMenuLayer();
  const [volumeOpen, setVolumeOpen] = useState(false);

  const windows = [...wm.windows].sort((a, b) => a.createdAt - b.createdAt);

  const windowMenu = (id: string, minimized: boolean): MenuEntry[] => [
    {
      kind: 'item',
      id: 'restore',
      label: t('window.restore'),
      onSelect: () => wm.focus(id),
    },
    {
      kind: 'item',
      id: 'minimize',
      label: t('window.minimize'),
      disabled: minimized,
      onSelect: () => wm.minimize(id),
    },
    {
      kind: 'item',
      id: 'maximize',
      label: t('window.maximize'),
      onSelect: () => wm.maximize(id),
    },
    menuSeparator('sep'),
    { kind: 'item', id: 'close', label: t('window.close'), onSelect: () => wm.close(id) },
  ];

  return (
    <>
      <div className="taskbar" role="toolbar" aria-label={t('folder.desktop')}>
        <button
          type="button"
          className="start-button"
          aria-haspopup="menu"
          aria-expanded={startOpen}
          onClick={onToggleStart}
        >
          <img
            className="pixel"
            src={SMALL_ICON_URLS['start-mark']}
            width={16}
            height={16}
            alt=""
            aria-hidden="true"
          />
          {t('start.title')}
        </button>

        <span className="taskbar-divider" aria-hidden="true" />

        {/* Compact mode shows one full screen window at a time, so the way
            back to the desktop needs a button of its own. */}
        {wm.compact && (
          <button
            type="button"
            className="task-button task-button--desktop"
            aria-pressed={wm.activeId === null}
            title={t('window.minimizeAll')}
            onClick={() => wm.minimizeAll()}
          >
            <Icon id="computer" size={16} />
            <span className="task-button-label">{t('folder.desktop')}</span>
          </button>
        )}

        <div className="taskbar-buttons">
          {windows.map((window) => {
            const isActive = window.id === wm.activeId;
            return (
              <button
                key={window.id}
                type="button"
                className="task-button"
                aria-pressed={isActive}
                title={window.title}
                onClick={() => wm.taskbarClick(window.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  openMenu({
                    entries: windowMenu(window.id, window.state === 'minimized'),
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
              >
                <Icon id={window.icon} size={16} />
                <span className="task-button-label">{window.title}</span>
              </button>
            );
          })}
        </div>

        <div className="taskbar-tray">
          <Tooltip text={t('tray.volume')}>
            <button
              type="button"
              className="tray-button"
              aria-label={t('tray.volume')}
              aria-expanded={volumeOpen}
              onClick={() => setVolumeOpen((current) => !current)}
            >
              <img
                className="pixel"
                src={SMALL_ICON_URLS.speaker}
                width={16}
                height={16}
                alt=""
                aria-hidden="true"
              />
            </button>
          </Tooltip>
          <Clock />
        </div>
      </div>

      {volumeOpen && <VolumePopup onClose={() => setVolumeOpen(false)} />}
    </>
  );
}
