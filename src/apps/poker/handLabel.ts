/**
 * Hand names for the table. The evaluator returns a category and tie-break
 * ranks; this module turns that into the translated phrase of the interface.
 */
import { rankLabel, type Rank } from '../../core/cards/deck';
import type { TranslationKey } from '../../core/i18n/es';
import type { HandValue, TableState } from '../../core/poker/types';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export function handLabel(value: HandValue, t: Translate): string {
  const first = rankLabel((value.ranks[0] ?? 0) as Rank);
  const second = rankLabel((value.ranks[1] ?? 0) as Rank);
  switch (value.category) {
    case 'high-card':
      return t('poker.hand.high', { rank: first });
    case 'pair':
      return t('poker.hand.pair', { rank: first });
    case 'two-pair':
      return t('poker.hand.twoPair', { rank: first, second });
    case 'trips':
      return t('poker.hand.trips', { rank: first });
    case 'straight':
      return t('poker.hand.straight', { rank: first });
    case 'flush':
      return t('poker.hand.flush', { rank: first });
    case 'full-house':
      return t('poker.hand.fullHouse', { rank: first, second });
    case 'quads':
      return t('poker.hand.quads', { rank: first });
    case 'straight-flush':
      return first === 'A' ? t('poker.hand.royal') : t('poker.hand.straightFlush', { rank: first });
  }
}

/** One line per pot winner, ready for the table and the screen reader. */
export function resultSummary(state: TableState, t: Translate): string[] {
  const result = state.result;
  if (!result) return [];
  const lines: string[] = [];
  for (const pot of result.pots) {
    for (const winner of pot.winners) {
      const name = state.players[winner.seat]?.name ?? '';
      lines.push(
        winner.hand
          ? t('poker.result.wonWith', { name, amount: winner.amount, hand: handLabel(winner.hand, t) })
          : t('poker.result.won', { name, amount: winner.amount }),
      );
    }
  }
  return lines;
}
