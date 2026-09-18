# Nil Parra Luna — portfolio as a Windows 95 desktop

My personal website: an interactive Windows 95 desktop that runs entirely in the browser. The
portfolio lives inside the machine as a virtual disk the visitor can browse, with real windows,
menus, applications and files. There is no backend and no emulated CPU — every "program" is a
React application talking to a window manager.

> **Trademark notice.** Windows is a registered trademark of Microsoft Corporation. This is an
> unofficial tribute, not affiliated with Microsoft. The icons, cursors, patterns and sounds
> are original artwork generated from code; the only Microsoft material kept for fidelity is a
> set of classic wallpaper bitmaps, documented in `public/wallpapers/windows95/README.md`.

## What is inside

- A window manager with dragging, resizing, maximise/restore and a session that survives reloads.
- A virtual disk on IndexedDB with folders, a recycle bin, search, import/export and a
  read-only `C:\Portfolio` seeded from the content modules.
- Around twenty applications: Explorer, Notepad, Paint, Minesweeper, a complete Klondike
  Solitaire, No-Limit Texas Hold'em against computer opponents, a media player, a command
  prompt and more.
- An Internet window with real web search: results are listed inside the window and every link
  opens in a real browser tab.
- Spanish, Catalan and English, with translation catalogues checked by the compiler.

## How it is built

- **React 19 + TypeScript + Vite.** The whole desktop is one client-side React tree, and
  `npm run build` produces a plain static folder.
- **The window manager is a pure reducer** (`src/core/window/`): a single state tree for
  position, size, z-order, focus and minimise/restore, persisted to `localStorage`.
- **The file system is a small VFS over IndexedDB** (`src/core/fs/`): text and binary files,
  folders, recycle bin, search by name and content, and import/export of real files.
- **Content is data, not markup** (`src/core/content/`): profile, projects and help are typed
  modules, and the same data seeds `C:\Portfolio` and the About and Projects windows.
- **The artwork is generated from code** (`scripts/`): a small PNG encoder and drawing
  primitives produce the 52 icons, the cursors and the wallpaper patterns. `npm run assets`
  rebuilds them and writes review sheets to compare against period references.
- **The games run on real engines**: Klondike rules and a No-Limit Hold'em engine with hand
  evaluation, blinds, side pots and bot opponents, all in pure TypeScript.
- **i18n is compiler-checked**: `es.ts` is the source of truth and `ca.ts` / `en.ts` are typed
  as complete records, so a missing translation fails the build instead of leaking a key.
- **Nothing leaves the browser** except the queries typed in the Internet window: documents
  live in IndexedDB, preferences in `localStorage`, with no server and no analytics.
- **GitHub Actions runs the checks**: every pull request gets a type check, 152 tests
  (Vitest + Testing Library) and the production build before it can be merged.

## Getting started

Node.js 20 or newer.

```bash
npm install
npm run dev      # development server at http://localhost:5173
npm run build    # type check + static production build in dist/
npm test         # test suite
```

## Project layout

```
scripts/     asset generators: icons, cursors, patterns, PNG encoder
src/core/    window manager, virtual file system, i18n, content, preferences, dialogs
src/ui/      shared Windows 95 control kit (buttons, fields, menus, tabs…)
src/apps/    one folder per application
src/styles/  design tokens and the classic theme
```

## Deployment

`dist/` is fully static and can be hosted anywhere. The repository ships a GitHub Actions
workflow that publishes it to GitHub Pages; while the site is not public yet, it is triggered
by hand (**Actions → Deploy to GitHub Pages → Run workflow**). Set the `BASE_PATH` repository
variable when hosting under a subdirectory or with a custom domain.

`main` is protected: changes land through pull requests (commit messages in English) and the CI
workflow runs the type check, the tests and the build.

## Credits

Code, artwork and sounds by **Nil Parra Luna**, released under the [MIT licence](LICENSE).
The MS Sans Serif look-alike fonts come from [React95](https://github.com/react95-io/React95)
(MIT), and the classic pointer bitmap follows [JS Paint](https://github.com/1j01/jspaint)
(MIT). Style references for everything else are the public Windows 95 documentation and
screenshots.
