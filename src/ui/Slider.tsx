import { useCallback, useRef } from 'react';

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  /** Ticks drawn under the track, like the volume control of the shell. */
  ticks?: number;
  width?: number;
}

/**
 * Classic trackbar: sunken groove, raised thumb, keyboard support with the
 * arrows, Home and End. No native `<input type="range">` because its look
 * cannot be brought back to the 95 style.
 */
export function Slider({
  value,
  min = 0,
  max = 100,
  onChange,
  ariaLabel,
  ticks = 0,
  width = 120,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const percentage = max === min ? 0 : (value - min) / (max - min);
  const thumbWidth = 11;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const usable = rect.width - thumbWidth;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left - thumbWidth / 2) / usable));
      onChange(Math.round(min + ratio * (max - min)));
    },
    [max, min, onChange],
  );

  return (
    <div className="slider" style={{ width }}>
      <div
        ref={trackRef}
        className="slider-track bevel-down"
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={(event) => {
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          setFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!(event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) return;
          setFromClientX(event.clientX);
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 10 : 1;
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            onChange(Math.min(max, value + step));
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            onChange(Math.max(min, value - step));
          } else if (event.key === 'Home') {
            event.preventDefault();
            onChange(min);
          } else if (event.key === 'End') {
            event.preventDefault();
            onChange(max);
          }
        }}
      >
        <div className="slider-thumb" style={{ left: percentage * (width - thumbWidth - 4) + 2 }} />
      </div>
      {ticks > 0 && (
        <div className="slider-ticks" aria-hidden="true">
          {Array.from({ length: ticks }, (_, index) => (
            <span key={index} className="slider-tick" />
          ))}
        </div>
      )}
    </div>
  );
}
