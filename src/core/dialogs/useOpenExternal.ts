import { useCallback } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useDialogs } from './DialogProvider';

/**
 * Where a link leads, or null when it must not be opened: only http(s) ever
 * reaches the real browser, so javascript: or data: addresses coming from
 * stored or fetched data are dropped.
 */
export function externalTarget(href: string): URL | null {
  try {
    const url = new URL(href, window.location.href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Opens an address in a new browser tab. Addresses on another site first ask
 * for confirmation, so leaving the desktop is never a surprise; files of this
 * same site (the CV) open straight away.
 *
 * The tab is opened right after the answer, still inside the click on the
 * message box button, so popup blockers accept it.
 */
export function useOpenExternal(): (href: string) => Promise<void> {
  const dialogs = useDialogs();
  const { t } = useI18n();

  return useCallback(
    async (href: string) => {
      const url = externalTarget(href);
      if (!url) return;
      if (url.origin !== window.location.origin) {
        const answer = await dialogs.message({
          title: t('dialog.leaveSiteTitle'),
          kind: 'warning',
          message: t('dialog.leaveSite', { host: url.hostname }),
          detail: url.href,
          buttons: 'okCancel',
        });
        if (answer !== 'ok') return;
      }
      window.open(url.href, '_blank', 'noopener,noreferrer');
    },
    [dialogs, t],
  );
}
