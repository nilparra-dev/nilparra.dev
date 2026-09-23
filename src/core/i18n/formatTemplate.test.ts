import { describe, expect, it } from 'vitest';
import { CATALOGS, formatTemplate } from './I18nProvider';

describe('formatTemplate', () => {
  it('fills parameters and leaves unknown ones visible', () => {
    expect(formatTemplate('Hola, {name}', { name: 'Nil' })).toBe('Hola, Nil');
    expect(formatTemplate('{missing}', {})).toBe('{missing}');
  });

  it('picks the singular only for exactly one', () => {
    const template = '{count} {count|objeto|objetos}';
    expect(formatTemplate(template, { count: 1 })).toBe('1 objeto');
    expect(formatTemplate(template, { count: 0 })).toBe('0 objetos');
    expect(formatTemplate(template, { count: 2 })).toBe('2 objetos');
  });

  it('pluralizes the delete confirmation in every catalogue', () => {
    expect(formatTemplate(CATALOGS.es['dialog.confirmDeleteMany'], { count: 1 })).toContain('1 elemento');
    expect(formatTemplate(CATALOGS.ca['dialog.confirmDeleteMany'], { count: 1 })).toContain('1 element');
    expect(formatTemplate(CATALOGS.en['dialog.confirmDeleteMany'], { count: 2 })).toContain('2 items');
  });
});
