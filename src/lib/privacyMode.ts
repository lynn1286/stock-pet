export type PrivacyMode = 'none' | 'market_value' | 'market_value_profit' | 'full';

export const PRIVACY_MODE_OPTIONS: { value: PrivacyMode; label: string }[] = [
  { value: 'none', label: '不隐藏' },
  { value: 'market_value', label: '仅隐藏持有金额' },
  { value: 'market_value_profit', label: '隐藏持有金额、收益金额' },
  { value: 'full', label: '隐藏持有金额、收益金额、持有收益率' },
];

export function hideMarketValue(mode: PrivacyMode): boolean {
  return mode !== 'none';
}

export function hideProfitAmount(mode: PrivacyMode): boolean {
  return mode === 'market_value_profit' || mode === 'full';
}

export function hideProfitPct(mode: PrivacyMode): boolean {
  return mode === 'full';
}

export const HIDDEN_AMOUNT = '****';
export const HIDDEN_PCT = '****';
