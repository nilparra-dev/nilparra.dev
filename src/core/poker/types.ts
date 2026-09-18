/**
 * Domain types of the poker table.
 *
 * The engine is a pure state machine: every action takes a state and returns
 * a new one, the randomness enters as an injected source and nothing here
 * touches the DOM, React or the translations. That keeps the whole ruleset
 * testable and lets the same code run on a server later.
 */
import type { Card } from '../cards/deck';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export interface PlayerAction {
  type: ActionType;
  /**
   * Chips committed on this street after the action, for `bet` and `raise`
   * ("raise to"). Ignored by fold, check and call.
   */
  amount?: number;
}

/** Everything the seat to act may legally do, with the exact chip amounts. */
export interface LegalActions {
  seat: number;
  /** Chips needed to match the current bet. */
  toCall: number;
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  /** Chips the call really moves; less than `toCall` when the stack is short. */
  callAmount: number;
  callIsAllIn: boolean;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
}

/** 0..1 knobs that make every opponent behave a little differently. */
export interface BotPersonality {
  /** 0 = tight, 1 = plays many hands. */
  looseness: number;
  /** 0 = passive, 1 = bets and raises often. */
  aggression: number;
  /** 0 = never bluffs, 1 = bluffs often. */
  nerve: number;
}

export interface PlayerState {
  id: string;
  name: string;
  isHuman: boolean;
  personality: BotPersonality | null;
  stack: number;
  /** Chips committed on the current street. */
  committed: number;
  /** Chips committed on the whole hand; the side pots use this. */
  totalCommitted: number;
  holeCards: Card[];
  folded: boolean;
  allIn: boolean;
  /** Lost the whole stack: sits out until a new match. */
  out: boolean;
  /** Has acted since the last full raise of this street. */
  acted: boolean;
}

export interface TableConfig {
  players: {
    id: string;
    name: string;
    isHuman: boolean;
    personality: BotPersonality | null;
  }[];
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
}

export type HandCategory =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'trips'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'quads'
  | 'straight-flush';

/** Comparable value of a hand: category plus ordered tie-break ranks. */
export interface HandValue {
  category: HandCategory;
  /** Tie-break ranks, from the most to the least significant. */
  ranks: number[];
  /** The five cards that make the hand, best to worst. */
  cards: Card[];
}

export interface PotResult {
  amount: number;
  winners: { seat: number; amount: number; hand: HandValue | null }[];
}

export interface HandResult {
  showdown: boolean;
  pots: PotResult[];
}

export type TablePhase = 'ready' | 'hand' | 'handComplete' | 'matchOver';

export interface TableState {
  players: PlayerState[];
  /** Remaining deck; the last card is the next one dealt. */
  deck: Card[];
  community: Card[];
  /** Seat of the dealer button; -1 before the first hand. */
  button: number;
  street: Street;
  phase: TablePhase;
  /** Chips collected from previous streets. */
  pot: number;
  /** Highest commitment on the current street. */
  currentBet: number;
  /** Size of the last full raise; the minimum legal raise increment. */
  lastRaiseSize: number;
  /** Seat that has to act, or -1 while nobody does. */
  toAct: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  result: HandResult | null;
}

/** Notable things that happened, for the table log and the seat bubbles. */
export type HandEvent =
  | { kind: 'hand-start'; handNumber: number; button: number }
  | { kind: 'blind'; seat: number; blind: 'small' | 'big'; amount: number }
  | { kind: 'action'; seat: number; action: PlayerAction }
  | { kind: 'street'; street: Street; cards: Card[] }
  | { kind: 'showdown'; seat: number; cards: Card[]; hand: HandValue }
  | { kind: 'payout'; seat: number; amount: number }
  | { kind: 'hand-end'; result: HandResult };
