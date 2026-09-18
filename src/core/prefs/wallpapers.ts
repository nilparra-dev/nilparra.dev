/**
 * Desktop backgrounds.
 *
 * Original bitmap provenance is recorded in public/wallpapers/windows95/README.md.
 * Legacy generated patterns remain available for saved preferences.
 * Windows Standard's solid teal is the default.
 */
import type { CSSProperties } from 'react';
import type { TranslationKey } from '../i18n/es';
import { patternBackground } from '../../theme/patterns.generated';

interface GeneratedWallpaper {
  id: string;
  labelKey: TranslationKey;
  kind: 'pattern' | 'solid';
  /** Colour behind a pattern, or the only colour of a solid background. */
  color: string;
  /** Key inside WALLPAPER_PATTERNS. */
  patternId?: string;
}

interface OriginalWallpaper {
  id: string;
  kind: 'bitmap';
  name: string;
  color: string;
  url: string;
  placement: 'tile' | 'center';
}

export type WallpaperOption = GeneratedWallpaper | OriginalWallpaper;

const ORIGINAL_NAMES = [
  'Black Thatch', 'Blue Rivets', 'Bubbles', 'Carved Stone', 'Circles',
  'Clouds', 'Forest', 'Gold Weave', 'Houndstooth', 'Metal Links',
  'Pinstripe', 'Red Blocks', 'Sandstone', 'Stitches', 'Straw Mat',
  'Tiles', 'Triangles', 'Waves',
];

const ORIGINAL_WALLPAPERS = ORIGINAL_NAMES.map((name): OriginalWallpaper => ({
  id: `win95-${name.toLowerCase().replaceAll(' ', '-')}`,
  kind: 'bitmap',
  name,
  color: '#008080',
  url: `${import.meta.env.BASE_URL}wallpapers/windows95/${encodeURIComponent(name)}.bmp`,
  placement: name === 'Clouds' ? 'center' : 'tile',
}));

const CLASSIC_WALLPAPER: WallpaperOption = {
  id: 'teal',
  labelKey: 'wallpaper.teal',
  kind: 'solid',
  color: '#008080',
};

export const WALLPAPERS: WallpaperOption[] = [
  CLASSIC_WALLPAPER,
  ...ORIGINAL_WALLPAPERS,
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
    id: 'navy',
    labelKey: 'wallpaper.navy',
    kind: 'solid',
    color: '#000080',
  },
];

export const DEFAULT_WALLPAPER_ID = 'teal';

export function findWallpaper(id: string): WallpaperOption {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? CLASSIC_WALLPAPER;
}

/** Shared rendering keeps the settings preview consistent with the desktop. */
export function wallpaperStyle(wallpaper: WallpaperOption, preview = false): CSSProperties {
  if (wallpaper.kind === 'bitmap') {
    return {
      backgroundColor: wallpaper.color,
      backgroundImage: `url("${wallpaper.url}")`,
      backgroundRepeat: wallpaper.placement === 'tile' ? 'repeat' : 'no-repeat',
      backgroundPosition: wallpaper.placement === 'tile' ? 'left top' : 'center',
      backgroundSize: preview && wallpaper.placement === 'center' ? 'contain' : 'auto',
    };
  }
  return {
    backgroundColor: wallpaper.color,
    backgroundImage: wallpaper.kind === 'pattern' ? patternBackground(wallpaper.patternId ?? wallpaper.id) : 'none',
    backgroundRepeat: 'repeat',
    backgroundPosition: 'left top',
    backgroundSize: 'auto',
  };
}
