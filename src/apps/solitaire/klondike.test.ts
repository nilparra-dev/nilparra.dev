import { describe, expect, it } from 'vitest';
import {
  addWinBonus,
  autoMoveToFoundation,
  canAutoComplete,
  canDrop,
  canPickUp,
  createDeal,
  createDeck,
  drawFromStock,
  findAutoMove,
  foundationIndexFor,
  isWon,
  moveCards,
  pileCards,
  rankLabel,
  suitColor,
  winBonus,
  type Card,
  type GameState,
  type PileRef,
  type Rank,
  type Suit,
} from './klondike';

/** Test card: face up unless the third argument says otherwise. */
function card(rank: Rank, suit: Suit, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

function state(partial: Partial<GameState> = {}): GameState {
  return {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    drawCount: 1,
    score: 0,
    moves: 0,
    seed: 1,
    ...partial,
  };
}

function drawPile(count: number, fromRank: Rank = 13): Card[] {
  const pile: Card[] = [];
  for (let index = 0; index < count; index += 1) {
    pile.push(card((fromRank - index) as Rank, 'hearts', false));
  }
  return pile;
}

const TABLEAU_0: PileRef = { kind: 'tableau', index: 0 };
const TABLEAU_1: PileRef = { kind: 'tableau', index: 1 };
const WASTE: PileRef = { kind: 'waste', index: 0 };
const FOUNDATION_0: PileRef = { kind: 'foundation', index: 0 };

describe('deck and deal', () => {
  it('builds a full deck of 52 distinct cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((item) => item.id)).size).toBe(52);
  });

  it('deals seven columns with only the top card face up', () => {
    const game = createDeal(12345, 1);
    const all = [...game.stock, ...game.waste, ...game.tableau.flat(), ...game.foundations.flat()];
    expect(all).toHaveLength(52);
    expect(new Set(all.map((item) => item.id)).size).toBe(52);
    expect(game.tableau.map((pile) => pile.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(game.stock).toHaveLength(24);
    expect(game.foundations.map((pile) => pile.length)).toEqual([0, 0, 0, 0]);
    for (const pile of game.tableau) {
      expect(pile.filter((item) => item.faceUp)).toHaveLength(1);
      expect(pile[pile.length - 1].faceUp).toBe(true);
    }
    expect(game.stock.every((item) => !item.faceUp)).toBe(true);
  });

  it('is deterministic: the same seed deals the same board', () => {
    const first = createDeal(777, 3);
    const second = createDeal(777, 3);
    expect(first.stock.map((item) => item.id)).toEqual(second.stock.map((item) => item.id));
    expect(first.tableau.map((pile) => pile.map((item) => item.id))).toEqual(
      second.tableau.map((pile) => pile.map((item) => item.id)),
    );

    const other = createDeal(778, 3);
    expect(other.stock.map((item) => item.id)).not.toEqual(first.stock.map((item) => item.id));
  });

  it('labels ranks and colours suits', () => {
    expect(rankLabel(1)).toBe('A');
    expect(rankLabel(11)).toBe('J');
    expect(rankLabel(13)).toBe('K');
    expect(suitColor('hearts')).toBe('red');
    expect(suitColor('clubs')).toBe('black');
  });
});

describe('drawing from the stock', () => {
  it('draws one card face up', () => {
    const stock = [card(1, 'hearts', false), card(2, 'hearts', false), card(3, 'hearts', false)];
    const next = drawFromStock(state({ stock, drawCount: 1 }));
    expect(next.stock.map((item) => item.id)).toEqual(['hearts-1', 'hearts-2']);
    expect(next.waste).toHaveLength(1);
    expect(next.waste[0]).toMatchObject({ id: 'hearts-3', faceUp: true });
  });

  it('draws three cards and leaves the third one on top, like a dealt packet', () => {
    const stock = drawPile(5);
    const next = drawFromStock(state({ stock, drawCount: 3 }));
    // Stock order bottom to top: 13, 12, 11, 10, 9. The three cards come off
    // one by one, so 11 (third from the top) lands on the waste on top.
    expect(next.stock).toHaveLength(2);
    expect(next.waste.map((item) => item.rank)).toEqual([9, 10, 11]);
    expect(next.waste.every((item) => item.faceUp)).toBe(true);
    expect(next.moves).toBe(1);
  });

  it('recycles the waste reversed and charges the draw three penalty', () => {
    const waste = [card(3, 'hearts'), card(2, 'hearts'), card(1, 'hearts')];
    const next = drawFromStock(state({ waste, drawCount: 3 }));
    expect(next.waste).toHaveLength(0);
    expect(next.stock.map((item) => item.id)).toEqual(['hearts-1', 'hearts-2', 'hearts-3']);
    expect(next.stock.every((item) => !item.faceUp)).toBe(true);
    expect(next.score).toBe(-20);

    // Drawing again returns the same sequence, so the cycle is stable.
    const again = drawFromStock(next);
    expect(again.waste.map((item) => item.id)).toEqual(['hearts-3', 'hearts-2', 'hearts-1']);
  });

  it('charges more for recycling when only one card is drawn', () => {
    const next = drawFromStock(state({ waste: [card(1, 'hearts')], drawCount: 1 }));
    expect(next.score).toBe(-100);
  });

  it('does nothing when the stock and the waste are empty', () => {
    const current = state();
    expect(drawFromStock(current)).toBe(current);
  });
});

describe('move validation', () => {
  it('only lets a king start an empty column', () => {
    const king = card(13, 'spades');
    const queen = card(12, 'spades');
    expect(canDrop(state(), [king], TABLEAU_0)).toBe(true);
    expect(canDrop(state(), [queen], TABLEAU_0)).toBe(false);
  });

  it('stacks descending ranks of alternating colours', () => {
    const base = state({ tableau: [[card(6, 'clubs')], [], [], [], [], [], []] });
    expect(canDrop(base, [card(5, 'hearts')], TABLEAU_0)).toBe(true);
    expect(canDrop(base, [card(5, 'spades')], TABLEAU_0)).toBe(false);
    expect(canDrop(base, [card(4, 'hearts')], TABLEAU_0)).toBe(false);
  });

  it('accepts aces on empty foundations and grows them by suit and rank', () => {
    expect(canDrop(state(), [card(1, 'hearts')], FOUNDATION_0)).toBe(true);
    expect(canDrop(state(), [card(2, 'hearts')], FOUNDATION_0)).toBe(false);

    const withAce = state({ foundations: [[card(1, 'hearts')], [], [], []] });
    expect(canDrop(withAce, [card(2, 'hearts')], FOUNDATION_0)).toBe(true);
    expect(canDrop(withAce, [card(2, 'diamonds')], FOUNDATION_0)).toBe(false);
    expect(canDrop(withAce, [card(3, 'hearts')], FOUNDATION_0)).toBe(false);
  });

  it('never moves more than one card to a foundation', () => {
    const board = state({
      foundations: [[card(1, 'hearts')], [], [], []],
      tableau: [[card(3, 'spades'), card(2, 'hearts')], [], [], [], [], [], []],
    });
    expect(canPickUp(board, TABLEAU_0, 0)).toBe(true);
    expect(moveCards(board, TABLEAU_0, 0, FOUNDATION_0)).toBeNull();
  });

  it('refuses face down cards and broken runs', () => {
    const board = state({
      tableau: [[card(9, 'hearts', false), card(8, 'clubs'), card(7, 'hearts')], [], [], [], [], [], []],
    });
    expect(canPickUp(board, TABLEAU_0, 0)).toBe(false);
    expect(canPickUp(board, TABLEAU_0, 1)).toBe(true);
    expect(canPickUp(board, TABLEAU_0, 2)).toBe(true);

    const broken = state({ tableau: [[card(8, 'hearts'), card(7, 'hearts')], [], [], [], [], [], []] });
    expect(canPickUp(broken, TABLEAU_0, 0)).toBe(false);
    expect(canPickUp(broken, TABLEAU_0, 1)).toBe(true);
  });

  it('moves a whole run onto a valid parent', () => {
    const board = state({
      tableau: [
        [card(9, 'hearts'), card(8, 'clubs'), card(7, 'hearts')],
        [card(10, 'clubs')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const next = moveCards(board, TABLEAU_0, 0, TABLEAU_1);
    expect(next).not.toBeNull();
    expect(next?.tableau[0]).toHaveLength(0);
    expect(next?.tableau[1].map((item) => item.rank)).toEqual([10, 9, 8, 7]);
    expect(next?.moves).toBe(1);
  });
});

describe('scoring', () => {
  it('pays five points for turning over the exposed card', () => {
    const board = state({
      tableau: [[card(4, 'clubs', false), card(3, 'hearts')], [card(4, 'spades')], [], [], [], [], []],
    });
    const next = moveCards(board, TABLEAU_0, 1, TABLEAU_1);
    expect(next?.score).toBe(5);
    expect(next?.tableau[0][0].faceUp).toBe(true);
  });

  it('pays ten points for a card that reaches a foundation', () => {
    const board = state({
      foundations: [[card(1, 'hearts')], [], [], []],
      tableau: [[card(2, 'hearts')], [], [], [], [], [], []],
    });
    const next = moveCards(board, TABLEAU_0, 0, FOUNDATION_0);
    expect(next?.score).toBe(10);
    expect(next?.foundations[0].map((item) => item.rank)).toEqual([1, 2]);
  });

  it('pays five points for a waste card that returns to a column', () => {
    const board = state({ waste: [card(6, 'clubs')], tableau: [[card(7, 'hearts')], [], [], [], [], [], []] });
    const next = moveCards(board, WASTE, 0, TABLEAU_0);
    expect(next?.score).toBe(5);
  });

  it('charges fifteen points for pulling a card back out of a foundation', () => {
    const board = state({
      foundations: [[card(1, 'hearts'), card(2, 'hearts')], [], [], []],
      tableau: [[card(3, 'spades')], [], [], [], [], [], []],
    });
    const next = moveCards(board, FOUNDATION_0, 1, TABLEAU_0);
    expect(next?.score).toBe(-15);
    expect(next?.foundations[0]).toHaveLength(1);
  });

  it('never lets a pile drop onto itself', () => {
    const board = state({ waste: [card(6, 'clubs')], tableau: [[card(7, 'hearts')], [], [], [], [], [], []] });
    expect(moveCards(board, WASTE, 0, WASTE)).toBeNull();
  });

  it('pays the standard end of game bonus', () => {
    expect(winBonus(60)).toBe(Math.floor(700_000 / 60) - 12);
    expect(winBonus(1)).toBe(700_000);
    const won = addWinBonus(state({ score: 100 }), 100);
    expect(won.score).toBe(100 + 7000 - 20);
  });
});

describe('foundations, auto play and victory', () => {
  it('finds the foundation that accepts a card', () => {
    const board = state({ foundations: [[card(1, 'spades')], [card(1, 'hearts')], [], []] });
    expect(foundationIndexFor(board, card(2, 'hearts'))).toBe(1);
    expect(foundationIndexFor(board, card(2, 'clubs'))).toBeNull();
    expect(foundationIndexFor(board, card(1, 'clubs'))).toBe(2);
  });

  it('sends the top card of a pile to its foundation', () => {
    const board = state({
      foundations: [[card(1, 'hearts')], [], [], []],
      tableau: [[card(2, 'hearts')], [], [], [], [], [], []],
    });
    const next = autoMoveToFoundation(board, TABLEAU_0);
    expect(next?.foundations[0].map((item) => item.rank)).toEqual([1, 2]);
    expect(autoMoveToFoundation(state(), TABLEAU_0)).toBeNull();
  });

  it('prefers the lowest rank when looking for an automatic move', () => {
    const board = state({
      foundations: [[card(1, 'hearts')], [card(1, 'spades')], [card(1, 'clubs')], []],
      waste: [card(2, 'clubs')],
      tableau: [[card(3, 'hearts')], [], [], [], [], [], []],
    });
    const move = findAutoMove(board);
    expect(move?.from).toEqual(WASTE);
    expect(move?.to).toEqual({ kind: 'foundation', index: 2 });
  });

  it('only offers auto-complete when every card is visible', () => {
    const ready = state({ tableau: [[card(1, 'hearts')], [], [], [], [], [], []] });
    expect(canAutoComplete(ready)).toBe(true);
    expect(canAutoComplete(state({ stock: [card(2, 'clubs', false)] }))).toBe(false);
    const hidden = state({ tableau: [[card(2, 'clubs', false), card(1, 'hearts')], [], [], [], [], [], []] });
    expect(canAutoComplete(hidden)).toBe(false);
  });

  it('is won only when the four foundations hold thirteen cards each', () => {
    const full = (): Card[] => Array.from({ length: 13 }, (_, index) => card((index + 1) as Rank, 'hearts'));
    expect(isWon(state({ foundations: [full(), full(), full(), full()] }))).toBe(true);
    expect(isWon(state({ foundations: [full(), full(), full(), []] }))).toBe(false);
    expect(isWon(createDeal(1, 1))).toBe(false);
  });

  it('reports pile contents for every kind of pile', () => {
    const board = state({
      stock: [card(1, 'clubs', false)],
      waste: [card(2, 'clubs')],
      foundations: [[card(1, 'hearts')], [], [], []],
      tableau: [[card(3, 'hearts')], [], [], [], [], [], []],
    });
    expect(pileCards(board, { kind: 'stock', index: 0 })).toHaveLength(1);
    expect(pileCards(board, WASTE)).toHaveLength(1);
    expect(pileCards(board, FOUNDATION_0)).toHaveLength(1);
    expect(pileCards(board, TABLEAU_0)).toHaveLength(1);
    expect(pileCards(board, { kind: 'tableau', index: 99 })).toHaveLength(0);
  });
});
