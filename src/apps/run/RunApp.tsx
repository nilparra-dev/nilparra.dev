import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useAppLauncher } from '../../core/apps/launcher';
import { APP_CATALOG } from '../../core/apps/catalog';
import { APP_COMPONENTS } from '../../core/apps/components';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { useI18n } from '../../core/i18n/I18nProvider';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { playSound } from '../../core/sound/sounds';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Select } from '../../ui/Select';
import '../../styles/app-run.css';

/**
 * Programs accept several names, like the command line of the original shell.
 * Only the applications that are really registered become reachable.
 */
const ALIASES: Record<string, string[]> = {
  welcome: ['welcome', 'bienvenida'],
  help: ['help', 'ayuda'],
  explorer: ['explorer', 'explorador', 'explorar'],
  notepad: ['notepad', 'bloc de notas', 'bloc', 'notas'],
  recyclebin: ['papelera', 'bin', 'papelera de reciclaje', 'recyclebin'],
  projects: ['projects', 'proyectos', 'mis proyectos'],
  about: ['about', 'sobre mi', 'curriculum', 'cv'],
  internet: ['internet', 'navegador'],
  mail: ['mail', 'correo', 'contacto'],
  controlpanel: ['control', 'panel de control', 'panel', 'controlpanel', 'configuracion'],
  sysinfo: ['sysinfo', 'sistema', 'propiedades del sistema'],
  calculator: ['calc', 'calculadora', 'calculator'],
  minesweeper: ['mine', 'minas', 'buscaminas', 'minesweeper'],
  solitaire: ['solitaire', 'solitario', 'solitari', 'cartas', 'cards', 'klondike'],
  poker: ['poker', 'poquer', 'texas', 'holdem', 'hold em'],
  paint: ['paint'],
  console: ['cmd', 'consola', 'console', 'simbolo del sistema'],
  find: ['find', 'buscar'],
  run: ['run', 'ejecutar'],
  mediaplayer: ['media', 'reproductor', 'mediaplayer'],
  viewer: ['viewer', 'visor'],
};

/** Primary (most recognisable) alias of an application. */
function primaryAlias(appId: string): string {
  return ALIASES[appId]?.[0] ?? appId;
}

/** Lower case, no accents, no spaces: "Papelera de reciclaje" -> "papeleradereciclaje". */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.exe$/i, '')
    .replace(/^"(.*)"$/, '$1')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Run: the classic command box. It resolves the typed name against the real
 * application catalogue (with aliases) and opens the matching window.
 */
export function RunApp({ windowId, params }: AppRenderProps) {
  const { t } = useI18n();
  const dialogs = useDialogs();
  const launch = useAppLauncher();
  const wm = useWindowManager();
  const { preferences } = usePreferences();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const draftRef = useRef('');

  const [command, setCommand] = useState(typeof params.command === 'string' ? params.command : '');
  const [history, setHistory] = useState<string[]>([]);
  /** History position; -1 means "editing a new command". */
  const [cursor, setCursor] = useState(-1);

  const sound = { enabled: preferences.soundsEnabled, volume: preferences.volume };

  const available = useMemo(() => Object.keys(APP_CATALOG).filter((id) => APP_COMPONENTS[id]), []);

  const aliasEntries = useMemo(
    () => available.flatMap((appId) => (ALIASES[appId] ?? [appId]).map((alias) => ({ appId, alias: normalize(alias) }))),
    [available],
  );

  const resolveCommand = (value: string): string | null => {
    const term = normalize(value);
    if (!term) return null;
    if (available.includes(term)) return term;
    const exact = aliasEntries.find((entry) => entry.alias === term);
    if (exact) return exact.appId;
    const byName = available.find((id) => normalize(t(APP_CATALOG[id].nameKey)) === term);
    if (byName) return byName;
    if (term.length < 3) return null;
    const matches = new Set(
      aliasEntries.filter((entry) => entry.alias.startsWith(term)).map((entry) => entry.appId),
    );
    for (const id of available) {
      if (normalize(t(APP_CATALOG[id].nameKey)).startsWith(term)) matches.add(id);
    }
    return matches.size === 1 ? [...matches][0] : null;
  };

  const commandOptions = useMemo(
    () =>
      available.map((appId) => ({
        value: primaryAlias(appId),
        label: `${primaryAlias(appId)} (${t(APP_CATALOG[appId].nameKey)})`,
      })),
    [available, t],
  );

  const aliasList = useMemo(
    () => available.flatMap((appId) => ALIASES[appId] ?? [appId]).join(', '),
    [available],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const recall = (delta: number) => {
    if (!history.length) return;
    if (cursor === -1 && delta > 0) return;
    if (cursor === -1) draftRef.current = command;
    const next = Math.max(-1, Math.min(history.length - 1, cursor + delta));
    if (next === cursor) return;
    setCursor(next);
    setCommand(next === -1 ? draftRef.current : history[next]);
  };

  const execute = async () => {
    const value = command.trim();
    if (!value) return;
    setHistory((current) => (current[current.length - 1] === value ? current : [...current, value]));
    setCursor(-1);
    draftRef.current = '';

    const first = value.split(/\s+/)[0];
    const appId = resolveCommand(value) ?? (first !== value ? resolveCommand(first) : null);
    if (!appId) {
      playSound('error', sound);
      await dialogs.alert({
        title: t('app.run'),
        kind: 'error',
        message: t('run.noApp', { name: value }),
      });
      return;
    }
    playSound('click', sound);
    launch({ appId });
    wm.close(windowId);
  };

  return (
    <div className="app-run">
      <div className="run-body">
        <div className="run-head">
          <Icon id="run" size={32} />
          <p className="run-text">{t('run.command')}</p>
        </div>

        <input
          ref={inputRef}
          className="field run-input"
          value={command}
          aria-label={t('run.command')}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setCommand(event.target.value);
            setCursor(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void execute();
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              recall(-1);
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              recall(1);
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              wm.close(windowId);
            }
          }}
        />

        <div className="run-history">
          <span className="run-label">{t('run.history')}</span>
          <Select
            className="run-select"
            ariaLabel={t('run.history')}
            value={command}
            options={commandOptions}
            onChange={(value) => {
              setCommand(value);
              setCursor(-1);
              inputRef.current?.focus();
            }}
          />
        </div>

        <p className="u-muted run-hint">{t('run.aliases', { list: aliasList })}</p>
        <p className="u-muted run-hint">{t('run.example')}</p>

        <div className="run-buttons">
          <Button primary onClick={() => void execute()}>
            {t('run.open')}
          </Button>
          <Button onClick={() => wm.close(windowId)}>{t('common.cancel')}</Button>
        </div>
      </div>
    </div>
  );
}
