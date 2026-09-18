/**
 * Opponents for the offline table.
 *
 * A bot decision is a pure function of the state plus its own personality
 * knobs: it never peeks at hidden information it should not have (there is
 * none locally) and it always returns an action that `legalActions` allows.
 * Personalities are drawn per match, so every game feels a little different.
 */
import { rankValue, type Card, type Rank } from '../cards/deck';
import { legalActions, totalPot } from './engine';
import { evaluateHand } from './evaluator';
import type { BotPersonality, HandValue, LegalActions, PlayerAction, TableState } from './types';

export type BotTemperament = 'calm' | 'balanced' | 'wild';

/** Names are plain data, not translated: they are just people at the table. */
const NAME_POOL: readonly string[] = [
  'Laia',
  'Marc',
  'Berta',
  'Pau',
  'Núria',
  'Toni',
  'Sara',
  'Guillem',
  'Jana',
  'Iván',
  'Rita',
  'Ot',
  'Mireia',
  'Ferran',
  'Aina',
  'Nil',
];

/** Distinct names for the rivals of one match. */
export function pickBotNames(count: number, random: () => number): string[] {
  const pool = NAME_POOL.slice();
  const names: string[] = [];
  for (let index = 0; index < count && pool.length > 0; index += 1) {
    const picked = Math.floor(random() * pool.length);
    names.push(pool[picked]);
    pool.splice(picked, 1);
  }
  return names;
}

interface Range {
  min: number;
  max: number;
}

const TEMPERAMENTS: Record<BotTemperament, { looseness: Range; aggression: Range; nerve: Range }> = {
  calm: {
    looseness: { min: 0.2, max: 0.4 },
    aggression: { min: 0.1, max: 0.3 },
    nerve: { min: 0, max: 0.15 },
  },
  balanced: {
    looseness: { min: 0.35, max: 0.6 },
    aggression: { min: 0.3, max: 0.55 },
    nerve: { min: 0.1, max: 0.3 },
  },
  wild: {
    looseness: { min: 0.5, max: 0.8 },
    aggression: { min: 0.55, max: 0.9 },
    nerve: { min: 0.25, max: 0.5 },
  },
};

export function createPersonality(temperament: BotTemperament, random: () => number): BotPersonality {
  const ranges = TEMPERAMENTS[temperament];
  const pick = (range: Range) => range.min + random() * (range.max - range.min);
  return {
    looseness: pick(ranges.looseness),
    aggression: pick(ranges.aggression),
    nerve: pick(ranges.nerve),
  };
}

const DEFAULT_PERSONALITY: BotPersonality = { looseness: 0.4, aggression: 0.4, nerve: 0.15 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function chenPoints(rank: number): number {
  if (rank === 14) return 10;
  if (rank === 13) return 8;
  if (rank === 12) return 7;
  if (rank === 11) return 6;
  return rank / 2;
}

/** Chen formula, normalised to 0..1: a decent read of the two hole cards. */
function preflopStrength(first: Card, second: Card): number {
  const high = Math.max(rankValue(first.rank), rankValue(second.rank));
  const low = Math.min(rankValue(first.rank), rankValue(second.rank));
  const pair = first.rank === second.rank;
  let score = pair ? Math.max(5, chenPoints(high) * 2) : chenPoints(high);
  if (first.suit === second.suit) score += 2;
  if (!pair) {
    const gap = high - low - 1;
    if (gap === 1) score -= 1;
    else if (gap === 2) score -= 2;
    else if (gap === 3) score -= 4;
    else if (gap >= 4) score -= 5;
    if (gap <= 1 && high < 12 && low > 1) score += 1;
  }
  return clamp((score + 1) / 21, 0, 1);
}

const CATEGORY_STRENGTH: Record<HandValue['category'], number> = {
  'high-card': 0.14,
  pair: 0.36,
  'two-pair': 0.55,
  trips: 0.72,
  straight: 0.82,
  flush: 0.88,
  'full-house': 0.93,
  quads: 0.97,
  'straight-flush': 1,
};

/** 0..1 strength of the current hand of a seat, hole cards plus board. */
export function handStrength(state: TableState, seat: number): number {
  const player = state.players[seat];
  if (player.holeCards.length < 2) return 0;
  if (state.community.length === 0) return preflopStrength(player.holeCards[0], player.holeCards[1]);

  const value = evaluateHand([...player.holeCards, ...state.community]);
  let strength = CATEGORY_STRENGTH[value.category];
  const mainRank = rankValue((value.ranks[0] ?? 7) as Rank);
  strength += (mainRank - 7) * 0.006;
  // A hand that only plays the board is a chop at best: treat it as weak.
  const usesHoleCard = value.cards.some((card) =>
    player.holeCards.some((hole) => hole.id === card.id),
  );
  if (!usesHoleCard) strength = Math.min(strength, 0.32);
  return clamp(strength, 0, 1);
}

function raiseAction(
  state: TableState,
  legal: LegalActions,
  personality: BotPersonality,
  random: () => number,
  kind: 'value' | 'bluff',
): PlayerAction {
  const type = state.currentBet === 0 ? 'bet' : 'raise';
  const { minRaiseTo: min, maxRaiseTo: max } = legal;
  if (min >= max) return { type, amount: max };

  const pot = totalPot(state);
  const unit = Math.max(1, Math.round(state.bigBlind / 2));
  let target: number;
  if (kind === 'bluff') {
    target = pot * 0.6;
  } else if (state.currentBet > 0) {
    target = state.currentBet * (2.5 + personality.aggression);
  } else {
    target = pot * (0.6 + personality.aggression * 0.5);
  }
  const jitter = (random() - 0.5) * 2 * state.bigBlind;
  let amount = Math.round((target + jitter) / unit) * unit;
  amount = clamp(amount, min, max);
  if (amount >= max - unit) amount = max;
  return { type, amount };
}

/**
 * The action of the seat to act. Throwing here would mean the engine and the
 * bot disagreed; the tests play thousands of hands to make sure they never do.
 */
export function chooseBotAction(state: TableState, random: () => number): PlayerAction {
  const legal = legalActions(state);
  if (!legal) throw new Error('The bot is not on turn');
  const player = state.players[legal.seat];
  const personality = player.personality ?? DEFAULT_PERSONALITY;
  const strength = handStrength(state, legal.seat);
  const noise = (random() - 0.5) * 0.12;
  const effective = clamp(strength + noise + personality.looseness * 0.08, 0, 1.05);

  if (legal.canRaise) {
    const raiseThreshold = 0.74 - personality.aggression * 0.22;
    if (effective >= raiseThreshold) return raiseAction(state, legal, personality, random, 'value');
    const bluffChance = personality.nerve * (legal.toCall === 0 ? 0.09 : 0.025);
    if (effective > 0.25 && random() < bluffChance) {
      return raiseAction(state, legal, personality, random, 'bluff');
    }
  }

  if (legal.canCheck) return { type: 'check' };

  if (legal.canCall) {
    const pot = totalPot(state);
    const needed = legal.callAmount / (pot + legal.callAmount);
    const courage = effective + personality.nerve * 0.06;
    if (courage >= needed) return { type: 'call' };
    return { type: 'fold' };
  }

  // Unreachable with the current rules, but a bot must never return something
  // the engine would reject.
  return { type: 'fold' };
}
