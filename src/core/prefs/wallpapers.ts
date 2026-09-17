/**
 * Desktop backgrounds.
 *
 * The patterns are generated tiles of original art (see scripts/art/patterns.mjs)
 * and the solid colours come from the classic scheme. The first entry is the
 * blue pattern of the reference screenshot; the classic teal is offered too.
 */
import type { TranslationKey } from '../i18n/es';

export interface WallpaperOption {
  id: string;
  labelKey: TranslationKey;
  kind: 'pattern' | 'solid';
  /** Colour behind a pattern, or the only colour of a solid background. */
  color: string;
  /** Key inside WALLPAPER_PATTERNS. */
  patternId?: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'blue-rings',
    labelKey: 'wallpaper.blueRings',
    kind: 'pattern',
    patternId: 'blue-rings',
    color: '#00005e',
  },
  {
    id: 'blue-mesh',
    labelKey: 'wallpaper.blueMesh',
    kind: 'pattern',
    patternId: 'blue-mesh',
    color: '#000058',
  },
  {
    id: 'blue-dots',
    labelKey: 'wallpaper.blueDots',
    kind: 'pattern',
    patternId: 'blue-dots',
    color: '#00005e',
  },
  {
    id: 'teal',
    labelKey: 'wallpaper.teal',
    kind: 'solid',
    color: '#008080',
  },
  {
    id: 'navy',
    labelKey: 'wallpaper.navy',
    kind: 'solid',
    color: '#000080',
  },
];

export const DEFAULT_WALLPAPER_ID = 'blue-rings';

export function findWallpaper(id: string): WallpaperOption {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? WALLPAPERS[0];
}
