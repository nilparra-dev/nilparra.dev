import { useMemo, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { useVfs } from '../../core/fs/VfsProvider';
import { formatBytes } from '../../core/fs/vfsUtils';
import { LOCALE_LABELS, LOCALES, useI18n } from '../../core/i18n/I18nProvider';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { WALLPAPERS, wallpaperStyle } from '../../core/prefs/wallpapers';
import { playSound } from '../../core/sound/sounds';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { GroupBox } from '../../ui/GroupBox';
import { Select } from '../../ui/Select';
import { Slider } from '../../ui/Slider';
import { Tabs } from '../../ui/Tabs';

type TabId = 'appearance' | 'language' | 'sounds' | 'accessibility' | 'storage' | 'data';

/**
 * Control Panel: language, wallpaper, sounds, accessibility, storage and the
 * actions that touch the saved data. Everything here acts on real state.
 */
export function ControlPanelApp({ windowId }: AppRenderProps) {
  const { t, locale } = useI18n();
  const { preferences, update } = usePreferences();
  const vfs = useVfs();
  const dialogs = useDialogs();
  const wm = useWindowManager();
  const [tab, setTab] = useState<TabId>('appearance');
  const [notice, setNotice] = useState<string | null>(null);

  const tabs = useMemo(
    () => [
      { id: 'appearance', label: t('cp.tab.appearance') },
      { id: 'language', label: t('cp.tab.language') },
      { id: 'sounds', label: t('cp.tab.sounds') },
      { id: 'accessibility', label: t('cp.tab.accessibility') },
      { id: 'storage', label: t('cp.tab.storage') },
      { id: 'data', label: t('cp.tab.data') },
    ],
    [t],
  );

  const resetDisk = async () => {
    const confirmed = await dialogs.confirm({
      title: t('cp.resetDisk'),
      kind: 'warning',
      message: t('dialog.confirmReset'),
      buttons: 'yesNo',
    });
    if (!confirmed) return;
    const done = await vfs.resetDisk();
    setNotice(done ? t('cp.resetDone') : null);
  };

  const restorePortfolio = async () => {
    const done = await vfs.restorePortfolio();
    setNotice(done ? t('cp.resetDone') : null);
  };

  return (
    <div className="app-cp">
      <Tabs tabs={tabs} activeId={tab} onChange={(id) => setTab(id as TabId)} ariaLabel={t('app.controlPanel')} />

      <div className="tab-panel w95-scroll app-cp-panel">
        {tab === 'appearance' && (
          <>
            <GroupBox title={t('cp.wallpaperLabel')}>
              <div className="u-row">
                <Select
                  ariaLabel={t('cp.wallpaperLabel')}
                  value={preferences.wallpaperId}
                  options={WALLPAPERS.map((wallpaper) => ({
                    value: wallpaper.id,
                    label: wallpaper.kind === 'bitmap' ? `Windows 95 · ${wallpaper.name}` : t(wallpaper.labelKey),
                  }))}
                  onChange={(value) => update({ wallpaperId: value })}
                />
              </div>
              <div className="cp-wallpaper-preview" aria-hidden="true">
                {WALLPAPERS.filter((wallpaper) => wallpaper.id === preferences.wallpaperId).map((wallpaper) => (
                  <span
                    key={wallpaper.id}
                    className="cp-swatch"
                    style={wallpaperStyle(wallpaper, true)}
                  />
                ))}
              </div>
            </GroupBox>
            <GroupBox title={t('desktop.arrangeIcons')}>
              <Checkbox
                checked={preferences.autoArrangeIcons}
                onChange={(checked) => update({ autoArrangeIcons: checked })}
                label={t('cp.autoArrange')}
              />
            </GroupBox>
          </>
        )}

        {tab === 'language' && (
          <GroupBox title={t('cp.languageLabel')}>
            <div className="u-row">
              <Select
                ariaLabel={t('cp.languageLabel')}
                value={locale}
                options={LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] }))}
                onChange={(value) => update({ locale: value as typeof locale })}
              />
            </div>
            <p className="u-muted cp-hint">{t('cp.languageHint')}</p>
          </GroupBox>
        )}

        {tab === 'sounds' && (
          <GroupBox title={t('cp.tab.sounds')}>
            <Checkbox
              checked={preferences.soundsEnabled}
              onChange={(checked) => update({ soundsEnabled: checked })}
              label={t('cp.soundsEnable')}
            />
            <div className="u-row cp-slider-row">
              <span>{t('cp.volumeLabel')}</span>
              <Slider
                ariaLabel={t('cp.volumeLabel')}
                value={preferences.volume}
                onChange={(volume) => update({ volume })}
                ticks={5}
                width={140}
              />
            </div>
            <div className="u-row">
              <Button
                size="small"
                disabled={!preferences.soundsEnabled}
                onClick={() =>
                  playSound('ding', { enabled: preferences.soundsEnabled, volume: preferences.volume })
                }
              >
                {t('media.play')}
              </Button>
            </div>
            <p className="u-muted cp-hint">{t('cp.soundsHint')}</p>
          </GroupBox>
        )}

        {tab === 'accessibility' && (
          <GroupBox title={t('cp.tab.accessibility')}>
            <Checkbox
              checked={preferences.reduceMotion}
              onChange={(checked) => update({ reduceMotion: checked })}
              label={t('cp.reduceMotion')}
            />
            <Checkbox
              checked={preferences.highContrastLabels}
              onChange={(checked) => update({ highContrastLabels: checked })}
              label={t('cp.highContrast')}
            />
          </GroupBox>
        )}

        {tab === 'storage' && (
          <>
            <GroupBox title={t('cp.storageHeading')}>
              <p className="u-selectable">
                {t('cp.storageUsed', {
                  used: formatBytes(vfs.usage.usage),
                  quota: formatBytes(vfs.usage.quota),
                })}
              </p>
              <div className="cp-usage bevel-down" role="img" aria-label={t('cp.storageHeading')}>
                <span
                  className="cp-usage-fill"
                  style={{
                    width: `${vfs.usage.quota > 0 ? Math.min(100, (vfs.usage.usage / vfs.usage.quota) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="u-muted cp-hint">{t('cp.storageHint')}</p>
              <p className="u-muted cp-hint">{t('cp.exportsHint')}</p>
              <Button size="small" onClick={() => void vfs.refreshUsage()}>
                {t('desktop.refresh')}
              </Button>
            </GroupBox>
            <GroupBox title="C:\\Portfolio">
              <p className="u-muted cp-hint">{t('cp.resetPortfolioHint')}</p>
              <Button size="small" onClick={() => void restorePortfolio()}>
                {t('cp.resetPortfolio')}
              </Button>
            </GroupBox>
          </>
        )}

        {tab === 'data' && (
          <>
            <GroupBox title={t('cp.layoutHeading')}>
              <div className="u-row">
                <Button size="small" onClick={() => wm.resetLayout()}>
                  {t('cp.restoreLayout')}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    wm.windows.forEach((window) => wm.close(window.id));
                  }}
                >
                  {t('cp.closeAll')}
                </Button>
                <Button size="small" onClick={() => wm.close(windowId)}>
                  {t('window.close')}
                </Button>
              </div>
            </GroupBox>
            <GroupBox title={t('cp.resetDisk')}>
              <p className="u-muted cp-hint">{t('cp.resetDiskHint')}</p>
              <p className="u-muted cp-hint">{t('cp.exportsHint')}</p>
              <Button size="small" onClick={() => void resetDisk()}>
                {t('cp.resetDisk')}
              </Button>
            </GroupBox>
          </>
        )}

        {notice && <p className="cp-notice">{notice}</p>}
      </div>
    </div>
  );
}
