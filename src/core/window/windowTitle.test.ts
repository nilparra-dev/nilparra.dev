import { describe, expect, it } from 'vitest';
import { CATALOGS } from '../i18n/locales';
import type { TranslationKey } from '../i18n/es';
import { windowTitle } from './windowTitle';

const tIn = (locale: 'es' | 'ca' | 'en') => (key: TranslationKey) => CATALOGS[locale][key];

describe('windowTitle', () => {
  it('shows the application name in the current language', () => {
    const opened = { appId: 'welcome', title: CATALOGS.es['app.welcome'] };
    expect(windowTitle(opened, tIn('en'))).toBe(CATALOGS.en['app.welcome']);
    expect(windowTitle(opened, tIn('ca'))).toBe(CATALOGS.ca['app.welcome']);
    expect(windowTitle({ appId: 'welcome', title: CATALOGS.en['app.welcome'] }, tIn('es'))).toBe(
      CATALOGS.es['app.welcome'],
    );
  });

  it('keeps a title the application chose itself', () => {
    const renamed = { appId: 'notepad', title: 'notes.txt - Bloc de notas' };
    expect(windowTitle(renamed, tIn('en'))).toBe('notes.txt - Bloc de notas');
  });

  it('keeps the title of an unknown application', () => {
    expect(windowTitle({ appId: 'gone', title: 'Whatever' }, tIn('en'))).toBe('Whatever');
  });
});
