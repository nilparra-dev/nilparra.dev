import { describe, expect, it } from 'vitest';
import { canEmbed, hostOf, parseWebUrl } from './embed';

describe('web addresses', () => {
  it('reads bare hosts and full URLs, and rejects search terms', () => {
    expect(parseWebUrl('github.com')?.href).toBe('https://github.com/');
    expect(parseWebUrl('https://es.wikipedia.org/wiki/Windows_95')?.href).toBe(
      'https://es.wikipedia.org/wiki/Windows_95',
    );
    expect(parseWebUrl('windows 95')).toBeNull();
    expect(parseWebUrl('calculadora')).toBeNull();
    expect(parseWebUrl('2.5')).toBeNull();
    expect(parseWebUrl('mailto:nil@nilparra.dev')).toBeNull();
    expect(parseWebUrl('127.0.0.1:5173')?.href).toBe('https://127.0.0.1:5173/');
  });

  it('knows the sites that refuse to be framed', () => {
    expect(canEmbed('https://github.com/nilparra-dev')).toBe(false);
    expect(canEmbed('https://gist.github.com/someone')).toBe(false);
    expect(canEmbed('https://www.linkedin.com/in/nilparra1/')).toBe(false);
    expect(canEmbed('https://es.wikipedia.org/wiki/Windows_95')).toBe(true);
    expect(canEmbed('https://example.com')).toBe(true);
  });

  it('shows a bare host without the www', () => {
    expect(hostOf('https://www.github.com/nilparra-dev')).toBe('github.com');
  });
});
