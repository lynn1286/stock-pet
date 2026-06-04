export type TradeStatus = 'trading' | 'rest' | 'sleep';

export interface PetStockState {
  price: number;
  change_pct: number;
  name: string;
  symbol: string;
  secid: string;
  status: string;
}
