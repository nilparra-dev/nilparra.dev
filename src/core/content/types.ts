import type { Locale } from '../i18n/locales';

/** A piece of content written once per supported language. */
export interface Localized<T> {
  es: T;
  ca: T;
  en: T;
}

/**
 * Resolve a localized value, falling back to Spanish when a translation has
 * not been written yet.
 */
export function pick<T>(value: Localized<T> | undefined, locale: Locale): T {
  if (!value) throw new Error('Missing localized content');
  return value[locale] ?? value.es;
}

/**
 * Marker for content that the site's owner still has to fill in. The UI shows
 * it verbatim and styles anything starting with it as a placeholder, so a
 * half-finished section is never mistaken for real information.
 */
export const PLACEHOLDER = '[PENDIENTE]';

export function isPlaceholder(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PLACEHOLDER);
}
