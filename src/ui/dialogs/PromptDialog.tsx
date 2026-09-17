import { useState, type ReactNode } from 'react';
import { useI18n } from '../../core/i18n/I18nProvider';
import type { PromptOptions } from '../../core/dialogs/types';
import { Button } from '../Button';
import { Dialog } from '../Dialog';

/** Small input dialog: rename, new folder, "run" line… */
export function PromptDialog({
  options,
  onResult,
}: {
  options: PromptOptions;
  onResult: (value: string | null) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(options.initialValue ?? '');
  const [error, setError] = useState<ReactNode | null>(null);

  const accept = () => {
    const problem = options.validate ? options.validate(value) : null;
    if (problem) {
      setError(problem);
      return;
    }
    onResult(value);
  };

  return (
    <Dialog
      title={options.title ?? t('common.question')}
      width={360}
      onClose={() => onResult(null)}
      buttons={
        <>
          <Button primary onClick={accept}>
            {t('common.ok')}
          </Button>
          <Button onClick={() => onResult(null)}>{t('common.cancel')}</Button>
        </>
      }
    >
      <div className="dialog-message u-col" style={{ gap: 6 }}>
        <label className="field-label" htmlFor="prompt-input">
          {options.label}
        </label>
        <input
          id="prompt-input"
          className="field"
          value={value}
          autoFocus
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              accept();
            }
          }}
        />
        {error && <p className="dialog-error">{error}</p>}
      </div>
    </Dialog>
  );
}
