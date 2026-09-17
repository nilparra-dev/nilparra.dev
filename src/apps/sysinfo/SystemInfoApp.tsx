import { useMemo, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { APP_CATALOG, APP_IDS } from '../../core/apps/catalog';
import { APP_COMPONENTS } from '../../core/apps/components';
import { DESKTOP_PRODUCT_NAME } from '../../core/content/branding';
import { PROFILE } from '../../core/content';
import { useVfs } from '../../core/fs/VfsProvider';
import { formatBytes } from '../../core/fs/vfsUtils';
import { useI18n } from '../../core/i18n/I18nProvider';
import { Icon } from '../../ui/Icon';
import { StatusBar } from '../../ui/StatusBar';
import { Tabs } from '../../ui/Tabs';

type TabId = 'general' | 'devices' | 'performance';

/** Desktop version shown in the system window. */
const DESKTOP_VERSION = '1.0.0';

function describeBrowser(): string {
  if (typeof navigator === 'undefined') return '';
  const agent = navigator.userAgent;
  const browser = agent.includes('Firefox')
    ? 'Firefox'
    : agent.includes('Edg/')
      ? 'Edge'
      : agent.includes('Chrome')
        ? 'Chrome'
        : agent.includes('Safari')
          ? 'Safari'
          : 'Browser';
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
    ?? navigator.platform
    ?? '';
  return `${browser} · ${platform}`.trim();
}

/**
 * System properties: the real data of the session (version, browser, storage)
 * and the list of installed virtual devices, which is just the application
 * catalogue.
 */
export function SystemInfoApp({ windowId }: AppRenderProps) {
  const { t, formatDateTime } = useI18n();
  const vfs = useVfs();
  const [tab, setTab] = useState<TabId>('general');

  const tabs = useMemo(
    () => [
      { id: 'general', label: t('sys.general') },
      { id: 'devices', label: t('sys.devices') },
      { id: 'performance', label: t('sys.performance') },
    ],
    [t],
  );

  const installed = APP_IDS.filter((appId) => APP_COMPONENTS[appId] && APP_CATALOG[appId].startMenu !== 'hidden');

  return (
    <div className="app-sysinfo">
      <Tabs tabs={tabs} activeId={tab} onChange={(id) => setTab(id as TabId)} ariaLabel={t('app.systemProperties')} />

      <div className="tab-panel w95-scroll app-sysinfo-panel">
        {tab === 'general' && (
          <>
            <div className="sysinfo-brand">
              <Icon id="computer" size={32} />
              <div>
                <p className="sysinfo-product">{DESKTOP_PRODUCT_NAME}</p>
                <p className="u-muted">v{DESKTOP_VERSION}</p>
              </div>
            </div>
            <dl className="sysinfo-grid">
              <dt>{t('sys.system')}</dt>
              <dd>
                {DESKTOP_PRODUCT_NAME} · v{DESKTOP_VERSION}
              </dd>
              <dt>{t('sys.registered')}</dt>
              <dd>{PROFILE.displayName}</dd>
              <dt>{t('sys.computer')}</dt>
              <dd>{describeBrowser()}</dd>
              <dt>{t('sys.storage')}</dt>
              <dd>
                {t('cp.storageUsed', {
                  used: formatBytes(vfs.usage.usage),
                  quota: formatBytes(vfs.usage.quota),
                })}
              </dd>
              <dt>{t('sys.build')}</dt>
              <dd>{formatDateTime(new Date())}</dd>
            </dl>
          </>
        )}

        {tab === 'devices' && (
          <table className="explorer-details sysinfo-devices">
            <thead>
              <tr>
                <th scope="col">{t('sys.device')}</th>
                <th scope="col">{t('sys.status')}</th>
              </tr>
            </thead>
            <tbody>
              {installed.map((appId) => (
                <tr key={appId}>
                  <td>
                    <span className="sysinfo-device">
                      <Icon id={APP_CATALOG[appId].icon} size={16} />
                      {t(APP_CATALOG[appId].nameKey)}
                    </span>
                  </td>
                  <td>{t('sys.working')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'performance' && (
          <>
            <p>{t('cp.storageHeading')}</p>
            <div className="cp-usage bevel-down" role="img" aria-label={t('cp.storageHeading')}>
              <span
                className="cp-usage-fill"
                style={{
                  width: `${vfs.usage.quota > 0 ? Math.min(100, (vfs.usage.usage / vfs.usage.quota) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="u-selectable">
              {t('cp.storageUsed', {
                used: formatBytes(vfs.usage.usage),
                quota: formatBytes(vfs.usage.quota),
              })}
            </p>
            <p className="u-muted">{t('cp.storageHint')}</p>
          </>
        )}
      </div>

      <StatusBar
        grip
        panels={[
          { id: 'device', content: `${DESKTOP_PRODUCT_NAME} v${DESKTOP_VERSION}` },
          { id: 'apps', width: 160, content: t('common.items', { count: installed.length }) },
        ]}
      />
      <span hidden>{windowId}</span>
    </div>
  );
}
