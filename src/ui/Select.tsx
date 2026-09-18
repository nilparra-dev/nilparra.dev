import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ComboArrow } from './glyphs';
import { uiRect, uiViewport } from './scale';

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
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  const close = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current ? uiRect(triggerRef.current) : undefined;
    const list = listRef.current;
    if (!trigger || !list) return;
    // A fixed popup's percentage width is relative to the viewport, not the field.
    const viewport = uiViewport();
    const width = Math.min(Math.max(trigger.width, list.scrollWidth + 2), viewport.width - 4);
    const below = Math.max(0, viewport.height - trigger.bottom - 2);
    const above = Math.max(0, trigger.top - 2);
    const height = Math.min(220, list.scrollHeight + 2);
    const openAbove = below < height && above > below;
    const maxHeight = Math.min(220, openAbove ? above : below);
    const top = openAbove ? trigger.top - Math.min(height, maxHeight) : trigger.bottom;
    const left = Math.max(2, Math.min(trigger.left, viewport.width - width - 2));
    setPosition({ left: Math.round(left), top: Math.round(top), width: Math.ceil(width), maxHeight });
  }, [isOpen, options]);

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
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && listRef.current?.contains(event.target)) return;
      close();
    };
    window.addEventListener('resize', close);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, options, value, close]);

  useEffect(() => {
    if (isOpen) listRef.current?.children[highlighted]?.scrollIntoView?.({ block: 'nearest' });
  }, [highlighted, isOpen]);

  const moveHighlight = (direction: number, from = highlighted) => {
    for (let index = from + direction; index >= 0 && index < options.length; index += direction) {
      if (!options[index].disabled) {
        setHighlighted(index);
        return;
      }
    }
  };

  const commit = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
    triggerRef.current?.focus();
  };

  return (
    <span ref={rootRef} className={className ? `select-wrap ${className}` : 'select-wrap'}>
      <button
        ref={triggerRef}
        type="button"
        className="select"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
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
          id={listId}
          className="select-popup"
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          aria-activedescendant={options[highlighted] ? `${listId}-${highlighted}` : undefined}
          style={{
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            width: position?.width,
            maxHeight: position?.maxHeight,
            position: 'fixed',
            visibility: position ? 'visible' : 'hidden',
          }}
          onKeyDown={(event) => {
            switch (event.key) {
              case 'ArrowDown':
                event.preventDefault();
                moveHighlight(1);
                break;
              case 'ArrowUp':
                event.preventDefault();
                moveHighlight(-1);
                break;
              case 'Home':
                event.preventDefault();
                moveHighlight(1, -1);
                break;
              case 'End':
                event.preventDefault();
                moveHighlight(-1, options.length);
                break;
              case 'Enter':
              case ' ':
                event.preventDefault();
                commit(highlighted);
                break;
              case 'Escape':
                event.preventDefault();
                event.stopPropagation();
                close();
                triggerRef.current?.focus();
                break;
              case 'Tab':
                close();
                triggerRef.current?.focus();
                break;
              default:
                break;
            }
          }}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              className="select-option"
              data-highlighted={index === highlighted}
              onMouseEnter={() => { if (!option.disabled) setHighlighted(index); }}
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
