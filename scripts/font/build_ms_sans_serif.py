#!/usr/bin/env python3
"""
Rebuilds the MS Sans Serif web fonts from the React95 port.

The React95 files draw every glyph exactly like the 8 pt bitmap of Windows 95
(an 11 px grid), but 27 advance widths are off by a pixel (the space is 2 px
instead of 3, most capitals are one pixel too narrow or too wide) and the
Latin-1 letters Spanish and Catalan need are missing, so the browser borrowed
them from another typeface. This script:

1. rasterises each React95 glyph back to its pixel grid,
2. places it with the advance width and left bearing Windows 95 used (the
   METRICS table: numbers only, measured on the 8 pt font at 96 dpi),
3. composes the missing accented letters from those grids plus accents drawn
   here, and draws the few symbols the site needs,
4. writes the regular font, and derives the bold one the way Windows 95 did:
   every pixel doubled one column to the right and the advance one pixel wider.

Requirements: Python 3.9+, `pip install -r scripts/font/requirements.txt`.
Run from the repository root: `python scripts/font/build_ms_sans_serif.py`.
Use `--check` to verify deterministic output against the committed WOFF2 files.
The output is committed; the site build does not run this script.
"""
from __future__ import annotations

import argparse
import hashlib
import tempfile
from pathlib import Path

from fontTools.agl import UV2AGL
from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.ttProgram import Program

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'scripts' / 'font' / 'react95'
OUTPUT = ROOT / 'src' / 'assets' / 'fonts'

UPEM = 2048
GRID = 11          # the font is drawn on an 11 px em
ROWS = 13          # cell height: rows 0..10 above the baseline, 11..12 below
BASELINE_ROW = 10  # lowest row that sits on the baseline
X_HEIGHT_TOP = 5   # first row of a lowercase letter such as "a"
FONT_TIMESTAMP = 3670413448  # fixed OpenType timestamp for reproducible output

Pixels = set  # of (column, row); row 0 is the top of the cell

# Advance width and left ink column of each character in the Windows 95 8 pt
# font, in pixels.
METRICS = {
    0x0020: (3, 0), 0x0021: (3, 1), 0x0022: (5, 1), 0x0023: (7, 1), 0x0024: (6, 1), 0x0025: (8, 1),
    0x0026: (6, 1), 0x0027: (2, 1), 0x0028: (3, 1), 0x0029: (3, 1), 0x002a: (4, 1), 0x002b: (6, 1),
    0x002c: (3, 1), 0x002d: (3, 1), 0x002e: (3, 1), 0x002f: (5, 1), 0x0030: (6, 1), 0x0031: (6, 1),
    0x0032: (6, 1), 0x0033: (6, 1), 0x0034: (6, 1), 0x0035: (6, 1), 0x0036: (6, 1), 0x0037: (6, 1),
    0x0038: (6, 1), 0x0039: (6, 1), 0x003a: (3, 1), 0x003b: (3, 1), 0x003c: (6, 1), 0x003d: (6, 1),
    0x003e: (6, 1), 0x003f: (6, 1), 0x0040: (11, 1), 0x0041: (7, 0), 0x0042: (7, 1), 0x0043: (7, 1),
    0x0044: (8, 1), 0x0045: (7, 1), 0x0046: (6, 1), 0x0047: (8, 1), 0x0048: (8, 1), 0x0049: (3, 1),
    0x004a: (5, 0), 0x004b: (7, 1), 0x004c: (6, 1), 0x004d: (9, 1), 0x004e: (8, 1), 0x004f: (8, 1),
    0x0050: (7, 1), 0x0051: (8, 1), 0x0052: (8, 1), 0x0053: (7, 1), 0x0054: (7, 1), 0x0055: (8, 1),
    0x0056: (7, 0), 0x0057: (11, 0), 0x0058: (7, 0), 0x0059: (7, 0), 0x005a: (7, 0), 0x005b: (3, 1),
    0x005c: (5, 1), 0x005d: (3, 1), 0x005e: (6, 1), 0x005f: (6, 0), 0x0060: (3, 1), 0x0061: (6, 1),
    0x0062: (6, 1), 0x0063: (6, 1), 0x0064: (6, 1), 0x0065: (6, 1), 0x0066: (3, 1), 0x0067: (6, 1),
    0x0068: (6, 1), 0x0069: (2, 1), 0x006a: (2, 1), 0x006b: (6, 1), 0x006c: (2, 1), 0x006d: (8, 1),
    0x006e: (6, 1), 0x006f: (6, 1), 0x0070: (6, 1), 0x0071: (6, 1), 0x0072: (3, 1), 0x0073: (5, 1),
    0x0074: (3, 1), 0x0075: (6, 1), 0x0076: (6, 1), 0x0077: (8, 1), 0x0078: (5, 1), 0x0079: (5, 0),
    0x007a: (5, 1), 0x007b: (4, 1), 0x007c: (2, 1), 0x007d: (4, 1), 0x007e: (7, 1),
    0x00a0: (3, 0), 0x00a1: (3, 1), 0x00a2: (6, 1), 0x00a3: (6, 1), 0x00a4: (6, 1), 0x00a5: (6, 1),
    0x00a6: (2, 1), 0x00a7: (6, 1), 0x00a8: (3, 0), 0x00a9: (9, 1), 0x00aa: (4, 1), 0x00ab: (6, 1),
    0x00ac: (6, 1), 0x00ad: (3, 1), 0x00ae: (8, 1), 0x00af: (6, 0), 0x00b0: (4, 1), 0x00b1: (6, 1),
    0x00b2: (3, 0), 0x00b3: (3, 0), 0x00b4: (3, 1), 0x00b5: (6, 1), 0x00b6: (6, 1), 0x00b7: (3, 1),
    0x00b8: (3, 1), 0x00b9: (3, 1), 0x00ba: (4, 1), 0x00bb: (6, 1), 0x00bc: (8, 1), 0x00bd: (8, 1),
    0x00be: (8, 1), 0x00bf: (6, 1), 0x00c0: (7, 0), 0x00c1: (7, 0), 0x00c2: (7, 0), 0x00c3: (7, 0),
    0x00c4: (7, 0), 0x00c5: (7, 0), 0x00c6: (10, 0), 0x00c7: (7, 1), 0x00c8: (7, 1), 0x00c9: (7, 1),
    0x00ca: (7, 1), 0x00cb: (7, 1), 0x00cc: (3, 0), 0x00cd: (3, 1), 0x00ce: (3, 0), 0x00cf: (3, 0),
    0x00d0: (8, 0), 0x00d1: (8, 1), 0x00d2: (8, 1), 0x00d3: (8, 1), 0x00d4: (8, 1), 0x00d5: (8, 1),
    0x00d6: (8, 1), 0x00d7: (6, 1), 0x00d8: (8, 1), 0x00d9: (8, 1), 0x00da: (8, 1), 0x00db: (8, 1),
    0x00dc: (8, 1), 0x00dd: (7, 0), 0x00de: (7, 1), 0x00df: (6, 1), 0x00e0: (6, 1), 0x00e1: (6, 1),
    0x00e2: (6, 1), 0x00e3: (6, 1), 0x00e4: (6, 1), 0x00e5: (6, 1), 0x00e6: (10, 1), 0x00e7: (6, 1),
    0x00e8: (6, 1), 0x00e9: (6, 1), 0x00ea: (6, 1), 0x00eb: (6, 1), 0x00ec: (2, 0), 0x00ed: (4, 2),
    0x00ee: (4, 1), 0x00ef: (4, 1), 0x00f0: (6, 1), 0x00f1: (6, 1), 0x00f2: (6, 1), 0x00f3: (6, 1),
    0x00f4: (6, 1), 0x00f5: (6, 1), 0x00f6: (6, 1), 0x00f7: (6, 1), 0x00f8: (6, 1), 0x00f9: (6, 1),
    0x00fa: (6, 1), 0x00fb: (6, 1), 0x00fc: (6, 1), 0x00fd: (5, 0), 0x00fe: (6, 1), 0x00ff: (5, 0),
}

# Accented letters: character -> (base letter, accent).
ACCENTED = {
    'À': ('A', 'grave'), 'Á': ('A', 'acute'), 'Â': ('A', 'circumflex'), 'Ã': ('A', 'tilde'), 'Ä': ('A', 'diaeresis'),
    'Ç': ('C', 'cedilla'),
    'È': ('E', 'grave'), 'É': ('E', 'acute'), 'Ê': ('E', 'circumflex'), 'Ë': ('E', 'diaeresis'),
    'Ì': ('I', 'grave'), 'Í': ('I', 'acute'), 'Î': ('I', 'circumflex'), 'Ï': ('I', 'diaeresis'),
    'Ñ': ('N', 'tilde'),
    'Ò': ('O', 'grave'), 'Ó': ('O', 'acute'), 'Ô': ('O', 'circumflex'), 'Õ': ('O', 'tilde'), 'Ö': ('O', 'diaeresis'),
    'Ù': ('U', 'grave'), 'Ú': ('U', 'acute'), 'Û': ('U', 'circumflex'), 'Ü': ('U', 'diaeresis'),
    'Ý': ('Y', 'acute'),
    'à': ('a', 'grave'), 'á': ('a', 'acute'), 'â': ('a', 'circumflex'), 'ã': ('a', 'tilde'), 'ä': ('a', 'diaeresis'),
    'ç': ('c', 'cedilla'),
    'è': ('e', 'grave'), 'é': ('e', 'acute'), 'ê': ('e', 'circumflex'), 'ë': ('e', 'diaeresis'),
    'ì': ('ı', 'grave'), 'í': ('ı', 'acute'), 'î': ('ı', 'circumflex'), 'ï': ('ı', 'diaeresis'),
    'ñ': ('n', 'tilde'),
    'ò': ('o', 'grave'), 'ó': ('o', 'acute'), 'ô': ('o', 'circumflex'), 'õ': ('o', 'tilde'), 'ö': ('o', 'diaeresis'),
    'ù': ('u', 'grave'), 'ú': ('u', 'acute'), 'û': ('u', 'circumflex'), 'ü': ('u', 'diaeresis'),
    'ý': ('y', 'acute'), 'ÿ': ('y', 'diaeresis'),
}

# Symbols drawn from scratch, including four ASCII characters the React95
# port lacks: character -> (advance, {row: pattern}).
# Patterns start at column 0 and are placed at the left bearing in METRICS.
DRAWN = {
    '<': (6, {4: '...#', 5: '..#.', 6: '.#..', 7: '#...', 8: '.#..', 9: '..#.', 10: '...#'}),
    '>': (6, {4: '#...', 5: '.#..', 6: '..#.', 7: '...#', 8: '..#.', 9: '.#..', 10: '#...'}),
    '`': (3, {2: '#.', 3: '.#'}),
    '|': (2, {row: '#' for row in range(2, 13)}),
    '«': (6, {6: '.#.#', 7: '#.#.', 8: '.#.#'}),
    '»': (6, {6: '#.#.', 7: '.#.#', 8: '#.#.'}),
    '·': (3, {7: '#'}),
    'º': (4, {2: '.#.', 3: '#.#', 4: '.#.', 6: '###'}),
    'ª': (4, {2: '.##', 3: '#.#', 4: '.##', 6: '###'}),
    '±': (6, {4: '..#..', 5: '..#..', 6: '#####', 7: '..#..', 8: '..#..', 10: '#####'}),
    '×': (6, {5: '#...#', 6: '.#.#.', 7: '..#..', 8: '.#.#.', 9: '#...#'}),
    '÷': (6, {5: '..#..', 7: '#####', 9: '..#..'}),
    '−': (6, {7: '#####'}),
    '•': (5, {6: '.#.', 7: '###', 8: '.#.'}),
    '…': (7, {10: '#.#.#'}),
}

# Characters Windows 95 did not have in this font, drawn like the ones it did.
# The port's curly quotes sat on the first column and touched the previous
# letter ("d’ASIX"); the straight quotes carry the original spacing.
ALIASES = {'‘': "'", '’': "'", '“': '"', '”': '"'}

# Left bearing for drawn symbols the METRICS table does not cover.
DRAWN_LEFT = {'º': 1, 'ª': 1, '−': 1, '•': 1, '…': 1}


def to_units(pixels: float) -> int:
    return round(pixels * UPEM / GRID)


def rasterise(font: TTFont, glyph_name: str) -> Pixels:
    """Samples every pixel centre of the cell; the outlines are pixel squares."""
    glyph_set = font.getGlyphSet()
    advance = round(font['hmtx'][glyph_name][0] * GRID / UPEM)
    pixels = set()
    for row in range(ROWS):
        y = (BASELINE_ROW - row + 0.5) * UPEM / GRID
        for column in range(-4, advance + 4):
            pen = PointInsidePen(glyph_set, ((column + 0.5) * UPEM / GRID, y))
            glyph_set[glyph_name].draw(pen)
            if pen.getResult():
                pixels.add((column, row))
    return pixels


def shift(pixels: Pixels, dx: int = 0, dy: int = 0) -> Pixels:
    return {(x + dx, y + dy) for x, y in pixels}


def left_of(pixels: Pixels) -> int:
    return min(x for x, _ in pixels)


def place(pixels: Pixels, left: int) -> Pixels:
    return shift(pixels, left - left_of(pixels)) if pixels else pixels


def pattern(rows: dict[int, str]) -> Pixels:
    return {(x, row) for row, text in rows.items() for x, cell in enumerate(text) if cell == '#'}


def accent(name: str, base: Pixels, capital: bool) -> Pixels:
    """Accent pixels over (or under) a base letter, centred on its ink."""
    xs = [x for x, _ in base]
    low, high = min(xs), max(xs)
    odd = (high - low) % 2 == 0          # odd ink width: a single centre column
    centre = (low + high) // 2
    top, bottom = (0, 1) if capital else (2, 3)
    if name == 'acute':
        return {(centre + 1, top), (centre, bottom)}
    if name == 'grave':
        return {(centre - 1, top), (centre, bottom)} if odd else {(centre, top), (centre + 1, bottom)}
    if name == 'circumflex':
        if odd:
            return {(centre, top), (centre - 1, bottom), (centre + 1, bottom)}
        return {(centre, top), (centre + 1, top), (centre - 1, bottom), (centre + 2, bottom)}
    if name == 'diaeresis':
        return {(centre - 1, bottom), (centre + 1 if odd else centre + 2, bottom)}
    if name == 'tilde':
        return {(centre, top), (centre + 2, top), (centre - 1, bottom), (centre + 1, bottom)}
    if name == 'cedilla':
        return {(centre, BASELINE_ROW + 1), (centre - 1, BASELINE_ROW + 2), (centre, BASELINE_ROW + 2)}
    raise ValueError(name)


def rotate(pixels: Pixels, drop: int) -> Pixels:
    """Turns a glyph upside down (for ¿ and ¡) and lowers it by `drop` rows."""
    low, high = min(x for x, _ in pixels), max(x for x, _ in pixels)
    return {(low + high - x, ROWS - 1 - y + drop) for x, y in pixels}


def build_regular(font: TTFont) -> dict[int, tuple[int, Pixels]]:
    cmap = font.getBestCmap()
    glyphs: dict[int, tuple[int, Pixels]] = {}

    for code, name in cmap.items():
        pixels = rasterise(font, name)
        advance = round(font['hmtx'][name][0] * GRID / UPEM)
        if code in METRICS:
            advance, left = METRICS[code]
            if code == ord('_'):
                pixels = shift(pixels, dy=1)   # Windows 95 draws it on the bottom row
            pixels = place(pixels, left)
        glyphs[code] = (advance, pixels)

    def base(char: str) -> Pixels:
        if char == 'ı':  # dotless i: the stem of "i" without its dot
            return {(x, y) for x, y in glyphs[ord('i')][1] if y >= X_HEIGHT_TOP}
        return glyphs[ord(char)][1]

    for char, (base_char, accent_name) in ACCENTED.items():
        code = ord(char)
        if code in glyphs:
            continue
        letter = base(base_char)
        pixels = letter | accent(accent_name, letter, base_char.isupper())
        advance, left = METRICS[code]
        glyphs[code] = (advance, place(pixels, left))

    for char, source in (('¿', '?'), ('¡', '!')):
        advance, left = METRICS[ord(char)]
        glyphs[ord(char)] = (advance, place(rotate(glyphs[ord(source)][1], drop=2), left))

    for char, source in ALIASES.items():
        glyphs[ord(char)] = glyphs[ord(source)]

    for char, (advance, rows) in DRAWN.items():
        code = ord(char)
        if code in glyphs:
            continue
        left = METRICS[code][1] if code in METRICS else DRAWN_LEFT[char]
        glyphs[code] = (advance, shift(pattern(rows), left))

    return glyphs


def embolden(glyphs: dict[int, tuple[int, Pixels]]) -> dict[int, tuple[int, Pixels]]:
    """Windows 95 bold: every pixel repeated one column to the right."""
    return {code: (advance + 1, pixels | shift(pixels, 1))
            for code, (advance, pixels) in glyphs.items()}


def outline(pixels: Pixels):
    """TrueType glyph made of one clockwise rectangle per horizontal run."""
    pen = TTGlyphPen(None)
    for row in sorted({y for _, y in pixels}):
        columns = sorted(x for x, y in pixels if y == row)
        start = previous = columns[0]
        for x in columns[1:] + [None]:
            if x is not None and x == previous + 1:
                previous = x
                continue
            bottom, top = to_units(BASELINE_ROW - row), to_units(BASELINE_ROW - row + 1)
            left, right = to_units(start), to_units(previous + 1)
            pen.moveTo((left, bottom))
            pen.lineTo((left, top))
            pen.lineTo((right, top))
            pen.lineTo((right, bottom))
            pen.closePath()
            if x is not None:
                start = previous = x
    return pen.glyph()


def write(template: TTFont, glyphs: dict[int, tuple[int, Pixels]], path: Path, naming: TTFont) -> None:
    font = template
    # Hinting and glyph classes were written for the old outlines.
    for tag in ('fpgm', 'prep', 'cvt ', 'GDEF', 'hdmx', 'LTSH', 'VDMX'):
        if tag in font:
            del font[tag]

    cmap = font.getBestCmap()
    order = font.getGlyphOrder()
    names = {}
    for code in sorted(glyphs):
        name = cmap.get(code) or UV2AGL.get(code) or f'uni{code:04X}'
        if name not in order:
            order.append(name)
        names[code] = name
    font.setGlyphOrder(order)

    glyf, hmtx = font['glyf'], font['hmtx']
    for code, (advance, pixels) in glyphs.items():
        name = names[code]
        if pixels:
            glyph = outline(pixels)
            glyph.recalcBounds(glyf)
            lsb = glyph.xMin
        else:
            glyph = TTGlyphPen(None).glyph()
            lsb = 0
        glyf[name] = glyph
        hmtx[name] = (to_units(advance), lsb)
    for name in order:  # glyphs outside the character map keep their outline
        if name in glyf and hasattr(glyf[name], 'program'):
            empty = Program()
            empty.fromBytecode(b'')
            glyf[name].program = empty

    for table in font['cmap'].tables:
        if table.isUnicode():
            for code, name in names.items():
                if code <= 0xFFFF or table.format in (12, 13):
                    table.cmap[code] = name

    # Windows 95 metrics: 11 px above the baseline and 2 below, a 13 px line,
    # plus a fifth of a pixel on each side. The ink reaches both edges (the
    # accents on capitals, the tails of g, j, p, q, y), so without that margin
    # labels that clip their overflow lose a row when the zoom rounds.
    ascent = to_units(BASELINE_ROW + 1 + 0.2)
    descent = to_units(ROWS - BASELINE_ROW - 1 + 0.2)
    font['hhea'].ascent, font['hhea'].descent, font['hhea'].lineGap = ascent, -descent, 0
    os2 = font['OS/2']
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = ascent, -descent, 0
    os2.usWinAscent, os2.usWinDescent = ascent, descent

    if naming is not font:
        font['name'] = naming['name']
        font['name'].setName('Bold', 2, 3, 1, 0x409)
        font['name'].setName('MS Sans Serif Bold', 4, 3, 1, 0x409)
        os2.usWeightClass = 700
        os2.fsSelection = (os2.fsSelection & ~0x40) | 0x20
        font['head'].macStyle = (font['head'].macStyle & ~0x01) | 0x01
    else:
        os2.usWeightClass = 400
        os2.fsSelection = (os2.fsSelection & ~0x20) | 0x40
        font['head'].macStyle &= ~0x01
    font['head'].created = FONT_TIMESTAMP
    font['head'].modified = FONT_TIMESTAMP

    font.flavor = 'woff2'
    font.save(path)


def validate(output: Path) -> None:
    regular = TTFont(output / 'ms_sans_serif.woff2')
    bold = TTFont(output / 'ms_sans_serif_bold.woff2')
    regular_name = {(entry.nameID, entry.toUnicode()) for entry in regular['name'].names}
    if (13, 'Creative Commons Attribution Share Alike') not in regular_name:
        raise ValueError('The regular font lost its CC BY-SA 3.0 metadata')
    if (14, 'http://creativecommons.org/licenses/by-sa/3.0/') not in regular_name:
        raise ValueError('The regular font lost its CC BY-SA 3.0 licence URL')
    for font in (regular, bold):
        if font['head'].created != FONT_TIMESTAMP or font['head'].modified != FONT_TIMESTAMP:
            raise ValueError('Font timestamps are not fixed')
    if regular['OS/2'].usWeightClass != 400 or bold['OS/2'].usWeightClass != 700:
        raise ValueError('Font weight metadata is incorrect')
    if bold['OS/2'].fsSelection != 0x20 or bold['head'].macStyle != 1:
        raise ValueError('Bold font selection metadata is incorrect')
    for code, expected in ((0x00AA, 4), (0x00BA, 4)):
        name = regular.getBestCmap()[code]
        if regular['hmtx'][name][0] != to_units(expected):
            raise ValueError(f'Unexpected advance width for U+{code:04X}')
        name = bold.getBestCmap()[code]
        if bold['hmtx'][name][0] != to_units(expected + 1):
            raise ValueError(f'Unexpected bold advance width for U+{code:04X}')


def build(output: Path) -> None:
    regular_source = TTFont(SOURCE / 'ms_sans_serif.woff2', recalcTimestamp=False)
    bold_source = TTFont(SOURCE / 'ms_sans_serif_bold.woff2', recalcTimestamp=False)
    glyphs = build_regular(regular_source)
    write(regular_source, glyphs, output / 'ms_sans_serif.woff2', regular_source)
    write(
        TTFont(SOURCE / 'ms_sans_serif.woff2', recalcTimestamp=False),
        embolden(glyphs),
        output / 'ms_sans_serif_bold.woff2',
        bold_source,
    )
    validate(output)
    print(f'{len(glyphs)} glyphs written to {output.relative_to(ROOT) if output.is_relative_to(ROOT) else output}')


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check() -> None:
    with tempfile.TemporaryDirectory(prefix='ms-sans-serif-') as temporary:
        generated = Path(temporary)
        build(generated)
        first = {path.name: sha256(path) for path in generated.glob('*.woff2')}
        build(generated)
        second = {path.name: sha256(path) for path in generated.glob('*.woff2')}
        committed = {path.name: sha256(path) for path in OUTPUT.glob('*.woff2')}
        if first != second or first != committed:
            raise SystemExit('Generated fonts are not reproducible or do not match the committed files')
    print('Font output is reproducible and matches the committed files')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='verify reproducibility without changing the output')
    args = parser.parse_args()
    if args.check:
        check()
    else:
        build(OUTPUT)


if __name__ == '__main__':
    main()
