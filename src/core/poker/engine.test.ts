import { describe, expect, it } from 'vitest';
import { seededRandom, type Card, type Rank, type Suit } from '../cards/deck';
import { applyAction, createTable, legalActions, startHand, totalPot } from './engine';
import type { PlayerAction, TableState } from './types';

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

function hand(specification: string): Card[] {
  return specification.split(' ').map((token) => {
    const rank = RANK_BY_LABEL[token.slice(0, -1)];
    const suit = SUIT_BY_LETTER[token.slice(-1)];
    if (!rank || !suit) throw new Error(`Bad card token: ${token}`);
    return { id: `${suit}-${rank}`, suit, rank, faceUp: true };
  });
}

interface Started {
  state: TableState;
  random: () => number;
}

/**
 * Table with the exact stacks of the test, a known button for the first hand
 * and a seeded random source. Tests may then rig the deck and the hole cards
 * before any action, which is how the showdown cases stay readable.
 */
function start(
  stacks: number[],
  button: number,
  options: { smallBlind?: number; bigBlind?: number; seed?: number } = {},
): Started {
  const players = stacks.map((_, index) => ({
    id: `p${index}`,
    name: `P${index}`,
    isHuman: false,
    personality: null,
  }));
  const state = createTable({
    players,
    startingStack: Math.max(...stacks, 1000),
    smallBlind: options.smallBlind ?? 10,
    bigBlind: options.bigBlind ?? 20,
  });
  stacks.forEach((stack, index) => {
    state.players[index].stack = stack;
  });
  state.button = (button - 1 + stacks.length) % stacks.length;
  const random = seededRandom(options.seed ?? 1);
  return { state: startHand(state, random).state, random };
}

/** The next pops of the deck are the given cards, in order. */
function rigDeck(state: TableState, popOrder: Card[]): void {
  state.deck = popOrder.slice().reverse();
}

function act(state: TableState, _random: () => number, action: PlayerAction): TableState {
  return applyAction(state, action).state;
}

function chips(state: TableState): number {
  return state.players.reduce((sum, player) => sum + player.stack, 0) + totalPot(state);
}

describe('createTable', () => {
  it('rejects tables that cannot play', () => {
    const players = [
      { id: 'a', name: 'A', isHuman: false, personality: null },
      { id: 'b', name: 'B', isHuman: false, personality: null },
    ];
    const base = { players, startingStack: 1000, smallBlind: 10, bigBlind: 20 };
    expect(() => createTable({ ...base, players: players.slice(0, 1) })).toThrow();
    expect(() => createTable({ ...base, smallBlind: 0 })).toThrow();
    expect(() => createTable({ ...base, bigBlind: 10 })).toThrow();
    expect(() => createTable({ ...base, startingStack: 10 })).toThrow();
  });
});

describe('startHand', () => {
  it('deals two cards, posts the blinds and gives the action to the first seat', () => {
    const { state } = start([1000, 1000, 1000], 0);
    expect(state.phase).toBe('hand');
    expect(state.handNumber).toBe(1);
    expect(state.button).toBe(0);
    expect(state.players[1].committed).toBe(10);
    expect(state.players[2].committed).toBe(20);
    expect(state.toAct).toBe(0);
    expect(state.players.every((player) => player.holeCards.length === 2)).toBe(true);
    expect(totalPot(state)).toBe(30);
    expect(chips(state)).toBe(3000);
  });

  it('plays heads-up with the button on the small blind', () => {
    const { state } = start([1000, 1000], 0);
    expect(state.players[0].committed).toBe(10);
    expect(state.players[1].committed).toBe(20);
    expect(state.toAct).toBe(0);
    const legal = legalActions(state);
    expect(legal).toMatchObject({ seat: 0, toCall: 10, canCheck: false, canCall: true, canRaise: true });
    expect(legal?.minRaiseTo).toBe(40);
  });

  it('starts the same game with the same seed', () => {
    const first = start([1000, 1000, 1000], 0, { seed: 99 });
    const second = start([1000, 1000, 1000], 0, { seed: 99 });
    expect(first.state.players.map((player) => player.holeCards.map((card) => card.id))).toEqual(
      second.state.players.map((player) => player.holeCards.map((card) => card.id)),
    );
  });

  it('refuses a second hand while one is running', () => {
    const { state, random } = start([1000, 1000, 1000], 0);
    expect(() => startHand(state, random)).toThrow();
  });
});

describe('betting rounds', () => {
  it('closes preflop when everyone calls and the big blind checks', () => {
    const { state, random } = start([1000, 1000, 1000], 0);
    let table = act(state, random, { type: 'call' });
    table = act(table, random, { type: 'call' });
    expect(table.toAct).toBe(2);
    table = act(table, random, { type: 'check' });
    expect(table.street).toBe('flop');
    expect(table.community).toHaveLength(3);
    expect(table.toAct).toBe(1);
    expect(table.pot).toBe(60);
    expect(table.players.every((player) => player.committed === 0)).toBe(true);
    const legal = legalActions(table);
    expect(legal).toMatchObject({ seat: 1, toCall: 0, canCheck: true, canRaise: true });
    expect(legal?.minRaiseTo).toBe(20);
    expect(chips(table)).toBe(3000);
  });

  it('awards the pot when everybody folds', () => {
    const { state, random } = start([1000, 1000, 1000], 0);
    let table = act(state, random, { type: 'fold' });
    table = act(table, random, { type: 'fold' });
    expect(table.phase).toBe('handComplete');
    expect(table.result?.showdown).toBe(false);
    expect(table.result?.pots[0]).toMatchObject({ amount: 30 });
    expect(table.result?.pots[0].winners[0]).toMatchObject({ seat: 2, amount: 30 });
    expect(table.players[2].stack).toBe(1010);
    expect(chips(table)).toBe(3000);
  });

  it('enforces the minimum raise and reopens the action on a full raise', () => {
    const { state, random } = start([1000, 1000, 1000], 0);
    expect(() => act(state, random, { type: 'raise', amount: 30 })).toThrow();

    let table = act(state, random, { type: 'raise', amount: 40 });
    expect(table.currentBet).toBe(40);
    expect(table.lastRaiseSize).toBe(20);
    expect(legalActions(table)?.minRaiseTo).toBe(60);

    table = act(table, random, { type: 'call' });
    expect(legalActions(table)?.toCall).toBe(20);
    expect(legalActions(table)?.canRaise).toBe(true);
  });

  it('does not reopen the action when an all-in raise is short', () => {
    const { state, random } = start([1000, 140, 1000], 0);
    let table = act(state, random, { type: 'raise', amount: 100 });
    expect(table.lastRaiseSize).toBe(80);

    // Seat 1 can only move all-in to 140: a 40 raise, short of the minimum 80.
    expect(legalActions(table)).toMatchObject({ seat: 1, toCall: 90, minRaiseTo: 140, maxRaiseTo: 140 });
    table = act(table, random, { type: 'raise', amount: 140 });
    expect(table.currentBet).toBe(140);
    expect(table.lastRaiseSize).toBe(80);

    table = act(table, random, { type: 'call' });
    // Seat 0 already acted and the short raise did not reopen: call or fold.
    const legal = legalActions(table);
    expect(legal).toMatchObject({ seat: 0, toCall: 40, canCall: true, canRaise: false });
    table = act(table, random, { type: 'call' });
    expect(table.street).toBe('flop');
    expect(chips(table)).toBe(2140);
  });

  it('does not let a player raise when every rival is all-in and runs out the board', () => {
    const { state, random } = start([100, 1000], 0);
    let table = act(state, random, { type: 'raise', amount: 100 });
    // Seat 1 faces the shove: calling is possible, raising is not.
    expect(legalActions(table)).toMatchObject({
      seat: 1,
      toCall: 80,
      canCall: true,
      canRaise: false,
      callIsAllIn: false,
    });
    table = act(table, random, { type: 'call' });
    expect(table.toAct).toBe(-1);
    expect(table.result?.showdown).toBe(true);
    expect(['handComplete', 'matchOver']).toContain(table.phase);
    expect(chips(table)).toBe(1100);
  });

  it('rejects actions that are not legal', () => {
    const { state, random } = start([1000, 1000, 1000], 0);
    expect(() => act(state, random, { type: 'check' })).toThrow();
    expect(() => act(state, random, { type: 'bet', amount: 20 })).toThrow();
    expect(() => act(state, random, { type: 'raise' })).toThrow();
  });
});

describe('showdown and pots', () => {
  it('splits a main pot and a side pot between different winners', () => {
    const { state, random } = start([100, 300, 300], 0);
    const table = state;
    table.players[0].holeCards = hand('8s Ts');
    table.players[1].holeCards = hand('Js 9h');
    table.players[2].holeCards = hand('Ks Kd');
    rigDeck(table, [
      ...hand('4d'), // burn
      ...hand('2c 7d 9s'),
      ...hand('5d'), // burn
      ...hand('Jh'),
      ...hand('6d'), // burn
      ...hand('3c'),
    ]);

    let next = act(table, random, { type: 'raise', amount: 100 });
    next = act(next, random, { type: 'raise', amount: 300 });
    next = act(next, random, { type: 'call' });

    expect(next.phase).toBe('handComplete');
    expect(next.result?.showdown).toBe(true);
    expect(next.result?.pots.map((pot) => pot.amount)).toEqual([300, 400]);
    expect(next.result?.pots[0].winners[0]).toMatchObject({ seat: 0 });
    expect(next.result?.pots[1].winners[0]).toMatchObject({ seat: 1 });
    expect(next.players.map((player) => player.stack)).toEqual([300, 400, 0]);
    expect(chips(next)).toBe(700);
  });

  it('returns the uncalled bet before the showdown', () => {
    const { state, random } = start([100, 60], 0);
    const table = state;
    table.players[0].holeCards = hand('Ks Kd');
    table.players[1].holeCards = hand('As Ah');
    rigDeck(table, [
      ...hand('4d'),
      ...hand('2c 7d 9s'),
      ...hand('5d'),
      ...hand('Jh'),
      ...hand('6d'),
      ...hand('3c'),
    ]);

    let next = act(table, random, { type: 'raise', amount: 100 });
    next = act(next, random, { type: 'call' });

    expect(next.phase).toBe('handComplete');
    expect(next.result?.pots).toHaveLength(1);
    expect(next.result?.pots[0].amount).toBe(120);
    expect(next.players[0].stack).toBe(40);
    expect(next.players[1].stack).toBe(120);
    expect(chips(next)).toBe(160);
  });

  it('splits a tied pot and gives the odd chips to the first seats after the button', () => {
    const { state, random } = start([100, 33, 100, 33], 0, { smallBlind: 1, bigBlind: 2 });
    const table = state;
    table.players[0].holeCards = hand('2s 3d');
    table.players[1].holeCards = hand('4c 5s');
    table.players[3].holeCards = hand('6d 7c');
    rigDeck(table, [
      ...hand('4d'),
      ...hand('Ah Kh Qh'),
      ...hand('5d'),
      ...hand('Jh'),
      ...hand('6d'),
      ...hand('Th'),
    ]);

    let next = act(table, random, { type: 'raise', amount: 33 });
    next = act(next, random, { type: 'call' });
    next = act(next, random, { type: 'call' });
    next = act(next, random, { type: 'fold' });

    expect(next.phase).toBe('handComplete');
    expect(next.result?.pots).toHaveLength(1);
    expect(next.result?.pots[0].amount).toBe(101);
    expect(next.result?.pots[0].winners.map((winner) => winner.seat).sort()).toEqual([0, 1, 3]);
    // 101 / 3 = 33 each and two odd chips: seats 1 and 3 go first.
    expect(next.players.map((player) => player.stack)).toEqual([100, 34, 98, 34]);
    expect(chips(next)).toBe(266);
  });

  it('ends the match when only one player keeps chips', () => {
    const { state, random } = start([100, 100], 0);
    const table = state;
    table.players[0].holeCards = hand('As Ah');
    table.players[1].holeCards = hand('Ks Kh');
    rigDeck(table, [
      ...hand('4d'),
      ...hand('2c 7d 9s'),
      ...hand('5d'),
      ...hand('Jh'),
      ...hand('6d'),
      ...hand('3c'),
    ]);

    let next = act(table, random, { type: 'raise', amount: 100 });
    next = act(next, random, { type: 'call' });

    expect(next.phase).toBe('matchOver');
    expect(next.players[0].stack).toBe(200);
    expect(next.players[1].stack).toBe(0);
    expect(() => startHand(next, random)).toThrow();
  });

  it('rotates the button and skips knocked out players on the next hand', () => {
    const { state, random } = start([1000, 100, 1000], 0);
    const table = state;
    table.players[1].holeCards = hand('Ks Kd');
    table.players[2].holeCards = hand('As Ah');
    rigDeck(table, [
      ...hand('4d'),
      ...hand('2c 7d 9s'),
      ...hand('5d'),
      ...hand('Jh'),
      ...hand('6d'),
      ...hand('3c'),
    ]);

    let next = act(table, random, { type: 'fold' });
    next = act(next, random, { type: 'raise', amount: 100 });
    next = act(next, random, { type: 'call' });
    expect(next.phase).toBe('handComplete');
    expect(next.players[1].stack).toBe(0);
    expect(next.players[1].out).toBe(true);

    next = startHand(next, random).state;
    expect(next.button).toBe(2);
    expect(next.players[1].holeCards).toEqual([]);
    // Heads-up now: seat 2 is the small blind and opens.
    expect(next.players[2].committed).toBe(10);
    expect(next.players[0].committed).toBe(20);
    expect(next.toAct).toBe(2);
    expect(chips(next)).toBe(2100);
  });
});
