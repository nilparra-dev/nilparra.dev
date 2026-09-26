import { describe, expect, it } from 'vitest';
import { SECURITY_TXT_PATH, securityTxt } from './securityTxt';

const fields = (text: string) =>
  Object.fromEntries(
    text
      .trim()
      .split('\n')
      .map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]),
  );

describe('security.txt', () => {
  const builtAt = new Date('2026-09-26T10:30:15.123Z');
  const text = securityTxt('https://nilparra.dev', builtAt);

  it('carries the fields RFC 9116 requires, over https', () => {
    const { Contact, Expires, Canonical, Policy } = fields(text);
    expect(Contact).toMatch(/^https:\/\//);
    expect(Expires).toBeDefined();
    expect(Canonical).toBe(`https://nilparra.dev/${SECURITY_TXT_PATH}`);
    expect(Policy).toMatch(/^https:\/\//);
  });

  it('expires a year after the build, in whole seconds', () => {
    expect(fields(text).Expires).toBe('2027-09-26T10:30:15Z');
  });

  it('ends with a newline', () => {
    expect(text.endsWith('\n')).toBe(true);
  });
});
