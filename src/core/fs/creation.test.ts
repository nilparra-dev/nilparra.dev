import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDatabase } from './db';
import { createNodes, loadNodes, putBlobs, readBlobData } from './vfs';
import { makeBinaryFile, makeFolder, makeTextFile } from './vfsUtils';

beforeEach(() => deleteDatabase());

describe('atomic file creation', () => {
  it('reserves names within a batch and across independent transactions', async () => {
    const first = [makeTextFile('documents', 'note.txt', 'one'), makeTextFile('documents', 'note.txt', 'two')];
    const second = [makeTextFile('documents', 'NOTE.txt', 'three')];
    const created = (await Promise.all([createNodes({ nodes: first }), createNodes({ nodes: second })])).flat();
    expect(created.map((node) => node.name.toLowerCase()).sort()).toEqual(['note (2).txt', 'note (3).txt', 'note.txt']);
    expect((await loadNodes()).map((node) => node.name.toLowerCase()).sort()).toEqual(['note (2).txt', 'note (3).txt', 'note.txt']);
  });

  it('keeps separate namespaces for different parents and permits reuse of a deleted name', async () => {
    const deleted = { ...makeFolder('documents', 'Notes'), deletedAt: 1000 };
    await createNodes({ nodes: [deleted] });
    const created = await createNodes({ nodes: [makeFolder('documents', 'Notes'), makeFolder('pictures', 'Notes')] });
    expect(created.map((node) => node.name)).toEqual(['Notes', 'Notes']);
  });

  it('rolls back metadata and blobs together when a blob cannot be inserted', async () => {
    const original = new Blob(['Original content']);
    await putBlobs([{ id: 'taken-blob', data: original }]);
    const file = makeBinaryFile('documents', 'image.png', 'taken-blob', 3);
    await expect(createNodes({ nodes: [file], blobs: [{ id: 'taken-blob', data: new Blob(['New']) }] })).rejects.toThrow();
    expect((await loadNodes()).find((node) => node.id === file.id)).toBeUndefined();
    expect((await readBlobData('taken-blob'))?.size).toBe(original.size);
  });
});
