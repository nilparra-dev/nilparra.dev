import { useEffect, useMemo, useState } from 'react';
import { HELP_TOPICS, pick } from '../../core/content';
import { findHelpTopic } from '../../core/content/help';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useI18n } from '../../core/i18n/I18nProvider';
import { StatusBar } from '../../ui/StatusBar';

/**
 * Help window: topic list on the left, the selected topic on the right, like
 * the two-pane help viewer of the original shell.
 */
export function HelpApp({ params }: AppRenderProps) {
  const { t, locale } = useI18n();
  const initial = typeof params.topicId === 'string' ? params.topicId : HELP_TOPICS[0].id;
  const [topicId, setTopicId] = useState(initial);

  useEffect(() => {
    if (typeof params.topicId === 'string') setTopicId(params.topicId);
  }, [params.topicId]);

  const topic = useMemo(() => findHelpTopic(topicId) ?? HELP_TOPICS[0], [topicId]);

  return (
    <div className="client client--plain app-help">
      <div className="app-help-toolbar">
        <button
          type="button"
          className="btn btn--small"
          onClick={() => {
            const index = HELP_TOPICS.findIndex((candidate) => candidate.id === topic.id);
            const previous = HELP_TOPICS[(index - 1 + HELP_TOPICS.length) % HELP_TOPICS.length];
            setTopicId(previous.id);
          }}
        >
          ◀
        </button>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => {
            const index = HELP_TOPICS.findIndex((candidate) => candidate.id === topic.id);
            const next = HELP_TOPICS[(index + 1) % HELP_TOPICS.length];
            setTopicId(next.id);
          }}
        >
          ▶
        </button>
      </div>

      <div className="app-help-split">
        <nav className="w95-scroll app-help-contents" aria-label={t('app.help')}>
          <ul role="list">
            {HELP_TOPICS.map((candidate) => {
              const isActive = candidate.id === topic.id;
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    className="app-help-topic"
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => setTopicId(candidate.id)}
                  >
                    {pick(candidate.title, locale)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <article className="w95-scroll app-help-article u-selectable">
          <h1>{pick(topic.title, locale)}</h1>
          {pick(topic.body, locale).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </article>
      </div>

      <StatusBar panels={[{ id: 'topic', content: pick(topic.title, locale) }]} grip />
    </div>
  );
}
