import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useAppLauncher } from '../core/apps/launcher';
import { PROFILE, pick } from '../core/content';
import { onDesktopEvent } from '../core/desktop/events';
import { useOpenExternal } from '../core/dialogs/useOpenExternal';
import { useVfs } from '../core/fs/VfsProvider';
import { useI18n } from '../core/i18n/I18nProvider';
import type { TranslationKey } from '../core/i18n/es';
import { usePreferences } from '../core/prefs/PreferencesProvider';
import { useWindowManager } from '../core/window/WindowManagerProvider';
import { Button } from '../ui/Button';
import { menuAnchorFromEvent, useMenuLayer } from '../ui/menu/MenuLayer';
import type { MenuEntry } from '../ui/menu/types';
import { uiRect } from '../ui/scale';
import { gazeToward, resolveFace, resolveTrayFace, type FaceInput, type Gaze, type Mood } from '../ui/mascot/face';
import { MascotSprite, MascotTrayIcon } from '../ui/mascot/MascotSprite';
import {
  lineForEvent,
  nextTipIndex,
  POKED_LINE,
  salutationKey,
  TRASHED_LINE,
  WOKE_LINE,
  type Line,
} from './mascot/lines';

/** A shortcut the mascot offers next to its text. */
interface Tip {
  id: string;
  textKey: TranslationKey;
  actionKey: TranslationKey;
  /** Application the shortcut opens: the tip is skipped while it is open. */
  appId?: string;
  run: () => void;
}

/** What the bubble currently says. */
interface Speech {
  /** Changes with every utterance, so repeating a line restarts its animation. */
  id: number;
  textKey: TranslationKey;
  /** Fills `{salutation}`; kept as a key so the bubble follows a language change. */
  salutationKey?: TranslationKey;
  mood: Mood;
  /** Index of the tip whose shortcut the bubble offers. */
  tipIndex?: number;
  /** Stays until dismissed and offers "another tip"; other lines leave on their own. */
  interactive: boolean;
}

/** The first greeting waits for the Welcome window to settle. */
const GREETING_DELAY_MS = 2500;
const GREETING_VISIBLE_MS = 9000;
const GOODBYE_VISIBLE_MS = 3200;
const REMARK_VISIBLE_MS = 6000;
const TYPE_MS = 28;
const BLINK_MS = 140;
const GREETED_KEY = 'mascot-greeted';
/** Without input for this long the assistant dozes off. */
const IDLE_MS = 60_000;
const IDLE_CHECK_MS = 5000;
const SNORE_MS = 1200;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
/** With the pointer still for this long the eyes come back to the visitor. */
const GAZE_REST_MS = 4000;
/** The eyes sit at this fraction of the sprite's height. */
const EYE_LINE = 0.4;
/** This many clicks within the window count as poking. */
const POKE_CLICKS = 5;
const POKE_WINDOW_MS = 2000;
/** Once poked it sulks this long after the last click, and gives no tips meanwhile. */
const POKE_COOLDOWN_MS = 2500;
/** Half the width of the bubble's tail, and the closest it gets to the bubble's corner. */
const TAIL_HALF = 4;
const TAIL_MIN_INSET = 10;

export interface MascotProps {
  /** Element inside the taskbar tray where the mascot tucks itself away. */
  traySlot: HTMLElement | null;
}

/**
 * Pixel portrait of the site's owner in the bottom right corner.
 *
 * A click makes it say a tip and offer the matching shortcut; clicking again
 * moves on to the next tip the visitor has not followed yet. It also remarks
 * on what happens on the desktop: a game won or lost, a file sent to the
 * Recycle Bin. Its eyes follow the pointer,
 * its mouth moves while the bubble writes, it blinks, and it falls asleep
 * after a minute without input. With reduced motion the text appears at once
 * and the face only changes expression.
 *
 * While a window fills the screen (maximised, or any window on a narrow
 * screen) the portrait would cover it, so it moves into the taskbar tray as a
 * small head and the bubble points down at it.
 *
 * The right click menu hides it and the Control Panel brings it back.
 */
export function Mascot({ traySlot }: MascotProps) {
  const { t, locale } = useI18n();
  const { preferences, update } = usePreferences();
  const wm = useWindowManager();
  const vfs = useVfs();
  const launch = useAppLauncher();
  const openExternal = useOpenExternal();
  const { open: openMenu } = useMenuLayer();

  const visible = preferences.showMascot;
  const reduceMotion = preferences.reduceMotion;

  const [speech, setSpeech] = useState<Speech | null>(null);
  const [typed, setTyped] = useState(0);
  const [gaze, setGaze] = useState<Gaze>('center');
  const [blinking, setBlinking] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [snoreBeat, setSnoreBeat] = useState(false);
  /** Counts the clicks that only made it fume, to replay the animation. */
  const [fumes, setFumes] = useState(0);
  const [tailInset, setTailInset] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const faceRef = useRef<HTMLButtonElement | null>(null);
  const speechTimer = useRef<number | undefined>(undefined);
  const speechCount = useRef(0);
  /** True between the goodbye and the moment the mascot is gone: nothing else is said. */
  const leaving = useRef(false);
  const sleepingRef = useRef(false);
  const lastActivity = useRef(Date.now());
  const tipCursor = useRef(0);
  const followedTips = useRef(new Set<string>());
  const pokes = useRef<number[]>([]);
  const sulkingUntil = useRef(0);

  const cvUrl = PROFILE.cvUrl ? pick(PROFILE.cvUrl, locale) : null;

  const tips = useMemo<Tip[]>(() => {
    const list: Tip[] = [
      {
        id: 'projects',
        textKey: 'mascot.tipProjects',
        actionKey: 'welcome.exploreProjects',
        appId: 'projects',
        run: () => launch({ appId: 'projects' }),
      },
      {
        id: 'about',
        textKey: 'mascot.tipAbout',
        actionKey: 'welcome.aboutMe',
        appId: 'about',
        run: () => launch({ appId: 'about' }),
      },
    ];
    if (cvUrl) {
      list.push({
        id: 'cv',
        textKey: 'mascot.tipCv',
        actionKey: 'welcome.downloadCv',
        run: () => void openExternal(cvUrl),
      });
    }
    list.push(
      {
        id: 'contact',
        textKey: 'mascot.tipContact',
        actionKey: 'welcome.contact',
        appId: 'mail',
        run: () => launch({ appId: 'mail' }),
      },
      {
        id: 'games',
        textKey: 'mascot.tipGames',
        actionKey: 'mascot.playMinesweeper',
        appId: 'minesweeper',
        run: () => launch({ appId: 'minesweeper' }),
      },
    );
    return list;
  }, [cvUrl, launch, openExternal]);

  /** Opens the bubble, replacing whatever was being said. */
  const say = useCallback((next: Omit<Speech, 'id'>, visibleMs?: number) => {
    if (leaving.current) return;
    window.clearTimeout(speechTimer.current);
    speechCount.current += 1;
    setSpeech({ ...next, id: speechCount.current });
    setTyped(0);
    if (visibleMs) speechTimer.current = window.setTimeout(() => setSpeech(null), visibleMs);
  }, []);

  const remark = useCallback(
    (line: Line) => say({ ...line, interactive: false }, REMARK_VISIBLE_MS),
    [say],
  );

  const closeBubble = useCallback(() => {
    if (leaving.current) return;
    window.clearTimeout(speechTimer.current);
    setSpeech(null);
  }, []);

  const openWindows = wm.windows;
  const tucked =
    traySlot !== null && (wm.compact || openWindows.some((window) => window.state === 'maximized'));
  const showNextTip = useCallback(() => {
    const isDone = (index: number) => {
      const tip = tips[index];
      return (
        followedTips.current.has(tip.id) ||
        (tip.appId !== undefined && openWindows.some((window) => window.appId === tip.appId))
      );
    };
    const index = nextTipIndex(tips.length, tipCursor.current, isDone);
    tipCursor.current = index + 1;
    say({ textKey: tips[index].textKey, mood: 'happy', tipIndex: index, interactive: true });
  }, [openWindows, say, tips]);

  /* Greets once per tab, a moment after the desktop appears. */
  useEffect(() => {
    if (!visible) return;
    try {
      if (window.sessionStorage.getItem(GREETED_KEY) === '1') return;
    } catch {
      /* Blocked storage only means the greeting may repeat. */
    }
    const handle = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(GREETED_KEY, '1');
      } catch {
        /* See above. */
      }
      say(
        {
          textKey: 'mascot.hello',
          salutationKey: salutationKey(new Date().getHours()),
          mood: 'happy',
          interactive: true,
        },
        GREETING_VISIBLE_MS,
      );
    }, GREETING_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [visible, say]);

  /* Reacts to what the applications report. */
  useEffect(() => {
    if (!visible) return;
    return onDesktopEvent((event) => remark(lineForEvent(event)));
  }, [remark, visible]);

  /* Notices when something lands in the Recycle Bin. */
  const binCount = useMemo(() => vfs.binItems().length, [vfs.binItems]);
  const knownBinCount = useRef(binCount);
  useEffect(() => {
    const previous = knownBinCount.current;
    knownBinCount.current = binCount;
    if (visible && binCount > previous) remark(TRASHED_LINE);
  }, [binCount, remark, visible]);

  /* Writes the bubble one character at a time. */
  const text = speech
    ? t(speech.textKey, {
        name: PROFILE.displayName,
        salutation: speech.salutationKey ? t(speech.salutationKey) : '',
      })
    : null;
  const typing = text !== null && !reduceMotion && typed < text.length;
  useEffect(() => {
    if (!typing) return;
    const timer = window.setInterval(() => setTyped((current) => current + 1), TYPE_MS);
    return () => window.clearInterval(timer);
  }, [typing]);

  /* Blinks every few seconds. */
  useEffect(() => {
    if (!visible || reduceMotion) return;
    let timer: number | undefined;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setBlinking(true);
        timer = window.setTimeout(() => {
          setBlinking(false);
          schedule();
        }, BLINK_MS);
      }, 2500 + Math.random() * 3500);
    };
    schedule();
    return () => {
      window.clearTimeout(timer);
      setBlinking(false);
    };
  }, [visible, reduceMotion]);

  /* The eyes follow the pointer, and return to the visitor when it rests. */
  useEffect(() => {
    if (!visible || reduceMotion || tucked) return;
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let rest: number | undefined;
    const look = () => {
      frame = 0;
      const face = faceRef.current;
      if (!face || !pointer) return;
      const rect = face.getBoundingClientRect();
      const eyes = { x: rect.left + rect.width / 2, y: rect.top + rect.height * EYE_LINE };
      setGaze(gazeToward(eyes, pointer, rect.width / 2));
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      /* One layout read per frame, however fast the pointer events arrive. */
      if (!frame) frame = window.requestAnimationFrame(look);
      window.clearTimeout(rest);
      rest = window.setTimeout(() => setGaze('center'), GAZE_REST_MS);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(rest);
      setGaze('center');
    };
  }, [visible, reduceMotion, tucked]);

  /* Any input wakes it up; a minute without input puts it to sleep. */
  useEffect(() => {
    if (!visible) return;
    lastActivity.current = Date.now();
    const onActivity = () => {
      lastActivity.current = Date.now();
      if (!sleepingRef.current) return;
      sleepingRef.current = false;
      setSleeping(false);
      remark(WOKE_LINE);
    };
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true });
    const timer = window.setInterval(() => {
      if (sleepingRef.current || Date.now() - lastActivity.current < IDLE_MS) return;
      sleepingRef.current = true;
      setSleeping(true);
      closeBubble();
    }, IDLE_CHECK_MS);
    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity);
      window.clearInterval(timer);
      sleepingRef.current = false;
      setSleeping(false);
    };
  }, [visible, closeBubble, remark]);

  /* Asleep it snores, rising its "z" every beat. */
  useEffect(() => {
    if (!sleeping || reduceMotion) return;
    const timer = window.setInterval(() => setSnoreBeat((current) => !current), SNORE_MS);
    return () => {
      window.clearInterval(timer);
      setSnoreBeat(false);
    };
  }, [sleeping, reduceMotion]);

  useEffect(() => () => window.clearTimeout(speechTimer.current), []);

  /* Escape, or a press anywhere else, dismisses a bubble that waits for an answer. */
  const dismissible = speech?.interactive ?? false;
  useEffect(() => {
    if (!dismissible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeBubble();
    };
    const onPointerDown = (event: PointerEvent) => {
      /* In the tray the face lives outside the root, so both are checked. */
      const inside = (element: HTMLElement | null) =>
        event.target instanceof Node && element !== null && element.contains(event.target);
      if (inside(rootRef.current) || inside(faceRef.current)) return;
      closeBubble();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [dismissible, closeBubble]);

  /* Says goodbye first, so the visitor learns where to bring it back from. */
  const hide = useCallback(() => {
    say({ textKey: 'mascot.goodbye', mood: 'happy', interactive: false });
    leaving.current = true;
    speechTimer.current = window.setTimeout(() => {
      leaving.current = false;
      setSpeech(null);
      update({ showMascot: false });
    }, GOODBYE_VISIBLE_MS);
  }, [say, update]);

  /*
   * In the tray the bubble still hangs from the corner of the desktop, so its
   * tail is moved to wherever the small head ended up.
   */
  const speechId = speech?.id;
  useLayoutEffect(() => {
    const root = rootRef.current;
    const face = faceRef.current;
    if (!tucked || speechId === undefined || !root || !face) {
      setTailInset(null);
      return;
    }
    const faceRect = uiRect(face);
    const faceCentre = faceRect.left + faceRect.width / 2;
    setTailInset(Math.max(TAIL_MIN_INSET, Math.round(uiRect(root).right - faceCentre - TAIL_HALF)));
  }, [tucked, speechId, locale, wm.viewport]);

  /**
   * A click asks for a tip; a burst of clicks makes it lose its temper. From
   * then on every click only makes it fume again and restarts the sulk, so
   * the tips come back once it has been left alone for a moment.
   */
  const onFaceClick = () => {
    const now = Date.now();
    const sulking = now < sulkingUntil.current;
    if (!sulking) {
      pokes.current = [...pokes.current.filter((time) => now - time < POKE_WINDOW_MS), now];
      if (pokes.current.length < POKE_CLICKS) {
        showNextTip();
        return;
      }
      pokes.current = [];
    }
    sulkingUntil.current = now + POKE_COOLDOWN_MS;
    if (sulking && speech?.textKey === POKED_LINE.textKey) {
      /* Same complaint, same bubble: only the animation and the timer start over. */
      setFumes((current) => current + 1);
      window.clearTimeout(speechTimer.current);
      speechTimer.current = window.setTimeout(() => setSpeech(null), POKE_COOLDOWN_MS);
    } else {
      say({ ...POKED_LINE, interactive: false }, POKE_COOLDOWN_MS);
    }
  };

  if (!visible) return null;

  const menu: MenuEntry[] = [
    { kind: 'item', id: 'next', label: t('mascot.next'), onSelect: showNextTip },
    { kind: 'item', id: 'hide', label: t('mascot.hide'), onSelect: hide },
  ];

  const tip = speech?.tipIndex !== undefined ? tips[speech.tipIndex] : undefined;
  const written = text === null ? '' : typing ? text.slice(0, typed) : text;
  const faceInput: FaceInput = {
    asleep: sleeping,
    snoreBeat,
    blinking,
    gaze,
    mood: speech?.mood ?? null,
    typed: typing ? typed : null,
  };
  /* Keyed by utterance and by fume: each one replays the reaction animation. */
  const spriteKey = `${speech?.id ?? 0}:${fumes}`;

  const faceButton = (
    <button
      type="button"
      ref={faceRef}
      className={tucked ? 'mascot-face mascot-face--tray' : 'mascot-face'}
      aria-label={t('mascot.label')}
      title={tucked ? t('mascot.label') : undefined}
      data-state={sleeping ? 'asleep' : speech ? speech.mood : 'idle'}
      onClick={onFaceClick}
      onContextMenu={(event) => {
        event.preventDefault();
        openMenu({ entries: menu, ...menuAnchorFromEvent(event), align: 'right' });
      }}
    >
      {tucked ? (
        <MascotTrayIcon key={spriteKey} face={resolveTrayFace(faceInput)} />
      ) : (
        <MascotSprite key={spriteKey} face={resolveFace(faceInput)} />
      )}
    </button>
  );

  const rootStyle =
    tailInset === null ? undefined : ({ '--mascot-tail-inset': `${tailInset}px` } as CSSProperties);

  return (
    <div className={tucked ? 'mascot mascot--tucked' : 'mascot'} ref={rootRef} style={rootStyle}>
      {/* Announces each line once and whole; the letters appearing in the bubble are only the show. */}
      <p className="sr-only" role="status">
        {text}
      </p>
      {speech && text !== null && (
        <div className="mascot-bubble">
          <p className="mascot-text" aria-hidden="true">
            {written}
            <span className="mascot-text-pending">{text.slice(written.length)}</span>
          </p>
          {speech.interactive && (
            <div className="mascot-actions">
              {tip && (
                <Button
                  primary
                  onClick={() => {
                    followedTips.current.add(tip.id);
                    closeBubble();
                    tip.run();
                  }}
                >
                  {t(tip.actionKey)}
                </Button>
              )}
              <Button onClick={showNextTip}>{t('mascot.next')}</Button>
            </div>
          )}
        </div>
      )}
      {tucked && traySlot ? createPortal(faceButton, traySlot) : faceButton}
    </div>
  );
}
