import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { iconForNode, nodeTypeLabel } from '../../core/fs/display';
import type { FsNode } from '../../core/fs/types';
import { formatBytes } from '../../core/fs/vfsUtils';
import { useFileOpener } from '../../core/fs/useFileOpener';
import { useVfs } from '../../core/fs/VfsProvider';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Icon } from '../../ui/Icon';
import { Select, type SelectOption } from '../../ui/Select';
import { StatusBar } from '../../ui/StatusBar';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { useMenuLayer } from '../../ui/menu/MenuLayer';
import { menuSeparator, type MenuEntry } from '../../ui/menu/types';
import '../../styles/app-find.css';

type FindTab = 'name' | 'advanced';

/** Location value that disables the scope restriction: the whole disk. */
const WHOLE_DISK = '__all__';
const BATCH_SIZE = 40;
/** Yield to the browser between batches so the window never freezes. */
const BATCH_DELAY = 16;

/**
 * Find: the classic search window. Searches run in batches over the virtual
 * disk and can be stopped at any moment; results open with their associated
 * application.
 */
export function FindApp({ windowId, params }: AppRenderProps) {
  const { t, locale, formatDateTime } = useI18n();
  const vfs = useVfs();
  const dialogs = useDialogs();
  const wm = useWindowManager();
  const openNode = useFileOpener();
  const { open: openMenu } = useMenuLayer();
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;

  const [tab, setTab] = useState<FindTab>('name');
  const [nameTerm, setNameTerm] = useState(typeof params.term === 'string' ? params.term : '');
  const [contentTerm, setContentTerm] = useState('');
  const [location, setLocation] = useState(WHOLE_DISK);
  const [subfolders, setSubfolders] = useState(true);
  const [searching, setSearching] = useState(false);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<FsNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stopRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const collectedRef = useRef<FsNode[]>([]);

  const collator = useMemo(() => new Intl.Collator(locale, { sensitivity: 'base', numeric: true }), [locale]);

  useEffect(() => {
    wm.setTitle(windowId, t('app.find'));
  }, [t, windowId, wm]);

  /* The batch timer must not outlive the window. */
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  /* --- location list ------------------------------------------------ */

  const locationOptions = useMemo<SelectOption[]>(() => {
    const options: SelectOption[] = [{ value: WHOLE_DISK, label: t('find.wholeDisk') }];
    const seen = new Set<string>();
    const push = (id: string | undefined) => {
      if (!id || seen.has(id)) return;
      const node = vfs.nodeById(id);
      if (!node || node.kind !== 'folder') return;
      seen.add(id);
      options.push({ value: id, label: vfs.pathOf(id)?.path ?? node.name });
    };
    const systemRoots = Object.values(vfs.folders).filter((id): id is string => typeof id === 'string');
    for (const id of systemRoots) push(id);
    for (const rootId of systemRoots) {
      for (const child of vfs.liveChildren(rootId)) {
        if (child.kind === 'folder') push(child.id);
      }
    }
    // Keep the current folder visible even when it is not one of the defaults.
    if (location !== WHOLE_DISK) push(location);
    return options;
  }, [location, t, vfs]);

  /* --- search ------------------------------------------------------- */

  const finishSearch = useCallback((collected: FsNode[]) => {
    setResults([...collected]);
    setSearching(false);
    setFinished(true);
  }, []);

  const stopSearch = useCallback(() => {
    stopRef.current = true;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (searching) finishSearch(collectedRef.current);
  }, [finishSearch, searching]);

  const startSearch = useCallback(() => {
    const term = nameTerm.trim().toLowerCase();
    const contents = contentTerm.trim().toLowerCase();
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (!term && !contents) {
      setResults([]);
      setFinished(false);
      setSelectedId(null);
      return;
    }

    stopRef.current = false;
    collectedRef.current = [];
    setSearching(true);
    setFinished(false);
    setResults([]);
    setSelectedId(null);

    const disk = vfsRef.current.nodes;
    const scopeId = location === WHOLE_DISK ? undefined : location;
    const candidates: FsNode[] = [];
    for (const node of disk.values()) {
      if (node.kind !== 'file' || node.deletedAt !== null) continue;
      if (!isInside(disk, node, scopeId, subfolders)) continue;
      candidates.push(node);
    }

    let index = 0;
    const step = () => {
      timerRef.current = null;
      if (stopRef.current) {
        finishSearch(collectedRef.current);
        return;
      }
      const end = Math.min(candidates.length, index + BATCH_SIZE);
      for (; index < end; index += 1) {
        const node = candidates[index];
        if (term && !node.name.toLowerCase().includes(term)) continue;
        const contentOk =
          !contents ||
          (typeof node.content === 'string' && node.content.toLowerCase().includes(contents));
        if (!contentOk) continue;
        collectedRef.current.push(node);
      }
      if (index < candidates.length) {
        timerRef.current = window.setTimeout(step, BATCH_DELAY);
      } else {
        finishSearch(collectedRef.current);
      }
    };
    timerRef.current = window.setTimeout(step, 0);
  }, [contentTerm, finishSearch, location, nameTerm, subfolders]);

  const newSearch = useCallback(() => {
    stopRef.current = true;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    collectedRef.current = [];
    setSearching(false);
    setFinished(false);
    setResults([]);
    setSelectedId(null);
    setNameTerm('');
    setContentTerm('');
    setLocation(WHOLE_DISK);
    setSubfolders(true);
    setTab('name');
  }, []);

  const browse = useCallback(async () => {
    // The shell has no folder picker: pick a file and search in its folder.
    const result = await dialogs.openFile({
      title: t('find.browse'),
      startFolderId: location === WHOLE_DISK ? vfs.folders.desktop : location,
    });
    if (result?.node?.parentId) setLocation(result.node.parentId);
  }, [dialogs, location, t, vfs.folders.desktop]);

  /* --- results ------------------------------------------------------ */

  const ordered = useMemo(
    () => [...results].sort((a, b) => collator.compare(a.name, b.name)),
    [collator, results],
  );

  const itemMenu = useCallback(
    (node: FsNode): MenuEntry[] => [
      { kind: 'item', id: 'open', label: t('desktop.open'), onSelect: () => void openNode(node) },
      menuSeparator('sep'),
      {
        kind: 'item',
        id: 'properties',
        label: t('desktop.properties'),
        onSelect: () => void dialogs.properties(node),
      },
    ],
    [dialogs, openNode, t],
  );

  const menus = useMemo<MenuBarMenu[]>(
    () => [
      {
        id: 'file',
        label: t('menu.file'),
        accessKey: 'a',
        entries: [
          { kind: 'item', id: 'now', label: t('find.now'), disabled: searching, onSelect: startSearch },
          { kind: 'item', id: 'stop', label: t('find.stop'), disabled: !searching, onSelect: stopSearch },
          menuSeparator('sep'),
          { kind: 'item', id: 'new', label: t('find.new'), onSelect: newSearch },
        ],
      },
      {
        id: 'help',
        label: t('menu.help'),
        accessKey: 'y',
        entries: [
          {
            kind: 'item',
            id: 'topics',
            label: t('app.help'),
            onSelect: () =>
              window.dispatchEvent(new CustomEvent('w95:open-help', { detail: 'welcome' })),
          },
        ],
      },
    ],
    [newSearch, searching, startSearch, stopSearch, t],
  );

  const status = searching
    ? t('find.searching')
    : finished
      ? results.length > 0
        ? t('find.found', { count: results.length })
        : t('find.notFound')
      : '';

  return (
    <div className="app-find">
      <MenuBar menus={menus} ariaLabel={t('app.find')} />

      <div className="find-body">
        <p className="find-heading">{t('find.heading')}</p>

        <div className="tabs" role="tablist" aria-label={t('app.find')}>
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={tab === 'name'}
            onClick={() => setTab('name')}
          >
            {t('common.name')}
          </button>
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={tab === 'advanced'}
            onClick={() => setTab('advanced')}
          >
            {t('find.advanced')}
          </button>
        </div>

        <div className="tab-panel find-panel" role="tabpanel">
          {tab === 'name' ? (
            <div className="find-field-row">
              <label className="find-label" htmlFor="find-name">
                {t('find.name')}
              </label>
              <input
                id="find-name"
                className="field u-grow"
                value={nameTerm}
                onChange={(event) => setNameTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    startSearch();
                  }
                }}
              />
            </div>
          ) : (
            <div className="find-field-row">
              <label className="find-label" htmlFor="find-contents">
                {t('find.contents')}
              </label>
              <input
                id="find-contents"
                className="field u-grow"
                value={contentTerm}
                onChange={(event) => setContentTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    startSearch();
                  }
                }}
              />
            </div>
          )}

          <div className="find-field-row">
            <span className="find-label" id="find-location-label">
              {t('find.location')}
            </span>
            <Select
              ariaLabel={t('find.location')}
              className="u-grow"
              value={location}
              options={locationOptions}
              onChange={setLocation}
            />
            <Button size="small" onClick={() => void browse()}>
              {t('find.browse')}
            </Button>
          </div>

          <Checkbox checked={subfolders} onChange={setSubfolders} label={t('find.subfolders')} />
        </div>

        <div className="find-buttons">
          <Button primary onClick={startSearch} disabled={searching}>
            {t('find.now')}
          </Button>
          <Button onClick={stopSearch} disabled={!searching}>
            {t('find.stop')}
          </Button>
          <Button onClick={newSearch}>{t('find.new')}</Button>
        </div>

        <div className="find-results bevel-down">
          <div className="find-head" aria-hidden="true">
            <span>{t('common.name')}</span>
            <span>{t('common.type')}</span>
            <span>{t('common.size')}</span>
            <span>{t('common.date')}</span>
          </div>
          <div className="find-list w95-scroll" role="listbox" aria-label={t('find.results')}>
            {ordered.map((node) => (
              <button
                key={node.id}
                type="button"
                role="option"
                aria-selected={selectedId === node.id}
                data-selected={selectedId === node.id || undefined}
                className="find-result"
                onClick={() => setSelectedId(node.id)}
                onDoubleClick={() => void openNode(node)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void openNode(node);
                  }
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setSelectedId(node.id);
                  openMenu({ entries: itemMenu(node), x: event.clientX, y: event.clientY });
                }}
              >
                <span className="find-result-name">
                  <Icon id={iconForNode(node)} size={16} />
                  <span className="find-result-text">{node.name}</span>
                </span>
                <span className="find-result-text">{nodeTypeLabel(node, t)}</span>
                <span className="find-result-text">{formatBytes(node.size)}</span>
                <span className="find-result-text">{formatDateTime(node.updatedAt)}</span>
              </button>
            ))}
            {finished && ordered.length === 0 && <p className="find-empty">{t('find.notFound')}</p>}
          </div>
        </div>
      </div>

      <StatusBar
        panels={[
          { id: 'status', width: 210, content: status },
          {
            id: 'location',
            content: location === WHOLE_DISK ? t('find.wholeDisk') : vfs.pathOf(location)?.path ?? '',
          },
        ]}
      />
    </div>
  );
}

/** True when a node belongs to the search scope. */
function isInside(
  nodes: Map<string, FsNode>,
  node: FsNode,
  scopeId: string | undefined,
  subfolders: boolean,
): boolean {
  if (!scopeId) return true;
  if (!subfolders) return node.parentId === scopeId;
  let current = node.parentId;
  let guard = 0;
  while (current && guard < 64) {
    if (current === scopeId) return true;
    current = nodes.get(current)?.parentId ?? null;
    guard += 1;
  }
  return false;
}
