/**
 * The shared 52-card model.
 *
 * Solitaire and poker deal the same deck, so the card shape, the labels and
 * the shuffle live here. Shuffling takes a random source instead of reading
 * `Math.random` directly: a seeded generator drives deterministic tests and
 * the games pass the real one.
 */

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type CardColor = 'black' | 'red';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  /** Stable identity ("hearts-12"): React key, drag payload and test handle. */
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank];
}

export function suitColor(suit: Suit): CardColor {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/**
 * Poker value of a rank: the ace plays high (14) for straights, flushes and
 * every comparison. The card model keeps A=1, which is the label-friendly
 * value, so conversions go through this function.
 */
export function rankValue(rank: Rank): number {
  return rank === 1 ? 14 : rank;
}

/** The 52 cards of a deck, all face down, in a stable order. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ id: `${suit}-${rank}`, suit, rank: rank as Rank, faceUp: false });
    }
  }
  return deck;
}

/**
 * Deterministic generator (mulberry32). The same seed always produces the
 * same sequence, everywhere.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Real random source. Uses the browser crypto generator when it exists, so
 * shuffles are not predictable from the seed of `Math.random`.
 */
export function defaultRandom(): () => number {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    return () => {
      cryptoObject.getRandomValues(buffer);
      return buffer[0] / 4294967296;
    };
  }
  return Math.random;
}

/** Fisher-Yates over a copy; the input is not modified. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
