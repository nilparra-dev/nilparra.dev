import { ICON_URLS, type IconId } from '../assets/generated/icons';

export interface IconProps {
  id: IconId;
  size?: number;
  alt?: string;
  className?: string;
}

/** Pixel art image with nearest-neighbour scaling. */
export function Icon({ id, size = 32, alt = '', className }: IconProps) {
  return (
    <img
      className={className ? `pixel ${className}` : 'pixel'}
      src={ICON_URLS[id]}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
    />
  );
}
