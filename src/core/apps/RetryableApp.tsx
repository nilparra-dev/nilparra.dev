import { Component, Suspense, lazy, useMemo, useState, type ReactNode } from 'react';
import { useT } from '../i18n/I18nProvider';
import type { AppComponent, AppRenderProps } from './launcher';

export interface AppLoader {
  load: () => Promise<AppComponent>;
  /** Forget a rejected or stale module so the next render can try again. */
  reset: () => void;
}

interface AppLoadBoundaryProps {
  children: ReactNode;
  errorMessage: string;
  onRetry: () => void;
  retryLabel: string;
}

interface AppLoadBoundaryState {
  failed: boolean;
}

class AppLoadBoundary extends Component<AppLoadBoundaryProps, AppLoadBoundaryState> {
  override state: AppLoadBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppLoadBoundaryState {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <div className="client app-load-error" role="alert">
          <p>{this.props.errorMessage}</p>
          <button type="button" onClick={this.props.onRetry}>
            {this.props.retryLabel}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface RetryableAppProps extends AppRenderProps {
  loader: AppLoader;
}

/**
 * Loads a split application behind a local error boundary. A failed import gets
 * a fresh lazy component on retry instead of reusing React's rejected payload.
 */
export function RetryableApp({ loader, windowId, params }: RetryableAppProps) {
  const t = useT();
  const [attempt, setAttempt] = useState(0);
  const Application = useMemo(
    () => lazy(() => loader.load().then((component) => ({ default: component }))),
    [attempt, loader],
  );
  const retry = () => {
    loader.reset();
    setAttempt((value) => value + 1);
  };

  return (
    <AppLoadBoundary
      key={attempt}
      errorMessage={t('common.loadFailed')}
      onRetry={retry}
      retryLabel={t('common.retry')}
    >
      <Suspense
        fallback={
          <div className="client app-loading" role="status">
            {t('common.loading')}
          </div>
        }
      >
        <Application windowId={windowId} params={params} />
      </Suspense>
    </AppLoadBoundary>
  );
}

/** Creates the component stored in the application registry for one loader. */
export function createRetryableApp(loader: AppLoader) {
  return function RetryableApplication(props: AppRenderProps) {
    return <RetryableApp loader={loader} {...props} />;
  };
}
