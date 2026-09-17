import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconId } from '../assets/generated/icons';
import { CloseGlyph } from './glyphs';
import { useT } from '../core/i18n/I18nProvider';

export interface DialogProps {
  title: string;
  icon?: IconId;
  children: ReactNode;
  /** Usually a row of <Button> elements. */
  buttons: ReactNode;
  onClose: () => void;
  /** Width of the dialog body; the classic message boxes are narrow. */
  width?: number;
  /** Help topic opened by the "?" caption button. */
  helpTopicId?: string;
  /** Focused when the dialog opens. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Modal dialog of the shell: centred, focus trapped, Escape cancels and focus
 * returns to whatever had it before.
 */
export function Dialog({
  title,
  icon,
  children,
  buttons,
  onClose,
  width = 360,
  helpTopicId,
  initialFocusRef,
}: DialogProps) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const target =
      initialFocusRef?.current ??
      rootRef.current?.querySelector<HTMLElement>(
        '[data-autofocus], .btn--default, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
    target?.focus({ preventScroll: true });
    return () => {
      previousFocus.current?.focus?.({ preventScroll: true });
    };
  }, [initialFocusRef]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = rootRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  return (
    <div className="dialog-layer">
      <div
        ref={rootRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dialog-title-${title}`}
        style={{ left: '50%', top: '38%', transform: 'translate(-50%, -50%)', width }}
      >
        <header className="title-bar">
          {icon && (
            <span className="title-bar-icon">
              <Icon id={icon} size={16} />
            </span>
          )}
          <h2 className="title-bar-text" id={`dialog-title-${title}`}>
            {title}
          </h2>
          <div className="title-bar-buttons">
            {helpTopicId && (
              <button
                type="button"
                className="caption-btn"
                aria-label={t('start.help')}
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('w95:open-help', { detail: helpTopicId }))
                }
              >
                <span aria-hidden="true">?</span>
              </button>
            )}
            <button type="button" className="caption-btn" aria-label={t('window.close')} onClick={onClose}>
              <CloseGlyph size={8} />
            </button>
          </div>
        </header>
        <div className="dialog-body">{children}</div>
        <div className="dialog-buttons">{buttons}</div>
      </div>
    </div>
  );
}
