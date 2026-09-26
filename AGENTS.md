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
- Clean up after yourself: any extra git worktree, clone or scratch checkout created for a task
  is removed (`git worktree remove`, then `git worktree prune`) once its branch is merged or
  abandoned. Only the original repository checkout stays on disk.
- Commit messages are written in English and follow conventional commits (`feat:`, `fix:`,
  `docs:`, `test:`, `ci:`, `refactor:`, `chore:`).
- Interface texts live in `src/core/i18n/`. `es.ts` is the source of truth and the catalogues are
  typed, so a missing key fails the build.
- Portfolio content lives in `src/core/content/`. Do not invent content: missing values are
  marked as placeholders on purpose.
- Icons, cursors, patterns and the browser icons (favicon, ICO, SVGs, PWA sizes) are generated
  from `scripts/`. Run `npm run assets` after touching them and commit the regenerated files.
- The canonical domain is written down once, as `VITE_SITE_URL` in `vite.config.ts`, and inlined
  into `index.html` at build time. The route in `wrangler.jsonc`, `public/robots.txt` and
  `public/sitemap.xml` mirror it: change all of them together.
- The site is served by Cloudflare Workers static assets (`wrangler.jsonc`). Response headers live
  in `public/_headers`; its Content-Security-Policy must stay equal to the meta policy of
  `index.html` plus `frame-ancestors`, and `src/csp.test.ts` fails when they drift. The policy
  enforces Trusted Types: never write HTML strings into the DOM, render text through React.
- The structured data and the plain HTML copy inside `#root` are generated from
  `src/core/content/` by the seo plugin, so they can never contradict the desktop. Never
  hand-write JSON-LD or portfolio text into `index.html`. `index.html` must keep exactly one
  `%STRUCTURED_DATA%` and one `%STATIC_PROFILE%` marker and at least one `%SITE_URL%`; the build
  fails without them, because a stray marker would be visible on the page.
- Every push to `main` deploys the site to production (`.github/workflows/deploy.yml`): a merged
  pull request is live a minute later.

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
| `public/` | static assets: icons, wallpapers, logos, the SEO files and `_headers` |
| `wrangler.jsonc` | Cloudflare deployment: assets directory, SPA fallback, domain |
| `docs/architecture.md` | how the runtime fits together |
