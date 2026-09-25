import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { es, type TranslationKey } from './es';
import { CATALOGS, DEFAULT_LOCALE, type Locale } from './locales';

export { CATALOGS, DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, isLocale, type Locale } from './locales';

/**
 * Replaces `{name}` with a parameter and `{name|one|other}` with the singular
 * or plural form by that number; es, ca and en only need the two forms.
 */
export function formatTemplate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)(?:\|([^|{}]*)\|([^|{}]*))?\}/g, (match, key: string, one?: string, other?: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, key)) return match;
    if (one === undefined || other === undefined) return String(params[key]);
    return Number(params[key]) === 1 ? one : other;
  });
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const catalog = CATALOGS[locale] ?? es;
  const template = catalog[key] ?? es[key] ?? key;
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
