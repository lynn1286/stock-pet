import type { TradeStatus } from '../types/pet';

const ANIM_LABELS: Record<string, string> = {
  jumping: '涨停雀跃',
  running: '大涨奔跑',
  waving: '小涨招手',
  idle: '横盘待机',
  review: '小跌复盘',
  failed: '下跌沮丧',
  waiting: '非交易时段',
  sleeping: '休市',
};

export function animationFromPetState(tradeStatus: TradeStatus, pct: number): string {
  if (tradeStatus === 'sleep') return 'sleeping';
  if (tradeStatus === 'rest') return 'waiting';
  if (pct >= 9) return 'jumping';
  if (pct >= 3) return 'running';
  if (pct >= 1) return 'waving';
  if (pct > -1) return 'idle';
  if (pct > -3) return 'review';
  return 'failed';
}

function formatSignedPct(pct: number): string {
  return pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
}

export { formatSignedPct };

export function describePetStateLabel(tradeStatus: TradeStatus, changePct: number): string {
  if (tradeStatus === 'sleep') return '休市';
  if (tradeStatus === 'rest') return '非交易时段';
  const anim = animationFromPetState(tradeStatus, changePct);
  return `${formatSignedPct(changePct)} · ${ANIM_LABELS[anim] ?? anim}`;
}

export function describePetStateDebug(tradeStatus: TradeStatus, changePct: number): string {
  return animationFromPetState(tradeStatus, changePct);
}

export function mockPctToneClass(tradeStatus: TradeStatus, changePct: number): string {
  if (tradeStatus !== 'trading') return 's-mock-pct-muted';
  if (changePct > 0.05) return 's-mock-pct-up';
  if (changePct < -0.05) return 's-mock-pct-down';
  return 's-mock-pct-flat';
}
