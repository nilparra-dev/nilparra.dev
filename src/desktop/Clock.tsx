import { useEffect, useState } from 'react';
import { useI18n } from '../core/i18n/I18nProvider';
import { Tooltip } from '../ui/Tooltip';

/**
 * Tray clock. The time is formatted with the language of the interface
 * (`Intl`), so Spanish and Catalan show 22:40 and English shows 10:40 PM; the
 * tooltip carries the full date.
 */
export function Clock() {
  const { t, formatTime, formatDate } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <Tooltip text={formatDate(now, { dateStyle: 'full' })} delay={400}>
      <span className="tray-clock" aria-label={t('tray.clockLabel')} role="timer">
        {formatTime(now)}
      </span>
    </Tooltip>
  );
}
