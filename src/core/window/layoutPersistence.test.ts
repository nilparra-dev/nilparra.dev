// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { loadWindowLayout, saveWindowLayout } from './layoutPersistence';
import type { WindowInstance } from './types';

function instance(partial: Partial<WindowInstance> & { id: string; appId: string }): WindowInstance {
  return {
    title: 'Ventana',
    icon: 'doc-text',
    rect: { x: 40, y: 30, width: 400, height: 300 },
    state: 'normal',
    z: 1,
    resizable: true,
    minimizable: true,
    maximizable: false,
    minWidth: 200,
    minHeight: 120,
    params: {},
    docKey: null,
    helpTopicId: null,
    createdAt: 1,
    ...partial,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('window layout persistence', () => {
  it('restores the open windows of the previous session', () => {
    saveWindowLayout([
      instance({ id: 'a', appId: 'notepad', params: { fileId: 'file-1' } }),
      instance({ id: 'b', appId: 'explorer', state: 'maximized', z: 2 }),
    ]);
    const restored = loadWindowLayout(
      { width: 1200, height: 800 },
      (appId) => ['notepad', 'explorer'].includes(appId),
      (icon) => icon === 'doc-text',
    );
    expect(restored).toHaveLength(2);
    expect(restored[0].params).toEqual({ fileId: 'file-1' });
    expect(restored[1].state).toBe('maximized');
    expect(restored[1].rect.width).toBe(400);
  });

  it('drops the windows of applications that no longer exist', () => {
    saveWindowLayout([instance({ id: 'a', appId: 'ghost-app' })]);
    const restored = loadWindowLayout({ width: 1024, height: 740 }, () => false, () => true);
    expect(restored).toEqual([]);
  });

  it('pulls windows back on screen when the resolution shrinks', () => {
    saveWindowLayout([instance({ id: 'a', appId: 'explorer', rect: { x: 900, y: 700, width: 400, height: 300 } })]);
    const restored = loadWindowLayout({ width: 800, height: 560 }, () => true, () => true);
    expect(restored[0].rect.x).toBeLessThanOrEqual(800 - 56);
    expect(restored[0].rect.y).toBeLessThanOrEqual(560 - 22);
  });

  it('ignores a corrupted layout instead of crashing', () => {
    window.localStorage.setItem('nilparra-win95:window-layout', '{ not json');
    expect(loadWindowLayout({ width: 800, height: 560 }, () => true, () => true)).toEqual([]);
  });
});
