import { useEffect, useState } from 'react';
import { useI18n } from '../../core/i18n/I18nProvider';
import { legalActions, totalPot } from '../../core/poker/engine';
import { evaluateHand } from '../../core/poker/evaluator';
import type { PlayerAction, TableState } from '../../core/poker/types';
import { Button } from '../../ui/Button';
import { Slider } from '../../ui/Slider';
import { handLabel, resultSummary } from './handLabel';

interface ActionBarProps {
  state: TableState;
  onAction: (action: PlayerAction) => void;
  onNextHand: () => void;
  onNewMatch: () => void;
}

/** Fold, call and raise controls under the felt, plus the hand results. */
export function ActionBar({ state, onAction, onNextHand, onNewMatch }: ActionBarProps) {
  const { t } = useI18n();
  const legal = legalActions(state);
  const human = state.players[0];
  const [raiseTo, setRaiseTo] = useState(0);

  useEffect(() => {
    if (legal?.canRaise) setRaiseTo(legal.minRaiseTo);
  }, [legal?.seat, legal?.canRaise, legal?.minRaiseTo, legal?.maxRaiseTo]);

  if (state.phase === 'matchOver') {
    const survivor = state.players.find((player) => player.stack > 0);
    const message =
      survivor && survivor.isHuman
        ? t('poker.matchWon')
        : survivor
          ? t('poker.matchLost', { name: survivor.name })
          : t('poker.matchLost', { name: '?' });
    return (
      <div className="poker-actions poker-actions--result">
        <div className="poker-result-lines">{message}</div>
        <div className="poker-actions-buttons">
          <Button primary onClick={onNewMatch}>
            {t('poker.newMatch')}
          </Button>
        </div>
      </div>
    );
  }

  if (state.phase === 'handComplete') {
    const lines = resultSummary(state, t);
    const humanOut = human.stack <= 0;
    const leader = state.players.reduce((best, player) => (player.stack > best.stack ? player : best));
    return (
      <div className="poker-actions poker-actions--result">
        <div className="poker-result-lines">
          {humanOut ? `${lines.join(' · ')} — ${t('poker.matchLost', { name: leader.name })}` : lines.join(' · ')}
        </div>
        <div className="poker-actions-buttons">
          {humanOut ? (
            <Button primary onClick={onNewMatch}>
              {t('poker.newMatch')}
            </Button>
          ) : (
            <>
              <Button primary onClick={onNextHand}>
                {t('poker.nextHand')}
              </Button>
              <Button onClick={onNewMatch}>{t('poker.newMatch')}</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!legal) {
    const waiting = state.players[state.toAct]?.name ?? '';
    return (
      <div className="poker-actions">
        <span className="poker-waiting">{t('poker.waiting', { name: waiting })}</span>
      </div>
    );
  }

  const hint =
    human.holeCards.length === 2 && !human.folded
      ? handLabel(evaluateHand([...human.holeCards, ...state.community]), t)
      : null;

  const pot = totalPot(state);
  const unit = Math.max(1, Math.round(state.bigBlind / 2));
  const clampToRange = (value: number) =>
    Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(value / unit) * unit));
  const halfPot = clampToRange(state.currentBet + pot * 0.5);
  const fullPot = clampToRange(state.currentBet + pot);
  const aggressive: PlayerAction['type'] = state.currentBet === 0 ? 'bet' : 'raise';

  return (
    <div className="poker-actions">
      <div className="poker-actions-info">
        {hint ? t('poker.yourHand', { hand: hint }) : t('poker.waiting', { name: human.name })}
      </div>
      <div className="poker-actions-buttons">
        <Button size="small" onClick={() => onAction({ type: 'fold' })}>
          {t('poker.fold')}
        </Button>
        {legal.canCheck ? (
          <Button size="small" onClick={() => onAction({ type: 'check' })}>
            {t('poker.check')}
          </Button>
        ) : (
          <Button size="small" onClick={() => onAction({ type: 'call' })}>
            {legal.callIsAllIn
              ? t('poker.callAllIn', { amount: legal.callAmount })
              : t('poker.call', { amount: legal.callAmount })}
          </Button>
        )}

        {legal.canRaise && (
          <>
            <span className="poker-actions-sep" aria-hidden="true" />
            <Button size="small" onClick={() => setRaiseTo(legal.minRaiseTo)}>
              {t('poker.betMin')}
            </Button>
            <Button size="small" onClick={() => setRaiseTo(halfPot)}>
              {t('poker.betHalf')}
            </Button>
            <Button size="small" onClick={() => setRaiseTo(fullPot)}>
              {t('poker.betPot')}
            </Button>
            <Button size="small" onClick={() => setRaiseTo(legal.maxRaiseTo)}>
              {t('poker.allIn')}
            </Button>
            <Slider
              value={raiseTo}
              min={legal.minRaiseTo}
              max={legal.maxRaiseTo}
              onChange={setRaiseTo}
              ariaLabel={t('poker.raiseAmount')}
              width={110}
            />
            <span className="poker-amount">{raiseTo}</span>
            <Button primary size="small" onClick={() => onAction({ type: aggressive, amount: raiseTo })}>
              {state.currentBet === 0
                ? t('poker.betTo', { amount: raiseTo })
                : t('poker.raiseTo', { amount: raiseTo })}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
