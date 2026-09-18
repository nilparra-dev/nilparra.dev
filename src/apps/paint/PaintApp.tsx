import { uiRect, uiPixels } from '../../ui/scale';
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
import type { TranslationKey } from '../../core/i18n/es';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { StatusBar } from '../../ui/StatusBar';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { menuSeparator } from '../../ui/menu/types';
import '../../styles/app-paint.css';

type ToolId = 'pencil' | 'eraser' | 'line' | 'rectangle' | 'ellipse' | 'fill';

const TOOL_IDS: ToolId[] = ['pencil', 'eraser', 'line', 'rectangle', 'ellipse', 'fill'];

const TOOL_LABEL_KEYS: Record<ToolId, TranslationKey> = {
  pencil: 'paint.pencil',
  eraser: 'paint.eraser',
  line: 'paint.line',
  rectangle: 'paint.rectangle',
  ellipse: 'paint.ellipse',
  fill: 'paint.fill',
};

/** The 16 VGA colours plus twelve grays: the classic 28 colour palette. */
const PALETTE = [
  '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
  '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
  '#101010', '#202020', '#303030', '#404040', '#505050', '#606060', '#707070', '#909090',
  '#a0a0a0', '#b0b0b0', '#d0d0d0', '#e0e0e0',
];

const THICKNESSES = [1, 2, 3, 5];
const MAX_UNDO = 24;
const DEFAULT_SIZE = { width: 640, height: 400 };
const ZOOM_LEVELS = [1, 2, 4];

const IMAGE_FILTERS = [
  {
    label: 'Imágenes (*.png; *.jpg; *.gif; *.webp; *.bmp; *.svg)',
    test: (name: string) => mimeForName(name).startsWith('image/'),
  },
  { label: 'Todos los archivos (*.*)', test: () => true },
];

interface StrokeState {
  tool: Exclude<ToolId, 'fill'>;
  color: string;
  thickness: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  /** Canvas content before the stroke, redrawn between shape previews. */
  original: ImageData | null;
}

/**
 * Paint: a real canvas editor over the virtual disk. Strokes, shapes and the
 * flood fill operate on pixels, undo keeps image snapshots and saving writes a
 * PNG file into the current folder of the disk.
 */
export function PaintApp({ windowId, params }: AppRenderProps) {
  const { t } = useI18n();
  const vfs = useVfs();
  const dialogs = useDialogs();
  const wm = useWindowManager();

  const initialFileId = typeof params.fileId === 'string' ? params.fileId : null;
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const strokeRef = useRef<StrokeState | null>(null);
  const pendingImageRef = useRef<ImageBitmap | HTMLImageElement | null>(null);
  const bootRef = useRef(false);

  const [fileId, setFileId] = useState<string | null>(initialFileId);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [documentToken, setDocumentToken] = useState(0);
  const [tool, setTool] = useState<ToolId>('pencil');
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [undoDepth, setUndoDepth] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(initialFileId !== null);

  const node = fileId ? vfs.nodeById(fileId) : undefined;
  const picturesFolder = vfs.folders.pictures ?? vfs.folders.documents ?? vfs.folders.desktop ?? '';

  /* --- canvas ------------------------------------------------------- */

  /**
   * Repaints the whole surface after a size change: React first clears the
   * bitmap when the width/height attributes change, so the pending image is
   * drawn here, after the commit.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = size.width;
    canvas.height = size.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const pending = pendingImageRef.current;
    if (pending) {
      pendingImageRef.current = null;
      ctx.drawImage(pending, 0, 0);
      if (typeof ImageBitmap !== 'undefined' && pending instanceof ImageBitmap) pending.close();
    }
  }, [size, documentToken]);

  const pushUndo = useCallback((): ImageData | null => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return null;
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const stack = undoRef.current;
    stack.push(image);
    if (stack.length > MAX_UNDO) stack.shift();
    setUndoDepth(stack.length);
    return image;
  }, []);

  const undo = useCallback(() => {
    const image = undoRef.current.pop();
    if (!image) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.putImageData(image, 0, 0);
    setUndoDepth(undoRef.current.length);
    setDirty(true);
  }, []);

  const clearImage = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    pushUndo();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDirty(true);
  }, [pushUndo]);

  /* --- loading and saving ------------------------------------------- */

  const loadImage = useCallback(async (id: string): Promise<boolean> => {
    const blob = await vfsRef.current.readFileBlob(id);
    if (!blob) return false;
    const image = await decodeImage(blob);
    if (!image) return false;
    const isElement = typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement;
    const width = isElement ? image.naturalWidth || image.width : image.width;
    const height = isElement ? image.naturalHeight || image.height : image.height;
    if (!width || !height) return false;
    pendingImageRef.current = image;
    undoRef.current = [];
    setUndoDepth(0);
    setSize({ width, height });
    setDocumentToken((token) => token + 1);
    setDirty(false);
    return true;
  }, []);

  /* Boot once: reloading the file whenever the disk changes would wipe the
   * strokes the user has drawn since the last save. */
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    if (initialFileId) {
      void loadImage(initialFileId).finally(() => setLoading(false));
    }
  }, [initialFileId, loadImage]);

  const saveImage = useCallback(async (): Promise<boolean> => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const result = await dialogs.saveFile({
      title: t('notepad.saveAs'),
      startFolderId: node?.parentId ?? (picturesFolder || undefined),
      fileName: node?.name ?? `${t('file.untitled')}.png`,
      filters: IMAGE_FILTERS,
    });
    if (!result) return false;
    const file = await canvasToFile(canvas, result.name);
    if (!file) return false;

    const disk = vfsRef.current;
    const existing = disk
      .liveChildren(result.folderId)
      .find((candidate) => candidate.name.toLowerCase() === result.name.toLowerCase());
    if (existing) {
      const replace = await dialogs.confirm({
        title: t('paint.save'),
        kind: 'question',
        message: t('dialog.nameInUse', { name: result.name }),
      });
      if (!replace) return false;
      await disk.trash([existing.id]);
    }

    const created = await disk.importFiles(result.folderId, [file]);
    if (!created.length) return false;
    setFileId(created[0].id);
    setDirty(false);
    return true;
  }, [dialogs, node, picturesFolder, t]);

  const confirmDiscard = useCallback(async (): Promise<boolean> => {
    if (!dirty) return true;
    const answer = await dialogs.message({
      title: t('app.paint'),
      kind: 'warning',
      message: t('paint.unsaved'),
      buttons: 'yesNoCancel',
    });
    if (answer === 'yes') return saveImage();
    return answer === 'no';
  }, [dialogs, dirty, saveImage, t]);

  const newImage = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    undoRef.current = [];
    setUndoDepth(0);
    setFileId(null);
    setSize(DEFAULT_SIZE);
    setDocumentToken((token) => token + 1);
    setDirty(false);
  }, [confirmDiscard]);

  const openImage = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    const result = await dialogs.openFile({
      title: t('notepad.open'),
      startFolderId: node?.parentId ?? (picturesFolder || undefined),
      filters: IMAGE_FILTERS,
    });
    if (!result?.node) return;
    setLoading(true);
    const loaded = await loadImage(result.node.id);
    setLoading(false);
    if (loaded) setFileId(result.node.id);
  }, [confirmDiscard, dialogs, loadImage, node, picturesFolder, t]);

  const exportImage = useCallback(async () => {
    if (fileId) {
      await vfsRef.current.exportNode(fileId);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${t('file.untitled')}.png`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }, [fileId, t]);

  /* Never close with unsaved pixels without asking. */
  useEffect(() => {
    return wm.registerCloseGuard(windowId, async () => {
      if (!dirty) return true;
      const answer = await dialogs.message({
        title: t('app.paint'),
        kind: 'warning',
        message: t('paint.unsaved'),
        buttons: 'yesNoCancel',
      });
      if (answer === 'yes') return saveImage();
      return answer === 'no';
    });
  }, [dialogs, dirty, saveImage, t, windowId, wm]);

  useEffect(() => {
    wm.setTitle(windowId, node ? `${node.name} - ${t('app.paint')}` : t('app.paint'));
  }, [node, t, windowId, wm]);

  /* --- pointer input ------------------------------------------------ */

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || loading) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(event.pointerId);
    const position = canvasPosition(event, zoom);

    if (tool === 'fill') {
      pushUndo();
      floodFill(ctx, position.x, position.y, color);
      setDirty(true);
      return;
    }

    const stroke: StrokeState = {
      tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      thickness,
      startX: position.x,
      startY: position.y,
      lastX: position.x,
      lastY: position.y,
      original: pushUndo(),
    };
    strokeRef.current = stroke;
    // Single click leaves a dot, like a pencil pressed on paper.
    drawSegment(ctx, position.x, position.y, position.x + 0.01, position.y, stroke.color, stroke.thickness);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = strokeRef.current;
    const ctx = canvasRef.current?.getContext('2d');
    if (!stroke || !ctx) return;
    const position = canvasPosition(event, zoom);
    if (stroke.tool === 'pencil' || stroke.tool === 'eraser') {
      drawSegment(ctx, stroke.lastX, stroke.lastY, position.x, position.y, stroke.color, stroke.thickness);
      stroke.lastX = position.x;
      stroke.lastY = position.y;
      return;
    }
    if (stroke.original) ctx.putImageData(stroke.original, 0, 0);
    drawShape(ctx, stroke, position.x, position.y);
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!strokeRef.current) return;
    strokeRef.current = null;
    setDirty(true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /* --- menus -------------------------------------------------------- */

  const menus = useMemo<MenuBarMenu[]>(
    () => [
      {
        id: 'file',
        label: t('menu.file'),
        accessKey: 'a',
        entries: [
          { kind: 'item', id: 'new', label: t('notepad.new'), onSelect: () => void newImage() },
          { kind: 'item', id: 'open', label: t('notepad.open'), onSelect: () => void openImage() },
          { kind: 'item', id: 'save', label: t('paint.save'), onSelect: () => void saveImage() },
          menuSeparator('sep'),
          { kind: 'item', id: 'export', label: t('menu.export'), onSelect: () => void exportImage() },
        ],
      },
      {
        id: 'edit',
        label: t('menu.edit'),
        accessKey: 'e',
        entries: [
          { kind: 'item', id: 'undo', label: t('paint.undo'), disabled: undoDepth === 0, onSelect: undo },
          menuSeparator('sep1'),
          { kind: 'item', id: 'clear', label: t('paint.clear'), onSelect: clearImage },
        ],
      },
      {
        id: 'view',
        label: t('menu.view'),
        accessKey: 'v',
        entries: ZOOM_LEVELS.map((level) => ({
          kind: 'item' as const,
          id: `zoom-${level}`,
          label: `${level}x`,
          checked: zoom === level,
          radio: true,
          onSelect: () => setZoom(level),
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
    [clearImage, exportImage, newImage, openImage, saveImage, t, undo, undoDepth, zoom],
  );

  return (
    <div
      className="app-paint"
      onKeyDown={(event) => {
        if (event.ctrlKey && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          undo();
        }
      }}
    >
      <MenuBar menus={menus} ariaLabel={t('app.paint')} />

      <div className="paint-body">
        <div className="paint-side">
          <div className="paint-tools" role="group" aria-label={t('app.paint')}>
            {TOOL_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className="paint-tool"
                aria-pressed={tool === id}
                aria-label={t(TOOL_LABEL_KEYS[id])}
                title={t(TOOL_LABEL_KEYS[id])}
                onClick={() => setTool(id)}
              >
                <ToolIcon tool={id} />
              </button>
            ))}
          </div>

          <div className="paint-option">
            <span className="field-label" id="paint-thickness-label">
              {t('paint.thickness')}
            </span>
            <Select
              ariaLabel={t('paint.thickness')}
              value={String(thickness)}
              options={THICKNESSES.map((value) => ({ value: String(value), label: String(value) }))}
              onChange={(value) => setThickness(Number(value))}
            />
          </div>

          <div className="paint-option">
            <span className="field-label" id="paint-palette-label">
              {t('paint.palette')}
            </span>
            <span
              className="paint-current bevel-down"
              style={{ background: color }}
              aria-label={t('paint.palette')}
            />
            <div className="paint-palette" role="group" aria-label={t('paint.palette')}>
              {PALETTE.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className="paint-swatch"
                  style={{ background: entry }}
                  aria-label={entry}
                  aria-pressed={color.toLowerCase() === entry}
                  onClick={() => setColor(entry)}
                />
              ))}
            </div>
          </div>

          <div className="paint-actions">
            <Button size="small" onClick={undo} disabled={undoDepth === 0}>
              {t('paint.undo')}
            </Button>
            <Button size="small" onClick={clearImage}>
              {t('paint.clear')}
            </Button>
          </div>
        </div>

        <div className="paint-stage w95-scroll">
          <canvas
            ref={canvasRef}
            className="paint-canvas"
            style={{
              width: size.width * zoom,
              height: size.height * zoom,
              pointerEvents: loading ? 'none' : undefined,
            }}
            aria-label={t('app.paint')}
            aria-busy={loading}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onContextMenu={(event) => event.preventDefault()}
          />
        </div>
      </div>

      <StatusBar
        panels={[
          {
            id: 'state',
            width: 190,
            content: loading ? t('common.loading') : dirty ? t('paint.unsaved') : '',
          },
          { id: 'tool', width: 110, content: t(TOOL_LABEL_KEYS[tool]) },
          { id: 'zoom', width: 62, content: `${zoom}x` },
          {
            id: 'path',
            content: node?.name ?? (fileId ? '' : t('file.untitled')),
          },
        ]}
      />
    </div>
  );
}

/* --- pixel helpers --------------------------------------------------- */

function canvasPosition(event: ReactPointerEvent<HTMLCanvasElement>, zoom: number) {
  const canvas = event.currentTarget;
  const rect = uiRect(canvas);
  return {
    x: Math.max(0, Math.min(canvas.width - 1, Math.floor((uiPixels(event.clientX) - rect.left) / zoom))),
    y: Math.max(0, Math.min(canvas.height - 1, Math.floor((uiPixels(event.clientY) - rect.top) / zoom))),
  };
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  thickness: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX + 0.5, fromY + 0.5);
  ctx.lineTo(toX + 0.5, toY + 0.5);
  ctx.stroke();
}

function drawShape(ctx: CanvasRenderingContext2D, stroke: StrokeState, toX: number, toY: number): void {
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (stroke.tool === 'line') {
    ctx.moveTo(stroke.startX + 0.5, stroke.startY + 0.5);
    ctx.lineTo(toX + 0.5, toY + 0.5);
  } else if (stroke.tool === 'rectangle') {
    const x = Math.min(stroke.startX, toX);
    const y = Math.min(stroke.startY, toY);
    ctx.rect(x + 0.5, y + 0.5, Math.abs(toX - stroke.startX), Math.abs(toY - stroke.startY));
  } else {
    const radiusX = Math.abs(toX - stroke.startX) / 2;
    const radiusY = Math.abs(toY - stroke.startY) / 2;
    ctx.ellipse(
      Math.min(stroke.startX, toX) + radiusX + 0.5,
      Math.min(stroke.startY, toY) + radiusY + 0.5,
      radiusX,
      radiusY,
      0,
      0,
      Math.PI * 2,
    );
  }
  ctx.stroke();
}

/**
 * Four way flood fill over the raw pixels. Colours are compared through a
 * Uint32 view of the buffer, so it stays exact (no tolerance) and fast.
 */
function floodFill(ctx: CanvasRenderingContext2D, startX: number, startY: number, color: string): void {
  const { width, height } = ctx.canvas;
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return;
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = new Uint32Array(image.data.buffer);
  const start = startY * width + startX;
  const target = pixels[start];
  const [red, green, blue] = hexToRgb(color);
  const probe = new Uint8ClampedArray([red, green, blue, 255]);
  const replacement = new Uint32Array(probe.buffer)[0];
  if (target === replacement) return;

  const stack: number[] = [start];
  while (stack.length) {
    const index = stack.pop() as number;
    if (pixels[index] !== target) continue;
    pixels[index] = replacement;
    const x = index % width;
    if (x > 0) stack.push(index - 1);
    if (x < width - 1) stack.push(index + 1);
    if (index >= width) stack.push(index - width);
    if (index < width * (height - 1)) stack.push(index + width);
  }
  ctx.putImageData(image, 0, 0);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Decodes a blob into something drawable, with a fallback for old engines. */
async function decodeImage(blob: Blob): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Not every format is accepted by createImageBitmap; try the <img> path.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob ? new File([blob], name, { type: 'image/png' }) : null);
    }, 'image/png');
  });
}

function ToolIcon({ tool }: { tool: ToolId }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {tool === 'pencil' && (
        <>
          <path d="M2 14 L3 11 L10 4 L12 6 L5 13 Z" fill="currentColor" />
          <path d="M11 3 L13 1 L15 3 L13 5 Z" fill="currentColor" />
        </>
      )}
      {tool === 'eraser' && (
        <>
          <path d="M5 12 L1 8 L8 1 L12 5 Z" fill="currentColor" />
          <rect x="2" y="13" width="12" height="1" fill="currentColor" />
        </>
      )}
      {tool === 'line' && <path d="M2 14 L14 2" stroke="currentColor" strokeWidth="1" fill="none" />}
      {tool === 'rectangle' && <rect x="2" y="3" width="12" height="10" fill="none" stroke="currentColor" />}
      {tool === 'ellipse' && <ellipse cx="8" cy="8" rx="6" ry="4" fill="none" stroke="currentColor" />}
      {tool === 'fill' && (
        <>
          <path d="M3 8 L8 3 L14 9 L9 14 Z" fill="none" stroke="currentColor" />
          <path d="M12 10 L14 13 L10 13 Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
