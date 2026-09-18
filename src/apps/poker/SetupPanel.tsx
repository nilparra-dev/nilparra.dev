import type { BotTemperament } from '../../core/poker/bots';
import { useI18n } from '../../core/i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { GroupBox } from '../../ui/GroupBox';
import { Select } from '../../ui/Select';

export interface MatchSettings {
  /** Number of rival seats, 1 to 5. */
  opponents: number;
  temperament: BotTemperament;
  startingStack: number;
}

export const DEFAULT_SETTINGS: MatchSettings = {
  opponents: 3,
  temperament: 'balanced',
  startingStack: 2000,
};

interface SetupPanelProps {
  settings: MatchSettings;
  onChange: (settings: MatchSettings) => void;
  onStart: () => void;
}

/** Lobby shown before the first hand and whenever a new match is requested. */
export function SetupPanel({ settings, onChange, onStart }: SetupPanelProps) {
  const { t } = useI18n();

  const update = (patch: Partial<MatchSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <div className="poker-setup">
      <h2 className="poker-setup-title">{t('poker.setup.title')}</h2>
      <p className="poker-setup-intro">{t('poker.setup.intro')}</p>

      <GroupBox title={t('poker.setup.table')}>
        <div className="poker-setup-field">
          <span className="poker-setup-label">{t('poker.setup.opponents')}</span>
          <Select
            value={String(settings.opponents)}
            options={[1, 2, 3, 4, 5].map((count) => ({
              value: String(count),
              label: String(count),
            }))}
            onChange={(value) => update({ opponents: Number(value) })}
            ariaLabel={t('poker.setup.opponents')}
          />
        </div>

        <div className="poker-setup-field">
          <span className="poker-setup-label">{t('poker.setup.temperament')}</span>
          <Select
            value={settings.temperament}
            options={[
              { value: 'calm', label: t('poker.temperament.calm') },
              { value: 'balanced', label: t('poker.temperament.balanced') },
              { value: 'wild', label: t('poker.temperament.wild') },
            ]}
            onChange={(value) => update({ temperament: value as BotTemperament })}
            ariaLabel={t('poker.setup.temperament')}
          />
        </div>

        <div className="poker-setup-field">
          <span className="poker-setup-label">{t('poker.setup.stack')}</span>
          <Select
            value={String(settings.startingStack)}
            options={[1000, 2000, 5000].map((stack) => ({
              value: String(stack),
              label: String(stack),
            }))}
            onChange={(value) => update({ startingStack: Number(value) })}
            ariaLabel={t('poker.setup.stack')}
          />
        </div>

        <div className="poker-setup-field">
          <span className="poker-setup-label">{t('poker.setup.blinds')}</span>
          <span className="poker-setup-value">10 / 20</span>
        </div>
      </GroupBox>

      <p className="poker-setup-hint">{t('poker.setup.hint')}</p>

      <div className="poker-setup-actions">
        <Button primary onClick={onStart}>
          {t('poker.setup.start')}
        </Button>
      </div>
    </div>
  );
}
