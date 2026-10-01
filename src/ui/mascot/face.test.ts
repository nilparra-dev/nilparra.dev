import { describe, expect, it } from 'vitest';
import { gazeToward, resolveFace, resolveTrayFace, type FaceInput } from './face';

const EYES = { x: 100, y: 100 };

describe('gazeToward', () => {
  it('looks straight ahead while the pointer is on the face', () => {
    expect(gazeToward(EYES, { x: 110, y: 90 }, 32)).toBe('center');
    expect(gazeToward(EYES, EYES, 32)).toBe('center');
  });

  it.each([
    [{ x: 100, y: 0 }, 'up'],
    [{ x: 100, y: 200 }, 'down'],
    [{ x: 0, y: 100 }, 'left'],
    [{ x: 200, y: 100 }, 'right'],
    [{ x: 0, y: 0 }, 'up-left'],
    [{ x: 200, y: 0 }, 'up-right'],
    [{ x: 0, y: 200 }, 'down-left'],
    [{ x: 200, y: 200 }, 'down-right'],
  ])('snaps %o to %s', (target, expected) => {
    expect(gazeToward(EYES, target, 32)).toBe(expected);
  });

  it('keeps a slightly slanted direction on its main axis', () => {
    // 10 degrees off the vertical is still "up", not a diagonal.
    expect(gazeToward(EYES, { x: 100 - 35, y: 100 - 200 }, 32)).toBe('up');
    // 30 degrees off is closer to the diagonal.
    expect(gazeToward(EYES, { x: 100 - 115, y: 100 - 200 }, 32)).toBe('up-left');
  });
});

describe('resolveFace', () => {
  const quiet: FaceInput = {
    asleep: false,
    snoreBeat: false,
    blinking: false,
    gaze: 'up-left',
    mood: null,
    typed: null,
  };

  it('follows the pointer with a smile while nothing happens', () => {
    expect(resolveFace(quiet)).toEqual({ eyes: 'up-left', mouth: 'smile', overlay: null });
  });

  it('closes the eyes for a blink', () => {
    expect(resolveFace({ ...quiet, blinking: true }).eyes).toBe('closed');
  });

  it('moves the mouth while the bubble is writing and rests on the mood afterwards', () => {
    const mouths = [0, 2, 4, 6].map((typed) => resolveFace({ ...quiet, mood: 'joy', typed }).mouth);
    expect(mouths).toEqual(['open', 'ajar', 'open', 'neutral']);
    expect(resolveFace({ ...quiet, mood: 'joy', typed: null })).toEqual({
      eyes: 'joy',
      mouth: 'laugh',
      overlay: null,
    });
  });

  it('lets an expression override the gaze and the blink', () => {
    expect(resolveFace({ ...quiet, mood: 'ouch', blinking: true }).eyes).toBe('wince');
    expect(resolveFace({ ...quiet, mood: 'happy' }).eyes).toBe('up-left');
  });

  it('shows its temper with the brows, the teeth and the vein', () => {
    expect(resolveFace({ ...quiet, mood: 'annoyed' })).toEqual({
      eyes: 'angry',
      mouth: 'grit',
      overlay: 'anger',
    });
  });

  it('reduces the same states to the four faces of the tray head', () => {
    expect(resolveTrayFace(quiet)).toBe('idle');
    expect(resolveTrayFace({ ...quiet, blinking: true })).toBe('closed');
    expect(resolveTrayFace({ ...quiet, mood: 'happy', typed: 0 })).toBe('talk');
    expect(resolveTrayFace({ ...quiet, mood: 'happy', typed: 2 })).toBe('idle');
    expect(resolveTrayFace({ ...quiet, mood: 'annoyed', typed: 0 })).toBe('angry');
    expect(resolveTrayFace({ ...quiet, asleep: true, mood: 'annoyed' })).toBe('closed');
  });

  it('sleeps through everything else, alternating the snore', () => {
    const asleep = { ...quiet, asleep: true, mood: 'joy' as const, typed: 3 };
    expect(resolveFace(asleep)).toEqual({ eyes: 'closed', mouth: 'round', overlay: 'sleep1' });
    expect(resolveFace({ ...asleep, snoreBeat: true })).toEqual({
      eyes: 'closed',
      mouth: 'neutral',
      overlay: 'sleep2',
    });
  });
});
