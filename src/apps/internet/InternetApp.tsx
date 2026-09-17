import { useCallback, useMemo, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useAppLauncher } from '../../core/apps/launcher';
import { PROFILE } from '../../core/content';
import { useI18n } from '../../core/i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { StatusBar } from '../../ui/StatusBar';

type PageId = 'home' | 'links' | 'contact';

/**
 * Period browser for the internal pages and the author's links.
 *
 * It never pretends to render third party sites: external addresses open in a
 * real browser tab and the window says so.
 */
export function InternetApp({ windowId }: AppRenderProps) {
  const { t } = useI18n();
  const launch = useAppLauncher();
  const [history, setHistory] = useState<PageId[]>(['home']);
  const [index, setIndex] = useState(0);

  const page = history[index] ?? 'home';

  const navigate = useCallback(
    (target: PageId) => {
      setHistory((current) => [...current.slice(0, index + 1), target]);
      setIndex((current) => current + 1);
    },
    [index],
  );

  const externalLinks = useMemo(() => PROFILE.links.filter((link) => link.external), []);

  const pageTitle = page === 'home'
    ? t('internet.page.about')
    : page === 'links'
      ? t('internet.bookmarks')
      : t('internet.page.contact');

  return (
    <div className="app-internet">
      <div className="toolbar">
        <button type="button" className="tool-btn" onClick={() => setIndex(0)} title={t('internet.home')}>
          <Icon id="internet" size={16} />
          <span>{t('internet.home')}</span>
        </button>
        <button type="button" className="tool-btn" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}>
          <span>{t('menu.back')}</span>
        </button>
        <button type="button" className="tool-btn" onClick={() => setIndex((current) => Math.min(history.length - 1, current + 1))} disabled={index >= history.length - 1}>
          <span>{t('viewer.next')}</span>
        </button>
      </div>

      <div className="internet-address">
        <span className="explorer-address-label">{t('internet.address')}</span>
        <span className="field internet-url">{`local://${page}`}</span>
      </div>

      <div className="w95-scroll client internet-page u-selectable">
        <h1 className="internet-title">{pageTitle}</h1>

        {page === 'home' && (
          <>
            <p>{t('internet.externalNotice')}</p>
            <p>{t('welcome.intro')}</p>
            <p>
              <button type="button" className="link link--button" onClick={() => navigate('links')}>
                {t('internet.bookmarks')}
              </button>
              {' · '}
              <button type="button" className="link link--button" onClick={() => navigate('contact')}>
                {t('internet.page.contact')}
              </button>
              {' · '}
              <button type="button" className="link link--button" onClick={() => launch({ appId: 'projects' })}>
                {t('internet.page.projects')}
              </button>
            </p>
          </>
        )}

        {page === 'links' && (
          <ul className="internet-links" role="list">
            {externalLinks.map((link) => (
              <li key={link.id}>
                <Icon id={link.icon} size={16} />
                <a className="link" href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
                <span className="u-muted">{link.url}</span>
              </li>
            ))}
          </ul>
        )}

        {page === 'contact' && (
          <>
            <p>{t('mail.note')}</p>
            <p>
              <a className="link" href={`mailto:${PROFILE.email}`}>
                {PROFILE.email}
              </a>
            </p>
            <Button size="small" onClick={() => launch({ appId: 'mail' })}>
              {t('app.mail')}
            </Button>
          </>
        )}
      </div>

      <StatusBar
        grip
        panels={[
          { id: 'external', content: t('internet.externalNotice') },
          { id: 'page', width: 140, content: pageTitle },
        ]}
      />
      <span className="sr-only" aria-live="polite">
        {pageTitle}
      </span>
      <span hidden>{windowId}</span>
    </div>
  );
}
