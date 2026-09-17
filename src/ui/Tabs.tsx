import { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}

/**
 * Tab strip of a property sheet: the selected tab is two pixels taller and
 * merges with the page below.
 */
export function Tabs({ tabs, activeId, onChange, ariaLabel }: TabsProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const move = (delta: number) => {
    const index = tabs.findIndex((tab) => tab.id === activeId);
    const nextIndex = (index + delta + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (!next) return;
    onChange(next.id);
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel} ref={listRef}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab.id === activeId}
          tabIndex={tab.id === activeId ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              move(1);
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault();
              move(-1);
            } else if (event.key === 'Home') {
              event.preventDefault();
              onChange(tabs[0].id);
            } else if (event.key === 'End') {
              event.preventDefault();
              onChange(tabs[tabs.length - 1].id);
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
