import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { externalTarget, useOpenExternal } from '../core/dialogs/useOpenExternal';

type ExternalLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'> & {
  href: string;
};

/**
 * Link to another site. A plain click asks before leaving the desktop; a
 * middle click, Ctrl/Cmd/Shift click or "open in new tab" from the context
 * menu is already an explicit choice, so the browser handles it untouched.
 * So does a mailto: address, which opens the mail client, not another site.
 */
export function ExternalLink({ href, onClick, children, ...rest }: ExternalLinkProps) {
  const openExternal = useOpenExternal();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!externalTarget(href)) return;
    event.preventDefault();
    void openExternal(href);
  };

  return (
    <a {...rest} href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
      {children}
    </a>
  );
}
