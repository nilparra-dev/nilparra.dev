import type { IconId } from '../../assets/generated/icons';

/**
 * Description of a menu entry. The same model feeds the start menu, the menu
 * bars of applications, the desktop context menu and the window system menu.
 */
export interface MenuEntry {
  kind: 'item' | 'separator' | 'submenu';
  id: string;
  label: string;
  /** Right aligned shortcut text, for example "Ctrl+S". */
  accelerator?: string;
  iconId?: IconId;
  disabled?: boolean;
  /** Draws a check mark (or a bullet when `radio` is set). */
  checked?: boolean;
  radio?: boolean;
  items?: MenuEntry[];
  onSelect?: () => void;
}

export function menuSeparator(id = 'sep'): MenuEntry {
  return { kind: 'separator', id, label: '' };
}
