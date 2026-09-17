import type { ReactNode } from 'react';
import type { IconId } from '../../assets/generated/icons';
import type { FsNode } from '../fs/types';

/** Message box kinds, each with its own glyph. */
export type MessageKind = 'info' | 'warning' | 'error' | 'question';

export type MessageButtons = 'ok' | 'okCancel' | 'yesNo' | 'yesNoCancel' | 'retryCancel';

export type MessageResult = 'ok' | 'cancel' | 'yes' | 'no' | 'retry';

export interface MessageOptions {
  title?: string;
  message: ReactNode;
  /** Extra, smaller line under the message (paths, error codes…). */
  detail?: string;
  kind?: MessageKind;
  buttons?: MessageButtons;
  /** Index of the button focused when the box opens. */
  defaultButton?: number;
}

export interface PromptOptions {
  title?: string;
  label: string;
  initialValue?: string;
  /** Returns an error message to show, or null when the value is valid. */
  validate?: (value: string) => ReactNode | null;
}

export interface FileFilter {
  label: string;
  test: (name: string) => boolean;
}

export interface FileDialogOptions {
  mode: 'open' | 'save';
  title?: string;
  startFolderId?: string;
  /** Initial name, used by "save" and as a hint by "open". */
  fileName?: string;
  filters?: FileFilter[];
  itemIcon?: IconId;
}

export interface FileDialogResult {
  folderId: string;
  name: string;
  /** Chosen file when opening an existing one. */
  node?: FsNode;
}

/**
 * Window dialogs of the shell, all of them asynchronous so callers can simply
 * `await` the answer.
 */
export interface DialogApi {
  message: (options: MessageOptions) => Promise<MessageResult>;
  alert: (options: MessageOptions) => Promise<void>;
  confirm: (options: MessageOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  openFile: (options: Omit<FileDialogOptions, 'mode'>) => Promise<FileDialogResult | null>;
  saveFile: (options: Omit<FileDialogOptions, 'mode'>) => Promise<FileDialogResult | null>;
  properties: (node: FsNode) => Promise<void>;
  /** True while a dialog is open (used to keep the wait cursor honest). */
  open: boolean;
}
