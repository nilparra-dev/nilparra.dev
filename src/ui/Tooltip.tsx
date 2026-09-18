import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { uiRect, uiViewport } from './scale';

export interface TooltipProps {
  text: string;
  children: ReactNode;
  /** Delay before the tooltip appears, in milliseconds. */
  delay?: number;
}

/**
 * Yellow tooltip of the shell. Native `title` attributes render with the look
 * of the host operating system, so the hint is drawn by us instead.
 */
export function Tooltip({ text, children, delay = 600 }: TooltipProps) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<number | null>(null);

  const hide = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setPosition(null);
  }, []);

  const show = useCallback(() => {
    hide();
    timer.current = window.setTimeout(() => {
      const element = wrapperRef.current;
      if (!element) return;
      const rect = uiRect(element);
      setPosition({
        left: Math.round(Math.max(2, Math.min(rect.left, uiViewport().width - 260))),
        top: Math.round(rect.bottom + 2),
      });
    }, delay);
  }, [delay, hide]);

  useEffect(() => hide, [hide]);

  return (
    <span
      ref={wrapperRef}
      className="tooltip-anchor"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
      onPointerDown={hide}
    >
      {children}
      {position &&
        createPortal(
          <div className="tooltip" role="tooltip" style={{ left: position.left, top: position.top }}>
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}
