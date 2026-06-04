import type { TradeStatus } from '../types/pet';

function animFromPct(pct: number): string {
  if (Math.abs(pct) >= 9) return 'anim-wild';
  if (pct >= 3) return 'anim-big-up';
  if (pct >= 1) return 'anim-small-up';
  if (pct > -1) return 'anim-flat';
  if (pct > -3) return 'anim-small-down';
  if (pct > -5) return 'anim-big-down';
  return 'anim-crash';
}

const ANIM_LABELS: Record<string, string> = {
  'anim-wild': '极端波动',
  'anim-big-up': '大涨',
  'anim-small-up': '小涨',
  'anim-flat': '横盘',
  'anim-small-down': '小跌',
  'anim-big-down': '大跌',
  'anim-crash': '暴跌',
};

function formatSignedPct(pct: number): string {
  return pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
}

export { formatSignedPct };

export function describePetStateLabel(tradeStatus: TradeStatus, changePct: number): string {
  if (tradeStatus === 'sleep') return '休市';
  if (tradeStatus === 'rest') return '非交易时段';
  const anim = animFromPct(changePct);
  return `${formatSignedPct(changePct)} · ${ANIM_LABELS[anim] ?? anim}`;
}

export function describePetStateDebug(tradeStatus: TradeStatus, changePct: number): string {
  if (tradeStatus === 'sleep') return 'anim-sleep';
  if (tradeStatus === 'rest') return 'anim-idle';
  return animFromPct(changePct);
}

export function mockPctToneClass(tradeStatus: TradeStatus, changePct: number): string {
  if (tradeStatus !== 'trading') return 's-mock-pct-muted';
  if (changePct > 0.05) return 's-mock-pct-up';
  if (changePct < -0.05) return 's-mock-pct-down';
  return 's-mock-pct-flat';
}
