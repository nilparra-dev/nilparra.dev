import { useId, type ReactNode } from 'react';
import { BulletGlyph, CheckGlyph } from './glyphs';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** 13px sunken box with the classic check mark. */
export function Checkbox({ checked, onChange, label, disabled, className }: CheckboxProps) {
  const id = useId();
  return (
    <span className={className ? `check ${className}` : 'check'} data-disabled={disabled || undefined}>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id} className="check-box" aria-hidden="false">
        {checked && (
          <span className="check-glyph">
            <CheckGlyph />
          </span>
        )}
      </label>
      <label htmlFor={id} className="check-label">
        {label}
      </label>
    </span>
  );
}

export interface RadioProps {
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  name: string;
  disabled?: boolean;
}

export function Radio({ checked, onChange, label, name, disabled }: RadioProps) {
  const id = useId();
  return (
    <span className="check" data-disabled={disabled || undefined}>
      <input
        id={id}
        type="radio"
        name={name}
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <label htmlFor={id} className="check-box check-box--radio">
        {checked && (
          <span className="check-mark">
            <BulletGlyph />
          </span>
        )}
      </label>
      <label htmlFor={id} className="check-label">
        {label}
      </label>
    </span>
  );
}
