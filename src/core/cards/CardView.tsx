import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { rankLabel, suitColor, type Card, type Suit } from './deck';
import '../../styles/cards.css';

/** Classic card size at 96 dpi. Cards scale with a CSS transform by the caller. */
export const CARD_WIDTH = 71;
export const CARD_HEIGHT = 96;

/**
 * Suit shapes drawn from scratch in a 24x24 box. They are simple, symmetric
 * and readable at the small sizes a pip uses.
 */
const SUIT_PATHS: Record<Suit, string> = {
  hearts:
    'M12 22 C8.5 18.6 2 14.2 2 8.8 C2 5.6 4.4 3.5 7.2 3.5 C9.1 3.5 10.8 4.6 12 6.2 C13.2 4.6 14.9 3.5 16.8 3.5 C19.6 3.5 22 5.6 22 8.8 C22 14.2 15.5 18.6 12 22 Z',
  diamonds: 'M12 1 L22.5 12 L12 23 L1.5 12 Z',
  spades:
    'M12 1.5 C8.2 6.5 2.5 10.3 2.5 14.6 C2.5 17.5 4.8 19.5 7.6 19.5 C9.3 19.5 10.9 18.8 12 17.6 C13.1 18.8 14.7 19.5 16.4 19.5 C19.2 19.5 21.5 17.5 21.5 14.6 C21.5 10.3 15.8 6.5 12 1.5 Z M11 17.5 C11.1 19.2 10.2 21 9 22.2 L15 22.2 C13.8 21 12.9 19.2 13 17.5 Z',
  clubs:
    'M12 2 C9.8 2 8 3.8 8 6 C8 7.1 8.4 8.1 9.1 8.9 C8.3 8.5 7.4 8.3 6.5 8.3 C4.1 8.3 2.2 10.2 2.2 12.6 C2.2 15 4.1 16.9 6.5 16.9 C8.3 16.9 9.9 15.7 10.6 14.1 C10.4 16.6 9.3 19 7.5 20.6 L16.5 20.6 C14.7 19 13.6 16.6 13.4 14.1 C14.1 15.7 15.7 16.9 17.5 16.9 C19.9 16.9 21.8 15 21.8 12.6 C21.8 10.2 19.9 8.3 17.5 8.3 C16.6 8.3 15.7 8.5 14.9 8.9 C15.6 8.1 16 7.1 16 6 C16 3.8 14.2 2 12 2 Z',
};

function inkClass(color: 'red' | 'black'): string {
  return color === 'red' ? 'card-ink-red' : 'card-ink-black';
}

interface SuitGlyphProps {
  suit: Suit;
  size: number;
  x: number;
  y: number;
  /** Pips of the lower half of a face card point down. */
  rotated?: boolean;
}

function SuitGlyph({ suit, size, x, y, rotated }: SuitGlyphProps) {
  const scale = size / 24;
  const rotate = rotated ? ' rotate(180 12 12)' : '';
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})${rotate}`}>
      <path className={inkClass(suitColor(suit))} d={SUIT_PATHS[suit]} />
    </g>
  );
}

/** One of the two corner marks; the bottom one is the same group mirrored. */
function CornerIndex({ card, mirrored }: { card: Card; mirrored?: boolean }) {
  return (
    <g transform={mirrored ? `rotate(180 ${CARD_WIDTH / 2} ${CARD_HEIGHT / 2})` : undefined}>
      <text className={`card-rank ${inkClass(suitColor(card.suit))}`} x={9} y={14.5} textAnchor="middle">
        {rankLabel(card.rank)}
      </text>
      <SuitGlyph suit={card.suit} size={9} x={4.5} y={17.5} />
    </g>
  );
}

/**
 * Pip positions in a 0..1 box, following the traditional arrangements. A card
 * whose pip sits in the lower half is drawn upside down, as on a real deck.
 */
const PIP_LAYOUTS: Record<number, readonly (readonly [number, number])[]> = {
  2: [[0.5, 0], [0.5, 1]],
  3: [[0.5, 0], [0.5, 0.5], [0.5, 1]],
  4: [[0, 0], [1, 0], [0, 1], [1, 1]],
  5: [[0, 0], [1, 0], [0.5, 0.5], [0, 1], [1, 1]],
  6: [[0, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [1, 1]],
  7: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0, 1], [1, 1]],
  8: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0.5, 0.75], [0, 1], [1, 1]],
  9: [
    [0, 0],
    [1, 0],
    [0, 1 / 3],
    [1, 1 / 3],
    [0.5, 0.5],
    [0, 2 / 3],
    [1, 2 / 3],
    [0, 1],
    [1, 1],
  ],
  10: [
    [0, 0],
    [1, 0],
    [0.5, 1 / 6],
    [0, 1 / 3],
    [1, 1 / 3],
    [0, 2 / 3],
    [1, 2 / 3],
    [0.5, 5 / 6],
    [0, 1],
    [1, 1],
  ],
};

const PIP_BOX = { left: 21, top: 20, width: 29, height: 56 };

function PipFace({ card }: { card: Card }) {
  const layout = PIP_LAYOUTS[card.rank] ?? [];
  const size = card.rank >= 9 ? 10 : 11;
  return (
    <g>
      {layout.map(([fx, fy], index) => {
        const cx = PIP_BOX.left + fx * PIP_BOX.width;
        const cy = PIP_BOX.top + fy * PIP_BOX.height;
        return (
          <SuitGlyph
            key={index}
            suit={card.suit}
            size={size}
            x={cx - size / 2}
            y={cy - size / 2}
            rotated={fy > 0.5}
          />
        );
      })}
    </g>
  );
}

function AceFace({ card }: { card: Card }) {
  return <SuitGlyph suit={card.suit} size={30} x={CARD_WIDTH / 2 - 15} y={CARD_HEIGHT / 2 - 15} />;
}

/** Small crown that marks the three court cards. */
function Crown({ color }: { color: 'red' | 'black' }) {
  return (
    <g transform={`translate(29.2 21) scale(0.55)`}>
      <path
        className={inkClass(color)}
        d="M2 15 L4 5 L9 10 L12 2 L15 10 L20 5 L22 15 Z M3 16.5 H21 V19.5 H3 Z"
        transform="translate(0 2)"
      />
    </g>
  );
}

/**
 * Court cards are typographic instead of illustrated: a ruled panel with the
 * letter, its suit and a crown. It keeps the deck consistent with the original
 * pixel art of the rest of the desktop, which is all drawn from scratch.
 */
function CourtFace({ card }: { card: Card }) {
  const ink = suitColor(card.suit);
  return (
    <g>
      <rect x={17.5} y={14.5} width={36} height={67} rx={3} fill="#ffffff" stroke="#000000" strokeWidth={1} />
      <rect
        x={20.5}
        y={17.5}
        width={30}
        height={61}
        rx={2}
        fill="none"
        className={ink === 'red' ? 'card-stroke-red' : 'card-stroke-black'}
        strokeWidth={1}
      />
      <Crown color={ink} />
      <text className={`card-court ${inkClass(ink)}`} x={CARD_WIDTH / 2} y={58} textAnchor="middle">
        {rankLabel(card.rank)}
      </text>
      <SuitGlyph suit={card.suit} size={13} x={CARD_WIDTH / 2 - 6.5} y={62} />
    </g>
  );
}

function CardFace({ card }: { card: Card }) {
  let middle: ReactNode;
  if (card.rank === 1) middle = <AceFace card={card} />;
  else if (card.rank >= 11) middle = <CourtFace card={card} />;
  else middle = <PipFace card={card} />;

  return (
    <svg className="card-svg" viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`} aria-hidden="true" focusable="false">
      <CornerIndex card={card} />
      {middle}
      <CornerIndex card={card} mirrored />
    </svg>
  );
}

export interface CardViewProps {
  card: Card;
  className?: string;
  style?: CSSProperties;
  /** Focusable button semantics for cards the player can move with the keyboard. */
  interactive?: boolean;
  /** Accessible name, required for interactive cards. */
  label?: string;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/** A single card, front or back. Positioning is owned by the caller. */
export function CardView({
  card,
  className,
  style,
  interactive,
  label,
  onPointerDown,
  onDoubleClick,
  onKeyDown,
}: CardViewProps) {
  const classes = ['card', card.faceUp ? 'card--face' : 'card--back'];
  if (className) classes.push(className);
  return (
    <div
      className={classes.join(' ')}
      style={style}
      data-card-id={card.id}
      data-interactive={interactive || undefined}
      data-draggable={onPointerDown ? true : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? label : undefined}
      aria-hidden={interactive ? undefined : true}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    >
      {card.faceUp ? <CardFace card={card} /> : null}
    </div>
  );
}
