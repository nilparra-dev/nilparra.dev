/**
 * Stable identifiers.
 *
 * Every file, folder and window gets an id that never depends on its name or
 * path, so renaming or moving never breaks references and translations never
 * touch stored data.
 */
export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

/** Collision-free key for "one window per document" applications. */
export function documentKey(appId: string, target: string): string {
  return `${appId}:${target}`;
}
