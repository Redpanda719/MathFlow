import type { FC } from 'react';

interface KeypadProps {
  value: string;
  onDigit: (digit: string) => void;
  onClear: () => void;
  onErase: () => void;
  onSubmit: () => void;
}

export const Keypad: FC<KeypadProps> = ({ value, onDigit, onClear, onErase, onSubmit }) => (
  <div className="card keypad">
    <div className="keypad-value" aria-live="polite">
      {value || ' '}
    </div>
    <div className="keypad-grid">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button key={n} className="key" onClick={() => onDigit(String(n))}>
          {n}
        </button>
      ))}
      <button className="key key-alt" onClick={onClear}>
        Clear
      </button>
      <button className="key" onClick={() => onDigit('0')}>
        0
      </button>
      <button className="key key-alt" onClick={onErase}>
        Del
      </button>
    </div>
    <button className="primary submit" onClick={onSubmit}>
      Check
    </button>
  </div>
);
