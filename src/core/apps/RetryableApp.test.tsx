// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nProvider } from '../i18n/I18nProvider';
import { createRetryableApp, type AppLoader } from './RetryableApp';
import type { AppComponent } from './launcher';

function LoadedApp(): ReactElement {
  return <div>cargada</div>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('retryable application chunk', () => {
  it('shows an error and creates a fresh loader after retry', async () => {
    let cached: Promise<AppComponent> | undefined;
    let attempts = 0;
    const loader: AppLoader = {
      load: () => {
        if (!cached) {
          attempts += 1;
          cached =
            attempts === 1
              ? Promise.reject(new Error('offline'))
              : Promise.resolve(LoadedApp);
        }
        return cached;
      },
      reset: () => {
        cached = undefined;
      },
    };
    const Application = createRetryableApp(loader);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <I18nProvider locale="es">
        <Application windowId="window-1" params={{}} />
      </I18nProvider>,
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('cargada')).toBeTruthy();
    expect(attempts).toBe(2);
  });
});
