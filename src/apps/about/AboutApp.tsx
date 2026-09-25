import { useMemo } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useAppLauncher } from '../../core/apps/launcher';
import { PLACEHOLDER, PROFILE, TECHNOLOGIES, isPlaceholder, pick } from '../../core/content';
import type { StudyEntry } from '../../core/content/profile';
import { useOpenExternal } from '../../core/dialogs/useOpenExternal';
import { useVfs } from '../../core/fs/VfsProvider';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { GroupBox } from '../../ui/GroupBox';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { StatusBar } from '../../ui/StatusBar';

function PlaceholderBadge({ text }: { text: string }) {
  return <span className="placeholder-badge">{text}</span>;
}

/** Published profile content, with education grouped by school. */
export function AboutApp({ windowId }: AppRenderProps) {
  const { t, locale, formatDate } = useI18n();
  const openExternal = useOpenExternal();
  const vfs = useVfs();
  const launch = useAppLauncher();
  const wm = useWindowManager();

  const tagline = pick(PROFILE.tagline, locale);
  const bio = pick(PROFILE.bio, locale);
  const extras = pick(PROFILE.extras, locale);
  const cvUrl = PROFILE.cvUrl ? pick(PROFILE.cvUrl, locale) : null;
  const schools = new Map<string, Pick<StudyEntry, 'centre' | 'centreLogo'> & { studies: StudyEntry[] }>();
  for (const study of PROFILE.studies) {
    const school = schools.get(study.centreId);
    if (school) school.studies.push(study);
    else schools.set(study.centreId, { centre: study.centre, centreLogo: study.centreLogo, studies: [study] });
  }

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
        <header className="app-section-head about-profile-head">
          <img
            className="about-profile-photo bevel-down"
            src={`${import.meta.env.BASE_URL}${PROFILE.photoUrl}`}
            alt={PROFILE.displayName}
            width={112}
            height={112}
          />
          <div className="about-profile-details">
            <h1>{PROFILE.displayName}</h1>
            <p className="u-selectable">{tagline}</p>
            <p className="about-profile-location u-selectable">{PROFILE.location}</p>
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

        {schools.size > 0 && (
          <GroupBox title={t('about.studies')}>
            <ul className="about-schools" role="list">
              {Array.from(schools, ([id, school]) => (
                <li key={id} className="about-school">
                  <img
                    className="about-study-logo bevel-down"
                    src={`${import.meta.env.BASE_URL}${school.centreLogo}`}
                    alt=""
                    width={136}
                    height={64}
                  />
                  <div className="about-school-details">
                    <h2 className="about-school-name">{pick(school.centre, locale)}</h2>
                    <ul className="about-qualifications" role="list">
                      {school.studies.map((study) => (
                        <li key={`${study.period}-${study.status}`} className="about-qualification">
                          <div className="about-study-meta">
                            <span className="about-period">{study.period}</span>
                            {study.status === 'current' && (
                              <span className="about-study-status">{t('about.inProgress')}</span>
                            )}
                          </div>
                          <h3 className="about-study-title">{pick(study.title, locale)}</h3>
                          <p>{pick(study.description, locale)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </GroupBox>
        )}

        {PROFILE.experience.length > 0 && (
          <GroupBox title={t('about.experience')}>
            <ul className="about-schools" role="list">
              {PROFILE.experience.map((job, index) => (
                <li key={index} className="about-school">
                  <img
                    className="about-study-logo about-company-logo bevel-down"
                    src={`${import.meta.env.BASE_URL}${job.companyLogo}`}
                    alt=""
                    width={136}
                    height={64}
                  />
                  <div>
                    <h2 className="about-school-name">{job.company}</h2>
                    <strong>{pick(job.role, locale)}</strong>
                    <p className="about-period">{pick(job.period, locale)}</p>
                    <p>{pick(job.description, locale)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </GroupBox>
        )}

        {PROFILE.skills.length > 0 && (
          <GroupBox title={t('about.skills')}>
            {PROFILE.skills.map((group) => {
              const title = pick(group.title, locale);
              return (
                <section key={title} className="about-skill-group">
                  <h3 className="about-skill-group-title">{title}</h3>
                  <ul className="about-skills" role="list">
                    {group.skills.map((skill) => {
                      const technology = TECHNOLOGIES[skill.technology];
                      return (
                        <li key={skill.technology}>
                          <span className="about-skill-name">
                            {technology.logo && (
                              <img
                                src={`${import.meta.env.BASE_URL}${technology.logo}`}
                                alt=""
                                width={16}
                                height={16}
                                loading="lazy"
                              />
                            )}
                            {technology.name}
                          </span>
                          {typeof skill.level === 'number' && (
                            <span className="about-skill-track bevel-down" aria-hidden="true">
                              <span className="about-skill-fill" style={{ width: `${skill.level}%` }} />
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </GroupBox>
        )}

        {PROFILE.languages.length > 0 && (
          <GroupBox title={t('about.languages')}>
            <ul className="about-list" role="list">
              {PROFILE.languages.map((language) => (
                <li key={language.code} className="u-selectable">
                  <strong>{pick(language.name, locale)}</strong>: {pick(language.level, locale)}
                </li>
              ))}
            </ul>
          </GroupBox>
        )}

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

        {cvUrl && (
          <GroupBox title={t('about.cv')}>
            <div className="u-row">
              <Button primary onClick={() => void openExternal(cvUrl)}>
                {t('about.downloadCv')}
              </Button>
              {PROFILE.cvUpdatedAt && (
                <span className="u-muted">{formatDate(new Date(PROFILE.cvUpdatedAt), { dateStyle: 'long' })}</span>
              )}
            </div>
          </GroupBox>
        )}
      </div>

      <StatusBar
        grip
        panels={[
          { id: 'links', width: 260, content: PROFILE.email },
          {
            id: 'projects',
            content: PROFILE.links
              .filter((link) => !link.url.startsWith('mailto:'))
              .map((link) => link.label)
              .join(' · '),
          },
        ]}
      />
    </div>
  );
}
