import { ICON_URLS, ICON_URLS_16, SMALL_ICON_URLS, type IconId } from '../assets/generated/icons';

export interface IconProps {
  id: IconId;
  size?: number;
  alt?: string;
  className?: string;
  /** Draw the small arrow used by shell shortcuts without changing the node name. */
  shortcut?: boolean;
}

/** Pixel art image with nearest-neighbour scaling. */
export function Icon({ id, size = 32, alt = '', className, shortcut = false }: IconProps) {
  const source = size <= 16 ? ICON_URLS_16[id] : ICON_URLS[id];
  const image = (
    <img
      className={className ? `pixel icon-art ${className}` : 'pixel icon-art'}
      src={source}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
    />
  );

  if (!shortcut) return image;

  return (
    <span
      className={className ? `icon-with-shortcut ${className}` : 'icon-with-shortcut'}
      style={{ width: size, height: size }}
    >
      {image}
      <img
        className="pixel icon-shortcut-overlay"
        src={SMALL_ICON_URLS.shortcut}
        width={Math.max(8, Math.round(size * 0.5))}
        height={Math.max(8, Math.round(size * 0.5))}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </span>
  );
}
