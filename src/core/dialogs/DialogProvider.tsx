import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useVfs } from '../fs/VfsProvider';
import type { FsNode } from '../fs/types';
import { FileDialog } from '../../ui/dialogs/FileDialog';
import { MessageBoxView } from '../../ui/dialogs/MessageBox';
import { PromptDialog } from '../../ui/dialogs/PromptDialog';
import { PropertiesDialog } from '../../ui/dialogs/PropertiesDialog';
import type {
  DialogApi,
  FileDialogOptions,
  FileDialogResult,
  MessageOptions,
  MessageResult,
  PromptOptions,
} from './types';

type PendingRequest =
  | { kind: 'message'; options: MessageOptions; resolve: (result: MessageResult) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }
  | { kind: 'file'; options: FileDialogOptions; resolve: (result: FileDialogResult | null) => void }
  | { kind: 'properties'; node: FsNode; resolve: () => void };

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const vfs = useVfs();
  const [queue, setQueue] = useState<PendingRequest[]>([]);
  const lastError = useRef<unknown>(null);

  const enqueue = useCallback(<T,>(build: (resolve: (value: T) => void) => PendingRequest) => {
    return new Promise<T>((resolve) => {
      setQueue((current) => [...current, build(resolve)]);
    });
  }, []);

  const finish = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      open: queue.length > 0,
      message: (options) =>
        enqueue<MessageResult>((resolve) => ({ kind: 'message', options, resolve })),
      alert: async (options) => {
        await enqueue<MessageResult>((resolve) => ({ kind: 'message', options, resolve }));
      },
      confirm: async (options) => {
        const result = await enqueue<MessageResult>((resolve) => ({
          kind: 'message',
          options: { buttons: 'yesNo', kind: 'question', ...options },
          resolve,
        }));
        return result === 'yes';
      },
      prompt: (options) => enqueue<string | null>((resolve) => ({ kind: 'prompt', options, resolve })),
      openFile: (options) =>
        enqueue<FileDialogResult | null>((resolve) => ({
          kind: 'file',
          options: { ...options, mode: 'open' },
          resolve,
        })),
      saveFile: (options) =>
        enqueue<FileDialogResult | null>((resolve) => ({
          kind: 'file',
          options: { ...options, mode: 'save' },
          resolve,
        })),
      properties: (node) => enqueue<void>((resolve) => ({ kind: 'properties', node, resolve })),
    }),
    [enqueue, queue.length],
  );

  /* Storage failures always surface as a message box, never as a silent fail. */
  useEffect(() => {
    if (!vfs.error || vfs.error === lastError.current) return;
    lastError.current = vfs.error;
    const isQuota = vfs.error.code === 'quota';
    void api.alert({
      title: t('dialog.errorTitle'),
      kind: 'error',
      message: isQuota ? t('dialog.storageFull') : t('dialog.storageFailed'),
      detail: vfs.error.message,
    });
    vfs.clearError();
  }, [api, t, vfs]);

  const current = queue[0];

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current?.kind === 'message' && (
        <MessageBoxView
          options={current.options}
          onResult={(result) => {
            current.resolve(result);
            finish();
          }}
        />
      )}
      {current?.kind === 'prompt' && (
        <PromptDialog
          options={current.options}
          onResult={(value) => {
            current.resolve(value);
            finish();
          }}
        />
      )}
      {current?.kind === 'file' && (
        <FileDialog
          options={current.options}
          onResult={(result) => {
            current.resolve(result);
            finish();
          }}
        />
      )}
      {current?.kind === 'properties' && (
        <PropertiesDialog
          node={current.node}
          onClose={() => {
            current.resolve();
            finish();
          }}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useDialogs(): DialogApi {
  const value = useContext(DialogContext);
  if (!value) throw new Error('useDialogs must be used inside <DialogProvider>');
  return value;
}
