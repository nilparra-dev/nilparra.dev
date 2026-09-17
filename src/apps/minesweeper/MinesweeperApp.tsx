import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import type { TranslationKey } from '../../core/i18n/es';
import { useI18n } from '../../core/i18n/I18nProvider';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { playSound } from '../../core/sound/sounds';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Select } from '../../ui/Select';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import '../../styles/app-minesweeper.css';

type GameStatus = 'ready' | 'playing' | 'won' | 'lost';
type FaceState = 'happy' | 'scared' | 'won' | 'lost';

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
  /** The mine the player stepped on. */
  exploded?: boolean;
  /** A flag that was not over a mine, shown crossed out after losing. */
  wrong?: boolean;
}

const LEVEL_IDS = ['beginner', 'intermediate', 'expert'] as const;
type LevelId = (typeof LEVEL_IDS)[number];

interface LevelDefinition {
  cols: number;
  rows: number;
  mines: number;
  labelKey: TranslationKey;
}

const LEVELS: Record<LevelId, LevelDefinition> = {
  beginner: { cols: 9, rows: 9, mines: 10, labelKey: 'mine.beginner' },
  intermediate: { cols: 16, rows: 16, mines: 40, labelKey: 'mine.intermediate' },
  expert: { cols: 30, rows: 16, mines: 99, labelKey: 'mine.expert' },
};

const CELL_SIZE = 20;

function emptyBoard(level: LevelDefinition): Cell[] {
  return Array.from({ length: level.cols * level.rows }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }));
}

function neighborIndices(index: number, level: LevelDefinition): number[] {
  const x = index % level.cols;
  const y = Math.floor(index / level.cols);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < level.cols && ny >= 0 && ny < level.rows) {
        result.push(ny * level.cols + nx);
      }
    }
  }
  return result;
}

/** Places the mines after the first click, so the first square is never one. */
function plantMines(board: Cell[], level: LevelDefinition, safeIndex: number): Cell[] {
  const next = board.map((cell) => ({ ...cell, mine: false, adjacent: 0 }));
  const candidates: number[] = [];
  for (let index = 0; index < next.length; index += 1) {
    if (index !== safeIndex) candidates.push(index);
  }
  const total = Math.min(level.mines, candidates.length);
  for (let index = 0; index < total; index += 1) {
    const swap = index + Math.floor(Math.random() * (candidates.length - index));
    [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
    next[candidates[index]].mine = true;
  }
  for (let index = 0; index < next.length; index += 1) {
    if (next[index].mine) continue;
    next[index].adjacent = neighborIndices(index, level).filter((n) => next[n].mine).length;
  }
  return next;
}

interface OpenResult {
  board: Cell[];
  hitMine: boolean;
}

/** Reveals the given squares; empty ones expand to their neighbours. */
function openFrom(board: Cell[], level: LevelDefinition, starts: number[]): OpenResult {
  const next = board.map((cell) => ({ ...cell }));
  const queue = starts.filter((index) => {
    const cell = next[index];
    return cell && !cell.revealed && !cell.flagged;
  });
  const queued = new Set(queue);
  let hitMine = false;

  while (queue.length) {
    const index = queue[0];
    queue.splice(0, 1);
    const cell = next[index];
    if (cell.revealed || cell.flagged) continue;
    if (cell.mine) {
      cell.revealed = true;
      cell.exploded = true;
      hitMine = true;
      continue;
    }
    cell.revealed = true;
    if (cell.adjacent === 0) {
      for (const neighbor of neighborIndices(index, level)) {
        if (next[neighbor].revealed || next[neighbor].flagged || queued.has(neighbor)) continue;
        queued.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return { board: next, hitMine };
}

function countSafeRevealed(board: Cell[]): number {
  return board.filter((cell) => cell.revealed && !cell.mine).length;
}

/** After losing, every mine is shown; wrong flags get crossed out. */
function revealAllMines(board: Cell[]): Cell[] {
  return board.map((cell) => {
    if (cell.mine) return { ...cell, revealed: true };
    if (cell.flagged) return { ...cell, revealed: true, wrong: true, flagged: false };
    return cell;
  });
}

/** Three digit counter of the classic panel displays. */
function counterText(value: number): string {
  const clamped = Math.max(-99, Math.min(999, value));
  if (clamped < 0) return `-${String(Math.abs(clamped)).padStart(2, '0')}`;
  return String(clamped).padStart(3, '0');
}

function FlagGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <rect x="2" y="1" width="1" height="9" fill="#000000" />
      <path d="M3 2 L9 4 L3 6 Z" fill="#ff0000" />
      <rect x="1" y="10" width="7" height="1" fill="#000000" />
    </svg>
  );
}

function MineGlyph({ crossed }: { crossed?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <rect x="5" y="0" width="2" height="12" fill="#000000" />
      <rect x="0" y="5" width="12" height="2" fill="#000000" />
      <circle cx="6" cy="6" r="4" fill="#000000" />
      <rect x="4" y="4" width="2" height="2" fill="#ffffff" />
      {crossed && (
        <path d="M2 2 L10 10 M10 2 L2 10" stroke="#ff0000" strokeWidth="2" />
      )}
    </svg>
  );
}

function FaceGlyph({ state }: { state: FaceState }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="9" fill="#ffff00" stroke="#000000" strokeWidth="1" />
      {state === 'won' ? (
        <>
          <rect x="4" y="6" width="12" height="3" fill="#000000" />
          <path d="M6 13 Q10 16 14 13" fill="none" stroke="#000000" strokeWidth="1" />
        </>
      ) : state === 'lost' ? (
        <>
          <path d="M5 6 L8 9 M8 6 L5 9 M12 6 L15 9 M15 6 L12 9" stroke="#000000" strokeWidth="1" />
          <path d="M6 15 Q10 12 14 15" fill="none" stroke="#000000" strokeWidth="1" />
        </>
      ) : (
        <>
          <rect x="5" y="6" width="2" height="3" fill="#000000" />
          <rect x="13" y="6" width="2" height="3" fill="#000000" />
          {state === 'scared' ? (
            <rect x="8" y="12" width="4" height="3" fill="#000000" />
          ) : (
            <path d="M6 12 Q10 15 14 12" fill="none" stroke="#000000" strokeWidth="1" />
          )}
        </>
      )}
    </svg>
  );
}

/**
 * Minesweeper: the complete game over a real board state. Flags, numbers,
 * chording, timer, counters and the three classic levels are all functional.
 */
export function MinesweeperApp({ windowId }: AppRenderProps) {
  const { t } = useI18n();
  const { preferences } = usePreferences();
  const wm = useWindowManager();
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [levelId, setLevelId] = useState<LevelId>('beginner');
  const [board, setBoard] = useState<Cell[]>(() => emptyBoard(LEVELS.beginner));
  const [status, setStatus] = useState<GameStatus>('ready');
  const [seconds, setSeconds] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const level = LEVELS[levelId];
  const sound = { enabled: preferences.soundsEnabled, volume: preferences.volume };
  const flagCount = useMemo(() => board.filter((cell) => cell.flagged).length, [board]);

  useEffect(() => {
    wm.setTitle(windowId, `${t('app.minesweeper')} - ${t(level.labelKey)}`);
  }, [level.labelKey, t, windowId, wm]);

  /* --- timer --------------------------------------------------------- */

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = window.setInterval(() => setSeconds((current) => Math.min(999, current + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  /* The face stops being scared even if the pointer is released outside. */
  useEffect(() => {
    if (!pressed) return;
    const clear = () => setPressed(false);
    document.addEventListener('pointerup', clear);
    return () => document.removeEventListener('pointerup', clear);
  }, [pressed]);

  /* --- actions -------------------------------------------------------- */

  const startNewGame = (nextLevelId: LevelId = levelId) => {
    playSound('click', sound);
    setLevelId(nextLevelId);
    setBoard(emptyBoard(LEVELS[nextLevelId]));
    setStatus('ready');
    setSeconds(0);
    setFocusIndex(0);
    setPressed(false);
  };

  const applyResult = (result: OpenResult) => {
    if (result.hitMine) {
      setBoard(revealAllMines(result.board));
      setStatus('lost');
      playSound('error', sound);
      wm.announce(t('mine.lost'));
      return;
    }
    if (countSafeRevealed(result.board) >= level.cols * level.rows - level.mines) {
      setBoard(result.board.map((cell) => (cell.mine ? { ...cell, flagged: true } : cell)));
      setStatus('won');
      playSound('ding', sound);
      wm.announce(t('mine.won', { time: seconds }));
      return;
    }
    setBoard(result.board);
    setStatus('playing');
  };

  const reveal = (index: number) => {
    if (status === 'won' || status === 'lost') return;
    const cell = board[index];
    if (!cell || cell.revealed || cell.flagged) return;
    playSound('click', sound);
    const primed = status === 'ready' ? plantMines(board, level, index) : board;
    applyResult(openFrom(primed, level, [index]));
  };

  const toggleFlag = (index: number) => {
    if (status === 'won' || status === 'lost') return;
    const cell = board[index];
    if (!cell || cell.revealed) return;
    playSound('click', sound);
    setBoard((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, flagged: !item.flagged } : item)),
    );
  };

  /** Opens the neighbours of a number whose flags already match it. */
  const chord = (index: number) => {
    if (status !== 'playing') return;
    const cell = board[index];
    if (!cell.revealed || cell.adjacent === 0) return;
    const neighbors = neighborIndices(index, level);
    if (neighbors.filter((n) => board[n].flagged).length !== cell.adjacent) return;
    const starts = neighbors.filter((n) => !board[n].flagged && !board[n].revealed);
    if (!starts.length) return;
    applyResult(openFrom(board, level, starts));
  };

  const primary = (index: number) => {
    if (flagMode) toggleFlag(index);
    else reveal(index);
  };

  const moveFocus = (index: number, dx: number, dy: number) => {
    const x = index % level.cols;
    const y = Math.floor(index / level.cols);
    const next =
      Math.min(level.rows - 1, Math.max(0, y + dy)) * level.cols +
      Math.min(level.cols - 1, Math.max(0, x + dx));
    setFocusIndex(next);
    boardRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus();
  };

  /* --- menus ---------------------------------------------------------- */

  const menus: MenuBarMenu[] = [
    {
      id: 'level',
      label: t('mine.level'),
      accessKey: 'n',
      entries: LEVEL_IDS.map((id) => ({
        kind: 'item' as const,
        id,
        label: t(LEVELS[id].labelKey),
        checked: levelId === id,
        radio: true,
        onSelect: () => startNewGame(id),
      })),
    },
    {
      id: 'options',
      label: t('menu.options'),
      entries: [
        {
          kind: 'item',
          id: 'flag-mode',
          label: t('mine.flagMode'),
          checked: flagMode,
          onSelect: () => setFlagMode((current) => !current),
        },
      ],
    },
    {
      id: 'help',
      label: t('menu.help'),
      accessKey: 'y',
      entries: [
        {
          kind: 'item',
          id: 'help-topics',
          label: t('app.help'),
          onSelect: () => window.dispatchEvent(new CustomEvent('w95:open-help', { detail: 'welcome' })),
        },
      ],
    },
  ];

  const faceState: FaceState =
    status === 'lost' ? 'lost' : status === 'won' ? 'won' : pressed ? 'scared' : 'happy';
  const message =
    status === 'won'
      ? t('mine.won', { time: seconds })
      : status === 'lost'
        ? t('mine.lost')
        : t('mine.instructions');

  return (
    <div className="app-minesweeper">
      <MenuBar menus={menus} ariaLabel={t('app.minesweeper')} />

      <div className="toolbar">
        <span className="mine-level-label">{t('mine.level')}</span>
        <Select
          ariaLabel={t('mine.level')}
          value={levelId}
          options={LEVEL_IDS.map((id) => ({ value: id, label: t(LEVELS[id].labelKey) }))}
          onChange={(value) => startNewGame(value as LevelId)}
        />
        <span className="tool-sep" />
        <Button size="small" onClick={() => startNewGame()}>
          {t('mine.newGame')}
        </Button>
        <span className="tool-sep" />
        <Checkbox checked={flagMode} onChange={setFlagMode} label={t('mine.flagMode')} />
      </div>

      <p className="mine-instructions u-muted">{t('mine.instructions')}</p>

      <div className="mine-frame bevel-down">
        <div className="mine-panel">
          <span className="mine-counter" title={t('mine.mines')}>
            {counterText(level.mines - flagCount)}
          </span>
          <button
            type="button"
            className="mine-face"
            aria-label={t('mine.newGame')}
            onClick={() => startNewGame()}
          >
            <FaceGlyph state={faceState} />
          </button>
          <span className="mine-counter" title={t('mine.time')}>
            {counterText(seconds)}
          </span>
        </div>

        <div className="mine-board-wrap w95-scroll">
          <div
            ref={boardRef}
            className="mine-board"
            role="group"
            aria-label={t('app.minesweeper')}
            style={{ gridTemplateColumns: `repeat(${level.cols}, ${CELL_SIZE}px)` }}
            onPointerDown={() => setPressed(true)}
            onPointerUp={() => setPressed(false)}
            onPointerLeave={() => setPressed(false)}
            onContextMenu={(event) => event.preventDefault()}
          >
            {board.map((cell, index) => (
              <button
                key={index}
                type="button"
                data-index={index}
                className="mine-cell"
                data-open={cell.revealed || undefined}
                data-value={cell.revealed && !cell.mine && cell.adjacent > 0 ? cell.adjacent : undefined}
                data-exploded={cell.exploded || undefined}
                data-wrong={cell.wrong || undefined}
                aria-label={`${Math.floor(index / level.cols) + 1}, ${(index % level.cols) + 1}`}
                aria-pressed={cell.flagged || undefined}
                tabIndex={index === focusIndex ? 0 : -1}
                onFocus={() => setFocusIndex(index)}
                onClick={() => primary(index)}
                onDoubleClick={() => chord(index)}
                onAuxClick={(event) => {
                  if (event.button === 1) chord(index);
                }}
                onPointerDown={(event) => {
                  if (event.buttons === 3) chord(index);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  toggleFlag(index);
                }}
                onKeyDown={(event) => {
                  switch (event.key) {
                    case 'ArrowLeft':
                      event.preventDefault();
                      moveFocus(index, -1, 0);
                      break;
                    case 'ArrowRight':
                      event.preventDefault();
                      moveFocus(index, 1, 0);
                      break;
                    case 'ArrowUp':
                      event.preventDefault();
                      moveFocus(index, 0, -1);
                      break;
                    case 'ArrowDown':
                      event.preventDefault();
                      moveFocus(index, 0, 1);
                      break;
                    case 'Enter':
                    case ' ':
                      event.preventDefault();
                      primary(index);
                      break;
                    case 'f':
                    case 'F':
                      event.preventDefault();
                      toggleFlag(index);
                      break;
                    default:
                      break;
                  }
                }}
              >
                {cell.revealed ? (
                  cell.mine ? (
                    <MineGlyph crossed={cell.wrong} />
                  ) : cell.adjacent > 0 ? (
                    <span className="mine-number">{cell.adjacent}</span>
                  ) : null
                ) : cell.flagged ? (
                  <FlagGlyph />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mine-message" data-state={status}>
        {message}
      </p>
    </div>
  );
}
