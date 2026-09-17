/**
 * Shared clipboard of the shell: the desktop, Explorer and the Recycle Bin all
 * cut and paste through it, so a file cut in one window can be pasted in
 * another.
 */
import { useEffect, useState } from 'react';

export type ClipboardMode = 'copy' | 'cut';

export interface ClipboardState {
  mode: ClipboardMode;
  ids: string[];
  /** Folder the items were cut from, used to update the status bar. */
  sourceParentId: string | null;
}

let state: ClipboardState | null = null;
const listeners = new Set<(value: ClipboardState | null) => void>();

export function setClipboard(next: ClipboardState | null): void {
  state = next;
  listeners.forEach((listener) => listener(state));
}

export function getClipboard(): ClipboardState | null {
  return state;
}

export function clearClipboard(): void {
  setClipboard(null);
}

export function subscribeClipboard(listener: (value: ClipboardState | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useClipboard(): ClipboardState | null {
  const [value, setValue] = useState<ClipboardState | null>(getClipboard());
  useEffect(() => subscribeClipboard(setValue), []);
  return value;
}
