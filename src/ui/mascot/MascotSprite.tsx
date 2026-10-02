import { useEffect, useState, type CSSProperties } from 'react';
import { MASCOT_CELLS, MASCOT_SHEET, type MascotTray } from '../../assets/generated/mascot';
import { resolveFace, type Face } from './face';

/** Crops one cell of the sprite sheet, drawn `scale` times its size. */
function cellStyle(cell: number, scale: number): CSSProperties {
  const size = MASCOT_SHEET.cell * scale;
  const column = cell % MASCOT_SHEET.columns;
  const row = Math.floor(cell / MASCOT_SHEET.columns);
  return {
    backgroundImage: `url("${MASCOT_SHEET.url}")`,
    backgroundSize: `${MASCOT_SHEET.columns * size}px ${MASCOT_SHEET.rows * size}px`,
    backgroundPosition: `${-column * size}px ${-row * size}px`,
  };
}

export interface MascotSpriteProps {
  face: Face;
  /** Whole number of screen pixels per sprite pixel, so the art stays crisp. */
  scale?: number;
}

/** The portrait: head, eyes, mouth and overlay stacked from the sprite sheet. */
export function MascotSprite({ face, scale = 2 }: MascotSpriteProps) {
  const size = MASCOT_SHEET.cell * scale;
  return (
    <span className="mascot-sprite" style={{ width: size, height: size }} aria-hidden="true">
      <span className="mascot-layer" style={cellStyle(MASCOT_CELLS.base.base, scale)} />
      <span className="mascot-layer" style={cellStyle(MASCOT_CELLS.eyes[face.eyes], scale)} />
      <span className="mascot-layer" style={cellStyle(MASCOT_CELLS.mouth[face.mouth], scale)} />
      {face.overlay && (
        <span className="mascot-layer" style={cellStyle(MASCOT_CELLS.overlay[face.overlay], scale)} />
      )}
    </span>
  );
}

/** The small head for the taskbar tray, at the size of the other tray glyphs. */
export function MascotTrayIcon({ face }: { face: MascotTray }) {
  const size = MASCOT_SHEET.traySize;
  return (
    <span className="mascot-sprite" style={{ width: size, height: size }} aria-hidden="true">
      <span className="mascot-layer" style={cellStyle(MASCOT_CELLS.tray[face], 1)} />
    </span>
  );
}

const SNORE_MS = 1200;

/** The portrait asleep, snoring unless motion is reduced. */
export function SleepingMascot({ scale, still }: { scale?: number; still: boolean }) {
  const [snoreBeat, setSnoreBeat] = useState(false);
  useEffect(() => {
    if (still) return;
    const timer = window.setInterval(() => setSnoreBeat((current) => !current), SNORE_MS);
    return () => window.clearInterval(timer);
  }, [still]);
  const face = resolveFace({
    asleep: true,
    snoreBeat: snoreBeat && !still,
    blinking: false,
    gaze: 'center',
    mood: null,
    typed: null,
  });
  return <MascotSprite face={face} scale={scale} />;
}
