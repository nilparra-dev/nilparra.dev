# Security policy

The site is a static web application. It has no backend, no accounts, no cookies and no
server-side data, so a vulnerability usually affects only the visitor's own browser. The virtual
disk lives in the browser's IndexedDB and only leaves the browser when the visitor exports a file.

## Controls shipped with the site

- **Content-Security-Policy** (`public/_headers`, response header, mirrored as a meta element in
  `index.html`): scripts only from the site itself, no inline scripts, `object-src 'none'`,
  `frame-ancestors 'none'`, connections limited to the site and the Tavily search endpoint.
- **Security headers** (`public/_headers`): HSTS with preload, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Cross-Origin-Opener-Policy` and a
  restrictive `Permissions-Policy`.
- **Sandboxed frames**: every `<iframe>` is sandboxed. The Internet window allows only
  scripts, same-origin access and forms in the framed third-party site; popups and top-level
  navigation remain blocked. The PDF viewer of the virtual disk runs fully sandboxed because its
  `blob:` URL shares the site's origin.
- **Clickjacking guard** (`src/main.tsx`): on top of the headers, the app breaks out of a frame or
  hides itself while framed, which also covers hosts that do not send them.
- **Defensive persistence**: every record read back from IndexedDB and every value read back from
  `localStorage` is revalidated against the current schema; malformed or tampered records are
  dropped instead of executed.
- **Pinned CI actions**: every GitHub Action is pinned by commit SHA, not by a mutable tag.
- **No secrets in the site**: there is nothing to leak. Search is keyless. The only credential is
  the deploy token, kept in the `production` environment of the repository and limited to editing
  Workers on one account and one zone; the workflow itself only has `contents: read`.

## Reporting a vulnerability

Please do not open a public issue. Report it privately from the repository's **Security** tab
(**Report a vulnerability**), or write to nil@nilparra.dev, with the details and, when possible,
a minimal reproduction. I read every report and reply as soon as I can. There is no bug
bounty.

## Scope

- The deployed site (https://nilparra.dev/) and this repository.
- The Internet window queries Tavily from the browser; problems with that third-party service are
  out of scope.
- Client-side storage (IndexedDB, localStorage) is same-origin by definition: an attacker needs
  script execution on the site first, which is what the controls above prevent. Reports of
  "anyone can edit their own browser storage" are out of scope unless they lead to execution.

Only the current state of `main` is supported. There are no maintained release branches.
