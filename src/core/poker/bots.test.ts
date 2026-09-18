import { describe, expect, it } from 'vitest';
import { seededRandom } from '../cards/deck';
import { chooseBotAction, createPersonality, handStrength, pickBotNames, type BotTemperament } from './bots';
import { applyAction, createTable, legalActions, startHand, totalPot } from './engine';
import type { TableState } from './types';

interface MatchResult {
  state: TableState;
  hands: number;
  actions: number;
}

/**
 * Plays a whole match of bots. Every action goes through `applyAction`, which
 * throws on anything illegal, and the chips are checked after every move.
 */
function runMatch(options: {
  seed: number;
  seats: number;
  temperament: BotTemperament;
  startingStack?: number;
  maxHands: number;
}): MatchResult {
  const random = seededRandom(options.seed);
  const names = pickBotNames(options.seats, random);
  const first: TableState = createTable({
    players: names.map((name, index) => ({
      id: `p${index}`,
      name,
      isHuman: false,
      personality: createPersonality(options.temperament, random),
    })),
    startingStack: options.startingStack ?? 1000,
    smallBlind: 10,
    bigBlind: 20,
  });
  const totalChips = first.players.reduce((sum, player) => sum + player.stack, 0);

  let state = first;
  let hands = 0;
  let actions = 0;
  while (hands < options.maxHands && state.phase !== 'matchOver') {
    state = startHand(state, random).state;
    hands += 1;
    while (state.phase === 'hand') {
      expect(legalActions(state)).not.toBeNull();
      const action = chooseBotAction(state, random);
      state = applyAction(state, action).state;
      actions += 1;
      expect(actions).toBeLessThan(2000);
      expect(state.players.reduce((sum, player) => sum + player.stack, 0) + totalPot(state)).toBe(
        totalChips,
      );
    }
  }
  return { state, hands, actions };
}

describe('bot personalities', () => {
  it('drags every knob inside 0..1 and varies between rivals', () => {
    const random = seededRandom(7);
    for (const temperament of ['calm', 'balanced', 'wild'] as const) {
      const personalities = Array.from({ length: 6 }, () => createPersonality(temperament, random));
      for (const personality of personalities) {
        for (const value of Object.values(personality)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
      const distinct = new Set(personalities.map((personality) => JSON.stringify(personality)));
      expect(distinct.size).toBeGreaterThan(1);
    }
  });

  it('picks distinct names', () => {
    const random = seededRandom(3);
    const names = pickBotNames(6, random);
    expect(new Set(names).size).toBe(6);
  });
});

describe('hand strength', () => {
  it('rates a big pair over a weak offsuit hand before the flop', () => {
    const random = seededRandom(11);
    const names = pickBotNames(2, random);
    const state = createTable({
      players: names.map((name, index) => ({
        id: `p${index}`,
        name,
        isHuman: false,
        personality: createPersonality('balanced', random),
      })),
      startingStack: 1000,
      smallBlind: 10,
      bigBlind: 20,
    });
    const table = startHand(state, random).state;
    table.players[0].holeCards = [
      { id: 'spades-1', suit: 'spades', rank: 1, faceUp: true },
      { id: 'hearts-1', suit: 'hearts', rank: 1, faceUp: true },
    ];
    table.players[1].holeCards = [
      { id: 'spades-7', suit: 'spades', rank: 7, faceUp: true },
      { id: 'hearts-2', suit: 'hearts', rank: 2, faceUp: true },
    ];
    expect(handStrength(table, 0)).toBeGreaterThan(handStrength(table, 1));
    // Later streets keep the value inside its range.
    table.community = [
      { id: 'clubs-13', suit: 'clubs', rank: 13, faceUp: true },
      { id: 'diamonds-12', suit: 'diamonds', rank: 12, faceUp: true },
      { id: 'clubs-2', suit: 'clubs', rank: 2, faceUp: true },
    ];
    for (const seat of [0, 1]) {
      expect(handStrength(table, seat)).toBeGreaterThanOrEqual(0);
      expect(handStrength(table, seat)).toBeLessThanOrEqual(1);
    }
  });
});

describe('bot matches', () => {
  it('plays 50 hands of a full table without a single illegal action', () => {
    const result = runMatch({ seed: 1234, seats: 6, temperament: 'balanced', maxHands: 50 });
    expect(result.hands).toBe(50);
    expect(result.actions).toBeGreaterThan(200);
  });

  it('plays wild and calm tables from every seat count', () => {
    for (const seats of [2, 3, 6]) {
      for (const temperament of ['calm', 'wild'] as const) {
        const result = runMatch({ seed: 100 + seats, seats, temperament, maxHands: 12 });
        expect(result.hands).toBeGreaterThan(0);
        // A heads-up match can end before the hand limit and that is fine.
        expect(result.state.phase === 'matchOver' || result.hands === 12).toBe(true);
      }
    }
  });

  it('finishes a short match with a single player holding the chips', () => {
    const result = runMatch({
      seed: 77,
      seats: 6,
      temperament: 'wild',
      startingStack: 200,
      maxHands: 400,
    });
    expect(result.state.phase).toBe('matchOver');
    const alive = result.state.players.filter((player) => player.stack > 0);
    expect(alive).toHaveLength(1);
    expect(result.actions).toBeGreaterThan(0);
  });
});
