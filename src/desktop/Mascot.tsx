import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MASCOT_URLS, type MascotFrame } from '../assets/generated/mascot';
import { useAppLauncher } from '../core/apps/launcher';
import { PROFILE, pick } from '../core/content';
import { useOpenExternal } from '../core/dialogs/useOpenExternal';
import { useI18n } from '../core/i18n/I18nProvider';
import type { TranslationKey } from '../core/i18n/es';
import { usePreferences } from '../core/prefs/PreferencesProvider';
import { Button } from '../ui/Button';
import { menuAnchorFromEvent, useMenuLayer } from '../ui/menu/MenuLayer';
import type { MenuEntry } from '../ui/menu/types';

/** What the bubble says and the shortcut it offers next to the text. */
interface Tip {
  id: string;
  textKey: TranslationKey;
  actionKey: TranslationKey;
  run: () => void;
}

type Bubble = number | 'greeting' | 'goodbye' | null;

/** The first greeting waits for the Welcome window to settle. */
const GREETING_DELAY_MS = 2500;
const GREETING_VISIBLE_MS = 9000;
const GOODBYE_VISIBLE_MS = 3200;
const TALK_MS = 1400;
const BLINK_MS = 140;
const GREETED_KEY = 'mascot-greeted';
/** Without input for this long the assistant dozes off. */
const IDLE_MS = 60_000;
const IDLE_CHECK_MS = 5000;
const SNORE_MS = 1200;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Pixel portrait of the site's owner in the bottom right corner. A click makes
 * it say something and offer the matching shortcut; clicking again moves on to
 * the next tip. The right click menu hides it and the Control Panel brings it
 * back. It blinks now and then and falls asleep after a minute without input,
 * unless the visitor asked to reduce motion (then it sleeps without moving).
 */
export function Mascot() {
  const { t, locale } = useI18n();
  const { preferences, update } = usePreferences();
  const launch = useAppLauncher();
  const openExternal = useOpenExternal();
  const { open: openMenu } = useMenuLayer();

  const [frame, setFrame] = useState<MascotFrame>('neutral');
  const [bubble, setBubble] = useState<Bubble>(null);
  const [sleeping, setSleeping] = useState(false);
  const lastActivity = useRef(Date.now());
  const nextTip = useRef(0);
  const bubbleTimer = useRef<number | undefined>(undefined);

  const cvUrl = PROFILE.cvUrl ? pick(PROFILE.cvUrl, locale) : null;

  const tips = useMemo<Tip[]>(() => {
    const list: Tip[] = [
      {
        id: 'projects',
        textKey: 'mascot.tipProjects',
        actionKey: 'welcome.exploreProjects',
        run: () => launch({ appId: 'projects' }),
      },
      {
        id: 'about',
        textKey: 'mascot.tipAbout',
        actionKey: 'welcome.aboutMe',
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
        run: () => launch({ appId: 'mail' }),
      },
      {
        id: 'games',
        textKey: 'mascot.tipGames',
        actionKey: 'mascot.playMinesweeper',
        run: () => launch({ appId: 'minesweeper' }),
      },
    );
    return list;
  }, [cvUrl, launch, openExternal]);

  const showBubble = useCallback((value: Exclude<Bubble, null>, visibleMs?: number) => {
    window.clearTimeout(bubbleTimer.current);
    setBubble(value);
    if (visibleMs) bubbleTimer.current = window.setTimeout(() => setBubble(null), visibleMs);
  }, []);

  const closeBubble = useCallback(() => {
    window.clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);

  const showNextTip = useCallback(() => {
    const index = nextTip.current % tips.length;
    nextTip.current = index + 1;
    showBubble(index);
  }, [showBubble, tips.length]);

  /* Greets once per tab, a moment after the desktop appears. */
  useEffect(() => {
    if (!preferences.showMascot) return;
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
      showBubble('greeting', GREETING_VISIBLE_MS);
    }, GREETING_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [preferences.showMascot, showBubble]);

  /* Blinks every few seconds. */
  useEffect(() => {
    if (!preferences.showMascot || preferences.reduceMotion) return;
    let timer: number | undefined;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setFrame((current) => (current === 'neutral' ? 'blink' : current));
        timer = window.setTimeout(() => {
          setFrame((current) => (current === 'blink' ? 'neutral' : current));
          schedule();
        }, BLINK_MS);
      }, 2500 + Math.random() * 3500);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [preferences.showMascot, preferences.reduceMotion]);

  /* Any input wakes it up; a minute without input puts it to sleep. */
  useEffect(() => {
    if (!preferences.showMascot) return;
    lastActivity.current = Date.now();
    const onActivity = () => {
      lastActivity.current = Date.now();
      setSleeping(false);
    };
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true });
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= IDLE_MS) setSleeping(true);
    }, IDLE_CHECK_MS);
    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity);
      window.clearInterval(timer);
      setSleeping(false);
    };
  }, [preferences.showMascot]);

  /* Asleep it closes the bubble and snores, rising its "z" every beat. */
  useEffect(() => {
    if (!sleeping) return;
    closeBubble();
    setFrame('sleep');
    if (preferences.reduceMotion) return () => setFrame('neutral');
    const timer = window.setInterval(
      () => setFrame((current) => (current === 'sleep' ? 'sleep2' : 'sleep')),
      SNORE_MS,
    );
    return () => {
      window.clearInterval(timer);
      setFrame('neutral');
    };
  }, [sleeping, preferences.reduceMotion, closeBubble]);

  /* Talks while a bubble opens, then settles into a smile. */
  useEffect(() => {
    if (bubble === null) {
      if (!sleeping) setFrame('neutral');
      return;
    }
    if (bubble === 'goodbye' || preferences.reduceMotion) {
      setFrame('happy');
      return;
    }
    setFrame('talk');
    const handle = window.setTimeout(() => setFrame('happy'), TALK_MS);
    return () => window.clearTimeout(handle);
  }, [bubble, sleeping, preferences.reduceMotion]);

  useEffect(() => () => window.clearTimeout(bubbleTimer.current), []);

  /* Escape closes the bubble. */
  useEffect(() => {
    if (bubble === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeBubble();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bubble, closeBubble]);

  /* Says goodbye first, so the visitor learns where to bring it back from. */
  const hide = useCallback(() => {
    showBubble('goodbye');
    bubbleTimer.current = window.setTimeout(() => {
      setBubble(null);
      update({ showMascot: false });
    }, GOODBYE_VISIBLE_MS);
  }, [showBubble, update]);

  if (!preferences.showMascot) return null;

  const menu: MenuEntry[] = [
    { kind: 'item', id: 'next', label: t('mascot.next'), onSelect: showNextTip },
    { kind: 'item', id: 'hide', label: t('mascot.hide'), onSelect: hide },
  ];

  const tip = typeof bubble === 'number' ? tips[bubble] : undefined;
  let text: string | null = null;
  if (bubble === 'greeting') text = t('mascot.hello', { name: PROFILE.displayName });
  else if (bubble === 'goodbye') text = t('mascot.goodbye');
  else if (tip) text = t(tip.textKey);

  return (
    <div className="mascot">
      {text !== null && (
        <div className="mascot-bubble" role="status">
          <p className="mascot-text">{text}</p>
          {bubble !== 'goodbye' && (
            <div className="mascot-actions">
              {tip && (
                <Button
                  primary
                  onClick={() => {
                    tip.run();
                    closeBubble();
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
      <button
        type="button"
        className="mascot-face"
        aria-label={t('mascot.label')}
        onClick={showNextTip}
        onContextMenu={(event) => {
          event.preventDefault();
          openMenu({ entries: menu, ...menuAnchorFromEvent(event), align: 'right' });
        }}
      >
        <img className="pixel" src={MASCOT_URLS[frame]} width={64} height={64} alt="" aria-hidden="true" />
      </button>
    </div>
  );
}
