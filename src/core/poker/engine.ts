/**
 * Texas Hold'em table as a pure state machine.
 *
 * Every function takes a state and returns a new one: no mutation of the
 * caller's object, no DOM, no translations and no ambient randomness. The
 * random source is a parameter so tests can replay exact deals and a future
 * server can own the shuffle.
 *
 * Betting rules that the implementation takes care of on purpose:
 *   - the big blind always owns the last word preflop (option to raise);
 *   - a full raise reopens the action of everyone else, a short all-in raise
 *     does not (players who already acted may only call or fold);
 *   - nobody may raise when every other player in the hand is all-in;
 *   - when no further betting is possible the remaining streets run out and
 *     the showdown decides the pots, side pots included.
 */
import { createDeck, shuffle, type Card } from '../cards/deck';
import { compareHands, evaluateHand } from './evaluator';
import type {
  HandEvent,
  HandResult,
  HandValue,
  LegalActions,
  PlayerAction,
  PlayerState,
  PotResult,
  Street,
  TableConfig,
  TableState,
} from './types';

export const MAX_SEATS = 6;
const HOLE_CARDS = 2;
const STREETS: readonly Street[] = ['preflop', 'flop', 'turn', 'river'];

/* ------------------------------------------------------------------ *
 * Construction
 * ------------------------------------------------------------------ */

export function createTable(config: TableConfig): TableState {
  if (config.players.length < 2 || config.players.length > MAX_SEATS) {
    throw new Error(`A poker table seats between 2 and ${MAX_SEATS} players`);
  }
  if (config.smallBlind <= 0 || config.bigBlind <= config.smallBlind) {
    throw new Error('Invalid blinds');
  }
  if (config.startingStack < config.bigBlind) {
    throw new Error('Every player needs at least one big blind');
  }
  return {
    players: config.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHuman: player.isHuman,
      personality: player.personality,
      stack: config.startingStack,
      committed: 0,
      totalCommitted: 0,
      holeCards: [],
      folded: false,
      allIn: false,
      out: false,
      acted: false,
    })),
    deck: [],
    community: [],
    button: -1,
    street: 'preflop',
    phase: 'ready',
    pot: 0,
    currentBet: 0,
    lastRaiseSize: config.bigBlind,
    toAct: -1,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    handNumber: 0,
    result: null,
  };
}

/* ------------------------------------------------------------------ *
 * Small helpers over the state
 * ------------------------------------------------------------------ */

function cloneState(state: TableState): TableState {
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      holeCards: player.holeCards.slice(),
      personality: player.personality,
    })),
    deck: state.deck.slice(),
    community: state.community.slice(),
  };
}

/** Seats in play order, starting right after `from` and wrapping around. */
function orderFrom(state: TableState, from: number): number[] {
  const total = state.players.length;
  const seats: number[] = [];
  for (let step = 1; step <= total; step += 1) {
    seats.push((from + step + total) % total);
  }
  return seats;
}

function nextSeat(state: TableState, from: number, predicate: (player: PlayerState) => boolean): number {
  for (const seat of orderFrom(state, from)) {
    if (predicate(state.players[seat])) return seat;
  }
  return -1;
}

function inHand(player: PlayerState): boolean {
  return !player.out && !player.folded;
}

function canAct(player: PlayerState): boolean {
  return inHand(player) && !player.allIn;
}

/** A player is pending when the action has not closed for them yet. */
function needsToAct(player: PlayerState, state: TableState): boolean {
  return canAct(player) && (!player.acted || player.committed < state.currentBet);
}

function nextToAct(state: TableState, from: number): number {
  return nextSeat(state, from, (player) => needsToAct(player, state));
}

function countCanAct(state: TableState): number {
  return state.players.filter(canAct).length;
}

function playersWithChips(state: TableState): number {
  return state.players.filter((player) => player.stack > 0).length;
}

/** A player without chips sits out immediately, so the table can grey them. */
function refreshOutFlags(state: TableState): void {
  for (const player of state.players) player.out = player.stack <= 0;
}

function commit(player: PlayerState, chips: number): number {
  const amount = Math.max(0, Math.min(chips, player.stack));
  player.stack -= amount;
  player.committed += amount;
  player.totalCommitted += amount;
  if (player.stack === 0) player.allIn = true;
  return amount;
}

function seatOf(state: TableState, player: PlayerState): number {
  return state.players.indexOf(player);
}

/* ------------------------------------------------------------------ *
 * Public queries
 * ------------------------------------------------------------------ */

/** Chips in the middle, including the current street commitments. */
export function totalPot(state: TableState): number {
  return state.pot + state.players.reduce((sum, player) => sum + player.committed, 0);
}

/** What the seat to act may legally do, or null when the table is waiting. */
export function legalActions(state: TableState): LegalActions | null {
  if (state.phase !== 'hand' || state.toAct < 0) return null;
  const seat = state.toAct;
  const player = state.players[seat];
  const toCall = Math.max(0, state.currentBet - player.committed);
  const maxRaiseTo = player.committed + player.stack;
  const responders = state.players.filter(
    (other, index) => index !== seat && canAct(other),
  ).length;
  const canRaise = !player.acted && responders > 0 && maxRaiseTo > state.currentBet;
  const callAmount = Math.min(toCall, player.stack);
  return {
    seat,
    toCall,
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    callAmount,
    callIsAllIn: callAmount >= player.stack,
    canRaise,
    minRaiseTo: Math.min(state.currentBet + state.lastRaiseSize, maxRaiseTo),
    maxRaiseTo,
  };
}

/* ------------------------------------------------------------------ *
 * Hand start
 * ------------------------------------------------------------------ */

export interface HandStep {
  state: TableState;
  events: HandEvent[];
}

export function startHand(state: TableState, random: () => number): HandStep {
  if (state.phase === 'hand') throw new Error('A hand is already in progress');
  if (state.phase === 'matchOver') throw new Error('The match is over');

  const next = cloneState(state);
  for (const player of next.players) player.out = player.stack <= 0;
  if (playersWithChips(next) < 2) {
    next.phase = 'matchOver';
    return { state: next, events: [] };
  }

  for (const player of next.players) {
    player.folded = player.out;
    player.allIn = false;
    player.committed = 0;
    player.totalCommitted = 0;
    player.acted = false;
    player.holeCards = [];
  }

  next.button =
    next.button < 0
      ? nextSeat(next, Math.floor(random() * next.players.length) - 1, (player) => !player.out)
      : nextSeat(next, next.button, (player) => !player.out);
  const aliveSeats = orderFrom(next, next.button).filter((seat) => !next.players[seat].out);
  // Heads-up: the button is the small blind and acts first preflop.
  const smallBlindSeat = aliveSeats.length === 2 ? next.button : aliveSeats[0];
  const bigBlindSeat = aliveSeats.length === 2 ? aliveSeats[0] : aliveSeats[1];

  const events: HandEvent[] = [];
  next.handNumber += 1;
  next.deck = shuffle(createDeck(), random);
  next.community = [];
  next.pot = 0;
  next.street = 'preflop';
  next.currentBet = 0;
  next.lastRaiseSize = next.bigBlind;
  next.result = null;
  next.phase = 'hand';

  // Two rounds of one card each, starting at the small blind.
  const dealOrder = orderFrom(next, smallBlindSeat - 1).filter((seat) => !next.players[seat].out);
  for (let round = 0; round < HOLE_CARDS; round += 1) {
    for (const seat of dealOrder) {
      const card = next.deck.pop();
      if (!card) throw new Error('The deck ran out while dealing');
      next.players[seat].holeCards.push({ ...card, faceUp: true });
    }
  }

  const smallBlind = next.players[smallBlindSeat];
  const bigBlind = next.players[bigBlindSeat];
  const postedSmall = commit(smallBlind, next.smallBlind);
  const postedBig = commit(bigBlind, next.bigBlind);
  next.currentBet = next.bigBlind;
  events.push({ kind: 'hand-start', handNumber: next.handNumber, button: next.button });
  events.push({ kind: 'blind', seat: seatOf(next, smallBlind), blind: 'small', amount: postedSmall });
  events.push({ kind: 'blind', seat: seatOf(next, bigBlind), blind: 'big', amount: postedBig });

  next.toAct = nextToAct(next, bigBlindSeat);
  while (next.phase === 'hand' && next.toAct < 0) completeStreet(next, events);
  return { state: next, events };
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

export function applyAction(state: TableState, action: PlayerAction): HandStep {
  if (state.phase !== 'hand' || state.toAct < 0) throw new Error('No hand in progress');
  const legal = legalActions(state);
  if (!legal) throw new Error('No hand in progress');

  const next = cloneState(state);
  const seat = next.toAct;
  const player = next.players[seat];
  const events: HandEvent[] = [];

  switch (action.type) {
    case 'fold': {
      player.folded = true;
      player.acted = true;
      events.push({ kind: 'action', seat, action });
      break;
    }
    case 'check': {
      if (legal.toCall > 0) throw new Error('Cannot check facing a bet');
      player.acted = true;
      events.push({ kind: 'action', seat, action });
      break;
    }
    case 'call': {
      if (legal.toCall === 0) throw new Error('There is nothing to call');
      commit(player, legal.callAmount);
      player.acted = true;
      events.push({ kind: 'action', seat, action });
      break;
    }
    case 'bet':
    case 'raise': {
      if (!legal.canRaise) throw new Error('The player cannot raise');
      const amount = action.amount;
      if (typeof amount !== 'number' || !Number.isInteger(amount)) {
        throw new Error('A bet or raise needs an integer amount');
      }
      if (amount < legal.minRaiseTo || amount > legal.maxRaiseTo) {
        throw new Error(`The raise must be between ${legal.minRaiseTo} and ${legal.maxRaiseTo}`);
      }
      if (action.type === 'bet' && next.currentBet !== 0) {
        throw new Error('A bet cannot be placed over an existing bet');
      }
      if (action.type === 'raise' && next.currentBet === 0) {
        throw new Error('A raise needs a previous bet');
      }
      const raiseSize = amount - next.currentBet;
      const isFullRaise = raiseSize >= next.lastRaiseSize;
      commit(player, amount - player.committed);
      player.acted = true;
      if (isFullRaise) {
        next.lastRaiseSize = raiseSize;
        for (const other of next.players) {
          if (other !== player && canAct(other)) other.acted = false;
        }
      }
      next.currentBet = Math.max(next.currentBet, amount);
      events.push({ kind: 'action', seat, action });
      break;
    }
    default: {
      const exhaustive: never = action.type;
      throw new Error(`Unknown action ${exhaustive}`);
    }
  }

  if (next.players.filter(inHand).length === 1) {
    finishByFold(next, events);
    return { state: next, events };
  }

  next.toAct = nextToAct(next, seat);
  while (next.phase === 'hand' && next.toAct < 0) completeStreet(next, events);
  return { state: next, events };
}

/* ------------------------------------------------------------------ *
 * Streets, showdown and pots
 * ------------------------------------------------------------------ */

function completeStreet(state: TableState, events: HandEvent[]): void {
  for (const player of state.players) {
    state.pot += player.committed;
    player.committed = 0;
    player.acted = false;
  }
  state.currentBet = 0;
  state.lastRaiseSize = state.bigBlind;

  if (state.street === 'river') {
    showdown(state, events);
    return;
  }

  const index = STREETS.indexOf(state.street);
  const street = STREETS[index + 1];
  // One card is burned before every street, like on a real table.
  state.deck.pop();
  const count = street === 'flop' ? 3 : 1;
  const dealt: Card[] = [];
  for (let card = 0; card < count; card += 1) {
    const drawn = state.deck.pop();
    if (!drawn) throw new Error('The deck ran out while dealing the board');
    dealt.push({ ...drawn, faceUp: true });
  }
  state.community.push(...dealt);
  state.street = street;
  events.push({ kind: 'street', street, cards: dealt });
  // With a single player able to act there is nobody to bet against: the
  // remaining streets run out and the showdown settles the pots.
  state.toAct = countCanAct(state) <= 1 ? -1 : nextToAct(state, state.button);
}

function finishByFold(state: TableState, events: HandEvent[]): void {
  const winner = state.players.find(inHand);
  if (!winner) throw new Error('No winner found');
  const amount = state.pot + state.players.reduce((sum, player) => sum + player.committed, 0);
  winner.stack += amount;
  for (const player of state.players) player.committed = 0;
  state.pot = 0;
  const seat = seatOf(state, winner);
  const result: HandResult = {
    showdown: false,
    pots: [{ amount, winners: [{ seat, amount, hand: null }] }],
  };
  state.result = result;
  state.toAct = -1;
  refreshOutFlags(state);
  state.phase = playersWithChips(state) < 2 ? 'matchOver' : 'handComplete';
  events.push({ kind: 'payout', seat, amount });
  events.push({ kind: 'hand-end', result });
}

interface Pot {
  amount: number;
  /** Seats that can win it, already in seat order. */
  eligible: number[];
}

/**
 * Splits the committed chips into a main pot and side pots. Folded chips stay
 * in the pot; a single player with the largest commitment gets the uncalled
 * excess back before anything is split.
 */
function collectPots(state: TableState): Pot[] {
  const players = state.players;
  const commits = players.map((player) => player.totalCommitted);

  const sorted = [...commits].sort((a, b) => b - a);
  const largest = sorted[0] ?? 0;
  const second = sorted.find((value) => value < largest) ?? 0;
  const largestSeats = commits.reduce<number[]>((seats, value, seat) => {
    if (value === largest) seats.push(seat);
    return seats;
  }, []);
  if (largestSeats.length === 1 && largest > second) {
    const seat = largestSeats[0];
    const refund = largest - second;
    commits[seat] -= refund;
    players[seat].totalCommitted -= refund;
    players[seat].stack += refund;
  }

  const levels = [...new Set(commits.filter((value) => value > 0))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let previous = 0;
  for (const level of levels) {
    let amount = 0;
    for (let seat = 0; seat < players.length; seat += 1) {
      amount += Math.max(0, Math.min(commits[seat], level) - Math.min(commits[seat], previous));
    }
    const eligible = players
      .map((player, seat) => (inHand(player) && commits[seat] >= level ? seat : -1))
      .filter((seat) => seat >= 0);
    if (amount > 0) {
      if (eligible.length > 0) {
        pots.push({ amount, eligible });
      } else if (pots.length > 0) {
        // Only reachable with folded chips above the last eligible level;
        // the money still belongs to the pot the contenders are playing for.
        pots[pots.length - 1].amount += amount;
      }
    }
    previous = level;
  }

  // Pots shared by the same seats are one pot for everyone watching.
  const merged: Pot[] = [];
  for (const pot of pots) {
    const existing = merged.find(
      (candidate) =>
        candidate.eligible.length === pot.eligible.length &&
        candidate.eligible.every((seat, index) => seat === pot.eligible[index]),
    );
    if (existing) existing.amount += pot.amount;
    else merged.push({ ...pot });
  }
  return merged;
}

function showdown(state: TableState, events: HandEvent[]): void {
  const contenders = state.players
    .map((player, seat) => ({ player, seat }))
    .filter(({ player }) => inHand(player));

  const values = new Map<number, HandValue>();
  for (const { player, seat } of contenders) {
    values.set(seat, evaluateHand([...player.holeCards, ...state.community]));
  }
  for (const { player, seat } of contenders) {
    events.push({ kind: 'showdown', seat, cards: player.holeCards, hand: values.get(seat) as HandValue });
  }

  const pots = collectPots(state);
  const results: PotResult[] = [];
  for (const pot of pots) {
    let best: HandValue | null = null;
    for (const seat of pot.eligible) {
      const value = values.get(seat) as HandValue;
      if (!best || compareHands(value, best) > 0) best = value;
    }
    const winners = pot.eligible.filter((seat) => compareHands(values.get(seat) as HandValue, best as HandValue) === 0);
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    // Odd chips go to the first winners left of the button, one by one.
    const order = orderFrom(state, state.button).filter((seat) => winners.includes(seat));
    const payouts = new Map<number, number>();
    for (const seat of order) {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      const amount = share + extra;
      payouts.set(seat, (payouts.get(seat) ?? 0) + amount);
      state.players[seat].stack += amount;
    }
    results.push({
      amount: pot.amount,
      winners: winners.map((seat) => ({
        seat,
        amount: payouts.get(seat) ?? 0,
        hand: values.get(seat) as HandValue,
      })),
    });
  }

  for (const pot of results) {
    for (const winner of pot.winners) {
      events.push({ kind: 'payout', seat: winner.seat, amount: winner.amount });
    }
  }

  state.pot = 0;
  const result: HandResult = { showdown: true, pots: results };
  state.result = result;
  state.toAct = -1;
  refreshOutFlags(state);
  state.phase = playersWithChips(state) < 2 ? 'matchOver' : 'handComplete';
  events.push({ kind: 'hand-end', result });
}
