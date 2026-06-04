import { useEffect, useState } from 'react';
import type { TradeStatus } from '../types/pet';

import dog01 from '../assets/01.png';
import dog02 from '../assets/02.png';
import dog03 from '../assets/03.png';
import dog04 from '../assets/04.png';
import dog05 from '../assets/05.png';
import dog06 from '../assets/06.png';
import dog07 from '../assets/07.png';
import dog08 from '../assets/08.png';
import dog09 from '../assets/09.png';
import dog10 from '../assets/010.png';

const SPRITES = [dog01, dog02, dog03, dog04, dog05, dog06, dog07, dog08, dog09, dog10];

function spriteIndexFromPct(pct: number): number {
  if (Math.abs(pct) >= 9) return 6;
  if (pct >= 3) return 0;
  if (pct >= 1) return 1;
  if (pct > -1) return 2;
  if (pct > -3) return 3;
  if (pct > -5) return 4;
  return 5;
}

function animFromPct(pct: number): string {
  if (Math.abs(pct) >= 9) return 'anim-wild';
  if (pct >= 3) return 'anim-big-up';
  if (pct >= 1) return 'anim-small-up';
  if (pct > -1) return 'anim-flat';
  if (pct > -3) return 'anim-small-down';
  if (pct > -5) return 'anim-big-down';
  return 'anim-crash';
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

function DogSprite({ tradeStatus, changePct }: { tradeStatus: TradeStatus; changePct: number }) {
  let index: number;
  if (tradeStatus === 'sleep') {
    index = 7;
  } else if (tradeStatus === 'rest') {
    index = 9;
  } else {
    index = spriteIndexFromPct(changePct);
  }
  return (
    <img
      src={SPRITES[index]}
      alt={altTextFor(tradeStatus, changePct)}
      draggable={false}
      style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
    />
  );
}

export interface PetViewProps {
  tradeStatus: TradeStatus;
  changePct: number;
  className?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export default function PetView({
  tradeStatus,
  changePct,
  className = 'pet-shell',
  onPointerDown,
}: PetViewProps) {
  const currentAnim =
    tradeStatus === 'sleep'
      ? 'anim-sleep'
      : tradeStatus === 'rest'
        ? 'anim-idle'
        : animFromPct(changePct);

  return (
    <div className={className} onPointerDown={onPointerDown}>
      <Particles pct={changePct} />
      <div className={`pet-avatar ${currentAnim}`}>
        <DogSprite tradeStatus={tradeStatus} changePct={changePct} />
      </div>
    </div>
  );
}
