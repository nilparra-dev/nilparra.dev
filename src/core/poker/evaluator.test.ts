import { describe, expect, it } from 'vitest';
import { rankLabel, suitColor, type Card, type Rank, type Suit } from '../cards/deck';
import { compareHands, evaluateHand } from './evaluator';

const SUIT_BY_LETTER: Record<string, Suit> = {
  s: 'spades',
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
};

const RANK_BY_LABEL: Record<string, Rank> = {
  A: 1,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
};

/** "Ah Kd 5c" to cards, with stable ids. */
function hand(specification: string): Card[] {
  return specification.split(' ').map((token) => {
    const rank = RANK_BY_LABEL[token.slice(0, -1)];
    const suit = SUIT_BY_LETTER[token.slice(-1)];
    if (!rank || !suit) throw new Error(`Bad card token: ${token}`);
    return { id: `${suit}-${rank}`, suit, rank, faceUp: true };
  });
}

describe('evaluateHand', () => {
  it('detects every category', () => {
    expect(evaluateHand(hand('Ah Kh Qh Jh Th')).category).toBe('straight-flush');
    expect(evaluateHand(hand('9s 9h 9d 9c 2s')).category).toBe('quads');
    expect(evaluateHand(hand('Ks Kh Kd 2s 2h')).category).toBe('full-house');
    expect(evaluateHand(hand('Ah 9h 7h 4h 2h')).category).toBe('flush');
    expect(evaluateHand(hand('9s 8h 7d 6c 5s')).category).toBe('straight');
    expect(evaluateHand(hand('Ks Kh Kd 2s 7h')).category).toBe('trips');
    expect(evaluateHand(hand('Ks Kh 2d 2s 7h')).category).toBe('two-pair');
    expect(evaluateHand(hand('Ks Kh 2d 7s 9h')).category).toBe('pair');
    expect(evaluateHand(hand('Ks Qh 2d 7s 9h')).category).toBe('high-card');
  });

  it('reads the wheel as a five high straight', () => {
    const wheel = evaluateHand(hand('Ah 2s 3d 4c 5h'));
    expect(wheel.category).toBe('straight');
    expect(wheel.ranks).toEqual([5]);
    const steelWheel = evaluateHand(hand('Ah 2h 3h 4h 5h'));
    expect(steelWheel.category).toBe('straight-flush');
    expect(steelWheel.ranks).toEqual([5]);
    expect(compareHands(wheel, evaluateHand(hand('2s 3d 4c 5h 6s')))).toBeLessThan(0);
  });

  it('orders the tie-break ranks of each category', () => {
    expect(evaluateHand(hand('9s 9h 9d 9c 2s')).ranks).toEqual([9, 2]);
    expect(evaluateHand(hand('Ks Kh Kd 2s 2h')).ranks).toEqual([13, 2]);
    expect(evaluateHand(hand('Ks Kh 2d 2s 7h')).ranks).toEqual([13, 2, 7]);
    expect(evaluateHand(hand('Ks Kh 2d 7s 9h')).ranks).toEqual([13, 9, 7, 2]);
    expect(evaluateHand(hand('Kh Qh 2d 7s 9h')).ranks).toEqual([13, 12, 9, 7, 2]);
    // Two trips pick the higher one as the full house.
    expect(evaluateHand(hand('Ks Kh Kd 2s 2h 2c')).ranks).toEqual([13, 2]);
  });

  it('picks the best five of seven cards', () => {
    const boardPlays = evaluateHand(hand('Ah Kh Qh Jh Th 2s 3d'));
    expect(boardPlays.category).toBe('straight-flush');
    expect(boardPlays.cards.map((card) => card.id)).toEqual([
      'hearts-1',
      'hearts-13',
      'hearts-12',
      'hearts-11',
      'hearts-10',
    ]);
    expect(evaluateHand(hand('Ah Ad Ac Ks Kh 2d 3c')).category).toBe('full-house');
    expect(evaluateHand(hand('Ah Ad Ac Ks Kh 2d 3c')).ranks).toEqual([1, 13]);
    expect(evaluateHand(hand('2h 3h 4h 5h 6h 9s 9d')).category).toBe('straight-flush');
    expect(evaluateHand(hand('2h 3h 4h 5h 7h 9s 9d')).category).toBe('flush');
  });

  it('describes a partial hand with two cards', () => {
    expect(evaluateHand(hand('As Ah'))).toMatchObject({ category: 'pair', ranks: [1] });
    expect(evaluateHand(hand('As Kd'))).toMatchObject({ category: 'high-card', ranks: [1, 13] });
    expect(evaluateHand(hand('7s 7h 7d 7c'))).toMatchObject({ category: 'quads', ranks: [7] });
  });

  it('compares hands by category and kickers', () => {
    const aceHighFlush = evaluateHand(hand('Ah 9h 7h 4h 2h'));
    const kingHighFlush = evaluateHand(hand('Kh 9h 7h 4h 2h'));
    expect(compareHands(aceHighFlush, kingHighFlush)).toBeGreaterThan(0);

    const pairAceKing = evaluateHand(hand('Ah Ad Kc Qs Js'));
    const pairAceQueen = evaluateHand(hand('Ah Ad Qc Js Ts'));
    expect(compareHands(pairAceKing, pairAceQueen)).toBeGreaterThan(0);

    const twoPairKickers = evaluateHand(hand('Kh Kd 2s 2h 7s'));
    expect(compareHands(twoPairKickers, evaluateHand(hand('Kh Kd 2s 2h 3s')))).toBeGreaterThan(0);

    const tie = evaluateHand(hand('Ah Kd Qc Js Th'));
    const otherTie = evaluateHand(hand('Ad Kh Qs Jc Ts'));
    expect(compareHands(tie, otherTie)).toBe(0);

    const fullHouse = evaluateHand(hand('Ks Kh Kd 2s 2h'));
    const flush = evaluateHand(hand('Ah 9h 7h 4h 2h'));
    expect(compareHands(fullHouse, flush)).toBeGreaterThan(0);
  });

  it('rejects an empty hand', () => {
    expect(() => evaluateHand([])).toThrow();
  });

  it('keeps the shared card labels', () => {
    expect(rankLabel(1)).toBe('A');
    expect(rankLabel(10)).toBe('10');
    expect(suitColor('hearts')).toBe('red');
    expect(suitColor('spades')).toBe('black');
  });
});
