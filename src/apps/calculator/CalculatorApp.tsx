import { useEffect, useRef, useState } from 'react';
import type { AppRenderProps } from '../../core/apps/launcher';
import { useI18n } from '../../core/i18n/I18nProvider';
import { usePreferences } from '../../core/prefs/PreferencesProvider';
import { playSound } from '../../core/sound/sounds';
import { useWindowManager } from '../../core/window/WindowManagerProvider';
import { MenuBar, type MenuBarMenu } from '../../ui/menu/MenuBar';
import { menuSeparator } from '../../ui/menu/types';
import '../../styles/app-calculator.css';

type ViewMode = 'basic' | 'scientific';
type Operator = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'modulo';
type CalcError = 'divideByZero' | 'invalidInput';
type Unary = 'sqrt' | 'reciprocal' | 'square' | 'sin' | 'cos' | 'tan' | 'log' | 'ln' | 'exp' | 'tenPower' | 'factorial';

const MAX_DIGITS = 16;

function toNumber(text: string): number {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : 0;
}

/** Display form of a value: 12 significant digits, no trailing zeros. */
function formatValue(value: number): string {
  const rounded = Number.parseFloat(value.toPrecision(12));
  if (rounded !== 0 && (Math.abs(rounded) >= 1e12 || Math.abs(rounded) < 1e-9)) {
    return rounded.toExponential(6).replace(/\.?0+e/, 'e');
  }
  return String(rounded);
}

function compute(a: number, b: number, operator: Operator): { ok: true; value: number } | { ok: false; error: CalcError } {
  let value: number;
  switch (operator) {
    case 'add':
      value = a + b;
      break;
    case 'subtract':
      value = a - b;
      break;
    case 'multiply':
      value = a * b;
      break;
    case 'divide':
      if (b === 0) return { ok: false, error: 'divideByZero' };
      value = a / b;
      break;
    case 'power':
      value = a ** b;
      break;
    case 'modulo':
      if (b === 0) return { ok: false, error: 'divideByZero' };
      value = a % b;
      break;
  }
  return Number.isFinite(value) ? { ok: true, value } : { ok: false, error: 'invalidInput' };
}

function factorial(value: number): number {
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
}

/** Left arrow of the "Retroceso" key, drawn as crisp pixels. */
function BackspaceGlyph() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d="M6 1 L1 6 L6 11 Z" fill="currentColor" />
      <rect x="6" y="5" width="9" height="2" fill="currentColor" />
    </svg>
  );
}

interface KeySpec {
  id: string;
  /** Grid area of the key inside the layout. */
  area: string;
  label: string;
  ariaLabel: string;
  onPress: () => void;
  /** Draws the operator as pressed while it is pending. */
  pressed?: boolean;
  glyph?: boolean;
}

/**
 * Calculator: a working reproduction of the Windows 95 one. It keeps the
 * classic state machine (pending operator, fresh entry, memory register) and
 * exposes the result to screen readers through the live display.
 */
export function CalculatorApp({ windowId }: AppRenderProps) {
  const { t } = useI18n();
  const { preferences } = usePreferences();
  const wm = useWindowManager();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<ViewMode>('basic');
  const [display, setDisplay] = useState('0');
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pending, setPending] = useState<Operator | null>(null);
  const [fresh, setFresh] = useState(true);
  const [memory, setMemory] = useState(0);
  const [error, setError] = useState<CalcError | null>(null);

  const sound = { enabled: preferences.soundsEnabled, volume: preferences.volume };

  const resetEntry = () => {
    setDisplay('0');
    setFresh(true);
    setError(null);
  };

  const clearAll = () => {
    setDisplay('0');
    setAccumulator(null);
    setPending(null);
    setFresh(true);
    setError(null);
  };

  const inputDigit = (digit: string) => {
    if (error) {
      setError(null);
      setDisplay(digit);
      setFresh(false);
      return;
    }
    if (fresh) {
      setDisplay(digit);
      setFresh(false);
      return;
    }
    if (display.replace(/[-.]/g, '').length >= MAX_DIGITS) return;
    setDisplay(display === '0' ? digit : display + digit);
  };

  const inputDecimal = () => {
    if (error) {
      setError(null);
      setDisplay('0.');
      setFresh(false);
      return;
    }
    if (fresh) {
      setDisplay('0.');
      setFresh(false);
      return;
    }
    if (!display.includes('.')) setDisplay(`${display}.`);
  };

  const backspace = () => {
    if (error) {
      resetEntry();
      return;
    }
    if (fresh) return;
    const next = display.slice(0, -1);
    setDisplay(next === '' || next === '-' ? '0' : next);
  };

  const changeSign = () => {
    if (error) return;
    if (display.startsWith('-')) setDisplay(display.slice(1));
    else if (display !== '0') setDisplay(`-${display}`);
  };

  const beginOperator = (operator: Operator) => {
    if (error) return;
    const value = toNumber(display);
    if (pending && !fresh) {
      const result = compute(accumulator ?? 0, value, pending);
      if (!result.ok) {
        setError(result.error);
        setAccumulator(null);
        setPending(null);
        setFresh(true);
        return;
      }
      setAccumulator(result.value);
      setDisplay(formatValue(result.value));
    } else {
      setAccumulator(value);
    }
    setPending(operator);
    setFresh(true);
  };

  const equals = () => {
    if (error || !pending) return;
    const result = compute(accumulator ?? 0, toNumber(display), pending);
    if (!result.ok) {
      setError(result.error);
      setAccumulator(null);
      setPending(null);
      setFresh(true);
      return;
    }
    setDisplay(formatValue(result.value));
    setAccumulator(null);
    setPending(null);
    setFresh(true);
  };

  const percent = () => {
    if (error) return;
    const value = toNumber(display);
    const result =
      pending === 'add' || pending === 'subtract' ? ((accumulator ?? 0) * value) / 100 : value / 100;
    if (!Number.isFinite(result)) {
      setError('invalidInput');
      return;
    }
    setDisplay(formatValue(result));
    setFresh(true);
  };

  const applyUnary = (kind: Unary) => {
    if (error) return;
    const value = toNumber(display);
    const invalid = () => setError('invalidInput');
    let result: number;
    switch (kind) {
      case 'sqrt':
        if (value < 0) return invalid();
        result = Math.sqrt(value);
        break;
      case 'reciprocal':
        if (value === 0) return setError('divideByZero');
        result = 1 / value;
        break;
      case 'square':
        result = value * value;
        break;
      case 'sin':
        result = Math.sin(value);
        break;
      case 'cos':
        result = Math.cos(value);
        break;
      case 'tan':
        result = Math.tan(value);
        break;
      case 'log':
        if (value <= 0) return invalid();
        result = Math.log10(value);
        break;
      case 'ln':
        if (value <= 0) return invalid();
        result = Math.log(value);
        break;
      case 'exp':
        result = Math.exp(value);
        break;
      case 'tenPower':
        result = 10 ** value;
        break;
      case 'factorial':
        if (value < 0 || !Number.isInteger(value) || value > 170) return invalid();
        result = factorial(value);
        break;
    }
    if (!Number.isFinite(result)) return invalid();
    setDisplay(formatValue(result));
    setFresh(true);
  };

  const insertPi = () => {
    setError(null);
    setDisplay(formatValue(Math.PI));
    setFresh(true);
  };

  const memoryClear = () => setMemory(0);
  const memoryRecall = () => {
    setError(null);
    setDisplay(formatValue(memory));
    setFresh(true);
  };
  const memoryStore = () => {
    if (!error) setMemory(toNumber(display));
  };
  const memoryAdd = () => {
    if (!error) setMemory((current) => current + toNumber(display));
  };

  const press = (action: () => void) => {
    playSound('click', sound);
    action();
  };

  /* --- keyboard ------------------------------------------------------ */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const windowElement = rootRef.current?.closest('.window');
      if (!windowElement || !windowElement.contains(event.target as Node)) return;
      if (windowElement.classList.contains('window--inactive')) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const onButton = (event.target as HTMLElement | null)?.tagName === 'BUTTON';
      const run = (action: () => void) => {
        event.preventDefault();
        press(action);
      };

      if (event.key >= '0' && event.key <= '9') return run(() => inputDigit(event.key));
      switch (event.key) {
        case '.':
        case ',':
          return run(inputDecimal);
        case '+':
          return run(() => beginOperator('add'));
        case '-':
          return run(() => beginOperator('subtract'));
        case '*':
          return run(() => beginOperator('multiply'));
        case '/':
          return run(() => beginOperator('divide'));
        case '%':
          return run(percent);
        case 'Enter':
        case '=':
          if (onButton && event.key === 'Enter') return;
          return run(equals);
        case 'Escape':
          return run(clearAll);
        case 'Backspace':
          return run(backspace);
        default:
          return;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  /* --- keys and menus ------------------------------------------------ */

  const basicKeys: KeySpec[] = [
    { id: 'back', area: 'back', label: '', ariaLabel: t('calc.backspace'), glyph: true, onPress: backspace },
    { id: 'ce', area: 'ce', label: 'CE', ariaLabel: t('calc.clearEntry'), onPress: resetEntry },
    { id: 'c', area: 'c', label: 'C', ariaLabel: t('calc.clear'), onPress: clearAll },
    { id: 'mc', area: 'mc', label: 'MC', ariaLabel: `${t('calc.memory')} MC`, onPress: memoryClear },
    { id: 'mr', area: 'mr', label: 'MR', ariaLabel: `${t('calc.memory')} MR`, onPress: memoryRecall },
    { id: 'ms', area: 'ms', label: 'MS', ariaLabel: `${t('calc.memory')} MS`, onPress: memoryStore },
    { id: 'mplus', area: 'mplus', label: 'M+', ariaLabel: `${t('calc.memory')} M+`, onPress: memoryAdd },
    { id: '7', area: 'k7', label: '7', ariaLabel: '7', onPress: () => inputDigit('7') },
    { id: '8', area: 'k8', label: '8', ariaLabel: '8', onPress: () => inputDigit('8') },
    { id: '9', area: 'k9', label: '9', ariaLabel: '9', onPress: () => inputDigit('9') },
    { id: '4', area: 'k4', label: '4', ariaLabel: '4', onPress: () => inputDigit('4') },
    { id: '5', area: 'k5', label: '5', ariaLabel: '5', onPress: () => inputDigit('5') },
    { id: '6', area: 'k6', label: '6', ariaLabel: '6', onPress: () => inputDigit('6') },
    { id: '1', area: 'k1', label: '1', ariaLabel: '1', onPress: () => inputDigit('1') },
    { id: '2', area: 'k2', label: '2', ariaLabel: '2', onPress: () => inputDigit('2') },
    { id: '3', area: 'k3', label: '3', ariaLabel: '3', onPress: () => inputDigit('3') },
    { id: '0', area: 'k0', label: '0', ariaLabel: '0', onPress: () => inputDigit('0') },
    { id: 'sign', area: 'sign', label: '±', ariaLabel: t('calc.sign'), onPress: changeSign },
    { id: 'dot', area: 'dot', label: '.', ariaLabel: '.', onPress: inputDecimal },
    {
      id: 'divide',
      area: 'div',
      label: '÷',
      ariaLabel: t('calc.divide'),
      pressed: pending === 'divide',
      onPress: () => beginOperator('divide'),
    },
    {
      id: 'multiply',
      area: 'mul',
      label: '×',
      ariaLabel: t('calc.multiply'),
      pressed: pending === 'multiply',
      onPress: () => beginOperator('multiply'),
    },
    {
      id: 'subtract',
      area: 'sub',
      label: '-',
      ariaLabel: t('calc.minus'),
      pressed: pending === 'subtract',
      onPress: () => beginOperator('subtract'),
    },
    {
      id: 'add',
      area: 'add',
      label: '+',
      ariaLabel: t('calc.plus'),
      pressed: pending === 'add',
      onPress: () => beginOperator('add'),
    },
    { id: 'equals', area: 'equals', label: '=', ariaLabel: t('calc.equals'), onPress: equals },
    { id: 'sqrt', area: 'sqrt', label: 'sqrt', ariaLabel: t('calc.sqrt'), onPress: () => applyUnary('sqrt') },
    { id: 'percent', area: 'pct', label: '%', ariaLabel: t('calc.percent'), onPress: percent },
    { id: 'reciprocal', area: 'recip', label: '1/x', ariaLabel: t('calc.reciprocal'), onPress: () => applyUnary('reciprocal') },
  ];

  const scientificKeys: KeySpec[] = [
    {
      id: 'power',
      area: 's1',
      label: 'x^y',
      ariaLabel: 'x^y',
      pressed: pending === 'power',
      onPress: () => beginOperator('power'),
    },
    { id: 'square', area: 's2', label: 'x^2', ariaLabel: 'x^2', onPress: () => applyUnary('square') },
    { id: 'ten-power', area: 's3', label: '10^x', ariaLabel: '10^x', onPress: () => applyUnary('tenPower') },
    { id: 'log', area: 's4', label: 'log', ariaLabel: 'log', onPress: () => applyUnary('log') },
    { id: 'ln', area: 's5', label: 'ln', ariaLabel: 'ln', onPress: () => applyUnary('ln') },
    { id: 'pi', area: 's6', label: 'pi', ariaLabel: 'pi', onPress: insertPi },
    { id: 'sin', area: 's7', label: 'sin', ariaLabel: 'sin', onPress: () => applyUnary('sin') },
    { id: 'cos', area: 's8', label: 'cos', ariaLabel: 'cos', onPress: () => applyUnary('cos') },
    { id: 'tan', area: 's9', label: 'tan', ariaLabel: 'tan', onPress: () => applyUnary('tan') },
    { id: 'exp', area: 's10', label: 'exp', ariaLabel: 'exp', onPress: () => applyUnary('exp') },
    {
      id: 'modulo',
      area: 's11',
      label: 'mod',
      ariaLabel: 'mod',
      pressed: pending === 'modulo',
      onPress: () => beginOperator('modulo'),
    },
    { id: 'factorial', area: 's12', label: 'n!', ariaLabel: 'n!', onPress: () => applyUnary('factorial') },
  ];

  const menus: MenuBarMenu[] = [
    {
      id: 'view',
      label: t('menu.view'),
      accessKey: 'v',
      entries: [
        {
          kind: 'item',
          id: 'basic',
          label: t('calc.viewBasic'),
          checked: view === 'basic',
          radio: true,
          onSelect: () => setView('basic'),
        },
        {
          kind: 'item',
          id: 'scientific',
          label: t('calc.viewScientific'),
          checked: view === 'scientific',
          radio: true,
          onSelect: () => setView('scientific'),
        },
      ],
    },
    {
      id: 'help',
      label: t('menu.help'),
      accessKey: 'y',
      entries: [
        {
          kind: 'item',
          id: 'help-topics',
          label: t('app.help'),
          onSelect: () => window.dispatchEvent(new CustomEvent('w95:open-help', { detail: 'welcome' })),
        },
        menuSeparator('sep'),
        { kind: 'item', id: 'close', label: t('window.close'), onSelect: () => wm.close(windowId) },
      ],
    },
  ];

  const displayText = error
    ? t(error === 'divideByZero' ? 'calc.divisionByZero' : 'calc.invalidInput')
    : display;

  return (
    <div className="app-calculator" ref={rootRef}>
      <MenuBar menus={menus} ariaLabel={t('app.calculator')} />

      <div className="calc-body">
        <div className="calc-display-row">
          <span className="calc-memory-flag bevel-down" role="status" aria-label={t('calc.memory')}>
            {memory !== 0 ? 'M' : ''}
          </span>
          <output className="calc-display bevel-down" aria-live="polite" aria-atomic="true">
            {displayText}
          </output>
        </div>

        {view === 'scientific' && (
          <div className="calc-grid calc-grid--scientific">
            {scientificKeys.map((key) => (
              <button
                key={key.id}
                type="button"
                className="btn calc-key calc-key--small"
                style={{ gridArea: key.area }}
                aria-label={key.ariaLabel}
                aria-pressed={key.pressed || undefined}
                onClick={() => press(key.onPress)}
              >
                {key.label}
              </button>
            ))}
          </div>
        )}

        <div className="calc-grid calc-grid--basic">
          {basicKeys.map((key) => (
            <button
              key={key.id}
              type="button"
              className="btn calc-key"
              style={{ gridArea: key.area }}
              aria-label={key.ariaLabel}
              aria-pressed={key.pressed || undefined}
              onClick={() => press(key.onPress)}
            >
              {key.glyph ? <BackspaceGlyph /> : key.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
