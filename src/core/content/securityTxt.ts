/**
 * `/.well-known/security.txt` (RFC 9116): where to report a vulnerability,
 * for people and scanners that look for it before anything else.
 *
 * It is written at build time because the RFC requires an `Expires` date and
 * recommends keeping it under a year away: every deploy pushes it forward, so
 * the file cannot go stale while the site is maintained.
 */

/** GitHub's private vulnerability reporting form, the channel .github/SECURITY.md asks for. */
const REPORT_URL = 'https://github.com/nilparra-dev/nilparra.dev/security/advisories/new';
const POLICY_URL = 'https://github.com/nilparra-dev/nilparra.dev/security/policy';

const VALIDITY_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export const SECURITY_TXT_PATH = '.well-known/security.txt';

export function securityTxt(siteUrl: string, builtAt: Date): string {
  const expires = new Date(builtAt.getTime() + VALIDITY_DAYS * DAY_MS);
  return [
    `Contact: ${REPORT_URL}`,
    // Whole seconds: the RFC takes an RFC 3339 date and some parsers reject fractions.
    `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    'Preferred-Languages: es, ca, en',
    `Canonical: ${siteUrl}/${SECURITY_TXT_PATH}`,
    `Policy: ${POLICY_URL}`,
    '',
  ].join('\n');
}
