import { useRef, useEffect, useState } from 'react';

interface FlashValueProps {
  value: number;
  formatted: string;
  className?: string;
}

export function FlashValue({ value, formatted, className = '' }: FlashValueProps) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;

    if (prev === value || (prev === 0 && value === 0)) return;

    setFlash(value > prev ? 'up' : 'down');
    const timer = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span
      className={`s-flash-value${flash ? ` s-flash-value--${flash}` : ''}${className ? ` ${className}` : ''}`}
    >
      {formatted}
    </span>
  );
}
