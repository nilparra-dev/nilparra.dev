import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The policy is written twice: as a meta element in index.html (the only
 * channel under `vite dev` and `vite preview`) and as a response header in
 * public/_headers (production). The header may only add frame-ancestors,
 * which a meta element cannot carry.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

function metaPolicy(): string {
  const match = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(read('../index.html'));
  if (!match) throw new Error('index.html has no Content-Security-Policy meta');
  return match[1];
}

function headerPolicy(): string {
  const match = /^\s+Content-Security-Policy:\s*(.+)$/m.exec(read('../public/_headers'));
  if (!match) throw new Error('public/_headers has no Content-Security-Policy');
  return match[1].trim();
}

describe('content security policy', () => {
  it('sends the meta policy as a header, plus frame-ancestors', () => {
    expect(headerPolicy()).toBe(`${metaPolicy()}; frame-ancestors 'none'`);
  });
});
