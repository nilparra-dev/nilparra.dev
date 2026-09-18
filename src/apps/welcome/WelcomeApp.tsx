import { PROFILE, pick } from '../../core/content';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useAppLauncher } from '../../core/apps/launcher';
import { isLocale, LOCALE_LABELS, LOCALES, useI18n } from '../../core/i18n/I18nProvider';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { GroupBox } from '../../ui/GroupBox';
import { Icon } from '../../ui/Icon';
import { Select } from '../../ui/Select';

/**
 * First visit window: who the desktop belongs to, how it works, the language
 * switch and the shortcut to the rest of the portfolio.
 */
export function WelcomeApp({ windowId }: AppRenderProps) {
  const { t, locale } = useI18n();
  const { preferences, update } = usePreferences();
  const launch = useAppLauncher();
  void windowId;

  const tagline = pick(PROFILE.tagline, locale);

  return (
    <div className="client app-welcome">
      <div className="app-welcome-head">
        <Icon id="welcome" size={32} />
        <div className="u-grow">
          <h1 className="app-welcome-greeting">{t('welcome.greeting', { name: PROFILE.displayName })}</h1>
          <p className="app-welcome-tagline">{tagline}</p>
        </div>
      </div>

      <div className="w95-scroll app-welcome-body">
        <p className="app-welcome-intro">{t('welcome.intro')}</p>

        <GroupBox title={t('welcome.languageLabel')} className="app-welcome-group">
          <div className="u-row">
            <Select
              ariaLabel={t('welcome.languageLabel')}
              className="welcome-language-select"
              value={locale}
              options={LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] }))}
              onChange={(value) => { if (isLocale(value)) update({ locale: value }); }}
            />
          </div>
        </GroupBox>

        <GroupBox title={t('desktop.open')} className="app-welcome-group">
          <div className="u-row app-welcome-actions">
            <Button primary onClick={() => launch({ appId: 'projects' })}>
              {t('welcome.exploreProjects')}
            </Button>
            <Button onClick={() => launch({ appId: 'about' })}>{t('welcome.aboutMe')}</Button>
            <Button onClick={() => launch({ appId: 'mail' })}>{t('welcome.contact')}</Button>
            <Button onClick={() => launch({ appId: 'help', params: { topicId: 'intro' } })}>
              {t('start.help')}
            </Button>
          </div>
        </GroupBox>

        <p className="app-welcome-note">{t('welcome.storageNote')}</p>
        <p className="app-welcome-note u-muted">{t('welcome.tip')}</p>
      </div>

      <div className="app-welcome-footer">
        <Checkbox
          checked={preferences.openWelcomeOnStart}
          onChange={(checked) => update({ openWelcomeOnStart: checked })}
          label={t('welcome.showOnStart')}
        />
      </div>
    </div>
  );
}
