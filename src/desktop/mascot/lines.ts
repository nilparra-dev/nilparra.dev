import type { DesktopEvent } from '../../core/desktop/events';
import type { TranslationKey } from '../../core/i18n/es';
import type { Mood } from '../../ui/mascot/face';

/** Something the mascot says on its own, without offering a shortcut. */
export interface Line {
  textKey: TranslationKey;
  mood: Mood;
}

export function lineForEvent(event: DesktopEvent): Line {
  switch (event.type) {
    case 'game-won':
      return { textKey: 'mascot.gameWon', mood: 'joy' };
    case 'game-lost':
      return { textKey: 'mascot.mineLost', mood: 'ouch' };
  }
}

export const TRASHED_LINE: Line = { textKey: 'mascot.trashed', mood: 'surprised' };
export const POKED_LINE: Line = { textKey: 'mascot.poked', mood: 'annoyed' };
export const WOKE_LINE: Line = { textKey: 'mascot.woke', mood: 'surprised' };

/** The salutation that opens the first greeting, by the visitor's local hour (0-23). */
export function salutationKey(hour: number): TranslationKey {
  if (hour >= 6 && hour < 13) return 'mascot.morning';
  if (hour >= 13 && hour < 20) return 'mascot.afternoon';
  return 'mascot.night';
}

/**
 * Index of the next tip worth showing, starting at `start` and wrapping
 * around. Tips the visitor has already followed are skipped, but only while
 * at least two are left: with a single one "another tip" would repeat it for
 * ever, so from then on the rotation runs over every tip again.
 */
export function nextTipIndex(count: number, start: number, isDone: (index: number) => boolean): number {
  const pending: number[] = [];
  for (let step = 0; step < count; step += 1) {
    const index = (start + step) % count;
    if (!isDone(index)) pending.push(index);
  }
  return pending.length >= 2 ? pending[0] : start % count;
}
