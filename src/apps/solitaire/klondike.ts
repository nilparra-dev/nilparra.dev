/**
 * Klondike rules as pure functions.
 *
 * The UI never mutates a game in place: every action takes a state and returns
 * a new one. That keeps undo as simple as stacking snapshots and makes the
 * whole ruleset testable without a DOM. Piles are arrays whose last element is
 * the visible top card.
 *
 * The cards themselves (shape, labels, deck and shuffle) are shared with the
 * poker table and live in src/core/cards/deck.ts.
 */
import {
  createDeck,
  rankLabel,
  seededRandom,
  shuffle as shuffleCards,
  suitColor,
  SUITS,
  type Card,
} from '../../core/cards/deck';

export { createDeck, rankLabel, suitColor, SUITS };
export type { Card, CardColor, Rank, Suit } from '../../core/cards/deck';

export type DrawCount = 1 | 3;

export type PileKind = 'stock' | 'waste' | 'foundation' | 'tableau';

export interface PileRef {
  kind: PileKind;
  /** Foundation or tableau index; always 0 for stock and waste. */
  index: number;
}

export interface GameState {
  /** Face-down cards left to deal; the last element is the next one. */
  stock: Card[];
  /** Face-up cards; the last element is the playable one. */
  waste: Card[];
  /** Four piles, each ascending in one suit from the ace. */
  foundations: Card[][];
  /** Seven columns, left to right. */
  tableau: Card[][];
  drawCount: DrawCount;
  score: number;
  moves: number;
  /** Deal number: the same seed always produces the same board. */
  seed: number;
}

/** Standard Windows scoring, in points. */
export const SCORE_RULES = {
  wasteToTableau: 5,
  toFoundation: 10,
  turnOverCard: 5,
  foundationToTableau: -15,
  /** Recycling costs more when only one card is drawn at a time. */
  recycleWasteDrawThree: -20,
  recycleWasteDrawOne: -100,
} as const;

/** Six digit deal number, like the game counter of the original. */
export function newSeed(): number {
  return Math.floor(Math.random() * 900_000) + 100_000;
}

/** Fisher-Yates with the deal number as the seed: the same game deals alike. */
export function shuffle(deck: readonly Card[], seed: number): Card[] {
  return shuffleCards(deck, seededRandom(seed));
}

/**
 * Deals a new game: seven columns of 1..7 cards, only the top one face up, and
 * the remaining 24 cards face down in the stock. Cards are dealt row by row,
 * like the original.
 */
export function createDeal(seed: number, drawCount: DrawCount): GameState {
  const deck = shuffle(createDeck(), seed);
  const tableau: Card[][] = [[], [], [], [], [], [], []];
  let cursor = 0;
  for (let row = 0; row < 7; row += 1) {
    for (let column = row; column < 7; column += 1) {
      const card = deck[cursor];
      cursor += 1;
      tableau[column].push({ ...card, faceUp: row === column });
    }
  }
  return {
    stock: deck.slice(cursor).map((card) => ({ ...card, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    drawCount,
    score: 0,
    moves: 0,
    seed,
  };
}

export function pileCards(state: GameState, ref: PileRef): readonly Card[] {
  switch (ref.kind) {
    case 'stock':
      return state.stock;
    case 'waste':
      return state.waste;
    case 'foundation':
      return state.foundations[ref.index] ?? [];
    case 'tableau':
      return state.tableau[ref.index] ?? [];
  }
}

export function topCard(state: GameState, ref: PileRef): Card | null {
  const pile = pileCards(state, ref);
  return pile.length > 0 ? pile[pile.length - 1] : null;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    stock: state.stock.slice(),
    waste: state.waste.slice(),
    foundations: state.foundations.map((pile) => pile.slice()),
    tableau: state.tableau.map((pile) => pile.slice()),
  };
}

/** Mutable accessor used on the clone inside moveCards. */
function pileArray(state: GameState, ref: PileRef): Card[] {
  switch (ref.kind) {
    case 'stock':
      return state.stock;
    case 'waste':
      return state.waste;
    case 'foundation':
      return state.foundations[ref.index];
    case 'tableau':
      return state.tableau[ref.index];
  }
}

/**
 * Turns over the stock. When it is empty the waste is recycled: the pile is
 * reversed so drawing again shows the same sequence of cards.
 */
export function drawFromStock(state: GameState): GameState {
  if (state.stock.length === 0) return recycleWaste(state);

  const next = cloneState(state);
  const count = Math.min(state.drawCount, next.stock.length);
  for (let i = 0; i < count; i += 1) {
    const card = next.stock.pop();
    if (card) next.waste.push({ ...card, faceUp: true });
  }
  next.moves = state.moves + 1;
  return next;
}

function recycleWaste(state: GameState): GameState {
  if (state.waste.length === 0) return state;
  const next = cloneState(state);
  next.stock = next.waste
    .slice()
    .reverse()
    .map((card) => ({ ...card, faceUp: false }));
  next.waste = [];
  next.score +=
    state.drawCount === 3 ? SCORE_RULES.recycleWasteDrawThree : SCORE_RULES.recycleWasteDrawOne;
  next.moves = state.moves + 1;
  return next;
}

/**
 * A card (or run of cards) can be picked up when it is face up and forms a
 * descending sequence of alternating colours down to the bottom of its pile.
 */
export function canPickUp(state: GameState, from: PileRef, cardIndex: number): boolean {
  if (from.kind === 'waste') {
    return cardIndex === state.waste.length - 1 && state.waste[cardIndex]?.faceUp === true;
  }
  if (from.kind === 'foundation') {
    const pile = state.foundations[from.index];
    return !!pile && cardIndex === pile.length - 1;
  }
  if (from.kind === 'tableau') {
    const pile = state.tableau[from.index];
    if (!pile || cardIndex < 0 || cardIndex >= pile.length) return false;
    const run = pile.slice(cardIndex);
    if (!run.every((card) => card.faceUp)) return false;
    for (let i = 1; i < run.length; i += 1) {
      if (run[i - 1].rank !== run[i].rank + 1) return false;
      if (suitColor(run[i - 1].suit) === suitColor(run[i].suit)) return false;
    }
    return true;
  }
  return false;
}

/**
 * Where a group of cards may land: a foundation takes a single card on its
 * next rank, a tableau accepts a king on an empty column or the next rank in
 * the opposite colour.
 */
export function canDrop(state: GameState, cards: readonly Card[], to: PileRef): boolean {
  if (cards.length === 0) return false;

  if (to.kind === 'foundation') {
    const pile = state.foundations[to.index];
    if (!pile || cards.length !== 1) return false;
    const card = cards[0];
    const top = pile[pile.length - 1];
    if (!top) return card.rank === 1;
    return card.suit === top.suit && card.rank === top.rank + 1;
  }

  if (to.kind === 'tableau') {
    const pile = state.tableau[to.index];
    if (!pile) return false;
    const card = cards[0];
    const top = pile[pile.length - 1];
    if (!top) return card.rank === 13;
    if (!top.faceUp) return false;
    return suitColor(card.suit) !== suitColor(top.suit) && card.rank === top.rank - 1;
  }

  return false;
}

function scoreForMove(from: PileRef, to: PileRef): number {
  if (to.kind === 'foundation') return SCORE_RULES.toFoundation;
  if (to.kind === 'tableau') {
    if (from.kind === 'waste') return SCORE_RULES.wasteToTableau;
    if (from.kind === 'foundation') return SCORE_RULES.foundationToTableau;
  }
  return 0;
}

/**
 * Applies a move, or returns null when the rules reject it. The exposed card
 * of the source column is turned over automatically and scores.
 */
export function moveCards(
  state: GameState,
  from: PileRef,
  cardIndex: number,
  to: PileRef,
): GameState | null {
  if (from.kind === to.kind && from.index === to.index) return null;
  if (!canPickUp(state, from, cardIndex)) return null;
  const cards = pileCards(state, from).slice(cardIndex);
  if (!canDrop(state, cards, to)) return null;

  const next = cloneState(state);
  const source = pileArray(next, from);
  source.splice(cardIndex, cards.length);
  pileArray(next, to).push(...cards);

  next.score += scoreForMove(from, to);

  if (from.kind === 'tableau' && cardIndex > 0) {
    const exposed = source[cardIndex - 1];
    if (exposed && !exposed.faceUp) {
      source[cardIndex - 1] = { ...exposed, faceUp: true };
      next.score += SCORE_RULES.turnOverCard;
    }
  }

  next.moves = state.moves + 1;
  return next;
}

/** Index of the foundation this card can go to, or null when none accepts it. */
export function foundationIndexFor(state: GameState, card: Card): number | null {
  for (let index = 0; index < state.foundations.length; index += 1) {
    const pile = state.foundations[index];
    const top = pile[pile.length - 1];
    if (!top) {
      if (card.rank === 1) return index;
      continue;
    }
    if (top.suit === card.suit && card.rank === top.rank + 1) return index;
  }
  return null;
}

/** Sends the top card of a pile to its foundation, if it fits. */
export function autoMoveToFoundation(state: GameState, from: PileRef): GameState | null {
  const top = topCard(state, from);
  if (!top || !top.faceUp) return null;
  const foundation = foundationIndexFor(state, top);
  if (foundation === null) return null;
  const cardIndex = pileCards(state, from).length - 1;
  return moveCards(state, from, cardIndex, { kind: 'foundation', index: foundation });
}

export interface AutoMove {
  from: PileRef;
  cardIndex: number;
  to: PileRef;
}

/**
 * Next card the auto-complete routine should send to a foundation. Lowest
 * ranks first, which keeps the four piles advancing evenly.
 */
export function findAutoMove(state: GameState): AutoMove | null {
  const sources: PileRef[] = [{ kind: 'waste', index: 0 }];
  for (let index = 0; index < state.tableau.length; index += 1) {
    sources.push({ kind: 'tableau', index });
  }

  let best: { rank: number; move: AutoMove } | null = null;
  for (const from of sources) {
    const pile = pileCards(state, from);
    const cardIndex = pile.length - 1;
    const card = pile[cardIndex];
    if (!card || !card.faceUp) continue;
    const foundation = foundationIndexFor(state, card);
    if (foundation === null) continue;
    if (best && card.rank >= best.rank) continue;
    best = {
      rank: card.rank,
      move: { from, cardIndex, to: { kind: 'foundation', index: foundation } },
    };
  }
  return best ? best.move : null;
}

export function isWon(state: GameState): boolean {
  return state.foundations.every((pile) => pile.length === 13);
}

/**
 * Auto-complete is safe when the stock is empty and every column card is face
 * up: from there, moving any card that fits its foundation never strands a
 * card, so repeatedly asking findAutoMove wins the game.
 */
export function canAutoComplete(state: GameState): boolean {
  return state.stock.length === 0 && state.tableau.every((pile) => pile.every((card) => card.faceUp));
}

/**
 * Standard scoring bonus at the end of a timed game: 700,000 divided by the
 * seconds played, minus two points for every ten seconds.
 */
export function winBonus(seconds: number): number {
  const elapsed = Math.max(1, Math.floor(seconds));
  const bonus = Math.floor(700_000 / elapsed);
  const penalty = 2 * Math.floor(elapsed / 10);
  return Math.max(0, bonus - penalty);
}

/** Applies the end-of-game bonus once, when the last card reaches a foundation. */
export function addWinBonus(state: GameState, seconds: number): GameState {
  return { ...state, score: state.score + winBonus(seconds) };
}
