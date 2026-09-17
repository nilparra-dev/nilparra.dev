/**
 * Versioned access to localStorage.
 *
 * Only small preferences live here (the virtual file system uses IndexedDB).
 * Every read is defensive: private mode, cleared storage or a schema from an
 * older version must never break the desktop.
 */
const PREFIX = 'nilparra-win95';

interface Envelope<T> {
  version: number;
  data: T;
}

function key(name: string): string {
  return `${PREFIX}:${name}`;
}

export function readStored<T>(name: string, version: number, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key(name));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== version) return fallback;
    return parsed.data;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(name: string, version: number, data: T): boolean {
  try {
    const envelope: Envelope<T> = { version, data };
    window.localStorage.setItem(key(name), JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function removeStored(name: string): void {
  try {
    window.localStorage.removeItem(key(name));
  } catch {
    /* nothing to do: the value simply stays */
  }
}

export function clearAllStored(): void {
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const candidate = window.localStorage.key(index);
      if (candidate && candidate.startsWith(`${PREFIX}:`)) keys.push(candidate);
    }
    keys.forEach((candidate) => window.localStorage.removeItem(candidate));
  } catch {
    /* ignore */
  }
}
