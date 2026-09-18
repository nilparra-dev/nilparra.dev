import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { useI18n } from '../../core/i18n/I18nProvider';
import type { TranslationKey } from '../../core/i18n/es';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { playSound } from '../../core/sound/sounds';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { menuSeparator } from '../../ui/menu/types';
import { uiPixels, uiRect } from '../../ui/scale';
import { CARD_HEIGHT, CardView } from '../../core/cards/CardView';
import { WinAnimation } from './WinAnimation';
import {
  addWinBonus,
  autoMoveToFoundation,
  canAutoComplete,
  canDrop,
  canPickUp,
  createDeal,
  drawFromStock,
  findAutoMove,
  isWon,
  moveCards,
  newSeed,
  pileCards,
  type Card,
  type DrawCount,
  type GameState,
  type PileRef,
  type Rank,
  type Suit,
} from './klondike';
import '../../styles/app-solitaire.css';

/** Fan offsets of a column, in the same scale as the cards. */
const FACE_DOWN_GAP = 8;
const FACE_UP_GAP = 20;
const MIN_FAN_GAP = 3;
/** Horizontal separation of the three cards a draw-three waste shows. */
const WASTE_FAN = 16;
/** Board height used before the window has been measured (tests, first paint). */
const FALLBACK_TABLEAU_HEIGHT = 300;
const HISTORY_LIMIT = 400;
const AUTO_MOVE_DELAY = 140;

const WASTE: PileRef = { kind: 'waste', index: 0 };

const SUIT_NAME_KEYS: Record<Suit, TranslationKey> = {
  clubs: 'card.suit.clubs',
  diamonds: 'card.suit.diamonds',
  hearts: 'card.suit.hearts',
  spades: 'card.suit.spades',
};

const RANK_NAME_KEYS: Partial<Record<Rank, TranslationKey>> = {
  1: 'card.rank.ace',
  11: 'card.rank.jack',
  12: 'card.rank.queen',
  13: 'card.rank.king',
};

type GameStatus = 'ready' | 'playing' | 'won';

interface DragState {
  from: PileRef;
  cardIndex: number;
  cards: Card[];
  /** Top-left corner of the dragged stack, in board coordinates. */
  x: number;
  y: number;
}

interface DragPayload {
  from: PileRef;
  cardIndex: number;
  cards: Card[];
  grabX: number;
  grabY: number;
  boardLeft: number;
  boardTop: number;
  startX: number;
  startY: number;
  moved: boolean;
}

function pileKey(ref: PileRef): string {
  return `${ref.kind}:${ref.index}`;
}

function parsePileKey(key: string): PileRef | null {
  const [kind, rawIndex] = key.split(':');
  const index = Number(rawIndex);
  if (!Number.isInteger(index)) return null;
  if (kind === 'stock' || kind === 'waste' || kind === 'foundation' || kind === 'tableau') {
    return { kind, index };
  }
  return null;
}

/**
 * Top offsets of a column: fixed gaps while the pile fits, scaled down when a
 * long column would run past the board.
 */
function fanOffsets(pile: readonly Card[], available: number): number[] {
  const offsets = [0];
  for (let index = 1; index < pile.length; index += 1) {
    const gap = pile[index - 1].faceUp ? FACE_UP_GAP : FACE_DOWN_GAP;
    offsets.push(offsets[index - 1] + gap);
  }
  if (pile.length <= 1) return offsets;

  const span = offsets[offsets.length - 1];
  const total = span + CARD_HEIGHT;
  const height = Math.max(CARD_HEIGHT + MIN_FAN_GAP, available);
  if (total <= height) return offsets;

  const scale = (height - CARD_HEIGHT) / span;
  return offsets.map((offset, index) => (index === 0 ? 0 : Math.max(MIN_FAN_GAP, Math.round(offset * scale))));
}

/** Circular arrow shown on the stock slot when the waste can be recycled. */
function RecycleGlyph() {
  return (
    <svg className="sol-slot-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 4.5 A7.5 7.5 0 1 1 19.5 12" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M19.5 8 L22.5 13 L16.5 13 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Solitaire (Klondike): drag and drop, double click to send a card to its
 * foundation, undo, standard scoring and the bouncing victory animation.
 */
export function SolitaireApp({ windowId }: AppRenderProps) {
  const { t } = useI18n();
  const { preferences } = usePreferences();
  const wm = useWindowManager();
  const dialogs = useDialogs();

  const boardRef = useRef<HTMLDivElement | null>(null);
  const tableauRef = useRef<HTMLDivElement | null>(null);

  const [game, setGame] = useState<GameState>(() => createDeal(newSeed(), 1));
  const [history, setHistory] = useState<GameState[]>([]);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [seconds, setSeconds] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<PileRef | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [tableauHeight, setTableauHeight] = useState(FALLBACK_TABLEAU_HEIGHT);

  const soundOptions = useMemo(
    () => ({ enabled: preferences.soundsEnabled, volume: preferences.volume }),
    [preferences.soundsEnabled, preferences.volume],
  );

  useEffect(() => {
    wm.setTitle(windowId, t('app.solitaire'));
  }, [t, windowId, wm]);

  /* --- timer ---------------------------------------------------------- */

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  /* --- geometry ------------------------------------------------------- */

  useEffect(() => {
    const element = tableauRef.current;
    if (!element) return;
    const measure = () => setTableauHeight(element.clientHeight || FALLBACK_TABLEAU_HEIGHT);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* --- actions -------------------------------------------------------- */

  const pushHistory = (previous: GameState) => {
    setHistory((entries) => {
      const next = [...entries, previous];
      return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
    });
  };

  const runMove = (next: GameState | null, previous: GameState): boolean => {
    if (!next || next === previous) return false;
    pushHistory(previous);
    setStatus((current) => (current === 'ready' ? 'playing' : current));
    playSound('click', soundOptions);

    if (!isWon(previous) && isWon(next)) {
      const finished = addWinBonus(next, seconds);
      setGame(finished);
      setStatus('won');
      setAutoRunning(false);
      playSound('ding', soundOptions);
      wm.announce(t('sol.won', { score: finished.score }));
    } else {
      setGame(next);
    }
    return true;
  };

  const restart = (next: GameState) => {
    setGame(next);
    setHistory([]);
    setStatus('ready');
    setSeconds(0);
    setDrag(null);
    setHover(null);
    setAutoRunning(false);
  };

  const newGame = () => {
    playSound('click', soundOptions);
    restart(createDeal(newSeed(), game.drawCount));
  };

  const redeal = () => {
    playSound('click', soundOptions);
    restart(createDeal(game.seed, game.drawCount));
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((entries) => entries.slice(0, -1));
    setGame(previous);
    setAutoRunning(false);
    setStatus((current) => (current === 'won' ? 'playing' : current));
    playSound('click', soundOptions);
  };

  const dealFromStock = () => {
    setAutoRunning(false);
    runMove(drawFromStock(game), game);
  };

  const sendToFoundation = (from: PileRef) => {
    runMove(autoMoveToFoundation(game, from), game);
  };

  const setDrawCount = (drawCount: DrawCount) => {
    playSound('click', soundOptions);
    setGame((current) => ({ ...current, drawCount }));
  };

  /* --- auto complete -------------------------------------------------- */

  useEffect(() => {
    if (!autoRunning || status === 'won') return;
    const timer = window.setTimeout(() => {
      const move = findAutoMove(game);
      if (!move) {
        setAutoRunning(false);
        return;
      }
      runMove(moveCards(game, move.from, move.cardIndex, move.to), game);
    }, AUTO_MOVE_DELAY);
    return () => window.clearTimeout(timer);
  });

  /* --- drag and drop -------------------------------------------------- */

  const pileUnderPointer = (clientX: number, clientY: number): PileRef | null => {
    const element = document.elementFromPoint(clientX, clientY);
    const pile = element?.closest<HTMLElement>('[data-sol-pile]');
    return pile ? parsePileKey(pile.dataset.solPile ?? '') : null;
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>, from: PileRef, cardIndex: number) => {
    if (event.button !== 0 || status === 'won' || drag) return;
    if (!canPickUp(game, from, cardIndex)) return;
    const board = boardRef.current;
    if (!board) return;

    const boardRect = uiRect(board);
    const cardRect = uiRect(event.currentTarget);
    const payload: DragPayload = {
      from,
      cardIndex,
      cards: pileCards(game, from).slice(cardIndex),
      grabX: uiPixels(event.clientX) - cardRect.left,
      grabY: uiPixels(event.clientY) - cardRect.top,
      boardLeft: boardRect.left,
      boardTop: boardRect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    // A drag must not race the auto-complete timer for the same game state.
    setAutoRunning(false);

    const onMove = (moveEvent: PointerEvent) => {
      if (!payload.moved) {
        const travelled = Math.abs(moveEvent.clientX - payload.startX) + Math.abs(moveEvent.clientY - payload.startY);
        if (travelled < 5) return;
        payload.moved = true;
      }
      setDrag({
        from: payload.from,
        cardIndex: payload.cardIndex,
        cards: payload.cards,
        x: uiPixels(moveEvent.clientX) - payload.boardLeft - payload.grabX,
        y: uiPixels(moveEvent.clientY) - payload.boardTop - payload.grabY,
      });
      setHover(pileUnderPointer(moveEvent.clientX, moveEvent.clientY));
    };

    const finish = (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      setDrag(null);
      setHover(null);
      if (!payload.moved) return;
      const target = pileUnderPointer(upEvent.clientX, upEvent.clientY);
      if (!target) return;
      runMove(moveCards(game, payload.from, payload.cardIndex, target), game);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  };

  /* --- helpers -------------------------------------------------------- */

  const cardLabel = (card: Card): string => {
    const rankKey = RANK_NAME_KEYS[card.rank];
    const rank = rankKey ? t(rankKey) : String(card.rank);
    return t('card.label', { rank, suit: t(SUIT_NAME_KEYS[card.suit]) });
  };

  const onCardKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, from: PileRef) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    sendToFoundation(from);
  };

  const onAppKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'F2') {
      event.preventDefault();
      newGame();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
    }
  };

  const dropKey = drag && hover && canDrop(game, drag.cards, hover) ? pileKey(hover) : null;

  const showAbout = () => {
    void dialogs.alert({
      title: t('sol.aboutTitle'),
      message: t('sol.aboutText'),
      detail: t('sol.aboutVersion'),
      kind: 'info',
    });
  };

  /* --- menus ---------------------------------------------------------- */

  const menus: MenuBarMenu[] = [
    {
      id: 'game',
      label: t('sol.menu.game'),
      entries: [
        { kind: 'item', id: 'new', label: t('sol.newGame'), accelerator: 'F2', onSelect: newGame },
        { kind: 'item', id: 'redeal', label: t('sol.redeal'), onSelect: redeal },
        {
          kind: 'item',
          id: 'undo',
          label: t('sol.undo'),
          accelerator: 'Ctrl+Z',
          disabled: history.length === 0,
          onSelect: undo,
        },
        menuSeparator('sep-draw'),
        {
          kind: 'item',
          id: 'draw-one',
          label: t('sol.drawOne'),
          checked: game.drawCount === 1,
          radio: true,
          onSelect: () => setDrawCount(1),
        },
        {
          kind: 'item',
          id: 'draw-three',
          label: t('sol.drawThree'),
          checked: game.drawCount === 3,
          radio: true,
          onSelect: () => setDrawCount(3),
        },
        menuSeparator('sep-auto'),
        {
          kind: 'item',
          id: 'auto',
          label: t('sol.autoComplete'),
          disabled: status === 'won' || !canAutoComplete(game),
          onSelect: () => setAutoRunning(true),
        },
      ],
    },
    {
      id: 'help',
      label: t('menu.help'),
      entries: [
        {
          kind: 'item',
          id: 'topics',
          label: t('sol.helpTopics'),
          onSelect: () =>
            window.dispatchEvent(new CustomEvent('w95:open-help', { detail: 'solitaire' })),
        },
        menuSeparator('sep-help'),
        { kind: 'item', id: 'about', label: t('sol.aboutTitle'), onSelect: showAbout },
      ],
    },
  ];

  /* --- rendering ------------------------------------------------------ */

  const foundationCards = useMemo(() => game.foundations.flat(), [game.foundations]);
  const visibleWaste = game.waste.slice(-game.drawCount);
  const stockEmpty = game.stock.length === 0 && game.waste.length === 0;

  return (
    <div className="app-solitaire" onKeyDown={onAppKeyDown} onContextMenu={(event) => event.preventDefault()}>
      <MenuBar menus={menus} ariaLabel={t('app.solitaire')} />

      <p className="sol-hint" data-state={status}>
        {status === 'won'
          ? t('sol.won', { score: game.score })
          : status === 'ready'
            ? t('sol.instructions')
            : ''}
      </p>

      <div className="sol-board" ref={boardRef}>
        <div className="sol-row sol-row-top">
          <div
            className="sol-pile sol-stock"
            role="button"
            tabIndex={stockEmpty ? -1 : 0}
            aria-disabled={stockEmpty || undefined}
            aria-label={stockEmpty ? t('sol.stockEmpty') : game.stock.length > 0 ? t('sol.stock') : t('sol.recycle')}
            onClick={() => {
              if (!stockEmpty) dealFromStock();
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              if (!stockEmpty) dealFromStock();
            }}
          >
            <span className="sol-slot" />
            {game.stock.length === 0 && game.waste.length > 0 && <RecycleGlyph />}
            {game.stock.slice(-3).map((card, index, stack) => {
              const depth = stack.length - 1 - index;
              return <CardView key={card.id} card={card} style={{ left: depth, top: depth }} />;
            })}
          </div>

          <div className="sol-pile sol-waste" role="group" aria-label={t('sol.waste')}>
            <span className="sol-slot" />
            {visibleWaste.map((card, index) => {
              const cardIndex = game.waste.length - visibleWaste.length + index;
              const isTop = cardIndex === game.waste.length - 1;
              return (
                <CardView
                  key={card.id}
                  card={card}
                  style={{ left: index * WASTE_FAN }}
                  interactive={isTop}
                  label={cardLabel(card)}
                  onPointerDown={(event) => beginDrag(event, WASTE, cardIndex)}
                  onDoubleClick={() => sendToFoundation(WASTE)}
                  onKeyDown={(event) => onCardKeyDown(event, WASTE)}
                />
              );
            })}
          </div>

          <div className="sol-spacer" />

          {game.foundations.map((pile, index) => {
            const ref: PileRef = { kind: 'foundation', index };
            const top = pile[pile.length - 1];
            return (
              <div
                key={index}
                className="sol-pile sol-foundation"
                role="group"
                aria-label={t('sol.foundation', { index: index + 1 })}
                data-sol-pile={pileKey(ref)}
                data-drop={dropKey === pileKey(ref) ? 'valid' : undefined}
              >
                <span className="sol-slot" />
                {top && (
                  <CardView
                    card={top}
                    label={cardLabel(top)}
                    onPointerDown={(event) => beginDrag(event, ref, pile.length - 1)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="sol-row sol-tableau" ref={tableauRef}>
          {game.tableau.map((pile, index) => {
            const ref: PileRef = { kind: 'tableau', index };
            const offsets = fanOffsets(pile, tableauHeight);
            return (
              <div
                key={index}
                className="sol-pile sol-column"
                role="group"
                aria-label={t('sol.column', { index: index + 1 })}
                data-sol-pile={pileKey(ref)}
                data-drop={dropKey === pileKey(ref) ? 'valid' : undefined}
              >
                <span className="sol-slot" />
                {pile.map((card, cardIndex) => {
                  if (
                    drag &&
                    drag.from.kind === 'tableau' &&
                    drag.from.index === index &&
                    cardIndex >= drag.cardIndex
                  ) {
                    return null;
                  }
                  const pickable = canPickUp(game, ref, cardIndex);
                  const isTop = cardIndex === pile.length - 1;
                  return (
                    <CardView
                      key={card.id}
                      card={card}
                      style={{ top: offsets[cardIndex] }}
                      interactive={pickable}
                      label={cardLabel(card)}
                      onPointerDown={pickable ? (event) => beginDrag(event, ref, cardIndex) : undefined}
                      onDoubleClick={isTop ? () => sendToFoundation(ref) : undefined}
                      onKeyDown={isTop ? (event) => onCardKeyDown(event, ref) : undefined}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {drag && (
          <div className="sol-drag" style={{ left: drag.x, top: drag.y }}>
            {drag.cards.map((card, index) => (
              <CardView key={card.id} card={card} style={{ top: index * FACE_UP_GAP }} />
            ))}
          </div>
        )}

        {status === 'won' && !preferences.reduceMotion && <WinAnimation cards={foundationCards} />}
      </div>

      <div className="sol-status">
        <span className="sol-status-panel">{t('sol.status.game', { number: game.seed })}</span>
        <span className="sol-status-panel">{t('sol.status.score', { score: game.score })}</span>
        <span className="sol-status-panel sol-status-time">{t('sol.status.time', { time: seconds })}</span>
      </div>
    </div>
  );
}
