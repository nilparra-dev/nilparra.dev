# Security policy

The site is a static web application. It has no backend, no accounts and no server-side data, so
a vulnerability usually affects only the visitor's own browser. The virtual disk lives in
IndexedDB and only leaves the browser when the visitor exports a file.

## Reporting a vulnerability

Please do not open a public issue. Write to nilparra@nilparra.dev with the details and, when
possible, a minimal reproduction. I read every report and reply as soon as I can. There is no bug
bounty.

## Scope

- The deployed site and this repository.
- The Internet window queries Tavily from the browser; problems with that third-party service are
  out of scope.

Only the current state of `main` is supported. There are no maintained release branches.
