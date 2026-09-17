import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ComboArrow } from './glyphs';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  /** Extra content rendered inside the closed control (for example an icon). */
  prefix?: ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Combo box with the classic sunken field and raised arrow button. The list is
 * drawn by us instead of the browser so it keeps the 95 look.
 */
export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  prefix,
  className,
  disabled,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const selected = options.find((option) => option.value === value);

  const close = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const trigger = rootRef.current?.getBoundingClientRect();
    const list = listRef.current?.getBoundingClientRect();
    if (!trigger) return;
    const width = Math.max(trigger.width, list?.width ?? trigger.width);
    let left = trigger.left;
    let top = trigger.bottom;
    if (left + width > window.innerWidth - 2) left = window.innerWidth - width - 2;
    if (top + (list?.height ?? 0) > window.innerHeight - 2) {
      top = Math.max(2, trigger.top - (list?.height ?? 0) - 1);
    }
    setPosition({ left: Math.round(left), top: Math.round(top), width: Math.round(width) });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const index = Math.max(0, options.findIndex((option) => option.value === value));
    setHighlighted(index);
    const element = listRef.current;
    element?.focus({ preventScroll: true });
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !listRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isOpen, options, value, close]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
    rootRef.current?.focus();
  };

  return (
    <span ref={rootRef} className={className ? `select-wrap ${className}` : 'select-wrap'}>
      <button
        type="button"
        className="select"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        {prefix}
        <span className="select-value">{selected ? selected.label : ''}</span>
        <span className="select-arrow" aria-hidden="true">
          <ComboArrow color="#000000" />
        </span>
      </button>
      {isOpen && (
        <ul
          ref={listRef}
          className="select-popup"
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          style={{
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            minWidth: position?.width,
            position: 'fixed',
            visibility: position ? 'visible' : 'hidden',
          }}
          onKeyDown={(event) => {
            switch (event.key) {
              case 'ArrowDown':
                event.preventDefault();
                setHighlighted((current) => Math.min(options.length - 1, current + 1));
                break;
              case 'ArrowUp':
                event.preventDefault();
                setHighlighted((current) => Math.max(0, current - 1));
                break;
              case 'Home':
                event.preventDefault();
                setHighlighted(0);
                break;
              case 'End':
                event.preventDefault();
                setHighlighted(options.length - 1);
                break;
              case 'Enter':
              case ' ':
                event.preventDefault();
                commit(highlighted);
                break;
              case 'Escape':
                event.preventDefault();
                close();
                rootRef.current?.focus();
                break;
              default:
                break;
            }
          }}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className="select-option"
              data-highlighted={index === highlighted}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => commit(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
