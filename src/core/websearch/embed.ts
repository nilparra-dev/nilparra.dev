/**
 * Which addresses the Internet window can actually open in place.
 *
 * Big sites send `X-Frame-Options: deny` or a `frame-ancestors` policy that
 * forbids being framed, so the window shows a notice with a link to a real
 * browser tab instead of a broken frame. The list only covers the ones a
 * visitor is likely to meet here; any other site is attempted.
 */

/** Hosts verified to refuse framing from another origin. */
const FRAME_BLOCKING_HOSTS = [
  'github.com',
  'linkedin.com',
  'google.com',
  'youtube.com',
  'x.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',
  'whatsapp.com',
  'developer.mozilla.org',
  'stackoverflow.com',
  'reddit.com',
  'amazon.com',
  'amazon.es',
];

/** Bare host, without the `www.`, for headings and messages. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

/**
 * The URL of a typed address, or null when the text is a search term: a value
 * with spaces, without a host, or with a scheme other than http(s) is a query.
 */
export function parseWebUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(trimmed);
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !scheme) return null;
  const bare = scheme ? trimmed.slice(scheme[0].length) : trimmed;
  // Validate the host as typed: the URL parser would turn "2.5" into an IP.
  const rawHost = bare.split(/[/?#]/, 1)[0].split('@').pop()?.replace(/:\d+$/, '') ?? '';
  const namedHost = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(rawHost);
  const ipHost = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(rawHost);
  if (!namedHost && !ipHost && rawHost !== 'localhost') return null;
  try {
    const url = new URL(scheme ? trimmed : `https://${trimmed}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** False when the site forbids being shown inside another page. */
export function canEmbed(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return !FRAME_BLOCKING_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}
