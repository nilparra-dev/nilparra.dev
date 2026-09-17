import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useDialogs } from '../../core/dialogs/DialogProvider';
import { useVfs } from '../../core/fs/VfsProvider';
import { mimeForName } from '../../core/fs/vfsUtils';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Slider } from '../../ui/Slider';
import { StatusBar } from '../../ui/StatusBar';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { menuSeparator } from '../../ui/menu/types';
import '../../styles/app-mediaplayer.css';

const MEDIA_FILTERS = [
  {
    label: 'Audio y vídeo (*.mp3; *.wav; *.ogg; *.m4a; *.flac; *.mp4; *.webm; *.ogv; *.mov)',
    test: (name: string) => {
      const mime = mimeForName(name);
      return mime.startsWith('audio/') || mime.startsWith('video/');
    },
  },
  { label: 'Todos los archivos (*.*)', test: () => true },
];

const SKIP_SECONDS = 10;
const SCALE_LEVELS = [50, 100, 200];

interface MediaSource {
  url: string;
  name: string;
  kind: 'audio' | 'video';
}

/**
 * Media Player: a real <video> element (it plays audio too) driven by the
 * classic transport. The file comes from the virtual disk and the object URL
 * is revoked as soon as the window changes track or closes.
 */
export function MediaPlayerApp({ windowId, params }: AppRenderProps) {
  const { t } = useI18n();
  const vfs = useVfs();
  const dialogs = useDialogs();
  const wm = useWindowManager();

  const initialFileId = typeof params.fileId === 'string' ? params.fileId : null;
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;

  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const seekRef = useRef<HTMLDivElement | null>(null);

  const [fileId, setFileId] = useState<string | null>(initialFileId);
  const [source, setSource] = useState<MediaSource | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [scale, setScale] = useState(100);

  /* --- track loading ------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setTime(0);
    setDuration(0);
    setPlaying(false);
    setUnsupported(false);
    if (!fileId) {
      setSource(null);
      return;
    }
    void (async () => {
      const node = vfsRef.current.nodeById(fileId);
      const blob = await vfsRef.current.readFileBlob(fileId);
      if (cancelled) return;
      if (!blob) {
        setUnsupported(true);
        return;
      }
      url = URL.createObjectURL(blob);
      const mime = blob.type || node?.mime || '';
      setSource({
        url,
        name: node?.name ?? '',
        kind: mime.startsWith('video/') ? 'video' : 'audio',
      });
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileId]);

  useEffect(() => {
    wm.setTitle(windowId, source ? `${source.name} - ${t('app.mediaPlayer')}` : t('app.mediaPlayer'));
  }, [source, t, windowId, wm]);

  useEffect(() => {
    const media = mediaRef.current;
    if (media) media.volume = volume / 100;
  }, [source, volume]);

  /* --- transport ---------------------------------------------------- */

  const play = useCallback(() => {
    const media = mediaRef.current;
    if (!media || !source) return;
    void media.play().catch((cause: unknown) => {
      // Interrupted loads are normal; anything else means the format failed.
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setUnsupported(true);
      setPlaying(false);
    });
  }, [source]);

  const pause = useCallback(() => {
    mediaRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.pause();
    media.currentTime = 0;
    setTime(0);
  }, []);

  const seekBy = useCallback((delta: number) => {
    const media = mediaRef.current;
    if (!media || !Number.isFinite(media.duration)) return;
    const next = Math.max(0, Math.min(media.duration, media.currentTime + delta));
    media.currentTime = next;
    setTime(next);
  }, []);

  const seekTo = useCallback((clientX: number) => {
    const media = mediaRef.current;
    const bar = seekRef.current;
    if (!media || !bar || !Number.isFinite(media.duration) || media.duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const next = ratio * media.duration;
    media.currentTime = next;
    setTime(next);
  }, []);

  const openMedia = useCallback(async () => {
    const result = await dialogs.openFile({
      title: t('media.open'),
      startFolderId: vfs.folders.pictures ?? vfs.folders.documents ?? vfs.folders.desktop ?? undefined,
      filters: MEDIA_FILTERS,
    });
    if (result?.node) setFileId(result.node.id);
  }, [dialogs, t, vfs.folders]);

  /* --- menus -------------------------------------------------------- */

  const hasTrack = source !== null && !unsupported;
  const scalePercent = scale;

  const menus = useMemo<MenuBarMenu[]>(
    () => [
      {
        id: 'file',
        label: t('menu.file'),
        accessKey: 'a',
        entries: [
          { kind: 'item', id: 'open', label: t('media.open'), onSelect: () => void openMedia() },
          menuSeparator('sep'),
          { kind: 'item', id: 'close', label: t('common.close'), onSelect: () => void wm.close(windowId) },
        ],
      },
      {
        id: 'device',
        label: t('menu.device'),
        accessKey: 'd',
        entries: [
          { kind: 'item', id: 'play', label: t('media.play'), disabled: !hasTrack, onSelect: play },
          { kind: 'item', id: 'pause', label: t('media.pause'), disabled: !hasTrack, onSelect: pause },
          { kind: 'item', id: 'stop', label: t('media.stop'), disabled: !hasTrack, onSelect: stop },
          menuSeparator('sep1'),
          { kind: 'item', id: 'rewind', label: t('media.rewind'), disabled: !hasTrack, onSelect: () => seekBy(-SKIP_SECONDS) },
          { kind: 'item', id: 'forward', label: t('media.forward'), disabled: !hasTrack, onSelect: () => seekBy(SKIP_SECONDS) },
        ],
      },
      {
        id: 'scale',
        label: t('menu.scale'),
        accessKey: 'e',
        entries: SCALE_LEVELS.map((level) => ({
          kind: 'item' as const,
          id: `scale-${level}`,
          label: `${level}%`,
          checked: scalePercent === level,
          radio: true,
          onSelect: () => setScale(level),
        })),
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
    [hasTrack, openMedia, pause, play, scalePercent, seekBy, stop, t, windowId, wm],
  );

  const percent = duration > 0 ? Math.max(0, Math.min(100, (time / duration) * 100)) : 0;
  const videoVisible = source?.kind === 'video' && !unsupported;

  return (
    <div className="app-mediaplayer">
      <MenuBar menus={menus} ariaLabel={t('app.mediaPlayer')} />

      <div className="media-screen bevel-down">
        <video
          ref={mediaRef}
          className="media-element"
          data-hidden={!videoVisible || undefined}
          src={source?.url}
          playsInline
          style={videoVisible ? { transform: `scale(${scale / 100})` } : undefined}
          onLoadedMetadata={(event) => {
            const media = event.currentTarget;
            setDuration(Number.isFinite(media.duration) ? media.duration : 0);
          }}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => {
            setUnsupported(true);
            setPlaying(false);
          }}
        />
        {!source && !unsupported && <p className="media-notice">{t('media.noFile')}</p>}
        {unsupported && <p className="media-notice">{t('media.noSupport')}</p>}
        {source && source.kind === 'audio' && !unsupported && (
          <p className="media-notice">{t('media.nowPlaying', { name: source.name })}</p>
        )}
      </div>

      <div
        ref={seekRef}
        className="media-seek bevel-down"
        role="slider"
        tabIndex={0}
        aria-label={source ? t('media.nowPlaying', { name: source.name }) : t('media.noFile')}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          seekTo(event.clientX);
        }}
        onPointerMove={(event: ReactPointerEvent<HTMLDivElement>) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          seekTo(event.clientX);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            seekBy(-5);
          } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            seekBy(5);
          } else if (event.key === 'Home') {
            event.preventDefault();
            seekBy(Number.NEGATIVE_INFINITY);
          } else if (event.key === 'End') {
            event.preventDefault();
            seekBy(Number.POSITIVE_INFINITY);
          }
        }}
      >
        <div className="media-seek-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="media-controls">
        <button
          type="button"
          className="media-transport"
          aria-label={t('media.play')}
          title={t('media.play')}
          disabled={!hasTrack || playing}
          onClick={play}
        >
          <TransportGlyph kind="play" />
        </button>
        <button
          type="button"
          className="media-transport"
          aria-label={t('media.pause')}
          title={t('media.pause')}
          disabled={!hasTrack || !playing}
          onClick={pause}
        >
          <TransportGlyph kind="pause" />
        </button>
        <button
          type="button"
          className="media-transport"
          aria-label={t('media.stop')}
          title={t('media.stop')}
          disabled={!hasTrack}
          onClick={stop}
        >
          <TransportGlyph kind="stop" />
        </button>
        <span className="tool-sep" />
        <button
          type="button"
          className="media-transport"
          aria-label={t('media.rewind')}
          title={t('media.rewind')}
          disabled={!hasTrack}
          onClick={() => seekBy(-SKIP_SECONDS)}
        >
          <TransportGlyph kind="rewind" />
        </button>
        <button
          type="button"
          className="media-transport"
          aria-label={t('media.forward')}
          title={t('media.forward')}
          disabled={!hasTrack}
          onClick={() => seekBy(SKIP_SECONDS)}
        >
          <TransportGlyph kind="forward" />
        </button>
        <span className="media-time">
          {formatClock(time)} / {formatClock(duration)}
        </span>
        <div className="media-volume">
          <Slider
            value={volume}
            onChange={setVolume}
            ariaLabel={t('tray.volume')}
            width={90}
            ticks={8}
          />
        </div>
      </div>

      <StatusBar
        panels={[
          {
            id: 'state',
            content: source
              ? t('media.nowPlaying', { name: source.name })
              : unsupported
                ? t('media.noSupport')
                : t('media.noFile'),
          },
          {
            id: 'time',
            width: 140,
            content: `${formatClock(time)} / ${formatClock(duration)}`,
          },
        ]}
      />
    </div>
  );
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function TransportGlyph({ kind }: { kind: 'play' | 'pause' | 'stop' | 'rewind' | 'forward' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {kind === 'play' && <path d="M3 2 L10 6 L3 10 Z" fill="currentColor" />}
      {kind === 'pause' && (
        <>
          <rect x="2" y="2" width="3" height="8" fill="currentColor" />
          <rect x="7" y="2" width="3" height="8" fill="currentColor" />
        </>
      )}
      {kind === 'stop' && <rect x="2" y="2" width="8" height="8" fill="currentColor" />}
      {kind === 'rewind' && (
        <>
          <path d="M6 2 L1 6 L6 10 Z" fill="currentColor" />
          <path d="M11 2 L6 6 L11 10 Z" fill="currentColor" />
        </>
      )}
      {kind === 'forward' && (
        <>
          <path d="M6 2 L11 6 L6 10 Z" fill="currentColor" />
          <path d="M1 2 L6 6 L1 10 Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
