import { useMemo } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useAppLauncher } from '../../core/apps/launcher';
import { PLACEHOLDER, PROFILE, isPlaceholder, pick } from '../../core/content';
import { useVfs } from '../../core/fs/VfsProvider';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { GroupBox } from '../../ui/GroupBox';
import { Icon } from '../../ui/Icon';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { StatusBar } from '../../ui/StatusBar';

function PlaceholderBadge({ text }: { text: string }) {
  return <span className="placeholder-badge">{text}</span>;
}

/** Shown when a section has no real content yet: never invents anything. */
function EmptySection({ hint }: { hint: string }) {
  return (
    <p className="about-empty">
      <PlaceholderBadge text={PLACEHOLDER} /> {hint}
    </p>
  );
}

/**
 * About me and CV: the real personal data, with the sections that are still
 * empty clearly marked as pending.
 */
export function AboutApp({ windowId }: AppRenderProps) {
  const { t, locale, formatDate } = useI18n();
  const vfs = useVfs();
  const launch = useAppLauncher();
  const wm = useWindowManager();

  const tagline = pick(PROFILE.tagline, locale);
  const bio = pick(PROFILE.bio, locale);
  const extras = pick(PROFILE.extras, locale);

  const menus = useMemo<MenuBarMenu[]>(
    () => [
      {
        id: 'file',
        label: t('menu.file'),
        accessKey: 'a',
        entries: [
          {
            kind: 'item',
            id: 'portfolio',
            label: t('about.openPortfolio'),
            onSelect: () => {
              const portfolio = vfs.folders.portfolio;
              if (!portfolio) return;
              launch({
                appId: 'explorer',
                params: { folderId: portfolio },
                title: t('folder.portfolio'),
                docKey: `explorer:${portfolio}`,
              });
            },
          },
          {
            kind: 'item',
            id: 'cv',
            label: t('about.downloadCv'),
            disabled: !PROFILE.cvUrl,
            onSelect: () => {
              if (PROFILE.cvUrl) window.open(PROFILE.cvUrl, '_blank', 'noopener,noreferrer');
            },
          },
          { kind: 'separator', id: 'sep', label: '' },
          { kind: 'item', id: 'projects', label: t('projects.heading'), onSelect: () => launch({ appId: 'projects' }) },
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
    [launch, t, vfs.folders.portfolio, windowId, wm],
  );

  return (
    <div className="app-about">
      <MenuBar menus={menus} ariaLabel={t('app.about')} />

      <div className="w95-scroll app-about-body">
        <header className="app-section-head">
          <Icon id="about-me" size={32} />
          <div>
            <h1>{PROFILE.displayName}</h1>
            <p className="u-selectable">{tagline}</p>
          </div>
        </header>

        <GroupBox title={t('about.bio')}>
          {bio.map((paragraph, index) => (
            <p key={index} className="about-paragraph u-selectable">
              {paragraph}
              {isPlaceholder(paragraph) && <PlaceholderBadge text={PLACEHOLDER} />}
            </p>
          ))}
        </GroupBox>

        <GroupBox title={t('about.studies')}>
          {PROFILE.studies.length === 0 ? (
            <EmptySection hint={t('about.addHint')} />
          ) : (
            <ul className="about-list" role="list">
              {PROFILE.studies.map((study, index) => (
                <li key={index}>
                  <span className="about-period">{study.period}</span>
                  <strong>{pick(study.title, locale)}</strong>
                  <span className="u-muted"> · {pick(study.centre, locale)}</span>
                  <p>{pick(study.description, locale)}</p>
                </li>
              ))}
            </ul>
          )}
        </GroupBox>

        <GroupBox title={t('about.experience')}>
          {PROFILE.experience.length === 0 ? (
            <EmptySection hint={t('about.addHint')} />
          ) : (
            <ul className="about-list" role="list">
              {PROFILE.experience.map((job, index) => (
                <li key={index}>
                  <span className="about-period">{job.period}</span>
                  <strong>{pick(job.role, locale)}</strong>
                  <span className="u-muted"> · {job.company}</span>
                  <p>{pick(job.description, locale)}</p>
                </li>
              ))}
            </ul>
          )}
        </GroupBox>

        <GroupBox title={t('about.skills')}>
          {PROFILE.skills.length === 0 ? (
            <EmptySection hint={t('about.addHint')} />
          ) : (
            <ul className="about-skills" role="list">
              {PROFILE.skills.map((skill) => (
                <li key={skill.name}>
                  <span>{skill.name}</span>
                  {typeof skill.level === 'number' && (
                    <span className="about-skill-track bevel-down" aria-hidden="true">
                      <span className="about-skill-fill" style={{ width: `${skill.level}%` }} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </GroupBox>

        {extras.length > 0 && (
          <GroupBox title={t('about.extras')}>
            <ul className="about-list" role="list">
              {extras.map((item, index) => (
                <li key={index} className="u-selectable">
                  {item}
                </li>
              ))}
            </ul>
          </GroupBox>
        )}

        <GroupBox title={t('about.cv')}>
          {PROFILE.cvUrl ? (
            <div className="u-row">
              <Button primary onClick={() => window.open(PROFILE.cvUrl as string, '_blank', 'noopener,noreferrer')}>
                {t('about.downloadCv')}
              </Button>
              {PROFILE.cvUpdatedAt && (
                <span className="u-muted">{formatDate(new Date(PROFILE.cvUpdatedAt), { dateStyle: 'long' })}</span>
              )}
            </div>
          ) : (
            <p className="u-selectable about-cv-missing">{t('about.cvMissing')}</p>
          )}
        </GroupBox>
      </div>

      <StatusBar
        grip
        panels={[
          { id: 'links', width: 260, content: PROFILE.email },
          {
            id: 'projects',
            content: PROFILE.links.map((link) => link.label).join(' · '),
          },
        ]}
      />
    </div>
  );
}
