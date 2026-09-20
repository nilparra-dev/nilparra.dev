# Notes for AI agents

Short brief so an assistant can work on this repository without breaking its conventions.

## Commands

```bash
npm install
npm run dev       # development server at http://localhost:5173
npm run typecheck
npm test
npm run build
```

## Rules

- `main` is protected. Work on a branch, open a pull request and let CI pass before merging.
- Commit messages are written in English and follow conventional commits (`feat:`, `fix:`,
  `docs:`, `test:`, `ci:`, `refactor:`, `chore:`).
- Interface texts live in `src/core/i18n/`. `es.ts` is the source of truth and the catalogues are
  typed, so a missing key fails the build.
- Portfolio content lives in `src/core/content/`. Do not invent content: missing values are
  marked as placeholders on purpose.
- Icons, cursors, patterns and the browser icons (favicon, ICO, SVGs, PWA sizes) are generated
  from `scripts/`. Run `npm run assets` after touching them and commit the regenerated files.
- The canonical domain is written down once, as `VITE_SITE_URL` in `vite.config.ts`, and inlined
  into `index.html` at build time. `public/CNAME`, `public/robots.txt` and `public/sitemap.xml`
  mirror it: change all of them together.
- The structured data of the landing page is generated from `src/core/content/profile.ts` by the
  seo plugin, so it can never contradict the desktop. Never hand-write JSON-LD into `index.html`.
  `index.html` must keep one `%STRUCTURED_DATA%` marker and at least one `%SITE_URL%`; the build
  fails without them, because a stray marker would be visible on the page.
- The Pages workflow is manual on purpose while the site is not public. Do not wire it back to
  `push` without being asked.

## Map

| Path | What |
| --- | --- |
| `src/core/window/` | window manager reducer and layout |
| `src/core/fs/` | virtual disk on IndexedDB |
| `src/core/apps/` | application catalogue and launcher |
| `src/core/content/` | profile, projects, help |
| `src/apps/` | one folder per application |
| `src/ui/` | shared Windows 95 controls |
| `scripts/` | generated artwork |
| `public/` | static assets: icons, wallpapers, logos and the SEO files |
| `docs/architecture.md` | how the runtime fits together |
