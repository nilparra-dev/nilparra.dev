import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { PROFILE } from './src/core/content/profile';
import { PROJECTS } from './src/core/content/projects';
import { staticProfileHtml } from './src/core/content/staticHtml';
import { TECHNOLOGIES } from './src/core/content/technologies';
import { pick } from './src/core/content/types';
import { DEFAULT_LOCALE } from './src/core/i18n/locales';

/**
 * `base` must match the deployment path:
 *  - GitHub Pages project site: "/<repository-name>/"
 *  - user/organization site or custom domain: "/"
 * Set it through the VITE_BASE environment variable at build time.
 */
const base = process.env.VITE_BASE ?? '/';

/**
 * Canonical site, used for the absolute addresses that search engines and
 * social networks need (canonical, og:url, og:image and the structured data).
 * `%BASE_URL%` only carries the path, so the domain is written down here and
 * nowhere else; `public/robots.txt` and `public/sitemap.xml` mirror it and the
 * deploy workflow can override it with the SITE_URL repository variable.
 */
const siteUrl = (process.env.VITE_SITE_URL ?? 'https://nilparra.dev').replace(/\/+$/, '');

const absolute = (path: string) => `${siteUrl}/${path.replace(/^\/+/, '')}`;

/** Places that identify the person elsewhere on the web. */
function sameAsUrls(): string[] {
  return PROFILE.links
    .filter((link) => link.external && /^https?:\/\//i.test(link.url))
    .map((link) => link.url);
}

function emailAddress(): string {
  const mailed = PROFILE.links.find((link) => link.url.startsWith('mailto:'));
  return mailed ? mailed.url.slice('mailto:'.length) : PROFILE.email;
}

/** `location` is free text, so it is only split when it really has two parts. */
function postalAddress(): Record<string, string> | null {
  const [locality, region] = PROFILE.location.split(',').map((part) => part.trim());
  if (!locality) return null;
  const address: Record<string, string> = { '@type': 'PostalAddress', addressLocality: locality };
  if (region) address.addressRegion = region;
  return address;
}

function alumniOf(): Array<Record<string, string>> {
  const centres = new Set(PROFILE.studies.map((study) => pick(study.centre, DEFAULT_LOCALE)));
  return [...centres].map((name) => ({ '@type': 'EducationalOrganization', name }));
}

/**
 * Structured data of the only page of the site.
 *
 * It is generated from `src/core/content/profile.ts` rather than written by
 * hand, so what a search engine reads can never drift from what the desktop
 * shows. Optional sections (skills, education) only appear when the content
 * really has them: this file never invents data.
 */
function structuredData(): Record<string, unknown> {
  const person: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${siteUrl}/#person`,
    name: PROFILE.displayName,
    jobTitle: pick(PROFILE.tagline, DEFAULT_LOCALE),
    url: `${siteUrl}/`,
    image: absolute(PROFILE.photoUrl),
    email: `mailto:${emailAddress()}`,
  };

  const [bio] = pick(PROFILE.bio, DEFAULT_LOCALE);
  if (bio) person.description = bio;

  const address = postalAddress();
  if (address) person.address = address;

  const sameAs = sameAsUrls();
  if (sameAs.length > 0) person.sameAs = sameAs;

  const studies = alumniOf();
  if (studies.length > 0) person.alumniOf = studies;

  const skills = PROFILE.skills.flatMap((group) => group.skills);
  if (skills.length > 0) person.knowsAbout = skills.map((skill) => TECHNOLOGIES[skill.technology].name);

  if (PROFILE.languages.length > 0) {
    person.knowsLanguage = PROFILE.languages.map((language) => ({
      '@type': 'Language',
      name: pick(language.name, DEFAULT_LOCALE),
      alternateName: language.code,
    }));
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${siteUrl}/#page`,
    url: `${siteUrl}/`,
    inLanguage: DEFAULT_LOCALE,
    mainEntity: person,
  };
}

const SITE_URL_PLACEHOLDER = '%SITE_URL%';
const STRUCTURED_DATA_PLACEHOLDER = '%STRUCTURED_DATA%';
const STATIC_PROFILE_PLACEHOLDER = '%STATIC_PROFILE%';

/**
 * Replaces the placeholders of `index.html` with real values.
 *
 * The checks are strict on purpose: a literal marker that reaches the built
 * page is visible text to the visitor, and structured data that is silently
 * dropped is worse than a failed build. The structured-data and static
 * profile markers have to appear exactly once, which also stops them from
 * being swallowed by a comment.
 */
function seoPlugin(): Plugin {
  return {
    name: 'nilparra-seo',
    transformIndexHtml: {
      // `post`: by now Vite has already resolved %BASE_URL%.
      order: 'post',
      handler(html) {
        const siteUrlCount = html.split(SITE_URL_PLACEHOLDER).length - 1;
        const dataCount = html.split(STRUCTURED_DATA_PLACEHOLDER).length - 1;
        const profileCount = html.split(STATIC_PROFILE_PLACEHOLDER).length - 1;
        if (siteUrlCount === 0 || dataCount !== 1 || profileCount !== 1) {
          throw new Error(
            `index.html needs at least one ${SITE_URL_PLACEHOLDER} and exactly one ` +
              `${STRUCTURED_DATA_PLACEHOLDER} and ${STATIC_PROFILE_PLACEHOLDER} ` +
              `(found ${siteUrlCount}, ${dataCount} and ${profileCount})`,
          );
        }
        // `<` is escaped so a future content value can never close the script.
        const json = JSON.stringify(structuredData(), null, 2).replace(/</g, '\\u003c');
        const script = `<script type="application/ld+json">${json}</script>`;
        return html
          .replaceAll(SITE_URL_PLACEHOLDER, siteUrl)
          .replaceAll(STRUCTURED_DATA_PLACEHOLDER, script)
          .replaceAll(STATIC_PROFILE_PLACEHOLDER, staticProfileHtml(PROFILE, PROJECTS, DEFAULT_LOCALE));
      },
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), seoPlugin()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    reportCompressedSize: false,
    // The bitmap fonts are under the 4 KiB inline limit, but the CSP of
    // index.html only allows fonts from 'self': inlined as data: URIs they
    // are blocked and the whole desktop falls back to a system font.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/i.test(file) ? false : undefined),
  },
  server: {
    port: 5173,
    open: false,
    // Vite rejects unknown Host headers (DNS-rebinding protection). A
    // Cloudflare quick tunnel serves the dev server under a random
    // `*.trycloudflare.com` host, so the whole suffix is allowed.
    allowedHosts: ['.trycloudflare.com'],
  },
});
