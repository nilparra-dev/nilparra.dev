import { describe, expect, it } from 'vitest';
import type { FsNode } from './types';
import {
  duplicateSubtree,
  extensionOf,
  iconForName,
  isValidName,
  mimeForName,
  searchNodes,
  uniqueName,
} from './vfsUtils';

function node(partial: Partial<FsNode> & { id: string; name: string }): FsNode {
  return {
    parentId: 'root',
    kind: 'file',
    systemKey: null,
    origin: 'user',
    readonly: false,
    mime: 'text/plain',
    size: 0,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    deletedFromParentId: null,
    ...partial,
  };
}

describe('file naming', () => {
  it('rejects names that would break the virtual paths', () => {
    expect(isValidName('notas.txt')).toBe(true);
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
    expect(isValidName('..')).toBe(false);
    expect(isValidName('carpeta/otra')).toBe(false);
    expect(isValidName('a\\b')).toBe(false);
    expect(isValidName('informe:2026')).toBe(false);
    expect(isValidName('x'.repeat(200))).toBe(false);
  });

  it('solves clashes without losing the extension', () => {
    expect(uniqueName(['notas.txt'], 'notas.txt')).toBe('notas (2).txt');
    expect(uniqueName(['notas.txt', 'notas (2).txt'], 'notas.txt')).toBe('notas (3).txt');
    expect(uniqueName(['sin-extension'], 'sin-extension')).toBe('sin-extension (2)');
    expect(uniqueName(['notas.txt'], 'notas.txt', { copyOf: true })).toBe('notas - copia.txt');
  });

  it('is case insensitive when looking for clashes', () => {
    expect(uniqueName(['Notas.TXT'], 'notas.txt')).toBe('notas (2).txt');
  });

  it('detects the extension', () => {
    expect(extensionOf('notas.txt')).toBe('.txt');
    expect(extensionOf('notas')).toBe('');
    expect(extensionOf('.oculto')).toBe('');
    expect(extensionOf('archivo.tar.gz')).toBe('.gz');
  });

  it('associates a mime type and an icon with the extension', () => {
    expect(mimeForName('foto.PNG')).toBe('image/png');
    expect(mimeForName('cancion.mp3')).toBe('audio/mpeg');
    expect(mimeForName('documento.pdf')).toBe('application/pdf');
    expect(mimeForName('raro.xyz')).toBe('application/octet-stream');
    expect(iconForName('notas.txt')).toBe('doc-text');
    expect(iconForName('foto.png')).toBe('doc-image');
    expect(iconForName('web.url')).toBe('doc-web');
  });
});

describe('tree operations', () => {
  const tree = new Map<string, FsNode>([
    ['root', node({ id: 'root', name: 'C:', kind: 'folder' })],
    ['docs', node({ id: 'docs', name: 'Documents', kind: 'folder', parentId: 'root' })],
    ['sub', node({ id: 'sub', name: 'Apuntes', kind: 'folder', parentId: 'docs' })],
    ['file', node({ id: 'file', name: 'nota.txt', parentId: 'sub', content: 'hola mundo' })],
  ]);

  it('copies a whole folder and renames the copy', () => {
    const result = duplicateSubtree(tree, 'sub', 'docs', 1000);
    expect(result.nodes).toHaveLength(2);
    const [folder, file] = result.nodes;
    expect(folder.name).toBe('Apuntes - copia');
    expect(folder.parentId).toBe('docs');
    expect(file.parentId).toBe(folder.id);
    expect(file.content).toBe('hola mundo');
    expect(file.id).not.toBe('file');
  });

  it('does not copy into itself by accident (ids are always new)', () => {
    const result = duplicateSubtree(tree, 'docs', 'docs', 1000);
    const copiedFolder = result.nodes[0];
    expect(copiedFolder.parentId).toBe('docs');
    expect(copiedFolder.id).not.toBe('docs');
  });

  it('searches by name and optionally by contents', () => {
    expect(searchNodes(tree, { term: 'nota' })).toHaveLength(1);
    expect(searchNodes(tree, { term: 'hola' })).toHaveLength(0);
    expect(searchNodes(tree, { term: 'hola', contents: true })).toHaveLength(1);
    expect(searchNodes(tree, { term: 'apuntes', kind: 'folder' })).toHaveLength(1);
    expect(searchNodes(tree, { term: 'apuntes', kind: 'file' })).toHaveLength(0);
    expect(searchNodes(tree, { term: 'nota', scopeId: 'docs' })).toHaveLength(1);
  });
});
