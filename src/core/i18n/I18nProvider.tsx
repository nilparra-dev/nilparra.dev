import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { ca } from './ca';
import { en } from './en';
import { es, type Catalog, type TranslationKey } from './es';

export const LOCALES = ['es', 'ca', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

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

/**
 * Browser language detection used on the first visit: any variant of Catalan,
 * Spanish or English selects that catalogue, anything else falls back to
 * Spanish.
 */
export function detectLocale(candidates?: readonly string[]): Locale {
  const list =
    candidates ??
    (typeof navigator !== 'undefined'
      ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
      : []);

  for (const raw of list) {
    const tag = raw.toLowerCase();
    if (tag.startsWith('ca')) return 'ca';
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}

export function formatTemplate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const catalog = CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE];
  const template = catalog[key] ?? CATALOGS[DEFAULT_LOCALE][key] ?? key;
  return formatTemplate(template, params);
}

export interface I18nValue {
  locale: Locale;
  /** Translate a UI key. */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export interface I18nProviderProps {
  locale: Locale;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback<I18nValue['t']>(
    (key, params) => translate(locale, key, params),
    [locale],
  );

  const value = useMemo<I18nValue>(() => {
    const formatter = (options?: Intl.DateTimeFormatOptions) => {
      try {
        return new Intl.DateTimeFormat(locale, options);
      } catch {
        return new Intl.DateTimeFormat(DEFAULT_LOCALE, options);
      }
    };
    return {
      locale,
      t,
      formatDate: (input, options = { dateStyle: 'short' }) =>
        formatter(options).format(input instanceof Date ? input : new Date(input)),
      formatTime: (input, options = { timeStyle: 'short' }) =>
        formatter(options).format(input instanceof Date ? input : new Date(input)),
      formatDateTime: (input, options = { dateStyle: 'short', timeStyle: 'short' }) =>
        formatter(options).format(input instanceof Date ? input : new Date(input)),
      formatNumber: (input, options) => {
        try {
          return new Intl.NumberFormat(locale, options).format(input);
        } catch {
          return String(input);
        }
      },
    };
  }, [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

/** Shorthand for components that only need the translator. */
export function useT(): I18nValue['t'] {
  return useI18n().t;
}
