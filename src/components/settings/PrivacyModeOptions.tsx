import { PRIVACY_MODE_OPTIONS, type PrivacyMode } from '../../lib/privacyMode';

interface PrivacyModeOptionsProps {
  value: PrivacyMode;
  onChange: (mode: PrivacyMode) => void;
}

export function PrivacyModeOptions({ value, onChange }: PrivacyModeOptionsProps) {
  return (
    <div className="s-privacy-options" role="radiogroup" aria-label="闭眼模式">
      {PRIVACY_MODE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`s-privacy-opt${value === opt.value ? ' on' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
