import type { ReactNode } from 'react';

export interface GroupBoxProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Etched frame with the label sitting on the border. */
export function GroupBox({ title, children, className }: GroupBoxProps) {
  return (
    <fieldset className={className ? `group-box ${className}` : 'group-box'}>
      {title && <legend className="group-box-title">{title}</legend>}
      {children}
    </fieldset>
  );
}
