import { useState } from 'react';
import { useI18n } from '../../core/i18n/I18nProvider';
import type { MessageOptions, MessageResult } from '../../core/dialogs/types';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';

const KIND_ICON = {
  info: 'dialog-info',
  warning: 'dialog-warning',
  error: 'dialog-error',
  question: 'dialog-question',
} as const;

/** Classic message box: glyph on the left, text on the right, buttons below. */
export function MessageBoxView({
  options,
  onResult,
}: {
  options: MessageOptions;
  onResult: (result: MessageResult) => void;
}) {
  const { t } = useI18n();
  const kind = options.kind ?? 'info';
  const [checked, setChecked] = useState(false);
  const buttons = options.buttons ?? 'ok';

  const definitions: Array<{ result: MessageResult; label: string; primary?: boolean }> = [];
  if (buttons === 'ok') definitions.push({ result: 'ok', label: t('common.ok'), primary: true });
  if (buttons === 'okCancel') {
    definitions.push({ result: 'ok', label: t('common.ok'), primary: true });
    definitions.push({ result: 'cancel', label: t('common.cancel') });
  }
  if (buttons === 'yesNo') {
    definitions.push({ result: 'yes', label: t('common.yes'), primary: true });
    definitions.push({ result: 'no', label: t('common.no') });
  }
  if (buttons === 'yesNoCancel') {
    definitions.push({ result: 'yes', label: t('common.yes'), primary: true });
    definitions.push({ result: 'no', label: t('common.no') });
    definitions.push({ result: 'cancel', label: t('common.cancel') });
  }
  if (buttons === 'retryCancel') {
    definitions.push({ result: 'retry', label: t('common.retry'), primary: true });
    definitions.push({ result: 'cancel', label: t('common.cancel') });
  }

  const defaultIndex = options.defaultButton ?? 0;
  // Escape and the close box back out, as they do in Windows: they answer
  // Cancel or No when the box offers one, never the default button.
  const dismissResult =
    definitions.find((definition) => definition.result === 'cancel' || definition.result === 'no')
      ?.result ?? definitions[defaultIndex]?.result ?? 'cancel';

  return (
    <Dialog
      title={options.title ?? t('common.information')}
      icon={KIND_ICON[kind]}
      width={380}
      onClose={() => onResult(dismissResult)}
      buttons={definitions.map((definition, index) => (
        <Button
          key={definition.result}
          primary={index === defaultIndex}
          onClick={() => onResult(definition.result)}
        >
          {definition.label}
        </Button>
      ))}
    >
      <span className="dialog-illustration">
        <Icon id={KIND_ICON[kind]} size={32} />
      </span>
      <div className="dialog-message">
        <div>{options.message}</div>
        {options.detail && <p className="dialog-detail">{options.detail}</p>}
        {options.checkbox && (
          <Checkbox
            className="dialog-checkbox"
            checked={checked}
            onChange={(value) => {
              setChecked(value);
              options.checkbox?.onChange(value);
            }}
            label={options.checkbox.label}
          />
        )}
      </div>
    </Dialog>
  );
}
