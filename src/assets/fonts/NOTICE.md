# MS Sans Serif provenance and licence

The bundled WOFF2 files are generated from the MS Sans Serif files shipped in
`react95@4.0.0`:

- Source: `react95/dist/fonts/ms_sans_serif.woff2` and
  `ms_sans_serif_bold.woff2`
- Package: https://www.npmjs.com/package/react95
- Repository and package licence: https://github.com/react95-io/React95
  (MIT, copyright Artur Bień)

The WOFF2 name tables identify the font data as `Copyright lou 2017` and
Creative Commons Attribution-ShareAlike 3.0. The generated files preserve that
metadata. The licence text is available at
https://creativecommons.org/licenses/by-sa/3.0/legalcode.txt.

This repository adapts the font data by restoring Windows 95 advance metrics,
adding Latin-1 and symbol glyphs, and deriving the bold face. Those changes are
covered by the attribution and licence above. The source files under
`scripts/font/react95/` retain their original metadata.
