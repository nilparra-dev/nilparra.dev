import type { IconId } from '../../assets/generated/icons';

/** System folders have a stable key: their visible name is translated. */
export type SystemFolderKey = 'desktop' | 'documents' | 'portfolio' | 'pictures' | 'recycleBin';

export type NodeOrigin = 'system' | 'portfolio' | 'user';

export type ShortcutTarget =
  | { type: 'app'; appId: string }
  | { type: 'url'; url: string }
  | { type: 'node'; nodeId: string };

/**
 * One entry of the virtual disk.
 *
 * The id is stable and never derived from the name, so renaming, moving and
 * translating the interface never break a reference. Deleted nodes stay in the
 * store with `deletedAt` set: that is the Recycle Bin.
 */
export interface FsNode {
  id: string;
  /** null only for the root of the disk. */
  parentId: string | null;
  kind: 'folder' | 'file';
  name: string;
  /** Internal key of a system folder (its name is a translation). */
  systemKey: SystemFolderKey | null;
  origin: NodeOrigin;
  /** Portfolio and system content cannot be edited in place. */
  readonly: boolean;
  mime: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  /** Timestamp of deletion, or null when the node is live. */
  deletedAt: number | null;
  /** Folder the node was deleted from, used to restore it. */
  deletedFromParentId: string | null;
  /** Text content of plain text files. */
  content?: string;
  /** Blob id of binary files. */
  blobId?: string | null;
  shortcut?: ShortcutTarget | null;
  /** Explicit icon override (shortcuts get one from their app target). */
  icon?: IconId | null;
}

export interface FsBlob {
  id: string;
  data: Blob;
}

export type FsErrorCode = 'read' | 'write' | 'quota' | 'not-found' | 'invalid';

/** Error with a code the UI can turn into a translated message. */
export class FsError extends Error {
  readonly code: FsErrorCode;

  constructor(code: FsErrorCode, message: string) {
    super(message);
    this.name = 'FsError';
    this.code = code;
  }
}

export interface NodeWithPath {
  node: FsNode;
  /** Segments of the path without the drive: ['Documents', 'notas.txt']. */
  segments: string[];
  /** Display path: 'C:\Documents\notas.txt'. */
  path: string;
}

export const ROOT_ID = 'root-c';
