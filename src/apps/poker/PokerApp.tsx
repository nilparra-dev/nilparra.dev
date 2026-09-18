import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { defaultRandom } from '../../core/cards/deck';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { useI18n } from '../../core/i18n/I18nProvider';
import { pickBotNames, chooseBotAction, createPersonality } from '../../core/poker/bots';
import { applyAction, createTable, startHand } from '../../core/poker/engine';
import type { HandEvent, PlayerAction, TableState } from '../../core/poker/types';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { playSound } from '../../core/sound/sounds';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { menuSeparator } from '../../ui/menu/types';
import { StatusBar } from '../../ui/StatusBar';
import { ActionBar } from './ActionBar';
import { PokerTable } from './PokerTable';
import { DEFAULT_SETTINGS, SetupPanel, type MatchSettings } from './SetupPanel';
import { resultSummary } from './handLabel';
import '../../styles/app-poker.css';

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const HUMAN_SEAT = 0;

/**
 * Texas Hold'em against the machine: one local player, up to five rivals with
 * their own personalities and play money. The whole match lives in this
 * window; closing it starts again next time.
 */
export function PokerApp({ windowId }: AppRenderProps) {
  const { t } = useI18n();
  const { preferences } = usePreferences();
  const wm = useWindowManager();
  const dialogs = useDialogs();

  const [random] = useState(() => defaultRandom());
  const [settings, setSettings] = useState<MatchSettings>(DEFAULT_SETTINGS);
  const [table, setTable] = useState<TableState | null>(null);

  const soundOptions = useMemo(
    () => ({ enabled: preferences.soundsEnabled, volume: preferences.volume }),
    [preferences.soundsEnabled, preferences.volume],
  );

  useEffect(() => {
    wm.setTitle(windowId, t('app.poker'));
  }, [t, windowId, wm]);

  /** Applies the result of an engine step and celebrates the human win. */
  const handleStep = useCallback(
    (step: { state: TableState; events: HandEvent[] }) => {
      setTable(step.state);
      const end = step.events.find((event) => event.kind === 'hand-end');
      if (!end || end.kind !== 'hand-end') return;
      const humanWon = end.result.pots.some((pot) =>
        pot.winners.some((winner) => winner.seat === HUMAN_SEAT),
      );
      if (humanWon) playSound('ding', soundOptions);
      const summary = resultSummary(step.state, t).join('. ');
      if (summary) wm.announce(summary);
    },
    [soundOptions, t, wm],
  );

  const startMatch = useCallback(
    (matchSettings: MatchSettings) => {
      const names = pickBotNames(matchSettings.opponents, random);
      const created = createTable({
        players: [
          { id: 'human', name: t('poker.you'), isHuman: true, personality: null },
          ...names.map((name, index) => ({
            id: `bot-${index}`,
            name,
            isHuman: false,
            personality: createPersonality(matchSettings.temperament, random),
          })),
        ],
        startingStack: matchSettings.startingStack,
        smallBlind: SMALL_BLIND,
        bigBlind: BIG_BLIND,
      });
      const { state } = startHand(created, random);
      setSettings(matchSettings);
      setTable(state);
      playSound('open', soundOptions);
    },
    [random, soundOptions, t],
  );

  const act = useCallback(
    (action: PlayerAction) => {
      if (!table) return;
      try {
        handleStep(applyAction(table, action));
        playSound('click', soundOptions);
      } catch (error) {
        void dialogs.alert({
          title: t('common.error'),
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [dialogs, handleStep, soundOptions, t, table],
  );

  const nextHand = useCallback(() => {
    if (!table || table.phase !== 'handComplete' || table.players[HUMAN_SEAT].stack <= 0) return;
    setTable(startHand(table, random).state);
    playSound('click', soundOptions);
  }, [random, soundOptions, table]);

  const openSetup = useCallback(async () => {
    if (table && table.phase !== 'matchOver') {
      const confirmed = await dialogs.confirm({
        title: t('poker.newMatch'),
        message: t('poker.confirmNewMatch'),
        kind: 'question',
      });
      if (!confirmed) return;
    }
    setTable(null);
  }, [dialogs, t, table]);

  /* Rivals think for a moment, then act. */
  useEffect(() => {
    if (!table || table.phase !== 'hand' || table.toAct < 0) return;
    const player = table.players[table.toAct];
    if (player.isHuman) return;
    const delay = preferences.reduceMotion ? 120 : 500 + Math.floor(random() * 400);
    const timer = window.setTimeout(() => {
      try {
        handleStep(applyAction(table, chooseBotAction(table, random)));
      } catch (error) {
        void dialogs.alert({
          title: t('common.error'),
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [dialogs, handleStep, preferences.reduceMotion, random, t, table]);

  const showAbout = () => {
    void dialogs.alert({
      title: t('poker.aboutTitle'),
      message: t('poker.aboutText'),
      detail: t('poker.aboutVersion'),
      kind: 'info',
    });
  };

  const menus: MenuBarMenu[] = [
    {
      id: 'game',
      label: t('poker.menu.game'),
      entries: [
        { kind: 'item', id: 'new', label: t('poker.newMatch'), onSelect: () => void openSetup() },
        {
          kind: 'item',
          id: 'next',
          label: t('poker.nextHand'),
          accelerator: 'F2',
          disabled:
            table?.phase !== 'handComplete' || (table?.players[HUMAN_SEAT].stack ?? 0) <= 0,
          onSelect: nextHand,
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
          label: t('poker.helpTopics'),
          onSelect: () => window.dispatchEvent(new CustomEvent('w95:open-help', { detail: 'poker' })),
        },
        menuSeparator('sep-help'),
        { kind: 'item', id: 'about', label: t('poker.aboutTitle'), onSelect: showAbout },
      ],
    },
  ];

  return (
    <div
      className="app-poker"
      onKeyDown={(event) => {
        if (event.key === 'F2') {
          event.preventDefault();
          nextHand();
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <MenuBar menus={menus} ariaLabel={t('app.poker')} />

      {table ? (
        <>
          <PokerTable state={table} />
          <ActionBar
            state={table}
            onAction={act}
            onNextHand={nextHand}
            onNewMatch={() => void openSetup()}
          />
          <StatusBar
            panels={[
              { id: 'hand', content: t('poker.status.hand', { number: table.handNumber }) },
              {
                id: 'blinds',
                content: t('poker.status.blinds', { small: table.smallBlind, big: table.bigBlind }),
                width: 120,
              },
              {
                id: 'stack',
                content: t('poker.status.chips', { amount: table.players[HUMAN_SEAT].stack }),
                width: 140,
              },
            ]}
          />
        </>
      ) : (
        <SetupPanel settings={settings} onChange={setSettings} onStart={() => startMatch(settings)} />
      )}
    </div>
  );
}
