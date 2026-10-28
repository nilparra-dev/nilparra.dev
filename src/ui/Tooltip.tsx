import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    /** Where the anchor starts, to flip the tooltip above it when needed. */
    anchorTop: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
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
        anchorTop: Math.round(rect.top),
      });
    }, delay);
  }, [delay, hide]);

  useEffect(() => hide, [hide]);

  /* The taskbar sits on the bottom edge, so its tooltips would open off
   * screen. Once the height is known, move the tooltip above the anchor. */
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!position || !tooltip) return;
    const viewport = uiViewport();
    const height = uiRect(tooltip).height;
    if (position.top + height <= viewport.height - 2) return;
    const top = Math.max(2, position.anchorTop - height - 2);
    if (top !== position.top) setPosition({ ...position, top });
  }, [position]);

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
          <div
            ref={tooltipRef}
            className="tooltip"
            role="tooltip"
            style={{ left: position.left, top: position.top }}
          >
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}
