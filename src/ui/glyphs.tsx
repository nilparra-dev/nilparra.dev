/**
 * Caption buttons, menu marks and arrows, drawn as inline SVG on integer
 * coordinates so they stay pixel crisp at any zoom level.
 */
interface GlyphProps {
  size?: number;
}

function Svg({
  size,
  viewBox,
  children,
}: GlyphProps & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** 6x2 bar of the minimize button. */
export function MinimizeGlyph({ size = 8 }: GlyphProps) {
  return (
    <Svg size={size} viewBox="0 0 8 8">
      <rect x="1" y="5" width="6" height="2" fill="currentColor" />
    </Svg>
  );
}

/** Maximize: a window with a thick title bar. */
export function MaximizeGlyph({ size = 10 }: GlyphProps) {
  return (
    <Svg size={size} viewBox="0 0 10 10">
      <rect x="0" y="0" width="10" height="2" fill="currentColor" />
      <rect x="0" y="0" width="1" height="10" fill="currentColor" />
      <rect x="9" y="0" width="1" height="10" fill="currentColor" />
      <rect x="0" y="9" width="10" height="1" fill="currentColor" />
    </Svg>
  );
}

/** Restore: two stacked windows. */
export function RestoreGlyph({ size = 10 }: GlyphProps) {
  return (
    <Svg size={size} viewBox="0 0 10 10">
      <rect x="0" y="3" width="7" height="1" fill="currentColor" />
      <rect x="0" y="3" width="1" height="6" fill="currentColor" />
      <rect x="6" y="3" width="1" height="7" fill="currentColor" />
      <rect x="0" y="9" width="7" height="1" fill="currentColor" />
      <rect x="3" y="0" width="7" height="2" fill="currentColor" />
      <rect x="3" y="0" width="1" height="4" fill="currentColor" />
      <rect x="9" y="0" width="1" height="7" fill="currentColor" />
      <rect x="3" y="6" width="7" height="1" fill="currentColor" />
    </Svg>
  );
}

/** Close: a 2px X. */
export function CloseGlyph({ size = 9 }: GlyphProps) {
  const pixels: Array<[number, number]> = [];
  for (let i = 0; i < 8; i += 1) {
    pixels.push([i, i], [7 - i, i]);
  }
  return (
    <Svg size={size} viewBox="0 0 8 8">
      {pixels.map(([x, y], index) => (
        <rect key={index} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
    </Svg>
  );
}

/** The "?" of property sheets. */
export function HelpGlyph({ size = 9 }: GlyphProps) {
  const rows = ['.###.', '##.##', '...##', '..##.', '..#..', '.....', '..#..'];
  const pixels: Array<[number, number]> = [];
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '#') pixels.push([x, y]);
    });
  });
  return (
    <Svg size={size} viewBox="0 0 5 7">
      {pixels.map(([x, y], index) => (
        <rect key={index} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
    </Svg>
  );
}

/** Menu check mark. */
export function CheckGlyph({ color = '#000000' }: { color?: string }) {
  const pixels: Array<[number, number]> = [
    [0, 3],
    [1, 4],
    [2, 5],
    [3, 4],
    [4, 3],
    [5, 2],
    [6, 1],
  ];
  return (
    <svg width="7" height="7" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
      {pixels.map(([x, y], index) => (
        <rect key={index} x={x} y={y} width="1" height="1" fill={color} />
      ))}
    </svg>
  );
}

/** Radio bullet. */
export function BulletGlyph({ color = '#000000' }: { color?: string }) {
  return (
    <svg width="5" height="5" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="0" y="0" width="3" height="3" fill={color} />
    </svg>
  );
}

/** Submenu arrow (points right). */
export function SubmenuArrow({ color = 'currentColor' }: { color?: string }) {
  const rows = [1, 2, 3, 4, 3, 2, 1];
  return (
    <svg width="4" height="7" viewBox="0 0 4 7" shapeRendering="crispEdges" aria-hidden="true">
      {rows.map((count, y) => (
        <rect key={y} x="0" y={y} width={count} height="1" fill={color} />
      ))}
    </svg>
  );
}

/** Dropdown arrow of combo boxes and selects. */
export function ComboArrow({ color = 'currentColor' }: { color?: string }) {
  const rows = [7, 5, 3, 1];
  return (
    <svg width="7" height="4" viewBox="0 0 7 4" shapeRendering="crispEdges" aria-hidden="true">
      {rows.map((count, y) => (
        <rect key={y} x={(7 - count) / 2} y={y} width={count} height="1" fill={color} />
      ))}
    </svg>
  );
}

/** Small black triangle used by list headers and the shell status bar. */
export function TriangleDown({ color = 'currentColor' }: { color?: string }) {
  const rows = [7, 5, 3, 1];
  return (
    <svg width="7" height="4" viewBox="0 0 7 4" shapeRendering="crispEdges" aria-hidden="true">
      {rows.map((count, y) => (
        <rect key={y} x={(7 - count) / 2} y={y} width={count} height="1" fill={color} />
      ))}
    </svg>
  );
}
