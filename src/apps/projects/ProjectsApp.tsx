import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { projectLink } from '../../core/apps/deepLink';
import { useAppLauncher } from '../../core/apps/launcher';
import type { ProjectContent } from '../../core/content';
import { PLACEHOLDER, PROFILE, PROJECTS, TECHNOLOGIES, isPlaceholder, pick } from '../../core/content';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { useVfs } from '../../core/fs/VfsProvider';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { ExternalLink } from '../../ui/ExternalLink';
import { Icon } from '../../ui/Icon';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { StatusBar } from '../../ui/StatusBar';
import { Tabs } from '../../ui/Tabs';
import { ScreenshotGallery } from './ScreenshotGallery';

/** Small badge that marks content still waiting for the author. */
function PlaceholderBadge({ text }: { text: string }) {
  return <span className="placeholder-badge">{text}</span>;
}

/** Resolve a path that lives inside `public/` for the current base path. */
function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

/**
 * Detail page of the selected project: mark, summary and the main action on
 * top, then the screenshot, the feature list, the technologies and finally the
 * long technical text behind a disclosure.
 */
function ProjectDetail({ project }: { project: ProjectContent }) {
  const { t, locale } = useI18n();
  const launch = useAppLauncher();
  const [showDetails, setShowDetails] = useState(false);
  const title = pick(project.title, locale);
  const summary = pick(project.summary, locale);
  const highlights = pick(project.highlights, locale);
  const description = pick(project.description, locale);
  const hasActions = project.repo.kind !== 'none' || project.status === 'placeholder' || Boolean(project.demoUrl);

  return (
    <article className="project-detail" aria-label={title}>
      <div className="project-detail-head">
        <img
          className="project-detail-logo"
          src={assetUrl(project.logo)}
          alt=""
          width={48}
          height={48}
        />
        <div className="project-detail-title">
          <h2>
            {title}
            {project.status === 'placeholder' && (
              <PlaceholderBadge text={t('projects.placeholderBadge')} />
            )}
          </h2>
        </div>
        {project.year && <span className="project-detail-year">{project.year}</span>}
      </div>

      <p className="project-summary">
        {summary}
        {isPlaceholder(summary) && <PlaceholderBadge text={PLACEHOLDER} />}
      </p>

      {hasActions && (
        <div className="project-actions">
          {project.repo.kind === 'public' && (
            <ExternalLink className="btn btn--default project-cta" href={project.repo.url}>
              {t('projects.openRepo')}
            </ExternalLink>
          )}
          {project.repo.kind === 'closed' && (
            <>
              <span className="source-badge">{t('projects.closedSource')}</span>
              <Button primary onClick={() => launch({ appId: 'mail' })}>
                {t('projects.requestDemo')}
              </Button>
            </>
          )}
          {project.repo.kind === 'none' && (
            <PlaceholderBadge text={PLACEHOLDER} />
          )}
          {project.demoUrl && (
            <ExternalLink className="btn" href={project.demoUrl}>
              {t('projects.openDemo')}
            </ExternalLink>
          )}
        </div>
      )}
      {project.repo.kind === 'closed' && (
        <p className="u-muted project-source-note">{pick(project.repo.note, locale)}</p>
      )}

      <section className="project-section project-shots">
        <h3 className="project-section-title">{t('projects.screenshots')}</h3>
        {project.screenshots.length === 0 ? (
          <p className="project-shots-empty">{t('projects.noScreenshots')}</p>
        ) : (
          <ScreenshotGallery screenshots={project.screenshots} />
        )}
      </section>

      {highlights.length > 0 && (
        <section className="project-section">
          <h3 className="project-section-title">{t('projects.features')}</h3>
          <ul className="project-highlights" role="list">
            {highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="project-section">
        <h3 className="project-section-title">{t('projects.technologies')}</h3>
        {project.technologies.length > 0 ? (
          <ul className="project-tech" role="list">
            {project.technologies.map((id) => {
              const technology = TECHNOLOGIES[id];
              return (
                <li key={id} className="project-tech-item">
                  {technology.logo && (
                    <img
                      src={assetUrl(technology.logo)}
                      alt=""
                      width={16}
                      height={16}
                      loading="lazy"
                    />
                  )}
                  {technology.name}
                </li>
              );
            })}
          </ul>
        ) : (
          <PlaceholderBadge text={PLACEHOLDER} />
        )}
      </section>

      {/* The long text stays behind a disclosure so the pane opens compact. */}
      <button
        type="button"
        className="btn btn--small project-more"
        aria-expanded={showDetails}
        onClick={() => setShowDetails((value) => !value)}
      >
        {showDetails ? t('projects.lessDetails') : t('projects.moreDetails')}
      </button>
      {showDetails && (
        <div className="project-description u-selectable">
          {description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}
    </article>
  );
}

/**
 * Portfolio window: a property sheet where the projects are tabs across the
 * top and the selected one fills the page below. Entries marked as
 * `placeholder` say so out loud.
 */
export function ProjectsApp({ windowId, params }: AppRenderProps) {
  const { t, locale } = useI18n();
  const vfs = useVfs();
  const launch = useAppLauncher();
  const wm = useWindowManager();
  const dialogs = useDialogs();
  const requestedId = typeof params.projectId === 'string' ? params.projectId : null;
  const [selectedId, setSelectedId] = useState<string>(requestedId ?? PROJECTS[0]?.id ?? '');
  const selected = PROJECTS.find((project) => project.id === selectedId) ?? PROJECTS[0];
  const [notice, setNotice] = useState<string | null>(null);

  /* A deep link can ask an already open window for another project. */
  useEffect(() => {
    if (requestedId) setSelectedId(requestedId);
  }, [requestedId]);

  const copyLink = useCallback(async () => {
    if (!selected) return;
    const link = projectLink(selected.slug);
    try {
      await navigator.clipboard.writeText(link);
      setNotice(t('projects.linkCopied'));
    } catch {
      // No async clipboard (older browser or an insecure context): show the
      // address in a field so it can be copied by hand.
      await dialogs.prompt({ title: t('projects.copyLink'), label: t('projects.linkLabel'), initialValue: link });
    }
  }, [dialogs, selected, t]);

  const menus = useMemo<MenuBarMenu[]>(
    () => [
      {
        id: 'file',
        label: t('menu.file'),
        accessKey: 'a',
        entries: [
          {
            kind: 'item',
            id: 'folder',
            label: t('projects.openFolder'),
            onSelect: () => {
              const portfolio = vfs.folders.portfolio;
              if (!portfolio) return;
              const projects = vfs
                .liveChildren(portfolio)
                .find((node) => node.kind === 'folder' && node.name === 'Proyectos');
              launch({
                appId: 'explorer',
                params: { folderId: projects?.id ?? portfolio },
                title: projects?.name ?? t('folder.portfolio'),
                docKey: `explorer:${projects?.id ?? portfolio}`,
              });
            },
          },
          { kind: 'item', id: 'link', label: t('projects.copyLink'), onSelect: () => void copyLink() },
          { kind: 'item', id: 'about', label: t('about.heading'), onSelect: () => launch({ appId: 'about' }) },
          { kind: 'separator', id: 'sep', label: '' },
          { kind: 'item', id: 'close', label: t('window.close'), onSelect: () => void wm.close(windowId) },
        ],
      },
      {
        id: 'help',
        label: t('menu.help'),
        accessKey: 'y',
        entries: [
          {
            kind: 'item',
            id: 'help',
            label: t('app.help'),
            onSelect: () => window.dispatchEvent(new CustomEvent('w95:open-help', { detail: 'welcome' })),
          },
        ],
      },
    ],
    [copyLink, launch, t, vfs, windowId, wm],
  );

  return (
    <div className="app-projects">
      <MenuBar menus={menus} ariaLabel={t('app.projects')} />
      <div className="w95-scroll app-projects-body">
        <header className="app-section-head">
          <Icon id="projects" size={32} />
          <div>
            <h1>{t('projects.heading')}</h1>
          </div>
        </header>

        <Tabs
          tabs={PROJECTS.map((project) => ({ id: project.id, label: pick(project.title, locale) }))}
          activeId={selected?.id ?? ''}
          onChange={(id) => {
            setSelectedId(id);
            setNotice(null);
          }}
          ariaLabel={t('projects.heading')}
        />
        <div
          className="tab-panel projects-panel"
          role="tabpanel"
          aria-label={selected ? pick(selected.title, locale) : undefined}
        >
          {selected && <ProjectDetail key={selected.id} project={selected} />}
        </div>
      </div>

      <StatusBar
        grip
        panels={[
          { id: 'count', width: 200, content: notice ?? t('common.items', { count: PROJECTS.length }) },
          { id: 'author', content: PROFILE.displayName },
        ]}
      />
    </div>
  );
}
