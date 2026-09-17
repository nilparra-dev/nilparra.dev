/**
 * Brand shown on the vertical strip of the Start menu and in the boot screen.
 *
 * Deliberate substitution: the reference screenshot shows the Microsoft
 * word mark there, which is a trademark and is not ours to use as our own
 * brand, so the default is the owner's name with the same typographic shape.
 * Set it back to `Windows` / `95` if you prefer the literal reference; the
 * README explains the trade off.
 */
export const DESKTOP_BRAND = {
  name: 'Nil Parra',
  version: '95',
};

/** Shown by the boot and restart screens. */
export const DESKTOP_PRODUCT_NAME = `${DESKTOP_BRAND.name} ${DESKTOP_BRAND.version}`;
