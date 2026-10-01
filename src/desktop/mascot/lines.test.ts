import { describe, expect, it } from 'vitest';
import { lineForEvent, nextTipIndex, salutationKey } from './lines';

describe('nextTipIndex', () => {
  const none = () => false;

  it('starts where the rotation was left and wraps around', () => {
    expect(nextTipIndex(4, 0, none)).toBe(0);
    expect(nextTipIndex(4, 3, none)).toBe(3);
    expect(nextTipIndex(4, 4, none)).toBe(0);
  });

  it('skips the tips already followed', () => {
    const done = new Set([1, 2]);
    expect(nextTipIndex(4, 1, (index) => done.has(index))).toBe(3);
    expect(nextTipIndex(4, 4, (index) => done.has(index))).toBe(0);
  });

  it('does not get stuck on the only tip left', () => {
    const onlyOneLeft = (index: number) => index !== 1;
    const shown: number[] = [];
    let cursor = 1;
    for (let click = 0; click < 4; click += 1) {
      const index = nextTipIndex(4, cursor, onlyOneLeft);
      shown.push(index);
      cursor = index + 1;
    }
    expect(shown).toEqual([1, 2, 3, 0]);
  });

  it('keeps rotating when every tip is done', () => {
    expect(nextTipIndex(4, 6, () => true)).toBe(2);
  });
});

describe('salutationKey', () => {
  it.each([
    [6, 'mascot.morning'],
    [12, 'mascot.morning'],
    [13, 'mascot.afternoon'],
    [19, 'mascot.afternoon'],
    [20, 'mascot.night'],
    [0, 'mascot.night'],
    [5, 'mascot.night'],
  ])('at %i h uses %s', (hour, key) => {
    expect(salutationKey(hour)).toBe(key);
  });
});

describe('lines', () => {
  it('celebrates a win and winces at a mine', () => {
    expect(lineForEvent({ type: 'game-won', game: 'solitaire' }).mood).toBe('joy');
    expect(lineForEvent({ type: 'game-lost', game: 'minesweeper' }).mood).toBe('ouch');
  });
});
