import { PROFILE, pick } from '../../core/content';
import { useAppLauncher, type AppRenderProps } from '../../core/apps/launcher';
import { useOpenExternal } from '../../core/dialogs/useOpenExternal';
import { isLocale, LOCALE_LABELS, LOCALES, useI18n } from '../../core/i18n/I18nProvider';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Select } from '../../ui/Select';

/** Touch screens open desktop icons with a single tap, so the tip changes. */
function touchScreen(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/*
 * The name is split like "Welcome to Windows95": the short name in heavy type
 * and the rest of the full name in white, where the original had the "95".
 */
const NAME_TAIL = PROFILE.displayName.startsWith(PROFILE.shortName)
  ? PROFILE.displayName.slice(PROFILE.shortName.length).trim()
  : '';
const NAME_HEAD = NAME_TAIL ? PROFILE.shortName : PROFILE.displayName;

/**
 * First visit window, laid out like the Welcome screen of Windows 95: the
 * heading on top, the sunken tip panel on the left with the presentation,
 * the column of buttons on the right and Close as the default button.
 */
export function WelcomeApp({ windowId }: AppRenderProps) {
  const { t, locale } = useI18n();
  const { preferences, update } = usePreferences();
  const launch = useAppLauncher();
  const openExternal = useOpenExternal();
  const wm = useWindowManager();

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
      <h1 className="app-welcome-title">
        <span className="app-welcome-title-hello">{t('welcome.greeting')}</span>{' '}
        <span className="app-welcome-title-name">{NAME_HEAD}</span>
        {NAME_TAIL && (
          <>
            {' '}
            <span className="app-welcome-title-tail">{NAME_TAIL}</span>
          </>
        )}
      </h1>

      <div className="w95-scroll app-welcome-panel">
        <img
          className="app-welcome-photo bevel-down"
          src={`${import.meta.env.BASE_URL}${PROFILE.photoUrl}`}
          alt=""
          width={64}
          height={64}
        />
        <div className="app-welcome-text">
          <p className="app-welcome-tagline">{tagline}</p>
          <p>{t('welcome.intro')}</p>

          <dl className="app-welcome-facts" aria-label={t('welcome.facts')}>
            {facts.map((fact) => (
              <div key={fact.label} className="app-welcome-fact">
                <dt>{fact.label}</dt>
                <dd className="u-selectable">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <p className="app-welcome-note">
            {t(touchScreen() ? 'welcome.tipTouch' : 'welcome.tip')} {t('welcome.storageNote')}
          </p>
        </div>
      </div>

      <div className="app-welcome-side">
        <div className="app-welcome-actions">
          <Button onClick={() => launch({ appId: 'about' })}>{t('welcome.aboutMe')}</Button>
          <Button onClick={() => launch({ appId: 'projects' })}>{t('welcome.exploreProjects')}</Button>
          {cvUrl && <Button onClick={() => void openExternal(cvUrl)}>{t('welcome.downloadCv')}</Button>}
          <Button onClick={() => launch({ appId: 'mail' })}>{t('welcome.contact')}</Button>
        </div>

        <div className="app-welcome-language">
          <span aria-hidden="true">{t('welcome.languageLabel')}</span>
          <Select
            ariaLabel={t('welcome.languageLabel')}
            className="welcome-language-select"
            value={locale}
            options={LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] }))}
            onChange={(value) => { if (isLocale(value)) update({ locale: value }); }}
          />
        </div>

        <hr className="groove-flat app-welcome-rule" />
      </div>

      <div className="app-welcome-footer">
        <Checkbox
          checked={preferences.openWelcomeOnStart}
          onChange={(checked) => update({ openWelcomeOnStart: checked })}
          label={t('welcome.showOnStart')}
        />
      </div>
      <Button primary className="app-welcome-close" onClick={() => void wm.close(windowId)}>
        {t('window.close')}
      </Button>
    </div>
  );
}
