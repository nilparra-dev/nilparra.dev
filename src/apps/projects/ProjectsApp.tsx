import { useMemo, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useAppLauncher } from '../../core/apps/launcher';
import { PLACEHOLDER, PROFILE, PROJECTS, isPlaceholder, pick } from '../../core/content';
import { useVfs } from '../../core/fs/VfsProvider';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Icon } from '../../ui/Icon';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { StatusBar } from '../../ui/StatusBar';

/** Small badge that marks content still waiting for the author. */
function PlaceholderBadge({ text }: { text: string }) {
  return <span className="placeholder-badge">{text}</span>;
}

/**
 * Portfolio window: one card per project with description, technologies,
 * screenshots and links. Entries marked as `placeholder` say so out loud.
 */
export function ProjectsApp({ windowId }: AppRenderProps) {
  const { t, locale } = useI18n();
  const vfs = useVfs();
  const launch = useAppLauncher();
  const wm = useWindowManager();
  const [view, setView] = useState<'cards' | 'details'>('cards');

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
          { kind: 'item', id: 'about', label: t('about.heading'), onSelect: () => launch({ appId: 'about' }) },
          { kind: 'separator', id: 'sep', label: '' },
          { kind: 'item', id: 'close', label: t('window.close'), onSelect: () => void wm.close(windowId) },
        ],
      },
      {
        id: 'view',
        label: t('menu.view'),
        accessKey: 'v',
        entries: [
          {
            kind: 'item',
            id: 'cards',
            label: t('desktop.viewLargeIcons'),
            checked: view === 'cards',
            radio: true,
            onSelect: () => setView('cards'),
          },
          {
            kind: 'item',
            id: 'details',
            label: t('desktop.viewDetails'),
            checked: view === 'details',
            radio: true,
            onSelect: () => setView('details'),
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
            id: 'help',
            label: t('app.help'),
            onSelect: () => window.dispatchEvent(new CustomEvent('w95:open-help', { detail: 'welcome' })),
          },
        ],
      },
    ],
    [launch, t, view, vfs, windowId, wm],
  );

  return (
    <div className="app-projects">
      <MenuBar menus={menus} ariaLabel={t('app.projects')} />
      <div className="w95-scroll app-projects-body">
        <header className="app-section-head">
          <Icon id="projects" size={32} />
          <div>
            <h1>{t('projects.heading')}</h1>
            <p className="u-muted">{t('projects.intro')}</p>
          </div>
        </header>

        {PROJECTS.map((project) => {
          const title = pick(project.title, locale);
          return (
            <article key={project.id} className="project-card">
              <div className="project-card-head">
                <h2>{title}</h2>
                {project.status === 'placeholder' && (
                  <PlaceholderBadge text={t('projects.placeholderBadge')} />
                )}
                {project.year && <span className="u-muted">{project.year}</span>}
              </div>

              <p className="project-summary">
                {pick(project.summary, locale)}
                {isPlaceholder(pick(project.summary, locale)) && (
                  <PlaceholderBadge text={PLACEHOLDER} />
                )}
              </p>

              {view === 'cards' && (
                <p className="project-description u-selectable">{pick(project.description, locale)}</p>
              )}

              <dl className="project-meta">
                <dt>{t('projects.technologies')}</dt>
                <dd>
                  {project.technologies.length > 0 ? (
                    <ul className="project-tech" role="list">
                      {project.technologies.map((technology) => (
                        <li key={technology} className="project-tech-item">
                          {technology}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <PlaceholderBadge text={PLACEHOLDER} />
                  )}
                </dd>

                <dt>{t('projects.repository')}</dt>
                <dd>
                  {project.repoUrl ? (
                    <a className="link" href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                      {t('projects.openRepo')}
                    </a>
                  ) : (
                    <PlaceholderBadge text={PLACEHOLDER} />
                  )}
                </dd>

                <dt>{t('projects.demo')}</dt>
                <dd>
                  {project.demoUrl ? (
                    <a className="link" href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                      {t('projects.openDemo')}
                    </a>
                  ) : (
                    <PlaceholderBadge text={PLACEHOLDER} />
                  )}
                </dd>
              </dl>

              <div className="project-shots">
                <span className="field-label">{t('projects.screenshots')}</span>
                {project.screenshots.length === 0 ? (
                  <p className="project-shots-empty">{t('projects.noScreenshots')}</p>
                ) : (
                  <ul className="project-shots-list" role="list">
                    {project.screenshots.map((shot) => (
                      <li key={shot.src}>
                        <img src={shot.src} alt={pick(shot.alt, locale)} loading="lazy" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}

        <p className="u-muted">{t('about.addHint')}</p>
      </div>

      <StatusBar
        grip
        panels={[
          { id: 'count', width: 200, content: t('common.items', { count: PROJECTS.length }) },
          { id: 'author', content: PROFILE.displayName },
        ]}
      />
    </div>
  );
}
