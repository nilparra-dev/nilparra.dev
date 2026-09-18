/**
 * Hand evaluation for Texas Hold'em.
 *
 * A hand is compared by category and then by its tie-break ranks, so the
 * result is a plain comparable value. Seven cards are reduced to the best
 * five by trying the 21 combinations: small, exact and easy to test, which is
 * all a six seat table needs.
 *
 * Tie-break ranks keep the card convention (ace = 1); every comparison goes
 * through `rankValue`, where the ace plays high.
 */
import { rankValue, type Card, type Rank } from '../cards/deck';
import type { HandCategory, HandValue } from './types';

/** Categories from weakest to strongest. */
export const HAND_CATEGORY_ORDER: readonly HandCategory[] = [
  'high-card',
  'pair',
  'two-pair',
  'trips',
  'straight',
  'flush',
  'full-house',
  'quads',
  'straight-flush',
];

function categoryRank(category: HandCategory): number {
  return HAND_CATEGORY_ORDER.indexOf(category);
}

function toCardRank(value: number): Rank {
  return (value === 14 ? 1 : value) as Rank;
}

/** Positive when `a` beats `b`, negative when it loses, 0 on a tie. */
export function compareHands(a: HandValue, b: HandValue): number {
  const byCategory = categoryRank(a.category) - categoryRank(b.category);
  if (byCategory !== 0) return byCategory;
  const length = Math.max(a.ranks.length, b.ranks.length);
  for (let index = 0; index < length; index += 1) {
    const difference = rankValue((a.ranks[index] ?? 0) as Rank) - rankValue((b.ranks[index] ?? 0) as Rank);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * Highest poker value of the straight found in descending unique values, or
 * null. The wheel (A-2-3-4-5) counts as a five high straight.
 */
function straightHigh(uniqueDescending: readonly number[]): number | null {
  if (uniqueDescending.length < 5) return null;
  if (
    uniqueDescending[0] === 14 &&
    uniqueDescending.includes(5) &&
    uniqueDescending.includes(4) &&
    uniqueDescending.includes(3) &&
    uniqueDescending.includes(2)
  ) {
    return 5;
  }
  for (let index = 0; index + 4 < uniqueDescending.length; index += 1) {
    if (uniqueDescending[index] - uniqueDescending[index + 4] === 4) return uniqueDescending[index];
  }
  return null;
}

/**
 * Evaluates one to five cards. Flushes and straights need the full five, so a
 * partial hand (the two hole cards before the flop) can still be described as
 * a pair or high card.
 */
function evaluateCards(cards: readonly Card[]): HandValue {
  const values = cards.map((card) => rankValue(card.rank)).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const unique = [...counts.keys()].sort((a, b) => b - a);

  const complete = cards.length === 5;
  const isFlush = complete && cards.every((card) => card.suit === cards[0].suit);
  const high = complete ? straightHigh(unique) : null;

  const kickers = groups.slice(1).map(([value]) => toCardRank(value));
  const ranks = (valuesInOrder: readonly number[]): Rank[] => valuesInOrder.map(toCardRank);

  if (isFlush && high !== null) {
    return { category: 'straight-flush', ranks: [toCardRank(high)], cards: cards.slice() };
  }
  if (groups[0][1] === 4) {
    const quadRanks: number[] = [toCardRank(groups[0][0])];
    if (kickers[0] !== undefined) quadRanks.push(kickers[0]);
    return { category: 'quads', ranks: quadRanks, cards: cards.slice() };
  }
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) {
    return {
      category: 'full-house',
      ranks: [toCardRank(groups[0][0]), toCardRank(groups[1][0])],
      cards: cards.slice(),
    };
  }
  if (isFlush) {
    return { category: 'flush', ranks: ranks(unique), cards: cards.slice() };
  }
  if (high !== null) {
    return { category: 'straight', ranks: [toCardRank(high)], cards: cards.slice() };
  }
  if (groups[0][1] === 3) {
    return { category: 'trips', ranks: [toCardRank(groups[0][0]), ...kickers], cards: cards.slice() };
  }
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    const twoPairRanks: number[] = [toCardRank(groups[0][0]), toCardRank(groups[1][0])];
    if (kickers[1] !== undefined) twoPairRanks.push(kickers[1]);
    return { category: 'two-pair', ranks: twoPairRanks, cards: cards.slice() };
  }
  if (groups[0][1] === 2) {
    return { category: 'pair', ranks: [toCardRank(groups[0][0]), ...kickers], cards: cards.slice() };
  }
  return { category: 'high-card', ranks: ranks(unique), cards: cards.slice() };
}

/**
 * Best five-card hand of two to seven cards. Two hole cards plus the board is
 * the normal call; fewer cards describe the current partial hand.
 */
export function evaluateHand(cards: readonly Card[]): HandValue {
  if (cards.length === 0) throw new Error('Cannot evaluate an empty hand');
  if (cards.length <= 5) return evaluateCards(cards);

  let best: HandValue | null = null;
  const total = cards.length;
  for (let a = 0; a < total - 4; a += 1) {
    for (let b = a + 1; b < total - 3; b += 1) {
      for (let c = b + 1; c < total - 2; c += 1) {
        for (let d = c + 1; d < total - 1; d += 1) {
          for (let e = d + 1; e < total; e += 1) {
            const value = evaluateCards([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareHands(value, best) > 0) best = value;
          }
        }
      }
    }
  }
  if (!best) throw new Error('Cannot evaluate the hand');
  return best;
}
