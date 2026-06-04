import { useState, useRef, useEffect } from 'react';

interface StockConfig {
  secid: string;
  quantity: number;
  cost_price: number;
}

interface StockState {
  secid: string;
  price: number;
  daily_profit: number;
}

export interface TrendPoint {
  time: number;
  value: number;
}

const MAX_POINTS = 60;

export function usePortfolioTrend(stocks: StockConfig[], liveStocks: Map<string, StockState>) {
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const prevValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (stocks.length === 0) return;

    let totalValue = 0;
    for (const stock of stocks) {
      const live = liveStocks.get(stock.secid);
      const price = live?.price || 0;
      if (stock.quantity > 0 && price > 0) {
        totalValue += stock.quantity * price;
      }
    }

    if (totalValue <= 0) return;
    if (totalValue === prevValueRef.current) return;
    prevValueRef.current = totalValue;

    setPoints((prev) => {
      const next = [...prev, { time: Date.now(), value: totalValue }];
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
    });
  }, [stocks, liveStocks]);

  return points;
}
