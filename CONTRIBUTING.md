# Contributing

This is my personal portfolio, but the workflow is the one I would use in any project, so issues
and pull requests are welcome.

## Before you start

- Node.js 20 or newer.
- `npm install`, then `npm run dev` to get the desktop at http://localhost:5173.

## Workflow

`main` is protected: direct pushes are rejected. Every change goes through a pull request that
runs the checks in `.github/workflows/ci.yml` (type check, tests and production build).

```bash
git switch -c fix/broken-clock
git commit -m "fix: keep the clock in sync after a restart"
git push -u origin fix/broken-clock
gh pr create --fill
```

## Commit messages

English, imperative mood, conventional commits. The types I use:

| Type | For |
| --- | --- |
| `feat` | a new application, window feature or capability |
| `fix` | a bug in the shell or in an application |
| `docs` | README, comments, help topics |
| `test` | new or corrected tests |
| `ci` | workflows and repository automation |
| `refactor` | internal changes with no visible effect |
| `chore` | dependencies, tooling, housekeeping |

Keep the subject lowercase and without a trailing period, as in
`fix: keep the clock in sync after a restart`.

## Before opening the pull request

```bash
npm run typecheck
npm test
npm run build
```

The three commands must pass. If the change is visible, add a screenshot or a short clip to the
pull request.

## Editing the portfolio

The texts live in `src/core/content/` (profile, projects, help). Updating them does not require
touching the desktop logic. Placeholders are deliberate: the interface marks missing values
instead of inventing content, so leave the markers until the real data exists.
