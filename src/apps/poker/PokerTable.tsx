import { CardView } from '../../core/cards/CardView';
import type { Card } from '../../core/cards/deck';
import { useI18n } from '../../core/i18n/I18nProvider';
import { totalPot } from '../../core/poker/engine';
import type { TableState } from '../../core/poker/types';
import { handLabel, resultSummary } from './handLabel';

/** Radii of the seat ellipse, in percent of the felt area. */
const SEAT_RADIUS_X = 40;
const SEAT_RADIUS_Y = 37;

function seatPosition(index: number, total: number): { x: number; y: number } {
  // Seat 0 is the local player, always at the bottom; the rest follow the
  // action order clockwise, so the turn walks around the table.
  const angle = Math.PI / 2 + (2 * Math.PI * index) / total;
  return { x: 50 + SEAT_RADIUS_X * Math.cos(angle), y: 50 + SEAT_RADIUS_Y * Math.sin(angle) };
}

function betPosition(position: { x: number; y: number }): { x: number; y: number } {
  return { x: 50 + (position.x - 50) * 0.58, y: 50 + (position.y - 50) * 0.58 };
}

function TableCard({ card, large }: { card: Card; large?: boolean }) {
  return (
    <span className={large ? 'poker-card poker-card--large' : 'poker-card'}>
      <CardView card={card} />
    </span>
  );
}

interface SeatViewProps {
  state: TableState;
  seat: number;
}

function SeatView({ state, seat }: SeatViewProps) {
  const { t } = useI18n();
  const player = state.players[seat];
  const position = seatPosition(seat, state.players.length);
  const active = state.phase === 'hand' && state.toAct === seat;
  const showdown = state.result?.showdown === true;
  const reveal = player.isHuman || (showdown && !player.folded && !player.out);
  const winner = state.result?.pots
    .flatMap((pot) => pot.winners)
    .find((entry) => entry.seat === seat);
  const status = player.folded
    ? t('poker.status.folded')
    : player.allIn
      ? t('poker.status.allIn')
      : null;
  const showHand = winner?.hand ? handLabel(winner.hand, t) : null;

  return (
    <div
      className="poker-seat"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      data-active={active || undefined}
      data-out={player.out || undefined}
      data-winner={winner ? true : undefined}
    >
      <div className="poker-seat-cards" aria-hidden={!reveal || undefined}>
        {player.holeCards.map((card) => (
          <TableCard key={card.id} card={reveal ? card : { ...card, faceUp: false }} />
        ))}
      </div>
      <div className="poker-seat-panel" title={t('poker.seatTitle', { name: player.name, amount: player.stack })}>
        {state.button === seat && (
          <span className="poker-dealer" aria-label={t('poker.dealer')}>
            D
          </span>
        )}
        <span className="poker-seat-name">{player.name}</span>
        <span className="poker-seat-stack">{player.stack}</span>
      </div>
      {(status || showHand) && <div className="poker-seat-status">{showHand ?? status}</div>}
    </div>
  );
}

interface PokerTableProps {
  state: TableState;
}

/** The felt: seats around the oval, community cards and pot in the middle. */
export function PokerTable({ state }: PokerTableProps) {
  const { t } = useI18n();
  const lines = resultSummary(state, t);

  return (
    <div className="poker-table">
      <div className="poker-center">
        {state.phase === 'hand' ? (
          <div className="poker-pot">{t('poker.potAmount', { amount: totalPot(state) })}</div>
        ) : (
          <div className="poker-result">{lines.join(' · ')}</div>
        )}
        <div className="poker-board">
          {state.community.map((card) => (
            <TableCard key={card.id} card={card} large />
          ))}
        </div>
      </div>

      {state.players.map((player, seat) => {
        if (player.committed <= 0 || player.out) return null;
        const position = betPosition(seatPosition(seat, state.players.length));
        return (
          <div
            key={player.id}
            className="poker-bet"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          >
            <span className="poker-chip" aria-hidden="true" />
            {player.committed}
          </div>
        );
      })}

      {state.players.map((_, seat) => (
        <SeatView key={state.players[seat].id} state={state} seat={seat} />
      ))}
    </div>
  );
}
