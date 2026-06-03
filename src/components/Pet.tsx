import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

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
  if (Math.abs(pct) >= 9) return 6;  // 07 大幅异动
  if (pct >= 3) return 0;            // 01 大涨
  if (pct >= 1) return 1;            // 02 小涨
  if (pct > -1) return 2;            // 03 小幅波动
  if (pct > -3) return 3;            // 04 小跌
  if (pct > -5) return 4;            // 05 大跌
  return 5;                           // 06 暴崩
}

interface StockState {
  price: number;
  change_pct: number;
  name: string;
  symbol: string;
  secid: string;
  status: string;
}

type TradeStatus = 'trading' | 'rest' | 'sleep';

function animFromPct(pct: number): string {
  if (Math.abs(pct) >= 9) return 'anim-wild';
  if (pct >= 3) return 'anim-big-up';
  if (pct >= 1) return 'anim-small-up';
  if (pct > -1) return 'anim-flat';
  if (pct > -3) return 'anim-small-down';
  if (pct > -5) return 'anim-big-down';
  return 'anim-crash';
}

function Particles({ pct }: { pct: number }) {
  const particles = useMemo(() => {
    if (pct < 1) return [];
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: `${20 + Math.random() * 60}%`,
      top: `${15 + Math.random() * 50}%`,
      delay: `${Math.random() * 1.5}s`,
      size: 3 + Math.random() * 3,
    }));
  }, [pct]);

  if (pct < 1) return null;

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
    index = 7; // 08 休息日
  } else if (tradeStatus === 'rest') {
    index = 9; // 010 开盘前/收盘后
  } else {
    index = spriteIndexFromPct(changePct);
  }
  return <img src={SPRITES[index]} alt={altTextFor(tradeStatus, changePct)} draggable={false} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />;
}

export default function Pet() {
  const [stock, setStock] = useState<StockState | null>(null);
  const [tradeStatus, setTradeStatus] = useState<TradeStatus>('rest');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlistenTrade = listen<TradeStatus>('trade-status', (e) => {
      setTradeStatus(e.payload);
    });

    const unlistenStock = listen<StockState>('stock-state', (e) => {
      setStock(e.payload);
    });

    return () => {
      unlistenTrade.then(fn => fn());
      unlistenStock.then(fn => fn());
    };
  }, []);

  const handlePointerDown = useCallback(async (e: React.PointerEvent) => {
    if (!rootRef.current) return;
    rootRef.current.setPointerCapture(e.pointerId);
    try { await getCurrentWindow().startDragging(); } catch {}
  }, []);

  const pct = stock?.change_pct ?? 0;

  const currentAnim = tradeStatus === 'sleep'
    ? 'anim-sleep'
    : tradeStatus === 'rest'
      ? 'anim-idle'
      : animFromPct(pct);

  return (
    <div
      ref={rootRef}
      className="pet-shell"
      onPointerDown={handlePointerDown}
    >
      <Particles pct={pct} />
      <div className={`pet-avatar ${currentAnim}`}>
        <DogSprite tradeStatus={tradeStatus} changePct={pct} />
      </div>
    </div>
  );
}
