// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleSearchUrl, searchWeb } from './searchWeb';

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchWeb', () => {
  it('queries the service in keyless mode and normalises the answer', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        results: [
          { url: 'https://example.com/a', title: 'Example A', content: 'Some [link](https://x) text [...] more' },
          { url: 'https://example.com/a', title: 'Duplicated', content: 'ignored' },
          { url: 'ftp://example.com/file', title: 'Ignored', content: '' },
          { url: 'https://example.com/b', title: '', content: '' },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchWeb('  hello world  ');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe('https://api.tavily.com/search');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Tavily-Access-Mode']).toBe('keyless');
    expect(JSON.parse(String(init.body))).toMatchObject({ query: 'hello world', search_depth: 'basic' });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 'https://example.com/a',
      title: 'Example A',
      snippet: 'Some link text more',
    });
    // A result without a title falls back to its host name.
    expect(results[1]).toMatchObject({ title: 'example.com', snippet: '' });
  });

  it('maps an exhausted free budget to a limit failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ detail: { error: 'limit' } }, 429)));
    await expect(searchWeb('x')).rejects.toMatchObject({ name: 'WebSearchError', reason: 'limit' });
  });

  it('maps transport errors to a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline');
      }),
    );
    await expect(searchWeb('x')).rejects.toMatchObject({ reason: 'network' });
  });

  it('maps unexpected answers to a server failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 500)));
    await expect(searchWeb('x')).rejects.toMatchObject({ reason: 'server' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('bad json');
        },
      }) as unknown as Response),
    );
    await expect(searchWeb('x')).rejects.toMatchObject({ reason: 'server' });
  });

  it('does not call the service for a blank query', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(searchWeb('   ')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds an encoded Google fallback URL', () => {
    expect(googleSearchUrl('hola mundo & cía')).toBe(
      'https://www.google.com/search?q=hola%20mundo%20%26%20c%C3%ADa',
    );
  });
});
