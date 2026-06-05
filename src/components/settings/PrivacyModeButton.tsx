import { useEffect, useRef, useState } from 'react';
import { PRIVACY_MODE_OPTIONS, type PrivacyMode } from '../../lib/privacyMode';

interface PrivacyModeButtonProps {
  value: PrivacyMode;
  onChange: (mode: PrivacyMode) => void;
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function EyeOpenIcon() {
  return (
    <svg {...iconProps}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg {...iconProps}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  );
}

export function PrivacyModeButton({ value, onChange }: PrivacyModeButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = value !== 'none';
  const currentLabel = PRIVACY_MODE_OPTIONS.find((o) => o.value === value)?.label ?? '不隐藏';

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div className="s-privacy-btn-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`s-topbar-icon-btn${active ? ' on' : ''}`}
        aria-label={`闭眼模式：${currentLabel}`}
        title={`闭眼模式：${currentLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {active ? <EyeClosedIcon /> : <EyeOpenIcon />}
      </button>
      {open && (
        <div className="s-privacy-menu" role="menu" aria-label="闭眼模式">
          {PRIVACY_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitemradio"
              aria-checked={value === opt.value}
              className={`s-privacy-menu-item${value === opt.value ? ' on' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
