import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import crab01 from '../assets/01.png';
import crab02 from '../assets/02.png';
import crab03 from '../assets/03.png';
import crab04 from '../assets/04.png';
import crab05 from '../assets/05.png';
import crab06 from '../assets/06.png';
import crab07 from '../assets/07.png';
import crab08 from '../assets/08.png';
import crab09 from '../assets/09.png';
import crab10 from '../assets/010.png';

const SPRITES = [crab01, crab02, crab03, crab04, crab05, crab06, crab07, crab08, crab09, crab10];

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
            background: '#fbbf24',
            boxShadow: '0 0 4px rgba(251, 191, 36, 0.6)',
          }}
        />
      ))}
    </div>
  );
}

function CrabSprite({ tradeStatus, changePct }: { tradeStatus: TradeStatus; changePct: number }) {
  let index: number;
  if (tradeStatus === 'sleep') {
    index = 7; // 08 休息日
  } else if (tradeStatus === 'rest') {
    index = 9; // 010 开盘前/收盘后
  } else {
    index = spriteIndexFromPct(changePct);
  }
  return <img src={SPRITES[index]} alt="crab" draggable={false} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />;
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
        <CrabSprite tradeStatus={tradeStatus} changePct={pct} />
      </div>
    </div>
  );
}
