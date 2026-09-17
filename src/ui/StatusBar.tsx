import type { ReactNode } from 'react';

export interface StatusPanel {
  id: string;
  content: ReactNode;
  /** Fixed width in pixels; omitted panels grow to fill the bar. */
  width?: number;
}

export interface StatusBarProps {
  panels: StatusPanel[];
  /** Draws the classic resize grip on the right. */
  grip?: boolean;
  className?: string;
}

export function StatusBar({ panels, grip = false, className }: StatusBarProps) {
  return (
    <div className={className ? `status-bar ${className}` : 'status-bar'} role="status">
      {panels.map((panel) => (
        <div
          key={panel.id}
          className="status-panel"
          style={panel.width ? { flex: `0 0 ${panel.width}px`, width: panel.width } : undefined}
        >
          {panel.content}
        </div>
      ))}
      {grip && <div className="status-panel status-panel--grip" aria-hidden="true" />}
    </div>
  );
}
