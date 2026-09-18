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
- Icons, cursors and patterns are generated from `scripts/`. Run `npm run assets` after touching
  them and commit the regenerated files.
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
| `docs/architecture.md` | how the runtime fits together |
