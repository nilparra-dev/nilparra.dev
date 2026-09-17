import { useEffect, useRef, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { DESKTOP_PRODUCT_NAME } from '../../core/content/branding';
import { nodeDisplayName } from '../../core/fs/display';
import { ROOT_ID, type FsNode } from '../../core/fs/types';
import { useVfs, type VfsValue } from '../../core/fs/VfsProvider';
import { formatBytes, isValidName } from '../../core/fs/vfsUtils';
import { useI18n, type I18nValue } from '../../core/i18n/I18nProvider';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { playSound } from '../../core/sound/sounds';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { StatusBar } from '../../ui/StatusBar';
import '../../styles/app-console.css';

/**
 * Command prompt over the virtual disk. It never touches the host system:
 * every command works on the same IndexedDB disk the shell uses. Where the
 * catalogue has no console specific message, the shell's existing strings are
 * reused (dialog.nameInUse, dialog.invalidName, dialog.storageFailed).
 */

type Translate = I18nValue['t'];
type PathError = 'badPath' | 'notADirectory';

interface ConsoleLine {
  id: number;
  text: string;
  kind: 'command' | 'output' | 'error';
  /** Prompt shown before a typed command. */
  prompt?: string;
}

type ResolveResult = { node: FsNode } | { error: PathError };
type Destination = { folder: FsNode; name: string } | { error: PathError };

const MAX_LINES = 600;

function tokenize(line: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|(\S+)/g;
  let match = pattern.exec(line);
  while (match !== null) {
    tokens.push(match[1] ?? match[2]);
    match = pattern.exec(line);
  }
  return tokens;
}

/** Splits "Documents\notas.txt" into its drive-relative parts. */
function splitPath(text: string): { absolute: boolean; segments: string[] } {
  let value = text.trim();
  const absolute = /^[a-z]:/i.test(value) || value.startsWith('\\') || value.startsWith('/');
  if (/^[a-z]:/i.test(value)) value = value.slice(2);
  const segments = value
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0 && segment !== '.');
  return { absolute, segments };
}

function splitParent(text: string): { parentText: string; leaf: string } {
  const trimmed = text.trim().replace(/[\\/]+$/, '');
  const index = Math.max(trimmed.lastIndexOf('\\'), trimmed.lastIndexOf('/'));
  if (index < 0) return { parentText: '', leaf: trimmed };
  return { parentText: trimmed.slice(0, index), leaf: trimmed.slice(index + 1) };
}

/** Finds a child by its internal name or by the name shown in the shell. */
function findChild(vfs: VfsValue, parent: FsNode, name: string, t: Translate): FsNode | undefined {
  const target = name.toLowerCase();
  return vfs
    .liveChildren(parent.id)
    .find(
      (child) =>
        child.name.toLowerCase() === target || nodeDisplayName(child, t).toLowerCase() === target,
    );
}

function resolvePath(vfs: VfsValue, t: Translate, cwdId: string, text: string): ResolveResult {
  const { absolute, segments } = splitPath(text);
  let current = vfs.nodeById(absolute ? ROOT_ID : cwdId) ?? vfs.nodeById(ROOT_ID);
  if (!current) return { error: 'badPath' };
  for (const segment of segments) {
    if (segment === '..') {
      current = current.parentId ? vfs.nodeById(current.parentId) ?? current : current;
      continue;
    }
    if (current.kind !== 'folder') return { error: 'notADirectory' };
    const child = findChild(vfs, current, segment, t);
    if (!child) return { error: 'badPath' };
    current = child;
  }
  return { node: current };
}

/**
 * Command prompt: an MS-DOS style console with relative paths, history and a
 * scrollable log. Every command operates on the virtual disk.
 */
export function ConsoleApp({ windowId }: AppRenderProps) {
  const { t, formatDate, formatTime } = useI18n();
  const vfs = useVfs();
  const wm = useWindowManager();
  const { preferences } = usePreferences();

  const screenRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextId = useRef(1);
  const draftRef = useRef('');

  const [lines, setLines] = useState<ConsoleLine[]>(() => [
    {
      id: 0,
      kind: 'output',
      text: `${DESKTOP_PRODUCT_NAME}\n${t('console.onlyVirtual')}\n${t('console.helpHint')}`,
    },
  ]);
  const [cwdId, setCwdId] = useState(ROOT_ID);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);

  const sound = { enabled: preferences.soundsEnabled, volume: preferences.volume };

  /* The current folder may disappear from another window. */
  useEffect(() => {
    if (!vfs.nodeById(cwdId)) setCwdId(ROOT_ID);
  }, [cwdId, vfs]);

  useEffect(() => {
    const element = screenRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const print = (text: string, kind: 'output' | 'error' = 'output') => {
    setLines((current) => {
      const next: ConsoleLine[] = [...current, { id: nextId.current, text, kind }];
      nextId.current += 1;
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
  };

  const printError = (reason: PathError) => {
    print(t(reason === 'badPath' ? 'console.badPath' : 'console.notADirectory'), 'error');
  };

  const dosPath = (id: string): string => {
    const path = vfs.pathOf(id)?.path ?? 'C:';
    return path === 'C:' ? 'C:\\' : path;
  };

  const displayPath = (folderId: string, name: string): string => {
    const base = dosPath(folderId);
    return base.endsWith('\\') ? `${base}${name}` : `${base}\\${name}`;
  };

  const prompt = `${dosPath(cwdId)}>`;

  const resolve = (text: string): ResolveResult => resolvePath(vfs, t, cwdId, text);

  /** Folder the destination points at, plus the final name of the operation. */
  const resolveDestination = (text: string, fallbackName: string): Destination => {
    const direct = resolve(text);
    if (!('error' in direct)) {
      if (direct.node.kind === 'folder') return { folder: direct.node, name: fallbackName };
      return { error: 'notADirectory' };
    }
    const { parentText, leaf } = splitParent(text);
    if (!leaf) return direct;
    let parent: ResolveResult;
    if (parentText) {
      parent = resolve(parentText);
    } else {
      const current = vfs.nodeById(cwdId);
      parent = current ? { node: current } : { error: 'badPath' };
    }
    if ('error' in parent) return parent;
    if (parent.node.kind !== 'folder') return { error: 'notADirectory' };
    return { folder: parent.node, name: leaf };
  };

  /* --- commands ------------------------------------------------------- */

  const printDirRow = (node: FsNode): string => {
    const name = node.kind === 'folder' ? nodeDisplayName(node, t) : node.name;
    const size = node.kind === 'folder' ? '<DIR>' : formatBytes(node.size);
    return `${name.padEnd(24)}${size.padStart(10)}   ${formatDate(node.updatedAt)} ${formatTime(node.updatedAt)}`;
  };

  const commandDir = (arg?: string) => {
    let folderId = cwdId;
    if (arg) {
      const resolved = resolve(arg);
      if ('error' in resolved) return printError(resolved.error);
      if (resolved.node.kind === 'file') return print(printDirRow(resolved.node));
      folderId = resolved.node.id;
    }
    const entries = [...vfs.liveChildren(folderId)].sort((a, b) =>
      a.kind !== b.kind ? (a.kind === 'folder' ? -1 : 1) : a.name.localeCompare(b.name),
    );
    const total = entries.reduce(
      (sum, node) => sum + (node.kind === 'folder' ? vfs.folderSize(node.id) : node.size),
      0,
    );
    const body = entries.length
      ? entries.map(printDirRow).join('\n')
      : t('explorer.empty');
    print(`${dosPath(folderId)}\n\n${body}\n\n${t('common.items', { count: entries.length })}  ${formatBytes(total)}`);
  };

  const commandCd = (arg?: string) => {
    if (!arg) return print(dosPath(cwdId));
    const resolved = resolve(arg);
    if ('error' in resolved) return printError(resolved.error);
    if (resolved.node.kind !== 'folder') return printError('notADirectory');
    setCwdId(resolved.node.id);
  };

  const commandMd = async (arg?: string) => {
    const { parentText, leaf } = splitParent(arg ?? '');
    if (!leaf) return printError('badPath');
    let parent: FsNode | null = null;
    if (parentText) {
      const resolved = resolve(parentText);
      if ('error' in resolved) return printError(resolved.error);
      parent = resolved.node;
    } else {
      parent = vfs.nodeById(cwdId) ?? null;
    }
    if (!parent) return printError('badPath');
    if (parent.kind !== 'folder') return printError('notADirectory');
    if (!isValidName(leaf)) return print(t('dialog.invalidName'), 'error');
    if (findChild(vfs, parent, leaf, t)) return print(t('dialog.nameInUse', { name: leaf }), 'error');
    const created = await vfs.createFolder(parent.id, leaf);
    if (!created) print(t('dialog.storageFailed'), 'error');
  };

  const commandRd = async (arg?: string) => {
    if (!arg) return printError('badPath');
    const resolved = resolve(arg);
    if ('error' in resolved) return printError(resolved.error);
    const node = resolved.node;
    if (node.kind !== 'folder') return printError('notADirectory');
    if (node.id === ROOT_ID) return printError('badPath');
    if (node.readonly) return print(t('dialog.cannotDeleteSystem'), 'error');
    if (vfs.liveChildren(node.id).length) {
      return print(`${t('common.error')}: ${dosPath(node.id)}`, 'error');
    }
    const ok = await vfs.trash([node.id]);
    if (!ok) print(t('dialog.storageFailed'), 'error');
  };

  const commandType = async (arg?: string) => {
    if (!arg) return printError('badPath');
    const resolved = resolve(arg);
    if ('error' in resolved) return printError(resolved.error);
    if (resolved.node.kind === 'folder') return printError('notADirectory');
    const content = await vfs.readFileContent(resolved.node.id);
    if (content === null) return printError('badPath');
    print(content);
  };

  const commandCopy = async (sourceText?: string, destText?: string) => {
    if (!sourceText || !destText) return printError('badPath');
    const source = resolve(sourceText);
    if ('error' in source) return printError(source.error);
    if (source.node.kind !== 'file') return printError('notADirectory');
    const dest = resolveDestination(destText, source.node.name);
    if ('error' in dest) return printError(dest.error);
    if (!isValidName(dest.name)) return print(t('dialog.invalidName'), 'error');
    if (findChild(vfs, dest.folder, dest.name, t)) {
      return print(t('dialog.nameInUse', { name: dest.name }), 'error');
    }
    const blob = await vfs.readFileBlob(source.node.id);
    if (!blob) return printError('badPath');
    const created = await vfs.importFiles(dest.folder.id, [
      new File([blob], dest.name, { type: source.node.mime }),
    ]);
    if (!created.length) return print(t('dialog.storageFailed'), 'error');
    print(displayPath(dest.folder.id, created[0].name));
  };

  const commandMove = async (sourceText?: string, destText?: string) => {
    if (!sourceText || !destText) return printError('badPath');
    const source = resolve(sourceText);
    if ('error' in source) return printError(source.error);
    if (source.node.readonly) return print(t('dialog.cannotDeleteSystem'), 'error');
    const dest = resolveDestination(destText, source.node.name);
    if ('error' in dest) return printError(dest.error);
    if (source.node.kind === 'folder' && dest.folder.id === source.node.id) {
      return printError('badPath');
    }
    if (dest.folder.id === source.node.parentId && dest.name === source.node.name) return;
    if (dest.folder.id === source.node.parentId) {
      const renamed = await vfs.rename(source.node.id, dest.name);
      if (!renamed) return print(t('dialog.nameInUse', { name: dest.name }), 'error');
      return;
    }
    /* Moving to another folder keeps the name: one disk write per command. */
    if (dest.name !== source.node.name) return printError('badPath');
    const moved = await vfs.move([source.node.id], dest.folder.id);
    if (!moved) return printError('badPath');
    print(displayPath(dest.folder.id, source.node.name));
  };

  const commandDel = async (arg?: string) => {
    if (!arg) return printError('badPath');
    const resolved = resolve(arg);
    if ('error' in resolved) return printError(resolved.error);
    if (resolved.node.kind !== 'file') return printError('notADirectory');
    if (resolved.node.readonly) return print(t('dialog.cannotDeleteSystem'), 'error');
    const ok = await vfs.trash([resolved.node.id]);
    if (!ok) print(t('dialog.storageFailed'), 'error');
  };

  const commandRen = async (sourceText?: string, newName?: string) => {
    if (!sourceText || !newName) return printError('badPath');
    const resolved = resolve(sourceText);
    if ('error' in resolved) return printError(resolved.error);
    if (/[\\/]/.test(newName) || !isValidName(newName)) {
      return print(t('dialog.invalidName'), 'error');
    }
    const problem = resolved.node.parentId
      ? vfs.validateName(resolved.node.parentId, newName, resolved.node.id)
      : 'ok';
    if (problem !== 'ok') {
      return print(
        t(problem === 'taken' ? 'dialog.nameInUse' : 'dialog.invalidName', { name: newName }),
        'error',
      );
    }
    const ok = await vfs.rename(resolved.node.id, newName);
    if (!ok) print(t('dialog.storageFailed'), 'error');
  };

  const commandHelp = () => {
    print(`${t('console.helpTitle')}\n\n${t('console.helpBody')}\n\n${t('console.onlyVirtual')}`);
  };

  const runCommand = async (tokens: string[]) => {
    const [name, ...args] = tokens;
    switch (name.toUpperCase()) {
      case 'DIR':
        return commandDir(args[0]);
      case 'CD':
        return commandCd(args[0]);
      case 'MD':
        return commandMd(args[0]);
      case 'RD':
        return commandRd(args[0]);
      case 'TYPE':
        return commandType(args[0]);
      case 'COPY':
        return commandCopy(args[0], args[1]);
      case 'MOVE':
        return commandMove(args[0], args[1]);
      case 'DEL':
        return commandDel(args[0]);
      case 'REN':
        return commandRen(args[0], args[1]);
      case 'CLS':
        return setLines([]);
      case 'VER':
        return print(DESKTOP_PRODUCT_NAME);
      case 'HELP':
        return commandHelp();
      case 'EXIT':
        return wm.close(windowId);
      default:
        return print(t('console.unknown', { name }), 'error');
    }
  };

  /* --- input ---------------------------------------------------------- */

  const recall = (delta: number) => {
    if (!history.length) return;
    if (cursor === -1 && delta > 0) return;
    if (cursor === -1) draftRef.current = input;
    const next = Math.max(-1, Math.min(history.length - 1, cursor + delta));
    if (next === cursor) return;
    setCursor(next);
    setInput(next === -1 ? draftRef.current : history[next]);
  };

  const submit = () => {
    const raw = input.trim();
    if (!raw) return;
    setLines((current) => {
      const next: ConsoleLine[] = [
        ...current,
        { id: nextId.current, text: raw, kind: 'command', prompt },
      ];
      nextId.current += 1;
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
    setInput('');
    setHistory((current) => (current[current.length - 1] === raw ? current : [...current, raw]));
    setCursor(-1);
    draftRef.current = '';
    playSound('click', sound);
    void runCommand(tokenize(raw));
  };

  return (
    <div className="app-console">
      <div
        ref={screenRef}
        className="console-screen w95-scroll"
        role="log"
        aria-label={t('app.console')}
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <div key={line.id} className="console-line" data-kind={line.kind}>
            {line.prompt && <span className="console-prompt">{line.prompt}</span>}
            {line.text}
          </div>
        ))}
      </div>

      <div className="console-input-row">
        <span className="console-prompt" aria-hidden="true">
          {prompt}
        </span>
        <input
          ref={inputRef}
          className="console-input"
          value={input}
          aria-label={t('app.console')}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setInput(event.target.value);
            setCursor(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
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
            }
          }}
        />
      </div>

      <StatusBar
        panels={[
          { id: 'path', content: dosPath(cwdId) },
          { id: 'app', width: 160, content: t('app.console') },
        ]}
      />
    </div>
  );
}
