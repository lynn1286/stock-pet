import { useState, useRef, useEffect } from 'react';

interface StockState {
  secid: string;
  change_pct: number;
}

type FlashMap = Map<string, 'up' | 'down'>;

export function useFlashEffect(liveStocks: Map<string, StockState>) {
  const [flashMap, setFlashMap] = useState<FlashMap>(new Map());
  const prevStocksRef = useRef<Map<string, StockState>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const prev = prevStocksRef.current;
    const next = new Map<string, StockState>();
    const flashes: FlashMap = new Map();

    for (const [secid, state] of liveStocks) {
      next.set(secid, state);
      const prevState = prev.get(secid);
      if (prevState && prevState.change_pct !== state.change_pct) {
        flashes.set(secid, state.change_pct > prevState.change_pct ? 'up' : 'down');
      }
    }

    prevStocksRef.current = next;

    if (flashes.size > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      queueMicrotask(() => {
        setFlashMap(flashes);
        timerRef.current = setTimeout(() => setFlashMap(new Map()), 1500);
      });
    }
  }, [liveStocks]);

  return flashMap;
}
