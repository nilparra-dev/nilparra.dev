/**
 * Brand shown on the vertical strip of the Start menu and in the boot screen.
 *
 * The shell reproduces the reference wordmark; personal branding lives in
 * the portfolio applications rather than replacing system interface labels.
 */
export const DESKTOP_BRAND = {
  name: 'Windows',
  version: '95',
};

/** Shown by the boot and restart screens. */
export const DESKTOP_PRODUCT_NAME = `${DESKTOP_BRAND.name} ${DESKTOP_BRAND.version}`;
