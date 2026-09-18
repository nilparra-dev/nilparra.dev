/**
 * Real web search for the Internet window.
 *
 * The desktop stays a static site: results come straight from Tavily's
 * keyless access mode, which needs no account, no API key and no server in
 * between. The service is rate limited per visitor, which is the right size
 * for a personal page; when it says no, the caller shows a translated warning
 * and never invents a result.
 *
 * Swapping search engines means replacing this file: no other module knows
 * which service answers.
 */

export interface WebSearchResult {
  /** Stable identity of a result: its URL. */
  id: string;
  title: string;
  url: string;
  snippet: string;
}

/** Why a search could not be completed, translated by the caller. */
export type WebSearchFailure = 'limit' | 'network' | 'server';

export class WebSearchError extends Error {
  readonly reason: WebSearchFailure;

  constructor(reason: WebSearchFailure) {
    super(`web search failed: ${reason}`);
    this.name = 'WebSearchError';
    this.reason = reason;
  }
}

export interface WebSearchOptions {
  /** Maximum number of results. */
  limit?: number;
  /** Cancels the request; aborted searches reject with a network failure. */
  signal?: AbortSignal;
}

const ENDPOINT = 'https://api.tavily.com/search';
const ACCESS_MODE = 'keyless';
const DEFAULT_LIMIT = 8;
const TIMEOUT_MS = 12_000;
const MAX_SNIPPET = 240;

/** Query a real web search engine and normalise its answer. */
export async function searchWeb(
  query: string,
  options: WebSearchOptions = {},
): Promise<WebSearchResult[]> {
  const term = query.trim();
  if (!term) return [];

  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tavily-Access-Mode': ACCESS_MODE,
      },
      body: JSON.stringify({
        query: term,
        max_results: clampLimit(options.limit),
        search_depth: 'basic',
      }),
      signal: controller.signal,
    });
  } catch {
    throw new WebSearchError('network');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }

  if (!response.ok) {
    // Tavily answers 429 when the keyless budget is spent and 432/433 when a
    // plan limit is reached; everything else is an unexpected server answer.
    const exhausted = response.status === 429 || response.status === 432 || response.status === 433;
    throw new WebSearchError(exhausted ? 'limit' : 'server');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new WebSearchError('server');
  }

  return normaliseResults(payload);
}

/** Real browser URL of a Google search, used as the fallback action. */
export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
}

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(20, Math.max(1, Math.trunc(limit)));
}

/** Keeps only well formed, unique http(s) results with clean text. */
function normaliseResults(payload: unknown): WebSearchResult[] {
  if (!payload || typeof payload !== 'object') return [];
  const raw = (payload as { results?: unknown }).results;
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const results: WebSearchResult[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url.trim() : '';
    if (!isWebUrl(url) || seen.has(url)) continue;
    seen.add(url);

    const title = typeof record.title === 'string' ? record.title.trim() : '';
    results.push({
      id: url,
      url,
      title: title || hostOf(url),
      snippet: toSnippet(typeof record.content === 'string' ? record.content : ''),
    });
  }

  return results;
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function hostOf(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

/** Collapses the markdown-ish fragments the service returns into one line. */
function toSnippet(value: string): string {
  const clean = value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\s*\.{3}\s*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—·•|.,;:]+/, '')
    .trim();
  if (clean.length <= MAX_SNIPPET) return clean;
  return `${clean.slice(0, MAX_SNIPPET).trimEnd()}…`;
}
