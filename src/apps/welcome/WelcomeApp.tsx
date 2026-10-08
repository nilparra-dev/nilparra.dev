import { PROFILE, pick } from '../../core/content';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useAppLauncher } from '../../core/apps/launcher';
import { useOpenExternal } from '../../core/dialogs/useOpenExternal';
import { isLocale, LOCALE_LABELS, LOCALES, useI18n } from '../../core/i18n/I18nProvider';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Icon } from '../../ui/Icon';
import { Select } from '../../ui/Select';

/** Touch screens open desktop icons with a single tap, so the tip changes. */
function touchScreen(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * First visit window: who the desktop belongs to, the shortcut to the rest of
 * the portfolio, and the language switch kept below the main reading.
 */
export function WelcomeApp({ windowId }: AppRenderProps) {
  const { t, locale } = useI18n();
  const { preferences, update } = usePreferences();
  const launch = useAppLauncher();
  void windowId;

  const openExternal = useOpenExternal();

  const tagline = pick(PROFILE.tagline, locale);
  const cvUrl = PROFILE.cvUrl ? pick(PROFILE.cvUrl, locale) : null;
  const job = PROFILE.experience[0];
  /* The facts come from the profile, so they always match "About me". */
  const facts = [
    job && {
      label: t('welcome.factExperience'),
      value: `${pick(job.role, locale)} · ${job.company}`,
    },
    { label: t('welcome.factLocation'), value: PROFILE.location },
    {
      label: t('welcome.factLanguages'),
      value: PROFILE.languages.map((language) => pick(language.name, locale)).join(', '),
    },
  ].filter((fact) => fact !== undefined);

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

        <dl className="app-welcome-facts" aria-label={t('welcome.facts')}>
          {facts.map((fact) => (
            <div key={fact.label} className="app-welcome-fact">
              <dt>{fact.label}</dt>
              <dd className="u-selectable">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="u-row app-welcome-actions">
          <Button onClick={() => launch({ appId: 'about' })}>{t('welcome.aboutMe')}</Button>
          <Button primary onClick={() => launch({ appId: 'projects' })}>
            {t('welcome.exploreProjects')}
          </Button>
          {cvUrl && <Button onClick={() => void openExternal(cvUrl)}>{t('welcome.downloadCv')}</Button>}
          <Button onClick={() => launch({ appId: 'mail' })}>{t('welcome.contact')}</Button>
          <Button onClick={() => launch({ appId: 'help', params: { topicId: 'welcome' } })}>
            {t('start.help')}
          </Button>
        </div>

        {/* The switch stays one row below the actions instead of leading them. */}
        <div className="u-row app-welcome-language">
          <span className="u-muted">{t('welcome.languageLabel')}</span>
          <Select
            ariaLabel={t('welcome.languageLabel')}
            className="welcome-language-select"
            value={locale}
            options={LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] }))}
            onChange={(value) => { if (isLocale(value)) update({ locale: value }); }}
          />
        </div>

        <p className="app-welcome-note u-muted">
          {t(touchScreen() ? 'welcome.tipTouch' : 'welcome.tip')} {t('welcome.storageNote')}
        </p>
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
