/**
 * The supported languages and their catalogues, kept free of React so the
 * build (vite.config.ts) can read them as well.
 */
import { ca } from './ca';
import { en } from './en';
import { es, type Catalog } from './es';

export const LOCALES = ['es', 'ca', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
/**
 * Language of every first visit, whatever the browser prefers: the site is
 * meant to be read in English first. The visitor's choice in the picker is
 * stored and wins from then on. (Spanish stays the source catalogue.)
 */
export const DEFAULT_LOCALE: Locale = 'en';

export const CATALOGS: Record<Locale, Catalog> = { es, ca, en };

/** Names shown in the language picker, written in their own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  ca: 'Català',
  en: 'English',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
