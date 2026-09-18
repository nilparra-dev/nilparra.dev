// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Select } from './Select';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const options = [
  { value: 'es', label: 'Español' },
  { value: 'ca', label: 'Català', disabled: true },
  { value: 'en', label: 'English' },
];

describe('Select', () => {
  it('anchors a popup in desktop coordinates when the interface is scaled to 125%', () => {
    // jsdom does not expose CSS zoom in computed styles.
    const computedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
      const style = computedStyle(element, pseudo);
      if (element === document.documentElement) Object.defineProperty(style, 'zoom', { value: '1.25' });
      return style;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(125, 125, 175, 32.5));
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(90);
    render(<Select value="es" options={options} onChange={() => {}} ariaLabel="Language" />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    const popup = screen.getByRole('listbox');
    expect(popup.style.left).toBe('100px');
    expect(popup.style.top).toBe('126px');
    expect(popup.style.width).toBe('140px');
  });

  it('anchors the popup to the field and keeps it within the viewport', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(950, 700, 140, 26));
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(90);
    render(<Select value="es" options={options} onChange={() => {}} ariaLabel="Language" />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    const popup = screen.getByRole('listbox');
    expect(popup.style.width).toBe('140px');
    expect(popup.style.left).toBe(`${window.innerWidth - 142}px`);
    expect(popup.style.top).toBe('608px');
  });

  it('skips disabled choices and returns focus to the field after committing', () => {
    const onChange = vi.fn();
    render(<Select value="es" options={options} onChange={onChange} ariaLabel="Language" />);
    const trigger = screen.getByRole('button', { name: 'Language' });
    fireEvent.click(trigger);
    const popup = screen.getByRole('listbox');
    fireEvent.keyDown(popup, { key: 'ArrowDown' });
    fireEvent.keyDown(popup, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('en');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('dismisses on Escape and when its containing window scrolls', () => {
    const onChange = vi.fn();
    render(<Select value="es" options={options} onChange={onChange} ariaLabel="Language" />);
    const trigger = screen.getByRole('button', { name: 'Language' });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.scroll(document);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
