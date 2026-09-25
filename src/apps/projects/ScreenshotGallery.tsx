import { useRef, useState, type KeyboardEvent } from 'react';
import { useAppLauncher } from '../../core/apps/launcher';
import type { ProjectScreenshot } from '../../core/content';
import { pick } from '../../core/content';
import { useI18n } from '../../core/i18n/I18nProvider';

/** Size of the viewer window a screenshot opens in; the window manager fits it on screen. */
const VIEWER_SIZE = { width: 1040, height: 720 };

/**
 * One large screenshot with its caption, and a strip of thumbnails to pick
 * another. The large one opens at full resolution in the image viewer. The
 * strip is a single tab stop: the arrow keys, Home and End move along it.
 */
export function ScreenshotGallery({ screenshots }: { screenshots: ProjectScreenshot[] }) {
  const { t, locale } = useI18n();
  const launch = useAppLauncher();
  const [index, setIndex] = useState(0);
  const thumbs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = screenshots[index] ?? screenshots[0];
  if (!current) return null;
  const caption = pick(current.alt, locale);
  const full = current.full ?? current.src;
  const base = import.meta.env.BASE_URL;

  const select = (next: number) => {
    const clamped = Math.max(0, Math.min(screenshots.length - 1, next));
    setIndex(clamped);
    thumbs.current[clamped]?.focus();
  };

  const onStripKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      Home: 0,
      End: screenshots.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  return (
    <figure className="project-gallery">
      <button
        type="button"
        className="project-gallery-hero"
        aria-label={t('projects.enlargeShot', { name: caption })}
        onClick={() =>
          launch({
            appId: 'viewer',
            params: { src: full },
            docKey: `viewer:${full}`,
            size: VIEWER_SIZE,
          })
        }
      >
        <img
          src={`${base}${current.src}`}
          srcSet={current.full ? `${base}${current.src} 1x, ${base}${current.full} 2x` : undefined}
          alt=""
        />
      </button>
      <figcaption className="project-gallery-caption">
        <span>{caption}</span>
        <span className="project-gallery-position">
          {t('projects.shotPosition', { index: index + 1, total: screenshots.length })}
        </span>
      </figcaption>

      {screenshots.length > 1 && (
        <div className="project-gallery-strip" role="group" aria-label={t('projects.screenshots')} onKeyDown={onStripKey}>
          {screenshots.map((shot, position) => (
            <button
              key={shot.src}
              ref={(element) => {
                thumbs.current[position] = element;
              }}
              type="button"
              className="project-gallery-thumb"
              aria-label={pick(shot.alt, locale)}
              aria-pressed={position === index}
              tabIndex={position === index ? 0 : -1}
              onClick={() => setIndex(position)}
            >
              <img src={`${base}${shot.src}`} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
