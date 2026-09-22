import { describe, expect, it } from 'vitest';
import { formatTemplate } from './I18nProvider';

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
});
