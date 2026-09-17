import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Draws the extra black ring of dialog default buttons. */
  primary?: boolean;
  size?: 'normal' | 'small';
  children?: ReactNode;
}

/**
 * The classic push button. States are driven by CSS: normal, pressed
 * (`:active`), focused (`:focus-visible`) and disabled.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { primary, size = 'normal', className, type = 'button', children, ...rest },
  ref,
) {
  const classes = ['btn'];
  if (primary) classes.push('btn--default');
  if (size === 'small') classes.push('btn--small');
  if (className) classes.push(className);
  return (
    <button ref={ref} type={type} className={classes.join(' ')} {...rest}>
      {children}
    </button>
  );
});
