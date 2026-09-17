import { useI18n } from '../core/i18n/I18nProvider';
import { usePreferences } from '../core/prefs/PreferencesProvider';
import { Slider } from '../ui/Slider';

/**
 * Tray volume: the slider really controls the volume of the synthesised
 * system sounds and remembers it with the rest of the preferences.
 */
export function VolumePopup({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { preferences, update } = usePreferences();

  return (
    <div className="volume-popup" role="dialog" aria-label={t('tray.volume')}>
      <Slider
        ariaLabel={t('tray.volume')}
        value={preferences.volume}
        onChange={(volume) => update({ volume })}
        ticks={5}
        width={72}
      />
      <div className="volume-popup-footer">
        <button type="button" className="btn btn--small" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
      {!preferences.soundsEnabled && <p className="volume-popup-note">{t('tray.soundsOff')}</p>}
    </div>
  );
}
