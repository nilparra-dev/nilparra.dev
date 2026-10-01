import { APP_CATALOG } from '../apps/catalog';
import { CATALOGS, LOCALES } from '../i18n/locales';
import type { TranslationKey } from '../i18n/es';
import type { WindowInstance } from './types';

/**
 * The title a window shows in the current language.
 *
 * A window stores its title when it opens (or when the application renames it,
 * as Notepad does for "file - Notepad"), so a plain application window would
 * keep the language it was opened in after the visitor switches it, and so
 * would a window restored from a previous session. When the stored title is
 * the application's own name in any language, show that name in the current
 * one; titles an application chose itself are returned untouched, because the
 * application retitles them when the language changes.
 */
export function windowTitle(
  window: Pick<WindowInstance, 'appId' | 'title'>,
  t: (key: TranslationKey) => string,
): string {
  const app = APP_CATALOG[window.appId];
  if (!app) return window.title;
  const isCatalogName = LOCALES.some((locale) => CATALOGS[locale][app.nameKey] === window.title);
  return isCatalogName ? t(app.nameKey) : window.title;
}
