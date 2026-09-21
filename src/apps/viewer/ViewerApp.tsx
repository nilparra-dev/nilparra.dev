import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent as ReactSyntheticEvent,
} from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useVfs } from '../../core/fs/VfsProvider';
import { formatBytes } from '../../core/fs/vfsUtils';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { StatusBar } from '../../ui/StatusBar';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { menuSeparator } from '../../ui/menu/types';
import '../../styles/app-viewer.css';

type ZoomMode = 'fit' | 'actual' | 'zoom';

const ZOOM_STEP = 1.25;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

interface ViewerSource {
  url: string;
  mime: string;
  name: string;
  size: number;
}

/**
 * Image and PDF viewer. The file arrives as a blob of the virtual disk and is
 * shown through an <img> or an <iframe>; zoom is accumulated over the natural
 * size and everything can be exported back to the host machine.
 */
export function ViewerApp({ windowId, params }: AppRenderProps) {
  const { t } = useI18n();
  const vfs = useVfs();
  const wm = useWindowManager();
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;

  const fileId = typeof params.fileId === 'string' ? params.fileId : null;

  const [source, setSource] = useState<ViewerSource | null>(null);
  const [loading, setLoading] = useState(fileId !== null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<ZoomMode>('fit');
  const [zoom, setZoom] = useState(1);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    if (!fileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      const node = vfsRef.current.nodeById(fileId);
      const blob = await vfsRef.current.readFileBlob(fileId);
      if (cancelled) return;
      if (!blob) {
        setFailed(true);
        setLoading(false);
        return;
      }
      url = URL.createObjectURL(blob);
      setSource({
        url,
        mime: node?.mime || blob.type || '',
        name: node?.name ?? '',
        size: blob.size,
      });
      setFailed(false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileId]);

  useEffect(() => {
    wm.setTitle(windowId, source ? `${source.name} - ${t('app.viewer')}` : t('app.viewer'));
  }, [source, t, windowId, wm]);

  const isImage = source !== null && source.mime.startsWith('image/');
  const isPdf = source?.mime === 'application/pdf';
  const canRender = !failed && (isImage || isPdf);

  const exportFile = useCallback(async () => {
    if (fileId) await vfsRef.current.exportNode(fileId);
  }, [fileId]);

  const fit = useCallback(() => setMode('fit'), []);
  const actualSize = useCallback(() => {
    setMode('actual');
    setZoom(1);
  }, []);
  const zoomIn = useCallback(() => {
    setMode('zoom');
    setZoom((value) => Math.min(MAX_ZOOM, Math.round(value * ZOOM_STEP * 100) / 100));
  }, []);
  const zoomOut = useCallback(() => {
    setMode('zoom');
    setZoom((value) => Math.max(MIN_ZOOM, Math.round((value / ZOOM_STEP) * 100) / 100));
  }, []);

  const handleImageLoad = useCallback((event: ReactSyntheticEvent<HTMLImageElement>) => {
    setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
  }, []);

  const menus = useMemo<MenuBarMenu[]>(
    () => [
      {
        id: 'file',
        label: t('menu.file'),
        accessKey: 'a',
        entries: [
          { kind: 'item', id: 'export', label: t('viewer.export'), disabled: !fileId, onSelect: () => void exportFile() },
          menuSeparator('sep'),
          { kind: 'item', id: 'close', label: t('common.close'), onSelect: () => void wm.close(windowId) },
        ],
      },
      {
        id: 'view',
        label: t('menu.view'),
        accessKey: 'v',
        entries: [
          { kind: 'item', id: 'fit', label: t('viewer.fit'), checked: mode === 'fit', radio: true, disabled: !canRender, onSelect: fit },
          { kind: 'item', id: 'actual', label: t('viewer.actualSize'), checked: mode === 'actual', radio: true, disabled: !canRender, onSelect: actualSize },
          menuSeparator('sep1'),
          { kind: 'item', id: 'zoom-in', label: t('viewer.zoomIn'), disabled: !canRender, onSelect: zoomIn },
          { kind: 'item', id: 'zoom-out', label: t('viewer.zoomOut'), disabled: !canRender, onSelect: zoomOut },
        ],
      },
      {
        id: 'help',
        label: t('menu.help'),
        accessKey: 'y',
        entries: [
          {
            kind: 'item',
            id: 'topics',
            label: t('app.help'),
            onSelect: () =>
              window.dispatchEvent(new CustomEvent('w95:open-help', { detail: 'welcome' })),
          },
        ],
      },
    ],
    [actualSize, canRender, exportFile, fileId, fit, mode, t, windowId, wm, zoomIn, zoomOut],
  );

  const zoomLabel = mode === 'fit' ? t('viewer.fit') : `${Math.round(zoom * 100)}%`;

  return (
    <div className="app-viewer">
      <MenuBar menus={menus} ariaLabel={t('app.viewer')} />

      <div className="toolbar">
        <Button size="small" onClick={fit} disabled={!canRender}>
          {t('viewer.fit')}
        </Button>
        <Button size="small" onClick={actualSize} disabled={!canRender}>
          {t('viewer.actualSize')}
        </Button>
        <span className="tool-sep" />
        <Button size="small" onClick={zoomOut} disabled={!canRender}>
          {t('viewer.zoomOut')}
        </Button>
        <Button size="small" onClick={zoomIn} disabled={!canRender}>
          {t('viewer.zoomIn')}
        </Button>
        <span className="tool-sep" />
        <Button size="small" onClick={() => void exportFile()} disabled={!fileId}>
          {t('viewer.export')}
        </Button>
      </div>

      <div className="viewer-stage w95-scroll">
        {loading && <p className="viewer-message u-muted">{t('common.loading')}</p>}

        {!loading && !source && <p className="viewer-message u-muted">{t('media.noFile')}</p>}

        {!loading && source && !canRender && (
          <div className="viewer-message">
            <p>{t('viewer.cannotRender')}</p>
            <Button onClick={() => void exportFile()}>{t('viewer.export')}</Button>
          </div>
        )}

        {!loading && source && canRender && isImage && mode === 'fit' && (
          <div className="viewer-fit-wrap">
            <img
              className="viewer-image"
              src={source.url}
              alt={source.name}
              draggable={false}
              onLoad={handleImageLoad}
              onError={() => setFailed(true)}
            />
          </div>
        )}

        {!loading && source && canRender && isImage && mode !== 'fit' && (
          <img
            className="viewer-image"
            src={source.url}
            alt={source.name}
            draggable={false}
            style={natural ? { width: Math.round(natural.width * zoom), height: Math.round(natural.height * zoom) } : undefined}
            onLoad={handleImageLoad}
            onError={() => setFailed(true)}
          />
        )}

        {!loading && source && canRender && isPdf && (
          <div
            className="viewer-page-wrap"
            style={mode === 'zoom' ? { transform: `scale(${zoom})` } : undefined}
          >
            {/*
             * The source is a blob: URL of our own origin, so the document
             * inside would run with the full privileges of the site. No
             * allow-* token at all: a PDF viewer needs nothing else.
             */}
            <iframe
              className="viewer-page"
              src={source.url}
              title={source.name}
              sandbox=""
            />
          </div>
        )}
      </div>

      <StatusBar
        panels={[
          { id: 'name', content: source?.name ?? '' },
          { id: 'zoom', width: 96, content: source ? zoomLabel : '' },
          { id: 'size', width: 90, content: source ? formatBytes(source.size) : '' },
        ]}
      />
    </div>
  );
}
