import { useEffect, useState } from 'react';
import { PetX } from '@petx/react';
import '@petx/react/styles.css';
import type { TradeStatus } from '../types/pet';
import type { ActivePetPackage } from '../types/petPackage';
import { animationFromPetState } from '../utils/petState';

// 情绪分档边界。在边界附近加滞回，
// 避免涨跌幅在阈值上下抖动时，桌宠情绪反复横跳。
const EMO_BOUNDS = [-9, -5, -3, -1, 1, 3, 9];
const EMO_MARGIN = 0.15;

function emoBand(v: number): number {
  let b = 0;
  for (const t of EMO_BOUNDS) if (v >= t) b++;
  return b;
}

function stabilizePct(raw: number, prev: number): number {
  const rawBand = emoBand(raw);
  const prevBand = emoBand(prev);
  if (rawBand === prevBand) return raw;
  if (rawBand > prevBand) {
    const boundary = EMO_BOUNDS[prevBand];
    return raw >= boundary + EMO_MARGIN ? raw : prev;
  }
  const boundary = EMO_BOUNDS[rawBand];
  return raw <= boundary - EMO_MARGIN ? raw : prev;
}

interface Particle {
  id: number;
  left: string;
  top: string;
  delay: string;
  size: number;
}

function createParticles(): Particle[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    left: `${20 + Math.random() * 60}%`,
    top: `${15 + Math.random() * 50}%`,
    delay: `${Math.random() * 1.5}s`,
    size: 3 + Math.random() * 3,
  }));
}

function Particles({ pct }: { pct: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (pct < 1) {
      queueMicrotask(() => setParticles([]));
      return;
    }
    queueMicrotask(() => setParticles(createParticles()));
  }, [pct]);

  if (pct < 1 || particles.length === 0) return null;

  return (
    <div className="pet-particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="pet-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            background: 'var(--flat)',
            boxShadow: '0 0 4px color-mix(in srgb, var(--flat) 60%, transparent)',
          }}
        />
      ))}
    </div>
  );
}

function altTextFor(tradeStatus: TradeStatus, pct: number): string {
  if (tradeStatus === 'sleep') return '桌宠状态：休市';
  if (tradeStatus === 'rest') return '桌宠状态：非交易时段';
  if (pct >= 3) return `桌宠状态：大涨 ${pct.toFixed(1)}%`;
  if (pct >= 1) return `桌宠状态：小涨 ${pct.toFixed(1)}%`;
  if (pct > -1) return `桌宠状态：横盘 ${pct.toFixed(1)}%`;
  if (pct > -3) return `桌宠状态：小跌 ${pct.toFixed(1)}%`;
  if (pct > -5) return `桌宠状态：大跌 ${pct.toFixed(1)}%`;
  return `桌宠状态：暴跌 ${pct.toFixed(1)}%`;
}

function PetSprite({
  tradeStatus,
  changePct,
  petPackage,
  size,
}: {
  tradeStatus: TradeStatus;
  changePct: number;
  petPackage?: ActivePetPackage | null;
  size: number;
}) {
  if (!petPackage) return null;
  return (
    <PetX
      src={petPackage.spritesheetDataUrl}
      pet={petPackage.manifest}
      animation={animationFromPetState(tradeStatus, changePct)}
      size={size}
      title={altTextFor(tradeStatus, changePct)}
      className="stock-pet-codex"
    />
  );
}

export interface PetViewProps {
  tradeStatus: TradeStatus;
  changePct: number;
  petPackage?: ActivePetPackage | null;
  size?: number;
  className?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
}

function useStablePct(raw: number): number {
  const [pct, setPct] = useState(raw);

  useEffect(() => {
    queueMicrotask(() => {
      setPct((prev) => stabilizePct(raw, prev));
    });
  }, [raw]);

  return pct;
}

export default function PetView({
  tradeStatus,
  changePct,
  petPackage,
  size = 104,
  className = 'pet-stage',
  onPointerDown,
}: PetViewProps) {
  const pct = useStablePct(changePct);

  return (
    <div className={className} onPointerDown={onPointerDown}>
      <Particles pct={pct} />
      <div className="pet-avatar">
        <PetSprite tradeStatus={tradeStatus} changePct={pct} petPackage={petPackage} size={size} />
      </div>
    </div>
  );
}
