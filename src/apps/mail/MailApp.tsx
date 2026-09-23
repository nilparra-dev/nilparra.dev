import { useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { PROFILE } from '../../core/content';
import { useI18n } from '../../core/i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { GroupBox } from '../../ui/GroupBox';
import { StatusBar } from '../../ui/StatusBar';

/**
 * Contact window: shows the address, copies it and opens the visitor's mail
 * client. It never sends anything on its own.
 */
export function MailApp({ windowId }: AppRenderProps) {
  const { t } = useI18n();
  const [notice, setNotice] = useState<string | null>(null);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setNotice(t('mail.copied'));
    } catch {
      // Older browsers without the async clipboard API: select the text so the
      // visitor can copy it with Ctrl+C.
      const field = document.getElementById('mail-address');
      if (field instanceof HTMLInputElement) {
        field.select();
        setNotice(t('mail.copy'));
      }
    }
  };

  /**
   * The link itself carries the mailto:, so the browser keeps full control over
   * the external program. The notice is there because a machine without a mail
   * app gives no feedback at all and the button looks broken.
   */
  const openMailClient = () => setNotice(t('mail.openingHint'));

  const otherLinks = PROFILE.links.filter((link) => !link.url.startsWith('mailto'));

  return (
    <div className="app-mail">
      <div className="w95-scroll app-mail-body">
        <header className="app-section-head">
          <span className="mail-avatar" aria-hidden="true">
            @
          </span>
          <div>
            <h1>{t('mail.heading')}</h1>
            <p className="u-muted">{PROFILE.displayName}</p>
          </div>
        </header>

        <p className="mail-invite">{t('mail.invite')}</p>

        <GroupBox title={t('internet.page.contact')}>
          <div className="u-row">
            <input id="mail-address" className="field u-grow" value={PROFILE.email} readOnly />
            <Button onClick={() => void copyAddress()}>{t('mail.copy')}</Button>
          </div>
          <div className="u-row mail-actions">
            <a className="btn" href={`mailto:${PROFILE.email}`} onClick={openMailClient}>
              {t('mail.open')}
            </a>
          </div>
          <p className="u-muted mail-note">{t('mail.note')}</p>
        </GroupBox>

        <GroupBox title={t('mail.otherLinks')}>
          <ul className="internet-links" role="list">
            {otherLinks.map((link) => (
              <li key={link.id}>
                <a className="link" href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
                <span className="u-muted">{link.url}</span>
              </li>
            ))}
          </ul>
        </GroupBox>
      </div>

      <StatusBar
        grip
        panels={[
          { id: 'notice', content: notice ?? '' },
          { id: 'address', width: 220, content: PROFILE.email },
        ]}
      />
      <span className="sr-only" aria-live="polite">
        {notice}
      </span>
      <span hidden>{windowId}</span>
    </div>
  );
}
