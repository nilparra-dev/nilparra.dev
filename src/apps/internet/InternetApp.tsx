import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useAppLauncher } from '../../core/apps/launcher';
import { useOpenExternal } from '../../core/dialogs/useOpenExternal';
import { PROFILE } from '../../core/content';
import { useI18n } from '../../core/i18n/I18nProvider';
import {
  googleSearchUrl,
  searchWeb,
  WebSearchError,
  type WebSearchFailure,
  type WebSearchResult,
} from '../../core/websearch/searchWeb';
import { Button } from '../../ui/Button';
import { ExternalLink } from '../../ui/ExternalLink';
import { Icon } from '../../ui/Icon';
import { StatusBar } from '../../ui/StatusBar';
import { canEmbed, hostOf, parseWebUrl } from '../../core/websearch/embed';

type PageId = 'home' | 'links' | 'contact';

type SearchEntry = {
  id: number;
  kind: 'search';
  query: string;
  status: 'loading' | 'ready' | 'error';
  results: WebSearchResult[];
  error: WebSearchFailure | null;
};

type PageEntry = { id: number; kind: 'page'; page: PageId };

/** A real site, shown in place when the site allows being framed. */
type SiteEntry = { id: number; kind: 'site'; url: string };

type Entry = PageEntry | SearchEntry | SiteEntry;

/** A history entry before it gets its identity. */
type EntryDraft = Omit<PageEntry, 'id'> | Omit<SearchEntry, 'id'> | Omit<SiteEntry, 'id'>;

const PAGES: readonly PageId[] = ['home', 'links', 'contact'];

/**
 * Period browser: internal pages of the site, real sites in place and a real
 * web search.
 *
 * The window renders its own pages, embeds the sites that accept being framed
 * and lists live results; a site that refuses to be framed (GitHub, LinkedIn…)
 * gets a notice with a link to a real browser tab instead of a broken frame.
 * Searches never invent an answer: if the service is unavailable the window
 * says so.
 */
export function InternetApp({ windowId, params }: AppRenderProps) {
  const { t } = useI18n();
  const launch = useAppLauncher();
  const addressId = useId();
  const homeSearchId = useId();

  const startUrl = typeof params.url === 'string' ? parseWebUrl(params.url)?.href ?? null : null;

  const [history, setHistory] = useState<Entry[]>(() =>
    startUrl
      ? [{ id: 0, kind: 'site', url: startUrl }]
      : [{ id: 0, kind: 'page', page: 'home' }],
  );
  const [index, setIndex] = useState(0);
  /**
   * Address bar content. Internal pages leave it empty (with the search hint),
   * because the field doubles as the search box. `local://<page>` still works
   * if someone types it, it is just no longer shown.
   */
  const [draft, setDraft] = useState(startUrl ?? '');
  const nextId = useRef(1);
  const inFlight = useRef(new Set<AbortController>());

  useEffect(
    () => () => {
      inFlight.current.forEach((controller) => controller.abort());
    },
    [],
  );

  const entry = history[index] ?? history[0];

  const push = useCallback(
    (item: EntryDraft) => {
      const id = nextId.current;
      nextId.current += 1;
      const next: Entry = { ...item, id };
      setHistory((current) => [...current.slice(0, index + 1), next]);
      setIndex(index + 1);
      return id;
    },
    [index],
  );

  const openPage = useCallback(
    (page: PageId) => {
      push({ kind: 'page', page });
      setDraft('');
    },
    [push],
  );

  /** Opens a real site inside the window, when the address is a web URL. */
  const openSite = useCallback(
    (value: string) => {
      const url = parseWebUrl(value);
      if (!url) return false;
      push({ kind: 'site', url: url.href });
      setDraft(url.href);
      return true;
    },
    [push],
  );

  const openExternal = useOpenExternal();

  const startSearch = useCallback((id: number, term: string) => {
    const controller = new AbortController();
    inFlight.current.add(controller);
    void searchWeb(term, { signal: controller.signal })
      .then((results) => {
        if (controller.signal.aborted) return;
        setHistory((current) =>
          current.map((item) =>
            item.id === id && item.kind === 'search'
              ? { ...item, status: 'ready' as const, results }
              : item,
          ),
        );
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const reason: WebSearchFailure =
          cause instanceof WebSearchError ? cause.reason : 'server';
        setHistory((current) =>
          current.map((item) =>
            item.id === id && item.kind === 'search'
              ? { ...item, status: 'error' as const, error: reason }
              : item,
          ),
        );
      })
      .finally(() => inFlight.current.delete(controller));
  }, []);

  const runSearch = useCallback(
    (query: string) => {
      const term = query.trim();
      if (!term) return;
      const id = push({ kind: 'search', query: term, status: 'loading', results: [], error: null });
      setDraft(term);
      startSearch(id, term);
    },
    [push, startSearch],
  );

  const retry = useCallback(
    (item: SearchEntry) => {
      setHistory((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? { ...item, status: 'loading' as const, error: null }
            : candidate,
        ),
      );
      startSearch(item.id, item.query);
    },
    [startSearch],
  );

  const go = useCallback(
    (delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= history.length) return;
      const item = history[target];
      setIndex(target);
      setDraft(item.kind === 'page' ? '' : item.kind === 'site' ? item.url : item.query);
    },
    [history, index],
  );

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = draft.trim();
      if (!value) return;
      const local = /^local:\/\/(\w+)$/i.exec(value);
      const page = local?.[1]?.toLowerCase() as PageId | undefined;
      if (page && PAGES.includes(page)) {
        openPage(page);
        return;
      }
      // A web address opens in place; anything else is a search query.
      if (openSite(value)) return;
      runSearch(value);
    },
    [draft, openPage, openSite, runSearch],
  );

  const externalLinks = useMemo(() => PROFILE.links.filter((link) => link.external), []);

  const pageTitle = (page: PageId) =>
    page === 'home'
      ? t('internet.page.about')
      : page === 'links'
        ? t('internet.bookmarks')
        : t('internet.page.contact');

  const searchErrorMessage = (reason: WebSearchFailure | null) =>
    reason === 'limit'
      ? t('internet.search.error.limit')
      : reason === 'network'
        ? t('internet.search.error.network')
        : t('internet.search.error.server');

  const searchStatus = (item: SearchEntry) =>
    item.status === 'loading'
      ? t('internet.search.searching')
      : item.status === 'error'
        ? t('internet.search.errorStatus')
        : t('internet.search.count', { count: item.results.length });

  const entryTitle =
    entry.kind === 'page'
      ? pageTitle(entry.page)
      : entry.kind === 'site'
        ? hostOf(entry.url)
        : t('internet.search.results', { query: entry.query });

  const announcement =
    entry.kind === 'page'
      ? pageTitle(entry.page)
      : entry.kind === 'site'
        ? entryTitle
        : entry.status === 'loading'
          ? t('internet.search.searching')
          : entry.status === 'error'
            ? searchErrorMessage(entry.error)
            : t('internet.search.count', { count: entry.results.length });

  const renderPage = (page: PageId) => {
    if (page === 'links') {
      return (
        <ul className="internet-links" role="list">
          {externalLinks.map((link) => (
            <li key={link.id}>
              <Icon id={link.icon} size={16} />
              {parseWebUrl(link.url) ? (
                <button
                  type="button"
                  className="link link--button"
                  onClick={() => openSite(link.url)}
                >
                  {link.label}
                </button>
              ) : (
                <ExternalLink className="link" href={link.url}>
                  {link.label}
                </ExternalLink>
              )}
              <span className="u-muted">{link.url}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (page === 'contact') {
      return (
        <>
          <p>{t('mail.note')}</p>
          <p>
            <a className="link" href={`mailto:${PROFILE.email}`}>
              {PROFILE.email}
            </a>
          </p>
          <Button size="small" onClick={() => launch({ appId: 'mail' })}>
            {t('app.mail')}
          </Button>
        </>
      );
    }

    return (
      <>
        <p>{t('internet.home.searchHelp')}</p>
        <form className="internet-search-form" onSubmit={submit}>
          <label className="field-label" htmlFor={homeSearchId}>
            {t('internet.search.label')}
          </label>
          <input
            id={homeSearchId}
            className="field"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" size="small" disabled={!draft.trim()}>
            {t('internet.search.go')}
          </Button>
        </form>
        <p>{t('internet.externalNotice')}</p>
        <p>
          <button type="button" className="link link--button" onClick={() => openPage('links')}>
            {t('internet.bookmarks')}
          </button>
          {' · '}
          <button type="button" className="link link--button" onClick={() => openPage('contact')}>
            {t('internet.page.contact')}
          </button>
          {' · '}
          <button type="button" className="link link--button" onClick={() => launch({ appId: 'projects' })}>
            {t('internet.page.projects')}
          </button>
        </p>
      </>
    );
  };

  const renderSearch = (item: SearchEntry) => (
    <>
      {item.status === 'loading' && (
        <p className="internet-search-state" role="status">
          {t('internet.search.searching')}
        </p>
      )}

      {item.status === 'error' && (
        <div className="internet-search-state">
          <p>{searchErrorMessage(item.error)}</p>
          <p className="internet-search-actions">
            <Button size="small" onClick={() => retry(item)}>
              {t('internet.search.retry')}
            </Button>
            <ExternalLink className="link" href={googleSearchUrl(item.query)}>
              {t('internet.search.openGoogle')}
            </ExternalLink>
          </p>
        </div>
      )}

      {item.status === 'ready' && item.results.length === 0 && (
        <p className="internet-search-state">{t('internet.search.empty', { query: item.query })}</p>
      )}

      {item.status === 'ready' && item.results.length > 0 && (
        <>
          <ol className="internet-results" role="list">
            {item.results.map((result) => (
              <li key={result.id}>
                <ExternalLink className="link internet-result-title" href={result.url}>
                  {result.title}
                </ExternalLink>
                <span className="internet-result-url u-muted">{result.url}</span>
                {result.snippet && <p className="internet-result-snippet">{result.snippet}</p>}
              </li>
            ))}
          </ol>
          <p className="internet-search-footer u-muted">{t('internet.search.footer')}</p>
        </>
      )}
    </>
  );

  const renderSite = (item: SiteEntry) => {
    const host = hostOf(item.url);
    if (!canEmbed(item.url)) {
      return (
        <div className="internet-blocked">
          <h1 className="internet-title">{t('internet.site.blockedTitle')}</h1>
          <p>{t('internet.site.blocked', { host })}</p>
          <p>
            <Button size="small" onClick={() => openExternal(item.url)}>
              {t('internet.openExternal')}
            </Button>
          </p>
          <p className="u-muted u-selectable">{item.url}</p>
        </div>
      );
    }
    return (
      /*
       * Sandboxed: the framed site runs with its own origin (allow-same-origin
       * plus allow-scripts is required for anything to work), but navigation
       * of this page, forms towards us, popups and every other permission
       * stay off: a link the site opens in a new tab is simply blocked, while
       * the toolbar still opens the page in a real browser tab.
       * The source is always a validated http(s) URL from parseWebUrl.
       */
      <iframe
        className="internet-frame"
        src={item.url}
        title={t('internet.site.frameTitle', { host })}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    );
  };

  return (
    <div className="app-internet">
      <div className="toolbar">
        <button type="button" className="tool-btn" onClick={() => openPage('home')} title={t('internet.home')}>
          <Icon id="internet" size={16} />
          <span>{t('internet.home')}</span>
        </button>
        <button type="button" className="tool-btn" onClick={() => go(-1)} disabled={index === 0}>
          <span>{t('menu.back')}</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={() => go(1)}
          disabled={index >= history.length - 1}
        >
          <span>{t('viewer.next')}</span>
        </button>
        {entry.kind === 'site' && (
          <>
            <span className="tool-sep" />
            <button
              type="button"
              className="tool-btn"
              onClick={() => openExternal(entry.url)}
              title={t('internet.openExternal')}
            >
              <span>{t('internet.openExternal')}</span>
            </button>
          </>
        )}
      </div>

      <form className="internet-address" onSubmit={submit}>
        <label className="field-label" htmlFor={addressId}>
          {t('internet.address')}
        </label>
        <input
          id={addressId}
          className="field internet-url"
          type="text"
          value={draft}
          placeholder={t('internet.search.label')}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" size="small" disabled={!draft.trim()}>
          {t('internet.search.go')}
        </Button>
      </form>

      {entry.kind === 'site' ? (
        <div key={entry.id} className="client internet-site">
          {renderSite(entry)}
        </div>
      ) : (
        <div key={entry.id} className="w95-scroll client internet-page u-selectable">
          <h1 className="internet-title">{entryTitle}</h1>
          {entry.kind === 'page' ? renderPage(entry.page) : renderSearch(entry)}
        </div>
      )}

      <StatusBar
        grip
        panels={[
          {
            id: 'external',
            content: entry.kind === 'site' ? entry.url : t('internet.externalNotice'),
          },
          {
            id: 'page',
            width: 150,
            content:
              entry.kind === 'page'
                ? pageTitle(entry.page)
                : entry.kind === 'site'
                  ? hostOf(entry.url)
                  : searchStatus(entry),
          },
        ]}
      />
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      <span hidden>{windowId}</span>
    </div>
  );
}
