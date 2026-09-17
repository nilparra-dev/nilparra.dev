import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppLauncher } from '../core/apps/launcher';
import { DESKTOP_PRODUCT_NAME } from '../core/content/branding';
import { useDialogs } from '../core/dialogs/DialogProvider';
import { useVfs } from '../core/fs/VfsProvider';
import { useI18n } from '../core/i18n/I18nProvider';
import { usePreferences } from '../core/prefs/PreferencesProvider';
import { WindowsLayer } from '../core/window/WindowsLayer';
import { useWindowManager } from '../core/window/WindowManagerProvider';
import { Desktop } from '../desktop/Desktop';
import { StartMenu } from '../desktop/StartMenu';
import { Taskbar } from '../desktop/Taskbar';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';

type PowerState = 'running' | 'restarting' | 'shutdown' | 'suspended';

/**
 * The desktop session: background, icons, windows, taskbar, start menu and the
 * power states (restart, shut down and suspend). None of them touch the real
 * machine: restarting rebuilds the session keeping the virtual disk, shutting
 * down only shows the classic goodbye screen.
 */
export function Shell() {
  const wm = useWindowManager();
  const launch = useAppLauncher();
  const { preferences } = usePreferences();
  const { t } = useI18n();
  const vfs = useVfs();
  const dialogs = useDialogs();

  const [startOpen, setStartOpen] = useState(false);
  const [power, setPower] = useState<PowerState>('running');
  const [shutdownDialog, setShutdownDialog] = useState(false);
  const [shutdownChoice, setShutdownChoice] = useState<'shutdown' | 'restart' | 'suspend'>('shutdown');
  const bootstrapped = useRef(false);

  /* First visit (or after a restart) opens the Welcome window. */
  useEffect(() => {
    if (power !== 'running' || !wm.booted) return;
    if (bootstrapped.current) return;
    if (wm.windows.length > 0) return;
    if (!preferences.openWelcomeOnStart) {
      bootstrapped.current = true;
      return;
    }
    bootstrapped.current = true;
    launch({ appId: 'welcome' });
  }, [launch, power, preferences.openWelcomeOnStart, wm.booted, wm.windows.length]);

  /* Ctrl+Esc and the Windows key open the Start menu, as in the original. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isStartShortcut = (event.ctrlKey && event.key === 'Escape') || event.key === 'Meta';
      if (!isStartShortcut) return;
      event.preventDefault();
      setStartOpen((current) => !current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* The "?" caption button of any window, and the Help menu, land here. */
  useEffect(() => {
    const onHelp = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      launch({ appId: 'help', params: { topicId: typeof detail === 'string' ? detail : 'intro' } });
    };
    window.addEventListener('w95:open-help', onHelp);
    return () => window.removeEventListener('w95:open-help', onHelp);
  }, [launch]);

  const restartDesktop = useCallback(() => {
    setStartOpen(false);
    setShutdownDialog(false);
    setPower('restarting');
    window.setTimeout(() => {
      wm.closeAll();
      bootstrapped.current = false;
      setPower('running');
    }, 1400);
  }, [wm]);

  const shutDown = useCallback(() => {
    setStartOpen(false);
    setShutdownDialog(false);
    setPower('shutdown');
  }, []);

  const resumeSession = useCallback(() => {
    wm.closeAll();
    bootstrapped.current = false;
    setPower('running');
  }, [wm]);

  const suspendSession = useCallback(() => {
    setStartOpen(false);
    setShutdownDialog(false);
    setPower('suspended');
  }, []);

  if (!vfs.ready) {
    return (
      <div className="boot-screen" role="status">
        <div className="boot-logo">
          {DESKTOP_PRODUCT_NAME.split(' ').slice(0, -1).join(' ')}{' '}
          <span>{DESKTOP_PRODUCT_NAME.split(' ').slice(-1)}</span>
        </div>
        <p>{t('boot.starting')}</p>
        <p className="u-muted">{t('boot.loadingFiles')}</p>
      </div>
    );
  }

  if (power === 'restarting') {
    return (
      <div className="boot-screen" role="status">
        <div className="boot-logo">
          {DESKTOP_PRODUCT_NAME.split(' ').slice(0, -1).join(' ')}{' '}
          <span>{DESKTOP_PRODUCT_NAME.split(' ').slice(-1)}</span>
        </div>
        <p>{t('boot.restarting')}</p>
      </div>
    );
  }

  if (power === 'shutdown') {
    return (
      <div className="shutdown-screen" role="status">
        <p className="shutdown-title">{t('shutdown.safeTitle')}</p>
        <p className="shutdown-note">{t('shutdown.safeNote')}</p>
        <Button primary onClick={resumeSession}>
          {t('shutdown.restartNow')}
        </Button>
      </div>
    );
  }

  if (power === 'suspended') {
    return (
      <div
        className="shutdown-screen"
        role="status"
        onClick={() => setPower('running')}
        onKeyDown={() => setPower('running')}
        tabIndex={0}
      >
        <p className="shutdown-title">{t('start.suspended')}</p>
        <p className="shutdown-note">{t('start.suspendedHint')}</p>
      </div>
    );
  }

  const busy = vfs.busy || dialogs.open;
  return (
    <div
      className={[
        'w95',
        preferences.reduceMotion ? 'w95--reduce-motion' : null,
        busy ? 'w95--busy' : null,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Desktop />
      <WindowsLayer />
      <Taskbar startOpen={startOpen} onToggleStart={() => setStartOpen((current) => !current)} />
      {startOpen && (
        <StartMenu
          onClose={() => setStartOpen(false)}
          onSuspend={suspendSession}
          onShutdown={() => {
            setStartOpen(false);
            setShutdownDialog(true);
          }}
        />
      )}

      {shutdownDialog && (
        <Dialog
          title={t('start.shutdownDialog')}
          icon="shutdown"
          width={380}
          onClose={() => setShutdownDialog(false)}
          buttons={
            <>
              <Button
                primary
                onClick={() => {
                  if (shutdownChoice === 'shutdown') shutDown();
                  else if (shutdownChoice === 'restart') restartDesktop();
                  else suspendSession();
                }}
              >
                {t('common.ok')}
              </Button>
              <Button onClick={() => setShutdownDialog(false)}>{t('common.cancel')}</Button>
            </>
          }
        >
          <div className="u-col" style={{ gap: 10 }}>
            <p>{t('start.shutdownPrompt')}</p>
            <Checkbox
              checked={shutdownChoice === 'shutdown'}
              onChange={() => setShutdownChoice('shutdown')}
              label={t('start.optionShutdown')}
            />
            <Checkbox
              checked={shutdownChoice === 'restart'}
              onChange={() => setShutdownChoice('restart')}
              label={t('start.optionRestart')}
            />
            <Checkbox
              checked={shutdownChoice === 'suspend'}
              onChange={() => setShutdownChoice('suspend')}
              label={t('start.optionSuspend')}
            />
            <p className="u-muted u-selectable">{t('start.shutdownDescription')}</p>
          </div>
          <span className="dialog-illustration" aria-hidden="true">
            <Icon id="shutdown" size={32} />
          </span>
        </Dialog>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {wm.announcement}
      </div>
    </div>
  );
}
